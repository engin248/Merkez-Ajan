import { NODES, modelToNodeId } from './data.ts';
import { logActivity } from './logger.ts';

export async function pollModelStatus() {
  const activeIds = new Set(['core']);

  try {
    const psRes = await fetch('http://localhost:11434/api/ps', { signal: AbortSignal.timeout(3000) });
    if (psRes.ok) {
      const psData = await psRes.json();
      if (psData.models) {
        for (const m of psData.models) {
          const nodeId = modelToNodeId(m.name || m.model);
          if (nodeId) activeIds.add(nodeId);
        }
      }
      const ollamaNode = NODES.find((n: any) => n.id === 'inf_ollama');
      if (ollamaNode) { ollamaNode.status = 'active'; ollamaNode.statusSince = Date.now(); }
    }
  } catch(e) {
    const ollamaNode = NODES.find((n: any) => n.id === 'inf_ollama');
    if (ollamaNode) ollamaNode.status = 'error';
  }

  try {
    const tagRes = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    if (tagRes.ok) {
      const tagData = await tagRes.json();
      if (tagData.models) {
        for (const m of tagData.models) {
          const nodeId = modelToNodeId(m.name || m.model);
          if (nodeId && !activeIds.has(nodeId)) {
            const node = NODES.find((n: any) => n.id === nodeId);
            if (node && node.status !== 'active') {
              node.status = 'loaded';
              node.statusSince = Date.now();
            }
          }
        }
      }
    }
  } catch(e) { /* ignore */ }

  try {
    const srvRes = await fetch('/api/healthcheck', { signal: AbortSignal.timeout(2000) });
    if (srvRes.ok) {
      activeIds.add('infra');
      // ZMQ kaldırıldı — Panel Server'ı PM2 node'u olarak izle
      const pm2Node = NODES.find((n: any) => n.id === 'inf_pm2');
      if (pm2Node) pm2Node.status = 'active';
    }
  } catch(e) {
    activeIds.add('infra');
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const voiceNode = NODES.find((n: any) => n.id === 'voice');
    if (voiceNode) voiceNode.status = 'loaded';
    const sttNode = NODES.find((n: any) => n.id === 'v_stt');
    if (sttNode) sttNode.status = 'loaded';
    if (window.speechSynthesis) {
      const ttsNode = NODES.find((n: any) => n.id === 'v_tts');
      if (ttsNode) ttsNode.status = 'loaded';
    }
  }

  for (const nodeId of activeIds) {
    const node = NODES.find((n: any) => n.id === nodeId);
    if (node) {
      if (node.status !== 'active') node.statusSince = Date.now();
      node.status = 'active';
      if (node.parent) {
        const parent = NODES.find((n: any) => n.id === node.parent);
        if (parent && parent.status === 'idle') {
          parent.status = 'loaded';
        }
      }
    }
  }

  NODES.forEach((n: any) => {
    if (!activeIds.has(n.id) && n.status !== 'loaded' && n.status !== 'error' && n.id !== 'core') {
      if (n.status === 'active' && Date.now() - n.statusSince < 10000) return;
      if (n.status === 'active') n.status = 'idle';
    }
  });
}

// Log status changes wrapper
let previousPollStatus: any = {};
export async function pollModelStatusWithLogs() {
  NODES.forEach((n: any) => previousPollStatus[n.id] = n.status);
  await pollModelStatus();
  NODES.forEach((n: any) => {
    if (previousPollStatus[n.id] !== n.status && n.type !== 'dot') {
      const statusLabels: any = { active: 'AKTİF', loaded: 'HAZIR', idle: 'BEKLEMEDE', error: 'HATA' };
      const label = statusLabels[n.status] || n.status;
      logActivity(n.label, `Durum değişti → ${label}`, 'status', n.color);
    }
  });
}

export function startMonitoring() {
  pollModelStatusWithLogs();
  setInterval(pollModelStatusWithLogs, 5000);
}
