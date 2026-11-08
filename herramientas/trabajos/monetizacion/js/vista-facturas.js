/* Facturas y cotizaciones imprimibles, cobros pendientes con recordatorios y reglas exportables a Automatizaciones. window.MonFacturas */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, K = g.MonCatalogo, X = g.MonDoc, h = U.h, F = g.MonFacturas = {};
  var raiz, listaEl, pendEl, edEl, doc = null, filtro = { tipo: '', estado: '' }, nuevoNum = false;
  var ESTADOS = { borrador: 'Borrador', enviada: 'Enviada', parcial: 'Pago parcial', pagada: 'Pagada', vencida: 'Vencida', cancelada: 'Cancelada', aceptada: 'Aceptada' };

  function chip(f) { var e = D.estadoDoc(f); return h('span', { cls: 'mon-chip ' + e, txt: ESTADOS[e] || e }); }
  function nombreCli(id) { var c = D.obtener('clientes', id); return c ? c.nombre : '(sin cliente)'; }

  /* ---------- cobros pendientes y recordatorios ---------- */
  function textoRecordatorio(p) {
    var venc = p.dias > 0 ? 'venció hace ' + p.dias + ' día(s) (' + U.fecha(p.vence) + ')' : 'vence el ' + U.fecha(p.vence);
    return 'Hola' + (p.cliente ? ' ' + p.cliente : '') + ', te escribo para recordarte que la factura ' + p.numero + ' por ' + U.dinero(p.saldoOrig, p.moneda) + ' ' + venc + '. Si ya realizaste el pago, ignora este mensaje y te agradezco. Quedo atento. ¡Gracias!';
  }
  function reglasAutomatizacion() {
    var pend = D.porCobrar().filter(function (p) { return p.dias > 0; }), lista = pend.length ? pend.map(function (p) { return '• ' + p.numero + ' ' + p.cliente + ' ' + U.dinero(p.saldoOrig, p.moneda) + ' (' + p.dias + ' d)'; }).join('\n') : 'Sin cobros vencidos en el momento de exportar.';
    function nodo(id, tipo, x, y, cfg) { return { id: id, tipo: tipo, x: x, y: y, cfg: cfg }; }
    return [{
      formato: 'trabajos-automatizaciones', version: 1, nombre: 'Recordatorio de cobro (lun-vie 9:00)', vars: { origen: 'monetizacion' },
      nodos: [nodo('n1', 'hora_dia', 40, 40, { hora: '09:00', dias: '1,2,3,4,5' }), nodo('n2', 'plantilla', 300, 40, { texto: 'Cobros vencidos al {{ahora.fecha}} (copia del libro al exportar; vuelve a exportar para actualizar):\n' + lista }), nodo('n3', 'notificacion', 570, 10, { titulo: 'Cobros pendientes', texto: '{{ultimo.texto}}' }), nodo('n4', 'voz', 570, 120, { texto: 'Revisa tus cobros pendientes en Monetización.', idioma: 'es-ES' })],
      aristas: [{ de: 'n1', sal: 'sal', a: 'n2' }, { de: 'n2', sal: 'sal', a: 'n3' }, { de: 'n2', sal: 'sal', a: 'n4' }]
    }, {
      formato: 'trabajos-automatizaciones', version: 1, nombre: 'Cierre de mes: registra y factura', vars: { origen: 'monetizacion' },
      nodos: [nodo('n1', 'hora_dia', 40, 40, { hora: '18:00', dias: '5' }), nodo('n2', 'notificacion', 300, 40, { titulo: 'Revisión financiera', texto: 'Viernes: registra tus movimientos, factura lo pendiente y revisa la reserva de impuestos.' })],
      aristas: [{ de: 'n1', sal: 'sal', a: 'n2' }]
    }];
  }
  function pintarPend() {
    var p = D.porCobrar(); pendEl.textContent = '';
    if (!p.length) { pendEl.appendChild(h('p', { cls: 'tr-vacio', txt: 'No hay cobros pendientes. Las facturas «Enviadas» con saldo aparecen aquí.' })); }
    else {
      var tot = p.reduce(function (a, x) { return a + x.saldo; }, 0), ven = p.filter(function (x) { return x.dias > 0; }).reduce(function (a, x) { return a + x.saldo; }, 0);
      pendEl.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Por cobrar', U.dinero(tot), p.length + ' factura(s)'), U.kpi('Vencido', U.dinero(ven), '', ven > 0 ? 'mal' : 'bien')]));
      var ul = h('ul', { cls: 'mon-lista' });
      p.forEach(function (x) {
        ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: x.numero + ' · ' + (x.cliente || 'sin cliente') }), h('small', { txt: (x.dias > 0 ? 'Vencida hace ' + x.dias + ' día(s)' : x.dias === 0 ? 'Vence hoy' : 'Vence en ' + (-x.dias) + ' día(s)') + ' · ' + U.fecha(x.vence) })]), h('span', { cls: x.dias > 0 ? 'mon-gas' : '', txt: U.dinero(x.saldoOrig, x.moneda) }),
          U.btn('Recordatorio', function () { recordatorio(x); }, 'mon-btn-s', { 'aria-label': 'Redactar recordatorio de ' + x.numero }), U.btn('Abrir', function () { abrir(D.obtener('facturas', x.id)); }, 'mon-btn-s', { 'aria-label': 'Abrir ' + x.numero })]));
      });
      pendEl.appendChild(ul);
    }
    pendEl.appendChild(h('div', { cls: 'tr-acciones' }, [U.btn('Exportar reglas para Automatizaciones (JSON)', function () { U.descargarTexto(JSON.stringify(reglasAutomatizacion(), null, 2), 'monetizacion.automatizaciones.json', 'application/json'); T.aviso('Reglas exportadas: impórtalas en Trabajos > Automatizaciones > Importar.'); })]));
    pendEl.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Los recordatorios son mensajes que tú envías; esta herramienta no envía nada por sí sola. La regla exportada avisa en tu dispositivo.' }));
  }
  function recordatorio(p) {
    var c = D.obtener('clientes', (D.obtener('facturas', p.id) || {}).cliente) || {}, txt = textoRecordatorio(p), ta = h('textarea', { rows: 5, 'aria-label': 'Texto del recordatorio' }); ta.value = txt;
    var dlg = h('dialog', { cls: 'mon-dlg', 'aria-label': 'Recordatorio de cobro' }, [h('h3', { txt: 'Recordatorio · ' + p.numero }), ta, h('div', { cls: 'tr-acciones' }, [
      U.btn('Copiar', function () { ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { T.aviso('Copiado.'); }, function () { document.execCommand('copy'); T.aviso('Copiado.'); }); } catch (e) { document.execCommand('copy'); } }),
      c.email ? h('a', { cls: 'tr-btn', href: 'mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent('Recordatorio de pago ' + p.numero) + '&body=' + encodeURIComponent(txt), txt: 'Abrir en correo' }) : null,
      U.btn('Cerrar', function () { dlg.close(); dlg.remove(); })])]);
    document.body.appendChild(dlg); dlg.showModal();
  }

  /* ---------- lista ---------- */
  function pintarLista() {
    var ds = D.lista('facturas').filter(function (f) { return (!filtro.tipo || f.tipo === filtro.tipo) && (!filtro.estado || D.estadoDoc(f) === filtro.estado); }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    listaEl.textContent = '';
    if (!ds.length) { listaEl.appendChild(h('p', { cls: 'tr-vacio', txt: 'Sin documentos. Crea una factura o una cotización.' })); return; }
    var ul = h('ul', { cls: 'mon-lista' });
    ds.forEach(function (f) { var t = C.totalesDoc(f); ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: (f.numero || '(sin número)') + ' · ' + nombreCli(f.cliente) }), h('small', { txt: (f.tipo === 'factura' ? 'Factura' : 'Cotización') + ' · ' + U.fecha(f.fecha) })]), chip(f), h('strong', { txt: U.dinero(t.total, f.moneda) }), U.btn('Abrir', function () { abrir(f); }, 'mon-btn-s', { 'aria-label': 'Abrir ' + (f.numero || 'documento') })])); });
    listaEl.appendChild(ul);
  }

  /* ---------- editor ---------- */
  function nuevoDoc(tipo, base) {
    var hoy = C.hoy(), o = Object.assign({ tipo: tipo, fecha: hoy, vence: C.sumDias(hoy, tipo === 'factura' ? C.n(D.cfg.diasVence, 15) : 15), moneda: D.cfg.moneda, estado: 'borrador', lineas: [{ desc: '', cant: 1, precio: 0 }], impuestos: JSON.parse(JSON.stringify(D.cfg.impuestosDoc || [])), descuentoPct: 0, terminos: D.cfg.terminos || K.TERMINOS, notas: '', pagos: [], qrPago: '', papel: 'A4', cliente: '', proyecto: '' }, base || {});
    return o;
  }
  F.nuevaDesdeLineas = function (lineas, titulo) { var d = nuevoDoc('cotizacion', { lineas: lineas, notas: titulo || '' }); abrir(d); return d; };
  function ctxDoc(d) {
    var p = D.obtener('proyectos', d.proyecto), e = Object.assign({}, D.cfg.emisor);
    return { emisor: e, cliente: D.obtener('clientes', d.cliente) || {}, proyecto: p ? p.nombre : '', fmt: function (v) { return U.dinero(v, d.moneda); }, estado: d.numero ? ESTADOS[D.estadoDoc(d)] : 'Borrador' };
  }
  function paginasDe(d) { var m = X.medidas(d.papel); return X.factura(d, ctxDoc(d), m.W, m.H); }
  function abrir(d) {
    doc = JSON.parse(JSON.stringify(d)); nuevoNum = !doc.id; edEl.hidden = false; pintarEditor(); edEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cerrar() { doc = null; edEl.hidden = true; edEl.textContent = ''; }
  function pintarEditor() {
    edEl.textContent = '';
    var d = doc, esFac = d.tipo === 'factura', t = C.totalesDoc(d), vista = h('div', { cls: 'mon-vista-doc', 'aria-label': 'Vista previa' }), totalesEl = h('div');
    var cab = U.form([
      { id: 'numero', etq: 'Número', tipo: 'text', maxlength: 30, valor: d.numero || '', ayuda: d.numero ? '' : 'Vacío: se asigna ' + C.siguienteNumero(D.cfg.numeracion[d.tipo]).numero + ' al guardar' },
      { id: 'fecha', etq: 'Fecha', tipo: 'date', valor: d.fecha }, { id: 'vence', etq: esFac ? 'Vence' : 'Válida hasta', tipo: 'date', valor: d.vence },
      { id: 'estado', etq: 'Estado', tipo: 'select', op: esFac ? [['borrador', 'Borrador'], ['enviada', 'Enviada'], ['cancelada', 'Cancelada']] : [['borrador', 'Borrador'], ['enviada', 'Enviada'], ['aceptada', 'Aceptada'], ['cancelada', 'Cancelada']], valor: d.estado },
      { id: 'cliente', etq: 'Cliente', tipo: 'select', op: [['', '(sin cliente)']].concat(D.lista('clientes').map(function (c) { return [c.id, c.nombre]; })), valor: d.cliente },
      { id: 'proyectoN', etq: 'Proyecto', tipo: 'text', list: 'mon-proyectos', maxlength: 60, valor: (D.obtener('proyectos', d.proyecto) || {}).nombre || '' },
      { id: 'moneda', etq: 'Moneda', tipo: 'text', list: 'mon-monedas', maxlength: 4, valor: d.moneda }, { id: 'papel', etq: 'Papel', tipo: 'select', op: [['A4', 'A4'], ['Carta', 'Carta']], valor: d.papel },
      { id: 'descuentoPct', etq: 'Descuento global (%)', tipo: 'numero', min: 0, max: 100, valor: d.descuentoPct }, { id: 'categoria', etq: 'Categoría al cobrar', tipo: 'select', op: K.CAT_INGRESO.map(function (c) { return [c, c]; }), valor: d.categoria || 'Servicios' }
    ]);
    function leerCab() { var v = cab.val(); d.numero = v.numero; d.fecha = v.fecha; d.vence = v.vence; d.estado = v.estado; d.cliente = v.cliente; d.moneda = (v.moneda || D.cfg.moneda).toUpperCase(); d.papel = v.papel; d.descuentoPct = v.descuentoPct || 0; d.categoria = v.categoria; d.proyectoN = v.proyectoN; }
    F.leer = leerCab; Object.keys(cab.refs).forEach(function (k) { cab.refs[k].addEventListener('input', function () { leerCab(); pintaTot(); }); });
    // lineas
    var lineasEl = h('div');
    function pintaLineas() {
      lineasEl.textContent = '';
      d.lineas.forEach(function (ln, i) {
        var f = U.form([{ id: 'desc', etq: 'Descripción', tipo: 'text', maxlength: 200, valor: ln.desc, cls: 'mon-desc' }, { id: 'cant', etq: 'Cant.', tipo: 'numero', min: 0, valor: ln.cant }, { id: 'precio', etq: 'Precio', tipo: 'numero', min: 0, valor: ln.precio }]);
        var fila = h('div', { cls: 'mon-linea' }); [].slice.call(f.el.children).forEach(function (c) { fila.appendChild(c); });
        Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { ln.desc = f.refs.desc.value; ln.cant = C.n(f.refs.cant.value); ln.precio = C.n(f.refs.precio.value); pintaTot(); }); });
        fila.appendChild(U.btn('✕', function () { d.lineas.splice(i, 1); if (!d.lineas.length) d.lineas.push({ desc: '', cant: 1, precio: 0 }); pintaLineas(); pintaTot(); }, 'mon-btn-s', { 'aria-label': 'Quitar línea ' + (i + 1) }));
        lineasEl.appendChild(fila);
      });
    }
    // impuestos
    var impEl = h('div');
    function pintaImp() {
      impEl.textContent = '';
      d.impuestos.forEach(function (im, i) {
        var f = U.form([{ id: 'nombre', etq: 'Impuesto o retención', tipo: 'text', maxlength: 30, valor: im.nombre }, { id: 'pct', etq: '%', tipo: 'numero', min: 0, max: 100, valor: im.pct }, { id: 'ret', etq: 'Tipo', tipo: 'select', op: [['0', 'Se suma'], ['1', 'Se resta (retención)']], valor: im.retencion ? '1' : '0' }]);
        Object.keys(f.refs).forEach(function (k) { f.refs[k].addEventListener('input', function () { im.nombre = f.refs.nombre.value; im.pct = C.n(f.refs.pct.value); im.retencion = f.refs.ret.value === '1'; pintaTot(); }); });
        impEl.appendChild(h('div', { cls: 'tr-fila', style: 'align-items:end' }, [f.el, U.btn('Quitar', function () { d.impuestos.splice(i, 1); pintaImp(); pintaTot(); }, 'mon-btn-s', { 'aria-label': 'Quitar impuesto ' + (im.nombre || i + 1) })]));
      });
    }
    function pintaTot() {
      var t2 = C.totalesDoc(d); totalesEl.textContent = '';
      totalesEl.appendChild(h('dl', { cls: 'mon-res' }, [['Subtotal', t2.subtotal], ['Descuento', -t2.descuento]].concat(t2.impuestos.map(function (i) { return [i.nombre + ' ' + U.num(i.pct) + ' %', i.monto]; })).concat([['Total', t2.total]]).concat(t2.pagado ? [['Pagado', -t2.pagado], ['Saldo', t2.saldo]] : []).map(function (r) { return h('div', {}, [h('dt', { txt: r[0] }), h('dd', { txt: U.dinero(r[1], d.moneda) })]); })));
    }
    var extra = U.form([{ id: 'notas', etq: 'Notas para el cliente', tipo: 'textarea', rows: 2, valor: d.notas, cls: 'ancho' }, { id: 'terminos', etq: 'Términos y condiciones', tipo: 'textarea', rows: 4, valor: d.terminos, cls: 'ancho' }, { id: 'qrPago', etq: 'QR de pago (opcional): enlace o dato que quieras codificar', tipo: 'text', maxlength: 300, valor: d.qrPago, cls: 'ancho', ayuda: 'Es solo un código con el texto que escribas (por ejemplo un enlace de cobro tuyo). Aquí no se procesan pagos.' }]);
    Object.keys(extra.refs).forEach(function (k) { extra.refs[k].addEventListener('input', function () { var v = extra.val(); d.notas = v.notas; d.terminos = v.terminos; d.qrPago = v.qrPago; }); });
    pintaLineas(); pintaImp(); pintaTot();
    edEl.appendChild(U.panel((d.id ? 'Editar ' : 'Nueva ') + (esFac ? 'factura' : 'cotización'), [cab.el,
      h('h3', { txt: 'Líneas' }), lineasEl, U.btn('+ Añadir línea', function () { d.lineas.push({ desc: '', cant: 1, precio: 0 }); pintaLineas(); }),
      h('h3', { txt: 'Impuestos (los defines tú)' }), impEl, U.btn('+ Añadir impuesto o retención', function () { d.impuestos.push({ nombre: 'Impuesto', pct: 0 }); pintaImp(); }),
      U.nota('Las tasas son datos que escribes tú; no se codifica ninguna ley. Valida con tu contador qué aplica en tu país.', true),
      totalesEl, extra.el, esFac && d.id ? pagosUI(d, function () { pintarEditor(); }) : null,
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn mon-primario', id: 'fa-guardar', txt: 'Guardar', on: { click: function () { guardar().catch(function (e) { T.aviso(e.message, 'error'); }); } } }), U.btn('Vista previa', function () { leerCab(); X.vista(vista, paginasDe(d), d.papel); }), U.btn('Imprimir / guardar PDF', function () { leerCab(); X.imprimir(paginasDe(d), d.papel); }),
        !esFac && d.id ? U.btn('Convertir en factura', convertir) : null, d.id ? U.btn('Duplicar', duplicar) : null, d.id ? U.btn('Borrar', function () { if (g.confirm('¿Borrar este documento?')) { D.borrar('facturas', d.id); cerrar(); } }, 'mon-peligro') : null, U.btn('Cerrar', cerrar)]),
      h('p', { cls: 'tr-ayuda', txt: 'Para PDF elige «Guardar como PDF» en el diálogo de impresión. Documento comercial de apoyo: no sustituye comprobantes fiscales oficiales.' }), vista], { id: 'fa-editor' }));
  }
  function pagosUI(d, refrescar) {
    var t = C.totalesDoc(d), f = U.form([{ id: 'fecha', etq: 'Fecha del pago', tipo: 'date', valor: C.hoy() }, { id: 'monto', etq: 'Monto cobrado', tipo: 'dinero', min: 0, valor: t.saldo > 0 ? t.saldo : '' }, { id: 'mov', etq: 'Registrar como ingreso en el libro', tipo: 'select', op: [['1', 'Sí'], ['0', 'No']] }]);
    return U.det('Pagos recibidos (' + (d.pagos || []).length + ') · saldo ' + U.dinero(t.saldo, d.moneda), [h('ul', { cls: 'mon-lista' }, (d.pagos || []).map(function (p) { return h('li', { cls: 'mon-item' }, [U.fecha(p.fecha) + ' · ' + U.dinero(p.monto, d.moneda)]); })), f.el,
      U.btn('Registrar pago', async function () { var v = f.val(); if (!(v.monto > 0)) { T.aviso('Indica el monto cobrado.', 'error'); return; } var guardado = D.obtener('facturas', d.id); await D.registrarPago(guardado, v.monto, v.fecha, v.mov === '1'); doc = JSON.parse(JSON.stringify(D.obtener('facturas', d.id))); T.aviso('Pago registrado' + (v.mov === '1' ? ' y añadido al libro' : '') + '.'); refrescar(); })], !!(d.pagos || []).length);
  }
  async function guardar() {
    if (F.leer) F.leer(); var d = doc; if (!d.lineas.some(function (l) { return l.desc || l.precio; })) throw new Error('Añade al menos una línea con descripción o precio.');
    if (d.proyectoN) { var p = D.lista('proyectos').filter(function (x) { return x.nombre.toLowerCase() === d.proyectoN.toLowerCase(); })[0]; d.proyecto = (p || await D.guardar('proyectos', { nombre: d.proyectoN })).id; } else d.proyecto = '';
    delete d.proyectoN;
    if (!d.numero) d.numero = await D.numeroSiguiente(d.tipo, d.fecha);
    if (d.estado === 'borrador' && D.estadoDoc(d) === 'pagada') d.estado = 'enviada';
    var r = await D.guardar('facturas', d); doc = JSON.parse(JSON.stringify(r)); T.aviso('Guardado: ' + r.numero); pintarEditor();
  }
  async function convertir() {
    var d = JSON.parse(JSON.stringify(doc)); d.tipo = 'factura'; d.origen = d.id; delete d.id; d.numero = await D.numeroSiguiente('factura', C.hoy()); d.fecha = C.hoy(); d.vence = C.sumDias(d.fecha, C.n(D.cfg.diasVence, 15)); d.estado = 'borrador'; d.pagos = [];
    doc = await D.guardar('facturas', d); T.aviso('Factura creada: ' + doc.numero); doc = JSON.parse(JSON.stringify(doc)); pintarEditor();
  }
  async function duplicar() { var d = JSON.parse(JSON.stringify(doc)); delete d.id; d.numero = await D.numeroSiguiente(d.tipo, C.hoy()); d.fecha = C.hoy(); d.estado = 'borrador'; d.pagos = []; d.vence = C.sumDias(d.fecha, 15); var r = await D.guardar('facturas', d); T.aviso('Duplicado como ' + r.numero); abrir(r); }

  F.iniciar = function (r) {
    raiz = r; pendEl = h('div'); listaEl = h('div'); edEl = h('div', { hidden: true });
    var ff = U.form([{ id: 'tipo', etq: 'Tipo', tipo: 'select', op: [['', 'Todos'], ['factura', 'Facturas'], ['cotizacion', 'Cotizaciones']], alCambiar: function (v) { filtro.tipo = v; pintarLista(); } }, { id: 'estado', etq: 'Estado', tipo: 'select', op: [['', 'Todos']].concat(Object.keys(ESTADOS).map(function (k) { return [k, ESTADOS[k]]; })), alCambiar: function (v) { filtro.estado = v; pintarLista(); } }]);
    raiz.appendChild(U.panel('Cobros pendientes', [pendEl], { sub: 'Facturas enviadas con saldo por cobrar, ordenadas por vencimiento.' }));
    raiz.appendChild(U.panel('Documentos', [h('div', { cls: 'tr-acciones', style: 'margin-top:0' }, [h('button', { type: 'button', cls: 'tr-btn mon-primario', id: 'fa-nueva', txt: '+ Nueva factura', on: { click: function () { abrir(nuevoDoc('factura')); } } }), h('button', { type: 'button', cls: 'tr-btn', id: 'fa-nuevac', txt: '+ Nueva cotización', on: { click: function () { abrir(nuevoDoc('cotizacion')); } } })]), ff.el, listaEl]));
    raiz.appendChild(edEl);
    pintarPend(); pintarLista();
    D.on(function (c) { if (c === 'facturas' || c === 'config' || c === 'clientes' || c === null) { pintarPend(); pintarLista(); } });
  };
})(window);
