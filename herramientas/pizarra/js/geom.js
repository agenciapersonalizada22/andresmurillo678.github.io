// Geometria pura: cajas, transformaciones, pruebas de contacto y contorno de trazos.
export const rot = v => v.rot || 0;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const centro = v => [v.x + v.w / 2, v.y + v.h / 2];

export function aLocal(v, px, py) {
  const cx = v.x + v.w / 2, cy = v.y + v.h / 2, r = -rot(v), c = Math.cos(r), s = Math.sin(r), dx = px - cx, dy = py - cy;
  return [dx * c - dy * s + v.w / 2, dx * s + dy * c + v.h / 2];
}
export function aMundo(v, lx, ly) {
  const cx = v.x + v.w / 2, cy = v.y + v.h / 2, r = rot(v), c = Math.cos(r), s = Math.sin(r), dx = lx - v.w / 2, dy = ly - v.h / 2;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}
export function esquinas(v) { return [aMundo(v, 0, 0), aMundo(v, v.w, 0), aMundo(v, v.w, v.h), aMundo(v, 0, v.h)]; }
export function cajaDe(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
export const unir = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
export const cruza = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

// Punto del borde de la caja de un objeto en direccion a (tx,ty), para los conectores.
export function anclaje(v, tx, ty) {
  const [cx, cy] = centro(v);
  const [lx, ly] = aLocal(v, tx, ty);
  const dx = lx - v.w / 2, dy = ly - v.h / 2;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return [cx, cy];
  let t;
  if (v.fm === 'elipse') t = 1 / Math.sqrt((dx / (v.w / 2)) ** 2 + (dy / (v.h / 2)) ** 2);
  else t = Math.min(Math.abs(dx) > 1e-9 ? (v.w / 2) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? (v.h / 2) / Math.abs(dy) : Infinity);
  t = Math.min(t, 1);
  return aMundo(v, v.w / 2 + dx * t, v.h / 2 + dy * t);
}

// Extremos efectivos de un conector (siguen a los objetos a los que estan unidos).
export function extremos(doc, v) {
  const ea = v.ea && doc.obj(v.ea), eb = v.eb && doc.obj(v.eb);
  let pa = v.pa || [0, 0], pb = v.pb || [0, 0];
  const ca = ea ? centro(ea.v) : pa, cb = eb ? centro(eb.v) : pb;
  if (ea) pa = anclaje(ea.v, cb[0], cb[1]);
  if (eb) pb = anclaje(eb.v, ca[0], ca[1]);
  return [pa, pb];
}

export function caja(doc, e) {
  const v = e.v;
  if (v.tipo === 'conector') {
    const [a, b] = extremos(doc, v), m = (v.grosor || 3) / 2 + 6;
    return { x0: Math.min(a[0], b[0]) - m, y0: Math.min(a[1], b[1]) - m, x1: Math.max(a[0], b[0]) + m, y1: Math.max(a[1], b[1]) + m };
  }
  const k = e._bb;
  if (k && k.rev === e.rev) return k.b;
  const b = cajaDe(esquinas(v)), m = v.tipo === 'trazo' ? (v.grosor || 4) / 2 + 1 : v.tipo === 'forma' ? (v.grosor || 3) / 2 + 1 : 0;
  b.x0 -= m; b.y0 -= m; b.x1 += m; b.y1 += m;
  e._bb = { rev: e.rev, b };
  return b;
}
export function cajaGrupo(doc, es) { let b = null; for (const e of es) b = unir(b, caja(doc, e)); return b; }

export function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function puntosTrazo(v) {   // puntos escalados a la caja actual (w,h)
  const p = v.pts || [], sx = v.bw ? v.w / v.bw : 1, sy = v.bh ? v.h / v.bh : 1, r = [];
  for (let i = 0; i + 2 < p.length + 0.5; i += 3) r.push([p[i] * sx, p[i + 1] * sy, p[i + 2]]);
  return r;
}

export function poligonoForma(v) {   // vertices normalizados (0..1) de formas poligonales
  switch (v.fm) {
    case 'tri': return [[0.5, 0], [1, 1], [0, 1]];
    case 'rombo': return [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
    case 'pent': case 'hexa': {
      const n = v.fm === 'pent' ? 5 : 6, r = [];
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; r.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]); }
      return r;
    }
    case 'estrella': {
      const r = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.2 : 0.5; r.push([0.5 + k * Math.cos(a), 0.5 + k * Math.sin(a)]); }
      return r;
    }
  }
  return null;
}

