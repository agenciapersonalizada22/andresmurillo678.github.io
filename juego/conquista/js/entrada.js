// Entrada: teclado y mando Xbox. En partida mueve el cursor entre territorios y la camara; en menus/modales hace navegacion espacial sobre [data-f].
import { $, $$ } from './dom.js';
import { D } from './ajustes.js';
import { Mapa } from './mapaui.js';
import { T, moverCursor, confirmarCursor, accion, atras, hojaAbierta } from './ui.js';

export const E = { alMenu: null, alAyuda: null, alAtras: null, alPestana: null, bloqueado: () => false };
let repetir = { dir: '', t: 0, n: 0 };

export function capaActiva() {
  const capas = $$('.capa, .cu-fondo').filter((c) => !c.hidden && c.getClientRects().length > 0);
  if (capas.length) return capas[capas.length - 1];
  const hoja = $('#hoja');
  return hoja && !hoja.hidden ? hoja : null;
}
function candidatos(capa) { return $$('[data-f]', capa).filter((e) => !e.disabled && e.getClientRects().length > 0); }
function mover(capa, dx, dy) {
  const lista = candidatos(capa);
  if (!lista.length) return;
  const act = lista.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { lista[0].focus(); return; }
  if (act.type === 'range' && dx) { if (dx > 0) act.stepUp(); else act.stepDown(); act.dispatchEvent(new Event('input', { bubbles: true })); return; }
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
function cerrarCapa(capa) {
  if (capa && capa.classList.contains('cu-fondo')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; }
  if (capa && capa.id === 'hoja') return atras();
  const b = capa && capa.querySelector('[data-cerrar]');
  if (b) { b.click(); return true; }
  if (E.alAtras) return E.alAtras();
  return false;
}
const enMesa = () => !!T.v && !$('#mesa').hidden;

export function iniciarTeclado() {
  window.addEventListener('keydown', (e) => {
    if (E.bloqueado()) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && e.target.type !== 'range')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(), t = D.teclas;
    document.body.classList.add('usando-teclado'); document.body.classList.remove('usando-mando');
    const capa = capaActiva();
    const dir = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
    if (capa) {
      if (dir && tag !== 'select') { e.preventDefault(); mover(capa, dir[0], dir[1]); return; }
      if (k === t.atras || k === 'escape') { if (cerrarCapa(capa)) e.preventDefault(); return; }
      if (capa.id === 'hoja' && k === t.blitz) { e.preventDefault(); accion('blitz'); }
      return;
    }
    if (!enMesa()) return;
    if (dir) { e.preventDefault(); if (e.shiftKey) Mapa.pan(-dir[0] * 80 * D.sensCamara, -dir[1] * 80 * D.sensCamara); else moverCursor(dir[0], dir[1]); return; }
    if (k === t.atras || k === 'escape') { e.preventDefault(); if (!atras() && E.alMenu) E.alMenu(); }
    else if (k === t.menu) { e.preventDefault(); if (E.alMenu) E.alMenu(); }
    else if (k === t.aceptar || k === ' ') { e.preventDefault(); confirmarCursor(); }
    else if (k === t.blitz) { e.preventDefault(); accion('blitz'); }
    else if (k === t.terminar) { e.preventDefault(); accion('fase'); }
    else if (k === t.cartas) { e.preventDefault(); accion('cartas'); }
    else if (k === t.objetivo) { e.preventDefault(); accion('objetivo'); }
    else if (k === t.mundo) { e.preventDefault(); accion('mundo'); }
    else if (k === t.cantidad) { e.preventDefault(); accion('cantidad'); }
    else if (k === t.zmas || k === '=') { e.preventDefault(); Mapa.zoom(1.4); }
    else if (k === t.zmenos || k === '_') { e.preventDefault(); Mapa.zoom(1 / 1.4); }
    else if (k === t.todo) { e.preventDefault(); Mapa.ver(); }
    else if (k === 'f1' || k === '?') { e.preventDefault(); if (E.alAyuda) E.alAyuda(); }
  });
  window.addEventListener('pointerdown', () => document.body.classList.remove('usando-teclado', 'usando-mando'));
}

