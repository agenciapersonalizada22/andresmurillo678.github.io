// Ve a pescar (Go Fish): pide a un rival un numero que ya tienes; si no lo tiene, pescas del mazo. Los libros (4 cartas del mismo numero, o 3 en la baraja de 40
// si se configura asi) se bajan solos. Gana quien junta mas libros. Reglas puras sobre un estado JSON.
import { crearBaraja, parse, TIPOS } from '../../marco/barajas.js';
import { mezclar, nuevoRng, reentropia } from '../../marco/rng.js';

export const id = 'pescar';
export const CFG_BASE = { baraja: 'fr52', nCartas: 0, libro: 4, repetirAlPescar: true, vacia: 'robar', ana: 0, familiar: false, maxTurnos: 800, entropia: false };

export function crear(cfg, n, semilla) {
  cfg = Object.assign({}, CFG_BASE, cfg);
  if (!TIPOS[cfg.baraja]) cfg.baraja = 'fr52';
  cfg.libro = cfg.libro === 3 ? 3 : 4; cfg.nCartas = [5, 7].includes(+cfg.nCartas) ? +cfg.nCartas : 0; cfg.ana = Math.max(0, Math.floor(+cfg.ana || 0));
  return { j: id, cfg, rng: nuevoRng(semilla), mazo: [], muertas: [], hist: [], seq: 0, suertes: Array.from({ length: n }, () => 0), fase: 'entre', turno: -1, sub: 'pedir', pend: null, dealer: -1, nTurnos: 0, manos: 0, res: null,
    jug: Array.from({ length: n }, () => ({ f: 0, c: [], ap: 0, activo: false, libros: [] })) };
}
export const fichas = (e) => e.jug.map((p) => p.f);
export const casa = () => 0;
export const enBote = (e) => (e.fase === 'entre' ? 0 : e.jug.reduce((s, p) => s + p.ap, 0));
export const agregarFichas = (e, i, n) => { e.jug[i].f += n; };
export const quitarFichas = (e, i) => { const f = e.jug[i].f; e.jug[i].f = 0; return f; };
export const fase = (e) => (e.fase === 'entre' ? 'entre' : 'mano');
export const quien = (e) => (e.fase === 'mano' ? [e.turno] : []);
export const paso = () => false;
const rango = (c) => parse(c).v;
const activos = (e) => e.jug.map((p, i) => (p.activo ? i : -1)).filter((i) => i >= 0);
function siguiente(e, i) { const n = e.jug.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (e.jug[j].activo) return j; } return i; }
function evento(e, ev) { ev.q = ++e.seq; e.hist.push(ev); if (e.hist.length > 120) e.hist.shift(); return ev; }
export const objetivos = (e, i) => e.jug.map((p, k) => (k !== i && p.activo && p.c.length ? k : -1)).filter((k) => k >= 0);
export const rangosDe = (c) => [...new Set(c.map(rango))].sort((a, b) => a - b);

