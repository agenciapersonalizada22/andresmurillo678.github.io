// =============================================================
//  📐  PLANOS DE ESTRUCTURAS
//  Una estructura (casa, torre, mina...) se describe como una lista
//  de "operaciones": llenar una caja de bloques con un tipo de bloque.
//  Cada chunk que toca la estructura ejecuta las operaciones, pero
//  solo escribe la parte que cae dentro de él. Así las estructuras
//  salen igualitas sin importar en qué orden se creen los chunks.
//  La clase Plantilla dibuja con coordenadas "de la casa" (ancho,
//  alto, fondo) y las gira hacia donde se quiera.
// =============================================================
import { B, ORIENTADOS } from './bloques.js';
import { LADO, ALTO, CAPA } from './medidas.js';

// ¿Qué bloques tienen 4 variantes según hacia dónde miran?
const FAMILIA = new Map();
for (const lista of Object.values(ORIENTADOS)) {
  if (new Set(lista).size === 4) lista.forEach((id, f) => FAMILIA.set(id, { lista, f }));
}
const PAR_X = { [B.PUERTA_X]: B.PUERTA_Z, [B.PUERTA_Z]: B.PUERTA_X, [B.PUERTA_X_ABIERTA]: B.PUERTA_Z_ABIERTA, [B.PUERTA_Z_ABIERTA]: B.PUERTA_X_ABIERTA, [B.RIEL_X]: B.RIEL_Z, [B.RIEL_Z]: B.RIEL_X };

// Gira un bloque (escalera, cofre, cama, puerta, riel) un cuarto de vuelta "rot" veces
export function girarId(id, rot) {
  const fam = FAMILIA.get(id);
  if (fam) return fam.lista[(fam.f + rot) & 3];
  if ((rot & 1) && PAR_X[id] !== undefined) return PAR_X[id];
  return id;
}

export class Plano {
  constructor() {
    this.ops = [];
    this.x0 = 1e9; this.y0 = 1e9; this.z0 = 1e9;
    this.x1 = -1e9; this.y1 = -1e9; this.z1 = -1e9;
    this.puntos = []; // lugares donde aparece un vehículo
    this.cofres = []; // [x, y, z]
    this.humos = [];  // [x, y, z] chimeneas
  }

  caja(xa, ya, za, xb, yb, zb, id) {
    const x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    const y0 = Math.min(ya, yb), y1 = Math.max(ya, yb);
    const z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    this.ops.push(x0, y0, z0, x1, y1, z1, id);
    if (x0 < this.x0) this.x0 = x0;
    if (y0 < this.y0) this.y0 = y0;
    if (z0 < this.z0) this.z0 = z0;
    if (x1 > this.x1) this.x1 = x1;
    if (y1 > this.y1) this.y1 = y1;
    if (z1 > this.z1) this.z1 = z1;
  }

  pon(x, y, z, id) { this.caja(x, y, z, x, y, z, id); }

  // Ejecuta las operaciones que caen dentro del chunk (cx, cz). Devuelve el bloque más alto que escribió.
  ejecutar(datos, cx, cz) {
    const bx = cx * LADO, bz = cz * LADO;
    if (this.x1 < bx || this.x0 > bx + 15 || this.z1 < bz || this.z0 > bz + 15) return 0;
    const ops = this.ops;
    let tope = 0;
    for (let i = 0; i < ops.length; i += 7) {
      let xa = ops[i], za = ops[i + 2], xb = ops[i + 3], zb = ops[i + 5];
      if (xb < bx || xa > bx + 15 || zb < bz || za > bz + 15) continue;
      let ya = ops[i + 1], yb = ops[i + 4];
      if (ya < 1) ya = 1;
      if (yb >= ALTO) yb = ALTO - 1;
      if (ya > yb) continue;
      if (xa < bx) xa = bx;
      if (xb > bx + 15) xb = bx + 15;
      if (za < bz) za = bz;
      if (zb > bz + 15) zb = bz + 15;
      const id = ops[i + 6];
      for (let y = ya; y <= yb; y++) {
        for (let z = za; z <= zb; z++) {
          const fila = y * CAPA + (z - bz) * LADO - bx;
          for (let x = xa; x <= xb; x++) datos[fila + x] = id;
        }
      }
      if (id !== B.AIRE && yb > tope) tope = yb;
    }
    return tope;
  }
}

// Dibuja con coordenadas locales: a = ancho (0..w-1), c = fondo (0..l-1), y = altura
// (0 = el piso). El frente de la casa es c = 0 y "rot" la gira: 0 deja el fondo hacia
// +Z (sur), 1 hacia -X (oeste), 2 hacia -Z (norte), 3 hacia +X (este).
// (fx, fz) es el mundo donde cae el centro del frente.
export class Plantilla {
  constructor(plano, fx, nivel, fz, rot, w, l) {
    this.plano = plano;
    this.rot = rot & 3;
    this.w = w; this.l = l;
    this.nivel = nivel;
    const [ox, oz] = this.desplazar(w >> 1, 0);
    this.ox = fx - ox;
    this.oz = fz - oz;
  }

  desplazar(a, c) {
    const { w, l } = this;
    switch (this.rot) {
      case 0: return [a, c];
      case 1: return [l - 1 - c, a];
      case 2: return [w - 1 - a, l - 1 - c];
      default: return [c, w - 1 - a];
    }
  }

  mundo(a, c) {
    const [x, z] = this.desplazar(a, c);
    return [this.ox + x, this.oz + z];
  }

  // Rectángulo que ocupa en el mundo (con margen)
  rect(margen = 0) {
    const e = [this.mundo(0, 0), this.mundo(this.w - 1, this.l - 1)];
    return {
      x0: Math.min(e[0][0], e[1][0]) - margen, x1: Math.max(e[0][0], e[1][0]) + margen,
      z0: Math.min(e[0][1], e[1][1]) - margen, z1: Math.max(e[0][1], e[1][1]) + margen,
    };
  }

  caja(a0, y0, c0, a1, y1, c1, id) {
    const [xa, za] = this.mundo(a0, c0), [xb, zb] = this.mundo(a1, c1);
    this.plano.caja(xa, this.nivel + y0, za, xb, this.nivel + y1, zb, girarId(id, this.rot));
  }

  pon(a, y, c, id) { this.caja(a, y, c, a, y, c, id); }

  // Las 4 paredes (anillo) de una altura
  anillo(y0, y1, id, a0 = 0, c0 = 0, a1 = this.w - 1, c1 = this.l - 1) {
    this.caja(a0, y0, c0, a1, y1, c0, id);
    this.caja(a0, y0, c1, a1, y1, c1, id);
    this.caja(a0, y0, c0, a0, y1, c1, id);
    this.caja(a1, y0, c0, a1, y1, c1, id);
  }

  // Cofre mirando hacia adentro; f local (0 = hacia +c)
  cofre(a, y, c, f = 0) {
    const [x, z] = this.mundo(a, c);
    this.plano.cofres.push([x, this.nivel + y, z]);
    this.pon(a, y, c, B.COFRE + f);
  }
}
