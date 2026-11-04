// =============================================================
//  ENTRADA: teclado, ratón/táctil y mando -> "controles" por jugador.
//  La simulación sólo lee Entrada.ctl(i) ({ax,ay,dx,dy,fuego,hab});
//  para un segundo jugador local bastaría rellenar Entrada.ctl(1).
// =============================================================
const Entrada = (() => {
  const W = CONFIG.ancho, H = CONFIG.alto;
  const teclas = new Set(), pulsadas = new Set();
  let lienzo = null, capturando = null;
  let eventos = [];                       // eventos de puntero para los menús
  let dragId = null, dragX = 0, dragY = 0, dx = 0, dy = 0;
  const ptrBoton = {};                    // id de puntero -> 'hab' | 'fuego' | 'pausa'
  let habBorde = false, pausaBorde = false, chatBorde = false, fuegoTactil = 0, ratonDown = false;
  let tUltTeclado = 0, tUltToque = 0, ultimoToque = false;
  const ctls = [{ ax: 0, ay: 0, dx: 0, dy: 0, fuego: false, hab: false }, { ax: 0, ay: 0, dx: 0, dy: 0, fuego: false, hab: false }];
  const navT = { arriba: 0, abajo: 0, izq: 0, der: 0 };
  const nav = { arriba: false, abajo: false, izq: false, der: false, ok: false, atras: false, pestIzq: false, pestDer: false, menu: false };
  const SIN_SCROLL = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  const aj = () => Datos.aj;

  // Botones táctiles (se recalculan según ajustes)
  const botones = {
    hab: { x: 0, y: 0, r: 0, ver: false }, fuego: { x: 0, y: 0, r: 0, ver: false }, pausa: { x: W - 34, y: 34, r: 24, ver: true }, chat: { x: W - 84, y: 34, r: 20, ver: false },
  };
  function calcularBotones() {
    const a = aj(), e = a.tactilEscala, y = 570 + a.tactilY * 180, r = 44 * e;
    const izq = 66 * e + 8, der = W - 66 * e - 8;
    const hab = botones.hab, fu = botones.fuego;
    hab.r = r; hab.y = y; hab.x = a.zurdo ? izq : der;
    fu.r = r * 1.15; fu.y = y - (a.autoDisparo ? 0 : 0); fu.x = a.zurdo ? der : izq;
    hab.ver = fu.ver = Entrada.mostrarTactil();
    fu.ver = hab.ver && !a.autoDisparo;
  }

  function aVirtual(e) {
    const r = lienzo.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  const dentro = (b, p) => b.ver && Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 6;

  function configurar(canvas) {
    lienzo = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      tUltTeclado = performance.now(); ultimoToque = false;
      if (capturando) { e.preventDefault(); const f = capturando; capturando = null; f(e.code); return; }
      if (SIN_SCROLL.includes(e.code) && e.target === document.body) e.preventDefault();
      if (!e.repeat) pulsadas.add(e.code);
      teclas.add(e.code);
    });
    window.addEventListener('keyup', (e) => teclas.delete(e.code));
    window.addEventListener('blur', () => { teclas.clear(); dragId = null; for (const k in ptrBoton) delete ptrBoton[k]; fuegoTactil = 0; ratonDown = false; });
    window.addEventListener('pointerdown', (e) => {
      if (e.target !== lienzo && e.target !== document.body && e.target !== document.documentElement) return;
      const tocando = e.pointerType !== 'mouse';
      if (tocando) { tUltToque = performance.now(); ultimoToque = true; }
      const p = aVirtual(e);
      eventos.push({ t: 'd', x: p.x, y: p.y, id: e.pointerId });
      if (!Entrada.juego) return;
      calcularBotones();
      if (dentro(botones.chat, p)) { ptrBoton[e.pointerId] = 'chat'; chatBorde = true; return; }
      if (dentro(botones.pausa, p)) { ptrBoton[e.pointerId] = 'pausa'; pausaBorde = true; return; }
      if (dentro(botones.hab, p)) { ptrBoton[e.pointerId] = 'hab'; habBorde = true; return; }
      if (dentro(botones.fuego, p)) { ptrBoton[e.pointerId] = 'fuego'; fuegoTactil++; return; }
      if (e.pointerType === 'mouse') ratonDown = true;
      if (dragId === null) { dragId = e.pointerId; dragX = e.clientX; dragY = e.clientY; }
    });
    window.addEventListener('pointermove', (e) => {
      if (lienzo) { const p = aVirtual(e); eventos.push({ t: 'm', x: p.x, y: p.y, id: e.pointerId, b: e.buttons }); }
      if (e.pointerId !== dragId) return;
      const r = lienzo.getBoundingClientRect(), k = 1.4 * aj().sens;
      dx += (e.clientX - dragX) * W / r.width * k;
      dy += (e.clientY - dragY) * H / r.height * k * (aj().invertirY ? -1 : 1);
      dragX = e.clientX; dragY = e.clientY;
    });
    const soltar = (e) => {
      const p = aVirtual(e);
      eventos.push({ t: 'u', x: p.x, y: p.y, id: e.pointerId });
      if (ptrBoton[e.pointerId] === 'fuego') fuegoTactil = Math.max(0, fuegoTactil - 1);
      delete ptrBoton[e.pointerId];
      if (e.pointerId === dragId) dragId = null;
      if (e.pointerType === 'mouse') ratonDown = false;
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('wheel', (e) => { eventos.push({ t: 'w', dy: e.deltaY }); }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function padCrudo() {
    const l = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < l.length; i++) if (l[i] && l[i].connected) return l[i];
    return null;
  }
  const ABloq = () => !!(window.Amigos && Amigos.mandoBloqueado && Amigos.mandoBloqueado());
  function zona(x, y, z) {
    const m = Math.hypot(x, y);
    if (m < z) return 0;
    const k = Math.min(1, (m - z) / (1 - z)) / m;
    return k;
  }
  const tec = (accion) => { const l = aj().teclas[accion] || []; for (let i = 0; i < l.length; i++) if (teclas.has(l[i])) return true; return false; };
  const tecPulsada = (accion) => { const l = aj().teclas[accion] || []; for (let i = 0; i < l.length; i++) if (pulsadas.has(l[i])) return true; return false; };

  function actualizar(dt) {
    const M = window.Mando, a = aj();
    calcularBotones();
    // ---- controles de juego (jugador 0)
    const c = ctls[0];
    let ax = 0, ay = 0;
    if (tec('izq')) ax -= 1; if (tec('der')) ax += 1; if (tec('arriba')) ay -= 1; if (tec('abajo')) ay += 1;
    let fuegoPad = false, habPad = false, pausaPad = false;
    const p = M && M.conectado ? padCrudo() : null;
    if (p) {
      const sx = p.axes[0] || 0, sy = p.axes[1] || 0, k = zona(sx, sy, a.zona);
      ax += sx * k; ay += sy * k;
      if (M.sostenido('IZQ')) ax -= 1; if (M.sostenido('DER')) ax += 1; if (M.sostenido('ARRIBA')) ay -= 1; if (M.sostenido('ABAJO')) ay += 1;
      fuegoPad = (!ABloq() && M.sostenido('A')) || M.gatillo.der > 0.35 || M.sostenido('RT');
      habPad = M.pulsado('X') || M.pulsado('LB') || M.pulsado('RB') || M.pulsado('LT');
      pausaPad = M.pulsado('MENU');
    }
    const m = Math.hypot(ax, ay);
    if (m > 1) { ax /= m; ay /= m; }
    const sk = 0.5 + 0.5 * a.sens;
    c.ax = ax * sk * (1); c.ay = ay * sk * (a.invertirY ? -1 : 1);
    if (Math.hypot(c.ax, c.ay) > 1.5) { const q = 1.5 / Math.hypot(c.ax, c.ay); c.ax *= q; c.ay *= q; }
    c.dx += dx; c.dy += dy; dx = dy = 0;
    c.fuego = a.autoDisparo || tec('fuego') || fuegoPad || fuegoTactil > 0 || (ratonDown && !a.autoDisparo);
    if (tecPulsada('hab') || habPad || habBorde) c.hab = true;
    habBorde = false;
    Entrada.pausaPulsada = tecPulsada('pausa') || pausaPad || pausaBorde;
    pausaBorde = false;
    Entrada.chatPulsado = pulsadas.has('KeyC') || !!(p && M.pulsado('Y')) || chatBorde; chatBorde = false;

    // ---- navegación de menús (con repetición al mantener)
    const h = (n, tk, pd, st) => {
      const pulsado = tk || pd || (st && Math.abs(st) > 0.6);
      if (!pulsado) { navT[n] = 0; return false; }
      if (navT[n] === 0) { navT[n] = 0.38; return true; }
      navT[n] -= dt; if (navT[n] <= 0) { navT[n] = 0.1; return true; }
      return false;
    };
    const sx2 = p ? p.axes[0] : 0, sy2 = p ? p.axes[1] : 0;
    nav.arriba = h('arriba', teclas.has('ArrowUp') || teclas.has('KeyW'), p && M.sostenido('ARRIBA'), sy2 < 0 ? sy2 : 0);
    nav.abajo = h('abajo', teclas.has('ArrowDown') || teclas.has('KeyS'), p && M.sostenido('ABAJO'), sy2 > 0 ? sy2 : 0);
    nav.izq = h('izq', teclas.has('ArrowLeft') || teclas.has('KeyA'), p && M.sostenido('IZQ'), sx2 < 0 ? sx2 : 0);
    nav.der = h('der', teclas.has('ArrowRight') || teclas.has('KeyD'), p && M.sostenido('DER'), sx2 > 0 ? sx2 : 0);
    nav.ok = pulsadas.has('Enter') || pulsadas.has('Space') || pulsadas.has('NumpadEnter') || !!(p && !ABloq() && M.pulsado('A'));
    nav.atras = pulsadas.has('Escape') || pulsadas.has('Backspace') || !!(p && !ABloq() && M.pulsado('B'));
    nav.pestIzq = pulsadas.has('KeyQ') || !!(p && M.pulsado('LB'));
    nav.pestDer = pulsadas.has('KeyE') || !!(p && M.pulsado('RB'));
    nav.menu = !!(p && M.pulsado('MENU'));
  }

  const Entrada = {
    configurar, actualizar, nav, botones, juego: false, pausaPulsada: false, chatPulsado: false,
    ctl: (i) => ctls[i || 0],
    tomarEventos() { const e = eventos; eventos = []; return e; },
    limpiarEventos() { eventos.length = 0; },
    pulso: (...cod) => cod.some((c) => pulsadas.has(c)),
    capturarTecla(fn) { capturando = fn; },
    cancelarCaptura() { capturando = null; },
    finDeCuadro() { pulsadas.clear(); },
    reiniciarJuego() { dx = dy = 0; habBorde = false; for (const c of ctls) { c.dx = c.dy = 0; c.hab = false; } },
    soltarTodo() { dragId = null; fuegoTactil = 0; ratonDown = false; for (const k in ptrBoton) delete ptrBoton[k]; },
    // 'tactil' | 'mando' | 'teclado': el último que se usó
    dispositivo() {
      const M = window.Mando, tm = M && M.activo ? M._ultimoUso : 0;
      if (tUltToque >= tUltTeclado && tUltToque >= tm && tUltToque > 0) return 'tactil';
      if (tm > tUltTeclado && tm > tUltToque) return 'mando';
      if (tUltTeclado === 0 && tm === 0 && Datos.tactil) return 'tactil';
      return 'teclado';
    },
    mostrarTactil() { return Entrada.dispositivo() === 'tactil'; },
    codigoNombre(c) {
      return String(c).replace('Key', '').replace('Arrow', 'Flecha ').replace('Digit', '').replace('Space', 'Espacio').replace('Escape', 'Esc')
        .replace('ShiftLeft', 'Shift izq').replace('ShiftRight', 'Shift der').replace('ControlLeft', 'Ctrl izq').replace('Enter', 'Intro');
    },
  };
  return Entrada;
})();
