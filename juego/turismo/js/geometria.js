// Geometria del tablero circular compartida por el dibujo de la textura, las piezas y la seleccion por toque.
import { NUM } from './datos.js';
export const RB = 6.7, RIN = 3.95, ROUT = 6.3, TAM = RB * 2, DT = (Math.PI * 2) / NUM;
export const RMED = (RIN + ROUT) / 2;
export const angulo = (i) => i * DT;
// vectores unitarios de la casilla: radial (hacia afuera) y tangencial (sentido del juego)
export function ejes(i) { const a = angulo(i); return { r: [-Math.sin(a), Math.cos(a)], t: [-Math.cos(a), -Math.sin(a)] }; }
// punto (x,z) a radio r de la casilla i, con desplazamiento tangencial dt
export function punto(i, r, dt) { const e = ejes(i); return { x: e.r[0] * r + e.t[0] * (dt || 0), z: e.r[1] * r + e.t[1] * (dt || 0) }; }
export function rectCasilla(i) { const p = punto(i, RMED); return { x: p.x, z: p.z, w: 1, d: 1 }; }
export function casillaEn(x, z) {
  const r = Math.hypot(x, z);
  if (r < RIN - 0.15 || r > ROUT + 0.25) return -1;
  let a = Math.atan2(-x, z); if (a < 0) a += Math.PI * 2;
  return Math.floor((a + DT / 2) / DT) % NUM;
}
