// @ts-nocheck
import { ICONS, NODE_DEFS, CANVAS_ICONS } from './data.ts';
import { state, saveTrainingState } from './state.ts';
import { getIconImg, canvas, ctx, cW, cH, hitConn, hitConnPoint, hitNode, hoveredConn, showConnDelBtn, removeConnDelBtn, openNodeModal, refreshSidebar } from './ui.ts';
// ═══ DRAWING ═══
function hexA(h,a){return`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`;}

function drawGrid() {
    const s = 40*state.zoom, ox = (state.panX*state.zoom+cW/2)%s, oy = (state.panY*state.zoom+cH/2)%s;
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
    for (let x=ox;x<cW;x+=s){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cH);ctx.stroke();}
    for (let y=oy;y<cH;y+=s){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cW,y);ctx.stroke();}
}

function drawNode(n) {
    const x=(n.x+state.panX)*state.zoom+cW/2, y=(n.y+state.panY)*state.zoom+cH/2;
    const col=n._color||'#888', isAg=n.type==='agent';
    const t = state.frame * 0.02;
    const pulse = 0.5 + 0.5 * Math.sin(t + n.x * 0.1);

    if (isAg) {
        // ═══ N8N-STYLE CARD ═══
        const cw = 140 * state.zoom, ch = 52 * state.zoom, cr = 8 * state.zoom;
        const cx = x - cw/2, cy = y - ch/2;
        n._sx = x; n._sy = y; n._sr = Math.max(cw,ch)/2;

        // Card shadow glow
        ctx.shadowColor = col;
        ctx.shadowBlur = 12 * state.zoom + pulse * 8 * state.zoom;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 2 * state.zoom;

        // Card body
        ctx.beginPath();
        ctx.moveTo(cx+cr,cy); ctx.lineTo(cx+cw-cr,cy);
        ctx.quadraticCurveTo(cx+cw,cy,cx+cw,cy+cr);
        ctx.lineTo(cx+cw,cy+ch-cr);
        ctx.quadraticCurveTo(cx+cw,cy+ch,cx+cw-cr,cy+ch);
        ctx.lineTo(cx+cr,cy+ch);
        ctx.quadraticCurveTo(cx,cy+ch,cx,cy+ch-cr);
        ctx.lineTo(cx,cy+cr);
        ctx.quadraticCurveTo(cx,cy,cx+cr,cy);
        ctx.closePath();
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = hexA(col, 0.3 + pulse * 0.2);
        ctx.lineWidth = 1.5 * state.zoom;
        ctx.stroke();

        // Left color accent bar
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx, cy+cr); ctx.lineTo(cx, cy+ch-cr);
        ctx.lineTo(cx+3*state.zoom, cy+ch-cr); ctx.lineTo(cx+3*state.zoom, cy+cr);
        ctx.closePath();
        ctx.fill();

        // ── Robot icon box ──
        const ibx = cx + 10*state.zoom, iby = cy + 8*state.zoom;
        const ibs = 36 * state.zoom, ibr = 6 * state.zoom;
        ctx.beginPath();
        ctx.moveTo(ibx+ibr,iby); ctx.lineTo(ibx+ibs-ibr,iby);
        ctx.quadraticCurveTo(ibx+ibs,iby,ibx+ibs,iby+ibr);
        ctx.lineTo(ibx+ibs,iby+ibs-ibr);
        ctx.quadraticCurveTo(ibx+ibs,iby+ibs,ibx+ibs-ibr,iby+ibs);
        ctx.lineTo(ibx+ibr,iby+ibs);
        ctx.quadraticCurveTo(ibx,iby+ibs,ibx,iby+ibs-ibr);
        ctx.lineTo(ibx,iby+ibr);
        ctx.quadraticCurveTo(ibx,iby,ibx+ibr,iby);
        ctx.closePath();
        ctx.fillStyle = hexA(col, 0.08 + pulse * 0.04);
        ctx.fill();
        ctx.strokeStyle = hexA(col, 0.15);
        ctx.lineWidth = 1 * state.zoom;
        ctx.stroke();

        // ── Draw SVG icon inside icon box ──
        const agIconSize = Math.round(ibs * 0.55);
        const agIconImg = getIconImg('agent', col);
        if (agIconImg && agIconImg.complete && agIconImg.naturalWidth > 0) {
            ctx.drawImage(agIconImg, ibx + ibs/2 - agIconSize/2, iby + ibs/2 - agIconSize/2, agIconSize, agIconSize);
        } else {
            ctx.font = `700 ${12*state.zoom}px 'Inter'`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = col;
            ctx.fillText('A', ibx + ibs/2, iby + ibs/2);
        }

        // ── Label text ──
        ctx.font = `600 ${11*state.zoom}px 'Inter'`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(n.label, ibx + ibs + 8*state.zoom, y);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

        // ── Connection diamonds ──
        const ds = 5 * state.zoom;
        // Left
        ctx.save(); ctx.translate(cx, y); ctx.rotate(Math.PI/4);
        ctx.fillStyle = hexA(col, 0.25 + pulse*0.15);
        ctx.strokeStyle = hexA(col, 0.5); ctx.lineWidth = 1*state.zoom;
        ctx.fillRect(-ds,-ds,ds*2,ds*2); ctx.strokeRect(-ds,-ds,ds*2,ds*2);
        ctx.restore();
        // Right
        ctx.save(); ctx.translate(cx+cw, y); ctx.rotate(Math.PI/4);
        ctx.fillStyle = hexA(col, 0.25 + pulse*0.15);
        ctx.strokeStyle = hexA(col, 0.5); ctx.lineWidth = 1*state.zoom;
        ctx.fillRect(-ds,-ds,ds*2,ds*2); ctx.strokeRect(-ds,-ds,ds*2,ds*2);
        ctx.restore();
        // Bottom
        ctx.save(); ctx.translate(x, cy+ch); ctx.rotate(Math.PI/4);
        ctx.fillStyle = hexA(col, 0.25 + pulse*0.15);
        ctx.strokeStyle = hexA(col, 0.5); ctx.lineWidth = 1*state.zoom;
        ctx.fillRect(-ds,-ds,ds*2,ds*2); ctx.strokeRect(-ds,-ds,ds*2,ds*2);
        ctx.restore();

    } else {
        // ═══ SOURCE NODE — circular dynamic ═══
        const r = 28 * state.zoom;
        n._sx = x; n._sy = y; n._sr = r;

        // Outer glow halo
        const g1 = ctx.createRadialGradient(x,y,r*0.3,x,y,r*2);
        g1.addColorStop(0, hexA(col, 0.06 + pulse*0.04));
        g1.addColorStop(0.6, hexA(col, 0.02));
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(x,y,r*2,0,Math.PI*2); ctx.fill();

        // Rotating dashed orbit
        ctx.save(); ctx.translate(x,y); ctx.rotate(-t*0.5);
        ctx.setLineDash([3,5]);
        ctx.beginPath(); ctx.arc(0,0,r*1.35,0,Math.PI*2);
        ctx.strokeStyle = hexA(col, 0.1 + pulse*0.06);
        ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 2 orbiting particles
        for (let i=0; i<2; i++) {
            const a = t*0.6 + i*Math.PI;
            const px2 = x + Math.cos(a)*r*1.35;
            const py2 = y + Math.sin(a)*r*1.35;
            const pg = ctx.createRadialGradient(px2,py2,0,px2,py2,3*state.zoom);
            pg.addColorStop(0, hexA(col, 0.5)); pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px2,py2,3*state.zoom,0,Math.PI*2); ctx.fill();
        }

        // Main circle
        ctx.shadowColor = col; ctx.shadowBlur = 8*state.zoom + pulse*6*state.zoom;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fillStyle = '#1a1a2e'; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hexA(col, 0.35 + pulse*0.2);
        ctx.lineWidth = 1.5*state.zoom; ctx.stroke();

        // Inner glow
        const ig = ctx.createRadialGradient(x,y,0,x,y,r*0.7);
        ig.addColorStop(0, hexA(col, 0.1 + pulse*0.06));
        ig.addColorStop(1, 'transparent');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(x,y,r*0.7,0,Math.PI*2); ctx.fill();

        // Icon (SVG)
        const iconSize = Math.round(r * 0.85);
        const iconImg = getIconImg(n.type, col);
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
            ctx.drawImage(iconImg, x - iconSize/2, y - iconSize/2, iconSize, iconSize);
        } else {
            // Fallback text
            const ico = CANVAS_ICONS[n.type] || '?';
            ctx.font = `700 ${9*state.zoom}px 'Inter'`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = col;
            ctx.fillText(ico, x, y);
        }

        // Label below
        ctx.font = `500 ${8*state.zoom}px 'Inter'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = hexA(col, 0.6);
        ctx.fillText(n.label, x, y + r + 6*state.zoom);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
}

function drawConns() {
    for(const c of state.conns){
        const a=c.from, b=c.to;
        if(a._sx===undefined||b._sx===undefined) continue;
        const col = b._color || a._color || '#888';

        // Bezier curve
        const dx = b._sx - a._sx, dy = b._sy - a._sy;
        const cp1x = a._sx + dx*0.5, cp1y = a._sy;
        const cp2x = b._sx - dx*0.5, cp2y = b._sy;

        const isHovered = hoveredConn === c;

        // Glow behind
        ctx.beginPath();
        ctx.moveTo(a._sx, a._sy);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, b._sx, b._sy);
        ctx.shadowColor = col;
        ctx.shadowBlur = isHovered ? 8 : 4;
        ctx.strokeStyle = isHovered ? hexA(col, 0.6) : hexA(col, 0.35);
        ctx.lineWidth = (isHovered ? 3 : 2)*state.zoom;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Flowing dot
        const t2 = (state.frame*0.006+c.id*0.3)%1;
        const bx = (1-t2)**3*a._sx + 3*(1-t2)**2*t2*cp1x + 3*(1-t2)*t2**2*cp2x + t2**3*b._sx;
        const by = (1-t2)**3*a._sy + 3*(1-t2)**2*t2*cp1y + 3*(1-t2)*t2**2*cp2y + t2**3*b._sy;
        ctx.beginPath(); ctx.arc(bx, by, 3.5*state.zoom, 0, Math.PI*2);
        ctx.fillStyle = col; ctx.fill();

        // Second flowing dot (offset)
        const t3 = (state.frame*0.006+c.id*0.3+0.5)%1;
        const bx2 = (1-t3)**3*a._sx + 3*(1-t3)**2*t3*cp1x + 3*(1-t3)*t3**2*cp2x + t3**3*b._sx;
        const by2 = (1-t3)**3*a._sy + 3*(1-t3)**2*t3*cp1y + 3*(1-t3)*t3**2*cp2y + t3**3*b._sy;
        ctx.beginPath(); ctx.arc(bx2, by2, 2*state.zoom, 0, Math.PI*2);
        ctx.fillStyle = hexA(col, 0.4); ctx.fill();
    }
}

function drawTempConn() {
    if (!state.connDrag) return;
    ctx.beginPath();
    ctx.moveTo(state.connDrag.startX, state.connDrag.startY);
    const dx = state.connDrag.curX - state.connDrag.startX;
    ctx.bezierCurveTo(
        state.connDrag.startX + dx*0.5, state.connDrag.startY,
        state.connDrag.curX - dx*0.5, state.connDrag.curY,
        state.connDrag.curX, state.connDrag.curY
    );
    ctx.strokeStyle = 'rgba(139,92,246,0.4)';
    ctx.lineWidth = 2*state.zoom;
    ctx.setLineDash([4,4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target dot
    ctx.beginPath(); ctx.arc(state.connDrag.curX, state.connDrag.curY, 4*state.zoom, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(139,92,246,0.5)'; ctx.fill();
}

function drawSelectedHighlight() {
    if (!state.selectedNode || !state.selectedNode._sx) return;
    const n = state.selectedNode;
    const isAg = n.type === 'agent';
    if (isAg) {
        const cw=140*state.zoom, ch=52*state.zoom, cr=8*state.zoom;
        const cx=n._sx-cw/2-3*state.zoom, cy=n._sy-ch/2-3*state.zoom;
        ctx.beginPath();
        ctx.moveTo(cx+cr,cy); ctx.lineTo(cx+cw+6*state.zoom-cr,cy);
        ctx.quadraticCurveTo(cx+cw+6*state.zoom,cy,cx+cw+6*state.zoom,cy+cr);
        ctx.lineTo(cx+cw+6*state.zoom,cy+ch+6*state.zoom-cr);
        ctx.quadraticCurveTo(cx+cw+6*state.zoom,cy+ch+6*state.zoom,cx+cw+6*state.zoom-cr,cy+ch+6*state.zoom);
        ctx.lineTo(cx+cr,cy+ch+6*state.zoom);
        ctx.quadraticCurveTo(cx,cy+ch+6*state.zoom,cx,cy+ch+6*state.zoom-cr);
        ctx.lineTo(cx,cy+cr);
        ctx.quadraticCurveTo(cx,cy,cx+cr,cy);
        ctx.closePath();
    } else {
        const r = (n._sr || 28*state.zoom) + 4*state.zoom;
        ctx.beginPath();
        ctx.arc(n._sx, n._sy, r, 0, Math.PI*2);
    }
    ctx.strokeStyle = 'rgba(139,92,246,0.4)';
    ctx.lineWidth = 2*state.zoom;
    ctx.setLineDash([4,3]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawInfoBadges() {
    const t = state.frame * 0.02;
    const pulse = Math.sin(t) * 0.5 + 0.5;

    for (const n of state.nodes) {
        if (n.type !== 'agent' || !n._sx) continue;

        const col = n._color || '#8b5cf6';
        const x = n._sx, y = n._sy;
        const cw = 140*state.zoom;

        // Count connections for level calc
        const connCount = state.conns.filter(c => c.from === n || c.to === n).length;
        if (!n._xp) n._xp = connCount * 5;
        const xp = (n._xp || 0);
        const level = Math.min(99, Math.floor(xp / 10) + 1);
        const xpProgress = (xp % 10) / 10;

        // Badge positions
        const b1x = x + cw/2 + 55*state.zoom;
        const b1y = y - 22*state.zoom;
        const b2x = x + cw/2 + 55*state.zoom;
        const b2y = y + 22*state.zoom;
        const br = 22*state.zoom;

        // Connecting lines from agent to badges
        const lineStartX = x + cw/2;
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = hexA(col, 0.15);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(lineStartX, y - 6*state.zoom); ctx.lineTo(b1x - br, b1y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lineStartX, y + 6*state.zoom); ctx.lineTo(b2x - br, b2y); ctx.stroke();
        ctx.setLineDash([]);

        // ═══ LEVEL BADGE ═══
        const g1 = ctx.createRadialGradient(b1x, b1y, br*0.3, b1x, b1y, br*1.6);
        g1.addColorStop(0, hexA('#fbbf24', 0.05 + pulse*0.03));
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(b1x, b1y, br*1.6, 0, Math.PI*2); ctx.fill();

        // Progress ring (XP)
        ctx.beginPath();
        ctx.arc(b1x, b1y, br + 3*state.zoom, -Math.PI/2, -Math.PI/2 + Math.PI*2 * xpProgress);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5*state.zoom;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';

        // BG ring
        ctx.beginPath(); ctx.arc(b1x, b1y, br + 3*state.zoom, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(251,191,36,0.08)';
        ctx.lineWidth = 2.5*state.zoom; ctx.stroke();

        // Main circle
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6*state.zoom + pulse*4*state.zoom;
        ctx.beginPath(); ctx.arc(b1x, b1y, br, 0, Math.PI*2);
        ctx.fillStyle = '#1a1a2e'; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hexA('#fbbf24', 0.3 + pulse*0.15);
        ctx.lineWidth = 1.5*state.zoom; ctx.stroke();

        // Level text
        ctx.font = `800 ${11*state.zoom}px 'Orbitron'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(level, b1x, b1y - 2*state.zoom);

        ctx.font = `600 ${5*state.zoom}px 'JetBrains Mono'`;
        ctx.fillStyle = 'rgba(251,191,36,0.4)';
        ctx.fillText('LEVEL', b1x, b1y + 8*state.zoom);

        // ═══ DATA BADGE ═══
        const dCol = '#06b6d4';

        const g2 = ctx.createRadialGradient(b2x, b2y, br*0.3, b2x, b2y, br*1.6);
        g2.addColorStop(0, hexA(dCol, 0.05 + pulse*0.03));
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b2x, b2y, br*1.6, 0, Math.PI*2); ctx.fill();

        // Rotating accent
        ctx.save(); ctx.translate(b2x, b2y); ctx.rotate(t*0.3);
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(0, 0, br + 3*state.zoom, 0, Math.PI*2);
        ctx.strokeStyle = hexA(dCol, 0.12);
        ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Main circle
        ctx.shadowColor = dCol; ctx.shadowBlur = 6*state.zoom + pulse*4*state.zoom;
        ctx.beginPath(); ctx.arc(b2x, b2y, br, 0, Math.PI*2);
        ctx.fillStyle = '#1a1a2e'; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hexA(dCol, 0.3 + pulse*0.15);
        ctx.lineWidth = 1.5*state.zoom; ctx.stroke();

        // Data count
        ctx.font = `800 ${12*state.zoom}px 'Orbitron'`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = dCol;
        ctx.fillText(connCount, b2x, b2y - 2*state.zoom);

        ctx.font = `600 ${5*state.zoom}px 'JetBrains Mono'`;
        ctx.fillStyle = hexA(dCol, 0.4);
        ctx.fillText('VERİ', b2x, b2y + 8*state.zoom);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function render() {
    state.frame++; requestAnimationFrame(render);
    ctx.fillStyle='#0c0c1a'; ctx.fillRect(0,0,cW,cH);
    drawGrid();
    if(!state.activeAgent){
        ctx.font='500 13px Inter'; ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.textAlign='center';
        ctx.fillText('+ butonuna tıklayarak ajan ve düğüm ekleyin',cW/2,cH/2);
        ctx.textAlign='left';
    }
    drawConns();
    drawTempConn();
    for(const n of state.nodes) drawNode(n);
    drawSelectedHighlight();
    drawInfoBadges();
}
render();
refreshSidebar();
