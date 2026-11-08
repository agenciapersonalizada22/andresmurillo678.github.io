/* Editor visual de flujos (SVG): nodos, conexiones, zoom/paneo, deshacer/rehacer, tactil y modo lista. window.AutoEditor */
(function (g) {
  'use strict';
  var A = g.AutoApp, D = g.AutoDatos, V = g.AutoVivo, T = g.Tr, h = T.h, NS = 'http://www.w3.org/2000/svg', CAT = g.AutoCatalogo;
  var W = 200, HEAD = 28, PASO = 26;
  var E = g.AutoEditor = { flujo: null, sel: null, selA: -1, vista: { x: 20, y: 20, k: 1 }, hist: [], hi: -1, tap: null, modo: 'lienzo', ui: {} };
  var ui = E.ui, svg, capaA, capaN, capaT, gv, ptrs = new Map(), estado = null, pinch = null, tPers = 0, tCommit = 0;

  function S(tag, at, kids) { var e = document.createElementNS(NS, tag); for (var k in at || {}) if (at[k] != null) e.setAttribute(k, at[k]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function nodo(id) { return E.flujo.nodos.filter(function (n) { return n.id === id; })[0]; }
  function def(n) { return CAT.TIPOS[n.tipo]; }
  function alto(n) { var k = def(n).salidas.length; return Math.max(HEAD + 48, HEAD + 18 + k * PASO + 8); }
  function py(n, i) { return HEAD + 22 + i * PASO; }
  function corto(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function resumen(n) {
    var c = n.cfg || {}, d = def(n);
    switch (n.tipo) {
      case 'temporizador': return c.modo === 'cron' ? 'cron ' + c.cron : 'cada ' + c.valor + ' ' + c.unidad;
      case 'hora_dia': return 'a las ' + c.hora + (c.dias ? ' (' + c.dias + ')' : '');
      case 'condicion': var r = (c.reglas || [])[0]; return r ? corto(r.izq + ' ' + ((CAT.OPS.filter(function (o) { return o[0] === r.op; })[0] || [0, r.op])[1]) + ' ' + (r.der || ''), 30) : 'sin reglas';
      case 'variable': return corto((c.nombre || '?') + ' ' + ({ fijar: '=', sumar: '+=', restar: '-=', 'añadir': '<<' }[c.op] || '=') + ' ' + (c.valor == null ? '' : c.valor), 30);
      case 'espera': return c.valor + ' ' + c.unidad;
      case 'bucle': return c.modo === 'veces' ? c.veces + ' veces' : 'cada ' + corto(c.lista, 18);
      case 'cambio_datos': return corto(c.archivo + (c.ruta ? ' › ' + c.ruta : ''), 30);
      case 'nueva_oferta': return 'desde ' + c.descMin + '% de descuento';
      case 'nueva_cuota': return 'cuota ≥ ' + c.cuotaMin;
      case 'webhook': return c.ruta;
      case 'manual': return 'botón Ejecutar';
    }
    return corto((d.res || []).map(function (k) { return c[k]; }).filter(Boolean).join(' '), 30) || d.desc.slice(0, 28);
  }
  E.resumen = resumen;

  /* ---------- dibujo ---------- */
  function trayecto(x1, y1, x2, y2) { var dx = Math.max(40, Math.abs(x2 - x1) / 2); return 'M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2; }
  function puntosArista(a) {
    var o = nodo(a.de), d = nodo(a.a); if (!o || !d) return null;
    var i = Math.max(0, def(o).salidas.map(function (s) { return s[0]; }).indexOf(a.sal)); return [o.x + W, o.y + py(o, i), d.x, d.y + py(d, 0)];
  }
  function dibujarAristas() {
    capaA.textContent = '';
    E.flujo.aristas.forEach(function (a, i) {
      var p = puntosArista(a); if (!p) return; var d = trayecto(p[0], p[1], p[2], p[3]);
      var gr = S('g', { 'data-arista': i, 'class': 'au-arista' + (E.selA === i ? ' sel' : '') + (a.sal === 'error' ? ' err' : '') });
      gr.appendChild(S('path', { d: d, 'class': 'au-hit-a' })); gr.appendChild(S('path', { d: d, 'class': 'au-linea', 'marker-end': 'url(#au-flecha)' })); capaA.appendChild(gr);
    });
  }
  function dibujarNodo(n) {
    var d = def(n), col = CAT.categorias[d.categoria].color, hh = alto(n), gr = S('g', { 'class': 'au-nodo' + (E.sel === n.id ? ' sel' : '') + (E.tap && E.tap.nodo === n.id ? ' tap' : ''), 'data-nodo': n.id, transform: 'translate(' + n.x + ' ' + n.y + ')', role: 'button', 'aria-label': (n.titulo || d.nombre) + '. ' + resumen(n) });
    gr.appendChild(S('rect', { 'class': 'au-fondo', width: W, height: hh, rx: 11 }));
    gr.appendChild(S('path', { 'class': 'au-cab', d: 'M0 11a11 11 0 0 1 11-11h' + (W - 22) + 'a11 11 0 0 1 11 11v' + (HEAD - 11) + 'H0z', fill: col }));
    var ic = S('text', { 'class': 'au-ico', x: 10, y: 19 }); ic.textContent = d.icono; gr.appendChild(ic);
    var ti = S('text', { 'class': 'au-tit', x: 36, y: 19 }); ti.textContent = corto(n.titulo || d.nombre, 22); gr.appendChild(ti);
    var re = S('text', { 'class': 'au-res', x: 12, y: HEAD + 16 }); re.textContent = corto(resumen(n), 28); gr.appendChild(re);
    if (d.categoria !== 'disparador') { gr.appendChild(S('circle', { 'class': 'au-pto au-pto-e', cx: 0, cy: py(n, 0), r: 7 })); }
    d.salidas.forEach(function (s, i) {
      var y = py(n, i) + (i === 0 ? 0 : 0), esErr = s[0] === 'error';
      if (s[1]) { var lb = S('text', { 'class': 'au-lbl' + (esErr ? ' err' : ''), x: W - 13, y: y + 4, 'text-anchor': 'end' }); lb.textContent = s[1]; gr.appendChild(lb); }
      gr.appendChild(S('circle', { 'class': 'au-pto au-pto-s' + (esErr ? ' err' : '') + (E.tap && E.tap.nodo === n.id && E.tap.sal === s[0] ? ' tap' : ''), cx: W, cy: y, r: 7 }));
      gr.appendChild(S('circle', { 'class': 'au-hit-p', cx: W, cy: y, r: 16, 'data-puerto': s[0], 'data-de': n.id }));
    });
    capaN.appendChild(gr); return gr;
  }
  E.dibujar = function () {
    if (!E.flujo) return; capaN.textContent = ''; E.flujo.nodos.forEach(dibujarNodo); dibujarAristas(); aplicarVista();
    ui.vacio.hidden = E.flujo.nodos.length > 1; if (E.modo === 'lista') E.pintarLista(); pintarEstadoNodos();
  };
  function aplicarVista() { gv.setAttribute('transform', 'translate(' + E.vista.x + ' ' + E.vista.y + ') scale(' + E.vista.k + ')'); ui.zoom.textContent = Math.round(E.vista.k * 100) + '%'; }
  function pintarEstadoNodos() {
    var u = V.ultimo[E.flujo.id]; if (!u || !E.mostrarEstado) return;
    u.reg.pasos.forEach(function (p) { var el = capaN.querySelector('[data-nodo="' + p.nodo + '"]'); if (el) el.classList.add('r-' + p.estado); });
  }
  function moverNodoDom(n) { var el = capaN.querySelector('[data-nodo="' + n.id + '"]'); if (el) el.setAttribute('transform', 'translate(' + n.x + ' ' + n.y + ')'); dibujarAristas(); }

  /* ---------- historial y persistencia ---------- */
  function foto() { var f = E.flujo; return JSON.stringify({ nodos: f.nodos, aristas: f.aristas, nombre: f.nombre }); }
  function botonesHist() { ui.deshacer.disabled = E.hi <= 0; ui.rehacer.disabled = E.hi >= E.hist.length - 1; }
  E.commit = function () {
    clearTimeout(tCommit); var s = foto(); if (s === E.hist[E.hi]) return;
    E.hist = E.hist.slice(0, E.hi + 1); E.hist.push(s); if (E.hist.length > 100) E.hist.shift(); E.hi = E.hist.length - 1; botonesHist(); persistir();
  };
  function commitDiferido() { clearTimeout(tCommit); tCommit = setTimeout(E.commit, 600); }
  function persistir() { clearTimeout(tPers); tPers = setTimeout(function () { D.guardarFlujo(E.flujo).then(function () { A.emitir('flujos'); }); }, 250); }
  E.guardarYa = function () { clearTimeout(tCommit); clearTimeout(tPers); E.commit(); return E.flujo ? D.guardarFlujo(E.flujo).then(function () { A.emitir('flujos'); }) : Promise.resolve(); };
  function aplicarFoto(s) {
    var o = JSON.parse(s); E.flujo.nodos = o.nodos; E.flujo.aristas = o.aristas; E.flujo.nombre = o.nombre; ui.nombre.value = o.nombre;
    if (E.sel && !nodo(E.sel)) E.sel = null; E.selA = -1; E.tap = null; E.dibujar(); E.pintarInsp(); botonesHist(); persistir();
  }
  E.deshacer = function () { clearTimeout(tCommit); E.commit(); if (E.hi > 0) { E.hi--; aplicarFoto(E.hist[E.hi]); } };
  E.rehacer = function () { if (E.hi < E.hist.length - 1) { E.hi++; aplicarFoto(E.hist[E.hi]); } };

  /* ---------- operaciones ---------- */
  E.agregar = function (tipo, x, y) {
    var f = E.flujo, ref = E.sel && nodo(E.sel), d = CAT.TIPOS[tipo];
    if (x == null) {
      if (ref) { x = ref.x + W + 70; y = ref.y; } else { var r = svg.getBoundingClientRect(); x = (r.width / 2 - E.vista.x) / E.vista.k - W / 2; y = (r.height / 2 - E.vista.y) / E.vista.k - 30; }
      var guard = 0; while (f.nodos.some(function (n) { return Math.abs(n.x - x) < 40 && Math.abs(n.y - y) < 40; }) && guard++ < 20) { y += 40; }
    }
    var n = D.nuevoNodo(tipo, x, y, f.nodos); f.nodos.push(n);
    if (ref && d.categoria !== 'disparador') { var libre = def(ref).salidas.filter(function (s) { return !f.aristas.some(function (a) { return a.de === ref.id && a.sal === s[0]; }); })[0]; if (libre && libre[0] !== 'error') f.aristas.push({ de: ref.id, sal: libre[0], a: n.id }); }
    E.sel = n.id; E.selA = -1; E.commit(); asegurarVisible(n); E.dibujar(); E.pintarInsp(); abrirInsp(true); return n;
  };
  function asegurarVisible(n) {
    var r = svg.getBoundingClientRect(), k = E.vista.k, x0 = n.x * k + E.vista.x, y0 = n.y * k + E.vista.y, x1 = x0 + W * k, y1 = y0 + alto(n) * k, m = 12;
    if (x1 > r.width - m) E.vista.x -= x1 - (r.width - m); if (x0 < m) E.vista.x += m - x0; if (y1 > r.height - m) E.vista.y -= y1 - (r.height - m); if (y0 < m) E.vista.y += m - y0;
  }
  E.eliminar = function (id) {
    var f = E.flujo; f.nodos = f.nodos.filter(function (n) { return n.id !== id; }); f.aristas = f.aristas.filter(function (a) { return a.de !== id && a.a !== id; });
    if (E.sel === id) E.sel = null; E.commit(); E.dibujar(); E.pintarInsp();
  };
  E.duplicar = function (id) { var o = nodo(id), n = D.nuevoNodo(o.tipo, o.x + 30, o.y + 40, E.flujo.nodos); n.cfg = JSON.parse(JSON.stringify(o.cfg)); if (o.titulo) n.titulo = o.titulo; E.flujo.nodos.push(n); E.sel = n.id; E.commit(); E.dibujar(); E.pintarInsp(); };
  E.conectar = function (de, sal, a) {
    var d = nodo(de), t = nodo(a); if (!d || !t || de === a) return false;
    if (def(t).categoria === 'disparador') { A.aviso('Un disparador no puede recibir conexiones.', 'error'); return false; }
    if (E.flujo.aristas.some(function (x) { return x.de === de && x.sal === sal && x.a === a; })) { A.aviso('Esa conexión ya existe.'); return false; }
    E.flujo.aristas.push({ de: de, sal: sal, a: a }); E.commit(); return true;
  };
  E.desconectar = function (i) { E.flujo.aristas.splice(i, 1); E.selA = -1; E.commit(); E.dibujar(); };
  E.sin = function () { E.sel = null; E.selA = -1; E.tap = null; E.dibujar(); E.pintarInsp(); };
  E.seleccionar = function (id, abrir) { E.sel = id; E.selA = -1; E.tap = null; E.dibujar(); E.pintarInsp(); if (abrir !== false) abrirInsp(true); };

  /* ---------- vista (zoom / ajustar) ---------- */
  function mundo(cx, cy) { var r = svg.getBoundingClientRect(); return [(cx - r.left - E.vista.x) / E.vista.k, (cy - r.top - E.vista.y) / E.vista.k]; }
  function zoom(f, cx, cy) {
    var r = svg.getBoundingClientRect(), k = Math.max(0.3, Math.min(2.5, E.vista.k * f)); if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    var m = mundo(cx, cy); E.vista.k = k; E.vista.x = cx - r.left - m[0] * k; E.vista.y = cy - r.top - m[1] * k; aplicarVista();
  }
  E.ajustar = function () {
    var f = E.flujo, r = svg.getBoundingClientRect(); if (!f || !f.nodos.length || r.width < 10) return;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; f.nodos.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + W); y1 = Math.max(y1, n.y + alto(n)); });
    var k = Math.max(0.3, Math.min(1.1, Math.min((r.width - 32) / (x1 - x0), (r.height - 32) / (y1 - y0)))); E.vista.k = k; E.vista.x = (r.width - (x1 - x0) * k) / 2 - x0 * k; E.vista.y = (r.height - (y1 - y0) * k) / 2 - y0 * k; aplicarVista();
  };

  /* ---------- punteros: arrastrar, conectar, paneo, pellizco ---------- */
  function iniciarPunteros() {
    svg.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { var p = Array.from(ptrs.values()); pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), k: E.vista.k }; estado = null; capaT.textContent = ''; return; }
      var pt = e.target.closest('[data-puerto]'), no = e.target.closest('[data-nodo]'), ar = e.target.closest('[data-arista]');
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      ui.lienzo.focus({ preventScroll: true });
      if (pt) estado = { t: 'puerto', de: pt.getAttribute('data-de'), sal: pt.getAttribute('data-puerto'), x0: e.clientX, y0: e.clientY, movio: false };
      else if (no) { var n = nodo(no.getAttribute('data-nodo')), m = mundo(e.clientX, e.clientY); estado = { t: 'nodo', id: n.id, dx: m[0] - n.x, dy: m[1] - n.y, x0: e.clientX, y0: e.clientY, movio: false }; }
      else if (ar) { E.selA = +ar.getAttribute('data-arista'); E.sel = null; E.tap = null; E.dibujar(); E.pintarInsp(); estado = null; }
      else estado = { t: 'pan', x0: e.clientX, y0: e.clientY, vx: E.vista.x, vy: E.vista.y, movio: false };
      e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) { var p = Array.from(ptrs.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); zoom(Math.max(0.3, Math.min(2.5, pinch.k * d / pinch.d)) / E.vista.k, (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2); return; }
      if (!estado) return; var mv = Math.hypot(e.clientX - estado.x0, e.clientY - estado.y0) > 6; if (mv) estado.movio = true; if (!estado.movio) return;
      if (estado.t === 'pan') { E.vista.x = estado.vx + e.clientX - estado.x0; E.vista.y = estado.vy + e.clientY - estado.y0; aplicarVista(); }
      else if (estado.t === 'nodo') { var m = mundo(e.clientX, e.clientY), n = nodo(estado.id); n.x = Math.round(m[0] - estado.dx); n.y = Math.round(m[1] - estado.dy); moverNodoDom(n); }
      else if (estado.t === 'puerto') {
        var o = nodo(estado.de), i = Math.max(0, def(o).salidas.map(function (s) { return s[0]; }).indexOf(estado.sal)), mm = mundo(e.clientX, e.clientY);
        capaT.textContent = ''; capaT.appendChild(S('path', { d: trayecto(o.x + W, o.y + py(o, i), mm[0], mm[1]), 'class': 'au-linea au-temp' }));
        var sobre = document.elementFromPoint(e.clientX, e.clientY), no = sobre && sobre.closest && sobre.closest('[data-nodo]'); capaN.querySelectorAll('.dest').forEach(function (x) { x.classList.remove('dest'); }); if (no && no.getAttribute('data-nodo') !== estado.de) no.classList.add('dest');
      }
    });
    function soltar(e) {
      ptrs.delete(e.pointerId); if (pinch) { if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) estado = null; return; }
      var s = estado; estado = null; capaT.textContent = ''; capaN.querySelectorAll('.dest').forEach(function (x) { x.classList.remove('dest'); }); if (!s) return;
      if (s.t === 'puerto') {
        if (s.movio) { var sobre = document.elementFromPoint(e.clientX, e.clientY), no = sobre && sobre.closest && sobre.closest('[data-nodo]'); if (no && E.conectar(s.de, s.sal, no.getAttribute('data-nodo'))) { E.tap = null; E.dibujar(); E.pintarInsp(); } }
        else { E.tap = E.tap && E.tap.nodo === s.de && E.tap.sal === s.sal ? null : { nodo: s.de, sal: s.sal }; E.dibujar(); if (E.tap) A.aviso('Toca el nodo de destino para conectar.'); }
      } else if (s.t === 'nodo') {
        if (s.movio) { E.commit(); } else if (E.tap) { var tp = E.tap; E.tap = null; if (E.conectar(tp.nodo, tp.sal, s.id)) { E.dibujar(); E.pintarInsp(); } else E.dibujar(); }
        else E.seleccionar(s.id);
      } else if (s.t === 'pan' && !s.movio) { E.sin(); cerrarHojas(); }
    }
    svg.addEventListener('pointerup', soltar); svg.addEventListener('pointercancel', function (e) { ptrs.delete(e.pointerId); estado = null; pinch = null; capaT.textContent = ''; });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); zoom(Math.pow(1.0015, -e.deltaY), e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener('dblclick', function (e) { if (!e.target.closest('[data-nodo]')) E.ajustar(); });
    ui.lienzo.addEventListener('keydown', function (e) {
      var t = e.target; if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? E.rehacer() : E.deshacer(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); E.rehacer(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); if (E.sel) E.eliminar(E.sel); else if (E.selA >= 0) E.desconectar(E.selA); }
      else if (e.key === 'Escape') { E.sin(); cerrarHojas(); }
      else if (E.sel && /^Arrow/.test(e.key)) { e.preventDefault(); var n = nodo(E.sel), p = e.shiftKey ? 40 : 10; n.x += e.key === 'ArrowRight' ? p : e.key === 'ArrowLeft' ? -p : 0; n.y += e.key === 'ArrowDown' ? p : e.key === 'ArrowUp' ? -p : 0; moverNodoDom(n); commitDiferido(); }
      else if (e.key === '+' || e.key === '=') zoom(1.2); else if (e.key === '-') zoom(1 / 1.2); else if (e.key === '0') E.ajustar();
      else if (E.sel && e.key === 'Enter') abrirInsp(true);
    });
  }

  /* ---------- inspector ---------- */
  function visible(c, cfg) { if (!c.si) return true; var v = cfg[c.si[0]]; return Array.isArray(c.si[1]) ? c.si[1].indexOf(v) >= 0 : v === c.si[1]; }
  function campoUI(c, n) {
    var cfg = n.cfg, id = 'au-c-' + c.id, v = cfg[c.id], el, caja = h('div', { 'data-campo': c.id });
    function poner(val, refrescar) { cfg[c.id] = val; commitDiferido(); var el2 = capaN.querySelector('[data-nodo="' + n.id + '"]'); if (el2) { var r = el2.querySelector('.au-res'); if (r) r.textContent = corto(resumen(n), 28); } if (refrescar) { E.commit(); E.pintarInsp(c.id); } if (E.modo === 'lista') E.pintarLista(true); }
    if (c.tipo === 'reglas') {
      var lista = Array.isArray(v) ? v : [], cont = h('div', { cls: 'au-reglas' });
      var pintar = function () {
        cont.textContent = ''; lista.forEach(function (r, i) {
          var fila = h('div', { cls: 'au-regla' }), iz = h('input', { type: 'text', value: r.izq || '', 'aria-label': 'Valor izquierdo', placeholder: '{{valor}}' }), op = h('select', { 'aria-label': 'Operador' }, CAT.OPS.map(function (o) { return h('option', { value: o[0], txt: o[1], selected: o[0] === r.op }); })), dr = h('input', { type: 'text', value: r.der || '', 'aria-label': 'Valor derecho', placeholder: 'valor' });
          iz.addEventListener('input', function () { r.izq = iz.value; poner(lista); }); dr.addEventListener('input', function () { r.der = dr.value; poner(lista); }); op.addEventListener('change', function () { r.op = op.value; dr.hidden = /vacio|novacio/.test(r.op); poner(lista); }); dr.hidden = /vacio|novacio/.test(r.op || '');
          fila.appendChild(iz); fila.appendChild(op); fila.appendChild(dr); fila.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', 'aria-label': 'Quitar regla', txt: '✕', on: { click: function () { lista.splice(i, 1); poner(lista); pintar(); } } })); cont.appendChild(fila);
        });
        cont.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: '+ Regla', on: { click: function () { lista.push({ izq: '', op: 'eq', der: '' }); poner(lista); pintar(); } } }));
      };
      cfg[c.id] = lista; pintar(); caja.appendChild(h('span', { cls: 'tr-etq', txt: c.etq })); caja.appendChild(cont); return caja;
    }
    if (c.tipo === 'chk') { el = h('input', { type: 'checkbox', id: id }); el.checked = !!v; el.addEventListener('change', function () { poner(el.checked, false); E.commit(); }); caja.appendChild(h('label', { cls: 'tr-chk', for: id }, [el, c.etq])); }
    else {
      if (c.tipo === 'sel') { el = h('select', { id: id }, c.op.map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); el.value = v === undefined ? c.def : v; el.addEventListener('change', function () { poner(el.value, true); }); }
      else if (c.tipo === 'area' || c.tipo === 'codigo') { el = h('textarea', { id: id, rows: c.tipo === 'codigo' ? 6 : 3, cls: c.tipo === 'codigo' ? 'au-codigo' : null, spellcheck: 'false', placeholder: c.ph || null }); el.value = v == null ? '' : v; el.addEventListener('input', function () { poner(el.value); }); }
      else if (c.tipo === 'num') { el = h('input', { type: 'number', id: id, min: c.min != null ? c.min : null, inputmode: 'decimal' }); el.value = v == null ? '' : v; el.addEventListener('input', function () { poner(el.value === '' ? '' : Number(el.value)); }); }
      else if (c.tipo === 'hora') { el = h('input', { type: 'time', id: id }); el.value = v || '09:00'; el.addEventListener('input', function () { poner(el.value); }); }
      else { el = h('input', { type: 'text', id: id, placeholder: c.ph || null, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }); el.value = v == null ? '' : v; el.addEventListener('input', function () { poner(el.value); }); }
      caja.appendChild(h('label', { for: id, txt: c.etq })); caja.appendChild(el);
    }
    if (c.ayuda) caja.appendChild(h('p', { cls: 'tr-ayuda', txt: c.ayuda }));
    return caja;
  }
  E.pintarInsp = function (enfocar) {
    var cont = ui.insp, n = E.sel && nodo(E.sel); cont.textContent = '';
    cont.appendChild(h('div', { cls: 'au-hoja-cab' }, [h('h2', { txt: n ? 'Nodo' : E.selA >= 0 ? 'Conexión' : 'Propiedades' }), h('button', { type: 'button', cls: 'tr-btn tr-chico au-solo-movil', txt: 'Cerrar', on: { click: function () { abrirInsp(false); } } })]));
    if (!n) {
      if (E.selA >= 0 && E.flujo.aristas[E.selA]) { var a = E.flujo.aristas[E.selA]; cont.appendChild(h('p', { txt: 'De «' + (nodo(a.de) ? (nodo(a.de).titulo || def(nodo(a.de)).nombre) : '?') + '» (' + a.sal + ') a «' + (nodo(a.a) ? (nodo(a.a).titulo || def(nodo(a.a)).nombre) : '?') + '».' })); cont.appendChild(A.boton('Eliminar conexión', function () { E.desconectar(E.selA); E.pintarInsp(); }, 'tr-peli')); return; }
      cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Toca un nodo para editarlo. Arrastra desde el círculo de salida (derecha) hasta otro nodo para conectar; en pantalla táctil, toca el círculo y luego el nodo de destino. Rueda o pellizco = zoom; arrastra el fondo para mover la vista.' }));
      cont.appendChild(h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Plantillas de texto {{…}}' }), h('p', { cls: 'tr-ayuda', txt: '{{variable}} · {{entrada.campo}} (datos del disparador) · {{ultimo.valor}} (salida del nodo anterior) · {{item}} (en bucles y filtros) · {{almacen.clave}} · {{secreto.NOMBRE}} · {{ahora.hora}} {{ahora.fecha}}. Filtros: |mayus |minus |redondear:2 |recortar:40 |def:x |fecha |unir:, |longitud |json |url' })]));
      return;
    }
    var d = def(n), col = CAT.categorias[d.categoria];
    cont.appendChild(h('p', { cls: 'au-insp-tipo' }, [h('span', { cls: 'au-chip', style: 'background:' + col.color, txt: d.icono + ' ' + d.nombre }), ' ', h('span', { cls: 'tr-ayuda', txt: n.id })]));
    cont.appendChild(h('p', { cls: 'tr-ayuda', txt: d.desc }));
    var tit = h('input', { type: 'text', id: 'au-c-titulo', maxlength: '40', placeholder: d.nombre, value: n.titulo || '', autocomplete: 'off' }); tit.addEventListener('input', function () { n.titulo = tit.value.trim() || undefined; commitDiferido(); var t2 = capaN.querySelector('[data-nodo="' + n.id + '"] .au-tit'); if (t2) t2.textContent = corto(n.titulo || d.nombre, 22); });
    cont.appendChild(h('label', { for: 'au-c-titulo', txt: 'Nombre del nodo' })); cont.appendChild(tit);
    d.campos.forEach(function (c) { if (visible(c, n.cfg)) cont.appendChild(campoUI(c, n)); });
    var salida = V.ultimo[E.flujo.id] && V.ultimo[E.flujo.id].salidas[n.id];
    if (salida !== undefined) cont.appendChild(h('details', { cls: 'qr-det', open: true }, [h('summary', { txt: 'Última salida' }), h('pre', { cls: 'au-pre', txt: A.json(salida) })]));
    var ac = h('div', { cls: 'tr-acciones' });
    if (d.categoria === 'disparador') ac.appendChild(A.boton('Probar desde aquí', function () { E.ejecutar({ inicio: n.id }); }, 'tr-pri'));
    ac.appendChild(A.boton('Duplicar', function () { E.duplicar(n.id); })); ac.appendChild(A.boton('Eliminar', function () { E.eliminar(n.id); }, 'tr-peli')); cont.appendChild(ac);
    if (enfocar) { var f = cont.querySelector('#au-c-' + enfocar); if (f) f.focus(); }
  };
  var hojaInsp = false;
  function abrirInsp(v) { hojaInsp = v; ui.insp.classList.toggle('abierta', v); if (v) ui.paleta.classList.remove('abierta'); }
  function abrirPaleta(v) { ui.paleta.classList.toggle('abierta', v); if (v) { ui.insp.classList.remove('abierta'); var b = ui.paleta.querySelector('input'); if (b && matchMedia('(min-width:1000px)').matches) b.focus(); } }
  function cerrarHojas() { ui.insp.classList.remove('abierta'); ui.paleta.classList.remove('abierta'); }

  /* ---------- paleta ---------- */
  function paleta() {
    var cont = ui.paleta, q = h('input', { type: 'search', placeholder: 'Buscar nodo…', 'aria-label': 'Buscar nodo', autocomplete: 'off' }), lista = h('div', { cls: 'au-pal-lista' });
    function pintar() {
      var t = q.value.trim().toLowerCase(); lista.textContent = '';
      Object.keys(CAT.categorias).forEach(function (cat) {
        var items = Object.keys(CAT.TIPOS).filter(function (k) { var d = CAT.TIPOS[k]; return d.categoria === cat && (!t || (d.nombre + ' ' + d.desc).toLowerCase().indexOf(t) >= 0); });
        if (!items.length) return; lista.appendChild(h('h3', { txt: CAT.categorias[cat].nombre, style: 'color:' + CAT.categorias[cat].color }));
        items.forEach(function (k) { var d = CAT.TIPOS[k]; lista.appendChild(h('button', { type: 'button', cls: 'au-pal-item', title: d.desc, 'data-tipo': k, on: { click: function () { E.agregar(k); if (matchMedia('(max-width:999px)').matches) abrirPaleta(false); } } }, [h('span', { cls: 'au-pal-ico', style: 'background:' + CAT.categorias[cat].color, txt: d.icono, 'aria-hidden': 'true' }), h('span', {}, [h('b', { txt: d.nombre }), h('small', { txt: d.desc })])])); });
      });
    }
    q.addEventListener('input', pintar); cont.appendChild(h('div', { cls: 'au-hoja-cab' }, [h('h2', { txt: 'Añadir nodo' }), h('button', { type: 'button', cls: 'tr-btn tr-chico au-solo-movil', txt: 'Cerrar', on: { click: function () { abrirPaleta(false); } } })])); cont.appendChild(q); cont.appendChild(lista); pintar();
  }

  /* ---------- modo lista (alternativa tactil sin arrastrar) ---------- */
  E.pintarLista = function () {
    var cont = ui.lista, f = E.flujo, orden = [], visto = {};
    function visitar(id) { if (visto[id]) return; visto[id] = 1; orden.push(id); f.aristas.filter(function (a) { return a.de === id; }).forEach(function (a) { visitar(a.a); }); }
    f.nodos.filter(function (n) { return def(n).categoria === 'disparador'; }).forEach(function (n) { visitar(n.id); }); f.nodos.forEach(function (n) { visitar(n.id); });
    cont.textContent = ''; var ol = h('ol', { cls: 'au-lista-ol' });
    orden.forEach(function (id, idx) {
      var n = nodo(id), d = def(n), col = CAT.categorias[d.categoria].color, li = h('li', { cls: 'au-card' + (E.sel === id ? ' sel' : ''), style: '--c:' + col, 'data-lista-nodo': id });
      li.appendChild(h('div', { cls: 'au-card-cab' }, [h('span', { cls: 'au-pal-ico', style: 'background:' + col, txt: d.icono, 'aria-hidden': 'true' }), h('div', { cls: 'au-card-tit' }, [h('b', { txt: (idx + 1) + '. ' + (n.titulo || d.nombre) }), h('small', { txt: resumen(n) })]),
        h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Editar', 'aria-label': 'Editar ' + (n.titulo || d.nombre), on: { click: function () { E.seleccionar(id); } } })]));
      d.salidas.forEach(function (s) {
        var dest = f.aristas.map(function (a, i) { return [a, i]; }).filter(function (p) { return p[0].de === id && p[0].sal === s[0]; }), fila = h('div', { cls: 'au-card-sal' });
        fila.appendChild(h('span', { cls: 'au-card-et' + (s[0] === 'error' ? ' err' : ''), txt: s[1] ? 'Si «' + s[1] + '» →' : 'Luego →' }));
        dest.forEach(function (p) { var t = nodo(p[0].a); fila.appendChild(h('button', { type: 'button', cls: 'au-chip-dest', title: 'Quitar conexión', 'aria-label': 'Quitar conexión a ' + (t ? (t.titulo || def(t).nombre) : '?'), on: { click: function () { E.desconectar(p[1]); } } }, [(t ? (t.titulo || def(t).nombre) : '?') + ' ✕'])); });
        var sel = h('select', { 'aria-label': 'Conectar ' + (s[1] || 'salida') + ' de ' + (n.titulo || d.nombre) + ' a…' }, [h('option', { value: '', txt: '+ Conectar a…' })].concat(f.nodos.filter(function (t) { return t.id !== id && def(t).categoria !== 'disparador'; }).map(function (t) { return h('option', { value: t.id, txt: (t.titulo || def(t).nombre) + ' (' + t.id + ')' }); })));
        sel.addEventListener('change', function () { if (sel.value && E.conectar(id, s[0], sel.value)) E.dibujar(); }); fila.appendChild(sel); li.appendChild(fila);
      });
      ol.appendChild(li);
    });
    cont.appendChild(ol);
  };
  function modo(m) { E.modo = m; ui.lienzo.hidden = m !== 'lienzo'; ui.lista.hidden = m !== 'lista'; ui.btnModo.textContent = m === 'lienzo' ? 'Ver lista' : 'Ver lienzo'; ui.btnModo.setAttribute('aria-pressed', m === 'lista'); ui.zoomGrupo.hidden = m !== 'lienzo'; var a = D.ajustes(); a.vista = m; D.guardarAjustes(a); if (m === 'lista') E.pintarLista(); else { E.dibujar(); } }

  /* ---------- ejecucion desde el editor ---------- */
  E.ejecutar = async function (o) {
    o = Object.assign({}, o); await E.guardarYa(); var f = E.flujo, ini = o.inicio;
    var trig = f.nodos.filter(function (n) { return def(n).categoria === 'disparador'; });
    if (!ini) { var s = E.sel && nodo(E.sel); ini = (s && def(s).categoria === 'disparador' ? s : trig.filter(function (n) { return n.tipo === 'manual'; })[0] || trig[0] || {}).id; }
    var n = nodo(ini), datos = {}; if (!n) { A.aviso('Añade un disparador al flujo.', 'error'); return; }
    var raw = n.tipo === 'manual' ? n.cfg.datos : n.cfg.prueba; try { datos = raw && String(raw).trim() ? JSON.parse(raw) : {}; } catch (e) { A.aviso('Los datos de prueba no son JSON válido.', 'error'); return; }
    E.mostrarEstado = false; E.dibujar(); ui.estado.hidden = true;
    var reg = await V.ejecutar(f, { inicio: ini, datos: datos, tipo: n.tipo === 'manual' ? 'manual' : n.tipo + ' (prueba)', simulacion: !!o.simulacion, pasoAPaso: ui.paso.checked, interactivo: true });
    return reg;
  };
  function iniciarEjecucion() {
    A.on('inicio', function (d) { if (!E.flujo || d.flujoId !== E.flujo.id) return; E.mostrarEstado = false; capaN.querySelectorAll('.au-nodo').forEach(function (x) { x.classList.remove('r-ok', 'r-error', 'r-simulado', 'r-omitido', 'activo'); }); ui.btnParar.hidden = false; ui.estado.hidden = true; });
    A.on('activo', function (d) { if (!E.flujo || d.flujoId !== E.flujo.id) return; capaN.querySelectorAll('.activo').forEach(function (x) { x.classList.remove('activo'); }); var el = capaN.querySelector('[data-nodo="' + d.nodo + '"]'); if (el) el.classList.add('activo'); });
    A.on('paso', function (d) { if (!E.flujo || d.flujoId !== E.flujo.id) return; var el = capaN.querySelector('[data-nodo="' + d.paso.nodo + '"]'); if (el) { el.classList.remove('activo'); el.classList.add('r-' + d.paso.estado); } });
    A.on('depurar', function (d) {
      if (!E.flujo || d.flujoId !== E.flujo.id) return; var p = ui.depur; p.hidden = false; p.textContent = '';
      var el = capaN.querySelector('[data-nodo="' + d.paso.nodo + '"]'); if (el) { el.classList.add('activo'); }
      p.appendChild(h('div', { cls: 'au-depur-cab' }, [h('b', { txt: 'Paso ' + d.paso.n + ': ' + d.paso.titulo }), h('span', { cls: 'tr-etiq', txt: d.paso.tipo })]));
      p.appendChild(h('div', { cls: 'au-depur-cols' }, [h('div', {}, [h('b', { txt: 'Parámetros (ya con plantillas)' }), h('pre', { cls: 'au-pre', txt: A.json(d.paso.entrada) })]), h('div', {}, [h('b', { txt: 'Variables' }), h('pre', { cls: 'au-pre', txt: A.json(M().resumir(d.ctx.vars)) }), h('b', { txt: 'Salida anterior' }), h('pre', { cls: 'au-pre', txt: A.json(M().resumir(d.ctx.ultimo)) })])]));
      var fin = function () { p.hidden = true; };
      p.appendChild(h('div', { cls: 'tr-acciones' }, [A.boton('Siguiente paso', function () { fin(); d.siguiente(); }, 'tr-pri', { id: 'au-sig' }), A.boton('Continuar', function () { fin(); d.continuar(); }), A.boton('Detener', function () { fin(); V.detener(E.flujo.id); d.siguiente(); }, 'tr-peli')]));
      var b = p.querySelector('#au-sig'); if (b) b.focus();
    });
    A.on('depurar-fin', function () { ui.depur.hidden = true; });
    A.on('ejecucion', function (reg) {
      if (!E.flujo || reg.flujo !== E.flujo.id) return; ui.btnParar.hidden = true; ui.depur.hidden = true; E.mostrarEstado = true; pintarEstadoNodos();
      var st = ui.estado; st.hidden = false; st.className = 'tr-nota ' + (reg.estado === 'ok' ? 'tr-ok' : reg.estado === 'error' ? 'tr-mal' : 'tr-av'); st.textContent = '';
      st.appendChild(h('span', { txt: (reg.simulacion ? 'Simulación' : 'Ejecución') + ' ' + (reg.estado === 'ok' ? 'correcta' : reg.estado) + ' · ' + (reg.cantidadPasos || reg.pasos.length) + ' pasos · ' + ((reg.fin || 0) - reg.ini) + ' ms' + (reg.error ? ' · ' + reg.error : '') + ' ' }));
      st.appendChild(A.boton('Ver registro', function () { A.emitir('abrir-registro', reg.id); A.ir('registro'); }, 'tr-chico')); if (E.sel) E.pintarInsp();
    });
  }
  function M() { return g.AutoMotor; }

  /* ---------- construccion ---------- */
  E.construir = function (raiz) {
    var h2 = h;
    ui.nombre = h2('input', { type: 'text', id: 'au-nombre', maxlength: '60', 'aria-label': 'Nombre del flujo', autocomplete: 'off' });
    ui.activo = h2('input', { type: 'checkbox', id: 'au-activo' });
    ui.paso = h2('input', { type: 'checkbox', id: 'au-paso' });
    ui.fondo = h2('input', { type: 'checkbox', id: 'au-fondo' });
    ui.deshacer = A.boton('↶', E.deshacer, 'tr-chico', { id: 'au-undo', 'aria-label': 'Deshacer', title: 'Deshacer (Ctrl+Z)' }); ui.rehacer = A.boton('↷', E.rehacer, 'tr-chico', { id: 'au-redo', 'aria-label': 'Rehacer', title: 'Rehacer (Ctrl+Y)' });
    ui.zoom = h2('span', { cls: 'au-zoom-n', 'aria-live': 'polite', txt: '100%' });
    ui.zoomGrupo = h2('span', { cls: 'au-grupo' }, [A.boton('−', function () { zoom(1 / 1.2); }, 'tr-chico', { 'aria-label': 'Alejar' }), ui.zoom, A.boton('+', function () { zoom(1.2); }, 'tr-chico', { 'aria-label': 'Acercar' }), A.boton('Ajustar', E.ajustar, 'tr-chico')]);
    ui.btnModo = A.boton('Ver lista', function () { modo(E.modo === 'lienzo' ? 'lista' : 'lienzo'); }, 'tr-chico', { id: 'au-modo', 'aria-pressed': 'false' });
    ui.btnParar = A.boton('■ Parar', function () { V.detener(E.flujo.id); }, 'tr-chico tr-peli', { hidden: true });
    ui.mas = h2('details', { cls: 'au-mas' }, [h2('summary', { txt: 'Más opciones' }), h2('div', { cls: 'au-mas-c' }, [h2('label', { cls: 'au-sw', for: 'au-paso' }, [ui.paso, 'Paso a paso']), h2('label', { cls: 'au-sw', for: 'au-fondo', title: 'Además intenta correr en segundo plano con el Service Worker si el navegador lo permite (Fondo y nube)' }, [ui.fondo, 'Segundo plano']), A.boton('Exportar', function () { A.emitir('exportar', E.flujo); }, 'tr-chico'), A.boton('Nube (YAML)', function () { A.emitir('nube', E.flujo); A.ir('fondo'); }, 'tr-chico')])]);
    var mq = matchMedia('(min-width:1000px)'), abrirMas = function () { ui.mas.open = mq.matches; ui.mas.classList.toggle('fija', mq.matches); }; abrirMas(); if (mq.addEventListener) mq.addEventListener('change', abrirMas);
    var barra = h2('div', { cls: 'au-barra' }, [
      h2('div', { cls: 'au-barra-n' }, [h2('label', { for: 'au-nombre', cls: 'tr-solo-lector', txt: 'Nombre del flujo' }), ui.nombre, h2('label', { cls: 'au-sw', for: 'au-activo', title: 'Con el flujo activo, sus disparadores funcionan mientras esta pestaña esté abierta' }, [ui.activo, 'Activo'])]),
      h2('div', { cls: 'au-barra-b' }, [A.boton('▶ Ejecutar', function () { E.ejecutar({}); }, 'tr-pri tr-chico', { id: 'au-ejecutar' }), A.boton('Simular', function () { E.ejecutar({ simulacion: true }); }, 'tr-chico', { id: 'au-simular', title: 'No ejecuta acciones externas: solo muestra qué haría' }), ui.btnParar, ui.deshacer, ui.rehacer, ui.btnModo, ui.zoomGrupo,
        A.boton('+ Nodo', function () { abrirPaleta(!ui.paleta.classList.contains('abierta')); }, 'tr-chico au-solo-movil', { id: 'au-add' })]), ui.mas]);
    ui.paleta = h2('aside', { cls: 'au-paleta', 'aria-label': 'Paleta de nodos' }); ui.insp = h2('aside', { cls: 'au-insp', 'aria-label': 'Propiedades del nodo' });
    svg = S('svg', { 'class': 'au-svg', role: 'application', 'aria-label': 'Lienzo del flujo' });
    var defs = S('defs', {}, [S('marker', { id: 'au-flecha', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [S('path', { d: 'M0 0L10 5L0 10z', 'class': 'au-punta' })])]);
    capaA = S('g'); capaN = S('g'); capaT = S('g'); gv = S('g', {}, [capaA, capaN, capaT]); svg.appendChild(defs); svg.appendChild(gv);
    ui.vacio = h2('div', { cls: 'au-vacio', hidden: true }, [h2('p', { txt: 'Añade nodos con «+ Nodo» o la paleta. Empieza por un disparador y conecta las salidas.' })]);
    ui.lienzo = h2('div', { cls: 'au-lienzo', tabindex: '0', 'aria-label': 'Lienzo (flechas: mover nodo, Supr: borrar, Ctrl+Z: deshacer)' }, [svg, ui.vacio]);
    ui.lista = h2('div', { cls: 'au-lista', hidden: true, 'aria-label': 'Flujo en modo lista' });
    ui.estado = h2('div', { cls: 'tr-nota', hidden: true, role: 'status', id: 'au-estado' }); ui.depur = h2('div', { cls: 'au-depur', hidden: true, role: 'region', 'aria-label': 'Depuración paso a paso' });
    ui.vacioFlujo = h2('div', { cls: 'tr-vacio', txt: 'Abre o crea un flujo en la pestaña «Flujos».' });
    ui.cuerpo = h2('div', { cls: 'au-cuerpo' }, [ui.paleta, h2('div', { cls: 'au-centro' }, [ui.lienzo, ui.lista]), ui.insp]);
    ui.zona = h2('div', { cls: 'au-zona', hidden: true }, [barra, ui.estado, ui.cuerpo, ui.depur]);
    raiz.appendChild(ui.vacioFlujo); raiz.appendChild(ui.zona);
    paleta(); iniciarPunteros(); iniciarEjecucion();
    ui.nombre.addEventListener('input', function () { E.flujo.nombre = ui.nombre.value.trim() || 'Flujo sin nombre'; commitDiferido(); });
    ui.activo.addEventListener('change', async function () { E.flujo.activo = ui.activo.checked; await E.guardarYa(); A.aviso(E.flujo.activo ? 'Flujo activado: sus disparadores corren mientras esta pestaña esté abierta.' : 'Flujo desactivado.'); });
    ui.fondo.addEventListener('change', async function () { E.flujo.fondo = ui.fondo.checked; await E.guardarYa(); if (E.flujo.fondo && !D.ajustes().fondo) A.aviso('Actívalo también en «Fondo y nube» para registrar el Service Worker.'); });
    modo(D.ajustes().vista === 'lista' ? 'lista' : 'lienzo');
  };
  E.abrir = function (f) {
    E.flujo = f; E.sel = null; E.selA = -1; E.tap = null; E.hist = [foto()]; E.hi = 0; botonesHist(); E.mostrarEstado = false;
    ui.zona.hidden = false; ui.vacioFlujo.hidden = true; ui.nombre.value = f.nombre; ui.activo.checked = !!f.activo; ui.fondo.checked = !!f.fondo; ui.estado.hidden = true; ui.depur.hidden = true; cerrarHojas();
    E.dibujar(); E.pintarInsp(); E.ajustar(); A.est.flujo = f.id;
  };
  E.alMostrar = function () { if (E.flujo) { E.dibujar(); E.ajustar(); } };
})(window);
