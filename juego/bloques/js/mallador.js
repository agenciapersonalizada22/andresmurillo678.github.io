// =============================================================
//  🔺  MALLADOR (convierte bloques en triángulos)
//  La tarjeta de video no sabe qué es un "bloque": solo dibuja
//  triángulos. Aquí recorremos un chunk y, por cada cara de bloque
//  que da al aire (o a algo transparente), agregamos un cuadrito
//  (2 triángulos). Las caras tapadas NO se dibujan: así el juego
//  va rápido.
//  También oscurecemos un poquito las esquinas pegadas a otros
//  bloques ("oclusión ambiental"): da sensación de profundidad.
// =============================================================
import {
  B, DIBUJO, OPACO, SOMBREA, TEXTURA_CARA, ES_HOJAS, EMISION,
  DIBUJO_RECORTE, DIBUJO_AGUA, DIBUJO_PLANTA, DIBUJO_MODELO,
} from './bloques.js';
import { LISTA_TEXTURAS, uvTextura, indiceTextura } from './texturas.js';
import { cajasDe } from './formas.js';

// El "volumen" que recibe el mallador es el chunk con 1 bloque de
// sus vecinos alrededor: 18 x 18 de ancho y (alto + 2) de alto.
export const P = 18;
export const PCAPA = P * P;

const UV = new Float32Array(LISTA_TEXTURAS.length * 4);
LISTA_TEXTURAS.forEach((_, i) => UV.set(uvTextura(i), i * 4));

// Las 6 caras: hacia dónde miran, sus 4 esquinas (abajo-izq, abajo-der,
// arriba-der, arriba-izq) y qué tan iluminadas están.
const CARAS = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], luz: 0.72 },  // +X
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], luz: 0.72 }, // -X
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], luz: 1.0 },   // arriba
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], luz: 0.55 }, // abajo
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], luz: 0.86 },  // +Z
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], luz: 0.86 }, // -Z
];
const desplazar = (d) => d[0] + d[2] * P + d[1] * PCAPA;
const VECINO = CARAS.map((c) => desplazar(c.n));

// Para cada cara y esquina: los 3 vecinos que pueden hacerle sombra
const AO = new Int32Array(6 * 4 * 3);
CARAS.forEach((c, f) => {
  const ejes = [0, 1, 2].filter((e) => c.n[e] === 0);
  c.v.forEach((v, k) => {
    const s1 = c.n.slice(), s2 = c.n.slice(), esq = c.n.slice();
    const d1 = v[ejes[0]] ? 1 : -1, d2 = v[ejes[1]] ? 1 : -1;
    s1[ejes[0]] += d1;
    s2[ejes[1]] += d2;
    esq[ejes[0]] += d1;
    esq[ejes[1]] += d2;
    AO.set([desplazar(s1), desplazar(s2), desplazar(esq)], (f * 4 + k) * 3);
  });
});
const NIVEL_AO = [0.45, 0.62, 0.8, 1.0];

// Lo mismo pero como (dx, dy, dz), para saber qué tan "bajo techo" está cada esquina
const AO_D = new Int8Array(6 * 4 * 3 * 3);
CARAS.forEach((c, f) => {
  const ejes = [0, 1, 2].filter((e) => c.n[e] === 0);
  c.v.forEach((v, k) => {
    const d1 = v[ejes[0]] ? 1 : -1, d2 = v[ejes[1]] ? 1 : -1;
    const celdas = [c.n.slice(), c.n.slice(), c.n.slice()];
    celdas[0][ejes[0]] += d1;
    celdas[1][ejes[1]] += d2;
    celdas[2][ejes[0]] += d1;
    celdas[2][ejes[1]] += d2;
    celdas.forEach((d, i) => AO_D.set(d, ((f * 4 + k) * 3 + i) * 3));
  });
});

// "Luz del cielo": si un lugar tiene bloques encima (cuevas, bajo los
// árboles), se ve más oscuro. Entre más hondo, más oscuro.
const LUZ_CIELO = new Float32Array(300);
for (let d = 0; d < LUZ_CIELO.length; d++) LUZ_CIELO[d] = d <= 0 ? 1 : 0.2 + 0.8 * Math.exp(-d * 0.14);
let CIMA = null; // altura del bloque más alto que da sombra, por columna (18 x 18)

