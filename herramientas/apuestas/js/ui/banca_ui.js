/* Gestion de banca: calculadoras (Kelly, combinadas y sistemas, cobertura, bonos, conversor, ROI, Monte Carlo). */
(function (g) {
  var A = g.Apuestas, U = A.ui, S = A.S, h = U.h, B = A.banca, C = A.cuotas;
  var V = A.vistas = A.vistas || {};
  var sub = 'kelly', mem = {};

  /* defs: [{k,label,v,ayuda,sel:[{v,t}]}]; fn(vals) -> nodos de resultado */
  function form(clave, defs, fn, extra) {
    var vals = mem[clave] || (mem[clave] = {}), out = h('div', { class: 'resultado', 'aria-live': 'polite' }), controles = {};
    defs.forEach(function (d) { if (!(d.k in vals)) vals[d.k] = d.v; });
    function calc() {
      var nums = {}; for (var k in vals) nums[k] = typeof vals[k] === 'string' && !controles[k].sel ? U.leerNum(vals[k]) : vals[k];
      var r; try { r = fn(nums, vals); } catch (e) { r = U.aviso('Revisa los datos: ' + e.message, 'aviso'); }
      U.montar(out, r);
    }
    var campos = defs.map(function (d) {
      var ctl;
      if (d.sel) { ctl = U.selector(d.sel, vals[d.k], function (v) { vals[d.k] = v; calc(); }); controles[d.k] = { sel: true }; }
      else { ctl = U.inputNum({ valor: vals[d.k], aria: d.label, onInput: function () { vals[d.k] = ctl.value; calc(); } }); controles[d.k] = {}; }
      return U.campo(d.label, ctl, d.ayuda);
    });
    var el = h('div', null, h('div', { class: 'form-g' }, campos), extra ? extra(vals, calc) : null, out);
    calc();
    return el;
  }
  function filaRes(pares) { return h('div', { class: 'kpis' }, pares.map(function (p) { return U.kpi(p[0], p[1], p[2], p[3]); })); }
  function bancaActual() { var r = A.registro.resumen(S.apuestas, S.cfg.bancaInicial); return r.banca; }
  var ok = function (x) { return isFinite(x); };

  function tKelly(c) {
    c.appendChild(form('kelly', [
      { k: 'banca', label: 'Banca', v: Math.round(bancaActual() * 100) / 100, ayuda: 'Por defecto: banca inicial + resultados del registro' },
      { k: 'prob', label: 'Tu probabilidad estimada (%)', v: 55 }, { k: 'cuota', label: 'Cuota decimal', v: 2 },
      { k: 'metodo', label: 'Método', v: 'kellyFrac', sel: [{ v: 'kelly', t: 'Kelly completo' }, { v: 'kellyFrac', t: 'Kelly fraccional' }, { v: 'porcentaje', t: 'Porcentaje fijo' }, { v: 'unidades', t: 'Unidades' }] },
      { k: 'valor', label: 'Fracción / % / unidades', v: S.cfg.fraccionKelly, ayuda: 'Fracción (0.25) · % de banca (2) · nº de unidades (1)' },
      { k: 'unidad', label: 'Valor de 1 unidad', v: S.cfg.unidad }
    ], function (n, v) {
      if (!(n.banca > 0) || !(n.cuota > 1) || !(n.prob > 0 && n.prob < 100)) return U.aviso('Introduce banca, cuota > 1 y probabilidad entre 0 y 100.', 'aviso');
      var p = n.prob / 100, edge = p * n.cuota - 1;
      var imp = B.importe({ metodo: v.metodo, banca: n.banca, prob: p, cuota: n.cuota, fraccion: n.valor, valor: n.valor, unidad: n.unidad });
      var rows = [['Kelly completo', 1], ['½ Kelly', 0.5], ['¼ Kelly', 0.25], ['⅒ Kelly', 0.1]].map(function (r) { var f = B.kelly(p, n.cuota, r[1]); return h('tr', null, h('th', { scope: 'row' }, r[0]), h('td', { class: 'num' }, U.p(f, 2)), h('td', { class: 'num' }, U.m(f * n.banca))); });
      return [filaRes([['Importe sugerido', U.m(imp), U.p(imp / n.banca, 2) + ' de la banca'], ['Edge (EV por unidad)', U.p(edge, 2, true), edge > 0 ? 'Con valor según tu estimación' : 'Sin valor: no apostar', U.clase(edge)], ['Cuota justa', U.cuota(1 / p), 'Prob. implícita de la cuota: ' + U.p(1 / n.cuota)], ['EV esperado', U.m(imp * edge, true), 'por esta apuesta', U.clase(edge)]]),
        U.tabla(['Kelly', { t: '% banca', clase: 'num' }, { t: 'Importe', clase: 'num' }], rows),
        edge <= 0 ? U.aviso('Kelly recomienda 0: con tu probabilidad la apuesta tiene valor esperado no positivo.', 'aviso') : null,
        U.aviso('Kelly maximiza el crecimiento a largo plazo si tu probabilidad es exacta. Si está sobreestimada, el riesgo de ruina se dispara: por eso se usa fraccional (¼–½). Verifica con el simulador.', 'info')];
    }));
  }

  var patas = [{ cuota: 1.8, prob: '', res: 'pendiente' }, { cuota: 2.1, prob: '', res: 'pendiente' }, { cuota: 1.6, prob: '', res: 'pendiente' }], combiCfg = { importe: 10, sistema: 'parlay', unit: 1 };
  function tCombi(c) {
    var sels = [{ v: 'parlay', t: 'Combinada (parlay)' }].concat(Object.keys(B.SISTEMAS).map(function (k) { return { v: k, t: k.charAt(0).toUpperCase() + k.slice(1) + ' (' + B.SISTEMAS[k].n + ' selecciones)' }; }));
    var out = h('div', { 'aria-live': 'polite' });
    function calc() {
      var sis = combiCfg.sistema, n = sis === 'parlay' ? patas.length : B.SISTEMAS[sis].n, usadas = patas.slice(0, n);
      if (usadas.length < n) { U.montar(out, U.aviso('Este sistema necesita ' + n + ' selecciones. Añade más filas.', 'aviso')); return; }
      var L = usadas.map(function (p) { var cu = U.leerNum(p.cuota), pr = U.leerNum(p.prob); return { cuota: cu, prob: pr > 0 && pr < 100 ? pr / 100 : null, res: p.res === 'pendiente' ? null : p.res }; });
      if (L.some(function (x) { return !(x.cuota > 1); })) { U.montar(out, U.aviso('Cada cuota debe ser mayor que 1.', 'aviso')); return; }
      var im = U.leerNum(combiCfg.importe); if (!(im > 0)) { U.montar(out, U.aviso('Indica un importe.', 'aviso')); return; }
      var todosRes = L.every(function (x) { return x.res; });
      if (sis === 'parlay') {
        var pl = B.parlay(L), r = todosRes ? B.parlayResultado(L.map(function (x) { return { cuota: x.cuota, res: x.res }; }), im) : null;
        U.montar(out, filaRes([['Cuota combinada', U.cuota(pl.cuota), U.n(pl.cuota, 3) + ' decimal'], ['Retorno si aciertas todo', U.m(im * pl.cuota), 'Ganancia ' + U.m(im * pl.cuota - im, true)], ['Prob. de acertar todo', pl.prob == null ? '—' : U.p(pl.prob, 2), pl.prob == null ? 'Indica tu prob. en todas las filas' : 'Cuota justa ' + U.cuota(1 / pl.prob)], ['EV', pl.prob == null ? '—' : U.m(im * (pl.prob * pl.cuota - 1), true), pl.prob == null ? '' : U.p(pl.prob * pl.cuota - 1, 1, true) + ' por unidad', pl.prob == null ? '' : U.clase(pl.prob * pl.cuota - 1)]]),
          r ? U.aviso('Con los resultados indicados: retorno ' + U.m(r.retorno) + ' (neto ' + U.m(r.neto, true) + ').', 'info') : null,
          U.aviso('Cada pata añade margen de la casa: una combinada multiplica el margen. Con 4 patas de 5% cada una, el margen efectivo ronda el 20%.', 'aviso'));
      } else {
        var s = B.sistema(L, B.SISTEMAS[sis].ks, im);
        U.montar(out, filaRes([['Apuestas', s.apuestas, 'de ' + im + ' c/u'], ['Total apostado', U.m(s.total)], ['Retorno si aciertas todo', U.m(s.retornoTodas), 'Ganancia ' + U.m(s.retornoTodas - s.total, true)], ['Retorno con tus resultados', s.retorno == null ? '—' : U.m(s.retorno), s.neto == null ? 'Marca el resultado de cada selección' : 'Neto ' + U.m(s.neto, true), s.neto == null ? '' : U.clase(s.neto)], ['EV (con tus probabilidades)', s.evEsperado == null ? '—' : U.m(s.evEsperado, true), s.evEsperado == null ? 'Indica prob. en todas' : '', s.evEsperado == null ? '' : U.clase(s.evEsperado)]]),
          U.aviso('En un sistema, el importe indicado es por cada apuesta de la combinación; el total es importe × nº de apuestas.', 'info'));
      }
    }
    function filas() {
      return patas.map(function (p, i) {
        return h('tr', null, h('th', { scope: 'row' }, '#' + (i + 1)),
          h('td', null, (function () { var x = U.inputNum({ valor: p.cuota, aria: 'Cuota ' + (i + 1), onInput: function () { p.cuota = x.value; calc(); } }); return x; })()),
          h('td', null, (function () { var x = U.inputNum({ valor: p.prob, aria: 'Probabilidad % ' + (i + 1), placeholder: '%', onInput: function () { p.prob = x.value; calc(); } }); return x; })()),
          h('td', null, U.selector([{ v: 'pendiente', t: '—' }, { v: 'ganada', t: 'Gana' }, { v: 'perdida', t: 'Pierde' }, { v: 'anulada', t: 'Anulada' }, { v: 'mediaganada', t: '½ gana' }, { v: 'mediaperdida', t: '½ pierde' }], p.res, function (v) { p.res = v; calc(); })),
          h('td', null, patas.length > 2 ? U.btn('✕', function () { patas.splice(i, 1); pintar(); }, 'pequeno', { 'aria-label': 'Quitar selección ' + (i + 1) }) : null));
      });
    }
    var cuerpoT = h('div');
    function pintar() {
      U.montar(cuerpoT, U.tabla(['', 'Cuota', 'Prob. %', 'Resultado', ''], filas()), U.btn('+ Añadir selección', function () { if (patas.length < 10) { patas.push({ cuota: 2, prob: '', res: 'pendiente' }); pintar(); } }));
      calc();
    }
    var imp = U.inputNum({ valor: combiCfg.importe, aria: 'Importe', onInput: function () { combiCfg.importe = imp.value; calc(); } });
    c.appendChild(h('div', null, h('div', { class: 'form-g' }, U.campo('Tipo', U.selector(sels, combiCfg.sistema, function (v) { combiCfg.sistema = v; calc(); })), U.campo('Importe (por apuesta)', imp)), cuerpoT, out));
    pintar();
  }

  function tCobertura(c) {
    c.appendChild(h('div', null,
      h('h3', null, 'Cobertura (hedge)'),
      form('hedge', [{ k: 'S', label: 'Importe apostado', v: 100 }, { k: 'O', label: 'Cuota original', v: 3 }, { k: 'H', label: 'Cuota actual del resultado contrario', v: 2.5 }, { k: 'modo', label: 'Objetivo', v: 'igual', sel: [{ v: 'igual', t: 'Mismo resultado en ambos casos' }, { v: 'recuperar', t: 'Recuperar el importe si falla' }] }], function (n, v) {
        if (!(n.S > 0 && n.O > 1 && n.H > 1)) return U.aviso('Introduce importe y cuotas mayores que 1.', 'aviso');
        var r = B.cobertura(n.S, n.O, n.H, v.modo);
        return [filaRes([['Apuesta de cobertura', U.m(r.cobertura)], ['Si gana la original', U.m(r.siGanaOriginal, true), '', U.clase(r.siGanaOriginal)], ['Si gana la cobertura', U.m(r.siGanaCobertura, true), '', U.clase(r.siGanaCobertura)], ['Garantizado', U.m(r.garantizado, true), '', U.clase(r.garantizado)]]),
          r.garantizado < 0 ? U.aviso('Con estas cuotas la cobertura fija una pérdida (la cuota contraria no compensa). Sólo cubre si te interesa reducir el riesgo.', 'aviso') : null];
      }),
      h('h3', null, 'Cash-out: ¿compensa?'),
      form('cash', [{ k: 'S', label: 'Importe apostado', v: 100 }, { k: 'O', label: 'Cuota original', v: 3 }, { k: 'cur', label: 'Cuota actual de tu selección', v: 2.2 }, { k: 'marg', label: 'Margen de la casa (%)', v: 5 }, { k: 'oferta', label: 'Cash-out que te ofrecen', v: 125 }], function (n) {
        if (!(n.S > 0 && n.O > 1 && n.cur > 1)) return U.aviso('Completa los datos.', 'aviso');
        var justo = B.cashoutJusto(n.S, n.O, n.cur, 0), conMarg = B.cashoutJusto(n.S, n.O, n.cur, (n.marg || 0) / 100), dif = n.oferta - justo;
        return [filaRes([['Cash-out justo (sin margen)', U.m(justo), 'retorno potencial ÷ cuota actual'], ['Cash-out típico (con margen)', U.m(conMarg)], ['Tu oferta', U.m(n.oferta), isFinite(dif) ? (dif >= 0 ? 'Por encima' : 'Por debajo') + ' del valor justo en ' + U.m(Math.abs(dif)) : ''], ['Beneficio asegurado', U.m(n.oferta - n.S, true), '', U.clase(n.oferta - n.S)]]),
          U.aviso('Estimación simple: si la oferta queda muy por debajo del valor justo, la casa se queda con ese margen. No es una promesa de lo que ofrecerá una casa concreta.', 'info')];
      })));
  }

  function tBonos(c) {
    c.appendChild(h('div', null, h('h3', null, 'Matched betting (back + lay)'),
      form('matched', [{ k: 'B', label: 'Apuesta a favor (importe)', v: 10 }, { k: 'a', label: 'Cuota a favor (casa)', v: 3 }, { k: 'l', label: 'Cuota en contra (exchange)', v: 3.2 }, { k: 'c', label: 'Comisión del exchange (%)', v: 5 }, { k: 'tipo', label: 'Tipo', v: 'calificar', sel: [{ v: 'calificar', t: 'Apuesta de calificación (dinero propio)' }, { v: 'gratuita', t: 'Apuesta gratuita (no devuelve el importe)' }, { v: 'gratuitaSR', t: 'Apuesta gratuita (devuelve el importe)' }] }], function (n, v) {
        if (!(n.B > 0 && n.a > 1 && n.l > 1)) return U.aviso('Introduce importes y cuotas válidos.', 'aviso');
        var r = B.matched(n.B, n.a, n.l, (n.c || 0) / 100, v.tipo);
        return [filaRes([['Apuesta en contra (lay)', U.m(r.lay)], ['Responsabilidad', U.m(r.responsabilidad), 'lo que arriesgas en el exchange'], ['Si gana la casa', U.m(r.siGanaBack, true), '', U.clase(r.siGanaBack)], ['Si gana el exchange', U.m(r.siGanaLay, true), '', U.clase(r.siGanaLay)], [v.tipo === 'calificar' ? 'Coste de calificar' : 'Beneficio garantizado', U.m(r.beneficio, true), v.tipo === 'calificar' ? '' : U.p(r.extraccion, 1) + ' del valor de la apuesta', U.clase(r.beneficio)]]),
          U.aviso('Los bonos tienen condiciones (cuota mínima, plazos, mercados excluidos). Lee siempre los términos y no te endeudes para «asegurar» ganancias.', 'aviso')];
      }),
      h('h3', null, 'Bono con requisito de apuesta (rollover)'),
      form('rollover', [{ k: 'dep', label: 'Depósito', v: 100 }, { k: 'bono', label: 'Bono', v: 100 }, { k: 'roll', label: 'Rollover (veces)', v: 5 }, { k: 'marg', label: 'Margen medio de tus apuestas (%)', v: 5 }, { k: 'sobre', label: 'El rollover se aplica sobre', v: 'ambos', sel: [{ v: 'ambos', t: 'Depósito + bono' }, { v: 'bono', t: 'Solo el bono' }] }], function (n, v) {
        var r = B.bonoRollover(n.dep || 0, n.bono || 0, n.roll || 0, (n.marg || 0) / 100, v.sobre);
        return [filaRes([['Volumen a apostar', U.m(r.volumen)], ['Pérdida esperada', U.m(-r.perdidaEsperada, true), 'volumen × margen', 'neg'], ['Valor neto esperado', U.m(r.valorNeto, true), r.valorNeto > 0 ? 'En promedio compensa' : 'En promedio no compensa', U.clase(r.valorNeto)]]), U.aviso('Es un promedio: la varianza es enorme y no incluye límites de cuota ni de retirada.', 'info')];
      })));
  }

  function tConv(c) {
    var nombres = { decimal: 'Decimal', fraccional: 'Fraccional', americano: 'Americano', hongkong: 'Hong Kong', malayo: 'Malayo', indonesio: 'Indonesio' }, est = mem.conv || (mem.conv = { fmt: 'decimal', val: '2.50' });
    var out = h('div', { 'aria-live': 'polite' }), inp = U.texto({ valor: est.val, onInput: function (v) { est.val = v; calc(); } });
    inp.setAttribute('inputmode', 'text');
    function calc() {
      var d = C.aDecimal(est.val, est.fmt);
      if (!isFinite(d)) { U.montar(out, U.aviso('Valor no válido para el formato ' + nombres[est.fmt] + (est.fmt === 'fraccional' ? ' (ejemplo: 5/2)' : est.fmt === 'americano' ? ' (ejemplo: +150 o -200)' : '') + '.', 'aviso')); return; }
      U.montar(out, U.tabla(['Formato', { t: 'Valor', clase: 'num' }], C.FORMATOS.map(function (f) { var v = C.texto(d, f); return h('tr', null, h('th', { scope: 'row' }, nombres[f]), h('td', { class: 'num' }, f === 'malayo' || f === 'indonesio' || f === 'hongkong' ? v : v)); })),
        filaRes([['Probabilidad implícita', U.p(1 / d, 2)], ['Ganancia por unidad', U.n(d - 1, 3)]]));
    }
    c.appendChild(h('div', null, h('div', { class: 'form-g' }, U.campo('Formato de entrada', U.selector(C.FORMATOS.map(function (f) { return { v: f, t: nombres[f] }; }), est.fmt, function (v) { est.fmt = v; calc(); })), U.campo('Cuota', inp)), out));
    calc();
  }

  function tRoi(c) {
    var r = A.registro.resumen(S.apuestas, S.cfg.bancaInicial);
    c.appendChild(h('div', null,
      form('roi', [{ k: 'inv', label: 'Total apostado (volumen)', v: Math.round(r.apostado * 100) / 100 }, { k: 'neto', label: 'Ganancia neta', v: Math.round(r.neto * 100) / 100 }, { k: 'banca', label: 'Banca inicial', v: S.cfg.bancaInicial }], function (n) {
        if (!(n.inv > 0)) return U.aviso('Introduce el total apostado.', 'aviso');
        var x = B.roiYield(n.inv, n.neto, n.banca);
        return [filaRes([['Yield', U.p(x.yield, 2, true), 'neto ÷ total apostado', U.clase(x.yield)], ['ROI sobre banca', n.banca > 0 ? U.p(x.roi, 2, true) : '—', 'neto ÷ banca inicial', U.clase(x.roi)]]),
          U.aviso('Yield mide la rentabilidad por unidad apostada; ROI sobre banca mide cuánto creció tu capital. Los valores iniciales se toman de tu registro (puedes editarlos).', 'info')];
      })));
  }

  var mcRes = null;
  function tMC(c) {
    var out = h('div', { 'aria-live': 'polite' }), vals = mem.mc || (mem.mc = { banca: Math.round(bancaActual()), prob: '53', cuota: '1.95', n: '200', sims: '2000', metodo: 'porcentaje', valor: '2', ruina: '10', semilla: '1234' });
    function numC(k, label, ayuda) { var i = U.inputNum({ valor: vals[k], aria: label, onInput: function () { vals[k] = i.value; } }); return U.campo(label, i, ayuda); }
    var metodo = U.selector([{ v: 'porcentaje', t: '% fijo de la banca' }, { v: 'kellyFrac', t: 'Kelly fraccional' }, { v: 'kelly', t: 'Kelly completo' }, { v: 'unidades', t: 'Unidades fijas (valor = nº de unidades de 1% banca inicial)' }], vals.metodo, function (v) { vals.metodo = v; });
    function correr() {
      var n = {}; ['banca', 'prob', 'cuota', 'n', 'sims', 'valor', 'ruina', 'semilla'].forEach(function (k) { n[k] = U.leerNum(vals[k]); });
      if (!(n.banca > 0 && n.prob > 0 && n.prob < 100 && n.cuota > 1 && n.n >= 1 && n.sims >= 10)) { U.montar(out, U.aviso('Revisa los datos: banca > 0, probabilidad entre 0 y 100, cuota > 1.', 'aviso')); return; }
      var p = n.prob / 100, edge = p * n.cuota - 1;
      var r = B.montecarlo({ banca: n.banca, prob: p, cuota: n.cuota, apuestas: Math.min(2000, Math.floor(n.n)), simulaciones: Math.min(20000, Math.floor(n.sims)), semilla: n.semilla, metodo: vals.metodo, valor: n.valor, fraccion: n.valor, unidad: n.banca * 0.01, umbralRuina: n.banca * (n.ruina || 0) / 100, curvas: 25 });
      mcRes = r;
      var fm = function (v) { return U.m(v).replace(/\.\d+$/, '').replace(/,\d+$/, ''); };
      U.montar(out, edge <= 0 ? U.aviso('Con tu probabilidad y esta cuota el valor esperado es negativo (' + U.p(edge, 1, true) + '): a largo plazo la banca tiende a bajar.', 'aviso') : null,
        filaRes([['Banca final mediana', U.m(r.mediana), 'media ' + U.m(r.media)], ['Riesgo de ruina', U.p(r.riesgoRuina, 1), 'banca < ' + U.n(n.ruina, 0) + '% de la inicial', r.riesgoRuina > 0.1 ? 'neg' : ''], ['Prob. de terminar en beneficio', U.p(r.probBeneficio, 1)], ['Drawdown máx. mediano', U.p(r.drawdownMediano, 1), 'p95 ' + U.p(r.drawdownP95, 1)], ['Racha perdedora (mediana)', U.n(r.rachaPerdedoraMediana, 0), 'p95 ' + U.n(r.rachaPerdedoraP95, 0)], ['Rango 5%–95%', U.m(r.p5) + ' – ' + U.m(r.p95)]]),
        h('h3', null, 'Trayectorias de ejemplo'), U.graf.lineas(r.curvas.map(function (cu, i) { return { pts: cu, clase: 'tenue' }; }), { alto: 220, fmtY: fm, base: n.banca, titulo: 'Trayectorias simuladas de la banca' }),
        h('h3', null, 'Distribución de la banca final'), U.graf.histograma(r.hist, r.histMin, r.histMax, { corte: n.banca, fmt: fm, titulo: 'Histograma de banca final' }),
        U.aviso('Simulación con ' + r.simulaciones + ' recorridos y semilla ' + n.semilla + ' (mismos datos y semilla = mismo resultado). Supone que tu probabilidad es correcta y que las apuestas son independientes; el mundo real es peor.', 'info'));
    }
    c.appendChild(h('div', null, h('div', { class: 'form-g' }, numC('banca', 'Banca inicial'), numC('prob', 'Probabilidad de acierto (%)'), numC('cuota', 'Cuota decimal'), numC('n', 'Nº de apuestas', 'máx. 2000'), numC('sims', 'Simulaciones', 'máx. 20000'), U.campo('Método de apuesta', metodo), numC('valor', 'Valor del método', 'Fracción de Kelly, % de banca o unidades'), numC('ruina', 'Ruina = banca por debajo de (%)'), numC('semilla', 'Semilla')), h('div', { class: 'fila' }, U.btn('Simular', correr, 'primario grande')), out));
    if (mcRes) correr();
  }

  V.banca = function (cont) {
    var cuerpo = h('div', { class: 'sub-cuerpo' });
    function ir(s) { sub = s; U.vaciar(cuerpo); ({ kelly: tKelly, combi: tCombi, cobertura: tCobertura, bonos: tBonos, conv: tConv, roi: tRoi, mc: tMC })[s](cuerpo); }
    var prefill = S.prefillKelly; if (prefill) { mem.kelly = mem.kelly || {}; mem.kelly.prob = String(prefill.prob); mem.kelly.cuota = String(prefill.cuota); S.prefillKelly = null; sub = 'kelly'; }
    U.montar(cont, U.seg([{ v: 'kelly', t: 'Importe / Kelly' }, { v: 'combi', t: 'Combinadas' }, { v: 'cobertura', t: 'Cobertura' }, { v: 'bonos', t: 'Bonos' }, { v: 'conv', t: 'Conversor' }, { v: 'roi', t: 'ROI / Yield' }, { v: 'mc', t: 'Simulador' }], sub, ir, 'Calculadoras de banca'), cuerpo);
    ir(sub);
  };
})(window);
