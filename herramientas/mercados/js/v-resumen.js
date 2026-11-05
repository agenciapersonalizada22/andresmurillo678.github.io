/* Panel de resumen: indices, miedo/codicia, mapa de calor, ganadores/perdedores, calendario de tendencias. */
(function () {
  var h = UI.h, F = window.Fmt;
  function gauge(v) {
    var ang = isFinite(v) ? v / 100 * 180 : 90, rad = (180 - ang) * Math.PI / 180, x = 120 + 80 * Math.cos(rad), y = 120 - 80 * Math.sin(rad);
    var seg = [['#d9534f', 0, 20], ['#e8863a', 20, 40], ['#c9b23a', 40, 60], ['#7bb662', 60, 80], ['#26a69a', 80, 100]].map(function (s) {
      function pt(p, r) { var a = (180 - p * 1.8) * Math.PI / 180; return (120 + r * Math.cos(a)).toFixed(1) + ' ' + (120 - r * Math.sin(a)).toFixed(1); }
      return '<path d="M ' + pt(s[1], 100) + ' A 100 100 0 0 1 ' + pt(s[2], 100) + ' L ' + pt(s[2], 70) + ' A 70 70 0 0 0 ' + pt(s[1], 70) + ' Z" fill="' + s[0] + '" opacity=".85"/>';
    }).join('');
    return '<svg viewBox="0 0 240 135" role="img" aria-label="Indicador de miedo y codicia: ' + (isFinite(v) ? Math.round(v) : 'sin datos') + '">' + seg + '<line x1="120" y1="120" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="120" cy="120" r="6" fill="currentColor"/></svg>';
  }
  function tarjetaMiedo(titulo, res, nota) {
    var d = h('div.tarjeta'), g = h('div.medidor'); g.innerHTML = gauge(res.valor);
    d.appendChild(h('h3', titulo)); d.appendChild(g);
    d.appendChild(h('div.medidor', h('div.val', isFinite(res.valor) ? Math.round(res.valor) : '-'), h('div', res.etiqueta)));
    var det = h('details', h('summary.peq.muted', 'Como se calcula'), h('p.peq.muted', nota));
    res.partes.forEach(function (p) { det.appendChild(h('div.peq', { style: 'margin-top:6px' }, h('div.fila-flex', { style: 'justify-content:space-between' }, h('span', p.nombre + ' (peso ' + p.peso + '%)'), h('b', Math.round(p.valor))), h('div.barra', h('i', { style: 'width:' + p.valor + '%' })), h('span.muted', p.explicacion))); });
    d.appendChild(det); return d;
  }
  function mapaCalor(cont, lista, alAbrir) {
    var box = h('div.heat'); cont.appendChild(box);
    function pintar() {
      UI.vaciar(box); var w = box.clientWidth, hh = box.clientHeight; if (!w) return;
      var rects = Treemap.diseno(lista.map(function (a) { return { id: a.key, valor: a.peso }; }), w, hh), por = {}; lista.forEach(function (a) { por[a.key] = a; });
      rects.forEach(function (r) {
        var a = por[r.id], chico = r.w < 46 || r.h < 30, c = h('div.celda', { role: 'button', tabindex: 0, title: a.nombre + ' ' + F.pct(a.cambio24h), 'aria-label': a.simbolo + ' ' + F.pct(a.cambio24h), style: 'left:' + r.x + 'px;top:' + r.y + 'px;width:' + r.w + 'px;height:' + r.h + 'px;background:' + UI.calor(a.cambio24h, 6), onclick: function () { alAbrir(a); }, onkeydown: function (e) { if (e.key === 'Enter') alAbrir(a); } });
        if (!chico) { c.appendChild(h('b', a.simbolo)); if (r.h > 40) c.appendChild(h('span', F.pct(a.cambio24h, 1))); } box.appendChild(c);
      });
    }
    requestAnimationFrame(pintar); var ro = window.ResizeObserver ? new ResizeObserver(UI.debounce(pintar, 80)) : null; if (ro) ro.observe(box); return { destruir: function () { if (ro) ro.disconnect(); } };
  }
  function lista(titulo, arr, extra) {
    var d = h('div.lista-mov');
    arr.forEach(function (a) { d.appendChild(h('a', { tabindex: 0, onclick: function () { App.abrirActivo(a.key); }, onkeydown: function (e) { if (e.key === 'Enter') App.abrirActivo(a.key); } }, h('span', h('b', a.simbolo), ' ', h('span.muted.peq', a.nombre.slice(0, 22))), h('span', F.precio(a.precio), ' ', h('b', { class: UI.clasePct(a.cambio24h) }, F.pct(a.cambio24h))))); });
    return h('div', h('h3', titulo), d);
  }
  function calendario(velas) {
    var v = velas.slice(-85), d0 = new Date(v[0][0]), lead = (d0.getUTCDay() + 6) % 7, cal = h('div.cal'), nom = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    nom.forEach(function (n) { cal.appendChild(h('div.dh', n)); }); for (var i = 0; i < lead; i++) cal.appendChild(h('div', { style: 'background:none' }));
    v.forEach(function (b, k) { var r = k ? (b[4] / v[k - 1][4] - 1) * 100 : 0; cal.appendChild(h('div', { style: 'background:' + UI.calor(r, 5), title: F.fecha(b[0], true) + ': ' + F.pct(r) }, new Date(b[0]).getUTCDate())); });
    return cal;
  }
  App.registrar('resumen', function (cont) {
    var M = Mercado, vivos = [], cripto = M.activos.filter(function (a) { return a.tipo === 'cripto'; }), acc = M.activos.filter(function (a) { return a.tipo === 'accion'; }), idx = M.activos.filter(function (a) { return a.tipo === 'indice'; });
    var raiz = h('div'); cont.appendChild(raiz);
    raiz.appendChild(App.seccionTitulo('Resumen del mercado', ['cripto', 'acciones', 'divisas']));
    // indices
    var gi = h('div.rejilla.g4.m2', { style: 'grid-template-columns:repeat(auto-fill,minmax(150px,1fr))' }), sp = {};
    idx.forEach(function (a) { var s = h('div'); sp[a.key] = s; gi.appendChild(h('div.tarjeta', { tabindex: 0, style: 'cursor:pointer', onclick: function () { App.abrirActivo(a.key); }, onkeydown: function (e) { if (e.key === 'Enter') App.abrirActivo(a.key); } }, h('div.muted.peq', a.nombre), h('div', { style: 'font-size:17px;font-weight:600' }, F.precio(a.precio)), h('div', { class: UI.clasePct(a.cambio24h) }, F.pct(a.cambio24h)), s)); });
    if (idx.length) raiz.appendChild(h('div', h('h3', 'Indices'), gi));
    // miedo y codicia
    var mz = h('div.rejilla.g2', { style: 'margin-top:12px' }), cm = h('div'), cb = h('div'); mz.appendChild(cm); mz.appendChild(cb);
    var notaCripto = 'Indice propio (no es el de terceros), calculado con los datos del contrato: amplitud, momentum, volatilidad y posicion en el rango de 90 dias del activo de referencia (Bitcoin). 0 = miedo extremo, 100 = codicia extrema. Es una lectura de sentimiento, no una senal de compra o venta.';
    function miedo(refVelas) {
      var rc = Sentimiento.calcular({ c24: cripto.map(function (a) { return a.cambio24h; }).filter(F.ok), c7: cripto.map(function (a) { return a.cambio7d; }).filter(F.ok), ref: refVelas.btc && refVelas.btc.map(function (b) { return b[4]; }) });
      var rb = Sentimiento.calcular({ c24: acc.map(function (a) { return a.cambio24h; }).filter(F.ok), ref: refVelas.spx && refVelas.spx.map(function (b) { return b[4]; }) });
      UI.vaciar(cm); UI.vaciar(cb); cm.appendChild(tarjetaMiedo('Miedo y codicia · Cripto', rc, notaCripto)); cb.appendChild(tarjetaMiedo('Miedo y codicia · Bolsa', rb, notaCripto.replace('Bitcoin', 'S&P 500').replace('momentum, ', '')));
    }
    miedo({}); raiz.appendChild(mz);
    // mapa de calor
    var modo = 'cripto', hm = h('div'), bar = h('div.fila-flex', { style: 'margin:14px 0 6px' }, h('h3', { style: 'margin:0;flex:1' }, 'Mapa de calor (tamano = capitalizacion, color = cambio 24h)'));
    var hmCtl = null;
    function bt(id, t) { var b = h('button.btn.peq', { type: 'button', 'aria-pressed': modo === id ? 'true' : 'false', onclick: function () { modo = id; pintarHM(); Array.prototype.forEach.call(bar.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x.dataset.id === id ? 'true' : 'false'); }); } }, t); b.dataset.id = id; return b; }
    bar.appendChild(bt('cripto', 'Cripto')); bar.appendChild(bt('acciones', 'Acciones'));
    function pintarHM() {
      if (hmCtl) hmCtl.destruir(); UI.vaciar(hm);
      var base = modo === 'cripto' ? cripto.slice(0, 60) : acc, l = base.map(function (a) { return Object.assign({}, a, { peso: a.capitalizacion || (a.volumen || 0) * a.precio }); }).filter(function (a) { return a.peso > 0; });
      hmCtl = mapaCalor(hm, l, function (a) { App.abrirActivo(a.key); });
    }
    raiz.appendChild(bar); raiz.appendChild(hm); pintarHM();
    // ganadores / perdedores
    var ord = function (arr, d) { return arr.filter(function (a) { return F.ok(a.cambio24h); }).sort(function (a, b) { return (b.cambio24h - a.cambio24h) * d; }).slice(0, 5); };
    raiz.appendChild(h('div.rejilla.g4.d2', { style: 'margin-top:12px' }, h('div.tarjeta', lista('Cripto · ganadores 24h', ord(cripto.slice(0, 100), 1))), h('div.tarjeta', lista('Cripto · perdedores 24h', ord(cripto.slice(0, 100), -1))),
      h('div.tarjeta', lista('Bolsa · ganadores', ord(acc, 1))), h('div.tarjeta', lista('Bolsa · perdedores', ord(acc, -1)))));
    // calendario + divisas + noticias
    var calc = h('div.tarjeta', h('h3', 'Calendario de tendencias · Bitcoin (rendimiento diario, 12 semanas)'), h('div.cargando.peq', 'Cargando…'));
    var fx = M.activos.filter(function (a) { return a.tipo === 'divisa' && ['EUR', 'GBP', 'JPY', 'MXN', 'BRL', 'COP'].indexOf(a.id) >= 0; });
    var fxc = h('div.tarjeta', h('h3', 'Divisas (por 1 USD)')); fx.forEach(function (a) { fxc.appendChild(h('div.lista-mov', h('a', { tabindex: 0, onclick: function () { App.abrirActivo(a.key); } }, h('span', h('b', a.id)), h('span', F.precio(a.precio), ' ', h('b', { class: UI.clasePct(a.cambio24h) }, F.pct(a.cambio24h)))))); });
    var nots = ((M.sec.noticias && M.sec.noticias.obj.items) || []).slice(0, 5), nc = h('div.tarjeta', h('h3', 'Ultimas noticias'));
    nots.forEach(function (n) { nc.appendChild(h('div.noticia', h('h4', h('a', { href: F.urlSegura(n.enlace), target: '_blank', rel: 'noopener noreferrer' }, n.titulo)), h('div.meta', n.fuente, ' · ', F.edad(Date.now() - Date.parse(n.fecha)), h('span.sent' + (n.sentimiento > 0.15 ? '.pos' : n.sentimiento < -0.15 ? '.neg' : ''))))); });
    raiz.appendChild(h('div.rejilla.g3', { style: 'margin-top:12px' }, calc, fxc, nc));
    raiz.appendChild(h('p.legal-pie', window.Guia.AVISO));
    // cargas asincronas: indices (sparklines), BTC (calendario + miedo)
    var vivo = true, btc = M.porKey['c:bitcoin'], spx = M.porKey['i:^GSPC'] || idx[0];
    M.historialLote(idx, 4).then(function (hs) { if (!vivo) return; idx.forEach(function (a) { if (hs[a.key] && sp[a.key]) sp[a.key].innerHTML = UI.spark(hs[a.key].velas.slice(-60).map(function (b) { return b[4]; }), 120, 28); }); });
    Promise.all([btc ? M.historial(btc) : null, spx ? M.historial(spx) : null]).then(function (r) {
      if (!vivo) return; miedo({ btc: r[0] && r[0].velas.length > 100 ? r[0].velas : null, spx: r[1] && r[1].velas.length > 100 ? r[1].velas : null });
      UI.vaciar(calc); calc.appendChild(h('h3', 'Calendario de tendencias · Bitcoin (rendimiento diario, 12 semanas)'));
      if (r[0] && r[0].velas.length > 20 && !r[0].soloCierre) { calc.appendChild(calendario(r[0].velas)); calc.appendChild(h('p.peq.muted', 'Cada casilla es un dia: verde = cierre al alza, rojo = a la baja; la intensidad crece con la magnitud (saturacion en ±5%).')); }
      else calc.appendChild(h('p.muted.peq', 'Sin historial diario disponible.'));
    }).catch(function () { });
    return { destruir: function () { vivo = false; if (hmCtl) hmCtl.destruir(); } };
  });
})();
