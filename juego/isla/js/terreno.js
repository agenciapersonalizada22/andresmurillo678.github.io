// Terreno procedural puro (sin DOM ni Three): alturas, biomas, puntos de interes, objetos, edificios, botin y colisiones estaticas.
import { clamp, lerp, suave, rng, fbm, hashStr } from './util.js';
import { generarItem } from './armas.js';
export const MITAD = 400, PASO = 2, N = 401, R_ISLA = 330, CEL = 16;
const NOMBRES = ['Puerto Ancla', 'Villa Pino', 'Fortín Roca', 'Mina Hierro', 'Oasis Sol', 'Torre Hielo', 'Granja Trigo', 'Centro Neón'];
const TIPOS = ['pueblo', 'torre', 'fabrica', 'granja'];
export const BIOMAS = ['playa', 'pradera', 'bosque', 'desierto', 'nieve'];
export const COL_BIOMA = [0xe3d29a, 0x80b653, 0x3c7a38, 0xd8b068, 0xf0f4fa];
const PROP = {
  pino: { hp: 100, mat: 'madera', rad: 0.5, alto: 7 }, roble: { hp: 100, mat: 'madera', rad: 0.6, alto: 6 }, cactus: { hp: 60, mat: 'madera', rad: 0.5, alto: 3 },
  roca: { hp: 160, mat: 'piedra', rad: 1.1, alto: 1.6 }, rocag: { hp: 320, mat: 'piedra', rad: 1.1, alto: 1.6 },
  caja: { hp: 150, mat: 'metal', rad: 1.6, alto: 2.4 }, auto: { hp: 200, mat: 'metal', rad: 1.7, alto: 1.6 }
};

export function crearTerreno(sem) {
  const base = (x, z) => {
    const d = Math.hypot(x, z), rl = R_ISLA * (0.78 + 0.4 * fbm(x * 0.004 + 9, z * 0.004 - 4, sem + 1, 3));
    const land = suave(0, 0.35, 1 - d / rl), e = fbm(x * 0.007, z * 0.007, sem, 5);
    const m = Math.max(0, fbm(x * 0.0035 + 40, z * 0.0035 + 7, sem + 5, 4) - 0.46) * 2.2;
    return lerp(-6, 3 + e * 18 + Math.min(1, m) ** 2 * 60 * suave(0, 0.5, 1 - d / rl + 0.1), land);
  };
  const R = rng(sem * 7 + 3), pois = [];
  for (let it = 0; pois.length < 8 && it < 5000; it++) {
    const a = R() * 6.283, d = (0.1 + R() * 0.62) * R_ISLA, x = Math.cos(a) * d, z = Math.sin(a) * d, h = base(x, z);
    if (h < 4 || h > 26) continue;
    const sep = it < 3000 ? 140 : 95;
    if (pois.some((p) => Math.hypot(p.x - x, p.z - z) < sep)) continue;
    pois.push({ n: NOMBRES[pois.length], tipo: TIPOS[pois.length % 4], x, z, h, r: 46 });
  }
  const g = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -MITAD + i * PASO, z = -MITAD + j * PASO;
    let h = base(x, z);
    for (const p of pois) { const w = suave(p.r * 1.6, p.r * 0.8, Math.hypot(x - p.x, z - p.z)); if (w > 0) h = lerp(h, p.h, w); }
    g[j * N + i] = h;
  }
  const altura = (x, z) => {
    const u = clamp((x + MITAD) / PASO, 0, N - 1.001), v = clamp((z + MITAD) / PASO, 0, N - 1.001), i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * N + i;
    return (g[k] * (1 - fu) + g[k + 1] * fu) * (1 - fv) + (g[k + N] * (1 - fu) + g[k + N + 1] * fu) * fv;
  };
  const bioma = (x, z, h) => {
    if (h === undefined) h = altura(x, z);
    if (h < 2.3) return 0; if (h > 38) return 4;
    const n = fbm(x * 0.0035 + 31, z * 0.0035 - 17, sem + 9, 3);
    return n < 0.4 ? 3 : n > 0.58 ? 2 : 1;
  };
  const T = { sem, g, altura, bioma, pois, cajas: [], objetos: [], loot: [], cofres: [], gridC: new Map(), gridO: new Map() };
  generar(T);
  return T;
}

