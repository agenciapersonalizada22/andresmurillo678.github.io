// Arte propio dibujado con canvas 2D: iconos de recursos, piezas y losetas de terreno (sin imagenes externas).
export const COL_RES = { mad: '#2f8f4e', bar: '#c8553d', alg: '#c9d8e8', mai: '#e8b83a', met: '#7b8699', gen: '#5a7fa8' };
export const COL_TERR = { mad: ['#2b7a45', '#1c5a33'], bar: ['#d0694a', '#a4452f'], alg: ['#8fcf7e', '#5fa957'], mai: ['#f1c94d', '#d49f27'], met: ['#8f9bb0', '#5d6a82'], des: ['#efd9a0', '#d9bd7a'] };
export const COL_JUG = ['#e5484d', '#3b82f6', '#f5a524', '#9b5de5'];
export const COL_JUG_ALT = ['#d55e00', '#0072b2', '#f0e442', '#cc79a7'];
export const colorJug = (i, dalto) => (dalto ? COL_JUG_ALT : COL_JUG)[i % 4];
export const INICIALES = { mad: 'M', bar: 'B', alg: 'A', mai: 'Z', met: 'H' };

export function semilla(n) { let t = (n * 2654435761) >>> 0; return () => { t = (t + 0x6D2B79F5) | 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

/* Glifo de recurso centrado en (x,y) con radio r, sobre disco de color. */
export function dibujarRecurso(c, res, x, y, r, disco = true) {
  c.save(); c.translate(x, y); c.scale(r, r);
  if (disco) {
    const g = c.createRadialGradient(-0.3, -0.35, 0.1, 0, 0, 1.05);
    g.addColorStop(0, '#fff'); g.addColorStop(0.15, COL_RES[res] || '#999'); g.addColorStop(1, shade(COL_RES[res] || '#999', -0.35));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill();
    c.lineWidth = 0.09; c.strokeStyle = 'rgba(0,0,0,.45)'; c.stroke();
  }
  c.fillStyle = '#fff8e6'; c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.07; c.lineJoin = 'round'; c.lineCap = 'round';
  if (res === 'mad') { // pino
    c.beginPath(); c.moveTo(0, -0.62); c.lineTo(0.38, -0.05); c.lineTo(-0.38, -0.05); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -0.28); c.lineTo(0.5, 0.38); c.lineTo(-0.5, 0.38); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#7a4a22'; c.fillRect(-0.09, 0.38, 0.18, 0.24); c.strokeRect(-0.09, 0.38, 0.18, 0.24);
  } else if (res === 'bar') { // ladrillos
    for (let f = 0; f < 3; f++) for (let k = 0; k < 2; k++) { const ox = (f % 2 ? 0.28 : 0) - 0.55 + k * 0.55; c.fillRect(ox, -0.55 + f * 0.38, 0.5, 0.32); c.strokeRect(ox, -0.55 + f * 0.38, 0.5, 0.32); }
  } else if (res === 'alg') { // capullo de algodon
    [[-0.3, 0.1], [0.3, 0.1], [0, -0.28], [0, 0.22]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 0.3, 0, 7); c.fill(); c.stroke(); });
    c.fillStyle = '#4a7a3a'; c.beginPath(); c.moveTo(-0.2, 0.55); c.lineTo(0, 0.38); c.lineTo(0.2, 0.55); c.closePath(); c.fill();
  } else if (res === 'mai') { // mazorca
    c.fillStyle = '#fff2b0'; c.beginPath(); c.ellipse(0, -0.05, 0.27, 0.55, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#5a9a3a'; c.beginPath(); c.moveTo(0, 0.55); c.quadraticCurveTo(-0.55, 0.2, -0.28, -0.25); c.quadraticCurveTo(-0.1, 0.1, 0, 0.55); c.fill(); c.beginPath(); c.moveTo(0, 0.55); c.quadraticCurveTo(0.55, 0.2, 0.28, -0.25); c.quadraticCurveTo(0.1, 0.1, 0, 0.55); c.fill();
    c.strokeStyle = 'rgba(160,110,0,.7)'; c.lineWidth = 0.05; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 0.09, -0.5); c.lineTo(k * 0.09, 0.3); c.stroke(); }
  } else if (res === 'met') { // gema/mineral
    c.beginPath(); c.moveTo(-0.55, -0.12); c.lineTo(-0.28, -0.55); c.lineTo(0.28, -0.55); c.lineTo(0.55, -0.12); c.lineTo(0, 0.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-0.55, -0.12); c.lineTo(0.55, -0.12); c.moveTo(-0.28, -0.55); c.lineTo(-0.12, -0.12); c.lineTo(0, 0.6); c.moveTo(0.28, -0.55); c.lineTo(0.12, -0.12); c.lineTo(0, 0.6); c.stroke();
  } else { // generico 3:1
    c.font = '800 0.95px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 0.05);
  }
  c.restore();
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
const cacheIcono = {};
export function iconoURL(res, px = 48) {
  const k = res + px;
  if (cacheIcono[k]) return cacheIcono[k];
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    dibujarRecurso(cv.getContext('2d'), res, px / 2, px / 2, px / 2 - 2);
    return (cacheIcono[k] = cv.toDataURL());
  } catch (e) { return ''; }
}

