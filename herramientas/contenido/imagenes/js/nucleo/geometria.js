/* Alinear, distribuir, guias inteligentes y generadores de poligonos. Cajas {x,y,w,h}. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Geometria = f(); })(this, function () {
  var G = {};
  G.unir = function (cs) {
    var x0 = Math.min.apply(null, cs.map(function (c) { return c.x; })), y0 = Math.min.apply(null, cs.map(function (c) { return c.y; }));
    var x1 = Math.max.apply(null, cs.map(function (c) { return c.x + c.w; })), y1 = Math.max.apply(null, cs.map(function (c) { return c.y + c.h; }));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  /* devuelve desplazamientos [{dx,dy}] por caja. ref = caja de referencia (pagina) o null -> union */
  G.alinear = function (cajas, modo, ref) {
    var r = ref || G.unir(cajas);
    return cajas.map(function (c) {
      var dx = 0, dy = 0;
      if (modo === 'izq') dx = r.x - c.x; else if (modo === 'der') dx = r.x + r.w - (c.x + c.w); else if (modo === 'cx') dx = r.x + r.w / 2 - (c.x + c.w / 2);
      else if (modo === 'arr') dy = r.y - c.y; else if (modo === 'aba') dy = r.y + r.h - (c.y + c.h); else if (modo === 'cy') dy = r.y + r.h / 2 - (c.y + c.h / 2);
      return { dx: dx, dy: dy };
    });
  };
  /* distribuye con huecos iguales; eje 'x'|'y' */
  G.distribuir = function (cajas, eje) {
    var k = eje === 'x' ? ['x', 'w'] : ['y', 'h'], n = cajas.length, res = cajas.map(function () { return { dx: 0, dy: 0 }; });
    if (n < 3) return res;
    var ord = cajas.map(function (c, i) { return i; }).sort(function (a, b) { return cajas[a][k[0]] - cajas[b][k[0]]; });
    var ini = cajas[ord[0]][k[0]], fin = cajas[ord[n - 1]][k[0]] + cajas[ord[n - 1]][k[1]];
    var suma = ord.reduce(function (s, i) { return s + cajas[i][k[1]]; }, 0), hueco = (fin - ini - suma) / (n - 1), pos = ini;
    ord.forEach(function (i) { var d = pos - cajas[i][k[0]]; if (eje === 'x') res[i].dx = d; else res[i].dy = d; pos += cajas[i][k[1]] + hueco; });
    return res;
  };
  /* Ajuste a guias: caja movil, objetivos {x:[valores], y:[valores]}, umbral.
     Devuelve {dx,dy,lineasX:[v],lineasY:[v]} */
  G.ajustar = function (c, obj, umbral) {
    function eje(ini, tam, vals) {
      var pts = [ini, ini + tam / 2, ini + tam], mejor = null;
      pts.forEach(function (p) { vals.forEach(function (v) { var d = v - p; if (Math.abs(d) <= umbral && (mejor === null || Math.abs(d) < Math.abs(mejor))) mejor = d; }); });
      if (mejor === null) return { d: 0, l: [] };
      var l = []; pts.forEach(function (p) { vals.forEach(function (v) { if (Math.abs(v - (p + mejor)) < 0.01 && l.indexOf(v) < 0) l.push(v); }); });
      return { d: mejor, l: l };
    }
    var ex = eje(c.x, c.w, obj.x || []), ey = eje(c.y, c.h, obj.y || []);
    return { dx: ex.d, dy: ey.d, lineasX: ex.l, lineasY: ey.l };
  };
  G.cuadricula = function (v, paso) { return Math.round(v / paso) * paso; };
  G.poligono = function (n, rot) {
    var p = []; rot = rot == null ? -Math.PI / 2 : rot;
    for (var i = 0; i < n; i++) { var a = rot + i * 2 * Math.PI / n; p.push([Math.cos(a), Math.sin(a)]); }
    return p;
  };
  G.estrella = function (n, interior) {
    var p = [];
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? interior : 1; p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return p;
  };
  G.ajustarProporcion = function (w, h, ratio, modo) {
    var r = w / h;
    if ((modo === 'contener') === (r > ratio)) return { w: h * ratio, h: h };
    return { w: w, h: w / ratio };
  };
  return G;
});
