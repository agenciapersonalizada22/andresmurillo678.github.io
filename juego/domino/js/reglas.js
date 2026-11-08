// Motor de domino (puro, sin DOM, determinista con semilla). Estilo latinoamericano/Caribe:
// cadena lineal sin "spinner", pase obligatorio sin jugada, tranque (todos pasan), capicua y puntos por mano.
// Asientos: seat+1 se sienta a la derecha de seat (se juega en sentido antihorario); en parejas el companero es seat+2.

export const VARIANTES = { 6: { mano: 7 }, 9: { mano: 10 }, 12: { mano: 12 } };
export const POZO_MIN = 2; // en duelo no se pueden robar las ultimas 2 fichas
export const REGLAS_BASE = {
  variante: 6, modo: 'parejas', n: 4, meta: 100, capicua: 25, puntuacion: 'todas', tiempo: 0, apuesta: 0, robo: true
};
export const MODOS = {
  parejas: { nombre: 'Parejas (4)', n: [4] },
  todos: { nombre: 'Todos contra todos', n: [3, 4] },
  duelo: { nombre: 'Duelo con pozo (2)', n: [2] }
};

const tablas = {};
export function tabla(max) {
  if (tablas[max]) return tablas[max];
  const t = [];
  for (let a = 0; a <= max; a++) for (let b = a; b <= max; b++) t.push([a, b]);
  return (tablas[max] = t);
}
export const par = (max, id) => tabla(max)[id];
export const valor = (max, id) => { const p = tabla(max)[id]; return p[0] + p[1]; };
export const esDoble = (max, id) => { const p = tabla(max)[id]; return p[0] === p[1]; };

export function limpiarReglas(r) {
  const o = { ...REGLAS_BASE, ...(r || {}) };
  if (!VARIANTES[o.variante]) o.variante = 6;
  if (!MODOS[o.modo]) o.modo = 'parejas';
  o.n = MODOS[o.modo].n.includes(o.n | 0) ? o.n | 0 : MODOS[o.modo].n[0];
  o.meta = Math.max(20, Math.min(1000, o.meta | 0 || 100));
  o.capicua = [0, 25, 50].includes(o.capicua) ? o.capicua : 25;
  o.puntuacion = o.puntuacion === 'rivales' ? 'rivales' : 'todas';
  o.tiempo = [0, 20000, 40000].includes(o.tiempo) ? o.tiempo : 0;
  o.apuesta = [0, 10, 50, 100].includes(o.apuesta) ? o.apuesta : 0;
  o.robo = o.robo !== false;
  return o;
}

export const unidadDe = (est, seat) => (est.cfg.modo === 'parejas' ? seat % 2 : seat);
export const nUnidades = (est) => (est.cfg.modo === 'parejas' ? 2 : est.n);
export const siguiente = (est, seat) => (seat + 1) % est.n;

