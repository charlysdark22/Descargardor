const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Categories
    getCategories: () => ipcRenderer.invoke('get-categories'),
    
    // Directory browsing
    fetchDirectory: (url) => ipcRenderer.invoke('fetch-directory', url),
    
    // Downloads
    downloadFile: (fileUrl, fileName, savePath) => 
        ipcRenderer.invoke('download-file', { fileUrl, fileName, savePath }),
    selectDownloadDir: () => ipcRenderer.invoke('select-download-dir'),
    openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
    
    // Configuration
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    loadConfig: () => ipcRenderer.invoke('load-config'),
    
    // External links
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Download events
    onDownloadProgress: (callback) => 
        ipcRenderer.on('download-progress', (event, data) => callback(data)),
    onDownloadComplete: (callback) => 
        ipcRenderer.on('download-complete', (event, data) => callback(data)),
    onDownloadError: (callback) => 
        ipcRenderer.on('download-error', (event, data) => callback(data)),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
