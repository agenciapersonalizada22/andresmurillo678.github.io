/* Interfaz: controles reutilizables, pestanas, hojas moviles, barra superior, atajos y tema. */
(function (IM) {
  var h = IM.h, E = IM.E, V = IM.Vista, UI = IM.UI = { portapapeles: null };
  var n = 0;
  UI.id = function () { return 'c' + (++n); };
  UI.btn = function (txt, icono, fn, o) {
    o = o || {};
    var b = h('button', { type: 'button', class: 'btn' + (o.clase ? ' ' + o.clase : ''), title: o.titulo || txt || '', 'aria-label': o.aria || o.titulo || txt || 'Botón', onclick: fn, disabled: o.deshabilitado }, icono ? IM.ic(icono, o.tam || 18) : null, txt ? h('span', null, txt) : null);
    if (o.pulsado != null) b.setAttribute('aria-pressed', o.pulsado ? 'true' : 'false');
    return b;
  };
  UI.fila = function (etiqueta, ctl, o) { var id = ctl && ctl.id; return h('div', { class: 'fila' + (o && o.clase ? ' ' + o.clase : '') }, etiqueta ? h('label', { for: id, class: 'et' }, etiqueta) : null, ctl); };
  UI.seccion = function (titulo, hijos, abierta) {
    var d = h('details', { class: 'sec', open: abierta !== false }, h('summary', null, titulo), h('div', { class: 'sec-c' }, hijos));
    return d;
  };
  UI.rango = function (etq, min, max, paso, val, fn, o) {
    o = o || {}; var id = UI.id(), num = h('input', { type: 'number', class: 'num', min: o.min != null ? o.min : min, max: o.max != null ? o.max : max, step: paso, value: round(val), 'aria-label': etq + ' valor' }), r = h('input', { type: 'range', id: id, min: min, max: max, step: paso, value: val, 'aria-label': etq });
    function aplicar(v, fin) { v = parseFloat(v); if (isNaN(v)) return; num.value = round(v); r.value = v; fn(v, fin); }
    r.addEventListener('input', function () { aplicar(r.value); }); num.addEventListener('change', function () { aplicar(num.value, true); });
    var f = h('div', { class: 'fila rango' }, h('label', { for: id, class: 'et' }, etq), r, num); return f;
  };
  function round(v) { return Math.round(v * 100) / 100; }
  UI.num = function (etq, val, fn, o) {
    o = o || {}; var id = UI.id(), i = h('input', { type: 'number', id: id, class: 'num ancho', value: round(val), step: o.paso || 1, min: o.min, max: o.max });
    i.addEventListener('change', function () { var v = parseFloat(i.value); if (!isNaN(v)) fn(v); }); return UI.fila(etq, i);
  };
  UI.color = function (etq, val, fn) {
    var id = UI.id(), i = h('input', { type: 'color', id: id, value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#000000', class: 'color' });
    i.addEventListener('input', function () { fn(i.value); }); return UI.fila(etq, i);
  };
  UI.sel = function (etq, opciones, val, fn) {
    var id = UI.id(), s = h('select', { id: id }, opciones.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return h('option', { value: v, selected: String(v) === String(val) }, t); }));
    s.addEventListener('change', function () { fn(s.value); }); return UI.fila(etq, s);
  };
  UI.sw = function (etq, val, fn) {
    var id = UI.id(), c = h('input', { type: 'checkbox', id: id, checked: !!val, role: 'switch' }); c.addEventListener('change', function () { fn(c.checked); });
    return h('div', { class: 'fila' }, h('label', { for: id, class: 'et' }, etq), c);
  };
  UI.txt = function (etq, val, fn, o) {
    var id = UI.id(), t = o && o.multi ? h('textarea', { id: id, rows: 3 }, val) : h('input', { type: 'text', id: id, value: val });
    if (o && o.multi) t.value = val; t.addEventListener('input', function () { fn(t.value); }); return UI.fila(etq, t, { clase: o && o.multi ? 'col' : '' });
  };
  UI.segmento = function (etq, opts, val, fn) {
    var g = h('div', { class: 'seg', role: 'group', 'aria-label': etq });
    opts.forEach(function (o) { var b = h('button', { type: 'button', class: 'segb', title: o[2] || o[1], 'aria-pressed': String(o[0]) === String(val) ? 'true' : 'false', onclick: function () { fn(o[0]); Array.prototype.forEach.call(g.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); } }, o[1].length > 3 && /^[a-z]+$/.test(o[1]) ? IM.ic(o[1], 16) : o[1]); g.appendChild(b); });
    return UI.fila(etq, g);
  };
  /* pestanas: defs [{id,nombre,render(cont)}] */
  UI.pestanas = function (cTabs, cCont, defs, clave, inicial) {
    var activa = IM.Almacen.lsGet('tab_' + clave, inicial || defs[0].id), obj = {};
    function pintarTabs() {
      cTabs.textContent = '';
      defs.forEach(function (d) {
        var b = h('button', { type: 'button', role: 'tab', id: 'tab-' + clave + '-' + d.id, 'aria-selected': d.id === activa ? 'true' : 'false', 'aria-controls': cCont.id, onclick: function () { obj.mostrar(d.id); } }, d.nombre);
        cTabs.appendChild(b);
      });
    }
    obj.mostrar = function (id) {
      if (!defs.some(function (d) { return d.id === id; })) return; activa = id; IM.Almacen.lsSet('tab_' + clave, id); pintarTabs(); obj.refrescar();
    };
    obj.refrescar = function () {
      var d = defs.filter(function (x) { return x.id === activa; })[0]; cCont.textContent = ''; cCont.setAttribute('aria-labelledby', 'tab-' + clave + '-' + activa); cCont.setAttribute('role', 'tabpanel');
      var y = cCont.scrollTop; d.render(cCont); cCont.scrollTop = y;
    };
    obj.activa = function () { return activa; };
    pintarTabs(); obj.refrescar(); return obj;
  };
  /* refresco con rAF; omite si el usuario edita dentro del panel */
  UI.diferido = function (f, cont, forzar) {
    var p = 0;
    return function (fuerza) {
      if (p) return; p = requestAnimationFrame(function () { p = 0; if (!fuerza && cont.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox') return; f(); });
    };
  };
  /* ---------- herramientas ---------- */
  UI.HERR = [['seleccionar', 'sel', 'Seleccionar (V)'], ['mano', 'mano', 'Mano (H / Espacio)'], ['texto', 'texto', 'Texto (T)'], ['forma', 'forma', 'Formas (U)'], ['pincel', 'pincel', 'Pincel (B)'], ['borrador', 'borrador', 'Borrador (E)'],
    ['lapiz', 'lapiz', 'Lápiz (N)'], ['cuentagotas', 'gotero', 'Cuentagotas (I)'], ['relleno', 'relleno', 'Relleno (G)'], ['varita', 'varita', 'Varita mágica (W)'], ['recorte', 'recorte', 'Recortar lienzo (C)'], ['persp', 'persp', 'Perspectiva (P)']];
  UI.elegirHerr = function (id) {
    if (id === 'persp' && !(E.unaSel() && E.unaSel().tipo === 'imagen')) { IM.aviso('Selecciona una imagen para usar la perspectiva'); return; }
    if (id === 'forma' && E.herr === 'forma') { UI.hoja('izq', 'elementos'); }
    E.herr = id; E.emit('herr'); pintarHerr();
  };
  function pintarHerr() {
    var c = document.getElementById('herramientas'); c.textContent = '';
    UI.HERR.forEach(function (t) {
      c.appendChild(h('button', { type: 'button', class: 'herr', title: t[2], 'aria-label': t[2], 'aria-pressed': E.herr === t[0] ? 'true' : 'false', 'data-herr': t[0], onclick: function () { UI.elegirHerr(t[0]); } }, IM.ic(t[1], 20)));
    });
    var col = h('button', { type: 'button', class: 'herr color-act', title: 'Color activo (X intercambia)', 'aria-label': 'Color activo', onclick: function () { UI.hoja('der', 'props'); document.getElementById('colorGlobal') && document.getElementById('colorGlobal').click(); } }, h('span', { class: 'cb2', style: { background: E.color2 } }), h('span', { class: 'cb1', style: { background: E.color } }));
    c.appendChild(col);
  }
  UI.pintarHerr = pintarHerr;
  E.on('herr', pintarHerr); E.on('color', pintarHerr);
  /* ---------- hojas moviles ---------- */
  var movil = window.matchMedia('(max-width: 899px)');
  UI.esMovil = function () { return movil.matches; };
  UI.hoja = function (cual, tab) {
    var p = document.getElementById(cual), tabs = cual === 'izq' ? UI.tabsIzq : UI.tabsDer;
    if (tab && tabs) tabs.mostrar(tab);
    if (UI.esMovil()) { document.getElementById('izq').classList.toggle('abierta', cual === 'izq'); document.getElementById('der').classList.toggle('abierta', cual === 'der'); document.getElementById('velo').hidden = false; document.body.classList.add('hoja-abierta'); }
    else { p.classList.remove('oculto'); }
  };
  UI.cerrarHojas = function () { document.getElementById('izq').classList.remove('abierta'); document.getElementById('der').classList.remove('abierta'); document.getElementById('velo').hidden = true; document.body.classList.remove('hoja-abierta'); };
  function asas() {
    ['izq', 'der'].forEach(function (id) {
      var p = document.getElementById(id), a = h('div', { class: 'asa', role: 'button', tabindex: 0, 'aria-label': 'Cerrar panel (deslizar hacia abajo)', onclick: UI.cerrarHojas, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') UI.cerrarHojas(); } }, h('span'));
      var y0 = null;
      a.addEventListener('pointerdown', function (e) { y0 = e.clientY; a.setPointerCapture(e.pointerId); });
      a.addEventListener('pointermove', function (e) { if (y0 != null) p.style.transform = 'translateY(' + Math.max(0, e.clientY - y0) + 'px)'; });
      a.addEventListener('pointerup', function (e) { if (y0 != null && e.clientY - y0 > 70) UI.cerrarHojas(); p.style.transform = ''; y0 = null; });
      p.insertBefore(a, p.firstChild);
    });
    document.getElementById('velo').addEventListener('click', UI.cerrarHojas);
  }
  /* ---------- barra superior ---------- */
  function barra() {
    var gd = document.getElementById('gDeshacer'), bu = UI.btn('', 'deshacer', E.deshacer, { titulo: 'Deshacer (Ctrl+Z)' }), br = UI.btn('', 'rehacer', E.rehacer, { titulo: 'Rehacer (Ctrl+Mayús+Z)' });
    gd.appendChild(bu); gd.appendChild(br);
    E.on('hist', function () { bu.disabled = !E.historial.puedeDeshacer(); br.disabled = !E.historial.puedeRehacer(); bu.title = 'Deshacer' + (E.historial.puedeDeshacer() ? ': ' + E.historial.pila[E.historial.pos - 1].nombre : '') + ' (Ctrl+Z)'; });
    bu.disabled = br.disabled = true;
    var gz = document.getElementById('gZoom'), pc = h('button', { type: 'button', class: 'btn zoom-pc', title: 'Zoom al 100%', 'aria-label': 'Zoom, clic para 100%', onclick: function () { V.zoom(1 / E.vista.k); } }, '100%');
    gz.appendChild(UI.btn('', 'menos', function () { V.zoom(1 / 1.25); }, { titulo: 'Alejar (-)' })); gz.appendChild(pc); gz.appendChild(UI.btn('', 'mas', function () { V.zoom(1.25); }, { titulo: 'Acercar (+)' })); gz.appendChild(UI.btn('', 'zoom', function () { V.ajustar(); }, { titulo: 'Ajustar a pantalla (Ctrl+0)' }));
    E.on('vista', function () { pc.textContent = Math.round(E.vista.k * 100) + '%'; });
    var gv = document.getElementById('gVarios');
    gv.appendChild(UI.btn('', 'carpeta', function () { IM.Dialogos.proyectos(); }, { titulo: 'Proyectos (Ctrl+O)' }));
    gv.appendChild(UI.btn('', 'luna', UI.cambiarTema, { titulo: 'Cambiar tema claro/oscuro', clase: 'btn-tema' }));
    gv.appendChild(UI.btn('', 'ayuda', function () { IM.Dialogos.ayuda(); }, { titulo: 'Atajos y ayuda (?)' }));
    document.getElementById('bExportar').addEventListener('click', function () { IM.Dialogos.exportar(); });
    var nom = document.getElementById('nombreProyecto');
    nom.addEventListener('change', function () { E.proy.nombre = nom.value.trim() || 'Sin título'; nom.value = E.proy.nombre; IM.Proy.programar(); });
    nom.addEventListener('keydown', function (e) { if (e.key === 'Enter') nom.blur(); });
    var est = document.getElementById('estadoGuardado');
    E.on('guardado', function (s) { est.textContent = { guardado: 'Guardado', guardando: 'Guardando…', pendiente: 'Cambios sin guardar', error: 'Error al guardar' }[s] || s; est.dataset.s = s; });
  }
  UI.cambiarTema = function () {
    var r = document.documentElement, ord = ['auto', 'claro', 'oscuro'], i = (ord.indexOf(r.getAttribute('data-tema')) + 1) % 3;
    UI.tema(ord[i]); IM.aviso('Tema: ' + ord[i]);
  };
  UI.tema = function (t) {
    var r = document.documentElement; r.setAttribute('data-tema', t); IM.Almacen.lsSet('tema', t);
    var oscuro = t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); r.setAttribute('data-efectivo', oscuro ? 'oscuro' : 'claro'); V.pedirOv();
  };
  /* ---------- barra inferior (movil) ---------- */
  function inferior() {
    var c = document.getElementById('inferior');
    [['Añadir', 'mas', function () { UI.hoja('izq', 'elementos'); }], ['Plantillas', 'plantilla', function () { UI.hoja('izq', 'plantillas'); }], ['Editar', 'ajustes', function () { UI.hoja('der', 'props'); }], ['Capas', 'capas', function () { UI.hoja('der', 'capas'); }], ['Ajustes', 'paleta', function () { UI.hoja('der', 'ajustes'); }]]
      .forEach(function (b) { c.appendChild(h('button', { type: 'button', class: 'nav-b', onclick: b[2], 'aria-label': b[0] }, IM.ic(b[1], 22), h('span', null, b[0]))); });
  }
  /* ---------- atajos ---------- */
  function enCampo(t) { return t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !(t.type === 'checkbox' || t.type === 'range' || t.type === 'button') || t.isContentEditable); }
  UI.copiar = function (cortar) {
    var cs = E.capasSel(); if (!cs.length) return; UI.portapapeles = JSON.stringify(cs.map(function (c) { return c; })); UI.pegados = 0;
    if (cortar) E.eliminarSel(); else IM.aviso('Copiado');
  };
  UI.pegar = function () {
    if (!UI.portapapeles) return; var cs = JSON.parse(UI.portapapeles), ids = [], p = E.pagina(); UI.pegados = (UI.pegados || 0) + 1;
    cs.forEach(function (c) { var n = IM.Doc.clonar(c); n.x += 24 * UI.pegados; n.y += 24 * UI.pegados; p.capas.push(n); ids.push(n.id); });
    E.sel = ids; E.emit('sel'); E.cambio('Pegar');
  };
  function teclas(e) {
    var t = e.target, ctrl = e.ctrlKey || e.metaKey, k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
    if (document.querySelector('.dialogo[open]')) { return; }
    if (IM.Entrada.editandoTexto()) { return; }
    if (enCampo(t)) { if (k === 'Escape') t.blur(); return; }
    if (e.code === 'Space') { if (!IM.Entrada.espacio) { IM.Entrada.espacio = true; document.getElementById('ov').style.cursor = 'grab'; } e.preventDefault(); return; }
    if (ctrl) {
      var hecho = true;
      if (kl === 'z') { e.shiftKey ? E.rehacer() : E.deshacer(); } else if (kl === 'y') E.rehacer(); else if (kl === 'c') UI.copiar(false); else if (kl === 'x') UI.copiar(true);
      else if (kl === 'v') { return; } else if (kl === 'd') E.duplicarSel(); else if (kl === 'g') e.shiftKey ? E.desagrupar() : E.agrupar(); else if (kl === 'a') E.seleccionar(E.pagina().capas.filter(function (c) { return c.visible && !c.bloqueada; }).map(function (c) { return c.id; }));
      else if (kl === 's') IM.Proy.guardar().then(function () { IM.aviso('Proyecto guardado'); }); else if (kl === 'e') IM.Dialogos.exportar(); else if (kl === 'o') IM.Dialogos.proyectos();
      else if (kl === '0') V.ajustar(); else if (kl === '1') V.zoom(1 / E.vista.k); else if (kl === '=' || kl === '+') V.zoom(1.25); else if (kl === '-') V.zoom(0.8);
      else if (kl === ']') E.ordenar(e.shiftKey ? 'frente' : 'arriba'); else if (kl === '[') E.ordenar(e.shiftKey ? 'fondo' : 'abajo');
      else if (kl === 'r') { E.proy.ajustes.reglas = !E.proy.ajustes.reglas; V.cambioTam(); } else if (kl === "'" || kl === ';') { E.proy.ajustes.cuadricula = !E.proy.ajustes.cuadricula; V.pedirOv(); E.emit('doc'); }
      else hecho = false;
      if (hecho) e.preventDefault(); return;
    }
    var mapa = { v: 'seleccionar', h: 'mano', t: 'texto', u: 'forma', b: 'pincel', e: 'borrador', n: 'lapiz', i: 'cuentagotas', g: 'relleno', w: 'varita', c: 'recorte', p: 'persp' };
    if (mapa[kl] && !e.altKey) { UI.elegirHerr(mapa[kl]); e.preventDefault(); return; }
    if (kl === 'x') { var a = E.color; E.color = E.color2; E.color2 = a; E.emit('color'); return; }
    if (k === '[' || k === ']') { E.pincel.tam = IM.clamp(E.pincel.tam * (k === ']' ? 1.2 : 1 / 1.2), 1, 600); E.emit('pincel'); return; }
    if (k === 'Delete' || k === 'Backspace') { if (E.herr === 'recorte') return; if (E.seleccionPx && E.herr === 'varita') { IM.UIAjustes && IM.UIAjustes.borrarSeleccionPx(); } else E.eliminarSel(); e.preventDefault(); return; }
    if (k === 'Escape') { IM.Entrada.cancelar(); if (E.herr === 'recorte' || E.herr === 'persp') { UI.elegirHerr('seleccionar'); } else if (E.seleccionPx) { E.seleccionPx = null; E.emit('seleccionPx'); V.pedirOv(); } else E.seleccionar([]); UI.cerrarHojas(); return; }
    if (k === 'Enter' && E.herr === 'recorte') { IM.UIAjustes && IM.UIAjustes.aplicarRecorte(); return; }
    if (k === 'Enter' && E.herr === 'persp') { IM.Entrada.aplicarPersp(); return; }
    if (k === 'Enter' && E.unaSel() && E.unaSel().tipo === 'texto') { IM.Entrada.editarTexto(E.unaSel(), true); e.preventDefault(); return; }
    if (k === '?' || k === 'F1') { IM.Dialogos.ayuda(); return; }
    if (k === '+' || k === '=') { V.zoom(1.25); return; } if (k === '-') { V.zoom(0.8); return; }
    if (k.indexOf('Arrow') === 0 && E.sel.length) {
      var d = e.shiftKey ? 10 : 1, dx = k === 'ArrowLeft' ? -d : k === 'ArrowRight' ? d : 0, dy = k === 'ArrowUp' ? -d : k === 'ArrowDown' ? d : 0;
      E.capasSel().forEach(function (c) { if (!c.bloqueada) { c.x += dx; c.y += dy; } }); E.cambio('Mover con flechas', 'flechas'); E.emit('mod'); e.preventDefault();
    }
  }
  function pegado(e) {
    if (document.querySelector('.dialogo[open]') || enCampo(e.target)) return;
    var cd = e.clipboardData; if (!cd) return;
    var files = Array.prototype.filter.call(cd.files || [], function (f) { return /^image\//.test(f.type); });
    if (!files.length) Array.prototype.forEach.call(cd.items || [], function (it) { if (it.kind === 'file' && /^image\//.test(it.type)) files.push(it.getAsFile()); });
    if (files.length) { e.preventDefault(); E.importarVarios(files); return; }
    var txt = cd.getData('text/plain');
    if (UI.portapapeles && !txt.trim()) { e.preventDefault(); UI.pegar(); return; }
    if (txt && txt.trim()) { e.preventDefault(); var t = IM.Doc.capa('texto', { texto: txt.slice(0, 500), color: E.color, w: E.pagina().w * 0.6, tam: Math.round(E.pagina().w / 18) }); E.agregar(t, { nombre: 'Pegar texto' }); }
  }
  UI.iniciar = function () {
    UI.tema(IM.Almacen.lsGet('tema', 'auto')); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { UI.tema(IM.Almacen.lsGet('tema', 'auto')); });
    barra(); inferior(); pintarHerr();
    UI.tabsIzq = UI.pestanas(document.getElementById('tabsIzq'), document.getElementById('cIzq'), IM.UIAgregar.pestanas, 'izq', 'plantillas');
    UI.tabsDer = UI.pestanas(document.getElementById('tabsDer'), document.getElementById('cDer'), [
      { id: 'props', nombre: 'Propiedades', render: IM.UIProps.render }, { id: 'capas', nombre: 'Capas', render: IM.UICapas.renderCapas }, { id: 'ajustes', nombre: 'Ajustes', render: IM.UIAjustes.render }, { id: 'historial', nombre: 'Historial', render: IM.UICapas.renderHistorial }], 'der', 'props');
    asas();
    document.addEventListener('keydown', teclas);
    document.addEventListener('keyup', function (e) { if (e.code === 'Space') { IM.Entrada.espacio = false; document.getElementById('ov').style.cursor = ''; } });
    document.addEventListener('paste', pegado);
    var ref = UI.diferido(function () { UI.tabsDer.refrescar(); }, document.getElementById('cDer')), refI = UI.diferido(function () { UI.tabsIzq.refrescar(); }, document.getElementById('cIzq'));
    E.on('sel', function () { ref(true); }); E.on('hist', function () { ref(true); }); E.on('proyecto', function () { ref(true); refI(true); }); E.on('doc', function () { ref(); }); E.on('mod', function () { ref(); });
    E.on('herr', function () { ref(true); }); E.on('seleccionPx', function () { ref(true); }); E.on('recorte', function () { if (UI.tabsDer.activa() === 'ajustes') ref(); }); E.on('persp', function () { ref(true); });
    E.on('pincel', function () { ref(true); }); E.on('color', function () { ref(true); });
    var ini = document.getElementById('inpArchivos'), cam = document.getElementById('inpCamara');
    ini.addEventListener('change', function () { E.importarVarios(ini.files); ini.value = ''; }); cam.addEventListener('change', function () { E.importarVarios(cam.files); cam.value = ''; });
  };
  UI.abrirArchivos = function () { document.getElementById('inpArchivos').click(); };
  UI.abrirCamara = function () { document.getElementById('inpCamara').click(); };
})(window.IM);
