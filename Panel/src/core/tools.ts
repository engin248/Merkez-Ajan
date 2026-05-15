const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * ══════════════════════════════════════════════════════════════
 *  TOOL ENGINE v2 — AI'ın Gerçek Araçları (TypeScript)
 *  Her araç: tanım (Ollama'ya gönderilir) + executor (server çalıştırır)
 * ══════════════════════════════════════════════════════════════
 */

// ─── GÜVENLİK: Tehlikeli komut filtresi ───
const BLOCKED_PATTERNS: RegExp[] = [
    /rm\s+-rf/i, /del\s+\/[sfq]/i, /format\s+[a-z]:/i,
    /remove-item.*-recurse.*-force/i, /shutdown/i, /restart-computer/i,
    /stop-process.*-force/i, /clear-content/i, /set-executionpolicy/i,
    /new-psdrive/i, /reg\s+delete/i, /reg\s+add/i, /net\s+user/i,
    /net\s+localgroup/i, /icacls/i, /takeown/i, /cipher\s+\/w/i
];

function isCommandSafe(cmd: string): boolean {
    return !BLOCKED_PATTERNS.some(p => p.test(cmd));
}

export interface ToolResult {
    success: boolean;
    output?: string;
    error?: string;
}

// ─── ARAÇ TANIMLARI (Ollama tools formatı) ───
export const TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'pc_komutu_calistir',
            description: 'Windows PowerShell komutu calistirir ve sonucunu doner. Dosya listeleme, sistem bilgisi, surecler, ag bilgileri gibi islemler icin kullan. Kullanici adi Esisya dir.',
            parameters: {
                type: 'object',
                properties: {
                    komut: { type: 'string', description: 'Calistirilacak PowerShell komutu. Ornek: Get-ChildItem C:\\Users\\Esisya\\Desktop, Get-Process, ipconfig, nvidia-smi' }
                },
                required: ['komut']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'dosya_oku',
            description: 'Belirtilen dosyanin icerigini okur ve doner.',
            parameters: {
                type: 'object',
                properties: {
                    yol: { type: 'string', description: 'Okunacak dosyanin tam yolu. Ornek: C:\\Users\\Esisya\\Desktop\\rapor.txt' }
                },
                required: ['yol']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'dosya_yaz',
            description: 'Belirtilen yola dosya yazar veya olusturur.',
            parameters: {
                type: 'object',
                properties: {
                    yol: { type: 'string', description: 'Yazilacak dosyanin tam yolu' },
                    icerik: { type: 'string', description: 'Dosyaya yazilacak icerik' }
                },
                required: ['yol', 'icerik']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'url_ac',
            description: 'Varsayilan tarayicida herhangi bir web sitesini acar. Her turlu URL acabilir. Arama formatlari: Google icin https://www.google.com/search?q=aranacak+kelime, YouTube icin https://www.youtube.com/results?search_query=sarki+adi, Trendyol icin https://www.trendyol.com/sr?q=urun+adi seklinde kullan.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Acilacak web adresi. Ornekler: https://www.google.com/search?q=istanbul+transfer, https://www.youtube.com/results?search_query=central+cee' },
                    baslik: { type: 'string', description: 'Opsiyonel. Arama sorgusu metni. Ornek: central cee, istanbul transfer' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'uygulama_ac',
            description: 'Windows uygulamasi baslatir.',
            parameters: {
                type: 'object',
                properties: {
                    uygulama: { type: 'string', description: 'Baslatilacak uygulama adi. Ornek: notepad, calc, chrome, explorer' }
                },
                required: ['uygulama']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'sistem_bilgisi',
            description: 'Bilgisayarin CPU, RAM, disk, GPU ve ag durumunu doner. GPU icin kategori gpu kullan.',
            parameters: {
                type: 'object',
                properties: {
                    kategori: { type: 'string', description: 'Hangi bilgi isteniyor: cpu, ram, disk, gpu, ag, hepsi', enum: ['cpu', 'ram', 'disk', 'gpu', 'ag', 'hepsi'] }
                },
                required: ['kategori']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'web_ara',
            description: 'Internette arama yapar ve sonuclari doner. Bilmedigin bir konu soruldugunda, fiyat, haber, guncel bilgi istendiginde MUTLAKA bu araci kullan. Bilgiyi UYDURMA.',
            parameters: {
                type: 'object',
                properties: {
                    sorgu: { type: 'string', description: 'Aranacak metin. Ornek: Istanbul hava durumu, RTX 5080 fiyat, son dakika haberleri' }
                },
                required: ['sorgu']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'ekran_goruntusu',
            description: 'Ekranin goruntusu alir ve kaydeder. Ekranda ne var, ekrana bak gibi isteklerde kullan.',
            parameters: {
                type: 'object',
                properties: {
                    dosya_adi: { type: 'string', description: 'Kaydedilecek dosya adi. Varsayilan: screenshot.png' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'aktif_pencereler',
            description: 'Acik olan tum pencereleri ve programlari listeler.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'web_sayfa_oku',
            description: 'Verilen URL adresine girer ve sayfadaki icerigi okur. Urun detayi, fiyat, aciklama gibi bilgileri cekmek icin kullan. web_ara ile bulunan bir linkin icine girmek istediginde bu araci kullan.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Okunacak web sayfasinin tam URL adresi. Ornek: https://www.trendyol.com/sr?q=tayt' }
                },
                required: ['url']
            }
        }
    }
];

// ─── ARAÇ ÇALIŞTIRICILAR ───

function runPowerShell(cmd: string, timeoutMs: number = 15000): Promise<ToolResult> {
    return new Promise((resolve) => {
        if (!isCommandSafe(cmd)) {
            return resolve({ success: false, error: 'Guvenlik filtresi: Bu komut engellendi.' });
        }
        exec('powershell -NoProfile -Command "' + cmd.replace(/"/g, '\\"') + '"',
            { timeout: timeoutMs, maxBuffer: 1024 * 512, encoding: 'utf8' },
            (err, stdout, stderr) => {
                if (err) return resolve({ success: false, error: err.message.substring(0, 500) });
                resolve({ success: true, output: (stdout || stderr || '').substring(0, 3000) });
            }
        );
    });
}

const EXECUTORS: Record<string, (args: any) => Promise<ToolResult>> = {
    pc_komutu_calistir: async (args) => {
        const komut = args.komut;
        if (!komut) return { success: false, error: 'Komut belirtilmedi' };
        console.log(`[TOOL] PowerShell: ${komut}`);
        const result = await runPowerShell(komut);
        console.log(`[TOOL] Sonuc: ${result.success ? 'OK' : 'HATA'}`);
        return result;
    },

    dosya_oku: async (args) => {
        try {
            const content = await fs.promises.readFile(args.yol, 'utf8');
            console.log(`[TOOL] Dosya okundu: ${args.yol}`);
            return { success: true, output: content.substring(0, 3000) };
        } catch (e: any) {
            return { success: false, error: `Dosya okunamadi: ${e.message}` };
        }
    },

    dosya_yaz: async (args) => {
        try {
            const hedefYol = args.yol;
            if (/^C:\\Windows/i.test(hedefYol)) {
                return { success: false, error: 'Guvenlik ihlali: Windows sistem klasorune dosya yazilamaz.' };
            }
            const dir = path.dirname(hedefYol);
            if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(hedefYol, args.icerik, 'utf8');
            console.log(`[TOOL] Dosya yazildi: ${hedefYol}`);
            return { success: true, output: `Dosya basariyla yazildi: ${hedefYol}` };
        } catch (e: any) {
            return { success: false, error: `Dosya yazilamadi: ${e.message}` };
        }
    },

    url_ac: async (args) => {
        let url = args.url;
        if (!url.startsWith('http')) url = 'https://' + url;
        
        const ytWatchMatch = url.match(/youtube\.com\/watch\?v=/);
        if (ytWatchMatch) {
            const searchQuery = args.baslik || args.sorgu || '';
            if (searchQuery) {
                url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(searchQuery);
            } else {
                return { success: false, error: 'YouTube video ID dogrulanamadi. Lutfen url_ac aracini YouTube arama linki ile kullan' };
            }
        }
        
        console.log(`[TOOL] URL aciliyor: ${url}`);
        exec(`start "" "${url}"`);
        return { success: true, output: `${url} tarayicida acildi.` };
    },

    uygulama_ac: async (args) => {
        const app = args.uygulama;
        console.log(`[TOOL] Uygulama baslatiliyor: ${app}`);
        return new Promise((resolve) => {
            exec(`start "" ${app}`, (err, stdout, stderr) => {
                if (err || stderr) {
                    resolve({ success: false, error: `Uygulama acilamadi: ${err ? err.message : stderr}` });
                } else {
                    resolve({ success: true, output: `${app} uygulamasi baslatildi.` });
                }
            });
        });
    },

    sistem_bilgisi: async (args) => {
        const kat = args.kategori || 'hepsi';
        const info: any = {};

        if (kat === 'cpu' || kat === 'hepsi') {
            const cpus = os.cpus();
            info.cpu = `${cpus[0].model} | ${cpus.length} cekirdek | ${cpus[0].speed} MHz`;
        }
        if (kat === 'ram' || kat === 'hepsi') {
            const total = (os.totalmem() / (1024*1024*1024)).toFixed(1);
            const free = (os.freemem() / (1024*1024*1024)).toFixed(1);
            const used = (Number(total) - Number(free)).toFixed(1);
            info.ram = `Toplam: ${total} GB | Kullanilan: ${used} GB | Bos: ${free} GB`;
        }
        if (kat === 'disk' || kat === 'hepsi') {
            const diskResult = await runPowerShell("Get-PSDrive -PSProvider FileSystem | Select Name,@{N='UsedGB';E={[math]::Round($_.Used/1GB,1)}},@{N='FreeGB';E={[math]::Round($_.Free/1GB,1)}} | ConvertTo-Json");
            info.disk = diskResult.success ? diskResult.output : 'Disk bilgisi alinamadi';
        }
        if (kat === 'gpu' || kat === 'hepsi') {
            const nvidiaResult = await runPowerShell("nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu --format=csv,noheader,nounits");
            if (nvidiaResult.success && nvidiaResult.output && nvidiaResult.output.trim()) {
                const parts = nvidiaResult.output.trim().split(',').map(s => s.trim());
                info.gpu = `Model: ${parts[0]} | VRAM Toplam: ${parts[1]} MB | Kullanilan: ${parts[2]} MB | Bos: ${parts[3]} MB | Sicaklik: ${parts[4]}C | Kullanim: ${parts[5]}%`;
            } else {
                const wmiResult = await runPowerShell("Get-CimInstance Win32_VideoController | Select Name,AdapterRAM,DriverVersion | ConvertTo-Json");
                info.gpu = wmiResult.success ? wmiResult.output : 'GPU bilgisi alinamadi';
            }
        }
        if (kat === 'ag' || kat === 'hepsi') {
            const agResult = await runPowerShell("Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne '127.0.0.1'} | Select IPAddress,InterfaceAlias | ConvertTo-Json");
            info.ag = agResult.success ? agResult.output : 'Ag bilgisi alinamadi';
        }

        return { success: true, output: JSON.stringify(info, null, 2) };
    },

    web_ara: async (args) => {
        const sorgu = args.sorgu;
        if (!sorgu) return { success: false, error: 'Arama sorgusu belirtilmedi' };
        console.log(`[TOOL] Web arama (Puppeteer): ${sorgu}`);

        let browser: any = null;
        try {
            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());
            
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
            
            const searchUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(sorgu) + '&kl=tr-tr';
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            
            const results = await page.evaluate(() => {
                const items: any[] = [];
                const seenDomains = new Set();
                const blocks = document.querySelectorAll('article[data-testid="result"], li[data-layout="organic"]');
                blocks.forEach((block: any) => {
                    if (items.length >= 8) return;
                    const linkEl = block.querySelector('a[href^="http"]');
                    const titleEl = block.querySelector('h2, [data-testid="result-title-a"]');
                    const snippetEl = block.querySelector('[data-result="snippet"], span.kY2IgmnCmOGjharHErah');
                    const url = linkEl ? linkEl.href : '';
                    const title = titleEl ? titleEl.textContent.trim() : '';
                    const snippet = snippetEl ? snippetEl.textContent.trim() : '';
                    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
                    if (title && url && !seenDomains.has(domain)) {
                        seenDomains.add(domain);
                        items.push({ title, url, snippet: snippet.substring(0, 200) });
                    }
                });
                const bodyText = document.body.innerText;
                const fiyatMatch = bodyText.match(/(\d[\d.,]*\s*(?:TL|₺|USD|\$|EUR|€))/gi);
                const fiyatlar = fiyatMatch ? [...new Set(fiyatMatch)].slice(0, 8) : [];
                return { items, fiyatlar };
            });

            await browser.close();
            browser = null;

            let output: string[] = [];
            if (results.fiyatlar.length > 0) output.push(`FIYATLAR: ${results.fiyatlar.join(' | ')}`);
            results.items.forEach((item: any, i: number) => {
                output.push(item.snippet
                    ? `${i+1}. ${item.title} (${item.url}): ${item.snippet}`
                    : `${i+1}. ${item.title} (${item.url})`);
            });

            if (output.length === 0) {
                return { success: true, output: 'Arama sonucu bulunamadi.' };
            }
            return { success: true, output: output.join('\n').substring(0, 3000) };
        } catch (e: any) {
            if (browser) { try { await browser.close(); } catch(x) {} }
            exec(`start "" "https://www.google.com/search?q=${encodeURIComponent(sorgu)}"`);
            return { success: true, output: `Arama tarayicida acildi: "${sorgu}".` };
        }
    },

    ekran_goruntusu: async (args) => {
        let fileName = (args && args.dosya_adi) ? path.basename(args.dosya_adi) : 'screenshot.png';
        if (!fileName.endsWith('.png') && !fileName.endsWith('.jpg')) fileName += '.png';
        const savePath = path.join(os.tmpdir(), fileName);
        
        const psCmd = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $b = New-Object System.Drawing.Bitmap($s.Width, $s.Height); $g = [System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen($s.Location, [System.Drawing.Point]::Empty, $s.Size); $b.Save("${savePath.replace(/\\/g, '\\\\')}"); $g.Dispose(); $b.Dispose(); Write-Output "Ekran goruntusu kaydedildi: ${savePath.replace(/\\/g, '\\\\')}, Cozunurluk: $($s.Width)x$($s.Height)"`;

        const result = await runPowerShell(psCmd, 10000);
        if (result.success) {
            return { success: true, output: result.output || `Ekran goruntusu alindi: ${savePath}` };
        }
        return { success: false, error: `Ekran goruntusu alinamadi: ${result.error || ''}` };
    },

    aktif_pencereler: async () => {
        const result = await runPowerShell("Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select ProcessName,MainWindowTitle,@{N='MemMB';E={[math]::Round($_.WS/1MB,1)}} | Sort MemMB -Descending | ConvertTo-Json");
        if (result.success) return { success: true, output: result.output };
        return { success: false, error: 'Pencere listesi alinamadi' };
    },

    web_sayfa_oku: async (args) => {
        let pageUrl = args.url;
        if (!pageUrl) return { success: false, error: 'URL belirtilmedi' };
        if (!pageUrl.startsWith('http')) pageUrl = 'https://' + pageUrl;

        let browser: any = null;
        try {
            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());

            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 25000 });
            await new Promise(r => setTimeout(r, 2000));

            const pageData = await page.evaluate(() => {
                const data: any = {};
                data.title = document.title || '';
                data.url = window.location.href;
                const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
                if (metaDesc) data.description = metaDesc.content;
                
                const contentSelectors = ['.product-description', '.product-detail', '.detail-attr-container', '[data-testid="product-description"]', '.product-feature-list', 'article', 'main', '.content'];
                for (const sel of contentSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent && el.textContent.trim().length > 20) {
                        data.content = el.textContent.trim().substring(0, 1500);
                        break;
                    }
                }
                if (!data.content) data.bodyText = document.body.innerText.substring(0, 2000);
                return data;
            });

            await browser.close();
            browser = null;

            let output: string[] = [];
            if (pageData.title) output.push(`Sayfa: ${pageData.title}`);
            if (pageData.content) output.push(`Icerik: ${pageData.content}`);
            else if (pageData.bodyText) output.push(`Sayfa Icerigi: ${pageData.bodyText}`);

            const result = output.join('\n').substring(0, 3000);
            return { success: true, output: result || 'Sayfa yuklendi ama icerik cekilemedi.' };
        } catch (e: any) {
            if (browser) { try { await browser.close(); } catch(x) {} }
            return { success: false, error: `Sayfa okunamadi: ${e.message}` };
        }
    }
};

export async function executeTool(name: string, args: any): Promise<ToolResult> {
    const executor = EXECUTORS[name];
    if (!executor) return { success: false, error: `Bilinmeyen arac: ${name}` };
    try {
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        return await executor(parsedArgs);
    } catch (e: any) {
        return { success: false, error: `Arac hatasi: ${e.message}` };
    }
}
