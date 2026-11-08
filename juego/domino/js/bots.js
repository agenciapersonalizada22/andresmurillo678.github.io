// IA de domino. Los tres niveles ven solo la vista publica del asiento (sus fichas + lo jugado):
// Novato casi al azar; Medio recuerda fichas jugadas y los numeros que cada rival "no tiene" (pases);
// Experto ademas deduce las manos posibles y simula manos completas (determinizacion + Monte Carlo).
import * as R from './reglas.js';

export const NIVELES = [
  { id: 0, nombre: 'Novato', retardo: [700, 1500] },
  { id: 1, nombre: 'Medio', retardo: [800, 1600] },
  { id: 2, nombre: 'Experto', retardo: [900, 1800] }
];

export function nuevaMemoria() { return { jugadas: new Set(), sin: [], mano: 0 }; }
const sinDe = (mem, j) => mem.sin[j] || (mem.sin[j] = new Set());
export function observar(mem, ev) {
  if (ev.t === 'reparto') { mem.jugadas = new Set(); mem.sin = []; mem.mano = ev.ronda; }
  else if (ev.t === 'jugar') mem.jugadas.add(ev.id);
  else if (ev.t === 'pase' || ev.t === 'robo') { const s = sinDe(mem, ev.j); s.add(ev.izq); s.add(ev.der); }
}
export function memoriaDeLog(est) {
  const m = nuevaMemoria();
  for (const e of est.log) observar(m, e);
  return m;
}

/* ---------- heuristica ---------- */
function extremosTras(v, id, lado) {
  const [x, y] = R.par(v.max, id);
  if (!v.cadena.length) return [x, y];
  let l = v.ext.izq, r = v.ext.der;
  if (lado === 'i') l = x === l ? y : x; else r = y === r ? x : y;
  return [l, r];
}
function conteo(max, ids, val) { let n = 0; for (const i of ids) { const p = R.par(max, i); if (p[0] === val || p[1] === val) n++; } return n; }

export function evaluar(v, mem, m) {
  const [x, y] = R.par(v.max, m.id);
  const resto = v.mano.filter((i) => i !== m.id);
  const [l, r] = extremosTras(v, m.id, m.lado);
  let s = (x + y) * 0.9 + (x === y ? 5 : 0);
  s += (conteo(v.max, resto, l) + conteo(v.max, resto, r)) * 1.6;
  if (l === r) s -= 1.5; // dejar el mismo numero en ambos extremos facilita el tranque rival
  const par4 = v.cfg.modo === 'parejas';
  for (let j = 0; j < v.n; j++) {
    if (j === v.yo) continue;
    const sin = mem.sin[j];
    if (!sin) continue;
    const companero = par4 && j === (v.yo + 2) % 4;
    const prox = j === (v.yo + 1) % v.n ? 1.5 : 1;
    for (const e of [l, r]) if (sin.has(e)) s += companero ? -2.6 : 2 * prox;
  }
  // numeros agotados: un extremo "muerto" hace que se cierre el juego
  const jugadas = new Set(mem.jugadas); jugadas.add(m.id);
  for (const c of v.cadena) jugadas.add(c.id);
  const muerto = (e) => { let k = 0; for (const id of jugadas) { const p = R.par(v.max, id); if (p[0] === e) k++; if (p[1] === e && p[0] !== e) k++; } return k >= v.max + 1; };
  if (muerto(l) && muerto(r)) s -= resto.length ? 3 : 0;
  if (!resto.length) s += 100;
  return s;
}

function mejores(v, mem, az, ruido) {
  return v.jugables.map((m) => ({ m, s: evaluar(v, mem, m) + (ruido ? az() * ruido : 0) })).sort((a, b) => b.s - a.s);
}

