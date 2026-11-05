/* Keyframes y animaciones de texto/pegatinas (logica pura). VE.keyframes */
(function (g) {
  var K = {};
  var EASE = {
    lineal: function (x) { return x; },
    suave: function (x) { return x * x * (3 - 2 * x); },
    entra: function (x) { return x * x; },
    sale: function (x) { return 1 - (1 - x) * (1 - x); },
    rebote: function (x) { var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; },
    elastico: function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
  };
  K.EASE = EASE;
  K.valor = function (lista, t, def) {
    if (!lista || !lista.length) return def;
    if (t <= lista[0].t) return lista[0].v;
    var n = lista.length; if (t >= lista[n - 1].t) return lista[n - 1].v;
    for (var i = 0; i < n - 1; i++) {
      var a = lista[i], b = lista[i + 1];
      if (t >= a.t && t <= b.t) {
        var u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        return a.v + (b.v - a.v) * (EASE[a.ease || 'suave'] || EASE.suave)(u);
      }
    }
    return lista[n - 1].v;
  };
  K.poner = function (lista, t, v, ease) {
    for (var i = 0; i < lista.length; i++) if (Math.abs(lista[i].t - t) < 0.02) { lista[i].v = v; if (ease) lista[i].ease = ease; return lista; }
    lista.push({ t: t, v: v, ease: ease || 'suave' }); lista.sort(function (a, b) { return a.t - b.t; }); return lista;
  };
  K.quitar = function (lista, t) { for (var i = lista.length - 1; i >= 0; i--) if (Math.abs(lista[i].t - t) < 0.05) lista.splice(i, 1); return lista; };
  K.cortar = function (lista, t0) {
    var v0 = K.valor(lista, t0), r = [{ t: 0, v: v0, ease: 'suave' }];
    lista.forEach(function (e) { if (e.t > t0 + 1e-6) r.push({ t: e.t - t0, v: e.v, ease: e.ease }); });
    return r;
  };
  K.propiedad = function (clip, prop, local, def) {
    var l = clip.kf && clip.kf[prop];
    return l && l.length ? K.valor(l, local, def) : def;
  };

  /* Animacion de entrada/salida. anim = {in,out,dur,cont}; devuelve {op,dx,dy,esc,rot,prog} (dx,dy en fracciones de lienzo) */
  K.ENTRADAS = ['ninguna', 'fundido', 'subir', 'bajar', 'izq', 'der', 'zoom', 'rebote', 'maquina', 'giro', 'desplazar'];
  K.SALIDAS = ['ninguna', 'fundido', 'subir', 'bajar', 'zoom', 'izq', 'der'];
  K.CONTINUAS = ['ninguna', 'pulso', 'flotar', 'girar', 'latido'];
  K.animar = function (anim, local, dur) {
    var r = { op: 1, dx: 0, dy: 0, esc: 1, rot: 0, prog: 1 };
    if (!anim) return r;
    var d = Math.max(0.05, Math.min(anim.dur || 0.5, dur / 2));
    var e = anim.in || 'ninguna';
    if (e === 'desplazar') { var u = Math.max(0, Math.min(1, local / dur)); r.dx = 1.2 - 2.4 * u; }
    else if (e !== 'ninguna' && local < d) {
      var x = Math.max(0, local / d), s = EASE.suave(x);
      if (e === 'fundido') r.op = x;
      else if (e === 'subir') { r.dy = 0.25 * (1 - EASE.sale(x)); r.op = x; }
      else if (e === 'bajar') { r.dy = -0.25 * (1 - EASE.sale(x)); r.op = x; }
      else if (e === 'izq') { r.dx = -0.6 * (1 - EASE.sale(x)); r.op = x; }
      else if (e === 'der') { r.dx = 0.6 * (1 - EASE.sale(x)); r.op = x; }
      else if (e === 'zoom') { r.esc = 0.3 + 0.7 * s; r.op = x; }
      else if (e === 'rebote') { r.esc = EASE.rebote(x); r.op = Math.min(1, x * 4); }
      else if (e === 'giro') { r.rot = -180 * (1 - s); r.esc = s; r.op = x; }
      else if (e === 'maquina') r.prog = x;
    }
    var o = anim.out || 'ninguna', resto = dur - local;
    if (o !== 'ninguna' && resto < d) {
      var y = Math.max(0, 1 - resto / d);
      if (o === 'fundido') r.op *= 1 - y;
      else if (o === 'subir') { r.dy -= 0.25 * EASE.entra(y); r.op *= 1 - y; }
      else if (o === 'bajar') { r.dy += 0.25 * EASE.entra(y); r.op *= 1 - y; }
      else if (o === 'zoom') { r.esc *= 1 - 0.7 * EASE.suave(y); r.op *= 1 - y; }
      else if (o === 'izq') { r.dx -= 0.6 * EASE.entra(y); r.op *= 1 - y; }
      else if (o === 'der') { r.dx += 0.6 * EASE.entra(y); r.op *= 1 - y; }
    }
    var c = anim.cont || 'ninguna';
    if (c === 'pulso') r.esc *= 1 + 0.08 * Math.sin(local * 6);
    else if (c === 'latido') r.esc *= 1 + 0.12 * Math.pow(Math.max(0, Math.sin(local * 5)), 4);
    else if (c === 'flotar') r.dy += 0.015 * Math.sin(local * 2.5);
    else if (c === 'girar') r.rot += local * 90;
    return r;
  };
  g.VE = g.VE || {}; g.VE.keyframes = K;
  if (typeof module !== 'undefined') module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
