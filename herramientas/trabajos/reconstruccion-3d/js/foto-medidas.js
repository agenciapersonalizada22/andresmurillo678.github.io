/* Medidas por foto con objeto de referencia (puro). Solo es valido sobre el plano del objeto de referencia (pared, mesa, suelo). */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, P = R.FotoMed = {};
  function resolver(A, b) { // eliminacion gaussiana con pivoteo (n x n)
    var n = b.length, i, j, k; for (i = 0; i < n; i++) { var mx = i; for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[mx][i])) mx = j; var t = A[i]; A[i] = A[mx]; A[mx] = t; var tb = b[i]; b[i] = b[mx]; b[mx] = tb; if (Math.abs(A[i][i]) < 1e-12) throw new Error('Puntos de referencia degenerados (alinéalos en las 4 esquinas).'); for (j = i + 1; j < n; j++) { var f = A[j][i] / A[i][i]; for (k = i; k < n; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; } }
    var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x;
  }
  /* homografia que lleva 4 puntos de imagen (px) a 4 puntos del plano real (unidades reales) */
  P.homografia = function (img, real) {
    var A = [], b = []; for (var i = 0; i < 4; i++) { var x = img[i][0], y = img[i][1], X = real[i][0], Y = real[i][1]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X); A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y); }
    var h = resolver(A, b); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  };
  P.aplicar = function (H, p) { var w = H[6] * p[0] + H[7] * p[1] + H[8]; return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w]; };
  P.distancia = function (H, a, b) { var A = P.aplicar(H, a), B = P.aplicar(H, b); return Math.hypot(B[0] - A[0], B[1] - A[1]); };
  P.areaPoligono = function (H, pts) { var q = pts.map(function (p) { return P.aplicar(H, p); }), s = 0; for (var i = 0; i < q.length; i++) { var a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  /* modo simple: una sola referencia de largo conocido (supone que la camara mira de frente al plano) */
  P.escala = function (a, b, largoReal) { var px = Math.hypot(b[0] - a[0], b[1] - a[1]); return px ? largoReal / px : 0; };
  /* referencias comunes (ancho x alto en cm) */
  P.REFERENCIAS = [{ id: 'a4', nombre: 'Hoja A4', w: 21, h: 29.7 }, { id: 'carta', nombre: 'Hoja carta', w: 21.59, h: 27.94 }, { id: 'tarjeta', nombre: 'Tarjeta bancaria', w: 8.56, h: 5.398 }, { id: 'puerta', nombre: 'Puerta estándar (90 x 205)', w: 90, h: 205 }, { id: 'otra', nombre: 'Otra (medidas propias)', w: 10, h: 10 }];
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof self !== 'undefined' ? self : globalThis);
