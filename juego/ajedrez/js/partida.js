// =============================================================
//  📜  PARTIDA
//  Historial de jugadas sobre una Posicion: deshacer, rehacer,
//  saltar a cualquier jugada, estado final (mate, tablas...) y PGN.
//  Tampoco depende de Three.js ni del DOM.
// =============================================================
import { Posicion, FEN_INICIAL, BLANCAS, NEGRAS, PEON, PASO, movDesde, movHasta, movAUci } from './reglas.js';

export const VALOR = [0, 1, 3, 3, 5, 9, 0];

export class Partida {
  constructor(fen = FEN_INICIAL) {
    this.reiniciar(fen);
  }

  reiniciar(fen = FEN_INICIAL) {
    this.pos = Posicion.desdeFen(fen);
    this.fenInicial = fen;
    this.jugadas = [];     // { m, san, uci, cap, pieza }
    this.cursor = 0;       // cuántas jugadas están aplicadas
    this.finManual = null; // rendición, tablas acordadas, tiempo
  }

  get turno() { return this.pos.turno; }
  get ultima() { return this.cursor ? this.jugadas[this.cursor - 1] : null; }
  get alFinal() { return this.cursor === this.jugadas.length; }

  legales() { return this.pos.movimientosLegales(); }

  // Juega m (legal). Si estábamos en una jugada anterior, se descarta lo que venía después.
  jugar(m, legales = null) {
    const L = legales || this.legales();
    if (!L.includes(m)) return false;
    if (this.cursor < this.jugadas.length) this.jugadas.length = this.cursor;
    const b = this.pos.b;
    const fl = m >> 15;
    const cap = (fl & PASO) ? (PEON | ((this.pos.turno ^ 1) << 3)) : b[movHasta(m)];
    const pieza = b[movDesde(m)];
    const san = this.pos.san(m, L);
    this.pos.hacer(m);
    this.jugadas.push({ m, san, uci: movAUci(m), cap, pieza });
    this.cursor++;
    this.finManual = null;
    return true;
  }

  irA(n) {
    n = Math.max(0, Math.min(this.jugadas.length, n));
    while (this.cursor > n) { this.pos.deshacer(); this.cursor--; }
    while (this.cursor < n) { this.pos.hacer(this.jugadas[this.cursor].m); this.cursor++; }
    if (this.cursor !== this.jugadas.length) this.finManual = null;
  }

  deshacer(n = 1) { this.irA(this.cursor - n); }
  rehacer(n = 1) { this.irA(this.cursor + n); }

  // Estado en la posición actual: { fin: null | 'mate' | 'ahogado' | ..., ganador, jaque }
  estado() {
    const p = this.pos;
    if (this.finManual && this.alFinal) return this.finManual;
    const jaque = p.enJaque();
    if (!p.tieneLegales()) {
      return jaque ? { fin: 'mate', ganador: p.turno ^ 1, jaque } : { fin: 'ahogado', ganador: -1, jaque };
    }
    if (p.materialInsuficiente()) return { fin: 'material', ganador: -1, jaque };
    if (p.repeticiones() >= 3) return { fin: 'repeticion', ganador: -1, jaque };
    if (p.medio >= 100) return { fin: 'cincuenta', ganador: -1, jaque };
    return { fin: null, ganador: -1, jaque };
  }

  terminar(fin, ganador) { this.finManual = { fin, ganador, jaque: false }; }

  // Piezas capturadas hasta la jugada actual, por el bando que las capturó
  capturadas() {
    const res = [[], []];
    for (let i = 0; i < this.cursor; i++) {
      const j = this.jugadas[i];
      if (j.cap) res[j.pieza >> 3].push(j.cap & 7);
    }
    res[0].sort((a, b) => b - a); res[1].sort((a, b) => b - a);
    return res;
  }

  // Ventaja de material en peones (positivo = blancas)
  material() {
    let s = 0;
    const b = this.pos.b;
    for (let i = 0; i < 64; i++) if (b[i]) s += (b[i] >> 3 ? -1 : 1) * VALOR[b[i] & 7];
    return s;
  }

  uciHasta() { return this.jugadas.slice(0, this.cursor).map((j) => j.uci); }

  pgn(meta = {}) {
    const est = this.estado();
    let res = '*';
    if (est.fin) res = est.ganador === BLANCAS ? '1-0' : est.ganador === NEGRAS ? '0-1' : '1/2-1/2';
    const h = {
      Event: 'Partida casual', Site: 'Ajedrez 3D', Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      Round: '-', White: 'Blancas', Black: 'Negras', ...meta, Result: res,
    };
    if (this.fenInicial !== FEN_INICIAL) { h.SetUp = '1'; h.FEN = this.fenInicial; }
    let t = Object.entries(h).map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`).join('\n') + '\n\n';
    const ini = Posicion.desdeFen(this.fenInicial);
    let num = ini.numero, negras = ini.turno === NEGRAS;
    const partes = [];
    this.jugadas.forEach((j, i) => {
      if (!negras) partes.push(`${num}.`);
      else if (i === 0) partes.push(`${num}...`);
      partes.push(j.san);
      if (negras) num++;
      negras = !negras;
    });
    partes.push(res);
    return t + partes.join(' ') + '\n';
  }
}
