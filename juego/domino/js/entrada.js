// Entrada: teclado y mando Xbox. En partida recorre la mano; en menus/modales hace navegacion espacial sobre [data-f].
import { $$ } from './dom.js';
import { D } from './ajustes.js';
import { T, accion, alternarChat, chatAbierto } from './ui.js';
import * as Esc from './escena.js';

export const E = { alMenu: null, alAyuda: null, alAtras: null, alPestana: null, bloqueado: () => false, vibrar: null };
let repetir = { dir: '', t: 0, n: 0 };

export function capaActiva() {
  const capas = $$('.capa, .cu-fondo').filter((c) => !c.hidden && c.getClientRects().length > 0);
  return capas.length ? capas[capas.length - 1] : null;
}
function candidatos(capa) { return $$('[data-f]', capa).filter((e) => !e.disabled && e.getClientRects().length > 0); }

function mover(capa, dx, dy) {
  const lista = candidatos(capa);
  if (!lista.length) return;
  const act = lista.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { lista[0].focus(); return; }
  if (act.type === 'range' && dx) { act.stepUp ? (dx > 0 ? act.stepUp() : act.stepDown()) : 0; act.dispatchEvent(new Event('input', { bubbles: true })); return; }
  const r0 = act.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let mejor = null, md = 1e9;
  for (const cono of [true, false]) {
    for (const e of lista) {
      if (e === act) continue;
      const r = e.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const avance = dx * x + dy * y, lateral = Math.abs(dx ? y : x);
      if (avance <= 2 || (cono && avance < lateral * 0.7)) continue;
      const d = avance + lateral * 2.2;
      if (d < md) { md = d; mejor = e; }
    }
    if (mejor) break;
  }
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function atras(capa) {
  // .cu-fondo = dialogo de la plataforma (conflicto de guardado): se cierra con su propio atajo de Escape
  if (capa && capa.classList.contains('cu-fondo')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; }
  const b = capa && capa.querySelector('[data-cerrar]');
  if (b) { b.click(); return true; }
  if (E.alAtras) return E.alAtras();
  return false;
}

/* ---------- teclado ---------- */
export function iniciarTeclado() {
  window.addEventListener('keydown', (e) => {
    if (E.bloqueado()) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && e.target.type !== 'range')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(), t = D.teclas;
    document.body.classList.add('usando-teclado'); document.body.classList.remove('usando-mando');
    const capa = capaActiva();
    if (capa) {
      const dir = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
      if (dir && tag !== 'select') { e.preventDefault(); mover(capa, dir[0], dir[1]); return; }
      if (k === 'escape') { if (atras(capa)) e.preventDefault(); return; }
      return;
    }
    if (!T.v) return;
    if (chatAbierto() && k === 'escape') { alternarChat(false); e.preventDefault(); return; }
    if (k === t.menu) { e.preventDefault(); if (Esc.cancelar()) return; E.alMenu && E.alMenu(); }
    else if (k === t.izq) { e.preventDefault(); Esc.moverCursor(-1); }
    else if (k === t.der) { e.preventDefault(); Esc.moverCursor(1); }
    else if (k === 'arrowup') { e.preventDefault(); Esc.cambiarExtremo('i'); }
    else if (k === 'arrowdown') { e.preventDefault(); Esc.cambiarExtremo('d'); }
    else if (k === t.extremo) { e.preventDefault(); Esc.cambiarExtremo(); }
    else if (k === t.jugar || k === ' ') { e.preventDefault(); Esc.confirmar(); }
    else if (k === t.robar) { e.preventDefault(); accion('robar'); }
    else if (k === t.pasar) { e.preventDefault(); accion('pasar'); }
    else if (k === t.chat) { e.preventDefault(); alternarChat(); }
    else if (k === t.zoomMas || k === '=') { e.preventDefault(); Esc.zoomPor(1.2); }
    else if (k === t.zoomMenos || k === '_') { e.preventDefault(); Esc.zoomPor(0.83); }
    else if (k === t.ajustar) { e.preventDefault(); Esc.ajustar(); }
    else if (k === 'f1' || k === '?') { e.preventDefault(); E.alAyuda && E.alAyuda(); }
  });
  window.addEventListener('pointerdown', () => document.body.classList.remove('usando-teclado', 'usando-mando'));
}

