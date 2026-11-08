// Geometria del tablero hexagonal (hexagonos "pointy-top", lado 1). Pura y determinista: los ids de vertices y aristas
// solo dependen del radio, asi que las partidas guardadas y los mensajes de red pueden referirse a ellos por numero.
const R3 = Math.sqrt(3);
const memo = {};

export function geo(R) {
  if (memo[R]) return memo[R];
  const hexes = [], verts = [], aristas = [], mv = new Map(), ma = new Map();
  for (let r = -R; r <= R; r++) for (let q = -R; q <= R; q++) if (Math.abs(q + r) <= R) hexes.push({ q, r, x: R3 * (q + r / 2), y: 1.5 * r, vs: [], es: [] });
  const vid = (x, y) => {
    const k = Math.round(x * 100) + ',' + Math.round(y * 100);
    let i = mv.get(k);
    if (i === undefined) { i = verts.length; mv.set(k, i); verts.push({ x, y, hs: [], ns: [], es: [] }); }
    return i;
  };
  hexes.forEach((hx, hi) => {
    for (let k = 0; k < 6; k++) {
      const a = ((60 * k - 30) * Math.PI) / 180, v = vid(hx.x + Math.cos(a), hx.y + Math.sin(a));
      hx.vs.push(v); verts[v].hs.push(hi);
    }
    for (let k = 0; k < 6; k++) {
      const a = hx.vs[k], b = hx.vs[(k + 1) % 6], key = a < b ? a + '_' + b : b + '_' + a;
      let e = ma.get(key);
      if (e === undefined) {
        e = aristas.length; ma.set(key, e);
        aristas.push({ a: Math.min(a, b), b: Math.max(a, b), hs: [] });
        verts[a].es.push(e); verts[b].es.push(e); verts[a].ns.push(b); verts[b].ns.push(a);
      }
      aristas[e].hs.push(hi); hx.es.push(e);
    }
  });
  const vecinos = hexes.map(() => []);
  aristas.forEach((e) => { if (e.hs.length === 2) { vecinos[e.hs[0]].push(e.hs[1]); vecinos[e.hs[1]].push(e.hs[0]); } });
  aristas.forEach((e) => { e.x = (verts[e.a].x + verts[e.b].x) / 2; e.y = (verts[e.a].y + verts[e.b].y) / 2; });
  const costa = aristas.map((e, i) => i).filter((i) => aristas[i].hs.length === 1)
    .sort((p, q) => Math.atan2(aristas[p].y, aristas[p].x) - Math.atan2(aristas[q].y, aristas[q].x));
  const g = { R, hexes, verts, aristas, vecinos, costa };
  // caja contenedora (con margen para el mar y los puertos)
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  verts.forEach((v) => { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); });
  g.caja = { x0: x0 - 1.5, x1: x1 + 1.5, y0: y0 - 1.5, y1: y1 + 1.5 };
  memo[R] = g;
  return g;
}

export const pips = (n) => (n ? 6 - Math.abs(7 - n) : 0);
export const probTirada = (n) => pips(n) / 36;
