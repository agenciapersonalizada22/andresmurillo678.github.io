// Reglas de "Colonos de Isla": estado serializable + funcion aplicar(est, jugador, orden). Sin DOM ni temporizadores.
import { geo, pips } from './geometria.js';

export const RES = ['mad', 'bar', 'alg', 'mai', 'met'];
export const NOMBRE_RES = { mad: 'Madera', bar: 'Barro', alg: 'Algodón', mai: 'Maíz', met: 'Metal' };
export const NOMBRE_TERRENO = { mad: 'Bosque', bar: 'Cerro de barro', alg: 'Prado de algodón', mai: 'Maizal', met: 'Mina', des: 'Duna' };
export const COSTO = { cam: { mad: 1, bar: 1 }, pob: { mad: 1, bar: 1, alg: 1, mai: 1 }, ciu: { mai: 2, met: 3 }, carta: { alg: 1, mai: 1, met: 1 } };
export const CARTAS = {
  guardia: { nombre: 'Guardia', desc: 'Mueve al bandido y roba una carta. Cuenta para el Ejército mayor.' },
  rutas: { nombre: 'Constructor de rutas', desc: 'Construye 2 caminos gratis.' },
  cosecha: { nombre: 'Cosecha', desc: 'Toma 2 recursos cualesquiera del banco.' },
  acaparar: { nombre: 'Acaparar', desc: 'Elige un recurso: todos los rivales te dan todos los que tengan.' },
  pv: { nombre: 'Reliquia', desc: '+1 punto de victoria (secreta hasta ganar).' }
};
export const CFG_BASE = { radio: 2, meta: 10, tablero: 'equilibrado', tiempo: 0, trato: true, bancoLimitado: true };
export const PIEZAS = { cam: 15, pob: 5, ciu: 4 };
const MAZO = { 2: { guardia: 14, rutas: 2, cosecha: 2, acaparar: 2, pv: 5 }, 3: { guardia: 20, rutas: 3, cosecha: 3, acaparar: 3, pv: 6 } };
const TERRENOS = { 2: { mad: 4, bar: 3, alg: 4, mai: 4, met: 3, des: 1 }, 3: { mad: 8, bar: 6, alg: 8, mai: 7, met: 6, des: 2 } };
const NUMS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const NUMS_EXTRA = [3, 4, 5, 6, 8, 9, 10, 11, 2, 12, 5, 9, 4, 10, 3, 11, 8];

export function limpiarCfg(c) {
  const o = { ...CFG_BASE };
  if (c && typeof c === 'object') {
    if (c.radio === 3) o.radio = 3;
    if (Number.isInteger(c.meta) && c.meta >= 5 && c.meta <= 20) o.meta = c.meta;
    if (c.tablero === 'aleatorio' || c.tablero === 'equilibrado') o.tablero = c.tablero;
    if (Number.isInteger(c.tiempo) && c.tiempo >= 0 && c.tiempo <= 300000) o.tiempo = c.tiempo;
    if (typeof c.trato === 'boolean') o.trato = c.trato;
    if (typeof c.bancoLimitado === 'boolean') o.bancoLimitado = c.bancoLimitado;
  }
  return o;
}

