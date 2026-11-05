/* Logros y registro de puntajes (ids estables para la plataforma). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var LOGROS = [
    { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana una partida.' },
    { id: 'relampago', nombre: 'Relámpago', desc: 'Gana Principiante en menos de 15 s sin ayudas.' },
    { id: 'veloz_intermedio', nombre: 'Veloz', desc: 'Gana Intermedio en menos de 90 s sin ayudas.' },
    { id: 'maestro_experto', nombre: 'Maestro artificiero', desc: 'Gana Experto en menos de 240 s sin ayudas.' },
    { id: 'experto_ganado', nombre: 'Experto', desc: 'Gana un tablero Experto.' },
    { id: 'racha_3', nombre: 'En racha', desc: 'Encadena 3 victorias seguidas.' },
    { id: 'racha_10', nombre: 'Imparable', desc: 'Encadena 10 victorias seguidas.' },
    { id: 'sin_banderas', nombre: 'Memoria de elefante', desc: 'Gana Intermedio o mayor sin colocar una sola bandera.' },
    { id: 'acordista', nombre: 'Acordista', desc: 'Haz 100 acordes con éxito.' },
    { id: 'sin_adivinar_ok', nombre: 'Pura lógica', desc: 'Gana un tablero Sin adivinar.' },
    { id: 'diario_ok', nombre: 'Reto cumplido', desc: 'Completa un Reto diario.' },
    { id: 'diario_7', nombre: 'Constancia', desc: 'Completa el Reto diario en 7 días distintos.' },
    { id: 'contrarreloj_ok', nombre: 'Contra el reloj', desc: 'Gana una partida Contrarreloj.' },
    { id: 'supervivencia_5', nombre: 'Superviviente', desc: 'Llega al nivel 5 en Supervivencia.' },
    { id: 'supervivencia_10', nombre: 'Leyenda de campo minado', desc: 'Llega al nivel 10 en Supervivencia.' },
    { id: 'colosal', nombre: 'Colosal', desc: 'Gana un tablero personalizado de 1000 casillas o más.' },
    { id: 'veterano', nombre: 'Veterano', desc: 'Juega 50 partidas.' },
    { id: 'explosivo', nombre: 'Explosivo', desc: 'Pierde 10 partidas. Se aprende explotando.' },
    { id: 'pidio_pista', nombre: 'Una ayudita', desc: 'Usa una pista.' },
    { id: 'aprendiz', nombre: 'Aprendiz', desc: 'Gana una partida en modo Práctica.' },
    { id: 'maraton', nombre: 'Maratón', desc: 'Acumula una hora de juego.' },
    { id: 'carrera_ganada', nombre: 'Primero en meta', desc: 'Gana una Carrera multijugador.' },
    { id: 'coop_ganado', nombre: 'Equipo imbatible', desc: 'Gana una partida Cooperativa.' },
    { id: 'duelo_ganado', nombre: 'Duelista', desc: 'Gana un Duelo multijugador.' }
  ];
  var MODOS_PUNTAJE = [
    { id: 'tiempo_principiante', nombre: 'Principiante (tiempo)', mayorEsMejor: false, tope: 999, unidad: 's' },
    { id: 'tiempo_intermedio', nombre: 'Intermedio (tiempo)', mayorEsMejor: false, tope: 999, unidad: 's' },
    { id: 'tiempo_experto', nombre: 'Experto (tiempo)', mayorEsMejor: false, tope: 999, unidad: 's' },
    { id: 'diario', nombre: 'Reto diario (tiempo)', mayorEsMejor: false, tope: 999, unidad: 's' },
    { id: 'contrarreloj', nombre: 'Contrarreloj (puntos)', mayorEsMejor: true, tope: 100000, unidad: 'pts' },
    { id: 'supervivencia', nombre: 'Supervivencia (puntos)', mayorEsMejor: true, tope: 1000000, unidad: 'pts' }
  ];
  BM.logros = { LISTA: LOGROS };
  BM.registro = { id: 'buscaminas', nombre: 'Buscaminas', modos: MODOS_PUNTAJE, logros: LOGROS };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