/* ---------- mando ---------- */
export function cuadroMando(Mando, t) {
  if (!Mando || E.bloqueado()) return;
  Mando.leer();
  if (!Mando.conectado) return;
  const usa = Mando.activo && (Object.keys(Mando._ahora).some((k) => Mando._ahora[k]) || Math.hypot(Mando.ejes.izq.x, Mando.ejes.izq.y) > 0.3);
  if (usa) { document.body.classList.add('usando-mando'); document.body.classList.remove('usando-teclado'); }
  const capa = capaActiva();
  const zm = D.zonaMuerta, ex = Mando.ejes.izq.x, ey = Mando.ejes.izq.y;
  let dx = 0, dy = 0;
  if (Mando.sostenido('IZQ') || ex < -zm) dx = -1; else if (Mando.sostenido('DER') || ex > zm) dx = 1;
  if (Mando.sostenido('ARRIBA') || ey < -zm * 1.2) dy = -1; else if (Mando.sostenido('ABAJO') || ey > zm * 1.2) dy = 1;
  if (Math.abs(ex) > Math.abs(ey) * 1.3 && !Mando.sostenido('ARRIBA') && !Mando.sostenido('ABAJO')) dy = 0;
  const clave = dx + ',' + dy;
  let paso = false;
  if (dx || dy) {
    if (repetir.dir !== clave) { repetir = { dir: clave, t: t + 380, n: 0 }; paso = true; }
    else if (t >= repetir.t) { repetir.t = t + (repetir.n > 3 ? 70 : 130); repetir.n++; paso = true; }
  } else repetir.dir = '';
  if (capa) {
    if (paso) mover(capa, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && capa.contains(document.activeElement)) document.activeElement.click();
    else if (Mando.pulsado('A')) { const l = candidatos(capa); if (l[0]) l[0].focus(); }
    if (Mando.pulsado('B')) atras(capa);
    if (E.alPestana) { if (Mando.pulsado('LB')) E.alPestana(-1); if (Mando.pulsado('RB')) E.alPestana(1); }
    if (Mando.pulsado('MENU') && capa.id !== 'modal') atras(capa);
    return;
  }
  if (!T.v) {
    if (Mando.pulsado('MENU')) E.alMenu && E.alMenu();
    return;
  }
  if (chatAbierto()) {
    const capaChat = document.getElementById('chatPanel');
    if (paso) mover(capaChat, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && capaChat.contains(document.activeElement)) document.activeElement.click();
    if (Mando.pulsado('B') || Mando.pulsado('LB') || Mando.pulsado('RB')) alternarChat(false);
    return;
  }
  if (paso && dx) Esc.moverCursor(dx);
  if (Mando.pulsado('A')) Esc.confirmar();
  if (Mando.pulsado('B')) { if (!Esc.cancelar() && T.v.puedePasar) accion('pasar'); }
  if (Mando.pulsado('X')) accion('robar');
  if (Mando.pulsado('Y')) accion('pasar');
  if (Mando.pulsado('LB')) Esc.cambiarExtremo('i');
  if (Mando.pulsado('RB')) Esc.cambiarExtremo('d');
  if (Mando.pulsado('ARRIBA')) alternarChat(true);
  if (Mando.pulsado('L3') || Mando.pulsado('R3')) Esc.ajustar();
  const dtz = Mando.gatillo.der - Mando.gatillo.izq;
  if (Math.abs(dtz) > 0.15) Esc.zoomPor(Math.exp(dtz * 0.03 * D.sensZoom));
  const rx = Mando.ejes.der.x, ry = Mando.ejes.der.y;
  if (rx || ry) Esc.panPor(-rx * 9, -ry * 9);
  if (Mando.pulsado('VISTA')) E.alAyuda && E.alAyuda();
  if (Mando.pulsado('MENU')) E.alMenu && E.alMenu();
}
