/* Tablero Kanban: columnas personalizables por lista, arrastrar y soltar (raton y tactil) y menu "Mover a". */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, Mo = G.Modelo, T = G.Tareas, U = G.Util;
  var V = G.VistaTablero = {}, S = function () { return G.App.store; }, listaId = '', cont = null;

  V.titulo = function () { return 'Tablero'; };
  function lista() { return listaId ? S().get('listas', listaId) : null; }
  function columnas() { var l = lista(); return (l && l.columnas && l.columnas.length ? l.columnas : Mo.columnasPorDefecto()); }
  function tareasDe() { return S().lista('tareas', function (t) { return !t.papelera && !t.padre && t.lista === listaId; }); }
  function mover(id, colId, orden) {
    var t = S().get('tareas', id), cols = columnas(), ult = cols[cols.length - 1].id; if (!t) return;
    if (colId === ult && t.estado !== 'hecha') { G.VistaTareas.completar(id); if (orden != null) T.editar(id, { orden: orden }); return; }
    if (colId !== ult && t.estado === 'hecha') { T.editar(id, { estado: 'pendiente', hecha: 0 }); }
    T.editar(id, { columna: colId, orden: orden != null ? orden : t.orden });
  }
  function ordenEntre(cards, y, excluir) {
    var ids = Array.prototype.filter.call(cards.children, function (c) { return c.classList.contains('card-k') && c.dataset.id !== excluir; }), prev = null, sig = null;
    for (var i = 0; i < ids.length; i++) { var r = ids[i].getBoundingClientRect(); if (y < r.top + r.height / 2) { sig = ids[i]; break; } prev = ids[i]; }
    var a = prev ? S().get('tareas', prev.dataset.id).orden : null, b = sig ? S().get('tareas', sig.dataset.id).orden : null;
    if (a != null && b != null) return (a + b) / 2; if (a != null) return a + 1000; if (b != null) return b - 1000; return Date.now();
  }
  function tarjeta(t, col) {
    var hecha = t.estado === 'hecha', prog = Mo.progreso(S(), t), pr = Mo.PRIORIDADES[t.prioridad || 0], F = G.Fechas;
    var meta = []; if (t.fecha) meta.push(h('span', { cls: !hecha && t.fecha < F.hoy() ? 'ven' : '', txt: F.etiqueta(t.fecha) + (t.hora ? ' ' + t.hora : '') })); if (t.prioridad) meta.push(h('span', { cls: 'prio-t', 'data-p': t.prioridad, txt: pr.nombre })); if (prog.total) meta.push(h('span', { txt: prog.hechas + '/' + prog.total })); (t.etiquetas || []).slice(0, 2).forEach(function (e) { meta.push(h('span', { txt: '#' + e })); });
    var c = h('div', { cls: 'card-k' + (hecha ? ' hecha' : ''), 'data-id': t.id, role: 'listitem' }, [
      h('button', { type: 'button', cls: 'chk', role: 'checkbox', 'aria-checked': String(hecha), 'aria-label': (hecha ? 'Reabrir ' : 'Completar ') + t.titulo, 'data-p': t.prioridad || 0, 'data-f': 1, on: { click: function (e) { e.stopPropagation(); G.VistaTareas.completar(t.id); } } }, [UI.icono('check')]),
      h('button', { type: 'button', cls: 't-cuerpo', 'data-f': 1, on: { click: function () { G.App.abrir('tarea', t.id); } } }, [h('span', { cls: 't-tit', txt: t.titulo }), meta.length ? h('span', { cls: 't-meta' }, meta) : null]),
      h('button', { type: 'button', cls: 'btn ic-b', style: 'width:32px;min-height:32px', 'aria-label': 'Mover o más acciones: ' + t.titulo, 'data-f': 1, on: { click: function (e) {
        var cols = columnas(); UI.menu(e.currentTarget, [{ titulo: 'Mover a' }].concat(cols.map(function (cc) { return { txt: cc.nombre, icono: 'board', marca: T.columnaDe(t, lista()) === cc.id, fn: function () { mover(t.id, cc.id, Date.now()); } }; })).concat([{ sep: 1 }, { txt: 'Abrir', icono: 'edit', fn: function () { G.App.abrir('tarea', t.id); } }, { txt: 'Eliminar', icono: 'trash', peligro: 1, fn: function () { G.VistaTareas.eliminar(t.id); } }]), { derecha: true });
      } } }, [UI.icono('more')])]);
    UI.arrastrable(c, { selector: '.cards[data-drop]', datos: function () { return t.id; }, alSoltar: function (dest, id, ev) { mover(id, dest.dataset.col, ordenEntre(dest, ev.clientY, id)); } });
    return c;
  }
  function guardarCols(cols) { if (!listaId) { UI.aviso('Las columnas de la Bandeja no se pueden personalizar. Crea una lista para personalizarlas.'); return; } S().set('listas', listaId, { columnas: cols }); }
  function menuCol(ancla, i) {
    var cols = U.clon(columnas()), c = cols[i];
    UI.menu(ancla, [
      { txt: 'Renombrar…', icono: 'edit', fn: function () { UI.preguntar('Renombrar columna', 'Nombre', c.nombre, function (v) { cols[i].nombre = v.trim(); guardarCols(cols); }); } },
      i > 0 ? { txt: 'Mover a la izquierda', icono: 'back', fn: function () { cols.splice(i - 1, 0, cols.splice(i, 1)[0]); guardarCols(cols); } } : null,
      i < cols.length - 1 ? { txt: 'Mover a la derecha', icono: 'skip', fn: function () { cols.splice(i + 1, 0, cols.splice(i, 1)[0]); guardarCols(cols); } } : null,
      cols.length > 2 ? { txt: 'Eliminar columna', icono: 'trash', peligro: 1, fn: function () { UI.confirmar('Eliminar columna', 'Sus tareas pasarán a la primera columna.', function () { tareasDe().forEach(function (t) { if (t.columna === c.id) T.editar(t.id, { columna: '' }); }); cols.splice(i, 1); guardarCols(cols); }, { txt: 'Eliminar', peligro: 1 }); } } : null
    ], { derecha: true });
  }
  function pintar() {
    cont.textContent = ''; var cols = columnas(), ts = tareasDe(), l = lista(), porCol = {};
    cols.forEach(function (c) { porCol[c.id] = []; }); ts.forEach(function (t) { var id = T.columnaDe(t, l); (porCol[id] || porCol[cols[0].id]).push(t); });
    var tabl = h('div', { cls: 'tablero scroll-x arrastre-cont', role: 'list', 'aria-label': 'Columnas del tablero' });
    cols.forEach(function (c, i) {
      var items = porCol[c.id].sort(function (a, b) { return a.orden - b.orden; });
      var cards = h('div', { cls: 'cards', 'data-drop': 1, 'data-col': c.id, role: 'list', 'aria-label': c.nombre }, items.map(function (t) { return tarjeta(t, c); }));
      var inp = h('input', { type: 'text', cls: 'campo', placeholder: '+ Añadir tarea', 'aria-label': 'Añadir tarea en ' + c.nombre, 'data-f': 1 });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && inp.value.trim()) { var t = G.VistaTareas.crearDesdeTexto(inp.value, { lista: listaId }); if (t) { var ult = i === cols.length - 1; T.editar(t.id, { columna: c.id, orden: Date.now() }); if (ult) T.completar(t.id); } inp.value = ''; setTimeout(function () { var x = cont.querySelector('input[aria-label="Añadir tarea en ' + c.nombre.replace(/"/g, '') + '"]'); if (x) x.focus(); }, 40); } });
      tabl.appendChild(h('section', { cls: 'col-k', role: 'listitem', 'aria-label': c.nombre }, [h('header', {}, [h('span', { cls: 't', txt: c.nombre }), h('span', { cls: 'n', txt: items.length }), h('button', { type: 'button', cls: 'btn ic-b', style: 'width:32px;min-height:32px', 'aria-label': 'Opciones de la columna ' + c.nombre, 'data-f': 1, on: { click: function (e) { menuCol(e.currentTarget, i); } } }, [UI.icono('more')])]), cards, h('div', { style: 'padding:0 8px 8px' }, [inp])]));
    });
    tabl.appendChild(h('div', { style: 'flex:0 0 200px' }, [h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { UI.preguntar('Nueva columna', 'Nombre', '', function (v) { var cc = U.clon(columnas()); cc.splice(cc.length - 1, 0, { id: 'c' + Date.now().toString(36), nombre: v.trim() }); guardarCols(cc); }, { txt: 'Añadir' }); } } }, [UI.icono('plus'), h('span', { txt: 'Columna' })])]));
    cont.appendChild(tabl);
  }
  V.montar = function (c, filtro) {
    var ls = S().lista('listas', function (l) { return !l.archivada; }).sort(function (a, b) { return a.orden - b.orden; });
    listaId = filtro && S().get('listas', filtro) ? filtro : (filtro === 'bandeja' ? '' : (ls[0] ? ls[0].id : ''));
    var sel = h('select', { cls: 'campo', 'aria-label': 'Lista del tablero', style: 'width:auto;min-width:160px', 'data-f': 1 }, [h('option', { value: 'bandeja', txt: 'Bandeja' })].concat(ls.map(function (l) { return h('option', { value: l.id, txt: l.nombre }); }))); sel.value = listaId || 'bandeja';
    sel.addEventListener('change', function () { G.App.ir('tablero', sel.value, null, { sinHistorial: true }); });
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Tablero' }), sel]);
    var wrap = h('div', { cls: 'ancho' }, [barra]); cont = h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }); wrap.appendChild(cont); c.appendChild(wrap); pintar();
  };
  V.actualizar = function (evs) { if (!cont || !cont.isConnected) return G.App.render(true); if (evs.some(function (e) { return ['tareas', 'listas', 'hechos'].indexOf(e.col) >= 0; })) { var y = cont.querySelector('.tablero'), sx = y ? y.scrollLeft : 0, f = doc.activeElement; if (f && cont.contains(f) && f.tagName === 'INPUT') return; pintar(); var n = cont.querySelector('.tablero'); if (n) n.scrollLeft = sx; } };
  G.App.vistas.tablero = V;
})(window);
