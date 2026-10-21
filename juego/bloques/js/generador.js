// =============================================================
//  ⛰️  GENERADOR DE TERRENO
//  Con una semilla (un número) inventa el paisaje: mar, playas,
//  llanos, colinas, montañas con nieve, cuevas, minerales,
//  árboles, flores y pasto alto.
//  Todo sale del "ruido" de ruido.js, así que la misma semilla
//  siempre da el mismo mundo.
//  Hay dos versiones del generador: la 1 (mundos viejos) es igual
//  que siempre; la 2 (mundos nuevos) agrega biomas: llanura, bosque,
//  desierto, taiga y tundra. Las dos ponen estructuras encima.
// =============================================================
import { CONFIG } from './config.js';
import { crearRuido, hash2, hash3 } from './ruido.js';
import { B } from './bloques.js';
import { LADO, ALTO, CAPA } from './medidas.js';
import { crearEstructuras } from './estructuras.js';

export { LADO, ALTO, CAPA };

// Posición dentro del arreglo de un chunk
export const indice = (x, y, z) => y * CAPA + z * LADO + x;

const suave = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function crearGenerador(semilla, version = 1, opciones = {}) {
  const M = CONFIG.mundo;
  const MAR = M.nivelMar;
  const esc = M.escalaTerreno || 1;
  const s = semilla | 0;

  const rContinente = crearRuido(s);
  const rColinas = crearRuido(s ^ 0x5bd1e995);
  const rMontes = crearRuido((s + 1013904223) | 0);
  const rDetalle = crearRuido(s ^ 0x27d4eb2d);
  const rBosque = crearRuido((s + 777) | 0);
  const rCuevas = crearRuido(s ^ 0x1b873593);
  const rTemp = crearRuido(s ^ 0x3c6ef372);
  const rHum = crearRuido((s + 424242) | 0);
  const v2 = version >= 2;

  // Biomas (solo en la versión 2): 0 llanura, 1 bosque, 2 desierto, 3 tundra, 4 taiga
  const NOMBRE_BIOMA = ['llanura', 'bosque', 'desierto', 'tundra', 'taiga'];
  function codigoBioma(x, z) {
    if (!v2) return 0;
    const t = rTemp.capas2(x / 520, z / 520, 3);
    const h = rHum.capas2(x / 420 + 50, z / 420 - 30, 3);
    if (t > 0.2 && h < 0.12) return 2;
    if (t < -0.3) return 3;
    if (t < -0.13) return 4;
    if (h > 0.2) return 1;
    return 0;
  }
  const biomaEn = (x, z) => NOMBRE_BIOMA[codigoBioma(x, z)];

  // ¿Qué tan alto es el suelo en (x, z)?
  function alturaEn(x, z) {
    const c = rContinente.capas2(x / (560 * esc), z / (560 * esc), 4) + 0.22; // <0 = mar, >0 = tierra
    const col = rColinas.capas2(x / (140 * esc), z / (140 * esc), 4);
    const det = rDetalle.simplex2(x / (26 * esc), z / (26 * esc));
    const cresta = 1 - Math.abs(rMontes.capas2(x / (260 * esc), z / (260 * esc), 4));
    const zonaMontes = rMontes.capas2(x / (620 * esc) + 71.3, z / (620 * esc) - 18.7, 3);
    const tierra = suave(-0.14, 0.2, c);
    const monte = suave(-0.06, 0.26, zonaMontes) * suave(0.05, 0.3, c);
    let h = MAR - 15 + tierra * 19 + c * 6 +
      col * M.alturaColinas * (0.3 + 0.7 * tierra) +
      det * 1.6 +
      monte * Math.pow(cresta, 2.2) * M.alturaMontanas;
    h = Math.round(h);
    return h < 4 ? 4 : h > ALTO - 12 ? ALTO - 12 : h;
  }

  // ¿De qué es el bloque de hasta arriba?
  function superficieEn(x, z, h, pendiente, bio = 0) {
    if (h <= MAR) {
      if (h < MAR - 5 && rDetalle.simplex2(x / 23 + 40, z / 23) > 0.2) return B.GRAVA;
      return B.ARENA;
    }
    if (h <= MAR + 2 && rDetalle.simplex2(x / 37 + 50, z / 37) > -0.35) return B.ARENA; // playas
    const nieve = M.lineaNieve + rDetalle.simplex2(x / 15, z / 15 + 90) * 4;
    if (h >= nieve) return B.NIEVE;
    if (pendiente >= 4 && h > MAR + 10) return B.PIEDRA;          // acantilados
    if (h > nieve - 12 && pendiente >= 2) return B.PIEDRA;        // montaña rocosa
    if (bio === 2) return B.ARENA;
    if (bio === 3) return B.NIEVE;
    return B.PASTO;
  }

  const est = crearEstructuras(s, { alturaEn, biomaEn }, { bloqueados: opciones.bloqueados });

  const EXT = 3;                 // miramos 3 bloques más allá del chunk (para árboles y pendientes)
  const AN = LADO + EXT * 2;

  // Crea todos los bloques de un chunk. Devuelve { datos, alturaMax }
  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    const x0 = cx * LADO, z0 = cz * LADO;

    const alt = new Int16Array(AN * AN);
    for (let j = 0; j < AN; j++) {
      for (let i = 0; i < AN; i++) alt[j * AN + i] = alturaEn(x0 + i - EXT, z0 + j - EXT);
    }
    const sup = new Uint8Array(AN * AN);
    const bio = new Uint8Array(AN * AN);
    for (let j = 1; j < AN - 1; j++) {
      for (let i = 1; i < AN - 1; i++) {
        const k = j * AN + i;
        const h = alt[k];
        const pend = Math.max(
          Math.abs(h - alt[k - 1]), Math.abs(h - alt[k + 1]),
          Math.abs(h - alt[k - AN]), Math.abs(h - alt[k + AN]));
        const b = codigoBioma(x0 + i - EXT, z0 + j - EXT);
        bio[k] = b;
        sup[k] = superficieEn(x0 + i - EXT, z0 + j - EXT, h, pend, b);
      }
    }

    // 1) Columnas: roca del fondo, piedra, tierra, superficie y agua
    let alturaMax = MAR;
    let sueloMax = 0;
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const k = (z + EXT) * AN + (x + EXT);
        const h = alt[k];
        const su = sup[k];
        const wx = x0 + x, wz = z0 + z;
        const bi = bio[k];
        const capa = su === B.PASTO ? B.TIERRA : su === B.NIEVE ? (bi === 3 ? B.TIERRA : B.PIEDRA) : su;
        const hondo = 3 + (hash2(wx, wz, s + 3) < 0.5 ? 1 : 0);
        const col = z * LADO + x;
        const desierto = bi === 2 && su === B.ARENA && h > MAR;
        for (let y = 1; y <= h; y++) {
          datos[y * CAPA + col] = y === h ? su : y > h - hondo ? (desierto && y < h - 1 ? B.ARENISCA : capa) : B.PIEDRA;
        }
        datos[col] = B.LECHO;
        if (hash2(wx, wz, s + 1) < 0.6) datos[CAPA + col] = B.LECHO;
        if (hash2(wx, wz, s + 2) < 0.3) datos[2 * CAPA + col] = B.LECHO;
        for (let y = h + 1; y <= MAR; y++) datos[y * CAPA + col] = B.AGUA;
        if (h > alturaMax) alturaMax = h;
        if (h > sueloMax) sueloMax = h;
      }
    }

    // 2) Cuevas: ruido 3D cada 4 bloques, y en medio se "interpola"
    if (M.cuevas) {
      const PX = 5;
      const PY = Math.min(Math.floor(ALTO / 4), Math.ceil(sueloMax / 4) + 1) + 1;
      const rej = new Float32Array(PX * PX * PY);
      for (let gy = 0; gy < PY; gy++) {
        for (let gz = 0; gz < PX; gz++) {
          for (let gx = 0; gx < PX; gx++) {
            const wx = x0 + gx * 4, wy = gy * 4, wz = z0 + gz * 4;
            rej[(gy * PX + gz) * PX + gx] =
              rCuevas.simplex3(wx / 38, wy / 22, wz / 38) +
              0.5 * rCuevas.simplex3(wx / 15 + 100, wy / 11, wz / 15);
          }
        }
      }
      for (let z = 0; z < LADO; z++) {
        const gz = z >> 2, fz = (z & 3) / 4;
        for (let x = 0; x < LADO; x++) {
          const gx = x >> 2, fx = (x & 3) / 4;
          const h = alt[(z + EXT) * AN + (x + EXT)];
          const techo = h <= MAR + 2 ? h - 7 : h - 3; // bajo el mar la costra es más gruesa
          for (let y = 4; y < techo; y++) {
            const gy = y >> 2, fy = (y & 3) / 4;
            const b = (gy * PX + gz) * PX + gx;
            const c00 = rej[b] + (rej[b + 1] - rej[b]) * fx;
            const c01 = rej[b + PX] + (rej[b + PX + 1] - rej[b + PX]) * fx;
            const c10 = rej[b + PX * PX] + (rej[b + PX * PX + 1] - rej[b + PX * PX]) * fx;
            const c11 = rej[b + PX * PX + PX] + (rej[b + PX * PX + PX + 1] - rej[b + PX * PX + PX]) * fx;
            const c0 = c00 + (c01 - c00) * fz;
            const c1 = c10 + (c11 - c10) * fz;
            const v = c0 + (c1 - c0) * fy;
            const umbral = 0.62 - (y < 30 ? (30 - y) * 0.004 : 0);
            if (v > umbral) datos[y * CAPA + z * LADO + x] = B.AIRE;
          }
        }
      }
    }

    // 3) Minerales escondidos en la piedra (en grupitos)
    if (M.minerales) {
      for (let y = 3; y < sueloMax; y++) {
        for (let z = 0; z < LADO; z++) {
          for (let x = 0; x < LADO; x++) {
            const i = y * CAPA + z * LADO + x;
            if (datos[i] !== B.PIEDRA) continue;
            const wx = x0 + x, wz = z0 + z;
            const g = hash3(wx >> 1, y >> 1, wz >> 1, s + 11);
            if (g < 0.02 && y < 110) {
              if (hash3(wx, y, wz, s + 12) < 0.55) datos[i] = B.CARBON;
            } else if (g > 0.988 && y < 62) {
              if (hash3(wx, y, wz, s + 13) < 0.5) datos[i] = B.HIERRO;
            } else if (g > 0.5 && g < 0.5035 && y < 36) {
              if (hash3(wx, y, wz, s + 14) < 0.5) datos[i] = B.ORO;
            }
          }
        }
      }
    }

    // 4) Árboles (también los de los vecinos, porque sus hojas pueden caer aquí)
    for (let j = 1; j < AN - 1; j++) {
      for (let i = 1; i < AN - 1; i++) {
        const k = j * AN + i;
        const bi = bio[k];
        const h = alt[k];
        const wx = x0 + i - EXT, wz = z0 + j - EXT;
        if (bi === 2) {
          // cactus en el desierto
          if (sup[k] !== B.ARENA || h <= MAR + 1 || hash2(wx, wz, s + 51) >= 0.007) continue;
          const lx = wx - x0, lz = wz - z0;
          if (lx < 0 || lx >= LADO || lz < 0 || lz >= LADO) continue;
          const alto = 1 + Math.floor(hash2(wx, wz, s + 52) * 3);
          for (let y = h + 1; y <= h + alto; y++) datos[y * CAPA + lz * LADO + lx] = B.CACTUS;
          if (h + alto > alturaMax) alturaMax = h + alto;
          continue;
        }
        if (bi === 3 ? sup[k] !== B.NIEVE : sup[k] !== B.PASTO) continue;
        if (h < MAR + 2 || h > ALTO - 14) continue;
        const bosque = suave(-0.25, 0.45, rBosque.simplex2(wx / 170, wz / 170));
        let densidad = M.densidadArboles * (0.1 + 1.9 * bosque);
        if (bi === 1) densidad = M.densidadArboles * (1.2 + 1.8 * bosque);
        else if (bi === 4) densidad = M.densidadArboles * (0.9 + 1.6 * bosque);
        else if (bi === 3) densidad = M.densidadArboles * 0.25;
        if (hash2(wx, wz, s + 31) >= densidad) continue;
        const abeto = bi === 3 || bi === 4;
        const abedul = bi === 1 && hash2(wx, wz, s + 34) < 0.4;
        const idTronco = abeto ? B.TRONCO_ABETO : abedul ? B.TRONCO_ABEDUL : B.TRONCO;
        const idHojas = abeto ? B.HOJAS_ABETO : abedul ? B.HOJAS_ABEDUL : B.HOJAS;

        let tope;
        if (abeto) {
          tope = h + 5 + Math.floor(hash2(wx, wz, s + 32) * 4);
          if (tope + 2 > alturaMax) alturaMax = tope + 2;
          for (let L = 0; L <= 6; L++) {
            const y = tope + 1 - L;
            const r = L === 0 ? 0 : Math.min(2, (L + 1) >> 1);
            for (let dz = -r; dz <= r; dz++) {
              for (let dx = -r; dx <= r; dx++) {
                if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash3(wx + dx, y, wz + dz, s + 33) < 0.6) continue;
                const lx = wx + dx - x0, lz = wz + dz - z0;
                if (lx < 0 || lx >= LADO || lz < 0 || lz >= LADO) continue;
                const q = y * CAPA + lz * LADO + lx;
                if (datos[q] === B.AIRE) datos[q] = idHojas;
              }
            }
          }
        } else {
          tope = h + 4 + Math.floor(hash2(wx, wz, s + 32) * 3) + (abedul ? 1 : 0);
          if (tope + 2 > alturaMax) alturaMax = tope + 2;
          for (let dy = -2; dy <= 1; dy++) {
            const r = dy < 0 ? 2 : 1;
            const y = tope + dy;
            for (let dz = -r; dz <= r; dz++) {
              for (let dx = -r; dx <= r; dx++) {
                if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 &&
                    hash3(wx + dx, y, wz + dz, s + 33) < 0.6) continue;
                if (dy === 1 && dx !== 0 && dz !== 0) continue;
                const lx = wx + dx - x0, lz = wz + dz - z0;
                if (lx < 0 || lx >= LADO || lz < 0 || lz >= LADO) continue;
                const q = y * CAPA + lz * LADO + lx;
                if (datos[q] === B.AIRE) datos[q] = idHojas;
              }
            }
          }
        }
        const lx = wx - x0, lz = wz - z0;
        if (lx >= 0 && lx < LADO && lz >= 0 && lz < LADO) {
          for (let y = h + 1; y <= tope; y++) datos[y * CAPA + lz * LADO + lx] = idTronco;
          datos[h * CAPA + lz * LADO + lx] = B.TIERRA;
        }
      }
    }

    // 5) Flores, pasto alto y alguna calabaza (y arbustos secos en el desierto)
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const k = (z + EXT) * AN + (x + EXT);
        const h = alt[k];
        if (h + 1 >= ALTO) continue;
        const col = z * LADO + x;
        if (bio[k] === 2) {
          if (sup[k] === B.ARENA && h > MAR && datos[h * CAPA + col] === B.ARENA && datos[(h + 1) * CAPA + col] === B.AIRE &&
              hash2(x0 + x, z0 + z, s + 43) < 0.014) datos[(h + 1) * CAPA + col] = B.ARBUSTO_MUERTO;
          continue;
        }
        if (sup[k] !== B.PASTO) continue;
        if (datos[h * CAPA + col] !== B.PASTO || datos[(h + 1) * CAPA + col] !== B.AIRE) continue;
        const wx = x0 + x, wz = z0 + z;
        const campo = rBosque.simplex2(wx / 45 + 300, wz / 45) > 0.45; // campos de flores
        const r = hash2(wx, wz, s + 41);
        if (r >= M.densidadPlantas * (campo ? 2.4 : 1)) continue;
        const t = hash2(wx, wz, s + 42);
        let id = B.PASTO_ALTO;
        if (t < (campo ? 0.45 : 0.1)) id = B.FLOR_ROJA;
        else if (t < (campo ? 0.85 : 0.2)) id = B.FLOR_AMARILLA;
        else if (t > 0.993) id = B.CALABAZA;
        datos[(h + 1) * CAPA + col] = id;
      }
    }

    // 6) Estructuras (aldeas, templos, mazmorras...): una capa extra encima del terreno
    let humos = [], puntos = [];
    if (opciones.estructuras !== false) {
      const r = est.aplicarChunk(datos, cx, cz);
      if (r.tope > alturaMax) alturaMax = r.tope;
      humos = r.humos;
      puntos = r.puntos;
    }

    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos, puntos };
  }

  // Busca un buen lugar en tierra firme para aparecer (cerca del centro)
  function buscarInicio() {
    for (let r = 0; r < 600; r += 6) {
      const pasos = Math.max(1, Math.floor(r / 3));
      for (let p = 0; p < pasos; p++) {
        const ang = (p / pasos) * Math.PI * 2;
        const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
        const h = alturaEn(x, z);
        if (h < MAR + 3 || h > MAR + 26) continue;
        const pend = Math.max(Math.abs(h - alturaEn(x + 1, z)), Math.abs(h - alturaEn(x, z + 1)));
        if (superficieEn(x, z, h, pend) === B.PASTO) return { x: x + 0.5, z: z + 0.5, y: h + 1 };
      }
    }
    return { x: 0.5, z: 0.5, y: alturaEn(0, 0) + 1 };
  }

  return { generarChunk, alturaEn, buscarInicio, biomaEn, version, estructuras: est };
}
