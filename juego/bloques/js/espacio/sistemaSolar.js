// =============================================================
//  ☀️  SISTEMA SOLAR (funciones puras, sin gráficos)
//  Posiciones con elementos keplerianos simplificados (J2000, Standish):
//  sirven para ver cada planeta en su lugar real aproximado y para
//  calcular ventanas de lanzamiento. El juego NO va a escala real:
//  la distancia de viaje usa una escala comprimida (ver TABLA_DIST).
//
//  Tiempo: el año terrestre dura ANIO_JUEGO días de juego (astronomia.js),
//  así 1 día de juego = 365.25 / 24 ≈ 15.2 días reales del sistema solar.
//
//  Distancias comprimidas: dJ(r) = 100 · r^0.45 "unidades de juego" (uj)
//  con r en UA (la Tierra queda a 100 uj). Se aplica solo al radio:
//  los ángulos son los reales. Las lunas orbitan a su planeta a una
//  distancia fija pequeña (columna "orbita" en uj).
// =============================================================
import { ANIO } from './astronomia.js';

export const DIAS_REALES_POR_DIA = 365.25 / ANIO;
export const EPOCA_J2000 = 9817;      // día juliano desde J2000 que corresponde al día 0 del mundo (2026-11-17)
const RAD = Math.PI / 180;
const PI2 = Math.PI * 2;

// a (UA), e, I (°), L (° long. media), w (° long. del perihelio), O (° nodo), P (años)
export const ELEMENTOS = {
  mercurio: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, w: 77.45779628, O: 48.33076593, P: 0.2408467 },
  venus: { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, w: 131.60246718, O: 76.67984255, P: 0.61519726 },
  tierra: { a: 1.00000261, e: 0.01671123, I: 0, L: 100.46457166, w: 102.93768193, O: 0, P: 1.0000174 },
  marte: { a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891, P: 1.8808476 },
  jupiter: { a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909, P: 11.862615 },
  saturno: { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448, P: 29.447498 },
  urano: { a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, w: 170.95427630, O: 74.01692503, P: 84.016846 },
  neptuno: { a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, w: 44.96476227, O: 131.78422574, P: 164.79132 },
  pluton: { a: 39.48211675, e: 0.24882730, I: 17.14001206, L: 238.92903833, w: 224.06891629, O: 110.30393684, P: 247.92065 },
  // cinturones: órbitas circulares representativas
  cinturon: { a: 2.77, e: 0.0, I: 0, L: 120, w: 0, O: 0, P: 4.61 },
  kuiper: { a: 44.0, e: 0.0, I: 0, L: 300, w: 0, O: 0, P: 291.8 },
};

// Lunas: orbita = distancia al planeta en uj, periodo en días reales
export const LUNAS = {
  luna: { de: 'tierra', orbita: 5, periodo: 27.32 },
  fobos: { de: 'marte', orbita: 2, periodo: 0.319 },
  deimos: { de: 'marte', orbita: 3.4, periodo: 1.263 },
  io: { de: 'jupiter', orbita: 3, periodo: 1.769 },
  europa: { de: 'jupiter', orbita: 4.4, periodo: 3.551 },
  ganimedes: { de: 'jupiter', orbita: 6, periodo: 7.155 },
  calisto: { de: 'jupiter', orbita: 8, periodo: 16.689 },
  titan: { de: 'saturno', orbita: 6, periodo: 15.945 },
};

// Datos físicos y de presentación (radio en km, color del disco, anillos…)
export const FISICA = {
  sol: { nombre: 'Sol', radioKm: 696000, color: '#ffe9a8' },
  mercurio: { nombre: 'Mercurio', radioKm: 2440, color: '#9c948c' },
  venus: { nombre: 'Venus', radioKm: 6052, color: '#e8cf8a' },
  tierra: { nombre: 'Tierra', radioKm: 6371, color: '#4f8fe0' },
  luna: { nombre: 'Luna', radioKm: 1737, color: '#c9c9c9' },
  marte: { nombre: 'Marte', radioKm: 3390, color: '#d0663c' },
  fobos: { nombre: 'Fobos', radioKm: 11, color: '#8a7a6e' },
  deimos: { nombre: 'Deimos', radioKm: 6, color: '#9a8a7a' },
  cinturon: { nombre: 'Cinturón de asteroides', radioKm: 500, color: '#8a8478' },
  jupiter: { nombre: 'Júpiter', radioKm: 69911, color: '#d8b07a', bandas: true },
  io: { nombre: 'Ío', radioKm: 1822, color: '#e0c04a' },
  europa: { nombre: 'Europa', radioKm: 1561, color: '#dfe6ee' },
  ganimedes: { nombre: 'Ganímedes', radioKm: 2634, color: '#9a928a' },
  calisto: { nombre: 'Calisto', radioKm: 2410, color: '#5a524c' },
  saturno: { nombre: 'Saturno', radioKm: 58232, color: '#e6d49a', bandas: true, anillos: true },
  titan: { nombre: 'Titán', radioKm: 2575, color: '#d89a3c' },
  urano: { nombre: 'Urano', radioKm: 25362, color: '#a8e4ea', anillos: true },
  neptuno: { nombre: 'Neptuno', radioKm: 24622, color: '#4a6ee0' },
  pluton: { nombre: 'Plutón', radioKm: 1188, color: '#c9a898' },
  kuiper: { nombre: 'Cinturón de Kuiper', radioKm: 300, color: '#8a98a8' },
};

