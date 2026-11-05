// Pintado en canvas 2D de fondos y objetos (compartido por el lienzo y la exportacion a PNG/PDF).
import { MARCO, REL_TINTA, FUENTE } from './config.js';
import { aMundo, caja, cruza, extremos, poligonoForma, puntosTrazo, contornoTrazo } from './geom.js';
import { fuenteCSS, envolver, ajustarNota } from './texto.js';

export const temaUI = { oscuro: false };
export const colorReal = (c, oscuro) => (!c || c === 'tinta' ? (oscuro ? REL_TINTA.oscuro : REL_TINTA.claro) : c);

export function dibujarFondo(ctx, fondo, cam, W, H, marco) {
  const osc = fondo === 'oscuro', z = cam.z;
  const base = osc ? '#1e2430' : '#ffffff', fuera = temaUI.oscuro ? '#0d1016' : osc ? '#12151c' : '#e6e9ef';
  ctx.save();
  let x0 = 0, y0 = 0, x1 = W, y1 = H;
  if (marco) {
    ctx.fillStyle = fuera; ctx.fillRect(0, 0, W, H);
    x0 = (0 - cam.x) * z; y0 = (0 - cam.y) * z; x1 = (MARCO.w - cam.x) * z; y1 = (MARCO.h - cam.y) * z;
    ctx.fillStyle = base; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.beginPath(); ctx.rect(Math.max(0, x0), Math.max(0, y0), Math.min(W, x1) - Math.max(0, x0), Math.min(H, y1) - Math.max(0, y0)); ctx.clip();
  } else { ctx.fillStyle = base; ctx.fillRect(0, 0, W, H); }
  if (fondo === 'cuadriculado' || fondo === 'lineas' || fondo === 'puntos') {
    let paso = fondo === 'cuadriculado' ? 40 : fondo === 'lineas' ? 48 : 32;
    while (paso * z < 9) paso *= 5;
    ctx.strokeStyle = osc ? 'rgba(255,255,255,.12)' : 'rgba(30,60,120,.16)'; ctx.fillStyle = osc ? 'rgba(255,255,255,.28)' : 'rgba(30,60,120,.32)';
    ctx.lineWidth = 1;
    const ax = Math.floor(cam.x / paso) * paso, ay = Math.floor(cam.y / paso) * paso;
    const bx = cam.x + W / z, by = cam.y + H / z;
    ctx.beginPath();
    if (fondo === 'puntos') {
      const r = Math.max(1, Math.min(2.2, z * 1.6));
      for (let wx = ax; wx <= bx; wx += paso) for (let wy = ay; wy <= by; wy += paso) { const sx = (wx - cam.x) * z, sy = (wy - cam.y) * z; ctx.moveTo(sx + r, sy); ctx.arc(sx, sy, r, 0, 6.2832); }
      ctx.fill();
    } else {
      if (fondo === 'cuadriculado') for (let wx = ax; wx <= bx; wx += paso) { const sx = Math.round((wx - cam.x) * z) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
      for (let wy = ay; wy <= by; wy += paso) { const sy = Math.round((wy - cam.y) * z) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
      ctx.stroke();
    }
  }
  ctx.restore();
  if (marco) {
    ctx.save(); ctx.strokeStyle = osc ? 'rgba(255,255,255,.35)' : 'rgba(20,30,60,.28)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
  }
}

function flechaPunta(ctx, x, y, ang, tam) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - tam * Math.cos(ang - 0.45), y - tam * Math.sin(ang - 0.45));
  ctx.moveTo(x, y);
  ctx.lineTo(x - tam * Math.cos(ang + 0.45), y - tam * Math.sin(ang + 0.45));
  ctx.stroke();
}
function rectRedondo(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const medidor = (ctx, fs, neg, cur) => { ctx.font = fuenteCSS(fs, neg, cur); return s => ctx.measureText(s).width; };

export function lineasTexto(ctx, v, e) {
  const k = e && e._t;
  if (k && k.rev === e.rev) return k;
  const fs = v.fs || 24, med = medidor(ctx, fs, v.neg, v.cur);
  const r = { rev: e ? e.rev : 0, fs, lineas: envolver(v.texto, v.w - 8, med) };
  if (e) e._t = r;
  return r;
}

function trazoPath(v, e) {
  const k = e._p;
  if (k && k.rev === e.rev) return k.p;
  const p = new Path2D(contornoTrazo(puntosTrazo(v), v.grosor || 4, !!v.res));
  e._p = { rev: e.rev, p };
  return p;
}

// Dibuja un objeto. cx: { oscuro, z (zoom), imagen(id), cacheado }
export function dibujarObjeto(ctx, doc, e, cx) {
  const v = e.v, t = v.tipo;
  if (t === 'conector') {
    const [a, b] = extremos(doc, v);
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = colorReal(v.color, cx.oscuro); ctx.lineWidth = v.grosor || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (v.flecha !== false) flechaPunta(ctx, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 10 + (v.grosor || 3) * 2.2);
    ctx.restore(); return;
  }
  ctx.save();
  if (t === 'comentario' || t === 'votos') {
    ctx.translate(v.x, v.y);
    if (t === 'comentario') {
      ctx.globalAlpha = v.res ? 0.4 : 1;
      ctx.fillStyle = v.color || '#3b82f6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(16, 16, 16, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 26); ctx.lineTo(4, 36); ctx.lineTo(15, 30); ctx.closePath(); ctx.fillStyle = v.color || '#3b82f6'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 15px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(v.res ? '✓' : '💬', 16, 17);
    } else {
      const n = doc.votos(e);
      rectRedondo(ctx, 0, 0, v.w, v.h, v.h / 2); ctx.fillStyle = v.color || '#f59e0b'; ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.font = '700 17px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((v.etq || '👍') + ' ' + n, v.w / 2, v.h / 2 + 1);
    }
    ctx.restore(); return;
  }
  const cxm = v.x + v.w / 2, cym = v.y + v.h / 2;
  ctx.translate(cxm, cym); ctx.rotate(v.rot || 0); ctx.translate(-v.w / 2, -v.h / 2);
  if (v.op != null && v.op < 1) ctx.globalAlpha = v.op;
  switch (t) {
    case 'trazo':
      if (v.res) ctx.globalAlpha *= 0.38;
      ctx.fillStyle = colorReal(v.color, cx.oscuro);
      ctx.fill(trazoPath(v, e));
      break;
    case 'forma': {
      const col = colorReal(v.color, cx.oscuro), g = v.grosor || 3;
      ctx.strokeStyle = col; ctx.lineWidth = g; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const rel = v.relleno && v.relleno !== 'ninguno' ? colorReal(v.relleno, cx.oscuro) : null;
      if (v.fm === 'linea' || v.fm === 'flecha') {
        const a = v.p1 || [0, 0], b = v.p2 || [1, 1], ax = a[0] * v.w, ay = a[1] * v.h, bx = b[0] * v.w, by = b[1] * v.h;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        if (v.fm === 'flecha') flechaPunta(ctx, bx, by, Math.atan2(by - ay, bx - ax), 10 + g * 2.2);
        break;
      }
      ctx.beginPath();
      if (v.fm === 'rect') { if (v.rad) rectRedondo(ctx, 0, 0, v.w, v.h, v.rad); else ctx.rect(0, 0, v.w, v.h); }
      else if (v.fm === 'elipse') ctx.ellipse(v.w / 2, v.h / 2, Math.max(0.1, v.w / 2), Math.max(0.1, v.h / 2), 0, 0, 6.2832);
      else { const pol = poligonoForma(v); if (pol) { pol.forEach(([px, py], i) => (i ? ctx.lineTo(px * v.w, py * v.h) : ctx.moveTo(px * v.w, py * v.h))); ctx.closePath(); } }
      if (rel) { ctx.fillStyle = rel; ctx.fill(); }
      ctx.stroke();
      break;
    }
    case 'nota': {
      ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillStyle = v.color || '#fff176'; rectRedondo(ctx, 0, 0, v.w, v.h, 6); ctx.fill();
      ctx.shadowColor = 'transparent';
      if (v.texto) {
        let k = e._t;
        if (!k || k.rev !== e.rev) {
          const r = ajustarNota(v.texto, v.w, v.h, v.fs || 26, (fs, n) => medidor(ctx, fs, v.neg, v.cur));
          k = e._t = { rev: e.rev, fs: r.fs, lineas: r.lineas };
        }
        ctx.font = fuenteCSS(k.fs, v.neg, v.cur); ctx.fillStyle = '#1f2937'; ctx.textBaseline = 'top';
        const al = v.al || 'center', alto = k.lineas.length * k.fs * 1.25;
        ctx.textAlign = al;
        const tx = al === 'left' ? 14 : al === 'right' ? v.w - 14 : v.w / 2;
        let y = Math.max(14, (v.h - alto) / 2);
        for (const l of k.lineas) { ctx.fillText(l, tx, y); y += k.fs * 1.25; }
      }
      break;
    }
    case 'texto': {
      const k = lineasTexto(ctx, v, e);
      ctx.font = fuenteCSS(k.fs, v.neg, v.cur); ctx.fillStyle = colorReal(v.color, cx.oscuro); ctx.textBaseline = 'top';
      const al = v.al || 'left'; ctx.textAlign = al;
      const tx = al === 'left' ? 4 : al === 'right' ? v.w - 4 : v.w / 2;
      let y = 4;
      for (const l of k.lineas) { ctx.fillText(l, tx, y); y += k.fs * 1.25; }
      break;
    }
    case 'imagen': {
      const im = cx.imagen && cx.imagen(v.img);
      if (im) {
        const r = v.rec || [0, 0, 1, 1], iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
        ctx.drawImage(im, r[0] * iw, r[1] * ih, r[2] * iw, r[3] * ih, 0, 0, v.w, v.h);
      } else { ctx.fillStyle = 'rgba(128,128,128,.25)'; ctx.fillRect(0, 0, v.w, v.h); ctx.fillStyle = '#888'; ctx.font = '14px ' + FUENTE; ctx.textAlign = 'center'; ctx.fillText('Cargando imagen…', v.w / 2, v.h / 2); }
      break;
    }
  }
  ctx.restore();
}

// Pinta los objetos visibles de la pagina (cam: {x,y,z}) sobre un contexto ya limpio/escalado.
export function dibujarObjetos(ctx, doc, pg, cam, W, H, cx, omitir) {
  const vista = { x0: cam.x, y0: cam.y, x1: cam.x + W / cam.z, y1: cam.y + H / cam.z };
  ctx.save(); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  const c2 = { ...cx, z: cam.z };
  let n = 0;
  for (const e of doc.lista(pg)) {
    if (omitir && omitir.has(e.id)) continue;
    if (!doc.capaVisible(e.v.cap)) continue;
    if (!cruza(caja(doc, e), vista)) continue;
    if (e.v.tipo === 'trazo') {
      const tam = Math.max(e.v.w, e.v.h) * cam.z;
      if (tam < 0.7) continue;
      if (tam < 6 && !e.v.rot) {   // muy pequeno en pantalla: basta una mancha del color del trazo
        ctx.fillStyle = colorReal(e.v.color, c2.oscuro); ctx.globalAlpha = e.v.res ? 0.38 : 0.85;
        const m = Math.max(e.v.grosor || 3, 1 / cam.z);
        ctx.fillRect(e.v.x, e.v.y, Math.max(e.v.w, m), Math.max(e.v.h, m)); ctx.globalAlpha = 1; n++; continue;
      }
    }
    dibujarObjeto(ctx, doc, e, c2); n++;
  }
  ctx.restore();
  return n;
}

export function dibujarPagina(ctx, doc, pg, cam, W, H, cx) {
  const p = doc.ent.p.get(pg), fondo = (p && p.v.fondo) || 'blanco';
  dibujarFondo(ctx, fondo, cam, W, H, !!(p && p.v.marco));
  return dibujarObjetos(ctx, doc, pg, cam, W, H, { ...cx, oscuro: fondo === 'oscuro' });
}
