// Generador de puzzles con solucion unica garantizada y dificultad calibrada por el clasificador. Determinista por semilla.
import { crearAzar, hashTexto } from './azar.js';
import { modelo, variante, regionesCaja } from './variantes.js';
import { resolver, unaSolucion } from './solver.js';
import { clasificar } from './tecnicas.js';

/* tec: tecnica maxima permitida; req: nivel minimo exigido; pistas: [min,max] de pistas objetivo. */
const BASE = [
  { tec: 0, req: 0, pistas: [37, 44] }, { tec: 1, req: 1, pistas: [0, 0] }, { tec: 2, req: 2, pistas: [0, 0] },
  { tec: 3, req: 3, pistas: [0, 0] }, { tec: 4, req: 4, pistas: [0, 0] }, { tec: 9, req: 5, pistas: [0, 0] }
];
const ESPEC = {
  cuatro: [{ tec: 0, req: 0, pistas: [10, 11] }, { tec: 1, req: 0, pistas: [7, 9] }, { tec: 2, req: 0, pistas: [0, 0] }],
  seis: [{ tec: 0, req: 0, pistas: [22, 26] }, { tec: 1, req: 0, pistas: [17, 19] }, { tec: 2, req: 0, pistas: [14, 16] }, { tec: 4, req: 0, pistas: [0, 0] }]
};
const espec = (v, nivel) => (ESPEC[v] || BASE)[Math.min(nivel, (ESPEC[v] || BASE).length - 1)];
const TAM_JAULA = [[0.15, 0.5, 0.35], [0.1, 0.45, 0.35, 0.1], [0, 0.4, 0.4, 0.2], [0, 0.25, 0.4, 0.35], [0, 0.2, 0.35, 0.45], [0, 0.1, 0.3, 0.6]];

function conexa(reg, n, id) {
  const cel = []; for (let i = 0; i < n * n; i++) if (reg[i] === id) cel.push(i);
  const vis = new Set([cel[0]]), cola = [cel[0]];
  while (cola.length) {
    const i = cola.pop(), r = Math.floor(i / n), c = i % n;
    for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1]) if (j >= 0 && reg[j] === id && !vis.has(j)) { vis.add(j); cola.push(j); }
  }
  return vis.size === cel.length;
}
const vecinos = (n, i) => { const r = Math.floor(i / n), c = i % n, a = []; if (r > 0) a.push(i - n); if (r < n - 1) a.push(i + n); if (c > 0) a.push(i - 1); if (c < n - 1) a.push(i + 1); return a; };

/* Cajas irregulares: parte de las cajas 3x3 e intercambia celdas fronterizas manteniendo cada region conexa. */
export function layoutIrregular(az) {
  const n = 9, reg = regionesCaja(n, [3, 3]);
  for (let it = 0; it < 1500; it++) {
    const a = az.int(81), A = reg[a], nb = vecinos(n, a).filter((j) => reg[j] !== A);
    if (!nb.length) continue;
    const B = reg[az.elegir(nb)], cand = [];
    for (let b = 0; b < 81; b++) if (reg[b] === B && vecinos(n, b).some((j) => reg[j] === A)) cand.push(b);
    if (!cand.length) continue;
    const b = az.elegir(cand);
    reg[a] = B; reg[b] = A;
    if (!conexa(reg, n, A) || !conexa(reg, n, B)) { reg[a] = A; reg[b] = B; }
  }
  return Array.from(reg);
}

/* Jaulas killer: crecen por vecinos sin repetir digito de la solucion. */
function crearJaulas(n, sol, az, nivel) {
  const N = n * n, jaula = new Int16Array(N).fill(-1), dist = TAM_JAULA[nivel], jaulas = [];
  const orden = az.mezclar(Array.from({ length: N }, (_, i) => i));
  for (const ini of orden) {
    if (jaula[ini] >= 0) continue;
    let r = az.elegir([0, 1, 2, 3]), obj = 1, acum = 0;
    r = az();
    for (let k = 0; k < dist.length; k++) { acum += dist[k]; if (r <= acum) { obj = k + 1; break; } }
    const cel = [ini], ds = new Set([sol[ini]]); jaula[ini] = jaulas.length;
    while (cel.length < obj) {
      const op = [];
      for (const i of cel) for (const j of vecinos(n, i)) if (jaula[j] < 0 && !ds.has(sol[j]) && !op.includes(j)) op.push(j);
      if (!op.length) break;
      const j = az.elegir(op); jaula[j] = jaulas.length; cel.push(j); ds.add(sol[j]);
    }
    jaulas.push({ c: cel, s: cel.reduce((s, i) => s + sol[i], 0) });
  }
  return jaulas;
}

function generarKiller(sol, az, nivel) {
  let mejor = null;
  for (let t = 0; t < 16; t++) {
    const jaulas = crearJaulas(9, sol, az, nivel), dados = new Uint8Array(81);
    const base = { v: 'killer', jaulas };
    const M = modelo(base);
    let res = resolver(M, dados, 2), guard = 0;
    while (res.length > 1 && guard++ < 50) {
      const dif = []; for (let i = 0; i < 81; i++) if (res[0][i] !== res[1][i]) dif.push(i);
      const i = az.elegir(dif); dados[i] = sol[i];
      res = resolver(M, dados, 2);
    }
    if (res.length !== 1) continue;
    const pistas = dados.reduce((s, x) => s + (x ? 1 : 0), 0);
    const cl = clasificar(M, dados, { sol });
    const meta = Math.max(1, nivel), dif = cl.nivel - meta;
    const cand = { base, dados, pistas, cl, dist: dif < 0 ? -dif : (dif <= 1 && meta < 5 ? 0 : dif) };
    if (!mejor || cand.dist < mejor.dist) mejor = cand;
    if (cand.dist === 0) break;
  }
  return mejor;
}

