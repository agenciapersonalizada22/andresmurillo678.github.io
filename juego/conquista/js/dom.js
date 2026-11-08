// Utilidades de DOM compartidas.
export function h(tag, props, kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'cls') e.className = v;
    else if (k === 'txt') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids || []) if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  return e;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
export const esTactil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
