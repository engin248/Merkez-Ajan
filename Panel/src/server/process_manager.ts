import { spawn } from 'child_process';
import * as path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('ProcessManager');

// ZMQ ve Python servisleri native Node.js geçişi ile kaldırıldı.
// Artık nut-js ve doğrudan backend API'leri kullanılmaktadır.

export function cleanupProcesses() {
    logger.info("Cleaning up processes...");
    // Native Node.js geçişi sonrası temizlenecek özel child process kalmadı.
}

export function startOllamaService() {
    logger.info("Checking/Starting Ollama AI Engine...");
    const ollamaProcess = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
    ollamaProcess.on('error', () => { 
        logger.warn("Ollama engine not found or failed to start."); 
    });
    ollamaProcess.unref();
}

// Boş fonksiyonlar (Diğer modüllerde hata oluşmaması için şimdilik tutuluyor)
export function startZMQBridge() { logger.debug("ZMQ Bridge (Deprecated/Native)"); }
export function startVoiceEngine() { logger.debug("Voice Engine (Native/WebSpeech API)"); }
export function scheduleZMQRestart() {}
export function startRVCServer() { logger.debug("RVC Server (Deprecated/Native)"); }
export function sendToZmq(payload: string) { 
    logger.debug("sendToZmq called (Deprecated)", { payload: payload.substring(0, 20) });
    return true; 
}
