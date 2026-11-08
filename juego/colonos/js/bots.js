// Bots de tres niveles. Deciden solo con la vista de su asiento (mismo informacion que un humano).
import { geo, pips } from './geometria.js';
import { RES, COSTO, total, puedePagar, lugaresPoblado, lugaresCiudad, lugaresCamino, tasaBanco, victimas, cartasJugables, mapaPuertos, expectativa } from './reglas.js';

export const NIVELES = [
  { id: 0, nombre: 'Fácil', retardo: [650, 1300] },
  { id: 1, nombre: 'Normal', retardo: [550, 1100] },
  { id: 2, nombre: 'Difícil', retardo: [450, 900] }
];
export const nuevaMemoria = () => ({ turno: -1, ofertas: 0, espera: 0, acc: 0 });
const elegir = (a, r) => a[Math.floor(r() * a.length) % a.length];

function valorVertice(v, vtx, nivel, ctx) {
  const G = geo(v.cfg.radio), tipos = new Set();
  let sc = 0;
  for (const hi of G.verts[vtx].hs) {
    const h = v.hex[hi];
    if (h.t === 'des') continue;
    sc += pips(h.num) * ((ctx && ctx.peso && ctx.peso[h.t]) || 1); tipos.add(h.t);
  }
  sc += tipos.size * (nivel >= 2 ? 1.6 : 1);
  if (nivel >= 1 && ctx && ctx.puertos) {
    const p = ctx.puertos[vtx];
    if (p === 'gen') sc += nivel >= 2 ? 1.2 : 0.6;
    else if (p) { let g = 0; for (const hi of G.verts[vtx].hs) if (v.hex[hi].t === p) g += pips(v.hex[hi].num); sc += 0.6 + g * 0.5; }
  }
  return sc;
}
function pesos(v, j, nivel) { // en la fundacion, valora mas lo que aun no produces
  const p = { mad: 1, bar: 1, alg: 1, mai: 1.05, met: 1.05 };
  if (nivel >= 2) {
    const ex = expectativa(v, j);
    for (const r of RES) if (ex[r] === 0) p[r] += 0.35;
    p.mai += 0.15; p.met += 0.15;
  }
  return p;
}
const libre = (v, x) => { const G = geo(v.cfg.radio); return v.vj[x] === -1 && G.verts[x].ns.every((w) => v.vj[w] === -1); };

function mejorCamino(v, j, nivel, desde, r) {
  const G = geo(v.cfg.radio), ls = lugaresCamino(v, j, desde);
  if (!ls.length) return null;
  if (nivel === 0) return elegir(ls, r);
  const ctx = { peso: pesos(v, j, nivel), puertos: mapaPuertos(v) };
  let mejor = ls[0], mv = -1e9;
  for (const e of ls) {
    const A = G.aristas[e];
    const conectados = [A.a, A.b].filter((x) => v.vj[x] === j || G.verts[x].es.some((y) => v.ed[y] === j));
    const lejos = [A.a, A.b].filter((x) => !conectados.includes(x));
    const pts = (lejos.length ? lejos : [A.a, A.b]);
    let val = -5;
    for (const w of pts) {
      if (v.vj[w] !== -1 && v.vj[w] !== j) continue;
      if (libre(v, w)) val = Math.max(val, valorVertice(v, w, nivel, ctx));
      for (const x of G.verts[w].ns) if (libre(v, x)) val = Math.max(val, valorVertice(v, x, nivel, ctx) * 0.75);
    }
    val += r() * 0.4;
    if (nivel >= 2 && v.lens[j] >= 3) val += 0.8;
    if (val > mv) { mv = val; mejor = e; }
  }
  return mejor;
}
function mejorPoblado(v, j, nivel, fund, r) {
  const ls = lugaresPoblado(v, j, fund);
  if (!ls.length) return null;
  if (nivel === 0) return elegir(ls, r);
  const ctx = { peso: pesos(v, j, nivel), puertos: mapaPuertos(v) };
  let mejor = ls[0], mv = -1e9;
  for (const x of ls) { const val = valorVertice(v, x, nivel, ctx) + r() * (nivel >= 2 ? 0.3 : 1.2); if (val > mv) { mv = val; mejor = x; } }
  return mejor;
}

