// IA de los bots: Recluta (0), Estratega (1) y Maestro (2). decidir() devuelve una sola orden valida para el estado actual.
import { N, ADY, CONT_DE, DE_CONT } from './mapa.js';
import { probConquista, mejorConjunto, debeCanjear, aliados, objetivoActivo, alcanzables, contarTerr } from './reglas.js';

export const NIVELES = [{ id: 0, nombre: 'Recluta' }, { id: 1, nombre: 'Estratega' }, { id: 2, nombre: 'Maestro' }];

const enemigos = (est, j, t) => ADY[t].filter((x) => !aliados(est, j, est.o[x]));
const amenaza = (est, j, t) => enemigos(est, j, t).reduce((s, x) => s + est.e[x], 0);

// Interes estrategico de cada continente para j (0..~3): cuanto falta, cuanto bono, si ya lo tengo casi.
function interesContinentes(est, j, nivel) {
  const r = DE_CONT.map((ts, ci) => {
    const mias = ts.filter((t) => est.o[t] === j).length, tot = ts.length;
    const bono = [5, 2, 5, 3, 8, 2][ci];
    const frac = mias / tot;
    let v = (bono / tot) * 3 * (0.4 + frac * 1.6);
    if (mias === tot) v = 0;
    const duenos = new Set(ts.map((t) => est.o[t]));
    if (duenos.size === 1 && !duenos.has(j)) v += 1.8; // romper el bono de un rival
    return v;
  });
  const o = objetivoActivo(est, j);
  if (nivel >= 2 && o && o.t === 'cont') { r[o.c[0]] += 1.5; r[o.c[1]] += 1.5; }
  return r;
}
function valorObjetivo(est, j, t, nivel, interes) {
  let v = interes[CONT_DE[t]] * 0.35;
  const dueno = est.o[t];
  const ts = DE_CONT[CONT_DE[t]];
  if (ts.filter((x) => est.o[x] === j).length === ts.length - 1 && est.o[t] !== j) v += 2.4; // cierra un continente
  const o = objetivoActivo(est, j);
  if (nivel >= 2 && o && o.t === 'elim' && dueno === o.j) v += 1.2 + (contarTerr(est, o.j) <= 4 ? 1.5 : 0);
  if (nivel >= 1 && est.jug[dueno] && contarTerr(est, dueno) <= 3) v += 0.6; // rematar rivales
  return v;
}

function colocar(est, j, nivel, rnd) {
  const mias = []; for (let i = 0; i < N; i++) if (est.o[i] === j) mias.push(i);
  const front = mias.filter((t) => enemigos(est, j, t).length);
  const cand = front.length ? front : mias;
  const interes = interesContinentes(est, j, nivel);
  let mejor = cand[0], ms = -1e9;
  const k = Math.min(est.pool, Math.max(1, Math.ceil(est.pool / 3)));
  for (const t of cand) {
    const en = enemigos(est, j, t), am = amenaza(est, j, t);
    let s = rnd() * (nivel === 0 ? 5 : 0.3);
    if (nivel >= 1) {
      let of = 0;
      for (const x of en) {
        const g = (probConquista(est.e[t] + k - 1, est.e[x]) - probConquista(est.e[t] - 1, est.e[x])) * (1 + valorObjetivo(est, j, x, nivel, interes));
        if (g > of) of = g;
      }
      s += of * 2 + Math.min(1, am / (est.e[t] + 1)) * (nivel >= 2 ? 0.35 : 0.2) - est.e[t] * 0.03;
    }
    if (s > ms) { ms = s; mejor = t; }
  }
  const n = nivel === 0 ? Math.min(est.pool, 1 + Math.floor(rnd() * 3)) : k;
  return { t: 'colocar', a: mejor, n: Math.max(1, n) };
}