/* ---------- azar determinista (mulberry32, estado en est.rng) ---------- */
export function azar(est) {
  let t = (est.rng = (est.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function mezclar(est, a) { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(azar(est) * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
const vacio = () => ({ mad: 0, bar: 0, alg: 0, mai: 0, met: 0 });
export const total = (m) => m.mad + m.bar + m.alg + m.mai + m.met;
export const puedePagar = (m, c) => Object.keys(c).every((k) => m[k] >= c[k]);

/* ---------- tablero ---------- */
function puntuarTablero(G, hex, equilibrado) {
  let mal = 0;
  const pr = vacio(), maxPips = { v: 0 };
  hex.forEach((h, i) => {
    if (h.t !== 'des') pr[h.t] += pips(h.num);
    for (const k of G.vecinos[i]) {
      if (k < i) continue;
      const o = hex[k];
      if ((h.num === 6 || h.num === 8) && (o.num === 6 || o.num === 8)) mal += 1000;
      if (equilibrado && h.t === o.t && h.t !== 'des') mal += 10;
    }
  });
  if (!equilibrado) return mal;
  const v = RES.map((r) => pr[r]);
  mal += (Math.max(...v) - Math.min(...v)) * 3;
  G.verts.forEach((vx) => { const s = vx.hs.reduce((a, hi) => a + pips(hex[hi].num), 0); if (s > 11) mal += (s - 11) * 8; maxPips.v = Math.max(maxPips.v, s); });
  return mal;
}
function terrenosSinAdyacentes(est, G, tipos) { // reparto aleatorio por retroceso: ningun terreno junto a otro igual
  const n = tipos.length, res = Array(n).fill(null), resto = {};
  for (const t of tipos) resto[t] = (resto[t] || 0) + 1;
  let pasos = 0;
  const poner = (i) => {
    if (i === n) return true;
    if (++pasos > 4000) return false;
    const ops = mezclar(est, Object.keys(resto).filter((t) => resto[t] > 0));
    for (const t of ops) {
      if (t !== 'des' && G.vecinos[i].some((k) => k < i && res[k] === t)) continue;
      res[i] = t; resto[t]--;
      if (poner(i + 1)) return true;
      resto[t]++; res[i] = null;
    }
    return false;
  };
  for (let it = 0; it < 30; it++) { pasos = 0; for (const t in resto) resto[t] = tipos.filter((x) => x === t).length; res.fill(null); if (poner(0)) return res; }
  return null;
}
function generarTablero(est) {
  const G = geo(est.cfg.radio), eq = est.cfg.tablero === 'equilibrado';
  const tipos = [];
  for (const k of Object.keys(TERRENOS[est.cfg.radio])) for (let i = 0; i < TERRENOS[est.cfg.radio][k]; i++) tipos.push(k);
  const nums = est.cfg.radio === 2 ? NUMS.slice() : NUMS.concat(NUMS_EXTRA);
  let mejor = null, mejorP = 1e9;
  for (let it = 0; it < (eq ? 300 : 200); it++) {
    const orden = (eq && terrenosSinAdyacentes(est, G, tipos)) || mezclar(est, tipos.slice());
    mezclar(est, nums);
    let k = 0;
    const hex = orden.map((t) => ({ t, num: t === 'des' ? 0 : nums[k++] }));
    const p = puntuarTablero(G, hex, eq);
    if (p < mejorP) { mejorP = p; mejor = hex; }
    if (p <= (eq ? 6 : 0) || (!eq && p < 1000)) break;
  }
  return mejor;
}
function generarPuertos(est) {
  const G = geo(est.cfg.radio), L = G.costa.length, np = est.cfg.radio === 2 ? 9 : 11;
  const tipos = mezclar(est, [...Array(np - 5).fill('gen'), ...RES]);
  const off = Math.floor(azar(est) * L);
  return tipos.map((t, i) => ({ e: G.costa[(off + Math.round((i * L) / np)) % L], t }));
}

export function nuevaPartida(cfgIn, n, semilla) {
  const cfg = limpiarCfg(cfgIn);
  n = Math.max(2, Math.min(4, n | 0));
  const G = geo(cfg.radio);
  const est = { v: 1, n, cfg, rng: (semilla | 0) || 12345, ev: [] };
  est.hex = generarTablero(est);
  est.puertos = generarPuertos(est);
  est.ladron = Math.max(0, est.hex.findIndex((h) => h.t === 'des'));
  est.vj = G.verts.map(() => -1); est.vc = G.verts.map(() => 0); est.ed = G.aristas.map(() => -1);
  const tope = cfg.bancoLimitado ? (cfg.radio === 2 ? 19 : 25) : 999;
  est.banco = { mad: tope, bar: tope, alg: tope, mai: tope, met: tope };
  const mazo = [];
  for (const k of Object.keys(MAZO[cfg.radio])) for (let i = 0; i < MAZO[cfg.radio][k]; i++) mazo.push(k);
  est.mazo = mezclar(est, mazo);
  est.mano = []; est.cm = []; est.cnuevas = []; est.jugadas = []; est.piezas = []; est.lens = [];
  for (let j = 0; j < n; j++) { est.mano.push(vacio()); est.cm.push([]); est.cnuevas.push([]); est.jugadas.push({ guardia: 0, rutas: 0, cosecha: 0, acaparar: 0 }); est.piezas.push({ ...PIEZAS }); est.lens.push(0); }
  est.largo = { j: -1, len: 0 }; est.ejer = { j: -1, n: 0 };
  est.orden = []; for (let j = 0; j < n; j++) est.orden.push(j); for (let j = n - 1; j >= 0; j--) est.orden.push(j);
  est.fund = { paso: 0, pend: 'pob', ult: -1 };
  est.fase = 'fundacion'; est.turno = 0; est.dado = null; est.volver = 'accion'; est.desc = {}; est.cartaJug = false; est.camGratis = 0;
  est.trato = null; est.tratoId = 0; est.numTurno = 0; est.fin = null; est.hist = Array(13).fill(0);
  return est;
}

/* ---------- consultas (sirven para estado completo y para vistas) ---------- */
export function mapaPuertos(s) {
  const G = geo(s.cfg.radio), m = {};
  for (const p of s.puertos) { m[G.aristas[p.e].a] = p.t; m[G.aristas[p.e].b] = p.t; }
  return m;
}
export function tasaBanco(s, j, res) {
  const m = mapaPuertos(s);
  let t = 4;
  geo(s.cfg.radio).verts.forEach((_, v) => {
    if (s.vj[v] !== j) return;
    if (m[v] === 'gen') t = Math.min(t, 3);
    else if (m[v] === res) t = Math.min(t, 2);
  });
  return t;
}
export function puertosDe(s, j) {
  const m = mapaPuertos(s), r = new Set();
  geo(s.cfg.radio).verts.forEach((_, v) => { if (s.vj[v] === j && m[v]) r.add(m[v]); });
  return [...r];
}
export function lugaresPoblado(s, j, fundacion) {
  const G = geo(s.cfg.radio), r = [];
  for (let v = 0; v < G.verts.length; v++) {
    if (s.vj[v] !== -1 || G.verts[v].ns.some((w) => s.vj[w] !== -1)) continue;
    if (!fundacion && !G.verts[v].es.some((e) => s.ed[e] === j)) continue;
    r.push(v);
  }
  return r;
}
export function lugaresCiudad(s, j) { const r = []; for (let v = 0; v < s.vj.length; v++) if (s.vj[v] === j && s.vc[v] === 1) r.push(v); return r; }
export function conectaCamino(s, j, e) {
  const G = geo(s.cfg.radio), A = G.aristas[e];
  return [A.a, A.b].some((v) => s.vj[v] === j || (s.vj[v] === -1 && G.verts[v].es.some((x) => s.ed[x] === j)));
}
export function lugaresCamino(s, j, desde) {
  const G = geo(s.cfg.radio), r = [];
  for (let e = 0; e < G.aristas.length; e++) {
    if (s.ed[e] !== -1) continue;
    if (desde != null && desde >= 0) { if (G.aristas[e].a !== desde && G.aristas[e].b !== desde) continue; } else if (!conectaCamino(s, j, e)) continue;
    r.push(e);
  }
  return r;
}
export function victimas(s, h, j, manos) {
  const G = geo(s.cfg.radio), r = [];
  for (const v of G.hexes[h].vs) {
    const o = s.vj[v];
    if (o >= 0 && o !== j && !r.includes(o) && (!manos || total(manos[o]) > 0)) r.push(o);
  }
  return r;
}
export function puntosPublicos(s, j) {
  let p = 0;
  for (let v = 0; v < s.vj.length; v++) if (s.vj[v] === j) p += s.vc[v];
  if (s.largo.j === j) p += 2;
  if (s.ejer.j === j) p += 2;
  return p;
}
export const puntosTotales = (est, j) => puntosPublicos(est, j) + est.cm[j].filter((c) => c === 'pv').length;
export const cartasJugables = (est, j) => { // acepta estado completo o vista (yo = j)
  const r = {}, nuevas = {}, cn = est.yo !== undefined ? est.cnuevas : est.cnuevas[j], cm = est.yo !== undefined ? est.cm : est.cm[j];
  for (const c of cn) nuevas[c] = (nuevas[c] || 0) + 1;
  for (const c of cm) r[c] = (r[c] || 0) + 1;
  for (const k in nuevas) r[k] -= nuevas[k];
  delete r.pv;
  return r;
};
export function expectativa(s, j) { // recursos esperados por tirada
  const G = geo(s.cfg.radio), r = vacio();
  G.hexes.forEach((hx, hi) => {
    const h = s.hex[hi];
    if (h.t === 'des' || hi === s.ladron) return;
    for (const v of hx.vs) if (s.vj[v] === j) r[h.t] += (pips(h.num) / 36) * s.vc[v];
  });
  return r;
}

/* ---------- camino mas largo ---------- */
export function largoCamino(s, j) {
  const G = geo(s.cfg.radio), ady = new Map();
  for (let e = 0; e < s.ed.length; e++) {
    if (s.ed[e] !== j) continue;
    const { a, b } = G.aristas[e];
    if (!ady.has(a)) ady.set(a, []); if (!ady.has(b)) ady.set(b, []);
    ady.get(a).push([e, b]); ady.get(b).push([e, a]);
  }
  let mejor = 0; const usado = new Set();
  const dfs = (v, len) => {
    if (len > mejor) mejor = len;
    for (const [e, w] of ady.get(v) || []) {
      if (usado.has(e)) continue;
      usado.add(e);
      if (s.vj[w] !== -1 && s.vj[w] !== j) { if (len + 1 > mejor) mejor = len + 1; } else dfs(w, len + 1);
      usado.delete(e);
    }
  };
  for (const v of ady.keys()) dfs(v, 0);
  return mejor;
}
export function recalcularLargo(est) {
  for (let j = 0; j < est.n; j++) est.lens[j] = largoCamino(est, j);
  const max = Math.max(...est.lens), antes = est.largo.j;
  let nuevo = -1;
  if (max >= 5) {
    if (antes >= 0 && est.lens[antes] === max) nuevo = antes;
    else { const c = []; est.lens.forEach((l, j) => { if (l === max) c.push(j); }); nuevo = c.length === 1 ? c[0] : -1; }
  }
  est.largo = { j: nuevo, len: nuevo >= 0 ? max : 0 };
  if (nuevo !== antes) est.ev.push({ t: 'largo', j: nuevo, de: antes, len: est.largo.len });
}

/* ---------- ayudas internas ---------- */
const no = (err) => ({ ok: false, err });
const ok = () => ({ ok: true });
function pagar(est, j, c) { for (const k in c) { est.mano[j][k] -= c[k]; est.banco[k] += c[k]; } }
function dar(est, j, k, n) { est.mano[j][k] += n; est.banco[k] -= n; }
export function comprobarFin(est) {
  if (est.fin) return;
  const j = est.turno;
  if (puntosTotales(est, j) >= est.cfg.meta) {
    est.fin = { ganador: j, pts: est.mano.map((_, i) => puntosTotales(est, i)), turnos: est.numTurno };
    est.fase = 'fin'; est.trato = null; est.ev.push({ t: 'fin', ganador: j });
  }
}
function siguienteFundacion(est) {
  est.fund.paso++;
  est.fund.pend = 'pob'; est.fund.ult = -1;
  if (est.fund.paso >= est.orden.length) { est.fase = 'tirada'; est.turno = 0; est.numTurno = 1; est.ev.push({ t: 'turno', j: 0 }); } else est.turno = est.orden[est.fund.paso];
}
function robarCarta(est, de, a) {
  const m = est.mano[de], tot = total(m);
  let k = Math.floor(azar(est) * tot);
  for (const r of RES) { if (k < m[r]) { m[r]--; est.mano[a][r]++; est.ev.push({ t: 'robo', de, a, res: r }); return r; } k -= m[r]; }
  return null;
}
function producir(est, num) {
  const G = geo(est.cfg.radio), ped = {};
  for (const r of RES) ped[r] = Array(est.n).fill(0);
  G.hexes.forEach((hx, hi) => {
    const h = est.hex[hi];
    if (h.num !== num || hi === est.ladron || h.t === 'des') return;
    for (const v of hx.vs) if (est.vj[v] >= 0) ped[h.t][est.vj[v]] += est.vc[v];
  });
  const g = Array.from({ length: est.n }, () => ({}));
  let hubo = false;
  for (const r of RES) {
    const tot = ped[r].reduce((a, b) => a + b, 0);
    if (!tot) continue;
    if (est.banco[r] >= tot) ped[r].forEach((n, j) => { if (n) { dar(est, j, r, n); g[j][r] = n; hubo = true; } });
    else {
      const rec = ped[r].map((n, j) => (n ? j : -1)).filter((j) => j >= 0);
      if (rec.length === 1) { const n = est.banco[r]; if (n > 0) { dar(est, rec[0], r, n); g[rec[0]][r] = n; hubo = true; } }
      est.ev.push({ t: 'escasez', res: r });
    }
  }
  est.ev.push({ t: 'prod', g, num, hubo });
}

/* ---------- aplicar una orden ---------- */
export function aplicar(est, j, c) {
  if (est.fin) return no('fin');
  if (!c || typeof c !== 'object') return no('orden');
  const t = c.t;
  if (t === 'descartar') return cmdDescartar(est, j, c);
  if (t === 'responder') return cmdResponder(est, j, c);
  if (j !== est.turno) return no('No es tu turno');
  const f = est.fase;
  if (f === 'fundacion') {
    if (t === 'poblado' && est.fund.pend === 'pob') {
      const G = geo(est.cfg.radio);
      if (!Number.isInteger(c.v) || c.v < 0 || c.v >= G.verts.length || !lugaresPoblado(est, j, true).includes(c.v)) return no('Ahí no puedes fundar');
      est.vj[c.v] = j; est.vc[c.v] = 1; est.piezas[j].pob--;
      est.fund.pend = 'cam'; est.fund.ult = c.v;
      est.ev.push({ t: 'poblado', j, v: c.v, fundacion: true });
      if (est.fund.paso >= est.n) {
        const gan = {};
        for (const hi of G.verts[c.v].hs) { const h = est.hex[hi]; if (h.t !== 'des' && est.banco[h.t] > 0) { dar(est, j, h.t, 1); gan[h.t] = (gan[h.t] || 0) + 1; } }
        est.ev.push({ t: 'inicial', j, g: gan });
      }
      recalcularLargo(est);
      return ok();
    }
    if (t === 'camino' && est.fund.pend === 'cam') {
      const G = geo(est.cfg.radio);
      if (!Number.isInteger(c.e) || c.e < 0 || c.e >= G.aristas.length || !lugaresCamino(est, j, est.fund.ult).includes(c.e)) return no('El camino debe salir de tu poblado');
      est.ed[c.e] = j; est.piezas[j].cam--;
      est.ev.push({ t: 'camino', j, e: c.e, fundacion: true });
      recalcularLargo(est);
      siguienteFundacion(est);
      return ok();
    }
    return no('Ahora toca fundar');
  }
  if (f === 'tirada') {
    if (t === 'tirar') {
      const a = 1 + Math.floor(azar(est) * 6), b = 1 + Math.floor(azar(est) * 6), s = a + b;
      est.dado = [a, b]; est.hist[s]++; est.ev.push({ t: 'tirada', j, d: [a, b] });
      if (s === 7) {
        est.desc = {};
        for (let i = 0; i < est.n; i++) { const tt = total(est.mano[i]); if (tt > 7) est.desc[i] = Math.floor(tt / 2); }
        est.volver = 'accion';
        est.fase = Object.keys(est.desc).length ? 'descartar' : 'ladron';
        if (est.fase === 'ladron') est.ev.push({ t: 'mover', j });
      } else { est.fase = 'accion'; producir(est, s); }
      return ok();
    }
    if (t === 'jugarCarta' && c.carta === 'guardia') return cmdCarta(est, j, c);
    return no('Primero tira los dados');
  }
  if (f === 'descartar') return no('Hay que descartar primero');
  if (f === 'ladron') {
    if (t === 'ladron') return cmdLadron(est, j, c);
    return no('Mueve al bandido');
  }
  if (f !== 'accion') return no('fase');
  switch (t) {
    case 'camino': return cmdCamino(est, j, c);
    case 'poblado': return cmdPoblado(est, j, c);
    case 'ciudad': return cmdCiudad(est, j, c);
    case 'comprarCarta': return cmdComprar(est, j);
    case 'jugarCarta': return cmdCarta(est, j, c);
    case 'banco': return cmdBanco(est, j, c);
    case 'ofrecer': return cmdOfrecer(est, j, c);
    case 'cerrarTrato': return cmdCerrarTrato(est, j, c);
    case 'cancelarTrato': est.trato = null; return ok();
    case 'terminar': return cmdTerminar(est, j);
    default: return no('orden');
  }
}

function cmdCamino(est, j, c) {
  const G = geo(est.cfg.radio);
  if (!Number.isInteger(c.e) || c.e < 0 || c.e >= G.aristas.length || est.ed[c.e] !== -1) return no('Camino no válido');
  if (est.piezas[j].cam <= 0) return no('No te quedan caminos');
  if (!conectaCamino(est, j, c.e)) return no('Debe conectar con tus caminos o poblados');
  if (est.camGratis > 0) est.camGratis--;
  else { if (!puedePagar(est.mano[j], COSTO.cam)) return no('Te faltan recursos'); pagar(est, j, COSTO.cam); }
  est.ed[c.e] = j; est.piezas[j].cam--;
  est.ev.push({ t: 'camino', j, e: c.e });
  if (est.camGratis > 0 && (est.piezas[j].cam <= 0 || !lugaresCamino(est, j).length)) est.camGratis = 0;
  recalcularLargo(est); comprobarFin(est);
  return ok();
}
function cmdPoblado(est, j, c) {
  if (!Number.isInteger(c.v) || !lugaresPoblado(est, j, false).includes(c.v)) return no('Ahí no puedes construir');
  if (est.piezas[j].pob <= 0) return no('No te quedan poblados');
  if (!puedePagar(est.mano[j], COSTO.pob)) return no('Te faltan recursos');
  pagar(est, j, COSTO.pob);
  est.vj[c.v] = j; est.vc[c.v] = 1; est.piezas[j].pob--;
  est.ev.push({ t: 'poblado', j, v: c.v });
  recalcularLargo(est); comprobarFin(est);
  return ok();
}
function cmdCiudad(est, j, c) {
  if (!Number.isInteger(c.v) || !lugaresCiudad(est, j).includes(c.v)) return no('Mejora uno de tus poblados');
  if (est.piezas[j].ciu <= 0) return no('No te quedan ciudades');
  if (!puedePagar(est.mano[j], COSTO.ciu)) return no('Te faltan recursos');
  pagar(est, j, COSTO.ciu);
  est.vc[c.v] = 2; est.piezas[j].ciu--; est.piezas[j].pob++;
  est.ev.push({ t: 'ciudad', j, v: c.v });
  comprobarFin(est);
  return ok();
}
function cmdComprar(est, j) {
  if (!est.mazo.length) return no('No quedan cartas');
  if (!puedePagar(est.mano[j], COSTO.carta)) return no('Te faltan recursos');
  pagar(est, j, COSTO.carta);
  const k = est.mazo.pop();
  est.cm[j].push(k); est.cnuevas[j].push(k);
  est.ev.push({ t: 'carta', j, k });
  comprobarFin(est);
  return ok();
}
function cmdCarta(est, j, c) {
  const k = c.carta;
  if (!CARTAS[k] || k === 'pv') return no('Carta no válida');
  if (est.cartaJug) return no('Solo una carta de desarrollo por turno');
  if (!(cartasJugables(est, j)[k] > 0)) return no('No puedes jugar esa carta ahora');
  if (k !== 'guardia' && est.fase !== 'accion') return no('Esa carta se juega después de tirar');
  if (k === 'cosecha') {
    if (!RES.includes(c.r1) || !RES.includes(c.r2)) return no('Elige dos recursos');
    const pid = vacio(); pid[c.r1]++; pid[c.r2]++;
    if (RES.some((r) => pid[r] > est.banco[r])) return no('El banco no tiene eso');
  } else if (k === 'acaparar') { if (!RES.includes(c.r)) return no('Elige un recurso'); }
  else if (k === 'rutas') { if (est.piezas[j].cam <= 0 || !lugaresCamino(est, j).length) return no('No tienes dónde construir'); }
  est.cm[j].splice(est.cm[j].indexOf(k), 1);
  est.cartaJug = true; est.jugadas[j][k]++;
  est.ev.push({ t: 'jugarCarta', j, carta: k, r: c.r });
  if (k === 'guardia') {
    est.volver = est.fase; est.fase = 'ladron';
    if (est.jugadas[j].guardia >= 3 && est.jugadas[j].guardia > est.ejer.n && est.ejer.j !== j) { est.ejer = { j, n: est.jugadas[j].guardia }; est.ev.push({ t: 'ejercito', j, n: est.ejer.n }); }
    else if (est.ejer.j === j) est.ejer.n = est.jugadas[j].guardia;
  } else if (k === 'rutas') est.camGratis = Math.min(2, est.piezas[j].cam);
  else if (k === 'cosecha') { dar(est, j, c.r1, 1); dar(est, j, c.r2, 1); }
  else if (k === 'acaparar') {
    let n = 0;
    for (let i = 0; i < est.n; i++) if (i !== j) { const q = est.mano[i][c.r]; est.mano[i][c.r] = 0; est.mano[j][c.r] += q; n += q; }
    est.ev.push({ t: 'acaparo', j, r: c.r, n });
  }
  comprobarFin(est);
  return ok();
}
function cmdLadron(est, j, c) {
  const G = geo(est.cfg.radio);
  if (!Number.isInteger(c.h) || c.h < 0 || c.h >= G.hexes.length || c.h === est.ladron) return no('Mueve al bandido a otro hexágono');
  const vic = victimas(est, c.h, j, est.mano);
  let v = -1;
  if (vic.length === 1) v = vic[0];
  else if (vic.length > 1) { if (!vic.includes(c.victima)) return no('Elige a quién robar'); v = c.victima; }
  est.ladron = c.h;
  est.ev.push({ t: 'ladron', j, h: c.h, victima: v });
  if (v >= 0) robarCarta(est, v, j);
  est.fase = est.volver || 'accion'; est.volver = 'accion';
  return ok();
}
function cmdDescartar(est, j, c) {
  if (est.fase !== 'descartar' || !est.desc[j]) return no('No tienes que descartar');
  const r = c.r;
  if (!r || typeof r !== 'object') return no('Elige qué descartar');
  let n = 0;
  for (const k of RES) { const x = r[k] | 0; if (x < 0 || x > est.mano[j][k]) return no('No tienes eso'); n += x; }
  if (n !== est.desc[j]) return no('Debes descartar exactamente ' + est.desc[j]);
  for (const k of RES) { const x = r[k] | 0; est.mano[j][k] -= x; est.banco[k] += x; }
  est.ev.push({ t: 'descarte', j, n });
  delete est.desc[j];
  if (!Object.keys(est.desc).length) { est.fase = 'ladron'; est.ev.push({ t: 'mover', j: est.turno }); }
  return ok();
}
function limpiarTrato(o) {
  const r = vacio(); let n = 0;
  if (!o || typeof o !== 'object') return null;
  for (const k of RES) { const x = o[k] | 0; if (x < 0 || x > 19) return null; r[k] = x; n += x; }
  return n ? r : null;
}
function cmdBanco(est, j, c) {
  if (!RES.includes(c.da) || !RES.includes(c.recibe) || c.da === c.recibe) return no('Elige dos recursos distintos');
  const tasa = tasaBanco(est, j, c.da);
  if (est.mano[j][c.da] < tasa) return no(`Necesitas ${tasa} de ese recurso`);
  if (est.banco[c.recibe] < 1) return no('El banco no tiene ese recurso');
  est.mano[j][c.da] -= tasa; est.banco[c.da] += tasa; dar(est, j, c.recibe, 1);
  est.ev.push({ t: 'banco', j, da: c.da, n: tasa, recibe: c.recibe });
  return ok();
}
function cmdOfrecer(est, j, c) {
  if (!est.cfg.trato) return no('El comercio entre jugadores está desactivado');
  const da = limpiarTrato(c.da), pide = limpiarTrato(c.pide);
  if (!da || !pide) return no('Oferta incompleta');
  if (!puedePagar(est.mano[j], da)) return no('No tienes lo que ofreces');
  for (const k of RES) if (da[k] && pide[k]) return no('No ofrezcas y pidas el mismo recurso');
  let a = [];
  for (let i = 0; i < est.n; i++) if (i !== j && (!Array.isArray(c.a) || !c.a.length || c.a.includes(i))) a.push(i);
  if (!a.length) return no('Sin destinatarios');
  est.tratoId++;
  est.trato = { id: est.tratoId, de: j, da, pide, a, resp: {} };
  est.ev.push({ t: 'trato', j, id: est.tratoId });
  return ok();
}
function cmdResponder(est, j, c) {
  const tr = est.trato;
  if (!tr || est.fase !== 'accion' || !tr.a.includes(j)) return no('Sin oferta');
  if (c.id != null && c.id !== tr.id) return no('Oferta antigua');
  if (tr.resp[j] != null && tr.resp[j] !== 'ver') { /* puede cambiar de opinion mientras siga abierta */ }
  tr.resp[j] = c.ok ? 'si' : 'no';
  est.ev.push({ t: 'respuesta', j, ok: !!c.ok });
  return ok();
}
function cmdCerrarTrato(est, j, c) {
  const tr = est.trato;
  if (!tr || tr.de !== j) return no('Sin oferta');
  const con = c.con;
  if (!tr.a.includes(con) || tr.resp[con] !== 'si') return no('Nadie ha aceptado');
  if (!puedePagar(est.mano[j], tr.da)) return no('Ya no tienes lo ofrecido');
  if (!puedePagar(est.mano[con], tr.pide)) return no('Ese jugador ya no tiene lo pedido');
  for (const k of RES) { est.mano[j][k] += tr.pide[k] - tr.da[k]; est.mano[con][k] += tr.da[k] - tr.pide[k]; }
  est.ev.push({ t: 'tratoHecho', j, con, da: tr.da, pide: tr.pide });
  est.trato = null;
  return ok();
}
function cmdTerminar(est, j) {
  if (est.camGratis > 0) return no('Termina de construir tus caminos gratis');
  est.cnuevas[j] = []; est.trato = null; est.cartaJug = false; est.dado = null;
  est.turno = (j + 1) % est.n; est.fase = 'tirada'; est.numTurno++;
  est.ev.push({ t: 'turno', j: est.turno });
  comprobarFin(est); // reliquias o puntos ganados fuera de su turno cuentan al empezar el suyo
  return ok();
}

/* ---------- vista filtrada para un asiento ---------- */
export function vista(est, i) {
  const tr = est.trato && { id: est.trato.id, de: est.trato.de, da: est.trato.da, pide: est.trato.pide, a: est.trato.a, resp: est.trato.resp };
  return {
    v: 1, yo: i, n: est.n, cfg: est.cfg, hex: est.hex, puertos: est.puertos, ladron: est.ladron, vj: est.vj, vc: est.vc, ed: est.ed,
    banco: est.banco, mazoN: est.mazo.length, fase: est.fase, turno: est.turno, dado: est.dado, fund: est.fund, desc: est.desc, volver: est.volver,
    camGratis: est.camGratis, cartaJug: est.cartaJug, trato: tr, largo: est.largo, ejer: est.ejer, lens: est.lens, jugadas: est.jugadas,
    piezas: est.piezas, numTurno: est.numTurno, hist: est.hist,
    mano: est.mano[i], cm: est.cm[i], cnuevas: est.cnuevas[i],
    totales: est.mano.map(total), nCartas: est.cm.map((c) => c.length),
    pts: est.mano.map((_, k) => puntosPublicos(est, k)), misPts: puntosTotales(est, i),
    fin: est.fin ? { ...est.fin } : null
  };
}

/* ---------- validacion de ordenes recibidas por red ---------- */
const TIPOS = new Set(['tirar', 'poblado', 'camino', 'ciudad', 'comprarCarta', 'jugarCarta', 'descartar', 'ladron', 'ofrecer', 'responder', 'cerrarTrato', 'cancelarTrato', 'banco', 'terminar', 'chat']);
const ent = (x) => Number.isInteger(x) && x >= -1 && x < 1000;
const objRes = (o) => { if (!o || typeof o !== 'object') return null; const r = {}; for (const k of RES) if (o[k]) { if (!Number.isInteger(o[k]) || o[k] < 0 || o[k] > 19) return null; r[k] = o[k]; } return r; };
export function sanear(c) {
  if (!c || typeof c !== 'object' || !TIPOS.has(c.t)) return null;
  const o = { t: c.t };
  for (const k of ['v', 'e', 'h', 'victima', 'con', 'id', 'k']) if (c[k] != null) { if (!ent(c[k])) return null; o[k] = c[k]; }
  for (const k of ['carta', 'r', 'r1', 'r2', 'da', 'recibe']) if (typeof c[k] === 'string') {
    if (c.t === 'ofrecer') continue;
    o[k] = c[k].slice(0, 12);
  }
  if (c.t === 'ofrecer') {
    o.da = objRes(c.da); o.pide = objRes(c.pide);
    if (!o.da || !o.pide) return null;
    if (Array.isArray(c.a)) o.a = c.a.filter((x) => Number.isInteger(x) && x >= 0 && x < 4).slice(0, 4);
  }
  if (c.t === 'descartar') { o.r = objRes(c.r); if (!o.r) return null; }
  if (c.t === 'responder') o.ok = !!c.ok;
  return o;
}
