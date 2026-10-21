// =============================================================
//  ⛏️  ESTRUCTURAS SUBTERRÁNEAS
//  Mazmorras (cuartos de piedra con musgo, cofres y una antorcha)
//  y minas abandonadas (túneles con rieles, vigas, postes, antorchas
//  y cofres, con una rampa para salir a la superficie).
// =============================================================
import { B } from './bloques.js';
import { azarConSemilla } from './ruido.js';
import { Plano } from './plano.js';
import { CONFIG } from './config.js';

const MAR = CONFIG.mundo.nivelMar;
const AIRE = B.AIRE;

// ----------------------------------------------------------- Mazmorra
export function planMazmorra(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const hs = gen.alturaEn(inst.x, inst.z);
  const hw = 2 + Math.floor(az() * 2), hl = 2 + Math.floor(az() * 2); // medio ancho y medio largo
  const y0 = Math.max(10, Math.min(hs - 12, 14 + Math.floor(az() * 22)));
  const x0 = inst.x - hw, x1 = inst.x + hw, z0 = inst.z - hl, z1 = inst.z + hl;
  // caja de piedra, y adentro el cuarto
  plano.caja(x0 - 1, y0 - 1, z0 - 1, x1 + 1, y0 + 4, z1 + 1, B.ADOQUIN);
  plano.caja(x0, y0, z0, x1, y0 + 3, z1, AIRE);
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let y = y0 - 1; y <= y0 + 4; y++) {
        const borde = x < x0 || x > x1 || z < z0 || z > z1 || y < y0 || y > y0 + 3;
        if (borde && az() < 0.45) plano.pon(x, y, z, B.ADOQUIN_MUSGOSO);
      }
    }
  }
  // columna y antorcha en una esquina
  plano.caja(x0, y0, z0, x0, y0 + 1, z0, B.VALLA);
  plano.pon(x0, y0 + 2, z0, B.ANTORCHA);
  plano.caja(x1, y0, z1, x1, y0 + 1, z1, B.VALLA);
  plano.pon(x1, y0 + 2, z1, B.ANTORCHA);
  // cofres
  const lados = [[x0, z0 + 1, 3], [x1, z1 - 1, 1], [x0 + 1, z1, 2], [x1 - 1, z0, 0]];
  const n = 1 + Math.floor(az() * 2);
  for (let i = 0; i < n; i++) {
    const [x, z, f] = lados[(Math.floor(az() * 4) + i) % 4];
    plano.cofres.push([x, y0, z]);
    plano.pon(x, y0, z, B.COFRE + f);
  }
  // un tapón de grava para que no se vea de afuera
  return plano;
}

// ----------------------------------------------------------- Mina abandonada
const TUNEL_ALTO = 3;

function pasillo(plano, az, x0, z0, eje, largo, y, conTesoro) {
  // eje 'x': recorre +x; 'z': recorre +z. 3 de ancho y 3 de alto. Piso de grava con rieles al centro.
  const dx = eje === 'x' ? 1 : 0, dz = eje === 'x' ? 0 : 1;
  const px = dz, pz = dx; // perpendicular
  const x1 = x0 + dx * largo, z1 = z0 + dz * largo;
  // aire
  plano.caja(Math.min(x0, x1) - px, y + 1, Math.min(z0, z1) - pz, Math.max(x0, x1) + px, y + TUNEL_ALTO, Math.max(z0, z1) + pz, AIRE);
  // piso de grava
  plano.caja(Math.min(x0, x1) - px, y, Math.min(z0, z1) - pz, Math.max(x0, x1) + px, y, Math.max(z0, z1) + pz, B.GRAVA);
  // rieles
  plano.caja(x0, y + 1, z0, x1, y + 1, z1, eje === 'x' ? B.RIEL_X : B.RIEL_Z);
  // soportes cada 5 bloques
  for (let d = 2; d < largo; d += 5) {
    const cx = x0 + dx * d, cz = z0 + dz * d;
    plano.caja(cx - px, y + 1, cz - pz, cx - px, y + 2, cz - pz, B.VALLA);
    plano.caja(cx + px, y + 1, cz + pz, cx + px, y + 2, cz + pz, B.VALLA);
    plano.caja(cx - px, y + 3, cz - pz, cx + px, y + 3, cz + pz, B.TABLAS);
    if (((d - 2) / 5) % 2 === 0) plano.pon(cx - px * 1, y + 1, cz - pz * 1, B.ANTORCHA);
  }
  if (conTesoro) {
    const cx = x1 + dx, cz = z1 + dz;
    plano.caja(cx - px, y + 1, cz - pz, cx + px, y + 3, cz + pz, AIRE);
    const f = eje === 'x' ? 1 : 2; // mira hacia el pasillo
    plano.cofres.push([cx, y + 1, cz]);
    plano.pon(cx, y + 1, cz, B.COFRE + f);
    plano.pon(cx - px, y + 1, cz - pz, B.ANTORCHA);
  }
}

