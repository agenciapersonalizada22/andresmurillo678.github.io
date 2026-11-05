/* Unico modulo de almacenamiento (localStorage). Claves prefijadas con el id del juego; facil de sincronizar luego.
   ajustes_dispositivo: graficos y controles (por dispositivo, nunca a la nube). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var P = 'buscaminas_';
  var CLAVES = { ajustes: P + 'ajustes', dispositivo: P + 'ajustes_dispositivo', progreso: P + 'progreso', partida: P + 'partida', asiento: P + 'asiento', sala: P + 'sala' };
  var mem = {};
  function ls() { try { return G.localStorage; } catch (e) { return null; } }
  function leer(k, def) {
    try { var s = ls().getItem(k); if (s == null) return def; return JSON.parse(s); } catch (e) { return mem[k] !== undefined ? mem[k] : def; }
  }
  function escribir(k, v) { mem[k] = v; try { ls().setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function borrar(k) { delete mem[k]; try { ls().removeItem(k); } catch (e) {} }

  function b64(t) { return G.btoa(unescape(encodeURIComponent(t))); }
  function deb64(t) { return decodeURIComponent(escape(G.atob(t))); }
  function exportar() {
    return 'BM1:' + b64(JSON.stringify({ ajustes: leer(CLAVES.ajustes, null), dispositivo: leer(CLAVES.dispositivo, null), progreso: leer(CLAVES.progreso, null) }));
  }
  function importar(txt) {
    try {
      txt = String(txt).trim(); if (txt.indexOf('BM1:') !== 0) return false;
      var o = JSON.parse(deb64(txt.slice(4)));
      if (!o || typeof o !== 'object') return false;
      if (o.ajustes) escribir(CLAVES.ajustes, o.ajustes);
      if (o.dispositivo) escribir(CLAVES.dispositivo, o.dispositivo);
      if (o.progreso) escribir(CLAVES.progreso, o.progreso);
      return true;
    } catch (e) { return false; }
  }
  function borrarTodo() { for (var k in CLAVES) if (k !== 'asiento') borrar(CLAVES[k]); }
  BM.almacen = { CLAVES: CLAVES, leer: leer, escribir: escribir, borrar: borrar, exportar: exportar, importar: importar, borrarTodo: borrarTodo };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
