/* Lienzo en pantalla: zoom/pan, render de la pagina, capa de superposicion (guias, seleccion, recorte), reglas. */
(function (IM) {
  var E = IM.E, Doc = IM.Doc, R = IM.Render, Matriz = window.Matriz, Geo = window.Geometria, Redes = window.Redes;
  var V = IM.Vista = { area: null, cv: null, ov: null, rh: null, rv: null, REG: 20, recorte: null, guiaNueva: null, cursor: null, guiasTemp: null };
  var ctx, octx, sucio = false, sucioOv = false, proxy = null, proxyCorre = false, proxySucio = false, tablero = null;

  V.init = function (area) {
    V.area = area; V.cv = area.querySelector('#cv'); V.ov = area.querySelector('#ov'); V.rh = area.querySelector('#reglaH'); V.rv = area.querySelector('#reglaV');
    ctx = V.cv.getContext('2d'); octx = V.ov.getContext('2d');
    new ResizeObserver(function () { V.cambioTam(); }).observe(area);
    V.cambioTam(); bucle();
    V.rh.addEventListener('pointerdown', function (e) { iniciarGuia(e, 'y'); }); V.rv.addEventListener('pointerdown', function (e) { iniciarGuia(e, 'x'); });
  };
  V.cambioTam = function () {
    var d = devicePixelRatio || 1, W = V.area.clientWidth, H = V.area.clientHeight;
    [V.cv, V.ov].forEach(function (c) { c.width = Math.round(W * d); c.height = Math.round(H * d); });
    V.rh.width = Math.round(W * d); V.rh.height = Math.round(V.REG * d); V.rv.width = Math.round(V.REG * d); V.rv.height = Math.round(H * d);
    if (!V._ajustado && E.proy) { V.ajustar(); V._ajustado = true; }
    sucio = sucioOv = true;
  };
  V.ajustar = function (margen) {
    var p = E.pagina(); if (!p) return; margen = margen == null ? 36 : margen;
    var W = V.area.clientWidth, H = V.area.clientHeight, r = E.proy.ajustes.reglas ? V.REG : 0;
    var k = Math.min((W - r - margen * 2) / p.w, (H - r - margen * 2) / p.h); k = IM.clamp(k, 0.02, 8);
    E.vista.k = k; E.vista.x = r + (W - r - p.w * k) / 2; E.vista.y = r + (H - r - p.h * k) / 2; E.emit('vista'); sucio = sucioOv = true;
  };
  V.aDoc = function (cx, cy) { var b = V.area.getBoundingClientRect(), v = E.vista; return { x: (cx - b.left - v.x) / v.k, y: (cy - b.top - v.y) / v.k }; };
  V.aPantalla = function (x, y) { var v = E.vista; return { x: v.x + x * v.k, y: v.y + y * v.k }; };
  V.zoom = function (f, cx, cy) {
    var v = E.vista, b = V.area.getBoundingClientRect(); if (cx == null) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
    var k = IM.clamp(v.k * f, 0.02, 32), r = k / v.k, px = cx - b.left, py = cy - b.top;
    v.x = px - (px - v.x) * r; v.y = py - (py - v.y) * r; v.k = k; E.emit('vista'); V.pedir();
  };
  V.mover = function (dx, dy) { E.vista.x += dx; E.vista.y += dy; V.pedir(); };
  V.pedir = function () { sucio = sucioOv = true; };
  V.pedirOv = function () { sucioOv = true; };
  E.on('dibujar', function () { sucio = sucioOv = true; proxySucio = true; });
  E.on('sel', function () { sucioOv = true; });
  E.on('vista', function () { sucio = sucioOv = true; });
  E.on('ajustar', function () { V._ajustado = false; setTimeout(function () { V.ajustar(); }, 0); });
  E.on('herr', function () { sucioOv = true; });

  function bucle() {
    if (sucio) { sucio = false; pintar(); }
    if (sucioOv) { sucioOv = false; overlay(); reglas(); }
    requestAnimationFrame(bucle);
  }
  function patronTablero(d) {
    if (tablero) return tablero;
    var c = IM.lienzo(16 * d, 16 * d), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#d0d3da'; x.fillRect(0, 0, 8 * d, 8 * d); x.fillRect(8 * d, 8 * d, 8 * d, 8 * d);
    return (tablero = ctx.createPattern(c, 'repeat'));
  }
  function refrescarProxy() {
    if (proxyCorre) return; proxyCorre = true; proxySucio = false;
    var p = E.pagina(), esc = Math.min(1, 2000 / Math.max(p.w, p.h)), pid = p.id;
    R.aCanvas(p, esc, { filtrar: IM.Trabajo.ops, rapido: false }).then(function (c) { proxy = { canvas: c, id: pid }; proxyCorre = false; sucio = true; if (proxySucio) refrescarProxy(); }, function () { proxyCorre = false; });
  }
  function pintar() {
    var p = E.pagina(); if (!p) return;
    var d = devicePixelRatio || 1, v = E.vista, s = v.k * d, x0 = v.x * d, y0 = v.y * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, V.cv.width, V.cv.height);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18 * d; ctx.shadowOffsetY = 4 * d; ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, p.w * s, p.h * s); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, p.w * s, p.h * s); ctx.clip();
    if (!p.fondo) { ctx.fillStyle = patronTablero(d); ctx.fillRect(x0, y0, p.w * s, p.h * s); }
    if (R.tieneAjustes(p)) {
      if (proxySucio || !proxy || proxy.id !== p.id) refrescarProxy();
      if (proxy && proxy.id === p.id) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(proxy.canvas, x0, y0, p.w * s, p.h * s); }
    } else { ctx.setTransform(s, 0, 0, s, x0, y0); R.pintar(ctx, p, { rapido: E.rapido }); }
    ctx.restore();
  }
  /* ---- geometria de seleccion compartida con la entrada ---- */
  V.cajaSel = function () {
    var cs = E.capasSel().filter(function (c) { return !Doc.buscar(E.pagina().capas, c.id).padre && c.tipo !== 'ajuste'; });
    if (!cs.length) return null;
    if (cs.length === 1) { var c = cs[0]; return { multi: false, capa: c, x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot, fx: c.flipX, fy: c.flipY, capas: cs }; }
    var u = Geo.unir(cs.map(Doc.caja)); return { multi: true, x: u.x + u.w / 2, y: u.y + u.h / 2, w: u.w, h: u.h, rot: 0, fx: false, fy: false, capas: cs };
  };
  V.manijas = function (b, tactil) {
    var m = Matriz.componer(b.x, b.y, b.rot, b.fx ? -1 : 1, b.fy ? -1 : 1), k = E.vista.k, out = [], hw = b.w / 2, hh = b.h / 2;
    [['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1], ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0]].forEach(function (a) {
      var q = Matriz.punto(m, a[1] * hw, a[2] * hh), s = V.aPantalla(q.x, q.y); out.push({ id: a[0], sx: a[1], sy: a[2], x: s.x, y: s.y });
    });
    var off = (tactil ? 40 : 28) / k, q2 = Matriz.punto(m, 0, -hh - off * (b.fy ? -1 : 1)), s2 = V.aPantalla(q2.x, q2.y); out.push({ id: 'rot', x: s2.x, y: s2.y });
    return out;
  };
  function overlay() {
    var p = E.pagina(); if (!p) return;
    var d = devicePixelRatio || 1, v = E.vista, k = v.k, c = octx;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, V.ov.width, V.ov.height);
    var ej = E.proy.ajustes, acento = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#6366f1';
    c.lineWidth = 1; c.strokeStyle = 'rgba(128,128,128,.55)'; c.strokeRect(v.x + .5, v.y + .5, p.w * k, p.h * k);
    if (ej.cuadricula) {
      var paso = ej.paso || 20; if (paso * k >= 6) {
        c.beginPath(); c.strokeStyle = 'rgba(99,102,241,.22)';
        for (var gx = 0; gx <= p.w; gx += paso) { c.moveTo(Math.round(v.x + gx * k) + .5, v.y); c.lineTo(Math.round(v.x + gx * k) + .5, v.y + p.h * k); }
        for (var gy = 0; gy <= p.h; gy += paso) { c.moveTo(v.x, Math.round(v.y + gy * k) + .5); c.lineTo(v.x + p.w * k, Math.round(v.y + gy * k) + .5); }
        c.stroke();
      }
    }
    if (ej.seguro) zonaSegura(c, p, ej.seguro);
    if (E.seleccionPx && E.seleccionPx.vista) selPx(c);
    // guias de usuario
    c.lineWidth = 1; c.strokeStyle = '#06b6d4';
    (p.guias || []).concat(V.guiaNueva ? [V.guiaNueva] : []).forEach(function (g) {
      c.beginPath();
      if (g.eje === 'x') { var sx = Math.round(v.x + g.pos * k) + .5; c.moveTo(sx, 0); c.lineTo(sx, V.ov.height / d); } else { var sy = Math.round(v.y + g.pos * k) + .5; c.moveTo(0, sy); c.lineTo(V.ov.width / d, sy); }
      c.stroke();
    });
    if (V.guiasTemp) {
      c.strokeStyle = '#ec4899'; c.setLineDash([4, 3]);
      V.guiasTemp.x.forEach(function (gx) { var sx = Math.round(v.x + gx * k) + .5; c.beginPath(); c.moveTo(sx, v.y - 6); c.lineTo(sx, v.y + p.h * k + 6); c.stroke(); });
      V.guiasTemp.y.forEach(function (gy) { var sy = Math.round(v.y + gy * k) + .5; c.beginPath(); c.moveTo(v.x - 6, sy); c.lineTo(v.x + p.w * k + 6, sy); c.stroke(); });
      c.setLineDash([]);
    }
    if (E.herr === 'recorte' && V.recorte) recorteOv(c, p, acento);
    else seleccion(c, p, acento);

    if (V.cursor && V.cursor.ver && /pincel|borrador|lapiz/.test(E.herr)) cursorPincel(c);
    if (V.perspectiva) perspOv(c, acento);
    if (V.marquee) { var mq = V.marquee; c.fillStyle = 'rgba(99,102,241,.12)'; c.strokeStyle = acento; c.lineWidth = 1; c.fillRect(mq.x0, mq.y0, mq.x1 - mq.x0, mq.y1 - mq.y0); c.strokeRect(mq.x0 + .5, mq.y0 + .5, mq.x1 - mq.x0, mq.y1 - mq.y0); }
  }
  function seleccion(c, p, acento) {
    var cajas = E.capasSel();
    c.lineWidth = 1; c.strokeStyle = acento;
    cajas.forEach(function (q) {
      if (q.tipo === 'ajuste') return;
      var r = Doc.buscar(p.capas, q.id), m = Doc.matriz(q); if (r && r.padre) { var pm = Doc.matriz(r.padre); m = Matriz.mul(pm, m); }
      var es = Matriz.esquinas(m, q.w, q.h).map(function (pt) { return V.aPantalla(pt.x, pt.y); });
      c.beginPath(); c.moveTo(es[0].x, es[0].y); for (var i = 1; i < 4; i++) c.lineTo(es[i].x, es[i].y); c.closePath(); c.stroke();
    });
    var b = V.cajaSel(); if (!b || E.herr === 'mano' || (b.capa && b.capa.bloqueada)) return;
    if (E.herr === 'pincel' || E.herr === 'borrador' || E.herr === 'lapiz') return;
    var hs = V.manijas(b, V.tactil), sz = V.tactil ? 7 : 5;
    var rot = hs[hs.length - 1], n = hs[1]; c.beginPath(); c.moveTo(n.x, n.y); c.lineTo(rot.x, rot.y); c.stroke();
    hs.forEach(function (h) {
      c.beginPath(); if (h.id === 'rot') c.arc(h.x, h.y, sz, 0, 7); else c.rect(h.x - sz, h.y - sz, sz * 2, sz * 2);
      c.fillStyle = '#fff'; c.fill(); c.strokeStyle = acento; c.lineWidth = 1.5; c.stroke();
    });
    if (b.multi) { var es2 = Matriz.esquinas(Matriz.componer(b.x, b.y, 0, 1, 1), b.w, b.h).map(function (pt) { return V.aPantalla(pt.x, pt.y); }); c.setLineDash([5, 4]); c.beginPath(); c.moveTo(es2[0].x, es2[0].y); for (var j = 1; j < 4; j++) c.lineTo(es2[j].x, es2[j].y); c.closePath(); c.stroke(); c.setLineDash([]); }
  }
  function recorteOv(c, p, acento) {
    var r = V.recorte, a = V.aPantalla(r.x, r.y), b = V.aPantalla(r.x + r.w, r.y + r.h), W = V.ov.width / (devicePixelRatio || 1), H = V.ov.height / (devicePixelRatio || 1);
    c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.rect(0, 0, W, H); c.rect(a.x, a.y, b.x - a.x, b.y - a.y); c.fill('evenodd');
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath();
    for (var i = 1; i < 3; i++) { c.moveTo(a.x + (b.x - a.x) * i / 3, a.y); c.lineTo(a.x + (b.x - a.x) * i / 3, b.y); c.moveTo(a.x, a.y + (b.y - a.y) * i / 3); c.lineTo(b.x, a.y + (b.y - a.y) * i / 3); }
    c.stroke();
    V.manijasRecorte().forEach(function (h) { c.fillStyle = '#fff'; c.strokeStyle = acento; c.lineWidth = 1.5; c.beginPath(); c.rect(h.x - 6, h.y - 6, 12, 12); c.fill(); c.stroke(); });
  }
  V.manijasRecorte = function () {
    var r = V.recorte, out = [];
    [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]].forEach(function (a) { var q = V.aPantalla(r.x + r.w * a[1], r.y + r.h * a[2]); out.push({ id: a[0], x: q.x, y: q.y }); });
    return out;
  };
  function perspOv(c, acento) {
    var q = V.perspectiva.pts.map(function (pt) { return V.aPantalla(pt.x, pt.y); });
    c.strokeStyle = '#f59e0b'; c.lineWidth = 2; c.beginPath(); c.moveTo(q[0].x, q[0].y); for (var i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath(); c.stroke();
    q.forEach(function (pt) { c.fillStyle = '#fff'; c.beginPath(); c.arc(pt.x, pt.y, 8, 0, 7); c.fill(); c.stroke(); });
  }
  function cursorPincel(c) {
    var q = V.cursor, r = Math.max(2, E.pincel.tam * E.vista.k / 2);
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.stroke();
  }
  function selPx(c) {
    var s = E.seleccionPx, capa = E.capaPorId(s.id); if (!capa) return; var m = Doc.matriz(capa), k = E.vista.k;
    c.save(); c.translate(E.vista.x, E.vista.y); c.scale(k, k); c.transform(m[0], m[1], m[2], m[3], m[4], m[5]); c.globalAlpha = 0.55; c.drawImage(s.vista, -capa.w / 2, -capa.h / 2, capa.w, capa.h); c.restore();
  }
  function zonaSegura(c, p, id) {
    var r = Redes.buscar(id); if (!r || !r.seguro) return; var v = E.vista, k = v.k;
    r.seguro.forEach(function (z) {
      var x = v.x + z.x * p.w * k, y = v.y + z.y * p.h * k, w = z.w * p.w * k, h = z.h * p.h * k;
      if (z.inv) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.rect(v.x, v.y, p.w * k, p.h * k); c.rect(x, y, w, h); c.fill('evenodd'); c.strokeStyle = '#22c55e'; c.setLineDash([6, 4]); c.strokeRect(x, y, w, h); c.setLineDash([]); c.fillStyle = '#22c55e'; c.font = '11px sans-serif'; c.fillText(z.n, x + 4, y + 13); }
      else { c.fillStyle = 'rgba(239,68,68,.28)'; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(239,68,68,.9)'; c.setLineDash([4, 3]); c.strokeRect(x, y, w, h); c.setLineDash([]); c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.fillText(z.n, x + 4, y + 13); }
    });
  }
  function reglas() {
    if (!E.proy.ajustes.reglas) { V.rh.style.display = V.rv.style.display = 'none'; return; }
    V.rh.style.display = V.rv.style.display = 'block';
    var d = devicePixelRatio || 1, v = E.vista, k = v.k, st = getComputedStyle(document.documentElement);
    var fondo = st.getPropertyValue('--panel').trim() || '#f4f4f6', tinta = st.getPropertyValue('--tinta2').trim() || '#666';
    var paso = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].filter(function (s) { return s * k >= 50; })[0] || 2000, sub = paso / 5;
    function dib(cv, horiz) {
      var c = cv.getContext('2d'), L = horiz ? cv.width / d : cv.height / d;
      c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.fillStyle = fondo; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = tinta; c.fillStyle = tinta; c.font = '9px sans-serif'; c.lineWidth = 1;
      var off = horiz ? v.x : v.y, ini = Math.floor(-off / k / sub) * sub, fin = (L - off) / k;
      c.beginPath();
      for (var t = ini; t <= fin; t += sub) {
        var pos = Math.round(off + t * k) + .5, mayor = Math.abs(t % paso) < 1e-6;
        if (horiz) { c.moveTo(pos, V.REG); c.lineTo(pos, mayor ? 4 : V.REG - 6); if (mayor) c.fillText(String(Math.round(t)), pos + 2, 10); }
        else { c.moveTo(V.REG, pos); c.lineTo(mayor ? 4 : V.REG - 6, pos); if (mayor) { c.save(); c.translate(10, pos - 2); c.rotate(-Math.PI / 2); c.fillText(String(Math.round(t)), 0, 0); c.restore(); } }
      }
      c.stroke();
    }
    dib(V.rh, true); dib(V.rv, false);
  }
  function iniciarGuia(e, eje) {
    e.preventDefault(); var p = E.pagina(); V.guiaNueva = { eje: eje, pos: 0 };
    function mov(ev) { var q = V.aDoc(ev.clientX, ev.clientY); V.guiaNueva.pos = Math.round(eje === 'x' ? q.x : q.y); V.pedirOv(); }
    function fin(ev) {
      document.removeEventListener('pointermove', mov); document.removeEventListener('pointerup', fin);
      var g = V.guiaNueva; V.guiaNueva = null;
      if (g.pos > 0 && g.pos < (eje === 'x' ? p.w : p.h)) { p.guias.push(g); E.cambio('Añadir guía'); } V.pedirOv();
    }
    document.addEventListener('pointermove', mov); document.addEventListener('pointerup', fin); mov(e);
  }
  /* miniatura de la pagina actual */
  V.miniatura = function (pagina, max) {
    var k = Math.min(1, max / Math.max(pagina.w, pagina.h)), c = R.aCanvas(pagina, k, { rapido: true });
    return c;
  };
})(window.IM);
