// Utilidades de DOM: creacion de nodos, hojas (paneles modales), avisos y foco para mando.
import { sfx } from './sonido.js';

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c); });
  return e;
}
export function boton(txt, fn, cls, extra) {
  const b = h('button', Object.assign({ type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1 }, extra || {}), txt);
  b.addEventListener('click', (ev) => { ev.stopPropagation(); sfx.click(); fn(ev); });
  return b;
}
export const $ = (id) => document.getElementById(id);

/* ---------- avisos ---------- */
let zonaAvisos;
export function aviso(txt, color, ms) {
  if (!zonaAvisos) { zonaAvisos = h('div', { id: 'avisos', 'aria-live': 'polite' }); document.body.appendChild(zonaAvisos); }
  const a = h('div', { cls: 'aviso', style: color ? '--c:' + color : '' }, txt);
  zonaAvisos.appendChild(a);
  while (zonaAvisos.children.length > 3) zonaAvisos.firstChild.remove();
  setTimeout(() => a.remove(), ms || 2800);
}

/* ---------- hojas ---------- */
const pila = [];
let fondo;
export function hojaAbierta(id) { return pila.find((s) => s.id === id); }
export const hayHojas = () => pila.length > 0;
export function topHoja() { return pila[pila.length - 1]; }
export function abrirHoja(o) {
  // o: {id, titulo, render(cuerpo, hoja), ancha, alCerrar, modalSolo}
  const ex = hojaAbierta(o.id);
  if (ex) { Object.assign(ex, o); refrescarHoja(ex); return ex; }
  if (!fondo) { fondo = h('div', { id: 'hojas' }); document.body.appendChild(fondo); }
  const cuerpo = h('div', { cls: 'hoja-cuerpo' });
  const x = boton('✕', () => cerrarHoja(hoja), 'cerrar', { 'aria-label': 'Cerrar' });
  const tit = h('h2', {}, (typeof o.titulo === 'function' ? o.titulo() : o.titulo) || '');
  const el = h('section', { cls: 'hoja' + (o.ancha ? ' ancha' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.titulo || 'Panel' }, h('header', {}, tit, o.sinCerrar ? null : x), cuerpo);
  const hoja = Object.assign({ el, cuerpo, tit }, o);
  const capa = h('div', { cls: 'capa' }, el); capa.addEventListener('pointerdown', (ev) => { if (ev.target === capa && !o.sinCerrar) cerrarHoja(hoja); });
  hoja.capa = capa; fondo.appendChild(capa); pila.push(hoja);
  document.body.classList.add('conHoja');
  refrescarHoja(hoja);
  requestAnimationFrame(() => { capa.classList.add('v'); enfocarPrimero(el); });
  return hoja;
}
export function refrescarHoja(hoja) {
  if (!hoja.render) return;
  const act = document.activeElement, clave = act && hoja.cuerpo.contains(act) ? act.getAttribute('data-k') : null, sc = hoja.cuerpo.scrollTop;
  hoja.cuerpo.textContent = '';
  if (hoja.titulo) hoja.tit.textContent = typeof hoja.titulo === 'function' ? hoja.titulo() : hoja.titulo;
  hoja.render(hoja.cuerpo, hoja);
  hoja.cuerpo.scrollTop = sc;
  if (clave) { const n = hoja.cuerpo.querySelector('[data-k="' + clave + '"]'); if (n) n.focus({ preventScroll: true }); }
}
export function refrescarHojas(idsSolo) { pila.slice().forEach((s) => { if (!idsSolo || idsSolo.includes(s.id)) refrescarHoja(s); }); }
export function cerrarHoja(hoja) {
  const k = pila.indexOf(hoja); if (k < 0) return;
  pila.splice(k, 1); hoja.capa.classList.remove('v');
  setTimeout(() => hoja.capa.remove(), 180);
  if (!pila.length) document.body.classList.remove('conHoja');
  if (hoja.alCerrar) hoja.alCerrar();
  const t = topHoja(); if (t) enfocarPrimero(t.el);
}
export function cerrarHojaId(id) { const s = hojaAbierta(id); if (s) cerrarHoja(s); }
export function cerrarTodas() { pila.slice().reverse().forEach((s) => { if (!s.sinCerrar) cerrarHoja(s); }); }

/* ---------- foco ---------- */
export function enfocables(raiz) {
  return Array.from((raiz || document).querySelectorAll('[data-f]')).filter((e) => !e.disabled && e.offsetParent !== null && !e.closest('[hidden]'));
}
let usaTeclado = false;
addEventListener('keydown', () => { usaTeclado = true; }, true); addEventListener('pointerdown', () => { usaTeclado = false; }, true);
export function enfocarPrimero(raiz) {
  if (!usaTeclado && !document.body.classList.contains('mando')) return;
  const l = enfocables(raiz); const pref = l.find((e) => e.hasAttribute('data-pref')) || l.find((e) => !e.classList.contains('cerrar')) || l[0];
  if (pref) pref.focus({ preventScroll: true });
}
const centro = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
export function moverFoco(dir, raiz) {
  const l = enfocables(raiz), act = l.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { if (l[0]) l[0].focus(); return true; }
  const c0 = centro(act), vx = dir === 'D' ? 1 : dir === 'I' ? -1 : 0, vy = dir === 'B' ? 1 : dir === 'A' ? -1 : 0;
  let mejor = null, mp = Infinity;
  l.forEach((e) => {
    if (e === act) return;
    const c = centro(e), dx = c.x - c0.x, dy = c.y - c0.y, a = dx * vx + dy * vy;
    if (a <= 2) return;
    const cruz = Math.abs(dx * vy) + Math.abs(dy * vx), solapa = vx ? (c.r.top < c0.r.bottom - 4 && c.r.bottom > c0.r.top + 4) : (c.r.left < c0.r.right - 4 && c.r.right > c0.r.left + 4);
    const p = a + cruz * (solapa ? 0.5 : 3); if (p < mp) { mp = p; mejor = e; }
  });
  if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; }
  return false;
}

export function confirmar(txt, fn, si, no) {
  abrirHoja({ id: 'confirmar', titulo: 'Confirmar', render: (c, hoja) => {
    c.append(h('p', {}, txt), h('div', { cls: 'fila' }, boton(si || 'Sí', () => { cerrarHoja(hoja); fn(); }, 'mal', { 'data-pref': 1 }), boton(no || 'Cancelar', () => cerrarHoja(hoja), 'sec')));
  } });
}
