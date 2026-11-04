// =============================================================
//  🤖  MOTOR
//  Búsqueda alfa-beta (PVS) con profundización iterativa, tabla de
//  transposición Zobrist, ordenación (TT, MVV-LVA, killers, historia),
//  poda con jugada nula, reducciones, extensión por jaque y búsqueda
//  de quietud. Sirve como Web Worker (self.onmessage) y también se
//  puede importar y usar en el hilo principal (plan B).
// =============================================================
import { Posicion, PEON, REY, movAUci } from './reglas.js';
import { evaluar } from './evaluacion.js';

export const MATE = 30000;
const INF = 32000;
const MAXP = 100;
const EXACTO = 0, INFERIOR = 1, SUPERIOR = 2;
const VAL = [0, 100, 320, 330, 500, 900, 20000];

export class Motor {
  constructor(bits = 19) {
    const n = 1 << bits;
    this.mascara = n - 1;
    this.tLo = new Int32Array(n);
    this.tHi = new Int32Array(n);
    this.tMov = new Int32Array(n);
    this.tPun = new Int16Array(n);
    this.tProf = new Int8Array(n);
    this.tTipo = new Uint8Array(n);
    this.killers = new Int32Array(MAXP * 2);
    this.hist = new Int32Array(2 * 4096);
    this.listas = Array.from({ length: MAXP }, () => []);
    this.pun = Array.from({ length: MAXP }, () => new Int32Array(320));
    this.nodos = 0;
    this.parar = false;
    this.limite = 0;
    this.maxNodos = Infinity;
    this.pos = null;
  }

  nuevoJuego() {
    this.tLo.fill(0); this.tHi.fill(0); this.tMov.fill(0); this.tProf.fill(0);
    this.hist.fill(0); this.killers.fill(0);
  }

  _tiempo() {
    if (this.nodos >= this.maxNodos || performance.now() > this.limite) this.parar = true;
  }

