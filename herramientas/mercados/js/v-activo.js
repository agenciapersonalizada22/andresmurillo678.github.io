/* Vista de activo: grafica profesional, indicadores, dibujos, patrones, estadisticas y noticias. */
(function () {
  var h = UI.h, F = window.Fmt, esc = F.esc;
  var HERR = [['tendencia', 'Tendencia'], ['horizontal', 'Horizontal'], ['fibo', 'Fibonacci'], ['rect', 'Rectangulo']];
  function benchDe(a) { if (a.tipo === 'cripto') return Mercado.porKey[a.key === 'c:bitcoin' ? 'c:ethereum' : 'c:bitcoin']; if (a.tipo === 'accion') return Mercado.porKey['i:^GSPC'] || Mercado.porKey['a:SPY']; return null; }
  function noticiasDe(a) {
    var items = (Mercado.sec.noticias && Mercado.sec.noticias.obj.items) || [], s = a.simbolo.toUpperCase(), id = String(a.id).toUpperCase(), n = a.nombre.toLowerCase().split(' ')[0];
    return items.filter(function (x) { return (x.tickers || []).some(function (t) { t = String(t).toUpperCase(); return t === s || t === id || (a.tipo === 'divisa' && t === 'USD' + a.id); }) || (n.length > 4 && x.titulo.toLowerCase().indexOf(n) >= 0); });
  }
  App.noticiasDe = noticiasDe;

  App.registrar('activo', function (cont, r) {
    var key = r.sub || App.ajustes().ultimoActivo, a = Mercado.porKey[key], vivo = true, G = null, raw = [], marco = 'D', tipo = 'velas', log = false, vol = App.ajustes().volumen !== false, resumen = null, soloCierre = false;
    var raiz = h('div'); cont.appendChild(raiz);
    if (!a) { raiz.appendChild(h('div.banner', 'No se encontro el activo ' + key + '. ', h('button.btn', { onclick: App.buscar }, 'Buscar activo'))); return {}; }
    var sec = Mercado.secOf(a), specs = (App.ajustes().indicadores || []).map(function (s) { return Object.assign({}, s); });
    // cabecera
    var cab = h('div.fila-flex', { style: 'align-items:flex-end;margin-bottom:8px' });
    cab.appendChild(h('div', { style: 'flex:1;min-width:200px' }, h('div.fila-flex', h('h1', { style: 'margin:0' }, a.simbolo), h('span.chip', App.tipoLegible[a.tipo]), a.bolsa ? h('span.chip', a.bolsa) : null, App.chipFuente(sec)), h('div.muted', a.nombre)));
    var mon = a.tipo === 'nft' ? ' ' + a.moneda : a.tipo === 'divisa' ? ' ' + a.id : a.tipo === 'indice' ? ' pts' : ' USD';
    cab.appendChild(h('div', { style: 'text-align:right' }, h('div.precio-g', F.precio(a.precio) + mon), h('div', { class: UI.clasePct(a.cambio24h) }, F.pct(a.cambio24h) + ' hoy' + (a.cambio7d != null ? '  ·  ' + F.pct(a.cambio7d) + ' 7d' : ''))));
    raiz.appendChild(cab);
    var acc = h('div.toolbar'); acc.appendChild(App.estrella(key));
    acc.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { App.dialogoAlerta(key); } }, '⏰ Crear alerta'));
    if (a.tipo !== 'divisa' && a.tipo !== 'nft') acc.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { App.dialogoOrden(key); } }, 'Operar (simulada)'));
    acc.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { App.ir('analisis', 'comparador', key); } }, 'Comparar'));
    raiz.appendChild(acc);
    if (a.tipo === 'nft') { raiz.appendChild(h('div.tarjeta', h('dl.kv', h('dt', 'Piso'), h('dd', F.precio(a.precio) + ' ' + a.moneda), h('dt', 'Volumen 24h'), h('dd', F.num(a.volumen, 1) + ' ' + a.moneda), h('dt', 'Ventas 24h'), h('dd', F.num(a.raw.ventas24h, 0)), h('dt', 'Propietarios'), h('dd', F.num(a.raw.propietarios, 0)), h('dt', 'Cadena'), h('dd', a.raw.cadena)), a.raw.url ? h('p', h('a', { href: F.urlSegura(a.raw.url), target: '_blank', rel: 'noopener noreferrer' }, 'Ver coleccion (sitio externo)')) : null, h('p.muted.peq', 'Las colecciones NFT no tienen historial de precios en los datos disponibles.'))); pie(); return {}; }
    // barra de herramientas del grafico
    var tb = h('div.toolbar.scroll'), tbH = h('div.toolbar.scroll'), btns = {};
    function grupo(items, actual, f, etq) { items.forEach(function (it) { var b = h('button.btn.peq', { type: 'button', 'aria-pressed': it[0] === actual ? 'true' : 'false', 'aria-label': etq + ' ' + it[1], onclick: function () { f(it[0]); Array.prototype.forEach.call(b.parentNode.querySelectorAll('[data-g="' + etq + '"]'), function (x) { x.setAttribute('aria-pressed', x.dataset.v === it[0] ? 'true' : 'false'); }); } }, it[1]); b.dataset.g = etq; b.dataset.v = it[0]; tb.appendChild(b); }); tb.appendChild(h('span.sep')); }
    grupo([['velas', 'Velas'], ['linea', 'Linea'], ['area', 'Area'], ['heikin', 'Heikin-Ashi']], tipo, function (v) { tipo = v; if (G) G.setTipo(v); }, 'Tipo');
    grupo([['D', 'D'], ['W', 'S'], ['M', 'M']], marco, function (v) { marco = v; calcular(true); }, 'Marco');
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': 'false', onclick: function () { log = !log; this.setAttribute('aria-pressed', log); if (G) G.setLog(log); } }, 'Log'));
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': String(vol), onclick: function () { vol = !vol; this.setAttribute('aria-pressed', vol); App.setAjuste('volumen', vol); if (G) G.setVolumen(vol); } }, 'Volumen'));
    var sr = false, piv = false;
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': 'false', onclick: function () { sr = !sr; this.setAttribute('aria-pressed', sr); niveles(); } }, 'S/R'));
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-pressed': 'false', onclick: function () { piv = !piv; this.setAttribute('aria-pressed', piv); niveles(); } }, 'Pivotes'));
    var btnInd = h('button.btn.peq', { type: 'button', 'aria-haspopup': 'dialog', onclick: function () { panelInd(); } }, 'ƒ Indicadores');
    tb.appendChild(btnInd); tb.appendChild(h('span.sep'));
    [['1M', 30], ['3M', 90], ['6M', 180], ['1A', 365], ['Todo', 0]].forEach(function (q) { tb.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { if (!G) return; var N = G.vista().n, len = vlen(); if (marco !== 'D') { var d = marco === 'W' ? 7 : 30; q = [q[0], q[1] / d]; } if (!q[1]) G.reiniciarVista(); else G.fijarVista(len - q[1], q[1] + 8); } }, q[0])); });
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-label': 'Acercar', onclick: function () { G && G.zoom(1 / 1.3); } }, '+'));
    tb.appendChild(h('button.btn.peq', { type: 'button', 'aria-label': 'Alejar', onclick: function () { G && G.zoom(1.3); } }, '−'));
    tb.appendChild(h('button.btn.peq', { type: 'button', title: 'Guardar imagen', onclick: function () { if (G) { var l = document.createElement('a'); l.href = G.png(); l.download = a.simbolo + '.png'; l.click(); } } }, 'PNG'));
    HERR.forEach(function (q) { var b = h('button.btn.peq', { type: 'button', 'aria-pressed': 'false', 'data-h': q[0], onclick: function () { if (G) G.setHerramienta(G._herr === q[0] ? null : q[0]); } }, q[1]); btns[q[0]] = b; tbH.appendChild(b); });
    tbH.appendChild(h('span.muted.peq', 'Dibujar:')); tbH.insertBefore(tbH.lastChild, tbH.firstChild);
    tbH.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { G && G.deshacer(); } }, 'Deshacer'));
    tbH.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { G && G.borrarSeleccion(); } }, 'Borrar seleccion'));
    tbH.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { G && G.hayDibujos() && confirm('Borrar todos los dibujos de ' + a.simbolo + '?') && G.borrarTodo(); } }, 'Borrar todo'));
    raiz.appendChild(tb); raiz.appendChild(tbH);
    var nota = h('div'); raiz.appendChild(nota);
    var gc = h('div.graf-cont'); raiz.appendChild(gc);
    gc.appendChild(h('div.cargando', h('span.gira'), 'Cargando historial…'));
    function vlen() { return marco === 'D' ? raw.length : Indicadores.agregar(raw, marco).length; }

    // pestanas inferiores
    var sub = 'tecnico', inf = h('div', { style: 'margin-top:12px' });
    raiz.appendChild(inf);
    function pintarInf() {
      UI.vaciar(inf);
      inf.appendChild(UI.pestanas([{ id: 'tecnico', titulo: 'Estadisticas' }, { id: 'patrones', titulo: 'Patrones de velas' }, { id: 'noticias', titulo: 'Noticias' }, { id: 'guia', titulo: 'Guia de indicadores' }], sub, function (id) { sub = id; pintarInf(); }));
      var c = h('div.tarjeta'); inf.appendChild(c);
      if (!raw.length) { c.appendChild(h('p.muted', 'Sin historial.')); return; }
      if (sub === 'tecnico') tecnico(c); else if (sub === 'patrones') patrones(c); else if (sub === 'noticias') noticias(c); else guia(c);
    }
    function tecnico(c) {
      if (!resumen) { c.appendChild(h('p.muted', 'Calculando…')); return; }
      var m = Screener.metricas(raw), n = function (v, d) { return F.ok(v) ? F.num(v, d == null ? 2 : d) : '-'; }, bench = benchDe(a);
      var kv = h('dl.kv');
      function fila(k, v, cl) { kv.appendChild(h('dt', k)); kv.appendChild(h('dd', { class: cl || '' }, v)); }
      var c52 = raw.slice(-365);
      fila('Maximo 52 sem.', F.precio(Math.max.apply(null, c52.map(function (b) { return b[2]; })))); fila('Minimo 52 sem.', F.precio(Math.min.apply(null, c52.map(function (b) { return b[3]; }))));
      fila('RSI (14)', n(m.rsi14, 1), m.rsi14 > 70 ? 'baja' : m.rsi14 < 30 ? 'sube' : ''); fila('Precio vs SMA 50', F.ok(m.sma50) ? F.pct((m.precio / m.sma50 - 1) * 100) : '-'); fila('Precio vs SMA 200', F.ok(m.sma200) ? F.pct((m.precio / m.sma200 - 1) * 100) : '- (menos de 200 velas)');
      fila('ADX (14)', n(m.adx14, 1)); fila('ATR (14) % del precio', n(m.atrPct) + '%'); fila('%B Bollinger', n(m.pctB));
      fila('Volatilidad hist. 30d (anual)', F.pct(resumen.vol30 * 100, 1)); fila('Maximo drawdown (' + raw.length + ' velas)', F.pct(resumen.maxDD.max * 100, 1), 'baja'); fila('Drawdown actual vs max. 52 sem.', F.pct(m.dd, 1), 'baja');
      fila('Sharpe (rf = 0)', n(resumen.sharpe)); if (bench) { fila('Beta vs ' + bench.simbolo, n(resumen.beta)); fila('Correlacion vs ' + bench.simbolo, n(resumen.correl)); }
      c.appendChild(kv);
      var lv = h('div', { style: 'margin-top:12px' }, h('h3', 'Soporte y resistencia (fractales agrupados)'));
      resumen.sr.slice().forEach(function (s) { lv.appendChild(h('div.fila-flex', { style: 'justify-content:space-between' }, h('span', { class: s.tipo === 'soporte' ? 'sube' : 'baja' }, s.tipo === 'soporte' ? 'Soporte' : 'Resistencia'), h('span', F.precio(s.precio)), h('span.muted.peq', s.toques + ' toques'))); });
      var p = resumen.piv; lv.appendChild(h('p.peq.muted', 'Pivotes clasicos (ultima vela cerrada): P ' + F.precio(p.P) + ' · R1 ' + F.precio(p.R1) + ' · R2 ' + F.precio(p.R2) + ' · S1 ' + F.precio(p.S1) + ' · S2 ' + F.precio(p.S2)));
      c.appendChild(lv); c.appendChild(h('p.peq.muted', 'Estadisticas sobre ' + raw.length + ' velas diarias' + (soloCierre ? ' (solo cierres)' : '') + '. Informacion educativa.'));
    }
    function patrones(c) {
      var dato = Indicadores.agregar(raw, marco);
      Calc.llamar('patrones', { velas: dato, ultimas: 120 }).then(function (ps) {
        if (!vivo) return; UI.vaciar(c); c.appendChild(h('p.peq.muted', 'Ultimos 120 periodos del marco ' + marco + '. Son heuristicas simples con poca capacidad predictiva por si solas: usalas como contexto, junto a tendencia y volumen.'));
        if (soloCierre) c.appendChild(h('p.banner', 'Este activo solo tiene cierres: los patrones de velas no son fiables.'));
        if (!ps.length) c.appendChild(h('p.muted', 'No se detectaron patrones.'));
        ps.slice().reverse().slice(0, 40).forEach(function (p) { c.appendChild(h('div.noticia', h('div.fila-flex', h('b', p.nombre), h('span.etq.' + p.sesgo, p.sesgo), h('span.muted.peq', F.fecha(p.t, true))), h('div.peq.muted', p.desc))); });
      });
    }
    function noticias(c) {
      var ns = noticiasDe(a); if (!ns.length) { c.appendChild(h('p.muted', 'No hay noticias enlazadas a este activo.')); return; }
      var avg = ns.reduce(function (s, n) { return s + (n.sentimiento || 0); }, 0) / ns.length;
      c.appendChild(h('p', 'Resumen: ', h('b', ns.length + ' noticias'), ', sentimiento medio ', h('b', { class: avg > 0.15 ? 'sube' : avg < -0.15 ? 'baja' : '' }, (avg >= 0 ? '+' : '') + avg.toFixed(2)), ' (de -1 a 1).'));
      ns.slice(0, 12).forEach(function (n) { c.appendChild(h('div.noticia', h('h4', h('a', { href: F.urlSegura(n.enlace), target: '_blank', rel: 'noopener noreferrer' }, n.titulo)), h('div.peq.muted', n.resumen), h('div.meta', n.fuente, ' · ', F.edad(Date.now() - Date.parse(n.fecha)), h('span.sent' + (n.sentimiento > 0.15 ? '.pos' : n.sentimiento < -0.15 ? '.neg' : ''))))); });
    }
    function guia(c) {
      var ids = specs.map(function (s) { return s.id; }).concat(['sr', 'vol', 'dd', 'sharpe', 'beta']), vistos = {};
      c.appendChild(h('p.peq.muted', 'Explicacion de los indicadores activos y de las estadisticas.')); var g = h('div.guia');
      window.Guia.IND.forEach(function (i) { if (ids.indexOf(i.id) < 0 || vistos[i.id]) return; vistos[i.id] = 1; g.appendChild(h('h3', i.n)); g.appendChild(h('p', h('code.f', i.f))); g.appendChild(h('p', i.t)); g.appendChild(h('p.muted.peq', 'Limitaciones: ' + i.l)); }); c.appendChild(g);
    }

    // panel de indicadores
    function panelInd() {
      var cat = Ops.CATALOGO, cuerpo = h('div');
      function pintar() {
        UI.vaciar(cuerpo);
        Object.keys(cat).forEach(function (id) {
          var inst = specs.filter(function (s) { return s.id === id; }), multi = ['sma', 'ema', 'wma'].indexOf(id) >= 0, tienePn = 'n' in cat[id].params;
          var fila = h('div.ind-fila', h('b', { style: 'width:110px' }, cat[id].nombre));
          inst.forEach(function (s) {
            fila.appendChild(tienePn ? h('input.in', { type: 'number', min: 2, max: 400, value: s.params.n || cat[id].params.n, style: 'width:70px;min-height:30px', 'aria-label': 'Periodo ' + cat[id].nombre, onchange: function () { s.params.n = Math.max(2, +this.value || 2); guardarSpecs(); } }) : null);
            fila.appendChild(h('button.btn.peq', { type: 'button', 'aria-label': 'Quitar ' + cat[id].nombre, onclick: function () { specs.splice(specs.indexOf(s), 1); guardarSpecs(); pintar(); } }, '✕'));
          });
          if (!inst.length || multi) fila.appendChild(h('button.btn.peq', { type: 'button', onclick: function () { specs.push({ uid: id + Date.now(), id: id, params: Object.assign({}, cat[id].params, multi && inst.length ? { n: [20, 50, 100, 200][inst.length % 4] } : {}) }); guardarSpecs(); pintar(); } }, inst.length ? '+ otra' : 'Anadir'));
          cuerpo.appendChild(fila);
        });
        cuerpo.appendChild(h('p.peq.muted', 'VWAP solo se dibuja con velas intradia; con datos diarios no aplica.'));
      }
      pintar(); App.dialogo('Indicadores', cuerpo, [{ t: 'Listo', pri: true }]);
    }
    function guardarSpecs() { App.setAjuste('indicadores', specs); calcular(false); }

    function niveles() {
      if (!G || !resumen) return; var lv = [];
      if (sr) resumen.sr.forEach(function (s) { lv.push({ precio: s.precio, etiqueta: (s.tipo === 'soporte' ? 'S ' : 'R ') + F.precio(s.precio) + ' (' + s.toques + ')', color: s.tipo === 'soporte' ? 'var(--sube)' : 'var(--baja)' }); });
      if (piv) { var p = resumen.piv; [['P', p.P], ['R1', p.R1], ['R2', p.R2], ['S1', p.S1], ['S2', p.S2]].forEach(function (q) { lv.push({ precio: q[1], etiqueta: q[0], color: '#c678dd' }); }); }
      lv.forEach(function (l) { if (/^var\(/.test(l.color)) l.color = getComputedStyle(gc).getPropertyValue(l.color.slice(4, -1)).trim() || '#888'; }); G.setNiveles(lv);
    }
    function calcular(reiniciar) {
      if (!G) return; var velas = Indicadores.agregar(raw, marco); G.setDatos(velas, reiniciar !== false && reiniciar);
      var ss = specs.filter(function (s) { return s.id !== 'vwap' || Indicadores.esIntradia(velas); });
      Calc.llamar('capas', { velas: velas, specs: ss }).then(function (cs) { if (!vivo) return; G.setCapas(cs.filter(function (c) { return c.panel === 'precio'; }), cs.filter(function (c) { return c.panel === 'sub'; })); }).catch(function (e) { UI.toast('Indicadores: ' + e.message, 'error'); });
    }
    function pie() { raiz.appendChild(h('p.legal-pie', window.Guia.AVISO)); }

    Mercado.historial(a, { directo: true }).then(function (res) {
      if (!vivo) return; raw = res.velas; soloCierre = !!res.soloCierre; UI.vaciar(gc);
      if (res.nota) nota.appendChild(h('div.banner.azul', { style: 'margin-bottom:8px' }, res.nota));
      if (res.origen === 'demo') nota.appendChild(h('div.banner', { style: 'margin-bottom:8px' }, 'Historial de ejemplo (DEMO): no corresponde a precios reales.'));
      if (!raw.length) { gc.appendChild(h('div.cargando', 'No hay historial disponible para este activo.')); pintarInf(); return; }
      if (soloCierre) { tipo = 'linea'; vol = false; }
      G = new Grafica(gc); App.grafica = G; G.setTipo(tipo); G.setVolumen(vol); G.onHerramienta = function (hh) { G._herr = hh; Object.keys(btns).forEach(function (k) { btns[k].setAttribute('aria-pressed', k === hh ? 'true' : 'false'); }); };
      G.setDibujos(Almacen.get('dibujos_' + key, [])); G.onDibujos = function (d) { Almacen.set('dibujos_' + key, d); };
      calcular(true);
      var bench = benchDe(a), bp = bench && bench.key !== key ? Mercado.historial(bench).catch(function () { return null; }) : Promise.resolve(null);
      bp.then(function (b) { return Calc.llamar('resumen', { velas: raw, bench: b && !b.soloCierre ? b.velas : null }); }).then(function (rs) { if (!vivo) return; resumen = rs; niveles(); pintarInf(); }).catch(function (e) { UI.toast('Estadisticas: ' + e.message, 'error'); });
      pintarInf();
    }).catch(function (e) { UI.vaciar(gc); gc.appendChild(h('div.cargando', 'No se pudo cargar el historial: ' + e.message)); });
    pie();
    return { destruir: function () { vivo = false; if (G) G.destruir(); App.grafica = null; } };
  });
})();
