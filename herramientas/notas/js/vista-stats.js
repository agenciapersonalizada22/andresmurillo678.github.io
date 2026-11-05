/* Estadisticas de productividad con graficas SVG propias. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, Mo = G.Modelo, T = G.Tareas, Gf = G.Graficos;
  var V = G.VistaStats = {}, S = function () { return G.App.store; }, cont = null;
  V.titulo = function () { return 'Estadísticas'; };
  function graf(titulo, nodo, extra) { return h('section', { cls: 'graf' }, [h('h2', { txt: titulo }), nodo, extra || null]); }
  V.calcular = function (hoy) {
    var hechos = S().lista('hechos'), porDia = {}; hechos.forEach(function (x) { porDia[x.fecha] = (porDia[x.fecha] || 0) + 1; });
    var racha = 0, f = hoy; if (!porDia[f]) f = F.sumDias(f, -1); while (porDia[f]) { racha++; f = F.sumDias(f, -1); }
    return { porDia: porDia, racha: racha };
  };
  function pintar() {
    cont.textContent = ''; var hoy = F.hoy(), c = V.calcular(hoy), tareas = S().lista('tareas', function (t) { return !t.papelera && !t.padre; });
    var pend = tareas.filter(function (t) { return t.estado !== 'hecha'; }), venc = pend.filter(function (t) { return t.fecha && t.fecha < hoy; });
    var h7 = 0, d14 = [], s8 = [], enf14 = [], i;
    for (i = 13; i >= 0; i--) { var f = F.sumDias(hoy, -i); d14.push({ etq: F.partes(f)[2] + '', v: c.porDia[f] || 0 }); enf14.push({ etq: F.partes(f)[2] + '', v: Math.round(S().lista('sesiones', function (x) { return x.fecha === f && x.tipo !== 'descanso'; }).reduce(function (a, x) { return a + x.dur; }, 0)) }); if (i < 7) h7 += c.porDia[f] || 0; }
    for (i = 7; i >= 0; i--) { var ini = F.sumDias(F.inicioSemana(hoy), -7 * i), n = 0; for (var k = 0; k < 7; k++) n += c.porDia[F.sumDias(ini, k)] || 0; s8.push({ etq: F.partes(ini)[2] + '/' + F.partes(ini)[1], v: n }); }
    var enfSem = enf14.slice(7).reduce(function (a, d) { return a + d.v; }, 0);
    cont.appendChild(h('div', { cls: 'tarjetas' }, [['pendientes', pend.length], ['vencidas', venc.length], ['hechas hoy', c.porDia[hoy] || 0], ['hechas en 7 días', h7], ['racha de días', c.racha], ['enfoque 7 días', UI.fmtDur(enfSem)], ['notas', S().lista('notas', function (n) { return !n.papelera; }).length]].map(function (x) { return h('div', { cls: 'kpi' }, [h('b', { txt: x[1] }), h('span', { txt: x[0] })]); })));
    var gs = h('div', { cls: 'graf-g' });
    gs.appendChild(graf('Tareas completadas, últimos 14 días', Gf.barras(d14, { unidad: 'tareas', desc: 'Tareas completadas por día en las últimas dos semanas' })));
    gs.appendChild(graf('Completadas por semana', Gf.barras(s8, { unidad: 'tareas', color: 'var(--c4)', desc: 'Tareas completadas por semana, últimas ocho semanas' })));
    gs.appendChild(graf('Minutos de enfoque, 14 días', Gf.barras(enf14, { unidad: 'min', color: 'var(--c7)', desc: 'Minutos de enfoque por día' })));
    var pp = Mo.PRIORIDADES.map(function (p) { return { etq: p.nombre, v: pend.filter(function (t) { return (t.prioridad || 0) === p.n; }).length, color: 'var(--p' + p.n + ')' }; });
    var ley = function (datos) { return h('div', { cls: 'leyenda' }, datos.map(function (d) { return h('span', {}, [h('i', { style: 'background:' + d.color }), d.etq + ' (' + d.v + ')']); })); };
    gs.appendChild(graf('Pendientes por prioridad', Gf.anillo(pp, { desc: 'Tareas pendientes por prioridad: ' + pp.map(function (d) { return d.etq + ' ' + d.v; }).join(', ') }), ley(pp)));
    var ls = S().lista('listas'), pl = [{ etq: 'Bandeja', v: pend.filter(function (t) { return !t.lista; }).length, color: 'var(--c6)' }].concat(ls.map(function (l, i2) { return { etq: l.nombre, v: pend.filter(function (t) { return t.lista === l.id; }).length, color: 'var(--c' + (1 + (i2 + 1) % 8) + ')' }; })).filter(function (d) { return d.v; });
    gs.appendChild(graf('Pendientes por lista', Gf.anillo(pl, { desc: 'Pendientes por lista' }), ley(pl)));
    var act = {}; Object.keys(c.porDia).forEach(function (k) { act[k] = c.porDia[k]; }); S().lista('checks').forEach(function (x) { act[x.fecha] = (act[x.fecha] || 0) + 1; });
    var mc = Gf.mapaCalor(act, 16, hoy); gs.appendChild(graf('Actividad (tareas + hábitos), 16 semanas', h('div', { style: 'overflow-x:auto;padding:4px 0' }, [mc])));
    cont.appendChild(gs);
    var conT = tareas.filter(function (t) { return t.estimado && T.tiempo(t.id) > 0; }).sort(function (a, b) { return T.tiempo(b.id) - T.tiempo(a.id); }).slice(0, 8);
    if (conT.length) cont.appendChild(graf('Estimado frente a tiempo real', h('table', { cls: 'tabla-ac' }, [h('tr', {}, ['Tarea', 'Estimado', 'Real'].map(function (x) { return h('th', { txt: x }); }))].concat(conT.map(function (t) { var r = T.tiempo(t.id); return h('tr', {}, [h('td', { txt: t.titulo }), h('td', { txt: UI.fmtDur(t.estimado) }), h('td', { txt: UI.fmtDur(r), style: r > t.estimado ? 'color:var(--peligro)' : '' })]); })))));
  }
  V.montar = function (c) {
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Estadísticas' })]);
    cont = h('div', { cls: 'cuerpo-scroll', style: 'padding-bottom:90px' }); c.appendChild(h('div', { cls: 'ancho' }, [barra, cont])); pintar();
  };
  V.actualizar = function (evs) { if (cont && cont.isConnected && evs.some(function (e) { return ['hechos', 'tareas', 'sesiones', 'checks'].indexOf(e.col) >= 0; })) { var y = cont.scrollTop; pintar(); cont.scrollTop = y; } };
  G.App.vistas.stats = V;
})(window);
