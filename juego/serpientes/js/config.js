/* Serpientes: constantes, utilidades y definiciones de modos/dificultades. Sin DOM (se prueba en Node). */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {};
  var TAU = Math.PI * 2;
  S.TAU = TAU;
  S.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  S.angDiff = function (a, b) { var d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
  S.rng = function (seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  S.C = {
    R: 3000, DT: 1 / 60, VEL: 175, VEL_TURBO: 340, GIRO: 4.4, MASA_INI: 12, MASA_MIN: 10, TRD: 4, TOTAL: 25,
    MAX_ORBES: 9000, OBJ_ORBES: 4200, MAX_SEG: 24000, INMUNE: 2, REAPARECE: 3.2
  };
  S.radio = function (m) { return Math.min(26, 6 + 1.15 * Math.sqrt(m)); };
  S.espaciado = function (r) { return Math.max(5, r * 0.8); };
  S.largo = function (m) { return 36 + m * 4.2; };
  S.nSegs = function (m) { return Math.floor(S.largo(m) / S.espaciado(S.radio(m))) + 1; };
  S.tipoOrbe = function (v) { return v < 1.5 ? 0 : v < 3 ? 1 : v < 6 ? 2 : 3; };

  S.MODOS = {
    ffa: { id: 'ffa', nombre: 'Todos contra todos', desc: 'Crece, caza y llega al primer puesto. Reapareces al morir.', respawn: true, equipos: false, total: 25 },
    equipos: { id: 'equipos', nombre: 'Equipos', desc: 'Azul contra rojo, 5 minutos. Gana el equipo con más masa. Sin daño entre aliados.', respawn: true, equipos: true, total: 12, duracion: 300 },
    superv: { id: 'superv', nombre: 'Supervivencia', desc: 'La arena se encoge. Sin reaparición: sé la última serpiente.', respawn: false, equipos: false, total: 25 },
    rey: { id: 'rey', nombre: 'Rey de la colina', desc: 'Permanece en la zona dorada. El primero en 90 puntos gana.', respawn: true, equipos: false, total: 25, meta: 90 }
  };
  S.DIFS = {
    facil: { id: 'facil', nombre: 'Fácil', ia: 0.28, vision: 420, agr: 0.15, turbo: 0.1, ruido: 0.28, mira: 0.9, circulo: false },
    normal: { id: 'normal', nombre: 'Normal', ia: 0.16, vision: 560, agr: 0.45, turbo: 0.4, ruido: 0.14, mira: 1.0, circulo: true },
    dificil: { id: 'dificil', nombre: 'Difícil', ia: 0.1, vision: 700, agr: 0.75, turbo: 0.8, ruido: 0.06, mira: 1.15, circulo: true },
    experto: { id: 'experto', nombre: 'Experto', ia: 0.07, vision: 850, agr: 1, turbo: 1, ruido: 0.02, mira: 1.3, circulo: true }
  };
  S.NOMBRES_BOT = ['Mamba', 'Naga', 'Cobrita', 'Áspid', 'Víbora', 'Reptil', 'Coralillo', 'Anaconda', 'Pitón', 'Basilisco', 'Ofidio', 'Serpentina', 'Escama', 'Sigilo', 'Colmillo', 'Dragón', 'Cascabel', 'Mocasín', 'Boa', 'Taipán', 'Sierpe', 'Hidra', 'Quetzal', 'Venenito', 'Zigzag', 'Lazo', 'Espiral', 'Culebra', 'Nagini', 'Jörmun'];
})(typeof window !== 'undefined' ? window : globalThis);
