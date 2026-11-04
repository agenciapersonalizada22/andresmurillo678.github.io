import { fbm, ruido, hash2 } from './util.js';

export const N = 72;
export const P = 8;
export const NP = N / P;
export const CENTRO = 32;

// terr: 0 hierba, 1 agua, 2 arena, 3 roca. tipo: isla | costa | rio | montanas | archipielago | llanura
export function generarMapa(semilla, tipo = 'isla') {
  const s = semilla | 0;
  const terr = new Uint8Array(N * N);
  const arbol = new Uint8Array(N * N);
  const mitad = N / 2;
  const h = new Float32Array(N * N);
  const lado = Math.floor(hash2(s, 3, 9) * 4);
  // río: línea sinuosa de un borde al opuesto, a 11-17 casillas del centro
  const fase = hash2(s, 5, 2) * 6.28, vert = hash2(s, 8, 1) > 0.5, off = (hash2(s, 6, 3) > 0.5 ? 1 : -1) * (12 + hash2(s, 7, 4) * 8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - mitad + 0.5, y - mitad + 0.5) / mitad;
    let v;
    if (tipo === 'costa') {
      const t = [x / N, 1 - x / N, y / N, 1 - y / N][lado];
      v = fbm(x * 0.075, y * 0.075, s) + 0.55 - (1 - Math.min(1, t * 2.3)) * 0.95;
    } else if (tipo === 'rio') {
      v = fbm(x * 0.06, y * 0.06, s) + 0.62 - d * d * 0.35;
      const a = vert ? x : y, b = vert ? y : x;
      const cen = mitad + off + Math.sin(b * 0.17 + fase) * 4.5;
      if (Math.abs(a - cen) < 2.1 + ruido(b * 0.2, 3, s) * 1.6) v = Math.min(v, 0.15);
    } else if (tipo === 'montanas') {
      v = fbm(x * 0.06, y * 0.06, s) + 0.5 - d * d * 0.28;
    } else if (tipo === 'archipielago') {
      v = fbm(x * 0.13, y * 0.13, s + 4) + 0.2 - d * d * 0.35;
    } else if (tipo === 'llanura') {
      v = 0.7 - d * d * 0.2;
      const lx = 14 + hash2(s, 2, 2) * 8, ly = 14 + hash2(s, 3, 3) * 8, sx = hash2(s, 4, 4) > 0.5 ? 1 : -1;
      if (Math.hypot(x - mitad - sx * lx, y - mitad - ly * (hash2(s, 9, 9) > 0.5 ? 1 : -1)) < 7 + ruido(x * 0.2, y * 0.2, s) * 3) v = 0.1;
    } else {
      v = fbm(x * 0.075, y * 0.075, s) + 0.36 - d * d * 0.78;
    }
    if (Math.abs(x - CENTRO) <= 9 && Math.abs(y - CENTRO) <= 9) v = Math.max(v, 0.5);
    h[y * N + x] = v;
    terr[y * N + x] = v < 0.28 ? 1 : 0;
  }
  const umbralRoca = tipo === 'montanas' ? 0.5 : tipo === 'llanura' ? 0.9 : 0.74;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (terr[i] === 1) continue;
    const lejos = Math.hypot(x - CENTRO, y - CENTRO);
    if (lejos > 13 && ruido(x * 0.13, y * 0.13, s + 91) > umbralRoca && h[i] > 0.45) { terr[i] = 3; continue; }
    let agua = false;
    for (let dy = -1; dy <= 1 && !agua; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < N && yy < N && terr[yy * N + xx] === 1) { agua = true; break; }
    }
    if (agua) terr[i] = 2;
  }
  const dd = tipo === 'montanas' ? 0.34 : tipo === 'llanura' ? 0.62 : 0.5;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (terr[i] !== 0) continue;
    const dens = ruido(x * 0.17, y * 0.17, s + 7);
    const lejos = Math.hypot(x - CENTRO, y - CENTRO);
    const umbral = lejos < 11 ? 0.74 : dd;
    if (dens > 0.5 && hash2(x, y, s + 3) > umbral) arbol[i] = hash2(x, y, s + 5) > 0.5 ? 1 : 2;
  }
  return { terr, arbol };
}

export function esConstruible(terr, x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  const t = terr[y * N + x];
  return t === 0 || t === 2;
}
export function esAgua(terr, x, y) { return x >= 0 && y >= 0 && x < N && y < N && terr[y * N + x] === 1; }
