/* Ayudas de DOM */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, doc = G.document;
  S.h = function (tag, props, kids) {
    var e = doc.createElement(tag);
    for (var k in props || {}) {
      var v = props[k];
      if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v;
      else if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]);
      else if (k === 'style') e.style.cssText = v; else if (v !== false && v != null) e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  };
  S.btn = function (txt, fn, cls) { return S.h('button', { type: 'button', cls: 'b ' + (cls || ''), txt: txt, 'data-f': 1, on: { click: fn } }); };
  S.fmt = function (n) { return Math.floor(n).toLocaleString('es'); };
  S.tiempo = function (s) { s = Math.floor(s); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };
})(typeof window !== 'undefined' ? window : globalThis);
