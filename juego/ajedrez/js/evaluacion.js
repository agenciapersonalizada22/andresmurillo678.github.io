// =============================================================
//  ⚖  EVALUACIÓN
//  Puntaje estático en centipeones desde el punto de vista de quien
//  mueve: material + tablas pieza-casilla (medio juego y final),
//  pareja de alfiles, estructura de peones, torres en columnas
//  abiertas, movilidad, seguridad del rey y fase de la partida.
// =============================================================
import { PEON, CABALLO, ALFIL, TORRE, REY, RAYOS, CAB, REYT } from './reglas.js';

const MAT_MG = [0, 82, 337, 365, 477, 1025, 0];
const MAT_EG = [0, 94, 281, 297, 512, 936, 0];

// Tablas vistas desde las blancas, primera fila = fila 8
const T_PEON = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const T_CAB = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
const T_ALF = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20];
const T_TOR = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0];
const T_DAM = [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20];
const T_REY_MG = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
const T_REY_EG = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
const TABLAS = [null, T_PEON, T_CAB, T_ALF, T_TOR, T_DAM, null];

// Valor pieza+casilla por código de pieza (tipo | color<<3)
const PMG = new Int16Array(16 * 64), PEG = new Int16Array(16 * 64);
(function () {
  for (let t = 1; t <= 6; t++) {
    for (let s = 0; s < 64; s++) {
      const mg = t === REY ? T_REY_MG : TABLAS[t], eg = t === REY ? T_REY_EG : TABLAS[t];
      // blancas: la tabla empieza en la fila 8 -> índice s ^ 56; negras: índice s
      PMG[t * 64 + s] = MAT_MG[t] + mg[s ^ 56];
      PEG[t * 64 + s] = MAT_EG[t] + eg[s ^ 56] + (t === PEON ? (s >> 3) * 2 : 0);
      PMG[(t | 8) * 64 + s] = MAT_MG[t] + mg[s];
      PEG[(t | 8) * 64 + s] = MAT_EG[t] + eg[s] + (t === PEON ? (7 - (s >> 3)) * 2 : 0);
    }
  }
})();

// Casillas a distancia <= 1 de cada casilla (zona del rey)
const ZONA = new Uint8Array(64 * 64);
for (let k = 0; k < 64; k++) {
  ZONA[k * 64 + k] = 1;
  for (const s of REYT[k]) ZONA[k * 64 + s] = 1;
}

const PASADO = [0, 5, 12, 24, 45, 80, 130, 0];
const PESO_ATAQUE = [0, 0, 2, 2, 3, 5, 0];

const pfila = [new Int8Array(8), new Int8Array(8)];
const maxR = [new Int8Array(8), new Int8Array(8)];
const minR = [new Int8Array(8), new Int8Array(8)];
const peones = [new Int8Array(8), new Int8Array(8)];

