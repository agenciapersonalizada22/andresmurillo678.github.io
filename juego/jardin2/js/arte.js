// Arte vectorial procedural: plantas, zombis, terrenos y fondos de los mundos. Sin DOM salvo el contexto 2D que se recibe.
import { P, Z, MUNDOS } from './datos.js';
const TAU = Math.PI * 2;
export const DALT = { no: null, prot: { '#ff4a4a': '#e8a000', '#6fdc4a': '#2a8fd8', '#ffd94a': '#fff' }, deut: { '#ff4a4a': '#d89000', '#6fdc4a': '#3a7ad8' }, trit: { '#2a8fd8': '#6a4ad8', '#ffd94a': '#ff7aa0' } };

/* ---------- utilidades ---------- */
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb = (r, g, b) => `rgb(${Math.max(0, Math.min(255, r | 0))},${Math.max(0, Math.min(255, g | 0))},${Math.max(0, Math.min(255, b | 0))})`;
export const mez = (a, b, t) => { const x = hex(a), y = hex(b); return rgb(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const clar = (c, k) => { const x = hex(c); return rgb(x[0] + (255 - x[0]) * k, x[1] + (255 - x[1]) * k, x[2] + (255 - x[2]) * k); };
const osc = (c, k) => { const x = hex(c); return rgb(x[0] * (1 - k), x[1] * (1 - k), x[2] * (1 - k)); };
function circ(g, x, y, r, f, s, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 0.025; g.strokeStyle = s; g.stroke(); } }
function elip(g, x, y, rx, ry, f, s, lw, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 0.025; g.strokeStyle = s; g.stroke(); } }
function rect(g, x, y, w, h, r, f, s, lw) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 0.025; g.strokeStyle = s; g.stroke(); } }
function poli(g, pts, f, s, lw) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.lineWidth = lw || 0.025; g.strokeStyle = s; g.lineJoin = 'round'; g.stroke(); } }
function linea(g, x1, y1, x2, y2, s, lw) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = lw || 0.03; g.strokeStyle = s; g.lineCap = 'round'; g.stroke(); }
function esfera(g, x, y, r, c1, c2) { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); gr.addColorStop(0, clar(c1, 0.35)); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2); return gr; }
function cara(g, x, y, s, t, mood, ojos) {
  const par = ((t * 0.37) % 1) > 0.94 ? 0.15 : 1, dx = mood === 'mira' ? 0.2 : 0;
  [-1, 1].forEach((k) => { elip(g, x + k * s * 0.55, y, s * 0.36, s * 0.36 * par, '#fff', '#1a1a1a', s * 0.1); if (par > 0.5) circ(g, x + k * s * 0.55 + s * 0.12 + dx * s * 0.1, y, s * 0.17, ojos || '#1a1a1a'); });
  if (mood === 'enojo') { linea(g, x - s * 1.0, y - s * 0.5, x - s * 0.2, y - s * 0.2, '#1a1a1a', s * 0.14); linea(g, x + s * 1.0, y - s * 0.5, x + s * 0.2, y - s * 0.2, '#1a1a1a', s * 0.14); }
  g.beginPath(); if (mood === 'enojo' || mood === 'boca') g.arc(x + s * 0.1, y + s * 1.05, s * 0.4, Math.PI * 1.1, Math.PI * 1.9); else g.arc(x + s * 0.1, y + s * 0.5, s * 0.45, 0.2, Math.PI - 0.2); g.lineWidth = s * 0.12; g.strokeStyle = '#1a1a1a'; g.lineCap = 'round'; g.stroke();
}
const hoja = (g, x, y, rot, l, col) => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.35, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.35, 0, 0); g.fillStyle = col; g.fill(); g.lineWidth = 0.015; g.strokeStyle = osc(col, 0.35); g.stroke(); g.restore(); };
const verde1 = '#4fbf3a', verde2 = '#2f8a2a';
function tallo(g, h, bal, col) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(bal, -h * 0.5, 0, -h); g.lineWidth = 0.09; g.strokeStyle = col || verde2; g.lineCap = 'round'; g.stroke(); }

