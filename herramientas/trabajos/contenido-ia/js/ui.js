/* Ayudas de interfaz del estudio: campos enlazados, sub-pestanas, botones de IA, descargas. window.CUI */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, U = g.CUI = {}, n = 0;
  U.id = function (p) { return (p || 'c') + (++n); };
  U.campo = function (etq, input, ayuda) { var id = input.id || (input.id = U.id('f')); return h('div', {}, [h('label', { for: id, txt: etq }), input, ayuda ? h('p', { cls: 'tr-ayuda', txt: ayuda }) : null]); };
  /* enlaza input/textarea/select a obj[clave]; al.cambiar() tras cada cambio */
  U.enlazar = function (obj, clave, el, al) {
    var v = obj[clave]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
    el.addEventListener('input', function () { obj[clave] = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value); if (al) al(el); });
    return el;
  };
  U.txt = function (obj, clave, etq, o, al) { o = o || {}; var el = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.tipo || 'text'), rows: o.filas, maxlength: o.max, placeholder: o.ph, min: o.min, max: o.maxN, step: o.paso, id: U.id('f') }); U.enlazar(obj, clave, el, al); return U.campo(etq, el, o.ayuda); };
  U.chk = function (obj, clave, etq, al) { var el = h('input', { type: 'checkbox', id: U.id('k') }); U.enlazar(obj, clave, el, al); return h('label', { cls: 'tr-chk', for: el.id }, [el, etq]); };
  U.sel = function (opciones, valor, al, etq) {
    var el = h('select', { id: U.id('s') }, opciones.map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); el.value = valor == null ? '' : valor; el.addEventListener('change', function () { al(el.value, el); }); return etq ? U.campo(etq, el) : el;
  };
  U.btn = function (txt, fn, cls) { return h('button', { type: 'button', cls: 'tr-btn ' + (cls || ''), txt: txt, on: { click: fn } }); };
  /* boton con IA: bloquea mientras corre y muestra errores */
  U.iaBtn = function (txt, fn, cls) {
    var b = U.btn('✨ ' + txt, async function () { var t0 = b.textContent; b.disabled = true; b.textContent = 'Pensando…'; try { await fn(); } catch (e) { T.aviso(e.message || String(e), 'error'); } finally { b.disabled = false; b.textContent = t0; } }, cls); b.setAttribute('data-ia', '1'); return b;
  };
  U.copiar = async function (txt, msg) { try { await navigator.clipboard.writeText(txt); T.aviso(msg || 'Copiado.'); } catch (e) { var t = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' }); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); T.aviso(msg || 'Copiado.'); } catch (e2) { T.aviso('No se pudo copiar; selecciona el texto manualmente.', 'error'); } t.remove(); } };
  U.copiarBtn = function (txt, etq) { return U.btn(etq || 'Copiar', function () { U.copiar(typeof txt === 'function' ? txt() : txt); }, 'tr-chico'); };
  U.bajar = function (nombre, txt, mime) { T.descargar(new Blob([txt], { type: (mime || 'text/plain') + ';charset=utf-8' }), nombre); };
  U.nota = function (txt, tipo) { return h('div', { cls: 'tr-nota ' + (tipo || ''), role: tipo === 'tr-mal' ? 'alert' : null, txt: txt }); };
  U.vacio = function (txt) { return h('p', { cls: 'tr-vacio', txt: txt }); };
  U.panel = function (titulo, hijos, o) { return h('section', { cls: 'tr-panel', 'aria-label': titulo }, [h('h2', { txt: titulo })].concat(hijos)); };
  U.fila = function (hijos) { return h('div', { cls: 'tr-fila' }, hijos); };
  U.acciones = function (hijos) { return h('div', { cls: 'tr-acciones' }, hijos); };
  U.etiqueta = function (txt, color) { return h('span', { cls: 'tr-etiq', style: color ? 'background:' + color + ';color:#fff' : null, txt: txt }); };
  /* sub-pestanas con carga perezosa: items [[id, etiqueta, fn(panel)]]; render se repite al mostrar */
  U.subpestanas = function (cont, etq, items) {
    var barra = h('div', { cls: 'tr-pestanas cia-sub', role: 'tablist', 'aria-label': etq }), paneles = h('div', {}), pre = U.id('sp'), tabs = {}, pans = {};
    items.forEach(function (it, i) {
      var t = h('button', { role: 'tab', id: pre + 't' + i, 'aria-controls': pre + 'p' + i, 'aria-selected': i === 0, tabindex: i === 0 ? 0 : -1, 'data-sub': it[0], txt: it[1] }), p = h('div', { role: 'tabpanel', id: pre + 'p' + i, 'aria-labelledby': t.id, hidden: i !== 0 });
      tabs[it[0]] = t; pans[it[0]] = p; barra.appendChild(t); paneles.appendChild(p);
      t.addEventListener('click', function () { ir(it[0]); });
      t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); var j = (i + d + items.length) % items.length; ir(items[j][0]); tabs[items[j][0]].focus(); });
    });
    function pintar(id) { var it = items.filter(function (x) { return x[0] === id; })[0]; pans[id].textContent = ''; try { it[2](pans[id]); } catch (e) { console.error(e); pans[id].appendChild(U.nota('No se pudo mostrar esta sección: ' + e.message, 'tr-mal')); } }
    function ir(id) { items.forEach(function (it) { var on = it[0] === id; tabs[it[0]].setAttribute('aria-selected', on); tabs[it[0]].tabIndex = on ? 0 : -1; pans[it[0]].hidden = !on; }); pintar(id); actual = id; }
    var actual = items[0][0]; cont.appendChild(barra); cont.appendChild(paneles); pintar(actual);
    return { ir: ir, refrescar: function () { pintar(actual); }, actual: function () { return actual; } };
  };
  /* SVG (texto) -> PNG Blob */
  U.svgAPng = function (svg, w, hh) {
    return new Promise(function (ok, ko) {
      var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () { var c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(url); c.toBlob(function (b) { b ? ok(b) : ko(new Error('No se pudo crear la imagen.')); }, 'image/png'); };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('No se pudo dibujar el SVG.')); }; img.src = url;
    });
  };
  U.imprimirHTML = function (html) {
    var f = h('iframe', { 'aria-hidden': 'true', title: 'Impresión', style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0' }); document.body.appendChild(f);
    f.srcdoc = html; f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { T.aviso('No se pudo abrir la impresión; descarga el HTML.', 'error'); } setTimeout(function () { f.remove(); }, 60000); };
  };
  U.fecha = function (ms) { return new Date(ms).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }); };
})(window);
