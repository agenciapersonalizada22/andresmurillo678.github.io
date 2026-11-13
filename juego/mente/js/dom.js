// Utilidades DOM minimas.
export function h(tag, o = {}, hijos = []) {
  const e = document.createElement(tag);
  for (const k in o) {
    const v = o[k];
    if (k === 'cls') e.className = v;
    else if (k === 'txt') e.textContent = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') e.style.cssText = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(hijos) ? hijos : [hijos]).forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
export const $ = (s, r = document) => r.querySelector(s);
export const vaciar = (e) => { while (e.firstChild) e.removeChild(e.firstChild); return e; };
export const svg = (html, cls = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