/* ---------- plantas ---------- */
// Dibuja en coordenadas de casilla: (x,y) = base centro, tam = lado de casilla en px. st: {hp 0..1, hit, verde, nv, atur, gigante, osc}
export function dibujarPlanta(g, id, x, y, tam, t, st = {}) {
  const d = P[id]; if (!d) return; const [c1, c2] = d.col; const bal = Math.sin(t * 2.2 + (x * 0.05)) * 0.03;
  g.save(); g.translate(x, y); const sc = tam * (st.gigante ? 1.45 : 1); g.scale(sc, sc);
  if (st.hit > 0) { g.globalAlpha = 0.75; }
  elip(g, 0, 0.02, 0.32, 0.08, 'rgba(0,0,0,0.22)');
  const hu = st.hp != null && st.hp < 0.4 ? 0.12 : 0; // marchita
  g.rotate(bal * 0.6);
  vis[d.vis] ? vis[d.vis](g, t, c1, c2, d, st) : vis.flor(g, t, c1, c2, d, st);
  if (hu) { g.globalAlpha = 0.25; elip(g, 0, -0.45, 0.4, 0.5, '#3a2a10'); g.globalAlpha = 1; }
  if (st.nv > 1) { for (let i = 0; i < st.nv - 1; i++) { const a = -0.05 - i * 0.1; poli(g, [[-0.42 + i * 0.12, a], [-0.36 + i * 0.12, a - 0.07], [-0.3 + i * 0.12, a]], '#ffd94a', '#8a6a00', 0.012); } }
  if (st.hit > 0) { g.globalAlpha = 0.35 * Math.min(1, st.hit * 8); g.globalCompositeOperation = 'lighter'; elip(g, 0, -0.45, 0.4, 0.55, '#fff'); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}
const vis = {
  flor(g, t, c1, c2, d, st) { tallo(g, 0.45, 0.04); hoja(g, 0, -0.18, -0.5, 0.28, verde1); hoja(g, 0, -0.18, Math.PI + 0.5, 0.28, verde1); const cy = -0.6, n = 9; for (let i = 0; i < n; i++) { const a = i / n * TAU + t * 0.3; elip(g, Math.cos(a) * 0.27, cy + Math.sin(a) * 0.27, 0.12, 0.07, c1, osc(c1, 0.3), 0.012, a); } circ(g, 0, cy, 0.21, esfera(g, 0, cy, 0.21, c2, osc(c2, 0.3)), osc(c2, 0.4), 0.02); cara(g, 0, cy - 0.02, 0.07, t, d.k === 'prod' ? 'sonrie' : 'enojo'); },
  bulbo(g, t, c1, c2, d, st) { tallo(g, 0.3, 0.03); hoja(g, 0, -0.1, -0.4, 0.26, verde1); hoja(g, 0, -0.1, Math.PI + 0.4, 0.26, verde1); const cy = -0.52; rect(g, 0.14, cy - 0.12, 0.3, 0.2, 0.09, c2, osc(c2, 0.4), 0.02); elip(g, 0.44, cy - 0.02, 0.06, 0.1, osc(c2, 0.55)); circ(g, 0, cy, 0.3, esfera(g, 0, cy, 0.3, c1, c2), osc(c2, 0.4), 0.025); hoja(g, -0.05, cy - 0.28, -1.9, 0.2, c2); cara(g, -0.02, cy - 0.04, 0.075, t, 'enojo'); },
  bulbo2(g, t, c1, c2, d, st) { vis.bulbo(g, t, c1, c2, d, st); g.save(); g.translate(-0.28, -0.12); g.scale(0.7, 0.7); vis.bulbo(g, t + 1, c1, c2, d, st); g.restore(); },
  tronco(g, t, c1, c2) { rect(g, -0.27, -0.88, 0.54, 0.88, 0.2, esfera(g, 0, -0.45, 0.5, c1, c2), osc(c2, 0.4), 0.03); for (let i = 0; i < 4; i++) linea(g, -0.2, -0.2 - i * 0.18, -0.05, -0.15 - i * 0.18, osc(c2, 0.25), 0.02); hoja(g, 0.2, -0.85, -0.6, 0.22, verde1); cara(g, 0, -0.55, 0.07, t, 'sonrie'); },
  fruta(g, t, c1, c2, d) { const m = (t * 6) % 2 > 1 ? 1.04 : 1; g.scale(m, m); circ(g, 0, -0.32, 0.3, esfera(g, 0, -0.32, 0.3, c1, c2), osc(c2, 0.4), 0.03); hoja(g, 0, -0.6, -1.2, 0.2, verde1); linea(g, 0, -0.62, 0.1, -0.78, '#6a4a1a', 0.03); circ(g, 0.1, -0.8, 0.04 + Math.sin(t * 20) * 0.015, '#ffd94a'); cara(g, 0, -0.33, 0.07, t, 'enojo'); },
  cactus(g, t, c1, c2) { rect(g, -0.15, -0.85, 0.3, 0.85, 0.15, esfera(g, 0, -0.45, 0.4, c1, c2), osc(c2, 0.4), 0.025); rect(g, -0.38, -0.55, 0.15, 0.3, 0.07, c1, osc(c2, 0.4), 0.02); rect(g, 0.23, -0.65, 0.15, 0.3, 0.07, c1, osc(c2, 0.4), 0.02); for (let i = 0; i < 6; i++) { linea(g, -0.15, -0.15 - i * 0.12, -0.23, -0.18 - i * 0.12, '#fff', 0.012); linea(g, 0.15, -0.2 - i * 0.12, 0.23, -0.22 - i * 0.12, '#fff', 0.012); } circ(g, 0, -0.92, 0.07, '#ff8ad0'); cara(g, 0, -0.55, 0.055, t, 'enojo'); },
  bulboTierra(g, t, c1, c2) { elip(g, 0, 0, 0.3, 0.1, '#6a4a2a'); g.beginPath(); g.arc(0, 0, 0.26, Math.PI, 0); g.fillStyle = esfera(g, 0, -0.1, 0.26, c1, osc(c1, 0.4)); g.fill(); circ(g, 0, -0.26, 0.05, ((t * 3) % 1) > 0.5 ? c2 : '#400', null); cara(g, 0, -0.1, 0.045, t, 'enojo'); },
  zarza(g, t, c1, c2) { for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; poli(g, [[Math.cos(a) * 0.2, -0.05 + Math.sin(a) * 0.2], [Math.cos(a) * 0.42, -0.05 + Math.sin(a) * 0.38], [Math.cos(a + 0.2) * 0.2, -0.05 + Math.sin(a + 0.2) * 0.2]], '#d8e8a8', osc(c2, 0.3), 0.012); } elip(g, 0, -0.1, 0.32, 0.14, esfera(g, 0, -0.1, 0.3, c1, c2), osc(c2, 0.4), 0.02); cara(g, 0, -0.12, 0.05, t, 'enojo'); },
  panal(g, t, c1, c2) { for (let r = 0; r < 3; r++) for (let q = 0; q < 2 + (r === 1 ? 1 : 0); q++) { const cx = (r === 1 ? -0.28 : -0.14) + q * 0.28, cy = -0.2 - r * 0.24; const pts = []; for (let k = 0; k < 6; k++) pts.push([cx + Math.cos(k / 6 * TAU + 0.52) * 0.17, cy + Math.sin(k / 6 * TAU + 0.52) * 0.17]); poli(g, pts, esfera(g, cx, cy, 0.17, c1, c2), osc(c2, 0.4), 0.02); } cara(g, 0, -0.46, 0.06, t, 'mira'); },
  nenufar(g, t, c1, c2) { elip(g, 0, -0.04, 0.42, 0.14, esfera(g, 0, -0.05, 0.42, c1, c2), osc(c2, 0.4), 0.02); poli(g, [[0, -0.04], [0.42, -0.1], [0.4, 0.0]], '#1d7f63'); elip(g, 0.12, -0.12, 0.06, 0.05, '#ff9ad0'); cara(g, -0.08, -0.08, 0.04, t, 'sonrie'); },
  erizo(g, t, c1, c2) { for (let i = 0; i < 14; i++) { const a = Math.PI + i / 13 * Math.PI; linea(g, Math.cos(a) * 0.3, -0.38 + Math.sin(a) * 0.4, Math.cos(a) * 0.46, -0.38 + Math.sin(a) * 0.62, osc(c2, 0.3), 0.04); } elip(g, 0, -0.32, 0.34, 0.3, esfera(g, 0, -0.32, 0.34, c1, c2), osc(c2, 0.4), 0.025); elip(g, 0.2, -0.26, 0.15, 0.1, '#e8c8a0'); circ(g, 0.32, -0.28, 0.035, '#222'); cara(g, 0.05, -0.42, 0.055, t, 'enojo'); },
  trebol(g, t, c1, c2) { tallo(g, 0.3, 0.02); [[-0.26, -0.5], [0.26, -0.5], [0, -0.78]].forEach(([x, y], i) => { circ(g, x, y, 0.2, esfera(g, x, y, 0.2, c1, c2), osc(c2, 0.4), 0.02); cara(g, x, y - 0.01, 0.05, t + i, 'enojo'); }); },
  faro(g, t, c1, c2) { poli(g, [[-0.2, 0], [0.2, 0], [0.13, -0.7], [-0.13, -0.7]], '#e8e8f0', '#8a8a9a', 0.02); [0.2, 0.42].forEach((y) => rect(g, -0.2 + y * 0.12, -y - 0.1, 0.4 - y * 0.24, 0.1, 0.02, '#d85a4a')); rect(g, -0.17, -0.9, 0.34, 0.2, 0.05, c1, c2, 0.02); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, -0.8, 0, 0, -0.8, 0.5); gr.addColorStop(0, 'rgba(255,240,150,0.55)'); gr.addColorStop(1, 'rgba(255,240,150,0)'); circ(g, 0, -0.8, 0.5, gr); g.globalCompositeOperation = 'source-over'; poli(g, [[-0.2, -0.9], [0, -1.05], [0.2, -0.9]], '#c04a3a'); cara(g, 0, -0.45, 0.05, t, 'sonrie'); },
  hongo(g, t, c1, c2) { rect(g, -0.1, -0.4, 0.2, 0.4, 0.07, '#f0e8d0', '#a89a78', 0.02); g.beginPath(); g.ellipse(0, -0.45, 0.36, 0.3, 0, Math.PI, 0); g.closePath(); g.fillStyle = esfera(g, 0, -0.6, 0.36, c1, c2); g.fill(); g.lineWidth = 0.025; g.strokeStyle = osc(c2, 0.4); g.stroke(); [[-0.18, -0.55], [0.1, -0.64], [0.22, -0.5]].forEach(([x, y]) => circ(g, x, y, 0.05, '#fff6c0')); cara(g, 0, -0.28, 0.045, t, 'enojo'); },
  melon(g, t, c1, c2) { rect(g, -0.28, -0.1, 0.56, 0.1, 0.04, '#7a5a2a'); elip(g, 0, -0.38, 0.32, 0.28, esfera(g, 0, -0.38, 0.32, c1, osc(c1, 0.4)), osc(c1, 0.5), 0.025); for (let i = -2; i <= 2; i++) linea(g, i * 0.09, -0.62, i * 0.12, -0.14, c2, 0.03); hoja(g, 0.2, -0.65, -0.7, 0.25, verde1); cara(g, 0, -0.4, 0.06, t, 'enojo'); },
  reloj(g, t, c1, c2, d, st) { tallo(g, 0.4, 0.03); circ(g, 0, -0.62, 0.3, esfera(g, 0, -0.62, 0.3, '#f4f8ff', c1), c2, 0.04); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; linea(g, Math.cos(a) * 0.24, -0.62 + Math.sin(a) * 0.24, Math.cos(a) * 0.28, -0.62 + Math.sin(a) * 0.28, c2, 0.02); } linea(g, 0, -0.62, Math.cos(t * 1.5) * 0.2, -0.62 + Math.sin(t * 1.5) * 0.2, '#223', 0.03); linea(g, 0, -0.62, Math.cos(t * 0.2) * 0.13, -0.62 + Math.sin(t * 0.2) * 0.13, '#223', 0.04); circ(g, 0, -0.62, 0.03, '#223'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.5; elip(g, Math.cos(a) * 0.4, -0.62 + Math.sin(a) * 0.4, 0.07, 0.04, c2, null, 0, a); } },
  gota(g, t, c1, c2) { g.beginPath(); g.moveTo(0, -0.88); g.bezierCurveTo(0.34, -0.5, 0.34, -0.05, 0, -0.04); g.bezierCurveTo(-0.34, -0.05, -0.34, -0.5, 0, -0.88); g.fillStyle = esfera(g, -0.05, -0.45, 0.35, c1, c2); g.fill(); g.lineWidth = 0.025; g.strokeStyle = osc(c2, 0.4); g.stroke(); elip(g, -0.1, -0.55, 0.05, 0.1, 'rgba(255,255,255,0.6)', null, 0, 0.4); cara(g, 0, -0.32, 0.06, t, 'sonrie'); },
  tambor(g, t, c1, c2) { const b = Math.abs(Math.sin(t * 4)) * 0.04; rect(g, -0.3, -0.5, 0.6, 0.48, 0.05, esfera(g, 0, -0.26, 0.4, c1, c2), osc(c2, 0.4), 0.025); elip(g, 0, -0.5, 0.3, 0.09, '#f0e0c0', osc(c2, 0.4), 0.02); for (let i = -2; i <= 2; i++) linea(g, i * 0.1, -0.45, (i + 1) * 0.1 - 0.02, -0.05, '#f0e0c0', 0.015); linea(g, -0.3, -0.85 + b, -0.08, -0.52, '#e8d0a0', 0.04); linea(g, 0.3, -0.85 - b, 0.08, -0.52, '#e8d0a0', 0.04); cara(g, 0, -0.3, 0.06, t, 'enojo'); },
  cepo(g, t, c1, c2, d, st) { const ab = 0.3 + Math.sin(t * 3) * 0.1; tallo(g, 0.25, 0.02); g.save(); g.translate(0, -0.3); g.rotate(-ab); g.beginPath(); g.ellipse(0, -0.1, 0.34, 0.22, 0, Math.PI, 0); g.fillStyle = esfera(g, 0, -0.1, 0.34, c1, c2); g.fill(); g.restore(); g.save(); g.translate(0, -0.3); g.rotate(ab); g.beginPath(); g.ellipse(0, 0.1, 0.34, 0.2, 0, 0, Math.PI); g.fillStyle = c2; g.fill(); g.restore(); for (let i = -2; i <= 2; i++) { poli(g, [[i * 0.12 - 0.04, -0.3 - ab * 0.4], [i * 0.12, -0.18 - ab * 0.4], [i * 0.12 + 0.04, -0.3 - ab * 0.4]], '#fff'); } },
  espejo(g, t, c1, c2) { rect(g, -0.06, -0.15, 0.12, 0.15, 0.02, '#7a6a4a'); elip(g, 0, -0.55, 0.3, 0.4, '#8a6a3a'); const gr = g.createLinearGradient(-0.2, -0.9, 0.2, -0.2); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, c1); gr.addColorStop(1, c2); elip(g, 0, -0.55, 0.25, 0.35, gr); linea(g, -0.12, -0.72, 0.05, -0.85, 'rgba(255,255,255,0.8)', 0.04); cara(g, 0, -0.5, 0.05, t, 'mira'); },
  hoja(g, t, c1, c2) { tallo(g, 0.3, 0.03); for (let i = 0; i < 5; i++) hoja(g, 0, -0.55, -0.4 + i * 0.55 + Math.sin(t * 2 + i) * 0.1 - 1.2, 0.4, i % 2 ? c1 : c2); circ(g, 0, -0.55, 0.14, esfera(g, 0, -0.55, 0.14, c1, c2)); cara(g, 0, -0.56, 0.04, t, 'enojo'); },
  bambu(g, t, c1, c2) { [-0.15, 0.02, 0.18].forEach((x, k) => { const h = 0.8 + k * 0.1 - (k === 1 ? 0.2 : 0); rect(g, x - 0.07, -h, 0.14, h, 0.05, esfera(g, x, -h / 2, 0.3, c1, c2), osc(c2, 0.4), 0.02); for (let j = 1; j < 5; j++) linea(g, x - 0.07, -h * j / 5, x + 0.07, -h * j / 5, osc(c2, 0.4), 0.02); hoja(g, x + 0.05, -h * 0.7, -0.5, 0.2, c1); }); cara(g, 0.02, -0.45, 0.04, t, 'sonrie'); },
  nube(g, t, c1, c2) { const by = Math.sin(t * 2) * 0.03; [[-0.2, -0.7, 0.18], [0, -0.82, 0.22], [0.2, -0.7, 0.18], [0, -0.66, 0.2]].forEach(([x, y, r]) => circ(g, x, y + by, r, esfera(g, x, y + by, r, '#dfe6f4', c1))); poli(g, [[0.02, -0.55], [-0.08, -0.35], [0, -0.35], [-0.06, -0.12], [0.12, -0.4], [0.03, -0.4], [0.1, -0.55]], c2, '#a88a00', 0.012); cara(g, 0, -0.74 + by, 0.055, t, 'enojo'); },
  cristal(g, t, c1, c2) { poli(g, [[0, -0.95], [0.28, -0.55], [0.18, -0.05], [-0.18, -0.05], [-0.28, -0.55]], esfera(g, 0, -0.5, 0.4, c1, c2), osc(c2, 0.4), 0.025); linea(g, 0, -0.95, 0, -0.05, 'rgba(255,255,255,0.35)', 0.02); linea(g, -0.28, -0.55, 0.28, -0.55, 'rgba(255,255,255,0.35)', 0.02); g.globalCompositeOperation = 'lighter'; circ(g, 0, -0.5, 0.35 + Math.sin(t * 3) * 0.03, 'rgba(255,255,255,0.12)'); g.globalCompositeOperation = 'source-over'; cara(g, 0, -0.38, 0.05, t, 'mira'); },
  iman(g, t, c1, c2) { g.beginPath(); g.arc(0, -0.5, 0.26, Math.PI, 0); g.lineTo(0.26, -0.15); g.lineTo(0.1, -0.15); g.lineTo(0.1, -0.5); g.arc(0, -0.5, 0.1, 0, Math.PI, true); g.lineTo(-0.1, -0.15); g.lineTo(-0.26, -0.15); g.closePath(); g.fillStyle = esfera(g, 0, -0.5, 0.4, c1, osc(c1, 0.4)); g.fill(); g.lineWidth = 0.025; g.strokeStyle = '#222'; g.stroke(); rect(g, -0.26, -0.28, 0.16, 0.13, 0.01, '#eee'); rect(g, 0.1, -0.28, 0.16, 0.13, 0.01, '#eee'); hoja(g, 0, -0.78, -1.9, 0.2, verde1); cara(g, 0, -0.55, 0.045, t, 'sonrie'); },
  espantapajaros(g, t, c1, c2) { linea(g, 0, 0, 0, -0.7, '#7a5a2a', 0.07); linea(g, -0.35, -0.5, 0.35, -0.5, '#7a5a2a', 0.07); poli(g, [[-0.15, -0.55], [0.15, -0.55], [0.2, -0.25], [-0.2, -0.25]], c2, osc(c2, 0.4), 0.02); circ(g, 0, -0.75, 0.15, '#e8d08a', '#8a7a3a', 0.02); elip(g, 0, -0.88, 0.25, 0.04, c2); poli(g, [[-0.14, -0.88], [0.14, -0.88], [0.08, -1.05], [-0.08, -1.05]], c1, osc(c1, 0.4), 0.02); circ(g, -0.05, -0.77, 0.02, '#222'); circ(g, 0.05, -0.77, 0.02, '#222'); hoja(g, 0.3, -0.45, 0.3, 0.2, '#c8b060'); },
  farol(g, t, c1, c2) { linea(g, 0, -0.9, 0, -1.0, '#555', 0.03); poli(g, [[-0.14, -0.88], [0.14, -0.88], [0.2, -0.78], [-0.2, -0.78]], '#7a4a2a'); rect(g, -0.2, -0.78, 0.4, 0.6, 0.12, esfera(g, 0, -0.5, 0.3, c1, c2), '#7a4a2a', 0.03); rect(g, -0.16, -0.18, 0.32, 0.08, 0.02, '#7a4a2a'); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, -0.5, 0, 0, -0.5, 0.55); gr.addColorStop(0, 'rgba(255,230,150,0.5)'); gr.addColorStop(1, 'rgba(255,230,150,0)'); circ(g, 0, -0.5, 0.55, gr); g.globalCompositeOperation = 'source-over'; cara(g, 0, -0.5, 0.055, t, 'sonrie'); },
  ballesta(g, t, c1, c2) { tallo(g, 0.3, 0.02); rect(g, -0.3, -0.52, 0.6, 0.08, 0.03, '#7a5a2a'); g.beginPath(); g.moveTo(-0.3, -0.48); g.quadraticCurveTo(-0.05, -0.8, 0.28, -0.48); g.lineWidth = 0.04; g.strokeStyle = c1; g.stroke(); linea(g, -0.3, -0.48, 0.28, -0.48, '#ddd', 0.012); poli(g, [[0.2, -0.48], [0.46, -0.48], [0.4, -0.52], [0.4, -0.44]], '#ccc'); circ(g, -0.05, -0.38, 0.1, esfera(g, -0.05, -0.38, 0.1, c1, c2)); cara(g, -0.05, -0.39, 0.03, t, 'enojo'); },
  roca(g, t, c1, c2) { poli(g, [[-0.38, 0], [-0.4, -0.35], [-0.2, -0.78], [0.15, -0.85], [0.4, -0.5], [0.38, 0]], esfera(g, -0.05, -0.45, 0.5, c1, osc(c1, 0.5)), osc(c1, 0.6), 0.03); [[-0.25, -0.7], [0.0, -0.84], [0.28, -0.66]].forEach(([x, y]) => circ(g, x, y, 0.07, '#5aa84a')); linea(g, -0.1, -0.7, 0.0, -0.45, osc(c1, 0.5), 0.02); cara(g, 0, -0.45, 0.07, t, 'enojo'); },
  coral(g, t, c1, c2) { [[-0.2, 0.7], [0, 0.9], [0.2, 0.65]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 0.06, -h * 0.5, x, -h); g.lineWidth = 0.14; g.strokeStyle = c1; g.lineCap = 'round'; g.stroke(); circ(g, x, -h, 0.09, c2); linea(g, x, -h * 0.55, x + 0.15, -h * 0.75, c1, 0.08); }); cara(g, 0, -0.4, 0.05, t, 'sonrie'); },
  helecho(g, t, c1, c2) { for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i / 6 * Math.PI * 0.9; g.beginPath(); g.moveTo(0, -0.05); g.quadraticCurveTo(Math.cos(a) * 0.3, -0.05 + Math.sin(a) * 0.45, Math.cos(a) * 0.5, -0.05 + Math.sin(a) * 0.8); g.lineWidth = 0.05; g.strokeStyle = i % 2 ? c1 : c2; g.stroke(); for (let k = 1; k < 5; k++) { const px = Math.cos(a) * 0.1 * k, py = -0.05 + Math.sin(a) * 0.16 * k; linea(g, px, py, px + 0.07, py - 0.03, c1, 0.02); linea(g, px, py, px - 0.07, py - 0.03, c1, 0.02); } } circ(g, 0, -0.2, 0.15, '#d8c88a', '#7a6a3a', 0.02); cara(g, 0, -0.2, 0.04, t, 'mira'); },
  dragon(g, t, c1, c2) { tallo(g, 0.35, 0.03, '#a83a1a'); circ(g, 0, -0.55, 0.28, esfera(g, 0, -0.55, 0.28, c1, osc(c1, 0.5)), osc(c1, 0.6), 0.025); rect(g, 0.1, -0.58, 0.3, 0.2, 0.08, c1, osc(c1, 0.6), 0.02); circ(g, 0.38, -0.5, 0.025, '#400'); for (let i = 0; i < 3; i++) poli(g, [[-0.14 + i * 0.12, -0.8], [-0.08 + i * 0.12, -0.96], [-0.02 + i * 0.12, -0.8]], c2); const f = (Math.sin(t * 6) + 1) * 0.5; g.globalCompositeOperation = 'lighter'; circ(g, 0.5 + f * 0.08, -0.5, 0.07 + f * 0.04, 'rgba(255,150,40,0.7)'); g.globalCompositeOperation = 'source-over'; cara(g, -0.03, -0.58, 0.06, t, 'enojo'); },
};

