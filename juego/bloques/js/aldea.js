// =============================================================
//  🏘️  ALDEAS
//  Una plaza con pozo en el centro, calles de tierra que salen en
//  cruz, y casas, granjas, herrería, biblioteca, iglesia y garaje
//  a los lados de las calles. Cada edificio se nivela con el suelo
//  (cimientos si queda bajo, se corta si queda alto) y se acomoda
//  mirando a la calle. Con la misma semilla sale siempre igual.
// =============================================================
import { B } from './bloques.js';
import { azarConSemilla } from './ruido.js';
import { Plano, Plantilla } from './plano.js';
import { EDIFICIOS, PALETAS, pozo } from './edificios.js';
import { CONFIG } from './config.js';

const MAR = CONFIG.mundo.nivelMar;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Nivela el terreno bajo un rectángulo: aire arriba, relleno abajo
export function aplanar(plano, gen, r, nivel, pal, base = pal.base) {
  plano.caja(r.x0, nivel + 1, r.z0, r.x1, nivel + 18, r.z1, B.AIRE);
  const relleno = pal.tope === B.ARENA ? B.ARENISCA : B.TIERRA;
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const h = gen.alturaEn(x, z);
      const borde = x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1;
      if (h < nivel) {
        plano.caja(x, h, z, x, nivel - 1, z, borde ? relleno : base);
        plano.pon(x, nivel, z, borde ? pal.tope : base);
      } else if (h > nivel) {
        plano.pon(x, nivel, z, borde ? pal.tope : base);
      }
    }
  }
}

// ¿Cabe un edificio aquí? (sin agua y sin mucho desnivel)
export function cabe(gen, r, nivel, tolerancia = 3) {
  for (let z = r.z0 + 1; z <= r.z1 - 1; z++) {
    for (let x = r.x0 + 1; x <= r.x1 - 1; x++) {
      const h = gen.alturaEn(x, z);
      if (h <= MAR || h < nivel - tolerancia || h > nivel + tolerancia) return false;
    }
  }
  return true;
}

export const solapa = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.z0 <= b.z1 && a.z1 >= b.z0;

function rotDeAlejarse(px, pz) {
  if (pz > 0) return 0;
  if (px < 0) return 1;
  if (pz < 0) return 2;
  return 3;
}

export function planAldea(inst, gen) {
  const plano = new Plano();
  const az = azarConSemilla(inst.sal);
  const cx = inst.x, cz = inst.z;
  const bioma = gen.biomaEn(cx, cz);
  const pal = PALETAS[bioma] || PALETAS.llanura;
  const nivelPlaza = gen.alturaEn(cx, cz);
  const rects = [];

  // plaza con pozo
  const rp = { x0: cx - 4, x1: cx + 4, z0: cz - 4, z1: cz + 4 };
  aplanar(plano, gen, rp, nivelPlaza, pal);
  plano.caja(cx - 4, nivelPlaza, cz - 4, cx + 4, nivelPlaza, cz + 4, pal.camino);
  const Tp = new Plantilla(plano, cx, nivelPlaza, cz - 2, 0, 5, 5);
  pozo(Tp, pal);
  rects.push(rp);

  // calles
  const brazos = [];
  const quiere = DIRS.map(() => az() < 0.88);
  if (quiere.filter(Boolean).length < 2) quiere[0] = quiere[1] = true;
  DIRS.forEach(([dx, dz], i) => {
    if (!quiere[i]) return;
    const largo = 24 + Math.floor(az() * 24);
    const px = -dz, pz = dx;
    let hasta = 5;
    for (let d = 5; d <= largo; d++) {
      const x = cx + dx * d, z = cz + dz * d;
      const hc = gen.alturaEn(x, z);
      if (hc <= MAR) break;
      hasta = d;
      for (let o = -1; o <= 1; o++) {
        const wx = x + px * o, wz = z + pz * o;
        const h = o === 0 ? hc : gen.alturaEn(wx, wz);
        if (h <= MAR) continue;
        plano.caja(wx, h + 1, wz, wx, h + 7, wz, B.AIRE);
        plano.pon(wx, h, wz, pal.camino);
      }
    }
    brazos.push({ dx, dz, px, pz, largo: hasta });
  });

  // cola de edificios: los importantes primero
  const cola = ['garaje', 'iglesia', 'casa', 'herreria', 'granja', 'biblioteca', 'casaGrande', 'cabana', 'granja', 'casa'];
  const comunes = ['casa', 'cabana', 'casaGrande', 'granja', 'casa', 'cabana'];
  if (az() < 0.35) cola.splice(1, 0, 'hangar');
  const colocados = {};

  const sentidos = [];
  for (const b of brazos) { sentidos.push([b, 1]); sentidos.push([b, -1]); }
  for (const [b, s] of sentidos) {
    let d = 9;
    let intentos = 0;
    while (d < b.largo - 5 && intentos < 40) {
      intentos++;
      const nombre = cola.length ? cola[0] : comunes[Math.floor(az() * comunes.length)];
      const def = EDIFICIOS[nombre];
      const D = d + (def.w >> 1);
      const sx = cx + b.dx * D, sz = cz + b.dz * D;
      const ax = b.px * s, az2 = b.pz * s;           // hacia afuera de la calle
      const fx = sx + ax * 3, fz = sz + az2 * 3;      // centro del frente
      const hCalle = gen.alturaEn(sx + ax, sz + az2);
      const rot = rotDeAlejarse(ax, az2);
      const T = new Plantilla(plano, fx, hCalle, fz, rot, def.w, def.l);
      const r = T.rect(1);
      const choca = rects.some((o) => solapa(r, { x0: o.x0 - 1, x1: o.x1 + 1, z0: o.z0 - 1, z1: o.z1 + 1 }));
      if (choca || hCalle <= MAR || !cabe(gen, r, hCalle, 3)) {
        if (nombre === cola[0] && (colocados['f_' + nombre] = (colocados['f_' + nombre] || 0) + 1) > 4) cola.shift();
        d += 4;
        continue;
      }
      if (nombre === cola[0]) cola.shift();
      aplanar(plano, gen, r, hCalle, pal, def.campo ? (pal.tope === B.ARENA ? B.ARENISCA : B.TIERRA) : pal.base);
      def.construir(T, pal);
      if (!def.campo) T.pon(def.w >> 1, 0, -1, pal.camino);
      rects.push(r);
      d += def.w + 2;
    }
  }

  // farolas en las calles
  for (const b of brazos) {
    for (let d = 7; d < b.largo; d += 9) {
      const lado = ((d / 9) | 0) % 2 ? 1 : -1;
      const x = cx + b.dx * d + b.px * lado, z = cz + b.dz * d + b.pz * lado;
      const h = gen.alturaEn(x, z);
      if (h <= MAR) continue;
      plano.caja(x, h + 1, z, x, h + 3, z, B.VALLA);
      plano.pon(x, h + 4, z, B.PIEDRA_LUMINOSA);
    }
  }
  // farolas de la plaza
  for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    plano.caja(cx + ox, nivelPlaza + 1, cz + oz, cx + ox, nivelPlaza + 3, cz + oz, B.VALLA);
    plano.pon(cx + ox, nivelPlaza + 4, cz + oz, B.PIEDRA_LUMINOSA);
  }
  return plano;
}

// Radio aproximado para saber cuáles chunks toca
export const RADIO_ALDEA = 62;
