// =============================================================
//  🌌  GENERADORES DEL SISTEMA SOLAR
//  Tres familias, todas deterministas por semilla (no se guarda terreno):
//   - rocoso: mapa de alturas con cráteres, cañones, volcanes, casquetes,
//     lagos u océano oculto según el perfil del cuerpo (PERFILES).
//   - asteroides: rocas flotando (Cinturón, Kuiper, Fobos, Deimos).
//   - gigante: plataformas de nubes u hielo flotantes (Júpiter, Urano,
//     Neptuno) y bloques de hielo en órbita (anillos de Saturno).
//  Cada uno trae un puesto/base para reabastecer y recargar.
// =============================================================
import { B } from '../bloques.js';
import { CAPA, ALTO, LADO } from '../medidas.js';
import { crearRuido, hash2, hash3 } from '../ruido.js';
import { suave, ponerEn, cajaEn, intersecta } from './utilGen.js';
import { baseAgencia, puesto } from './baseEspacial.js';

const NADA = { buscar: () => null, instancia: () => null, planDe: () => null, aplicarChunk: () => ({ tope: 0, humos: [], puntos: [], cofres: [] }) };
const SUELO = 60;
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);

// ----------------------------------------------------------- Perfiles de los cuerpos rocosos
// capas: [superficie, 3 capas bajo ella, fondo] · menas: [id, probabilidad por bloque, yMin, yMax]
export const PERFILES = {
  mercurio: { sal: 0x4d45, amp: 7, esc: 95, cr: { p: 0.7, rmin: 5, rmax: 22, celda: 40 }, capas: [B.POLVO_MERCURIO, B.POLVO_MERCURIO, B.ROCA_MERCURIO], hieloCrater: true,
    menas: [[B.MENA_MERCURIO, 0.02, 8, 48], [B.HIERRO, 0.012, 8, 44], [B.ORO, 0.006, 8, 34], [B.MINERAL_DIAMANTE, 0.002, 8, 24]], base: 'agencia' },
  venus: { sal: 0x5645, amp: 14, esc: 110, cr: { p: 0.12, rmin: 6, rmax: 12, celda: 70 }, capas: [B.ROCA_VENUS, B.ROCA_VENUS, B.ROCA_VENUS], nubes: true, lagosLava: true,
    menas: [[B.MENA_VENUS, 0.02, 8, 52], [B.AZUFRE, 0.016, 30, 60], [B.ORO, 0.006, 8, 34], [B.HIERRO, 0.01, 8, 40]], base: 'puesto' },
  marte: { sal: 0x4d52, amp: 9, esc: 120, cr: { p: 0.35, rmin: 4, rmax: 15, celda: 48 }, capas: [B.POLVO_MARTE, B.POLVO_MARTE, B.ROCA_MARTE], canon: true, volcan: { x: -240, z: -170, R: 100, H: 42, caldera: 18 }, casquete: 270, hieloSub: true, ruinas: 0.5,
    menas: [[B.MENA_MARTE, 0.018, 8, 52], [B.HIERRO, 0.014, 8, 44], [B.CARBON, 0.008, 8, 40], [B.MINERAL_DIAMANTE, 0.002, 8, 22]], base: 'agencia' },
  io: { sal: 0x494f, amp: 6, esc: 80, cr: { p: 0.1, rmin: 4, rmax: 9, celda: 60 }, capas: [B.AZUFRE, B.ROCA_IO, B.ROCA_IO], pozosLava: true,
    menas: [[B.ORO, 0.01, 8, 40], [B.AZUFRE, 0.02, 20, 56], [B.HIERRO, 0.01, 8, 40]], base: 'puesto' },
  europa: { sal: 0x4575, amp: 3, esc: 130, cr: { p: 0.08, rmin: 4, rmax: 8, celda: 80 }, capas: [B.HIELO_EUROPA, B.HIELO_EUROPA, B.HIELO_EUROPA], oceano: true,
    menas: [[B.MENA_SAL, 0.014, 18, 40]], base: 'puesto' },
  ganimedes: { sal: 0x4741, amp: 8, esc: 100, cr: { p: 0.3, rmin: 4, rmax: 14, celda: 50 }, capas: [B.ROCA_GANIMEDES, B.ROCA_GANIMEDES, B.ROCA_GANIMEDES], surcos: true, ruinas: 0.3,
    menas: [[B.MENA_MAGNETITA, 0.018, 8, 50], [B.HIERRO, 0.012, 8, 44], [B.HIELO_GANIMEDES, 0.01, 30, 56]], base: 'puesto' },
  calisto: { sal: 0x4341, amp: 5, esc: 90, cr: { p: 0.85, rmin: 3, rmax: 16, celda: 36 }, capas: [B.ROCA_CALISTO, B.ROCA_CALISTO, B.ROCA_CALISTO], bordeClaro: true, ruinas: 0.4,
    menas: [[B.MENA_CARBONO, 0.016, 8, 50], [B.MINERAL_DIAMANTE, 0.004, 8, 30], [B.CARBON, 0.012, 8, 46]], base: 'puesto' },
  titan: { sal: 0x5449, amp: 8, esc: 90, cr: { p: 0.03, rmin: 4, rmax: 8, celda: 90 }, capas: [B.ARENA_TITAN, B.ARENA_TITAN, B.HIELO_TITAN], lagos: { nivel: SUELO - 2, id: B.METANO }, dunas: true,
    menas: [[B.MENA_TOLINA, 0.02, 8, 50], [B.CARBON, 0.02, 8, 50]], base: 'puesto' },
  pluton: { sal: 0x504c, amp: 12, esc: 140, cr: { p: 0.15, rmin: 4, rmax: 14, celda: 60 }, capas: [B.NITROGENO_PLUTON, B.NITROGENO_PLUTON, B.ROCA_PLUTON], corazon: true, ruinas: 0.5,
    menas: [[B.MENA_NITROGENO, 0.02, 20, 58], [B.HIELO, 0.02, 10, 50], [B.ORO, 0.004, 8, 30]], base: 'puesto' },
};