/* ---------- zombis ---------- */
export function dibujarZombi(g, z, x, y, tam, t, op = {}) {
  const d = Z[z.tipo]; if (!d) return; const v = d.vis || {}; const esc = (d.jefe ? Math.min(1.5, v.esc || 1) : (v.esc || 1)) * (op.escala || 1);
  const dalt = op.dalt;
  let piel = v.piel || '#9ac09a', ropa = v.ropa || '#6a6a8a'; if (dalt) { piel = dalt[piel] || piel; ropa = dalt[ropa] || ropa; }
  const mu = z.estado === 'muere' ? Math.min(1, (z.tm || 0) / 0.9) : 0;
  g.save(); g.translate(x, y); g.scale(tam * esc, tam * esc); g.globalAlpha = 1 - mu * 0.9;
  if (mu) { g.rotate(mu * 1.3); g.translate(mu * 0.3, mu * 0.1); }
  const aire = z.aire || (d.h || []).includes('vuelo') && z.x > 2.2; const hov = aire ? -0.28 + Math.sin(t * 5 + z.id) * 0.04 : 0;
  elip(g, 0, 0.02, 0.28 / (aire ? 1.2 : 1), 0.07, `rgba(0,0,0,${aire ? 0.15 : 0.25})`);
  if (z.fase > 0) g.globalAlpha *= 0.45 + Math.sin(t * 30) * 0.2;
  if (d.vago || z.vago) { carro(g, t, z); g.restore(); return; }
  g.translate(0, hov);
  const cam = z.comiendo ? 0 : 1, ph = t * 4.2 * (z.edad !== undefined ? 1 : 1) + z.id * 1.7, ba = (z.cong > 0 || z.at > 0 || z.dorm > 0) ? 0 : 1;
  const mont = d.arm && d.arm.mont && z.arm && z.arm.hp > 0;
  if (mont) montura(g, t, ph);
  // piernas
  const lc = ropa === piel ? osc(ropa, 0.3) : osc(ropa, 0.35);
  if (!mont) [-1, 1].forEach((k) => { const s = Math.sin(ph + k * 1.6) * 0.1 * cam * ba; rect(g, -0.08 + k * 0.06 + s, -0.3, 0.1, 0.3, 0.04, lc, osc(lc, 0.4), 0.015); rect(g, -0.1 + k * 0.06 + s, -0.04, 0.16, 0.06, 0.03, '#3a2a1a'); });
  const bob = Math.sin(ph * 2) * 0.012 * ba;
  g.translate(0, bob);
  // brazos traseros
  const ar = z.comiendo ? Math.sin(t * 9 + z.id) * 0.25 : Math.sin(ph) * 0.1;
  g.save(); g.translate(-0.08, -0.56); g.rotate(-1.35 + ar); rect(g, -0.04, 0, 0.08, 0.3, 0.04, piel, osc(piel, 0.4), 0.015); g.restore();
  // torso
  poli(g, [[-0.17, -0.3], [0.17, -0.3], [0.15, -0.66], [-0.15, -0.66]], mez(ropa, '#ffffff', 0.04), osc(ropa, 0.45), 0.02);
  ex(g, v.ex, t, ropa, piel);
  // cabeza
  const hy = -0.8; circ(g, 0.02, hy, 0.17, esfera(g, 0.02, hy, 0.17, piel, osc(piel, 0.3)), osc(piel, 0.55), 0.022);
  // ojos y boca
  elip(g, -0.04, hy - 0.02, 0.045, 0.05, '#fff', '#222', 0.01); elip(g, 0.08, hy - 0.02, 0.04, 0.045, '#fff', '#222', 0.01); circ(g, -0.05, hy - 0.015, 0.016, z.br ? '#ff0' : '#c22'); circ(g, 0.07, hy - 0.015, 0.014, z.br ? '#ff0' : '#222');
  g.beginPath(); g.moveTo(-0.03, hy + 0.08); g.lineTo(0.03, hy + 0.1); g.lineTo(0.09, hy + 0.08); g.lineWidth = 0.014; g.strokeStyle = '#4a1a1a'; g.stroke();
  acc(g, v.acc, t, v, hy, piel, ropa, z);
  // brazo delantero
  g.save(); g.translate(0.1, -0.56); g.rotate(-1.4 - ar); rect(g, -0.04, 0, 0.08, 0.32, 0.04, piel, osc(piel, 0.4), 0.015); g.restore();
  armadura(g, z, d, t, hy);
  if (z.fr > 0 || z.cong > 0) { g.globalAlpha = 0.35; rect(g, -0.25, -1.05, 0.5, 1.05, 0.1, '#bfefff'); g.globalAlpha = 1; }
  if (z.dorm > 0) { g.fillStyle = '#fff'; g.font = 'bold 0.2px sans-serif'; g.fillText('z', 0.1, -1.05 - (t % 1) * 0.1); }
  if (z.qm > 0) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) circ(g, Math.sin(t * 9 + i * 2) * 0.12, -0.5 - ((t * 1.5 + i / 3) % 1) * 0.5, 0.06, 'rgba(255,140,30,0.7)'); g.globalCompositeOperation = 'source-over'; }
  if (z.ve > 0) { circ(g, Math.sin(t * 5) * 0.1, -1.05, 0.05, 'rgba(160,230,60,0.8)'); }
  if (z.br) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, -0.55, 0.05, 0, -0.55, 0.7); gr.addColorStop(0, 'rgba(120,255,120,0.6)'); gr.addColorStop(1, 'rgba(120,255,120,0)'); circ(g, 0, -0.55, 0.7, gr); g.globalCompositeOperation = 'source-over'; }
  if (z.hit > 0) { g.globalAlpha = 0.5; g.globalCompositeOperation = 'lighter'; rect(g, -0.25, -1.0, 0.5, 1.0, 0.1, '#fff'); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  g.restore();
}
function ex(g, e, t, ropa, piel) {
  if (e === 'capa') poli(g, [[-0.15, -0.64], [-0.34, -0.1], [0.0, -0.18]], '#7a2a8a', '#3a1048', 0.015);
  else if (e === 'bafle') { rect(g, -0.4, -0.55, 0.2, 0.26, 0.03, '#222', '#ff5ad8', 0.02); circ(g, -0.3, -0.42, 0.06 + Math.abs(Math.sin(t * 8)) * 0.02, '#ff5ad8'); }
  else if (e === 'dinamita') { rect(g, 0.1, -0.55, 0.06, 0.2, 0.01, '#c22'); rect(g, 0.04, -0.5, 0.06, 0.2, 0.01, '#c22'); circ(g, 0.1, -0.58, 0.02 + Math.sin(t * 25) * 0.01, '#ffd94a'); }
  else if (e === 'cañon') rect(g, 0.1, -0.55, 0.3, 0.1, 0.04, '#333', '#111', 0.015);
  else if (e === 'gancho') { g.beginPath(); g.arc(0.22, -0.34, 0.07, -1, 3.2); g.lineWidth = 0.025; g.strokeStyle = '#ccc'; g.stroke(); }
  else if (e === 'arco') { g.beginPath(); g.arc(0.2, -0.6, 0.22, -1.2, 1.2); g.lineWidth = 0.02; g.strokeStyle = '#8a6a3a'; g.stroke(); }
  else if (e === 'reactor') circ(g, 0, -0.5, 0.06 + Math.sin(t * 6) * 0.01, '#ff4aa0', '#fff', 0.01);
  else if (e === 'raices') { for (let i = 0; i < 3; i++) linea(g, -0.1 + i * 0.1, -0.05, -0.1 + i * 0.1 + Math.sin(t * 3 + i) * 0.05, 0.04, '#5a3a1a', 0.03); }
  else if (e === 'dientes') { for (let i = 0; i < 4; i++) poli(g, [[-0.04 + i * 0.05, -0.7], [-0.02 + i * 0.05, -0.64], [0 + i * 0.05, -0.7]], '#fff'); }
  else if (e === 'tren') { rect(g, -0.4, -0.5, 0.4, 0.4, 0.04, '#333', '#111', 0.02); circ(g, -0.36, -0.58, 0.05, '#888'); }
  else if (e === 'hielo') { poli(g, [[-0.2, -0.62], [-0.26, -0.9], [-0.1, -0.66]], '#bfe8ff'); poli(g, [[0.15, -0.64], [0.28, -0.92], [0.22, -0.62]], '#bfe8ff'); }
  else if (e === 'montura') { /* en montura() */ }
}
function acc(g, a, t, v, hy, piel, ropa, z) {
  if (a === 'venda') { for (let i = 0; i < 3; i++) linea(g, -0.15, hy - 0.08 + i * 0.07, 0.19, hy - 0.04 + i * 0.07, '#ece0c0', 0.03); }
  else if (a === 'turbante') { elip(g, 0.02, hy - 0.14, 0.19, 0.1, '#f4eada', '#a89a78', 0.015); circ(g, 0.02, hy - 0.2, 0.03, '#2a6ad8'); }
  else if (a === 'chacal') { poli(g, [[-0.12, hy - 0.12], [-0.08, hy - 0.34], [-0.02, hy - 0.14]], '#2a2a2a'); poli(g, [[0.06, hy - 0.14], [0.14, hy - 0.34], [0.18, hy - 0.1]], '#2a2a2a'); poli(g, [[0.1, hy + 0.02], [0.3, hy + 0.06], [0.1, hy + 0.14]], '#3a3a3a'); }
  else if (a === 'estatua') { rect(g, -0.17, hy - 0.2, 0.38, 0.1, 0.02, '#c8a050'); rect(g, -0.2, hy + 0.04, 0.45, 0.07, 0.02, '#8a5a34'); }
  else if (a === 'corona') { poli(g, [[-0.13, hy - 0.12], [-0.13, hy - 0.3], [-0.06, hy - 0.2], [0.02, hy - 0.34], [0.1, hy - 0.2], [0.17, hy - 0.3], [0.17, hy - 0.12]], '#ffd94a', '#8a6a00', 0.015); circ(g, 0.02, hy - 0.2, 0.025, '#e83a4a'); }
  else if (a === 'pañuelo') { poli(g, [[-0.15, hy - 0.08], [0.19, hy - 0.08], [0.22, hy - 0.2], [-0.14, hy - 0.2]], ropa, osc(ropa, 0.4), 0.012); linea(g, -0.15, hy - 0.1, -0.28, hy - 0.04, ropa, 0.04); }
  else if (a === 'tricornio') { poli(g, [[-0.22, hy - 0.1], [0.02, hy - 0.3], [0.26, hy - 0.1]], '#2a2a3a', '#111', 0.015); circ(g, 0.02, hy - 0.16, 0.025, '#fff'); }
  else if (a === 'sombrero') { elip(g, 0.02, hy - 0.13, 0.27, 0.05, '#7a5a2a', '#3a2a1a', 0.015); rect(g, -0.08, hy - 0.3, 0.2, 0.2, 0.05, '#8a6a3a', '#3a2a1a', 0.015); }
  else if (a === 'piel') { poli(g, [[-0.17, hy - 0.05], [0.2, hy - 0.05], [0.18, hy + 0.1], [-0.17, hy + 0.14]], '#a0a090', '#5a5a50', 0.015); }
  else if (a === 'pico') poli(g, [[0.15, hy], [0.3, hy + 0.05], [0.15, hy + 0.08]], '#ffa01a');
  else if (a === 'yeti') { for (let i = 0; i < 5; i++) circ(g, -0.12 + i * 0.07, hy - 0.14, 0.06, '#f4f8ff'); }
  else if (a === 'colmillos') { poli(g, [[0.12, hy + 0.06], [0.34, hy + 0.2], [0.14, hy + 0.12]], '#fffbe8', '#a89a78', 0.01); }
  else if (a === 'yelmo' || a === 'casco') { g.beginPath(); g.arc(0.02, hy - 0.02, 0.19, Math.PI, 0); g.closePath(); g.fillStyle = a === 'casco' ? '#dfe6f0' : '#9a9aa8'; g.fill(); g.lineWidth = 0.02; g.strokeStyle = '#444'; g.stroke(); if (a === 'casco') elip(g, 0.08, hy - 0.02, 0.1, 0.07, 'rgba(120,200,255,0.5)'); }
  else if (a === 'capucha') { g.beginPath(); g.arc(0.02, hy, 0.2, Math.PI * 0.9, Math.PI * 2.1); g.lineWidth = 0.06; g.strokeStyle = '#3a6a3a'; g.stroke(); }
  else if (a === 'gorromago') { poli(g, [[-0.15, hy - 0.1], [0.02, hy - 0.55], [0.2, hy - 0.1]], '#5a3aa8', '#2a1a58', 0.015); circ(g, 0.02, hy - 0.3, 0.025, '#ffd94a'); }
  else if (a === 'antena') { linea(g, 0.02, hy - 0.15, 0.02, hy - 0.34, '#888', 0.02); circ(g, 0.02, hy - 0.36, 0.035 + Math.abs(Math.sin(t * 4)) * 0.01, '#f33'); }
  else if (a === 'helice') { linea(g, 0.02, hy - 0.16, 0.02, hy - 0.22, '#555', 0.03); elip(g, 0.02, hy - 0.24, 0.3 * Math.abs(Math.cos(t * 30)) + 0.05, 0.02, '#aaa'); }
  else if (a === 'visor') { rect(g, -0.1, hy - 0.06, 0.28, 0.08, 0.03, 'rgba(80,220,255,0.8)', '#145', 0.012); }
  else if (a === 'plumas') { for (let i = 0; i < 4; i++) elip(g, -0.1 + i * 0.1, hy - 0.2, 0.04, 0.12, ['#e83a3a', '#ffd94a', '#2a8ad8', '#4ab84a'][i], null, 0, (i - 1.5) * 0.3); }
  else if (a === 'mascara') { rect(g, -0.1, hy - 0.08, 0.26, 0.2, 0.06, '#c8e84a', '#4a2a7a', 0.02); circ(g, -0.03, hy, 0.03, '#222'); circ(g, 0.09, hy, 0.03, '#222'); }
  else if (a === 'cola') { g.beginPath(); g.moveTo(-0.15, -0.35); g.quadraticCurveTo(-0.4, -0.3 + Math.sin(t * 4) * 0.1, -0.35, -0.6); g.lineWidth = 0.05; g.strokeStyle = piel; g.stroke(); }
  else if (a === 'gorila') { circ(g, 0.02, hy - 0.14, 0.12, '#555'); }
  else if (a === 'liana') { for (let i = 0; i < 3; i++) linea(g, 0.1 + i * 0.05, -0.5, 0.35 + i * 0.05, -0.2 + Math.sin(t * 3 + i) * 0.1, '#4a8a2a', 0.03); }
  else if (a === 'hueso') { rect(g, -0.1, hy - 0.2, 0.26, 0.05, 0.02, '#f0ead0', '#8a8a6a', 0.012); circ(g, -0.1, hy - 0.2, 0.035, '#f0ead0'); circ(g, 0.16, hy - 0.2, 0.035, '#f0ead0'); }
  else if (a === 'dino' || a === 'cuernos' || a === 'alas' || a === 'insecto' || a === 'tentaculo' || a === 'cuello') {
    if (a === 'alas') { const s = Math.sin(t * 12) * 0.3; poli(g, [[-0.1, -0.6], [-0.45, -0.9 - s], [-0.15, -0.4]], mez(ropa, '#fff', 0.1), osc(ropa, 0.4), 0.015); }
    if (a === 'cuernos') { poli(g, [[0.12, hy - 0.05], [0.34, hy - 0.2], [0.18, hy + 0.05]], '#f0e8c0', '#8a8a5a', 0.012); poli(g, [[0.0, hy - 0.1], [0.04, hy - 0.3], [0.1, hy - 0.1]], '#f0e8c0', '#8a8a5a', 0.012); }
    if (a === 'dino') { for (let i = 0; i < 3; i++) poli(g, [[-0.08 + i * 0.1, hy - 0.14], [-0.04 + i * 0.1, hy - 0.26], [0.0 + i * 0.1, hy - 0.14]], ropa); poli(g, [[0.12, hy + 0.0], [0.3, hy + 0.06], [0.12, hy + 0.12]], piel, osc(piel, 0.4), 0.012); }
    if (a === 'tentaculo') { for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-0.1 + i * 0.08, hy + 0.12); g.quadraticCurveTo(-0.2 + i * 0.12, hy + 0.4 + Math.sin(t * 4 + i) * 0.05, -0.15 + i * 0.12, hy + 0.55); g.lineWidth = 0.05; g.strokeStyle = ropa; g.stroke(); } }
    if (a === 'insecto') { const s = Math.sin(t * 20) * 0.1; poli(g, [[-0.05, -0.6], [-0.25, -0.8 - s], [0.05, -0.5]], 'rgba(200,230,255,0.6)'); }
    if (a === 'cuello') { rect(g, 0.05, hy - 0.2, 0.08, 0.3, 0.04, piel, osc(piel, 0.4), 0.012); }
  }
  else if (a === 'neon') { g.globalCompositeOperation = 'lighter'; rect(g, -0.17, -0.66, 0.34, 0.36, 0.05, null, ropa, 0.025); g.globalCompositeOperation = 'source-over'; }
  else if (a === 'auriculares') { g.beginPath(); g.arc(0.02, hy - 0.02, 0.2, Math.PI, 0); g.lineWidth = 0.03; g.strokeStyle = '#222'; g.stroke(); circ(g, -0.18, hy, 0.05, '#ff5ad8'); circ(g, 0.22, hy, 0.05, '#ff5ad8'); }
  else if (a === 'astro') { circ(g, 0.02, hy, 0.21, 'rgba(180,220,255,0.28)', '#e8e8f0', 0.03); }
  else if (a === 'antenas') { linea(g, -0.05, hy - 0.14, -0.1, hy - 0.3, '#3a9a3a', 0.02); linea(g, 0.1, hy - 0.14, 0.16, hy - 0.3, '#3a9a3a', 0.02); circ(g, -0.1, hy - 0.31, 0.03, '#ff0'); circ(g, 0.16, hy - 0.31, 0.03, '#ff0'); }
  else if (a === 'fiesta') { poli(g, [[-0.08, hy - 0.14], [0.06, hy - 0.4], [0.2, hy - 0.14]], '#ffd84a', '#c04a8a', 0.015); circ(g, 0.06, hy - 0.41, 0.03, '#ff4a8a'); }
  else if (a === 'carro') { /* vagoneta */ }
}
function montura(g, t, ph) { rect(g, -0.28, -0.28, 0.6, 0.2, 0.08, '#8a6a4a', '#4a3a2a', 0.02); [-0.2, 0.22].forEach((x, i) => rect(g, x, -0.1 + Math.sin(ph + i * 3) * 0.02, 0.07, 0.18, 0.03, '#6a4a2a')); poli(g, [[0.3, -0.26], [0.45, -0.34], [0.46, -0.2]], '#8a6a4a', '#4a3a2a', 0.015); }
function carro(g, t, z) {
  rect(g, -0.45, -0.5, 0.9, 0.34, 0.05, '#6a6a76', '#2a2a32', 0.03); for (let i = 0; i < 4; i++) rect(g, -0.4 + i * 0.22, -0.5, 0.05, 0.34, 0, 'rgba(0,0,0,0.25)');
  [-0.28, 0.28].forEach((x) => { circ(g, x, -0.1, 0.1, '#333', '#999', 0.03); linea(g, x, -0.1, x + Math.cos(t * 14) * 0.08, -0.1 + Math.sin(t * 14) * 0.08, '#aaa', 0.02); });
  poli(g, [[0.5, -0.45], [0.7, -0.4], [0.5, -0.3]], '#ffd94a'); g.globalCompositeOperation = 'lighter'; circ(g, 0.55, -0.38, 0.2, 'rgba(255,230,120,0.4)'); g.globalCompositeOperation = 'source-over';
}
function armadura(g, z, d, t, hy) {
  const a = z.arm; if (!a || a.hp <= 0 || !a.t || a.mont) return; const f = a.hp / a.hpMax, gr = f < 0.5 ? 0.45 : 1; g.globalAlpha *= 1;
  const rotas = f < 0.5; const col = { venda: '#ece0c0', barril: '#a0702f', chapa: '#9aa8b8', armadura: '#a8a8b8', escudoE: '#4ad8e8', cuerno: '#e8dcb0', casco: '#dfe6f0' }[a.t] || '#aaa';
  if (a.t === 'barril') { rect(g, -0.2, -0.62, 0.4, 0.4, 0.06, col, '#4a2a0a', 0.025); linea(g, -0.2, -0.5, 0.2, -0.5, '#4a2a0a', 0.02); linea(g, -0.2, -0.34, 0.2, -0.34, '#4a2a0a', 0.02); }
  else if (a.t === 'chapa' || a.t === 'armadura') { poli(g, [[-0.19, -0.62], [0.19, -0.62], [0.17, -0.3], [0, -0.22], [-0.17, -0.3]], col, '#445', 0.02); if (d.h && d.h.includes('escudo') || a.frente) { } }
  else if (a.t === 'escudoE') { rect(g, 0.15, -0.9, 0.12, 0.8, 0.05, 'rgba(80,230,255,0.55)', '#9ef', 0.02); }
  else if (a.t === 'cuerno') { poli(g, [[0.1, -0.9], [0.32, -0.7], [0.1, -0.4]], col, '#8a7a4a', 0.02); }
  else if (a.t === 'venda') { }
  if (a.frente && a.t !== 'escudoE' && a.t !== 'cuerno' && a.t !== 'barril') { rect(g, 0.16, -0.62, 0.1, 0.44, 0.04, '#b8c0cc', '#445', 0.02); }
  if (rotas) { linea(g, -0.08, -0.55, 0.05, -0.35, '#222', 0.015); linea(g, 0.05, -0.55, 0.0, -0.42, '#222', 0.015); }
  void gr;
}

