/* Pestana Objetos: primitivas, modelos de Reconstruccion 3D (IndexedDB del navegador) o archivos OBJ/GLB/PLY/STL/CSV, propiedades y escala real. window.RA.VObjetos */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, A = RA.App, V = RA.VObjetos = {};
  var el = {}, E = null;
  async function motor() { if (E && E.listo) return E; await new Promise(function (r) { A.con3d(r); }); E = RA.E3; if (!E.init()) { T.aviso('Sin WebGL no se pueden usar objetos 3D en este navegador.', 'error'); return null; } return E; }
  function mm() { return A.aj.ladoMm; }
  async function ponerMalla(m, nombre, id, guardar) {
    var e = await motor(); if (!e) return; id = id || 'm' + T.uid(); m.id = id; e.registrarMalla(id, m);
    if (guardar) { try { await RA.Datos.guardarModelo({ id: id, nombre: nombre, tipo: m.tipo, pos: m.pos, idx: m.idx, col: m.col, zArriba: m.zArriba }); } catch (er) { T.aviso('El modelo se usa pero no cabe en el almacenamiento local.', 'error'); } }
    var d = e.agregar({ tipo: 'malla', modeloId: id, nombre: nombre }); if (d) { T.aviso('«' + nombre + '» está en la escena (verlo en En vivo o Visor).'); A.logro('ra_modelo_en_escena'); V.refrescar(); if (RA.VVivo) RA.VVivo.pedir(); }
  }
  async function importar(f) {
    if (!(RA.R3DFormatos)) { T.aviso('No cargó el lector de formatos de Reconstrucción 3D.', 'error'); return; }
    try { var m = RA.R3DFormatos.leer(f.name, new Uint8Array(await f.arrayBuffer())); if (!m.pos || m.pos.length < 9) throw new Error('El archivo no tiene geometría.'); await ponerMalla(m, m.nombre || f.name, null, true); A.logro('ra_importo_modelo'); }
    catch (e) { T.aviso('No pude leer «' + f.name + '»: ' + e.message, 'error'); }
  }
  async function listarR3D() {
    el.r3d.innerHTML = ''; var l = []; try { l = await RA.Datos.mallasR3D(); } catch (e) { l = []; }
    if (!l.length) { el.r3d.appendChild(h('p', { cls: 'tr-vacio', txt: 'No hay modelos guardados de Reconstrucción 3D en este navegador. Crea uno allí (Archivos > Guardar proyecto) o importa un archivo.' })); return; }
    l.forEach(function (it) { el.r3d.appendChild(h('div', { cls: 'ra-fila ra-modelo' }, [h('span', { txt: it.nombre + ' · ' + (it.tri ? it.tri + ' tri' : (it.vert || 0) + ' pts') }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Poner en la escena', on: { click: async function () { try { var m = await it.obtener(); await ponerMalla(m, it.nombre, 'r3d_' + it.id.replace(/[^a-z0-9]/gi, '_'), true); A.logro('ra_modelo_de_reconstruccion'); } catch (e) { T.aviso('No pude cargar ese modelo: ' + e.message, 'error'); } } } })])); });
  }
  V.refrescar = function () {
    if (!el.props) return; el.props.innerHTML = ''; var e = RA.E3 && RA.E3.listo ? RA.E3 : null, d = e && e.sel && e.def(e.sel);
    el.lista.innerHTML = ''; if (e) e.objs.forEach(function (o, id) { el.lista.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'ra-capa', 'aria-pressed': e.sel === id, on: { click: function () { e.seleccionar(id); V.refrescar(); } } }, [h('span', { cls: 'ra-pto', txt: '▣' }), h('span', { txt: o.def.nombre })])])); });
    if (!e || !e.objs.size) el.lista.appendChild(h('li', { cls: 'tr-vacio', txt: 'La escena está vacía.' }));
    if (!d) { el.props.appendChild(h('p', { cls: 'tr-vacio', txt: 'Elige un objeto de la lista para editarlo.' })); return; }
    var dim = e.dimensiones(d.id), cm = dim.map(function (v) { return v * mm() / 10; });
    var rot = RA.Panel.rango('Giro (°)', 0, 359, 1, Math.round(d.rotY), function (v) { e.girar(d.id, v, true); }), esc = RA.Panel.rango('Escala', 0.1, 5, 0.05, +d.escala.toFixed(2), function (v) { e.escalar(d.id, v, true); lectura(); });
    var lect = h('p', { cls: 'tr-nota', 'aria-live': 'polite' });
    function lectura() { var dm = e.dimensiones(d.id).map(function (v) { return v * mm() / 10; }); lect.textContent = 'Tamaño con la escala real del marcador (' + mm() + ' mm de lado): ' + dm[0].toFixed(1) + ' × ' + dm[2].toFixed(1) + ' cm de base, ' + dm[1].toFixed(1) + ' cm de alto.'; }
    lectura();
    var alto = h('input', { type: 'number', min: 0.5, max: 500, step: 0.5, value: +cm[1].toFixed(1), 'aria-label': 'Alto real en cm' });
    var nom = h('input', { type: 'text', value: d.nombre, maxlength: 40, 'aria-label': 'Nombre' }); nom.addEventListener('change', function () { d.nombre = nom.value; V.refrescar(); });
    var col = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : '#e03131', 'aria-label': 'Color' }); col.addEventListener('input', function () { e.cambiar(d.id, { color: col.value }); if (RA.VVivo) RA.VVivo.pedir(); });
    el.props.appendChild(h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Nombre' }), nom])); el.props.appendChild(h('div', { cls: 'ra-fila' }, [h('label', { cls: 'ra-campo ra-mini' }, [h('span', { txt: 'Color' }), col])]));
    el.props.appendChild(rot); el.props.appendChild(esc); el.props.appendChild(lect);
    el.props.appendChild(h('div', { cls: 'ra-fila' }, [h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Alto real del objeto (cm)' }), alto]), h('button', { type: 'button', cls: 'tr-btn', txt: 'Ajustar a ese tamaño', on: { click: function () { var v = parseFloat(alto.value); if (!(v > 0)) return; e.ajustarAlto(d.id, v / (mm() / 10)); A.logro('ra_escala_real'); V.refrescar(); if (RA.VVivo) RA.VVivo.pedir(); } } })]));
    el.props.appendChild(h('p', { cls: 'tr-ayuda', txt: 'La escala real vale si el marcador impreso mide de verdad lo que indica Proyectos > Ajustes (lado del marcador).' }));
    el.props.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Duplicar', on: { click: function () { e.duplicar(d.id); V.refrescar(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Al centro del marcador', on: { click: function () { e.cambiar(d.id, { pos: [0, 0, 0] }); } } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Quitar', on: { click: function () { e.quitar(d.id); V.refrescar(); } } })]));
  };
  V.iniciar = function (raiz) {
    el.lista = h('ul', { cls: 'ra-capas', 'aria-label': 'Objetos en la escena' }); el.props = h('div', { cls: 'ra-insp' }); el.r3d = h('div', {});
    var prim = h('div', { cls: 'ra-bib-rej' }); [['cubo', 'Cubo'], ['esfera', 'Esfera'], ['cilindro', 'Cilindro'], ['piramide', 'Pirámide'], ['flecha', 'Flecha'], ['ejes', 'Ejes XYZ'], ['ajedrez', 'Ajedrez 3D'], ['dado', 'Dado'], ['carro', 'Carro'], ['robot', 'Robot']].forEach(function (p) { prim.appendChild(h('button', { type: 'button', cls: 'ra-it', on: { click: async function () { if (await motor()) { E.agregar({ tipo: 'prim', clave: p[0], nombre: p[1], color: '#e03131' }); A.logro('ra_primer_objeto'); if (p[0] === 'ajedrez' || p[0] === 'dado') A.logro('ra_objeto_de_juego'); V.refrescar(); } } } }, [h('span', { cls: 'ra-ico3d', 'aria-hidden': 'true', txt: p[1].slice(0, 1) }), h('span', { txt: p[1] })])); });
    var arch = h('input', { type: 'file', accept: '.obj,.glb,.gltf,.ply,.stl,.csv,.xyz,.pts,.txt', hidden: true, on: { change: function (ev) { var f = ev.target.files[0]; ev.target.value = ''; if (f) importar(f); } } });
    raiz.appendChild(h('div', { cls: 'ra-dos' }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Formas y juegos' }), prim]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Modelos de Reconstrucción 3D' }), h('p', { cls: 'tr-ayuda', txt: 'Se leen de este navegador (solo lectura): los que guardaste en el módulo de Reconstrucción 3D.' }), el.r3d, h('button', { type: 'button', cls: 'tr-btn', txt: 'Actualizar lista', on: { click: listarR3D } })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Importar archivo' }), h('p', { cls: 'tr-ayuda', txt: 'OBJ, GLB/glTF (sin texturas), PLY, STL y CSV de puntos. Se queda en este dispositivo.' }), h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Elegir archivo…', on: { click: function () { arch.click(); } } }), arch])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'En la escena' }), el.lista, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Ver en vivo', on: { click: function () { A.irA('vivo'); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Ver en el visor 3D', on: { click: function () { A.irA('visor'); } } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Vaciar', on: { click: function () { if (RA.E3 && RA.E3.listo) { RA.E3.limpiar(); V.refrescar(); } } } })])]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Objeto seleccionado' }), el.props])])]));
    listarR3D(); V.refrescar();
  };
  V.listar = listarR3D;
  V.cargarModelos = async function (defs) { for (var i = 0; i < defs.length; i++) { var d = defs[i]; if (d.tipo === 'malla' && RA.E3 && !RA.E3.tieneMalla(d.modeloId)) { var l = await RA.Datos.modelos(), r = l.filter(function (m) { return m.id === d.modeloId; })[0]; if (r) RA.E3.registrarMalla(r.id, { tipo: r.tipo, nombre: r.nombre, pos: r.pos, idx: r.idx, col: r.col, zArriba: r.zArriba }); } } };
})(window);
