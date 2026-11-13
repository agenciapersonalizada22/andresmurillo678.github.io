// Solucionador por busqueda con propagacion de restricciones (singles, unicos ocultos y combinaciones de jaulas).
import { crearAzar } from './azar.js';

const POP = new Uint8Array(1 << 10);
for (let i = 1; i < POP.length; i++) POP[i] = POP[i >> 1] + (i & 1);
export const pop = (m) => POP[m];
export const digitoDe = (m) => 32 - Math.clz32(m);
export const bits = (m) => { const r = []; for (let d = 1; m; d++, m >>= 1) if (m & 1) r.push(d); return r; };

/* Estudia una jaula: devuelve combinaciones factibles y la mascara permitida por celda (null si es imposible). */
export function jaulaInfo(M, c, celdas, suma) {
  const k = celdas.length, lista = (M.combos[k] || {})[suma];
  if (!lista) return null;
  const nm = new Array(k).fill(0), factibles = [], ele = new Array(k);
  for (const combo of lista) {
    let ok = false;
    const rec = (idx, usados) => {
      if (idx === k) {
        ok = true;
        for (let t = 0; t < k; t++) nm[t] |= ele[t];
        return;
      }
      let disp = c[celdas[idx]] & combo & ~usados;
      while (disp) {
        const b = disp & -disp; disp ^= b; ele[idx] = b;
        rec(idx + 1, usados | b);
      }
    };
    rec(0, 0);
    if (ok) factibles.push(combo);
  }
  if (!factibles.length) return null;
  return { nm, factibles };
}

export function propagar(M, c) {
  const { N, unidades, jaulas, pares, todo } = M;
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < N; i++) {
      const m = c[i];
      if (m === 0) return false;
      if ((m & (m - 1)) === 0) {
        const p = pares[i];
        for (let t = 0; t < p.length; t++) {
          const j = p[t];
          if (c[j] & m) { c[j] &= ~m; if (c[j] === 0) return false; cambio = true; }
        }
      }
    }
    for (let u = 0; u < unidades.length; u++) {
      const cel = unidades[u].celdas;
      let s1 = 0, s2 = 0;
      for (let t = 0; t < cel.length; t++) { const m = c[cel[t]]; s2 |= s1 & m; s1 |= m; }
      if (s1 !== todo) return false;
      const uni = s1 & ~s2;
      if (uni) {
        for (let t = 0; t < cel.length; t++) {
          const j = cel[t], d = c[j] & uni;
          if (d) { if (d & (d - 1)) return false; if (c[j] !== d) { c[j] = d; cambio = true; } }
        }
      }
    }
    for (let k = 0; k < jaulas.length; k++) {
      const J = jaulas[k], info = jaulaInfo(M, c, J.celdas, J.suma);
      if (!info) return false;
      for (let t = 0; t < J.celdas.length; t++) {
        const j = J.celdas[t], nuevo = c[j] & info.nm[t];
        if (nuevo !== c[j]) { c[j] = nuevo; cambio = true; if (nuevo === 0) return false; }
      }
    }
  }
  return true;
}

export function candidatosIniciales(M, dados) {
  const c = new Uint16Array(M.N).fill(M.todo);
  for (let i = 0; i < M.N; i++) if (dados[i]) c[i] = 1 << (dados[i] - 1);
  return c;
}

let nodos = 0, topeNodos = Infinity;
function buscar(M, c, limite, az, sol) {
  if (++nodos > topeNodos) return;
  if (!propagar(M, c)) return;
  let mejor = -1, mk = 99;
  for (let i = 0; i < M.N; i++) {
    const k = POP[c[i]];
    if (k > 1 && k < mk) { mk = k; mejor = i; if (k === 2) break; }
  }
  if (mejor < 0) { sol.push(Uint8Array.from(c, (m) => digitoDe(m))); return; }
  const ds = bits(c[mejor]);
  if (az) az.mezclar(ds);
  for (const d of ds) {
    const c2 = c.slice(); c2[mejor] = 1 << (d - 1);
    buscar(M, c2, limite, az, sol);
    if (sol.length >= limite || nodos > topeNodos) return;
  }
}

/* Devuelve hasta `limite` soluciones (Uint8Array de digitos). */
export function resolver(M, dados, limite = 2, azar = null, tope = Infinity) {
  const sol = [];
  nodos = 0; topeNodos = tope;
  buscar(M, candidatosIniciales(M, dados), limite, azar, sol);
  topeNodos = Infinity;
  return sol;
}
export const esUnico = (M, dados) => resolver(M, dados, 2).length === 1;
export const unaSolucion = (M, dados, semilla) => resolver(M, dados, 1, semilla == null ? null : crearAzar(semilla))[0] || null;
