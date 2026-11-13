// Estado y reglas de una partida: valores, notas a lapiz, historial ilimitado, conflictos, vidas y serializacion.
import { modelo, variante } from './variantes.js';

const aArr = (t) => Uint8Array.from(t, Number);
const copia = (p) => ({ v: p.v.slice(), n: p.notas.slice(), e: p.elim.slice() });

export function nuevaPartida(puzzle, { modo = 'libre', vidas = 0, meta = {} } = {}) {
  const M = modelo(puzzle), N = M.N;
  return {
    puzzle, M, N, n: M.n, modo, meta,
    dados: aArr(puzzle.dados), sol: aArr(puzzle.sol), v: aArr(puzzle.dados), notas: new Uint16Array(N), elim: new Uint16Array(N),
    t: 0, errores: 0, vidas, vidasIni: vidas, pistas: 0, resolvio: false, autocheck: false, verificaciones: 0,
    hist: [], fut: [], fin: null
  };
}
export const esDado = (p, i) => p.dados[i] !== 0;
export const bit = (d) => 1 << (d - 1);
export const dadosDePuzzle = (puzzle) => aArr(puzzle.dados);

export function snap(p) { p.hist.push(copia(p)); p.fut.length = 0; }
function cambiado(p, a) { for (let i = 0; i < p.N; i++) if (p.v[i] !== a.v[i] || p.notas[i] !== a.n[i] || p.elim[i] !== a.e[i]) return true; return false; }

/* Pone (o borra si es el mismo) un valor. Devuelve {error} cuando el valor no coincide con la solucion. */
export function poner(p, i, d, { autoquitar = true, sinSnap = false } = {}) {
  if (esDado(p, i) || p.fin) return { cambio: false };
  if (p.v[i] === d) return borrar(p, i, { sinSnap });
  if (!sinSnap) snap(p);
  p.v[i] = d; p.notas[i] = 0;
  if (autoquitar) { const b = bit(d), pr = p.M.pares[i]; for (let t = 0; t < pr.length; t++) p.notas[pr[t]] &= ~b; }
  const error = p.sol[i] !== d;
  if (error) { p.errores++; if (p.vidasIni > 0) p.vidas = Math.max(0, p.vidas - 1); }
  return { cambio: true, error };
}
export function borrar(p, i, { sinSnap = false } = {}) {
  if (esDado(p, i) || p.fin || (p.v[i] === 0 && p.notas[i] === 0)) return { cambio: false };
  if (!sinSnap) snap(p);
  p.v[i] = 0; p.notas[i] = 0;
  return { cambio: true, borrado: true };
}
export function alternarNota(p, i, d, { sinSnap = false } = {}) {
  if (esDado(p, i) || p.v[i] !== 0 || p.fin) return { cambio: false };
  if (!sinSnap) snap(p);
  p.notas[i] ^= bit(d);
  return { cambio: true };
}
export function fijarNota(p, i, d, activa) {
  if (esDado(p, i) || p.v[i] !== 0) return;
  if (activa) p.notas[i] |= bit(d); else p.notas[i] &= ~bit(d);
}
export function deshacer(p) {
  if (!p.hist.length || p.fin) return false;
  p.fut.push(copia(p));
  const a = p.hist.pop(); p.v.set(a.v); p.notas.set(a.n); p.elim.set(a.e);
  return true;
}
export function rehacer(p) {
  if (!p.fut.length || p.fin) return false;
  p.hist.push(copia(p));
  const a = p.fut.pop(); p.v.set(a.v); p.notas.set(a.n); p.elim.set(a.e);
  return true;
}

/* Candidatos segun lo ya colocado (y las eliminaciones aplicadas por pistas). */
export function candidatos(p, i) {
  let m = p.M.todo;
  const pr = p.M.pares[i];
  for (let t = 0; t < pr.length; t++) { const d = p.v[pr[t]]; if (d) m &= ~bit(d); }
  return m & ~p.elim[i];
}
export function autonotas(p) {
  snap(p);
  for (let i = 0; i < p.N; i++) p.notas[i] = p.v[i] ? 0 : candidatos(p, i);
}
export function quitarEliminadas(p) { for (let i = 0; i < p.N; i++) p.notas[i] &= ~p.elim[i]; }

