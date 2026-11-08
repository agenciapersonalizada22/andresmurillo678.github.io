// Motor de reglas de Turismo Mundial: puro y serializable (sin DOM). El anfitrion es la unica instancia que aplica acciones.
import { CASILLAS, CONTINENTES, POR_CONT, COMPRABLE, DESTINOS, TRANSPORTES, RENTA_TRANS, MODOS_RUTA, MAZOS, EVENTOS, TIPOS_EVENTO, REGLAS_BASE, BANCO, BOTE, TODOS, RETENCION, NUM, SELLO_PUNTOS } from './datos.js';

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
const idxPase = (k) => MAZOS[k].findIndex((c) => c.ef.t === 'pase');

export function clonar(e) { return JSON.parse(JSON.stringify(e)); }

export function crearPartida(cfgIn, asientos, semilla) {
  const cfg = Object.assign({}, REGLAS_BASE, cfgIn || {});
  const e = {
    v: 1, id: 't' + (semilla >>> 0).toString(36) + Math.floor(Math.random() * 1e6).toString(36), cfg, rng: (semilla >>> 0) || 1,
    jug: asientos.map((a, i) => ({ id: i, nombre: a.nombre, color: a.color, tipo: a.tipo || 'bot', nivel: a.nivel == null ? 1 : a.nivel, din: cfg.dineroInicial, pos: 0,
      ret: false, intentos: 0, tarj: [], quebrado: false, nTurnos: 0, sellos: [], contBono: [], rutas: { aire: 0, tren: 0, mar: 0 } })),
    prop: CASILLAS.map((c) => (COMPRABLE[c.i] ? { o: -1, c: 0, h: false } : null)),
    turno: 0, fase: 'tirar', dobles: 0, extra: false, dados: [0, 0], mov: 0, banco: 0, bote: 0,
    mazos: { v: [], a: [], s: [] }, subasta: null, deuda: null, eventos: [], ronda: 1, tiempoMs: 0, turnoN: 0, ganador: -1, motivoFin: '', ranking: [], log: [], seq: 0
  };
  e.banco = -e.jug.length * cfg.dineroInicial;
  Object.keys(MAZOS).forEach((k) => { e.mazos[k] = barajar(e, MAZOS[k].length); });
  e.turno = Math.floor(rnd(e) * e.jug.length);
  e.inicio = e.turno;
  return e;
}

/* ---------- consultas ---------- */
export const activos = (e) => e.jug.filter((p) => !p.quebrado).map((p) => p.id);
export const propsDe = (e, j) => { const r = []; for (let i = 0; i < NUM; i++) if (e.prop[i] && e.prop[i].o === j) r.push(i); return r; };
export const contCompleto = (e, g, j) => POR_CONT[g].every((i) => e.prop[i].o === j);
export const cuentaCont = (e, g, j) => POR_CONT[g].filter((i) => e.prop[i].o === j).length;
export const dominio = (e, g, j) => cuentaCont(e, g, j) >= e.cfg.dominio;
export const tieneVisa = (e, g, j) => POR_CONT[g].every((i) => e.jug[j].sellos.includes(i));
export const valorHipoteca = (e, i) => Math.floor(CASILLAS[i].precio * (e.cfg.hipotecaMitad ? 0.5 : 0.33));
export const costoDeshipoteca = (e, i) => Math.ceil(valorHipoteca(e, i) * 1.1);
export const costoEdif = (i) => CONTINENTES[CASILLAS[i].grupo].build;
export function patrimonio(e, j) {
  const p = e.jug[j]; if (p.quebrado) return 0;
  let t = p.din;
  for (const i of propsDe(e, j)) { const q = e.prop[i]; t += q.h ? valorHipoteca(e, i) : CASILLAS[i].precio; if (CASILLAS[i].tipo === 'dest') t += q.c * costoEdif(i); }
  return t;
}
export const puntos = (e, j) => patrimonio(e, j) + e.jug[j].sellos.length * SELLO_PUNTOS;
export function quienActua(e) {
  if (e.fase === 'fin_partida') return -1;
  return e.fase === 'subasta' ? e.subasta.turnoPuja : e.turno;
}
export const eventoActivo = (e, tipo, cont) => e.eventos.some((v) => v.tipo === tipo && (cont == null || v.cont === cont));
export const rutaBloqueada = (e, modo) => (modo === 'mar' ? eventoActivo(e, 'tormenta') : eventoActivo(e, 'huelga'));
export function multEvento(e, i) {
  const g = CASILLAS[i].grupo; let m = 1;
  if (eventoActivo(e, 'alta', g)) m *= 2;
  if (eventoActivo(e, 'baja', g)) m *= 0.5;
  return m;
}
export function calcularRenta(e, i, pagador) {
  const c = CASILLAS[i], q = e.prop[i], o = q.o;
  if (c.tipo === 'trans') return RENTA_TRANS[TRANSPORTES.filter((k) => e.prop[k].o === o).length];
  let r = q.c > 0 ? c.renta[q.c] : c.renta[0] * (dominio(e, c.grupo, o) ? 2 : 1);
  r = Math.round(r * multEvento(e, i));
  if (pagador != null && pagador >= 0 && e.cfg.visaDescuento && tieneVisa(e, c.grupo, pagador)) r = Math.round(r * 0.75);
  return Math.max(1, r);
}

