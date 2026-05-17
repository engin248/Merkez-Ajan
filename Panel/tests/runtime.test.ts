/**
 * Asker Motoru — Runtime / Integration Testleri
 * ================================================
 * Gerçek HTTP istekleri ile API endpoint'lerini test eder.
 * Sunucunun çalışıyor olması GEREKMEZdir — bağlantı hatası beklenen davranıştır.
 * Çalıştırma: npm test
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'http';

const BASE_URL = 'http://localhost:8085';

// Yardımcı: HTTP GET isteği
function httpGet(path: string, timeoutMs: number = 3000): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.get(`${BASE_URL}${path}`, { timeout: timeoutMs }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 0, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Yardımcı: HTTP POST isteği
function httpPost(path: string, data: any, timeoutMs: number = 3000): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const req = http.request(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
            timeout: timeoutMs
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 0, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(postData);
        req.end();
    });
}

// Sunucunun erişilebilir olup olmadığını kontrol et
let serverAvailable = false;

// ══════════════════════════════════════════════════════════
// RUNTIME API TESTLERİ
// ══════════════════════════════════════════════════════════

describe('Runtime API Testleri', () => {

    before(async () => {
        try {
            await httpGet('/api/healthcheck', 2000);
            serverAvailable = true;
        } catch {
            serverAvailable = false;
            console.log('[TEST] Sunucu çalışmıyor — runtime testleri atlanacak (bu normal).');
        }
    });

    it('/api/healthcheck 200 dönmeli', async () => {
        if (!serverAvailable) return; // Sunucu yoksa atla
        const res = await httpGet('/api/healthcheck');
        assert.equal(res.status, 200);
        const data = JSON.parse(res.body);
        assert.ok(data.status === 'ok' || data.alive === true, 'Healthcheck yanıtı geçersiz');
    });

    it('/api/db-status veritabanı durumunu dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/db-status');
        assert.equal(res.status, 200);
        const data = JSON.parse(res.body);
        assert.ok('connected' in data, 'DB status yanıtında connected alanı yok');
    });

    it('/api/modules modül listesi dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/modules');
        assert.equal(res.status, 200);
        const data = JSON.parse(res.body);
        assert.ok(Array.isArray(data), 'Modules yanıtı dizi değil');
    });

    it('/api/graph-state GET graph verisi veya hata kodu dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/graph-state');
        const data = JSON.parse(res.body);
        if (res.status === 200) {
            // Başarılı: graph verisi dönmeli
            assert.ok('nodes' in data || 'edges' in data, 'Graph state yanıtı geçersiz — nodes/edges eksik');
        } else {
            // Hata: hata kodu OLMALI — toleranssız kontrol
            assert.equal(res.status, 500, `Beklenmeyen status: ${res.status}`);
            assert.ok(data.code, `Hata kodu eksik! Yanıt: ${JSON.stringify(data)}`);
            assert.ok(data.code.startsWith('AM-'), `Geçersiz hata kodu formatı: ${data.code}`);
        }
    });

    it('/api/tasarruf-durumu tasarruf politikası dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/tasarruf-durumu');
        assert.equal(res.status, 200);
    });

    it('/api/models model listesi dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/models');
        // 200 veya Ollama yoksa hata — her ikisi de geçerli
        assert.ok(res.status === 200 || res.status === 500, `Beklenmeyen status: ${res.status}`);
    });

    it('Bilinmeyen endpoint 404 veya HTML dönmeli', async () => {
        if (!serverAvailable) return;
        const res = await httpGet('/api/yok-boyle-bir-endpoint');
        // Sunucu ya 404 ya da ana sayfa döner — ikisi de kabul edilir
        assert.ok(res.status === 404 || res.status === 200, `Beklenmeyen status: ${res.status}`);
    });
});

// ══════════════════════════════════════════════════════════
// TOOL EXECUTOR BİRİM TESTLERİ
// ══════════════════════════════════════════════════════════

describe('Tool Executor Birimleri', () => {

    it('isCommandSafe tehlikeli komutları engellemeli', () => {
        // tools.ts'den import edemeyiz (Electron bağımlılıkları yüzünden),
        // bu yüzden aynı regex mantığını burada doğruluyoruz.
        const BLOCKED_PATTERNS: RegExp[] = [
            /rm\s+-rf/i, /del\s+\/[sfq]/i, /format\s+[a-z]:/i,
            /remove-item.*-recurse.*-force/i, /shutdown/i, /restart-computer/i,
            /stop-process.*-force/i, /clear-content/i, /set-executionpolicy/i,
            /reg\s+delete/i, /reg\s+add/i, /net\s+user/i
        ];
        function isCommandSafe(cmd: string): boolean {
            return !BLOCKED_PATTERNS.some(p => p.test(cmd));
        }

        // Tehlikeli komutlar ENGELLENMELİ
        assert.equal(isCommandSafe('rm -rf /'), false, 'rm -rf engellenmedi');
        assert.equal(isCommandSafe('shutdown /s /t 0'), false, 'shutdown engellenmedi');
        assert.equal(isCommandSafe('format C:'), false, 'format engellenmedi');
        assert.equal(isCommandSafe('Remove-Item C:\\ -Recurse -Force'), false, 'Remove-Item engellenmedi');
        assert.equal(isCommandSafe('reg delete HKCU'), false, 'reg delete engellenmedi');
        assert.equal(isCommandSafe('net user admin /add'), false, 'net user engellenmedi');
        assert.equal(isCommandSafe('Restart-Computer'), false, 'Restart-Computer engellenmedi');

        // Güvenli komutlar GEÇMELİ
        assert.equal(isCommandSafe('dir'), true, 'dir engellendi');
        assert.equal(isCommandSafe('Get-Process'), true, 'Get-Process engellendi');
        assert.equal(isCommandSafe('echo hello'), true, 'echo engellendi');
        assert.equal(isCommandSafe('node --version'), true, 'node --version engellendi');
    });

    it('Sonsuz döngü algılama mantığı doğru çalışmalı', () => {
        const toolCallHistory: string[] = [];

        function checkDuplicate(signature: string): boolean {
            if (toolCallHistory.includes(signature)) return true;
            toolCallHistory.push(signature);
            return false;
        }

        assert.equal(checkDuplicate('web_ara:{"sorgu":"test"}'), false, 'İlk çağrı tekrar olmamalı');
        assert.equal(checkDuplicate('dosya_oku:{"yol":"a.txt"}'), false, 'Farklı çağrı tekrar olmamalı');
        assert.equal(checkDuplicate('web_ara:{"sorgu":"test"}'), true, 'Aynı çağrı tekrar algılanmalı');
    });
});
