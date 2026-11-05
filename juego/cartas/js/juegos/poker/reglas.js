// Texas Hold'em: reglas puras sobre un estado JSON (incluye cartas ocultas; usa vista() para enviarlo a un asiento).
import { crearBaraja } from '../../marco/barajas.js';
import { mezclar, nuevoRng, reentropia } from '../../marco/rng.js';
import { ciegasNivel, nivelEscalado } from '../../marco/economia.js';
import { evaluar, PERFILES, nombreMano } from './evaluador.js';

export const id = 'poker';
export const CALLES = ['preflop', 'flop', 'turn', 'river'];
const N = (e) => e.jug.length;
const enMano = (p) => p.st === 'act' || p.st === 'allin';

export function crear(cfg, n, semilla) {
  const base = { sb: 10, bb: 20, ante: 0, limite: 'nl', baraja: 'fr52', tope: 0, rake: { pct: 0, cap: 0 }, escala: { tipo: '', cada: 0 }, entropia: false };
  cfg = Object.assign(base, cfg);
  return {
    j: id, cfg, rng: nuevoRng(semilla), jug: Array.from({ length: n }, () => nuevoJug()), boton: -1, fase: 'entre', com: [], mazo: [],
    ap: 0, min: 0, turno: -1, manos: 0, nivel: 0, sb: cfg.sb, bb: cfg.bb, t0: 0, rake: 0, res: null, subidas: 0, elim: [],
  };
}
function nuevoJug() { return { f: 0, ap: 0, tot: 0, c: [], st: 'fuera', act: false, sub: true, mostrar: false }; }
export const perfil = (e) => PERFILES[e.cfg.baraja] || PERFILES.fr52;
export const fichas = (e) => e.jug.map((p) => p.f);
export const enBote = (e) => (e.fase === 'entre' ? 0 : e.jug.reduce((s, p) => s + p.tot, 0));
export const casa = (e) => e.rake;
export const agregarFichas = (e, i, n) => { e.jug[i].f += n; };
export const quitarFichas = (e, i) => { const f = e.jug[i].f; e.jug[i].f = 0; return f; };
export const fase = (e) => (e.fase === 'entre' ? 'entre' : 'mano');
export const quien = (e) => (e.fase !== 'entre' && e.turno >= 0 ? [e.turno] : []);
export const potTotal = (e) => e.jug.reduce((s, p) => s + p.tot, 0);

function dar(e) { return e.mazo.pop(); }
function siguienteDesde(e, desde, pred) {
  const n = N(e);
  for (let k = 0; k < n; k++) { const i = (desde + k) % n; if (pred(e.jug[i], i)) return i; }
  return -1;
}
function pagar(p, x) {
  x = Math.min(x, p.f); p.f -= x; p.ap += x; p.tot += x;
  if (p.f === 0 && p.st === 'act') p.st = 'allin';
  return x;
}
const tamLimite = (e) => (e.fase === 'preflop' || e.fase === 'flop' ? e.bb : e.bb * 2);

export function nuevaMano(e, ahora = 0) {
  const elegibles = e.jug.filter((p) => p.f > 0);
  if (elegibles.length < 2) return false;
  if (e.manos === 0 && !e.t0) e.t0 = ahora;
  e.nivel = nivelEscalado(e.cfg.escala, e.manos, ahora - e.t0);
  const bl = ciegasNivel(e.cfg.sb, e.cfg.bb, e.nivel); e.sb = bl.sb; e.bb = bl.bb;
  if (e.cfg.entropia) reentropia(e.rng);
  e.jug.forEach((p) => { p.ap = 0; p.tot = 0; p.c = []; p.act = false; p.sub = true; p.mostrar = false; p.st = p.f > 0 ? 'act' : 'fuera'; });
  e.com = []; e.res = null; e.rake = e.rake || 0; e.subidas = 0;
  e.mazo = mezclar(crearBaraja(e.cfg.baraja), e.rng);
  const n = N(e);
  e.boton = siguienteDesde(e, e.boton + 1, (p) => p.st === 'act');
  const hu = elegibles.length === 2;
  const sb = hu ? e.boton : siguienteDesde(e, e.boton + 1, (p) => p.st === 'act');
  const bb = siguienteDesde(e, sb + 1, (p) => p.st === 'act');
  if (e.cfg.ante > 0) e.jug.forEach((p) => { if (p.st === 'act') { const x = Math.min(p.f, e.cfg.ante); p.f -= x; p.tot += x; if (p.f === 0) p.st = 'allin'; } });
  e.fase = 'preflop';
  pagar(e.jug[sb], e.sb); pagar(e.jug[bb], e.bb);
  e.ap = Math.max(e.jug[sb].ap, e.jug[bb].ap, 0);
  e.min = e.cfg.limite === 'fl' ? e.bb : e.bb;
  e.subidas = 1;
  e.sbI = sb; e.bbI = bb;
  for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) { const i = (sb + k) % n; if (enMano(e.jug[i])) e.jug[i].c.push(dar(e)); }
  e.turno = -1;
  avanzar(e, hu ? e.boton : (bb + 1) % n);
  return true;
}

