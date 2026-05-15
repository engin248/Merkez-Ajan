// @ts-nocheck
export const agentMap = {
    1: { id: 'qwen3:8b', name: 'QWEN 3 (Merkez)', hue: '160deg', rgb: '255, 40, 40', color: '#ff4444' }, // Kırmızı
    2: { id: 'gemma4', name: 'GEMMA 4 (Kod)', hue: '0deg', rgb: '0, 212, 255', color: '#00d4ff' }, // Cyan
    3: { id: 'qwen3.5', name: 'QWEN 3.5 (Analiz)', hue: '-60deg', rgb: '10, 245, 194', color: '#0af5c2' }, // Neon Yeşil
    4: { id: 'kimi-k2.5:cloud', name: 'KIMI (Derin Arge)', hue: '90deg', rgb: '184, 0, 255', color: '#b800ff' }, // Mor
    5: { id: 'qwen3.5:cloud', name: 'QWEN Cloud (Genel)', hue: '190deg', rgb: '255, 152, 0', color: '#ff9800' }, // Turuncu
    6: { id: 'glm-5.1:cloud', name: 'GLM 5.1 (Strateji)', hue: '-120deg', rgb: '255, 215, 0', color: '#ffd700' }, // Sarı
    7: { id: 'minimax-m2.7:cloud', name: 'MINIMAX (Hızlı)', hue: '120deg', rgb: '255, 0, 255', color: '#ff00ff' } // Pembe
};
function selectAgent(index) {
    const agent = agentMap[index];
    if (!agent) return;
    
    // Dropdown'u güncelle
    const sel = document.getElementById('modelSelector');
    if (sel) sel.value = agent.id;
    
    // Ana Başlığı (H1) Güncelle
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) {
        mainTitle.innerHTML = `ASKER MOTORU // <span style="color: ${agent.color}; text-shadow: 0 0 10px ${agent.color}, 0 0 20px ${agent.color};">${agent.name.toUpperCase()}</span>`;
    }
    
    // Aktif Modeli localStorage'a kaydet (Kurul Masası index.html için)
    localStorage.setItem('activeModel', agent.id);
    localStorage.setItem('activeModelName', agent.name);
    
    // Beyin Rengini Değiştir
    document.documentElement.style.setProperty('--brain-hue', agent.hue);
    document.documentElement.style.setProperty('--brain-rgb', agent.rgb);
    
    // Görsel vurguyu güncelle
    for (let i = 1; i <= 30; i++) {
        const cell = document.getElementById(`armorCell_${i}`);
        if (!cell) continue;
        const circle = cell.querySelector('.armor-circle');
        const label = cell.querySelector('.armor-label');
        
        if (i === index) {
            circle.style.borderColor = agent.color;
            circle.style.color = agent.color;
            circle.style.boxShadow = `0 0 15px rgba(${agent.rgb},0.8), inset 0 0 10px rgba(${agent.rgb},0.3)`;
            label.style.color = agent.color;
            label.style.textShadow = `0 0 5px ${agent.color}`;
            circle.classList.add('is-active');
        } else {
            circle.style.borderColor = '';
            circle.style.color = '';
            circle.style.boxShadow = '';
            label.style.color = '';
            label.style.textShadow = '';
            circle.classList.remove('is-active', 'active-processing', 'active-speaking');
        }
    }
    
    // Log Bas
    const feed = document.getElementById('verticalLogs');
    if (feed) {
        const ts = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        entry.className = 'vlog-entry';
        entry.innerHTML = `<span class="ts" style="color:${agent.color};">[${ts}]</span> AGENT SWITCH: ${agent.name} AKTİF`;
        feed.appendChild(entry);
        feed.scrollTop = feed.scrollHeight;
    }
    
    // NEURAL CONSTELLATION — Aktif model düğümünü güncelle
    updateConstellationActive(index);
}

// ─── ARMOR LAYERS GRID (3 rows × 10) ───
export function renderArmorGrid() {
    const grid = document.getElementById('armorGrid');
    grid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const cell = document.createElement('div');
        cell.className = 'armor-cell';
        cell.id = `armorCell_${i}`;

        const circle = document.createElement('div');
        circle.className = 'armor-circle';
        circle.textContent = i;
        circle.title = agentMap[i] ? agentMap[i].name : `Zırh ${i}`;

        const label = document.createElement('div');
        label.className = 'armor-label';
        label.textContent = agentMap[i] ? agentMap[i].name.split(' ')[0] : 'STANDBY';

        if (agentMap[i]) {
            cell.style.cursor = 'pointer';
            cell.onclick = () => selectAgent(i);
        }

        // Ripple efekti
        cell.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.className = 'ripple-burst';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });

        cell.appendChild(circle);
        cell.appendChild(label);
        grid.appendChild(cell);
    }
    // İlk kurulumda Merkez ajanı seçili yap
    setTimeout(() => selectAgent(1), 500);
}

// ─── VERTICAL LOG FEED ───
const LOG_EVENTS = [
    'SYNCING // ARMOR LAYERS ACTIVE',
    'UNIT 04: READY',
    'FIREWALL INITIATED',
    'THREAT SCAN... NO DETECTIONS',
    'ASKER-17: PATROL ROUTE',
    'DEPLOYMENT CONFIRMED',
    'NEURAL NET STABLE',
    'ZMQ BUS: HEARTBEAT OK',
    'HERMES CORE: SYNC COMPLETE',
    'RAM BUS: XSUB/XPUB ACTIVE',
    'VOICE LISTENER: QUEUE IDLE',
    'OLLAMA: MODEL LOADED (llama3.1:8b)',
    'INTEGRITY AUDIT: PASS',
    'WATCHDOG: ALL SERVICES HEALTHY',
    'TELEMETRY BRIDGE: 0 ERRORS',
    'COGNITIVE LOAD: NOMINAL',
    'THREAT LEVEL: MINIMAL',
    'ENCRYPTION LAYER: AES-256 ACTIVE',
    'PATTERN ANALYSIS: COMPLETE',
    'MOTOR ARRAY: 178/178 RESPONSIVE',
];
let logIdx = 0;
function addVerticalLog() {
    const feed = document.getElementById('verticalLogs');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'vlog-entry';

    const now = new Date();
    const ts = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const event = LOG_EVENTS[logIdx % LOG_EVENTS.length];
    logIdx++;

    entry.innerHTML = `<span class="ts">[${ts}]</span> ${event}`;
    feed.appendChild(entry);

    while (feed.children.length > 25) feed.firstElementChild.remove();
    requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
}