export function cuadroMando(Mando, t, dt) {
  if (!Mando || E.bloqueado()) return;
  Mando.leer();
  if (!Mando.conectado) return;
  const usa = Mando.activo && (Object.keys(Mando._ahora).some((k) => Mando._ahora[k]) || Math.hypot(Mando.ejes.izq.x, Mando.ejes.izq.y) > 0.3);
  if (usa) { document.body.classList.add('usando-mando'); document.body.classList.remove('usando-teclado'); }
  const capa = capaActiva();
  const zm = D.zonaMuerta, ex = Mando.ejes.izq.x, ey = Mando.ejes.izq.y * (D.invertirY ? -1 : 1);
  let dx = 0, dy = 0;
  if (Mando.sostenido('IZQ') || ex < -zm) dx = -1; else if (Mando.sostenido('DER') || ex > zm) dx = 1;
  if (Mando.sostenido('ARRIBA') || ey < -zm * 1.2) dy = -1; else if (Mando.sostenido('ABAJO') || ey > zm * 1.2) dy = 1;
  if (Math.abs(ex) > Math.abs(ey) * 1.3 && !Mando.sostenido('ARRIBA') && !Mando.sostenido('ABAJO')) dy = 0;
  const clave = dx + ',' + dy;
  let paso = false;
  if (dx || dy) {
    if (repetir.dir !== clave) { repetir = { dir: clave, t: t + 380, n: 0 }; paso = true; }
    else if (t >= repetir.t) { repetir.t = t + (repetir.n > 3 ? 90 : 160); repetir.n++; paso = true; }
  } else repetir.dir = '';
  if (capa) {
    if (paso) mover(capa, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && capa.contains(document.activeElement)) document.activeElement.click();
    else if (Mando.pulsado('A')) { const l = candidatos(capa); if (l[0]) l[0].focus(); }
    if (Mando.pulsado('B')) cerrarCapa(capa);
    if (capa.id === 'hoja' && Mando.pulsado('X')) accion('blitz');
    if (E.alPestana && !capa.id) { if (Mando.pulsado('LB')) E.alPestana(-1); if (Mando.pulsado('RB')) E.alPestana(1); }
    if (Mando.pulsado('MENU') && !capa.id) cerrarCapa(capa);
    return;
  }
  if (!enMesa()) { if (Mando.pulsado('MENU') && E.alMenu) E.alMenu(); return; }
  if (paso) moverCursor(dx, dy);
  const rx = Mando.ejes.der.x, ry = Mando.ejes.der.y * (D.invertirY ? -1 : 1);
  if (rx || ry) { const v = 0.45 * dt * D.sensCamara / Math.sqrt(Mapa.meta.k); Mapa.pan(-rx * v, -ry * v, true); }
  const z = Mando.gatillo.der - Mando.gatillo.izq;
  if (Math.abs(z) > 0.15) Mapa.zoom(Math.exp(z * dt * 0.0016 * D.sensZoom));
  if (Mando.pulsado('A')) confirmarCursor();
  if (Mando.pulsado('B')) { if (!atras() && E.alMenu) E.alMenu(); }
  if (Mando.pulsado('X')) { if (hojaAbierta()) accion('blitz'); else accion('cantidad'); }
  if (Mando.pulsado('Y')) accion('fase');
  if (Mando.pulsado('LB')) accion('cartas');
  if (Mando.pulsado('RB')) accion('objetivo');
  if (Mando.pulsado('VISTA')) accion('mundo');
  if (Mando.pulsado('R3') || Mando.pulsado('L3')) Mapa.ver();
  if (Mando.pulsado('MENU') && E.alMenu) E.alMenu();
}