export function evaluar(pos) {
  const b = pos.b;
  let mg = 0, eg = 0, fase = 0;
  const alfiles = [0, 0];
  const ataq = [0, 0], piezasAtq = [0, 0];
  for (let c = 0; c < 2; c++) { pfila[c].fill(0); maxR[c].fill(-1); minR[c].fill(8); }
  const rey = pos.rey;
  let nPeones0 = 0, nPeones1 = 0;
  const lp0 = peones[0], lp1 = peones[1];

  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (!p) continue;
    const c = p >> 3, t = p & 7;
    const sg = c ? -1 : 1;
    mg += sg * PMG[p * 64 + s];
    eg += sg * PEG[p * 64 + s];
    const r = s >> 3, f = s & 7;
    if (t === PEON) {
      pfila[c][f]++;
      if (r > maxR[c][f]) maxR[c][f] = r;
      if (r < minR[c][f]) minR[c][f] = r;
      if (c) lp1[nPeones1++] = s; else lp0[nPeones0++] = s;
      continue;
    }
    if (t === REY) continue;
    const zona = rey[c ^ 1] * 64;
    let mov = 0, golpes = 0;
    if (t === CABALLO) {
      fase += 1;
      for (const q of CAB[s]) {
        const o = b[q];
        if (!o || (o >> 3) !== c) { mov++; if (ZONA[zona + q]) golpes++; }
      }
      mg += sg * (mov - 4) * 4; eg += sg * (mov - 4) * 4;
    } else {
      const d0 = t === ALFIL ? 4 : 0, d1 = t === TORRE ? 4 : 8;
      const rays = RAYOS[s];
      for (let d = d0; d < d1; d++) {
        const ray = rays[d];
        for (let i = 0; i < ray.length; i++) {
          const q = ray[i], o = b[q];
          if (!o) { mov++; if (ZONA[zona + q]) golpes++; continue; }
          if ((o >> 3) !== c) { mov++; if (ZONA[zona + q]) golpes++; }
          break;
        }
      }
      if (t === ALFIL) { fase += 1; alfiles[c]++; mg += sg * (mov - 6) * 5; eg += sg * (mov - 6) * 5; }
      else if (t === TORRE) { fase += 2; mg += sg * (mov - 7) * 2; eg += sg * (mov - 7) * 4; }
      else { fase += 4; mg += sg * (mov - 13); eg += sg * (mov - 13) * 2; }
    }
    if (golpes) { ataq[c] += golpes * PESO_ATAQUE[t]; piezasAtq[c]++; }
  }

  // Estructura de peones
  for (let c = 0; c < 2; c++) {
    const sg = c ? -1 : 1, e = c ^ 1;
    const lista = c ? lp1 : lp0, n = c ? nPeones1 : nPeones0;
    for (let f = 0; f < 8; f++) {
      if (pfila[c][f] > 1) { mg -= sg * 10 * (pfila[c][f] - 1); eg -= sg * 18 * (pfila[c][f] - 1); }
    }
    for (let i = 0; i < n; i++) {
      const s = lista[i], f = s & 7, r = s >> 3;
      const izq = f > 0 ? pfila[c][f - 1] : 0, der = f < 7 ? pfila[c][f + 1] : 0;
      if (!izq && !der) { mg -= sg * 10; eg -= sg * 14; }
      let pasado = true;
      for (let g = f - 1; g <= f + 1 && pasado; g++) {
        if (g < 0 || g > 7) continue;
        if (c === 0 ? maxR[e][g] > r : minR[e][g] < r) pasado = false;
      }
      if (pasado) {
        const avance = c === 0 ? r : 7 - r;
        mg += sg * PASADO[avance] / 2; eg += sg * PASADO[avance];
        // peón pasado bloqueado por una pieza
        const ant = b[s + (c ? -8 : 8)];
        if (ant && (ant >> 3) !== c) { mg -= sg * 5; eg -= sg * 15; }
      }
    }
  }

  // Torres en columnas abiertas y semiabiertas, pareja de alfiles
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if ((p & 7) !== TORRE) continue;
    const c = p >> 3, f = s & 7;
    if (pfila[c][f] === 0) {
      const v = pfila[c ^ 1][f] === 0 ? 18 : 9;
      mg += (c ? -1 : 1) * v; eg += (c ? -1 : 1) * v / 2;
    }
  }
  if (alfiles[0] >= 2) { mg += 28; eg += 45; }
  if (alfiles[1] >= 2) { mg -= 28; eg -= 45; }

  // Seguridad del rey: escudo de peones y ataques a su zona (solo medio juego)
  for (let c = 0; c < 2; c++) {
    const sg = c ? -1 : 1;
    const k = rey[c], kf = k & 7, kr = k >> 3;
    let seg = 0;
    const atras = c ? kr >= 6 : kr <= 1;
    if (atras) {
      const dir = c ? -8 : 8, pe = PEON | (c << 3);
      for (let f = Math.max(0, kf - 1); f <= Math.min(7, kf + 1); f++) {
        const s1 = (kr * 8 + f) + dir, s2 = s1 + dir;
        if (b[s1] === pe) seg += 12;
        else if (b[s2] === pe) seg += 6;
        else seg -= 10;
        if (pfila[c][f] === 0) seg -= (pfila[c ^ 1][f] === 0 ? 14 : 6);
      }
    } else seg -= 20;
    let ataque = ataq[c ^ 1];
    ataque = piezasAtq[c ^ 1] >= 2 ? ataque * 8 : ataque * 2;
    mg += sg * (seg - Math.min(ataque, 260));
  }

  if (fase > 24) fase = 24;
  const puntos = (mg * fase + eg * (24 - fase)) / 24;
  return Math.round((pos.turno ? -puntos : puntos)) + 8;
}

export { MAT_MG };
