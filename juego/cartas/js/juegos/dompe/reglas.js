// Dompe: mano de 6 cartas, robar (mazo o descarte) y descartar. Gana al instante quien forma una combinacion ganadora;
// «dompe» (desde la segunda vuelta) da una ultima vuelta a todos y despues gana la mejor mano. Reglas puras sobre un estado JSON.
import { crearBaraja } from '../../marco/barajas.js';
import { mezclar, nuevoRng, reentropia } from '../../marco/rng.js';
import { perfil, evaluar, mascara, NOMBRES, GANA_DEF, ORDEN_DEF, CATS, ordenValido, comodinesDe, cmpClave, valor, N } from './combos.js';

export const id = 'dompe';
export const CFG_BASE = { baraja: 'es40', ana: 0, penal: 0, comodin: true, gana: GANA_DEF, orden: ORDEN_DEF, asAlto: 'ambos', puente: true, dompeDesde: 2, maxVueltas: 60, empate: 'reparte', noDevolver: true, entropia: false };

export function crear(cfg, n, semilla) {
  cfg = Object.assign({}, CFG_BASE, cfg);
  cfg.orden = ordenValido(cfg.orden); cfg.gana = (cfg.gana || []).filter((x) => CATS.includes(x) && x !== 'alta');
  cfg.ana = Math.max(0, Math.floor(+cfg.ana || 0)); cfg.penal = Math.max(0, Math.floor(+cfg.penal || 0)); cfg.dompeDesde = Math.max(2, Math.floor(+cfg.dompeDesde || 2));
  cfg.wilds = comodinesDe(cfg.baraja, cfg.comodin !== false);
  return {
    j: id, cfg, rng: nuevoRng(semilla), mazo: [], descarte: [], vistos: [], fase: 'entre', turno: -1, ini: -1, dealer: -1, sub: 'robar', vuelta: 0, nTurnos: 0,
    tomada: null, dompe: null, res: null, manos: 0, jug: Array.from({ length: n }, () => ({ f: 0, c: [], ap: 0, activo: false, turnos: 0 })),
  };
}
const P_ = (e) => perfil(e.cfg);
export const fichas = (e) => e.jug.map((p) => p.f);
export const casa = () => 0;
export const enBote = (e) => (e.fase === 'entre' ? 0 : e.jug.reduce((s, p) => s + p.ap, 0));
export const agregarFichas = (e, i, n) => { e.jug[i].f += n; };
export const quitarFichas = (e, i) => { const f = e.jug[i].f; e.jug[i].f = 0; return f; };
export const fase = (e) => (e.fase === 'entre' ? 'entre' : 'mano');
export const quien = (e) => (e.fase === 'mano' ? [e.turno] : []);
export const paso = () => false;

const activos = (e) => e.jug.map((p, i) => (p.activo ? i : -1)).filter((i) => i >= 0);
function siguiente(e, i) { const n = e.jug.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (e.jug[j].activo) return j; } return i; }

export function nuevaMano(e) {
  if (e.fase !== 'entre') return false;
  const ana = e.cfg.ana;
  const act = e.jug.map((p) => p.f > 0 && p.f >= ana);
  if (act.filter(Boolean).length < 2) return false;
  e.jug.forEach((p, i) => { p.activo = act[i]; p.c = []; p.ap = 0; p.turnos = 0; if (p.activo) { p.f -= ana; p.ap = ana; } });
  let d = e.dealer < 0 ? -1 : e.dealer; e.dealer = siguiente(e, d < 0 ? e.jug.length - 1 : d);
  if (e.cfg.entropia) reentropia(e.rng);
  e.mazo = mezclar(crearBaraja(e.cfg.baraja, { comodines: e.cfg.baraja === 'fr52' && e.cfg.comodin !== false ? 2 : 0 }), e.rng);
  const orden = []; let k = e.dealer; for (let q = 0; q < activos(e).length; q++) { k = siguiente(e, k); orden.push(k); }
  for (let r = 0; r < N; r++) orden.forEach((s) => { e.jug[s].c.push(e.mazo.pop()); });
  e.descarte = [e.mazo.pop()]; e.vistos = [e.descarte[0]];
  e.turno = e.ini = orden[0]; e.vuelta = 1; e.nTurnos = 0; e.sub = 'robar'; e.tomada = null; e.dompe = null; e.res = null; e.fase = 'mano';
  return true;
}
function reciclar(e) {
  if (e.mazo.length || e.descarte.length < 2) return e.mazo.length > 0;
  const top = e.descarte.pop(); e.mazo = mezclar(e.descarte, e.rng); e.descarte = [top]; return e.mazo.length > 0;
}
export const puedeDompear = (e) => e.fase === 'mano' && !e.dompe && e.vuelta >= e.cfg.dompeDesde;
export const quitar = (c, carta) => { const k = c.indexOf(carta); const o = c.slice(); if (k >= 0) o.splice(k, 1); return o; };

