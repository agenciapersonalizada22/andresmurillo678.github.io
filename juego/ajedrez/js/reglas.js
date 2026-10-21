// =============================================================
//  ♟  REGLAS
//  Tablero, generación de jugadas legales, jaque, enroque, captura
//  al paso, coronación, SAN y FEN. No usa Three.js ni el DOM, así
//  que se puede probar en Node y usar dentro del Web Worker.
//  Casillas: 0 = a1, 7 = h1, 56 = a8, 63 = h8.
//  Pieza = tipo | (color << 3); color 0 = blancas, 1 = negras.
// =============================================================
export const BLANCAS = 0;
export const NEGRAS = 1;
export const PEON = 1, CABALLO = 2, ALFIL = 3, TORRE = 4, DAMA = 5, REY = 6;
export const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Banderas de jugada
export const CAP = 1, PASO = 2, ENR_C = 4, ENR_L = 8, DOBLE = 16;

export const mov = (d, h, promo = 0, fl = 0) => d | (h << 6) | (promo << 12) | (fl << 15);
export const movDesde = (m) => m & 63;
export const movHasta = (m) => (m >> 6) & 63;
export const movPromo = (m) => (m >> 12) & 7;
export const movBanderas = (m) => m >> 15;

const LETRAS = ' pnbrqk';
const LETRAS_SAN = ' PNBRQK';
export const nombreCasilla = (s) => 'abcdefgh'[s & 7] + ((s >> 3) + 1);
export const casillaDe = (t) => 'abcdefgh'.indexOf(t[0]) + 8 * (parseInt(t[1], 10) - 1);
export const colorDe = (p) => p >> 3;
export const tipoDe = (p) => p & 7;

export function movAUci(m) {
  const p = movPromo(m);
  return nombreCasilla(movDesde(m)) + nombreCasilla(movHasta(m)) + (p ? LETRAS[p] : '');
}

// ---------------------------------------------------------- Tablas
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
export const RAYOS = [];
export const CAB = [];
export const REYT = [];
export const PEON_ATQ = [[], []];   // casillas que ataca un peón del color en la casilla
export const ATAQ_PEON = [[], []];  // casillas desde las que un peón del color ataca la casilla
(function iniciarTablas() {
  const dentro = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  for (let s = 0; s < 64; s++) {
    const f = s & 7, r = s >> 3;
    RAYOS[s] = DIRS.map(([df, dr]) => {
      const l = [];
      for (let k = 1; dentro(f + df * k, r + dr * k); k++) l.push((r + dr * k) * 8 + f + df * k);
      return l;
    });
    CAB[s] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
      .filter(([a, c]) => dentro(f + a, r + c)).map(([a, c]) => (r + c) * 8 + f + a);
    REYT[s] = DIRS.filter(([a, c]) => dentro(f + a, r + c)).map(([a, c]) => (r + c) * 8 + f + a);
    for (let c = 0; c < 2; c++) {
      const dr = c === 0 ? 1 : -1;
      PEON_ATQ[c][s] = [-1, 1].filter((df) => dentro(f + df, r + dr)).map((df) => (r + dr) * 8 + f + df);
      ATAQ_PEON[c][s] = [-1, 1].filter((df) => dentro(f + df, r - dr)).map((df) => (r - dr) * 8 + f + df);
    }
  }
})();

// Derechos de enroque que se pierden al tocar una casilla
const MASC = new Uint8Array(64).fill(15);
MASC[0] = 13; MASC[4] = 12; MASC[7] = 14;
MASC[56] = 7; MASC[60] = 3; MASC[63] = 11;

// ---------------------------------------------------------- Zobrist
const ZP_LO = new Int32Array(16 * 64), ZP_HI = new Int32Array(16 * 64);
const ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
const ZE_LO = new Int32Array(8), ZE_HI = new Int32Array(8);
let ZT_LO = 0, ZT_HI = 0;
(function iniciarZobrist() {
  let a = 0x9e3779b9;
  const sig = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) | 0;
  };
  for (let i = 0; i < ZP_LO.length; i++) { ZP_LO[i] = sig(); ZP_HI[i] = sig(); }
  for (let i = 0; i < 16; i++) { ZC_LO[i] = sig(); ZC_HI[i] = sig(); }
  for (let i = 0; i < 8; i++) { ZE_LO[i] = sig(); ZE_HI[i] = sig(); }
  ZT_LO = sig(); ZT_HI = sig();
})();

