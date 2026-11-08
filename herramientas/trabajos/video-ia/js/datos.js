/* Almacen de Video IA (IndexedDB 'trabajos_video_ia'): proyectos (zonas, lineas, ajustes) y reglas; se sincronizan con la cuenta.
   Ajustes de dispositivo e IA en localStorage; la clave de API SOLO en trabajos_video_ia_claves_dispositivo (nunca se sincroniza). Sin videos ni capturas. */
(function (g) {
  'use strict';
  var ID = 'trabajos_video_ia', alm = g.Almacen.crear(ID), D = g.VDatos = { ID: ID, alm: alm, COLS: ['proyectos', 'reglas'] };
  var KAJ = ID + '_ajustes_dispositivo', KCL = ID + '_claves_dispositivo', KAV = ID + '_aviso_dispositivo', KLIM = ID + '_limites_dispositivo';
  function lee(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function esc(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  D.ajustes = function () { return Object.assign({}, g.VIA.DEF, lee(KAJ, {})); };
  D.guardarAjustes = function (a) { var l = Object.assign({}, a); delete l.clave; return esc(KAJ, l); };
  D.clave = function () { return lee(KCL, {}).clave || ''; };
  D.guardarClave = function (c) { return esc(KCL, c ? { clave: c } : null); };
  D.avisoAceptado = function () { return !!lee(KAV, null); };
  D.aceptarAviso = function () { esc(KAV, { t: Date.now() }); };
  D.estadoLimitador = function () { return lee(KLIM, null); };
  D.guardarLimitador = function (e) { esc(KLIM, e); };
  D.proyectos = function () { return alm.lista('proyectos').then(function (l) { return l.sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); }); };
  D.reglas = function () { return alm.lista('reglas').then(function (l) { return l.sort(function (a, b) { return (a._creado || 0) - (b._creado || 0); }); }); };
  D.guardarProyecto = function (p) { return alm.set('proyectos', p); };
  D.borrarProyecto = function (id) { return alm.borrar('proyectos', id); };
  D.guardarRegla = function (r) { return alm.set('reglas', r); };
  D.borrarRegla = function (id) { return alm.borrar('reglas', id); };
})(window);
