/* Pincel / borrador / lapiz sobre un canvas de pixeles, con deshacer por teselas comprimidas (RLE). */
(function (IM) {
  var P = IM.Pincel = {}, T = 256, cacheSello = {};
  function sello(color, tam, dureza) {
    var s = Math.max(1, Math.round(tam)), key = color + '|' + s + '|' + Math.round(dureza * 20);
    if (cacheSello[key]) return cacheSello[key];
    var n = s + 2, c = IM.lienzo(n, n), x = c.getContext('2d'), r = s / 2;
    if (dureza >= 0.97 || s <= 2) { x.fillStyle = color; x.beginPath(); x.arc(n / 2, n / 2, r, 0, 7); x.fill(); }
    else {
      var g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, r), h = Math.max(0.01, dureza), col = window.Color.hexARgb(color);
      g.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)'); g.addColorStop(h, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)');
      g.addColorStop(1, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0)'); x.fillStyle = g; x.fillRect(0, 0, n, n);
    }
    if (Object.keys(cacheSello).length > 60) cacheSello = {};
    return (cacheSello[key] = c);
  }
  P.empezar = function (pixId, cv, opt) {
    return { pixId: pixId, cv: cv, x: cv.getContext('2d', { willReadFrequently: false }), tiles: {}, opt: opt, ultimo: null, resto: 0 };
  };
  function guardar(s, x0, y0, x1, y1) {
    var cv = s.cv;
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(cv.width, Math.ceil(x1)); y1 = Math.min(cv.height, Math.ceil(y1));
    for (var ty = Math.floor(y0 / T); ty <= Math.floor((y1 - 1) / T); ty++) for (var tx = Math.floor(x0 / T); tx <= Math.floor((x1 - 1) / T); tx++) {
      var k = tx + ',' + ty; if (s.tiles[k]) continue;
      var w = Math.min(T, cv.width - tx * T), h = Math.min(T, cv.height - ty * T);
      if (w <= 0 || h <= 0) continue;
      s.tiles[k] = { x: tx * T, y: ty * T, w: w, h: h, antes: s.x.getImageData(tx * T, ty * T, w, h).data };
    }
  }
  P.estampar = function (s, px, py, tam, alfa) {
    var o = s.opt, st = sello(o.color, tam, o.dureza), n = st.width, h = n / 2;
    guardar(s, px - h, py - h, px + h, py + h);
    s.x.globalAlpha = alfa; s.x.globalCompositeOperation = o.borrar ? 'destination-out' : 'source-over';
    s.x.drawImage(st, px - h, py - h); s.x.globalAlpha = 1; s.x.globalCompositeOperation = 'source-over';
  };
  /* segmento con separacion uniforme; p0/p1 {x,y,pr} en pixeles */
  P.segmento = function (s, p0, p1) {
    var o = s.opt, dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy), paso = Math.max(0.6, o.tam * 0.1), t = paso - s.resto;
    if (d === 0) return;
    while (t <= d) {
      var u = t / d, pr = p0.pr + (p1.pr - p0.pr) * u;
      P.estampar(s, p0.x + dx * u, p0.y + dy * u, o.tam * (o.presionTam ? 0.25 + 0.75 * pr : 1), o.alfa * (o.presionAlfa ? 0.2 + 0.8 * pr : 1));
      t += paso;
    }
    s.resto = d - (t - paso);
  };
  P.punto = function (s, p) { P.estampar(s, p.x, p.y, s.opt.tam * (s.opt.presionTam ? 0.25 + 0.75 * p.pr : 1), s.opt.alfa * (s.opt.presionAlfa ? 0.2 + 0.8 * p.pr : 1)); };
  function aplicar(s, lista, campo) {
    lista.forEach(function (t) { var id = new ImageData(new Uint8ClampedArray(window.RLE.descomprimir(t[campo], t.w * t.h * 4)), t.w, t.h); s.x.putImageData(id, t.x, t.y); });
    IM.Doc.Pix.invalidar(s.pixId); IM.E.dibujar();
  }
  P.terminar = function (s, nombre) {
    var lista = [];
    for (var k in s.tiles) {
      var t = s.tiles[k], d = s.x.getImageData(t.x, t.y, t.w, t.h).data;
      lista.push({ x: t.x, y: t.y, w: t.w, h: t.h, antes: window.RLE.comprimir(new Uint8Array(t.antes.buffer)), despues: window.RLE.comprimir(new Uint8Array(d.buffer)) });
    }
    IM.Doc.Pix.invalidar(s.pixId);
    if (!lista.length) return null;
    return { nombre: nombre || 'Pincelada', hacer: function () { aplicar(s, lista, 'despues'); }, deshacer: function () { aplicar(s, lista, 'antes'); } };
  };
  P.abortar = function (s) {
    for (var k in s.tiles) { var t = s.tiles[k]; s.x.putImageData(new ImageData(new Uint8ClampedArray(t.antes), t.w, t.h), t.x, t.y); }
    IM.Doc.Pix.invalidar(s.pixId);
  };
  /* perspectiva: homografia del cuadrado unidad al cuadrilatero q[0..3] (tl,tr,br,bl) */
  P.homografia = function (q) {
    var x0 = q[0].x, y0 = q[0].y, x1 = q[1].x, y1 = q[1].y, x2 = q[2].x, y2 = q[2].y, x3 = q[3].x, y3 = q[3].y;
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, a, b, c, d, e, f, g, h;
    if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) { g = h = 0; a = x1 - x0; b = x2 - x1; c = x0; d = y1 - y0; e = y2 - y1; f = y0; }
    else {
      var den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den;
      a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0; d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
      return function (u, v) { var w = g * u + h * v + 1; return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w }; };
    }
    return function (u, v) { return { x: a * u + b * v + c, y: d * u + e * v + f }; };
  };
  function tri(x, img, s0, s1, s2, d0, d1, d2) {
    var det = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y); if (!det) return;
    var a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / det, b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / det;
    var c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / det, d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / det;
    var e = d0.x - a * s0.x - c * s0.y, f = d0.y - b * s0.x - d * s0.y;
    var cx = (d0.x + d1.x + d2.x) / 3, cy = (d0.y + d1.y + d2.y) / 3;
    function ex(p) { var vx = p.x - cx, vy = p.y - cy, l = Math.hypot(vx, vy) || 1; return { x: p.x + vx / l * 0.7, y: p.y + vy / l * 0.7 }; }
    var e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
    x.save(); x.beginPath(); x.moveTo(e0.x, e0.y); x.lineTo(e1.x, e1.y); x.lineTo(e2.x, e2.y); x.closePath(); x.clip(); x.transform(a, b, c, d, e, f); x.drawImage(img, 0, 0); x.restore();
  }
  /* deforma 'img' hacia el cuadrilatero q (coordenadas del canvas de salida) */
  P.deformar = function (img, q, outW, outH) {
    var out = IM.lienzo(outW, outH), x = out.getContext('2d'), H = P.homografia(q), N = 20, sw = img.width, sh = img.height;
    x.imageSmoothingQuality = 'high';
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
      var a = H(u0, v0), b = H(u1, v0), c = H(u1, v1), d = H(u0, v1);
      var sa = { x: u0 * sw, y: v0 * sh }, sb = { x: u1 * sw, y: v0 * sh }, sc = { x: u1 * sw, y: v1 * sh }, sd = { x: u0 * sw, y: v1 * sh };
      tri(x, img, sa, sb, sc, a, b, c); tri(x, img, sa, sc, sd, a, c, d);
    }
    return out;
  };
})(window.IM);
