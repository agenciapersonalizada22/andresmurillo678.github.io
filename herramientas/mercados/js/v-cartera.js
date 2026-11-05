/* Cartera: listas de seguimiento, alertas, cartera simulada (papel trading) y cartera real manual. */
(function () {
  var h = UI.h, F = window.Fmt, esc = F.esc;
  var SUBS = [{ id: 'seguimiento', titulo: 'Seguimiento' }, { id: 'alertas', titulo: 'Alertas' }, { id: 'simulada', titulo: 'Simulada' }, { id: 'real', titulo: 'Real (manual)' }];
  function inputActivo(valor, filtro) {
    var dl = h('datalist', { id: 'dl' + Math.random().toString(36).slice(2) }), inp = h('input.in', { type: 'search', value: valor || '', list: dl.id, 'aria-label': 'Activo', autocomplete: 'off' });
    Mercado.activos.filter(filtro || function (a) { return a.tipo !== 'nft'; }).forEach(function (a) { dl.appendChild(h('option', { value: a.simbolo, label: a.nombre })); });
    var w = h('div', inp, dl); w.valor = function () { var q = inp.value.trim().toLowerCase(); var ex = Mercado.activos.filter(function (a) { return a.simbolo.toLowerCase() === q && (!filtro || filtro(a)); })[0]; return ex || Mercado.buscar(inp.value, 5).filter(filtro || function () { return true; })[0] || null; }; w.input = inp; return w;
  }
  function numero(v, p) { return h('input.in', { type: 'number', step: p || 'any', value: v, min: 0 }); }

  /* ---- sim ---- */
  function sim() { var s = Almacen.get('sim'); if (!s) { var aj = App.ajustes(); s = Cartera.nuevaSim(aj.saldoSim, aj.comisionSim); Almacen.set('sim', s); } return s; }
  App.sim = sim;
  App.dialogoOrden = function (key) {
    var a = Mercado.porKey[key]; if (!a) return;
    var lado = UI.selector([{ id: 'compra', titulo: 'Comprar' }, { id: 'venta', titulo: 'Vender' }], 'compra', { class: 'in' }), tipo = UI.selector([{ id: 'mercado', titulo: 'Mercado' }, { id: 'limite', titulo: 'Limite' }, { id: 'stop', titulo: 'Stop' }], 'mercado', { class: 'in' }), cant = numero(1), px = numero(a.precio);
    var info = h('p.peq.muted'); function act() { px.disabled = tipo.value === 'mercado'; var s = sim(); info.textContent = 'Saldo: ' + F.num(s.saldo, 2) + ' USD · Precio actual: ' + F.precio(a.precio) + (s.posiciones[key] ? ' · Posicion: ' + s.posiciones[key].cant : ''); } tipo.onchange = act; act();
    App.dialogo('Orden simulada · ' + a.simbolo, h('div', h('p.peq.muted', 'Dinero ficticio. Compra: limite se ejecuta si el precio baja a ese nivel; stop si sube. Venta: limite si sube; stop si baja (proteccion).'), h('div.form-g', UI.campo('Lado', lado), UI.campo('Tipo', tipo), UI.campo('Cantidad', cant), UI.campo('Precio limite/stop', px)), info),
      [{ t: 'Enviar orden', pri: true, f: function () { var s = sim(), o = Cartera.enviar(s, { key: key, simbolo: a.simbolo, lado: lado.value, tipo: tipo.value, cant: +cant.value, precio: tipo.value === 'mercado' ? null : +px.value }, App.precios(), Date.now()); Almacen.set('sim', s); UI.toast('Orden ' + o.estado + (o.motivo ? ': ' + o.motivo : ''), o.estado === 'rechazada' ? 'error' : ''); if (o.estado === 'rechazada') return false; } }, { t: 'Cancelar' }]);
  };
  App.dialogoAlerta = function (key) {
    var a = Mercado.porKey[key]; if (!a) return; var tipos = Object.keys(Alertas.TIPOS).map(function (k) { return { id: k, titulo: Alertas.TIPOS[k] }; });
    var tp = UI.selector(tipos, 'precio-sobre', { class: 'in' }), val = numero(+(a.precio * 1.05).toPrecision(5)), rep = h('input', { type: 'checkbox' });
    App.dialogo('Nueva alerta · ' + a.simbolo, h('div', h('div.form-g', UI.campo('Condicion', tp), UI.campo('Valor', val, 'Precio actual: ' + F.precio(a.precio))), h('label.fila-flex', { style: 'margin-top:8px' }, rep, 'Repetir (con enfriamiento de 1 h)'), h('p.peq.muted', 'Solo se evalua mientras la pagina esta abierta.')),
      [{ t: 'Crear', pri: true, f: function () { if (!isFinite(+val.value)) { UI.toast('Valor invalido', 'error'); return false; } var l = Almacen.get('alertas', []); l.push({ id: Date.now(), key: key, simbolo: a.simbolo, tipo: tp.value, valor: +val.value, activa: true, repetir: rep.checked, enfriamiento: 3600000, creada: Date.now() }); Almacen.set('alertas', l); UI.toast('Alerta creada'); App.evaluarAlertas(); } }, { t: 'Cancelar' }]);
  };

  /* ---- seguimiento ---- */
  function seguimiento(c) {
    var ls = App.listas(), actual = Almacen.get('lista_actual', ls[0].id); if (!ls.some(function (l) { return l.id === actual; })) actual = ls[0].id;
    var raiz = h('div'), cab = h('div.toolbar'), cuerpo = h('div'), t = null;
    function pintar() {
      UI.vaciar(cab); UI.vaciar(cuerpo); ls = App.listas(); var l = ls.filter(function (x) { return x.id === actual; })[0];
      ls.forEach(function (x) { cab.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': x.id === actual ? 'true' : 'false', onclick: function () { actual = x.id; Almacen.set('lista_actual', actual); pintar(); } }, x.nombre + ' (' + x.keys.length + ')')); });
      cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { var n = prompt('Nombre de la nueva lista'); if (n && n.trim()) { var q = App.listas(); var id = 'l' + Date.now(); q.push({ id: id, nombre: n.trim(), keys: [] }); Almacen.set('listas', q); actual = id; pintar(); } } }, '+ Lista'));
      cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { var n = prompt('Nuevo nombre', l.nombre); if (n && n.trim()) { var q = App.listas(); q.filter(function (x) { return x.id === actual; })[0].nombre = n.trim(); Almacen.set('listas', q); pintar(); } } }, 'Renombrar'));
      if (ls.length > 1) cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { if (confirm('Eliminar la lista "' + l.nombre + '"?')) { var q = App.listas().filter(function (x) { return x.id !== actual; }); Almacen.set('listas', q); actual = q[0].id; pintar(); } } }, 'Eliminar'));
      var add = inputActivo('', null); cab.appendChild(add); cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { var a = add.valor(); if (!a) return UI.toast('Activo no encontrado'); var q = App.listas(); var ll = q.filter(function (x) { return x.id === actual; })[0]; if (ll.keys.indexOf(a.key) < 0) ll.keys.push(a.key); Almacen.set('listas', q); pintar(); } }, 'Anadir'));
      var filas = l.keys.map(function (k) { return Mercado.porKey[k]; }).filter(Boolean);
      var cols = [{ id: 'n', titulo: 'Activo', ancho: 210, valor: function (a) { return a.simbolo; }, html: function (a) { return '<span class="sim">' + esc(a.simbolo) + '</span><span class="nom">' + esc(a.nombre) + '</span>'; } }, { id: 't', titulo: 'Tipo', ancho: 80, valor: function (a) { return a.tipo; }, html: function (a) { return esc(App.tipoLegible[a.tipo]); }, ocultarMovil: true },
        { id: 'p', titulo: 'Precio', ancho: 100, alinear: 'der', num: true, valor: function (a) { return a.precio; }, html: function (a) { return F.precio(a.precio); } }, { id: 'c', titulo: '24h', ancho: 78, alinear: 'der', num: true, valor: function (a) { return a.cambio24h; }, html: function (a) { return '<span class="' + UI.clasePct(a.cambio24h) + '">' + F.pct(a.cambio24h) + '</span>'; } },
        { id: 's', titulo: 'Tendencia', ancho: 110, valor: function (a) { return a.cambio24h; }, num: true, html: function (a) { return UI.spark(a.spark, 90, 26); } }, { id: 'q', titulo: '', ancho: 44, valor: function () { return 0; }, html: function (a) { return '<button class="estrella quitar" type="button" aria-label="Quitar ' + esc(a.simbolo) + '" data-key="' + esc(a.key) + '">✕</button>'; } }];
      t = new TablaVirtual(cuerpo, { columnas: cols, alto: 40, vacio: 'Lista vacia: anade activos arriba o con la estrella de las tablas', alAbrir: function (a, e) { if (e && e.target.closest && e.target.closest('.quitar')) { var q = App.listas(), ll = q.filter(function (x) { return x.id === actual; })[0]; ll.keys.splice(ll.keys.indexOf(a.key), 1); Almacen.set('listas', q); pintar(); } else App.abrirActivo(a.key); } }); App.tabla = t; t.setFilas(filas);
    }
    raiz.appendChild(cab); raiz.appendChild(cuerpo); c.appendChild(raiz); pintar();
  }

  /* ---- alertas ---- */
  function alertas(c) {
    var raiz = h('div'), lista = h('div'), perm = h('span.chip');
    function pintarPerm() { var p = 'Notification' in window ? Notification.permission : 'no soportado'; perm.textContent = 'Notificaciones: ' + { granted: 'activadas', denied: 'bloqueadas', 'default': 'sin permiso', 'no soportado': 'no soportadas' }[p]; }
    var add = inputActivo('', null), tp = UI.selector(Object.keys(Alertas.TIPOS).map(function (k) { return { id: k, titulo: Alertas.TIPOS[k] }; }), 'precio-sobre', { class: 'in' }), val = numero(0), rep = h('input', { type: 'checkbox' });
    function pintar() {
      UI.vaciar(lista); var al = Almacen.get('alertas', []);
      if (!al.length) lista.appendChild(h('p.muted', 'No hay alertas.'));
      var t = h('table.t', h('thead', h('tr', h('th', 'Alerta'), h('th', 'Estado'), h('th.n', 'Veces'), h('th')))), tb = h('tbody');
      al.forEach(function (a, i) { tb.appendChild(h('tr', h('td', Alertas.descripcion(a), a.repetir ? h('span.muted.peq', ' (repetible)') : null), h('td', a.activa ? h('span.sube', 'Activa') : h('span.muted', 'Disparada')), h('td.n', a.veces || 0), h('td.n', h('button.btn.peq', { type: 'button', onclick: function () { a.activa = !a.activa; Almacen.set('alertas', al); pintar(); } }, a.activa ? 'Pausar' : 'Reactivar'), ' ', h('button.btn.peq', { type: 'button', 'aria-label': 'Borrar alerta', onclick: function () { al.splice(i, 1); Almacen.set('alertas', al); pintar(); } }, '✕')))); });
      if (al.length) { t.appendChild(tb); lista.appendChild(h('div.scroll-x', t)); }
      var hs = Almacen.get('alertas_historial', []); if (hs.length) { lista.appendChild(h('h3', { style: 'margin-top:12px' }, 'Historial de disparos')); hs.slice(0, 10).forEach(function (x) { lista.appendChild(h('div.peq', F.fechaHora(x.t) + ' UTC · ' + x.mensaje)); }); }
    }
    pintarPerm();
    raiz.appendChild(h('div.banner.azul', { style: 'margin-bottom:10px' }, h('b', 'Limite importante: '), 'esta app no tiene servidor. Las alertas solo se evaluan mientras esta pagina esta abierta (al cargar y cada 2 minutos con la pestana abierta). Si la cierras no recibiras avisos. Para alertas 24/7 usa tu broker o una app dedicada.'));
    raiz.appendChild(h('div.tarjeta', h('h2', 'Nueva alerta'), h('div.form-g', UI.campo('Activo', add), UI.campo('Condicion', tp), UI.campo('Valor', val)), h('label.fila-flex', { style: 'margin-top:8px' }, rep, 'Repetir (enfriamiento 1 h)'),
      h('div.fila-flex', { style: 'margin-top:8px' }, h('button.btn.pri', { type: 'button', onclick: function () { var a = add.valor(); if (!a) return UI.toast('Activo no encontrado', 'error'); if (!isFinite(+val.value) || val.value === '') return UI.toast('Indica un valor', 'error'); var l = Almacen.get('alertas', []); l.push({ id: Date.now(), key: a.key, simbolo: a.simbolo, tipo: tp.value, valor: +val.value, activa: true, repetir: rep.checked, enfriamiento: 3600000, creada: Date.now() }); Almacen.set('alertas', l); pintar(); App.evaluarAlertas(); } }, 'Crear alerta'),
        h('button.btn', { type: 'button', onclick: function () { App.pedirNotificaciones().then(pintarPerm); } }, 'Permitir notificaciones'), h('button.btn', { type: 'button', onclick: function () { App.evaluarAlertas().then(function (d) { UI.toast(d.length ? d.length + ' alerta(s) disparada(s)' : 'Ninguna alerta se cumple ahora'); pintar(); }); } }, 'Evaluar ahora'), perm)));
    raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Mis alertas'), lista)); c.appendChild(raiz); pintar();
    var off = Almacen.suscribir('alertas', pintar); return { destruir: off };
  }

  /* ---- simulada ---- */
  function simulada(c) {
    var s = sim(), precios = App.precios(), bk = App.ajustes().benchmark, bench = Mercado.porKey[bk] || Mercado.porKey['c:bitcoin'];
    Cartera.procesar(s, precios, Date.now()); Cartera.registrarCurva(s, precios, Date.now(), bench ? bench.precio : null); Almacen.set('sim', s);
    var r = Cartera.resumenSim(s, precios), raiz = h('div');
    var grid = h('div.rejilla.g4.m2'); function k(t, v, cl) { grid.appendChild(h('div.tarjeta', { style: 'padding:8px' }, h('div.muted.peq', t), h('div', { style: 'font-size:18px;font-weight:600', class: cl || '' }, v))); }
    k('Patrimonio', F.num(r.equity, 2) + ' USD'); k('Rendimiento', F.pct(r.retorno * 100), UI.clasePct(r.retorno)); k('P&L realizado', F.num(r.realizado, 2), UI.clasePct(r.realizado)); k('P&L abierto', F.num(r.noRealizado, 2), UI.clasePct(r.noRealizado)); k('Efectivo', F.num(s.saldo, 2)); k('% de aciertos', F.ok(r.aciertos) ? F.num(r.aciertos * 100, 0) + '%' : '-'); k('Operaciones', r.operaciones); k('Saldo inicial', F.num(s.saldoInicial, 0));
    raiz.appendChild(h('div.banner.azul', { style: 'margin-bottom:10px' }, 'Cartera de papel con dinero ficticio. Las ordenes limite y stop pendientes solo se ejecutan cuando abres la app y el precio cumple la condicion (sin servidor).'));
    raiz.appendChild(grid);
    var activo = inputActivo('', function (a) { return a.tipo === 'cripto' || a.tipo === 'accion' || a.tipo === 'indice' ? a.tipo !== 'indice' : false; }), lado = UI.selector([{ id: 'compra', titulo: 'Comprar' }, { id: 'venta', titulo: 'Vender' }], 'compra', { class: 'in' }), tipo = UI.selector([{ id: 'mercado', titulo: 'Mercado' }, { id: 'limite', titulo: 'Limite' }, { id: 'stop', titulo: 'Stop' }], 'mercado', { class: 'in' }), cant = numero(1), px = numero('');
    raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Nueva orden'), h('div.form-g', UI.campo('Activo', activo), UI.campo('Lado', lado), UI.campo('Tipo', tipo), UI.campo('Cantidad', cant), UI.campo('Precio limite/stop', px)),
      h('div.fila-flex', { style: 'margin-top:8px' }, h('button.btn.pri', { type: 'button', onclick: function () { var a = activo.valor(); if (!a) return UI.toast('Activo no encontrado', 'error'); var q = sim(), o = Cartera.enviar(q, { key: a.key, simbolo: a.simbolo, lado: lado.value, tipo: tipo.value, cant: +cant.value, precio: tipo.value === 'mercado' ? null : +px.value }, App.precios(), Date.now()); Almacen.set('sim', q); UI.toast('Orden ' + o.estado + (o.motivo ? ': ' + o.motivo : ''), o.estado === 'rechazada' ? 'error' : ''); App.ir('cartera', 'simulada'); } }, 'Enviar'),
        h('button.btn', { type: 'button', onclick: function () { var v = prompt('Reiniciar cartera simulada. Saldo inicial ficticio:', s.saldoInicial); if (v && +v > 0) { var n = Cartera.nuevaSim(+v, App.ajustes().comisionSim); Almacen.set('sim', n); App.setAjuste('saldoSim', +v); App.ir('cartera', 'simulada'); } } }, 'Reiniciar'))));
    if (s.curva.length > 1 && bench && s.curva[0][2]) { var xs = s.curva.map(function (p) { return p[0]; }), b0 = s.curva[0][2]; raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h3', 'Rendimiento vs ' + bench.simbolo + ' (base 100)'), App.lineasSVG([{ nombre: 'Cartera', color: 'var(--c2)', x: xs, y: s.curva.map(function (p) { return p[1] / s.saldoInicial * 100; }) }, { nombre: bench.simbolo, color: 'var(--c1)', x: xs, y: s.curva.map(function (p) { return (p[2] || b0) / b0 * 100; }) }], { base: 100 }), h('p.peq.muted', 'La curva se registra cada vez que abres esta seccion; hay pocos puntos al principio.'))); }
    var tp = h('table.t', h('thead', h('tr', h('th', 'Posicion'), h('th.n', 'Cant.'), h('th.n', 'Costo prom.'), h('th.n', 'Precio'), h('th.n', 'P&L'))));
    var tb = h('tbody'); Object.keys(s.posiciones).forEach(function (kk) { var p = s.posiciones[kk], px2 = precios[kk], pnl = (px2 - p.costoProm) * p.cant; tb.appendChild(h('tr', h('td', h('a', { href: '#/activo/' + App.enc(kk) }, p.simbolo)), h('td.n', F.num(p.cant, 4)), h('td.n', F.precio(p.costoProm)), h('td.n', F.precio(px2)), h('td.n', { class: UI.clasePct(pnl) }, F.num(pnl, 2) + ' (' + F.pct((px2 / p.costoProm - 1) * 100) + ')'))); });
    tp.appendChild(tb); raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Posiciones'), Object.keys(s.posiciones).length ? h('div.scroll-x', tp) : h('p.muted', 'Sin posiciones abiertas.')));
    var pend = s.ordenes.filter(function (o) { return o.estado === 'pendiente'; }); if (pend.length) { var po = h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Ordenes pendientes')); pend.forEach(function (o) { po.appendChild(h('div.fila-flex', { style: 'justify-content:space-between' }, h('span', o.lado + ' ' + o.cant + ' ' + o.simbolo + ' ' + o.tipo + ' @ ' + F.precio(o.precio)), h('button.btn.peq', { type: 'button', onclick: function () { var q = sim(); Cartera.cancelar(q, o.id); Almacen.set('sim', q); App.ir('cartera', 'simulada'); } }, 'Cancelar'))); }); raiz.appendChild(po); }
    var th = h('table.t', h('thead', h('tr', h('th', 'Fecha'), h('th', 'Lado'), h('th', 'Activo'), h('th.n', 'Cant.'), h('th.n', 'Precio'), h('th.n', 'P&L')))), tbh = h('tbody');
    s.historial.slice(-40).reverse().forEach(function (x) { tbh.appendChild(h('tr', h('td', F.fechaHora(x.t)), h('td', x.lado), h('td', x.simbolo), h('td.n', F.num(x.cant, 4)), h('td.n', F.precio(x.precio)), h('td.n', { class: UI.clasePct(x.pnl) }, x.lado === 'venta' ? F.num(x.pnl, 2) : '-'))); }); th.appendChild(tbh);
    raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Historial de operaciones'), s.historial.length ? h('div.scroll-x', th) : h('p.muted', 'Aun no hay operaciones.')));
    c.appendChild(raiz);
  }

  /* ---- real ---- */
  function real(c) {
    var cs = Almacen.get('real', null);
    if (!cs) { cs = [{ id: 'p1', nombre: 'Mi cartera', moneda: App.ajustes().moneda, transacciones: [] }]; Almacen.set('real', cs); }
    var actual = Almacen.get('real_actual', cs[0].id), cart = cs.filter(function (x) { return x.id === actual; })[0] || cs[0], raiz = h('div'), tasas = Mercado.tasas();
    function guardar() { Almacen.set('real', cs); App.ir('cartera', 'real'); }
    var mons = ['USD'].concat(Object.keys(tasas).sort());
    var cab = h('div.toolbar'); cs.forEach(function (x) { cab.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': x.id === cart.id ? 'true' : 'false', onclick: function () { Almacen.set('real_actual', x.id); App.ir('cartera', 'real'); } }, x.nombre)); });
    cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { var n = prompt('Nombre de la cartera'); if (n && n.trim()) { var id = 'p' + Date.now(); cs.push({ id: id, nombre: n.trim(), moneda: 'USD', transacciones: [] }); Almacen.set('real_actual', id); guardar(); } } }, '+ Cartera'));
    if (cs.length > 1) cab.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { if (confirm('Eliminar "' + cart.nombre + '" y todas sus transacciones?')) { cs.splice(cs.indexOf(cart), 1); Almacen.set('real_actual', cs[0].id); guardar(); } } }, 'Eliminar'));
    cab.appendChild(UI.campo('Moneda', UI.selector(mons, cart.moneda, { class: 'in', style: 'width:auto', onchange: function () { cart.moneda = this.value; guardar(); } }))); raiz.appendChild(cab);
    var res, pe = null; try { res = Cartera.posiciones(cart.transacciones); } catch (e) { pe = e.message; res = Cartera.posiciones([]); }
    if (pe) raiz.appendChild(h('div.banner.rojo', 'Hay una transaccion inconsistente: ' + pe));
    var precios = {}; Object.keys(res.porSimbolo).forEach(function (sim) { var p = res.porSimbolo[sim], a = p.key && Mercado.porKey[p.key]; if (a) precios[sim] = Calculadoras.convertir(a.precio, 'USD', cart.moneda, tasas); else { var ult = cart.transacciones.filter(function (t) { return t.simbolo === sim && t.precio; }).pop(); if (ult) precios[sim] = ult.precio; } });
    var v = Cartera.valorar(res, precios), grid = h('div.rejilla.g4.m2'); function k(t, val, cl) { grid.appendChild(h('div.tarjeta', { style: 'padding:8px' }, h('div.muted.peq', t), h('div', { style: 'font-size:18px;font-weight:600', class: cl || '' }, val))); }
    var mo = ' ' + cart.moneda; k('Valor actual', F.num(v.valor, 2) + mo); k('Costo', F.num(v.costo, 2) + mo); k('P&L abierto', F.num(v.pnlNoRealizado, 2) + ' (' + F.pct(v.pnlPct * 100) + ')', UI.clasePct(v.pnlNoRealizado)); k('P&L realizado', F.num(v.realizado, 2), UI.clasePct(v.realizado)); k('Dividendos', F.num(v.dividendos, 2)); k('Comisiones', F.num(v.comisiones, 2)); k('Resultado total', F.num(v.total, 2) + mo, UI.clasePct(v.total));
    var otra = mons.filter(function (m) { return m !== cart.moneda; })[0]; k('Valor en ' + (cart.moneda === 'USD' ? 'EUR' : 'USD'), F.num(Calculadoras.convertir(v.valor, cart.moneda, cart.moneda === 'USD' ? (tasas.EUR ? 'EUR' : otra) : 'USD', tasas), 2));
    raiz.appendChild(grid);
    // asignacion
    if (v.filas.length) {
      var barra = h('div', { style: 'display:flex;height:14px;border-radius:7px;overflow:hidden;margin:10px 0 6px' }); v.filas.forEach(function (f, i) { barra.appendChild(h('i', { title: f.simbolo + ' ' + F.num(f.peso * 100, 1) + '%', style: 'display:block;width:' + f.peso * 100 + '%;background:var(--c' + (i % 6 + 1) + ')' })); });
      var t = h('table.t', h('thead', h('tr', h('th', 'Activo'), h('th.n', 'Cant.'), h('th.n', 'Costo prom.'), h('th.n', 'Precio'), h('th.n', 'Valor'), h('th.n', 'P&L'), h('th.n', 'Peso')))), tb = h('tbody');
      v.filas.forEach(function (f, i) { tb.appendChild(h('tr', h('td', h('i', { style: 'display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;background:var(--c' + (i % 6 + 1) + ')' }), f.key ? h('a', { href: '#/activo/' + App.enc(f.key) }, f.simbolo) : f.simbolo), h('td.n', F.num(f.cant, 6)), h('td.n', F.precio(f.costoProm)), h('td.n', F.precio(f.precio)), h('td.n', F.num(f.valor, 2)), h('td.n', { class: UI.clasePct(f.pnl) }, F.num(f.pnl, 2) + ' (' + F.pct(f.pnlPct * 100, 1) + ')'), h('td.n', F.num(f.peso * 100, 1) + '%'))); }); t.appendChild(tb);
      raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Posiciones y asignacion'), barra, h('div.scroll-x', t)));
    } else raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('p.muted', 'Sin posiciones. Registra tus compras abajo (los datos se guardan solo en este dispositivo).')));
    // formulario
    var tipo = UI.selector([{ id: 'compra', titulo: 'Compra' }, { id: 'venta', titulo: 'Venta' }, { id: 'dividendo', titulo: 'Dividendo' }], 'compra', { class: 'in' }), act = inputActivo('', function (a) { return a.tipo !== 'nft' && a.tipo !== 'indice'; }), fecha = h('input.in', { type: 'date', value: new Date().toISOString().slice(0, 10) }), cant = numero(''), precio = numero(''), com = numero(0), monto = numero('');
    raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Registrar transaccion (en ' + cart.moneda + ')'), h('div.form-g', UI.campo('Tipo', tipo), UI.campo('Simbolo', act), UI.campo('Fecha', fecha), UI.campo('Cantidad', cant), UI.campo('Precio unitario', precio), UI.campo('Comision', com), UI.campo('Monto (dividendo)', monto)),
      h('div.fila-flex', { style: 'margin-top:8px' }, h('button.btn.pri', { type: 'button', onclick: function () {
        var a = act.valor(), sim = a ? a.simbolo : act.input.value.trim().toUpperCase(); if (!sim) return UI.toast('Indica un simbolo', 'error'); if (!a) UI.toast('Simbolo manual: se valorara al ultimo precio registrado');
        var t = { id: Date.now(), tipo: tipo.value, simbolo: sim, key: a ? a.key : null, cant: +cant.value, precio: +precio.value, comision: +com.value || 0, fecha: Date.parse(fecha.value) || Date.now(), monto: tipo.value === 'dividendo' ? +monto.value : undefined };
        if (tipo.value === 'dividendo' ? !(t.monto > 0) : !(t.cant > 0 && t.precio >= 0)) return UI.toast('Revisa cantidad, precio o monto', 'error');
        try { Cartera.posiciones(cart.transacciones.concat([t])); } catch (e) { return UI.toast(e.message, 'error'); } cart.transacciones.push(t); guardar(); } }, 'Guardar transaccion'),
      h('button.btn', { type: 'button', onclick: function () { var filas = [['fecha', 'tipo', 'simbolo', 'cantidad', 'precio', 'comision', 'monto']].concat(cart.transacciones.map(function (t) { return [new Date(t.fecha).toISOString().slice(0, 10), t.tipo, t.simbolo, t.cant, t.precio, t.comision, t.monto || '']; })); UI.descargar('cartera-' + cart.nombre + '.csv', filas.map(function (f) { return f.join(','); }).join('\n'), 'text/csv'); } }, 'Exportar CSV'))));
    var th = h('table.t', h('thead', h('tr', h('th', 'Fecha'), h('th', 'Tipo'), h('th', 'Simbolo'), h('th.n', 'Cant.'), h('th.n', 'Precio'), h('th.n', 'Monto'), h('th')))), tbh = h('tbody');
    cart.transacciones.slice().sort(function (a, b) { return b.fecha - a.fecha; }).forEach(function (t) { tbh.appendChild(h('tr', h('td', F.fecha(t.fecha, true)), h('td', t.tipo), h('td', t.simbolo), h('td.n', t.tipo === 'dividendo' ? '-' : F.num(t.cant, 6)), h('td.n', t.tipo === 'dividendo' ? '-' : F.precio(t.precio)), h('td.n', F.num(t.tipo === 'dividendo' ? t.monto : t.cant * t.precio, 2)), h('td.n', h('button.btn.peq', { type: 'button', 'aria-label': 'Borrar transaccion', onclick: function () { var i = cart.transacciones.indexOf(t); cart.transacciones.splice(i, 1); try { Cartera.posiciones(cart.transacciones); } catch (e) { cart.transacciones.splice(i, 0, t); return UI.toast('No se puede borrar: ' + e.message, 'error'); } guardar(); } }, '✕')))); }); th.appendChild(tbh);
    raiz.appendChild(h('div.tarjeta', { style: 'margin-top:10px' }, h('h2', 'Transacciones'), cart.transacciones.length ? h('div.scroll-x', th) : h('p.muted', 'Sin transacciones.'), h('p.peq.muted', 'Costo promedio ponderado: las ventas parciales realizan la ganancia sobre el costo promedio y no lo alteran. Los precios en vivo se convierten a ' + cart.moneda + ' con las tasas de divisas del contrato.')));
    c.appendChild(raiz);
  }

  App.registrar('cartera', function (cont, r) {
    var sub = SUBS.some(function (s) { return s.id === r.sub; }) ? r.sub : 'seguimiento', raiz = h('div'); cont.appendChild(raiz);
    raiz.appendChild(App.seccionTitulo('Cartera', ['cripto', 'acciones'])); raiz.appendChild(UI.pestanas(SUBS, sub, function (id) { App.ir('cartera', id); }, 'Cartera'));
    var res = { seguimiento: seguimiento, alertas: alertas, simulada: simulada, real: real }[sub](raiz); raiz.appendChild(h('p.legal-pie', window.Guia.AVISO)); return res;
  });
})();
