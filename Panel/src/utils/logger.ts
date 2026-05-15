import * as fs from 'fs';
import * as path from 'path';

// Log seviyeleri ve renkleri (Terminal için)
const LogLevels = {
    TRACE: { level: 0, label: 'TRACE', color: '\x1b[90m' }, // Gri
    DEBUG: { level: 1, label: 'DEBUG', color: '\x1b[36m' }, // Cyan
    INFO:  { level: 2, label: 'INFO',  color: '\x1b[32m' }, // Yeşil
    WARN:  { level: 3, label: 'WARN',  color: '\x1b[33m' }, // Sarı
    ERROR: { level: 4, label: 'ERROR', color: '\x1b[31m' }, // Kırmızı
};

const RESET_COLOR = '\x1b[0m';

// Log dosyası dizini ve ayarları
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Günlük log dosyası ismi oluşturma fonksiyonu
function getLogFilePath() {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logDir, `asker_motoru_${dateStr}.log`);
}

// Global minimum log seviyesi
const MIN_LOG_LEVEL = LogLevels.TRACE.level;

// Subscribers for WebSocket broadcasting
type LogSubscriber = (logData: any) => void;
const subscribers: LogSubscriber[] = [];

export function subscribeToLogs(callback: LogSubscriber) {
    subscribers.push(callback);
}

// Formatlama
function formatMessage(levelObj: any, moduleName: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    
    // Dosya için (Renksiz)
    const fileLog = `[${timestamp}] [${levelObj.label}] [${moduleName}] ${message}${metaStr}\n`;
    
    // Konsol için (Renkli)
    const consoleLog = `${levelObj.color}[${timestamp}] [${levelObj.label}] [${moduleName}] ${message}${metaStr}${RESET_COLOR}`;
    
    return { timestamp, fileLog, consoleLog };
}

// Dosyaya senkron append
function writeToFile(logStr: string) {
    const logFile = getLogFilePath();
    try { 
        fs.appendFileSync(logFile, logStr); 
    } catch (err) {
        console.error('[LOGGER_ERROR] Log dosyasına yazılamadı:', err);
    }
}

function log(levelObj: any, moduleName: string, message: string, meta?: any) {
    if (levelObj.level < MIN_LOG_LEVEL) return;
    
    const { timestamp, fileLog, consoleLog } = formatMessage(levelObj, moduleName, message, meta);
    
    // Terminal'e yazdır
    if (levelObj.level >= LogLevels.ERROR.level) {
        console.error(consoleLog);
    } else if (levelObj.level === LogLevels.WARN.level) {
        console.warn(consoleLog);
    } else {
        console.log(consoleLog);
    }
    
    // Dosyaya yazdır
    writeToFile(fileLog);

    // Abonelere gönder (WebSocket için)
    const logData = {
        timestamp,
        level: levelObj.label,
        module: moduleName,
        message,
        meta
    };
    for (const sub of subscribers) {
        sub(logData);
    }
}

// Logger Sınıfı (Örneklenebilir)
export class Logger {
    private moduleName: string;

    constructor(moduleName: string) {
        this.moduleName = moduleName;
    }

    trace(message: string, meta?: any) { log(LogLevels.TRACE, this.moduleName, message, meta); }
    debug(message: string, meta?: any) { log(LogLevels.DEBUG, this.moduleName, message, meta); }
    info(message: string, meta?: any) { log(LogLevels.INFO, this.moduleName, message, meta); }
    warn(message: string, meta?: any) { log(LogLevels.WARN, this.moduleName, message, meta); }
    error(message: string, meta?: any) { log(LogLevels.ERROR, this.moduleName, message, meta); }
}

// Varsayılan global logger örneği
export const systemLogger = new Logger('SYSTEM');
