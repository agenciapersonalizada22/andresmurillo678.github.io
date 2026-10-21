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
  // ---- estructuras y decoración
  CAMINO: 39, CULTIVO: 40, TRIGO: 41, PAJA: 42, ESTANTERIA: 43, PIEDRA_LUMINOSA: 44, ANTORCHA: 45,
  COFRE: 46, // 46..49 (una por lado al que mira)
  PUERTA_X: 50, PUERTA_Z: 51, PUERTA_X_ABIERTA: 52, PUERTA_Z_ABIERTA: 53,
  CAMA_PIE: 54, // 54..57
  CAMA_CABEZA: 58, // 58..61
  MESA: 62, VALLA: 63,
  ESCALERA_TABLAS: 64, // 64..67
  ESCALERA_ADOQUIN: 68, // 68..71
  LOSA_TABLAS: 72, LOSA_ADOQUIN: 73, RIEL_X: 74, RIEL_Z: 75, CACTUS: 76, ARBUSTO_MUERTO: 77,
  TRONCO_ABETO: 78, HOJAS_ABETO: 79, TRONCO_ABEDUL: 80, HOJAS_ABEDUL: 81,
  TERRACOTA_NARANJA: 82, TERRACOTA_AZUL: 83, TERRACOTA_BLANCA: 84,
  LADRILLO_MUSGOSO: 85, LADRILLO_AGRIETADO: 86, ARENISCA_CINCELADA: 87, MESA_TRABAJO: 88, HORNO: 89,
  TABLAS_ABETO: 90, PIEDRA_PULIDA: 91,
  ESCALERA_ARENISCA: 92, // 92..95
  LOSA_ARENISCA: 96,
  ESCALERA_LADRILLO: 97, // 97..100
  ESCALERA_TABLAS_OSCURAS: 101, // 101..104
  TEJAS: 105, CRISTAL_OSCURO: 106,
  ESCALERA_TEJAS: 107, // 107..110
  LOSA_TEJAS: 111,
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


// ----------------------------------------------------------- Bloques nuevos
// Los que miran hacia un lado se guardan como 4 bloques (uno por lado):
// "f" = 0 sur (+Z), 1 oeste (-X), 2 norte (-Z), 3 este (+X).
export const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
export const CARA_DE_DIR = [4, 1, 5, 0]; // índice de cara (+X,-X,arriba,abajo,+Z,-Z) hacia donde mira cada f
export const ORIENTADOS = {};            // id base -> [id f0, f1, f2, f3]

const def = (id, o) => { BLOQUES[id] = { id, ...o }; };
const cubo = (id, clave, nombre, caras, sonido, extra = {}) =>
  def(id, { clave, nombre, dibujo: 'solido', caras, sonido, enMenu: true, ...extra });

cubo(B.CAMINO, 'camino', 'Camino de tierra', ['camino_arriba', 'camino_lado', 'tierra'], 'tierra');
cubo(B.CULTIVO, 'cultivo', 'Tierra de cultivo', ['cultivo_arriba', 'tierra', 'tierra'], 'tierra');
def(B.TRIGO, { clave: 'trigo', nombre: 'Trigo', dibujo: 'planta', caras: solo('trigo'), sonido: 'hojas', enMenu: true });
cubo(B.PAJA, 'paja', 'Paca de paja', ['paja_arriba', 'paja_lado', 'paja_arriba'], 'hojas');
cubo(B.ESTANTERIA, 'estanteria', 'Estantería', ['tablas', 'estanteria', 'tablas'], 'madera');
cubo(B.PIEDRA_LUMINOSA, 'piedra_luminosa', 'Piedra luminosa', solo('piedra_luminosa'), 'vidrio', { emision: 15 });
def(B.ANTORCHA, { clave: 'antorcha', nombre: 'Antorcha', dibujo: 'modelo', forma: 'antorcha', solido: false, caras: solo('antorcha'), plano: true, sonido: 'madera', enMenu: true, emision: 14 });

// Cofres: la cara de enfrente es distinta
for (let f = 0; f < 4; f++) {
  def(B.COFRE + f, { clave: 'cofre' + f, nombre: 'Cofre', dibujo: 'modelo', forma: 'cofre', solido: true,
    caras: ['cofre_arriba', 'cofre_lado', 'cofre_arriba'], frente: f, textFrente: 'cofre_frente', sonido: 'madera', enMenu: f === 0, usable: 'cofre' });
}
ORIENTADOS[B.COFRE] = [0, 1, 2, 3].map((f) => B.COFRE + f);

