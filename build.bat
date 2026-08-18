@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Starting Build Process
echo ==========================================

:: 1. Build Frontend
echo [1/4] Building Frontend...
cd frontend
call npm run build>nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed!
    cd ..
    exit /b %ERRORLEVEL%
)
cd ..

:: 2. Build Backend
echo [2/4] Building Backend...
cd backend
@REM call npm run build>nul 2>&1
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend build failed!
    cd ..
    exit /b %ERRORLEVEL%
)
cd ..

:: 3. Prepare Dist Directory
echo [3/4] Organizing build files in "dist"...
if exist dist (
    rmdir /s /q dist
)
mkdir dist
mkdir dist\build
mkdir dist\templates
mkdir dist\backups
mkdir dist\uploads
mkdir dist\uploads\csv
mkdir dist\uploads\sample

:: Copy frontend build files to dist/build
if exist frontend\dist (
    xcopy /e /y /q frontend\dist\* dist\build\ >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to copy frontend build files to dist\build!
        exit /b %ERRORLEVEL%
    )
) else (
    echo [WARNING] frontend\dist does not exist. Frontend files were not copied.
)

:: Move backend bundle files to dist and rename to main.js
if exist backend\main.bundle.js (
    move /y backend\main.bundle.js dist\main.js >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to move and rename backend bundle to dist\main.js!
        exit /b %ERRORLEVEL%
    )
) else (
    echo [WARNING] backend\main.bundle.js not found.
)

:: Copy templates, package.json, and env file to dist
if exist backend\templates (
    xcopy /e /y /q backend\templates\* dist\templates\ >nul 2>&1
)
if exist backend\package.json (
    copy /y backend\package.json dist\ >nul 2>&1
)
if exist backend\.env (
    copy /y backend\.env dist\ >nul 2>&1
)


powershell -NoProfile -Command "Get-ChildItem -Path dist -Recurse -Directory | Where-Object { $_.FullName -notmatch '\\node_modules' } | Where-Object { (Get-ChildItem -Path $_.FullName -Force).Count -eq 0 } | ForEach-Object { New-Item -Path $_.FullName -Name .gitkeep -ItemType File -Force >$null }"

:: 4. Clean up source directories
echo [4/4] Cleaning source directories...
if exist frontend\dist rmdir /s /q frontend\dist
if exist backend\*.license.txt del /f /q backend\*.license.txt >nul 2>&1

echo ==========================================
echo Build Completed Successfully!
echo Build artifacts are in the "dist" directory.
echo ==========================================

exit /b 0
