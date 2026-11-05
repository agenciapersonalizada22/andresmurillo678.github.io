/* UI base: helpers DOM, paneles modales apilados, avisos, controles de ajustes y navegacion con mando por los menus. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var UI = BM.ui = { pila: [] }, doc = G.document, capas, toasts;

  function h(tag, props, kids) {
    var e = doc.createElement(tag);
    for (var k in props || {}) {
      var v = props[k];
      if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  UI.h = h;
  UI.btn = function (txt, fn, cls, extra) { var p = { type: 'button', cls: 'btn ' + (cls || ''), txt: txt, on: { click: function (e) { BM.sonido.click(); fn(e); } } }; for (var k in extra || {}) p[k] = extra[k]; return h('button', p); };

  UI.iniciar = function () {
    capas = doc.getElementById('capas'); toasts = doc.getElementById('avisos');
  };

  UI.toast = function (txt, tipo, ms) {
    var t = h('div', { cls: 'aviso ' + (tipo || ''), txt: txt, role: 'status' }); toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(function () { t.classList.add('sale'); setTimeout(function () { t.remove(); }, 350); }, ms || 2600);
  };

  /* Panel modal. opts: {titulo, cuerpo:Node, pie:[Node], ancho, alCerrar, noCerrar, cls} -> {el, cerrar, cuerpo} */
  UI.panel = function (o) {
    var cuerpo = h('div', { cls: 'p-cuerpo' }, [o.cuerpo]);
    var cab = h('div', { cls: 'p-cab' }, [h('h2', { txt: o.titulo || '' })]);
    var api = {};
    if (!o.noCerrar) cab.appendChild(h('button', { type: 'button', cls: 'btn icono', 'aria-label': 'Cerrar', txt: '✕', on: { click: function () { api.cerrar(); } } }));
    var tarj = h('div', { cls: 'tarjeta ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true', style: o.ancho ? 'max-width:' + o.ancho + 'px' : '' }, [cab, cuerpo, o.pie && o.pie.length ? h('div', { cls: 'p-pie' }, o.pie) : null]);
    var el = h('div', { cls: 'capa' }, [tarj]);
    el.addEventListener('pointerdown', function (e) { if (e.target === el && !o.noCerrar) api.cerrar(); });
    capas.appendChild(el); UI.pila.push(api);
    api.el = el; api.tarjeta = tarj; api.cuerpo = cuerpo; api.opts = o;
    api.cerrar = function (forzado) {
      var i = UI.pila.indexOf(api); if (i < 0) return;
      UI.pila.splice(i, 1); el.remove();
      if (o.alCerrar) o.alCerrar(forzado);
      var top = UI.pila[UI.pila.length - 1]; if (top && G.Mando && G.Mando.activo) UI.enfocar(top.el);
      BM.vista.marcar();
    };
    document.body.classList.add('con-panel');
    if (G.Mando && G.Mando.activo) UI.enfocar(el); else { var f = el.querySelector('[data-foco]'); if (f) f.focus({ preventScroll: true }); }
    return api;
  };
  UI.cerrarTodos = function () { while (UI.pila.length) UI.pila[UI.pila.length - 1].cerrar(true); };
  UI.hayPanel = function () { return UI.pila.length > 0; };
  UI.confirmar = function (msg, ok, txtOk) {
    var p = UI.panel({ titulo: 'Confirmar', cuerpo: h('p', { txt: msg }), ancho: 380, pie: [UI.btn('Cancelar', function () { p.cerrar(); }, 'sec'), UI.btn(txtOk || 'Aceptar', function () { p.cerrar(); ok(); }, 'prim', { 'data-foco': 1 })] });
    return p;
  };

  UI.fmtTiempo = function (ms, dec) {
    var s = ms / 1000; if (s < 60) return (dec ? s.toFixed(1) : Math.floor(s)) + ' s';
    var m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + (dec ? r.toFixed(1) : Math.floor(r));
  };
  UI.fmtFecha = function (t) { var d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); };

  /* ---------- controles de ajustes ---------- */
  UI.fila = function (etq, ctrl, ayuda) { return h('label', { cls: 'fila' }, [h('span', { cls: 'etq' }, [etq, ayuda ? h('small', { txt: ayuda }) : null]), ctrl]); };
  UI.interruptor = function (etq, get, set, ayuda) {
    var i = h('input', { type: 'checkbox', cls: 'sw' }); i.checked = !!get();
    i.addEventListener('change', function () { set(i.checked); }); return UI.fila(etq, i, ayuda);
  };
  UI.deslizador = function (etq, get, set, min, max, paso, fmt, ayuda) {
    var i = h('input', { type: 'range', min: min, max: max, step: paso }), v = h('output'); i.value = get();
    function pinta() { v.textContent = fmt ? fmt(+i.value) : i.value; } pinta();
    i.addEventListener('input', function () { pinta(); set(+i.value); });
    var f = UI.fila(etq, h('span', { cls: 'ctl-rango' }, [i, v]), ayuda); f.refrescar = function () { i.value = get(); pinta(); }; return f;
  };
  UI.selector = function (etq, opciones, get, set, ayuda) {
    var s = h('select', { cls: 'sel' }, opciones.map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); s.value = get();
    s.addEventListener('change', function () { set(s.value); }); var f = UI.fila(etq, s, ayuda); f.refrescar = function () { s.value = get(); }; return f;
  };

  /* Pestanas: [{id,nombre,pintar(contenedor)}] -> nodo */
  UI.pestanas = function (lista, inicial) {
    var barra = h('div', { cls: 'pestanas', role: 'tablist' }), cont = h('div', { cls: 'pest-cont' }), bs = {};
    function ir(id) {
      Object.keys(bs).forEach(function (k) { bs[k].setAttribute('aria-selected', String(k === id)); });
      cont.textContent = ''; lista.filter(function (t) { return t.id === id; })[0].pintar(cont); cont.scrollTop = 0;
    }
    lista.forEach(function (t) { bs[t.id] = h('button', { type: 'button', role: 'tab', cls: 'pestana', txt: t.nombre, 'aria-selected': 'false', on: { click: function () { BM.sonido.click(); ir(t.id); } } }); barra.appendChild(bs[t.id]); });
    var raiz = h('div', { cls: 'pests' }, [barra, cont]); ir(inicial || lista[0].id); return raiz;
  };

  /* ---------- navegacion con mando por menus ---------- */
  var rep = {};
  function visible(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }
  function focuseables(raiz) { return Array.prototype.filter.call(raiz.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[data-f]'), visible); }
  UI.raizNav = function () {
    if (BM.cuenta && BM.cuenta.dialogoAbierto()) return BM.cuenta.dialogoRaiz();
    if (UI.pila.length) return UI.pila[UI.pila.length - 1].el;
    var ini = doc.getElementById('inicio'); return ini && !ini.hidden ? ini : null;
  };
  UI.enfocar = function (raiz) {
    var l = focuseables(raiz); if (!l.length) return;
    var pref = l.filter(function (e) { return e.hasAttribute('data-foco'); })[0] || l.filter(function (e) { return e.className.indexOf('prim') >= 0; })[0] || l[0];
    pref.focus({ preventScroll: false });
  };
  function dir(raiz, dx, dy) {
    var l = focuseables(raiz), cur = doc.activeElement;
    if (!cur || l.indexOf(cur) < 0) { UI.enfocar(raiz); return; }
    if (dx && cur.tagName === 'INPUT' && cur.type === 'range') {
      var st = +cur.step || 1; cur.value = Math.max(+cur.min, Math.min(+cur.max, +cur.value + dx * st)); cur.dispatchEvent(new Event('input', { bubbles: true })); return;
    }
    if (dx && cur.tagName === 'SELECT') {
      var i = Math.max(0, Math.min(cur.options.length - 1, cur.selectedIndex + dx)); if (i !== cur.selectedIndex) { cur.selectedIndex = i; cur.dispatchEvent(new Event('change', { bubbles: true })); } return;
    }
    var a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, mejor = null, ms = 1e9;
    l.forEach(function (e) {
      if (e === cur) return;
      var r = e.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2, px = (ex - ax) * dx, py = (ey - ay) * dy;
      var prim = dx ? px : py;
      var sec = dx ? Math.max(0, Math.max(a.top, r.top) - Math.min(a.bottom, r.bottom)) : Math.max(0, Math.max(a.left, r.left) - Math.min(a.right, r.right));
      if (prim <= 2) return;
      var s = prim + sec * 2.5 + (dx ? Math.abs(ey - ay) : Math.abs(ex - ax)) * 0.3; if (s < ms) { ms = s; mejor = e; }
    });
    if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else if (dy) { var sc = raiz.querySelector('.p-cuerpo, .pest-cont') || raiz; sc.scrollTop += dy * 60; }
  }
  function r(clave, activo, dt) {
    var o = rep[clave] || (rep[clave] = { t: 0, n: 0 });
    if (!activo) { o.n = 0; return false; }
    if (o.n === 0) { o.n = 1; o.t = 380; return true; }
    o.t -= dt; if (o.t <= 0) { o.t = 120; return true; } return false;
  }
  UI.nav = function (dt) {
    var M = G.Mando, raiz = UI.raizNav(); if (!M || !M.conectado || !raiz) return false;
    var s = M.ejes.izq, dx = 0, dy = 0;
    if (r('l', M.sostenido('IZQ') || s.x < -0.55, dt)) dx = -1; else if (r('r', M.sostenido('DER') || s.x > 0.55, dt)) dx = 1;
    if (r('u', M.sostenido('ARRIBA') || s.y < -0.55, dt)) dy = -1; else if (r('d', M.sostenido('ABAJO') || s.y > 0.55, dt)) dy = 1;
    if (dx || dy) { dir(raiz, dx, dy); BM.sonido.click(); }
    var cur = doc.activeElement;
    if (M.pulsado('A')) {
      if (!cur || !raiz.contains(cur)) UI.enfocar(raiz);
      else if (cur.tagName === 'INPUT' && (cur.type === 'checkbox' || cur.type === 'radio')) cur.click();
      else if (cur.tagName === 'INPUT' && cur.type === 'text') cur.focus();
      else if (cur.tagName !== 'SELECT' && cur.tagName !== 'INPUT') cur.click();
    }
    if (M.pulsado('B') && BM.cuenta && BM.cuenta.dialogoAbierto()) doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    else if (M.pulsado('B') && UI.pila.length) { var top = UI.pila[UI.pila.length - 1]; if (!top.opts.noCerrar) top.cerrar(); else if (top.opts.alB) top.opts.alB(); }
    if (M.pulsado('MENU') && UI.pila.length && UI.pila[UI.pila.length - 1].opts.alMenu) UI.pila[UI.pila.length - 1].opts.alMenu();
    var tabs = raiz.querySelectorAll('[role=tab]');
    if (tabs.length && (M.pulsado('LB') || M.pulsado('RB'))) {
      var idx = Array.prototype.findIndex.call(tabs, function (t) { return t.getAttribute('aria-selected') === 'true'; });
      var n = Math.max(0, Math.min(tabs.length - 1, idx + (M.pulsado('RB') ? 1 : -1))); tabs[n].click(); tabs[n].focus();
    }
    return true;
  };
})(window);
