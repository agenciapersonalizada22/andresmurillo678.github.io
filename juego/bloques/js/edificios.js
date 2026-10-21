// =============================================================
//  🏠  EDIFICIOS (para aldeas y otras estructuras)
//  Cada edificio se dibuja con una Plantilla: coordenadas locales
//  (a = ancho, c = fondo, y = altura; y = 0 es el piso y el frente
//  de la casa es c = 0, donde va la puerta).
//  La paleta cambia los materiales según el bioma (madera, arenisca,
//  abeto...).
// =============================================================
import { B, variante } from './bloques.js';

export const PALETAS = {
  llanura: {
    pared: B.TABLAS, esquina: B.TRONCO, piso: B.TABLAS, base: B.ADOQUIN, esc: B.ESCALERA_TABLAS_OSCURAS, techo: B.TABLAS_OSCURAS,
    losa: B.LOSA_TABLAS, plano: false, camino: B.CAMINO, tope: B.PASTO, piedra: B.LADRILLO_PIEDRA,
  },
  desierto: {
    pared: B.ARENISCA, esquina: B.ARENISCA_CINCELADA, piso: B.ARENISCA, base: B.ARENISCA, esc: B.ESCALERA_ARENISCA, techo: B.ARENISCA,
    losa: B.LOSA_ARENISCA, plano: true, camino: B.ARENISCA, tope: B.ARENA, piedra: B.ARENISCA,
  },
  taiga: {
    pared: B.TABLAS_ABETO, esquina: B.TRONCO_ABETO, piso: B.TABLAS_ABETO, base: B.ADOQUIN, esc: B.ESCALERA_ADOQUIN, techo: B.ADOQUIN,
    losa: B.LOSA_ADOQUIN, plano: false, camino: B.CAMINO, tope: B.PASTO, piedra: B.LADRILLO_PIEDRA,
  },
};
PALETAS.bosque = PALETAS.llanura;
PALETAS.tundra = { ...PALETAS.taiga, tope: B.NIEVE };

const AIRE = B.AIRE;

function techoDosAguas(T, pal, y0, extra = 1) {
  const { w, l } = T;
  const cA = -extra, cB = l - 1 + extra;
  for (let r = 0; r <= (w - 1) >> 1; r++) {
    const a1 = r, a2 = w - 1 - r, y = y0 + r;
    if (a1 === a2) { T.caja(a1, y, cA, a1, y, cB, pal.techo); continue; }
    T.caja(a1, y, cA, a1, y, cB, variante(pal.esc, 3));
    T.caja(a2, y, cA, a2, y, cB, variante(pal.esc, 1));
    if (a2 - a1 > 1) {
      T.caja(a1 + 1, y, 0, a2 - 1, y, 0, pal.pared);
      T.caja(a1 + 1, y, l - 1, a2 - 1, y, l - 1, pal.pared);
    }
  }
  return y0 + ((w - 1) >> 1);
}

function techoPlano(T, pal, y0) {
  const { w, l } = T;
  T.caja(0, y0, 0, w - 1, y0, l - 1, pal.techo);
  T.anillo(y0 + 1, y0 + 1, pal.losa);
  return y0 + 1;
}

// Pirámide de escaleras (techo de torres): desde el cuadro (a0,c0)-(a1,c1) a la altura y
export function piramide(T, pal, a0, c0, a1, c1, y, escId = pal.esc, tope = pal.techo) {
  while (a0 <= a1 && c0 <= c1) {
    if (a0 === a1 && c0 === c1) { T.pon(a0, y, c0, tope); return y; }
    T.caja(a0, y, c0, a1, y, c0, variante(escId, 0));
    T.caja(a0, y, c1, a1, y, c1, variante(escId, 2));
    T.caja(a0, y, c0, a0, y, c1, variante(escId, 3));
    T.caja(a1, y, c0, a1, y, c1, variante(escId, 1));
    a0++; c0++; a1--; c1--; y++;
  }
  return y;
}

// Poste con una piedra luminosa o antorcha arriba
function candelabro(T, a, y, c) {
  T.pon(a, y, c, B.VALLA);
  T.pon(a, y + 1, c, B.ANTORCHA);
}

