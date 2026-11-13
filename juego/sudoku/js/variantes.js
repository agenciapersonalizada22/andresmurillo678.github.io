// Definicion de variantes y construccion del modelo (unidades, jaulas, pares) a partir de un puzzle.
export const NIVELES = [
  { id: 'principiante', nombre: 'Principiante' }, { id: 'facil', nombre: 'Fácil' }, { id: 'medio', nombre: 'Medio' },
  { id: 'dificil', nombre: 'Difícil' }, { id: 'experto', nombre: 'Experto' }, { id: 'demonio', nombre: 'Demonio' }
];
export const VARIANTES = [
  { id: 'clasico', nombre: 'Clásico 9×9', corto: 'Clásico', n: 9, caja: [3, 3], niveles: [0, 1, 2, 3, 4, 5], desc: 'El Sudoku de siempre: filas, columnas y cajas de 3×3.' },
  { id: 'seis', nombre: '6×6', corto: '6×6', n: 6, caja: [2, 3], niveles: [0, 1, 2, 3], desc: 'Más pequeño y rápido: cajas de 2×3 con los números 1 a 6.' },
  { id: 'cuatro', nombre: '4×4 para niños', corto: '4×4', n: 4, caja: [2, 2], niveles: [0, 1, 2], desc: 'Para empezar: cuadrícula de 4×4 con los números 1 a 4.' },
  { id: 'diagonal', nombre: 'Diagonal (X)', corto: 'Diagonal', n: 9, caja: [3, 3], niveles: [0, 1, 2, 3, 4, 5], desc: 'Además, las dos diagonales principales no repiten números.' },
  { id: 'killer', nombre: 'Killer', corto: 'Killer', n: 9, caja: [3, 3], niveles: [0, 1, 2, 3, 4, 5], desc: 'Jaulas punteadas con una suma: sus números suman el total y no se repiten.' },
  { id: 'irregular', nombre: 'Irregular (jigsaw)', corto: 'Irregular', n: 9, caja: null, niveles: [0, 1, 2, 3, 4, 5], desc: 'Las cajas tienen formas irregulares, pero cada una lleva del 1 al 9.' },
  { id: 'hipercubo', nombre: 'Hipercubo', corto: 'Hipercubo', n: 9, caja: [3, 3], niveles: [0, 1, 2, 3, 4, 5], desc: 'Cuatro ventanas extra de 3×3 (sombreadas) también llevan del 1 al 9.' }
];
export const variante = (id) => VARIANTES.find((v) => v.id === id) || VARIANTES[0];
export const nivelesDe = (id) => variante(id).niveles;

export function regionesCaja(n, caja) {
  const [bf, bc] = caja, reg = new Uint8Array(n * n), anchoBloques = n / bc;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) reg[r * n + c] = Math.floor(r / bf) * anchoBloques + Math.floor(c / bc);
  return reg;
}

let cacheCombos = {};
export function combosJaula(n) {
  if (cacheCombos[n]) return cacheCombos[n];
  const T = {};
  const rec = (d, k, suma, mask) => {
    if (k > 0) { ((T[k] = T[k] || {})[suma] = T[k][suma] || []).push(mask); }
    for (let x = d; x <= n; x++) rec(x + 1, k + 1, suma + x, mask | (1 << (x - 1)));
  };
  rec(1, 0, 0, 0);
  return (cacheCombos[n] = T);
}

/* p = {v, n?, reg?, jaulas?: [{c:[celdas], s}]} */
export function modelo(p) {
  const V = variante(p.v), n = V.n, N = n * n;
  const reg = p.reg ? Uint8Array.from(p.reg) : regionesCaja(n, V.caja);
  const unidades = [];
  for (let r = 0; r < n; r++) {
    const celdas = [];
    for (let i = 0; i < N; i++) if (reg[i] === r) celdas.push(i);
    unidades.push({ celdas, tipo: 'region', nombre: (V.id === 'irregular' ? 'región ' : 'caja ') + (r + 1) });
  }
  const filas = [], cols = [];
  for (let r = 0; r < n; r++) { const a = [], b = []; for (let k = 0; k < n; k++) { a.push(r * n + k); b.push(k * n + r); } filas.push(a); cols.push(b); }
  filas.forEach((c, r) => unidades.push({ celdas: c, tipo: 'fila', nombre: 'fila ' + (r + 1) }));
  cols.forEach((c, r) => unidades.push({ celdas: c, tipo: 'columna', nombre: 'columna ' + (r + 1) }));
  if (V.id === 'diagonal') {
    const a = [], b = [];
    for (let r = 0; r < n; r++) { a.push(r * n + r); b.push(r * n + (n - 1 - r)); }
    unidades.push({ celdas: a, tipo: 'extra', nombre: 'diagonal principal' }, { celdas: b, tipo: 'extra', nombre: 'diagonal secundaria' });
  }
  if (V.id === 'hipercubo') {
    let k = 1;
    for (const r0 of [1, 5]) for (const c0 of [1, 5]) {
      const a = [];
      for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) a.push(r * n + c);
      unidades.push({ celdas: a, tipo: 'extra', nombre: 'ventana ' + (k++) });
    }
  }
  const jaulas = (p.jaulas || []).map((j) => ({ celdas: j.c.slice(), suma: j.s }));
  const jaulaDe = new Int16Array(N).fill(-1);
  jaulas.forEach((j, k) => j.celdas.forEach((c) => { jaulaDe[c] = k; }));
  const grupos = unidades.map((u) => u.celdas).concat(jaulas.map((j) => j.celdas));
  const ve = new Uint8Array(N * N), pares = [];
  const sets = Array.from({ length: N }, () => new Set());
  grupos.forEach((g) => g.forEach((a) => g.forEach((b) => { if (a !== b) sets[a].add(b); })));
  for (let i = 0; i < N; i++) { pares.push(Int16Array.from(sets[i])); sets[i].forEach((j) => { ve[i * N + j] = 1; }); }
  const inter = [];
  for (let a = 0; a < unidades.length; a++) for (let b = 0; b < unidades.length; b++) {
    if (a === b) continue;
    const B = new Set(unidades[b].celdas), I = unidades[a].celdas.filter((c) => B.has(c));
    if (I.length >= 2 && I.length < unidades[a].celdas.length) inter.push({ a, b, celdas: I });
  }
  return { id: V.id, n, N, reg, unidades, filas, cols, jaulas, jaulaDe, grupos, pares, ve, inter, todo: (1 << n) - 1, combos: combosJaula(n) };
}

export const nombreCelda = (M, i) => 'F' + (Math.floor(i / M.n) + 1) + 'C' + ((i % M.n) + 1);