// Puertas (de 2 bloques de alto). El eje es a lo largo de la pared.
def(B.PUERTA_X, { clave: 'puerta_x', nombre: 'Puerta', dibujo: 'modelo', forma: 'puerta', eje: 'x', abierta: false, solido: true, caras: ['puerta_abajo', 'puerta_abajo', 'puerta_abajo'], plano: true, sonido: 'madera', enMenu: true, usable: 'puerta' });
def(B.PUERTA_Z, { clave: 'puerta_z', nombre: 'Puerta', dibujo: 'modelo', forma: 'puerta', eje: 'z', abierta: false, solido: true, caras: ['puerta_abajo', 'puerta_abajo', 'puerta_abajo'], sonido: 'madera', usable: 'puerta' });
def(B.PUERTA_X_ABIERTA, { clave: 'puerta_x_abierta', nombre: 'Puerta', dibujo: 'modelo', forma: 'puerta', eje: 'x', abierta: true, solido: false, caras: ['puerta_abajo', 'puerta_abajo', 'puerta_abajo'], sonido: 'madera', usable: 'puerta' });
def(B.PUERTA_Z_ABIERTA, { clave: 'puerta_z_abierta', nombre: 'Puerta', dibujo: 'modelo', forma: 'puerta', eje: 'z', abierta: true, solido: false, caras: ['puerta_abajo', 'puerta_abajo', 'puerta_abajo'], sonido: 'madera', usable: 'puerta' });
ORIENTADOS[B.PUERTA_X] = [B.PUERTA_X, B.PUERTA_Z, B.PUERTA_X, B.PUERTA_Z];

// Camas: dos bloques (pie y cabecera). f = hacia donde está la cabecera.
for (let f = 0; f < 4; f++) {
  def(B.CAMA_PIE + f, { clave: 'cama_pie' + f, nombre: 'Cama', dibujo: 'modelo', forma: 'cama', parte: 'pie', f, solido: true, caras: ['cama_pie', 'cama_lado', 'tablas'], sonido: 'lana', enMenu: f === 0, usable: 'cama' });
  def(B.CAMA_CABEZA + f, { clave: 'cama_cabeza' + f, nombre: 'Cama', dibujo: 'modelo', forma: 'cama', parte: 'cabeza', f, solido: true, caras: ['cama_cabeza', 'cama_lado', 'tablas'], sonido: 'lana', usable: 'cama' });
}
ORIENTADOS[B.CAMA_PIE] = [0, 1, 2, 3].map((f) => B.CAMA_PIE + f);
ORIENTADOS[B.CAMA_CABEZA] = [0, 1, 2, 3].map((f) => B.CAMA_CABEZA + f); // (las estructuras necesitan girar las dos partes)

def(B.MESA, { clave: 'mesa', nombre: 'Mesa', dibujo: 'modelo', forma: 'mesa', solido: true, caras: ['mesa_arriba', 'tablas', 'tablas'], sonido: 'madera', enMenu: true });
def(B.VALLA, { clave: 'valla', nombre: 'Valla', dibujo: 'modelo', forma: 'valla', solido: true, caras: solo('tablas'), sonido: 'madera', enMenu: true });

// Escaleras y losas
const escalera = (id0, clave, nombre, tex) => {
  for (let f = 0; f < 4; f++) {
    def(id0 + f, { clave: clave + f, nombre, dibujo: 'modelo', forma: 'escalera', f, solido: true, caras: solo(tex), sonido: 'piedra', enMenu: f === 0 });
  }
  ORIENTADOS[id0] = [0, 1, 2, 3].map((f) => id0 + f);
};
escalera(B.ESCALERA_TABLAS, 'escalera_tablas', 'Escalera de madera', 'tablas');
escalera(B.ESCALERA_ADOQUIN, 'escalera_adoquin', 'Escalera de adoquín', 'adoquin');
const losa = (id, clave, nombre, tex) => def(id, { clave, nombre, dibujo: 'modelo', forma: 'losa', solido: true, caras: solo(tex), sonido: 'piedra', enMenu: true });
losa(B.LOSA_TABLAS, 'losa_tablas', 'Losa de madera', 'tablas');
losa(B.LOSA_ADOQUIN, 'losa_adoquin', 'Losa de adoquín', 'adoquin');

def(B.RIEL_X, { clave: 'riel_x', nombre: 'Riel', dibujo: 'modelo', forma: 'riel', eje: 'x', solido: false, caras: solo('riel'), plano: true, sonido: 'piedra', enMenu: true });
def(B.RIEL_Z, { clave: 'riel_z', nombre: 'Riel', dibujo: 'modelo', forma: 'riel', eje: 'z', solido: false, caras: solo('riel'), sonido: 'piedra' });
ORIENTADOS[B.RIEL_X] = [B.RIEL_Z, B.RIEL_X, B.RIEL_Z, B.RIEL_X];

