/* Reglas evento -> accion y buffer circular de pre-roll. Puro (sin DOM): window.VReglas */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.VReglas = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var R = {};
  R.EVENTOS = [
    ['movimiento', 'Movimiento detectado'], ['sin_movimiento', 'Fin del movimiento'], ['objeto_nuevo', 'Objeto nuevo en escena'], ['cruce_linea', 'Cruce de línea virtual'],
    ['escena', 'Cambio de escena / corte'], ['desenfoque', 'Imagen desenfocada'], ['oscuro', 'Imagen muy oscura'], ['sobreexpuesto', 'Imagen sobreexpuesta'],
    ['objeto_color', 'Objeto del color elegido'], ['qr', 'Código QR leído'], ['codigo', 'Código de barras (nativo)'], ['rostro', 'Rostro (detector nativo)'], ['texto', 'Texto (detector nativo)'],
    ['ia_evento', 'Evento descrito a la IA'], ['habla', 'Voz reconocida (si el navegador la ofrece)']
  ];
  R.ACCIONES = [
    ['clip', 'Grabar clip con pre-roll'], ['captura', 'Guardar captura'], ['notificacion', 'Notificación'], ['sonido', 'Sonido'], ['mensaje', 'Mensaje a dispositivo / puente'],
    ['automatizacion', 'Disparar flujo de Automatizaciones'], ['descargar', 'Descargar captura']
  ];
  R.CANAL = 'trabajos_video_evento';
  R.nombreEvento = function (id) { var e = R.EVENTOS.filter(function (x) { return x[0] === id; })[0]; return e ? e[1] : id; };
  R.nuevaRegla = function (o) { return Object.assign({ id: '', nombre: '', activo: true, evento: 'movimiento', filtro: {}, acciones: [{ tipo: 'captura' }], enfriamiento: 10 }, o || {}); };

  function acciones(r) { return r.acciones && r.acciones.length ? r.acciones : r.accion ? [r.accion] : []; }
  R.coincide = function (r, ev) {
    if (!r.activo || r.evento !== ev.tipo) return false; var f = r.filtro || {};
    if (f.min != null && f.min !== '' && !(ev.valor >= +f.min)) return false;
    if (f.contiene && String(ev.texto || '').toLowerCase().indexOf(String(f.contiene).toLowerCase()) < 0) return false;
    if (f.linea && ev.linea !== f.linea) return false; if (f.dir && ev.dir !== f.dir) return false;
    return true;
  };
  function Motor(reglas) { this.ult = {}; this.reglas = reglas || []; }
  Motor.prototype.poner = function (reglas) { this.reglas = reglas || []; };
  /* ahora en segundos. Devuelve [{regla, accion, evento}] respetando el enfriamiento por regla. */
  Motor.prototype.procesar = function (ev, ahora) {
    var out = [], self = this;
    this.reglas.forEach(function (r) {
      if (!R.coincide(r, ev)) return; var u = self.ult[r.id];
      if (u != null && ahora - u < (r.enfriamiento == null ? 10 : +r.enfriamiento)) return;
      self.ult[r.id] = ahora; acciones(r).forEach(function (a) { out.push({ regla: r, accion: a, evento: ev }); });
    });
    return out;
  };
  R.Motor = Motor; R.accionesDe = acciones;

  /* Pre-roll: varios MediaRecorder escalonados (cada uno es un archivo completo y valido). Cada S segundos arranca uno nuevo y se
     descarta el de mas de 2S. Al disparar se "fija" el mas antiguo (tiene entre S y 2S de pasado) y se detiene tras el post-roll.
     fabrica() -> {start(), stop(): Promise<Blob>, descartar()}. El llamador invoca tick(ahora) unas 4 veces por segundo. */
  function Preroll(o) { this.S = o.segmento || 5; this.fabrica = o.fabrica; this.max = o.maxClip || 120; this.vivos = []; this.alClip = o.alClip || function () {}; this.ultimo = -1e9; this.activo = false; }
  Preroll.prototype.iniciar = function (ahora) { this.activo = true; this.nuevo(ahora); };
  Preroll.prototype.nuevo = function (ahora) { var r = this.fabrica(); r.start(); this.vivos.push({ r: r, ini: ahora, fijo: false, fin: 0 }); this.ultimo = ahora; };
  Preroll.prototype.tick = function (ahora) {
    if (!this.activo) return; var self = this;
    if (ahora - this.ultimo >= this.S) this.nuevo(ahora);
    this.vivos = this.vivos.filter(function (v) {
      if (v.fijo) { if (ahora >= v.fin || ahora - v.ini >= self.max + self.S) { v.fijo = 'cerrando'; var d = { preroll: v.pre, duracion: ahora - v.ini, meta: v.meta }; v.r.stop().then(function (b) { self.alClip(b, d); }, function () {}); return false; } return true; }
      if (ahora - v.ini >= 2 * self.S) { v.r.descartar(); return false; } return true;
    });
  };
  Preroll.prototype.disparar = function (ahora, post, meta) {
    var fijos = this.vivos.filter(function (v) { return v.fijo; });
    if (fijos.length) { var f = fijos[fijos.length - 1]; f.fin = Math.max(f.fin, ahora + post); return { extendido: true, preroll: f.pre }; }
    var libres = this.vivos.slice().sort(function (a, b) { return a.ini - b.ini; }); if (!libres.length) return null;
    var v = libres[0]; v.fijo = true; v.fin = ahora + post; v.pre = ahora - v.ini; v.meta = meta; return { extendido: false, preroll: v.pre };
  };
  Preroll.prototype.parar = function () { this.activo = false; this.vivos.forEach(function (v) { v.r.descartar(); }); this.vivos = []; };
  Preroll.prototype.pendientes = function () { return this.vivos.filter(function (v) { return v.fijo; }).length; };
  R.Preroll = Preroll;
  return R;
});
