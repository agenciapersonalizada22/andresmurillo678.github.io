// =============================================================
//  🗺️  MAPA DEL SISTEMA SOLAR (dibujo en un canvas 2D, vista 2D o 3D)
//  Muestra las órbitas (escala comprimida de sistemaSolar.js), cada
//  cuerpo en su posición actual y la selección. Sin dependencias.
// =============================================================
import { PLANETAS, LUNAS, FISICA, ELEMENTOS, posicion, posicionReal, dJ, diaSolar, distancia } from './sistemaSolar.js';

const orbitas = {};
function curvaOrbita(id) {
  if (orbitas[id]) return orbitas[id];
  const el = ELEMENTOS[id], pts = [], N = 120, d0 = diaSolar(0);
  for (let i = 0; i <= N; i++) {
    const r = posicionReal(id, d0 + el.P * 365.25 * i / N), k = dJ(r.r) / (r.r || 1);
    pts.push([r.x * k, r.y * k, r.z * k * 0.5]);
  }
  return (orbitas[id] = pts);
}

export const RADIOS_ZOOM = { interior: 215, todo: 580 };
const ABREV = { cinturon: 'Cinturón', kuiper: 'Kuiper' };

// Proyecta un punto del sistema (x, y, z en uj) a pantalla según el modo
function proyectar(o, x, y, z, w, h) {
  const R = RADIOS_ZOOM[o.zoom] || RADIOS_ZOOM.todo, esc = Math.min(w, h) * 0.46 / R;
  if (!o.modo3d) return { x: w / 2 + x * esc, y: h / 2 - y * esc, p: 1 };
  const ca = Math.cos(o.rot), sa = Math.sin(o.rot), cx = x * ca - y * sa, cy = x * sa + y * ca;
  const t = 0.8, ct = Math.cos(t), st = Math.sin(t);       // inclinación de la vista
  const py = cy * ct - z * 3 * st, pz = cy * st + z * 3 * ct;
  return { x: w / 2 + cx * esc, y: h / 2 - py * esc * 0.85, p: 1 + pz / 1500 };
}