export function nuevaMano(e) {
  if (e.fase !== 'entre') return false;
  const ana = e.cfg.ana, act = e.jug.map((p) => p.f > 0 && p.f >= ana);
  if (act.filter(Boolean).length < 2) return false;
  e.jug.forEach((p, i) => { p.activo = act[i]; p.c = []; p.ap = 0; p.libros = []; if (p.activo) { p.f -= ana; p.ap = ana; } });
  e.dealer = siguiente(e, e.dealer < 0 ? e.jug.length - 1 : e.dealer);
  if (e.cfg.entropia) reentropia(e.rng);
  e.mazo = mezclar(crearBaraja(e.cfg.baraja, {}), e.rng); e.muertas = []; e.hist = []; e.seq = 0; e.suertes = e.jug.map(() => 0); e.res = null; e.nTurnos = 0; e.pend = null;
  const n = activos(e).length, cada = e.cfg.nCartas || (n <= 3 ? 7 : 5);
  const orden = []; let k = e.dealer; for (let q = 0; q < n; q++) { k = siguiente(e, k); orden.push(k); }
  for (let r = 0; r < cada; r++) orden.forEach((s) => { if (e.mazo.length) e.jug[s].c.push(e.mazo.pop()); });
  e.turno = orden[0]; e.sub = 'pedir'; e.fase = 'mano';
  preparar(e);
  return true;
}
// baja libros completos y retira las cartas que ya no pueden formar libro
function normalizarMano(e) {
  const L = e.cfg.libro;
  e.jug.forEach((p, i) => {
    if (!p.activo) return;
    const cnt = {}; p.c.forEach((c) => { const r = rango(c); cnt[r] = (cnt[r] || 0) + 1; });
    Object.keys(cnt).forEach((r) => { if (cnt[r] >= L) { let q = L; p.c = p.c.filter((c) => !(rango(c) === +r && q-- > 0)); p.libros.push(+r); evento(e, { k: 'libro', por: i, r: +r }); } });
  });
  // rangos muertos: quedan menos cartas sin bajar que las de un libro
  const tot = {}; const cuenta = (c) => { const r = rango(c); tot[r] = (tot[r] || 0) + 1; };
  e.jug.forEach((p) => p.activo && p.c.forEach(cuenta)); e.mazo.forEach(cuenta);
  const muertos = Object.keys(tot).filter((r) => tot[r] < L).map(Number);
  if (muertos.length) {
    e.jug.forEach((p) => { if (!p.activo) return; p.c = p.c.filter((c) => { if (muertos.includes(rango(c))) { e.muertas.push(c); return false; } return true; }); });
    e.mazo = e.mazo.filter((c) => { if (muertos.includes(rango(c))) { e.muertas.push(c); return false; } return true; });
  }
}
function pasar(e, i) { e.nTurnos++; e.turno = siguiente(e, i); e.sub = 'pedir'; e.pend = null; }
function pescarCarta(e, i) { // roba una carta (si hay); devuelve la carta o null
  if (!e.mazo.length) return null;
  const c = e.mazo.pop(); e.jug[i].c.push(c); return c;
}
function preparar(e) {
  const n = e.jug.length;
  for (let g = 0; g < 4 * n + 6; g++) {
    normalizarMano(e);
    if (e.nTurnos >= e.cfg.maxTurnos || activos(e).every((s) => !e.jug[s].c.length)) return cerrar(e);
    const p = e.jug[e.turno];
    if (e.sub === 'pescar') return; // esperando que el jugador pesque
    if (!p.c.length) {
      if (e.cfg.vacia === 'robar' && e.mazo.length) { const k = Math.min(e.cfg.nCartas || 5, e.mazo.length); for (let q = 0; q < k; q++) pescarCarta(e, e.turno); evento(e, { k: 'vacia', por: e.turno, n: k }); continue; }
      pasar(e, e.turno); continue;
    }
    if (!objetivos(e, e.turno).length) {
      if (e.mazo.length) { pescarCarta(e, e.turno); evento(e, { k: 'pesca', por: e.turno, ok: false, forzada: true }); }
      pasar(e, e.turno); continue;
    }
    return;
  }
  cerrar(e);
}
export function aplicar(e, i, a) {
  if (e.fase !== 'mano' || e.turno !== i) return { ok: false, error: 'No es tu turno' };
  if (!a || typeof a !== 'object') return { ok: false, error: 'Accion invalida' };
  const p = e.jug[i];
  if (e.sub === 'pedir') {
    if (a.t !== 'pedir') return { ok: false, error: 'Pide una carta a un rival' };
    const t = e.jug[a.a], r = +a.r;
    if (!t || a.a === i || !t.activo || !t.c.length) return { ok: false, error: 'Elige a un rival que tenga cartas' };
    if (!p.c.some((c) => rango(c) === r)) return { ok: false, error: 'Solo puedes pedir un número que ya tienes' };
    const da = t.c.filter((c) => rango(c) === r);
    if (da.length) {
      t.c = t.c.filter((c) => rango(c) !== r); p.c = p.c.concat(da);
      evento(e, { k: 'pide', por: i, a: a.a, r, n: da.length });
    } else { evento(e, { k: 'pide', por: i, a: a.a, r, n: 0 }); e.sub = 'pescar'; e.pend = r; }
    preparar(e); return { ok: true };
  }
  if (a.t !== 'pescar') return { ok: false, error: '¡Ve a pescar!' };
  const c = pescarCarta(e, i), suerte = !!c && rango(c) === e.pend;
  if (suerte) e.suertes[i]++;
  evento(e, c ? { k: 'pesca', por: i, ok: suerte, r: suerte ? e.pend : 0 } : { k: 'pesca', por: i, ok: false, vacio: true });
  if (suerte && e.cfg.repetirAlPescar) { e.sub = 'pedir'; e.pend = null; } else pasar(e, i);
  preparar(e); return { ok: true };
}
export function automatica(e, i) {
  if (e.sub === 'pescar') return { t: 'pescar' };
  const cnt = {}; e.jug[i].c.forEach((c) => { cnt[rango(c)] = (cnt[rango(c)] || 0) + 1; });
  const r = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  return { t: 'pedir', a: objetivos(e, i)[0], r: +r };
}

