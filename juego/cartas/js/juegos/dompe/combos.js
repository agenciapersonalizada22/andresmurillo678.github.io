// Evaluador de manos de 6 cartas del Dompe con comodines. Puro (sin DOM). Un comodin vale cualquier carta de la baraja
// siempre que la mano resultante no repita una carta real (mismo valor y palo) ni tenga mas de un valor que palos.
import { TIPOS, parse } from '../../marco/barajas.js';

export const CATS = ['escCol', 'cuartetoPar', 'escalera', 'dosTercias', 'tresPares', 'cuarteto', 'terciaPar', 'color', 'tercia', 'dosPares', 'par', 'alta'];
export const ORDEN_DEF = CATS.slice();
export const GANA_DEF = ['escCol', 'cuartetoPar', 'escalera', 'dosTercias', 'tresPares'];
export const NOMBRES = {
  escCol: 'Escalera de 6 del mismo palo', cuartetoPar: 'Cuarteto + par', escalera: 'Escalera de 6', dosTercias: 'Dos tercias', tresPares: 'Tres pares',
  cuarteto: 'Cuarteto', terciaPar: 'Tercia + par', color: 'Color (6 del mismo palo)', tercia: 'Tercia', dosPares: 'Dos pares', par: 'Un par', alta: 'Carta alta',
};
export const CORTOS = { escCol: 'Esc. de color', cuartetoPar: 'Cuarteto+par', escalera: 'Escalera', dosTercias: '2 tercias', tresPares: '3 pares', cuarteto: 'Cuarteto', terciaPar: 'Tercia+par', color: 'Color', tercia: 'Tercia', dosPares: '2 pares', par: 'Par', alta: 'Alta' };
export const BIT = {}; CATS.forEach((c, i) => { BIT[c] = 1 << i; });
export const N = 6;

export function ordenValido(o) {
  const l = Array.isArray(o) ? o.filter((x, i, a) => CATS.includes(x) && a.indexOf(x) === i) : [];
  CATS.forEach((c) => { if (!l.includes(c)) l.push(c); });
  return l;
}
// codigos de comodin segun la baraja: espanola -> 2 de oros; francesa -> los jokers (0J)
export function comodinesDe(baraja, usar) { return usar ? (baraja === 'fr52' ? ['0J'] : ['2o']) : []; }

const cache = new Map();
export function perfil(cfg) {
  const orden = ordenValido(cfg.orden), asAlto = cfg.asAlto || 'ambos', puente = cfg.puente !== false, wilds = cfg.wilds || comodinesDe(cfg.baraja, cfg.comodin !== false);
  const clave = [cfg.baraja, asAlto, puente, wilds.join(), orden.join()].join('|');
  if (cache.has(clave)) return cache.get(clave);
  const t = TIPOS[cfg.baraja] || TIPOS.es40, R = t.valores.length, S = t.palos.length;
  const ri = {}, pos = {}, si = {};
  t.valores.forEach((v, i) => { ri[v] = i; pos[v] = i; });
  if (t.id === 'es40' && !puente) { pos[10] = 8; pos[11] = 9; pos[12] = 10; }
  const len = Math.max(...Object.values(pos)) + 1;
  t.palos.forEach((p, i) => { si[p] = i; });
  const val = t.valores.map((v) => (v === 1 ? (asAlto === 'bajo' ? 0 : len) : pos[v]));
  const score = {}; orden.forEach((c, i) => { score[c] = orden.length - i; });
  const P = { baraja: cfg.baraja, R, S, ri, pos, si, len, val, score, orden, asAlto, puente, wild: new Set(wilds), wilds, valores: t.valores, palos: t.palos, N };
  cache.set(clave, P);
  return P;
}
// posiciones que ocupa un valor al formar escaleras
function posiciones(v, P) {
  if (v !== 1) return [P.pos[v]];
  const o = []; if (P.asAlto !== 'alto') o.push(0); if (P.asAlto !== 'bajo') o.push(P.len); return o;
}
export function ventana(pres, P) { // devuelve la posicion mas alta de una escalera de N, o -1
  for (let s = P.len + 1 - P.N; s >= 0; s--) { let ok = true; for (let k = 0; k < P.N; k++) if (!pres[s + k]) { ok = false; break; } if (ok) return s + P.N - 1; }
  return -1;
}
export const cmpClave = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) return x > y ? 1 : -1; } return 0; };

