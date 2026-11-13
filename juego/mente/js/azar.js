// Generador pseudoaleatorio con semilla (mulberry32): mismos problemas para ambos en un duelo y pruebas reproducibles.
export function semillaDeTexto(t) {
  let s = 2166136261;
  for (let i = 0; i < t.length; i++) { s ^= t.charCodeAt(i); s = Math.imul(s, 16777619); }
  return s >>> 0;
}
export function crearRng(semilla = 1) {
  let a = (typeof semilla === 'string' ? semillaDeTexto(semilla) : semilla) >>> 0 || 1;
  const f = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    f,
    int: (min, max) => min + Math.floor(f() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    bool: (p = 0.5) => f() < p,
    barajar: (arr) => { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; },
    muestra: (arr, n) => r.barajar(arr).slice(0, n)
  };
  return r;
}