// Devuelve la lista de cuerpos dibujados con su posición en pantalla (para elegir con el clic)
export function dibujar(cv, o) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.clearRect(0, 0, w, h);
  const fondo = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
  fondo.addColorStop(0, '#0b1830'); fondo.addColorStop(1, '#02050c');
  g.fillStyle = fondo; g.fillRect(0, 0, w, h);
  // estrellas fijas
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) g.fillRect((i * 97.3) % w, (i * 53.7 + i * i * 3.1) % h, 1, 1);
  const R = RADIOS_ZOOM[o.zoom] || RADIOS_ZOOM.todo;
  // órbitas
  g.lineWidth = 1;
  for (const id of PLANETAS) {
    const c = curvaOrbita(id);
    if (dJ(ELEMENTOS[id].a) > R * 1.5) continue;
    g.strokeStyle = id === 'cinturon' || id === 'kuiper' ? 'rgba(180,170,150,0.35)' : 'rgba(120,170,230,0.28)';
    g.setLineDash(id === 'cinturon' || id === 'kuiper' ? [2, 5] : []);
    g.beginPath();
    c.forEach((p, i) => { const s = proyectar(o, p[0], p[1], p[2], w, h); if (i) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); });
    g.stroke();
  }
  g.setLineDash([]);
  const cuerpos = [];
  const sol = proyectar(o, 0, 0, 0, w, h);
  const halo = g.createRadialGradient(sol.x, sol.y, 1, sol.x, sol.y, 22);
  halo.addColorStop(0, '#fff3b0'); halo.addColorStop(0.3, 'rgba(255,200,80,0.7)'); halo.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(sol.x, sol.y, 22, 0, 7); g.fill();
  cuerpos.push({ id: 'sol', x: sol.x, y: sol.y, r: 14 });
  const lista = [...PLANETAS.filter((p) => p !== 'cinturon' && p !== 'kuiper'), ...(R > 300 ? ['cinturon', 'kuiper'] : ['cinturon']), ...Object.keys(LUNAS)];
  const fuera = (p) => Math.hypot(p.x, p.y) > R * 1.6;
  for (const id of lista) {
    const lu = LUNAS[id];
    const p = posicion(id, o.diaAbs);
    if (fuera(p)) continue;
    const s = proyectar(o, p.x, p.y, p.z, w, h);
    const F = FISICA[id];
    // cinturones: anillo de puntos
    if (id === 'cinturon' || id === 'kuiper') {
      g.fillStyle = id === 'cinturon' ? 'rgba(200,190,160,0.5)' : 'rgba(140,170,200,0.4)';
      const rr = dJ(ELEMENTOS[id].a);
      for (let i = 0; i < 70; i++) { const hh = (k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }; const a = hh(1) * 6.2832, r2 = rr + (hh(2) - 0.5) * (id === 'cinturon' ? 16 : 34); const q = proyectar(o, Math.cos(a) * r2, Math.sin(a) * r2, 0, w, h); g.beginPath(); g.arc(q.x, q.y, 1.1, 0, 7); g.fill(); }
    }
    const sel = o.sel === id, esLuna = !!lu;
    if (esLuna && R > 300) continue;       // en la vista completa las lunas se esconden
    const rad = (esLuna ? 2.2 : id === 'jupiter' || id === 'saturno' ? 6 : id === 'urano' || id === 'neptuno' ? 5 : id === 'cinturon' || id === 'kuiper' ? 4 : 4.5) * (o.modo3d ? s.p : 1);
    if (id !== 'cinturon' && id !== 'kuiper') { g.fillStyle = F.color; g.beginPath(); g.arc(s.x, s.y, rad, 0, 7); g.fill(); }
    if (F.anillos && id === 'saturno') { g.strokeStyle = 'rgba(230,210,150,0.8)'; g.beginPath(); g.ellipse(s.x, s.y, rad * 2, rad * 0.7, -0.3, 0, 7); g.stroke(); }
    if (o.modo3d && p.z && !esLuna) { const b = proyectar(o, p.x, p.y, 0, w, h); g.strokeStyle = 'rgba(160,200,255,0.25)'; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(b.x, b.y); g.stroke(); }
    if (sel || o.origen === id || o.destino === id) {
      g.strokeStyle = o.destino === id || sel ? '#ffd23d' : '#5be9ff'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, rad + 5, 0, 7); g.stroke(); g.lineWidth = 1;
    }
    if (!esLuna || sel) { g.fillStyle = sel ? '#ffe9a8' : '#cfe4ff'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(ABREV[id] || F.nombre, s.x + rad + 4, s.y + 4); }
    cuerpos.push({ id, x: s.x, y: s.y, r: Math.max(12, rad + 6) });
  }
  // ruta elegida
  if (o.origen && o.destino && o.origen !== o.destino) {
    const a = o.destino === 'sol' ? { x: 0, y: 0, z: 0 } : posicion(o.destino, o.diaAbs), b = o.origen === 'sol' ? { x: 0, y: 0, z: 0 } : posicion(o.origen, o.diaAbs);
    const pa = proyectar(o, a.x, a.y, a.z, w, h), pb = proyectar(o, b.x, b.y, b.z, w, h);
    g.strokeStyle = '#ffd23d'; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(pb.x, pb.y); g.lineTo(pa.x, pa.y); g.stroke(); g.setLineDash([]);
  }
  // posición de la nave en tránsito
  if (o.nave) { const s = proyectar(o, o.nave.x, o.nave.y, 0, w, h); g.fillStyle = '#ffd23d'; g.beginPath(); g.moveTo(s.x, s.y - 7); g.lineTo(s.x + 5, s.y + 5); g.lineTo(s.x - 5, s.y + 5); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(160,200,240,0.8)'; g.font = '10px system-ui, sans-serif'; g.textAlign = 'right';
  g.fillText('escala comprimida · ' + (o.modo3d ? '3D' : '2D') + (o.zoom === 'interior' ? ' · sistema interior' : ' · sistema completo'), w - 8, h - 8);
  return cuerpos;
}

export function elegir(cuerpos, x, y) {
  let mejor = null, md = 1e9;
  for (const c of cuerpos) { const d = Math.hypot(c.x - x, c.y - y); if (d < c.r && d < md) { md = d; mejor = c.id; } }
  return mejor;
}
export { distancia };
