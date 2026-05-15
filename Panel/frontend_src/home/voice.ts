// @ts-nocheck
import { agentMap } from './ui.ts';
// ═══════════════════════════════════════════════════════════
// VOICE CHAT SYSTEM — INLINE (No Overlay)
// ═══════════════════════════════════════════════════════════
export function initVoiceChat() {
    const triggerBtn = document.getElementById('voiceBtn');
    const statusEl = document.getElementById('voiceStatus');
    const transcript = document.getElementById('voiceTranscript');
    const infoPanel = document.getElementById('voiceInfo');

    if (!triggerBtn) return;

    // ─── SCI-FI VISUALIZER (HUD) INJECTION ───
    const visualizerDiv = document.getElementById('centerVoiceVisualizer');
    if (visualizerDiv) {
        visualizerDiv.innerHTML = '';
        const barCount = 41; 
        const centerIndex = Math.floor(barCount / 2);
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'v-bar';
            const dist = Math.abs(i - centerIndex);
            bar.style.animationDelay = (dist * 0.05) + 's';
            visualizerDiv.appendChild(bar);
        }
    }
    let isListening = false;
    let isActive = false;
    let currentState = 'idle'; // idle, listening, processing, speaking
    
    // NEW AUDIO PIPELINE VARIABLES
    let audioContext = null;
    let microphone = null;
    let workletNode = null;
    let sttSocket = null;
    let mediaStream = null;  // Cached — reused across start/stop cycles

    // ── State Management ──
    function setState(state) {
        currentState = state;
        triggerBtn.className = 'voice-trigger ' + (state !== 'idle' ? state : '');
        statusEl.className = 'voice-info-status ' + state;

        // BEYİN VE FREKANS ANİMASYONLARI
        const brain = document.querySelector('.brain-img');
        if (brain) {
            brain.className = 'brain-img'; // Sınıfı temizle
            if (state !== 'idle' && state !== 'listening') brain.classList.add('state-' + state);
            if (state === 'listening') brain.classList.add('state-listening');
        }
        
        // AKTİF AJAN (ARMOR LAYERS) ANİMASYONU
        const activeCircle = document.querySelector('.armor-circle.is-active');
        if (activeCircle) {
            activeCircle.classList.remove('active-processing', 'active-speaking');
            if (state === 'processing') activeCircle.classList.add('active-processing');
            if (state === 'speaking') activeCircle.classList.add('active-speaking');
        }
        
        // MERKEZ SES EFEKTİ (VISUALIZER)
        const visualizer = document.getElementById('centerVoiceVisualizer');
        if (visualizer) {
            visualizer.className = 'center-voice-visualizer';
            if (state === 'speaking' || state === 'processing') {
                visualizer.classList.add(state);
            }
        }
        
        const waves = document.querySelectorAll('.wave');
        waves.forEach(w => {
            if (state === 'speaking') { w.style.animationDuration = '0.15s'; w.style.background = 'var(--green)'; }
            else if (state === 'processing') { w.style.animationDuration = '1.5s'; w.style.background = '#ffaa00'; }
            else { w.style.animationDuration = '0.8s'; w.style.background = 'var(--cyan)'; }
        });

        // ═══ HOLOGRAPHIC SUBTITLE BAR ═══
        const holoSub = document.getElementById('holoSubtitle');
        if (holoSub) {
            holoSub.className = 'holo-subtitle';
            if (state === 'speaking') {
                holoSub.classList.add('active');
            } else if (state === 'processing') {
                holoSub.classList.add('active', 'processing');
                startProcessingMessages();
            } else {
                stopProcessingMessages();
                setHoloSubtitle('');
            }
        }

        // ═══ SOUND WAVE BURST ═══
        if (state === 'speaking') {
            spawnSoundBurst(false);
        } else if (state === 'processing') {
            spawnSoundBurst(true);
        }

        // ═══ HUD PANEL MODE ═══
        const hudPanels = document.querySelectorAll('.hud-telemetry');
        hudPanels.forEach(p => {
            p.classList.remove('transmitting', 'hud-processing');
            if (state === 'speaking') p.classList.add('transmitting');
            if (state === 'processing') p.classList.add('hud-processing');
        });

        // ═══ BODY AMBIENT GLOW ═══
        document.body.classList.remove('speaking-mode', 'processing-mode');
        if (state === 'speaking') document.body.classList.add('speaking-mode');
        if (state === 'processing') document.body.classList.add('processing-mode');

        // ═══ PROCESSING OVERDRIVE MODE ═══
        const brainWrap = document.querySelector('.brain-wrap');
        const hexContainer = document.querySelector('.hex-container');
        if (brainWrap) brainWrap.classList.remove('overdrive');
        if (hexContainer) hexContainer.classList.remove('scan-active');
        
        if (state === 'processing') {
            // Beyin overdrive modu
            if (brainWrap) brainWrap.classList.add('overdrive');
            // Tarama ışını aktif
            if (hexContainer) hexContainer.classList.add('scan-active');
            // Tüm constellation düğümlerinden veri patlaması
            startConstellationBurst();
            // Data rain yoğunlaştır
            intensifyDataRain(true);
        } else {
            stopConstellationBurst();
            intensifyDataRain(false);
        }

        switch (state) {
            case 'idle':
                statusEl.textContent = 'HAZIR';
                if (!isActive) infoPanel.classList.remove('visible');
                break;
            case 'listening':
                statusEl.textContent = '🎤 DİNLENİYOR...';
                infoPanel.classList.add('visible');
                break;
            case 'processing':
                statusEl.textContent = '⚡ ÇALIŞIYOR...';
                infoPanel.classList.add('visible');
                break;
            case 'speaking':
                statusEl.textContent = '🔊 KONUŞUYOR...';
                infoPanel.classList.add('visible');
                break;
        }
    }

    // ═══ PROCESSING MODE — ROTATING TASK MESSAGES ═══
    const TASK_MESSAGES = [
        'VERİ TOPLANIYOR...',
        'KAYNAKLAR ANALİZ EDİLİYOR...',
        'NEURAL AĞ AKTİF...',
        'WEB TARAMASI DEVAM EDİYOR...',
        'SONUÇLAR DERLENİYOR...',
        'BİLGİ FİLTRELENİYOR...',
        'ÇOKLU MODEL SENKRON...',
        'DERİN ANALİZ YAPILIYOR...',
        'VERİ ÇAPRAZ KONTROL...',
        'YANIT HAZIRLANIYOR...',
    ];
    let processingMsgInterval = null;
    let processingMsgIdx = 0;

    function startProcessingMessages() {
        processingMsgIdx = 0;
        setHoloSubtitle(TASK_MESSAGES[0]);
        processingMsgInterval = setInterval(() => {
            processingMsgIdx = (processingMsgIdx + 1) % TASK_MESSAGES.length;
            setHoloSubtitle(TASK_MESSAGES[processingMsgIdx]);
        }, 2500);
    }

    function stopProcessingMessages() {
        if (processingMsgInterval) {
            clearInterval(processingMsgInterval);
            processingMsgInterval = null;
        }
    }

    // ═══ CONSTELLATION BURST (All nodes fire during processing) ═══
    let constellationBurstInterval = null;
    
    function startConstellationBurst() {
        stopConstellationBurst();
        // Tüm düğümleri aktif göster
        for (let i = 1; i <= 7; i++) {
            const node = document.getElementById(`modelNode_${i}`);
            const line = document.getElementById(`cLine_${i}`);
            if (node) node.classList.add('active-node');
            if (line) line.classList.add('active-line');
        }
        // Hızlı data flow — her 600ms'de rastgele düğümden beyne veri
        constellationBurstInterval = setInterval(() => {
            fireConstellationData();
        }, 600);
    }

    function stopConstellationBurst() {
        if (constellationBurstInterval) {
            clearInterval(constellationBurstInterval);
            constellationBurstInterval = null;
        }
        // Sadece aktif ajanı bırak, diğerlerini söndür
        const activeIdx = getCurrentActiveAgent();
        updateConstellationActive(activeIdx);
    }

    function fireConstellationData() {
        const svg = document.getElementById('neuralConstellationSvg');
        if (!svg) return;
        const ns = 'http://www.w3.org/2000/svg';
        const hexContainer = svg.parentElement;
        if (!hexContainer) return;
        const w = hexContainer.offsetWidth;
        const h = hexContainer.offsetHeight;
        const cx = w / 2;
        const cy = h / 2;

        // Rastgele 2-3 düğümden aynı anda veri gönder
        const fireCount = 2 + Math.floor(Math.random() * 2);
        for (let f = 0; f < fireCount; f++) {
            const idx = Math.floor(Math.random() * 7) + 1;
            const nodeEl = document.getElementById(`modelNode_${idx}`);
            if (!nodeEl) continue;
            const agent = agentMap[idx];

            // Node'un pozisyonunu al
            const left = parseFloat(nodeEl.style.left) / 100 * w;
            const top = parseFloat(nodeEl.style.top) / 100 * h;

            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('cx', left);
            dot.setAttribute('cy', top);
            dot.setAttribute('r', '2');
            dot.setAttribute('fill', agent.color);
            dot.style.filter = `drop-shadow(0 0 4px ${agent.color})`;
            dot.style.opacity = '0.7';
            svg.appendChild(dot);

            const start = performance.now();
            const dur = 800 + Math.random() * 400;
            function move(now) {
                const t = Math.min((now - start) / dur, 1);
                const e = t * t * (3 - 2 * t);
                dot.setAttribute('cx', left + (cx - left) * e);
                dot.setAttribute('cy', top + (cy - top) * e);
                dot.setAttribute('r', 2 - t * 1.2);
                dot.style.opacity = (1 - t * 0.6) * 0.7;
                if (t < 1) requestAnimationFrame(move);
                else dot.remove();
            }
            requestAnimationFrame(move);
        }
    }

    // ═══ DATA RAIN INTENSIFICATION ═══
    let dataRainBoostInterval = null;

    function intensifyDataRain(active) {
        if (dataRainBoostInterval) {
            clearInterval(dataRainBoostInterval);
            dataRainBoostInterval = null;
        }
        const container = document.getElementById('dataRainContainer');
        if (!container) return;
        if (active) {
            // 3x daha hızlı data rain
            dataRainBoostInterval = setInterval(() => {
                for (let i = 0; i < 3; i++) {
                    const el = document.createElement('div');
                    el.className = 'data-rain';
                    const type = Math.random();
                    if (type < 0.4) { el.textContent = '0x' + randomHex(4); }
                    else if (type < 0.7) {
                        let bin = '';
                        for (let b = 0; b < 8; b++) bin += Math.random() > 0.5 ? '1' : '0';
                        el.textContent = bin;
                    } else {
                        el.textContent = DATA_FRAGMENTS[Math.floor(Math.random() * DATA_FRAGMENTS.length)];
                    }
                    el.style.left = `${5 + Math.random() * 90}%`;
                    el.style.animationDuration = `${1.5 + Math.random() * 2.5}s`;
                    el.style.color = Math.random() > 0.5 ? 'rgba(255, 170, 0, 0.3)' : 'rgba(0, 212, 255, 0.25)';
                    container.appendChild(el);
                    setTimeout(() => el.remove(), 5000);
                }
            }, 150);
        }
    }

    // ── SOUND BURST SPAWNER ──
    function spawnSoundBurst(isProcessing) {
        const container = document.getElementById('soundBurstContainer');
        if (!container) return;
        const ringCount = isProcessing ? 2 : 4;
        for (let i = 0; i < ringCount; i++) {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'sound-burst-ring' + (isProcessing ? ' processing-burst' : '');
                const size = 80 + i * 40;
                ring.style.width = size + 'px';
                ring.style.height = size + 'px';
                ring.style.animationDuration = (1 + i * 0.3) + 's';
                container.appendChild(ring);
                setTimeout(() => ring.remove(), 2000);
            }, i * 200);
        }
    }

    // ── HOLOGRAPHIC SUBTITLE (TYPEWRITER) ──
    let subtitleTimeout = null;
    function setHoloSubtitle(text) {
        const el = document.getElementById('holoSubtitleText');
        if (!el) return;
        if (subtitleTimeout) clearTimeout(subtitleTimeout);
        
        if (!text) { el.textContent = ''; return; }
        
        el.textContent = '';
        let idx = 0;
        function typeChar() {
            if (idx < text.length) {
                el.textContent += text[idx];
                idx++;
                subtitleTimeout = setTimeout(typeChar, 35 + Math.random() * 25);
            }
        }
        typeChar();
    }

    // Kadın sesi bulucu (Microsoft Emel, Google Türkçe Female vs.)
    function getFemaleTurkishVoice() {
        const voices = window.speechSynthesis.getVoices();
        let femaleVoice = voices.find(v => v.lang.includes('tr') && (v.name.includes('Emel') || v.name.includes('Female')));
        if (!femaleVoice) {
            femaleVoice = voices.find(v => v.lang.includes('tr') && v.name.includes('Google')) || voices.find(v => v.lang.includes('tr'));
        }
        return femaleVoice || null;
    }

    // ── AUDIO QUEUE MANAGER (Condition 4) ──
    class AudioQueueManager {
        queue: string[];
        isPlaying: boolean;
        currentUtterance: any; // Chrome GC bug fix
        constructor() {
            this.queue = [];
            this.isPlaying = false;
            this.currentUtterance = null;
        }

        enqueue(text) {
            if (!text.trim()) return;
            this.queue.push(text.trim());
            if (!this.isPlaying) this.playNext();
        }

        flush() {
            this.queue.length = 0;
            window.speechSynthesis.cancel();
            this.isPlaying = false;
            this.currentUtterance = null;
            // Echo suppression: Resume microphone
            if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
                sttSocket.send(JSON.stringify({ command: 'unmute' }));
            }
            if (currentState === 'speaking' && isActive) {
                setState('listening');
            }
        }

        playNext() {
            if (this.queue.length === 0) {
                this.isPlaying = false;
                this.currentUtterance = null;
                // Echo suppression: Resume microphone immediately
                if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
                    sttSocket.send(JSON.stringify({ command: 'unmute' }));
                }
                // No artificial delay — instant transition back to listening
                if (currentState === 'speaking' && isActive) {
                    setState('listening');
                }
                return;
            }
            
            this.isPlaying = true;
            const text = this.queue.shift();
            
            setState('speaking');
            // Show spoken text in holographic subtitle
            setHoloSubtitle(text);
            
            // Echo suppression: Raise energy threshold while AI speaks
            if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
                sttSocket.send(JSON.stringify({ command: 'mute' }));
            }

            // Periodic sound bursts during speech
            const burstInterval = setInterval(() => {
                if (currentState === 'speaking') spawnSoundBurst(false);
            }, 3000);

            // NATIVE WEB SPEECH API TTS
            const utterance = new SpeechSynthesisUtterance(text);
            this.currentUtterance = utterance; // Keep reference

            const voice = getFemaleTurkishVoice();
            if (voice) utterance.voice = voice;
            utterance.lang = 'tr-TR';
            utterance.rate = 1.05;
            utterance.pitch = 1.1;
            
            utterance.onend = () => { clearInterval(burstInterval); this.playNext(); };
            utterance.onerror = (e) => { 
                console.error("Native TTS error:", e);
                clearInterval(burstInterval); 
                this.playNext(); 
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }
    const ttsManager = new AudioQueueManager();

    // ── STT WebSocket Bağlantısı (GEÇİCİ TEST İÇİN TARAYICI MİKROFONU) ──
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = SpeechRecognition ? new SpeechRecognition() : null;
    if (recognition) {
        recognition.lang = 'tr-TR';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript;
            transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div>`;
            
            // Barge-in (Söz Kesme)
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
                transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">STT İnternet Bağlantısı Hatası! Chrome üzerinden mikrofon kullanmak için internet gerekir.</div>`;
                stopAll();
            }
            if (event.error === 'not-allowed') {
                transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">Mikrofon İzni Reddedildi! Lütfen izin verin.</div>`;
                stopAll();
            }
        };
        recognition.onend = () => { if (isListening) recognition.start(); };
    }

    // ── Start/Stop PCM Audio Stream (Geçici Test) ──
    async function startListening() {
        if (!recognition) {
            alert("Tarayıcınız bu test modunu (Web Speech API) desteklemiyor.");
            return;
        }
        try {
            recognition.start();
        } catch(e) {} // Zaten çalışıyorsa hatayı yoksay
        
        isListening = true;
        isActive = true;
        setState('listening');
        transcript.innerHTML = '';
        triggerBtn.classList.add('active-speech');
    }

    function stopListening() {
        if (isListening) {
            if (recognition) recognition.stop();
            triggerBtn.classList.remove('active-speech');
            isListening = false;
        }
    }

    function stopAll() {
        stopListening();
        ttsManager.flush();
        // Release media stream on full stop
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        isActive = false;
        setState('idle');
        infoPanel.classList.remove('visible');
        transcript.innerHTML = '';
    }

    let ollamaAbortController = null;

    // ── Send to Ollama (Streaming Mode) ──
    async function sendToOllama(text) {
        setState('processing');
        transcript.innerHTML = `<div class="user-said">Sen: "${text}"</div>`;
        
        // Araya girme (Barge-in) için önceki isteği iptal et
        if (ollamaAbortController) {
            ollamaAbortController.abort();
        }
        ollamaAbortController = new AbortController();

        // Clear previous queue
        ttsManager.flush();

        try {
            const selectedModel = document.getElementById('modelSelector') ? document.getElementById('modelSelector').value : 'qwen3:8b';
            const res = await fetch('/api/sohbet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, model: selectedModel }),
                signal: ollamaAbortController.signal
            });

            if (!isActive) return;

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullReply = '';

            transcript.innerHTML = `
                <div class="user-said">Sen: "${text}"</div>
                <div class="ai-said" id="ai-response-stream"></div>
            `;
            const replyDiv = document.getElementById('ai-response-stream');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullReply += chunk;
                if (replyDiv) replyDiv.innerHTML = fullReply;
            }
            
            // Tüm yanıt tek seferde TTS'e gönderiliyor — kesintisiz, akıcı konuşma
            if (fullReply.trim()) {
                ttsManager.enqueue(fullReply.trim());
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Ollama isteği iptal edildi: Kullanıcı konuşmaya devam ediyor (Barge-in)');
                return;
            }
            console.error('Ollama error:', err);
            transcript.innerHTML += `<div class="ai-said" style="color:#ff4444">Bağlantı hatası</div>`;
            setState('idle');
        }
    }

    // ── Event Bindings ──
    triggerBtn.addEventListener('click', () => {
        if (currentState === 'idle') {
            startListening();
        } else {
            stopAll();
        }
    });

    // Double-click to fully stop
    triggerBtn.addEventListener('dblclick', stopAll);

    // Preload voices
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
export {};
