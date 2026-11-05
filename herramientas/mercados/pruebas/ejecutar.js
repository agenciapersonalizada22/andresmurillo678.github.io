/* Ejecutar: node herramientas/mercados/pruebas/ejecutar.js */
const assert = require('assert'), path = require('path'), J = f => require(path.join(__dirname, '..', 'js', f));
const I = J('indicadores.js'), R = J('riesgo.js'), P = J('patrones.js'), B = J('backtest.js'), C = J('cartera.js'), A = J('alertas.js'), K = J('calculadoras.js');
const S = J('screener.js'), SE = J('sentimiento.js'), T = J('treemap.js'), D = J('divisas.js'), F = J('fixtures.js');
const ref = require('./referencias.json');
let ok = 0, fallos = 0; const pend = [];
function t(nombre, fn) { try { const r = fn(); if (r && r.then) pend.push(r.then(() => { ok++; }, e => { fallos++; console.log('FALLO', nombre, '\n  ', e.message); })); else ok++; } catch (e) { fallos++; console.log('FALLO', nombre, '\n  ', e.message); } }
function cerca(a, b, tol, m) { tol = tol || 1e-9; if (b == null) { assert.ok(!isFinite(a), (m || '') + ' debia ser NaN, es ' + a); return; } assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), (m || '') + ' esperado ' + b + ' obtenido ' + a); }
function compara(nombre, got, exp, tol) { assert.strictEqual(got.length, exp.length, nombre + ' longitud'); exp.forEach((e, i) => cerca(got[i], e, tol, nombre + '[' + i + ']')); }
const { o, h, l, c, v } = ref.entrada, velas = c.map((_, i) => [i * 86400000, o[i], h[i], l[i], c[i], v[i]]);

