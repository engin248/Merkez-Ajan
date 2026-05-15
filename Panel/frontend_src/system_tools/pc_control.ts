// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — PC KONTROL (Saf Node.js / TypeScript)
// ══════════════════════════════════════════════════════════════

async function pcControl(komut: string, ekVeriler: any = {}) {
    try {
        const response = await fetch('/api/pc-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ komut, ...ekVeriler })
        });
        return await response.json();
    } catch (e: any) {
        return { basarili: false, hata: e.message };
    }
}

async function mouseClick(x: number, y: number, tur: string) {
    const komut = tur === 'cift' ? 'cift_tikla' : tur === 'sag' ? 'sag_tikla' : 'tikla';
    return await pcControl(komut, { x, y });
}

async function keyboardType(metin: string) {
    return await pcControl('yaz', { metin });
}

async function keyboardPress(tus: string) {
    return await pcControl('tus', { tus });
}

async function keyboardShortcut(tuslar: string) {
    const parts = tuslar.split('+').map(t => t.trim());
    return await pcControl('kisayol', { tuslar: parts });
}

async function mouseDrag(x1: number, y1: number, x2: number, y2: number) {
    return await pcControl('surukle', { x1, y1, x2, y2 });
}

async function windowList() {
    return await pcControl('pencereler');
}

async function windowFocus(baslik: string) {
    return await pcControl('pencere_odakla', { baslik });
}

async function clipboardRead() {
    return await pcControl('clipboard_oku');
}

async function clipboardWrite(metin: string) {
    return await pcControl('clipboard_yaz', { metin });
}

export {
    pcControl,
    mouseClick,
    keyboardType,
    keyboardPress,
    keyboardShortcut,
    mouseDrag,
    windowList,
    windowFocus,
    clipboardRead,
    clipboardWrite
};
