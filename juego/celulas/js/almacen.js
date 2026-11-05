/* Celulas: unico modulo de almacenamiento (localStorage con prefijo "celulas_"). Facil de sincronizar luego con la nube.
   celulas_ajustes_dispositivo = graficos y controles (NO se sincroniza)   celulas_ajustes = audio, accesibilidad, preferencias
   celulas_perfil = nombre y skin   celulas_progreso = estadisticas, logros, records   celulas_partida = partida en solitario
   celulas_sala = sala multijugador del anfitrion   celulas_asiento = token de asiento del cliente */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  var PRE = 'celulas_', mem = {};
  var A = C.Almacen = {
    claves: ['ajustes_dispositivo', 'ajustes', 'perfil', 'progreso', 'partida', 'sala', 'asiento'],
    leer: function (k, def) {
      try { var t = G.localStorage.getItem(PRE + k); if (t != null) return JSON.parse(t); } catch (e) {}
      return mem[k] !== undefined ? mem[k] : def;
    },
    escribir: function (k, v) {
      mem[k] = v;
      try { G.localStorage.setItem(PRE + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    borrar: function (k) { delete mem[k]; try { G.localStorage.removeItem(PRE + k); } catch (e) {} },
    mezclar: function (def, v) { var o = {}, k; for (k in def) o[k] = def[k]; if (v) for (k in v) if (k in def) o[k] = (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) ? A.mezclar(def[k], v[k]) : v[k]; return o; },
    exportar: function () {
      var o = { juego: 'celulas', v: 1 };
      A.claves.forEach(function (k) { if (k !== 'partida' && k !== 'sala') { var v = A.leer(k, undefined); if (v !== undefined) o[k] = v; } });
      var t = JSON.stringify(o);
      try { return G.btoa(unescape(encodeURIComponent(t))); } catch (e) { return t; }
    },
    importar: function (txt) {
      var o; txt = String(txt || '').trim();
      try { o = JSON.parse(decodeURIComponent(escape(G.atob(txt)))); } catch (e) { try { o = JSON.parse(txt); } catch (e2) { return false; } }
      if (!o || o.juego !== 'celulas') return false;
      A.claves.forEach(function (k) { if (o[k] !== undefined && k !== 'partida' && k !== 'sala') A.escribir(k, o[k]); });
      return true;
    },
    borrarTodo: function () { A.claves.forEach(function (k) { if (k !== 'ajustes_dispositivo') A.borrar(k); }); }
  };
  C.PROGRESO_INI = { stats: { partidas: 0, multi: 0, kills: 0, muertes: 0, comida: 0, maxMasa: 0, tiempo: 0, divisiones: 0, expulsadas: 0, virus: 0, victorias: 0, emboscadas: 0, rachaMax: 0 }, logros: {}, records: { ffa: 0, equipos: 0, superv: 0, batalla: 0 }, ayuda: false };
  C.progreso = function () { return A.mezclar(C.PROGRESO_INI, A.leer('progreso', null)); };
})(typeof globalThis !== 'undefined' ? globalThis : window);