/* rutas disponibles desde la casilla de transporte donde esta el jugador */
export function rutasDe(e, j) {
  const p = e.jug[j], c = CASILLAS[p.pos], q = e.prop[p.pos];
  if (c.tipo !== 'trans') return [];
  const M = MODOS_RUTA[c.modo], bloq = rutaBloqueada(e, c.modo);
  let costo = q.o === j ? M.dueno : M.tarifa;
  if (c.modo === 'aire' && eventoActivo(e, 'oferta')) costo = 0;
  const r = [];
  const add = (a) => r.push({ a, costo, modo: c.modo, bloq });
  if (c.modo === 'aire') CASILLAS.forEach((x) => { if ((x.tipo === 'dest' || x.tipo === 'trans') && x.i !== p.pos) add(x.i); });
  else if (c.modo === 'tren') for (let k = 1; k <= 12; k++) add((p.pos + k) % NUM);
  else TRANSPORTES.forEach((k) => { if (k !== p.pos && CASILLAS[k].modo === 'mar') add(k); });
  return r;
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
    if (p.pos === 0) { mueve(e, BANCO, j, e.cfg.sueldo); reg(e, nom(e, j) + ' pasa por la Salida y cobra ' + e.cfg.sueldo + '.'); }
  }
  EV.push({ t: 'mover', j, ruta });
}
function irA(e, j, dest) { avanzar(e, j, (dest - e.jug[j].pos + NUM) % NUM || NUM); }
function enviarRetencion(e, j) {
  const p = e.jug[j];
  p.pos = RETENCION; p.ret = true; p.intentos = 0; e.dobles = 0;
  EV.push({ t: 'salto', j, a: RETENCION, modo: 'retencion' }); reg(e, nom(e, j) + ' queda en retención aduanera.');
}

/* ---------- pasaporte ---------- */
function sello(e, j, i) {
  const p = e.jug[j];
  if (p.sellos.includes(i)) return;
  p.sellos.push(i);
  EV.push({ t: 'sello', j, i }); reg(e, nom(e, j) + ' sella su pasaporte en ' + CASILLAS[i].nombre + '.');
  mueve(e, BANCO, j, e.cfg.bonoSello);
  const g = CASILLAS[i].grupo;
  if (!p.contBono.includes(g) && tieneVisa(e, g, j)) {
    p.contBono.push(g); mueve(e, BANCO, j, e.cfg.bonoContinente);
    EV.push({ t: 'visa', j, g }); reg(e, nom(e, j) + ' completa ' + CONTINENTES[g].nombre + ': visa continental y bono de ' + e.cfg.bonoContinente + '.');
  }
  if (e.cfg.metaSellos > 0 && p.sellos.length >= e.cfg.metaSellos && e.fase !== 'fin_partida') termino(e, 'sellos', j);
}
function selloLibre(e, j) {
  const p = e.jug[j];
  const lst = DESTINOS.filter((i) => !p.sellos.includes(i)).sort((a, b) => ((a - p.pos + NUM) % NUM) - ((b - p.pos + NUM) % NUM));
  if (!lst.length) { mueve(e, BANCO, j, 50); return; }
  sello(e, j, lst[0]);
}

