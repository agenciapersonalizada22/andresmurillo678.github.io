// IA de veintiuno: usa solo la vista del asiento. novato: errores frecuentes; medio: estrategia simple; experto: estrategia basica completa y apuesta segun el conteo.
import { parse } from '../../marco/barajas.js';
import { sig, ent } from '../../marco/rng.js';

const pts = (c) => { const v = parse(c).v; return v === 1 ? 11 : v >= 10 ? 10 : v; };
function resumenMano(cs) {
  let t = 0, as = 0; cs.forEach((c) => { const v = parse(c).v; t += v === 1 ? 1 : v >= 10 ? 10 : v; if (v === 1) as++; });
  const blando = as > 0 && t + 10 <= 21;
  return { t: blando ? t + 10 : t, blando };
}
// accion de estrategia basica para blackjack. L = acciones legales.
function basica(m, up, L, h17) {
  const { t, blando } = resumenMano(m.c);
  const par = m.c.length === 2 && pts(m.c[0]) === pts(m.c[1]);
  const puede = (a) => !!L[a];
  const D = (alt) => (puede('doblar') ? { t: 'doblar' } : { t: alt });
  if (puede('rendirse') && !blando) {
    if (t === 16 && !par && (up === 9 || up === 10 || up === 11)) return { t: 'rendirse' };
    if (t === 15 && (up === 10 || (h17 && up === 11))) return { t: 'rendirse' };
  }
  if (par && puede('dividir')) {
    const r = pts(m.c[0]);
    if (r === 11 || r === 8) return { t: 'dividir' };
    if (r === 9 && ![7, 10, 11].includes(up)) return { t: 'dividir' };
    if (r === 7 && up <= 7) return { t: 'dividir' };
    if (r === 6 && up >= 2 && up <= 6) return { t: 'dividir' };
    if (r === 4 && (up === 5 || up === 6)) return { t: 'dividir' };
    if ((r === 2 || r === 3) && up <= 7) return { t: 'dividir' };
  }
  if (blando) {
    if (t >= 20) return { t: 'plantarse' };
    if (t === 19) return up === 6 && puede('doblar') ? { t: 'doblar' } : { t: 'plantarse' };
    if (t === 18) { if (up >= 3 && up <= 6) return D('plantarse'); return up <= 8 ? { t: 'plantarse' } : { t: 'pedir' }; }
    if (t === 17) return up >= 3 && up <= 6 ? D('pedir') : { t: 'pedir' };
    if (t >= 15) return up >= 4 && up <= 6 ? D('pedir') : { t: 'pedir' };
    return up === 5 || up === 6 ? D('pedir') : { t: 'pedir' };
  }
  if (t >= 17) return { t: 'plantarse' };
  if (t >= 13) return up <= 6 ? { t: 'plantarse' } : { t: 'pedir' };
  if (t === 12) return up >= 4 && up <= 6 ? { t: 'plantarse' } : { t: 'pedir' };
  if (t === 11) return up === 11 && !h17 ? { t: 'pedir' } : D('pedir');
  if (t === 10) return up <= 9 ? D('pedir') : { t: 'pedir' };
  if (t === 9) return up >= 3 && up <= 6 ? D('pedir') : { t: 'pedir' };
  return { t: 'pedir' };
}
function simple(m, up, L) {
  const { t, blando } = resumenMano(m.c);
  if (m.c.length === 2 && pts(m.c[0]) === pts(m.c[1]) && L.dividir && (pts(m.c[0]) === 11 || pts(m.c[0]) === 8)) return { t: 'dividir' };
  if (t === 11 && L.doblar) return { t: 'doblar' };
  if (blando) return t >= 18 ? { t: 'plantarse' } : { t: 'pedir' };
  if (t >= 17) return { t: 'plantarse' };
  if (t >= 13) return up <= 6 ? { t: 'plantarse' } : { t: 'pedir' };
  if (t === 12) return up >= 4 && up <= 6 ? { t: 'plantarse' } : { t: 'pedir' };
  return { t: 'pedir' };
}

