/* Almacen del modulo (IndexedDB 'trabajos_automatizaciones'): flujos y almacen se sincronizan con la cuenta; ejecuciones, ajustes y claves NO.
   Claves y secretos: solo en este dispositivo (trabajos_automatizaciones_claves_dispositivo). Los flujos solo guardan referencias {{secreto.X}}. */
(function (g) {
  'use strict';
  var T = g.Tr, ID = 'trabajos_automatizaciones', alm = g.Almacen.crear(ID), MAXEJ = 60;
  var D = g.AutoDatos = { ID: ID, alm: alm, COLS: ['flujos', 'almacen'], KEY_AJ: ID + '_ajustes_dispositivo', KEY_CL: ID + '_claves_dispositivo', KEY_ST: ID + '_estado_dispositivo' };
  function leer(k, def) { try { return Object.assign(Array.isArray(def) ? [] : {}, JSON.parse(T.ls(k) || 'null') || def); } catch (e) { return def; } }
  D.ajustes = function () { return Object.assign({ dominios: [], confirmadas: {}, vista: 'lienzo', fondo: false }, leer(D.KEY_AJ, {})); };
  D.guardarAjustes = function (a) { T.ls(D.KEY_AJ, JSON.stringify(a)); D.espejoSW(); };
  D.secretos = function () { return leer(D.KEY_CL, {}); };
  D.guardarSecretos = function (s) { T.ls(D.KEY_CL, JSON.stringify(s)); D.espejoSW(); };
  D.estadoDisp = function () { return leer(D.KEY_ST, {}); };
  D.guardarEstadoDisp = function (s) { T.ls(D.KEY_ST, JSON.stringify(s)); };
  /* el Service Worker no ve localStorage: se copian dominios (y claves solo si el usuario activo el fondo) a una coleccion local */
  D.espejoSW = function () {
    var a = D.ajustes(); return alm.set('config_dispositivo', { id: 'sw', dominios: a.dominios, secretos: a.fondo ? D.secretos() : {}, fondo: !!a.fondo }).catch(function () {});
  };
  D.flujos = function () { return alm.lista('flujos').then(function (l) { return l.sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); }); };
  D.flujo = function (id) { return alm.get('flujos', id); };
  D.guardarFlujo = function (f) { return alm.set('flujos', f); };
  D.borrarFlujo = function (id) { return alm.borrar('flujos', id); };
  D.nuevoFlujo = function (nombre) { return { id: T.uid(), nombre: nombre || 'Flujo nuevo', activo: false, fondo: false, vars: {}, nodos: [D.nuevoNodo('manual', 40, 60, [])], aristas: [], _v: 1 }; };
  D.nuevoNodo = function (tipo, x, y, existentes) {
    var def = g.AutoCatalogo.TIPOS[tipo], cfg = {}, max = 0; def.campos.forEach(function (c) { if (c.def !== undefined) cfg[c.id] = JSON.parse(JSON.stringify(c.def)); });
    (existentes || []).forEach(function (n) { var m = /^n(\d+)$/.exec(n.id); if (m) max = Math.max(max, +m[1]); });
    return { id: 'n' + (max + 1), tipo: tipo, x: Math.round(x), y: Math.round(y), cfg: cfg };
  };
  /* copia un flujo con id nuevo (importar / plantilla / duplicar) y sanea */
  D.normalizar = function (j, nombre) {
    if (!j || typeof j !== 'object' || !Array.isArray(j.nodos)) throw new Error('El archivo no es un flujo válido (falta «nodos»).');
    var cat = g.AutoCatalogo.TIPOS, ids = {}, nodos = [];
    j.nodos.slice(0, 200).forEach(function (n, i) {
      if (!n || !cat[n.tipo] || !/^[\w-]{1,20}$/.test(n.id || '') || ids[n.id]) return; ids[n.id] = 1;
      var cfg = {}; Object.keys(n.cfg || {}).forEach(function (k) { var v = n.cfg[k]; if (['string', 'number', 'boolean'].indexOf(typeof v) >= 0 || Array.isArray(v)) cfg[k] = v; });
      nodos.push({ id: n.id, tipo: n.tipo, x: Number(n.x) || 40 + i * 30, y: Number(n.y) || 60 + i * 20, cfg: cfg, titulo: n.titulo ? String(n.titulo).slice(0, 40) : undefined });
    });
    var ar = (j.aristas || []).filter(function (a) { return a && ids[a.de] && ids[a.a] && a.de !== a.a; }).slice(0, 400).map(function (a) { return { de: a.de, sal: String(a.sal || 'sal'), a: a.a }; });
    if (!nodos.length) throw new Error('El flujo no tiene nodos válidos.');
    return { id: T.uid(), nombre: String(nombre || j.nombre || 'Flujo importado').slice(0, 60), activo: false, fondo: false, vars: j.vars && typeof j.vars === 'object' ? j.vars : {}, nodos: nodos, aristas: ar, _v: 1 };
  };
  /* ejecuciones (solo local) */
  D.guardarEj = function (r) { r.id = r.id || T.uid(); return alm.set('ejecuciones', r).then(function () { return D.recortarEj(); }); };
  D.ejecuciones = function () { return alm.lista('ejecuciones').then(function (l) { return l.sort(function (a, b) { return (b.ini || 0) - (a.ini || 0); }); }); };
  D.recortarEj = function () { return D.ejecuciones().then(function (l) { return Promise.all(l.slice(MAXEJ).map(function (r) { return alm.borrar('ejecuciones', r.id); })); }); };
  D.limpiarEj = function () { return D.ejecuciones().then(function (l) { return Promise.all(l.map(function (r) { return alm.borrar('ejecuciones', r.id); })); }); };
  /* almacen clave-valor para los flujos */
  D.almacenTodo = function () { return alm.lista('almacen').then(function (l) { var o = {}; l.forEach(function (r) { o[r.id] = r.valor; }); return o; }); };
  D.almacenSet = function (clave, valor, modo) {
    if (!/^[\w.-]{1,40}$/.test(clave)) return Promise.reject(new Error('Clave de almacén no válida (letras, números, . _ -).'));
    return alm.get('almacen', clave).then(function (r) {
      var v = valor, ant = r ? r.valor : undefined;
      if (modo === 'sumar') v = (Number(ant) || 0) + (Number(valor) || 0); else if (modo === 'añadir') { v = Array.isArray(ant) ? ant.slice(-199) : (ant === undefined ? [] : [ant]); v.push(valor); }
      return alm.set('almacen', { id: clave, valor: v }).then(function () { return v; });
    });
  };
  D.almacenBorrar = function (clave) { return alm.borrar('almacen', clave); };
})(window);
