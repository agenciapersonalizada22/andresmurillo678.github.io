// Torre de Hanoi: estado = 3 varillas (listas de tamanos, base primero).
export const inicial = (n) => ({ n, varillas: [Array.from({ length: n }, (_, i) => n - i), [], []], movs: 0 });
export const optimo = (n) => Math.pow(2, n) - 1;
export function mover(e, de, a) {
  const v = e.varillas;
  if (de === a || !v[de] || !v[a] || !v[de].length) return { ok: false, motivo: 'vacia' };
  const d = v[de][v[de].length - 1];
  if (v[a].length && v[a][v[a].length - 1] < d) return { ok: false, motivo: 'grande' };
  const n = { n: e.n, varillas: v.map((x) => x.slice()), movs: e.movs + 1 };
  n.varillas[de].pop(); n.varillas[a].push(d);
  return { ok: true, estado: n };
}
export const resuelto = (e) => e.varillas[2].length === e.n;
export function solucion(n, de = 0, a = 2, aux = 1, out = []) {
  if (n === 0) return out;
  solucion(n - 1, de, aux, a, out); out.push([de, a]); solucion(n - 1, aux, a, de, out);
  return out;
}
export const discosPara = (nivel) => Math.max(2, Math.min(7, 2 + Math.floor((nivel - 1) / 3)));
