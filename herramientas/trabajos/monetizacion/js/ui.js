/* Utilidades de interfaz de Monetizacion: formatos, campos, paneles, calculadoras genericas y dialogo de frase. window.MonUI */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, C = g.MonCalc, U = g.MonUI = { h: h };
  U.moneda = function () { return g.MonDatos && g.MonDatos.cfg ? g.MonDatos.cfg.moneda : 'USD'; };
  U.dinero = function (v, m) {
    v = C.n(v); m = m || U.moneda();
    try { return new Intl.NumberFormat('es', { style: 'currency', currency: m, maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 }).format(v); }
    catch (e) { return (Math.round(v * 100) / 100).toLocaleString('es') + ' ' + m; }
  };
  U.num = function (v, d) { if (!isFinite(v)) return '∞'; return C.n(v).toLocaleString('es', { maximumFractionDigits: d == null ? 2 : d }); };
  U.pct = function (v, d) { return isFinite(v) ? U.num(v, d == null ? 1 : d) + ' %' : '—'; };
  U.compacto = function (v) { var a = Math.abs(v); return a >= 1e6 ? U.num(v / 1e6, 1) + ' M' : a >= 1e3 ? U.num(v / 1e3, a >= 1e4 ? 0 : 1) + ' k' : U.num(v, 0); };
  U.fecha = function (s) { if (!s) return ''; var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  U.mesCorto = function (ym) { return MESES[+ym.slice(5, 7) - 1] + (ym.slice(5, 7) === '01' ? ' ' + ym.slice(2, 4) : ''); };
  U.mesLargo = function (ym) { return MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); };
  U.esc = T.esc;
  var seq = 0;

  /* campo: {etq, tipo, valor, op:[[v,t]], ...attrs}. Devuelve {el, input} */
  U.campo = function (etq, p) {
    p = p || {}; var id = 'mc' + (++seq), tipo = p.tipo || 'text', inp;
    if (tipo === 'select') { inp = h('select', { id: id }, (p.op || []).map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); }
    else if (tipo === 'textarea') inp = h('textarea', { id: id, rows: p.rows || 3 });
    else inp = h('input', { id: id, type: tipo === 'dinero' || tipo === 'numero' ? 'number' : tipo });
    ['min', 'max', 'step', 'placeholder', 'maxlength', 'list', 'autocomplete'].forEach(function (k) { if (p[k] != null) inp.setAttribute(k, p[k]); });
    if (tipo === 'dinero' || tipo === 'numero') { inp.setAttribute('inputmode', 'decimal'); if (!p.step) inp.setAttribute('step', 'any'); }
    if (p.valor != null) inp.value = p.valor;
    if (p.alCambiar) { inp.addEventListener('input', function () { p.alCambiar(inp.value, inp); }); if (tipo === 'select') inp.addEventListener('change', function () { p.alCambiar(inp.value, inp); }); }
    var el = h('div', { cls: 'mon-campo' + (p.cls ? ' ' + p.cls : '') }, [h('label', { for: id, txt: etq }), inp, p.ayuda ? h('span', { cls: 'tr-ayuda', txt: p.ayuda }) : null]);
    return { el: el, input: inp };
  };
  U.btn = function (txt, fn, cls, extra) { return h('button', Object.assign({ type: 'button', cls: 'tr-btn' + (cls ? ' ' + cls : ''), txt: txt, on: { click: fn } }, extra || {})); };
  U.panel = function (titulo, hijos, o) { o = o || {}; return h('section', { cls: 'tr-panel' + (o.cls ? ' ' + o.cls : ''), id: o.id, 'aria-label': titulo }, [h('h2', { cls: 'mon-h2', txt: titulo }), o.sub ? h('p', { cls: 'tr-ayuda', txt: o.sub }) : null].concat(hijos || [])); };
  U.det = function (titulo, hijos, abierto) { var d = h('details', { cls: 'mon-det' }, [h('summary', { txt: titulo })].concat(hijos)); if (abierto) d.open = true; return d; };
  U.nota = function (txt, av) { return h('p', { cls: 'tr-nota' + (av ? ' tr-av' : ''), txt: txt }); };
  U.kpi = function (etq, valor, sub, tono) { return h('div', { cls: 'mon-kpi' + (tono ? ' mon-' + tono : '') }, [h('span', { cls: 'mon-kpi-e', txt: etq }), h('strong', { cls: 'mon-kpi-v', txt: valor }), sub ? h('span', { cls: 'mon-kpi-s', txt: sub }) : null]); };
  U.tabla = function (cols, filas, o) {
    o = o || {};
    var t = h('table', { cls: 'mon-tabla' }, [h('thead', {}, [h('tr', {}, cols.map(function (c) { return h('th', { scope: 'col', cls: c.der ? 'mon-der' : '', txt: c.t }); }))]),
      h('tbody', {}, filas.map(function (f) { return h('tr', {}, cols.map(function (c, i) { var v = c.f ? c.f(f) : f[c.k]; return h('td', { cls: c.der ? 'mon-der' : '', 'data-et': c.t }, [v instanceof Node ? v : String(v == null ? '' : v)]); })); }))]);
    return h('div', { cls: 'mon-tabla-cont', tabindex: 0, role: 'region', 'aria-label': o.etq || 'Tabla' }, [t]);
  };
  /* calculadora generica: campos[{id,etq,def,paso,tipo}], calc(v) -> [[etq,valor,nota?]...] */
  U.calculadora = function (o) {
    var refs = {}, sal = h('dl', { cls: 'mon-res', 'aria-live': 'polite' }), cab = h('div', { cls: 'tr-fila mon-campos' });
    o.campos.forEach(function (c) { var f = U.campo(c.etq, { tipo: c.tipo || 'numero', valor: c.def, min: c.min == null ? 0 : c.min, step: c.paso, alCambiar: pintar, ayuda: c.ayuda }); refs[c.id] = f.input; cab.appendChild(f.el); });
    function vals() { var v = {}; Object.keys(refs).forEach(function (k) { v[k] = C.n(refs[k].value); }); return v; }
    function pintar() { sal.textContent = ''; var r; try { r = o.calc(vals()); } catch (e) { r = [['Error', e.message]]; } r.forEach(function (x) { sal.appendChild(h('div', {}, [h('dt', { txt: x[0] }), h('dd', { txt: x[1] })])); }); }
    pintar();
    return h('article', { cls: 'mon-calc', id: o.id }, [h('h3', { txt: o.titulo }), o.ayuda ? h('p', { cls: 'tr-ayuda', txt: o.ayuda }) : null, cab, sal]);
  };
  /* formulario por definicion: defs[{id,etq,tipo,op,valor,ayuda,cls,min,step,list}] -> {el, val(), poner(obj), refs} */
  U.form = function (defs) {
    var refs = {}, el = h('div', { cls: 'tr-fila mon-campos' });
    defs.forEach(function (d) { var f = U.campo(d.etq, d); refs[d.id] = f.input; el.appendChild(f.el); if (d.cls === 'ancho') f.el.style.flexBasis = '100%'; });
    function val() { var o = {}; defs.forEach(function (d) { var v = refs[d.id].value; o[d.id] = d.tipo === 'dinero' || d.tipo === 'numero' ? (v === '' ? '' : C.n(v)) : v.trim ? v.trim() : v; }); return o; }
    function poner(o) { defs.forEach(function (d) { var v = o && o[d.id] != null ? o[d.id] : (d.valor != null ? d.valor : ''); refs[d.id].value = v; }); }
    return { el: el, val: val, poner: poner, refs: refs };
  };
  U.datalist = function (id, vals) { return h('datalist', { id: id }, vals.map(function (v) { return h('option', { value: v }); })); };
  /* dialogo modal de frase: devuelve Promise<string|null> */
  U.pedirFrase = function (msg, confirmar) {
    return new Promise(function (ok) {
      var d = h('dialog', { cls: 'mon-dlg', 'aria-label': 'Frase de cifrado' }), a = U.campo('Frase de cifrado (mín. 8 caracteres)', { tipo: 'password', autocomplete: 'off' }), b = confirmar ? U.campo('Repite la frase', { tipo: 'password', autocomplete: 'off' }) : null, er = h('p', { cls: 'tr-ayuda mon-err', role: 'alert' });
      function fin(v) { d.close(); d.remove(); ok(v); }
      var f = h('form', { method: 'dialog', on: { submit: function (e) { e.preventDefault(); var v = a.input.value; if (v.length < 8) { er.textContent = 'Mínimo 8 caracteres.'; return; } if (b && b.input.value !== v) { er.textContent = 'Las frases no coinciden.'; return; } fin(v); } } },
        [h('p', { txt: msg }), a.el, b ? b.el : null, er, h('div', { cls: 'tr-acciones' }, [h('button', { cls: 'tr-btn', type: 'submit', txt: 'Aceptar' }), h('button', { cls: 'tr-btn', type: 'button', txt: 'Cancelar', on: { click: function () { fin(null); } } })])]);
      d.appendChild(f); d.addEventListener('cancel', function (e) { e.preventDefault(); fin(null); }); document.body.appendChild(d); d.showModal(); a.input.focus();
    });
  };
  U.descargarTexto = function (txt, nombre, mime) { T.descargar(new Blob([txt], { type: mime || 'text/plain;charset=utf-8' }), nombre); };
  U.leerArchivo = function (accept, fn) {
    var i = h('input', { type: 'file', accept: accept, hidden: true }); document.body.appendChild(i);
    i.addEventListener('change', function () { var f = i.files[0]; i.remove(); if (f) f.text().then(fn); }); i.click();
  };
})(window);
