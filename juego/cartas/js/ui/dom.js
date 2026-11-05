// Utilidades de DOM: creacion de nodos, avisos, dialogos con foco, formato.
export function h(tag, props, kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') e.style.cssText = v; else if (k === 'data') for (const d in v) e.dataset[d] = v[d];
    else e.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c); });
  return e;
}
export const $ = (s, r) => (r || document).querySelector(s);
export const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
export const fmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const boton = (txt, fn, cls, extra) => h('button', Object.assign({ type: 'button', cls: 'btn ' + (cls || ''), txt, 'data-f': 1, on: { click: fn } }, extra || {}));
const colorOk = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#3df5ff');
export { colorOk };

let capaAvisos;
export function aviso(texto, color, ms) {
  if (!capaAvisos) { capaAvisos = h('div', { cls: 'avisos', 'aria-hidden': 'true' }); document.body.appendChild(capaAvisos); }
  const t = h('div', { cls: 'aviso', txt: texto, style: '--c:' + colorOk(color) }); capaAvisos.appendChild(t);
  while (capaAvisos.children.length > 4) capaAvisos.firstChild.remove();
  setTimeout(() => t.remove(), ms || 3200);
  anunciar(texto);
}
let vivo;
export function anunciar(texto) {
  if (!vivo) { vivo = h('div', { cls: 'solo-lector', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(vivo); }
  vivo.textContent = texto;
}

// pila de dialogos modales; el de arriba recibe teclado y mando
export const pila = [];
export function dialogo({ titulo, cuerpo, botones, ancho, alCerrar, cerrable = true, cls }) {
  const caja = h('div', { cls: 'dlg-caja' + (ancho ? ' ' + ancho : '') + (cls ? ' ' + cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo || 'Dialogo' });
  const fondo = h('div', { cls: 'dlg-fondo' }, [caja]);
  const previo = document.activeElement;
  const api = {
    el: caja, fondo, cerrable,
    cerrar() {
      const i = pila.indexOf(api); if (i < 0) return; pila.splice(i, 1); fondo.remove();
      if (previo && previo.focus && document.contains(previo)) { try { previo.focus({ preventScroll: true }); } catch (e) {} }
      if (alCerrar) alCerrar();
    },
  };
  if (titulo) caja.appendChild(h('div', { cls: 'dlg-cab' }, [h('h2', { txt: titulo }), cerrable ? boton('✕', () => api.cerrar(), 'icono', { 'aria-label': 'Cerrar' }) : null]));
  const cu = h('div', { cls: 'dlg-cuerpo' }); caja.appendChild(cu);
  if (cuerpo) (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).forEach((c) => cu.appendChild(typeof c === 'string' ? h('p', { txt: c }) : c));
  if (botones && botones.length) caja.appendChild(h('div', { cls: 'dlg-pie' }, botones.map((b) => boton(b.txt, () => { if (b.fn) b.fn(api); if (b.cerrar !== false) api.cerrar(); }, b.cls))));
  fondo.addEventListener('mousedown', (e) => { if (e.target === fondo && cerrable) api.cerrar(); });
  document.body.appendChild(fondo); pila.push(api);
  setTimeout(() => { const f = caja.querySelector('[data-f]'); if (f) f.focus({ preventScroll: true }); }, 30);
  return api;
}
export function confirmar(texto, titulo, siFn, txtSi) {
  return dialogo({ titulo: titulo || 'Confirmar', cuerpo: [texto], botones: [{ txt: 'Cancelar', cls: 'sec' }, { txt: txtSi || 'Aceptar', cls: 'prim', fn: siFn }] });
}
export function copiar(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto).then(() => true, () => viejo(texto));
  return Promise.resolve(viejo(texto));
}
function viejo(t) { const a = h('textarea', { style: 'position:fixed;opacity:0' }); a.value = t; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} a.remove(); return ok; }
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
