// Geometrías de calles (16 máscaras de conexión x 2 tipos), vehículos y peatones.
import { Malla } from './malla.js';

// máscara: 1 = norte (-z), 2 = este (+x), 4 = sur (+z), 8 = oeste (-x)
const memo = new Map();
export function geoVia(mask, tipo) {
  const k = mask + ':' + tipo;
  if (memo.has(k)) return memo.get(k);
  const m = new Malla();
  const av = tipo === 2, ancho = av ? 0.9 : 0.66, h = ancho / 2;
  m.caja(0, 0, 0, 1, 0.035, 1, 0x9aa1ad);
  const as = 0x3b3f47, y = 0.036, ay = 0.05;
  m.caja(0, y - 0.001, 0, ancho, ay - y + 0.001, ancho, as);
  const marca = av ? 0xf2d04a : 0xe8e2c0;
  if (mask & 1) { m.caja(0, y - 0.001, -(0.5 + h) / 2, ancho, ay - y + 0.001, 0.5 - h, as); }
  if (mask & 4) { m.caja(0, y - 0.001, (0.5 + h) / 2, ancho, ay - y + 0.001, 0.5 - h, as); }
  if (mask & 2) { m.caja((0.5 + h) / 2, y - 0.001, 0, 0.5 - h, ay - y + 0.001, ancho, as); }
  if (mask & 8) { m.caja(-(0.5 + h) / 2, y - 0.001, 0, 0.5 - h, ay - y + 0.001, ancho, as); }
  const ln = (x, z, w, d, c) => m.suelo(x, ay + 0.002, z, w, d, c);
  const ancha = av ? 0.04 : 0.03;
  if (mask & 5) { // vertical
    if (av) { ln(-0.025, 0, 0.012, 1, marca); ln(0.025, 0, 0.012, 1, marca); }
    else for (const z of [-0.4, -0.12, 0.16, 0.44]) if (((mask & 1) && z < 0) || ((mask & 4) && z > 0)) ln(0, z, ancha, 0.16, marca);
  }
  if (mask & 10) {
    if (av) { ln(0, -0.025, 1, 0.012, marca); ln(0, 0.025, 1, 0.012, marca); }
    else for (const x of [-0.4, -0.12, 0.16, 0.44]) if (((mask & 8) && x < 0) || ((mask & 2) && x > 0)) ln(x, 0, 0.16, ancha, marca);
  }
  if (mask === 0) ln(0, 0, 0.12, 0.12, marca);
  const g = m.geos();
  memo.set(k, g);
  return g;
}

export function geoCoche() {
  const m = new Malla();
  m.caja(0, 0.025, 0, 0.13, 0.06, 0.28, 0xffffff);
  m.caja(0, 0.085, -0.01, 0.1, 0.05, 0.14, 0x59616f);
  m.caja(0, 0.0, 0.0, 0.15, 0.03, 0.2, 0x20242b);
  return m.geos().cuerpo;
}
export function geoBus() {
  const m = new Malla();
  m.caja(0, 0.03, 0, 0.14, 0.12, 0.44, 0xffffff); m.caja(0, 0.09, 0, 0.15, 0.04, 0.36, 0x59616f);
  return m.geos().cuerpo;
}
export function geoPeaton() {
  const m = new Malla();
  m.caja(0, 0.0, 0, 0.045, 0.1, 0.035, 0xffffff);
  m.caja(0, 0.1, 0, 0.04, 0.045, 0.04, 0xf2c9a0);
  return m.geos().cuerpo;
}
export function geoLoseta(color) {
  const m = new Malla();
  m.suelo(0, 0.02, 0, 0.92, 0.92, color);
  m.caja(0, 0.0, 0, 0.96, 0.025, 0.96, 0x6b7380, true);
  return m.geos().cuerpo;
}
