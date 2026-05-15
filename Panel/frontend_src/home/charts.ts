// @ts-nocheck
// ─── PERFORMANCE CHARTS ───
const chartData = { gpu: [], cpu: [], mem: [], flow: [] };
const MAX_PTS = 30;
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function initData() {
    for (let i = 0; i < MAX_PTS; i++) {
        chartData.gpu.push(rng(78, 95));
        chartData.cpu.push(rng(50, 78));
        chartData.mem.push(rng(60, 82));
        chartData.flow.push(rng(25, 85));
    }
}
function drawLine(id, data, color, alpha) {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(0,212,255,0.05)'; ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = 0; x < w; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }

    if (data.length < 2) return;
    const step = w / (data.length - 1);

    // Fill
    ctx.beginPath(); ctx.moveTo(0, h);
    data.forEach((v, i) => { ctx.lineTo(i * step, h - (v / 100) * h); });
    ctx.lineTo(w, h); ctx.closePath();
    ctx.fillStyle = `rgba(0,212,255,${alpha || 0.08})`; ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => { const x = i * step, y = h - (v / 100) * h; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.strokeStyle = color || '#00d4ff'; ctx.lineWidth = 1.5;
    ctx.shadowColor = color || '#00d4ff'; ctx.shadowBlur = 5;
    ctx.stroke(); ctx.shadowBlur = 0;
}
function drawBars(id, data, color) {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,212,255,0.05)'; ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const n = Math.min(data.length, 20);
    const bw = Math.floor(w / n) - 2;
    const recent = data.slice(-n);
    recent.forEach((v, i) => {
        const x = i * (bw + 2), bh = (v / 100) * h;
        ctx.fillStyle = color || '#00d4ff';
        ctx.shadowColor = color || '#00d4ff'; ctx.shadowBlur = 3;
        ctx.fillRect(x, h - bh, bw, bh);
    });
    ctx.shadowBlur = 0;
}
export function updateCharts() {
    chartData.gpu.push(rng(78, 95)); chartData.cpu.push(rng(50, 78));
    chartData.mem.push(rng(60, 82)); chartData.flow.push(rng(25, 85));
    if (chartData.gpu.length > MAX_PTS) chartData.gpu.shift();
    if (chartData.cpu.length > MAX_PTS) chartData.cpu.shift();
    if (chartData.mem.length > MAX_PTS) chartData.mem.shift();
    if (chartData.flow.length > MAX_PTS) chartData.flow.shift();

    drawLine('gpuChart', chartData.gpu, '#00d4ff', 0.1);
    drawBars('cpuChart', chartData.cpu, '#00d4ff');
    drawBars('memChart', chartData.mem, '#0af5c2');
    drawLine('flowChart', chartData.flow, '#00d4ff', 0.06);

    const g = chartData.gpu, cp = chartData.cpu, m = chartData.mem;
    document.getElementById('gpuVal').textContent = g[g.length - 1] + '%';
    document.getElementById('cpuVal').textContent = cp[cp.length - 1] + '%';
    document.getElementById('memVal').textContent = m[m.length - 1] + '%';
    document.getElementById('latVal').textContent = rng(8, 18) + 'ms';
    document.getElementById('dfVal').textContent = (Math.random() * 1.5 + 0.5).toFixed(1) + ' TB/s';

    // Update lat bar
    const latBar = document.getElementById('latBar');
    if (latBar) latBar.style.width = rng(15, 35) + '%';
}
export {};
