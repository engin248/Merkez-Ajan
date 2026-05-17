/**
 * ══════════════════════════════════════════════════════════════
 * ASKER MOTORU — LLM İstek Köprüsü
 * Ollama (yerel) ve Gemini (bulut) LLM API'lerine istek gönderir.
 * ══════════════════════════════════════════════════════════════
 */
import * as http from 'http';
import * as https from 'https';
import { Logger } from '../utils/logger';
import { createError } from '../utils/errorCodes';

const logger = new Logger('LLM-Bridge');

// Retry wrapper — bağlantı hatası veya timeout durumunda tekrar dener
export async function withRetry<T>(fn: () => Promise<T>, retries: number = 1, delayMs: number = 1000): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            if (attempt < retries) {
                logger.warn(`İstek başarısız (deneme ${attempt + 1}/${retries + 1}), ${delayMs}ms sonra tekrar deneniyor...`, err.message);
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                throw err;
            }
        }
    }
    throw createError('LLM_RETRY_EXHAUSTED');
}

/**
 * Evrensel LLM İstek Fonksiyonu
 * Ollama veya Gemini'ye istek gönderir, model adına göre otomatik yönlendirir.
 */
export function universalLlmRequest(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const isGemini = payload.model && payload.model.toLowerCase().includes('gemini');
        
        let reqPayload: any = { ...payload };
        let hostname = 'localhost';
        let port = 11434;
        let reqPath = '/api/chat';
        let headers: any = { 'Content-Type': 'application/json' };
        let protocol: any = http;

        if (isGemini) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) { reject(createError('LLM_API_KEY_MISSING', 'GEMINI_API_KEY')); return; }

            hostname = 'generativelanguage.googleapis.com';
            port = 443;
            const geminiModelName = payload.model || 'gemini-2.5-flash';
            reqPath = `/v1beta/openai/chat/completions`;
            headers['Authorization'] = `Bearer ${apiKey}`;
            protocol = https;

            reqPayload = {
                model: geminiModelName,
                messages: payload.messages,
                stream: false,
                ...(payload.tools ? { tools: payload.tools } : {}),
                ...(payload.options?.temperature !== undefined ? { temperature: payload.options.temperature } : {}),
            };
        }

        const data = JSON.stringify(reqPayload);
        const options = { hostname, port, path: reqPath, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } };

        const oReq = protocol.request(options, (oRes: any) => {
            let body = '';
            oRes.on('data', (chunk: any) => { body += chunk; });
            oRes.on('end', () => {
                try {
                    let parsed = JSON.parse(body);
                    if (isGemini && parsed.choices && parsed.choices.length > 0) {
                        parsed = { message: parsed.choices[0].message };
                    }
                    if (parsed.error && parsed.error.message) {
                        parsed.error = parsed.error.message;
                    }
                    resolve(parsed); 
                }
                catch (e) { reject(createError('LLM_PARSE_ERROR', body.slice(0, 200), e)); }
            });
        });
        oReq.on('error', (err: Error) => reject(createError('LLM_CONNECTION_FAILED', err.message, err)));
        oReq.setTimeout(120000, () => { oReq.destroy(); reject(createError('LLM_TIMEOUT', `${hostname}:${port}${reqPath}`)); });
        oReq.write(data);
        oReq.end();
    });
}
