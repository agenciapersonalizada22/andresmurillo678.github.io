/* Nucleo de pixeles (sin DOM): varita/flood fill, chroma, poligonos, distancia euclidea, borde exterior, refinado, filtros. UMD: window.StNucleo. */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.StNucleo = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const N = {};
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const maxd = (d, i, r, g, b, a) => Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b), Math.abs(d[i + 3] - a));

  /* Varita magica: mascara (0/255) de pixeles parecidos al de (x0,y0); distancia = max de canales; contiguo = 4-conexo. */
  N.varita = function (d, w, h, x0, y0, tol, contiguo) {
    const m = new Uint8Array(w * h); if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return m;
    const i0 = (y0 * w + x0) * 4, r = d[i0], g = d[i0 + 1], b = d[i0 + 2], a = d[i0 + 3];
    const ok = (p) => maxd(d, p * 4, r, g, b, a) <= tol;
    if (contiguo === false) { for (let p = 0; p < w * h; p++) if (ok(p)) m[p] = 255; return m; }
    const pila = [y0 * w + x0]; m[pila[0]] = 255;
    while (pila.length) {
      const p = pila.pop(), x = p % w, y = (p - x) / w;
      if (x > 0 && !m[p - 1] && ok(p - 1)) { m[p - 1] = 255; pila.push(p - 1); }
      if (x < w - 1 && !m[p + 1] && ok(p + 1)) { m[p + 1] = 255; pila.push(p + 1); }
      if (y > 0 && !m[p - w] && ok(p - w)) { m[p - w] = 255; pila.push(p - w); }
      if (y < h - 1 && !m[p + w] && ok(p + w)) { m[p + w] = 255; pila.push(p + w); }
    }
    return m;
  };
  N.cuenta = (m) => { let c = 0; for (let i = 0; i < m.length; i++) if (m[i]) c++; return c; };
  N.invertir = (m) => { const o = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) o[i] = m[i] ? 0 : 255; return o; };
  N.unir = (a, b) => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] || b[i] ? 255 : 0; return o; };
  N.restar = (a, b) => { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] && !b[i] ? 255 : 0; return o; };
  /* Quita (alpha=0) los pixeles de la mascara; con invertida=true conserva solo la mascara. Modifica d. */
  N.aplicarMascara = function (d, m, conservar) { for (let p = 0; p < m.length; p++) if (conservar ? !m[p] : m[p]) d[p * 4 + 3] = 0; };

  /* Chroma key: alpha segun distancia al color clave. tol y suav en 0..255 (suav = ancho de la rampa). despill reduce el tinte en los bordes. */
  N.chroma = function (d, w, h, color, tol, suav, despill) {
    const [r, g, b] = color; suav = Math.max(1, suav || 1);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4, dist = Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b));
      if (dist <= tol) d[i + 3] = 0;
      else if (dist < tol + suav) {
        const k = (dist - tol) / suav; d[i + 3] = Math.round(d[i + 3] * k);
        if (despill) N._despill(d, i, r, g, b, 1 - k);
      }
    }
  };
  N._despill = function (d, i, r, g, b, s) {   // empuja el color lejos de la clave
    const mx = Math.max(r, g, b); const dom = mx === r ? 0 : mx === g ? 1 : 2;
    const o = [d[i], d[i + 1], d[i + 2]], otros = o.filter((_, k) => k !== dom); const lim = Math.max(otros[0], otros[1]);
    if (o[dom] > lim) d[i + dom] = Math.round(o[dom] - (o[dom] - lim) * Math.min(1, s + 0.3));
  };

  /* Mascara de un poligono (pts [[x,y]..], relleno par-impar, muestreo en el centro del pixel). */
  N.poligono = function (pts, w, h) {
    const m = new Uint8Array(w * h), n = pts.length; if (n < 3) return m;
    for (let y = 0; y < h; y++) {
      const yc = y + 0.5, xs = [];
      for (let k = 0; k < n; k++) {
        const a = pts[k], b = pts[(k + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const x1 = Math.max(0, Math.ceil(xs[k] - 0.5)), x2 = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1); for (let x = x1; x <= x2; x++) m[y * w + x] = 255; }
    }
    return m;
  };

  /* Transformada de distancia euclidea (Felzenszwalb). feature>0 = origen. Devuelve distancia (no al cuadrado) al origen mas cercano. */
  N.distancia = function (feature, w, h) {
    const INF = 1e12, f = new Float64Array(Math.max(w, h)), v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1), d = new Float64Array(Math.max(w, h));
    const g2 = new Float64Array(w * h);
    function dt1(n) {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < n; q++) {
        let s; for (;;) { s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k] && k > 0) k--; else break; }
        if (s <= z[k]) { v[0] = q; z[0] = -INF; z[1] = INF; k = 0; } else { k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
      }
      k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    }
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = feature[y * w + x] ? 0 : INF; dt1(h); for (let y = 0; y < h; y++) g2[y * w + x] = d[y]; }
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g2[y * w + x]; dt1(w); for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]); }
    return out;
  };
  /* Dilatar/erosionar una mascara r pixeles (circular, exacto). */
  N.dilatar = function (m, w, h, r) {
    if (r <= 0) return Uint8Array.from(m); const d = N.distancia(m, w, h), o = new Uint8Array(w * h);
    for (let i = 0; i < o.length; i++) o[i] = d[i] <= r ? 255 : 0; return o;
  };
  N.erosionar = function (m, w, h, r) {
    if (r <= 0) return Uint8Array.from(m); const d = N.distancia(N.invertir(m), w, h), o = new Uint8Array(w * h);
    for (let i = 0; i < o.length; i++) o[i] = m[i] && d[i] > r ? 255 : 0; return o;
  };
  N.rellenarHuecos = function (m, w, h) {
    const vis = new Uint8Array(w * h), pila = [];
    const sem = (p) => { if (!m[p] && !vis[p]) { vis[p] = 1; pila.push(p); } };
    for (let x = 0; x < w; x++) { sem(x); sem((h - 1) * w + x); } for (let y = 0; y < h; y++) { sem(y * w); sem(y * w + w - 1); }
    while (pila.length) { const p = pila.pop(), x = p % w; if (x > 0) sem(p - 1); if (x < w - 1) sem(p + 1); if (p >= w) sem(p - w); if (p < w * (h - 1)) sem(p + w); }
    const o = new Uint8Array(w * h); for (let i = 0; i < o.length; i++) o[i] = vis[i] ? 0 : 255; return o;
  };
  N.alfaMascara = function (d, w, h, umbral) { const m = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) m[p] = d[p * 4 + 3] > (umbral == null ? 32 : umbral) ? 255 : 0; return m; };

  /* Borde exterior tipo troquelado: devuelve alfa (0..255) de la region a distancia <= grosor de la forma (incluye la forma).
     cierre = radio de cierre morfologico (rellena concavidades, suaviza el contorno); suavidad = ancho de la rampa en px. */
  N.bordeExterior = function (alfa, w, h, o) {
    o = Object.assign({ grosor: 8, suavidad: 1.2, cierre: 0, huecos: true }, o || {});
    let m = new Uint8Array(w * h); for (let i = 0; i < m.length; i++) m[i] = alfa[i] > 32 ? 255 : 0;
    if (o.cierre > 0) m = N.erosionar(N.dilatar(m, w, h, o.cierre), w, h, o.cierre);
    if (o.huecos) m = N.rellenarHuecos(m, w, h);
    const d = N.distancia(m, w, h), out = new Uint8Array(w * h), s = Math.max(0.5, o.suavidad);
    for (let i = 0; i < out.length; i++) out[i] = Math.round(255 * cl((o.grosor - d[i]) / s + 0.5, 0, 1));
    return out;
  };

  /* Desenfoque de caja x3 (aprox. gaussiano) sobre un canal Uint8. */
  N.desenfocar = function (a, w, h, r) {
    r = Math.round(r); if (r < 1) return Uint8Array.from(a);
    let src = Float32Array.from(a), tmp = new Float32Array(w * h);
    for (let pasada = 0; pasada < 3; pasada++) {
      for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += src[o + cl(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[o + x] = s / (2 * r + 1); s += src[o + cl(x + r + 1, 0, w - 1)] - src[o + cl(x - r, 0, w - 1)]; } }
      for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[cl(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { src[y * w + x] = s / (2 * r + 1); s += tmp[cl(y + r + 1, 0, h - 1) * w + x] - tmp[cl(y - r, 0, h - 1) * w + x]; } }
    }
    const out = new Uint8Array(w * h); for (let i = 0; i < out.length; i++) out[i] = Math.round(src[i]); return out;
  };
  const getA = (d, n) => { const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = d[i * 4 + 3]; return a; };
  const setA = (d, a) => { for (let i = 0; i < a.length; i++) d[i * 4 + 3] = a[i]; };

  /* Refinar bordes sobre RGBA (modifica d). op: {suavizar, pluma, delta (+expandir/-contraer), descontaminar}. */
  N.refinar = function (d, w, h, op) {
    op = op || {}; const n = w * h;
    if (op.delta) {
      const m = N.alfaMascara(d, w, h, 127), antes = getA(d, n), a = new Uint8Array(n);
      if (op.delta > 0) { const nm = N.dilatar(m, w, h, op.delta); for (let i = 0; i < n; i++) a[i] = nm[i] ? (m[i] ? antes[i] : 255) : 0; }
      else { const nm = N.erosionar(m, w, h, -op.delta); for (let i = 0; i < n; i++) a[i] = nm[i] ? antes[i] : 0; }
      setA(d, a);
      if (op.delta > 0) N.extenderColor(d, w, h, Math.ceil(op.delta) + 2, m);
    }
    if (op.suavizar > 0) { const a = N.desenfocar(getA(d, n), w, h, op.suavizar); for (let i = 0; i < n; i++) a[i] = Math.round(cl((a[i] - 128) * 3 + 128, 0, 255)); setA(d, a); }
    if (op.pluma > 0) { let a = getA(d, n); a = N.desenfocar(N.erosionar(a, w, h, Math.ceil(op.pluma / 2)), w, h, op.pluma); setA(d, a); }
    if (op.descontaminar) N.descontaminar(d, w, h, op.descontaminar);
    return d;
  };

  /* Propaga el color de los pixeles opacos (alfa>=250) hacia pixeles de alfa menor hasta `radio` pasos (8-vecinos). No toca el alfa. */
  N.extenderColor = function (d, w, h, radio, semilla) {
    const n = w * h, dist = new Int16Array(n).fill(-1); let cola = [];
    for (let p = 0; p < n; p++) if (semilla ? semilla[p] : d[p * 4 + 3] >= 250) { dist[p] = 0; cola.push(p); }
    const nuevo = new Uint8ClampedArray(d.length); nuevo.set(d);
    for (let paso = 1; paso <= radio && cola.length; paso++) {
      const sig = [];
      for (const p of cola) {
        const x = p % w, y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx;
          if (dist[q] >= 0) continue; dist[q] = paso; nuevo[q * 4] = d[p * 4]; nuevo[q * 4 + 1] = d[p * 4 + 1]; nuevo[q * 4 + 2] = d[p * 4 + 2]; sig.push(q);
        }
      }
      for (const q of sig) { d[q * 4] = nuevo[q * 4]; d[q * 4 + 1] = nuevo[q * 4 + 1]; d[q * 4 + 2] = nuevo[q * 4 + 2]; }
      cola = sig;
    }
  };
  /* Descontaminar halos: los pixeles semitransparentes toman el color de los opacos mas cercanos (radio px). */
  N.descontaminar = function (d, w, h, radio) {
    const n = w * h, tmp = new Uint8ClampedArray(d), lim = 250;
    // semillas: opacos; los semitransparentes cercanos se recolorean con el color propagado (BFS multi-origen)
    const dist = new Int16Array(n).fill(-1); let cola = [];
    for (let p = 0; p < n; p++) if (tmp[p * 4 + 3] >= lim) { dist[p] = 0; cola.push(p); }
    const col = new Uint8ClampedArray(n * 4); col.set(tmp);
    for (let paso = 1; paso <= radio && cola.length; paso++) {
      const sig = [];
      for (const p of cola) {
        const x = p % w, y = (p - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx;
          if (dist[q] >= 0) continue; dist[q] = paso; col[q * 4] = col[p * 4]; col[q * 4 + 1] = col[p * 4 + 1]; col[q * 4 + 2] = col[p * 4 + 2]; sig.push(q);
        }
      }
      cola = sig;
    }
    for (let p = 0; p < n; p++) if (dist[p] > 0 && d[p * 4 + 3] > 0) { d[p * 4] = col[p * 4]; d[p * 4 + 1] = col[p * 4 + 1]; d[p * 4 + 2] = col[p * 4 + 2]; }
  };

  /* ---- filtros por pixel (modifica d). f: {brillo -100..100, contraste -100..100, saturacion -100..100, bn, pixelado (bloque px), poster (niveles 2..8), comic, vineta 0..100, invertir} ---- */
  N.filtros = function (d, w, h, f) {
    if (!f) return d; const n = w * h;
    if (f.pixelado > 1) {
      const b = Math.round(f.pixelado);
      for (let by = 0; by < h; by += b) for (let bx = 0; bx < w; bx += b) {
        let r = 0, g = 0, bl = 0, a = 0, c = 0; const ye = Math.min(h, by + b), xe = Math.min(w, bx + b);
        for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; bl += d[i + 2]; a += d[i + 3]; c++; }
        r = Math.round(r / c); g = Math.round(g / c); bl = Math.round(bl / c); a = Math.round(a / c) > 127 ? 255 : 0;
        for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = bl; d[i + 3] = a; }
      }
    }
    const br = (f.brillo || 0) * 2.55, ct = f.contraste || 0, kc = (259 * (ct + 255)) / (255 * (259 - ct)), sa = 1 + (f.saturacion || 0) / 100;
    const lv = f.poster >= 2 ? Math.round(f.poster) : 0, hay = br || ct || f.saturacion || f.bn || lv || f.invertir;
    let lum = null; if (f.comic) { lum = new Float32Array(n); for (let p = 0; p < n; p++) lum[p] = 0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2]; }
    if (hay) for (let p = 0; p < n; p++) {
      const i = p * 4; let r = d[i], g = d[i + 1], b = d[i + 2];
      r += br; g += br; b += br;
      if (ct) { r = kc * (r - 128) + 128; g = kc * (g - 128) + 128; b = kc * (b - 128) + 128; }
      if (f.saturacion || f.bn) { const l = 0.299 * r + 0.587 * g + 0.114 * b, s = f.bn ? 0 : sa; r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s; }
      if (lv) { const q = 255 / (lv - 1); r = Math.round(r / q) * q; g = Math.round(g / q) * q; b = Math.round(b / q) * q; }
      if (f.invertir) { r = 255 - r; g = 255 - g; b = 255 - b; }
      d[i] = cl(r, 0, 255); d[i + 1] = cl(g, 0, 255); d[i + 2] = cl(b, 0, 255);
    }
    if (f.comic) {   // contornos de tinta por Sobel sobre la luminancia original
      const ink = Math.max(30, 200 - 1.5 * (f.comic === true ? 50 : f.comic));
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = y * w + x, gx = lum[p - w + 1] + 2 * lum[p + 1] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - 1] - lum[p + w - 1], gy = lum[p + w - 1] + 2 * lum[p + w] + lum[p + w + 1] - lum[p - w - 1] - 2 * lum[p - w] - lum[p - w + 1];
        if (Math.hypot(gx, gy) > ink) { const i = p * 4; d[i] = d[i] * 0.15; d[i + 1] = d[i + 1] * 0.15; d[i + 2] = d[i + 2] * 0.15; }
      }
    }
    if (f.vineta > 0) {
      const k = f.vineta / 100, cx = (w - 1) / 2, cy = (h - 1) / 2, rm = Math.hypot(cx, cy);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = Math.hypot(x - cx, y - cy) / rm, m = 1 - k * Math.pow(Math.max(0, t - 0.3) / 0.7, 1.6), i = (y * w + x) * 4; d[i] *= m; d[i + 1] *= m; d[i + 2] *= m; }
    }
    return d;
  };
  N.hayFiltros = (f) => !!f && !!(f.brillo || f.contraste || f.saturacion || f.bn || f.pixelado > 1 || f.poster >= 2 || f.comic || f.vineta > 0 || f.invertir);
  N.cl = cl;
  return N;
});
