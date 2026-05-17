// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — DOSYA SİSTEMİ ARAÇLARI
// ══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

function readFile(yol) {
    try {
        if (!fs.existsSync(yol)) return { basarili: false, hata: 'Dosya bulunamadı: ' + yol };
        const stat = fs.statSync(yol);
        if (stat.size > 500000) return { basarili: false, hata: 'Dosya çok büyük: ' + (stat.size / 1024).toFixed(0) + ' KB' };
        const icerik = fs.readFileSync(yol, 'utf-8');
        return { basarili: true, icerik, boyut: stat.size };
    } catch (e: any) { return { basarili: false, hata: e.message }; }
}

function writeFile(yol, icerik) {
    try {
        const dir = path.dirname(yol);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(yol, icerik, 'utf-8');
        return { basarili: true, mesaj: 'Dosya yazıldı: ' + yol };
    } catch (e: any) { return { basarili: false, hata: e.message }; }
}

function listDirectory(yol) {
    try {
        if (!fs.existsSync(yol)) return { basarili: false, hata: 'Klasör bulunamadı: ' + yol };
        const items = fs.readdirSync(yol, { withFileTypes: true });
        const result = items.map(item => ({
            isim: item.name,
            tip: item.isDirectory() ? 'klasor' : 'dosya',
            boyut: item.isDirectory() ? undefined : (() => { try { return fs.statSync(path.join(yol, item.name)).size; } catch { return 0; } })()
        }));
        return { basarili: true, yol, dosya_sayisi: result.filter(i => i.tip === 'dosya').length, klasor_sayisi: result.filter(i => i.tip === 'klasor').length, icerik: result };
    } catch (e: any) { return { basarili: false, hata: e.message }; }
}

export {
    readFile,
    writeFile,
    listDirectory
};

export {};
