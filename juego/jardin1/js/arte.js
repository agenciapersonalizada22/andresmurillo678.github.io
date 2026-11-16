// Arte vectorial procedural: plantas, zombis, fondos y objetos dibujados por codigo (Canvas 2D). Todo original.
import { P, Z, COLS, FILAS } from './datos.js';

export const A = { dalt: false, calidad: 2, reducir: false, sombras: true };
const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos, PI = Math.PI;

function circ(c, x, y, r, f, s, lw) { c.beginPath(); c.arc(x, y, r, 0, TAU); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.lineWidth = lw || 0.025; c.strokeStyle = s; c.stroke(); } }
function elip(c, x, y, rx, ry, f, s, rot, lw) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.lineWidth = lw || 0.025; c.strokeStyle = s; c.stroke(); } }
function rect(c, x, y, w, h, f, s, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r || 0); else c.rect(x, y, w, h); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.lineWidth = 0.025; c.strokeStyle = s; c.stroke(); } }
function poli(c, pts, f, s, lw) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.lineWidth = lw || 0.025; c.strokeStyle = s; c.stroke(); } }
function lin(c, x1, y1, x2, y2, col, lw) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = lw || 0.03; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); }
function curva(c, x1, y1, qx, qy, x2, y2, col, lw) { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(qx, qy, x2, y2); c.lineWidth = lw || 0.03; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); }
function hoja(c, x, y, len, ang, col, anc) { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -(anc || 0.12), len, 0); c.quadraticCurveTo(len * 0.5, (anc || 0.12), 0, 0); c.fillStyle = col; c.fill(); c.restore(); }
function ojos(c, x, y, sep, r, mx, my, bravo) { [-1, 1].forEach((k) => { circ(c, x + k * sep, y, r, '#fff', '#222', 0.012); circ(c, x + k * sep + (mx || 0) * r * 0.4, y + (my || 0) * r * 0.3, r * 0.5, '#111'); if (bravo) lin(c, x + k * sep - k * r * 1.1, y - r * 1.6 + (k > 0 ? 0 : 0.0), x + k * sep + k * r * 0.5, y - r * 0.9, '#222', 0.025); }); }
function sonrisa(c, x, y, w, abierta) { c.beginPath(); c.arc(x, y, w, 0.15 * PI, 0.85 * PI); c.lineWidth = 0.03; c.strokeStyle = '#3b1d0a'; c.lineCap = 'round'; c.stroke(); if (abierta) { c.fillStyle = 'rgba(80,20,10,.5)'; c.fill(); } }
function brillo(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,200,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function tallo(c, t, alto, col, ph) { const sw = sin(t * 1.8 + (ph || 0)) * 0.03; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sw * 2, -alto * 0.5, sw, -alto); c.lineWidth = 0.07; c.strokeStyle = col || '#3c8f2e'; c.lineCap = 'round'; c.stroke(); hoja(c, 0, -alto * 0.25, 0.22, -0.5 + sw * 4, col || '#47a935'); hoja(c, 0, -alto * 0.4, 0.22, PI + 0.5 - sw * 4, col || '#47a935'); return sw; }
function cabezaTiro(c, t, e, col, col2, x0) {
  const sw = tallo(c, t, 0.4), x = sw, y = -0.55, k = 1 + (e.ataque > 0 ? 0.08 : 0);
  c.save(); c.translate(x, y); c.scale(k, 1 / k * 1);
  rect(c, 0.16 - (e.ataque > 0 ? 0.05 : 0), -0.09, 0.28, 0.18, col2, '#245c1c', 0.06); elip(c, 0.14, 0, 0.06, 0.1, '#1d4d17');
  circ(c, 0, 0, 0.26, col, '#245c1c', 0.03); hoja(c, -0.05, -0.24, 0.2, -2.2, col2);
  ojos(c, 0.02, -0.06, 0.1, 0.06, 0.8, 0.2); c.restore();
}
function glow(c, r, col) { brillo(c, 0, -0.4, r, col); }