function dentroPoli(pol, x, y) {
  let d = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

// ¿El punto del mundo toca al objeto? tol en unidades del mundo.
export function toca(doc, e, px, py, tol = 4) {
  const v = e.v;
  switch (v.tipo) {
    case 'conector': {
      const [a, b] = extremos(doc, v);
      return distSeg(px, py, a[0], a[1], b[0], b[1]) <= tol + (v.grosor || 3) / 2;
    }
    case 'trazo': {
      const [lx, ly] = aLocal(v, px, py), P = puntosTrazo(v), r = tol + (v.grosor || 4) / 2;
      if (lx < -r || ly < -r || lx > v.w + r || ly > v.h + r) return false;
      if (P.length === 1) return Math.hypot(lx - P[0][0], ly - P[0][1]) <= r;
      for (let i = 1; i < P.length; i++) if (distSeg(lx, ly, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]) <= r) return true;
      return false;
    }
    case 'forma': {
      const [lx, ly] = aLocal(v, px, py), g = (v.grosor || 3) / 2 + tol;
      if (v.fm === 'linea' || v.fm === 'flecha') {
        const a = v.p1 || [0, 0], b = v.p2 || [1, 1];
        return distSeg(lx, ly, a[0] * v.w, a[1] * v.h, b[0] * v.w, b[1] * v.h) <= g;
      }
      const lleno = v.relleno && v.relleno !== 'ninguno';
      if (lx < -g || ly < -g || lx > v.w + g || ly > v.h + g) return false;
      if (v.fm === 'elipse') {
        const nx = (lx - v.w / 2) / (v.w / 2 || 1), ny = (ly - v.h / 2) / (v.h / 2 || 1), d = Math.hypot(nx, ny);
        return lleno ? d <= 1 + g / Math.max(1, v.w / 2) : Math.abs(d - 1) * Math.min(v.w, v.h) / 2 <= g;
      }
      const pol = poligonoForma(v);
      if (pol) {
        const q = pol.map(([a, b]) => [a * v.w, b * v.h]);
        if (lleno) return dentroPoli(q, lx, ly) || q.some((c, i) => distSeg(lx, ly, c[0], c[1], q[(i + 1) % q.length][0], q[(i + 1) % q.length][1]) <= g);
        return q.some((c, i) => distSeg(lx, ly, c[0], c[1], q[(i + 1) % q.length][0], q[(i + 1) % q.length][1]) <= g);
      }
      if (lleno) return true;
      return lx < g || ly < g || lx > v.w - g || ly > v.h - g;
    }
    default: {
      const [lx, ly] = aLocal(v, px, py);
      return lx >= -tol && ly >= -tol && lx <= v.w + tol && ly <= v.h + tol;
    }
  }
}

export function rdp(P, eps) {   // P: [[x,y],...]
  if (P.length < 3) return P.slice();
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const pila = [[0, P.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let dm = 0, im = -1;
    for (let k = i + 1; k < j; k++) { const d = distSeg(P[k][0], P[k][1], P[i][0], P[i][1], P[j][0], P[j][1]); if (d > dm) { dm = d; im = k; } }
    if (dm > eps && im > 0) { keep[im] = 1; pila.push([i, im], [im, j]); }
  }
  return P.filter((_, i) => keep[i]);
}

const r1 = n => Math.round(n * 10) / 10;
// Contorno relleno de un trazo con ancho variable (presion). pts: [[x,y,p],...]. Devuelve cadena "d" SVG.
export function contornoTrazo(P, grosor, plano = false) {
  const n = P.length;
  if (!n) return '';
  const rad = i => (plano ? grosor : grosor * (0.3 + 0.7 * (P[i][2] == null ? 0.6 : P[i][2]))) / 2;
  if (n === 1) {
    const r = Math.max(0.6, rad(0)), [x, y] = P[0];
    return `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
  }
  const izq = [], der = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const r = Math.max(0.5, rad(i));
    izq.push([P[i][0] - dy * r, P[i][1] + dx * r]); der.push([P[i][0] + dy * r, P[i][1] - dx * r]);
  }
  const cab = (c, from, to, r, ang0) => {   // tapa semicircular
    const out = [];
    for (let k = 1; k < 6; k++) { const a = ang0 + (k * Math.PI) / 6; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
    return out;
  };
  const f = P[0], g = P[1], u = P[n - 1], t = P[n - 2];
  const aIni = Math.atan2(g[1] - f[1], g[0] - f[0]), aFin = Math.atan2(u[1] - t[1], u[0] - t[0]);
  const tapaFin = cab(u, 0, 0, Math.max(0.5, rad(n - 1)), aFin - Math.PI / 2);
  const tapaIni = cab(f, 0, 0, Math.max(0.5, rad(0)), aIni + Math.PI / 2);
  const poly = [...izq, ...tapaFin, ...der.reverse(), ...tapaIni];
  let d = `M${r1(poly[0][0])} ${r1(poly[0][1])}`;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    d += `Q${r1(a[0])} ${r1(a[1])} ${r1((a[0] + b[0]) / 2)} ${r1((a[1] + b[1]) / 2)}`;
  }
  return d + 'Z';
}

// Reduce un trazo (lista plana x,y,p) para que quepa en un mensaje de red.
export function simplificarPlano(flat, eps = 0.35) {
  const P = []; for (let i = 0; i + 2 < flat.length + 0.5; i += 3) P.push([flat[i], flat[i + 1], flat[i + 2]]);
  let S = P;
  for (let it = 0; it < 24 && S.length > 2; it++) {
    S = rdpP(P, eps); if (S.length * 14 < 9500) break; eps *= 1.7;
  }
  const out = []; for (const q of S) out.push(r1(q[0]), r1(q[1]), Math.round(q[2] * 100) / 100);
  return out;
}
function rdpP(P, eps) {
  if (P.length < 3) return P.slice();
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const pila = [[0, P.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let dm = 0, im = -1;
    for (let k = i + 1; k < j; k++) { const d = distSeg(P[k][0], P[k][1], P[i][0], P[i][1], P[j][0], P[j][1]) + Math.abs(P[k][2] - P[i][2]) * 0.8; if (d > dm) { dm = d; im = k; } }
    if (dm > eps && im > 0) { keep[im] = 1; pila.push([i, im], [im, j]); }
  }
  return P.filter((_, i) => keep[i]);
}