export function crearGeneradorRocoso(id, semilla) {
  const P = PERFILES[id];
  const s = ((semilla | 0) ^ (P.sal * 2654435761)) | 0;
  const rA = crearRuido(s), rB = crearRuido(s + 17), rC = crearRuido(s ^ 0x1b873593), rD = crearRuido(s + 91);
  const CE = P.cr.celda;
  const cache = new Map();
  const crater = (a, b) => {
    const k = a + ',' + b;
    if (cache.has(k)) return cache.get(k);
    if (cache.size > 4000) cache.clear();
    let r = null;
    if (hash2(a, b, s + 3) < P.cr.p) {
      const rad = P.cr.rmin + hash2(a, b, s + 5) * (P.cr.rmax - P.cr.rmin);
      r = { x: a * CE + 6 + hash2(a, b, s + 7) * (CE - 12), z: b * CE + 6 + hash2(a, b, s + 9) * (CE - 12), r: rad };
    }
    cache.set(k, r);
    return r;
  };
  const vx = P.volcan;

  function alturaEn(x, z) {
    let h = SUELO + rA.capas2(x / P.esc, z / P.esc, 3) * P.amp + rB.simplex2(x / 12, z / 12) * 0.8;
    const ix = Math.floor(x / CE), iz = Math.floor(z / CE);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = crater(ix + dx, iz + dz);
      if (!c) continue;
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d >= 1.35) continue;
      const prof = c.r * 0.4;
      if (d < 0.86) h -= prof * (1 - (d / 0.86) ** 2) * 0.9;
      else h += c.r * 0.09 * Math.sin(Math.PI * (d - 0.86) / 0.49);
    }
    if (P.canon) {   // cañón sinuoso (tipo Valles Marineris)
      const cz = 150 + 26 * Math.sin(x / 70) + 12 * Math.sin(x / 23);
      const w = Math.abs(z - cz);
      h -= 30 * (1 - suave(7, 22, w)) * suave(-40, 20, x + 200 * 0) ;
    }
    if (vx) {
      const d = Math.hypot(x - vx.x, z - vx.z);
      if (d < vx.R) { const t = 1 - d / vx.R; h += vx.H * t * t * (3 - 2 * t) * 1.2; if (d < vx.caldera) h -= (vx.caldera - d) * 0.8; }
    }
    if (P.surcos) h += Math.sin((x * 0.7 + z * 0.4) / 5 + rC.simplex2(x / 60, z / 60) * 4) * 1.6;
    if (P.dunas) h += Math.sin((x + rC.simplex2(x / 40, z / 40) * 25) / 7) * 1.5 * rB.simplex2(x / 90, z / 90);
    if (P.pozosLava) { const a = Math.floor(x / 64), b = Math.floor(z / 64); if (hash2(a, b, s + 40) < 0.45) { const px = a * 64 + 12 + hash2(a, b, s + 41) * 40, pz = b * 64 + 12 + hash2(a, b, s + 42) * 40, d = Math.hypot(x - px, z - pz), r = 7 + hash2(a, b, s + 43) * 6; if (d < r + 5) h -= 6 * (1 - suave(r - 2, r + 5, d)) - 1.5 * suave(r, r + 5, d); } }
    if (P.lagos) h -= 6 * suave(0.15, 0.5, rD.simplex2(x / 75, z / 75));
    if (P.lagosLava) h -= 7 * suave(0.45, 0.7, rD.simplex2(x / 80, z / 80));
    if (P.corazon) h -= 5 * suave(0.1, 0.4, rD.simplex2(x / 160, z / 160)) - 12 * suave(0.35, 0.6, rD.simplex2(x / 55 + 9, z / 55)) * 0.3;
    // meseta plana de la base
    const m = 1 - suave(26, 38, Math.hypot(x, z));
    h = h + (SUELO - h) * m;
    h = Math.round(h);
    return h < 10 ? 10 : h > ALTO - 18 ? ALTO - 18 : h;
  }

  const enCasquete = (x, z) => P.casquete && Math.abs(z) > P.casquete + rB.simplex2(x / 30, z / 30) * 14;
  // contexto de una columna (se calcula una vez por columna, no por bloque)
  const colCtx = (x, z) => ({
    cas: !!enCasquete(x, z),
    surco: !!P.surcos && rC.simplex2(x / 45 + 3, z / 45) > 0.15,
    corV: P.corazon ? rD.simplex2(x / 160, z / 160) : 0,
    corR: P.corazon ? rB.simplex2(x / 40 + 5, z / 40) > 0.2 : false,
    hieloSub: !!P.hieloSub && rC.simplex2(x / 20, z / 20) > 0.3,
  });
  const mat = (k, x, y, z, h, prof) => {   // prof: bloques bajo la superficie (0 = tope)
    const C = P.capas;
    if (k.cas) { if (prof === 0) return hash2(x, z, s + 2) < 0.5 ? B.HIELO_SECO : B.NIEVE; if (prof <= 2) return B.HIELO; }
    if (k.surco && prof < 3) return B.HIELO_GANIMEDES;
    if (P.bordeClaro && prof < 2 && hash2(x, z, s + 8) < 0.08) return B.HIELO;
    if (P.corazon && prof < 3) { if (k.corV > 0.1 && k.corV < 0.55 && h < SUELO + 1) return B.NITROGENO_PLUTON; if (k.corR) return B.ROCA_PLUTON; }
    if (k.hieloSub && prof >= 4 && prof < 9 && h > SUELO - 4 && hash3(x, y, z, s + 6) < 0.1) return B.HIELO;
    if (prof < 1) return C[0];
    if (prof < 4) return C[1];
    return C[2];
  };

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = SUELO;
    for (let z = 0; z < LADO; z++) {
      for (let x = 0; x < LADO; x++) {
        const wx = cx * LADO + x, wz = cz * LADO + z, col = z * LADO + x;
        const h = alturaEn(wx, wz);
        if (h > alturaMax) alturaMax = h;
        datos[col] = B.LECHO;
        if (P.oceano) {   // corteza de hielo sobre un océano
          const grieta = Math.abs(rC.simplex2(wx / 60, wz / 60)) < 0.05;
          const T = grieta ? 3 : 12 + Math.floor(rB.simplex2(wx / 40, wz / 40) * 3);
          for (let y = 1; y <= h; y++) {
            let b;
            if (y <= 20) b = B.ROCA_GANIMEDES;
            else if (y <= h - T) b = B.AGUA;
            else b = y === h && grieta ? B.HIELO_AGRIETADO : hash3(wx, y, wz, s + 4) < 0.012 && y < h - 3 ? B.MENA_SAL : hash3(wx, y, wz, s + 5) < 0.015 ? B.HIELO_AGRIETADO : B.HIELO_EUROPA;
            datos[y * CAPA + col] = b;
          }
        } else {
          const K = colCtx(wx, wz);
          const nivel = P.lagos ? P.lagos.nivel : (P.lagosLava ? SUELO - 6 : 0);
          for (let y = 1; y <= h; y++) {
            const prof = h - y;
            let b = mat(K, wx, y, wz, h, prof);
            if (prof >= 4) {
              const q = hash3(wx, y, wz, s + 77);
              let acum = 0;
              for (const [mid, pr, y0, y1] of P.menas) { acum += pr; if (q < acum) { if (y >= y0 && y <= y1) b = mid; break; } }
            } else if (P.hieloCrater && h < SUELO - 12 && y === h && hash2(wx, wz, s + 12) < 0.8) b = B.HIELO;
            datos[y * CAPA + col] = b;
          }
          if (P.lagos && h < nivel) for (let y = h + 1; y <= nivel; y++) datos[y * CAPA + col] = P.lagos.id;
          if (P.lagosLava && h < nivel) for (let y = h + 1; y <= nivel; y++) datos[y * CAPA + col] = B.LAVA;
          if (P.pozosLava && h < SUELO - 3) for (let y = h + 1; y <= SUELO - 3; y++) datos[y * CAPA + col] = B.LAVA;
          if (vx && P.volcan && id === 'io') { /* sin volcán único */ }
        }
        // rocas sueltas
        if (hash2(wx, wz, s + 11) > 0.9968 && Math.hypot(wx, wz) > 40 && !P.oceano && datos[(h + 1) * CAPA + col] === 0 && (!P.lagos || h >= P.lagos.nivel)) {
          const a = 1 + Math.floor(hash2(wx, wz, s + 12) * 2);
          for (let y = h + 1; y <= h + a && y < ALTO; y++) datos[y * CAPA + col] = P.capas[2];
          if (h + a > alturaMax) alturaMax = h + a;
        }
      }
    }
    // nubes ácidas flotando (Venus)
    if (P.nubes) {
      for (let z = 0; z < LADO; z++) for (let x = 0; x < LADO; x++) {
        const wx = cx * LADO + x, wz = cz * LADO + z, n = rD.simplex2(wx / 45, wz / 45 + 20);
        if (n > 0.35) { const y0 = 100 + Math.floor(rB.simplex2(wx / 70, wz / 70) * 5); for (let y = y0; y < y0 + 2 + (n > 0.55 ? 1 : 0); y++) datos[y * CAPA + z * LADO + x] = B.NUBE_ACIDA; alturaMax = Math.max(alturaMax, y0 + 3); }
      }
    }
    // base y ruinas
    if (P.base === 'agencia') alturaMax = Math.max(alturaMax, baseAgencia(datos, cx, cz, SUELO));
    else alturaMax = Math.max(alturaMax, puesto(datos, cx, cz, SUELO));
    if (P.ruinas) ruinas(datos, cx, cz);
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }

  // Ruinas misteriosas: anillos de piedra con una runa luminosa, escasos y lejos de la base
  function ruinas(datos, cx, cz) {
    const CR = 96;
    for (let a = Math.floor((cx * LADO - 8) / CR); a <= Math.floor((cx * LADO + 24) / CR); a++) for (let b = Math.floor((cz * LADO - 8) / CR); b <= Math.floor((cz * LADO + 24) / CR); b++) {
      if (hash2(a, b, s + 60) > P.ruinas) continue;
      const rx = Math.floor(a * CR + 12 + hash2(a, b, s + 61) * (CR - 24)), rz = Math.floor(b * CR + 12 + hash2(a, b, s + 62) * (CR - 24));
      if (Math.hypot(rx, rz) < 70) continue;
      const h = alturaEn(rx, rz);
      if (P.lagos && h < P.lagos.nivel + 1) continue;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const borde = Math.max(Math.abs(dx), Math.abs(dz)) === 3;
        ponerEn(datos, cx, cz, rx + dx, h, rz + dz, B.RUINA);
        if (borde && (dx + dz) % 2 === 0) { const alto = 2 + Math.floor(hash2(rx + dx, rz + dz, s + 63) * 3); cajaEn(datos, cx, cz, rx + dx, h + 1, rz + dz, rx + dx, h + alto, rz + dz, B.RUINA); ponerEn(datos, cx, cz, rx + dx, h + alto + 1, rz + dz, B.RUNA); }
      }
      cajaEn(datos, cx, cz, rx, h + 1, rz, rx, h + 3, rz, B.RUINA); ponerEn(datos, cx, cz, rx, h + 4, rz, B.RUNA);
    }
  }

  const buscarInicio = () => ({ x: 0.5, z: -4.5, y: SUELO + 1 });
  return { generarChunk, alturaEn, buscarInicio, biomaEn: () => id, version: 1, estructuras: NADA };
}

