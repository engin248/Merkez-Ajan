export const chatAnti = document.getElementById('chat-anti');
export const chatKomutan = document.getElementById('chat-komutan');
export const chatChatGPT = document.getElementById('chat-chatgpt');
export const cmdInput = document.getElementById('cmd-input') as HTMLInputElement;

import { Logger } from '../utils/logger';
const logger = new Logger('ChatHandler');

export function timeStamp() {
    return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function parseMarkdown(text: string) {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
    
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/(?<!["=])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    html = html.replace(/^---+$/gm, '<hr>');
    
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    html = html.replace(/\n{2,}/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

export function addMessage(container: HTMLElement | null, text: string, type: string) {
    if (!container) return;
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    
    if (type === 'ai' || type === 'anti-msg' || type === 'gpt-msg') {
        div.innerHTML = parseMarkdown(text);
    } else {
        div.textContent = text;
    }

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = timeStamp();
    div.appendChild(time);

    container.appendChild(div);

    requestAnimationFrame(() => {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    });
}

let typingCounter = 0;
export function addTyping(container: HTMLElement | null) {
    if (!container) return '';
    const id = 'typing-' + (++typingCounter);
    const div = document.createElement('div');
    div.className = 'msg system';
    div.id = id;
    div.innerHTML = '<span class="typing-dots">Düşünüyor<span>.</span><span>.</span><span>.</span></span>';
    div.style.cssText = 'animation: typingPulse 1.5s ease-in-out infinite;';
    container.appendChild(div);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    return id;
}

export function removeTyping(id: string) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

export function speak(text: string) {
    logger.debug(`Seslendirme isteği gönderiliyor: ${text.substring(0, 30)}...`);
    fetch('/api/konus', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ metin: text })
    }).catch((e) => {
        logger.error('Seslendirme API hatası:', e.message);
    });
}

export async function consultChatGPT(userMsg: string, agentMsg: string) {
    const typingId = addTyping(chatChatGPT);
    logger.info('ChatGPT Yüksek İstişare Katmanı çağrılıyor...');
    const startTime = performance.now();

    try {
        const activeModelName = localStorage.getItem('activeModelName') || 'Qwen 2.5 (Merkez)';
        const gptPrompt = `Sen ChatGPT (Yüksek İstişare Katmanı) rolündesin. Komutanın "${userMsg}" emrine ve ${activeModelName} ajanının "${agentMsg}" yanıtına stratejik bir yorum yap. Kısa ve öz ol.`;

        const res = await fetch('/api/sohbet', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: gptPrompt, model: 'qwen3:8b' })
        });
        const responseText = await res.text();

        removeTyping(typingId);

        if (responseText) {
            addMessage(chatChatGPT, responseText, 'gpt-msg');
            logger.debug(`ChatGPT yanıtı alındı (${Math.round(performance.now() - startTime)}ms)`);
        }
    } catch (e: any) {
        removeTyping(typingId);
        logger.error('ChatGPT İstişare Katmanı Hatası:', e.message);
        addMessage(chatChatGPT, "İstişare katmanı çevrimdışı.", "system");
    }
}

export async function sendMessage() {
    const text = cmdInput?.value.trim();
    if (!text) return;

    logger.info(`Komut gönderildi: ${text}`);
    addMessage(chatKomutan, text, 'user');
    if (cmdInput) cmdInput.value = '';

    const typingId = addTyping(chatKomutan);
    const startTime = performance.now();

    try {
        const activeModel = localStorage.getItem('activeModel') || 'qwen3:8b';
        logger.trace(`Sohbet API isteği atılıyor (Model: ${activeModel})...`);
        const res = await fetch('/api/sohbet', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: text, model: activeModel })
        });

        // SSE Stream okuyucu — backend "data: {json}\n\n" formatında gönderiyor
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let sseBuffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || ''; // Son satır eksik olabilir, tamponda tut

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.content) {
                        fullResponse += parsed.content;
                    }
                } catch {
                    // JSON parse hatası — atla
                }
            }
        }

        removeTyping(typingId);

        if (fullResponse) {
            logger.info(`Ajan yanıtı alındı (${Math.round(performance.now() - startTime)}ms)`);
            addMessage(chatKomutan, fullResponse, 'ai');
            addMessage(chatAnti, fullResponse, 'anti-msg');
            speak(fullResponse);
            consultChatGPT(text, fullResponse);
        } else {
            addMessage(chatKomutan, "Yanıt alınamadı.", "system");
        }
    } catch (e: any) {
        removeTyping(typingId);
        logger.error('Sohbet API Hatası:', e.message);
        addMessage(chatKomutan, "Bağlantı kurulamadı. Sunucu çevrimdışı olabilir.", "system");
    }
}