export function aplicar(e, i, a) {
  if (e.fase !== 'mano' || e.turno !== i) return { ok: false, error: 'No es tu turno' };
  const p = e.jug[i];
  if (!a || typeof a !== 'object') return { ok: false, error: 'Accion invalida' };
  if (e.sub === 'robar') {
    if (a.t !== 'robar') return { ok: false, error: 'Primero debes robar una carta' };
    let carta;
    if (a.de === 'descarte') { if (!e.descarte.length) return { ok: false, error: 'El descarte esta vacio' }; carta = e.descarte.pop(); e.tomada = carta; }
    else if (a.de === 'mazo') { if (!e.mazo.length && !reciclar(e)) return { ok: false, error: 'El mazo esta vacio' }; carta = e.mazo.pop(); e.tomada = null; }
    else return { ok: false, error: 'Elige mazo o descarte' };
    p.c.push(carta); e.sub = 'descartar'; return { ok: true };
  }
  if (a.t !== 'descartar') return { ok: false, error: 'Ahora debes descartar una carta' };
  if (!p.c.includes(a.c)) return { ok: false, error: 'Esa carta no esta en tu mano' };
  if (e.cfg.noDevolver && e.tomada === a.c && p.c.filter((x) => x === a.c).length === 1) return { ok: false, error: 'No puedes devolver la carta que tomaste del descarte' };
  if (a.dompe && !puedeDompear(e)) return { ok: false, error: e.dompe ? 'Ya hay un dompe' : 'Solo se puede dompear desde la vuelta ' + e.cfg.dompeDesde };
  p.c = quitar(p.c, a.c); e.descarte.push(a.c); e.vistos.push(a.c); e.tomada = null; p.turnos++; e.nTurnos++;
  const Pf = P_(e);
  if (evaluar(p.c, Pf).props & mascara(e.cfg.gana)) { cerrar(e, [i], 'instantanea', i); return { ok: true }; }
  if (e.dompe) {
    e.dompe.pend.shift();
    if (!e.dompe.pend.length) { cerrar(e, null, 'mano', i); return { ok: true }; }
    e.turno = e.dompe.pend[0]; e.sub = 'robar'; return { ok: true };
  }
  if (a.dompe) {
    const pend = []; let k = i; for (let q = 1; q < activos(e).length; q++) { k = siguiente(e, k); pend.push(k); }
    e.dompe = { por: i, pend }; e.turno = pend[0]; e.sub = 'robar'; return { ok: true };
  }
  const sig = siguiente(e, i);
  if (sig === e.ini) e.vuelta++;
  if (e.vuelta > e.cfg.maxVueltas) { cerrar(e, null, 'agotada', i); return { ok: true }; }
  e.turno = sig; e.sub = 'robar'; return { ok: true };
}
export function mejorDescarte(mano, Pf, gana, vetada) {
  let mejor = null;
  for (let k = 0; k < mano.length; k++) {
    if (vetada && mano[k] === vetada && mano.filter((x) => x === vetada).length === 1) continue;
    if (mano.indexOf(mano[k]) !== k) continue;
    const v = valor(quitar(mano, mano[k]), Pf, gana);
    if (!mejor || v > mejor.v) mejor = { c: mano[k], v };
  }
  return mejor;
}
export function automatica(e, i) {
  if (e.sub === 'robar') return { t: 'robar', de: e.mazo.length || e.descarte.length >= 2 ? 'mazo' : 'descarte' };
  const m = mejorDescarte(e.jug[i].c, P_(e), e.cfg.gana, e.cfg.noDevolver ? e.tomada : null);
  return { t: 'descartar', c: m ? m.c : e.jug[i].c[0] };
}

