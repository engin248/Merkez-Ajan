import { mouse, Point, keyboard, Key, Button } from '@nut-tree-fork/nut-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Harf/tus eslestirme yardimcisi
const keyMap: { [key: string]: Key } = {
    'enter': Key.Enter,
    'space': Key.Space,
    'esc': Key.Escape,
    'escape': Key.Escape,
    'tab': Key.Tab,
    'shift': Key.LeftShift,
    'ctrl': Key.LeftControl,
    'alt': Key.LeftAlt,
    'win': Key.LeftSuper,
    'up': Key.Up,
    'down': Key.Down,
    'left': Key.Left,
    'right': Key.Right,
    'backspace': Key.Backspace,
    'delete': Key.Delete,
    'f1': Key.F1, 'f2': Key.F2, 'f3': Key.F3, 'f4': Key.F4, 'f5': Key.F5, 'f6': Key.F6,
    'f7': Key.F7, 'f8': Key.F8, 'f9': Key.F9, 'f10': Key.F10, 'f11': Key.F11, 'f12': Key.F12,
    'a': Key.A, 'b': Key.B, 'c': Key.C, 'd': Key.D, 'e': Key.E, 'f': Key.F, 'g': Key.G, 'h': Key.H,
    'i': Key.I, 'j': Key.J, 'k': Key.K, 'l': Key.L, 'm': Key.M, 'n': Key.N, 'o': Key.O, 'p': Key.P,
    'q': Key.Q, 'r': Key.R, 's': Key.S, 't': Key.T, 'u': Key.U, 'v': Key.V, 'w': Key.W, 'x': Key.X,
    'y': Key.Y, 'z': Key.Z,
    '0': Key.Num0, '1': Key.Num1, '2': Key.Num2, '3': Key.Num3, '4': Key.Num4, 
    '5': Key.Num5, '6': Key.Num6, '7': Key.Num7, '8': Key.Num8, '9': Key.Num9
};

