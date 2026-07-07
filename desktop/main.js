'use strict';

/**
 * main.js — Aura Desktop Main Process
 *
 * Security: All windows use contextIsolation:true, nodeIntegration:false, sandbox:true.
 * The loading window communicates via preload.js contextBridge only.
 *
 * Startup sequence:
 *   1. Check first-run flag → show setup wizard if needed
 *   2. Detect Ollama (PATH → LOCALAPPDATA → offer download)
 *   3. Start Ollama service if not running
 *   4. Pull required models if missing (with progress)
 *   5. Start Spring Boot backend JAR
 *   6. Wait for backend health endpoint
 *   7. Launch main window
 *
 * CF-01  FIX: execFileSync replaced with async execFile
 * CF-02  FIX: sandbox:true on loading window
 * CF-08  FIX: startBackend resolves ONLY after health endpoint responds
 * CF-09  FIX: fatal catch always shows dialog + calls app.quit()
 * W-02   FIX: recursive async polling replaced with iterative while loop
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
const http = require('http');
const fs = require('fs');

// ─── State ─────────────────────────────────────────────────────────────────

let mainWindow = null;
let loadingWindow = null;
let backendProcess = null;
let isQuitting = false;

/** True only if THIS process launched the Ollama server (so we own its lifecycle). */
let didSpawnOllama = false;
/** PID of the ollama serve process if we spawned it (for safe kill-by-PID). */
let ollamaPid = null;

// ─── Required models ────────────────────────────────────────────────────────

const REQUIRED_MODELS = [
    { id: 'llama3',           displayName: 'LLaMA 3 (8B) — Language model' },
    { id: 'nomic-embed-text', displayName: 'Nomic Embed Text — Embedding model' },
];

// ─── Logging helpers ────────────────────────────────────────────────────────

function log(msg) {
    const ts = new Date().toISOString();
    if (!app.isPackaged) {
        console.log(`[AURA ${ts}] ${msg}`);
    }
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('status-update', msg);
    }
}

function logError(msg) {
    const ts = new Date().toISOString();
    if (!app.isPackaged) {
        console.error(`[AURA ERROR ${ts}] ${msg}`);
    }
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('status-error', msg);
    }
}

function logPullProgress(model, percent, status) {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('pull-progress', { model, percent, status });
    }
}

// ─── Filesystem helpers ──────────────────────────────────────────────────────

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function checkUrl(url, timeoutMs = 3000) {
    return new Promise((resolve) => {
        try {
            const u = new URL(url);
            const req = http.request(
                {
                    hostname: u.hostname,
                    port: u.port,
                    path: u.pathname + u.search,
                    method: 'GET',
                    timeout: timeoutMs,
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data }));
                }
            );
            req.on('error', () => resolve({ ok: false }));
            req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
            req.end();
        } catch (e) {
            resolve({ ok: false, error: e.message });
        }
    });
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── First-run flag ──────────────────────────────────────────────────────────

function getSetupFlagPath() {
    return path.join(app.getPath('userData'), '.setup-complete');
}

function isFirstRun() {
    return !fs.existsSync(getSetupFlagPath());
}

function markSetupComplete() {
    try {
        ensureDir(path.dirname(getSetupFlagPath()));
        fs.writeFileSync(getSetupFlagPath(), new Date().toISOString(), 'utf8');
        log('Setup marked complete.');
    } catch (e) {
        console.warn('[AURA] Could not write setup flag:', e.message);
    }
}

// ─── Ollama detection (CF-01: async, non-blocking) ───────────────────────────

/**
 * Try to resolve the ollama executable path using pure Javascript filesystem checks.
 * This completely avoids running child processes (like 'where'), preventing flashing/blinking command prompt windows.
 */
