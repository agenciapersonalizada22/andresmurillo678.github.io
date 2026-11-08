/* Almacen de RA (IndexedDB 'trabajos_realidad_aumentada'). Sincroniza solo 'proyectos' (capas, anclas y ajustes, sin imagenes); 'png' (PNG propios),
   'modelos' (mallas importadas) y 'envios' (fotos guiadas) se quedan en este dispositivo. Ajustes y lectura de mallas de reconstruccion-3d. window.RA.Datos */
(function (g) {
  'use strict';
  var RA = g.RA = g.RA || {}, ID = 'trabajos_realidad_aumentada', alm = g.Almacen.crear(ID), D = RA.Datos = { ID: ID, alm: alm, COLS: ['proyectos'] };
  var KAJ = ID + '_ajustes_dispositivo';
  var DEF = { fov: 62, ladoMm: 80, marcador: -1, suave: 0.45, ipd: 63, k1: 0.34, k2: 0.55, sep: 0.5, fovVisor: 80, calidad: 480, espejo: false, hosts: '' };
  function lee(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  D.ajustes = function () { return Object.assign({}, DEF, lee(KAJ, {})); };
  D.guardarAjustes = function (a) { try { localStorage.setItem(KAJ, JSON.stringify(a)); return true; } catch (e) { return false; } };
  D.DEF = DEF;
  D.proyectos = function () { return alm.lista('proyectos').then(function (l) { return l.sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); }); };
  D.guardarProyecto = function (p) { return alm.set('proyectos', p); };
  D.borrarProyecto = function (id) { return alm.borrar('proyectos', id); };
  D.guardarPNG = function (id, url, nombre) { return alm.set('png', { id: id, url: url, nombre: nombre || 'PNG' }); };
  D.pngs = function () { return alm.lista('png'); };
  D.borrarPNG = function (id) { return alm.borrar('png', id); };
  D.guardarModelo = function (m) { return alm.set('modelos', { id: m.id, nombre: m.nombre, tipo: m.tipo, pos: m.pos, idx: m.idx, col: m.col, zArriba: !!m.zArriba }); };
  D.modelos = function () { return alm.lista('modelos'); };
  D.borrarModelo = function (id) { return alm.borrar('modelos', id); };
  D.guardarEnvio = function (e) { return alm.set('envios', e); };
  D.envios = function () { return alm.lista('envios'); };

  /* Lee (solo lectura) lo que Reconstruccion 3D guardo en este navegador sin crear su base si no existe. */
  function abrirR3D() {
    return new Promise(function (ok) {
      if (!g.indexedDB || !indexedDB.databases) { ok(null); return; }
      indexedDB.databases().then(function (l) {
        if (!l.some(function (d) { return d.name === 'trabajos_reconstruccion_3d'; })) { ok(null); return; }
        var r = indexedDB.open('trabajos_reconstruccion_3d'); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ok(null); }; r.onupgradeneeded = function () { r.transaction.abort(); ok(null); };
      }).catch(function () { ok(null); });
    });
  }
  D.mallasR3D = async function () {
    var db = await abrirR3D(); if (!db || !db.objectStoreNames.contains('r')) return [];
    var regs = await new Promise(function (ok) { var q = db.transaction('r', 'readonly').objectStore('r').getAll(); q.onsuccess = function () { ok(q.result || []); }; q.onerror = function () { ok([]); }; });
    db.close();
    var locales = {}, lista = [];
    regs.filter(function (r) { return r.col === 'mallas'; }).forEach(function (r) { locales[r.id] = r.v; });
    regs.filter(function (r) { return r.col === 'proyectos'; }).forEach(function (r) {
      var p = r.v; (p.capas || []).forEach(function (c) {
        var loc = locales[p.id + '_' + c.id];
        if (c.malla || loc) lista.push({ id: p.id + '/' + c.id, nombre: (p.nombre || 'Proyecto') + ' · ' + (c.nombre || 'capa'), tipo: c.tipo || (loc && loc.tipo), tri: c.tri, vert: c.vert, obtener: function () { if (loc) return { tipo: loc.tipo, nombre: c.nombre, pos: loc.pos, idx: loc.idx, col: loc.col }; var m = g.R3D.Malla.descompactar(c.malla); m.nombre = c.nombre; return m; } });
      });
    });
    return lista;
  };
})(window);
