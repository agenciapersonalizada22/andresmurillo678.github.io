/* Constantes del juego: dificultades, modos y niveles. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var DIF = {
    principiante: { id: 'principiante', nombre: 'Principiante', w: 9, h: 9, m: 10 },
    intermedio: { id: 'intermedio', nombre: 'Intermedio', w: 16, h: 16, m: 40 },
    experto: { id: 'experto', nombre: 'Experto', w: 30, h: 16, m: 99 },
    personalizado: { id: 'personalizado', nombre: 'Personalizado', w: 20, h: 12, m: 40 }
  };
  var MODOS = [
    { id: 'clasico', nombre: 'Clásico', desc: 'Primer clic seguro. Gana quien abre todo sin explotar.' },
    { id: 'sinadivinar', nombre: 'Sin adivinar', desc: 'Tableros garantizados: se resuelven solo con lógica, sin azar.' },
    { id: 'contrarreloj', nombre: 'Contrarreloj', desc: 'Resuelve antes de que se acabe el tiempo. Más tiempo sobrante, más puntos.' },
    { id: 'supervivencia', nombre: 'Supervivencia', desc: 'Niveles con tableros cada vez mayores. Tienes vidas: cada mina cuesta una.' },
    { id: 'diario', nombre: 'Reto diario', desc: 'El mismo tablero para todos hoy (sin adivinar, zona inicial abierta).' },
    { id: 'practica', nombre: 'Práctica', desc: 'Sin récords: puedes deshacer jugadas y usar pistas sin presión.' }
  ];
  function minasMax(w, h, sa) { return Math.max(1, Math.min(w * h - 9, Math.floor(w * h * (sa ? 0.22 : 0.35)))); }
  function limitar(w, h, m, sa) {
    w = Math.max(5, Math.min(60, w | 0)); h = Math.max(5, Math.min(40, h | 0));
    m = Math.max(1, Math.min(minasMax(w, h, sa), m | 0)); return { w: w, h: h, m: m };
  }
  function nivelSuperv(n) {
    var w = Math.min(30, 8 + Math.floor((n - 1) * 1.5)), h = Math.min(20, 8 + (n - 1)), d = Math.min(0.22, 0.12 + 0.012 * (n - 1));
    return { w: w, h: h, m: Math.round(w * h * d) };
  }
  function limiteTiempo(w, h) { return Math.max(60, Math.round(w * h * 1.1)); }
  function clave(modo, dif) { return modo === 'diario' || modo === 'supervivencia' ? modo : modo + ':' + dif; }
  BM.config = { DIF: DIF, MODOS: MODOS, minasMax: minasMax, limitar: limitar, nivelSuperv: nivelSuperv, limiteTiempo: limiteTiempo, clave: clave, VIDAS_SUPERV: 3, VIDAS_COOP: 3, PENAL_PISTA: 15000, DUELO_TURNO: 30 };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
