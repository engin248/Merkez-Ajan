// @ts-nocheck

import { drawSentinel } from './strategy/sentinel_renderer.ts';
import { initContextMenu } from './strategy/context_menu.ts';
import { initVoiceChat } from './strategy/voice.ts';
/* ══════════════════════════════════════════════════════════════
   ASKER MOTORU // STRATEGY NODE MAP
   ══════════════════════════════════════════════════════════════ */

// ── Interfaces ──
interface Point { x: number; y: number; }
interface Camera { x: number; y: number; zoom: number; targetZoom?: number; }
interface FlowParticle { edge: any; t: number; speed: number; reverse: boolean; size: number; }
interface Star { x: number; y: number; s: number; a: number; size?: number; alpha?: number; }

const canvas = (document.getElementById('strategyCanvas') as any) as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const tooltip = (document.getElementById('nodeTooltip') as any) as HTMLElement;

let W: number, H: number;
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);

let frame = 0;

// ── Camera (kalıcı pozisyon) ──
declare const StateManager: any;
const _savedCam = typeof StateManager !== 'undefined' ? StateManager.getCamera() : { x: 0, y: 0, zoom: 1 };
let cam: Camera = { x: _savedCam.x, y: _savedCam.y, zoom: _savedCam.zoom, targetZoom: _savedCam.zoom };

import { NODES, EDGES, SKILL_CATALOG } from './strategy/data.ts';
import { saveGraphState, saveNodePositions, loadGraphState, fetchAndMergeModules } from './strategy/state.ts';
import { startMonitoring } from './strategy/monitor.ts';
import { logActivity, scheduleNextActivity } from './strategy/logger.ts';
import { agentMemory, startTraining } from './strategy/training.ts';
import { sentinel } from './strategy/sentinel.ts';
import { hexPath, colorToRgba, drawMeshCluster, drawParticleCloud, drawRingsCluster, drawOrbitingElements, drawCoreNode } from './strategy/renderer.ts';

// Global erişim için window'a bağla (HTML içindeki scriptler kullanıyor)
(window as any).NODES = NODES;
(window as any).EDGES = EDGES;
(window as any).SKILL_CATALOG = SKILL_CATALOG;

// Sayfa yüklendiğinde kaydedilmiş graph'ı uygula
loadGraphState();

// Dinamik modülleri arka plandan çek ve graph'ı güncelle
fetchAndMergeModules().then(() => {
    saveGraphState(); // Yeni haritayı kaydet
});

// Başlatma Çağrıları
startMonitoring();
startTraining();
scheduleNextActivity();

// Initial system log
logActivity('SİSTEM', 'KRONOS Komuta Merkezi başlatıldı', 'system', '#b080ff');
logActivity('SİSTEM', `${NODES.length} düğüm, ${EDGES.length} bağlantı yüklendi`, 'system', '#b080ff');

// ── Flow Particles (data flowing along edges) ──
let flowParticles: FlowParticle[] = [];
function spawnFlow() {
  if (flowParticles.length > 60) return;
  const e = EDGES[Math.floor(Math.random() * EDGES.length)];
  const fromN = NODES.find((n: any) => n.id === e.from);
  const toN = NODES.find((n: any) => n.id === e.to);
  if (!fromN || !toN) return;
  const reverse = Math.random() > 0.6;
  flowParticles.push({ edge: e, t: 0, speed: 0.005 + Math.random() * 0.008, reverse, size: 1.5 + Math.random() * 1.5 });
}

// ── Stars Background ──
const stars: Star[] = [];
for (let i = 0; i < 400; i++) {
  stars.push({ x: (Math.random()-0.5)*3000, y: (Math.random()-0.5)*3000, size: 0.4+Math.random()*1.8, alpha: 0.15+Math.random()*0.6 });
}

// ═══════════════════════════════════════════════════════════
// SENTINEL DRONE — Security Patrol System
// ═══════════════════════════════════════════════════════════


let mouse = { x:0, y:0, down:false, startX:0, startY:0, camStartX:0, camStartY:0 };
let hoveredNode = null;
let draggingNode = null;
let selectedNodes = new Set();
let isDraggingNode = false;
let boxSelect = null; // {sx, sy, ex, ey} screen coords

// ── Edge Interaction State ──
let hoveredEdge = null;      // currently hovered edge
let linkDrag = null;         // { fromNode, mx, my } — drag-to-link state

// Point-to-quadratic-bezier distance (screen space)
function distToEdge(px, py, p1, cp, p2) {
  let minD = Infinity;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const it = 1 - t;
    const bx = it*it*p1.x + 2*it*t*cp.x + t*t*p2.x;
    const by = it*it*p1.y + 2*it*t*cp.y + t*t*p2.y;
    const dx = px - bx, dy = py - by;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < minD) minD = d;
  }
  return minD;
}

// Get edge screen bezier points
function getEdgeScreenPoints(e) {
  const fromN = NODES.find(n => n.id === e.from);
  const toN = NODES.find(n => n.id === e.to);
  if (!fromN || !toN) return null;
  const p1 = w2s(fromN.x, fromN.y);
  const p2 = w2s(toN.x, toN.y);
  const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
  const dx = p2.x-p1.x, dy = p2.y-p1.y;
  const cp = { x: mx + dy*0.15, y: my - dx*0.15 };
  return { p1, p2, cp };
}

