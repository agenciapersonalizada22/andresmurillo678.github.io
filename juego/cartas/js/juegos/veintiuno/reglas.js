// Veintiuno (blackjack, baraja francesa) y Siete y medio (baraja espanola de 40). Reglas puras sobre un estado JSON.
import { crearBaraja, parse } from '../../marco/barajas.js';
import { mezclar, nuevoRng, reentropia } from '../../marco/rng.js';

export const id = 'veintiuno';
const N = (e) => e.jug.length;

export function crear(cfg, n, semilla) {
  const base = { variante: 'bj', mazos: 6, pagoBJ: '3:2', blando17: 'planta', seguro: true, rendicion: true, doblar: true, doblarTrasDividir: true, maxManos: 4, penetracion: 0.75,
    minApuesta: 10, maxApuesta: 500, conteo: false, banca: -1, plantaSM: 11, entropia: false };
  cfg = Object.assign(base, cfg);
  cfg.baraja = cfg.variante === 'sm' ? 'es40' : 'fr52';
  if (cfg.variante === 'sm') { cfg.seguro = false; cfg.rendicion = false; }
  return {
    j: id, cfg, rng: nuevoRng(semilla), zapato: [], total: 0, conteo: 0, barajado: false,
    jug: Array.from({ length: n }, (_, i) => nuevoJug(i === cfg.banca)), banca: { c: [], oculta: true }, fase: 'entre', turno: null,
    manos: 0, casa: 0, res: null, ultimaBanca: 0,
  };
}
function nuevoJug(esBanca) { return { f: 0, st: 'fuera', listo: false, manos: [], seg: 0, segDec: false, banca: !!esBanca, ultima: 0 }; }
export const fichas = (e) => e.jug.map((p) => p.f);
export const casa = (e) => e.casa;
export const enBote = (e) => (e.fase === 'entre' ? 0 : e.jug.reduce((s, p) => s + p.seg + p.manos.reduce((a, m) => a + m.ap, 0), 0));
export const agregarFichas = (e, i, n) => { e.jug[i].f += n; };
export const quitarFichas = (e, i) => { const f = e.jug[i].f; e.jug[i].f = 0; return f; };
export const fase = (e) => (e.fase === 'entre' ? 'entre' : 'mano');
export const bancaHumana = (e) => e.cfg.banca >= 0;

// ---- valores ----
export function puntos(c, variante) {
  const { v } = parse(c);
  if (variante === 'sm') return v >= 10 ? 1 : v * 2; // medios puntos: figuras 0.5
  return v === 1 ? 1 : v >= 10 ? 10 : v;
}
export function valorMano(cs, variante) {
  let t = 0, as = false;
  for (const c of cs) { t += puntos(c, variante); if (variante !== 'sm' && parse(c).v === 1) as = true; }
  if (variante === 'sm') return { t, blando: false, pasado: t > 15, texto: t % 2 ? Math.floor(t / 2) + ',5' : String(t / 2) };
  const blando = as && t + 10 <= 21;
  if (blando) t += 10;
  return { t, blando, pasado: t > 21, texto: blando && t < 21 ? (t - 10) + '/' + t : String(t) };
}
export function esNatural(cs, variante, dividida) {
  if (cs.length !== 2 || dividida) return false;
  const t = valorMano(cs, variante).t;
  return variante === 'sm' ? t === 15 : t === 21;
}
export function contar(c) { const p = parse(c); const v = p.v; if (v === 1 || v >= 10) return -1; return v <= 6 ? 1 : 0; }

function sacar(e) {
  if (!e.zapato.length) barajar(e);
  return e.zapato.pop();
}
function barajar(e) {
  if (e.cfg.entropia) reentropia(e.rng);
  e.zapato = mezclar(crearBaraja(e.cfg.baraja, { mazos: e.cfg.mazos }), e.rng);
  e.total = e.zapato.length; e.conteo = 0; e.barajado = true;
}
function ver(e, c) { e.conteo += contar(c); }

export function nuevaMano(e) {
  if (e.fase !== 'entre') return false;
  const c = e.cfg;
  e.barajado = false;
  if (!e.total || e.zapato.length < e.total * (1 - c.penetracion)) barajar(e);
  let hay = 0;
  e.jug.forEach((p) => {
    p.manos = []; p.seg = 0; p.segDec = false; p.listo = false;
    p.st = !p.banca && p.f >= c.minApuesta ? 'activo' : 'fuera';
    if (p.st === 'activo') hay++;
  });
  if (!hay) return false;
  e.banca = { c: [], oculta: true }; e.res = null; e.turno = null; e.fase = 'apuestas';
  return true;
}