function cavar(M, sol, az, e, simetria) {
  const N = M.N, d = Uint8Array.from(sol);
  const orden = az.mezclar(Array.from({ length: N }, (_, i) => i));
  const stop = e.pistas[0] + az.int(e.pistas[1] - e.pistas[0] + 1);
  let pistas = N;
  for (const i of orden) {
    if (pistas <= stop) break;
    const cs = simetria && N - 1 - i !== i ? [i, N - 1 - i] : [i];
    const hay = cs.filter((x) => d[x] !== 0);
    if (!hay.length) continue;
    const gu = hay.map((x) => d[x]);
    hay.forEach((x) => { d[x] = 0; });
    let ok = resolver(M, d, 2).length === 1;
    if (ok && e.tec < 5) ok = clasificar(M, d, { nivelMax: e.tec, sol }).ok;
    if (ok) pistas -= hay.length; else hay.forEach((x, k) => { d[x] = gu[k]; });
  }
  return { d, pistas };
}

const aTexto = (a) => Array.from(a).join('');

/* opciones: {variante, nivel (0-5), semilla (texto|numero), intentos} -> puzzle serializable. */
export function generar({ variante: vid = 'clasico', nivel = 1, semilla, intentos } = {}) {
  const V = variante(vid), N = V.n * V.n;
  nivel = Math.max(0, Math.min(nivel, V.niveles[V.niveles.length - 1]));
  const sem = semilla == null ? ((Math.random() * 4294967296) >>> 0) : semilla;
  const az = crearAzar(typeof sem === 'string' ? hashTexto(vid + '|' + nivel + '|' + sem) : sem);
  let reg = null, M0, solArr = null;
  for (let t = 0; t < 30 && !solArr; t++) {
    reg = vid === 'irregular' ? layoutIrregular(az) : null;
    M0 = modelo({ v: vid, reg });
    solArr = resolver(M0, new Uint8Array(N), 1, az, 3000)[0] || null;
  }
  let sol = aTexto(solArr);
  const salida = (extra, dados, cl, pistas, sl = sol) => Object.assign({ v: vid, n: V.n, reg, jaulas: null, dados: aTexto(dados), sol: sl, nivel: cl.nivel, puntos: cl.puntos, pistas, nivelPedido: nivel, semilla: sem }, extra);
  if (vid === 'killer') {
    const k = generarKiller(solArr, az, nivel);
    return salida({ jaulas: k.base.jaulas, aproximado: k.dist > 0 }, k.dados, k.cl, k.pistas);
  }
  const e = espec(vid, nivel), simetria = vid !== 'irregular' && nivel < 3;
  const max = intentos || (e.req >= 3 ? 100 : e.req >= 2 ? 60 : 12);
  let mejor = null;
  for (let t = 0; t < max; t++) {
    if (t > 0 && t % 5 === 0 && vid !== 'irregular') { solArr = resolver(M0, new Uint8Array(N), 1, az)[0]; sol = aTexto(solArr); }
    const { d, pistas } = cavar(M0, solArr, az, e, simetria);
    const cl = clasificar(M0, d, { sol: solArr });
    if (!cl.ok) continue;
    const dist = cl.nivel < e.req ? e.req - cl.nivel : (cl.nivel > nivel && e.tec < 9 ? cl.nivel - nivel : 0);
    if (!mejor || dist < mejor.dist || (dist === mejor.dist && cl.puntos > mejor.cl.puntos)) mejor = { d, pistas, cl, dist, sol };
    if (dist === 0) break;
  }
  return salida({ aproximado: mejor.dist > 0 }, mejor.d, mejor.cl, mejor.pistas, mejor.sol);
}

/* Genera con cualquier semilla (rellena mundo para un puzzle de texto pegado). */
export function describirTexto(texto) {
  const t = texto.replace(/[\s|+\-_]/g, '').replace(/[.xX*]/g, '0');
  const n = { 16: 4, 36: 6, 81: 9 }[t.length];
  if (!n || /[^0-9]/.test(t) || [...t].some((c) => +c > n)) return null;
  return { n, dados: t, v: n === 9 ? 'clasico' : n === 6 ? 'seis' : 'cuatro' };
}
export function analizarTexto(texto) {
  const p = describirTexto(texto);
  if (!p) return { error: 'Escribe 16, 36 u 81 caracteres: números del 1 al 9 y 0 o . para las celdas vacías.' };
  const M = modelo({ v: p.v }), d = Uint8Array.from(p.dados, Number);
  const r = resolver(M, d, 2);
  if (!r.length) return { error: 'Este puzzle no tiene solución (hay números repetidos o contradicciones).' };
  const cl = clasificar(M, d, { sol: r[0] });
  return { puzzle: { v: p.v, n: p.n, reg: null, jaulas: null, dados: p.dados, sol: aTexto(r[0]), nivel: cl.nivel, puntos: cl.puntos, pistas: d.filter((x) => x).length }, unico: r.length === 1 };
}
