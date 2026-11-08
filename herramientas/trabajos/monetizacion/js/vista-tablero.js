/* Tablero financiero con graficas propias e informe mensual imprimible. window.MonTablero */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, G = g.MonGraf, X = g.MonDoc, h = U.h, B = g.MonTablero = {};
  var cont, informeSel = C.mes(C.hoy()), informeVista;

  function sumar(ms, tipo) { return ms.filter(function (m) { return m.tipo === tipo; }).reduce(function (a, m) { return a + m.monto; }, 0); }
  function pintar() {
    var hoy = C.hoy(), mesAct = C.mes(hoy), movs = D.movsBase(), m12 = C.porMes(movs, C.mesMas(mesAct, -11), mesAct), delMes = movs.filter(function (m) { return C.mes(m.fecha) === mesAct; }), ult12 = movs.filter(function (m) { return C.mes(m.fecha) >= C.mesMas(mesAct, -11); });
    var ing = sumar(delMes, 'ingreso'), gas = sumar(delMes, 'gasto'), pend = D.porCobrar(), cobrar = pend.reduce(function (a, p) { return a + p.saldo; }, 0), venc = pend.filter(function (p) { return p.dias > 0; }).reduce(function (a, p) { return a + p.saldo; }, 0);
    var reserva = ing * C.n(D.cfg.plan.reservaPct) / 100; cont.textContent = '';
    if (!movs.length && !D.lista('facturas').length) cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { cls: 'mon-h2', txt: 'Empieza por aquí' }), h('p', { txt: 'Aún no hay datos. Registra ingresos y gastos en el Libro, crea una factura o explora las fuentes de ingreso. El tablero se llena solo.' }), h('div', { cls: 'tr-acciones' }, [U.btn('Ir al Libro', function () { g.MonApp.ir('libro'); }), U.btn('Cargar datos de ejemplo', cargarEjemplo)])]));
    cont.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Ingresos del mes', U.dinero(ing), U.mesLargo(mesAct), 'bien'), U.kpi('Gastos del mes', U.dinero(gas), '', 'av'), U.kpi('Neto del mes', U.dinero(ing - gas), ing > 0 ? U.pct((ing - gas) / ing * 100, 0) + ' de margen' : '', ing - gas < 0 ? 'mal' : 'bien'), U.kpi('Por cobrar', U.dinero(cobrar), venc > 0 ? U.dinero(venc) + ' vencido' : pend.length + ' factura(s)', venc > 0 ? 'mal' : ''), U.kpi('Reserva de impuestos', U.dinero(reserva), U.num(D.cfg.plan.reservaPct, 0) + ' % del ingreso del mes')]));
    var sin = Object.keys(D.sinTasa); if (sin.length) cont.appendChild(U.nota('Faltan tasas para ' + sin.join(', ') + ': se cuentan 1:1 hasta que las añadas en Ajustes > Monedas.', true));
    var lab = m12.map(function (x) { return U.mesCorto(x.mes); });
    var grid = h('div', { cls: 'mon-graf-grid' });
    grid.appendChild(U.panel('Ingresos vs gastos', [G.barras({ titulo: 'Últimos 12 meses (' + D.cfg.moneda + ')', labels: lab, series: [{ nombre: 'Ingresos', color: 'var(--c-ing)', datos: m12.map(function (x) { return x.ingresos; }) }, { nombre: 'Gastos', color: 'var(--c-gas)', datos: m12.map(function (x) { return x.gastos; }) }] })]));
    var fu = C.agrupar(ult12.filter(function (m) { return m.tipo === 'ingreso'; }), 'fuenteN').map(function (x) { return { etq: x.clave, valor: x.ingresos }; }).sort(function (a, b) { return b.valor - a.valor; });
    grid.appendChild(U.panel('Ingresos por fuente', [G.dona({ titulo: 'Últimos 12 meses', filas: fu })]));
    var pr = C.agrupar(ult12, 'proyectoN').filter(function (x) { return x.ingresos || x.gastos; }).sort(function (a, b) { return b.neto - a.neto; }), cl = C.agrupar(ult12, 'clienteN').sort(function (a, b) { return b.neto - a.neto; });
    function filas(l) { return l.map(function (x) { return { etq: x.clave, valor: x.neto, nota: x.margen == null ? '' : ' · ' + U.num(x.margen * 100, 0) + ' %' }; }); }
    grid.appendChild(U.panel('Margen por proyecto', [pr.length ? G.hbarras({ titulo: 'Neto por proyecto (y % de margen)', filas: filas(pr) }) : h('p', { cls: 'tr-vacio', txt: 'Asigna proyectos a tus movimientos para verlo.' })]));
    grid.appendChild(U.panel('Margen por cliente', [cl.length ? G.hbarras({ titulo: 'Neto por cliente (y % de margen)', filas: filas(cl) }) : h('p', { cls: 'tr-vacio', txt: 'Asigna clientes a tus movimientos para verlo.' })]));
    var pj = g.MonPlan.proyeccion();
    grid.appendChild(U.panel('Proyección', [G.lineas({ titulo: 'Saldo y flujo neto proyectados', labels: pj.filas.map(function (x) { return U.mesCorto(x.mes); }), series: [{ nombre: 'Saldo', color: 'var(--m1)', datos: pj.filas.map(function (x) { return x.saldo; }) }, { nombre: 'Neto del mes', color: 'var(--m2)', punteada: true, datos: pj.filas.map(function (x) { return x.neto; }) }] }), h('p', { cls: 'tr-ayuda', txt: 'Según tus supuestos en Planeación; no es una predicción.' })]));
    var ant = C.antiguedad(pend.map(function (p) { return { vence: p.vence, saldo: p.saldo }; }), hoy);
    grid.appendChild(U.panel('Cuentas por cobrar', [pend.length ? G.hbarras({ titulo: 'Antigüedad del saldo', color: 'var(--m1)', filas: [{ etq: 'Al día', valor: ant.alDia }, { etq: '1-30 días', valor: ant.d30 }, { etq: '31-60 días', valor: ant.d60 }, { etq: 'Más de 60', valor: ant.d90 }] }) : h('p', { cls: 'tr-vacio', txt: 'Nada pendiente de cobro.' })]));
    cont.appendChild(grid);
    cont.appendChild(informePanel());
  }
  function datosInforme(ym) {
    var movs = D.movsBase().filter(function (m) { return C.mes(m.fecha) === ym; }), ing = sumar(movs, 'ingreso'), gas = sumar(movs, 'gasto'), fm = function (v) { return U.dinero(v); };
    var pend = D.porCobrar(), res = ing * C.n(D.cfg.plan.reservaPct) / 100, ant = C.mesMas(ym, -1), mAnt = D.movsBase().filter(function (m) { return C.mes(m.fecha) === ant; }), iAnt = sumar(mAnt, 'ingreso');
    return { mesTxt: U.mesLargo(ym), base: D.cfg.moneda, emisor: D.cfg.emisor.nombre, fmt: fm, ingresos: ing, gastos: gas,
      kpis: [['Ingresos', fm(ing)], ['Gastos', fm(gas)], ['Neto', fm(ing - gas)], ['Margen', ing > 0 ? U.pct((ing - gas) / ing * 100, 0) : '—'], ['Reserva de impuestos', fm(res)], ['Ingresos vs mes anterior', iAnt > 0 ? U.pct((ing - iAnt) / iAnt * 100, 0) : '—']],
      categorias: C.agrupar(movs.filter(function (m) { return m.tipo === 'gasto'; }), 'categoria').sort(function (a, b) { return b.gastos - a.gastos; }).map(function (x) { return [x.clave, fm(x.gastos)]; }),
      fuentes: C.agrupar(movs.filter(function (m) { return m.tipo === 'ingreso'; }), 'fuenteN').sort(function (a, b) { return b.ingresos - a.ingresos; }).map(function (x) { return [x.clave, fm(x.ingresos)]; }),
      proyectos: C.agrupar(movs, 'proyectoN').sort(function (a, b) { return b.neto - a.neto; }).map(function (x) { return [x.clave, fm(x.ingresos), fm(x.gastos), fm(x.neto)]; }),
      pendientes: pend.map(function (p) { return [p.numero + ' ' + p.cliente + (p.dias > 0 ? ' (vencida)' : ''), fm(p.saldo)]; }) };
  }
  function informePanel() {
    informeVista = h('div', { cls: 'mon-vista-doc', hidden: true });
    var f = U.campo('Mes del informe', { tipo: 'month', valor: informeSel, alCambiar: function (v) { if (v) informeSel = v; } });
    function pag() { var m = X.medidas('A4'); return X.informe(datosInforme(informeSel), m.W, m.H); }
    return U.panel('Informe mensual', [f.el, h('div', { cls: 'tr-acciones' }, [U.btn('Ver informe', function () { informeVista.hidden = false; X.vista(informeVista, pag(), 'A4'); }), U.btn('Imprimir / guardar PDF', function () { X.imprimir(pag(), 'A4'); })]), informeVista], { sub: 'Resumen de un mes para guardar o compartir con tu contador.' });
  }
  async function cargarEjemplo() {
    if (!g.confirm('Se añadirán movimientos y clientes de ejemplo para que veas el tablero. Puedes borrarlos después. ¿Continuar?')) return;
    var hoy = C.hoy(), mes0 = C.mes(hoy), cli = await D.guardar('clientes', { nombre: 'Inmobiliaria Sol (ejemplo)', email: 'contacto@ejemplo.com' }), cli2 = await D.guardar('clientes', { nombre: 'Estudio Brisa (ejemplo)' }), p1 = await D.guardar('proyectos', { nombre: 'Tomas aéreas (ejemplo)' }), p2 = await D.guardar('proyectos', { nombre: 'Canal de viajes (ejemplo)' });
    for (var i = 5; i >= 0; i--) {
      var m = C.mesMas(mes0, -i), f = m + '-05';
      await D.guardar('movimientos', { tipo: 'ingreso', fecha: f, monto: 300 + i * 40 + (i % 2) * 120, moneda: D.cfg.moneda, categoria: 'Servicios', fuente: 'Servicios de dron, foto y vídeo', proyecto: p1.id, cliente: i % 2 ? cli.id : cli2.id, nota: 'Vuelo y edición' });
      await D.guardar('movimientos', { tipo: 'ingreso', fecha: m + '-15', monto: 60 + i * 12, moneda: D.cfg.moneda, categoria: 'Anuncios', fuente: 'Anuncios de plataforma', proyecto: p2.id, canal: 'YouTube', nota: 'Ingresos por anuncios' });
      await D.guardar('movimientos', { tipo: 'gasto', fecha: m + '-08', monto: 45 + (i % 3) * 15, moneda: D.cfg.moneda, categoria: 'Desplazamiento', proyecto: p1.id, nota: 'Gasolina' });
      await D.guardar('movimientos', { tipo: 'gasto', fecha: m + '-02', monto: 29, moneda: D.cfg.moneda, categoria: 'Software y suscripciones', nota: 'Edición de vídeo' });
    }
    T.aviso('Datos de ejemplo añadidos.');
  }
  B.iniciar = function (raiz) { cont = raiz; pintar(); D.on(function (c) { if (c !== 'escenarios' && c !== 'equipo' && c !== 'paquetes') pintar(); }); };
})(window);
