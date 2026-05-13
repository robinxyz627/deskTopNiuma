@echo off
echo === Tauri Build Script ===
echo.

set "PATH=%USERPROFILE%\.rustup\toolchains\stable-x86_64-pc-windows-msvc\bin;%USERPROFILE%\.cargo\bin;%PATH%"

echo Checking Rust...
where rustc >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Rust not found!
    pause
    exit /b 1
)
rustc --version
echo.

echo Stopping old processes...
taskkill /f /im "niuma-wage-calculator.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
echo.

cd /d "F:\bling idea\deskTopPet\deskTopPet-app"

echo Building...
npx tauri build

if %ERRORLEVEL% neq 0 (
    echo.
    echo === BUILD FAILED ===
    pause
    exit /b 1
)

echo.
echo === BUILD SUCCESS ===
echo.
copy /y "F:\bling idea\deskTopPet\deskTopPet-app\src-tauri\target\release\niuma-wage-calculator.exe" "F:\bling idea\deskTopPet\"
echo.
echo Done!
echo.
pause
