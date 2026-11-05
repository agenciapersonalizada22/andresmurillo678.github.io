// Generador determinista (sfc32) con estado serializable {s:[a,b,c,d]} y semillas criptograficas.
function hash128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) | 0, (h2 ^ h1) | 0, (h3 ^ h1) | 0, (h4 ^ h1) | 0];
}
function palabras(n) {
  const a = new Uint32Array(n), c = globalThis.crypto;
  if (c && c.getRandomValues) c.getRandomValues(a); else for (let i = 0; i < n; i++) a[i] = (Math.random() * 4294967296) >>> 0;
  return a;
}
export function semillaAleatoria() { return Array.from(palabras(4), (x) => x.toString(16).padStart(8, '0')).join(''); }
export function sig(r) {
  let [a, b, c, d] = r.s;
  const t = ((a + b) | 0) + d | 0;
  d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
  r.s = [a, b, c, d];
  return (t >>> 0) / 4294967296;
}
export function nuevoRng(semilla) {
  const r = { s: hash128(String(semilla)) };
  for (let i = 0; i < 15; i++) sig(r);
  return r;
}
export const ent = (r, n) => Math.floor(sig(r) * n);
export function mezclar(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) { const j = ent(r, i + 1); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}
// mezcla entropia del sistema en el estado (el anfitrion lo hace en cada mano; las pruebas no)
export function reentropia(r) {
  const w = palabras(4);
  r.s = r.s.map((x, i) => (x ^ w[i]) | 0);
  for (let i = 0; i < 8; i++) sig(r);
  return r;
}
export const elegir = (arr, r) => arr[ent(r, arr.length)];
