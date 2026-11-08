/* Geometria pura de RA: homografias, pose desde marcador plano, cuaterniones, orientacion del dispositivo y distorsion de lente. window.RA.Geo */
(function (root) {
  'use strict';
  var RA = root.RA = root.RA || {}, G = RA.Geo = {};
  var D2R = Math.PI / 180;

  /* ---------- algebra 3x3 (arreglos de 9, por filas) ---------- */
  G.resolver = function (A, b) { // Gauss con pivote parcial; A n x n (arreglo de filas), b n
    var n = b.length, M = A.map(function (f, i) { return f.concat([b[i]]); }), i, j, k;
    for (i = 0; i < n; i++) {
      var p = i; for (j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
      if (Math.abs(M[p][i]) < 1e-12) return null;
      var t = M[i]; M[i] = M[p]; M[p] = t;
      for (j = i + 1; j < n; j++) { var f = M[j][i] / M[i][i]; for (k = i; k <= n; k++) M[j][k] -= f * M[i][k]; }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = M[i][n]; for (j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  };
  G.mul3 = function (a, b) { var r = [], i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]); return r; };
  G.det3 = function (m) { return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]); };
  G.inv3 = function (m) {
    var d = G.det3(m); if (Math.abs(d) < 1e-14) return null;
    return [(m[4] * m[8] - m[5] * m[7]) / d, (m[2] * m[7] - m[1] * m[8]) / d, (m[1] * m[5] - m[2] * m[4]) / d,
      (m[5] * m[6] - m[3] * m[8]) / d, (m[0] * m[8] - m[2] * m[6]) / d, (m[2] * m[3] - m[0] * m[5]) / d,
      (m[3] * m[7] - m[4] * m[6]) / d, (m[1] * m[6] - m[0] * m[7]) / d, (m[0] * m[4] - m[1] * m[3]) / d];
  };
  G.tr3 = function (m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; };

  /* ---------- homografia (DLT con h22 = 1) ---------- */
  G.homografia = function (src, dst) { // 4 puntos: src[i]=[x,y] -> dst[i]
    var A = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -x * v, -y * v]); b.push(v);
    }
    var h = G.resolver(A, b); if (!h) return null; h.push(1); return h;
  };
  G.aplicar = function (H, x, y) { var w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
  G.cuadUnidad = [[0, 0], [1, 0], [1, 1], [0, 1]];
  G.cuadAHom = function (q) { return G.homografia(G.cuadUnidad, q); }; // cuadrado unidad -> cuadrilatero
  G.errorReproj = function (H, src, dst) { var e = 0; src.forEach(function (p, i) { var q = G.aplicar(H, p[0], p[1]); e = Math.max(e, Math.hypot(q[0] - dst[i][0], q[1] - dst[i][1])); }); return e; };

  /* ---------- pose de un marcador cuadrado ----------
     Plano del marcador: x derecha, y arriba, lado = 1, centro en el origen; esquinas TL(-.5,.5) TR(.5,.5) BR(.5,-.5) BL(-.5,-.5).
     K = {f (px), cx, cy}. Devuelve {R (9, filas, columnas = ejes x,y,z del marcador en la camara OpenCV), t:[x,y,z] en lados de marcador}. */
  G.MODELO = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];
  G.homMarcador = function (esquinas) { return G.homografia(G.MODELO, esquinas); };
  function ortonormal(R) { // Newton para la parte ortogonal polar
    var Q = R.slice(), i;
    for (i = 0; i < 12; i++) { var It = G.tr3(G.inv3(Q) || [1, 0, 0, 0, 1, 0, 0, 0, 1]); Q = Q.map(function (v, k) { return 0.5 * (v + It[k]); }); }
    return Q;
  }
  G.poseDeHom = function (H, K) {
    var Ki = G.inv3([K.f, 0, K.cx, 0, K.f, K.cy, 0, 0, 1]); if (!Ki) return null;
    var M = G.mul3(Ki, H), c0 = [M[0], M[3], M[6]], c1 = [M[1], M[4], M[7]], c2 = [M[2], M[5], M[8]];
    var n0 = Math.hypot(c0[0], c0[1], c0[2]), n1 = Math.hypot(c1[0], c1[1], c1[2]), lam = 2 / (n0 + n1);
    if (c2[2] < 0) lam = -lam;
    var r1 = c0.map(function (v) { return v * lam; }), r2 = c1.map(function (v) { return v * lam; }), t = c2.map(function (v) { return v * lam; });
    var r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    var R = ortonormal([r1[0], r2[0], r3[0], r1[1], r2[1], r3[1], r1[2], r2[2], r3[2]]);
    return { R: R, t: t };
  };
  G.proyectar = function (pose, K, p) { // punto del marcador (x,y,z) -> pixel
    var R = pose.R, t = pose.t, X = R[0] * p[0] + R[1] * p[1] + R[2] * p[2] + t[0], Y = R[3] * p[0] + R[4] * p[1] + R[5] * p[2] + t[1], Z = R[6] * p[0] + R[7] * p[1] + R[8] * p[2] + t[2];
    return [K.f * X / Z + K.cx, K.f * Y / Z + K.cy];
  };
  G.homDePose = function (pose, K) { // plano del marcador (x,y) -> pixel
    var R = pose.R, t = pose.t, M = [R[0], R[1], t[0], R[3], R[4], t[1], R[6], R[7], t[2]]; return G.mul3([K.f, 0, K.cx, 0, K.f, K.cy, 0, 0, 1], M);
  };
  G.posCamara = function (pose) { var R = pose.R, t = pose.t; return [-(R[0] * t[0] + R[3] * t[1] + R[6] * t[2]), -(R[1] * t[0] + R[4] * t[1] + R[7] * t[2]), -(R[2] * t[0] + R[5] * t[1] + R[8] * t[2])]; };
  G.azElDist = function (pose) { var p = G.posCamara(pose), az = Math.atan2(p[1], p[0]) / D2R; if (az < 0) az += 360; return { az: az, el: Math.atan2(p[2], Math.hypot(p[0], p[1])) / D2R, dist: Math.hypot(p[0], p[1], p[2]) }; };
  G.focalDeFov = function (fovHDeg, ancho) { return (ancho / 2) / Math.tan(fovHDeg * D2R / 2); };
  /* matriz 4x4 de Three (column-major, 16) del marcador en la camara de Three (x der, y arriba, z atras) */
  G.matrizThree = function (pose) {
    var R = pose.R, t = pose.t; // F = diag(1,-1,-1)
    return [R[0], -R[3], -R[6], 0, R[1], -R[4], -R[7], 0, R[2], -R[5], -R[8], 0, t[0], -t[1], -t[2], 1];
  };
  G.fovVertical = function (K, alto) { return 2 * Math.atan((alto / 2) / K.f) / D2R; };

  /* ---------- cuaterniones [x,y,z,w] ---------- */
  var Q = G.Q = {};
  Q.mul = function (a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; };
  Q.conj = function (a) { return [-a[0], -a[1], -a[2], a[3]]; };
  Q.norm = function (a) { var n = Math.hypot(a[0], a[1], a[2], a[3]) || 1; return a.map(function (v) { return v / n; }); };
  Q.slerp = function (a, b, t) {
    var c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1; if (c < 0) { c = -c; s = -1; }
    if (c > 0.9995) return Q.norm(a.map(function (v, i) { return v + t * (s * b[i] - v); }));
    var th = Math.acos(c), sn = Math.sin(th), w1 = Math.sin((1 - t) * th) / sn, w2 = s * Math.sin(t * th) / sn;
    return a.map(function (v, i) { return v * w1 + b[i] * w2; });
  };
  Q.deEuler = function (x, y, z, orden) { // 'YXZ' (el de deviceorientation) o 'XYZ'
    var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    if (orden === 'YXZ') return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3];
    return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
  };
  Q.aMat3 = function (q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  };
  Q.deMat3 = function (m) {
    var tr = m[0] + m[4] + m[8], q;
    if (tr > 0) { var s = Math.sqrt(tr + 1) * 2; q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4]; }
    else if (m[0] > m[4] && m[0] > m[8]) { var s1 = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2; q = [s1 / 4, (m[1] + m[3]) / s1, (m[2] + m[6]) / s1, (m[7] - m[5]) / s1]; }
    else if (m[4] > m[8]) { var s2 = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2; q = [(m[1] + m[3]) / s2, s2 / 4, (m[5] + m[7]) / s2, (m[2] - m[6]) / s2]; }
    else { var s3 = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2; q = [(m[2] + m[6]) / s3, (m[5] + m[7]) / s3, s3 / 4, (m[3] - m[1]) / s3]; }
    return Q.norm(q);
  };
  Q.rotar = function (q, v) { var m = Q.aMat3(q); return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; };

  /* orientacion del dispositivo (alpha, beta, gamma en grados; pantalla en grados) -> cuaternion de la camara de Three (mira a -z) */
  G.cuatDispositivo = function (alpha, beta, gamma, pantalla) {
    var q = Q.deEuler((beta || 0) * D2R, (alpha || 0) * D2R, -(gamma || 0) * D2R, 'YXZ');
    q = Q.mul(q, [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]); // la camara mira por detras del telefono
    return Q.norm(Q.mul(q, Q.deEuler(0, 0, -(pantalla || 0) * D2R, 'XYZ')));
  };
  G.yawDe = function (q) { var f = Q.rotar(q, [0, 0, -1]); return Math.atan2(-f[0], -f[2]); };

  /* ---------- distorsion de lente (Cardboard) ----------
     Coordenadas normalizadas del ojo (centro en 0, radio 1 = borde). El shader toma el pixel de salida p y muestrea la imagen en p * f(r),
     f(r) = 1 + k1 r^2 + k2 r^4 (barril: k > 0 estira los bordes al muestrear, comprime la imagen mostrada hacia el centro). */
  G.distorsion = function (x, y, k1, k2) { var r2 = x * x + y * y, f = 1 + k1 * r2 + k2 * r2 * r2; return [x * f, y * f]; };
  G.distorsionInversa = function (u, v, k1, k2) { // dado el punto de la imagen (u,v) devuelve donde se vera en pantalla
    var r = Math.hypot(u, v); if (r < 1e-12) return [0, 0];
    var s = r, i; for (i = 0; i < 30; i++) { var f = 1 + k1 * s * s + k2 * s * s * s * s, g = s * f - r, d = 1 + 3 * k1 * s * s + 5 * k2 * s * s * s * s; s -= g / d; }
    return [u / r * s, v / r * s];
  };

  /* ---------- varios ---------- */
  G.bilineal = function (c, u, v) { // c: 4 esquinas TL,TR,BR,BL
    var a = 1 - u, b = 1 - v;
    return [a * b * c[0][0] + u * b * c[1][0] + u * v * c[2][0] + a * v * c[3][0], a * b * c[0][1] + u * b * c[1][1] + u * v * c[2][1] + a * v * c[3][1]];
  };
  G.cssMatrix3d = function (H, w, h) { // pinta un elemento de w x h (origen arriba-izq) sobre el cuadrilatero: H lleva (x,y) del elemento a pixel
    var m = H.map(function (v) { return v / H[8]; });
    return 'matrix3d(' + [m[0], m[3], 0, m[6], m[1], m[4], 0, m[7], 0, 0, 1, 0, m[2], m[5], 0, 1].join(',') + ')';
  };
  G.suavizar = function (a, b, k) { return a.map(function (v, i) { return v + (b[i] - v) * k; }); };
  G.dist = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  if (typeof module === 'object' && module.exports) module.exports = G;
})(typeof self !== 'undefined' ? self : this);
