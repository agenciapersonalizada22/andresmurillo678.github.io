// Disposicion de la cadena sobre la mesa (coordenadas de mundo: ficha = 2 x 1). Pura y determinista: sin DOM.
// Cada brazo crece hacia fuera desde la primera ficha y gira (en serpiente) al llegar a +-LIM; el brazo derecho baja y el izquierdo sube.
export const L = 2, W = 1, LIM = 8;

function paso(st, doble, forzarGiro, lim) {
  const horiz = st.dir.dy === 0;
  const len = doble ? W : L;
  const giro = forzarGiro != null ? forzarGiro : horiz ? Math.abs(st.tip.x + st.dir.dx * len) > lim : true;
  if (giro) {
    const nd = horiz ? { dx: 0, dy: st.vs } : { dx: -st.hx, dy: 0 };
    const cx = st.tip.x + st.dir.dx * (W / 2) + nd.dx * (L / 2 - W / 2), cy = st.tip.y + st.dir.dy * (W / 2) + nd.dy * (L / 2 - W / 2);
    const ang = Math.atan2(nd.dy, nd.dx);
    const tip = { x: cx + nd.dx * (L / 2), y: cy + nd.dy * (L / 2) };
    const hx = horiz ? st.hx : nd.dx;
    return { pos: { x: cx, y: cy, ang, dbl: false }, st: { tip, dir: nd, hx, vs: st.vs } };
  }
  const cx = st.tip.x + st.dir.dx * len / 2, cy = st.tip.y + st.dir.dy * len / 2;
  const ang = Math.atan2(st.dir.dy, st.dir.dx) + (doble ? Math.PI / 2 : 0);
  return { pos: { x: cx, y: cy, ang, dbl: doble }, st: { tip: { x: st.tip.x + st.dir.dx * len, y: st.tip.y + st.dir.dy * len }, dir: st.dir, hx: st.hx, vs: st.vs } };
}

export function disponer(cadena, centroId, lim = LIM) {
  const fichas = [];
  let ic = cadena.findIndex((c) => c.id === centroId);
  if (!cadena.length) return { fichas, fantasmas: { i: { x: 0, y: 0, ang: 0 }, d: { x: 0, y: 0, ang: 0 } }, caja: { x0: -L, y0: -W, x1: L, y1: W } };
  if (ic < 0) ic = 0;
  const c0 = cadena[ic], dbl0 = c0.a === c0.b;
  fichas[ic] = { id: c0.id, x: 0, y: 0, ang: dbl0 ? Math.PI / 2 : 0, dbl: dbl0, vi: c0.a, vo: c0.b, brazo: 'c', k: 0 };
  const ex = dbl0 ? W / 2 : L / 2;
  let sd = { tip: { x: ex, y: 0 }, dir: { dx: 1, dy: 0 }, hx: 1, vs: 1 };
  let si = { tip: { x: -ex, y: 0 }, dir: { dx: -1, dy: 0 }, hx: -1, vs: -1 };
  for (let k = ic + 1; k < cadena.length; k++) {
    const c = cadena[k], r = paso(sd, c.a === c.b, null, lim); sd = r.st;
    fichas[k] = { id: c.id, ...r.pos, vi: c.a, vo: c.b, brazo: 'd', k: k - ic };
  }
  for (let k = ic - 1; k >= 0; k--) {
    const c = cadena[k], r = paso(si, c.a === c.b, null, lim); si = r.st;
    fichas[k] = { id: c.id, ...r.pos, vi: c.b, vo: c.a, brazo: 'i', k: ic - k };
  }
  const gd = paso(sd, false, null, lim).pos, gi = paso(si, false, null, lim).pos;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const f of [...fichas, gd, gi]) { const hx = Math.abs(Math.cos(f.ang)) * L / 2 + Math.abs(Math.sin(f.ang)) * W / 2, hy = Math.abs(Math.sin(f.ang)) * L / 2 + Math.abs(Math.cos(f.ang)) * W / 2;
    x0 = Math.min(x0, f.x - hx); x1 = Math.max(x1, f.x + hx); y0 = Math.min(y0, f.y - hy); y1 = Math.max(y1, f.y + hy); }
  return { fichas, fantasmas: { i: gi, d: gd }, caja: { x0, y0, x1, y1 } };
}
