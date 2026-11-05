/* Grafica de lineas propia en canvas (historial de precios). Of.grafica.dibujar(canvas, {series:[{nombre,color,puntos:[[t,v]]}], refs:[{v,texto}], fmt(v), marcas:true}) */
(function (g) {
  g.Of = g.Of || {};
  function css(el, v, d) { var x = getComputedStyle(el).getPropertyValue(v).trim(); return x || d; }
  function dibujar(canvas, o) {
    var dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var txt = css(canvas, '--muted', '#667'), grid = css(canvas, '--linea', '#8883'), fg = css(canvas, '--txt', '#111'), fondo = css(canvas, '--tarjeta', '#fff');
    var ml = 8, mr = 8, mt = 10, mb = 20, pts = [], t0 = Infinity, t1 = -Infinity, v0 = Infinity, v1 = -Infinity, fmt = o.fmt || String;
    o.series.forEach(function (s) { s.puntos.forEach(function (p) { if (p[0] < t0) t0 = p[0]; if (p[0] > t1) t1 = p[0]; if (p[1] < v0) v0 = p[1]; if (p[1] > v1) v1 = p[1]; }); });
    (o.refs || []).forEach(function (r) { if (r.v < v0) v0 = r.v; if (r.v > v1) v1 = r.v; });
    c.clearRect(0, 0, W, H);
    if (!isFinite(t0)) { c.fillStyle = txt; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('Sin historial de precios', W / 2, H / 2); canvas._g = null; return; }
    if (v1 === v0) { v1 += 1; v0 -= 1; }
    var pad = (v1 - v0) * 0.08; v0 -= pad; v1 += pad; if (t1 === t0) t1 = t0 + 1;
    c.font = '11px system-ui';
    var wl = Math.max.apply(null, [fmt(v0), fmt(v1)].map(function (s) { return c.measureText(s).width; })) + 6; ml = Math.ceil(wl) + 4;
    var X = function (t) { return ml + (t - t0) / (t1 - t0) * (W - ml - mr); }, Y = function (v) { return mt + (1 - (v - v0) / (v1 - v0)) * (H - mt - mb); };
    c.lineWidth = 1; c.strokeStyle = grid; c.fillStyle = txt; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (var i = 0; i <= 3; i++) { var v = v0 + (v1 - v0) * i / 3, y = Math.round(Y(v)) + 0.5; c.beginPath(); c.moveTo(ml, y); c.lineTo(W - mr, y); c.stroke(); c.fillText(fmt(v), ml - 4, y); }
    c.textAlign = 'center'; c.textBaseline = 'top';
    for (i = 0; i <= 3; i++) { var t = t0 + (t1 - t0) * i / 3; c.fillText(new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' }), Math.min(Math.max(X(t), ml + 14), W - mr - 14), H - mb + 5); }
    (o.refs || []).forEach(function (r) {
      var y = Y(r.v); c.save(); c.setLineDash([5, 4]); c.strokeStyle = r.color || txt; c.beginPath(); c.moveTo(ml, y); c.lineTo(W - mr, y); c.stroke(); c.restore();
      c.fillStyle = r.color || txt; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(r.texto, W - mr - 2, y - 2);
    });
    o.series.forEach(function (s) {
      if (!s.puntos.length) return;
      c.strokeStyle = s.color; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
      s.puntos.forEach(function (p, k) { var x = X(p[0]), y = Y(p[1]); if (k) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
      s.puntos.forEach(function (p) { pts.push({ x: X(p[0]), y: Y(p[1]), t: p[0], v: p[1], s: s }); });
      var ult = s.puntos[s.puntos.length - 1];
      c.fillStyle = s.color; c.beginPath(); c.arc(X(ult[0]), Y(ult[1]), 3.5, 0, 7); c.fill();
      if (o.marcas) {
        var mn = s.puntos.reduce(function (a, p) { return p[1] < a[1] ? p : a; });
        c.strokeStyle = fondo; c.lineWidth = 2; c.fillStyle = '#16a34a'; c.beginPath(); c.arc(X(mn[0]), Y(mn[1]), 4.5, 0, 7); c.stroke(); c.fill();
      }
    });
    canvas._g = { pts: pts, W: W, H: H, mt: mt, mb: mb, ml: ml, mr: mr, redibujar: function () { dibujar(canvas, o); }, fmt: fmt };
  }
  function enlazar(canvas, tip) {
    function mover(e) {
      var G = canvas._g; if (!G) return;
      var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 1e9;
      G.pts.forEach(function (p) { var d = Math.abs(p.x - x) + Math.abs(p.y - y) * 0.3; if (d < bd) { bd = d; best = p; } });
      if (!best || bd > 60) { tip.hidden = true; return; }
      tip.hidden = false;
      tip.textContent = best.s.nombre + ': ' + G.fmt(best.v) + ' · ' + new Date(best.t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' });
      tip.style.left = Math.min(Math.max(best.x - tip.offsetWidth / 2, 0), G.W - tip.offsetWidth) + 'px';
      tip.style.top = Math.max(best.y - 34, 0) + 'px';
    }
    canvas.addEventListener('pointermove', mover); canvas.addEventListener('pointerdown', mover);
    canvas.addEventListener('pointerleave', function () { tip.hidden = true; });
  }
  g.Of.grafica = { dibujar: dibujar, enlazar: enlazar };
})(typeof self !== 'undefined' ? self : this);
