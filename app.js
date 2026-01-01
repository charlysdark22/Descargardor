/**
 * Visuales UCLV Desktop App
 * Main Application Logic
 */

// App State
const state = {
    currentPath: '',
    currentCategory: null,
    history: [],
    historyIndex: -1,
    favorites: [],
    downloads: [],
    browsingHistory: [],
    config: {
        downloadPath: ''
    },
    viewMode: 'grid'
};

// DOM Elements
const elements = {
    sidebar: document.getElementById('sidebar'),
    menuToggle: document.getElementById('menu-toggle'),
    categoryList: document.getElementById('category-list'),
    breadcrumb: document.getElementById('breadcrumb'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    welcomeScreen: document.getElementById('welcome-screen'),
    browserView: document.getElementById('browser-view'),
    itemsGrid: document.getElementById('items-grid'),
    loading: document.getElementById('loading'),
    backBtn: document.getElementById('back-btn'),
    forwardBtn: document.getElementById('forward-btn'),
    upBtn: document.getElementById('up-btn'),
    homeBtn: document.getElementById('home-btn'),
    viewBtns: document.querySelectorAll('.view-btn'),
    fileModal: document.getElementById('file-modal'),
    settingsModal: document.getElementById('settings-modal'),
    downloadModal: document.getElementById('download-modal'),
    modalClose: document.getElementById('modal-close'),
    settingsClose: document.getElementById('settings-close'),
    settingsBtn: document.getElementById('settings-btn'),
    changeDownloadPath: document.getElementById('change-download-path'),
    currentDownloadPath: document.getElementById('current-download-path'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    quickCategories: document.getElementById('quick-categories'),
    favoritesView: document.getElementById('favorites-view'),
    downloadsView: document.getElementById('downloads-view'),
    historyView: document.getElementById('history-view'),
    favoritesGrid: document.getElementById('favorites-grid'),
    downloadsList: document.getElementById('downloads-list'),
    historyList: document.getElementById('history-list'),
    downloadCount: document.getElementById('download-count')
};

// Icons for file types
const fileIcons = {
    folder: '📁',
    video: '🎬',
    archive: '📦',
    subtitle: '📝',
    image: '🖼️',
    text: '📄',
    document: '📑',
    unknown: '📄'
};

// Video Player Modal
const videoModal = document.getElementById('video-modal');
const videoPlayer = document.getElementById('video-player');
const videoTitle = document.getElementById('video-title');
const videoClose = document.getElementById('video-close');
const videoDownload = document.getElementById('video-download');
const videoFullscreen = document.getElementById('video-fullscreen');

// Series Modal
const seriesModal = document.getElementById('series-modal');
const seriesTitle = document.getElementById('series-title');
const seriesBody = document.getElementById('series-body');
const seriesClose = document.getElementById('series-close');

let currentVideoUrl = '';
let currentVideoName = '';

// Video player event listeners
videoClose.addEventListener('click', () => {
    closeModal(videoModal);
    videoPlayer.pause();
    videoPlayer.src = '';
});

videoDownload.addEventListener('click', () => {
    if (currentVideoUrl && currentVideoName) {
        closeModal(videoModal);
        videoPlayer.pause();
        downloadFile(currentVideoUrl, currentVideoName, state.config.downloadPath);
    }
});

videoFullscreen.addEventListener('click', () => {
    if (videoPlayer.requestFullscreen) {
        videoPlayer.requestFullscreen();
    }
});

// Close video modal on overlay click
document.querySelector('#video-modal .modal-overlay').addEventListener('click', () => {
    closeModal(videoModal);
    videoPlayer.pause();
    videoPlayer.src = '';
});

// Series modal event listeners
seriesClose.addEventListener('click', () => {
    closeModal(seriesModal);
});

document.querySelector('#series-modal .modal-overlay').addEventListener('click', () => {
    closeModal(seriesModal);
});

// Open video player
window.openVideoPlayer = function(url, name) {
    currentVideoUrl = url;
    currentVideoName = name;
    videoTitle.textContent = name;
    videoPlayer.src = url;
    openModal(videoModal);
    videoPlayer.play().catch(e => {
        showNotification('Error', 'No se puede reproducir el video directamente. Descárgalo para verlo.', 'error');
    });
};

// Show series details
window.showSeriesDetails = async function(url, name) {
    seriesTitle.textContent = name;
    
    // Fetch series content
    const result = await window.api.fetchDirectory(url);
    
    if (result.success && result.items.length > 0) {
        // Group episodes by folder/season
        const seasons = {};
        
        for (const item of result.items) {
            if (item.isDirectory) {
                // This might be a season folder
                const seasonName = item.name;
                const subResult = await window.api.fetchDirectory(item.url);
                
                if (subResult.success && subResult.items.length > 0) {
                    const episodes = subResult.items.filter(i => !i.isDirectory && isVideoFile(i.name));
                    if (episodes.length > 0) {
                        seasons[seasonName] = episodes;
                    }
                }
            } else if (isVideoFile(item.name)) {
                // Single video
                if (!seasons['Principal']) {
                    seasons['Principal'] = [];
                }
                seasons['Principal'].push(item);
            }
        }
        
        // Render series content
        if (Object.keys(seasons).length > 0) {
            seriesBody.innerHTML = Object.entries(seasons).map(([season, episodes]) => `
                <div class="series-season">
                    <div class="series-season-title">${season}</div>
                    <div class="episode-list">
                        ${episodes.map((ep, idx) => `
                            <div class="episode-item">
                                <span class="episode-number">${idx + 1}</span>
                                <div class="episode-info">
                                    <div class="episode-title">${ep.name}</div>
                                    <div class="episode-meta">${ep.size || '--'}</div>
                                </div>
                                <div class="episode-actions">
                                    <button class="episode-btn" onclick="openVideoPlayer('${ep.url}', '${ep.name}')">▶️</button>
                                    <button class="episode-btn" onclick="downloadFileFromSeries('${ep.url}', '${ep.name}')">⬇️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            seriesBody.innerHTML = '<p class="empty-message">No se encontraron episodios</p>';
        }
    } else {
        seriesBody.innerHTML = '<p class="empty-message">No hay contenido en esta carpeta</p>';
    }
    
    openModal(seriesModal);
};

// Download from series modal
window.downloadFileFromSeries = function(url, name) {
    downloadFile(url, name, state.config.downloadPath);
};

// Initialize App
async function init() {
    loadConfig();
    await loadCategories();
    setupEventListeners();
    setupDownloadListeners();
    loadFavorites();
    loadDownloads();
    loadBrowsingHistory();
}

// Load Configuration
async function loadConfig() {
    state.config = await window.api.loadConfig();
    if (!state.config.downloadPath) {
        state.config.downloadPath = await window.api.selectDownloadDir() || 
            `${process.env.HOME || process.env.USERPROFILE}/Downloads/VisualesUCLV`;
    }
    elements.currentDownloadPath.textContent = state.config.downloadPath;
}

// Load Categories
async function loadCategories() {
    const categories = await window.api.getCategories();
    
    // Populate sidebar categories
    elements.categoryList.innerHTML = categories.map(cat => `
        <div class="category-item" data-category="${cat.id}" data-url="${cat.url}">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
        </div>
    `).join('');
    
    // Populate quick categories
    elements.quickCategories.innerHTML = categories.map(cat => `
        <div class="quick-category" data-category="${cat.id}" data-url="${cat.url}">
            <span class="quick-category-icon">${cat.icon}</span>
            <span class="quick-category-name">${cat.name}</span>
        </div>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Menu toggle
    elements.menuToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
    });
    
    // Sidebar overlay click to close
    document.addEventListener('click', (e) => {
        if (elements.sidebar.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            !elements.menuToggle.contains(e.target)) {
            elements.sidebar.classList.remove('open');
        }
    });
    
    // Category clicks
    document.querySelectorAll('[data-category]').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            const categoryId = item.dataset.category;
            navigateTo(url, categoryId);
        });
    });
    
    // Navigation
    elements.backBtn.addEventListener('click', goBack);
    elements.forwardBtn.addEventListener('click', goForward);
    elements.upBtn.addEventListener('click', goUp);
    elements.homeBtn.addEventListener('click', goHome);
    
    // View mode
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.viewMode = btn.dataset.view;
            elements.itemsGrid.classList.toggle('list-view', state.viewMode === 'list');
        });
    });
    
    // Search
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Modal close buttons
    elements.modalClose.addEventListener('click', () => closeModal(elements.fileModal));
    elements.settingsClose.addEventListener('click', () => closeModal(elements.settingsModal));
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeModal(overlay.parentElement);
        });
    });
    
    // Settings
    elements.settingsBtn.addEventListener('click', () => openModal(elements.settingsModal));
    elements.changeDownloadPath.addEventListener('click', async () => {
        const path = await window.api.selectDownloadDir();
        if (path) {
            state.config.downloadPath = path;
            elements.currentDownloadPath.textContent = path;
            window.api.saveConfig(state.config);
        }
    });
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
    
    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (state.currentPath) {
            navigateTo(state.currentPath, state.currentCategory);
        }
    });
}

// Setup Download Listeners
function setupDownloadListeners() {
    window.api.onDownloadProgress((data) => {
        elements.progressFill.style.width = `${data.percent}%`;
        elements.progressText.textContent = `${data.percent}% - ${formatBytes(data.bytesReceived)} / ${formatBytes(data.totalBytes)}`;
    });
    
    window.api.onDownloadComplete((data) => {
        state.downloads.push({
            name: data.fileName,
            path: data.path,
            date: new Date().toISOString(),
            status: 'completed'
        });
        saveDownloads();
        renderDownloads();
        updateDownloadCount();
        showNotification('Descarga completada', ` ${data.fileName}`);
    });
    
    window.api.onDownloadError((data) => {
        showNotification('Error en descarga', `No se pudo descargar ${data.fileName}`, 'error');
    });
}

// Navigation Functions
async function navigateTo(url, categoryId = null) {
    const fullUrl = `https://visuales.uclv.cu${url}`;
    
    // Hide welcome, show browser
    elements.welcomeScreen.classList.add('hidden');
    elements.favoritesView.classList.add('hidden');
    elements.downloadsView.classList.add('hidden');
    elements.historyView.classList.add('hidden');
    elements.browserView.classList.remove('hidden');
    
    // Update state
    state.currentPath = fullUrl;
    state.currentCategory = categoryId;
    
    // Add to history
    addToHistory(fullUrl);
    
    // Update active category
    document.querySelectorAll('.category-item').forEach(cat => {
        cat.classList.toggle('active', cat.dataset.category === categoryId);
    });
    
    // Show loading
    elements.loading.classList.remove('hidden');
    elements.itemsGrid.innerHTML = '';
    
    try {
        const result = await window.api.fetchDirectory(fullUrl);
        
        if (result.success) {
            renderItems(result.items);
            updateBreadcrumb(url);
        } else {
            elements.itemsGrid.innerHTML = `
                <div class="error-message">
                    <p>Error al cargar el contenido</p>
                    <p>${result.error}</p>
                </div>
            `;
        }
    } catch (error) {
        elements.itemsGrid.innerHTML = `
            <div class="error-message">
                <p>Error de conexión</p>
                <p>${error.message}</p>
            </div>
        `;
    }
    
    elements.loading.classList.add('hidden');
}

function renderItems(items) {
    if (items.length === 0) {
        elements.itemsGrid.innerHTML = `
            <div class="empty-message">
                <p>No hay contenido en esta carpeta</p>
            </div>
        `;
        return;
    }
    
    elements.itemsGrid.innerHTML = items.map(item => `
        <div class="item-card" data-url="${item.url}" data-name="${item.name}" data-type="${item.type}">
            <div class="item-thumbnail">
                ${fileIcons[item.type] || fileIcons.unknown}
                <span class="item-type-icon">${item.isDirectory ? '📂' : getFileExtensionIcon(item.name)}</span>
            </div>
            <div class="item-info">
                <div class="item-name" title="${item.name}">${item.name}</div>
                <div class="item-meta">
                    <span>${item.size || '--'}</span>
                    <span>${item.date || ''}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', () => handleItemClick(card));
        card.addEventListener('dblclick', () => handleItemDoubleClick(card));
    });
}

function handleItemClick(card) {
    const url = card.dataset.url;
    const name = card.dataset.name;
    const type = card.dataset.type;
    
    showFileDetails(url, name, type);
}

async function handleItemDoubleClick(card) {
    const url = card.dataset.url;
    const name = card.dataset.url;
    const type = card.dataset.type;
    
    if (type === 'folder') {
        navigateTo(card.dataset.url);
    } else {
        // Download or play video
        if (isVideoFile(name)) {
            // Could open in external player or embed
            window.api.openExternal(name);
        } else {
            downloadFile(name, name, state.config.downloadPath);
        }
    }
}

async function showFileDetails(url, name, type) {
    const result = await window.api.fetchDirectory(url);
    
    let content = '';
    let footer = '';
    
    if (type === 'folder' && result.success && result.items.length > 0) {
        // Check if this is a series (has video files inside)
        const videoFiles = result.items.filter(i => !i.isDirectory && isVideoFile(i.name));
        const subfolders = result.items.filter(i => i.isDirectory);
        
        // Check if folder looks like a series (contains episodes/seasons pattern)
        const isSeries = name.toLowerCase().includes('temporada') || 
                         name.toLowerCase().includes('season') ||
                         name.toLowerCase().includes('capitulo') ||
                         name.toLowerCase().includes('episode');
        
        if (isSeries || (videoFiles.length > 0 && subfolders.length === 0)) {
            // This is likely a series or contains episodes - show series modal
            footer = `
                <button class="btn btn-primary" onclick="showSeriesDetails('${url}', '${name}')">📺 Ver Episodes</button>
                <button class="btn btn-secondary" onclick="downloadFolderFromModal('${url}', '${name}')">⬇️ Descargar todo</button>
                <button class="btn btn-secondary" onclick="addToFavorites('${url}', '${name}', 'folder')">❤️ Favorito</button>
            `;
        } else {
            // Regular folder
            const totalFiles = result.items.filter(i => !i.isDirectory).length;
            const totalSize = result.items.reduce((acc, i) => {
                const size = parseFileSize(i.size);
                return acc + (isNaN(size) ? 0 : size);
            }, 0);
            
            content = `
                <div class="file-details">
                    <div class="file-preview">📁</div>
                    <div class="file-info-row">
                        <span class="file-info-label">Nombre</span>
                        <span class="file-info-value">${name}</span>
                    </div>
                    <div class="file-info-row">
                        <span class="file-info-label">Tipo</span>
                        <span class="file-info-value">Carpeta</span>
                    </div>
                    <div class="file-info-row">
                        <span class="file-info-label">Archivos</span>
                        <span class="file-info-value">${totalFiles}</span>
                    </div>
                    <div class="file-info-row">
                        <span class="file-info-label">Tamaño total</span>
                        <span class="file-info-value">${formatBytes(totalSize)}</span>
                    </div>
                </div>
            `;
            footer = `
                <button class="btn btn-primary" onclick="navigateToFromModal('${url}')">📂 Abrir</button>
                <button class="btn btn-secondary" onclick="downloadFolderFromModal('${url}', '${name}')">⬇️ Descargar todo</button>
                <button class="btn btn-secondary" onclick="addToFavorites('${url}', '${name}', 'folder')">❤️ Favorito</button>
            `;
        }
    } else if (type !== 'folder') {
        const fileSize = parseFileSize(result.items?.[0]?.size || '0');
        content = `
            <div class="file-details">
                <div class="file-preview">${fileIcons[type] || fileIcons.unknown}</div>
                <div class="file-info-row">
                    <span class="file-info-label">Nombre</span>
                    <span class="file-info-value">${name}</span>
                </div>
                <div class="file-info-row">
                    <span class="file-info-label">Tipo</span>
                    <span class="file-info-value">${getFileTypeDescription(name)}</span>
                </div>
                <div class="file-info-row">
                    <span class="file-info-label">Tamaño</span>
                    <span class="file-info-value">${formatBytes(fileSize)}</span>
                </div>
            </div>
        `;
        footer = `
            <button class="btn btn-primary" onclick="downloadFileFromModal('${url}', '${name}')">⬇️ Descargar</button>
            ${isVideoFile(name) ? `<button class="btn btn-secondary" onclick="openVideoPlayerDirect('${url}', '${name}')">▶️ Reproducir</button>` : ''}
            <button class="btn btn-secondary" onclick="addToFavorites('${url}', '${name}', '${type}')">❤️ Favorito</button>
        `;
    } else {
        content = `
            <div class="file-details">
                <div class="file-preview">${fileIcons.unknown}</div>
                <div class="file-info-row">
                    <span class="file-info-label">Nombre</span>
                    <span class="file-info-value">${name}</span>
                </div>
            </div>
        `;
        footer = `
            <button class="btn btn-secondary" onclick="addToFavorites('${url}', '${name}', '${type}')">❤️ Favorito</button>
        `;
    }
    
    document.getElementById('modal-title').textContent = name;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-footer').innerHTML = footer;
    
    openModal(elements.fileModal);
}

// Navigation Controls
function goBack() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const url = state.history[state.historyIndex];
        navigateTo(new URL(url).pathname);
        updateNavButtons();
    }
}

function goForward() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const url = state.history[state.historyIndex];
        navigateTo(new URL(url).pathname);
        updateNavButtons();
    }
}

function goUp() {
    if (state.currentPath) {
        const url = new URL(state.currentPath);
        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length > 1) {
            pathParts.pop();
            const newPath = '/' + pathParts.join('/') + '/';
            navigateTo(newPath);
        } else {
            goHome();
        }
    }
}

function goHome() {
    elements.welcomeScreen.classList.remove('hidden');
    elements.browserView.classList.add('hidden');
    elements.favoritesView.classList.add('hidden');
    elements.downloadsView.classList.add('hidden');
    elements.historyView.classList.add('hidden');
    state.currentPath = '';
    state.currentCategory = null;
    updateBreadcrumb('root');
    document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
}

function updateNavButtons() {
    elements.backBtn.disabled = state.historyIndex <= 0;
    elements.forwardBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function addToHistory(url) {
    // Remove forward history if we're branching
    state.history = state.history.slice(0, state.historyIndex + 1);
    
    // Don't add duplicates
    if (state.history[state.history.length - 1] !== url) {
        state.history.push(url);
        state.historyIndex = state.history.length - 1;
    }
    
    updateNavButtons();
}

function updateBreadcrumb(path) {
    const parts = path.split('/').filter(p => p);
    let html = '<span class="breadcrumb-item" data-path="root">Inicio</span>';
    
    let currentPath = '';
    parts.forEach((part, index) => {
        currentPath += '/' + part;
        html += `
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item" data-path="${currentPath}">${decodeURIComponent(part)}</span>
        `;
    });
    
    elements.breadcrumb.innerHTML = html;
    
    // Add click listeners
    elements.breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            if (path === 'root') {
                goHome();
            } else {
                navigateTo(path);
            }
        });
    });
}

// Search
async function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (!query) return;
    
    // Show loading
    elements.welcomeScreen.classList.add('hidden');
    elements.browserView.classList.remove('hidden');
    elements.loading.classList.remove('hidden');
    
    // Search in all categories (simple implementation)
    const categories = await window.api.getCategories();
    const results = [];
    
    for (const category of categories) {
        try {
            const result = await window.api.fetchDirectory(`https://visuales.uclv.cu${category.url}`);
            if (result.success) {
                const matchingItems = result.items.filter(item => 
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
                results.push(...matchingItems.map(item => ({
                    ...item,
                    category: category.name
                })));
            }
        } catch (e) {
            console.error(`Error searching in ${category.name}:`, e);
        }
    }
    
    if (results.length > 0) {
        elements.itemsGrid.innerHTML = results.map(item => `
            <div class="item-card" data-url="${item.url}" data-name="${item.name}" data-type="${item.type}">
                <div class="item-thumbnail">
                    ${fileIcons[item.type] || fileIcons.unknown}
                    <span class="item-type-icon">${item.isDirectory ? '📂' : getFileExtensionIcon(item.name)}</span>
                </div>
                <div class="item-info">
                    <div class="item-name" title="${item.name}">${item.name}</div>
                    <div class="item-meta">
                        <span>${item.category}</span>
                        <span>${item.size || '--'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => handleItemClick(card));
            card.addEventListener('dblclick', () => handleItemDoubleClick(card));
        });
    } else {
        elements.itemsGrid.innerHTML = `
            <div class="empty-message">
                <p>No se encontraron resultados para "${query}"</p>
            </div>
        `;
    }
    
    elements.loading.classList.add('hidden');
    updateBreadcrumb('/Buscar: ' + query);
}

// Downloads
async function downloadFile(url, fileName, savePath) {
    // Ensure download directory exists
    const fs = require('fs');
    if (!fs.existsSync(savePath)) {
        fs.mkdirSync(savePath, { recursive: true });
    }
    
    openModal(elements.downloadModal);
    document.getElementById('download-filename').textContent = fileName;
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = 'Iniciando...';
    
    await window.api.downloadFile(url, fileName, savePath);
}

function saveDownloads() {
    localStorage.setItem('visuales_downloads', JSON.stringify(state.downloads));
}

function loadDownloads() {
    const saved = localStorage.getItem('visuales_downloads');
    if (saved) {
        state.downloads = JSON.parse(saved);
        renderDownloads();
        updateDownloadCount();
    }
}

function renderDownloads() {
    if (state.downloads.length === 0) {
        elements.downloadsList.innerHTML = '<p class="empty-message">No hay descargas</p>';
        return;
    }
    
    elements.downloadsList.innerHTML = state.downloads.map((dl, index) => `
        <div class="download-item">
            <span class="download-icon">${dl.status === 'completed' ? '✅' : '⏳'}</span>
            <div class="download-details">
                <div class="download-name">${dl.name}</div>
                <div class="download-status">${new Date(dl.date).toLocaleString()}</div>
            </div>
            <div class="download-actions">
                <button class="btn btn-secondary" onclick="openFileLocation('${dl.path}')">📂</button>
                <button class="btn btn-danger" onclick="removeDownload(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function removeDownload(index) {
    state.downloads.splice(index, 1);
    saveDownloads();
    renderDownloads();
    updateDownloadCount();
}

function updateDownloadCount() {
    const activeCount = state.downloads.filter(d => d.status !== 'completed').length;
    elements.downloadCount.textContent = activeCount;
    elements.downloadCount.style.display = activeCount > 0 ? 'flex' : 'none';
}

// Favorites
function addToFavorites(url, name, type) {
    if (!state.favorites.some(f => f.url === url)) {
        state.favorites.push({ url, name, type, date: new Date().toISOString() });
        localStorage.setItem('visuales_favorites', JSON.stringify(state.favorites));
        renderFavorites();
        showNotification('Agregado a favoritos', name);
    }
    closeModal(elements.fileModal);
}

function loadFavorites() {
    const saved = localStorage.getItem('visuales_favorites');
    if (saved) {
        state.favorites = JSON.parse(saved);
        renderFavorites();
    }
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesGrid.innerHTML = '<p class="empty-message">No hay favoritos aún</p>';
        return;
    }
    
    elements.favoritesGrid.innerHTML = state.favorites.map(fav => `
        <div class="item-card" data-url="${fav.url}" data-name="${fav.name}" data-type="${fav.type}">
            <div class="item-thumbnail">
                ${fileIcons[fav.type] || fileIcons.unknown}
            </div>
            <div class="item-info">
                <div class="item-name" title="${fav.name}">${fav.name}</div>
                <div class="item-meta">
                    <span>${fav.type}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('#favorites-grid .item-card').forEach(card => {
        card.addEventListener('click', () => handleItemClick(card));
    });
}

// Browsing History
function loadBrowsingHistory() {
    const saved = localStorage.getItem('visuales_browsing_history');
    if (saved) {
        state.browsingHistory = JSON.parse(saved);
        renderHistory();
    }
}

function renderHistory() {
    if (state.browsingHistory.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-message">Sin historial</p>';
        return;
    }
    
    elements.historyList.innerHTML = state.browsingHistory.slice(0, 50).map(h => `
        <div class="download-item" onclick="navigateTo('${h.path}')">
            <span class="download-icon">📄</span>
            <div class="download-details">
                <div class="download-name">${h.name}</div>
                <div class="download-status">${new Date(h.date).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

// View Switching
function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    elements.welcomeScreen.classList.add('hidden');
    elements.browserView.classList.add('hidden');
    elements.favoritesView.classList.add('hidden');
    elements.downloadsView.classList.add('hidden');
    elements.historyView.classList.add('hidden');
    
    switch (view) {
        case 'favorites':
            elements.favoritesView.classList.remove('hidden');
            break;
        case 'downloads':
            elements.downloadsView.classList.remove('hidden');
            break;
        case 'history':
            elements.historyView.classList.remove('hidden');
            break;
    }
}

// Modal Functions
function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
}

// Utility Functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseFileSize(sizeString) {
    if (!sizeString) return 0;
    const match = sizeString.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    const units = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4 };
    const power = units[unit] || 0;
    
    return value * Math.pow(1024, power);
}

function getFileExtensionIcon(fileName) {
    const ext = require('path').extname(fileName).toLowerCase();
    const icons = {
        '.mp4': '▶️', '.mkv': '▶️', '.avi': '▶️', '.mov': '▶️',
        '.zip': '📦', '.rar': '📦', '.7z': '📦',
        '.srt': '📝', '.sub': '📝',
        '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️'
    };
    return icons[ext] || '';
}

function isVideoFile(fileName) {
    const ext = require('path').extname(fileName).toLowerCase();
    return ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m3u8'].includes(ext);
}

function getFileTypeDescription(fileName) {
    const ext = require('path').extname(fileName).toLowerCase();
    const types = {
        '.mp4': 'Video MP4',
        '.mkv': 'Video MKV',
        '.avi': 'Video AVI',
        '.mov': 'Video MOV',
        '.zip': 'Archivo ZIP',
        '.rar': 'Archivo RAR',
        '.srt': 'Subtítulos',
        '.pdf': 'Documento PDF',
        '.txt': 'Archivo de texto'
    };
    return types[ext] || 'Archivo';
}

function showNotification(title, body, type = 'success') {
    // Simple notification - could be enhanced with system notifications
    console.log(`[${type.toUpperCase()}] ${title}: ${body}`);
}

// Global functions for modal buttons
window.navigateToFromModal = function(url) {
    closeModal(elements.fileModal);
    navigateTo(new URL(url).pathname);
};

window.downloadFolderFromModal = function(url, name) {
    closeModal(elements.fileModal);
    downloadFolder(url, name);
};

window.downloadFileFromModal = function(url, name) {
    closeModal(elements.fileModal);
    downloadFile(url, name, state.config.downloadPath);
};

window.openVideoExternal = function(url) {
    closeModal(elements.fileModal);
    window.api.openExternal(url);
};

window.openFileLocation = function(path) {
    window.api.openFileLocation(path);
};

window.removeDownload = removeDownload;

// Download entire folder recursively
async function downloadFolder(url, name) {
    const result = await window.api.fetchDirectory(url);
    if (!result.success) return;
    
    const folderPath = `${state.config.downloadPath}/${name}`;
    const fs = require('fs');
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const files = result.items.filter(i => !i.isDirectory);
    
    for (const file of files) {
        await downloadFile(file.url, file.name, folderPath);
    }
    
    showNotification('Descarga completada', `Carpeta "${name}" descargada`);
}

// Open video player directly from modal
window.openVideoPlayerDirect = function(url, name) {
    closeModal(elements.fileModal);
    window.openVideoPlayer(url, name);
};

// Initialize
init();
