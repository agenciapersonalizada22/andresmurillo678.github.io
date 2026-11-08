/* Libro de ingresos y gastos: movimientos, recurrentes, clientes/proyectos y CSV. window.MonLibro */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, K = g.MonCatalogo, h = U.h, L = g.MonLibro = {};
  var filtro = { mes: '', tipo: '', proyecto: '', q: '' }, editId = null, fm, lista, resumen, selMon, fr, recLista;

  function cats(tipo) { var extra = D.cfg.categorias[tipo === 'gasto' ? 'gasto' : 'ingreso'] || []; return (tipo === 'gasto' ? K.CAT_GASTO : K.CAT_INGRESO).concat(extra); }
  async function ent(col, nombre) {
    nombre = (nombre || '').trim(); if (!nombre) return undefined;
    var e = D.lista(col).filter(function (x) { return x.nombre.toLowerCase() === nombre.toLowerCase(); })[0];
    return (e || await D.guardar(col, { nombre: nombre })).id;
  }
  function nombreEnt(col, id) { var e = D.obtener(col, id); return e ? e.nombre : ''; }
  function defsMov() {
    return [
      { id: 'tipo', etq: 'Tipo', tipo: 'select', op: [['ingreso', 'Ingreso'], ['gasto', 'Gasto']], valor: 'ingreso', alCambiar: function () { recat(); } },
      { id: 'fecha', etq: 'Fecha', tipo: 'date', valor: C.hoy() },
      { id: 'monto', etq: 'Monto', tipo: 'dinero', min: 0, step: '0.01' },
      { id: 'moneda', etq: 'Moneda', tipo: 'text', list: 'mon-monedas', maxlength: 4, valor: D.cfg.moneda },
      { id: 'categoria', etq: 'Categoría', tipo: 'select', op: [] },
      { id: 'fuente', etq: 'Fuente de ingreso', tipo: 'select', op: [['', '—']].concat(K.FUENTES.map(function (f) { return [f.nombre, f.nombre]; })).concat([['Otro', 'Otro']]) },
      { id: 'proyecto', etq: 'Proyecto', tipo: 'text', list: 'mon-proyectos', maxlength: 60 },
      { id: 'cliente', etq: 'Cliente', tipo: 'text', list: 'mon-clientes', maxlength: 60 },
      { id: 'canal', etq: 'Canal', tipo: 'text', maxlength: 40, ayuda: 'Ej.: YouTube, TikTok, web' },
      { id: 'nota', etq: 'Nota', tipo: 'text', maxlength: 160, cls: 'ancho' }
    ];
  }
  function recat() {
    var t = fm.refs.tipo.value, c = fm.refs.categoria, ant = c.value; c.textContent = '';
    cats(t).forEach(function (x) { c.appendChild(h('option', { value: x, txt: x })); }); if (cats(t).indexOf(ant) >= 0) c.value = ant;
    fm.refs.fuente.closest('.mon-campo').hidden = t !== 'ingreso';
  }
  function filtrados() {
    var q = filtro.q.toLowerCase();
    return D.movsBase().filter(function (x) {
      return (!filtro.mes || C.mes(x.fecha) === filtro.mes) && (!filtro.tipo || x.tipo === filtro.tipo) && (!filtro.proyecto || x.proyecto === filtro.proyecto) &&
        (!q || [x.nota, x.categoria, x.clienteN, x.proyectoN, x.canal, x.fuente].join(' ').toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b._t || 0) - (a._t || 0); });
  }
  async function guardar() {
    var v = fm.val(); if (!(v.monto > 0)) { T.aviso('Escribe un monto mayor que cero.', 'error'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) { T.aviso('Elige una fecha válida.', 'error'); return; }
    var o = editId ? Object.assign({}, D.obtener('movimientos', editId)) : {};
    Object.assign(o, { tipo: v.tipo, fecha: v.fecha, monto: v.monto, moneda: (v.moneda || D.cfg.moneda).toUpperCase(), categoria: v.categoria, fuente: v.tipo === 'ingreso' ? v.fuente : '', canal: v.canal, nota: v.nota, proyecto: await ent('proyectos', v.proyecto), cliente: await ent('clientes', v.cliente) });
    await D.guardar('movimientos', o); T.aviso(editId ? 'Movimiento actualizado.' : 'Movimiento guardado.'); limpiar();
  }
  function limpiar() { editId = null; fm.poner({ tipo: fm.refs.tipo.value, fecha: C.hoy(), moneda: D.cfg.moneda }); fm.refs.monto.value = ''; fm.refs.nota.value = ''; fm.refs.proyecto.value = ''; fm.refs.cliente.value = ''; fm.refs.canal.value = ''; recat(); document.getElementById('lib-guardar').textContent = 'Guardar movimiento'; }
  function editar(m) {
    editId = m.id; fm.poner(Object.assign({}, m, { proyecto: nombreEnt('proyectos', m.proyecto), cliente: nombreEnt('clientes', m.cliente) })); recat(); fm.refs.categoria.value = m.categoria; fm.refs.fuente.value = m.fuente || '';
    document.getElementById('lib-guardar').textContent = 'Actualizar movimiento'; fm.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); fm.refs.monto.focus();
  }
  function pintar() {
    var ms = filtrados(), ing = 0, gas = 0; ms.forEach(function (m) { if (m.tipo === 'ingreso') ing += m.monto; else gas += m.monto; });
    resumen.textContent = ''; resumen.appendChild(h('div', { cls: 'mon-kpis' }, [U.kpi('Ingresos', U.dinero(ing), ms.length + ' movimientos', 'bien'), U.kpi('Gastos', U.dinero(gas), '', 'av'), U.kpi('Neto', U.dinero(ing - gas), ing > 0 ? U.pct((ing - gas) / ing * 100, 0) + ' de margen' : '', ing - gas < 0 ? 'mal' : 'bien')]));
    var sin = Object.keys(D.sinTasa); if (sin.length) resumen.appendChild(U.nota('Falta la tasa de ' + sin.join(', ') + ' (Ajustes > Monedas). Mientras tanto se cuentan 1:1.', true));
    lista.textContent = '';
    if (!ms.length) { lista.appendChild(h('p', { cls: 'tr-vacio', txt: D.lista('movimientos').length ? 'Ningún movimiento coincide con el filtro.' : 'Aún no hay movimientos. Registra el primero arriba o importa un CSV.' })); return; }
    var ul = h('ul', { cls: 'mon-lista' });
    ms.slice(0, 200).forEach(function (m) {
      var orig = D.obtener('movimientos', m.id);
      ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: m.categoria + (m.nota ? ' · ' + m.nota : '') }), h('small', { txt: [U.fecha(m.fecha), m.proyectoN, m.clienteN, m.canal, m.recurrente ? 'recurrente' : ''].filter(Boolean).join(' · ') })]),
        h('span', { cls: m.tipo === 'ingreso' ? 'mon-ing' : 'mon-gas', txt: (m.tipo === 'ingreso' ? '+' : '−') + U.dinero(orig.monto, orig.moneda) + (orig.moneda !== D.cfg.moneda ? ' (' + U.dinero(m.monto) + ')' : '') }),
        h('div', { cls: 'tr-acciones', style: 'margin:0;flex:none' }, [U.btn('Editar', function () { editar(orig); }, 'mon-btn-s', { 'aria-label': 'Editar movimiento ' + m.categoria }), U.btn('Borrar', function () { if (g.confirm('¿Borrar este movimiento?')) D.borrar('movimientos', m.id); }, 'mon-btn-s', { 'aria-label': 'Borrar movimiento ' + m.categoria })])]));
    });
    lista.appendChild(ul); if (ms.length > 200) lista.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Se muestran los 200 más recientes; usa el filtro o exporta el CSV para ver todos.' }));
  }
  /* ---- recurrentes ---- */
  function pintarRec() {
    recLista.textContent = ''; var rs = D.lista('recurrentes');
    if (!rs.length) { recLista.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Sin recurrentes. Útil para suscripciones, seguros, membresías o contratos mensuales.' })); return; }
    var ul = h('ul', { cls: 'mon-lista' });
    rs.forEach(function (r) { ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: (r.descripcion || r.categoria) }), h('small', { txt: r.frecuencia + ' desde ' + U.fecha(r.inicio) + (r.fin ? ' hasta ' + U.fecha(r.fin) : '') + (r.activo === false ? ' · pausado' : '') })]), h('span', { cls: r.tipo === 'ingreso' ? 'mon-ing' : 'mon-gas', txt: U.dinero(r.monto, r.moneda) }),
      h('div', { cls: 'tr-acciones', style: 'margin:0;flex:none' }, [U.btn(r.activo === false ? 'Reanudar' : 'Pausar', function () { r.activo = r.activo === false; D.guardar('recurrentes', r); }, 'mon-btn-s'), U.btn('Borrar', function () { if (g.confirm('¿Borrar el recurrente? Los movimientos ya generados se conservan.')) D.borrar('recurrentes', r.id); }, 'mon-btn-s')])])); });
    recLista.appendChild(ul);
  }
  function formRec() {
    var f = U.form([{ id: 'tipo', etq: 'Tipo', tipo: 'select', op: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] }, { id: 'descripcion', etq: 'Descripción', tipo: 'text', maxlength: 80 }, { id: 'monto', etq: 'Monto', tipo: 'dinero', min: 0 }, { id: 'moneda', etq: 'Moneda', tipo: 'text', list: 'mon-monedas', maxlength: 4, valor: D.cfg.moneda },
      { id: 'categoria', etq: 'Categoría', tipo: 'select', op: K.CAT_GASTO.concat(K.CAT_INGRESO).map(function (c) { return [c, c]; }) }, { id: 'frecuencia', etq: 'Frecuencia', tipo: 'select', op: K.FREC, valor: 'mensual' }, { id: 'inicio', etq: 'Primera fecha', tipo: 'date', valor: C.hoy() }, { id: 'fin', etq: 'Termina (opcional)', tipo: 'date' }]);
    return h('div', {}, [f.el, U.btn('Añadir recurrente', async function () {
      var v = f.val(); if (!(v.monto > 0) || !v.inicio) { T.aviso('Indica monto y primera fecha.', 'error'); return; }
      v.moneda = (v.moneda || D.cfg.moneda).toUpperCase(); if (!v.fin) delete v.fin; await D.guardar('recurrentes', v); var n = await D.aplicarRecurrentes(); T.aviso('Recurrente creado' + (n ? ' · ' + n + ' movimiento(s) generado(s)' : '') + '.'); f.refs.monto.value = ''; f.refs.descripcion.value = '';
    })]);
  }
  /* ---- clientes y proyectos ---- */
  function entidades() {
    var cont = h('div'), selC;
    function pinta() {
      cont.textContent = '';
      cont.appendChild(h('h3', { txt: 'Clientes' }));
      var cl = D.lista('clientes'); if (!cl.length) cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Se crean al escribir un cliente nuevo en un movimiento o aquí.' }));
      var ul = h('ul', { cls: 'mon-lista' });
      cl.forEach(function (c) { ul.appendChild(h('li', { cls: 'mon-item' }, [h('div', {}, [h('strong', { txt: c.nombre }), h('small', { txt: [c.email, c.tel, c.idFiscal].filter(Boolean).join(' · ') })]), U.btn('Editar', function () { f.poner(c); f.id = c.id; document.getElementById('cli-guardar').textContent = 'Actualizar cliente'; f.refs.nombre.focus(); }, 'mon-btn-s', { 'aria-label': 'Editar cliente ' + c.nombre }), U.btn('Borrar', function () { if (g.confirm('¿Borrar el cliente «' + c.nombre + '»? Sus movimientos y documentos quedan sin cliente.')) D.borrar('clientes', c.id); }, 'mon-btn-s', { 'aria-label': 'Borrar cliente ' + c.nombre })])); });
      cont.appendChild(ul);
      var f = U.form([{ id: 'nombre', etq: 'Nombre', tipo: 'text', maxlength: 80 }, { id: 'email', etq: 'Correo', tipo: 'email' }, { id: 'tel', etq: 'Teléfono', tipo: 'tel' }, { id: 'idFiscal', etq: 'ID fiscal (opcional)', tipo: 'text', maxlength: 40 }, { id: 'direccion', etq: 'Dirección', tipo: 'text', maxlength: 120, cls: 'ancho' }]);
      cont.appendChild(f.el);
      cont.appendChild(h('button', { type: 'button', id: 'cli-guardar', cls: 'tr-btn', txt: 'Guardar cliente', on: { click: async function () { var v = f.val(); if (!v.nombre) { T.aviso('Escribe el nombre.', 'error'); return; } if (f.id) v.id = f.id; await D.guardar('clientes', Object.assign({}, D.obtener('clientes', f.id) || {}, v)); T.aviso('Cliente guardado.'); } } }));
      cont.appendChild(h('h3', { txt: 'Proyectos' }));
      var ul2 = h('ul', { cls: 'mon-lista' }); D.lista('proyectos').forEach(function (p) { ul2.appendChild(h('li', { cls: 'mon-item' }, [h('strong', { txt: p.nombre }), U.btn('Borrar', function () { if (g.confirm('¿Borrar el proyecto «' + p.nombre + '»?')) D.borrar('proyectos', p.id); }, 'mon-btn-s', { 'aria-label': 'Borrar proyecto ' + p.nombre })])); });
      cont.appendChild(ul2.children.length ? ul2 : h('p', { cls: 'tr-ayuda', txt: 'Los proyectos se crean al escribir su nombre en un movimiento.' }));
    }
    pinta(); D.on(function (c) { if (c === 'clientes' || c === 'proyectos' || c === null) pinta(); });
    return cont;
  }
  L.iniciar = function (raiz) {
    var dl = h('div', { hidden: true }, [h('datalist', { id: 'mon-monedas' }), h('datalist', { id: 'mon-proyectos' }), h('datalist', { id: 'mon-clientes' })]); raiz.appendChild(dl);
    function datalists() { function pon(id, v) { var e = document.getElementById(id); e.textContent = ''; v.forEach(function (x) { e.appendChild(h('option', { value: x })); }); } pon('mon-monedas', D.monedas()); pon('mon-proyectos', D.lista('proyectos').map(function (p) { return p.nombre; })); pon('mon-clientes', D.lista('clientes').map(function (p) { return p.nombre; })); }
    fm = U.form(defsMov());
    raiz.appendChild(U.panel('Registrar movimiento', [fm.el, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', id: 'lib-guardar', cls: 'tr-btn mon-primario', txt: 'Guardar movimiento', on: { click: guardar } }), U.btn('Limpiar', limpiar)])], { sub: 'Registro propio. Puedes usar cualquier moneda; se convierte con tus tasas (Ajustes).' }));
    var ff = U.form([{ id: 'mes', etq: 'Mes', tipo: 'month', alCambiar: function (v) { filtro.mes = v; pintar(); } }, { id: 'tipo', etq: 'Tipo', tipo: 'select', op: [['', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']], alCambiar: function (v) { filtro.tipo = v; pintar(); } }, { id: 'proyecto', etq: 'Proyecto', tipo: 'select', op: [['', 'Todos']], alCambiar: function (v) { filtro.proyecto = v; pintar(); } }, { id: 'q', etq: 'Buscar', tipo: 'search', alCambiar: function (v) { filtro.q = v; pintar(); } }]);
    resumen = h('div'); lista = h('div');
    raiz.appendChild(U.panel('Movimientos', [ff.el, resumen, lista, h('div', { cls: 'tr-acciones' }, [U.btn('Exportar CSV', function () { U.descargarTexto(D.exportarCSV(), 'movimientos-' + C.hoy() + '.csv', 'text/csv;charset=utf-8'); }), U.btn('Importar CSV', function () { U.leerArchivo('.csv,text/csv', function (t) { D.importarCSV(t).then(function (r) { T.aviso(r.n + ' movimiento(s) importado(s)' + (r.malas ? ' · ' + r.malas + ' fila(s) omitida(s)' : '') + '.'); }).catch(function (e) { T.aviso(e.message, 'error'); }); }); })]), h('p', { cls: 'tr-ayuda', txt: 'Columnas del CSV: fecha, tipo, monto, moneda, categoria, fuente, proyecto, cliente, canal, nota (fecha AAAA-MM-DD o DD/MM/AAAA).' })]));
    recLista = h('div'); raiz.appendChild(U.panel('Recurrentes', [recLista, U.det('Añadir recurrente', [formRec()])], { sub: 'Se generan solos al abrir la herramienta, hasta hoy.' }));
    raiz.appendChild(U.panel('Clientes y proyectos', [entidades()]));
    function refrescarSel() { var s = ff.refs.proyecto, v = s.value; s.textContent = ''; s.appendChild(h('option', { value: '', txt: 'Todos' })); D.lista('proyectos').forEach(function (p) { s.appendChild(h('option', { value: p.id, txt: p.nombre })); }); s.value = v; if (s.value !== v) { s.value = ''; filtro.proyecto = ''; } }
    recat(); datalists(); refrescarSel(); pintar(); pintarRec();
    D.on(function (c) { if (c === 'movimientos' || c === 'config' || c === null) pintar(); if (c === 'proyectos' || c === 'clientes' || c === 'movimientos' || c === null) { datalists(); refrescarSel(); } if (c === 'recurrentes' || c === null) pintarRec(); });
  };
})(window);
