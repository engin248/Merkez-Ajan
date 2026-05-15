export function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function colorToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function drawMeshCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number, frame: number, zoom: number) {
  const pts = [];
  const count = 12;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + frame * 0.003 + Math.sin(frame * 0.01 + i) * 0.3;
    const d = r * (0.3 + 0.7 * ((Math.sin(frame * 0.008 + i * 1.3) + 1) / 2));
    pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
  }
  ctx.strokeStyle = color.replace(')', `,${alpha * 0.9})`).replace('rgb', 'rgba');
  ctx.lineWidth = 1.2 * zoom;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      if (dx * dx + dy * dy < (r * 1.4) * (r * 1.4)) {
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
  }
  for (const p of pts) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  }
}

export function drawParticleCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number, frame: number, zoom: number) {
  const count = 16;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + frame * 0.005;
    const d = r * (0.2 + 0.5 * ((Math.sin(frame * 0.012 + i * 2.1) + 1) / 2));
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
    const s = (2 + Math.sin(frame * 0.02 + i)) * 2.5 * zoom;
    ctx.beginPath(); ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
    ctx.fill();
  }
}

export function drawRingsCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number, frame: number, zoom: number) {
  for (let i = 1; i <= 3; i++) {
    const rr = r * (0.3 + i * 0.25) + Math.sin(frame * 0.01 + i) * 3 * zoom;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace(')', `,${alpha * (0.6 / i)})`).replace('rgb', 'rgba');
    ctx.lineWidth = 1.8 * zoom; ctx.stroke();
  }
}

