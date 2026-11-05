/* Modos de mezcla segun W3C Compositing and Blending. Canales 0..1. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Mezcla = f(); })(this, function () {
  var X = {};
  X.modos = [
    ['normal', 'Normal', 'source-over'], ['multiplicar', 'Multiplicar', 'multiply'], ['trama', 'Trama (screen)', 'screen'],
    ['superponer', 'Superponer', 'overlay'], ['oscurecer', 'Oscurecer', 'darken'], ['aclarar', 'Aclarar', 'lighten'],
    ['sobreexponer', 'Sobreexponer color', 'color-dodge'], ['subexponer', 'Subexponer color', 'color-burn'],
    ['luzdura', 'Luz fuerte', 'hard-light'], ['luzsuave', 'Luz suave', 'soft-light'], ['diferencia', 'Diferencia', 'difference'],
    ['exclusion', 'Exclusion', 'exclusion'], ['tono', 'Tono', 'hue'], ['saturacion', 'Saturacion', 'saturation'],
    ['color', 'Color', 'color'], ['luminosidad', 'Luminosidad', 'luminosity']
  ];
  X.aCanvas = function (id) { for (var i = 0; i < X.modos.length; i++) if (X.modos[i][0] === id || X.modos[i][2] === id) return X.modos[i][2]; return 'source-over'; };
  var sep = {
    'source-over': function (b, s) { return s; },
    multiply: function (b, s) { return b * s; },
    screen: function (b, s) { return b + s - b * s; },
    overlay: function (b, s) { return sep['hard-light'](s, b); },
    darken: Math.min, lighten: Math.max,
    'color-dodge': function (b, s) { return b === 0 ? 0 : s >= 1 ? 1 : Math.min(1, b / (1 - s)); },
    'color-burn': function (b, s) { return b >= 1 ? 1 : s <= 0 ? 0 : 1 - Math.min(1, (1 - b) / s); },
    'hard-light': function (b, s) { return s <= 0.5 ? b * 2 * s : sep.screen(b, 2 * s - 1); },
    'soft-light': function (b, s) {
      if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
      var d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      return b + (2 * s - 1) * (d - b);
    },
    difference: function (b, s) { return Math.abs(b - s); },
    exclusion: function (b, s) { return b + s - 2 * b * s; }
  };
  var lum = function (c) { return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
  function clipColor(c) {
    var l = lum(c), n = Math.min(c[0], c[1], c[2]), x = Math.max(c[0], c[1], c[2]);
    if (n < 0) c = c.map(function (v) { return l + (v - l) * l / (l - n); });
    if (x > 1) c = c.map(function (v) { return l + (v - l) * (1 - l) / (x - l); });
    return c;
  }
  function setLum(c, l) { var d = l - lum(c); return clipColor(c.map(function (v) { return v + d; })); }
  var sat = function (c) { return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]); };
  function setSat(c, s) {
    var idx = [0, 1, 2].sort(function (a, b) { return c[a] - c[b]; }), o = [0, 0, 0];
    var mn = c[idx[0]], md = c[idx[1]], mx = c[idx[2]];
    if (mx > mn) { o[idx[1]] = (md - mn) * s / (mx - mn); o[idx[2]] = s; }
    return o;
  }
  var nosep = {
    hue: function (b, s) { return setLum(setSat(s, sat(b)), lum(b)); },
    saturation: function (b, s) { return setLum(setSat(b, sat(s)), lum(b)); },
    color: function (b, s) { return setLum(s, lum(b)); },
    luminosity: function (b, s) { return setLum(b, lum(s)); }
  };
  /* mezcla B(cb,cs) para un modo canvas */
  X.mezclarColor = function (modo, cb, cs) {
    modo = X.aCanvas(modo);
    if (nosep[modo]) return nosep[modo](cb, cs);
    var f = sep[modo] || sep['source-over'];
    return [f(cb[0], cs[0]), f(cb[1], cs[1]), f(cb[2], cs[2])];
  };
  /* compone origen (cs,as) sobre destino (cb,ab); devuelve [r,g,b,a] no premultiplicado */
  X.componer = function (modo, cb, ab, cs, as) {
    var B = X.mezclarColor(modo, cb, cs), ao = as + ab * (1 - as), o = [0, 0, 0, ao];
    for (var i = 0; i < 3; i++) {
      var co = (1 - as) * ab * cb[i] + (1 - ab) * as * cs[i] + as * ab * B[i];
      o[i] = ao ? co / ao : 0;
    }
    return o;
  };
  return X;
});
