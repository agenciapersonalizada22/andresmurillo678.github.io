// =============================================================
//  🖼  VISTA 2D
//  Tablero plano en un canvas 2D: misma interfaz que Vista (3D) para
//  celulares lentos o sin WebGL. Piezas con glifos Unicode.
// =============================================================
import { TEMAS, temaEfectivo } from './temas.js';
import { aMundo } from './tablero3d.js';
import { movDesde, movHasta, movBanderas, PASO, ENR_C, ENR_L } from './reglas.js';

const GLIFO = ['', '♟', '♞', '♝', '♜', '♛', '♚'];
const LETRA = ['', 'P', 'N', 'B', 'R', 'D', 'K'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class Vista2D {
  constructor(contenedor, { tema = 'clasico', set2d = 'clasico', daltonico = 'no', coordenadas = true, reducir = false } = {}) {
    this.contenedor = contenedor;
    this.set2d = set2d; this.daltonico = daltonico; this.coord = coordenadas; this.reducir = reducir;
    this.temaId = TEMAS[tema] ? tema : 'clasico';
    this.lienzo = document.createElement('canvas');
    this.lienzo.id = 'lienzo';
    this.lienzo.setAttribute('aria-label', 'Tablero de ajedrez 2D');
    const viejo = contenedor.querySelector('canvas');
    if (viejo) viejo.replaceWith(this.lienzo); else contenedor.prepend(this.lienzo);
    this.g = this.lienzo.getContext('2d');
    this.tablero = new Array(64).fill(0);
    this.estado = {};
    this.vistaN = 'blancas';
    this.camara = { vista: 'blancas', baseYaw: 0, tYaw: 0, girar() {}, acercar() {}, ir() {} };
    this.piezas = {
      levantada: -1, arrastrada: -1,
      elevar: (sq) => { this.piezas.levantada = sq; this.pedir(); },
      devolver: () => { this.arr = null; this.piezas.arrastrada = -1; this.pedir(); },
      mover: (sq, x, z) => { this.arr = { sq, x, z }; this.piezas.arrastrada = sq; this.pedir(); },
    };
    this.anim = null;
    this.alDibujar = null; this.alFps = null;
    this.sucio = true; this.px = { x: 0, y: 0, c: 1 };
    this.fijarTema(this.temaId);
    new ResizeObserver(() => this._tam()).observe(contenedor);
    this._tam();
    this._bucle = this._bucle.bind(this);
    requestAnimationFrame(this._bucle);
  }

  _tam() {
    const w = Math.max(1, this.contenedor.clientWidth), h = Math.max(1, this.contenedor.clientHeight), d = Math.min(window.devicePixelRatio || 1, 2);
    this.lienzo.width = Math.round(w * d); this.lienzo.height = Math.round(h * d);
    this.lienzo.style.width = '100%'; this.lienzo.style.height = '100%';
    this.d = d; this.w = w; this.h = h;
    const lado = Math.min(w, h) * 0.97;
    this.c = lado / 8; this.ox = (w - lado) / 2; this.oy = (h - lado) / 2;
    this.pedir();
  }

  pedir() { this.sucio = true; }
  fijarTema(id) {
    this.temaId = TEMAS[id] ? id : 'clasico';
    this.t = temaEfectivo(this.temaId, 'tema', this.daltonico);
    this.pedir();
  }
  fijarCalidad() {}
  fijarOpciones(o) {
    if (o.set2d !== undefined) this.set2d = o.set2d;
    if (o.daltonico !== undefined) this.daltonico = o.daltonico;
    if (o.coordenadas !== undefined) this.coord = o.coordenadas;
    if (o.reducir !== undefined) this.reducir = o.reducir;
    this.fijarTema(this.temaId);
  }
  sacudir() {}
  fijarVista(n) {
    this.vistaN = n === 'negras' ? 'negras' : 'blancas';
    this.camara.vista = n; this.camara.baseYaw = n === 'negras' ? Math.PI : 0; this.camara.tYaw = this.camara.baseYaw;
    this.pedir();
  }
  marcar(e) { this.estado = e; this.pedir(); }
  sincronizar(b) { this.anim = null; this.tablero = Array.from(b); this.pedir(); }

  _pos(sq) { // centro en px de una casilla
    const f = sq & 7, r = sq >> 3, n = this.vistaN === 'negras';
    return { x: this.ox + ((n ? 7 - f : f) + 0.5) * this.c, y: this.oy + ((n ? r : 7 - r) + 0.5) * this.c };
  }
  pantallaDe(sq) { return this._pos(sq); }

  jugar(m, bAntes) {
    const d = movDesde(m), h = movHasta(m), fl = movBanderas(m);
    const nuevo = Array.from(bAntes);
    const pieza = nuevo[d];
    nuevo[d] = 0; nuevo[h] = pieza;
    if (fl & PASO) nuevo[(pieza >> 3) ? h + 8 : h - 8] = 0;
    const extra = [];
    if (fl & (ENR_C | ENR_L)) { /* la torre se desliza con el rey; el tablero final lo fija sincronizar */ }
    this.tablero = Array.from(bAntes);
    const dur = this.reducir ? 1 : 180;
    return new Promise((res) => {
      this.anim = { d, h, pieza, t0: performance.now(), dur, fin: () => { this.anim = null; this.tablero = nuevo; if (m >> 12 & 7) nuevo[h] = (m >> 12 & 7) | ((pieza >> 3) << 3); this.pedir(); res(); } };
      this.tablero[d] = 0;
      this.pedir();
    });
  }

  recoger(cx, cy) {
    const r = this.lienzo.getBoundingClientRect();
    const sq = this._sqDe(cx - r.left, cy - r.top);
    return { sq, pieza: sq >= 0 && !!this.tablero[sq] };
  }
  _sqDe(x, y) {
    const f0 = Math.floor((x - this.ox) / this.c), r0 = Math.floor((y - this.oy) / this.c);
    if (f0 < 0 || f0 > 7 || r0 < 0 || r0 > 7) return -1;
    const n = this.vistaN === 'negras';
    return (n ? r0 : 7 - r0) * 8 + (n ? 7 - f0 : f0);
  }
  // Coordenadas "de mundo" equivalentes a las del 3D (para que Entrada use deMundo)
  puntoEnPlano(cx, cy) {
    const r = this.lienzo.getBoundingClientRect();
    const sq = this._sqDe(cx - r.left, cy - r.top);
    if (sq < 0) return { x: 99, z: 99 };
    const p = aMundo(sq);
    // se mantiene la posición continua dentro de la casilla para el arrastre
    const c = this._pos(sq), n = this.vistaN === 'negras', k = n ? -1 : 1;
    return { x: p.x + k * ((cx - r.left) - c.x) / this.c, z: p.z + k * ((cy - r.top) - c.y) / this.c };
  }

  _bucle(t) {
    requestAnimationFrame(this._bucle);
    if (this.anim && t - this.anim.t0 >= this.anim.dur) this.anim.fin();
    if (!this.sucio && !this.anim) return;
    this.sucio = false;
    this._dibujar(t);
  }

  _dibujar(t) {
    const g = this.g, c = this.c, T = this.t;
    g.setTransform(this.d, 0, 0, this.d, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    const cl = hex(T.tablero.claro), os = hex(T.tablero.oscuro);
    for (let sq = 0; sq < 64; sq++) {
      const p = this._pos(sq);
      g.fillStyle = ((sq & 7) + (sq >> 3)) % 2 === 1 ? cl : os;
      g.fillRect(p.x - c / 2, p.y - c / 2, c + 0.5, c + 0.5);
    }
    const e = this.estado, rs = T.resalte;
    const col = (sq, color, a) => { const p = this._pos(sq); g.globalAlpha = a; g.fillStyle = color; g.fillRect(p.x - c / 2, p.y - c / 2, c, c); g.globalAlpha = 1; };
    if (e.ultima) for (const s of e.ultima) col(s, rs.ultima, 0.45);
    if (e.jaque >= 0) col(e.jaque, rs.jaque, 0.6);
    if (e.pista) for (const s of e.pista) col(s, rs.destino, 0.55);
    if (e.seleccion >= 0) col(e.seleccion, rs.seleccion, 0.6);
    if (e.hover >= 0) col(e.hover, '#ffffff', 0.15);
    if (this.coord) {
      g.font = `700 ${Math.max(9, c * 0.2)}px sans-serif`;
      for (let i = 0; i < 8; i++) {
        const n = this.vistaN === 'negras';
        const pf = this._pos(n ? 7 - i : i), pr = this._pos((n ? i : 7 - i) * 8 + (n ? 7 : 0));
        g.fillStyle = (i % 2 === 0) === !n ? os : cl; g.globalAlpha = 0.9;
        g.textAlign = 'right'; g.textBaseline = 'alphabetic';
        g.fillText('abcdefgh'[n ? 7 - i : i], pf.x + c / 2 - 3, this.oy + 8 * c - 4);
        g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText(String(n ? i + 1 : 8 - i), this.ox + 3, this.oy + i * c + 3);
        g.globalAlpha = 1;
      }
    }
    // piezas
    for (let sq = 0; sq < 64; sq++) {
      const q = this.tablero[sq];
      if (!q || sq === this.piezas.arrastrada) continue;
      const p = this._pos(sq);
      this._pieza(q, p.x, p.y - (sq === this.piezas.levantada ? c * 0.08 : 0), c);
    }
    if (this.anim) {
      const a = this.anim, k = Math.min(1, (t - a.t0) / a.dur), s = k * k * (3 - 2 * k);
      const p0 = this._pos(a.d), p1 = this._pos(a.h);
      this._pieza(a.pieza, p0.x + (p1.x - p0.x) * s, p0.y + (p1.y - p0.y) * s, c);
    }
    for (const d of e.destinos || []) {
      const p = this._pos(d.sq);
      g.globalAlpha = 0.85; g.fillStyle = d.captura ? rs.captura : rs.destino; g.strokeStyle = g.fillStyle;
      g.beginPath();
      if (d.captura) { g.lineWidth = c * 0.08; g.arc(p.x, p.y, c * 0.42, 0, 7); g.stroke(); } else { g.arc(p.x, p.y, c * 0.14, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
    if (e.cursor >= 0 && e.cursor !== undefined) { const p = this._pos(e.cursor); g.strokeStyle = '#3df5ff'; g.lineWidth = 3; g.strokeRect(p.x - c / 2 + 2, p.y - c / 2 + 2, c - 4, c - 4); }
    if (this.arr) {
      const q = this.tablero[this.arr.sq];
      const n = this.vistaN === 'negras', w = this.arr;
      const px = this.ox + ((n ? 3.5 - w.x : w.x + 3.5) + 0.5) * c, py = this.oy + ((n ? 3.5 - w.z : w.z + 3.5) + 0.5) * c;
      if (q) this._pieza(q, px, py - c * 0.15, c * 1.1);
    }
    if (this.alDibujar) this.alDibujar();
  }

  _pieza(q, x, y, c) {
    const g = this.g, t = q & 7, blanca = (q >> 3) === 0;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (this.set2d === 'moderno') {
      g.beginPath(); g.arc(x, y, c * 0.38, 0, 7);
      g.fillStyle = blanca ? '#f6f1e3' : '#262626'; g.fill();
      g.lineWidth = c * 0.04; g.strokeStyle = blanca ? '#444' : '#ddd'; g.stroke();
      g.fillStyle = blanca ? '#222' : '#f6f1e3'; g.font = `800 ${c * 0.42}px Orbitron, sans-serif`;
      g.fillText(LETRA[t], x, y + c * 0.02);
      return;
    }
    g.font = `${c * 0.82}px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans","Apple Symbols",sans-serif`;
    g.lineJoin = 'round';
    if (this.set2d === 'contorno') {
      g.lineWidth = c * 0.05; g.strokeStyle = blanca ? '#111' : '#eee'; g.strokeText(GLIFO[t], x, y + c * 0.04);
      g.fillStyle = blanca ? '#fff' : '#000'; g.fillText(GLIFO[t], x, y + c * 0.04);
      return;
    }
    g.lineWidth = c * 0.06; g.strokeStyle = blanca ? '#2a2a2a' : '#f2f2f2';
    g.strokeText(GLIFO[t], x, y + c * 0.04);
    g.fillStyle = blanca ? '#fffdf5' : '#1c1c1c'; g.fillText(GLIFO[t], x, y + c * 0.04);
  }
}
