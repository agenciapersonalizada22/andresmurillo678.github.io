// Utilidades puras (sin DOM): azar con semilla, geometria y dibujo de apoyo.
export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.entre = (a, b) => a + f() * (b - a);
  f.int = (n) => Math.floor(f() * n);
  f.elige = (l) => l[Math.floor(f() * l.length)];
  f.baraja = (l) => { const r = l.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  f.gauss = () => { let u = 0, v = 0; while (!u) u = f(); while (!v) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  return f;
}
/* Puestos (1 = mejor) a partir de puntajes (mayor es mejor); los empates comparten puesto. */
export function puestos(pts) {
  return pts.map((p) => 1 + pts.filter((q) => q > p + 1e-9).length);
}
/* Vecino mas cercano en una direccion (cursor de teclado/mando sobre puntos sueltos). */
export function vecino(puntos, actual, dx, dy, libre = () => true) {
  const a = puntos[actual]; let mejor = -1, mp = 1e18;
  puntos.forEach((p, i) => {
    if (i === actual || !libre(i)) return;
    const vx = p.x - a.x, vy = p.y - a.y, d = Math.hypot(vx, vy); if (!d) return;
    const cos = (vx * dx + vy * dy) / d; if (cos < 0.45) return;
    const pun = d * (2 - cos); if (pun < mp) { mp = pun; mejor = i; }
  });
  return mejor;
}
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function texto(g, s, x, y, tam, color = '#fff', alin = 'center', peso = 800) {
  g.font = peso + ' ' + Math.round(tam) + 'px Orbitron, system-ui, sans-serif'; g.textAlign = alin; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(String(s), x, y);
}
/* Dibuja fn en el marco local de la zona (0,0,w,h) orientado hacia su jugador. */
export function dentroZona(g, z, fn) {
  g.save(); g.translate(z.x + z.w / 2, z.y + z.h / 2); g.rotate(z.rot || 0); g.translate(-z.w / 2, -z.h / 2);
  g.beginPath(); g.rect(0, 0, z.w, z.h); g.clip(); fn(z.w, z.h); g.restore();
}
export const aLocal = (z, x, y) => ((z.rot || 0) ? { x: z.w - (x - z.x), y: z.h - (y - z.y) } : { x: x - z.x, y: y - z.y });
export const aMundo = (z, lx, ly) => ((z.rot || 0) ? { x: z.x + z.w - lx, y: z.y + z.h - ly } : { x: z.x + lx, y: z.y + ly });
export const girar = (z, dx, dy) => ((z.rot || 0) ? [-dx, -dy] : [dx, dy]);
export const formaDe = (c, i) => (c.forma ? c.forma(c.jug[i], i) : c.jug[i].forma || 'circulo');
/* Punto de salida de cada asiento: hacia el centro de su zona. */
export function salidas(c, frac) {
  const cx = c.W / 2, cy = c.H / 2, R = frac;
  return c.zonas.map((z, i) => { let dx = z.cx - cx, dy = z.cy - cy; const m = Math.hypot(dx, dy); if (m < 1) { const a = (i / c.n) * TAU + 0.6; dx = Math.cos(a); dy = Math.sin(a); } else { dx /= m; dy /= m; } return { x: cx + dx * R, y: cy + dy * R }; });
}
