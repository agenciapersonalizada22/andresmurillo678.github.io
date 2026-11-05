/* Cargador de datos en vivo (los genera el proceso programado de GitHub y viven en la rama `datos`).
   Uso: Datos.cargar('mercados/cripto.json').then(obj => ...); Datos.edad(obj) -> ms desde obj.generado.
   Override para pruebas: ?datos=<url base con barra final> o window.DATOS_CONFIG = {baseUrl, ttl}. */
(function () {
  var CFG = window.DATOS_CONFIG || {};
  var PARAM = null;
  try { PARAM = new URLSearchParams(location.search).get('datos'); } catch (e) {}
  var D = {
    base: PARAM || CFG.baseUrl || 'https://raw.githubusercontent.com/agenciapersonalizada22/andresmurillo678.github.io/datos/',
    ttl: CFG.ttl || 120000
  };
  var mem = {};
  function guardar(k, v) { try { localStorage.setItem('datos_cache_' + k, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {} }
  function leer(k) { try { var o = JSON.parse(localStorage.getItem('datos_cache_' + k)); return o && o.v ? o : null; } catch (e) { return null; } }
  D.url = function (ruta) { return D.base + ruta; };
  D.cargar = function (ruta, opts) {
    opts = opts || {};
    var m = mem[ruta];
    if (m && !opts.forzar && Date.now() - m.t < D.ttl) return Promise.resolve(m.v);
    return fetch(D.url(ruta), { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (v) { mem[ruta] = { t: Date.now(), v: v }; guardar(ruta, v); return v; })
      .catch(function (err) {
        var c = mem[ruta] || leer(ruta);
        if (c) { var v = c.v; try { Object.defineProperty(v, '_obsoleto', { value: true, configurable: true, enumerable: false }); } catch (e) {} return v; }
        throw err;
      });
  };
  D.edad = function (obj) { return obj && obj.generado ? Date.now() - Date.parse(obj.generado) : null; };
  D.estado = function () { return D.cargar('estado.json'); };
  window.Datos = D;
})();
