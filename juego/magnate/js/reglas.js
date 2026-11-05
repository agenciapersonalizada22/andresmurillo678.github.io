// Motor de reglas de Magnate: puro y serializable (sin DOM). El anfitrion es la unica instancia que aplica acciones.
import { CASILLAS, GRUPOS, POR_GRUPO, COMPRABLE, ESTACIONES, SERVICIOS, SUERTE, COMUNIDAD, REGLAS_BASE, BANCO, BOTE, TODOS, CARCEL, MAX_CASAS, MAX_HOTELES, NUM } from './datos.js';

let EV = [];

function rnd(e) {
  e.rng = (e.rng + 0x6D2B79F5) >>> 0;
  let t = e.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const barajar = (e, n) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const k = Math.floor(rnd(e) * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
};
const reg = (e, x) => { e.log.push(x); if (e.log.length > 60) e.log.shift(); EV.push({ t: 'log', x }); };
const nom = (e, j) => e.jug[j].nombre;

export function clonar(e) { return JSON.parse(JSON.stringify(e)); }

export function crearPartida(cfgIn, asientos, semilla) {
  const cfg = Object.assign({}, REGLAS_BASE, cfgIn || {});
  const e = {
    v: 1, id: 'm' + (semilla >>> 0).toString(36) + Math.floor(Math.random() * 1e6).toString(36), cfg, rng: (semilla >>> 0) || 1,
    jug: asientos.map((a, i) => ({ id: i, nombre: a.nombre, color: a.color, tipo: a.tipo || 'bot', nivel: a.nivel == null ? 1 : a.nivel, din: cfg.dineroInicial, pos: 0,
      carcel: false, intentos: 0, tarj: [], quebrado: false, nTurnos: 0, ultTrato: -99 })),
    prop: CASILLAS.map((c) => (COMPRABLE[c.i] ? { o: -1, c: 0, h: false } : null)),
    turno: 0, fase: 'tirar', dobles: 0, extra: false, dados: [0, 0], mov: 0, banco: 0, bote: 0, casasBanco: MAX_CASAS, hotelesBanco: MAX_HOTELES,
    mazos: { s: [], c: [] }, subasta: null, deuda: null, trato: null, tratoN: 0, tiempoMs: 0, turnoN: 0, ganador: -1, motivoFin: '', ranking: [], log: [], seq: 0
  };
  e.banco = -e.jug.length * cfg.dineroInicial;
  e.mazos.s = barajar(e, SUERTE.length); e.mazos.c = barajar(e, COMUNIDAD.length);
  e.turno = Math.floor(rnd(e) * e.jug.length);
  return e;
}

/* ---------- consultas ---------- */
export const activos = (e) => e.jug.filter((p) => !p.quebrado).map((p) => p.id);
export const propsDe = (e, j) => { const r = []; for (let i = 0; i < NUM; i++) if (e.prop[i] && e.prop[i].o === j) r.push(i); return r; };
export const grupoCompleto = (e, g, j) => POR_GRUPO[g].every((i) => e.prop[i].o === j);
export const valorHipoteca = (e, i) => Math.floor(CASILLAS[i].precio * (e.cfg.hipotecaMitad ? 0.5 : 0.33));
export const costoDeshipoteca = (e, i) => Math.ceil(valorHipoteca(e, i) * 1.1);
export function patrimonio(e, j) {
  const p = e.jug[j]; if (p.quebrado) return 0;
  let t = p.din;
  for (const i of propsDe(e, j)) { const q = e.prop[i]; t += q.h ? valorHipoteca(e, i) : CASILLAS[i].precio; if (CASILLAS[i].grupo != null) t += q.c * GRUPOS[CASILLAS[i].grupo].casa; }
  return t;
}
export function quienActua(e) {
  if (e.fase === 'fin_partida') return -1;
  return e.fase === 'subasta' ? e.subasta.turnoPuja : e.turno;
}
export function calcularRenta(e, i, mult, x10) {
  const c = CASILLAS[i], q = e.prop[i], o = q.o, sum = e.dados[0] + e.dados[1];
  if (c.tipo === 'prop') {
    if (q.c > 0) return c.renta[q.c];
    return c.renta[0] * (grupoCompleto(e, c.grupo, o) ? 2 : 1);
  }
  if (c.tipo === 'estacion') { const n = ESTACIONES.filter((k) => e.prop[k].o === o).length; return 25 * (1 << (n - 1)) * (mult || 1); }
  const n = SERVICIOS.filter((k) => e.prop[k].o === o).length;
  return sum * (x10 ? 10 : n >= 2 ? 10 : 4);
}

/* ---------- dinero ---------- */
function mueve(e, de, a, m) {
  if (m <= 0) return;
  if (de >= 0) e.jug[de].din -= m; else if (de === BANCO) e.banco -= m; else e.bote -= m;
  if (a >= 0) e.jug[a].din += m; else if (a === BANCO) e.banco += m; else e.bote += m;
  if (de >= 0) EV.push({ t: 'din', j: de, d: -m }); if (a >= 0) EV.push({ t: 'din', j: a, d: m });
}
const destMulta = (e) => (e.cfg.bote ? BOTE : BANCO);

function cobrar(e, j, m, a, motivo) {
  if (m <= 0) return true;
  if (a === TODOS) {
    const otros = activos(e).filter((k) => k !== j);
    if (!otros.length) return true;
    if (e.jug[j].din >= m * otros.length) { otros.forEach((k) => mueve(e, j, k, m)); return true; }
    e.deuda = { a, monto: m * otros.length, cada: m, motivo }; e.fase = 'deuda';
    reg(e, nom(e, j) + ' debe ' + m * otros.length + ' (' + motivo + ') y no le alcanza.'); return false;
  }
  if (e.jug[j].din >= m) { mueve(e, j, a, m); return true; }
  e.deuda = { a, monto: m, motivo }; e.fase = 'deuda';
  reg(e, nom(e, j) + ' debe ' + m + ' (' + motivo + ') y no le alcanza.');
  return false;
}

/* ---------- movimiento ---------- */
function avanzar(e, j, n) {
  const p = e.jug[j], ruta = [];
  for (let k = 1; k <= n; k++) {
    p.pos = (p.pos + 1) % NUM; ruta.push(p.pos);
    if (p.pos === 0) {
      mueve(e, BANCO, j, e.cfg.sueldo); reg(e, nom(e, j) + ' cobra su sueldo (' + e.cfg.sueldo + ').');
      if (k === n && e.cfg.bonoSalida) { mueve(e, BANCO, j, e.cfg.sueldo); reg(e, nom(e, j) + ' cae en la Salida: bono de ' + e.cfg.sueldo + '.'); }
    }
  }
  EV.push({ t: 'mover', j, ruta });
}
function irA(e, j, dest) {
  const p = e.jug[j];
  avanzar(e, j, (dest - p.pos + NUM) % NUM || NUM);
}
function enviarCarcel(e, j) {
  const p = e.jug[j];
  p.pos = CARCEL; p.carcel = true; p.intentos = 0; e.dobles = 0;
  EV.push({ t: 'salto', j, a: CARCEL }); reg(e, nom(e, j) + ' va a la cárcel.');
}

/* ---------- aterrizaje ---------- */
function aterrizar(e, j, ctx) {
  const p = e.jug[j], c = CASILLAS[p.pos];
  switch (c.tipo) {
    case 'prop': case 'estacion': case 'servicio': {
      const q = e.prop[p.pos];
      if (q.o === -1) { e.fase = 'compra'; return false; }
      if (q.o === j || q.h) return true;
      if (e.cfg.sinRentaCarcel && e.jug[q.o].carcel) { reg(e, nom(e, q.o) + ' está en la cárcel: no cobra renta.'); return true; }
      const m = calcularRenta(e, p.pos, ctx && ctx.mult, ctx && ctx.x10);
      EV.push({ t: 'renta', de: j, a: q.o, m, i: p.pos });
      reg(e, nom(e, j) + ' paga renta de ' + m + ' a ' + nom(e, q.o) + ' (' + c.nombre + ').');
      return cobrar(e, j, m, q.o, 'renta');
    }
    case 'suerte': return sacarCarta(e, j, 's');
    case 'comunidad': return sacarCarta(e, j, 'c');
    case 'impuesto': reg(e, nom(e, j) + ' paga ' + c.nombre + ' (' + c.monto + ').'); return cobrar(e, j, c.monto, destMulta(e), 'impuesto');
    case 'ircarcel': enviarCarcel(e, j); return true;
    case 'libre':
      if (e.cfg.bote && e.bote > 0) { reg(e, nom(e, j) + ' se lleva el bote: ' + e.bote + '.'); mueve(e, BOTE, j, e.bote); }
      return true;
    default: return true;
  }
}

function sacarCarta(e, j, k) {
  const cola = e.mazos[k], idx = cola.shift(), carta = (k === 's' ? SUERTE : COMUNIDAD)[idx], ef = carta.ef, p = e.jug[j];
  EV.push({ t: 'carta', j, k, x: carta.x });
  reg(e, nom(e, j) + ' roba ' + (k === 's' ? 'Suerte' : 'Comunidad') + ': ' + carta.x);
  if (ef.t === 'tarjeta') { p.tarj.push(k); return true; }
  cola.push(idx);
  switch (ef.t) {
    case 'cobrar': mueve(e, BANCO, j, ef.n); return true;
    case 'pagar': return cobrar(e, j, ef.n, destMulta(e), 'carta');
    case 'ir': irA(e, j, ef.a); return aterrizar(e, j);
    case 'irAtras': { p.pos = ef.a; EV.push({ t: 'salto', j, a: ef.a }); return aterrizar(e, j); }
    case 'cercano': {
      const lista = ef.k === 'estacion' ? ESTACIONES : SERVICIOS;
      let d = lista.find((x) => x > p.pos); if (d == null) d = lista[0];
      irA(e, j, d); return aterrizar(e, j, ef.k === 'estacion' ? { mult: 2 } : { x10: true });
    }
    case 'atras': {
      const ruta = []; for (let n = 0; n < ef.n; n++) { p.pos = (p.pos + NUM - 1) % NUM; ruta.push(p.pos); }
      EV.push({ t: 'mover', j, ruta, atras: true }); return aterrizar(e, j);
    }
    case 'carcel': enviarCarcel(e, j); return true;
    case 'reparar': {
      let m = 0; for (const i of propsDe(e, j)) { const c = e.prop[i].c; m += c === 5 ? ef.hotel : c * ef.casa; }
      return cobrar(e, j, m, destMulta(e), 'reparaciones');
    }
    case 'deTodos': activos(e).filter((x) => x !== j).forEach((x) => mueve(e, x, j, Math.min(ef.n, e.jug[x].din))); return true;
    case 'aTodos': return cobrar(e, j, ef.n, TODOS, 'carta');
    default: return true;
  }
}

/* ---------- flujo de turno ---------- */
function reanudar(e) {
  const j = e.turno, p = e.jug[j];
  if (e.mov > 0 && !p.quebrado) { const n = e.mov; e.mov = 0; avanzar(e, j, n); if (!aterrizar(e, j)) return; }
  siguienteFase(e);
}
function siguienteFase(e) {
  const p = e.jug[e.turno];
  if (e.fase === 'fin_partida') return;
  if (p.quebrado) return pasarTurno(e);
  e.fase = e.extra && !p.carcel ? 'tirar' : 'fin';
}
export function terminarPartida(e, motivo) { EV = []; termino(e, motivo); e.seq++; return EV; }
export function termino(e, motivo) {
  const act = activos(e);
  e.ranking = e.jug.map((p) => ({ id: p.id, pat: patrimonio(e, p.id), quebrado: p.quebrado })).sort((a, b) => (a.quebrado - b.quebrado) || (b.pat - a.pat));
  e.ganador = e.ranking[0].id; e.fase = 'fin_partida'; e.motivoFin = motivo; e.deuda = null; e.subasta = null; e.trato = null;
  reg(e, 'Fin de la partida: gana ' + nom(e, e.ganador) + (motivo === 'tiempo' ? ' por patrimonio.' : '.'));
  EV.push({ t: 'fin', ganador: e.ganador }); return act;
}
function pasarTurno(e) {
  const n = e.jug.length, ant = e.turno;
  e.jug[ant].nTurnos++; e.turnoN++;
  if (activos(e).length <= 1) return termino(e, 'ultimo');
  if ((e.cfg.limiteMin > 0 && e.tiempoMs >= e.cfg.limiteMin * 60000) || (e.cfg.limiteTurnos > 0 && e.turnoN >= e.cfg.limiteTurnos)) return termino(e, 'tiempo');
  let k = ant; do { k = (k + 1) % n; } while (e.jug[k].quebrado);
  e.turno = k; e.fase = 'tirar'; e.dobles = 0; e.extra = false; e.mov = 0; e.deuda = null;
  EV.push({ t: 'turno', j: k });
}

/* ---------- subasta ---------- */
function proximoPostor(e, desde) {
  const s = e.subasta, n = e.jug.length;
  let k = desde;
  for (let c = 0; c < n; c++) {
    k = (k + 1) % n;
    const p = e.jug[k];
    if (p.quebrado || s.pasaron.includes(k) || k === s.lider) continue;
    if (p.din <= s.monto) { s.pasaron.push(k); continue; }
    return k;
  }
  return -1;
}
function iniciarSubasta(e, i) {
  e.subasta = { i, monto: 0, lider: -1, pasaron: [], turnoPuja: -1 };
  e.fase = 'subasta'; EV.push({ t: 'subasta', i });
  reg(e, 'Subasta de ' + CASILLAS[i].nombre + '.');
  e.subasta.turnoPuja = proximoPostor(e, e.turno);
  if (e.subasta.turnoPuja < 0) cerrarSubasta(e);
}
function cerrarSubasta(e) {
  const s = e.subasta, i = s.i; e.subasta = null;
  if (s.lider >= 0) {
    mueve(e, s.lider, BANCO, s.monto); e.prop[i].o = s.lider;
    reg(e, nom(e, s.lider) + ' gana la subasta de ' + CASILLAS[i].nombre + ' por ' + s.monto + '.'); EV.push({ t: 'compra', j: s.lider, i, m: s.monto, subasta: true });
  } else reg(e, 'Nadie compra ' + CASILLAS[i].nombre + '.');
  siguienteFase(e);
}
function avanzaSubasta(e, desde) {
  const s = e.subasta, n = proximoPostor(e, desde);
  if (n < 0) return cerrarSubasta(e);
  s.turnoPuja = n;
}

/* ---------- construccion e hipotecas ---------- */
export function puedeConstruir(e, j, i) {
  const c = CASILLAS[i], q = e.prop[i], p = e.jug[j];
  if (c.tipo !== 'prop' || q.o !== j) return 'No es tuya';
  if (!grupoCompleto(e, c.grupo, j)) return 'Necesitas todo el barrio';
  const g = POR_GRUPO[c.grupo];
  if (g.some((k) => e.prop[k].h)) return 'Hay hipotecas en el barrio';
  if (q.c >= 5) return 'Ya tiene hotel';
  if (e.cfg.construccionPareja && g.some((k) => e.prop[k].c < q.c)) return 'Construye parejo';
  if (q.c < 4 ? e.casasBanco < 1 : e.hotelesBanco < 1) return q.c < 4 ? 'No quedan casas' : 'No quedan hoteles';
  if (p.din < GRUPOS[c.grupo].casa) return 'No te alcanza';
  return '';
}
export function puedeVender(e, j, i) {
  const c = CASILLAS[i], q = e.prop[i];
  if (c.tipo !== 'prop' || q.o !== j || q.c < 1) return 'No hay edificios';
  if (q.c === 5 && e.casasBanco < 4) return 'No hay casas para cambiar el hotel';
  if (e.cfg.construccionPareja && POR_GRUPO[c.grupo].some((k) => e.prop[k].c > q.c)) return 'Vende parejo';
  return '';
}
export function puedeHipotecar(e, j, i) {
  const q = e.prop[i];
  if (!q || q.o !== j) return 'No es tuya';
  if (q.h) return 'Ya hipotecada';
  const g = CASILLAS[i].grupo;
  if (g != null && POR_GRUPO[g].some((k) => e.prop[k].c > 0)) return 'Vende los edificios del barrio';
  return '';
}
export function puedeDeshipotecar(e, j, i) {
  const q = e.prop[i];
  if (!q || q.o !== j) return 'No es tuya';
  if (!q.h) return 'No está hipotecada';
  if (e.jug[j].din < costoDeshipoteca(e, i)) return 'No te alcanza';
  return '';
}

/* ---------- tratos ---------- */
const vacio = (o) => !o.din && !o.props.length && !o.tarj;
function lado(o) { return { din: Math.max(0, Math.floor((o && +o.din) || 0)), props: [...new Set(((o && o.props) || []).map(Number))].sort((a, b) => a - b), tarj: Math.max(0, Math.floor((o && +o.tarj) || 0)) }; }
export function validarTrato(e, t) {
  const A = e.jug[t.de], B = e.jug[t.a];
  if (!A || !B || A.quebrado || B.quebrado || t.de === t.a) return 'Jugadores no válidos';
  if (vacio(t.ofrece) && vacio(t.pide)) return 'Trato vacío';
  for (const [dueno, o] of [[t.de, t.ofrece], [t.a, t.pide]]) {
    const P = e.jug[dueno];
    if (o.din > P.din) return P.nombre + ' no tiene ese dinero';
    if (o.tarj > P.tarj.length) return P.nombre + ' no tiene esas tarjetas';
    for (const i of o.props) {
      const q = e.prop[i];
      if (!q || q.o !== dueno) return 'Propiedad no válida';
      const g = CASILLAS[i].grupo; if (g != null && POR_GRUPO[g].some((k) => e.prop[k].c > 0)) return 'Hay edificios en ' + GRUPOS[g].nombre;
    }
  }
  const interes = (rec, props) => props.reduce((s, i) => s + (e.prop[i].h ? Math.ceil(valorHipoteca(e, i) * 0.1) : 0), 0);
  if (e.jug[t.de].din - t.ofrece.din + t.pide.din < interes(0, t.pide.props)) return 'No alcanza para el interés de hipotecas';
  if (e.jug[t.a].din - t.pide.din + t.ofrece.din < interes(0, t.ofrece.props)) return 'No alcanza para el interés de hipotecas';
  return '';
}
function ejecutarTrato(e, t) {
  const mover = (de, a, o) => {
    mueve(e, de, a, o.din);
    for (const i of o.props) { e.prop[i].o = a; if (e.prop[i].h) { const f = Math.ceil(valorHipoteca(e, i) * 0.1); mueve(e, a, BANCO, f); } }
    for (let n = 0; n < o.tarj; n++) e.jug[a].tarj.push(e.jug[de].tarj.shift());
  };
  mover(t.de, t.a, t.ofrece); mover(t.a, t.de, t.pide);
  reg(e, 'Trato cerrado entre ' + nom(e, t.de) + ' y ' + nom(e, t.a) + '.'); EV.push({ t: 'trato', de: t.de, a: t.a });
}

/* ---------- bancarrota ---------- */
function quebrar(e, j, acreedor) {
  const p = e.jug[j];
  reg(e, nom(e, j) + ' se declara en bancarrota' + (acreedor >= 0 ? ' ante ' + nom(e, acreedor) : '') + '.');
  EV.push({ t: 'quiebra', j, a: acreedor });
  const mis = propsDe(e, j);
  for (const i of mis) {
    const q = e.prop[i], c = CASILLAS[i];
    if (q.c > 0) {
      const g = GRUPOS[c.grupo].casa;
      if (q.c === 5) e.hotelesBanco++; else e.casasBanco += q.c;
      mueve(e, BANCO, j, Math.floor(g / 2) * q.c); q.c = 0;
    }
  }
  if (acreedor >= 0) {
    mueve(e, j, acreedor, p.din);
    for (const i of mis) { e.prop[i].o = acreedor; if (e.prop[i].h) mueve(e, acreedor, BANCO, Math.min(e.jug[acreedor].din, Math.ceil(valorHipoteca(e, i) * 0.1))); }
    e.jug[acreedor].tarj.push(...p.tarj);
  } else {
    mueve(e, j, BANCO, p.din);
    for (const i of mis) { e.prop[i].o = -1; e.prop[i].h = false; }
    p.tarj.forEach((k) => e.mazos[k].push(k === 's' ? SUERTE.findIndex((c) => c.ef.t === 'tarjeta') : COMUNIDAD.findIndex((c) => c.ef.t === 'tarjeta')));
  }
  p.tarj = []; p.quebrado = true; p.din = 0; p.carcel = false;
  if (e.trato && (e.trato.de === j || e.trato.a === j)) e.trato = null;
  if (e.turno === j) e.deuda = null;
  if (activos(e).length <= 1) return termino(e, 'ultimo');
  if (e.turno === j) pasarTurno(e);
}

/* ---------- aplicar accion ---------- */
const NO = (error) => ({ ok: false, error });

export function aplicar(e, j, acc) {
  EV = [];
  const r = ejecutar(e, j, acc || {});
  if (r) return r;
  e.seq++;
  return { ok: true, ev: EV };
}

function ejecutar(e, j, a) {
  const p = e.jug[j];
  if (!p || p.quebrado) return NO('Jugador no válido');
  if (e.fase === 'fin_partida') return NO('La partida terminó');
  if ('i' in a && !(Number.isInteger(a.i) && e.prop[a.i])) return NO('Casilla no válida');
  const miTurno = e.turno === j;
  const t = a.t;
  const reposo = e.fase === 'tirar' || e.fase === 'fin';
  switch (t) {
    case 'tirar': {
      if (!miTurno || e.fase !== 'tirar') return NO('No puedes tirar ahora');
      const d1 = 1 + Math.floor(rnd(e) * 6), d2 = 1 + Math.floor(rnd(e) * 6), dbl = d1 === d2;
      e.dados = [d1, d2]; e.extra = dbl && !p.carcel; EV.push({ t: 'dados', j, d: [d1, d2] });
      reg(e, nom(e, j) + ' saca ' + d1 + ' y ' + d2 + (dbl ? ' (dobles)' : '') + '.');
      if (p.carcel) {
        if (dbl) { p.carcel = false; p.intentos = 0; reg(e, nom(e, j) + ' sale de la cárcel con dobles.'); avanzar(e, j, d1 + d2); if (aterrizar(e, j)) siguienteFase(e); return null; }
        p.intentos++;
        if (p.intentos >= 3) {
          p.carcel = false; p.intentos = 0; reg(e, nom(e, j) + ' paga la fianza obligatoria.');
          e.mov = d1 + d2;
          if (cobrar(e, j, e.cfg.multaCarcel, destMulta(e), 'fianza')) reanudar(e);
        } else e.fase = 'fin';
        return null;
      }
      if (dbl) { e.dobles++; if (e.dobles >= 3) { reg(e, nom(e, j) + ' sacó tres dobles seguidos.'); enviarCarcel(e, j); e.fase = 'fin'; return null; } }
      avanzar(e, j, d1 + d2);
      if (aterrizar(e, j)) siguienteFase(e);
      return null;
    }
    case 'comprar': {
      if (!miTurno || e.fase !== 'compra') return NO('No hay compra pendiente');
      const i = p.pos, c = CASILLAS[i];
      if (p.din < c.precio) return NO('No te alcanza');
      mueve(e, j, BANCO, c.precio); e.prop[i].o = j; EV.push({ t: 'compra', j, i, m: c.precio });
      reg(e, nom(e, j) + ' compra ' + c.nombre + ' por ' + c.precio + '.'); siguienteFase(e); return null;
    }
    case 'noComprar': {
      if (!miTurno || e.fase !== 'compra') return NO('No hay compra pendiente');
      if (e.cfg.subastaObligatoria) iniciarSubasta(e, p.pos); else siguienteFase(e);
      return null;
    }
    case 'pujar': {
      const s = e.subasta;
      if (e.fase !== 'subasta' || s.turnoPuja !== j) return NO('No es tu puja');
      const m = Math.floor(+a.m);
      if (!(m > s.monto) || m > p.din) return NO('Puja no válida');
      s.monto = m; s.lider = j; EV.push({ t: 'puja', j, m }); reg(e, nom(e, j) + ' puja ' + m + '.');
      avanzaSubasta(e, j); return null;
    }
    case 'pasarPuja': {
      const s = e.subasta;
      if (e.fase !== 'subasta' || s.turnoPuja !== j) return NO('No es tu puja');
      s.pasaron.push(j); avanzaSubasta(e, j); return null;
    }
    case 'construir': {
      if (!miTurno || !reposo) return NO('Solo en tu turno');
      const m = puedeConstruir(e, j, a.i); if (m) return NO(m);
      const q = e.prop[a.i], costo = GRUPOS[CASILLAS[a.i].grupo].casa;
      if (q.c < 4) e.casasBanco--; else { e.casasBanco += 4; e.hotelesBanco--; }
      mueve(e, j, BANCO, costo); q.c++; EV.push({ t: 'construir', j, i: a.i, c: q.c });
      reg(e, nom(e, j) + ' construye en ' + CASILLAS[a.i].nombre + (q.c === 5 ? ' (hotel).' : '.')); return null;
    }
    case 'vender': {
      if (!miTurno || !(reposo || e.fase === 'deuda')) return NO('Solo en tu turno');
      const m = puedeVender(e, j, a.i); if (m) return NO(m);
      const q = e.prop[a.i], costo = GRUPOS[CASILLAS[a.i].grupo].casa;
      if (q.c === 5) { e.hotelesBanco++; const k = Math.min(4, e.casasBanco); e.casasBanco -= k; q.c = k; } else { e.casasBanco++; q.c--; }
      mueve(e, BANCO, j, Math.floor(costo / 2)); EV.push({ t: 'construir', j, i: a.i, c: q.c, vende: true });
      reg(e, nom(e, j) + ' vende un edificio en ' + CASILLAS[a.i].nombre + '.'); return null;
    }
    case 'hipotecar': {
      if (!miTurno || !(reposo || e.fase === 'deuda' || e.fase === 'compra')) return NO('Solo en tu turno');
      const m = puedeHipotecar(e, j, a.i); if (m) return NO(m);
      e.prop[a.i].h = true; mueve(e, BANCO, j, valorHipoteca(e, a.i)); EV.push({ t: 'hipoteca', j, i: a.i, h: true });
      reg(e, nom(e, j) + ' hipoteca ' + CASILLAS[a.i].nombre + '.'); return null;
    }
    case 'deshipotecar': {
      if (!miTurno || !(reposo || e.fase === 'deuda' || e.fase === 'compra')) return NO('Solo en tu turno');
      const m = puedeDeshipotecar(e, j, a.i); if (m) return NO(m);
      mueve(e, j, BANCO, costoDeshipoteca(e, a.i)); e.prop[a.i].h = false; EV.push({ t: 'hipoteca', j, i: a.i, h: false });
      reg(e, nom(e, j) + ' levanta la hipoteca de ' + CASILLAS[a.i].nombre + '.'); return null;
    }
    case 'pagarDeuda': {
      if (!miTurno || e.fase !== 'deuda') return NO('No hay deuda');
      const d = e.deuda;
      if (p.din < d.monto) return NO('No te alcanza');
      if (d.a === TODOS) activos(e).filter((k) => k !== j).forEach((k) => mueve(e, j, k, d.cada)); else mueve(e, j, d.a, d.monto);
      e.deuda = null; reg(e, nom(e, j) + ' salda su deuda.'); reanudar(e); return null;
    }
    case 'quiebra': {
      if (e.fase === 'subasta') return NO('Espera a que termine la subasta');
      if (e.fase === 'deuda' && !miTurno) return NO('No es tu deuda');
      const ac = e.fase === 'deuda' && e.deuda && e.deuda.a >= 0 ? e.deuda.a : -1;
      quebrar(e, j, miTurno ? ac : -1); return null;
    }
    case 'pagarCarcel': {
      if (!miTurno || e.fase !== 'tirar' || !p.carcel) return NO('No estás en la cárcel');
      if (p.din < e.cfg.multaCarcel) return NO('No te alcanza');
      mueve(e, j, destMulta(e), e.cfg.multaCarcel); p.carcel = false; p.intentos = 0; reg(e, nom(e, j) + ' paga la fianza y sale.'); EV.push({ t: 'libre', j }); return null;
    }
    case 'tarjetaCarcel': {
      if (!miTurno || e.fase !== 'tirar' || !p.carcel || !p.tarj.length) return NO('No puedes usar la tarjeta');
      const k = p.tarj.shift(); e.mazos[k].push(k === 's' ? SUERTE.findIndex((c) => c.ef.t === 'tarjeta') : COMUNIDAD.findIndex((c) => c.ef.t === 'tarjeta'));
      p.carcel = false; p.intentos = 0; reg(e, nom(e, j) + ' usa su tarjeta y sale de la cárcel.'); EV.push({ t: 'libre', j }); return null;
    }
    case 'terminar': {
      if (!miTurno || e.fase !== 'fin') return NO('No puedes terminar el turno');
      pasarTurno(e); return null;
    }
    case 'tratoProponer': {
      if (e.fase === 'subasta') return NO('Hay una subasta en curso');
      if (e.trato) return NO('Ya hay un trato pendiente');
      const t2 = { de: j, a: Math.floor(+a.a), ofrece: lado(a.ofrece || {}), pide: lado(a.pide || {}) };
      const m = validarTrato(e, t2); if (m) return NO(m);
      t2.id = ++e.tratoN; e.trato = t2; p.ultTrato = e.turnoN; EV.push({ t: 'tratoNuevo', de: t2.de, a: t2.a });
      reg(e, nom(e, j) + ' propone un trato a ' + nom(e, t2.a) + '.'); return null;
    }
    case 'tratoResponder': {
      const t2 = e.trato;
      if (!t2 || t2.a !== j) return NO('No hay trato para ti');
      if (!a.ok) { e.trato = null; reg(e, nom(e, j) + ' rechaza el trato de ' + nom(e, t2.de) + '.'); EV.push({ t: 'tratoNo', de: t2.de, a: j }); return null; }
      if (e.fase === 'subasta') return NO('Hay una subasta en curso');
      const m = validarTrato(e, t2);
      if (m) { e.trato = null; reg(e, 'El trato ya no es válido: ' + m); return null; }
      e.trato = null; ejecutarTrato(e, t2); return null;
    }
    case 'tratoCancelar': {
      if (!e.trato || e.trato.de !== j) return NO('No tienes un trato');
      e.trato = null; reg(e, nom(e, j) + ' retira su trato.'); return null;
    }
    default: return NO('Acción desconocida');
  }
}

/* verificacion de integridad para pruebas y depuracion */
export function revisar(e) {
  const err = [];
  const suma = e.jug.reduce((s, p) => s + p.din, 0) + e.banco + e.bote;
  if (suma !== 0) err.push('dinero no conserva: ' + suma);
  e.jug.forEach((p) => { if (p.din < 0) err.push('dinero negativo ' + p.id); if (p.quebrado && (p.din || propsDe(e, p.id).length)) err.push('quebrado con bienes ' + p.id); });
  let casas = 0, hoteles = 0;
  for (let i = 0; i < NUM; i++) {
    const q = e.prop[i]; if (!q) continue;
    if (q.o < -1 || q.o >= e.jug.length || (q.o >= 0 && e.jug[q.o].quebrado)) err.push('dueño invalido ' + i);
    if (q.c < 0 || q.c > 5 || (q.c && CASILLAS[i].tipo !== 'prop')) err.push('edificios invalidos ' + i);
    if (q.c === 5) hoteles++; else casas += q.c;
    if (q.c && q.h) err.push('hipoteca con edificios ' + i);
    if (q.o === -1 && (q.h || q.c)) err.push('propiedad libre con estado ' + i);
    if (q.c && !grupoCompleto(e, CASILLAS[i].grupo, q.o)) err.push('edificio sin barrio ' + i);
  }
  if (casas + e.casasBanco !== MAX_CASAS) err.push('casas no cuadran ' + casas + '/' + e.casasBanco);
  if (hoteles + e.hotelesBanco !== MAX_HOTELES) err.push('hoteles no cuadran');
  if (e.cfg.construccionPareja) for (const g of POR_GRUPO) { const cs = g.map((i) => e.prop[i].c); if (Math.max(...cs) - Math.min(...cs) > 1) err.push('construccion despareja ' + cs); }
  const nt = e.jug.reduce((s, p) => s + p.tarj.length, 0);
  if (nt + e.mazos.s.length + e.mazos.c.length !== SUERTE.length + COMUNIDAD.length) err.push('cartas no cuadran');
  if (e.fase !== 'fin_partida') {
    if (e.jug[e.turno].quebrado) err.push('turno de quebrado');
    if (e.fase === 'deuda' && !e.deuda) err.push('deuda sin datos');
    if (e.fase === 'subasta' && !e.subasta) err.push('subasta sin datos');
  }
  return err;
}
