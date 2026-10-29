// Entrada: táctil (arrastrar, pellizcar), ratón, teclado y mando Xbox.
import * as THREE from '../../lib/three.module.min.js';
import * as C from '../sim/ciudad.js';
import * as Audio from './audio.js';
import * as Foco from './foco.js';

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const DIRS_MANDO = ['ARRIBA', 'ABAJO', 'IZQ', 'DER'];

export function crearControles(J) {
  const cv = J.canvas, H = J.herr;
  const ptrs = new Map();
  let gesto = null, pinch = null;
  const teclas = new Set();

  // ------------------------------------------------ picking
  function plano(cx, cy, altura = 0) {
    const r = cv.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, J.camara.cam);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (Math.abs(d.y) < 1e-5) return null;
    const t = (altura - o.y) / d.y;
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  }
  const celdaDe = (p) => (p ? { x: Math.floor(p.x), y: Math.floor(p.z) } : null);
  J.picking = {
    plano, celdaDe,
    edificio(cx, cy) {
      for (const h of [3.2, 2.2, 1.4, 0.7, 0]) {
        const p = plano(cx, cy, h); if (!p) continue;
        const c = celdaDe(p), b = C.dentro(c.x, c.y) ? C.edifEn(J.c, c.x, c.y) : null;
        if (b && J.edificios.altoDe(b) >= h - 0.25) return { x: c.x, y: c.y };
      }
      const p = plano(cx, cy, 0); return celdaDe(p);
    },
  };
  const OFFSET_TACTIL = 46;
  function apuntar(e, tactil) {
    if (H.tipoPint === 'edificio') {
      const p = plano(e.clientX, e.clientY - (tactil ? OFFSET_TACTIL : 0));
      if (p) { H.mundo = p; H.moverFant(p.x, p.z); H.sobre = celdaDe(p); }
    } else {
      const p = plano(e.clientX, e.clientY);
      if (p) { H.mundo = p; H.sobre = celdaDe(p); }
    }
  }

  // ------------------------------------------------ puntero
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    if (J.infoCapa) J.cerrarInfoCapa();
    if (J.bloqueado()) return;
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    Audio.iniciar();
    if (window.Mando && e.pointerType !== 'mouse') window.Mando.activo = false;
    J.mandoActivo = false;
    J.ratonHover = e.pointerType === 'mouse';
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), tipo: e.pointerType, mov: false, btn: e.button });
    if (ptrs.size === 2) {
      H.pint = null;
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), e: J.camara.escalaObj, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      gesto = { tipo: 'pinch' };
      return;
    }
    if (ptrs.size > 2) return;
    const tactil = e.pointerType !== 'mouse';
    const tp = H.tipoPint;
    if (e.button === 1 || e.button === 2) gesto = { tipo: 'pan' };
    else if (H.modo !== 'ver' && (tp === 'via' || tp === 'zona' || tp === 'demoler')) {
      gesto = { tipo: 'pintar' };
      const c = celdaDe(plano(e.clientX, e.clientY));
      if (c) { H.sobre = c; H.iniciarPintura(c.x, c.y); }
    } else if (H.modo !== 'ver' && tp === 'edificio') {
      gesto = { tipo: 'fantasma' };
      apuntar(e, tactil);
    } else gesto = { tipo: 'pan' };
    e.preventDefault();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && !J.bloqueado()) {
        J.ratonHover = true; if (window.Mando) window.Mando.activo = false; J.mandoActivo = false;
        apuntar(e, false);
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!p.mov && Math.hypot(p.x - p.x0, p.y - p.y0) > 9) p.mov = true;
    if (!gesto) return;
    if (gesto.tipo === 'pinch' && ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      J.camara.escalaObj = Math.max(J.camara.minE, Math.min(J.camara.maxE, pinch.e * pinch.d / Math.max(20, d)));
      J.camara.escala = J.camara.escalaObj;
      J.camara.arrastrar(cx - pinch.cx, cy - pinch.cy, cv.clientHeight);
      pinch.cx = cx; pinch.cy = cy;
    } else if (gesto.tipo === 'pan') {
      if (p.mov) J.camara.arrastrar(dx, dy, cv.clientHeight);
    } else if (gesto.tipo === 'pintar') {
      const c = celdaDe(plano(e.clientX, e.clientY));
      if (c) { H.sobre = c; H.actualizarPintura(c.x, c.y); }
    } else if (gesto.tipo === 'fantasma') {
      apuntar(e, p.tipo !== 'mouse');
    }
    e.preventDefault();
  });
  const fin = (e, cancelado) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    ptrs.delete(e.pointerId);
    try { cv.releasePointerCapture(e.pointerId); } catch (x) { /* nada */ }
    if (gesto && gesto.tipo === 'pinch') { if (ptrs.size < 2) { gesto = null; pinch = null; } return; }
    const corto = performance.now() - p.t0 < 450 && !p.mov;
    if (gesto) {
      if (gesto.tipo === 'pintar') {
        if (cancelado) H.pint = null; else H.soltarPintura();
      } else if (gesto.tipo === 'fantasma') {
        if (!cancelado && p.tipo === 'mouse' && corto) H.confirmarEdificio();
        else if (!cancelado && p.tipo === 'mouse') H.confirmarEdificio();
      } else if (gesto.tipo === 'pan' && corto && !cancelado && p.btn === 0) {
        const c = H.tipoPint === 'comprar' || H.modo === 'ver' ? J.picking.edificio(e.clientX, e.clientY) : celdaDe(plano(e.clientX, e.clientY));
        if (c) H.tocar(c.x, c.y);
      }
    }
    gesto = null;
  };
  cv.addEventListener('pointerup', (e) => fin(e, false));
  cv.addEventListener('pointercancel', (e) => fin(e, true));
  cv.addEventListener('pointerleave', () => { if (!ptrs.size) { J.ratonHover = false; } });
  cv.addEventListener('wheel', (e) => {
    if (J.bloqueado()) return;
    e.preventDefault();
    J.camara.zoom(e.deltaY > 0 ? 1.12 : 0.89);
  }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault());
  cv.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  // ------------------------------------------------ teclado
  const enCampo = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '');
  window.addEventListener('keydown', (e) => {
    if (enCampo(e) && e.key !== 'Escape') return;
    Audio.iniciar();
    if (window.Mando) window.Mando.activo = false; J.mandoActivo = false;
    const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
    if (Foco.hay()) {
      if (k === 'Escape' || k === 'Backspace' && !enCampo(e)) { Foco.atras(); e.preventDefault(); return; }
      const m = { ArrowUp: 'ARRIBA', ArrowDown: 'ABAJO', ArrowLeft: 'IZQ', ArrowRight: 'DER' }[k];
      if (m && !enCampo(e)) { Foco.mover(m); e.preventDefault(); }
      if (k === 'q' || k === 'PageUp') Foco.pestana(-1);
      if (k === 'e' || k === 'PageDown') Foco.pestana(1);
      return;
    }
    if (J.bloqueado()) return;
    if (k === 'Escape') { if (!H.cancelar()) J.paneles.pausa(); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && kl === 'z') { J.deshacer(); e.preventDefault(); return; }
    if (kl === 'b') { J.paneles.construir(); return; }
    if (kl === 'x') { H.modo === 'demoler' ? H.poner(null) : H.poner('demoler'); return; }
    if (kl === 'o') { J.paneles.objetivos(); return; }
    if (kl === 'm') { J.paneles.mejoras(); return; }
    if (kl === 'c') { J.paneles.ciudad(); return; }
    if (kl === 'l') { J.ciclarCapa(); return; }
    if (kl === 'q') { J.camara.girar(-1); return; }
    if (kl === 'e') { J.camara.girar(1); return; }
    if (k === ' ') { J.fijarVel(J.vel === 0 ? (J.velPrev || 1) : 0); e.preventDefault(); return; }
    if (k >= '1' && k <= '4') { J.fijarVel([1, 2, 4, 8][+k - 1] === 8 ? 4 : [1, 2, 4][+k - 1]); return; }
    if (k === '+' || k === '=') J.camara.zoom(0.85);
    if (k === '-' || k === '_') J.camara.zoom(1.18);
    if (k === 'Enter' && H.tipoPint === 'edificio') H.confirmarEdificio();
    if (k === 'Tab') e.preventDefault();
    teclas.add(kl);
  });
  window.addEventListener('keyup', (e) => { teclas.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
  window.addEventListener('blur', () => teclas.clear());

  function teclado(dt) {
    if (Foco.hay() || J.bloqueado()) return;
    let dr = 0, ad = 0;
    if (teclas.has('a') || teclas.has('ArrowLeft')) dr -= 1;
    if (teclas.has('d') || teclas.has('ArrowRight')) dr += 1;
    if (teclas.has('w') || teclas.has('ArrowUp')) ad += 1;
    if (teclas.has('s') || teclas.has('ArrowDown')) ad -= 1;
    if (dr || ad) { const v = (10 + J.camara.escala * 1.3) * dt; J.camara.moverPantalla(dr * v, ad * v); }
  }

  // ------------------------------------------------ mando
  const rep = {};
  function repetir(nombre, activo, dt, fn) {
    const r = rep[nombre] || (rep[nombre] = { t: 0, on: false });
    if (!activo) { r.on = false; r.t = 0; return; }
    if (!r.on) { r.on = true; r.t = 0.38; fn(); return; }
    r.t -= dt;
    if (r.t <= 0) { r.t = 0.11; fn(); }
  }
  let cooldownGiro = 0;
  function mando(dt) {
    const M = window.Mando; if (!M) return;
    M.leer();
    if (!M.conectado) { J.mandoActivo = false; return; }
    J.mandoActivo = M.activo;
    const A = M.pulsado('A'), B = M.pulsado('B');
    // --- capas de interfaz
    if (Foco.hay()) {
      const l = Foco.capa();
      const sx = M.ejes.izq.x, sy = M.ejes.izq.y;
      const dirs = { ARRIBA: M.sostenido('ARRIBA') || sy < -0.6, ABAJO: M.sostenido('ABAJO') || sy > 0.6, IZQ: M.sostenido('IZQ') || sx < -0.6, DER: M.sostenido('DER') || sx > 0.6 };
      for (const d of DIRS_MANDO) repetir('n' + d, dirs[d], dt, () => { Foco.mover(d); Audio.tocar('tecla'); });
      if (A) { Audio.iniciar(); Foco.activar(); }
      if (B) { Foco.atras(); Audio.tocar('click'); }
      if (M.pulsado('LB')) Foco.pestana(-1);
      if (M.pulsado('RB')) Foco.pestana(1);
      if (M.pulsado('Y') && l.el.classList.contains('construir')) Foco.atras();
      if (M.pulsado('MENU') && l.el.querySelector('[data-acc="seguir"]')) Foco.atras();
      return;
    }
    if (J.bloqueado()) return;
    Audio.iniciar();
    const cam = J.camara;
    // movimiento y zoom
    const v = (4 + cam.escala * 1.0) * dt;
    if (M.ejes.izq.x || M.ejes.izq.y) cam.moverPantalla(M.ejes.izq.x * v, -M.ejes.izq.y * v);
    if (M.ejes.der.y) cam.zoom(Math.exp(M.ejes.der.y * dt * 1.2));
    if (M.gatillo.izq > 0.05 || M.gatillo.der > 0.05) cam.zoom(Math.exp((M.gatillo.izq - M.gatillo.der) * dt * 1.2));
    cooldownGiro -= dt;
    if (Math.abs(M.ejes.der.x) > 0.7 && cooldownGiro <= 0) { cam.girar(M.ejes.der.x > 0 ? 1 : -1); cooldownGiro = 0.45; }
    // cursor = centro de pantalla
    const rc = cv.getBoundingClientRect();
    const pc = plano(rc.left + rc.width / 2, rc.top + rc.height / 2);
    if (pc) { H.mundo = pc; H.sobre = celdaDe(pc); if (H.tipoPint === 'edificio') H.moverFant(pc.x, pc.z); }
    const s = H.sobre;
    // botones
    const tp = H.tipoPint;
    if (A && s) {
      if (H.modo === 'ver') H.tocar(s.x, s.y);
      else if (tp === 'edificio') H.confirmarEdificio();
      else if (tp === 'comprar') H.tocar(s.x, s.y);
      else if (tp === 'via' || tp === 'zona' || tp === 'demoler') H.iniciarPintura(s.x, s.y);
    }
    if (H.pint) {
      if (s) H.actualizarPintura(s.x, s.y);
      if (M.soltado('A')) H.soltarPintura();
      if (B) { H.pint = null; }
    } else if (B) { if (!H.cancelar()) J.pedirDeshacer(); }
    if (M.pulsado('X')) H.modo === 'demoler' ? H.poner(null) : H.poner('demoler');
    if (M.pulsado('Y')) J.paneles.construir();
    if (M.pulsado('LB')) J.paneles.construir(J.catRel(-1));
    if (M.pulsado('RB')) J.paneles.construir(J.catRel(1));
    if (M.pulsado('MENU')) J.paneles.pausa();
    if (M.pulsado('VISTA')) { if (J.c.evt.pend.length) J.paneles.evento(0); else J.paneles.objetivos(); }
    if (M.pulsado('L3')) { const ay = C.ayuntamiento(J.c); if (ay) cam.centrar(ay.cx, ay.cy); }
    if (M.pulsado('R3')) J.ciclarCapa();
    if (M.pulsado('ARRIBA')) J.cambiarVel(1);
    if (M.pulsado('ABAJO')) J.cambiarVel(-1);
    if (M.pulsado('IZQ')) { if (H.item) H.ciclar(-1); else cam.girar(-1); }
    if (M.pulsado('DER')) { if (H.item) H.ciclar(1); else cam.girar(1); }
  }

  return { teclado, mando, plano, celdaDe };
}
