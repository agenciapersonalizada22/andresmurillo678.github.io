// Ayudas para escribir bloques en chunks con coordenadas de mundo
import { CAPA, ALTO, LADO } from '../medidas.js';

export const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function ponerEn(datos, cx, cz, x, y, z, id) {
  const lx = x - cx * LADO, lz = z - cz * LADO;
  if (lx < 0 || lx >= LADO || lz < 0 || lz >= LADO || y < 1 || y >= ALTO) return;
  datos[y * CAPA + lz * LADO + lx] = id;
}
export function cajaEn(datos, cx, cz, x0, y0, z0, x1, y1, z1, id) {
  const xa = Math.max(x0, cx * LADO), xb = Math.min(x1, cx * LADO + 15), za = Math.max(z0, cz * LADO), zb = Math.min(z1, cz * LADO + 15);
  if (xa > xb || za > zb) return;
  for (let y = Math.max(1, y0); y <= Math.min(ALTO - 1, y1); y++) for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) datos[y * CAPA + (z - cz * LADO) * LADO + (x - cx * LADO)] = id;
}
export const intersecta = (cx, cz, x0, z0, x1, z1) => cx * LADO + 15 >= x0 && cx * LADO <= x1 && cz * LADO + 15 >= z0 && cz * LADO <= z1;
