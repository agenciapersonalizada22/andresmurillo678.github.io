/* Planeacion: flujo de caja, presupuesto, metas, fondo de emergencia, estacionalidad, simulador generico de impuestos, reserva y ROI/financiamiento de equipo. window.MonPlan */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, K = g.MonCatalogo, G = g.MonGraf, h = U.h, P = g.MonPlan = {};
  var flujoEl, presEl, metaEl, fondoEl, impEl, estacEl, tg;

  function plan() { return D.cfg.plan; }
  function guardar() { clearTimeout(tg); tg = setTimeout(function () { D.guardarCfg(); }, 500); }
  function serie(n) { var hoy = C.mes(C.hoy()); return C.porMes(D.movsBase(), C.mesMas(hoy, -(n - 1)), hoy); }
  function promedio3() { var s = serie(4).slice(0, 3), i = 0, gs = 0; s.forEach(function (x) { i += x.ingresos; gs += x.gastos; }); var n = s.length || 1; return { ing: i / n, gas: gs / n }; }
  P.proyeccion = function () {
    var p = plan(), pr = promedio3(), ex = new Array(24).fill(0), hoyM = C.mes(C.hoy());
    if (p.incluirCobros) D.porCobrar().forEach(function (x) { var m = C.mes(x.vence < C.hoy() ? C.hoy() : x.vence), k = 0; for (; k < 24 && C.mesMas(hoyM, k) < m; k++); if (k < 24) ex[k] += x.saldo; });
    return C.proyectar({ saldo: p.saldo, mesInicio: C.mesMas(hoyM, 0), n: Math.max(3, Math.min(24, C.n(p.meses, 12))), ingresoBase: p.ingresoBase != null && p.ingresoBase !== '' ? p.ingresoBase : pr.ing, gastoBase: p.gastoBase != null && p.gastoBase !== '' ? p.gastoBase : pr.gas, crecimientoPct: p.crecimiento, reservaPct: p.reservaPct, estac: p.usarEstac ? (p.estac && p.estac.length === 12 ? p.estac : null) : null, ingresosExtra: ex });
  };
  function campoPlan(clave, etq, o) {
    o = o || {}; var f = U.campo(etq, { tipo: 'numero', min: o.min == null ? 0 : o.min, max: o.max, valor: plan()[clave] == null ? '' : plan()[clave], ayuda: o.ayuda, placeholder: o.ph, alCambiar: function (v) { plan()[clave] = v === '' ? null : C.n(v); guardar(); (o.pinta || pintarTodo)(); } });
    return f.el;
  }
  function pintarFlujo() {
    var f = P.proyeccion(), p = plan(), pr = promedio3(); flujoEl.textContent = '';
    var labels = f.filas.map(function (x) { return U.mesCorto(x.mes); });
    flujoEl.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Saldo final', U.dinero(f.final), 'en ' + f.filas.length + ' meses', f.final < 0 ? 'mal' : 'bien'), U.kpi('Saldo mínimo', U.dinero(f.minimo), f.mesMinimo >= 0 ? 'en ' + U.mesLargo(f.filas[f.mesMinimo].mes) : '', f.minimo < 0 ? 'mal' : ''), U.kpi('Ingreso base', U.dinero(p.ingresoBase != null && p.ingresoBase !== '' ? p.ingresoBase : pr.ing), 'por mes'), U.kpi('Gasto base', U.dinero(p.gastoBase != null && p.gastoBase !== '' ? p.gastoBase : pr.gas), 'por mes')]));
    if (f.primerNegativo >= 0) flujoEl.appendChild(U.nota('Con estos supuestos el saldo queda negativo en ' + U.mesLargo(f.filas[f.primerNegativo].mes) + '. Revisa gastos, cobros o ingresos.', true));
    flujoEl.appendChild(G.lineas({ titulo: 'Saldo proyectado', labels: labels, series: [{ nombre: 'Saldo', color: 'var(--m1)', datos: f.filas.map(function (x) { return x.saldo; }) }] }));
    flujoEl.appendChild(G.barras({ titulo: 'Ingresos y gastos proyectados', labels: labels, series: [{ nombre: 'Ingresos (menos reserva)', color: 'var(--c-ing)', datos: f.filas.map(function (x) { return x.ingresos; }) }, { nombre: 'Gastos', color: 'var(--c-gas)', datos: f.filas.map(function (x) { return x.gastos; }) }] }));
    flujoEl.appendChild(U.det('Tabla mes a mes', [U.tabla([{ t: 'Mes', f: function (x) { return U.mesLargo(x.mes); } }, { t: 'Ingresos', f: function (x) { return U.dinero(x.ingresosBrutos); }, der: 1 }, { t: 'Reserva imp.', f: function (x) { return U.dinero(x.reserva); }, der: 1 }, { t: 'Gastos', f: function (x) { return U.dinero(x.gastos); }, der: 1 }, { t: 'Saldo', f: function (x) { return U.dinero(x.saldo); }, der: 1 }], f.filas, { etq: 'Flujo de caja proyectado' })]));
  }
  function ctrlFlujo() {
    var chk = h('input', { type: 'checkbox', id: 'pl-cobros' }); chk.checked = !!plan().incluirCobros; chk.addEventListener('change', function () { plan().incluirCobros = chk.checked; guardar(); pintarFlujo(); });
    return h('div', {}, [h('div', { cls: 'tr-fila mon-campos' }, [campoPlan('saldo', 'Saldo actual de caja', { min: -1e12, pinta: pintarFlujo }), campoPlan('ingresoBase', 'Ingreso mensual base', { ph: 'auto (libro)', pinta: pintarFlujo, ayuda: 'Vacío = promedio de los últimos 3 meses.' }), campoPlan('gastoBase', 'Gasto mensual base', { ph: 'auto (libro)', pinta: pintarFlujo }), campoPlan('crecimiento', 'Crecimiento mensual (%)', { min: -50, pinta: pintarFlujo }), campoPlan('reservaPct', 'Reserva para impuestos (% del ingreso)', { max: 90, pinta: pintarFlujo }), campoPlan('meses', 'Meses a proyectar (3-24)', { min: 3, max: 24, pinta: pintarFlujo })]),
      h('label', { cls: 'tr-chk', for: 'pl-cobros' }, [chk, 'Sumar los cobros pendientes en el mes de su vencimiento'])]);
  }
  /* ---- estacionalidad ---- */
  function pintarEstac() {
    var p = plan(); estacEl.textContent = '';
    var idx = p.estac && p.estac.length === 12 ? p.estac : new Array(12).fill(1), meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var chk = h('input', { type: 'checkbox', id: 'pl-est' }); chk.checked = !!p.usarEstac; chk.addEventListener('change', function () { p.usarEstac = chk.checked; if (!p.estac) p.estac = idx.slice(); guardar(); pintarFlujo(); });
    estacEl.appendChild(h('label', { cls: 'tr-chk', for: 'pl-est' }, [chk, 'Aplicar estacionalidad a la proyección']));
    estacEl.appendChild(G.hbarras({ titulo: 'Índice por mes (1,00 = promedio)', filas: idx.map(function (v, i) { return { etq: meses[i], valor: v, nota: '' }; }), fmt: function (v) { return U.num(v, 2); }, max: 12 }));
    var cel = h('div', { cls: 'tr-fila' }); idx.forEach(function (v, i) { var f = U.campo(meses[i], { tipo: 'numero', min: 0, step: '0.05', valor: v, alCambiar: function (x) { p.estac = (p.estac || idx.slice()).slice(); p.estac[i] = C.n(x, 1); guardar(); pintarFlujo(); } }); f.el.style.flex = '1 1 70px'; cel.appendChild(f.el); });
    estacEl.appendChild(U.det('Editar índices', [cel, U.btn('Calcular desde mi libro', function () { var s = serie(24).filter(function (x) { return x.ingresos > 0; }).map(function (x) { return { mes: x.mes, ingresos: x.ingresos }; }); if (s.length < 6) { T.aviso('Necesitas al menos 6 meses con ingresos en el libro.', 'error'); return; } p.estac = C.estacionalidad(s); p.usarEstac = true; guardar(); pintarEstac(); pintarFlujo(); T.aviso('Estacionalidad calculada con ' + s.length + ' meses.'); })]));
  }
  /* ---- presupuesto y metas ---- */
  function pintarPres() {
    var p = plan(), hoyM = C.mes(C.hoy()), mov = D.movsBase().filter(function (m) { return C.mes(m.fecha) === hoyM && m.tipo === 'gasto'; }), real = {}; mov.forEach(function (m) { real[m.categoria] = (real[m.categoria] || 0) + m.monto; });
    presEl.textContent = ''; var cats = K.CAT_GASTO.concat(D.cfg.categorias.gasto || []), totP = 0, totR = 0;
    var tb = h('tbody', {});
    cats.forEach(function (c) {
      var pre = C.n(p.presupuesto[c]), r = real[c] || 0; totP += pre; totR += r; var pct = pre > 0 ? Math.min(100, r / pre * 100) : 0;
      var i = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', value: pre || '', 'aria-label': 'Presupuesto de ' + c, placeholder: '0' }); i.addEventListener('change', function () { p.presupuesto[c] = C.n(i.value); guardar(); pintarPres(); });
      tb.appendChild(h('tr', {}, [h('th', { scope: 'row', txt: c }), h('td', {}, [i]), h('td', { cls: r > pre && pre > 0 ? 'mon-gas' : '', txt: U.dinero(r) }), h('td', {}, [pre > 0 ? h('div', { cls: 'mon-barra', role: 'img', 'aria-label': U.num(r / pre * 100, 0) + ' % usado' }, [h('i', { style: 'width:' + pct + '%;background:' + (r > pre ? 'var(--c-gas)' : 'var(--m1)') })]) : '—'])]));
    });
    presEl.appendChild(h('div', { cls: 'mon-tabla-cont', tabindex: 0, role: 'region', 'aria-label': 'Presupuesto por categoría' }, [h('table', { cls: 'mon-esc' }, [h('thead', {}, [h('tr', {}, ['Categoría', 'Presupuesto', 'Gastado', 'Uso'].map(function (t) { return h('th', { scope: 'col', txt: t }); }))]), tb])]));
    presEl.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Mes actual: presupuestado ' + U.dinero(totP) + ' · gastado ' + U.dinero(totR) + (totP > 0 ? ' · ' + U.dinero(totP - totR) + (totP - totR >= 0 ? ' disponibles' : ' por encima') : '') + '.' }));
  }
  function pintarMeta() {
    var p = plan(), hoy = C.hoy(), hoyM = C.mes(hoy), anio = hoy.slice(0, 4), movs = D.movsBase().filter(function (m) { return m.tipo === 'ingreso'; });
    var mes = movs.filter(function (m) { return C.mes(m.fecha) === hoyM; }).reduce(function (a, m) { return a + m.monto; }, 0), ytd = movs.filter(function (m) { return m.fecha.slice(0, 4) === anio; }).reduce(function (a, m) { return a + m.monto; }, 0), meta = C.n(p.metaMes);
    metaEl.textContent = '';
    if (!(meta > 0)) { metaEl.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Define una meta mensual para ver tu avance.' })); return; }
    var pct = Math.min(100, mes / meta * 100), mm = +hoyM.slice(5, 7);
    metaEl.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Este mes', U.dinero(mes), U.num(mes / meta * 100, 0) + ' % de la meta'), U.kpi('Falta', U.dinero(Math.max(0, meta - mes)), '', mes >= meta ? 'bien' : ''), U.kpi('Meta anual', U.dinero(meta * 12), U.dinero(ytd) + ' en lo que va del año'), U.kpi('Ritmo anual', U.dinero(ytd / mm * 12), 'si sigues así')]));
    metaEl.appendChild(h('div', { cls: 'mon-barra', role: 'img', 'aria-label': U.num(pct, 0) + ' % de la meta mensual' }, [h('i', { style: 'width:' + pct + '%' })]));
  }
  function pintarFondo() {
    var p = plan(), pr = promedio3(), gas = p.gastoBase != null && p.gastoBase !== '' ? p.gastoBase : pr.gas, r = C.fondoEmergencia(gas, p.fondoMeses, p.ahorrado, p.aporte); fondoEl.textContent = '';
    fondoEl.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Meta del fondo', U.dinero(r.meta), U.num(p.fondoMeses, 0) + ' meses de gastos (' + U.dinero(gas) + ')'), U.kpi('Ahorrado', U.dinero(p.ahorrado), U.num(r.pct, 0) + ' %'), U.kpi('Falta', U.dinero(r.falta), '', r.falta === 0 ? 'bien' : ''), U.kpi('Para llegar', r.falta === 0 ? 'Listo' : isFinite(r.mesesParaMeta) ? r.mesesParaMeta + ' meses' : 'Define un aporte', 'con ' + U.dinero(p.aporte) + ' al mes')]));
    fondoEl.appendChild(h('div', { cls: 'mon-barra', role: 'img', 'aria-label': U.num(r.pct, 0) + ' % del fondo' }, [h('i', { style: 'width:' + r.pct + '%;background:var(--c-ing)' })]));
  }
  /* ---- impuestos ---- */
  function pintarImp() {
    var p = plan(), anio = C.hoy().slice(0, 4), ms = D.movsBase().filter(function (m) { return m.fecha.slice(0, 4) === anio; }), ing = 0, gas = 0; ms.forEach(function (m) { if (m.tipo === 'ingreso') ing += m.monto; else gas += m.monto; });
    var base = p.impIng != null && p.impIng !== '' ? C.n(p.impIng) : ing, gb = p.impGas != null && p.impGas !== '' ? C.n(p.impGas) : gas;
    var r = C.simularImpuestos({ ingresos: base, gastos: gb, deducibleGastosPct: p.deducibleGastosPct, deduccionFija: p.deduccionFija, tasaPlana: p.tasaPlana, tramos: p.usarTramos ? p.tramos : null, otroSobreIngresosPct: p.otroPct });
    var res = impEl.res; res.textContent = '';
    res.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Base imponible', U.dinero(r.baseImponible), 'ingresos − gastos deducibles'), U.kpi('Impuesto estimado', U.dinero(r.total), U.pct(r.tasaEfectiva) + ' de tus ingresos', 'av'), U.kpi('Reserva sugerida', U.dinero(r.total), 'aparta este monto del año'), U.kpi('Queda después', U.dinero(r.netoDespues), 'ingresos − gastos − impuestos', 'bien')]));
    if (r.detalle.length) res.appendChild(U.det('Detalle por tramo', [U.tabla([{ t: 'Tramo', f: function (x) { return U.dinero(x.desde) + ' – ' + U.dinero(x.hasta); } }, { t: 'Tasa', f: function (x) { return U.pct(x.tasa); }, der: 1 }, { t: 'Impuesto', f: function (x) { return U.dinero(x.monto); }, der: 1 }], r.detalle)]));
    res.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Período usado: año ' + anio + (p.impIng != null && p.impIng !== '' ? ' (ingresos editados a mano)' : ' según tu libro') + '.' }));
  }
  function impuestosUI() {
    var p = plan(); impEl = h('div'); impEl.res = h('div', { 'aria-live': 'polite' });
    var chk = h('input', { type: 'checkbox', id: 'pl-tramos' }); chk.checked = !!p.usarTramos; chk.addEventListener('change', function () { p.usarTramos = chk.checked; guardar(); pintarImp(); tramosEl.hidden = !chk.checked; });
    var tramosEl = h('div'); tramosEl.hidden = !p.usarTramos;
    function pintaTramos() {
      tramosEl.textContent = ''; p.tramos.forEach(function (t, i) {
        var f = U.form([{ id: 'hasta', etq: 'Hasta (vacío = sin tope)', tipo: 'numero', min: 0, valor: t.hasta == null ? '' : t.hasta }, { id: 'tasa', etq: 'Tasa (%)', tipo: 'numero', min: 0, max: 100, valor: t.tasa }]);
        Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { t.hasta = f.refs.hasta.value === '' ? null : C.n(f.refs.hasta.value); t.tasa = C.n(f.refs.tasa.value); guardar(); pintarImp(); }); });
        tramosEl.appendChild(h('div', { cls: 'tr-fila', style: 'align-items:end' }, [f.el, U.btn('Quitar', function () { p.tramos.splice(i, 1); pintaTramos(); pintarImp(); guardar(); }, 'mon-btn-s', { 'aria-label': 'Quitar tramo ' + (i + 1) })]));
      }); tramosEl.appendChild(U.btn('+ Añadir tramo', function () { p.tramos.push({ hasta: null, tasa: 0 }); pintaTramos(); guardar(); }));
    }
    pintaTramos();
    var campos = h('div', { cls: 'tr-fila mon-campos' }, [campoPlan('impIng', 'Ingresos del año', { ph: 'auto (libro)', pinta: pintarImp }), campoPlan('impGas', 'Gastos del año', { ph: 'auto (libro)', pinta: pintarImp }), campoPlan('deducibleGastosPct', 'Gastos deducibles (%)', { max: 100, pinta: pintarImp }), campoPlan('deduccionFija', 'Deducción fija', { pinta: pintarImp }), campoPlan('tasaPlana', 'Tasa plana (%)', { max: 100, pinta: pintarImp, ayuda: 'Se usa si no activas tramos.' }), campoPlan('otroPct', 'Otro gravamen sobre ingresos (%)', { max: 100, pinta: pintarImp, ayuda: 'Por ejemplo un impuesto sobre ventas que tú defines.' })]);
    impEl.appendChild(U.nota('Simulador genérico: tú defines todas las tasas, tramos y deducciones. No refleja ninguna ley real ni sustituye a un contador; los impuestos varían por país.', true));
    impEl.appendChild(campos); impEl.appendChild(h('label', { cls: 'tr-chk', for: 'pl-tramos' }, [chk, 'Usar tramos progresivos en lugar de tasa plana'])); impEl.appendChild(tramosEl); impEl.appendChild(impEl.res); pintarImp();
    return impEl;
  }
  /* ---- ROI y financiamiento ---- */
  function roiUI() {
    return [U.calculadora({ id: 'pl-roi', titulo: 'ROI de un equipo', ayuda: 'Cuánto tarda en pagarse una cámara o un dron con el trabajo extra que te permite.', campos: [{ id: 'costo', etq: 'Costo del equipo', def: 1200 }, { id: 'ing', etq: 'Ingreso extra al mes que genera', def: 400 }, { id: 'cos', etq: 'Costos extra al mes (seguro, baterías, tu tiempo)', def: 100 }, { id: 'res', etq: 'Valor de reventa estimado', def: 400 }],
      calc: function (v) { var r = C.roiEquipo({ costo: v.costo, ingresoMes: v.ing, costoMes: v.cos }); return [['Neto mensual', U.dinero(r.neto)], ['Se recupera en', isFinite(r.meses) ? U.num(r.meses, 1) + ' meses' : 'No se recupera'], ['ROI a 12 meses', U.pct(r.roi12, 0)], ['ROI a 12 meses contando reventa', U.pct(v.costo > 0 ? (r.neto * 12 + v.res - v.costo) / v.costo * 100 : 0, 0)]]; } }),
      U.calculadora({ id: 'pl-prest', titulo: 'Financiar el equipo (amortización)', ayuda: 'Cuota fija mensual del sistema francés. No es una oferta: usa las condiciones reales de tu prestamista.', campos: [{ id: 'monto', etq: 'Monto financiado', def: 1200 }, { id: 'tasa', etq: 'Tasa anual (%)', def: 18, paso: 0.5 }, { id: 'n', etq: 'Meses', def: 12, min: 1 }, { id: 'ing', etq: 'Neto mensual que genera el equipo', def: 300 }],
        calc: function (v) { var n = Math.max(1, Math.round(v.n)), a = C.amortizacion(v.monto, v.tasa, n), libre = v.ing - a.cuota; return [['Cuota mensual', U.dinero(a.cuota)], ['Total pagado', U.dinero(a.total)], ['Intereses', U.dinero(a.totalInteres)], ['Queda cada mes tras la cuota', U.dinero(libre)], ['Interés del 1.er mes', U.dinero(a.filas[0].interes)]]; } })];
  }
  function pintarTodo() { pintarFlujo(); pintarPres(); pintarMeta(); pintarFondo(); pintarImp(); }
  P.iniciar = function (raiz) {
    flujoEl = h('div', { 'aria-live': 'polite' }); presEl = h('div'); metaEl = h('div'); fondoEl = h('div'); estacEl = h('div');
    raiz.appendChild(U.panel('Flujo de caja proyectado', [ctrlFlujo(), flujoEl], { sub: 'Tu saldo mes a mes con supuestos que tú ajustas. Es una proyección, no una predicción.' }));
    raiz.appendChild(U.panel('Estacionalidad', [estacEl], { sub: 'Algunos meses venden más (bodas, vacaciones, fin de año). El índice ajusta el ingreso proyectado.' }));
    raiz.appendChild(U.panel('Presupuesto mensual', [presEl], { sub: 'Cuánto planeas gastar por categoría frente a lo registrado este mes.' }));
    raiz.appendChild(U.panel('Meta de ingresos', [h('div', { cls: 'tr-fila mon-campos' }, [campoPlan('metaMes', 'Meta de ingreso mensual', { pinta: pintarMeta })]), metaEl]));
    raiz.appendChild(U.panel('Fondo de emergencia', [h('div', { cls: 'tr-fila mon-campos' }, [campoPlan('fondoMeses', 'Meses de gastos a cubrir', { min: 1, max: 24, pinta: pintarFondo }), campoPlan('ahorrado', 'Ya ahorrado', { pinta: pintarFondo }), campoPlan('aporte', 'Aporte mensual', { pinta: pintarFondo })]), fondoEl], { sub: 'Un colchón para meses sin trabajo; los ingresos de freelance son irregulares.' }));
    raiz.appendChild(U.panel('Simulador de impuestos y reserva', [impuestosUI()]));
    raiz.appendChild(U.panel('ROI de equipo y financiamiento', roiUI()));
    pintarEstac(); pintarTodo();
    D.on(function (c) { if (c === 'movimientos' || c === 'facturas' || c === 'null' || c === null) pintarTodo(); });
  };
})(window);