const celdas = (x0, z0, x1, z1) => { const o = []; for (let i = Math.floor(x0 / CEL); i <= Math.floor(x1 / CEL); i++) for (let j = Math.floor(z0 / CEL); j <= Math.floor(z1 / CEL); j++) o.push(i * 4096 + j); return o; };
function indexar(mapa, idx, x0, z0, x1, z1) { for (const k of celdas(x0, z0, x1, z1)) { let a = mapa.get(k); if (!a) mapa.set(k, a = []); a.push(idx); } }

function generar(T) {
  const { sem, altura, bioma, pois } = T, R = rng(sem * 13 + 5), RL = rng(sem * 29 + 11);
  const add = (t, x, z, s, extra) => { const P = PROP[t]; const o = Object.assign({ t, x, y: altura(x, z), z, s, hp: P.hp * (t === 'rocag' ? 1 : 1), mat: P.mat, rad: P.rad * (t.startsWith('roca') ? s : 1), alto: P.alto * s, vivo: true, rot: R() * 6.283 }, extra); T.objetos.push(o); indexar(T.gridO, T.objetos.length - 1, x - o.rad, z - o.rad, x + o.rad, z + o.rad); return o; };
  const cercaPoi = (x, z, f) => pois.some((p) => Math.hypot(x - p.x, z - p.z) < p.r * f);
  for (let gx = -340; gx <= 340; gx += 8) for (let gz = -340; gz <= 340; gz += 8) {
    const x = gx + (R() - 0.5) * 7, z = gz + (R() - 0.5) * 7, h = altura(x, z);
    if (h < 1.2 || Math.hypot(x, z) > R_ISLA + 10 || cercaPoi(x, z, 0.98)) continue;
    const b = bioma(x, z, h), r = R(), pend = Math.abs(altura(x + 2, z) - h) + Math.abs(altura(x, z + 2) - h);
    const tab = [[0.62, 0.08, 0, 0.05], [0.03, 0.1, 0, 0.05], [0.62, 0.08, 0, 0.05], [0, 0, 0.1, 0.07], [0.3, 0, 0, 0.1]][b];
    if (b === 0) { if (r < 0.03) add('roble', x, z, 0.8 + R() * 0.4); else if (r < 0.05) add('roca', x, z, 0.8 + R()); continue; }
    if (pend < 3 && r < tab[0]) add('pino', x, z, 0.85 + R() * 0.55);
    else if (pend < 3 && r < tab[0] + tab[1]) add('roble', x, z, 0.9 + R() * 0.4);
    else if (pend < 3 && r < tab[0] + tab[1] + tab[2]) add('cactus', x, z, 0.8 + R() * 0.4);
    else if (r > 1 - tab[3]) add(R() < 0.15 ? 'rocag' : 'roca', x, z, 0.8 + R() * 0.8);
  }
  const caja = (x0, z0, x1, z1, y0, y1, c) => { T.cajas.push({ x0, z0, x1, z1, y0, y1, c }); indexar(T.gridC, T.cajas.length - 1, x0, z0, x1, z1); };
  const muro = (ax, az, bx, bz, y0, alto, vanos, c) => {
    const hz = Math.abs(bz - az) < 1e-6, L = hz ? Math.abs(bx - ax) : Math.abs(bz - az), u0 = hz ? Math.min(ax, bx) : Math.min(az, bz), fx = hz ? az : ax;
    const box = (a, b, ya, yb) => { if (b - a < 0.01 || yb - ya < 0.01) return; if (hz) caja(u0 + a, fx - 0.15, u0 + b, fx + 0.15, ya, yb, c); else caja(fx - 0.15, u0 + a, fx + 0.15, u0 + b, ya, yb, c); };
    let cur = 0;
    for (const v of vanos.slice().sort((p, q) => p.u0 - q.u0)) { box(cur, v.u0, y0, y0 + alto); box(v.u0, v.u1, y0, y0 + v.a); box(v.u0, v.u1, y0 + v.b, y0 + alto); cur = v.u1; }
    box(cur, L, y0, y0 + alto);
  };
  const lootPts = [];
  const casa = (P, cx, cz, w, d, puerta, alto, col) => {
    const y0 = P.h, x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, ys = y0 + 0.2;
    caja(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, y0 - 1.5, ys, '#7d7d84');
    const V = (L, es) => { const v = [{ u0: L / 2 - 0.9, u1: L / 2 + 0.9, a: 0, b: 2.3 }]; if (!es && L > 7) v.push({ u0: L * 0.15, u1: L * 0.15 + 1.2, a: 1, b: 2.1 }); if (es && L > 14) v.push({ u0: L * 0.8, u1: L * 0.8 + 1.8, a: 0, b: 2.3 }); return v; };
    const W = (ax, az, bx, bz, L, lado) => muro(ax, az, bx, bz, ys, alto, lado === puerta ? V(L, true) : (L > 7 ? [{ u0: L * 0.2, u1: L * 0.2 + 1.2, a: 1, b: 2.1 }] : []), col);
    W(x0, z0, x1, z0, w, 0); W(x0, z1, x1, z1, w, 1); W(x0, z0, x0, z1, d, 2); W(x1, z0, x1, z1, d, 3);
    caja(x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, ys + alto, ys + alto + 0.3, '#8c4a3a');
    const n = 2 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) lootPts.push([x0 + 1.2 + R() * (w - 2.4), z0 + 1.2 + R() * (d - 2.4), ys + 0.3]);
    if (R() < 0.55) T.cofres.push({ id: 'c' + T.cofres.length, x: x0 + 1 + R() * (w - 2), z: z0 + 1 + R() * (d - 2), y: ys, abierto: false });
  };
  pois.forEach((P) => {
    const cols = ['#d9cdb4', '#c9b79a', '#b9c4cc', '#cfa98d'];
    const pc = () => cols[(R() * cols.length) | 0], pd = () => (R() * 4) | 0;
    if (P.tipo === 'pueblo') for (const ox of [-16, 0, 16]) for (const oz of [-10, 10]) casa(P, P.x + ox, P.z + oz, 8 + R() * 3, 7 + R() * 3, pd(), 2.9, pc());
    else if (P.tipo === 'torre') {
      const x0 = P.x - 3, x1 = P.x + 3, z0 = P.z - 3, z1 = P.z + 3, y0 = P.h;
      caja(x0, z0, x1, z1, y0 - 1, y0 + 9, '#8e98a6'); caja(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, y0 + 9, y0 + 9.4, '#5d6672');
      for (let j = 0; j < 18; j++) { const xa = x1 + (17 - j) * 0.7; caja(xa, P.z - 0.9, xa + 0.7, P.z + 0.9, y0 - 0.5, y0 + 0.5 * (j + 1), '#a7a7ad'); }
      T.cofres.push({ id: 'c' + T.cofres.length, x: P.x, z: P.z, y: y0 + 9.4, abierto: false, bueno: true });
      casa(P, P.x - 20, P.z + 12, 9, 8, 1, 2.9, pc()); casa(P, P.x - 18, P.z - 16, 9, 8, 0, 2.9, pc()); casa(P, P.x + 22, P.z + 18, 9, 7, 2, 2.9, pc());
    } else if (P.tipo === 'fabrica') {
      casa(P, P.x, P.z, 22, 14, 0, 6, '#9a9fa8'); casa(P, P.x - 26, P.z - 16, 9, 8, 3, 2.9, pc()); casa(P, P.x + 26, P.z + 15, 9, 8, 2, 2.9, pc());
      for (let i = 0; i < 6; i++) add('caja', P.x - 20 + i * 8, P.z + 22, 1, { rot: 0 });
      for (let i = 0; i < 3; i++) add('auto', P.x - 14 + i * 14, P.z - 24, 1);
    } else {
      casa(P, P.x, P.z, 14, 10, 0, 5, '#a3523f'); casa(P, P.x - 22, P.z + 14, 8, 7, 3, 2.9, pc()); casa(P, P.x + 22, P.z - 14, 8, 7, 2, 2.9, pc()); casa(P, P.x + 20, P.z + 17, 8, 7, 1, 2.9, pc());
      for (let i = 0; i < 4; i++) add('roca', P.x - 10 + i * 6, P.z - 20, 0.8);
    }
    for (let i = 0; i < 4; i++) { const a = R() * 6.28, d = 30 + R() * 12; lootPts.push([P.x + Math.cos(a) * d, P.z + Math.sin(a) * d, null]); }
    for (let i = 0; i < 5; i++) { const a = R() * 6.28, d = P.r * (1 + R() * 0.15); const x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d; add(R() < 0.5 ? 'auto' : 'caja', x, z, 1); }
  });
  for (let i = 0; i < 50; i++) { const a = R() * 6.28, d = R() * R_ISLA * 0.85, x = Math.cos(a) * d, z = Math.sin(a) * d; if (altura(x, z) > 1.5) lootPts.push([x, z, null]); }
  for (let i = 0; i < 8; i++) { const a = R() * 6.28, d = R() * R_ISLA * 0.8, x = Math.cos(a) * d, z = Math.sin(a) * d; if (altura(x, z) > 1.5 && !cercaPoi(x, z, 0.9)) T.cofres.push({ id: 'c' + T.cofres.length, x, z, y: altura(x, z), abierto: false }); }
  lootPts.forEach((p, i) => { const y = p[2] == null ? altura(p[0], p[1]) + 0.3 : p[2]; T.loot.push({ id: 'l' + i, x: p[0], y, z: p[1], item: generarItem(RL, false), vivo: true }); });
  T.cofres.forEach((c) => { c.y = c.y == null ? altura(c.x, c.z) : c.y; });
}

