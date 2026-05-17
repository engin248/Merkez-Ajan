import { NODES, EDGES } from './data.ts';

const GRAPH_STATE_KEY = 'asker_motoru_graph_state_v4';

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
        capabilities: saved.capabilities || [],
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

export async function fetchAndMergeModules() {
  try {
    const res = await fetch('/api/modules');
    const mods = await res.json();
    
    // Save current positions to merge
    const oldNodes = new Map();
    NODES.forEach(n => oldNodes.set(n.id, n));
    
    // Reset but keep Core and Depot
    const coreNode = oldNodes.get('core') || { id:'core', label:'ASKER MOTORU', sub:'Merkez Komuta AI', x:0, y:0, r:50, color:'#b800ff', type:'hex', model:'qwen3:8b' };
    const depotNode = oldNodes.get('depot') || { id:'depot', label:'EĞİTİM HAFIZASI', sub:'Ajan Bellek Merkezi', x:-300, y:200, r:30, color:'#b080ff', type:'depot', parent:'core', info:['MODULE: Training Memory','CAPACITY: 2048 MB','STATUS: LEARNING'] };
    
    NODES.length = 0;
    EDGES.length = 0;
    
    coreNode.children = mods.map((m:any) => m.id);
    NODES.push(coreNode);
    NODES.push(depotNode);
    
    let modAngle = 0;
    const angleStep = (Math.PI * 2) / Math.max(1, mods.length);
    const radius = 250;
    
    const colors = ['#ff0000', '#25d366', '#00aaff', '#ff9900', '#ff00ff', '#00ffff'];
    
    mods.forEach((mod: any, i: number) => {
        const cColor = colors[i % colors.length];
        const existMod = oldNodes.get(mod.id);
        const mx = existMod ? existMod.x : Math.cos(modAngle) * radius;
        const my = existMod ? existMod.y : Math.sin(modAngle) * radius;
        
        NODES.push({
            id: mod.id,
            label: mod.name,
            sub: mod.category,
            x: mx, y: my, r: 18, color: cColor, type: 'rings', parent: 'core',
            children: mod.tools.map((t:any) => t.name),
            info: [`MODULE: ${mod.name}`, 'STATUS: AKTİF']
        });
        
        EDGES.push({ from: 'core', to: mod.id, color: cColor });
        
        // Araçlar (Alt düğümler)
        mod.tools.forEach((tool: any, j: number) => {
            const existTool = oldNodes.get(tool.name);
            // Parent'ın etrafında küçük bir çemberde dizelim
            const toolAngle = modAngle + (j - mod.tools.length/2) * 0.4;
            const tx = existTool ? existTool.x : mx + Math.cos(toolAngle) * 80;
            const ty = existTool ? existTool.y : my + Math.sin(toolAngle) * 80;
            
            NODES.push({
                id: tool.name,
                label: tool.name,
                x: tx, y: ty, r: 10, color: cColor, type: 'dot', parent: mod.id
            });
            EDGES.push({ from: mod.id, to: tool.name, color: cColor });
        });
        
        modAngle += angleStep;
    });
    
    console.log(`[STATE] Dinamik modüller eklendi. Toplam ${NODES.length} düğüm.`);
  } catch(e) {
    console.error('[STATE] Modülleri çekerken hata oluştu:', e);
  }
}

export function saveNodePositions() { 
  saveGraphState(); 
}
