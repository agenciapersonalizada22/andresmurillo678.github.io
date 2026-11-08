/* Almacen propio de Analisis (IndexedDB 'trabajos_analisis'): solo las metas se sincronizan con la cuenta.
   Ajustes en localStorage del dispositivo; la clave de IA SOLO en trabajos_analisis_claves_dispositivo (nunca se sincroniza ni se respalda). window.AnaDatos */
(function (g) {
  'use strict';
  var ID = 'trabajos_analisis', alm = g.Almacen.crear(ID), D = g.AnaDatos = { ID: ID, alm: alm, COLS: ['metas'] };
  var KAJ = ID + '_ajustes_dispositivo', KCL = ID + '_claves_dispositivo', KRE = ID + '_respaldo_dispositivo';
  function lee(k, d) { try { return JSON.parse(g.localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function esc(k, v) { try { if (v == null) g.localStorage.removeItem(k); else g.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var DEF = { periodo: 'semanal', anonimo: true, proveedor: 'anthropic', base: 'https://api.anthropic.com', modelo: 'claude-sonnet-4-5', maxTokens: 900 };
  D.ajustes = function () { return Object.assign({}, DEF, lee(KAJ, {})); };
  D.guardarAjustes = function (a) { var l = Object.assign({}, a); delete l.clave; return esc(KAJ, l); };
  D.clave = function () { return lee(KCL, {}).clave || ''; };
  D.guardarClave = function (c) { return esc(KCL, c ? { clave: c } : null); };
  D.ultimoRespaldo = function () { return +(lee(KRE, {}).t) || 0; };
  D.marcarRespaldo = function () { esc(KRE, { t: Date.now() }); };
  D.metas = function () { return alm.lista('metas').then(function (l) { return l.sort(function (a, b) { return (a._creado || 0) - (b._creado || 0); }); }); };
  D.guardarMeta = function (m) { return alm.set('metas', m); };
  D.borrarMeta = function (id) { return alm.borrar('metas', id); };
})(window);
