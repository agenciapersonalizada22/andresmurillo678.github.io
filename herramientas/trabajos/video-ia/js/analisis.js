/* Analitica clasica de video (sin modelos): diferencia de frames, mascaras, blobs, seguimiento, lineas virtuales, escenas,
   calidad, mapa de calor, color, estabilizacion, reencuadre y exportes (EDL/SRT/CSV). Puro: funciona en Worker, navegador y Node. window.VAnalisis */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.VAnalisis = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var A = {};
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  A.clamp = clamp;

  /* ---------- imagen ---------- */
  A.gris = function (d, w, h, out) { var n = w * h, o = out && out.length === n ? out : new Uint8Array(n); for (var i = 0, j = 0; i < n; i++, j += 4) o[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8; return o; };
  A.suavizar = function (s, w, h, out) {   // caja 3x3 (reduce el ruido del sensor antes de restar)
    var o = out && out.length === s.length ? out : new Uint8Array(s.length), x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var y0 = y > 0 ? -w : 0, y1 = y < h - 1 ? w : 0, x0 = x > 0 ? -1 : 0, x1 = x < w - 1 ? 1 : 0; i = y * w + x;
      o[i] = (s[i + y0 + x0] + s[i + y0] + s[i + y0 + x1] + s[i + x0] + s[i] + s[i + x1] + s[i + y1 + x0] + s[i + y1] + s[i + y1 + x1]) / 9 | 0;
    }
    return o;
  };
  A.dilatar = function (m, w, h, out) {
    var o = out && out.length === m.length ? out : new Uint8Array(m.length), x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; var v = m[i];
      if (!v && x > 0) v = m[i - 1]; if (!v && x < w - 1) v = m[i + 1]; if (!v && y > 0) v = m[i - w]; if (!v && y < h - 1) v = m[i + w];
      o[i] = v;
    }
    return o;
  };

  /* ---------- zonas / mascaras ---------- */
  A.enPoligono = function (x, y, p) {
    var d = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) d = !d;
    return d;
  };
  /* zonas: [{tipo:'incluir'|'excluir', puntos:[[x,y]..] (0..1)}]. Sin zonas -> null (todo el cuadro). Si hay 'incluir' solo cuentan esas. */
  A.construirMascara = function (zonas, w, h) {
    if (!zonas || !zonas.length) return null;
    var hayInc = zonas.some(function (z) { return z.tipo !== 'excluir'; }), m = new Uint8Array(w * h);
    if (!hayInc) m.fill(1);
    function pintar(z, v) { for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (A.enPoligono((x + 0.5) / w, (y + 0.5) / h, z.puntos)) m[y * w + x] = v; }
    zonas.filter(function (z) { return z.tipo !== 'excluir'; }).forEach(function (z) { pintar(z, 1); });
    zonas.filter(function (z) { return z.tipo === 'excluir'; }).forEach(function (z) { pintar(z, 0); });
    return m;
  };
  A.rectAPuntos = function (x0, y0, x1, y1) { var a = Math.min(x0, x1), b = Math.min(y0, y1), c = Math.max(x0, x1), d = Math.max(y0, y1); return [[a, b], [c, b], [c, d], [a, d]]; };

  /* ---------- movimiento ---------- */
  A.umbrales = function (sens) { sens = clamp(+sens || 0, 0, 100); return { pixel: Math.round(45 - 0.35 * sens), minPct: 0.0005 + 0.03 * Math.pow(1 - sens / 100, 2) }; };
  A.diferencia = function (a, b, w, h, umbralPx, mascara, salida) {
    var n = w * h, out = salida && salida.length === n ? salida : new Uint8Array(n), cnt = 0, area = 0;
    for (var i = 0; i < n; i++) {
      if (mascara && !mascara[i]) { out[i] = 0; continue; }
      area++; var d = a[i] - b[i]; if (d < 0) d = -d;
      if (d > umbralPx) { out[i] = 1; cnt++; } else out[i] = 0;
    }
    return { mascara: out, cuenta: cnt, area: area || 1, pct: cnt / (area || 1) };
  };
  A.blobs = function (m, w, h, minArea, maxN) {
    var vis = new Uint8Array(w * h), pila = new Int32Array(w * h), res = [], i0, y, x;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i0 = y * w + x; if (!m[i0] || vis[i0]) continue;
      var sp = 0, area = 0, sx = 0, sy = 0, x0 = x, x1 = x, y0 = y, y1 = y; pila[sp++] = i0; vis[i0] = 1;
      while (sp) {
        var i = pila[--sp], cx = i % w, cy = (i - cx) / w; area++; sx += cx; sy += cy;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        if (cx > 0 && m[i - 1] && !vis[i - 1]) { vis[i - 1] = 1; pila[sp++] = i - 1; }
        if (cx < w - 1 && m[i + 1] && !vis[i + 1]) { vis[i + 1] = 1; pila[sp++] = i + 1; }
        if (cy > 0 && m[i - w] && !vis[i - w]) { vis[i - w] = 1; pila[sp++] = i - w; }
        if (cy < h - 1 && m[i + w] && !vis[i + w]) { vis[i + w] = 1; pila[sp++] = i + w; }
      }
      if (area >= minArea) res.push({ area: area, cx: sx / area, cy: sy / area, x0: x0, y0: y0, x1: x1 + 1, y1: y1 + 1 });
    }
    res.sort(function (a, b) { return b.area - a.area; });
    return res.slice(0, maxN || 20);
  };
  A.normalizarBlobs = function (bl, w, h) { return bl.map(function (b) { return { area: b.area / (w * h), cx: b.cx / w, cy: b.cy / h, x0: b.x0 / w, y0: b.y0 / h, x1: b.x1 / w, y1: b.y1 / h }; }); };

  /* ---------- seguimiento de blobs con identificadores ---------- */
  function Seguidor(o) { o = o || {}; this.maxDist = o.maxDist || 0.15; this.maxPerdido = o.maxPerdido == null ? 8 : o.maxPerdido; this.minEdad = o.minEdad || 3; this.sig = 1; this.pistas = []; }
  Seguidor.prototype.reiniciar = function () { this.pistas = []; this.sig = 1; };
  Seguidor.prototype.actualizar = function (dets, t) {
    var self = this, pares = [], pu = {}, du = {}, nuevas = [], terminadas = [];
    this.pistas.forEach(function (p, i) { dets.forEach(function (d, j) { var dist = Math.hypot(d.cx - (p.cx + p.vx), d.cy - (p.cy + p.vy)); if (dist <= self.maxDist) pares.push([dist, i, j]); }); });
    pares.sort(function (a, b) { return a[0] - b[0]; });
    pares.forEach(function (q) {
      if (pu[q[1]] || du[q[2]]) return; pu[q[1]] = du[q[2]] = 1;
      var p = self.pistas[q[1]], d = dets[q[2]];
      p.px = p.cx; p.py = p.cy; p.vx = 0.6 * p.vx + 0.4 * (d.cx - p.cx); p.vy = 0.6 * p.vy + 0.4 * (d.cy - p.cy);
      p.cx = d.cx; p.cy = d.cy; p.x0 = d.x0; p.y0 = d.y0; p.x1 = d.x1; p.y1 = d.y1; p.area = d.area; p.perdido = 0; p.edad++; p.t = t;
      p.trayecto.push([p.cx, p.cy]); if (p.trayecto.length > 40) p.trayecto.shift();
      if (!p.confirmada && p.edad >= self.minEdad) { p.confirmada = true; nuevas.push(p); }
    });
    var vivas = [];
    this.pistas.forEach(function (p, i) { if (pu[i]) { vivas.push(p); return; } p.perdido++; p.px = p.cx; p.py = p.cy; if (p.perdido > self.maxPerdido) { if (p.confirmada) terminadas.push(p); } else vivas.push(p); });
    dets.forEach(function (d, j) {
      if (du[j]) return;
      var p = { id: self.sig++, cx: d.cx, cy: d.cy, px: d.cx, py: d.cy, x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1, area: d.area, vx: 0, vy: 0, edad: 1, perdido: 0, confirmada: false, creada: t, t: t, trayecto: [[d.cx, d.cy]] };
      if (self.minEdad <= 1) { p.confirmada = true; nuevas.push(p); } vivas.push(p);
    });
    this.pistas = vivas;
    return { activas: vivas.filter(function (p) { return p.confirmada && p.perdido === 0; }), nuevas: nuevas, terminadas: terminadas };
  };
  A.Seguidor = Seguidor;

  /* ---------- lineas virtuales ---------- */
  /* positivo del lado hacia donde apunta la normal (dy,-dx); A->B = de negativo a positivo */
  function lado(l, x, y) { return (l.y2 - l.y1) * (x - l.x1) - (l.x2 - l.x1) * (y - l.y1); }
  /* +1 si el segmento a->b cruza la linea de su lado negativo al positivo, -1 al reves, 0 si no cruza */
  A.cruce = function (ax, ay, bx, by, l) {
    var d1 = lado(l, ax, ay), d2 = lado(l, bx, by);
    if ((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0) || (d1 === 0 && d2 === 0)) return 0;
    var cr = function (px, py) { return (bx - ax) * (py - ay) - (by - ay) * (px - ax); }, e1 = cr(l.x1, l.y1), e2 = cr(l.x2, l.y2);
    if ((e1 > 0 && e2 > 0) || (e1 < 0 && e2 < 0)) return 0;
    return d1 < 0 || (d1 === 0 && d2 > 0) ? 1 : -1;
  };
  function ContadorLineas(lineas) { this.lineas = lineas || []; this.tot = {}; this.ult = {}; this.n = 0; }
  ContadorLineas.prototype.poner = function (lineas) { this.lineas = lineas || []; };
  ContadorLineas.prototype.totales = function () { return this.tot; };
  ContadorLineas.prototype.reiniciar = function () { this.tot = {}; this.ult = {}; };
  ContadorLineas.prototype.actualizar = function (pistas) {
    var ev = [], self = this; this.n++;
    this.lineas.forEach(function (l) {
      var t = self.tot[l.id] || (self.tot[l.id] = { ab: 0, ba: 0 });
      pistas.forEach(function (p) {
        if (!p.confirmada || p.perdido) return; if (Math.hypot(p.cx - p.px, p.cy - p.py) < 1e-6) return;
        var c = A.cruce(p.px, p.py, p.cx, p.cy, l); if (!c) return;
        var k = p.id + '|' + l.id; if (self.ult[k] && self.n - self.ult[k] < 6) return; self.ult[k] = self.n;
        if (c > 0) t.ab++; else t.ba++; ev.push({ linea: l.id, nombre: l.nombre, dir: c > 0 ? 'ab' : 'ba', pista: p.id });
      });
    });
    return ev;
  };
  A.ContadorLineas = ContadorLineas;

  /* ---------- escenas ---------- */
  A.histColor = function (d, w, h) {
    var H = new Float32Array(48), n = w * h, i, j;
    for (i = 0, j = 0; i < n; i++, j += 4) { H[d[j] >> 4]++; H[16 + (d[j + 1] >> 4)]++; H[32 + (d[j + 2] >> 4)]++; }
    for (i = 0; i < 48; i++) H[i] /= n; return H;
  };
  A.distHist = function (a, b) { var s = 0; for (var i = 0; i < 48; i++) s += Math.abs(a[i] - b[i]); return s / 6; };
  function DetectorEscena(o) { o = o || {}; this.umbral = o.umbral || 0.3; this.factor = o.factor || 3; this.sep = o.sep == null ? 0.5 : o.sep; this.prev = null; this.hist = []; this.ult = -1e9; }
  DetectorEscena.prototype.reiniciar = function () { this.prev = null; this.hist = []; this.ult = -1e9; };
  DetectorEscena.prototype.procesar = function (h, t) {
    if (!this.prev) { this.prev = h; return { d: 0, corte: false }; }
    var d = A.distHist(this.prev, h), m = this.hist.length ? this.hist.reduce(function (a, b) { return a + b; }, 0) / this.hist.length : 0;
    var corte = d > this.umbral && d > this.factor * m + 0.02 && t - this.ult >= this.sep;
    if (corte) this.ult = t; this.hist.push(d); if (this.hist.length > 12) this.hist.shift(); this.prev = h;
    return { d: d, corte: corte };
  };
  A.DetectorEscena = DetectorEscena;

  /* ---------- calidad: brillo, nitidez (varianza del laplaciano), ruido (Immerkaer), exposicion ---------- */
  A.calidad = function (s, w, h) {
    var n = w * h, i, suma = 0, suma2 = 0, osc = 0, bri = 0;
    for (i = 0; i < n; i++) { var v = s[i]; suma += v; suma2 += v * v; if (v < 16) osc++; else if (v > 240) bri++; }
    var media = suma / n, sd = Math.sqrt(Math.max(0, suma2 / n - media * media)), ls = 0, ls2 = 0, rs = 0, x, y, c, k = 0;
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x; c = s[i];
      var lap = 4 * c - s[i - 1] - s[i + 1] - s[i - w] - s[i + w]; ls += lap; ls2 += lap * lap;
      var nv = s[i - w - 1] - 2 * s[i - w] + s[i - w + 1] - 2 * s[i - 1] + 4 * c - 2 * s[i + 1] + s[i + w - 1] - 2 * s[i + w] + s[i + w + 1]; rs += nv < 0 ? -nv : nv; k++;
    }
    k = k || 1;
    return { brillo: media, contraste: sd, nitidez: ls2 / k - (ls / k) * (ls / k), ruido: rs * Math.sqrt(Math.PI / 2) / (6 * k), oscuro: osc / n, quemado: bri / n };
  };
  A.estadoCalidad = function (q, u) {
    u = u || {};
    return { oscuro: q.brillo < (u.brilloMin || 45) || q.oscuro > 0.6, sobreexpuesto: q.brillo > (u.brilloMax || 215) || q.quemado > 0.35, desenfocado: q.nitidez < (u.nitidez == null ? 12 : u.nitidez) };
  };

  /* ---------- mapa de calor ---------- */
  function Calor(w, h) { this.w = w; this.h = h; this.a = new Float32Array(w * h); this.n = 0; }
  Calor.prototype.acumular = function (m) { var a = this.a; for (var i = 0; i < a.length; i++) if (m[i]) a[i]++; this.n++; };
  Calor.prototype.reiniciar = function () { this.a.fill(0); this.n = 0; };
  Calor.prototype.normalizado = function () { var a = this.a, m = 0, i; for (i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; var o = new Uint8Array(a.length); if (m) for (i = 0; i < a.length; i++) o[i] = Math.round(255 * a[i] / m); return o; };
  A.rampaCalor = function (v) { // 0..255 -> [r,g,b,a]
    var t = v / 255; if (t < 0.02) return [0, 0, 0, 0];
    var r, gg, b; if (t < 0.25) { r = 0; gg = t * 4 * 150; b = 255; } else if (t < 0.5) { r = 0; gg = 150 + (t - 0.25) * 4 * 105; b = 255 - (t - 0.25) * 4 * 255; } else if (t < 0.75) { r = (t - 0.5) * 4 * 255; gg = 255; b = 0; } else { r = 255; gg = 255 - (t - 0.75) * 4 * 255; b = 0; }
    return [r | 0, gg | 0, b | 0, Math.min(210, 60 + t * 200) | 0];
  };
  Calor.prototype.aRGBA = function () { var n = this.normalizado(), o = new Uint8ClampedArray(n.length * 4); for (var i = 0; i < n.length; i++) { var c = A.rampaCalor(n[i]); o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = c[3]; } return o; };
  Calor.prototype.celdas = function (nx, ny) {
    var o = new Float32Array(nx * ny), cw = this.w / nx, ch = this.h / ny, x, y;
    for (y = 0; y < this.h; y++) for (x = 0; x < this.w; x++) o[Math.min(ny - 1, y / ch | 0) * nx + Math.min(nx - 1, x / cw | 0)] += this.a[y * this.w + x];
    return o;
  };
  A.Calor = Calor;

  /* ---------- color ---------- */
  A.rgbAHsl = function (r, g, b) {
    r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, s, l];
  };
  A.nombreColor = function (r, g, b) {
    var c = A.rgbAHsl(r, g, b), h = c[0], s = c[1], l = c[2];
    if (l < 0.12) return 'negro'; if (l > 0.9) return 'blanco'; if (s < 0.15) return l < 0.35 ? 'gris oscuro' : l > 0.7 ? 'gris claro' : 'gris';
    if (h < 15 || h >= 345) return l > 0.7 ? 'rosa' : 'rojo'; if (h < 45) return l < 0.4 ? 'marrón' : 'naranja'; if (h < 70) return 'amarillo';
    if (h < 165) return 'verde'; if (h < 200) return 'cian'; if (h < 255) return 'azul'; if (h < 290) return 'morado'; return l > 0.65 ? 'rosa' : 'magenta';
  };
  A.hex = function (r, g, b) { return '#' + [r, g, b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); };
  A.colorDominante = function (d, w, h, paso) {
    paso = paso || 2; var cnt = new Uint32Array(4096), sr = new Float64Array(4096), sg = new Float64Array(4096), sb = new Float64Array(4096), tot = 0, x, y;
    for (y = 0; y < h; y += paso) for (x = 0; x < w; x += paso) { var j = (y * w + x) * 4, k = (d[j] >> 4) << 8 | (d[j + 1] >> 4) << 4 | (d[j + 2] >> 4); cnt[k]++; sr[k] += d[j]; sg[k] += d[j + 1]; sb[k] += d[j + 2]; tot++; }
    var idx = []; for (var i = 0; i < 4096; i++) if (cnt[i]) idx.push(i); idx.sort(function (a, b) { return cnt[b] - cnt[a]; });
    var pal = [], usados = [];
    idx.forEach(function (k) {
      if (pal.length >= 4) return; var r = sr[k] / cnt[k], gg = sg[k] / cnt[k], b = sb[k] / cnt[k];
      if (usados.some(function (u) { return Math.abs(u[0] - r) + Math.abs(u[1] - gg) + Math.abs(u[2] - b) < 90; })) return; usados.push([r, gg, b]);
      pal.push({ rgb: [Math.round(r), Math.round(gg), Math.round(b)], hex: A.hex(r, gg, b), nombre: A.nombreColor(r, gg, b), pct: cnt[k] / tot });
    });
    return pal.length ? { rgb: pal[0].rgb, hex: pal[0].hex, nombre: pal[0].nombre, pct: pal[0].pct, paleta: pal } : null;
  };
  A.hexARgb = function (s) { var m = /^#?([0-9a-f]{6})$/i.exec(s || ''); if (!m) return null; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  /* mascara de pixeles cercanos al color objetivo (tolerancia 0..100) */
  A.mascaraColor = function (d, w, h, obj, tol, out, mascara) {
    var n = w * h, o = out && out.length === n ? out : new Uint8Array(n), t = A.rgbAHsl(obj[0], obj[1], obj[2]), cromatico = t[1] >= 0.2 && t[2] > 0.1 && t[2] < 0.92, th = 8 + tol * 0.3, ts = Math.max(0.2, t[1] * 0.5), dist = 20 + tol * 2.2, cnt = 0;
    for (var i = 0, j = 0; i < n; i++, j += 4) {
      if (mascara && !mascara[i]) { o[i] = 0; continue; }
      var r = d[j], gg = d[j + 1], b = d[j + 2], ok = false;
      if (cromatico) { var c = A.rgbAHsl(r, gg, b), dh = Math.abs(c[0] - t[0]); if (dh > 180) dh = 360 - dh; ok = dh <= th && c[1] >= ts && c[2] > 0.12; }
      else ok = Math.sqrt((r - obj[0]) * (r - obj[0]) + (gg - obj[1]) * (gg - obj[1]) + (b - obj[2]) * (b - obj[2])) <= dist;
      o[i] = ok ? 1 : 0; if (ok) cnt++;
    }
    return { mascara: o, cuenta: cnt, pct: cnt / n };
  };

  /* ---------- estabilizacion y reencuadre ---------- */
  /* Desplazamiento (dx,dy) tal que b(x+dx,y+dy) ~ a(x,y): minimiza la suma de diferencias absolutas en la zona central */
  A.estimarDesplazamiento = function (a, b, w, h, r) {
    r = r || 6; var m = r + 2, mejor = 1e18, bx = 0, by = 0, dx, dy, x, y;
    for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
      var s = 0;
      for (y = m; y < h - m; y += 2) { var fa = y * w, fb = (y + dy) * w + dx; for (x = m; x < w - m; x += 2) { var d = a[fa + x] - b[fb + x]; s += d < 0 ? -d : d; } }
      s += (Math.abs(dx) + Math.abs(dy)) * 0.5;   // desempate hacia el no-movimiento
      if (s < mejor) { mejor = s; bx = dx; by = dy; }
    }
    return { dx: bx, dy: by, costo: mejor };
  };
  function Estabilizador(o) { o = o || {}; this.alfa = o.alfa == null ? 0.92 : o.alfa; this.max = o.max == null ? 0.06 : o.max; this.rx = 0; this.ry = 0; this.sx = 0; this.sy = 0; }
  Estabilizador.prototype.reiniciar = function () { this.rx = this.ry = this.sx = this.sy = 0; };
  /* d: desplazamiento entre frames (px de analisis); devuelve la correccion normalizada a w,h {x,y} a aplicar al dibujar */
  Estabilizador.prototype.paso = function (d, w, h) {
    this.rx += d.dx; this.ry += d.dy; this.sx = this.alfa * this.sx + (1 - this.alfa) * this.rx; this.sy = this.alfa * this.sy + (1 - this.alfa) * this.ry;
    var cx = clamp((this.sx - this.rx) / w, -this.max, this.max), cy = clamp((this.sy - this.ry) / h, -this.max, this.max);
    return { x: cx, y: cy };
  };
  A.Estabilizador = Estabilizador;

  function Reencuadre(o) { o = o || {}; this.aspecto = o.aspecto || 9 / 16; this.alfa = o.alfa || 0.1; this.zona = o.zona == null ? 0.04 : o.zona; this.vmax = o.vmax || 0.02; this.cx = 0.5; }
  Reencuadre.prototype.reiniciar = function () { this.cx = 0.5; };
  Reencuadre.prototype.rect = function (sw, sh) {
    var ch = sh, cw = sh * this.aspecto; if (cw > sw) { cw = sw; ch = sw / this.aspecto; }
    var x = clamp(this.cx * sw - cw / 2, 0, sw - cw); return { x: x, y: (sh - ch) / 2, w: cw, h: ch };
  };
  /* objetivo: x normalizado del interes (o null para mantener). sw,sh: tamano de la fuente. Devuelve el rectangulo de recorte. */
  Reencuadre.prototype.paso = function (objetivo, sw, sh) {
    var r0 = this.rect(sw, sh), mitad = r0.w / sw / 2;
    if (objetivo != null) { var d = objetivo - this.cx; if (Math.abs(d) > this.zona) this.cx += clamp(d * this.alfa, -this.vmax, this.vmax); }
    this.cx = clamp(this.cx, mitad, 1 - mitad); return this.rect(sw, sh);
  };
  A.Reencuadre = Reencuadre;
  A.centroMovimiento = function (m, w, h) { var sx = 0, sy = 0, n = 0; for (var i = 0; i < m.length; i++) if (m[i]) { sx += i % w; sy += (i / w) | 0; n++; } return n ? { x: sx / n / w, y: sy / n / h, n: n } : null; };

  /* ---------- series, segmentos y cortes ---------- */
  A.picos = function (t, v, o) {
    o = o || {}; var n = o.n || 5, sep = o.sep == null ? 2 : o.sep, min = o.min == null ? 0 : o.min, c = [], i;
    for (i = 0; i < v.length; i++) if (v[i] >= min && (i === 0 || v[i] >= v[i - 1]) && (i === v.length - 1 || v[i] > v[i + 1])) c.push({ t: t[i], v: v[i] });
    c.sort(function (a, b) { return b.v - a.v; }); var sel = [];
    c.forEach(function (p) { if (sel.length < n && sel.every(function (q) { return Math.abs(q.t - p.t) >= sep; })) sel.push(p); });
    return sel.sort(function (a, b) { return a.t - b.t; });
  };
  /* intervalos donde v >= umbral (t creciente). Une huecos < fusion, descarta < minDur, ensancha pad y recorta a [0,fin]. */
  A.segmentos = function (t, v, umbral, o) {
    o = o || {}; var fusion = o.fusion || 0, minDur = o.minDur || 0, pad = o.pad || 0, fin = o.fin == null ? t[t.length - 1] : o.fin, seg = [], ini = null, i, dt = t.length > 1 ? t[1] - t[0] : 0;
    for (i = 0; i < t.length; i++) { if (v[i] >= umbral) { if (ini == null) ini = t[i]; } else if (ini != null) { seg.push([ini, t[i]]); ini = null; } }
    if (ini != null) seg.push([ini, Math.min(fin, t[t.length - 1] + dt)]);
    var m = []; seg.forEach(function (s) { var u = m[m.length - 1]; if (u && s[0] - u[1] <= fusion) u[1] = s[1]; else m.push(s.slice()); });
    return m.filter(function (s) { return s[1] - s[0] >= minDur; }).map(function (s) { return [Math.max(0, s[0] - pad), Math.min(fin, s[1] + pad)]; });
  };
  /* rms: amplitud 0..1 por ventana de dt s. Devuelve intervalos de silencio (umbral en dB) de al menos minDur s. */
  A.silencios = function (rms, dt, umbralDb, minDur) {
    var u = Math.pow(10, (umbralDb == null ? -45 : umbralDb) / 20), t = [], v = [], i; for (i = 0; i < rms.length; i++) { t.push(i * dt); v.push(rms[i] < u ? 1 : 0); }
    return A.segmentos(t, v, 1, { minDur: minDur || 1, fin: rms.length * dt });
  };
  function complemento(huecos, dur, minDur) { var r = [], p = 0; huecos.forEach(function (h) { if (h[0] - p >= minDur) r.push([p, h[0]]); p = h[1]; }); if (dur - p >= minDur) r.push([p, dur]); return r; }
  function norm(a) { var s = a.slice().sort(function (x, y) { return x - y; }), hi = s[Math.floor(s.length * 0.95)] || 1; return a.map(function (x) { return hi > 0 ? Math.min(1, x / hi) : 0; }); }
  /* muestras: [{t, mov, nit, brillo, audio, corte}] ; devuelve [{ini,fin,puntaje}] */
  A.mejoresMomentos = function (m, dur, o) {
    o = o || {}; var largo = o.largo || 4, total = o.total || 20, paso = m.length > 1 ? (m[m.length - 1].t - m[0].t) / (m.length - 1) : 1, w = Math.max(1, Math.round(largo / paso));
    var mov = norm(m.map(function (x) { return x.mov || 0; })), nit = norm(m.map(function (x) { return x.nit || 0; })), aud = norm(m.map(function (x) { return x.audio || 0; }));
    var sc = m.map(function (x, i) { var ok = x.brillo == null || (x.brillo > 45 && x.brillo < 215) ? 1 : 0; return 0.45 * mov[i] + 0.2 * nit[i] + 0.2 * aud[i] + 0.15 * ok; });
    var vent = []; for (var i = 0; i + w <= m.length; i++) { var s = 0; for (var k = 0; k < w; k++) s += sc[i + k]; vent.push({ i: i, p: s / w, ini: m[i].t, fin: Math.min(dur, m[i].t + largo) }); }
    vent.sort(function (a, b) { return b.p - a.p; }); var sel = [], max = Math.max(1, Math.floor(total / largo));
    vent.forEach(function (v) { if (sel.length < max && sel.every(function (q) { return v.ini >= q.fin || v.fin <= q.ini; })) sel.push(v); });
    return sel.sort(function (a, b) { return a.ini - b.ini; }).map(function (v) { return { ini: v.ini, fin: v.fin, puntaje: Math.round(v.p * 100) / 100, motivo: 'mejor momento' }; });
  };
  /* modo: movimiento | silencio | escena | mejores */
  A.autoCortes = function (m, dur, o) {
    o = o || {}; var t = m.map(function (x) { return x.t; }), modo = o.modo || 'movimiento', r;
    if (modo === 'movimiento') r = A.segmentos(t, m.map(function (x) { return x.mov || 0; }), o.umbral == null ? 0.01 : o.umbral, { fusion: o.fusion == null ? 1.5 : o.fusion, minDur: o.minDur == null ? 1 : o.minDur, pad: o.pad == null ? 0.5 : o.pad, fin: dur }).map(function (s) { return { ini: s[0], fin: s[1], motivo: 'movimiento' }; });
    else if (modo === 'silencio') r = complemento(o.silencios || [], dur, o.minDur == null ? 1 : o.minDur).map(function (s) { return { ini: s[0], fin: s[1], motivo: 'con sonido' }; });
    else if (modo === 'escena') { var pts = [0].concat(m.filter(function (x) { return x.corte; }).map(function (x) { return x.t; }), [dur]); r = []; for (var i = 0; i + 1 < pts.length; i++) if (pts[i + 1] - pts[i] >= (o.minDur || 0.5)) r.push({ ini: pts[i], fin: pts[i + 1], motivo: 'plano ' + (r.length + 1) }); }
    else r = A.mejoresMomentos(m, dur, o);
    return r.map(function (s) { s.ini = Math.round(s.ini * 1000) / 1000; s.fin = Math.round(s.fin * 1000) / 1000; return s; });
  };

  /* ---------- exportes ---------- */
  function p2(n, d) { n = String(n); while (n.length < (d || 2)) n = '0' + n; return n; }
  A.tc = function (s, fps) { fps = fps || 25; var tot = Math.round(s * fps), f = tot % Math.round(fps), seg = Math.floor(tot / Math.round(fps)); return p2(Math.floor(seg / 3600)) + ':' + p2(Math.floor(seg / 60) % 60) + ':' + p2(seg % 60) + ':' + p2(f); };
  A.tSrt = function (s) { var ms = Math.round(s * 1000); return p2(Math.floor(ms / 3600000)) + ':' + p2(Math.floor(ms / 60000) % 60) + ':' + p2(Math.floor(ms / 1000) % 60) + ',' + p2(ms % 1000, 3); };
  A.edl = function (cortes, o) {
    o = o || {}; var fps = o.fps || 25, rec = 0, l = ['TITLE: ' + (o.titulo || 'Video IA'), 'FCM: NON-DROP FRAME', ''];
    cortes.forEach(function (c, i) {
      var d = c.fin - c.ini; l.push(p2(i + 1, 3) + '  ' + (o.carrete || 'AX').padEnd(8) + ' V     C        ' + A.tc(c.ini, fps) + ' ' + A.tc(c.fin, fps) + ' ' + A.tc(rec, fps) + ' ' + A.tc(rec + d, fps));
      l.push('* FROM CLIP NAME: ' + (o.clip || 'video')); if (c.motivo) l.push('* COMMENT: ' + c.motivo); l.push(''); rec += d;
    });
    return l.join('\n');
  };
  A.srt = function (items) { return items.map(function (it, i) { return (i + 1) + '\n' + A.tSrt(it.ini) + ' --> ' + A.tSrt(it.fin) + '\n' + it.texto + '\n'; }).join('\n'); };
  A.csv = function (cortes) { var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }; return 'n,inicio_s,fin_s,duracion_s,motivo,puntaje\n' + cortes.map(function (c, i) { return [i + 1, c.ini.toFixed(3), c.fin.toFixed(3), (c.fin - c.ini).toFixed(3), q(c.motivo), c.puntaje == null ? '' : c.puntaje].join(','); }).join('\n') + '\n'; };
  A.csvEventos = function (ev) { var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }; return 'tiempo_s,tipo,valor,detalle\n' + ev.map(function (e) { return [e.t.toFixed(2), q(e.tipo), e.valor == null ? '' : Math.round(e.valor * 1000) / 1000, q(e.texto || e.detalle || '')].join(','); }).join('\n') + '\n'; };
  A.fmtT = function (s) { s = Math.max(0, s); var m = Math.floor(s / 60), x = Math.floor(s % 60); return p2(m) + ':' + p2(x); };
  return A;
});
