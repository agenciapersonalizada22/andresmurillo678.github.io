import { fbm, ruido, hash2 } from './util.js';

export const N = 72;
export const P = 8;
export const NP = N / P;
export const CENTRO = 32;

// terr: 0 hierba, 1 agua, 2 arena, 3 roca
export function generarMapa(semilla) {
  const s = semilla | 0;
  const terr = new Uint8Array(N * N);
  const arbol = new Uint8Array(N * N);
  const mitad = N / 2;
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - mitad + 0.5, y - mitad + 0.5) / mitad;
    let v = fbm(x * 0.075, y * 0.075, s) + 0.36 - d * d * 0.78;
    if (Math.abs(x - CENTRO) <= 9 && Math.abs(y - CENTRO) <= 9) v = Math.max(v, 0.5);
    h[y * N + x] = v;
    terr[y * N + x] = v < 0.28 ? 1 : 0;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (terr[i] === 1) continue;
    const lejos = Math.hypot(x - CENTRO, y - CENTRO);
    if (lejos > 13 && ruido(x * 0.13, y * 0.13, s + 91) > 0.74 && h[i] > 0.45) { terr[i] = 3; continue; }
    let agua = false;
    for (let dy = -1; dy <= 1 && !agua; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < N && yy < N && terr[yy * N + xx] === 1) { agua = true; break; }
    }
    if (agua) terr[i] = 2;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (terr[i] !== 0) continue;
    const dens = ruido(x * 0.17, y * 0.17, s + 7);
    const lejos = Math.hypot(x - CENTRO, y - CENTRO);
    const umbral = lejos < 11 ? 0.74 : 0.5;
    if (dens > 0.5 && hash2(x, y, s + 3) > umbral) arbol[i] = hash2(x, y, s + 5) > 0.5 ? 1 : 2;
  }
  return { terr, arbol };
}

export function esConstruible(terr, x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const t = terr[y * N + x];
  return t === 0 || t === 2;
}
