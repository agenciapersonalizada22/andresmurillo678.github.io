// Entrada unificada: teclado, tactil (los elementos manejan su clic) y mando Xbox. En juego emite acciones normalizadas:
// izq der arriba abajo ok pausa a b x y 1..9. Fuera de juego navega el foco con cruceta/palanca, A pulsa, B vuelve.
import { D } from './ajustes.js';
export const Entrada = { juego: null, tecla: null, atras: null, ultimoMando: false };
const DIRS = { ARRIBA: 'arriba', ABAJO: 'abajo', IZQ: 'izq', DER: 'der' };
const capa = () => { const m = Array.from(document.querySelectorAll('.capa-modal')).filter((e) => !e.hidden); return m.length ? m[m.length - 1] : document.getElementById('pantalla'); };
const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
export function enfocables() { const c = capa(); return c ? Array.from(c.querySelectorAll('[data-f]:not([disabled])')).filter(visible) : []; }
export function navegar(dir) {
  const l = enfocables(); if (!l.length) return;
  const cur = l.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { l[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let mejor = null, mv = Infinity;
  for (const e of l) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
    const prim = dir === 'der' ? dx : dir === 'izq' ? -dx : dir === 'abajo' ? dy : -dy;
    const perp = dir === 'der' || dir === 'izq' ? Math.abs(dy) : Math.abs(dx);
    if (prim <= 2) continue;
    const v = prim + perp * 2.2;
    if (v < mv) { mv = v; mejor = e; }
  }
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest' }); }
}
export function atras() {
  const c = capa(); const b = c && c.querySelector('[data-atras]');
  if (b && visible(b)) { b.click(); return true; }
  if (Entrada.atras) return Entrada.atras();
  return false;
}
function accion(a) {
  if (Entrada.juego) { Entrada.juego(a); return; }
  if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') navegar(a);
  else if (a === 'a') { const f = document.activeElement; if (f && f !== document.body && f.click && enfocables().includes(f)) f.click(); else navegar('der'); }
  else if (a === 'b' || a === 'pausa') atras();
}
function teclaAccion(k) {
  const T = D.teclas;
  if (k === T.izq || k === 'a') return 'izq';
  if (k === T.der || k === 'd') return 'der';
  if (k === T.arriba || k === 'w') return 'arriba';
  if (k === T.abajo || k === 's') return 'abajo';
  if (k === T.ok || k === ' ' || k === 'enter') return 'ok';
  if (k === T.pausa || k === 'escape' || k === 'p') return 'pausa';
  if (/^[1-9]$/.test(k)) return k;
  return null;
}
addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (document.body.classList.contains('capturando-tecla')) return;
  document.body.classList.remove('usando-mando');
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  const a = teclaAccion(k);
  if (Entrada.juego) {
    if (Entrada.tecla && !e.repeat && (k.length === 1 || k === 'backspace') && Entrada.tecla(k)) { e.preventDefault(); return; }
    const f = document.activeElement;
    if (a === 'ok' && f && f.matches && f.matches('#juego [data-f]')) return; // Enter/Espacio sobre un boton enfocado: clic nativo
    if (a) { e.preventDefault(); if (!e.repeat) Entrada.juego(a); }
    return;
  }
  if (k === 'escape') { if (atras()) e.preventDefault(); }
});
addEventListener('pointerdown', () => document.body.classList.remove('usando-mando'), { passive: true });
let ultStick = 0;
export function iniciarMando() {
  const M = window.Mando; if (!M) return;
  const bucle = (ts) => {
    try {
      M.leer();
      if (M.conectado) {
        if (M.activo && !document.body.classList.contains('usando-mando') && M._ultimoUso > performance.now() - 300) document.body.classList.add('usando-mando');
        for (const b of ['A', 'B', 'X', 'Y']) if (M.pulsado(b)) accion(b.toLowerCase());
        for (const b in DIRS) if (M.pulsado(b)) accion(DIRS[b]);
        if (M.pulsado('MENU') || M.pulsado('VISTA')) accion('pausa');
        const x = M.ejes.izq.x, y = M.ejes.izq.y, z = D.zonaMuerta;
        if ((Math.abs(x) > z || Math.abs(y) > z) && ts - ultStick > 260) {
          ultStick = ts;
          accion(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'der' : 'izq') : (y > 0 ? 'abajo' : 'arriba'));
        }
      }
    } catch (e) { /* un fallo de lectura no debe detener el bucle */ }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
}
export function vibrar(ms) {
  if (!D.vibracion) return;
  try { if (navigator.vibrate) navigator.vibrate(Math.round(ms * D.vibIntensidad)); } catch (e) { /* sin vibracion */ }
  try { if (window.Mando && window.Mando.conectado) window.Mando.vibrar(0.4 * D.vibIntensidad, 0.6 * D.vibIntensidad, ms); } catch (e) { /* sin mando */ }
}
