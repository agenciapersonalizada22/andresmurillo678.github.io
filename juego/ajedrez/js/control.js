// =============================================================
//  🎮  CONTROL DE XBOX
//  Usa window.Mando (juego/comun/mando.js). Dos contextos:
//   · tablero: cursor de casilla (stick izq. / cruceta), A elige y mueve,
//     B cancela, X deshacer, Y pista, LB/RB historial, stick der. cámara,
//     LT/RT zoom, VISTA cambia la vista, MENU abre Ajustes.
//   · pantallas (inicio, ajustes, coronación, fin...): cruceta/stick
//     mueve el foco, A pulsa, B vuelve/cierra.
//  Todo se lee una vez por cuadro y solo con flancos (no dispara dos veces).
// =============================================================

const RETARDO = 380;      // ms antes de empezar a repetir al mantener
const REPETIR = 130;      // ms entre repeticiones en el tablero
const REPETIR_MENU = 190; // ms entre repeticiones en pantallas
const UMBRAL = 0.5;
const PANTALLAS = ['Inicio', 'Ajustes', 'Coronar', 'Fin', 'Stats', 'Texto', 'Confirmar']; // orden DOM (la última queda encima)
const FOCO = 'button, select, input[type="checkbox"], input[type="range"], summary';

const $ = (id) => document.getElementById(id);
const pista = (b, t) => `<span><b class="${b}">${b}</b>${t}</span>`;