function cerrar(e) {
  const ac = activos(e), lib = e.jug.map((p) => p.libros.length), mx = Math.max(0, ...ac.map((s) => lib[s]));
  const gan = ac.filter((s) => lib[s] === mx), bote = e.jug.reduce((s, p) => s + p.ap, 0), parte = Math.floor(bote / gan.length), cobro = e.jug.map(() => 0);
  const orden = gan.slice().sort((a, b) => ((a - e.dealer + e.jug.length - 1) % e.jug.length) - ((b - e.dealer + e.jug.length - 1) % e.jug.length));
  orden.forEach((s) => { cobro[s] = parte; }); cobro[orden[0]] += bote - parte * gan.length;
  const delta = e.jug.map((p, s) => cobro[s] - p.ap);
  e.jug.forEach((p, s) => { p.f += cobro[s]; });
  e.res = { gan: delta, total: bote, ganadores: orden, libros: lib, tipo: gan.length > 1 ? 'empate' : 'libros', texto: gan.length > 1 ? 'Empate a ' + mx + ' libros' : 'Gana con ' + mx + ' libros', manos: e.jug.map((p, s) => (p.activo ? { nombre: lib[s] + ' libros' } : null)),
    meta: { libros: lib, max: mx, empate: gan.length > 1, suertes: e.suertes.slice(), familiar: !!e.cfg.familiar, baraja: e.cfg.baraja, libro: e.cfg.libro, nJug: ac.length } };
  e.jug.forEach((p) => { p.ap = 0; });
  e.fase = 'entre'; e.turno = -1; e.manos++;
}
export function resumen(e) { return e.res ? { total: e.res.total, ganadores: e.res.ganadores.slice(), delta: e.res.gan.slice(), texto: e.res.texto } : null; }

export function vista(e, i) {
  const cfg = e.cfg;
  return {
    j: id, fase: e.fase, turno: e.turno, sub: e.sub, pend: e.sub === 'pescar' ? e.pend : null, yo: i, manos: e.manos, dealer: e.dealer, seq: e.seq,
    jug: e.jug.map((p, k) => ({ f: p.f, st: p.activo ? 'activo' : 'fuera', n: p.c.length, ap: p.ap, libros: p.libros.slice(), c: k === i ? p.c.slice() : p.c.map(() => null) })),
    mazo: e.mazo.length, hist: e.hist.slice(-80), bote: e.jug.reduce((s, p) => s + p.ap, 0), res: e.res,
    legal: i >= 0 && e.fase === 'mano' && e.turno === i ? { sub: e.sub, rangos: e.sub === 'pedir' ? rangosDe(e.jug[i].c) : [], objetivos: e.sub === 'pedir' ? objetivos(e, i) : [], pend: e.pend } : null,
    cfg: { baraja: cfg.baraja, libro: cfg.libro, nCartas: cfg.nCartas, repetirAlPescar: cfg.repetirAlPescar, vacia: cfg.vacia, ana: cfg.ana, familiar: !!cfg.familiar },
  };
}