// ----------------------------------------------------------- Asteroides
export const PERFILES_AST = {
  cinturon: { sal: 0x4153, celda: 40, p: 0.7, rmin: 3, rmax: 10, grandes: 0.12, ids: [B.ROCA_ASTEROIDE, B.ROCA_ASTEROIDE, B.REGOLITO], menas: [[B.MENA_PLATINO, 0.035], [B.HIERRO, 0.04], [B.ORO, 0.02], [B.HIELO, 0.03], [B.MINERAL_DIAMANTE, 0.006]], puesto: true },
  kuiper: { sal: 0x4b55, celda: 46, p: 0.55, rmin: 3, rmax: 11, grandes: 0.1, ids: [B.ROCA_KUIPER, B.NITROGENO_PLUTON, B.HIELO], menas: [[B.MENA_COMETA, 0.04], [B.HIELO, 0.05], [B.MENA_NITROGENO, 0.02]], puesto: true },
  fobos: { sal: 0x464f, unico: { r: 26, y: 58 }, ids: [B.ROCA_ASTEROIDE, B.ROCA_ASTEROIDE, B.REGOLITO], menas: [[B.MENA_ESPINELA, 0.04], [B.HIERRO, 0.03], [B.HIELO, 0.02]], puesto: true },
  deimos: { sal: 0x444d, unico: { r: 20, y: 58 }, ids: [B.ROCA_ASTEROIDE, B.ROCA_ASTEROIDE, B.REGOLITO], menas: [[B.MENA_OLIVINO, 0.04], [B.HIERRO, 0.03], [B.HIELO, 0.02]], puesto: true },
};