def(B.CACTUS, { clave: 'cactus', nombre: 'Cactus', dibujo: 'modelo', forma: 'cactus', solido: true, caras: ['cactus_arriba', 'cactus_lado', 'cactus_arriba'], sonido: 'hojas', enMenu: true });
def(B.ARBUSTO_MUERTO, { clave: 'arbusto_muerto', nombre: 'Arbusto seco', dibujo: 'planta', caras: solo('arbusto_muerto'), sonido: 'hojas', enMenu: true });
cubo(B.TRONCO_ABETO, 'tronco_abeto', 'Tronco de abeto', ['abeto_arriba', 'abeto_lado', 'abeto_arriba'], 'madera');
def(B.HOJAS_ABETO, { clave: 'hojas_abeto', nombre: 'Hojas de abeto', dibujo: 'recorte', caras: solo('hojas_abeto'), sonido: 'hojas', enMenu: true });
cubo(B.TRONCO_ABEDUL, 'tronco_abedul', 'Tronco de abedul', ['abedul_arriba', 'abedul_lado', 'abedul_arriba'], 'madera');
def(B.HOJAS_ABEDUL, { clave: 'hojas_abedul', nombre: 'Hojas de abedul', dibujo: 'recorte', caras: solo('hojas_abedul'), sonido: 'hojas', enMenu: true });
cubo(B.TERRACOTA_NARANJA, 'terracota_naranja', 'Terracota naranja', solo('terracota_naranja'), 'piedra');
cubo(B.TERRACOTA_AZUL, 'terracota_azul', 'Terracota azul', solo('terracota_azul'), 'piedra');
cubo(B.TERRACOTA_BLANCA, 'terracota_blanca', 'Terracota blanca', solo('terracota_blanca'), 'piedra');
cubo(B.LADRILLO_MUSGOSO, 'ladrillo_musgoso', 'Ladrillo de piedra con musgo', solo('ladrillo_musgoso'), 'piedra');
cubo(B.LADRILLO_AGRIETADO, 'ladrillo_agrietado', 'Ladrillo de piedra agrietado', solo('ladrillo_agrietado'), 'piedra');
cubo(B.ARENISCA_CINCELADA, 'arenisca_cincelada', 'Arenisca cincelada', ['arenisca_cincelada', 'arenisca_cincelada', 'arenisca_cincelada'], 'piedra');
cubo(B.MESA_TRABAJO, 'mesa_trabajo', 'Mesa de trabajo', ['mesa_trabajo_arriba', 'mesa_trabajo_lado', 'tablas'], 'madera');
cubo(B.HORNO, 'horno', 'Horno', ['piedra', 'horno_lado', 'piedra'], 'piedra');
BLOQUES[B.MESA_TRABAJO].frenteTodos = 'mesa_trabajo_frente';
BLOQUES[B.HORNO].frenteTodos = 'horno_frente';
cubo(B.TABLAS_ABETO, 'tablas_abeto', 'Tablas de abeto', solo('tablas_abeto'), 'madera');
cubo(B.PIEDRA_PULIDA, 'piedra_pulida', 'Piedra pulida', solo('piedra_pulida'), 'piedra');
escalera(B.ESCALERA_ARENISCA, 'escalera_arenisca', 'Escalera de arenisca', 'arenisca_lado');
losa(B.LOSA_ARENISCA, 'losa_arenisca', 'Losa de arenisca', 'arenisca_lado');
escalera(B.ESCALERA_LADRILLO, 'escalera_ladrillo', 'Escalera de ladrillo de piedra', 'ladrillo_piedra');
escalera(B.ESCALERA_TABLAS_OSCURAS, 'escalera_oscura', 'Escalera de madera oscura', 'tablas_oscuras');
def(B.TEJAS, { clave: 'tejas', nombre: 'Tejas', dibujo: 'solido', caras: solo('tejas'), sonido: 'piedra', enMenu: true });
def(B.CRISTAL_OSCURO, { clave: 'cristal_oscuro', nombre: 'Cristal oscuro', dibujo: 'solido', caras: solo('cristal_oscuro'), sonido: 'vidrio', enMenu: true });
escalera(B.ESCALERA_TEJAS, 'escalera_tejas', 'Escalera de tejas', 'tejas');
losa(B.LOSA_TEJAS, 'losa_tejas', 'Losa de tejas', 'tejas');

// Los 4 lados de las mesas y hornos: el de enfrente es otro dibujo. Se resuelve en el mallador con "frenteTodos".

