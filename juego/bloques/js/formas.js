// =============================================================
//  🧩  FORMAS DE LOS BLOQUES QUE NO SON CUBOS
//  Antorchas, cofres, puertas, camas, mesas, vallas, escaleras...
//  Cada una es una lista de cajitas: [x0, y0, z0, x1, y1, z1, extra]
//  con medidas de 0 a 1 dentro del bloque. "extra" puede cambiar la
//  textura de esa cajita ({ t: nombre o lista de 6 }) o girarla ({ rot }).
// =============================================================
import { B, FORMAS, BLOQUES, OPACO } from './bloques.js';
import { indiceTextura } from './texturas.js';

const U = 1 / 16;
const tex = (n) => indiceTextura(n);

const estaticas = {};

estaticas.antorcha = () => [[7 * U, 0, 7 * U, 9 * U, 10 * U, 9 * U, { brilla: true }]];
estaticas.cofre = () => [[1 * U, 0, 1 * U, 15 * U, 14 * U, 15 * U]];
estaticas.mesa = () => [
  [0, 13 * U, 0, 1, 1, 1],
  [1 * U, 0, 1 * U, 3 * U, 13 * U, 3 * U, { t: 'tablas' }], [13 * U, 0, 1 * U, 15 * U, 13 * U, 3 * U, { t: 'tablas' }],
  [1 * U, 0, 13 * U, 3 * U, 13 * U, 15 * U, { t: 'tablas' }], [13 * U, 0, 13 * U, 15 * U, 13 * U, 15 * U, { t: 'tablas' }],
];
estaticas.losa = () => [[0, 0, 0, 1, 0.5, 1]];
estaticas.cactus = () => [[1 * U, 0, 1 * U, 15 * U, 1, 15 * U]];

const cajasEscalera = [0, 1, 2, 3].map((f) => {
  const base = [0, 0, 0, 1, 0.5, 1];
  const alta = [[0, 0.5, 0.5, 1, 1, 1], [0, 0.5, 0, 0.5, 1, 1], [0, 0.5, 0, 1, 1, 0.5], [0.5, 0.5, 0, 1, 1, 1]][f]; // alto hacia +Z, -X, -Z, +X
  return [base, alta];
});

// Cama: la base es de 9/16 de alto. La almohada está del lado de la cabecera.
const ROT_CAMA = [2, 3, 0, 1]; // giros de la textura de arriba según hacia dónde está la cabecera (0 sur, 1 oeste, 2 norte, 3 este)
const camas = {};
for (const parte of ['pie', 'cabeza']) {
  camas[parte] = [0, 1, 2, 3].map((f) => [[0, 3 * U, 0, 1, 9 * U, 1, { rot: ROT_CAMA[f] }], [0, 0, 0, 1, 3 * U, 1, { t: 'tablas' }]]);
}

const cajasPuerta = {
  x: { cerrada: [0, 0, 7 * U, 1, 1, 9 * U], abierta: [0, 0, 0, 2 * U, 1, 1] },
  z: { cerrada: [7 * U, 0, 0, 9 * U, 1, 1], abierta: [0, 0, 0, 1, 1, 2 * U] },
};

const ESTATICAS = new Array(256).fill(null);
for (const b of BLOQUES) {
  if (!b || b.dibujo !== 'modelo') continue;
  if (estaticas[b.forma]) ESTATICAS[b.id] = estaticas[b.forma]();
  else if (b.forma === 'escalera') ESTATICAS[b.id] = cajasEscalera[b.f];
  else if (b.forma === 'cama') ESTATICAS[b.id] = camas[b.parte][b.f];
  else if (b.forma === 'riel') ESTATICAS[b.id] = [[0, 0, 0, 1, 1 * U, 1, { rot: b.eje === 'x' ? 1 : 0 }]];
}

const TEX_PUERTA = [tex('puerta_abajo'), tex('puerta_arriba')];

// vol/vi/P/PCAPA: el volumen del mallador, para mirar a los vecinos
export function cajasDe(id, vol, vi, P, PCAPA) {
  const f = FORMAS[id];
  if (f === 'valla') {
    const cajas = [[6 * U, 0, 6 * U, 10 * U, 1, 10 * U]];
    const une = (v) => v === B.VALLA || OPACO[v];
    for (const [d, x0, z0, x1, z1] of [[1, 10 * U, 7 * U, 1, 9 * U], [-1, 0, 7 * U, 6 * U, 9 * U], [P, 7 * U, 10 * U, 9 * U, 1], [-P, 7 * U, 0, 9 * U, 6 * U]]) {
      if (!une(vol[vi + d])) continue;
      cajas.push([x0, 12 * U, z0, x1, 15 * U, z1], [x0, 6 * U, z0, x1, 9 * U, z1]);
    }
    return cajas;
  }
  if (f === 'puerta') {
    const b = BLOQUES[id];
    const c = (b.abierta ? cajasPuerta[b.eje].abierta : cajasPuerta[b.eje].cerrada).slice();
    const arriba = BLOQUES[vol[vi - PCAPA]] && BLOQUES[vol[vi - PCAPA]].forma === 'puerta';
    c.push({ t: TEX_PUERTA[arriba ? 1 : 0] });
    return [c];
  }
  return ESTATICAS[id];
}
