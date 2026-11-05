/* Relleno por inundacion, varita magica y quitar fondo. data = Uint8ClampedArray RGBA. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Relleno = f(); })(this, function () {
  var R = {};
  function dist(d, i, r, g, b, a) {
    return Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b), Math.abs(d[i + 3] - a));
  }
  /* mascara 0/255 de los pixeles parecidos al de (x,y); contiguo=false -> global */
  R.region = function (d, w, h, x, y, tol, contiguo) {
    x = Math.floor(x); y = Math.floor(y);
    var m = new Uint8Array(w * h);
    if (x < 0 || y < 0 || x >= w || y >= h) return m;
    var s = (y * w + x) * 4, r = d[s], g = d[s + 1], b = d[s + 2], a = d[s + 3];
    if (contiguo === false) {
      for (var i = 0; i < w * h; i++) if (dist(d, i * 4, r, g, b, a) <= tol) m[i] = 255;
      return m;
    }
    var pila = [x, y];
    while (pila.length) {
      var yy = pila.pop(), xx = pila.pop(), x0 = xx;
      if (m[yy * w + xx]) continue;
      while (x0 > 0 && !m[yy * w + x0 - 1] && dist(d, (yy * w + x0 - 1) * 4, r, g, b, a) <= tol) x0--;
      var x1 = xx;
      while (x1 < w - 1 && !m[yy * w + x1 + 1] && dist(d, (yy * w + x1 + 1) * 4, r, g, b, a) <= tol) x1++;
      if (dist(d, (yy * w + xx) * 4, r, g, b, a) > tol) continue;
      for (var k = x0; k <= x1; k++) m[yy * w + k] = 255;
      for (var dy = -1; dy <= 1; dy += 2) {
        var ny = yy + dy; if (ny < 0 || ny >= h) continue;
        var dentro = false;
        for (var k2 = x0; k2 <= x1; k2++) {
          var ok = !m[ny * w + k2] && dist(d, (ny * w + k2) * 4, r, g, b, a) <= tol;
          if (ok && !dentro) { pila.push(k2, ny); dentro = true; } else if (!ok) dentro = false;
        }
      }
    }
    return m;
  };
  R.varita = R.region;
  R.rellenar = function (d, w, h, x, y, color, tol, contiguo, suavizar) {
    var m = R.region(d, w, h, x, y, tol, contiguo), n = 0;
    if (suavizar) m = R.suavizarMascara(m, w, h, 1);
    for (var i = 0; i < w * h; i++) if (m[i]) {
      var t = m[i] / 255, p = i * 4, ca = (color[3] == null ? 255 : color[3]) / 255 * t;
      var da = d[p + 3] / 255, oa = ca + da * (1 - ca);
      for (var c = 0; c < 3; c++) d[p + c] = oa ? (color[c] * ca + d[p + c] * da * (1 - ca)) / oa : 0;
      d[p + 3] = oa * 255; n++;
    }
    return n;
  };
  /* desenfoque de caja separable sobre mascara 0..255 */
  R.suavizarMascara = function (m, w, h, r) {
    if (r < 1) return m;
    var t = new Float32Array(w * h), o = new Uint8Array(w * h), x, y, k, s, n;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { s = 0; n = 0; for (k = -r; k <= r; k++) { var xx = x + k; if (xx >= 0 && xx < w) { s += m[y * w + xx]; n++; } } t[y * w + x] = s / n; }
    for (x = 0; x < w; x++) for (y = 0; y < h; y++) { s = 0; n = 0; for (k = -r; k <= r; k++) { var yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; n++; } } o[y * w + x] = Math.round(s / n); }
    return o;
  };
  /* Quita un color: tol (0..255) totalmente transparente; suav (0..255) rampa hacia opaco. */
  R.quitarColor = function (d, w, h, rgb, tol, suav, contiguo, semilla) {
    var N = w * h, lim = tol + Math.max(0, suav), cuenta = 0, i;
    var f = new Float32Array(N).fill(1);
    var obj = function (p) { return Math.max(Math.abs(d[p] - rgb[0]), Math.abs(d[p + 1] - rgb[1]), Math.abs(d[p + 2] - rgb[2])); };
    for (i = 0; i < N; i++) { var q = obj(i * 4); if (q <= tol) f[i] = 0; else if (q < lim) f[i] = (q - tol) / (lim - tol); }
    var perm = null;
    if (contiguo) {
      perm = new Uint8Array(N);
      var pila = [], sx = semilla ? semilla[0] : 0, sy = semilla ? semilla[1] : 0;
      if (!semilla) { for (var xx = 0; xx < w; xx++) { pila.push(xx, 0, xx, h - 1); } for (var yy = 0; yy < h; yy++) { pila.push(0, yy, w - 1, yy); } } else pila.push(sx, sy);
      while (pila.length) {
        var y2 = pila.pop(), x2 = pila.pop();
        if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue;
        var ix = y2 * w + x2; if (perm[ix] || f[ix] >= 1) continue;
        perm[ix] = 1; pila.push(x2 + 1, y2, x2 - 1, y2, x2, y2 + 1, x2, y2 - 1);
      }
    }
    for (i = 0; i < N; i++) {
      if (perm && !perm[i]) continue;
      if (f[i] < 1) { d[i * 4 + 3] = Math.round(d[i * 4 + 3] * f[i]); cuenta++; }
    }
    return cuenta;
  };
  return R;
});
