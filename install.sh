#!/bin/bash

echo "Instalando YouTube Downloader para Linux..."
echo

echo "1. Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado!"
    echo "Por favor, instale o Node.js:"
    echo "Ubuntu/Debian: sudo apt install nodejs npm"
    echo "CentOS/RHEL: sudo yum install nodejs npm"
    echo "Arch: sudo pacman -S nodejs npm"
    exit 1
fi

echo "2. Instalando dependências..."
npm install

echo "3. Baixando yt-dlp..."
npm run download-ytdlp

echo
echo "Instalação concluída!"
echo "Para iniciar o programa, execute: ./start.sh"
echo "Ou: npm start"