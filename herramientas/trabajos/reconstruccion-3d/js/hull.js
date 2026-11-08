/* Visual hull por siluetas (puro). Camaras con pose generica mirando a un objetivo; turntable = camaras en circulo. Y arriba.
   Campo = minimo (o k-esimo minimo) de la distancia firmada a la silueta en cada vista, en unidades del mundo; superficie en 0. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, H = R.Hull = {};
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  /* F en pixeles; cx,cy punto principal (por defecto centro) */
  H.camara = function (pos, objetivo, F, w, h, cx, cy) {
    var f = norm([objetivo[0] - pos[0], objetivo[1] - pos[1], objetivo[2] - pos[2]]), up = Math.abs(f[1]) > 0.999 ? [0, 0, -1] : [0, 1, 0], r = norm(cruz(f, up)), u = cruz(r, f);
    return { C: pos.slice(), dist: Math.hypot(objetivo[0] - pos[0], objetivo[1] - pos[1], objetivo[2] - pos[2]), r: r, u: u, f: f, F: F, w: w, h: h, cx: cx == null ? w / 2 : cx, cy: cy == null ? h / 2 : cy };
  };
  H.focalDesdeFov = function (fovGrados, w) { return (w / 2) / Math.tan(fovGrados * Math.PI / 360); };
  H.proyectar = function (c, P) {
    var dx = P[0] - c.C[0], dy = P[1] - c.C[1], dz = P[2] - c.C[2], z = dx * c.f[0] + dy * c.f[1] + dz * c.f[2];
    var x = dx * c.r[0] + dy * c.r[1] + dz * c.r[2], y = dx * c.u[0] + dy * c.u[1] + dz * c.u[2];
    return [c.cx + c.F * x / z, c.cy - c.F * y / z, z];
  };
  /* camaras en mesa giratoria equivalente: angulos en grados; dist = distancia al eje; elev en grados; ty altura del objetivo */
  H.camarasGiro = function (o) {
    var n = o.n, a0 = o.ini || 0, a1 = o.fin == null ? 360 : o.fin, cams = [], full = Math.abs(a1 - a0 - 360) < 1e-6, den = full ? n : Math.max(1, n - 1), e = (o.elev || 0) * Math.PI / 180;
    for (var i = 0; i < n; i++) {
      var th = (a0 + (a1 - a0) * i / den) * Math.PI / 180, ey = o.elevs ? o.elevs[i] * Math.PI / 180 : e, ty = o.ty || 0;
      var c = H.camara([o.dist * Math.cos(ey) * Math.sin(th), ty + o.dist * Math.sin(ey), o.dist * Math.cos(ey) * Math.cos(th)], [0, ty, 0], o.F, o.w, o.h, o.cx, o.cy); c.ang = th * 180 / Math.PI; cams.push(c);
    }
    return cams;
  };
  /* distancia firmada (positivo dentro) por chaflan 3-4, en pixeles */
  H.sdf = function (m, w, h) {
    function dt(valorObjetivo) { // distancia a los pixeles con m != valorObjetivo ... a pixeles con m == valorObjetivo
      var d = new Float32Array(w * h), INF = 1e9, a = 1, b = 1.41421356, i, x, y;
      for (i = 0; i < d.length; i++) d[i] = m[i] === valorObjetivo ? 0 : INF;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; var v = d[i]; if (x > 0 && d[i - 1] + a < v) v = d[i - 1] + a; if (y > 0) { if (d[i - w] + a < v) v = d[i - w] + a; if (x > 0 && d[i - w - 1] + b < v) v = d[i - w - 1] + b; if (x < w - 1 && d[i - w + 1] + b < v) v = d[i - w + 1] + b; } d[i] = v; }
      for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) { i = y * w + x; v = d[i]; if (x < w - 1 && d[i + 1] + a < v) v = d[i + 1] + a; if (y < h - 1) { if (d[i + w] + a < v) v = d[i + w] + a; if (x < w - 1 && d[i + w + 1] + b < v) v = d[i + w + 1] + b; if (x > 0 && d[i + w - 1] + b < v) v = d[i + w - 1] + b; } d[i] = v; }
      return d;
    }
    var dentro = dt(0), fuera = dt(1), o = new Float32Array(w * h), any = false; // dentro: distancia desde pixel objeto(1) al fondo(0)
    for (var i = 0; i < o.length; i++) { if (m[i]) { o[i] = dentro[i] - 0.5; any = true; } else o[i] = -(fuera[i] - 0.5); }
    if (!any) o.fill(-1e3); return o;
  };
  function muestra(s, w, h, x, y) { // bilineal con borde: fuera de imagen = penalizacion proporcional
    var ox = 0, oy = 0; if (x < 0) { ox = -x; x = 0; } else if (x > w - 1) { ox = x - (w - 1); x = w - 1; } if (y < 0) { oy = -y; y = 0; } else if (y > h - 1) { oy = y - (h - 1); y = h - 1; }
    var x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
    var v = (s[y0 * w + x0] * (1 - fx) + s[y0 * w + x1] * fx) * (1 - fy) + (s[y1 * w + x0] * (1 - fx) + s[y1 * w + x1] * fx) * fy;
    return v - (ox + oy);
  }
  /* caja que contiene el objeto: usa el cono de cada silueta (aprox.); devuelve {min,max} */
  H.cajaDesdeVistas = function (vistas, margen) {
    var R2 = 0, ymin = Infinity, ymax = -Infinity, S = R.Seg;
    vistas.forEach(function (v) {
      var c = v.cam, b = S.cajaMascara(v.mascara, c.w, c.h); if (!b) return;
      var zc = c.dist || Math.hypot(c.C[0], c.C[1], c.C[2]), tgy = c.C[1] + c.f[1] * zc, uy = Math.max(Math.abs(c.u[1]), 0.3);
      var hw = Math.max(Math.abs(b.x0 - c.cx), Math.abs(b.x1 - c.cx)) * zc / c.F; if (hw > R2) R2 = hw;
      var lo = tgy + (c.cy - b.y1) * zc / c.F / uy, hi = tgy + (c.cy - b.y0) * zc / c.F / uy; if (lo < ymin) ymin = lo; if (hi > ymax) ymax = hi;
    });
    margen = margen == null ? 0.08 : margen; var r = R2 * (1 + margen), alt = (ymax - ymin) * margen;
    return { min: [-r, ymin - alt, -r], max: [r, ymax + alt, r] };
  };
  /* vistas: [{cam, sdf:Float32Array}]; caja {min,max}; res = voxeles del lado mayor; ignorar = k vistas que se pueden saltar */
  H.tallar = function (vistas, caja, res, ignorar, progreso) {
    var tam = [caja.max[0] - caja.min[0], caja.max[1] - caja.min[1], caja.max[2] - caja.min[2]], paso = Math.max(tam[0], tam[1], tam[2]) / res;
    var nx = Math.ceil(tam[0] / paso) + 3, ny = Math.ceil(tam[1] / paso) + 3, nz = Math.ceil(tam[2] / paso) + 3, orig = [caja.min[0] - paso, caja.min[1] - paso, caja.min[2] - paso];
    var campo = new Float32Array(nx * ny * nz), nv = vistas.length, k = Math.min(ignorar || 0, Math.max(0, nv - 1)), bajos = new Float32Array(k + 1), P = [0, 0, 0];
    for (var z = 0; z < nz; z++) {
      for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) {
        P[0] = orig[0] + x * paso; P[1] = orig[1] + y * paso; P[2] = orig[2] + z * paso; var m = 1e9, cnt = 0; bajos.fill(1e9);
        for (var v = 0; v < nv; v++) {
          var c = vistas[v].cam, dx = P[0] - c.C[0], dy = P[1] - c.C[1], dz = P[2] - c.C[2], zc = dx * c.f[0] + dy * c.f[1] + dz * c.f[2], d;
          if (zc < 1e-6) d = -1e3; else { var u = c.cx + c.F * (dx * c.r[0] + dy * c.r[1] + dz * c.r[2]) / zc, vv = c.cy - c.F * (dx * c.u[0] + dy * c.u[1] + dz * c.u[2]) / zc; d = muestra(vistas[v].sdf, c.w, c.h, u, vv) * zc / c.F; }
          if (k === 0) { if (d < m) m = d; } else { // mantiene los k+1 menores
            if (d < bajos[k]) { var j = k; while (j > 0 && bajos[j - 1] > d) { bajos[j] = bajos[j - 1]; j--; } bajos[j] = d; }
          }
        }
        campo[x + nx * (y + ny * z)] = k === 0 ? m : bajos[k];
      }
      if (progreso && (z & 3) === 0) progreso(z / nz);
    }
    // marco exterior siempre fuera para cerrar la malla
    for (var i = 0; i < campo.length; i++) { var xx = i % nx, yy = (i / nx | 0) % ny, zz = i / (nx * ny) | 0; if (xx === 0 || yy === 0 || zz === 0 || xx === nx - 1 || yy === ny - 1 || zz === nz - 1) campo[i] = Math.min(campo[i], -paso); }
    return { campo: campo, nx: nx, ny: ny, nz: nz, orig: orig, paso: paso };
  };
  /* colores: para cada vertice, vista con la normal mas frontal (la oclusion no se resuelve: aproximado) */
  H.colorear = function (malla, vistas) {
    var N = R.Malla.normales(malla), p = malla.pos, nv = p.length / 3, col = new Float32Array(p.length), bil = function (im, x, y) { var xi = Math.max(0, Math.min(im.w - 1, Math.round(x))), yi = Math.max(0, Math.min(im.h - 1, Math.round(y))), o = (yi * im.w + xi) * 4; return [im.data[o], im.data[o + 1], im.data[o + 2]]; };
    for (var i = 0; i < nv; i++) {
      var P = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], n = [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], mejor = -2, bv = -1, rgb = null;
      for (var v = 0; v < vistas.length; v++) { var c = vistas[v].cam, d = norm([c.C[0] - P[0], c.C[1] - P[1], c.C[2] - P[2]]), s = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; if (s > mejor) { mejor = s; bv = v; } }
      if (bv >= 0 && vistas[bv].img) { var q = H.proyectar(vistas[bv].cam, P); rgb = bil(vistas[bv].img, q[0], q[1]); }
      col[i * 3] = rgb ? rgb[0] / 255 : 0.7; col[i * 3 + 1] = rgb ? rgb[1] / 255 : 0.7; col[i * 3 + 2] = rgb ? rgb[2] / 255 : 0.7;
    }
    return col;
  };
  if (typeof module === 'object' && module.exports) module.exports = H;
})(typeof self !== 'undefined' ? self : globalThis);
