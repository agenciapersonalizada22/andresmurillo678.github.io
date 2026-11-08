/* Almacen del modulo QR (IndexedDB 'trabajos_qr'): historial/favoritos y estilos guardados. Se sincronizan con la cuenta
   (CuentaTrabajos.integrar). Las claves de API no existen aqui; si las hubiera irian en trabajos_qr_claves_dispositivo (nunca sincronizada). */
(function (g) {
  'use strict';
  var ID = 'trabajos_qr', MAX = 200, alm = g.Almacen.crear(ID), D = g.QRDatos = { ID: ID, alm: alm, COLS: ['historial', 'estilos'] };
  D.listaHistorial = function () { return alm.lista('historial').then(function (l) { return l.sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); }); };
  /* guarda (o actualiza) una entrada; misma clave tipo+texto => mismo registro. e: {tipo, texto, titulo, ecc, estilo, origen} */
  D.guardar = function (e, fav) {
    var id = g.Tr.hash(e.tipo + '\u0001' + e.texto);
    return alm.get('historial', id).then(function (prev) {
      var reg = Object.assign({}, prev || {}, e, { id: id, fav: fav != null ? !!fav : !!(prev && prev.fav) });
      return alm.set('historial', reg);
    }).then(function (r) { return D.recortar().then(function () { return r; }); });
  };
  D.alternarFav = function (id) { return alm.get('historial', id).then(function (r) { if (!r) return null; r.fav = !r.fav; return alm.set('historial', r); }); };
  D.borrar = function (id) { return alm.borrar('historial', id); };
  D.limpiarNoFavoritos = function () { return D.listaHistorial().then(function (l) { return Promise.all(l.filter(function (r) { return !r.fav; }).map(function (r) { return alm.borrar('historial', r.id); })); }); };
  D.recortar = function () { return D.listaHistorial().then(function (l) { var otros = l.filter(function (r) { return !r.fav; }); return Promise.all(otros.slice(MAX).map(function (r) { return alm.borrar('historial', r.id); })); }); };
  D.guardarEstilo = function (nombre, estilo) { return alm.set('estilos', { id: g.Tr.hash(nombre.toLowerCase()), nombre: nombre, estilo: estilo }); };
  D.estilos = function () { return alm.lista('estilos').then(function (l) { return l.sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; }); }); };
  D.borrarEstilo = function (id) { return alm.borrar('estilos', id); };
})(window);
