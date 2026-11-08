// Entrada: tactil multitouch, raton, teclado y mando -> objetivo de cada mazo (coordenadas logicas).
import { A } from './almacen.js';
const F = window.HkFisica, W = F.W, H = F.H, Mando = window.Mando;

export function crearEntrada(canvas, render) {
  const E = { local2p: false, yo: 0, humanos: [true, false], tg: [{ x: W / 2, y: H - 90 }, { x: W / 2, y: 90 }], teclas: {}, ptr: new Map(), pausa: false, ultimo: 'tactil' };

  function jugadorPara(y) { return E.local2p ? (y > H / 2 ? 0 : 1) : E.yo; }
  function fijar(i, x, y, tactil) {
    const off = tactil ? A.ctrl.offset : 0, dir = i === 0 ? -1 : 1;
    E.tg[i].x = x; E.tg[i].y = y + dir * off;
  }
  function pos(ev) { const r = canvas.getBoundingClientRect(); return render.aLogica(ev.clientX - r.left, ev.clientY - r.top); }

  canvas.addEventListener('pointerdown', (ev) => {
    if (E.bloqueado && E.bloqueado()) return;
    const p = pos(ev), i = jugadorPara(p.y);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    E.ptr.set(ev.pointerId, i); E.ultimo = ev.pointerType === 'mouse' ? 'raton' : 'tactil';
    fijar(i, p.x, p.y, ev.pointerType !== 'mouse'); ev.preventDefault();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (E.bloqueado && E.bloqueado()) return;
    const p = pos(ev);
    if (ev.pointerType === 'mouse') { E.ultimo = 'raton'; fijar(E.local2p ? 0 : E.yo, p.x, p.y, false); return; }
    const i = E.ptr.get(ev.pointerId); if (i == null) return;
    fijar(i, p.x, p.y, true); ev.preventDefault();
  });
  const fin = (ev) => { E.ptr.delete(ev.pointerId); };
  canvas.addEventListener('pointerup', fin); canvas.addEventListener('pointercancel', fin);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  addEventListener('keydown', (ev) => {
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    E.teclas[ev.code] = true; E.ultimo = 'teclado';
    if (ev.code === A.ctrl.teclas.pausa || ev.code === 'Escape') E.pausa = true;
    if (/^Arrow/.test(ev.code) && E.activa) ev.preventDefault();
  });
  addEventListener('keyup', (ev) => { E.teclas[ev.code] = false; });
  addEventListener('blur', () => { E.teclas = {}; E.ptr.clear(); });

  const kd = (n) => !!E.teclas[A.ctrl.teclas[n]];
  function stick(i, sx, sy) {
    const z = A.ctrl.zona; let m = Math.hypot(sx, sy);
    if (m < z) { sx = 0; sy = 0; }
    const r = F.CFG.malletR;
    const x = W / 2 + sx * (W / 2 - r - 2);
    const y = i === 0 ? 705 + (sy < 0 ? sy * 265 : sy * 65) : 95 + (sy > 0 ? sy * 265 : sy * 65);
    E.tg[i].x = x; E.tg[i].y = y;
  }

  E.leer = function (s, dt) {
    const v = 640 * A.ctrl.sens * dt, hum = E.humanos;
    for (let i = 0; i < 2; i++) {
      if (!hum[i]) continue;
      let dx = 0, dy = 0;
      if (E.local2p) { if (i === 0) { dx = kd('der') - kd('izq'); dy = kd('abajo') - kd('arriba'); } else { dx = kd('der2') - kd('izq2'); dy = kd('abajo2') - kd('arriba2'); } }
      else { dx = (kd('der') || kd('der2') ? 1 : 0) - (kd('izq') || kd('izq2') ? 1 : 0); dy = (kd('abajo') || kd('abajo2') ? 1 : 0) - (kd('arriba') || kd('arriba2') ? 1 : 0); }
      if (dx || dy) { E.tg[i].x += dx * v; E.tg[i].y += dy * v; E.ultimo = 'teclado'; }
      E.tg[i].x = Math.max(0, Math.min(W, E.tg[i].x)); E.tg[i].y = Math.max(0, Math.min(H, E.tg[i].y));
    }
    if (Mando && Mando.conectado) {
      const l = Mando.ejes.izq, r = Mando.ejes.der, z = A.ctrl.zona;
      if (Math.hypot(l.x, l.y) > z || Math.hypot(r.x, r.y) > z) E.ultimo = 'mando';
      if (E.ultimo === 'mando') {
        if (E.local2p) { stick(0, l.x, l.y); stick(1, r.x, r.y); }
        else { const a = Math.hypot(l.x, l.y) > 0 ? l : r; stick(E.yo, a.x, a.y); }
      }
      if (Mando.pulsado('MENU') || Mando.pulsado('VISTA')) E.pausa = true;
    }
    for (let i = 0; i < 2; i++) if (hum[i]) F.objetivo(s, i, E.tg[i].x, E.tg[i].y);
  };
  E.reiniciar = function (s) { for (let i = 0; i < 2; i++) { E.tg[i].x = s.mallets[i].x; E.tg[i].y = s.mallets[i].y; } E.ptr.clear(); E.pausa = false; };
  return E;
}
