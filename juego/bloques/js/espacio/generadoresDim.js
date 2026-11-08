// =============================================================
//  🏔️  GENERADORES DE DIMENSIONES
//  Cada dimensión crea sus chunks con su propio generador (misma
//  forma que el de la Superficie: generarChunk, alturaEn,
//  buscarInicio...). Todo sale de la semilla del mundo, así que
//  nunca hay que guardar el terreno, solo lo que cambias.
//  - Luna: regolito, cráteres, hielo, minerales, base de aterrizaje.
//  - Órbita: vacío con una estación espacial y asteroides.
//  - Abismo: roca roja, mares de lava, roca ardiente y torres.
// =============================================================
import { B } from '../bloques.js';
import { CAPA, ALTO, LADO } from '../medidas.js';
import { crearRuido, hash2, hash3 } from '../ruido.js';
import { crearGenerador } from '../generador.js';

const NADA = { buscar: () => null, instancia: () => null, planDe: () => null, aplicarChunk: () => ({ tope: 0, humos: [], puntos: [], cofres: [] }) };
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Escribe un bloque con coordenadas de mundo si cae dentro del chunk
function ponerEn(datos, cx, cz, x, y, z, id) {
  const lx = x - cx * LADO, lz = z - cz * LADO;
  if (lx < 0 || lx >= LADO || lz < 0 || lz >= LADO || y < 1 || y >= ALTO) return;
  datos[y * CAPA + lz * LADO + lx] = id;
}
function cajaEn(datos, cx, cz, x0, y0, z0, x1, y1, z1, id) {
  const xa = Math.max(x0, cx * LADO), xb = Math.min(x1, cx * LADO + 15), za = Math.max(z0, cz * LADO), zb = Math.min(z1, cz * LADO + 15);
  if (xa > xb || za > zb) return;
  for (let y = Math.max(1, y0); y <= Math.min(ALTO - 1, y1); y++) for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) datos[y * CAPA + (z - cz * LADO) * LADO + (x - cx * LADO)] = id;
}

// ----------------------------------------------------------- Luna
export const LUNA = { SUELO: 56, RADIO_BASE: 22 };

