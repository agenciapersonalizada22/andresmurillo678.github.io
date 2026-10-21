// =============================================================
//  🧱  TIPOS DE BLOQUE
//  Aquí está la lista de todos los bloques del juego.
//  - nombre:   lo que se lee en la barra y en el inventario
//  - dibujo:   'solido' (cubo normal), 'recorte' (cubo con huequitos:
//              hojas y vidrio), 'agua' (se ve a través) o 'planta'
//              (dos planitos cruzados, como las flores)
//  - caras:    textura de arriba, de los lados y de abajo
//              (los nombres vienen de texturas.js)
//  - sonido:   qué ruido hace al romperlo/ponerlo
//  - enMenu:   si aparece en el inventario para construir
//  - orden:    (opcional) en qué lugar sale en el inventario
//
//  Hay dos aguas: la del mar (no se puede señalar con la mira, así
//  puedes romper el fondo a través de ella, y llena los huecos que
//  haces junto a ella) y el agua que tú pones (se queda quieta, no
//  se riega, y la puedes quitar con clic izquierdo como cualquier
//  otro bloque).
// =============================================================
import { indiceTextura } from './texturas.js';

export const B = {
  AIRE: 0, PASTO: 1, TIERRA: 2, PIEDRA: 3, ADOQUIN: 4, ARENA: 5, GRAVA: 6, AGUA: 7,
  TRONCO: 8, HOJAS: 9, TABLAS: 10, VIDRIO: 11, LADRILLO: 12, LADRILLO_PIEDRA: 13, NIEVE: 14,
  CARBON: 15, HIERRO: 16, ORO: 17, LECHO: 18, FLOR_ROJA: 19, FLOR_AMARILLA: 20, PASTO_ALTO: 21,
  LANA_BLANCA: 22, LANA_ROJA: 23, LANA_NARANJA: 24, LANA_AMARILLA: 25, LANA_VERDE: 26,
  LANA_AZUL: 27, LANA_MORADA: 28, LANA_ROSA: 29, CALABAZA: 30, AGUA_PUESTA: 31,
  ARENISCA: 32, ADOQUIN_MUSGOSO: 33, OBSIDIANA: 34, HIELO: 35, LANA_NEGRA: 36, LANA_GRIS: 37, TABLAS_OSCURAS: 38,
};

const solo = (t) => [t, t, t];