export const PL = {
  giras(c, t, e) { const sw = tallo(c, t, 0.42); c.save(); c.translate(sw, -0.6); const k = e.ataque > 0 ? 1.12 : 1 + sin(t * 3) * 0.02; c.scale(k, k); for (let i = 0; i < 12; i++) { c.save(); c.rotate(i / 12 * TAU + t * 0.2); elip(c, 0.27, 0, 0.12, 0.07, i % 2 ? '#ffcc1a' : '#ffb800'); c.restore(); } circ(c, 0, 0, 0.19, '#a0561c', '#6d3410', 0.02); ojos(c, 0, -0.03, 0.07, 0.045, 0, 0.4); sonrisa(c, 0, 0.03, 0.08); c.restore(); },
  dosol(c, t, e) { tallo(c, t, 0.4); [[-0.2, -0.55, 0.8], [0.2, -0.65, 0.95]].forEach(([x, y, s], j) => { c.save(); c.translate(x + sin(t * 2 + j) * 0.02, y); c.scale(s * 0.8, s * 0.8); for (let i = 0; i < 10; i++) { c.save(); c.rotate(i / 10 * TAU - t * 0.25); elip(c, 0.26, 0, 0.12, 0.07, '#ffc21a'); c.restore(); } circ(c, 0, 0, 0.18, '#96501a', '#6d3410', 0.02); ojos(c, 0, -0.03, 0.07, 0.045, 0, 0.4); sonrisa(c, 0, 0.03, 0.07); c.restore(); }); },
  luci(c, t, e) { glow(c, 0.5, 'rgba(255,240,150,.55)'); rect(c, -0.07, -0.3, 0.14, 0.3, '#e9dcc0', '#9c8e6c', 0.05); c.beginPath(); c.arc(0, -0.3, 0.26, PI, TAU); c.fillStyle = '#9a5bd6'; c.fill(); c.strokeStyle = '#5b2f93'; c.lineWidth = 0.025; c.stroke(); [[-0.12, -0.38], [0.1, -0.42], [0, -0.5]].forEach(([x, y], i) => circ(c, x, y, 0.045, `rgba(255,255,170,${0.7 + 0.3 * sin(t * 3 + i)})`)); ojos(c, 0, -0.18, 0.06, 0.04, 0, 0.3); },
  bonsai(c, t, e) { rect(c, -0.17, -0.12, 0.34, 0.14, '#a9622e', '#6b3a17', 0.04); lin(c, 0, -0.12, 0.04, -0.4, '#6b4223', 0.06); circ(c, -0.12, -0.5, 0.18, '#3f9d33'); circ(c, 0.14, -0.52, 0.17, '#4db43e'); circ(c, 0, -0.64, 0.19, '#58c448'); [[-0.1, -0.55], [0.12, -0.6], [0.0, -0.7]].forEach(([x, y], i) => { circ(c, x, y, 0.05, '#ffd23a', '#b8860b', 0.01); if (sin(t * 3 + i * 2) > 0.8) brillo(c, x, y, 0.12, 'rgba(255,255,255,.9)'); }); },
  dispa(c, t, e) { cabezaTiro(c, t, e, '#62c943', '#4aa931'); },
  bidispa(c, t, e) { const sw = tallo(c, t, 0.4); c.save(); c.translate(sw, -0.56); rect(c, 0.16, -0.2, 0.26, 0.14, '#4aa931', '#245c1c', 0.05); rect(c, 0.16, 0.02, 0.26, 0.14, '#4aa931', '#245c1c', 0.05); circ(c, 0, 0, 0.27, '#6fd94d', '#245c1c', 0.03); ojos(c, 0.02, -0.06, 0.1, 0.06, 0.8, 0.2, 1); hoja(c, -0.05, -0.25, 0.2, -2.2, '#4aa931'); c.restore(); },
  hielo(c, t, e) { cabezaTiro(c, t, e, '#9fe3ff', '#6ec6ea'); c.save(); c.translate(tallo(c, t, 0.4) * 0, -0.8); for (let i = -1; i <= 1; i++) poli(c, [[i * 0.1 - 0.05, 0], [i * 0.1, -0.14 - (i === 0 ? 0.05 : 0)], [i * 0.1 + 0.05, 0]], '#e9fbff', '#8fd4f0', 0.012); c.restore(); },
  arco(c, t, e) { const sw = tallo(c, t, 0.4); c.save(); c.translate(sw, -0.55); const r = e.ataque > 0 ? -0.9 : -0.4; lin(c, 0, 0.1, 0.25, r * 0.5 - 0.15, '#8a5a2b', 0.05); circ(c, 0.27, r * 0.5 - 0.18, 0.09, '#ffd1e8', '#d65a9d', 0.015); for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); elip(c, 0.2, 0, 0.1, 0.06, '#ff8fc7'); c.restore(); } circ(c, 0, 0, 0.17, '#ffe35c', '#c99a00', 0.02); ojos(c, 0, -0.02, 0.07, 0.045, 0.5, 0.2); c.restore(); },
  trip(c, t, e) { tallo(c, t, 0.35); [-0.32, 0, 0.32].forEach((y, i) => { c.save(); c.translate(sin(t * 2 + i) * 0.015, -0.55 + y * 0.55); rect(c, 0.1, -0.05, 0.2, 0.1, '#4aa931', '#245c1c', 0.04); circ(c, 0, 0, 0.16, '#6fd94d', '#245c1c', 0.02); ojos(c, 0.02, -0.03, 0.06, 0.04, 0.8, 0.2); c.restore(); }); },
  cacto(c, t, e) { const w = sin(t * 1.5) * 0.015; rect(c, -0.14 + w, -0.7, 0.28, 0.72, '#3fa65a', '#1f6b35', 0.14); rect(c, -0.3, -0.5, 0.14, 0.26, '#3fa65a', '#1f6b35', 0.06); rect(c, 0.16, -0.42, 0.14, 0.22, '#3fa65a', '#1f6b35', 0.06); for (let i = 0; i < 9; i++) { lin(c, -0.14 + (i % 3) * 0.14, -0.62 + Math.floor(i / 3) * 0.2, -0.22 + (i % 3) * 0.16, -0.66 + Math.floor(i / 3) * 0.2, '#fff', 0.02); } circ(c, 0, -0.76, 0.06, '#ff7ab8'); ojos(c, 0, -0.5, 0.06, 0.04, 0.5, 0.2); sonrisa(c, 0, -0.4, 0.05); if (e.ataque > 0) lin(c, 0.1, -0.6, 0.35, -0.66, '#fff', 0.03); },
  melon(c, t, e) { const sw = tallo(c, t, 0.35); c.save(); c.translate(sw, -0.5); lin(c, 0, 0.1, 0.1, -0.4, '#6d4a1f', 0.06); circ(c, 0.1, e.ataque > 0 ? -0.62 : -0.5, 0.1, '#e5395c', '#2f7d24', 0.02); elip(c, 0, 0, 0.3, 0.25, '#3a9a35', '#1d5c1a', 0, 0.03); for (let i = -2; i <= 2; i++) curva(c, i * 0.1, -0.22, i * 0.12, 0, i * 0.08, 0.22, '#256f22', 0.025); ojos(c, 0, -0.04, 0.11, 0.06, 0.5, 0.2, 1); sonrisa(c, 0, 0.06, 0.08, 1); c.restore(); },
  antorcha(c, t, e) { rect(c, -0.2, -0.35, 0.4, 0.38, '#8a5a2b', '#4d2f12', 0.08); elip(c, 0, -0.35, 0.2, 0.06, '#c58a47', '#4d2f12'); ojos(c, 0, -0.2, 0.08, 0.05, 0, 0.3); sonrisa(c, 0, -0.1, 0.06); for (let i = 0; i < 3; i++) { const h = 0.34 + 0.1 * sin(t * 9 + i * 2), w = 0.14 - i * 0.03; c.beginPath(); c.moveTo(-w, -0.36); c.quadraticCurveTo(-w * 1.2, -0.36 - h * 0.6, sin(t * 7 + i) * 0.04, -0.36 - h); c.quadraticCurveTo(w * 1.2, -0.36 - h * 0.6, w, -0.36); c.fillStyle = ['#ff5a1a', '#ff9c1a', '#ffe24a'][i]; c.fill(); } glow(c, 0.5, 'rgba(255,160,40,.35)'); },
  mante(c, t, e) { cabezaTiro(c, t, e, '#ffe15a', '#e6b800'); c.save(); c.translate(0, -0.84); elip(c, 0, 0.02, 0.12, 0.06, '#fff3a0', '#d9b400', 0, 0.012); rect(c, -0.07, -0.08, 0.14, 0.1, '#fff7b8', '#d9b400', 0.03); c.restore(); },
  estrella(c, t, e) { c.save(); c.translate(0, -0.42); c.rotate(sin(t * 1.5) * 0.08); const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.17 : 0.4, a = -PI / 2 + i * PI / 5; pts.push([cos(a) * r, sin(a) * r]); } poli(c, pts, '#ffd633', '#c99a00', 0.03); ojos(c, 0, -0.02, 0.07, 0.05, 0.3, 0.2); sonrisa(c, 0, 0.07, 0.06); c.restore(); },
  cereza(c, t, e) { const k = 1 + (e.fuse != null && e.fuse < 0.5 ? 0.15 : 0); curva(c, -0.12, -0.3, -0.1, -0.7, 0.05, -0.72, '#3a7d2a', 0.04); curva(c, 0.14, -0.3, 0.1, -0.7, 0.05, -0.72, '#3a7d2a', 0.04); hoja(c, 0.05, -0.72, 0.18, -0.4, '#4cb43a'); [[-0.14, 1], [0.15, -1]].forEach(([x, s]) => { c.save(); c.translate(x, -0.2); c.scale(k, k); circ(c, 0, 0, 0.2, '#d9143a', '#7d0b22', 0.025); circ(c, -0.07, -0.08, 0.04, 'rgba(255,255,255,.55)'); ojos(c, 0, -0.01, 0.07, 0.05, 0, 0.3, 1); c.restore(); }); },
  chile(c, t, e) { c.save(); c.rotate(sin(t * 4) * 0.03); c.beginPath(); c.moveTo(-0.16, -0.25); c.quadraticCurveTo(-0.22, -0.62, 0.04, -0.78); c.quadraticCurveTo(0.24, -0.5, 0.18, -0.2); c.quadraticCurveTo(0, 0.05, -0.16, -0.25); c.fillStyle = '#e8310f'; c.fill(); c.strokeStyle = '#8a1a06'; c.lineWidth = 0.03; c.stroke(); c.restore(); rect(c, -0.04, -0.86, 0.14, 0.1, '#2f8a2a', '#1d5c1a', 0.03); ojos(c, 0, -0.38, 0.06, 0.045, 0, 0.3, 1); for (let i = 0; i < 3; i++) { const h = 0.14 + 0.05 * sin(t * 12 + i); circ(c, -0.06 + i * 0.07, -0.92 - h, 0.045, '#ffb02a'); } },
  mina(c, t, e) { if (e.arma > 0) { elip(c, 0, -0.04, 0.22, 0.1, '#7a5330', '#4a2f17'); circ(c, 0, -0.1, 0.03, '#d9a050'); return; } elip(c, 0, -0.2, 0.22, 0.2, '#c9955a', '#7a5330', 0, 0.03); ojos(c, 0, -0.24, 0.08, 0.045, 0, 0.3, 1); circ(c, 0.14, -0.4, 0.04, sin(t * 8) > 0 ? '#ff3a1a' : '#7a1a0a'); lin(c, 0.14, -0.36, 0.1, -0.3, '#555', 0.02); },
  coco(c, t, e) { const k = e.fuse != null && e.fuse < 0.6 ? 1 + 0.1 * sin(t * 40) : 1; c.save(); c.scale(k, k); circ(c, 0, -0.3, 0.3, '#5a3a20', '#2c1b0d', 0.03); circ(c, -0.1, -0.4, 0.05, 'rgba(255,255,255,.25)'); ojos(c, 0, -0.32, 0.1, 0.06, 0, 0.3, 1); c.beginPath(); c.moveTo(-0.1, -0.16); c.lineTo(0.1, -0.16); c.lineWidth = 0.035; c.strokeStyle = '#fff'; c.stroke(); c.restore(); lin(c, 0, -0.6, 0.08, -0.72, '#aaa', 0.03); brillo(c, 0.08, -0.74, 0.1, 'rgba(255,200,60,.9)'); },
  nogal(c, t, e) { const f = e.hp != null ? e.hp : 1; c.save(); c.rotate(sin(t * 1.3) * 0.02); elip(c, 0, -0.36, 0.3, 0.38, '#b97b3d', '#6b3f17', 0, 0.035); curva(c, 0, -0.74, -0.05, -0.36, 0, 0.0, 'rgba(90,50,15,.5)', 0.02); ojos(c, 0, -0.42, 0.1, 0.065, 0, 0.4); sonrisa(c, 0, -0.28, 0.07); if (f < 0.66) lin(c, -0.2, -0.6, -0.08, -0.5, '#3d2209', 0.025); if (f < 0.33) { lin(c, 0.18, -0.5, 0.06, -0.3, '#3d2209', 0.03); lin(c, -0.12, -0.2, -0.2, -0.1, '#3d2209', 0.03); } c.restore(); },
  nogal2(c, t, e) { const f = e.hp != null ? e.hp : 1; elip(c, 0, -0.4, 0.36, 0.44, '#c98a45', '#7a4a1a', 0, 0.04); c.beginPath(); c.ellipse(0, -0.5, 0.34, 0.34, 0, PI, TAU); c.fillStyle = '#9aa5b3'; c.fill(); c.strokeStyle = '#5b6573'; c.lineWidth = 0.03; c.stroke(); rect(c, -0.04, -0.86, 0.08, 0.2, '#d95b2a', '#7a2a10', 0.03); ojos(c, 0, -0.42, 0.11, 0.07, 0, 0.4, 1); sonrisa(c, 0, -0.26, 0.08); if (f < 0.5) lin(c, 0.2, -0.45, 0.06, -0.25, '#3d2209', 0.03); },
  calaba(c, t) { elip(c, 0, -0.26, 0.38, 0.3, '#f08a24', '#a04a05', 0, 0.035); for (let i = -2; i <= 2; i++) curva(c, i * 0.14, -0.54, i * 0.2, -0.26, i * 0.14, 0.02, 'rgba(160,70,10,.7)', 0.025); rect(c, -0.04, -0.62, 0.08, 0.1, '#3a8a2a'); ojos(c, 0, -0.3, 0.12, 0.07, 0, 0.3, 1); sonrisa(c, 0, -0.18, 0.1); },
  pincho(c, t, e) { for (let i = 0; i < 5; i++) { const x = -0.34 + i * 0.17; poli(c, [[x - 0.08, -0.02], [x, -0.26 - (e.ataque > 0 ? 0.06 : 0)], [x + 0.08, -0.02]], '#b9c0c9', '#5f6873', 0.02); } rect(c, -0.4, -0.04, 0.8, 0.08, '#7a8490', '#4d5560', 0.03); },
  pinchorr(c, t, e) { for (let i = 0; i < 5; i++) { const x = -0.36 + i * 0.18; poli(c, [[x - 0.1, -0.02], [x, -0.36 - (e.ataque > 0 ? 0.06 : 0)], [x + 0.1, -0.02]], '#ffd24a', '#9a6a00', 0.025); } rect(c, -0.42, -0.04, 0.84, 0.1, '#c58a1a', '#7a5200', 0.03); poli(c, [[-0.1, -0.5], [-0.05, -0.62], [0, -0.52], [0.05, -0.62], [0.1, -0.5]], '#ffe15a', '#9a6a00', 0.02); },
  mordelon(c, t, e) { const m = e.mastica > 0, o = m ? 0.05 : 0.18 + 0.1 * sin(t * 3); tallo(c, t, 0.3, '#2f7d2a'); c.save(); c.translate(0, -0.45); c.beginPath(); c.arc(0, 0, 0.3, PI, TAU); c.fillStyle = '#c0245a'; c.fill(); c.strokeStyle = '#6d0d30'; c.lineWidth = 0.03; c.stroke(); c.beginPath(); c.arc(0, 0.0, 0.3, 0, PI); c.save(); c.translate(0, o); c.beginPath(); c.arc(0, 0, 0.3, 0, PI); c.fillStyle = '#d6396f'; c.fill(); c.stroke(); for (let i = -2; i <= 2; i++) poli(c, [[i * 0.1 - 0.04, 0], [i * 0.1, -0.1], [i * 0.1 + 0.04, 0]], '#fff'); c.restore(); for (let i = -2; i <= 2; i++) poli(c, [[i * 0.1 - 0.04, 0], [i * 0.1, 0.1 + o], [i * 0.1 + 0.04, 0]], '#fff'); ojos(c, 0, -0.14, 0.1, 0.05, 0, 0.3, 1); c.restore(); },
  enred(c, t, e) { for (let i = 0; i < 4; i++) { const x = -0.3 + i * 0.2; c.beginPath(); c.moveTo(x, 0); for (let k = 1; k <= 4; k++) c.lineTo(x + sin(t * 3 + i + k) * 0.08, -k * (e.preso ? 0.14 : 0.08)); c.lineWidth = 0.05; c.strokeStyle = '#2f8a3a'; c.lineCap = 'round'; c.stroke(); circ(c, x, -0.08 * 4 - (e.preso ? 0.24 : 0), 0.04, '#7a3a1a'); } },
  esporin(c, t, e) { rect(c, -0.06, -0.24, 0.12, 0.24, '#f1dfe6', '#a07a8a', 0.04); c.beginPath(); c.arc(0, -0.24, 0.2, PI, TAU); c.fillStyle = '#ff8fb3'; c.fill(); c.strokeStyle = '#b8456f'; c.lineWidth = 0.025; c.stroke(); circ(c, -0.08, -0.34, 0.03, '#fff'); circ(c, 0.08, -0.32, 0.03, '#fff'); ojos(c, 0, -0.14, 0.05, 0.035, 0.5, 0.2); if (e.ataque > 0) circ(c, 0.26, -0.18, 0.06, 'rgba(255,180,210,.8)'); },
  nieblon(c, t, e) { rect(c, -0.1, -0.3, 0.2, 0.3, '#d8dfe6', '#7d8794', 0.06); c.beginPath(); c.arc(0, -0.3, 0.3, PI, TAU); c.fillStyle = '#8aa6bd'; c.fill(); c.strokeStyle = '#4d667d'; c.lineWidth = 0.03; c.stroke(); ojos(c, 0, -0.15, 0.07, 0.045, 0.5, 0.2); for (let i = 0; i < 3; i++) circ(c, 0.28 + ((t * 0.4 + i * 0.3) % 0.9), -0.2 - i * 0.04, 0.05 + i * 0.015, `rgba(200,220,235,${0.5 - ((t * 0.4 + i * 0.3) % 0.9) * 0.5})`); },
  hipno(c, t, e) { rect(c, -0.07, -0.26, 0.14, 0.26, '#f1e6d6', '#9a8a6c', 0.04); c.beginPath(); c.arc(0, -0.26, 0.26, PI, TAU); c.fillStyle = '#e0a132'; c.fill(); c.strokeStyle = '#8a5a10'; c.lineWidth = 0.025; c.stroke(); c.save(); c.translate(0, -0.38); c.rotate(t * 2); c.beginPath(); for (let i = 0; i < 60; i++) { const a = i * 0.3, r = 0.002 + i * 0.0032; c.lineTo(cos(a) * r, sin(a) * r * 0.7); } c.lineWidth = 0.022; c.strokeStyle = '#6b3a9a'; c.stroke(); c.restore(); },
  dormi(c, t, e) { rect(c, -0.07, -0.24, 0.14, 0.24, '#d6d8f0', '#7a7ca8', 0.04); c.beginPath(); c.arc(0, -0.24, 0.25, PI, TAU); c.fillStyle = '#4a5bb8'; c.fill(); c.strokeStyle = '#26307a'; c.lineWidth = 0.025; c.stroke(); lin(c, -0.12, -0.12, -0.04, -0.12, '#222', 0.025); lin(c, 0.04, -0.12, 0.12, -0.12, '#222', 0.025); c.fillStyle = '#cfd6ff'; c.font = '0.16px sans-serif'; c.fillText('z', 0.16 + sin(t * 2) * 0.03, -0.45 - (t * 0.1 % 0.1)); c.fillText('Z', 0.26, -0.58 - (t * 0.1 % 0.1)); },
  escarba(c, t, e) { rect(c, -0.08, -0.22, 0.16, 0.22, '#e8d8be', '#8a7a58', 0.04); c.beginPath(); c.arc(0, -0.22, 0.24, PI, TAU); c.fillStyle = '#a77a4a'; c.fill(); c.strokeStyle = '#5a3d1d'; c.lineWidth = 0.025; c.stroke(); for (let i = -1; i <= 1; i++) poli(c, [[i * 0.08 - 0.03, -0.0], [i * 0.08, 0.1 + 0.05 * sin(t * 8 + i)], [i * 0.08 + 0.03, 0.0]], '#ddd'); ojos(c, 0, -0.12, 0.06, 0.04, 0, 0.3, 1); },
  faro(c, t, e) { glow(c, 0.7, 'rgba(255,235,140,.5)'); lin(c, 0, 0, 0, -0.5, '#4a4a55', 0.06); rect(c, -0.15, -0.8, 0.3, 0.3, '#ffe27a', '#8a6a10', 0.06); poli(c, [[-0.19, -0.8], [0, -0.92], [0.19, -0.8]], '#4a4a55'); ojos(c, 0, -0.66, 0.055, 0.04, 0, 0.3); },
  soplo(c, t, e) { tallo(c, t, 0.3); for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -0.5); c.rotate(i * TAU / 3 + t * 3); elip(c, 0.2, 0, 0.19, 0.11, '#4bc05a', '#237a31', 0, 0.02); c.restore(); } circ(c, 0, -0.5, 0.08, '#8be07a'); ojos(c, 0, -0.52, 0.04, 0.03, 0, 0.3); curva(c, 0.3, -0.5, 0.5, -0.6, 0.7, -0.5, 'rgba(255,255,255,.6)', 0.02); },
  iman(c, t, e) { c.save(); c.translate(0, -0.42); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 0.2, PI, TAU); c.lineWidth = 0.14; c.strokeStyle = '#d02d2d'; c.stroke(); lin(c, -0.2, 0, -0.2, 0.22, '#d02d2d', 0.14); lin(c, 0.2, 0, 0.2, 0.22, '#d02d2d', 0.14); rect(c, -0.27, 0.16, 0.14, 0.1, '#cfd6de', '#6d7782', 0.02); rect(c, 0.13, 0.16, 0.14, 0.1, '#cfd6de', '#6d7782', 0.02); ojos(c, 0, -0.04, 0.07, 0.05, 0, 0.3); if (e.ataque > 0) lin(c, -0.3, 0.3, -0.45, 0.45, '#ffe', 0.02); c.restore(); },
  ritmo(c, t, e) { const b = Math.abs(sin(t * 4)); c.save(); c.scale(1 + b * 0.04, 1 - b * 0.04); elip(c, 0, -0.3, 0.3, 0.26, '#d9a441', '#7a5518', 0, 0.03); elip(c, 0, -0.36, 0.3, 0.12, '#f5e7c0', '#7a5518', 0, 0.025); ojos(c, 0, -0.22, 0.09, 0.05, 0, 0.3); c.restore(); lin(c, -0.28, -0.62 + b * 0.1, -0.08, -0.4, '#a9622e', 0.04); lin(c, 0.28, -0.62 + (1 - b) * 0.1, 0.08, -0.4, '#a9622e', 0.04); },
  despierta(c, t, e) { elip(c, 0, -0.26, 0.2, 0.26, '#6b3f1d', '#3a2008', 0.2, 0.03); curva(c, -0.05, -0.46, 0.05, -0.28, -0.03, -0.08, '#3a2008', 0.03); ojos(c, 0, -0.3, 0.07, 0.045, 0, 0.3); for (let i = 0; i < 2; i++) curva(c, -0.05 + i * 0.1, -0.56, -0.12 + i * 0.1 + sin(t * 3 + i) * 0.05, -0.7, -0.05 + i * 0.1, -0.84, 'rgba(255,255,255,.55)', 0.03); },
  lirio(c, t) { elip(c, 0, -0.02, 0.4, 0.14, '#2f9a3a', '#1c6424', 0, 0.025); c.beginPath(); c.moveTo(0, -0.02); c.lineTo(0.38, -0.06); c.lineTo(0.32, 0.04); c.closePath(); c.fillStyle = '#4fc65a'; c.fill(); },
  alga(c, t, e) { for (let i = 0; i < 5; i++) { const x = -0.3 + i * 0.15; c.beginPath(); c.moveTo(x, 0); for (let k = 1; k <= 5; k++) c.lineTo(x + sin(t * 2.6 + i * 1.3 + k * 0.7) * 0.07 * k * 0.5, -k * 0.1 - (e.mastica > 0 ? 0 : 0.07 * k * 0.3)); c.lineWidth = 0.06; c.strokeStyle = '#1e6e4a'; c.lineCap = 'round'; c.stroke(); } circ(c, 0, -0.3, 0.07, '#e9f5d0'); ojos(c, 0, -0.32, 0.04, 0.03, 0, 0.3, 1); },
  maceta(c) { poli(c, [[-0.26, -0.28], [0.26, -0.28], [0.2, 0], [-0.2, 0]], '#c9693a', '#7a3a17', 0.03); rect(c, -0.3, -0.36, 0.6, 0.1, '#da7a47', '#7a3a17', 0.03); },
  col(c, t, e) { const sw = tallo(c, t, 0.3); c.save(); c.translate(sw, -0.46); lin(c, 0, 0.1, 0.12, -0.34, '#6d4a1f', 0.05); circ(c, 0.12, e.ataque > 0 ? -0.55 : -0.42, 0.09, '#7fd05a', '#2f7d24', 0.02); circ(c, 0, 0, 0.26, '#86d65e', '#2f7d24', 0.03); curva(c, -0.22, -0.05, 0, -0.2, 0.22, -0.05, '#4aa931', 0.025); curva(c, -0.2, 0.08, 0, -0.06, 0.2, 0.08, '#4aa931', 0.025); ojos(c, 0, 0.0, 0.09, 0.055, 0.4, 0.2, 1); c.restore(); },
};