// ----------------------------------------------------------- Tablas rápidas
// (se usan miles de veces por segundo, por eso son arreglos simples)
export const DIBUJO_AIRE = 0, DIBUJO_SOLIDO = 1, DIBUJO_RECORTE = 2, DIBUJO_AGUA = 3, DIBUJO_PLANTA = 4, DIBUJO_MODELO = 5;
const CODIGO_DIBUJO = { aire: 0, solido: 1, recorte: 2, agua: 3, planta: 4, modelo: 5 };

export const DIBUJO = new Uint8Array(256);      // cómo se dibuja
export const SOLIDO = new Uint8Array(256);      // 1 = choca contigo
export const OPACO = new Uint8Array(256);       // 1 = tapa por completo al vecino
export const SOMBREA = new Uint8Array(256);     // 1 = hace sombrita en las esquinas
export const APUNTABLE = new Uint8Array(256);   // 1 = se puede señalar con la mira
export const EMISION = new Uint8Array(256);     // luz que da el bloque (0 a 15)
export const ES_HOJAS = new Uint8Array(256);    // 1 = hojas (se mecen con el viento)
export const USABLE = new Uint8Array(256);      // 1 = clic derecho lo usa (cofre, puerta, cama)
export const BASE = new Uint8Array(256);        // el bloque "madre" de sus variantes
export const FORMAS = new Array(256).fill(null); // nombre de la forma de los bloques "modelo"
// Textura de cada cara: índice [id * 6 + cara], caras: 0 +X, 1 -X, 2 arriba, 3 abajo, 4 +Z, 5 -Z
export const TEXTURA_CARA = new Int16Array(256 * 6);

export const POR_CLAVE = {};

for (const b of BLOQUES) {
  const d = CODIGO_DIBUJO[b.dibujo];
  DIBUJO[b.id] = d;
  SOLIDO[b.id] = d === DIBUJO_SOLIDO || d === DIBUJO_RECORTE || (d === DIBUJO_MODELO && b.solido) ? 1 : 0;
  OPACO[b.id] = d === DIBUJO_SOLIDO && b.id !== B.CRISTAL_OSCURO ? 1 : 0;
  SOMBREA[b.id] = d === DIBUJO_SOLIDO || b.id === B.HOJAS || b.id === B.HOJAS_ABETO || b.id === B.HOJAS_ABEDUL ? 1 : 0;
  APUNTABLE[b.id] = d === DIBUJO_SOLIDO || d === DIBUJO_RECORTE || d === DIBUJO_PLANTA || d === DIBUJO_MODELO || b.id === B.AGUA_PUESTA ? 1 : 0;
  EMISION[b.id] = b.emision || 0;
  ES_HOJAS[b.id] = b.id === B.HOJAS || b.id === B.HOJAS_ABETO || b.id === B.HOJAS_ABEDUL ? 1 : 0;
  USABLE[b.id] = b.usable ? 1 : 0;
  BASE[b.id] = b.id;
  FORMAS[b.id] = b.forma || null;
  POR_CLAVE[b.clave] = b.id;
  if (b.caras) {
    const [arriba, lado, abajo] = b.caras.map(indiceTextura);
    TEXTURA_CARA[b.id * 6 + 0] = lado;
    TEXTURA_CARA[b.id * 6 + 1] = lado;
    TEXTURA_CARA[b.id * 6 + 2] = arriba;
    TEXTURA_CARA[b.id * 6 + 3] = abajo;
    TEXTURA_CARA[b.id * 6 + 4] = lado;
    TEXTURA_CARA[b.id * 6 + 5] = lado;
    // la cara de enfrente (cofres, mesa de trabajo, horno) es otra
    if (b.textFrente) TEXTURA_CARA[b.id * 6 + CARA_DE_DIR[b.frente]] = indiceTextura(b.textFrente);
    if (b.frenteTodos) TEXTURA_CARA[b.id * 6 + 4] = indiceTextura(b.frenteTodos);
  }
}
for (const [base, lista] of Object.entries(ORIENTADOS)) for (const id of lista) if (BLOQUES[id] && true) BASE[id] = Number(base);

BASE[B.PUERTA_X_ABIERTA] = BASE[B.PUERTA_Z_ABIERTA] = B.PUERTA_X;

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
  return Number.isInteger(id) && id > 0 && id < BLOQUES.length && !!BLOQUES[id];
}

// Elige la variante de un bloque que mira hacia donde mira el jugador
// (yaw = giro de la cámara). "haciaMi" = la cara de enfrente mira al jugador.
export function orientacionDeYaw(yaw) {
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw);
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 3 : 1) : (dz > 0 ? 0 : 2);
}

export function variante(base, f) {
  const l = ORIENTADOS[base];
  return l ? l[f & 3] : base;
}
