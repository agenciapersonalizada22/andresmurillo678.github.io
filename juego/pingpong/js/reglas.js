// Reglas oficiales de tenis de mesa (puras, sin DOM): punto (Rally), juego a 11 con diferencia de 2, cambio de saque y partido al mejor de N.
// Equipos: 0 = lado +1 (cerca de la camara), 1 = lado -1. Jugadores: individuales [0,1]; dobles ids 0,2 (equipo 0) y 1,3 (equipo 1).
export const ladoDeEquipo = (e) => (e === 0 ? 1 : -1);
export const equipoDeLado = (l) => (l > 0 ? 0 : 1);

/* ---------- Un punto ---------- */
export class Rally {
  constructor({ servidor, receptor, ladoSaque, dobles = false, orden }) {
    this.servidor = servidor; this.receptor = receptor; this.ladoSaque = ladoSaque; this.dobles = dobles;
    this.orden = orden || [servidor, receptor]; // ids en orden de golpeo
    this.fase = 'saque0'; this.golpes = 0; this.ultimo = null; this.destino = 0; this.toqueRed = false; this.fin = null; this.sig = 0;
    this.let = false;
  }
  siguiente() { return this.orden[this.sig % this.orden.length]; }
  _gana(lado, motivo, extra) { this.fase = 'fin'; this.fin = Object.assign({ ladoGanador: lado, motivo, golpes: this.golpes, ace: false }, extra); return this.fin; }
  evento(tipo, d = {}) {
    if (this.fase === 'fin') return null;
    const f = this.fase, s = this.ladoSaque;
    if (tipo === 'golpe') {
      const lado = d.lado;
      if (f === 'saque0') { this.fase = 'saque1'; this.ultimo = lado; this.golpes = 1; this.sig = 1; return null; }
      if (f === 'bote') {
        if (this.dobles && d.id !== this.siguiente()) return this._gana(-lado, 'orden');
        this.fase = 'vuelo'; this.destino = -lado; this.ultimo = lado; this.golpes++; this.sig++; return null;
      }
      return this._gana(-lado, 'volea'); // golpeo antes del bote
    }
    if (tipo === 'red' || tipo === 'cinta') { this.toqueRed = true; return null; }
    if (tipo === 'rebote') {
      const lado = d.lado;
      if (f === 'saque1') return lado === s ? (this.fase = 'saque2', null) : this._gana(-s, 'saque_incorrecto');
      if (f === 'saque2') {
        if (lado === s) return this._gana(-s, 'saque_incorrecto');
        if (this.dobles && Math.sign(d.x) !== Math.sign(ladoDerecha(-s)) && Math.abs(d.x) > 0.005) return this._gana(-s, 'saque_diagonal');
        if (this.toqueRed) { this.fase = 'fin'; this.let = true; this.fin = { let: true, golpes: 0 }; return this.fin; }
        this.fase = 'bote'; this.destino = lado; return null;
      }
      if (f === 'vuelo') return lado === this.destino ? (this.fase = 'bote', null) : this._gana(-this.ultimo, this.toqueRed ? 'red' : 'propio');
      if (f === 'bote') return lado === this.destino ? this._gana(this.ultimo, this.golpes === 1 ? 'ace' : 'sin_devolucion', { ace: this.golpes === 1 }) : null;
      return null;
    }
    if (tipo === 'suelo' || tipo === 'fuera') {
      if (f === 'saque0') return null;
      if (f === 'saque1' || f === 'saque2') return this._gana(-s, 'falta_saque');
      if (f === 'vuelo') return this._gana(-this.ultimo, this.toqueRed ? 'red' : 'fuera');
      if (f === 'bote') return this._gana(this.ultimo, this.golpes === 1 ? 'ace' : 'sin_devolucion', { ace: this.golpes === 1 });
    }
    return null;
  }
}
// x del lado derecho del jugador que mira hacia -lado*z: el lado +1 mira a -z, su derecha es +x
export const ladoDerecha = (lado) => (lado > 0 ? 1 : -1);