/* ---------- eventos globales ---------- */
function nuevoEvento(e, tipo, cont) {
  const d = EVENTOS[tipo];
  if (tipo === 'festival') { activos(e).forEach((k) => mueve(e, BANCO, k, 50)); }
  else { e.eventos = e.eventos.filter((v) => !(v.tipo === tipo && v.cont === cont)); e.eventos.push({ tipo, cont: cont == null ? -1 : cont, hasta: e.ronda + d.dur }); }
  const lugar = (tipo === 'alta' || tipo === 'baja') ? ' en ' + CONTINENTES[cont].nombre : '';
  EV.push({ t: 'evento', k: tipo, cont: cont == null ? -1 : cont });
  reg(e, d.icono + ' ' + d.nombre + lugar + '. ' + d.desc);
}
function eventoAzar(e) {
  const tipo = TIPOS_EVENTO[Math.floor(rnd(e) * TIPOS_EVENTO.length)];
  const cont = tipo === 'alta' || tipo === 'baja' ? Math.floor(rnd(e) * CONTINENTES.length) : null;
  nuevoEvento(e, tipo, cont);
}
function rondaNueva(e) {
  e.ronda++;
  e.eventos = e.eventos.filter((v) => v.hasta > e.ronda);
  if (e.cfg.eventos > 0 && e.ronda % e.cfg.eventos === 0) eventoAzar(e);
}

/* ---------- aterrizaje ---------- */
function ofrecerViaje(e, j) {
  const p = e.jug[j], rs = rutasDe(e, j).filter((r) => !r.bloq);
  if (!rs.length) return false;
  if (!(rs.some((r) => r.costo <= p.din) || p.tarj.length)) return false;
  e.fase = 'viaje'; return true;
}
function aterrizar(e, j, ctx) {
  const p = e.jug[j], c = CASILLAS[p.pos];
  switch (c.tipo) {
    case 'dest': case 'trans': {
      if (c.tipo === 'dest') { sello(e, j, p.pos); if (e.fase === 'fin_partida') return false; }
      const q = e.prop[p.pos];
      if (q.o === -1) { e.fase = 'compra'; return false; }
      if (q.o !== j && !q.h) {
        const m = calcularRenta(e, p.pos, j);
        EV.push({ t: 'renta', de: j, a: q.o, m, i: p.pos });
        reg(e, nom(e, j) + ' paga ' + m + ' a ' + nom(e, q.o) + ' (' + c.nombre + ').');
        if (!cobrar(e, j, m, q.o, 'alojamiento')) return false;
      }
      if (c.tipo === 'trans' && !(ctx && ctx.viaje) && ofrecerViaje(e, j)) return false;
      return true;
    }
    case 'viaje': return sacarCarta(e, j, 'v');
    case 'aduana': return sacarCarta(e, j, 'a');
    case 'suerte': return sacarCarta(e, j, 's');
    case 'impuesto': reg(e, nom(e, j) + ' paga ' + c.nombre + ' (' + c.monto + ').'); return cobrar(e, j, c.monto, destMulta(e), 'impuesto');
    case 'libre':
      if (e.cfg.bote && e.bote > 0) { reg(e, nom(e, j) + ' se lleva el bote de la zona franca: ' + e.bote + '.'); mueve(e, BOTE, j, e.bote); }
      return true;
    default: return true;
  }
}

