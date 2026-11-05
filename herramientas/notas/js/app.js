/* Nucleo de la aplicacion: estado, navegacion, panel lateral, pestanas, ciclo de refresco. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, Mo = G.Modelo, U = G.Util;
  var App = G.App = { store: null, vista: 'tareas', filtro: 'hoy', sel: null, vistas: {}, actual: null, oyentes: [], titulos: null };

  var VISTAS = [
    { v: 'tablero', t: 'Tablero', i: 'board' }, { v: 'calendario', t: 'Calendario', i: 'cal' }, { v: 'linea', t: 'Línea de tiempo', i: 'gantt' },
    { v: 'habitos', t: 'Hábitos', i: 'habit' }, { v: 'enfoque', t: 'Enfoque', i: 'timer' }, { v: 'stats', t: 'Estadísticas', i: 'chart' }
  ];
  App.CICLO = [['tareas', 'hoy'], ['tareas', 'bandeja'], ['notas', 'todas'], ['tablero', ''], ['calendario', ''], ['linea', ''], ['habitos', ''], ['enfoque', ''], ['stats', ''], ['ajustes', '']];

  App.on = function (ev, fn) { App.oyentes.push([ev, fn]); };
  App.off = function (ev, fn) { App.oyentes = App.oyentes.filter(function (o) { return !(o[0] === ev && o[1] === fn); }); };
  App.emitir = function (ev, a, b) { App.oyentes.forEach(function (o) { if (o[0] === ev) try { o[1](a, b); } catch (e) { console.error(e); } }); };

  /* ---------- contexto Markdown ---------- */
  App.indiceTitulos = function () {
    if (!App.titulos) { var m = {}; App.store.lista('notas', function (n) { return !n.papelera; }).forEach(function (n) { var k = U.norm(n.titulo || '').trim(); if (k && !m[k]) m[k] = n.id; }); App.titulos = m; }
    return App.titulos;
  };
  App.mdCtx = {
    adj: function (id) { var a = App.store.get('adjuntos', id); return a ? a.url : ''; },
    nota: function (t) { return App.indiceTitulos()[U.norm(t).trim()] || ''; }
  };
  App.nombreContenedor = function (tipo, id) { var r = App.store.get(tipo === 'tarea' ? 'listas' : 'libretas', id); return r ? r.nombre : ''; };

  /* ---------- navegacion ---------- */
  function estadoActual() { return { v: App.vista, f: App.filtro, s: App.sel }; }
  function guardarUI() { try { G.localStorage.setItem('notas_ui', JSON.stringify({ v: App.vista, f: App.filtro })); } catch (e) {} }
  App.ir = function (vista, filtro, sel, o) {
    o = o || {};
    if (App.actual && App.actual.salir) App.actual.salir();
    var mismo = vista === App.vista && (filtro || '') === App.filtro;
    App.vista = vista; App.filtro = filtro || ''; App.sel = sel || null;
    if (!o.sinHistorial) { try { G.history.pushState(estadoActual(), '', '#' + vista + (App.filtro ? ':' + App.filtro : '')); } catch (e) {} }
    guardarUI(); if (doc.body.classList.contains('menu-abierto')) App.alternarMenu(false); App.render(mismo && o.suave);
  };
  App.abrir = function (tipo, id) {
    doc.body.classList.add('con-sel');
    var vista = tipo === 'nota' ? 'notas' : 'tareas';
    if (App.vista !== vista && App.vista !== 'buscar' && App.vista !== 'tablero' && App.vista !== 'calendario' && App.vista !== 'linea' && App.vista !== 'stats' && App.vista !== 'enfoque') {
      var f = tipo === 'nota' ? 'todas' : 'hoy'; App.ir(vista, f, { tipo: tipo, id: id }); return;
    }
    App.sel = { tipo: tipo, id: id };
    try { G.history.pushState(estadoActual(), '', G.location.hash); } catch (e) {}
    App.emitir('sel', App.sel);
    if (App.actual && App.actual.abrir) App.actual.abrir(tipo, id); else App.detalleLateral(tipo, id);
  };
  App.cerrarDetalle = function () {
    if (!App.sel) return; App.sel = null; doc.body.classList.remove('con-sel'); App.emitir('sel', null);
    if (App.actual && App.actual.cerrarDetalle) App.actual.cerrarDetalle();
  };
  G.addEventListener('popstate', function (e) {
    var s = e.state;
    if (s && s.v) {
      if (s.v === App.vista && s.f === App.filtro) { if (!s.s) App.cerrarDetalle(); else if (!App.sel) App.abrir(s.s.tipo, s.s.id); return; }
      if (UI.hayDialogo()) UI.cerrarDialogo();
      App.vista = s.v; App.filtro = s.f; App.sel = s.s; App.render();
    } else if (App.sel) App.cerrarDetalle();
  });
  /* detalle como panel lateral deslizable en vistas anchas (tablero, calendario...) */
  App.detalleLateral = function (tipo, id) {
    if (tipo === 'tarea' && G.VistaTareas) G.VistaTareas.abrirPanel(id);
    else if (tipo === 'nota') App.ir('notas', 'todas', { tipo: 'nota', id: id });
  };

  /* ---------- refresco ---------- */
  var pendiente = 0, eventos = [];
  function hayCambioReal(ev) { return ev.col !== 'cambios'; }
  App.refrescar = function () { if (!pendiente) pendiente = G.requestAnimationFrame(function () { pendiente = 0; var ev = eventos; eventos = []; App.alCambio(ev); }); };
  App.alCambio = function (evs) {
    if (evs.some(function (e) { return e.col === 'notas' && (e.campos.indexOf('titulo') >= 0 || e.campos.indexOf('papelera') >= 0 || e.campos.indexOf('_del') >= 0); })) App.titulos = null;
    App.lateral();
    var a = App.actual; if (!a) return;
    try { if (a.actualizar) a.actualizar(evs); else if (a.montar) App.render(true); } catch (e) { console.error(e); }
    App.emitir('cambio', evs);
  };
  App.alEvento = function (ev) { if (hayCambioReal(ev)) { eventos.push(ev); App.refrescar(); } };

  App.render = function (suave) {
    var cont = doc.getElementById('contenido'), mod = App.vistas[App.vista] || App.vistas.tareas;
    if (App.actual && App.actual !== mod && App.actual.salir) App.actual.salir();
    cont.textContent = ''; App.actual = mod; doc.body.dataset.vista = App.vista;
    doc.body.classList.toggle('con-sel', !!App.sel);
    mod.montar(cont, App.filtro, App.sel);
    App.lateral(true); App.pestanas();
    doc.title = (mod.titulo ? mod.titulo(App.filtro) + ' · ' : '') + 'Notas y Tareas';
    if (!suave) { cont.scrollTop = 0; }
  };

  /* ---------- lateral ---------- */
  var firmaLat = '';
  function ni(vista, filtro, texto, icono, n, extra) {
    var act = App.vista === vista && (App.filtro || '') === (filtro || '');
    var b = h('button', { type: 'button', cls: 'nav', 'data-k': vista + ':' + filtro, 'data-f': 1, 'aria-current': act ? 'page' : null, on: { click: function () { App.ir(vista, filtro); } } },
      [extra || UI.icono(icono), h('span', { cls: 'txt', txt: texto }), n ? h('span', { cls: 'n', txt: n }) : null]);
    return b;
  }
  App.lateral = function (forzar) {
    var S = App.store, T = G.Tareas, hoy = F.hoy();
    var listas = S.lista('listas', function (l) { return !l.archivada; }).sort(function (a, b) { return a.orden - b.orden; });
    var libretas = S.lista('libretas').sort(function (a, b) { return a.orden - b.orden; });
    var etiq = Mo.etiquetasDe(S), filtros = S.lista('filtros').sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    var nBand = T.contar('bandeja'), nHoy = T.contar('hoy'), nProx = T.contar('proximos'), nPri = T.contar('prioridad');
    var notasVivas = S.lista('notas', function (n) { return !n.papelera && !n.archivada; });
    var nTotal = notasVivas.length, nFij = notasVivas.filter(function (n) { return n.fijada; }).length, nArch = S.lista('notas', function (n) { return !n.papelera && n.archivada; }).length, nPap = S.lista('notas', function (n) { return n.papelera; }).length + S.lista('tareas', function (t) { return t.papelera && !t.padre; }).length;
    var porLista = {}; S.lista('tareas', function (t) { return !t.papelera && !t.padre && t.estado !== 'hecha'; }).forEach(function (t) { porLista[t.lista] = (porLista[t.lista] || 0) + 1; });
    var porLib = {}; notasVivas.forEach(function (n) { porLib[n.libreta] = (porLib[n.libreta] || 0) + 1; });
    var firma = [App.vista, App.filtro, nBand, nHoy, nProx, nPri, nTotal, nFij, nArch, nPap, JSON.stringify(listas.map(function (l) { return [l.id, l.nombre, l.color, porLista[l.id]]; })), JSON.stringify(libretas.map(function (l) { return [l.id, l.nombre, l.padre, porLib[l.id]]; })), JSON.stringify(etiq), JSON.stringify(filtros.map(function (f) { return [f.id, f.nombre]; })), G.Colab ? G.Colab.firma() : ''].join('|');
    if (!forzar && firma === firmaLat) return; firmaLat = firma;
    var cont = doc.getElementById('lateral'), enfocado = doc.activeElement && cont.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-k') : null;
    cont.textContent = '';
    var kids = [
      h('div', { cls: 'lat-tit' }, [h('span', { cls: 'logo' }, [UI.icono('check')]), h('span', { txt: 'Notas y Tareas' })]),
      h('button', { type: 'button', cls: 'nav', 'data-f': 1, 'data-k': 'buscar', on: { click: function () { G.Paleta.abrir(); } } }, [UI.icono('search'), h('span', { cls: 'txt', txt: 'Buscar o crear…' }), h('kbd', { txt: 'Ctrl K' })]),
      h('div', { cls: 'lat-sec', txt: 'Tareas' }),
      ni('tareas', 'bandeja', 'Bandeja', 'inbox', nBand || ''), ni('tareas', 'hoy', 'Hoy', 'star', nHoy || ''), ni('tareas', 'proximos', 'Próximos 7 días', 'cal', nProx || ''), ni('tareas', 'prioridad', 'Con prioridad', 'flag', nPri || ''), ni('tareas', 'completadas', 'Completadas', 'check', ''),
      h('div', { cls: 'lat-sec', txt: 'Vistas' })
    ].concat(VISTAS.map(function (x) { return ni(x.v, '', x.t, x.i, ''); }));
    kids.push(h('div', { cls: 'lat-sec' }, [h('span', { txt: 'Listas' }), h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Nueva lista', 'data-f': 1, on: { click: function () { G.VistaTareas.nuevaLista(); } } }, [UI.icono('plus')])]));
    listas.forEach(function (l) { kids.push(ni('tareas', 'lista:' + l.id, l.nombre, null, porLista[l.id] || '', h('span', { cls: 'punto', style: 'background:' + (l.color || 'var(--acento)') }))); });
    kids.push(h('div', { cls: 'lat-sec', txt: 'Notas' }), ni('notas', 'todas', 'Todas las notas', 'note', nTotal || ''), ni('notas', 'fijadas', 'Fijadas', 'pin', nFij || ''), ni('notas', 'archivo', 'Archivo', 'archive', nArch || ''), ni('notas', 'papelera', 'Papelera', 'trash', nPap || ''));
    kids.push(h('div', { cls: 'lat-sec' }, [h('span', { txt: 'Libretas' }), h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Nueva libreta', 'data-f': 1, on: { click: function () { G.VistaNotas.nuevaLibreta(''); } } }, [UI.icono('plus')])]));
    (function arbol(padre, nivel) {
      libretas.filter(function (l) { return (l.padre || '') === padre; }).forEach(function (l) {
        var b = ni('notas', 'libreta:' + l.id, l.nombre, 'folder', porLib[l.id] || ''); b.style.marginLeft = (nivel * 14) + 'px'; b.style.width = 'calc(100% - ' + (nivel * 14) + 'px)'; kids.push(b); if (nivel < 5) arbol(l.id, nivel + 1);
      });
    })('', 0);
    var tk = Object.keys(etiq);
    if (tk.length) {
      kids.push(h('div', { cls: 'lat-sec', txt: 'Etiquetas' }));
      (function nodo(n, nivel) {
        Object.keys(n.hijos).sort().forEach(function (k) {
          var x = n.hijos[k], b = h('button', { type: 'button', cls: 'nav', 'data-f': 1, 'data-k': 'tag:' + x.ruta, style: 'padding-left:' + (10 + nivel * 14) + 'px', 'aria-current': App.vista === 'buscar' && App.filtro === 'tag:' + x.ruta ? 'page' : null, on: { click: function () { App.ir('buscar', 'tag:' + x.ruta); } } }, [UI.icono('tag'), h('span', { cls: 'txt', txt: x.nombre }), h('span', { cls: 'n', txt: x.n })]);
          kids.push(b); nodo(x, nivel + 1);
        });
      })(Mo.arbolEtiquetas(etiq), 0);
    }
    if (filtros.length) {
      kids.push(h('div', { cls: 'lat-sec', txt: 'Filtros guardados' }));
      filtros.forEach(function (f) { kids.push(h('button', { type: 'button', cls: 'nav', 'data-f': 1, 'data-k': 'f:' + f.id, 'aria-current': App.vista === 'buscar' && App.filtro === f.q ? 'page' : null, on: { click: function () { App.ir('buscar', f.q); } } }, [UI.icono('filter'), h('span', { cls: 'txt', txt: f.nombre })])); });
    }
    kids.push(h('div', { cls: 'lat-pie' }));
    if (G.Colab && G.Colab.activo()) kids.push(G.Colab.indicador());
    kids.push(ni('ajustes', '', 'Ajustes y datos', 'gear', ''));
    if (G.Nube) { var ec = G.Nube.entradaLateral(); if (ec) kids.push(ec); }
    kids.forEach(function (k) { cont.appendChild(k); });
    if (enfocado) { var e = cont.querySelector('[data-k="' + enfocado.replace(/"/g, '\\"') + '"]'); if (e) e.focus(); }
  };

  /* ---------- pestanas moviles ---------- */
  App.pestanas = function () {
    var nav = doc.getElementById('pestanas'), v = App.vista;
    var t = [['tareas', 'hoy', 'Tareas', 'task'], ['notas', 'todas', 'Notas', 'note'], ['calendario', '', 'Calendario', 'cal'], ['enfoque', '', 'Enfoque', 'timer']];
    nav.textContent = '';
    t.forEach(function (x) {
      var act = x[0] === 'tareas' ? (v === 'tareas' || v === 'tablero') : x[0] === 'calendario' ? (v === 'calendario' || v === 'linea') : v === x[0];
      nav.appendChild(h('button', { type: 'button', 'data-f': 1, 'aria-current': act ? 'page' : null, on: { click: function () { App.ir(x[0], x[1]); } } }, [UI.icono(x[3]), h('span', { txt: x[2] })]));
    });
    nav.appendChild(h('button', { type: 'button', 'data-f': 1, 'aria-expanded': String(doc.body.classList.contains('menu-abierto')), on: { click: function () { App.alternarMenu(); } } }, [UI.icono('menu'), h('span', { txt: 'Menú' })]));
  };
  App.alternarMenu = function (v) {
    var b = doc.body, a = v == null ? !b.classList.contains('menu-abierto') : v; b.classList.toggle('menu-abierto', a);
    var velo = doc.getElementById('velo'); velo.hidden = !a; App.pestanas();
    if (a) { var p = doc.querySelector('#lateral .nav'); if (p && doc.activeElement) setTimeout(function () { p.focus(); }, 30); }
  };
  doc.addEventListener('click', function (e) { if (e.target.id === 'velo') App.alternarMenu(false); });

  /* ---------- creacion ---------- */
  App.nuevaNota = function (o) {
    o = o || {}; var f = App.filtro || '';
    if (App.vista === 'notas' && f.indexOf('libreta:') === 0 && o.libreta == null) o.libreta = f.slice(8);
    var n = Mo.nota(o); n = App.store.poner('notas', n); App.titulos = null;
    App.ir('notas', App.vista === 'notas' && f !== 'papelera' && f !== 'archivo' ? f : 'todas', { tipo: 'nota', id: n.id }); App.emitir('nuevaNota', n.id);
    return n;
  };
  App.nuevaTarea = function (o) {
    o = o || {}; var f = App.filtro || '';
    if (App.vista === 'tareas' && f.indexOf('lista:') === 0 && o.lista == null) o.lista = f.slice(6);
    if (App.vista === 'tareas' && f === 'hoy' && o.fecha == null) o.fecha = F.hoy();
    return G.Tareas.crear(o);
  };
  App.pregunta = UI.preguntar;
  App.esMovil = function () { return G.matchMedia('(max-width: 860px)').matches; };
})(window);