function muebles(T, pal, tipo) {
  const { w, l } = T;
  const fondo = l - 2;
  if (tipo === 'vivienda') {
    T.pon(1, 1, fondo - 1, B.CAMA_PIE);
    T.pon(1, 1, fondo, B.CAMA_CABEZA);
    if (w >= 7) { T.pon(w - 2, 1, fondo - 1, B.CAMA_PIE); T.pon(w - 2, 1, fondo, B.CAMA_CABEZA); }
    T.cofre(w - 2 - (w >= 7 ? 1 : 0), 1, fondo, 2);
    T.pon(w - 2, 1, 2, B.MESA);
    candelabro(T, 1, 1, 1);
    if (w >= 7) T.pon(2, 1, l >> 1, B.MESA);
  } else if (tipo === 'herrero') {
    T.pon(1, 1, fondo, B.HORNO); T.pon(2, 1, fondo, B.HORNO);
    T.pon(3, 1, fondo, B.MESA_TRABAJO);
    T.cofre(w - 2, 1, fondo, 2);
    T.pon(w - 2, 1, 2, B.MESA);
    T.pon(1, 1, 1, B.PAJA);
    candelabro(T, w - 2, 1, 1);
    // chimenea sobre el horno
    T.caja(1, 2, fondo, 1, 9, fondo, B.ADOQUIN);
    T.plano.humos.push([...T.mundo(1, fondo), T.nivel + 10]);
  } else if (tipo === 'biblioteca') {
    for (let c = 1; c < l - 1; c += 1) {
      if (c === (l >> 1)) continue;
      T.caja(1, 1, c, 1, 2, c, B.ESTANTERIA);
      T.caja(w - 2, 1, c, w - 2, 2, c, B.ESTANTERIA);
    }
    T.caja(2, 1, fondo, w - 3, 2, fondo, B.ESTANTERIA);
    T.pon(w >> 1, 1, 3, B.MESA);
    T.cofre(w - 3, 1, fondo - 1, 2);
    candelabro(T, 2, 1, 1);
  }
}

// Casa básica: piso, paredes de 4 de alto, puerta, ventanas y techo
export function casa(T, pal, tipo = 'vivienda') {
  const { w, l } = T;
  const H = 4;
  T.caja(0, 0, 0, w - 1, 0, l - 1, pal.piso);
  T.anillo(0, 0, pal.base);
  T.anillo(1, H, tipo === 'herrero' ? pal.piedra : pal.pared);
  for (const a of [0, w - 1]) for (const c of [0, l - 1]) T.caja(a, 1, c, a, H, c, pal.esquina);
  const da = w >> 1;
  T.pon(da, 1, 0, B.PUERTA_X); T.pon(da, 2, 0, B.PUERTA_X);
  T.pon(da, 3, 0, tipo === 'herrero' ? pal.piedra : pal.pared);
  for (const c of [l >> 1]) { T.pon(0, 2, c, B.VIDRIO); T.pon(w - 1, 2, c, B.VIDRIO); }
  if (l >= 6) { T.pon(0, 2, 2, B.VIDRIO); T.pon(w - 1, 2, 2, B.VIDRIO); }
  if (w >= 7) { T.pon(1, 2, 0, B.VIDRIO); T.pon(w - 2, 2, 0, B.VIDRIO); }
  T.pon(da, 2, l - 1, B.VIDRIO);
  muebles(T, pal, tipo);
  const tope = pal.plano ? techoPlano(T, pal, H + 1) : techoDosAguas(T, pal, H + 1);
  return tope;
}

export function pozo(T, pal) {
  T.caja(0, 0, 0, 4, 0, 4, B.ADOQUIN);
  T.caja(0, 1, 0, 4, 1, 4, B.ADOQUIN);
  T.caja(1, -3, 1, 3, 0, 3, B.AGUA_PUESTA);
  T.caja(1, 1, 1, 3, 1, 3, AIRE);
  for (const a of [0, 4]) for (const c of [0, 4]) T.caja(a, 2, c, a, 3, c, pal.esquina);
  T.caja(0, 4, 0, 4, 4, 4, pal.losa);
  T.caja(1, 4, 1, 3, 4, 3, pal.techo);
}

export function granja(T, pal) {
  const { w, l } = T;
  T.caja(0, 0, 0, w - 1, 0, l - 1, B.CULTIVO);
  T.caja(w >> 1, 0, 0, w >> 1, 0, l - 1, B.AGUA_PUESTA);
  T.caja(1, 1, 1, (w >> 1) - 1, 1, l - 2, B.TRIGO);
  T.caja((w >> 1) + 1, 1, 1, w - 2, 1, l - 2, B.TRIGO);
  T.caja(0, 0, 0, 0, 0, l - 1, pal.esquina);
  T.caja(w - 1, 0, 0, w - 1, 0, l - 1, pal.esquina);
  T.caja(0, 0, l - 1, w - 1, 0, l - 1, pal.esquina);
  T.caja(0, 0, 0, w - 1, 0, 0, pal.esquina);
  T.pon(w >> 1, 0, 0, B.AGUA_PUESTA);
  // vallitas en las esquinas
  for (const a of [0, w - 1]) for (const c of [0, l - 1]) T.pon(a, 1, c, B.VALLA);
  T.pon(w - 1, 1, l >> 1, B.PAJA);
}