function luzEn(x, y, z) {
  const hondo = CIMA[(z + 1) * P + (x + 1)] - y;
  return hondo <= 0 ? 1 : LUZ_CIELO[hondo < 299 ? hondo : 299];
}

// ----------------------------------------------------------- Listas de vértices
class Lista {
  constructor() {
    this.cap = 8192;
    this.pos = new Float32Array(this.cap * 3);
    this.uv = new Float32Array(this.cap * 2);
    this.col = new Uint8Array(this.cap * 3);
    this.ind = new Uint32Array(this.cap * 1.5);
    this.nv = 0;
    this.ni = 0;
  }
  reiniciar() { this.nv = 0; this.ni = 0; }
  asegurar(extra) {
    if (this.nv + extra <= this.cap) return;
    let cap = this.cap;
    while (this.nv + extra > cap) cap *= 2;
    const crecer = (viejo, n) => { const a = new viejo.constructor(n); a.set(viejo); return a; };
    this.pos = crecer(this.pos, cap * 3);
    this.uv = crecer(this.uv, cap * 2);
    this.col = crecer(this.col, cap * 3);
    this.ind = crecer(this.ind, cap * 1.5);
    this.cap = cap;
  }
  // brillo = luz del cielo con sombra de esquinas, bloque = luz de antorchas, viento = cuánto se mece
  vertice(x, y, z, u, v, brillo, bloque = 0, viento = 0) {
    const i = this.nv++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.uv[i * 2] = u; this.uv[i * 2 + 1] = v;
    this.col[i * 3] = Math.round(brillo * 255);
    this.col[i * 3 + 1] = Math.round(bloque * 255);
    this.col[i * 3 + 2] = viento;
  }
  // Cuadrito con los 4 últimos vértices. "girar" cambia la diagonal.
  cuadro(girar) {
    const b = this.nv - 4;
    const t = this.ind;
    let n = this.ni;
    if (girar) {
      t[n++] = b; t[n++] = b + 1; t[n++] = b + 3;
      t[n++] = b + 1; t[n++] = b + 2; t[n++] = b + 3;
    } else {
      t[n++] = b; t[n++] = b + 1; t[n++] = b + 2;
      t[n++] = b; t[n++] = b + 2; t[n++] = b + 3;
    }
    this.ni = n;
  }
  resultado() {
    if (this.nv === 0) return null;
    const indices = this.nv > 65535 ? this.ind.slice(0, this.ni) : Uint16Array.from(this.ind.subarray(0, this.ni));
    return {
      pos: this.pos.slice(0, this.nv * 3),
      uv: this.uv.slice(0, this.nv * 2),
      col: this.col.slice(0, this.nv * 3),
      ind: indices,
    };
  }
}

const solido = new Lista();
const recorte = new Lista();
const agua = new Lista();

// ¿Se ve la cara del bloque "b" que da hacia el vecino "n"?
function seVe(b, n, hojasDetalladas) {
  if (n === B.AIRE) return true;
  if (OPACO[n]) return false;
  if (n === b) return hojasDetalladas && ES_HOJAS[b] === 1;
  if (DIBUJO[b] === DIBUJO_AGUA && DIBUJO[n] === DIBUJO_AGUA) return false; // agua del mar junto a agua puesta
  return true;
}

let LUZB = null; // luz de antorchas por celda (misma forma que el volumen) o null

