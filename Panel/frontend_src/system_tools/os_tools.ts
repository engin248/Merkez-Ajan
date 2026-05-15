// @ts-nocheck
// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — OS ARAÇLARI (Sistem Bilgisi, İşlemler)
// ══════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import * as path from 'path';

function executeCommand(komut, cwd) {
    return new Promise((resolve) => {
        const opts = { encoding: 'utf-8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 };
        if (cwd) opts.cwd = cwd;
        exec(`powershell -Command "${komut.replace(/"/g, '\\"')}"`, opts, (err, stdout, stderr) => {
            if (err) resolve({ basarili: false, hata: err.message, stderr: stderr?.trim() });
            else resolve({ basarili: true, cikti: stdout.trim(), stderr: stderr?.trim() || undefined });
        });
    });
}

function listProcesses(filtre) {
    return new Promise((resolve) => {
        const cmd = filtre
            ? `Get-Process | Where-Object { $_.ProcessName -like '*${filtre}*' } | Select-Object ProcessName, Id, CPU, @{N='RAM_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json`
            : `Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 ProcessName, Id, CPU, @{N='RAM_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json`;
        exec(`powershell -Command "${cmd}"`, { encoding: 'utf-8', windowsHide: true, timeout: 10000 }, (err, stdout) => {
            if (err) resolve({ basarili: false, hata: err.message });
            else {
                try { resolve({ basarili: true, processler: JSON.parse(stdout) }); }
                catch { resolve({ basarili: true, cikti: stdout.trim() }); }
            }
        });
    });
}

function getSystemInfo() {
    return new Promise((resolve) => {
        const cmd = `$os = Get-CimInstance Win32_OperatingSystem; $cpu = Get-CimInstance Win32_Processor; $gpu = Get-CimInstance Win32_VideoController; @{CPU=$cpu.Name; RAM_GB=[math]::Round($os.TotalVisibleMemorySize/1MB,1); RAM_Kullanilan_GB=[math]::Round(($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB,1); GPU=$gpu.Name; OS=$os.Caption; PC=$env:COMPUTERNAME; Kullanici=$env:USERNAME; Disk=((Get-PSDrive C).Used/1GB).ToString('F0')+'GB / '+((Get-PSDrive C).Used/1GB + (Get-PSDrive C).Free/1GB).ToString('F0')+'GB'} | ConvertTo-Json`;
        exec(`powershell -Command "${cmd}"`, { encoding: 'utf-8', windowsHide: true, timeout: 10000 }, (err, stdout) => {
            if (err) resolve({ basarili: false, hata: err.message });
            else {
                try { resolve({ basarili: true, sistem: JSON.parse(stdout) }); }
                catch { resolve({ basarili: true, cikti: stdout.trim() }); }
            }
        });
    });
}

function takeScreenshot(dosyaAdi) {
    return new Promise((resolve) => {
        const fileName = dosyaAdi || `screenshot_${Date.now()}.png`;
        const filePath = path.join('C:\\Users\\Esisya\\Desktop', fileName);
        const cmd = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bmp = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bmp.Save('${filePath.replace(/'/g, "''")}'); $g.Dispose(); $bmp.Dispose() }`;
        exec(`powershell -Command "${cmd}"`, { windowsHide: true, timeout: 10000 }, (err) => {
            if (err) resolve({ basarili: false, hata: err.message });
            else resolve({ basarili: true, mesaj: 'Ekran görüntüsü alındı', dosya: filePath });
        });
    });
}

function openProgram(program, arguman) {
    return new Promise((resolve) => {
        // Bilinen program yolları (Windows)
        const PROGRAM_MAP = {
            'chrome': 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'google chrome': 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'firefox': 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
            'edge': 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'notepad': 'notepad.exe',
            'notepad++': 'C:\\Program Files\\Notepad++\\notepad++.exe',
            'code': 'code',
            'vscode': 'code',
            'excel': 'excel',
            'word': 'winword',
            'powerpoint': 'powerpnt',
            'explorer': 'explorer.exe',
            'cmd': 'cmd.exe',
            'powershell': 'powershell.exe',
            'terminal': 'wt.exe',
            'calculator': 'calc.exe',
            'hesap makinesi': 'calc.exe',
            'paint': 'mspaint.exe',
            'spotify': `${process.env.APPDATA}\\Spotify\\Spotify.exe`,
            'discord': `${process.env.LOCALAPPDATA}\\Discord\\Update.exe`,
            'telegram': `${process.env.APPDATA}\\Telegram Desktop\\Telegram.exe`,
        };

        const programLower = program.toLowerCase().trim();
        const resolvedProgram = PROGRAM_MAP[programLower] || program;

        // URL algılama — argüman URL ise veya program URL ise
        const isUrl = (s) => /^https?:\/\//i.test(s);

        if (isUrl(programLower)) {
            // Doğrudan URL girildiyse
            exec(`start "" "${programLower}"`, { shell: true, windowsHide: true }, (err) => {
                if (err) resolve({ basarili: false, hata: err.message });
                else resolve({ basarili: true, mesaj: `URL açıldı: ${programLower}` });
            });
            return;
        }

        // Komutu oluştur
        let cmd;
        if (arguman && isUrl(arguman)) {
            // Program + URL argümanı (örn: chrome https://youtube.com)
            cmd = `start "" "${resolvedProgram}" "${arguman}"`;
        } else if (arguman) {
            cmd = `start "" "${resolvedProgram}" "${arguman}"`;
        } else {
            cmd = `start "" "${resolvedProgram}"`;
        }

        exec(cmd, { shell: true, windowsHide: true }, (err) => {
            if (err) {
                // Fallback: 'start' ile direkt dene
                exec(`start ${program} ${arguman || ''}`, { shell: true, windowsHide: true }, (err2) => {
                    if (err2) resolve({ basarili: false, hata: `Program bulunamadı: ${program}. Hata: ${err2.message}` });
                    else resolve({ basarili: true, mesaj: `${program} açıldı.` });
                });
            } else {
                resolve({ basarili: true, mesaj: `${program}${arguman ? ' (' + arguman + ')' : ''} açıldı.` });
            }
        });
    });
}

export {
    executeCommand,
    listProcesses,
    getSystemInfo,
    takeScreenshot,
    openProgram
};

export {};