export function crearGeneradorAsteroides(id, semilla) {
  const P = PERFILES_AST[id];
  const s = ((semilla | 0) ^ (P.sal * 2654435761)) | 0;
  const rA = crearRuido(s), rB = crearRuido(s + 5);
  const Y = 60;

  function roca(x, y, z) {     // ¿hay roca aquí? solo para el asteroide único
    const u = P.unico, dx = x, dy = (y - u.y) * 1.15, dz = z;
    const d = Math.hypot(dx, dy, dz);
    if (d > u.r * 1.3) return false;
    if (d < u.r * 0.7) return true;
    const e = Math.hypot(x - 8, z + 6);
    return d < u.r * (1 + 0.22 * rA.simplex3(x / 14, y / 14, z / 14)) && !(e < 7 && y > u.y + u.r * 0.7 - (7 - e));
  }
  function topeUnico(x, z) { for (let y = P.unico.y + P.unico.r + 8; y > 4; y--) if (roca(x, y, z)) return y; return -1; }

  let cima = -1;
  const cimaUnico = () => { if (cima < 0) { for (let z = -10; z <= 10; z += 2) for (let x = -10; x <= 10; x += 2) cima = Math.max(cima, topeUnico(x, z)); cima = Math.max(cima, 4); } return cima; };

  function material(x, y, z, sup) {
    const [pi, , pj] = P.ids;
    if (!sup) { const q = hash3(x, y, z, s + 77); let acum = 0; for (const [mid, pr] of P.menas) { acum += pr; if (q < acum) return mid; } }
    return sup ? pj : hash3(x, y, z, s + 9) < 0.5 ? pi : P.ids[1];
  }

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = 0;
    const bx = cx * LADO, bz = cz * LADO;
    if (P.unico) {
      const u = P.unico, R = Math.ceil(u.r * 1.4);
      if (intersecta(cx, cz, -R, -R, R, R)) {
        for (let z = 0; z < LADO; z++) for (let x = 0; x < LADO; x++) {
          const wx = bx + x, wz = bz + z;
          if (Math.abs(wx) > R || Math.abs(wz) > R) continue;
          let expuesto = true;
          const rho = Math.hypot(wx, wz); if (rho > u.r * 1.3) continue;
          const dy = Math.ceil(Math.sqrt(Math.max(0, (u.r * 1.3) ** 2 - rho * rho)) / 1.15) + 1;
          for (let y = Math.min(ALTO - 2, u.y + dy); y >= Math.max(2, u.y - dy); y--) {
            if (!roca(wx, y, wz)) continue;
            datos[y * CAPA + z * LADO + x] = material(wx, y, wz, expuesto);
            expuesto = false; if (y > alturaMax) alturaMax = y;
          }
        }
      }
      if (intersecta(cx, cz, -12, -12, 12, 12)) {
        const t = cimaUnico();
        for (let z = Math.max(-10, bz); z <= Math.min(10, bz + 15); z++) for (let x = Math.max(-10, bx); x <= Math.min(10, bx + 15); x++) {
          const col = (z - bz) * LADO + (x - bx); let y = t - 1; while (y > 2 && !datos[y * CAPA + col]) { datos[y * CAPA + col] = B.ROCA_ASTEROIDE; y--; }
          for (let yy = t + 1; yy < t + 10; yy++) datos[yy * CAPA + col] = 0;
        }
        alturaMax = Math.max(alturaMax, puesto(datos, cx, cz, t, {}));
      }
    } else {
      const C = P.celda;
      for (let ix = Math.floor((bx - 16) / C); ix <= Math.floor((bx + 32) / C); ix++) for (let iz = Math.floor((bz - 16) / C); iz <= Math.floor((bz + 32) / C); iz++) {
        if (hash2(ix, iz, s + 1) > P.p) continue;
        const grande = hash2(ix, iz, s + 14) < P.grandes;
        const ax = ix * C + 8 + hash2(ix, iz, s + 2) * (C - 16), az = iz * C + 8 + hash2(ix, iz, s + 3) * (C - 16);
        if (Math.hypot(ax, az) < 40) continue;
        const ay = 24 + hash2(ix, iz, s + 4) * 80, r = (grande ? P.rmax * 1.6 : P.rmin + hash2(ix, iz, s + 5) * (P.rmax - P.rmin));
        const Rr = Math.ceil(r + 3);
        for (let z = Math.max(bz, Math.floor(az - Rr)); z <= Math.min(bz + 15, Math.floor(az + Rr)); z++) for (let x = Math.max(bx, Math.floor(ax - Rr)); x <= Math.min(bx + 15, Math.floor(ax + Rr)); x++) {
          for (let y = Math.max(2, Math.floor(ay - Rr)); y <= Math.min(ALTO - 2, Math.floor(ay + Rr)); y++) {
            let d = Math.hypot(x - ax, (y - ay) * 1.25, z - az); if (d > r + 2.2) continue; if (d > r - 2.2) d += rA.simplex3(x / 5, y / 5, z / 5) * 1.8;
            if (d < r) { datos[y * CAPA + (z - bz) * LADO + (x - bx)] = material(x, y, z, d > r - 1.5 && hash3(x, y, z, s + 15) < 0.6); if (y > alturaMax) alturaMax = y; }
          }
        }
      }
      if (intersecta(cx, cz, -12, -12, 12, 12)) alturaMax = Math.max(alturaMax, puesto(datos, cx, cz, Y, {}));
    }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }
  const buscarInicio = () => (P.unico ? { x: 0.5, z: -4.5, y: cimaUnico() + 1 } : { x: 0.5, z: -4.5, y: Y + 1 });
  return { generarChunk, alturaEn: (x, z) => (P.unico ? topeUnico(Math.floor(x), Math.floor(z)) : Y), buscarInicio, biomaEn: () => id, version: 1, estructuras: NADA };
}

