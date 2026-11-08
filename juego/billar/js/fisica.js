// Fisica de billar (sin DOM, determinista): bolas con giro, rozamiento deslizante/rodante, choques bola-bola y banda con efecto, troneras.
// Unidades SI. Eje x = largo de la mesa, y = ancho. Estado S = { geo, R, bolas[], t, ev[] }.
export const GRAV = 9.81;
export const DT = 1 / 480;
export const VMAX = 7.5;
export const TIPOS = {
  pool: { L: 2.54, W: 1.27, R: 0.02858, tronera: true },
  carambola: { L: 2.84, W: 1.42, R: 0.03075, tronera: false }
};
export const MAT = { mu: 0.2, mur: 0.025, mups: 0.044, eBola: 0.96, muBola: 0.05, muBanda: 0.14 };

export function geometria(tipo) {
  const T = TIPOS[tipo], hx = T.L / 2, hy = T.W / 2, segs = [];
  const add = (ax, ay, bx, by, nx, ny) => segs.push({ ax, ay, bx, by, nx, ny });
  let tron = [];
  if (T.tronera) {
    const g = 0.085, s = 0.062;
    add(-hx + g, hy, -s, hy, 0, -1); add(s, hy, hx - g, hy, 0, -1);
    add(-hx + g, -hy, -s, -hy, 0, 1); add(s, -hy, hx - g, -hy, 0, 1);
    add(-hx, -hy + g, -hx, hy - g, 1, 0); add(hx, -hy + g, hx, hy - g, -1, 0);
    tron = [[-hx, -hy], [0, -hy], [hx, -hy], [-hx, hy], [0, hy], [hx, hy]];
  } else {
    add(-hx, hy, hx, hy, 0, -1); add(-hx, -hy, hx, -hy, 0, 1); add(-hx, -hy, -hx, hy, 1, 0); add(hx, -hy, hx, hy, -1, 0);
  }
  return { tipo, L: T.L, W: T.W, hx, hy, R: T.R, segs, tron, conTroneras: T.tronera };
}

export function nuevaBola(id, x, y) {
  return { id, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, activa: true, emb: -1, mov: false };
}
export function nuevoEstado(tipo, bolas) {
  const geo = geometria(tipo);
  return { geo, R: geo.R, bolas: bolas || [], t: 0, ev: [] };
}
export function clonar(S) {
  return { geo: S.geo, R: S.R, t: S.t, ev: [], bolas: S.bolas.map((b) => ({ ...b })) };
}
export const bola = (S, id) => S.bolas.find((b) => b.id === id);
export function instantanea(S) {
  return S.bolas.map((b) => [b.id, +b.x.toFixed(5), +b.y.toFixed(5), b.activa ? 1 : 0, b.emb]);
}
export function aplicarInstantanea(S, snap) {
  for (const [id, x, y, act, emb] of snap) {
    const b = bola(S, id); if (!b) continue;
    b.x = x; b.y = y; b.activa = !!act; b.emb = emb; b.vx = b.vy = b.wx = b.wy = b.wz = 0; b.mov = false;
  }
}

/* Golpe de taco: dir (angulo en rad), potencia 0..1, (a,b) punto de impacto en fraccion de R (a derecha, b arriba). */
export function golpear(S, id, ang, pot, a = 0, b = 0) {
  const c = bola(S, id), R = S.R;
  const v0 = VMAX * Math.max(0, Math.min(1, pot));
  const fx = Math.cos(ang), fy = Math.sin(ang);
  c.vx = fx * v0; c.vy = fy * v0;
  const k = 2.5 * v0 / R;
  c.wz = k * a;
  c.wx = k * b * -fy; c.wy = k * b * fx; // b*(z x f) = b*(-fy, fx)
  c.mov = true;
}

