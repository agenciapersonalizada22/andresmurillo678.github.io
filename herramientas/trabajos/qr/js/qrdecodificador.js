/* Decodificador basico de QR propio (respaldo cuando no hay BarcodeDetector).
   Pasos: binarizado adaptativo -> deteccion de 3 patrones de busqueda (1:1:3:1:1) -> muestreo afin -> formato -> mascara ->
   Reed-Solomon (Berlekamp-Massey) -> segmentos numerico/alfanumerico/byte/ECI/Kanji.
   Limites: sin correccion de perspectiva fuerte (solo transformacion afin: giro, escala y algo de inclinacion), no lee QR espejados,
   un QR por imagen, requiere buen contraste y que el codigo ocupe una parte razonable de la imagen. */
(function (g, f) {
  var Q = typeof module === 'object' && module.exports ? require('./qrcodificador.js') : g.QRCodificador;
  var m = f(Q); if (typeof module === 'object' && module.exports) module.exports = m; else g.QRDecodificador = m;
})(typeof self !== 'undefined' ? self : this, function (Q) {
  'use strict';
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function inv(a) { return EXP[255 - LOG[a]]; }

  /* Corrige un bloque (datos + ecc) in situ. Devuelve nº de errores corregidos o -1 si no se puede. */
  function corregirRS(cw, nsym) {
    var n = cw.length, S = [], i, j, hay = false;
    for (i = 0; i < nsym; i++) { var s = 0; for (j = 0; j < n; j++) s = mul(s, EXP[i]) ^ cw[j]; S.push(s); if (s) hay = true; }
    if (!hay) return 0;
    var C = [1], B = [1], L = 0, mm = 1, b = 1;
    for (var k = 0; k < nsym; k++) {
      var d = S[k]; for (i = 1; i <= L; i++) d ^= mul(C[i] || 0, S[k - i]);
      if (d === 0) { mm++; continue; }
      var T = C.slice(), coef = mul(d, inv(b));
      while (C.length < B.length + mm) C.push(0);
      for (i = 0; i < B.length; i++) C[i + mm] ^= mul(coef, B[i]);
      if (2 * L <= k) { L = k + 1 - L; B = T; b = d; mm = 1; } else mm++;
    }
    if (L * 2 > nsym) return -1;
    var pos = [];
    for (i = 0; i < n; i++) {   // raiz: C(alfa^-(n-1-i)) = 0
      var x = EXP[(255 - ((n - 1 - i) % 255)) % 255], v = 0, xp = 1;
      for (j = 0; j <= L; j++) { v ^= mul(C[j] || 0, xp); xp = mul(xp, x); }
      if (v === 0) pos.push(i);
    }
    if (pos.length !== L) return -1;
    // omega = S(x)*C(x) mod x^nsym
    var om = []; for (i = 0; i < nsym; i++) { var o = 0; for (j = 0; j <= i && j <= L; j++) o ^= mul(C[j] || 0, S[i - j]); om.push(o); }
    pos.forEach(function (p) {
      var Xi = EXP[(n - 1 - p) % 255], Xinv = inv(Xi), num = 0, den = 0, xp = 1, t;
      for (t = 0; t < om.length; t++) { num ^= mul(om[t], xp); xp = mul(xp, Xinv); }
      // derivada formal de C: terminos impares
      xp = 1; for (t = 1; t <= L; t += 2) { den ^= mul(C[t] || 0, xp); xp = mul(xp, mul(Xinv, Xinv)); }
      if (!den) return;
      cw[p] ^= mul(Xi, mul(num, inv(den)));
    });
    for (i = 0; i < nsym; i++) { var s2 = 0; for (j = 0; j < n; j++) s2 = mul(s2, EXP[i]) ^ cw[j]; if (s2) return -1; }
    return L;
  }

  var FORMATOS = (function () {
    var t = [];
    for (var e in Q.tablas.formato) for (var mk = 0; mk < 8; mk++) {
      var dat = (Q.tablas.formato[e] << 3) | mk, r = dat;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      t.push({ e: e, mk: mk, bits: ((dat << 10) | r) ^ 0x5412 });
    }
    return t;
  })();
  function pop(x) { var c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }
  function leerFormato(m, tam) {
    var b1 = 0, b2 = 0, i;
    function bit(x, y) { return m[y][x] ? 1 : 0; }
    for (i = 0; i <= 5; i++) b1 |= bit(8, i) << i;
    b1 |= bit(8, 7) << 6; b1 |= bit(8, 8) << 7; b1 |= bit(7, 8) << 8;
    for (i = 9; i < 15; i++) b1 |= bit(14 - i, 8) << i;
    for (i = 0; i < 8; i++) b2 |= bit(tam - 1 - i, 8) << i;
    for (i = 8; i < 15; i++) b2 |= bit(8, tam - 15 + i) << i;
    var mejor = null, dist = 99;
    FORMATOS.forEach(function (f) { var d = Math.min(pop(f.bits ^ b1), pop(f.bits ^ b2)); if (d < dist) { dist = d; mejor = f; } });
    return dist <= 3 ? mejor : null;
  }

  function leerBits(bytes) {
    var pos = 0;
    return { restan: function () { return bytes.length * 8 - pos; }, leer: function (n) { var v = 0; for (var i = 0; i < n; i++) { v = (v << 1) | ((bytes[pos >>> 3] >>> (7 - (pos & 7))) & 1); pos++; } return v; } };
  }
  function aTexto(bytes, cod) {
    var u = new Uint8Array(bytes);
    try { return new TextDecoder(cod || 'utf-8', { fatal: true }).decode(u); } catch (e) {}
    try { return new TextDecoder('iso-8859-1').decode(u); } catch (e2) { return String.fromCharCode.apply(null, bytes); }
  }
  function segmentos(datos, v) {
    var br = leerBits(datos), bytes = [], texto = '', ver = v, kanji = false;
    function cc(modo) { var t = { 1: [10, 12, 14], 2: [9, 11, 13], 4: [8, 16, 16], 8: [8, 10, 12] }[modo]; return t[ver <= 9 ? 0 : ver <= 26 ? 1 : 2]; }
    var partes = [], eci = null;
    while (br.restan() >= 4) {
      var modo = br.leer(4);
      if (modo === 0) break;
      if (modo === 7) { var b0 = br.leer(8); eci = b0 < 128 ? b0 : b0 < 192 ? ((b0 & 63) << 8) | br.leer(8) : ((b0 & 31) << 16) | br.leer(16); continue; }
      if (modo !== 1 && modo !== 2 && modo !== 4 && modo !== 8) throw new Error('Modo ' + modo + ' no soportado');
      var n = br.leer(cc(modo)), i;
      if (modo === 1) {
        var s = '';
        for (i = 0; i < n;) { var k = Math.min(3, n - i), vv = br.leer(k * 3 + 1); s += ('000' + vv).slice(-k); i += k; }
        partes.push(s);
      } else if (modo === 2) {
        var a = '';
        for (i = 0; i < n;) { if (n - i >= 2) { var w = br.leer(11); a += Q.ALFA[Math.floor(w / 45)] + Q.ALFA[w % 45]; i += 2; } else { a += Q.ALFA[br.leer(6)]; i++; } }
        partes.push(a);
      } else if (modo === 4) {
        var bs = []; for (i = 0; i < n; i++) bs.push(br.leer(8));
        partes.push(aTexto(bs, eci === 20 ? 'shift_jis' : eci === 3 ? 'iso-8859-1' : eci === 26 ? 'utf-8' : null)); bytes = bytes.concat(bs);
      } else {
        var kb = []; for (i = 0; i < n; i++) { var x = br.leer(13), val = Math.floor(x / 0xC0) * 0x100 + (x % 0xC0); val += val < 0x1F00 ? 0x8140 : 0xC140; kb.push(val >> 8, val & 255); }
        partes.push(aTexto(kb, 'shift_jis'));
      }
    }
    return partes.join('');
  }

  /* m[y][x] 0/1 -> {texto, version, ecc, mascara, corregidos} | null */
  function decodificarMatriz(m) {
    var tam = m.length, v = (tam - 17) / 4;
    if (tam < 21 || tam > 177 || v !== Math.floor(v)) return null;
    var fmt = leerFormato(m, tam); if (!fmt) return null;
    var fn = Q.mascaraFuncion(v), bits = [], x, y, der, vert, j;
    for (der = tam - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (vert = 0; vert < tam; vert++) for (j = 0; j < 2; j++) {
        x = der - j; y = ((der + 1) & 2) === 0 ? tam - 1 - vert : vert;
        if (!fn[y][x]) bits.push((m[y][x] ? 1 : 0) ^ (Q.invierte(fmt.mk, x, y) ? 1 : 0));
      }
    }
    var raw = Math.floor(Q.modulosBrutos(v) / 8), cw = [];
    for (var i = 0; i < raw; i++) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i * 8 + k]; cw.push(b); }
    var ne = Q.NIVELES[fmt.e], nb = Q.tablas.bloques[ne][v], le = Q.tablas.ecc[ne][v], cortos = nb - raw % nb, lc = Math.floor(raw / nb);
    var bl = [], p = 0, c;
    for (i = 0; i < nb; i++) bl.push({ dat: [], ecc: [], n: lc - le + (i < cortos ? 0 : 1) });
    for (c = 0; c < lc - le + 1; c++) for (i = 0; i < nb; i++) if (c < bl[i].n) bl[i].dat.push(cw[p++]);
    for (c = 0; c < le; c++) for (i = 0; i < nb; i++) bl[i].ecc.push(cw[p++]);
    var datos = [], corr = 0;
    for (i = 0; i < nb; i++) {
      var blk = bl[i].dat.concat(bl[i].ecc), r = corregirRS(blk, le);
      if (r < 0) return null;
      corr += r; datos = datos.concat(blk.slice(0, bl[i].n));
    }
    var texto;
    try { texto = segmentos(datos, v); } catch (e) { return null; }
    return { texto: texto, version: v, ecc: fmt.e, mascara: fmt.mk, corregidos: corr };
  }

  /* ---------- imagen ---------- */
  function gris(img) {
    var w = img.width, h = img.height, d = img.data, o = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < o.length; i++, j += 4) o[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    return o;
  }
  function binarizar(gr, w, h, modo) {   // 1 = oscuro
    var o = new Uint8Array(w * h), i, x, y;
    if (modo === 'otsu') {
      var hist = new Array(256).fill(0); for (i = 0; i < gr.length; i++) hist[gr[i]]++;
      var tot = gr.length, sum = 0; for (i = 0; i < 256; i++) sum += i * hist[i];
      var sb = 0, wb = 0, mx = -1, th = 128;
      for (i = 0; i < 256; i++) { wb += hist[i]; if (!wb) continue; var wf = tot - wb; if (!wf) break; sb += i * hist[i]; var mb = sb / wb, mf = (sum - sb) / wf, vr = wb * wf * (mb - mf) * (mb - mf); if (vr > mx) { mx = vr; th = i; } }
      for (i = 0; i < o.length; i++) o[i] = gr[i] <= th ? 1 : 0;
      return o;
    }
    var W = w + 1, ii = new Float64Array(W * (h + 1));
    for (y = 0; y < h; y++) { var rs = 0; for (x = 0; x < w; x++) { rs += gr[y * w + x]; ii[(y + 1) * W + x + 1] = ii[y * W + x + 1] + rs; } }
    var r = Math.max(8, Math.round(Math.min(w, h) / 16));
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      var s = ii[y1 * W + x1] - ii[y0 * W + x1] - ii[y1 * W + x0] + ii[y0 * W + x0], mean = s / ((x1 - x0) * (y1 - y0));
      o[y * w + x] = gr[y * w + x] < mean * 0.92 ? 1 : 0;
    }
    return o;
  }
  function esPatron(r, tol) {   // r: 5 longitudes (osc, claro, osc, claro, osc)
    var t = r[0] + r[1] + r[2] + r[3] + r[4]; if (t < 7) return 0;
    var mod = t / 7, mx = mod * (tol || 0.6);
    if (Math.abs(r[0] - mod) < mx && Math.abs(r[1] - mod) < mx && Math.abs(r[2] - 3 * mod) < 3 * mx && Math.abs(r[3] - mod) < mx && Math.abs(r[4] - mod) < mx) return mod;
    return 0;
  }
  function recorrer(bin, w, h, cx, cy, dx, dy) {   // longitudes a ambos lados desde un punto oscuro: [osc,claro,osc,claro,osc] centradas
    function paso(sx, sy, sign) {
      var x = sx, y = sy, res = [], col = 1, n = 0;
      while (res.length < 3) {
        x += dx * sign; y += dy * sign;
        if (x < 0 || y < 0 || x >= w || y >= h) { res.push(n); break; }
        var v = bin[y * w + x]; if (v === col) n++; else { res.push(n); col ^= 1; n = 1; }
      }
      return res;
    }
    var a = paso(cx, cy, -1), b = paso(cx, cy, 1);
    if (a.length < 3 || b.length < 3) return null;
    var r = [a[2], a[1], a[0] + b[0] + 1, b[1], b[2]]; r.off = (b[0] + b[1] + b[2] - a[0] - a[1] - a[2]) / 2; return r;
  }
  function buscarFinders(bin, w, h) {
    var cand = [], y, x;
    var paso = Math.max(1, Math.floor(h / 400));
    for (y = 0; y < h; y += paso) {
      var runs = [], col = 0, n = 0;
      for (x = 0; x <= w; x++) {
        var v = x < w ? bin[y * w + x] : 1 - col;
        if (x === 0) { col = v; n = 1; continue; }
        var cambio = v !== col;
        if (!cambio) { n++; continue; }
        runs.push({ c: col, n: n, x: x - n }); col = v; n = 1;
        var L = runs.length;
        if (v === 0 && L >= 5 && runs[L - 5].c === 1) {   // acaba de terminar un tramo oscuro
          var rr = [runs[L - 5].n, runs[L - 4].n, runs[L - 3].n, runs[L - 2].n, runs[L - 1].n];
          var mod = esPatron(rr);
          if (mod) {
            var cx0 = Math.round(runs[L - 5].x + (rr[0] + rr[1] + rr[2] + rr[3] + rr[4] - 1) / 2);
            if (!bin[y * w + cx0]) continue;
            var vr = recorrer(bin, w, h, cx0, y, 0, 1); if (!vr) continue;
            var m2 = esPatron(vr, 0.7); if (!m2) continue;
            var cyy = y + vr.off, cy0 = Math.round(cyy);
            var hr = bin[cy0 * w + cx0] ? recorrer(bin, w, h, cx0, cy0, 1, 0) : null; if (!hr) continue;
            var m3 = esPatron(hr, 0.7); if (!m3) continue;
            var hx = cx0 + hr.off;
            var mm = (mod + m2 + m3) / 3, ok = false;
            for (var i = 0; i < cand.length; i++) {
              var c = cand[i];
              if (Math.abs(c.x - hx) < mm * 2 && Math.abs(c.y - cyy) < mm * 2 && Math.abs(c.m - mm) < mm * 0.5 + 1) { c.x = (c.x * c.n + hx) / (c.n + 1); c.y = (c.y * c.n + cyy) / (c.n + 1); c.m = (c.m * c.n + mm) / (c.n + 1); c.n++; ok = true; break; }
            }
            if (!ok) cand.push({ x: hx, y: cyy, m: mm, n: 1 });
          }
        }
      }
    }
    return cand.filter(function (c) { return c.n >= 2; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 12);
  }
  function elegirTrio(c) {
    var mejor = null, pun = Infinity;
    for (var i = 0; i < c.length; i++) for (var j = i + 1; j < c.length; j++) for (var k = j + 1; k < c.length; k++) {
      var t = [c[i], c[j], c[k]], ms = t.map(function (a) { return a.m; }), mmax = Math.max.apply(null, ms), mmin = Math.min.apply(null, ms);
      if (mmax / mmin > 1.6) continue;
      for (var o = 0; o < 3; o++) {
        var O = t[o], A = t[(o + 1) % 3], B = t[(o + 2) % 3];
        var ax = A.x - O.x, ay = A.y - O.y, bx = B.x - O.x, by = B.y - O.y, la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (la < 10 || lb < 10) continue;
        var p = Math.abs(la - lb) / Math.max(la, lb) + Math.abs(ax * bx + ay * by) / (la * lb) + (mmax / mmin - 1) * 0.5 - 0.02 * (O.n + A.n + B.n);
        if (p < pun) { pun = p; mejor = { O: O, A: A, B: B }; }
      }
    }
    if (!mejor || pun > 0.6) return null;
    var cr = (mejor.A.x - mejor.O.x) * (mejor.B.y - mejor.O.y) - (mejor.A.y - mejor.O.y) * (mejor.B.x - mejor.O.x);
    return cr > 0 ? { tl: mejor.O, tr: mejor.A, bl: mejor.B } : { tl: mejor.O, tr: mejor.B, bl: mejor.A };
  }
  function muestrear(bin, w, h, t, tam) {
    var ux = (t.tr.x - t.tl.x) / (tam - 7), uy = (t.tr.y - t.tl.y) / (tam - 7), vx = (t.bl.x - t.tl.x) / (tam - 7), vy = (t.bl.y - t.tl.y) / (tam - 7), m = [], i, j;
    function px(x, y) { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= w || y >= h ? 0 : bin[y * w + x]; }
    for (j = 0; j < tam; j++) {
      var fila = new Uint8Array(tam);
      for (i = 0; i < tam; i++) {
        var a = i - 3, b = j - 3, X = t.tl.x + a * ux + b * vx, Y = t.tl.y + a * uy + b * vy;
        var s = px(X, Y) * 2 + px(X + 0.3 * (ux + vx), Y + 0.3 * (uy + vy)) + px(X - 0.3 * (ux + vx), Y - 0.3 * (uy + vy)) + px(X + 0.3 * (ux - vx), Y + 0.3 * (uy - vy)) + px(X - 0.3 * (ux - vx), Y - 0.3 * (uy - vy));
        fila[i] = s >= 4 ? 1 : 0;
      }
      m.push(fila);
    }
    return m;
  }
  function intentarBin(bin, w, h) {
    var c = buscarFinders(bin, w, h); if (c.length < 3) return null;
    var t = elegirTrio(c); if (!t) return null;
    var mod = (t.tl.m + t.tr.m + t.bl.m) / 3, d = (Math.hypot(t.tr.x - t.tl.x, t.tr.y - t.tl.y) + Math.hypot(t.bl.x - t.tl.x, t.bl.y - t.tl.y)) / 2;
    var dim = d / mod + 7, v0 = Math.round((dim - 17) / 4), orden = [v0, v0 - 1, v0 + 1, v0 - 2, v0 + 2];
    for (var i = 0; i < orden.length; i++) {
      var v = orden[i]; if (v < 1 || v > 40) continue;
      var tam = 17 + 4 * v, r = decodificarMatriz(muestrear(bin, w, h, t, tam));
      if (r) return r;
    }
    return null;
  }
  /* img: {data (RGBA), width, height} -> resultado | null */
  function decodificarImagen(img) {
    var w = img.width, h = img.height, gr = gris(img);
    var variantes = ['adaptativo', 'otsu'];
    for (var i = 0; i < variantes.length; i++) {
      var bin = binarizar(gr, w, h, variantes[i]), r = intentarBin(bin, w, h);
      if (r) return r;
      var inv2 = bin.map(function (x) { return 1 - x; }); r = intentarBin(inv2, w, h);
      if (r) { r.invertido = true; return r; }
    }
    return null;
  }
  return { decodificarMatriz: decodificarMatriz, decodificarImagen: decodificarImagen, corregirRS: corregirRS };
});
