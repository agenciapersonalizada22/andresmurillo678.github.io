/* Motor de impresion reutilizable de Trabajos: hojas A4/Carta con margenes, cuadriculas, cortes, marcas de registro, escala 1:1,
   vista previa, window.print (@media print) y exportacion a PNG. Cada hoja es un SVG en milimetros: la misma salida sirve para
   pantalla, papel y PNG. El contenido de cada celda lo aporta el modulo: dibujar(indice, {w,h,col,fila}) -> cadena SVG en mm (origen arriba-izquierda de la celda).
   Limites: el navegador decide el area imprimible real (muchas impresoras recortan 3-5 mm); en el dialogo hay que elegir
   escala 100 % / "tamaño real" y sin "ajustar a la pagina"; la regla de 50 mm sirve para comprobarlo. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Impresion = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var PAPELES = { A4: { ancho: 210, alto: 297 }, Carta: { ancho: 215.9, alto: 279.4 } };
  var DEF = { papel: 'A4', orient: 'vertical', mt: 10, md: 10, mb: 10, mi: 10, modo: 'cuadricula', cols: 3, filas: 4, cw: 50, ch: 50, sx: 0, sy: 0, alinear: 'centro', cortes: 'ninguno', registro: false, regla: false, bordes: false, total: 0 };
  function num(v, d, min, max) { v = parseFloat(v); if (!isFinite(v)) v = d; return Math.min(max == null ? 1e6 : max, Math.max(min == null ? 0 : min, v)); }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* configuracion -> {hoja:{w,h}, area, cols, filas, celda:{w,h}, celdas:[{x,y,w,h,col,fila}], porHoja, paginas, avisos[]} */
  function calcular(o) {
    o = Object.assign({}, DEF, o || {});
    var P = PAPELES[o.papel] || PAPELES.A4, horiz = o.orient === 'horizontal', W = horiz ? P.alto : P.ancho, H = horiz ? P.ancho : P.alto, av = [];
    var mt = num(o.mt, 10, 0, H / 3), md = num(o.md, 10, 0, W / 3), mb = num(o.mb, 10, 0, H / 3), mi = num(o.mi, 10, 0, W / 3);
    var sx = num(o.sx, 0, 0, 100), sy = num(o.sy, 0, 0, 100), aw = W - mi - md, ah = H - mt - mb, cols, filas, cw, ch, x0 = mi, y0 = mt;
    if (o.modo === 'fija') {
      cw = num(o.cw, 50, 3, 1000); ch = num(o.ch, 50, 3, 1000);
      var maxC = Math.max(0, Math.floor((aw + sx + 1e-6) / (cw + sx))), maxF = Math.max(0, Math.floor((ah + sy + 1e-6) / (ch + sy)));
      cols = o.cols > 0 && o.explicito ? Math.floor(o.cols) : maxC; filas = o.filas > 0 && o.explicito ? Math.floor(o.filas) : maxF;
      if (cols > maxC || filas > maxF) av.push('Con estas medidas solo caben ' + maxC + ' × ' + maxF + ' celdas; se ajustó la cuadrícula.');
      cols = Math.min(cols, maxC); filas = Math.min(filas, maxF);
      if (o.alinear === 'centro' && !o.explicito) { x0 = mi + (aw - (cols * cw + (cols - 1) * sx)) / 2; y0 = mt + (ah - (filas * ch + (filas - 1) * sy)) / 2; }
    } else {
      cols = Math.max(1, Math.floor(num(o.cols, 3, 1, 60))); filas = Math.max(1, Math.floor(num(o.filas, 4, 1, 80)));
      cw = (aw - sx * (cols - 1)) / cols; ch = (ah - sy * (filas - 1)) / filas;
    }
    if (cw <= 0 || ch <= 0 || cols < 1 || filas < 1) { av.push('No cabe ninguna celda con estos márgenes y medidas.'); cols = Math.max(cols, 0); }
    var celdas = [], f, c;
    for (f = 0; f < filas; f++) for (c = 0; c < cols; c++) celdas.push({ x: r2(x0 + c * (cw + sx)), y: r2(y0 + f * (ch + sy)), w: r2(cw), h: r2(ch), col: c, fila: f });
    var porHoja = celdas.length, total = Math.max(0, Math.floor(o.total || 0));
    return { cfg: o, hoja: { w: W, h: H }, area: { x: mi, y: mt, w: aw, h: ah }, cols: cols, filas: filas, celda: { w: r2(cw), h: r2(ch) }, celdas: celdas, porHoja: porHoja, paginas: porHoja ? Math.max(1, Math.ceil(total / porHoja)) : 0, avisos: av, margenes: { t: mt, d: md, b: mb, i: mi } };
  }

  /* SVG de una hoja (pagina 0..n-1). dibujar(indiceGlobal, celda) -> markup SVG. Si indiceGlobal >= total no dibuja la celda. */
  function hojaSVG(L, pag, dibujar, o) {
    o = Object.assign({ unidades: true }, o || {});
    var c = L.cfg, W = L.hoja.w, H = L.hoja.h, s = [], i, k;
    s.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '" font-family="system-ui,Arial,sans-serif">');
    s.push('<rect width="' + W + '" height="' + H + '" fill="#fff"/>');
    var total = c.total || 0;
    L.celdas.forEach(function (ce, n) {
      var idx = pag * L.porHoja + n; if (total && idx >= total) return;
      s.push('<g transform="translate(' + ce.x + ' ' + ce.y + ')">' + (dibujar ? dibujar(idx, ce) : '') + '</g>');
      if (c.bordes) s.push('<rect x="' + ce.x + '" y="' + ce.y + '" width="' + ce.w + '" height="' + ce.h + '" fill="none" stroke="#888" stroke-width=".15" stroke-dasharray="1 1"/>');
    });
    // cortes
    var cl = '#666', sw = '.18', xs = [], ys = [];
    L.celdas.forEach(function (ce) { if (xs.indexOf(ce.x) < 0) xs.push(ce.x); if (xs.indexOf(r2(ce.x + ce.w)) < 0) xs.push(r2(ce.x + ce.w)); if (ys.indexOf(ce.y) < 0) ys.push(ce.y); if (ys.indexOf(r2(ce.y + ce.h)) < 0) ys.push(r2(ce.y + ce.h)); });
    var x1 = Math.min.apply(null, xs.concat([W])), x2 = Math.max.apply(null, xs.concat([0])), y1 = Math.min.apply(null, ys.concat([H])), y2 = Math.max.apply(null, ys.concat([0]));
    if (c.cortes === 'lineas' && L.celdas.length) {
      xs.forEach(function (x) { s.push('<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + cl + '" stroke-width="' + sw + '" stroke-dasharray="1.5 1"/>'); });
      ys.forEach(function (y) { s.push('<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + cl + '" stroke-width="' + sw + '" stroke-dasharray="1.5 1"/>'); });
    } else if (c.cortes === 'marcas' && L.celdas.length) {
      var t = 3;   // marcas de corte en los margenes: pequeñas lineas fuera del area de celdas
      xs.forEach(function (x) { s.push('<path d="M' + x + ' ' + Math.max(0, y1 - t - 1) + 'V' + Math.max(0, y1 - 1) + 'M' + x + ' ' + Math.min(H, y2 + 1) + 'V' + Math.min(H, y2 + 1 + t) + '" stroke="#000" stroke-width=".2" fill="none"/>'); });
      ys.forEach(function (y) { s.push('<path d="M' + Math.max(0, x1 - t - 1) + ' ' + y + 'H' + Math.max(0, x1 - 1) + 'M' + Math.min(W, x2 + 1) + ' ' + y + 'H' + Math.min(W, x2 + 1 + t) + '" stroke="#000" stroke-width=".2" fill="none"/>'); });
    }
    // marcas de registro: cruz con circulo en las cuatro esquinas, dentro del margen
    if (c.registro) {
      var m = Math.max(2.5, Math.min(5, Math.min(L.margenes.i, L.margenes.d, L.margenes.t, L.margenes.b) / 2)), cx = [m, W - m], cy = [m, H - m];
      cx.forEach(function (x) { cy.forEach(function (y) { s.push('<g stroke="#000" stroke-width=".25" fill="none"><circle cx="' + x + '" cy="' + y + '" r="' + (m * 0.6) + '"/><path d="M' + (x - m) + ' ' + y + 'H' + (x + m) + 'M' + x + ' ' + (y - m) + 'V' + (y + m) + '"/></g>'); }); });
    }
    if (c.regla && L.margenes.b >= 6) {
      var ry = H - L.margenes.b / 2, rx = L.margenes.i + 2;
      s.push('<g stroke="#000" stroke-width=".25" fill="none"><path d="M' + rx + ' ' + ry + 'h50M' + rx + ' ' + (ry - 1.5) + 'v3M' + (rx + 50) + ' ' + (ry - 1.5) + 'v3M' + (rx + 25) + ' ' + (ry - 1) + 'v2"/></g><text x="' + (rx + 52) + '" y="' + (ry + 1) + '" font-size="2.6" fill="#000">50 mm: mídelo con una regla (escala 1:1)</text>');
    }
    s.push('</svg>');
    return s.join('');
  }

  function medidaPx() { return 96 / 25.4; }   // CSS: 1 mm = 3.7795 px
  /* Vista previa en un contenedor; zoom 'ajustar' (al ancho disponible) o numero (1 = tamaño real en pantalla). */
  function vistaPrevia(cont, L, dibujar, o) {
    o = o || {}; cont.textContent = '';
    var env = document.createElement('div'); env.className = 'im-vista'; cont.appendChild(env);
    var ancho = Math.max(200, (cont.clientWidth || 320)), z = o.zoom === 'ajustar' || o.zoom == null ? Math.min(1, ancho / (L.hoja.w * medidaPx())) : o.zoom, n = L.paginas, max = Math.min(n, o.maxPaginas || 20);
    for (var p = 0; p < max; p++) {
      var marco = document.createElement('div'); marco.className = 'im-marco'; marco.setAttribute('role', 'img'); marco.setAttribute('aria-label', 'Hoja ' + (p + 1) + ' de ' + n + ', ' + L.hoja.w + ' por ' + L.hoja.h + ' mm');
      marco.style.width = L.hoja.w * medidaPx() * z + 'px'; marco.style.height = L.hoja.h * medidaPx() * z + 'px';
      marco.innerHTML = hojaSVG(L, p, dibujar, o);
      var svg = marco.firstChild; svg.style.width = L.hoja.w * medidaPx() + 'px'; svg.style.height = L.hoja.h * medidaPx() + 'px'; svg.style.transform = 'scale(' + z + ')';
      env.appendChild(marco);
    }
    if (n > max) { var m = document.createElement('p'); m.className = 'tr-ayuda'; m.textContent = 'Se muestran las primeras ' + max + ' de ' + n + ' hojas; al imprimir salen todas.'; env.appendChild(m); }
    return env;
  }

  /* Imprime a escala real: monta las hojas en #im-impresion y usa @media print. */
  function imprimir(L, dibujar, o) {
    var viejo = document.getElementById('im-impresion'); if (viejo) viejo.remove();
    var st = document.getElementById('im-estilo'); if (st) st.remove();
    st = document.createElement('style'); st.id = 'im-estilo';
    st.textContent = '@page{size:' + L.hoja.w + 'mm ' + L.hoja.h + 'mm;margin:0}@media print{html,body{background:#fff!important;margin:0!important;padding:0!important}body>*:not(#im-impresion){display:none!important}#im-impresion{display:block!important}.im-pag{width:' + L.hoja.w + 'mm;height:' + L.hoja.h + 'mm;overflow:hidden;break-after:page;page-break-after:always}.im-pag:last-child{break-after:auto;page-break-after:auto}.im-pag svg{display:block}}';
    var cont = document.createElement('div'); cont.id = 'im-impresion';
    for (var p = 0; p < L.paginas; p++) { var d = document.createElement('div'); d.className = 'im-pag'; d.innerHTML = hojaSVG(L, p, dibujar, o); cont.appendChild(d); }
    document.head.appendChild(st); document.body.appendChild(cont);
    function limpiar() { cont.remove(); st.remove(); g.removeEventListener('afterprint', limpiar); }
    g.addEventListener('afterprint', limpiar);
    setTimeout(function () { g.print(); }, 60);
    return limpiar;
  }

  function svgACanvas(svg, W, H, dpi) {
    var px = dpi / 25.4, cw = Math.round(W * px), ch = Math.round(H * px);
    return new Promise(function (ok, ko) {
      var img = new Image(), url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="' + cw + '" height="' + ch + '"'));
      img.onload = function () { var c = document.createElement('canvas'); c.width = cw; c.height = ch; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); x.drawImage(img, 0, 0, cw, ch); ok(c); };
      img.onerror = function () { ko(new Error('No se pudo generar la imagen de la hoja.')); }; img.src = url;
    });
  }
  /* PNG de una hoja a dpi (por defecto 300). Devuelve Promise<Blob>. */
  function aPNG(L, pag, dibujar, o) {
    o = o || {}; var dpi = Math.min(600, Math.max(72, o.dpi || 300));
    return svgACanvas(hojaSVG(L, pag, dibujar, o), L.hoja.w, L.hoja.h, dpi).then(function (c) { return new Promise(function (ok, ko) { c.toBlob(function (b) { b ? ok(b) : ko(new Error('PNG no disponible')); }, 'image/png'); }); });
  }

  /* ---- controles reutilizables ---- */
  function controles(cont, ini, alCambiar) {
    var T = g.Tr, h = T.h, cfg = Object.assign({}, DEF, ini || {}), refs = {};
    function campo(id, etq, tipo, extra) {
      var el = tipo === 'select' ? h('select', { id: 'im-' + id }) : h('input', Object.assign({ id: 'im-' + id, type: tipo || 'number', step: 'any', inputmode: tipo === 'number' ? 'decimal' : null }, extra || {}));
      if (tipo === 'select') (extra.op || []).forEach(function (op) { el.appendChild(h('option', { value: op[0], txt: op[1] })); });
      refs[id] = el; var w = h('div', {}, [h('label', { for: 'im-' + id, txt: etq }), el]);
      el.addEventListener('input', cambio); return w;
    }
    function chk(id, etq) { var el = h('input', { type: 'checkbox', id: 'im-' + id }); refs[id] = el; el.addEventListener('change', cambio); return h('label', { cls: 'tr-chk', for: 'im-' + id }, [el, etq]); }
    function cambio() { leer(); if (alCambiar) alCambiar(cfg); }
    function leer() {
      ['papel', 'orient', 'modo', 'alinear', 'cortes'].forEach(function (k) { if (refs[k]) cfg[k] = refs[k].value; });
      ['mt', 'md', 'mb', 'mi', 'cols', 'filas', 'cw', 'ch', 'sx', 'sy'].forEach(function (k) { if (refs[k] && refs[k].value !== '') cfg[k] = parseFloat(refs[k].value); });
      ['registro', 'regla', 'bordes'].forEach(function (k) { cfg[k] = refs[k].checked; });
      var fija = cfg.modo === 'fija'; ['cw', 'ch'].forEach(function (k) { refs[k].closest('div').hidden = !fija; });
      return cfg;
    }
    var raiz = h('div', { cls: 'im-ctl' }, [
      h('div', { cls: 'tr-fila' }, [campo('papel', 'Papel', 'select', { op: [['A4', 'A4 (210 × 297 mm)'], ['Carta', 'Carta (215,9 × 279,4 mm)']] }), campo('orient', 'Orientación', 'select', { op: [['vertical', 'Vertical'], ['horizontal', 'Horizontal']] })]),
      h('div', { cls: 'tr-etq', txt: 'Márgenes (mm)' }),
      h('div', { cls: 'tr-fila' }, [campo('mt', 'Superior', 'number', { min: 0, max: 60 }), campo('md', 'Derecho', 'number', { min: 0, max: 60 }), campo('mb', 'Inferior', 'number', { min: 0, max: 60 }), campo('mi', 'Izquierdo', 'number', { min: 0, max: 60 })]),
      h('div', { cls: 'tr-fila' }, [campo('modo', 'Celdas', 'select', { op: [['cuadricula', 'Cuadrícula (se reparten)'], ['fija', 'Tamaño fijo 1:1 (mm)']] }), campo('cols', 'Columnas', 'number', { min: 1, max: 60 }), campo('filas', 'Filas', 'number', { min: 1, max: 80 })]),
      h('div', { cls: 'tr-fila' }, [campo('cw', 'Ancho de celda (mm)', 'number', { min: 3 }), campo('ch', 'Alto de celda (mm)', 'number', { min: 3 }), campo('sx', 'Separación horizontal (mm)', 'number', { min: 0 }), campo('sy', 'Separación vertical (mm)', 'number', { min: 0 })]),
      h('div', { cls: 'tr-fila' }, [campo('cortes', 'Guías de corte', 'select', { op: [['ninguno', 'Ninguna'], ['lineas', 'Líneas punteadas'], ['marcas', 'Marcas en los márgenes']] }), campo('alinear', 'Alineación', 'select', { op: [['centro', 'Centrar en la hoja'], ['inicio', 'Desde los márgenes']] })]),
      chk('registro', 'Marcas de registro en las esquinas'), chk('regla', 'Regla de 50 mm para comprobar la escala 1:1'), chk('bordes', 'Dibujar borde de cada celda (guía)')
    ]);
    cont.appendChild(raiz);
    function poner(c) { Object.assign(cfg, c); Object.keys(refs).forEach(function (k) { var e = refs[k]; if (e.type === 'checkbox') e.checked = !!cfg[k]; else if (cfg[k] != null) e.value = cfg[k]; }); leer(); }
    poner(cfg);
    return { valor: function () { return leer(); }, poner: function (c) { poner(c); if (alCambiar) alCambiar(cfg); }, raiz: raiz };
  }
  return { PAPELES: PAPELES, DEF: DEF, calcular: calcular, hojaSVG: hojaSVG, vistaPrevia: vistaPrevia, imprimir: imprimir, aPNG: aPNG, controles: controles };
});
