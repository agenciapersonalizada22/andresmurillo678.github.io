// Utilidades DOM minimas.
export function h(tag, props, kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v;
    else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
export const $ = (s, r) => (r || document).querySelector(s);