export async function handlePcControl(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const komut = data.komut;

            if (komut === 'tikla' || komut === 'cift_tikla' || komut === 'sag_tikla') {
                const { x, y } = data;
                if (x !== undefined && y !== undefined) await mouse.setPosition(new Point(x, y));
                
                if (komut === 'tikla') {
                    const btn = data.buton === 'right' ? Button.RIGHT : data.buton === 'middle' ? Button.MIDDLE : Button.LEFT;
                    if (btn === Button.RIGHT) await mouse.rightClick();
                    else await mouse.leftClick();
                }
                else if (komut === 'cift_tikla') await mouse.doubleClick(Button.LEFT);
                else if (komut === 'sag_tikla') await mouse.rightClick();
                return res.end(JSON.stringify({ basarili: true, islem: komut }));
            }

            if (komut === 'yaz') {
                // Trke karakter sorununu cozmek iin Powershell clipboard yontemini kullanabiliriz (pyautogui'deki gibi)
                const metin = data.metin;
                const b64 = Buffer.from(metin).toString('base64');
                const ps_cmd = `[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')) | Set-Clipboard`;
                await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                await keyboard.pressKey(Key.LeftControl, Key.V);
                await keyboard.releaseKey(Key.LeftControl, Key.V);
                return res.end(JSON.stringify({ basarili: true, islem: `Yazildi: ${metin.substring(0, 50)}...` }));
            }

            if (komut === 'tus') {
                const tus = data.tus.toLowerCase();
                if (keyMap[tus]) {
                    await keyboard.pressKey(keyMap[tus]);
                    await keyboard.releaseKey(keyMap[tus]);
                    return res.end(JSON.stringify({ basarili: true, islem: `Tus: ${tus}` }));
                } else {
                    return res.end(JSON.stringify({ basarili: false, hata: `Gecersiz tus: ${tus}` }));
                }
            }

            if (komut === 'kisayol') {
                const keys = (data.tuslar || []).map((t: string) => keyMap[t.toLowerCase()]).filter(Boolean);
                if (keys.length > 0) {
                    await keyboard.pressKey(...keys);
                    await keyboard.releaseKey(...keys);
                    return res.end(JSON.stringify({ basarili: true, islem: `Kisayol: ${data.tuslar.join('+')}` }));
                } else {
                    return res.end(JSON.stringify({ basarili: false, hata: 'Gecersiz kisayol tuslari' }));
                }
            }

            if (komut === 'tasi') {
                await mouse.setPosition(new Point(data.x, data.y));
                return res.end(JSON.stringify({ basarili: true, islem: `Fare tasindi (${data.x},${data.y})` }));
            }

            if (komut === 'surukle') {
                await mouse.setPosition(new Point(data.x1, data.y1));
                await mouse.pressButton(Button.LEFT);
                await mouse.setPosition(new Point(data.x2, data.y2));
                await mouse.releaseButton(Button.LEFT);
                return res.end(JSON.stringify({ basarili: true, islem: `Surukle (${data.x1},${data.y1})->(${data.x2},${data.y2})` }));
            }

            if (komut === 'scroll') {
                if (data.x !== undefined && data.y !== undefined) {
                    await mouse.setPosition(new Point(data.x, data.y));
                }
                const miktar = data.miktar || 0;
                if (miktar > 0) await mouse.scrollUp(miktar);
                else if (miktar < 0) await mouse.scrollDown(Math.abs(miktar));
                return res.end(JSON.stringify({ basarili: true, islem: `Scroll: ${miktar}` }));
            }

            if (komut === 'konum') {
                const pos = await mouse.getPosition();
                // Nut-js'te native ekran boyutu almak icin node_modules'dan baska kutuphaneye baglanmaya gerek yok, powershell kullanabiliriz.
                const { stdout } = await execAsync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output \\"$($screen.Width),$($screen.Height)\\""`, { windowsHide: true });
                const [w, h] = stdout.trim().split(',').map(Number);
                return res.end(JSON.stringify({ basarili: true, fare_x: pos.x, fare_y: pos.y, ekran_w: w, ekran_h: h }));
            }

            // --- Pencere Islemleri ---
            if (komut === 'pencereler') {
                const ps_cmd = 'Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -Compress';
                const { stdout } = await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                try {
                    let parsed = JSON.parse(stdout);
                    if (!Array.isArray(parsed)) parsed = [parsed];
                    const pencereler = parsed.map((p: any) => ({ pid: p.Id, program: p.ProcessName, baslik: p.MainWindowTitle }));
                    return res.end(JSON.stringify({ basarili: true, pencereler, toplam: pencereler.length }));
                } catch {
                    return res.end(JSON.stringify({ basarili: false, hata: 'Pencere listesi alinamadi' }));
                }
            }

            if (komut === 'pencere_odakla') {
                const ps_cmd = `$p = Get-Process | Where-Object { $_.MainWindowTitle -match '${data.baslik}' } | Select-Object -First 1; if ($p) { $w = New-Object -ComObject WScript.Shell; $w.AppActivate($p.Id); Write-Output $p.MainWindowTitle } else { Write-Output 'BULUNAMADI' }`;
                const { stdout } = await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                const output = stdout.trim();
                if (output === 'BULUNAMADI' || !output) return res.end(JSON.stringify({ basarili: false, hata: `Pencere bulunamadi: ${data.baslik}` }));
                return res.end(JSON.stringify({ basarili: true, islem: `Pencere odaklandi: ${output}` }));
            }

            if (komut === 'pencere_kapat') {
                const ps_cmd = `Get-Process | Where-Object { $_.MainWindowTitle -match '${data.baslik}' } | Select-Object -First 1 | Stop-Process -Force`;
                await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                return res.end(JSON.stringify({ basarili: true, islem: `Pencere kapatildi: ${data.baslik}` }));
            }

            if (komut === 'pencere_boyutla') {
                // Minimize=6, Maximize=3, Restore=9
                const islemStr = data.islem === 'minimize' ? 6 : data.islem === 'maximize' ? 3 : 9;
                const ps_cmd = `$p = Get-Process | Where-Object { $_.MainWindowTitle -match '${data.baslik}' } | Select-Object -First 1; if ($p) { Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }"; [Win32]::ShowWindowAsync($p.MainWindowHandle, ${islemStr}); Write-Output "OK" } else { Write-Output "FAIL" }`;
                const { stdout } = await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                if (stdout.trim() === 'FAIL') return res.end(JSON.stringify({ basarili: false, hata: `Pencere bulunamadi: ${data.baslik}` }));
                return res.end(JSON.stringify({ basarili: true, islem: `${data.islem}: ${data.baslik}` }));
            }

            // --- Clipboard Islemleri ---
            if (komut === 'clipboard_oku') {
                const { stdout } = await execAsync(`powershell -Command "Get-Clipboard"`, { windowsHide: true });
                const icerik = stdout.replace(/\r\n$/, '');
                return res.end(JSON.stringify({ basarili: true, icerik, uzunluk: icerik.length }));
            }

            if (komut === 'clipboard_yaz') {
                const metin = data.metin;
                const b64 = Buffer.from(metin).toString('base64');
                const ps_cmd = `[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')) | Set-Clipboard`;
                await execAsync(`powershell -Command "${ps_cmd}"`, { windowsHide: true });
                return res.end(JSON.stringify({ basarili: true, islem: `Panoya yazildi (${metin.length} karakter)` }));
            }

            res.writeHead(400);
            res.end(JSON.stringify({ basarili: false, hata: `Bilinmeyen komut: ${komut}` }));
        } catch (e: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ basarili: false, hata: e.message }));
        }
    });
}
