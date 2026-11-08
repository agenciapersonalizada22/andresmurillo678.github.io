// Motor de reglas puro (sin DOM): estado serializable, ordenes validadas, dados, cartas, objetivos y victoria.
import { N, ADY, DE_CONT, CONTINENTES, SIMBOLO } from './mapa.js';

export const MODOS = [
  { id: 'dominacion', nombre: 'Dominación', desc: 'Elimina a todos tus rivales.' },
  { id: 'misiones', nombre: 'Misiones secretas', desc: 'Cumple tu objetivo secreto antes que nadie.' },
  { id: 'rapido', nombre: 'Rápido', desc: 'Despliegue automático; gana quien controle el 60 % del mundo (83 % con 2 jugadores).' },
  { id: 'equipos', nombre: 'Equipos', desc: 'Dos bandos: gana el equipo que quede en pie.' }
];
export const CFG_BASE = { modo: 'dominacion', objetivos: false, tiempo: 0, rondaMax: 0, lote: 3, nEquipos: 2 };
export const EJERCITOS_INICIALES = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };
export const VALOR_CANJE = [4, 6, 8, 10, 12, 15];
export const valorCanje = (k) => (k < VALOR_CANJE.length ? VALOR_CANJE[k] : 15 + 5 * (k - 5));
export const COMODIN = 100;
export const META_RAPIDO = Math.ceil(N * 0.6);
export const metaRapido = (n) => (n <= 2 ? 40 : META_RAPIDO);

