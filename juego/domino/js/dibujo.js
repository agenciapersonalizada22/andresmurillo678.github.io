// Dibujo vectorial de fichas en canvas 2D (sin imagenes): caras con puntos, dorsos, fantasmas de colocacion y fieltros de mesa.
export const TEMAS_FICHA = {
  marfil: { nombre: 'Marfil', cara: ['#fbf7ea', '#e9e1c8'], borde: '#b9ae8c', pip: '#17171a', raya: '#8b8160', clavo: '#c79a2b', dorso: ['#2b4a8f', '#182c5a'] },
  negro: { nombre: 'Ébano', cara: ['#34343c', '#16161b'], borde: '#05050a', pip: '#f6f6f2', raya: '#7c7c88', clavo: '#d9b24a', dorso: ['#7a1f2b', '#431018'] },
  jade: { nombre: 'Jade', cara: ['#cfeede', '#8fcdb0'], borde: '#4b8a6c', pip: '#0f3a2a', raya: '#2f6b50', clavo: '#e0c050', dorso: ['#1f6f55', '#0f3b2d'] },
  rubi: { nombre: 'Rubí', cara: ['#f6dcdc', '#dba2a2'], borde: '#9a4a4a', pip: '#3a0d12', raya: '#7a2f36', clavo: '#e8c35a', dorso: ['#3a3a44', '#1d1d24'] }
};
export const TEMAS_MESA = {
  fieltro: { nombre: 'Fieltro verde', c0: '#23865a', c1: '#0c3a26', borde: '#4a2e1a' },
  azul: { nombre: 'Azul noche', c0: '#2a5aa6', c1: '#0e234a', borde: '#2a2a3a' },
  granate: { nombre: 'Granate', c0: '#9a2f45', c1: '#3c0f1d', borde: '#2e1a14' },
  madera: { nombre: 'Madera', c0: '#a8743e', c1: '#4d2f15', borde: '#2a170a' }
};
const PIP_COLOR = ['#17171a', '#2f6fe0', '#e04848', '#2fa84f', '#e08a1a', '#8a4fe0', '#17171a', '#d6336c', '#0e9aa7', '#7a5a1a', '#5a6a7a', '#a8451a', '#1a7a5a'];
const PIP_DALTO = ['#000000', '#0072b2', '#d55e00', '#009e73', '#e69f00', '#cc79a7', '#56b4e9', '#f0e442', '#882255', '#44aa99', '#117733', '#332288', '#aa4499'];

const GRID = [[-1, -1], [1, 1], [1, -1], [-1, 1]];
export function puntos(n) {
  switch (n) {
    case 0: return [];
    case 1: return [[0, 0]];
    case 2: return [[-1, -1], [1, 1]];
    case 3: return [[-1, -1], [0, 0], [1, 1]];
    case 4: return GRID;
    case 5: return [...GRID, [0, 0]];
    case 6: return [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]];
    case 7: return [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, 0]];
    case 8: return [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, -1], [0, 1]];
    case 9: return [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, -1], [0, 1], [0, 0]];
    default: {
      const r = [], f = [-1, -1 / 3, 1 / 3, 1];
      for (const x of [-1, 0, 1]) for (const y of f) r.push([x, y]);
      return n === 12 ? r : n === 11 ? r.filter((p) => !(p[0] === 0 && p[1] === -1 / 3)) : r.filter((p) => !(p[0] === 0 && (p[1] === -1 / 3 || p[1] === 1 / 3)));
    }
  }
}
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}