// ---- fin de mano ----
function cerrar(e, ganadores, tipo, ultimo) {
  const Pf = P_(e), ac = activos(e), evs = {};
  ac.forEach((s) => { evs[s] = evaluar(e.jug[s].c, Pf); });
  let combo = '';
  if (tipo === 'instantanea') { const g = ganadores[0], pr = evs[g].props; combo = e.cfg.orden.find((c) => e.cfg.gana.includes(c) && (pr & mascara([c]))) || evs[g].cat; }
  else {
    let top = null; ac.forEach((s) => { if (!top || cmpClave(evs[s].clave, top) > 0) top = evs[s].clave; });
    ganadores = ac.filter((s) => cmpClave(evs[s].clave, top) === 0);
    if (e.dompe && ganadores.length > 1 && ganadores.includes(e.dompe.por) && e.cfg.empate === 'otros') ganadores = ganadores.filter((s) => s !== e.dompe.por);
    combo = evs[ganadores[0]].cat;
  }
  let penaliza = 0;
  if (e.dompe && !ganadores.includes(e.dompe.por) && e.cfg.penal > 0) {
    const d = e.jug[e.dompe.por]; penaliza = Math.min(e.cfg.penal, d.f); d.f -= penaliza; d.ap += penaliza;
  }
  const bote = e.jug.reduce((s, p) => s + p.ap, 0), n = ganadores.length, parte = Math.floor(bote / n);
  const cobro = e.jug.map(() => 0);
  const orden = ganadores.slice().sort((a, b) => ((a - e.dealer + e.jug.length - 1) % e.jug.length) - ((b - e.dealer + e.jug.length - 1) % e.jug.length));
  orden.forEach((s) => { cobro[s] = parte; }); cobro[orden[0]] += bote - parte * n;
  const gan = e.jug.map((p, s) => cobro[s] - p.ap);
  e.jug.forEach((p, s) => { p.f += cobro[s]; });
  const nom = NOMBRES[combo] || combo;
  const dom = e.dompe ? e.dompe.por : -1;
  e.res = {
    gan, total: bote, ganadores: orden, tipo, combo, dompeador: dom, penal: penaliza, ultimo,
    texto: tipo === 'instantanea' ? nom + ' (victoria inmediata)' : tipo === 'agotada' ? 'Mano agotada: ' + nom : 'Mejor mano: ' + nom,
    manos: e.jug.map((p, s) => (p.activo ? { nombre: NOMBRES[evs[s].cat] || evs[s].cat } : null)),
    meta: { tipo, combo, dompeador: dom, penal: penaliza, comodin: orden.some((s) => e.jug[s].c.some((c) => e.cfg.wilds.includes(c))) },
  };
  e.jug.forEach((p) => { p.ap = 0; });
  e.fase = 'entre'; e.turno = -1; e.manos++;
}
export function resumen(e) { return e.res ? { total: e.res.total, ganadores: e.res.ganadores.slice(), delta: e.res.gan.slice(), texto: e.res.texto } : null; }

// ---- vista (solo lo que ve cada asiento) ----
export function vista(e, i) {
  const rev = e.fase === 'entre' && !!e.res;
  const cfg = e.cfg;
  return {
    j: id, fase: e.fase, turno: e.turno, sub: e.sub, vuelta: e.vuelta, yo: i, manos: e.manos, dealer: e.dealer,
    jug: e.jug.map((p, k) => ({ f: p.f, st: p.activo ? 'activo' : 'fuera', n: p.c.length, ap: p.ap, turnos: p.turnos, c: k === i || (rev && p.activo) ? p.c.slice() : p.c.map(() => null) })),
    mazo: e.mazo.length, descarte: e.descarte.length ? e.descarte[e.descarte.length - 1] : null, nDesc: e.descarte.length, vistos: e.vistos.slice(),
    dompe: e.dompe ? { por: e.dompe.por, pend: e.dompe.pend.slice() } : null, tomada: i >= 0 && e.turno === i ? e.tomada : null,
    bote: e.jug.reduce((s, p) => s + p.ap, 0), res: e.res,
    legal: i >= 0 && e.fase === 'mano' && e.turno === i ? { sub: e.sub, dompe: puedeDompear(e) } : null,
    cfg: { baraja: cfg.baraja, ana: cfg.ana, penal: cfg.penal, comodin: cfg.comodin !== false, wilds: cfg.wilds, gana: cfg.gana, orden: cfg.orden, asAlto: cfg.asAlto, puente: cfg.puente, dompeDesde: cfg.dompeDesde, empate: cfg.empate, noDevolver: cfg.noDevolver },
  };
}
