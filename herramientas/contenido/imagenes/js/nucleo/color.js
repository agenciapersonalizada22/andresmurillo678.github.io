/* Conversion de color. Canales rgb 0..255, h 0..360, s/l/v 0..1 */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Color = f(); })(this, function () {
  var C = {};
  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  C.hexARgb = function (h) {
    h = String(h).replace('#', '').trim();
    if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h.slice(0, 6), 16);
    if (isNaN(n)) return [0, 0, 0, 255];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255];
  };
  C.rgbAHex = function (r, g, b) {
    if (Array.isArray(r)) { b = r[2]; g = r[1]; r = r[0]; }
    return '#' + [r, g, b].map(function (v) { return ('0' + Math.round(cl(v, 0, 255)).toString(16)).slice(-2); }).join('');
  };
  C.rgbAHsl = function (r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  function hue2(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 0.5) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
  C.hslARgb = function (h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (!s) { var v = Math.round(l * 255); return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [hue2(p, q, h + 1 / 3), hue2(p, q, h), hue2(p, q, h - 1 / 3)].map(function (x) { return Math.round(x * 255); });
  };
  C.rgbAHsv = function (r, g, b) {
    var hsl = C.rgbAHsl(r, g, b); r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return [hsl[0], mx ? (mx - mn) / mx : 0, mx];
  };
  C.hsvARgb = function (h, s, v) {
    h = (((h % 360) + 360) % 360) / 60;
    var i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    var o = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return o.map(function (x) { return Math.round(x * 255); });
  };
  C.luminancia = function (r, g, b) {
    return [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (a, v, i) { return a + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  };
  C.contraste = function (a, b) {
    var l1 = C.luminancia(a[0], a[1], a[2]), l2 = C.luminancia(b[0], b[1], b[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  C.mezclar = function (a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); };
  C.textoSobre = function (hex) { var c = C.hexARgb(hex); return C.luminancia(c[0], c[1], c[2]) > 0.4 ? '#111111' : '#ffffff'; };
  return C;
});
