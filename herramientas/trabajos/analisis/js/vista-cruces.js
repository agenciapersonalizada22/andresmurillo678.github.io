/* Vista Cruces: rentabilidad, ROI del equipo, costo de IA, productividad, cuellos de botella y recomendaciones por reglas. window.AnaV.cruces */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, GR = g.AnaGraf, V = g.AnaV = g.AnaV || {}, NIVEL = { alta: 'critico', media: 'aviso', baja: 'ok' };
  V.tarjetaRec = function (r) {
    return h('li', { cls: 'an-rec an-n-' + r.nivel }, [h('div', { cls: 'an-rec-t' }, [U.chipEstado(r.nivel, NIVEL[r.nivel]), h('b', { txt: r.titulo })]), h('p', { txt: r.texto }),
      h('ul', { cls: 'an-evid', 'aria-label': 'Datos que causan esta recomendación' }, r.evidencia.map(function (e) { return h('li', {}, [h('span', { txt: e.etq }), h('b', { txt: String(e.valor) })]); })),
      h('details', { cls: 'an-det' }, [h('summary', { txt: 'Regla aplicada' }), h('p', { cls: 'tr-ayuda', txt: r.regla })])]);
  };
  function metodo(txt) { return h('details', { cls: 'an-det' }, [h('summary', { txt: 'Cómo se calcula' }), h('p', { cls: 'tr-ayuda', txt: txt })]); }
  V.cruces = function (c) {
    var an = A.est.an; c.textContent = ''; if (!an) { c.appendChild(U.sinDatos('Leyendo datos…')); return; }
    var r = an.rent, mon = r && r.moneda;
    if (r.sinDatos) c.appendChild(U.panel('Rentabilidad por proyecto', [U.sinDatos(r.motivo || 'Sin datos de Monetización.')]));
    else {
      c.appendChild(U.panel('Rentabilidad por proyecto', [GR.hbarras({ titulo: 'Margen por proyecto (' + mon + ')', items: r.proyectos.slice(0, 8).map(function (p) { return { etq: p.nombre, valor: Math.max(0, p.margen), color: p.margen < 0 ? 'var(--g6)' : 'var(--g3)', texto: U.din(p.margen) }; }) }),
        U.tabla(['Proyecto', 'Ingresos', 'Gastos', 'Margen', 'Horas', 'Margen/h', 'Neto*'], r.proyectos.map(function (p) { return [p.nombre, U.din(p.ingresos), U.din(p.gastos), U.din(p.margen), p.vinculado ? U.n(p.horasVuelo, 1) : '—', p.margenPorHora == null ? '—' : U.din(p.margenPorHora), p.vinculado ? U.din(p.margenNeto) : '—']; })),
        h('p', { cls: 'tr-ayuda', txt: '* Neto = margen − costo del equipo por las horas de vuelo. «—» en horas: ningún proyecto de Drones con el mismo nombre tiene vuelos anotados.' }), metodo(r.metodo)]));
      c.appendChild(U.panel('Rentabilidad por cliente', [U.tabla(['Cliente', 'Ingresos', 'Gastos', 'Margen', 'Horas', 'Margen/h'], r.clientes.map(function (p) { return [p.nombre, U.din(p.ingresos), U.din(p.gastos), U.din(p.margen), p.horas ? U.n(p.horas, 1) : '—', p.margenPorHora == null ? '—' : U.din(p.margenPorHora)]; }))]));
    }
    var roi = an.roi, ia = an.ia, pr = an.prod;
    c.appendChild(U.panel('ROI del equipo', roi.sinDatos ? [U.sinDatos(roi.motivo)] : [U.tiles([U.tile(U.din(roi.inversion, mon), 'Inversión en equipo'), U.tile(U.din(roi.margenVinculado, mon), 'Margen vinculado'), U.tile(roi.roi == null ? '—' : U.pct(roi.roi), 'ROI', null, roi.roi < 0 ? 'aviso' : ''), U.tile(roi.horasParaRecuperar == null ? '—' : roi.horasParaRecuperar + ' h', 'Horas para recuperar', U.din(roi.margenPorHora, mon) + ' por hora')]),
      U.tabla(['Equipo', 'Costo', 'Costo/hora', 'Horas para recuperarlo'], roi.equipos.map(function (e) { return [e.nombre, U.din(e.costo), U.din(e.costoHora), e.horasParaRecuperar == null ? '—' : e.horasParaRecuperar]; })), metodo(roi.metodo)]));
    c.appendChild(U.panel('Costo de IA por pieza', ia.sinDatos ? [U.sinDatos(ia.motivo)] : [U.tiles([U.tile(U.n(ia.gasto, 4), 'Gasto de IA estimado', ia.ventanaDias + ' día(s) con registro'), U.tile(ia.llamadas, 'Llamadas'), U.tile(ia.piezas, 'Piezas terminadas'), U.tile(ia.costoPorPieza == null ? '—' : U.n(ia.costoPorPieza, 4), 'Costo por pieza'), U.tile(ia.costoPorLlamada == null ? '—' : U.n(ia.costoPorLlamada, 4), 'Costo por llamada')]), U.tabla(['Módulo', 'Gasto', 'Llamadas'], ia.fuentes.map(function (f) { return [f.modulo, U.n(f.gasto, 4), f.llamadas]; })), metodo(ia.metodo)]));
    c.appendChild(U.panel('Productividad', pr.sinDatos ? [U.sinDatos(pr.motivo)] : [U.tiles([U.tile(U.n(pr.horas, 1) + ' h', 'Horas de vuelo'), U.tile(pr.entregables, 'Entregables', pr.desglose.piezasPublicadas + ' piezas · ' + pr.desglose.facturasEmitidas + ' facturas · ' + pr.desglose.modelos3D + ' modelos'), U.tile(pr.horasPorEntregable == null ? '—' : U.n(pr.horasPorEntregable, 2) + ' h', 'Horas por entregable')]), metodo(pr.metodo)]));
    c.appendChild(U.panel('Cuellos de botella', an.cuellos.length ? [h('ul', { cls: 'an-recs' }, an.cuellos.map(V.tarjetaRec))] : [U.nota('No se detectan cuellos de botella con las reglas actuales.', 'tr-ok')]));
    c.appendChild(U.panel('Recomendaciones', [h('p', { cls: 'tr-ayuda', txt: 'Cada recomendación sale de una regla explícita y lista los datos que la causan. No hay IA ni puntuaciones ocultas aquí.' })].concat(an.recomendaciones.length ? [h('ul', { cls: 'an-recs', id: 'lista-recs' }, an.recomendaciones.map(V.tarjetaRec))] : [U.nota('Sin recomendaciones: ninguna regla se dispara con tus datos actuales.', 'tr-ok')]).concat([h('details', { cls: 'an-det' }, [h('summary', { txt: 'Ver las ' + g.AnaCruces.REGLAS.length + ' reglas' }), h('ul', { cls: 'an-reglas' }, g.AnaCruces.REGLAS.map(function (x) { return h('li', {}, [h('b', { txt: x.nombre + ': ' }), x.regla]); }))])])));
  };
})(window);
