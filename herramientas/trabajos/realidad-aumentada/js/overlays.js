/* Capas de superposicion 2D: modelo de overlay, bitmaps (SVG propios, PNG del usuario, pantallas), anclaje (imagen / marcador / rostro) y
   deformacion por perspectiva (4 puntos) o malla 3x3 sobre canvas 2D. window.RA.Ov */
(function (root) {
  'use strict';
  var RA = root.RA = root.RA || {}, G = RA.Geo, B = RA.Biblio, O = RA.Ov = {};
  var cache = {}, pendientes = {}, tmp = null;
  O.pngs = {};                      // ref -> dataURL (PNG propios; solo en este dispositivo)
  O.alCargar = null;                // callback cuando termina de cargar un bitmap
  O.MEZCLAS = [['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Pantalla'], ['overlay', 'Superponer'], ['soft-light', 'Luz suave'], ['color', 'Color'], ['luminosity', 'Luminosidad']];

  O.nuevo = function (o) {
    return Object.assign({ id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre: 'Capa', fuente: { tipo: 'lib', clave: 'for_estrella', p: {} }, ancla: 'imagen',
      q: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]], malla: null, m: { x: 0, y: 0, w: 1, h: 1, rot: 0 }, r: { x: 0, y: 0, w: 1, h: 1 }, op: 1, mez: 'source-over', espejo: false,
      sombra: { on: false, blur: 10, dx: 4, dy: 6, color: '#000000', op: 0.5 }, visible: true, bloq: false }, o || {});
  };
  O.desdeLib = function (clave, p, asp) { // overlay centrado con el aspecto de la plantilla
    var it = B.porClave(clave), a = (it.w / it.h) / (asp || 1), w = a >= 1 ? 0.42 : 0.42 * a, h = a >= 1 ? 0.42 / a : 0.42, cx = 0.5, cy = 0.5;
    var ov = O.nuevo({ nombre: it.nombre, fuente: { tipo: 'lib', clave: clave, p: Object.assign(B.defParams(it), p || {}) }, mez: it.mez === 'normal' ? 'source-over' : (it.mez || 'source-over') });
    if (it.pant) ov.fuente.contenido = { tipo: 'color', color: '#1c7ed6', texto: 'Pantalla virtual' };
    ov.q = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]]; ov.asp = it.w / it.h; return ov;
  };
  O.desdePNG = function (ref, w, h, asp) { var a = (w / h) / (asp || 1), ww = a >= 1 ? 0.5 : 0.5 * a, hh = a >= 1 ? 0.5 / a : 0.5; var ov = O.nuevo({ nombre: 'PNG propio', fuente: { tipo: 'png', ref: ref } }); ov.q = [[0.5 - ww / 2, 0.5 - hh / 2], [0.5 + ww / 2, 0.5 - hh / 2], [0.5 + ww / 2, 0.5 + hh / 2], [0.5 - ww / 2, 0.5 + hh / 2]]; ov.asp = w / h; return ov; };

  /* ---------- bitmaps ---------- */
  function clave(ov) { var f = ov.fuente; return f.tipo === 'lib' ? 'L' + f.clave + JSON.stringify(f.p || {}) + (f.contenido ? JSON.stringify(f.contenido) + (f.contenido.ref && O.pngs[f.contenido.ref] ? O.pngs[f.contenido.ref].length : '') : '') : f.tipo === 'png' ? 'P' + f.ref + (O.pngs[f.ref] ? O.pngs[f.ref].length : '') : f.tipo; }
  function cargarImg(url) { return new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ko(new Error('imagen')); }; i.src = url; }); }
  O.dimsLib = function (it) { var k = 512 / Math.max(it.w, it.h); return [Math.round(it.w * k), Math.round(it.h * k)]; };
  async function construir(ov) {
    var f = ov.fuente, cv = document.createElement('canvas'), x = cv.getContext('2d');
    if (f.tipo === 'png') { var u = O.pngs[f.ref]; if (!u) throw new Error('falta'); var im = await cargarImg(u); cv.width = im.naturalWidth; cv.height = im.naturalHeight; x.drawImage(im, 0, 0); return cv; }
    var it = B.porClave(f.clave); if (!it) throw new Error('lib'); var d = O.dimsLib(it); cv.width = d[0]; cv.height = d[1];
    var k = d[0] / it.w;
    if (it.pant) {
      var c = f.contenido || { tipo: 'color', color: '#1c7ed6' }, pa = it.pant;
      x.save(); x.beginPath(); x.rect(pa[0] * k, pa[1] * k, pa[2] * k, pa[3] * k); x.clip(); x.fillStyle = c.color || '#1c7ed6'; x.fillRect(pa[0] * k, pa[1] * k, pa[2] * k, pa[3] * k);
      if (c.tipo === 'img' && c.ref && O.pngs[c.ref]) { var ci = await cargarImg(O.pngs[c.ref]); var s = Math.max(pa[2] * k / ci.naturalWidth, pa[3] * k / ci.naturalHeight); x.drawImage(ci, pa[0] * k + (pa[2] * k - ci.naturalWidth * s) / 2, pa[1] * k + (pa[3] * k - ci.naturalHeight * s) / 2, ci.naturalWidth * s, ci.naturalHeight * s); }
      else if (c.tipo === 'iframe') { x.fillStyle = '#f1f3f5'; x.fillRect(pa[0] * k, pa[1] * k, pa[2] * k, pa[3] * k); x.fillStyle = '#495057'; x.font = 'bold ' + Math.round(pa[3] * k / 8) + 'px system-ui'; x.textAlign = 'center'; x.fillText('Página web', (pa[0] + pa[2] / 2) * k, (pa[1] + pa[3] / 2) * k); x.font = Math.round(pa[3] * k / 14) + 'px system-ui'; x.fillText((c.url || '').replace(/^https?:\/\//, '').slice(0, 34), (pa[0] + pa[2] / 2) * k, (pa[1] + pa[3] / 2) * k + pa[3] * k / 8); }
      else if (c.texto) { x.fillStyle = c.colorTexto || '#ffffff'; x.font = 'bold ' + Math.round(pa[3] * k / 7) + 'px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(c.texto, (pa[0] + pa[2] / 2) * k, (pa[1] + pa[3] / 2) * k, pa[2] * k * 0.9); }
      x.restore();
      var marco = await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B.svgTexto(it, f.p).replace(/width="\d+" height="\d+"/, 'width="' + d[0] + '" height="' + d[1] + '"')));
      // el marco tiene la pantalla tapada: se recorta el hueco de la pantalla
      var t2 = document.createElement('canvas'); t2.width = d[0]; t2.height = d[1]; var y2 = t2.getContext('2d'); y2.drawImage(marco, 0, 0); y2.globalCompositeOperation = 'destination-out'; y2.fillRect(pa[0] * k, pa[1] * k, pa[2] * k, pa[3] * k);
      x.drawImage(t2, 0, 0); return cv;
    }
    var im2 = await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(B.svgTexto(it, f.p).replace(/width="\d+" height="\d+"/, 'width="' + d[0] + '" height="' + d[1] + '"')));
    x.drawImage(im2, 0, 0, d[0], d[1]); return cv;
  }
  O.bitmap = function (ov) {
    var k = clave(ov); if (cache[k]) return cache[k]; if (pendientes[k]) return null; if (cache[k] === false) return null;
    pendientes[k] = construir(ov).then(function (cv) { cache[k] = cv; delete pendientes[k]; if (O.alCargar) O.alCargar(); }).catch(function () { cache[k] = false; delete pendientes[k]; if (O.alCargar) O.alCargar(); });
    return null;
  };
  O.faltaBitmap = function (ov) { return cache[clave(ov)] === false; };
  O.limpiarCache = function () { cache = {}; };

  /* ---------- geometria ---------- */
  /* ctx: {W,H, Hm (homografia marcador->px, plano con y arriba, lado 1) o null, rostro {x,y,w,h,ang} en px o null}. Devuelve quad en px o null. */
  O.cuadPx = function (ov, c) {
    if (ov.ancla === 'marcador') { if (!c.Hm) return null; var m = ov.m, ro = (m.rot || 0) * Math.PI / 180, co = Math.cos(ro), si = Math.sin(ro);
      return [[-m.w / 2, m.h / 2], [m.w / 2, m.h / 2], [m.w / 2, -m.h / 2], [-m.w / 2, -m.h / 2]].map(function (p) { return G.aplicar(c.Hm, m.x + p[0] * co - p[1] * si, m.y + p[0] * si + p[1] * co); }); }
    if (ov.ancla === 'rostro') { if (!c.rostro) return null; var f = c.rostro, r = ov.r, ca = Math.cos(f.ang || 0), sa = Math.sin(f.ang || 0), cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(function (p) { var dx = (p[0] - 0.5) * f.w, dy = (p[1] - 0.5) * f.h; return [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca]; }); }
    if (ov.malla && ov.malla.length === 9) { var M = ov.malla; return [M[0], M[2], M[8], M[6]].map(function (p) { return [p[0] * c.W, p[1] * c.H]; }); }
    return ov.q.map(function (p) { return [p[0] * c.W, p[1] * c.H]; });
  };
  O.mallaPx = function (ov, c) { return ov.malla && ov.malla.length === 9 && ov.ancla === 'imagen' ? ov.malla.map(function (p) { return [p[0] * c.W, p[1] * c.H]; }) : null; };
  O.hacerMalla = function (ov) { var q = ov.q, m = []; for (var j = 0; j < 3; j++) for (var i = 0; i < 3; i++) m.push(G.bilineal(q, i / 2, j / 2)); ov.malla = m; };
  O.dentro = function (quad, x, y) { var s = 0, i; for (i = 0; i < 4; i++) { var a = quad[i], b = quad[(i + 1) % 4], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c > 0) s |= 1; else if (c < 0) s |= 2; } return s !== 3; };
  /* quad de imagen (0..1) -> propiedades del marcador, dado Hm inverso del marcador (px -> plano) */
  O.aMarcador = function (ov, c) { var q = O.cuadPx(Object.assign({}, ov, { ancla: 'imagen' }), c), Hi = c.Hm && G.inv3(c.Hm); if (!Hi) return false; var p = q.map(function (a) { return G.aplicar(Hi, a[0], a[1]); });
    ov.m = { x: (p[0][0] + p[2][0]) / 2, y: (p[0][1] + p[2][1]) / 2, w: G.dist(p[0], p[1]), h: G.dist(p[0], p[3]), rot: Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]) * 180 / Math.PI }; ov.ancla = 'marcador'; ov.malla = null; return true; };

  /* ---------- deformacion ---------- */
  function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
    var dx1 = s1[0] - s0[0], dy1 = s1[1] - s0[1], dx2 = s2[0] - s0[0], dy2 = s2[1] - s0[1], det = dx1 * dy2 - dx2 * dy1; if (!det) return;
    var u1 = d1[0] - d0[0], u2 = d2[0] - d0[0], v1 = d1[1] - d0[1], v2 = d2[1] - d0[1];
    var a = (u1 * dy2 - u2 * dy1) / det, c = (u2 * dx1 - u1 * dx2) / det, b = (v1 * dy2 - v2 * dy1) / det, d = (v2 * dx1 - v1 * dx2) / det;
    var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    function ex(p) { var vx = p[0] - cx, vy = p[1] - cy, l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * 0.7, p[1] + vy / l * 0.7]; }
    var e0 = ex(d0), e1 = ex(d1), e2 = ex(d2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  /* dibuja 'img' (canvas) deformado: quad (4 px) o malla (9 px) */
  O.deformar = function (ctx, img, quad, malla, espejo) {
    var iw = img.width, ih = img.height, i, j, n;
    function src(u, v) { return [(espejo ? 1 - u : u) * iw, v * ih]; }
    if (malla) {
      n = 6; for (var cj = 0; cj < 2; cj++) for (var ci = 0; ci < 2; ci++) {
        var c4 = [malla[cj * 3 + ci], malla[cj * 3 + ci + 1], malla[(cj + 1) * 3 + ci + 1], malla[(cj + 1) * 3 + ci]];
        for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
          var u0 = (ci + i / n) / 2, u1 = (ci + (i + 1) / n) / 2, v0 = (cj + j / n) / 2, v1 = (cj + (j + 1) / n) / 2, fu0 = i / n, fu1 = (i + 1) / n, fv0 = j / n, fv1 = (j + 1) / n;
          var p00 = G.bilineal(c4, fu0, fv0), p10 = G.bilineal(c4, fu1, fv0), p11 = G.bilineal(c4, fu1, fv1), p01 = G.bilineal(c4, fu0, fv1);
          tri(ctx, img, src(u0, v0), src(u1, v0), src(u1, v1), p00, p10, p11); tri(ctx, img, src(u0, v0), src(u1, v1), src(u0, v1), p00, p11, p01);
        }
      }
      return;
    }
    var H = G.cuadAHom(quad); if (!H) return;
    var lado = Math.max(G.dist(quad[0], quad[1]), G.dist(quad[1], quad[2]), G.dist(quad[2], quad[3]), G.dist(quad[3], quad[0]));
    var pers = Math.abs(H[6]) + Math.abs(H[7]) > 1e-9 ? 1 : 0; n = pers ? Math.max(3, Math.min(14, Math.round(lado / 36))) : 1;
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var a0 = i / n, a1 = (i + 1) / n, b0 = j / n, b1 = (j + 1) / n, P00 = G.aplicar(H, a0, b0), P10 = G.aplicar(H, a1, b0), P11 = G.aplicar(H, a1, b1), P01 = G.aplicar(H, a0, b1);
      tri(ctx, img, src(a0, b0), src(a1, b0), src(a1, b1), P00, P10, P11); tri(ctx, img, src(a0, b0), src(a1, b1), src(a0, b1), P00, P11, P01);
    }
  };

  /* dibuja una capa completa con mezcla, opacidad y sombra */
  O.dibujar = function (ctx, ov, c) {
    if (!ov.visible) return false;
    var quad = O.cuadPx(ov, c); if (!quad) return false;
    var bmp = O.bitmap(ov); if (!bmp) return false;
    var mp = O.mallaPx(ov, c), sh = ov.sombra && ov.sombra.on, simple = ov.mez === 'source-over' && ov.op >= 0.999 && !sh;
    if (simple) { O.deformar(ctx, bmp, quad, mp, ov.espejo); return true; }
    var xs = quad.map(function (p) { return p[0]; }), ys = quad.map(function (p) { return p[1]; }), mg = 3, x0 = Math.floor(Math.min.apply(0, xs)) - mg, y0 = Math.floor(Math.min.apply(0, ys)) - mg, x1 = Math.ceil(Math.max.apply(0, xs)) + mg, y1 = Math.ceil(Math.max.apply(0, ys)) + mg;
    x0 = Math.max(-200, x0); y0 = Math.max(-200, y0); x1 = Math.min(c.W + 200, x1); y1 = Math.min(c.H + 200, y1); var w = x1 - x0, h = y1 - y0; if (w < 2 || h < 2) return false;
    if (!tmp) tmp = document.createElement('canvas'); if (tmp.width < w || tmp.height < h) { tmp.width = Math.max(tmp.width, w); tmp.height = Math.max(tmp.height, h); }
    var tx = tmp.getContext('2d'); tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height); tx.translate(-x0, -y0);
    O.deformar(tx, bmp, quad, mp && mp, ov.espejo); tx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.globalAlpha = ov.op; ctx.globalCompositeOperation = ov.mez || 'source-over';
    if (sh) { var s = ov.sombra, k = c.escala || 1; ctx.shadowColor = hexA(s.color, s.op); ctx.shadowBlur = s.blur * k; ctx.shadowOffsetX = s.dx * k; ctx.shadowOffsetY = s.dy * k; }
    ctx.drawImage(tmp, 0, 0, w, h, x0, y0, w, h); ctx.restore(); return true;
  };
  function hexA(h, a) { var m = /^#?([0-9a-f]{6})$/i.exec(h || '#000000') || [0, '000000'], n = parseInt(m[1], 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  O.dibujarTodas = function (ctx, lista, c) { lista.forEach(function (ov) { O.dibujar(ctx, ov, c); }); };
  O.rostroDe = function (cajas) { return cajas && cajas[0] || null; };

  /* iframes permitidos: solo https (o mismo origen), nunca javascript:/data: */
  O.urlPermitida = function (u, extra) {
    try { var x = new URL(u, root.location ? root.location.href : 'https://x.invalid/'); if (x.protocol !== 'https:' && !(root.location && x.origin === root.location.origin)) return false; if (root.location && x.origin === root.location.origin) return true; return (extra || []).some(function (h) { return x.hostname === h || x.hostname.endsWith('.' + h); }); } catch (e) { return false; }
  };
  if (typeof module === 'object' && module.exports) module.exports = O;
})(typeof self !== 'undefined' ? self : this);