// o: {x, y, ang, len (lado largo), a, b (a en el lado -x), tema, pips:'negro'|'color'|'dalto', numeros, sombra, detalle (bool), alpha, brillo (0..1), halo (color)}
export function ficha(c, o) {
  const len = o.len, w = len / 2, T = TEMAS_FICHA[o.tema] || TEMAS_FICHA.marfil;
  c.save();
  c.translate(o.x, o.y); c.rotate(o.ang || 0);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (o.sombra) { c.fillStyle = 'rgba(0,0,0,.34)'; rr(c, -len / 2 + len * 0.03, -w / 2 + len * 0.05, len, w, w * 0.16); c.fill(); }
  if (o.halo) { c.shadowColor = o.halo; c.shadowBlur = Math.max(6, len * 0.22); }
  if (o.detalle) { const g = c.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, T.cara[0]); g.addColorStop(1, T.cara[1]); c.fillStyle = g; } else c.fillStyle = T.cara[0];
  rr(c, -len / 2, -w / 2, len, w, w * 0.16); c.fill();
  c.shadowBlur = 0; c.shadowColor = 'transparent';
  c.lineWidth = Math.max(1, len * 0.02); c.strokeStyle = T.borde; c.stroke();
  if (o.brillo) { c.fillStyle = o.brillo > 0 ? 'rgba(255,255,255,' + 0.22 * o.brillo + ')' : 'rgba(0,0,40,' + 0.45 * -o.brillo + ')'; rr(c, -len / 2, -w / 2, len, w, w * 0.16); c.fill(); }
  c.strokeStyle = T.raya; c.lineWidth = Math.max(1, len * 0.022);
  c.beginPath(); c.moveTo(0, -w * 0.36); c.lineTo(0, w * 0.36); c.stroke();
  if (len > 26) { c.fillStyle = T.clavo; c.beginPath(); c.arc(0, 0, w * 0.06, 0, 6.283); c.fill(); }
  for (const [v, sg] of [[o.a, -1], [o.b, 1]]) mitad(c, v, sg * len / 4, w, T, o);
  c.restore();
}
function mitad(c, v, cx, w, T, o) {
  const s = w * 0.42;
  const col = o.pips === 'color' ? PIP_COLOR[v] : o.pips === 'dalto' ? PIP_DALTO[v] : T.pip;
  c.fillStyle = col;
  if (o.numeros) {
    c.font = '800 ' + Math.round(w * 0.78) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(cx, 0); c.rotate(-(o.ang || 0)); c.fillText(String(v), 0, 0); c.restore();
    return;
  }
  const p = puntos(v), r = v > 9 ? s * 0.13 : v > 6 ? s * 0.17 : s * 0.2;
  const sx = v > 9 ? s * 0.85 : s, sy = v > 9 ? s * 0.95 : s;
  for (const q of p) { c.beginPath(); c.arc(cx + q[0] * sx, q[1] * sy, r, 0, 6.283); c.fill(); }
  if (o.detalle && p.length) { c.fillStyle = 'rgba(255,255,255,.28)'; for (const q of p) { c.beginPath(); c.arc(cx + q[0] * sx - r * 0.3, q[1] * sy - r * 0.3, r * 0.3, 0, 6.283); c.fill(); } }
}

export function dorso(c, o) {
  const len = o.len, w = len / 2, T = TEMAS_FICHA[o.tema] || TEMAS_FICHA.marfil;
  c.save(); c.translate(o.x, o.y); c.rotate(o.ang || 0);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (o.sombra) { c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -len / 2 + len * 0.03, -w / 2 + len * 0.05, len, w, w * 0.16); c.fill(); }
  const g = c.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, T.dorso[0]); g.addColorStop(1, T.dorso[1]);
  c.fillStyle = g; rr(c, -len / 2, -w / 2, len, w, w * 0.16); c.fill();
  c.lineWidth = Math.max(1, len * 0.03); c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = Math.max(1, len * 0.025); c.beginPath(); c.moveTo(0, -w * 0.3); c.lineTo(0, w * 0.3); c.stroke();
  c.restore();
}

export function fantasma(c, o) {
  const len = o.len, w = len / 2;
  c.save(); c.translate(o.x, o.y); c.rotate(o.ang || 0);
  const p = o.pulso || 0;
  c.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (0.55 + 0.35 * p);
  c.shadowColor = o.color; c.shadowBlur = len * 0.3;
  c.fillStyle = o.color + '33'; rr(c, -len / 2, -w / 2, len, w, w * 0.16); c.fill();
  c.setLineDash([len * 0.1, len * 0.07]); c.lineWidth = Math.max(2, len * 0.045); c.strokeStyle = o.color; c.stroke();
  c.restore();
}

export function fieltro(c, ancho, alto, tema, detalle) {
  const T = TEMAS_MESA[tema] || TEMAS_MESA.fieltro;
  const g = c.createRadialGradient(ancho / 2, alto * 0.45, Math.min(ancho, alto) * 0.1, ancho / 2, alto * 0.5, Math.max(ancho, alto) * 0.75);
  g.addColorStop(0, T.c0); g.addColorStop(1, T.c1);
  c.fillStyle = g; c.fillRect(0, 0, ancho, alto);
  if (detalle) {
    const n = Math.round(ancho * alto / 90);
    for (let i = 0; i < n; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; c.fillRect(Math.random() * ancho, Math.random() * alto, 1.4, 1.4); }
  }
  const v = c.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.4, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  c.fillStyle = v; c.fillRect(0, 0, ancho, alto);
}