export function conflictos(p) {
  const M = p.M, mal = new Set();
  for (const g of M.grupos) {
    const vistos = new Map();
    for (const i of g) {
      const d = p.v[i]; if (!d) continue;
      if (vistos.has(d)) { mal.add(i); mal.add(vistos.get(d)); } else vistos.set(d, i);
    }
  }
  for (const J of M.jaulas) {
    let s = 0, lleno = true;
    for (const i of J.celdas) { if (p.v[i]) s += p.v[i]; else lleno = false; }
    if (s > J.suma || (lleno && s !== J.suma)) J.celdas.forEach((i) => { if (p.v[i]) mal.add(i); });
  }
  return mal;
}
export const incorrectas = (p) => { const r = []; for (let i = 0; i < p.N; i++) if (p.v[i] && p.v[i] !== p.sol[i]) r.push(i); return r; };
export const completo = (p) => p.v.every((x) => x > 0);
export const resuelta = (p) => { for (let i = 0; i < p.N; i++) if (p.v[i] !== p.sol[i]) return false; return true; };
export const restantes = (p, d) => { let c = 0; for (let i = 0; i < p.N; i++) if (p.v[i] === d) c++; return p.n - c; };
export const vacias = (p) => p.v.reduce((s, x) => s + (x ? 0 : 1), 0);
export const ayudado = (p) => p.pistas > 0 || p.resolvio || p.autocheck;

/* Valores validos para pistas y resolucion: solo los que coinciden con la solucion (lo erroneo se ignora). */
export function valoresSanos(p) {
  const d = new Uint8Array(p.N);
  for (let i = 0; i < p.N; i++) d[i] = p.v[i] === p.sol[i] ? p.v[i] : 0;
  return d;
}

/* ---- serializacion (sudoku_partida) ---- */
const PASOS_GUARDADOS = 120;
const hex = (a) => Array.from(a, (x) => x.toString(36)).join(',');
const deHex = (t, Tipo) => Tipo.from(t.split(','), (x) => parseInt(x, 36) || 0);
export function serializar(p) {
  return {
    v: 1, puzzle: p.puzzle, modo: p.modo, meta: p.meta, valores: Array.from(p.v).join(''), notas: hex(p.notas), elim: hex(p.elim),
    t: Math.round(p.t), errores: p.errores, vidas: p.vidas, vidasIni: p.vidasIni, pistas: p.pistas, resolvio: p.resolvio, autocheck: p.autocheck, verificaciones: p.verificaciones,
    hist: p.hist.slice(-PASOS_GUARDADOS).map((a) => [Array.from(a.v).join(''), hex(a.n), hex(a.e)])
  };
}
export function restaurar(o) {
  if (!o || !o.puzzle || !o.valores) return null;
  try {
    const p = nuevaPartida(o.puzzle, { modo: o.modo, vidas: o.vidasIni || 0, meta: o.meta || {} });
    if (o.valores.length !== p.N) return null;
    p.v = aArr(o.valores); p.notas = deHex(o.notas, Uint16Array); p.elim = deHex(o.elim, Uint16Array);
    for (let i = 0; i < p.N; i++) if (p.dados[i]) p.v[i] = p.dados[i];
    Object.assign(p, { t: o.t | 0, errores: o.errores | 0, vidas: o.vidas | 0, pistas: o.pistas | 0, resolvio: !!o.resolvio, autocheck: !!o.autocheck, verificaciones: o.verificaciones | 0 });
    p.hist = (o.hist || []).map((a) => ({ v: aArr(a[0]), n: deHex(a[1], Uint16Array), e: deHex(a[2], Uint16Array) }));
    return p;
  } catch (e) { return null; }
}
export const descripcion = (p) => variante(p.puzzle.v).nombre;
