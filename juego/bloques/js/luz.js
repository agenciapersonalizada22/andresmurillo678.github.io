// =============================================================
//  🔦  LUZ DE BLOQUES (antorchas y piedras luminosas)
//  Cada bloque que da luz alumbra 15 pasos a su alrededor y va
//  perdiendo fuerza de a un punto por bloque. La luz no pasa por
//  los bloques macizos. Se calcula al dibujar cada chunk, mirando
//  las fuentes de luz de ese chunk y sus 8 vecinos (la luz llega a
//  lo más 15 bloques, así que más lejos no importa).
// =============================================================
import { OPACO, EMISION } from './bloques.js';
import { LADO, ALTO, CAPA } from './medidas.js';
import { P, PCAPA } from './mallador.js';

const W = LADO * 3;
const CELDAS = W * W * ALTO;
const luz = new Uint8Array(CELDAS);
const cola = new Int32Array(CELDAS);

// Busca las fuentes de luz de un chunk recién hecho: lista [x, y, z, nivel]
export function buscarEmisores(datos, alturaMax) {
  const res = [];
  const tope = Math.min(ALTO - 1, alturaMax) * CAPA + CAPA;
  for (let i = 0; i < tope; i++) {
    const e = EMISION[datos[i]];
    if (e) res.push([i % LADO, (i / CAPA) | 0, ((i % CAPA) / LADO) | 0, e]);
  }
  return res;
}

// Llena "salida" (con la forma del volumen del mallador) con la luz de las celdas
// del chunk y su orillita. Devuelve false si no hay ninguna fuente cerca.
export function calcularLuz(chunks, clave, ch, salida, yMax) {
  const vecinos = [];
  let hay = false, y0 = ALTO, y1 = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const v = chunks.get(clave(ch.cx + dx, ch.cz + dz));
      vecinos.push(v || null);
      if (v && v.emisores && v.emisores.length) {
        hay = true;
        for (const e of v.emisores) { if (e[1] < y0) y0 = e[1]; if (e[1] > y1) y1 = e[1]; }
      }
    }
  }
  if (!hay) return false;
  y0 = Math.max(0, y0 - 15);
  y1 = Math.min(ALTO - 1, y1 + 15);
  const alto = y1 - y0 + 1;
  luz.fill(0, 0, alto * W * W);

  let n = 0;
  for (let k = 0; k < 9; k++) {
    const v = vecinos[k];
    if (!v || !v.emisores) continue;
    const ox = (k % 3) * LADO, oz = ((k / 3) | 0) * LADO;
    for (const [lx, y, lz, nivel] of v.emisores) {
      const idx = ((y - y0) * W + (lz + oz)) * W + (lx + ox);
      if (nivel > luz[idx]) { luz[idx] = nivel; cola[n++] = idx; }
    }
  }
  const dato = (x, y, z) => {
    const v = vecinos[((z >> 4) * 3) + (x >> 4)];
    return v ? v.datos[y * CAPA + (z & 15) * LADO + (x & 15)] : 255;
  };
  let cabeza = 0;
  const pasos = [1, -1, W, -W, W * W, -W * W];
  while (cabeza < n) {
    const idx = cola[cabeza++];
    const nivel = luz[idx] - 1;
    if (nivel <= 0) continue;
    const x = idx % W, z = ((idx / W) | 0) % W, y = ((idx / (W * W)) | 0) + y0;
    for (let d = 0; d < 6; d++) {
      let nx = x, ny = y, nz = z;
      if (d === 0) nx++; else if (d === 1) nx--; else if (d === 2) nz++; else if (d === 3) nz--; else if (d === 4) ny++; else ny--;
      if (nx < 0 || nx >= W || nz < 0 || nz >= W || ny < y0 || ny > y1) continue;
      const ni = idx + pasos[d];
      if (luz[ni] >= nivel) continue;
      const b = dato(nx, ny, nz);
      if (OPACO[b] && !EMISION[b]) continue;
      luz[ni] = nivel;
      cola[n++] = ni;
    }
  }

  // se copia al volumen de trabajo (18 x 18, con 1 piso de margen abajo)
  salida.fill(0, 0, (Math.min(ALTO - 1, yMax) + 3) * PCAPA);
  for (let y = Math.max(0, y0); y <= Math.min(y1, yMax + 1); y++) {
    for (let z = -1; z <= LADO; z++) {
      for (let x = -1; x <= LADO; x++) {
        salida[(y + 1) * PCAPA + (z + 1) * P + (x + 1)] = luz[((y - y0) * W + (z + LADO)) * W + (x + LADO)];
      }
    }
  }
  return true;
}
