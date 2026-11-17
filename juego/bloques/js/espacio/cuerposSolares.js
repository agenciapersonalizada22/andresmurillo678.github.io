// =============================================================
//  🪐  CUERPOS Y DIMENSIONES DEL SISTEMA SOLAR (solo datos)
//  Cada dimensión es un paquete: generador de terreno, cielo, gravedad,
//  reglas de supervivencia (amb) y presupuesto de chunks (radio).
//  amb: temp [día, noche] °C · rad (0..3) · pres (bar) · req = nivel mínimo
//  de mejora del traje { t: térmico, r: anti-radiación, p: anti-presión }.
//  entrada = nivel de escudo térmico de la nave para descender.
//  Las gravedades de Júpiter y Neptuno están suavizadas para que se pueda saltar.
// =============================================================
const base = { ciclo: true, respirable: false, mobs: [], fondo: '#000000', musica: 'espacio', reglas: { cohete: false, vuelo: true } };
const col = (arribaD, horD, arribaN, horN, tinte, extra = {}) => ({ dia: [arribaD, horD], noche: [arribaN, horN], tinte, ...extra });

export const CUERPOS_SOLARES = {
  sol: { nombre: 'Sol', gravedad: 28, atmosfera: 'plasma', tipo: 'estrella', orbitaDe: null, peligro: true },
  mercurio: { nombre: 'Mercurio', gravedad: 0.38, atmosfera: false, tipo: 'planeta', orbitaDe: 'sol' },
  venus: { nombre: 'Venus', gravedad: 0.9, atmosfera: 'densa', tipo: 'planeta', orbitaDe: 'sol' },
  marte: { nombre: 'Marte', gravedad: 0.38, atmosfera: 'fina', tipo: 'planeta', orbitaDe: 'sol' },
  fobos: { nombre: 'Fobos', gravedad: 0.04, atmosfera: false, tipo: 'asteroide', orbitaDe: 'marte' },
  deimos: { nombre: 'Deimos', gravedad: 0.03, atmosfera: false, tipo: 'asteroide', orbitaDe: 'marte' },
  cinturon: { nombre: 'Cinturón de asteroides', gravedad: 0.02, atmosfera: false, tipo: 'cinturon', orbitaDe: 'sol' },
  jupiter: { nombre: 'Júpiter', gravedad: 1.3, atmosfera: 'gas', tipo: 'gigante', orbitaDe: 'sol' },
  io: { nombre: 'Ío', gravedad: 0.18, atmosfera: false, tipo: 'satelite', orbitaDe: 'jupiter' },
  europa: { nombre: 'Europa', gravedad: 0.134, atmosfera: false, tipo: 'satelite', orbitaDe: 'jupiter' },
  ganimedes: { nombre: 'Ganímedes', gravedad: 0.146, atmosfera: false, tipo: 'satelite', orbitaDe: 'jupiter' },
  calisto: { nombre: 'Calisto', gravedad: 0.126, atmosfera: false, tipo: 'satelite', orbitaDe: 'jupiter' },
  saturno: { nombre: 'Saturno', gravedad: 0.1, atmosfera: 'gas', tipo: 'gigante', orbitaDe: 'sol' },
  titan: { nombre: 'Titán', gravedad: 0.14, atmosfera: 'densa', tipo: 'satelite', orbitaDe: 'saturno' },
  urano: { nombre: 'Urano', gravedad: 0.85, atmosfera: 'gas', tipo: 'gigante', orbitaDe: 'sol' },
  neptuno: { nombre: 'Neptuno', gravedad: 1.0, atmosfera: 'gas', tipo: 'gigante', orbitaDe: 'sol' },
  pluton: { nombre: 'Plutón', gravedad: 0.063, atmosfera: 'fina', tipo: 'planeta enano', orbitaDe: 'sol' },
  kuiper: { nombre: 'Cinturón de Kuiper', gravedad: 0.05, atmosfera: false, tipo: 'cinturon', orbitaDe: 'sol' },
  transito: { nombre: 'En tránsito', gravedad: 0.5, atmosfera: true, tipo: 'nave', orbitaDe: null },
};

