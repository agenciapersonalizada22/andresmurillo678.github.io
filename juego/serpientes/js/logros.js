/* Logros y modos de puntaje (ids estables). */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, L = S.Logros = {};
  L.LISTA = [
    { id: 'primera_sangre', nombre: 'Primera presa', desc: 'Elimina a otra serpiente.' },
    { id: 'cazador_10', nombre: 'Cazador', desc: 'Acumula 10 eliminaciones.' },
    { id: 'cazador_100', nombre: 'Depredador', desc: 'Acumula 100 eliminaciones.' },
    { id: 'largo_100', nombre: 'Creciendo', desc: 'Alcanza longitud 100.' },
    { id: 'largo_300', nombre: 'Gran serpiente', desc: 'Alcanza longitud 300.' },
    { id: 'largo_1000', nombre: 'Leviatán', desc: 'Alcanza longitud 1000.' },
    { id: 'comelon', nombre: 'Comelón', desc: 'Come 1000 orbes en total.' },
    { id: 'gloton', nombre: 'Glotón', desc: 'Come 150 orbes en una sola vida.' },
    { id: 'turbo_loco', nombre: 'Turbo loco', desc: 'Usa el turbo durante 60 s en total.' },
    { id: 'superviviente', nombre: 'Superviviente', desc: 'Sobrevive 5 minutos en una vida.' },
    { id: 'rey_colina', nombre: 'Rey de la colina', desc: 'Gana una partida de Rey de la colina.' },
    { id: 'campeon_equipos', nombre: 'Campeón de equipo', desc: 'Gana una partida por Equipos.' },
    { id: 'ultimo_en_pie', nombre: 'Último en pie', desc: 'Gana una partida de Supervivencia.' },
    { id: 'racha_3', nombre: 'Racha triple', desc: 'Elimina a 3 serpientes en 10 segundos.' },
    { id: 'estilista', nombre: 'Estilista', desc: 'Guarda una skin personalizada.' },
    { id: 'multijugador', nombre: 'Mejor en compañía', desc: 'Juega una partida multijugador.' },
    { id: 'numero_uno', nombre: 'Número uno', desc: 'Llega al primer puesto de la tabla.' },
    { id: 'maraton', nombre: 'Maratón', desc: 'Juega 25 partidas.' },
    { id: 'sin_turbo', nombre: 'Puro y paciente', desc: 'Llega a longitud 150 sin usar turbo en esa vida.' },
    { id: 'mando', nombre: 'Jugador de mando', desc: 'Juega con un mando.' }
  ];
  /* Modos de puntaje para la plataforma (mayorEsMejor/tope/unidad) */
  L.PUNTAJES = [
    { id: 'ffa_longitud', nombre: 'Todos contra todos: longitud', mayorEsMejor: true, tope: 100000, unidad: 'longitud' },
    { id: 'equipos_longitud', nombre: 'Equipos: longitud', mayorEsMejor: true, tope: 100000, unidad: 'longitud' },
    { id: 'superv_tiempo', nombre: 'Supervivencia: tiempo', mayorEsMejor: true, tope: 7200, unidad: 's' },
    { id: 'rey_zona', nombre: 'Rey de la colina: tiempo en zona', mayorEsMejor: true, tope: 7200, unidad: 's' }
  ];
  var cb = null, kills = [];
  L.alDesbloquear = function (f) { cb = f; };
  L.dar = function (id) {
    if (A.prog.logros[id]) return false;
    A.prog.logros[id] = Date.now(); A.guardarProg();
    var l = L.LISTA.filter(function (x) { return x.id === id; })[0];
    if (cb && l) cb(l); return true;
  };
  L.kill = function (t) {
    var s = A.prog.stats; s.kills++; L.dar('primera_sangre'); if (s.kills >= 10) L.dar('cazador_10'); if (s.kills >= 100) L.dar('cazador_100');
    kills.push(t); while (kills.length && t - kills[0] > 10) kills.shift(); if (kills.length >= 3) L.dar('racha_3');
  };
  /* revision periodica de la vida actual: v={masa, orbes, vivoT, turboVida, rank, bpad} */
  L.vida = function (v) {
    if (v.masa >= 100) L.dar('largo_100'); if (v.masa >= 300) L.dar('largo_300'); if (v.masa >= 1000) L.dar('largo_1000');
    if (v.orbes >= 150) L.dar('gloton'); if (v.vivoT >= 300) L.dar('superviviente');
    if (v.masa >= 150 && v.turboVida < 0.05) L.dar('sin_turbo');
    if (v.rank === 1 && v.n >= 8) L.dar('numero_uno');
    if (A.prog.stats.orbes + v.orbes >= 1000) L.dar('comelon');
    if (A.prog.stats.turbo + v.turboVida >= 60) L.dar('turbo_loco');
  };
  L.fin = function (modo, gano, mp) {
    if (gano) { var s = A.prog.stats; s.victorias++; if (modo === 'rey') L.dar('rey_colina'); if (modo === 'equipos') L.dar('campeon_equipos'); if (modo === 'superv') L.dar('ultimo_en_pie'); }
    if (mp) L.dar('multijugador');
  };
  L.partida = function () { if (A.prog.stats.partidas >= 25) L.dar('maraton'); };
  L.totales = function () { return L.LISTA.filter(function (l) { return A.prog.logros[l.id]; }).length; };
})(typeof window !== 'undefined' ? window : globalThis);
