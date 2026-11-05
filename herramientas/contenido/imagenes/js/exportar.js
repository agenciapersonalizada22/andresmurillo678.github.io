/* Exportacion: PNG/JPG/WebP con calidad y escala, SVG, lote en ZIP, copiar al portapapeles. */
(function (IM) {
  var E = IM.E, R = IM.Render, Redes = window.Redes, X = IM.Exportar = {};
  var MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  function aBlob(cv, fmt, q) { return new Promise(function (ok, no) { cv.toBlob(function (b) { b ? ok(b) : no(new Error('El navegador no pudo codificar ' + fmt.toUpperCase())); }, MIME[fmt], q); }); }
  X.lienzoPagina = function (pagina, escala, fmt) { return R.aCanvas(pagina, escala, { filtrar: IM.Trabajo.ops, blanco: fmt === 'jpg' }); };
  X.pagina = function (pagina, o) {
    if (o.formato === 'svg') return Promise.resolve(new Blob([R.aSvg(pagina)], { type: 'image/svg+xml' }));
    return X.lienzoPagina(pagina, o.escala || 1, o.formato).then(function (cv) { return aBlob(cv, o.formato, (o.calidad || 90) / 100); });
  };
  /* tamano final tras limitar la escala */
  X.dimensiones = function (pagina, escala) { var e = R.limiteEscala(pagina.w, pagina.h, escala); return { w: Math.round(pagina.w * e), h: Math.round(pagina.h * e), limitada: e < escala - 1e-6 }; };
  function aU8(b) { return b.arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function nombreBase() { return IM.nombreArchivo(E.proy.nombre); }
  /* o: {formato, escala, calidad, paginas:'actual'|'todas', zip:bool} */
  X.exportar = function (o, progreso) {
    var pags = o.paginas === 'todas' ? E.proy.paginas : [E.pagina()], base = nombreBase(), ext = o.formato, ar = [];
    return pags.reduce(function (pr, pg, i) {
      return pr.then(function () { if (progreso) progreso(i, pags.length); return X.pagina(pg, o).then(function (b) { ar.push({ nombre: base + (pags.length > 1 ? '-' + (i + 1) : '') + '.' + ext, blob: b }); }); });
    }, Promise.resolve()).then(function () {
      if (ar.length === 1) { IM.descargar(ar[0].blob, ar[0].nombre); return ar[0].nombre; }
      return Promise.all(ar.map(function (a) { return aU8(a.blob).then(function (d) { return { nombre: a.nombre, datos: d }; }); })).then(function (fs) {
        var z = new Blob([window.Zip.crear(fs)], { type: 'application/zip' }); IM.descargar(z, base + '.zip'); return base + '.zip';
      });
    });
  };
  /* lote: todas las paginas x tamanos de redes (cubrir y centrar) en un ZIP. o: {formato, calidad, tamanos:[ids], paginas, escala} */
  X.lote = function (o, progreso) {
    var pags = o.paginas === 'todas' ? E.proy.paginas : [E.pagina()], objetivos = (o.tamanos && o.tamanos.length ? o.tamanos : [null]).map(function (id) { return id ? Redes.buscar(id) : null; }), tareas = [];
    pags.forEach(function (pg, i) { objetivos.forEach(function (r) { tareas.push({ pg: pg, i: i, r: r }); }); });
    var fs = [], base = nombreBase();
    return tareas.reduce(function (pr, t, n) {
      return pr.then(function () {
        if (progreso) progreso(n, tareas.length);
        var tw = t.r ? t.r.w : Math.round(t.pg.w * (o.escala || 1)), th = t.r ? t.r.h : Math.round(t.pg.h * (o.escala || 1));
        var k = Math.max(tw / t.pg.w, th / t.pg.h);
        return X.lienzoPagina(t.pg, k, o.formato).then(function (cv) {
          var out = IM.lienzo(tw, th), x = out.getContext('2d'); if (o.formato === 'jpg') { x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th); }
          x.drawImage(cv, (tw - cv.width) / 2, (th - cv.height) / 2); return aBlob(out, o.formato, (o.calidad || 90) / 100);
        }).then(aU8).then(function (d) { fs.push({ nombre: (t.r ? t.r.id + '/' : '') + base + (pags.length > 1 ? '-p' + (t.i + 1) : '') + (t.r ? '-' + t.r.w + 'x' + t.r.h : '') + '.' + o.formato, datos: d }); });
      });
    }, Promise.resolve()).then(function () {
      var z = new Blob([window.Zip.crear(fs)], { type: 'application/zip' }); IM.descargar(z, base + '-lote.zip'); return fs.length;
    });
  };
  X.copiar = function () {
    return X.pagina(E.pagina(), { formato: 'png', escala: 1 }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); });
  };
})(window.IM);