/* ---------- terreno y fondos ---------- */
export function fondoMundo(g, m, w, h, t, reducir) {
  const W = MUNDOS[m]; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, W.fondo[0]); gr.addColorStop(1, W.fondo[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = reducir ? 0 : 1;
  if (W.noche) { for (let i = 0; i < 40; i++) { const x = (i * 97.3) % w, y = (i * 53.7) % (h * 0.6); g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i); circ2(g, x, y, 1 + (i % 3) * 0.5, '#fff'); } g.globalAlpha = 1; }
  if (m === 4) { g.fillStyle = 'rgba(40,50,60,0.25)'; for (let i = 0; i < 6; i++) g.fillRect(i * w / 6, h * 0.1, w / 12, h * 0.22); }
  if (m === 3 || m === 9) { g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 26; i++) { const x = ((i * 79 + t * 14 * r) % (w + 20)) - 10, y = ((i * 131 + t * 30 * r) % h); g.fillRect(x, y, 2, 2); } }
  if (m === 7) { g.fillStyle = 'rgba(255,90,20,0.2)'; for (let i = 0; i < 5; i++) { const x = (i + 0.5) * w / 5; g.beginPath(); g.moveTo(x - 40, h * 0.35); g.lineTo(x, h * 0.05 + Math.sin(t + i) * 4 * r); g.lineTo(x + 40, h * 0.35); g.fill(); } }
  if (m === 0 || m === 2) { g.fillStyle = 'rgba(160,100,40,0.18)'; g.beginPath(); g.moveTo(0, h * 0.3); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * 0.28 - Math.sin(x * 0.01) * 14); g.lineTo(w, h * 0.5); g.lineTo(0, h * 0.5); g.fill(); }
  if (m === 5 || m === 8) { g.strokeStyle = 'rgba(100,255,255,0.12)'; g.lineWidth = 1; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(0, i * h / 14 + (t * 8 * r) % 20); g.lineTo(w, i * h / 14 + (t * 8 * r) % 20); g.stroke(); } }
  if (m === 9) { circ2(g, w * 0.8, h * 0.18, h * 0.08, '#4a7ad8'); circ2(g, w * 0.8, h * 0.18, h * 0.065, '#6ad8a0'); }
}
function circ2(g, x, y, r, f) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = f; g.fill(); }
const SUELO = [['#e8c874', '#dcb862'], ['#4aa8c8', '#3a98b8'], ['#d89a58', '#c88a48'], ['#e6f2fa', '#d0e4f2'], ['#8aa87a', '#7a9868'], ['#3a4a6a', '#34425e'], ['#5ab84a', '#4aa83a'], ['#b8884a', '#a87a3e'], ['#3a1a5a', '#2e144a'], ['#8a8a9a', '#7a7a8a']];
export function dibujarCasilla(g, m, r, c, x, y, w, h, cel, t, op = {}) {
  const S = SUELO[m] || SUELO[0]; const agua = cel && cel.ter === 'agua';
  g.fillStyle = (r + c) % 2 ? S[0] : S[1]; g.fillRect(x, y, w + 0.5, h + 0.5);
  if (!cel) return; const ter = cel.ter, cx = x + w / 2, cy = y + h / 2;
  if (ter === 'agua') { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, '#5ad0f0'); gr.addColorStop(1, '#2a8ad0'); g.fillStyle = gr; g.fillRect(x, y, w + 0.5, h + 0.5); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.2; for (let i = 0; i < 2; i++) { g.beginPath(); for (let k = 0; k <= 6; k++) { const px = x + k * w / 6, py = y + h * (0.35 + i * 0.3) + Math.sin(t * 2 + k + c + i) * h * 0.04; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); } }
  else if (ter === 'tumba') { const f = cel.th != null ? cel.th / 100 : 1; g.save(); g.translate(cx, y + h * 0.92); g.scale(w, w); poli(g, [[-0.24, 0], [-0.26, -0.55], [-0.12, -0.78], [0.12, -0.78], [0.26, -0.55], [0.24, 0]], '#9a9a9a', '#444', 0.03); linea(g, 0, -0.62, 0, -0.38, '#555', 0.04); linea(g, -0.08, -0.52, 0.08, -0.52, '#555', 0.04); if (f < 0.7) linea(g, -0.12, -0.7, 0.05, -0.2, '#222', 0.02); if (cel.tt != null && cel.tt < 5) { g.globalCompositeOperation = 'lighter'; circ(g, 0, -0.1, 0.3, 'rgba(120,255,160,0.35)'); g.globalCompositeOperation = 'source-over'; } g.restore(); }
  else if (ter === 'riel') { g.fillStyle = 'rgba(70,45,20,0.45)'; for (let i = 0; i < 5; i++) g.fillRect(x + i * w / 5 + w * 0.05, y + h * 0.32, w * 0.1, h * 0.42); g.fillStyle = '#8a8a96'; g.fillRect(x, y + h * 0.4, w + 0.5, h * 0.05); g.fillRect(x, y + h * 0.62, w + 0.5, h * 0.05); }
  else if (ter === 'hielo') { g.fillStyle = 'rgba(210,240,255,0.65)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + w * 0.2, y + h * 0.3); g.lineTo(x + w * 0.5, y + h * 0.55); g.lineTo(x + w * 0.8, y + h * 0.4); g.stroke(); }
  else if (ter === 'almena') { g.save(); g.translate(x, y + h); g.scale(w, w); rect(g, 0.08, -0.22, 0.84, 0.2, 0.02, '#9a9aa8', '#444', 0.02); for (let i = 0; i < 3; i++) rect(g, 0.1 + i * 0.28, -0.4, 0.2, 0.2, 0.01, '#a8a8b8', '#444', 0.02); g.restore(); }
  else if (ter === 'portal') { const col = (cel.par && (cel.par[0] + cel.par[1]) % 2) ? '#ff7ad8' : '#5ae8ff'; g.save(); g.translate(cx, cy); for (let i = 0; i < 4; i++) { g.rotate(t * (1 + i * 0.3)); g.strokeStyle = col; g.globalAlpha = 0.8 - i * 0.15; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, w * (0.4 - i * 0.07), h * (0.24 - i * 0.04), 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; g.restore(); }
  else if (ter === 'lava') { const f = cel.fase % 9, calor = f > 5.5 ? Math.min(1, (f - 5.5) / 2) : 0; g.fillStyle = '#2a1008'; g.fillRect(x + 2, y + 2, w - 4, h - 4); g.fillStyle = `rgb(${200 + calor * 55},${70 + calor * 90},20)`; g.fillRect(x + 4, y + 4, w - 8, h - 8); if (calor > 0.2) { g.globalCompositeOperation = 'lighter'; circ2(g, cx, cy, w * 0.5 * calor, 'rgba(255,160,40,0.5)'); g.globalCompositeOperation = 'source-over'; } }
  else if (ter === 'pista') { g.fillStyle = 'rgba(60,70,100,0.6)'; g.fillRect(x, y + h * 0.1, w + 0.5, h * 0.8); g.fillStyle = '#ffd94a'; for (let i = 0; i < 3; i++) g.fillRect(x + w * 0.12 + i * w * 0.3, y + h * 0.47, w * 0.18, h * 0.06); }
  if (cel.osc > 0) { g.fillStyle = `rgba(10,0,30,${Math.min(0.7, cel.osc)})`; g.fillRect(x, y, w, h); }
  void agua; void op;
}
export function dibujarOrbe(g, o, x, y, tam, t) {
  g.save(); g.translate(x, y); const pul = 1 + Math.sin(t * 6 + o.id) * 0.06; g.scale(tam * pul, tam * pul);
  if (o.k === 'ch') { g.globalCompositeOperation = 'lighter'; circ(g, 0, 0, 0.5, 'rgba(255,220,80,0.35)'); g.globalCompositeOperation = 'source-over'; circ(g, 0, 0, 0.26, esfera(g, 0, 0, 0.26, '#fff0a0', '#ffb020'), '#a86a00', 0.03); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 2; linea(g, Math.cos(a) * 0.3, Math.sin(a) * 0.3, Math.cos(a) * 0.4, Math.sin(a) * 0.4, '#ffd040', 0.04); } }
  else if (o.k === 'mon') { circ(g, 0, 0, 0.22, esfera(g, 0, 0, 0.22, '#ffe070', '#c88a10'), '#7a5a00', 0.03); g.fillStyle = '#7a5a00'; g.font = 'bold 0.26px sans-serif'; g.textAlign = 'center'; g.fillText('$', 0, 0.09); }
  else if (o.k === 'gema') { poli(g, [[0, -0.28], [0.24, -0.04], [0, 0.28], [-0.24, -0.04]], esfera(g, 0, 0, 0.3, '#9aeaff', '#2a7ad8'), '#145', 0.03); linea(g, -0.24, -0.04, 0.24, -0.04, 'rgba(255,255,255,0.6)', 0.02); }
  else if (o.k === 'verde') { g.globalCompositeOperation = 'lighter'; circ(g, 0, 0, 0.6, 'rgba(100,255,120,0.35)'); g.globalCompositeOperation = 'source-over'; poli(g, [[0, -0.3], [0.09, -0.09], [0.3, 0], [0.09, 0.09], [0, 0.3], [-0.09, 0.09], [-0.3, 0], [-0.09, -0.09]], esfera(g, 0, 0, 0.3, '#caffc0', '#2ad84a'), '#0a6a1a', 0.03); }
  g.restore();
}
export function iconoCanvasPlanta(cv, id, t) { const g = cv.getContext('2d'), w = cv.width; g.clearRect(0, 0, w, cv.height); dibujarPlanta(g, id, w / 2, cv.height * 0.93, w * 0.86, t || 0, { hp: 1 }); }
export function iconoCanvasZombi(cv, tipo, t) { const g = cv.getContext('2d'), w = cv.width, d = Z[tipo]; g.clearRect(0, 0, w, cv.height); const e = (d.vis && d.vis.esc) || 1; dibujarZombi(g, { tipo, id: 1, hp: 1, hpMax: 1, arm: d.arm ? { hp: 1, hpMax: 1, t: d.arm.t, metal: !!d.arm.metal, mont: !!d.arm.mont, frente: !!d.arm.frente } : null, estado: 'anda', x: 5, edad: 0 }, w / 2, cv.height * 0.95, w * 0.8 / Math.max(1, e * 0.9), t || 0, { escala: 1 }); }
