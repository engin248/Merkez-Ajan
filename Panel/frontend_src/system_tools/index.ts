// =====================================================================
// ASKER MOTORU - SİSTEM ARAÇLARI DISPATCHER
// =====================================================================

import { TOOL_DEFINITIONS } from './definitions';
import { executeCommand, listProcesses, getSystemInfo, takeScreenshot, openProgram } from './os_tools';
import { readFile, writeFile, listDirectory } from './fs_tools';
import { fetchWebContent, webSearch } from './web_tools';
import { analyzeScreen } from './vision_tools';
import { Logger } from '../utils/logger';
import { 
    mouseClick, 
    keyboardType, 
    keyboardPress, 
    keyboardShortcut, 
    mouseDrag, 
    windowList, 
    windowFocus, 
    clipboardRead, 
    clipboardWrite 
} from './pc_control';

const logger = new Logger('SystemTools');

// Araç Çağırma Dispatcher
async function executeTool(name: string, args: any) {
    logger.info(`Araç çalıştırılıyor: ${name}`, args);
    const startTime = performance.now();
    let result: any;
    
    try {
        switch (name) {
            case 'komut_calistir': result = await executeCommand(args.komut, args.cwd); break;
            case 'dosya_oku': result = readFile(args.yol); break;
            case 'dosya_yaz': result = writeFile(args.yol, args?.icerik); break;
            case 'klasor_listele': result = listDirectory(args.yol); break;
            case 'program_ac': result = await openProgram(args.program, args.arguman); break;
            case 'web_icerik_cek': result = await fetchWebContent(args.url); break;
            case 'web_arama': result = await webSearch(args.sorgu); break;
            case 'ekran_goruntusu': result = await takeScreenshot(args.dosya_adi); break;
            case 'process_listele': result = await listProcesses(args.filtre); break;
            case 'sistem_bilgisi': result = await getSystemInfo(); break;
            case 'ekran_analiz_et': result = await analyzeScreen(args.soru); break;
            case 'fare_tikla': result = await mouseClick(args.x, args.y, args.tur); break;
            case 'klavye_yaz': result = await keyboardType(args.metin); break;
            case 'klavye_tus': result = await keyboardPress(args.tus); break;
            case 'klavye_kisayol': result = await keyboardShortcut(args.tuslar); break;
            case 'fare_surukle': result = await mouseDrag(args.x1, args.y1, args.x2, args.y2); break;
            case 'pencere_listele': result = await windowList(); break;
            case 'pencere_odakla': result = await windowFocus(args.baslik); break;
            case 'clipboard_oku': result = await clipboardRead(); break;
            case 'clipboard_yaz': result = await clipboardWrite(args.metin); break;
            default: result = { basarili: false, hata: `Bilinmeyen araç: ${name}` };
        }
    } catch (e: any) {
        logger.error(`Araç hatası: ${name}`, e.message);
        result = { basarili: false, hata: e.message };
    }

    const durationMs = Math.round(performance.now() - startTime);
    logger.debug(`Araç tamamlandı: ${name} (${durationMs}ms)`);
    return result;
}

export { TOOL_DEFINITIONS, executeTool };
