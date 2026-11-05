// Estado compartido entre modulos de interfaz (evita importaciones circulares).
export const X = {
  E: null, yo: -1, modo: 'solo', tablero: null, enRed: false, pausado: false, vence: 0, cursor: -1,
  accion: () => {}, // la define sesion.js
  seleccion: { jugador: -1 }
};
export const dinero = (n) => '$' + Math.round(n).toLocaleString('es');
