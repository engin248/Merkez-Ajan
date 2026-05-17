import { ModuleTool } from '../registry';

export const planlama_taktik_olustur: ModuleTool = {
    name: 'planlama_taktik_olustur',
    description: 'Büyük ve karmaşık operasyonları alt görevlere (aşamalar) bölerek taktiksel bir yol haritası çıkartır.',
    parameters: {
        type: 'object',
        properties: {
            hedef_gorev: {
                type: 'string',
                description: 'Planlanacak ana görev tanımı.'
            },
            mevcut_ajanlar: {
                type: 'array',
                items: { type: 'string' },
                description: 'Görevde kullanılabilecek ajanların/modüllerin listesi.'
            }
        },
        required: ['hedef_gorev']
    },
    execute: async (args: any) => {
        try {
            const gorev = args.hedef_gorev;
            const ajanlar = args.mevcut_ajanlar || ['Varsayılan Ajanlar'];

            const asama1 = `Analiz ve İstihbarat (${ajanlar[0] || 'Web Arama'})`;
            const asama2 = `Karar ve Senaryo Üretimi (Planlama Modülü)`;
            const asama3 = `İcra ve Raporlama (İlgili Ajan)`;

            const plan = {
                ANA_GOREV: gorev,
                KULLANILABILECEK_AJANLAR: ajanlar,
                ASAMALAR: {
                    1: asama1,
                    2: asama2,
                    3: asama3
                },
                DURUM: 'TAKTİK PLAN OLUŞTURULDU - ONAY BEKLİYOR'
            };

            return {
                success: true,
                output: JSON.stringify(plan, null, 2)
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Planlama modülü hatası: ${error.message}`
            };
        }
    }
};