export function crearGeneradorLuna(semilla) {
  const s = (semilla | 0) ^ 0x4c554e41;
  const rBase = crearRuido(s), rDet = crearRuido(s + 17), rMena = crearRuido(s ^ 0x1b873593);
  const CELDA = 44;

  function crater(cx, cz) {
    if (hash2(cx, cz, s + 3) > 0.62) return null;
    const r = 5 + hash2(cx, cz, s + 5) * 15;
    return { x: cx * CELDA + 6 + hash2(cx, cz, s + 7) * (CELDA - 12), z: cz * CELDA + 6 + hash2(cx, cz, s + 9) * (CELDA - 12), r };
  }
  const cache = new Map();
  const craterEn = (cx, cz) => { const k = cx + ',' + cz; if (!cache.has(k)) { if (cache.size > 4000) cache.clear(); cache.set(k, crater(cx, cz)); } return cache.get(k); };

  function alturaEn(x, z) {
    let h = LUNA.SUELO + rBase.capas2(x / 90, z / 90, 3) * 5 + rDet.simplex2(x / 12, z / 12) * 0.8;
    const ix = Math.floor(x / CELDA), iz = Math.floor(z / CELDA);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = craterEn(ix + dx, iz + dz);
      if (!c) continue;
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d >= 1.35) continue;
      const prof = c.r * 0.42;
      if (d < 0.86) h -= prof * (1 - (d / 0.86) ** 2) * 0.9 - (c.r > 14 && d < 0.18 ? prof * 0.5 * (1 - d / 0.18) : 0);
      else h += c.r * 0.09 * Math.sin(Math.PI * (d - 0.86) / 0.49);
    }
    // meseta plana para la base de aterrizaje
    const dc = Math.hypot(x, z);
    const m = 1 - suave(LUNA.RADIO_BASE - 8, LUNA.RADIO_BASE + 6, dc);
    h = h + (LUNA.SUELO - h) * m;
    h = Math.round(h);
    return h < 6 ? 6 : h > ALTO - 12 ? ALTO - 12 : h;
  }

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = LUNA.SUELO;
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const wx = cx * LADO + x, wz = cz * LADO + z, col = z * LADO + x;
        const h = alturaEn(wx, wz);
        if (h > alturaMax) alturaMax = h;
        datos[col] = B.LECHO;
        for (let y = 1; y <= h; y++) {
          let id = y > h - 3 ? B.REGOLITO : B.ROCA_LUNAR;
          if (y < h - 3) {
            const g = rMena.simplex3 ? rMena.simplex3(wx / 9, y / 9, wz / 9) : 0;
            if (g > 0.84 && y < 46 && hash3(wx, y, wz, s + 1) < 0.7) id = B.HIERRO;
            else if (g < -0.86 && y < 38 && hash3(wx, y, wz, s + 2) < 0.6) id = B.ORO;
            else if (g > 0.9 && y < 26 && hash3(wx, y, wz, s + 3) < 0.5) id = B.MINERAL_DIAMANTE;
            else if (g < -0.6 && y < h - 5 && y > h - 14 && hash3(wx, y, wz, s + 4) < 0.35) id = B.HIELO;
          }
          datos[y * CAPA + col] = id;
        }
        // rocas sueltas
        if (hash2(wx, wz, s + 11) > 0.9965 && Math.hypot(wx, wz) > LUNA.RADIO_BASE + 6) {
          const a = 1 + Math.floor(hash2(wx, wz, s + 12) * 2);
          for (let y = h + 1; y <= h + a && y < ALTO; y++) datos[y * CAPA + col] = B.ROCA_LUNAR;
          if (h + a > alturaMax) alturaMax = h + a;
        }
      }
    }
    // base de aterrizaje: plataforma, consolas, luces y baliza
    const S = LUNA.SUELO;
    if (Math.abs(cx * 16 + 8) < 40 && Math.abs(cz * 16 + 8) < 40) {
      cajaEn(datos, cx, cz, -9, S, -9, 9, S, 9, B.HORMIGON);
      cajaEn(datos, cx, cz, -3, S, -3, 3, S, 3, B.PLATAFORMA);
      for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, -9], [0, 9], [-9, 0], [9, 0]]) { cajaEn(datos, cx, cz, x, S + 1, z, x, S + 2, z, B.METAL); ponerEn(datos, cx, cz, x, S + 3, z, B.PIEDRA_LUMINOSA); }
      ponerEn(datos, cx, cz, -2, S + 1, 7, B.CONSOLA_NAV);
      ponerEn(datos, cx, cz, 0, S + 1, 7, B.GENERADOR_O2);
      ponerEn(datos, cx, cz, 2, S + 1, 7, B.CARGADOR);
      cajaEn(datos, cx, cz, -3, S + 1, 8, 3, S + 3, 8, B.METAL);
      cajaEn(datos, cx, cz, -3, S + 1, 6, -3, S + 3, 6, B.METAL);
      cajaEn(datos, cx, cz, 3, S + 1, 6, 3, S + 3, 6, B.METAL);
      cajaEn(datos, cx, cz, -3, S + 4, 6, 3, S + 4, 8, B.METAL);
      alturaMax = Math.max(alturaMax, S + 4);
    }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }

  const buscarInicio = () => ({ x: 0.5, z: -4.5, y: LUNA.SUELO + 1 });
  return { generarChunk, alturaEn, buscarInicio, biomaEn: () => 'luna', version: 2, estructuras: NADA };
}

// ----------------------------------------------------------- Órbita
export const ORBITA = { Y0: 60 };

