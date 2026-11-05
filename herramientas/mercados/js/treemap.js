/* Mapa de calor: disposicion "squarified treemap". UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Treemap = m; })(typeof self !== 'undefined' ? self : this, function () {
  function peor(fila, lado) {
    var s = 0, mx = -Infinity, mn = Infinity;
    fila.forEach(function (f) { s += f.area; mx = Math.max(mx, f.area); mn = Math.min(mn, f.area); });
    return Math.max(lado * lado * mx / (s * s), s * s / (lado * lado * mn));
  }
  /* items: [{id, valor}] valor>0; devuelve [{id, x, y, w, h}] dentro de w x h */
  function diseno(items, W, H) {
    var arr = items.filter(function (i) { return i.valor > 0; }).sort(function (a, b) { return b.valor - a.valor; });
    var tot = arr.reduce(function (s, i) { return s + i.valor; }, 0), out = [];
    if (!tot) return out;
    var nodos = arr.map(function (i) { return { it: i, area: i.valor / tot * W * H }; });
    var x = 0, y = 0, w = W, h = H;
    while (nodos.length) {
      var lado = Math.min(w, h), fila = [nodos[0]], k = 1;
      while (k < nodos.length && peor(fila.concat([nodos[k]]), lado) <= peor(fila, lado)) { fila.push(nodos[k]); k++; }
      nodos = nodos.slice(k);
      var sa = fila.reduce(function (s, f) { return s + f.area; }, 0), cx = x, cy = y;
      if (w >= h) {
        var fw = sa / h;
        fila.forEach(function (f) { var fh = f.area / fw; out.push({ id: f.it.id, x: x, y: cy, w: fw, h: fh }); cy += fh; });
        x += fw; w -= fw;
      } else {
        var fh2 = sa / w;
        fila.forEach(function (f) { var fw2 = f.area / fh2; out.push({ id: f.it.id, x: cx, y: y, w: fw2, h: fh2 }); cx += fw2; });
        y += fh2; h -= fh2;
      }
    }
    return out;
  }
  return { diseno: diseno };
});
