import { ModuleTool } from '../registry';

/**
 * Puppeteer Yedek Web Arama — Playwright başarısız olursa devreye girer.
 * İki motor birbirinin kontrolcüsüdür.
 */
export const puppeteer_web_ara: ModuleTool = {
    name: 'puppeteer_web_ara',
    description: 'Puppeteer ile internette arama yapar. Playwright arama aracı hata verirse bunu yedek olarak kullan.',
    parameters: {
        type: 'object',
        properties: {
            sorgu: { type: 'string', description: 'Aranacak metin' }
        },
        required: ['sorgu']
    },
    execute: async (args: any) => {
        const { sorgu } = args;
        console.log(`[WEB ARAMA] Puppeteer (yedek) ile aranıyor: ${sorgu}`);
        let browser;
        try {
            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());

            browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(sorgu)}&kl=tr-tr`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            await page.waitForSelector('article[data-testid="result"]', { timeout: 10000 });
            
            const results = await page.$$eval('article[data-testid="result"]', (elements: Element[]) => {
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
            
            const output = results.map((r: any, i: number) => `${i+1}. ${r.title} (${r.url}): ${r.snippet}`).join('\n');
            return { success: true, output: output || 'Sonuç bulunamadı.' };
        } catch (e: any) {
            return { success: false, error: `Puppeteer arama hatası: ${e.message}` };
        } finally {
            if (browser) await browser.close();
        }
    }
};
