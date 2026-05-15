// @ts-nocheck
// ─── ELECTRIC EFFECTS (Inside Hex Frame) ───
export function initElectricEffects() {
    const canvas = document.getElementById('electricCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
function resize() {
        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const cx = () => canvas.width / 2;
    const cy = () => canvas.height / 2;

    // Hex vertices (matching SVG viewBox 500x500 scaled to canvas)
function hexVerts() {
        const w = canvas.width, h = canvas.height;
        const sx = w / 500, sy = h / 500;
        return [
            { x: 250 * sx, y: 15 * sy },
            { x: 465 * sx, y: 140 * sy },
            { x: 465 * sx, y: 360 * sy },
            { x: 250 * sx, y: 485 * sy },
            { x: 35 * sx, y: 360 * sy },
            { x: 35 * sx, y: 140 * sy },
        ];
    }

    // ── Electric Arc (lightning bolt between two points) ──
function drawArc(x1, y1, x2, y2, segments, jitter, alpha) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const dx = (x2 - x1) / segments;
        const dy = (y2 - y1) / segments;
        for (let i = 1; i < segments; i++) {
            const jx = (Math.random() - 0.5) * jitter;
            const jy = (Math.random() - 0.5) * jitter;
            ctx.lineTo(x1 + dx * i + jx, y1 + dy * i + jy);
        }
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 68, 68, ${alpha})`;
        ctx.lineWidth = 1 + Math.random();
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ── Energy Particles ──
    const particles = [];
    const MAX_PARTICLES = 35;
function spawnParticle() {
        const verts = hexVerts();
        const edge = Math.floor(Math.random() * 6);
        const next = (edge + 1) % 6;
        const t = Math.random();
        particles.push({
            x: verts[edge].x + (verts[next].x - verts[edge].x) * t,
            y: verts[edge].y + (verts[next].y - verts[edge].y) * t,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            life: 1.0,
            decay: 0.005 + Math.random() * 0.012,
            size: 1 + Math.random() * 2.5,
        });
    }

    // ── Pulse Rings ──
    const rings = [];
function spawnRing() {
        rings.push({
            r: 10,
            maxR: 80 + Math.random() * 100,
            alpha: 0.35,
            speed: 0.6 + Math.random() * 0.8,
        });
    }

    // ── Traveling Energy (along hex edges) ──
    const travelers = [];
function spawnTraveler() {
        const verts = hexVerts();
        const edge = Math.floor(Math.random() * 6);
        const next = (edge + 1) % 6;
        travelers.push({
            from: verts[edge],
            to: verts[next],
            t: 0,
            speed: 0.008 + Math.random() * 0.012,
            size: 2 + Math.random() * 3,
        });
    }

    // ── Neural Impulse Streaks (shoot THROUGH the brain) ──
    const impulses = [];
function spawnImpulse() {
        const centerX = cx(), centerY = cy();
        const angle = Math.random() * Math.PI * 2;
        const dist = 160 + Math.random() * 80;
        // Start from outside, shoot through center to other side
        const startX = centerX + Math.cos(angle) * dist;
        const startY = centerY + Math.sin(angle) * dist;
        const endX = centerX - Math.cos(angle) * dist;
        const endY = centerY - Math.sin(angle) * dist;

        impulses.push({
            x: startX, y: startY,
            endX, endY,
            t: 0,
            speed: 0.012 + Math.random() * 0.018,
            trailLen: 12 + Math.floor(Math.random() * 10),
            trail: [],
            size: 1.5 + Math.random() * 2,
            brightness: 0.6 + Math.random() * 0.4,
        });
    }

    // ── Synapse Flashes (bright flashes at brain center) ──
    const flashes = [];
function spawnFlash(x, y) {
        flashes.push({
            x, y,
            r: 2,
            maxR: 15 + Math.random() * 20,
            alpha: 0.8,
            speed: 1.5 + Math.random() * 2,
        });
    }

    // ── Main Loop ──
    let frame = 0;
function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;

        const verts = hexVerts();
        const centerX = cx(), centerY = cy();

        // 1. Random electric arcs (from edge to center or between nodes)
        if (frame % 4 === 0 && Math.random() > 0.4) {
            const v = verts[Math.floor(Math.random() * 6)];
            const target = Math.random() > 0.5
                ? { x: centerX + (Math.random() - 0.5) * 60, y: centerY + (Math.random() - 0.5) * 60 }
                : verts[Math.floor(Math.random() * 6)];
            drawArc(v.x, v.y, target.x, target.y, 8 + Math.floor(Math.random() * 6), 15 + Math.random() * 20, 0.15 + Math.random() * 0.2);
        }

        // 2. Secondary thin arcs
        if (frame % 2 === 0 && Math.random() > 0.6) {
            const a = Math.random() * Math.PI * 2;
            const r1 = 40 + Math.random() * 80;
            const r2 = r1 + 30 + Math.random() * 60;
            drawArc(
                centerX + Math.cos(a) * r1, centerY + Math.sin(a) * r1,
                centerX + Math.cos(a + 0.3) * r2, centerY + Math.sin(a + 0.3) * r2,
                5, 10, 0.08 + Math.random() * 0.1
            );
        }

        // 3. Particles
        if (particles.length < MAX_PARTICLES && frame % 3 === 0) spawnParticle();
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vx += (centerX - p.x) * 0.0003;
            p.vy += (centerY - p.y) * 0.0003;
            p.life -= p.decay;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 68, 68, ${p.life * 0.5})`;
            ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 6;
            ctx.fill(); ctx.shadowBlur = 0;
        }

        // 4. Pulse rings from center
        if (frame % 90 === 0) spawnRing();
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            ring.r += ring.speed; ring.alpha -= 0.002;
            if (ring.alpha <= 0 || ring.r >= ring.maxR) { rings.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 68, 68, ${ring.alpha})`;
            ctx.lineWidth = 1; ctx.stroke();
        }

        // 5. Traveling energy dots along hex edges
        if (frame % 60 === 0) spawnTraveler();
        for (let i = travelers.length - 1; i >= 0; i--) {
            const tr = travelers[i];
            tr.t += tr.speed;
            if (tr.t >= 1) { travelers.splice(i, 1); continue; }

            const x = tr.from.x + (tr.to.x - tr.from.x) * tr.t;
            const y = tr.from.y + (tr.to.y - tr.from.y) * tr.t;
            const alpha = Math.sin(tr.t * Math.PI);

            // Glow trail
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, tr.size * 4);
            gradient.addColorStop(0, `rgba(255, 68, 68, ${alpha * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - tr.size * 4, y - tr.size * 4, tr.size * 8, tr.size * 8);

            // Core dot
            ctx.beginPath();
            ctx.arc(x, y, tr.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 180, 180, ${alpha * 0.9})`;
            ctx.fill();
        }

        // 6. Neural Impulse Streaks (through the brain)
        if (frame % 25 === 0) spawnImpulse();
        for (let i = impulses.length - 1; i >= 0; i--) {
            const imp = impulses[i];
            imp.t += imp.speed;

            const startX = imp.x, startY = imp.y;
            const curX = startX + (imp.endX - startX) * imp.t;
            const curY = startY + (imp.endY - startY) * imp.t;

            // Store trail
            imp.trail.push({ x: curX, y: curY });
            if (imp.trail.length > imp.trailLen) imp.trail.shift();

            if (imp.t >= 1) {
                // Flash at brain center when impulse passes through
                spawnFlash(cx(), cy());
                impulses.splice(i, 1);
                continue;
            }

            // Draw glowing trail
            if (imp.trail.length > 1) {
                for (let j = 1; j < imp.trail.length; j++) {
                    const prev = imp.trail[j - 1];
                    const curr = imp.trail[j];
                    const trailAlpha = (j / imp.trail.length) * imp.brightness * 0.6;
                    const trailWidth = (j / imp.trail.length) * imp.size;

                    ctx.beginPath();
                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(curr.x, curr.y);
                    ctx.strokeStyle = `rgba(255, 120, 120, ${trailAlpha})`;
                    ctx.lineWidth = trailWidth;
                    ctx.shadowColor = '#ff4444';
                    ctx.shadowBlur = 4;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Bright head
            ctx.beginPath();
            ctx.arc(curX, curY, imp.size * 1.5, 0, Math.PI * 2);
            const headGrad = ctx.createRadialGradient(curX, curY, 0, curX, curY, imp.size * 4);
            headGrad.addColorStop(0, `rgba(255, 200, 200, ${imp.brightness})`);
            headGrad.addColorStop(0.4, `rgba(255, 68, 68, ${imp.brightness * 0.5})`);
            headGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
            ctx.fillStyle = headGrad;
            ctx.fill();

            // Core white dot
            ctx.beginPath();
            ctx.arc(curX, curY, imp.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${imp.brightness * 0.9})`;
            ctx.fill();
        }

        // 7. Synapse Flashes
        for (let i = flashes.length - 1; i >= 0; i--) {
            const f = flashes[i];
            f.r += f.speed;
            f.alpha -= 0.04;
            if (f.alpha <= 0) { flashes.splice(i, 1); continue; }

            const fGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
            fGrad.addColorStop(0, `rgba(255, 200, 200, ${f.alpha})`);
            fGrad.addColorStop(0.5, `rgba(255, 68, 68, ${f.alpha * 0.4})`);
            fGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    animate();
}
export {};