export function iglesia(T, pal) {
  const w = 7, l = 11, H = 5;
  T.caja(0, 0, 0, w - 1, 0, l - 1, B.PIEDRA_PULIDA);
  T.anillo(0, 0, B.ADOQUIN);
  T.anillo(1, H, B.LADRILLO_PIEDRA);
  for (const a of [0, w - 1]) for (const c of [0, l - 1]) T.caja(a, 1, c, a, H, c, pal.esquina);
  for (const c of [4, 7]) { T.caja(0, 1, c, 0, H, c, B.ADOQUIN); T.caja(w - 1, 1, c, w - 1, H, c, B.ADOQUIN); }
  for (const c of [2, 5, 9]) {
    if (c === 2) continue;
    T.caja(0, 2, c, 0, 4, c, B.VIDRIO); T.caja(w - 1, 2, c, w - 1, 4, c, B.VIDRIO);
  }
  T.caja(0, 2, 9, 0, 4, 9, B.VIDRIO);
  T.caja(w >> 1, 2, l - 1, w >> 1, 4, l - 1, B.VIDRIO);
  const da = w >> 1;
  T.pon(da, 1, 0, B.PUERTA_X); T.pon(da, 2, 0, B.PUERTA_X);
  // techo de dos aguas del lado de la nave
  techoDosAguas(T, { ...pal, esc: B.ESCALERA_ADOQUIN, techo: B.ADOQUIN, pared: B.LADRILLO_PIEDRA }, H + 1, 0);
  // torre del frente
  T.caja(1, H + 1, 0, 5, H + 6, 4, B.LADRILLO_PIEDRA);
  T.caja(2, H, 1, 4, H + 6, 3, AIRE);
  for (const [a, c] of [[1, 0], [5, 0], [1, 4], [5, 4]]) T.caja(a, H + 1, c, a, H + 6, c, B.ADOQUIN);
  for (const y of [H + 3, H + 4]) {
    T.caja(3, y, 0, 3, y, 0, AIRE); T.caja(3, y, 4, 3, y, 4, AIRE);
    T.caja(1, y, 2, 1, y, 2, AIRE); T.caja(5, y, 2, 5, y, 2, AIRE);
  }
  T.caja(1, H + 6, 0, 5, H + 6, 4, B.ADOQUIN);
  const cima = piramide(T, { ...pal, esc: B.ESCALERA_LADRILLO, techo: B.LADRILLO_PIEDRA }, 0, -1, 6, 5, H + 7, B.ESCALERA_LADRILLO, B.LADRILLO_PIEDRA);
  T.caja(3, cima + 1, 2, 3, cima + 3, 2, B.VALLA);
  // pasillo con bancas, altar y antorchas
  T.caja(2, 5, 1, 4, 5, 3, AIRE);
  for (const c of [5, 7]) { T.caja(1, 1, c, 2, 1, c, B.LOSA_TABLAS); T.caja(4, 1, c, 5, 1, c, B.LOSA_TABLAS); }
  T.pon(3, 1, l - 2, B.PIEDRA_PULIDA);
  T.pon(2, 1, l - 2, B.PIEDRA_PULIDA); T.pon(2, 2, l - 2, B.ANTORCHA);
  T.pon(4, 1, l - 2, B.PIEDRA_PULIDA); T.pon(4, 2, l - 2, B.ANTORCHA);
  T.cofre(5, 1, l - 3, 2);
  T.pon(1, 1, 2, B.ANTORCHA);
  T.pon(5, 1, 2, B.ANTORCHA);
}

