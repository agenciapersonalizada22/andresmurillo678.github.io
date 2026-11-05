/* Alertas de precio y de palabras clave. Puro: evalua contra la lista de ofertas. UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab(function (n) { return require('./' + n + '.js'); });
  else { g.Of = g.Of || {}; g.Of.alertas = fab(function (n) { return g.Of[n]; }); }
})(typeof self !== 'undefined' ? self : this, function (req) {
  var B = req('busqueda'), T = req('texto');
  var uid = 0;
  function nueva(d) {
    d = d || {};
    return { id: d.id || ('a' + Date.now().toString(36) + (uid++)), tipo: d.tipo === 'producto' ? 'producto' : 'palabra', nombre: d.nombre || '',
      consulta: d.consulta || '', precioMax: num(d.precioMax), descMin: num(d.descMin), moneda: d.moneda || 'USD',
      itemIds: d.itemIds || [], objetivo: num(d.objetivo), soloVigentes: d.soloVigentes !== false, activa: d.activa !== false,
      creada: d.creada || Date.now(), vistos: d.vistos || {} };
  }
  function num(x) { x = parseFloat(x); return isFinite(x) && x > 0 ? x : null; }
  function describir(a) {
    if (a.tipo === 'producto') return (a.nombre || 'Producto') + ' a ' + a.objetivo + ' ' + a.moneda + ' o menos';
    var p = [];
    p.push(a.consulta ? '"' + a.consulta + '"' : 'cualquier oferta');
    if (a.precioMax) p.push('bajo ' + a.precioMax + ' ' + a.moneda);
    if (a.descMin) p.push('con ' + a.descMin + '% o mas');
    return p.join(' ');
  }
  function descDe(it) {
    if (it.descuentoPct != null) return it.descuentoPct;
    return it.precioAntes > it.precio ? (1 - it.precio / it.precioAntes) * 100 : 0;
  }
  /* ctx: {ahora, convertir(monto,de,a)->monto, descReal?(it)->0..100} */
  function coincideAlerta(a, it, ctx) {
    var ahora = ctx.ahora || Date.now(), conv = ctx.convertir || function (m) { return m; };
    if (a.soloVigentes && it.vence && Date.parse(it.vence) < ahora) return false;
    var precio = conv(it.precio, it.moneda, a.moneda);
    if (a.tipo === 'producto') return a.itemIds.indexOf(it.id) >= 0 && a.objetivo != null && precio <= a.objetivo;
    if (a.precioMax != null && !(precio <= a.precioMax)) return false;
    var d = ctx.descReal ? Math.max(descDe(it), ctx.descReal(it) || 0) : descDe(it);
    if (a.descMin != null && !(d >= a.descMin)) return false;
    if (a.consulta) {
      var p = B.parse(a.consulta);
      var doc = { titulo: it.titulo, tienda: it.tienda, cat: it.categoria, precio: precio, desc: d, cupon: !!it.cupon, moneda: it.moneda, pais: it.pais };
      if (!B.coincide(p, doc)) return false;
    } else if (a.precioMax == null && a.descMin == null) return false;
    return true;
  }
  /* devuelve [{alerta, coincidencias:[it], nuevas:[it]}]; "nuevas" = no avisadas antes (o con baja >=3% desde el aviso) */
  function evaluar(alertas, items, ctx) {
    var out = [];
    alertas.forEach(function (a) {
      if (!a.activa) return;
      var co = [], nu = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!coincideAlerta(a, it, ctx)) continue;
        co.push(it);
        var prev = a.vistos[it.id];
        if (prev == null || it.precio < prev * 0.97) nu.push(it);
      }
      if (co.length) out.push({ alerta: a, coincidencias: co, nuevas: nu });
    });
    return out;
  }
  function marcarVistos(a, items) {
    var v = Object.assign({}, a.vistos);
    items.forEach(function (it) { v[it.id] = it.precio; });
    var ks = Object.keys(v);
    if (ks.length > 500) ks.slice(0, ks.length - 500).forEach(function (k) { delete v[k]; });
    return Object.assign({}, a, { vistos: v, ultimoAviso: Date.now() });
  }
  return { nueva: nueva, describir: describir, evaluar: evaluar, coincideAlerta: coincideAlerta, marcarVistos: marcarVistos };
});