// siete y medio: probabilidad de pasarse con la siguiente carta segun lo visible
function probPasarse(v, mano) {
  const vistas = {};
  const marcar = (c) => { if (c) vistas[c] = (vistas[c] || 0) + 1; };
  v.jug.forEach((p) => p.manos.forEach((m) => m.c.forEach(marcar))); v.banca.c.forEach(marcar);
  const mazos = v.mazos || 1; let tot = 0, mal = 0;
  const t = mano.t;
  ['o', 'c', 'e', 'b'].forEach((p) => [1, 2, 3, 4, 5, 6, 7, 10, 11, 12].forEach((val) => {
    const q = Math.max(0, mazos - (vistas[val + p] || 0)); tot += q;
    const pt = val >= 10 ? 1 : val * 2; if (t + pt > 15) mal += q;
  }));
  return tot ? mal / tot : 0.5;
}
function sm(v, i, L, nivel, rng) {
  const m = v.jug[i].manos[v.turno ? v.turno.m : 0], t = m.t, up = v.banca.c[0];
  if (L.dividir && nivel !== 'novato' && parse(m.c[0]).v === parse(m.c[1]).v && parse(m.c[0]).v <= 7 && parse(m.c[0]).v >= 5 && m.c.length === 2) return { t: 'dividir' };
  if (nivel === 'novato') return t < 9 + ent(rng, 3) ? { t: 'pedir' } : { t: 'plantarse' };
  const p = probPasarse(v, { t });
  const umbral = nivel === 'medio' ? 0.4 : 0.34 + (up && pts(up) > 5 ? 0.06 : 0);
  if (t <= 9) return L.doblar && nivel === 'experto' && t >= 7 && t <= 8 && p < 0.1 ? { t: 'doblar' } : { t: 'pedir' };
  return p < umbral ? { t: 'pedir' } : { t: 'plantarse' };
}

export function bot(v, i, nivel, rng) {
  const L = v.legal; if (!L) return null;
  if (v.fase === 'apuestas') {
    if (L.max < L.min) return { t: 'pasar' };
    let u = 1;
    if (nivel === 'novato') u = 1 + ent(rng, 4);
    else if (nivel === 'medio') u = 2;
    else { const verdad = v.conteo / Math.max(0.5, v.restantes / 52); u = verdad < 1 ? 1 : Math.min(8, Math.floor(verdad) + 1); }
    const a = Math.max(L.min, Math.min(L.max, v.min * u));
    return { t: 'apostar', a: Math.floor(a / v.min) * v.min >= L.min ? Math.floor(a / v.min) * v.min : a };
  }
  if (v.fase === 'seguro') {
    const verdad = v.conteo / Math.max(0.5, v.restantes / 52);
    return { t: 'seguro', si: nivel === 'experto' && verdad >= 3 };
  }
  if (v.fase === 'banca') { const t = resumenMano(v.banca.c).t; return t >= 17 ? { t: 'plantarse' } : { t: 'pedir' }; }
  if (v.variante === 'sm') return sm(v, i, L, nivel, rng);
  const m = v.jug[i].manos[v.turno.m], up = pts(v.banca.c[0]);
  if (nivel === 'novato') {
    const { t } = resumenMano(m.c);
    if (sig(rng) < 0.18) return sig(rng) < 0.5 ? { t: 'pedir' } : { t: 'plantarse' };
    return t < 15 ? { t: 'pedir' } : { t: 'plantarse' };
  }
  let a = nivel === 'medio' ? simple(m, up, L) : basica(m, up, L, v.blando17 === 'pide');
  if (!L[a.t === 'doblar' ? 'doblar' : a.t === 'dividir' ? 'dividir' : a.t === 'rendirse' ? 'rendirse' : 'pedir']) a = { t: 'pedir' };
  return a;
}
