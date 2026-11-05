/* Almacen unico de persistencia (IndexedDB con respaldo en localStorage/memoria). Claves con prefijo `mercados_`.
   Cada registro: {v, t} (t = marca de tiempo de la ultima escritura) para facilitar la sincronizacion futura con cuentas.
   API: Almacen.listo (promesa), get(k, def), set(k, v), borrar(k), lista(prefijo) -> [{clave, valor, t}], suscribir(k|prefijo, fn) -> cancelar,
   exportar() / importar(obj). Las claves `claves_dispositivo*` jamas se exportan ni se sincronizan. */
(function (root, factory) { var m = factory(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Almacen = m; })(typeof self !== 'undefined' ? self : this, function (root) {
  var PREF = 'mercados_';
  function backendMemoria() { var d = {}; return { nombre: 'memoria', cargar: function () { return Promise.resolve(Object.keys(d).map(function (k) { return { k: k, r: d[k] }; })); }, guardar: function (k, r) { d[k] = r; }, borrar: function (k) { delete d[k]; } }; }
  function backendLocal() {
    var P = PREF + 'kv_';
    return { nombre: 'localStorage', cargar: function () { var o = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(P) === 0) { try { o.push({ k: k.slice(P.length), r: JSON.parse(localStorage.getItem(k)) }); } catch (e) {} } } return Promise.resolve(o); },
      guardar: function (k, r) { try { localStorage.setItem(P + k, JSON.stringify(r)); } catch (e) {} }, borrar: function (k) { try { localStorage.removeItem(P + k); } catch (e) {} } };
  }
  function backendIDB() {
    return new Promise(function (res, rej) {
      if (!root.indexedDB) return rej(new Error('sin IndexedDB'));
      var rq = root.indexedDB.open('mercados', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv', { keyPath: 'k' }); };
      rq.onerror = function () { rej(rq.error); };
      rq.onsuccess = function () {
        var db = rq.result;
        res({ nombre: 'IndexedDB', cargar: function () { return new Promise(function (ok, no) { var r = db.transaction('kv').objectStore('kv').getAll(); r.onsuccess = function () { ok(r.result.map(function (x) { return { k: x.k, r: x.r }; })); }; r.onerror = function () { no(r.error); }; }); },
          guardar: function (k, r) { try { db.transaction('kv', 'readwrite').objectStore('kv').put({ k: k, r: r }); } catch (e) {} }, borrar: function (k) { try { db.transaction('kv', 'readwrite').objectStore('kv').delete(k); } catch (e) {} } });
      };
    });
  }
  function crear(backendP) {
    var cache = {}, subs = [], A = { backend: '' };
    A.listo = Promise.resolve(backendP).then(function (b) { A.backend = b.nombre; A._b = b; return b.cargar(); }).then(function (filas) { filas.forEach(function (f) { cache[f.k] = f.r; }); return A; }).catch(function () { A._b = backendMemoria(); A.backend = 'memoria'; return A; });
    function avisar(k) { subs.forEach(function (s) { if (k === s.p || (s.pref && k.indexOf(s.p) === 0)) { try { s.fn(k, A.get(k)); } catch (e) {} } }); }
    A.get = function (k, def) { var r = cache[k]; return r ? r.v : def; };
    A.meta = function (k) { return cache[k] ? { t: cache[k].t } : null; };
    A.set = function (k, v) { var r = { v: v, t: Date.now() }; cache[k] = r; if (A._b) A._b.guardar(k, r); else A.listo.then(function () { A._b.guardar(k, r); }); avisar(k); return v; };
    A.borrar = function (k) { delete cache[k]; if (A._b) A._b.borrar(k); avisar(k); };
    A.lista = function (pref) { return Object.keys(cache).filter(function (k) { return k.indexOf(pref || '') === 0; }).map(function (k) { return { clave: k, valor: cache[k].v, t: cache[k].t }; }); };
    A.suscribir = function (p, fn, prefijo) { var s = { p: p, fn: fn, pref: !!prefijo }; subs.push(s); return function () { subs = subs.filter(function (x) { return x !== s; }); }; };
    A.exportar = function () { var o = { app: 'mercados', version: 1, fecha: Date.now(), datos: {} }; Object.keys(cache).forEach(function (k) { if (k.indexOf('claves_dispositivo') !== 0) o.datos[k] = cache[k]; }); return o; };
    A.importar = function (o) { if (!o || o.app !== 'mercados' || !o.datos) throw new Error('Archivo no valido'); Object.keys(o.datos).forEach(function (k) { if (k.indexOf('claves_dispositivo') === 0) return; var r = o.datos[k]; if (r && 'v' in r) { cache[k] = r; if (A._b) A._b.guardar(k, r); avisar(k); } }); };
    return A;
  }
  var A = crear(typeof indexedDB !== 'undefined' && root.indexedDB ? backendIDB().catch(function () { return typeof localStorage !== 'undefined' ? backendLocal() : backendMemoria(); }) : (typeof localStorage !== 'undefined' ? backendLocal() : backendMemoria()));
  A.crear = crear; A.backendMemoria = backendMemoria;
  return A;
});
