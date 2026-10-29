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

const CODIGOS_MANDO = ['PadRT', 'PadLT', 'PadLB', 'PadRB', 'PadA', 'PadB', 'PadX', 'PadY', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadStart', 'PadView', 'PadL3', 'PadR3'];
// Mapeo estándar (Xbox Series): índice del botón en la Gamepad API
const BOTON_MANDO = { PadA: 0, PadB: 1, PadX: 2, PadY: 3, PadLB: 4, PadRB: 5, PadLT: 6, PadRT: 7, PadView: 8, PadStart: 9, PadL3: 10, PadR3: 11, PadUp: 12, PadDown: 13, PadLeft: 14, PadRight: 15 };
const BLOQUEAR = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'ControlLeft', 'ControlRight']);
// Navegación de menús: botón -> acción (la cruceta y el stick izquierdo repiten al mantenerse)
const NAV_BOTON = { PadA: 'ok', PadB: 'atras', PadX: 'x', PadY: 'y', PadLB: 'lb', PadRB: 'rb', PadLT: 'lt', PadRT: 'rt', PadStart: 'menu', PadView: 'vista' };
const NAV_DIR = { PadUp: 'arriba', PadDown: 'abajo', PadLeft: 'izq', PadRight: 'der' };

export class Entrada {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.teclas = new Set();
    this.pulsos = new Set();
    this.izq = { x: 0, y: 0 };
    this.der = { x: 0, y: 0 };
    this.mdx = 0;
    this.mdy = 0;
    this.mIzq = { x: 0, y: 0 };
    this.mDer = { x: 0, y: 0 };
    this.gIzq = 0; // gatillos analógicos 0..1
    this.gDer = 0;
    this.mando = null;
    this.padEst = {};
    this.alMando = null;
    this.alNav = null; // (accion) para los menús: arriba abajo izq der ok atras x y lb rb lt rt menu vista
    this.alFuente = null; // (true = mando, false = teclado/ratón/táctil) para mostrar las pistas correctas
    this.usoMando = false;
    this.vibracion = true;
    this._navDir = '';
    this._navT = 0;
    this._primera = true; // primer cuadro con mando: lo que ya estaba pulsado no cuenta como pulsación nueva
    this._vibT = {};
    this.cx = 0;
    this.cy = 0;
    this.ratonMovido = false;
    this.izqRaton = false;
    this.derRaton = false;
    this.alTecla = null;
    this.activa = false;
    this.tactil = false;
    this._unirTeclado();
    this._unirRaton();
    this._unirTactil();
    this._unirMando();
  }

  // ---- Mando (Gamepad API, mapeo estándar Xbox / PlayStation)
  _unirMando() {
    addEventListener('gamepadconnected', (e) => {
      if (this.mando) return;
      this.mando = e.gamepad;
      this._fuente(true);
      if (this.alMando) this.alMando(true, e.gamepad.id);
    });
    addEventListener('gamepaddisconnected', () => {
      if (this.mando) this._desconectar();
    });
  }

  // Suelta todo lo del mando para que no quede ninguna entrada pegada
  _desconectar() {
    this.mando = null;
    this.mIzq.x = this.mIzq.y = this.mDer.x = this.mDer.y = 0;
    this.gIzq = this.gDer = 0;
    this._navDir = '';
    for (const c of CODIGOS_MANDO) { this.teclas.delete(c); this.padEst[c] = false; }
    this.usoMando = false;
    this._primera = true;
    if (this.alMando) this.alMando(false, '');
  }

  _fuente(mando) {
    if (this.usoMando === mando) return;
    this.usoMando = mando;
    if (this.alFuente) this.alFuente(mando);
  }

  // Zona muerta circular y curva suave (precisión al centro, fuerza al borde)
  _stick(x, y, salida) {
    const m = Math.hypot(x, y), ZM = 0.15;
    if (m < ZM) { salida.x = salida.y = 0; return; }
    const f = Math.pow(Math.min(1, (m - ZM) / (1 - ZM)), 1.5) / m;
    salida.x = x * f;
    salida.y = y * f;
  }

  // Prefiere un mando con mapeo estándar (Xbox); si no, el primero conectado
  _elegirMando() {
    let g = null;
    try {
      const l = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of l) {
        if (!p || !p.connected) continue;
        if (p.mapping === 'standard') return p;
        if (!g) g = p;
      }
    } catch (e) { g = null; }
    return g;
  }

  // Se llama una vez por frame, también en pausa y en los menús
  leerMando() {
    const g = this._elegirMando();
    if (!g) {
      if (this.mando) this._desconectar();
      return;
    }
    if (!this.mando) { this.mando = g; this._fuente(true); if (this.alMando) this.alMando(true, g.id); }
    this.pad = g;
    const a = g.axes || [], b = g.buttons || [];
    const val = (i) => (b[i] ? (b[i].value !== undefined ? b[i].value : (b[i].pressed ? 1 : 0)) : 0);
    // histéresis: pulsa al 35 %, suelta por debajo del 20 % (evita rebotes en los gatillos)
    const pres = (c) => {
      const i = BOTON_MANDO[c];
      if (!b[i]) return false;
      const v = val(i);
      return b[i].pressed || v > 0.35 || (this.padEst[c] && v > 0.2);
    };
    this._stick(a[0] || 0, a[1] || 0, this.mIzq);
    this._stick(a[2] || 0, a[3] || 0, this.mDer);
    this.gIzq = val(6);
    this.gDer = val(7);
    let uso = Math.hypot(this.mIzq.x, this.mIzq.y, this.mDer.x, this.mDer.y) > 0.3;
    // flanco = pulso (una vez por pulsación); si algo vació las teclas con el botón aún pulsado, se repone sin pulso
    for (const c of CODIGOS_MANDO) {
      const e = pres(c);
      const flanco = e && !this.padEst[c] && !this._primera;
      this.padEst[c] = e;
      if (e) uso = true;
      if (flanco) {
        this._poner(c);
        if (this.alNav && NAV_BOTON[c]) this.alNav(NAV_BOTON[c]);
      } else if (e) this.teclas.add(c);
      else this.teclas.delete(c);
    }
    this._primera = false;
    if (uso) this._fuente(true);
    this._leerNavegacion();
  }

  // Cruceta o stick izquierdo -> arriba/abajo/izq/der con repetición (menús)
  _leerNavegacion() {
    if (!this.alNav) return;
    let d = '';
    for (const c in NAV_DIR) if (this.padEst[c]) d = NAV_DIR[c];
    if (!d) {
      const x = this.mIzq.x, y = this.mIzq.y;
      if (Math.hypot(x, y) > 0.45) d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'der' : 'izq') : (y > 0 ? 'abajo' : 'arriba');
    }
    const t = performance.now();
    if (!d) { this._navDir = ''; return; }
    if (d !== this._navDir) { this._navDir = d; this._navT = t + 380; this.alNav(d); }
    else if (t >= this._navT) { this._navT = t + 130; this.alNav(d); }
  }

  // Vibración dual-rumble. clave+espera limitan la frecuencia (ametralladora, alarma...).
  vibrar(fuerte, suave, ms = 100, clave = 'g', espera = ms * 0.8) {
    if (!this.vibracion || !this.pad || !this.mando) return;
    const t = performance.now();
    if (t - (this._vibT[clave] || 0) < espera) return;
    this._vibT[clave] = t;
    const p = this.pad, f = Math.min(1, fuerte), s = Math.min(1, suave);
    try {
      const v = p.vibrationActuator;
      if (v && v.playEffect) {
        const pr = v.playEffect(v.type || 'dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: f, weakMagnitude: s });
        if (pr && pr.catch) pr.catch(() => {});
      } else if (p.hapticActuators && p.hapticActuators[0] && p.hapticActuators[0].pulse) {
        const pr = p.hapticActuators[0].pulse(Math.max(f, s), ms);
        if (pr && pr.catch) pr.catch(() => {});
      }
    } catch (e) { /* sin vibración */ }
  }

  vibrarParar() {
    this._vibT = {};
    try {
      const v = this.pad && this.pad.vibrationActuator;
      if (v && v.reset) { const pr = v.reset(); if (pr && pr.catch) pr.catch(() => {}); }
    } catch (e) { /* nada */ }
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
    this.ratonMovido = false;
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
      this._fuente(false);
      if (BLOQUEAR.has(e.code) && this.activa) e.preventDefault();
      if (!e.repeat) this._poner(e.code);
    });
    addEventListener('keyup', (e) => this.teclas.delete(e.code));
    addEventListener('blur', () => this.soltarTodo());
  }

  _unirRaton() {
    const l = this.lienzo;
    addEventListener('mousemove', (e) => {
      if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 2) this._fuente(false);
      if (!this.activa) return;
      this.cx = (e.clientX / innerWidth) * 2 - 1;
      this.cy = -((e.clientY / innerHeight) * 2 - 1);
      this.ratonMovido = true;
      this.mdx += e.movementX || 0;
      this.mdy += e.movementY || 0;
    });
    addEventListener('pointerdown', () => this._fuente(false), true);
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
