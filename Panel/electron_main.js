const { app, BrowserWindow, globalShortcut, shell, session } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Sunucuyu başlat (CommonJS require handles .ts via ts-node/register)
    require('./src/server.ts');

    setTimeout(() => {
        if (mainWindow) {
            mainWindow.loadURL('http://localhost:8085');
            mainWindow.webContents.openDevTools();
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

app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return true;
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
