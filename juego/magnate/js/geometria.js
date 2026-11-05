// Geometria del tablero compartida por el dibujo de la textura y la seleccion por toque.
export const MITAD = 6.1, ESQ = 1.6, LADO = 1.0, TAM = 12.2;
export function lado(i) { return i === 0 || i === 10 || i === 20 || i === 30 ? -1 : i < 10 ? 0 : i < 20 ? 1 : i < 30 ? 2 : 3; }
// centro (x,z) y tamano (w en x, d en z) de la casilla i
export function rectCasilla(i) {
  const c = MITAD - ESQ / 2, r = MITAD - ESQ - LADO / 2;
  if (i === 0) return { x: c, z: c, w: ESQ, d: ESQ };
  if (i === 10) return { x: -c, z: c, w: ESQ, d: ESQ };
  if (i === 20) return { x: -c, z: -c, w: ESQ, d: ESQ };
  if (i === 30) return { x: c, z: -c, w: ESQ, d: ESQ };
  if (i < 10) return { x: r - (i - 1), z: c, w: LADO, d: ESQ };
  if (i < 20) return { x: -c, z: r - (i - 11), w: ESQ, d: LADO };
  if (i < 30) return { x: -r + (i - 21), z: -c, w: LADO, d: ESQ };
  return { x: c, z: -r + (i - 31), w: ESQ, d: LADO };
}
// direccion hacia el centro del tablero desde la casilla (para la banda de color y los edificios)
export function haciaCentro(i) {
  const l = lado(i);
  return l === 0 ? [0, -1] : l === 1 ? [1, 0] : l === 2 ? [0, 1] : l === 3 ? [-1, 0] : [0, 0];
}
export function casillaEn(x, z) {
  const L = MITAD - ESQ, a = Math.abs(x), b = Math.abs(z);
  if (a > MITAD || b > MITAD) return -1;
  if (a > L && b > L) return x > 0 ? (z > 0 ? 0 : 30) : (z > 0 ? 10 : 20);
  if (z > L) return 1 + Math.min(8, Math.floor(L - x + 0));
  if (x < -L) return 11 + Math.min(8, Math.floor(L - z));
  if (z < -L) return 21 + Math.min(8, Math.floor(x + L));
  if (x > L) return 31 + Math.min(8, Math.floor(z + L));
  return -1;
}
