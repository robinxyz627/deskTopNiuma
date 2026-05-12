@echo off
echo ========================================
echo   牛马工资计算器 - 编译环境配置
echo ========================================
echo.

echo [1/3] 设置 MSVC 环境变量...
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64

echo [2/3] 进入项目目录...
cd /d "%~dp0src-tauri"

echo [3/3] 开始编译...
cargo check

echo.
echo ========================================
echo   编译完成！
echo ========================================
pause
