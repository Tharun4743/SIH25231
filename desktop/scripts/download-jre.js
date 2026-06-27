const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DESKTOP_DIR = path.join(__dirname, '..');
const JRE_ZIP = path.join(DESKTOP_DIR, 'jre-21.zip');
const JRE_DIR = path.join(DESKTOP_DIR, 'jre');
const EXTRACT_TEMP = path.join(DESKTOP_DIR, 'jre-temp');

const DOWNLOAD_URL = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse';

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`[JRE DOWNLOAD] Fetching JRE binary from: ${url}`);
        const request = https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                console.log(`[JRE DOWNLOAD] Redirecting to: ${response.headers.location}`);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download JRE: Server returned status code ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(dest);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('[JRE DOWNLOAD] Download completed successfully.');
                resolve();
            });
        });

        request.on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

function extractZip(zipPath, extractTo) {
    console.log(`[JRE EXTRACT] Extracting zip file: ${zipPath}`);
    if (fs.existsSync(extractTo)) {
        fs.rmSync(extractTo, { recursive: true, force: true });
    }
    fs.mkdirSync(extractTo, { recursive: true });

    // Extract using PowerShell
    const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log('[JRE EXTRACT] Extraction completed.');
}

function finalizeJreFolder(tempDir, finalDir) {
    console.log('[JRE FINALIZE] Organizing folders...');
    if (fs.existsSync(finalDir)) {
        fs.rmSync(finalDir, { recursive: true, force: true });
    }

    // Find the single subdirectory inside the temp folder (e.g. jdk-21.0.11+9-jre)
    const items = fs.readdirSync(tempDir);
    const jreSubFolder = items.find(item => fs.statSync(path.join(tempDir, item)).isDirectory());

    if (!jreSubFolder) {
        throw new Error('Could not find any directory inside the extracted JRE zip contents.');
    }

    const sourcePath = path.join(tempDir, jreSubFolder);
    fs.renameSync(sourcePath, finalDir);
    console.log(`[JRE FINALIZE] Moved JRE folder to: ${finalDir}`);

    // Cleanup temp extraction directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

async function main() {
    try {
        if (fs.existsSync(JRE_DIR)) {
            console.log('[JRE PIPELINE] JRE folder already exists. Skipping download.');
            process.exit(0);
        }

        await downloadFile(DOWNLOAD_URL, JRE_ZIP);
        extractZip(JRE_ZIP, EXTRACT_TEMP);
        finalizeJreFolder(EXTRACT_TEMP, JRE_DIR);

        // Delete downloaded ZIP file
        if (fs.existsSync(JRE_ZIP)) {
            fs.unlinkSync(JRE_ZIP);
            console.log('[JRE PIPELINE] Deleted downloaded archive zip file.');
        }

        console.log('[JRE PIPELINE] JRE runtime setup completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('[JRE PIPELINE ERROR] Failed to download and extract Java Runtime Environment:', e);
        process.exit(1);
    }
}

main();
