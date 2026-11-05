/* Linea de tiempo / Gantt sencillo: barras desde inicio hasta vencimiento, agrupadas por lista; arrastrar para mover o estirar. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, T = G.Tareas;
  var V = G.VistaLinea = {}, S = function () { return G.App.store; }, cont = null, dias = 35, desde = null;
  V.titulo = function () { return 'Línea de tiempo'; };
  var AN = 28;

  function barras() {
    var ts = S().lista('tareas', function (t) { return !t.papelera && !t.padre && t.estado !== 'hecha' && (t.fecha || t.inicio); });
    ts.forEach(function (t) { t._ini = t.inicio || (t.estimado > 480 ? F.sumDias(t.fecha, -Math.ceil(t.estimado / 480) + 1) : t.fecha); t._fin = t.fecha || t.inicio; if (t._fin < t._ini) t._fin = t._ini; });
    return ts;
  }
  function pintar() {
    cont.textContent = ''; var hoy = F.hoy(); desde = desde || F.sumDias(hoy, -7); var hasta = F.sumDias(desde, dias - 1), ts = barras();
    var ancho = dias * AN, g = h('div', { cls: 'gantt scroll-x scroll-y' }), cab = h('div', { cls: 'g-cab' }, [h('div', { cls: 'g-etq', txt: 'Tarea' }), h('div', { cls: 'g-celdas', style: 'width:' + ancho + 'px;position:relative' })]);
    var cc = cab.lastChild;
    for (var i = 0; i < dias; i++) { var f = F.sumDias(desde, i), p = F.partes(f); if (F.diaSemana(f) === 1 || (i === 0 && (8 - F.diaSemana(f)) % 7 >= 3)) cc.appendChild(h('div', { cls: 'cel', style: 'left:' + (i * AN) + 'px;width:' + AN * 7 + 'px;text-align:left;padding-left:4px', txt: p[2] + ' ' + F.nombreMes(p[1], true) })); }
    g.appendChild(cab);
    var porLista = {}; ts.forEach(function (t) { (porLista[t.lista] = porLista[t.lista] || []).push(t); });
    var ids = Object.keys(porLista).sort(function (a, b) { var la = S().get('listas', a), lb = S().get('listas', b); return (la ? la.orden : 0) - (lb ? lb.orden : 0); });
    if (!ids.length) g.appendChild(h('div', { cls: 'vacio' }, [h('b', { txt: 'Sin tareas con fechas' }), 'Las tareas con fecha de vencimiento (y opcionalmente fecha de inicio) aparecen aquí como barras.']));
    function celdas() { var c = h('div', { cls: 'g-celdas', style: 'width:' + ancho + 'px' }); for (var k = 0; k < dias; k += 1) { var ff = F.sumDias(desde, k); if (F.diaSemana(ff) === 1) c.appendChild(h('div', { cls: 'g-dia', style: 'left:' + k * AN + 'px' })); } var off = F.difDias(hoy, desde); if (off >= 0 && off < dias) c.appendChild(h('div', { cls: 'g-hoy', style: 'left:' + (off * AN + AN / 2) + 'px', title: 'Hoy' })); return c; }
    ids.forEach(function (lid) {
      var l = S().get('listas', lid); var gc = celdas();
      g.appendChild(h('div', { cls: 'g-fila g-grupo' }, [h('div', { cls: 'g-etq', txt: l ? l.nombre : 'Bandeja' }), gc]));
      porLista[lid].sort(function (a, b) { return a._ini < b._ini ? -1 : 1; }).forEach(function (t) {
        var c = celdas(), ini = F.difDias(t._ini, desde), fin = F.difDias(t._fin, desde);
        if (fin >= 0 && ini < dias) {
          var a = Math.max(0, ini), b = Math.min(dias - 1, fin), color = l && l.color ? l.color : 'var(--acento)';
          var barra = h('button', { type: 'button', cls: 'g-barra', style: 'left:' + a * AN + 'px;width:' + ((b - a + 1) * AN - 3) + 'px;--bc:' + (t.prioridad >= 3 ? 'var(--p' + t.prioridad + ')' : color), 'data-f': 1, 'data-id': t.id, title: t.titulo + ' · ' + t._ini + (t._fin !== t._ini ? ' → ' + t._fin : ''), 'aria-label': t.titulo + ', ' + t._ini + ' a ' + t._fin }, [t.titulo, h('span', { cls: 'g-asa' })]);
          ligarBarra(barra, t, a, b);
          c.appendChild(barra);
        }
        g.appendChild(h('div', { cls: 'g-fila' }, [h('button', { type: 'button', cls: 'g-etq', 'data-f': 1, txt: t.titulo, title: t.titulo, on: { click: function () { G.App.abrir('tarea', t.id); } } }), c]));
      });
    });
    cont.appendChild(g);
    var off2 = F.difDias(hoy, desde); if (off2 > 3) g.scrollLeft = 0;
  }
  function ligarBarra(b, t, a, fin) {
    var st = null;
    b.addEventListener('pointerdown', function (e) { st = { x: e.clientX, id: e.pointerId, resize: e.target.classList.contains('g-asa'), moved: false, w: b.offsetWidth, l: b.offsetLeft }; try { b.setPointerCapture(e.pointerId); } catch (er) {} });
    b.addEventListener('pointermove', function (e) {
      if (!st) return; var dx = e.clientX - st.x; if (Math.abs(dx) > 4) st.moved = true; if (!st.moved) return;
      var d = Math.round(dx / AN) * AN; if (st.resize) b.style.width = Math.max(AN - 3, st.w + d) + 'px'; else b.style.left = (st.l + d) + 'px'; st.d = Math.round(dx / AN);
    });
    b.addEventListener('pointerup', function () {
      if (!st) return; var s = st; st = null;
      if (!s.moved) { G.App.abrir('tarea', t.id); return; }
      var d = s.d || 0; if (!d) { pintar(); return; }
      if (s.resize) T.editar(t.id, { fecha: F.sumDias(t._fin, d) < t._ini ? t._ini : F.sumDias(t._fin, d), inicio: t.inicio || t._ini });
      else T.editar(t.id, { inicio: F.sumDias(t._ini, d), fecha: F.sumDias(t._fin, d) });
    });
    b.addEventListener('pointercancel', function () { st = null; pintar(); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!d || !e.altKey) return; e.preventDefault();
      if (e.shiftKey) T.editar(t.id, { fecha: F.sumDias(t._fin, d) < t._ini ? t._ini : F.sumDias(t._fin, d), inicio: t.inicio || t._ini }); else T.editar(t.id, { inicio: F.sumDias(t._ini, d), fecha: F.sumDias(t._fin, d) });
    });
  }
  V.montar = function (c) {
    desde = null;
    var zoom = h('select', { cls: 'campo', 'aria-label': 'Escala de tiempo', style: 'width:auto', 'data-f': 1 }, [[14, '2 semanas'], [35, '5 semanas'], [70, '10 semanas']].map(function (x) { return h('option', { value: x[0], txt: x[1] }); })); zoom.value = dias;
    zoom.addEventListener('change', function () { dias = +zoom.value; pintar(); });
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Línea de tiempo' }),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Atrás', 'data-f': 1, on: { click: function () { desde = F.sumDias(desde, -7); pintar(); } } }, [UI.icono('back')]),
      h('button', { type: 'button', cls: 'btn', txt: 'Hoy', 'data-f': 1, on: { click: function () { desde = null; pintar(); } } }),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Adelante', 'data-f': 1, on: { click: function () { desde = F.sumDias(desde, 7); pintar(); } } }, [h('span', { style: 'display:inline-block;transform:scaleX(-1)' }, [UI.icono('back')])]), zoom,
      h('span', { cls: 'ayuda ocultar-m', txt: 'Arrastra una barra para moverla; su borde derecho para cambiar el vencimiento (Alt+←/→ con teclado).' })]);
    cont = h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0' }); c.appendChild(h('div', { cls: 'ancho' }, [barra, cont])); pintar();
  };
  V.actualizar = function (evs) { if (!cont || !cont.isConnected) return G.App.render(true); if (evs.some(function (e) { return e.col === 'tareas' || e.col === 'listas'; })) { var g = cont.querySelector('.gantt'), sx = g ? g.scrollLeft : 0, sy = g ? g.scrollTop : 0; pintar(); g = cont.querySelector('.gantt'); if (g) { g.scrollLeft = sx; g.scrollTop = sy; } } };
  G.App.vistas.linea = V;
})(window);