/* Cartas de desarrollo: glifos simples. */
export function dibujarCarta(c, tipo, x, y, r) {
  c.save(); c.translate(x, y); c.scale(r, r); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = '#fff8e6'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.07;
  if (tipo === 'guardia') { c.beginPath(); c.moveTo(0, -0.8); c.lineTo(0.6, -0.5); c.lineTo(0.5, 0.2); c.quadraticCurveTo(0.3, 0.65, 0, 0.8); c.quadraticCurveTo(-0.3, 0.65, -0.5, 0.2); c.lineTo(-0.6, -0.5); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, -0.5); c.lineTo(0, 0.55); c.moveTo(-0.35, -0.1); c.lineTo(0.35, -0.1); c.stroke(); }
  else if (tipo === 'rutas') { c.lineWidth = 0.22; c.strokeStyle = '#fff8e6'; c.beginPath(); c.moveTo(-0.7, 0.6); c.lineTo(-0.1, 0.1); c.lineTo(0.2, 0.4); c.lineTo(0.75, -0.55); c.stroke(); c.lineWidth = 0.07; c.strokeStyle = 'rgba(0,0,0,.6)'; c.setLineDash([0.12, 0.12]); c.beginPath(); c.moveTo(-0.7, 0.6); c.lineTo(-0.1, 0.1); c.lineTo(0.2, 0.4); c.lineTo(0.75, -0.55); c.stroke(); c.setLineDash([]); }
  else if (tipo === 'cosecha') { c.beginPath(); c.ellipse(0, 0.35, 0.65, 0.3, 0, 0, 7); c.fill(); c.stroke(); [-0.35, 0, 0.35].forEach((a, i) => { c.beginPath(); c.arc(a, 0.0 - (i === 1 ? 0.2 : 0), 0.22, 0, 7); c.fill(); c.stroke(); }); }
  else if (tipo === 'acaparar') { c.beginPath(); c.arc(0, 0, 0.6, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#6a4b1e'; c.font = '800 0.9px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', 0, 0.05); }
  else { c.beginPath(); c.moveTo(0, -0.8); c.lineTo(0.2, -0.2); c.lineTo(0.8, -0.2); c.lineTo(0.3, 0.2); c.lineTo(0.5, 0.8); c.lineTo(0, 0.4); c.lineTo(-0.5, 0.8); c.lineTo(-0.3, 0.2); c.lineTo(-0.8, -0.2); c.lineTo(-0.2, -0.2); c.closePath(); c.fillStyle = '#ffd23d'; c.fill(); c.stroke(); }
  c.restore();
}
const cacheCarta = {};
export function cartaURL(tipo, px = 56) {
  const k = tipo + px;
  if (cacheCarta[k]) return cacheCarta[k];
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    const c = cv.getContext('2d'); const g = c.createRadialGradient(px * 0.35, px * 0.3, 2, px / 2, px / 2, px / 2);
    const col = { guardia: '#8a3b3b', rutas: '#6a7a3b', cosecha: '#3b7a6a', acaparar: '#7a5a3b', pv: '#7a3b8a' }[tipo] || '#555';
    g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, shade(col, -0.35));
    c.fillStyle = g; c.beginPath(); c.arc(px / 2, px / 2, px / 2 - 2, 0, 7); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
    dibujarCarta(c, tipo, px / 2, px / 2, px / 2 - 9);
    return (cacheCarta[k] = cv.toDataURL());
  } catch (e) { return ''; }
}

