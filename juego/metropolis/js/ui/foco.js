// Navegación por foco espacial para menús con mando (cruceta/stick) o teclado.
const pila = [];
let previo = null;

export const hay = () => pila.length > 0;
export const capa = () => pila[pila.length - 1] || null;

export function abrir(el, opc = {}) {
  pila.push(Object.assign({ el }, opc));
  setTimeout(() => {
    if (!pila.length || capa().el !== el) return;
    const cand = candidatos(el);
    const ini = opc.inicial ? el.querySelector(opc.inicial) : null;
    enfocar(ini || cand.find((e) => !e.hasAttribute('data-cerrar')) || cand[0] || null, !!(window.Mando && window.Mando.activo));
  }, 30);
}
export function cerrar(el) {
  const i = pila.findIndex((l) => l.el === el);
  if (i >= 0) pila.splice(i, 1);
  if (previo && !document.body.contains(previo)) previo = null;
  if (capa()) { const c = candidatos(capa().el); if (!capa().el.querySelector('.enfocado')) enfocar(c[0], false); }
}
export function cerrarTodo() { pila.length = 0; }

export function candidatos(raiz) {
  return [...raiz.querySelectorAll('.foco')].filter((e) => !e.disabled && e.offsetParent !== null && !e.closest('.oculto'));
}
export function actual() { return previo; }
export function enfocar(el, mostrar = true) {
  if (previo) previo.classList.remove('enfocado');
  previo = el || null;
  if (!el) return;
  if (mostrar) el.classList.add('enfocado');
  try { el.focus({ preventScroll: true }); } catch (e) { /* nada */ }
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* nada */ }
}
export function refrescar() {
  const l = capa(); if (!l) return;
  if (previo && document.body.contains(previo) && previo.offsetParent !== null) return;
  const cs = candidatos(l.el);
  enfocar(cs.find((e) => !e.hasAttribute('data-cerrar')) || cs[0], !!(window.Mando && window.Mando.activo));
}

const V = { ARRIBA: [0, -1], ABAJO: [0, 1], IZQ: [-1, 0], DER: [1, 0] };
export function mover(dir) {
  const l = capa(); if (!l) return;
  const cand = candidatos(l.el);
  if (!cand.length) return;
  if (!previo || !cand.includes(previo)) { enfocar(cand[0]); return; }
  const r0 = previo.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2], v = V[dir];
  let mejor = null, mp = Infinity;
  for (const e of cand) {
    if (e === previo) continue;
    const r = e.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2];
    const dx = c[0] - c0[0], dy = c[1] - c0[1];
    const prim = dx * v[0] + dy * v[1];
    if (prim <= 2) continue;
    const lat = Math.abs(dx * v[1]) + Math.abs(dy * v[0]);
    // solapamiento en el eje lateral reduce la penalización
    const sol = v[0] !== 0 ? Math.min(r.bottom, r0.bottom) - Math.max(r.top, r0.top) : Math.min(r.right, r0.right) - Math.max(r.left, r0.left);
    const p = prim + lat * (sol > 0 ? 0.6 : 2.5);
    if (p < mp) { mp = p; mejor = e; }
  }
  if (mejor) enfocar(mejor);
  else if (l.alBorde) l.alBorde(dir);
}
export function activar() {
  const l = capa(); if (!l) return;
  if (previo && document.body.contains(previo)) previo.click();
}
export function atras() {
  const l = capa(); if (!l) return false;
  if (l.atras) l.atras(); else if (l.alCerrar) l.alCerrar();
  return true;
}
export function pestana(d) { const l = capa(); if (l && l.tabs) l.tabs(d); }
