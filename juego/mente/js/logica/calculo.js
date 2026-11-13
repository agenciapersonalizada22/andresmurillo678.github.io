// Problemas de calculo mental por nivel (1..20). El texto usa x, / y - (menos); `evaluar` recalcula de forma independiente.
export function generar(rng, nivel) {
  let texto, resp;
  const gr = (n) => Math.min(n, 99);
  if (nivel <= 3) {
    const a = rng.int(2, 9 + nivel * 4), b = rng.int(2, 9 + nivel * 3);
    if (rng.bool()) { texto = `${a} + ${b}`; resp = a + b; } else { const x = Math.max(a, b), y = Math.min(a, b); texto = `${x} - ${y}`; resp = x - y; }
  } else if (nivel <= 7) {
    if (rng.bool(0.6)) { const a = rng.int(2, 6 + nivel), b = rng.int(2, 9); texto = `${a} x ${b}`; resp = a * b; }
    else { const a = rng.int(20, 20 + nivel * 12), b = rng.int(10, 10 + nivel * 6); texto = `${a} + ${b}`; resp = a + b; }
  } else if (nivel <= 12) {
    const t = rng.int(0, 2);
    if (t === 0) { const a = rng.int(6, 15), b = rng.int(6, 15); texto = `${a} x ${b}`; resp = a * b; }
    else if (t === 1) { const b = rng.int(2, 12), r = rng.int(2, 12); texto = `${b * r} / ${b}`; resp = r; }
    else { const a = rng.int(20, 99), b = rng.int(10, 60), c = rng.int(5, 40); texto = `${a} + ${b} - ${c}`; resp = a + b - c; }
  } else {
    const t = rng.int(0, 2);
    if (t === 0) { const a = rng.int(2, 12), b = rng.int(2, 12), c = rng.int(2, 9); texto = `(${a} + ${b}) x ${c}`; resp = (a + b) * c; }
    else if (t === 1) { const a = rng.int(11, 25), b = rng.int(3, 15), c = rng.int(2, 20); texto = `${a} x ${b} - ${c}`; resp = a * b - c; }
    else { const a = rng.int(120, 480), b = rng.int(120, 480); texto = `${a} + ${b}`; resp = a + b; }
  }
  const set = new Set([resp]);
  const dis = [];
  for (const d of rng.barajar([1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 11, 9])) {
    const v = resp + d;
    if (v >= 0 && !set.has(v)) { set.add(v); dis.push(v); if (dis.length === 3) break; }
  }
  const opciones = rng.barajar([resp, ...dis]);
  return { texto, resp, opciones, correcta: opciones.indexOf(resp), nivel: gr(nivel) };
}
export function evaluar(texto) {
  const js = texto.replace(/x/g, '*').replace(/\//g, '/');
  return Function('"use strict"; return (' + js + ')')();
}
