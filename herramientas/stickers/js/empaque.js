/* Empaquetado de hojas (MaxRects) y ajuste de peso por busqueda binaria. Sin DOM. UMD: window.StEmpaque. */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.StEmpaque = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const E = {};
  /* items [{id,w,h}], hoja W x H (mm), sep (mm entre piezas), rotar permite giro de 90 grados. -> {paginas:[[{id,x,y,w,h,rot}]], noCabe:[id]} */
  E.empaquetar = function (items, W, H, sep, rotar) {
    sep = sep || 0; const orden = items.slice().sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h);
    const paginas = [], noCabe = [];
    const nueva = () => ({ libres: [{ x: 0, y: 0, w: W + sep, h: H + sep }], col: [] });
    function ubicar(pg, it) {
      let mejor = null;
      for (const r of pg.libres) for (const rot of rotar && it.w !== it.h ? [false, true] : [false]) {
        const w = (rot ? it.h : it.w) + sep, h = (rot ? it.w : it.h) + sep;
        if (w <= r.w + 1e-9 && h <= r.h + 1e-9) { const s1 = Math.min(r.w - w, r.h - h), s2 = Math.max(r.w - w, r.h - h); if (!mejor || s1 < mejor.s1 || (s1 === mejor.s1 && s2 < mejor.s2)) mejor = { x: r.x, y: r.y, w, h, rot, s1, s2 }; }
      }
      if (!mejor) return false;
      const nl = [];
      for (const r of pg.libres) {
        if (mejor.x >= r.x + r.w || mejor.x + mejor.w <= r.x || mejor.y >= r.y + r.h || mejor.y + mejor.h <= r.y) { nl.push(r); continue; }
        if (mejor.x > r.x) nl.push({ x: r.x, y: r.y, w: mejor.x - r.x, h: r.h });
        if (mejor.x + mejor.w < r.x + r.w) nl.push({ x: mejor.x + mejor.w, y: r.y, w: r.x + r.w - mejor.x - mejor.w, h: r.h });
        if (mejor.y > r.y) nl.push({ x: r.x, y: r.y, w: r.w, h: mejor.y - r.y });
        if (mejor.y + mejor.h < r.y + r.h) nl.push({ x: r.x, y: mejor.y + mejor.h, w: r.w, h: r.y + r.h - mejor.y - mejor.h });
      }
      pg.libres = nl.filter((a, i) => !nl.some((b, j) => i !== j && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && (i > j || a.x !== b.x || a.y !== b.y || a.w !== b.w || a.h !== b.h)));
      pg.col.push({ id: it.id, x: mejor.x, y: mejor.y, w: mejor.w - sep, h: mejor.h - sep, rot: mejor.rot });
      return true;
    }
    for (const it of orden) {
      const cabe = (it.w <= W && it.h <= H) || (rotar && it.h <= W && it.w <= H);
      if (!cabe) { noCabe.push(it.id); continue; }
      let hecho = false; for (const pg of paginas) if (ubicar(pg, it)) { hecho = true; break; }
      if (!hecho) { const pg = nueva(); paginas.push(pg); ubicar(pg, it); }
    }
    return { paginas: paginas.map((p) => p.col), noCabe };
  };

  /* Busqueda binaria de la mayor calidad q (0..1) cuyo peso cabe en `limite` bytes. codificar(q) -> Promise<bytes|{bytes}>.
     Devuelve {ok, q, bytes, intentos}; ok=false si ni la calidad minima cabe. */
  E.ajustarPeso = async function (codificar, limite, o) {
    o = Object.assign({ qmin: 0.02, qmax: 1, paso: 0.01, max: 12 }, o || {});
    let intentos = 0; const peso = async (q) => { intentos++; const r = await codificar(q); return typeof r === 'number' ? r : r.bytes; };
    let b = await peso(o.qmax); if (b <= limite) return { ok: true, q: o.qmax, bytes: b, intentos };
    let lo = o.qmin, hi = o.qmax, bl = await peso(lo);
    if (bl > limite) return { ok: false, q: lo, bytes: bl, intentos };
    while (hi - lo > o.paso && intentos < o.max) { const mid = (lo + hi) / 2, bm = await peso(mid); if (bm <= limite) { lo = mid; bl = bm; } else hi = mid; }
    return { ok: true, q: lo, bytes: bl, intentos };
  };
  return E;
});
