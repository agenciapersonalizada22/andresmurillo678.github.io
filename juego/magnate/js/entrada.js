// Entrada: teclado, mando Xbox y atajos. La interfaz tactil/raton usa los propios botones y el tablero 3D.
import { X } from './contexto.js';
import { D } from './ajustes.js';
import { topHoja, cerrarHoja, moverFoco, enfocarPrimero, $ } from './dom.js';
import { abrirCasilla, abrirPropiedades, abrirTratos, abrirRegistro, abrirChat, cambiarJugador, cambiarSocio } from './hojas.js';
import { miniCasilla } from './hud.js';
import { propsDe } from './reglas.js';

const Mando = window.Mando, Lobby = window.Lobby;
let acciones = {}, zona = 'acciones', ultDir = '', tRep = 0, bloqueoHasta = performance.now() + 400, ultT = performance.now();
export function configurarEntrada(a) { acciones = a; }

const ambito = () => { const t = topHoja(); if (t) return t.el; const m = $('menu'); return m && !m.hidden ? m : null; };
function cursor(i) {
  X.cursor = ((i % 40) + 40) % 40; if (X.tablero) { X.tablero.cursor(X.cursor); X.tablero.camara.enfocar(X.cursor); }
  miniCasilla(X.cursor, true);
}
export function entrarZona(z) {
  zona = z;
  document.body.classList.toggle('zona-tablero', z === 'tablero');
  if (z === 'tablero') { if (X.cursor < 0) cursor(X.E ? X.E.jug[Math.max(0, X.yo)].pos : 0); else cursor(X.cursor); }
  else { if (X.tablero) X.tablero.cursor(-1); miniCasilla(-1); X.cursor = -1; const b = $('btnPrim') || $('sec').querySelector('[data-f]'); if (b) b.focus({ preventScroll: true }); }
}
function hud() { return Array.from(document.querySelectorAll('#jugs [data-f], #barra [data-f], #sup [data-f]')).filter((e) => !e.disabled && e.offsetParent !== null); }
function moverHud(dir) {
  const l = hud(), act = l.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { const b = $('btnPrim') || l[0]; if (b) b.focus({ preventScroll: true }); return; }
  moverFoco(dir, document.body);
}

