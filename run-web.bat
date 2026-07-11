@echo off
title AURA - AI Unified Retrieval Assistant (Web Version)
color 0B

echo =======================================================================
echo              AURA - AI Unified Retrieval Assistant                    
echo                       (Web Version Launcher)                          
echo =======================================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Java / Maven
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Maven (mvn) is not installed or not in your PATH.
    echo Please install Maven and ensure it is available in your system PATH.
    pause
    exit /b 1
)

:: Check and install dependencies in desktop/src/frontend if needed
if not exist "desktop\src\frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies in desktop\src\frontend...
    pushd desktop\src\frontend
    call npm install
    popd
)

:: Check and install dependencies in web if needed
if not exist "web\node_modules\" (
    echo [INFO] Installing web runner dependencies in web\...
    pushd web
    call npm install
    popd
)

:: Check if Ollama is running
echo [INFO] Checking if Ollama is running...
curl -s http://localhost:11434/ >nul 2>nul
if %errorlevel% neq 0 (
    color 0E
    echo [WARNING] Ollama does not seem to be running on http://localhost:11434
    echo Please make sure Ollama is started and the following models are pulled:
    echo   - llama3
    echo   - nomic-embed-text
    echo.
) else (
    echo [SUCCESS] Ollama is active.
)

echo.
echo [INFO] Starting AURA Web Version (Backend + Frontend)...
echo [INFO] Access the application in your browser at: http://localhost:5173
echo.

:: Start Vite dev server in the web folder
pushd web
call npm run dev
popd

pause