canvas.addEventListener('mousedown', e => {
  mouse.down = true; mouse.startX = e.clientX; mouse.startY = e.clientY;
  mouse.camStartX = cam.x; mouse.camStartY = cam.y;
  const wx = (e.clientX - W/2) / cam.zoom - cam.x;
  const wy = (e.clientY - H/2) / cam.zoom - cam.y;
  let clickedNode = null;
  for (let i = NODES.length-1; i >= 0; i--) {
    const n = NODES[i];
    const dx = wx - n.x, dy = wy - n.y;
    if (dx*dx + dy*dy < (n.r+8)*(n.r+8)) { clickedNode = n; break; }
  }

  // Alt+Click on node → start link drag
  if (clickedNode && e.altKey) {
    linkDrag = { fromNode: clickedNode, mx: e.clientX, my: e.clientY };
    return;
  }

  // Click on hovered edge → disconnect
  if (!clickedNode && hoveredEdge) {
    const idx = EDGES.indexOf(hoveredEdge);
    if (idx !== -1) {
      // Also clear parent relationship
      const childNode = NODES.find(n => n.id === hoveredEdge.to);
      if (childNode) delete childNode.parent;
      EDGES.splice(idx, 1);
      hoveredEdge = null;
      const connEl1 = (document.getElementById('connectionStatus') as any); if (connEl1) connEl1.textContent = EDGES.length + ' conn';
      saveGraphState();
    }
    return;
  }

  if (clickedNode) {
    // Ctrl+Click = toggle in selection
    if (e.ctrlKey) {
      if (selectedNodes.has(clickedNode)) selectedNodes.delete(clickedNode);
      else selectedNodes.add(clickedNode);
    } else {
      if (!selectedNodes.has(clickedNode)) {
        selectedNodes.clear();
        selectedNodes.add(clickedNode);
      }
    }
    draggingNode = clickedNode;
    isDraggingNode = true;
    // Store offsets for multi-drag
    selectedNodes.forEach(n => { n._dragOffX = n.x - wx; n._dragOffY = n.y - wy; });
    updateDeleteBtn();
  } else {
    // Start box select (or pan if no Shift)
    if (e.shiftKey) {
      boxSelect = { sx: e.clientX, sy: e.clientY, ex: e.clientX, ey: e.clientY };
    } else {
      if (!e.ctrlKey) { selectedNodes.clear(); updateDeleteBtn(); }
    }
  }
});
canvas.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;

  // Link drag — update endpoint
  if (linkDrag) {
    linkDrag.mx = e.clientX;
    linkDrag.my = e.clientY;
    // Check if hovering over a target node
    const hwx = (mouse.x - W/2) / cam.zoom - cam.x;
    const hwy = (mouse.y - H/2) / cam.zoom - cam.y;
    hoveredNode = null;
    for (let i = NODES.length-1; i >= 0; i--) {
      const n = NODES[i];
      if (n === linkDrag.fromNode) continue;
      const dx = hwx - n.x, dy = hwy - n.y;
      if (dx*dx + dy*dy < (n.r+8)*(n.r+8)) { hoveredNode = n; break; }
    }
    canvas.style.cursor = hoveredNode ? 'crosshair' : 'default';
    return;
  }

  if (mouse.down && boxSelect) {
    boxSelect.ex = e.clientX; boxSelect.ey = e.clientY;
  } else if (mouse.down && isDraggingNode && draggingNode) {
    const wx = (e.clientX - W/2) / cam.zoom - cam.x;
    const wy = (e.clientY - H/2) / cam.zoom - cam.y;
    if (selectedNodes.size > 1) {
      selectedNodes.forEach(n => { n.x = wx + n._dragOffX; n.y = wy + n._dragOffY; });
    } else {
      draggingNode.x = wx; draggingNode.y = wy;
    }
    canvas.style.cursor = 'grabbing';
  } else if (mouse.down && !boxSelect) {
    cam.x = mouse.camStartX + (e.clientX - mouse.startX) / cam.zoom;
    cam.y = mouse.camStartY + (e.clientY - mouse.startY) / cam.zoom;
  }

  // Hover detection: nodes first, then edges
  hoveredNode = null;
  const hwx = (mouse.x - W/2) / cam.zoom - cam.x;
  const hwy = (mouse.y - H/2) / cam.zoom - cam.y;
  for (let i = NODES.length-1; i >= 0; i--) {
    const n = NODES[i];
    const dx = hwx - n.x, dy = hwy - n.y;
    if (dx*dx + dy*dy < (n.r+8)*(n.r+8)) { hoveredNode = n; break; }
  }

  // Edge hover detection (only if not hovering a node)
  hoveredEdge = null;
  if (!hoveredNode && !mouse.down) {
    const hitDist = 8; // px threshold
    for (const edge of EDGES) {
      const pts = getEdgeScreenPoints(edge);
      if (!pts) continue;
      const d = distToEdge(mouse.x, mouse.y, pts.p1, pts.cp, pts.p2);
      if (d < hitDist) { hoveredEdge = edge; break; }
    }
  }

  // Cursor
  if (hoveredEdge) {
    canvas.style.cursor = 'pointer';
  } else {
    canvas.style.cursor = hoveredNode ? 'pointer' : (mouse.down ? 'grabbing' : 'grab');
  }
});
canvas.addEventListener('mouseup', e => {
  // Finish link drag
  if (linkDrag) {
    if (hoveredNode && hoveredNode !== linkDrag.fromNode) {
      // Check if edge already exists
      const exists = EDGES.some(ed =>
        (ed.from === linkDrag.fromNode.id && ed.to === hoveredNode.id) ||
        (ed.from === hoveredNode.id && ed.to === linkDrag.fromNode.id)
      );
      if (!exists) {
        // Determine color from target node
        const edgeColor = hoveredNode.color || linkDrag.fromNode.color;
        EDGES.push({ from: linkDrag.fromNode.id, to: hoveredNode.id, color: edgeColor });
        // Optionally set parent if target has no parent
        if (!hoveredNode.parent) hoveredNode.parent = linkDrag.fromNode.id;
        const connEl2 = (document.getElementById('connectionStatus') as any); if (connEl2) connEl2.textContent = EDGES.length + ' conn';
        saveNodePositions(); // Bağlantı değişikliğini de kaydet
      }
    }
    linkDrag = null;
    mouse.down = false;
    canvas.style.cursor = 'grab';
    return;
  }

  if (boxSelect) {
    // Select all nodes inside box
    const x1 = Math.min(boxSelect.sx, boxSelect.ex), x2 = Math.max(boxSelect.sx, boxSelect.ex);
    const y1 = Math.min(boxSelect.sy, boxSelect.ey), y2 = Math.max(boxSelect.sy, boxSelect.ey);
    if (!e.ctrlKey) selectedNodes.clear();
    for (const n of NODES) {
      const p = w2s(n.x, n.y);
      if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) selectedNodes.add(n);
    }
    updateDeleteBtn();
    boxSelect = null;
  }
  mouse.down = false;
  const wasDragging = isDraggingNode;
  draggingNode = null;
  isDraggingNode = false;
  canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
  // Kamera pozisyonunu kaydet
  if (typeof StateManager !== 'undefined') StateManager.saveCamera(cam.x, cam.y, cam.zoom);
  // Node sürüklendiyse pozisyonları kaydet
  if (wasDragging) saveNodePositions();
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  cam.targetZoom = Math.max(0.3, Math.min(3, cam.targetZoom - e.deltaY * 0.001));
  // Zoom değişimini kaydet
  if (typeof StateManager !== 'undefined') StateManager.saveCamera(cam.x, cam.y, cam.targetZoom);
}, { passive: false });

