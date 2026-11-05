/* Estado y operaciones del editor (capas, historial, paginas, importacion). */
(function (IM) {
  var Doc = IM.Doc, Pix = Doc.Pix, R = IM.Render, Geo = window.Geometria, Matriz = window.Matriz;
  var cbs = {};
  var E = IM.E = {
    proy: null, pi: 0, sel: [], herr: 'seleccionar', color: '#e11d48', color2: '#ffffff', base: null,
    vista: { x: 0, y: 0, k: 1 }, historial: new window.Historial(), editMascara: false, seleccionPx: null,
    pincel: { tam: 28, dureza: 0.7, opacidad: 1, flujo: 1, suav: 0.35, presion: true },
    opciones: { tolVarita: 32, tolRelleno: 24, contiguo: true, formaActual: 'rect' }, rapido: false, sucioDoc: false
  };
  E.on = function (e, f) { (cbs[e] = cbs[e] || []).push(f); };
  E.emit = function (e, a) { (cbs[e] || []).forEach(function (f) { try { f(a); } catch (er) { console.error(er); } }); };
  E.pagina = function () { return E.proy.paginas[E.pi]; };
  E.capaPorId = function (id) { var r = Doc.buscar(E.pagina().capas, id); return r ? r.capa : null; };
  E.capasSel = function () { var p = E.pagina(); return E.sel.map(function (id) { var r = Doc.buscar(p.capas, id); return r && r.capa; }).filter(Boolean); };
  E.dibujar = function () { E.emit('dibujar'); };

  /* ---------- historial ---------- */
  function mkCmd(nombre, clave, pagId, d) {
    var c = {
      nombre: nombre, clave: clave, pagId: pagId, d: d,
      aplicar: function (dir) {
        var i = E.proy.paginas.findIndex(function (p) { return p.id === c.pagId; }); if (i < 0) return;
        E.pi = i; var p = E.pagina(); Doc.aplicar(p, Doc.parche(Doc.instantanea(p), c.d, dir)); despues();
      },
      hacer: function () { c.aplicar(1); }, deshacer: function () { c.aplicar(0); },
      fusionar: function (n) { if (n.pagId !== c.pagId) return false; c.d = Doc.fusionarDiff(c.d, n.d); c.nombre = n.nombre; return true; },
      compactar: function () { if (c.d) { c._s = JSON.stringify(c.d); c.d = null; } },
      descompactar: function () { if (c._s) { c.d = JSON.parse(c._s); c._s = null; } }
    };
    return c;
  }
  function despues() {
    E.base = Doc.instantanea(E.pagina());
    E.sel = E.sel.filter(function (id) { return !!E.capaPorId(id); });
    E.sucioDoc = true; E.emit('doc'); E.emit('sel'); E.dibujar();
  }
  /* registra el cambio hecho desde el ultimo punto de control */
  E.cambio = function (nombre, clave) {
    var p = E.pagina(), nuevo = Doc.instantanea(p), d = Doc.diff(E.base, nuevo);
    if (!d) { E.dibujar(); return; }
    E.base = nuevo; E.historial.registrar(mkCmd(nombre, clave, p.id, d)); E.sucioDoc = true;
    E.emit('doc'); E.dibujar();
  };
  E.cambioDoc = function (nombre, fn) {
    var antes = JSON.stringify(E.proy.paginas), pi = E.pi; fn(); var despuesS = JSON.stringify(E.proy.paginas);
    if (antes === despuesS) return;
    var pi2 = E.pi;
    function poner(s, i) { E.proy.paginas = JSON.parse(s); E.pi = Math.min(i, E.proy.paginas.length - 1); E.base = Doc.instantanea(E.pagina()); E.sel = []; E.sucioDoc = true; E.emit('doc'); E.emit('sel'); E.emit('paginas'); E.dibujar(); }
    E.historial.registrar({ nombre: nombre, hacer: function () { poner(despuesS, pi2); }, deshacer: function () { poner(antes, pi); } });
    E.base = Doc.instantanea(E.pagina()); E.sucioDoc = true; E.emit('doc'); E.emit('sel'); E.emit('paginas'); E.dibujar();
  };
  /* comando arbitrario ya aplicado (p. ej. pinceladas por teselas) */
  E.registrarCmd = function (c) { E.historial.registrar(c); E.sucioDoc = true; E.emit('doc'); E.dibujar(); };
  E.deshacer = function () { E.historial.deshacer(); };
  E.rehacer = function () { E.historial.rehacer(); };
  E.historial.on(function () { E.emit('hist'); });

  /* ---------- proyecto ---------- */
  E.cargar = function (proy) {
    E.proy = proy; E.pi = 0; E.sel = []; E.historial.vaciar(); E.seleccionPx = null; E.editMascara = false;
    E.base = Doc.instantanea(E.pagina()); E.sucioDoc = false;
    E.emit('proyecto'); E.emit('paginas'); E.emit('doc'); E.emit('sel'); E.emit('ajustar'); E.dibujar();
  };
  E.irPagina = function (i) {
    if (i < 0 || i >= E.proy.paginas.length) return; E.pi = i; E.sel = []; E.seleccionPx = null; E.base = Doc.instantanea(E.pagina());
    E.emit('paginas'); E.emit('doc'); E.emit('sel'); E.emit('ajustar'); E.dibujar();
  };
  E.nuevaPagina = function (dup) {
    E.cambioDoc(dup ? 'Duplicar página' : 'Nueva página', function () {
      var a = E.pagina(), n;
      if (dup) { n = JSON.parse(JSON.stringify(a)); n.id = IM.uid(); n.capas = a.capas.map(Doc.clonar); } else n = Doc.pagina(a.w, a.h, JSON.parse(JSON.stringify(a.fondo)));
      E.proy.paginas.splice(E.pi + 1, 0, n); E.pi++;
    });
  };
  E.borrarPagina = function () {
    if (E.proy.paginas.length < 2) { IM.aviso('Debe quedar al menos una página'); return; }
    E.cambioDoc('Eliminar página', function () { E.proy.paginas.splice(E.pi, 1); E.pi = Math.min(E.pi, E.proy.paginas.length - 1); });
  };
  E.moverPagina = function (d) {
    var j = E.pi + d; if (j < 0 || j >= E.proy.paginas.length) return;
    E.cambioDoc('Mover página', function () { var a = E.proy.paginas; var t = a[E.pi]; a[E.pi] = a[j]; a[j] = t; E.pi = j; });
  };

  /* ---------- seleccion ---------- */
  E.seleccionar = function (ids, anadir) {
    ids = ids ? (Array.isArray(ids) ? ids : [ids]) : [];
    if (anadir) { var s = E.sel.slice(); ids.forEach(function (id) { var i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else s.push(id); }); ids = s; }
    if (ids.join() === E.sel.join()) return;
    E.sel = ids; if (!ids.length || (E.editMascara && !(E.capasSel()[0] || {}).mascara)) E.editMascara = false;
    E.emit('sel'); E.dibujar();
  };
  E.unaSel = function () { var c = E.capasSel(); return c.length === 1 ? c[0] : null; };
  E.hit = function (px, py) {
    var capas = E.pagina().capas;
    for (var i = capas.length - 1; i >= 0; i--) {
      var c = capas[i]; if (!c.visible || c.bloqueada || c.tipo === 'ajuste') continue;
      var inv = Matriz.inv(Doc.matriz(c)); if (!inv) continue;
      var l = Matriz.punto(inv, px, py), m = c.tipo === 'texto' ? 0 : 0;
      if (Math.abs(l.x) <= c.w / 2 + m && Math.abs(l.y) <= c.h / 2 + m) return c;
    }
    return null;
  };

  /* ---------- capas ---------- */
  E.agregar = function (capa, opt) {
    opt = opt || {}; var p = E.pagina();
    if (capa.tipo === 'texto' && capa._arriba) R.ajustarTexto(capa); else if (capa.tipo === 'texto') R.ajustarTexto(capa);
    if (opt.centrar !== false && !opt.pos && capa.x === 0 && capa.y === 0) { capa.x = p.w / 2; capa.y = p.h / 2; }
    var idx = opt.indice != null ? opt.indice : p.capas.length;
    if (opt.sobreSel) { var s = E.unaSel(); if (s) { var r = Doc.buscar(p.capas, s.id); if (r && !r.padre) idx = r.indice + 1; } }
    p.capas.splice(idx, 0, capa); E.sel = [capa.id]; E.emit('sel');
    E.cambio(opt.nombre || ('Añadir ' + capa.nombre.toLowerCase()));
    return capa;
  };
  E.eliminarSel = function () {
    var p = E.pagina(); if (!E.sel.length) return;
    E.sel.forEach(function (id) { var r = Doc.buscar(p.capas, id); if (r && !r.capa.bloqueada) r.lista.splice(r.indice, 1); });
    E.sel = []; E.emit('sel'); E.cambio('Eliminar capa');
  };
  E.duplicarSel = function () {
    var p = E.pagina(), nuevos = [];
    E.capasSel().forEach(function (c) {
      var n = Doc.clonar(c), r = Doc.buscar(p.capas, c.id); n.x += 24; n.y += 24; n.nombre = c.nombre + ' copia'; r.lista.splice(r.indice + 1, 0, n); nuevos.push(n.id);
    });
    if (nuevos.length) { E.sel = nuevos; E.emit('sel'); E.cambio('Duplicar'); }
  };
  E.ordenar = function (modo) {
    var p = E.pagina();
    E.capasSel().slice().sort(function (a, b) { return modo === 'arriba' || modo === 'frente' ? Doc.buscar(p.capas, b.id).indice - Doc.buscar(p.capas, a.id).indice : Doc.buscar(p.capas, a.id).indice - Doc.buscar(p.capas, b.id).indice; }).forEach(function (c) {
      var r = Doc.buscar(p.capas, c.id), l = r.lista, i = r.indice, j = modo === 'arriba' ? Math.min(l.length - 1, i + 1) : modo === 'abajo' ? Math.max(0, i - 1) : modo === 'frente' ? l.length - 1 : 0;
      l.splice(i, 1); l.splice(j, 0, c);
    });
    E.cambio('Cambiar orden'); E.emit('sel');
  };
  E.moverCapaA = function (id, destino) {
    var p = E.pagina(), r = Doc.buscar(p.capas, id); if (!r || r.padre) return;
    var c = r.lista.splice(r.indice, 1)[0]; p.capas.splice(Math.max(0, Math.min(destino, p.capas.length)), 0, c); E.cambio('Reordenar capas');
  };
  E.agrupar = function () {
    var cs = E.capasSel().filter(function (c) { return !Doc.buscar(E.pagina().capas, c.id).padre; }), p = E.pagina();
    if (cs.length < 2) { IM.aviso('Selecciona 2 o más capas'); return; }
    var cajas = cs.map(Doc.caja), u = Geo.unir(cajas), cx = u.x + u.w / 2, cy = u.y + u.h / 2;
    var idx = Math.max.apply(null, cs.map(function (c) { return Doc.buscar(p.capas, c.id).indice; }));
    var orden = p.capas.filter(function (c) { return cs.indexOf(c) >= 0; });
    p.capas = p.capas.filter(function (c) { return cs.indexOf(c) < 0; });
    orden.forEach(function (c) { c.x -= cx; c.y -= cy; });
    var g = Doc.capa('grupo', { x: cx, y: cy, w: u.w, h: u.h, hijos: orden, nombre: 'Grupo' });
    p.capas.splice(Math.min(p.capas.length, idx - cs.length + 1), 0, g); E.sel = [g.id]; E.emit('sel'); E.cambio('Agrupar');
  };
  E.desagrupar = function () {
    var p = E.pagina(), nuevos = [];
    E.capasSel().forEach(function (g) {
      if (g.tipo !== 'grupo') return; var r = Doc.buscar(p.capas, g.id), m = Doc.matriz(g);
      var hs = g.hijos.map(function (h) {
        var mm = Matriz.mul(m, Doc.matriz(h)), d = Matriz.descomponer(mm); h.x = d.x; h.y = d.y; h.rot = d.rot; h.opacidad *= g.opacidad;
        h.flipX = h.flipX !== (g.flipX); h.flipY = h.flipY !== (g.flipY); return h;
      });
      r.lista.splice.apply(r.lista, [r.indice, 1].concat(hs)); hs.forEach(function (h) { nuevos.push(h.id); });
    });
    if (nuevos.length) { E.sel = nuevos; E.emit('sel'); E.cambio('Desagrupar'); }
  };
  E.alinearSel = function (modo, aPagina) {
    var cs = E.capasSel().filter(function (c) { return !Doc.buscar(E.pagina().capas, c.id).padre; }); if (!cs.length) return;
    var cajas = cs.map(Doc.caja), p = E.pagina(), ref = (aPagina || cs.length === 1) ? { x: 0, y: 0, w: p.w, h: p.h } : null;
    Geo.alinear(cajas, modo, ref).forEach(function (d, i) { cs[i].x += d.dx; cs[i].y += d.dy; });
    E.cambio('Alinear');
  };
  E.distribuirSel = function (eje) {
    var cs = E.capasSel(); if (cs.length < 3) { IM.aviso('Selecciona 3 o más capas'); return; }
    Geo.distribuir(cs.map(Doc.caja), eje).forEach(function (d, i) { cs[i].x += d.dx; cs[i].y += d.dy; }); E.cambio('Distribuir');
  };
  E.voltear = function (eje) { E.capasSel().forEach(function (c) { if (eje === 'h') c.flipX = !c.flipX; else c.flipY = !c.flipY; }); E.cambio('Voltear'); };
  E.nombrePropio = function (c, n) { c.nombre = n; E.cambio('Renombrar capa'); };

  /* ---------- pixeles ---------- */
  E.capaPixeles = function (cv, nombre, w, h) {
    var id = Pix.nuevo(cv);
    return Doc.capa('imagen', { px: id, w: w || cv.width, h: h || cv.height, nombre: nombre || 'Imagen' });
  };
  E.capaVacia = function (nombre) {
    var p = E.pagina(), esc = Math.min(1, 4096 / Math.max(p.w, p.h)), cv = IM.lienzo(p.w * esc, p.h * esc);
    var c = E.capaPixeles(cv, nombre || 'Pintura', p.w, p.h); c.x = p.w / 2; c.y = p.h / 2; return c;
  };
  function cargarImagen(fuente) {
    return new Promise(function (ok, no) {
      if (window.createImageBitmap && fuente instanceof Blob) { createImageBitmap(fuente).then(ok, function () { viaImg(); }); } else viaImg();
      function viaImg() { var u = fuente instanceof Blob ? URL.createObjectURL(fuente) : fuente, im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { no(new Error('No se pudo leer la imagen')); }; im.src = u; }
    });
  }
  E.importarArchivo = function (file, opt) {
    opt = opt || {};
    return cargarImagen(file).then(function (im) {
      var w = im.width || im.naturalWidth, h = im.height || im.naturalHeight, k = Math.min(1, 4096 / Math.max(w, h)), cv = IM.lienzo(w * k, h * k);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      var p = E.pagina(), f = Math.min(p.w * 0.9 / cv.width, p.h * 0.9 / cv.height, opt.cubrir ? 99 : 1e9);
      if (opt.cubrir) f = Math.max(p.w / cv.width, p.h / cv.height);
      var c = E.capaPixeles(cv, (file.name || 'Imagen').replace(/\.[^.]+$/, ''), cv.width * f, cv.height * f); c.x = p.w / 2; c.y = p.h / 2;
      return E.agregar(c, { nombre: 'Importar imagen' });
    });
  };
  E.importarVarios = function (files) {
    var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(f.name); });
    if (!imgs.length) { IM.aviso('No hay imágenes en lo que soltaste', 'error'); return Promise.resolve(); }
    return imgs.reduce(function (pr, f) { return pr.then(function () { return E.importarArchivo(f); }); }, Promise.resolve()).catch(function (e) { IM.aviso(e.message, 'error'); });
  };
  /* aplicar operaciones de filtro destructivas a la capa de imagen (Worker) */
  E.filtrarCapa = function (capa, ops, nombre) {
    var cv = Pix.get(capa.px); if (!cv) return Promise.resolve();
    var n = IM.lienzo(cv.width, cv.height); n.getContext('2d').drawImage(cv, 0, 0);
    return IM.Trabajo.ops(n, ops).then(function () { capa.px = Pix.nuevo(n); E.cambio(nombre || 'Filtro'); });
  };
  E.rasterizar = function (capa) {
    if (capa.tipo === 'imagen') return;
    var esc = Math.min(2, 4096 / Math.max(capa.w, capa.h)), cv = IM.lienzo(Math.ceil(capa.w * esc), Math.ceil(capa.h * esc)), x = cv.getContext('2d');
    var clon = JSON.parse(JSON.stringify(capa)); clon.x = capa.w / 2; clon.y = capa.h / 2; clon.rot = 0; clon.flipX = clon.flipY = false; clon.opacidad = 1; clon.mezcla = 'normal'; clon.sombra = null; clon.mascara = null; clon.recorte = null;
    if (clon.hijos) { /* grupo: se dibuja con su caja */ }
    x.scale(esc, esc); R.pintar(x, { w: capa.w, h: capa.h, fondo: null, capas: [clon], guias: [] }, {});
    var ids = ['tipo', 'px']; var px = Pix.nuevo(cv);
    ['texto', 'fuente', 'tam', 'peso', 'cursiva', 'color', 'relleno', 'alin', 'interlineado', 'espaciado', 'contorno', 'curva', 'trazo', 'mayus', 'subrayado', 'forma', 'lados', 'puntas', 'interior', 'radio', 'icono', 'cola', 'punta', 'hijos', 'm', 'borde', 'fg', 'bg'].forEach(function (k) { delete capa[k]; });
    capa.tipo = 'imagen'; capa.px = px; E.cambio('Rasterizar');
  };
  E.recortarLienzo = function (r, ancho, alto) {
    var p = E.pagina(), k = ancho ? ancho / r.w : 1;
    E.cambioDoc('Recortar lienzo', function () {
      p.capas.forEach(function (c) { c.x -= r.x; c.y -= r.y; if (k !== 1) Doc.escalar(c, k, 0, 0); });
      p.guias = [];
      p.w = Math.round(ancho || r.w); p.h = Math.round(alto || r.h * k);
    });
    E.emit('ajustar');
  };
  E.redimensionarLienzo = function (w, h, escalarContenido) {
    var p = E.pagina(); w = IM.clamp(Math.round(w), 16, 4096); h = IM.clamp(Math.round(h), 16, 4096);
    E.cambioDoc('Tamaño del lienzo', function () {
      var k = Math.min(w / p.w, h / p.h);
      if (escalarContenido) p.capas.forEach(function (c) { c.x += (w - p.w) / 2; c.y += (h - p.h) / 2; Doc.escalar(c, k, w / 2, h / 2); });
      else p.capas.forEach(function (c) { c.x += (w - p.w) / 2; c.y += (h - p.h) / 2; });
      p.w = w; p.h = h;
    });
    E.emit('ajustar');
  };
  E.nuevaMascara = function (capa, desdeSel) {
    var mw = Math.min(1024, Math.ceil(capa.w)), mh = Math.min(1024, Math.ceil(capa.h)), cv = IM.lienzo(mw, mh), x = cv.getContext('2d');
    if (capa.tipo === 'imagen') { var px = Pix.get(capa.px); if (px) { cv.width = Math.min(px.width, 2048); cv.height = Math.round(cv.width * px.height / px.width); x = cv.getContext('2d'); } }
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (desdeSel && E.seleccionPx && E.seleccionPx.id === capa.id) {
      var s = E.seleccionPx, tmp = IM.lienzo(s.w, s.h), tx = tmp.getContext('2d'), id = tx.createImageData(s.w, s.h);
      for (var i = 0; i < s.mask.length; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = s.mask[i]; }
      tx.putImageData(id, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(tmp, 0, 0, cv.width, cv.height);
    }
    capa.mascara = Pix.nuevo(cv); E.cambio('Añadir máscara');
  };
  E.centrarVista = function () { E.emit('ajustar'); };

  /* aplica recorte en lienzo de una capa de imagen a una proporcion (centrado) */
  E.recortarCapaProporcion = function (capa, ratio) {
    var cv = Pix.get(capa.px); if (!cv) return;
    var d = Geo.ajustarProporcion(cv.width, cv.height, ratio, 'cubrir'), n = IM.lienzo(d.w, d.h);
    n.getContext('2d').drawImage(cv, (cv.width - d.w) / 2, (cv.height - d.h) / 2, d.w, d.h, 0, 0, d.w, d.h);
    var f = capa.w / cv.width; capa.px = Pix.nuevo(n); capa.w = d.w * f; capa.h = d.h * f; E.cambio('Recortar imagen');
  };
})(window.IM);