  _puntuar(L, P, ply, ttMov) {
    const b = this.pos.b, k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];
    const h = this.hist, hc = this.pos.turno * 4096;
    for (let i = 0; i < L.length; i++) {
      const m = L[i];
      let s;
      if (m === ttMov) s = 10000000;
      else {
        const fl = m >> 15, pr = (m >> 12) & 7;
        if (fl & 1) {
          const v = (fl & 2) ? 1 : (b[(m >> 6) & 63] & 7);
          s = 1000000 + v * 100 - (b[m & 63] & 7) + (pr ? VAL[pr] : 0);
        } else if (pr) s = 950000 + pr;
        else if (m === k1) s = 900000;
        else if (m === k2) s = 890000;
        else s = h[hc + (m & 4095)];
      }
      P[i] = s;
    }
  }

  _siguiente(L, P, i) {
    let mx = i;
    for (let j = i + 1; j < L.length; j++) if (P[j] > P[mx]) mx = j;
    if (mx !== i) {
      const m = L[i]; L[i] = L[mx]; L[mx] = m;
      const p = P[i]; P[i] = P[mx]; P[mx] = p;
    }
    return L[i];
  }

  _quietud(alfa, beta, ply) {
    if ((++this.nodos & 1023) === 0) this._tiempo();
    if (this.parar) return 0;
    const pos = this.pos;
    const ev = evaluar(pos);
    if (ply >= MAXP - 1) return ev;
    if (ev >= beta) return ev;
    if (ev > alfa) alfa = ev;
    const L = this.listas[ply], P = this.pun[ply];
    pos.generar(L, true);
    this._puntuar(L, P, ply, 0);
    const b = pos.b;
    for (let i = 0; i < L.length; i++) {
      const m = this._siguiente(L, P, i);
      const pr = (m >> 12) & 7;
      if (!pr) {
        const v = VAL[(m >> 15) & 2 ? PEON : b[(m >> 6) & 63] & 7];
        if (ev + v + 200 < alfa) continue;
      }
      if (!pos.hacer(m)) continue;
      const s = -this._quietud(-beta, -alfa, ply + 1);
      pos.deshacer();
      if (this.parar) return 0;
      if (s > alfa) {
        alfa = s;
        if (alfa >= beta) return s;
      }
    }
    return alfa;
  }

  _tieneMaterial(pos) {
    const b = pos.b, c = pos.turno;
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (p && (p >> 3) === c) { const t = p & 7; if (t > PEON && t < 6) return true; }
    }
    return false;
  }

  _nodo(prof, alfa, beta, ply, nulo) {
    if ((++this.nodos & 1023) === 0) this._tiempo();
    if (this.parar) return 0;
    const pos = this.pos;
    if (ply > 0 && (pos.medio >= 100 || pos.repeticiones() >= 2)) return 0;
    const pv = beta - alfa > 1;
    const jaque = pos.enJaque();
    if (jaque && ply < MAXP - 4) prof++;
    if (prof <= 0) return this._quietud(alfa, beta, ply);
    if (ply >= MAXP - 2) return evaluar(pos);
    alfa = Math.max(alfa, -MATE + ply);
    beta = Math.min(beta, MATE - ply - 1);
    if (alfa >= beta) return alfa;

    const idx = pos.hLo & this.mascara;
    let ttMov = 0;
    if (this.tLo[idx] === pos.hLo && this.tHi[idx] === pos.hHi && this.tProf[idx] !== 0) {
      ttMov = this.tMov[idx];
      if (!pv && this.tProf[idx] >= prof) {
        let s = this.tPun[idx];
        if (s > MATE - 200) s -= ply; else if (s < -MATE + 200) s += ply;
        const t = this.tTipo[idx];
        if (t === EXACTO || (t === INFERIOR && s >= beta) || (t === SUPERIOR && s <= alfa)) return s;
      }
    }

    if (!pv && !jaque) {
      const ev = evaluar(pos);
      if (prof <= 3 && ev - 130 * prof >= beta) return ev;
      if (nulo && prof >= 3 && ev >= beta && this._tieneMaterial(pos)) {
        pos.hacerNulo();
        const s = -this._nodo(prof - 1 - (prof >= 6 ? 3 : 2), -beta, -beta + 1, ply + 1, false);
        pos.deshacerNulo();
        if (this.parar) return 0;
        if (s >= beta) return s > MATE - 200 ? beta : s;
      }
    }

    const L = this.listas[ply], P = this.pun[ply];
    pos.generar(L);
    this._puntuar(L, P, ply, ttMov);
    const alfa0 = alfa;
    let mejor = -INF, mejorMov = 0, legales = 0;
    const color = pos.turno;
    for (let i = 0; i < L.length; i++) {
      const m = this._siguiente(L, P, i);
      if (!pos.hacer(m)) continue;
      legales++;
      let s;
      if (legales === 1) s = -this._nodo(prof - 1, -beta, -alfa, ply + 1, true);
      else {
        let red = 0;
        const quieta = !(m >> 15 & 1) && !((m >> 12) & 7);
        if (prof >= 3 && legales > 3 && quieta && !jaque && P[i] < 890000) {
          red = legales > 9 ? 2 : 1;
          if (pv && red > 1) red = 1;
          if (pos.enJaque()) red = 0;
        }
        s = -this._nodo(prof - 1 - red, -alfa - 1, -alfa, ply + 1, true);
        if (s > alfa && red > 0) s = -this._nodo(prof - 1, -alfa - 1, -alfa, ply + 1, true);
        if (s > alfa && s < beta) s = -this._nodo(prof - 1, -beta, -alfa, ply + 1, true);
      }
      pos.deshacer();
      if (this.parar) return 0;
      if (s > mejor) {
        mejor = s; mejorMov = m;
        if (s > alfa) {
          alfa = s;
          if (alfa >= beta) {
            if (!(m >> 15 & 1) && !((m >> 12) & 7)) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              const hi = color * 4096 + (m & 4095);
              this.hist[hi] = Math.min(this.hist[hi] + prof * prof, 600000);
            }
            break;
          }
        }
      }
    }
    if (legales === 0) return jaque ? -MATE + ply : 0;
    let guardar = mejor;
    if (guardar > MATE - 200) guardar += ply; else if (guardar < -MATE + 200) guardar -= ply;
    const tipo = mejor <= alfa0 ? SUPERIOR : mejor >= beta ? INFERIOR : EXACTO;
    if (this.tLo[idx] !== pos.hLo || this.tHi[idx] !== pos.hHi || prof >= this.tProf[idx] - 2) {
      this.tLo[idx] = pos.hLo; this.tHi[idx] = pos.hHi;
      this.tMov[idx] = mejorMov; this.tPun[idx] = guardar;
      this.tProf[idx] = Math.min(prof, 120); this.tTipo[idx] = tipo;
    }
    return mejor;
  }

  // Variante principal (como textos UCI) siguiendo la tabla de transposición; "primera" fuerza la jugada inicial
  _pv(pos, prof, primera = 0) {
    const res = [];
    let n = 0;
    for (; n < prof; n++) {
      let m;
      if (n === 0 && primera) m = primera;
      else {
        const idx = pos.hLo & this.mascara;
        if (this.tLo[idx] !== pos.hLo || this.tHi[idx] !== pos.hHi || !this.tMov[idx]) break;
        m = this.tMov[idx];
      }
      if (!pos.movimientosLegales().includes(m)) break;
      res.push(movAUci(m, pos));
      pos.hacer(m);
    }
    for (let i = 0; i < n; i++) pos.deshacer();
    return res;
  }

  // Bonificación de estilo (centipeones) para una jugada ya hecha en el tablero; p = pieza movida
  _sesgo(pos, m, p, sg, rEn) {
    const fl = m >> 15, t = p & 7, des = m & 63, has = (m >> 6) & 63;
    let v = 0;
    if (fl & 1) v += sg.cap || 0;
    if (pos.enJaque()) v += sg.jaque || 0;
    if (t === PEON) v += (sg.peon || 0) + (sg.avance || 0) * (((p >> 3) ? 7 - (has >> 3) : (has >> 3)) - 1);
    else if (t === REY) v += (fl & 12) ? (sg.enr || 0) : (sg.rey || 0);
    else v += sg.pieza || 0;
    if (sg.acerca && rEn >= 0) {
      const d0 = Math.max(Math.abs((des & 7) - (rEn & 7)), Math.abs((des >> 3) - (rEn >> 3)));
      const d1 = Math.max(Math.abs((has & 7) - (rEn & 7)), Math.abs((has >> 3) - (rEn >> 3)));
      v += sg.acerca * (d0 - d1);
    }
    return v;
  }

  // Varias mejores líneas (MultiPV): { prof, tiempo, multi } -> [{ uci, puntuacion, prof, pv }] (puntuación para quien mueve)
  analizar(pos, opc = {}) {
    const multi = Math.max(1, Math.min(opc.multi || 1, 6));
    const excluir = [];
    const lineas = [];
    const n = pos.movimientosLegales().length;
    for (let k = 0; k < multi && k < n; k++) {
      const r = this.buscar(pos, { prof: opc.prof || 12, tiempo: Math.max(80, (opc.tiempo || 800) / multi), excluir, exacto: true });
      if (!r.mov) break;
      excluir.push(r.mov);
      lineas.push({ uci: r.uci, puntuacion: r.puntuacion, prof: r.prof, pv: r.pv });
    }
    return lineas;
  }

  /**
   * Busca la mejor jugada de pos (se modifica y se restaura).
   * opc: { prof, tiempo, ruido, azar, apertura, ply, maxNodos, alProgreso }
   * Devuelve { mov, uci, puntuacion, prof, nodos, ms, pv }
   */
  buscar(pos, opc = {}) {
    const t0 = performance.now();
    this.pos = pos;
    this.nodos = 0;
    this.parar = false;
    this.maxNodos = opc.maxNodos || Infinity;
    const maxProf = Math.min(opc.prof || 64, MAXP - 8);
    const tiempo = opc.tiempo || 1000;
    this.limite = t0 + tiempo;
    this.killers.fill(0);
    for (let i = 0; i < this.hist.length; i++) this.hist[i] >>= 2;
    const legales = pos.movimientosLegales();
    const fin = (mov, puntuacion, prof, pv = null) => ({
      mov, uci: mov ? movAUci(mov, pos) : '', puntuacion, prof, nodos: this.nodos, ms: Math.round(performance.now() - t0),
      pv: pv || (mov ? [movAUci(mov, pos)] : []),
    });
    if (!legales.length) return fin(0, pos.enJaque() ? -MATE : 0, 0);
    if (legales.length === 1 && !opc.exacto) return fin(legales[0], 0, 0);
    if (opc.azar && Math.random() < opc.azar) {
      return fin(legales[Math.floor(Math.random() * legales.length)], 0, 0);
    }
    const sesgo = opc.sesgo || null;
    const ruido = (opc.ply !== undefined && opc.ply < 10 && opc.apertura) ? Math.max(opc.ruido || 0, opc.apertura) : (opc.ruido || 0);
    const raiz = legales.slice();
    if (opc.excluir && opc.excluir.length) {
      for (let i = raiz.length - 1; i >= 0; i--) if (opc.excluir.includes(raiz[i])) raiz.splice(i, 1);
      if (!raiz.length) return fin(0, 0, 0);
    }
    const P = new Int32Array(raiz.length);
    this._puntuar(raiz, P, 0, 0);
    for (let i = 0; i < raiz.length; i++) this._siguiente(raiz, P, i);

    const noisy = !!(ruido || sesgo);
    let mejor = raiz[0], mejorPun = 0, profHecha = 0;
    let exactas = null;

    const tope = (opc.ruido || sesgo) ? 4 : (ruido ? 5 : maxProf); // con ruido solo se puntúan las jugadas con poca profundidad
    for (let d = 1; d <= Math.min(maxProf, tope); d++) {
      let alfa = -INF, mejorIt = 0, mejorS = -INF;
      const puntos = new Array(raiz.length).fill(-INF);
      const bonos = new Array(raiz.length).fill(0);
      for (let i = 0; i < raiz.length; i++) {
        const m = raiz[i];
        const pieza = pos.b[m & 63], reEn = pos.rey[pos.turno ^ 1];
        pos.hacer(m);
        let s;
        if (noisy) s = -this._nodo(d - 1, -INF, INF, 1, true);
        else if (i === 0) s = -this._nodo(d - 1, -INF, -alfa, 1, true);
        else {
          s = -this._nodo(d - 1, -alfa - 1, -alfa, 1, true);
          if (s > alfa && !this.parar) s = -this._nodo(d - 1, -INF, -alfa, 1, true);
        }
        if (sesgo && !this.parar) bonos[i] = this._sesgo(pos, m, pieza, sesgo, reEn);
        pos.deshacer();
        if (this.parar) break;
        puntos[i] = s;
        if (s > mejorS) { mejorS = s; mejorIt = m; if (s > alfa) alfa = s; }
      }
      if (this.parar && !mejorIt) break;
      if (mejorIt && (!this.parar || !noisy)) { mejor = mejorIt; mejorPun = mejorS; if (!this.parar) profHecha = d; }
      if (noisy && !this.parar) exactas = raiz.map((m, i) => [m, puntos[i], bonos[i]]);
      if (this.parar) break;
      // los mejores primero para la siguiente iteración
      const orden = raiz.map((m, i) => [m, puntos[i]]).sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < raiz.length; i++) raiz[i] = orden[i][0];
      if (opc.alProgreso) opc.alProgreso({ prof: d, puntuacion: mejorPun, mov: mejor });
      if (mejorPun > MATE - 100 && !noisy) break;
      if (performance.now() - t0 > tiempo * 0.5) break;
    }

    if (noisy && exactas) {
      let mx = -INF;
      for (const [m, s, bono] of exactas) {
        const g = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * ruido;
        const v = s + g + bono;
        if (v > mx) { mx = v; mejor = m; mejorPun = s; }
      }
    }
    return fin(mejor, mejorPun, profHecha, this._pv(pos, Math.min(profHecha || 1, 10), mejor));
  }
}

