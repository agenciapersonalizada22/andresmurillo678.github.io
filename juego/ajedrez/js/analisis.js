// =============================================================
//  📊  ANÁLISIS
//  Evaluación en vivo (barra, mejores líneas) y revisión completa de
//  una partida: clasifica cada jugada (brillante, gran jugada, mejor,
//  excelente, bueno, imprecisión, error, grave), calcula la
//  precisión de cada bando y la curva de evaluación.
// =============================================================
import { Posicion, movAUci } from './reglas.js';
import { VALOR } from './partida.js';
import { enLibro } from './aperturas.js';

export const MATE = 30000;
export const esMate = (p) => Math.abs(p) > MATE - 200;
export const mateEn = (p) => Math.ceil((MATE - Math.abs(p) + 1) / 2);

// Probabilidad de ganar (0-100) para una evaluación en centipeones
export const probGanar = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-3000, Math.min(3000, cp)))) - 1);

export function textoEval(cpBlancas) {
  if (esMate(cpBlancas)) return (cpBlancas < 0 ? '-' : '') + 'M' + mateEn(cpBlancas);
  const v = cpBlancas / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

// Convierte una variante UCI en SAN (hasta n jugadas) desde la posición dada
export function pvASan(fen, movs, pv, n = 6) {
  const p = Posicion.desdeFen(fen);
  for (const u of movs) { const m = p.uciAMov(u); if (!m) return []; p.hacer(m); }
  const res = [];
  let num = p.numero, negras = p.turno === 1;
  for (let i = 0; i < pv.length && i < n; i++) {
    const L = p.movimientosLegales();
    const m = p.uciAMov(pv[i], L);
    if (!m) break;
    const pref = !negras ? `${num}. ` : (i === 0 ? `${num}… ` : '');
    res.push(pref + p.san(m, L));
    p.hacer(m);
    if (negras) num++;
    negras = !negras;
  }
  return res;
}

// ---------------------------------------------------------- análisis en vivo
export class AnalisisVivo {
  constructor(ia, alResultado) {
    this.ia = ia; this.cb = alResultado; this.t = 0; this.id = 0;
  }

  pedir(fen, movs, { multi = 3, prof = 16, tiempo = 1400 } = {}) {
    clearTimeout(this.t);
    const id = ++this.id;
    this.ia.cancelar();
    this.t = setTimeout(async () => {
      let r = null;
      try { r = await this.ia.pedir({ tipo: 'analizar', fen, movs, multi, prof, tiempo }); } catch (e) { /* nada */ }
      if (id !== this.id || !r || r.cancelado) return;
      this.cb({ fen, movs, lineas: r.lineas || [], turno: r.turno, final: r.final || null });
    }, 220);
  }

  cancelar() { this.id++; clearTimeout(this.t); this.ia.cancelar(); }
}

// ---------------------------------------------------------- revisión de la partida
export const CLASES = [
  { id: 'brillante', nombre: 'Brillante', simbolo: '!!', color: '#1cc9b8' },
  { id: 'genial', nombre: 'Gran jugada', simbolo: '!', color: '#5b8bf0' },
  { id: 'mejor', nombre: 'Mejor', simbolo: '★', color: '#7fcf4a' },
  { id: 'excelente', nombre: 'Excelente', simbolo: '✓', color: '#8fd36a' },
  { id: 'bueno', nombre: 'Bueno', simbolo: '·', color: '#b6c97a' },
  { id: 'libro', nombre: 'Libro', simbolo: '📖', color: '#c9a77a' },
  { id: 'imprecision', nombre: 'Imprecisión', simbolo: '?!', color: '#f2c744' },
  { id: 'error', nombre: 'Error', simbolo: '?', color: '#f0902e' },
  { id: 'grave', nombre: 'Error grave', simbolo: '??', color: '#e8473b' },
];
export const CLASE_POR_ID = Object.fromEntries(CLASES.map((c) => [c.id, c]));

const material = (p, color) => {
  let s = 0;
  for (let i = 0; i < 64; i++) { const q = p.b[i]; if (q) s += ((q >> 3) === color ? 1 : -1) * VALOR[q & 7]; }
  return s;
};
const precisionJugada = (perdida) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * perdida) - 3.1669));

