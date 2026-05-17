import { chromium, BrowserContext, Page } from 'playwright';
import * as os from 'os';
import * as path from 'path';
import { ModuleTool } from '../registry';

let context: BrowserContext | null = null;
let page: Page | null = null;

async function getWhatsAppPage() {
    if (!context) {
        const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'AskerMotoru', 'PlaywrightData');
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        });
        page = context.pages()[0] || await context.newPage();
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle' });
    }
    return page;
}

export const whatsapp_mesaj_gonder: ModuleTool = {
    name: 'whatsapp_mesaj_gonder',
    description: 'Belirtilen kişiye veya gruba WhatsApp üzerinden mesaj gönderir. (Oturumun daha önce açılmış olması gerekir).',
    parameters: {
        type: 'object',
        properties: {
            kisi: { type: 'string', description: 'Mesajın gönderileceği kişinin tam adı veya numarası' },
            mesaj: { type: 'string', description: 'Gönderilecek metin mesajı (link veya normal metin)' }
        },
        required: ['kisi', 'mesaj']
    },
    execute: async (args: any) => {
        const { kisi, mesaj } = args;
        console.log(`[WHATSAPP] "${kisi}" kişisine mesaj gönderiliyor...`);
        try {
            const wpPage = await getWhatsAppPage();
            if (!wpPage) throw new Error('WhatsApp sayfası açılamadı.');
            
            const searchInput = wpPage.locator('div[contenteditable="true"][data-tab="3"]');
            await searchInput.waitFor({ state: 'visible', timeout: 30000 });
            await searchInput.fill(kisi);
            
            const userCell = wpPage.locator(`span[title="${kisi}"]`).first();
            await userCell.waitFor({ state: 'visible', timeout: 10000 });
            await userCell.click();
            
            const messageBox = wpPage.locator('div[contenteditable="true"][data-tab="10"]');
            await messageBox.waitFor({ state: 'visible', timeout: 5000 });
            await messageBox.fill(mesaj);
            await messageBox.press('Enter');
            
            return { success: true, output: `WhatsApp üzerinden "${kisi}" kişisine başarıyla mesaj gönderildi.` };
        } catch (e: any) {
            return { success: false, error: `WhatsApp hatası (Karekod taranmamış olabilir veya kişi bulunamadı): ${e.message}` };
        }
    }
};
