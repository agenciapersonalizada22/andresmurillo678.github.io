// =============================================================
//  🛰️  CENTRO ESPACIAL (estructura original)
//  Plataforma de hormigón de 65 x 65 con: plataforma de
//  lanzamiento en el centro, torre de servicio con brazos, centro
//  de control con ventanal y consolas, y un hangar con fábricas de
//  vehículos y estaciones de carga. Se genera una sola vez por
//  mundo, cerca de la aldea inicial, y se reutiliza siempre.
//  También sale la lógica (pura) de dónde ponerlo y qué plataforma
//  es "la misma" para un bloque dado.
// =============================================================
import { B } from '../bloques.js';
import { Plano } from '../plano.js';
import { aplanar } from '../aldea.js';
import { CONFIG } from '../config.js';
import { hash2 } from '../ruido.js';

const MAR = CONFIG.mundo.nivelMar;
export const RADIO_CENTRO = 36;
const RAD = 32;

const mediana = (v) => v.slice().sort((a, b) => a - b)[v.length >> 1];
const rango = (v) => Math.max(...v) - Math.min(...v);

// Terreno apto para el centro: tierra firme y no demasiado inclinada
export function sitioValido(gen, x, z) {
  const m = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m.push(gen.alturaEn(x + i * 16, z + j * 16));
  return Math.min(...m) > MAR + 1 && Math.max(...m) < MAR + 48 && rango(m) <= 16;
}

// Elige dónde va: a ~125 bloques de la aldea más cercana al origen (o a ~110 del origen si no hay aldea)
export function elegirSitio(semilla, gen, aldeas) {
  const base = aldeas && aldeas.length ? aldeas.reduce((a, b) => (Math.hypot(a.x, a.z) <= Math.hypot(b.x, b.z) ? a : b)) : { x: 0, z: 0 };
  const dist = aldeas && aldeas.length ? 125 : 110;
  const a0 = hash2(1, 2, semilla) * Math.PI * 2;
  for (let k = 0; k < 240; k++) {
    const ang = a0 + (k % 24) * (Math.PI * 2 / 24), r = dist + Math.floor(k / 24) * 30;
    const x = Math.round(base.x + Math.cos(ang) * r), z = Math.round(base.z + Math.sin(ang) * r);
    if (sitioValido(gen, x, z)) return { x, z };
  }
  return null;
}

