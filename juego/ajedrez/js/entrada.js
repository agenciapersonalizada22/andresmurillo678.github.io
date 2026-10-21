// =============================================================
//  🖱  ENTRADA
//  Ratón y toque sobre el tablero: toque para elegir y mover, arrastrar
//  una pieza para soltarla en su destino, arrastrar el fondo para girar
//  la cámara, rueda o pellizco para acercar. Para cambiar de casilla
//  con el teclado: flechas y Enter (ver principal.js).
// =============================================================
import { deMundo } from './tablero3d.js';

const UMBRAL = 6;

export class Entrada {
  // cb: alBajar(sq) -> true si se puede arrastrar esa pieza; alPulsar(sq, bajoPieza);
  //     alSoltar(desde, hasta); alHover(sq)
  constructor(contenedor, vista, cb) {
    this.el = contenedor;
    this.vista = vista;
    this.cb = cb;
    this.ptrs = new Map();
    this.estado = null;
    this.pellizco = 0;
    this.activa = true;
    this._enlazar();
  }

  _enlazar() {
    const el = this.el;
    el.addEventListener('pointerdown', (e) => this._bajar(e));
    el.addEventListener('pointermove', (e) => this._mover(e));
    el.addEventListener('pointerup', (e) => this._subir(e));
    el.addEventListener('pointercancel', (e) => this._cancelar(e));
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.estado) this.cb.alHover(-1); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.vista.camara.acercar(Math.exp(e.deltaY * 0.0012));
      this.vista.pedir();
    }, { passive: false });
  }

  _bajar(e) {
    if (!this.activa || (e.target.closest && e.target.closest('button, a, input, select'))) return;
    try { this.el.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 2) {
      this._abortar();
      const [a, b] = [...this.ptrs.values()];
      this.pellizco = Math.hypot(a.x - b.x, a.y - b.y);
      this.estado = { modo: 'pellizco' };
      return;
    }
    if (this.ptrs.size > 2) return;
    const orbita = e.button === 2;
    let hit = { sq: -1, pieza: false };
    if (!orbita) hit = this.vista.recoger(e.clientX, e.clientY);
    const st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, sq: hit.sq, pieza: hit.pieza, modo: 'esperar', desde: -1, bajoPieza: false, tactil: e.pointerType !== 'mouse' };
    if (hit.pieza && hit.sq >= 0 && this.cb.alBajar(hit.sq)) { st.modo = 'pieza'; st.desde = hit.sq; st.bajoPieza = true; }
    else if (orbita) st.modo = 'orbita';
    this.estado = st;
  }

  _mover(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && this.activa && !this.estado) {
        const h = this.vista.recoger(e.clientX, e.clientY);
        this.cb.alHover(h.sq);
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    const st = this.estado;
    if (!st) return;
    if (st.modo === 'pellizco') {
      if (this.ptrs.size >= 2) {
        const [a, b] = [...this.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pellizco > 0 && d > 0) { this.vista.camara.acercar(this.pellizco / d); this.vista.pedir(); }
        this.pellizco = d;
      }
      return;
    }
    if (e.pointerId !== st.id) return;
    st.x = e.clientX; st.y = e.clientY;
    const mov = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
    if (st.modo === 'pieza') {
      if (mov > UMBRAL * (st.tactil ? 1.6 : 1)) {
        st.modo = 'arrastre';
        this.vista.piezas.levantada = -1;
      }
    } else if (st.modo === 'esperar' && mov > UMBRAL) st.modo = 'orbita';
    if (st.modo === 'arrastre') {
      const pt = this.vista.puntoEnPlano(e.clientX, e.clientY, 0.5);
      if (pt) {
        this.vista.piezas.mover(st.desde, Math.max(-4.2, Math.min(4.2, pt.x)), Math.max(-4.2, Math.min(4.2, pt.z)));
        const h = deMundo(pt.x, pt.z);
        this.cb.alHover(h);
        this.vista.pedir();
      }
    } else if (st.modo === 'orbita') {
      this.vista.camara.girar(dx, dy);
      this.vista.pedir();
    }
  }

  _subir(e) {
    const st = this.estado;
    const tenia = this.ptrs.delete(e.pointerId);
    try { this.el.releasePointerCapture(e.pointerId); } catch (x) { /* nada */ }
    if (!tenia || !st) return;
    if (st.modo === 'pellizco') { if (this.ptrs.size === 0) this.estado = null; return; }
    if (e.pointerId !== st.id) return;
    this.estado = null;
    if (st.modo === 'arrastre') {
      const pt = this.vista.puntoEnPlano(e.clientX, e.clientY, 0);
      const hasta = pt ? deMundo(pt.x, pt.z) : -1;
      this.cb.alSoltar(st.desde, hasta);
    } else if (st.modo === 'pieza' || st.modo === 'esperar') {
      this.cb.alPulsar(st.sq, st.bajoPieza);
    }
  }

  _cancelar(e) {
    this.ptrs.delete(e.pointerId);
    this._abortar();
    this.estado = null;
  }

  _abortar() {
    const st = this.estado;
    if (st && st.modo === 'arrastre') this.cb.alSoltar(st.desde, -1);
    this.estado = null;
  }
}