/* --- planta: llamada principal --- */
const PREV = { sombra: 'rgba(0,0,0,.22)' };
export function dibujarPlanta(c, id, x, y, u, t, e) {
  e = e || {}; c.save(); c.translate(x, y); c.scale(u, u);
  if (A.sombras !== false && id !== 'lirio' && id !== 'maceta' && id !== 'pincho' && id !== 'pinchorr') elip(c, 0, 0.02, 0.28, 0.07, PREV.sombra);
  if (e.dorm) c.globalAlpha = 0.8;
  const f = PL[id]; if (f) f(c, t + (e.ph || 0), e);
  if (e.dorm) { c.globalAlpha = 1; c.fillStyle = '#e0e8ff'; c.font = 'bold 0.2px sans-serif'; c.fillText('z', 0.2, -0.7 - (t % 1) * 0.1); }
  if (e.flash) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25; elip(c, 0, -0.4, 0.4, 0.5, '#fff'); }
  if (A.dalt) insignia(c, id);
  c.restore();
}
const ROLES = { Productora: 0, Lanzadora: 1, 'Lanzadora en arco': 1, Explosiva: 2, Muro: 3, Trampa: 4, 'Área': 5, Apoyo: 6, Agua: 7, Tejado: 7, Mejora: 6 };
export function insignia(c, id, x, y, r) { // simbolo de rol para daltonismo (forma distinta por rol)
  const k = ROLES[P[id].rol]; c.save(); if (x != null) { c.translate(x, y); c.scale(r || 0.12, r || 0.12); } else { c.translate(-0.3, 0.02); c.scale(0.1, 0.1); }
  c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 0.25; c.beginPath();
  if (k === 0) c.arc(0, 0, 1, 0, TAU); else if (k === 1) { c.moveTo(-1, -1); c.lineTo(1, 0); c.lineTo(-1, 1); c.closePath(); } else if (k === 2) { for (let i = 0; i < 10; i++) { const r2 = i % 2 ? 0.5 : 1.1, a = i * PI / 5; c.lineTo(cos(a) * r2, sin(a) * r2); } c.closePath(); } else if (k === 3) c.rect(-1, -1, 2, 2); else if (k === 4) { c.moveTo(0, -1.1); c.lineTo(1.1, 1); c.lineTo(-1.1, 1); c.closePath(); } else if (k === 5) { c.moveTo(0, -1.2); c.lineTo(1.2, 0); c.lineTo(0, 1.2); c.lineTo(-1.2, 0); c.closePath(); } else if (k === 6) { c.rect(-1.2, -0.35, 2.4, 0.7); c.rect(-0.35, -1.2, 0.7, 2.4); } else c.arc(0, 0, 1, 0, PI);
  c.fill(); c.stroke(); c.restore();
}
export function dibujarEscudo(c, x, y, u, t, hp) {
  c.save(); c.translate(x, y); c.scale(u, u); elip(c, 0, -0.22, 0.44, 0.3, 'rgba(240,120,30,.22)', '#c55a10', 0, 0.06); elip(c, 0, -0.22, 0.44, 0.3, null, '#ffa23a', 0, 0.02);
  for (let i = -2; i <= 2; i++) curva(c, i * 0.17, -0.47, i * 0.26, -0.22, i * 0.17, 0.03, 'rgba(160,70,10,.7)', 0.025);
  if (hp < 0.5) lin(c, 0.1, -0.4, 0.22, -0.2, '#5a2a05', 0.03);
  c.restore();
}
export function dibujarBase(c, id, x, y, u, t) { c.save(); c.translate(x, y); c.scale(u, u); if (id === 'lirio') { PL.lirio(c, t, {}); } else PL.maceta(c); c.restore(); }