/* ---------- aleatorio sembrado ---------- */
export function rnd(est) {
  est.rng = (est.rng + 0x6d2b79f5) >>> 0;
  let t = est.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (est, n) => Math.floor(rnd(est) * n);
function mezclar(est, a) { for (let i = a.length - 1; i > 0; i--) { const j = entero(est, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const dado = (est) => 1 + entero(est, 6);

/* ---------- probabilidades exactas ---------- */
const memoRonda = {};
// Distribucion de bajas de una ronda: lista [bajasAtacante, bajasDefensor, prob] para a dados de ataque y d de defensa.
export function distRonda(a, d) {
  const k = a + ',' + d;
  if (memoRonda[k]) return memoRonda[k];
  const cuenta = {}, total = Math.pow(6, a + d);
  const ds = [];
  for (let i = 0; i < total; i++) {
    let x = i; const ra = [], rd = [];
    for (let q = 0; q < a; q++) { ra.push(1 + (x % 6)); x = Math.floor(x / 6); }
    for (let q = 0; q < d; q++) { rd.push(1 + (x % 6)); x = Math.floor(x / 6); }
    ra.sort((u, v) => v - u); rd.sort((u, v) => v - u);
    let ba = 0, bd = 0;
    for (let q = 0; q < Math.min(a, d); q++) { if (ra[q] > rd[q]) bd++; else ba++; }
    const kk = ba + ',' + bd; cuenta[kk] = (cuenta[kk] || 0) + 1;
  }
  for (const kk of Object.keys(cuenta)) { const [ba, bd] = kk.split(',').map(Number); ds.push([ba, bd, cuenta[kk] / total]); }
  return (memoRonda[k] = ds);
}
const memoConq = new Map();
// Probabilidad de eliminar d defensores con a atacantes utilizables (ejercitos - 1).
export function probConquista(a, d) {
  if (d <= 0) return 1;
  if (a <= 0) return 0;
  const k = a * 1000 + d, m = memoConq.get(k);
  if (m != null) return m;
  let p = 0;
  for (const [ba, bd, pr] of distRonda(Math.min(3, a), Math.min(2, d))) p += pr * probConquista(a - ba, d - bd);
  memoConq.set(k, p); return p;
}

/* ---------- utilidades de estado ---------- */
export const equipoDe = (est, j) => est.jug[j].equipo;
export const aliados = (est, a, b) => a === b || (est.cfg.modo === 'equipos' && est.jug[a].equipo === est.jug[b].equipo);
export const territoriosDe = (est, j) => { const r = []; for (let i = 0; i < N; i++) if (est.o[i] === j) r.push(i); return r; };
export const contarTerr = (est, j) => { let c = 0; for (let i = 0; i < N; i++) if (est.o[i] === j) c++; return c; };
export const totalEjercitos = (est, j) => { let c = 0; for (let i = 0; i < N; i++) if (est.o[i] === j) c += est.e[i]; return c; };
export const vivos = (est) => est.jug.map((_, i) => i).filter((i) => est.jug[i].vivo);
export function continentesDe(est, j) {
  const r = [];
  DE_CONT.forEach((ts, ci) => { if (ts.every((t) => est.o[t] === j)) r.push(ci); });
  return r;
}
export function refuerzoBase(est, j) {
  const t = contarTerr(est, j);
  let b = Math.max(3, Math.floor(t / 3));
  for (const ci of continentesDe(est, j)) b += CONTINENTES[ci].bono;
  return b;
}
export const faseActual = (est) => est.fase;

/* ---------- cartas ---------- */
export const simboloCarta = (c) => (c >= COMODIN ? 3 : SIMBOLO[c]);
export function esConjunto(cs) {
  if (cs.length !== 3 || new Set(cs).size !== 3) return false;
  const s = cs.map(simboloCarta), com = s.filter((x) => x === 3).length;
  if (com >= 2) return false;
  if (com === 1) return true;
  const u = new Set(s);
  return u.size === 1 || u.size === 3;
}
export function mejorConjunto(est, j) {
  const m = est.jug[j].cartas, n = m.length;
  let mejor = null, pt = -1e9;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) {
    const cs = [m[a], m[b], m[c]];
    if (!esConjunto(cs)) continue;
    const bono = cs.filter((x) => x < COMODIN && est.o[x] === j).length;
    const sc = bono * 10 - cs.filter((x) => x >= COMODIN).length * 3;
    if (sc > pt) { pt = sc; mejor = cs; }
  }
  return mejor;
}

/* ---------- objetivos ---------- */
const PARES = [[0, 3], [4, 1], [4, 3], [0, 5], [2, 1], [2, 5]];
function generarObjetivos(est) {
  const n = est.n, obj = [];
  for (let j = 0; j < n; j++) {
    const r = entero(est, 7);
    if (r <= 2) { const p = PARES[entero(est, PARES.length)]; obj.push({ t: 'cont', c: p, mas: p[0] === 2 && entero(est, 2) === 0 }); }
    else if (r <= 4) {
      const otros = []; for (let k = 0; k < n; k++) if (k !== j && !aliados(est, j, k)) otros.push(k);
      obj.push(otros.length ? { t: 'elim', j: otros[entero(est, otros.length)] } : { t: 'terr', n: 24 });
    }
    else if (r === 5) obj.push({ t: 'terr', n: 24 });
    else obj.push({ t: 'terr2', n: 18, min: 2 });
  }
  return obj;
}
export function objetivoActivo(est, j) {
  const o = est.jug[j].obj;
  if (!o) return null;
  if (o.t === 'elim') { const x = est.jug[o.j]; if (!x.vivo && x.elimPor !== j) return { t: 'terr', n: 24, sustituto: true }; }
  return o;
}
export function textoObjetivo(est, o) {
  if (!o) return '';
  if (o.t === 'cont') return `Conquista ${CONTINENTES[o.c[0]].nombre} y ${CONTINENTES[o.c[1]].nombre}${o.mas ? ' y un tercer continente a tu elección' : ''}.`;
  if (o.t === 'elim') return `Elimina al jugador ${est.jug[o.j].nombre}.${''}`;
  if (o.t === 'terr') return `Controla ${o.n} territorios${o.sustituto ? ' (tu objetivo original ya no es posible)' : ''}.`;
  return `Controla ${o.n} territorios con al menos ${o.min} ejércitos cada uno.`;
}
export function progresoObjetivo(est, j) {
  const o = objetivoActivo(est, j);
  if (!o) return null;
  if (o.t === 'cont') { const c = continentesDe(est, j); return { hecho: o.c.filter((x) => c.includes(x)).length + (o.mas ? Math.min(1, Math.max(0, c.filter((x) => !o.c.includes(x)).length)) : 0), meta: 2 + (o.mas ? 1 : 0) }; }
  if (o.t === 'elim') return { hecho: est.jug[o.j].vivo ? 0 : 1, meta: 1 };
  if (o.t === 'terr') return { hecho: contarTerr(est, j), meta: o.n };
  let c = 0; for (let i = 0; i < N; i++) if (est.o[i] === j && est.e[i] >= o.min) c++;
  return { hecho: c, meta: o.n };
}
export function cumpleObjetivo(est, j) {
  const o = objetivoActivo(est, j);
  if (!o) return false;
  const p = progresoObjetivo(est, j);
  if (o.t === 'cont') return p.hecho >= p.meta;
  if (o.t === 'elim') return !est.jug[o.j].vivo && est.jug[o.j].elimPor === j;
  return p.hecho >= p.meta;
}

/* ---------- creacion ---------- */
// jugadores: [{nombre,color,tipo:'humano'|'bot',nivel?,token?}]
export function crear(cfgIn, jugadores, semilla) {
  const cfg = { ...CFG_BASE, ...cfgIn };
  if (cfg.modo === 'misiones') cfg.objetivos = true;
  const n = Math.max(2, Math.min(6, jugadores.length));
  const est = {
    v: 1, cfg, n, rng: semilla >>> 0, ronda: 1, fase: 'colocar', turno: 0, pool: 0, o: new Array(N).fill(-1), e: new Array(N).fill(1),
    reserva: [], mazo: [], descarte: [], canjes: 0, ganoCarta: false, conq: null, ganador: null, fortif: false, id: Math.floor(rnd({ rng: semilla >>> 0 }) * 1e9),
    jug: jugadores.slice(0, n).map((p, i) => ({ nombre: p.nombre, color: p.color, tipo: p.tipo, nivel: p.nivel == null ? 1 : p.nivel, token: p.token || '', equipo: cfg.modo === 'equipos' ? i % (cfg.nEquipos || 2) : i, vivo: true, cartas: [], obj: null, ausente: false, elimPor: -1, st: { conq: 0, elim: 0, bat: 0, ganadas: 0, cartas: 0 } }))
  };
  const orden = mezclar(est, Array.from({ length: N }, (_, i) => i));
  orden.forEach((t, k) => { est.o[t] = k % n; });
  const ini = EJERCITOS_INICIALES[n];
  for (let j = 0; j < n; j++) est.reserva[j] = Math.max(0, ini - contarTerr(est, j));
  est.mazo = mezclar(est, [...Array.from({ length: N }, (_, i) => i), COMODIN, COMODIN + 1]);
  if (cfg.objetivos && cfg.modo !== 'equipos') generarObjetivos(est).forEach((o, j) => { est.jug[j].obj = o; });
  est.turno = est.inicial = entero(est, n);
  if (cfg.modo === 'rapido') {
    for (let j = 0; j < n; j++) { const mias = territoriosDe(est, j); while (est.reserva[j] > 0) { est.e[mias[entero(est, mias.length)]]++; est.reserva[j]--; } }
    comenzarRefuerzo(est);
  } else est.pool = Math.min(cfg.lote, est.reserva[est.turno]);
  return est;
}

function comenzarRefuerzo(est) {
  est.fase = 'refuerzo'; est.pool = refuerzoBase(est, est.turno); est.ganoCarta = false; est.conq = null; est.fortif = false;
}

/* ---------- verificaciones ---------- */
function ganadorPorEstado(est) {
  const v = vivos(est);
  if (est.cfg.modo === 'equipos') {
    const eq = new Set(v.map((j) => est.jug[j].equipo));
    if (eq.size === 1) return { j: v[0], equipo: est.jug[v[0]].equipo, motivo: 'equipo' };
    return null;
  }
  if (v.length === 1) return { j: v[0], motivo: 'dominacion' };
  if (est.cfg.modo === 'rapido') for (const j of v) if (contarTerr(est, j) >= metaRapido(est.n)) return { j, motivo: 'rapido' };
  if (est.cfg.objetivos && est.cfg.modo !== 'equipos') for (const j of [est.turno, ...v]) if (est.jug[j].vivo && cumpleObjetivo(est, j)) return { j, motivo: 'mision' };
  return null;
}
function porRondaMax(est) {
  const v = vivos(est).sort((a, b) => contarTerr(est, b) - contarTerr(est, a) || totalEjercitos(est, b) - totalEjercitos(est, a));
  return { j: v[0], motivo: 'limite' };
}
function terminarPartida(est, g, evs) {
  est.ganador = g; est.fase = 'fin'; est.conq = null; est.pool = 0;
  for (const j of vivos(est)) if (est.jug[j].equipo === est.jug[g.j].equipo && (est.cfg.modo === 'equipos' || j === g.j)) est.jug[j].st.ganadas = 1;
  evs.push({ t: 'fin', j: g.j, motivo: g.motivo, equipo: g.equipo });
}

/* ---------- ordenes ---------- */
const err = (m) => ({ ok: false, error: m });
export function rutaPropia(est, j, d, h) {
  if (d === h) return true;
  const vis = new Set([d]), cola = [d];
  while (cola.length) {
    const x = cola.shift();
    for (const y of ADY[x]) { if (est.o[y] !== j || vis.has(y)) continue; if (y === h) return true; vis.add(y); cola.push(y); }
  }
  return false;
}
export function alcanzables(est, j, d) {
  const vis = new Set([d]), cola = [d];
  while (cola.length) { const x = cola.shift(); for (const y of ADY[x]) if (est.o[y] === j && !vis.has(y)) { vis.add(y); cola.push(y); } }
  vis.delete(d); return [...vis];
}
export const debeCanjear = (est, j) => est.jug[j].cartas.length >= 5;

function robarCarta(est, j, evs) {
  if (!est.mazo.length) { est.mazo = mezclar(est, est.descarte); est.descarte = []; }
  if (!est.mazo.length) return;
  const c = est.mazo.pop(); est.jug[j].cartas.push(c); est.jug[j].st.cartas++;
  evs.push({ t: 'carta', j });
}
function siguienteTurno(est, evs) {
  const g = ganadorPorEstado(est);
  if (g) return terminarPartida(est, g, evs);
  if (est.ganoCarta) robarCarta(est, est.turno, evs);
  let k = est.turno;
  do { k = (k + 1) % est.n; } while (!est.jug[k].vivo);
  if (k <= est.turno) est.ronda++;
  est.turno = k;
  if (est.cfg.rondaMax && est.ronda > est.cfg.rondaMax) return terminarPartida(est, porRondaMax(est), evs);
  comenzarRefuerzo(est);
  evs.push({ t: 'turno', j: k, ronda: est.ronda, pool: est.pool });
}
function avanzarColocacion(est, evs) {
  if (est.reserva.every((r, j) => r <= 0 || !est.jug[j].vivo)) { est.turno = est.inicial; comenzarRefuerzo(est); evs.push({ t: 'turno', j: est.turno, ronda: est.ronda, pool: est.pool }); return; }
  let k = est.turno;
  do { k = (k + 1) % est.n; } while (est.reserva[k] <= 0);
  est.turno = k; est.pool = Math.min(est.cfg.lote, est.reserva[k]);
  evs.push({ t: 'turnoColocar', j: k, pool: est.pool });
}

function rondaAtaque(est, d, h, dadosMax, evs) {
  const j = est.o[d], ja = est.o[d], jd = est.o[h];
  const na = Math.max(1, Math.min(3, est.e[d] - 1, dadosMax || 3)), nd = Math.min(2, est.e[h]);
  const ra = Array.from({ length: na }, () => dado(est)).sort((a, b) => b - a), rd = Array.from({ length: nd }, () => dado(est)).sort((a, b) => b - a);
  let pa = 0, pd = 0;
  for (let q = 0; q < Math.min(na, nd); q++) { if (ra[q] > rd[q]) pd++; else pa++; }
  est.e[d] -= pa; est.e[h] -= pd; est.jug[ja].st.bat++;
  evs.push({ t: 'bat', d, h, ja, jd, ad: ra, dd: rd, pa, pd });
  if (est.e[h] > 0) return { conquista: false };
  // conquista
  est.o[h] = j; est.e[h] = 0;
  est.jug[j].st.conq++; est.ganoCarta = true;
  evs.push({ t: 'conq', d, h, j, de: jd, min: na });
  if (!contarTerr(est, jd)) {
    const x = est.jug[jd]; x.vivo = false; x.elimPor = j; est.jug[j].st.elim++;
    est.jug[j].cartas.push(...x.cartas); x.cartas = [];
    evs.push({ t: 'elim', j: jd, por: j });
  }
  est.conq = { d, h, min: na, max: est.e[d] - 1 };
  if (est.conq.max < est.conq.min) est.conq.min = est.conq.max;
  const g = ganadorPorEstado(est);
  if (g) { est.e[h] = Math.max(1, est.conq.min); est.e[d] -= est.e[h]; est.conq = null; terminarPartida(est, g, evs); return { conquista: true, fin: true }; }
  if (est.conq.min === est.conq.max) resolverMover(est, est.conq.min, evs);
  return { conquista: true };
}
function resolverMover(est, n, evs) {
  const c = est.conq; est.conq = null;
  est.e[c.d] -= n; est.e[c.h] = n;
  evs.push({ t: 'mov', d: c.d, h: c.h, n });
}

// Ejecuta una orden del jugador j. Devuelve {ok, ev:[...]} o {ok:false, error}.
export function orden(est, j, c) {
  const evs = [];
  if (est.fase === 'fin') return err('La partida terminó.');
  if (j !== est.turno) return err('No es tu turno.');
  if (!est.jug[j].vivo) return err('Estás eliminado.');
  const t = c && c.t;
  if (est.conq && t !== 'mover') return err('Primero decide cuántos ejércitos mover.');
  switch (t) {
    case 'colocar': {
      if (est.fase !== 'colocar' && est.fase !== 'refuerzo' && !(est.fase === 'ataque' && est.pool > 0)) return err('Ahora no puedes colocar.');
      const ter = c.a | 0, n = c.n | 0;
      if (!(ter >= 0 && ter < N) || est.o[ter] !== j) return err('Elige un territorio tuyo.');
      if (n < 1 || n > est.pool) return err('Cantidad no válida.');
      if (est.fase === 'refuerzo' && debeCanjear(est, j)) return err('Tienes 5 cartas o más: debes canjear un conjunto.');
      est.e[ter] += n; est.pool -= n;
      evs.push({ t: 'col', j, a: ter, n });
      if (est.fase === 'colocar') { est.reserva[j] -= n; if (est.pool <= 0 || est.reserva[j] <= 0) avanzarColocacion(est, evs); }
      return { ok: true, ev: evs };
    }
    case 'canjear': {
      if (est.fase !== 'refuerzo' && !(est.fase === 'ataque' && debeCanjear(est, j) && est.jug[j].cartas.length >= 6)) return err('Solo puedes canjear al reforzar.');
      const cs = (c.cartas || []).map((x) => x | 0);
      if (!esConjunto(cs) || !cs.every((x) => est.jug[j].cartas.includes(x))) return err('Esas cartas no forman un conjunto.');
      const v = valorCanje(est.canjes++);
      let bono = 0;
      for (const x of cs) { const k = est.jug[j].cartas.indexOf(x); est.jug[j].cartas.splice(k, 1); est.descarte.push(x); if (x < COMODIN && est.o[x] === j && !bono) { bono = x + 1; } }
      est.pool += v; if (bono) est.e[bono - 1] += 2;
      evs.push({ t: 'canje', j, cartas: cs, valor: v, bono: bono ? bono - 1 : -1 });
      return { ok: true, ev: evs };
    }
    case 'atacarFase': {
      if (est.fase !== 'refuerzo') return err('Ya estás atacando.');
      if (est.pool > 0) return err('Aún tienes ejércitos por colocar.');
      if (debeCanjear(est, j)) return err('Debes canjear cartas antes de atacar.');
      est.fase = 'ataque'; evs.push({ t: 'fase', j, f: 'ataque' });
      return { ok: true, ev: evs };
    }
    case 'atacar': case 'blitz': {
      if (est.fase !== 'ataque') return err('No estás en la fase de ataque.');
      if (est.jug[j].cartas.length >= 6) return err('Tienes 6 cartas: canjea antes de seguir atacando.');
      if (est.pool > 0) return err('Coloca primero tus ejércitos.');
      const d = c.d | 0, h = c.h | 0;
      if (!(d >= 0 && d < N && h >= 0 && h < N)) return err('Territorio no válido.');
      if (est.o[d] !== j) return err('Ataca desde un territorio tuyo.');
      if (est.o[h] === j || aliados(est, j, est.o[h])) return err('No puedes atacar a un aliado ni a ti mismo.');
      if (!ADY[d].includes(h)) return err('Los territorios no son vecinos.');
      if (est.e[d] < 2) return err('Necesitas al menos 2 ejércitos para atacar.');
      let r = rondaAtaque(est, d, h, c.dados, evs);
      if (t === 'blitz') {
        let guardia = 400;
        while (!r.conquista && est.e[d] >= 2 && guardia-- > 0 && (!c.max || evs.filter((e) => e.t === 'bat').length < c.max)) r = rondaAtaque(est, d, h, 3, evs);
      }
      return { ok: true, ev: evs };
    }
    case 'mover': {
      if (!est.conq) return err('No hay nada que mover.');
      const n = Math.max(est.conq.min, Math.min(est.conq.max, c.n | 0));
      resolverMover(est, n, evs);
      const g = ganadorPorEstado(est);
      if (g) terminarPartida(est, g, evs);
      return { ok: true, ev: evs };
    }
    case 'finAtaque': {
      if (est.fase !== 'ataque') return err('No estás atacando.');
      est.fase = 'fortificar'; evs.push({ t: 'fase', j, f: 'fortificar' });
      return { ok: true, ev: evs };
    }
    case 'fortificar': {
      if (est.fase !== 'ataque' && est.fase !== 'fortificar') return err('Ahora no puedes fortificar.');
      if (est.fortif) return err('Ya fortificaste este turno.');
      const d = c.d | 0, h = c.h | 0, n = c.n | 0;
      if (!(d >= 0 && d < N && h >= 0 && h < N) || d === h || est.o[d] !== j || est.o[h] !== j) return err('Elige dos territorios tuyos.');
      if (!rutaPropia(est, j, d, h)) return err('No hay un camino de territorios tuyos entre ambos.');
      if (n < 1 || n > est.e[d] - 1) return err('Cantidad no válida.');
      est.e[d] -= n; est.e[h] += n; est.fortif = true;
      evs.push({ t: 'fort', j, d, h, n });
      siguienteTurno(est, evs);
      return { ok: true, ev: evs };
    }
    case 'terminar': {
      if (est.fase !== 'ataque' && est.fase !== 'fortificar') return err('Aún no puedes terminar el turno.');
      siguienteTurno(est, evs);
      return { ok: true, ev: evs };
    }
    default: return err('Orden desconocida.');
  }
}

/* ---------- vista filtrada por jugador (sin secretos) ---------- */
export function vista(est, j) {
  const fin = est.fase === 'fin';
  return {
    v: 1, id: est.id, cfg: est.cfg, n: est.n, ronda: est.ronda, fase: est.fase, turno: est.turno, pool: est.pool, o: est.o, e: est.e, reserva: est.reserva,
    canjes: est.canjes, conq: est.conq, ganador: est.ganador, fortif: est.fortif, ganoCarta: est.ganoCarta, mazoN: est.mazo.length, yo: j,
    jug: est.jug.map((p, i) => ({ nombre: p.nombre, color: p.color, tipo: p.tipo, nivel: p.nivel, equipo: p.equipo, vivo: p.vivo, ausente: p.ausente, nc: p.cartas.length, cartas: i === j || fin ? p.cartas : undefined, obj: i === j || fin ? p.obj : undefined, elimPor: p.elimPor, st: p.st })),
    mia: j >= 0 && est.jug[j] ? { obj: objetivoActivo(est, j), prog: progresoObjetivo(est, j) } : null
  };
}
export function ejecutarTodo(est, c) { return orden(est, est.turno, c); }