// ── World to Screen ──
function w2s(x, y) {
  return { x: (x + cam.x) * cam.zoom + W/2, y: (y + cam.y) * cam.zoom + H/2 };
}

// ── Drawing Helpers moved to renderer.ts ──

// ══════════════════════════════════
// MAIN RENDER LOOP
// ══════════════════════════════════
function render() {
  frame++;
  ctx.clearRect(0,0,W,H);

  // Smooth zoom
  cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

  // ── Stars ──
  for (const s of stars) {
    const p = w2s(s.x, s.y);
    if (p.x < -10 || p.x > W+10 || p.y < -10 || p.y > H+10) continue;
    ctx.beginPath(); ctx.arc(p.x,p.y, s.size*cam.zoom*0.5, 0, Math.PI*2);
    ctx.fillStyle = `rgba(180,200,220,${s.alpha * (0.5+0.5*Math.sin(frame*0.01+s.x))})`;
    ctx.fill();
  }

  // ── Edges (curved bezier lines) ──
  for (const e of EDGES) {
    const fromN = NODES.find(n=>n.id===e.from);
    const toN = NODES.find(n=>n.id===e.to);
    if (!fromN||!toN) continue;
    const p1 = w2s(fromN.x, fromN.y);
    const p2 = w2s(toN.x, toN.y);
    const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
    const dx = p2.x-p1.x, dy = p2.y-p1.y;
    const cpx = mx + dy*0.15, cpy = my - dx*0.15;

    const isEdgeHover = hoveredEdge === e;
    const isNodeHover = hoveredNode && (hoveredNode.id===e.from || hoveredNode.id===e.to);

    ctx.beginPath();
    ctx.moveTo(p1.x,p1.y);
    ctx.quadraticCurveTo(cpx,cpy,p2.x,p2.y);

    if (isEdgeHover) {
      // Glow effect for hovered edge
      ctx.strokeStyle = colorToRgba('#ff4444', 0.7);
      ctx.lineWidth = 4;
      ctx.stroke();
      // Softer glow outer
      ctx.beginPath();
      ctx.moveTo(p1.x,p1.y);
      ctx.quadraticCurveTo(cpx,cpy,p2.x,p2.y);
      ctx.strokeStyle = colorToRgba('#ff4444', 0.15);
      ctx.lineWidth = 10;
      ctx.stroke();
      // ✕ icon at midpoint
      const midT = 0.5, it = 0.5;
      const midX = it*it*p1.x + 2*it*midT*cpx + midT*midT*p2.x;
      const midY = it*it*p1.y + 2*it*midT*cpy + midT*midT*p2.y;
      ctx.beginPath(); ctx.arc(midX, midY, 10, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,50,50,0.3)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,100,100,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,150,150,0.9)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✕', midX, midY);
    } else {
      ctx.strokeStyle = colorToRgba(e.color, isNodeHover ? 0.9 : 0.35);
      ctx.lineWidth = isNodeHover ? 3 : 1.8;
      ctx.stroke();
    }
  }

  // ── Link Drag Visual (rubber-band line) ──
  if (linkDrag) {
    const fromP = w2s(linkDrag.fromNode.x, linkDrag.fromNode.y);
    const toX = linkDrag.mx, toY = linkDrag.my;
    const ldMx = (fromP.x+toX)/2, ldMy = (fromP.y+toY)/2;
    const ldDx = toX-fromP.x, ldDy = toY-fromP.y;
    const ldCpx = ldMx + ldDy*0.1, ldCpy = ldMy - ldDx*0.1;

    // Dashed animated line
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -frame * 0.5;
    ctx.beginPath();
    ctx.moveTo(fromP.x, fromP.y);
    ctx.quadraticCurveTo(ldCpx, ldCpy, toX, toY);
    ctx.strokeStyle = colorToRgba('#00d4ff', 0.7);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Source node pulse ring
    ctx.beginPath(); ctx.arc(fromP.x, fromP.y, 18*cam.zoom + Math.sin(frame*0.06)*4, 0, Math.PI*2);
    ctx.strokeStyle = colorToRgba('#00d4ff', 0.4); ctx.lineWidth = 2; ctx.stroke();

    // Target endpoint circle
    ctx.beginPath(); ctx.arc(toX, toY, 8, 0, Math.PI*2);
    ctx.fillStyle = colorToRgba('#00d4ff', 0.3); ctx.fill();
    ctx.strokeStyle = colorToRgba('#00d4ff', 0.8); ctx.lineWidth = 2; ctx.stroke();

    // If hovering a valid target, show snap indicator
    if (hoveredNode && hoveredNode !== linkDrag.fromNode) {
      const tp = w2s(hoveredNode.x, hoveredNode.y);
      ctx.beginPath(); ctx.arc(tp.x, tp.y, (hoveredNode.r + 12)*cam.zoom, 0, Math.PI*2);
      ctx.strokeStyle = colorToRgba('#00ff88', 0.6);
      ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.stroke();
      ctx.setLineDash([]);
      // Green checkmark
      ctx.font = `${14*cam.zoom}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(0,255,136,0.8)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', tp.x, tp.y - (hoveredNode.r + 20)*cam.zoom);
    }
  }

  // ── Flow Particles ──
  if (frame % 8 === 0) spawnFlow();
  for (let i = flowParticles.length-1; i >= 0; i--) {
    const fp = flowParticles[i];
    fp.t += fp.speed;
    if (fp.t > 1) { flowParticles.splice(i,1); continue; }
    const fromN = NODES.find(n=>n.id===fp.edge.from);
    const toN = NODES.find(n=>n.id===fp.edge.to);
    if (!fromN||!toN) continue;
    const t = fp.reverse ? 1-fp.t : fp.t;
    const fx = fromN.x+(toN.x-fromN.x)*t, fy = fromN.y+(toN.y-fromN.y)*t;
    const p = w2s(fx,fy);
    ctx.beginPath(); ctx.arc(p.x,p.y, fp.size*cam.zoom*2, 0, Math.PI*2);
    ctx.fillStyle = colorToRgba(fp.edge.color, 1);
    ctx.fill();
    // particle glow
    const pg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,fp.size*cam.zoom*5);
    pg.addColorStop(0, colorToRgba(fp.edge.color, 0.4)); pg.addColorStop(1,'transparent');
    ctx.fillStyle = pg; ctx.fillRect(p.x-fp.size*cam.zoom*5,p.y-fp.size*cam.zoom*5,fp.size*cam.zoom*10,fp.size*cam.zoom*10);
  }

  // ── Nodes ──
  for (const n of NODES) {
    const p = w2s(n.x, n.y);
    const sr = n.r * cam.zoom;
    const isHover = hoveredNode === n;
    const pulse = 0.8 + 0.2*Math.sin(frame*0.03 + n.x*0.01);

    // Ambient glow — MAX BRIGHT
    const gR = sr * (isHover ? 6 : 4.5);
    const glow = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y, gR);
    glow.addColorStop(0, colorToRgba(n.color, isHover ? 0.6 : 0.35*pulse));
    glow.addColorStop(0.3, colorToRgba(n.color, isHover ? 0.25 : 0.12*pulse));
    glow.addColorStop(0.7, colorToRgba(n.color, isHover ? 0.06 : 0.03*pulse));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x-gR, p.y-gR, gR*2, gR*2);

    // Orbiting elements (non-leaf nodes)
    if (n.type !== 'dot') {
      drawOrbitingElements(ctx, p.x, p.y, sr, n.color, n.id, frame, cam.zoom);
    }

    // Cluster visual
    if (n.id === 'core') {
      drawCoreNode(ctx, p.x, p.y, sr, isHover, frame, cam.zoom);
    } else if (n.type === 'hex') {
      // Central hexagonal
      hexPath(ctx, p.x, p.y, sr);
      ctx.fillStyle = colorToRgba(n.color, 0.15);
      ctx.fill();
      hexPath(ctx, p.x, p.y, sr);
      ctx.strokeStyle = colorToRgba(n.color, isHover ? 1 : 0.6*pulse);
      ctx.lineWidth = isHover ? 3 : 2; ctx.stroke();
      // Inner hex
      hexPath(ctx, p.x, p.y, sr*0.6);
      ctx.strokeStyle = colorToRgba(n.color, 0.4); ctx.lineWidth = 1.5; ctx.stroke();
      // Rotating outer ring
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(frame*0.005);
      hexPath(ctx, 0, 0, sr*1.3);
      ctx.strokeStyle = colorToRgba(n.color, 0.25); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    } else if (n.type === 'mesh') {
      drawMeshCluster(ctx, p.x, p.y, sr, `rgb(${parseInt(n.color.slice(1,3),16)},${parseInt(n.color.slice(3,5),16)},${parseInt(n.color.slice(5,7),16)})`, isHover?1:pulse, frame, cam.zoom);
      ctx.beginPath(); ctx.arc(p.x,p.y,sr*0.4,0,Math.PI*2);
      ctx.fillStyle = colorToRgba(n.color, 0.3); ctx.fill();
      ctx.strokeStyle = colorToRgba(n.color, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
    } else if (n.type === 'particles') {
      drawParticleCloud(ctx, p.x, p.y, sr, `rgb(${parseInt(n.color.slice(1,3),16)},${parseInt(n.color.slice(3,5),16)},${parseInt(n.color.slice(5,7),16)})`, isHover?1:pulse, frame, cam.zoom);
      ctx.beginPath(); ctx.arc(p.x,p.y,sr*0.35,0,Math.PI*2);
      ctx.fillStyle = colorToRgba(n.color, 0.35); ctx.fill();
    } else if (n.type === 'rings') {
      drawRingsCluster(ctx, p.x, p.y, sr, `rgb(${parseInt(n.color.slice(1,3),16)},${parseInt(n.color.slice(3,5),16)},${parseInt(n.color.slice(5,7),16)})`, isHover?1:pulse, frame, cam.zoom);
      ctx.beginPath(); ctx.arc(p.x,p.y,sr*0.3,0,Math.PI*2);
      ctx.fillStyle = colorToRgba(n.color, 0.4); ctx.fill();
    } else if (n.type === 'depot') {
      // ══ DEPOT NODE — Training Memory Visualizer ══
      const depotR = sr * 2.5;

      // Memory data
      const memEntries = Object.entries(agentMemory);
      const totalMem = memEntries.reduce((s,[,m]) => s + m.level, 0) / Math.max(1, memEntries.length);
      const totalItems = memEntries.reduce((s,[,m]) => s + m.items, 0);

      // ── Ambient energy field ──
      const amb = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, depotR * 2);
      amb.addColorStop(0, `rgba(160,120,255,${0.06 + totalMem*0.001})`);
      amb.addColorStop(0.5, 'rgba(160,120,255,0.02)');
      amb.addColorStop(1, 'transparent');
      ctx.fillStyle = amb;
      ctx.fillRect(p.x - depotR*2, p.y - depotR*2, depotR*4, depotR*4);

      // ── Outer progress arc (total memory %) ──
      const progressAngle = (totalMem / 100) * Math.PI * 2;
      ctx.save(); ctx.translate(p.x, p.y);
      // Background ring
      ctx.beginPath(); ctx.arc(0, 0, depotR * 1.3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(160,120,255,0.06)';
      ctx.lineWidth = 3 * cam.zoom; ctx.stroke();
      // Fill ring
      ctx.beginPath(); ctx.arc(0, 0, depotR * 1.3, -Math.PI/2, -Math.PI/2 + progressAngle);
      const progGrad = ctx.createLinearGradient(-depotR, 0, depotR, 0);
      progGrad.addColorStop(0, 'rgba(0,200,255,0.5)');
      progGrad.addColorStop(0.5, 'rgba(160,120,255,0.7)');
      progGrad.addColorStop(1, 'rgba(255,100,200,0.5)');
      ctx.strokeStyle = progGrad;
      ctx.lineWidth = 3 * cam.zoom; ctx.stroke();
      ctx.restore();

      // ── Memory Bars (circular layout) ──
      const barCount = memEntries.length;
      const angleStep = (Math.PI * 2) / Math.max(barCount, 1);
      const innerR = depotR * 0.45;
      const maxBarH = depotR * 0.75;

      for (let i = 0; i < barCount; i++) {
        const [agId, mem] = memEntries[i];
        const angle = angleStep * i - Math.PI/2;
        const ratio = mem.level / 100;
        const breathe = Math.sin(frame * 0.03 + i * 0.8) * 0.02;
        const barH = innerR + maxBarH * (ratio + breathe);
        const barW = angleStep * 0.55;
        const recentLearn = (Date.now() - mem.lastLearn) < 3000;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Bar gradient (bottom dim → top bright)
        const bx1 = Math.cos(angle) * innerR;
        const by1 = Math.sin(angle) * innerR;
        const bx2 = Math.cos(angle) * barH;
        const by2 = Math.sin(angle) * barH;

        const barGrad = ctx.createLinearGradient(bx1, by1, bx2, by2);
        barGrad.addColorStop(0, colorToRgba(mem.color, 0.04));
        barGrad.addColorStop(0.4, colorToRgba(mem.color, isHover ? 0.35 : 0.2));
        barGrad.addColorStop(1, colorToRgba(mem.color, isHover ? 0.75 : 0.5));

        ctx.beginPath();
        ctx.arc(0, 0, innerR, angle - barW/2, angle + barW/2);
        ctx.arc(0, 0, barH, angle + barW/2, angle - barW/2, true);
        ctx.closePath();
        ctx.fillStyle = barGrad; ctx.fill();

        // ── Bar tip (bright dot) ──
        const tipX = Math.cos(angle) * barH;
        const tipY = Math.sin(angle) * barH;
        const tipR = recentLearn ? 3.5*cam.zoom : 2*cam.zoom;
        ctx.beginPath(); ctx.arc(tipX, tipY, tipR, 0, Math.PI*2);
        ctx.fillStyle = mem.color; ctx.fill();

        // Recent learn flash
        if (recentLearn) {
          const flashAlpha = 0.4 * (1 - (Date.now() - mem.lastLearn) / 3000);
          const flashR = tipR * 3;
          ctx.beginPath(); ctx.arc(tipX, tipY, flashR, 0, Math.PI*2);
          ctx.fillStyle = colorToRgba(mem.color, flashAlpha); ctx.fill();
        }

        // Tip glow
        const tg = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 6*cam.zoom);
        tg.addColorStop(0, colorToRgba(mem.color, 0.25));
        tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg;
        ctx.fillRect(tipX-6*cam.zoom, tipY-6*cam.zoom, 12*cam.zoom, 12*cam.zoom);

        // ── Memory % near tip (only when zoomed in) ──
        if (cam.zoom > 0.7) {
          const labelDist = barH + 10*cam.zoom;
          const lx = Math.cos(angle) * labelDist;
          const ly = Math.sin(angle) * labelDist;
          ctx.font = `600 ${5.5*cam.zoom}px 'JetBrains Mono'`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = colorToRgba(mem.color, 0.6);
          ctx.fillText(Math.floor(mem.level) + '%', lx, ly);
        }

        ctx.restore();
      }

      // ── Inner circle (dark core) ──
      const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, innerR);
      coreGrad.addColorStop(0, 'rgba(6,8,16,0.97)');
      coreGrad.addColorStop(0.8, 'rgba(10,12,24,0.93)');
      coreGrad.addColorStop(1, 'rgba(18,16,36,0.8)');
      ctx.beginPath(); ctx.arc(p.x, p.y, innerR, 0, Math.PI*2);
      ctx.fillStyle = coreGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(160,120,255,0.15)';
      ctx.lineWidth = 1 * cam.zoom; ctx.stroke();

      // ── Heartbeat pulse ──
      const hbPhase = Math.sin(frame * 0.05);
      const hbR = innerR * (0.5 + hbPhase * 0.08);
      ctx.beginPath(); ctx.arc(p.x, p.y, hbR, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(160,120,255,${0.15 + hbPhase * 0.08})`;
      ctx.lineWidth = 1.2 * cam.zoom; ctx.stroke();

      // ── Center display ──
      // Total memory %
      ctx.font = `700 ${15*cam.zoom}px 'Orbitron'`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const memAlpha = 0.7 + hbPhase * 0.12;
      ctx.fillStyle = `rgba(160,120,255,${memAlpha})`;
      ctx.fillText(Math.floor(totalMem) + '%', p.x, p.y - 4*cam.zoom);
      // Label
      ctx.font = `500 ${5*cam.zoom}px 'JetBrains Mono'`;
      ctx.fillStyle = 'rgba(160,120,255,0.3)';
      ctx.fillText('HAFIZA', p.x, p.y + 9*cam.zoom);
      // Items count
      ctx.font = `${4*cam.zoom}px 'JetBrains Mono'`;
      ctx.fillStyle = 'rgba(160,120,255,0.2)';
      ctx.fillText(totalItems + ' veri', p.x, p.y + 15*cam.zoom);

      // ── Knowledge particles orbiting ──
      for (let i = 0; i < 4; i++) {
        const orbA = frame * (0.008 + i*0.004) + i * (Math.PI*2/4);
        const orbDist = depotR * (1.08 + i * 0.06);
        const ox = p.x + Math.cos(orbA) * orbDist;
        const oy = p.y + Math.sin(orbA) * orbDist;
        ctx.beginPath(); ctx.arc(ox, oy, 1.8*cam.zoom, 0, Math.PI*2);
        ctx.fillStyle = `rgba(160,120,255,${0.35 - i*0.07})`; ctx.fill();
      }

    } else {
      // ── Premium Dot Node ──
      const dotR = sr * 1.2;

      // Layer 1: Soft ambient halo
      const haloR = dotR * 3;
      const halo = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y,haloR);
      halo.addColorStop(0, colorToRgba(n.color, isHover ? 0.2 : 0.08*pulse));
      halo.addColorStop(0.5, colorToRgba(n.color, 0.02*pulse));
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(p.x-haloR, p.y-haloR, haloR*2, haloR*2);

      // Layer 2: Pulsing outer ring
      const ringR = dotR * 1.6 + Math.sin(frame*0.03 + n.x*0.02) * dotR * 0.15;
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI*2);
      ctx.strokeStyle = colorToRgba(n.color, isHover ? 0.5 : 0.2*pulse);
      ctx.lineWidth = 0.8*cam.zoom; ctx.stroke();

      // Layer 3: Rotating arc segment
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.rotate(frame * 0.015 + n.y*0.01);
      ctx.beginPath(); ctx.arc(0, 0, dotR*1.35, 0, Math.PI*0.6);
      ctx.strokeStyle = colorToRgba(n.color, 0.35*pulse);
      ctx.lineWidth = 1.2*cam.zoom; ctx.stroke();
      ctx.restore();

      // Layer 4: Gradient filled center
      const coreGrad = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y,dotR);
      coreGrad.addColorStop(0, colorToRgba(n.color, isHover ? 0.7 : 0.4));
      coreGrad.addColorStop(0.6, colorToRgba(n.color, isHover ? 0.35 : 0.15));
      coreGrad.addColorStop(1, colorToRgba(n.color, 0.05));
      ctx.beginPath(); ctx.arc(p.x, p.y, dotR, 0, Math.PI*2);
      ctx.fillStyle = coreGrad; ctx.fill();

      // Layer 5: Crisp border
      ctx.beginPath(); ctx.arc(p.x, p.y, dotR, 0, Math.PI*2);
      ctx.strokeStyle = colorToRgba(n.color, isHover ? 1 : 0.55*pulse);
      ctx.lineWidth = 1.5*cam.zoom; ctx.stroke();

      // Layer 6: Bright center point
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5*cam.zoom, 0, Math.PI*2);
      ctx.fillStyle = colorToRgba(n.color, 0.9); ctx.fill();

      // Layer 7: Tiny orbiting particle
      const orbAngle = frame * 0.025 + n.x*0.05;
      const orbR = dotR * 1.5;
      const opx = p.x + Math.cos(orbAngle)*orbR;
      const opy = p.y + Math.sin(orbAngle)*orbR;
      ctx.beginPath(); ctx.arc(opx, opy, 1.5*cam.zoom, 0, Math.PI*2);
      ctx.fillStyle = colorToRgba(n.color, 0.6); ctx.fill();
    }

    // Icon dot center
    if (n.type !== 'dot' && n.type !== 'depot') {
      ctx.beginPath(); ctx.arc(p.x,p.y, 4*cam.zoom, 0, Math.PI*2);
      ctx.fillStyle = n.color; ctx.fill();
      // center glow
      const cg = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y, 8*cam.zoom);
      cg.addColorStop(0, colorToRgba(n.color, 0.5)); cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg; ctx.fillRect(p.x-8*cam.zoom, p.y-8*cam.zoom, 16*cam.zoom, 16*cam.zoom);
    }

    // Label
    const labelOffset = n.type === 'depot' ? sr*2.5*1.4 + 10*cam.zoom : sr + 16*cam.zoom;
    ctx.font = `bold ${n.type==='dot' ? 10*cam.zoom : 13*cam.zoom}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = colorToRgba(n.color, isHover ? 1 : 0.95);
    ctx.fillText(n.label, p.x, p.y + labelOffset);
    // Subtitle
    if (n.sub && cam.zoom > 0.6) {
      ctx.font = `${9*cam.zoom}px 'JetBrains Mono'`;
      ctx.fillStyle = colorToRgba(n.color, isHover ? 0.9 : 0.6);
      ctx.fillText(n.sub, p.x, p.y + labelOffset + 12*cam.zoom);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Selection indicator (subtle glow, no white ring)
    if (selectedNodes.has(n)) {
      const sg = ctx.createRadialGradient(p.x, p.y, sr*0.8, p.x, p.y, sr*2.2);
      sg.addColorStop(0, colorToRgba(n.color, 0.15));
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(p.x - sr*2.2, p.y - sr*2.2, sr*4.4, sr*4.4);
    }

    // ── Status Badge ──
    if (n.status && n.type !== 'dot' && cam.zoom > 0.5) {
      n.statusPulse = (n.statusPulse || 0) + 0.06;
      const statusColors = {
        active:  { dot: '#00ff88', bg: 'rgba(0,255,136,0.12)', text: 'AKTİF' },
        loaded:  { dot: '#ffaa00', bg: 'rgba(255,170,0,0.10)', text: 'HAZIR' },
        idle:    { dot: '#555566', bg: 'rgba(80,80,100,0.08)', text: 'BEKLE' },
        error:   { dot: '#ff4444', bg: 'rgba(255,68,68,0.12)', text: 'HATA' },
      };
      const st = statusColors[n.status] || statusColors.idle;
      const badgeX = p.x + sr + 6*cam.zoom;
      const badgeY = p.y - sr * 0.6;
      const dotR = 4 * cam.zoom;

      // Status dot
      ctx.beginPath(); ctx.arc(badgeX, badgeY, dotR, 0, Math.PI*2);
      ctx.fillStyle = st.dot; ctx.fill();

      // Pulse ring for active
      if (n.status === 'active') {
        const pulseAlpha = 0.3 + Math.sin(n.statusPulse) * 0.2;
        const pulseR = dotR * (1.5 + Math.sin(n.statusPulse) * 0.5);
        ctx.beginPath(); ctx.arc(badgeX, badgeY, pulseR, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0,255,136,${pulseAlpha})`;
        ctx.lineWidth = 1.2 * cam.zoom; ctx.stroke();
      }

      // Blink for error
      if (n.status === 'error') {
        const blinkAlpha = 0.3 + Math.sin(n.statusPulse * 2) * 0.3;
        ctx.beginPath(); ctx.arc(badgeX, badgeY, dotR * 2, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,68,68,${blinkAlpha * 0.15})`; ctx.fill();
      }

      // Status text
      if (cam.zoom > 0.7) {
        ctx.font = `600 ${7*cam.zoom}px 'JetBrains Mono'`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = st.dot;
        ctx.fillText(st.text, badgeX + dotR + 4*cam.zoom, badgeY);
      }

      // Dot glow
      const dg = ctx.createRadialGradient(badgeX, badgeY, 0, badgeX, badgeY, dotR*3);
      dg.addColorStop(0, st.bg); dg.addColorStop(1, 'transparent');
      ctx.fillStyle = dg;
      ctx.fillRect(badgeX - dotR*3, badgeY - dotR*3, dotR*6, dotR*6);
    }

    // ── Small dot status indicator ──
    if (n.status && n.type === 'dot' && n.status !== 'idle' && cam.zoom > 0.7) {
      const dColor = n.status === 'active' ? '#00ff88' : n.status === 'loaded' ? '#ffaa00' : n.status === 'error' ? '#ff4444' : '#556';
      const dR = 2.5 * cam.zoom;
      const dx = p.x + sr + 4*cam.zoom, dy = p.y;
      ctx.beginPath(); ctx.arc(dx, dy, dR, 0, Math.PI*2);
      ctx.fillStyle = dColor; ctx.fill();
      if (n.status === 'active') {
        ctx.beginPath(); ctx.arc(dx, dy, dR * 2, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0,255,136,${0.2 + Math.sin((n.statusPulse||0))*0.15})`;
        ctx.lineWidth = 0.8*cam.zoom; ctx.stroke();
        n.statusPulse = (n.statusPulse || 0) + 0.06;
      }
    }
  }

  // ── Sentinel Drone ──
  drawSentinel(ctx, sentinel, frame, cam, w2s);

  // ── Box Select Rectangle ──
  if (boxSelect) {
    const bx = Math.min(boxSelect.sx, boxSelect.ex), by = Math.min(boxSelect.sy, boxSelect.ey);
    const bw = Math.abs(boxSelect.ex - boxSelect.sx), bh = Math.abs(boxSelect.ey - boxSelect.sy);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }

  // ── Tooltip ──
  if (hoveredNode && hoveredNode.info) {
    tooltip.classList.add('visible');
    tooltip.style.left = (mouse.x + 16) + 'px';
    tooltip.style.top = (mouse.y - 10) + 'px';
    (document.getElementById('tooltipHeader') as any).style.color = hoveredNode.color;
    (document.getElementById('tooltipHeader') as any).textContent = hoveredNode.label;
    (document.getElementById('tooltipBody') as any).innerHTML = (() => {
      let lines = [...(hoveredNode.info || [])];
      // Model bilgisi info'da yoksa ve node.model varsa otomatik ekle
      if (hoveredNode.model && !lines.some(l => l.startsWith('MODEL:'))) {
        lines.push('MODEL: ' + hoveredNode.model);
      }
      return lines.map(l => {
        const [k,v] = l.split(': ');
        return `<div class="tooltip-row"><span>${k}:</span><span class="tooltip-val" style="color:${hoveredNode.color}">${v}</span></div>`;
      }).join('');
    })();
  } else {
    tooltip.classList.remove('visible');
  }

  // ── Status Bar ──
  if (frame % 60 === 0) {
    const zoomEl = (document.getElementById('zoomLevel') as any); if (zoomEl) zoomEl.textContent = Math.round(cam.zoom*100) + '%';
  }

  // ── Mini Map ──
  if (frame % 10 === 0) drawMiniMap();

  requestAnimationFrame(render);
}

