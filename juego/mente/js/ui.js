// Infraestructura de interfaz: pantallas con pila, modales navegables con mando, confirmaciones y avisos.
import { h, vaciar } from './dom.js';
import { Entrada } from './entrada.js';

const reg = {}, pila = [];
export const registrar = (n, f) => { reg[n] = f; };
const TITULOS = {};
export const titulo = (n, t) => { TITULOS[n] = t; };
function pintar(n, p) {
  const cont = document.getElementById('pantalla');
  vaciar(cont); cont.scrollTop = 0; cont.dataset.pantalla = n;
  if (!reg[n]) throw new Error('pantalla desconocida ' + n);
  const v = document.getElementById('bVolver'); if (v) v.hidden = pila.length <= 1;
  reg[n](cont, p || {});
  const t = document.getElementById('titulo'); if (t) t.textContent = TITULOS[n] || 'Gimnasio Mental';
  if (document.body.classList.contains('usando-mando')) { const f = cont.querySelector('[data-f]'); if (f) f.focus(); }
  const f2 = cont.querySelector('h2'); if (f2) { f2.setAttribute('tabindex', '-1'); }
}
export function ir(n, p = {}, o = {}) {
  if (o.raiz) pila.length = 0;
  if (o.reemplazar && pila.length) pila[pila.length - 1] = { n, p }; else pila.push({ n, p });
  pintar(n, p);
}
export function atras() {
  if (pila.length > 1) { pila.pop(); const t = pila[pila.length - 1]; pintar(t.n, t.p); return true; }
  return false;
}
export const refrescar = () => { const t = pila[pila.length - 1]; if (t && !document.body.classList.contains('jugando')) pintar(t.n, t.p); };
export const actualNombre = () => (pila[pila.length - 1] || {}).n;
export const pantallaP = (n, p) => new Promise((res) => ir(n, { ...p, listo: res }, { reemplazar: true }));
Entrada.atras = () => { if (document.body.classList.contains('jugando')) return false; return atras(); };

export function modal(titulo, contenido, o = {}) {
  const caja = h('div', { cls: 'caja' + (o.ancha ? ' ancha' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
  const capa = h('div', { cls: 'capa-modal' }, caja);
  const previo = document.activeElement;
  const cerrar = () => { capa.remove(); if (previo && previo.focus && document.body.contains(previo)) { try { previo.focus(); } catch (e) { /* ya no existe */ } } if (o.alCerrar) o.alCerrar(); };
  caja.appendChild(h('div', { cls: 'caja-cab' }, [h('h2', { txt: titulo }), o.sinCerrar ? null : h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-atras': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: cerrar } })]));
  const cuerpo = h('div', { cls: 'caja-cuerpo' }); caja.appendChild(cuerpo);
  contenido(cuerpo, cerrar);
  capa.addEventListener('pointerdown', (e) => { if (e.target === capa && !o.sinCerrar) cerrar(); });
  document.body.appendChild(capa);
  const f = cuerpo.querySelector('[data-f]') || caja.querySelector('[data-f]'); if (f) f.focus();
  return cerrar;
}
export function confirmar(texto, o = {}) {
  return new Promise((res) => {
    let hecho = false;
    const fin = (v) => { if (!hecho) { hecho = true; res(v); } };
    modal(o.titulo || 'Confirmar', (c, cerrar) => {
      c.appendChild(h('p', { txt: texto }));
      c.appendChild(h('div', { cls: 'fila-btn' }, [
        h('button', { type: 'button', cls: 'btn' + (o.peligro ? ' peligro' : ''), 'data-f': 1, txt: o.si || 'Sí', on: { click: () => { cerrar(); fin(true); } } }),
        h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: o.no || 'No', on: { click: () => { cerrar(); fin(false); } } })]));
    }, { alCerrar: () => fin(false) });
  });
}
export function toast(txt, cls = '') {
  const c = document.getElementById('toasts'); if (!c) return;
  const t = h('div', { cls: 'toast ' + cls, role: 'status', txt }); c.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}
export function confeti(n = 30) {
  if (document.body.classList.contains('sin-anim') || document.body.classList.contains('sin-mov')) return;
  const c = document.getElementById('toasts'); if (!c) return;
  for (let i = 0; i < n; i++) { const p = h('i', { cls: 'cf', style: `left:${Math.random() * 100}%;--d:${0.9 + Math.random() * 1.2}s;--r:${Math.random() * 360}deg;--c:${i % 5}` }); c.appendChild(p); setTimeout(() => p.remove(), 2400); }
}
