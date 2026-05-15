// @ts-nocheck
// ═══════════════════════════════════════════════════════════
// HOLOGRAPHIC WIREFRAME GLOBE
// ═══════════════════════════════════════════════════════════
export function initHoloGlobe() {
    const canvas = document.getElementById('holoGlobeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    let rotation = 0;

    // Veri toplama noktaları (lat/lng)
    const dataNodes = [];
    for (let i = 0; i < 18; i++) {
        dataNodes.push({
            lat: (Math.random() - 0.5) * Math.PI * 0.85,
            lng: Math.random() * Math.PI * 2,
            size: 1.2 + Math.random() * 1.5,
            pulse: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.03,
            color: Math.random() > 0.3 ? 'cyan' : 'green'
        });
    }
function project(lat, lng) {
        const x = Math.cos(lat) * Math.sin(lng + rotation);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lng + rotation);
        return {
            x: cx + x * R,
            y: cy - y * R,
            z: z, // depth
            visible: z > -0.1
        };
    }
function drawGlobe() {
        ctx.clearRect(0, 0, W, H);
        rotation += 0.008;

        // Dış çember (dünya sınırı)
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Atmosfer glow
        const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.1);
        atmo.addColorStop(0, 'rgba(0, 212, 255, 0)');
        atmo.addColorStop(0.7, 'rgba(0, 212, 255, 0.015)');
        atmo.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = atmo;
        ctx.fillRect(0, 0, W, H);

        // Enlem çizgileri (latitude)
        for (let lat = -60; lat <= 60; lat += 30) {
            const latRad = lat * (Math.PI / 180);
            ctx.beginPath();
            for (let lng = 0; lng <= 360; lng += 5) {
                const lngRad = lng * (Math.PI / 180);
                const p = project(latRad, lngRad);
                if (lng === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = `rgba(0, 212, 255, 0.06)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Boylam çizgileri (longitude)
        for (let lng = 0; lng < 360; lng += 30) {
            const lngRad = lng * (Math.PI / 180);
            ctx.beginPath();
            for (let lat = -90; lat <= 90; lat += 5) {
                const latRad = lat * (Math.PI / 180);
                const p = project(latRad, lngRad);
                if (lat === -90) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = `rgba(0, 212, 255, 0.06)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Ekvator çizgisi (daha parlak)
        ctx.beginPath();
        for (let lng = 0; lng <= 360; lng += 3) {
            const p = project(0, lng * Math.PI / 180);
            if (lng === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Veri toplama noktaları
        for (const node of dataNodes) {
            node.pulse += node.speed;
            const p = project(node.lat, node.lng);
            if (!p.visible) continue;

            const depth = (p.z + 1) / 2; // 0-1
            const pulseVal = 0.5 + 0.5 * Math.sin(node.pulse);
            const alpha = depth * (0.3 + pulseVal * 0.7);

            // Glow
            const color = node.color === 'cyan' 
                ? `rgba(0, 212, 255, ${alpha * 0.3})` 
                : `rgba(0, 255, 136, ${alpha * 0.3})`;
            const coreColor = node.color === 'cyan'
                ? `rgba(0, 212, 255, ${alpha * 0.9})`
                : `rgba(0, 255, 136, ${alpha * 0.9})`;

            const glowR = node.size * 4;
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            glow.addColorStop(0, color);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

            // Core dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, node.size * depth, 0, Math.PI * 2);
            ctx.fillStyle = coreColor;
            ctx.fill();
        }

        requestAnimationFrame(drawGlobe);
    }

    drawGlobe();

    // Node sayısını güncelle
    setInterval(() => {
        const el = document.getElementById('globeNodeCount');
        if (el) {
            const count = 120 + Math.floor(Math.random() * 40);
            el.textContent = count + ' NODES';
        }
    }, 4000);
}
export {};