export function quien(e) {
  if (e.fase === 'apuestas') return e.jug.map((p, i) => (p.st === 'activo' && !p.listo ? i : -1)).filter((i) => i >= 0);
  if (e.fase === 'seguro') return e.jug.map((p, i) => (p.manos.length && !p.segDec ? i : -1)).filter((i) => i >= 0);
  if (e.fase === 'turnos' && e.turno) return [e.turno.p];
  if (e.fase === 'banca' && bancaHumana(e) && !e.banca.oculta && debeJugarBanca(e) && !e.bancaPlanta) return [e.cfg.banca];
  return [];
}

export function legales(e, i) {
  const c = e.cfg, p = e.jug[i];
  if (!p || !quien(e).includes(i)) return null;
  if (e.fase === 'apuestas') {
    let max = Math.min(c.maxApuesta, p.f);
    if (c.banca >= 0) max = Math.min(max, Math.max(c.minApuesta, Math.floor(e.jug[c.banca].f / (Math.max(1, e.jug.length - 1) * 4))));
    return { apostar: true, pasar: true, min: c.minApuesta, max, ultima: Math.max(Math.min(p.ultima || c.minApuesta, max), Math.min(c.minApuesta, max)) };
  }
  if (e.fase === 'seguro') { const ap = p.manos[0].ap, m = Math.min(Math.floor(ap / 2), p.f); return { seguro: m > 0, monto: m, soloDecidir: true }; }
  if (e.fase === 'banca') return { pedir: true, plantarse: true, banca: true };
  const m = p.manos[e.turno.m], pri = m.c.length === 2, n = p.manos.length;
  const iguales = pri && puntos(m.c[0], c.variante) === puntos(m.c[1], c.variante);
  return {
    pedir: true, plantarse: true,
    doblar: c.doblar && pri && p.f >= m.ap && (c.doblarTrasDividir || !m.dividida),
    dividir: iguales && n < c.maxManos && p.f >= m.ap,
    rendirse: c.rendicion && pri && !m.dividida && n === 1, mano: e.turno.m,
  };
}

function totalApuestasBanca(e) { return e.jug.reduce((s, p) => s + p.manos.reduce((a, m) => a + m.ap, 0), 0); }

export function aplicar(e, i, a) {
  const L = legales(e, i);
  if (!L) return { ok: false, error: 'No puedes actuar ahora' };
  const c = e.cfg, p = e.jug[i], t = a && a.t;
  if (e.fase === 'apuestas') {
    if (t === 'pasar') { p.listo = true; p.st = 'pasa'; }
    else if (t === 'apostar') {
      const m = Math.floor(+a.a);
      if (!(m >= L.min) || m > L.max) return { ok: false, error: 'Apuesta fuera de limites (' + L.min + ' a ' + L.max + ')' };
      p.f -= m; p.ultima = m; p.manos = [nuevaManoJ(m)]; p.listo = true;
    } else return { ok: false, error: 'Accion desconocida' };
    if (!quien(e).length) repartir(e);
    return { ok: true };
  }
  if (e.fase === 'seguro') {
    if (t !== 'seguro') return { ok: false, error: 'Accion desconocida' };
    p.segDec = true;
    if (a.si && L.seguro) { p.f -= L.monto; p.seg = L.monto; }
    if (!quien(e).length) resolverSeguro(e);
    return { ok: true };
  }
  if (e.fase === 'banca') {
    if (t === 'pedir') { const k = sacar(e); e.banca.c.push(k); ver(e, k); const vb = valorMano(e.banca.c, c.variante); if (vb.pasado || vb.t === (c.variante === 'sm' ? 15 : 21)) e.bancaPlanta = true; }
    else if (t === 'plantarse') e.bancaPlanta = true;
    else return { ok: false, error: 'Accion desconocida' };
    return { ok: true };
  }
  const m = p.manos[e.turno.m];
  if (t === 'pedir') {
    const k = sacar(e); m.c.push(k); ver(e, k);
    const v = valorMano(m.c, c.variante);
    if (v.pasado) m.est = 'pasado'; else if (v.t === (c.variante === 'sm' ? 15 : 21)) m.est = 'plan';
  } else if (t === 'plantarse') m.est = 'plan';
  else if (t === 'doblar') {
    if (!L.doblar) return { ok: false, error: 'No puedes doblar' };
    p.f -= m.ap; m.ap *= 2; m.doblada = true;
    const k = sacar(e); m.c.push(k); ver(e, k);
    m.est = valorMano(m.c, c.variante).pasado ? 'pasado' : 'plan';
  } else if (t === 'dividir') {
    if (!L.dividir) return { ok: false, error: 'No puedes dividir' };
    p.f -= m.ap;
    const nueva = nuevaManoJ(m.ap); nueva.c = [m.c.pop()]; nueva.dividida = m.dividida = true;
    const ases = c.variante !== 'sm' && parse(m.c[0]).v === 1;
    m.ases = nueva.ases = ases;
    const k1 = sacar(e); m.c.push(k1); ver(e, k1);
    const k2 = sacar(e); nueva.c.push(k2); ver(e, k2);
    p.manos.splice(e.turno.m + 1, 0, nueva);
    [m, nueva].forEach((h) => { const v = valorMano(h.c, c.variante); if (ases || v.t === (c.variante === 'sm' ? 15 : 21)) h.est = 'plan'; });
  } else if (t === 'rendirse') {
    if (!L.rendirse) return { ok: false, error: 'No puedes rendirte' };
    m.est = 'rindio';
  } else return { ok: false, error: 'Accion desconocida' };
  avanzarTurno(e);
  return { ok: true };
}
function nuevaManoJ(ap) { return { c: [], ap, est: 'jug', doblada: false, dividida: false, ases: false, res: null }; }

