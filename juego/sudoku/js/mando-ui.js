// Mando Xbox: navegacion espacial por menus y dialogos, y controles de partida (cruceta, gatillos, menu radial de numeros).
import { h, $, $$ } from './dom.js';
import { A } from './ajustes.js';
import * as J from './juego.js';
import { sonar } from './sonido.js';

const dirs = { ARRIBA: [0, -1], ABAJO: [0, 1], IZQ: [-1, 0], DER: [1, 0] };
let rep = { dir: null, t: 0, primero: true }, radialAbierto = false, radialIdx = -1;

function visibles(raiz) {
  return $$('[data-f]', raiz).filter((e) => !e.disabled && e.offsetParent !== null && e.getClientRects().length && !e.closest('[hidden]'));
}
function mover(dir, raiz) {
  const lista = visibles(raiz); if (!lista.length) return;
  const act = document.activeElement && raiz.contains(document.activeElement) && lista.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { lista[0].focus(); return; }
  const [dx, dy] = dir, r0 = act.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let mejor = null, ms = Infinity;
  for (const e of lista) {
    if (e === act) continue;
    const r = e.getBoundingClientRect(), ex = r.left + r.width / 2 - cx, ey = r.top + r.height / 2 - cy;
    const prim = dx ? ex * dx : ey * dy, orto = dx ? Math.abs(ey) : Math.abs(ex);
    if (prim < 4) continue;
    const s = prim + orto * 2.2;
    if (s < ms) { ms = s; mejor = e; }
  }
  if (mejor) { mejor.focus({ preventScroll: false }); mejor.scrollIntoView({ block: 'nearest' }); sonar('seleccion'); }
}
function ajustarControl(e, d) {
  if (e.matches('input[type=range]')) {
    const paso = +e.step || 1, v = Math.max(+e.min, Math.min(+e.max, +e.value + d * paso));
    e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }
  if (e.matches('select')) {
    const i = Math.max(0, Math.min(e.options.length - 1, e.selectedIndex + d));
    if (i !== e.selectedIndex) { e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })); }
    return true;
  }
  return false;
}
function direccion(M, zm) {
  for (const k in dirs) if (M.sostenido(k)) return k;
  const x = M.ejes.izq.x, y = M.ejes.izq.y;
  if (Math.hypot(x, y) < Math.max(0.2, zm)) return null;
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'IZQ' : 'DER') : (y < 0 ? 'ARRIBA' : 'ABAJO');
}
function paso(dir, ahora) {
  if (!dir) { rep.dir = null; return false; }
  if (rep.dir !== dir) { rep.dir = dir; rep.t = ahora + 380; return true; }
  if (ahora >= rep.t) { rep.t = ahora + 115; return true; }
  return false;
}

function radial(M, p) {
  const el = $('#radial'), n = p.n, x = M.ejes.der.x, y = M.ejes.der.y, mag = Math.hypot(x, y);
  if (mag > 0.6) {
    if (!radialAbierto) {
      radialAbierto = true; el.textContent = '';
      const rueda = h('div', { cls: 'rueda-n' });
      for (let d = 1; d <= n; d++) {
        const ang = ((d - 1) / n) * Math.PI * 2 - Math.PI / 2;
        rueda.appendChild(h('div', { cls: 'rd', 'data-d': d, style: `left:${50 + 40 * Math.cos(ang)}%;top:${50 + 40 * Math.sin(ang)}%`, txt: String(d) }));
      }
      rueda.appendChild(h('div', { cls: 'centro', txt: A.controles && J.estado.lapiz ? 'Nota' : 'Número' }));
      el.appendChild(rueda); el.hidden = false;
    }
    const ang = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.round(ang / ((Math.PI * 2) / n)) % n;
    if (idx !== radialIdx) { radialIdx = idx; $$('.rd', el).forEach((e, i) => e.classList.toggle('on', i === idx)); sonar('seleccion'); }
    return true;
  }
  if (radialAbierto && mag < 0.3) {
    radialAbierto = false; el.hidden = true;
    if (radialIdx >= 0) { J.estado.num = radialIdx + 1; J.aplicarNumero(radialIdx + 1); }
    radialIdx = -1;
  }
  return radialAbierto;
}

function numeroSiguiente(p, d) {
  const S = J.estado; let v = S.num || 0;
  for (let k = 0; k < p.n; k++) { v = ((v - 1 + d + p.n) % p.n) + 1; if (v >= 1) break; }
  S.num = v || 1; J.pintar();
}

export function iniciarMando() {
  const M = window.Mando; if (!M) return;
  const bucle = (ahora) => {
    requestAnimationFrame(bucle);
    if (document.hidden) return;
    M.leer();
    if (!M.conectado) return;
    if (M.activo) document.body.classList.add('usando-mando');
    const zm = A.controles.zonaMuerta, capas = $('#capas');
    const tope = capas.lastElementChild;
    const dir = direccion(M, zm);
    if (tope) {
      if (paso(dir, ahora)) {
        const act = document.activeElement;
        if ((dir === 'IZQ' || dir === 'DER') && act && ajustarControl(act, dir === 'IZQ' ? -1 : 1)) { /* ajustado */ }
        else mover(dirs[dir], tope);
      }
      if (M.pulsado('A')) { const a = document.activeElement; if (a && tope.contains(a)) a.click(); else { const l = visibles(tope)[0]; if (l) l.focus(); } }
      if (M.pulsado('B') || M.pulsado('MENU')) { const b = tope.querySelector('[data-atras]'); if (b) b.click(); }
      if (tope.__pestana) { if (M.pulsado('LB')) tope.__pestana(-1); if (M.pulsado('RB')) tope.__pestana(1); }
      return;
    }
    if (!$('#menu').hidden) {
      if (paso(dir, ahora)) mover(dirs[dir], document.getElementById('app'));
      if (M.pulsado('A')) { const a = document.activeElement; if (a && a.matches('[data-f]')) a.click(); else { const l = visibles($('#menu'))[0]; if (l) l.focus(); } }
      return;
    }
    const S = J.estado, p = S.p; if (!p) return;
    if (S.res) {
      if (M.pulsado('A') || M.pulsado('RB') || M.pulsado('DER')) J.pasoRes(1);
      if (M.pulsado('LB') || M.pulsado('IZQ')) J.pasoRes(-1);
      if (M.pulsado('B')) J.cerrarRes();
      return;
    }
    if (M.pulsado('MENU')) { S.menuPausa(); return; }
    if (radial(M, p)) return;
    if (paso(dir, ahora)) J.mover(dirs[dir][0], dirs[dir][1], M.sostenido('LT') && false);
    if (M.pulsado('RT')) numeroSiguiente(p, 1);
    if (M.pulsado('LT')) numeroSiguiente(p, -1);
    if (M.pulsado('A')) { if (S.num) J.aplicarNumero(S.num); else { S.toast('Elige un número con LT/RT o el stick derecho.'); } }
    if (M.pulsado('B')) J.borrarSel();
    if (M.pulsado('X')) J.accion('lapiz');
    if (M.pulsado('Y')) J.pedirPista();
    if (M.pulsado('LB')) J.accion('deshacer');
    if (M.pulsado('RB')) J.accion('rehacer');
    if (M.pulsado('VISTA')) J.accion('autonotas');
    if (M.pulsado('L3')) J.seleccionarIguales();
    if (M.pulsado('R3')) J.accion('multi');
  };
  requestAnimationFrame(bucle);
  const quitar = () => document.body.classList.remove('usando-mando');
  addEventListener('pointerdown', quitar, true); addEventListener('keydown', quitar, true);
}