export function planMina(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const hs = gen.alturaEn(inst.x, inst.z);
  const y = Math.max(12, Math.min(40, hs - 26));
  const hx = inst.x, hz = inst.z;
  const L1 = 18 + Math.floor(az() * 14), L2 = 18 + Math.floor(az() * 14);
  const L3 = 14 + Math.floor(az() * 12), L4 = 12 + Math.floor(az() * 10);
  // cruce de pasillos
  pasillo(plano, az, hx - L1, hz, 'x', L1 + L2, y, false);
  pasillo(plano, az, hx, hz - L3, 'z', L3 + L4, y, false);
  // salas en las puntas y ramas con cofres
  const ramas = [
    [hx - L1, hz, 'z', 10, true], [hx + L2 - 6, hz, 'z', 9, true], [hx + 8, hz, 'z', -9, false],
    [hx - 10, hz + L4, 'x', 11, true], [hx, hz - L3, 'x', -8, false],
  ];
  for (const [rx, rz, eje, largo, tesoro] of ramas) {
    if (az() < 0.2) continue;
    if (largo < 0) pasillo(plano, az, eje === 'x' ? rx + largo : rx, eje === 'z' ? rz + largo : rz, eje, -largo, y, tesoro);
    else pasillo(plano, az, rx, rz, eje, largo, y, tesoro);
  }
  // sala del cruce: más alta, con cofre y antorchas
  plano.caja(hx - 3, y + 1, hz - 3, hx + 3, y + 4, hz + 3, AIRE);
  plano.caja(hx - 3, y, hz - 3, hx + 3, y, hz + 3, B.GRAVA);
  plano.caja(hx - 3, y + 1, hz, hx + 3, y + 1, hz, B.RIEL_X);
  plano.caja(hx, y + 1, hz - 3, hx, y + 1, hz + 3, B.RIEL_Z);
  plano.pon(hx, y + 1, hz, B.RIEL_X);
  for (const [ox, oz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { plano.caja(hx + ox, y + 1, hz + oz, hx + ox, y + 3, hz + oz, B.TRONCO); }
  plano.pon(hx + 2, y + 1, hz + 2, B.ANTORCHA);
  plano.pon(hx - 2, y + 1, hz - 2, B.ANTORCHA);
  plano.cofres.push([hx + 2, y + 1, hz - 2]);
  plano.pon(hx + 2, y + 1, hz - 2, B.COFRE + 1);
  plano.puntos.push({ tipo: 'vagoneta', x: hx - 1 + 0.5, y: y + 1, z: hz + 0.5, yaw: Math.PI / 2 });

  // rampa para salir: sube 1 bloque cada 2 hacia +x desde el final del pasillo
  let rx = hx + L2 + 1, ry = y;
  for (let k = 0; k < 120; k++) {
    const h = gen.alturaEn(rx, hz);
    if (ry + 4 >= h) {
      // boca de la mina en la superficie: marco de vigas
      plano.caja(rx - 2, ry + 1, hz - 1, rx + 2, ry + 5, hz + 1, AIRE);
      plano.caja(rx, ry, hz - 1, rx, ry + 4, hz - 1, B.TRONCO); plano.caja(rx, ry, hz + 1, rx, ry + 4, hz + 1, B.TRONCO);
      plano.caja(rx, ry + 4, hz - 1, rx, ry + 4, hz + 1, B.TABLAS);
      plano.pon(rx + 1, ry + 1, hz - 1, B.ANTORCHA);
      break;
    }
    plano.caja(rx, ry + 1, hz - 1, rx, ry + TUNEL_ALTO + 1, hz + 1, AIRE);
    plano.caja(rx, ry, hz - 1, rx, ry, hz + 1, B.TABLAS);
    if (k % 2 === 1) ry++;
    if (k % 6 === 3) {
      plano.caja(rx, ry + 1, hz - 1, rx, ry + 2, hz - 1, B.VALLA);
      plano.caja(rx, ry + 1, hz + 1, rx, ry + 2, hz + 1, B.VALLA);
      plano.caja(rx, ry + 3, hz - 1, rx, ry + 3, hz + 1, B.TABLAS);
    }
    rx++;
  }
  return plano;
}
