// @ts-nocheck
import { updateSentinelLogic } from './sentinel.ts';
export function drawSentinel(ctx: CanvasRenderingContext2D, sentinel: any, frame: number, cam: any, w2s: (x: number, y: number) => {x: number, y: number}) {

// ═══════════════════════════════════════════════════════════
// SENTINEL DRONE — Security Patrol System
// ═══════════════════════════════════════════════════════════


  updateSentinelLogic(frame);

  const sp = w2s(sentinel.x, sentinel.y);
  const sz = cam.zoom;
  const pulse = Math.sin(sentinel.pulsePhase);
  const pulse2 = Math.sin(sentinel.pulsePhase * 0.7 + 1);
  const droneR = 16 * sz;  // Much larger base radius

  // ── Trail (glowing energy ribbon) ──
  if (sentinel.trail.length > 1) {
    for (let i = 1; i < sentinel.trail.length; i++) {
      const t0 = sentinel.trail[i-1], t1 = sentinel.trail[i];
      const p0 = w2s(t0.x, t0.y), p1 = w2s(t1.x, t1.y);
      const alpha = (1 - t1.age / 30) * 0.5;
      const width = (1 - t1.age / 30) * 5 * sz;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(0, 255, 200, ${alpha})`;
      ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
    }
    // Trail glow dots
    for (const t of sentinel.trail) {
      const tp = w2s(t.x, t.y);
      const alpha = (1 - t.age / 30) * 0.4;
      const r = (4 - t.age / 30 * 3) * sz;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, Math.max(0.5, r), 0, Math.PI*2);
      const tg = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, r*2);
      tg.addColorStop(0, `rgba(0, 255, 200, ${alpha})`);
      tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg;
      ctx.fillRect(tp.x-r*2, tp.y-r*2, r*4, r*4);
    }
  }

  // ── Scan System (when scanning) ──
  if (sentinel.state === 'scanning' && sentinel.targetNode) {
    const scanProgress = sentinel.scanTimer / sentinel.scanDuration;
    const baseR = sentinel.targetNode.r * sz * 2;

    // Multiple expanding scan rings
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = (scanProgress + ring * 0.15) % 1;
      const ringR = baseR * (0.8 + ringProgress * 2);
      const ringAlpha = 0.35 * (1 - ringProgress);
      ctx.beginPath(); ctx.arc(sp.x, sp.y, ringR, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(0, 255, 200, ${ringAlpha})`;
      ctx.lineWidth = (2 - ringProgress) * sz; ctx.stroke();
    }

    // Rotating sweep beam
    ctx.save();
    ctx.translate(sp.x, sp.y);
    const sweepAngle = frame * 0.04;
    ctx.rotate(sweepAngle);
    const sweepR = baseR * 2.5;
    const sweepGrad = ctx.createLinearGradient(0, 0, sweepR, 0);
    sweepGrad.addColorStop(0, `rgba(0, 255, 200, ${0.3 * (1-scanProgress)})`);
    sweepGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, sweepR, -0.08, 0.08);
    ctx.closePath();
    ctx.fillStyle = sweepGrad; ctx.fill();
    // Second beam (opposite)
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, sweepR * 0.8, -0.06, 0.06);
    ctx.closePath();
    ctx.fillStyle = sweepGrad; ctx.fill();
    ctx.restore();

    // Scan crosshair lines
    const chAlpha = 0.15 * (1 - scanProgress);
    const chR = baseR * 1.8;
    ctx.strokeStyle = `rgba(0, 255, 200, ${chAlpha})`;
    ctx.lineWidth = 0.8 * sz;
    ctx.setLineDash([4*sz, 8*sz]);
    ctx.beginPath(); ctx.moveTo(sp.x - chR, sp.y); ctx.lineTo(sp.x + chR, sp.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sp.x, sp.y - chR); ctx.lineTo(sp.x, sp.y + chR); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Ambient Glow Field ──
  const ambientR = droneR * 5;
  const ambient = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, ambientR);
  ambient.addColorStop(0, `rgba(0, 255, 200, ${0.12 + pulse * 0.04})`);
  ambient.addColorStop(0.4, `rgba(0, 255, 200, 0.03)`);
  ambient.addColorStop(1, 'transparent');
  ctx.fillStyle = ambient;
  ctx.fillRect(sp.x-ambientR, sp.y-ambientR, ambientR*2, ambientR*2);

  // ── Outer Shield Ring (rotating dashed) ──
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(frame * 0.008);
  ctx.beginPath(); ctx.arc(0, 0, droneR * 2.2, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.08 + pulse * 0.04})`;
  ctx.lineWidth = 1 * sz;
  ctx.setLineDash([6*sz, 12*sz]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Energy Ring 1 (fast rotate) ──
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(-frame * 0.02);
  ctx.beginPath(); ctx.arc(0, 0, droneR * 1.6, 0, Math.PI * 1.2);
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.25 + pulse * 0.1})`;
  ctx.lineWidth = 2 * sz; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();

  // ── Energy Ring 2 (counter rotate) ──
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(frame * 0.015 + Math.PI * 0.5);
  ctx.beginPath(); ctx.arc(0, 0, droneR * 1.35, 0, Math.PI * 0.7);
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.2 + pulse2 * 0.08})`;
  ctx.lineWidth = 1.5 * sz; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();

  // ── Hexagon Shield Body ──
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(sentinel.pulsePhase * 0.15);

  // Outer hex
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = Math.cos(a) * droneR, hy = Math.sin(a) * droneR;
    i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  const hexGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, droneR);
  hexGrad.addColorStop(0, `rgba(0, 255, 200, ${0.15 + pulse * 0.08})`);
  hexGrad.addColorStop(0.7, `rgba(0, 200, 180, ${0.08})`);
  hexGrad.addColorStop(1, `rgba(0, 255, 200, 0.02)`);
  ctx.fillStyle = hexGrad; ctx.fill();
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.6 + pulse * 0.2})`;
  ctx.lineWidth = 2 * sz; ctx.stroke();

  // Inner hex (smaller, counter-rotate offset)
  ctx.rotate(-sentinel.pulsePhase * 0.1);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const hx = Math.cos(a) * droneR * 0.55, hy = Math.sin(a) * droneR * 0.55;
    i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 + pulse2 * 0.1})`;
  ctx.lineWidth = 1.2 * sz; ctx.stroke();

  ctx.restore();

  // ── Core Eye (bright center with gradient) ──
  const coreR = 5 * sz;
  const coreGrad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, coreR * 2.5);
  coreGrad.addColorStop(0, `rgba(200, 255, 240, ${0.95})`);
  coreGrad.addColorStop(0.3, `rgba(0, 255, 200, ${0.7 + pulse * 0.2})`);
  coreGrad.addColorStop(0.7, `rgba(0, 255, 200, 0.2)`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(sp.x - coreR*2.5, sp.y - coreR*2.5, coreR*5, coreR*5);

  ctx.beginPath(); ctx.arc(sp.x, sp.y, coreR, 0, Math.PI*2);
  ctx.fillStyle = `rgba(180, 255, 230, ${0.9 + pulse * 0.1})`; ctx.fill();

  // ── Orbiting Data Particles ──
  for (let i = 0; i < 4; i++) {
    const orbSpeed = 0.018 + i * 0.006;
    const orbDist = droneR * (1.1 + i * 0.25);
    const orbAngle = frame * orbSpeed + i * (Math.PI / 2);
    const ox = sp.x + Math.cos(orbAngle) * orbDist;
    const oy = sp.y + Math.sin(orbAngle) * orbDist;
    const orbSz = (2.5 - i * 0.3) * sz;
    ctx.beginPath(); ctx.arc(ox, oy, orbSz, 0, Math.PI*2);
    ctx.fillStyle = `rgba(0, 255, 200, ${0.6 - i * 0.1})`; ctx.fill();
    // Tiny glow
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbSz * 3);
    og.addColorStop(0, `rgba(0, 255, 200, 0.2)`); og.addColorStop(1, 'transparent');
    ctx.fillStyle = og;
    ctx.fillRect(ox - orbSz*3, oy - orbSz*3, orbSz*6, orbSz*6);
  }

  // ── Speech Bubble (larger, glassmorphic) ──
  if (sentinel.messageTimer > 0 && sentinel.message) {
    const bubbleAlpha = Math.min(1, sentinel.messageTimer / 25);
    const bubbleX = sp.x + 28 * sz;
    const bubbleY = sp.y - 30 * sz;

    ctx.font = `600 ${12 * sz}px 'JetBrains Mono'`;
    const textW = ctx.measureText(sentinel.message).width;
    const padX = 12 * sz, padY = 8 * sz;

    const bx = bubbleX - 6*sz, by = bubbleY - 12*sz;
    const bw = textW + padX*2, bh = 22*sz + padY;

    // Glass bg
    ctx.fillStyle = `rgba(0, 25, 20, ${0.9 * bubbleAlpha})`;
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.45 * bubbleAlpha})`;
    ctx.lineWidth = 1.5 * sz;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6*sz);
    ctx.fill(); ctx.stroke();

    // Top highlight line
    ctx.beginPath();
    ctx.moveTo(bx + 6*sz, by);
    ctx.lineTo(bx + bw - 6*sz, by);
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.15 * bubbleAlpha})`;
    ctx.lineWidth = 1; ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(bx, by + bh*0.25);
    ctx.lineTo(bx - 8*sz, by + bh*0.45);
    ctx.lineTo(bx, by + bh*0.65);
    ctx.fillStyle = `rgba(0, 25, 20, ${0.9 * bubbleAlpha})`; ctx.fill();
    ctx.strokeStyle = `rgba(0, 255, 200, ${0.45 * bubbleAlpha})`;
    ctx.lineWidth = 1.5 * sz;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh*0.25);
    ctx.lineTo(bx - 8*sz, by + bh*0.45);
    ctx.lineTo(bx, by + bh*0.65);
    ctx.stroke();

    // Status icon
    const iconX = bubbleX;
    const iconY = bubbleY + 1*sz;
    ctx.font = `600 ${12 * sz}px 'JetBrains Mono'`;
    ctx.fillStyle = `rgba(0, 255, 200, ${0.95 * bubbleAlpha})`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(sentinel.message, iconX, iconY);

    // Blinking dot
    const dotX = iconX + textW + 10*sz;
    const dotAlpha = 0.4 + Math.sin(frame * 0.12) * 0.4;
    ctx.beginPath(); ctx.arc(dotX, iconY, 3.5*sz, 0, Math.PI*2);
    ctx.fillStyle = sentinel.state === 'scanning'
      ? `rgba(0, 255, 200, ${dotAlpha * bubbleAlpha})`
      : `rgba(100, 255, 180, ${0.5 * bubbleAlpha})`;
    ctx.fill();
  }

  // ── "NÖBETÇİ" nameplate ──
  ctx.font = `${9 * sz}px 'Orbitron'`;
  ctx.fillStyle = `rgba(0, 255, 200, 0.35)`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('NÖBETÇİ', sp.x, sp.y + droneR * 1.8);

  // State subtitle
}
