// Utilidades DOM minimas.
export function h(tag, o, hijos) {
  const e = document.createElement(tag); o = o || {};
  for (const k in o) {
    const v = o[k];
    if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v; else if (k === 'html') e.innerHTML = v; else if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); }
    else if (k === 'style') e.style.cssText = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  (hijos || []).forEach((c) => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
export const $ = (s, r) => (r || document).querySelector(s);
let toastT = 0;
export function toast(msg, ms) {
  let t = document.getElementById('toast'); if (!t) { t = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2600);
}
export const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
