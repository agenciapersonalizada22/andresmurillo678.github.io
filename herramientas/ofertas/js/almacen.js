/* Almacen unico de persistencia: IndexedDB (respaldo localStorage/memoria). Claves con prefijo "ofertas:"; cada registro lleva marca de tiempo
   para sincronizar luego. API: abrir(), get(k), set(k,v), borrar(k), lista(prefijo)->[{k,v,t}], suscribir(fn)->baja, exportar(), importar(obj). */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab(typeof indexedDB !== 'undefined' ? indexedDB : null, null);
  else { g.Of = g.Of || {}; g.Of.almacen = fab(g.indexedDB || null, g.localStorage); }
})(typeof self !== 'undefined' ? self : this, function (idb, ls) {
  var PRE = 'ofertas:', mem = new Map(), subs = [], db = null, modo = 'memoria', listo = null;
  function avisar(k, r) { subs.forEach(function (f) { try { f(k, r); } catch (e) {} }); }
  function abrirIdb() {
    return new Promise(function (res, rej) {
      var rq = idb.open('ofertas_v1', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv', { keyPath: 'k' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
      rq.onblocked = function () { rej(new Error('bloqueado')); };
    });
  }
  function abrir() {
    if (listo) return listo;
    listo = new Promise(function (res) {
      var finLs = function () {
        try {
          if (ls) { modo = 'localStorage'; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf('ofertas_kv_') === 0) { var r = JSON.parse(ls.getItem(k)); mem.set(r.k, r); } } }
        } catch (e) { modo = 'memoria'; }
        res(modo);
      };
      if (!idb) return finLs();
      abrirIdb().then(function (d) {
        db = d; modo = 'indexedDB';
        var tx = d.transaction('kv', 'readonly'), rq = tx.objectStore('kv').getAll();
        rq.onsuccess = function () { rq.result.forEach(function (r) { mem.set(r.k, r); }); res(modo); };
        rq.onerror = function () { res(modo); };
      }).catch(finLs);
    });
    return listo;
  }
  function persistir(r) {
    if (db) { try { db.transaction('kv', 'readwrite').objectStore('kv').put(r); } catch (e) {} }
    else if (modo === 'localStorage') { try { ls.setItem('ofertas_kv_' + r.k, JSON.stringify(r)); } catch (e) {} }
  }
  function get(k, def) { var r = mem.get(PRE + k); return r && !r.d ? r.v : def; }
  function set(k, v) { var r = { k: PRE + k, v: v, t: Date.now() }; mem.set(r.k, r); persistir(r); avisar(k, r); return v; }
  function borrar(k) { var r = { k: PRE + k, v: null, t: Date.now(), d: true }; mem.set(r.k, r); persistir(r); avisar(k, r); }
  function lista(pref) {
    var out = [], p = PRE + (pref || '');
    mem.forEach(function (r) { if (!r.d && r.k.indexOf(p) === 0) out.push({ k: r.k.slice(PRE.length), v: r.v, t: r.t }); });
    return out;
  }
  function suscribir(f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
  function exportar() { var o = {}; mem.forEach(function (r) { if (!r.d) o[r.k] = { v: r.v, t: r.t }; }); return o; }
  function importar(o) { Object.keys(o || {}).forEach(function (k) { if (k.indexOf(PRE) === 0 && o[k]) { var r = { k: k, v: o[k].v, t: o[k].t || Date.now() }; mem.set(k, r); persistir(r); } }); }
  return { abrir: abrir, get: get, set: set, borrar: borrar, lista: lista, suscribir: suscribir, exportar: exportar, importar: importar, get modo() { return modo; } };
});
