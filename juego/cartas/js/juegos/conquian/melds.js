// Combinaciones del Conquian (baraja española de 40): trios/cuartetos del mismo numero y escaleras del mismo palo (3 o mas), con comodin opcional.
// `analizar` decide si un grupo de cartas es una combinacion valida; `mejorPlan` busca la mejor forma de bajar cartas (para bots y ayuda).
import { TIPOS, parse } from '../../marco/barajas.js';

export const COMODIN = '0J';
export function perfil(cfg = {}) {
  const t = TIPOS.es40, puente = cfg.puente !== false, pos = {};
  t.valores.forEach((v, i) => { pos[v] = i; });
  if (!puente) { pos[10] = 8; pos[11] = 9; pos[12] = 10; }
  const len = Math.max(...Object.values(pos)) + 1, existe = new Array(len + 1).fill(false);
  Object.values(pos).forEach((p) => { existe[p] = true; });
  if (cfg.asAlto) existe[len] = true;
  return { pos, len, existe, asAlto: !!cfg.asAlto, S: t.palos.length, palos: t.palos, minEsc: Math.max(3, cfg.minEsc | 0 || 3), maxJ: cfg.maxComodinesPorCombo == null ? 1 : cfg.maxComodinesPorCombo };
}
export const valorPuntos = (c) => { if (c === COMODIN) return 15; const v = parse(c).v; return v >= 10 ? 10 : v; };
// -> {ok, t:'trio'|'esc', orden:[cartas ordenadas], etiqueta, motivo?}
export function analizar(cartas, P) {
  const n = cartas.length;
  if (n < 3) return { ok: false, motivo: 'Se necesitan al menos 3 cartas' };
  const jok = cartas.filter((c) => c === COMODIN), re = cartas.filter((c) => c !== COMODIN).map((c) => ({ c, ...parse(c) }));
  if (jok.length > P.maxJ) return { ok: false, motivo: 'Demasiados comodines en una combinación' };
  if (re.length < 2) return { ok: false, motivo: 'Faltan cartas reales' };
  if (re.every((x) => x.v === re[0].v)) { // trio / cuarteto
    const suits = new Set(re.map((x) => x.p));
    if (suits.size !== re.length) return { ok: false, motivo: 'Cartas repetidas' };
    if (n > P.S) return { ok: false, motivo: 'Un cuarteto tiene como mucho 4 cartas' };
    return { ok: true, t: 'trio', orden: re.map((x) => x.c).sort((a, b) => P.palos.indexOf(parse(a).p) - P.palos.indexOf(parse(b).p)).concat(jok), rango: re[0].v, etiqueta: (n === 4 ? 'Cuarteto' : 'Trío') + ' de ' + re[0].v };
  }
  if (!re.every((x) => x.p === re[0].p)) return { ok: false, motivo: 'Un trío necesita el mismo número; una escalera, el mismo palo' };
  // escalera: probar el As bajo y alto
  const as = re.filter((x) => x.v === 1).length;
  if (as > 1) return { ok: false, motivo: 'Cartas repetidas' };
  let mejor = null;
  for (const alto of (as ? (P.asAlto ? [false, true] : [false]) : [false])) {
    const ps = re.map((x) => ({ c: x.c, p: x.v === 1 && alto ? P.len : P.pos[x.v] })).sort((a, b) => a.p - b.p);
    if (ps.some((x, i) => i && x.p === ps[i - 1].p)) continue;
    const lo = ps[0].p, hi = ps[ps.length - 1].p, huecos = [];
    for (let q = lo + 1; q < hi; q++) if (!ps.some((x) => x.p === q)) huecos.push(q);
    if (huecos.length > jok.length || huecos.some((q) => !P.existe[q])) continue;
    let sobran = jok.length - huecos.length, bajo = lo, alt = hi;
    while (sobran > 0 && alt + 1 <= P.len && P.existe[alt + 1] && !(P.asAlto === false && alt + 1 === P.len)) { alt++; sobran--; }
    while (sobran > 0 && bajo - 1 >= 0 && P.existe[bajo - 1]) { bajo--; sobran--; }
    if (sobran > 0) continue;
    const orden = []; let ji = 0;
    for (let q = bajo; q <= alt; q++) { const x = ps.find((y) => y.p === q); orden.push(x ? x.c : jok[ji++]); }
    if (orden.length < P.minEsc) continue;
    mejor = { ok: true, t: 'esc', orden, palo: re[0].p, etiqueta: 'Escalera de ' + nomPalo(re[0].p) };
    break;
  }
  return mejor || { ok: false, motivo: 'No forman una escalera válida' };
}
const NOMP = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };
const nomPalo = (p) => NOMP[p] || p;

