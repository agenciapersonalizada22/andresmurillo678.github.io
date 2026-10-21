// =============================================================
//  🎮  CONTROLES
//  Teclado: WASD / flechas manejar o caminar, Espacio freno de mano,
//  E subir/bajar, H claxon, R radio, M mapa, P/Esc pausa, Shift correr.
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
      // Una tecla física (no un botón de pantalla): volvemos a los controles de teclado
      ocultarTactil();
    });
    window.addEventListener('keyup', (e) => teclas.delete(e.code));
    window.addEventListener('blur', soltarTodo);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Solo se activa con un toque real (las laptops con pantalla táctil siguen con teclado)
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') mostrarTactil(); }, true);
    window.addEventListener('touchstart', mostrarTactil, { capture: true, passive: true });

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
    if (teclas.has(codigo)) return true;
    for (const c of botonesMantenidos.values()) if (c === codigo) return true;
    return false;
  }

  return {
    configurar,
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
