/* Almacen de Reconstruccion 3D (IndexedDB 'trabajos_reconstruccion_3d'). Sincroniza solo 'proyectos' (metadatos, medidas, notas, plano y mallas pequenas).
   'mallas' (geometria pesada) y las fotos se quedan en este dispositivo. Ajustes en localStorage (dispositivo). */
(function (g) {
  'use strict';
  var ID = 'trabajos_reconstruccion_3d', alm = g.Almacen.crear(ID), D = g.R3D.Datos = { ID: ID, alm: alm, COLS: ['proyectos'], LIM_NUBE: 150000 };
  var KAJ = ID + '_ajustes_dispositivo';
  var DEF = { lado: 480, limiteMB: 0, maxTri: 1200000, fondo: 'auto', paso: 'normal' };
  function lee(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  D.ajustes = function () { var a = Object.assign({}, DEF, lee(KAJ, {})); if (!a.limiteMB) a.limiteMB = g.navigator && navigator.deviceMemory ? Math.max(150, Math.min(1000, navigator.deviceMemory * 120)) : 350; return a; };
  D.guardarAjustes = function (a) { try { localStorage.setItem(KAJ, JSON.stringify(a)); return true; } catch (e) { return false; } };
  D.proyectos = function () { return alm.lista('proyectos').then(function (l) { return l.sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); }); };
  D.guardarProyecto = function (p) { return alm.set('proyectos', p); };
  D.borrarProyecto = function (id) { return D.proyecto(id).then(function (p) { var ps = []; ((p && p.capas) || []).forEach(function (c) { ps.push(alm.borrar('mallas', id + '_' + c.id)); }); ps.push(alm.borrar('proyectos', id)); return Promise.all(ps); }); };
  D.proyecto = function (id) { return alm.get('proyectos', id); };
  D.guardarMallaLocal = function (pid, cid, m) { return alm.set('mallas', { id: pid + '_' + cid, tipo: m.tipo, nombre: m.nombre, pos: m.pos, idx: m.idx, col: m.col }); };
  D.mallaLocal = function (pid, cid) { return alm.get('mallas', pid + '_' + cid); };
})(window);