function friccion(b, dt, R) {
  const m = MAT;
  const ux = b.vx - R * b.wy, uy = b.vy + R * b.wx, um = Math.hypot(ux, uy);
  let rueda = true;
  if (um > 1e-5) {
    const ts = Math.min(dt, um / (3.5 * m.mu * GRAV));
    const k = 2.5 * m.mu * GRAV / R, nx = ux / um, ny = uy / um;
    b.vx -= m.mu * GRAV * nx * ts; b.vy -= m.mu * GRAV * ny * ts;
    b.wx -= k * ny * ts; b.wy += k * nx * ts;
    if (ts >= dt) rueda = false;
  }
  if (rueda) {
    const s = Math.hypot(b.vx, b.vy), dec = m.mur * GRAV * dt;
    if (s <= dec + 0.0008) { b.vx = b.vy = b.wx = b.wy = 0; } else { const f = (s - dec) / s; b.vx *= f; b.vy *= f; b.wy = b.vx / R; b.wx = -b.vy / R; }
  }
  if (b.wz !== 0) {
    const d = 2.5 * m.mups * GRAV / R * dt;
    b.wz = Math.abs(b.wz) <= d ? 0 : b.wz - Math.sign(b.wz) * d;
  }
  b.mov = b.vx !== 0 || b.vy !== 0 || b.wx !== 0 || b.wy !== 0 || b.wz !== 0;
}

function colBola(S, a, b) {
  const R = S.R, D = 2 * R;
  let dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= D * D) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-9) { dx = 1; dy = 0; d = 1e-9; }
  const nx = dx / d, ny = dy / d, ov = (D - d) / 2;
  a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
  const un = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (un <= 0) return false;
  const J = (1 + MAT.eBola) * un / 2;
  a.vx -= J * nx; a.vy -= J * ny; b.vx += J * nx; b.vy += J * ny;
  const tx = -ny, ty = nx;
  const ut = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty + R * (a.wz + b.wz);
  const lim = MAT.muBola * J, Jt = Math.max(-lim, Math.min(lim, ut / 7));
  a.vx -= Jt * tx; a.vy -= Jt * ty; b.vx += Jt * tx; b.vy += Jt * ty;
  const dw = -2.5 * Jt / R; a.wz += dw; b.wz += dw;
  a.mov = b.mov = true;
  S.ev.push({ t: S.t, k: 'bola', a: a.id, b: b.id, v: un });
  return true;
}

function colBanda(S, b) {
  const R = S.R, segs = S.geo.segs;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i], ex = s.bx - s.ax, ey = s.by - s.ay, l2 = ex * ex + ey * ey;
    let t = ((b.x - s.ax) * ex + (b.y - s.ay) * ey) / l2;
    const fin = t <= 0 || t >= 1;
    t = Math.max(0, Math.min(1, t));
    const px = s.ax + ex * t, py = s.ay + ey * t;
    let dx = b.x - px, dy = b.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) continue;
    let nx, ny;
    if (fin) { const d = Math.sqrt(d2) || 1e-9; nx = dx / d; ny = dy / d; } else { nx = s.nx; ny = s.ny; if (dx * nx + dy * ny < -R) continue; }
    b.x = px + nx * R; b.y = py + ny * R;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) continue;
    const e = Math.max(0.55, 0.82 - 0.03 * -vn), Jn = (1 + e) * -vn;
    b.vx += Jn * nx; b.vy += Jn * ny;
    const tx = -ny, ty = nx, ut = b.vx * tx + b.vy * ty - R * b.wz;
    const lim = MAT.muBanda * Jn, Jt = -Math.max(-lim, Math.min(lim, ut / 3.5));
    b.vx += Jt * tx; b.vy += Jt * ty; b.wz += -2.5 * Jt / R;
    b.mov = true;
    S.ev.push({ t: S.t, k: 'banda', a: b.id, v: -vn, s: i });
  }
}

