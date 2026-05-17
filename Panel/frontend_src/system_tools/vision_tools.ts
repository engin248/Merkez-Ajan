// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — GÖRÜNTÜ ANALİZİ ARAÇLARI
// ══════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';

function analyzeScreen(soru: string) {
    return new Promise((resolve) => {
        const baseDir = process.env.SCREENSHOT_DIR || process.env.TEMP || os.tmpdir();
        const tempFile = path.join(baseDir, '_screen_temp.png');
        const resizedFile = path.join(baseDir, '_screen_720.png');

        // 1. Screenshot al
        const captureCmd = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $screen = [System.Windows.Forms.Screen]::PrimaryScreen; $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size); $bmp.Save('${tempFile.replace(/\\/g, '\\\\')}'); $g.Dispose(); $bmp.Dispose()`;

        exec(`powershell -Command "${captureCmd}"`, { windowsHide: true, timeout: 10000 }, (err) => {
            if (err) return resolve({ basarili: false, hata: 'Screenshot alınamadı: ' + err.message });

            // 2. 720p'ye küçült
            const resizeCmd = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${tempFile.replace(/\\/g, '\\\\')}'); $w = 1280; $h = [int]($img.Height * ($w / $img.Width)); $bmp = New-Object System.Drawing.Bitmap($w, $h); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($img, 0, 0, $w, $h); $bmp.Save('${resizedFile.replace(/\\/g, '\\\\')}'); $g.Dispose(); $bmp.Dispose(); $img.Dispose()`;

            exec(`powershell -Command "${resizeCmd}"`, { windowsHide: true, timeout: 10000 }, async (err2) => {
                if (err2) return resolve({ basarili: false, hata: '720p resize hatası: ' + err2.message });

                // 3. Base64'e çevir
                let imageBase64;
                try {
                    const buffer = await fs.promises.readFile(resizedFile);
                    imageBase64 = buffer.toString('base64');
                } catch (e: any) {
                    return resolve({ basarili: false, hata: 'Base64 dönüşüm hatası: ' + e.message });
                }

                // 4. minicpm-v vision modeline gönder
                const prompt = soru || 'Bu ekran görüntüsünde ne görüyorsun? Açık olan programları, pencereleri, hataları ve önemli bilgileri detaylı açıkla. Türkçe yanıt ver.';
                const visionPayload = JSON.stringify({
                    model: 'minicpm-v',
                    messages: [{
                        role: 'user',
                        content: prompt,
                        images: [imageBase64]
                    }],
                    stream: false,
                    options: { temperature: 0.3, num_predict: 500 }
                });

                console.log(`[VISION] Ekran analizi başlatıldı (720p, minicpm-v)...`);
                const startTime = Date.now();

                const visionReq = http.request({
                    hostname: 'localhost', port: 11434, path: '/api/chat', method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(visionPayload) },
                    timeout: 60000
                }, (visionRes) => {
                    let data = '';
                    visionRes.on('data', chunk => { data += chunk.toString(); });
                    visionRes.on('end', () => {
                        // Temp dosyaları temizle (ASENKRON)
                        fs.promises.unlink(tempFile).catch(() => {});
                        fs.promises.unlink(resizedFile).catch(() => {});

                        try {
                            const result = JSON.parse(data);
                            const analiz = result.message?.content || 'Analiz sonucu alınamadı.';
                            const sure = Date.now() - startTime;
                            console.log(`[VISION] Analiz tamamlandı (${sure}ms)`);
                            resolve({
                                basarili: true,
                                analiz: analiz,
                                sure_ms: sure,
                                model: 'minicpm-v',
                                cozunurluk: '1280x720'
                            });
                        } catch(e: any) {
                            resolve({ basarili: false, hata: 'Vision model yanıt ayrıştırma hatası: ' + e.message });
                        }
                    });
                });
                visionReq.on('error', (e) => resolve({ basarili: false, hata: 'Vision model bağlantı hatası: ' + e.message }));
                visionReq.on('timeout', () => { visionReq.destroy(); resolve({ basarili: false, hata: 'Vision model zaman aşımı (60sn)' }); });
                visionReq.write(visionPayload);
                visionReq.end();
            });
        });
    });
}

export { analyzeScreen };