/* ---------- objetivo y comercio ---------- */
function objetivo(v, j, nivel) {
  const P = v.piezas[j], hayPob = lugaresPoblado(v, j, false).length > 0 && P.pob > 0;
  const hayCiu = lugaresCiudad(v, j).length > 0 && P.ciu > 0;
  const lista = [];
  const pv = v.mazoN > 0;
  if (nivel >= 2) {
    if (hayPob) lista.push('pob');
    if (hayCiu) lista.push('ciu');
    if (!hayPob && P.cam > 0) lista.push('cam');
    if (pv) lista.push('carta');
  } else {
    if (hayCiu) lista.push('ciu');
    if (hayPob) lista.push('pob');
    if (pv) lista.push('carta');
    if (P.cam > 0) lista.push('cam');
  }
  return lista;
}
const faltan = (m, c) => { const f = {}; let n = 0; for (const k in c) { const x = c[k] - m[k]; if (x > 0) { f[k] = x; n += x; } } return { f, n }; };
function planBanco(v, j, obj) {
  const m = v.mano, c = COSTO[obj], { f } = faltan(m, c);
  for (const r of Object.keys(f)) {
    if (v.banco[r] < 1) continue;
    let mejor = null, ms = 0;
    for (const g of RES) {
      if (g === r) continue;
      const tasa = tasaBanco(v, j, g), sobra = m[g] - (c[g] || 0);
      if (sobra >= tasa && sobra - tasa >= ms) { ms = sobra - tasa; mejor = g; }
    }
    if (mejor) return { t: 'banco', da: mejor, recibe: r };
  }
  return null;
}
function planOferta(v, j, obj) {
  const m = v.mano, c = COSTO[obj], { f, n } = faltan(m, c);
  if (n === 0 || n > 2) return null;
  const r = Object.keys(f)[0];
  let g = null, mx = 0;
  for (const k of RES) { const s = m[k] - (c[k] || 0); if (k !== r && s > mx) { mx = s; g = k; } }
  if (!g) return null;
  return { t: 'ofrecer', da: { [g]: 1 }, pide: { [r]: 1 } };
}

export function responderTrato(v, mem, nivel, r) {
  const tr = v.trato, j = v.yo;
  if (!tr || tr.de === j || !puedePagar(v.mano, tr.pide)) return false;
  if (nivel === 0) return r() < 0.4;
  const obj = objetivo(v, j, nivel)[0] || 'ciu', c = COSTO[obj];
  let val = 0;
  for (const k of RES) {
    const w = (c[k] || 0) > v.mano[k] ? 2 : v.mano[k] > (c[k] || 0) + 1 ? 0.5 : 1;
    val += w * ((tr.da[k] || 0) - (tr.pide[k] || 0)) * (nivel >= 2 ? 1 : 0.9);
  }
  if (nivel >= 2 && v.pts[tr.de] >= v.cfg.meta - 3) return false;
  return val > 0 || (val === 0 && r() < 0.2);
}

