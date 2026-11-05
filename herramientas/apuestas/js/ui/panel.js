/* Panel de rendimiento. */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, R = A.registro;
  var V = A.vistas = A.vistas || {};
  var per = 'todo', por = 'deporte';

  function corte(p) {
    if (p === 'todo') return null;
    var d = new Date(); d.setDate(d.getDate() - { '30': 30, '90': 90, '365': 365 }[p]); return R.hoy(d);
  }
  V.panel = function (cont) {
    var c = corte(per), todas = S.apuestas, antes = c ? todas.filter(function (a) { return a.fecha < c; }) : [], dentro = c ? todas.filter(function (a) { return a.fecha >= c; }) : todas;
    var banca0 = S.cfg.bancaInicial + R.resumen(antes, 0).neto, r = R.resumen(dentro, banca0);
    var cuerpo = h('div');
    var sel = U.seg([{ v: 'todo', t: 'Todo' }, { v: '30', t: '30 días' }, { v: '90', t: '90 días' }, { v: '365', t: '1 año' }], per, function (v) { per = v; V.panel(cont); }, 'Periodo');
    if (!todas.length) { U.montar(cont, U.vacio('Aún no hay datos que mostrar', 'Registra y liquida apuestas y aquí verás tu rendimiento real.', U.btn('Ir al registro', function () { location.hash = '#/registro'; }, 'primario'))); return; }
    var rs = r.rachas.actual;
    var kp = h('div', { class: 'kpis' },
      U.kpi('Ganancia neta', U.m(r.neto, true), r.liquidadas + ' liquidadas', U.clase(r.neto)), U.kpi('Yield', U.p(r.yield, 2, true), 'sobre ' + U.m(r.apostado) + ' apostado', U.clase(r.yield)), U.kpi('ROI s/ banca', r.roi == null ? '—' : U.p(r.roi, 2, true), 'banca inicial ' + U.m(banca0), U.clase(r.roi)),
      U.kpi('% aciertos', r.aciertos == null ? '—' : U.p(r.aciertos, 1), 'cuota media ' + (r.cuotaMedia ? U.cuota(r.cuotaMedia) : '—')),
      U.kpi('CLV medio', r.clvMedio == null ? '—' : U.p(r.clvMedio, 2, true), r.clvN ? r.clvN + ' con cierre · ' + U.p(r.clvPositivo, 0) + ' positivas' : 'Anota la cuota de cierre en cada apuesta', U.clase(r.clvMedio)),
      U.kpi('Drawdown máx.', U.m(-r.drawdown.absoluto), U.p(r.drawdown.pct, 1) + ' desde el pico', r.drawdown.absoluto ? 'neg' : ''),
      U.kpi('Racha', rs.n ? rs.n + (rs.tipo === 'ganadora' ? (rs.n === 1 ? ' ganada' : ' ganadas') : (rs.n === 1 ? ' perdida' : ' perdidas')) : '—', 'mejor ' + r.rachas.maxGanadora + ' · peor ' + r.rachas.maxPerdedora), U.kpi('En juego', U.m(r.enJuego), r.pendientes + ' pendientes'));
    var fm = function (v) { return U.m(v).replace(/[.,]\d+$/, ''); };
    var etX = r.curva.map(function (p, i) { return p.fecha || 'inicio'; });
    var graf = r.curva.length > 1 ? U.graf.lineas([{ pts: r.curva.map(function (p) { return p.banca; }) }], { area: true, fmtY: fm, base: banca0, etiquetasX: etX, titulo: 'Curva de banca' }) : U.vacio('Liquida apuestas para ver la curva de banca');
    var dsg = R.desglose(dentro, por);
    var tabla = dsg.length ? [U.graf.barras(dsg.slice(0, 12).map(function (d) { return { clave: d.clave, valor: d.neto, texto: U.m(d.neto, true) }; }), { titulo: 'Ganancia neta por ' + por }),
      U.tabla(['Grupo', { t: 'N', clase: 'num' }, { t: 'Apostado', clase: 'num' }, { t: 'Neto', clase: 'num' }, { t: 'Yield', clase: 'num' }, { t: 'Aciertos', clase: 'num' }], dsg.map(function (d) { return h('tr', null, h('th', { scope: 'row' }, d.clave), h('td', { class: 'num' }, d.n), h('td', { class: 'num' }, U.m(d.apostado)), h('td', { class: 'num ' + U.clase(d.neto) }, U.m(d.neto, true)), h('td', { class: 'num ' + U.clase(d.yield) }, U.p(d.yield, 1, true)), h('td', { class: 'num' }, U.p(d.aciertos, 0))); })),
      d0(dsg)] : [U.vacio('Sin apuestas liquidadas en el periodo')];
    function d0(d) { return d.some(function (x) { return x.n < 30; }) ? h('small', { class: 'muted' }, 'Con menos de 30 apuestas por grupo, el yield es mayormente ruido estadístico.') : null; }
    /* metas */
    var mes = R.hoy().slice(0, 7), delMes = todas.filter(function (a) { return a.fecha.slice(0, 7) === mes; }), rm = R.resumen(delMes, 0), meta = S.cfg.meta;
    var metas = (meta.beneficioMes > 0 || meta.yield > 0) ? h('section', { class: 'card' }, h('h3', null, 'Metas del mes'),
      meta.beneficioMes > 0 ? [h('p', null, 'Beneficio: ' + U.m(rm.neto, true) + ' de ' + U.m(meta.beneficioMes)), h('progress', { max: meta.beneficioMes, value: Math.max(0, Math.min(rm.neto, meta.beneficioMes)), 'aria-label': 'Progreso de la meta de beneficio' })] : null,
      meta.yield > 0 ? h('p', null, 'Yield del mes: ' + U.p(rm.yield, 1, true) + ' (meta ' + U.p(meta.yield / 100, 1) + ')') : null,
      U.aviso('Las metas de beneficio pueden empujar a apostar más para «llegar». Úsalas como referencia, no como obligación.', 'info')) : null;
    var lims = A.estado.limites();
    var limS = lims.length ? h('section', { class: 'card' }, h('h3', null, 'Límites de pérdida'), lims.map(function (l) { return h('div', null, h('p', null, 'Límite ' + l.nombre + ': ' + U.m(l.perdida) + ' de ' + U.m(l.limite) + ' ', h('span', { class: 'pill ' + (l.estado === 'ok' ? 'ok' : l.estado === 'aviso' ? 'aviso' : 'peligro') }, l.estado === 'ok' ? 'Dentro' : l.estado === 'aviso' ? 'Cerca del límite' : 'Superado')), h('progress', { max: 1, value: Math.min(1, l.ratio), 'aria-label': 'Uso del límite ' + l.nombre })); })) : null;
    U.montar(cont, sel, kp, h('section', { class: 'card' }, h('h3', null, 'Curva de banca'), graf), limS, metas,
      h('section', { class: 'card' }, h('h3', null, 'Rendimiento por…'), U.seg([{ v: 'deporte', t: 'Deporte' }, { v: 'liga', t: 'Liga' }, { v: 'mercado', t: 'Mercado' }, { v: 'casa', t: 'Casa' }, { v: 'etiqueta', t: 'Etiqueta' }, { v: 'dia', t: 'Día' }, { v: 'tipo', t: 'Tipo' }], por, function (v) { por = v; V.panel(cont); }, 'Agrupar por'), tabla),
      U.aviso('Rendimiento calculado solo con tus datos locales. Un yield positivo en pocas apuestas no demuestra ventaja. El CLV (tu cuota frente a la de cierre) es un indicador más estable que el resultado.', 'info'));
  };
})(window);
