/* Dibujo del QR: SVG (estilos cuadrado/redondeado/puntos), logo central con limite segun correccion, PNG por canvas,
   contraste y verificacion de lectura con el decodificador propio. Logica de cadenas pura (Node y navegador). */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.QRRender = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var R = {};
  var DEF = { fg: '#000000', bg: '#ffffff', margen: 4, estilo: 'cuadrado', redondeo: 0.5, logo: null, logoTam: 0.2, transparente: false };
  R.DEF = DEF;
  /* fraccion maxima del LADO que puede tapar el logo (con su holgura): ~45 % de la capacidad de recuperacion de cada nivel */
  R.maxLogo = function (ecc) { return { L: 0.17, M: 0.25, Q: 0.33, H: 0.38 }[ecc] || 0.17; };
  function limpio(o) { o = Object.assign({}, DEF, o || {}); o.margen = Math.max(0, Math.min(20, Math.round(o.margen))); o.redondeo = Math.max(0, Math.min(0.5, +o.redondeo || 0)); return o; }
  function esFinder(x, y, n) { return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7); }
  /* region cubierta por el logo, en modulos: {x0,y0,x1,y1} (cuadrada centrada, tamaño impar de modulos para centrar bien) */
  R.regionLogo = function (n, o) {
    o = limpio(o); if (!o.logo) return null;
    var tam = Math.min(o.logoTam, 0.5), lado = Math.max(1, Math.round(n * tam)); if ((n - lado) % 2) lado++;   // centrado exacto
    var x0 = (n - lado) / 2; return { x0: x0, y0: x0, x1: x0 + lado, y1: x0 + lado, lado: lado };
  };
  function enRegion(x, y, r) { return r && x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1; }
  /* contenido interior (sin <svg>): coordenadas en modulos, con margen. Devuelve {markup, lado} */
  R.interior = function (qr, o) {
    o = limpio(o); var n = qr.tam, m = qr.modulos, mg = o.margen, lado = n + 2 * mg, reg = R.regionLogo(n, o), s = [], x, y;
    if (!o.transparente) s.push('<rect width="' + lado + '" height="' + lado + '" fill="' + o.bg + '"/>');
    var d = [], rr = o.redondeo;
    if (o.estilo === 'cuadrado') {
      for (y = 0; y < n; y++) for (x = 0; x < n;) {
        if (!m[y][x] || enRegion(x, y, reg)) { x++; continue; }
        var x2 = x; while (x2 < n && m[y][x2] && !enRegion(x2, y, reg)) x2++;
        d.push('M' + (x + mg) + ' ' + (y + mg) + 'h' + (x2 - x) + 'v1h-' + (x2 - x) + 'z'); x = x2;
      }
      if (d.length) s.push('<path fill="' + o.fg + '" d="' + d.join('') + '"/>');
    } else {
      var cuerpo = [];
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
        if (!m[y][x] || esFinder(x, y, n) || enRegion(x, y, reg)) continue;
        var cx = x + mg + 0.5, cy = y + mg + 0.5;
        if (o.estilo === 'puntos') { var r = 0.46; cuerpo.push('M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 -' + 2 * r + ' 0z'); }
        else { var q = 0.5 * rr * 1.0, a = 0.5 - 0.0; cuerpo.push('M' + (cx - a + q) + ' ' + (cy - a) + 'h' + (1 - 2 * q) + 'a' + q + ' ' + q + ' 0 0 1 ' + q + ' ' + q + 'v' + (1 - 2 * q) + 'a' + q + ' ' + q + ' 0 0 1 -' + q + ' ' + q + 'h-' + (1 - 2 * q) + 'a' + q + ' ' + q + ' 0 0 1 -' + q + ' -' + q + 'v-' + (1 - 2 * q) + 'a' + q + ' ' + q + ' 0 0 1 ' + q + ' -' + q + 'z'); }
      }
      if (cuerpo.length) s.push('<path fill="' + o.fg + '" d="' + cuerpo.join('') + '"/>');
      // patrones de busqueda como anillos redondeados (siguen siendo claramente detectables 1:1:3:1:1)
      [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
        var X = p[0] + mg, Y = p[1] + mg, k = rr * 2.4;
        function rc(x0, y0, w, rad) { rad = Math.min(rad, w / 2); return 'M' + (x0 + rad) + ' ' + y0 + 'h' + (w - 2 * rad) + 'a' + rad + ' ' + rad + ' 0 0 1 ' + rad + ' ' + rad + 'v' + (w - 2 * rad) + 'a' + rad + ' ' + rad + ' 0 0 1 -' + rad + ' ' + rad + 'h-' + (w - 2 * rad) + 'a' + rad + ' ' + rad + ' 0 0 1 -' + rad + ' -' + rad + 'v-' + (w - 2 * rad) + 'a' + rad + ' ' + rad + ' 0 0 1 ' + rad + ' -' + rad + 'z'; }
        s.push('<path fill="' + o.fg + '" fill-rule="evenodd" d="' + rc(X, Y, 7, k) + rc(X + 1, Y + 1, 5, k * 0.6) + '"/>');
        s.push('<path fill="' + o.fg + '" d="' + rc(X + 2, Y + 2, 3, k * 0.45) + '"/>');
      });
    }
    if (reg && o.logo) {
      var pad = 0.35, lx = reg.x0 + mg, ly = reg.y0 + mg, lw = reg.lado;
      if (!o.transparente) s.push('<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="' + lw + '" fill="' + o.bg + '"/>');
      s.push('<image href="' + o.logo + '" x="' + (lx + pad) + '" y="' + (ly + pad) + '" width="' + (lw - 2 * pad) + '" height="' + (lw - 2 * pad) + '" preserveAspectRatio="xMidYMid meet"/>');
    }
    return { markup: s.join(''), lado: lado };
  };
  /* SVG completo. px: tamaño en pixeles CSS (o null = sin tamaño, escala por viewBox) */
  R.svg = function (qr, o, px) {
    var i = R.interior(qr, o);
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + i.lado + ' ' + i.lado + '"' + (px ? ' width="' + px + '" height="' + px + '"' : '') + ' shape-rendering="' + (limpio(o).estilo === 'cuadrado' ? 'crispEdges' : 'geometricPrecision') + '" role="img">' + i.markup + '</svg>';
  };
  /* PNG: Promise<Blob>. El tamaño se ajusta a un multiplo entero de modulos para bordes nitidos */
  R.png = function (qr, o, px) {
    var i = R.interior(qr, o), lado = i.lado, esc = Math.max(1, Math.round((px || 1024) / lado)), P = lado * esc;
    return new Promise(function (ok, ko) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = P; c.height = P; var x = c.getContext('2d'); x.imageSmoothingEnabled = limpio(o).estilo !== 'cuadrado'; x.drawImage(img, 0, 0, P, P);
        c.toBlob(function (b) { b ? ok(b) : ko(new Error('PNG no disponible')); }, 'image/png');
      };
      img.onerror = function () { ko(new Error('No se pudo dibujar el QR (¿logo no válido?).')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(R.svg(qr, o, P));
    });
  };
  /* ---- contraste (WCAG) ---- */
  function lum(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null; var v = [0, 2, 4].map(function (k) { var c = parseInt(m[1].substr(k, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  R.contraste = function (a, b) { var x = lum(a), y = lum(b); if (x == null || y == null) return 1; var hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };
  R.oscuro = function (c) { var l = lum(c); return l != null && l < 0.4; };
  /* ---- verificacion: se tapa la region del logo (de claro y de oscuro) y se decodifica ---- */
  R.verificarLogo = function (qr, o, decodificar, esperado) {
    var reg = R.regionLogo(qr.tam, o); if (!reg) return { ok: true, motivo: 'sin logo' };
    var resultados = [0, 1].map(function (val) {
      var m = qr.modulos.map(function (f) { return Uint8Array.from(f); });
      for (var y = reg.y0; y < reg.y1; y++) for (var x = reg.x0; x < reg.x1; x++) m[y][x] = val;
      var r = decodificar(m); return !!(r && r.texto === esperado);
    });
    return { ok: resultados[0] && resultados[1], claro: resultados[0], oscuro: resultados[1] };
  };
  return R;
});