export const PLANETAS = ['mercurio', 'venus', 'tierra', 'marte', 'cinturon', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton', 'kuiper'];
export const CUERPOS_MAPA = [...PLANETAS, ...Object.keys(LUNAS)];

export const dJ = (rUA) => 100 * Math.pow(Math.max(rUA, 1e-6), 0.45);
// Tabla documentada de distancias comprimidas al Sol (uj) frente a la real (UA)
export const TABLA_DIST = PLANETAS.map((id) => ({ id, ua: ELEMENTOS[id].a, uj: Math.round(dJ(ELEMENTOS[id].a) * 10) / 10 }));

// días reales del sistema solar (desde J2000) para un instante del mundo
export const diaSolar = (diaAbs) => EPOCA_J2000 + diaAbs * DIAS_REALES_POR_DIA;

const norm360 = (g) => ((g % 360) + 360) % 360;
export const norm180 = (g) => { g = norm360(g); return g > 180 ? g - 360 : g; };

function resolverKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-10) break; }
  return E;
}

// Posición heliocéntrica real (UA, plano de la eclíptica) de un planeta en el día d (desde J2000)
export function posicionReal(id, d) {
  const el = ELEMENTOS[id];
  const L = el.L + 360 * d / (el.P * 365.25);
  const M = norm180(L - el.w) * RAD;
  const E = resolverKepler(M, el.e);
  const xp = el.a * (Math.cos(E) - el.e), yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const w = (el.w - el.O) * RAD, O = el.O * RAD, I = el.I * RAD;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = (sw * sI) * xp + (cw * sI) * yp;
  return { x, y, z, r: Math.hypot(x, y, z), lon: Math.atan2(y, x) / RAD };
}

// Posición en el plano del juego (uj): radio comprimido, ángulo real. Lunas: junto a su planeta.
export function posicion(id, diaAbs) {
  const d = diaSolar(diaAbs);
  if (id === 'sol') return { x: 0, y: 0, z: 0, r: 0, lon: 0 };
  const lu = LUNAS[id];
  if (lu) {
    const p = posicion(lu.de, diaAbs);
    const ang = PI2 * (d / lu.periodo) + lu.orbita;
    return { x: p.x + Math.cos(ang) * lu.orbita, y: p.y + Math.sin(ang) * lu.orbita, z: p.z, r: Math.hypot(p.x, p.y), lon: p.lon };
  }
  const r = posicionReal(id, d);
  const k = dJ(r.r) / (r.r || 1);
  return { x: r.x * k, y: r.y * k, z: r.z * k * 0.5, r: dJ(r.r), lon: r.lon, ua: r.r };
}

export function distancia(a, b, diaAbs) {
  const p = posicion(a, diaAbs), q = posicion(b, diaAbs);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

// Planeta "padre" de un cuerpo (la Luna -> la Tierra) para saber si es un salto local
export const sistemaDe = (id) => (LUNAS[id] ? LUNAS[id].de : id);
export const mismoSistema = (a, b) => sistemaDe(a) === sistemaDe(b);

// ---- Ventanas de lanzamiento (transferencia tipo Hohmann entre dos planetas)
// ángulo ideal de fase (destino - origen, en grados) al salir
export function faseIdeal(o, d) {
  const a1 = ELEMENTOS[sistemaDe(o)].a, a2 = ELEMENTOS[sistemaDe(d)].a;
  const tt = 0.5 * Math.pow((a1 + a2) / 2, 1.5);           // años de transferencia
  const Td = Math.pow(a2, 1.5);                              // periodo del destino (años)
  return norm180(180 - 360 * tt / Td);
}
export function faseActual(o, d, diaAbs) {
  const t = diaSolar(diaAbs);
  return norm180(posicionReal(sistemaDe(d), t).lon - posicionReal(sistemaDe(o), t).lon);
}
export const TOLERANCIA_VENTANA = 25;   // grados
// Qué tan mal está el momento: 0 = ventana perfecta; 180 = peor
export function errorFase(o, d, diaAbs) {
  if (o === 'sol' || d === 'sol' || mismoSistema(o, d)) return 0;
  return Math.abs(norm180(faseActual(o, d, diaAbs) - faseIdeal(o, d)));
}
export const multiplicadorVentana = (err) => 1 + 1.5 * (err / 180);
export const ventanaAbierta = (o, d, diaAbs) => errorFase(o, d, diaAbs) <= TOLERANCIA_VENTANA;
export function periodoSinodico(o, d) {
  const p1 = ELEMENTOS[sistemaDe(o)].P, p2 = ELEMENTOS[sistemaDe(d)].P;
  return Math.abs(1 / (1 / p1 - 1 / p2)) * 365.25 / DIAS_REALES_POR_DIA;   // en días de juego
}
// Próximo día de juego (absoluto) con la ventana abierta, o null. Devuelve también el mejor momento
export function proximaVentana(o, d, diaAbs) {
  if (o === 'sol' || d === 'sol' || mismoSistema(o, d)) return { dia: diaAbs, mejor: diaAbs, err: 0 };
  const tope = Math.min(periodoSinodico(o, d) * 1.2 + 5, 6000), paso = Math.max(0.1, tope / 4000);
  let ini = null, mejor = null, eMejor = 1e9;
  for (let t = diaAbs; t <= diaAbs + tope; t += paso) {
    const e = errorFase(o, d, t);
    if (e <= TOLERANCIA_VENTANA) { if (ini === null) ini = t; }
    if (ini !== null) { if (e < eMejor) { eMejor = e; mejor = t; } if (e > TOLERANCIA_VENTANA) break; }
  }
  return ini === null ? null : { dia: ini, mejor, err: eMejor };
}