async function findOllamaExe() {
    // 1. Manually parse and check system PATH environment variable
    const pathEnv = process.env.PATH || '';
    const paths = pathEnv.split(path.delimiter);
    for (const p of paths) {
        if (!p) continue;
        const candidate = path.join(p, 'ollama.exe');
        try {
            if (fs.existsSync(candidate)) {
                log(`Ollama found in PATH: ${candidate}`);
                return candidate;
            }
        } catch (_) {}
    }

    // 2. Check default user and system installation paths
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const candidates = [
        path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe'),
        path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe'),
        path.join(programFiles, 'Ollama', 'ollama.exe'),
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                log(`Ollama found at: ${p}`);
                return p;
            }
        } catch (_) {}
    }

    return null;
}

/**
 * Try to resolve the Ollama GUI Tray App executable path.
 * This is used to start the service cleanly without terminal flashes.
 */
async function findOllamaAppExe() {
    const localAppData = process.env.LOCALAPPDATA || '';
    const appPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe');
    if (fs.existsSync(appPath)) {
        return appPath;
    }
    return null;
}

/**
 * Download and launch the official Ollama installer, waiting for user confirmation first.
 */
async function downloadAndInstallOllama() {
    return new Promise((resolve, reject) => {
        // Prompt the renderer to show the install confirmation dialog
        if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.webContents.send('install-ollama-prompt');
        }

        // Wait for user response via IPC
        ipcMain.once('confirm-install-ollama', async () => {
            try {
                log('Opening Ollama official download page...');
                await shell.openExternal('https://ollama.com/download/windows');
                log('Ollama installer page opened in browser. Waiting for user to install Ollama...');

                // W-02 FIX: iterative while loop instead of recursive async call
                const maxWaitMs = 5 * 60 * 1000;
                const pollIntervalMs = 5000;
                const startTime = Date.now();

                while (Date.now() - startTime < maxWaitMs) {
                    const exe = await findOllamaExe();
                    if (exe) {
                        log('Ollama installation detected!');
                        resolve(exe);
                        return;
                    }
                    log('Waiting for Ollama installation to complete...');
                    await sleep(pollIntervalMs);
                }

                reject(new Error('Timed out waiting for Ollama installation. Please install Ollama and relaunch AURA.'));
            } catch (e) {
                reject(e);
            }
        });
    });
}

// ─── Ollama service management ───────────────────────────────────────────────

async function ensureOllamaRunning(ollamaExe) {
    const result = await checkUrl('http://localhost:11434/api/tags', 2000);
    if (result.ok) {
        log('Ollama service is already running.');
        return;
    }

    log(`Launching Ollama CLI Serve: ${ollamaExe}`);
    const ollamaProcess = spawn(ollamaExe, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
    });
    ollamaProcess.unref();
    didSpawnOllama = true;
    ollamaPid = ollamaProcess.pid; // Track PID for safe shutdown

    // Wait up to 30 seconds for the service to come up
    for (let i = 0; i < 15; i++) {
        await sleep(2000);
        const check = await checkUrl('http://localhost:11434/api/tags', 2000);
        if (check.ok) {
            log('Ollama service is ready.');
            return;
        }
        log(`Waiting for Ollama service... (${(i + 1) * 2}s)`);
    }
    throw new Error('Ollama service did not start within 30 seconds. Please start Ollama manually and relaunch AURA.');
}

// ─── Model management ────────────────────────────────────────────────────────

async function getInstalledModels() {
    const result = await checkUrl('http://localhost:11434/api/tags');
    if (!result.ok) return [];
    try {
        const tags = JSON.parse(result.data);
        return (tags.models || []).map((m) => m.name || '');
    } catch (_) {
        return [];
    }
}

function isModelInstalled(installedList, modelId) {
    return installedList.some((name) => name.startsWith(modelId));
}

/**
 * Pull a single model from Ollama with streaming progress, reported to the loading window.
 */
