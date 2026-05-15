import { NODES, EDGES } from './data.ts';
import { logActivity } from './logger.ts';

export const sentinel: any = {
  x: 0, y: 0,
  targetNode: null,
  prevNode: null,
  t: 0,
  speed: 0.008,
  state: 'traveling',
  scanTimer: 0,
  scanDuration: 120,
  trail: [],
  message: '',
  messageTimer: 0,
  visitedOrder: [],
  waitTimer: 0,
  pulsePhase: 0,
};

export const SENTINEL_MESSAGES = [
  'GÜVENLİ ✓', 'TARAMA OK', 'STABIL', 'AKTİF',
  'BAĞLANTI OK', 'SORUN YOK', 'ONAYLANDI', 'TEMİZ',
  'VERİ AKIŞI OK', 'SİNYAL GÜÇ: %100', 'KONTROL OK',
  'DÜĞÜM SAĞLAM', 'İLETİŞİM AKTİF', 'GÜVENLİK OK'
];

export function sentinelPickNext() {
  const current = sentinel.targetNode;
  let candidates: any[] = [];

  if (current) {
    for (const e of EDGES) {
      if (e.from === current.id) {
        const n = NODES.find((nd: any) => nd.id === e.to);
        if (n) candidates.push(n);
      }
      if (e.to === current.id) {
        const n = NODES.find((nd: any) => nd.id === e.from);
        if (n) candidates.push(n);
      }
    }
  }

  if (candidates.length === 0) {
    candidates = NODES.filter((n: any) => n.type !== 'dot');
  }

  if (candidates.length > 1 && sentinel.prevNode) {
    candidates = candidates.filter(n => n !== sentinel.prevNode);
  }

  const next = candidates[Math.floor(Math.random() * candidates.length)];
  sentinel.prevNode = sentinel.targetNode;
  sentinel.targetNode = next;
  sentinel.t = 0;
  sentinel.state = 'traveling';
}

export function updateSentinelLogic(frame: number) {
  sentinel.pulsePhase += 0.05;

  if (!sentinel.targetNode) {
    sentinelPickNext();
    if (sentinel.targetNode) {
      sentinel.x = sentinel.targetNode.x;
      sentinel.y = sentinel.targetNode.y;
    }
    return;
  }

  if (sentinel.state === 'idle') {
    sentinel.waitTimer--;
    if (sentinel.waitTimer <= 0) {
      sentinelPickNext();
    }
    return;
  }

  if (sentinel.state === 'traveling') {
    sentinel.t += sentinel.speed + Math.random() * 0.002;

    const tx = sentinel.targetNode.x;
    const ty = sentinel.targetNode.y;
    const sx = sentinel.prevNode ? sentinel.prevNode.x : sentinel.x;
    const sy = sentinel.prevNode ? sentinel.prevNode.y : sentinel.y;

    const mx = (sx + tx) / 2, my = (sy + ty) / 2;
    const dx = tx - sx, dy = ty - sy;
    const cpx = mx + dy * 0.2, cpy = my - dx * 0.2;

    const it = 1 - sentinel.t;
    sentinel.x = it*it*sx + 2*it*sentinel.t*cpx + sentinel.t*sentinel.t*tx;
    sentinel.y = it*it*sy + 2*it*sentinel.t*cpy + sentinel.t*sentinel.t*ty;

    if (frame % 3 === 0) {
      sentinel.trail.push({ x: sentinel.x, y: sentinel.y, age: 0 });
      if (sentinel.trail.length > 20) sentinel.trail.shift();
    }

    if (sentinel.t >= 1) {
      sentinel.x = tx;
      sentinel.y = ty;
      sentinel.state = 'scanning';
      sentinel.scanTimer = 0;
      sentinel.message = SENTINEL_MESSAGES[Math.floor(Math.random() * SENTINEL_MESSAGES.length)];
      sentinel.messageTimer = 90;
      if (sentinel.targetNode) {
        logActivity('NÖBETÇİ', `${sentinel.targetNode.label} kontrol edildi — ${sentinel.message}`, 'sentinel', '#00ffc8');
      }
    }
  }

  if (sentinel.state === 'scanning') {
    sentinel.scanTimer++;
    if (sentinel.scanTimer >= sentinel.scanDuration) {
      sentinel.state = 'idle';
      sentinel.waitTimer = 30 + Math.floor(Math.random() * 60);
    }
  }

  for (let i = sentinel.trail.length - 1; i >= 0; i--) {
    sentinel.trail[i].age++;
    if (sentinel.trail[i].age > 30) sentinel.trail.splice(i, 1);
  }

  if (sentinel.messageTimer > 0) sentinel.messageTimer--;
}
