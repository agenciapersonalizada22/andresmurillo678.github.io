/* Tarificador de servicios: tarifa/hora, equipo y depreciacion, precio de proyecto y cotizador con paquetes. window.MonTarifas */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, K = g.MonCatalogo, h = U.h, V = g.MonTarifas = {};
  var DEF = { ingresoDeseadoMes: 1500, gastosFijosMes: 250, seguroMes: 30, horasFacturablesMes: 80, reservaImpuestosPct: 20, costoKm: 0.35, horasJornada: 8, margenPct: 25 };
  var tar, resHora, eqEl, proyRes, proyForm, usados = {}, paqEl, ultimo = null, editEq = null;

  function eqActivos() { return D.lista('equipo').filter(function (e) { return e.activo !== false; }); }
  function depMesTotal() { return eqActivos().reduce(function (a, e) { return a + C.depreciacionMes(e.costo, e.residual, e.vidaMeses); }, 0); }
  function tarifaHora() { return C.tarifaHora({ ingresoDeseadoMes: tar.ingresoDeseadoMes, gastosFijosMes: tar.gastosFijosMes, seguroMes: tar.seguroMes, depreciacionMes: depMesTotal(), horasFacturablesMes: tar.horasFacturablesMes, reservaImpuestosPct: tar.reservaImpuestosPct }); }

  function pintarHora() {
    var th = tarifaHora(); resHora.textContent = '';
    resHora.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Tarifa por hora', U.dinero(th), 'para cubrir tu meta'), U.kpi('Tarifa por día', U.dinero(th * tar.horasJornada), tar.horasJornada + ' h'), U.kpi('Depreciación mensual de equipo', U.dinero(depMesTotal()), eqActivos().length + ' equipo(s)'), U.kpi('Horas de equilibrio', U.num(tar.horasFacturablesMes, 0) + ' h/mes', 'facturables')]));
    resHora.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Fórmula: (ingreso deseado + gastos fijos + seguro + depreciación) ÷ horas facturables ÷ (1 − reserva de impuestos). Es una referencia: compárala con el mercado.' }));
  }
  function formHora() {
    var f = U.form([{ id: 'ingresoDeseadoMes', etq: 'Ingreso neto deseado al mes', tipo: 'numero', min: 0, valor: tar.ingresoDeseadoMes }, { id: 'gastosFijosMes', etq: 'Gastos fijos al mes', tipo: 'numero', min: 0, valor: tar.gastosFijosMes }, { id: 'seguroMes', etq: 'Seguros al mes', tipo: 'numero', min: 0, valor: tar.seguroMes }, { id: 'horasFacturablesMes', etq: 'Horas facturables al mes', tipo: 'numero', min: 1, valor: tar.horasFacturablesMes, ayuda: 'Solo horas que cobras (no incluye administración ni búsqueda de clientes).' },
      { id: 'reservaImpuestosPct', etq: 'Reserva para impuestos (%)', tipo: 'numero', min: 0, max: 90, valor: tar.reservaImpuestosPct }, { id: 'costoKm', etq: 'Costo por km', tipo: 'numero', min: 0, valor: tar.costoKm }, { id: 'horasJornada', etq: 'Horas por jornada', tipo: 'numero', min: 1, valor: tar.horasJornada }]);
    Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { var v = f.val(); Object.keys(v).forEach(function (x) { tar[x] = C.n(v[x]); }); guardarTar(); pintarHora(); }); });
    return f.el;
  }
  var tg; function guardarTar() { clearTimeout(tg); tg = setTimeout(function () { D.cfg.tarifa = tar; D.guardarCfg(); }, 500); }

  /* ---- equipo ---- */
  function pintarEq() {
    eqEl.lista.textContent = ''; var es = D.lista('equipo');
    if (!es.length) eqEl.lista.appendChild(h('p', { cls: 'tr-vacio', txt: 'Añade tus cámaras, drones, baterías o luces para repartir su desgaste en cada trabajo.' }));
    else { var ul = h('ul', { cls: 'mon-lista' }); es.forEach(function (e) { ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: e.nombre }), h('small', { txt: U.dinero(e.costo) + ' · vida ' + e.vidaMeses + ' m · ' + e.usoHorasMes + ' h/mes · desgaste ' + U.dinero(C.depHora(e)) + '/h · ' + U.dinero(C.depreciacionMes(e.costo, e.residual, e.vidaMeses)) + '/mes' })]),
      U.btn('Editar', function () { editEq = e.id; eqEl.f.poner(e); eqEl.f.refs.nombre.focus(); }, 'mon-btn-s', { 'aria-label': 'Editar ' + e.nombre }), U.btn('Borrar', function () { if (g.confirm('¿Quitar «' + e.nombre + '»?')) D.borrar('equipo', e.id); }, 'mon-btn-s', { 'aria-label': 'Quitar ' + e.nombre })])); }); eqEl.lista.appendChild(ul); }
  }
  function equipoUI() {
    var f = U.form([{ id: 'nombre', etq: 'Equipo', tipo: 'text', maxlength: 60 }, { id: 'costo', etq: 'Costo de compra', tipo: 'numero', min: 0 }, { id: 'residual', etq: 'Valor residual', tipo: 'numero', min: 0, valor: 0, ayuda: 'Lo que crees que valdrá al final de su vida útil.' }, { id: 'vidaMeses', etq: 'Vida útil (meses)', tipo: 'numero', min: 1, valor: 36 }, { id: 'usoHorasMes', etq: 'Horas de uso al mes', tipo: 'numero', min: 0.5, valor: 10 }]);
    eqEl = { lista: h('div'), f: f };
    var imp = U.btn('Importar equipo del módulo Drones', async function () {
      var l = await D.equipoDrones(); if (!l.length) { T.aviso('No encontré equipo propio guardado en Drones. Añade el tuyo allí o aquí.', 'error'); return; }
      var n = 0; for (var i = 0; i < l.length; i++) { var e = l[i]; if (D.lista('equipo').some(function (x) { return x.nombre === e.nombre; })) continue; await D.guardar('equipo', { nombre: e.nombre, tipo: e.tipo, costo: C.n(e.precio || e.costo), residual: 0, vidaMeses: 36, usoHorasMes: 10 }); n++; }
      T.aviso(n + ' equipo(s) importado(s). Completa el costo y la vida útil.');
    });
    var btn = h('button', { type: 'button', cls: 'tr-btn mon-primario', id: 'eq-guardar', txt: 'Guardar equipo', on: { click: async function () { var v = f.val(); if (!v.nombre || !(v.costo >= 0)) { T.aviso('Indica nombre y costo.', 'error'); return; } if (editEq) v.id = editEq; await D.guardar('equipo', Object.assign({}, D.obtener('equipo', editEq) || {}, v)); editEq = null; f.poner({ residual: 0, vidaMeses: 36, usoHorasMes: 10 }); T.aviso('Equipo guardado.'); } } });
    pintarEq(); return [eqEl.lista, f.el, h('div', { cls: 'tr-acciones' }, [btn, imp])];
  }

  /* ---- proyecto ---- */
  function calcProyecto() {
    var v = proyForm.val(), eq = eqActivos().filter(function (e) { return usados[e.id] !== false; }).map(function (e) { return { nombre: e.nombre, costo: e.costo, residual: e.residual, vidaMeses: e.vidaMeses, usoHorasMes: e.usoHorasMes }; });
    var r = C.tarifaProyecto({ horasCampo: v.horasCampo, horasPost: v.horasPost, tarifaHora: v.tarifaHora || tarifaHora(), tarifaPost: v.tarifaPost === '' ? null : v.tarifaPost, equipo: eq, seguroMes: tar.seguroMes, horasFacturablesMes: tar.horasFacturablesMes, km: v.km, costoKm: tar.costoKm, peajes: v.peajes, ciclosBateria: v.ciclos, ciclosVidaBateria: v.vidaBat, costoBateria: v.costoBat, consumibles: v.consumibles, margenPct: v.margenPct });
    ultimo = { r: r, v: v }; proyRes.textContent = '';
    proyRes.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Precio sugerido', U.dinero(r.precio), 'antes de impuestos'), U.kpi('Utilidad', U.dinero(r.utilidad), U.pct(r.margenReal * 100, 0) + ' de margen', 'bien'), U.kpi('Precio por hora', U.dinero(r.porHora), 'sobre ' + U.num(v.horasCampo + v.horasPost, 1) + ' h'), U.kpi('Por jornada', U.dinero(r.porDia), tar.horasJornada + ' h')]));
    proyRes.appendChild(U.tabla([{ t: 'Concepto', k: 'c' }, { t: 'Monto', k: 'm', der: 1 }], [['Mano de obra en campo', r.manoObra], ['Postproducción', r.post], ['Depreciación de equipo', r.depreciacion], ['Seguro prorrateado', r.seguro], ['Desplazamiento', r.desplazamiento], ['Baterías y consumibles', r.consumibles], ['Costo total', r.costoTotal], ['Margen', r.utilidad], ['Precio', r.precio]].map(function (x) { return { c: x[0], m: U.dinero(x[1]) }; }), { etq: 'Desglose del precio' }));
  }
  function proyectoUI() {
    proyForm = U.form([{ id: 'nombre', etq: 'Nombre del servicio', tipo: 'text', valor: 'Vuelo de dron + vídeo corto', maxlength: 80, cls: 'ancho' }, { id: 'horasCampo', etq: 'Horas en campo / rodaje', tipo: 'numero', min: 0, valor: 3 }, { id: 'horasPost', etq: 'Horas de postproducción', tipo: 'numero', min: 0, valor: 5 }, { id: 'tarifaHora', etq: 'Tarifa por hora (vacío = calculada)', tipo: 'numero', min: 0 }, { id: 'tarifaPost', etq: 'Tarifa postproducción (vacío = igual)', tipo: 'numero', min: 0 },
      { id: 'km', etq: 'Kilómetros ida y vuelta', tipo: 'numero', min: 0, valor: 40 }, { id: 'peajes', etq: 'Peajes y estacionamiento', tipo: 'numero', min: 0, valor: 0 }, { id: 'ciclos', etq: 'Ciclos de batería usados', tipo: 'numero', min: 0, valor: 3 }, { id: 'costoBat', etq: 'Costo de una batería', tipo: 'numero', min: 0, valor: 120 }, { id: 'vidaBat', etq: 'Ciclos de vida de la batería', tipo: 'numero', min: 1, valor: 200 }, { id: 'consumibles', etq: 'Otros consumibles', tipo: 'numero', min: 0, valor: 5 }, { id: 'margenPct', etq: 'Margen deseado sobre el precio (%)', tipo: 'numero', min: 0, max: 90, valor: tar.margenPct }]);
    Object.keys(proyForm.refs).forEach(function (k) { proyForm.refs[k].addEventListener('input', calcProyecto); });
    proyRes = h('div', { 'aria-live': 'polite' });
    var eqSel = h('div', { cls: 'tr-fila' });
    function pintaSel() { eqSel.textContent = ''; var es = eqActivos(); if (!es.length) { eqSel.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Sin equipo cargado: la depreciación no se incluirá.' })); return; } es.forEach(function (e) { var c = h('input', { type: 'checkbox', id: 'eqs-' + e.id }); c.checked = usados[e.id] !== false; c.addEventListener('change', function () { usados[e.id] = c.checked; calcProyecto(); }); eqSel.appendChild(h('label', { cls: 'tr-chk', for: 'eqs-' + e.id, style: 'flex:1 1 200px' }, [c, e.nombre])); }); }
    pintaSel(); D.on(function (c) { if (c === 'equipo') { pintaSel(); calcProyecto(); } });
    var acc = h('div', { cls: 'tr-acciones' }, [U.btn('Guardar como paquete', async function () {
      if (!ultimo) return; var r = ultimo.r, k = r.costoTotal > 0 ? r.precio / r.costoTotal : 1, nm = ultimo.v.nombre || 'Servicio';
      var base = (r.manoObra + r.depreciacion + r.seguro + r.consumibles) * k, lin = [{ desc: nm + ' · captura y servicio en sitio (' + U.num(ultimo.v.horasCampo, 1) + ' h)', cant: 1, precio: C.r2(base) }];
      if (r.post > 0) lin.push({ desc: 'Postproducción (' + U.num(ultimo.v.horasPost, 1) + ' h)', cant: 1, precio: C.r2(r.post * k) }); if (r.desplazamiento > 0) lin.push({ desc: 'Desplazamiento', cant: 1, precio: C.r2(r.desplazamiento * k) });
      await D.guardar('paquetes', { nombre: nm, lineas: lin }); T.aviso('Paquete guardado.');
    }), U.btn('Crear cotización con este precio', function () { if (!ultimo) return; var r = ultimo.r, k = r.costoTotal > 0 ? r.precio / r.costoTotal : 1; g.MonFacturas.nuevaDesdeLineas([{ desc: (ultimo.v.nombre || 'Servicio'), cant: 1, precio: C.r2(r.precio) }], ''); g.MonApp.ir('facturas'); })]);
    calcProyecto();
    return [proyForm.el, h('h3', { txt: 'Equipo que usarás' }), eqSel, proyRes, acc];
  }

  /* ---- paquetes ---- */
  function pintarPaq() {
    paqEl.textContent = '';
    var mult = parseFloat(paqEl.mult.value) || 1, todos = K.PAQUETES.map(function (p) { return { p: p, propio: false }; }).concat(D.lista('paquetes').map(function (p) { return { p: p, propio: true }; }));
    var ul = h('ul', { cls: 'mon-lista' });
    todos.forEach(function (x) {
      var tot = x.p.lineas.reduce(function (a, l) { return a + l.cant * l.precio; }, 0) * (x.propio ? 1 : mult);
      ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: x.p.nombre }), h('small', { txt: x.p.lineas.map(function (l) { return l.desc; }).join(' · ') })]), h('strong', { txt: U.dinero(tot) }),
        U.btn('Cotizar', function () { g.MonFacturas.nuevaDesdeLineas(x.p.lineas.map(function (l) { return { desc: l.desc, cant: l.cant, precio: C.r2(l.precio * (x.propio ? 1 : mult)) }; }), ''); g.MonApp.ir('facturas'); }, 'mon-btn-s', { 'aria-label': 'Cotizar ' + x.p.nombre }),
        x.propio ? U.btn('Borrar', function () { if (g.confirm('¿Borrar el paquete?')) D.borrar('paquetes', x.p.id); }, 'mon-btn-s', { 'aria-label': 'Borrar paquete ' + x.p.nombre }) : null]));
    });
    paqEl.appendChild(ul);
  }
  V.iniciar = function (raiz) {
    tar = Object.assign({}, DEF, D.cfg.tarifa || {}); resHora = h('div'); paqEl = h('div');
    raiz.appendChild(U.panel('Tu tarifa base', [formHora(), resHora], { sub: 'Cuánto necesitas cobrar por hora para llegar a tu meta.' }));
    raiz.appendChild(U.panel('Equipo y depreciación', equipoUI(), { sub: 'Reparte el costo de cámaras y drones por hora de uso.' }));
    raiz.appendChild(U.panel('Precio de un proyecto', proyectoUI(), { sub: 'Suma mano de obra, postproducción, equipo, seguro, desplazamiento y consumibles; luego aplica tu margen.' }));
    var mult = U.campo('Multiplicador de precios de las plantillas', { tipo: 'numero', min: 0.1, step: '0.05', valor: 1, ayuda: 'Las plantillas traen precios de ejemplo: ajústalos a tu mercado.', alCambiar: pintarPaq });
    paqEl.mult = mult.input;
    raiz.appendChild(U.panel('Cotizador con paquetes', [mult.el, paqEl], { sub: 'Elige un paquete para abrir una cotización lista para editar.' }));
    pintarHora(); pintarPaq();
    D.on(function (c) { if (c === 'equipo') { pintarEq(); pintarHora(); } if (c === 'paquetes') pintarPaq(); });
  };
})(window);
