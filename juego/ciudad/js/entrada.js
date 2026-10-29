// =============================================================
//  🎮  CONTROLES
//  Teclado: WASD / flechas manejar o caminar, Espacio freno de mano,
//  E subir/bajar, H claxon, R radio, M mapa, P/Esc pausa, Shift correr.
//  Mando Xbox (Gamepad API, via ../comun/mando.js): se traduce a teclas
//  virtuales y a ejes analogicos; ver leerMando().
//  Celular: joystick a la izquierda (empuja hacia donde quieres ir)
//  y botones a la derecha.
// =============================================================
const Entrada = (() => {
  const teclas = new Set();     // teclas mantenidas
  const pulsadas = new Set();   // teclas pulsadas en este cuadro
  const botonesMantenidos = new Map(); // pointerId -> código de tecla
  let toques = [];
  let tactil = false;
  let ultimoTeclado = 0;

  const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
  let zona = null, base = null, palanca = null;
  const RADIO_JOY = 56;

  // ---- Mando Xbox
  const virtMant = new Set();   // teclas virtuales mantenidas por el mando
  const nulo = () => ({ usa: false, x: 0, y: 0, fuerza: 0, rx: 0, ry: 0, rfuerza: 0, gatillo: 0, freno: 0, cursor: { x: 0, y: 0 } });
  let mdo = nulo();
  let contexto = { modo: 'titulo', carro: false };
  let estabaConectado = false;
  let modoPrevio = '';
  let idxMenu = 0;
  let stickMenuPrev = 0;
  let toastEl = null, toastT = 0;
  let alDesconectar = null;
  const MENUS = { pausa: '#pausa .acciones button', tienda: '#tienda .acciones button' };

  const SIN_DESPLAZAR = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  function mostrarTactil() {
    if (tactil) return;
    tactil = true;
    document.body.classList.add('tactil');
  }

  function ocultarTactil() {
    if (!tactil) return;
    tactil = false;
    document.body.classList.remove('tactil');
    soltarTodo();
  }

  function configurar() {
    window.addEventListener('keydown', (e) => {
      if (SIN_DESPLAZAR.includes(e.code)) e.preventDefault();
      if (!e.repeat) pulsadas.add(e.code);
      teclas.add(e.code);
      ultimoTeclado = performance.now();
      mandoDejaDeUsarse();
      // Una tecla física (no un botón de pantalla): volvemos a los controles de teclado
      ocultarTactil();
    });
    window.addEventListener('keyup', (e) => teclas.delete(e.code));
    window.addEventListener('blur', soltarTodo);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Solo se activa con un toque real (las laptops con pantalla táctil siguen con teclado)
    const tocarPantalla = () => { mandoDejaDeUsarse(); mostrarTactil(); };
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') tocarPantalla(); }, true);
    window.addEventListener('touchstart', tocarPantalla, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) soltarTodo(); });
    toastEl = document.createElement('div');
    toastEl.id = 'avisoMando';
    toastEl.className = 'oculto';
    document.body.appendChild(toastEl);

    // Joystick: aparece donde pones el dedo (mitad izquierda de la pantalla)
    zona = document.getElementById('zonaJoy');
    base = document.getElementById('joyBase');
    palanca = document.getElementById('joyPalanca');
    if (zona) {
      zona.addEventListener('pointerdown', (e) => {
        if (joy.id !== null) return;
        e.preventDefault();
        joy.id = e.pointerId;
        joy.cx = e.clientX;
        joy.cy = e.clientY;
        joy.x = 0;
        joy.y = 0;
        try { zona.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
        base.style.left = joy.cx + 'px';
        base.style.top = joy.cy + 'px';
        base.classList.add('activo');
        moverPalanca();
      });
      zona.addEventListener('pointermove', (e) => {
        if (e.pointerId !== joy.id) return;
        let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
        const d = Math.hypot(dx, dy);
        if (d > RADIO_JOY) {
          // La base "persigue" al dedo si se aleja mucho
          const sobra = d - RADIO_JOY;
          joy.cx += dx / d * sobra;
          joy.cy += dy / d * sobra;
          base.style.left = joy.cx + 'px';
          base.style.top = joy.cy + 'px';
          dx = e.clientX - joy.cx; dy = e.clientY - joy.cy;
        }
        joy.x = dx / RADIO_JOY;
        joy.y = dy / RADIO_JOY;
        moverPalanca();
      });
      const fin = (e) => { if (e.pointerId === joy.id) soltarJoy(); };
      zona.addEventListener('pointerup', fin);
      zona.addEventListener('pointercancel', fin);
      zona.addEventListener('lostpointercapture', fin);
    }

    // Botones de la derecha: funcionan como teclas
    document.querySelectorAll('[data-tecla]').forEach((b) => {
      const codigo = b.dataset.tecla;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        botonesMantenidos.set(e.pointerId, codigo);
        pulsadas.add(codigo);
        b.classList.add('apretado');
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
      });
      const soltar = (e) => {
        if (botonesMantenidos.get(e.pointerId) === codigo) botonesMantenidos.delete(e.pointerId);
        b.classList.remove('apretado');
      };
      b.addEventListener('pointerup', soltar);
      b.addEventListener('pointercancel', soltar);
      b.addEventListener('lostpointercapture', soltar);
    });
  }

  // Suelta teclas, botones y joystick (al pausar, abrir el mapa o perder el foco)
  function soltarTodo() {
    teclas.clear();
    virtMant.clear();
    mdo = nulo();
    botonesMantenidos.clear();
    document.querySelectorAll('[data-tecla].apretado').forEach((b) => b.classList.remove('apretado'));
    soltarJoy();
  }

  function soltarJoy() {
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    if (base) {
      base.classList.remove('activo');
      base.style.left = '';
      base.style.top = '';
    }
    moverPalanca();
  }

  function moverPalanca() {
    if (!palanca) return;
    const x = Util.limitar(joy.x, -1, 1) * RADIO_JOY * 0.8;
    const y = Util.limitar(joy.y, -1, 1) * RADIO_JOY * 0.8;
    palanca.style.transform = `translate(${x}px, ${y}px)`;
  }

  function mantenida(codigo) {
    if (teclas.has(codigo) || virtMant.has(codigo)) return true;
    for (const c of botonesMantenidos.values()) if (c === codigo) return true;
    return false;
  }


  // ------------------------------------------------------------ Mando Xbox
  function hayMando() {
    return !!(window.Mando && Mando.conectado && Mando.activo && !tactil);
  }

  function mandoDejaDeUsarse() {
    if (!window.Mando || !Mando.activo) return;
    Mando.activo = false;
    document.body.classList.remove('mando');
    virtMant.clear();
    mdo = nulo();
  }

  function aviso(texto) {
    if (!toastEl) return;
    toastEl.textContent = texto;
    toastEl.classList.remove('oculto');
    toastT = performance.now() + 2600;
  }

  function limpiarMenu() {
    document.querySelectorAll('.mando-sel').forEach((e) => e.classList.remove('mando-sel'));
  }

  // Cruceta / stick arriba-abajo para recorrer los botones de pausa y armeria
  function navegarMenu(modo) {
    const lista = Array.from(document.querySelectorAll(MENUS[modo])).filter((b) => !b.disabled && b.offsetParent !== null);
    if (!lista.length) return;
    if (modo !== modoPrevio) idxMenu = 0;
    const sy = Mando.ejes.izq.y;
    const flanco = Math.abs(sy) > 0.6 ? Math.sign(sy) : 0;
    let paso = 0;
    if (Mando.pulsado('ABAJO')) paso = 1;
    else if (Mando.pulsado('ARRIBA')) paso = -1;
    else if (flanco && flanco !== stickMenuPrev) paso = flanco;
    stickMenuPrev = flanco;
    idxMenu = Util.limitar(idxMenu, 0, lista.length - 1);
    if (paso) idxMenu = (idxMenu + paso + lista.length) % lista.length;
    const sel = lista[idxMenu];
    document.querySelectorAll('.mando-sel').forEach((e) => { if (e !== sel) e.classList.remove('mando-sel'); });
    sel.classList.add('mando-sel');
    if (Mando.pulsado('A')) sel.click();
  }

  // Se llama una vez por cuadro, antes de actualizar el juego
  function leerMando() {
    if (toastT && performance.now() > toastT) { toastT = 0; if (toastEl) toastEl.classList.add('oculto'); }
    if (!window.Mando) return;
    Mando.leer();
    if (Mando.conectado !== estabaConectado) {
      estabaConectado = Mando.conectado;
      if (estabaConectado) {
        aviso('Mando conectado');
      } else {
        aviso('Mando desconectado');
        const estaba = Mando.activo;
        Mando.activo = false;
        document.body.classList.remove('mando');
        soltarTodo();
        limpiarMenu();
        if (estaba && alDesconectar) alDesconectar();
      }
    }
    virtMant.clear();
    mdo = nulo();
    if (!Mando.conectado || document.hidden) return;
    if (Mando.activo && tactil) ocultarTactil();
    document.body.classList.toggle('mando', Mando.activo && !tactil);
    if (!Mando.activo) return;

    const modo = contexto.modo, carro = contexto.carro;
    const P = Mando.pulsado, S = Mando.sostenido;
    const izq = Mando.ejes.izq, der = Mando.ejes.der;
    mdo.usa = true;

    if (MENUS[modo]) {
      navegarMenu(modo);
      if (Mando.pulsado('B') || Mando.pulsado('MENU')) pulsadas.add('Escape');
    } else {
      if (modoPrevio in MENUS) limpiarMenu();
      if (modo === 'titulo') {
        if (P('A') || P('MENU')) pulsadas.add('Enter');
      } else if (modo === 'mapa') {
        let cx = izq.x, cy = izq.y;
        if (S('IZQ')) cx -= 1;
        if (S('DER')) cx += 1;
        if (S('ARRIBA')) cy -= 1;
        if (S('ABAJO')) cy += 1;
        cx += der.x; cy += der.y;
        mdo.cursor = { x: Util.limitar(cx, -1, 1), y: Util.limitar(cy, -1, 1) };
        if (P('A')) pulsadas.add('MapaMarcar');
        if (P('B') || P('VISTA')) pulsadas.add('KeyM');
        if (P('MENU')) pulsadas.add('KeyP');
      } else if (modo === 'jugando') {
        if (P('A')) pulsadas.add('KeyE');
        if (P('VISTA')) pulsadas.add('KeyM');
        if (P('MENU')) pulsadas.add('KeyP');
        const cambio = P('Y') || P('LB') || P('RB') || P('IZQ') || P('DER');
        mdo.x = izq.x; mdo.y = izq.y;
        mdo.fuerza = Math.min(1, Math.hypot(izq.x, izq.y));
        mdo.rx = der.x; mdo.ry = der.y;
        mdo.rfuerza = Math.min(1, Math.hypot(der.x, der.y));
        mdo.gatillo = Mando.gatillo.der;
        mdo.freno = Mando.gatillo.izq;
        if (carro) {
          if (cambio) pulsadas.add('KeyR');
          if (S('X')) virtMant.add('KeyH');
          if (S('B')) virtMant.add('Space');
        } else {
          if (cambio) pulsadas.add('KeyQ');
          if (S('X') || Mando.gatillo.der > 0.5) virtMant.add('KeyF');
          if (S('L3')) virtMant.add('ShiftLeft');
        }
      }
    }
    modoPrevio = modo;
  }

  return {
    configurar,
    leerMando,
    vibrar(fuerte, suave, ms) { if (hayMando()) Mando.vibrar(fuerte, suave, ms); },
    // Lo llena juego.js cada cuadro: { modo, carro }
    set contexto(c) { contexto = c; },
    set alDesconectar(f) { alDesconectar = f; },
    // Estado analogico del mando ({usa, x, y, fuerza, rx, ry, rfuerza, gatillo, freno, cursor})
    get mando() { return mdo; },
    get hayMando() { return hayMando(); },
    soltarTodo,
    get tactil() { return tactil; },
    get usandoTeclado() { return performance.now() - ultimoTeclado < 4000; },

    mantenida,
    // ¿Se pulsó alguna de estas teclas en este cuadro?
    pulso(...codigos) {
      return codigos.some((c) => pulsadas.has(c));
    },

    // Flechas/WASD como {x, y} entre -1 y 1 (pantalla)
    teclado() {
      let x = 0, y = 0;
      if (mantenida('ArrowLeft') || mantenida('KeyA')) x -= 1;
      if (mantenida('ArrowRight') || mantenida('KeyD')) x += 1;
      if (mantenida('ArrowUp') || mantenida('KeyW')) y -= 1;
      if (mantenida('ArrowDown') || mantenida('KeyS')) y += 1;
      return { x, y };
    },

    // Joystick táctil: {x, y, fuerza} con fuerza de 0 a 1
    joystick() {
      const f = Math.min(1, Math.hypot(joy.x, joy.y));
      return { x: joy.x, y: joy.y, fuerza: joy.id === null ? 0 : f };
    },

    agregarToque(x, y) { toques.push({ x, y }); },
    tomarToques() {
      const t = toques;
      toques = [];
      return t;
    },

    finDeCuadro() {
      pulsadas.clear();
    },

    // Para pruebas automáticas
    simularTecla(codigo, abajo) {
      if (abajo) { teclas.add(codigo); pulsadas.add(codigo); } else teclas.delete(codigo);
    },
  };
})();