// ── Mini Map ──
function drawMiniMap() {
  const mc = (document.getElementById('miniMapCanvas') as any);
  if (!mc) return;
  const mctx = mc.getContext('2d');
  const mW = mc.width, mH = mc.height;
  mctx.clearRect(0,0,mW,mH);
  const scale = 0.1;
  const ox = mW/2, oy = mH/2;
  // Nodes
  for (const n of NODES) {
    const x = ox + n.x*scale, y = oy + n.y*scale;
    mctx.beginPath(); mctx.arc(x,y, n.r*scale*0.8, 0, Math.PI*2);
    mctx.fillStyle = colorToRgba(n.color, 0.5);
    mctx.fill();
  }
  // Edges
  for (const e of EDGES) {
    const f = NODES.find(n=>n.id===e.from), t = NODES.find(n=>n.id===e.to);
    if (!f||!t) continue;
    mctx.beginPath();
    mctx.moveTo(ox+f.x*scale, oy+f.y*scale);
    mctx.lineTo(ox+t.x*scale, oy+t.y*scale);
    mctx.strokeStyle = colorToRgba(e.color, 0.15);
    mctx.lineWidth = 0.5; mctx.stroke();
  }
  // Viewport
  const vx = ox + (-cam.x - W/2/cam.zoom)*scale;
  const vy = oy + (-cam.y - H/2/cam.zoom)*scale;
  const vw = (W/cam.zoom)*scale, vh = (H/cam.zoom)*scale;
  mctx.strokeStyle = 'rgba(0,212,255,0.4)';
  mctx.lineWidth = 1;
  mctx.strokeRect(vx,vy,vw,vh);
}

render();

initVoiceChat();
initContextMenu(canvas, cam, () => W, () => H, selectedNodes, updateDeleteBtn);

function updateDeleteBtn() {
  const btn = (document.getElementById('deleteNodeBtn') as any);
  if (!btn) return;
  const canDelete = selectedNodes.size > 0 && !selectedNodes.has(NODES.find(n => n.id === 'core'));
  btn.disabled = !canDelete;
  btn.textContent = selectedNodes.size > 1 ? `✕ SEÇİLİ SİL (${selectedNodes.size})` : '✕ SEÇİLİ SİL';
}
