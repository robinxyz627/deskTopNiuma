@echo off
chcp 65001 >nul

echo === Setting up environment ===

set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "LIB=C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\um\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.19041.0\ucrt\x64;C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.42.34433\lib\x64"
set "INCLUDE=C:\Program Files (x86)\Windows Kits\10\Include\10.0.19041.0\um;C:\Program Files (x86)\Windows Kits\10\Include\10.0.19041.0\ucrt;C:\Program Files (x86)\Windows Kits\10\Include\10.0.19041.0\shared;C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.42.34433\include"

echo PATH=%PATH%
echo.

echo === Checking rustc ===
where rustc
if %ERRORLEVEL% neq 0 (
    echo ERROR: rustc not found! Make sure Rust is installed.
    exit /b 1
)
rustc --version
echo.

echo === Checking cargo ===
where cargo
if %ERRORLEVEL% neq 0 (
    echo ERROR: cargo not found!
    exit /b 1
)
cargo --version
echo.

echo === Killing old processes ===
taskkill /f /im "niuma-wage-calculator.exe" 2>nul
taskkill /f /im "牛马工资计算器.exe" 2>nul
timeout /t 1 /nobreak >nul
echo.

echo === Building project ===
cd /d "F:\bling idea\deskTopPet\deskTopPet-app"

call npx tauri build 2>&1

if %ERRORLEVEL% neq 0 (
    echo.
    echo === BUILD FAILED ===
    echo.
    echo Trying cargo clean and rebuild...
    cd /d "F:\bling idea\deskTopPet\deskTopPet-app\src-tauri"
    cargo clean 2>&1
    cd /d "F:\bling idea\deskTopPet\deskTopPet-app"
    call npx tauri build 2>&1
    if %ERRORLEVEL% neq 0 (
        echo.
        echo === BUILD FAILED AGAIN ===
        exit /b 1
    )
)

echo.
echo === Copying exe ===
taskkill /f /im "niuma-wage-calculator.exe" 2>nul
taskkill /f /im "牛马工资计算器.exe" 2>nul
timeout /t 1 /nobreak >nul

copy /y "F:\bling idea\deskTopPet\deskTopPet-app\src-tauri\target\release\niuma-wage-calculator.exe" "F:\bling idea\deskTopPet\牛马工资计算器.exe"

echo.
echo === BUILD SUCCESS ===
echo Output: F:\bling idea\deskTopPet\牛马工资计算器.exe
exit /b 0
