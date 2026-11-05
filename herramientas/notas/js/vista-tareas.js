/* Vistas de tareas: Bandeja, Hoy, Proximos, Prioridad, Completadas, Listas. Fila de tarea, captura rapida en linea y panel de detalle. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, Mo = G.Modelo, R = G.Repeticion, T = G.Tareas, NL = G.NL, U = G.Util, Cfg = G.Config;
  var V = G.VistaTareas = {}, S = function () { return G.App.store; };
  var el = {}, filtroAct = '', detalleId = null, panelDlg = null;

  var TITULOS = { bandeja: 'Bandeja', hoy: 'Hoy', proximos: 'Próximos 7 días', prioridad: 'Con prioridad', completadas: 'Completadas', todas: 'Todas las tareas' };
  V.titulo = function (f) {
    var p = String(f || 'hoy').split(':'); if (p[0] === 'lista') { var l = S().get('listas', p[1]); return l ? l.nombre : 'Lista'; }
    return TITULOS[p[0]] || 'Tareas';
  };

  /* ---------- acciones ---------- */
  V.completar = function (id) {
    var t = S().get('tareas', id); if (!t) return; var snap = U.clon(t), t0 = Date.now();
    if (t.estado === 'hecha') { T.reabrir(id); UI.anunciar('Tarea reabierta'); return; }
    var r = T.completar(id);
    if (Cfg.disp.vibracion && G.navigator.vibrate) G.navigator.vibrate(12);
    UI.anunciar('Tarea completada: ' + t.titulo);
    UI.aviso(r && r.siguiente ? 'Hecha. Próxima: ' + F.etiqueta(r.siguiente) : 'Tarea completada', { acciones: [{ txt: 'Deshacer', fn: function () {
      T.editar(id, { estado: snap.estado, hecha: snap.hecha, fecha: snap.fecha, rep: snap.rep, columna: snap.columna });
      S().lista('hechos', function (x) { return x.tarea === id && x.ts >= t0; }).forEach(function (x) { S().borrar('hechos', x.id); });
      T.hijos(id).forEach(function (c) { var o = snap.estado; if (c.estado === 'hecha' && c.hecha >= t0) T.editar(c.id, { estado: 'pendiente', hecha: 0 }); });
    } }] });
  };
  V.aplazar = function (id, modo) {
    var t = S().get('tareas', id); if (!t) return; var antes = t.fecha, h0 = t.hora, f = T.aplazar(id, modo);
    UI.aviso('Aplazada a ' + F.etiqueta(f).toLowerCase(), { acciones: [{ txt: 'Deshacer', fn: function () { T.editar(id, { fecha: antes, hora: h0 }); } }] });
  };
  V.eliminar = function (id) {
    var t = S().get('tareas', id); if (!t) return; T.papelera(id); if (G.App.sel && G.App.sel.id === id) G.App.cerrarDetalle();
    UI.aviso('Tarea a la papelera', { acciones: [{ txt: 'Deshacer', fn: function () { T.restaurar(id); } }] });
  };
  V.crearDesdeTexto = function (texto, ctx) {
    ctx = ctx || {}; var p = NL.parsear(texto), App = G.App, d = { titulo: p.titulo || texto.trim() };
    if (!d.titulo) return null;
    if (p.fecha) d.fecha = p.fecha; if (p.hora) d.hora = p.hora; if (p.prioridad) d.prioridad = p.prioridad; if (p.etiquetas.length) d.etiquetas = p.etiquetas; if (p.rep) d.rep = p.rep; if (p.estimado) d.estimado = p.estimado;
    if (p.recordar != null) d.recordar = p.recordar; else if (p.hora && Cfg.pref.aviso != null) d.recordar = Cfg.pref.aviso;
    if (p.lista) { var l = S().lista('listas').filter(function (x) { return U.norm(x.nombre) === U.norm(p.lista) || U.norm(x.nombre).indexOf(U.norm(p.lista)) === 0; })[0]; if (l) d.lista = l.id; }
    if (d.lista == null && ctx.lista) d.lista = ctx.lista;
    if (!p.fecha && ctx.fecha) d.fecha = ctx.fecha;
    var t = T.crear(d); App.emitir('tareaCreada', t.id);
    if (d.recordar != null && d.hora && G.Recordatorios) G.Recordatorios.sugerirPermiso();
    return t;
  };
  V.nuevaLista = function () {
    UI.preguntar('Nueva lista', 'Nombre de la lista', '', function (v) { var l = S().poner('listas', Mo.lista({ nombre: v.trim(), orden: Date.now(), color: Mo.COLORES[1 + S().contar('listas') % 8] })); G.App.ir('tareas', 'lista:' + l.id); }, { txt: 'Crear' });
  };
  V.menuLista = function (ancla, id) {
    var l = S().get('listas', id); if (!l) return;
    UI.menu(ancla, [
      { txt: 'Renombrar…', icono: 'edit', fn: function () { UI.preguntar('Renombrar lista', 'Nombre', l.nombre, function (v) { S().set('listas', id, { nombre: v.trim() }); }); } },
      { txt: 'Color…', icono: 'sun', fn: function () { V.elegirColor(l.color, function (c) { S().set('listas', id, { color: c }); }); } },
      { txt: l.tipo === 'proyecto' ? 'Convertir en lista simple' : 'Marcar como proyecto', icono: 'folder', fn: function () { S().set('listas', id, { tipo: l.tipo === 'proyecto' ? 'lista' : 'proyecto' }); } },
      { txt: 'Compartir en tiempo real…', icono: 'share', fn: function () { G.Colab.compartir('lista', id); } },
      { txt: 'Copiar como texto', icono: 'copy', fn: function () { UI.copiar(V.textoLista(id)).then(function () { UI.aviso('Lista copiada como texto', { tipo: 'ok' }); }); } },
      { txt: 'Archivar lista', icono: 'archive', fn: function () { S().set('listas', id, { archivada: true }); G.App.ir('tareas', 'hoy'); } },
      { sep: 1 }, { txt: 'Eliminar lista…', icono: 'trash', peligro: 1, fn: function () {
        UI.confirmar('Eliminar lista', 'Las tareas de «' + l.nombre + '» pasarán a la Bandeja.', function () {
          S().lista('tareas', function (t) { return t.lista === id; }).forEach(function (t) { T.editar(t.id, { lista: '', columna: '' }); }); S().borrar('listas', id); G.App.ir('tareas', 'hoy');
        }, { txt: 'Eliminar', peligro: 1 });
      } }
    ], { derecha: true });
  };
  V.textoLista = function (id) {
    var l = S().get('listas', id), s = (l ? l.nombre : 'Bandeja') + '\n';
    S().lista('tareas', function (t) { return t.lista === id && !t.padre && !t.papelera; }).sort(function (a, b) { return a.orden - b.orden; }).forEach(function (t) {
      s += (t.estado === 'hecha' ? '[x] ' : '[ ] ') + t.titulo + (t.fecha ? ' (' + t.fecha + (t.hora ? ' ' + t.hora : '') + ')' : '') + '\n';
      T.hijos(t.id).forEach(function (c) { s += '    ' + (c.estado === 'hecha' ? '[x] ' : '[ ] ') + c.titulo + '\n'; });
    });
    return s;
  };
  V.elegirColor = function (actual, fn) {
    var cont = h('div', { cls: 'colores' }, Mo.COLORES.map(function (c, i) {
      return h('button', { type: 'button', cls: 'col-op', 'aria-label': c ? 'Color ' + i : 'Sin color', 'aria-pressed': String(c === actual), style: '--cc:' + (c ? 'var(--c' + i + ')' : 'transparent'), 'data-f': 1, on: { click: function () { fn(c ? 'var(--c' + i + ')' : ''); d.cerrar(); } } });
    }));
    var d = UI.dialogo({ titulo: 'Elegir color', ancho: 360, cuerpo: cont });
  };

  /* ---------- fila ---------- */
  function etiquetaFecha(t, hoy) {
    if (!t.fecha) return null;
    var venc = t.estado !== 'hecha' && t.fecha < hoy, esHoy = t.fecha === hoy, txt = F.etiqueta(t.fecha, hoy) + (t.hora ? ' ' + t.hora : '');
    return h('span', { cls: venc ? 'ven' : esHoy ? 'hoy' : '' }, [UI.icono('cal'), ' ' + txt]);
  }
  V.fila = function (t, o) {
    o = o || {}; var hoy = F.hoy(), hecha = t.estado === 'hecha', pr = Mo.PRIORIDADES[t.prioridad || 0], prog = Mo.progreso(S(), t), meta = [];
    var chk = h('button', { type: 'button', cls: 'chk', role: 'checkbox', 'aria-checked': String(hecha), 'aria-label': (hecha ? 'Reabrir: ' : 'Completar: ') + t.titulo, 'data-p': t.prioridad || 0, 'data-f': 1, on: { click: function (e) { e.stopPropagation(); V.completar(t.id); } } }, [UI.icono('check')]);
    var f = etiquetaFecha(t, hoy); if (f) meta.push(f);
    if (t.rep) meta.push(h('span', { title: R.describir(t.rep) }, [UI.icono('repeat'), ' ', R.describir(t.rep).replace(/^Cada /, 'c/')]));
    if (t.prioridad) meta.push(h('span', { cls: 'prio-t', 'data-p': t.prioridad, txt: pr.nombre }));
    if (prog.total) meta.push(h('span', { txt: prog.hechas + '/' + prog.total + ' subtareas' }));
    if (o.lista !== false && t.lista) { var l = S().get('listas', t.lista); if (l) meta.push(h('span', { txt: '# ' + l.nombre })); }
    (t.etiquetas || []).slice(0, 3).forEach(function (e) { meta.push(h('span', { txt: '#' + e })); });
    var tg = T.tiempo(t.id); if (t.estimado || tg) meta.push(h('span', {}, [UI.icono('clock'), ' ' + (tg ? UI.fmtDur(tg) : '') + (t.estimado ? (tg ? ' / ' : '') + UI.fmtDur(t.estimado) : '')]));
    if (t.recordar != null && t.fecha && t.hora) meta.push(h('span', { title: 'Recordatorio' }, [UI.icono('bell')]));
    var cuerpo = h('button', { type: 'button', cls: 't-cuerpo', 'data-f': 1, on: { click: function () { G.App.abrir('tarea', t.id); } } }, [h('span', { cls: 't-tit', txt: t.titulo || 'Sin título' }), meta.length ? h('span', { cls: 't-meta' }, meta) : null]);
    var li = h('li', { cls: 'fila-t' + (hecha ? ' hecha' : ''), 'data-id': t.id, role: 'listitem', 'aria-selected': String(!!(G.App.sel && G.App.sel.id === t.id)) }, [chk, cuerpo]);
    if (Cfg.disp.gestos && !hecha) UI.deslizable(li, function () { V.completar(t.id); }, function () { V.aplazar(t.id, 'manana'); });
    li.addEventListener('contextmenu', function (e) { e.preventDefault(); V.menuTarea({ x: e.clientX, y: e.clientY }, t.id); });
    return li;
  };
  V.menuTarea = function (ancla, id) {
    var t = S().get('tareas', id); if (!t) return;
    UI.menu(ancla, [
      { txt: t.estado === 'hecha' ? 'Reabrir' : 'Completar', icono: 'check', fn: function () { V.completar(id); } },
      { txt: 'Abrir', icono: 'edit', fn: function () { G.App.abrir('tarea', id); } },
      { titulo: 'Aplazar' }, { txt: 'Mañana', icono: 'cal', fn: function () { V.aplazar(id, 'manana'); } }, { txt: 'Próxima semana', icono: 'cal', fn: function () { V.aplazar(id, 'semana'); } },
      { txt: 'Hoy', icono: 'star', fn: function () { T.editar(id, { fecha: F.hoy() }); } },
      { sep: 1 }, { txt: 'Enfocar ahora', icono: 'timer', fn: function () { G.VistaEnfoque.iniciarCon(id); } },
      { txt: 'Duplicar', icono: 'copy', fn: function () { var c = U.clon(t); ['id', '_m', 'estado', 'hecha'].forEach(function (k) { delete c[k]; }); c.titulo += ' (copia)'; T.crear(c); } },
      { txt: 'Eliminar', icono: 'trash', peligro: 1, fn: function () { V.eliminar(id); } }
    ]);
  };

  /* ---------- lista ---------- */
  function grupos(items, filtro) {
    var hoy = F.hoy(), k = filtro.split(':')[0];
    if (k === 'hoy') { var v = items.filter(function (t) { return t.fecha < hoy; }), q = items.filter(function (t) { return t.fecha >= hoy; }); return [['Vencidas', v], ['Hoy', q]].filter(function (g) { return g[1].length; }); }
    if (k === 'proximos') { var m = {}, o = []; items.forEach(function (t) { (m[t.fecha] = m[t.fecha] || (o.push(t.fecha), [])).push(t); }); return o.sort().map(function (f) { return [F.etiqueta(f, hoy) + ' · ' + F.partes(f)[2] + ' ' + F.nombreMes(F.partes(f)[1], true), m[f]]; }); }
    if (k === 'completadas') { var m2 = {}, o2 = []; items.forEach(function (t) { var d = new Date(t.hecha || 0), f = F.fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()); (m2[f] = m2[f] || (o2.push(f), [])).push(t); }); return o2.map(function (f) { return [F.etiqueta(f, hoy), m2[f]]; }); }
    return [['', items]];
  }
  function pintarLista() {
    var items = T.consulta(filtroAct), ul = el.lista; ul.textContent = '';
    var hechasRecurrentes = [];
    if (filtroAct === 'completadas') hechasRecurrentes = S().lista('hechos').sort(function (a, b) { return b.ts - a.ts; }).filter(function (x) { var t = S().get('tareas', x.tarea); return t && t.estado !== 'hecha' && !t.papelera; }).slice(0, 40);
    if (!items.length && !hechasRecurrentes.length) {
      var msg = { hoy: ['Nada para hoy', 'Escribe arriba una tarea, por ejemplo «llamar al banco mañana 10am #finanzas».'], bandeja: ['Bandeja vacía', 'Las tareas sin lista caen aquí.'], proximos: ['Sin tareas próximas', 'Ninguna tarea con fecha en los próximos 7 días.'], prioridad: ['Sin prioridades altas', 'Marca tareas como Alta o Urgente para verlas aquí.'], completadas: ['Aún no hay tareas completadas', ''] }[filtroAct.split(':')[0]] || ['Lista vacía', 'Añade la primera tarea arriba.'];
      ul.appendChild(h('li', { cls: 'vacio', role: 'presentation' }, [h('b', { txt: msg[0] }), msg[1]])); return;
    }
    var gs = grupos(items, filtroAct), n = 0, LIM = 200;
    gs.forEach(function (g) {
      if (g[0]) ul.appendChild(h('li', { cls: 'grupo-t', role: 'presentation' }, [h('span', { txt: g[0] }), h('span', { txt: g[1].length })]));
      g[1].forEach(function (t) { if (n++ < LIM) ul.appendChild(V.fila(t, { lista: filtroAct.indexOf('lista:') !== 0 })); });
    });
    if (n > LIM) ul.appendChild(h('li', { cls: 'vacio' }, [h('button', { type: 'button', cls: 'btn', txt: 'Mostrar ' + (n - LIM) + ' más', 'data-f': 1, on: { click: function () { LIM = 1e9; pintarLista(); } } })]));
    if (hechasRecurrentes.length) {
      ul.appendChild(h('li', { cls: 'grupo-t', role: 'presentation' }, [h('span', { txt: 'Repeticiones completadas' })]));
      hechasRecurrentes.forEach(function (x) { ul.appendChild(h('li', { cls: 'fila-t hecha', role: 'listitem' }, [h('span', { cls: 'chk', 'aria-hidden': 'true', 'aria-checked': 'true', 'data-p': 0, style: 'background:var(--ok);border-color:var(--ok);color:#fff' }, [UI.icono('check')]), h('div', { cls: 't-cuerpo' }, [h('span', { cls: 't-tit', txt: x.titulo }), h('span', { cls: 't-meta', txt: UI.fmtRel(x.ts) })])])); });
    }
  }

  /* ---------- barra de captura en linea ---------- */
  function pintarPreview(txt) {
    el.prev.textContent = ''; if (!txt.trim()) return;
    var p = NL.parsear(txt), chips = [];
    if (p.fecha) chips.push('📅 ' + F.etiqueta(p.fecha)); if (p.hora) chips.push('🕒 ' + p.hora); if (p.rep) chips.push('🔁 ' + R.describir(p.rep)); if (p.prioridad) chips.push('⚑ ' + Mo.PRIORIDADES[p.prioridad].nombre);
    p.etiquetas.forEach(function (e) { chips.push('#' + e); }); if (p.lista) chips.push('@' + p.lista); if (p.estimado) chips.push('⏱ ' + UI.fmtDur(p.estimado)); if (p.recordar != null) chips.push('🔔 ' + p.recordar + ' min antes');
    chips.forEach(function (c) { el.prev.appendChild(h('span', { cls: 'chip', txt: c })); });
  }

  /* ---------- montaje ---------- */
  V.montar = function (cont, filtro, sel) {
    filtroAct = filtro || 'hoy'; var App = G.App, esLista = filtroAct.indexOf('lista:') === 0, l = esLista ? S().get('listas', filtroAct.slice(6)) : null;
    if (esLista && !l) { App.ir('tareas', 'hoy', null, { sinHistorial: true }); return; }
    var ord = Cfg.pref.ordenTareas;
    el.titulo = h('h1', { txt: V.titulo(filtroAct) });
    var btnMenu = h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { App.alternarMenu(true); } } }, [UI.icono('menu')]);
    var btnOrden = h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Ordenar y filtrar', title: 'Ordenar', 'data-f': 1, on: { click: function (e) {
      UI.menu(e.currentTarget, [{ titulo: 'Ordenar por' }].concat([['fecha', 'Fecha'], ['prioridad', 'Prioridad'], ['titulo', 'Título'], ['manual', 'Manual'], ['creada', 'Más recientes']].map(function (x) { return { txt: x[1], marca: Cfg.pref.ordenTareas === x[0], fn: function () { Cfg.setPref('ordenTareas', x[0]); pintarLista(); } }; })).concat(esLista ? [{ sep: 1 }, { txt: Cfg.pref.ocultarHechas ? 'Mostrar completadas' : 'Ocultar completadas', fn: function () { Cfg.setPref('ocultarHechas', !Cfg.pref.ocultarHechas); pintarLista(); } }] : []), { derecha: true });
    } } }, [UI.icono('filter')]);
    var btnMas = esLista ? h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Opciones de la lista', 'data-f': 1, on: { click: function (e) { V.menuLista(e.currentTarget, l.id); } } }, [UI.icono('more')]) : null;
    if (filtroAct === 'completadas') btnMas = h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Opciones', 'data-f': 1, on: { click: function (e) { UI.menu(e.currentTarget, [{ txt: 'Borrar tareas completadas', icono: 'trash', peligro: 1, fn: function () { UI.confirmar('Borrar completadas', 'Se enviarán a la papelera todas las tareas completadas.', function () { T.consulta('completadas').forEach(function (t) { T.papelera(t.id); }); }, { txt: 'Borrar', peligro: 1 }); } }], { derecha: true }); } } }, [UI.icono('more')]);
    var cab = h('div', { cls: 'cab' }, [btnMenu, el.titulo, btnOrden, btnMas]);
    el.input = h('input', { type: 'text', cls: 'campo', placeholder: 'Añadir tarea… «pagar luz mañana 6pm #hogar !alta»', 'aria-label': 'Añadir tarea con lenguaje natural', autocomplete: 'off', enterkeyhint: 'done', 'data-f': 1 });
    el.prev = h('div', { cls: 'preview-nl', 'aria-live': 'off' });
    var mic = G.Captura && G.Captura.hayVoz() ? h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Dictar tarea', 'data-f': 1, on: { click: function () { G.Captura.dictar(function (t) { el.input.value = (el.input.value + ' ' + t).trim(); pintarPreview(el.input.value); el.input.focus(); }); } } }, [UI.icono('mic')]) : null;
    var add = h('form', { cls: 'barra-add', on: { submit: function (e) {
      e.preventDefault(); var t = el.input.value; if (!t.trim()) return;
      var r = V.crearDesdeTexto(t, { lista: esLista ? filtroAct.slice(6) : '', fecha: filtroAct === 'hoy' ? F.hoy() : '' }); el.input.value = ''; pintarPreview(''); if (r) UI.anunciar('Tarea añadida: ' + r.titulo); el.input.focus();
    } } }, [el.input, mic, h('button', { type: 'submit', cls: 'btn prim', 'aria-label': 'Añadir', 'data-f': 1 }, [UI.icono('plus')])]);
    el.input.addEventListener('input', function () { pintarPreview(el.input.value); });
    el.lista = h('ul', { cls: 'lista-t', role: 'list', 'aria-label': 'Tareas: ' + V.titulo(filtroAct) });
    var plista = h('section', { cls: 'p-lista', 'aria-label': 'Lista de tareas' }, [cab, filtroAct === 'completadas' ? null : add, filtroAct === 'completadas' ? null : el.prev, h('div', { cls: 'cuerpo-scroll' }, [el.lista])]);
    el.detalle = h('section', { cls: 'p-detalle', 'aria-label': 'Detalle de tarea' });
    el.dos = h('div', { cls: 'dos' }, [plista, el.detalle]); cont.appendChild(el.dos);
    pintarLista(); detalleId = null;
    if (sel && sel.tipo === 'tarea') V.abrir('tarea', sel.id); else pintarDetalleVacio();
  };
  function pintarDetalleVacio() {
    el.detalle.textContent = ''; el.dos.classList.remove('con-detalle'); detalleId = null;
    el.detalle.appendChild(h('div', { cls: 'vacio', style: 'margin:auto' }, [h('b', { txt: 'Selecciona una tarea' }), 'o escribe una nueva arriba.']));
  }
  V.abrir = function (tipo, id) {
    if (tipo !== 'tarea' || !el.detalle) return; var t = S().get('tareas', id); if (!t) return pintarDetalleVacio();
    detalleId = id; el.detalle.textContent = ''; el.detalle.appendChild(V.detalle(id, { atras: function () { G.App.cerrarDetalle(); } })); el.dos.classList.add('con-detalle');
    el.lista.querySelectorAll('.fila-t').forEach(function (li) { li.setAttribute('aria-selected', String(li.dataset.id === id)); });
  };
  V.cerrarDetalle = function () { if (el.detalle) pintarDetalleVacio(); el.lista && el.lista.querySelectorAll('.fila-t').forEach(function (li) { li.setAttribute('aria-selected', 'false'); }); };
  V.salir = function () { detalleId = null; };
  V.actualizar = function (evs) {
    if (!el.lista || !el.lista.isConnected) return G.App.render(true);
    var tocaTareas = evs.some(function (e) { return ['tareas', 'listas', 'sesiones', 'hechos'].indexOf(e.col) >= 0; });
    if (tocaTareas) {
      var activo = doc.activeElement, enLista = activo && el.lista.contains(activo), idFoco = enLista ? (activo.closest('.fila-t') || {}).dataset : null, clase = enLista ? activo.className : '';
      pintarLista();
      if (idFoco) { var f = el.lista.querySelector('.fila-t[data-id="' + idFoco.id + '"] .' + clase.split(' ')[0]); if (f) f.focus(); }
    }
    if (detalleId) {
      var t = S().get('tareas', detalleId);
      if (!t || t.papelera) { G.App.cerrarDetalle(); return; }
      if (evs.some(function (e) { return e.col === 'tareas' && (e.id === detalleId || (e.rec && e.rec.padre === detalleId)) || e.col === 'sesiones'; }) && !(doc.activeElement && el.detalle.contains(doc.activeElement) && /INPUT|TEXTAREA/.test(doc.activeElement.tagName))) { var sc = el.detalle.querySelector('.det'), y = sc ? sc.scrollTop : 0; el.detalle.textContent = ''; el.detalle.appendChild(V.detalle(detalleId, { atras: function () { G.App.cerrarDetalle(); } })); var n = el.detalle.querySelector('.det'); if (n) n.scrollTop = y; }
    }
  };

  /* ---------- panel lateral para vistas anchas ---------- */
  V.abrirPanel = function (id) {
    if (panelDlg) panelDlg.cerrar();
    var d = UI.dialogo({ titulo: 'Tarea', lateral: true, cuerpo: V.detalle(id, { sinTitulo: true }), alCerrar: function () { G.App.off('cambio', f); panelDlg = null; if (G.App.sel && G.App.sel.id === id) { G.App.sel = null; } } });
    panelDlg = d; d.cuerpo.style.padding = '0';
    var f = function (evs) { if (!panelDlg || panelDlg !== d) return; if (evs.some(function (e) { return e.col === 'tareas' && e.id === id; }) && !(doc.activeElement && d.cuerpo.contains(doc.activeElement) && /INPUT|TEXTAREA/.test(doc.activeElement.tagName))) { var t = S().get('tareas', id); if (!t || t.papelera) { d.cerrar(); return; } d.cuerpo.textContent = ''; d.cuerpo.appendChild(V.detalle(id, { sinTitulo: true })); } };
    G.App.on('cambio', f);
  };

  /* ---------- detalle ---------- */
  var DSEM = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  V.detalle = function (id, o) {
    o = o || {}; var t = S().get('tareas', id), App = G.App;
    function ed(p) { T.editar(id, p); }
    var tit = h('input', { type: 'text', cls: 'det-tit', value: t.titulo, 'aria-label': 'Título de la tarea', 'data-f': 1 });
    tit.addEventListener('input', U.debounce(function () { if (tit.value.trim()) ed({ titulo: tit.value }); }, 300)); tit.addEventListener('blur', function () { if (tit.value.trim() && tit.value !== S().get('tareas', id).titulo) ed({ titulo: tit.value }); });
    var notas = h('textarea', { cls: 'campo', rows: 3, placeholder: 'Notas, enlaces, detalles…', 'aria-label': 'Descripción', 'data-f': 1 }); notas.value = t.notas || '';
    notas.addEventListener('input', U.debounce(function () { ed({ notas: notas.value }); }, 400));
    var selLista = h('select', { cls: 'campo', 'data-f': 1 }, [h('option', { value: '', txt: 'Bandeja' })].concat(S().lista('listas').sort(function (a, b) { return a.orden - b.orden; }).map(function (l) { return h('option', { value: l.id, txt: l.nombre }); }))); selLista.value = t.lista || '';
    selLista.addEventListener('change', function () { ed({ lista: selLista.value, columna: '' }); });
    var fecha = h('input', { type: 'date', cls: 'campo', value: t.fecha || '', 'aria-label': 'Fecha', 'data-f': 1 }); fecha.addEventListener('change', function () { var p = { fecha: fecha.value }; if (!fecha.value) { p.hora = ''; p.rep = null; } ed(p); });
    var hora = h('input', { type: 'time', cls: 'campo', value: t.hora || '', 'aria-label': 'Hora', 'data-f': 1 }); hora.addEventListener('change', function () { var p = { hora: hora.value }; if (hora.value && !S().get('tareas', id).fecha) p.fecha = F.hoy(); if (hora.value && S().get('tareas', id).recordar == null) p.recordar = Cfg.pref.aviso; ed(p); });
    var rapidas = h('div', { cls: 'fila', style: 'margin-top:6px' }, [['Hoy', 0], ['Mañana', 1], ['En 1 semana', 7], ['Sin fecha', null]].map(function (x) { return h('button', { type: 'button', cls: 'btn pq', txt: x[0], 'data-f': 1, on: { click: function () { x[1] == null ? ed({ fecha: '', hora: '', rep: null }) : ed({ fecha: F.sumDias(F.hoy(), x[1]) }); } } }); }));
    var prio = h('div', { cls: 'seg', role: 'group', 'aria-label': 'Prioridad' }, Mo.PRIORIDADES.slice().reverse().map(function (p) { return h('button', { type: 'button', cls: 'btn', 'aria-pressed': String((t.prioridad || 0) === p.n), txt: p.nombre, 'data-f': 1, on: { click: function () { ed({ prioridad: p.n }); } } }); }));
    // repeticion
    var r = t.rep, tipo = h('select', { cls: 'campo', 'aria-label': 'Repetición', 'data-f': 1 }, [['', 'No se repite'], ['dia', 'Cada día'], ['semana', 'Cada semana'], ['mes', 'Cada mes'], ['anio', 'Cada año']].map(function (x) { return h('option', { value: x[0], txt: x[1] }); })); tipo.value = r ? r.tipo : '';
    function guardaRep(patch) { var cur = S().get('tareas', id).rep; var nuevo = patch === null ? null : Object.assign({}, cur || { tipo: 'dia', cada: 1, base: 'fecha' }, patch); ed({ rep: nuevo, fecha: S().get('tareas', id).fecha || F.hoy() }); }
    tipo.addEventListener('change', function () { tipo.value ? guardaRep({ tipo: tipo.value, dias: tipo.value === 'semana' ? [F.diaSemana(S().get('tareas', id).fecha || F.hoy())] : undefined, diaMes: undefined }) : guardaRep(null); });
    var repDet = h('div', { hidden: !r });
    if (r) {
      var cada = h('input', { type: 'number', min: 1, max: 99, cls: 'campo', value: r.cada || 1, 'aria-label': 'Repetir cada', style: 'width:80px;flex:none', 'data-f': 1 }); cada.addEventListener('change', function () { guardaRep({ cada: Math.max(1, +cada.value || 1) }); });
      var unidad = { dia: 'día(s)', semana: 'semana(s)', mes: 'mes(es)', anio: 'año(s)' }[r.tipo];
      repDet.appendChild(h('div', { cls: 'fila', style: 'margin-top:6px' }, [h('span', { txt: 'Cada' }), cada, h('span', { txt: unidad })]));
      if (r.tipo === 'semana') repDet.appendChild(h('div', { cls: 'dias-sem', role: 'group', 'aria-label': 'Días de la semana' }, [1, 2, 3, 4, 5, 6, 0].map(function (d) { var on = (r.dias || []).indexOf(d) >= 0; return h('button', { type: 'button', cls: 'btn pq', 'aria-pressed': String(on), 'aria-label': F.DIAS[d], txt: DSEM[d], 'data-f': 1, on: { click: function () { var ds = (S().get('tareas', id).rep.dias || []).slice(), i = ds.indexOf(d); i >= 0 ? ds.splice(i, 1) : ds.push(d); if (!ds.length) return; guardaRep({ dias: ds.sort() }); } } }); })));
      if (r.tipo === 'mes') { var dm = h('select', { cls: 'campo', 'aria-label': 'Día del mes', style: 'margin-top:6px', 'data-f': 1 }, [h('option', { value: '', txt: 'Mismo día del mes' }), h('option', { value: 'ultimo', txt: 'Último día del mes' })].concat(Array.apply(null, Array(31)).map(function (_, i) { return h('option', { value: i + 1, txt: 'Día ' + (i + 1) }); }))); dm.value = r.diaMes || ''; dm.addEventListener('change', function () { guardaRep({ diaMes: dm.value ? (dm.value === 'ultimo' ? 'ultimo' : +dm.value) : undefined }); }); repDet.appendChild(dm); }
      var base = h('select', { cls: 'campo', 'aria-label': 'Calcular desde', style: 'margin-top:6px', 'data-f': 1 }, [h('option', { value: 'fecha', txt: 'Desde la fecha de vencimiento' }), h('option', { value: 'completar', txt: 'Desde que la completo' })]); base.value = r.base || 'fecha'; base.addEventListener('change', function () { guardaRep({ base: base.value }); });
      var fin = h('input', { type: 'date', cls: 'campo', value: r.fin || '', 'aria-label': 'Repetir hasta', 'data-f': 1 }); fin.addEventListener('change', function () { guardaRep({ fin: fin.value || undefined }); });
      repDet.appendChild(base); repDet.appendChild(h('label', { cls: 'etq' }, ['Termina el (opcional)', fin])); repDet.appendChild(h('p', { cls: 'ayuda', txt: R.describir(r) }));
    }
    // recordatorio
    var rec = h('select', { cls: 'campo', 'aria-label': 'Recordatorio', 'data-f': 1 }, [[ '', 'Sin recordatorio'], ['0', 'A la hora'], ['5', '5 min antes'], ['10', '10 min antes'], ['15', '15 min antes'], ['30', '30 min antes'], ['60', '1 hora antes'], ['1440', '1 día antes']].map(function (x) { return h('option', { value: x[0], txt: x[1] }); })); rec.value = t.recordar == null ? '' : String(t.recordar);
    rec.addEventListener('change', function () { ed({ recordar: rec.value === '' ? null : +rec.value }); if (rec.value !== '') G.Recordatorios.sugerirPermiso(true); });
    // etiquetas
    var tg = h('div', { cls: 'ed-tags' }), tgIn = h('input', { type: 'text', placeholder: '#etiqueta', 'aria-label': 'Añadir etiqueta', 'data-f': 1 });
    function pintaTags() { tg.textContent = ''; (S().get('tareas', id).etiquetas || []).forEach(function (e) { tg.appendChild(h('span', { cls: 'chip' }, ['#' + e, h('button', { type: 'button', 'aria-label': 'Quitar etiqueta ' + e, style: 'border:0;background:none;color:inherit;padding:0 0 0 2px', on: { click: function () { ed({ etiquetas: S().get('tareas', id).etiquetas.filter(function (x) { return x !== e; }) }); pintaTags(); } } }, ['×'])])); }); tg.appendChild(tgIn); }
    tgIn.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ',') && tgIn.value.trim()) { e.preventDefault(); var v = tgIn.value.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-'); var cur = S().get('tareas', id).etiquetas || []; if (cur.indexOf(v) < 0) ed({ etiquetas: cur.concat(v) }); tgIn.value = ''; pintaTags(); tgIn.focus(); } });
    pintaTags();
    // subtareas
    var subs = h('div'), subIn = h('input', { type: 'text', cls: 'campo', placeholder: 'Añadir subtarea', 'aria-label': 'Nueva subtarea', 'data-f': 1 });
    T.hijos(id).forEach(function (c) {
      var ti = h('input', { type: 'text', value: c.titulo, 'aria-label': 'Subtarea', 'data-f': 1 }); ti.addEventListener('change', function () { T.editar(c.id, { titulo: ti.value }); });
      subs.appendChild(h('div', { cls: 'sub-t' + (c.estado === 'hecha' ? ' hecha' : '') }, [h('button', { type: 'button', cls: 'chk', role: 'checkbox', 'aria-checked': String(c.estado === 'hecha'), 'aria-label': 'Completar subtarea ' + c.titulo, 'data-p': 0, 'data-f': 1, on: { click: function () { T.alternar(c.id); } } }, [UI.icono('check')]), ti,
        h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Eliminar subtarea', 'data-f': 1, on: { click: function () { T.papelera(c.id); } } }, [UI.icono('x')])]));
    });
    subIn.addEventListener('keydown', function (e) { if (e.key === 'Enter' && subIn.value.trim()) { e.preventDefault(); var p = NL.parsear(subIn.value); T.crear({ titulo: p.titulo || subIn.value.trim(), padre: id, lista: S().get('tareas', id).lista, fecha: p.fecha, hora: p.hora, prioridad: p.prioridad, etiquetas: p.etiquetas, orden: Date.now() }); subIn.value = ''; setTimeout(function () { var x = doc.querySelector('.det input[aria-label="Nueva subtarea"]'); if (x) x.focus(); }, 30); } });
    // tiempo
    var est = h('input', { type: 'number', min: 0, step: 5, cls: 'campo', value: t.estimado || '', placeholder: 'min', 'aria-label': 'Estimación en minutos', 'data-f': 1 }); est.addEventListener('change', function () { ed({ estimado: Math.max(0, +est.value || 0) }); });
    var inicio = h('input', { type: 'date', cls: 'campo', value: t.inicio || '', 'aria-label': 'Fecha de inicio', 'data-f': 1 }); inicio.addEventListener('change', function () { ed({ inicio: inicio.value }); });
    var cr = T.crono.estado(), corriendo = cr && cr.tarea === id, tot = T.tiempo(id);
    var tiempoEl = h('div', { cls: 'bloque' }, [h('div', { cls: 'fila' }, [h('b', { txt: 'Tiempo registrado: ' + UI.fmtDur(tot) }), t.estimado ? h('span', { cls: 'chip g', txt: 'estimado ' + UI.fmtDur(t.estimado) }) : null]),
      h('div', { cls: 'fila', style: 'margin-top:8px' }, [
        h('button', { type: 'button', cls: 'btn ' + (corriendo ? 'peligro' : ''), 'data-f': 1, on: { click: function () { if (corriendo) { var m = T.crono.parar(); UI.aviso('Registrados ' + UI.fmtDur(m)); } else T.crono.iniciar(id); App.refrescar(); G.App.emitir('cambio', [{ col: 'sesiones', id: id, campos: [] }]); V.recargarDetalle(id); } } }, [UI.icono(corriendo ? 'pause' : 'play'), h('span', { txt: corriendo ? 'Detener cronómetro' : 'Cronómetro' })]),
        h('button', { type: 'button', cls: 'btn', txt: '+15 min', 'data-f': 1, on: { click: function () { T.registrarTiempo(id, 15, 'manual'); } } }),
        h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { G.VistaEnfoque.iniciarCon(id); } } }, [UI.icono('timer'), h('span', { txt: 'Pomodoro' })])])]);
    var hecha = t.estado === 'hecha';
    var cab = h('div', { cls: 'cab' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Volver', 'data-f': 1, on: { click: function () { o.atras ? o.atras() : null; } } }, [UI.icono('back')]), h('h1', { txt: 'Tarea' }),
      h('button', { type: 'button', cls: 'btn' + (hecha ? '' : ' prim'), 'data-f': 1, on: { click: function () { V.completar(id); } } }, [UI.icono('check'), h('span', { txt: hecha ? 'Reabrir' : 'Completar' })]),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Más acciones', 'data-f': 1, on: { click: function (e) { V.menuTarea(e.currentTarget, id); } } }, [UI.icono('more')])]);
    var cuerpo = h('div', { cls: 'det' }, [tit, h('label', { cls: 'etq' }, ['Descripción', notas]),
      h('div', { cls: 'rejilla' }, [h('label', { cls: 'etq' }, ['Lista', selLista]), h('label', { cls: 'etq' }, ['Fecha', fecha]), h('label', { cls: 'etq' }, ['Hora', hora])]), rapidas,
      h('div', { cls: 'etq', txt: 'Prioridad' }), prio,
      h('div', { cls: 'rejilla' }, [h('label', { cls: 'etq' }, ['Repetición', tipo, repDet]), h('label', { cls: 'etq' }, ['Recordatorio', rec])]),
      h('div', { cls: 'etq', txt: 'Etiquetas' }), tg,
      h('div', { cls: 'etq', txt: 'Subtareas' }), h('div', { cls: 'bloque' }, [subs, subIn]),
      h('div', { cls: 'rejilla' }, [h('label', { cls: 'etq' }, ['Estimación (min)', est]), h('label', { cls: 'etq' }, ['Inicio (línea de tiempo)', inicio])]), tiempoEl,
      h('p', { cls: 'ayuda', txt: 'Creada ' + new Date(t.creada).toLocaleDateString('es') + (t.hecha ? ' · Completada ' + new Date(t.hecha).toLocaleDateString('es') : '') })]);
    return h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1' }, [o.sinTitulo ? null : cab, cuerpo]);
  };
  V.recargarDetalle = function (id) { if (detalleId === id && el.detalle && el.detalle.isConnected) { el.detalle.textContent = ''; el.detalle.appendChild(V.detalle(id, { atras: function () { G.App.cerrarDetalle(); } })); } };
  G.App.vistas.tareas = V;
})(window);
