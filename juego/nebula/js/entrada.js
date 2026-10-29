// =============================================================
//  🎮  CONTROLES
//  Teclado: flechas o WASD para moverse, P/Esc pausa, M silencio,
//  N música (prender/apagar).
//  Celular/ratón: arrastra en cualquier parte de la pantalla.
//  La nave dispara sola.
// =============================================================
const Entrada = (() => {
  const teclas = new Set();     // teclas mantenidas
  const pulsadas = new Set();   // teclas pulsadas en este cuadro
  let toques = [];              // toques/clics nuevos (en coordenadas del juego)

  let lienzo = null;
  let W = 1, H = 1;
  let punteroId = null;
  let ultimoX = 0, ultimoY = 0;
  let arrastreX = 0, arrastreY = 0;

  const TECLAS_SIN_SCROLL = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

  function aVirtual(e) {
    const r = lienzo.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * W / r.width,
      y: (e.clientY - r.top) * H / r.height,
    };
  }

  function configurar(canvas, ancho, alto) {
    lienzo = canvas;
    W = ancho;
    H = alto;

    window.addEventListener('keydown', (e) => {
      if (TECLAS_SIN_SCROLL.includes(e.code)) e.preventDefault();
      if (!e.repeat) pulsadas.add(e.code);
      teclas.add(e.code);
    });
    window.addEventListener('keyup', (e) => teclas.delete(e.code));
    window.addEventListener('blur', () => {
      teclas.clear();
      punteroId = null;
    });

    // Escuchamos en toda la ventana: así puedes arrastrar aunque el dedo
    // empiece fuera del área del juego.
    window.addEventListener('pointerdown', (e) => {
      toques.push(aVirtual(e));
      if (punteroId === null) {
        punteroId = e.pointerId;
        ultimoX = e.clientX;
        ultimoY = e.clientY;
      }
    });
    window.addEventListener('pointermove', (e) => {
      // Si se soltó el dedo que mandaba pero otro sigue apoyado, ese toma el control
      if (punteroId === null && e.buttons) {
        punteroId = e.pointerId;
        ultimoX = e.clientX;
        ultimoY = e.clientY;
        return;
      }
      if (e.pointerId !== punteroId) return;
      const r = lienzo.getBoundingClientRect();
      arrastreX += (e.clientX - ultimoX) * W / r.width;
      arrastreY += (e.clientY - ultimoY) * H / r.height;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
    });
    const soltar = (e) => {
      if (e.pointerId === punteroId) punteroId = null;
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    configurar,

    // Dirección de las teclas: x e y entre -1 y 1
    eje() {
      let x = 0, y = 0;
      if (teclas.has('ArrowLeft') || teclas.has('KeyA')) x -= 1;
      if (teclas.has('ArrowRight') || teclas.has('KeyD')) x += 1;
      if (teclas.has('ArrowUp') || teclas.has('KeyW')) y -= 1;
      if (teclas.has('ArrowDown') || teclas.has('KeyS')) y += 1;
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      // Mando Xbox: stick izquierdo (analógico) o cruceta, misma velocidad máxima
      const M = window.Mando;
      if (M && M.conectado) {
        let mx = M.ejes.izq.x, my = M.ejes.izq.y;
        if (M.sostenido('IZQ')) mx -= 1;
        if (M.sostenido('DER')) mx += 1;
        if (M.sostenido('ARRIBA')) my -= 1;
        if (M.sostenido('ABAJO')) my += 1;
        x += mx; y += my;
        const m = Math.hypot(x, y);
        if (m > 1) { x /= m; y /= m; }
      }
      return { x, y };
    },

    // Cuánto se arrastró desde la última vez que se preguntó
    tomarArrastre() {
      const d = { x: arrastreX, y: arrastreY };
      arrastreX = 0;
      arrastreY = 0;
      return d;
    },

    // ¿Se pulsó alguna de estas teclas en este cuadro?
    pulso(...codigos) {
      return codigos.some((c) => pulsadas.has(c));
    },

    tomarToques() {
      const t = toques;
      toques = [];
      return t;
    },

    finDeCuadro() {
      pulsadas.clear();
    },
  };
})();