export function crearGeneradorOrbita(semilla) {
  const s = (semilla | 0) ^ 0x4f524249;
  const Y = ORBITA.Y0;

  function estacion(datos, cx, cz) {
    const c = (x0, y0, z0, x1, y1, z1, id) => cajaEn(datos, cx, cz, x0, y0, z0, x1, y1, z1, id);
    const p = (x, y, z, id) => ponerEn(datos, cx, cz, x, y, z, id);
    c(-15, Y - 1, -15, 15, Y - 1, 15, B.METAL);
    c(-15, Y, -15, 15, Y, 15, B.HORMIGON);
    c(-4, Y, -4, 4, Y, 4, B.PLATAFORMA);
    for (let i = -15; i <= 15; i += 5) for (const [x, z] of [[i, -15], [i, 15], [-15, i], [15, i]]) { p(x, Y, z, B.PIEDRA_LUMINOSA); }
    // barandas de cristal
    c(-15, Y + 1, -15, 15, Y + 1, -15, B.VIDRIO); c(-15, Y + 1, 15, 15, Y + 1, 15, B.VIDRIO);
    c(-15, Y + 1, -15, -15, Y + 1, 15, B.VIDRIO); c(15, Y + 1, -15, 15, Y + 1, 15, B.VIDRIO);
    c(-1, Y + 1, 15, 1, Y + 1, 15, B.AIRE);
    // módulo de mando (z 6..14)
    c(-7, Y + 1, 6, 7, Y + 5, 14, B.METAL);
    c(-6, Y + 1, 7, 6, Y + 4, 13, B.AIRE);
    c(-7, Y + 2, 6, 7, Y + 3, 6, B.VIDRIO); c(-3, Y + 1, 6, 3, Y + 3, 6, B.AIRE);
    c(-7, Y + 2, 10, -7, Y + 3, 10, B.VIDRIO); c(7, Y + 2, 10, 7, Y + 3, 10, B.VIDRIO);
    p(0, Y + 4, 10, B.PIEDRA_LUMINOSA); p(-4, Y + 4, 10, B.PIEDRA_LUMINOSA); p(4, Y + 4, 10, B.PIEDRA_LUMINOSA);
    p(-4, Y + 1, 13, B.CONSOLA_NAV); p(-2, Y + 1, 13, B.PANEL_CONTROL); p(2, Y + 1, 13, B.GENERADOR_O2); p(4, Y + 1, 13, B.CARGADOR); p(0, Y + 1, 13, B.FABRICA);
    // paneles solares
    for (const lado of [-1, 1]) {
      const x0 = lado > 0 ? 16 : -40, x1 = lado > 0 ? 40 : -16;
      c(x0, Y, -2, x1, Y, 2, B.CRISTAL_OSCURO); c(x0, Y, 0, x1, Y, 0, B.METAL);
      c(lado > 0 ? 15 : -16, Y, 0, lado > 0 ? 16 : -15, Y, 0, B.METAL);
    }
    // antena
    c(-13, Y + 1, -13, -13, Y + 14, -13, B.METAL); p(-13, Y + 15, -13, B.PIEDRA_LUMINOSA);
  }

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = 0;
    const bx = cx * LADO, bz = cz * LADO;
    // asteroides: una roca por celda de 56, lejos de la estación
    for (let ix = Math.floor((bx - 14) / 56); ix <= Math.floor((bx + 30) / 56); ix++) {
      for (let iz = Math.floor((bz - 14) / 56); iz <= Math.floor((bz + 30) / 56); iz++) {
        if (hash2(ix, iz, s + 1) > 0.55) continue;
        const ax = ix * 56 + 12 + hash2(ix, iz, s + 2) * 32, az = iz * 56 + 12 + hash2(ix, iz, s + 3) * 32;
        if (Math.hypot(ax, az) < 55) continue;
        const ay = 24 + hash2(ix, iz, s + 4) * 64, r = 3 + hash2(ix, iz, s + 5) * 6;
        const R = Math.ceil(r + 2);
        for (let z = Math.max(bz, Math.floor(az - R)); z <= Math.min(bz + 15, Math.floor(az + R)); z++) {
          for (let x = Math.max(bx, Math.floor(ax - R)); x <= Math.min(bx + 15, Math.floor(ax + R)); x++) {
            for (let y = Math.floor(ay - R); y <= Math.floor(ay + R); y++) {
              if (y < 1 || y >= ALTO) continue;
              const d = Math.hypot((x - ax), (y - ay) * 1.25, (z - az)) + (hash3(x, y, z, s + 6) - 0.5) * 1.6;
              if (d < r) {
                const id = hash3(x, y, z, s + 7) < 0.05 ? B.HIERRO : (hash3(x, y, z, s + 8) < 0.5 ? B.ROCA_LUNAR : B.REGOLITO);
                datos[y * CAPA + (z - bz) * LADO + (x - bx)] = id;
                if (y > alturaMax) alturaMax = y;
              }
            }
          }
        }
      }
    }
    if (bx < 50 && bx > -66 && bz < 50 && bz > -66) { estacion(datos, cx, cz); alturaMax = Math.max(alturaMax, Y + 16); }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }

  const buscarInicio = () => ({ x: 0.5, z: -8.5, y: Y + 1 });
  return { generarChunk, alturaEn: () => Y, buscarInicio, biomaEn: () => 'orbita', version: 2, estructuras: NADA };
}