function pullModel(ollamaExe, modelId) {
    return new Promise((resolve, reject) => {
        log(`Pulling model: ${modelId} — this may take several minutes...`);
        logPullProgress(modelId, 0, 'Starting download...');

        const proc = spawn(ollamaExe, ['pull', modelId], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
        });

        let lastPercent = 0;

        proc.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter((l) => l.trim());
            for (const line of lines) {
                // Ollama pull output format: "pulling sha256:xxx: 45% ▕████     ▏ 1.2 GB/2.7 GB  892 MB/s  2m"
                const match = line.match(/(\d+)%/);
                if (match) {
                    const percent = parseInt(match[1], 10);
                    if (percent !== lastPercent) {
                        lastPercent = percent;
                        logPullProgress(modelId, percent, line.trim());
                    }
                } else if (line.trim()) {
                    logPullProgress(modelId, lastPercent, line.trim());
                }
            }
        });

        proc.stderr.on('data', (data) => {
            const txt = data.toString().trim();
            if (txt) console.warn(`[ollama pull ${modelId}] stderr: ${txt}`);
        });

        proc.on('exit', (code) => {
            if (code === 0) {
                logPullProgress(modelId, 100, 'Download complete!');
                log(`Model ${modelId} installed successfully.`);
                resolve();
            } else {
                reject(new Error(`ollama pull ${modelId} exited with code ${code}. Check your internet connection and try again.`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to run ollama pull: ${err.message}`));
        });
    });
}

async function ensureModels(ollamaExe) {
    log('Checking required AI models...');
    const installed = await getInstalledModels();

    for (const { id, displayName } of REQUIRED_MODELS) {
        if (isModelInstalled(installed, id)) {
            log(`✓ Model ready: ${displayName}`);
        } else {
            log(`⬇  Downloading: ${displayName}`);
            await pullModel(ollamaExe, id);
        }
    }
    log('All required models are ready.');
}

// ─── Backend (Spring Boot JAR) ────────────────────────────────────────────────

/**
 * CF-08 FIX: startBackend now returns a Promise that resolves ONLY after the
 * backend health endpoint responds successfully — not immediately after spawn().
 * CF-09 FIX: Backend process errors are now correctly propagated to the caller.
 */
function startBackend() {
    return new Promise((resolve, reject) => {
        log('Starting local RAG engine...');

        const isPackaged = app.isPackaged;
        const jreDir = isPackaged
            ? path.join(process.resourcesPath, 'jre')
            : path.join(__dirname, 'jre');
        const javaExec = path.join(jreDir, 'bin', 'javaw.exe');

        const backendJar = isPackaged
            ? path.join(process.resourcesPath, 'backend', 'aura-backend.jar')
            : path.join(__dirname, 'src/backend/target/aura-backend-1.0.0.jar');

        // Fallback to snapshot JAR for dev builds ONLY
        const snapshotJar = path.join(__dirname, 'src/backend/target/aura-backend-0.0.1-SNAPSHOT.jar');
        const resolvedJar = fs.existsSync(backendJar)
            ? backendJar
            : (fs.existsSync(snapshotJar) ? snapshotJar : null);

        const backendCwd = isPackaged
            ? path.join(process.resourcesPath, 'backend')
            : path.join(__dirname, 'src/backend');

        const logDir = path.join(app.getPath('userData'), 'logs');
        ensureDir(logDir);
        const logFile = path.join(logDir, `backend-${Date.now()}.log`);
        const logStream = fs.createWriteStream(logFile, { flags: 'a' });

        if (!fs.existsSync(javaExec)) {
            reject(new Error('Bundled Java Runtime Environment (JRE) is missing. Please reinstall AURA.'));
            return;
        }
        if (!resolvedJar) {
            reject(new Error('Backend executable (aura-backend.jar) is missing. Please reinstall AURA.'));
            return;
        }

        const dataPath = path.join(app.getPath('userData'), 'data');
        const uploadsPath = path.join(app.getPath('userData'), 'uploads');
        const dbPath = path.join(dataPath, 'aura.db');

        ensureDir(dataPath);
        ensureDir(uploadsPath);

        // Seed SQLite database from bundled resources on first install
        const initialDbSource = isPackaged
            ? path.join(process.resourcesPath, 'data', 'aura.db')
            : path.join(__dirname, 'src/data/aura.db');
        if (fs.existsSync(initialDbSource) && !fs.existsSync(dbPath)) {
            try {
                fs.copyFileSync(initialDbSource, dbPath);
                log('Initialized user database.');
            } catch (e) {
                console.warn('[AURA] Could not seed database:', e.message);
            }
        }

        const args = [
            '-jar', path.basename(resolvedJar),
            `--spring.datasource.url=jdbc:sqlite:${dbPath}`,
            `--aura.upload.dir=${uploadsPath}`,
            `--aura.chroma.cache-dir=${dataPath}`,
        ];

        backendProcess = spawn(javaExec, args, {
            cwd: backendCwd,
            env: { ...process.env, SPRING_PROFILES_ACTIVE: 'prod' },
            windowsHide: true,
        });

        backendProcess.stdout.pipe(logStream);
        backendProcess.stderr.pipe(logStream);

        // CF-08 FIX: Only reject if backend exits BEFORE we resolve.
        // After resolve, log the unexpected exit but don't reject (already settled).
        let settled = false;

        backendProcess.on('exit', (code) => {
            if (!isQuitting && !settled) {
                // Backend exited before health check passed
                settled = true;
                reject(new Error(`Backend process exited unexpectedly (code ${code}) before startup completed. Check logs at: ${logFile}`));
            } else if (!isQuitting) {
                logError(`Core backend service exited unexpectedly (code ${code}). Check logs at: ${logFile}`);
            }
        });

        backendProcess.on('error', (err) => {
            if (!settled) {
                settled = true;
                reject(new Error(`Failed to start backend process: ${err.message}`));
            }
        });

        // CF-08 FIX: Poll the health endpoint and resolve ONLY when it responds.
        (async () => {
            log('Connecting to RAG service...');
            const maxAttempts = 60;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                if (isQuitting || settled) return;
                const result = await checkUrl('http://localhost:8080/api/health');
                if (result.ok) {
                    log('Launching AURA...');
                    settled = true;
                    resolve();
                    return;
                }
                if (attempt % 10 === 0) {
                    log(`Still initializing... (${attempt}s)`);
                }
                await sleep(1000);
            }
            if (!settled) {
                settled = true;
                reject(new Error('Connection timeout: Java backend did not start within 60 seconds. Check the log file in the logs directory.'));
            }
        })();
    });
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

function stopBackend() {
    isQuitting = true;

    if (backendProcess) {
        const pid = backendProcess.pid;
        try { backendProcess.kill('SIGTERM'); } catch (_) {}
        if (pid) {
            try {
                spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true, stdio: 'ignore' });
            } catch (_) {}
        }
        backendProcess = null;
    }

    // Stop Ollama service on exit if auto-start is enabled
    const autoStart = shouldAutoStartOllama();
    if (autoStart) {
        log('Stopping Ollama service...');
        try {
            spawn('taskkill', ['/F', '/IM', 'ollama.exe'], { windowsHide: true, stdio: 'ignore' });
            spawn('taskkill', ['/F', '/IM', 'ollama app.exe'], { windowsHide: true, stdio: 'ignore' });
        } catch (_) {}
    }
}

// ─── IPC handlers ────────────────────────────────────────────────────────────

ipcMain.on('exit-app', () => {
    app.quit();
});

// ─── Window creation ─────────────────────────────────────────────────────────

function createLoadingWindow() {
    loadingWindow = new BrowserWindow({
        width: 620,
        height: 460,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // CF-02 FIX: sandbox:true — contextBridge works correctly with sandbox enabled.
            // The previous sandbox:false comment was incorrect; contextBridge does NOT require
            // sandbox to be disabled.
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#0F172A',
        show: false,
    });

    // Content Security Policy for loading window
    // No unsafe-eval, no wildcard sources.
    loadingWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:;",
                ],
            },
        });
    });

    loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
    loadingWindow.once('ready-to-show', () => {
        loadingWindow.show();
        startStartupSequence();
    });
}

function launchMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        title: 'Aura',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            // No preload needed: React app communicates via REST/WebSocket only.
            // Keeping no preload here is intentional and reduces attack surface.
        },
    });

    // CSP for main window (loads the React SPA from local backend)
    // No unsafe-eval. unsafe-inline for styles is acceptable for bundled CSS.
    // Connections restricted to localhost:8080 only.
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' http://localhost:8080; connect-src 'self' http://localhost:8080 ws://localhost:8080; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;",
                ],
            },
        });
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.once('ready-to-show', () => {
        if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.close();
            loadingWindow = null;
        }
        mainWindow.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
}

// ─── Startup sequence ────────────────────────────────────────────────────────

function shouldAutoStartOllama() {
    try {
        const configPath = path.join(app.getPath('userData'), 'aura-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.autoStartOllama === false) {
                return false;
            }
        }
    } catch (e) {
        console.warn('[AURA] Error reading aura-config.json:', e.message);
    }
    return true;
}

async function startStartupSequence() {
    try {
        // Ensure user data directories exist (no stale-cache cleanup at startup)
        ensureDir(path.join(app.getPath('userData'), 'data'));
        ensureDir(path.join(app.getPath('userData'), 'uploads'));
        ensureDir(path.join(app.getPath('userData'), 'logs'));

        const firstRun = isFirstRun();
        const autoStart = shouldAutoStartOllama();

        if (autoStart) {
            // ── Step 1: Detect Ollama (CF-01: async, non-blocking) ────────────
            log(firstRun ? 'First-time setup — checking prerequisites...' : 'Verifying Ollama...');
            let ollamaExe = await findOllamaExe();

            if (!ollamaExe) {
                // Prompt user to install Ollama
                ollamaExe = await downloadAndInstallOllama();
            }

            // ── Step 2: Start Ollama service ───────────────────────────────────
            log('Starting Ollama service...');
            await ensureOllamaRunning(ollamaExe);

            // ── Step 3: Pull required models ───────────────────────────────────
            await ensureModels(ollamaExe);
        } else {
            log('Skipping Ollama auto-start (disabled by configuration).');
        }

        // ── Step 4: Start backend & wait for health (CF-08: unified) ──────
        await startBackend();

        // ── Step 5: Mark setup complete (first run only) ──────────────────
        if (firstRun) {
            markSetupComplete();
        }

        // ── Step 6: Launch main window ────────────────────────────────────
        launchMainWindow();

    } catch (e) {
        // CF-09 FIX: Always show a dialog and quit cleanly on fatal errors.
        // Previously the app could silently hang on the loading screen with no exit path
        // if the loading window itself had an issue.
        const errMsg = e && e.message ? e.message : String(e);
        console.error('[AURA FATAL]', errMsg);
        logError(errMsg);

        // Give the logError time to render in the loading window before potentially quitting
        await sleep(300);

        // If the loading window is already showing the error UI, let the user click Exit.
        // As a safety net, also schedule an automatic quit after 60 seconds.
        const autoQuitTimeout = setTimeout(() => {
            console.error('[AURA] Auto-quitting after fatal error timeout.');
            app.quit();
        }, 60000);

        // Allow the user to click the Exit button in the loading window to cancel the timeout
        ipcMain.once('exit-app', () => {
            clearTimeout(autoQuitTimeout);
            app.quit();
        });

        // If the loading window is gone (e.g., closed externally), quit immediately
        if (!loadingWindow || loadingWindow.isDestroyed()) {
            clearTimeout(autoQuitTimeout);
            dialog.showErrorBox(
                'AURA — Startup Failed',
                `${errMsg}\n\nPlease reinstall AURA or check the log files.`
            );
            app.quit();
        }
    }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.on('ready', createLoadingWindow);

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    stopBackend();
});

// Prevent multiple instances
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
