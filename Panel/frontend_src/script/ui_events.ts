import { chatAnti, cmdInput, addMessage, sendMessage } from './chat_handler';
import { Logger } from '../utils/logger';

const logger = new Logger('UIEvents');

// WebSocket Bağlantısı (Telemetri)
let socket;
try {
    socket = new WebSocket('ws://localhost:8086');
    socket.onopen = () => {
        logger.info('[WS] Telemetri bağlantısı aktif');
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.topic) {
            // Log telemetry data at trace level so it doesn't flood the console
            logger.trace(`Telemetri: ${data.topic}`, data.payload);
            // addMessage(chatAnti, `[${data.topic}] ${JSON.stringify(data.payload)}`, 'anti-msg');
        }
    };
    socket.onclose = () => {
        logger.info('[WS] Bağlantı kesildi');
    };
} catch(e: any) {
    logger.warn('[WS] Bağlantı kurulamadı', e.message);
}

// UI Güncelleme
export function updateActiveAgentUI() {
    const activeModel = localStorage.getItem('activeModel') || 'qwen3:8b';
    const selector = document.getElementById('komutaModelSelector') as HTMLSelectElement;
    if (selector && selector.value !== activeModel) {
        selector.value = activeModel;
        logger.debug(`Active agent UI updated to ${activeModel}`);
    }
}

export function initUIEvents() {
    updateActiveAgentUI();

    // Komuta Merkezinden Model Değişimi
    const komutaSelector = document.getElementById('komutaModelSelector') as HTMLSelectElement;
    if (komutaSelector) {
        komutaSelector.addEventListener('change', (e: any) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            localStorage.setItem('activeModel', e.target.value);
            localStorage.setItem('activeModelName', selectedOption.textContent);
            if (typeof (window as any).StateManager !== 'undefined') {
                (window as any).StateManager.setActiveModel(e.target.value, selectedOption.textContent);
            }
            logger.info(`Model değiştirildi: ${selectedOption.textContent} (${e.target.value})`);
            updateActiveAgentUI();
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'activeModelName' || e.key === 'activeModel') {
            updateActiveAgentUI();
        }
    });

    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.addEventListener('click', () => {
        logger.debug('Gönder butonuna tıklandı');
        sendMessage();
    });
    
    if (cmdInput) {
        cmdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                logger.debug('Enter tuşuna basıldı');
                sendMessage();
            }
        });
    }

    // Voice button
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn && 'webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = false;

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('listening')) {
                recognition.stop();
                voiceBtn.classList.remove('listening');
                logger.info('Ses tanıma durduruldu');
            } else {
                recognition.start();
                voiceBtn.classList.add('listening');
                logger.info('Ses tanıma başlatıldı');
            }
        });

        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            logger.debug(`Ses tanındı: ${transcript}`);
            if (cmdInput) cmdInput.value = transcript;
            voiceBtn.classList.remove('listening');
            sendMessage();
        };

        recognition.onend = () => {
            logger.trace('Ses tanıma oturumu sonlandı');
            voiceBtn.classList.remove('listening');
        };
    }

    // Saat Güncelleme
    setInterval(() => {
        const el = document.getElementById('digital-clock');
        if (el) el.textContent = new Date().toLocaleTimeString('tr-TR');
    }, 1000);
}