function tronera(S, b) {
  const g = S.geo;
  if (!g.conTroneras) return;
  if (Math.abs(b.x) <= g.hx && Math.abs(b.y) <= g.hy) return;
  let mejor = 0, md = 1e9;
  g.tron.forEach((p, i) => { const d = Math.hypot(b.x - p[0], b.y - p[1]); if (d < md) { md = d; mejor = i; } });
  b.activa = false; b.emb = mejor; b.vx = b.vy = b.wx = b.wy = b.wz = 0; b.mov = false;
  S.ev.push({ t: S.t, k: 'tronera', a: b.id, p: mejor });
}

export function paso(S, dt = DT) {
  const bs = S.bolas, R = S.R;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (!b.activa || !b.mov) continue;
    friccion(b, dt, R);
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  for (let pasada = 0; pasada < 2; pasada++) {
    let hubo = false;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i]; if (!a.activa) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const b = bs[j]; if (!b.activa || (!a.mov && !b.mov)) continue;
        if (colBola(S, a, b)) hubo = true;
      }
    }
    if (!hubo) break;
  }
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]; if (!b.activa || !b.mov) continue;
    colBanda(S, b); tronera(S, b);
  }
  S.t += dt;
}
export const enReposo = (S) => S.bolas.every((b) => !b.activa || !b.mov);

export function simular(S, { dt = DT, maxT = 60 } = {}) {
  S.ev = [];
  const t0 = S.t;
  let n = 0;
  while (!enReposo(S) && S.t - t0 < maxT) { paso(S, dt); n++; }
  return S.ev;
}

/* Primer contacto de la bola `id` lanzada en la direccion (dx,dy) (unitaria): bola, banda o nada. */
export function rayo(S, id, dx, dy, ignorar = null) {
  const c = bola(S, id), R = S.R;
  let mejor = { tipo: 'nada', t: 60 };
  for (const o of S.bolas) {
    if (o === c || !o.activa || o.id === ignorar) continue;
    const mx = o.x - c.x, my = o.y - c.y, p = mx * dx + my * dy;
    if (p <= 0) continue;
    const q2 = mx * mx + my * my - p * p, D = 2 * R;
    if (q2 >= D * D) continue;
    const t = p - Math.sqrt(D * D - q2);
    if (t < mejor.t) mejor = { tipo: 'bola', t: Math.max(0, t), id: o.id };
  }
  for (const s of S.geo.segs) {
    const den = dx * s.nx + dy * s.ny;
    if (den >= 0) continue;
    const t = (R - ((c.x - s.ax) * s.nx + (c.y - s.ay) * s.ny)) / den;
    if (t < 0 || t >= mejor.t) continue;
    const x = c.x + dx * t, y = c.y + dy * t;
    const ex = s.bx - s.ax, ey = s.by - s.ay, u = ((x - s.ax) * ex + (y - s.ay) * ey) / (ex * ex + ey * ey);
    if (u < 0 || u > 1) continue;
    mejor = { tipo: 'banda', t, nx: s.nx, ny: s.ny };
  }
  mejor.x = c.x + dx * mejor.t; mejor.y = c.y + dy * mejor.t;
  if (mejor.tipo === 'bola') { const o = bola(S, mejor.id); const nx = o.x - mejor.x, ny = o.y - mejor.y, l = Math.hypot(nx, ny) || 1; mejor.nx = nx / l; mejor.ny = ny / l; }
  return mejor;
}

/* Posicion valida para colocar la blanca (dentro de la mesa y sin tocar otras bolas). */
export function posicionLibre(S, id, x, y, maxX = null) {
  const g = S.geo, R = S.R, m = R + 0.002;
  x = Math.max(-g.hx + m, Math.min(maxX == null ? g.hx - m : Math.min(maxX, g.hx - m), x));
  y = Math.max(-g.hy + m, Math.min(g.hy - m, y));
  return { x, y, ok: !S.bolas.some((o) => o.id !== id && o.activa && Math.hypot(o.x - x, o.y - y) < 2 * R + 0.001) };
}