// ---- Indicadores contra referencias independientes (Python/pandas) ----
t('SMA 1..10', () => { compara('sma3', I.sma([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3), [NaN, NaN, 2, 3, 4, 5, 6, 7, 8, 9].map(x => isNaN(x) ? null : x)); });
t('WMA mano', () => cerca(I.wma([1, 2, 3], 3)[2], 14 / 6));
t('EMA mano (semilla SMA)', () => { const e = I.ema([1, 2, 3, 4], 3); cerca(e[2], 2); cerca(e[3], 3); });
t('SMA5 vs pandas y python', () => { compara('sma5', I.sma(c, 5), ref.sma5); compara('pandas', I.sma(c, 5), ref.sma5_pandas); });
t('EMA10', () => compara('ema10', I.ema(c, 10), ref.ema10));
t('WMA6', () => compara('wma6', I.wma(c, 6), ref.wma6));
t('RSI14 Wilder', () => compara('rsi', I.rsi(c, 14), ref.rsi14));
t('RSI publicado StockCharts', () => { const r = I.rsi(ref.rsiStockCharts.cierres, 14); cerca(r[14], 70.53, 0.002); cerca(r[15], 66.32, 0.004); cerca(r[16], 66.55, 0.004); });
t('RSI monotono = 100 / plano = 50', () => { cerca(I.rsi([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 14)[15], 100); cerca(I.rsi(new Array(20).fill(5), 14)[19], 50); });
t('MACD 12/26/9', () => { const m = I.macd(c); compara('macd', m.macd, ref.macd); compara('senal', m.senal, ref.macdSenal); m.hist.forEach((x, i) => { if (ref.macdSenal[i] != null) cerca(x, ref.macd[i] - ref.macdSenal[i]); }); });
t('Bollinger 20,2 vs pandas', () => { const b = I.bollinger(c, 20, 2); compara('mid', b.mid, ref.bbMid); compara('sup', b.sup, ref.bbSup); compara('inf', b.inf, ref.bbInf); });
t('Bollinger constante', () => { const b = I.bollinger(new Array(25).fill(7), 20, 2); cerca(b.sup[24], 7); cerca(b.pctB[24], 0.5); });
t('ATR14', () => compara('atr', I.atr(h, l, c, 14), ref.atr14));
t('ADX14 / +DI / -DI', () => { const a = I.adx(h, l, c, 14); compara('pdi', a.pdi, ref.pdi14); compara('mdi', a.mdi, ref.mdi14); compara('adx', a.adx, ref.adx14); });
t('ADX tendencia pura alta', () => { const hh = [], ll = [], cc = []; for (let i = 0; i < 60; i++) { hh.push(10 + i + 1); ll.push(10 + i); cc.push(10 + i + .5); } const a = I.adx(hh, ll, cc, 14); assert.ok(a.adx[59] > 99 && a.pdi[59] > a.mdi[59]); });
t('Estocastico 14,3,3', () => { const s = I.estocastico(h, l, c, 14, 3, 3); compara('k', s.k, ref.stochK); compara('d', s.d, ref.stochD); });
t('OBV', () => compara('obv', I.obv(c, v), ref.obv));
t('Ichimoku (tenkan, kijun, spanB desplazada, chikou)', () => {
  const k = I.ichimoku(h, l, c, 9, 26, 52, 26); compara('tenkan', k.tenkan, ref.tenkan); compara('kijun', k.kijun, ref.kijun);
  assert.strictEqual(k.spanB.length, c.length + 26); ref.spanB.forEach((e, i) => cerca(k.spanB[i + 26], e, 1e-9, 'spanB' + i));
  cerca(k.spanA[60 + 26], (ref.tenkan[60] + ref.kijun[60]) / 2); cerca(k.chikou[10], c[36]);
});
t('Pivotes clasicos', () => { const p = I.pivotes(110, 100, 105); assert.deepStrictEqual([p.P, p.R1, p.S1, p.R2, p.S2, p.R3, p.S3], [105, 110, 100, 115, 95, 120, 90]); cerca(I.pivotes(h[69], l[69], c[69]).P, ref.pivotes.P); });
t('Fractales', () => { const f = I.fractales([1, 2, 5, 2, 1, 2, 3], [0, 1, 4, 1, 0, 1, 2], 2); assert.deepStrictEqual(f.altos, [2]); assert.deepStrictEqual(f.bajos, [4]); });
t('Soporte/resistencia agrupa por tolerancia', () => {
  const vs = []; for (let i = 0; i < 40; i++) { const p = 100 + 10 * Math.sin(i / 3); vs.push([i * 864e5, p, p + 1, p - 1, p, 1]); }
  const n = I.nivelesSR(vs); assert.ok(n.length >= 2 && n.some(x => x.tipo === 'soporte') && n.some(x => x.tipo === 'resistencia'));
});
t('VWAP intradia con reinicio diario', () => { const d = 86400000, vv = [[0, 0, 12, 8, 10, 100], [3600000, 0, 22, 18, 20, 300], [d, 0, 31, 29, 30, 10]]; const w = I.vwap(vv); cerca(w[0], 10); cerca(w[1], 17.5); cerca(w[2], 30); assert.ok(I.esIntradia([[0, 1, 1, 1, 1, 1], [3600000, 1, 1, 1, 1, 1], [7200000, 1, 1, 1, 1, 1]])); assert.ok(!I.esIntradia(velas)); });
t('Heikin-Ashi mano', () => { const x = I.heikinAshi([[0, 10, 12, 9, 11, 1], [1, 11, 13, 10, 12, 1]]); assert.deepStrictEqual(x[0].slice(1, 5), [10.5, 12, 9, 10.5]); assert.deepStrictEqual(x[1].slice(1, 5), [10.5, 13, 10, 11.5]); });
t('Agregado semanal/mensual', () => {
  const lu = Date.UTC(2024, 0, 1), vs = []; for (let i = 0; i < 10; i++) vs.push([lu + i * 864e5, 10 + i, 20 + i, 5 + i, 12 + i, 100]);
  const w = I.agregar(vs, 'W'); assert.strictEqual(w.length, 2); assert.deepStrictEqual(w[0].slice(1), [10, 26, 5, 18, 700]); assert.deepStrictEqual(w[1].slice(1), [17, 29, 12, 21, 300]);
  assert.strictEqual(I.agregar(vs, 'M').length, 1);
});

// ---- Riesgo ----
t('Retornos, drawdown y max drawdown', () => { const x = [100, 110, 99, 108.9]; compara('r', R.retornos(x), [0.1, -0.1, 0.1].map((q, i) => [110 / 100 - 1, 99 / 110 - 1, 108.9 / 99 - 1][i])); const m = R.maxDrawdown(x); cerca(m.max, -0.1); assert.strictEqual(m.desde, 1); assert.strictEqual(m.hasta, 2); cerca(R.drawdown(x)[3], 108.9 / 110 - 1); });
t('Sharpe, beta, correlacion, CAGR, volatilidad', () => {
  cerca(R.sharpe([0.01, 0.02, 0.03], 0, 1), 2); const rb = [0.01, -0.02, 0.03, 0.005]; cerca(R.beta(rb.map(x => 2 * x), rb), 2); cerca(R.correl(rb, rb.map(x => -3 * x + 1)), -1);
  cerca(R.cagr(100, 121, 730), 0.1, 1e-9); const cc = [100, 101, 99, 102, 100]; const lr = R.retornosLog(cc); const m = lr.reduce((a, b) => a + b) / 4; cerca(R.volHist(cc, 4, 365), Math.sqrt(lr.reduce((a, b) => a + (b - m) ** 2, 0) / 3) * Math.sqrt(365));
});
t('Alinear series y matriz de correlacion', () => {
  const a = [[0, 0, 0, 0, 1], [864e5, 0, 0, 0, 2], [2 * 864e5, 0, 0, 0, 3], [3 * 864e5, 0, 0, 0, 6], [4 * 864e5, 0, 0, 0, 7]], b = [[864e5, 0, 0, 0, 4], [2 * 864e5, 0, 0, 0, 6], [3 * 864e5, 0, 0, 0, 12], [4 * 864e5, 0, 0, 0, 14]];
  const al = R.alinear([{ id: 'a', velas: a }, { id: 'b', velas: b }]); assert.deepStrictEqual(al.cierres.a, [2, 3, 6, 7]); cerca(R.matrizCorrelacion([{ id: 'a', velas: a }, { id: 'b', velas: b }]).m[0][1], 1);
});

// ---- Patrones ----
const cae = []; for (let i = 0; i < 6; i++) cae.push([i, 100 - i * 1.8 + 0.5, 100 - i * 1.8 + 0.8, 100 - i * 1.8 - 0.6, 100 - i * 1.8, 1]);
const sube = []; for (let i = 0; i < 6; i++) sube.push([i, 90 + i * 1.8 - .5, 90 + i * 1.8 + .6, 90 + i * 1.8 - .8, 90 + i * 1.8, 1]);
const ids = (vs, i) => P.en(vs, i);
t('Martillo tras caida / hombre colgado tras subida', () => { assert.ok(ids(cae.concat([[6, 90, 90.5, 85, 90.4, 1]]), 6).includes('martillo')); assert.ok(ids(sube.concat([[6, 100.8, 101.3, 96, 101.2, 1]]), 6).includes('colgado')); });
t('Doji', () => assert.ok(ids([[0, 100, 101, 99, 100.05, 1]], 0).includes('doji')));
t('Envolventes', () => {
  assert.ok(ids([[0, 102, 102.2, 100.8, 101, 1], [1, 100.8, 103, 100.7, 102.5, 1]], 1).includes('envAl'));
  assert.ok(ids([[0, 101, 102.2, 100.8, 102, 1], [1, 102.2, 102.3, 99.8, 100, 1]], 1).includes('envBa'));
});
t('Estrellas de la manana y de la tarde', () => {
  assert.ok(ids([[0, 110, 110.2, 104.8, 105, 1], [1, 104, 104.5, 103.5, 104.2, 1], [2, 104.3, 109, 104.2, 108.5, 1]], 2).includes('estrellaManana'));
  assert.ok(ids([[0, 105, 110.2, 104.8, 110, 1], [1, 111, 111.5, 110.5, 111.2, 1], [2, 111, 111.2, 105.5, 106, 1]], 2).includes('estrellaTarde'));
});
t('Tres soldados blancos / tres cuervos negros', () => {
  assert.ok(ids([[0, 100, 103.2, 99.9, 103, 1], [1, 102, 105.2, 101.9, 105, 1], [2, 104, 107.2, 103.9, 107, 1]], 2).includes('soldados'));
  assert.ok(ids([[0, 107, 107.1, 103.8, 104, 1], [1, 105, 105.1, 101.8, 102, 1], [2, 103, 103.1, 99.8, 100, 1]], 2).includes('cuervos'));
});
t('Sin falsos positivos en velas normales y detectar() devuelve explicacion', () => {
  assert.deepStrictEqual(ids([[0, 100, 102, 98, 101, 1], [1, 101, 103, 99, 102, 1]], 1), []);
  const d = P.detectar(cae.concat([[6, 90, 90.5, 85, 90.4, 1]])); assert.ok(d.some(x => x.id === 'martillo' && x.desc.length > 30));
});

// ---- Backtest ----
const bv = [[0, 100, 100, 100, 100, 1], [864e5, 100, 103, 99, 102, 1], [2 * 864e5, 104, 106, 103, 105, 1], [3 * 864e5, 110, 111, 107, 108, 1], [4 * 864e5, 108, 110, 107, 109, 1]];
t('Backtest manual: compra apertura i+1, venta apertura i+3 (+10%)', () => {
  const r = B.ejecutar(bv, { tipo: 'manual', senales: [1, 1, 0, 0, 0] }, { capital: 10000 });
  assert.strictEqual(r.trades.length, 1); cerca(r.trades[0].pnl, 1000); cerca(r.trades[0].pct, 0.1); compara('eq', r.equity, [10000, 10200, 10500, 11000, 11000]);
  cerca(r.metricas.retornoTotal, 0.1); cerca(r.metricas.aciertos, 1); cerca(r.metricas.maxDD, 0); cerca(r.metricas.retornoBH, 0.09);
});
t('Backtest con comision 1%', () => {
  const r = B.ejecutar(bv, { tipo: 'manual', senales: [1, 1, 0, 0, 0] }, { capital: 10000, comisionPct: 1 });
  const cant = 10000 / 1.01 / 100, ing = cant * 110 * 0.99; cerca(r.trades[0].pnl, ing - 10000); cerca(r.equity[3], ing);
});
t('Backtest sin mirar al futuro: senal solo en la ultima vela no compra', () => { const r = B.ejecutar(bv, { tipo: 'manual', senales: [0, 0, 0, 0, 1] }); assert.strictEqual(r.trades.length, 0); cerca(r.metricas.retornoTotal, 0); });
t('Backtest cruce de medias en rampa alcista', () => {
  const vs = []; for (let i = 0; i < 80; i++) vs.push([i * 864e5, i + 0.5, i + 1.5, i, i + 1, 1]);
  const r = B.ejecutar(vs, { tipo: 'cruce', params: { rapida: 5, lenta: 10 } }, { capital: 1000 });
  assert.strictEqual(r.trades.length, 1); assert.ok(r.trades[0].abierta); cerca(r.trades[0].pe, 10.5); cerca(r.metricas.retornoTotal, 80 / 10.5 - 1, 1e-9);
});
t('Backtest RSI y breakout se ejecutan y miden', () => {
  const r1 = B.ejecutar(velas, { tipo: 'rsi', params: { periodo: 14, compra: 40, venta: 60 } }), r2 = B.ejecutar(velas, { tipo: 'breakout', params: { entrada: 10, salida: 5 } });
  [r1, r2].forEach(r => { assert.strictEqual(r.equity.length, velas.length); assert.ok(isFinite(r.metricas.retornoTotal)); assert.ok(r.metricas.maxDD <= 0); });
  assert.ok(B.ADVERTENCIAS.length >= 5);
});

// ---- Cartera real ----
t('Cartera real: costo promedio con venta parcial', () => {
  const tr = [{ tipo: 'compra', simbolo: 'X', cant: 10, precio: 100, comision: 1, fecha: 1 }, { tipo: 'compra', simbolo: 'X', cant: 10, precio: 120, comision: 1, fecha: 2 }, { tipo: 'venta', simbolo: 'X', cant: 5, precio: 130, comision: 1, fecha: 3 }, { tipo: 'dividendo', simbolo: 'X', monto: 20, fecha: 4 }];
  const r = C.posiciones(tr), p = r.porSimbolo.X; cerca(p.costoProm, 110.1); cerca(p.cant, 15); cerca(p.costoTotal, 1651.5); cerca(p.realizado, 649 - 550.5); cerca(p.dividendos, 20);
  const val = C.valorar(r, { X: 140 }); cerca(val.valor, 2100); cerca(val.pnlNoRealizado, 448.5); cerca(val.total, 448.5 + 98.5 + 20); cerca(val.filas[0].peso, 1);
  assert.throws(() => C.posiciones(tr.concat([{ tipo: 'venta', simbolo: 'X', cant: 99, precio: 1, fecha: 9 }])));
});
t('Cartera real: cierre total y recompra reinician costo', () => {
  const r = C.posiciones([{ tipo: 'compra', simbolo: 'Y', cant: 2, precio: 10, fecha: 1 }, { tipo: 'venta', simbolo: 'Y', cant: 2, precio: 15, fecha: 2 }, { tipo: 'compra', simbolo: 'Y', cant: 1, precio: 30, fecha: 3 }]);
  cerca(r.porSimbolo.Y.costoProm, 30); cerca(r.porSimbolo.Y.realizado, 10);
});
// ---- Papel trading ----
t('Papel trading: mercado, limite, stop, rechazos y P&L', () => {
  const c = C.nuevaSim(10000, 0), pr = { A: 100 };
  C.enviar(c, { key: 'A', simbolo: 'A', lado: 'compra', tipo: 'mercado', cant: 10 }, pr, 1); cerca(c.saldo, 9000);
  const lim = C.enviar(c, { key: 'A', simbolo: 'A', lado: 'compra', tipo: 'limite', cant: 5, precio: 90 }, pr, 2); assert.strictEqual(lim.estado, 'pendiente');
  const st = C.enviar(c, { key: 'A', simbolo: 'A', lado: 'venta', tipo: 'stop', cant: 15, precio: 85 }, pr, 3); assert.strictEqual(st.estado, 'pendiente');
  C.procesar(c, { A: 95 }, 4); assert.strictEqual(lim.estado, 'pendiente');
  C.procesar(c, { A: 89 }, 5); assert.strictEqual(lim.estado, 'ejecutada'); cerca(c.saldo, 9000 - 445); cerca(c.posiciones.A.costoProm, (1000 + 445) / 15);
  C.procesar(c, { A: 84 }, 6); assert.strictEqual(st.estado, 'ejecutada'); cerca(c.saldo, 9815); assert.ok(!c.posiciones.A);
  cerca(C.equitySim(c, {}), 9815); const rs = C.resumenSim(c, {}); cerca(rs.pnl, -185); cerca(rs.realizado, -185); cerca(rs.aciertos, 0);
  assert.strictEqual(C.enviar(c, { key: 'A', simbolo: 'A', lado: 'compra', tipo: 'mercado', cant: 1000 }, pr, 7).estado, 'rechazada');
  assert.strictEqual(C.enviar(c, { key: 'A', simbolo: 'A', lado: 'venta', tipo: 'mercado', cant: 1 }, pr, 8).estado, 'rechazada');
  const cx = C.enviar(c, { key: 'A', simbolo: 'A', lado: 'compra', tipo: 'limite', cant: 1, precio: 50 }, pr, 9); C.cancelar(c, cx.id); assert.strictEqual(cx.estado, 'cancelada');
});
t('Papel trading: comision y limite de venta', () => {
  const c = C.nuevaSim(1000, 1), pr = { Z: 10 }; C.enviar(c, { key: 'Z', simbolo: 'Z', lado: 'compra', tipo: 'mercado', cant: 50 }, pr, 1); cerca(c.saldo, 1000 - 500 - 5);
  const o = C.enviar(c, { key: 'Z', simbolo: 'Z', lado: 'venta', tipo: 'limite', cant: 50, precio: 12 }, pr, 2); C.procesar(c, { Z: 12 }, 3); assert.strictEqual(o.estado, 'ejecutada'); cerca(c.saldo, 495 + 600 - 6);
});

// ---- Alertas ----
t('Alertas: precio, cambio, RSI, cruce, una vez / repetible', () => {
  const baja = Array.from({ length: 40 }, (_, i) => 100 - i), ctx = { precio: k => ({ A: 105, B: 50 }[k]), cambio24h: k => (k === 'A' ? 6 : -8), cierres: k => (k === 'B' ? baja : null) };
  const al = [{ id: 1, key: 'A', tipo: 'precio-sobre', valor: 100, activa: true }, { id: 2, key: 'A', tipo: 'precio-bajo', valor: 100, activa: true }, { id: 3, key: 'A', tipo: 'cambio-sobre', valor: 5, activa: true },
    { id: 4, key: 'B', tipo: 'rsi-bajo', valor: 30, activa: true }, { id: 5, key: 'B', tipo: 'rsi-sobre', valor: 70, activa: true }, { id: 6, key: 'A', tipo: 'cambio-bajo', valor: -5, activa: true }];
  const d = A.evaluar(al, ctx, 1000); assert.deepStrictEqual(d.map(x => x.alerta.id).sort(), [1, 3, 4]); assert.ok(!al[0].activa && al[1].activa);
  assert.strictEqual(A.evaluar(al, ctx, 2000).length, 0);
  const rep = [{ id: 9, key: 'A', tipo: 'precio-sobre', valor: 100, activa: true, repetir: true, enfriamiento: 1000 }];
  assert.strictEqual(A.evaluar(rep, ctx, 10).length, 1); assert.strictEqual(A.evaluar(rep, ctx, 500).length, 0); assert.strictEqual(A.evaluar(rep, ctx, 1500).length, 1);
  const cruce = Array.from({ length: 30 }, (_, i) => (i < 29 ? 100 - i * 0.1 : 110)); assert.strictEqual(A.evaluar([{ key: 'C', tipo: 'cruce-sma', valor: 10, activa: true }], { precio: () => 110, cambio24h: () => 0, cierres: () => cruce }, 1).length, 1);
  assert.strictEqual(A.evaluar([{ key: 'Q', tipo: 'precio-sobre', valor: 1, activa: true }], { precio: () => null, cambio24h: () => null, cierres: () => null }, 1).length, 0);
});
// ---- Calculadoras ----
t('Calculadoras', () => {
  const p = K.tamanoPosicion({ capital: 10000, riesgoPct: 1, entrada: 50, stop: 48 }); cerca(p.unidades, 50); cerca(p.valor, 2500); cerca(p.riesgoMax, 100); assert.strictEqual(p.lado, 'largo');
  assert.ok(K.tamanoPosicion({ capital: 100, riesgoPct: 50, entrada: 100, stop: 99 }).aviso); assert.ok(K.tamanoPosicion({ capital: 1, riesgoPct: 1, entrada: 5, stop: 5 }).error);
  const rr = K.riesgoBeneficio({ entrada: 100, stop: 95, objetivo: 115 }); cerca(rr.ratio, 3); cerca(rr.aciertoMinimo, 0.25); assert.ok(rr.coherente); assert.ok(!K.riesgoBeneficio({ entrada: 100, stop: 95, objetivo: 90 }).coherente);
  cerca(K.interesCompuesto({ capital: 1000, aporte: 0, tasaAnual: 12, anos: 1, frecAportes: 12, capitalizaciones: 12 }).final, 1000 * Math.pow(1.01, 12));
  cerca(K.interesCompuesto({ capital: 1000, aporte: 100, tasaAnual: 12, anos: 1 }).final, 1000 * Math.pow(1.01, 12) + 100 * (Math.pow(1.01, 12) - 1) / 0.01); assert.strictEqual(K.interesCompuesto({ capital: 0, aporte: 10, tasaAnual: 0, anos: 3 }).final, 360);
  const d = K.dca({ aporte: 100, precios: [10, 20, 25], precioActual: 20 }); cerca(d.unidades, 19); cerca(d.costoProm, 300 / 19); cerca(d.pnl, 80);
  cerca(K.convertir(100, 'EUR', 'MXN', { EUR: 0.9, MXN: 18 }), 2000); cerca(K.convertir(90, 'EUR', 'USD', { EUR: 0.9 }), 100); assert.ok(isNaN(K.convertir(1, 'XXX', 'USD', {})));
  const ops = [{ ganancia: 1000, dias: 30 }, { ganancia: -200, dias: 400 }];
  cerca(K.impuestos({ operaciones: ops, tasaCorto: 30, tasaLargo: 15 }).impuesto, 300); cerca(K.impuestos({ operaciones: ops, tasaCorto: 30, tasaLargo: 15, compensarCruzado: true }).impuesto, 240);
});
// ---- Otros modulos ----
t('Screener: metricas y reglas', () => {
  const m = S.metricas(velas); cerca(m.precio, c[69]); cerca(m.rsi14, ref.rsi14[69]); cerca(m.sma20, ref.bbMid[69]); assert.ok(isNaN(m.sma200));
  assert.ok(S.evaluar([{ campo: 'rsi14', op: '>', valor: 0 }, { campo: 'precio', op: '>', ref: 'sma20' }], { rsi14: 25, precio: 10, sma20: 9 }) === true);
  assert.ok(!S.evaluar([{ campo: 'rsi14', op: '<', valor: 30 }, { campo: 'precio', op: '>', ref: 'sma200' }], { rsi14: 25, precio: 10, sma200: NaN })); assert.ok(S.describir({ campo: 'rsi14', op: '<', valor: 30 }).includes('RSI'));
});
t('Miedo y codicia', () => {
  const ref2 = Array.from({ length: 200 }, (_, i) => 100 + i), arriba = SE.calcular({ c24: [1, 2, 3, 4], c7: [10, 12, 15, 9], ref: ref2 }), abajo = SE.calcular({ c24: [-1, -2, -3, -4], c7: [-10, -12, -15, -9] });
  assert.ok(arriba.valor > 75, 'arriba ' + arriba.valor); assert.ok(abajo.valor < 10, 'abajo ' + abajo.valor); assert.strictEqual(abajo.partes.length, 3); assert.strictEqual(SE.calcular({}).etiqueta, 'Sin datos');
});
t('Treemap: areas proporcionales dentro del rectangulo', () => {
  const r = T.diseno([{ id: 'a', valor: 6 }, { id: 'b', valor: 3 }, { id: 'c', valor: 2 }, { id: 'd', valor: 1 }, { id: 'e', valor: 0 }], 600, 400);
  assert.strictEqual(r.length, 4); cerca(r.reduce((s, q) => s + q.w * q.h, 0), 240000, 1e-9); cerca(r[0].w * r[0].h, 120000, 1e-9);
  r.forEach(q => assert.ok(q.x >= -1e-9 && q.y >= -1e-9 && q.x + q.w <= 600 + 1e-6 && q.y + q.h <= 400 + 1e-6));
});
t('Fuerza de monedas', () => {
  const f = D.fuerza({ EUR: [['a', 1], ['b', 0.9]], JPY: [['a', 100], ['b', 110]] }, 5); const e = f.find(x => x.moneda === 'EUR'), j = f.find(x => x.moneda === 'JPY');
  cerca(e.vsUSD, -Math.log(0.9) * 100, 1e-9); assert.ok(e.fuerza > 0 && j.fuerza < 0); assert.strictEqual(f[0].moneda, 'EUR');
});
t('Fixtures deterministas y coherentes', () => {
  const a = F.generar(Date.UTC(2026, 0, 5, 3)), b = F.generar(Date.UTC(2026, 0, 5, 20)); assert.strictEqual(JSON.stringify(a['mercados/cripto_hist/bitcoin.json']), JSON.stringify(b['mercados/cripto_hist/bitcoin.json']));
  const x = a['mercados/cripto_hist/ethereum.json'].velas; x.forEach(q => assert.ok(q[2] >= Math.max(q[1], q[4]) - 1e-9 && q[3] <= Math.min(q[1], q[4]) + 1e-9 && q[5] > 0)); assert.strictEqual(x.length, 365);
  assert.strictEqual(a['mercados/cripto.json'].items.length, 60); assert.ok(a['mercados/acciones.json'].indices.length >= 5);
});
t('Rendimiento: 5000 velas, indicadores completos < 1 s', () => {
  const vs = F.serie('perf', 5000, 100, 0.02, Date.now()), cc = I.col(vs, 4), hh = I.col(vs, 2), ll = I.col(vs, 3), t0 = Date.now();
  I.sma(cc, 200); I.ema(cc, 50); I.rsi(cc, 14); I.macd(cc); I.bollinger(cc); I.atr(hh, ll, cc); I.adx(hh, ll, cc); I.estocastico(hh, ll, cc); I.ichimoku(hh, ll, cc); P.detectar(vs); B.ejecutar(vs, { tipo: 'cruce' });
  assert.ok(Date.now() - t0 < 1000, 'tardo ' + (Date.now() - t0));
});
const AL = J('almacen.js'), FM = J('fmt.js');
t('Almacen: get/set/lista/suscribir/exportar sin claves de dispositivo', () => {
  const a = AL.crear(AL.backendMemoria()); let vistos = [];
  return a.listo.then(() => { a.suscribir('x_', (k, v) => vistos.push(k + '=' + v), true); a.set('x_a', 1); a.set('x_b', 2); a.set('claves_dispositivo_k', 'secreto'); a.set('otra', 3);
    assert.strictEqual(a.get('x_a'), 1); assert.strictEqual(a.get('nada', 7), 7); assert.deepStrictEqual(a.lista('x_').map(x => x.clave).sort(), ['x_a', 'x_b']); assert.ok(a.lista('x_')[0].t > 0); assert.deepStrictEqual(vistos, ['x_a=1', 'x_b=2']);
    const ex = a.exportar(); assert.ok(!('claves_dispositivo_k' in ex.datos) && 'x_a' in ex.datos); const b = AL.crear(AL.backendMemoria()); return b.listo.then(() => { b.importar(JSON.parse(JSON.stringify(ex))); assert.strictEqual(b.get('x_b'), 2); assert.throws(() => b.importar({})); a.borrar('x_a'); assert.strictEqual(a.get('x_a'), undefined); }); });
});
t('Fmt: precios, grandes, porcentajes, edad, escape', () => {
  assert.strictEqual(FM.pct(1.234), '+1,23%'); assert.strictEqual(FM.pct(-0.5), '-0,50%'); assert.strictEqual(FM.pct(null), '-'); assert.strictEqual(FM.grande(1.5e9), '1,50 MM'); assert.strictEqual(FM.grande(2.5e12), '2,50 B');
  assert.strictEqual(FM.precio(67000), '67.000,00'); assert.strictEqual(FM.precio(0.52), '0,5200'); assert.strictEqual(FM.edad(90000), 'hace 2 min'); assert.strictEqual(FM.edad(null), 'sin fecha');
  assert.strictEqual(FM.esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;'); assert.strictEqual(FM.urlSegura('javascript:alert(1)'), '#'); assert.strictEqual(FM.urlSegura('https://a.b'), 'https://a.b');
});
Promise.all(pend).then(() => { console.log(ok + ' pruebas correctas, ' + fallos + ' fallos'); process.exit(fallos ? 1 : 0); });