export const BLOQUES = [
  { id: B.AIRE, clave: 'aire', nombre: 'Aire', dibujo: 'aire' },
  { id: B.PASTO, clave: 'pasto', nombre: 'Pasto', dibujo: 'solido', caras: ['pasto_arriba', 'pasto_lado', 'tierra'], sonido: 'tierra', enMenu: true },
  { id: B.TIERRA, clave: 'tierra', nombre: 'Tierra', dibujo: 'solido', caras: solo('tierra'), sonido: 'tierra', enMenu: true },
  { id: B.PIEDRA, clave: 'piedra', nombre: 'Piedra', dibujo: 'solido', caras: solo('piedra'), sonido: 'piedra', enMenu: true },
  { id: B.ADOQUIN, clave: 'adoquin', nombre: 'Adoquín', dibujo: 'solido', caras: solo('adoquin'), sonido: 'piedra', enMenu: true },
  { id: B.ARENA, clave: 'arena', nombre: 'Arena', dibujo: 'solido', caras: solo('arena'), sonido: 'arena', enMenu: true },
  { id: B.GRAVA, clave: 'grava', nombre: 'Grava', dibujo: 'solido', caras: solo('grava'), sonido: 'arena', enMenu: true },
  { id: B.AGUA, clave: 'agua', nombre: 'Agua del mar', dibujo: 'agua', caras: solo('agua'), sonido: 'agua' },
  { id: B.TRONCO, clave: 'tronco', nombre: 'Tronco', dibujo: 'solido', caras: ['tronco_arriba', 'tronco_lado', 'tronco_arriba'], sonido: 'madera', enMenu: true },
  { id: B.HOJAS, clave: 'hojas', nombre: 'Hojas', dibujo: 'recorte', caras: solo('hojas'), sonido: 'hojas', enMenu: true },
  { id: B.TABLAS, clave: 'tablas', nombre: 'Tablas de madera', dibujo: 'solido', caras: solo('tablas'), sonido: 'madera', enMenu: true },
  { id: B.VIDRIO, clave: 'vidrio', nombre: 'Vidrio', dibujo: 'recorte', caras: solo('vidrio'), sonido: 'vidrio', enMenu: true },
  { id: B.LADRILLO, clave: 'ladrillo', nombre: 'Ladrillo', dibujo: 'solido', caras: solo('ladrillo'), sonido: 'piedra', enMenu: true },
  { id: B.LADRILLO_PIEDRA, clave: 'ladrillo_piedra', nombre: 'Ladrillo de piedra', dibujo: 'solido', caras: solo('ladrillo_piedra'), sonido: 'piedra', enMenu: true },
  { id: B.NIEVE, clave: 'nieve', nombre: 'Nieve', dibujo: 'solido', caras: solo('nieve'), sonido: 'arena', enMenu: true },
  { id: B.CARBON, clave: 'carbon', nombre: 'Mineral de carbón', dibujo: 'solido', caras: solo('carbon'), sonido: 'piedra', enMenu: true },
  { id: B.HIERRO, clave: 'hierro', nombre: 'Mineral de hierro', dibujo: 'solido', caras: solo('hierro'), sonido: 'piedra', enMenu: true },
  { id: B.ORO, clave: 'oro', nombre: 'Mineral de oro', dibujo: 'solido', caras: solo('oro'), sonido: 'piedra', enMenu: true },
  { id: B.LECHO, clave: 'lecho', nombre: 'Roca del fondo', dibujo: 'solido', caras: solo('lecho'), sonido: 'piedra', irrompible: true },
  { id: B.FLOR_ROJA, clave: 'flor_roja', nombre: 'Flor roja', dibujo: 'planta', caras: solo('flor_roja'), sonido: 'hojas', enMenu: true },
  { id: B.FLOR_AMARILLA, clave: 'flor_amarilla', nombre: 'Flor amarilla', dibujo: 'planta', caras: solo('flor_amarilla'), sonido: 'hojas', enMenu: true },
  { id: B.PASTO_ALTO, clave: 'pasto_alto', nombre: 'Pasto alto', dibujo: 'planta', caras: solo('pasto_alto'), sonido: 'hojas', enMenu: true },
  { id: B.LANA_BLANCA, clave: 'lana_blanca', nombre: 'Bloque blanco', dibujo: 'solido', caras: solo('lana_blanca'), sonido: 'lana', enMenu: true },
  { id: B.LANA_ROJA, clave: 'lana_roja', nombre: 'Bloque rojo', dibujo: 'solido', caras: solo('lana_roja'), sonido: 'lana', enMenu: true },
  { id: B.LANA_NARANJA, clave: 'lana_naranja', nombre: 'Bloque naranja', dibujo: 'solido', caras: solo('lana_naranja'), sonido: 'lana', enMenu: true },
  { id: B.LANA_AMARILLA, clave: 'lana_amarilla', nombre: 'Bloque amarillo', dibujo: 'solido', caras: solo('lana_amarilla'), sonido: 'lana', enMenu: true },
  { id: B.LANA_VERDE, clave: 'lana_verde', nombre: 'Bloque verde', dibujo: 'solido', caras: solo('lana_verde'), sonido: 'lana', enMenu: true },
  { id: B.LANA_AZUL, clave: 'lana_azul', nombre: 'Bloque azul', dibujo: 'solido', caras: solo('lana_azul'), sonido: 'lana', enMenu: true },
  { id: B.LANA_MORADA, clave: 'lana_morada', nombre: 'Bloque morado', dibujo: 'solido', caras: solo('lana_morada'), sonido: 'lana', enMenu: true },
  { id: B.LANA_ROSA, clave: 'lana_rosa', nombre: 'Bloque rosa', dibujo: 'solido', caras: solo('lana_rosa'), sonido: 'lana', enMenu: true },
  { id: B.CALABAZA, clave: 'calabaza', nombre: 'Calabaza', dibujo: 'solido', caras: solo('calabaza'), sonido: 'madera', enMenu: true },
  { id: B.AGUA_PUESTA, clave: 'agua_puesta', nombre: 'Agua', dibujo: 'agua', caras: solo('agua'), sonido: 'agua', enMenu: true, orden: B.AGUA },
  { id: B.ARENISCA, clave: 'arenisca', nombre: 'Arenisca', dibujo: 'solido', caras: ['arenisca_arriba', 'arenisca_lado', 'arenisca_arriba'], sonido: 'piedra', enMenu: true },
  { id: B.ADOQUIN_MUSGOSO, clave: 'adoquin_musgoso', nombre: 'Adoquín con musgo', dibujo: 'solido', caras: solo('adoquin_musgoso'), sonido: 'piedra', enMenu: true },
  { id: B.OBSIDIANA, clave: 'obsidiana', nombre: 'Obsidiana', dibujo: 'solido', caras: solo('obsidiana'), sonido: 'piedra', enMenu: true },
  { id: B.HIELO, clave: 'hielo', nombre: 'Hielo', dibujo: 'solido', caras: solo('hielo'), sonido: 'vidrio', enMenu: true },
  { id: B.LANA_NEGRA, clave: 'lana_negra', nombre: 'Bloque negro', dibujo: 'solido', caras: solo('lana_negra'), sonido: 'lana', enMenu: true },
  { id: B.LANA_GRIS, clave: 'lana_gris', nombre: 'Bloque gris', dibujo: 'solido', caras: solo('lana_gris'), sonido: 'lana', enMenu: true },
  { id: B.TABLAS_OSCURAS, clave: 'tablas_oscuras', nombre: 'Tablas oscuras', dibujo: 'solido', caras: solo('tablas_oscuras'), sonido: 'madera', enMenu: true },
];