/* ---------- Partido ---------- */
export class Partido {
  constructor(cfg = {}) {
    this.cfg = Object.assign({ puntosJuego: 11, mejorDe: 3, dobles: false, inicio: 0 }, cfg);
    this.seq = this.cfg.dobles ? [0, 1, 2, 3] : [0, 1];
    this.juegos = [0, 0]; this.puntos = [0, 0]; this.juegoNum = 1; this.inicio = this.cfg.inicio % this.seq.length;
    this.historial = []; this.fin = null; this.marcadores = []; this.rally = null; this.puntosTotales = [0, 0];
    this.nuevoPunto();
  }
  get juegosParaGanar() { return (this.cfg.mejorDe + 1) >> 1; }
  _k() {
    const pj = this.cfg.puntosJuego, tot = this.puntos[0] + this.puntos[1];
    return tot < 2 * (pj - 1) ? tot >> 1 : (pj - 1) + (tot - 2 * (pj - 1));
  }
  indiceServidor() { return (this.inicio + this._k()) % this.seq.length; }
  servidor() { return this.seq[this.indiceServidor()]; }
  receptor() { return this.seq[(this.indiceServidor() + 1) % this.seq.length]; }
  equipoDe(id) { return id % 2; }
  ordenGolpeo() { const k = this.indiceServidor(), n = this.seq.length; return Array.from({ length: n }, (_, i) => this.seq[(k + i) % n]); }
  nuevoPunto() {
    const sv = this.servidor(), rc = this.receptor();
    this.rally = new Rally({ servidor: sv, receptor: rc, ladoSaque: ladoDeEquipo(this.equipoDe(sv)), dobles: this.cfg.dobles, orden: this.ordenGolpeo() });
    return this.rally;
  }
  enDeuce() { const pj = this.cfg.puntosJuego; return this.puntos[0] >= pj - 1 && this.puntos[1] >= pj - 1; }
  /* Pasa un evento al punto en curso. Si termina, aplica el marcador y devuelve el resumen. */
  evento(tipo, d) {
    if (this.fin) return null;
    const r = this.rally.evento(tipo, d);
    if (!r) return null;
    if (r.let) { this.nuevoPunto(); return { let: true }; }
    return this.puntoPara(equipoDeLado(r.ladoGanador), r);
  }
  puntoPara(eq, r = {}) {
    const res = { equipo: eq, motivo: r.motivo || '', golpes: r.golpes || 0, ace: !!r.ace, finJuego: false, finPartido: false, ganadorPartido: null, cambioLado: false, servidorAnterior: this.servidor() };
    this.puntos[eq]++; this.puntosTotales[eq]++;
    this.historial.push(eq);
    const pj = this.cfg.puntosJuego, a = this.puntos[0], b = this.puntos[1];
    if (Math.max(a, b) >= pj && Math.abs(a - b) >= 2) {
      res.finJuego = true; this.juegos[eq]++; this.marcadores.push([a, b]);
      if (this.juegos[eq] >= this.juegosParaGanar) { res.finPartido = true; res.ganadorPartido = eq; this.fin = { ganador: eq }; }
      else { this.juegoNum++; this.puntos = [0, 0]; this.inicio = (this.inicio + 1) % this.seq.length; res.cambioLado = true; }
    } else if (this.cfg.mejorDe > 1 && this.juegoNum === this.cfg.mejorDe && Math.max(a, b) === 5 && !this._cambio5) {
      this._cambio5 = true; res.cambioLado = true; // juego decisivo: cambio de lado al llegar a 5
    }
    if (!this.fin) this.nuevoPunto();
    return res;
  }
  estado() { return { puntos: this.puntos.slice(), juegos: this.juegos.slice(), juegoNum: this.juegoNum, servidor: this.servidor(), receptor: this.receptor(), fin: this.fin, deuce: this.enDeuce(), marcadores: this.marcadores.map((m) => m.slice()) }; }
  guardar() { return { cfg: this.cfg, juegos: this.juegos, puntos: this.puntos, juegoNum: this.juegoNum, inicio: this.inicio, marcadores: this.marcadores, puntosTotales: this.puntosTotales, c5: !!this._cambio5, fin: this.fin }; }
  static cargar(o) {
    const p = new Partido(o.cfg);
    p.juegos = o.juegos.slice(); p.puntos = o.puntos.slice(); p.juegoNum = o.juegoNum; p.inicio = o.inicio; p.marcadores = o.marcadores.map((m) => m.slice());
    p.puntosTotales = (o.puntosTotales || [0, 0]).slice(); p._cambio5 = !!o.c5; p.fin = o.fin || null;
    if (!p.fin) p.nuevoPunto();
    return p;
  }
}

export const textoMarcador = (p) => `${p.puntos[0]}-${p.puntos[1]}`;
export function textoPunto(e) {
  const pj = 11; // texto cantado: "10-10 igualdad", "ventaja"
  const [a, b] = e.puntos;
  if (a >= pj - 1 && b >= pj - 1) return a === b ? `${a}-${b} (igualados)` : `${a}-${b} (ventaja ${a > b ? 'tuya' : 'rival'})`;
  return `${a}-${b}`;
}

/* Motivo de un punto en texto para el jugador (equipo 0). */
export function motivoTexto(res, yo = 0) {
  const mia = res.equipo === yo;
  const M = {
    ace: mia ? 'Ace' : 'Ace rival', sin_devolucion: mia ? 'Punto: el rival no devolvio' : 'No llegaste a la pelota',
    fuera: mia ? 'El rival se fue fuera' : 'Tu pelota se fue fuera', red: mia ? 'El rival la dejo en la red' : 'Tu pelota quedo en la red',
    propio: mia ? 'El rival boto en su lado' : 'La pelota boto en tu lado', volea: mia ? 'El rival golpeo sin bote' : 'Golpeaste antes del bote',
    falta_saque: mia ? 'Falta de saque rival' : 'Falta de saque', saque_incorrecto: mia ? 'Saque rival incorrecto' : 'Saque incorrecto',
    saque_diagonal: mia ? 'Saque rival fuera de diagonal' : 'Saque fuera de la diagonal', orden: 'Orden de golpeo incorrecto'
  };
  return M[res.motivo] || (mia ? 'Punto tuyo' : 'Punto rival');
}
