/* Almacen del modulo: perfiles de dispositivos e historial de sesiones (IndexedDB 'trabajos_dispositivos'). Se sincroniza con la cuenta
   via CuentaTrabajos.integrar; las claves/tokens se descartan siempre antes de guardar (nunca viajan a la nube). window.DispDatos */
(function (g) {
  'use strict';
  var P = g.DispPuro, TD = g.TrabajosDispositivos, ID = 'trabajos_dispositivos', MAX_SES = 300;
  var alm = g.Almacen.crear(ID), D = g.DispDatos = { ID: ID, alm: alm, COLS: ['perfiles', 'sesiones'] };
  var TIPOS = ['serial', 'bluetooth', 'usb', 'hid', 'camara', 'microfono', 'mando', 'sensores', 'puente'];
  D.TIPOS = TIPOS;
  /* guarda un perfil {id?, nombre, tipo, parametros, notas}. Devuelve {perfil, quitados} */
  D.guardarPerfil = function (p) {
    var nombre = String(p.nombre || '').trim().slice(0, 60); if (!nombre) return Promise.reject(new Error('Ponle un nombre al perfil.'));
    if (TIPOS.indexOf(p.tipo) < 0) return Promise.reject(new Error('Tipo de dispositivo no válido.'));
    var lim = P.limpiarParametros(p.parametros || {}), reg = { id: p.id, nombre: nombre, tipo: p.tipo, parametros: lim.valor, notas: String(p.notas || '').slice(0, 600) };
    return alm.set('perfiles', reg).then(function (r) { return { perfil: r, quitados: lim.quitados }; });
  };
  D.perfiles = function (tipo) { return alm.lista('perfiles').then(function (l) { return l.filter(function (p) { return !tipo || p.tipo === tipo; }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }); }); };
  D.perfil = function (id) { return alm.get('perfiles', id); };
  D.borrarPerfil = function (id) { return alm.borrar('perfiles', id); };
  D.sesiones = function () { return alm.lista('sesiones').then(function (l) { return l.sort(function (a, b) { return b.inicio - a.inicio; }); }); };
  D.borrarSesiones = function () { return D.sesiones().then(function (l) { return Promise.all(l.map(function (s) { return alm.borrar('sesiones', s.id); })); }); };
  D.borrarSesion = function (id) { return alm.borrar('sesiones', id); };
  D.recortar = function () { return D.sesiones().then(function (l) { return Promise.all(l.slice(MAX_SES).map(function (s) { return alm.borrar('sesiones', s.id); })); }); };
  /* historial automatico: cada conexion que se cierra deja una sesion (sin contenido de los datos, solo contadores) */
  TD.escuchar('desconectado', function (ev) {
    var r = ev.resumen || {}, dur = Date.now() - ev.desde;
    if (dur < 800 && !r.rx && !r.tx) return;
    var reg = { tipo: ev.tipo, nombre: String(ev.nombre || '').slice(0, 80), inicio: ev.desde, duracion: dur, rx: r.rx, tx: r.tx, bytesRx: r.bytesRx, bytesTx: r.bytesTx, motivo: ev.motivo || '', error: ev.error ? ev.error.titulo : '' };
    if (/^wss?:/i.test(reg.nombre)) reg.nombre = P.limpiarUrl(reg.nombre).url;
    alm.set('sesiones', reg).then(function () { return D.recortar(); }).catch(function (e) { console.warn(e); });
  });
  TD.perfiles = { lista: D.perfiles, guardar: D.guardarPerfil, borrar: D.borrarPerfil, obtener: D.perfil };
  TD.sesiones = D.sesiones;
  /* conectar con los parametros de un perfil guardado */
  TD.conectarPerfil = function (id, extra) {
    return D.perfil(id).then(function (p) { if (!p) throw new Error('El perfil no existe.'); return TD.conectar(p.tipo, Object.assign({}, p.parametros, extra || {})); });
  };
})(window);
