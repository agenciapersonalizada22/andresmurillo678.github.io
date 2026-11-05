// Conquian (baraja española de 40): combinaciones (trios/cuartetos y escaleras del mismo palo), tomar del descarte solo si se usa al instante.
// Gana quien baja todas sus cartas. Reglas puras sobre un estado JSON.
import { crearBaraja } from '../../marco/barajas.js';
import { mezclar, nuevoRng, reentropia } from '../../marco/rng.js';
import { perfil, analizar, sinCartas, puedeAgregarA, COMODIN, valorPuntos, elegirDescarte } from './melds.js';

export const id = 'conquian';
export const CFG_BASE = { baraja: 'es40', nMano: 9, ana: 0, comodines: 0, puente: true, asAlto: false, agregar: 'todas', ganarDescarte: true, tomarDescarte: true, porCarta: 0, puntos: true, meta: 0, maxTurnos: 300, maxRecic: 2, entropia: false };

export function crear(cfg, n, semilla) {
  cfg = Object.assign({}, CFG_BASE, cfg); cfg.baraja = 'es40';
  cfg.nMano = Math.max(4, Math.min(9, Math.floor(+cfg.nMano || 9))); cfg.ana = Math.max(0, Math.floor(+cfg.ana || 0)); cfg.comodines = Math.max(0, Math.min(2, Math.floor(+cfg.comodines || 0)));
  cfg.porCarta = Math.max(0, Math.floor(+cfg.porCarta || 0)); cfg.meta = Math.max(0, Math.floor(+cfg.meta || 0));
  return { j: id, cfg, rng: nuevoRng(semilla), mazo: [], descarte: [], vistos: [], melds: [], nid: 1, fase: 'entre', turno: -1, sub: 'jugar', dealer: -1, primer: false, nTurnos: 0, recic: 0, manos: 0, res: null, campeon: -1,
    jug: Array.from({ length: n }, () => ({ f: 0, c: [], ap: 0, activo: false, pts: 0, turnos: 0 })) };
}
const P_ = (e) => perfil({ puente: e.cfg.puente, asAlto: e.cfg.asAlto });
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
  const ana = e.cfg.ana, act = e.jug.map((p) => p.f > 0 && p.f >= ana);
  if (act.filter(Boolean).length < 2) return false;
  e.jug.forEach((p, i) => { p.activo = act[i]; p.c = []; p.ap = 0; p.turnos = 0; if (p.activo) { p.f -= ana; p.ap = ana; } });
  e.dealer = siguiente(e, e.dealer < 0 ? e.jug.length - 1 : e.dealer);
  if (e.cfg.entropia) reentropia(e.rng);
  const baraja = crearBaraja('es40', {}); for (let k = 0; k < e.cfg.comodines; k++) baraja.push(COMODIN);
  e.mazo = mezclar(baraja, e.rng);
  const orden = []; let k = e.dealer; for (let q = 0; q < activos(e).length; q++) { k = siguiente(e, k); orden.push(k); }
  const nEf = Math.min(e.cfg.nMano, Math.floor((e.mazo.length - 2) / orden.length));
  for (let r = 0; r < nEf; r++) orden.forEach((s) => { e.jug[s].c.push(e.mazo.pop()); });
  e.jug[e.dealer].c.push(e.mazo.pop());
  e.descarte = []; e.vistos = []; e.melds = []; e.nid = 1; e.recic = 0; e.nTurnos = 0; e.res = null; e.campeon = -1;
  e.turno = e.dealer; e.sub = 'jugar'; e.primer = true; e.fase = 'mano';
  return true;
}
function reciclar(e) {
  if (e.mazo.length) return true;
  if (e.descarte.length < 2 || e.recic >= e.cfg.maxRecic) return false;
  const top = e.descarte.pop(); e.mazo = mezclar(e.descarte, e.rng); e.descarte = [top]; e.recic++; return true;
}
const permitido = (e, i, m) => e.cfg.agregar === 'todas' || (e.cfg.agregar === 'propias' && m.due === i);
const err = (error) => ({ ok: false, error });