// partidaInfo: { fenInicial, ucis[] }. opc: { tiempo, prof, alProgreso(i, n), cancelado() }
export async function revisarPartida(ia, { fenInicial, ucis }, opc = {}) {
  const N = ucis.length;
  const tiempo = opc.tiempo || 300, prof = opc.prof || 14;
  const posiciones = []; // por posición i: { lineas, turno, final }
  for (let i = 0; i <= N; i++) {
    if (opc.cancelado && opc.cancelado()) return null;
    let r = null;
    try { r = await ia.pedir({ tipo: 'analizar', fen: fenInicial, movs: ucis.slice(0, i), multi: 2, prof, tiempo }); } catch (e) { /* nada */ }
    if (!r || r.cancelado) return null;
    posiciones.push({ lineas: r.lineas || [], turno: r.turno, final: r.final || null });
    if (opc.alProgreso) opc.alProgreso(i, N);
  }
  const pos = Posicion.desdeFen(fenInicial);
  const turnos = [pos.turno];
  // evaluación de cada posición para quien mueve; si no hay jugadas: mate (-MATE) o ahogado (0)
  const evMover = posiciones.map((q) => (q.final ? (q.final === 'mate' ? -MATE : 0) : (q.lineas[0] ? q.lineas[0].puntuacion : 0)));
  const evalBlancas = [];
  const cls = [];
  const conteo = [{}, {}];
  const perdidas = [[], []];
  let tp = pos.turno;
  for (let i = 0; i <= N; i++) {
    evalBlancas.push(tp === 0 ? evMover[i] : -evMover[i]);
    if (i < N) {
      const antes = Posicion.desdeFen(fenInicial);
      for (let k = 0; k < i; k++) antes.hacer(antes.uciAMov(ucis[k]));
      const color = antes.turno;
      const L = antes.movimientosLegales();
      const mugida = antes.uciAMov(ucis[i], L);
      const lin = posiciones[i].lineas;
      const mejor = lin[0] ? lin[0].uci : '';
      const sBest = evMover[i];
      const sDespues = -evMover[i + 1];
      const jugoMejor = ucis[i] === mejor;
      let perdida = jugoMejor ? 0 : Math.max(0, probGanar(sBest) - probGanar(sDespues));
      if (!jugoMejor && lin[1] && ucis[i] === lin[1].uci) perdida = Math.max(0, probGanar(sBest) - probGanar(lin[1].puntuacion));
      let id;
      if (jugoMejor || perdida < 0.3) id = 'mejor';
      else if (perdida <= 2) id = 'excelente';
      else if (perdida <= 5) id = 'bueno';
      else if (perdida <= 10) id = 'imprecision';
      else if (perdida <= 20) id = 'error';
      else id = 'grave';
      if (id === 'mejor' || id === 'excelente') {
        // gran jugada: la única que sostiene la posición
        if (jugoMejor && lin[1] && probGanar(lin[0].puntuacion) - probGanar(lin[1].puntuacion) >= 18 && probGanar(lin[0].puntuacion) > 35) id = 'genial';
        // brillante: sacrificio de material que sigue siendo lo mejor y no está ya todo ganado
        const resp = posiciones[i + 1] && posiciones[i + 1].lineas[0];
        if (mugida && resp && perdida < 3 && probGanar(sDespues) > 45 && probGanar(sBest) < 88) {
          const m0 = material(antes, color);
          const q = antes.copia();
          q.hacer(mugida);
          const rm = q.uciAMov(resp.uci);
          const piezaMov = antes.b[mugida & 63] & 7;
          if (rm && piezaMov > 1) { q.hacer(rm); if (m0 - material(q, color) >= 2 && (material(q, color) - m0) <= -2) id = 'brillante'; }
        }
      }
      if (id !== 'brillante' && id !== 'genial' && i < 24 && mugida) {
        const d = antes.copia(); d.hacer(mugida);
        if (enLibro(d)) id = 'libro';
      }
      cls.push({ id, perdida: +perdida.toFixed(1), mejor, color });
      conteo[color][id] = (conteo[color][id] || 0) + 1;
      perdidas[color].push(precisionJugada(perdida));
      tp = tp ^ 1;
    }
  }
  const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 100);
  return {
    evalBlancas, cls, conteo, precision: [Math.round(media(perdidas[0]) * 10) / 10, Math.round(media(perdidas[1]) * 10) / 10],
    mejores: posiciones.map((q) => (q.lineas[0] ? q.lineas[0].uci : '')),
  };
}
