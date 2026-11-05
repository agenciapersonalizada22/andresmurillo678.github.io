/* Ayudantes de DOM. h('div.clase#id', {atributos}, hijos...) ; todo el texto entra por textContent (sin XSS). */
(function () {
  function h(sel, attrs) {
    var m = /^([a-z0-9]*)((?:[.#][\w-]+)*)$/i.exec(sel) || [], el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, function (_, t, n) { if (t === '.') el.classList.add(n); else el.id = n; });
    var i = 1;
    if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      i = 2;
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k]; if (v == null || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className += ' ' + v; else if (k === 'html') el.innerHTML = v;
        else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(function (x) { add(el, x); }); else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c))); }
  function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function toast(msg, tipo) {
    var cont = document.getElementById('toasts'); if (!cont) return;
    var t = h('div.toast' + (tipo ? '.' + tipo : ''), { role: 'status' }, msg); cont.appendChild(t); setTimeout(function () { t.remove(); }, 4500);
  }
  function spark(vals, w, hh, cls) {
    vals = (vals || []).filter(isFinite); if (vals.length < 2) return '';
    var mn = Infinity, mx = -Infinity, i; for (i = 0; i < vals.length; i++) { if (vals[i] < mn) mn = vals[i]; if (vals[i] > mx) mx = vals[i]; }
    var r = mx - mn || 1, paso = Math.max(1, Math.floor(vals.length / 60)), pts = [];
    for (i = 0; i < vals.length; i += paso) pts.push((i / (vals.length - 1) * w).toFixed(1) + ',' + (hh - 2 - (vals[i] - mn) / r * (hh - 4)).toFixed(1));
    pts.push(w + ',' + (hh - 2 - (vals[vals.length - 1] - mn) / r * (hh - 4)).toFixed(1));
    return '<svg class="spark ' + (cls || (vals[vals.length - 1] >= vals[0] ? 'sube' : 'baja')) + '" width="' + w + '" height="' + hh + '" viewBox="0 0 ' + w + ' ' + hh + '" aria-hidden="true"><polyline fill="none" stroke-width="1.5" points="' + pts.join(' ') + '"/></svg>';
  }
  /* color de mapa de calor para un cambio en % (verde/rojo con saturacion segun magnitud) */
  function calor(p, escala) {
    if (p == null || !isFinite(p)) return 'var(--panel-2)'; var k = Math.min(1, Math.abs(p) / (escala || 5));
    return p >= 0 ? 'hsl(145,' + (25 + 45 * k) + '%,' + (22 + 12 * k) + '%)' : 'hsl(2,' + (25 + 50 * k) + '%,' + (24 + 12 * k) + '%)';
  }
  function clasePct(p) { return p == null || !isFinite(p) ? '' : p > 0 ? 'sube' : p < 0 ? 'baja' : ''; }
  function descargar(nombre, texto, tipo) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo || 'application/json' })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function debounce(f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; }
  /* control de seleccion tipo pestanas */
  function pestanas(items, activa, alCambiar, etiqueta) {
    var cont = h('div.subtabs', { role: 'tablist', 'aria-label': etiqueta || 'Secciones' });
    items.forEach(function (it) {
      var b = h('button.subtab' + (it.id === activa ? '.activa' : ''), { role: 'tab', 'aria-selected': it.id === activa ? 'true' : 'false', type: 'button', onclick: function () { alCambiar(it.id); } }, it.titulo);
      cont.appendChild(b);
    });
    return cont;
  }
  function campo(etiqueta, ctrl, ayuda) { return h('label.campo', h('span', etiqueta), ctrl, ayuda ? h('small', ayuda) : null); }
  function entrada(tipo, valor, attrs) { return h('input', Object.assign({ type: tipo, value: valor == null ? '' : valor }, attrs || {})); }
  function selector(opciones, valor, attrs) {
    var s = h('select', attrs || {});
    opciones.forEach(function (o) { var op = h('option', { value: o.id != null ? o.id : o }, o.titulo != null ? o.titulo : o); if ((o.id != null ? o.id : o) == valor) op.selected = true; s.appendChild(op); });
    return s;
  }
  window.UI = { h: h, vaciar: vaciar, toast: toast, spark: spark, calor: calor, clasePct: clasePct, descargar: descargar, debounce: debounce, pestanas: pestanas, campo: campo, entrada: entrada, selector: selector };
})();
