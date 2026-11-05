/* Pestana Ajustes: capas de ajuste, looks, curvas/niveles, quitar fondo, desenfoque de fondo, marcos, seleccion por pixeles, recorte. */
(function (IM) {
  var h = IM.h, E = IM.E, UI = IM.UI, Doc = IM.Doc, Pix = Doc.Pix, Fi = window.Filtros, V = IM.Vista, A = IM.UIAjustes = { qc: { tol: 30, suav: 40, contiguo: true }, fb: { cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.35, suav: 0.5, radio: 14 }, ratioId: 'libre', escalarRed: true };
  var SL = [['brillo', 'Brillo', -100, 100], ['contraste', 'Contraste', -100, 100], ['saturacion', 'Saturación', -100, 100], ['tono', 'Tono (°)', -180, 180], ['temperatura', 'Temperatura', -100, 100], ['tinte', 'Tinte', -100, 100], ['vineta', 'Viñeta', 0, 100], ['nitidez', 'Nitidez', 0, 100], ['desenfoque', 'Desenfoque', 0, 60], ['ruido', 'Ruido', 0, 100], ['pixelado', 'Pixelado', 0, 60]];
  function opsDe(aj) {
    var o = [];
    if (aj.niveles && (aj.niveles.neg > 0 || aj.niveles.blan < 255 || aj.niveles.gam !== 1 || aj.niveles.sneg > 0 || aj.niveles.sblan < 255)) o.push(['niveles', aj.niveles]);
    if (aj.curvas && aj.curvas.puntos.length && aj.curvas.puntos.some(function (p) { return p[0] !== p[1]; })) o.push(['curvas', aj.curvas]);
    ['brillo', 'contraste', 'saturacion', 'tono', 'temperatura', 'tinte'].forEach(function (k) { if (aj[k]) o.push([k, { v: aj[k] }]); });
    if (aj.duotono) o.push(['duotono', aj.duotono]);
    if (aj.vineta) o.push(['vineta', { v: aj.vineta }]); if (aj.nitidez) o.push(['nitidez', { v: aj.nitidez, radio: 2 }]); if (aj.desenfoque) o.push(['desenfoque', { v: aj.desenfoque }]);
    if (aj.ruido) o.push(['ruido', { v: aj.ruido }]); if (aj.pixelado >= 2) o.push(['pixelado', { v: aj.pixelado }]);
    return o;
  }
  function crearAjuste(opts) {
    var p = E.pagina(), sel = E.unaSel(), idx = p.capas.length;
    if (sel) { var r = Doc.buscar(p.capas, sel.id); if (r && !r.padre) idx = r.indice + 1; }
    var c = Doc.capa('ajuste', Object.assign({ x: p.w / 2, y: p.h / 2, w: p.w, h: p.h, ops: [], aj: { niveles: { neg: 0, blan: 255, gam: 1, sneg: 0, sblan: 255 }, curvas: { canal: 'rgb', puntos: [[0, 0], [255, 255]] } } }, opts));
    E.agregar(c, { indice: idx, nombre: 'Añadir ' + c.nombre.toLowerCase(), centrar: false }); return c;
  }
  function editarAjuste(c) {
    var aj = c.aj, out = [];
    function cambia(clave) { c.ops = opsDe(aj); E.cambio('Ajuste: ' + c.nombre, clave); E.emit('mod'); }
    SL.forEach(function (s) { out.push(UI.rango(s[1], s[2], s[3], 1, aj[s[0]] || 0, function (v) { aj[s[0]] = v; cambia('aj-' + s[0] + c.id); })); });
    out.push(UI.sw('Duotono', !!aj.duotono, function (v) { aj.duotono = v ? { c1: '#1b1464', c2: '#fbb034' } : null; cambia(); E.emit('sel'); }));
    if (aj.duotono) out.push(UI.color('Sombras', aj.duotono.c1, function (v) { aj.duotono.c1 = v; cambia('duo1'); }), UI.color('Luces', aj.duotono.c2, function (v) { aj.duotono.c2 = v; cambia('duo2'); }));
    out.push(h('div', { class: 'rotulo' }, 'Niveles'));
    var nv = aj.niveles = aj.niveles || { neg: 0, blan: 255, gam: 1, sneg: 0, sblan: 255 };
    [['Negro de entrada', 'neg', 0, 254, 1], ['Blanco de entrada', 'blan', 1, 255, 1], ['Gamma (medios)', 'gam', 0.2, 3, 0.05], ['Negro de salida', 'sneg', 0, 254, 1], ['Blanco de salida', 'sblan', 1, 255, 1]].forEach(function (q) { out.push(UI.rango(q[0], q[2], q[3], q[4], nv[q[1]], function (v) { nv[q[1]] = v; cambia('nv-' + q[1]); })); });
    out.push(h('div', { class: 'rotulo' }, 'Curvas'), editorCurvas(aj, cambia));
    out.push(h('div', { class: 'botonera' }, UI.btn('Restablecer ajustes', null, function () { c.aj = { niveles: { neg: 0, blan: 255, gam: 1, sneg: 0, sblan: 255 }, curvas: { canal: 'rgb', puntos: [[0, 0], [255, 255]] } }; c.ops = []; E.cambio('Restablecer ajuste'); E.emit('sel'); }), UI.btn('Aplicar a la imagen de abajo', null, function () { combinar(c); })));
    return out;
  }
  function editorCurvas(aj, cambia) {
    var cur = aj.curvas = aj.curvas || { canal: 'rgb', puntos: [[0, 0], [255, 255]] }, S = 200, cv = h('canvas', { width: S, height: S, class: 'curvas', role: 'img', 'aria-label': 'Editor de curvas. Arrastra puntos; doble clic elimina.' }), x = cv.getContext('2d'), arr = null;
    function dib() {
      var st = getComputedStyle(document.documentElement); x.clearRect(0, 0, S, S); x.fillStyle = st.getPropertyValue('--campo').trim() || '#eee'; x.fillRect(0, 0, S, S);
      x.strokeStyle = 'rgba(128,128,128,.4)'; x.lineWidth = 1; x.beginPath(); for (var i = 1; i < 4; i++) { x.moveTo(i * S / 4, 0); x.lineTo(i * S / 4, S); x.moveTo(0, i * S / 4); x.lineTo(S, i * S / 4); } x.stroke();
      var t = Fi.tablaCurva(cur.puntos); x.strokeStyle = st.getPropertyValue('--acento').trim() || '#6366f1'; x.lineWidth = 2; x.beginPath(); for (var k = 0; k < 256; k++) { var px = k / 255 * S, py = S - t[k] / 255 * S; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      cur.puntos.forEach(function (p) { x.fillStyle = '#fff'; x.beginPath(); x.arc(p[0] / 255 * S, S - p[1] / 255 * S, 5, 0, 7); x.fill(); x.stroke(); });
    }
    function pos(e) { var r = cv.getBoundingClientRect(); return [IM.clamp((e.clientX - r.left) / r.width * 255, 0, 255), IM.clamp(255 - (e.clientY - r.top) / r.height * 255, 0, 255)]; }
    cv.addEventListener('pointerdown', function (e) {
      var p = pos(e), i = -1, best = 14; cur.puntos.forEach(function (q, j) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < best) { best = d; i = j; } });
      if (i < 0) { cur.puntos.push(p); cur.puntos.sort(function (a, b) { return a[0] - b[0]; }); i = cur.puntos.indexOf(p); } arr = i; cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) { if (arr == null) return; var p = pos(e), q = cur.puntos[arr], ult = arr === 0 || arr === cur.puntos.length - 1; if (ult) { q[1] = p[1]; } else { q[0] = IM.clamp(p[0], cur.puntos[arr - 1][0] + 2, cur.puntos[arr + 1][0] - 2); q[1] = p[1]; } dib(); cambia('curvas'); });
    cv.addEventListener('pointerup', function () { arr = null; });
    cv.addEventListener('dblclick', function (e) { var p = pos(e); for (var j = 1; j < cur.puntos.length - 1; j++) if (Math.hypot(cur.puntos[j][0] - p[0], cur.puntos[j][1] - p[1]) < 14) { cur.puntos.splice(j, 1); dib(); cambia(); return; } });
    dib(); return h('div', null, cv, UI.btn('Restablecer curva', null, function () { cur.puntos = [[0, 0], [255, 255]]; dib(); cambia(); }));
  }
  function combinar(c) {
    var p = E.pagina(), r = Doc.buscar(p.capas, c.id), below = r && r.lista[r.indice - 1];
    if (!below || below.tipo !== 'imagen') { IM.aviso('Coloca la capa de ajuste justo encima de una imagen'); return; }
    E.filtrarCapa(below, c.ops, 'Aplicar ajuste a la imagen').then(function () { var r2 = Doc.buscar(p.capas, c.id); if (r2) r2.lista.splice(r2.indice, 1); E.sel = [below.id]; E.emit('sel'); E.cambio('Combinar ajuste'); });
  }
  function looks() {
    var rej = h('div', { class: 'looks' }, null), sel = E.unaSel(), act = sel && sel.tipo === 'ajuste' ? sel : null;
    Fi.LOOKS.forEach(function (l) {
      var mini = IM.lienzo(64, 48), x = mini.getContext('2d'), base = A.muestra || (A.muestra = muestraBase());
      x.drawImage(base, 0, 0); var d = x.getImageData(0, 0, 64, 48); Fi.aplicarOps(d.data, 64, 48, l[2]); x.putImageData(d, 0, 0);
      rej.appendChild(h('button', { type: 'button', class: 'look', title: l[1], 'aria-label': 'Look ' + l[1], onclick: function () { aplicarLook(l); } }, mini, h('span', null, l[1])));
    });
    return rej;
  }
  function muestraBase() {
    var c = IM.lienzo(64, 48), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 64, 48); g.addColorStop(0, '#4aa3df'); g.addColorStop(0.5, '#e8c07d'); g.addColorStop(1, '#c0504d'); x.fillStyle = g; x.fillRect(0, 0, 64, 48);
    x.fillStyle = '#3b6b3b'; x.beginPath(); x.moveTo(0, 48); x.lineTo(20, 22); x.lineTo(40, 48); x.fill(); x.fillStyle = '#f5f0e6'; x.beginPath(); x.arc(48, 14, 7, 0, 7); x.fill(); return c;
  }
  function aplicarLook(l) {
    var sel = E.unaSel();
    if (sel && sel.tipo === 'ajuste' && sel.look) { sel.ops = JSON.parse(JSON.stringify(l[2])); sel.look = l[0]; sel.nombre = 'Look: ' + l[1]; E.cambio('Look ' + l[1]); return; }
    if (l[0] === 'original') return;
    crearAjuste({ ops: JSON.parse(JSON.stringify(l[2])), look: l[0], nombre: 'Look: ' + l[1], aj: null });
  }
  /* ---- herramientas de imagen ---- */
  function clon(c) { var s = Pix.get(c.px), n = IM.lienzo(s.width, s.height); n.getContext('2d').drawImage(s, 0, 0); return n; }
  function quitarFondo(c) {
    var n = clon(c); IM.Trabajo.quitarColor(n, { rgb: window.Color.hexARgb(E.color).slice(0, 3), tol: A.qc.tol, suav: A.qc.suav, contiguo: A.qc.contiguo, semilla: null }).then(function () { c.px = Pix.nuevo(n); E.cambio('Quitar fondo por color'); });
  }
  function fondoBorroso(c) {
    var p = E.pagina(), s = Pix.get(c.px), k = Math.min(1, 800 / Math.max(s.width, s.height)), n = IM.lienzo(s.width * k, s.height * k); n.getContext('2d').drawImage(s, 0, 0, n.width, n.height);
    IM.Trabajo.ops(n, [['desenfoque', { v: 18 }], ['brillo', { v: -6 }]]).then(function () {
      var f = Math.max(p.w / c.w, p.h / c.h) * 1.1, b = Doc.capa('imagen', { px: Pix.nuevo(n), w: c.w * f, h: c.h * f, x: p.w / 2, y: p.h / 2, nombre: 'Fondo desenfocado' });
      var r = Doc.buscar(p.capas, c.id); p.capas.splice(r.indice, 0, b); E.cambio('Fondo desenfocado detrás');
    });
  }
  function marco(tipo) {
    var p = E.pagina(), w = p.w, h2 = p.h, g = Math.round(Math.min(w, h2) * 0.04), col = E.color, c = [], R = Doc.rect, F = Doc.forma;
    if (tipo === 'simple') c.push(R(g, g, w - 2 * g, h2 - 2 * g, null, { trazo: { color: col, ancho: Math.round(g / 3) }, nombre: 'Marco' }));
    if (tipo === 'doble') c.push(R(g, g, w - 2 * g, h2 - 2 * g, null, { trazo: { color: col, ancho: Math.round(g / 4) }, nombre: 'Marco exterior' }), R(g * 1.8, g * 1.8, w - 3.6 * g, h2 - 3.6 * g, null, { trazo: { color: col, ancho: Math.round(g / 8) }, nombre: 'Marco interior' }));
    if (tipo === 'redondeado') c.push(R(g, g, w - 2 * g, h2 - 2 * g, null, { radio: g * 2, trazo: { color: col, ancho: Math.round(g / 2.5) }, nombre: 'Marco redondeado' }));
    if (tipo === 'polaroid') { var b = g * 1.2, bb = g * 4.5; c.push(R(0, 0, w, b, '#fff'), R(0, 0, b, h2, '#fff'), R(w - b, 0, b, h2, '#fff'), R(0, h2 - bb, w, bb, '#fff')); }
    if (tipo === 'esquinas') { var L = g * 3, t = Math.round(g / 2.5); [[g, g, 1, 1], [w - g, g, -1, 1], [g, h2 - g, 1, -1], [w - g, h2 - g, -1, -1]].forEach(function (q) { c.push(R(q[2] > 0 ? q[0] : q[0] - L, q[1] - (q[3] < 0 ? t : 0), L, t, col), R(q[0] - (q[2] < 0 ? t : 0), q[3] > 0 ? q[1] : q[1] - L, t, L, col)); }); }
    if (tipo === 'vineta') c.push(R(0, 0, w, h2, { tipo: 'radial', c1: 'rgba(0,0,0,0)', c2: 'rgba(0,0,0,0.65)' }, { nombre: 'Viñeta' }));
    var g2 = Doc.capa('grupo', { nombre: 'Marco ' + tipo, hijos: c, w: w, h: h2, x: w / 2, y: h2 / 2 }); c.forEach(function (q) { q.x -= w / 2; q.y -= h2 / 2; });
    E.agregar(g2, { centrar: false, nombre: 'Añadir marco' });
  }
  /* ---- seleccion por pixeles (varita) ---- */
  A.borrarSeleccionPx = function () {
    var s = E.seleccionPx, c = s && E.capaPorId(s.id); if (!c) return; var n = clon(c), x = n.getContext('2d'), d = x.getImageData(0, 0, n.width, n.height);
    for (var i = 0; i < s.mask.length; i++) if (s.mask[i]) d.data[i * 4 + 3] = Math.round(d.data[i * 4 + 3] * (1 - s.mask[i] / 255)); x.putImageData(d, 0, 0); c.px = Pix.nuevo(n); E.seleccionPx = null; E.cambio('Borrar selección'); E.emit('seleccionPx'); V.pedirOv();
  };
  function accionesSel() {
    var s = E.seleccionPx, c = E.capaPorId(s.id), out = [h('p', { class: 'ayuda' }, s.n.toLocaleString('es') + ' píxeles seleccionados')];
    out.push(h('div', { class: 'botonera' }, UI.btn('Borrar', 'borrar', A.borrarSeleccionPx), UI.btn('Invertir', null, function () { for (var i = 0; i < s.mask.length; i++) s.mask[i] = 255 - s.mask[i]; IM.Entrada.fijarSeleccionPx(c, s.mask, s.w, s.h); }),
      UI.btn('Suavizar bordes', null, function () { IM.Entrada.fijarSeleccionPx(c, window.Relleno.suavizarMascara(s.mask, s.w, s.h, 2), s.w, s.h); }),
      UI.btn('Rellenar con color', 'relleno', function () { var n = clon(c), x = n.getContext('2d'), d = x.getImageData(0, 0, n.width, n.height), col = window.Color.hexARgb(E.color); for (var i = 0; i < s.mask.length; i++) if (s.mask[i]) { var a = s.mask[i] / 255; d.data[i * 4] += (col[0] - d.data[i * 4]) * a; d.data[i * 4 + 1] += (col[1] - d.data[i * 4 + 1]) * a; d.data[i * 4 + 2] += (col[2] - d.data[i * 4 + 2]) * a; d.data[i * 4 + 3] = Math.max(d.data[i * 4 + 3], s.mask[i]); } x.putImageData(d, 0, 0); c.px = Pix.nuevo(n); E.cambio('Rellenar selección'); }),
      UI.btn('Copiar a capa nueva', 'duplicar', function () { var n = clon(c), x = n.getContext('2d'), d = x.getImageData(0, 0, n.width, n.height); for (var i = 0; i < s.mask.length; i++) d.data[i * 4 + 3] = Math.round(d.data[i * 4 + 3] * s.mask[i] / 255); x.putImageData(d, 0, 0); var q = JSON.parse(JSON.stringify(c)); q.id = IM.uid(); q.px = Pix.nuevo(n); q.nombre = c.nombre + ' (selección)'; q.mascara = null; var r = Doc.buscar(E.pagina().capas, c.id); E.pagina().capas.splice(r.indice + 1, 0, q); E.sel = [q.id]; E.seleccionPx = null; E.emit('sel'); E.cambio('Copiar selección'); }),
      UI.btn('Máscara desde selección', 'mascara', function () { E.nuevaMascara(c, true); E.seleccionPx = null; E.emit('seleccionPx'); }), UI.btn('Deseleccionar', null, function () { E.seleccionPx = null; E.emit('seleccionPx'); V.pedirOv(); })));
    return out;
  }
  /* ---- recorte de lienzo ---- */
  A.aplicarRecorte = function () {
    var r = V.recorte; if (!r) return; var red = window.Redes.buscar(A.ratioId);
    if (red && A.escalarRed) E.recortarLienzo(r, red.w, red.h); else E.recortarLienzo(r);
    UI.elegirHerr('seleccionar');
  };
  function panelRecorte() {
    var ls = window.Redes.lista.filter(function (r) { return r.id !== 'libre'; }), ratios = [['libre', 'Libre'], ['r:1', '1:1'], ['r:0.8', '4:5'], ['r:1.7778', '16:9'], ['r:0.5625', '9:16'], ['r:1.5', '3:2'], ['r:0.6667', '2:3']];
    var opc = ratios.concat(ls.map(function (r) { return [r.id, r.nombre + ' (' + r.w + '×' + r.h + ')']; }));
    var out = [UI.sel('Proporción', opc, A.ratioId, function (v) {
      A.ratioId = v; var red = window.Redes.buscar(v); E.recorteRatio = v === 'libre' ? null : red ? red.w / red.h : parseFloat(v.slice(2)); IM.Entrada.ajustarRatioRecorte();
      var z = red && red.seguro ? v : null; if (z) { E.proy.ajustes.seguro = z; V.pedirOv(); }
    })];
    var red = window.Redes.buscar(A.ratioId);
    if (red) out.push(UI.sw('Escalar al tamaño exacto ' + red.w + '×' + red.h, A.escalarRed, function (v) { A.escalarRed = v; }));
    var r = V.recorte; if (r) out.push(h('p', { class: 'ayuda' }, 'Recorte: ' + Math.round(r.w) + ' × ' + Math.round(r.h) + ' px'));
    out.push(h('div', { class: 'botonera' }, UI.btn('Aplicar recorte', 'recorte', A.aplicarRecorte, { clase: 'primario' }), UI.btn('Cancelar', 'cerrar', function () { UI.elegirHerr('seleccionar'); })), h('p', { class: 'ayuda' }, 'Arrastra los bordes para ajustar. Las zonas seguras de la red elegida se muestran en el lienzo.'));
    return out;
  }
  A.render = function (cont) {
    var sel = E.unaSel();
    if (E.herr === 'recorte') { cont.appendChild(UI.seccion('Recortar lienzo', panelRecorte())); return; }
    if (E.herr === 'persp') { cont.appendChild(UI.seccion('Perspectiva', [h('p', { class: 'ayuda' }, 'Arrastra las cuatro esquinas amarillas para corregir o crear perspectiva.'), h('div', { class: 'botonera' }, UI.btn('Aplicar', 'persp', IM.Entrada.aplicarPersp, { clase: 'primario' }), UI.btn('Cancelar', 'cerrar', IM.Entrada.cancelarPersp))])); return; }
    if (E.seleccionPx && E.capaPorId(E.seleccionPx.id)) cont.appendChild(UI.seccion('Selección de píxeles', accionesSel()));
    if (sel && sel.tipo === 'ajuste') {
      cont.appendChild(UI.seccion('Capa de ajuste: ' + sel.nombre, sel.aj ? editarAjuste(sel) : [UI.rango('Intensidad %', 0, 100, 1, Math.round(sel.opacidad * 100), function (v) { sel.opacidad = v / 100; E.cambio('Intensidad del look', 'intensidad'); }), UI.btn('Aplicar a la imagen de abajo', null, function () { combinar(sel); }), h('p', { class: 'ayuda' }, 'Este look es no destructivo. Elige otro look de abajo para cambiarlo.')]));
    } else {
      cont.appendChild(UI.seccion('Ajustes manuales', [h('p', { class: 'ayuda' }, 'Crea una capa de ajuste no destructiva sobre ' + (sel ? 'la capa seleccionada' : 'todo el diseño') + ' con brillo, contraste, color, curvas, niveles, viñeta, nitidez, desenfoque, ruido y pixelado.'), UI.btn('Crear capa de ajuste', 'ajustes', function () { crearAjuste({ nombre: 'Ajustes' }); }, { clase: 'primario' })]));
    }
    cont.appendChild(UI.seccion('Filtros y looks (20)', [looks(), h('p', { class: 'ayuda' }, 'Se añaden como capa de ajuste; mueve la intensidad con la opacidad.')]));
    if (sel && sel.tipo === 'imagen') {
      cont.appendChild(UI.seccion('Quitar fondo', [h('p', { class: 'ayuda' }, 'Elige el color del fondo con el cuentagotas o usa la esquina.'), h('div', { class: 'botonera' }, UI.btn('Color de la esquina', 'gotero', function () { var s = Pix.get(sel.px), d = s.getContext('2d').getImageData(0, 0, 1, 1).data; E.color = window.Color.rgbAHex(d[0], d[1], d[2]); E.emit('color'); }), h('span', { class: 'muestra', style: { background: E.color }, title: 'Color a quitar ' + E.color }, '')),
        UI.rango('Tolerancia', 0, 255, 1, A.qc.tol, function (v) { A.qc.tol = v; }), UI.rango('Suavizado de bordes', 0, 120, 1, A.qc.suav, function (v) { A.qc.suav = v; }), UI.sw('Solo desde los bordes (conserva interiores)', A.qc.contiguo, function (v) { A.qc.contiguo = v; }),
        UI.btn('Quitar fondo', 'borrar', function () { quitarFondo(sel); }, { clase: 'primario' }), h('p', { class: 'ayuda' }, 'También: herramienta Varita (W) y botón Borrar.')]));
      cont.appendChild(UI.seccion('Desenfoque de fondo y enfoque', [UI.rango('Centro X', 0, 1, 0.01, A.fb.cx, function (v) { A.fb.cx = v; }), UI.rango('Centro Y', 0, 1, 0.01, A.fb.cy, function (v) { A.fb.cy = v; }), UI.rango('Zona nítida ancho', 0.05, 1, 0.01, A.fb.rx, function (v) { A.fb.rx = v; }), UI.rango('Zona nítida alto', 0.05, 1, 0.01, A.fb.ry, function (v) { A.fb.ry = v; }), UI.rango('Suavidad de transición', 0.05, 1, 0.05, A.fb.suav, function (v) { A.fb.suav = v; }), UI.rango('Intensidad', 2, 60, 1, A.fb.radio, function (v) { A.fb.radio = v; }),
        UI.btn('Desenfocar fondo', null, function () { E.filtrarCapa(sel, [['desenfoqueFondo', Object.assign({}, A.fb)]], 'Desenfoque de fondo'); }, { clase: 'primario' }), UI.btn('Fondo desenfocado detrás de la imagen', 'imagen', function () { fondoBorroso(sel); })], false));
      cont.appendChild(UI.seccion('Imagen', [h('div', { class: 'botonera' }, UI.btn('Ajuste automático', null, function () { E.filtrarCapa(sel, [['auto', {}]], 'Ajuste automático'); }), UI.btn('Blanco y negro', null, function () { E.filtrarCapa(sel, [['grises', {}]], 'Blanco y negro'); }), UI.btn('Perspectiva', 'persp', function () { UI.elegirHerr('persp'); }), UI.btn('Paleta de la imagen', 'paleta', function () { paleta(sel, cont2); }))]));
    }
    var cont2 = h('div', { class: 'muestras' });
    cont.appendChild(UI.seccion('Marcos y bordes', [h('div', { class: 'botonera' }, [['simple', 'Simple'], ['doble', 'Doble'], ['redondeado', 'Redondeado'], ['polaroid', 'Polaroid'], ['esquinas', 'Esquinas'], ['vineta', 'Viñeta oscura']].map(function (m) { return UI.btn(m[1], null, function () { marco(m[0]); }); })), h('p', { class: 'ayuda' }, 'Usa el color activo. Se añaden como grupo editable.')], false));
    cont.appendChild(UI.seccion('Paleta desde imagen', [cont2, UI.btn('Extraer del diseño', 'paleta', function () { paleta(null, cont2); })], false));
  };
  function paleta(sel, dest) {
    var cv = sel && sel.tipo === 'imagen' ? Pix.get(sel.px) : IM.Render.aCanvas(E.pagina(), Math.min(1, 300 / Math.max(E.pagina().w, E.pagina().h)), {});
    var cols = IM.Paleta.extraer(cv, 6); dest.textContent = '';
    cols.forEach(function (c) { dest.appendChild(h('button', { type: 'button', class: 'muestra grande', style: { background: c }, title: 'Usar ' + c + ' (clic) · copiar con Mayús', 'aria-label': 'Color ' + c, onclick: function (e) { E.color = c; E.emit('color'); if (e.shiftKey && navigator.clipboard) navigator.clipboard.writeText(c); IM.aviso('Color activo ' + c); } }, h('span', null, c))); });
    if (!sel) UI.tabsDer.mostrar('ajustes');
  }
})(window.IM);
