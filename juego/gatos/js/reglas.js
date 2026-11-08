// Motor puro de Gatos Explosivos (sin DOM). El anfitrion es el unico que lo ejecuta; el resto recibe vistas filtradas.
// Mazo: la cima es el ULTIMO elemento de est.mazo. Posicion de reinsercion 0 = cima (la proxima carta a robar).
export const T = { BOMBA: 0, DESACTIVAR: 1, ATAQUE: 2, SALTAR: 3, FAVOR: 4, BARAJAR: 5, FUTURO: 6, NOPE: 7, GATO: 8 }; // gatos 8..12
export const N_TIPOS = 13;
const CUENTAS = [5, 6, 4, 4, 4, 4, 5, 5, 4, 4, 4, 4, 4];
export const MAZO = [], IDS = [];
CUENTAS.forEach((k, t) => { IDS[t] = []; for (let i = 0; i < k; i++) { IDS[t].push(MAZO.length); MAZO.push(t); } });
export const tipo = (id) => MAZO[id];
export const esGato = (t) => t >= T.GATO;
export const ACCIONES = [T.ATAQUE, T.SALTAR, T.FAVOR, T.BARAJAR, T.FUTURO];

export const MODOS = {
  clasico: { nombre: 'Clásico', mano: 4, mitad: false, equipos: false, meta: 1, tiempo: 0, nopeMs: 4000 },
  rapido: { nombre: 'Rápido', mano: 3, mitad: true, equipos: false, meta: 1, tiempo: 15000, nopeMs: 2500 },
  equipos: { nombre: 'Equipos 2 contra 2', mano: 4, mitad: false, equipos: true, meta: 1, tiempo: 0, nopeMs: 4000 },
  torneo: { nombre: 'Torneo a rondas', mano: 4, mitad: false, equipos: false, meta: 3, tiempo: 0, nopeMs: 4000 }
};
export function limpiarCfg(c) {
  c = c || {};
  const modo = MODOS[c.modo] ? c.modo : 'clasico', m = MODOS[modo];
  const r = { modo, mano: m.mano, mitad: m.mitad, equipos: m.equipos, meta: m.meta, tiempo: m.tiempo, nopeMs: m.nopeMs, combos: c.combos !== false };
  if ([0, 15000, 30000, 60000].includes(c.tiempo)) r.tiempo = c.tiempo;
  if ([2000, 2500, 4000, 6000].includes(c.nopeMs)) r.nopeMs = c.nopeMs;
  if (modo === 'torneo' && [2, 3, 5].includes(c.meta)) r.meta = c.meta;
  return r;
}

