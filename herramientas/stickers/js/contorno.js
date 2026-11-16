/* Contorno vectorial (sin DOM): trazado de bordes de una mascara, Douglas-Peucker, offset y SVG de corte para plotters. UMD: window.StContorno. */
(function (g, f) { const m = f(g.StNucleo || (typeof require === 'function' ? require('./nucleo.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else g.StContorno = m; })(typeof self !== 'undefined' ? self : this, function (N) {
  'use strict';
  const C = {};
  const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
  C.area = area;
  const perimetro = (p, cerrado) => { let s = 0; for (let i = 0; i < p.length - (cerrado ? 0 : 1); i++) { const q = p[(i + 1) % p.length]; s += Math.hypot(q[0] - p[i][0], q[1] - p[i][1]); } return s; };
  C.perimetro = perimetro;

  /* Bordes de pixel -> lazos cerrados de vertices enteros. Cada lazo: {pts, area (con signo), hueco}. */
  C.trazar = function (m, w, h) {
    const sal = new Map(), W1 = w + 1, ins = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] > 0;
    const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // derecha, abajo, izquierda, arriba
    const add = (x, y, d) => { const k = y * W1 + x; (sal.get(k) || sal.set(k, []).get(k)).push(d); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      if (!ins(x, y - 1)) add(x, y, 0);          // arriba: TL->TR
      if (!ins(x + 1, y)) add(x + 1, y, 1);      // derecha: TR->BR
      if (!ins(x, y + 1)) add(x + 1, y + 1, 2);  // abajo: BR->BL
      if (!ins(x - 1, y)) add(x, y + 1, 3);      // izquierda: BL->TL
    }
    const lazos = [];
    for (const [k0, l0] of sal) {
      while (l0.length) {
        let k = k0, d = l0.pop(); const pts = [];
        for (;;) {
          const x = k % W1, y = (k - x) / W1; pts.push([x, y]);
          const nk = (y + DIR[d][1]) * W1 + x + DIR[d][0];
          if (nk === k0) break;
          const op = sal.get(nk); if (!op || !op.length) break;
          let e = -1; for (const t of [(d + 1) % 4, d, (d + 3) % 4]) { const j = op.indexOf(t); if (j >= 0) { e = t; op.splice(j, 1); break; } }   // giro a la derecha preferente
          if (e < 0) break; k = nk; d = e;
        }
        if (pts.length >= 3) lazos.push({ pts, area: area(pts) });
      }
    }
    lazos.forEach((l) => { l.hueco = l.area < 0; });
    return lazos;
  };

  /* Douglas-Peucker. pts [[x,y]..]; cerrado=true parte el lazo por el punto mas alejado del primero. */
  function dp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const pila = [[0, pts.length - 1]];
    while (pila.length) {
      const [a, b] = pila.pop(); let dm = -1, im = -1; const A = pts[a], B = pts[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
      for (let i = a + 1; i < b; i++) { const P = pts[i], dist = L === 0 ? Math.hypot(P[0] - A[0], P[1] - A[1]) : Math.abs(dy * P[0] - dx * P[1] + B[0] * A[1] - B[1] * A[0]) / L; if (dist > dm) { dm = dist; im = i; } }
      if (dm > eps) { keep[im] = 1; pila.push([a, im], [im, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  C.douglasPeucker = function (pts, eps, cerrado) {
    if (!cerrado) return dp(pts, eps);
    if (pts.length < 4) return pts.slice();
    let im = 0, dm = -1; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > dm) { dm = d; im = i; } }
    const a = dp(pts.slice(0, im + 1), eps), b = dp(pts.slice(im).concat([pts[0]]), eps);
    return a.concat(b.slice(1, -1));
  };

  /* Contorno de una mascara: offset (px, dilata si >0), huecos opcionales, tolerancia DP. Devuelve lazos simplificados (solo exteriores si !huecos). */
  C.contornoDe = function (m, w, h, o) {
    o = Object.assign({ offset: 0, eps: 1.2, huecos: false, minArea: 12 }, o || {});
    let mm = m; if (o.offset > 0) mm = N.dilatar(m, w, h, o.offset); else if (o.offset < 0) mm = N.erosionar(m, w, h, -o.offset);
    if (!o.huecos) mm = N.rellenarHuecos(mm, w, h);
    return C.trazar(mm, w, h).filter((l) => Math.abs(l.area) >= o.minArea && (o.huecos || !l.hueco)).map((l) => ({ pts: C.douglasPeucker(l.pts, o.eps, true), hueco: l.hueco, area: l.area }));
  };

  /* SVG de corte: lazos en px -> mm. cfg {anchoMm, altoMm (tamano del recuadro de la mascara w,h), x, y (desplazamiento mm)}. Devuelve solo los <path>. */
  C.pathMm = function (lazos, w, h, anchoMm, altoMm, dx, dy) {
    const sx = anchoMm / w, sy = altoMm / h, r = (v) => Math.round(v * 100) / 100;
    return lazos.map((l) => 'M' + l.pts.map((p) => r(p[0] * sx + (dx || 0)) + ' ' + r(p[1] * sy + (dy || 0))).join('L') + 'Z').join('');
  };
  C.svgCorte = function (lazos, w, h, anchoMm, altoMm, o) {
    o = Object.assign({ trazo: '#ff00ff', grosor: 0.1 }, o || {});
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + anchoMm + 'mm" height="' + altoMm + 'mm" viewBox="0 0 ' + anchoMm + ' ' + altoMm + '"><path id="CutContour" d="' + C.pathMm(lazos, w, h, anchoMm, altoMm) + '" fill="none" stroke="' + o.trazo + '" stroke-width="' + o.grosor + '" fill-rule="evenodd"/></svg>';
  };
  return C;
});
