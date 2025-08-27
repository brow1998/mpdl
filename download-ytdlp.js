const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

async function downloadWithRedirects(url, filename, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const download = (currentUrl, redirectCount = 0) => {
            if (redirectCount >= maxRedirects) {
                reject(new Error('Muitos redirecionamentos'));
                return;
            }

            console.log(`📥 Baixando de: ${currentUrl}`);
            
            const protocol = currentUrl.startsWith('https:') ? https : http;
            const file = fs.createWriteStream(filename);
            
            const request = protocol.get(currentUrl, (response) => {
                console.log(`Status: ${response.statusCode}`);
                
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                    file.close();
                    fs.unlink(filename, () => {});
                    
                    const newUrl = response.headers.location;
                    if (!newUrl) {
                        reject(new Error('Redirecionamento sem URL'));
                        return;
                    }
                    
                    console.log(`↪️  Redirecionando para: ${newUrl}`);
                    download(newUrl, redirectCount + 1);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(filename, () => {});
                    reject(new Error(`Status HTTP: ${response.statusCode}`));
                    return;
                }
                
                const totalSize = parseInt(response.headers['content-length']) || 0;
                let downloadedSize = 0;
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0) {
                        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                        process.stdout.write(`\r📦 ${filename}: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB)`);
                    } else {
                        process.stdout.write(`\r📦 ${filename}: ${(downloadedSize / 1024 / 1024).toFixed(1)}MB`);
                    }
                });
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    
                    const stats = fs.statSync(filename);
                    if (stats.size === 0) {
                        fs.unlink(filename, () => {});
                        reject(new Error('Arquivo baixado está vazio'));
                        return;
                    }
                    
                    console.log(`\n✅ ${filename} baixado com sucesso (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
                    resolve();
                });
                
                file.on('error', (err) => {
                    fs.unlink(filename, () => {});
                    reject(err);
                });
            });
            
            request.on('error', (err) => {
                file.close();
                fs.unlink(filename, () => {});
                reject(err);
            });
            
            request.setTimeout(60000, () => {
                request.destroy();
                file.close();
                fs.unlink(filename, () => {});
                reject(new Error('Timeout no download'));
            });
        };
        
        download(url);
    });
}

async function downloadYtDlp() {
    const filename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    
    const urls = [
        `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${filename}`,
        `https://github.com/yt-dlp/yt-dlp/releases/download/2024.12.23/${filename}`,
    ];
    
    for (const url of urls) {
        try {
            console.log(`🎬 Tentando baixar yt-dlp de: ${url}`);
            await downloadWithRedirects(url, filename);
            
            if (isLinux) {
                await new Promise((resolve, reject) => {
                    exec(`chmod +x ${filename}`, (error) => {
                        if (error) {
                            console.error('⚠️  Erro ao tornar executável:', error);
                            reject(error);
                        } else {
                            console.log('✅ yt-dlp configurado como executável');
                            resolve();
                        }
                    });
                });
            }
            
            return;
            
        } catch (error) {
            console.log(`❌ Falha com ${url}: ${error.message}`);
            
            if (url !== urls[urls.length - 1]) {
                console.log('🔄 Tentando próxima URL...\n');
                continue;
            }
            
            throw error;
        }
    }
}

