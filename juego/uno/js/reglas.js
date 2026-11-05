// Motor de reglas puro (sin DOM). Lo ejecuta solo el anfitrion; los clientes reciben vistas filtradas.
export const COLORES = ['Rojo', 'Amarillo', 'Verde', 'Azul'];
export const SALTO = 10, REVERSA = 11, MAS2 = 12, COMODIN = 13, MAS4 = 14;

export const MAZO = (() => {
  const m = [];
  for (let c = 0; c < 4; c++) {
    m.push({ c, v: 0 });
    for (let v = 1; v <= 12; v++) m.push({ c, v }, { c, v });
  }
  for (let i = 0; i < 4; i++) m.push({ c: 4, v: COMODIN });
  for (let i = 0; i < 4; i++) m.push({ c: 4, v: MAS4 });
  return m;
})();
export const TOTAL = MAZO.length; // 108

export const valor = (id) => { const v = MAZO[id].v; return v <= 9 ? v : v <= 12 ? 20 : 50; };
export const esComodin = (id) => MAZO[id].c === 4;

export const REGLAS_BASE = {
  apilar: false, multiples: false, cero7: false, atrapado: true, penaUno: true, ventanaUno: 3000,
  puntuacion: 'ronda', meta: 500, robarHasta: false, comodinFinal: true, tiempo: 0
};
export function limpiarReglas(r) {
  const o = { ...REGLAS_BASE };
  r = r || {};
  for (const k of ['apilar', 'multiples', 'cero7', 'atrapado', 'penaUno', 'robarHasta', 'comodinFinal']) if (typeof r[k] === 'boolean') o[k] = r[k];
  if (r.puntuacion === 'unica' || r.puntuacion === 'ronda') o.puntuacion = r.puntuacion;
  if ([10000, 30000, 0].includes(r.tiempo)) o.tiempo = r.tiempo;
  if (Number.isInteger(r.ventanaUno) && r.ventanaUno >= 500 && r.ventanaUno <= 10000) o.ventanaUno = r.ventanaUno;
  if (Number.isInteger(r.meta) && r.meta >= 50 && r.meta <= 5000) o.meta = r.meta;
  return o;
}

