/* Proyectos guardados en IndexedDB: autoguardado, miniaturas, duplicar, renombrar, papelera, recuperacion. */
(function (IM) {
  var E = IM.E, A = IM.Almacen, Doc = IM.Doc, Pix = Doc.Pix, P = IM.Proy = { estado: 'guardado' }, temporizador = 0, guardando = null, DIAS = 30 * 864e5;
  function estado(s) { P.estado = s; E.emit('guardado', s); }
  function aBlob(cv) { return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/png'); }); }
  function cargarPix(proy) {
    var usados = Object.keys(Doc.pixUsados(proy));
    return Promise.all(usados.map(function (id) {
      if (Pix.tiene(id)) return null;
      return A.get('pix', proy.id + ':' + id).then(function (b) {
        if (!b) return null;
        return (window.createImageBitmap ? createImageBitmap(b) : Promise.reject()).then(function (bm) { var c = IM.lienzo(bm.width, bm.height); c.getContext('2d').drawImage(bm, 0, 0); Pix.nuevo(c, id).toString(); Pix.reg(id).sucio = false; }, function () { });
      });
    }));
  }
  P.guardar = function () {
    clearTimeout(temporizador);
    if (guardando) { return guardando.then(function () { return P.guardar(); }); }
    var proy = E.proy; if (!proy) return Promise.resolve();
    estado('guardando'); E.sucioDoc = false;
    var usados = Doc.pixUsados(proy), tareas = [];
    Object.keys(usados).forEach(function (id) { var r = Pix.reg(id); if (r && r.sucio) { r.sucio = false; tareas.push(aBlob(r.canvas).then(function (b) { return A.set('pix', proy.id + ':' + id, b); })); } });
    var mini = '';
    try { mini = IM.Vista.miniatura(proy.paginas[0], 360).toDataURL('image/jpeg', 0.72); } catch (e) {}
    guardando = Promise.all(tareas).then(function () {
      return Promise.all([A.set('proyectos', 'd:' + proy.id, JSON.parse(JSON.stringify(proy))), A.set('proyectos', 'm:' + proy.id, { id: proy.id, nombre: proy.nombre, creado: proy.creado, miniatura: mini, paginas: proy.paginas.length, w: proy.paginas[0].w, h: proy.paginas[0].h, borrado: proy.borrado || null })]);
    }).then(function () { guardando = null; A.lsSet('ultimo', proy.id); estado(E.sucioDoc ? 'pendiente' : 'guardado'); if (E.sucioDoc) P.programar(); },
      function (e) { guardando = null; estado('error'); IM.aviso('No se pudo guardar: ' + (e && e.message || e), 'error'); });
    return guardando;
  };
  P.programar = function () { estado('pendiente'); clearTimeout(temporizador); temporizador = setTimeout(P.guardar, 1200); };
  P.lista = function (papelera) {
    return A.lista('proyectos').then(function (l) {
      return l.filter(function (r) { return r.clave.indexOf('m:') === 0 && !!r.valor.borrado === !!papelera; }).map(function (r) { return r.valor; }).sort(function (a, b) { return (b.modificado || 0) - (a.modificado || 0); });
    });
  };
  P.abrir = function (id) {
    return A.get('proyectos', 'd:' + id).then(function (doc) {
      if (!doc) throw new Error('Proyecto no encontrado');
      return cargarPix(doc).then(function () { Pix.vaciarHuerfanos && 0; E.cargar(doc); A.lsSet('ultimo', id); estado('guardado'); return doc; });
    });
  };
  P.nuevo = function (w, h, nombre, fondo) {
    var pr = P.guardar().then(function () {
      var doc = Doc.proyecto(w, h, nombre); if (fondo !== undefined) doc.paginas[0].fondo = fondo;
      E.cargar(doc); return P.guardar();
    });
    return pr;
  };
  P.duplicar = function (id) {
    return A.get('proyectos', 'd:' + id).then(function (doc) {
      var n = JSON.parse(JSON.stringify(doc)), viejo = doc.id; n.id = IM.uid(); n.nombre = doc.nombre + ' (copia)'; n.creado = Date.now(); n.borrado = null;
      return A.claves('pix').then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k.indexOf(viejo + ':') === 0; }).map(function (k) { return A.get('pix', k).then(function (b) { return A.set('pix', n.id + ':' + k.slice(viejo.length + 1), b); }); }));
      }).then(function () { return A.get('proyectos', 'm:' + id); }).then(function (m) {
        return Promise.all([A.set('proyectos', 'd:' + n.id, n), A.set('proyectos', 'm:' + n.id, Object.assign({}, m, { id: n.id, nombre: n.nombre, creado: n.creado }))]);
      }).then(function () { return n.id; });
    });
  };
  function actualizarMeta(id, f) {
    return Promise.all([A.get('proyectos', 'm:' + id), A.get('proyectos', 'd:' + id)]).then(function (r) {
      var m = r[0], d = r[1]; if (!m) return; f(m, d); var ps = [A.set('proyectos', 'm:' + id, m)]; if (d) ps.push(A.set('proyectos', 'd:' + id, d)); return Promise.all(ps);
    });
  }
  P.renombrar = function (id, nombre) {
    if (E.proy && E.proy.id === id) { E.proy.nombre = nombre; P.programar(); return P.guardar(); }
    return actualizarMeta(id, function (m, d) { m.nombre = nombre; if (d) d.nombre = nombre; });
  };
  P.aPapelera = function (id) {
    if (E.proy && E.proy.id === id) E.proy.borrado = Date.now();
    return actualizarMeta(id, function (m, d) { m.borrado = Date.now(); if (d) d.borrado = m.borrado; });
  };
  P.restaurar = function (id) { return actualizarMeta(id, function (m, d) { m.borrado = null; if (d) d.borrado = null; }); };
  P.eliminar = function (id) {
    return A.claves('pix').then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf(id + ':') === 0; }).map(function (k) { return A.borrar('pix', k); })); })
      .then(function () { return Promise.all([A.borrar('proyectos', 'd:' + id), A.borrar('proyectos', 'm:' + id)]); });
  };
  P.vaciarPapelera = function () { return P.lista(true).then(function (l) { return Promise.all(l.map(function (m) { return P.eliminar(m.id); })); }); };
  P.purgar = function () { return P.lista(true).then(function (l) { return Promise.all(l.filter(function (m) { return Date.now() - m.borrado > DIAS; }).map(function (m) { return P.eliminar(m.id); })); }); };
  P.limpiarHuerfanos = function () {
    if (!E.proy) return Promise.resolve(); var id = E.proy.id, usados = Doc.pixUsados(E.proy);
    return A.claves('pix').then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf(id + ':') === 0 && !usados[k.slice(id.length + 1)]; }).map(function (k) { return A.borrar('pix', k); })); });
  };
  P.recuperar = function () {
    var ult = A.lsGet('ultimo', null);
    return A.abrir().then(function () { return ult ? P.abrir(ult).catch(function () { return false; }) : false; }).then(function (ok) {
      if (!ok) { E.cargar(Doc.proyecto(1280, 720, 'Sin título')); P.guardar(); }
      P.purgar(); setTimeout(P.limpiarHuerfanos, 4000); return !!ok;
    });
  };
  E.on('doc', function () { if (E.sucioDoc) P.programar(); });
  E.on('proyecto', function () { var n = document.getElementById('nombreProyecto'); if (n) n.value = E.proy.nombre; });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && P.estado !== 'guardado') P.guardar(); });
  window.addEventListener('pagehide', function () { if (P.estado !== 'guardado') P.guardar(); });
})(window.IM);