/* ---------- zombis ---------- */
const V = {
  paseante: { piel: '#9fc98a', cam: '#6d7fb0', pan: '#575a6e' },
  baliza: { piel: '#9fc98a', cam: '#7a6fb0', pan: '#575a6e', acc: 'cono' },
  cubero: { piel: '#a2c78c', cam: '#6d8a6d', pan: '#555', acc: 'cubo' },
  reja: { piel: '#9fc98a', cam: '#9a7a5a', pan: '#4d4d5e', acc: 'reja' },
  corredor: { piel: '#a8d08c', cam: '#e8a03a', pan: '#2a3a7a', acc: 'banda', corre: 1 },
  pertiguista: { piel: '#a8d08c', cam: '#e8e8e8', pan: '#2a6a9a', acc: 'pertiga', corre: 1 },
  vallista: { piel: '#a0c88a', cam: '#e84a4a', pan: '#2a2a2a', acc: 'banda', corre: 1 },
  rumbero: { piel: '#a9c99a', cam: '#e8449a', pan: '#4a2a7a', acc: 'afro', esc: 1.05 },
  coro: { piel: '#a9c99a', cam: '#c8449a', pan: '#4a2a7a', acc: 'afro2' },
  topo: { piel: '#b0a07a', cam: '#c9a03a', pan: '#6a5a3a', acc: 'minero' },
  globero: { piel: '#a2c78c', cam: '#cf4a6a', pan: '#575a6e', acc: 'globo' },
  coloso: { piel: '#86b87a', cam: '#5a4a8a', pan: '#3a3a4a', esc: 1.65 },
  honda: { piel: '#9fc98a', cam: '#8a5a2a', pan: '#444', acc: 'honda' },
  nadador: { piel: '#7fc9b0', cam: '#2a8aa8', pan: '#1a5a78', acc: 'gafas' },
  flotador: { piel: '#9fc98a', cam: '#e8d84a', pan: '#2a7a9a', acc: 'aro' },
  pulidora: { piel: '#9fc98a', cam: '#aacbe8', pan: '#444', acc: 'pulidora' },
  lector: { piel: '#a2c78c', cam: '#7a7a8a', pan: '#444', acc: 'diario' },
  perrillo: { piel: '#c9a070', cam: '#9a7a4a', pan: '#6a4a2a', acc: 'perro' },
  gargola: { piel: '#9aa0aa', cam: '#808690', pan: '#606670', acc: 'alas' },
  paracaidas: { piel: '#9fc98a', cam: '#e86a2a', pan: '#444', acc: 'paracaidas' },
  armadura: { piel: '#9fc98a', cam: '#aab4c0', pan: '#7a8490', acc: 'armadura', esc: 1.15 },
  espectro: { piel: '#cfe6ee', cam: '#b8d4e0', pan: '#9ab8c8', acc: 'espectro' },
  yeti: { piel: '#f2f6fa', cam: '#e0e8f0', pan: '#d0dae6', acc: 'yeti', esc: 1.25 },
  tambor: { piel: '#a2c78c', cam: '#d9a441', pan: '#444', acc: 'tambor' },
  pocero: { piel: '#a2c78c', cam: '#6a8a4a', pan: '#444', acc: 'barril' },
  escalero: { piel: '#a2c78c', cam: '#8a6a3a', pan: '#444', acc: 'escalera' },
  enano: { piel: '#a8d08c', cam: '#6a8ae8', pan: '#444', esc: 0.62 },
  capataz: { piel: '#7fb072', cam: '#d9822a', pan: '#3a3a4a', acc: 'cascoG', esc: 1.8 },
  moho: { piel: '#7fb072', cam: '#8a4a9a', pan: '#444', acc: 'moho', esc: 1 },
};
function miembro(c, x1, y1, x2, y2, col, lw) { lin(c, x1, y1, x2, y2, col, lw); }
function humano(c, t, z, v, st) {
  const dir = z.dir || -1, caminando = st.anda, ph = t * (v.corre ? 7 : 4.2) + z.id;
  const b = caminando ? sin(ph) : 0, bob = caminando ? Math.abs(sin(ph)) * 0.025 : sin(t * 2) * 0.01;
  c.save(); c.scale(-dir, 1); // se dibuja mirando a la izquierda (dir=-1)
  // piernas
  miembro(c, -0.05, -0.4, -0.08 + b * 0.18, 0, v.pan, 0.11); miembro(c, 0.06, -0.4, 0.08 - b * 0.18, 0, v.pan, 0.11); elip(c, -0.1 + b * 0.18, 0.0, 0.07, 0.035, '#222'); elip(c, 0.1 - b * 0.18, 0.0, 0.07, 0.035, '#222');
  c.translate(0, -bob);
  // brazo trasero
  const ar = st.come ? sin(t * 9) * 0.1 : 0;
  miembro(c, 0.04, -0.7, -0.22 + ar, -0.62 + (st.come ? 0 : 0.08), v.piel, 0.07);
  // torso
  rect(c, -0.15, -0.78, 0.3, 0.4, v.cam, 'rgba(0,0,0,.35)', 0.07);
  if (z.hp < z.hpMax * 0.5 && !st.sinDano) { /* sin brazo delantero */ } 
  // cabeza
  c.save(); c.translate(-0.02, -0.92); c.rotate(sin(t * 3 + z.id) * 0.04 - (st.come ? 0.1 : 0));
  circ(c, 0, 0, 0.17, v.piel, 'rgba(0,0,0,.4)', 0.02); circ(c, -0.07, -0.02, 0.045, '#fff', '#222', 0.01); circ(c, 0.05, -0.02, 0.04, '#fff', '#222', 0.01); circ(c, -0.08, -0.02, 0.018, '#111'); circ(c, 0.04, -0.02, 0.016, '#111');
  if (st.rabia) { lin(c, -0.13, -0.09, -0.02, -0.05, '#400', 0.025); }
  c.beginPath(); c.moveTo(-0.08, 0.07); c.lineTo(0.06, 0.07 + (st.come ? 0.03 * sin(t * 9) : 0)); c.lineWidth = 0.02; c.strokeStyle = '#3a2418'; c.stroke();
  if (z.hp > z.hpMax * 0.25) { rect(c, -0.06, 0.06, 0.03, 0.03, '#fff'); }
  accCabeza(c, t, z, v, st);
  c.restore();
  // brazo delantero
  if (z.hp > z.hpMax * 0.5 || st.sinDano) miembro(c, 0.02, -0.72, -0.3 - ar, -0.64 + (st.come ? 0 : 0.1), v.piel, 0.08); else lin(c, 0.02, -0.72, -0.1, -0.55, v.piel, 0.06);
  accCuerpo(c, t, z, v, st);
  c.restore();
}
function accCabeza(c, t, z, v, st) {
  const a = z.arm; const k = v.acc;
  if (k === 'cono' && a) poli(c, [[-0.13, -0.1], [0, -0.42], [0.13, -0.1]], '#ff8a1a', '#a04a00', 0.02), rect(c, -0.12, -0.2, 0.24, 0.05, '#fff'), pat(c, -0.12, -0.38, 0.24, 0.3, a);
  else if (k === 'cubo' && a) { poli(c, [[-0.17, -0.1], [0.17, -0.1], [0.14, -0.38], [-0.14, -0.38]], '#aab4bf', '#5f6873', 0.02); rect(c, -0.19, -0.12, 0.38, 0.05, '#c8d0d9'); pat(c, -0.17, -0.38, 0.34, 0.28, a); }
  else if (k === 'cascoG' && a) { c.beginPath(); c.arc(0, -0.02, 0.2, PI, TAU); c.fillStyle = '#f0b41a'; c.fill(); c.strokeStyle = '#8a6000'; c.lineWidth = 0.03; c.stroke(); rect(c, -0.22, -0.04, 0.44, 0.05, '#d99a00'); pat(c, -0.2, -0.22, 0.4, 0.2, a); }
  else if (k === 'banda') { rect(c, -0.17, -0.11, 0.34, 0.05, '#fff'); }
  else if (k === 'afro' || k === 'afro2') { circ(c, -0.02, -0.17, k === 'afro' ? 0.22 : 0.17, k === 'afro' ? '#7a2a9a' : '#d94a9a'); circ(c, -0.02, -0.02, 0.17, v.piel, 'rgba(0,0,0,.3)', 0.015); circ(c, -0.07, -0.02, 0.04, '#fff', '#222', 0.01); circ(c, 0.05, -0.02, 0.04, '#fff', '#222', 0.01); }
  else if (k === 'minero') { c.beginPath(); c.arc(0, -0.04, 0.18, PI, TAU); c.fillStyle = '#e8c23a'; c.fill(); brillo(c, -0.15, -0.1, 0.15, 'rgba(255,255,150,.7)'); }
  else if (k === 'gafas') { circ(c, -0.07, -0.02, 0.07, 'rgba(120,220,255,.8)', '#fff', 0.02); circ(c, 0.05, -0.02, 0.07, 'rgba(120,220,255,.8)', '#fff', 0.02); }
  else if (k === 'globo') { lin(c, 0, -0.1, 0.05, -0.5, '#ddd', 0.012); if (z.vuelo) { elip(c, 0.05, -0.78, 0.2, 0.26, '#ff4a6a', '#8a1a30', 0, 0.02); poli(c, [[0.0, -0.52], [0.1, -0.52], [0.05, -0.47]], '#ff4a6a'); circ(c, -0.02, -0.86, 0.05, 'rgba(255,255,255,.5)'); } }
  else if (k === 'espectro') { c.beginPath(); c.arc(0, -0.05, 0.18, PI, TAU); c.fillStyle = 'rgba(210,235,245,.6)'; c.fill(); }
  else if (k === 'yeti') { circ(c, -0.12, 0.02, 0.07, '#fff'); circ(c, 0.1, 0.02, 0.07, '#fff'); circ(c, 0, -0.14, 0.12, '#fff'); circ(c, -0.07, -0.02, 0.03, '#111'); circ(c, 0.05, -0.02, 0.03, '#111'); }
  else if (k === 'diario') { }
  else if (k === 'tambor' && a) { }
  else if (k === 'armadura' && a) { c.beginPath(); c.arc(0, -0.02, 0.2, PI, TAU); c.fillStyle = '#b8c2cc'; c.fill(); c.strokeStyle = '#5f6873'; c.lineWidth = 0.03; c.stroke(); rect(c, -0.19, -0.04, 0.38, 0.1, '#9aa5b0', '#5f6873', 0.02); pat(c, -0.2, -0.22, 0.4, 0.3, a); }
  else if (k === 'perro') { }
  if (z.fase && false) { }
}
function pat(c, x, y, w, h, a) { if (!A.dalt || !a) return; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.02; for (let i = -6; i < 8; i++) { c.beginPath(); c.moveTo(x + i * 0.06, y + h); c.lineTo(x + i * 0.06 + h, y); c.stroke(); } c.restore(); }
function accCuerpo(c, t, z, v, st) {
  const a = z.arm, k = v.acc;
  if (k === 'reja' && a) { rect(c, -0.5, -0.9, 0.3, 0.9, 'rgba(180,190,200,.5)', '#6d7782', 0.02); for (let i = 0; i < 6; i++) lin(c, -0.48, -0.86 + i * 0.15, -0.22, -0.86 + i * 0.15, '#6d7782', 0.012); for (let i = 0; i < 3; i++) lin(c, -0.42 + i * 0.09, -0.88, -0.42 + i * 0.09, -0.02, '#6d7782', 0.012); pat(c, -0.5, -0.9, 0.3, 0.9, a); }
  else if (k === 'pertiga') { lin(c, 0.3, 0.0, -0.45, -1.0, '#c9a050', 0.04); }
  else if (k === 'diario') { if (a) { rect(c, -0.5, -0.78, 0.26, 0.3, '#f1ead2', '#7a7360', 0.01); for (let i = 0; i < 4; i++) lin(c, -0.47, -0.72 + i * 0.06, -0.27, -0.72 + i * 0.06, '#999', 0.01); } }
  else if (k === 'aro') { if (a) { elip(c, 0, -0.38, 0.28, 0.1, 'rgba(255,90,90,.9)', '#8a1a1a', 0, 0.03); elip(c, 0, -0.38, 0.28, 0.1, null, '#fff', 0, 0.015); } }
  else if (k === 'tambor') { if (a) { elip(c, -0.02, -0.5, 0.22, 0.2, '#d9a441', '#7a5518', 0, 0.03); elip(c, -0.02, -0.55, 0.22, 0.1, '#f5e7c0', '#7a5518', 0, 0.02); } lin(c, -0.4, -0.85 + Math.abs(sin(t * 5)) * 0.1, -0.15, -0.6, '#a9622e', 0.03); }
  else if (k === 'barril') { rect(c, -0.22, -0.55, 0.44, 0.35, '#8a5a2b', '#4d2f12', 0.06); lin(c, -0.22, -0.45, 0.22, -0.45, '#4d2f12', 0.025); lin(c, -0.22, -0.3, 0.22, -0.3, '#4d2f12', 0.025); }
  else if (k === 'escalera') { if (a) { lin(c, 0.3, 0.0, 0.1, -1.0, '#c9a050', 0.04); lin(c, 0.4, 0.0, 0.2, -1.0, '#c9a050', 0.04); for (let i = 0; i < 6; i++) lin(c, 0.31 - i * 0.03, -0.1 - i * 0.16, 0.41 - i * 0.03, -0.1 - i * 0.16, '#a9803a', 0.03); } }
  else if (k === 'armadura' && a) { rect(c, -0.17, -0.78, 0.34, 0.42, '#b8c2cc', '#5f6873', 0.06); lin(c, 0, -0.78, 0, -0.36, '#7a8490', 0.025); pat(c, -0.17, -0.78, 0.34, 0.42, a); }
  else if (k === 'yeti') { circ(c, 0, -0.55, 0.22, '#f4f8fb'); for (let i = 0; i < 5; i++) lin(c, -0.18 + i * 0.09, -0.4, -0.2 + i * 0.09, -0.32, '#cfd9e3', 0.03); }
}
function chapa(c, t, z, st, alfa) { /* auxiliar */ }

