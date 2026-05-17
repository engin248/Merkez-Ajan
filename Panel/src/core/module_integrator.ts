import * as fs from 'fs';
import * as path from 'path';
import { universalLlmRequest } from '../routes/llmBridge';
import { loadModules } from '../modules/registry';
import { Logger } from '../utils/logger';

const logger = new Logger('ModuleIntegrator');

/**
 * Kullanıcıdan gelen ham TypeScript kodunu alır, Gemini 3.1 Pro (veya fallback) modeline
 * göndererek Asker Motoru SwarmModule formatına çevirmesini sağlar, klasöre kaydeder
 * ve sistemi yeniden yükler (registry reload). Eğer modül çökerse (hata verirse),
 * dosyanın başına hata yorumu ekleyip sonuna .error uzantısı ekleyerek devre dışı bırakır.
 */
export async function integrateModule(rawCode: string, category: string, moduleName: string, onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string; modulePath?: string }> {
    const notify = (msg: string) => {
        logger.info(msg);
        if (onProgress) onProgress(msg);
    };

    try {
        notify(`[Adım 1/4] Modül entegrasyonu başlatıldı: ${moduleName} (Kategori: ${category})`);

        // LLM Prompt'u
        const systemPrompt = `Sen Asker Motoru kovanı için kod düzenleyen kıdemli bir yazılım mimarısın.
Görev: Sana verilen ham TypeScript/JavaScript modül kodunu incele ve "SwarmModule" interface'ine uygun hale getir.

[Kurallar]
1. Modülün 'id' değeri 'mod_${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_')}' olsun.
2. Modülün 'name' değeri '${moduleName}' olsun.
3. Modülün 'category' değeri '${category}' olsun.
4. Kod içerisindeki fonksiyonları tespit edip 'tools' dizisine ekle. Her tool: name, description, parameters, execute (async) içermelidir.
5. Export edilen nesne 'export default' veya 'export const Modul = ...' şeklinde olmalıdır.
6. Kodun etrafına markdown blokları (\`\`\`typescript vb.) KOYMA. SADECE ÇALIŞABİLİR KOD DÖNDÜR.
7. Orijinal koddaki mantığı (işlevi) bozma.`;

        // Modeli belirle: "gemini-3.1-pro" (Kullanıcı tercihi)
        const modelToUse = 'gemini-3.1-pro';

        notify(`[Adım 2/4] Ham kod alındı. Gemini 3.1 Pro ile analiz ve dönüşüm başlatılıyor... Lütfen bekleyin.`);

        const payload = {
            model: modelToUse,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `İşte dönüştürülecek ham kod:\n\n${rawCode}` }
            ],
            stream: false,
            options: { temperature: 0.1 }
        };

        const response = await universalLlmRequest(payload);

        if (response.error) {
            throw new Error(`LLM Hatası: ${response.error}`);
        }

        let refactoredCode = response.message?.content || '';

        // Eğer LLM inatla markdown bloğu gönderirse temizle
        refactoredCode = refactoredCode.replace(/^```(typescript|ts|javascript|js)?\n/i, '');
        refactoredCode = refactoredCode.replace(/```$/i, '');
        refactoredCode = refactoredCode.trim();

        if (!refactoredCode) {
            throw new Error("LLM boş yanıt döndürdü.");
        }

        notify(`[Adım 3/4] Kod başarıyla SwarmModule formatına çevrildi. Dosya sistemine yazılıyor...`);

        // Klasör yapısını hazırla
        const safeDirName = moduleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const moduleDirPath = path.join(__dirname, '..', 'modules', safeDirName);

        if (!fs.existsSync(moduleDirPath)) {
            fs.mkdirSync(moduleDirPath, { recursive: true });
        }

        const indexPath = path.join(moduleDirPath, 'index.ts');
        fs.writeFileSync(indexPath, refactoredCode, 'utf-8');

        notify(`[Adım 4/4] Dosya derleniyor ve aktif modüller (Registry) yeniden yükleniyor...`);

        // Test ve Karantina Aşaması (Modül Çökerse Silme, Devre Dışı Bırak)
        try {
            // Hot reload cache temizliği
            delete require.cache[require.resolve(indexPath)];
            // Derlemeye/import etmeye çalış
            const testLoad = require(indexPath);
            
            // Başarılıysa sisteme kaydet
            notify(`[OK] Modül derlemesi başarılı: ${moduleName}`);
            
            // Tüm modülleri baştan tara
            loadModules();

            notify(`[TAMAMLANDI] Modül sisteme entegre edildi ve şu an kullanılabilir durumda!`);
            return { success: true, message: `Modül '${moduleName}' başarıyla entegre edildi ve aktif.`, modulePath: moduleDirPath };

        } catch (compileErr: any) {
            // Modül çökerse -> Silme! Sadece .ts.disabled yap ve logla
            const errorMsg = compileErr instanceof Error ? compileErr.message : String(compileErr);
            notify(`[HATA] Modül derleme hatası (${moduleName}): ${errorMsg}`);
            
            // Hatalı dosyayı devre dışı bırak
            const disabledPath = path.join(moduleDirPath, 'index.ts.disabled');
            const errorComment = `/* \n[SİSTEM LOG] Modül Entegrasyon Hatası\nHATA: ${errorMsg}\nErişim devre dışı bırakıldı.\n*/\n\n`;
            
            fs.writeFileSync(disabledPath, errorComment + refactoredCode, 'utf-8');
            fs.unlinkSync(indexPath); // .ts uzantılı olanı kaldır ki registry taramasın

            notify(`[KARANTİNA] Modül 'index.ts.disabled' olarak loglandı ve devre dışı bırakıldı.`);
            return { success: false, message: `Modül koda çevrildi ancak derlenirken çöktü. Dosya 'index.ts.disabled' olarak loglandı.\nHata: ${errorMsg}` };
        }

    } catch (e: any) {
        notify(`[SİSTEM HATASI] ${e.message}`);
        return { success: false, message: e.message };
    }
}