// ----------------------------------------------------------- Gigantes y anillos
export const PERFILES_GIG = {
  jupiter: { sal: 0x4a55, bandas: [B.NUBE_CREMA, B.NUBE_AMBAR, B.NUBE_ROJA, B.NUBE_AMBAR, B.NUBE_CREMA], banda: 56, mancha: { x: 230, z: 90, r: 60 }, mena: [B.MENA_AMONIACO, 0.03], escala: 60, umbral: 0.0, tope: 60, grueso: 12 },
  urano: { sal: 0x5552, bandas: [B.NUBE_URANO, B.HIELO_AZUL, B.NUBE_URANO], banda: 70, mena: [B.MENA_DEUTERIO, 0.03], escala: 55, umbral: 0.05, tope: 60, grueso: 10 },
  neptuno: { sal: 0x4e45, bandas: [B.NUBE_NEPTUNO, B.NUBE_NEPTUNO, B.HIELO_AZUL, B.NUBE_NEPTUNO], banda: 60, mena: [B.MENA_DIAMANTE_HELADO, 0.03], escala: 50, umbral: 0.1, tope: 60, grueso: 9 },
  saturno: { sal: 0x5341, anillo: true, bandas: [B.ANILLO_HIELO, B.ANILLO_ROCA, B.ANILLO_HIELO], banda: 40, mena: [B.HIELO, 0.02], escala: 16, umbral: -0.05, tope: 62, grueso: 3 },
};