function mejorAtaque(est, j, nivel, rnd) {
  const interes = interesContinentes(est, j, nivel);
  const umbral = [0.3, 0.4, 0.42][nivel];
  let mejor = null, ms = -1e9;
  const yaConquisto = est.ganoCarta;
  for (let d = 0; d < N; d++) {
    if (est.o[d] !== j || est.e[d] < 2) continue;
    const apoyo = est.e[d] - 1;
    for (const h of enemigos(est, j, d)) {
      const p = probConquista(apoyo, est.e[h]);
      const val = valorObjetivo(est, j, h, nivel, interes);
      let u = umbral;
      if (nivel >= 2) { if (!yaConquisto) u -= 0.08; if (val > 2) u -= 0.1; if (yaConquisto && val < 0.5) u += 0.1; }
      if (nivel === 1 && yaConquisto && val < 0.3) u += 0.05;
      if (p < u) continue;
      let s = p * (1 + val) + (nivel === 0 ? rnd() * 1.5 : 0) - est.e[h] * 0.05;
      if (nivel >= 1) { // no dejar un punto debil
        const queda = est.e[d] - Math.min(3, apoyo);
        if (amenaza(est, j, d) > queda * 2.5 && p < 0.8) s -= 0.5;
        s += (est.e[d] > 6 ? 0.2 : 0);
      }
      if (s > ms) { ms = s; mejor = { d, h, p }; }
    }
  }
  return mejor;
}

function mejorFortificacion(est, j, nivel, rnd) {
  if (nivel === 0 && rnd() < 0.7) return null;
  let mejor = null, ms = 0;
  for (let a = 0; a < N; a++) {
    if (est.o[a] !== j || est.e[a] < 2) continue;
    const propioAm = amenaza(est, j, a);
    const dest = alcanzables(est, j, a);
    for (const b of dest) {
      const am = amenaza(est, j, b);
      if (am <= 0) continue;
      const disp = est.e[a] - 1 - (propioAm > 0 ? Math.min(est.e[a] - 1, Math.ceil(propioAm / 3)) : 0);
      if (disp < 1) continue;
      const s = (am - est.e[b]) * 0.8 + am * 0.2 + disp * 0.3 - (propioAm > 0 ? propioAm * 0.4 : 0);
      if (s > ms && (propioAm === 0 || am > propioAm * 1.2)) { ms = s; mejor = { d: a, h: b, n: disp }; }
    }
  }
  return mejor;
}

export function decidir(est, j, nivel = 1, rnd = Math.random) {
  if (est.conq) {
    const { d, h, min, max } = est.conq;
    if (nivel === 0) return { t: 'mover', n: Math.max(min, Math.floor(max / 2)) };
    const ah = amenaza(est, j, h), ad = amenaza(est, j, d) - est.e[h];
    if (ah <= 0 && ad <= 0) return { t: 'mover', n: max };
    if (ah <= 0) return { t: 'mover', n: min };
    if (ad <= 0) return { t: 'mover', n: max };
    return { t: 'mover', n: Math.round(min + (max - min) * (ah / (ah + ad))) };
  }
  const cartas = est.jug[j].cartas;
  if (est.fase === 'colocar') return colocar(est, j, nivel, rnd);
  if (est.fase === 'refuerzo') {
    if (cartas.length >= 3) { const c = mejorConjunto(est, j); if (c && (debeCanjear(est, j) || nivel >= 1 || cartas.length >= 4)) return { t: 'canjear', cartas: c }; }
    if (est.pool > 0) return colocar(est, j, nivel, rnd);
    return { t: 'atacarFase' };
  }
  if (est.fase === 'ataque') {
    if (cartas.length >= 6) { const c = mejorConjunto(est, j); if (c) return { t: 'canjear', cartas: c }; }
    if (est.pool > 0) return colocar(est, j, nivel, rnd);
    const a = mejorAtaque(est, j, nivel, rnd);
    if (a) return nivel === 0 ? { t: 'atacar', d: a.d, h: a.h } : { t: 'blitz', d: a.d, h: a.h, max: nivel === 2 ? 5 : 8 };
    const f = mejorFortificacion(est, j, nivel, rnd);
    return f ? { t: 'fortificar', ...f } : { t: 'terminar' };
  }
  return { t: 'terminar' };
}