// ---------------------------------------------------------- Mensajes (Web Worker)
let motorGlobal = null;

export function pensar(msg, motor) {
  motor = motor || (motorGlobal || (motorGlobal = new Motor(19)));
  if (msg.tipo === 'nueva') { motor.nuevoJuego(); return null; }
  if (msg.tipo === 'analizar') {
    const pos = Posicion.desdeFen(msg.fen);
    for (const u of msg.movs || []) { const m = pos.uciAMov(u); if (!m) throw new Error('Jugada ilegal en el historial: ' + u); pos.hacer(m); }
    if (!pos.tieneLegales()) return { tipo: 'analisis', id: msg.id, lineas: [], final: pos.enJaque() ? 'mate' : 'ahogado' };
    return { tipo: 'analisis', id: msg.id, lineas: motor.analizar(pos, msg), turno: pos.turno };
  }
  const pos = Posicion.desdeFen(msg.fen);
  for (const u of msg.movs || []) {
    const m = pos.uciAMov(u);
    if (!m) throw new Error('Jugada ilegal en el historial: ' + u);
    pos.hacer(m);
  }
  const ply = (pos.numero - 1) * 2 + pos.turno; // media jugada de la partida (para el ruido de apertura)
  const r = motor.buscar(pos, { ...msg.nivel, ply });
  return { tipo: 'jugada', id: msg.id, ...r };
}

if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (e) => {
    try {
      const r = pensar(e.data);
      if (r) self.postMessage(r);
    } catch (err) {
      self.postMessage({ tipo: 'error', id: e.data && e.data.id, texto: String(err && err.message || err) });
    }
  };
  self.postMessage({ tipo: 'listo' });
}
