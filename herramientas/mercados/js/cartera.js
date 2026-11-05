/* Carteras: real manual (costo promedio) y simulada (papel trading). Funciones puras sobre objetos serializables. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Cartera = m; })(typeof self !== 'undefined' ? self : this, function () {
  var EPS = 1e-9;
  /* ---- cartera real: transacciones {tipo:'compra'|'venta'|'dividendo', simbolo, cant, precio, comision, fecha, monto} ---- */
  function posiciones(trans) {
    var P = {}, ord = trans.slice().sort(function (a, b) { return (a.fecha || 0) - (b.fecha || 0); });
    var tot = { realizado: 0, dividendos: 0, comisiones: 0 };
    ord.forEach(function (t) {
      var p = P[t.simbolo] || (P[t.simbolo] = { simbolo: t.simbolo, key: t.key, cant: 0, costoTotal: 0, realizado: 0, dividendos: 0, comisiones: 0 });
      var com = t.comision || 0;
      if (t.tipo === 'compra') { p.costoTotal += t.cant * t.precio + com; p.cant += t.cant; p.comisiones += com; tot.comisiones += com; }
      else if (t.tipo === 'venta') {
        if (t.cant > p.cant + EPS) throw new Error('Venta de ' + t.cant + ' ' + t.simbolo + ' supera la posicion (' + p.cant + ')');
        var prom = p.cant ? p.costoTotal / p.cant : 0, base = prom * t.cant, ing = t.cant * t.precio - com, g = ing - base;
        p.realizado += g; tot.realizado += g; p.costoTotal -= base; p.cant -= t.cant; p.comisiones += com; tot.comisiones += com;
        if (p.cant < EPS) { p.cant = 0; p.costoTotal = 0; }
      } else if (t.tipo === 'dividendo') { var m = t.monto != null ? t.monto : t.cant * t.precio; p.dividendos += m; tot.dividendos += m; }
    });
    Object.keys(P).forEach(function (k) { P[k].costoProm = P[k].cant ? P[k].costoTotal / P[k].cant : 0; });
    return { porSimbolo: P, totales: tot };
  }
  /* precios: {simbolo: precio} en la moneda de la cartera */
  function valorar(res, precios) {
    var filas = [], vt = 0, ct = 0;
    Object.keys(res.porSimbolo).forEach(function (k) {
      var p = res.porSimbolo[k]; if (p.cant <= 0) return;
      var px = precios[k], valor = px != null ? px * p.cant : NaN, pnl = valor - p.costoTotal;
      filas.push({ simbolo: k, key: p.key, cant: p.cant, costoProm: p.costoProm, costoTotal: p.costoTotal, precio: px, valor: valor, pnl: pnl, pnlPct: p.costoTotal ? pnl / p.costoTotal : NaN, realizado: p.realizado, dividendos: p.dividendos });
      if (isFinite(valor)) { vt += valor; ct += p.costoTotal; }
    });
    filas.forEach(function (f) { f.peso = vt && isFinite(f.valor) ? f.valor / vt : 0; });
    filas.sort(function (a, b) { return (b.valor || 0) - (a.valor || 0); });
    return { filas: filas, valor: vt, costo: ct, pnlNoRealizado: vt - ct, pnlPct: ct ? (vt - ct) / ct : NaN, realizado: res.totales.realizado, dividendos: res.totales.dividendos, comisiones: res.totales.comisiones,
      total: vt - ct + res.totales.realizado + res.totales.dividendos };
  }
  /* ---- papel trading ---- */
  var seq = 0;
  function nuevaSim(saldo, comisionPct) { return { saldoInicial: saldo, saldo: saldo, comisionPct: comisionPct || 0, posiciones: {}, ordenes: [], historial: [], curva: [] }; }
  function id() { return 'o' + Date.now().toString(36) + (seq++).toString(36); }
  function ejecutarFill(c, o, px, ahora) {
    var com = px * o.cant * c.comisionPct / 100, p = c.posiciones[o.key];
    if (o.lado === 'compra') {
      var costo = px * o.cant + com;
      if (costo > c.saldo + EPS) { o.estado = 'rechazada'; o.motivo = 'Saldo insuficiente'; return false; }
      c.saldo -= costo;
      if (!p) p = c.posiciones[o.key] = { key: o.key, simbolo: o.simbolo, cant: 0, costoProm: 0 };
      p.costoProm = (p.costoProm * p.cant + px * o.cant + com) / (p.cant + o.cant); p.cant += o.cant;
      c.historial.push({ id: o.id, t: ahora, key: o.key, simbolo: o.simbolo, lado: 'compra', cant: o.cant, precio: px, comision: com, pnl: 0, tipo: o.tipo });
    } else {
      if (!p || p.cant + EPS < o.cant) { o.estado = 'rechazada'; o.motivo = 'Sin posicion suficiente (no se permite vender en corto)'; return false; }
      var pnl = (px - p.costoProm) * o.cant - com; c.saldo += px * o.cant - com; p.cant -= o.cant;
      if (p.cant < EPS) delete c.posiciones[o.key];
      c.historial.push({ id: o.id, t: ahora, key: o.key, simbolo: o.simbolo, lado: 'venta', cant: o.cant, precio: px, comision: com, pnl: pnl, tipo: o.tipo });
    }
    o.estado = 'ejecutada'; o.precioEjec = px; o.tEjec = ahora; return true;
  }
  /* orden: {key, simbolo, lado:'compra'|'venta', tipo:'mercado'|'limite'|'stop', cant, precio (limite/stop)} */
  function enviar(c, orden, precios, ahora) {
    var o = Object.assign({ id: id(), estado: 'pendiente', creada: ahora }, orden);
    if (!(o.cant > 0)) { o.estado = 'rechazada'; o.motivo = 'Cantidad invalida'; }
    else if (precios[o.key] == null) { o.estado = 'rechazada'; o.motivo = 'Sin precio'; }
    else if (o.tipo !== 'mercado' && !(o.precio > 0)) { o.estado = 'rechazada'; o.motivo = 'Precio de orden invalido'; }
    c.ordenes.push(o);
    if (o.estado === 'pendiente') {
      if (o.tipo === 'mercado') ejecutarFill(c, o, precios[o.key], ahora);
      else procesarUna(c, o, precios, ahora);
    }
    return o;
  }
  function procesarUna(c, o, precios, ahora) {
    var px = precios[o.key]; if (px == null || o.estado !== 'pendiente') return;
    var f = null;
    if (o.tipo === 'limite') { if (o.lado === 'compra' && px <= o.precio) f = px; if (o.lado === 'venta' && px >= o.precio) f = px; }
    else if (o.tipo === 'stop') { if (o.lado === 'venta' && px <= o.precio) f = px; if (o.lado === 'compra' && px >= o.precio) f = px; }
    if (f != null) ejecutarFill(c, o, f, ahora);
  }
  function procesar(c, precios, ahora) { c.ordenes.forEach(function (o) { procesarUna(c, o, precios, ahora); }); return c; }
  function cancelar(c, oid) { c.ordenes.forEach(function (o) { if (o.id === oid && o.estado === 'pendiente') o.estado = 'cancelada'; }); }
  function equitySim(c, precios) {
    var v = c.saldo; Object.keys(c.posiciones).forEach(function (k) { var p = c.posiciones[k]; v += p.cant * (precios[k] != null ? precios[k] : p.costoProm); });
    return v;
  }
  function registrarCurva(c, precios, ahora, bench) {
    var e = equitySim(c, precios), u = c.curva[c.curva.length - 1];
    if (u && ahora - u[0] < 60000) { u[1] = e; if (bench != null) u[2] = bench; } else c.curva.push([ahora, e, bench == null ? null : bench]);
    if (c.curva.length > 2000) c.curva.splice(0, c.curva.length - 2000);
    return e;
  }
  function resumenSim(c, precios) {
    var eq = equitySim(c, precios), cerr = c.historial.filter(function (h) { return h.lado === 'venta'; }), gan = cerr.filter(function (h) { return h.pnl > 0; });
    var noReal = 0; Object.keys(c.posiciones).forEach(function (k) { var p = c.posiciones[k]; if (precios[k] != null) noReal += (precios[k] - p.costoProm) * p.cant; });
    return { equity: eq, retorno: eq / c.saldoInicial - 1, pnl: eq - c.saldoInicial, realizado: cerr.reduce(function (s, h) { return s + h.pnl; }, 0), noRealizado: noReal, aciertos: cerr.length ? gan.length / cerr.length : NaN, operaciones: c.historial.length };
  }
  return { posiciones: posiciones, valorar: valorar, nuevaSim: nuevaSim, enviar: enviar, procesar: procesar, cancelar: cancelar, equitySim: equitySim, registrarCurva: registrarCurva, resumenSim: resumenSim };
});
