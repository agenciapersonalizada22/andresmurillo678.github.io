// Grafica de lineas en canvas propio. Cada serie usa color Y forma de marcador distintos (no depende solo del color).
import { D } from './ajustes.js';
const marca = (g, tipo, x, y, r) => {
  g.beginPath();
  if (tipo === '○') g.arc(x, y, r, 0, 6.283);
  else if (tipo === '□') g.rect(x - r, y - r, r * 2, r * 2);
  else if (tipo === '△') { g.moveTo(x, y - r - 1); g.lineTo(x + r + 1, y + r); g.lineTo(x - r - 1, y + r); g.closePath(); }
  else if (tipo === '◇') { g.moveTo(x, y - r - 1); g.lineTo(x + r + 1, y); g.lineTo(x, y + r + 1); g.lineTo(x - r - 1, y); g.closePath(); }
  else { g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); }
  g.fill(); g.stroke();
};
export function dibujar(canvas, series, o = {}) {
  const css = getComputedStyle(document.body), col = (v, d) => css.getPropertyValue(v).trim() || d;
  const W = canvas.clientWidth || 320, H = o.alto || 200, r = Math.min(2, window.devicePixelRatio || 1) * D.resolucion;
  canvas.width = Math.round(W * r); canvas.height = Math.round(H * r); canvas.style.height = H + 'px';
  const g = canvas.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H);
  const txt = col('--txt', '#eee'), suave = col('--suave', '#99a'), borde = col('--borde', '#556');
  const pts = series.flatMap((s) => s.puntos);
  g.font = '11px system-ui, sans-serif'; g.textBaseline = 'middle';
  if (!pts.length) { g.fillStyle = suave; g.textAlign = 'center'; g.fillText(o.vacio || 'Aún no hay datos: juega para ver tu progreso.', W / 2, H / 2); return; }
  const max = o.max || Math.max(10, Math.ceil(Math.max(...pts.map((p) => p.v)) * 1.1 / 10) * 10), min = o.min != null ? o.min : 0;
  const L = 38, Rr = 10, T = 10, B = 24, w = W - L - Rr, hh = H - T - B;
  const n = Math.max(2, ...series.map((s) => s.puntos.length));
  const X = (i, len) => L + (len <= 1 ? w / 2 : (i / (len - 1)) * w), Y = (v) => T + hh - ((v - min) / (max - min)) * hh;
  g.strokeStyle = borde; g.lineWidth = 1; g.fillStyle = suave; g.textAlign = 'right';
  for (let k = 0; k <= 4; k++) { const v = min + ((max - min) * k) / 4, y = Y(v); g.globalAlpha = 0.45; g.beginPath(); g.moveTo(L, y); g.lineTo(W - Rr, y); g.stroke(); g.globalAlpha = 1; g.fillText(String(Math.round(v)), L - 5, y); }
  g.textAlign = 'center'; g.fillText(o.xIzq || 'Inicio', L, H - 8); g.fillText(o.xDer || 'Reciente', W - Rr - 8, H - 8);
  series.forEach((s) => {
    if (!s.puntos.length) return;
    g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = 2; g.beginPath();
    s.puntos.forEach((p, i) => { const x = X(i, s.puntos.length), y = Y(p.v); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.stroke();
    g.fillStyle = col('--fondo', '#111'); g.lineWidth = 2;
    const paso = Math.ceil(s.puntos.length / 24);
    s.puntos.forEach((p, i) => { if (i % paso === 0 || i === s.puntos.length - 1) marca(g, s.marca || '○', X(i, s.puntos.length), Y(p.v), 3.5); });
  });
  g.fillStyle = txt;
}
export function resumen(series) {
  return series.filter((s) => s.puntos.length).map((s) => `${s.nombre}: ${s.puntos.length} registros, último ${s.puntos[s.puntos.length - 1].v}, mejor ${Math.max(...s.puntos.map((p) => p.v))}`).join('. ') || 'Sin datos todavía.';
}
