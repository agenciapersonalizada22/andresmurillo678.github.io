/* Nucleo de dispositivos: registro de drivers, conexiones, eventos. API publica window.TrabajosDispositivos (ver LEEME.md).
   Sin DOM. Los drivers (drv-*.js) se registran con registrarDriver y reciben un "ctx" para emitir rx/error/cerrado. */
(function (g) {
  'use strict';
  var P = g.DispPuro, drivers = {}, conex = {}, subs = [], ultimosErrores = [];
  var TD = g.TrabajosDispositivos = { version: 1, puro: P, errores: ultimosErrores };

  function tam(d) { return d == null ? 0 : d.byteLength != null ? d.byteLength : typeof d === 'string' ? d.length : JSON.stringify(d).length; }
  function emitir(ev) {
    ev.t = ev.t || Date.now();
    subs.slice().forEach(function (s) {
      var f = s.f;
      if (f.evento && f.evento !== ev.evento) return; if (f.tipo && f.tipo !== ev.tipo) return; if (f.id && f.id !== ev.id) return;
      try { s.fn(ev); } catch (e) { console.error('[TrabajosDispositivos] oyente:', e); }
    });
  }
  TD.emitir = emitir;

  /* escuchar('datos' | '*' | {evento,tipo,id}, fn) -> funcion para dejar de escuchar. Eventos: conectado, desconectado, estado, datos, error */
  TD.escuchar = function (filtro, fn) {
    var f = typeof filtro === 'string' ? (filtro === '*' ? {} : { evento: filtro }) : (filtro || {}), s = { f: f, fn: fn };
    subs.push(s); return function () { subs = subs.filter(function (x) { return x !== s; }); };
  };

  TD.registrarDriver = function (tipo, d) { drivers[tipo] = d; d.tipo = tipo; return d; };
  TD.driver = function (tipo) { return drivers[tipo] || null; };
  TD.tipos = function () { return Object.keys(drivers).map(function (t) { return { tipo: t, nombre: drivers[t].nombre, soportado: !!(drivers[t].soportado && drivers[t].soportado()) }; }); };
  TD.soportado = function (tipo) { var d = drivers[tipo]; return !!(d && d.soportado && d.soportado()); };
  TD.capacidades = function () { var C = g.DispCapacidades; return C.detectar(C.entorno(g)); };

  function Conexion(id, tipo, opts) {
    this.id = id; this.tipo = tipo; this.opts = opts || {}; this.estado = 'conectando'; this.nombre = ''; this.desde = Date.now();
    this.rx = 0; this.tx = 0; this.bytesRx = 0; this.bytesTx = 0; this.error = null; this.nativo = null; this.h = null;
  }
  Conexion.prototype.resumen = function () { return { id: this.id, tipo: this.tipo, nombre: this.nombre, estado: this.estado, desde: this.desde, rx: this.rx, tx: this.tx, bytesRx: this.bytesRx, bytesTx: this.bytesTx }; };
  Conexion.prototype.escuchar = function (fn, evento) { return TD.escuchar({ id: this.id, evento: evento }, fn); };
  Conexion.prototype.enviar = function (datos, o) {
    var c = this;
    if (c.estado !== 'conectado' || !c.h || !c.h.enviar) return Promise.reject(new Error('La conexión no está abierta.'));
    return Promise.resolve(c.h.enviar(datos, o || {})).then(function (r) {
      c.tx++; c.bytesTx += tam(datos);
      emitir({ evento: 'datos', id: c.id, tipo: c.tipo, dir: 'tx', datos: datos, meta: (o && o.meta) || null }); return r;
    }, function (e) { falla(c, e); throw e; });
  };
  Conexion.prototype.cerrar = function () { return TD.desconectar(this.id); };

  function cambiarEstado(c, estado, msg) {
    if (c.estado === estado) return; c.estado = estado;
    emitir({ evento: 'estado', id: c.id, tipo: c.tipo, estado: estado, mensaje: msg || '' });
  }
  function falla(c, e) {
    var x = P.explicarError(e, c.tipo); c.error = x;
    ultimosErrores.push({ tipo: c.tipo, titulo: x.titulo, mensaje: x.texto, t: Date.now() }); if (ultimosErrores.length > 20) ultimosErrores.shift();
    emitir({ evento: 'error', id: c.id, tipo: c.tipo, error: e, explicacion: x });
  }
  TD.registrarError = function (tipo, e) { var x = P.explicarError(e, tipo); ultimosErrores.push({ tipo: tipo, titulo: x.titulo, mensaje: x.texto, t: Date.now() }); if (ultimosErrores.length > 20) ultimosErrores.shift(); emitir({ evento: 'error', id: null, tipo: tipo, error: e, explicacion: x }); return x; };

  /* conectar(tipo, opciones) -> Promise<Conexion>. Debe llamarse desde un gesto del usuario para los tipos con selector. */
  TD.conectar = function (tipo, opts) {
    var d = drivers[tipo];
    if (!d) return Promise.reject(new Error('Tipo de dispositivo desconocido: ' + tipo));
    if (d.soportado && !d.soportado()) { var e0 = new Error('Este navegador no ofrece ' + d.nombre + '.'); e0.name = 'NotSupportedError'; TD.registrarError(tipo, e0); return Promise.reject(e0); }
    var c = new Conexion(tipo + '-' + Math.random().toString(36).slice(2, 7), tipo, opts), ctx = {
      rx: function (datos, meta) { if (c.estado === 'cerrado') return; if (c.estado === 'conectando') { (c._cola = c._cola || []).push([datos, meta]); return; } c.rx++; c.bytesRx += tam(datos); emitir({ evento: 'datos', id: c.id, tipo: tipo, dir: 'rx', datos: datos, meta: meta || null }); },
      estado: function (s, m) { cambiarEstado(c, s, m); },
      error: function (e) { falla(c, e); },
      cerrado: function (motivo) { terminar(c, motivo || 'Desconectado'); }
    };
    conex[c.id] = c; emitir({ evento: 'estado', id: c.id, tipo: tipo, estado: 'conectando' });
    return Promise.resolve().then(function () { return d.conectar(opts || {}, ctx); }).then(function (h) {
      c.h = h; c.nativo = h.nativo || null; c.nombre = h.nombre || d.nombre;
      if (c.estado === 'cerrado') { try { h.cerrar && h.cerrar(); } catch (e) {} return c; }
      c.estado = 'conectado'; Object.keys(h.extra || {}).forEach(function (k) { c[k] = h.extra[k]; });
      emitir({ evento: 'conectado', id: c.id, tipo: tipo, nombre: c.nombre }); emitir({ evento: 'estado', id: c.id, tipo: tipo, estado: 'conectado' });
      if (c._cola) { var q = c._cola; c._cola = null; setTimeout(function () { q.forEach(function (x) { ctx.rx(x[0], x[1]); }); }, 0); }
      return c;
    }, function (e) { delete conex[c.id]; c.estado = 'cerrado'; var x = P.explicarError(e, tipo); ultimosErrores.push({ tipo: tipo, titulo: x.titulo, mensaje: x.texto, t: Date.now() }); emitir({ evento: 'error', id: c.id, tipo: tipo, error: e, explicacion: x }); throw e; });
  };
  function terminar(c, motivo, ok) {
    if (c.estado === 'cerrado') return; c.estado = 'cerrado'; delete conex[c.id];
    emitir({ evento: 'estado', id: c.id, tipo: c.tipo, estado: 'cerrado', mensaje: motivo });
    emitir({ evento: 'desconectado', id: c.id, tipo: c.tipo, nombre: c.nombre, motivo: motivo, voluntario: !!ok, resumen: c.resumen(), desde: c.desde, error: c.error });
  }
  TD.desconectar = function (id) {
    var c = conex[id]; if (!c) return Promise.resolve();
    return Promise.resolve().then(function () { return c.h && c.h.cerrar && c.h.cerrar(); }).catch(function (e) { falla(c, e); }).then(function () { terminar(c, 'Cerrado por el usuario', true); });
  };
  TD.enviar = function (id, datos, o) { var c = conex[id]; return c ? c.enviar(datos, o) : Promise.reject(new Error('No hay conexión «' + id + '».')); };
  TD.obtener = function (id) { return conex[id] || null; };
  TD.listar = function (tipo) { return Object.keys(conex).map(function (k) { return conex[k]; }).filter(function (c) { return !tipo || c.tipo === tipo; }).map(function (c) { return c.resumen(); }); };
  TD.cerrarTodo = function () { return Promise.all(Object.keys(conex).map(function (k) { return TD.desconectar(k); })); };
  addEventListener('pagehide', function () { Object.keys(conex).forEach(function (k) { try { conex[k].h.cerrar(); } catch (e) {} }); });
})(window);
