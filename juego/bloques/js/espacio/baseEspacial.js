// =============================================================
//  🏗️  BASES Y PUESTOS (estilo agencia espacial) para los cuerpos
//  baseAgencia: plataforma, módulos con ventanas, cúpula, consolas,
//  generador de oxígeno, cargador y surtidor.  puesto: lo mínimo.
// =============================================================
import { B } from '../bloques.js';
import { cajaEn, ponerEn, intersecta } from './utilGen.js';

// y = altura del suelo ya plano; (0,0) es el centro
export function baseAgencia(datos, cx, cz, y, o = {}) {
  const ox = o.ox || 0, oz = o.oz || 0;
  if (!intersecta(cx, cz, ox - 24, oz - 24, ox + 24, oz + 24)) return y + 6;
  const c = (x0, y0, z0, x1, y1, z1, id) => cajaEn(datos, cx, cz, x0 + ox, y0, z0 + oz, x1 + ox, y1, z1 + oz, id);
  const p = (x, yy, z, id) => ponerEn(datos, cx, cz, x + ox, yy, z + oz, id);
  c(-22, y, -22, 22, y, 22, B.HORMIGON);
  c(-5, y, -5, 5, y, 5, B.PLATAFORMA);
  for (const [x, z] of [[-22, -22], [22, -22], [-22, 22], [22, 22], [0, -22], [0, 22], [-22, 0], [22, 0], [-11, -22], [11, -22], [-11, 22], [11, 22]]) { c(x, y + 1, z, x, y + 2, z, B.METAL); p(x, y + 3, z, B.PIEDRA_LUMINOSA); }
  // módulo principal (z 8..20)
  c(-9, y + 1, 8, 9, y + 5, 20, B.METAL);
  c(-8, y + 1, 9, 8, y + 4, 19, B.AIRE);
  c(-9, y + 2, 8, 9, y + 3, 8, B.VIDRIO); c(-3, y + 1, 8, 3, y + 3, 8, B.AIRE);
  c(-9, y + 2, 12, -9, y + 3, 16, B.VIDRIO); c(9, y + 2, 12, 9, y + 3, 16, B.VIDRIO);
  for (const x of [-6, 0, 6]) p(x, y + 4, 14, B.PIEDRA_LUMINOSA);
  p(-6, y + 1, 19, B.CONSOLA_NAV); p(-4, y + 1, 19, B.PANEL_CONTROL); p(-2, y + 1, 19, B.FABRICA); p(0, y + 1, 19, B.GENERADOR_O2); p(2, y + 1, 19, B.CARGADOR); p(4, y + 1, 19, B.SURTIDOR); p(6, y + 1, 19, B.COFRE);
  // laboratorio con cúpula (x -20..-12)
  const R = 6;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) for (let dy = 0; dy <= R; dy++) {
    const d = Math.hypot(dx, dy, dz);
    if (d <= R && d > R - 1.2) p(-16 + dx, y + 1 + dy, -12 + dz, dy === 0 ? B.METAL : B.VIDRIO);
  }
  c(-17, y + 1, -13, -15, y + 1, -11, B.AIRE);
  p(-16, y + 1, -12, B.MESA_TRABAJO); p(-14, y + 1, -12, B.HORNO);
  // antena
  c(16, y + 1, -16, 16, y + 14, -16, B.METAL); p(16, y + 15, -16, B.PIEDRA_LUMINOSA);
  return y + 16;
}

export function puesto(datos, cx, cz, y, o = {}) {
  if (!intersecta(cx, cz, -12, -12, 12, 12)) return y + 5;
  const c = (x0, y0, z0, x1, y1, z1, id) => cajaEn(datos, cx, cz, x0, y0, z0, x1, y1, z1, id);
  const p = (x, yy, z, id) => ponerEn(datos, cx, cz, x, yy, z, id);
  c(-10, y, -10, 10, y, 10, B.HORMIGON);
  c(-4, y, -4, 4, y, 4, B.PLATAFORMA);
  for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) { c(x, y + 1, z, x, y + 2, z, B.METAL); p(x, y + 3, z, B.PIEDRA_LUMINOSA); }
  c(-4, y + 1, 7, 4, y + 3, 7, B.METAL);
  c(-4, y + 1, 6, -4, y + 3, 6, B.METAL); c(4, y + 1, 6, 4, y + 3, 6, B.METAL); c(-4, y + 4, 6, 4, y + 4, 7, B.METAL);
  p(-3, y + 1, 6, B.CONSOLA_NAV); p(-1, y + 1, 6, B.GENERADOR_O2); p(1, y + 1, 6, B.CARGADOR); p(3, y + 1, 6, B.SURTIDOR);
  p(0, y + 3, 7, B.VIDRIO);
  if (o.runas) for (const [x, z] of [[-20, 0], [20, 0], [0, -20]]) { cajaEn(datos, cx, cz, x, y, z, x, y + 3, z, B.RUINA); ponerEn(datos, cx, cz, x, y + 4, z, B.RUNA); }
  return y + 6;
}

// Deja plano un círculo de terreno (para apoyar una base en un mundo con relieve): rellena hasta y0 y vacía encima
export function aplanar(datos, cx, cz, ox, oz, r, y0, relleno, alto = 20) {
  if (!intersecta(cx, cz, ox - r, oz - r, ox + r, oz + r)) return;
  for (let z = Math.max(oz - r, cz * 16); z <= Math.min(oz + r, cz * 16 + 15); z++) for (let x = Math.max(ox - r, cx * 16); x <= Math.min(ox + r, cx * 16 + 15); x++) {
    if (Math.hypot(x - ox, z - oz) > r) continue;
    const col = (z - cz * 16) * 16 + (x - cx * 16);
    for (let yy = 2; yy < y0; yy++) if (!datos[yy * 256 + col]) datos[yy * 256 + col] = relleno;
    for (let yy = y0; yy < y0 + alto && yy < 128; yy++) datos[yy * 256 + col] = 0;
  }
}
