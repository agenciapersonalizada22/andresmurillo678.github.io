// Bots: reciben SOLO la vista publica de su asiento (igual que un cliente humano) y devuelven una orden.
import { MAZO, SALTO, REVERSA, MAS2, MAS4, valor, esComodin, siguiente } from './reglas.js';

export const NIVELES = [
  { id: 0, nombre: 'Novato', olvidoUno: 0.3, caza: 0.25, retardo: [1100, 2200], cazaRetardo: [1500, 2600] },
  { id: 1, nombre: 'Medio', olvidoUno: 0.08, caza: 0.6, retardo: [800, 1600], cazaRetardo: [900, 2000] },
  { id: 2, nombre: 'Estratega', olvidoUno: 0, caza: 0.97, retardo: [600, 1300], cazaRetardo: [400, 1100] }
];

export function nuevaMemoria() { return { sin: {}, pref: {} }; }
// Eventos publicos: el estratega deduce que color no tiene cada rival.
export function observar(mem, ev) {
  if (ev.t === 'reparto' || ev.t === 'rota' || ev.t === 'cambio') { mem.sin = {}; mem.pref = {}; return; }
  if (ev.t === 'robo' && ev.motivo === 'voluntario') (mem.sin[ev.j] = mem.sin[ev.j] || {})[ev.color] = true;
  if (ev.t === 'jugar') {
    const s = (mem.sin[ev.j] = mem.sin[ev.j] || {});
    for (const id of ev.cartas) if (MAZO[id].c < 4) s[MAZO[id].c] = false;
    mem.pref[ev.j] = ev.color;
  }
}

const cuentaColores = (mano) => { const c = [0, 0, 0, 0]; for (const id of mano) if (MAZO[id].c < 4) c[MAZO[id].c]++; return c; };
const elegir = (a, azar) => a[Math.floor(azar() * a.length)];
const mejorColor = (mano, azar) => {
  const c = cuentaColores(mano);
  let best = -1, k0 = 0;
  for (let k = 0; k < 4; k++) { const p = c[k] * 10 + azar() * 3; if (p > best) { best = p; k0 = k; } }
  return k0;
};

export function decidir(v, mem, nivel, azar) {
  const mano = v.mano, n = v.n, yo = v.yo;
  const sigJ = siguiente({ n, dir: v.dir }, yo);
  const rivalPoco = v.conteos[sigJ] <= 2;
  if (v.pend > 0) {
    if (v.puedeDesafiar) {
      let p = nivel === 0 ? 0.3 : nivel === 1 ? 0.4 : 0.35;
      if (nivel === 2) {
        const ofensor = siguiente({ n, dir: -v.dir }, yo);
        const s = mem.sin[ofensor];
        if (s && s[v.color] === true) p = 0.1; else if (v.pend >= 4 && mano.length >= 8) p = 0.6;
      }
      if (azar() < p) return { t: 'desafiar' };
    }
    if (v.jug.length) return armarJugada(v, mem, nivel, azar, v.jug[0]);
    return { t: 'robar' };
  }
  if (v.robo) return v.jug.length ? armarJugada(v, mem, nivel, azar, v.jug[0]) : v.puedePasar ? { t: 'pasar' } : { t: 'robar' };
  if (!v.jug.length) return v.puedeRobar ? { t: 'robar' } : { t: 'pasar' };
  let opciones = v.jug;
  const legal4 = !mano.some((c) => MAZO[c].c === v.color);
  if (nivel > 0 && !legal4) { const sin4 = opciones.filter((id) => MAZO[id].v !== MAS4); if (sin4.length) opciones = sin4; }
  if (nivel === 0) return armarJugada(v, mem, nivel, azar, elegir(opciones, azar));
  const cnt = cuentaColores(mano);
  const minRival = Math.min(...v.conteos.filter((_, i) => i !== yo));
  let mejor = opciones[0], mp = -1e9;
  for (const id of opciones) {
    const c = MAZO[id];
    let p = azar() * 2;
    if (esComodin(id)) p -= opciones.length > 1 ? 25 : 0;
    else { p += cnt[c.c] * 2; p += valor(id) * 0.15; }
    if ([SALTO, REVERSA, MAS2].includes(c.v) && rivalPoco) p += 22;
    if (c.v === MAS4 && (rivalPoco || mano.length <= 3)) p += 30;
    if (c.v === SALTO && n === 2) p += 4;
    if (nivel === 2) {
      const prox = mem.sin[sigJ];
      if (prox && !esComodin(id) && prox[c.c] === true) p += (c.v === SALTO || c.v === MAS2) ? 8 : 5;
      if (v.conteos.some((x, i) => i !== yo && x === 1) && [SALTO, MAS2, MAS4, REVERSA].includes(c.v)) p += 10;
      if (v.cfg.cero7 && c.v === 7) p += mano.length > minRival ? 8 : -6;
      if (c.v === 0 && v.cfg.cero7) p += mano.length > 5 ? 3 : -4;
      if (mano.length <= 3) p += valor(id) * 0.3;
    }
    if (p > mp) { mp = p; mejor = id; }
  }
  return armarJugada(v, mem, nivel, azar, mejor);
}

function armarJugada(v, mem, nivel, azar, id) {
  const mano = v.mano;
  let cartas = [id];
  if (v.cfg.multiples && nivel > 0) {
    const hermanas = mano.filter((x) => x !== id && MAZO[x].v === MAZO[id].v);
    if (hermanas.length && (nivel === 2 || azar() < 0.6)) {
      const resto = mano.filter((x) => x !== id && !hermanas.includes(x));
      const cc = cuentaColores(resto);
      // la ultima carta define el color: la del color que mas conservo; la primera debe ser jugable
      const otras = hermanas.slice().sort((a, b) => (MAZO[a].c < 4 ? cc[MAZO[a].c] : -1) - (MAZO[b].c < 4 ? cc[MAZO[b].c] : -1));
      cartas = [id, ...otras];
      if (!v.cfg.comodinFinal && cartas.length === mano.length && esComodin(id)) cartas = [id];
    }
  }
  const orden = { t: 'jugar', cartas };
  const ultima = MAZO[cartas[cartas.length - 1]];
  const resto = mano.filter((x) => !cartas.includes(x));
  if (ultima.c === 4) {
    if (nivel === 2) {
      const s = mem.sin[siguiente({ n: v.n, dir: v.dir }, v.yo)];
      const c = cuentaColores(resto);
      let b = -1, bk = 0;
      for (let k = 0; k < 4; k++) { const p = c[k] * 3 + (s && s[k] === true ? 7 : 0) + azar(); if (p > b) { b = p; bk = k; } }
      orden.color = bk;
    } else orden.color = nivel === 0 ? Math.floor(azar() * 4) : mejorColor(resto, azar);
  }
  if (v.cfg.cero7 && MAZO[cartas[0]].v === 7 && cartas.length < mano.length) {
    const otros = [];
    for (let i = 0; i < v.n; i++) if (i !== v.yo) otros.push(i);
    orden.objetivo = nivel === 0 ? elegir(otros, azar) : otros.reduce((a, b) => (v.conteos[b] < v.conteos[a] ? b : a));
  }
  return orden;
}

export const olvidaUno = (nivel, azar) => azar() < NIVELES[nivel].olvidoUno;
