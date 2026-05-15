// Log seviyeleri ve CSS renkleri (Tarayıcı için)
const LogLevels = {
    TRACE: { level: 0, label: 'TRACE', color: '#808080' },
    DEBUG: { level: 1, label: 'DEBUG', color: '#00bcd4' },
    INFO:  { level: 2, label: 'INFO',  color: '#4caf50' },
    WARN:  { level: 3, label: 'WARN',  color: '#ff9800' },
    ERROR: { level: 4, label: 'ERROR', color: '#f44336' },
};

const MIN_LOG_LEVEL = LogLevels.TRACE.level;

// Subscribers for UI console
type LogSubscriber = (logData: any) => void;
const subscribers: LogSubscriber[] = [];

export function subscribeToLogs(callback: LogSubscriber) {
    subscribers.push(callback);
}

function log(levelObj: any, moduleName: string, message: string, meta?: any) {
    if (levelObj.level < MIN_LOG_LEVEL) return;

    const fullTimestamp = new Date().toISOString();
    const timestamp = fullTimestamp.split('T')[1].slice(0, -1);
    
    // Konsol stili: [14:32:01.123] [DEBUG] [Modül] Mesaj
    const cssTimestamp = `color: #aaa; font-weight: normal;`;
    const cssLabel = `color: ${levelObj.color}; font-weight: bold; padding: 2px 4px; border-radius: 3px; border: 1px solid ${levelObj.color}44; background: ${levelObj.color}11;`;
    const cssModule = `color: #fff; font-weight: bold; background: #333; padding: 2px 4px; border-radius: 3px;`;
    const cssMessage = `color: inherit; font-weight: normal;`;

    const args: any[] = [
        `%c[${timestamp}] %c${levelObj.label}%c %c[${moduleName}]%c ${message}`,
        cssTimestamp,
        cssLabel,
        '', // Space between label and module
        cssModule,
        cssMessage
    ];

    if (meta) args.push(meta);

    if (levelObj.level >= LogLevels.ERROR.level) {
        console.error(...args);
    } else if (levelObj.level === LogLevels.WARN.level) {
        console.warn(...args);
    } else {
        console.log(...args);
    }

    // UI Console abonelerine gönder
    const logData = {
        timestamp: fullTimestamp,
        level: levelObj.label,
        module: moduleName,
        message,
        meta,
        source: 'frontend'
    };
    for (const sub of subscribers) {
        sub(logData);
    }
}

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