// informacion de acciones del asiento que tiene el turno
export function legales(e, i) {
  if (e.fase === 'entre' || e.turno !== i) return null;
  const p = e.jug[i], falta = e.ap - p.ap, aIgualar = Math.min(falta, p.f), allinTo = p.ap + p.f;
  const lim = e.cfg.limite, pot = potTotal(e);
  const puedeSubir = p.sub && p.f > falta && (lim !== 'fl' || e.subidas < 4);
  let minTo = lim === 'fl' ? e.ap + tamLimite(e) : e.ap + e.min, maxTo = allinTo;
  if (lim === 'pl') maxTo = Math.min(allinTo, e.ap + pot + falta);
  if (lim === 'fl') maxTo = Math.min(allinTo, minTo);
  minTo = Math.min(minTo, allinTo); maxTo = Math.max(maxTo, minTo);
  return { fold: falta > 0, check: falta === 0, call: falta > 0, aIgualar, raise: puedeSubir, minTo, maxTo, allinTo, bote: pot, falta, allin: puedeSubir ? allinTo : (p.f <= falta ? p.f + p.ap : 0) };
}

export function aplicar(e, i, a) {
  const L = legales(e, i);
  if (!L) return { ok: false, error: 'No es tu turno' };
  const p = e.jug[i], n = N(e);
  let t = a && a.t;
  if (t === 'allin') { if (p.f <= L.falta) t = 'call'; else { t = 'raise'; a = { t, a: L.allinTo }; } }
  if (t === 'fold') { if (!L.fold) return { ok: false, error: 'Nada que igualar' }; p.st = 'fold'; }
  else if (t === 'check') { if (!L.check) return { ok: false, error: 'No puedes pasar' }; p.act = true; }
  else if (t === 'call') { if (!L.call) return { ok: false, error: 'Nada que igualar' }; pagar(p, L.aIgualar); p.act = true; }
  else if (t === 'raise') {
    if (!L.raise) return { ok: false, error: 'No puedes subir' };
    let to = Math.floor(+a.a); if (!(to > 0)) return { ok: false, error: 'Cantidad invalida' };
    to = Math.min(L.maxTo, Math.max(to, L.minTo));
    const inc = to - e.ap;
    pagar(p, to - p.ap);
    const minRef = e.cfg.limite === 'fl' ? tamLimite(e) : e.min;
    if (inc >= minRef) {
      e.min = e.cfg.limite === 'fl' ? minRef : inc; e.subidas++;
      e.jug.forEach((q, k) => { if (k !== i && q.st === 'act') { q.act = false; q.sub = true; } });
    } else e.jug.forEach((q, k) => { if (k !== i && q.act) q.sub = false; });
    e.ap = to; p.act = true;
  } else return { ok: false, error: 'Accion desconocida' };
  avanzar(e, (i + 1) % n);
  return { ok: true };
}

function pendiente(e, desde) {
  const act = [];
  e.jug.forEach((p, i) => { if (p.st === 'act') act.push(i); });
  if (act.length === 1 && e.jug[act[0]].ap >= e.ap) return -1;
  return siguienteDesde(e, desde, (p) => p.st === 'act' && (!p.act || p.ap < e.ap));
}
function avanzar(e, desde) {
  for (;;) {
    if (e.jug.filter(enMano).length <= 1) return finalizar(e, false);
    const t = pendiente(e, desde);
    if (t >= 0) { e.turno = t; return; }
    e.jug.forEach((p) => { p.ap = 0; p.act = false; p.sub = true; });
    e.ap = 0; e.subidas = 0;
    if (e.fase === 'river') return finalizar(e, true);
    const sig = CALLES[CALLES.indexOf(e.fase) + 1]; e.fase = sig;
    dar(e); const k = sig === 'flop' ? 3 : 1;
    for (let c = 0; c < k; c++) e.com.push(dar(e));
    e.min = e.bb; desde = (e.boton + 1) % N(e);
  }
}