/* ---------- ladron y descarte ---------- */
export function elegirLadron(v, nivel, r) {
  const G = geo(v.cfg.radio), j = v.yo;
  const cand = [];
  G.hexes.forEach((hx, hi) => {
    if (hi === v.ladron) return;
    let val = 0, propio = 0;
    for (const x of hx.vs) {
      const o = v.vj[x];
      if (o === j) propio += pips(v.hex[hi].num) * v.vc[x];
      else if (o >= 0) val += pips(v.hex[hi].num) * v.vc[x] * (1 + (v.pts[o] >= v.cfg.meta - 3 ? 0.6 : 0) + v.pts[o] * 0.04);
    }
    if (v.hex[hi].t === 'des') val *= 0.2;
    cand.push({ hi, val: val - propio * (nivel === 0 ? 0.5 : 3) + r() * (nivel === 0 ? 6 : 0.5) });
  });
  cand.sort((a, b) => b.val - a.val);
  const hi = nivel === 0 ? cand[Math.floor(r() * Math.min(8, cand.length))].hi : cand[0].hi;
  const vic = victimas(v, hi, j);
  let victima;
  if (vic.length > 1) {
    victima = vic.slice().sort((a, b) => (v.pts[b] + v.totales[b] * 0.1) - (v.pts[a] + v.totales[a] * 0.1))[nivel === 0 ? Math.floor(r() * vic.length) : 0];
    if (nivel === 0) victima = elegir(vic, r);
  }
  return { t: 'ladron', h: hi, victima };
}
export function elegirDescarte(v, nivel, r) {
  const j = v.yo, k = v.desc[j], m = { ...v.mano }, d = {};
  const obj = nivel ? objetivo(v, j, nivel)[0] || 'ciu' : null, c = obj ? COSTO[obj] : {};
  for (let i = 0; i < k; i++) {
    let mejor = null, ms = -1e9;
    for (const x of RES) {
      if (m[x] <= 0) continue;
      const s = nivel ? m[x] - (c[x] || 0) + r() * 0.3 : r();
      if (s > ms) { ms = s; mejor = x; }
    }
    m[mejor]--; d[mejor] = (d[mejor] || 0) + 1;
  }
  return { t: 'descartar', r: d };
}

/* ---------- decision principal ---------- */
export function decidir(v, mem, nivel, r) {
  const j = v.yo;
  if (v.fase === 'descartar') return v.desc[j] ? elegirDescarte(v, nivel, r) : null;
  if (v.turno !== j) return null;
  if (mem.turno !== v.numTurno) { mem.turno = v.numTurno; mem.ofertas = 0; mem.espera = 0; mem.acc = 0; }
  mem.acc++;
  const cj = cartasJugables(v, j);
  switch (v.fase) {
    case 'fundacion':
      if (v.fund.pend === 'pob') return { t: 'poblado', v: mejorPoblado(v, j, nivel, true, r) };
      return { t: 'camino', e: mejorCamino(v, j, nivel, v.fund.ult, r) };
    case 'tirada': {
      if (cj.guardia && !v.cartaJug && nivel >= 1) {
        const G = geo(v.cfg.radio);
        const mio = G.hexes[v.ladron].vs.some((x) => v.vj[x] === j) && v.hex[v.ladron].t !== 'des';
        if (mio || (nivel >= 2 && cj.guardia >= 2)) return { t: 'jugarCarta', carta: 'guardia' };
      }
      return { t: 'tirar' };
    }
    case 'ladron': return elegirLadron(v, nivel, r);
    case 'accion': return accion(v, mem, nivel, r, cj);
    default: return null;
  }
}