export function dibujarZombi(c, z, x, y, u, t, st) {
  st = st || {}; const d = Z[z.tipo], v = V[z.tipo] || V.paseante;
  c.save(); c.translate(x, y); c.scale(u, u);
  let esc = v.esc || 1;
  // sombra
  if (!z.bajo) elip(c, 0, 0.03, 0.3 * esc, 0.07, 'rgba(0,0,0,.25)');
  // muerte
  if (z.estado === 'muere') { const k = Math.min(1, z.tm / 1.0); c.globalAlpha = 1 - k * k; c.rotate(-0.5 * Math.min(1, k * 3) * (z.dir || -1) * -1); c.translate(0, k * 0.15); }
  if (z.cayendo) { const k = Math.max(0, z.cae / 2.2); c.translate(0, -k * 3.2); }
  if (z.fase) c.globalAlpha *= 0.4; else if (z.tipo === 'espectro') c.globalAlpha *= 0.75;
  if (z.cong > 0) { c.filter = 'none'; }
  c.scale(esc, esc);
  const estado = { anda: z.estado === 'anda' || z.estado === 'salta', come: z.estado === 'come', rabia: z.rabia, sinDano: false };
  if (z.salto) { const k = z.salto.t / z.salto.T; c.translate(0, -sin(k * PI) * 0.55); }
  if (z.bajo) { // montículo
    elip(c, 0, -0.04, 0.26, 0.1, '#7a5a35', '#4d3a1f'); for (let i = 0; i < 4; i++) circ(c, -0.15 + i * 0.1 + sin(t * 10 + i) * 0.02, -0.12 - Math.abs(sin(t * 8 + i)) * 0.06, 0.03, '#8a6a40'); c.restore(); return;
  }
  if (z.sumergido) { elip(c, 0, -0.02, 0.3, 0.1, 'rgba(60,170,220,.65)'); circ(c, -0.02, -0.14, 0.12, '#7fc9b0', '#235', 0.02); circ(c, -0.07, -0.16, 0.05, 'rgba(120,220,255,.9)', '#fff', 0.015); circ(c, 0.04, -0.16, 0.05, 'rgba(120,220,255,.9)', '#fff', 0.015); c.restore(); return; }
  const k = v.acc;
  if (z.tipo === 'perrillo') perro(c, t, z, v, estado);
  else if (z.tipo === 'pulidora') pulidora(c, t, z, v);
  else if (z.tipo === 'honda') honda(c, t, z, v, estado);
  else if (z.tipo === 'moho') moho(c, t, z);
  else { if (z.tipo === 'gargola') alas(c, t); if (k === 'paracaidas' && z.cayendo) paraca(c); humano(c, t, z, v, estado); if (k === 'globo' && !z.vuelo) { } }
  if (z.hip) { circ(c, 0, -0.5, 0.45, 'rgba(255,90,220,.15)', '#ff5adc', 0.03); }
  if (z.cong > 0) { c.globalCompositeOperation = 'source-over'; rect(c, -0.3, -1.05, 0.6, 1.08, 'rgba(160,225,255,.45)', '#d9f5ff', 0.1); }
  else if (z.lento > 0) { elip(c, 0, -0.5, 0.3, 0.55, 'rgba(120,190,255,.2)'); }
  if (z.dorm > 0) { c.fillStyle = '#dfe6ff'; c.font = 'bold 0.2px sans-serif'; c.fillText('Z', 0.1, -1.1 - (t % 1) * 0.1); }
  if (z.atur > 0) { elip(c, 0, -0.3, 0.3, 0.2, 'rgba(255,225,90,.5)'); }
  if (z.flash > 0) { c.globalAlpha = 0.5; c.globalCompositeOperation = 'lighter'; elip(c, 0, -0.5, 0.3, 0.55, '#fff'); }
  c.restore();
}
function perro(c, t, z, v, st) { const b = sin(t * 12 + z.id) * 0.05; c.scale(-(z.dir || -1), 1); elip(c, 0, -0.22 + b, 0.28, 0.14, v.cam, '#4a3015'); circ(c, -0.28, -0.3 + b, 0.12, v.piel, '#4a3015', 0.02); poli(c, [[-0.34, -0.38 + b], [-0.38, -0.5 + b], [-0.28, -0.4 + b]], '#7a5a2a'); circ(c, -0.31, -0.32 + b, 0.025, '#111'); for (let i = 0; i < 4; i++) lin(c, -0.15 + i * 0.1, -0.12, -0.15 + i * 0.1 + sin(t * 12 + i * 1.6) * 0.1, 0, '#6a4a2a', 0.05); lin(c, 0.26, -0.26 + b, 0.38, -0.36 + sin(t * 10) * 0.05, '#6a4a2a', 0.04); if (z.hp < z.hpMax * 0.5) lin(c, -0.2, -0.3, -0.1, -0.2, '#900', 0.02); }
function pulidora(c, t, z, v) { rect(c, -0.5, -0.45, 1.0, 0.4, '#aacbe8', '#4d6a85', 0.1); rect(c, -0.45, -0.18, 0.9, 0.14, '#6d8aa5', '#3d5570', 0.05); poli(c, [[-0.5, -0.45], [-0.62, -0.28], [-0.5, -0.1]], '#d9ecfa'); for (let i = 0; i < 3; i++) circ(c, -0.3 + i * 0.3, -0.04, 0.08, '#333', '#999', 0.02); circ(c, 0.1, -0.68, 0.15, v.piel, '#355', 0.02); rect(c, 0.0, -0.58, 0.2, 0.16, '#e8e8e8'); circ(c, 0.05, -0.7, 0.025, '#111'); for (let i = 0; i < 3; i++) circ(c, 0.55 + i * 0.12, -0.15 - i * 0.04, 0.04, `rgba(220,245,255,${0.7 - i * 0.2})`); }
function honda(c, t, z, v, st) { rect(c, -0.4, -0.35, 0.8, 0.14, '#6a4a2a', '#3a2610', 0.04); circ(c, -0.25, -0.12, 0.13, '#444', '#999', 0.03); circ(c, 0.25, -0.12, 0.13, '#444', '#999', 0.03); const a = z.estado === 'apunta' ? -0.6 + sin(t * 3) * 0.1 : -0.2; c.save(); c.translate(0.1, -0.35); c.rotate(a); lin(c, 0, 0, -0.55, -0.35, '#8a5a2b', 0.06); circ(c, -0.58, -0.38, 0.1, '#7a7a7a', '#444', 0.02); c.restore(); circ(c, 0.25, -0.5, 0.15, v.piel, '#355', 0.02); circ(c, 0.2, -0.52, 0.03, '#111'); rect(c, 0.12, -0.66, 0.26, 0.08, '#8a5a2a'); }
function alas(c, t) { const a = sin(t * 5) * 0.2; poli(c, [[0.05, -0.8], [0.5, -1.0 + a], [0.35, -0.6]], '#7d848e', '#4a5058', 0.02); poli(c, [[-0.05, -0.8], [-0.5, -1.0 + a], [-0.35, -0.6]], '#7d848e', '#4a5058', 0.02); }
function paraca(c) { c.beginPath(); c.arc(0, -1.55, 0.5, PI, TAU); c.fillStyle = '#ff6a3a'; c.fill(); c.strokeStyle = '#8a2a0a'; c.lineWidth = 0.03; c.stroke(); lin(c, -0.5, -1.55, -0.05, -1.0, '#eee', 0.012); lin(c, 0.5, -1.55, 0.05, -1.0, '#eee', 0.012); }
function moho(c, t, z) {
  const a = z.ataque > 0 ? 0.08 : 0; c.translate(0, -sin(t * 1.5) * 0.03);
  rect(c, -0.7, -1.5, 1.4, 1.6, '#5a5f78', '#2d3047', 0.15); rect(c, -0.55, -1.4, 1.1, 0.7, '#7a8099', '#2d3047', 0.1);
  circ(c, 0, -1.9, 0.38, '#9fc98a', '#2d3047', 0.04); rect(c, -0.38, -2.1, 0.76, 0.18, '#3a3f58'); ojos(c, 0, -1.9, 0.14, 0.09, -0.6, 0.3, 1); c.beginPath(); c.arc(0, -1.76, 0.14, 0.1 * PI, 0.9 * PI); c.lineWidth = 0.04; c.strokeStyle = '#300'; c.stroke();
  rect(c, -0.16, -1.2, 0.32, 0.3, '#e86a2a', '#7a2a0a', 0.06); for (let i = 0; i < 3; i++) circ(c, -0.35 + i * 0.35, -0.95, 0.07, sin(t * 4 + i) > 0 ? '#ff4a3a' : '#5a1a1a');
  lin(c, -0.7, -1.2, -1.05, -0.7 + a * 5, '#4a4f68', 0.2); circ(c, -1.1, -0.65, 0.2, '#e8c23a', '#7a5a00', 0.03); lin(c, 0.7, -1.2, 1.0, -0.8, '#4a4f68', 0.2);
  rect(c, -0.55, 0.0, 0.35, 0.3, '#3a3f58'); rect(c, 0.2, 0.0, 0.35, 0.3, '#3a3f58');
  for (let i = 0; i < 4; i++) circ(c, -0.3 + i * 0.2, -1.62 - ((t * 0.6 + i * 0.3) % 0.8) * 0.5, 0.05, 'rgba(200,200,210,.5)');
}