export const DIMENSIONES_SOLARES = {
  mercurio: {
    ...base, nombre: 'Mercurio', cuerpo: 'mercurio', generador: 'mercurio', cielo: 'vacio', cicloDias: 5, gravedad: 0.38, radio: 0.85,
    amb: { temp: [430, -180], rad: 0.35, pres: 0, req: { t: 2, r: 1, p: 0 }, nota: 'Calor y frío extremos, sin atmósfera' }, entrada: 0,
  },
  venus: {
    ...base, nombre: 'Venus', cuerpo: 'venus', generador: 'venus', cielo: 'color', cicloDias: 6, gravedad: 0.9, radio: 0.7, fondo: '#b8742a',
    cieloColor: col('#b8742a', '#e6b768', '#2a1608', '#4a2a10', [1, 0.78, 0.5], { estrellas: false, niebla: [0.1, 0.5] }),
    amb: { temp: [465, 465], rad: 0.05, pres: 92, req: { t: 3, r: 0, p: 3 }, nota: 'Atmósfera ácida, 92 bar y 465 °C' }, atm: 'densa', entrada: 3,
  },
  marte: {
    ...base, nombre: 'Marte', cuerpo: 'marte', generador: 'marte', cielo: 'color', cicloDias: 1.03, gravedad: 0.38, radio: 0.85, fondo: '#a9805c',
    cieloColor: col('#a9805c', '#d9a77a', '#0a0608', '#2a1710', [1, 0.88, 0.72], { niebla: [1.0, 1.1] }),
    amb: { temp: [20, -80], rad: 0.2, pres: 0.006, req: { t: 1, r: 1, p: 1 }, nota: 'Aire casi inexistente y mucho frío' }, atm: 'fina', tormenta: 'polvo', entrada: 1,
  },
  fobos: {
    ...base, nombre: 'Fobos', cuerpo: 'fobos', generador: 'fobos', cielo: 'vacio', cicloDias: 0.3, gravedad: 0.04, radio: 0.7,
    amb: { temp: [-4, -112], rad: 0.2, pres: 0, req: { t: 1, r: 1, p: 0 }, nota: 'Asteroide diminuto: gravedad casi nula' }, cuerpoGrande: 'marte', entrada: 0,
  },
  deimos: {
    ...base, nombre: 'Deimos', cuerpo: 'deimos', generador: 'deimos', cielo: 'vacio', cicloDias: 0.6, gravedad: 0.03, radio: 0.7,
    amb: { temp: [-4, -112], rad: 0.2, pres: 0, req: { t: 1, r: 1, p: 0 }, nota: 'Asteroide diminuto: gravedad casi nula' }, cuerpoGrande: 'marte', entrada: 0,
  },
  cinturon: {
    ...base, nombre: 'Cinturón de asteroides', cuerpo: 'cinturon', generador: 'cinturon', cielo: 'vacio', cicloDias: 2, gravedad: 0.02, radio: 0.6,
    amb: { temp: [-60, -110], rad: 0.25, pres: 0, req: { t: 1, r: 1, p: 0 }, nota: 'Rocas flotando en el vacío' }, entrada: 0,
  },
  jupiter: {
    ...base, nombre: 'Júpiter', cuerpo: 'jupiter', generador: 'jupiter', cielo: 'color', cicloDias: 0.5, gravedad: 1.3, radio: 0.75, fondo: '#b98a5a',
    cieloColor: col('#b98a5a', '#e8c89a', '#1a0f08', '#2a1810', [1, 0.85, 0.65], { niebla: [0.9, 1.1] }),
    amb: { temp: [-110, -110], rad: 1.0, pres: 2, req: { t: 1, r: 3, p: 2 }, nota: 'Sin superficie: plataformas flotantes, tormentas y radiación' },
    atm: 'gas', tormenta: 'rayos', viento: 3, entrada: 2,
  },
  io: {
    ...base, nombre: 'Ío', cuerpo: 'io', generador: 'io', cielo: 'vacio', cicloDias: 1.8, gravedad: 0.18, radio: 0.8, cuerpoGrande: 'jupiter',
    amb: { temp: [-130, -170], rad: 3, pres: 0, req: { t: 2, r: 3, p: 0 }, nota: 'Volcanes de azufre y radiación de Júpiter' }, entrada: 0,
  },
  europa: {
    ...base, nombre: 'Europa', cuerpo: 'europa', generador: 'europa', cielo: 'vacio', cicloDias: 3.5, gravedad: 0.134, radio: 0.65, cuerpoGrande: 'jupiter',
    amb: { temp: [-160, -190], rad: 2, pres: 0, req: { t: 2, r: 2, p: 0 }, nota: 'Hielo sobre un océano oculto' }, entrada: 0,
  },
  ganimedes: {
    ...base, nombre: 'Ganímedes', cuerpo: 'ganimedes', generador: 'ganimedes', cielo: 'vacio', cicloDias: 7, gravedad: 0.146, radio: 0.8, cuerpoGrande: 'jupiter',
    amb: { temp: [-110, -190], rad: 1, pres: 0, req: { t: 2, r: 1, p: 0 }, nota: 'La luna más grande del sistema' }, entrada: 0,
  },
  calisto: {
    ...base, nombre: 'Calisto', cuerpo: 'calisto', generador: 'calisto', cielo: 'vacio', cicloDias: 8, gravedad: 0.126, radio: 0.8, cuerpoGrande: 'jupiter',
    amb: { temp: [-110, -190], rad: 0.1, pres: 0, req: { t: 2, r: 0, p: 0 }, nota: 'Superficie antigua llena de cráteres' }, entrada: 0,
  },
  saturno: {
    ...base, nombre: 'Anillos de Saturno', cuerpo: 'saturno', generador: 'saturno', cielo: 'vacio', cicloDias: 0.45, gravedad: 0.1, radio: 0.7, cuerpoGrande: 'saturno',
    amb: { temp: [-180, -190], rad: 0.1, pres: 0, req: { t: 2, r: 0, p: 0 }, nota: 'Bloques de hielo flotando en órbita' }, entrada: 0,
  },
  titan: {
    ...base, nombre: 'Titán', cuerpo: 'titan', generador: 'titan', cielo: 'color', cicloDias: 6, gravedad: 0.14, radio: 0.8, fondo: '#a8601f',
    cieloColor: col('#a8601f', '#d89a4a', '#1a0e05', '#2a1a0a', [1, 0.74, 0.42], { estrellas: false, niebla: [0.5, 1.0] }),
    amb: { temp: [-179, -179], rad: 0.05, pres: 1.45, req: { t: 2, r: 0, p: 1 }, nota: 'Lagos de metano y neblina naranja' }, atm: 'densa', entrada: 2,
  },
  urano: {
    ...base, nombre: 'Urano', cuerpo: 'urano', generador: 'urano', cielo: 'color', cicloDias: 0.7, gravedad: 0.85, radio: 0.75, fondo: '#5ab8c8',
    cieloColor: col('#5ab8c8', '#a8e8ee', '#05161a', '#0a2a30', [0.85, 1, 1], { niebla: [0.9, 1.1] }),
    amb: { temp: [-216, -216], rad: 0.5, pres: 1.5, req: { t: 3, r: 1, p: 2 }, nota: 'Gigante helado: vientos fríos y plataformas de hielo' }, atm: 'gas', viento: 3.5, entrada: 2,
  },
  neptuno: {
    ...base, nombre: 'Neptuno', cuerpo: 'neptuno', generador: 'neptuno', cielo: 'color', cicloDias: 0.67, gravedad: 1.0, radio: 0.75, fondo: '#1e46b8',
    cieloColor: col('#1e46b8', '#5a8ae8', '#040a22', '#0a1a50', [0.8, 0.9, 1], { niebla: [0.9, 1.1] }),
    amb: { temp: [-214, -214], rad: 0.5, pres: 1.5, req: { t: 3, r: 1, p: 2 }, nota: 'Vientos supersónicos sobre plataformas de hielo' }, atm: 'gas', viento: 5, entrada: 2,
  },
  pluton: {
    ...base, nombre: 'Plutón', cuerpo: 'pluton', generador: 'pluton', cielo: 'vacio', cicloDias: 6, gravedad: 0.063, radio: 0.8,
    amb: { temp: [-229, -233], rad: 0, pres: 0, req: { t: 3, r: 0, p: 0 }, nota: 'Llanuras de nitrógeno helado' }, entrada: 0,
  },
  kuiper: {
    ...base, nombre: 'Cinturón de Kuiper', cuerpo: 'kuiper', generador: 'kuiper', cielo: 'vacio', cicloDias: 4, gravedad: 0.05, radio: 0.6,
    amb: { temp: [-233, -240], rad: 0.1, pres: 0, req: { t: 3, r: 0, p: 0 }, nota: 'Cuerpos helados en la oscuridad' }, entrada: 0,
  },
  orbita_luna: {
    ...base, nombre: 'Estación lunar', cuerpo: 'luna', generador: 'orbita_luna', cielo: 'vacio', cicloDias: 0.8, gravedad: 0, radio: 0.7, cuerpoGrande: 'luna', estacion: true,
    amb: { temp: [-20, -20], rad: 0.1, pres: 0, req: { t: 0, r: 0, p: 0 }, nota: 'Estación de reabastecimiento' }, entrada: 0,
  },
  orbita_marte: {
    ...base, nombre: 'Estación marciana', cuerpo: 'marte', generador: 'orbita_marte', cielo: 'vacio', cicloDias: 0.8, gravedad: 0, radio: 0.7, cuerpoGrande: 'marte', estacion: true,
    amb: { temp: [-20, -20], rad: 0.2, pres: 0, req: { t: 0, r: 0, p: 0 }, nota: 'Estación de reabastecimiento' }, entrada: 0,
  },
  orbita_jupiter: {
    ...base, nombre: 'Estación joviana', cuerpo: 'jupiter', generador: 'orbita_jupiter', cielo: 'vacio', cicloDias: 0.8, gravedad: 0, radio: 0.7, cuerpoGrande: 'jupiter', estacion: true,
    amb: { temp: [-100, -100], rad: 1.2, pres: 0, req: { t: 1, r: 2, p: 0 }, nota: 'Estación de reabastecimiento' }, entrada: 0,
  },
  transito: {
    ...base, nombre: 'Nave en tránsito', cuerpo: 'transito', generador: 'transito', cielo: 'vacio', cicloDias: 1, gravedad: 0.5, respirable: true, radio: 0.5,
    amb: { temp: [20, 20], rad: 0, pres: 1, req: { t: 0, r: 0, p: 0 }, nota: 'Cabina presurizada' }, entrada: 0,
  },
};

// Cómo se desciende a cada cuerpo desde su órbita (ids de dimensión)
export const ATERRIZAJES = {
  tierra: ['orbita'], luna: ['luna', 'orbita_luna'], mercurio: ['mercurio'], venus: ['venus'], marte: ['marte', 'orbita_marte'], fobos: ['fobos'], deimos: ['deimos'],
  cinturon: ['cinturon'], jupiter: ['jupiter', 'orbita_jupiter'], io: ['io'], europa: ['europa'], ganimedes: ['ganimedes'], calisto: ['calisto'],
  saturno: ['saturno'], titan: ['titan'], urano: ['urano'], neptuno: ['neptuno'], pluton: ['pluton'], kuiper: ['kuiper'],
};
export const NOMBRE_ATERRIZAJE = { orbita: 'Estación orbital terrestre', orbita_luna: 'Estación lunar', orbita_marte: 'Estación marciana', orbita_jupiter: 'Estación joviana' };
