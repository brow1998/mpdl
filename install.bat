@echo off
echo Instalando YouTube Downloader...
echo.

echo 1. Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, baixe e instale o Node.js de: https://nodejs.org
    pause
    exit /b 1
)

echo 2. Instalando dependencias...
npm install

echo 3. Baixando yt-dlp...
npm run download-ytdlp

echo.
echo Instalacao concluida!
echo Para iniciar o programa, execute: start.bat
pause