export const sinCartas = (mano, cartas) => { const o = mano.slice(); for (const c of cartas) { const k = o.indexOf(c); if (k < 0) return null; o.splice(k, 1); } return o; };
const puedeTocar = (e, quien, due) => e === 'todas' || (e === 'propias' && quien === due);
export function puedeAgregarA(meld, cartas, P, modo, quien) { return puedeTocar(modo, quien, meld.due) && analizar(meld.c.concat(cartas), P).ok; }

// ---- planificador: maxima cantidad de cartas de la mano que se pueden colocar ----
function mascaras(mano, P) { // subconjuntos validos (mascaras de bits): solo dentro de un mismo numero o palo (+ comodines)
  const n = mano.length, out = new Set(), jok = [], porV = {}, porP = {};
  mano.forEach((c, i) => { if (c === COMODIN) { jok.push(i); return; } const q = parse(c); (porV[q.v] = porV[q.v] || []).push(i); (porP[q.p] = porP[q.p] || []).push(i); });
  const probar = (idx) => {
    for (let m = 1; m < (1 << idx.length); m++) {
      let k = 0, mask = 0; for (let x = 0; x < idx.length; x++) if (m & (1 << x)) { k++; mask |= 1 << idx[x]; }
      if (k < 2) continue;
      for (const extra of [null].concat(jok)) {
        const mk = extra == null ? mask : mask | (1 << extra), cs = []; for (let i = 0; i < n; i++) if (mk & (1 << i)) cs.push(mano[i]);
        if (cs.length >= 3 && !out.has(mk) && analizar(cs, P).ok) out.add(mk);
      }
    }
  };
  Object.values(porV).forEach(probar); Object.values(porP).forEach(probar);
  return [...out];
}
const bits = (m) => { let k = 0; for (; m; m &= m - 1) k++; return k; };
function particion(valid, n, libre, forzada) { // mejor cobertura con combinaciones disjuntas; devuelve {cubre, melds:[mask]}
  const memo = new Map();
  const rec = (resto) => {
    if (!resto) return { cubre: 0, melds: [] };
    if (memo.has(resto)) return memo.get(resto);
    const i = 31 - Math.clz32(resto & -resto) | 0, bit = resto & -resto;
    let mejor = null;
    const sin = rec(resto & ~bit); mejor = { cubre: sin.cubre, melds: sin.melds };
    for (const m of valid) if ((m & bit) && (m & resto) === m) { const r = rec(resto & ~m); const c = r.cubre + bits(m); if (c > mejor.cubre) mejor = { cubre: c, melds: [m].concat(r.melds) }; }
    memo.set(resto, mejor); return mejor;
  };
  const todo = libre;
  if (forzada == null) return rec(todo);
  const fb = 1 << forzada; let mejor = null;
  if (!(todo & fb)) return null;
  for (const m of valid) if ((m & fb) && (m & todo) === m) { const r = rec(todo & ~m); const c = r.cubre + bits(m); if (!mejor || c > mejor.cubre) mejor = { cubre: c, melds: [m].concat(r.melds) }; }
  return mejor;
}
// mano: cartas; mesa: [{id,due,c}]; cfg: {modoAgregar}; yo: asiento; forzada: indice de carta de la mano que debe quedar colocada (descarte tomado)
export function mejorPlan(mano, mesa, P, opt = {}) {
  const modo = opt.modoAgregar || 'todas', yo = opt.yo == null ? 0 : opt.yo, n = mano.length;
  // cartas que pueden agregarse a la mesa (cierre): intentar anexar todas las que se pueda, de forma iterativa
  const cierre = (permitidas) => {
    const mm = mesa.map((x) => ({ id: x.id, due: x.due, c: x.c.slice() })), usadas = [], pasos = [];
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const i of permitidas) {
        if (usadas.includes(i)) continue;
        for (const m of mm) if (puedeAgregarA(m, [mano[i]], P, modo, yo)) { m.c.push(mano[i]); usadas.push(i); pasos.push({ t: 'agregar', m: m.id, cartas: [mano[i]] }); cambio = true; break; }
      }
    }
    return { usadas, pasos };
  };
  const todas = Array.from({ length: n }, (_, i) => i);
  const A = [...new Set([].concat(cierre(todas).usadas, cierre(todas.slice().reverse()).usadas, ...todas.map((i) => cierre([i]).usadas)))].sort((a, b) => a - b);
  const valid = mascaras(mano, P);
  let mejor = null;
  const subconj = []; if (A.length <= 6) for (let s = 0; s < (1 << A.length); s++) subconj.push(s); else subconj.push(0, (1 << A.length) - 1);
  for (const s of subconj) {
    const elegidas = A.filter((_, k) => s & (1 << k));
    const cl = cierre(elegidas); if (cl.usadas.length !== elegidas.length) continue;
    let libre = 0; for (let i = 0; i < n; i++) if (!elegidas.includes(i)) libre |= 1 << i;
    let p;
    if (opt.forzada != null && !elegidas.includes(opt.forzada)) { p = particion(valid, n, libre, opt.forzada); if (!p) continue; } else p = particion(valid, n, libre, null);
    const cubre = elegidas.length + p.cubre;
    if (!mejor || cubre > mejor.cubre || (cubre === mejor.cubre && p.melds.length + elegidas.length < mejor.nPasos)) mejor = { cubre, elegidas, melds: p.melds, nPasos: p.melds.length + elegidas.length, cl };
  }
  if (!mejor) return { cubre: 0, pasos: [], resto: mano.slice(), indicesResto: todas };
  const pasos = [];
  for (const m of mejor.melds) { const cs = []; for (let i = 0; i < n; i++) if (m & (1 << i)) cs.push(mano[i]); pasos.push({ t: 'bajar', cartas: cs }); }
  mejor.cl.pasos.forEach((p) => pasos.push(p));
  const usados = new Set(mejor.elegidas); mejor.melds.forEach((m) => { for (let i = 0; i < n; i++) if (m & (1 << i)) usados.add(i); });
  const indicesResto = todas.filter((i) => !usados.has(i));
  return { cubre: mejor.cubre, pasos, resto: indicesResto.map((i) => mano[i]), indicesResto };
}
export function etiquetaMeld(m, P) { const a = analizar(m.c, P); return a.ok ? a.etiqueta : 'Combinación'; }
export function ordenarMeld(m, P) { const a = analizar(m.c, P); return a.ok ? a.orden : m.c.slice(); }