/* ---------- teclado ---------- */
window.addEventListener('keydown', (ev) => {
  if (Lobby && Lobby.abierto) return;
  const tag = (ev.target && ev.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') { if (ev.key === 'Escape') ev.target.blur(); return; }
  const k = ev.key.toLowerCase(), T = D.ctl.teclas, t = topHoja();
  if (k === T.pausa) { ev.preventDefault(); if (t && !t.sinCerrar) cerrarHoja(t); else if (!t) acciones.pausa && acciones.pausa(); return; }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (k === T.sonido) { acciones.sonido && acciones.sonido(); return; }
  if (k === T.pantalla) { acciones.pantalla && acciones.pantalla(); return; }
  if (!X.E || ($('menu') && !$('menu').hidden)) return;
  if (k === T.propiedades) { abrirPropiedades(); return; }
  if (k === T.tratos) { abrirTratos(); return; }
  if (k === T.registro) { abrirRegistro(); return; }
  if (k === T.chat) { ev.preventDefault(); abrirChat(); return; }
  if (k === T.vista) { X.tablero.camara.cenital(); return; }
  if (t) {
    const m = { arrowleft: 'I', arrowright: 'D', arrowup: 'A', arrowdown: 'B' }[k];
    if (m) { ev.preventDefault(); moverFoco(m, t.el); }
    return;
  }
  if (k === T.accion || k === 'enter') {
    const b = $('btnPrim');
    if (k === 'enter' && document.activeElement && document.activeElement !== document.body && document.activeElement.tagName === 'BUTTON') return;
    if (b && !b.disabled) { ev.preventDefault(); b.click(); }
    return;
  }
  const cam = X.tablero.camara;
  if (k === 'arrowleft' || k === 'arrowright') { ev.preventDefault(); cursor((X.cursor < 0 ? (X.E.jug[Math.max(0, X.yo)].pos) : X.cursor) + (k === 'arrowright' ? 1 : -1)); }
  else if (k === 'arrowup' || k === 'arrowdown') { ev.preventDefault(); cursor((X.cursor < 0 ? (X.E.jug[Math.max(0, X.yo)].pos) : X.cursor) + (k === 'arrowdown' ? 10 : -10)); }
  else if (k === 'o' && X.cursor >= 0) abrirCasilla(X.cursor);
  else if (k === 'q') cam.rotar(-0.2); else if (k === 'e') cam.rotar(0.2);
  else if (k === '+' || k === '=') cam.zoom(0.85); else if (k === '-') cam.zoom(1.18);
  else if (k === 'w') cam.pan(0, -0.6); else if (k === 's') cam.pan(0, 0.6); else if (k === 'a') cam.pan(-0.6, 0); else if (k === 'd') cam.pan(0.6, 0);
  else if (k === 'home' || k === '0') cam.reset();
});

/* ---------- mando ---------- */
function dirDe(M) {
  if (M.sostenido('ARRIBA')) return 'A'; if (M.sostenido('ABAJO')) return 'B'; if (M.sostenido('IZQ')) return 'I'; if (M.sostenido('DER')) return 'D';
  const z = Math.max(0, (D.ctl.zonaMuerta - 0.18) / 0.82), x = M.ejes.izq.x, y = M.ejes.izq.y;
  if (Math.hypot(x, y) > Math.max(0.5, z)) return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'D' : 'I') : (y > 0 ? 'B' : 'A');
  return '';
}
function bucle(now) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (now - ultT) / 1000); ultT = now;
  if (!Mando || (Lobby && Lobby.abierto)) return;
  Mando.leer();
  if (!Mando.conectado) { document.body.classList.remove('mando'); return; }
  if (Mando.activo && now - Mando._ultimoUso < 200) document.body.classList.add('mando');
  if (now < bloqueoHasta) return;
  const sc = ambito(), M = Mando;
  const d = dirDe(M);
  let pasar = false;
  if (!d) ultDir = ''; else if (d !== ultDir) { ultDir = d; tRep = now + 380; pasar = true; } else if (now >= tRep) { tRep = now + 140; pasar = true; }
  if (M.pulsado('MENU')) { acciones.pausa && acciones.pausa(); return; }
  if (sc) {
    if (pasar) moverFoco(d, sc);
    if (M.pulsado('A')) { const a = document.activeElement; if (a && sc.contains(a)) { a.click(); if (a.tagName === 'INPUT') a.focus(); } else enfocarPrimero(sc); }
    if (M.pulsado('B')) { const t = topHoja(); if (t && !t.sinCerrar) cerrarHoja(t); else if (acciones.atrasMenu) acciones.atrasMenu(); }
    const t = topHoja();
    if (t && X.E) {
      if (M.pulsado('LB') || M.pulsado('RB')) {
        const s = M.pulsado('RB') ? 1 : -1;
        if (t.id === 'jugador') cambiarJugador(s); else if (t.id === 'tratos') cambiarSocio(s);
      }
      if (M.pulsado('X')) abrirTratos(); if (M.pulsado('Y')) abrirPropiedades();
    }
    return;
  }
  if (!X.E) return;
  const cam = X.tablero.camara, s = D.ctl.sens;
  cam.rotar(M.ejes.der.x * dt * 2 * s); cam.zoom(1 + M.ejes.der.y * dt * 1.2 * s); cam.zoom(1 - (M.gatillo.der - M.gatillo.izq) * dt * 1.2);
  if (M.pulsado('VISTA')) entrarZona(zona === 'tablero' ? 'acciones' : 'tablero');
  if (M.pulsado('X')) abrirTratos(); if (M.pulsado('Y')) abrirPropiedades();
  if (M.pulsado('L3')) cam.reset(); if (M.pulsado('R3')) cam.cenital();
  if (M.pulsado('LB') || M.pulsado('RB')) {
    const mis = propsDe(X.E, X.yo); if (mis.length) {
      if (zona !== 'tablero') entrarZona('tablero');
      const s2 = M.pulsado('RB') ? 1 : -1, ant = mis.indexOf(X.cursor);
      cursor(mis[(ant + s2 + mis.length * 2) % mis.length]);
    }
  }
  if (zona === 'tablero') {
    if (pasar) cursor((X.cursor < 0 ? 0 : X.cursor) + (d === 'D' ? 1 : d === 'I' ? -1 : d === 'B' ? 10 : -10));
    if (M.pulsado('A') && X.cursor >= 0) abrirCasilla(X.cursor);
    if (M.pulsado('B')) entrarZona('acciones');
  } else {
    if (pasar) moverHud(d);
    if (M.pulsado('A')) { const a = document.activeElement; if (a && a.tagName === 'BUTTON') a.click(); else { const b = $('btnPrim'); if (b && !b.disabled) b.click(); } }
  }
}
requestAnimationFrame(bucle);
