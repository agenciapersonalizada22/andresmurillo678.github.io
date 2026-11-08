// Entrada: teclado y mando Xbox. En el tablero mueve la seleccion/camara; en hojas y menus hace navegacion espacial sobre [data-f].
import { $$ } from './dom.js';
import { D } from './ajustes.js';
import { T, accion, cancelar, moverSeleccion, hayCandidatos, cicloConstruir, alternarChat, chatAbierto, tablero } from './ui.js';

export const E = { alMenu: null, alAyuda: null, alAtras: null, alPestana: null, bloqueado: () => false, enMesa: () => false };
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
  if (act.type === 'range' && dx) { dx > 0 ? act.stepUp() : act.stepDown(); act.dispatchEvent(new Event('input', { bubbles: true })); return; }
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
  if (capa && capa.classList.contains('cu-fondo')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; }
  const b = capa && capa.querySelector('[data-cerrar]');
  if (b) { b.click(); return true; }
  if (E.alAtras) return E.alAtras();
  return false;
}
const enMesa = () => E.enMesa() && T.v;

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
    const dir = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
    if (capa) {
      if (dir && tag !== 'select') { e.preventDefault(); mover(capa, dir[0], dir[1]); return; }
      if (k === 'escape') { if (atras(capa)) e.preventDefault(); }
      return;
    }
    if (!enMesa()) return;
    if (dir) {
      e.preventDefault();
      if (!e.shiftKey && hayCandidatos() && moverSeleccion(dir[0], dir[1])) return;
      tablero().panPx(-dir[0] * 70, -dir[1] * 70); return;
    }
    if (k === 'escape') { e.preventDefault(); if (!cancelar()) E.alMenu && E.alMenu(); return; }
    if (k === t.menu) { e.preventDefault(); E.alMenu && E.alMenu(); }
    else if (k === t.confirmar || k === ' ') { e.preventDefault(); if (!accion('confirmar')) accion('tirar'); }
    else if (k === t.tirar) { e.preventDefault(); accion('tirar'); }
    else if (k === t.construir) { e.preventDefault(); accion('construir'); }
    else if (k === t.comerciar) { e.preventDefault(); accion('comerciar'); }
    else if (k === t.cartas) { e.preventDefault(); accion('cartas'); }
    else if (k === t.terminar) { e.preventDefault(); accion('terminar'); }
    else if (k === t.zoomMas || k === '=') { e.preventDefault(); accion('zoomMas'); }
    else if (k === t.zoomMenos || k === '_') { e.preventDefault(); accion('zoomMenos'); }
    else if (k === t.centrar) { e.preventDefault(); accion('centrar'); }
    else if (k === t.calor) { e.preventDefault(); accion('calor'); }
    else if (k === t.chat) { e.preventDefault(); alternarChat(); }
    else if (k === t.ayuda || k === 'f1') { e.preventDefault(); E.alAyuda && E.alAyuda(); }
    else if (k === 'tab') { e.preventDefault(); cicloConstruir(e.shiftKey ? -1 : 1); }
  });
  window.addEventListener('pointerdown', () => document.body.classList.remove('usando-teclado', 'usando-mando'));
}

/* ---------- mando ---------- */
export function cuadroMando(Mando, t, dt) {
  if (!Mando || E.bloqueado()) return;
  Mando.leer();
  if (!Mando.conectado) return;
  const usa = Mando.activo && (Object.keys(Mando._ahora).some((k) => Mando._ahora[k]) || Math.hypot(Mando.ejes.izq.x, Mando.ejes.izq.y) > 0.3);
  if (usa) { document.body.classList.add('usando-mando'); document.body.classList.remove('usando-teclado'); }
  const capa = capaActiva();
  const zm = D.zonaMuerta, ex = Mando.ejes.izq.x, ey = Mando.ejes.izq.y * (D.invertirY && !capa ? -1 : 1);
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
    if (usa && !capa.contains(document.activeElement)) { const l = candidatos(capa), g = l.find((e) => e.classList.contains('grande')) || l.find((e) => !e.dataset.cerrar) || l[0]; if (g) { g.focus(); return; } }
    if (paso) mover(capa, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && capa.contains(document.activeElement)) document.activeElement.click();
    if (Mando.pulsado('B')) atras(capa);
    if (Mando.pulsado('MENU')) { const g = capa.querySelector('.btn.grande:not(:disabled)'); if (g && capa.getClientRects().length) g.click(); else atras(capa); }
    if (E.alPestana) { if (Mando.pulsado('LB')) E.alPestana(-1); if (Mando.pulsado('RB')) E.alPestana(1); }
    return;
  }
  if (!enMesa()) { if (Mando.pulsado('MENU')) E.alMenu && E.alMenu(); return; }
  if (chatAbierto()) {
    const p = document.getElementById('chatPanel');
    if (paso) mover(p, dx, dy);
    if (Mando.pulsado('A') && document.activeElement && p.contains(document.activeElement)) document.activeElement.click();
    if (Mando.pulsado('B') || Mando.pulsado('LB') || Mando.pulsado('RB')) alternarChat(false);
    return;
  }
  const tb = tablero(), s = (dt || 16) / 16;
  const rx = Mando.ejes.der.x, ry = Mando.ejes.der.y * (D.invertirY ? -1 : 1);
  if (rx || ry) tb.panPx(-rx * 14 * s * D.sensPan, -ry * 14 * s * D.sensPan);
  const z = Mando.gatillo.der - Mando.gatillo.izq;
  if (Math.abs(z) > 0.1) tb.zoomPor(Math.pow(1 + 0.025 * D.sensZoom, z * s));
  if (paso) { if (!(hayCandidatos() && moverSeleccion(dx, dy)) && !hayCandidatos()) tb.panPx(-dx * 70, -dy * 70); }
  else if ((dx || dy) && !hayCandidatos()) tb.panPx(-ex * 10 * s * D.sensPan, -ey * 10 * s * D.sensPan);
  if (Mando.pulsado('A')) { if (!accion('confirmar') && !accion('tirar')) accion('construir'); }
  if (Mando.pulsado('B')) cancelar();
  if (Mando.pulsado('X')) accion('comerciar');
  if (Mando.pulsado('Y')) accion('cartas');
  if (Mando.pulsado('LB')) cicloConstruir(-1);
  if (Mando.pulsado('RB')) cicloConstruir(1);
  if (Mando.pulsado('VISTA')) accion('terminar');
  if (Mando.pulsado('R3')) accion('centrar');
  if (Mando.pulsado('L3')) accion('calor');
  if (Mando.pulsado('MENU')) E.alMenu && E.alMenu();
}
