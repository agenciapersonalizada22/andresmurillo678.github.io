// =============================================================
//  ENTRADA: teclado, ratón y controles táctiles en un solo lugar.
//  Los botones táctiles "pulsan" teclas virtuales (data-tecla),
//  así el juego solo pregunta k('Space') sin importar de dónde viene.
// =============================================================
export function detectarTactil() {
  try {
    if (/[?&]tactil=1/.test(location.search)) return true;
    if (/[?&]tactil=0/.test(location.search)) return false;
    const grueso = matchMedia('(pointer: coarse)').matches;
    const fino = matchMedia('(pointer: fine)').matches;
    return grueso || (('ontouchstart' in window) && !fino);
  } catch (e) {
    return false;
  }
}

const BLOQUEAR = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'ControlLeft', 'ControlRight']);

export class Entrada {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.teclas = new Set();
    this.pulsos = new Set();
    this.izq = { x: 0, y: 0 };
    this.der = { x: 0, y: 0 };
    this.mdx = 0;
    this.mdy = 0;
    this.izqRaton = false;
    this.derRaton = false;
    this.alTecla = null;
    this.activa = false;
    this.tactil = false;
    this._unirTeclado();
    this._unirRaton();
    this._unirTactil();
  }

  k(...codigos) {
    for (const c of codigos) if (this.teclas.has(c)) return true;
    return false;
  }

  // true una sola vez por pulsación
  pulso(...codigos) {
    for (const c of codigos) if (this.pulsos.has(c)) return true;
    return false;
  }

  consumirRaton() {
    const r = { dx: this.mdx, dy: this.mdy };
    this.mdx = 0;
    this.mdy = 0;
    return r;
  }

  finDeFrame() { this.pulsos.clear(); }

  soltarTodo() {
    this.teclas.clear();
    this.pulsos.clear();
    this.izqRaton = false;
    this.derRaton = false;
    this.mdx = 0;
    this.mdy = 0;
  }

  capturarRaton() {
    try {
      if (this.lienzo.requestPointerLock && document.pointerLockElement !== this.lienzo) {
        const pr = this.lienzo.requestPointerLock();
        if (pr && pr.catch) pr.catch(() => {});
      }
    } catch (e) { /* no hace falta */ }
  }

  soltarRaton() {
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* nada */ }
  }

  _poner(codigo) {
    if (!this.teclas.has(codigo)) {
      this.teclas.add(codigo);
      this.pulsos.add(codigo);
      if (this.alTecla) this.alTecla(codigo);
    }
  }

  _unirTeclado() {
    addEventListener('keydown', (e) => {
      if (BLOQUEAR.has(e.code) && this.activa) e.preventDefault();
      if (!e.repeat) this._poner(e.code);
    });
    addEventListener('keyup', (e) => this.teclas.delete(e.code));
    addEventListener('blur', () => this.soltarTodo());
  }

  _unirRaton() {
    const l = this.lienzo;
    addEventListener('mousemove', (e) => {
      if (!this.activa) return;
      this.mdx += e.movementX || 0;
      this.mdy += e.movementY || 0;
    });
    l.addEventListener('mousedown', (e) => {
      if (!this.activa || this.tactil) return;
      if (e.button === 0) { this.izqRaton = true; this._poner('Mouse0'); }
      if (e.button === 2) { this.derRaton = true; this._poner('Mouse2'); }
      this.capturarRaton();
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.izqRaton = false; this.teclas.delete('Mouse0'); }
      if (e.button === 2) { this.derRaton = false; this.teclas.delete('Mouse2'); }
    });
    l.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _unirTactil() {
    document.querySelectorAll('[data-tecla]').forEach((b) => {
      const codigo = b.dataset.tecla;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
        b.classList.add('activo');
        this._poner(codigo);
      });
      const soltar = () => { b.classList.remove('activo'); this.teclas.delete(codigo); };
      b.addEventListener('pointerup', soltar);
      b.addEventListener('pointercancel', soltar);
      b.addEventListener('lostpointercapture', soltar);
    });
    this._joystick(document.getElementById('joyIzq'), this.izq);
    this._joystick(document.getElementById('joyDer'), this.der);
  }

  _joystick(el, salida) {
    if (!el) return;
    const palanca = el.firstElementChild;
    let id = null;
    const mover = (e) => {
      const r = el.getBoundingClientRect();
      const radio = r.width / 2;
      let dx = (e.clientX - (r.left + radio)) / radio;
      let dy = (e.clientY - (r.top + radio)) / radio;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      salida.x = Math.abs(dx) < 0.08 ? 0 : dx;
      salida.y = Math.abs(dy) < 0.08 ? 0 : dy;
      palanca.style.transform = `translate(${dx * radio * 0.55}px, ${dy * radio * 0.55}px)`;
    };
    const fin = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      salida.x = 0;
      salida.y = 0;
      palanca.style.transform = '';
      el.classList.remove('activo');
    };
    el.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch (x) { /* nada */ }
      el.classList.add('activo');
      mover(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) mover(e); });
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
  }
}