/* ---------- azar ---------- */
function azar(est) { let t = (est.rs = (est.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function barajar(est, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar(est) * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

/* ---------- partida ---------- */
export function nuevaPartida(cfgIn, n, semilla) {
  const cfg = limpiarCfg(cfgIn);
  if (cfg.equipos) n = 4;
  n = Math.max(2, Math.min(5, n | 0));
  const est = { cfg, n, ronda: 0, rs: semilla | 0, puntos: Array(n).fill(0), ev: [], hum: Array(n).fill(false), fin: null };
  empezarRonda(est);
  return est;
}
export function empezarRonda(est) {
  est.ronda++; est.fin = null; est.fase = 'turno'; est.pend = null; est.futuro = null; est.desc = []; est.orden = []; est.nTurno = 0;
  const { n, cfg } = est;
  const resto = [];
  MAZO.forEach((t, id) => { if (t !== T.BOMBA && t !== T.DESACTIVAR) resto.push(id); });
  barajar(est, resto);
  est.mano = [];
  for (let i = 0; i < n; i++) est.mano.push(resto.splice(0, cfg.mano).concat(IDS[T.DESACTIVAR][i]));
  if (cfg.mitad) resto.length = Math.ceil(resto.length / 2);
  const extra = IDS[T.DESACTIVAR].slice(n, n + (n <= 3 ? 2 : 1));
  est.mazo = barajar(est, resto.concat(extra, IDS[T.BOMBA].slice(0, n - 1)));
  est.vivo = Array(n).fill(true);
  est.turno = (est.ronda - 1) % n; est.rest = 1;
  est.equipo = cfg.equipos ? Array.from({ length: n }, (_, i) => i % 2) : null;
  est.ev.push({ t: 'reparto', ronda: est.ronda });
}
export const siguienteRonda = (est) => { if (est.fin && !est.fin.partida) empezarRonda(est); };

const sigVivo = (est, j) => { for (let k = 1; k <= est.n; k++) { const x = (j + k) % est.n; if (est.vivo[x]) return x; } return j; };
export const vivos = (est) => est.vivo.reduce((a, v, i) => (v ? a.concat(i) : a), []);
export const mismoEquipo = (equipo, a, b) => !!equipo && equipo[a] === equipo[b];
const quitar = (a, x) => { const k = a.indexOf(x); if (k >= 0) a.splice(k, 1); return k >= 0; };
const tieneTipo = (est, j, t) => est.mano[j].find((c) => MAZO[c] === t);
function ventana(est, j) {
  // ventana larga solo si algun humano ajeno puede anular; con un unico humano sin nope no hay nada que esperar (y no se filtra informacion)
  let h = 0, otro = -1;
  for (let k = 0; k < est.n; k++) if (est.vivo[k] && est.hum[k]) { h++; if (k !== j) otro = k; }
  if (otro < 0 || (h === 1 && tieneTipo(est, otro, T.NOPE) == null)) return 1000;
  return est.cfg.nopeMs;
}

/* clasifica una seleccion de cartas: 'carta' | 'par' | 'trio' | 'cinco' | null */
export function clasificar(ids, combos = true) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || !ids.every((c) => MAZO[c] != null)) return null;
  const ts = ids.map((c) => MAZO[c]);
  if (ids.length === 1) return ACCIONES.includes(ts[0]) ? 'carta' : null;
  if (!combos || ts.includes(T.BOMBA)) return null;
  const iguales = ts.every((t) => t === ts[0]) && ts[0] !== T.DESACTIVAR;
  if (ids.length === 2) return iguales ? 'par' : null;
  if (ids.length === 3) return iguales ? 'trio' : null;
  if (ids.length === 5) return new Set(ts).size === 5 ? 'cinco' : null;
  return null;
}
export const objetivoValido = (est, i, o) => Number.isInteger(o) && o >= 0 && o < est.n && o !== i && est.vivo[o] && !mismoEquipo(est.equipo, i, o);

function finTurno(est) {
  est.nTurno++;
  if (--est.rest <= 0) { est.turno = sigVivo(est, est.turno); est.rest = 1; }
  est.ev.push({ t: 'turno', j: est.turno, rest: est.rest });
}
function comprobarFin(est) {
  const vs = vivos(est);
  let ganan = null;
  if (est.equipo) { const eq = new Set(vs.map((j) => est.equipo[j])); if (eq.size === 1) ganan = est.n ? Array.from({ length: est.n }, (_, i) => i).filter((j) => est.equipo[j] === est.equipo[vs[0]]) : []; }
  else if (vs.length === 1) ganan = [vs[0]];
  if (!ganan) return false;
  ganan.forEach((j) => { est.puntos[j]++; });
  const partida = Math.max(...est.puntos) >= est.cfg.meta;
  est.fase = 'fin'; est.pend = null; est.futuro = null;
  est.fin = { ganador: vs[0], ganadores: ganan, partida, orden: est.orden.slice(), ronda: est.ronda };
  est.ev.push({ t: 'fin', ganador: vs[0], ganadores: ganan, partida });
  return true;
}
function eliminar(est, j, bomba) {
  est.vivo[j] = false; est.orden.push(j);
  est.desc.push(...est.mano[j].splice(0), bomba);
  est.ev.push({ t: 'explota', j, id: bomba });
  if (comprobarFin(est)) return;
  est.turno = sigVivo(est, j); est.rest = 1; est.nTurno++;
  est.ev.push({ t: 'turno', j: est.turno, rest: 1 });
}
function robar(est, i) {
  const id = est.mazo.pop();
  if (est.futuro) { if (est.futuro.ids[0] === id) est.futuro.ids.shift(); else est.futuro = null; if (est.futuro && !est.futuro.ids.length) est.futuro = null; }
  if (MAZO[id] === T.BOMBA) {
    const d = tieneTipo(est, i, T.DESACTIVAR);
    est.ev.push({ t: 'robo', j: i, n: 1, bomba: true, id });
    if (d == null) { eliminar(est, i, id); return; }
    quitar(est.mano[i], d); est.desc.push(d);
    est.fase = 'bomba'; est.pend = { j: i, bomba: id };
    est.ev.push({ t: 'desactiva', j: i, carta: d });
    return;
  }
  est.mano[i].push(id);
  est.ev.push({ t: 'robo', j: i, n: 1, p: [i], pd: { ids: [id] } });
  finTurno(est);
}

/* ---------- ordenes ---------- */
export function aplicar(est, i, cmd, ahora) {
  const err = (e) => ({ ok: false, err: e });
  if (!cmd || typeof cmd !== 'object') return err('orden');
  if (est.fase === 'fin') return err('fin');
  if (!Number.isInteger(i) || i < 0 || i >= est.n || !est.vivo[i]) return err('eliminado');
  const mano = est.mano[i];
  switch (cmd.t) {
    case 'robar':
      if (est.fase !== 'turno' || est.turno !== i) return err('turno');
      robar(est, i); return { ok: true };
    case 'jugar': case 'combo': {
      if (est.fase !== 'turno' || est.turno !== i) return err('turno');
      const cartas = cmd.t === 'jugar' ? [cmd.carta] : cmd.cartas;
      const kind = clasificar(cartas, est.cfg.combos);
      if (!kind || (cmd.t === 'jugar') !== (kind === 'carta') || !cartas.every((c) => mano.includes(c))) return err('jugada');
      const t = MAZO[cartas[0]], p = { kind, j: i, cartas: cartas.slice(), t, nopes: [], cierra: 0 };
      if (kind === 'carta' && t === T.FAVOR || kind === 'par' || kind === 'trio') {
        if (!objetivoValido(est, i, cmd.obj) || (kind !== 'trio' && !est.mano[cmd.obj].length)) return err('objetivo');
        p.obj = cmd.obj;
      }
      if (kind === 'trio') { if (!Number.isInteger(cmd.pedir) || cmd.pedir < 1 || cmd.pedir >= N_TIPOS) return err('pedido'); p.pedir = cmd.pedir; }
      if (kind === 'cinco') { if (!Number.isInteger(cmd.pedir) || !est.desc.includes(cmd.pedir) || MAZO[cmd.pedir] === T.BOMBA) return err('pedido'); p.pedir = cmd.pedir; }
      cartas.forEach((c) => quitar(mano, c)); est.desc.push(...cartas);
      p.cierra = ahora + ventana(est, i);
      est.pend = p; est.fase = 'nope';
      est.ev.push({ t: 'jugar', j: i, cartas: cartas.slice(), tp: t, kind, obj: p.obj, pedir: p.pedir });
      return { ok: true };
    }
    case 'nope': {
      if (est.fase !== 'nope') return err('fase');
      const c = tieneTipo(est, i, T.NOPE);
      if (c == null) return err('sin nope');
      quitar(mano, c); est.desc.push(c);
      est.pend.nopes.push(i); est.pend.cierra = ahora + ventana(est, est.pend.j);
      est.ev.push({ t: 'nope', j: i, carta: c, n: est.pend.nopes.length });
      return { ok: true };
    }
    case 'dar': {
      if (est.fase !== 'favor' || est.pend.a !== i || !mano.includes(cmd.carta)) return err('fase');
      quitar(mano, cmd.carta); est.mano[est.pend.j].push(cmd.carta);
      est.ev.push({ t: 'dar', de: i, a: est.pend.j, p: [i, est.pend.j], pd: { id: cmd.carta } });
      est.fase = 'turno'; est.pend = null; return { ok: true };
    }
    case 'reinsertar': {
      if (est.fase !== 'bomba' || est.pend.j !== i || !Number.isInteger(cmd.pos) || cmd.pos < 0 || cmd.pos > est.mazo.length) return err('fase');
      est.mazo.splice(est.mazo.length - cmd.pos, 0, est.pend.bomba);
      est.futuro = null; est.fase = 'turno'; est.pend = null;
      est.ev.push({ t: 'reinserta', j: i, p: [i], pd: { pos: cmd.pos } });
      finTurno(est); return { ok: true };
    }
    default: return err('orden');
  }
}

/* Cierra la ventana de nope cuando vence y resuelve (o anula) la jugada. Devuelve true si cambio algo. */
export function cerrarNope(est, ahora) {
  if (est.fase !== 'nope' || ahora < est.pend.cierra) return false;
  const p = est.pend; est.pend = null; est.fase = 'turno';
  if (p.nopes.length % 2 === 1) { est.ev.push({ t: 'anulada', j: p.j, kind: p.kind, tp: p.t, nopes: p.nopes.length }); return true; }
  est.ev.push({ t: 'resuelve', j: p.j, kind: p.kind, tp: p.t, nopes: p.nopes.length });
  const j = p.j;
  if (p.kind === 'carta') {
    switch (p.t) {
      case T.ATAQUE: { const v = sigVivo(est, j); est.rest = est.rest + 1; est.turno = v; est.nTurno++; est.ev.push({ t: 'ataque', j, a: v }); est.ev.push({ t: 'turno', j: v, rest: est.rest }); break; }
      case T.SALTAR: est.ev.push({ t: 'saltar', j }); finTurno(est); break;
      case T.FAVOR: if (!est.mano[p.obj].length) { est.ev.push({ t: 'roba', j, a: p.obj, nada: true }); break; } est.fase = 'favor'; est.pend = { j, a: p.obj }; est.ev.push({ t: 'favor', j, a: p.obj }); break;
      case T.BARAJAR: barajar(est, est.mazo); est.futuro = null; est.ev.push({ t: 'barajo', j }); break;
      case T.FUTURO: est.futuro = { j, ids: est.mazo.slice(-3).reverse() }; est.ev.push({ t: 'futuro', j, n: est.futuro.ids.length, p: [j], pd: { ids: est.futuro.ids.slice() } }); break;
      default: break;
    }
  } else if (p.kind === 'par') {
    const m = est.mano[p.obj];
    if (m.length) { const id = m.splice(Math.floor(azar(est) * m.length), 1)[0]; est.mano[j].push(id); est.ev.push({ t: 'roba', j, a: p.obj, p: [j, p.obj], pd: { id } }); }
    else est.ev.push({ t: 'roba', j, a: p.obj, nada: true });
  } else if (p.kind === 'trio') {
    const id = tieneTipo(est, p.obj, p.pedir);
    if (id != null) { quitar(est.mano[p.obj], id); est.mano[j].push(id); }
    est.ev.push({ t: 'roba', j, a: p.obj, tp: p.pedir, ok: id != null, nada: id == null, id: id == null ? undefined : id });
  } else if (p.kind === 'cinco') {
    if (quitar(est.desc, p.pedir)) { est.mano[j].push(p.pedir); est.ev.push({ t: 'rescata', j, id: p.pedir }); }
  }
  return true;
}

/* Jugadas automaticas por inactividad (anfitrion). */
export function autoJugada(est, i) {
  if (est.fase === 'turno' && est.turno === i) return { t: 'robar' };
  if (est.fase === 'favor' && est.pend.a === i) return { t: 'dar', carta: est.mano[i][Math.floor(azar(est) * est.mano[i].length)] };
  if (est.fase === 'bomba' && est.pend.j === i) return { t: 'reinsertar', pos: Math.floor(azar(est) * (est.mazo.length + 1)) };
  return null;
}

/* ---------- vista filtrada por asiento ---------- */
export function vista(est, i, ahora) {
  const p = est.pend;
  return {
    v: 1, n: est.n, yo: i, ronda: est.ronda, turno: est.turno, rest: est.rest, fase: est.fase, cfg: est.cfg,
    mano: est.mano[i].slice(), conteos: est.mano.map((m) => m.length), vivo: est.vivo.slice(), nMazo: est.mazo.length,
    desc: est.desc.slice(), equipo: est.equipo, puntos: est.puntos.slice(), orden: est.orden.slice(),
    futuro: est.futuro && est.futuro.j === i ? est.futuro.ids.slice() : null,
    pend: p ? { kind: p.kind, j: p.j, a: p.a, cartas: p.cartas, t: p.t, obj: p.obj, pedir: p.pedir, nopes: (p.nopes || []).slice(), ms: p.cierra ? Math.max(0, p.cierra - ahora) : 0, bomba: p.j === i ? p.bomba : undefined } : null,
    fin: est.fin
  };
}
