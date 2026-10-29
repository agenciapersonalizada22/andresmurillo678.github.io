export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

export function hash2(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function ruido(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, s) {
  return ruido(x, y, s) * 0.5 + ruido(x * 2, y * 2, s + 11) * 0.25 + ruido(x * 4, y * 4, s + 23) * 0.15 + ruido(x * 8, y * 8, s + 37) * 0.1;
}

export function semillaDeTexto(t) {
  t = String(t == null ? '' : t).trim();
  if (/^\d+$/.test(t) && t.length < 10) return (parseInt(t, 10) >>> 0) || 1;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}

export function dinero(n) {
  n = Math.round(n);
  const a = Math.abs(n);
  let s;
  if (a >= 10000000) s = (a / 1000000).toFixed(1).replace('.0', '') + 'M';
  else if (a >= 100000) s = Math.round(a / 1000) + 'k';
  else s = String(a).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + '$' + s;
}

export function numero(n) {
  n = Math.round(n);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function b64de(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}
export function b64a(txt) {
  const s = atob(txt), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