/* contenido determinista de un cofre (igual en todos los equipos) */
export function contenidoCofre(T, c) {
  const R = rng(hashStr(T.sem + c.id)), n = c.bueno ? 4 : 3, out = [];
  out.push(generarItem(R, true)); while (out.length === 1 && out[0].k !== 'arma') out[0] = generarItem(R, true);
  for (let i = 1; i < n; i++) out.push(generarItem(R, true));
  return out;
}

/* ---- consultas estaticas (edificios y objetos) ---- */
export function bloqueaEst(T, x, y, z, r, h) {
  for (const k of celdas(x - r, z - r, x + r, z + r)) {
    const lc = T.gridC.get(k);
    if (lc) for (const i of lc) { const c = T.cajas[i]; if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r && c.y1 > y + 0.7 && c.y0 < y + h) return true; }
    const lo = T.gridO.get(k);
    if (lo) for (const i of lo) { const o = T.objetos[i]; if (o.vivo && Math.hypot(x - o.x, z - o.z) < o.rad + r * 0.6 && o.y + o.alto > y + 0.7 && o.y < y + h) return true; }
  }
  return false;
}
export function sueloEst(T, x, z, yPrev) {
  let s = -1e9; const lc = T.gridC.get(Math.floor(x / CEL) * 4096 + Math.floor(z / CEL));
  if (lc) for (const i of lc) { const c = T.cajas[i]; if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.y1 <= yPrev + 0.7 && c.y1 > s) s = c.y1; }
  return s;
}
/* punto dentro de un edificio u objeto (para balas y pico): {tipo:'caja'|'obj', i} */
export function golpeEst(T, x, y, z) {
  const k = Math.floor(x / CEL) * 4096 + Math.floor(z / CEL);
  const lc = T.gridC.get(k);
  if (lc) for (const i of lc) { const c = T.cajas[i]; if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y > c.y0 && y < c.y1) return { tipo: 'caja', i }; }
  const lo = T.gridO.get(k);
  if (lo) for (const i of lo) { const o = T.objetos[i]; if (o.vivo && y > o.y && y < o.y + o.alto && Math.hypot(x - o.x, z - o.z) < o.rad * 0.75) return { tipo: 'obj', i }; }
  return null;
}
