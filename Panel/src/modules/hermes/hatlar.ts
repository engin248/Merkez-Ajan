import { EventEmitter } from 'events';

export type HatAdi = 'RED_LINE_TASKS' | 'LOG_LINE' | 'DATA_LINE';

export interface HatMesaji {
    id: string;
    gonderen: string;
    hedef?: string;
    icerik: any;
    zamanDamgasi: string;
    oncelik: 'DUSUK' | 'NORMAL' | 'YUKSEK' | 'KRITIK';
}

class HatYoneticisi extends EventEmitter {
    private kuyruklar: Record<HatAdi, HatMesaji[]> = {
        RED_LINE_TASKS: [],
        LOG_LINE: [],
        DATA_LINE: []
    };

    private istatistikler = {
        RED_LINE_TASKS: { islenen: 0, bekleyen: 0 },
        LOG_LINE: { islenen: 0, bekleyen: 0 },
        DATA_LINE: { islenen: 0, bekleyen: 0 }
    };

    /**
     * İlgili hatta yeni bir mesaj (mermi) bırakır.
     */
    public push(hat: HatAdi, mesaj: Omit<HatMesaji, 'id' | 'zamanDamgasi'>): string {
        if (!this.kuyruklar[hat]) {
            throw new Error(`Geçersiz hat adı: ${hat}`);
        }

        const tamMesaj: HatMesaji = {
            ...mesaj,
            id: `MSG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            zamanDamgasi: new Date().toISOString()
        };

        this.kuyruklar[hat].push(tamMesaj);
        
        // Önceliğe göre sırala (KRITIK -> DUSUK)
        const oncelikDegeri = { KRITIK: 4, YUKSEK: 3, NORMAL: 2, DUSUK: 1 };
        this.kuyruklar[hat].sort((a, b) => oncelikDegeri[b.oncelik] - oncelikDegeri[a.oncelik]);

        this.istatistikler[hat].bekleyen = this.kuyruklar[hat].length;

        // Asenkron dinleyicilere (ajanlara) olayı haber ver
        this.emit(`yeni_mesaj_${hat}`, tamMesaj);

        return tamMesaj.id;
    }

    /**
     * İlgili hattan sıradaki mesajı çeker (pop).
     */
    public pop(hat: HatAdi): HatMesaji | null {
        if (!this.kuyruklar[hat]) {
            throw new Error(`Geçersiz hat adı: ${hat}`);
        }

        const mesaj = this.kuyruklar[hat].shift();
        if (mesaj) {
            this.istatistikler[hat].islenen++;
            this.istatistikler[hat].bekleyen = this.kuyruklar[hat].length;
            return mesaj;
        }

        return null;
    }

    /**
     * Tüm hatların anlık sağlık durumunu ve kuyruk yoğunluğunu verir.
     */
    public durumRaporu() {
        return {
            zaman: new Date().toISOString(),
            hatlar: this.istatistikler,
            aktif_dinleyiciler: {
                RED_LINE_TASKS: this.listenerCount('yeni_mesaj_RED_LINE_TASKS'),
                LOG_LINE: this.listenerCount('yeni_mesaj_LOG_LINE'),
                DATA_LINE: this.listenerCount('yeni_mesaj_DATA_LINE')
            }
        };
    }
}

// Singleton Pattern (Kovan boyunca tek bir merkez olacak)
export const HermesHatYoneticisi = new HatYoneticisi();
