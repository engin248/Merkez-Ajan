export function initVoiceChat() {
    const triggerBtn = document.getElementById('voiceBtn');
    const statusEl = document.getElementById('voiceStatus');
    const transcript = document.getElementById('voiceTranscript');
    const infoPanel = document.getElementById('voiceInfo');
    if (!triggerBtn) return;

    let isListening = false;
    let isActive = false;
    let currentState = 'idle';
    let ollamaAbortController = null;

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
            if (event.error === 'network') {
                transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">STT İnternet Bağlantısı Hatası!</div>`;
                stopAll();
            }
        };
        recognition.onend = () => { if (isListening) recognition.start(); };
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

    async function sendToOllama(text) {
        setState('processing');
        transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div>`;
        if (ollamaAbortController) ollamaAbortController.abort();
        ollamaAbortController = new AbortController();
        ttsManager.flush();

        try {
            const res = await fetch('/api/sohbet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, model: 'qwen3:8b' }),
                signal: ollamaAbortController.signal
            });
            if (!isActive) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullReply = '';
            transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div><div class="ai-said" id="ai-response-stream"></div>`;
            const replyDiv = document.getElementById('ai-response-stream');
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullReply += decoder.decode(value, { stream: true });
                if (replyDiv) replyDiv.innerHTML = fullReply;
            }
            if (fullReply.trim()) ttsManager.enqueue(fullReply.trim());
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Ollama error:', err);
            transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">Bağlantı hatası</div>`;
            setState('idle');
        }
    }

    triggerBtn.addEventListener('click', () => {
        if (currentState === 'idle') startListening();
        else stopAll();
    });
    triggerBtn.addEventListener('dblclick', stopAll);
    window.speechSynthesis.getVoices();
}

document.addEventListener('DOMContentLoaded', initVoiceChat);