function azar(est) {
  let t = (est.rng = (est.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nuevaPartida(cfg, n, semilla) {
  cfg = limpiarReglas(cfg);
  n = cfg.modo === 'parejas' ? 4 : cfg.modo === 'duelo' ? 2 : Math.max(3, Math.min(4, n | 0 || cfg.n));
  const est = {
    v: 1, cfg, n, max: cfg.variante, rng: (semilla | 0) || 1, ronda: 0, puntos: new Array(cfg.modo === 'parejas' ? 2 : n).fill(0),
    manos: [], pozo: [], cadena: [], centro: null, turno: 0, sale: 0, obligada: null, pases: 0, fin: null, log: [], ev: [], ult: null, manosGanadas: new Array(n).fill(0)
  };
  repartir(est, true);
  return est;
}

export function repartir(est, primera) {
  const total = tabla(est.max).length, tam = VARIANTES[est.max].mano;
  const ids = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) { const j = Math.floor(azar(est) * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  est.manos = Array.from({ length: est.n }, (_, s) => ids.slice(s * tam, (s + 1) * tam).sort((a, b) => a - b));
  est.pozo = ids.slice(est.n * tam);
  est.cadena = []; est.centro = null; est.pases = 0; est.fin = null; est.log = []; est.ult = null; est.ronda++;
  est.obligada = null;
  if (primera) {
    let mejor = -1, mj = -1, mk = -1;
    for (let s = 0; s < est.n; s++) for (const id of est.manos[s]) {
      const [a, b] = par(est.max, id), k = (a === b ? 1000 : 0) + a + b + Math.max(a, b) / 100;
      if (k > mk) { mk = k; mejor = id; mj = s; }
    }
    est.sale = mj; est.obligada = mejor;
  }
  est.turno = est.sale;
  est.ev.push({ t: 'reparto', ronda: est.ronda, sale: est.sale });
}

export function extremos(est) {
  if (!est.cadena.length) return null;
  return { izq: est.cadena[0].a, der: est.cadena[est.cadena.length - 1].b };
}

export function legales(est, seat) {
  const mano = est.manos[seat], r = [];
  if (!est.cadena.length) {
    if (est.obligada != null) return mano.includes(est.obligada) ? [{ id: est.obligada, lado: 'd' }] : [];
    return mano.map((id) => ({ id, lado: 'd' }));
  }
  const e = extremos(est);
  for (const id of mano) {
    const [x, y] = par(est.max, id);
    if (x === e.izq || y === e.izq) r.push({ id, lado: 'i' });
    if (x === e.der || y === e.der) r.push({ id, lado: 'd' });
  }
  return r;
}
export const puedeRobar = (est, seat) => est.cfg.robo && est.n === 2 && est.pozo.length > POZO_MIN && est.turno === seat && !est.fin;

export const suma = (est, seat) => est.manos[seat].reduce((s, id) => s + valor(est.max, id), 0);

// Orienta una ficha al colocarla: devuelve {a, b} con a = valor del lado izquierdo de la cadena.
export function orientar(est, id, lado) {
  const [x, y] = par(est.max, id);
  if (!est.cadena.length) return { a: x, b: y };
  if (lado === 'i') return { a: x === est.cadena[0].a ? y : x, b: est.cadena[0].a };
  const f = est.cadena[est.cadena.length - 1].b;
  return { a: f, b: y === f ? x : y };
}

export function aplicar(est, seat, cmd) {
  if (est.fin) return { ok: false, err: 'mano terminada' };
  if (!cmd || est.turno !== seat) return { ok: false, err: 'no es tu turno' };
  const lg = legales(est, seat);
  if (cmd.t === 'jugar') {
    if (!lg.some((m) => m.id === cmd.id && m.lado === cmd.lado)) return { ok: false, err: 'jugada no valida' };
    const o = orientar(est, cmd.id, cmd.lado);
    const e = extremos(est);
    const pp = par(est.max, cmd.id), ambos = !!e && pp.includes(e.izq) && pp.includes(e.der);
    const pieza = { id: cmd.id, a: o.a, b: o.b };
    if (!est.cadena.length) est.centro = cmd.id;
    if (cmd.lado === 'i' && est.cadena.length) est.cadena.unshift(pieza); else est.cadena.push(pieza);
    est.manos[seat] = est.manos[seat].filter((i) => i !== cmd.id);
    est.pases = 0; est.obligada = null;
    const ex = extremos(est);
    est.ult = { j: seat, id: cmd.id };
    const ev = { t: 'jugar', j: seat, id: cmd.id, lado: cmd.lado, a: o.a, b: o.b, izq: ex.izq, der: ex.der, n: est.manos[seat].length };
    est.ev.push(ev); est.log.push({ t: 'jugar', j: seat, id: cmd.id });
    if (!est.manos[seat].length) { cerrar(est, 'domino', seat, ambos); return { ok: true }; }
    est.turno = siguiente(est, seat);
    return { ok: true };
  }
  if (cmd.t === 'robar') {
    if (lg.length || !puedeRobar(est, seat)) return { ok: false, err: 'no puedes robar' };
    const id = est.pozo.pop();
    est.manos[seat].push(id); est.manos[seat].sort((a, b) => a - b);
    const e = extremos(est);
    est.ev.push({ t: 'robo', j: seat, id, pozo: est.pozo.length, izq: e.izq, der: e.der });
    est.log.push({ t: 'robo', j: seat, izq: e.izq, der: e.der });
    return { ok: true };
  }
  if (cmd.t === 'pasar') {
    if (lg.length) return { ok: false, err: 'tienes jugada' };
    if (puedeRobar(est, seat)) return { ok: false, err: 'debes robar' };
    const e = extremos(est);
    est.pases++;
    est.ev.push({ t: 'pase', j: seat, izq: e.izq, der: e.der });
    est.log.push({ t: 'pase', j: seat, izq: e.izq, der: e.der });
    if (est.pases >= est.n) { cerrar(est, 'tranque', -1, false); return { ok: true }; }
    est.turno = siguiente(est, seat);
    return { ok: true };
  }
  return { ok: false, err: 'orden desconocida' };
}

// Cierre de mano: domino (alguien se queda sin fichas) o tranque (nadie puede jugar: gana la menor suma).
function cerrar(est, tipo, seat, capicua) {
  const nu = nUnidades(est), sumas = new Array(nu).fill(0);
  for (let s = 0; s < est.n; s++) sumas[unidadDe(est, s)] += suma(est, s);
  const total = sumas.reduce((a, b) => a + b, 0);
  let unidad = -1, ganador = -1, pts = 0, bonus = 0;
  if (tipo === 'domino') { ganador = seat; unidad = unidadDe(est, seat); }
  else {
    let m = Infinity, cuantos = 0;
    sumas.forEach((x) => { if (x < m) { m = x; cuantos = 1; } else if (x === m) cuantos++; });
    if (cuantos === 1) {
      unidad = sumas.indexOf(m);
      let mm = Infinity;
      for (let s = 0; s < est.n; s++) if (unidadDe(est, s) === unidad && suma(est, s) < mm) { mm = suma(est, s); ganador = s; }
    }
  }
  if (unidad >= 0) {
    pts = est.cfg.puntuacion === 'rivales' ? total - sumas[unidad] : total;
    if (tipo === 'domino' && capicua && est.cfg.capicua) bonus = est.cfg.capicua;
    pts += bonus;
    est.puntos[unidad] += pts;
    if (ganador >= 0) est.manosGanadas[ganador]++;
    est.sale = ganador;
  } else est.sale = siguiente(est, est.sale);
  const campeon = unidad >= 0 && est.puntos[unidad] >= est.cfg.meta ? unidad : -1;
  est.fin = {
    tipo: unidad < 0 ? 'empate' : tipo, ganador, unidad, pts, bonus, capicua: !!(bonus || (tipo === 'domino' && capicua)),
    manos: est.manos.map((m) => m.slice()), sumas, partida: campeon >= 0, campeon, puntos: est.puntos.slice(), ronda: est.ronda,
    ultima: tipo === 'domino' ? est.ult.id : null
  };
  est.ev.push({ t: 'fin', ...est.fin });
}

export function siguienteMano(est) {
  if (!est.fin || est.fin.partida) return false;
  repartir(est, false);
  return true;
}

// Vista filtrada para un asiento: solo sus fichas; de los demas, cuantas tienen.
export function vista(est, seat, ahora) {
  const jug = est.turno === seat && !est.fin ? legales(est, seat) : [];
  return {
    n: est.n, cfg: est.cfg, max: est.max, yo: seat, mano: est.manos[seat].slice(), cuentas: est.manos.map((m) => m.length),
    pozo: est.pozo.length, centro: est.centro, cadena: est.cadena.map((c) => ({ id: c.id, a: c.a, b: c.b })), ext: extremos(est),
    turno: est.fin ? -1 : est.turno, ronda: est.ronda, puntos: est.puntos.slice(), sale: est.sale, obligada: est.obligada, pases: est.pases,
    jugables: jug, puedePasar: !est.fin && est.turno === seat && !jug.length && !puedeRobar(est, seat), puedeRobar: puedeRobar(est, seat) && !jug.length,
    ult: est.ult, fin: est.fin, ahora: ahora || 0
  };
}

export const sumaTotal = (est) => est.manos.reduce((s, m) => s + m.length, 0) + est.pozo.length + est.cadena.length;

export function clonar(est) {
  return {
    ...est, cfg: est.cfg, manos: est.manos.map((m) => m.slice()), pozo: est.pozo.slice(), cadena: est.cadena.map((c) => ({ ...c })),
    puntos: est.puntos.slice(), log: [], ev: [], manosGanadas: est.manosGanadas.slice(), fin: null
  };
}