// ---- descartes: utilidad de cada carta para formar combinaciones ----
export function utilidadCarta(c, resto, P, ocultas) { // ocultas: cartas ya vistas (mesa/descartes) para estimar companeras posibles
  if (c === COMODIN) return 100;
  const q = parse(c); let u = 0;
  const vistas = ocultas ? ocultas.filter((x) => x !== COMODIN && parse(x).v === q.v).length : 0;
  for (const o of resto) {
    if (o === c || o === COMODIN) { if (o === COMODIN) u += 2; continue; }
    const r = parse(o);
    if (r.v === q.v) u += vistas >= 2 ? 1.2 : 3;
    else if (r.p === q.p) { const d = Math.abs(P.pos[r.v] - P.pos[q.v]); if (d === 1) u += 2.6; else if (d === 2) u += 1.2; }
  }
  return u + (q.v <= 7 ? 0.05 * (8 - Math.abs(q.v - 4)) : 0);
}
export function elegirDescarte(resto, P, ocultas, vetadas) {
  let mejor = null;
  resto.forEach((c, k) => {
    if (vetadas && vetadas.includes(c)) return;
    const u = utilidadCarta(c, resto.filter((_, j) => j !== k), P, ocultas);
    if (!mejor || u < mejor.u) mejor = { c, u, k };
  });
  return mejor || (resto.length ? { c: resto[0], u: 0, k: 0 } : null);
}