// ---------------------------------------------------------- Posición
export class Posicion {
  constructor() {
    this.b = new Int8Array(64);
    this.turno = BLANCAS;
    this.enroque = 0;      // 1 = K, 2 = Q, 4 = k, 8 = q
    this.alPaso = -1;
    this.medio = 0;        // medias jugadas sin captura ni peón
    this.numero = 1;
    this.rey = [-1, -1];
    this.hLo = 0;
    this.hHi = 0;
    this.pila = [];        // 7 valores por jugada: m, cap, enroque, alPaso, medio, hLo, hHi
  }

  static desdeFen(fen) {
    const p = new Posicion();
    const partes = String(fen).trim().split(/\s+/);
    if (partes.length < 2) throw new Error('FEN incompleto');
    const filas = partes[0].split('/');
    if (filas.length !== 8) throw new Error('El FEN debe tener 8 filas');
    const cuenta = new Int32Array(16);
    for (let i = 0; i < 8; i++) {
      const r = 7 - i;
      let f = 0;
      for (const ch of filas[i]) {
        if (ch >= '1' && ch <= '8') { f += +ch; continue; }
        const t = LETRAS.indexOf(ch.toLowerCase());
        if (t < 1 || f > 7) throw new Error('Pieza no válida en el FEN');
        const pieza = t | ((ch === ch.toLowerCase() ? 1 : 0) << 3);
        if (t === PEON && (r === 0 || r === 7)) throw new Error('Peón en la primera o última fila');
        p.b[r * 8 + f] = pieza;
        cuenta[pieza]++;
        f++;
      }
      if (f !== 8) throw new Error('Una fila del FEN no suma 8 casillas');
    }
    if (cuenta[REY] !== 1 || cuenta[REY | 8] !== 1) throw new Error('Cada bando necesita exactamente un rey');
    if (cuenta[PEON] > 8 || cuenta[PEON | 8] > 8) throw new Error('Demasiados peones');
    for (let s = 0; s < 64; s++) if ((p.b[s] & 7) === REY) p.rey[p.b[s] >> 3] = s;
    p.turno = partes[1] === 'b' ? NEGRAS : BLANCAS;
    if (partes[1] !== 'w' && partes[1] !== 'b') throw new Error('Turno no válido en el FEN');
    const e = partes[2] || '-';
    if (e.includes('K') && p.b[4] === REY && p.b[7] === TORRE) p.enroque |= 1;
    if (e.includes('Q') && p.b[4] === REY && p.b[0] === TORRE) p.enroque |= 2;
    if (e.includes('k') && p.b[60] === (REY | 8) && p.b[63] === (TORRE | 8)) p.enroque |= 4;
    if (e.includes('q') && p.b[60] === (REY | 8) && p.b[56] === (TORRE | 8)) p.enroque |= 8;
    p.alPaso = -1;
    if (partes[3] && partes[3] !== '-') {
      const s = casillaDe(partes[3]);
      const rr = s >> 3;
      const dir = p.turno === BLANCAS ? -8 : 8;
      if (s >= 0 && s < 64 && rr === (p.turno === BLANCAS ? 5 : 2)
        && p.b[s] === 0 && p.b[s + dir] === (PEON | ((p.turno ^ 1) << 3))) p.alPaso = s;
    }
    p.medio = Math.max(0, parseInt(partes[4], 10) || 0);
    p.numero = Math.max(1, parseInt(partes[5], 10) || 1);
    if (p.atacada(p.rey[p.turno ^ 1], p.turno)) throw new Error('El bando que no mueve está en jaque');
    p.recalcularHash();
    return p;
  }

  copia() {
    return Posicion.desdeFen(this.aFen());
  }

