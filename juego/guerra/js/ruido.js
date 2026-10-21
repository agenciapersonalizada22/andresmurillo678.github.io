// Números al azar repetibles y ruido suave para el terreno
export function crearRng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearRuido(semilla) {
  const rng = crearRng(semilla);
  const perm = new Uint8Array(512);
  const val = new Float32Array(256);
  const orden = [];
  for (let i = 0; i < 256; i++) { orden.push(i); val[i] = rng(); }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = orden[i & 255];
  const suave = (t) => t * t * (3 - 2 * t);
  const h = (ix, iz) => val[perm[perm[ix & 255] + (iz & 255)]];

  function valor(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const u = suave(x - xi), v = suave(z - zi);
    const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  return function fbm(x, z, octavas = 4) {
    let suma = 0, amp = 1, f = 1, tot = 0;
    for (let i = 0; i < octavas; i++) {
      suma += valor(x * f, z * f) * amp;
      tot += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return suma / tot;
  };
}
