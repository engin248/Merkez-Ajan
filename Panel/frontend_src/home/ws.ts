// @ts-nocheck
// ─── WEBSOCKET ───
export function connectWS() {
    try {
        const ws = new WebSocket('ws://localhost:8086');
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.topic === 'PM2_TELEMETRY') {
                    const feed = document.getElementById('verticalLogs');
                    if (!feed) return;
                    
                    const ts = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    d.payload.forEach(proc => {
                        const entry = document.createElement('div');
                        entry.className = 'vlog-entry';
                        const color = proc.status === 'online' ? '#0af5c2' : '#ff4444';
                        entry.innerHTML = `<span class="ts">[${ts}]</span> <span style="color:${color}">${proc.name}</span>: ${proc.status.toUpperCase()} <span style="opacity:0.6; font-size:9px;">(CPU:${proc.cpu}% RAM:${proc.mem}MB)</span>`;
                        feed.appendChild(entry);
                    });

                    while (feed.children.length > 50) feed.firstElementChild.remove();
                    requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
                }
            } catch (err) { /* ignore */ }
        };
        ws.onclose = () => setTimeout(connectWS, 5000);
    } catch (e) { setTimeout(connectWS, 5000); }
}

// ─── PM2 STATUS ───
export async function fetchPM2() {
    try {
        const r = await fetch('/api/pm2-status');
        const d = await r.json();
        if (Array.isArray(d)) {
            const cells = document.querySelectorAll('.armor-circle');
            cells.forEach((c, i) => {
                if (d[i]) {
                    c.title = `${d[i].name} — ${d[i].status}`;
                    if (d[i].status !== 'online') {
                        c.classList.add('inactive');
                        c.parentElement.querySelector('.armor-label').textContent = 'OFFLINE';
                    }
                }
            });
        }
    } catch (e) { /* silent */ }
}
export {};
