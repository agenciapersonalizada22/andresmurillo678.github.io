// =============================================================
//  🏛️  ESTRUCTURAS SUELTAS
//  Templo del desierto, fortaleza, torre de vigía, ruinas, pozo,
//  barco naufragado y ruinas bajo el mar. Cada una es un "plano"
//  (lista de cajas de bloques) que se calcula una sola vez.
// =============================================================
import { B, variante } from './bloques.js';
import { azarConSemilla } from './ruido.js';
import { Plano, Plantilla } from './plano.js';
import { PALETAS, pozo, piramide } from './edificios.js';
import { aplanar } from './aldea.js';
import { CONFIG } from './config.js';

const MAR = CONFIG.mundo.nivelMar;
const AIRE = B.AIRE;

const rotAzar = (az) => Math.floor(az() * 4);
const mediana = (v) => v.slice().sort((a, b) => a - b)[v.length >> 1];

// Altura típica de un rectángulo (mediana de unas cuantas muestras)
function nivelDe(gen, r) {
  const m = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      m.push(gen.alturaEn(Math.round(r.x0 + (r.x1 - r.x0) * i / 4), Math.round(r.z0 + (r.z1 - r.z0) * j / 4)));
    }
  }
  return mediana(m);
}

// ----------------------------------------------------------- Templo del desierto
export function planTemplo(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const pal = PALETAS.desierto;
  const T = new Plantilla(plano, inst.x, 0, inst.z - 10, rotAzar(az), 21, 21);
  const r = T.rect(3);
  const nivel = nivelDe(gen, r);
  T.nivel = nivel;
  aplanar(plano, gen, r, nivel, pal, B.ARENISCA);

  // pirámide escalonada: cada piso es un cuadro más chico
  for (let y = 0; y <= 10; y++) {
    const i = y;
    T.caja(i, y, i, 20 - i, y, 20 - i, B.ARENISCA);
    // borde de cada escalón: dibujito
    const bordeId = y % 3 === 2 ? B.ARENISCA_CINCELADA : (y % 3 === 0 ? B.TERRACOTA_NARANJA : B.ARENISCA);
    T.caja(i, y, i, 20 - i, y, i, bordeId); T.caja(i, y, 20 - i, 20 - i, y, 20 - i, bordeId);
    T.caja(i, y, i, i, y, 20 - i, bordeId); T.caja(20 - i, y, i, 20 - i, y, 20 - i, bordeId);
  }
  T.caja(9, 11, 9, 11, 11, 11, B.ARENISCA_CINCELADA);
  T.pon(10, 12, 10, B.TERRACOTA_AZUL);
  // franjas azules en la fachada
  for (const y of [1, 4]) {
    for (let a = 4; a <= 16; a++) if (a < 8 || a > 12) T.pon(a, y, y, B.TERRACOTA_AZUL);
  }
  // dos torres al frente
  for (const a0 of [1, 15]) {
    T.caja(a0, 0, 1, a0 + 4, 9, 5, B.ARENISCA);
    T.caja(a0, 3, 1, a0 + 4, 3, 5, B.ARENISCA_CINCELADA);
    T.caja(a0, 6, 1, a0 + 4, 6, 5, B.TERRACOTA_NARANJA);
    piramide(T, pal, a0, 1, a0 + 4, 5, 10, B.ESCALERA_ARENISCA, B.ARENISCA_CINCELADA);
  }
  // entrada
  T.caja(9, 1, 0, 11, 3, 8, AIRE);
  T.caja(8, 1, 0, 8, 3, 0, B.ARENISCA_CINCELADA); T.caja(12, 1, 0, 12, 3, 0, B.ARENISCA_CINCELADA);
  T.caja(8, 4, 0, 12, 4, 0, B.ARENISCA_CINCELADA);
  // sala central
  T.caja(5, 1, 5, 15, 4, 15, AIRE);          // el techo (piso 5) se queda
  T.caja(5, 0, 5, 15, 0, 15, B.ARENISCA);
  for (const [a, c] of [[7, 7], [13, 7], [7, 13], [13, 13]]) {
    T.caja(a, 1, c, a, 3, c, B.ARENISCA_CINCELADA);
    T.pon(a, 4, c, B.PIEDRA_LUMINOSA);
  }
  T.pon(10, 0, 10, B.TERRACOTA_AZUL);
  T.caja(9, 0, 9, 11, 0, 11, B.TERRACOTA_NARANJA);
  T.pon(10, 0, 10, B.TERRACOTA_AZUL);
  T.caja(5, 1, 5, 5, 1, 15, B.LOSA_ARENISCA);
  T.cofre(6, 1, 14, 2); T.cofre(14, 1, 14, 2);
  // cámara secreta debajo
  T.caja(7, -6, 7, 13, -1, 13, AIRE);
  T.caja(7, -7, 7, 13, -7, 13, B.ARENISCA);
  T.caja(9, -6, 9, 11, -1, 11, AIRE);
  T.pon(10, -1, 10, AIRE);
  T.cofre(8, -6, 8, 3); T.cofre(12, -6, 8, 1); T.cofre(8, -6, 12, 3); T.cofre(12, -6, 12, 1);
  T.pon(10, -6, 10, B.TERRACOTA_AZUL);
  for (const [a, c] of [[7, 10], [13, 10]]) T.pon(a, -6, c, B.PIEDRA_LUMINOSA);
  // el piso sobre la cámara tiene un tapón (se rompe para bajar)
  T.caja(10, 0, 10, 10, 0, 10, B.TERRACOTA_AZUL);
  return plano;
}