/* ---------- losetas de terreno (sprite hexagonal en unidades de lado 1) ---------- */
function hexPath(c, k = 1) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = ((60 * i - 30) * Math.PI) / 180; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * k, Math.sin(a) * k); } c.closePath(); }
export { hexPath };
const dentro = (r, rad = 0.78) => { for (;;) { const x = (r() * 2 - 1) * rad, y = (r() * 2 - 1) * rad; if (Math.abs(y) < rad && Math.abs(x) * 0.5 + Math.abs(y) * 0.866 < 0.866 * rad && Math.abs(x) < 0.866 * rad) return [x, y]; } };
function pino(c, x, y, s, r) {
  c.fillStyle = '#4a2f18'; c.fillRect(x - s * 0.06, y + s * 0.2, s * 0.12, s * 0.25);
  const tonos = ['#1f6b3b', '#2a8a4c', '#237a42'];
  for (let i = 0; i < 3; i++) { c.fillStyle = tonos[(i + (r() * 3 | 0)) % 3]; c.beginPath(); c.moveTo(x, y - s * (0.6 - i * 0.05) + i * s * 0.22); c.lineTo(x + s * (0.28 + i * 0.1), y + s * (0.05 + i * 0.22)); c.lineTo(x - s * (0.28 + i * 0.1), y + s * (0.05 + i * 0.22)); c.closePath(); c.fill(); }
}
export function dibujarLoseta(c, tipo, variante, sombras) {
  const r = semilla(variante * 97 + tipo.charCodeAt(0) * 13 + tipo.charCodeAt(1));
  const [c0, c1] = COL_TERR[tipo];
  c.save(); hexPath(c, 0.98); c.clip();
  const g = c.createLinearGradient(-0.8, -0.9, 0.8, 0.9); g.addColorStop(0, c0); g.addColorStop(1, c1);
  c.fillStyle = g; c.fillRect(-1.2, -1.2, 2.4, 2.4);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (tipo === 'mad') {
    const pts = []; for (let i = 0; i < 11; i++) pts.push(dentro(r, 0.74)); pts.sort((a, b) => a[1] - b[1]);
    pts.forEach(([x, y]) => pino(c, x, y, 0.3 + r() * 0.1, r));
  } else if (tipo === 'bar') {
    for (let k = 0; k < 4; k++) { const y = -0.55 + k * 0.4 + r() * 0.1; c.fillStyle = k % 2 ? '#b9533a' : '#c8654a'; c.beginPath(); c.moveTo(-1, y + 0.3); c.quadraticCurveTo(-0.4, y - 0.25, 0.1, y + 0.1); c.quadraticCurveTo(0.6, y + 0.3, 1, y - 0.1); c.lineTo(1, 1); c.lineTo(-1, 1); c.closePath(); c.fill(); }
    for (let i = 0; i < 9; i++) { const [x, y] = dentro(r, 0.7); c.fillStyle = 'rgba(255,220,180,.35)'; c.fillRect(x, y, 0.16, 0.08); c.strokeStyle = 'rgba(90,30,10,.4)'; c.lineWidth = 0.015; c.strokeRect(x, y, 0.16, 0.08); }
  } else if (tipo === 'alg') {
    for (let k = 0; k < 5; k++) { c.strokeStyle = 'rgba(40,110,50,.35)'; c.lineWidth = 0.05; c.beginPath(); c.moveTo(-1, -0.7 + k * 0.38); c.quadraticCurveTo(0, -0.9 + k * 0.38, 1, -0.65 + k * 0.38); c.stroke(); }
    for (let i = 0; i < 12; i++) { const [x, y] = dentro(r, 0.72), s = 0.07 + r() * 0.05; c.fillStyle = '#fffdf5'; for (const [a, b] of [[-s, 0], [s, 0], [0, -s]]) { c.beginPath(); c.arc(x + a, y + b, s * 0.9, 0, 7); c.fill(); } c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.arc(x, y + s * 0.7, s * 0.7, 0, 7); c.fill(); }
  } else if (tipo === 'mai') {
    c.strokeStyle = 'rgba(160,100,10,.4)'; c.lineWidth = 0.05; for (let k = -6; k < 7; k++) { c.beginPath(); c.moveTo(k * 0.22 - 1, -1.1); c.lineTo(k * 0.22 + 0.4, 1.1); c.stroke(); }
    for (let i = 0; i < 14; i++) { const [x, y] = dentro(r, 0.72); c.strokeStyle = '#4f8a2f'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(x, y + 0.14); c.lineTo(x, y - 0.12); c.stroke(); c.fillStyle = '#ffe08a'; c.beginPath(); c.ellipse(x, y - 0.1, 0.035, 0.085, 0, 0, 7); c.fill(); }
  } else if (tipo === 'met') {
    const picos = []; for (let i = 0; i < 4; i++) picos.push([dentro(r, 0.55), 0.35 + r() * 0.22]); picos.sort((a, b) => a[0][1] - b[0][1]);
    picos.forEach(([[x, y], s]) => { c.fillStyle = '#5b6780'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.85, y + s * 0.5); c.lineTo(x - s * 0.85, y + s * 0.5); c.closePath(); c.fill(); c.fillStyle = '#7c89a3'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.85, y + s * 0.5); c.lineTo(x + s * 0.1, y + s * 0.5); c.closePath(); c.fill(); c.fillStyle = '#f4f7ff'; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.28, y - s * 0.45); c.lineTo(x - s * 0.28, y - s * 0.45); c.closePath(); c.fill(); });
    for (let i = 0; i < 6; i++) { const [x, y] = dentro(r, 0.7); c.fillStyle = ['#ffcf5a', '#7be0ff', '#ff8ac0'][i % 3]; c.beginPath(); c.moveTo(x, y - 0.05); c.lineTo(x + 0.04, y); c.lineTo(x, y + 0.05); c.lineTo(x - 0.04, y); c.closePath(); c.fill(); }
  } else { // duna
    for (let k = 0; k < 4; k++) { c.strokeStyle = 'rgba(160,110,40,.35)'; c.lineWidth = 0.04; c.beginPath(); c.moveTo(-1, -0.5 + k * 0.4); c.quadraticCurveTo(-0.2, -0.9 + k * 0.4, 0.4, -0.4 + k * 0.4); c.quadraticCurveTo(0.8, -0.15 + k * 0.4, 1.1, -0.45 + k * 0.4); c.stroke(); }
    c.fillStyle = '#d3b26a'; c.beginPath(); c.arc(0.4, 0.45, 0.07, 0, 7); c.arc(-0.45, -0.3, 0.05, 0, 7); c.fill();
    c.fillStyle = '#6d9a4a'; c.fillRect(-0.55, 0.35, 0.05, 0.24); c.fillRect(-0.62, 0.42, 0.06, 0.04); c.fillRect(-0.5, 0.45, 0.06, 0.04);
  }
  if (sombras) { // relieve suave
    const sh = c.createLinearGradient(0, -1, 0, 1); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = sh; c.fillRect(-1.2, -1.2, 2.4, 2.4);
  }
  c.restore();
  hexPath(c, 0.98); c.lineWidth = 0.035; c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke();
}
