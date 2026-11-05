/* Celulas: logros y registro de puntajes con ids estables. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  var S = function (k, n) { return function (st) { return st[k] >= n; }; };
  var X = function (k, n) { return function (st, cx) { return cx[k] >= n; }; };
  var L = C.Logros = {
    lista: [
      { id: 'primer_bocado', nombre: 'Primer bocado', desc: 'Come tu primera comida.', ok: S('comida', 1) },
      { id: 'gloton_500', nombre: 'Glotón', desc: 'Come 500 puntos de comida.', ok: S('comida', 500) },
      { id: 'festin', nombre: 'Festín', desc: 'Come 5000 puntos de comida.', ok: S('comida', 5000) },
      { id: 'masa_100', nombre: 'Crecidita', desc: 'Llega a 100 de masa.', ok: S('maxMasa', 100) },
      { id: 'masa_500', nombre: 'Pesada', desc: 'Llega a 500 de masa.', ok: S('maxMasa', 500) },
      { id: 'masa_1500', nombre: 'Gigante', desc: 'Llega a 1500 de masa.', ok: S('maxMasa', 1500) },
      { id: 'masa_5000', nombre: 'Leviatán', desc: 'Llega a 5000 de masa.', ok: S('maxMasa', 5000) },
      { id: 'primera_presa', nombre: 'Primera presa', desc: 'Devora a otra célula.', ok: S('kills', 1) },
      { id: 'cazador_15', nombre: 'Cazador', desc: 'Devora a 15 células.', ok: S('kills', 15) },
      { id: 'racha_5', nombre: 'Racha', desc: 'Devora a 5 células en una sola vida.', ok: X('killsVida', 5) },
      { id: 'mitosis', nombre: 'Mitosis', desc: 'Divídete por primera vez.', ok: S('divisiones', 1) },
      { id: 'emboscada', nombre: 'Emboscada', desc: 'Devora a alguien justo después de dividirte.', ok: S('emboscadas', 1) },
      { id: 'pinchazo', nombre: 'Pinchazo', desc: 'Revienta contra un virus.', ok: S('virus', 1) },
      { id: 'expulsor_100', nombre: 'Escupe masa', desc: 'Expulsa masa 100 veces.', ok: S('expulsadas', 100) },
      { id: 'superviviente_5', nombre: 'Superviviente', desc: 'Aguanta 5 minutos con una sola vida.', ok: X('tVida', 300) },
      { id: 'numero_uno', nombre: 'Número uno', desc: 'Lidera la clasificación (con 150+ de masa).', ok: X('top1', 1) },
      { id: 'enjambre', nombre: 'Enjambre', desc: 'Ten 10 o más células a la vez.', ok: X('celulas', 10) },
      { id: 'gigante_dificil', nombre: 'Rey de lo difícil', desc: 'Llega a 1000 de masa contra bots difíciles.', ok: function (st, cx) { return cx.dif === 'dificil' && cx.masa >= 1000; } },
      { id: 'ganador_superv', nombre: 'Último en pie', desc: 'Gana una Supervivencia.', ok: function (st, cx) { return cx.victoria && cx.modo === 'superv'; } },
      { id: 'ganador_batalla', nombre: 'Rey de la zona', desc: 'Gana una Batalla de masa.', ok: function (st, cx) { return cx.victoria && cx.modo === 'batalla'; } },
      { id: 'ganador_equipos', nombre: 'Espíritu de equipo', desc: 'Gana una partida por Equipos.', ok: function (st, cx) { return cx.victoria && cx.modo === 'equipos'; } },
      { id: 'zona_final', nombre: 'Al borde', desc: 'Sigue vivo a los 4 minutos de una Batalla.', ok: function (st, cx) { return cx.modo === 'batalla' && cx.t >= 240 && cx.vivo; } },
      { id: 'multijugador', nombre: 'Mejor en compañía', desc: 'Juega una partida multijugador.', ok: S('multi', 1) },
      { id: 'veterano_10', nombre: 'Veterano', desc: 'Juega 10 partidas.', ok: S('partidas', 10) }
    ],
    /* modos de puntaje para registrar */
    puntajes: [
      { id: 'masa_ffa', nombre: 'Masa máxima (Todos contra todos)', mayorEsMejor: true, unidad: 'masa', modo: 'ffa' },
      { id: 'masa_equipos', nombre: 'Masa máxima (Equipos)', mayorEsMejor: true, unidad: 'masa', modo: 'equipos' },
      { id: 'masa_superv', nombre: 'Masa máxima (Supervivencia)', mayorEsMejor: true, unidad: 'masa', modo: 'superv' },
      { id: 'masa_batalla', nombre: 'Masa máxima (Batalla de masa)', mayorEsMejor: true, unidad: 'masa', modo: 'batalla' }
    ],
    nuevos: [],
    /* evalua con las estadisticas persistentes y el contexto de la partida; devuelve los recien desbloqueados */
    evaluar: function (prog, cx) {
      var res = [];
      for (var i = 0; i < L.lista.length; i++) {
        var l = L.lista[i];
        if (prog.logros[l.id]) continue;
        var ok = false; try { ok = l.ok(prog.stats, cx || {}); } catch (e) {}
        if (ok) { prog.logros[l.id] = Date.now(); res.push(l); }
      }
      return res;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
