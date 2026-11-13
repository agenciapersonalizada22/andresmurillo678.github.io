// Rompecabezas de rutas: cuadricula con muros, inicio, meta y paradas obligatorias; mover en 4 direcciones; ruta minima por BFS.
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // arriba, derecha, abajo, izquierda
export const dirs = DIRS;
const llave = (x, y) => x + ',' + y;
function bfs(p, ini) {
  const dist = new Map([[llave(ini.x, ini.y), 0]]);
  const cola = [ini];
  while (cola.length) {
    const c = cola.shift();
    for (const [dx, dy] of DIRS) {
      const x = c.x + dx, y = c.y + dy;
      if (x < 0 || y < 0 || x >= p.w || y >= p.h || p.muros.has(llave(x, y)) || dist.has(llave(x, y))) continue;
      dist.set(llave(x, y), dist.get(llave(c.x, c.y)) + 1); cola.push({ x, y });
    }
  }
  return dist;
}
function permutaciones(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => permutaciones([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])); }
export function optimo(p) {
  const pts = [p.inicio, ...p.paradas, p.meta];
  const d = pts.map((q) => bfs(p, q));
  let mejor = Infinity;
  for (const perm of permutaciones(p.paradas.map((_, i) => i + 1))) {
    const orden = [0, ...perm, pts.length - 1];
    let t = 0;
    for (let i = 0; i < orden.length - 1; i++) { const x = d[orden[i]].get(llave(pts[orden[i + 1]].x, pts[orden[i + 1]].y)); if (x == null) { t = Infinity; break; } t += x; }
    mejor = Math.min(mejor, t);
  }
  return mejor;
}
export function generar(rng, nivel) {
  const tam = Math.min(8, 4 + Math.floor(nivel / 4));
  const nParadas = nivel < 7 ? 0 : nivel < 14 ? 1 : 2;
  for (let intento = 0; intento < 200; intento++) {
    const muros = new Set();
    const nMuros = Math.floor(tam * tam * (0.12 + Math.min(nivel, 20) * 0.01));
    const p = { w: tam, h: tam, muros, inicio: { x: 0, y: rng.int(0, tam - 1) }, meta: { x: tam - 1, y: rng.int(0, tam - 1) }, paradas: [] };
    const libre = (x, y) => !(x === p.inicio.x && y === p.inicio.y) && !(x === p.meta.x && y === p.meta.y);
    for (let k = 0; k < nMuros; k++) { const x = rng.int(0, tam - 1), y = rng.int(0, tam - 1); if (libre(x, y)) muros.add(llave(x, y)); }
    for (let k = 0; k < nParadas; k++) {
      const x = rng.int(1, tam - 2), y = rng.int(0, tam - 1);
      if (libre(x, y) && !muros.has(llave(x, y)) && !p.paradas.some((q) => q.x === x && q.y === y)) p.paradas.push({ x, y });
    }
    if (p.paradas.length !== nParadas) continue;
    const o = optimo(p);
    if (isFinite(o) && o >= tam) { p.optimo = o; return p; }
  }
  return { w: 4, h: 4, muros: new Set(), inicio: { x: 0, y: 0 }, meta: { x: 3, y: 3 }, paradas: [], optimo: 6 };
}
// Valida una lista de pasos (indices de DIRS): ninguna salida del tablero ni muros; devuelve estado final.
export function validarRuta(p, pasos) {
  let x = p.inicio.x, y = p.inicio.y;
  const vis = new Set();
  for (const d of pasos) {
    const [dx, dy] = DIRS[d] || [0, 0];
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || p.muros.has(llave(nx, ny))) return { valida: false };
    x = nx; y = ny;
    p.paradas.forEach((q, i) => { if (q.x === x && q.y === y) vis.add(i); });
  }
  const llego = x === p.meta.x && y === p.meta.y && vis.size === p.paradas.length;
  return { valida: true, llego, largo: pasos.length, x, y };
}
// Camino minimo como lista de pasos (para pruebas y pistas).
export function solucion(p) {
  const pts = [p.inicio, ...p.paradas, p.meta];
  let mejor = null;
  for (const perm of permutaciones(p.paradas.map((_, i) => i + 1))) {
    const orden = [0, ...perm, pts.length - 1];
    let total = [];
    for (let i = 0; i < orden.length - 1; i++) { const s = camino(p, pts[orden[i]], pts[orden[i + 1]]); if (!s) { total = null; break; } total = total.concat(s); }
    if (total && (!mejor || total.length < mejor.length)) mejor = total;
  }
  return mejor;
}
function camino(p, a, b) {
  const prev = new Map([[llave(a.x, a.y), null]]);
  const cola = [a];
  while (cola.length) {
    const c = cola.shift();
    if (c.x === b.x && c.y === b.y) { const r = []; let k = llave(c.x, c.y); while (prev.get(k)) { r.unshift(prev.get(k).d); k = prev.get(k).k; } return r; }
    DIRS.forEach(([dx, dy], d) => {
      const x = c.x + dx, y = c.y + dy, k = llave(x, y);
      if (x < 0 || y < 0 || x >= p.w || y >= p.h || p.muros.has(k) || prev.has(k)) return;
      prev.set(k, { k: llave(c.x, c.y), d }); cola.push({ x, y });
    });
  }
  return null;
}
