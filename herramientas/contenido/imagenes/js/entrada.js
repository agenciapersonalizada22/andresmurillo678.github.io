/* Entrada de puntero/tactil/lapiz: herramientas, transformaciones, guias inteligentes, gestos. */
(function (IM) {
  var E = IM.E, V = IM.Vista, Doc = IM.Doc, Pix = Doc.Pix, R = IM.Render, M = window.Matriz, Geo = window.Geometria;
  var N = IM.Entrada = { espacio: false };
  var ptrs = {}, acc = null, pinch = null, ultimo = { t: 0, x: 0, y: 0, id: null }, areaEl, ov, areaTexto = null;

  N.init = function (area) {
    areaEl = area; ov = area.querySelector('#ov');
    ov.addEventListener('pointerdown', onDown); ov.addEventListener('pointermove', onMove); ov.addEventListener('pointerup', onUp); ov.addEventListener('pointercancel', onUp);
    ov.addEventListener('pointerleave', function () { if (V.cursor) { V.cursor.ver = false; V.pedirOv(); } });
    ov.addEventListener('wheel', onWheel, { passive: false }); ov.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    area.addEventListener('dragover', function (e) { e.preventDefault(); area.classList.add('soltar'); });
    area.addEventListener('dragleave', function () { area.classList.remove('soltar'); });
    area.addEventListener('drop', function (e) { e.preventDefault(); area.classList.remove('soltar'); if (e.dataTransfer && e.dataTransfer.files.length) E.importarVarios(e.dataTransfer.files); });
    E.on('herr', function () { if (acc) cancelar(); ov.style.cursor = cursorPara(E.herr); if (E.herr === 'recorte') iniciarRecorte(); else V.recorte = null; if (E.herr === 'persp') iniciarPersp(); else V.perspectiva = null; if (E.herr !== 'varita' && E.seleccionPx) { /* se mantiene */ } V.pedirOv(); });
  };
  function cursorPara(h) { return { seleccionar: 'default', mano: 'grab', texto: 'text', forma: 'crosshair', pincel: 'none', borrador: 'none', lapiz: 'none', cuentagotas: 'crosshair', relleno: 'crosshair', recorte: 'crosshair', varita: 'crosshair', persp: 'default' }[h] || 'default'; }
  function evDe(e) {
    var pr = e.pointerType === 'pen' ? (e.pressure || 0.5) : 1;
    return { cx: e.clientX, cy: e.clientY, pr: pr, tipo: e.pointerType, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey, id: e.pointerId, e: e };
  }
  function onDown(e) {
    V.tactil = e.pointerType === 'touch'; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { ov.setPointerCapture(e.pointerId); } catch (er) {}
    var n = Object.keys(ptrs).length;
    if (n === 2) { cancelar(true); iniciarPinch(); E.rapido = true; return; }
    if (n > 2) return;
    if (e.button === 1 || e.button === 2 || N.espacio || E.herr === 'mano') { acc = { tipo: 'pan', x: e.clientX, y: e.clientY }; ov.style.cursor = 'grabbing'; E.rapido = true; return; }
    N.abajo(evDe(e));
    E.rapido = !!(acc && /mover|escalar|rotar/.test(acc.tipo));
  }
  function onMove(e) {
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    if (pinch) { moverPinch(); return; }
    if (acc && acc.tipo === 'pan') { V.mover(e.clientX - acc.x, e.clientY - acc.y); acc.x = e.clientX; acc.y = e.clientY; return; }
    var lista = e.getCoalescedEvents && acc && acc.tipo === 'pintar' ? e.getCoalescedEvents() : [e];
    if (!lista.length) lista = [e];
    lista.forEach(function (q) { N.mover(evDe(q), !!acc); });
  }
  function onUp(e) {
    delete ptrs[e.pointerId];
    if (E.rapido) { E.rapido = false; E.dibujar(); }
    if (pinch) { if (Object.keys(ptrs).length < 2) { pinch = null; acc = null; } return; }
    if (acc && acc.tipo === 'pan') { acc = null; ov.style.cursor = cursorPara(E.herr); return; }
    N.arriba(evDe(e));
  }
  function onWheel(e) {
    e.preventDefault();
    var f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
    if (e.ctrlKey || e.deltaMode === 1 || (Math.abs(e.deltaY) >= 100 && !e.deltaX && Number.isInteger(e.deltaY))) V.zoom(f, e.clientX, e.clientY);
    else if (e.shiftKey) V.mover(-e.deltaY, 0); else V.mover(-e.deltaX, -e.deltaY);
  }
  function iniciarPinch() {
    var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]], r = V.area.getBoundingClientRect();
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: E.vista.k, cx0: (a.x + b.x) / 2 - r.left, cy0: (a.y + b.y) / 2 - r.top, x0: E.vista.x, y0: E.vista.y };
  }
  function moverPinch() {
    var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]]; if (!a || !b) return;
    var r = V.area.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
    var kk = IM.clamp(pinch.k0 * d / pinch.d0, 0.02, 32), dx = (pinch.cx0 - pinch.x0) / pinch.k0, dy = (pinch.cy0 - pinch.y0) / pinch.k0;
    E.vista.k = kk; E.vista.x = cx - dx * kk; E.vista.y = cy - dy * kk; E.emit('vista');
  }
  function cancelar(sinReg) {
    if (!acc) return;
    if (acc.tipo === 'pintar') { IM.Pincel.abortar(acc.s); E.dibujar(); }
    else if (acc.tipo === 'forma') { var r = Doc.buscar(E.pagina().capas, acc.capa.id); if (r) r.lista.splice(r.indice, 1); E.sel = []; E.emit('sel'); }
    else if (acc.restaurar) { acc.restaurar(); E.dibujar(); }
    acc = null; V.guiasTemp = null; V.marquee = null; V.pedirOv();
  }
  N.cancelar = function () { cancelar(); };

  /* ---------- API abstracta (tambien la usa el mando) ---------- */
  N.abajo = function (ev) {
    var t = ev.e && ev.e.timeStamp || performance.now(), p = V.aDoc(ev.cx, ev.cy);
    var dbl = t - ultimo.t < 380 && Math.hypot(ev.cx - ultimo.x, ev.cy - ultimo.y) < 8; ultimo = { t: t, x: ev.cx, y: ev.cy };
    switch (E.herr) {
      case 'seleccionar': return abajoSel(ev, p, dbl);
      case 'texto': return abajoTexto(ev, p);
      case 'forma': return abajoForma(ev, p);
      case 'pincel': case 'borrador': case 'lapiz': return abajoPincel(ev, p);
      case 'cuentagotas': acc = { tipo: 'gotero' }; return muestrear(ev);
      case 'relleno': return abajoRelleno(p);
      case 'varita': return abajoVarita(ev, p);
      case 'recorte': return abajoRecorte(ev, p);
      case 'persp': return abajoPersp(ev, p);
    }
  };
  N.mover = function (ev, presionado) {
    var p = V.aDoc(ev.cx, ev.cy), b = V.area.getBoundingClientRect();
    if (/pincel|borrador|lapiz/.test(E.herr)) { V.cursor = { x: ev.cx - b.left, y: ev.cy - b.top, ver: ev.tipo !== 'touch' }; V.pedirOv(); }
    if (!acc) { if (E.herr === 'seleccionar') hover(ev, p); return; }
    switch (acc.tipo) {
      case 'mover': return moverSel(ev, p); case 'escalar': return escalarSel(ev, p); case 'rotar': return rotarSel(ev, p);
      case 'forma': return moverForma(ev, p); case 'pintar': return moverPintar(ev, p); case 'gotero': return muestrear(ev);
      case 'marquee': acc.x1 = ev.cx - b.left; acc.y1 = ev.cy - b.top; V.marquee = { x0: acc.x0, y0: acc.y0, x1: acc.x1, y1: acc.y1 }; V.pedirOv(); return;
      case 'guia': acc.g.pos = Math.round(acc.g.eje === 'x' ? p.x : p.y); V.pedirOv(); return;
      case 'recorte': return moverRecorte(ev, p); case 'persp': acc.pt.x = p.x; acc.pt.y = p.y; V.pedirOv(); return;
      case 'pan-sel': V.mover(ev.cx - acc.x, ev.cy - acc.y); acc.x = ev.cx; acc.y = ev.cy; return;
    }
  };
  N.arriba = function (ev) {
    if (!acc) return; var a = acc; acc = null; V.guiasTemp = null;
    switch (a.tipo) {
      case 'mover': E.cambio('Mover', 'mover'); if (a.movio && E.sel.length) {} break;
      case 'escalar': E.cambio('Cambiar tamaño'); break;
      case 'rotar': E.cambio('Girar'); break;
      case 'forma': finForma(a); break;
      case 'pintar': finPintar(a); break;
      case 'marquee': finMarquee(a); break;
      case 'guia': {
        var p = E.pagina(), fuera = a.g.pos <= 0 || a.g.pos >= (a.g.eje === 'x' ? p.w : p.h); if (fuera) p.guias.splice(p.guias.indexOf(a.g), 1); E.cambio(fuera ? 'Quitar guía' : 'Mover guía'); break;
      }
      case 'recorte': E.emit('recorte'); break;
      case 'persp': E.emit('persp'); break;
    }
    V.marquee = null; V.pedirOv(); ov.style.cursor = cursorPara(E.herr);
  };

  /* ---------- seleccionar ---------- */
  function hover(ev, p) {
    var b = V.cajaSel(), cur = 'default';
    if (b && !(b.capa && b.capa.bloqueada)) {
      var r = V.area.getBoundingClientRect(), sx = ev.cx - r.left, sy = ev.cy - r.top;
      V.manijas(b, false).forEach(function (h) { if (Math.hypot(h.x - sx, h.y - sy) <= 9) cur = h.id === 'rot' ? 'grab' : ({ n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' })[h.id]; });
    }
    if (cur === 'default' && E.hit(p.x, p.y)) cur = 'move';
    ov.style.cursor = cur;
  }
  function abajoSel(ev, p, dbl) {
    var b = V.cajaSel(), r = V.area.getBoundingClientRect(), sx = ev.cx - r.left, sy = ev.cy - r.top, k = E.vista.k;
    if (b && !(b.capa && b.capa.bloqueada)) {
      var hs = V.manijas(b, ev.tipo === 'touch'), rad = ev.tipo === 'touch' ? 22 : 10;
      for (var i = hs.length - 1; i >= 0; i--) if (Math.hypot(hs[i].x - sx, hs[i].y - sy) <= rad) return b.multi || true ? iniciarTransf(hs[i], b, p, ev) : null;
    }
    var pg = E.pagina(), tol = (ev.tipo === 'touch' ? 10 : 5) / k;
    for (var j = 0; j < pg.guias.length; j++) { var g = pg.guias[j]; if (Math.abs((g.eje === 'x' ? p.x : p.y) - g.pos) < tol) { acc = { tipo: 'guia', g: g }; return; } }
    var c = E.hit(p.x, p.y);
    if (c) {
      if (dbl && c.tipo === 'texto') { N.editarTexto(c); return; }
      if (ev.shift) E.seleccionar([c.id], true); else if (E.sel.indexOf(c.id) < 0) E.seleccionar([c.id]);
      var items = E.capasSel().filter(function (q) { return !q.bloqueada && !Doc.buscar(pg.capas, q.id).padre; });
      if (!items.length) return;
      acc = { tipo: 'mover', p0: p, items: items.map(function (q) { return { c: q, x: q.x, y: q.y }; }), box0: Geo.unir(items.map(Doc.caja)), restaurar: function () { this.items.forEach(function (it) { it.c.x = it.x; it.c.y = it.y; }); } };
      acc.restaurar = acc.restaurar.bind(acc);
    } else {
      if (!ev.shift) E.seleccionar([]);
      if (ev.tipo === 'touch') acc = { tipo: 'pan-sel', x: ev.cx, y: ev.cy }; else { acc = { tipo: 'marquee', x0: sx, y0: sy, x1: sx, y1: sy, shift: ev.shift }; }
    }
  }
  function objetivosSnap(excluir) {
    var p = E.pagina(), x = [0, p.w / 2, p.w], y = [0, p.h / 2, p.h];
    p.guias.forEach(function (g) { (g.eje === 'x' ? x : y).push(g.pos); });
    p.capas.forEach(function (c) { if (!c.visible || excluir.indexOf(c) >= 0 || c.tipo === 'ajuste') return; var b = Doc.caja(c); x.push(b.x, b.cx, b.x1); y.push(b.y, b.cy, b.y1); });
    return { x: x, y: y };
  }
  function moverSel(ev, p) {
    var dx = p.x - acc.p0.x, dy = p.y - acc.p0.y, b0 = acc.box0, k = E.vista.k;
    if (ev.shift) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    var aj = E.proy.ajustes, g = { x: [], y: [] };
    if (!ev.alt && aj.ajuste !== false) {
      var s = Geo.ajustar({ x: b0.x + dx, y: b0.y + dy, w: b0.w, h: b0.h }, acc.obj || (acc.obj = objetivosSnap(acc.items.map(function (i) { return i.c; }))), 7 / k);
      dx += s.dx; dy += s.dy; g = { x: s.lineasX, y: s.lineasY };
      if (aj.cuadricula && !s.lineasX.length) dx = Geo.cuadricula(b0.x + dx, aj.paso) - b0.x;
      if (aj.cuadricula && !s.lineasY.length) dy = Geo.cuadricula(b0.y + dy, aj.paso) - b0.y;
    }
    V.guiasTemp = g.x.length || g.y.length ? g : null; acc.movio = true;
    acc.items.forEach(function (it) { it.c.x = it.x + dx; it.c.y = it.y + dy; });
    E.dibujar(); E.emit('mod');
  }
  function iniciarTransf(h, b, p, ev) {
    var items = b.capas.map(function (c) { return { c: c, x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot, tam: c.tam, aj: c.trazo ? c.trazo.ancho : 0 }; });
    var snap = function () { items.forEach(function (it) { Object.assign(it.c, { x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot }); if (it.tam) it.c.tam = it.tam; }); };
    var m0 = M.componer(b.x, b.y, b.rot, b.fx ? -1 : 1, b.fy ? -1 : 1);
    if (h.id === 'rot') acc = { tipo: 'rotar', b: b, items: items, a0: Math.atan2(p.y - b.y, p.x - b.x), restaurar: snap };
    else acc = { tipo: 'escalar', b: b, h: h, items: items, m0: m0, inv: M.inv(m0), restaurar: snap, rect: V.area.getBoundingClientRect() };
    if (h.id === 'rot') acc.rot0 = b.rot;
  }
  function escalarSel(ev, p) {
    var b = acc.b, h = acc.h, lp = M.punto(acc.inv, p.x, p.y), w0 = b.w, h0 = b.h, ax = -h.sx * w0 / 2, ay = -h.sy * h0 / 2, nw = w0, nh = h0;
    var min = 4;
    if (h.sx && h.sy) {
      var sx = Math.abs(lp.x - ax) / w0, sy = Math.abs(lp.y - ay) / h0, s = ev.alt ? null : Math.max(sx, sy);
      if (b.multi || !ev.alt) { nw = w0 * s; nh = h0 * s; } else { nw = Math.abs(lp.x - ax); nh = Math.abs(lp.y - ay); }
    } else if (h.sx) nw = Math.abs(lp.x - ax); else nh = Math.abs(lp.y - ay);
    nw = Math.max(min, nw); nh = Math.max(min, nh);
    if (ev.shift && !(h.sx && h.sy)) { /* sin efecto */ }
    var cxL = h.sx ? ax + h.sx * nw / 2 : 0, cyL = h.sy ? ay + h.sy * nh / 2 : 0, cw = M.punto(acc.m0, cxL, cyL);
    if (!b.multi) {
      var c = b.capa, it = acc.items[0];
      if (c.tipo === 'texto') {
        if (h.sx && h.sy) { var sc = nw / w0; c.tam = Math.max(4, it.tam * sc); c.w = nw; if (c.espaciado) c.espaciado = (c.espaciado / (it.w / w0 || 1)); }
        else if (h.sx) { c.w = nw; }
        R.ajustarTexto(c);
        var dyL = (c.h - h0) / 2 * (h.sy ? 0 : 1); if (!h.sy && !h.sx) { c.w = w0; }
        var topFix = M.punto(acc.m0, cxL, -h0 / 2 + c.h / 2); if (h.sx && !h.sy) { cw = M.punto(acc.m0, cxL, -h0 / 2 + c.h / 2); }
        if (h.sy) { c.h = nh; c.tam = it.tam; R.ajustarTexto(c); c.h = Math.max(c.h, nh); }
        c.x = cw.x; c.y = cw.y;
      } else { c.w = nw; c.h = nh; c.x = cw.x; c.y = cw.y; }
    } else {
      if (!(h.sx && h.sy)) return;
      var s2 = nw / w0, ox = b.x + (-h.sx * w0 / 2), oy = b.y + (-h.sy * h0 / 2);
      acc.items.forEach(function (it) { it.c.x = ox + (it.x - ox) * s2; it.c.y = oy + (it.y - oy) * s2; it.c.w = it.w * s2; it.c.h = it.h * s2; if (it.tam) { it.c.tam = it.tam * s2; } });
    }
    E.dibujar(); E.emit('mod');
  }
  function rotarSel(ev, p) {
    var b = acc.b, a = Math.atan2(p.y - b.y, p.x - b.x), da = (a - acc.a0) * 180 / Math.PI;
    if (!b.multi) {
      var r = acc.rot0 + da; if (ev.shift) r = Math.round(r / 15) * 15; else { var q = Math.round(r / 45) * 45; if (Math.abs(r - q) < 3) r = q; }
      b.capa.rot = ((r + 180) % 360 + 360) % 360 - 180;
    } else {
      if (ev.shift) da = Math.round(da / 15) * 15; var rad = da * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
      acc.items.forEach(function (it) { var dx = it.x - b.x, dy = it.y - b.y; it.c.x = b.x + dx * cs - dy * sn; it.c.y = b.y + dx * sn + dy * cs; it.c.rot = it.rot + da; });
    }
    E.dibujar(); E.emit('mod');
  }
  function finMarquee(a) {
    var x0 = Math.min(a.x0, a.x1), x1 = Math.max(a.x0, a.x1), y0 = Math.min(a.y0, a.y1), y1 = Math.max(a.y0, a.y1);
    if (x1 - x0 < 3 && y1 - y0 < 3) return;
    var v = E.vista, d0 = { x: (x0 - v.x) / v.k, y: (y0 - v.y) / v.k }, d1 = { x: (x1 - v.x) / v.k, y: (y1 - v.y) / v.k };
    var ids = E.pagina().capas.filter(function (c) { if (!c.visible || c.bloqueada || c.tipo === 'ajuste') return false; var b = Doc.caja(c); return b.x < d1.x && b.x1 > d0.x && b.y < d1.y && b.y1 > d0.y; }).map(function (c) { return c.id; });
    E.seleccionar(a.shift ? E.sel.concat(ids) : ids);
  }

  /* ---------- texto ---------- */
  function abajoTexto(ev, p) {
    var c = E.hit(p.x, p.y);
    if (c && c.tipo === 'texto') { E.seleccionar([c.id]); N.editarTexto(c); return; }
    var t = Doc.capa('texto', { texto: 'Tu texto', color: E.color, w: Math.min(600, E.pagina().w * 0.6), tam: Math.round(E.pagina().w / 14), nombre: 'Texto' });
    t.x = p.x; t.y = p.y; E.agregar(t, { centrar: false, nombre: 'Añadir texto' }); E.herr = 'seleccionar'; E.emit('herr'); N.editarTexto(t, true);
  }
  N.editarTexto = function (c, todo) {
    N.cerrarTexto();
    var ta = document.createElement('textarea'); ta.className = 'editor-texto'; ta.setAttribute('aria-label', 'Editar texto'); ta.value = c.texto; areaEl.appendChild(ta); areaTexto = { ta: ta, c: c };
    R.ocultarId = c.id; var t0;
    function pos() {
      var k = E.vista.k, s = V.aPantalla(c.x, c.y), st = ta.style;
      st.width = c.w * k + 'px'; st.height = c.h * k + 'px'; st.left = s.x - c.w * k / 2 + 'px'; st.top = s.y - c.h * k / 2 + 'px'; st.transform = 'rotate(' + c.rot + 'deg)';
      st.font = (c.cursiva ? 'italic ' : '') + c.peso + ' ' + c.tam * k + 'px ' + c.fuente; st.lineHeight = c.tam * c.interlineado * k + 'px'; st.letterSpacing = (c.espaciado || 0) * k + 'px'; st.textAlign = c.alin; st.color = c.color; st.textTransform = c.mayus ? 'uppercase' : 'none';
    }
    areaTexto.pos = pos; pos();
    ta.addEventListener('input', function () { c.texto = ta.value; R.ajustarTexto(c); pos(); E.dibujar(); E.emit('mod'); });
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') { N.cerrarTexto(); } });
    ta.addEventListener('blur', function () { if (performance.now() - t0 > 300) setTimeout(N.cerrarTexto, 0); else setTimeout(function () { if (areaTexto && areaTexto.ta === ta) ta.focus(); }, 0); });
    ta.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    var t0 = performance.now(); areaTexto.t0 = t0;
    setTimeout(function () { ta.focus(); if (todo) ta.select(); }, 40); E.dibujar();
    E.on('vista', function f() { if (areaTexto && areaTexto.c === c) pos(); });
  };
  N.cerrarTexto = function () {
    if (!areaTexto) return; var t = areaTexto; areaTexto = null; R.ocultarId = null; t.ta.remove();
    if (!t.c.texto.trim()) { var r = Doc.buscar(E.pagina().capas, t.c.id); if (r) { r.lista.splice(r.indice, 1); E.sel = []; E.emit('sel'); } }
    E.cambio('Editar texto', 'texto-' + t.c.id); E.emit('sel');
  };
  N.editandoTexto = function () { return !!areaTexto; };

  /* ---------- formas ---------- */
  function abajoForma(ev, p) {
    var f = E.opciones.formaActual, c = Doc.capa('forma', { forma: f, nombre: ({ rect: 'Rectángulo', elipse: 'Elipse', poligono: 'Polígono', estrella: 'Estrella', flecha: 'Flecha', burbuja: 'Burbuja', linea: 'Línea' })[f] || 'Forma', relleno: { tipo: 'solido', c1: E.color } });
    if (f === 'linea') { c.relleno = null; c.trazo = { color: E.color, ancho: 8 }; c.h = 8; }
    if (f === 'burbuja') c.relleno.c1 = '#ffffff', c.trazo = { color: '#111111', ancho: 4 };
    if (f === 'rect') c.radio = 0;
    c.x = p.x; c.y = p.y; c.w = 1; c.h = f === 'linea' ? 8 : 1; E.pagina().capas.push(c); E.sel = [c.id]; E.emit('sel');
    acc = { tipo: 'forma', capa: c, p0: p, mov: false };
  }
  function moverForma(ev, p) {
    var c = acc.capa, p0 = acc.p0, dx = p.x - p0.x, dy = p.y - p0.y; acc.mov = true;
    if (c.forma === 'linea') {
      var L = Math.hypot(dx, dy); if (ev.shift) { var a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * Math.PI / 12; dx = Math.cos(a) * L; dy = Math.sin(a) * L; }
      c.w = Math.max(1, L); c.x = p0.x + dx / 2; c.y = p0.y + dy / 2; c.rot = Math.atan2(dy, dx) * 180 / Math.PI;
    } else {
      var w = Math.abs(dx), h = Math.abs(dy); if (ev.shift) w = h = Math.max(w, h);
      if (ev.alt) { c.x = p0.x; c.y = p0.y; c.w = w * 2; c.h = h * 2; } else { c.x = p0.x + Math.sign(dx || 1) * w / 2; c.y = p0.y + Math.sign(dy || 1) * h / 2; c.w = Math.max(1, w); c.h = Math.max(1, h); }
    }
    E.dibujar(); E.emit('mod');
  }
  function finForma(a) {
    var c = a.capa;
    if (!a.mov || (c.w < 4 && c.forma !== 'linea')) { var d = c.forma === 'linea' ? 300 : Math.round(E.pagina().w / 5); c.w = d; c.h = c.forma === 'linea' ? 8 : (c.forma === 'burbuja' ? d * 0.75 : d); if (c.forma === 'flecha') c.h = d * 0.6; c.x = a.p0.x; c.y = a.p0.y; }
    E.cambio('Dibujar ' + c.nombre.toLowerCase()); E.herr = 'seleccionar'; E.emit('herr');
  }

  /* ---------- pincel ---------- */
  function abajoPincel(ev, p) {
    var c = E.unaSel(), pixId = null, mascara = false, h = E.herr;
    if (c && !c.bloqueada) {
      if (E.editMascara && c.mascara) { pixId = c.mascara; mascara = true; } else if (c.tipo === 'imagen') pixId = c.px;
    }
    if (!pixId) { c = E.capaVacia('Pintura'); E.agregar(c, { nombre: 'Nueva capa de pintura' }); pixId = c.px; }
    var cv = Pix.get(pixId), pb = E.pincel, k = cv.width / c.w, borrar = h === 'borrador';
    var opt = { color: mascara ? '#ffffff' : E.color, borrar: borrar, dureza: h === 'lapiz' ? 1 : pb.dureza, tam: Math.max(1, pb.tam * k), alfa: pb.opacidad * pb.flujo, presionTam: pb.presion, presionAlfa: pb.presion && ev.tipo === 'pen' };
    var s = IM.Pincel.empezar(pixId, cv, opt), inv = M.inv(Doc.matriz(c));
    function aPx(q, pr) { var l = M.punto(inv, q.x, q.y); return { x: (l.x + c.w / 2) * cv.width / c.w, y: (l.y + c.h / 2) * cv.height / c.h, pr: pr }; }
    var pt = aPx(p, ev.pr);
    acc = { tipo: 'pintar', s: s, aPx: aPx, suav: h === 'lapiz' ? 0 : pb.suav, pos: p, ult: pt, capa: c, mascara: mascara, borrar: borrar };
    IM.Pincel.punto(s, pt); E.dibujar();
  }
  function moverPintar(ev, p) {
    var a = acc, f = 1 - a.suav * 0.85; a.pos = { x: a.pos.x + (p.x - a.pos.x) * f, y: a.pos.y + (p.y - a.pos.y) * f };
    var pt = a.aPx(a.pos, ev.pr); IM.Pincel.segmento(a.s, a.ult, pt); a.ult = pt; E.dibujar();
  }
  function finPintar(a) {
    var cmd = IM.Pincel.terminar(a.s, a.mascara ? 'Pintar máscara' : a.borrar ? 'Borrar' : 'Pincelada');
    if (cmd) E.registrarCmd(cmd);
  }

  /* ---------- cuentagotas / relleno / varita ---------- */
  function muestrear(ev) {
    var r = V.area.getBoundingClientRect(), d = devicePixelRatio || 1, x = Math.round((ev.cx - r.left) * d), y = Math.round((ev.cy - r.top) * d);
    if (x < 0 || y < 0 || x >= V.cv.width || y >= V.cv.height) return;
    var px = V.cv.getContext('2d').getImageData(x, y, 1, 1).data; if (px[3] < 8) return;
    var hex = window.Color.rgbAHex(px[0], px[1], px[2]); if (ev.alt) E.color2 = hex; else E.color = hex; E.emit('color');
  }
  function capaEnPunto(p, tipo) {
    var c = E.unaSel(); if (c && !c.bloqueada && (!tipo || c.tipo === tipo)) { var inv = M.inv(Doc.matriz(c)), l = M.punto(inv, p.x, p.y); if (Math.abs(l.x) <= c.w / 2 && Math.abs(l.y) <= c.h / 2) return c; }
    var h = E.hit(p.x, p.y); if (h && (!tipo || h.tipo === tipo)) { E.seleccionar([h.id]); return h; } return null;
  }
  function abajoRelleno(p) {
    var c = capaEnPunto(p), col = window.Color.hexARgb(E.color);
    if (!c) { var pg = E.pagina(); pg.fondo = { tipo: 'solido', c1: E.color }; E.cambio('Color de fondo'); return; }
    if (c.tipo === 'imagen') {
      var inv = M.inv(Doc.matriz(c)), l = M.punto(inv, p.x, p.y), src = Pix.get(c.px), n = IM.lienzo(src.width, src.height), x = n.getContext('2d'); x.drawImage(src, 0, 0);
      var px = (l.x + c.w / 2) * src.width / c.w, py = (l.y + c.h / 2) * src.height / c.h, id = x.getImageData(0, 0, n.width, n.height);
      var cuenta = window.Relleno.rellenar(id.data, id.width, id.height, px, py, col, E.opciones.tolRelleno, E.opciones.contiguo, true);
      if (!cuenta) return; x.putImageData(id, 0, 0); c.px = Pix.nuevo(n); E.cambio('Relleno');
    } else if (c.tipo === 'forma') { c.relleno = { tipo: 'solido', c1: E.color }; E.cambio('Color de relleno'); }
    else if (c.tipo === 'texto') { c.color = E.color; c.relleno = null; E.cambio('Color de texto'); }
    else if (c.tipo === 'qr') { c.fg = E.color; E.cambio('Color del QR'); }
  }
  function abajoVarita(ev, p) {
    var c = capaEnPunto(p, 'imagen'); if (!c) { IM.aviso('Haz clic sobre una capa de imagen'); return; }
    var inv = M.inv(Doc.matriz(c)), l = M.punto(inv, p.x, p.y), src = Pix.get(c.px), px = (l.x + c.w / 2) * src.width / c.w, py = (l.y + c.h / 2) * src.height / c.h;
    IM.Trabajo.varita(src, { x: px, y: py, tol: E.opciones.tolVarita, contiguo: E.opciones.contiguo }).then(function (mask) {
      var prev = E.seleccionPx && E.seleccionPx.id === c.id && ev.shift ? E.seleccionPx.mask : null;
      if (prev) for (var i = 0; i < mask.length; i++) mask[i] = Math.max(mask[i], prev[i]);
      N.fijarSeleccionPx(c, mask, src.width, src.height);
    });
  }
  N.fijarSeleccionPx = function (c, mask, w, h) {
    var v = IM.lienzo(w, h), x = v.getContext('2d'), id = x.createImageData(w, h), n = 0;
    for (var i = 0; i < mask.length; i++) { if (mask[i]) { id.data[i * 4] = 99; id.data[i * 4 + 1] = 102; id.data[i * 4 + 2] = 241; id.data[i * 4 + 3] = mask[i]; n++; } }
    x.putImageData(id, 0, 0); E.seleccionPx = { id: c.id, mask: mask, w: w, h: h, vista: v, n: n }; E.emit('seleccionPx'); V.pedirOv();
  };

  /* ---------- recorte de lienzo ---------- */
  function iniciarRecorte() { var p = E.pagina(); V.recorte = { x: 0, y: 0, w: p.w, h: p.h }; E.recorteRatio = E.recorteRatio || null; N.ajustarRatioRecorte(); E.emit('recorte'); }
  N.ajustarRatioRecorte = function () {
    var r = V.recorte, p = E.pagina(); if (!r || !E.recorteRatio) { V.pedirOv(); return; }
    var d = Geo.ajustarProporcion(p.w, p.h, E.recorteRatio, 'contener'); r.w = d.w; r.h = d.h; r.x = (p.w - r.w) / 2; r.y = (p.h - r.h) / 2; V.pedirOv(); E.emit('recorte');
  };
  function abajoRecorte(ev, p) {
    var r = V.recorte, rect = V.area.getBoundingClientRect(), sx = ev.cx - rect.left, sy = ev.cy - rect.top, rad = ev.tipo === 'touch' ? 22 : 10, hs = V.manijasRecorte();
    for (var i = 0; i < hs.length; i++) if (Math.hypot(hs[i].x - sx, hs[i].y - sy) <= rad) { acc = { tipo: 'recorte', modo: hs[i].id, r0: Object.assign({}, r) }; return; }
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) acc = { tipo: 'recorte', modo: 'mover', p0: p, r0: Object.assign({}, r) };
    else acc = { tipo: 'recorte', modo: 'nuevo', p0: p, r0: Object.assign({}, r) };
  }
  function moverRecorte(ev, p) {
    var a = acc, r = V.recorte, pg = E.pagina(), q = { x: IM.clamp(p.x, 0, pg.w), y: IM.clamp(p.y, 0, pg.h) }, ratio = E.recorteRatio, r0 = a.r0;
    if (a.modo === 'mover') { r.x = IM.clamp(r0.x + p.x - a.p0.x, 0, pg.w - r0.w); r.y = IM.clamp(r0.y + p.y - a.p0.y, 0, pg.h - r0.h); }
    else if (a.modo === 'nuevo') {
      var x0 = IM.clamp(a.p0.x, 0, pg.w), y0 = IM.clamp(a.p0.y, 0, pg.h), w = q.x - x0, h = q.y - y0;
      if (ratio) h = Math.sign(h || 1) * Math.abs(w) / ratio;
      r.x = Math.min(x0, x0 + w); r.y = Math.min(y0, y0 + h); r.w = Math.max(8, Math.abs(w)); r.h = Math.max(8, Math.abs(h));
    } else {
      var l = r0.x, t = r0.y, rr = r0.x + r0.w, b = r0.y + r0.h, m = a.modo;
      if (m.indexOf('w') >= 0) l = Math.min(q.x, rr - 16); if (m.indexOf('e') >= 0) rr = Math.max(q.x, l + 16);
      if (m.indexOf('n') >= 0) t = Math.min(q.y, b - 16); if (m.indexOf('s') >= 0) b = Math.max(q.y, t + 16);
      if (ratio) {
        var w2 = rr - l, h2 = b - t;
        if (m.length === 2) { if (w2 / h2 > ratio) w2 = h2 * ratio; else h2 = w2 / ratio; if (m.indexOf('w') >= 0) l = rr - w2; else rr = l + w2; if (m.indexOf('n') >= 0) t = b - h2; else b = t + h2; }
        else if (m === 'e' || m === 'w') { h2 = w2 / ratio; var cy = (r0.y + r0.h / 2); t = cy - h2 / 2; b = cy + h2 / 2; if (m === 'w') l = rr - w2; else rr = l + w2; }
        else { w2 = h2 * ratio; var cx = (r0.x + r0.w / 2); l = cx - w2 / 2; rr = cx + w2 / 2; if (m === 'n') t = b - h2; else b = t + h2; }
      }
      r.x = l; r.y = t; r.w = rr - l; r.h = b - t;
    }
    V.pedirOv(); E.emit('recorte');
  }

  /* ---------- perspectiva ---------- */
  function iniciarPersp() {
    var c = E.unaSel(); if (!c || c.tipo !== 'imagen') { IM.aviso('Selecciona una capa de imagen para la perspectiva'); V.perspectiva = null; return; }
    var m = Doc.matriz(c); V.perspectiva = { capa: c, pts: M.esquinas(m, c.w, c.h).map(function (q) { return { x: q.x, y: q.y }; }) };
    E.emit('persp'); V.pedirOv();
  }
  function abajoPersp(ev, p) {
    if (!V.perspectiva) return; var k = E.vista.k, rad = (ev.tipo === 'touch' ? 24 : 12) / k, mejor = null;
    V.perspectiva.pts.forEach(function (q) { var d = Math.hypot(q.x - p.x, q.y - p.y); if (d < rad && (!mejor || d < mejor.d)) mejor = { q: q, d: d }; });
    if (mejor) acc = { tipo: 'persp', pt: mejor.q };
  }
  N.aplicarPersp = function () {
    var P = V.perspectiva; if (!P) return; var c = P.capa, src = Pix.get(c.px), q = P.pts;
    var x0 = Math.min.apply(null, q.map(function (a) { return a.x; })), y0 = Math.min.apply(null, q.map(function (a) { return a.y; })), x1 = Math.max.apply(null, q.map(function (a) { return a.x; })), y1 = Math.max.apply(null, q.map(function (a) { return a.y; }));
    var dens = src.width / c.w, W = Math.max(8, Math.min(4096, Math.round((x1 - x0) * dens))), H = Math.max(8, Math.min(4096, Math.round((y1 - y0) * dens)));
    var qp = q.map(function (a) { return { x: (a.x - x0) / (x1 - x0) * W, y: (a.y - y0) / (y1 - y0) * H }; });
    var out = IM.Pincel.deformar(src, qp, W, H);
    c.px = Pix.nuevo(out); c.w = x1 - x0; c.h = y1 - y0; c.x = (x0 + x1) / 2; c.y = (y0 + y1) / 2; c.rot = 0; c.flipX = c.flipY = false;
    E.cambio('Perspectiva'); E.herr = 'seleccionar'; E.emit('herr');
  };
  N.cancelarPersp = function () { E.herr = 'seleccionar'; E.emit('herr'); };
})(window.IM);
