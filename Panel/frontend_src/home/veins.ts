// @ts-nocheck
// ─── BRAIN VEIN / BLOOD FLOW ANIMATION ───
export function initBrainVeins() {
    const canvas = document.getElementById('brainVeinCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
function resize() {
        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        generateVeins();
    }

    const cx = () => canvas.width / 2;
    const cy = () => canvas.height / 2;

    // ── Vein Network Generation ──
    let veins = [];
    let bloodParticles = [];
    const MAX_BLOOD = 120;
function generateVeins() {
        veins = [];
        const centerX = cx();
        const centerY = cy();
        const brainRadius = Math.min(canvas.width, canvas.height) * 0.38;

        // Main arteries radiating from center
        const mainCount = 8;
        for (let i = 0; i < mainCount; i++) {
            const angle = (i / mainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const len = brainRadius * (0.6 + Math.random() * 0.35);
            const points = generateVeinPath(centerX, centerY, angle, len, 6 + Math.floor(Math.random() * 4), 12);
            veins.push({ points, width: 2.5 + Math.random() * 1.0, type: 'main', alpha: 0.45 + Math.random() * 0.2 });

            // Branch veins from each main artery
            const branchCount = 2 + Math.floor(Math.random() * 3);
            for (let b = 0; b < branchCount; b++) {
                const branchT = 0.3 + Math.random() * 0.5;
                const branchIdx = Math.floor(branchT * (points.length - 1));
                const branchPt = points[branchIdx];
                const branchAngle = angle + (Math.random() - 0.5) * 1.5;
                const branchLen = len * (0.25 + Math.random() * 0.3);
                const branchPts = generateVeinPath(branchPt.x, branchPt.y, branchAngle, branchLen, 4 + Math.floor(Math.random() * 3), 8);
                veins.push({ points: branchPts, width: 1.2 + Math.random() * 0.8, type: 'branch', alpha: 0.3 + Math.random() * 0.15 });

                // Capillaries from branches
                if (Math.random() > 0.4) {
                    const capT = 0.4 + Math.random() * 0.4;
                    const capIdx = Math.floor(capT * (branchPts.length - 1));
                    const capPt = branchPts[capIdx];
                    const capAngle = branchAngle + (Math.random() - 0.5) * 2;
                    const capLen = branchLen * (0.3 + Math.random() * 0.3);
                    const capPts = generateVeinPath(capPt.x, capPt.y, capAngle, capLen, 3, 5);
                    veins.push({ points: capPts, width: 0.5 + Math.random() * 0.5, type: 'capillary', alpha: 0.15 + Math.random() * 0.1 });
                }
            }
        }
    }
function generateVeinPath(startX, startY, angle, length, segments, jitter) {
        const points = [{ x: startX, y: startY }];
        const segLen = length / segments;
        let curAngle = angle;
        let px = startX, py = startY;

        for (let s = 0; s < segments; s++) {
            curAngle += (Math.random() - 0.5) * 0.6;
            px += Math.cos(curAngle) * segLen + (Math.random() - 0.5) * jitter;
            py += Math.sin(curAngle) * segLen + (Math.random() - 0.5) * jitter;
            points.push({ x: px, y: py });
        }
        return points;
    }

    // ── Blood Particle (flows along a vein) ──
function spawnBlood() {
        if (veins.length === 0) return;
        const vein = veins[Math.floor(Math.random() * veins.length)];
        bloodParticles.push({
            vein,
            t: 0,
            speed: 0.004 + Math.random() * 0.008,
            size: vein.type === 'main' ? (1.2 + Math.random() * 1.2) : (0.5 + Math.random() * 0.8),
            brightness: 0.5 + Math.random() * 0.5,
            reverse: Math.random() > 0.5
        });
    }
function getVeinPoint(vein, t) {
        const pts = vein.points;
        const totalSeg = pts.length - 1;
        const rawIdx = t * totalSeg;
        const idx = Math.floor(rawIdx);
        const frac = rawIdx - idx;
        if (idx >= totalSeg) return pts[totalSeg];
        return {
            x: pts[idx].x + (pts[idx + 1].x - pts[idx].x) * frac,
            y: pts[idx].y + (pts[idx + 1].y - pts[idx].y) * frac
        };
    }

    // ── Vein Pulse State ──
    let veinPulsePhase = 0;

    // ── Main Render Loop ──
    let frame = 0;
function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;
        veinPulsePhase += 0.02;

        const centerX = cx();
        const centerY = cy();
        const brainRadius = Math.min(canvas.width, canvas.height) * 0.38;

        // Draw Veins (with pulsing alpha)
        for (const vein of veins) {
            if (vein.points.length < 2) continue;
            const pulseAlpha = vein.alpha * (0.7 + 0.3 * Math.sin(veinPulsePhase + vein.points[0].x * 0.01));

            ctx.beginPath();
            ctx.moveTo(vein.points[0].x, vein.points[0].y);
            for (let i = 1; i < vein.points.length; i++) {
                const prev = vein.points[i - 1];
                const curr = vein.points[i];
                const cpx = (prev.x + curr.x) / 2;
                const cpy = (prev.y + curr.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
            }
            const last = vein.points[vein.points.length - 1];
            ctx.lineTo(last.x, last.y);

            ctx.strokeStyle = `rgba(220, 30, 30, ${pulseAlpha})`;
            ctx.lineWidth = vein.width;
            ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
            ctx.shadowBlur = vein.type === 'main' ? 10 : 5;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Spawn blood particles
        if (bloodParticles.length < MAX_BLOOD && frame % 2 === 0) {
            spawnBlood();
        }

        // Update & draw blood particles
        for (let i = bloodParticles.length - 1; i >= 0; i--) {
            const bp = bloodParticles[i];
            bp.t += bp.speed;
            if (bp.t > 1) { bloodParticles.splice(i, 1); continue; }

            const actualT = bp.reverse ? 1 - bp.t : bp.t;
            const pos = getVeinPoint(bp.vein, actualT);

            // Distance from brain center for masking
            const dist = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
            if (dist > brainRadius * 1.2) continue;

            const fadeEdge = Math.max(0, 1 - dist / (brainRadius * 1.2));
            const fadeProgress = Math.sin(bp.t * Math.PI); // Fade in/out

            // Glow
            const glowR = bp.size * 6;
            const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
            glow.addColorStop(0, `rgba(255, 70, 70, ${fadeProgress * fadeEdge * bp.brightness * 0.6})`);
            glow.addColorStop(1, 'rgba(255, 40, 40, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);

            // Core blood cell
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, bp.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 90, 90, ${fadeProgress * fadeEdge * bp.brightness * 0.9})`;
            ctx.fill();

            // Bright center
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, bp.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 220, ${fadeProgress * fadeEdge * bp.brightness * 0.7})`;
            ctx.fill();
        }

        // Occasional vein "surge" — bright pulse traveling along a main vein
        if (frame % 80 === 0 && veins.length > 0) {
            const mainVeins = veins.filter(v => v.type === 'main');
            if (mainVeins.length > 0) {
                const surgeVein = mainVeins[Math.floor(Math.random() * mainVeins.length)];
                for (let s = 0; s < 8; s++) {
                    bloodParticles.push({
                        vein: surgeVein,
                        t: s * 0.03,
                        speed: 0.012 + Math.random() * 0.005,
                        size: 1.5 + Math.random() * 1,
                        brightness: 0.8 + Math.random() * 0.2,
                        reverse: false
                    });
                }
            }
        }

        requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', resize);
    animate();
}
export {};
