/* Analisis: comparador, correlaciones, screener, backtesting y calculadoras. */
(function () {
  var h = UI.h, F = window.Fmt, esc = F.esc;
  var SUBS = [{ id: 'comparador', titulo: 'Comparador' }, { id: 'correlaciones', titulo: 'Correlaciones' }, { id: 'screener', titulo: 'Screener' }, { id: 'backtest', titulo: 'Backtesting' }, { id: 'calculadoras', titulo: 'Calculadoras' }];
  var PAL = ['var(--c2)', 'var(--c1)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

  /* grafico de lineas SVG: series [{nombre, color, x:[t], y:[v]}] ; opts {pct, base} */
  function lineasSVG(series, opts) {
    opts = opts || {}; var W = 720, H = 240, L = 46, R = 70, T = 10, B = 22, mn = Infinity, mx = -Infinity, t0 = Infinity, t1 = -Infinity;
    series.forEach(function (s) { s.y.forEach(function (v) { if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }); t0 = Math.min(t0, s.x[0]); t1 = Math.max(t1, s.x[s.x.length - 1]); });
    if (!isFinite(mn)) return h('div.muted', 'Sin datos'); if (mn === mx) { mn -= 1; mx += 1; } var pd = (mx - mn) * 0.05; mn -= pd; mx += pd;
    var X = function (t) { return L + (t - t0) / (t1 - t0 || 1) * (W - L - R); }, Y = function (v) { return T + (1 - (v - mn) / (mx - mn)) * (H - T - B); }, s = '';
    var paso = Math.pow(10, Math.floor(Math.log10((mx - mn) / 4))); paso *= (mx - mn) / 4 / paso < 2 ? 1 : (mx - mn) / 4 / paso < 4 ? 2 : 5;
    for (var v = Math.ceil(mn / paso) * paso; v <= mx; v += paso) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="var(--rejilla)"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + F.num(v, paso < 1 ? 2 : 0) + '</text>';
    for (var k = 0; k <= 4; k++) { var tt = t0 + (t1 - t0) * k / 4; s += '<text x="' + X(tt).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + F.fecha(tt, true) + '</text>'; }
    if (opts.base != null) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(opts.base).toFixed(1) + '" y2="' + Y(opts.base).toFixed(1) + '" stroke="var(--texto-2)" stroke-dasharray="3 3"/>';
    series.forEach(function (se) {
      var paso2 = Math.max(1, Math.floor(se.x.length / 400)), pts = []; for (var i = 0; i < se.x.length; i += paso2) if (isFinite(se.y[i])) pts.push(X(se.x[i]).toFixed(1) + ',' + Y(se.y[i]).toFixed(1));
      s += '<polyline fill="none" style="stroke:' + se.color + '" stroke-width="1.8" points="' + pts.join(' ') + '"/>';
      var last = se.y[se.y.length - 1]; s += '<text x="' + (W - R + 4) + '" y="' + (Y(last) + 3).toFixed(1) + '" style="fill:' + se.color + '">' + esc(se.nombre.slice(0, 8)) + ' ' + F.num(last, 1) + '</text>';
    });
    var d = h('div'); d.innerHTML = '<svg class="curva" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafico de lineas">' + s + '</svg>'; return d;
  }
  function selectorActivos(sel, max, alCambiar, filtro) {
    var cont = h('div'), chips = h('div.fila-flex'), inp = h('input.in', { type: 'search', placeholder: 'Anadir activo (BTC, AAPL, EUR…)', list: 'dl-act', style: 'max-width:260px', 'aria-label': 'Anadir activo' });
    var dl = h('datalist#dl-act'); Mercado.activos.filter(filtro || function (a) { return a.tipo !== 'nft'; }).slice(0, 400).forEach(function (a) { dl.appendChild(h('option', { value: a.simbolo, label: a.nombre })); });
    function pintar() { UI.vaciar(chips); sel.forEach(function (k, i) { var a = Mercado.porKey[k]; if (a) chips.appendChild(h('span.chip', { style: 'border-color:' + PAL[i % 6] }, a.simbolo, h('button.estrella', { type: 'button', 'aria-label': 'Quitar ' + a.simbolo, onclick: function () { sel.splice(i, 1); pintar(); alCambiar(); } }, '✕'))); }); }
    function anadir() { var r = Mercado.buscar(inp.value, 1)[0]; if (!r) return UI.toast('No se encontro ' + inp.value); if (sel.indexOf(r.key) >= 0) return; if (sel.length >= max) return UI.toast('Maximo ' + max + ' activos'); sel.push(r.key); inp.value = ''; pintar(); alCambiar(); }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') anadir(); }); inp.addEventListener('change', function () { if (Mercado.buscar(inp.value, 1)[0] && Mercado.buscar(inp.value, 1)[0].simbolo.toLowerCase() === inp.value.toLowerCase()) anadir(); });
    cont.appendChild(h('div.fila-flex', inp, h('button.btn', { type: 'button', onclick: anadir }, 'Anadir'), dl)); cont.appendChild(chips); pintar(); return cont;
  }
  function cargarVelas(keys) { return Promise.all(keys.map(function (k) { return Mercado.historial(Mercado.porKey[k]).then(function (r) { return { id: k, velas: r.velas, soloCierre: r.soloCierre }; }, function () { return { id: k, velas: [] }; }); })); }

  function comparador(c, extra) {
    var sel = Almacen.get('cmp_sel', ['c:bitcoin', 'c:ethereum', 'i:^GSPC']).filter(function (k) { return Mercado.porKey[k]; }), dias = 180, area = h('div'), vivo = true;
    if (extra && Mercado.porKey[extra] && sel.indexOf(extra) < 0) sel.push(extra);
    var rng = UI.selector([{ id: 30, titulo: '30 dias' }, { id: 90, titulo: '90 dias' }, { id: 180, titulo: '6 meses' }, { id: 365, titulo: '1 ano' }, { id: 0, titulo: 'Maximo comun' }], dias, { class: 'in', style: 'width:auto', 'aria-label': 'Periodo', onchange: function () { dias = +this.value; pintar(); } });
    function pintar() {
      Almacen.set('cmp_sel', sel); UI.vaciar(area); if (sel.length < 2) { area.appendChild(h('p.muted', 'Elige al menos dos activos.')); return; } area.appendChild(h('div.cargando', h('span.gira'), 'Cargando…'));
      cargarVelas(sel).then(function (series) {
        if (!vivo) return; UI.vaciar(area); series = series.filter(function (s) { return s.velas.length > 5; }); if (series.length < 2) { area.appendChild(h('p.muted', 'Sin historial suficiente para comparar.')); return; }
        var al = Riesgo.alinear(series), n = al.dias.length; if (n < 5) { area.appendChild(h('p.muted', 'Los activos no comparten dias suficientes (' + n + ').')); return; }
        var from = dias ? Math.max(0, n - dias) : 0, xs = al.dias.slice(from).map(function (d) { return d * 86400000; }), ser = series.map(function (s, i) { var cs = al.cierres[s.id].slice(from); return { nombre: Mercado.porKey[s.id].simbolo, color: PAL[i % 6], x: xs, y: Riesgo.normalizar(cs, 100), cs: cs }; });
        area.appendChild(lineasSVG(ser, { base: 100 }));
        var t = h('table.t', h('thead', h('tr', h('th', 'Activo'), h('th.n', 'Rend.'), h('th.n', 'Vol. anual'), h('th.n', 'Max DD'), h('th.n', 'Sharpe'))));
        var tb = h('tbody'); ser.forEach(function (s) { var r = Riesgo.retornos(s.cs); tb.appendChild(h('tr', h('td', h('b', { style: 'color:' + s.color }, s.nombre)), h('td.n', { class: UI.clasePct(s.y[s.y.length - 1] - 100) }, F.pct(s.y[s.y.length - 1] - 100)), h('td.n', F.pct(Riesgo.desv(Riesgo.retornosLog(s.cs)) * Math.sqrt(365) * 100, 1)), h('td.n', F.pct(Riesgo.maxDrawdown(s.cs).max * 100, 1)), h('td.n', F.num(Riesgo.sharpe(r, 0, 365), 2)))); });
        t.appendChild(tb); area.appendChild(h('div.scroll-x', t));
        area.appendChild(h('p.peq.muted', 'Base 100 en el primer dia comun (' + F.fecha(xs[0], true) + '). Se comparan cierres diarios de los dias en que todos los activos tienen dato (' + n + ' dias comunes). Vol. anual con base 365.'));
      });
    }
    c.appendChild(h('div.tarjeta', h('div.fila-flex', h('h2', { style: 'margin:0;flex:1' }, 'Comparador normalizado'), rng), selectorActivos(sel, 6, pintar), area)); pintar();
    return { destruir: function () { vivo = false; } };
  }

  function correlaciones(c) {
    var fuente = 'cripto10', area = h('div'), vivo = true, selManual = [];
    var opciones = [{ id: 'cripto10', titulo: 'Top 10 cripto' }, { id: 'acc10', titulo: 'Top 12 acciones' }, { id: 'mixto', titulo: 'Mixto (BTC, ETH, S&P, Nasdaq, acciones clave)' }].concat(App.listas().map(function (l) { return { id: 'lista:' + l.id, titulo: 'Lista: ' + l.nombre }; })).concat([{ id: 'manual', titulo: 'Elegir manualmente' }]);
    var sel = UI.selector(opciones, fuente, { class: 'in', style: 'width:auto', 'aria-label': 'Conjunto', onchange: function () { fuente = this.value; pintar(); } }), man = h('div');
    function claves() {
      if (fuente === 'cripto10') return Mercado.activos.filter(function (a) { return a.tipo === 'cripto' && a.id !== 'tether' && a.id !== 'usd-coin'; }).slice(0, 10).map(function (a) { return a.key; });
      if (fuente === 'acc10') return Mercado.activos.filter(function (a) { return a.tipo === 'accion' && a.bolsa !== 'BME'; }).sort(function (x, y) { return (y.capitalizacion || 0) - (x.capitalizacion || 0); }).slice(0, 12).map(function (a) { return a.key; });
      if (fuente === 'mixto') return ['c:bitcoin', 'c:ethereum', 'i:^GSPC', 'i:^IXIC', 'a:AAPL', 'a:NVDA', 'a:TSLA', 'a:KO', 'f:EUR', 'f:JPY'].filter(function (k) { return Mercado.porKey[k]; });
      if (fuente === 'manual') return selManual.slice();
      var l = App.listas().filter(function (x) { return 'lista:' + x.id === fuente; })[0]; return l ? l.keys.filter(function (k) { return Mercado.porKey[k] && Mercado.porKey[k].tipo !== 'nft'; }) : [];
    }
    function pintar() {
      UI.vaciar(man); if (fuente === 'manual') man.appendChild(selectorActivos(selManual, 12, pintar));
      UI.vaciar(area); var ks = claves(); if (ks.length < 2) { area.appendChild(h('p.muted', 'Hacen falta al menos 2 activos con historial.')); return; } area.appendChild(h('div.cargando', h('span.gira'), 'Calculando…'));
      cargarVelas(ks).then(function (series) {
        series = series.filter(function (s) { return s.velas.length > 30 && !s.soloCierre || (s.velas.length > 30 && Mercado.porKey[s.id].tipo === 'divisa'); }); if (series.length < 2) throw new Error('Sin historial diario suficiente');
        return Calc.llamar('correlacion', { series: series });
      }).then(function (r) {
        if (!vivo) return; UI.vaciar(area); var t = h('table.corr'), hd = h('tr', h('th')); r.ids.forEach(function (id) { hd.appendChild(h('th', Mercado.porKey[id].simbolo)); }); t.appendChild(hd);
        r.m.forEach(function (fila, i) { var tr = h('tr', h('th', Mercado.porKey[r.ids[i]].simbolo)); fila.forEach(function (v, j) { var col = !isFinite(v) ? 'var(--panel-2)' : v >= 0 ? 'hsl(215,' + (30 + 45 * v) + '%,' + (24 + 18 * v) + '%)' : 'hsl(2,' + (30 + 45 * -v) + '%,' + (24 + 18 * -v) + '%)'; tr.appendChild(h('td', { style: 'background:' + col, title: Mercado.porKey[r.ids[i]].simbolo + ' / ' + Mercado.porKey[r.ids[j]].simbolo + ': ' + F.num(v, 3) }, isFinite(v) ? F.num(v, 2) : '-')); }); t.appendChild(tr); });
        area.appendChild(h('div.scroll-x', t)); area.appendChild(h('p.peq.muted', 'Correlacion de Pearson de rendimientos diarios en ' + r.n + ' dias comunes. Azul = se mueven juntos; rojo = en sentido contrario; cerca de 0 = independientes. Una cartera diversificada busca correlaciones bajas. La correlacion cambia con el tiempo y tiende a subir en crisis.'));
      }).catch(function (e) { UI.vaciar(area); area.appendChild(h('p.muted', e.message)); });
    }
    c.appendChild(h('div.tarjeta', h('div.fila-flex', h('h2', { style: 'margin:0;flex:1' }, 'Matriz de correlaciones'), sel), man, area)); pintar();
    return { destruir: function () { vivo = false; } };
  }

  function screener(c) {
    var vivo = true, reglas = [{ campo: 'rsi14', op: '<', valor: 30 }, { campo: 'precio', op: '>', ref: 'sma200' }], universo = 'cripto', cuerpoR = h('div'), res = h('div'), prog = h('span.muted.peq'), nombre = h('input.in', { placeholder: 'Nombre para guardar', style: 'max-width:200px' }), guardados = h('div.fila-flex');
    var PRESETS = [['RSI < 30 y precio > SMA 200', [{ campo: 'rsi14', op: '<', valor: 30 }, { campo: 'precio', op: '>', ref: 'sma200' }]], ['Tendencia alcista (precio > SMA50 > SMA200)', [{ campo: 'precio', op: '>', ref: 'sma50' }, { campo: 'sma50', op: '>', ref: 'sma200' }]], ['Sobreventa Bollinger', [{ campo: 'pctB', op: '<', valor: 0.05 }]], ['Momentum fuerte (ADX>25, +10% 30d)', [{ campo: 'adx14', op: '>', valor: 25 }, { campo: 'ret30', op: '>', valor: 10 }]], ['Cerca de maximos (dist. < 5%)', [{ campo: 'dd', op: '>', valor: -5 }]]];
    function pintarReglas() {
      UI.vaciar(cuerpoR);
      reglas.forEach(function (r, i) {
        var campos = Object.keys(Screener.CAMPOS).map(function (k) { return { id: k, titulo: Screener.CAMPOS[k] }; }), usaRef = !!r.ref;
        var cs = UI.selector(campos, r.campo, { class: 'in', 'aria-label': 'Campo', onchange: function () { r.campo = this.value; } }), op = UI.selector(Screener.OPS, r.op, { class: 'in', style: 'width:70px', 'aria-label': 'Operador', onchange: function () { r.op = this.value; } });
        var tipo = UI.selector([{ id: 'v', titulo: 'valor' }, { id: 'r', titulo: 'campo' }], usaRef ? 'r' : 'v', { class: 'in', style: 'width:84px', 'aria-label': 'Comparar con', onchange: function () { if (this.value === 'r') { r.ref = 'sma200'; delete r.valor; } else { delete r.ref; r.valor = 0; } pintarReglas(); } });
        var v = usaRef ? UI.selector(campos, r.ref, { class: 'in', 'aria-label': 'Campo de comparacion', onchange: function () { r.ref = this.value; } }) : h('input.in', { type: 'number', step: 'any', value: r.valor, 'aria-label': 'Valor', onchange: function () { r.valor = +this.value; } });
        cuerpoR.appendChild(h('div.fila-flex', { style: 'flex-wrap:nowrap;margin-bottom:6px' }, cs, op, tipo, v, h('button.btn.peq', { type: 'button', 'aria-label': 'Quitar regla', onclick: function () { reglas.splice(i, 1); pintarReglas(); } }, '✕')));
      });
    }
    function pintarGuardados() { UI.vaciar(guardados); var g = Almacen.get('screeners', []); g.forEach(function (s, i) { guardados.appendChild(h('span.chip', h('button.estrella', { type: 'button', style: 'color:var(--texto)', onclick: function () { reglas = JSON.parse(JSON.stringify(s.reglas)); universo = s.universo || universo; uni.value = universo; pintarReglas(); } }, s.nombre), h('button.estrella', { type: 'button', 'aria-label': 'Borrar ' + s.nombre, onclick: function () { g.splice(i, 1); Almacen.set('screeners', g); pintarGuardados(); } }, '✕'))); }); if (!g.length) guardados.appendChild(h('span.muted.peq', 'Sin screeners guardados')); }
    var uni = UI.selector([{ id: 'cripto', titulo: 'Cripto (top con historial)' }, { id: 'acciones', titulo: 'Acciones e indices' }, { id: 'todo', titulo: 'Todo' }], universo, { class: 'in', style: 'width:auto', 'aria-label': 'Universo', onchange: function () { universo = this.value; } });
    var pre = UI.selector([{ id: '', titulo: 'Plantillas…' }].concat(PRESETS.map(function (p, i) { return { id: i, titulo: p[0] }; })), '', { class: 'in', style: 'width:auto', 'aria-label': 'Plantillas', onchange: function () { if (this.value !== '') { reglas = JSON.parse(JSON.stringify(PRESETS[+this.value][1])); pintarReglas(); this.value = ''; } } });
    var cache = App.metricasCache = App.metricasCache || {};
    function ejecutar() {
      if (!reglas.length) return UI.toast('Anade al menos una regla'); UI.vaciar(res);
      var pool = Mercado.activos.filter(function (a) { return a.tipo !== 'nft' && a.tipo !== 'divisa' && (universo === 'todo' || (universo === 'cripto' ? a.tipo === 'cripto' : a.tipo === 'accion' || a.tipo === 'indice')); });
      if (universo !== 'acciones') pool = pool.filter(function (a) { return a.tipo !== 'cripto' || Mercado.sec.cripto.origen === 'demo' || a.rango <= 50 || true; });
      var necesitaHist = reglas.some(function (r) { var q = [r.campo, r.ref]; return q.some(function (k) { return k && ['precio', 'cambio24h', 'cambio7d', 'capitalizacion', 'volumen'].indexOf(k) < 0; }); });
      prog.textContent = 'Cargando historiales…';
      var pasoA = necesitaHist ? Mercado.historialLote(pool.filter(function (a) { return !cache[a.key]; }), 6, function (n, t) { prog.textContent = 'Historiales ' + n + '/' + t; }) : Promise.resolve({});
      pasoA.then(function (hs) {
        var items = []; pool.forEach(function (a) { if (!cache[a.key] && hs[a.key] && hs[a.key].velas.length > 20 && !hs[a.key].soloCierre) items.push({ key: a.key, velas: hs[a.key].velas }); });
        return items.length ? Calc.llamar('metricas', { items: items }) : [];
      }).then(function (ms) {
        ms.forEach(function (x) { cache[x.key] = x.m; });
        var filas = [], sinHist = 0;
        pool.forEach(function (a) {
          var m = Object.assign({}, cache[a.key] || {}, { precio: a.precio, cambio24h: a.cambio24h, cambio7d: a.cambio7d, capitalizacion: a.capitalizacion, volumen: a.volumen });
          if (!cache[a.key] && necesitaHist) { sinHist++; return; }
          if (Screener.evaluar(reglas, m)) filas.push({ a: a, m: m });
        });
        prog.textContent = ''; var campos = Array.from(new Set(reglas.map(function (r) { return r.campo; }).concat(reglas.filter(function (r) { return r.ref; }).map(function (r) { return r.ref; })))).filter(function (k) { return k !== 'precio'; });
        var cols = [{ id: 's', titulo: 'Activo', ancho: 200, valor: function (f) { return f.a.simbolo; }, html: function (f) { return '<span class="sim">' + esc(f.a.simbolo) + '</span><span class="nom">' + esc(f.a.nombre) + '</span>'; } }, { id: 'p', titulo: 'Precio', ancho: 100, alinear: 'der', num: true, valor: function (f) { return f.a.precio; }, html: function (f) { return F.precio(f.a.precio); } }, { id: 'c', titulo: '24h', ancho: 76, alinear: 'der', num: true, valor: function (f) { return f.a.cambio24h; }, html: function (f) { return '<span class="' + UI.clasePct(f.a.cambio24h) + '">' + F.pct(f.a.cambio24h) + '</span>'; } }]
          .concat(campos.map(function (k) { return { id: k, titulo: Screener.CAMPOS[k], ancho: 120, alinear: 'der', num: true, valor: function (f) { return f.m[k]; }, html: function (f) { return F.ok(f.m[k]) ? F.num(f.m[k], Math.abs(f.m[k]) > 1000 ? 0 : 2) : '-'; } }; }));
        res.appendChild(h('p', h('b', filas.length), ' coincidencias de ' + pool.length + ' activos' + (sinHist ? ' (' + sinHist + ' sin historial suficiente)' : '') + ' · ' + reglas.map(Screener.describir).join(' Y ')));
        var cb = h('div'); res.appendChild(cb); var t = new TablaVirtual(cb, { columnas: cols, alto: 38, alAbrir: function (f) { App.abrirActivo(f.a.key); }, vacio: 'Ningun activo cumple todas las reglas' }); App.tabla = t; t.setFilas(filas);
        res.appendChild(h('p.peq.muted', 'Las metricas se calculan con velas diarias. Un screener filtra, no recomienda: verifica cada candidato.'));
      }).catch(function (e) { prog.textContent = ''; res.appendChild(h('p.muted', 'Error: ' + e.message)); });
    }
    pintarReglas(); pintarGuardados();
    c.appendChild(h('div.tarjeta', h('h2', 'Screener con reglas propias'), h('div.fila-flex', { style: 'margin-bottom:8px' }, uni, pre), cuerpoR,
      h('div.fila-flex', h('button.btn', { type: 'button', onclick: function () { reglas.push({ campo: 'rsi14', op: '<', valor: 30 }); pintarReglas(); } }, '+ Regla'), h('button.btn.pri', { type: 'button', onclick: ejecutar }, 'Ejecutar'), prog, h('span.espacio'), nombre, h('button.btn', { type: 'button', onclick: function () { var n = nombre.value.trim(); if (!n) return UI.toast('Escribe un nombre'); var g = Almacen.get('screeners', []); g.push({ nombre: n, reglas: JSON.parse(JSON.stringify(reglas)), universo: universo }); Almacen.set('screeners', g); nombre.value = ''; pintarGuardados(); } }, 'Guardar')),
      h('div', { style: 'margin-top:8px' }, h('span.muted.peq', 'Guardados: '), guardados)));
    c.appendChild(h('div', { style: 'margin-top:10px' }, res)); return { destruir: function () { vivo = false; } };
  }

  function backtest(c, extra) {
    var vivo = true, key = extra || 'c:bitcoin', est = 'cruce', P = { cruce: { rapida: 20, lenta: 50 }, rsi: { periodo: 14, compra: 30, venta: 70 }, breakout: { entrada: 20, salida: 10 } }, area = h('div');
    var inp = h('input.in', { type: 'search', value: Mercado.porKey[key] ? Mercado.porKey[key].simbolo : '', list: 'dl-bt', 'aria-label': 'Activo', style: 'max-width:200px' }), dl = h('datalist#dl-bt'); Mercado.activos.filter(function (a) { return a.tipo === 'cripto' || a.tipo === 'accion' || a.tipo === 'indice'; }).forEach(function (a) { dl.appendChild(h('option', { value: a.simbolo, label: a.nombre })); });
    var capital = h('input.in', { type: 'number', value: 10000, min: 1 }), com = h('input.in', { type: 'number', value: 0.1, step: 0.01, min: 0 }), desl = h('input.in', { type: 'number', value: 0.05, step: 0.01, min: 0 }), params = h('div.form-g');
    var NOM = { cruce: { rapida: 'SMA rapida', lenta: 'SMA lenta' }, rsi: { periodo: 'Periodo RSI', compra: 'Comprar si RSI <', venta: 'Vender si RSI >' }, breakout: { entrada: 'Maximo de N velas (entrada)', salida: 'Minimo de N velas (salida)' } };
    function pintarParams() { UI.vaciar(params); Object.keys(P[est]).forEach(function (k) { params.appendChild(UI.campo(NOM[est][k], h('input', { type: 'number', value: P[est][k], min: 1, onchange: function () { P[est][k] = +this.value; } }))); }); }
    var se = UI.selector([{ id: 'cruce', titulo: 'Cruce de medias' }, { id: 'rsi', titulo: 'RSI (sobreventa/sobrecompra)' }, { id: 'breakout', titulo: 'Breakout (canal de Donchian)' }], est, { class: 'in', 'aria-label': 'Estrategia', onchange: function () { est = this.value; pintarParams(); } });
    function correr() {
      var a = Mercado.buscar(inp.value, 1)[0]; if (!a) return UI.toast('Activo no encontrado'); UI.vaciar(area); area.appendChild(h('div.cargando', h('span.gira'), 'Ejecutando en segundo plano…'));
      Mercado.historial(a).then(function (hr) {
        if (hr.velas.length < 60) throw new Error('Historial insuficiente (' + hr.velas.length + ' velas)'); if (est === 'cruce' && P.cruce.rapida >= P.cruce.lenta) throw new Error('La SMA rapida debe ser menor que la lenta');
        return Calc.llamar('backtest', { velas: hr.velas, estrategia: { tipo: est, params: P[est] }, opciones: { capital: +capital.value, comisionPct: +com.value, deslizamientoPct: +desl.value } }).then(function (r) { return { r: r, hr: hr, a: a }; });
      }).then(function (o) {
        if (!vivo) return; UI.vaciar(area); var m = o.r.metricas, v = o.hr.velas, xs = v.map(function (b) { return b[0]; });
        var grid = h('div.rejilla.g4.m2'); function k(t, val, cl) { grid.appendChild(h('div.tarjeta', { style: 'padding:8px' }, h('div.muted.peq', t), h('div', { style: 'font-size:17px;font-weight:600', class: cl || '' }, val))); }
        k('Retorno total', F.pct(m.retornoTotal * 100), UI.clasePct(m.retornoTotal)); k('Buy & hold', F.pct(m.retornoBH * 100), UI.clasePct(m.retornoBH)); k('CAGR', F.pct(m.cagr * 100)); k('Max drawdown', F.pct(m.maxDD * 100), 'baja'); k('Sharpe', F.num(m.sharpe, 2)); k('% aciertos', F.ok(m.aciertos) ? F.num(m.aciertos * 100, 0) + '%' : '-'); k('Operaciones', m.operaciones); k('Capital final', F.num(m.capitalFinal, 0));
        area.appendChild(grid); area.appendChild(lineasSVG([{ nombre: 'Estrategia', color: 'var(--c2)', x: xs, y: o.r.equity }, { nombre: 'Buy&hold', color: 'var(--c1)', x: xs, y: o.r.buyHold }], { base: +capital.value }));
        var t = h('table.t', h('thead', h('tr', h('th', 'Entrada'), h('th', 'Salida'), h('th.n', 'P. entrada'), h('th.n', 'P. salida'), h('th.n', 'Resultado')))); var tb = h('tbody');
        o.r.trades.slice(-30).reverse().forEach(function (q) { tb.appendChild(h('tr', h('td', F.fecha(q.entrada, true)), h('td', F.fecha(q.salida, true) + (q.abierta ? ' (abierta)' : '')), h('td.n', F.precio(q.pe)), h('td.n', F.precio(q.ps)), h('td.n', { class: UI.clasePct(q.pnl) }, F.pct(q.pct * 100)))); }); t.appendChild(tb);
        area.appendChild(h('h3', { style: 'margin-top:10px' }, 'Ultimas operaciones')); area.appendChild(h('div.scroll-x', t));
        if (o.hr.origen === 'demo') area.appendChild(h('p.banner', 'Resultado sobre datos DEMO inventados: solo sirve para probar la herramienta.'));
        var adv = h('div.banner.rojo', { style: 'margin-top:10px' }, h('b', 'Advertencias sobre sesgos'), h('ul', Backtest.ADVERTENCIAS.map(function (x) { return h('li', x); }))); area.appendChild(adv);
      }).catch(function (e) { UI.vaciar(area); area.appendChild(h('p.muted', 'Error: ' + e.message)); });
    }
    pintarParams();
    c.appendChild(h('div.tarjeta', h('h2', 'Backtesting sencillo (solo largo)'), h('p.peq.muted', 'La senal se calcula con el cierre de una vela y se ejecuta en la apertura de la siguiente; se invierte todo el capital al entrar.'),
      h('div.form-g', UI.campo('Activo', inp), UI.campo('Estrategia', se), UI.campo('Capital inicial', capital), UI.campo('Comision % por operacion', com), UI.campo('Deslizamiento %', desl)), dl, params, h('div.fila-flex', { style: 'margin-top:10px' }, h('button.btn.pri', { type: 'button', onclick: correr }, 'Ejecutar backtest'))));
    c.appendChild(h('div', { style: 'margin-top:10px' }, area)); return { destruir: function () { vivo = false; } };
  }

  /* ---- calculadoras ---- */
  function calcCard(titulo, ayuda, campos, fn) {
    var vals = {}, out = h('div', { 'aria-live': 'polite' }), g = h('div.form-g');
    function recalcular() { campos.forEach(function (f) { vals[f.id] = f.tipo === 'check' ? f.el.checked : f.tipo === 'select' ? f.el.value : +f.el.value; }); UI.vaciar(out); try { out.appendChild(fn(vals)); } catch (e) { out.appendChild(h('p.muted', e.message)); } }
    campos.forEach(function (f) { f.el = f.tipo === 'select' ? UI.selector(f.opciones, f.val, { class: 'in' }) : f.tipo === 'check' ? h('input', { type: 'checkbox', checked: !!f.val }) : h('input', { type: 'number', value: f.val, step: f.paso || 'any', min: f.min }); f.el.addEventListener('input', recalcular); f.el.addEventListener('change', recalcular); g.appendChild(UI.campo(f.etq, f.el)); });
    var card = h('div.tarjeta', h('h2', titulo), ayuda ? h('p.peq.muted', ayuda) : null, g, out); recalcular(); return card;
  }
  function kv(pares) { var d = h('dl.kv', { style: 'margin-top:10px' }); pares.forEach(function (p) { d.appendChild(h('dt', p[0])); d.appendChild(h('dd', { class: p[2] || '' }, p[1])); }); return d; }
  function calculadoras(c) {
    var imp = Object.assign({ cp: 30, lp: 15, umbral: 365 }, App.ajustes().impuestos || {}), mons = ['USD'].concat(Object.keys(Mercado.tasas()).sort());
    var g = h('div.rejilla.g2');
    g.appendChild(calcCard('Tamano de posicion por riesgo', 'Cuantas unidades comprar para arriesgar solo un % de tu capital si el precio toca el stop.', [{ id: 'capital', etq: 'Capital', val: 10000 }, { id: 'riesgoPct', etq: '% de riesgo', val: 1, paso: 0.1 }, { id: 'entrada', etq: 'Precio de entrada', val: 100 }, { id: 'stop', etq: 'Stop-loss', val: 95 }], function (v) { var r = Calculadoras.tamanoPosicion(v); if (r.error) return h('p.muted', r.error); return h('div', kv([['Unidades', F.num(r.unidades, 4)], ['Valor de la posicion', F.num(r.valor, 2)], ['Riesgo maximo', F.num(r.riesgoMax, 2), 'baja'], ['% del capital invertido', F.num(r.pctCapital, 1) + '%'], ['Direccion', r.lado]]), r.aviso ? h('p.banner', r.aviso) : null); }));
    g.appendChild(calcCard('Riesgo / beneficio', 'Compara lo que arriesgas con lo que esperas ganar.', [{ id: 'entrada', etq: 'Entrada', val: 100 }, { id: 'stop', etq: 'Stop', val: 95 }, { id: 'objetivo', etq: 'Objetivo', val: 115 }], function (v) { var r = Calculadoras.riesgoBeneficio(v); if (r.error) return h('p.muted', r.error); return h('div', kv([['Riesgo', F.num(r.riesgo, 2) + ' (' + F.num(r.riesgoPct, 1) + '%)', 'baja'], ['Beneficio potencial', F.num(r.beneficio, 2) + ' (' + F.num(r.beneficioPct, 1) + '%)', 'sube'], ['Ratio beneficio:riesgo', '1 : ' + F.num(r.ratio, 2)], ['% de aciertos para empatar', F.num(r.aciertoMinimo * 100, 1) + '%']]), r.coherente ? null : h('p.banner', 'El objetivo esta del lado contrario al stop: revisa los niveles.')); }));
    g.appendChild(calcCard('Interes compuesto', 'Crecimiento con aportes periodicos. Aportes al final de cada periodo.', [{ id: 'capital', etq: 'Capital inicial', val: 1000 }, { id: 'aporte', etq: 'Aporte periodico', val: 100 }, { id: 'frecAportes', etq: 'Aportes por ano', val: 12, min: 1 }, { id: 'tasaAnual', etq: 'Tasa anual %', val: 8, paso: 0.1 }, { id: 'capitalizaciones', etq: 'Capitalizaciones por ano', val: 12, min: 1 }, { id: 'anos', etq: 'Anos', val: 10, min: 1 }], function (v) { var r = Calculadoras.interesCompuesto(v); var sr = r.filas.map(function (f) { return f.saldo; }); var d = h('div', kv([['Saldo final', F.num(r.final, 2), 'sube'], ['Total aportado', F.num(r.aportado, 2)], ['Intereses ganados', F.num(r.intereses, 2), 'sube']])); var s = h('div'); s.innerHTML = UI.spark(sr, 300, 50, 'sube'); d.appendChild(s); return d; }));
    g.appendChild(calcCard('DCA (promedio de costo)', 'Simula aportes mensuales fijos en un activo usando su historial diario (un aporte cada ~30 velas).', [{ id: 'aporte', etq: 'Aporte mensual', val: 100 }, { id: 'meses', etq: 'Meses', val: 12, min: 1 }, { id: 'act', etq: 'Activo', tipo: 'select', val: 'c:bitcoin', opciones: Mercado.activos.filter(function (a) { return a.tipo === 'cripto' || a.tipo === 'accion'; }).slice(0, 120).map(function (a) { return { id: a.key, titulo: a.simbolo }; }) }], function (v) {
      var out = h('div', h('p.muted', 'Cargando historial…')), a = Mercado.porKey[v.act]; Mercado.historial(a).then(function (hr) { var cs = hr.velas.map(function (b) { return b[4]; }), pr = [], n = Math.min(v.meses, Math.floor(cs.length / 30)); for (var i = n - 1; i >= 0; i--) pr.push(cs[cs.length - 1 - i * 30]); if (!pr.length) throw new Error('Historial insuficiente'); var r = Calculadoras.dca({ aporte: v.aporte, precios: pr, precioActual: cs[cs.length - 1] }); UI.vaciar(out); out.appendChild(kv([['Invertido', F.num(r.invertido, 2)], ['Unidades', F.num(r.unidades, 6)], ['Costo promedio', F.precio(r.costoProm)], ['Valor actual', F.num(r.valor, 2)], ['Resultado', F.num(r.pnl, 2) + ' (' + F.pct(r.pnlPct * 100) + ')', UI.clasePct(r.pnl)]])); out.appendChild(h('p.peq.muted', 'Con ' + n + ' aportes en el pasado reciente' + (hr.origen === 'demo' ? ' (datos DEMO)' : '') + '. No predice el futuro.')); }).catch(function (e) { UI.vaciar(out); out.appendChild(h('p.muted', e.message)); }); return out; }));
    g.appendChild(calcCard('Conversion de divisas', 'Usa las tasas del contrato de datos (base USD).', [{ id: 'monto', etq: 'Monto', val: 100 }, { id: 'de', etq: 'De', tipo: 'select', val: 'USD', opciones: mons }, { id: 'a', etq: 'A', tipo: 'select', val: mons.indexOf('EUR') >= 0 ? 'EUR' : mons[1], opciones: mons }], function (v) { var r = Calculadoras.convertir(v.monto, v.de, v.a, Mercado.tasas()); return h('div', { style: 'font-size:20px;font-weight:700' }, isFinite(r) ? F.num(v.monto, 2) + ' ' + v.de + ' = ' + F.num(r, Math.abs(r) >= 1 ? 2 : 6) + ' ' + v.a : 'Sin tasa'); }));
    g.appendChild(calcCard('Impuestos simples (configurable)', 'Modelo basico: tasa para ganancias de corto plazo y otra para largo plazo. No sustituye a un asesor fiscal: las reglas reales varian por pais.', [{ id: 'cp', etq: 'Ganancia corto plazo', val: 1000 }, { id: 'lp', etq: 'Ganancia largo plazo', val: 2000 }, { id: 'tasaCorto', etq: 'Tasa corto %', val: imp.cp }, { id: 'tasaLargo', etq: 'Tasa largo %', val: imp.lp }, { id: 'comp', etq: 'Compensar perdidas entre tipos', tipo: 'check', val: true }], function (v) {
      App.setAjuste('impuestos', { cp: v.tasaCorto, lp: v.tasaLargo }); var r = Calculadoras.impuestos({ operaciones: [{ ganancia: v.cp, dias: 1 }, { ganancia: v.lp, dias: 9999 }], tasaCorto: v.tasaCorto, tasaLargo: v.tasaLargo, compensarCruzado: v.comp }); return kv([['Ganancia total', F.num(r.base, 2)], ['Impuesto estimado', F.num(r.impuesto, 2), 'baja'], ['Neto despues de impuestos', F.num(r.neto, 2), 'sube'], ['Tasa efectiva', F.num(r.tasaEfectiva * 100, 1) + '%']]); }));
    c.appendChild(g);
  }

  App.lineasSVG = lineasSVG;
  App.registrar('analisis', function (cont, r) {
    var sub = SUBS.some(function (s) { return s.id === r.sub; }) ? r.sub : 'comparador', raiz = h('div'); cont.appendChild(raiz);
    raiz.appendChild(h('h1', 'Analisis')); raiz.appendChild(UI.pestanas(SUBS, sub, function (id) { App.ir('analisis', id); }, 'Analisis'));
    var res = { comparador: comparador, correlaciones: correlaciones, screener: screener, backtest: backtest, calculadoras: calculadoras }[sub](raiz, r.extra); raiz.appendChild(h('p.legal-pie', window.Guia.AVISO)); return res;
  });
})();
