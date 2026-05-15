// @ts-nocheck
import { subscribeToLogs } from '../utils/logger';
import { ICONS, NODE_DEFS } from './data.ts';
import { state, saveTrainingState } from './state.ts';

// ── Icon image cache ──
export const iconImgCache = {};
export function getIconImg(type, color) {
    const key = type + '_' + color;
    if (iconImgCache[key]) return iconImgCache[key];
    const svgInner = ICONS[type];
    if (!svgInner) return null;
    const fillCol = svgInner.includes('fill="currentColor"') ? svgInner.replace(/fill="currentColor"/g, `fill="${color}"`) : svgInner;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${fillCol}</svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    iconImgCache[key] = img;
    return img;
}

// ── DOM ──
export const agentListEl = (document.getElementById('agentList') as any);
export const emptyMsg = (document.getElementById('emptyMsg') as any);
export const canvas = (document.getElementById('trainCanvas') as any);
export const ctx = canvas.getContext('2d');
export const overlay = (document.getElementById('pickerOverlay') as any);
export const pbody = (document.getElementById('pickerBody') as any);
export let cW, cH;

export function resize() { cW = canvas.width = innerWidth - state.SB_W; cH = canvas.height = innerHeight - 48; }
resize(); addEventListener('resize', resize);

// ═══ SIDEBAR ═══
export function refreshSidebar() {
    if (!agentListEl) return;
    agentListEl.querySelectorAll('.ts-card').forEach(e => e.remove());
    if (emptyMsg) emptyMsg.style.display = state.agents.length ? 'none' : 'block';
    state.agents.forEach(ag => {
        const card = document.createElement('div');
        card.className = 'ts-card' + (state.activeAgent === ag ? ' active' : '');
        card.innerHTML = `
            <div class="ts-card-dot" style="background:${ag.color}"></div>
            <div class="ts-card-info">
                <div class="ts-card-name">${ag.name}</div>
                <div class="ts-card-sub">${ag.nodes.length - 1} kaynak</div>
            </div>`;
        card.onclick = () => selectAgent(ag);
        agentListEl.appendChild(card);
    });
    if (typeof updateStartBtn === 'function') updateStartBtn();
}

export function selectAgent(ag) {
    state.activeAgent = ag;
    state.nodes = ag.nodes;
    state.conns = ag.conns;
    state.panX = 0; state.panY = 0;
    refreshSidebar();
}

// ═══ PICKER ═══
export function buildPicker() {
    if (!pbody) return;
    pbody.innerHTML = '';
    let lastCat = '';
    NODE_DEFS.forEach(nd => {
        if (nd.cat !== lastCat) {
            lastCat = nd.cat;
            const cat = document.createElement('div');
            cat.className = 'pp-cat'; cat.textContent = nd.cat;
            pbody.appendChild(cat);
        }
        const item = document.createElement('div');
        item.className = 'pp-item';
        item.innerHTML = `
            <div class="pp-item-icon" style="background:${nd.color}15;border:1px solid ${nd.color}28">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${nd.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[nd.key]}</svg>
            </div>
            <span class="pp-item-label" style="color:${nd.color}">${nd.label}</span>`;
        item.onclick = () => addNode(nd.key);
        pbody.appendChild(item);
    });
}

const fabBtn = document.getElementById('fabBtn');
if (fabBtn) fabBtn.onclick = () => { buildPicker(); overlay?.classList.add('open'); };
const pickerClose = document.getElementById('pickerClose');
if (pickerClose) pickerClose.onclick = () => overlay?.classList.remove('open');
if (overlay) overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('open'); };

