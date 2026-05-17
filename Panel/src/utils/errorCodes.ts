/**
 * ══════════════════════════════════════════════════════════════
 * ASKER MOTORU — MERKEZİ HATA KODU SİSTEMİ
 * Her hata kodu nereden, hangi katmandan ve ne türde olduğunu belirtir.
 * 
 * Format: AM-[KATMAN]-[NUMARA]
 *   AM     = Asker Motoru
 *   KATMAN = DB, SRV, LLM, TOOL, SEC, ELC, REG, WS, INT
 *   NUMARA = 3 haneli sıra numarası
 * ══════════════════════════════════════════════════════════════
 */

// ─── HATA KODLARI ───
export const ErrorCodes = {
    // ── VERİTABANI (DB) ──
    DB_CONNECTION_FAILED:   { code: 'AM-DB-001', message: 'Veritabanı bağlantısı kurulamadı' },
    DB_QUERY_FAILED:        { code: 'AM-DB-002', message: 'Veritabanı sorgusu başarısız' },
    DB_AGENT_NOT_FOUND:     { code: 'AM-DB-003', message: 'Ajan veritabanında bulunamadı' },
    DB_SAVE_FAILED:         { code: 'AM-DB-004', message: 'Veritabanına kayıt yazılamadı' },
    DB_TRANSACTION_FAILED:  { code: 'AM-DB-005', message: 'Veritabanı transaction hatası' },

    // ── SUNUCU (SRV) ──
    SRV_START_FAILED:       { code: 'AM-SRV-001', message: 'Sunucu başlatılamadı' },
    SRV_ROUTE_NOT_FOUND:    { code: 'AM-SRV-002', message: 'API endpoint bulunamadı' },
    SRV_REQUEST_PARSE:      { code: 'AM-SRV-003', message: 'İstek gövdesi ayrıştırılamadı' },
    SRV_STATIC_FILE:        { code: 'AM-SRV-004', message: 'Statik dosya okunamadı' },
    SRV_GRAPH_LOAD:         { code: 'AM-SRV-005', message: 'Graph state yüklenemedi' },
    SRV_GRAPH_SAVE:         { code: 'AM-SRV-006', message: 'Graph state kaydedilemedi' },
    SRV_CHAT_HISTORY:       { code: 'AM-SRV-007', message: 'Sohbet geçmişi işlenemedi' },
    SRV_MEMORY_OP:          { code: 'AM-SRV-008', message: 'Agent memory işlemi başarısız' },

    // ── LLM KÖPRÜSÜ (LLM) ──
    LLM_CONNECTION_FAILED:  { code: 'AM-LLM-001', message: 'LLM servisine bağlanılamadı' },
    LLM_TIMEOUT:            { code: 'AM-LLM-002', message: 'LLM isteği zaman aşımına uğradı' },
    LLM_PARSE_ERROR:        { code: 'AM-LLM-003', message: 'LLM yanıtı ayrıştırılamadı' },
    LLM_API_KEY_MISSING:    { code: 'AM-LLM-004', message: 'API anahtarı .env dosyasında tanımlı değil' },
    LLM_FALLBACK_FAILED:    { code: 'AM-LLM-005', message: 'Yedek model de yanıt veremedi' },
    LLM_RETRY_EXHAUSTED:    { code: 'AM-LLM-006', message: 'Tüm tekrar denemeleri tükendi' },

    // ── ARAÇ SİSTEMİ (TOOL) ──
    TOOL_NOT_FOUND:         { code: 'AM-TOOL-001', message: 'Araç bulunamadı' },
    TOOL_EXEC_FAILED:       { code: 'AM-TOOL-002', message: 'Araç çalıştırma hatası' },
    TOOL_BLOCKED:           { code: 'AM-TOOL-003', message: 'Tehlikeli komut engellendi' },
    TOOL_LOOP_DETECTED:     { code: 'AM-TOOL-004', message: 'Sonsuz araç döngüsü algılandı' },
    TOOL_TIMEOUT:           { code: 'AM-TOOL-005', message: 'Araç zaman aşımına uğradı' },

    // ── GÜVENLİK (SEC) ──
    SEC_PERMISSION_DENIED:  { code: 'AM-SEC-001', message: 'İzin reddedildi' },
    SEC_BLOCKED_COMMAND:    { code: 'AM-SEC-002', message: 'Güvenlik filtresi komutu engelledi' },
    SEC_ENV_MISSING:        { code: 'AM-SEC-003', message: 'Gerekli çevre değişkeni eksik' },

    // ── ELECTRON (ELC) ──
    ELC_WINDOW_FAILED:      { code: 'AM-ELC-001', message: 'Pencere oluşturulamadı' },
    ELC_PRELOAD_FAILED:     { code: 'AM-ELC-002', message: 'Preload köprüsü yüklenemedi' },
    ELC_IPC_ERROR:          { code: 'AM-ELC-003', message: 'IPC iletişim hatası' },

    // ── MODÜL REGİSTRY (REG) ──
    REG_LOAD_FAILED:        { code: 'AM-REG-001', message: 'Modül yüklenemedi' },
    REG_INVALID_MODULE:     { code: 'AM-REG-002', message: 'Geçersiz modül formatı' },

    // ── WEBSOCKET (WS) ──
    WS_CONNECTION_FAILED:   { code: 'AM-WS-001', message: 'WebSocket bağlantısı kurulamadı' },
    WS_SEND_FAILED:         { code: 'AM-WS-002', message: 'WebSocket mesajı gönderilemedi' },

    // ── INTERCEPTOR (INT) ──
    INT_EXEC_FAILED:        { code: 'AM-INT-001', message: 'Interceptor komut çalıştırma hatası' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCodes;

/**
 * Hata kodu ile yapılandırılmış hata nesnesi oluşturur.
 * @param errorKey - ErrorCodes anahtarı
 * @param detail - Ek detay mesajı
 * @param originalError - Orijinal hata nesnesi
 */
export function createError(errorKey: ErrorCodeKey, detail?: string, originalError?: unknown): AppError {
    const def = ErrorCodes[errorKey];
    return new AppError(def.code, def.message, detail, originalError);
}

/**
 * Yapılandırılmış hata sınıfı — hata kodu, kaynak ve detay içerir.
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly detail?: string;
    public readonly originalError?: unknown;
    public readonly timestamp: string;

    constructor(code: string, message: string, detail?: string, originalError?: unknown) {
        super(`[${code}] ${message}${detail ? ': ' + detail : ''}`);
        this.code = code;
        this.detail = detail;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
        this.name = 'AppError';
    }

    /** JSON serialize edilebilir hata nesnesi */
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            detail: this.detail,
            timestamp: this.timestamp,
        };
    }
}

/**
 * Bilinmeyen bir hatadan hata kodu çıkartır (catch bloklarında kullanım için)
 */
export function extractErrorMessage(err: unknown): string {
    if (err instanceof AppError) return err.message;
    if (err instanceof Error) return err.message;
    return String(err);
}
