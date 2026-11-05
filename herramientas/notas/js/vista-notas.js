/* Vista de notas: lista (o cuadricula tipo Keep), libretas, papelera 30 dias, plantillas. El editor vive en editor.js */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, Mo = G.Modelo, Md = G.Md, U = G.Util, Cfg = G.Config, B = G.Busqueda;
  var V = G.VistaNotas = {}, S = function () { return G.App.store; };
  var el = {}, filtroAct = '', q = '', editorAbierto = null;

  var TITULOS = { todas: 'Todas las notas', fijadas: 'Notas fijadas', archivo: 'Archivo', papelera: 'Papelera' };
  V.titulo = function (f) { var p = String(f || 'todas').split(':'); if (p[0] === 'libreta') { var l = S().get('libretas', p[1]); return l ? l.nombre : 'Libreta'; } return TITULOS[p[0]] || 'Notas'; };

  function idsLibreta(id) { var o = [id]; S().lista('libretas', function (l) { return l.padre === id; }).forEach(function (l) { o = o.concat(idsLibreta(l.id)); }); return o; }
  V.consulta = function (filtro) {
    var p = String(filtro || 'todas').split(':'), k = p[0], v = p.slice(1).join(':'), l;
    switch (k) {
      case 'fijadas': l = S().lista('notas', function (n) { return !n.papelera && !n.archivada && n.fijada; }); break;
      case 'archivo': l = S().lista('notas', function (n) { return !n.papelera && n.archivada; }); break;
      case 'papelera': l = S().lista('notas', function (n) { return n.papelera; }); break;
      case 'libreta': var ids = idsLibreta(v); l = S().lista('notas', function (n) { return !n.papelera && !n.archivada && ids.indexOf(n.libreta) >= 0; }); break;
      default: l = S().lista('notas', function (n) { return !n.papelera && !n.archivada; });
    }
    if (q.trim()) { var c = B.compilar(q, { nombreContenedor: G.App.nombreContenedor }); l = l.filter(function (n) { return c.pred(n, 'nota'); }); }
    var o = Cfg.pref.ordenNotas;
    l.sort(function (a, b) {
      if (k !== 'papelera' && a.fijada !== b.fijada) return a.fijada ? -1 : 1;
      if (o === 'titulo') return (a.titulo || '').localeCompare(b.titulo || '', 'es'); if (o === 'creada') return b.creada - a.creada; return b.modificada - a.modificada;
    });
    return l;
  };
  V.resumen = function (n) {
    if (n.cif) return 'Nota bloqueada';
    var t = Md.aTexto(n.cuerpo || ''); return t.slice(0, 160);
  };
  V.tituloDe = function (n) { return n.titulo && n.titulo.trim() ? n.titulo : (n.cif ? 'Nota bloqueada' : (Md.aTexto(n.cuerpo || '').slice(0, 50) || 'Sin título')); };

  V.fila = function (n, o) {
    o = o || {}; var act = G.App.sel && G.App.sel.id === n.id, prog = n.cif ? { total: 0 } : Md.tareasMd(n.cuerpo);
    var pie = [h('span', { txt: UI.fmtRel(n.modificada) })];
    (n.etiquetas || []).slice(0, 3).forEach(function (e) { pie.push(h('span', { cls: 'chip', txt: '#' + e })); });
    if (prog.total) pie.push(h('span', { txt: prog.hechas + '/' + prog.total + ' ✓' }));
    if (n.libreta && o.libreta !== false) { var lb = S().get('libretas', n.libreta); if (lb) pie.push(h('span', {}, [UI.icono('folder'), ' ' + lb.nombre])); }
    var b = h('button', { type: 'button', cls: 'fila-n', 'data-id': n.id, 'aria-selected': String(!!act), style: n.color ? '--nc:' + n.color : null, 'data-f': 1, on: { click: function (e) { if (n.papelera) V.menuNota(e.currentTarget, n.id); else G.App.abrir('nota', n.id); }, contextmenu: function (e) { e.preventDefault(); V.menuNota({ x: e.clientX, y: e.clientY }, n.id); } } },
      [h('div', { cls: 'n-tit' }, [n.fijada ? UI.icono('pin') : null, n.cif ? UI.icono('lock') : null, h('span', { txt: V.tituloDe(n) })]), h('div', { cls: 'n-res', txt: V.resumen(n) }), h('div', { cls: 'n-pie' }, pie)]);
    return b;
  };

  V.menuNota = function (ancla, id) {
    var n = S().get('notas', id); if (!n) return;
    if (n.papelera) { UI.menu(ancla, [{ txt: 'Restaurar', icono: 'undo', fn: function () { S().set('notas', id, { papelera: 0 }); } }, { txt: 'Eliminar para siempre…', icono: 'trash', peligro: 1, fn: function () { UI.confirmar('Eliminar nota', 'Esta acción no se puede deshacer.', function () { if (G.App.sel && G.App.sel.id === id) G.App.cerrarDetalle(); S().borrar('notas', id); }, { txt: 'Eliminar', peligro: 1 }); } }]); return; }
    UI.menu(ancla, [
      { txt: n.fijada ? 'Desfijar' : 'Fijar arriba', icono: 'pin', fn: function () { S().set('notas', id, { fijada: !n.fijada }); } },
      { txt: 'Color…', icono: 'sun', fn: function () { G.VistaTareas.elegirColor(n.color, function (c) { S().set('notas', id, { color: c }); }); } },
      { txt: 'Mover a libreta…', icono: 'folder', fn: function () { V.elegirLibreta(n.libreta, function (l) { S().set('notas', id, { libreta: l }); }); } },
      { txt: n.archivada ? 'Sacar del archivo' : 'Archivar', icono: 'archive', fn: function () { S().set('notas', id, { archivada: !n.archivada }); if (G.App.sel && G.App.sel.id === id) G.App.cerrarDetalle(); } },
      { txt: 'Compartir en tiempo real…', icono: 'share', fn: function () { G.Colab.compartir('nota', id); } },
      { txt: 'Copiar como texto', icono: 'copy', fn: function () { UI.copiar((n.titulo ? n.titulo + '\n\n' : '') + (n.cif ? '' : n.cuerpo)).then(function () { UI.aviso('Copiada como texto', { tipo: 'ok' }); }); } },
      { sep: 1 }, { txt: 'A la papelera', icono: 'trash', peligro: 1, fn: function () { V.eliminar(id); } }
    ]);
  };
  V.eliminar = function (id) {
    if (G.App.sel && G.App.sel.id === id) { if (G.Editor) G.Editor.vaciar(); G.App.cerrarDetalle(); }
    S().set('notas', id, { papelera: Date.now() });
    UI.aviso('Nota a la papelera (30 días)', { acciones: [{ txt: 'Deshacer', fn: function () { S().set('notas', id, { papelera: 0 }); } }] });
  };
  V.elegirLibreta = function (actual, fn) {
    var libs = S().lista('libretas').sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    var cont = h('div', {}, [h('button', { type: 'button', cls: 'menu-i', 'data-f': 1, on: { click: function () { d.cerrar(); fn(''); } } }, [UI.icono('note'), h('span', { txt: 'Sin libreta' }), actual ? null : h('span', { cls: 'marca', txt: '✓' })])].concat(libs.map(function (l) {
      var prof = 0, p = l; while (p && p.padre && prof < 6) { p = S().get('libretas', p.padre); prof++; }
      return h('button', { type: 'button', cls: 'menu-i', style: 'padding-left:' + (10 + prof * 16) + 'px', 'data-f': 1, on: { click: function () { d.cerrar(); fn(l.id); } } }, [UI.icono('folder'), h('span', { txt: l.nombre }), actual === l.id ? h('span', { cls: 'marca', txt: '✓' }) : null]);
    })).concat([h('button', { type: 'button', cls: 'menu-i', 'data-f': 1, on: { click: function () { d.cerrar(); V.nuevaLibreta('', function (id) { fn(id); }); } } }, [UI.icono('plus'), h('span', { txt: 'Nueva libreta…' })])]));
    var d = UI.dialogo({ titulo: 'Libreta', ancho: 380, cuerpo: cont });
  };
  V.nuevaLibreta = function (padre, cb) {
    UI.preguntar(padre ? 'Nueva sublibreta' : 'Nueva libreta', 'Nombre', '', function (v) { var l = S().poner('libretas', Mo.libreta({ nombre: v.trim(), padre: padre || '', orden: Date.now() })); if (cb) cb(l.id); else G.App.ir('notas', 'libreta:' + l.id); }, { txt: 'Crear' });
  };
  V.menuLibreta = function (ancla, id) {
    var l = S().get('libretas', id); if (!l) return;
    UI.menu(ancla, [
      { txt: 'Renombrar…', icono: 'edit', fn: function () { UI.preguntar('Renombrar libreta', 'Nombre', l.nombre, function (v) { S().set('libretas', id, { nombre: v.trim() }); }); } },
      { txt: 'Nueva sublibreta…', icono: 'folder', fn: function () { V.nuevaLibreta(id); } },
      { txt: 'Eliminar libreta…', icono: 'trash', peligro: 1, fn: function () { UI.confirmar('Eliminar libreta', 'Las notas pasarán a «Sin libreta».', function () {
        S().lista('notas', function (n) { return n.libreta === id; }).forEach(function (n) { S().set('notas', n.id, { libreta: l.padre || '' }); });
        S().lista('libretas', function (x) { return x.padre === id; }).forEach(function (x) { S().set('libretas', x.id, { padre: l.padre || '' }); }); S().borrar('libretas', id); G.App.ir('notas', 'todas');
      }, { txt: 'Eliminar', peligro: 1 }); } }
    ], { derecha: true });
  };
  V.menuNueva = function (ancla) {
    UI.menu(ancla, Mo.plantillas.map(function (p) { return { txt: p.nombre, icono: p.id === 'vacia' ? 'note' : 'copy', fn: function () { var d = Mo.aplicarPlantilla(p, F.hoy()); G.App.nuevaNota(d); } }; }), { derecha: true });
  };

  function pintarLista() {
    var l = V.consulta(filtroAct), ul = el.lista; ul.textContent = '';
    ul.className = 'lista-n' + (Cfg.pref.vistaNotas === 'cuadricula' ? ' cuadricula' : '');
    if (filtroAct === 'papelera') {
      var tr = S().lista('tareas', function (t) { return t.papelera && !t.padre; });
      if (l.length || tr.length) ul.appendChild(h('li', { style: 'padding:10px 14px', role: 'presentation' }, [h('p', { cls: 'ayuda', txt: 'Los elementos se eliminan definitivamente a los ' + Cfg.pref.papeleraDias + ' días.' }), h('button', { type: 'button', cls: 'btn peligro pq', txt: 'Vaciar papelera', 'data-f': 1, on: { click: function () { UI.confirmar('Vaciar papelera', 'Se eliminarán para siempre ' + (l.length + tr.length) + ' elementos.', function () { l.forEach(function (n) { S().borrar('notas', n.id); }); tr.forEach(function (t) { G.Tareas.borrarDef(t.id); }); }, { txt: 'Vaciar', peligro: 1 }); } } })]));
      tr.forEach(function (t) { ul.appendChild(h('li', { role: 'listitem' }, [h('button', { type: 'button', cls: 'fila-n', 'data-f': 1, on: { click: function (e) { UI.menu(e.currentTarget, [{ txt: 'Restaurar tarea', icono: 'undo', fn: function () { G.Tareas.restaurar(t.id); } }, { txt: 'Eliminar para siempre', icono: 'trash', peligro: 1, fn: function () { G.Tareas.borrarDef(t.id); } }]); } } }, [h('div', { cls: 'n-tit' }, [UI.icono('task'), h('span', { txt: t.titulo })]), h('div', { cls: 'n-pie', txt: 'Tarea · eliminada ' + UI.fmtRel(t.papelera) })])])); });
    }
    if (!l.length && !(filtroAct === 'papelera' && ul.children.length)) {
      ul.appendChild(h('li', { cls: 'vacio', role: 'presentation' }, [h('b', { txt: q ? 'Sin resultados' : filtroAct === 'papelera' ? 'Papelera vacía' : 'No hay notas aquí' }), q ? 'Prueba con otras palabras.' : filtroAct === 'todas' || filtroAct.indexOf('libreta') === 0 ? 'Crea una nota con el botón +, o pulsa N.' : '']));
      return;
    }
    var n = 0, LIM = 150;
    l.forEach(function (x) { if (n++ < LIM) ul.appendChild(h('li', { role: 'listitem' }, [V.fila(x, { libreta: filtroAct.indexOf('libreta:') !== 0 })])); });
    if (n > LIM) ul.appendChild(h('li', { cls: 'vacio' }, [h('button', { type: 'button', cls: 'btn', txt: 'Mostrar ' + (n - LIM) + ' más', 'data-f': 1, on: { click: function () { LIM = 1e9; pintarLista(); } } })]));
  }

  V.montar = function (cont, filtro, sel) {
    filtroAct = filtro || 'todas'; var App = G.App, esLib = filtroAct.indexOf('libreta:') === 0;
    if (esLib && !S().get('libretas', filtroAct.slice(8))) { App.ir('notas', 'todas', null, { sinHistorial: true }); return; }
    var cuad = Cfg.pref.vistaNotas === 'cuadricula';
    var cab = h('div', { cls: 'cab' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: V.titulo(filtroAct) }),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': cuad ? 'Ver como lista' : 'Ver como cuadrícula', title: cuad ? 'Lista' : 'Cuadrícula', 'data-f': 1, on: { click: function () { Cfg.setPref('vistaNotas', cuad ? 'lista' : 'cuadricula'); App.render(true); } } }, [UI.icono(cuad ? 'list' : 'grid')]),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Ordenar', 'data-f': 1, on: { click: function (e) { UI.menu(e.currentTarget, [{ titulo: 'Ordenar por' }].concat([['modificada', 'Última modificación'], ['creada', 'Fecha de creación'], ['titulo', 'Título']].map(function (x) { return { txt: x[1], marca: Cfg.pref.ordenNotas === x[0], fn: function () { Cfg.setPref('ordenNotas', x[0]); pintarLista(); } }; })), { derecha: true }); } } }, [UI.icono('filter')]),
      esLib ? h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Opciones de la libreta', 'data-f': 1, on: { click: function (e) { V.menuLibreta(e.currentTarget, filtroAct.slice(8)); } } }, [UI.icono('more')]) : null,
      filtroAct === 'papelera' || filtroAct === 'archivo' ? null : h('button', { type: 'button', cls: 'btn prim', 'aria-label': 'Nueva nota', 'data-f': 1, on: { click: function () { App.nuevaNota(); } } }, [UI.icono('plus'), h('span', { cls: 'ocultar-m', txt: 'Nota' })]),
      filtroAct === 'papelera' || filtroAct === 'archivo' ? null : h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Nueva nota desde plantilla', title: 'Plantillas', 'data-f': 1, on: { click: function (e) { V.menuNueva(e.currentTarget); } } }, [UI.icono('copy')])]);
    el.buscar = h('input', { type: 'search', cls: 'campo', placeholder: 'Filtrar notas… (tag:, antes:, es:fijada)', 'aria-label': 'Filtrar notas', value: q, 'data-f': 1 });
    el.buscar.addEventListener('input', function () { q = el.buscar.value; pintarLista(); });
    el.lista = h('ul', { role: 'list', 'aria-label': 'Notas: ' + V.titulo(filtroAct) });
    var plista = h('section', { cls: 'p-lista', 'aria-label': 'Lista de notas' }, [cab, h('div', { cls: 'barra-add' }, [el.buscar]), h('div', { cls: 'cuerpo-scroll' }, [el.lista])]);
    el.detalle = h('section', { cls: 'p-detalle', 'aria-label': 'Editor de nota' });
    el.dos = h('div', { cls: 'dos' }, [plista, el.detalle]); cont.appendChild(el.dos);
    pintarLista(); editorAbierto = null;
    if (sel && sel.tipo === 'nota' && S().get('notas', sel.id)) V.abrir('nota', sel.id); else vacio();
  };
  function vacio() { editorAbierto = null; if (!el.detalle) return; el.detalle.textContent = ''; el.dos && el.dos.classList.remove('con-detalle'); el.detalle.appendChild(h('div', { cls: 'vacio', style: 'margin:auto' }, [h('b', { txt: 'Selecciona o crea una nota' }), 'Escribe en Markdown o usa la barra de formato. Enlaza notas con [[Título]].'])); }
  V.abrir = function (tipo, id) {
    if (tipo !== 'nota' || !el.detalle) return;
    var n = S().get('notas', id); if (!n) return vacio();
    if (editorAbierto && editorAbierto !== id) G.Editor.cerrar();
    editorAbierto = id; el.detalle.textContent = ''; G.Editor.abrir(id, el.detalle, { atras: function () { G.App.cerrarDetalle(); } });
    el.dos.classList.add('con-detalle');
    el.lista.querySelectorAll('.fila-n').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.id === id)); });
  };
  V.cerrarDetalle = function () { if (G.Editor) G.Editor.cerrar(); vacio(); if (el.lista) el.lista.querySelectorAll('.fila-n').forEach(function (b) { b.setAttribute('aria-selected', 'false'); }); };
  V.salir = function () { if (G.Editor) G.Editor.cerrar(); editorAbierto = null; };
  V.actualizar = function (evs) {
    if (!el.lista || !el.lista.isConnected) return G.App.render(true);
    if (evs.some(function (e) { return ['notas', 'libretas'].indexOf(e.col) >= 0 || (filtroAct === 'papelera' && e.col === 'tareas'); })) {
      var f = doc.activeElement, id = f && f.closest && f.closest('.fila-n') ? f.closest('.fila-n').dataset.id : null; pintarLista(); if (id) { var b = el.lista.querySelector('.fila-n[data-id="' + id + '"]'); if (b) b.focus(); }
    }
    if (editorAbierto) {
      var n = S().get('notas', editorAbierto);
      if (!n || n.papelera) { G.App.cerrarDetalle(); return; }
      evs.forEach(function (e) { if (e.col === 'notas' && e.id === editorAbierto) G.Editor.alExterno(e); });
    }
  };
  V.purgarPapelera = function () {
    var lim = Date.now() - Cfg.pref.papeleraDias * 86400000, n = 0;
    S().lista('notas', function (x) { return x.papelera && x.papelera < lim; }).forEach(function (x) { S().borrar('notas', x.id); n++; });
    S().lista('tareas', function (x) { return x.papelera && x.papelera < lim; }).forEach(function (x) { S().borrar('tareas', x.id); n++; });
    return n;
  };
  G.App.vistas.notas = V;
})(window);