// ═══ ADD NODE ═══
export function addNode(key) {
    const nd = NODE_DEFS.find(n => n.key === key);

    if (key === 'agent') {
        const id = 'ag_' + Date.now();
        const name = nd.label + ' ' + (state.agents.length + 1);
        const ag = { id, name, color: nd.color, nodes: [], conns: [] };
        ag.nodes.push({ type:'agent', x:0, y:0, label:name, _color:nd.color, id:'c_'+id });
        state.agents.push(ag);
        selectAgent(ag);
        overlay?.classList.remove('open');
        saveTrainingState();
        return;
    }

    if (!state.activeAgent) {
        const agId = 'ag_' + Date.now();
        const ag = { id:agId, name:'Ajan 1', color:'#8b5cf6', nodes:[], conns:[] };
        ag.nodes.push({ type:'agent', x:0, y:0, label:'Ajan 1', _color:'#8b5cf6', id:'c_'+agId });
        state.agents.push(ag);
        selectAgent(ag);
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = 130 + Math.random() * 70;
    const node = { type:key, x:Math.cos(angle)*dist, y:Math.sin(angle)*dist, label:nd.label, _color:nd.color, id:'n'+Date.now() };
    state.nodes.push(node);
    state.conns.push({ from:state.nodes[0], to:node, id:state.conns.length });
    overlay?.classList.remove('open');
    refreshSidebar();
    saveTrainingState();
}

// ═══ MOUSE — select, drag, connect ═══
export function getConnPoints(n) {
    if (!n._sx) return [];
    const isAg = n.type === 'agent';
    if (isAg) {
        const cw = 140*state.zoom, ch = 52*state.zoom;
        const cx = n._sx - cw/2, cy = n._sy - ch/2;
        return [
            { x: cx, y: n._sy, side:'left' },
            { x: cx+cw, y: n._sy, side:'right' },
            { x: n._sx, y: cy+ch, side:'bottom' },
        ];
    } else {
        const r = (n._sr || 28*state.zoom);
        return [
            { x: n._sx - r, y: n._sy, side:'left' },
            { x: n._sx + r, y: n._sy, side:'right' },
            { x: n._sx, y: n._sy - r, side:'top' },
            { x: n._sx, y: n._sy + r, side:'bottom' },
        ];
    }
}

export function hitConnPoint(mx, my) {
    for (const n of state.nodes) {
        for (const p of getConnPoints(n)) {
            if (Math.hypot(mx - p.x, my - p.y) < 10*state.zoom) return { node: n, point: p };
        }
    }
    return null;
}

export function hitNode(mx, my) {
    for (let i = state.nodes.length-1; i >= 0; i--) {
        const n = state.nodes[i];
        if (n._sx === undefined) continue;
        const isAg = n.type === 'agent';
        if (isAg) {
            const cw = 140*state.zoom, ch = 52*state.zoom;
            if (mx >= n._sx-cw/2 && mx <= n._sx+cw/2 && my >= n._sy-ch/2 && my <= n._sy+ch/2) return n;
        } else {
            const r = (n._sr || 28*state.zoom);
            if (Math.hypot(mx - n._sx, my - n._sy) < r*1.2) return n;
        }
    }
    return null;
}

export let hoveredConn = null;
export let connDelBtn = null;

function getConnBezierPoints(c) {
    const a = c.from, b = c.to;
    if (a._sx === undefined || b._sx === undefined) return null;
    const dx = b._sx - a._sx;
    return { ax: a._sx, ay: a._sy, cp1x: a._sx+dx*0.5, cp1y: a._sy, cp2x: b._sx-dx*0.5, cp2y: b._sy, bx: b._sx, by: b._sy };
}

function pointOnBezier(t, p) {
    const x = (1-t)**3*p.ax + 3*(1-t)**2*t*p.cp1x + 3*(1-t)*t**2*p.cp2x + t**3*p.bx;
    const y = (1-t)**3*p.ay + 3*(1-t)**2*t*p.cp1y + 3*(1-t)*t**2*p.cp2y + t**3*p.by;
    return { x, y };
}

export function hitConn(mx, my) {
    for (const c of state.conns) {
        const p = getConnBezierPoints(c);
        if (!p) continue;
        for (let t = 0; t <= 1; t += 0.02) {
            const pt = pointOnBezier(t, p);
            if (Math.hypot(mx - pt.x, my - pt.y) < 8) return c;
        }
    }
    return null;
}

export function removeConnDelBtn() {
    if (connDelBtn) { connDelBtn.remove(); connDelBtn = null; }
}

export function showConnDelBtn(c) {
    removeConnDelBtn();
    const p = getConnBezierPoints(c);
    if (!p) return;
    const mid = pointOnBezier(0.5, p);
    connDelBtn = document.createElement('div');
    connDelBtn.className = 'conn-del-btn';
    connDelBtn.textContent = '✕';
    connDelBtn.style.left = (mid.x + state.SB_W - 11) + 'px';
    connDelBtn.style.top = (mid.y + 48 - 11) + 'px';
    connDelBtn.onclick = () => {
        const idx = state.conns.indexOf(c);
        if (idx >= 0) state.conns.splice(idx, 1);
        removeConnDelBtn();
        hoveredConn = null;
        refreshSidebar();
        saveTrainingState();
    };
    document.body.appendChild(connDelBtn);
}

// ═══ MODAL ═══
const nmOverlay = (document.getElementById('nodeModalOverlay') as any);
const nodeModalEl = (document.getElementById('nodeModal') as any);
let modalNode = null;

export function openNodeModal(n) {
    modalNode = n;
    const def = NODE_DEFS.find(d => d.key === n.type);
    const col = n._color || '#888';
    const svgInner = ICONS[n.type] || '';
    const fillFixed = svgInner.replace(/fill="currentColor"/g, `fill="${col}"`);
    const nmIcon = document.getElementById('nmIcon');
    if (nmIcon) {
        nmIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${fillFixed}</svg>`;
        nmIcon.style.background = col + '15';
        nmIcon.style.border = `1px solid ${col}28`;
    }
    const nmTitle = document.getElementById('nmTitle');
    if (nmTitle) nmTitle.textContent = def ? def.label : n.type;
    const nmName = document.getElementById('nmName') as HTMLInputElement;
    if (nmName) nmName.value = n.label || '';
    const nmDesc = document.getElementById('nmDesc') as HTMLTextAreaElement;
    if (nmDesc) nmDesc.value = n._desc || '';

    const isAgent = n.type === 'agent';
    const agentFields = document.getElementById('agentFields');
    if (agentFields) agentFields.style.display = isAgent ? 'block' : 'none';
    const sourceFields = document.getElementById('sourceFields');
    if (sourceFields) sourceFields.style.display = isAgent ? 'none' : 'block';
    nodeModalEl?.classList.toggle('agent-modal', isAgent);

    if (isAgent) {
        const nmModel = document.getElementById('nmModel') as HTMLSelectElement;
        if (nmModel) nmModel.value = n._model || 'gpt-4o';
        const nmRole = document.getElementById('nmRole') as HTMLTextAreaElement;
        if (nmRole) nmRole.value = n._role || '';
        const nmMaxTokens = document.getElementById('nmMaxTokens') as HTMLInputElement;
        if (nmMaxTokens) nmMaxTokens.value = (n._maxTokens || 4096).toString();
        const memBtn = document.getElementById('nmMemory');
        const histBtn = document.getElementById('nmHistory');
        memBtn?.classList.toggle('on', !!n._memory);
        histBtn?.classList.toggle('on', n._history !== false);
    } else {
        const nmUrl = document.getElementById('nmUrl') as HTMLInputElement;
        if (nmUrl) nmUrl.value = n._url || '';
    }

    nmOverlay?.classList.add('open');
}

export function closeNodeModal() { nmOverlay?.classList.remove('open'); modalNode = null; }

const nmClose = document.getElementById('nmClose');
if (nmClose) nmClose.onclick = closeNodeModal;
if (nmOverlay) nmOverlay.onclick = e => { if (e.target === nmOverlay) closeNodeModal(); };

const nmMemory = document.getElementById('nmMemory');
if (nmMemory) nmMemory.onclick = function() { this.classList.toggle('on'); };
const nmHistory = document.getElementById('nmHistory');
if (nmHistory) nmHistory.onclick = function() { this.classList.toggle('on'); };

const nmSave = document.getElementById('nmSave');
if (nmSave) nmSave.onclick = () => {
    if (!modalNode) return;
    const nmName = document.getElementById('nmName') as HTMLInputElement;
    modalNode.label = nmName?.value || modalNode.label;
    const nmDesc = document.getElementById('nmDesc') as HTMLTextAreaElement;
    modalNode._desc = nmDesc?.value;

    if (modalNode.type === 'agent') {
        const nmModel = document.getElementById('nmModel') as HTMLSelectElement;
        modalNode._model = nmModel?.value;
        const nmRole = document.getElementById('nmRole') as HTMLTextAreaElement;
        modalNode._role = nmRole?.value;
        const nmMaxTokens = document.getElementById('nmMaxTokens') as HTMLInputElement;
        modalNode._maxTokens = parseInt(nmMaxTokens?.value) || 4096;
        const memBtn = document.getElementById('nmMemory');
        modalNode._memory = memBtn?.classList.contains('on');
        const histBtn = document.getElementById('nmHistory');
        modalNode._history = histBtn?.classList.contains('on');
    } else {
        const nmUrl = document.getElementById('nmUrl') as HTMLInputElement;
        modalNode._url = nmUrl?.value;
    }

    refreshSidebar();
    closeNodeModal();
    saveTrainingState();
};

const nmDelete = document.getElementById('nmDelete');
if (nmDelete) nmDelete.onclick = () => {
    if (!modalNode) return;
    for (let i = state.conns.length-1; i >= 0; i--) {
        if (state.conns[i].from === modalNode || state.conns[i].to === modalNode) state.conns.splice(i, 1);
    }
    const idx = state.nodes.indexOf(modalNode);
    if (idx >= 0) state.nodes.splice(idx, 1);
    if (state.selectedNode === modalNode) state.selectedNode = null;
    refreshSidebar();
    closeNodeModal();
    saveTrainingState();
};

// ═══ START TRAINING BUTTON ═══
const startBtn = (document.getElementById('startTrainBtn') as any);
let trainingInterval = null;

function updateStartBtn() {
    if (!startBtn) return;
    startBtn.disabled = state.agents.length === 0 || state.conns.length === 0;
}

if (startBtn) {
    startBtn.onclick = () => {
        if (startBtn.disabled) return;
        if (trainingInterval) {
            clearInterval(trainingInterval);
            trainingInterval = null;
            startBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Eğitime Başla';
            startBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
            return;
        }
        startBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Eğitim Durduruluyor...';
        startBtn.style.background = 'linear-gradient(135deg, #f59e0b, #ef4444)';
        trainingInterval = setInterval(() => {
            for (const n of state.nodes) {
                if (n.type === 'agent') {
                    const connCount = state.conns.filter(c => c.from === n || c.to === n).length;
                    if (connCount > 0) {
                        n._xp = (n._xp || 0) + Math.ceil(connCount * 0.5);
                    }
                }
            }
        }, 800);
    };
}

// ═══ MOUSE ═══
if (canvas) {
    canvas.addEventListener('mousedown', e => {
        const mx = e.offsetX, my = e.offsetY;
        removeConnDelBtn();
        const chit = hitConn(mx, my);
        if (chit) {
            hoveredConn = chit;
            showConnDelBtn(chit);
            return;
        }
        hoveredConn = null;
        const cp = hitConnPoint(mx, my);
        if (cp) {
            state.connDrag = { fromNode: cp.node, startX: cp.point.x, startY: cp.point.y, curX: mx, curY: my };
            return;
        }
        const hit = hitNode(mx, my);
        if (hit) {
            state.dragNode = hit;
            state.selectedNode = hit;
            return;
        }
        state.selectedNode = null;
        state.isPanning = true; state.lastPan = { x:e.clientX, y:e.clientY };
    });

    canvas.addEventListener('dblclick', e => {
        const mx = e.offsetX, my = e.offsetY;
        const hit = hitNode(mx, my);
        if (hit) openNodeModal(hit);
    });

    canvas.addEventListener('mousemove', e => {
        state.mouseX = e.offsetX; state.mouseY = e.offsetY;
        if (state.connDrag) {
            state.connDrag.curX = e.offsetX;
            state.connDrag.curY = e.offsetY;
        } else if (state.dragNode) {
            state.dragNode.x += e.movementX/state.zoom;
            state.dragNode.y += e.movementY/state.zoom;
        } else if (state.isPanning) {
            state.panX += (e.clientX-state.lastPan.x)/state.zoom;
            state.panY += (e.clientY-state.lastPan.y)/state.zoom;
            state.lastPan = {x:e.clientX, y:e.clientY};
        }
    });

    canvas.addEventListener('wheel', e => { e.preventDefault(); state.zoom = Math.max(0.3,Math.min(3,state.zoom+(e.deltaY>0?-0.06:0.06))); }, {passive:false});
}

addEventListener('mouseup', e => {
    if (state.connDrag) {
        const mx = state.mouseX, my = state.mouseY;
        const target = hitNode(mx, my);
        if (target && target !== state.connDrag.fromNode) {
            const exists = state.conns.some(c =>
                (c.from === state.connDrag.fromNode && c.to === target) ||
                (c.from === target && c.to === state.connDrag.fromNode)
            );
            if (!exists) {
                state.conns.push({ from: state.connDrag.fromNode, to: target, id: state.conns.length });
                refreshSidebar();
                saveTrainingState();
            }
        }
        state.connDrag = null;
    }
    if (state.dragNode) saveTrainingState();
    state.dragNode = null;
    state.isPanning = false;
});

// ═══ LOG CONSOLE ═══
const tcConsole = document.getElementById('trainConsole');
const tcBody = document.getElementById('tcBody');
const tcHeader = document.getElementById('tcHeader');
const tcClear = document.getElementById('tcClear');
const tcToggle = document.getElementById('tcToggle');

function addLogToConsole(log: any) {
    if (!tcBody) return;
    const div = document.createElement('div');
    div.className = 'log-entry';
    
    const time = new Date(log.timestamp).toLocaleTimeString('tr-TR');
    const moduleStr = log.source === 'frontend' ? `[FRONTEND:${log.module}]` : `[BACKEND:${log.module}]`;
    
    div.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-level level-${log.level}">${log.level}</span>
        <span class="log-module">${moduleStr}</span>
        <span class="log-msg">${log.message}${log.meta ? ' | ' + JSON.stringify(log.meta) : ''}</span>
    `;
    
    tcBody.appendChild(div);
    tcBody.scrollTo({ top: tcBody.scrollHeight, behavior: 'smooth' });
    
    while (tcBody.children.length > 100) {
        const first = tcBody.firstChild;
        if (first) tcBody.removeChild(first);
    }
}

subscribeToLogs(addLogToConsole);

function initLogWS() {
    const ws = new WebSocket(`ws://${window.location.hostname || 'localhost'}:8086`);
    ws.onopen = () => {
        addLogToConsole({ timestamp: new Date().toISOString(), level: 'INFO', module: 'SYSTEM', message: 'WebSocket Telemetri Köprüsü Bağlandı.', source: 'frontend' });
    };
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.topic === 'SYSTEM_LOG') {
                addLogToConsole({ ...data.payload, source: 'backend' });
            }
        } catch (e) {}
    };
    ws.onclose = () => {
        setTimeout(initLogWS, 3000);
    };
}
initLogWS();

if (tcHeader && tcConsole) {
    tcHeader.onclick = (e) => {
        if ((e.target as HTMLElement).id === 'tcClear') return;
        tcConsole.classList.toggle('collapsed');
        if (tcToggle) tcToggle.textContent = tcConsole.classList.contains('collapsed') ? '□' : '_';
    };
}

if (tcClear && tcBody) {
    tcClear.onclick = () => {
        tcBody.innerHTML = '';
    };
}