// ----------------------------------------------------------- Torre de vigía
export function planTorre(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const pal = PALETAS.llanura;
  const T = new Plantilla(plano, inst.x, 0, inst.z - 2, rotAzar(az), 5, 5);
  const r = T.rect(2);
  const nivel = nivelDe(gen, r);
  T.nivel = nivel;
  aplanar(plano, gen, r, nivel, pal, B.ADOQUIN);
  const alto = 10;
  T.caja(0, 0, 0, 4, 0, 4, B.ADOQUIN);
  for (let y = 1; y <= alto; y++) {
    for (let a = 0; a < 5; a++) {
      for (let c = 0; c < 5; c++) {
        if (a > 0 && a < 4 && c > 0 && c < 4) continue;
        const esq = (a === 0 || a === 4) && (c === 0 || c === 4);
        T.pon(a, y, c, esq ? B.ADOQUIN : az() < 0.22 ? B.LADRILLO_MUSGOSO : az() < 0.12 ? B.LADRILLO_AGRIETADO : B.LADRILLO_PIEDRA);
      }
    }
  }
  T.caja(1, 1, 1, 3, alto, 3, AIRE);
  // puerta y ventanas
  T.pon(2, 1, 0, B.PUERTA_X); T.pon(2, 2, 0, B.PUERTA_X);
  for (const y of [5, 7]) {
    T.pon(2, y, 0, AIRE); T.pon(2, y, 4, AIRE); T.pon(0, y, 2, AIRE); T.pon(4, y, 2, AIRE);
  }
  // escalera: pilares cada vez más altos que dan la vuelta
  const pasos = [[2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]];
  pasos.forEach(([a, c], k) => T.caja(a, 1, c, a, k + 1, c, B.TABLAS));
  // mirador: piso al nivel 8 salvo sobre los últimos escalones
  for (const [a, c] of [[1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [3, 3], [2, 3]]) T.pon(a, 8, c, B.TABLAS);
  T.cofre(2, 9, 2, 2);
  for (let a = 0; a < 5; a++) for (let c = 0; c < 5; c++) {
    if (a > 0 && a < 4 && c > 0 && c < 4) continue;
    if ((a + c) % 2 === 0) T.pon(a, alto + 1, c, B.LADRILLO_PIEDRA);
  }
  T.pon(0, alto + 2, 0, B.ANTORCHA); T.pon(4, alto + 2, 4, B.ANTORCHA); T.pon(0, alto + 2, 4, B.ANTORCHA); T.pon(4, alto + 2, 0, B.ANTORCHA);
  T.caja(-1, 1, 0, -1, 2, 0, B.VALLA); T.pon(-1, 3, 0, B.PIEDRA_LUMINOSA);
  T.caja(5, 1, 0, 5, 2, 0, B.VALLA); T.pon(5, 3, 0, B.PIEDRA_LUMINOSA);
  T.pon(2, 0, -1, B.CAMINO);
  return plano;
}

// ----------------------------------------------------------- Ruinas
export function planRuinas(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const pal = PALETAS.llanura;
  const T = new Plantilla(plano, inst.x, 0, inst.z - 5, rotAzar(az), 11, 11);
  const r = T.rect(2);
  const nivel = nivelDe(gen, r);
  T.nivel = nivel;
  const mat = () => (az() < 0.4 ? B.ADOQUIN_MUSGOSO : az() < 0.35 ? B.LADRILLO_AGRIETADO : az() < 0.5 ? B.LADRILLO_MUSGOSO : B.LADRILLO_PIEDRA);
  // la nivelación es suave: solo se limpian árboles y se rellena lo necesario
  aplanar(plano, gen, r, nivel, pal, B.ADOQUIN_MUSGOSO);
  for (let a = 0; a < 11; a++) {
    for (let c = 0; c < 11; c++) {
      if (az() < 0.72) T.pon(a, 0, c, mat());
    }
  }
  for (let a = 0; a < 11; a++) {
    for (let c = 0; c < 11; c++) {
      if (!(a === 0 || a === 10 || c === 0 || c === 10)) continue;
      if (c === 0 && a >= 4 && a <= 6) continue; // puerta rota
      const alto = Math.floor(az() * 5);
      if (alto > 0 && az() < 0.8) T.caja(a, 1, c, a, alto, c, mat());
    }
  }
  for (const [a, c] of [[0, 0], [10, 0], [0, 10], [10, 10], [5, 5]]) {
    const alto = 3 + Math.floor(az() * 3);
    T.caja(a, 1, c, a, alto, c, B.ADOQUIN_MUSGOSO);
  }
  T.cofre(2, 1, 8, 2);
  T.pon(3, 1, 8, B.ANTORCHA);
  if (az() < 0.6) T.cofre(8, 1, 2, 1);
  return plano;
}

// ----------------------------------------------------------- Pozo suelto
export function planPozo(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const bioma = gen.biomaEn(inst.x, inst.z);
  const pal = PALETAS[bioma] || PALETAS.llanura;
  const T = new Plantilla(plano, inst.x, 0, inst.z - 2, rotAzar(az), 5, 5);
  const r = T.rect(2);
  const nivel = nivelDe(gen, r);
  T.nivel = nivel;
  aplanar(plano, gen, r, nivel, pal);
  plano.caja(r.x0, nivel, r.z0, r.x1, nivel, r.z1, pal.camino);
  pozo(T, pal);
  return plano;
}

// ----------------------------------------------------------- Fortaleza pequeña
export function planFortaleza(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const pal = PALETAS.llanura;
  const T = new Plantilla(plano, inst.x, 0, inst.z - 11, rotAzar(az), 23, 23);
  const r = T.rect(3);
  const nivel = nivelDe(gen, r);
  T.nivel = nivel;
  aplanar(plano, gen, r, nivel, pal, B.ADOQUIN);
  const W = 22;
  const muro = () => (az() < 0.18 ? B.LADRILLO_MUSGOSO : az() < 0.1 ? B.LADRILLO_AGRIETADO : B.LADRILLO_PIEDRA);
  T.caja(0, 0, 0, W, 0, W, B.PIEDRA_PULIDA);
  // muralla de 2 de grueso
  for (let y = 1; y <= 7; y++) {
    for (let a = 0; a <= W; a++) {
      for (let c = 0; c <= W; c++) {
        if (Math.min(a, c, W - a, W - c) <= 1) T.pon(a, y, c, muro());
      }
    }
  }
  // almenas
  for (let i = 0; i <= W; i += 2) {
    for (const [a, c] of [[i, 0], [i, W], [0, i], [W, i]]) T.pon(a, 8, c, B.LADRILLO_PIEDRA);
  }
  // puerta grande
  T.caja(9, 1, 0, 13, 4, 1, AIRE);
  T.caja(8, 1, 0, 8, 5, 1, B.ADOQUIN); T.caja(14, 1, 0, 14, 5, 1, B.ADOQUIN);
  T.caja(8, 5, 0, 14, 5, 1, B.ADOQUIN);
  T.pon(8, 6, 0, B.ANTORCHA); T.pon(14, 6, 0, B.ANTORCHA);
  T.caja(9, 5, 0, 13, 5, 1, B.LADRILLO_PIEDRA);
  // cuatro torres
  for (const [a0, c0] of [[-2, -2], [W - 2, -2], [-2, W - 2], [W - 2, W - 2]]) {
    for (let y = 1; y <= 11; y++) {
      T.caja(a0, y, c0, a0 + 4, y, c0, muro()); T.caja(a0, y, c0 + 4, a0 + 4, y, c0 + 4, muro());
      T.caja(a0, y, c0, a0, y, c0 + 4, muro()); T.caja(a0 + 4, y, c0, a0 + 4, y, c0 + 4, muro());
    }
    T.caja(a0 + 1, 1, c0 + 1, a0 + 3, 12, c0 + 3, AIRE);
    T.caja(a0, 0, c0, a0 + 4, 0, c0 + 4, B.ADOQUIN);
    T.caja(a0 + 1, 6, c0 + 1, a0 + 3, 6, c0 + 3, B.TABLAS_OSCURAS);
    for (const [a, c] of [[a0 + 2, c0], [a0 + 2, c0 + 4], [a0, c0 + 2], [a0 + 4, c0 + 2]]) T.caja(a, 8, c, a, 9, c, AIRE);
    piramide(T, pal, a0, c0, a0 + 4, c0 + 4, 12, B.ESCALERA_LADRILLO, B.LADRILLO_PIEDRA);
  }
  // cuartel en el centro
  T.caja(7, 1, 8, 15, 6, 16, B.LADRILLO_PIEDRA);
  T.caja(8, 1, 9, 14, 5, 15, AIRE);
  T.caja(7, 0, 8, 15, 0, 16, B.ADOQUIN);
  T.caja(7, 7, 8, 15, 7, 16, B.TABLAS_OSCURAS);
  T.pon(11, 1, 8, B.PUERTA_X); T.pon(11, 2, 8, B.PUERTA_X);
  T.pon(7, 3, 12, B.VIDRIO); T.pon(15, 3, 12, B.VIDRIO);
  for (const a of [9, 11, 13]) { T.pon(a, 1, 14, B.CAMA_PIE); T.pon(a, 1, 15, B.CAMA_CABEZA); }
  T.cofre(9, 1, 10, 3); T.cofre(13, 1, 10, 1);
  T.pon(11, 1, 12, B.MESA);
  T.pon(11, 4, 12, B.PIEDRA_LUMINOSA);
  // patio
  for (const [a, c] of [[4, 5], [18, 5], [4, 18], [18, 18]]) { T.caja(a, 1, c, a, 3, c, B.VALLA); T.pon(a, 4, c, B.PIEDRA_LUMINOSA); }
  T.cofre(3, 1, W - 3, 0);
  return plano;
}

// ----------------------------------------------------------- Barco naufragado
export function planNaufragio(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const T = new Plantilla(plano, inst.x, 0, inst.z - 10, rotAzar(az), 7, 21);
  const r = T.rect(0);
  let hmin = 999;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    hmin = Math.min(hmin, gen.alturaEn(Math.round(r.x0 + (r.x1 - r.x0) * i / 4), Math.round(r.z0 + (r.z1 - r.z0) * j / 4)));
  }
  const nivel = hmin;
  T.nivel = nivel;
  const casco = az() < 0.5 ? B.TABLAS_OSCURAS : B.TABLAS_ABETO;
  const lado = [B.TRONCO_ABETO, B.TABLAS_OSCURAS, B.TABLAS_ABETO];
  const perfil = (c) => { // ancho de medio casco según la posición (proa y popa angostas)
    const d = Math.min(c, 20 - c);
    return d >= 4 ? 3 : d >= 2 ? 2 : d >= 1 ? 1 : 0;
  };
  for (let c = 0; c <= 20; c++) {
    const m = perfil(c);
    T.caja(3 - Math.max(0, m - 1), 0, c, 3 + Math.max(0, m - 1), 0, c, casco);
    for (let y = 1; y <= 4; y++) {
      const ancho = Math.min(3, m + (y >= 2 ? 1 : 0));
      for (const s of [-1, 1]) {
        if (az() < 0.12 + y * 0.05) continue;
        T.pon(3 + s * ancho, y, c, lado[(c + y) % 3]);
      }
    }
  }
  // cubierta rota
  for (let c = 2; c <= 18; c++) {
    for (let a = 1; a <= 5; a++) if (az() < 0.55 && Math.abs(a - 3) <= perfil(c)) T.pon(a, 3, c, B.TABLAS);
  }
  // mástiles
  T.caja(3, 1, 7, 3, 9, 7, B.TRONCO_ABETO);
  T.caja(3, 1, 13, 3, 6 + Math.floor(az() * 4), 13, B.TRONCO_ABETO);
  T.caja(1, 7, 7, 5, 7, 7, B.TRONCO_ABETO);
  // camarote en la popa
  T.caja(1, 1, 15, 5, 4, 19, AIRE);
  T.caja(1, 4, 15, 5, 4, 19, B.TABLAS_OSCURAS);
  T.cofre(3, 1, 18, 2);
  T.cofre(2, 1, 1, 0);
  return plano;
}