export function aplicar(e, i, a) {
  if (e.fase !== 'mano' || e.turno !== i) return err('No es tu turno');
  if (!a || typeof a !== 'object') return err('Accion invalida');
  const p = e.jug[i], P = P_(e);
  if (a.t === 'plan') {
    if (!Array.isArray(a.pasos) || a.pasos.length > 30) return err('Plan invalido');
    for (let k = 0; k < a.pasos.length; k++) { if (a.pasos[k] && a.pasos[k].t === 'plan') return err('Plan invalido'); const r = aplicar(e, i, a.pasos[k]); if (!r.ok) return k ? { ok: true, parcial: true } : r; if (e.fase !== 'mano' || e.turno !== i) break; }
    return { ok: true };
  }
  if (e.sub === 'robar') {
    if (a.t === 'robar') {
      if (!e.mazo.length && !reciclar(e)) { cerrar(e, -1, 'tablas'); return { ok: true }; }
      p.c.push(e.mazo.pop()); e.sub = 'jugar'; return { ok: true };
    }
    if (a.t === 'tomar') {
      if (!e.cfg.tomarDescarte) return err('En esta mesa no se puede tomar del descarte');
      if (!e.descarte.length) return err('El descarte esta vacio');
      const top = e.descarte[e.descarte.length - 1], cartas = Array.isArray(a.cartas) ? a.cartas : [], resto = sinCartas(p.c, cartas);
      if (!resto) return err('Esas cartas no estan en tu mano');
      if (a.m == null) {
        const r = analizar([top].concat(cartas), P); if (!r.ok) return err('El descarte debe usarse al momento en una combinación válida: ' + (r.motivo || ''));
        e.melds.push({ id: e.nid++, due: i, c: r.orden });
      } else {
        const m = e.melds.find((x) => x.id === a.m); if (!m) return err('Esa combinación no existe');
        if (!permitido(e, i, m)) return err('Solo puedes añadir a tus propias combinaciones');
        const r = analizar(m.c.concat([top], cartas), P); if (!r.ok) return err('Esa carta no encaja en la combinación');
        m.c = r.orden;
      }
      e.descarte.pop(); p.c = resto; e.sub = 'jugar';
      if (!p.c.length) cerrar(e, i, 'conquian');
      return { ok: true };
    }
    return err('Roba una carta o toma el descarte');
  }
  if (a.t === 'bajar') {
    const cartas = Array.isArray(a.cartas) ? a.cartas : [], resto = sinCartas(p.c, cartas);
    if (!resto) return err('Esas cartas no estan en tu mano');
    const r = analizar(cartas, P); if (!r.ok) return err(r.motivo || 'Combinación no válida');
    e.melds.push({ id: e.nid++, due: i, c: r.orden }); p.c = resto;
    if (!p.c.length) cerrar(e, i, 'conquian');
    return { ok: true };
  }
  if (a.t === 'agregar') {
    const cartas = Array.isArray(a.cartas) ? a.cartas : [], resto = sinCartas(p.c, cartas), m = e.melds.find((x) => x.id === a.m);
    if (!resto || !cartas.length) return err('Esas cartas no estan en tu mano');
    if (!m) return err('Esa combinación no existe');
    if (!permitido(e, i, m)) return err(e.cfg.agregar === 'no' ? 'Esta mesa no permite añadir a combinaciones' : 'Solo puedes añadir a tus propias combinaciones');
    const r = analizar(m.c.concat(cartas), P); if (!r.ok) return err('Esas cartas no encajan en la combinación');
    m.c = r.orden; p.c = resto;
    if (!p.c.length) cerrar(e, i, 'conquian');
    return { ok: true };
  }
  if (a.t === 'pasar') {
    if (e.cfg.ganarDescarte || p.c.length !== 1) return err('Debes descartar una carta');
    finTurno(e, i); return { ok: true };
  }
  if (a.t === 'descartar') {
    if (!p.c.includes(a.c)) return err('Esa carta no esta en tu mano');
    if (p.c.length === 1 && !e.cfg.ganarDescarte) return err('En esta mesa no se gana descartando: baja todas tus cartas (o pasa)');
    p.c = sinCartas(p.c, [a.c]); e.descarte.push(a.c); e.vistos.push(a.c);
    if (!p.c.length) { cerrar(e, i, 'descarte'); return { ok: true }; }
    finTurno(e, i); return { ok: true };
  }
  return err('Accion no valida ahora');
}
function finTurno(e, i) {
  e.nTurnos++; e.primer = false; e.jug[i].turnos++;
  if (e.nTurnos >= e.cfg.maxTurnos) { cerrar(e, -1, 'tablas'); return; }
  e.turno = siguiente(e, i); e.sub = 'robar';
}
export function automatica(e, i) {
  if (e.sub === 'robar') return { t: 'robar' };
  const p = e.jug[i];
  if (p.c.length === 1 && !e.cfg.ganarDescarte) return { t: 'pasar' };
  const d = elegirDescarte(p.c, P_(e), e.vistos.concat(...e.melds.map((m) => m.c)), null);
  return { t: 'descartar', c: d ? d.c : p.c[0] };
}

