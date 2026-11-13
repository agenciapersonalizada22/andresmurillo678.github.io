// Catalogo de colores, formas y avatares (algunos se desbloquean con monedas virtuales) y dibujo de fichas.
import { TAU } from './util.js';
export const COLORES = [
  { id: 'rojo', c: '#ff4d5a', p: 0 }, { id: 'azul', c: '#3d8bff', p: 0 }, { id: 'verde', c: '#3ddc84', p: 0 }, { id: 'amarillo', c: '#ffd23d', p: 0 },
  { id: 'naranja', c: '#ff8a3d', p: 0 }, { id: 'violeta', c: '#b86bff', p: 0 }, { id: 'cian', c: '#27d3e6', p: 0 }, { id: 'rosa', c: '#ff6bd5', p: 0 },
  { id: 'coral', c: '#ff7f6e', p: 40 }, { id: 'lima', c: '#b6f23a', p: 40 }, { id: 'menta', c: '#7dffd0', p: 60 }, { id: 'plata', c: '#cfd6e6', p: 80 },
  { id: 'granate', c: '#b3123f', p: 80 }, { id: 'marino', c: '#2457d6', p: 100 }, { id: 'oro', c: '#ffc400', p: 150 }, { id: 'neon', c: '#39ff14', p: 200 }
];
export const DALTONICO = ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#ffffff'];
export const FORMAS = [
  { id: 'circulo', n: 'Círculo', p: 0 }, { id: 'cuadrado', n: 'Cuadrado', p: 0 }, { id: 'triangulo', n: 'Triángulo', p: 0 },
  { id: 'rombo', n: 'Rombo', p: 30 }, { id: 'estrella', n: 'Estrella', p: 60 }, { id: 'corazon', n: 'Corazón', p: 90 },
  { id: 'hexagono', n: 'Hexágono', p: 120 }, { id: 'rayo', n: 'Rayo', p: 150 }
];
export const AVATARES = ['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐵', '🐧', '🦄', '🐲', '🤖', '👽', '🐱', '🐶', '🦉', '🐢'];
export const FORMAS_DALTO = ['circulo', 'cuadrado', 'triangulo', 'rombo'];
export const colorDe = (id) => (COLORES.find((c) => c.id === id) || {}).c;

const poli = (g, x, y, r, n, rot) => { g.beginPath(); for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); };
export function trazo(g, forma, x, y, r) {
  switch (forma) {
    case 'cuadrado': g.beginPath(); g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7); break;
    case 'triangulo': poli(g, x, y + r * 0.1, r * 1.1, 3, -Math.PI / 2); break;
    case 'rombo': poli(g, x, y, r * 1.15, 4, 0); break;
    case 'hexagono': poli(g, x, y, r, 6, 0); break;
    case 'estrella': { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r * 1.1; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); break; }
    case 'corazon': g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.1, x, y - r * 0.35); g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.5, y - r * 0.2, x, y + r * 0.9); g.closePath(); break;
    case 'rayo': g.beginPath(); [[0.25, -1], [-0.6, 0.1], [-0.05, 0.1], [-0.3, 1], [0.65, -0.15], [0.05, -0.15], [0.25, -1]].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](x + p[0] * r * 1.1, y + p[1] * r * 1.1)); g.closePath(); break;
    default: g.beginPath(); g.arc(x, y, r, 0, TAU);
  }
}
export const cfg = { brillo: false };
export function ficha(g, forma, x, y, r, color, opc = {}) {
  trazo(g, forma, x, y, r);
  if (cfg.brillo) { g.shadowColor = color; g.shadowBlur = r * 0.9; }
  g.fillStyle = color; g.fill(); g.shadowBlur = 0;
  g.lineWidth = Math.max(1.5, r * 0.12); g.strokeStyle = opc.borde || 'rgba(255,255,255,.85)'; g.stroke();
}
