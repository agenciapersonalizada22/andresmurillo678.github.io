// =============================================================
//  ⏱  RELOJ DE AJEDREZ
//  Tiempo restante de cada bando. Solo corre el reloj del bando que
//  mueve. Mide con performance.now (cada ajuste suma el tiempo real
//  transcurrido, así no se acumula deriva aunque los temporizadores se
//  retrasen con la pestaña oculta). Soporta incremento Fischer, retraso
//  simple o Bronstein, tiempo extra tras N jugadas, tiempo por jugada
//  y tiempos distintos por bando. No usa el DOM: avisa por callbacks.
// =============================================================
const PIEZA = { PEON: 1, CABALLO: 2, ALFIL: 3, TORRE: 4, DAMA: 5 };

export class Reloj {
  constructor(ahora) {
    this.ahora = ahora || (() => performance.now());
    this.auto = true; // false: sin temporizadores (pruebas)
    this.habilitado = false;
    this.activo = false;
    this.enTurno = false; // hay un turno empezado (aunque esté en pausa)
    this.restante = [0, 0];
    this.inicial = [0, 0];
    this.jug = [0, 0];
    this.inc = 0; this.ret = 0; this.brons = false; this.etapas = []; this.porJug = 0;
    this.turno = 0; this.t0 = 0; this.retRest = 0; this.gasto = 0;
    this.alCambiar = () => {};
    this.alAgotar = () => {};
    this.alEtapa = () => {};
    this._id = 0; this._idF = 0;
  }

  // configurar(min, incSeg) o configurar({ min, inc, ret, brons, etapas, porJug, w, b })
  configurar(a, incSeg = 0) {
    this.detener();
    const c = a && typeof a === 'object' ? a : { min: a, inc: incSeg };
    this.porJug = (c.porJug || 0) * 1000;
    this.habilitado = c.min > 0 || this.porJug > 0;
    this.inc = (c.inc || 0) * 1000;
    this.ret = (c.ret || 0) * 1000;
    this.brons = !!c.brons;
    this.etapas = (c.etapas || []).map((e) => ({ jug: e.jug, ms: e.min * 60000 }));
    const base = (m) => (this.porJug ? this.porJug : (m != null ? m : c.min) * 60000);
    this.restante = [base(c.w), base(c.b)];
    this.inicial = [this.restante[0], this.restante[1]];
    this.jug = [0, 0];
    this.enTurno = false;
    this.alCambiar(this.restante);
  }

  // Fija los tiempos (deshacer, revisión...); jug = jugadas hechas por cada bando
  fijar(r, jug = null) {
    this.detener();
    this.restante = [r[0], r[1]];
    if (jug) this.jug = [jug[0], jug[1]];
    this.enTurno = false;
    this.alCambiar(this.restante);
  }

  // Empieza (o reanuda tras una pausa) el turno de "color"
  iniciar(color) {
    if (!this.habilitado) return;
    this._sync();
    this._parar();
    const sigue = this.enTurno && color === this.turno;
    this.turno = color;
    if (!sigue) {
      this.enTurno = true; this.retRest = this.ret; this.gasto = 0;
      if (this.porJug) this.restante = [this.porJug, this.porJug];
    }
    this.activo = true;
    this.t0 = this.ahora();
    this._temporizar();
  }

  // Suma al bando que corre el tiempo real transcurrido desde la última vez
  _sync() {
    if (!this.activo) return;
    const ahora = this.ahora();
    let e = ahora - this.t0;
    this.t0 = ahora;
    if (e <= 0) return;
    if (this.brons) this.gasto += e;
    else if (this.retRest > 0) { const d = Math.min(e, this.retRest); this.retRest -= d; e -= d; }
    this.restante[this.turno] = Math.max(0, this.restante[this.turno] - e);
  }

  _temporizar() {
    if (!this.auto) return;
    this._id = setInterval(() => this.revisar(), 100);
    this._idF = setTimeout(() => this.revisar(), Math.max(0, this.restante[this.turno] + this.retRest * (this.brons ? 0 : 1)) + 3);
  }

  _parar() { clearInterval(this._id); clearTimeout(this._idF); }

