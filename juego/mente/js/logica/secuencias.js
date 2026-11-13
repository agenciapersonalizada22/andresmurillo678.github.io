// Secuencias numericas: se muestran n terminos y hay que hallar el siguiente. `termino(tipo, p, i)` es la regla; el validador la recalcula.
import { NMAX } from './escalera.js';
export function termino(tipo, p, i) {
  switch (tipo) {
    case 'aritmetica': return p.a + p.d * i;
    case 'geometrica': return p.a * Math.pow(p.r, i);
    case 'alterna': return p.a + Math.floor((i + 1) / 2) * p.d + Math.floor(i / 2) * p.e; // +d, +e, +d, +e...
    case 'cuadrados': return (i + p.a) * (i + p.a) + p.c;
    case 'triangular': return p.a + (i * (i + 1)) / 2 * p.d; // diferencias crecientes
    case 'fibonacci': { let x = p.a, y = p.b; for (let k = 0; k < i; k++) { const z = x + y; x = y; y = z; } return x; }
    case 'lineal2': { let x = p.a; for (let k = 0; k < i; k++) x = x * p.m + p.c; return x; }
    case 'intercalada': return i % 2 === 0 ? p.a + p.d * (i / 2) : p.b - p.e * ((i - 1) / 2);
    default: return 0;
  }
}
const regla = (tipo, p) => ({
  aritmetica: `sumar ${p.d}`, geometrica: `multiplicar por ${p.r}`, alterna: `sumar ${p.d} y ${p.e} alternando`,
  cuadrados: 'cuadrados perfectos desplazados', triangular: 'las diferencias crecen en cada paso', fibonacci: 'cada termino es la suma de los dos anteriores',
  lineal2: `multiplicar por ${p.m} y sumar ${p.c}`, intercalada: 'dos series entrelazadas'
})[tipo];
export function generar(rng, nivel) {
  let tipo, p;
  const opciones = nivel <= 3 ? ['aritmetica'] : nivel <= 6 ? ['aritmetica', 'geometrica', 'alterna'] : nivel <= 11 ? ['cuadrados', 'triangular', 'fibonacci', 'alterna', 'geometrica'] : ['lineal2', 'intercalada', 'fibonacci', 'triangular', 'cuadrados'];
  tipo = rng.pick(opciones);
  switch (tipo) {
    case 'aritmetica': p = { a: rng.int(1, 20), d: rng.int(2, 3 + Math.min(nivel * 2, 14)) * (nivel > 2 && rng.bool(0.3) ? -1 : 1) }; break;
    case 'geometrica': p = { a: rng.int(1, 4), r: rng.int(2, 3) }; break;
    case 'alterna': p = { a: rng.int(1, 15), d: rng.int(2, 9), e: rng.int(-4, 5) || 2 }; break;
    case 'cuadrados': p = { a: rng.int(1, 4), c: rng.int(0, 5) }; break;
    case 'triangular': p = { a: rng.int(1, 9), d: rng.int(1, 3) }; break;
    case 'fibonacci': p = { a: rng.int(1, 5), b: rng.int(1, 6) }; break;
    case 'lineal2': p = { a: rng.int(1, 5), m: rng.int(2, 3), c: rng.int(-3, 4) }; break;
    default: p = { a: rng.int(1, 9), b: rng.int(30, 60), d: rng.int(2, 6), e: rng.int(2, 7) };
  }
  const n = nivel <= 6 ? 5 : 6;
  const terminos = []; for (let i = 0; i < n; i++) terminos.push(termino(tipo, p, i));
  const respuesta = termino(tipo, p, n);
  const set = new Set([respuesta]);
  const cand = [respuesta + 1, respuesta - 1, respuesta + 2, respuesta - 2, respuesta + 10, respuesta - 10, respuesta * 2, respuesta + 5, respuesta - 3, respuesta + 3];
  const dis = [];
  for (const c of rng.barajar(cand)) { if (!set.has(c) && Math.abs(c) < 100000) { set.add(c); dis.push(c); if (dis.length === 3) break; } }
  const ops = rng.barajar([respuesta, ...dis]);
  return { tipo, p, terminos, respuesta, opciones: ops, correcta: ops.indexOf(respuesta), regla: regla(tipo, p), nivel: Math.min(nivel, NMAX) };
}
export const validar = (s) => s.terminos.every((t, i) => t === termino(s.tipo, s.p, i)) && s.respuesta === termino(s.tipo, s.p, s.terminos.length) && s.opciones[s.correcta] === s.respuesta && new Set(s.opciones).size === s.opciones.length;
