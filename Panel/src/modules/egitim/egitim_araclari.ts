import { ModuleTool } from '../registry';

export const egitim_beceri_degerlendir: ModuleTool = {
    name: 'egitim_beceri_degerlendir',
    description: 'Bir modülün veya sistemin mevcut becerilerini değerlendirerek eğitim eksiklerini (curriculum) belirler.',
    parameters: {
        type: 'object',
        properties: {
            modul_adi: {
                type: 'string',
                description: 'Eğitim denetimi yapılacak modül adı.'
            },
            hata_sayisi: {
                type: 'number',
                description: 'Son operasyonda alınan hata sayısı (varsa).'
            }
        },
        required: ['modul_adi']
    },
    execute: async (args: any) => {
        try {
            const modul = args.modul_adi;
            const hataSayisi = args.hata_sayisi || 0;
            
            let egitimDurumu = 'EĞİTİM TAMAMLANDI - SIFIR HATA';
            let mufredat = 'Eksik beceri bulunamadı. Operasyonel.';

            if (hataSayisi > 0) {
                egitimDurumu = 'EĞİTİM GEREKLİ - HATALI İŞLEMLER';
                mufredat = `1. Hata Yakalama Pratiği\n2. ${modul} protokollerini yeniden inceleme\n3. Anayasal sınırlar testi`;
            }

            const rapor = {
                MODÜL: modul,
                DURUM: egitimDurumu,
                HATA_SAYISI: hataSayisi,
                MÜFREDAT: mufredat
            };

            return {
                success: true,
                output: JSON.stringify(rapor, null, 2)
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Eğitim modülü hatası: ${error.message}`
            };
        }
    }
};
