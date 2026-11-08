/* Dibujo imprimible (SVG en mm) de facturas, cotizaciones e informe mensual; se usa con comun/impresion.js (A4/Carta, imprimir o guardar como PDF). window.MonDoc */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, U = g.MonUI, X = g.MonDoc = {}, INK = '#1a1f33', SOFT = '#5b6378', LINE = '#c9cfe0', ACC = '#2f4fc4';
  function Lienzo(w, h) {
    var L = { w: w, h: h, pags: [], cur: null, y: 0 };
    L.nueva = function () { L.cur = []; L.pags.push(L.cur); L.y = 0; };
    L.t = function (x, y, txt, o) { o = o || {}; L.cur.push('<text x="' + x + '" y="' + y + '" font-size="' + (o.s || 3.4) + '" font-weight="' + (o.b ? 700 : 400) + '" fill="' + (o.c || INK) + '" text-anchor="' + (o.a || 'start') + '">' + T.esc(txt) + '</text>'); };
    L.l = function (x1, y1, x2, y2, c, sw) { L.cur.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || LINE) + '" stroke-width="' + (sw || 0.3) + '"/>'); };
    L.r = function (x, y, ww, hh, f, rx) { L.cur.push('<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + f + '" rx="' + (rx || 0) + '"/>'); };
    L.raw = function (s) { L.cur.push(s); };
    L.nueva(); return L;
  }
  function envolver(txt, ancho, size) {
    var max = Math.max(8, Math.floor(ancho / (size * 0.5))), out = [];
    String(txt || '').split(/\r?\n/).forEach(function (p) {
      var l = ''; p.split(/\s+/).forEach(function (w) { while (w.length > max) { if (l) { out.push(l); l = ''; } out.push(w.slice(0, max)); w = w.slice(max); } if ((l + ' ' + w).trim().length > max) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); }); out.push(l);
    });
    return out;
  }
  function qrSvg(texto, x, y, lado) {
    try {
      var qr = g.QRCodificador.codificar(texto, { ecc: 'M' }), s = g.QRRender.svg(qr, { fg: '#000000', bg: '#ffffff', margen: 2, estilo: 'cuadrado' }, lado);
      return s.replace('<svg ', '<svg x="' + x + '" y="' + y + '" ');
    } catch (e) { return ''; }
  }
  /* ctx: {emisor, cliente:{nombre,email,idFiscal,direccion}, proyecto, fmt(v), terminos} */
  X.factura = function (d, ctx, W, H) {
    var L = Lienzo(W, H), esCot = d.tipo === 'cotizacion', tot = C.totalesDoc(d), fmt = ctx.fmt, em = ctx.emisor || {}, cl = ctx.cliente || {}, estado = ctx.estado || '';
    function cabeceraPag() {
      L.y = 0;
      if (em.logo) L.raw('<image href="' + T.esc(em.logo) + '" x="0" y="0" width="32" height="20" preserveAspectRatio="xMinYMin meet"/>');
      var xl = em.logo ? 36 : 0;
      L.t(xl, 6, em.nombre || 'Tu nombre o negocio', { s: 5, b: 1 });
      var lin = [em.idFiscal, em.direccion, em.contacto].filter(Boolean).join(' · '); envolver(lin, W * 0.55 - xl, 3).slice(0, 3).forEach(function (s, i) { L.t(xl, 11 + i * 4, s, { s: 3, c: SOFT }); });
      L.t(W, 7, esCot ? 'COTIZACIÓN' : 'FACTURA', { s: 7, b: 1, a: 'end', c: ACC }); L.t(W, 13, 'N.º ' + d.numero, { s: 4.2, b: 1, a: 'end' });
      L.t(W, 18, 'Fecha: ' + U.fecha(d.fecha) + (d.vence ? '   ' + (esCot ? 'Válida hasta' : 'Vence') + ': ' + U.fecha(d.vence) : ''), { s: 3.2, a: 'end', c: SOFT });
      if (estado) L.t(W, 23, estado.toUpperCase(), { s: 3.2, b: 1, a: 'end', c: SOFT });
      L.l(0, 27, W, 27, ACC, 0.6); L.y = 34;
    }
    cabeceraPag();
    L.t(0, L.y, esCot ? 'PREPARADA PARA' : 'FACTURAR A', { s: 2.8, b: 1, c: SOFT }); L.y += 5;
    L.t(0, L.y, cl.nombre || '(cliente)', { s: 4, b: 1 }); L.y += 4.6;
    envolver([cl.idFiscal, cl.direccion, cl.email].filter(Boolean).join(' · '), W * 0.6, 3.1).filter(Boolean).slice(0, 2).forEach(function (s) { L.t(0, L.y, s, { s: 3.1, c: SOFT }); L.y += 4; });
    if (ctx.proyecto) { L.t(0, L.y, 'Proyecto: ' + ctx.proyecto, { s: 3.2, c: SOFT }); L.y += 4.2; }
    L.y += 4;
    var cx = [0, W - 62, W - 38, W];   // descripcion | cant | precio | importe (derecha)
    function cabTabla() { L.r(0, L.y - 4.4, W, 6.6, '#eef1fa'); L.t(1.5, L.y, 'Descripción', { s: 3, b: 1 }); L.t(W - 44, L.y, 'Cant.', { s: 3, b: 1, a: 'end' }); L.t(W - 22, L.y, 'Precio', { s: 3, b: 1, a: 'end' }); L.t(W - 1.5, L.y, 'Importe', { s: 3, b: 1, a: 'end' }); L.y += 6; }
    cabTabla();
    (d.lineas || []).forEach(function (ln) {
      var desc = envolver(ln.desc || '', W - 84, 3.3), alto = Math.max(1, desc.length) * 4.4 + 1.6;
      if (L.y + alto > H - 62) { L.nueva(); cabeceraPag(); cabTabla(); }
      desc.forEach(function (s, i) { L.t(1.5, L.y + i * 4.4, s, { s: 3.3 }); });
      var imp = C.n(ln.cant, 1) * C.n(ln.precio) * (1 - C.n(ln.desc2 || ln.dto) / 100);
      L.t(W - 44, L.y, U.num(ln.cant), { s: 3.3, a: 'end' }); L.t(W - 22, L.y, fmt(C.n(ln.precio)), { s: 3.3, a: 'end' }); L.t(W - 1.5, L.y, fmt(imp), { s: 3.3, a: 'end' });
      L.y += alto; L.l(0, L.y - 2.4, W, L.y - 2.4, '#e3e7f2', 0.2);
    });
    // totales
    var filasT = [['Subtotal', fmt(tot.subtotal)]]; if (tot.descuento) filasT.push(['Descuento ' + U.num(d.descuentoPct) + ' %', '-' + fmt(tot.descuento)]);
    tot.impuestos.forEach(function (i) { if (i.pct) filasT.push([(i.retencion ? 'Retención ' : '') + i.nombre + ' ' + U.num(i.pct) + ' %', fmt(i.monto)]); });
    if (tot.pagado) filasT.push(['Pagado', '-' + fmt(tot.pagado)]);
    var altoT = filasT.length * 5 + 12;
    if (L.y + altoT > H - 50) { L.nueva(); cabeceraPag(); }
    L.y += 2; var xT = W - 78;
    filasT.forEach(function (f) { L.t(xT, L.y, f[0], { s: 3.3, c: SOFT }); L.t(W - 1.5, L.y, f[1], { s: 3.3, a: 'end' }); L.y += 5; });
    L.r(xT - 2, L.y - 3.6, 80, 8, ACC, 1); L.t(xT, L.y + 1.6, tot.pagado ? 'Saldo a pagar' : 'Total', { s: 3.8, b: 1, c: '#fff' }); L.t(W - 1.5, L.y + 1.6, fmt(tot.pagado ? tot.saldo : tot.total), { s: 4.2, b: 1, c: '#fff', a: 'end' }); L.y += 12;
    // pie: pago + QR + terminos
    var pie = H - 44, yy = Math.max(L.y, pie - 6);
    if (yy > H - 46) { L.nueva(); cabeceraPag(); yy = H - 50; }
    var xq = 0;
    if (d.qrPago) { L.raw(qrSvg(d.qrPago, 0, yy, 28)); L.t(14, yy + 31, 'Escanea para pagar', { s: 2.6, a: 'middle', c: SOFT }); xq = 33; }
    var bloque = ((d.notas ? d.notas + '\n\n' : '') + (em.pago ? 'Datos de pago: ' + em.pago + '\n\n' : '') + (d.terminos || '')).trim();
    envolver(bloque, W - xq, 2.9).slice(0, 12).forEach(function (s, i) { L.t(xq, yy + 3 + i * 3.6, s, { s: 2.9, c: SOFT }); });
    L.pags.forEach(function (p, i) { p.push('<text x="0" y="' + (H + 1) + '" font-size="2.6" fill="' + SOFT + '">Documento comercial generado con Monetización · no sustituye comprobantes fiscales: confirma los requisitos con tu contador.</text><text x="' + W + '" y="' + (H + 1) + '" font-size="2.6" fill="' + SOFT + '" text-anchor="end">Pág. ' + (i + 1) + '/' + L.pags.length + '</text>'); });
    return L.pags.map(function (p) { return p.join(''); });
  };
  /* informe mensual: i = {mes, base, kpis:[[et,val]], ingreso:{vs}, categorias:[[et,val]], proyectos:[[et,ing,gas,neto]], pendientes:[[et,val]], notas} */
  X.informe = function (i, W, H) {
    var L = Lienzo(W, H), fmt = i.fmt;
    L.t(0, 8, 'Informe mensual · ' + i.mesTxt, { s: 6.5, b: 1, c: ACC }); L.t(0, 14, (i.emisor || 'Mi negocio') + ' · Moneda: ' + i.base, { s: 3.4, c: SOFT }); L.l(0, 18, W, 18, ACC, 0.6); L.y = 28;
    var kw = (W - 6) / 3;
    i.kpis.forEach(function (k, n) { var x = (n % 3) * (kw + 3), y = L.y + Math.floor(n / 3) * 22; L.r(x, y - 5, kw, 19, '#eef1fa', 2); L.t(x + 3, y, k[0], { s: 2.9, c: SOFT }); L.t(x + 3, y + 8, k[1], { s: 5, b: 1 }); });
    L.y += Math.ceil(i.kpis.length / 3) * 22 + 6;
    var mx = Math.max(i.ingresos, i.gastos, 1); L.t(0, L.y, 'Ingresos vs gastos', { s: 3.8, b: 1 }); L.y += 6;
    [['Ingresos', i.ingresos, '#1b8a5a'], ['Gastos', i.gastos, '#d9480f']].forEach(function (b) { L.r(30, L.y - 3.4, Math.max(0.5, (W - 70) * b[1] / mx), 5, b[2], 1); L.t(0, L.y, b[0], { s: 3.2 }); L.t(32 + (W - 70) * b[1] / mx, L.y + 0.4, fmt(b[1]), { s: 3.2 }); L.y += 8; });
    L.y += 4;
    function tabla(tit, cols, filas) {
      if (!filas.length) return; if (L.y > H - 30) { L.nueva(); L.y = 8; }
      L.t(0, L.y, tit, { s: 3.8, b: 1 }); L.y += 5; L.r(0, L.y - 3.6, W, 5.4, '#eef1fa');
      cols.forEach(function (c, n) { L.t(n === 0 ? 1.5 : W - 1.5 - (cols.length - 1 - n) * 32, L.y, c, { s: 3, b: 1, a: n === 0 ? 'start' : 'end' }); }); L.y += 5.6;
      filas.slice(0, 40).forEach(function (f) {
        if (L.y > H - 12) { L.nueva(); L.y = 8; }
        f.forEach(function (v, n) { L.t(n === 0 ? 1.5 : W - 1.5 - (cols.length - 1 - n) * 32, L.y, n === 0 && String(v).length > 34 ? String(v).slice(0, 33) + '…' : v, { s: 3.2, a: n === 0 ? 'start' : 'end' }); }); L.y += 5; L.l(0, L.y - 3.2, W, L.y - 3.2, '#e3e7f2', 0.2);
      }); L.y += 6;
    }
    tabla('Gastos por categoría', ['Categoría', 'Monto'], i.categorias); tabla('Ingresos por fuente', ['Fuente', 'Monto'], i.fuentes);
    tabla('Resultado por proyecto', ['Proyecto', 'Ingresos', 'Gastos', 'Neto'], i.proyectos); tabla('Cuentas por cobrar', ['Documento', 'Saldo'], i.pendientes);
    L.pags.forEach(function (p, n) { p.push('<text x="0" y="' + (H + 1) + '" font-size="2.6" fill="' + SOFT + '">Registro propio del usuario, informativo. No es asesoría fiscal, legal ni financiera.</text><text x="' + W + '" y="' + (H + 1) + '" font-size="2.6" fill="' + SOFT + '" text-anchor="end">Pág. ' + (n + 1) + '/' + L.pags.length + '</text>'); });
    return L.pags.map(function (p) { return p.join(''); });
  };
  X.layout = function (paginas, papel) {
    return g.Impresion.calcular({ papel: papel || 'A4', orient: 'vertical', mt: 14, md: 12, mb: 16, mi: 12, modo: 'cuadricula', cols: 1, filas: 1, alinear: 'inicio', total: paginas, explicito: true });
  };
  X.medidas = function (papel) { var P = g.Impresion.PAPELES[papel || 'A4']; return { W: P.ancho - 24, H: P.alto - 30 }; };
  X.vista = function (cont, paginas, papel) { var L = X.layout(paginas.length, papel); g.Impresion.vistaPrevia(cont, L, function (i) { return paginas[i]; }, { unidades: false }); return L; };
  X.imprimir = function (paginas, papel) { var L = X.layout(paginas.length, papel); g.Impresion.imprimir(L, function (i) { return paginas[i]; }, { unidades: false }); };
})(window);
