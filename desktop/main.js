const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let loadingWindow = null;
let backendProcess = null;
let isQuitting = false;
let didSpawnOllama = false;

function updateStatus(message) {
    console.log(`[AURA STATUS] ${message}`);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('status-update', message);
    }
}

function showError(message) {
    console.error(`[AURA ERROR] ${message}`);
    if (loadingWindow && !loadingWindow.isDestroyed()) {
        loadingWindow.webContents.send('status-error', message);
    }
}

function checkUrl(url, timeoutMs = 2000) {
    return new Promise((resolve) => {
        try {
            const u = new URL(url);
            const req = http.request({
                hostname: u.hostname,
                port: u.port,
                path: u.pathname + u.search,
                method: 'GET',
                timeout: timeoutMs
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data });
                });
            });
            req.on('error', () => resolve({ ok: false }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false });
            });
            req.end();
        } catch (e) {
            resolve({ ok: false, error: e.message });
        }
    });
}

async function cleanStaleCache() {
    const appData = process.env.APPDATA;
    const localAppData = process.env.LOCALAPPDATA;
    const temp = process.env.TEMP || process.env.TMP;
    const currentUserData = app.getPath('userData');

    // All AURA cache locations to wipe (only if they are NOT the current active userData)
    const stalePaths = [
        // Previous AppData installs
        path.join(appData, 'AURA Desktop'),
        path.join(appData, 'aura'),

        // Temp files left by previous crashed installs
        path.join(temp, 'aura-backend.log'),
        path.join(temp, 'aura-install'),
        path.join(temp, 'aura_tmp'),
    ].map(p => path.resolve(p));

    // Only include old user data folders if they differ from the active currentUserData path
    const oldUserData = path.resolve(path.join(appData, 'aura-desktop'));
    if (oldUserData.toLowerCase() !== path.resolve(currentUserData).toLowerCase()) {
        stalePaths.push(oldUserData);
    }

    for (const p of stalePaths) {
        try {
            if (fs.existsSync(p)) {
                fs.rmSync(p, { recursive: true, force: true });
                console.log(`[AURA CLEAN] Removed: ${p}`);
            }
        } catch (e) {
            console.warn(`[AURA CLEAN] Could not remove ${p}: ${e.message}`);
        }
    }

    // Re-create clean AppData structure for active user data if missing
    const freshDirs = [
        path.join(currentUserData, 'data'),
        path.join(currentUserData, 'uploads'),
        path.join(currentUserData, 'logs'),
    ];
    for (const d of freshDirs) {
        if (!fs.existsSync(d)) {
            fs.mkdirSync(d, { recursive: true });
        }
    }

    console.log('[AURA CLEAN] Cache wipe complete. Fresh install ready.');
}

async function checkOllamaAndModels() {
    updateStatus('Verifying AI models...');
    let result = await checkUrl('http://localhost:11434/api/tags');
    
    if (!result.ok) {
        const localAppData = process.env.LOCALAPPDATA;
        if (localAppData) {
            const ollamaAppPath = path.join(localAppData, 'Programs/Ollama/ollama app.exe');
            const ollamaPath = path.join(localAppData, 'Programs/Ollama/ollama.exe');
            if (fs.existsSync(ollamaPath)) {
                updateStatus('Launching Ollama service...');
                const ollamaProcess = spawn(ollamaPath, ['serve'], {
                    stdio: 'ignore',
                    windowsHide: true
                });
                ollamaProcess.unref();
                didSpawnOllama = true;
            } else if (fs.existsSync(ollamaAppPath)) {
                updateStatus('Launching Ollama service...');
                const ollamaProcess = spawn(ollamaAppPath, [], {
                    detached: true,
                    stdio: 'ignore'
                });
                ollamaProcess.unref();
                didSpawnOllama = true;
            }

                // Poll for 10 seconds (5 attempts * 2s)
                for (let i = 0; i < 5; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    result = await checkUrl('http://localhost:11434/api/tags');
                    if (result.ok) break;
                }
        }
    }

    if (!result.ok) {
        return { ok: false, error: 'Ollama is not running.\n\nPlease run the Ollama desktop application and restart AURA.' };
    }

    try {
        const tags = JSON.parse(result.data);
        const models = tags.models || [];
        let hasLlama = false, hasEmbed = false;
        for (const m of models) {
            const name = m.name || '';
            if (name.startsWith('llama3')) hasLlama = true;
            if (name.startsWith('nomic-embed-text')) hasEmbed = true;
        }

        if (!hasLlama || !hasEmbed) {
            let missing = [];
            if (!hasLlama) missing.push('llama3');
            if (!hasEmbed) missing.push('nomic-embed-text');
            return {
                ok: false,
                error: `Missing required local models: ${missing.join(', ')}.\n\nPlease open your terminal and execute:\n` +
                       missing.map(m => `ollama pull ${m}`).join('\n') +
                       `\n\nThen launch AURA again.`
            };
        }
    } catch (e) {
        return { ok: false, error: 'Failed to verify local models: ' + e.message };
    }
    return { ok: true };
}

