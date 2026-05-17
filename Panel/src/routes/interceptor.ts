/**
 * ══════════════════════════════════════════════════════════════
 * ASKER MOTORU — Komut Yakalayıcı (Interceptor)
 * Model'e gitmeden önce yaygın komutları doğrudan çalıştırır.
 * ══════════════════════════════════════════════════════════════
 */
import { executeTool } from '../core/tools';

/**
 * Kullanıcı mesajını analiz eder, bilinen basit komutları doğrudan çalıştırır.
 * Yakalayamazsa null döner → mesaj model'e iletilir.
 */
export async function tryIntercept(content: string): Promise<string | null> {
    const lower = content.toLowerCase().trim();

    // NOT: YouTube ve Google interceptor'ları Otonom Modüllerle çakıştığı için devre dışı bırakıldı.
    // Otonom kovanın kendi araçlarını (Playwright) kullanmasına izin verilir.

    // Uygulama aç (calc, notepad, vs.)
    const appMatch = lower.match(/(?:hesap\s*makine|calculator)/i);
    if (appMatch) { await executeTool('uygulama_ac', { uygulama: 'calc' }); return 'Hesap makinesi açıldı.'; }
    const noteMatch = lower.match(/(?:not\s*defteri|notepad)/i);
    if (noteMatch && lower.includes('aç')) { await executeTool('uygulama_ac', { uygulama: 'notepad' }); return 'Not defteri açıldı.'; }

    // Site aç
    const siteMatch = lower.match(/(.+?)(?:\s+sitesini|\s+sayfasını)\s*aç/i)
        || lower.match(/aç\s+(.+?)(?:\s+sitesini|\s+sayfasını)/i);
    if (siteMatch) {
        const site = siteMatch[1].trim();
        let url = site;
        if (!url.startsWith('http')) url = `https://www.${site.replace(/\s+/g, '')}.com`;
        await executeTool('url_ac', { url });
        return `${site} açıldı.`;
    }

    return null; // Yakalayıcı bu komutu tanımadı, model'e devret
}
