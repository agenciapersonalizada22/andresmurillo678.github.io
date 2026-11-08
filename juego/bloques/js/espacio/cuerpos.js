// =============================================================
//  🪐  CUERPOS CELESTES Y DIMENSIONES (solo datos)
//  Cada dimensión es un "paquete" con su generador, cielo, gravedad
//  y reglas. Para un futuro sistema solar basta con añadir cuerpos
//  (con futuro: true mientras no estén listos) y dimensiones que
//  apunten a ellos: ningún otro módulo cambia.
// =============================================================

// gravedad: múltiplo de la de la Tierra · atmosfera: se puede respirar y hay cielo azul
export const CUERPOS = {
  tierra: { nombre: 'Tierra', gravedad: 1, atmosfera: true, tipo: 'planeta', orbitaDe: 'sol' },
  luna: { nombre: 'Luna', gravedad: 0.165, atmosfera: false, tipo: 'satelite', orbitaDe: 'tierra', distanciaKm: 384400 },
  abismo: { nombre: 'Abismo', gravedad: 1, atmosfera: true, tipo: 'inframundo', orbitaDe: null },
  // ---- futuro sistema solar (no se pueden visitar todavía)
  mercurio: { nombre: 'Mercurio', gravedad: 0.38, atmosfera: false, tipo: 'planeta', orbitaDe: 'sol', futuro: true },
  venus: { nombre: 'Venus', gravedad: 0.9, atmosfera: 'densa', tipo: 'planeta', orbitaDe: 'sol', futuro: true },
  marte: { nombre: 'Marte', gravedad: 0.38, atmosfera: 'fina', tipo: 'planeta', orbitaDe: 'sol', futuro: true },
  jupiter: { nombre: 'Júpiter', gravedad: 2.53, atmosfera: 'gas', tipo: 'gigante', orbitaDe: 'sol', futuro: true },
  europa: { nombre: 'Europa', gravedad: 0.134, atmosfera: false, tipo: 'satelite', orbitaDe: 'jupiter', futuro: true },
};

// tipo de cielo: 'atmosfera' (día y noche), 'vacio' (negro con estrellas), 'cueva' (sin cielo)
export const DIMENSIONES = {
  superficie: {
    nombre: 'Superficie', cuerpo: 'tierra', generador: 'tierra', cielo: 'atmosfera', ciclo: true,
    gravedad: 1, respirable: true, mobs: 'normal', radio: 1, fondo: '#9bd0ff', musica: 'normal',
    reglas: { cohete: true, vuelo: true },
  },
  luna: {
    nombre: 'Luna', cuerpo: 'luna', generador: 'luna', cielo: 'vacio', ciclo: true, cicloDias: 4,
    gravedad: 0.165, respirable: false, mobs: [], radio: 0.8, fondo: '#000000', musica: 'espacio',
    tierraVisible: true, reglas: { cohete: false, vuelo: true },
  },
  orbita: {
    nombre: 'Órbita terrestre', cuerpo: 'tierra', generador: 'orbita', cielo: 'vacio', ciclo: true, cicloDias: 0.8,
    gravedad: 0, respirable: false, mobs: [], radio: 0.7, fondo: '#000000', musica: 'espacio',
    tierraGrande: true, reglas: { cohete: false, vuelo: true },
  },
  abismo: {
    nombre: 'Abismo', cuerpo: 'abismo', generador: 'abismo', cielo: 'cueva', ciclo: false,
    gravedad: 1, respirable: true, mobs: ['diablillo', 'ascua'], radio: 0.7, fondo: '#3a0d06', musica: 'cueva',
    niebla: '#4a1208', brillo: 0.55, reglas: { cohete: false, vuelo: true },
  },
};

export const DIM_DEFECTO = 'superficie';
export const IDS_DIM = Object.keys(DIMENSIONES);

export const esDimension = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(DIMENSIONES, id);
export const datosDim = (id) => DIMENSIONES[esDimension(id) ? id : DIM_DEFECTO];
export const cuerpoDe = (id) => CUERPOS[datosDim(id).cuerpo];
export const dimensionesDe = (cuerpo) => IDS_DIM.filter((d) => DIMENSIONES[d].cuerpo === cuerpo);
export const cuerposFuturos = () => Object.keys(CUERPOS).filter((c) => CUERPOS[c].futuro);

// Viajes permitidos: cómo se llega de una dimensión a otra
export const RUTAS = {
  superficie: { orbita: 'cohete', abismo: 'portal' },
  orbita: { superficie: 'consola', luna: 'consola' },
  luna: { orbita: 'consola' },
  abismo: { superficie: 'portal' },
};
export const hayRuta = (de, a) => !!(RUTAS[de] && RUTAS[de][a]);
export const destinosDe = (de) => Object.keys(RUTAS[de] || {});

// Escala de coordenadas al cruzar un portal (el Abismo es más chico: 1 bloque allá = 4 acá)
export function posicionDestino(x, z, de, a) {
  if (de === 'superficie' && a === 'abismo') return [Math.floor(x / 4), Math.floor(z / 4)];
  if (de === 'abismo' && a === 'superficie') return [Math.floor(x * 4), Math.floor(z * 4)];
  return [Math.floor(x), Math.floor(z)];
}

// Duración (en días del juego) de un ciclo de Sol en esa dimensión
export const cicloDias = (id) => datosDim(id).cicloDias || 1;