function planta(lista, x, y, z, b, vi) {
  const t = TEXTURA_CARA[b * 6] * 4;
  const u0 = UV[t], v0 = UV[t + 1], u1 = UV[t + 2], v1 = UV[t + 3];
  const a = 0.15, c = 0.85, brillo = 0.92 * luzEn(x, y, z);
  const bl = LUZB ? LUZB[vi] / 15 : 0;
  const planos = [[x + a, z + a, x + c, z + c], [x + a, z + c, x + c, z + a]];
  for (const [xa, za, xb, zb] of planos) {
    lista.asegurar(8);
    // de frente (la base no se mece, la punta sí)
    lista.vertice(xa, y, za, u0, v0, brillo, bl, 0);
    lista.vertice(xb, y, zb, u1, v0, brillo, bl, 0);
    lista.vertice(xb, y + 1, zb, u1, v1, brillo, bl, 255);
    lista.vertice(xa, y + 1, za, u0, v1, brillo, bl, 255);
    lista.cuadro(false);
    // y por detrás
    lista.vertice(xb, y, zb, u0, v0, brillo, bl, 0);
    lista.vertice(xa, y, za, u1, v0, brillo, bl, 0);
    lista.vertice(xa, y + 1, za, u1, v1, brillo, bl, 255);
    lista.vertice(xb, y + 1, zb, u0, v1, brillo, bl, 255);
    lista.cuadro(false);
  }
}

// ----------------------------------------------------------- Bloques que no son cubos
const CACHE_TEX = new Map();
function texIndice(t) {
  if (typeof t === 'number') return t;
  let i = CACHE_TEX.get(t);
  if (i === undefined) { i = indiceTextura(t); CACHE_TEX.set(t, i); }
  return i;
}

// Cada cara de una cajita: posición de sus 4 esquinas y su textura
function modelo(lista, x, y, z, id, vi, vol) {
  const cajas = cajasDe(id, vol, vi, P, PCAPA);
  if (!cajas) return;
  const brilla = EMISION[id] > 0;
  for (const c of cajas) {
    const ex = c.length > 6 ? c[6] : null;
    const x0 = c[0], y0 = c[1], z0 = c[2], x1 = c[3], y1 = c[4], z1 = c[5];
    for (let f = 0; f < 6; f++) {
      const cara = CARAS[f];
      const n = cara.n;
      const plano = n[0] ? (n[0] > 0 ? x1 : x0) : n[1] ? (n[1] > 0 ? y1 : y0) : (n[2] > 0 ? z1 : z0);
      const enBorde = plano === (n[0] + n[1] + n[2] > 0 ? 1 : 0);
      if (enBorde && OPACO[vol[vi + VECINO[f]]]) continue;
      const ti = ex && ex.t !== undefined ? texIndice(ex.t) : TEXTURA_CARA[id * 6 + f];
      const t = ti * 4;
      const u0 = UV[t], v0 = UV[t + 1], du = UV[t + 2] - u0, dv = UV[t + 3] - v0;
      const ci = enBorde ? vi + VECINO[f] : vi;
      const fx = enBorde ? x + n[0] : x, fy = enBorde ? y + n[1] : y, fz = enBorde ? z + n[2] : z;
      const sky = luzEn(fx, fy, fz) * (cara.luz > 0.9 ? 1 : 1);
      const bl = brilla ? 1 : (LUZB ? LUZB[ci] / 15 : 0);
      const rot = ex && ex.rot && f === 2 ? ex.rot : 0;
      lista.asegurar(4);
      for (let k = 0; k < 4; k++) {
        const v = cara.v[k];
        const cx = v[0] ? x1 : x0, cy = v[1] ? y1 : y0, cz = v[2] ? z1 : z0;
        let U, V;
        switch (f) {
          case 0: U = 1 - cz; V = cy; break;
          case 1: U = cz; V = cy; break;
          case 2: U = cx; V = 1 - cz; break;
          case 3: U = cx; V = cz; break;
          case 4: U = cx; V = cy; break;
          default: U = 1 - cx; V = cy; break;
        }
        for (let r = 0; r < rot; r++) { const tU = U; U = V; V = 1 - tU; }
        lista.vertice(x + cx, y + cy, z + cz, u0 + U * du, v0 + V * dv, sky, bl, 0);
      }
      lista.cuadro(false);
    }
  }
}