function accion(v, mem, nivel, r, cj) {
  const j = v.yo, m = v.mano, P = v.piezas[j];
  if (mem.acc > 40) return { t: 'terminar' };
  if (v.camGratis > 0) {
    const e = mejorCamino(v, j, nivel, -1, r);
    return e == null ? { t: 'terminar' } : { t: 'camino', e };
  }
  if (v.trato && v.trato.de === j) {
    const tr = v.trato, si = tr.a.find((x) => tr.resp[x] === 'si');
    if (si != null) return { t: 'cerrarTrato', con: si };
    if (tr.a.every((x) => tr.resp[x] === 'no') || ++mem.espera > 8) return { t: 'cancelarTrato' };
    return { t: 'esperar' };
  }
  const G = geo(v.cfg.radio);
  // cartas de desarrollo
  if (!v.cartaJug) {
    if (cj.guardia) {
      const mio = G.hexes[v.ladron].vs.some((x) => v.vj[x] === j) && v.hex[v.ladron].t !== 'des';
      const ej = v.jugadas[j].guardia + 1 >= 3 && v.ejer.j !== j;
      if (mio || (nivel >= 1 && (ej || cj.guardia >= 2)) || (nivel === 0 && r() < 0.2)) return { t: 'jugarCarta', carta: 'guardia' };
    }
    if (cj.rutas && P.cam >= 2 && lugaresCamino(v, j).length && (nivel >= 1 || r() < 0.5)) return { t: 'jugarCarta', carta: 'rutas' };
    if (cj.cosecha && nivel >= 1) {
      const o = objetivo(v, j, nivel)[0] || 'ciu', { f } = faltan(m, COSTO[o]);
      const pide = []; for (const k of Object.keys(f)) for (let i = 0; i < f[k]; i++) pide.push(k);
      while (pide.length < 2) pide.push(m.met < m.mai ? 'met' : 'mai');
      if (v.banco[pide[0]] > 0 && v.banco[pide[1]] > (pide[0] === pide[1] ? 1 : 0)) return { t: 'jugarCarta', carta: 'cosecha', r1: pide[0], r2: pide[1] };
    }
    if (cj.acaparar && nivel >= 1) {
      let mejor = null, ms = 0;
      for (const k of RES) { const est = v.totales.reduce((a, b, i) => a + (i === j ? 0 : b), 0) / 5; if (est > ms && (k === 'met' || k === 'mai' || r() < 0.4)) { ms = est; mejor = k; } }
      if (mejor && ms >= 2.2 && r() < 0.6) return { t: 'jugarCarta', carta: 'acaparar', r: nivel >= 2 ? 'met' : mejor };
    }
  }
  const lugCiu = lugaresCiudad(v, j), lugPob = P.pob > 0 ? lugaresPoblado(v, j, false) : [];
  const ctx = { peso: pesos(v, j, nivel), puertos: mapaPuertos(v) };
  const mejorDe = (ls) => ls.reduce((b, x) => (valorVertice(v, x, nivel, ctx) > valorVertice(v, b, nivel, ctx) ? x : b), ls[0]);
  if (nivel === 0 && r() < 0.12) return { t: 'terminar' };
  const pob = () => lugPob.length && puedePagar(m, COSTO.pob);
  const ciu = () => lugCiu.length && P.ciu > 0 && puedePagar(m, COSTO.ciu);
  const ordenPref = ['ciu', 'pob'];
  for (const o of ordenPref) {
    if (o === 'pob' && pob()) return { t: 'poblado', v: nivel ? mejorDe(lugPob) : elegir(lugPob, r) };
    if (o === 'ciu' && ciu()) return { t: 'ciudad', v: nivel ? mejorDe(lugCiu) : elegir(lugCiu, r) };
  }
  const objs = objetivo(v, j, nivel);
  // carta de desarrollo
  if (v.mazoN > 0 && puedePagar(m, COSTO.carta) && (nivel === 0 || nivel >= 2 || !lugPob.length || r() < 0.5) && (nivel === 0 || objs[0] !== 'ciu' || !puedePagar(m, { mai: 1, met: 2 }) || r() < 0.4)) return { t: 'comprarCarta' };
  // camino
  if (P.cam > 0 && puedePagar(m, COSTO.cam) && (nivel === 0 || !lugPob.length) && total(m) >= 2) {
    const e = mejorCamino(v, j, nivel, -1, r);
    if (e != null && (nivel === 0 || P.cam > 4 || v.lens[j] >= 3 || !lugPob.length)) return { t: 'camino', e };
  }
  // banco
  if (nivel >= 1 || r() < 0.3) for (const o of objs) {
    const b = planBanco(v, j, o);
    if (b) return b;
    if (!faltan(m, COSTO[o]).n) break;
  }
  // oferta a otros jugadores
  if (v.cfg.trato && nivel >= 1 && mem.ofertas < (nivel >= 2 ? 2 : 1)) {
    for (const o of objs) {
      const of = planOferta(v, j, o);
      if (of) { mem.ofertas++; return of; }
    }
  }
  return { t: 'terminar' };
}
