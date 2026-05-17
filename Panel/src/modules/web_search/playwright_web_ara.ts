import { chromium } from 'playwright';
import { ModuleTool } from '../registry';

export const playwright_web_ara: ModuleTool = {
    name: 'playwright_web_ara',
    description: 'İnternette Playwright kullanarak arama yapar ve sonuçları çeker. (Görünmez arka plan sekmesinde çalışır). Diğer arama aracı hata verirse bunu kullan.',
    parameters: {
        type: 'object',
        properties: {
            sorgu: { type: 'string', description: 'Aranacak metin' }
        },
        required: ['sorgu']
    },
    execute: async (args: any) => {
        const { sorgu } = args;
        console.log(`[WEB ARAMA] Playwright ile aranıyor: ${sorgu}`);
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(sorgu)}&kl=tr-tr`);
            
            await page.waitForSelector('article[data-testid="result"]', { timeout: 10000 });
            
            const results = await page.$$eval('article[data-testid="result"]', elements => {
                return elements.slice(0, 5).map(el => {
                    const titleEl = el.querySelector('h2');
                    const linkEl = el.querySelector('a');
                    const snippetEl = el.querySelector('[data-result="snippet"]');
                    return {
                        title: titleEl ? titleEl.textContent?.trim() : '',
                        url: linkEl ? linkEl.getAttribute('href') : '',
                        snippet: snippetEl ? snippetEl.textContent?.trim() : ''
                    };
                });
            });
            
            let output = results.map((r, i) => `${i+1}. ${r.title} (${r.url}): ${r.snippet}`).join('\n');
            return { success: true, output: output || 'Sonuç bulunamadı.' };
        } catch (e: any) {
            return { success: false, error: `Arama hatası: ${e.message}` };
        } finally {
            if (browser) await browser.close();
        }
    }
};
