/* Tuberia de analisis por frame: junta movimiento, blobs, seguimiento, lineas, escenas, calidad, calor y color.
   Se ejecuta en un Worker (js/trabajador.js) o, si no hay Worker, en el hilo principal. window.VTuberia */
(function (g, f) { var A = typeof module === 'object' && module.exports ? require('./analisis.js') : g.VAnalisis; var m = f(A); if (typeof module === 'object' && module.exports) module.exports = m; else g.VTuberia = m; })(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';
  var DEF = { sensibilidad: 55, minArea: 0.002, zonas: [], lineas: [], movimiento: true, seguimiento: true, calor: true, escena: true, umbralEscena: 0.3, calidad: true, umbralNitidez: 12, color: true, objetoColor: null, estabilizar: false, finMov: 1.5 };
  function Tuberia(cfg) { this.cfg = Object.assign({}, DEF); this.w = 0; this.h = 0; this.n = 0; this.configurar(cfg || {}); }
  Tuberia.prototype.configurar = function (c) {
    Object.assign(this.cfg, c); this.mascara = null; this.mascaraDe = '';
    if (!this.seg) { this.seg = new A.Seguidor({ maxDist: 0.18, maxPerdido: 6, minEdad: 3 }); this.cont = new A.ContadorLineas([]); this.esc = new A.DetectorEscena({ umbral: this.cfg.umbralEscena }); this.est = new A.Estabilizador(); this.estado = { mov: false, ultMov: -1e9, q: {}, obj: false, nuevoColor: 0 }; }
    this.cont.poner(this.cfg.lineas); this.esc.umbral = this.cfg.umbralEscena; return this;
  };
  Tuberia.prototype.reiniciar = function () {
    this.prev = null; this.bgListo = false; this.n = 0; this.seg.reiniciar(); this.cont.reiniciar(); this.esc.reiniciar(); this.est.reiniciar(); if (this.calor) this.calor.reiniciar();
    this.estado = { mov: false, ultMov: -1e9, q: {}, obj: false, nuevoColor: 0 };
  };
  Tuberia.prototype.preparar = function (w, h) {
    var clave = w + 'x' + h + JSON.stringify(this.cfg.zonas);
    if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.g1 = new Uint8Array(w * h); this.g2 = new Uint8Array(w * h); this.tmp = new Uint8Array(w * h); this.mov = new Uint8Array(w * h); this.mov2 = new Uint8Array(w * h); this.cm = new Uint8Array(w * h); this.fg = new Uint8Array(w * h); this.bg = new Float32Array(w * h); this.bgListo = false; this.calor = new A.Calor(w, h); this.prev = null; this.mascaraDe = ''; }
    if (clave !== this.mascaraDe) { this.mascara = A.construirMascara(this.cfg.zonas, w, h); this.mascaraDe = clave; }
  };
  /* d: Uint8ClampedArray RGBA de w*h. t: segundos. Devuelve el resultado del frame (todo normalizado 0..1 salvo indicacion). */
  Tuberia.prototype.procesar = function (d, w, h, t) {
    var c = this.cfg, ev = [], r = { t: t, w: w, h: h, eventos: ev, mov: null, pistas: [], ocupacion: 0, cruces: this.cont.totales(), escena: null, calidad: null, color: null, objetoColor: null, centro: null, desp: null }, E = this.estado;
    this.preparar(w, h); this.n++;
    var gr = A.gris(d, w, h, this.tmp), sm = A.suavizar(gr, w, h, this.g2);
    if (this.prev) {
      var u = A.umbrales(c.sensibilidad), df = A.diferencia(this.prev, sm, w, h, u.pixel, this.mascara, this.mov);
      var activo = df.pct >= u.minPct; r.mov = { pct: df.pct, activo: activo, cuenta: df.cuenta };
      if (activo) { E.ultMov = t; if (!E.mov) { E.mov = true; ev.push({ t: t, tipo: 'movimiento', valor: df.pct }); } } else if (E.mov && t - E.ultMov > c.finMov) { E.mov = false; ev.push({ t: t, tipo: 'sin_movimiento', valor: 0 }); }
      r.mov.estado = E.mov;
      var fg = this.fondo(sm, u.pixel, t);
      if (c.calor && fg.cuenta) this.calor.acumular(fg.mascara);
      if (c.seguimiento) {
        var dil = A.dilatar(fg.mascara, w, h, this.mov2), bl = A.normalizarBlobs(A.blobs(dil, w, h, Math.max(4, Math.round(c.minArea * w * h)), 12), w, h), s = this.seg.actualizar(bl, t);
        r.pistas = s.activas.map(function (p) { return { id: p.id, cx: p.cx, cy: p.cy, x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, vx: p.vx, vy: p.vy, tr: p.trayecto.slice(-20) }; }); r.ocupacion = r.pistas.length;
        s.nuevas.forEach(function (p) { ev.push({ t: t, tipo: 'objeto_nuevo', valor: p.id, texto: 'objeto #' + p.id, x: p.cx, y: p.cy }); });
        this.cont.actualizar(this.seg.pistas).forEach(function (x) { ev.push({ t: t, tipo: 'cruce_linea', valor: x.dir === 'ab' ? 1 : -1, texto: (x.nombre || x.linea) + ' ' + (x.dir === 'ab' ? 'A→B' : 'B→A'), linea: x.linea, dir: x.dir, pista: x.pista }); });
        r.cruces = this.cont.totales();
      }
      var cm = A.centroMovimiento(fg.mascara, w, h); r.centro = cm && cm.n > 3 ? { x: cm.x, y: cm.y } : null;
      if (c.estabilizar) r.desp = A.estimarDesplazamiento(this.prev, sm, w, h, 6);
    }
    if (!this.prev) this.prev = new Uint8Array(w * h); this.prev.set(sm);
    if (!this.bgListo) { for (var i = 0; i < sm.length; i++) this.bg[i] = sm[i]; this.bgListo = true; }
    if (c.escena) { var e = this.esc.procesar(A.histColor(d, w, h), t); r.escena = e; if (e.corte) ev.push({ t: t, tipo: 'escena', valor: e.d, texto: 'cambio de escena' }); }
    if (c.calidad && (this.n - 1) % (c.calidadCada || 4) === 0) {
      var q = A.calidad(gr, w, h), st = A.estadoCalidad(q, { nitidez: c.umbralNitidez }); r.calidad = q; r.calidad.estado = st;
      ['oscuro', 'sobreexpuesto', 'desenfocado'].forEach(function (k) { if (st[k] && !E.q[k]) ev.push({ t: t, tipo: k === 'desenfocado' ? 'desenfoque' : k, valor: k === 'oscuro' ? q.brillo : k === 'sobreexpuesto' ? q.quemado : q.nitidez, texto: k }); E.q[k] = st[k]; });
    }
    if (c.color && this.n % 6 === 1) r.color = A.colorDominante(d, w, h, 3);
    if (c.objetoColor && c.objetoColor.rgb) {
      var oc = A.mascaraColor(d, w, h, c.objetoColor.rgb, c.objetoColor.tol == null ? 40 : c.objetoColor.tol, this.cm, this.mascara), minP = c.objetoColor.minPct || 0.004;
      var bo = A.normalizarBlobs(A.blobs(oc.mascara, w, h, Math.max(6, Math.round(minP * w * h)), 3), w, h); r.objetoColor = { pct: oc.pct, blobs: bo };
      var pres = bo.length > 0; if (pres && !E.obj) ev.push({ t: t, tipo: 'objeto_color', valor: oc.pct, texto: 'objeto de color detectado', x: bo[0].cx, y: bo[0].cy }); if (!pres && E.obj && oc.pct < minP / 2) E.obj = false; else if (pres) E.obj = true;
    }
    return r;
  };
  /* Primer plano contra un fondo que se aprende despacio: da objetos enteros (la resta entre frames solo da bordes). */
  Tuberia.prototype.fondo = function (sm, umbral, t) {
    var n = sm.length, bg = this.bg, out = this.fg, m = this.mascara, cnt = 0, i, d;
    for (i = 0; i < n; i++) { d = sm[i] - bg[i]; var fgp = (d < 0 ? -d : d) > umbral && (!m || m[i]); out[i] = fgp ? 1 : 0; if (fgp) cnt++; bg[i] += (fgp ? 0.004 : 0.05) * d; }
    if (cnt > 0.6 * n) { for (i = 0; i < n; i++) bg[i] = sm[i]; out.fill(0); cnt = 0; this.seg.reiniciar(); }   // cambio global (luz, escena): se reaprende el fondo
    return { mascara: out, cuenta: cnt };
  };
  Tuberia.prototype.mapaCalor = function () { return this.calor ? { w: this.w, h: this.h, datos: this.calor.normalizado(), n: this.calor.n } : null; };
  Tuberia.prototype.celdasCalor = function (nx, ny) { return this.calor ? Array.prototype.slice.call(this.calor.celdas(nx, ny)) : []; };
  return { Tuberia: Tuberia, DEF: DEF };
});