function repartir(e) {
  const c = e.cfg, ids = []; e.jug.forEach((p, i) => { if (p.manos.length) ids.push(i); });
  if (!ids.length) { e.fase = 'entre'; e.manos++; e.res = { gan: e.jug.map(() => 0), total: 0, vacia: true }; return; }
  for (let r = 0; r < 2; r++) {
    ids.forEach((i) => { const k = sacar(e); e.jug[i].manos[0].c.push(k); ver(e, k); });
    const k = sacar(e); e.banca.c.push(k); if (r === 0) ver(e, k);
  }
  ids.forEach((i) => { const m = e.jug[i].manos[0]; if (esNatural(m.c, c.variante, false)) m.est = 'bj'; });
  const up = parse(e.banca.c[0]).v;
  if (c.variante !== 'sm' && c.seguro && up === 1) { e.fase = 'seguro'; e.jug.forEach((p) => { p.segDec = !p.manos.length; }); return; }
  if (c.variante !== 'sm' && (up === 1 || up >= 10)) return espiar(e);
  empezarTurnos(e);
}
function resolverSeguro(e) { espiar(e); }
function espiar(e) {
  if (esNatural(e.banca.c, e.cfg.variante, false)) { revelar(e); e.fase = 'banca'; e.bancaPlanta = true; return; }
  empezarTurnos(e);
}
function revelar(e) { if (e.banca.oculta) { e.banca.oculta = false; ver(e, e.banca.c[1]); } }
function empezarTurnos(e) {
  e.fase = 'turnos'; e.turno = null; e.bancaPlanta = false;
  buscarTurno(e, 0, 0);
}
function buscarTurno(e, p0, m0) {
  for (let p = p0; p < N(e); p++) {
    const ms = e.jug[p].manos;
    for (let m = p === p0 ? m0 : 0; m < ms.length; m++) if (ms[m].est === 'jug') { e.turno = { p, m }; return true; }
  }
  e.turno = null; e.fase = 'banca'; e.bancaPlanta = false;
  if (!debeJugarBanca(e)) { revelar(e); e.bancaPlanta = true; }
  return false;
}
function avanzarTurno(e) {
  const { p, m } = e.turno;
  if (e.jug[p].manos[m].est === 'jug') return;
  buscarTurno(e, p, m + 1);
}
function debeJugarBanca(e) { return e.jug.some((p) => p.manos.some((m) => m.est === 'plan')); }

function bancaPide(e) {
  const v = valorMano(e.banca.c, e.cfg.variante);
  if (e.cfg.variante === 'sm') return v.t < e.cfg.plantaSM;
  if (v.t < 17) return true;
  return v.t === 17 && v.blando && e.cfg.blando17 === 'pide';
}
// avance automatico (la banca de la casa juega paso a paso); devuelve true si cambio algo
export function paso(e) {
  if (e.fase !== 'banca') return false;
  if (e.banca.oculta) { revelar(e); return true; }
  if (bancaHumana(e)) { if (debeJugarBanca(e) && !e.bancaPlanta) return false; }
  else if (debeJugarBanca(e) && !e.bancaPlanta && bancaPide(e)) { const k = sacar(e); e.banca.c.push(k); ver(e, k); return true; }
  pagar(e);
  return true;
}