export function drawOrbitingElements(ctx: CanvasRenderingContext2D, px: number, py: number, sr: number, color: string, nodeId: string, frame: number, zoom: number) {
  const seed = nodeId.charCodeAt(0) * 7;
  const orbitR = sr * 1.8;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(frame * 0.008 + seed);
  ctx.beginPath();
  ctx.arc(0, 0, orbitR, 0, Math.PI * 1.2);
  ctx.strokeStyle = colorToRgba(color, 0.5);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4 * zoom, 6 * zoom]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.rotate(Math.PI + frame * 0.003);
  ctx.beginPath();
  ctx.arc(0, 0, orbitR * 0.85, 0, Math.PI * 0.8);
  ctx.strokeStyle = colorToRgba(color, 0.35);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const speed = 0.012 + i * 0.005;
    const dist = orbitR * (0.8 + i * 0.15);
    const angle = frame * speed + seed + i * (Math.PI * 2 / 3);
    const ox = px + Math.cos(angle) * dist;
    const oy = py + Math.sin(angle) * dist;
    const dotSize = (2.5 - i * 0.5) * zoom;
    const dg = ctx.createRadialGradient(ox, oy, 0, ox, oy, dotSize * 3);
    dg.addColorStop(0, colorToRgba(color, 0.8));
    dg.addColorStop(1, 'transparent');
    ctx.fillStyle = dg;
    ctx.fillRect(ox - dotSize * 3, oy - dotSize * 3, dotSize * 6, dotSize * 6);
    ctx.beginPath(); ctx.arc(ox, oy, dotSize, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function drawCoreNode(ctx: CanvasRenderingContext2D, px: number, py: number, sr: number, isHover: boolean, frame: number, zoom: number) {
  const t = frame;
  const pulse = 0.7 + 0.3 * Math.sin(t * 0.02);
  const color = '#b800ff';

  const fieldR = sr * 5;
  const fieldGrad = ctx.createRadialGradient(px, py, sr * 0.5, px, py, fieldR);
  fieldGrad.addColorStop(0, colorToRgba(color, 0.12 * pulse));
  fieldGrad.addColorStop(0.2, colorToRgba('#6000cc', 0.06 * pulse));
  fieldGrad.addColorStop(0.5, colorToRgba('#00d4ff', 0.02 * pulse));
  fieldGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = fieldGrad;
  ctx.fillRect(px - fieldR, py - fieldR, fieldR * 2, fieldR * 2);

  for (let ring = 0; ring < 3; ring++) {
    const rr = sr * (1.6 + ring * 0.5);
    const speed = (ring % 2 === 0 ? 1 : -1) * (0.004 + ring * 0.002);
    const arcLen = Math.PI * (0.4 + ring * 0.15);
    ctx.save(); ctx.translate(px, py); ctx.rotate(t * speed + ring * 2.1);
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, arcLen);
    ctx.strokeStyle = colorToRgba(color, 0.35 - ring * 0.08);
    ctx.lineWidth = (2.5 - ring * 0.5) * zoom;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rr, Math.PI, Math.PI + arcLen * 0.7);
    ctx.strokeStyle = colorToRgba('#00d4ff', 0.2 - ring * 0.05);
    ctx.lineWidth = (1.5 - ring * 0.3) * zoom;
    ctx.stroke();
    ctx.restore();
  }

  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const orbitR = sr * (1.2 + (i % 3) * 0.4);
    const speed = 0.008 + (i % 5) * 0.003;
    const angle = (i / particleCount) * Math.PI * 2 + t * speed * (i % 2 === 0 ? 1 : -1);
    const wobble = Math.sin(t * 0.015 + i * 1.7) * sr * 0.15;
    const ppx = px + Math.cos(angle) * (orbitR + wobble);
    const ppy = py + Math.sin(angle) * (orbitR + wobble);
    const pSize = (1.5 + Math.sin(t * 0.03 + i) * 1) * zoom;
    const pColor = i % 3 === 0 ? '#00d4ff' : (i % 3 === 1 ? '#b800ff' : '#ff00ff');
    ctx.beginPath(); ctx.arc(ppx, ppy, pSize, 0, Math.PI * 2);
    ctx.fillStyle = colorToRgba(pColor, 0.4 + Math.sin(t * 0.02 + i) * 0.2);
    ctx.fill();
  }

  ctx.save(); ctx.translate(px, py); ctx.rotate(t * 0.003);
  hexPath(ctx, 0, 0, sr * 1.6);
  ctx.strokeStyle = colorToRgba(color, 0.15 * pulse);
  ctx.lineWidth = 1 * zoom; ctx.stroke();
  ctx.restore();

  ctx.save(); ctx.translate(px, py); ctx.rotate(-t * 0.005);
  hexPath(ctx, 0, 0, sr * 1.2);
  ctx.strokeStyle = colorToRgba(color, 0.3 * pulse);
  ctx.lineWidth = 1.5 * zoom; ctx.stroke();
  ctx.restore();

  hexPath(ctx, px, py, sr);
  const bodyGrad = ctx.createRadialGradient(px, py, 0, px, py, sr);
  bodyGrad.addColorStop(0, colorToRgba(color, 0.25));
  bodyGrad.addColorStop(0.6, colorToRgba(color, 0.12));
  bodyGrad.addColorStop(1, colorToRgba(color, 0.05));
  ctx.fillStyle = bodyGrad; ctx.fill();
  hexPath(ctx, px, py, sr);
  ctx.strokeStyle = colorToRgba(color, isHover ? 1 : 0.7 * pulse);
  ctx.lineWidth = (isHover ? 3 : 2.5) * zoom; ctx.stroke();

  hexPath(ctx, px, py, sr * 0.55);
  ctx.strokeStyle = colorToRgba(color, 0.5 * pulse);
  ctx.lineWidth = 1.2 * zoom; ctx.stroke();

  const eyeR = sr * 0.2;
  const eyeGrad = ctx.createRadialGradient(px, py, 0, px, py, eyeR * 3);
  eyeGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  eyeGrad.addColorStop(0.15, colorToRgba(color, 0.9));
  eyeGrad.addColorStop(0.4, colorToRgba('#00d4ff', 0.4));
  eyeGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = eyeGrad;
  ctx.beginPath(); ctx.arc(px, py, eyeR * 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px, py, eyeR * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`; ctx.fill();

  ctx.strokeStyle = colorToRgba(color, 0.15);
  ctx.lineWidth = 0.8 * zoom;
  const chLen = sr * 1.8;
  for (let a = 0; a < 6; a++) {
    const angle = a * Math.PI / 3 + t * 0.001;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(angle) * sr * 0.6, py + Math.sin(angle) * sr * 0.6);
    ctx.lineTo(px + Math.cos(angle) * chLen, py + Math.sin(angle) * chLen);
    ctx.stroke();
  }

  for (let w = 0; w < 2; w++) {
    const wavePhase = (t * 0.02 + w * Math.PI) % (Math.PI * 2);
    const waveR = sr * (1 + (wavePhase / (Math.PI * 2)) * 1.5);
    const waveAlpha = Math.max(0, 0.25 * (1 - wavePhase / (Math.PI * 2)));
    ctx.beginPath(); ctx.arc(px, py, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = colorToRgba(color, waveAlpha);
    ctx.lineWidth = 1.5 * zoom; ctx.stroke();
  }
}
