import { NODES, EDGES } from './data.ts';

const GRAPH_STATE_KEY = 'asker_motoru_graph_state';

export function saveGraphState() {
  try {
    const nodesData = NODES.map((n: any) => ({
      id: n.id, label: n.label, sub: n.sub,
      x: n.x, y: n.y, r: n.r,
      color: n.color, type: n.type,
      model: n.model || null,
      parent: n.parent || null,
      children: n.children || [],
      info: n.info || [],
      capabilities: n.capabilities || []
    }));
    const edgesData = EDGES.map((e: any) => ({ from: e.from, to: e.to, color: e.color }));
    const state = {
      nodes: nodesData,
      edges: edgesData,
      savedAt: Date.now()
    };
    localStorage.setItem(GRAPH_STATE_KEY, JSON.stringify(state));
  } catch(e) { console.error('[STATE] Kaydetme hatası:', e); }
}

export function loadGraphState() {
  try {
    const raw = localStorage.getItem(GRAPH_STATE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state.nodes || !state.edges) return false;

    NODES.length = 0;
    state.nodes.forEach((saved: any) => {
      NODES.push({
        id: saved.id,
        label: saved.label,
        sub: saved.sub || null,
        x: saved.x, y: saved.y, r: saved.r,
        color: saved.color,
        type: saved.type,
        model: saved.model || null,
        parent: saved.parent || undefined,
        children: saved.children || [],
        info: saved.info || [],
        status: 'idle',
        statusSince: 0,
        statusPulse: 0
      });
    });

    EDGES.length = 0;
    state.edges.forEach((saved: any) => {
      EDGES.push({ from: saved.from, to: saved.to, color: saved.color });
    });

    console.log(`[STATE] Graph yüklendi: ${NODES.length} node, ${EDGES.length} edge`);
    return true;
  } catch(e) {
    console.error('[STATE] Yükleme hatası:', e);
    return false;
  }
}

export function saveNodePositions() { 
  saveGraphState(); 
}
