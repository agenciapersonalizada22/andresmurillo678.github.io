/* Pestana Archivos: importar/exportar mallas y nubes, proyectos (Cuenta) y ajustes del dispositivo. window.R3D.VArchivos */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, R = g.R3D, A = R.App, D = R.Datos, W = R.VArchivos = {};
  var el = {};
  var UNIDADES = [['u', 'sin unidad'], ['mm', 'milímetros'], ['cm', 'centímetros'], ['m', 'metros'], ['pulg', 'pulgadas'], ['pie', 'pies']];
  function kb(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }

  /* ---------- importar ---------- */
  async function importar(files) {
    for (var i = 0; i < files.length; i++) {
      var f = files[i], ext = R.Formatos.extension(f.name);
      if (R.Formatos.TIPOS.indexOf(ext) < 0) { T.aviso('«' + f.name + '»: formato no soportado (usa OBJ, PLY, STL, glTF/GLB o CSV).', 'error'); continue; }
      if (f.size > 250 * 1048576) { T.aviso('«' + f.name + '» pesa ' + kb(f.size) + ': demasiado grande para el navegador.', 'error'); continue; }
      if (f.size > 60 * 1048576) T.aviso('«' + f.name + '» es grande (' + kb(f.size) + '); puede tardar y consumir memoria.');
      var rv = A.revisarMemoria(f.size * 3); if (!rv.ok) { T.aviso('«' + f.name + '»: no hay memoria suficiente (' + rv.uso.toFixed(0) + ' de ' + rv.limite + ' MB). Quita capas o sube el límite en Ajustes.', 'error'); continue; }
      try {
        el.estadoImp.textContent = 'Leyendo ' + f.name + '…'; var buf = await f.arrayBuffer(), m = await A.trabajar('leer', { nombre: f.name, datos: buf });
        var eje = el.eje.value, z = eje === 'z' || (eje === 'auto' && m.zArriba); if (z) R.Malla.ejeZaY(m);
        var max = +el.maxPts.value; if (!m.idx && max > 0 && m.pos.length / 3 > max) { var n0 = m.pos.length / 3; m = R.Malla.decimar(m, max); m.nombre = f.name.replace(/\.[^.]+$/, ''); T.aviso('Nube submuestreada de ' + n0.toLocaleString('es') + ' a ' + max.toLocaleString('es') + ' puntos.'); }
        if (el.centrar.checked) R.Malla.centrarBase(m);
        var c = A.anadirCapa(m, { nombre: m.nombre, origen: 'importado ' + ext.toUpperCase(), unidad: { nombre: el.unidad.value, k: 1 }, forzarUnidad: !A.capas.length || el.unidad.value !== 'u' });
        if (c) { el.estadoImp.textContent = f.name + ': ' + (m.idx ? R.Malla.nTri(m).toLocaleString('es') + ' triángulos' : m.pos.length / 3 + ' puntos') + (z ? ' · eje Z→Y aplicado' : '') + ((m.avisos && m.avisos.length) ? ' · aviso: ' + m.avisos.join('; ') : ''); A.logro('r3d_importo_malla'); if (m.avisos) m.avisos.forEach(function (a) { T.aviso(a); }); }
      } catch (e) { T.aviso('«' + f.name + '»: ' + e.message, 'error'); el.estadoImp.textContent = 'Error: ' + e.message; }
    }
  }
  /* ---------- exportar ---------- */
  function pintarSelExp() { var v = el.selExp.value; el.selExp.textContent = ''; A.capas.forEach(function (c) { el.selExp.appendChild(h('option', { value: c.id, txt: c.nombre })); }); if (A.capas.some(function (c) { return c.id === v; })) el.selExp.value = v; el.btnExp.disabled = !A.capas.length; }
  async function exportar() {
    var c = A.capas.filter(function (x) { return x.id === el.selExp.value; })[0]; if (!c) { T.aviso('No hay capa que exportar.', 'error'); return; }
    var f = el.fmt.value, esc = +el.escExp.value || 1, m = R.Malla.clonar(c.malla); if (esc !== 1) R.Malla.escalar(m, esc);
    try { var bytes = await A.trabajar('exportar', { malla: m, formato: f, opts: { ejeZ: el.ejeExp.value === 'z', binario: el.bin.checked } }), mime = f === 'glb' ? 'model/gltf-binary' : f === 'csv' || f === 'obj' ? 'text/plain' : 'application/octet-stream'; T.descargar(new Blob([bytes], { type: mime }), T.nombreArchivo(c.nombre) + '.' + f); T.aviso('Exportado ' + f.toUpperCase() + ' (' + kb(bytes.length) + ').'); A.logro('r3d_exporto_' + f); }
    catch (e) { T.aviso(e.message, 'error'); }
  }
  /* ---------- proyectos ---------- */
  function resumenNube(rec) { var n = 0, l = 0; (rec.capas || []).forEach(function (c) { if (c.malla) n++; else l++; }); return n + ' en la cuenta, ' + l + ' solo en el dispositivo'; }
  async function guardar() {
    var Vz = R.Visor, nombre = el.nombre.value.trim() || 'Proyecto sin nombre', pid = A.proyecto.id || T.uid(), recs = [], embebido = 0, locales = 0, tope = 400000;
    el.btnGuardar.disabled = true;
    try {
      for (var i = 0; i < A.capas.length; i++) {
        var c = A.capas[i], co = R.Malla.compactar(c.malla), tam = JSON.stringify(co).length, info = { id: c.id, nombre: c.nombre, grupo: c.grupo, visible: c.visible, opacidad: c.opacidad, color: c.color, origen: c.origen, tipo: c.malla.tipo, tri: R.Malla.nTri(c.malla), vert: R.Malla.nVert(c.malla), bytes: R.Malla.bytes(c.malla) };
        if (tam <= D.LIM_NUBE && embebido + tam <= tope) { info.malla = co; embebido += tam; } else { await D.guardarMallaLocal(pid, c.id, c.malla); locales++; }
        recs.push(info);
      }
      var rec = { id: pid, nombre: nombre, notas: el.notas.value, unidad: A.unidad, plano: A.plano && A.plano.paredes.length ? A.plano : null, medidas: Vz ? Vz.medidas : [], anotaciones: Vz ? Vz.anotaciones : [], camara: Vz ? Vz.estadoCamara() : null, capas: recs, version: 1 };
      await D.guardarProyecto(rec); A.proyecto = { id: pid, nombre: nombre, notas: el.notas.value };
      T.aviso('Proyecto guardado: ' + resumenNube(rec) + (locales ? ' (las mallas pesadas no se suben: quedan solo aquí).' : '.')); A.logro('r3d_guardo_proyecto'); listar();
    } catch (e) { T.aviso('No se pudo guardar: ' + e.message, 'error'); } finally { el.btnGuardar.disabled = false; }
  }
  async function abrir(p) {
    var Vz = R.Visor; A.capas.slice().forEach(function (c) { A.quitarCapa(c.id); }); var faltan = 0;
    for (var i = 0; i < (p.capas || []).length; i++) {
      var c = p.capas[i], m = null; if (c.malla) m = R.Malla.descompactar(c.malla); else { var l = await D.mallaLocal(p.id, c.id); if (l) m = R.Malla.nueva(l.pos, l.idx, l.col, l.nombre); }
      if (!m) { faltan++; continue; } m.nombre = c.nombre; A.anadirCapa(m, { id: c.id, nombre: c.nombre, origen: c.origen, color: c.color, grupo: c.grupo, visible: c.visible, opacidad: c.opacidad });
    }
    A.proyecto = { id: p.id, nombre: p.nombre, notas: p.notas || '' }; el.nombre.value = p.nombre; el.notas.value = p.notas || ''; if (p.unidad) A.ponerUnidad(p.unidad.nombre, p.unidad.k);
    A.plano = p.plano || null; A.emitir('plano-cargado'); Vz.restaurarMedidas(p.medidas || [], p.anotaciones || []); Vz.restaurarCamara(p.camara); A.emitir('capas'); Vz.pedir();
    if (faltan) T.aviso(faltan + ' capa(s) pesadas no están en este dispositivo (solo se guardan donde se crearon).', 'error'); else T.aviso('Proyecto «' + p.nombre + '» abierto.'); A.irA('visor');
  }
  async function listar() {
    var l = el.lista; l.textContent = ''; var ps = await D.proyectos(); if (!ps.length) { l.appendChild(h('p', { cls: 'tr-vacio', txt: 'Aún no hay proyectos guardados.' })); return; }
    ps.forEach(function (p) { l.appendChild(h('div', { cls: 'tr-panel' }, [h('h3', { txt: p.nombre }), h('p', { cls: 'tr-ayuda', txt: (p.capas || []).length + ' capa(s) · ' + resumenNube(p) + ' · ' + (p.medidas || []).length + ' medida(s) · ' + (p.anotaciones || []).length + ' nota(s) · ' + new Date(p._t || Date.now()).toLocaleString('es') }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Abrir', 'aria-label': 'Abrir ' + p.nombre, on: { click: function () { abrir(p); } } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar', 'aria-label': 'Borrar ' + p.nombre, on: { click: async function () { if (confirm('¿Borrar «' + p.nombre + '»?')) { await D.borrarProyecto(p.id); if (A.proyecto.id === p.id) A.proyecto.id = null; listar(); } } } })])])); });
  }
  /* ---------- ajustes ---------- */
  function capacidades() {
    var gl = !!(R.Visor && R.Visor.listo), r = [['WebGL (visor)', gl], ['Worker (cálculo fuera de la interfaz)', A.hayWorker()], ['Cámara', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)], ['Grabación de video', typeof MediaRecorder !== 'undefined'], ['WebXR immersive-vr', !!(R.Visor && R.Visor.xr && R.Visor.xr.soportado)], ['Mando conectado', !!(g.Mando && g.Mando.conectado)], ['IndexedDB (proyectos)', R.Datos.alm.persistente]];
    el.caps.textContent = ''; r.forEach(function (x) { el.caps.appendChild(h('li', {}, [h('span', { txt: x[0] }), h('span', { cls: 'r3d-chip ' + (x[1] ? 'ok' : 'av'), txt: x[1] ? 'sí' : 'no' })])); }); el.caps.appendChild(h('li', {}, [h('span', { txt: 'Memoria del dispositivo (aprox.)' }), h('span', { cls: 'r3d-chip', txt: navigator.deviceMemory ? '≥ ' + navigator.deviceMemory + ' GB' : 'desconocida' })]));
  }
  W.iniciar = function (raiz) {
    var a = A.ajustes();
    el.eje = h('select', { 'aria-label': 'Eje vertical del archivo' }, [['auto', 'Eje vertical: según el formato (STL y CSV usan Z arriba)'], ['y', 'Y arriba'], ['z', 'Z arriba (CAD, LiDAR)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    el.unidad = h('select', { 'aria-label': 'Unidad del archivo' }, UNIDADES.map(function (u) { return h('option', { value: u[0], txt: 'Unidad del archivo: ' + u[1], selected: u[0] === 'm' }); })); el.centrar = h('input', { type: 'checkbox' }); el.maxPts = h('input', { type: 'number', min: 0, step: 100000, value: 2000000, inputmode: 'numeric' }); el.estadoImp = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    var fin = h('input', { type: 'file', multiple: true, accept: '.obj,.ply,.stl,.gltf,.glb,.csv,.txt,.xyz,.pts', hidden: true, id: 'in-malla' }); fin.addEventListener('change', function () { importar(Array.prototype.slice.call(fin.files)); fin.value = ''; });
    var drop = h('div', { cls: 'tr-nota', tabindex: 0, role: 'button', 'aria-label': 'Soltar archivos aquí o pulsar para elegir', txt: 'Suelta aquí archivos OBJ, PLY, STL, glTF/GLB o CSV/XYZ de puntos (también LiDAR exportado), o pulsa para elegir.', on: { click: function () { fin.click(); }, keydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fin.click(); } }, dragover: function (e) { e.preventDefault(); }, drop: function (e) { e.preventDefault(); importar(Array.prototype.slice.call(e.dataTransfer.files)); } } }); drop.style.cursor = 'pointer';
    el.selExp = h('select', { 'aria-label': 'Capa a exportar' }); el.fmt = h('select', { 'aria-label': 'Formato' }, [['obj', 'OBJ (texto, con color de vértice)'], ['ply', 'PLY (malla o nube, con color)'], ['stl', 'STL (solo mallas, para imprimir)'], ['glb', 'GLB (glTF binario)'], ['csv', 'CSV de puntos (x,y,z,r,g,b)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    el.ejeExp = h('select', { 'aria-label': 'Eje vertical al exportar' }, [h('option', { value: 'y', txt: 'Exportar con Y arriba' }), h('option', { value: 'z', txt: 'Exportar con Z arriba (CAD, impresión 3D)' })]); el.bin = h('input', { type: 'checkbox', checked: true }); el.escExp = h('input', { type: 'number', step: 'any', value: 1, min: 0, inputmode: 'decimal', 'aria-label': 'Factor de escala al exportar' });
    el.btnExp = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Descargar', on: { click: exportar } });
    el.nombre = h('input', { type: 'text', value: A.proyecto.nombre, maxlength: 80, 'aria-label': 'Nombre del proyecto' }); el.notas = h('textarea', { 'aria-label': 'Notas del proyecto', placeholder: 'Notas (opcional)' }); el.btnGuardar = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar proyecto', on: { click: guardar } }); el.lista = h('div');
    el.cuenta = h('div', { id: 'aj-cuenta' });
    el.lado = h('select', { 'aria-label': 'Tamaño de trabajo de las fotos' }, [320, 480, 640, 800, 1024].map(function (v) { return h('option', { value: v, txt: v + ' px (lado mayor)', selected: v === a.lado }); })); el.lim = h('input', { type: 'number', min: 100, max: 4000, step: 50, value: a.limiteMB, inputmode: 'numeric' }); el.maxTri = h('input', { type: 'number', min: 100000, step: 100000, value: a.maxTri, inputmode: 'numeric' });
    el.caps = h('ul', { cls: 'r3d-lista' });
    var btnAj = h('button', { type: 'button', cls: 'tr-btn', txt: 'Guardar ajustes', on: { click: function () { D.guardarAjustes({ lado: +el.lado.value, limiteMB: +el.lim.value, maxTri: +el.maxTri.value, fondo: R.Visor && R.Visor.opc ? R.Visor.opc.fondo : 'auto' }); T.aviso('Ajustes guardados en este dispositivo (no se sincronizan).'); A.emitir('fotos'); A.emitir('capas'); } } });
    raiz.appendChild(h('div', { cls: 'r3d-grid' }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Importar modelos y nubes' }), fin, drop, el.eje, el.unidad, h('label', { cls: 'tr-chk' }, [el.centrar, 'Centrar y apoyar en el suelo']), h('label', { txt: 'Submuestrear nubes por encima de (puntos, 0 = no)' }), el.maxPts, el.estadoImp, h('p', { cls: 'tr-ayuda', txt: 'glTF/GLB: se leen mallas y puntos con color de vértice o color base; las texturas de imagen y la compresión Draco no están soportadas. CSV/XYZ: detecta X,Y,Z, color y la intensidad (LiDAR).' })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Exportar' }), el.selExp, el.fmt, el.ejeExp, h('label', { cls: 'tr-chk' }, [el.bin, 'Binario (PLY y STL)']), h('label', { txt: 'Multiplicar coordenadas por' }), el.escExp, h('div', { cls: 'tr-acciones' }, [el.btnExp]), h('p', { cls: 'tr-ayuda', txt: 'OBJ/GLB/PLY conservan el color de vértice; STL no tiene color. Las nubes no se pueden exportar a STL.' })])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Proyectos' }), h('p', { cls: 'tr-nota tr-av', txt: 'En tu cuenta se guardan los metadatos, medidas, notas, el plano y las mallas pequeñas (≤ 150 KB cada una, cuantizadas). Las mallas pesadas y todas las fotos se quedan solo en este dispositivo.' }), h('label', { txt: 'Nombre' }), el.nombre, h('label', { txt: 'Notas' }), el.notas, h('div', { cls: 'tr-acciones' }, [el.btnGuardar]), el.lista]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Cuenta y sincronización' }), el.cuenta]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Ajustes de este dispositivo' }), h('label', { txt: 'Tamaño de trabajo de las fotos' }), el.lado, h('label', { txt: 'Límite de memoria del visor (MB)' }), el.lim, h('label', { txt: 'Aviso por modelos de más de (triángulos)' }), el.maxTri, h('div', { cls: 'tr-acciones' }, [btnAj]), h('h3', { txt: 'Capacidades detectadas' }), el.caps])])]));
    A.on('capas', pintarSelExp); pintarSelExp(); listar(); capacidades(); setTimeout(capacidades, 1500);
    W.listar = listar;
  };
})(window);
