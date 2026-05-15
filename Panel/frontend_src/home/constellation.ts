// @ts-nocheck
import { agentMap, selectAgent } from './ui.ts';
// ═══════════════════════════════════════════════════════════
// NEURAL CONSTELLATION — 7 AI Model Node Network
// ═══════════════════════════════════════════════════════════
export function initNeuralConstellation() {
    const container = document.getElementById('neuralConstellation');
    const svg = document.getElementById('neuralConstellationSvg');
    if (!container || !svg) return;

    const hexContainer = container.parentElement;
    const w = hexContainer.offsetWidth;
    const h = hexContainer.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    // 7 düğüm pozisyonu — beynin DIŞINDA, uzakta uydu gibi
    const nodePositions = [
        { angle: -90,  dist: 1.0  }, // 1: Qwen 2.5 (Merkez) — tam üstte
        { angle: -38,  dist: 0.97 }, // 2: Gemma 4 — sağ üst
        { angle: 14,   dist: 1.02 }, // 3: Qwen 3.5 — sağ
        { angle: 62,   dist: 0.98 }, // 4: Kimi — sağ alt
        { angle: 118,  dist: 0.98 }, // 5: Qwen Cloud — sol alt
        { angle: 168,  dist: 1.02 }, // 6: GLM 5.1 — sol
        { angle: -142, dist: 0.97 }, // 7: MiniMax — sol üst
    ];

    // SVG namespace
    const ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.width = '100%';
    svg.style.height = '100%';

    // Node koordinatlarını hesapla
    const nodeCoords = [];
    const radius = Math.min(w, h) / 2;

    nodePositions.forEach((pos, i) => {
        const rad = pos.angle * (Math.PI / 180);
        const x = cx + Math.cos(rad) * radius * pos.dist;
        const y = cy + Math.sin(rad) * radius * pos.dist;
        nodeCoords.push({ x, y });
    });

    // 1. SVG Bağlantı Çizgileri — Her düğümden merkeze (beyin)
    for (let i = 0; i < 7; i++) {
        const agent = agentMap[i + 1];
        const coord = nodeCoords[i];

        // Düğümden beyin merkezine çizgi
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', coord.x);
        line.setAttribute('y1', coord.y);
        line.setAttribute('x2', cx);
        line.setAttribute('y2', cy);
        line.setAttribute('class', 'constellation-line');
        line.setAttribute('id', `cLine_${i + 1}`);
        line.style.stroke = agent.color;
        svg.appendChild(line);

        // Komşu düğümler arası bağlantı (yıldız ağı)
        const nextIdx = (i + 1) % 7;
        const nextCoord = nodeCoords[nextIdx];
        const interLine = document.createElementNS(ns, 'line');
        interLine.setAttribute('x1', coord.x);
        interLine.setAttribute('y1', coord.y);
        interLine.setAttribute('x2', nextCoord.x);
        interLine.setAttribute('y2', nextCoord.y);
        interLine.setAttribute('class', 'constellation-line');
        interLine.style.stroke = agent.color;
        interLine.style.opacity = '0.08';
        svg.appendChild(interLine);
    }

    // 2. HTML Model Düğümleri
    for (let i = 0; i < 7; i++) {
        const agent = agentMap[i + 1];
        const coord = nodeCoords[i];
        const isCloud = agent.id.includes('cloud');

        const node = document.createElement('div');
        node.className = 'model-node';
        node.id = `modelNode_${i + 1}`;
        node.style.color = agent.color;
        node.style.left = `${(coord.x / w) * 100}%`;
        node.style.top = `${(coord.y / h) * 100}%`;
        node.style.animationDelay = `${i * 0.3}s`;

        // Tıklanınca agent seç
        node.addEventListener('click', () => selectAgent(i + 1));

        node.innerHTML = `
            <div class="model-node-core"></div>
            <div class="model-node-status ${isCloud ? 'cloud' : ''}"></div>
            <div class="model-node-label">${agent.name.split('(')[0].trim()}</div>
        `;

        container.appendChild(node);
    }

    // 3. Data Flow Animation — Düğümlerden beyne akan noktalar
function animateDataFlow() {
        const activeIdx = getCurrentActiveAgent();
        
        // Her 2 saniyede aktif düğümden beyne bir veri akışı
        const agent = agentMap[activeIdx] || agentMap[1];
        const coord = nodeCoords[activeIdx - 1] || nodeCoords[0];

        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', coord.x);
        dot.setAttribute('cy', coord.y);
        dot.setAttribute('r', '2.5');
        dot.setAttribute('fill', agent.color);
        dot.setAttribute('class', 'flow-dot flowing');
        dot.style.filter = `drop-shadow(0 0 4px ${agent.color})`;
        svg.appendChild(dot);

        // Animate dot from node to center
        const duration = 1200;
        const start = performance.now();
function moveDot(now) {
            const t = Math.min((now - start) / duration, 1);
            const eased = t * t * (3 - 2 * t); // smoothstep
            const x = coord.x + (cx - coord.x) * eased;
            const y = coord.y + (cy - coord.y) * eased;
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', 2.5 - t * 1.5); // shrink
            dot.style.opacity = 1 - t * 0.5;
            if (t < 1) requestAnimationFrame(moveDot);
            else dot.remove();
        }
        requestAnimationFrame(moveDot);

        // Arada diğer düğümlerden de veri akışı
        if (Math.random() > 0.5) {
            const randIdx = Math.floor(Math.random() * 7);
            if (randIdx !== activeIdx - 1) {
                const rc = nodeCoords[randIdx];
                const rAgent = agentMap[randIdx + 1];
                setTimeout(() => {
                    const rd = document.createElementNS(ns, 'circle');
                    rd.setAttribute('cx', rc.x);
                    rd.setAttribute('cy', rc.y);
                    rd.setAttribute('r', '1.5');
                    rd.setAttribute('fill', rAgent.color);
                    rd.setAttribute('class', 'flow-dot flowing');
                    rd.style.opacity = '0.4';
                    svg.appendChild(rd);
                    const rStart = performance.now();
function moveRd(now) {
                        const rt = Math.min((now - rStart) / 1500, 1);
                        const re = rt * rt * (3 - 2 * rt);
                        rd.setAttribute('cx', rc.x + (cx - rc.x) * re);
                        rd.setAttribute('cy', rc.y + (cy - rc.y) * re);
                        rd.style.opacity = (1 - rt) * 0.4;
                        if (rt < 1) requestAnimationFrame(moveRd);
                        else rd.remove();
                    }
                    requestAnimationFrame(moveRd);
                }, 400);
            }
        }
    }

    // Periyodik data flow
    setInterval(animateDataFlow, 2000);
    setTimeout(animateDataFlow, 1000); // İlk burst

    // İlk aktif düğümü işaretle
    setTimeout(() => updateConstellationActive(1), 600);
}
function getCurrentActiveAgent() {
    const sel = document.getElementById('modelSelector');
    if (!sel) return 1;
    for (let i = 1; i <= 7; i++) {
        if (agentMap[i] && agentMap[i].id === sel.value) return i;
    }
    return 1;
}
function updateConstellationActive(activeIndex) {
    // Tüm düğümlerden active kaldır
    for (let i = 1; i <= 7; i++) {
        const node = document.getElementById(`modelNode_${i}`);
        const line = document.getElementById(`cLine_${i}`);
        if (node) node.classList.remove('active-node');
        if (line) line.classList.remove('active-line');
    }
    // Aktif düğümü işaretle
    const activeNode = document.getElementById(`modelNode_${activeIndex}`);
    const activeLine = document.getElementById(`cLine_${activeIndex}`);
    if (activeNode) activeNode.classList.add('active-node');
    if (activeLine) activeLine.classList.add('active-line');
}
export {};
