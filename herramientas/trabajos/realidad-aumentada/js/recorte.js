/* PNG propios: recorte rectangular, quitar un color (transparencia por tolerancia con borde suave) y reducir tamano. Logica pura sobre ImageData + dialogo. window.RA.Recorte */
(function (root) {
  'use strict';
  var RA = root.RA = root.RA || {}, R = RA.Recorte = {};
  /* quita pixeles parecidos a (r,g,b); tol 0..255 distancia euclidiana/1.73; suave: ancho del degradado. Modifica y devuelve data (RGBA) */
  R.quitarColor = function (data, r, g, b, tol, suave) {
    var lim = tol * 1.732, s = Math.max(1, suave || 1), i;
    for (i = 0; i < data.length; i += 4) {
      var d = Math.sqrt((data[i] - r) * (data[i] - r) + (data[i + 1] - g) * (data[i + 1] - g) + (data[i + 2] - b) * (data[i + 2] - b));
      if (d <= lim) data[i + 3] = 0; else if (d < lim + s) data[i + 3] = Math.round(data[i + 3] * (d - lim) / s);
    }
    return data;
  };
  R.recortar = function (w, h, rect) { var x = Math.max(0, Math.min(w - 1, Math.round(rect.x))), y = Math.max(0, Math.min(h - 1, Math.round(rect.y))); return { x: x, y: y, w: Math.max(1, Math.min(w - x, Math.round(rect.w))), h: Math.max(1, Math.min(h - y, Math.round(rect.h))) }; };
  R.cajaOpaca = function (data, w, h) { var x0 = w, y0 = h, x1 = -1, y1 = -1, x, y; for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
  if (typeof module === 'object' && module.exports) module.exports = R;
})(typeof self !== 'undefined' ? self : this);
