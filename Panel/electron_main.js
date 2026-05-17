const { app, BrowserWindow, globalShortcut, shell, session, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const IS_DEV = !app.isPackaged;

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Sunucuyu başlat (CommonJS require handles .ts via ts-node/register)
    require('./src/server.ts');

    setTimeout(() => {
        if (mainWindow) {
            mainWindow.loadURL('http://localhost:8085');
            // DevTools sadece geliştirme modunda açılır
            if (IS_DEV) {
                mainWindow.webContents.openDevTools();
            }
        }
    }, 1500);

    mainWindow.webContents.setWindowOpenHandler((details) => {
        if (details.url.startsWith('http') && !details.url.includes('localhost:8085')) {
            shell.openExternal(details.url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('http') && !url.includes('localhost:8085')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow) mainWindow.webContents.toggleDevTools();
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[BROWSER CONSOLE] ${message} (line: ${line}, source: ${sourceId})`);
    });
}

// IPC Handlers — preload köprüsünden gelen istekler
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

app.whenReady().then(() => {
    // Güvenlik: Sadece bilinen izinleri kabul et
    const ALLOWED_PERMISSIONS = [
        'microphone',        // Sesli komut için
        'camera',            // Ekran analizi için (gelecek)
        'midi',              // Ses sistemi
        'mediaKeySystem',    // Medya kontrolleri
        'clipboard-read',    // Pano okuma
        'clipboard-write',   // Pano yazma
        'notifications',     // Bildirimler
        'media',             // Medya oynatma
    ];

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const isAllowed = ALLOWED_PERMISSIONS.includes(permission);
        if (!isAllowed) {
            console.log(`[GÜVENLİK] İzin reddedildi: ${permission}`);
        }
        callback(isAllowed);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return ALLOWED_PERMISSIONS.includes(permission);
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