// botes principal y laterales a partir de las aportaciones de cada jugador
export function botes(jug) {
  const vivos = []; jug.forEach((p, i) => { if (enMano(p)) vivos.push(i); });
  const niveles = Array.from(new Set(vivos.map((i) => jug[i].tot))).sort((a, b) => a - b);
  const out = []; let prev = 0, asignado = 0;
  for (const L of niveles) {
    let monto = 0; jug.forEach((p) => { monto += Math.max(0, Math.min(p.tot, L) - Math.min(p.tot, prev)); });
    const eleg = vivos.filter((i) => jug[i].tot >= L);
    if (monto > 0) {
      const u = out[out.length - 1];
      if (u && u.elegibles.join() === eleg.join()) u.monto += monto; else out.push({ monto, elegibles: eleg });
    }
    asignado += monto; prev = L;
  }
  const total = jug.reduce((s, p) => s + p.tot, 0);
  if (total > asignado && out.length) out[out.length - 1].monto += total - asignado;
  return out;
}

function finalizar(e, showdown) {
  const n = N(e), total = potTotal(e), vivos = []; e.jug.forEach((p, i) => { if (enMano(p)) vivos.push(i); });
  const pr = perfil(e), manos = {}, pagos = new Array(n).fill(0), listaBotes = botes(e.jug);
  let rake = 0;
  if (e.com.length >= 3 && e.cfg.rake && e.cfg.rake.pct > 0) {
    rake = Math.floor(total * e.cfg.rake.pct / 100); if (e.cfg.rake.cap > 0) rake = Math.min(rake, e.cfg.rake.cap);
    rake = Math.min(rake, listaBotes[0] ? listaBotes[0].monto : 0);
    if (rake > 0) listaBotes[0].monto -= rake;
  }
  if (showdown) vivos.forEach((i) => { const sc = evaluar(e.jug[i].c.concat(e.com), pr); manos[i] = { c: e.jug[i].c.slice(), score: sc, nombre: nombreMano(sc, pr) }; e.jug[i].mostrar = true; });
  const detalle = listaBotes.map((b) => {
    let gan;
    if (b.elegibles.length === 1 || !showdown) gan = [b.elegibles[0]];
    else {
      let mejor = -1; b.elegibles.forEach((i) => { mejor = Math.max(mejor, manos[i].score); });
      gan = b.elegibles.filter((i) => manos[i].score === mejor);
    }
    gan.sort((x, y) => ((x - e.boton - 1 + n) % n) - ((y - e.boton - 1 + n) % n));
    const parte = Math.floor(b.monto / gan.length); let resto = b.monto - parte * gan.length;
    gan.forEach((i) => { pagos[i] += parte + (resto > 0 ? 1 : 0); if (resto > 0) resto--; });
    return { monto: b.monto, ganadores: gan, mano: showdown && manos[gan[0]] && b.elegibles.length > 1 ? manos[gan[0]].nombre : '' };
  });
  e.jug.forEach((p, i) => { p.f += pagos[i]; });
  e.rake += rake;
  e.res = { showdown, total, rake, botes: detalle, gan: e.jug.map((p, i) => pagos[i] - p.tot), manos };
  e.jug.forEach((p, i) => { if (p.f === 0 && p.tot > 0) e.elim.push(i); });
  e.fase = 'entre'; e.turno = -1; e.manos++;
}

export function automatica(e, i) {
  const L = legales(e, i); if (!L) return null;
  return L.check ? { t: 'check' } : { t: 'fold' };
}
export const paso = () => false;

// lo que ve el asiento i (-1 = espectador): nunca cartas ajenas ocultas
export function vista(e, i) {
  const jug = e.jug.map((p, k) => ({
    f: p.f, ap: p.ap, tot: p.tot, st: p.st, act: p.act, mostrar: p.mostrar,
    c: k === i || p.mostrar ? p.c.slice() : p.c.map(() => null),
  }));
  let res = null;
  if (e.res) {
    const manos = {}; Object.keys(e.res.manos).forEach((k) => { if (e.jug[k].mostrar) manos[k] = e.res.manos[k]; });
    res = Object.assign({}, e.res, { manos });
  }
  return {
    j: id, fase: e.fase, manos: e.manos, boton: e.boton, turno: e.turno, bote: enBote(e), botes: e.fase !== 'entre' ? botes(e.jug).map((b) => ({ monto: b.monto, n: b.elegibles.length })) : [],
    com: e.com.slice(), ap: e.ap, sb: e.sb, bb: e.bb, ante: e.cfg.ante, limite: e.cfg.limite, baraja: e.cfg.baraja, nivel: e.nivel, sbI: e.sbI, bbI: e.bbI,
    jug, res, yo: i, legal: i >= 0 && e.turno === i && e.fase !== 'entre' ? legales(e, i) : null,
  };
}
export function resumen(e) {
  if (!e.res) return null;
  const g = new Set(); e.res.botes.forEach((b) => b.ganadores.forEach((i) => g.add(i)));
  return { total: e.res.total, ganadores: Array.from(g), delta: e.res.gan, texto: e.res.showdown ? (e.res.botes[e.res.botes.length - 1].mano || '') : 'sin showdown' };
}
