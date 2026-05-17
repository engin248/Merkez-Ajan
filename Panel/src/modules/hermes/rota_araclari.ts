import { ModuleTool } from '../registry';
import { HermesHatYoneticisi, HatAdi } from './hatlar';

export const hermes_hat_push: ModuleTool = {
    name: 'hermes_hat_push',
    description: 'RED_LINE_TASKS (Görev), LOG_LINE (Log) veya DATA_LINE (Veri) hattına yeni bir asenkron mesaj bırakır.',
    parameters: {
        type: 'object',
        properties: {
            hat_adi: {
                type: 'string',
                enum: ['RED_LINE_TASKS', 'LOG_LINE', 'DATA_LINE'],
                description: 'Mesajın bırakılacağı hattın adı.'
            },
            gonderen: {
                type: 'string',
                description: 'Gönderen ajanın veya modülün adı.'
            },
            hedef: {
                type: 'string',
                description: 'Hedef ajan veya modül (opsiyonel).'
            },
            icerik: {
                type: 'string',
                description: 'Mesaj verisi (JSON string formatında veya düz metin).'
            },
            oncelik: {
                type: 'string',
                enum: ['DUSUK', 'NORMAL', 'YUKSEK', 'KRITIK'],
                description: 'Mesajın aciliyet sırası.'
            }
        },
        required: ['hat_adi', 'gonderen', 'icerik']
    },
    execute: async (args: any) => {
        try {
            const mesajId = HermesHatYoneticisi.push(args.hat_adi as HatAdi, {
                gonderen: args.gonderen,
                hedef: args.hedef,
                icerik: args.icerik,
                oncelik: args.oncelik || 'NORMAL'
            });

            return {
                success: true,
                output: JSON.stringify({ islem: 'HATTA_BIRAKILDI', hat: args.hat_adi, mesajId, durum: 'ASENKRON_KUYRUKTA' }, null, 2)
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};

export const hermes_hat_pop: ModuleTool = {
    name: 'hermes_hat_pop',
    description: 'Belirtilen hattın kuyruğundan sıradaki asenkron mesajı çeker (pop).',
    parameters: {
        type: 'object',
        properties: {
            hat_adi: {
                type: 'string',
                enum: ['RED_LINE_TASKS', 'LOG_LINE', 'DATA_LINE'],
                description: 'Mesajın çekileceği hattın adı.'
            }
        },
        required: ['hat_adi']
    },
    execute: async (args: any) => {
        try {
            const mesaj = HermesHatYoneticisi.pop(args.hat_adi as HatAdi);
            if (!mesaj) {
                return { success: true, output: JSON.stringify({ bilgi: 'KUYRUK_BOS', hat: args.hat_adi }) };
            }
            return { success: true, output: JSON.stringify(mesaj, null, 2) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};

export const hermes_hat_durum: ModuleTool = {
    name: 'hermes_hat_durum',
    description: 'Tüm asenkron iç hatların (Görev, Log, Veri) kuyruk doluluk oranlarını ve sağlık durumunu raporlar.',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    execute: async () => {
        return {
            success: true,
            output: JSON.stringify(HermesHatYoneticisi.durumRaporu(), null, 2)
        };
    }
};
