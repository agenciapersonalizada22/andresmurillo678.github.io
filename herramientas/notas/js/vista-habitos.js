/* Habitos con rachas, semana rapida y mapa de calor. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, Mo = G.Modelo, T = G.Tareas, U = G.Util;
  var V = G.VistaHabitos = {}, S = function () { return G.App.store; }, cont = null;
  V.titulo = function () { return 'Hábitos'; };
  var DS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  function editar(hab) {
    var nuevo = !hab; hab = hab || Mo.habito({ nombre: '' });
    var nom = h('input', { type: 'text', cls: 'campo', value: hab.nombre, 'aria-label': 'Nombre del hábito', 'data-ini': 1, 'data-f': 1 }), dias = (hab.dias || [0, 1, 2, 3, 4, 5, 6]).slice(), color = hab.color;
    var ds = h('div', { cls: 'dias-sem', role: 'group', 'aria-label': 'Días' }); function pd() { ds.textContent = ''; [1, 2, 3, 4, 5, 6, 0].forEach(function (d) { ds.appendChild(h('button', { type: 'button', cls: 'btn pq', 'aria-pressed': String(dias.indexOf(d) >= 0), 'aria-label': F.DIAS[d], txt: DS[d], 'data-f': 1, on: { click: function () { var i = dias.indexOf(d); i >= 0 ? dias.splice(i, 1) : dias.push(d); pd(); } } })); }); } pd();
    var cs = h('div', { cls: 'colores' }, [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return h('button', { type: 'button', cls: 'col-op', 'aria-label': 'Color ' + i, style: '--cc:var(--c' + i + ')', 'aria-pressed': String(color === 'var(--c' + i + ')'), 'data-f': 1, on: { click: function (e) { color = 'var(--c' + i + ')'; cs.querySelectorAll('.col-op').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); e.currentTarget.setAttribute('aria-pressed', 'true'); } } }); }));
    UI.dialogo({ titulo: nuevo ? 'Nuevo hábito' : 'Editar hábito', ancho: 420, cuerpo: h('div', {}, [h('label', { cls: 'etq' }, ['Nombre', nom]), h('div', { cls: 'etq', txt: 'Días programados' }), ds, h('div', { cls: 'etq', txt: 'Color' }), cs]),
      acciones: [{ txt: 'Cancelar' }, { txt: 'Guardar', cls: 'prim', fn: function () { if (!nom.value.trim() || !dias.length) return false; S().poner('habitos', Object.assign({}, hab, { nombre: nom.value.trim(), dias: dias.sort(), color: color })); } }] });
  }
  function fila(hab) {
    var hoy = F.hoy(), marcas = T.habitos.marcasDe(hab.id), r = T.habitos.rachas(hab, marcas, hoy), prog = 0, tot = 0;
    for (var i = 0; i < 30; i++) { var f = F.sumDias(hoy, -i); if (T.habitos.programado(hab, f)) { tot++; if (marcas.has(f)) prog++; } }
    var sem = h('div', { cls: 'hab-sem', role: 'group', 'aria-label': 'Últimos 7 días de ' + hab.nombre });
    for (var k = 6; k >= 0; k--) {
      var ff = F.sumDias(hoy, -k), prg = T.habitos.programado(hab, ff), on = marcas.has(ff);
      sem.appendChild(h('div', { cls: 'hab-dia' }, [h('span', { txt: DS[F.diaSemana(ff)] }), h('button', { type: 'button', 'aria-pressed': String(on), 'aria-label': hab.nombre + ' el ' + ff + (prg ? '' : ' (no programado)'), disabled: !prg, style: '--hc:' + (hab.color || 'var(--ok)'), 'data-f': 1, on: { click: (function (x) { return function () { T.habitos.alternar(hab.id, x); }; })(ff) } }, [UI.icono('check')])]));
    }
    var vals = {}; marcas.forEach(function (f) { vals[f] = 3; });
    var fila = h('div', { cls: 'habito' }, [
      h('div', { cls: 'hab-info' }, [h('b', { txt: hab.nombre }), h('div', { cls: 't-meta' }, [h('span', { cls: 'racha' }, [UI.icono('habit'), ' ' + r.actual + (r.actual === 1 ? ' día' : ' días')]), h('span', { txt: 'mejor ' + r.mejor }), h('span', { txt: prog + '/' + tot + ' en 30 días' })])]),
      sem, h('div', { cls: 'ocultar-m' }, [G.Graficos.mapaCalor(vals, 14, hoy)]),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Opciones de ' + hab.nombre, 'data-f': 1, on: { click: function (e) { UI.menu(e.currentTarget, [{ txt: 'Editar…', icono: 'edit', fn: function () { editar(hab); } }, { txt: 'Archivar', icono: 'archive', fn: function () { S().set('habitos', hab.id, { archivado: true }); } }, { txt: 'Eliminar…', icono: 'trash', peligro: 1, fn: function () { UI.confirmar('Eliminar hábito', 'Se borrará también su historial.', function () { S().lista('checks', function (c) { return c.habito === hab.id; }).forEach(function (c) { S().borrar('checks', c.id); }); S().borrar('habitos', hab.id); }, { txt: 'Eliminar', peligro: 1 }); } }], { derecha: true }); } } }, [UI.icono('more')])]);
    return fila;
  }
  function pintar() {
    var l = S().lista('habitos', function (x) { return !x.archivado; }).sort(function (a, b) { return a.creada - b.creada; }); cont.textContent = '';
    if (!l.length) { cont.appendChild(h('div', { cls: 'vacio' }, [h('b', { txt: 'Aún no tienes hábitos' }), 'Crea uno (beber agua, leer, ejercicio…) y marca cada día para construir una racha.', h('div', { style: 'margin-top:12px' }, [h('button', { type: 'button', cls: 'btn prim', txt: 'Crear hábito', 'data-f': 1, on: { click: function () { editar(); } } })])])); return; }
    var hoy = F.hoy(), hoyN = l.filter(function (x) { return T.habitos.programado(x, hoy); }), hechos = hoyN.filter(function (x) { return T.habitos.marcado(x.id, hoy); }).length;
    cont.appendChild(h('div', { cls: 'tarjetas' }, [h('div', { cls: 'kpi' }, [h('b', { txt: hechos + '/' + hoyN.length }), h('span', { txt: 'hábitos de hoy' })])]));
    l.forEach(function (x) { cont.appendChild(fila(x)); });
  }
  V.montar = function (c) {
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Hábitos', style: 'flex:1' }), h('button', { type: 'button', cls: 'btn prim', 'data-f': 1, on: { click: function () { editar(); } } }, [UI.icono('plus'), h('span', { txt: 'Hábito' })])]);
    cont = h('div', { cls: 'cuerpo-scroll' }); c.appendChild(h('div', { cls: 'ancho' }, [barra, cont])); pintar();
  };
  V.actualizar = function (evs) { if (!cont || !cont.isConnected) return G.App.render(true); if (evs.some(function (e) { return e.col === 'habitos' || e.col === 'checks'; })) { var f = doc.activeElement, id = f && f.getAttribute('aria-label'); pintar(); if (id) { var b = cont.querySelector('[aria-label="' + id.replace(/"/g, '\\"') + '"]'); if (b) b.focus(); } } };
  G.App.vistas.habitos = V;
})(window);
