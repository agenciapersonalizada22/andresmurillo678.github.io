/* Pestana Espacio: modelador de plano asistido (paredes con medidas, aberturas, mobiliario, extrusion 3D) y medidas por foto con objeto de referencia. window.R3D.VPlano */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, R = g.R3D, A = R.App, P = R.Plano, V = R.VPlano = {};
  var el = {}, vista = { s: 90, ox: 40, oy: 40 }, herr = 'pared', inicio = null, primero = null, cursor = null, sel = null, deshacer = [], rehacer = [];
  function M() { if (!A.plano) A.plano = P.nuevo(); return A.plano; }
  function guardarEstado() { deshacer.push(JSON.stringify(M())); if (deshacer.length > 60) deshacer.shift(); rehacer = []; }
  function aplicarEstado(js) { A.plano = JSON.parse(js); sel = null; formSel(); dibujar(); stats(); }
  function undo() { if (!deshacer.length) return; rehacer.push(JSON.stringify(M())); aplicarEstado(deshacer.pop()); }
  function redo() { if (!rehacer.length) return; deshacer.push(JSON.stringify(M())); aplicarEstado(rehacer.pop()); }
  function pasoSnap() { return +el.paso.value; }
  function aMundo(sx, sy) { return [(sx - vista.ox) / vista.s, (sy - vista.oy) / vista.s]; }
  function aPantalla(p) { return [vista.ox + p[0] * vista.s, vista.oy + p[1] * vista.s]; }
  function ajustar(p, ancla) {
    var m = M(), c = P.puntoCercano(m, p, 14 / vista.s); if (c) return c.slice();
    if (ancla && el.angulo.checked) { p = P.snapAngulo(ancla, p, 15); }
    var s = pasoSnap(); return [P.redondear(p[0], s), P.redondear(p[1], s)];
  }
  function cv() { return el.cv; }
  function colores() { var s = getComputedStyle(document.documentElement); return { txt: s.getPropertyValue('--txt').trim() || '#222', suave: s.getPropertyValue('--suave').trim() || '#666', acento: s.getPropertyValue('--acento').trim() || '#3e63dd', borde: s.getPropertyValue('--borde').trim() || '#ccc', panel: s.getPropertyValue('--panel').trim() || '#fff', panel2: s.getPropertyValue('--panel2').trim() || '#eef' }; }
  function dibujar() {
    var c = el.cv, dpr = Math.min(2, g.devicePixelRatio || 1), w = c.clientWidth, hh = c.clientHeight; if (!w) return; if (c.width !== Math.round(w * dpr) || c.height !== Math.round(hh * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr); }
    var x = c.getContext('2d'), k = colores(), m = M(); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, hh);
    // rejilla
    var paso = vista.s >= 60 ? 0.5 : vista.s >= 30 ? 1 : 5, x0 = Math.floor(aMundo(0, 0)[0] / paso) * paso, y0 = Math.floor(aMundo(0, 0)[1] / paso) * paso, x1 = aMundo(w, hh)[0], y1 = aMundo(w, hh)[1];
    x.lineWidth = 1; for (var gx = x0; gx <= x1; gx += paso) { var sx = aPantalla([gx, 0])[0]; x.strokeStyle = Math.abs(gx % 1) < 1e-9 ? k.borde : k.panel2; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, hh); x.stroke(); } for (var gy = y0; gy <= y1; gy += paso) { var sy = aPantalla([0, gy])[1]; x.strokeStyle = Math.abs(gy % 1) < 1e-9 ? k.borde : k.panel2; x.beginPath(); x.moveTo(0, sy); x.lineTo(w, sy); x.stroke(); }
    x.fillStyle = k.suave; x.font = '11px system-ui'; for (var lx = Math.ceil(x0); lx <= x1; lx += (paso < 1 ? 1 : paso)) x.fillText(lx + ' m', aPantalla([lx, 0])[0] + 2, 11);
    // habitacion
    var hab = P.habitacion(m); if (hab) { x.beginPath(); hab.forEach(function (p, i) { var q = aPantalla(p); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.closePath(); x.fillStyle = 'rgba(95,140,255,.10)'; x.fill(); var cen = hab.reduce(function (a, p) { return [a[0] + p[0] / hab.length, a[1] + p[1] / hab.length]; }, [0, 0]), q = aPantalla(cen); x.fillStyle = k.acento; x.font = 'bold 14px system-ui'; x.textAlign = 'center'; x.fillText(P.area(hab).toFixed(2) + ' m²', q[0], q[1]); x.textAlign = 'left'; }
    // paredes
    m.paredes.forEach(function (p) {
      var a = aPantalla(p.a), b = aPantalla(p.b), t = Math.max(3, (p.grosor || m.grosor) * vista.s), esSel = sel && sel.tipo === 'pared' && sel.id === p.id; x.lineCap = 'square'; x.strokeStyle = esSel ? '#f08c00' : k.txt; x.lineWidth = t; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      var L = P.longitud(p), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ang = Math.atan2(b[1] - a[1], b[0] - a[0]); x.save(); x.translate(mx, my); x.rotate(ang > Math.PI / 2 || ang < -Math.PI / 2 ? ang + Math.PI : ang); x.fillStyle = k.panel; x.font = '12px system-ui'; var tx = L.toFixed(2) + ' m', tw = x.measureText(tx).width + 8; x.globalAlpha = 0.85; x.fillRect(-tw / 2, -t / 2 - 17, tw, 15); x.globalAlpha = 1; x.fillStyle = k.txt; x.textAlign = 'center'; x.fillText(tx, 0, -t / 2 - 5); x.restore();
      m.aberturas.filter(function (o) { return o.pared === p.id; }).forEach(function (o) {
        var Lp = L || 1, ux = (p.b[0] - p.a[0]) / Lp, uy = (p.b[1] - p.a[1]) / Lp, s0 = aPantalla([p.a[0] + ux * (o.pos - o.ancho / 2), p.a[1] + uy * (o.pos - o.ancho / 2)]), s1 = aPantalla([p.a[0] + ux * (o.pos + o.ancho / 2), p.a[1] + uy * (o.pos + o.ancho / 2)]), so = sel && sel.tipo === 'abertura' && sel.id === o.id;
        x.lineCap = 'butt'; x.strokeStyle = k.panel; x.lineWidth = t + 2; x.beginPath(); x.moveTo(s0[0], s0[1]); x.lineTo(s1[0], s1[1]); x.stroke(); x.strokeStyle = so ? '#f08c00' : (o.tipo === 'puerta' ? '#2f9e44' : '#228be6'); x.lineWidth = o.tipo === 'puerta' ? 3 : t / 2; x.beginPath(); x.moveTo(s0[0], s0[1]); x.lineTo(s1[0], s1[1]); x.stroke();
        if (o.tipo === 'puerta') { x.lineWidth = 1.5; x.beginPath(); x.arc(s0[0], s0[1], o.ancho * vista.s, ang, ang + Math.PI / 2); x.stroke(); }
      });
    });
    // muebles
    m.muebles.forEach(function (q) { var c0 = aPantalla([q.x, q.y]), esSel = sel && sel.tipo === 'mueble' && sel.id === q.id; x.save(); x.translate(c0[0], c0[1]); x.rotate((q.rot || 0) * Math.PI / 180); x.fillStyle = 'rgba(240,160,40,.25)'; x.strokeStyle = esSel ? '#f08c00' : '#d9822b'; x.lineWidth = esSel ? 3 : 1.5; x.fillRect(-q.w * vista.s / 2, -q.d * vista.s / 2, q.w * vista.s, q.d * vista.s); x.strokeRect(-q.w * vista.s / 2, -q.d * vista.s / 2, q.w * vista.s, q.d * vista.s); x.fillStyle = k.txt; x.font = '11px system-ui'; x.textAlign = 'center'; x.fillText(q.nombre, 0, 4); x.restore(); });
    // vista previa de la pared en curso
    if (inicio) { var a2 = aPantalla(inicio); x.fillStyle = k.acento; x.beginPath(); x.arc(a2[0], a2[1], 5, 0, 7); x.fill(); if (cursor) { var b2 = aPantalla(cursor); x.strokeStyle = k.acento; x.lineWidth = 3; x.setLineDash([6, 4]); x.beginPath(); x.moveTo(a2[0], a2[1]); x.lineTo(b2[0], b2[1]); x.stroke(); x.setLineDash([]); var L2 = Math.hypot(cursor[0] - inicio[0], cursor[1] - inicio[1]); x.fillStyle = k.acento; x.font = 'bold 13px system-ui'; x.fillText(L2.toFixed(2) + ' m · ' + ((Math.atan2(cursor[1] - inicio[1], cursor[0] - inicio[0]) * 180 / Math.PI + 360) % 360).toFixed(0) + '°', b2[0] + 8, b2[1] - 8); } }
    else if (cursor && herr === 'pared') { var c3 = aPantalla(cursor); x.strokeStyle = k.acento; x.lineWidth = 2; x.beginPath(); x.arc(c3[0], c3[1], 6, 0, 7); x.stroke(); }
  }
  function golpe(p) { // elemento bajo el punto mundo
    var m = M(), tol = 12 / vista.s, r;
    r = m.aberturas.filter(function (o) { var w = m.paredes.filter(function (q) { return q.id === o.pared; })[0]; if (!w) return false; var L = P.longitud(w) || 1, ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, c = [w.a[0] + ux * o.pos, w.a[1] + uy * o.pos]; return Math.hypot(c[0] - p[0], c[1] - p[1]) <= Math.max(tol, o.ancho / 2); })[0]; if (r) return { tipo: 'abertura', id: r.id };
    r = m.muebles.filter(function (q) { var cs = Math.cos(-(q.rot || 0) * Math.PI / 180), sn = Math.sin(-(q.rot || 0) * Math.PI / 180), dx = p[0] - q.x, dy = p[1] - q.y, lx = dx * cs - dy * sn, ly = dx * sn + dy * cs; return Math.abs(lx) <= q.w / 2 && Math.abs(ly) <= q.d / 2; })[0]; if (r) return { tipo: 'mueble', id: r.id };
    var sp = P.sobrePared(m, p, Math.max(tol, (m.grosor) / 2)); if (sp) return { tipo: 'pared', id: sp.pared.id };
    return null;
  }
  function elemento() { var m = M(); if (!sel) return null; return (sel.tipo === 'pared' ? m.paredes : sel.tipo === 'abertura' ? m.aberturas : m.muebles).filter(function (o) { return o.id === sel.id; })[0]; }
  function toque(sx, sy) {
    var m = M(), p = aMundo(sx, sy), q;
    if (herr === 'pared') {
      q = ajustar(p, inicio); if (!inicio) { inicio = q; primero = q.slice(); cursor = q; } else { if (Math.hypot(q[0] - inicio[0], q[1] - inicio[1]) < 0.02) { return; } guardarEstado(); m.paredes.push({ id: P.id('p'), a: inicio.slice(), b: q.slice() }); inicio = q; cursor = q; if (primero && Math.hypot(q[0] - primero[0], q[1] - primero[1]) < 0.02) inicio = null; A.logro('r3d_plano_pared'); stats(); }
    } else if (herr === 'puerta' || herr === 'ventana') {
      var sp = P.sobrePared(m, p, 0.35); if (!sp) { T.aviso('Toca sobre una pared para colocar la ' + herr + '.', 'error'); return; } var d = P.ABERTURAS[herr], L = P.longitud(sp.pared), pos = Math.max(d.ancho / 2, Math.min(L - d.ancho / 2, P.redondear(sp.pos, 0.05)));
      guardarEstado(); var o = { id: P.id('a'), pared: sp.pared.id, tipo: herr, pos: pos, ancho: d.ancho, alto: d.alto, antepecho: d.antepecho }; m.aberturas.push(o); sel = { tipo: 'abertura', id: o.id }; formSel(); stats();
    } else if (herr === 'mueble') {
      var pre = P.MUEBLES[+el.selMueble.value]; guardarEstado(); var mu = { id: P.id('m'), nombre: pre.nombre, x: P.redondear(p[0], 0.05), y: P.redondear(p[1], 0.05), w: pre.w, d: pre.d, h: pre.h, rot: 0 }; m.muebles.push(mu); sel = { tipo: 'mueble', id: mu.id }; formSel(); stats();
    } else if (herr === 'sel') { sel = golpe(p); formSel(); }
    else if (herr === 'borrar') { var gh = golpe(p); if (!gh) return; guardarEstado(); if (gh.tipo === 'pared') { m.paredes = m.paredes.filter(function (w) { return w.id !== gh.id; }); m.aberturas = m.aberturas.filter(function (o) { return o.pared !== gh.id; }); } else if (gh.tipo === 'abertura') m.aberturas = m.aberturas.filter(function (o) { return o.id !== gh.id; }); else m.muebles = m.muebles.filter(function (o) { return o.id !== gh.id; }); sel = null; formSel(); stats(); }
    dibujar();
  }
  function eventos() {
    var c = el.cv, ptr = new Map(), multi = false, d0 = 0, arr = null;
    c.addEventListener('pointerdown', function (e) { c.setPointerCapture(e.pointerId); var r = c.getBoundingClientRect(); ptr.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top, x0: e.clientX - r.left, y0: e.clientY - r.top, t0: performance.now() }); if (ptr.size === 2) { multi = true; var a = Array.from(ptr.values()); d0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } else multi = false;
      if (ptr.size === 1 && herr === 'sel') { var p = aMundo(ptr.get(e.pointerId).x, ptr.get(e.pointerId).y), gh = golpe(p); if (gh && gh.tipo === 'mueble') { arr = { id: gh.id, snap: false }; } } });
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, p = ptr.get(e.pointerId);
      if (!p) { if (herr === 'pared') { cursor = ajustar(aMundo(x, y), inicio); dibujar(); } return; }
      var dx = x - p.x, dy = y - p.y; p.x = x; p.y = y;
      if (ptr.size === 2) { var a = Array.from(ptr.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2, k = d / d0, ns = Math.max(12, Math.min(600, vista.s * k)); vista.ox = cx - (cx - vista.ox) * ns / vista.s + dx / 2; vista.oy = cy - (cy - vista.oy) * ns / vista.s + dy / 2; vista.s = ns; d0 = d; dibujar(); return; }
      if (herr === 'mover' || (Math.hypot(x - p.x0, y - p.y0) > 6 && herr !== 'pared' && herr !== 'sel' && false)) { vista.ox += dx; vista.oy += dy; dibujar(); return; }
      if (herr === 'sel' && arr) { var mu = M().muebles.filter(function (q) { return q.id === arr.id; })[0]; if (mu && Math.hypot(x - p.x0, y - p.y0) > 4) { if (!arr.snap) { guardarEstado(); arr.snap = true; } var w = aMundo(x, y); mu.x = P.redondear(w[0], 0.05); mu.y = P.redondear(w[1], 0.05); sel = { tipo: 'mueble', id: mu.id }; formSel(); dibujar(); } return; }
      if (herr === 'pared') { cursor = ajustar(aMundo(x, y), inicio); dibujar(); }
      else if (Math.hypot(x - p.x0, y - p.y0) > 10 && herr !== 'mueble') { vista.ox += dx; vista.oy += dy; dibujar(); }
    });
    function fin(e) { var p = ptr.get(e.pointerId); ptr.delete(e.pointerId); if (!p) return; var mv = Math.hypot(p.x - p.x0, p.y - p.y0); if (!multi && mv < 8 && performance.now() - p.t0 < 600 && e.type === 'pointerup') { if (herr === 'pared') cursor = ajustar(aMundo(p.x, p.y), inicio); toque(p.x, p.y); } if (arr && arr.snap) stats(); arr = null; if (!ptr.size) multi = false; }
    c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin);
    c.addEventListener('wheel', function (e) { e.preventDefault(); var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, ns = Math.max(12, Math.min(600, vista.s * Math.exp(-e.deltaY * 0.0015))); vista.ox = x - (x - vista.ox) * ns / vista.s; vista.oy = y - (y - vista.oy) * ns / vista.s; vista.s = ns; dibujar(); }, { passive: false });
    c.addEventListener('keydown', function (e) { if (e.key === 'Escape') { inicio = null; dibujar(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } else if (e.key === 'Delete' && sel) { guardarEstado(); var m = M(); if (sel.tipo === 'pared') { m.paredes = m.paredes.filter(function (w) { return w.id !== sel.id; }); m.aberturas = m.aberturas.filter(function (o) { return o.pared !== sel.id; }); } else if (sel.tipo === 'abertura') m.aberturas = m.aberturas.filter(function (o) { return o.id !== sel.id; }); else m.muebles = m.muebles.filter(function (o) { return o.id !== sel.id; }); sel = null; formSel(); stats(); dibujar(); } });
  }
  function ponerHerr(n) { herr = n; if (n !== 'pared') { inicio = null; } Array.prototype.forEach.call(el.herr.querySelectorAll('button[data-h]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-h') === n); }); el.selMuebleFila.hidden = n !== 'mueble'; el.ayudaHerr.textContent = { pared: 'Toca el punto de inicio y luego cada esquina; las medidas se muestran en vivo. Con «Longitud exacta» fijas la medida a mano. Toca el primer punto otra vez o usa «Cerrar» para completar la habitación.', puerta: 'Toca sobre una pared para colocar una puerta; luego edita sus medidas.', ventana: 'Toca sobre una pared para colocar una ventana.', mueble: 'Elige el mueble y toca dónde va; arrástralo con «Elegir».', sel: 'Toca un elemento para editar sus medidas. Arrastra un mueble para moverlo.', borrar: 'Toca un elemento para borrarlo.', mover: 'Arrastra para desplazar la vista; pellizca para acercar.' }[n]; dibujar(); }
  function cerrar() { var m = M(); if (!inicio || !primero) { T.aviso('Empieza una cadena de paredes primero.', 'error'); return; } if (Math.hypot(inicio[0] - primero[0], inicio[1] - primero[1]) > 0.02) { guardarEstado(); m.paredes.push({ id: P.id('p'), a: inicio.slice(), b: primero.slice() }); } inicio = null; stats(); dibujar(); }
  function longitudExacta() {
    var L = +el.lonExacta.value; if (!(L > 0)) { T.aviso('Escribe una longitud en metros.', 'error'); return; } if (!inicio) { T.aviso('Toca primero el punto de inicio.', 'error'); return; }
    var dir = cursor ? P.snapAngulo(inicio, cursor, el.angulo.checked ? 15 : 1) : [inicio[0] + 1, inicio[1]], ang = Math.atan2(dir[1] - inicio[1], dir[0] - inicio[0]) * 180 / Math.PI, fin = P.puntoPolar(inicio, L, ang); fin = [Math.round(fin[0] * 1000) / 1000, Math.round(fin[1] * 1000) / 1000];
    guardarEstado(); M().paredes.push({ id: P.id('p'), a: inicio.slice(), b: fin }); inicio = fin; cursor = fin; stats(); dibujar();
  }
  function rapido() { var w = +el.rw.value, d = +el.rd.value; if (!(w > 0 && d > 0)) return; guardarEstado(); var m = M(); P.rectangulo(m, w, d, 0, 0); fitVista(); stats(); dibujar(); A.logro('r3d_plano_pared'); }
  function fitVista() { var m = M(), pts = []; m.paredes.forEach(function (w) { pts.push(w.a, w.b); }); if (!pts.length) return; var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; }), w = el.cv.clientWidth, hh = el.cv.clientHeight, bw = Math.max(1, Math.max.apply(null, xs) - Math.min.apply(null, xs)), bh = Math.max(1, Math.max.apply(null, ys) - Math.min.apply(null, ys)); vista.s = Math.max(12, Math.min(200, Math.min((w - 80) / bw, (hh - 80) / bh))); vista.ox = (w - bw * vista.s) / 2 - Math.min.apply(null, xs) * vista.s; vista.oy = (hh - bh * vista.s) / 2 - Math.min.apply(null, ys) * vista.s; }
  function campo(etq, val, alCambiar, extra) { var i = h('input', Object.assign({ type: 'number', step: 0.01, value: val, inputmode: 'decimal' }, extra || {})); i.addEventListener('change', function () { var v = +i.value; if (isFinite(v)) { guardarEstado(); alCambiar(v); stats(); dibujar(); } }); return h('div', {}, [h('label', { txt: etq }), i]); }
  function formSel() {
    var f = el.form; f.textContent = ''; var o = elemento(), m = M(); if (!o) { f.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Nada seleccionado. Usa «Elegir» y toca un elemento.' })); return; }
    if (sel.tipo === 'pared') {
      f.appendChild(h('h3', { txt: 'Pared' })); f.appendChild(h('div', { cls: 'tr-fila' }, [campo('Longitud (m)', P.longitud(o).toFixed(3), function (v) { var L = P.longitud(o) || 1, ux = (o.b[0] - o.a[0]) / L, uy = (o.b[1] - o.a[1]) / L; o.b = [o.a[0] + ux * v, o.a[1] + uy * v]; }, { min: 0.05 }), campo('Grosor (m)', o.grosor || m.grosor, function (v) { o.grosor = v; }, { min: 0.02 }), campo('Altura (m)', o.alto || m.alto, function (v) { o.alto = v; }, { min: 0.5 })]));
    } else if (sel.tipo === 'abertura') {
      f.appendChild(h('h3', { txt: o.tipo === 'puerta' ? 'Puerta' : 'Ventana' })); f.appendChild(h('div', { cls: 'tr-fila' }, [campo('Posición en la pared (m)', o.pos, function (v) { o.pos = v; }), campo('Ancho (m)', o.ancho, function (v) { o.ancho = v; }, { min: 0.2 }), campo('Alto (m)', o.alto, function (v) { o.alto = v; }, { min: 0.2 }), campo('Antepecho (m)', o.antepecho, function (v) { o.antepecho = v; }, { min: 0 })]));
    } else {
      f.appendChild(h('h3', { txt: o.nombre })); f.appendChild(h('div', { cls: 'tr-fila' }, [campo('Ancho (m)', o.w, function (v) { o.w = v; }, { min: 0.1 }), campo('Fondo (m)', o.d, function (v) { o.d = v; }, { min: 0.1 }), campo('Alto (m)', o.h, function (v) { o.h = v; }, { min: 0.05 }), campo('Giro (°)', o.rot || 0, function (v) { o.rot = v; }, { step: 5 })]));
    }
    f.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-peli tr-chico', txt: 'Borrar elemento', on: { click: function () { ponerHerrBorrar(); } } })]));
  }
  function ponerHerrBorrar() { var m = M(); guardarEstado(); if (sel.tipo === 'pared') { m.paredes = m.paredes.filter(function (w) { return w.id !== sel.id; }); m.aberturas = m.aberturas.filter(function (o) { return o.pared !== sel.id; }); } else if (sel.tipo === 'abertura') m.aberturas = m.aberturas.filter(function (o) { return o.id !== sel.id; }); else m.muebles = m.muebles.filter(function (o) { return o.id !== sel.id; }); sel = null; formSel(); stats(); dibujar(); }
  function stats() {
    var m = M(), e = P.estadisticas(m); function f(v, d) { return A.fmt(v, d == null ? 2 : d); }
    el.stats.textContent = ''; [['Área', e.cerrada ? f(e.area) + ' m²' : '—'], ['Perímetro', e.cerrada ? f(e.perimetro) + ' m' : '—'], ['Volumen', e.cerrada ? f(e.volumen) + ' m³' : '—'], ['Paredes', f(e.longitudParedes) + ' m'], ['Superficie de muros', f(e.areaParedes) + ' m²'], ['Puertas / ventanas', e.puertas + ' / ' + e.ventanas], ['Muebles', e.muebles + ' · ' + f(e.huellaMuebles) + ' m²'], ['Suelo libre', e.cerrada ? f(e.areaLibre) + ' m²' : '—']].forEach(function (s) { el.stats.appendChild(h('div', { cls: 'r3d-stat' }, [h('span', { txt: s[0] }), h('b', { txt: s[1] })])); });
    el.estadoCierre.textContent = e.cerrada ? 'Habitación cerrada: se calculan área y volumen.' : (m.paredes.length ? 'Las paredes no forman un contorno cerrado: cierra la habitación para ver área y volumen y para generar suelo y techo.' : 'Aún no hay paredes.');
    A.emitir('plano');
  }
  function generar3D() {
    var m = M(); if (!m.paredes.length) { T.aviso('Dibuja al menos una pared.', 'error'); return; } m.alto = +el.alto.value || 2.5; m.grosor = +el.grosor.value || 0.12; m.techo = el.techo.checked; m.suelo = el.suelo.checked;
    var malla = P.extruir(m); malla.nombre = 'Plano 3D'; var viejo = A.capas.filter(function (c) { return c.origen === 'plano'; })[0]; if (viejo) A.quitarCapa(viejo.id);
    var c = A.anadirCapa(malla, { nombre: 'Plano 3D', origen: 'plano', unidad: { nombre: 'm', k: 1 }, forzarUnidad: true }); if (c) { A.logro('r3d_plano_3d'); A.irA('visor'); }
  }

  /* =============== foto con referencia =============== */
  var F = { img: null, pts: [], modo: 'plano', fase: 'ref', H: null, esc: 0, med: [], medPts: [], tipoMed: 'dist' };
  function fotoDibujar() {
    var c = el.cf, x = c.getContext('2d'); if (!F.img) { x.clearRect(0, 0, c.width, c.height); return; } x.drawImage(F.img, 0, 0); var r = Math.max(4, c.width / 140); x.lineWidth = Math.max(2, c.width / 400); x.font = 'bold ' + Math.round(r * 3) + 'px system-ui';
    function marca(p, col, t) { x.fillStyle = col; x.strokeStyle = '#fff'; x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.fill(); x.stroke(); if (t) { x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeText(t, p[0] + r + 2, p[1] - r); x.fillText(t, p[0] + r + 2, p[1] - r); x.lineWidth = Math.max(2, c.width / 400); } }
    if (F.pts.length > 1) { x.strokeStyle = '#ffd43b'; x.beginPath(); F.pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); if (F.modo === 'plano' && F.pts.length === 4) x.closePath(); x.stroke(); }
    F.pts.forEach(function (p, i) { marca(p, '#ffd43b', 'R' + (i + 1)); });
    F.med.forEach(function (m) { x.strokeStyle = '#69db7c'; x.beginPath(); m.pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); if (m.tipo === 'area') x.closePath(); x.stroke(); m.pts.forEach(function (p) { marca(p, '#2f9e44'); }); marca(m.pts[0], '#2f9e44', m.txt); });
    F.medPts.forEach(function (p) { marca(p, '#ffffff'); });
  }
  function fotoEstado() {
    var t = !F.img ? 'Carga una foto donde aparezca un objeto de medidas conocidas (hoja A4, tarjeta, puerta…) en el mismo plano que lo que quieres medir.' : F.fase === 'ref' ? (F.modo === 'plano' ? 'Toca las 4 esquinas del objeto de referencia: arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda (' + F.pts.length + '/4).' : 'Toca los 2 extremos del largo conocido (' + F.pts.length + '/2).') : 'Referencia lista. Elige qué medir y toca los puntos' + (F.tipoMed === 'area' ? ' (mínimo 3), luego «Cerrar área».' : ' (' + F.medPts.length + '/2).');
    el.fEstado.textContent = t; el.fMed.hidden = F.fase !== 'medir';
  }
  function fotoToque(e) {
    if (!F.img) return; var c = el.cf, r = c.getBoundingClientRect(), p = [(e.clientX - r.left) / r.width * c.width, (e.clientY - r.top) / r.height * c.height];
    if (F.fase === 'ref') {
      F.pts.push(p); var need = F.modo === 'plano' ? 4 : 2;
      if (F.pts.length === need) { try { if (F.modo === 'plano') { var w = +el.refW.value, hh = +el.refH.value; F.H = R.FotoMed.homografia(F.pts, [[0, 0], [w, 0], [w, hh], [0, hh]]); } else { F.esc = R.FotoMed.escala(F.pts[0], F.pts[1], +el.refL.value); if (!F.esc) throw new Error('Los dos puntos coinciden.'); } F.fase = 'medir'; } catch (er) { T.aviso(er.message, 'error'); F.pts = []; } }
    } else { F.medPts.push(p); if (F.tipoMed === 'dist' && F.medPts.length === 2) cerrarMed(); }
    fotoEstado(); fotoDibujar();
  }
  function valorDist(a, b) { return F.modo === 'plano' ? R.FotoMed.distancia(F.H, a, b) : Math.hypot(b[0] - a[0], b[1] - a[1]) * F.esc; }
  function cerrarMed() {
    var p = F.medPts; if (F.tipoMed === 'dist' && p.length === 2) { var v = valorDist(p[0], p[1]); F.med.push({ tipo: 'dist', pts: p.slice(), val: v, txt: A.fmt(v, 1) + ' cm' }); }
    else if (F.tipoMed === 'area' && p.length >= 3) { var a = F.modo === 'plano' ? R.FotoMed.areaPoligono(F.H, p) : (function () { var s = 0; for (var i = 0; i < p.length; i++) { var q = p[i], n = p[(i + 1) % p.length]; s += q[0] * n[1] - n[0] * q[1]; } return Math.abs(s) / 2 * F.esc * F.esc; })(); F.med.push({ tipo: 'area', pts: p.slice(), val: a, txt: A.fmt(a, 0) + ' cm² (' + A.fmt(a / 1e4, 3) + ' m²)' }); }
    else { T.aviso('Faltan puntos.', 'error'); return; } F.medPts = []; listaFoto(); fotoEstado(); fotoDibujar(); A.logro('r3d_foto_medida');
  }
  function listaFoto() { el.fLista.textContent = ''; F.med.forEach(function (m, i) { el.fLista.appendChild(h('li', {}, [h('span', { txt: (i + 1) + '. ' + (m.tipo === 'dist' ? 'Largo' : 'Área') + ': ' + m.txt + (m.tipo === 'dist' ? ' = ' + A.fmt(m.val / 100, 3) + ' m' : '') }), h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-label': 'Borrar medida ' + (i + 1), txt: '×', on: { click: function () { F.med.splice(i, 1); listaFoto(); fotoDibujar(); } } })])); }); }
  async function cargarFoto(file) { try { var d = await R.Img.deArchivo(file, 1600), c = R.Img.aCanvas(d); F.img = c; el.cf.width = d.w; el.cf.height = d.h; F.pts = []; F.med = []; F.medPts = []; F.fase = 'ref'; F.H = null; listaFoto(); fotoEstado(); fotoDibujar(); } catch (e) { T.aviso(e.message, 'error'); } }
  function ejemploFoto() { // hoja A4 sintetica en perspectiva con una caja de 12 x 8 cm al lado
    var w = 640, hh = 480, c = document.createElement('canvas'); c.width = w; c.height = hh; var x = c.getContext('2d'); x.fillStyle = '#7a6a52'; x.fillRect(0, 0, w, hh); var Hm = R.FotoMed.homografia([[0, 0], [21, 0], [21, 29.7], [0, 29.7]], [[90, 70], [330, 90], [350, 440], [70, 410]]);
    function poly(pts, col) { var q = pts.map(function (p) { return R.FotoMed.aplicar(R.FotoMed.homografia([[0, 0], [21, 0], [21, 29.7], [0, 29.7]], [[90, 70], [330, 90], [350, 440], [70, 410]]), p); }); x.fillStyle = col; x.beginPath(); q.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.fill(); } void Hm;
    poly([[0, 0], [21, 0], [21, 29.7], [0, 29.7]], '#f5f5f0'); poly([[4, 5], [16, 5], [16, 13], [4, 13]], '#3b6fd4'); F.img = c; el.cf.width = w; el.cf.height = hh; el.refW.value = 21; el.refH.value = 29.7; F.modo = 'plano'; el.fModo.value = 'plano'; F.pts = []; F.med = []; F.medPts = []; F.fase = 'ref'; fotoEstado(); fotoDibujar(); T.aviso('Foto de ejemplo: hoja A4 (21 × 29,7 cm) con un rectángulo azul de 12 × 8 cm dentro.');
  }

  V.iniciar = function (raiz) {
    el.herr = h('div', { cls: 'r3d-herr', role: 'group', 'aria-label': 'Herramientas del plano' }, [['pared', 'Pared'], ['puerta', 'Puerta'], ['ventana', 'Ventana'], ['mueble', 'Mueble'], ['sel', 'Elegir'], ['borrar', 'Borrar'], ['mover', 'Mover vista']].map(function (b) { return h('button', { type: 'button', cls: 'tr-btn tr-chico', 'data-h': b[0], 'aria-pressed': b[0] === 'pared', txt: b[1], on: { click: function () { ponerHerr(b[0]); } } }); }));
    el.cv = h('canvas', { cls: 'r3d-plano', tabindex: 0, role: 'img', 'aria-label': 'Plano 2D editable. Toca para dibujar paredes y colocar elementos.' }); el.ayudaHerr = h('p', { cls: 'tr-ayuda' });
    el.paso = h('select', { 'aria-label': 'Ajuste a la rejilla' }, [[0.01, '1 cm'], [0.05, '5 cm'], [0.1, '10 cm'], [0.25, '25 cm']].map(function (o) { return h('option', { value: o[0], txt: 'Ajuste ' + o[1], selected: o[0] === 0.05 }); })); el.angulo = h('input', { type: 'checkbox', checked: true });
    el.lonExacta = h('input', { type: 'number', step: 0.01, min: 0.05, placeholder: 'm', inputmode: 'decimal', 'aria-label': 'Longitud exacta en metros' }); el.selMueble = h('select', { 'aria-label': 'Mueble' }, P.MUEBLES.map(function (m, i) { return h('option', { value: i, txt: m.nombre + ' (' + m.w + '×' + m.d + ' m)' }); })); el.selMuebleFila = h('div', { hidden: true }, [el.selMueble]);
    el.rw = h('input', { type: 'number', step: 0.1, value: 4, min: 0.5, inputmode: 'decimal', 'aria-label': 'Ancho' }); el.rd = h('input', { type: 'number', step: 0.1, value: 3, min: 0.5, inputmode: 'decimal', 'aria-label': 'Largo' });
    el.alto = h('input', { type: 'number', step: 0.05, value: 2.5, min: 1, inputmode: 'decimal' }); el.grosor = h('input', { type: 'number', step: 0.01, value: 0.12, min: 0.02, inputmode: 'decimal' }); el.techo = h('input', { type: 'checkbox', checked: true }); el.suelo = h('input', { type: 'checkbox', checked: true });
    el.form = h('div'); el.stats = h('div', { cls: 'r3d-stats' }); el.estadoCierre = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    var panelPlano = h('div', { cls: 'r3d-grid' }, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Plano de la habitación' }), el.herr, h('div', { cls: 'tr-fila' }, [el.paso, h('label', { cls: 'tr-chk' }, [el.angulo, 'Alinear a 15°'])]), el.selMuebleFila, el.ayudaHerr, el.cv,
        h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Cerrar contorno', on: { click: cerrar } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Terminar cadena', on: { click: function () { inicio = null; dibujar(); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Deshacer', on: { click: undo } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Rehacer', on: { click: redo } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Encuadrar', on: { click: function () { fitVista(); dibujar(); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar todo', on: { click: function () { if (!M().paredes.length && !M().muebles.length) return; guardarEstado(); A.plano = P.nuevo(); inicio = null; sel = null; formSel(); stats(); dibujar(); } } })]),
        h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Longitud exacta de la siguiente pared (m)' }), el.lonExacta]), h('div', {}, [h('label', { txt: ' ' }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Añadir pared', on: { click: longitudExacta } })])]),
        h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Habitación rápida: ancho (m)' }), el.rw]), h('div', {}, [h('label', { txt: 'largo (m)' }), el.rd]), h('div', {}, [h('label', { txt: ' ' }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Crear rectángulo', on: { click: rapido } })])])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Elemento' }), el.form]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Medidas del espacio' }), el.stats, el.estadoCierre, h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Altura de muros (m)' }), el.alto]), h('div', {}, [h('label', { txt: 'Grosor (m)' }), el.grosor])]), h('label', { cls: 'tr-chk' }, [el.suelo, 'Suelo']), h('label', { cls: 'tr-chk' }, [el.techo, 'Techo']), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Extruir a 3D y ver', on: { click: generar3D } })]), h('p', { cls: 'tr-ayuda', txt: 'Las medidas son las que tú escribes: no se infieren de ninguna foto. Las aberturas se recortan de los muros; el mobiliario son cajas.' })])])]);
    /* foto con referencia */
    el.cf = h('canvas', { cls: 'r3d-lienzo', 'aria-label': 'Foto para medir. Toca los puntos indicados.' }); el.fEstado = h('p', { cls: 'tr-nota', 'aria-live': 'polite' }); el.fLista = h('ul', { cls: 'r3d-lista' });
    el.fModo = h('select', { 'aria-label': 'Tipo de referencia', on: { change: function () { F.modo = el.fModo.value; F.pts = []; F.med = []; F.medPts = []; F.fase = 'ref'; el.filaPlano.hidden = F.modo !== 'plano'; el.filaEsc.hidden = F.modo !== 'escala'; listaFoto(); fotoEstado(); fotoDibujar(); } } }, [h('option', { value: 'plano', txt: '4 esquinas de un rectángulo (corrige la perspectiva)' }), h('option', { value: 'escala', txt: '1 largo conocido (solo si la cámara mira de frente)' })]);
    el.refSel = h('select', { 'aria-label': 'Objeto de referencia', on: { change: function () { var r = R.FotoMed.REFERENCIAS.filter(function (q) { return q.id === el.refSel.value; })[0]; el.refW.value = r.w; el.refH.value = r.h; } } }, R.FotoMed.REFERENCIAS.map(function (r) { return h('option', { value: r.id, txt: r.nombre }); }));
    el.refW = h('input', { type: 'number', step: 'any', value: 21, inputmode: 'decimal' }); el.refH = h('input', { type: 'number', step: 'any', value: 29.7, inputmode: 'decimal' }); el.refL = h('input', { type: 'number', step: 'any', value: 21, inputmode: 'decimal' });
    el.filaPlano = h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Ancho real (cm)' }), el.refW]), h('div', {}, [h('label', { txt: 'Alto real (cm)' }), el.refH])]); el.filaEsc = h('div', { hidden: true }, [h('label', { txt: 'Largo real del segmento (cm)' }), el.refL]);
    el.fTipo = h('select', { 'aria-label': 'Qué medir', on: { change: function () { F.tipoMed = el.fTipo.value; F.medPts = []; fotoEstado(); fotoDibujar(); } } }, [h('option', { value: 'dist', txt: 'Largo (2 puntos)' }), h('option', { value: 'area', txt: 'Área (polígono)' })]);
    el.fMed = h('div', { hidden: true }, [h('label', { txt: 'Qué medir' }), el.fTipo, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Cerrar área', on: { click: cerrarMed } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Cambiar referencia', on: { click: function () { F.pts = []; F.fase = 'ref'; F.med = []; F.medPts = []; listaFoto(); fotoEstado(); fotoDibujar(); } } })])]);
    var fArch = h('input', { type: 'file', accept: 'image/*', hidden: true }); fArch.addEventListener('change', function () { if (fArch.files[0]) cargarFoto(fArch.files[0]); fArch.value = ''; }); el.cf.addEventListener('pointerdown', fotoToque);
    var panelFoto = h('div', { cls: 'r3d-grid', hidden: true }, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Medir sobre una foto' }), fArch, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Cargar foto', on: { click: function () { fArch.click(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Foto de ejemplo', on: { click: ejemploFoto } })]), el.fEstado, el.cf]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Referencia y medidas' }), h('label', { txt: 'Método de calibración' }), el.fModo, h('label', { txt: 'Objeto de referencia' }), el.refSel, el.filaPlano, el.filaEsc, el.fMed, h('h3', { txt: 'Medidas' }), el.fLista]),
        h('p', { cls: 'tr-nota tr-av', txt: 'Solo es válido para puntos que estén en el mismo plano que el objeto de referencia (la misma pared, mesa o suelo). La distorsión de la lente no se corrige y la precisión baja con el ángulo de la foto y lejos de la referencia.' })])]);
    el.sub = h('div', { cls: 'r3d-seg', role: 'group', 'aria-label': 'Herramienta' }, [['plano', 'Plano por medidas'], ['foto', 'Medir en una foto']].map(function (m, i) { return h('button', { type: 'button', 'data-m': m[0], 'aria-pressed': i === 0, txt: m[1], on: { click: function () { panelPlano.hidden = m[0] !== 'plano'; panelFoto.hidden = m[0] !== 'foto'; Array.prototype.forEach.call(el.sub.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m[0]); }); if (m[0] === 'plano') setTimeout(dibujar, 0); } } }); }));
    raiz.appendChild(el.sub); raiz.appendChild(panelPlano); raiz.appendChild(panelFoto); eventos(); ponerHerr('pared'); stats(); formSel(); fotoEstado();
    new ResizeObserver(function () { dibujar(); }).observe(el.cv); document.addEventListener('visibilitychange', dibujar);
    V.dibujar = function () { fitVista(); dibujar(); };
    A.on('plano-cargado', function () { sel = null; inicio = null; formSel(); stats(); fitVista(); dibujar(); });
  };
})(window);