// ---- evaluador rapido: enumera los valores posibles de los comodines (hasta 2) ----
export function evaluar(cartas, P) {
  const { R, S } = P, cnt = new Array(R).fill(0);
  let k = 0, su = -1, uni = true;
  const pres0 = new Uint8Array(P.len + 1);
  for (let i = 0; i < cartas.length; i++) {
    const c = cartas[i]; if (P.wild.has(c)) { k++; continue; }
    const q = parse(c), r = P.ri[q.v], s = P.si[q.p];
    cnt[r]++; if (su < 0) su = s; else if (su !== s) uni = false;
  }
  let mejor = null, mejorCat = '', props = 0;
  const probar = () => {
    const g = []; for (let r = 0; r < R; r++) if (cnt[r]) g.push(cnt[r] * 64 + P.val[r]);
    g.sort((a, b) => b - a);
    const c0 = g[0] >> 6, c1 = g.length > 1 ? g[1] >> 6 : 0, c2 = g.length > 2 ? g[2] >> 6 : 0;
    let pares = 0, tercias = 0; for (let x = 0; x < g.length; x++) { const c = g[x] >> 6; pares += c >> 1; if (c >= 3) tercias++; }
    let cat, b = 0;
    if (c0 === 4) { cat = c1 === 2 ? 'cuartetoPar' : 'cuarteto'; }
    else if (c0 === 3) { cat = c1 === 3 ? 'dosTercias' : c1 === 2 ? 'terciaPar' : 'tercia'; }
    else if (c0 === 2) { cat = c1 === 2 ? (c2 === 2 ? 'tresPares' : 'dosPares') : 'par'; }
    else {
      const pres = pres0.slice(); for (let r = 0; r < R; r++) if (cnt[r]) { const v = P.valores[r]; posiciones(v, P).forEach((p) => { pres[p] = 1; }); }
      const top = ventana(pres, P), color = uni;
      if (top >= 0) { cat = color ? 'escCol' : 'escalera'; b = top; } else cat = color ? 'color' : 'alta';
      if (top >= 0) props |= BIT.escalera | (color ? BIT.escCol : 0);
      if (color) props |= BIT.color;
    }
    props |= BIT[cat] | BIT.alta;
    if (c0 >= 4 && c1 >= 2) props |= BIT.cuartetoPar;
    if (tercias >= 2) props |= BIT.dosTercias;
    if (pares >= 3) props |= BIT.tresPares;
    if (c0 >= 4) props |= BIT.cuarteto;
    if (c0 >= 3 && c1 >= 2) props |= BIT.terciaPar;
    if (c0 >= 3) props |= BIT.tercia;
    if (pares >= 2) props |= BIT.dosPares;
    if (c0 >= 2) props |= BIT.par;
    const clave = [P.score[cat]];
    if (cat === 'escalera' || cat === 'escCol') clave.push(b); else for (let x = 0; x < g.length; x++) clave.push(g[x] & 63);
    if (!mejor || cmpClave(clave, mejor) > 0) { mejor = clave; mejorCat = cat; }
  };
  if (k === 0) probar();
  else if (k === 1) { for (let r = 0; r < R; r++) { cnt[r]++; if (cnt[r] <= S) probar(); cnt[r]--; } }
  else { for (let r = 0; r < R; r++) { cnt[r]++; for (let q = r; q < R; q++) { cnt[q]++; if (cnt[r] <= S && cnt[q] <= S) probar(); cnt[q]--; } cnt[r]--; } }
  return { cat: mejorCat, clave: mejor, props };
}
export const cumple = (cartas, P, ids) => { const p = evaluar(cartas, P).props; return ids.some((id) => p & BIT[id]); };
export const mascara = (ids) => ids.reduce((a, id) => a | BIT[id], 0);