export function iniciarControl(ctx) {
  const M = window.Mando;
  if (!M) return null;
  const { juego, vista, ui } = ctx;

  let cursor = -1;           // casilla del cursor (-1 = recalcular al mostrar)
  let dirAntes = '';
  let proxima = 0;           // instante del siguiente paso al mantener
  let conectadoAntes = false;
  let ultimaPantalla = '';
  let htmlPistas = '';
  let tAntes = performance.now();

  // ---- el jugador vuelve al ratón, teclado o toque: se ocultan pistas y cursor
  const dejar = (e) => { if (e.isTrusted) M.activo = false; };
  window.addEventListener('pointerdown', dejar, true);
  window.addEventListener('keydown', dejar, true);
  let px = -1, py = -1;
  window.addEventListener('pointermove', (e) => {
    if (e.isTrusted && px >= 0 && Math.hypot(e.clientX - px, e.clientY - py) > 6) M.activo = false;
    px = e.clientX; py = e.clientY;
  }, true);
  window.addEventListener('gamepaddisconnected', () => { M.activo = false; });

  const reposo = () => { dirAntes = ''; proxima = 0; };
  document.addEventListener('visibilitychange', reposo);
  window.addEventListener('blur', reposo);

  function pantallaArriba() {
    for (let i = PANTALLAS.length - 1; i >= 0; i--) {
      if (!$('pantalla' + PANTALLAS[i]).classList.contains('oculto')) return PANTALLAS[i];
    }
    return '';
  }

  // ---- dirección discreta (cruceta + stick izquierdo) con repetición
  function direccion(ahora, intervalo) {
    let dx = (M.sostenido('DER') ? 1 : 0) - (M.sostenido('IZQ') ? 1 : 0);
    let dy = (M.sostenido('ABAJO') ? 1 : 0) - (M.sostenido('ARRIBA') ? 1 : 0);
    if (!dx && !dy) {
      const s = M.ejes.izq;
      if (Math.abs(s.x) > UMBRAL) dx = Math.sign(s.x);
      if (Math.abs(s.y) > UMBRAL) dy = Math.sign(s.y);
    }
    const clave = dx + ',' + dy;
    if (!dx && !dy) { dirAntes = ''; return null; }
    if (clave !== dirAntes) { // nueva dirección: paso inmediato
      dirAntes = clave; proxima = ahora + RETARDO;
      return { dx, dy };
    }
    if (ahora >= proxima) { proxima = ahora + intervalo; return { dx, dy }; }
    return null;
  }

  // ---- tablero
  function cursorInicial() {
    const abajo = ctx.ladoInferior();
    return abajo === 0 ? 12 : 52; // e2 o e7 (delante del rey propio)
  }

  function moverCursor(d) {
    // pasa de direcciones de pantalla a archivo/fila según el giro (ajustado a 90°)
    const q = Math.round(vista.camara.tYaw / (Math.PI / 2));
    const cs = [1, 0, -1, 0][((q % 4) + 4) % 4], sn = [0, 1, 0, -1][((q % 4) + 4) % 4];
    const arriba = -d.dy;
    let nf = (cursor & 7) + (d.dx * cs - arriba * sn);
    let nr = (cursor >> 3) + (d.dx * sn + arriba * cs);
    nf = Math.max(0, Math.min(7, nf)); nr = Math.max(0, Math.min(7, nr));
    const n = nr * 8 + nf;
    if (n === cursor) { M.vibrar(0, 0.05, 15); return; } // tope del tablero
    cursor = n;
    M.vibrar(0, 0.12, 22);
    juego.cursor = cursor;
    ctx.marcas();
  }

  function tablero(ahora, dt) {
    if (cursor < 0) cursor = cursorInicial();
    const d = direccion(ahora, REPETIR);
    if (d) moverCursor(d);

    if (M.pulsado('A')) {
      if (cursor === juego.sel) { ctx.limpiarSeleccion(); ctx.marcas(); } else ctx.alPulsar(cursor, false);
    }
    if (M.pulsado('B')) {
      if (juego.sel >= 0) { ctx.limpiarSeleccion(); ctx.marcas(); }
      else if (juego.pista) { juego.pista = null; ctx.marcas(); }
    }
    if (M.pulsado('X')) ctx.deshacer();
    if (M.pulsado('Y')) ctx.accion('pista');
    if (M.pulsado('LB')) ctx.navegar('atras');
    if (M.pulsado('RB')) ctx.navegar('adelante');
    if (M.pulsado('VISTA')) ctx.accion('vista');
    if (M.pulsado('R3')) ctx.cambiarVista(juego.vista);
    if (M.pulsado('MENU')) ui.mostrar('Ajustes');

    const r = M.ejes.der;
    if (r.x || r.y) { vista.camara.girar(r.x * 420 * dt, r.y * 300 * dt); vista.pedir(); }
    const z = M.gatillo.der - M.gatillo.izq;
    if (Math.abs(z) > 0.08) { vista.camara.acercar(Math.exp(-z * dt * 1.6)); vista.pedir(); }
  }

  // ---- pantallas
  function visible(el) {
    if (el.disabled || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function focales(raiz) { return [...raiz.querySelectorAll(FOCO)].filter(visible); }

  function enfocarPorDefecto(nombre, raiz) {
    let el = null;
    if (nombre === 'Inicio') { const r = $('btnReanudar'); el = visible(r) ? r : $('btnEmpezar'); }
    else if (nombre === 'Fin') el = visible($('btnRevancha')) ? $('btnRevancha') : $('btnFinNueva');
    else if (nombre === 'Confirmar') el = $('btnConfNo');
    else if (nombre === 'Texto') el = $('btnTextoCerrar');
    else if (nombre === 'Stats') el = $('btnCerrarStats');
    if (!el || !visible(el)) el = focales(raiz)[0];
    if (el) el.focus();
  }

  function moverFoco(raiz, d) {
    const act = document.activeElement;
    const lista = focales(raiz);
    if (!lista.length) return;
    if (!act || !raiz.contains(act) || !lista.includes(act)) { lista[0].focus(); return; }
    const a = act.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let mejor = null, mejorP = Infinity;
    for (const el of lista) {
      if (el === act) continue;
      const r = el.getBoundingClientRect();
      const vx = r.left + r.width / 2 - ax, vy = r.top + r.height / 2 - ay;
      const along = vx * d.dx + vy * d.dy;
      if (along <= 2) continue;
      const perp = Math.abs(d.dx ? vy : vx);
      const p = along + perp * 2.5;
      if (p < mejorP) { mejorP = p; mejor = el; }
    }
    if (mejor) { mejor.focus(); M.vibrar(0, 0.1, 18); }
  }

  function ajustarValor(el, paso) {
    if (el.tagName === 'SELECT') {
      const n = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + paso));
      if (n === el.selectedIndex) return false;
      el.selectedIndex = n;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (el.type === 'range') {
      const v = Math.max(+el.min, Math.min(+el.max, +el.value + paso * 5));
      if (v === +el.value) return true;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }

  function pantallas(nombre, ahora) {
    const raiz = $('pantalla' + nombre);
    const cambio = nombre !== ultimaPantalla;
    ultimaPantalla = nombre;
    if (M.activo && (cambio || !raiz.contains(document.activeElement))) enfocarPorDefecto(nombre, raiz);

    const d = direccion(ahora, REPETIR_MENU);
    if (d) {
      const act = document.activeElement;
      const ajustable = act && (act.tagName === 'SELECT' || act.type === 'range');
      if (ajustable && d.dx && !d.dy && ajustarValor(act, d.dx)) M.vibrar(0, 0.1, 18);
      else if (d.dx && d.dy) moverFoco(raiz, Math.abs(M.ejes.izq.x) > Math.abs(M.ejes.izq.y) ? { dx: d.dx, dy: 0 } : { dx: 0, dy: d.dy });
      else moverFoco(raiz, d);
    }
    if (M.pulsado('A')) {
      const act = document.activeElement;
      if (act && raiz.contains(act)) {
        if (act.tagName === 'SELECT') ajustarValor(act, act.selectedIndex === act.options.length - 1 ? -act.selectedIndex : 1);
        else if (act.type !== 'range') act.click();
      }
    }
    if (M.pulsado('B')) {
      if (nombre === 'Inicio') { const r = $('btnReanudar'); if (visible(r)) r.click(); }
      else document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
    if (M.pulsado('MENU')) {
      if (nombre === 'Ajustes') ui.ocultar('Ajustes');
      else if (nombre === 'Inicio') ui.mostrar('Ajustes');
    }
  }

  // ---- pistas en pantalla
  function dibujarPistas(nombre) {
    let h;
    if (nombre) {
      h = pista('A', 'Aceptar') + pista('B', nombre === 'Inicio' ? 'Volver a la partida' : 'Atrás') + `<span><b>✥</b>Navegar</span>`;
    } else {
      h = pista('A', juego.sel >= 0 ? 'Mover' : 'Elegir') + pista('B', 'Cancelar') + pista('X', 'Deshacer') + pista('Y', 'Pista')
        + `<span><b>LB</b><b>RB</b>Jugadas</span><span><b>RS</b>Cámara</span><span><b>LT</b><b>RT</b>Zoom</span>`
        + `<span><b>≡</b>Ajustes</span>`;
    }
    if (h !== htmlPistas) { htmlPistas = h; $('pistasMando').innerHTML = h; }
  }

  function cuadro(ahora) {
    const dt = Math.min(0.05, Math.max(0.001, (ahora - tAntes) / 1000));
    tAntes = ahora;
    if (document.hidden) return;
    M.leer();
    if (M.conectado !== conectadoAntes) {
      conectadoAntes = M.conectado;
      ui.toast(M.conectado ? 'Mando conectado' : 'Mando desconectado');
      reposo();
      if (!M.conectado) M.activo = false;
      if (M.conectado) return; // el botón con el que se despertó no cuenta
    }
    const usar = M.conectado && M.activo;
    document.body.classList.toggle('mando', usar);
    const nombre = pantallaArriba();
    if (M.conectado) {
      if (nombre) pantallas(nombre, ahora);
      else { ultimaPantalla = ''; tablero(ahora, dt); }
    } else { reposo(); }

    // cursor: solo visible en el tablero y con el mando en uso
    const querido = usar && !nombre ? cursor : -1;
    if (querido !== juego.cursor) { juego.cursor = querido; ctx.marcas(); }
    if (usar) dibujarPistas(nombre);
  }

  function bucle(t) { requestAnimationFrame(bucle); try { cuadro(t); } catch (e) { console.error(e); } }
  requestAnimationFrame(bucle);

  return { reiniciarCursor() { cursor = -1; juego.cursor = -1; } };
}
