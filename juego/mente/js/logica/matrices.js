// Matrices 3x3 tipo patron: cada celda tiene atributos (forma, relleno, cantidad) con valores 0..2 que siguen reglas por fila/columna.
// Reglas: const (igual en todas), fila (constante por fila, cambia entre filas), col (constante por columna), latino (cuadrado latino).
import { NMAX } from './escalera.js';
export const ATRIBUTOS = ['forma', 'relleno', 'cantidad'];
const valor = (r, f, c) => {
  if (r.tipo === 'const') return r.a;
  if (r.tipo === 'fila') return (r.a + f * r.s1) % 3;
  if (r.tipo === 'col') return (r.a + c * r.s1) % 3;
  return (r.a + f * r.s1 + c * r.s2) % 3;
};
export const celda = (reglas, f, c) => { const o = {}; ATRIBUTOS.forEach((k) => { o[k] = valor(reglas[k], f, c); }); return o; };
const clave = (o) => ATRIBUTOS.map((k) => o[k]).join('');
export function generar(rng, nivel) {
  const nVar = nivel <= 4 ? 1 : nivel <= 11 ? 2 : 3;
  const tiposFacil = ['fila', 'col'];
  const tipos = nivel <= 7 ? tiposFacil : ['fila', 'col', 'latino'];
  const variables = rng.muestra(ATRIBUTOS, nVar);
  const reglas = {};
  ATRIBUTOS.forEach((k) => {
    reglas[k] = variables.includes(k)
      ? { tipo: rng.pick(tipos), a: rng.int(0, 2), s1: rng.int(1, 2), s2: rng.int(1, 2) }
      : { tipo: 'const', a: rng.int(0, 2), s1: 1, s2: 1 };
  });
  if (nivel >= 14) { const k = variables[0]; reglas[k].tipo = 'latino'; }
  const celdas = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) celdas.push(celda(reglas, f, c));
  const respuesta = celdas[8];
  const visibles = celdas.slice(0, 8);
  const opciones = [respuesta];
  const vistos = new Set([clave(respuesta)]);
  let guard = 0;
  const nOp = nivel <= 6 ? 4 : 6;
  while (opciones.length < nOp && guard++ < 200) {
    const d = { ...respuesta };
    const cambios = nivel < 10 ? 1 : rng.int(1, 2);
    rng.muestra(ATRIBUTOS, cambios).forEach((k) => { d[k] = (d[k] + rng.int(1, 2)) % 3; });
    const kk = clave(d);
    if (!vistos.has(kk)) { vistos.add(kk); opciones.push(d); }
  }
  const mezcla = rng.barajar(opciones.map((o, i) => ({ o, ok: i === 0 })));
  return { reglas, visibles, opciones: mezcla.map((m) => m.o), correcta: mezcla.findIndex((m) => m.ok), nivel: Math.min(nivel, NMAX) };
}
// Validador independiente: la opcion es correcta si satisface las reglas en la celda (3,3) y cada fila/columna de las visibles es coherente.
export function esCorrecta(m, i) { const o = m.opciones[i]; return !!o && clave(o) === clave(celda(m.reglas, 2, 2)); }
export function coherente(m) {
  for (const k of ATRIBUTOS) {
    const r = m.reglas[k];
    for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
      const v = valor(r, f, c);
      if (r.tipo === 'const' && v !== r.a) return false;
      if (r.tipo === 'fila' && v !== valor(r, f, 0)) return false;
      if (r.tipo === 'col' && v !== valor(r, 0, c)) return false;
      if (r.tipo === 'latino') { for (let c2 = 0; c2 < 3; c2++) if (c2 !== c && valor(r, f, c2) === v) return false; for (let f2 = 0; f2 < 3; f2++) if (f2 !== f && valor(r, f2, c) === v) return false; }
    }
  }
  return true;
}
