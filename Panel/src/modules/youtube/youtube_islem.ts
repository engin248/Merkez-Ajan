import { exec } from 'child_process';
import { ModuleTool } from '../registry';

export const youtube_islem: ModuleTool = {
    name: 'youtube_islem',
    description: 'YouTube üzerinde arama yapar ve videoyu bulur. Videoyu kullanıcının tarayıcısında açıp oynatabilir veya sadece linkini getirebilir.',
    parameters: {
        type: 'object',
        properties: {
            dusunce: { type: 'string', description: 'Kullanıcının cümlesini nasıl analiz ettiğine ve hangi anahtar kelimeleri neden seçtiğine dair iç sesin/planın.' },
            sorgu: { type: 'string', description: 'TIRNAK İŞARETİ KULLANMA. "adlı şarkıyı" gibi ekleri KESİNLİKLE SİL. SADECE eserin YALIN adını yaz. (Doğru: birisine | Yanlış: "birisine" adlı şarkıyı)' },
            islem: { type: 'string', description: 'Yapılacak işlem. "ac" (videoyu kullanıcının bilgisayarında açar ve oynatır) veya "link_al" (sadece linkini getirir, arka planda kalır). Müzik aç/çal denirse "ac" kullan.', enum: ['ac', 'link_al'] },
            baslangic_saniyesi: { type: 'number', description: 'Video açılacaksa kaçıncı saniyeden başlayacağı (örneğin 1.30 diyorsa 90 saniye). Baştan açılacaksa boş bırakın veya 0 verin.' }
        },
        required: ['dusunce', 'sorgu', 'islem']
    },
    execute: async (args: any) => {
        const { dusunce, islem, baslangic_saniyesi } = args;
        let sorgu = args.sorgu || '';
        
        const copKelimeler = ["adlı", "şarkıyı", "şarkı", "şarkısının", "aç", "açar", "mısın", "lütfen", "dinle", "dinlet", "videosu", "klibi", "dinlemek", "istiyorum", "bana"];
        let kelimeler = sorgu.replace(/["']/g, '').split(/\s+/);
        kelimeler = kelimeler.filter((k: string) => !copKelimeler.includes(k.toLowerCase()));
        sorgu = kelimeler.join(' ').trim();

        console.log(`\n[YOUTUBE AJANI DÜŞÜNÜYOR]: "${dusunce}"`);
        console.log(`[YOUTUBE İŞLEMİ] Temizlenmiş Arama: "${sorgu}", Aksiyon: ${islem}, Saniye: ${baslangic_saniyesi || 0}\n`);
        try {
            const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(sorgu)}`);
            const text = await response.text();
            
            const match = text.match(/"videoId":"([^"]+)"/);
            if (!match) {
                return { success: false, error: 'YouTube aramasi sonuclanmadi, video bulunamadi.' };
            }
            
            const videoId = match[1];
            let fullLink = `https://www.youtube.com/watch?v=${videoId}`;
            
            if (baslangic_saniyesi && baslangic_saniyesi > 0) {
                fullLink += `&t=${baslangic_saniyesi}s`;
            }
            
            if (islem === 'ac') {
                exec(`start "" "${fullLink}"`);
                return { success: true, output: `YouTube'da arama yapildi ve tarayicida ${baslangic_saniyesi ? baslangic_saniyesi + ' saniyesinden baslayarak ' : ''}acildi. Link: ${fullLink}` };
            } else {
                return { success: true, output: `YouTube aramasi basarili. Link: ${fullLink}` };
            }
        } catch (e: any) {
            return { success: false, error: `YouTube aramasi basarisiz: ${e.message}` };
        }
    }
};
