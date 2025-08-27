const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Detecta o sistema operacional
const isWindows = process.platform === 'win32';
const ytdlpCommand = isWindows ? 'yt-dlp.exe' : './yt-dlp';

// Middleware com logs
app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static('.'));

// Servir o arquivo HTML
app.get('/', (req, res) => {
    console.log('📄 Servindo index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para verificar ferramentas
app.get('/api/check-tools', (req, res) => {
    console.log('🔧 Verificando ferramentas...');
    
    try {
        const ytdlpPath = path.join(__dirname, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
        const ffmpegPath = path.join(__dirname, isWindows ? 'ffmpeg.exe' : 'ffmpeg');
        
        const ytdlpExists = fs.existsSync(ytdlpPath);
        const ffmpegLocal = fs.existsSync(ffmpegPath);
        
        console.log(`📊 yt-dlp: ${ytdlpExists ? 'OK' : 'MISSING'}`);
        console.log(`📊 ffmpeg local: ${ffmpegLocal ? 'OK' : 'MISSING'}`);
        
        // Verificar ffmpeg do sistema
        let systemFfmpeg = false;
        try {
            require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
            systemFfmpeg = true;
            console.log('📊 ffmpeg sistema: OK');
        } catch (error) {
            console.log('📊 ffmpeg sistema: MISSING');
        }
        
        const result = { 
            ytdlp: ytdlpExists,
            ffmpeg: ffmpegLocal || systemFfmpeg,
            ffmpegLocal: ffmpegLocal,
            ffmpegSystem: systemFfmpeg,
            platform: process.platform,
            allReady: ytdlpExists && (ffmpegLocal || systemFfmpeg),
            priorityFfmpeg: ffmpegLocal ? 'local' : (systemFfmpeg ? 'system' : 'none'),
            debug: {
                ytdlpPath: ytdlpPath,
                ffmpegPath: ffmpegPath,
                workingDir: __dirname
            }
        };
        
        console.log('✅ Enviando resposta tools:', JSON.stringify(result, null, 2));
        res.json(result);
        
    } catch (error) {
        console.error('❌ Erro ao verificar ferramentas:', error);
        res.status(500).json({ error: 'Erro interno: ' + error.message });
    }
});

// Endpoint para obter informações do vídeo
app.post('/api/video-info', (req, res) => {
    console.log('🎬 Solicitação de info do vídeo...');
    console.log('📨 Body:', req.body);
    
    const { url } = req.body;
    
    if (!url) {
        console.log('❌ URL não fornecida');
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Verificar se yt-dlp existe
    const ytdlpPath = path.join(__dirname, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    if (!fs.existsSync(ytdlpPath)) {
        console.log('❌ yt-dlp não encontrado em:', ytdlpPath);
        return res.status(500).json({ error: 'yt-dlp não encontrado. Execute: npm run install-ytdlp' });
    }

    const command = `${ytdlpCommand} --dump-json "${url}"`;
    console.log('📝 Executando:', command);
    
    exec(command, { 
        cwd: __dirname,
        timeout: 30000 // 30 segundos
    }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Erro ao executar yt-dlp:', error);
            console.error('❌ stderr:', stderr);
            return res.status(500).json({ error: 'Erro ao obter informações: ' + error.message });
        }
        
        try {
            console.log('📊 Stdout length:', stdout.length);
            const videoInfo = JSON.parse(stdout);
            const result = {
                title: videoInfo.title,
                duration: videoInfo.duration,
                uploader: videoInfo.uploader,
                view_count: videoInfo.view_count,
                thumbnail: videoInfo.thumbnail
            };
            console.log('✅ Info obtida:', result.title);
            res.json(result);
        } catch (parseError) {
            console.error('❌ Erro ao parsear JSON:', parseError);
            console.log('📄 Raw stdout:', stdout.substring(0, 500));
            res.status(500).json({ error: 'Erro ao processar informações do vídeo' });
        }
    });
});

// Endpoint para download
app.post('/api/download', (req, res) => {
    console.log('⬇️  Solicitação de download...');
    console.log('📨 Body:', req.body);
    
    const { url, format, quality } = req.body;
    
    if (!url) {
        console.log('❌ URL não fornecida');
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Verificar se yt-dlp existe
    const ytdlpPath = path.join(__dirname, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    if (!fs.existsSync(ytdlpPath)) {
        console.log('❌ yt-dlp não encontrado em:', ytdlpPath);
        return res.status(500).json({ error: 'yt-dlp não encontrado. Execute: npm run install-ytdlp' });
    }

    let command = ytdlpCommand;
    let outputTemplate = '--output "Downloads/%(title)s.%(ext)s"';
    
    // SEMPRE PRIORIZAR FFMPEG LOCAL
    const localFfmpegPath = path.join(__dirname, isWindows ? 'ffmpeg.exe' : 'ffmpeg');
    const localFfmpeg = fs.existsSync(localFfmpegPath);
    
    let systemFfmpeg = false;
    if (!localFfmpeg) {
        try {
            require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
            systemFfmpeg = true;
        } catch (error) {
            // ffmpeg não está no PATH
        }
    }
    
    // Configurar ffmpeg
    let ffmpegConfig = '';
    if (localFfmpeg) {
        const absolutePath = path.resolve(__dirname, isWindows ? 'ffmpeg.exe' : 'ffmpeg');
        ffmpegConfig = `--ffmpeg-location "${absolutePath}"`;
        console.log('🎵 Usando ffmpeg LOCAL:', absolutePath);
    } else if (systemFfmpeg) {
        console.log('🎵 Usando ffmpeg do SISTEMA');
    } else {
        if (format === 'mp3' || format === 'mp4-with-audio') {
            console.log('❌ ffmpeg necessário mas não encontrado');
            return res.status(500).json({ 
                error: 'ffmpeg é necessário. Execute: npm run install-ytdlp' 
            });
        }
    }
    
    // Criar pasta Downloads
    const downloadsDir = path.join(__dirname, 'Downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir);
        console.log('📁 Pasta Downloads criada');
    }

    // Construir comando
    switch(format) {
        case 'mp3':
            command += ` ${ffmpegConfig} --extract-audio --audio-format mp3 --audio-quality 0 ${outputTemplate} "${url}"`;
            break;
        case 'mp4-no-audio':
            if (quality === '4k') {
                command += ` -f "bestvideo[height<=2160]/bestvideo" ${outputTemplate} "${url}"`;
            } else {
                command += ` -f "bestvideo[height<=1080]/bestvideo" ${outputTemplate} "${url}"`;
            }
            break;
        case 'mp4-with-audio':
            if (quality === '4k') {
                command += ` ${ffmpegConfig} -f "bestvideo[height<=2160]+bestaudio/best[height<=2160]" --merge-output-format mp4 ${outputTemplate} "${url}"`;
            } else {
                command += ` ${ffmpegConfig} -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 ${outputTemplate} "${url}"`;
            }
            break;
        default:
            console.log('❌ Formato inválido:', format);
            return res.status(400).json({ error: 'Formato inválido' });
    }

    console.log('📝 Comando final:', command);

    // Configurar resposta streaming
    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*'
    });

    res.write(`🚀 Iniciando download...\n`);
    res.write(`📝 Comando: ${command}\n\n`);

    const process = exec(command, { 
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 50
    }, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Erro no download:', error);
            res.write(`❌ ERRO: ${error.message}\n`);
        } else {
            console.log('✅ Download concluído');
            res.write('✅ SUCESSO: Download concluído!\n');
        }
        res.end();
    });

    process.stdout.on('data', (data) => {
        res.write(data);
    });

    process.stderr.on('data', (data) => {
        res.write(data);
    });

    req.on('close', () => {
        console.log('🛑 Conexão fechada, matando processo');
        process.kill();
    });
});

// Endpoint de teste
app.get('/api/test', (req, res) => {
    console.log('🧪 Endpoint de teste acessado');
    res.json({ 
        message: 'API funcionando!', 
        timestamp: new Date().toISOString(),
        platform: process.platform,
        workingDir: __dirname
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('💥 Erro não tratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📱 Sistema: ${process.platform}`);
    console.log(`📁 Diretório: ${__dirname}`);
    console.log('🌐 APIs disponíveis:');
    console.log('  GET  /api/test');
    console.log('  GET  /api/check-tools');
    console.log('  POST /api/video-info');
    console.log('  POST /api/download');
    console.log('');
    console.log('🧪 Teste básico: curl http://localhost:3000/api/test');
    console.log('');
});