// Garaje con una puerta grande abierta al frente: ahí espera un vehículo
export function garaje(T, pal, tipoVehiculo) {
  const { w, l } = T;
  const H = 4;
  T.caja(0, 0, 0, w - 1, 0, l - 1, B.PIEDRA_PULIDA);
  T.anillo(0, 0, B.ADOQUIN);
  T.anillo(1, H, pal.piedra === B.ARENISCA ? B.ARENISCA : B.LADRILLO_PIEDRA);
  for (const a of [0, w - 1]) for (const c of [0, l - 1]) T.caja(a, 1, c, a, H, c, pal.esquina);
  const m = w >> 1;
  T.caja(m - 2, 1, 0, m + 2, 3, 0, AIRE);                  // puerta grande
  T.caja(m - 2, 4, 0, m + 2, 4, 0, B.TRONCO);
  T.caja(m - 3, 1, 0, m - 3, 3, 0, B.TRONCO); T.caja(m + 3, 1, 0, m + 3, 3, 0, B.TRONCO);
  T.caja(0, 5, 0, w - 1, 5, l - 1, pal.techo === B.ARENISCA ? B.ARENISCA : B.TABLAS_OSCURAS);
  T.anillo(6, 6, pal.losa);
  for (const [a, c] of [[2, 3], [w - 3, 3], [m, l - 3]]) T.pon(a, 4, c, B.PIEDRA_LUMINOSA);
  T.cofre(1, 1, l - 2, 3);
  T.pon(w - 2, 1, l - 2, B.MESA_TRABAJO);
  T.pon(w - 2, 1, l - 3, B.PAJA);
  T.caja(0, 2, l >> 1, 0, 3, l >> 1, B.VIDRIO); T.caja(w - 1, 2, l >> 1, w - 1, 3, l >> 1, B.VIDRIO);
  // el vehículo
  const [x, z] = T.mundo(m, 4), [xf, zf] = T.mundo(m, 0);
  T.plano.puntos.push({ tipo: tipoVehiculo, x: x + 0.5, y: T.nivel + 1, z: z + 0.5, yaw: Math.atan2(-(xf - x), -(zf - z)) });
}

export const EDIFICIOS = {
  cabana: { w: 5, l: 5, construir: (T, p) => casa(T, p, 'vivienda') },
  casa: { w: 7, l: 6, construir: (T, p) => casa(T, p, 'vivienda') },
  casaGrande: { w: 9, l: 7, construir: (T, p) => casa(T, p, 'vivienda') },
  herreria: { w: 9, l: 7, construir: (T, p) => casa(T, p, 'herrero') },
  biblioteca: { w: 7, l: 7, construir: (T, p) => casa(T, p, 'biblioteca') },
  granja: { w: 9, l: 9, campo: true, construir: granja },
  iglesia: { w: 7, l: 11, construir: iglesia },
  garaje: { w: 11, l: 9, construir: (T, p) => garaje(T, p, 'jeep') },
  hangar: { w: 15, l: 13, construir: (T, p) => hangar(T, p) },
};

// Hangar grande para la avioneta
export function hangar(T, pal) {
  const { w, l } = T;
  const H = 5;
  T.caja(0, 0, 0, w - 1, 0, l - 1, B.PIEDRA_PULIDA);
  T.anillo(0, 0, B.ADOQUIN);
  T.anillo(1, H, pal.piedra === B.ARENISCA ? B.ARENISCA : B.LADRILLO_PIEDRA);
  for (const a of [0, w - 1]) for (const c of [0, l - 1]) T.caja(a, 1, c, a, H, c, pal.esquina);
  const m = w >> 1;
  T.caja(m - 4, 1, 0, m + 4, 4, 0, AIRE);
  T.caja(m - 5, 1, 0, m - 5, 4, 0, B.TRONCO); T.caja(m + 5, 1, 0, m + 5, 4, 0, B.TRONCO);
  T.caja(m - 4, 5, 0, m + 4, 5, 0, B.TRONCO);
  T.caja(0, 6, 0, w - 1, 6, l - 1, pal.techo === B.ARENISCA ? B.ARENISCA : B.TABLAS_OSCURAS);
  T.anillo(7, 7, pal.losa);
  for (const [a, c] of [[3, 3], [w - 4, 3], [3, l - 4], [w - 4, l - 4], [m, 6]]) T.pon(a, 5, c, B.PIEDRA_LUMINOSA);
  T.cofre(1, 1, l - 2, 3);
  T.pon(w - 2, 1, l - 2, B.MESA_TRABAJO);
  T.caja(0, 3, l >> 1, 0, 4, l >> 1, B.VIDRIO); T.caja(w - 1, 3, l >> 1, w - 1, 4, l >> 1, B.VIDRIO);
  const [x, z] = T.mundo(m, 6), [xf, zf] = T.mundo(m, 0);
  T.plano.puntos.push({ tipo: 'avioneta', x: x + 0.5, y: T.nivel + 1, z: z + 0.5, yaw: Math.atan2(-(xf - x), -(zf - z)) });
}