/* ---------- simulacion (Experto) ---------- */
function muestrear(v, mem, az) {
  const vistos = new Set(v.mano);
  for (const c of v.cadena) vistos.add(c.id);
  for (const id of mem.jugadas) vistos.add(id);
  const libres = [];
  const total = R.tabla(v.max).length;
  for (let i = 0; i < total; i++) if (!vistos.has(i)) libres.push(i);
  const otros = [];
  for (let j = 0; j < v.n; j++) if (j !== v.yo) otros.push(j);
  otros.sort((a, b) => (mem.sin[b] ? mem.sin[b].size : 0) - (mem.sin[a] ? mem.sin[a].size : 0));
  for (let intento = 0; intento < 12; intento++) {
    const pool = libres.slice();
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(az() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
    const manos = new Array(v.n); manos[v.yo] = v.mano.slice();
    let ok = true;
    const libre = intento < 10;
    for (const j of otros) {
      const sin = libre ? mem.sin[j] : null, need = v.cuentas[j], h = [];
      for (let k = 0; k < pool.length && h.length < need; k++) {
        const p = R.par(v.max, pool[k]);
        if (sin && (sin.has(p[0]) || sin.has(p[1]))) continue;
        h.push(pool[k]); pool.splice(k, 1); k--;
      }
      if (h.length < need) { ok = false; break; }
      manos[j] = h;
    }
    if (ok) return { manos, pozo: pool };
  }
  return null;
}
function mundo(v, muestra, az) {
  return {
    v: 1, cfg: v.cfg, n: v.n, max: v.max, rng: 1, ronda: v.ronda, puntos: v.puntos.slice(), manos: muestra.manos.map((m) => m.slice()), pozo: muestra.pozo.slice(),
    cadena: v.cadena.map((c) => ({ ...c })), centro: v.centro, turno: v.yo, sale: v.sale, obligada: v.obligada, pases: v.pases, fin: null, log: [], ev: [], ult: v.ult, manosGanadas: [], _az: az
  };
}
function rapida(est, seat, az) {
  const lg = R.legales(est, seat);
  if (!lg.length) return R.puedeRobar(est, seat) ? { t: 'robar' } : { t: 'pasar' };
  if (lg.length === 1) return { t: 'jugar', id: lg[0].id, lado: lg[0].lado };
  const max = est.max, mano = est.manos[seat], e = R.extremos(est);
  let mejor = lg[0], mk = -1e9;
  for (const m of lg) {
    const p = R.par(max, m.id);
    let l = e ? e.izq : p[0], r = e ? e.der : p[1];
    if (e) { if (m.lado === 'i') l = p[0] === l ? p[1] : p[0]; else r = p[1] === r ? p[0] : p[1]; }
    let ap = 0;
    for (const o of mano) if (o !== m.id) { const q = R.par(max, o); if (q[0] === l || q[1] === l || q[0] === r || q[1] === r) ap++; }
    const k = p[0] + p[1] + (p[0] === p[1] ? 3 : 0) + ap * 1.4 + az() * 1.0;
    if (k > mk) { mk = k; mejor = m; }
  }
  return { t: 'jugar', id: mejor.id, lado: mejor.lado };
}
function jugarHasta(est, az) {
  for (let g = 0; g < 400 && !est.fin; g++) {
    est.ev.length = 0; est.log.length = 0;
    const r = R.aplicar(est, est.turno, rapida(est, est.turno, az));
    if (!r.ok) { const r2 = R.aplicar(est, est.turno, { t: 'pasar' }); if (!r2.ok) break; }
  }
}
function valorFin(est, miU) {
  const f = est.fin;
  if (!f) return 0;
  if (f.unidad < 0) return 0;
  let x = f.unidad === miU ? f.pts : -f.pts;
  if (f.partida) x += f.campeon === miU ? 150 : -150;
  return x;
}

export function decidir(v, mem, nivel, az, opts = {}) {
  if (!v.jugables.length) return v.puedeRobar ? { t: 'robar' } : { t: 'pasar' };
  if (v.jugables.length === 1 || (v.jugables.every((m) => m.id === v.jugables[0].id) && !v.cadena.length)) {
    const m = v.jugables[0]; return { t: 'jugar', id: m.id, lado: m.lado };
  }
  if (nivel <= 0) {
    let m = v.jugables[Math.floor(az() * v.jugables.length)];
    if (az() < 0.35) m = v.jugables.reduce((a, b) => (R.valor(v.max, b.id) > R.valor(v.max, a.id) ? b : a));
    return { t: 'jugar', id: m.id, lado: m.lado };
  }
  const orden = mejores(v, mem, az, nivel === 1 ? 2.2 : 0.3);
  if (nivel === 1) return { t: 'jugar', id: orden[0].m.id, lado: orden[0].m.lado };
  const cand = orden.slice(0, 7);
  const miU = v.cfg.modo === 'parejas' ? v.yo % 2 : v.yo;
  const tope = opts.presupuesto || (v.max > 9 ? 80 : 100), t0 = performance.now();
  const total = cand.map(() => 0); let n = 0;
  const maxMuestras = opts.muestras || 150;
  for (let s = 0; s < maxMuestras; s++) {
    const mu = muestrear(v, mem, az);
    if (!mu) break;
    for (let c = 0; c < cand.length; c++) {
      const w = mundo(v, mu, az);
      w.manos = mu.manos.map((m) => m.slice()); w.pozo = mu.pozo.slice(); // misma muestra para todas las jugadas
      const r = R.aplicar(w, v.yo, { t: 'jugar', id: cand[c].m.id, lado: cand[c].m.lado });
      if (!r.ok) continue;
      jugarHasta(w, az);
      total[c] += valorFin(w, miU);
    }
    n++;
    if (n >= 8 && performance.now() - t0 > tope) break;
  }
  if (!n) return { t: 'jugar', id: cand[0].m.id, lado: cand[0].m.lado };
  let mejor = 0, mv = -1e9;
  cand.forEach((c, i) => { const x = total[i] / n + c.s * 0.15; if (x > mv) { mv = x; mejor = i; } });
  return { t: 'jugar', id: cand[mejor].m.id, lado: cand[mejor].m.lado };
}

export const sugerir = (v, mem) => decidir(v, mem, 1, () => 0.5);