function pagar(e) {
  const c = e.cfg, v = c.variante, bv = valorMano(e.banca.c, v), bNat = esNatural(e.banca.c, v, false);
  const gan = new Array(N(e)).fill(0); let neto = 0;
  const num = c.pagoBJ === '6:5' ? [6, 5] : [3, 2];
  e.jug.forEach((p, i) => {
    let retorna = 0, apost = p.seg;
    if (p.seg && bNat) retorna += p.seg * 3;
    p.manos.forEach((m) => {
      apost += m.ap; let r = 0, res;
      if (m.est === 'rindio') { r = Math.floor(m.ap / 2); res = 'rendido'; }
      else if (m.est === 'pasado') res = 'pasado';
      else if (m.est === 'bj') { if (bNat) { r = m.ap; res = 'empate'; } else { r = m.ap + Math.floor(m.ap * num[0] / num[1]); res = v === 'sm' ? 'real' : 'blackjack'; } }
      else if (bNat) res = 'pierde';
      else {
        const t = valorMano(m.c, v).t;
        if (bv.pasado || t > bv.t) { r = m.ap * 2; res = 'gana'; }
        else if (t === bv.t) { if (v === 'sm') res = 'pierde'; else { r = m.ap; res = 'empate'; } }
        else res = 'pierde';
      }
      m.res = res; retorna += r;
    });
    p.f += retorna; gan[i] = retorna - apost; if (!p.banca) neto += retorna - apost;
  });
  const b = e.cfg.banca;
  if (b >= 0) {
    let falta = Math.max(0, neto - e.jug[b].f);
    e.jug.forEach((p, i) => { if (falta > 0 && gan[i] > 0 && i !== b) { const r = Math.min(falta, gan[i]); p.f -= r; gan[i] -= r; neto -= r; falta -= r; } });
    e.jug[b].f -= neto; gan[b] = -neto;
  } else e.casa -= neto;
  e.res = { gan, total: gan.reduce((s, x) => s + Math.max(0, x), 0), banca: bv.texto, bancaPasada: bv.pasado, natural: bNat };
  const sumaApu = e.jug.reduce((s, p) => s + p.ultima, 0); e.ultimaBanca = sumaApu;
  e.fase = 'entre'; e.manos++; e.turno = null;
}

export function automatica(e, i) {
  const L = legales(e, i); if (!L) return null;
  if (e.fase === 'apuestas') return L.max >= L.min ? { t: 'apostar', a: Math.max(L.min, Math.min(L.ultima, L.max)) } : { t: 'pasar' };
  if (e.fase === 'seguro') return { t: 'seguro', si: false };
  if (e.fase === 'banca') return { t: 'plantarse' };
  return { t: 'plantarse' };
}

export function vista(e, i) {
  const v = e.cfg.variante;
  const jug = e.jug.map((p) => ({
    f: p.f, st: p.st, listo: p.listo, seg: p.seg, banca: p.banca,
    manos: p.manos.map((m) => ({ c: m.c.slice(), ap: m.ap, est: m.est, res: m.res, doblada: m.doblada, val: valorMano(m.c, v).texto, t: valorMano(m.c, v).t })),
  }));
  const bc = e.banca.oculta && e.banca.c.length > 1 && !(e.cfg.banca >= 0 && i === e.cfg.banca) ? [e.banca.c[0], null] : e.banca.c.slice();
  const visibles = e.banca.oculta ? e.banca.c.slice(0, 1) : e.banca.c;
  return {
    j: id, fase: e.fase, turno: e.turno, jug, banca: { c: bc, oculta: e.banca.oculta, val: visibles.length ? valorMano(visibles, v).texto : '' },
    conteo: e.conteo, restantes: e.zapato.length, total: e.total, mazos: e.cfg.mazos, barajado: e.barajado, variante: v, baraja: e.cfg.baraja, bancaSeat: e.cfg.banca,
    min: e.cfg.minApuesta, max: e.cfg.maxApuesta, pagoBJ: e.cfg.pagoBJ, mostrarConteo: !!e.cfg.conteo, blando17: e.cfg.blando17,
    res: e.res, manos: e.manos, yo: i, legal: i >= 0 && quien(e).includes(i) ? legales(e, i) : null,
  };
}
export function resumen(e) {
  if (!e.res) return null;
  const g = []; e.res.gan.forEach((x, i) => { if (x > 0) g.push(i); });
  return { total: e.res.total, ganadores: g, delta: e.res.gan, texto: 'Banca ' + e.res.banca };
}