// Recorre el volumen y devuelve los datos de 3 mallas: sólida, con huecos y agua.
// "cima" dice, por columna, la altura del bloque más alto que da sombra.
// "luzB" (opcional) es la luz de antorchas de cada celda (0 a 15).
export function mallar(vol, cima, yMax, hojasDetalladas, luzB) {
  solido.reiniciar();
  recorte.reiniciar();
  agua.reiniciar();
  CIMA = cima;
  LUZB = luzB || null;
  const brillo = [0, 0, 0, 0];
  const bloqueLuz = [0, 0, 0, 0];

  for (let y = 0; y <= yMax; y++) {
    for (let z = 0; z < 16; z++) {
      let vi = (y + 1) * PCAPA + (z + 1) * P + 1;
      for (let x = 0; x < 16; x++, vi++) {
        const b = vol[vi];
        if (b === B.AIRE) continue;
        const dib = DIBUJO[b];
        if (dib === DIBUJO_PLANTA) { planta(recorte, x, y, z, b, vi); continue; }
        if (dib === DIBUJO_MODELO) { modelo(recorte, x, y, z, b, vi, vol); continue; }
        const lista = dib === DIBUJO_AGUA ? agua : dib === DIBUJO_RECORTE ? recorte : solido;
        // el agua de hasta arriba queda un poquito más bajita
        const tope = dib === DIBUJO_AGUA && DIBUJO[vol[vi + PCAPA]] !== DIBUJO_AGUA ? 0.875 : 1;
        const viento = ES_HOJAS[b] ? 110 : 0;
        const brilla = EMISION[b] > 0;

        for (let f = 0; f < 6; f++) {
          if (!seVe(b, vol[vi + VECINO[f]], hojasDetalladas)) continue;
          const t = TEXTURA_CARA[b * 6 + f] * 4;
          const u0 = UV[t], v0 = UV[t + 1], u1 = UV[t + 2], v1 = UV[t + 3];
          const cara = CARAS[f];
          const n = cara.n;
          const fx = x + n[0], fy = y + n[1], fz = z + n[2];
          const luzFrente = luzEn(fx, fy, fz);
          const fi = vi + VECINO[f];
          if (dib === DIBUJO_AGUA) {
            brillo[0] = brillo[1] = brillo[2] = brillo[3] = luzFrente;
            bloqueLuz[0] = bloqueLuz[1] = bloqueLuz[2] = bloqueLuz[3] = LUZB ? LUZB[fi] / 15 : 0;
          } else {
            for (let k = 0; k < 4; k++) {
              const o = (f * 4 + k) * 3;
              const s1 = SOMBREA[vol[vi + AO[o]]];
              const s2 = SOMBREA[vol[vi + AO[o + 1]]];
              const se = SOMBREA[vol[vi + AO[o + 2]]];
              const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + se);
              // luz del cielo: promedio de las celdas libres alrededor de la esquina
              let suma = luzFrente, cuenta = 1;
              let sumaB = LUZB ? LUZB[fi] : 0;
              for (let c = 0; c < 3; c++) {
                if ((c === 0 && s1) || (c === 1 && s2) || (c === 2 && (se || (s1 && s2)))) continue;
                const q = (o + c) * 3;
                suma += luzEn(x + AO_D[q], y + AO_D[q + 1], z + AO_D[q + 2]);
                if (LUZB) sumaB += LUZB[vi + AO[o + c]];
                cuenta++;
              }
              brillo[k] = NIVEL_AO[ao] * (suma / cuenta);
              bloqueLuz[k] = brilla ? 1 : sumaB / cuenta / 15;
            }
          }
          lista.asegurar(4);
          const v = cara.v;
          const agitar = dib === DIBUJO_AGUA && f === 2 ? 255 : viento;
          lista.vertice(x + v[0][0], y + v[0][1] * tope, z + v[0][2], u0, v0, brillo[0], bloqueLuz[0], agitar);
          lista.vertice(x + v[1][0], y + v[1][1] * tope, z + v[1][2], u1, v0, brillo[1], bloqueLuz[1], agitar);
          lista.vertice(x + v[2][0], y + v[2][1] * tope, z + v[2][2], u1, v1, brillo[2], bloqueLuz[2], agitar);
          lista.vertice(x + v[3][0], y + v[3][1] * tope, z + v[3][2], u0, v1, brillo[3], bloqueLuz[3], agitar);
          lista.cuadro(brillo[0] + brillo[2] + bloqueLuz[0] + bloqueLuz[2] > brillo[1] + brillo[3] + bloqueLuz[1] + bloqueLuz[3]);
        }
      }
    }
  }
  return [solido.resultado(), recorte.resultado(), agua.resultado()];
}
