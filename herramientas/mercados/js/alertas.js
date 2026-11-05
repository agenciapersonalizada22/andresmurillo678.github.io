/* Alertas de precio/indicador. Solo se evaluan mientras la pagina esta abierta (no hay servidor). UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof require === 'function' && typeof module !== 'undefined' ? require('./' + f) : root[n]; };
  var m = factory(dep('Indicadores', 'indicadores.js')); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Alertas = m;
})(typeof self !== 'undefined' ? self : this, function (I) {
  var TIPOS = {
    'precio-sobre': 'Precio sube por encima de', 'precio-bajo': 'Precio cae por debajo de', 'cambio-sobre': 'Cambio 24h mayor que (%)', 'cambio-bajo': 'Cambio 24h menor que (%)',
    'rsi-sobre': 'RSI(14) por encima de', 'rsi-bajo': 'RSI(14) por debajo de', 'cruce-sma': 'Precio cruza la SMA (periodo)'
  };
  /* ctx: {precio(key), cambio24h(key), cierres(key) -> array|null} */
  function condicion(a, ctx) {
    var p = ctx.precio(a.key), v = Number(a.valor);
    if (p == null) return { ok: false };
    switch (a.tipo) {
      case 'precio-sobre': return { ok: p >= v, valor: p };
      case 'precio-bajo': return { ok: p <= v, valor: p };
      case 'cambio-sobre': { var c = ctx.cambio24h(a.key); return { ok: c != null && c >= v, valor: c }; }
      case 'cambio-bajo': { var c2 = ctx.cambio24h(a.key); return { ok: c2 != null && c2 <= v, valor: c2 }; }
      case 'rsi-sobre': case 'rsi-bajo': {
        var cs = ctx.cierres(a.key); if (!cs || cs.length < 16) return { ok: false };
        var r = I.rsi(cs, 14), x = r[r.length - 1];
        return { ok: a.tipo === 'rsi-sobre' ? x >= v : x <= v, valor: x };
      }
      case 'cruce-sma': {
        var cl = ctx.cierres(a.key), n = Math.round(v); if (!cl || cl.length < n + 2) return { ok: false };
        var s = I.sma(cl, n), L = cl.length - 1;
        var antes = cl[L - 1] - s[L - 1], ahora = cl[L] - s[L];
        return { ok: antes * ahora < 0 || (antes < 0 && ahora === 0), valor: cl[L] };
      }
    }
    return { ok: false };
  }
  /* Devuelve las alertas disparadas. Una alerta no repetible se desactiva; las repetibles esperan 'enfriamiento' ms. */
  function evaluar(alertas, ctx, ahora) {
    var disp = [];
    alertas.forEach(function (a) {
      if (!a.activa) return;
      if (a.repetir && a.ultima != null && ahora - a.ultima < (a.enfriamiento || 3600000)) return;
      var r = condicion(a, ctx);
      if (r.ok) { a.ultima = ahora; a.veces = (a.veces || 0) + 1; if (!a.repetir) a.activa = false; disp.push({ alerta: a, valor: r.valor, mensaje: descripcion(a) + ' (actual: ' + redondea(r.valor) + ')' }); }
    });
    return disp;
  }
  function redondea(v) { return v == null || !isFinite(v) ? '-' : Math.abs(v) >= 100 ? v.toFixed(2) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(4); }
  function descripcion(a) { return (a.simbolo || a.key) + ': ' + TIPOS[a.tipo] + ' ' + a.valor; }
  return { TIPOS: TIPOS, evaluar: evaluar, condicion: condicion, descripcion: descripcion };
});
