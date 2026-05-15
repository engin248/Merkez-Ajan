import { NODES } from './data.ts';

export const agentMemory: any = {};

export function initTrainingMemory() {
  NODES.filter((n: any) => n.type !== 'dot' && n.type !== 'depot' && n.id !== 'core').forEach((n: any) => {
    agentMemory[n.id] = {
      level: 5 + Math.random() * 25,
      maxCapacity: 100,
      learnRate: 0.3 + Math.random() * 0.5,
      items: Math.floor(Math.random() * 40),
      maxItems: 200 + Math.floor(Math.random() * 300),
      label: n.label,
      color: n.color,
      lastLearn: Date.now(),
    };
  });
}

export function trainingTick() {
  for (const [id, mem] of Object.entries<any>(agentMemory)) {
    const node = NODES.find((n: any) => n.id === id);
    if (!node) continue;

    const isActive = node.status === 'active';
    const isLoaded = node.status === 'loaded';
    const rate = isActive ? mem.learnRate * 3 : isLoaded ? mem.learnRate * 1.2 : mem.learnRate * 0.3;

    const remaining = mem.maxCapacity - mem.level;
    mem.level += remaining * rate * 0.008;
    mem.level = Math.min(mem.maxCapacity, mem.level);

    if (isActive && Math.random() < 0.3) {
      mem.items = Math.min(mem.maxItems, mem.items + 1);
    } else if (isLoaded && Math.random() < 0.1) {
      mem.items = Math.min(mem.maxItems, mem.items + 1);
    }
  }
}

export function boostMemoryForAgent(agentName: string) {
  const entry = Object.entries<any>(agentMemory).find(([,m]) => m.label === agentName);
  if (entry) {
    const [, mem] = entry;
    mem.level = Math.min(mem.maxCapacity, mem.level + 0.5);
    mem.items = Math.min(mem.maxItems, mem.items + 1);
    mem.lastLearn = Date.now();
  }
}

export function startTraining() {
  initTrainingMemory();
  setInterval(trainingTick, 3000);
}
