// @ts-nocheck
import { ICONS, NODE_DEFS, CANVAS_ICONS } from './data.ts';

export const state = {
  agents: [],
  activeAgent: null,
  nodes: [],
  conns: [],
  dragNode: null,
  selectedNode: null,
  panX: 0,
  panY: 0,
  isPanning: false,
  lastPan: {x:0,y:0},
  zoom: 1,
  frame: 0,
  connDrag: null,
  mouseX: 0,
  mouseY: 0,
  SB_W: 240
};

// ═══ TRAINING STATE KALICI KAYIT SİSTEMİ ═══
const TRAINING_STATE_KEY = 'asker_motoru_training_state';

export function saveTrainingState() {
  try {
    const data = {
      agents: state.agents.map(ag => ({
        id: ag.id, name: ag.name, color: ag.color,
        nodes: ag.nodes.map(n => ({
          type: n.type, x: n.x, y: n.y, label: n.label,
          _color: n._color, id: n.id,
          _desc: n._desc || null, _url: n._url || null,
          _model: n._model || null, _role: n._role || null,
          _maxTokens: n._maxTokens || null,
          _memory: n._memory || false, _history: n._history !== false,
          _xp: n._xp || 0
        })),
        conns: ag.conns.map(c => ({
          fromId: c.from.id, toId: c.to.id, id: c.id
        }))
      })),
      activeAgentId: state.activeAgent ? state.activeAgent.id : null,
      panX: state.panX, panY: state.panY, zoom: state.zoom,
      savedAt: Date.now()
    };
    localStorage.setItem(TRAINING_STATE_KEY, JSON.stringify(data));
  } catch(e) { console.error('[TRAIN-STATE] Kaydetme hatası:', e); }
}

export function loadTrainingState() {
  try {
    const raw = localStorage.getItem(TRAINING_STATE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.agents) return false;

    state.agents = [];
    data.agents.forEach(saved => {
      const ag = { id: saved.id, name: saved.name, color: saved.color, nodes: [], conns: [] };
      // Restore nodes
      saved.nodes.forEach(sn => {
        ag.nodes.push({
          type: sn.type, x: sn.x, y: sn.y, label: sn.label,
          _color: sn._color, id: sn.id,
          _desc: sn._desc || null, _url: sn._url || null,
          _model: sn._model || null, _role: sn._role || null,
          _maxTokens: sn._maxTokens || null,
          _memory: sn._memory || false, _history: sn._history !== false,
          _xp: sn._xp || 0
        });
      });
      // Restore conns (reference by id)
      saved.conns.forEach(sc => {
        const fromNode = ag.nodes.find(n => n.id === sc.fromId);
        const toNode = ag.nodes.find(n => n.id === sc.toId);
        if (fromNode && toNode) {
          ag.conns.push({ from: fromNode, to: toNode, id: sc.id });
        }
      });
      state.agents.push(ag);
    });

    // Restore active agent
    if (data.activeAgentId) {
      state.activeAgent = state.agents.find(a => a.id === data.activeAgentId) || null;
      if (state.activeAgent) { state.nodes = state.activeAgent.nodes; state.conns = state.activeAgent.conns; }
    }
    state.panX = data.panX || 0;
    state.panY = data.panY || 0;
    state.zoom = data.zoom || 1;

    console.log(`[TRAIN-STATE] Yüklendi: ${state.agents.length} ajan`);
    return true;
  } catch(e) {
    console.error('[TRAIN-STATE] Yükleme hatası:', e);
    return false;
  }
}

// Başlangıçta yükle
loadTrainingState();