async function downloadFFmpeg() {
    if (isWindows) {
        const filename = 'ffmpeg.7z';
        const url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-full.7z';
        
        try {
            console.log(`🎵 Baixando ffmpeg para Windows de: ${url}`);
            await downloadWithRedirects(url, filename);
            
            console.log('📂 Extraindo ffmpeg...');
            
            // Tentar com 7zip primeiro, depois PowerShell, depois tar
            await new Promise((resolve, reject) => {
                exec('7z x ffmpeg.7z', (error) => {
                    if (error) {
                        console.log('⚠️  7zip não encontrado, tentando PowerShell...');
                        
                        // Converter para zip se necessário ou tentar outra abordagem
                        console.log('💡 Para extrair .7z, instale 7-Zip ou baixe versão .zip');
                        console.log('📁 Arquivo salvo como ffmpeg.7z - extraia manualmente');
                        
                        // Tentar baixar versão ZIP como alternativa
                        const zipUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.zip';
                        console.log(`\n🔄 Tentando versão ZIP: ${zipUrl}`);
                        
                        downloadWithRedirects(zipUrl, 'ffmpeg.zip').then(() => {
                            exec('powershell -Command "Expand-Archive -Path ffmpeg.zip -DestinationPath . -Force"', (psError) => {
                                if (psError) {
                                    console.log('⚠️  PowerShell falhou, tentando tar...');
                                    exec('tar -xf ffmpeg.zip', (tarError) => {
                                        if (tarError) {
                                            console.log('❌ Falha ao extrair. Extraia manualmente ffmpeg.zip');
                                        } else {
                                            moveFFmpegWindows();
                                        }
                                        resolve();
                                    });
                                } else {
                                    moveFFmpegWindows();
                                    resolve();
                                }
                            });
                        }).catch(() => {
                            console.log('❌ Falha no download alternativo');
                            resolve();
                        });
                    } else {
                        moveFFmpegWindows();
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.log(`❌ Erro no download do ffmpeg: ${error.message}`);
            console.log('💡 Baixe manualmente de: https://www.gyan.dev/ffmpeg/builds/');
        }
        
    } else {
        // Linux - usar BtbN builds
        const filename = 'ffmpeg-linux64-gpl.tar.xz';
        const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-linux64-gpl.tar.xz';
        
        try {
            console.log(`🐧 Baixando ffmpeg para Linux de: ${url}`);
            await downloadWithRedirects(url, filename);
            
            console.log('📂 Extraindo ffmpeg...');
            await new Promise((resolve, reject) => {
                exec(`tar -xf ${filename}`, (error) => {
                    if (error) {
                        console.error('❌ Erro ao extrair:', error.message);
                        console.log('💡 Instale via package manager: sudo apt install ffmpeg');
                        resolve();
                    } else {
                        moveFFmpegLinux();
                        resolve();
                    }
                });
            });
            
        } catch (error) {
            console.log(`❌ Erro no download do ffmpeg: ${error.message}`);
            console.log('💡 Instale via package manager:');
            console.log('  📦 sudo apt install ffmpeg  # Ubuntu/Debian');
            console.log('  📦 sudo yum install ffmpeg  # CentOS/RHEL');
        }
    }
}

function moveFFmpegWindows() {
    const findFFmpeg = (dir) => {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                if (file.isDirectory()) {
                    const result = findFFmpeg(path.join(dir, file.name));
                    if (result) return result;
                } else if (file.name === 'ffmpeg.exe') {
                    return path.join(dir, file.name);
                }
            }
        } catch (error) {
            // Ignorar erros
        }
        return null;
    };
    
    try {
        const ffmpegPath = findFFmpeg('.');
        if (ffmpegPath && ffmpegPath !== './ffmpeg.exe') {
            fs.copyFileSync(ffmpegPath, 'ffmpeg.exe');
            console.log('✅ ffmpeg.exe configurado');
            
            const stats = fs.statSync('ffmpeg.exe');
            console.log(`📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
        }
        
        // Limpar depois
        setTimeout(() => {
            try {
                ['ffmpeg.7z', 'ffmpeg.zip'].forEach(file => {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                        console.log(`🧹 ${file} removido`);
                    }
                });
                
                const dirs = fs.readdirSync('.').filter(item => 
                    fs.statSync(item).isDirectory() && item.includes('ffmpeg')
                );
                dirs.forEach(dir => {
                    fs.rmSync(dir, { recursive: true, force: true });
                    console.log(`🧹 Pasta ${dir} removida`);
                });
            } catch (error) {
                console.log('💡 Limpe arquivos temporários manualmente se necessário');
            }
        }, 5000);
        
    } catch (error) {
        console.log('⚠️  Erro ao configurar ffmpeg:', error.message);
    }
}

function moveFFmpegLinux() {
    const findFFmpeg = (dir) => {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                if (file.isDirectory()) {
                    const result = findFFmpeg(path.join(dir, file.name));
                    if (result) return result;
                } else if (file.name === 'ffmpeg') {
                    return path.join(dir, file.name);
                }
            }
        } catch (error) {
            // Ignorar erros
        }
        return null;
    };
    
    try {
        const ffmpegPath = findFFmpeg('.');
        if (ffmpegPath && ffmpegPath !== './ffmpeg') {
            fs.copyFileSync(ffmpegPath, 'ffmpeg');
            exec('chmod +x ffmpeg', (error) => {
                if (error) {
                    console.error('⚠️  Erro ao tornar executável:', error);
                } else {
                    console.log('✅ ffmpeg configurado');
                    
                    const stats = fs.statSync('ffmpeg');
                    console.log(`📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
                }
            });
        }
        
        // Limpar depois
        setTimeout(() => {
            try {
                if (fs.existsSync('ffmpeg-linux64-gpl.tar.xz')) {
                    fs.unlinkSync('ffmpeg-linux64-gpl.tar.xz');
                    console.log('🧹 Arquivo temporário removido');
                }
                
                const dirs = fs.readdirSync('.').filter(item => 
                    fs.statSync(item).isDirectory() && item.includes('ffmpeg')
                );
                dirs.forEach(dir => {
                    exec(`rm -rf "${dir}"`, () => {
                        console.log(`🧹 Pasta ${dir} removida`);
                    });
                });
            } catch (error) {
                console.log('💡 Limpe arquivos temporários manualmente se necessário');
            }
        }, 5000);
        
    } catch (error) {
        console.log('⚠️  Erro ao configurar ffmpeg:', error.message);
    }
}

async function main() {
    console.log('🚀 YouTube Downloader - Instalador Atualizado\n');
    console.log(`📱 Sistema: ${process.platform}\n`);
    
    try {
        const ytdlpExists = fs.existsSync(isWindows ? 'yt-dlp.exe' : 'yt-dlp');
        const ffmpegExists = fs.existsSync(isWindows ? 'ffmpeg.exe' : 'ffmpeg');
        
        console.log('📋 Status atual:');
        console.log(`  🎬 yt-dlp: ${ytdlpExists ? '✅ Instalado' : '❌ Não encontrado'}`);
        console.log(`  🎵 ffmpeg: ${ffmpegExists ? '✅ Instalado' : '❌ Não encontrado'}`);
        console.log('');
        
        // Sempre redownload se arquivo está vazio
        if (ytdlpExists) {
            const stats = fs.statSync(isWindows ? 'yt-dlp.exe' : 'yt-dlp');
            if (stats.size === 0) {
                console.log('⚠️  yt-dlp está vazio, baixando novamente...');
                fs.unlinkSync(isWindows ? 'yt-dlp.exe' : 'yt-dlp');
                await downloadYtDlp();
            } else {
                console.log(`✅ yt-dlp OK (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
            }
        } else {
            await downloadYtDlp();
        }
        
        if (!ffmpegExists) {
            await downloadFFmpeg();
        } else {
            const stats = fs.statSync(isWindows ? 'ffmpeg.exe' : 'ffmpeg');
            console.log(`✅ ffmpeg local OK (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
        }
        
        console.log('\n🎉 Instalação concluída!');
        console.log('💡 O programa agora usará SEMPRE o ffmpeg local quando disponível');
        console.log('\n🚀 Execute: npm start');
        
    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        process.exit(1);
    }
}

main();