  // Actualiza y avisa; si se agotó el tiempo del bando que corre, cae la bandera
  revisar() {
    if (!this.activo) return;
    this._sync();
    this.alCambiar(this.restante);
    if (this.restante[this.turno] <= 0) {
      const c = this.turno;
      this._parar(); this.activo = false;
      this.alAgotar(c);
    }
  }
  _tick() { this.revisar(); }

  detener() {
    this._sync();
    this._parar();
    this.activo = false;
  }

  // La primera jugada de la partida no consume reloj: empieza a correr el rival
  primera(color) {
    if (!this.habilitado) return;
    this.jug[color]++;
    this.enTurno = false;
    this.iniciar(color ^ 1);
  }

  // El bando "color" acaba de mover: bonificaciones y corre el otro
  movio(color) {
    if (!this.habilitado) return;
    this._sync();
    this._parar(); this.activo = false;
    this.jug[color]++;
    if (!this.porJug) {
      if (this.brons) this.restante[color] += Math.min(this.gasto, this.ret);
      this.restante[color] += this.inc;
      for (const e of this.etapas) if (this.jug[color] === e.jug) { this.restante[color] += e.ms; this.alEtapa(color, e); }
    }
    this.enTurno = false;
    this.alCambiar(this.restante);
    this.iniciar(color ^ 1);
  }

  // Estado completo y exacto (para guardar) y su inverso (queda en pausa)
  estado() {
    this._sync();
    return { r: [this.restante[0], this.restante[1]], t: this.turno, jug: [this.jug[0], this.jug[1]], en: this.enTurno, rr: this.retRest, g: this.gasto, a: this.activo };
  }
  restaurar(s) {
    if (!s || !Array.isArray(s.r) || s.r.length !== 2 || !s.r.every((x) => Number.isFinite(x))) return false;
    this.detener();
    this.restante = [Math.max(0, s.r[0]), Math.max(0, s.r[1])];
    this.turno = s.t === 1 ? 1 : 0;
    this.jug = Array.isArray(s.jug) ? [s.jug[0] | 0, s.jug[1] | 0] : [0, 0];
    this.enTurno = !!s.en; this.retRest = Math.max(0, +s.rr || 0); this.gasto = Math.max(0, +s.g || 0);
    this.alCambiar(this.restante);
    return true;
  }
}

// Texto del tiempo: mm:ss (h:mm:ss desde una hora) y décimas según el modo:
// 'minuto' = en el último minuto · 'diez' = en los últimos 10 s · 'no' = nunca
export function formatoTiempo(ms, decimas = 'minuto') {
  ms = Math.max(0, ms);
  const lim = decimas === 'no' ? 0 : decimas === 'diez' ? 10000 : 60000;
  if (ms < lim) return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${Math.floor(ms / 100) % 10}`;
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Jugadas hechas por cada bando tras "cursor" jugadas (empieza mueve "inicio")
export function jugadasPorBando(cursor, inicio = 0) {
  const j = [0, 0];
  for (let i = 0; i < cursor; i++) j[(inicio + i) & 1]++;
  return j;
}

// Regla FIDE de la bandera: si el rival de quien cae no puede dar mate con
// ninguna serie de jugadas legales, la partida es tablas. "b" = tablero (64
// códigos: color<<3 | tipo) y "color" = quien tendría que ganar.
export function sinMaterialMate(b, color) {
  let n = [0, 0, 0, 0, 0, 0], otros = 0, propias = 0, peonesT = 0, caballosT = 0;
  const alfilesColor = new Set();
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!p) continue;
    const t = p & 7, c = p >> 3;
    if (t === 6) continue;
    if (t === PIEZA.PEON) peonesT++;
    if (t === PIEZA.CABALLO) caballosT++;
    if (t === PIEZA.ALFIL) alfilesColor.add(((sq & 7) + (sq >> 3)) & 1);
    if (c === color) { n[t]++; propias++; } else if (t !== PIEZA.DAMA) otros++;
  }
  if (n[PIEZA.PEON] || n[PIEZA.TORRE] || n[PIEZA.DAMA]) return false;
  if (n[PIEZA.CABALLO]) return propias <= 1 && otros === 0;
  if (n[PIEZA.ALFIL]) return alfilesColor.size < 2 && caballosT === 0 && peonesT === 0;
  return true;
}