export function planCentroEspacial(inst, gen) {
  const plano = new Plano();
  const X = inst.x, Z = inst.z;
  const r = { x0: X - RAD, x1: X + RAD, z0: Z - RAD, z1: Z + RAD };
  const m = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) m.push(gen.alturaEn(Math.round(r.x0 + (r.x1 - r.x0) * i / 4), Math.round(r.z0 + (r.z1 - r.z0) * j / 4)));
  const N = mediana(m);
  const pal = { tope: B.HORMIGON, base: B.HORMIGON };
  aplanar(plano, gen, r, N, pal, B.HORMIGON);
  plano.caja(r.x0, N + 19, r.z0, r.x1, N + 52, r.z1, B.AIRE);
  const c = (x0, y0, z0, x1, y1, z1, id) => plano.caja(X + x0, N + y0, Z + z0, X + x1, N + y1, Z + z1, id);
  const p = (x, y, z, id) => plano.pon(X + x, N + y, Z + z, id);

  // suelo general, caminos y orilla
  c(-RAD, 0, -RAD, RAD, 0, RAD, B.HORMIGON);
  c(-RAD, 0, -RAD, RAD, 0, -RAD, B.PIEDRA_PULIDA); c(-RAD, 0, RAD, RAD, 0, RAD, B.PIEDRA_PULIDA);
  c(-RAD, 0, -RAD, -RAD, 0, RAD, B.PIEDRA_PULIDA); c(RAD, 0, -RAD, RAD, 0, RAD, B.PIEDRA_PULIDA);
  c(-1, 0, 8, 1, 0, 13, B.PIEDRA_PULIDA);       // camino pad -> control / hangar
  c(-20, 0, 12, 22, 0, 13, B.PIEDRA_PULIDA);
  for (const [x, z] of [[-RAD + 2, -RAD + 2], [RAD - 2, -RAD + 2], [-RAD + 2, RAD - 2], [RAD - 2, RAD - 2], [-RAD + 2, 0], [RAD - 2, 0]]) { c(x, 1, z, x, 4, z, B.METAL); p(x, 5, z, B.PIEDRA_LUMINOSA); }

  // ---- plataforma de lanzamiento (15 x 15) con foso de llamas
  c(-7, 0, -7, 7, 0, 7, B.METAL);
  c(-3, 0, -3, 3, 0, 3, B.PLATAFORMA);
  c(-1, 0, -1, 1, 0, 1, B.PLATAFORMA);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { c(sx * 7, 1, sz * 7, sx * 7, 3, sz * 7, B.METAL); p(sx * 7, 4, sz * 7, B.PIEDRA_LUMINOSA); }
  c(-7, 1, -7, 7, 1, -7, B.METAL); // pared de contención al norte
  c(-7, 2, -7, 7, 2, -7, B.AIRE);

  // ---- torre de servicio (3 x 3) al este de la plataforma
  const TX = 10, TZ = -1, H = 44;
  for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]]) c(TX + dx, 1, TZ + dz, TX + dx, H, TZ + dz, B.METAL);
  for (let y = 2; y <= H; y += 2) {
    c(TX + 1, y, TZ, TX + 1, y, TZ, B.TORRE_METAL); c(TX + 1, y, TZ + 2, TX + 1, y, TZ + 2, B.TORRE_METAL);
    c(TX, y, TZ + 1, TX, y, TZ + 1, B.TORRE_METAL); c(TX + 2, y, TZ + 1, TX + 2, y, TZ + 1, B.TORRE_METAL);
    if (y % 8 === 0) c(TX + 1, y, TZ + 1, TX + 1, y, TZ + 1, B.METAL);
  }
  for (const y of [14, 26, 36]) {
    c(TX - 7, y, TZ + 1, TX - 1, y, TZ + 1, B.METAL);            // brazo hacia el cohete
    c(TX - 7, y + 1, TZ + 1, TX - 1, y + 1, TZ + 1, B.AIRE);
    p(TX - 7, y + 1, TZ + 1, B.PIEDRA_LUMINOSA);
    c(TX - 6, y - 1, TZ + 1, TX - 2, y - 1, TZ + 1, B.TORRE_METAL);
  }
  c(TX + 1, H + 1, TZ + 1, TX + 1, H + 5, TZ + 1, B.METAL); p(TX + 1, H + 6, TZ + 1, B.PIEDRA_LUMINOSA);
  c(TX + 3, 1, TZ + 1, TX + 3, 3, TZ + 1, B.METAL);

  // ---- centro de control (21 x 15), ventanal al norte hacia la plataforma
  const cx0 = -28, cx1 = -8, cz0 = 14, cz1 = 28, ch = 7;
  c(cx0, 1, cz0, cx1, ch, cz1, B.HORMIGON);
  c(cx0 + 1, 1, cz0 + 1, cx1 - 1, ch - 1, cz1 - 1, B.AIRE);
  c(cx0 + 1, 0, cz0 + 1, cx1 - 1, 0, cz1 - 1, B.PIEDRA_PULIDA);
  c(cx0 + 1, 2, cz0, cx1 - 1, 5, cz0, B.VIDRIO);               // ventanal
  c(cx0, ch + 1, cz0, cx1, ch + 1, cz1, B.METAL);
  c(-19, 1, cz0, -17, 3, cz0, B.AIRE);                         // puerta
  c(cx0 + 1, 3, cz1, cx1 - 1, 4, cz1, B.VIDRIO);
  for (let x = cx0 + 3; x <= cx1 - 3; x += 4) for (const z of [17, 23]) p(x, ch - 1, z, B.PIEDRA_LUMINOSA);
  // consolas contra el ventanal: miran hacia el interior (+Z)
  for (let x = cx0 + 3; x <= cx1 - 3; x += 2) p(x, 1, cz0 + 1, x === -18 ? B.PANEL_CONTROL : B.PANEL_CONTROL);
  p(-18, 1, cz0 + 1, B.PANEL_CONTROL);
  p(cx0 + 2, 1, cz0 + 2, B.CONSOLA_NAV); p(cx1 - 2, 1, cz0 + 2, B.GENERADOR_O2);
  // mesas de trabajo y cofres de ayuda
  p(-24, 1, 26, B.MESA_TRABAJO); p(-22, 1, 26, B.MESA_TRABAJO); p(-12, 1, 26, B.HORNO);
  plano.cofres.push([X - 10, N + 1, Z + 26]); p(-10, 1, 26, B.COFRE + 2);
  plano.cofres.push([X - 26, N + 1, Z + 26]); p(-26, 1, 26, B.COFRE + 2);

  // ---- hangar (25 x 17): puerta grande al norte, fábricas y cargadores
  const hx0 = 8, hx1 = 32, hz0 = 14, hz1 = 30, hh = 11;
  c(hx0, 1, hz0, hx1, hh, hz1, B.METAL);
  c(hx0 + 1, 1, hz0 + 1, hx1 - 1, hh - 1, hz1 - 1, B.AIRE);
  c(hx0 + 1, 0, hz0 + 1, hx1 - 1, 0, hz1 - 1, B.PIEDRA_PULIDA);
  c(14, 1, hz0, 26, 9, hz0, B.AIRE);                           // puerta
  c(13, 1, hz0, 13, 9, hz0, B.HORMIGON); c(27, 1, hz0, 27, 9, hz0, B.HORMIGON); c(13, 10, hz0, 27, 10, hz0, B.HORMIGON);
  c(hx0, 5, 22, hx0, 7, 22, B.VIDRIO); c(hx1, 5, 22, hx1, 7, 22, B.VIDRIO);
  for (const x of [12, 20, 28]) for (const z of [18, 26]) p(x, hh - 1, z, B.PIEDRA_LUMINOSA);
  c(hx0, hh + 1, hz0, hx1, hh + 1, hz1, B.HORMIGON);
  // fábricas y cargadores en fila junto al muro del fondo (miran al interior: +Z no, así que van contra el muro norte)
  for (const x of [10, 12]) p(x, 1, hz0 + 1, B.FABRICA);
  for (const x of [29, 31]) p(x, 1, hz0 + 1, B.CARGADOR);
  p(10, 1, hz0 + 3, B.MESA_TRABAJO);
  p(12, 1, hz0 + 3, B.CARGADOR); p(30, 1, hz0 + 3, B.CARGADOR);
  // pista de aterrizaje del aeroauto delante del hangar
  c(14, 0, 8, 26, 0, 12, B.METAL);
  c(14, 0, 8, 26, 0, 8, B.PIEDRA_LUMINOSA); c(14, 0, 12, 26, 0, 12, B.PIEDRA_PULIDA);
  plano.puntos.push({ tipo: 'aeroauto', x: X + 20.5, y: N + 1, z: Z + 22.5, yaw: Math.PI });
  plano.puntos.push({ tipo: 'aeroauto', x: X + 20.5, y: N + 1, z: Z + 10.5, yaw: Math.PI });
  plano.nivel = N;
  plano.centro = { x: X, z: Z, nivel: N };
  return plano;
}