export function crearGeneradorGigante(id, semilla) {
  const P = PERFILES_GIG[id];
  const s = ((semilla | 0) ^ (P.sal * 2654435761)) | 0;
  const rA = crearRuido(s), rB = crearRuido(s + 23), rC = crearRuido(s ^ 0x2545f491);
  const R_EST = 24;

  function isla(x, z) {   // { tope, fondo } de la isla en esa columna, o null
    const dc = Math.hypot(x, z);
    const m = P.anillo ? rA.simplex2(x / P.escala, z / P.escala) * 0.8 + rB.simplex2(x / 5, z / 5) * 0.15 : rA.capas2(x / P.escala, z / P.escala, 2) + rB.simplex2(x / 140, z / 140 + 9) * 0.25;
    const r = m - P.umbral;
    let tope = P.tope + Math.round(rC.simplex2(x / 60, z / 60) * (P.anillo ? 3 : 7));
    let grueso = P.anillo ? 1 + Math.round(Math.max(0, r) * 5) : 2 + Math.round(Math.max(0, r) * P.grueso * 1.6);
    if (dc < R_EST + 8) { const t = 1 - suave(R_EST - 4, R_EST + 8, dc); if (t > 0.01) { tope = Math.round(P.tope + (P.tope - tope) * 0); grueso = Math.max(grueso, 3 + Math.round(t * 6)); return { tope: P.tope, fondo: P.tope - grueso, central: true, d: dc }; } }
    if (r <= 0) return null;
    return { tope, fondo: tope - grueso };
  }
  const materialDe = (x, z) => {
    if (P.mancha) { const d = Math.hypot(x - P.mancha.x, z - P.mancha.z); if (d < P.mancha.r * (0.8 + 0.2 * rB.simplex2(x / 20, z / 20))) return B.NUBE_ROJA; }
    const k = Math.floor((z + 4000) / P.banda + rB.simplex2(x / 120, z / 90) * 0.6);
    return P.bandas[((k % P.bandas.length) + P.bandas.length) % P.bandas.length];
  };

  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = 0;
    for (let z = 0; z < LADO; z++) for (let x = 0; x < LADO; x++) {
      const wx = cx * LADO + x, wz = cz * LADO + z, col = z * LADO + x;
      const I = isla(wx, wz);
      if (!I) continue;
      const m = materialDe(wx, wz);
      for (let y = Math.max(2, I.fondo); y <= I.tope; y++) {
        let b = m;
        if (y < I.tope - 1 && hash3(wx, y, wz, s + 3) < P.mena[1] * 0.4) b = P.mena[0];
        datos[y * CAPA + col] = b;
      }
      if (I.tope > alturaMax) alturaMax = I.tope;
      // pilares y crestas de hielo sobre las islas (Saturno, Urano, Neptuno)
      if ((P.anillo || id !== 'jupiter') && !I.central && hash2(wx, wz, s + 8) > 0.994) { const a = 1 + Math.floor(hash2(wx, wz, s + 9) * 3); for (let y = I.tope + 1; y <= I.tope + a; y++) datos[y * CAPA + col] = P.anillo ? B.ANILLO_HIELO : B.HIELO_AZUL; alturaMax = Math.max(alturaMax, I.tope + a); }
    }
    if (intersecta(cx, cz, -12, -12, 12, 12)) alturaMax = Math.max(alturaMax, puesto(datos, cx, cz, P.tope, {}));
    // anillo de barandas del puesto (para no caerse al abismo de gas)
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }
  const buscarInicio = () => ({ x: 0.5, z: -4.5, y: P.tope + 1 });
  return { generarChunk, alturaEn: (x, z) => { const I = isla(Math.floor(x), Math.floor(z)); return I ? I.tope : 2; }, buscarInicio, biomaEn: () => id, version: 1, estructuras: NADA };
}

