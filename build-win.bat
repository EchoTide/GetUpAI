@echo off
echo ========================================
echo   GetUpAI Windows Build Script
echo ========================================
echo.

REM ----------------------------------------
REM [1/4] Kill any running GetUpAI instance
REM ----------------------------------------
echo [1/4] Stopping any running GetUpAI processes...
taskkill /f /im GetUpAI.exe /t >nul 2>&1
echo Done (ignored if not running).
echo.

REM ----------------------------------------
REM [2/4] Build shared-logic
REM ----------------------------------------
echo [2/4] Building shared-logic...
cd /d "%~dp0shared-logic"

if not exist "node_modules" (
    echo Installing shared-logic dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error: shared-logic npm install failed
        pause
        exit /b 1
    )
)

call npm run build
if %errorlevel% neq 0 (
    echo Error: shared-logic build failed
    pause
    exit /b 1
)
echo.

REM ----------------------------------------
REM [3/4] Install desktop dependencies
REM ----------------------------------------
cd /d "%~dp0clients\desktop"

echo [3/4] Installing desktop dependencies...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo Error: npm install failed
        pause
        exit /b 1
    )
) else (
    echo node_modules already exists, skipping npm install.
)
echo.

REM ----------------------------------------
REM [4/4] Build and package
REM ----------------------------------------
echo [4/4] Building and packaging...

if exist "build\icon.ico" (
    echo Icon already exists, skipping icon generation.
    call npm run build:renderer
    if %errorlevel% neq 0 (
        echo Error: build:renderer failed
        pause
        exit /b 1
    )
    call npm run build:electron
    if %errorlevel% neq 0 (
        echo Error: build:electron failed
        pause
        exit /b 1
    )
    set ELECTRON_BUILDER_BINARIES_MIRROR=https://cdn.npmmirror.com/binaries/electron-builder-binaries/
    set ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
    call npx electron-builder --win
    if %errorlevel% neq 0 (
        echo Error: electron-builder failed
        pause
        exit /b 1
    )
) else (
    call npm run dist:win
    if %errorlevel% neq 0 (
        echo Error: build failed
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   Build complete!
echo   Output: clients\desktop\release-out\
echo ========================================
echo.

explorer "%~dp0clients\desktop\release-out"
pause
