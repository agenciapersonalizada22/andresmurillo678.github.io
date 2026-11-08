export function h(tag, props, kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v; else if (k === 'on') for (const ev in v) e.addEventListener(ev, v[ev]);
    else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach((c) => { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
export const $ = (s, r = document) => r.querySelector(s);
export const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
