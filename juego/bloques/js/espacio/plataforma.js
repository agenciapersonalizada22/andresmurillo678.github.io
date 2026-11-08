// =============================================================
//  🧱  PLATAFORMA DE LANZAMIENTO (lógica pura)
//  Varios bloques de plataforma juntos cuentan como una sola: su
//  "centro" (el bloque del medio del rectángulo) identifica al
//  cohete que está encima.
// =============================================================
import { B } from '../bloques.js';

export const claveDe = (x, y, z) => x + ',' + y + ',' + z;

// obtener(x, y, z) -> id. Devuelve { x, y, z (centro), w, d }
export function centroPlataforma(obtener, x, y, z, limite = 25) {
  let x0 = x, x1 = x, z0 = z, z1 = z;
  const cola = [[x, z]], visto = new Set([x + ',' + z]);
  let n = 0;
  while (cola.length && n++ < 900) {
    const [a, b] = cola.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = a + dx, pz = b + dz, k = px + ',' + pz;
      if (visto.has(k) || Math.abs(px - x) > limite || Math.abs(pz - z) > limite) continue;
      visto.add(k);
      if (obtener(px, y, pz) !== B.PLATAFORMA) continue;
      cola.push([px, pz]);
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (pz < z0) z0 = pz; if (pz > z1) z1 = pz;
    }
  }
  return { x: (x0 + x1) >> 1, y, z: (z0 + z1) >> 1, w: x1 - x0 + 1, d: z1 - z0 + 1 };
}
