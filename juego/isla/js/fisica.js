// Movimiento comun a jugador y bots: colision con terreno, edificios, objetos y construcciones.
import { bloqueaEst, sueloEst } from './terreno.js';
export const FIS = { g: 26, salto: 8.4, radio: 0.4, alto: 1.8 };
export function altSuelo(W, x, z, yPrev) { return Math.max(W.mundo.T.altura(x, z), sueloEst(W.mundo.T, x, z, yPrev), W.constr.suelo(x, z, yPrev)); }
export const bloq = (W, x, y, z) => bloqueaEst(W.mundo.T, x, y, z, FIS.radio, FIS.alto) || W.constr.bloquea(x, y, z, FIS.radio, FIS.alto);
/* ix,iz direccion unitaria; devuelve dano por caida */
export function pasoFisico(W, e, ix, iz, vel, saltar, dt) {
  const T = W.mundo.T, dist = vel * dt; e.bloqueado = false;
  if (dist > 0) {
    const ok = (x, z) => x * x + z * z < 395 * 395 && T.altura(x, z) - e.y <= 0.25 + dist * 1.3 && !bloq(W, x, e.y, z);
    const nx = e.x + ix * dist, nz = e.z + iz * dist;
    if (ok(nx, nz)) { e.x = nx; e.z = nz; } else if (ok(nx, e.z)) e.x = nx; else if (ok(e.x, nz)) e.z = nz; else e.bloqueado = true;
  }
  const yPrev = e.y, vyAntes = e.vy;
  e.vy -= FIS.g * dt; e.y += e.vy * dt;
  const s = altSuelo(W, e.x, e.z, yPrev); let dmg = 0;
  if (e.y <= s) { if (vyAntes < -22 && !e.suelo) dmg = (-vyAntes - 22) * 3.5; e.y = s; e.vy = 0; e.suelo = true; } else e.suelo = e.y - s < 0.04;
  if (saltar && e.suelo) { e.vy = FIS.salto; e.suelo = false; }
  e.agua = T.altura(e.x, e.z) < -0.4 && e.y < 0.3;
  return dmg;
}
