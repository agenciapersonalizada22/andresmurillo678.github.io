/* Utilidades de interfaz: h(), iconos, avisos, dialogos, menus, arrastre por puntero, gestos. */
(function (G) {
  'use strict';
  var doc = G.document, UI = {};
  UI.h = function (tag, props, kids) {
    var e = doc.createElement(tag), k;
    for (k in props || {}) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'cls') e.className = v; else if (k === 'txt') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]);
      else if (k === 'style') e.style.cssText = v; else if (k === 'value') e.value = v; else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' || typeof c === 'number' ? doc.createTextNode(c) : c); });
    return e;
  };
  var h = UI.h;
  var P = {
    plus: 'M12 5v14M5 12h14', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', check: 'M5 12.5l4.5 4.5L19 7.5', note: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
    task: 'M4 5h16v14H4zM8 12l3 3 5-6', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z', gantt: 'M3 6h9M7 12h11M5 18h8',
    habit: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z', timer: 'M12 7v5l3 2M9 2h6M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8l-1 3 2 1v2l-2 1 1 3 2-.5L7.5 19 7 21l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
    menu: 'M4 7h16M4 12h16M4 17h16', pin: 'M9 3h6l-1 6 3 3H7l3-3zM12 12v9', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', archive: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4',
    tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01', folder: 'M3 6h6l2 2h10v11H3z', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3', clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
    repeat: 'M4 12V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H6M9 21l-3-3 3-3', flag: 'M5 21V4M5 4h12l-2 4 2 4H5', back: 'M15 5l-7 7 7 7', more: 'M5 12h.01M12 12h.01M19 12h.01',
    mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4', x: 'M6 6l12 12M18 6L6 18', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
    share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4', home: 'M4 11l8-7 8 7v9H4z',
    inbox: 'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', play: 'M7 4l12 8-12 8z', pause: 'M8 5v14M16 5v14',
    skip: 'M5 5l10 7-10 7zM18 5v14', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3', edit: 'M4 20h4L19 9l-4-4L4 16z', copy: 'M8 8h12v12H8zM4 16V4h12', download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
    upload: 'M12 16V5M7 9l5-5 5 5M5 20h14', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01', history: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'
  };
  UI.icono = function (n, cls) {
    var s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic ' + (cls || '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    p.setAttribute('d', P[n] || P.more); s.appendChild(p); return s;
  };
  UI.boton = function (txt, fn, o) {
    o = o || {};
    var b = h('button', { type: 'button', cls: 'btn ' + (o.cls || ''), title: o.titulo, 'aria-label': o.aria || (o.icono && !txt ? o.titulo : null), on: { click: fn } }, [o.icono ? UI.icono(o.icono) : null, txt ? h('span', { txt: txt }) : null]);
    return b;
  };

  /* ---------- avisos ---------- */
  var cAvisos, vivo;
  UI.anunciar = function (t) { if (!vivo) vivo = doc.getElementById('vivo'); if (vivo) { vivo.textContent = ''; setTimeout(function () { vivo.textContent = t; }, 30); } };
  UI.aviso = function (texto, o) {
    o = o || {}; if (!cAvisos) cAvisos = doc.getElementById('avisos');
    var acc = (o.acciones || []).map(function (a) { return h('button', { type: 'button', cls: 'btn pq', txt: a.txt, on: { click: function () { cerrar(); a.fn(); } } }); });
    var t = h('div', { cls: 'aviso ' + (o.tipo || ''), role: o.tipo === 'error' ? 'alert' : 'status' }, [h('span', { cls: 'aviso-t', txt: texto })].concat(acc, o.fijo ? [h('button', { type: 'button', cls: 'btn pq ic-b', 'aria-label': 'Cerrar aviso', on: { click: function () { cerrar(); } } }, [UI.icono('x')])] : []));
    function cerrar() { t.remove(); }
    cAvisos.appendChild(t); while (cAvisos.children.length > 4) cAvisos.firstChild.remove();
    if (!o.fijo) setTimeout(cerrar, o.ms || (acc.length ? 6500 : 3200));
    return cerrar;
  };

  /* ---------- dialogos ---------- */
  var pila = [];
  UI.hayDialogo = function () { return pila.length > 0; };
  UI.dialogoSup = function () { return pila.length ? pila[pila.length - 1].el : null; };
  UI.cerrarDialogo = function () { if (pila.length) pila[pila.length - 1].cerrar(); };
  /* UI.dialogo({titulo, cuerpo(Node), acciones:[{txt,fn,cls}], ancho, lateral, alCerrar}) */
  UI.dialogo = function (o) {
    var prev = doc.activeElement, cerrado = false, capa = doc.getElementById('capas');
    var cab = h('div', { cls: 'dlg-cab' }, [h('h2', { id: 'dt' + pila.length, txt: o.titulo || '' }), h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Cerrar', 'data-f': 1, on: { click: function () { cerrar(); } } }, [UI.icono('x')])]);
    var pie = o.acciones && o.acciones.length ? h('div', { cls: 'dlg-pie' }, o.acciones.map(function (a) {
      return h('button', { type: 'button', cls: 'btn ' + (a.cls || ''), txt: a.txt, 'data-f': 1, on: { click: function () { if (a.fn && a.fn(d) === false) return; if (!a.queda) cerrar(); } } });
    })) : null;
    var caja = h('div', { cls: 'dlg ' + (o.lateral ? 'lateral ' : '') + (o.cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dt' + pila.length, style: o.ancho ? 'max-width:' + o.ancho + 'px' : null }, [cab, h('div', { cls: 'dlg-cuerpo' }, [o.cuerpo]), pie]);
    var fondo = h('div', { cls: 'fondo', on: { mousedown: function (e) { if (e.target === fondo) cerrar(); } } }, [caja]);
    function cerrar() {
      if (cerrado) return; cerrado = true; var i = pila.indexOf(d); if (i >= 0) pila.splice(i, 1);
      fondo.remove(); if (o.alCerrar) o.alCerrar(); if (prev && prev.focus && doc.contains(prev)) try { prev.focus(); } catch (e) {}
      doc.body.classList.toggle('conDialogo', pila.length > 0);
    }
    var d = { el: caja, fondo: fondo, cerrar: cerrar, cuerpo: caja.querySelector('.dlg-cuerpo') };
    fondo.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(); }
      else if (e.key === 'Tab') {
        var f = foco(caja); if (!f.length) return; var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    pila.push(d); capa.appendChild(fondo); doc.body.classList.add('conDialogo');
    var ini0 = caja.querySelector('[autofocus],[data-ini]'); if (ini0) ini0.focus();
    setTimeout(function () { if (caja.contains(doc.activeElement) && doc.activeElement !== caja) return; var ini = foco(caja)[1] || foco(caja)[0]; if (ini) ini.focus(); }, 30);
    return d;
  };
  function foco(raiz) {
    return Array.prototype.filter.call(raiz.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),summary,[contenteditable="true"]'), function (e) { return !e.disabled && !e.hidden && e.offsetParent !== null; });
  }
  UI.focoDe = foco;
  UI.confirmar = function (titulo, texto, ok, o) {
    o = o || {};
    UI.dialogo({ titulo: titulo, ancho: 420, cuerpo: h('p', { txt: texto }), acciones: [{ txt: 'Cancelar' }, { txt: o.txt || 'Aceptar', cls: o.peligro ? 'peligro' : 'prim', fn: function () { ok(); } }] });
  };
  UI.preguntar = function (titulo, etiqueta, valor, ok, o) {
    o = o || {};
    var inp = h('input', { type: o.tipo || 'text', cls: 'campo', value: valor || '', 'aria-label': etiqueta, autocomplete: 'off', 'data-ini': 1, 'data-f': 1 });
    var inp2 = o.repetir ? h('input', { type: o.tipo || 'text', cls: 'campo', 'aria-label': 'Repite ' + etiqueta, placeholder: 'Repite para confirmar', autocomplete: 'off', 'data-f': 1 }) : null;
    var err = h('p', { cls: 'err', role: 'alert' });
    function enviar(d) {
      if (inp2 && inp.value !== inp2.value) { err.textContent = 'Los dos valores no coinciden'; return false; }
      if (o.min && inp.value.length < o.min) { err.textContent = 'Mínimo ' + o.min + ' caracteres'; return false; }
      if (!o.vacio && !inp.value.trim()) return false;
      var r = ok(inp.value, d); return r === false ? false : undefined;
    }
    var d = UI.dialogo({ titulo: titulo, ancho: 420, cuerpo: h('div', {}, [o.ayuda ? h('p', { cls: 'ayuda', txt: o.ayuda }) : null, h('label', { cls: 'etq' }, [etiqueta, inp]), inp2, err]), acciones: [{ txt: 'Cancelar' }, { txt: o.txt || 'Aceptar', cls: 'prim', fn: function () { return enviar(d); } }] });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (enviar(d) !== false) d.cerrar(); } });
    return d;
  };

  /* ---------- menu emergente ---------- */
  var menuAct = null;
  UI.cerrarMenu = function () { if (menuAct) { menuAct.cerrar(); menuAct = null; } };
  UI.menu = function (ancla, items, o) {
    UI.cerrarMenu();
    var prev = doc.activeElement;
    var m = h('div', { cls: 'menu', role: 'menu' }, items.filter(Boolean).map(function (it) {
      if (it.sep) return h('div', { cls: 'sep', role: 'separator' });
      if (it.titulo) return h('div', { cls: 'menu-t', txt: it.titulo });
      return h('button', { type: 'button', role: 'menuitem', cls: 'menu-i' + (it.peligro ? ' peligro' : ''), 'data-f': 1, on: { click: function () { UI.cerrarMenu(); if (it.fn) it.fn(); } } }, [it.icono ? UI.icono(it.icono) : h('span', { cls: 'ic' }), h('span', { txt: it.txt }), it.marca ? h('span', { cls: 'marca', txt: '✓' }) : null]);
    }));
    var fondo = h('div', { cls: 'fondo-menu', on: { mousedown: function () { UI.cerrarMenu(); } } });
    doc.getElementById('capas').appendChild(fondo); doc.getElementById('capas').appendChild(m);
    var r = ancla.getBoundingClientRect ? ancla.getBoundingClientRect() : { left: ancla.x, right: ancla.x, top: ancla.y, bottom: ancla.y, width: 0 };
    var W = G.innerWidth, H = G.innerHeight, mw = m.offsetWidth, mh = m.offsetHeight;
    var x = Math.min(Math.max(8, (o && o.derecha ? r.right - mw : r.left)), W - mw - 8), y = r.bottom + 4;
    if (y + mh > H - 8) y = Math.max(8, r.top - mh - 4);
    m.style.left = x + 'px'; m.style.top = y + 'px'; m.style.maxHeight = (H - 16) + 'px';
    m.addEventListener('keydown', function (e) {
      var b = Array.prototype.slice.call(m.querySelectorAll('button')), i = b.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); b[(i + 1) % b.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); b[(i - 1 + b.length) % b.length].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); UI.cerrarMenu(); }
    });
    menuAct = { el: m, cerrar: function () { m.remove(); fondo.remove(); if (prev && prev.focus && doc.contains(prev)) try { prev.focus(); } catch (e) {} } };
    var p = m.querySelector('button'); if (p) p.focus();
    return menuAct;
  };

  /* ---------- arrastre por puntero (raton y tactil) ----------
     UI.arrastrable(el, {datos, alIniciar, alSoltar(destinoEl, datos, evento), selector:'[data-drop]', largo:true, handle}) */
  UI.arrastrable = function (el, o) {
    var st = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (o.handle && !e.target.closest(o.handle)) || e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.target.closest('.chk,.ic-b,a')) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, activo: false, tactil: e.pointerType !== 'mouse', t: 0 };
      if (st.tactil) st.t = setTimeout(function () { if (st && !st.activo) empezar(); }, 320);
    });
    function empezar() {
      if (!st || st.activo) return; st.activo = true; clearTimeout(st.t);
      var r = el.getBoundingClientRect();
      st.fantasma = el.cloneNode(true); st.fantasma.classList.add('fantasma'); st.fantasma.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;width:' + r.width + 'px;left:' + r.left + 'px;top:' + r.top + 'px;margin:0';
      st.dx = st.x - r.left; st.dy = st.y - r.top; doc.body.appendChild(st.fantasma); el.classList.add('arrastrando'); doc.body.classList.add('arrastre');
      try { el.setPointerCapture(st.id); } catch (er) {}
      if (G.navigator.vibrate && st.tactil) G.navigator.vibrate(15);
      if (o.alIniciar) o.alIniciar();
    }
    el.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      if (!st.activo) {
        var d = Math.hypot(e.clientX - st.x, e.clientY - st.y);
        if (st.tactil) { if (d > 10) { clearTimeout(st.t); st = null; } return; }
        if (d > 6) empezar(); else return;
      }
      e.preventDefault();
      st.fantasma.style.left = (e.clientX - st.dx) + 'px'; st.fantasma.style.top = (e.clientY - st.dy) + 'px';
      var d2 = destino(e); doc.querySelectorAll('.sobre').forEach(function (x) { if (x !== d2) x.classList.remove('sobre'); }); if (d2) d2.classList.add('sobre');
      var sc = d2 && d2.closest('.scroll-x,.scroll-y,.dlg-cuerpo') || null; autoScroll(e, sc);
    });
    function autoScroll(e, sc) {
      var cont = doc.querySelector('.arrastre-cont'); sc = cont || sc; if (!sc) return; var r = sc.getBoundingClientRect();
      if (e.clientX < r.left + 40) sc.scrollLeft -= 12; else if (e.clientX > r.right - 40) sc.scrollLeft += 12;
      if (e.clientY < r.top + 40) sc.scrollTop -= 12; else if (e.clientY > r.bottom - 40) sc.scrollTop += 12;
    }
    function destino(e) {
      st.fantasma.style.display = 'none'; var x = doc.elementFromPoint(e.clientX, e.clientY); st.fantasma.style.display = '';
      return x && x.closest(o.selector || '[data-drop]');
    }
    function fin(e, cancel) {
      if (!st || e.pointerId !== st.id) return; clearTimeout(st.t);
      if (st.activo) {
        var d = cancel ? null : destino(e);
        st.fantasma.remove(); el.classList.remove('arrastrando'); doc.body.classList.remove('arrastre');
        doc.querySelectorAll('.sobre').forEach(function (x) { x.classList.remove('sobre'); });
        var evitar = function (ev) { ev.stopPropagation(); ev.preventDefault(); }; el.addEventListener('click', evitar, { capture: true, once: true }); setTimeout(function () { el.removeEventListener('click', evitar, true); }, 50);
        if (d && o.alSoltar) o.alSoltar(d, o.datos ? o.datos() : null, e);
      }
      st = null;
    }
    el.addEventListener('pointerup', function (e) { fin(e, false); }); el.addEventListener('pointercancel', function (e) { fin(e, true); });
    el.addEventListener('contextmenu', function (e) { if (st && st.activo) e.preventDefault(); });
    el.style.touchAction = 'pan-y'; el.addEventListener('touchmove', function (e) { if (st && st.activo) e.preventDefault(); }, { passive: false });
  };

  /* ---------- deslizar para completar / aplazar ---------- */
  UI.deslizable = function (el, fnDer, fnIzq, fondoDer, fondoIzq) {
    var s = null;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || e.target.closest('.chk,.ic-b,input,a')) return; s = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, bloq: false }; });
    el.addEventListener('pointermove', function (e) {
      if (!s || e.pointerId !== s.id) return; var dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.act) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { s = null; return; } if (Math.abs(dx) < 14) return; s.act = true; el.classList.add('desliza'); try { el.setPointerCapture(s.id); } catch (er) {} }
      s.dx = dx; el.style.transform = 'translateX(' + Math.max(-140, Math.min(140, dx)) + 'px)'; el.dataset.lado = dx > 0 ? 'der' : 'izq'; el.classList.toggle('umbral', Math.abs(dx) > 80);
    });
    function fin() {
      if (!s) return; var dx = s.dx, act = s.act; s = null; el.style.transform = ''; el.classList.remove('desliza', 'umbral'); delete el.dataset.lado;
      if (act) { var evitar = function (ev) { ev.stopPropagation(); ev.preventDefault(); }; el.addEventListener('click', evitar, { capture: true, once: true }); setTimeout(function () { el.removeEventListener('click', evitar, true); }, 60); }
      if (act && dx > 80 && fnDer) fnDer(); else if (act && dx < -80 && fnIzq) fnIzq();
    }
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  };

  UI.fmtHora = function (ms) { var d = new Date(ms); return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); };
  UI.fmtDur = function (min) { min = Math.round(min); if (min < 60) return min + ' min'; var h2 = Math.floor(min / 60), m = min % 60; return h2 + ' h' + (m ? ' ' + m + ' min' : ''); };
  UI.fmtRel = function (ms) {
    var d = (Date.now() - ms) / 1000;
    if (d < 60) return 'ahora'; if (d < 3600) return Math.floor(d / 60) + ' min'; if (d < 86400) return Math.floor(d / 3600) + ' h';
    if (d < 86400 * 7) return Math.floor(d / 86400) + ' d'; var f = new Date(ms); return f.getDate() + ' ' + G.Fechas.nombreMes(f.getMonth() + 1, true);
  };
  UI.descargar = function (nombre, datos, tipo) {
    var b = datos instanceof Blob ? datos : new Blob([datos], { type: tipo || 'text/plain' }), u = URL.createObjectURL(b), a = h('a', { href: u, download: nombre });
    doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  };
  UI.leerArchivo = function (accept, cb, binario) {
    var i = h('input', { type: 'file', accept: accept, style: 'position:fixed;left:-999px' });
    i.addEventListener('change', function () { var f = i.files[0]; i.remove(); if (!f) return; var r = new FileReader(); r.onload = function () { cb(r.result, f); }; binario ? r.readAsArrayBuffer(f) : r.readAsText(f); });
    doc.body.appendChild(i); i.click();
  };
  UI.copiar = function (t) {
    if (G.navigator.clipboard && G.navigator.clipboard.writeText) return G.navigator.clipboard.writeText(t).catch(function () { return viejo(t); });
    return Promise.resolve(viejo(t));
  };
  function viejo(t) { var a = h('textarea', { style: 'position:fixed;opacity:0' }); a.value = t; doc.body.appendChild(a); a.select(); try { doc.execCommand('copy'); } catch (e) {} a.remove(); }
  G.UI = UI;
})(window);