// ----------------------------------------------------------- Cabina de la nave (dimensión "transito")
export const CABINA = { X: 8000, Z: 8000, Y: 60 };
export function crearGeneradorTransito() {
  const { X, Z, Y } = CABINA;
  function generarChunk(cx, cz) {
    const datos = new Uint8Array(CAPA * ALTO);
    let alturaMax = 0;
    if (intersecta(cx, cz, X - 9, Z - 12, X + 9, Z + 12)) {
      const c = (x0, y0, z0, x1, y1, z1, i) => cajaEn(datos, cx, cz, X + x0, Y + y0, Z + z0, X + x1, Y + y1, Z + z1, i);
      const p = (x, y, z, i) => ponerEn(datos, cx, cz, X + x, Y + y, Z + z, i);
      c(-8, -1, -11, 8, -1, 11, B.METAL);                      // suelo
      c(-8, 0, -11, 8, 6, 11, B.CABINA_NAVE);                  // casco
      c(-7, 0, -10, 7, 5, 10, B.AIRE);                         // interior
      c(-7, 1, -11, 7, 4, -11, B.VIDRIO);                      // ventanal de proa
      for (const lado of [-8, 8]) c(lado, 2, -7, lado, 3, 7, B.VIDRIO);   // ventanas laterales
      c(-7, 5, -10, 7, 5, 10, B.METAL);
      for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, 0]]) p(x, 5, z, B.PIEDRA_LUMINOSA);
      // puente de mando (proa)
      p(-3, 0, -9, B.CONSOLA_NAV); p(-1, 0, -9, B.PANEL_CONTROL); p(1, 0, -9, B.SURTIDOR); p(3, 0, -9, B.CONSOLA_NAV);
      // soporte vital y carga
      p(-6, 0, 2, B.GENERADOR_O2); p(-6, 0, 4, B.CARGADOR); p(-6, 0, 6, B.FABRICA);
      // bodega: cofres en la popa
      for (const x of [-5, -3, 3, 5]) p(x, 0, 9, B.COFRE);
      alturaMax = Y + 7;
    }
    return { datos, alturaMax: Math.min(ALTO - 1, alturaMax + 1), humos: [], puntos: [] };
  }
  return { generarChunk, alturaEn: () => Y - 1, buscarInicio: () => ({ x: X + 0.5, z: Z - 5.5, y: Y }), biomaEn: () => 'transito', version: 1, estructuras: NADA };
}

// Fábrica de estos generadores (la usa generadoresDim.crearGeneradorDim)
export function crearGeneradorSolar(id, semilla) {
  if (PERFILES[id]) return crearGeneradorRocoso(id, semilla);
  if (PERFILES_AST[id]) return crearGeneradorAsteroides(id, semilla);
  if (PERFILES_GIG[id]) return crearGeneradorGigante(id, semilla);
  if (id === 'transito') return crearGeneradorTransito();
  return null;
}