function cerrar(e, g, tipo) {
  const cobro = e.jug.map(() => 0), extra = e.jug.map(() => 0);
  let bote = e.jug.reduce((s, p) => s + p.ap, 0), puntos = 0, restantes = e.jug.map((p) => (p.activo ? p.c.length : 0));
  if (g >= 0) {
    cobro[g] = bote;
    e.jug.forEach((p, s) => {
      if (s === g || !p.activo) return;
      puntos += p.c.reduce((t, c) => t + valorPuntos(c), 0);
      if (e.cfg.porCarta > 0) { const pago = Math.min(p.f, e.cfg.porCarta * p.c.length); p.f -= pago; extra[s] -= pago; extra[g] += pago; e.jug[g].f += pago; }
    });
    if (e.cfg.puntos) e.jug[g].pts += puntos;
  } else e.jug.forEach((p, s) => { if (p.activo) cobro[s] = p.ap; });
  const gan = e.jug.map((p, s) => cobro[s] - p.ap + extra[s]);
  e.jug.forEach((p, s) => { p.f += cobro[s]; });
  let campeon = -1;
  const snap = e.jug.map((p) => p.pts);
  if (g >= 0 && e.cfg.puntos && e.cfg.meta > 0 && e.jug[g].pts >= e.cfg.meta) { campeon = g; e.jug.forEach((p) => { p.pts = 0; }); }
  const texto = tipo === 'tablas' ? 'Tablas: se agotó el mazo' : tipo === 'descarte' ? 'Cierra descartando su última carta' : 'Baja todas sus cartas';
  e.res = { gan, total: bote, ganadores: g >= 0 ? [g] : [], tipo, texto: texto + (campeon >= 0 ? ' · ¡campeón de la partida!' : ''), puntos, pts: snap, campeon, restantes,
    manos: e.jug.map((p, s) => (p.activo ? { nombre: p.c.length ? p.c.length + ' cartas sin bajar' : 'Sin cartas' } : null)),
    meta: { tipo, turnos: e.nTurnos, turnosPropios: g >= 0 ? e.jug[g].turnos + 1 : 0, melds: e.melds.filter((m) => m.due === g).length, puntos, pts: snap, campeon, comodines: e.cfg.comodines, nJug: e.jug.filter((p) => p.activo).length, perdedores: restantes.filter((_, s) => s !== g && e.jug[s].activo) } };
  e.jug.forEach((p) => { p.ap = 0; });
  e.fase = 'entre'; e.turno = -1; e.manos++;
}
export function resumen(e) { return e.res ? { total: e.res.total, ganadores: e.res.ganadores.slice(), delta: e.res.gan.slice(), texto: e.res.texto } : null; }

export function vista(e, i) {
  const rev = e.fase === 'entre' && !!e.res, cfg = e.cfg;
  return {
    j: id, fase: e.fase, turno: e.turno, sub: e.sub, yo: i, manos: e.manos, dealer: e.dealer, primer: e.primer && e.fase === 'mano',
    jug: e.jug.map((p, k) => ({ f: p.f, st: p.activo ? 'activo' : 'fuera', n: p.c.length, ap: p.ap, pts: p.pts, c: k === i || (rev && p.activo) ? p.c.slice() : p.c.map(() => null) })),
    melds: e.melds.map((m) => ({ id: m.id, due: m.due, c: m.c.slice() })), mazo: e.mazo.length, descarte: e.descarte.length ? e.descarte[e.descarte.length - 1] : null, nDesc: e.descarte.length, vistos: e.vistos.slice(-90),
    bote: e.jug.reduce((s, p) => s + p.ap, 0), res: e.res, legal: i >= 0 && e.fase === 'mano' && e.turno === i ? { sub: e.sub, primer: e.primer, puedeTomar: cfg.tomarDescarte && e.descarte.length > 0 && e.sub === 'robar' } : null,
    cfg: { ana: cfg.ana, nMano: cfg.nMano, comodines: cfg.comodines, puente: cfg.puente, asAlto: cfg.asAlto, agregar: cfg.agregar, ganarDescarte: cfg.ganarDescarte, tomarDescarte: cfg.tomarDescarte, porCarta: cfg.porCarta, puntos: cfg.puntos, meta: cfg.meta },
  };
}