  aFen() {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let v = 0;
      for (let f = 0; f < 8; f++) {
        const q = this.b[r * 8 + f];
        if (!q) { v++; continue; }
        if (v) { s += v; v = 0; }
        const ch = LETRAS[q & 7];
        s += (q >> 3) ? ch : ch.toUpperCase();
      }
      if (v) s += v;
      if (r) s += '/';
    }
    const e = (this.enroque & 1 ? 'K' : '') + (this.enroque & 2 ? 'Q' : '')
      + (this.enroque & 4 ? 'k' : '') + (this.enroque & 8 ? 'q' : '');
    return `${s} ${this.turno ? 'b' : 'w'} ${e || '-'} ${this.alPaso >= 0 ? nombreCasilla(this.alPaso) : '-'} ${this.medio} ${this.numero}`;
  }

  // El ep solo cuenta en el hash si algún peón puede capturarlo
  _epHash(alPaso, turno) {
    if (alPaso < 0) return -1;
    const f = alPaso & 7;
    const fila = turno === BLANCAS ? alPaso - 8 : alPaso + 8;
    const pe = PEON | (turno << 3);
    if ((f > 0 && this.b[fila - 1] === pe) || (f < 7 && this.b[fila + 1] === pe)) return f;
    return -1;
  }

  recalcularHash() {
    let lo = 0, hi = 0;
    for (let s = 0; s < 64; s++) {
      const q = this.b[s];
      if (q) { lo ^= ZP_LO[q * 64 + s]; hi ^= ZP_HI[q * 64 + s]; }
    }
    lo ^= ZC_LO[this.enroque]; hi ^= ZC_HI[this.enroque];
    const ef = this._epHash(this.alPaso, this.turno);
    if (ef >= 0) { lo ^= ZE_LO[ef]; hi ^= ZE_HI[ef]; }
    if (this.turno) { lo ^= ZT_LO; hi ^= ZT_HI; }
    this.hLo = lo; this.hHi = hi;
  }

  // ¿La casilla está atacada por piezas del color "por"?
  atacada(sq, por) {
    const b = this.b, c8 = por << 3;
    for (const s of ATAQ_PEON[por][sq]) if (b[s] === (PEON | c8)) return true;
    for (const s of CAB[sq]) if (b[s] === (CABALLO | c8)) return true;
    for (const s of REYT[sq]) if (b[s] === (REY | c8)) return true;
    const rays = RAYOS[sq];
    for (let d = 0; d < 8; d++) {
      const mia = d < 4 ? TORRE : ALFIL;
      const r = rays[d];
      for (let i = 0; i < r.length; i++) {
        const q = b[r[i]];
        if (q) {
          if (q === (mia | c8) || q === (DAMA | c8)) return true;
          break;
        }
      }
    }
    return false;
  }

  enJaque() {
    return this.atacada(this.rey[this.turno], this.turno ^ 1);
  }

  // Jugadas pseudolegales en L. soloCap: capturas y coronaciones a dama (quietud)
  generar(L, soloCap = false) {
    L.length = 0;
    const b = this.b, us = this.turno, them = us ^ 1;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || (p >> 3) !== us) continue;
      const t = p & 7;
      if (t === PEON) {
        const dir = us ? -8 : 8, r = sq >> 3;
        const rp = us ? 1 : 6, ri = us ? 6 : 1;
        const uno = sq + dir;
        if (b[uno] === 0) {
          if (r === rp) {
            if (soloCap) L.push(mov(sq, uno, DAMA));
            else for (let k = DAMA; k >= CABALLO; k--) L.push(mov(sq, uno, k));
          } else if (!soloCap) {
            L.push(mov(sq, uno));
            if (r === ri && b[uno + dir] === 0) L.push(mov(sq, uno + dir, 0, DOBLE));
          }
        }
        for (const to of PEON_ATQ[us][sq]) {
          const q = b[to];
          if (q && (q >> 3) === them) {
            if (r === rp) {
              if (soloCap) L.push(mov(sq, to, DAMA, CAP));
              else for (let k = DAMA; k >= CABALLO; k--) L.push(mov(sq, to, k, CAP));
            } else L.push(mov(sq, to, 0, CAP));
          } else if (to === this.alPaso) L.push(mov(sq, to, 0, PASO | CAP));
        }
      } else if (t === CABALLO || t === REY) {
        for (const to of (t === CABALLO ? CAB[sq] : REYT[sq])) {
          const q = b[to];
          if (!q) { if (!soloCap) L.push(mov(sq, to)); } else if ((q >> 3) === them) L.push(mov(sq, to, 0, CAP));
        }
      } else {
        const d0 = t === ALFIL ? 4 : 0, d1 = t === TORRE ? 4 : 8;
        const rays = RAYOS[sq];
        for (let d = d0; d < d1; d++) {
          const r = rays[d];
          for (let i = 0; i < r.length; i++) {
            const to = r[i], q = b[to];
            if (!q) { if (!soloCap) L.push(mov(sq, to)); continue; }
            if ((q >> 3) === them) L.push(mov(sq, to, 0, CAP));
            break;
          }
        }
      }
    }
    if (!soloCap) {
      const ks = us ? 60 : 4;
      const der = us ? this.enroque >> 2 : this.enroque & 3;
      if (der && b[ks] === (REY | (us << 3)) && !this.atacada(ks, them)) {
        const torre = TORRE | (us << 3);
        if ((der & 1) && b[ks + 1] === 0 && b[ks + 2] === 0 && b[ks + 3] === torre
          && !this.atacada(ks + 1, them)) L.push(mov(ks, ks + 2, 0, ENR_C));
        if ((der & 2) && b[ks - 1] === 0 && b[ks - 2] === 0 && b[ks - 3] === 0 && b[ks - 4] === torre
          && !this.atacada(ks - 1, them)) L.push(mov(ks, ks - 2, 0, ENR_L));
      }
    }
    return L;
  }

  // Hace la jugada. Si deja al propio rey en jaque, la deshace y devuelve false.
  hacer(m) {
    const b = this.b, us = this.turno, them = us ^ 1;
    const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, fl = m >> 15;
    const p = b[from], t = p & 7;
    let cap = b[to], capSq = to;
    if (fl & PASO) { capSq = us ? to + 8 : to - 8; cap = b[capSq]; }
    this.pila.push(m, cap, this.enroque, this.alPaso, this.medio, this.hLo, this.hHi);
    let lo = this.hLo, hi = this.hHi;
    const ef0 = this._epHash(this.alPaso, us);
    if (ef0 >= 0) { lo ^= ZE_LO[ef0]; hi ^= ZE_HI[ef0]; }
    lo ^= ZC_LO[this.enroque]; hi ^= ZC_HI[this.enroque];
    if (cap) {
      b[capSq] = 0;
      lo ^= ZP_LO[cap * 64 + capSq]; hi ^= ZP_HI[cap * 64 + capSq];
    }
    b[from] = 0;
    lo ^= ZP_LO[p * 64 + from]; hi ^= ZP_HI[p * 64 + from];
    const puesta = promo ? (promo | (us << 3)) : p;
    b[to] = puesta;
    lo ^= ZP_LO[puesta * 64 + to]; hi ^= ZP_HI[puesta * 64 + to];
    if (fl & (ENR_C | ENR_L)) {
      const rf = (fl & ENR_C) ? to + 1 : to - 2;
      const rt = (fl & ENR_C) ? to - 1 : to + 1;
      const tor = b[rf];
      b[rf] = 0; b[rt] = tor;
      lo ^= ZP_LO[tor * 64 + rf] ^ ZP_LO[tor * 64 + rt];
      hi ^= ZP_HI[tor * 64 + rf] ^ ZP_HI[tor * 64 + rt];
    }
    if (t === REY) this.rey[us] = to;
    this.enroque &= MASC[from] & MASC[to];
    lo ^= ZC_LO[this.enroque]; hi ^= ZC_HI[this.enroque];
    this.alPaso = (fl & DOBLE) ? (from + to) >> 1 : -1;
    this.medio = (t === PEON || cap) ? 0 : this.medio + 1;
    if (us) this.numero++;
    this.turno = them;
    lo ^= ZT_LO; hi ^= ZT_HI;
    const ef1 = this._epHash(this.alPaso, them);
    if (ef1 >= 0) { lo ^= ZE_LO[ef1]; hi ^= ZE_HI[ef1]; }
    this.hLo = lo; this.hHi = hi;
    if (this.atacada(this.rey[us], them)) {
      this.deshacer();
      return false;
    }
    return true;
  }

  deshacer() {
    const pl = this.pila;
    const n = pl.length - 7;
    const m = pl[n], cap = pl[n + 1];
    this.enroque = pl[n + 2]; this.alPaso = pl[n + 3]; this.medio = pl[n + 4];
    this.hLo = pl[n + 5]; this.hHi = pl[n + 6];
    pl.length = n;
    const b = this.b;
    const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, fl = m >> 15;
    this.turno ^= 1;
    const us = this.turno;
    if (us) this.numero--;
    const p = promo ? (PEON | (us << 3)) : b[to];
    b[from] = p;
    if (fl & PASO) { b[to] = 0; b[us ? to + 8 : to - 8] = cap; } else b[to] = cap;
    if (fl & ENR_C) { b[to + 1] = b[to - 1]; b[to - 1] = 0; }
    if (fl & ENR_L) { b[to - 2] = b[to + 1]; b[to + 1] = 0; }
    if ((p & 7) === REY) this.rey[us] = from;
  }

  hacerNulo() {
    this.pila.push(0, 0, this.enroque, this.alPaso, this.medio, this.hLo, this.hHi);
    const ef = this._epHash(this.alPaso, this.turno);
    if (ef >= 0) { this.hLo ^= ZE_LO[ef]; this.hHi ^= ZE_HI[ef]; }
    this.alPaso = -1;
    this.turno ^= 1;
    this.hLo ^= ZT_LO; this.hHi ^= ZT_HI;
  }

  deshacerNulo() {
    const pl = this.pila;
    const n = pl.length - 7;
    this.enroque = pl[n + 2]; this.alPaso = pl[n + 3]; this.medio = pl[n + 4];
    this.hLo = pl[n + 5]; this.hHi = pl[n + 6];
    pl.length = n;
    this.turno ^= 1;
  }

  movimientosLegales() {
    const L = this.generar([]);
    const res = [];
    for (let i = 0; i < L.length; i++) if (this.hacer(L[i])) { res.push(L[i]); this.deshacer(); }
    return res;
  }

  tieneLegales() {
    const L = this.generar([]);
    for (let i = 0; i < L.length; i++) if (this.hacer(L[i])) { this.deshacer(); return true; }
    return false;
  }

  // Cuántas veces ha aparecido la posición actual (contando esta)
  repeticiones() {
    const pl = this.pila, n = pl.length / 7;
    let c = 1;
    for (let i = n - 2; i >= 0 && i >= n - this.medio; i -= 2) {
      if (pl[i * 7 + 5] === this.hLo && pl[i * 7 + 6] === this.hHi) c++;
    }
    return c;
  }

  materialInsuficiente() {
    let caballos = 0;
    const alfiles = [0, 0]; // por color de casilla
    for (let s = 0; s < 64; s++) {
      const t = this.b[s] & 7;
      if (!t || t === REY) continue;
      if (t === PEON || t === TORRE || t === DAMA) return false;
      if (t === CABALLO) caballos++;
      else alfiles[((s >> 3) + (s & 7)) & 1]++;
    }
    const total = caballos + alfiles[0] + alfiles[1];
    if (total <= 1) return true;
    return caballos === 0 && (alfiles[0] === 0 || alfiles[1] === 0);
  }

  // Convierte desde/hasta/promoción en una jugada legal (0 si no existe)
  buscarMov(desde, hasta, promo = 0, legales = null) {
    const L = legales || this.movimientosLegales();
    for (const m of L) if (movDesde(m) === desde && movHasta(m) === hasta && movPromo(m) === promo) return m;
    return 0;
  }

  uciAMov(uci, legales = null) {
    const L = legales || this.movimientosLegales();
    for (const m of L) if (movAUci(m) === uci) return m;
    return 0;
  }

  // Notación algebraica estándar (letras inglesas). "legales" = lista legal de la posición actual.
  san(m, legales) {
    const b = this.b, from = movDesde(m), to = movHasta(m), fl = movBanderas(m);
    const p = b[from], t = p & 7;
    let s;
    if (fl & ENR_C) s = 'O-O';
    else if (fl & ENR_L) s = 'O-O-O';
    else {
      const cap = (fl & CAP) !== 0;
      if (t === PEON) {
        s = (cap ? 'abcdefgh'[from & 7] + 'x' : '') + nombreCasilla(to);
        if (movPromo(m)) s += '=' + LETRAS_SAN[movPromo(m)];
      } else {
        let ft = false, fr = false, otro = false;
        for (const o of legales) {
          const of = movDesde(o);
          if (o === m || movHasta(o) !== to || of === from || b[of] !== p) continue;
          otro = true;
          if ((of & 7) === (from & 7)) ft = true;
          if ((of >> 3) === (from >> 3)) fr = true;
        }
        let dis = '';
        if (otro) {
          if (!ft) dis = 'abcdefgh'[from & 7];
          else if (!fr) dis = String((from >> 3) + 1);
          else dis = nombreCasilla(from);
        }
        s = LETRAS_SAN[t] + dis + (cap ? 'x' : '') + nombreCasilla(to);
      }
    }
    if (this.hacer(m)) {
      if (this.enJaque()) s += this.tieneLegales() ? '+' : '#';
      this.deshacer();
    }
    return s;
  }

  perft(prof) {
    if (prof === 0) return 1;
    const L = this.generar([]);
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      if (!this.hacer(L[i])) continue;
      n += prof === 1 ? 1 : this.perft(prof - 1);
      this.deshacer();
    }
    return n;
  }
}

// Figuras Unicode para mostrar jugadas (♘ en vez de N)
const FIGURAS = { N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
export function sanFigurada(san) {
  return san.replace(/^[NBRQK]/, (c) => FIGURAS[c]).replace(/=([NBRQ])/, (_, c) => '=' + FIGURAS[c]);
}
