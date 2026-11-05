/* Mercados: tablas virtualizadas de cripto, acciones, divisas y NFTs. */
(function () {
  var h = UI.h, F = window.Fmt, esc = F.esc;
  var SUBS = [{ id: 'cripto', titulo: 'Criptomonedas' }, { id: 'acciones', titulo: 'Acciones y bolsa' }, { id: 'divisas', titulo: 'Divisas' }, { id: 'nft', titulo: 'NFTs' }];
  function celdaActivo(a) { return '<span class="sim">' + esc(a.simbolo) + '</span><span class="nom">' + esc(a.nombre) + '</span>'; }
  function pctHtml(v, d) { return '<span class="' + UI.clasePct(v) + '">' + F.pct(v, d) + '</span>'; }
  function star(a) { return '<button class="estrella' + (App.enAlgunaLista(a.key) ? ' on' : '') + '" type="button" aria-label="Seguir ' + esc(a.simbolo) + '" data-key="' + esc(a.key) + '">' + (App.enAlgunaLista(a.key) ? '★' : '☆') + '</button>'; }
  function alAbrir(t) { return function (a, e) { var s = e && e.target.closest && e.target.closest('.estrella'); if (s) { App.alternarLista(a.key); t.refrescar(); } else App.abrirActivo(a.key); }; }
  function barraFiltros(items) { var d = h('div.toolbar'); items.forEach(function (i) { d.appendChild(i); }); return d; }
  function buscarIn(alCambiar) { var i = h('input.in', { type: 'search', placeholder: 'Filtrar por nombre o simbolo', 'aria-label': 'Filtrar', style: 'max-width:240px', oninput: function () { alCambiar(); } }); return i; }
  function coincide(a, q) { return !q || a.simbolo.toLowerCase().indexOf(q) >= 0 || a.nombre.toLowerCase().indexOf(q) >= 0; }

  function cripto(c) {
    var datos = Mercado.activos.filter(function (a) { return a.tipo === 'cripto'; }).sort(function (a, b) { return (b.capitalizacion || 0) - (a.capitalizacion || 0); }).map(function (a, i) { a.rango = i + 1; return a; }), t, q, capSel, favSel, solo;
    var cols = [
      { id: 'fav', titulo: '', ancho: 44, anchoMovil: 34, valor: function (a) { return App.enAlgunaLista(a.key) ? 1 : 0; }, num: true, html: star },
      { id: 'rango', titulo: '#', ancho: 44, num: true, valor: function (a) { return a.rango; }, html: function (a) { return '<span class="muted">' + a.rango + '</span>'; }, ocultarMovil: true },
      { id: 'nombre', titulo: 'Nombre', ancho: 200, anchoMovil: 70, valor: function (a) { return a.simbolo; }, html: celdaActivo },
      { id: 'precio', titulo: 'Precio (USD)', ancho: 110, anchoMovil: 90, alinear: 'der', num: true, valor: function (a) { return a.precio; }, html: function (a) { return F.precio(a.precio); } },
      { id: 'c1h', titulo: '1h', ancho: 80, alinear: 'der', num: true, valor: function (a) { return a.cambio1h; }, html: function (a) { return pctHtml(a.cambio1h); }, ocultarMovil: true },
      { id: 'c24', titulo: '24h', ancho: 88, anchoMovil: 72, alinear: 'der', num: true, valor: function (a) { return a.cambio24h; }, html: function (a) { return pctHtml(a.cambio24h); } },
      { id: 'c7', titulo: '7d', ancho: 92, alinear: 'der', num: true, valor: function (a) { return a.cambio7d; }, html: function (a) { return pctHtml(a.cambio7d); }, ocultarMovil: true },
      { id: 'cap', titulo: 'Capitalizacion', ancho: 120, anchoMovil: 90, alinear: 'der', num: true, valor: function (a) { return a.capitalizacion; }, html: function (a) { return F.grande(a.capitalizacion); } },
      { id: 'vol', titulo: 'Volumen 24h', ancho: 110, alinear: 'der', num: true, valor: function (a) { return a.volumen; }, html: function (a) { return F.grande(a.volumen); }, ocultarMovil: true },
      { id: 'sp', titulo: '7 dias', ancho: 110, anchoMovil: 90, valor: function (a) { return a.cambio7d; }, num: true, html: function (a) { return UI.spark(a.spark, 90, 26); } }
    ];
    var raiz = h('div'), cuerpo = h('div'); t = null;
    function filtrar() {
      var qq = q.value.trim().toLowerCase(), cs = capSel.value, fav = favSel.checked, g = solo.value;
      t.setFiltro(function (a) { return coincide(a, qq) && (cs === 'todas' || (cs === 'gran' && a.capitalizacion >= 1e10) || (cs === 'med' && a.capitalizacion >= 1e9 && a.capitalizacion < 1e10) || (cs === 'peq' && a.capitalizacion < 1e9)) && (!fav || App.enAlgunaLista(a.key)) && (g === 'todos' || (g === 'sube' && a.cambio24h > 0) || (g === 'baja' && a.cambio24h < 0)); });
    }
    q = buscarIn(filtrar); capSel = UI.selector([{ id: 'todas', titulo: 'Toda capitalizacion' }, { id: 'gran', titulo: '> 10 MM' }, { id: 'med', titulo: '1 - 10 MM' }, { id: 'peq', titulo: '< 1 MM' }], 'todas', { class: 'in', style: 'width:auto', onchange: filtrar, 'aria-label': 'Capitalizacion' });
    solo = UI.selector([{ id: 'todos', titulo: 'Sube y baja' }, { id: 'sube', titulo: 'Solo suben 24h' }, { id: 'baja', titulo: 'Solo bajan 24h' }], 'todos', { class: 'in', style: 'width:auto', onchange: filtrar, 'aria-label': 'Direccion' });
    favSel = h('input', { type: 'checkbox', onchange: filtrar });
    raiz.appendChild(barraFiltros([q, capSel, solo, h('label.fila-flex', favSel, 'Solo seguidos'), h('span.muted.peq', datos.length + ' activos')]));
    raiz.appendChild(cuerpo); c.appendChild(raiz);
    t = new TablaVirtual(cuerpo, { columnas: cols, alto: 40, orden: { id: 'cap', dir: -1 }, alAbrir: function (a, e) { alAbrir(t)(a, e); }, vacio: 'Ningun activo coincide con los filtros' }); App.tabla = t; t.setFilas(datos);
  }

  function acciones(c) {
    var datos = Mercado.activos.filter(function (a) { return a.tipo === 'accion'; }), indices = Mercado.activos.filter(function (a) { return a.tipo === 'indice'; }), t, q, bolsa, vivo = true;
    var bolsas = [{ id: 'todas', titulo: 'Todas las bolsas' }].concat(Array.from(new Set(datos.map(function (a) { return a.bolsa; }))).sort().map(function (b) { return { id: b, titulo: b }; }));
    var cols = [
      { id: 'fav', titulo: '', ancho: 44, anchoMovil: 34, num: true, valor: function (a) { return App.enAlgunaLista(a.key) ? 1 : 0; }, html: star },
      { id: 'nombre', titulo: 'Valor', ancho: 210, anchoMovil: 70, valor: function (a) { return a.simbolo; }, html: celdaActivo },
      { id: 'bolsa', titulo: 'Bolsa', ancho: 74, valor: function (a) { return a.bolsa; }, html: function (a) { return esc(a.bolsa); }, ocultarMovil: true },
      { id: 'precio', titulo: 'Precio', ancho: 100, anchoMovil: 84, alinear: 'der', num: true, valor: function (a) { return a.precio; }, html: function (a) { return F.precio(a.precio); } },
      { id: 'cambio', titulo: 'Cambio %', ancho: 82, anchoMovil: 72, alinear: 'der', num: true, valor: function (a) { return a.cambio24h; }, html: function (a) { return pctHtml(a.cambio24h); } },
      { id: 'rango', titulo: 'Rango del dia', ancho: 120, num: true, valor: function (a) { var r = a.raw; return r.max > r.min ? (a.precio - r.min) / (r.max - r.min) : null; }, html: function (a) { var r = a.raw; if (!(r.max > r.min)) return ''; var p = Math.max(0, Math.min(1, (a.precio - r.min) / (r.max - r.min))) * 100; return '<div class="barra" title="' + esc(F.precio(r.min) + ' - ' + F.precio(r.max)) + '" style="position:relative;width:96px"><i style="width:' + p + '%"></i></div>'; }, ocultarMovil: true },
      { id: 'vol', titulo: 'Volumen', ancho: 100, alinear: 'der', num: true, valor: function (a) { return a.volumen; }, html: function (a) { return F.grande(a.volumen); }, ocultarMovil: true },
      { id: 'cap', titulo: 'Capitalizacion', ancho: 112, anchoMovil: 90, alinear: 'der', num: true, valor: function (a) { return a.capitalizacion; }, html: function (a) { return F.grande(a.capitalizacion); } },
      { id: 'pe', titulo: 'P/E', ancho: 60, alinear: 'der', num: true, valor: function (a) { return a.raw.pe; }, html: function (a) { return a.raw.pe ? F.num(a.raw.pe, 1) : '-'; }, ocultarMovil: true },
      { id: 'sp', titulo: 'Tendencia', ancho: 110, anchoMovil: 90, num: true, valor: function (a) { return a._ret; }, html: function (a) { return a._sp ? UI.spark(a._sp, 90, 26) : '<span class="muted peq">…</span>'; } }
    ];
    var raiz = h('div'), ig = h('div.rejilla', { style: 'grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:10px' });
    indices.forEach(function (a) { ig.appendChild(h('div.tarjeta', { tabindex: 0, style: 'cursor:pointer;padding:8px', onclick: function () { App.abrirActivo(a.key); }, onkeydown: function (e) { if (e.key === 'Enter') App.abrirActivo(a.key); } }, h('div.muted.peq', a.nombre), h('b', F.precio(a.precio)), ' ', h('span', { class: UI.clasePct(a.cambio24h) }, F.pct(a.cambio24h)))); });
    if (indices.length) raiz.appendChild(h('div', h('h3', 'Indices'), ig));
    function filtrar() { var qq = q.value.trim().toLowerCase(), b = bolsa.value; t.setFiltro(function (a) { return coincide(a, qq) && (b === 'todas' || a.bolsa === b); }); }
    q = buscarIn(filtrar); bolsa = UI.selector(bolsas, 'todas', { class: 'in', style: 'width:auto', onchange: filtrar, 'aria-label': 'Bolsa' });
    var prog = h('span.muted.peq');
    raiz.appendChild(barraFiltros([q, bolsa, h('span.muted.peq', datos.length + ' valores'), prog]));
    var cuerpo = h('div'); raiz.appendChild(cuerpo); c.appendChild(raiz);
    t = new TablaVirtual(cuerpo, { columnas: cols, alto: 40, orden: { id: 'cap', dir: -1 }, alAbrir: function (a, e) { alAbrir(t)(a, e); } }); App.tabla = t; t.setFilas(datos);
    Mercado.historialLote(datos, 6, function (n, tot) { if (!vivo) return; prog.textContent = n < tot ? 'Cargando tendencias ' + n + '/' + tot : ''; }).then(function (hs) {
      if (!vivo) return; datos.forEach(function (a) { var hh = hs[a.key]; if (hh && hh.velas.length > 10) { var cs = hh.velas.slice(-60).map(function (b) { return b[4]; }); a._sp = cs; a._ret = cs[cs.length - 1] / cs[0] - 1; } }); t.refrescar();
    });
    return { destruir: function () { vivo = false; } };
  }

  function divisas(c) {
    var d = Mercado.sec.divisas.obj, monedas = ['USD'].concat(Object.keys(d.tasas).sort()), dias = 30, area = h('div');
    var monto = h('input.in', { type: 'number', value: 100, min: 0, step: 'any', 'aria-label': 'Monto' }), de = UI.selector(monedas, 'USD', { class: 'in', 'aria-label': 'De' }), a = UI.selector(monedas, 'EUR' in d.tasas ? 'EUR' : monedas[1], { class: 'in', 'aria-label': 'A' }), res = h('div', { style: 'font-size:22px;font-weight:700', 'aria-live': 'polite' }), inv = h('div.muted.peq');
    function conv() { var v = Calculadoras.convertir(+monto.value, de.value, a.value, d.tasas); res.textContent = isFinite(v) ? F.num(+monto.value, 2) + ' ' + de.value + ' = ' + F.num(v, Math.abs(v) >= 1 ? 2 : 6) + ' ' + a.value : 'Sin tasa'; inv.textContent = '1 ' + de.value + ' = ' + F.precio(Calculadoras.convertir(1, de.value, a.value, d.tasas)) + ' ' + a.value + '  ·  1 ' + a.value + ' = ' + F.precio(Calculadoras.convertir(1, a.value, de.value, d.tasas)) + ' ' + de.value; }
    [monto, de, a].forEach(function (x) { x.addEventListener('input', conv); });
    var conv1 = h('div.tarjeta', h('h3', 'Convertidor'), h('div.form-g', UI.campo('Monto', monto), UI.campo('De', de), UI.campo('A', a), h('button.btn', { type: 'button', onclick: function () { var x = de.value; de.value = a.value; a.value = x; conv(); } }, '⇄ Invertir')), res, inv);
    function resto() {
      UI.vaciar(area); var f = DivisasCalc.fuerza(d.hist || {}, dias), max = Math.max.apply(null, f.map(function (x) { return Math.abs(x.fuerza); }).concat([0.01]));
      var sel = UI.selector([{ id: 7, titulo: '7 dias' }, { id: 30, titulo: '30 dias' }, { id: 90, titulo: '90 dias' }], dias, { class: 'in', style: 'width:auto', 'aria-label': 'Periodo', onchange: function () { dias = +this.value; resto(); } });
      var fu = h('div.tarjeta', h('div.fila-flex', h('h3', { style: 'margin:0;flex:1' }, 'Fuerza relativa de monedas'), sel), h('p.peq.muted', 'Rendimiento de cada moneda frente al dolar menos el promedio de la cesta. Positivo = mas fuerte que el promedio.'));
      f.forEach(function (x) { var w = Math.abs(x.fuerza) / max * 50; fu.appendChild(h('div.fila-flex', { style: 'flex-wrap:nowrap;margin:3px 0' }, h('b', { style: 'width:44px' }, x.moneda), h('div', { style: 'flex:1;position:relative;height:14px;background:var(--panel-2);border-radius:3px' }, h('i', { style: 'position:absolute;top:0;bottom:0;border-radius:3px;background:' + (x.fuerza >= 0 ? 'var(--sube)' : 'var(--baja)') + ';' + (x.fuerza >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w + '%' })), h('span', { style: 'width:64px;text-align:right', class: UI.clasePct(x.fuerza) }, F.pct(x.fuerza)))); });
      var mapa = h('div.rejilla', { style: 'grid-template-columns:repeat(auto-fill,minmax(112px,1fr))' });
      Mercado.activos.filter(function (x) { return x.tipo === 'divisa'; }).forEach(function (x) { var ff = f.filter(function (z) { return z.moneda === x.id; })[0], ch = ff ? ff.vsUSD : null; mapa.appendChild(h('div.celda-fx', { tabindex: 0, role: 'button', style: 'cursor:pointer;border-radius:8px;padding:8px;color:#fff;background:' + UI.calor(ch, 4), onclick: function () { App.abrirActivo(x.key); }, onkeydown: function (e) { if (e.key === 'Enter') App.abrirActivo(x.key); } }, h('b', 'USD/' + x.id), h('div', F.precio(x.precio)), h('div.peq', F.pct(ch) + ' (' + dias + 'd)'), h('div', { html: UI.spark(x.spark, 90, 20, 'sube') }))); });
      area.appendChild(h('div.rejilla.g2', fu, h('div.tarjeta', h('h3', 'Mapa de tasas (color = rendimiento vs USD)'), mapa)));
    }
    conv(); resto(); c.appendChild(h('div.rejilla', conv1, area));
    c.appendChild(h('p.peq.muted', 'Tasas con base USD: ' + (d.fuente || '') + '. Los pares sin maximos/minimos se muestran como linea.'));
  }

  function aUSD(v, mon) { var k = { ETH: 'c:ethereum', SOL: 'c:solana', BTC: 'c:bitcoin', WETH: 'c:ethereum', MATIC: 'c:matic-network' }[mon], a = k && Mercado.porKey[k]; return a ? v * a.precio : null; }
  function nft(c) {
    var datos = Mercado.activos.filter(function (a) { return a.tipo === 'nft'; }), t, q, sel = [];
    var cols = [
      { id: 'fav', titulo: '', ancho: 44, anchoMovil: 34, num: true, valor: function (a) { return App.enAlgunaLista(a.key) ? 1 : 0; }, html: star },
      { id: 'nombre', titulo: 'Coleccion', ancho: 220, valor: function (a) { return a.nombre; }, html: function (a) { return '<span class="sim">' + esc(a.nombre) + '</span>'; } },
      { id: 'cadena', titulo: 'Cadena', ancho: 90, valor: function (a) { return a.raw.cadena; }, html: function (a) { return esc(a.raw.cadena); }, ocultarMovil: true },
      { id: 'piso', titulo: 'Piso', ancho: 100, alinear: 'der', num: true, valor: function (a) { return a.precio; }, html: function (a) { return F.precio(a.precio) + ' <span class="muted peq">' + esc(a.moneda) + '</span>'; } },
      { id: 'vol', titulo: 'Volumen 24h', ancho: 110, alinear: 'der', num: true, valor: function (a) { return a.volumen; }, html: function (a) { return F.num(a.volumen, 1) + ' <span class="muted peq">' + esc(a.moneda) + '</span>'; } },
      { id: 'c24', titulo: 'Cambio 24h', ancho: 90, alinear: 'der', num: true, valor: function (a) { return a.cambio24h; }, html: function (a) { return pctHtml(a.cambio24h, 1); } },
      { id: 'ventas', titulo: 'Ventas 24h', ancho: 90, alinear: 'der', num: true, valor: function (a) { return a.raw.ventas24h; }, html: function (a) { return F.num(a.raw.ventas24h, 0); }, ocultarMovil: true },
      { id: 'prop', titulo: 'Propietarios', ancho: 100, alinear: 'der', num: true, valor: function (a) { return a.raw.propietarios; }, html: function (a) { return F.num(a.raw.propietarios, 0); }, ocultarMovil: true },
      { id: 'cmp', titulo: 'Comparar', ancho: 80, valor: function (a) { return sel.indexOf(a.key) >= 0 ? 1 : 0; }, num: true, html: function (a) { return '<input type="checkbox" class="cmp" data-key="' + esc(a.key) + '" ' + (sel.indexOf(a.key) >= 0 ? 'checked' : '') + ' aria-label="Comparar ' + esc(a.nombre) + '">'; } }
    ];
    var raiz = h('div'), cuerpo = h('div'), comp = h('div.tarjeta', { style: 'margin-top:12px' }), cuerpoT = cuerpo;
    function filtrar() { var qq = q.value.trim().toLowerCase(); t.setFiltro(function (a) { return coincide(a, qq); }); }
    q = buscarIn(filtrar); raiz.appendChild(barraFiltros([q, h('span.muted.peq', datos.length + ' colecciones · marca hasta 4 para comparar')])); raiz.appendChild(cuerpo); raiz.appendChild(comp); c.appendChild(raiz);
    function pintarComp() {
      UI.vaciar(comp); comp.appendChild(h('h3', 'Comparador de colecciones'));
      if (sel.length < 2) { comp.appendChild(h('p.muted.peq', 'Marca al menos dos colecciones en la columna "Comparar".')); return; }
      var items = sel.map(function (k) { return Mercado.porKey[k]; }), mets = [['Piso (USD aprox.)', function (a) { return aUSD(a.precio, a.moneda); }, F.precio], ['Volumen 24h (USD aprox.)', function (a) { return aUSD(a.volumen, a.moneda); }, F.grande], ['Cambio 24h %', function (a) { return a.cambio24h; }, F.pct], ['Ventas 24h', function (a) { return a.raw.ventas24h; }, function (v) { return F.num(v, 0); }]];
      mets.forEach(function (m) {
        var vals = items.map(m[1]), mx = Math.max.apply(null, vals.map(function (v) { return v == null ? 0 : Math.abs(v); }).concat([1e-9])); comp.appendChild(h('div.peq.muted', { style: 'margin-top:8px' }, m[0]));
        items.forEach(function (a, i) { var v = vals[i]; comp.appendChild(h('div.fila-flex', { style: 'flex-wrap:nowrap;margin:2px 0' }, h('span', { style: 'width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, a.nombre), h('div.barra', { style: 'flex:1' }, h('i', { style: 'width:' + (v == null ? 0 : Math.abs(v) / mx * 100) + '%;background:' + (v != null && v < 0 ? 'var(--baja)' : 'var(--acento)') })), h('span', { style: 'width:90px;text-align:right' }, v == null ? 'n/d' : m[2](v)))); });
      });
      comp.appendChild(h('p.peq.muted', 'USD aprox. usa el precio actual de ETH/SOL del contrato de cripto; si no esta disponible muestra n/d.'));
    }
    t = new TablaVirtual(cuerpoT, { columnas: cols, alto: 40, orden: { id: 'vol', dir: -1 }, alAbrir: function (a, e) {
      if (e && e.target.closest && e.target.closest('.cmp')) { var k = a.key, i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 4) sel.push(k); else UI.toast('Maximo 4 colecciones'); t.refrescar(); pintarComp(); return; }
      alAbrir(t)(a, e); } }); App.tabla = t; t.setFilas(datos); pintarComp();
  }

  App.registrar('mercados', function (cont, r) {
    var sub = r.sub && SUBS.some(function (s) { return s.id === r.sub; }) ? r.sub : 'cripto', secs = { cripto: 'cripto', acciones: 'acciones', divisas: 'divisas', nft: 'nft' };
    var raiz = h('div'); cont.appendChild(raiz); raiz.appendChild(App.seccionTitulo('Mercados', [secs[sub]]));
    raiz.appendChild(UI.pestanas(SUBS, sub, function (id) { App.ir('mercados', id); }, 'Mercados'));
    var res = { cripto: cripto, acciones: acciones, divisas: divisas, nft: nft }[sub](raiz);
    raiz.appendChild(h('p.legal-pie', window.Guia.AVISO)); return res;
  });
})();
