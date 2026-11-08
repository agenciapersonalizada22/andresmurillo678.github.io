// =============================================================
//  🌀  PORTAL DEL ABISMO (lógica pura)
//  Se construye un marco de obsidiana (el interior de 2 a 4 de
//  ancho por 3 a 5 de alto, de pie sobre el suelo) y se enciende
//  poniendo una antorcha dentro. Si se rompe el marco, el portal
//  se apaga. Todo recibe funciones (obtener / poner) para poder
//  probarse sin el juego.
// =============================================================
import { B } from '../bloques.js';

export const MIN_ANCHO = 2, MAX_ANCHO = 4, MIN_ALTO = 3, MAX_ALTO = 5;
const libre = (id) => id === B.AIRE || id === B.PORTAL || id === B.ANTORCHA || id === B.FLOR_ROJA || id === B.FLOR_AMARILLA || id === B.PASTO_ALTO;

// Busca un marco válido que rodee la celda (x, y, z). Devuelve { eje, x0, y0, z0, w, h } (esquina mínima del interior) o null.
export function buscarMarco(obtener, x, y, z) {
  for (const eje of ['x', 'z']) {
    const dx = eje === 'x' ? 1 : 0, dz = eje === 'z' ? 1 : 0;
    // abajo hasta la obsidiana
    let y0 = y;
    while (libre(obtener(x, y0 - 1, z)) && y - y0 < MAX_ALTO) y0--;
    if (obtener(x, y0 - 1, z) !== B.OBSIDIANA || !libre(obtener(x, y0, z))) continue;
    // a los lados
    let a = 0; while (a < MAX_ANCHO && libre(obtener(x - dx * (a + 1), y0, z - dz * (a + 1)))) a++;
    let b = 0; while (b < MAX_ANCHO && libre(obtener(x + dx * (b + 1), y0, z + dz * (b + 1)))) b++;
    const izq = obtener(x - dx * (a + 1), y0, z - dz * (a + 1)), der = obtener(x + dx * (b + 1), y0, z + dz * (b + 1));
    if (izq !== B.OBSIDIANA || der !== B.OBSIDIANA) continue;
    const w = a + b + 1;
    if (w < MIN_ANCHO || w > MAX_ANCHO) continue;
    const xi = x - dx * a, zi = z - dz * a;
    // altura
    let h = 0; while (h < MAX_ALTO && libre(obtener(xi, y0 + h, zi))) h++;
    if (obtener(xi, y0 + h, zi) !== B.OBSIDIANA || h < MIN_ALTO || h > MAX_ALTO) continue;
    // interior vacío y marco completo
    let ok = true;
    for (let i = 0; i < w && ok; i++) {
      const px = xi + dx * i, pz = zi + dz * i;
      for (let j = 0; j < h; j++) if (!libre(obtener(px, y0 + j, pz))) { ok = false; break; }
      if (obtener(px, y0 - 1, pz) !== B.OBSIDIANA || obtener(px, y0 + h, pz) !== B.OBSIDIANA) ok = false;
    }
    for (let j = 0; j < h && ok; j++) {
      if (obtener(xi - dx, y0 + j, zi - dz) !== B.OBSIDIANA || obtener(xi + dx * w, y0 + j, zi + dz * w) !== B.OBSIDIANA) ok = false;
    }
    if (ok) return { eje, x0: xi, y0, z0: zi, w, h };
  }
  return null;
}

export function celdasInterior(m) {
  const dx = m.eje === 'x' ? 1 : 0, dz = m.eje === 'z' ? 1 : 0, r = [];
  for (let i = 0; i < m.w; i++) for (let j = 0; j < m.h; j++) r.push([m.x0 + dx * i, m.y0 + j, m.z0 + dz * i]);
  return r;
}

export function llenarMarco(m, poner) { for (const [x, y, z] of celdasInterior(m)) poner(x, y, z, B.PORTAL); }

// Apaga el portal que toca (x, y, z): recorre las celdas de portal vecinas y las vacía. Devuelve cuántas quitó.
export function apagarPortal(obtener, poner, x, y, z) {
  const cola = [], visto = new Set();
  const k = (a, b, c) => a + ',' + b + ',' + c;
  for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    if (obtener(x + dx, y + dy, z + dz) === B.PORTAL) { cola.push([x + dx, y + dy, z + dz]); visto.add(k(x + dx, y + dy, z + dz)); }
  }
  let n = 0;
  while (cola.length && n < 64) {
    const [a, b, c] = cola.pop();
    poner(a, b, c, B.AIRE); n++;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const q = k(a + dx, b + dy, c + dz);
      if (!visto.has(q) && obtener(a + dx, b + dy, c + dz) === B.PORTAL) { visto.add(q); cola.push([a + dx, b + dy, c + dz]); }
    }
  }
  return n;
}

// Marco nuevo (4 x 5 con portal) con la esquina inferior del interior en (x, y, z): lista de [x, y, z, id]
export function planMarco(eje, x, y, z, w = 2, h = 3) {
  const dx = eje === 'x' ? 1 : 0, dz = eje === 'z' ? 1 : 0, r = [];
  for (let i = -1; i <= w; i++) for (let j = -1; j <= h; j++) {
    const borde = i === -1 || i === w || j === -1 || j === h;
    if (borde && !((i === -1 || i === w) && (j === -1 || j === h))) r.push([x + dx * i, y + j, z + dz * i, B.OBSIDIANA]);
    else if (!borde) r.push([x + dx * i, y + j, z + dz * i, B.PORTAL]);
  }
  // plataforma para pisar
  for (let i = -2; i <= w + 1; i++) for (let k = -2; k <= 2; k++) r.push([x + dx * i + dz * k, y - 1, z + dz * i + dx * k, i >= -1 && i <= w && k === 0 ? B.OBSIDIANA : B.ROCA_ABISMO]);
  // despejar alrededor
  for (let i = -2; i <= w + 1; i++) for (let k = -2; k <= 2; k++) for (let j = 0; j <= h + 1; j++) {
    const px = x + dx * i + dz * k, pz = z + dz * i + dx * k;
    if (!(k === 0 && i >= -1 && i <= w)) r.push([px, y + j, pz, B.AIRE]);
  }
  return r;
}