/* ---------- azar determinista (estado guardado en est.rs) ---------- */
function azar(est) {
  let t = (est.rs = (est.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const entero = (est, n) => Math.floor(azar(est) * n);
function barajar(est, a) {
  for (let i = a.length - 1; i > 0; i--) { const j = entero(est, i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

const sig = (est, j, k = 1) => (((j + est.dir * k) % est.n) + est.n) % est.n;
export const siguiente = sig;
const tope = (est) => est.pila[est.pila.length - 1];
const err = (e) => ({ ok: false, err: e });
const OK = { ok: true };

export function nuevaPartida(cfg, n, semilla) {
  if (!(n >= 2 && n <= 6)) throw new Error('jugadores 2-6');
  const est = {
    v: 1, n, cfg: limpiarReglas(cfg), rs: semilla | 0, ronda: 0, puntos: new Array(n).fill(0), repartidor: n - 1,
    mano: [], mazo: [], pila: [], color: 0, dir: 1, turno: 0, pend: 0, pendTipo: 0, desafio: null, robo: false, ult: -1,
    uno: [], unoVent: null, sinJ: 0, fin: null, ev: [], campeon: -1
  };
  iniciarRonda(est);
  return est;
}

export function iniciarRonda(est) {
  const n = est.n;
  est.ronda++; est.fin = null; est.mano = Array.from({ length: n }, () => []);
  est.mazo = barajar(est, Array.from({ length: TOTAL }, (_, i) => i)); est.pila = [];
  for (let r = 0; r < 7; r++) for (let j = 0; j < n; j++) est.mano[j].push(est.mazo.pop());
  let id;
  for (;;) { id = est.mazo.pop(); if (MAZO[id].v === MAS4) est.mazo.unshift(id); else break; }
  est.pila = [id];
  const c = MAZO[id];
  est.color = c.c === 4 ? entero(est, 4) : c.c;
  est.dir = 1; est.pend = 0; est.pendTipo = 0; est.desafio = null; est.robo = false; est.ult = -1;
  est.uno = new Array(n).fill(false); est.unoVent = null; est.sinJ = 0;
  est.ev.push({ t: 'reparto', ronda: est.ronda, repartidor: est.repartidor });
  let ini = (est.repartidor + 1) % n;
  if (c.v === SALTO) ini = (ini + 1) % n;
  else if (c.v === REVERSA) { if (n === 2) ini = est.repartidor; else { est.dir = -1; ini = (est.repartidor - 1 + n) % n; } }
  est.turno = ini;
  if (c.v === MAS2) { robar(est, ini, 2, 'penal'); est.turno = sig(est, ini); }
  est.ev.push({ t: 'inicial', carta: id, color: est.color });
  return est;
}
export function siguienteRonda(est) {
  if (!est.fin || est.fin.partida) return false;
  est.repartidor = (est.repartidor + 1) % est.n;
  iniciarRonda(est);
  return true;
}

/* ---------- mazo ---------- */
function rebarajar(est) {
  if (est.pila.length <= 1) return false;
  const t = est.pila.pop();
  est.mazo = barajar(est, est.pila); est.pila = [t];
  est.ev.push({ t: 'rebaraja' });
  return true;
}
function sacar(est, k) {
  const r = [];
  while (r.length < k) { if (!est.mazo.length && !rebarajar(est)) break; r.push(est.mazo.pop()); }
  return r;
}
function robar(est, j, k, motivo) {
  const ids = sacar(est, k);
  est.mano[j].push(...ids);
  if (est.mano[j].length > 1) { est.uno[j] = false; if (est.unoVent && est.unoVent.j === j) est.unoVent = null; }
  est.ev.push({ t: 'robo', j, n: ids.length, ids, motivo, color: est.color });
  return ids;
}

/* ---------- consulta de jugadas ---------- */
const jugableCarta = (est, id) => { const c = MAZO[id]; return c.c === 4 || c.c === est.color || c.v === MAZO[tope(est)].v; };
export function jugables(est, j) {
  if (est.fin || est.turno !== j) return [];
  const m = est.mano[j];
  let r;
  if (est.pend > 0) r = est.cfg.apilar ? m.filter((id) => MAZO[id].v === (est.pendTipo === 2 ? MAS2 : MAS4)) : [];
  else if (est.robo && est.ult >= 0) r = m.includes(est.ult) && jugableCarta(est, est.ult) ? [est.ult] : [];
  else r = m.filter((id) => jugableCarta(est, id));
  if (!est.cfg.comodinFinal && m.length === 1) r = r.filter((id) => !esComodin(id));
  return r;
}
export const puedeDesafiar = (est, j) => !est.fin && est.turno === j && est.pend > 0 && !!est.desafio && est.desafio.j !== j;
export const puedeRobar = (est, j) => !est.fin && est.turno === j && (est.pend > 0 || !est.robo);
export const puedePasar = (est, j) => !est.fin && est.turno === j && est.pend === 0 && est.robo;

/* ---------- aplicar una orden ---------- */
export function aplicar(est, j, cmd, ahora = 0) {
  if (est.fin) return err('ronda terminada');
  if (!cmd || typeof cmd !== 'object' || !Number.isInteger(j) || j < 0 || j >= est.n) return err('orden');
  switch (cmd.t) {
    case 'jugar': return jugar(est, j, cmd, ahora);
    case 'robar': return cmdRobar(est, j);
    case 'pasar': if (!puedePasar(est, j)) return err('no puedes pasar'); pasarTurno(est, j); return OK;
    case 'desafiar': return desafiar(est, j);
    case 'uno': return gritarUno(est, j);
    case 'cazar': return cazar(est, j, ahora);
    default: return err('orden');
  }
}

function jugar(est, j, cmd, ahora) {
  if (est.turno !== j) return err('no es tu turno');
  const m = est.mano[j], cs = cmd.cartas;
  if (!Array.isArray(cs) || !cs.length || cs.length > (est.cfg.multiples ? 8 : 1)) return err('cartas');
  if (new Set(cs).size !== cs.length || !cs.every((id) => Number.isInteger(id) && m.includes(id))) return err('cartas');
  const v0 = MAZO[cs[0]].v;
  if (cs.some((id) => MAZO[id].v !== v0)) return err('deben ser iguales');
  if (!jugables(est, j).includes(cs[0])) return err('jugada no valida');
  if (!est.cfg.comodinFinal && cs.length === m.length && esComodin(cs[0])) return err('comodin final no permitido');
  const ultima = MAZO[cs[cs.length - 1]];
  let color = ultima.c;
  if (ultima.c === 4) { if (!Number.isInteger(cmd.color) || cmd.color < 0 || cmd.color > 3) return err('color'); color = cmd.color; }
  const vacia = cs.length === m.length;
  let obj = -1;
  if (est.cfg.cero7 && v0 === 7 && !vacia) {
    obj = cmd.objetivo;
    if (!Number.isInteger(obj) || obj < 0 || obj >= est.n || obj === j) return err('objetivo');
  }
  const tuvoColor = m.some((id) => MAZO[id].c === est.color);
  est.mano[j] = m.filter((id) => !cs.includes(id));
  for (const id of cs) est.pila.push(id);
  est.color = color; est.robo = false; est.ult = -1; est.sinJ = 0;
  est.ev.push({ t: 'jugar', j, cartas: cs.slice(), color, obj });
  let saltos = 0;
  if (v0 === SALTO) saltos = cs.length;
  else if (v0 === REVERSA) { if (est.n === 2) saltos = cs.length; else if (cs.length % 2) est.dir = -est.dir; est.ev.push({ t: 'reversa', dir: est.dir }); }
  else if (v0 === MAS2) { est.pend += 2 * cs.length; est.pendTipo = 2; }
  else if (v0 === MAS4) { const nuevo = est.pend === 0; est.pend += 4 * cs.length; est.pendTipo = 4; est.desafio = nuevo ? { j, legal: !tuvoColor } : null; }
  if (est.mano[j].length === 0) {
    if (est.pend > 0) { const v = sig(est, j); robar(est, v, est.pend, 'penal'); est.pend = 0; est.desafio = null; }
    return finRonda(est, j, false), OK;
  }
  if (est.cfg.cero7 && v0 === 0) rotarManos(est, cs.length);
  else if (est.cfg.cero7 && v0 === 7 && obj >= 0) {
    const t = est.mano[j]; est.mano[j] = est.mano[obj]; est.mano[obj] = t;
    est.ev.push({ t: 'cambio', j, a: obj });
    for (const x of [j, obj]) { est.uno[x] = false; if (est.unoVent && est.unoVent.j === x) est.unoVent = null; }
  }
  if (est.mano[j].length === 1 && !est.uno[j] && est.cfg.penaUno) { est.unoVent = { j, hasta: ahora + est.cfg.ventanaUno }; est.ev.push({ t: 'ventanaUno', j }); }
  if (est.mano[j].length > 1) est.uno[j] = false;
  est.turno = sig(est, j, 1 + saltos);
  if (saltos) est.ev.push({ t: 'salto', n: saltos, desde: j });
  resolverAuto(est);
  return OK;
}

function rotarManos(est, veces) {
  for (let k = 0; k < veces; k++) {
    const nueva = new Array(est.n);
    for (let i = 0; i < est.n; i++) nueva[sig(est, i)] = est.mano[i];
    est.mano = nueva;
  }
  est.ev.push({ t: 'rota', dir: est.dir });
  for (let x = 0; x < est.n; x++) { est.uno[x] = false; if (est.unoVent && est.unoVent.j === x) est.unoVent = null; }
}

/* Si el jugador del turno solo puede aceptar el castigo (no puede apilar ni desafiar), se resuelve solo. */
function resolverAuto(est) {
  if (est.pend <= 0 || est.fin) return;
  const j = est.turno;
  const apila = est.cfg.apilar && est.mano[j].some((id) => MAZO[id].v === (est.pendTipo === 2 ? MAS2 : MAS4));
  if (apila || (est.desafio && est.desafio.j !== j)) return;
  aceptarCastigo(est, j);
}
function aceptarCastigo(est, j) {
  robar(est, j, est.pend, 'penal');
  est.ev.push({ t: 'salto', n: 1, desde: sig(est, j, -1), victima: j });
  est.pend = 0; est.pendTipo = 0; est.desafio = null; est.robo = false; est.ult = -1; est.sinJ = 0;
  est.turno = sig(est, j);
  resolverAuto(est);
}

function cmdRobar(est, j) {
  if (est.turno !== j) return err('no es tu turno');
  if (est.pend > 0) { aceptarCastigo(est, j); return OK; }
  if (est.robo) return err('ya robaste');
  let ids;
  if (est.cfg.robarHasta) {
    ids = [];
    for (;;) {
      const x = sacar(est, 1);
      if (!x.length) break;
      est.mano[j].push(x[0]); ids.push(x[0]);
      est.ult = x[0];
      if (jugableCarta(est, x[0]) && (est.cfg.comodinFinal || est.mano[j].length > 1 || !esComodin(x[0]))) break;
    }
    if (ids.length) { if (est.mano[j].length > 1) { est.uno[j] = false; if (est.unoVent && est.unoVent.j === j) est.unoVent = null; } est.ev.push({ t: 'robo', j, n: ids.length, ids, motivo: 'voluntario', color: est.color }); }
  } else {
    ids = robar(est, j, 1, 'voluntario');
    est.ult = ids.length ? ids[0] : -1;
  }
  est.robo = true;
  if (!ids.length) est.ult = -1;
  if (ids.length ? !jugables(est, j).length : est.cfg.atrapado) pasarTurno(est, j);
  return OK;
}

function pasarTurno(est, j) {
  est.ev.push({ t: 'pasar', j });
  est.robo = false; est.ult = -1; est.sinJ++;
  est.turno = sig(est, j);
  if (est.sinJ >= est.n * 2 && !est.mazo.length && est.pila.length <= 1) bloqueo(est);
}
function bloqueo(est) {
  let g = 0, mejor = Infinity;
  for (let j = 0; j < est.n; j++) { const p = est.mano[j].reduce((s, id) => s + valor(id), 0) * 100 + est.mano[j].length; if (p < mejor) { mejor = p; g = j; } }
  finRonda(est, g, true);
}

function desafiar(est, j) {
  if (!puedeDesafiar(est, j)) return err('no puedes desafiar');
  const d = est.desafio, ok = !d.legal;
  if (ok) { robar(est, d.j, est.pend, 'desafio'); est.pend = 0; est.pendTipo = 0; est.desafio = null; }
  else { robar(est, j, est.pend + 2, 'desafio'); est.pend = 0; est.pendTipo = 0; est.desafio = null; est.turno = sig(est, j); }
  est.ev.push({ t: 'desafio', j, a: d.j, ok });
  est.sinJ = 0;
  return OK;
}

function gritarUno(est, j) {
  if (est.mano[j].length > 2) return err('aun no');
  est.uno[j] = true;
  if (est.unoVent && est.unoVent.j === j) est.unoVent = null;
  est.ev.push({ t: 'uno', j });
  return OK;
}
function cazar(est, j, ahora) {
  const w = est.unoVent;
  if (!w || w.j === j || ahora > w.hasta) return err('nadie a quien cazar');
  est.unoVent = null;
  robar(est, w.j, 2, 'uno');
  est.ev.push({ t: 'cazado', j: w.j, por: j });
  return OK;
}

function finRonda(est, g, porBloqueo) {
  let pts = 0;
  for (let j = 0; j < est.n; j++) if (j !== g) pts += est.mano[j].reduce((s, id) => s + valor(id), 0);
  est.puntos[g] += pts;
  const meta = est.cfg.puntuacion === 'unica' || est.puntos[g] >= est.cfg.meta;
  est.fin = { ganador: g, pts, bloqueo: !!porBloqueo, partida: meta, conteos: est.mano.map((m) => m.length), ultima: MAZO[tope(est)].v };
  if (meta) est.campeon = g;
  est.unoVent = null; est.pend = 0; est.desafio = null;
  est.ev.push({ t: 'fin', ganador: g, pts, bloqueo: !!porBloqueo, partida: meta });
}

/* ---------- vista filtrada para un asiento: nunca incluye manos ajenas ---------- */
export function vista(est, j, ahora = 0) {
  const o = est.cfg;
  return {
    n: est.n, yo: j, ronda: est.ronda, cfg: o,
    mano: est.mano[j].slice(), conteos: est.mano.map((m) => m.length), puntos: est.puntos.slice(),
    turno: est.turno, dir: est.dir, color: est.color, tope: tope(est), pila: est.pila.slice(-4), nPila: est.pila.length, nMazo: est.mazo.length,
    pend: est.pend, pendTipo: est.pendTipo, robo: est.robo, ult: est.turno === j ? est.ult : -1,
    jug: jugables(est, j), puedeRobar: puedeRobar(est, j), puedePasar: puedePasar(est, j), puedeDesafiar: puedeDesafiar(est, j),
    uno: est.uno.slice(), unoVent: est.unoVent ? { j: est.unoVent.j, resta: Math.max(0, est.unoVent.hasta - ahora) } : null,
    fin: est.fin, repartidor: est.repartidor, campeon: est.campeon
  };
}
export const sumaTotal = (est) => est.mazo.length + est.pila.length + est.mano.reduce((s, m) => s + m.length, 0);
