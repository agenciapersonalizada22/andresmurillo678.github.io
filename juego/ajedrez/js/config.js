// =============================================================
//  ⚙  CONFIGURACIÓN
//  Niveles del motor, relojes, temas y valores generales.
//  prof = profundidad máxima · tiempo = ms por jugada ·
//  ruido = error aleatorio (centipeones) sobre las jugadas ·
//  azar = probabilidad de jugar al azar · apertura = ruido extra
//  en las primeras jugadas para que las partidas no sean iguales.
// =============================================================
export const NIVELES = [
  { id: 'principiante', nombre: 'Principiante', prof: 1, tiempo: 300, ruido: 220, azar: 0.2, apertura: 0 },
  { id: 'facil', nombre: 'Fácil', prof: 2, tiempo: 500, ruido: 100, azar: 0.06, apertura: 0 },
  { id: 'medio', nombre: 'Medio', prof: 4, tiempo: 1000, ruido: 35, azar: 0, apertura: 0 },
  { id: 'dificil', nombre: 'Difícil', prof: 8, tiempo: 2500, ruido: 0, azar: 0, apertura: 18 },
  { id: 'maestro', nombre: 'Maestro', prof: 64, tiempo: 5000, ruido: 0, azar: 0, apertura: 10 },
];

// Reloj: minutos y segundos de incremento por jugada
export const RELOJES = [
  { id: 'sin', nombre: 'Sin reloj', min: 0, inc: 0 },
  { id: '1+0', nombre: '1 min', min: 1, inc: 0 },
  { id: '1+1', nombre: '1 min + 1 s', min: 1, inc: 1 },
  { id: '3+0', nombre: '3 min', min: 3, inc: 0 },
  { id: '3+2', nombre: '3 min + 2 s', min: 3, inc: 2 },
  { id: '5+0', nombre: '5 min', min: 5, inc: 0 },
  { id: '5+3', nombre: '5 min + 3 s', min: 5, inc: 3 },
  { id: '10+0', nombre: '10 min', min: 10, inc: 0 },
  { id: '10+5', nombre: '10 min + 5 s', min: 10, inc: 5 },
];

export const CALIDADES = [
  { id: 'baja', nombre: 'Baja', sombras: 0, antialias: false, pixelRatio: 1, mapa: 1024, textura: 512 },
  { id: 'media', nombre: 'Media', sombras: 1, antialias: true, pixelRatio: 1.5, mapa: 1024, textura: 1024 },
  { id: 'alta', nombre: 'Alta', sombras: 2, antialias: true, pixelRatio: 2, mapa: 2048, textura: 2048 },
];

export const CONFIG = {
  guardado: {
    partida: 'ajedrez_partida_v1',
    opciones: 'ajedrez_opciones_v1',
    stats: 'ajedrez_stats_v1',
  },
  tiempoMinimoIA: 450, // la IA nunca responde más rápido que esto (ms), para que se note la jugada
  animacion: { mover: 0.38, capturar: 0.35, enroque: 0.45 },
};