// ----------------------------------------------------------- Abismo
export const ABISMO = { LAVA: 30, BASE: 33 };

export function crearGeneradorAbismo(semilla) {
  const s = (semilla | 0) ^ 0x41424953;
  const rA = crearRuido(s), rB = crearRuido(s + 31), rC = crearRuido(s ^ 0x2545f491);

  function alturaEn(x, z) {
    const grande = rA.capas2(x / 120, z / 120, 4);
    const crestas = 1 - Math.abs(rB.capas2(x / 55, z / 55, 3));
    let h = ABISMO.BASE + grande * 20 + crestas * crestas * 14 - 6;
    h += rC.simplex2(x / 9, z / 9) * 1.5;
    h = Math.round(h);
    return h < 8 ? 8 : h > ALTO - 14 ? ALTO - 14 : h;
  }

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = ABISMO.LAVA;
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const wx = cx * LADO + x, wz = cz * LADO + z, col = z * LADO + x;
        const h = alturaEn(wx, wz);
        if (h > alturaMax) alturaMax = h;
        datos[col] = B.LECHO;
        for (let y = 1; y <= h; y++) {
          let id = B.ROCA_ABISMO;
          const r = hash3(wx, y, wz, s + 1);
          if (y < h - 2 && r < 0.012) id = B.ROCA_BRASA;
          else if (y < h - 3 && r > 0.994) id = B.ORO;
          else if (y < h - 3 && r > 0.985 && r < 0.9885) id = B.CARBON;
          datos[y * CAPA + col] = id;
        }
        for (let y = h + 1; y <= ABISMO.LAVA; y++) datos[y * CAPA + col] = B.LAVA;
        // cuevas de burbujas de aire en la roca (cavernas bajas)
        // columnas y estalagmitas
        if (h > ABISMO.LAVA + 1 && hash2(wx, wz, s + 5) > 0.992) {
          const a = 3 + Math.floor(hash2(wx, wz, s + 6) * 7);
          for (let y = h + 1; y <= h + a && y < ALTO; y++) datos[y * CAPA + col] = a > 7 && y > h + a - 2 ? B.ROCA_BRASA : B.ROCA_ABISMO;
          if (h + a > alturaMax) alturaMax = h + a;
        }
        // brasas sueltas en el suelo (luz)
        else if (h > ABISMO.LAVA + 1 && hash2(wx, wz, s + 8) > 0.9975) { datos[(h + 1) * CAPA + col] = B.ROCA_BRASA; if (h + 1 > alturaMax) alturaMax = h + 1; }
      }
    }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }

  function buscarInicio() {
    for (let r = 0; r < 300; r += 4) {
      const pasos = Math.max(1, Math.floor(r / 2));
      for (let p = 0; p < pasos; p++) {
        const a = (p / pasos) * Math.PI * 2, x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
        const h = alturaEn(x, z);
        if (h < ABISMO.LAVA + 3) continue;
        let plano = true;
        for (let dz = -3; dz <= 3 && plano; dz += 3) for (let dx = -3; dx <= 3; dx += 3) if (alturaEn(x + dx, z + dz) < ABISMO.LAVA + 2 || Math.abs(alturaEn(x + dx, z + dz) - h) > 3) { plano = false; break; }
        if (plano) return { x: x + 0.5, z: z + 0.5, y: h + 1 };
      }
    }
    return { x: 0.5, z: 0.5, y: ABISMO.BASE + 8 };
  }
  return { generarChunk, alturaEn, buscarInicio, biomaEn: () => 'abismo', version: 2, estructuras: NADA };
}

// ----------------------------------------------------------- Fábrica
export function crearGeneradorDim(id, semilla, version, opciones) {
  switch (id) {
    case 'luna': return crearGeneradorLuna(semilla);
    case 'orbita': return crearGeneradorOrbita(semilla);
    case 'abismo': return crearGeneradorAbismo(semilla);
    default: return crearGenerador(semilla, version, opciones);
  }
}