// ----------------------------------------------------------- Ruinas bajo el mar
export function planRuinasMar(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const T = new Plantilla(plano, inst.x, 0, inst.z - 4, rotAzar(az), 9, 9);
  const r = T.rect(0);
  let hmax = 0;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    hmax = Math.max(hmax, gen.alturaEn(Math.round(r.x0 + (r.x1 - r.x0) * i / 4), Math.round(r.z0 + (r.z1 - r.z0) * j / 4)));
  }
  const nivel = hmax;
  T.nivel = nivel;
  const mat = () => (az() < 0.35 ? B.LADRILLO_MUSGOSO : az() < 0.2 ? B.LADRILLO_AGRIETADO : B.LADRILLO_PIEDRA);
  for (let a = 0; a < 9; a++) {
    for (let c = 0; c < 9; c++) {
      T.caja(a, -2, c, a, 0, c, B.ADOQUIN);
      if (az() < 0.8) T.pon(a, 0, c, az() < 0.3 ? B.ARENISCA_CINCELADA : mat());
    }
  }
  for (const [a, c] of [[1, 1], [7, 1], [1, 7], [7, 7], [4, 1], [4, 7], [1, 4], [7, 4]]) {
    const alto = 2 + Math.floor(az() * 4);
    T.caja(a, 1, c, a, alto, c, mat());
  }
  T.caja(3, 1, 3, 5, 1, 5, B.PIEDRA_PULIDA);
  T.cofre(4, 2, 4, 0);
  return plano;
}