// ---- distancia analitica: cuantas cartas de la mano hay que cambiar para cumplir una combinacion ----
function maxPares(cnt, np) { // maximo de cartas utiles al formar np pares exactos
  let dp = new Array(np + 1).fill(-1e9); dp[0] = 0;
  for (const c of cnt) { const nd = dp.slice(); for (let a = 0; a <= np; a++) if (dp[a] > -1e8) for (let p = 1; p <= 2 && a + p <= np; p++) nd[a + p] = Math.max(nd[a + p], dp[a] + Math.min(c, 2 * p)); dp = nd; }
  return dp[np];
}
export function distancia(cartas, id, P) {
  const { R } = P, cnt = new Array(R).fill(0), sc = new Array(P.S).fill(0), reales = [];
  let k = 0;
  for (const c of cartas) { if (P.wild.has(c)) { k++; continue; } const q = parse(c); cnt[P.ri[q.v]]++; sc[P.si[q.p]]++; reales.push(q); }
  const cap = (need, have) => Math.max(0, need - Math.min(need, have + k));
  const cs = cnt.slice().sort((a, b) => b - a);
  switch (id) {
    case 'tresPares': return 6 - Math.min(6, maxPares(cnt, 3) + k);
    case 'dosPares': return cap(4, maxPares(cnt, 2));
    case 'dosTercias': return cap(6, Math.min(cs[0], 3) + Math.min(cs[1], 3));
    case 'cuarteto': return cap(4, Math.min(cs[0], 4));
    case 'tercia': return cap(3, Math.min(cs[0], 3));
    case 'par': return cap(2, Math.min(cs[0], 2));
    case 'cuartetoPar': { let b = 0; for (let a = 0; a < R; a++) for (let c = 0; c < R; c++) if (a !== c) b = Math.max(b, Math.min(cnt[a], 4) + Math.min(cnt[c], 2)); return cap(6, b); }
    case 'terciaPar': { let b = 0; for (let a = 0; a < R; a++) for (let c = 0; c < R; c++) if (a !== c) b = Math.max(b, Math.min(cnt[a], 3) + Math.min(cnt[c], 2)); return cap(5, b); }
    case 'color': return cap(6, Math.max(...sc));
    case 'escalera': case 'escCol': {
      const suitsList = id === 'escCol' ? P.palos : [null]; let mejor = 0;
      for (const palo of suitsList) {
        const pres = new Uint8Array(P.len + 1);
        reales.forEach((q) => { if (palo == null || q.p === palo) posiciones(q.v, P).forEach((p) => { pres[p] = 1; }); });
        for (let s = 0; s + P.N <= P.len + 1; s++) { let n = 0; for (let x = 0; x < P.N; x++) n += pres[s + x]; mejor = Math.max(mejor, n); }
      }
      return cap(6, mejor);
    }
    default: return 0;
  }
}
// cartas (de las no vistas) que completan una combinacion con un solo cambio. Devuelve {codigo: [ids que completa]}
export function salidas(cartas, P, ids, desconocidas) {
  const out = {}, mk = mascara(ids);
  for (let i = 0; i < cartas.length; i++) {
    const resto = cartas.slice(0, i).concat(cartas.slice(i + 1));
    for (const c of desconocidas) {
      const p = evaluar(resto.concat([c]), P).props & mk;
      if (p) ids.forEach((id) => { if (p & BIT[id]) { const l = out[id] || (out[id] = new Set()); l.add(c); } });
    }
  }
  return out;
}
// valoracion heuristica para elegir descartes (bots): cercania a las combinaciones ganadoras + fuerza de la mano
export function valor(cartas, P, gana) {
  const e = evaluar(cartas, P);
  if (e.props & mascara(gana)) return 1e6;
  let v = e.clave[0] * 2 + (e.clave[1] || 0) / 40, mejor = 9;
  for (const id of gana) { const d = distancia(cartas, id, P); mejor = Math.min(mejor, d); v += 14 * Math.pow(0.32, d); }
  return v - mejor * 0.01;
}
export function nombreMano(cat) { return NOMBRES[cat] || cat; }
