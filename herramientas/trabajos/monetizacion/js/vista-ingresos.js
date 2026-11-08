/* Fuentes de ingreso con escenarios (pesimista/base/optimista) y calculadoras (CPM/RPM, conversion, LTV, CAC, equilibrio, embudo). window.MonIngresos */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, D = g.MonDatos, K = g.MonCatalogo, G = g.MonGraf, h = U.h, I = g.MonIngresos = {};
  var ESC = ['Pesimista', 'Base', 'Optimista'], resumen, cajas = {}, tmr = {};

  function estado(f) { return D.obtener('escenarios', f.id) || { id: f.id, activa: false, valores: {} }; }
  function valores(f, e, k) { var v = {}; f.params.forEach(function (p) { var x = e.valores && e.valores[p.id]; v[p.id] = C.n(x ? x[k] : p.v[k]); }); return v; }
  function calc(f, e) { return [0, 1, 2].map(function (k) { var r = f.calc(valores(f, e, k)); return { ing: r.ing, costo: r.costo, neto: r.ing - r.costo }; }); }
  function realMedio(f) {
    var hoy = C.hoy(), desde = C.mesMas(C.mes(hoy), -2), tot = 0;
    D.movsBase().forEach(function (m) { if (m.tipo === 'ingreso' && m.fuente === f.nombre && C.mes(m.fecha) >= desde && C.mes(m.fecha) <= C.mes(hoy)) tot += m.monto; });
    return tot / 3;
  }
  I.totales = function () {   // neto mensual de las fuentes activas en los 3 escenarios
    var t = [{ ing: 0, costo: 0, neto: 0 }, { ing: 0, costo: 0, neto: 0 }, { ing: 0, costo: 0, neto: 0 }];
    K.FUENTES.forEach(function (f) { var e = estado(f); if (!e.activa) return; calc(f, e).forEach(function (r, k) { t[k].ing += r.ing; t[k].costo += r.costo; t[k].neto += r.neto; }); });
    return t;
  };
  function pintarResumen() {
    var t = I.totales(), activas = K.FUENTES.filter(function (f) { return estado(f).activa; }).length; resumen.textContent = '';
    if (!activas) { resumen.appendChild(h('p', { cls: 'tr-vacio', txt: 'Activa una o más fuentes abajo para ver el total mensual y anual en tres escenarios.' })); return; }
    resumen.appendChild(h('div', { cls: 'mon-kpis' }, t.map(function (r, k) { return U.kpi(ESC[k], U.dinero(r.neto) + '/mes', U.dinero(r.neto * 12) + ' al año', k === 0 ? 'av' : k === 2 ? 'bien' : ''); })));
    resumen.appendChild(G.barras({ titulo: 'Ingresos y costos mensuales por escenario', labels: ESC, series: [{ nombre: 'Ingresos', color: 'var(--c-ing)', datos: t.map(function (r) { return r.ing; }) }, { nombre: 'Costos', color: 'var(--c-gas)', datos: t.map(function (r) { return r.costo; }) }] }));
    resumen.appendChild(h('div', { cls: 'tr-acciones' }, [U.btn('Usar el escenario base como ingreso del plan', async function () { D.cfg.plan.ingresoBase = Math.round(t[1].ing * 100) / 100; await D.guardarCfg(); T.aviso('Ingreso base del plan: ' + U.dinero(t[1].ing) + ' al mes.'); })]));
  }
  function tarjeta(f) {
    var e = estado(f), res = h('div'), cuerpo = h('div'), chk = h('input', { type: 'checkbox', id: 'fa-' + f.id });
    chk.checked = !!e.activa;
    function guardar() { clearTimeout(tmr[f.id]); tmr[f.id] = setTimeout(function () { D.guardar('escenarios', e); }, 350); }
    function pintaRes() {
      var r = calc(f, e), real = realMedio(f); res.textContent = '';
      res.appendChild(U.tabla([{ t: '', k: 'e' }, { t: 'Pesimista', k: 'a', der: 1 }, { t: 'Base', k: 'b', der: 1 }, { t: 'Optimista', k: 'c', der: 1 }],
        [['Ingreso/mes', 'ing'], ['Costo/mes', 'costo'], ['Neto/mes', 'neto'], ['Neto/año', 'anio']].map(function (x) { var fn = function (i) { return U.dinero(x[1] === 'anio' ? r[i].neto * 12 : r[i][x[1]]); }; return { e: x[0], a: fn(0), b: fn(1), c: fn(2) }; }), { etq: 'Resultados de ' + f.nombre }));
      res.appendChild(h('p', { cls: 'tr-ayuda', txt: real > 0 ? 'Real en tu libro (promedio 3 meses, fuente «' + f.nombre + '»): ' + U.dinero(real) + '/mes.' : 'Sin ingresos registrados en el libro con la fuente «' + f.nombre + '» en los últimos 3 meses.' }));
    }
    var tb = h('table', { cls: 'mon-esc' }, [h('thead', {}, [h('tr', {}, [h('th', { txt: 'Supuesto' })].concat(ESC.map(function (x) { return h('th', { scope: 'col', txt: x }); })))]),
      h('tbody', {}, f.params.map(function (p) {
        return h('tr', {}, [h('th', { scope: 'row', txt: p.nombre.replace(/\(.*\)/, '').trim() + (p.unidad === 'USD' ? ' (' + D.cfg.moneda + ')' : p.unidad === '%' ? ' (%)' : '') })].concat([0, 1, 2].map(function (k) {
          var cur = e.valores && e.valores[p.id] ? e.valores[p.id][k] : p.v[k], i = h('input', { type: 'number', inputmode: 'decimal', step: 'any', min: 0, value: cur, 'aria-label': p.nombre + ' ' + ESC[k] });
          i.addEventListener('input', function () { e.valores = e.valores || {}; e.valores[p.id] = e.valores[p.id] || p.v.slice(); e.valores[p.id][k] = C.n(i.value); guardar(); pintaRes(); pintarResumen(); }); return h('td', {}, [i]);
        })));
      }))]);
    chk.addEventListener('change', function () { e.activa = chk.checked; D.guardar('escenarios', e); pintarResumen(); });
    cuerpo.appendChild(h('div', { cls: 'mon-tabla-cont', tabindex: 0, role: 'region', 'aria-label': 'Supuestos de ' + f.nombre }, [tb]));
    cuerpo.appendChild(res); cuerpo.appendChild(U.nota(f.plantilla)); pintaRes();
    cajas[f.id] = pintaRes;
    return h('details', { cls: 'mon-det' }, [h('summary', {}, [h('span', { txt: f.icono + ' ' + f.nombre })]), h('p', { cls: 'tr-ayuda', txt: f.desc }), h('label', { cls: 'tr-chk', for: 'fa-' + f.id }, [chk, 'Incluir en el total']), cuerpo]);
  }
  function calculadoras() {
    var m = function (v) { return U.dinero(v); };
    return [
      U.calculadora({ id: 'c-rpm', titulo: 'RPM e ingreso por anuncios', ayuda: 'RPM = ingresos ÷ vistas × 1000. Con tu RPM estima el ingreso de otro volumen.', campos: [{ id: 'ing', etq: 'Ingresos del período', def: 120 }, { id: 'vistas', etq: 'Vistas del período', def: 40000 }, { id: 'nuevas', etq: 'Vistas a estimar', def: 100000 }],
        calc: function (v) { var r = C.rpm(v.ing, v.vistas); return [['RPM', m(r)], ['Ingreso estimado', m(C.ingresoAds(v.nuevas, r))]]; } }),
      U.calculadora({ id: 'c-cpm', titulo: 'De CPM de anunciantes a RPM del creador', ayuda: 'Solo una parte de las vistas muestra anuncios y la plataforma se queda con una parte del ingreso.', campos: [{ id: 'cpm', etq: 'CPM del anunciante', def: 8 }, { id: 'apv', etq: 'Anuncios por vista', def: 1.5, paso: 0.1 }, { id: 'lleno', etq: 'Anuncios servidos (%)', def: 60 }, { id: 'rep', etq: 'Parte del creador (%)', def: 55 }],
        calc: function (v) { var r = C.rpmDeCpm(v.cpm, v.apv, v.lleno / 100, v.rep / 100); return [['RPM estimado', m(r)], ['Por 100 000 vistas', m(C.ingresoAds(100000, r))]]; } }),
      U.calculadora({ id: 'c-conv', titulo: 'Conversión', campos: [{ id: 'vis', etq: 'Visitas o clics', def: 2000 }, { id: 'ven', etq: 'Ventas', def: 50 }, { id: 'ticket', etq: 'Valor por venta', def: 30 }],
        calc: function (v) { return [['Conversión', U.pct(C.conversion(v.vis, v.ven) * 100, 2)], ['Ingreso por visita', m(v.vis > 0 ? v.ven * v.ticket / v.vis : 0)], ['Ingreso total', m(v.ven * v.ticket)]]; } }),
      U.calculadora({ id: 'c-ltv', titulo: 'LTV, CAC y recuperación', ayuda: 'LTV = ingreso mensual por cliente × margen ÷ baja mensual.', campos: [{ id: 'arpa', etq: 'Ingreso mensual por cliente', def: 20 }, { id: 'mar', etq: 'Margen (%)', def: 80 }, { id: 'churn', etq: 'Baja mensual (%)', def: 5, paso: 0.5 }, { id: 'gasto', etq: 'Gasto de captación', def: 500 }, { id: 'nuevos', etq: 'Clientes nuevos', def: 10 }],
        calc: function (v) { var ltv = C.ltv(v.arpa, v.mar / 100, v.churn / 100), cac = C.cac(v.gasto, v.nuevos), pb = C.payback(cac, v.arpa, v.mar / 100); return [['LTV', isFinite(ltv) ? m(ltv) : '∞ (sin bajas)'], ['CAC', isFinite(cac) ? m(cac) : '—'], ['LTV / CAC', isFinite(ltv / cac) ? U.num(ltv / cac, 1) + ' ×' : '—'], ['Recuperas el CAC en', isFinite(pb) ? U.num(pb, 1) + ' meses' : '—'], ['Vida media del cliente', v.churn > 0 ? U.num(100 / v.churn, 1) + ' meses' : '—']]; } }),
      U.calculadora({ id: 'c-eq', titulo: 'Punto de equilibrio', ayuda: 'Unidades que debes vender para cubrir los costos fijos.', campos: [{ id: 'fijos', etq: 'Costos fijos del período', def: 1000 }, { id: 'precio', etq: 'Precio por unidad', def: 50 }, { id: 'vari', etq: 'Costo variable por unidad', def: 20 }],
        calc: function (v) { var e = C.equilibrio({ fijos: v.fijos, precio: v.precio, variable: v.vari }); if (e.imposible) return [['Resultado', 'Sin equilibrio: el precio no supera el costo variable']]; return [['Margen por unidad', m(e.mc) + ' (' + U.pct(e.mcPct * 100, 0) + ')'], ['Unidades de equilibrio', U.num(e.unidades, 0)], ['Ingresos de equilibrio', m(e.ingresos)]]; } }),
      U.calculadora({ id: 'c-emb', titulo: 'Embudo de ventas', ayuda: 'Alcance → clic → interesado → venta.', campos: [{ id: 'alc', etq: 'Alcance (personas)', def: 50000 }, { id: 't1', etq: 'Alcance → clic (%)', def: 3, paso: 0.1 }, { id: 't2', etq: 'Clic → interesado (%)', def: 20 }, { id: 't3', etq: 'Interesado → venta (%)', def: 10 }, { id: 'val', etq: 'Valor por venta', def: 40 }, { id: 'cos', etq: 'Gasto total en el embudo', def: 300 }],
        calc: function (v) { var e = C.embudo(v.alc, [v.t1 / 100, v.t2 / 100, v.t3 / 100]), ing = e[3] * v.val; return [['Clics', U.num(e[1], 0)], ['Interesados', U.num(e[2], 0)], ['Ventas', U.num(e[3], 1)], ['Ingresos', m(ing)], ['Resultado tras gasto', m(ing - v.cos)], ['Costo por venta', e[3] > 0 ? m(v.cos / e[3]) : '—']]; } })
    ];
  }
  I.iniciar = function (raiz) {
    resumen = h('div');
    raiz.appendChild(U.panel('Fuentes de ingreso', [resumen, h('p', { cls: 'tr-ayuda', txt: 'Cada fuente trae supuestos editables en tres escenarios. Son estimaciones tuyas (no promesas): sustitúyelas por tus cifras reales.' })].concat(K.FUENTES.map(tarjeta)), { sub: 'Catálogo con plantillas de modelo mensual.' }));
    raiz.appendChild(U.panel('Calculadoras', calculadoras(), { sub: 'Se calculan al escribir. Nada se guarda.' }));
    pintarResumen();
    D.on(function (c) { if (c === 'config') { pintarResumen(); } });
  };
})(window);