/* ---------- objetos sueltos ---------- */
export function dibujarSol(c, x, y, r, t, val) {
  c.save(); c.translate(x, y); brillo(c, 0, 0, r * 1.7, 'rgba(255,230,90,.55)'); c.rotate(t * 0.8);
  for (let i = 0; i < 10; i++) { c.save(); c.rotate(i / 10 * TAU); poli(c, [[r * 0.8, -r * 0.14], [r * 1.35, 0], [r * 0.8, r * 0.14]], '#ffd21a'); c.restore(); }
  circ(c, 0, 0, r * 0.82, '#ffe14a', '#e0a800', r * 0.08); circ(c, -r * 0.25, -r * 0.25, r * 0.22, 'rgba(255,255,255,.55)');
  if (A.dalt) { c.rotate(-t * 0.8); c.fillStyle = '#7a4a00'; c.font = `bold ${r * 0.7}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(val || 25, 0, r * 0.05); }
  c.restore();
}
export function dibujarMoneda(c, x, y, r, t, val) { c.save(); c.translate(x, y); const w = Math.abs(cos(t * 3)); c.scale(0.25 + w * 0.75, 1); circ(c, 0, 0, r, val >= 50 ? '#e8e8f2' : '#ffcf3a', val >= 50 ? '#7a7a99' : '#a77a00', r * 0.12); c.scale(1, 1); c.fillStyle = val >= 50 ? '#7a7a99' : '#a77a00'; c.font = `bold ${r}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, r * 0.05); c.restore(); }
export function dibujarProy(c, q, x, y, u, t) {
  c.save(); c.translate(x, y); c.scale(u, u);
  if (q.arco) { const k = q.t / q.T, h = sin(k * PI) * 0.9; c.translate(0, -h - 0.4); const col = q.id2 === 'melon' ? '#3a9a35' : q.id2 === 'mante' ? '#fff3a0' : q.id2 === 'col' ? '#7fd05a' : '#ff8fc7'; circ(c, 0, 0, q.id2 === 'melon' ? 0.17 : 0.1, col, '#222', 0.015); if (q.id2 === 'melon') { curva(c, -0.1, -0.1, 0, 0, 0.1, -0.1, '#256f22', 0.02); } }
  else if (q.nube) { circ(c, 0, 0, 0.13 + 0.03 * sin(t * 12), 'rgba(205,225,240,.7)'); }
  else if (q.fuego) { circ(c, 0, 0, 0.1, '#ff7a1a'); circ(c, -0.06, 0.02, 0.07, '#ffd23a'); circ(c, 0, 0, 0.04, '#fff'); }
  else if (q.ef === 'hielo') { circ(c, 0, 0, 0.1, '#bff0ff', '#3aa8d8', 0.02); poli(c, [[0, -0.14], [0.04, 0], [0, 0.14], [-0.04, 0]], '#fff'); }
  else circ(c, 0, 0, 0.09, q.alto ? '#f2f2e6' : '#7fe05a', q.alto ? '#999' : '#2a7a1a', 0.02);
  c.restore();
}
export function dibujarCortadora(c, x, y, u, t, tipo, activa) {
  c.save(); c.translate(x, y); c.scale(u, u); const col = tipo === 'fuego' ? '#ff5a1a' : tipo === 'hielo' ? '#6ac8f0' : tipo === 'turbo' ? '#f0c020' : '#d03a3a';
  rect(c, -0.25, -0.34, 0.5, 0.26, col, '#222', 0.06); rect(c, -0.2, -0.42, 0.2, 0.1, '#444', '#222', 0.03); lin(c, 0.2, -0.3, 0.34, -0.5, '#555', 0.04); circ(c, -0.12, -0.05, 0.07, '#333', '#999', 0.02); circ(c, 0.14, -0.05, 0.07, '#333', '#999', 0.02);
  if (activa) { c.save(); c.translate(-0.28, -0.14); c.rotate(t * 25); lin(c, -0.1, 0, 0.1, 0, '#ddd', 0.03); c.restore(); }
  c.restore();
}
export function dibujarTumba(c, x, y, u, rotas) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.moveTo(-0.22, 0); c.lineTo(-0.22, -0.4); c.arc(0, -0.4, 0.22, PI, TAU); c.lineTo(0.22, 0); c.closePath(); c.fillStyle = '#8d93a3'; c.fill(); c.strokeStyle = '#4d5363'; c.lineWidth = 0.03; c.stroke(); c.fillStyle = '#4d5363'; c.font = 'bold 0.16px sans-serif'; c.textAlign = 'center'; c.fillText('R.I.P', 0, -0.3); for (let i = 0; i < 3 - rotas; i++) { } if (rotas < 3) lin(c, -0.1, -0.5, 0.0, -0.3, '#4d5363', 0.02); c.restore(); }
export function dibujarJarro(c, x, y, u, k, t) { c.save(); c.translate(x, y); c.scale(u, u); c.beginPath(); c.moveTo(-0.18, -0.55); c.quadraticCurveTo(-0.34, -0.3, -0.22, -0.02); c.lineTo(0.22, -0.02); c.quadraticCurveTo(0.34, -0.3, 0.18, -0.55); c.closePath(); c.fillStyle = '#c9783a'; c.fill(); c.strokeStyle = '#6b3a14'; c.lineWidth = 0.03; c.stroke(); rect(c, -0.2, -0.64, 0.4, 0.1, '#da8a47', '#6b3a14', 0.03); c.fillStyle = '#fff'; c.font = 'bold 0.28px sans-serif'; c.textAlign = 'center'; c.fillText('?', 0, -0.2 + sin(t * 3) * 0.01); c.restore(); }
export function dibujarBola(c, b, x, y, u, t) { c.save(); c.translate(x, y); c.scale(u, u); c.rotate(t * 7); if (b.tipo === 'bomba') { circ(c, 0, -0.2, 0.2, '#d9143a', '#7d0b22', 0.03); lin(c, 0, -0.4, 0.05, -0.5, '#3a7d2a', 0.04); } else { const r = b.tipo === 'bolagr' ? 0.3 : 0.2; elip(c, 0, -r, r, r * 1.1, b.tipo === 'bolagr' ? '#d9a02a' : '#b97b3d', '#6b3f17', 0, 0.03); lin(c, -r * 0.6, -r, r * 0.6, -r, '#3d2209', 0.02); circ(c, -r * 0.3, -r * 1.2, r * 0.12, '#3d2209'); circ(c, r * 0.3, -r * 1.2, r * 0.12, '#3d2209'); } c.restore(); }
export function iconoSemilla(c, id, x, y, u, t) { dibujarPlanta(c, id, x, y + u * 0.42, u * 0.95, t || 0, { hp: 1, arma: 0 }); }

