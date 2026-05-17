/**
 * Asker Motoru — Temel Doğruluk Testleri
 * ========================================
 * Node.js native test runner (node:test) kullanır — sıfır bağımlılık.
 * Çalıştırma: npx ts-node --esm tests/core.test.ts
 *          veya: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

// ─── Proje kök dizinleri ─────────────────────────────────
const PANEL_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PANEL_DIR, 'src');
const FRONTEND_DIR = path.join(PANEL_DIR, 'frontend_src');
const VIEWS_DIR = path.join(PANEL_DIR, 'views');

// ══════════════════════════════════════════════════════════
// 1. DOSYA YAPISI DOĞRULAMA
// ══════════════════════════════════════════════════════════

describe('Dosya Yapısı', () => {

    it('Kritik backend dosyaları mevcut olmalı', () => {
        const requiredFiles = [
            'src/server.ts',
            'src/db.ts',
            'src/routes/chatHandler.ts',
            'src/routes/pcControlHandler.ts',
            'src/core/tools.ts',
            'src/modules/registry.ts',
            'src/utils/logger.ts',
            'src/utils/usageGovernor.ts',
            'src/server/process_manager.ts',
            'src/server/ws_handler.ts',
        ];
        for (const file of requiredFiles) {
            const fullPath = path.join(PANEL_DIR, file);
            assert.ok(fs.existsSync(fullPath), `Eksik dosya: ${file}`);
        }
    });

    it('Kritik frontend dosyaları mevcut olmalı', () => {
        const requiredFiles = [
            'frontend_src/strategy.ts',
            'frontend_src/strategy/data.ts',
            'frontend_src/strategy/voice.ts',
            'frontend_src/strategy/renderer.ts',
            'frontend_src/strategy/state.ts',
            'frontend_src/strategy/sentinel.ts',
        ];
        for (const file of requiredFiles) {
            const fullPath = path.join(PANEL_DIR, file);
            assert.ok(fs.existsSync(fullPath), `Eksik dosya: ${file}`);
        }
    });

    it('HTML görünüm dosyaları mevcut olmalı', () => {
        const requiredViews = ['strategy.html', 'index.html', 'home.html', 'training.html'];
        for (const view of requiredViews) {
            const fullPath = path.join(VIEWS_DIR, view);
            assert.ok(fs.existsSync(fullPath), `Eksik görünüm: ${view}`);
        }
    });

    it('package.json geçerli JSON olmalı', () => {
        const content = fs.readFileSync(path.join(PANEL_DIR, 'package.json'), 'utf-8');
        const pkg = JSON.parse(content);
        assert.equal(pkg.name, 'asker-motoru-hud');
        assert.ok(pkg.dependencies, 'dependencies alanı eksik');
        assert.ok(pkg.devDependencies, 'devDependencies alanı eksik');
    });

    it('.env dosyası mevcut olmalı', () => {
        assert.ok(
            fs.existsSync(path.join(PANEL_DIR, '.env')),
            '.env dosyası bulunamadı — API anahtarları .env içinde olmalı'
        );
    });
});

// ══════════════════════════════════════════════════════════
// 2. GÜVENLİK KONTROLLERI
// ══════════════════════════════════════════════════════════

describe('Güvenlik', () => {

    it('chatHandler.ts içinde hardcoded API anahtarı OLMAMALI', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'routes', 'chatHandler.ts'), 'utf-8'
        );
        // AIzaSy ile başlayan hardcoded Google API key olmamalı
        const hasHardcodedKey = /Bearer AIzaSy[A-Za-z0-9_-]{30,}/.test(content);
        assert.ok(!hasHardcodedKey, 'chatHandler.ts içinde hardcoded API anahtarı bulundu!');
    });

    it('chatHandler.ts process.env üzerinden API anahtarı okumalı', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'routes', 'chatHandler.ts'), 'utf-8'
        );
        assert.ok(
            content.includes('process.env.GEMINI_API_KEY'),
            'chatHandler.ts process.env.GEMINI_API_KEY kullanmıyor'
        );
    });

    it('tools.ts tehlikeli komut filtresi içermeli', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'core', 'tools.ts'), 'utf-8'
        );
        assert.ok(
            content.includes('BLOCKED_PATTERNS') || content.includes('isCommandSafe') || content.includes('blocked'),
            'tools.ts içinde tehlikeli komut filtresi bulunamadı'
        );
    });
});

// ══════════════════════════════════════════════════════════
// 3. MODÜL KAYIT SİSTEMİ (Registry)
// ══════════════════════════════════════════════════════════

describe('Modül Registry', () => {

    it('registry.ts mevcut ve SwarmModule arayüzü içermeli', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'modules', 'registry.ts'), 'utf-8'
        );
        assert.ok(content.includes('SwarmModule'), 'SwarmModule arayüzü bulunamadı');
    });

    it('YouTube modülü dosyaları mevcut olmalı', () => {
        const indexPath = path.join(SRC_DIR, 'modules', 'youtube', 'index.ts');
        assert.ok(fs.existsSync(indexPath), 'YouTube index.ts eksik');
        const content = fs.readFileSync(indexPath, 'utf-8');
        assert.ok(content.length > 50, 'YouTube index.ts boş veya çok küçük');
    });

    it('WhatsApp modülü dosyaları mevcut olmalı', () => {
        const indexPath = path.join(SRC_DIR, 'modules', 'whatsapp', 'index.ts');
        assert.ok(fs.existsSync(indexPath), 'WhatsApp index.ts eksik');
    });

    it('Web Search modülü dosyaları mevcut olmalı', () => {
        const indexPath = path.join(SRC_DIR, 'modules', 'web_search', 'index.ts');
        assert.ok(fs.existsSync(indexPath), 'Web Search index.ts eksik');
    });

    it('video_modul klasörü kaldırılmış olmalı', () => {
        const videoDir = path.join(SRC_DIR, 'modules', 'video_modul');
        assert.ok(!fs.existsSync(videoDir), 'video_modul/ klasörü hâlâ mevcut — silinmeli');
    });
});

// ══════════════════════════════════════════════════════════
// 4. KOK KLASÖR REFERANSI
// ══════════════════════════════════════════════════════════

describe('Kök Klasör Referansı', () => {

    it('server.ts ölü göreli yol kullanMAMALI', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'server.ts'), 'utf-8'
        );
        const hasOldPath = content.includes("'..', '..', '..', 'ASKER_MOTORU_KOK_KLASORU'");
        assert.ok(!hasOldPath, 'server.ts hâlâ ölü göreli yol kullanıyor');
    });

    it('server.ts process.env veya Desktop yolu kullanmalı', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'server.ts'), 'utf-8'
        );
        const usesEnvOrDesktop = content.includes('process.env.ASKER_MOTORU_ROOT')
            || content.includes("'Desktop', 'ASKER_MOTORU_KOK_KLASORU'");
        assert.ok(usesEnvOrDesktop, 'server.ts kök klasör yolunu doğru şekilde çözmüyor');
    });
});

// ══════════════════════════════════════════════════════════
// 5. TASARRUF VE KONFİGÜRASYON
// ══════════════════════════════════════════════════════════

describe('Tasarruf ve Konfigürasyon', () => {

    it('usageGovernor.ts mevcut ve export ediyor', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'utils', 'usageGovernor.ts'), 'utf-8'
        );
        assert.ok(content.includes('export'), 'usageGovernor.ts hiçbir şey export etmiyor');
        assert.ok(
            content.includes('getSavingsPolicy') || content.includes('applySavingsToPayload'),
            'usageGovernor.ts beklenen fonksiyonları içermiyor'
        );
    });

    it('tsconfig.json geçerli JSON olmalı', () => {
        const content = fs.readFileSync(path.join(PANEL_DIR, 'tsconfig.json'), 'utf-8');
        JSON.parse(content);
    });

    it('tsconfig.json strict mode aktif olmalı', () => {
        const content = fs.readFileSync(path.join(PANEL_DIR, 'tsconfig.json'), 'utf-8');
        const config = JSON.parse(content);
        assert.equal(config.compilerOptions.strict, true, 'TypeScript strict modu kapalı');
    });
});

// ══════════════════════════════════════════════════════════
// 6. ELECTRON GÜVENLİK
// ══════════════════════════════════════════════════════════

describe('Electron Güvenlik', () => {

    it('electron_main.js contextIsolation true olmalı', () => {
        const content = fs.readFileSync(
            path.join(PANEL_DIR, 'electron_main.js'), 'utf-8'
        );
        assert.ok(content.includes('contextIsolation: true'), 'contextIsolation aktif değil');
    });

    it('electron_main.js nodeIntegration false olmalı', () => {
        const content = fs.readFileSync(
            path.join(PANEL_DIR, 'electron_main.js'), 'utf-8'
        );
        assert.ok(content.includes('nodeIntegration: false'), 'nodeIntegration hâlâ açık');
    });

    it('preload.js dosyası mevcut olmalı', () => {
        assert.ok(
            fs.existsSync(path.join(PANEL_DIR, 'preload.js')),
            'preload.js bulunamadı — contextBridge köprüsü eksik'
        );
    });

    it('DevTools sadece geliştirme modunda açılmalı', () => {
        const content = fs.readFileSync(
            path.join(PANEL_DIR, 'electron_main.js'), 'utf-8'
        );
        assert.ok(
            content.includes('IS_DEV') || content.includes('isPackaged'),
            'DevTools koşullu kontrolü eksik'
        );
    });
});

// ══════════════════════════════════════════════════════════
// 7. VERİ KAYNAĞI TEKİLLİĞİ
// ══════════════════════════════════════════════════════════

describe('Veri Kaynağı', () => {

    it('chatHandler.ts dosya tabanlı chat geçmişi kullanMAMALI', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'routes', 'chatHandler.ts'), 'utf-8'
        );
        assert.ok(
            !content.includes('CHAT_HISTORY_FILE') || content.includes('KALDIRILDI'),
            'chatHandler.ts hâlâ dosya tabanlı chat geçmişi kullanıyor'
        );
    });

    it('.gitignore mevcut olmalı', () => {
        const rootGitignore = path.resolve(PANEL_DIR, '..', '.gitignore');
        assert.ok(fs.existsSync(rootGitignore), '.gitignore bulunamadı');
        const content = fs.readFileSync(rootGitignore, 'utf-8');
        assert.ok(content.includes('.env'), '.gitignore içinde .env kuralı eksik');
    });
});

// ══════════════════════════════════════════════════════════
// 8. HATA KODU SİSTEMİ
// ══════════════════════════════════════════════════════════

describe('Hata Kodu Sistemi', () => {

    it('errorCodes.ts mevcut olmalı', () => {
        assert.ok(
            fs.existsSync(path.join(SRC_DIR, 'utils', 'errorCodes.ts')),
            'errorCodes.ts bulunamadı'
        );
    });

    it('errorCodes.ts tüm katman kodlarını içermeli', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'utils', 'errorCodes.ts'), 'utf-8'
        );
        const requiredPrefixes = ['AM-DB-', 'AM-SRV-', 'AM-LLM-', 'AM-TOOL-', 'AM-SEC-', 'AM-ELC-', 'AM-REG-', 'AM-WS-', 'AM-INT-'];
        for (const prefix of requiredPrefixes) {
            assert.ok(content.includes(prefix), `Hata kodu katmanı eksik: ${prefix}`);
        }
    });

    it('errorCodes.ts AppError sınıfı export etmeli', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'utils', 'errorCodes.ts'), 'utf-8'
        );
        assert.ok(content.includes('export class AppError'), 'AppError sınıfı export edilmiyor');
        assert.ok(content.includes('createError'), 'createError fonksiyonu bulunamadı');
    });

    it('server.ts hata kodlarını kullanmalı', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'server.ts'), 'utf-8'
        );
        assert.ok(content.includes("code: 'AM-"), 'server.ts hata kodları kullanmıyor');
    });

    it('llmBridge.ts hata kodlarını kullanmalı', () => {
        const content = fs.readFileSync(
            path.join(SRC_DIR, 'routes', 'llmBridge.ts'), 'utf-8'
        );
        assert.ok(content.includes('createError'), 'llmBridge.ts hata kodları kullanmıyor');
    });
});