function startBackend() {
    return new Promise((resolve, reject) => {
        updateStatus('Starting local RAG engine...');

        const jreDir = app.isPackaged 
            ? path.join(process.resourcesPath, 'jre') 
            : path.join(__dirname, 'jre');
        const javaExec = path.join(jreDir, 'bin', 'javaw.exe');

        const backendJar = app.isPackaged
            ? path.join(process.resourcesPath, 'backend', 'aura-backend.jar')
            : path.join(__dirname, '../backend/target/aura-backend-0.0.1-SNAPSHOT.jar');

        const backendCwd = app.isPackaged 
            ? path.join(process.resourcesPath, 'backend') 
            : path.join(__dirname, '../backend');

        const logDir = path.join(app.getPath('userData'), 'logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, 'backend.log');
        const logStream = fs.createWriteStream(logFile);

        if (!fs.existsSync(javaExec)) {
            reject(new Error('Bundled Java Runtime Environment (JRE) is missing.'));
            return;
        }
        if (!fs.existsSync(backendJar)) {
            reject(new Error('Backend executable JAR file is missing.'));
            return;
        }

        const dataPath = path.join(app.getPath('userData'), 'data');
        const uploadsPath = path.join(app.getPath('userData'), 'uploads');
        const dbPath = path.join(dataPath, 'aura.db');

        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
        if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

        // Seed SQLite seed database from resources
        const initialDbSource = app.isPackaged
            ? path.join(process.resourcesPath, 'data', 'aura.db')
            : path.join(__dirname, '../data/aura.db');
        if (fs.existsSync(initialDbSource) && !fs.existsSync(dbPath)) {
            fs.copyFileSync(initialDbSource, dbPath);
        }

        const args = [
            '-jar', 'aura-backend.jar',
            `--spring.datasource.url=jdbc:sqlite:${dbPath}`,
            `--aura.upload.dir=${uploadsPath}`,
            `--aura.chroma.cache-dir=${dataPath}`,
            '--aura.ollama.gpu.num-gpu=33',
            '--aura.ollama.gpu.num-thread=8',
            '--aura.ollama.gpu.num-ctx=4096'
        ];

        backendProcess = spawn(javaExec, args, {
            cwd: backendCwd,
            env: { ...process.env, "SPRING_PROFILES_ACTIVE": "prod" },
            windowsHide: true
        });

        backendProcess.stdout.pipe(logStream);
        backendProcess.stderr.pipe(logStream);

        backendProcess.on('exit', (code) => {
            if (!isQuitting) {
                showError(`Core backend service exited unexpectedly (code ${code}).`);
            }
        });

        resolve();
    });
}

async function waitForBackend() {
    updateStatus('Connecting to RAG service...');
    const maxAttempts = 60;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (isQuitting) return;
        const result = await checkUrl('http://localhost:8080/api/health');
        if (result.ok) {
            updateStatus('Launching AURA...');
            return;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Connection timeout waiting for Java service to initialize.');
}

function stopBackend() {
    isQuitting = true;
    if (backendProcess) {
        const pid = backendProcess.pid;
        backendProcess.kill();
        if (pid) {
            spawn('taskkill', ['/F', '/T', '/PID', pid.toString()], {
                windowsHide: true,
                stdio: 'ignore'
            });
        }
        backendProcess = null;
    }
    // Always stop Ollama service on exit as strictly requested by user
    console.log('[AURA CLEAN] Stopping Ollama service...');
    spawn('taskkill', ['/F', '/IM', 'ollama.exe'], {
        windowsHide: true,
        stdio: 'ignore'
    });
    spawn('taskkill', ['/F', '/IM', 'ollama app.exe'], {
        windowsHide: true,
        stdio: 'ignore'
    });
}

ipcMain.on('exit-app', () => {
    app.quit();
});

app.on('ready', () => {
    loadingWindow = new BrowserWindow({
        width: 600,
        height: 420,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#0F172A',
        show: false
    });
    loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
    loadingWindow.once('ready-to-show', () => {
        loadingWindow.show();
        startStartupSequence();
    });
});

async function startStartupSequence() {
    try {
        updateStatus('Cleaning previous installation...');
        await cleanStaleCache();
        const check = await checkOllamaAndModels();
        if (!check.ok) {
            showError(check.error);
            return;
        }
        await startBackend();
        await waitForBackend();
        launchMainWindow();
    } catch (e) {
        showError(e.message);
    }
}

function launchMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        title: "Aura - AI unified retrival assistant",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.once('ready-to-show', () => {
        if (loadingWindow && !loadingWindow.isDestroyed()) {
            loadingWindow.close();
        }
        mainWindow.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
}

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    stopBackend();
});
