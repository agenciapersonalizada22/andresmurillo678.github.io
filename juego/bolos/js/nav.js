// Navegacion de menus con teclado y mando: foco espacial sobre [data-f] en la capa superior (.capa / .cu-fondo).
import { $$ } from './dom.js';

export const N = { bloqueado: () => false, alAtras: null, alPestana: null, rep: { d: '', t: 0, n: 0 } };

export function capaActiva() {
  const capas = $$('.capa, .cu-fondo').filter((c) => !c.hidden && c.getClientRects().length > 0);
  return capas.length ? capas[capas.length - 1] : null;
}
const candidatos = (capa) => $$('[data-f]', capa).filter((e) => !e.disabled && e.getClientRects().length > 0);

export function mover(capa, dx, dy) {
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
export function atras(capa) {
  if (capa && capa.classList.contains('cu-fondo')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; }
  const b = capa && capa.querySelector('[data-cerrar]');
  if (b) { b.click(); return true; }
  return N.alAtras ? N.alAtras(capa) : false;
}
export function enfocarPrimero(capa) { const l = candidatos(capa); if (l.length && !l.includes(document.activeElement)) l[0].focus(); }

export function iniciarTeclado() {
  window.addEventListener('keydown', (e) => {
    if (N.bloqueado()) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && e.target.type !== 'range')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const capa = capaActiva();
    if (!capa) return;
    document.body.classList.add('usando-teclado'); document.body.classList.remove('usando-mando');
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
    if (dir) { e.preventDefault(); mover(capa, dir[0], dir[1]); return; }
    if (e.code === 'Escape') { if (atras(capa)) e.preventDefault(); }
  });
  window.addEventListener('pointerdown', () => document.body.classList.remove('usando-teclado', 'usando-mando'));
}

/* Una vez por cuadro, con Mando.leer() ya llamado. Devuelve true si hay capa abierta (el juego no debe leer el mando). */
export function cuadroMando(Mando, zm) {
  const capa = capaActiva();
  if (!Mando.conectado) return !!capa;
  if (Mando.activo && (Object.keys(Mando._ahora).some((k) => Mando._ahora[k]) || Math.hypot(Mando.ejes.izq.x, Mando.ejes.izq.y) > 0.3)) { document.body.classList.add('usando-mando'); document.body.classList.remove('usando-teclado'); }
  if (!capa) return false;
  const ex = Mando.ejes.izq.x, ey = Mando.ejes.izq.y, z = Math.max(0.25, zm || 0.25);
  let dx = 0, dy = 0;
  if (Mando.sostenido('IZQ') || ex < -z) dx = -1; else if (Mando.sostenido('DER') || ex > z) dx = 1;
  if (Mando.sostenido('ARRIBA') || ey < -z * 1.2) dy = -1; else if (Mando.sostenido('ABAJO') || ey > z * 1.2) dy = 1;
  const d = dx || dy ? dx + ',' + dy : '', ahora = performance.now(), rp = N.rep;
  if (!d) rp.d = '';
  else if (d !== rp.d) { rp.d = d; rp.t = ahora + 380; rp.n = 0; mover(capa, dx, dy); }
  else if (ahora >= rp.t) { rp.t = ahora + 110; mover(capa, dx, dy); }
  if (Mando.pulsado('A')) { const a = document.activeElement; if (a && capa.contains(a) && a !== document.body) a.click(); else enfocarPrimero(capa); }
  if (Mando.pulsado('B')) atras(capa);
  if (Mando.pulsado('LB') && N.alPestana) N.alPestana(-1);
  if (Mando.pulsado('RB') && N.alPestana) N.alPestana(1);
  return true;
}
