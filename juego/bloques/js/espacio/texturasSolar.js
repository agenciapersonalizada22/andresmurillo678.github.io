// Pintores de las texturas del sistema solar (se añaden al atlas de texturas.js)
import { FILAS_SOLAR } from './bloquesSolar.js';

const TAM = 32;
const mez = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const vr = (c, k, azar) => { const d = (azar() * 2 - 1) * k; return [c[0] + d, c[1] + d, c[2] + d]; };

function roca(u, a, b) {
  const { p, azar, mezcla, celdas } = u, cel = celdas(10);
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const k = cel[y * TAM + x];
    let c = mez(a, b, mezcla(x, y, 4) * 0.8 + (k.cual % 3) * 0.08);
    if (k.borde < 1.2) c = mez(a, [0, 0, 0], 0.45);
    p(x, y, vr(c, 5, azar));
  }
}
function polvo(u, a, b) {
  const { p, azar, mezcla } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez(a, b, mezcla(x, y, 4));
    if (azar() < 0.07) c = mez(a, [0, 0, 0], 0.18);
    p(x, y, vr(c, 7, azar));
  }
}
function hielo(u, a, b, vena) {
  const { p, azar, mezcla } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez(a, b, mezcla(x, y, 3) * 1.1);
    const g = (x * 0.9 + y * 0.55) % 11;
    if (g < 0.8 && mezcla(x, y, 2) > 0.45) c = mez(c, [255, 255, 255], 0.5);
    if (vena && Math.abs(((x * 0.6 - y * 0.8) % 13) - 6) < 0.7 && mezcla(y, x, 2) > 0.4) c = vena;
    p(x, y, vr(c, 5, azar));
  }
}
function nube(u, a, b) {
  const { p, azar, mezcla } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const banda = (Math.sin(y * 0.55 + mezcla(x, y, 2) * 5) + 1) / 2;
    p(x, y, vr(mez(a, b, banda * 0.6 + mezcla(x, y, 4) * 0.5), 4, azar));
  }
}
function mena(u, a, b, vena) {
  const { p, azar, mezcla, celdas } = u, cel = celdas(9);
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const k = cel[y * TAM + x];
    let c = mez(a, b, mezcla(x, y, 4) * 0.8 + (k.cual % 3) * 0.06);
    if (k.borde < 1.1) c = mez(a, [0, 0, 0], 0.4);
    const pepa = mezcla(x * 1.3 + 7, y * 1.3 + 3, 5) > 0.66 && ((x >> 1) + (y >> 1)) % 2 === 0;
    if (pepa) c = mez(vena, [255, 255, 255], azar() * 0.35);
    p(x, y, vr(c, 4, azar));
  }
}
function liquido(u, a, b) {
  const { p, azar, mezcla } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    const n = mezcla(x, y, 4);
    p(x, y, vr(mez(a, b, n * n * 1.5), 5, azar));
  }
}
function ruina(u, a, b, glifo) {
  const { p, azar, mezcla } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = mez(a, b, mezcla(x, y, 3));
    if (x % 16 === 0 || y % 16 === 0) c = mez(a, [0, 0, 0], 0.5);
    if (glifo) { const gx = x % 16, gy = y % 16; if ((gx > 4 && gx < 11 && (gy === 4 || gy === 11)) || (gy > 4 && gy < 11 && (gx === 4 || gx === 11 || gx === 7))) c = b; }
    p(x, y, vr(c, 4, azar));
  }
}
function surtidor(u, a, b) {
  const { p, azar } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = a;
    if (x < 1 || y < 1 || x > 30 || y > 30) c = [110, 116, 128];
    else if (y > 4 && y < 14 && x > 6 && x < 25) c = [14, 20, 28];
    else if (y > 17 && y < 28 && x > 12 && x < 20) c = b;
    else if (y > 17 && y < 24 && x > 8 && x < 24) c = mez(b, [0, 0, 0], 0.3);
    p(x, y, vr(c, 3, azar));
  }
}
function cabina(u, a, b) {
  const { p, azar } = u;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) {
    let c = a;
    if (x < 1 || y < 1 || x > 30 || y > 30 || x === 16) c = [96, 104, 118];
    if (y > 8 && y < 16 && x > 3 && x < 28 && x !== 16) c = b;
    p(x, y, vr(c, 3, azar));
  }
}
const FAB = { roca, polvo, hielo, nube, mena, liquido, ruina: (u, a, b) => ruina(u, a, b, false), runa: (u, a, b) => ruina(u, a, b, true), surtidor, cabina };

export const NUEVAS_TEXTURAS_SOLAR = FILAS_SOLAR.map((f) => f[0]);
export const PINTORES_SOLAR = {};
for (const [clave, , tipo, a, b, ex] of FILAS_SOLAR) {
  PINTORES_SOLAR[clave] = (u) => (tipo === 'mena' ? FAB.mena(u, a, b, ex.vena) : tipo === 'hielo' ? FAB.hielo(u, a, b, ex.vena) : FAB[tipo](u, a, b));
}
export const RELIEVE_SOLAR = { metano: 0.1, nube_acida: 0.3, nube_ambar: 0.3, nube_crema: 0.3, nube_roja: 0.3, nube_urano: 0.3, nube_neptuno: 0.3 };
