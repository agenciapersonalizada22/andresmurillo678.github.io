/* Lector/escritor de las bases IndexedDB de los otros modulos (solo con permiso del usuario; nada sale del dispositivo). window.AnaLector
   Lectura: NUNCA crea una base que no existe (aborta el upgrade). Escritura (solo limpieza y restauracion confirmadas): mismo esquema {k,col,id,t,v}
   y marcas de borrado `<base>_nube_lapidas` para que la sincronizacion no resucite lo borrado. Las claves de API no se leen jamas. */
(function (g) {
  'use strict';
  var Agg = g.AnaAgg, L = g.AnaLector = {};
  function ls(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }
  function lsj(k) { try { return JSON.parse(ls(k) || 'null'); } catch (e) { return null; } }

  L.leerBase = function (nombre) {
    return new Promise(function (ok) {
      if (!g.indexedDB) return ok({ existe: false, regs: [], error: 'IndexedDB no disponible' });
      var creada = false, r;
      try { r = g.indexedDB.open(nombre); } catch (e) { return ok({ existe: false, regs: [], error: String(e && e.message || e) }); }
      r.onupgradeneeded = function () { creada = true; try { r.transaction.abort(); } catch (e) {} };
      r.onerror = function () { ok(creada ? { existe: false, regs: [] } : { existe: false, regs: [], error: 'No se pudo abrir la base' }); };
      r.onblocked = function () { ok({ existe: false, regs: [], error: 'Base bloqueada por otra pestaña' }); };
      r.onsuccess = function () {
        var db = r.result;
        try {
          if (!db.objectStoreNames.contains('r')) { db.close(); return ok({ existe: true, regs: [], error: 'Esquema distinto (sin almacén «r»)' }); }
          var q = db.transaction('r', 'readonly').objectStore('r').getAll();
          q.onsuccess = function () { db.close(); ok({ existe: true, regs: q.result || [] }); };
          q.onerror = function () { db.close(); ok({ existe: true, regs: [], error: 'No se pudo leer' }); };
        } catch (e) { try { db.close(); } catch (x) {} ok({ existe: true, regs: [], error: String(e && e.message || e) }); }
      };
    });
  };
  L.estimar = function () {
    var s = g.navigator && g.navigator.storage; if (!s || !s.estimate) return Promise.resolve(null);
    return s.estimate().then(function (e) { return e ? { usage: e.usage, quota: e.quota } : null; }, function () { return null; });
  };
  L.persistente = function () { var s = g.navigator && g.navigator.storage; return s && s.persisted ? s.persisted().catch(function () { return null; }) : Promise.resolve(null); };
  /* contadores de coste de IA (solo numeros) y estado de sincronizacion de cada modulo */
  L.localStorageResumen = function () {
    var ls_ = {}, sync = {}, i, k;
    ['contenido-ia', 'video-ia'].forEach(function (id) { var d = Agg.porId(id), l = lsj(d.base + '_limites_dispositivo'); if (l) ls_[id] = { limites: { llamadas: Array.isArray(l.llamadas) ? l.llamadas : [], gasto: l.gasto && typeof l.gasto === 'object' ? l.gasto : {} } }; });
    var claves = []; try { for (i = 0; i < g.localStorage.length; i++) claves.push(g.localStorage.key(i)); } catch (e) {}
    Agg.MODULOS.forEach(function (d) {
      var ult = 0; claves.forEach(function (k) { if (k.indexOf(d.base + '_nube_ultima_') === 0) ult = Math.max(ult, +ls(k) || 0); });
      var lap = lsj(d.base + '_nube_lapidas'); sync[d.id] = { ultima: ult, lapidas: lap && typeof lap === 'object' ? lap : {} };
    });
    return { ls: ls_, sync: sync };
  };
  L.leerTodo = async function () {
    var ent = {};
    for (var i = 0; i < Agg.MODULOS.length; i++) { var d = Agg.MODULOS[i]; try { ent[d.id] = await L.leerBase(d.base); } catch (e) { ent[d.id] = { existe: false, regs: [], error: String(e && e.message || e) }; } }
    var est = await L.estimar(), x = L.localStorageResumen(), datos = Agg.armar(ent, { ahora: Date.now(), ls: x.ls, sync: x.sync, estimate: est });
    datos.persistente = await L.persistente(); return datos;
  };

  /* ---------- escritura confirmada ---------- */
  function abrirEscritura(nombre) {
    return new Promise(function (ok, ko) {
      var r = g.indexedDB.open(nombre, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains('r')) r.result.createObjectStore('r', { keyPath: 'k' }); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error || new Error('No se pudo abrir ' + nombre)); }; r.onblocked = function () { ko(new Error('Base bloqueada: cierra otras pestañas del módulo.')); };
    });
  }
  /* op: {base, poner:[{k,col,id,t,v}], borrar:[k], sync:[colsSincronizadas]} */
  L.aplicar = async function (op) {
    var db = await abrirEscritura(op.base);
    try {
      if (!db.objectStoreNames.contains('r')) throw new Error('La base ' + op.base + ' tiene otro esquema; no se modificó.');
      await new Promise(function (ok, ko) {
        var t = db.transaction('r', 'readwrite'), s = t.objectStore('r');
        (op.poner || []).forEach(function (r) { s.put({ k: r.k, col: r.col, id: r.id, t: r.t, v: r.v }); });
        (op.borrar || []).forEach(function (k) { s.delete(k); });
        t.oncomplete = function () { ok(); }; t.onerror = t.onabort = function () { ko(t.error || new Error('Transacción cancelada')); };
      });
    } finally { db.close(); }
    var lk = op.base + '_nube_lapidas', lap = lsj(lk) || {}, ahora = Date.now(), cambio = false;
    (op.borrar || []).forEach(function (k) { if ((op.sync || []).indexOf(k.split('/')[0]) >= 0) { lap[k] = ahora; cambio = true; } });
    (op.poner || []).forEach(function (r) { if (lap[r.k]) { delete lap[r.k]; cambio = true; } });
    if (cambio) { try { g.localStorage.setItem(lk, JSON.stringify(lap)); } catch (e) {} }
    return { puestos: (op.poner || []).length, borrados: (op.borrar || []).length };
  };
})(window);
