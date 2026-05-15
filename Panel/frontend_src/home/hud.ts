// @ts-nocheck
// ═══════════════════════════════════════════════════════════
// HUD TELEMETRY SYSTEM — Data Collection Visual Effects
// ═══════════════════════════════════════════════════════════
const HEX_CHARS = '0123456789ABCDEF';
const DATA_FRAGMENTS = [
    '0xF4A2', '0x8B1C', 'SYN_OK', 'ACK_72', '0xD3E9', 'PKT_IN',
    'CRC_OK', '0x7F0A', 'HASH_V', '0xE621', 'TCP_44', '0xB93F',
    'MEM_R4', '0xA1C8', 'DEC_OK', '0x59D3', 'REG_W2', '0x1E7B',
    'INT_05', '0xCC40', 'BUS_RX', '0x6FA8', 'SYNC', '0x2D91',
    'NOP_00', '0x83E5', 'MOV_AX', '0xFB06', 'JMP_7C', '0x4DA2'
];
function randomHex(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += HEX_CHARS[Math.floor(Math.random() * 16)];
    return s;
}
export function initHudTelemetry() {
    // ── 1. ORBITING DATA RING ──
    const orbitRing = document.getElementById('dataOrbitRing');
    if (orbitRing) {
        const dataCount = 16;
        for (let i = 0; i < dataCount; i++) {
            const el = document.createElement('span');
            el.className = 'orbit-data';
            el.textContent = DATA_FRAGMENTS[Math.floor(Math.random() * DATA_FRAGMENTS.length)];
            
            // Position around the circle
            const angle = (i / dataCount) * 360;
            const rad = angle * (Math.PI / 180);
            // Place on the edge of the ring (50% = center, using transform)
            el.style.left = `${50 + 48 * Math.cos(rad)}%`;
            el.style.top = `${50 + 48 * Math.sin(rad)}%`;
            el.style.transform = `translate(-50%, -50%) rotate(${-angle}deg)`;
            el.style.animationDelay = `${(i / dataCount) * 3}s`;
            
            orbitRing.appendChild(el);
        }
        
        // Periodically change orbit data text
        setInterval(() => {
            const items = orbitRing.querySelectorAll('.orbit-data');
            const idx = Math.floor(Math.random() * items.length);
            items[idx].textContent = DATA_FRAGMENTS[Math.floor(Math.random() * DATA_FRAGMENTS.length)];
            items[idx].style.color = Math.random() > 0.7 
                ? 'rgba(255, 68, 68, 0.4)' 
                : 'rgba(0, 212, 255, 0.3)';
        }, 800);
    }

    // ── 2. DATA RAIN PARTICLES ──
    const rainContainer = document.getElementById('dataRainContainer');
    if (rainContainer) {
function spawnRain() {
            const el = document.createElement('div');
            el.className = 'data-rain';
            
            // Random content: hex, binary, or data fragment
            const type = Math.random();
            if (type < 0.3) {
                el.textContent = '0x' + randomHex(4);
            } else if (type < 0.6) {
                let bin = '';
                for (let i = 0; i < 8; i++) bin += Math.random() > 0.5 ? '1' : '0';
                el.textContent = bin;
            } else {
                el.textContent = DATA_FRAGMENTS[Math.floor(Math.random() * DATA_FRAGMENTS.length)];
            }
            
            el.style.left = `${5 + Math.random() * 90}%`;
            el.style.animationDuration = `${3 + Math.random() * 5}s`;
            el.style.animationDelay = `${Math.random() * 0.5}s`;
            
            // Vary colors
            if (Math.random() > 0.7) {
                el.style.color = 'rgba(255, 68, 68, 0.2)';
            }
            
            rainContainer.appendChild(el);
            
            // Cleanup
            setTimeout(() => el.remove(), 9000);
        }
        
        // Spawn rain at intervals
        setInterval(spawnRain, 400);
        // Initial burst
        for (let i = 0; i < 8; i++) setTimeout(spawnRain, i * 100);
    }

    // ── 3. HUD PANEL DATA STREAMS ──
    const streamLeft = document.getElementById('hudStreamLeft');
    const streamRight = document.getElementById('hudStreamRight');
function generateStreamText() {
        let s = '';
        for (let i = 0; i < 30; i++) {
            s += randomHex(2) + ' ';
        }
        return s;
    }
    
    if (streamLeft) {
        const line = document.createElement('span');
        line.className = 'stream-line';
        line.textContent = generateStreamText();
        streamLeft.appendChild(line);
    }
    if (streamRight) {
        const line = document.createElement('span');
        line.className = 'stream-line';
        line.textContent = generateStreamText();
        line.style.animationDelay = '-4s';
        streamRight.appendChild(line);
    }
    
    // Update stream content periodically
    setInterval(() => {
        if (streamLeft && streamLeft.firstChild) streamLeft.firstChild.textContent = generateStreamText();
        if (streamRight && streamRight.firstChild) streamRight.firstChild.textContent = generateStreamText();
    }, 12000);
}

// ── LIVE HUD VALUE UPDATES ──
export function updateHudTelemetry() {
    const rng = (min, max) => (Math.random() * (max - min) + min).toFixed(1);
    const rngInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Left panel
    const syncEl = document.getElementById('hudSync');
    const neuralEl = document.getElementById('hudNeural');
    const dataInEl = document.getElementById('hudDataIn');
    const threatEl = document.getElementById('hudThreat');
    const bar1 = document.getElementById('hudBar1');
    
    if (syncEl) syncEl.textContent = rng(96.5, 99.9) + '%';
    if (neuralEl) {
        const load = Math.random();
        if (load > 0.85) { neuralEl.textContent = 'HIGH'; neuralEl.className = 'hud-value red'; }
        else if (load > 0.5) { neuralEl.textContent = 'ACTIVE'; neuralEl.className = 'hud-value cyan'; }
        else { neuralEl.textContent = 'NOMINAL'; neuralEl.className = 'hud-value green'; }
    }
    if (dataInEl) dataInEl.textContent = rng(1.2, 4.8) + ' TB';
    if (threatEl) {
        const t = Math.random();
        if (t > 0.95) { threatEl.textContent = 'ELEVATED'; threatEl.className = 'hud-value red'; }
        else { threatEl.textContent = 'MINIMAL'; threatEl.className = 'hud-value green'; }
    }
    if (bar1) bar1.style.width = rngInt(70, 98) + '%';
    
    // Right panel
    const memEl = document.getElementById('hudMemory');
    const queueEl = document.getElementById('hudQueue');
    const latEl = document.getElementById('hudLatency');
    const integEl = document.getElementById('hudInteg');
    const bar2 = document.getElementById('hudBar2');
    
    if (memEl) memEl.textContent = rng(12.0, 15.8) + ' GB';
    if (queueEl) queueEl.textContent = rngInt(2, 14) + ' OPS';
    if (latEl) latEl.textContent = rngInt(8, 22) + 'ms';
    if (integEl) integEl.textContent = rng(99.5, 100.0) + '%';
    if (bar2) bar2.style.width = rngInt(80, 99) + '%';
}
export {};
