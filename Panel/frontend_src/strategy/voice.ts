export function initVoiceChat() {
    const triggerBtn = document.getElementById('voiceBtn')!;
    const statusEl = document.getElementById('voiceStatus')!;
    const transcript = document.getElementById('voiceTranscript')!;
    const infoPanel = document.getElementById('voiceInfo')!;
    if (!triggerBtn || !statusEl || !transcript || !infoPanel) return;

    let isListening = false;
    let isActive = false;
    let currentState = 'idle';
    let ollamaAbortController: AbortController | null = null;

    function setState(state) {
        currentState = state;
        triggerBtn.className = 'voice-trigger ' + (state !== 'idle' ? state : '');
        statusEl.className = 'voice-info-status ' + state;

        switch (state) {
            case 'idle': statusEl.textContent = 'HAZIR'; infoPanel.classList.remove('visible'); break;
            case 'listening': statusEl.textContent = '🎤 DİNLENİYOR...'; infoPanel.classList.add('visible'); break;
            case 'processing': statusEl.textContent = '⚡ ÇALIŞIYOR...'; infoPanel.classList.add('visible'); break;
            case 'speaking': statusEl.textContent = '🔊 KONUŞUYOR...'; infoPanel.classList.add('visible'); break;
        }
    }

    // Kadın sesi bulucu (Microsoft Emel, Google Türkçe Female vs.)
    function getFemaleTurkishVoice() {
        const voices = window.speechSynthesis.getVoices();
        let femaleVoice = voices.find(v => v.lang.includes('tr') && (v.name.includes('Emel') || v.name.includes('Female')));
        if (!femaleVoice) {
            // Eğer isminde Emel/Female geçmiyorsa ilk Google Türkçeyi veya standart Türkçe sesi al
            femaleVoice = voices.find(v => v.lang.includes('tr') && v.name.includes('Google')) || voices.find(v => v.lang.includes('tr'));
        }
        return femaleVoice || null;
    }

    // Audio Queue Manager (Native TTS)
    class AudioQueueManager {
        queue: string[];
        isPlaying: boolean;
        currentUtterance: any; // Chrome GC bug fix
        constructor() { this.queue = []; this.isPlaying = false; this.currentUtterance = null; }
        enqueue(text: string) {
            if (!text.trim()) return;
            this.queue.push(text.trim());
            if (!this.isPlaying) this.playNext();
        }
        flush() {
            this.queue.length = 0;
            window.speechSynthesis.cancel();
            this.isPlaying = false;
            this.currentUtterance = null;
            if (currentState === 'speaking' && isActive) setState('listening');
        }
        playNext() {
            if (this.queue.length === 0) {
                this.isPlaying = false;
                this.currentUtterance = null;
                if (currentState === 'speaking' && isActive) setState('listening');
                return;
            }
            this.isPlaying = true;
            const text = this.queue.shift();
            if (!text) return;
            setState('speaking');

            const utterance = new SpeechSynthesisUtterance(text);
            this.currentUtterance = utterance; // Keep reference
            
            const voice = getFemaleTurkishVoice();
            if (voice) utterance.voice = voice;
            utterance.lang = 'tr-TR';
            utterance.rate = 1.05;
            utterance.pitch = 1.1;

            utterance.onend = () => this.playNext();
            utterance.onerror = (e) => {
                console.error("Native TTS playback error:", e);
                this.playNext();
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }
    const ttsManager = new AudioQueueManager();

    // STT — Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition = SpeechRecognition ? new SpeechRecognition() : null;
    if (recognition) {
        recognition.lang = 'tr-TR';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript;
            transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div>`;
            if (currentState === 'processing' || currentState === 'speaking' || ttsManager.isPlaying) {
                ttsManager.flush();
                if (ollamaAbortController) ollamaAbortController.abort();
                setState('listening');
            }
            sendToOllama(text);
        };
        recognition.onerror = (event) => {
            console.error("SpeechRecognition error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Mikrofon izni verilmedi! Lütfen tarayıcınızın adres çubuğundaki kilit simgesine tıklayıp mikrofon izni verin.");
                stopAll();
            } else if (event.error === 'network') {
                transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">STT İnternet Bağlantısı Hatası!</div>`;
                stopAll();
            } else if (event.error === 'no-speech') {
                // Sessizlik algılandığında kapanmasını engellemek için sessizce devam et
            } else if (event.error === 'aborted') {
                // Kullanıcı manuel durdurduğunda fırlatılır
            }
        };
        recognition.onend = () => { 
            if (isListening) {
                try { recognition.start(); } catch(e) { console.error("Re-start failed", e); }
            }
        };
    }

    async function startListening() {
        if (!recognition) { alert("Tarayıcınız Web Speech API desteklemiyor."); return; }
        try { recognition.start(); } catch(e) {}
        isListening = true; isActive = true;
        setState('listening');
        transcript.innerHTML = '';
    }

    function stopAll() {
        if (isListening && recognition) recognition.stop();
        isListening = false;
        ttsManager.flush();
        isActive = false;
        setState('idle');
        transcript.innerHTML = '';
    }

    async function sendToOllama(text: string) {
        setState('processing');
        transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div>`;
        if (ollamaAbortController) ollamaAbortController.abort();
        ollamaAbortController = new AbortController();
        ttsManager.flush();

        try {
            const res = await fetch('/api/sohbet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, model: 'qwen2.5:14b' }),
                signal: ollamaAbortController.signal
            });
            if (!isActive) return;
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullReply = '';
            let buffer = '';
            transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div><div class="ai-said" id="ai-response-stream"></div>`;
            const replyDiv = document.getElementById('ai-response-stream');
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                // SSE formatını parse et: "data: {...}\n\n" satırlarını çöz
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Son eksik satırı buffer'da tut
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim();
                        if (payload === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(payload);
                            if (parsed.content) fullReply += parsed.content;
                        } catch(e) {
                            // JSON parse hatası — ham metin olarak ekle
                            fullReply += payload;
                        }
                    }
                }
                if (replyDiv) replyDiv.innerHTML = fullReply;
            }
            // TTS için HTML etiketlerini temizle
            const cleanText = fullReply.replace(/<[^>]*>/g, '').trim();
            if (cleanText) ttsManager.enqueue(cleanText);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Ollama error:', err);
            transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">Bağlantı hatası</div>`;
            setState('idle');
        }
    }

    let lastClickTime = 0;
    triggerBtn.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastClickTime < 500) return; // 500ms debounce koruması
        lastClickTime = now;
        
        if (currentState === 'idle') startListening();
        else stopAll();
    });
}

// initVoiceChat() strategy.ts tarafından açıkça çağrılıyor.
// Çift çağrıyı önlemek için DOMContentLoaded listener kaldırıldı.
