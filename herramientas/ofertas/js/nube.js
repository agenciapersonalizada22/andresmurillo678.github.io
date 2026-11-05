/* Proveedor de sincronizacion de Ofertas: ofertas guardadas (g:), carpetas (c:), alertas (al:) y las preferencias personales
   (categorias favoritas y tiendas silenciadas, que son las "fuentes" que el usuario sigue u oculta). Quedan fuera: tema, vista,
   moneda, pais, filtros, visita y datos de demostracion (ajustes por dispositivo), y cualquier `claves_dispositivo*`. */
(function (g) {
  if (!g.CuentaNube || !g.Of || !g.Of.almacen) return;
  var Of = g.Of, St = Of.almacen, PREF = 'aj_personal', aplicando = false, ultimoAj = '';
  function permitida(k) { return k === PREF || /^(g|c|al):.+/.test(k); }
  function sub(aj) { return { favoritas: (aj && aj.favoritas) || [], silenciadas: (aj && aj.silenciadas) || [] }; }
  g.CuentaNube.proveedor = {
    id: 'ofertas',
    permitida: permitida,
    leer: function () {
      return St.abrir().then(function () {
        var o = {};
        St.listaTodo().forEach(function (x) {
          if (x.k === 'aj') { if (!x.d) o[PREF] = { v: sub(x.v), t: x.t }; }
          else if (permitida(x.k)) o[x.k] = x.d ? { d: true, t: x.t } : { v: x.v, t: x.t };
        });
        return o;
      });
    },
    aplicar: function (mapa) {
      aplicando = true;
      try {
        Object.keys(mapa).forEach(function (k) {
          var r = mapa[k];
          if (k === PREF) { var aj = Object.assign({}, St.get('aj', {}), sub(r.v)); St.poner('aj', aj, r.t, false); }
          else St.poner(k, r.v, r.t, !!r.d);
        });
      } finally { aplicando = false; }
      return Promise.resolve();
    },
    suscribir: function (cb) {
      ultimoAj = JSON.stringify(sub(St.get('aj', {})));
      St.suscribir(function (k) {
        if (aplicando) return;
        if (k === 'aj') { var h = JSON.stringify(sub(St.get('aj', {}))); if (h === ultimoAj) return; ultimoAj = h; cb(); }
        else if (permitida(k)) cb();
      });
    },
    alAplicar: function (n) {
      var A = Of.app, S = A.S, aj = St.get('aj', {});
      if (aj.favoritas) S.aj.favoritas = aj.favoritas; if (aj.silenciadas) S.aj.silenciadas = aj.silenciadas;
      S.carpetas = St.lista('c:').map(function (x) { return x.v; });
      S.guardados = {}; St.lista('g:').forEach(function (x) { S.guardados[x.v.id] = x.v; });
      S.alertas = St.lista('al:').map(function (x) { return x.v; });
      try { A.calcNuevas(); A.pintarNav(); A.ir(S.vista); if (A.recalcular) A.recalcular(); } catch (e) { console.error(e); }
      A.toast('Datos sincronizados desde tu cuenta (' + n + ')');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
