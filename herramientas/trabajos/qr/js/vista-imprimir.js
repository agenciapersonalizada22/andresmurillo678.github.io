/* Vista Imprimir: hojas de etiquetas/stickers con el motor Impresion. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.QRApp, I = g.Impresion, R = g.QRRender, ui = {}, ctl = null, tDeb = 0, cache = new Map();
  var PRESETS = [
    ['libre', 'Cuadrícula libre', null],
    ['sq25', 'Stickers cuadrados 25 mm (A4)', { papel: 'A4', modo: 'fija', cw: 25, ch: 25, sx: 3, sy: 3, mt: 10, md: 10, mb: 10, mi: 10, alinear: 'centro', explicito: false, cortes: 'lineas' }],
    ['sq40', 'Stickers cuadrados 40 mm (A4)', { papel: 'A4', modo: 'fija', cw: 40, ch: 40, sx: 4, sy: 4, mt: 10, md: 10, mb: 10, mi: 10, alinear: 'centro', explicito: false, cortes: 'lineas' }],
    ['sq50', 'Stickers cuadrados 50 mm (A4)', { papel: 'A4', modo: 'fija', cw: 50, ch: 50, sx: 4, sy: 4, mt: 10, md: 10, mb: 10, mi: 10, alinear: 'centro', explicito: false, cortes: 'lineas' }],
    ['sq50c', 'Stickers cuadrados 50 mm (Carta)', { papel: 'Carta', modo: 'fija', cw: 50, ch: 50, sx: 4, sy: 4, mt: 10, md: 10, mb: 10, mi: 10, alinear: 'centro', explicito: false, cortes: 'lineas' }],
    ['l7160', 'Tipo Avery L7160: A4, 3×7 de 63,5×38,1 mm', { papel: 'A4', modo: 'fija', cols: 3, filas: 7, cw: 63.5, ch: 38.1, sx: 2.5, sy: 0, mt: 15.1, mi: 7.2, md: 7.2, mb: 15.1, alinear: 'inicio', explicito: true, cortes: 'ninguno' }],
    ['l7163', 'Tipo Avery L7163: A4, 2×7 de 99,1×38,1 mm', { papel: 'A4', modo: 'fija', cols: 2, filas: 7, cw: 99.1, ch: 38.1, sx: 2.5, sy: 0, mt: 15.1, mi: 4.7, md: 4.7, mb: 15.1, alinear: 'inicio', explicito: true, cortes: 'ninguno' }],
    ['l7651', 'Tipo Avery L7651: A4, 5×13 de 38,1×21,2 mm', { papel: 'A4', modo: 'fija', cols: 5, filas: 13, cw: 38.1, ch: 21.2, sx: 2.5, sy: 0, mt: 10.7, mi: 4.7, md: 4.7, mb: 10.7, alinear: 'inicio', explicito: true, cortes: 'ninguno' }],
    ['a5160', 'Tipo Avery 5160: Carta, 3×10 de 66,7×25,4 mm', { papel: 'Carta', modo: 'fija', cols: 3, filas: 10, cw: 66.7, ch: 25.4, sx: 3.2, sy: 0, mt: 12.7, mi: 4.8, md: 4.8, mb: 12.7, alinear: 'inicio', explicito: true, cortes: 'ninguno' }],
    ['a5163', 'Tipo Avery 5163: Carta, 2×5 de 101,6×50,8 mm', { papel: 'Carta', modo: 'fija', cols: 2, filas: 5, cw: 101.6, ch: 50.8, sx: 3.2, sy: 0, mt: 12.7, mi: 4, md: 4, mb: 12.7, alinear: 'inicio', explicito: true, cortes: 'ninguno' }]
  ];
  var CFG0 = { papel: 'A4', orient: 'vertical', mt: 10, md: 10, mb: 10, mi: 10, modo: 'fija', cw: 50, ch: 50, sx: 4, sy: 4, alinear: 'centro', cortes: 'lineas', registro: false, regla: false, bordes: false, cols: 3, filas: 4, explicito: false };
  function fuentes() {
    var E = A.est, ac = A.vistas.crear.ultimo(), fuente = ui.fuente.value, copias = Math.max(1, Math.min(2000, parseInt(ui.copias.value, 10) || 0));
    if (fuente === 'lote') { var l = (A.itemsLote() || []).filter(function (i) { return i.qr; }); return { lista: l.map(function (i) { return { qr: i.qr, texto: i.texto, etq: i.etq }; }), copiasPorItem: 1 }; }
    if (!ac) return { lista: [], copiasPorItem: 1 };
    return { lista: [{ qr: ac.qr, texto: ac.act.texto, etq: ac.act.titulo, estilo: ac.estilo }], copiasPorItem: ui.copias.value === '' ? 0 : copias };
  }
  function envolver(txt, max, lineas) {
    var pal = String(txt).split(/\s+/), l = [], cur = '';
    pal.forEach(function (p) { while (p.length > max) { if (cur) { l.push(cur); cur = ''; } l.push(p.slice(0, max)); p = p.slice(max); } if ((cur + ' ' + p).trim().length <= max) cur = (cur + ' ' + p).trim(); else { if (cur) l.push(cur); cur = p; } });
    if (cur) l.push(cur); if (l.length > lineas) { l = l.slice(0, lineas); l[lineas - 1] = l[lineas - 1].slice(0, Math.max(1, max - 1)) + '…'; } return l;
  }
  function textoDe(it) { var m = ui.texto.value; return m === 'ninguno' ? '' : m === 'personal' ? ui.textoLibre.value : (it.etq || (it.texto.length > 80 ? it.texto.slice(0, 77) + '…' : it.texto)); }
  function dibujarCelda(it, ce, base) {
    var pad = Math.min(1.5, Math.min(ce.w, ce.h) / 10), txt = textoDe(it), est = Object.assign({}, A.estiloPara(it.qr, it.estilo || base), { logo: it.estilo ? A.estiloPara(it.qr, it.estilo).logo : null }), s = [];
    var ancha = txt && ce.w >= ce.h * 1.7, fs = Math.max(1.6, Math.min(3.4, ce.h / 7)), lado, qx, qy;
    if (ancha) { lado = ce.h - 2 * pad; qx = pad; qy = pad; var max = Math.max(4, Math.floor((ce.w - lado - 3 * pad) / (fs * 0.55))), lin = envolver(txt, max, Math.max(1, Math.floor((ce.h - 2 * pad) / (fs * 1.25)))); lin.forEach(function (l, i) { s.push('<text x="' + (lado + 2 * pad) + '" y="' + (pad + fs * (1 + i * 1.25)) + '" font-size="' + fs + '" fill="#000">' + T.esc(l) + '</text>'); }); }
    else {
      var th = txt ? fs * 1.35 : 0; lado = Math.min(ce.w - 2 * pad, ce.h - 2 * pad - th); qx = (ce.w - lado) / 2; qy = pad;
      if (txt) { var m2 = Math.max(4, Math.floor((ce.w - 2 * pad) / (fs * 0.55))), l2 = envolver(txt, m2, Math.max(1, Math.floor((ce.h - lado - 2 * pad) / (fs * 1.2)))); if (l2.length > 1) { lado = Math.max(4, Math.min(ce.w - 2 * pad, ce.h - 2 * pad - l2.length * fs * 1.2)); qx = (ce.w - lado) / 2; } l2.forEach(function (l, i) { s.push('<text x="' + ce.w / 2 + '" y="' + (qy + lado + fs * 1.05 + i * fs * 1.2) + '" font-size="' + fs + '" text-anchor="middle" fill="#000">' + T.esc(l) + '</text>'); }); }
    }
    if (lado < 3) return '';
    var key = it.qr.version + it.texto + JSON.stringify(est), i2 = cache.get(key); if (!i2) { i2 = R.interior(it.qr, est); cache.set(key, i2); if (cache.size > 300) cache.delete(cache.keys().next().value); }
    s.unshift('<svg x="' + qx + '" y="' + qy + '" width="' + lado + '" height="' + lado + '" viewBox="0 0 ' + i2.lado + ' ' + i2.lado + '" shape-rendering="' + (est.estilo === 'cuadrado' ? 'crispEdges' : 'geometricPrecision') + '">' + i2.markup + '</svg>');
    it._lado = lado; return s.join('');
  }
  function plan() {
    var f = fuentes(), cfg = Object.assign({}, ctl.valor()), n = f.lista.length, total, seq = [];
    if (!n) return { vacio: true, cfg: cfg };
    var probe = I.calcular(Object.assign({}, cfg, { total: 1 }));
    if (ui.fuente.value === 'lote') total = n; else { total = f.copiasPorItem || probe.porHoja; }
    cfg.total = total; var L = I.calcular(cfg);
    for (var i = 0; i < total; i++) seq.push(f.lista[i % n]);
    return { L: L, seq: seq, cfg: cfg, n: n, total: total };
  }
  function dibujarFn(p) { var base = A.est.estilo; return function (idx, ce) { var it = p.seq[idx]; return it ? dibujarCelda(it, ce, base) : ''; }; }
  function pintar() {
    var p = plan(); ui.vista.textContent = ''; ui.avisos.textContent = '';
    ['imp', 'png'].forEach(function (k) { ui[k].disabled = !!p.vacio; });
    if (p.vacio) { ui.resumen.textContent = ''; ui.vista.appendChild(h('div', { cls: 'tr-vacio', txt: ui.fuente.value === 'lote' ? 'El lote está vacío. Añade contenidos en la pestaña Lote.' : 'Crea primero un código válido en la pestaña Crear.' })); return; }
    var L = p.L;
    ui.resumen.textContent = p.total + ' etiqueta' + (p.total === 1 ? '' : 's') + ' en ' + L.paginas + ' hoja' + (L.paginas === 1 ? '' : 's') + ' · ' + L.cols + '×' + L.filas + ' por hoja · celda de ' + L.celda.w + '×' + L.celda.h + ' mm';
    L.avisos.forEach(function (a) { ui.avisos.appendChild(h('div', { cls: 'tr-nota tr-av', txt: a })); });
    if (!L.porHoja) { ui.avisos.appendChild(h('div', { cls: 'tr-nota tr-mal', txt: 'No cabe ninguna celda. Reduce los márgenes o el tamaño.' })); ['imp', 'png'].forEach(function (k) { ui[k].disabled = true; }); return; }
    var f = dibujarFn(p); I.vistaPrevia(ui.vista, L, f, { zoom: 'ajustar', maxPaginas: 6 });
    var it0 = p.seq[0]; if (it0 && it0._lado) { var mod = it0._lado / (it0.qr.tam + 2 * (A.est.estilo.margen)); ui.avisos.appendChild(h('div', { cls: 'tr-nota ' + (mod < 0.4 ? 'tr-av' : ''), txt: 'Cada módulo del QR medirá ≈ ' + mod.toFixed(2) + ' mm' + (mod < 0.4 ? ': es muy pequeño, puede costar leerlo. Usa etiquetas más grandes o menos contenido.' : '.') })); }
    if (p.cfg.modo !== 'fija' && L.celda.w > 0 && Math.abs(L.celda.w - L.celda.h) > 1 && !p.cfg.explicito) { /* cuadrícula: el QR queda cuadrado centrado en la celda */ }
  }
  function refrescar() { clearTimeout(tDeb); tDeb = setTimeout(pintar, 120); }
  function aplicarPreset(id) {
    var p = PRESETS.filter(function (x) { return x[0] === id; })[0]; if (!p) return; if (!p[2]) return ctl.poner({ explicito: false });
    ctl.poner(Object.assign({ orient: 'vertical', explicito: false }, p[2]));
  }
  A.iniciarImprimir = function () {
    var raiz = document.getElementById('v-imprimir');
    ui.fuente = h('select', { id: 'im-fuente' }, [h('option', { value: 'actual', txt: 'El código de la pestaña Crear' }), h('option', { value: 'lote', txt: 'El lote (cada código distinto)' })]);
    ui.fuente.addEventListener('change', function () { ui.copias.closest('div').hidden = ui.fuente.value === 'lote'; refrescar(); });
    ui.copias = h('input', { type: 'number', id: 'im-copias', min: 1, max: 2000, placeholder: 'Vacío = llenar una hoja', inputmode: 'numeric' }); ui.copias.addEventListener('input', refrescar);
    ui.preset = h('select', { id: 'im-preset' }, PRESETS.map(function (p) { return h('option', { value: p[0], txt: p[1] }); })); ui.preset.addEventListener('change', function () { aplicarPreset(ui.preset.value); });
    ui.texto = h('select', { id: 'im-texto' }, [['etq', 'Etiqueta o contenido'], ['ninguno', 'Sin texto'], ['personal', 'Texto fijo (abajo)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); ui.texto.addEventListener('change', function () { ui.textoLibre.closest('div').hidden = ui.texto.value !== 'personal'; refrescar(); });
    ui.textoLibre = h('input', { type: 'text', id: 'im-texto-libre', maxlength: 80, placeholder: 'Ej.: Escanéame' }); ui.textoLibre.addEventListener('input', refrescar);
    var ctlBox = h('div', { id: 'im-ctl' });
    ctl = I.controles(ctlBox, CFG0, function () { ui.preset.value = ui.preset.value === 'libre' ? 'libre' : ui.preset.value; refrescar(); });
    ui.resumen = h('p', { id: 'im-resumen', role: 'status', 'aria-live': 'polite' }); ui.avisos = h('div', { id: 'im-avisos' }); ui.vista = h('div', { id: 'im-vista' });
    ui.imp = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'im-imprimir', txt: 'Imprimir…', on: { click: imprimir } });
    ui.png = h('button', { type: 'button', cls: 'tr-btn', id: 'im-png', txt: 'Descargar PNG (300 ppp)', on: { click: png } });
    var dpi = h('select', { id: 'im-dpi', 'aria-label': 'Resolución del PNG' }, [['150', '150 ppp'], ['300', '300 ppp'], ['600', '600 ppp']].map(function (o) { return h('option', { value: o[0], txt: o[1], selected: o[0] === '300' }); })); ui.dpi = dpi;
    var izq = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Qué imprimir' }), h('label', { for: 'im-fuente', txt: 'Contenido de las etiquetas' }), ui.fuente, h('div', {}, [h('label', { for: 'im-copias', txt: 'Copias' }), ui.copias]),
      h('label', { for: 'im-preset', txt: 'Plantilla de hoja' }), ui.preset, h('p', { cls: 'tr-ayuda', txt: 'Las plantillas «tipo Avery» son medidas aproximadas de hojas de etiquetas habituales: compruébalas con tu hoja real (imprime antes en papel normal y ponlo a contraluz).' }),
      h('label', { for: 'im-texto', txt: 'Texto bajo/junto al QR' }), ui.texto, h('div', { hidden: true }, [h('label', { for: 'im-texto-libre', txt: 'Texto fijo' }), ui.textoLibre]),
      h('details', { cls: 'qr-det', open: '' }, [h('summary', { txt: 'Hoja, márgenes, cuadrícula y cortes' }), ctlBox])]);
    var der = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Vista previa' }), ui.resumen, ui.avisos, ui.vista, h('div', { cls: 'tr-acciones' }, [ui.imp, ui.png, h('label', { cls: 'tr-solo-lector', for: 'im-dpi', txt: 'Resolución' }), dpi]),
      h('div', { cls: 'tr-nota', txt: 'Para imprimir a tamaño real elige escala 100 % («tamaño real», sin «ajustar a la página»), márgenes «ninguno» o «predeterminados» y desactiva encabezados y pies. Activa la regla de 50 mm para comprobarlo con una regla. Tu impresora puede recortar los bordes de la hoja.' })]);
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [izq, der]));
    ui.copias.closest('div').hidden = false;
    A.on('lote', function () { if (!raiz.hidden && ui.fuente.value === 'lote') refrescar(); }); A.on('estilo', refrescar);
  };
  function imprimir() {
    var p = plan(); if (p.vacio || !p.L.porHoja) return;
    I.imprimir(p.L, dibujarFn(p), {}); A.logro('hoja_etiquetas'); A.logro('primer_qr');
    if (ui.fuente.value === 'actual') A.registrar(); if (g.CuentaTrabajos) g.CuentaTrabajos.xp(4);
  }
  async function png() {
    var p = plan(); if (p.vacio || !p.L.porHoja) return; var dpi = +ui.dpi.value, f = dibujarFn(p);
    ui.png.disabled = true;
    try {
      if (p.L.paginas === 1) T.descargar(await I.aPNG(p.L, 0, f, { dpi: dpi }), 'etiquetas_' + p.L.hoja.w + 'x' + p.L.hoja.h + '_' + dpi + 'ppp.png');
      else { var arch = []; for (var k = 0; k < Math.min(p.L.paginas, 40); k++) { var b = await I.aPNG(p.L, k, f, { dpi: dpi }); arch.push({ nombre: 'hoja_' + String(k + 1).padStart(2, '0') + '.png', datos: new Uint8Array(await b.arrayBuffer()) }); } T.descargar(T.zip(arch), 'etiquetas_hojas.zip'); }
      A.aviso('Hoja exportada.'); A.logro('hoja_etiquetas'); A.logro('primer_qr');
    } catch (e) { A.aviso(e.message, 'error'); }
    ui.png.disabled = false;
  }
  A.alMostrarImprimir = function () { if (A.est.fuenteImpresion) { ui.fuente.value = A.est.fuenteImpresion; A.est.fuenteImpresion = null; ui.copias.closest('div').hidden = ui.fuente.value === 'lote'; } pintar(); };
})(window);
