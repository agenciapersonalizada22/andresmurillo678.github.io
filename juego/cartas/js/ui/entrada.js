// Teclado y mando Xbox: navegacion espacial del foco, A confirma, B retira/pasa, LB/RB cantidad, MENU pausa.
import { pila, $$ } from './dom.js';
import * as Acc from './acciones.js';

const hooks = { pausa: null, chat: null, activo: () => true, contexto: null, umbral: () => 0.5, sens: () => 1 };
export function configurar(o) { Object.assign(hooks, o); }
// Un modal de la plataforma (conflicto de guardado, avisos de invitacion) maneja el mando por su cuenta.
const cuentaOcupada = () => !!(window.Cuenta && window.Cuenta.ui && window.Cuenta.ui.mando && window.Cuenta.ui.mando.ocupado());
let ultimaDir = '', tRep = 0, ultimaCant = 0, bucleId = 0, bloqueo = true;

function ctxActual() {
  if (pila.length) return pila[pila.length - 1].el;
  return hooks.contexto ? hooks.contexto() : document.body;
}
const visible = (e) => (e.checkVisibility ? e.checkVisibility() : e.offsetParent !== null) && e.getBoundingClientRect().width > 0;
function enfocables(ctx) { return $$('[data-f]', ctx).filter((e) => !e.disabled && visible(e)); }
function centro(e) { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
export function mover(dir) {
  const ctx = ctxActual(), l = enfocables(ctx); if (!l.length) return;
  const act = l.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { (l.find((e) => e.classList.contains('prim')) || l[0]).focus({ preventScroll: true }); return; }
  const c0 = centro(act), vx = dir === 'D' ? 1 : dir === 'I' ? -1 : 0, vy = dir === 'B' ? 1 : dir === 'A' ? -1 : 0;
  let mejor = null, mp = Infinity;
  l.forEach((e) => {
    if (e === act) return;
    const c = centro(e), dx = c.x - c0.x, dy = c.y - c0.y, a = dx * vx + dy * vy;
    if (a <= 2) return;
    const cruz = Math.abs(dx * vy) + Math.abs(dy * vx), p = a + cruz * 2;
    if (p < mp) { mp = p; mejor = e; }
  });
  if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function tecla(e) {
  if (cuentaOcupada()) return;
  const t = e.target, escribiendo = t && (t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  document.body.classList.remove('modo-mando');
  if (e.key === 'Escape') {
    if (pila.length) { const top = pila[pila.length - 1]; if (top.cerrable) { top.cerrar(); e.preventDefault(); } return; }
    if (hooks.pausa && hooks.activo()) { hooks.pausa(); e.preventDefault(); } return;
  }
  if (escribiendo || pila.length || !hooks.activo()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 't' || e.key === 'T') { if (hooks.chat) { hooks.chat(); e.preventDefault(); } return; }
  if (Acc.atajo(e)) { e.preventDefault(); return; }
  if (e.key.startsWith('Arrow') && !(t && t.type === 'range')) { mover({ ArrowLeft: 'I', ArrowRight: 'D', ArrowUp: 'A', ArrowDown: 'B' }[e.key]); e.preventDefault(); }
}
export function iniciar() {
  document.addEventListener('keydown', tecla);
  document.addEventListener('pointerdown', () => document.body.classList.remove('modo-mando'));
  if (!bucleId) bucleId = requestAnimationFrame(bucle);
}
function bucle() {
  bucleId = requestAnimationFrame(bucle);
  const M = window.Mando, L = window.Lobby;
  if (!M || (L && L.abierto)) return;
  if (cuentaOcupada()) { bloqueo = true; return; }
  M.leer(); if (!M.conectado) { ultimaDir = ''; return; }
  const t = performance.now();
  if (M.activo && t - M._ultimoUso < 200) document.body.classList.add('modo-mando');
  let d = '';
  if (M.sostenido('ARRIBA')) d = 'A'; else if (M.sostenido('ABAJO')) d = 'B'; else if (M.sostenido('IZQ')) d = 'I'; else if (M.sostenido('DER')) d = 'D';
  else { const x = M.ejes.izq.x, y = M.ejes.izq.y; if (Math.hypot(x, y) > hooks.umbral()) d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'D' : 'I') : (y > 0 ? 'B' : 'A'); }
  if (!d) ultimaDir = ''; else if (d !== ultimaDir) { ultimaDir = d; tRep = t + 380; mover(d); } else if (t >= tRep) { tRep = t + 150; mover(d); }
  if (bloqueo) { if (!['A', 'B', 'X', 'Y', 'MENU', 'LB', 'RB'].some((n) => M.sostenido(n))) bloqueo = false; return; }
  const enDialogo = pila.length > 0;
  if (M.pulsado('MENU')) { if (enDialogo) { const top = pila[pila.length - 1]; if (top.cerrable) top.cerrar(); } else if (hooks.pausa && hooks.activo()) hooks.pausa(); return; }
  if (M.pulsado('A')) { const a = document.activeElement; if (a && a !== document.body && ctxActual().contains(a)) a.click(); else mover(''); }
  if (M.pulsado('B')) {
    if (enDialogo) { const top = pila[pila.length - 1]; if (top.cerrable) top.cerrar(); } else Acc.pulsarB();
  }
  if (!enDialogo) {
    const paso = M.pulsado('LB') ? -1 : M.pulsado('RB') ? 1 : 0;
    if (paso) { Acc.cambiar(paso, M.sostenido('LT') ? 10 : 1); ultimaCant = t + 350; }
    else if ((M.sostenido('LB') || M.sostenido('RB')) && t > ultimaCant) { Acc.cambiar(M.sostenido('RB') ? 1 : -1, 2); ultimaCant = t + 90 / hooks.sens(); }
    if (M.pulsado('X') && hooks.chat) hooks.chat();
  }
}