/* ---------- fondos ---------- */
export function dibujarFondo(c, L, niv, t) {
  const { bx, by, cw, ch } = L; const W = L.W, H = L.H;
  // cielo
  const g = c.createLinearGradient(0, 0, 0, H);
  if (niv.noche) { g.addColorStop(0, '#0e1233'); g.addColorStop(1, '#1d2a4d'); } else if (niv.tejado) { g.addColorStop(0, '#f2b878'); g.addColorStop(1, '#fbd9a8'); } else { g.addColorStop(0, '#8fd4f6'); g.addColorStop(1, '#d6f0fb'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (niv.noche) { for (let i = 0; i < 40; i++) { const sx = (i * 137.5) % W, sy = (i * 61.3) % (H * 0.35); circ(c, sx, sy, 1 + (i % 3) * 0.6, `rgba(255,255,255,${0.4 + 0.4 * sin(t * 1.4 + i)})`); } circ(c, W * 0.82, H * 0.1, 28, '#f6f1d0'); circ(c, W * 0.82 + 10, H * 0.1 - 6, 24, '#0e1233'); }
  else if (!niv.tejado) { for (let i = 0; i < 4; i++) { const cx = ((i * 270 + t * 6) % (W + 200)) - 100; elip(c, cx, 40 + (i % 2) * 24, 70, 22, 'rgba(255,255,255,.8)'); elip(c, cx + 40, 34 + (i % 2) * 24, 45, 18, 'rgba(255,255,255,.8)'); } }
  // tablero
  for (let r = 0; r < FILAS; r++) for (let q = 0; q < COLS; q++) {
    const x = bx + q * cw, y = by + r * ch, agua = niv.agua.includes(r);
    let col;
    if (agua) col = (r + q) % 2 ? '#3aa7d8' : '#46b4e4';
    else if (niv.tejado) { col = (r + q) % 2 ? '#b8613a' : '#c4704a'; if (q < 5) col = (r + q) % 2 ? '#a5532e' : '#b25f3a'; }
    else if (niv.noche) col = (r + q) % 2 ? '#2f6a4a' : '#357754';
    else col = (r + q) % 2 ? '#6bc24a' : '#78cf55';
    c.fillStyle = col; c.fillRect(x, y, cw + 0.5, ch + 0.5);
    if (agua) { c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.5; c.beginPath(); const o = (t * 16 + q * 11) % cw; c.moveTo(x + 6, y + ch * 0.35 + sin(t * 2 + q) * 2); c.quadraticCurveTo(x + cw / 2, y + ch * 0.3, x + cw - 8, y + ch * 0.4); c.stroke(); }
    else if (niv.tejado) { c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y + ch * 0.5); c.lineTo(x + cw, y + ch * 0.5); c.stroke(); }
  }
  if (niv.noche) { c.fillStyle = 'rgba(8,14,40,.28)'; c.fillRect(bx, by, cw * COLS, ch * FILAS); }
  // casa
  const hx = bx - L.casa;
  if (hx > -40) { rect(c, hx - 6, by - 6, L.casa + 6, ch * FILAS + 12, niv.noche ? '#4a3a52' : '#d9b48a', '#6a4a2a', 8); rect(c, hx + 10, by + ch * 1.6, L.casa * 0.5, ch * 1.5, '#7a4a2a', '#3a2010', 4); circ(c, hx + 10 + L.casa * 0.42, by + ch * 2.4, 3, '#ffd23a'); rect(c, hx + 8, by + ch * 0.2, L.casa * 0.5, ch * 0.9, niv.noche ? '#ffe9a0' : '#9fd8f0', '#6a4a2a', 3); }
  // vallas
  c.fillStyle = niv.noche ? '#3a3050' : '#c9b48a'; c.fillRect(bx, by - 8, cw * COLS, 8); c.fillRect(bx, by + ch * FILAS, cw * COLS, 8);
}
export function dibujarNiebla(c, L, t, visible) {
  const { bx, by, cw, ch } = L; c.save();
  for (let r = 0; r < FILAS; r++) for (let q = 4; q < COLS; q++) {
    const cx = bx + (q + 0.5) * cw, cy = by + (r + 0.5) * ch; const a = visible(r, q + 0.5) ? 0 : 0.8;
    if (!a) continue; const w = sin(t * 0.4 + q * 1.3 + r) * 8; const g = c.createRadialGradient(cx + w, cy, 0, cx + w, cy, cw * 0.85); g.addColorStop(0, `rgba(200,215,220,${a})`); g.addColorStop(1, 'rgba(200,215,220,0)'); c.fillStyle = g; c.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
  }
  c.restore();
}
