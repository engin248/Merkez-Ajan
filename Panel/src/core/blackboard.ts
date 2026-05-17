import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

const logger = new Logger('Blackboard');

export interface BlackboardEntry {
    id: string;
    type: 'string' | 'object' | 'filepath' | 'buffer';
    data: any;
    created_at: number;
    metadata?: Record<string, any>;
}

export class Blackboard {
    private static instance: Blackboard;
    private memory: Map<string, BlackboardEntry> = new Map();

    private constructor() {}

    public static getInstance(): Blackboard {
        if (!Blackboard.instance) {
            Blackboard.instance = new Blackboard();
        }
        return Blackboard.instance;
    }

    /**
     * Veriyi karatahtaya kaydeder ve geriye referans ID'si döner.
     */
    public write(type: 'string' | 'object' | 'filepath' | 'buffer', data: any, metadata?: Record<string, any>): string {
        const id = `bb_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
        const entry: BlackboardEntry = {
            id,
            type,
            data,
            created_at: Date.now(),
            metadata
        };
        this.memory.set(id, entry);
        logger.info(`Yeni veri karatahtaya yazıldı. Referans: ${id} [Tipi: ${type}]`);
        return id;
    }

    /**
     * Referans ID'si ile veriyi okur.
     */
    public read(id: string): any | null {
        const entry = this.memory.get(id);
        if (!entry) {
            logger.warn(`Karatahta okuma hatası: Kayıt bulunamadı -> ${id}`);
            return null;
        }
        return entry.data;
    }

    /**
     * Entry objesinin tamamını (metadata ile birlikte) okur.
     */
    public readFullEntry(id: string): BlackboardEntry | null {
        return this.memory.get(id) || null;
    }

    /**
     * Bir göreve ait karatahta verilerini siler (Memory Lifecycle - Episodic Memory Silinmesi)
     */
    public delete(id: string): void {
        if (this.memory.has(id)) {
            this.memory.delete(id);
            logger.info(`Veri karatahtadan silindi. Referans: ${id}`);
        }
    }

    /**
     * Karatahtadaki belirli bir yaştan büyük geçici verileri temizler (Garbage Collection)
     */
    public cleanup(maxAgeMs: number = 3600000): void { // Default 1 hour
        const now = Date.now();
        let deletedCount = 0;
        for (const [id, entry] of this.memory.entries()) {
            if (now - entry.created_at > maxAgeMs) {
                this.memory.delete(id);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            logger.info(`Karatahta temizliği tamamlandı. Silinen eski kayıt sayısı: ${deletedCount}`);
        }
    }
}

export const blackboard = Blackboard.getInstance();