function sacarCarta(e, j, k) {
  const cola = e.mazos[k], idx = cola.shift(), carta = MAZOS[k][idx], ef = carta.ef, p = e.jug[j];
  EV.push({ t: 'carta', j, k, x: carta.x });
  reg(e, nom(e, j) + ' roba ' + (k === 'v' ? 'Viaje' : k === 'a' ? 'Aduana' : 'Suerte') + ': ' + carta.x);
  if (ef.t === 'pase') { p.tarj.push(k); return true; }
  cola.push(idx);
  switch (ef.t) {
    case 'cobrar': mueve(e, BANCO, j, ef.n); return true;
    case 'pagar': return cobrar(e, j, ef.n, destMulta(e), 'carta');
    case 'ir': irA(e, j, ef.a); return aterrizar(e, j);
    case 'irTrans': {
      const lst = TRANSPORTES.filter((x) => !ef.k || CASILLAS[x].modo === ef.k);
      let d = lst.find((x) => x > p.pos); if (d == null) d = lst[0];
      irA(e, j, d); return aterrizar(e, j);
    }
    case 'atras': {
      const ruta = []; for (let n = 0; n < ef.n; n++) { p.pos = (p.pos + NUM - 1) % NUM; ruta.push(p.pos); }
      EV.push({ t: 'mover', j, ruta, atras: true }); return aterrizar(e, j);
    }
    case 'retencion': enviarRetencion(e, j); return true;
    case 'reparar': {
      let m = 0; for (const i of propsDe(e, j)) { const c = e.prop[i].c; m += c === 4 ? ef.hotel : c * ef.casa; }
      return cobrar(e, j, m, destMulta(e), 'reparaciones');
    }
    case 'deTodos': activos(e).filter((x) => x !== j).forEach((x) => mueve(e, x, j, Math.min(ef.n, e.jug[x].din))); return true;
    case 'aTodos': return cobrar(e, j, ef.n, TODOS, 'carta');
    case 'sello': selloLibre(e, j); return e.fase !== 'fin_partida';
    case 'evento': {
      const g = CASILLAS[p.pos].grupo;
      if (ef.k === 'alta') nuevoEvento(e, 'alta', g != null ? g : Math.floor(rnd(e) * CONTINENTES.length)); else nuevoEvento(e, ef.k, null);
      return true;
    }
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
  e.fase = e.extra && !p.ret ? 'tirar' : 'fin';
}
export function terminarPartida(e, motivo) { EV = []; termino(e, motivo); e.seq++; return EV; }
export function termino(e, motivo, fijo) {
  e.ranking = e.jug.map((p) => ({ id: p.id, pat: patrimonio(e, p.id), sellos: p.sellos.length, pts: puntos(e, p.id), quebrado: p.quebrado }))
    .sort((a, b) => (a.quebrado - b.quebrado) || (b.pts - a.pts) || (b.sellos - a.sellos));
  e.ganador = fijo != null && fijo >= 0 ? fijo : e.ranking[0].id;
  e.fase = 'fin_partida'; e.motivoFin = motivo; e.deuda = null; e.subasta = null;
  reg(e, 'Fin de la partida: gana ' + nom(e, e.ganador) + ({ tiempo: ' por patrimonio y sellos.', sellos: ' al completar su pasaporte.' }[motivo] || '.'));
  EV.push({ t: 'fin', ganador: e.ganador });
}
function pasarTurno(e) {
  const n = e.jug.length, ant = e.turno;
  e.jug[ant].nTurnos++; e.turnoN++;
  if (activos(e).length <= 1) return termino(e, 'ultimo');
  let k = ant; do { k = (k + 1) % n; } while (e.jug[k].quebrado);
  if (k <= ant) {
    if ((e.cfg.limiteMin > 0 && e.tiempoMs >= e.cfg.limiteMin * 60000) || (e.cfg.limiteRondas > 0 && e.ronda >= e.cfg.limiteRondas)) return termino(e, 'tiempo');
    rondaNueva(e);
    if (e.fase === 'fin_partida') return;
  }
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
  if (c.tipo !== 'dest' || q.o !== j) return 'No es tuyo';
  if (!dominio(e, c.grupo, j)) return 'Necesitas ' + e.cfg.dominio + ' destinos del continente';
  const g = POR_CONT[c.grupo].filter((k) => e.prop[k].o === j);
  if (g.some((k) => e.prop[k].h)) return 'Hay hipotecas en el continente';
  if (q.c >= 4) return 'Ya tiene hotel';
  if (e.cfg.construccionPareja && g.some((k) => e.prop[k].c < q.c)) return 'Construye parejo';
  if (p.din < costoEdif(i)) return 'No te alcanza';
  return '';
}
export function puedeVender(e, j, i) {
  const c = CASILLAS[i], q = e.prop[i];
  if (c.tipo !== 'dest' || q.o !== j || q.c < 1) return 'No hay edificios';
  if (e.cfg.construccionPareja && POR_CONT[c.grupo].some((k) => e.prop[k].o === j && e.prop[k].c > q.c)) return 'Vende parejo';
  return '';
}
export function puedeHipotecar(e, j, i) {
  const q = e.prop[i];
  if (!q || q.o !== j) return 'No es tuyo';
  if (q.h) return 'Ya hipotecado';
  const g = CASILLAS[i].grupo;
  if (g != null && POR_CONT[g].some((k) => e.prop[k].o === j && e.prop[k].c > 0)) return 'Vende los edificios del continente';
  return '';
}
export function puedeDeshipotecar(e, j, i) {
  const q = e.prop[i];
  if (!q || q.o !== j) return 'No es tuyo';
  if (!q.h) return 'No está hipotecado';
  if (e.jug[j].din < costoDeshipoteca(e, i)) return 'No te alcanza';
  return '';
}

/* ---------- bancarrota ---------- */
function quebrar(e, j, acreedor) {
  const p = e.jug[j];
  reg(e, nom(e, j) + ' se declara en bancarrota' + (acreedor >= 0 ? ' ante ' + nom(e, acreedor) : '') + '.');
  EV.push({ t: 'quiebra', j, a: acreedor });
  const mis = propsDe(e, j);
  for (const i of mis) {
    const q = e.prop[i];
    if (q.c > 0) { mueve(e, BANCO, j, Math.floor(costoEdif(i) / 2) * q.c); q.c = 0; }
  }
  if (acreedor >= 0) {
    mueve(e, j, acreedor, p.din);
    for (const i of mis) { e.prop[i].o = acreedor; if (e.prop[i].h) mueve(e, acreedor, BANCO, Math.min(e.jug[acreedor].din, Math.ceil(valorHipoteca(e, i) * 0.1))); }
    e.jug[acreedor].tarj.push(...p.tarj);
  } else {
    mueve(e, j, BANCO, p.din);
    for (const i of mis) { e.prop[i].o = -1; e.prop[i].h = false; }
    p.tarj.forEach((k) => e.mazos[k].push(idxPase(k)));
  }
  p.tarj = []; p.quebrado = true; p.din = 0; p.ret = false;
  if (e.turno === j) e.deuda = null;
  if (activos(e).length <= 1) return termino(e, 'ultimo');
  if (e.turno === j) pasarTurno(e);
}
function gastarPase(e, j) {
  const p = e.jug[j], k = p.tarj.shift();
  e.mazos[k].push(idxPase(k));
  return k;
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
  const reposo = e.fase === 'tirar' || e.fase === 'fin';
  switch (a.t) {
    case 'tirar': {
      if (!miTurno || e.fase !== 'tirar') return NO('No puedes tirar ahora');
      const d1 = 1 + Math.floor(rnd(e) * 6), d2 = 1 + Math.floor(rnd(e) * 6), dbl = d1 === d2;
      e.dados = [d1, d2]; e.extra = dbl && !p.ret; EV.push({ t: 'dados', j, d: [d1, d2] });
      reg(e, nom(e, j) + ' saca ' + d1 + ' y ' + d2 + (dbl ? ' (dobles)' : '') + '.');
      if (p.ret) {
        if (dbl) { p.ret = false; p.intentos = 0; reg(e, nom(e, j) + ' sale de la retención con dobles.'); EV.push({ t: 'libre', j }); avanzar(e, j, d1 + d2); if (aterrizar(e, j)) siguienteFase(e); return null; }
        p.intentos++;
        if (p.intentos >= 3) {
          p.ret = false; p.intentos = 0; reg(e, nom(e, j) + ' paga la fianza obligatoria.');
          e.mov = d1 + d2;
          if (cobrar(e, j, e.cfg.fianza, destMulta(e), 'fianza')) reanudar(e);
        } else e.fase = 'fin';
        return null;
      }
      if (dbl) { e.dobles++; if (e.dobles >= 3) { reg(e, nom(e, j) + ' sacó tres dobles seguidos: sobreventa de vuelos.'); enviarRetencion(e, j); e.fase = 'fin'; return null; } }
      avanzar(e, j, d1 + d2);
      if (aterrizar(e, j)) siguienteFase(e);
      return null;
    }
    case 'comprar': {
      if (!miTurno || e.fase !== 'compra') return NO('No hay compra pendiente');
      const i = p.pos, c = CASILLAS[i];
      if (p.din < c.precio) return NO('No te alcanza');
      mueve(e, j, BANCO, c.precio); e.prop[i].o = j; EV.push({ t: 'compra', j, i, m: c.precio });
      reg(e, nom(e, j) + ' compra ' + c.nombre + ' por ' + c.precio + '.');
      if (c.tipo === 'trans' && ofrecerViaje(e, j)) return null;
      siguienteFase(e); return null;
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
    case 'viajar': {
      if (!miTurno || e.fase !== 'viaje') return NO('No hay ruta disponible');
      const r = rutasDe(e, j).find((x) => x.a === a.a);
      if (!r) return NO('Ruta no válida');
      if (r.bloq) return NO('Ruta cerrada por un evento');
      const usaPase = !!a.pase && p.tarj.length > 0 && r.costo > 0;
      if (!usaPase && p.din < r.costo) return NO('No te alcanza');
      if (usaPase) { gastarPase(e, j); reg(e, nom(e, j) + ' usa un pase de vuelo.'); } else mueve(e, j, BANCO, r.costo);
      p.rutas[r.modo]++;
      reg(e, nom(e, j) + ' viaja en ' + MODOS_RUTA[r.modo].nombre.toLowerCase() + ' a ' + CASILLAS[r.a].nombre + '.');
      EV.push({ t: 'ruta', j, modo: r.modo, de: p.pos, a: r.a });
      if (r.modo === 'tren') { avanzar(e, j, (r.a - p.pos + NUM) % NUM); } else { p.pos = r.a; EV.push({ t: 'salto', j, a: r.a, modo: r.modo }); }
      e.fase = 'tirar';
      if (aterrizar(e, j, { viaje: true })) siguienteFase(e);
      return null;
    }
    case 'noViajar': {
      if (!miTurno || e.fase !== 'viaje') return NO('No hay ruta pendiente');
      siguienteFase(e); return null;
    }
    case 'construir': {
      if (!miTurno || !reposo) return NO('Solo en tu turno');
      const m = puedeConstruir(e, j, a.i); if (m) return NO(m);
      const q = e.prop[a.i];
      mueve(e, j, BANCO, costoEdif(a.i)); q.c++; EV.push({ t: 'construir', j, i: a.i, c: q.c });
      reg(e, nom(e, j) + ' construye en ' + CASILLAS[a.i].nombre + (q.c === 4 ? ' (hotel resort).' : ' (' + ['', 'museo', 'parque temático', 'estadio'][q.c] + ').')); return null;
    }
    case 'vender': {
      if (!miTurno || !(reposo || e.fase === 'deuda')) return NO('Solo en tu turno');
      const m = puedeVender(e, j, a.i); if (m) return NO(m);
      const q = e.prop[a.i]; q.c--;
      mueve(e, BANCO, j, Math.floor(costoEdif(a.i) / 2)); EV.push({ t: 'construir', j, i: a.i, c: q.c, vende: true });
      reg(e, nom(e, j) + ' vende un edificio en ' + CASILLAS[a.i].nombre + '.'); return null;
    }
    case 'hipotecar': {
      if (!miTurno || !(reposo || e.fase === 'deuda' || e.fase === 'compra' || e.fase === 'viaje')) return NO('Solo en tu turno');
      const m = puedeHipotecar(e, j, a.i); if (m) return NO(m);
      e.prop[a.i].h = true; mueve(e, BANCO, j, valorHipoteca(e, a.i)); EV.push({ t: 'hipoteca', j, i: a.i, h: true });
      reg(e, nom(e, j) + ' hipoteca ' + CASILLAS[a.i].nombre + '.'); return null;
    }
    case 'deshipotecar': {
      if (!miTurno || !(reposo || e.fase === 'deuda' || e.fase === 'compra' || e.fase === 'viaje')) return NO('Solo en tu turno');
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
    case 'pagarRetencion': {
      if (!miTurno || e.fase !== 'tirar' || !p.ret) return NO('No estás en retención');
      if (p.din < e.cfg.fianza) return NO('No te alcanza');
      mueve(e, j, destMulta(e), e.cfg.fianza); p.ret = false; p.intentos = 0; reg(e, nom(e, j) + ' paga la fianza y sale.'); EV.push({ t: 'libre', j }); return null;
    }
    case 'usarPase': {
      if (!miTurno || e.fase !== 'tirar' || !p.ret || !p.tarj.length) return NO('No puedes usar el pase');
      gastarPase(e, j); p.ret = false; p.intentos = 0; reg(e, nom(e, j) + ' usa su pase y sale de la retención.'); EV.push({ t: 'libre', j }); return null;
    }
    case 'terminar': {
      if (!miTurno || e.fase !== 'fin') return NO('No puedes terminar el turno');
      pasarTurno(e); return null;
    }
    default: return NO('Acción desconocida');
  }
}

/* verificacion de integridad para pruebas y depuracion */
export function revisar(e) {
  const err = [];
  const suma = e.jug.reduce((s, p) => s + p.din, 0) + e.banco + e.bote;
  if (suma !== 0) err.push('dinero no conserva: ' + suma);
  e.jug.forEach((p) => {
    if (p.din < 0) err.push('dinero negativo ' + p.id);
    if (p.quebrado && (p.din || propsDe(e, p.id).length)) err.push('quebrado con bienes ' + p.id);
    if (new Set(p.sellos).size !== p.sellos.length || p.sellos.some((i) => !DESTINOS.includes(i))) err.push('sellos invalidos ' + p.id);
    p.contBono.forEach((g) => { if (!tieneVisa(e, g, p.id)) err.push('bono de continente sin sellos ' + p.id); });
  });
  for (let i = 0; i < NUM; i++) {
    const q = e.prop[i]; if (!q) continue;
    if (q.o < -1 || q.o >= e.jug.length || (q.o >= 0 && e.jug[q.o].quebrado)) err.push('dueño invalido ' + i);
    if (q.c < 0 || q.c > 4 || (q.c && CASILLAS[i].tipo !== 'dest')) err.push('edificios invalidos ' + i);
    if (q.c && q.h) err.push('hipoteca con edificios ' + i);
    if (q.o === -1 && (q.h || q.c)) err.push('propiedad libre con estado ' + i);
    if (q.c && !dominio(e, CASILLAS[i].grupo, q.o)) err.push('edificio sin dominio ' + i);
  }
  const total = Object.keys(MAZOS).reduce((s, k) => s + MAZOS[k].length, 0);
  const nt = e.jug.reduce((s, p) => s + p.tarj.length, 0);
  if (nt + e.mazos.v.length + e.mazos.a.length + e.mazos.s.length !== total) err.push('cartas no cuadran');
  if (e.ronda < 1) err.push('ronda invalida');
  e.eventos.forEach((v) => { if (!EVENTOS[v.tipo] || v.hasta <= e.ronda - 1) err.push('evento invalido ' + v.tipo); });
  if (e.fase !== 'fin_partida') {
    if (e.jug[e.turno].quebrado) err.push('turno de quebrado');
    if (e.fase === 'deuda' && !e.deuda) err.push('deuda sin datos');
    if (e.fase === 'subasta' && !e.subasta) err.push('subasta sin datos');
    if (e.fase === 'viaje' && CASILLAS[e.jug[e.turno].pos].tipo !== 'trans') err.push('viaje fuera de transporte');
  }
  return err;
}
