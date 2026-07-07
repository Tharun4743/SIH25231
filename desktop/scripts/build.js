const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.join(__dirname, '../src');
const DESKTOP_DIR = path.join(__dirname, '..');

// OPTIMIZATION C: Set electron-builder environments for maximum packaging speed
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'; // Skip macOS/Windows code signing discovery

function runCommand(cmd, cwd = ROOT_DIR) {
    console.log(`[AURA BUILD] Running: ${cmd} (in ${cwd})`);
    execSync(cmd, { cwd, stdio: 'inherit' });
}

function cleanDirectory(dir) {
    if (fs.existsSync(dir)) {
        console.log(`[AURA BUILD] Cleaning directory: ${dir}`);
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

async function main() {
    try {
        console.log('\n===================================================');
        console.log('     AURA DESKTOP APPLICATION BUILD PIPELINE       ');
        console.log('===================================================\n');

        // Step 1: Download JRE if missing
        const jrePath = path.join(DESKTOP_DIR, 'jre');
        if (!fs.existsSync(jrePath)) {
            console.log('[AURA BUILD] JRE is missing. Fetching JDK 21 runtime...');
            runCommand('node scripts/download-jre.js', DESKTOP_DIR);
        } else {
            console.log('[AURA BUILD] Bundled JRE is already present.');
        }

        // Step 2: Build React frontend UI
        console.log('\n[AURA BUILD] Building React frontend UI...');
        const frontendDir = path.join(ROOT_DIR, 'frontend');
        runCommand('npm install', frontendDir);
        runCommand('npm run build', frontendDir);

        // Step 3: Build Spring Boot backend server using Maven
        console.log('\n[AURA BUILD] Packaging Spring Boot backend server...');
        const backendDir = path.join(ROOT_DIR, 'backend');
        const mvnCmd = path.join(ROOT_DIR, 'tools/apache-maven-3.9.6/bin/mvn.cmd');
        runCommand(`"${mvnCmd}" clean package -DskipTests`, backendDir);

        // Step 4: Setup temporary build tree
        console.log('\n[AURA BUILD] Setting up temporary build tree...');
        const tempBackendDir = path.join(DESKTOP_DIR, 'backend');
        const tempFrontendDir = path.join(DESKTOP_DIR, 'frontend');
        const tempVenvDir = path.join(DESKTOP_DIR, '.venv');
        const tempDataDir = path.join(DESKTOP_DIR, 'data');

        cleanDirectory(tempBackendDir);
        cleanDirectory(tempFrontendDir);
        cleanDirectory(tempVenvDir);
        cleanDirectory(tempDataDir);

        fs.mkdirSync(tempBackendDir, { recursive: true });
        fs.mkdirSync(tempFrontendDir, { recursive: true });

        // Copy JAR and vector cache
        const jarName = fs.existsSync(path.join(backendDir, 'target/aura-backend.jar'))
            ? 'aura-backend.jar'
            : 'aura-backend-1.0.0.jar';
        fs.copyFileSync(
            path.join(backendDir, 'target', jarName),
            path.join(tempBackendDir, 'aura-backend.jar')
        );
        console.log(`[AURA BUILD] Copied JAR: ${path.join(tempBackendDir, 'aura-backend.jar')}`);

        if (fs.existsSync(path.join(backendDir, 'chroma_cache.json'))) {
            fs.copyFileSync(
                path.join(backendDir, 'chroma_cache.json'),
                path.join(tempBackendDir, 'chroma_cache.json')
            );
            console.log(`[AURA BUILD] Copied vector cache: ${path.join(tempBackendDir, 'chroma_cache.json')}`);
        }

        // OPTIMIZATION B: Parallel staging copy using PowerShell jobs
        console.log('[AURA BUILD] Copying AI models, sidecars, and React build in parallel using PowerShell jobs...');
        const copyJobs = [
            `Start-Job { Copy-Item -Path '${path.join(backendDir, 'sidecars')}' -Destination '${tempBackendDir}' -Recurse -Force }`,
            `Start-Job { Copy-Item -Path '${path.join(backendDir, 'models')}' -Destination '${tempBackendDir}' -Recurse -Force }`,
            `Start-Job { Copy-Item -Path '${path.join(frontendDir, 'dist')}' -Destination '${tempFrontendDir}' -Recurse -Force }`
        ].join('; ');
        execSync(`powershell -Command "${copyJobs}; Get-Job | Wait-Job | Remove-Job"`);

        // Copy Python virtual environment
        console.log('[AURA BUILD] Copying Python virtual environment (this may take a minute)...');
        execSync(`powershell -Command "Copy-Item -Path '${path.join(ROOT_DIR, '.venv')}' -Destination '${DESKTOP_DIR}' -Recurse -Force"`);

        // Copy database folder
        console.log('[AURA BUILD] Copying SQLite seed database...');
        execSync(`powershell -Command "Copy-Item -Path '${path.join(ROOT_DIR, 'data')}' -Destination '${DESKTOP_DIR}' -Recurse -Force"`);

        // OPTIMIZATION A: Strip redundant cache files, test files, and docs inside staged .venv
        console.log('[AURA BUILD] Cleaning redundant files and stripping virtual environment to optimize footprint and extraction speed...');
        // Strip __pycache__ folders
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter '__pycache__' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force"`);
        // Strip bytecode *.pyc files
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter '*.pyc' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force"`);
        // Strip test folders
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter 'test*' -Recurse -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force"`);
        // Strip .dist-info folders (pip metadata, not needed at runtime)
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter '*.dist-info' -Recurse -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force"`);
        // Strip type stub *.pyi files
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter '*.pyi' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force"`);
        // Strip duplicate C++ .h header files from torch/include (saves ~150MB)
        execSync(`powershell -Command "Get-ChildItem -Path '${tempVenvDir}' -Filter 'include' -Recurse -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force"`);

        // Step 6: Install desktop wrapper devDependencies if node_modules missing
        if (!fs.existsSync(path.join(DESKTOP_DIR, 'node_modules'))) {
            console.log('\n[AURA BUILD] Installing desktop Electron wrapper packages...');
            runCommand('npm install', DESKTOP_DIR);
        }

        // Step 7: Package native desktop applications using electron-builder
        console.log('\n[AURA BUILD] Packaging native desktop applications (.exe)...');
        runCommand('npx electron-builder build --win --publish never', DESKTOP_DIR);

        // Step 8: Rename output executables to match target specifications
        console.log('\n[AURA BUILD] Post-processing target deliverables...');
        const distDir = path.join(DESKTOP_DIR, 'dist');
        const oldSetup = path.join(distDir, 'Aura Setup 1.0.0.exe');
        const newSetup = path.join(distDir, 'Aura-Setup-1.0.0.exe');
        const oldAppx = path.join(distDir, 'Aura 1.0.0.appx');
        const newAppx = path.join(distDir, 'Aura-1.0.0.msix');

        if (fs.existsSync(oldSetup)) {
            if (fs.existsSync(newSetup)) fs.rmSync(newSetup);
            fs.renameSync(oldSetup, newSetup);
            console.log(`[AURA BUILD] Renamed: ${newSetup}`);
        }
        if (fs.existsSync(oldAppx)) {
            if (fs.existsSync(newAppx)) fs.rmSync(newAppx);
            fs.renameSync(oldAppx, newAppx);
            console.log(`[AURA BUILD] Generated MSIX: ${newAppx}`);
        }

        // Step 9: Clean temporary build directories
        console.log('\n[AURA BUILD] Cleaning up temporary folders...');
        cleanDirectory(tempBackendDir);
        cleanDirectory(tempFrontendDir);
        cleanDirectory(tempVenvDir);
        cleanDirectory(tempDataDir);

        console.log('\n===================================================');
        console.log('       AURA DESKTOP BUILD SUCCESSFUL!              ');
        console.log('===================================================\n');
    } catch (e) {
        console.error('\n[AURA BUILD ERROR] Compilation pipeline failed:', e);
        process.exit(1);
    }
}
main();