// ----------------------------------------------------------- Tablas rápidas
// (se usan miles de veces por segundo, por eso son arreglos simples)
export const DIBUJO_AIRE = 0, DIBUJO_SOLIDO = 1, DIBUJO_RECORTE = 2, DIBUJO_AGUA = 3, DIBUJO_PLANTA = 4;
const CODIGO_DIBUJO = { aire: 0, solido: 1, recorte: 2, agua: 3, planta: 4 };

export const DIBUJO = new Uint8Array(256);      // cómo se dibuja
export const SOLIDO = new Uint8Array(256);      // 1 = choca contigo
export const OPACO = new Uint8Array(256);       // 1 = tapa por completo al vecino
export const SOMBREA = new Uint8Array(256);     // 1 = hace sombrita en las esquinas
export const APUNTABLE = new Uint8Array(256);   // 1 = se puede señalar con la mira
// Textura de cada cara: índice [id * 6 + cara], caras: 0 +X, 1 -X, 2 arriba, 3 abajo, 4 +Z, 5 -Z
export const TEXTURA_CARA = new Int16Array(256 * 6);

export const POR_CLAVE = {};

for (const b of BLOQUES) {
  const d = CODIGO_DIBUJO[b.dibujo];
  DIBUJO[b.id] = d;
  SOLIDO[b.id] = d === DIBUJO_SOLIDO || d === DIBUJO_RECORTE ? 1 : 0;
  OPACO[b.id] = d === DIBUJO_SOLIDO ? 1 : 0;
  SOMBREA[b.id] = d === DIBUJO_SOLIDO || b.id === B.HOJAS ? 1 : 0;
  APUNTABLE[b.id] = d === DIBUJO_SOLIDO || d === DIBUJO_RECORTE || d === DIBUJO_PLANTA || b.id === B.AGUA_PUESTA ? 1 : 0;
  POR_CLAVE[b.clave] = b.id;
  if (b.caras) {
    const [arriba, lado, abajo] = b.caras.map(indiceTextura);
    TEXTURA_CARA[b.id * 6 + 0] = lado;
    TEXTURA_CARA[b.id * 6 + 1] = lado;
    TEXTURA_CARA[b.id * 6 + 2] = arriba;
    TEXTURA_CARA[b.id * 6 + 3] = abajo;
    TEXTURA_CARA[b.id * 6 + 4] = lado;
    TEXTURA_CARA[b.id * 6 + 5] = lado;
  }
}

export const EN_MENU = BLOQUES.filter((b) => b.enMenu)
  .sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id)
  .map((b) => b.id);

export function nombreBloque(id) {
  return (BLOQUES[id] && BLOQUES[id].nombre) || '?';
}

export function sonidoBloque(id) {
  return (BLOQUES[id] && BLOQUES[id].sonido) || 'piedra';
}

export function esIrrompible(id) {
  return !!(BLOQUES[id] && BLOQUES[id].irrompible);
}

export function esValido(id) {
  return Number.isInteger(id) && id > 0 && id < BLOQUES.length;
}
