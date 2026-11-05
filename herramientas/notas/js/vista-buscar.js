/* Busqueda global instantanea con operadores. App.filtro = consulta. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, B = G.Busqueda, Md = G.Md;
  var V = G.VistaBuscar = {}, S = function () { return G.App.store; }, inp, res, info;
  V.titulo = function () { return 'Buscar'; };
  var AYUDA = 'Operadores: tag:trabajo · prioridad:alta · antes:viernes · despues:2026-12-01 · en:notas · en:Hogar · es:hecha · es:vencida · sin:fecha · "frase exacta" · -excluir';

  V.buscar = function (texto) {
    var t0 = performance.now(), r = B.buscar(S(), texto, { hoy: F.hoy(), nombreContenedor: G.App.nombreContenedor }), ms = performance.now() - t0;
    V.ultimoMs = ms; return { r: r, ms: ms };
  };
  function fragmento(n, terminos) {
    if (n.cif) return 'Nota bloqueada'; var txt = Md.aTexto(n.cuerpo || ''), norm = G.Util.norm(txt), pos = -1;
    for (var i = 0; i < terminos.length; i++) { pos = norm.indexOf(terminos[i]); if (pos >= 0) break; }
    if (pos < 0) return txt.slice(0, 140); var a = Math.max(0, pos - 40); return (a ? '…' : '') + txt.slice(a, a + 160);
  }
  function pintar() {
    var q = inp.value, o = V.buscar(q); res.textContent = '';
    if (!q.trim()) { info.textContent = ''; res.appendChild(h('div', { cls: 'vacio' }, [h('b', { txt: 'Busca en todas tus notas y tareas' }), AYUDA])); return; }
    info.textContent = o.r.length + ' resultado' + (o.r.length === 1 ? '' : 's') + ' · ' + o.ms.toFixed(1) + ' ms';
    if (!o.r.length) { res.appendChild(h('div', { cls: 'vacio' }, [h('b', { txt: 'Sin resultados' }), AYUDA])); return; }
    var c = B.compilar(q), notas = o.r.filter(function (x) { return x.tipo === 'nota'; }), tareas = o.r.filter(function (x) { return x.tipo === 'tarea'; });
    if (tareas.length) { res.appendChild(h('div', { cls: 'grupo-t' }, [h('span', { txt: 'Tareas' }), h('span', { txt: tareas.length })])); var ul = h('ul', { cls: 'lista-t', role: 'list' }); tareas.slice(0, 100).forEach(function (x) { ul.appendChild(G.VistaTareas.fila(x.rec)); }); res.appendChild(ul); }
    if (notas.length) { res.appendChild(h('div', { cls: 'grupo-t' }, [h('span', { txt: 'Notas' }), h('span', { txt: notas.length })])); var ln = h('ul', { cls: 'lista-n', role: 'list' }); notas.slice(0, 100).forEach(function (x) { var b = G.VistaNotas.fila(x.rec); var r = b.querySelector('.n-res'); r.textContent = fragmento(x.rec, c.terminos); ln.appendChild(h('li', { role: 'listitem' }, [b])); }); res.appendChild(ln); }
  }
  V.montar = function (cont, filtro) {
    inp = h('input', { type: 'search', cls: 'campo', placeholder: 'Buscar… (tag:casa prioridad:alta antes:mañana)', 'aria-label': 'Buscar en notas y tareas', value: filtro || '', 'data-f': 1, autocomplete: 'off' });
    info = h('span', { cls: 'ayuda', 'aria-live': 'polite', style: 'margin:0' });
    var guardar = h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { if (!inp.value.trim()) return; UI.preguntar('Guardar filtro', 'Nombre del filtro', inp.value.slice(0, 30), function (v) { S().poner('filtros', { id: G.Util.id(), nombre: v.trim(), q: inp.value }); UI.aviso('Filtro guardado', { tipo: 'ok' }); }); } } }, [UI.icono('filter'), h('span', { cls: 'ocultar-m', txt: 'Guardar filtro' })]);
    inp.addEventListener('input', function () { pintar(); try { G.history.replaceState(G.history.state, '', '#buscar:' + inp.value); } catch (e) {} G.App.filtro = inp.value; });
    res = h('div', { cls: 'cuerpo-scroll', role: 'region', 'aria-label': 'Resultados' });
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Buscar' }), h('div', { style: 'flex:1;min-width:200px' }, [inp]), guardar, info]);
    cont.appendChild(h('div', { cls: 'ancho' }, [barra, res])); pintar(); setTimeout(function () { if (!filtro) inp.focus(); }, 30);
  };
  V.actualizar = function (evs) { if (inp && inp.isConnected && evs.some(function (e) { return e.col === 'notas' || e.col === 'tareas'; })) pintar(); };
  G.App.vistas.buscar = V;
})(window);
