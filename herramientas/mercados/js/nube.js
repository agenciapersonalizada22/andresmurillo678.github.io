/* Proveedor de sincronizacion de Mercados: listas (watchlists), alertas, cartera simulada, carteras reales, screeners y dibujos.
   Quedan fuera los ajustes del dispositivo (tema, moneda, forzarDemo) y cualquier `claves_dispositivo*`. */
(function () {
  if (typeof CuentaNube === 'undefined' || typeof Almacen === 'undefined') return;
  var PERM = /^(listas|lista_actual|sim|alertas|alertas_historial|real|real_actual|screeners|cmp_sel|dibujos_.+)$/, LAP = 'mercados_nube_lapidas';
  function lapidas() { try { return JSON.parse(localStorage.getItem(LAP) || '{}'); } catch (e) { return {}; } }
  function guardarLap(l) { try { localStorage.setItem(LAP, JSON.stringify(l)); } catch (e) {} }
  var aplicando = false;
  CuentaNube.proveedor = {
    id: 'mercados',
    permitida: function (k) { return PERM.test(k); },
    leer: function () {
      return Almacen.listo.then(function () {
        var o = {}, lap = lapidas();
        Object.keys(lap).forEach(function (k) { if (PERM.test(k)) o[k] = { d: true, t: lap[k] }; });
        Almacen.lista('').forEach(function (x) { if (PERM.test(x.clave)) o[x.clave] = { v: x.valor, t: x.t }; });
        return o;
      });
    },
    aplicar: function (mapa) {
      aplicando = true;
      try {
        var lap = lapidas(), datos = {};
        Object.keys(mapa).forEach(function (k) {
          var r = mapa[k];
          if (r.d) { Almacen.borrar(k); lap[k] = r.t; } else { datos[k] = { v: r.v, t: r.t }; delete lap[k]; }
        });
        if (Object.keys(datos).length) Almacen.importar({ app: 'mercados', datos: datos });
        guardarLap(lap);
      } finally { aplicando = false; }
      return Promise.resolve();
    },
    suscribir: function (cb) {
      Almacen.suscribir('', function (k, val) {
        if (aplicando || !PERM.test(k)) return;
        var lap = lapidas(); if (val === undefined) lap[k] = Date.now(); else delete lap[k]; guardarLap(lap); cb();
      }, true);
    },
    alAplicar: function (n, primera) {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Datos sincronizados desde tu cuenta (' + n + ')');
      try { dispatchEvent(new Event('hashchange')); } catch (e) {}
    }
  };
})();
