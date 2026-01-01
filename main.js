const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { URL } = require('url');

let mainWindow;

// Configuration
const CONFIG = {
    BASE_URL: 'https://visuales.uclv.cu',
    CATEGORIES: [
        { id: 'peliculas', name: 'Películas', url: '/Peliculas/', icon: '🎬' },
        { id: 'series', name: 'Series', url: '/Series/', icon: '📺' },
        { id: 'documentales', name: 'Documentales', url: '/Documentales/', icon: '🎥' },
        { id: 'recientes', name: 'Recientes', url: '/Recientes/', icon: '🆕' },
        { id: 'cursos', name: 'Cursos', url: '/Cursos/', icon: '📚' },
        { id: 'conferencias', name: 'Conferencias', url: '/Conferencias/', icon: '🎤' }
    ]
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a2e',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Get categories
ipcMain.handle('get-categories', () => {
    return CONFIG.CATEGORIES;
});

// Fetch directory listing
ipcMain.handle('fetch-directory', async (event, url) => {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const items = [];
        
        $('table tr').each((i, row) => {
            if (i === 0) return; // Skip header
            
            const $row = $(row);
            const nameLink = $row.find('a');
            const name = nameLink.text().trim();
            
            if (!name || name === 'Parent Directory') return;
            
            const isDirectory = $row.find('img[alt="[DIR]"]').length > 0 || name.endsWith('/');
            const size = $row.find('td').eq(2).text().trim();
            const date = $row.find('td').eq(1).text().trim();
            const fullUrl = new URL(nameLink.attr('href'), url).href;
            
            items.push({
                name,
                isDirectory,
                size,
                date,
                url: fullUrl,
                type: isDirectory ? 'folder' : getFileType(name)
            });
        });
        
        return { success: true, items };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Download file
ipcMain.handle('download-file', async (event, { fileUrl, fileName, savePath }) => {
    return new Promise((resolve) => {
        mainWindow.webContents.downloadURL(fileUrl);
        
        mainWindow.webContents.session.on('will-download', (event, item) => {
            const fullPath = path.join(savePath, fileName);
            item.setSavePath(fullPath);
            
            item.on('updated', (event, state) => {
                if (state === 'progressing') {
                    mainWindow.webContents.send('download-progress', {
                        fileName,
                        percent: Math.round(item.getPercentComplete()),
                        bytesReceived: item.getReceivedBytes(),
                        totalBytes: item.getTotalBytes()
                    });
                }
            });
            
            item.on('done', (event, state) => {
                if (state === 'completed') {
                    mainWindow.webContents.send('download-complete', {
                        fileName,
                        success: true,
                        path: fullPath
                    });
                    resolve({ success: true, path: fullPath });
                } else {
                    mainWindow.webContents.send('download-error', {
                        fileName,
                        error: state
                    });
                    resolve({ success: false, error: state });
                }
            });
        });
    });
});

// Select download directory
ipcMain.handle('select-download-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Seleccionar carpeta de descarga'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Save configuration
ipcMain.handle('save-config', (event, config) => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
});

// Load configuration
ipcMain.handle('load-config', () => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return { downloadPath: app.getPath('downloads') };
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
    await shell.showItemInFolder(filePath);
    return true;
});

// Open external link
ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return true;
});

function getFileType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
        '.mp4': 'video',
        '.mkv': 'video',
        '.avi': 'video',
        '.mov': 'video',
        '.wmv': 'video',
        '.flv': 'video',
        '.webm': 'video',
        '.m3u8': 'video',
        '.zip': 'archive',
        '.rar': 'archive',
        '.7z': 'archive',
        '.tar': 'archive',
        '.gz': 'archive',
        '.srt': 'subtitle',
        '.sub': 'subtitle',
        '.txt': 'text',
        '.pdf': 'document',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.png': 'image',
        '.gif': 'image'
    };
    return types[ext] || 'unknown';
}
