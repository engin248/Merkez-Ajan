// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — PRELOAD (IPC Güvenlik Köprüsü)
// ══════════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('askerMotoru', {
    // Pencere Kontrolleri
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),

    // Ses Toggle (Global Hotkey'den gelir)
    onToggleVoice: (callback) => ipcRenderer.on('toggle-voice', callback),

    // Platform bilgisi
    platform: process.platform,
    isElectron: true
});
