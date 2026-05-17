import { SwarmModule } from '../registry';
import { playwright_web_ara } from './playwright_web_ara';
import { puppeteer_web_ara } from './puppeteer_web_ara';

const moduleDef: SwarmModule = {
    id: 'web_search_module_01',
    name: 'Gelişmiş Web Arama',
    category: 'Web',
    tools: [
        playwright_web_ara,   // Birincil motor
        puppeteer_web_ara     // Yedek motor — birbirini kontrol eder
    ]
};

export default moduleDef;
