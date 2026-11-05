/* Almacen unico (IndexedDB con respaldo en memoria): get/set/lista/borrar/suscribir + marcas de tiempo por registro.
   Claves: "apuestas:<coleccion>:<id>". Cada registro guarda _t (ms de ultima modificacion) y _borrado (lapida) para poder sincronizar luego. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var PREFIJO = 'apuestas:';

  function backendMemoria() {
    var m = {};
    return { nombre: 'memoria',
      todo: function () { return Promise.resolve(Object.keys(m).map(function (k) { return JSON.parse(m[k]); })); },
      poner: function (reg) { m[reg.k] = JSON.stringify(reg); return Promise.resolve(); },
      quitar: function (k) { delete m[k]; return Promise.resolve(); } };
  }
  function backendIDB() {
    var dbp = null;
    function abrir() {
      if (dbp) return dbp;
      dbp = new Promise(function (ok, ko) {
        var rq = indexedDB.open('apuestas_db', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('kv', { keyPath: 'k' }); };
        rq.onsuccess = function () { ok(rq.result); };
        rq.onerror = function () { ko(rq.error); };
        rq.onblocked = function () { ko(new Error('IndexedDB bloqueada')); };
      });
      return dbp;
    }
    function tx(modo, fn) {
      return abrir().then(function (db) {
        return new Promise(function (ok, ko) {
          var t = db.transaction('kv', modo), st = t.objectStore('kv'), r = fn(st);
          t.oncomplete = function () { ok(r && r.result !== undefined ? r.result : undefined); };
          t.onerror = t.onabort = function () { ko(t.error); };
        });
      });
    }
    return { nombre: 'indexeddb',
      todo: function () { return tx('readonly', function (s) { return s.getAll(); }); },
      poner: function (reg) { return tx('readwrite', function (s) { return s.put(reg); }); },
      quitar: function (k) { return tx('readwrite', function (s) { return s.delete(k); }); } };
  }

  function crear(backend) {
    var cache = null, subs = [], estado = { backend: backend.nombre, error: null };
    function cargar() {
      if (cache) return Promise.resolve(cache);
      return backend.todo().then(function (rs) {
        cache = {}; (rs || []).forEach(function (r) { cache[r.k] = r; });
        return cache;
      });
    }
    function avisar(col, id) { subs.forEach(function (f) { try { f(col, id); } catch (e) {} }); }
    var S = {
      estado: estado,
      abrir: cargar,
      get: function (col, id) { return cargar().then(function (c) { var r = c[PREFIJO + col + ':' + id]; return r && !r.v._borrado ? r.v : null; }); },
      lista: function (col, o) {
        return cargar().then(function (c) {
          var pre = PREFIJO + col + ':';
          return Object.keys(c).filter(function (k) { return k.indexOf(pre) === 0 && (o && o.todo || !c[k].v._borrado); }).map(function (k) { return c[k].v; });
        });
      },
      set: function (col, id, valor, t) {
        var v = {}; for (var k in valor) v[k] = valor[k];
        v.id = id; v._t = t || Date.now(); delete v._borrado;
        var reg = { k: PREFIJO + col + ':' + id, v: v };
        return cargar().then(function (c) { c[reg.k] = reg; return backend.poner(reg); }).then(function () { avisar(col, id); return v; });
      },
      borrar: function (col, id, t) {
        return cargar().then(function (c) {
          var kk = PREFIJO + col + ':' + id, prev = c[kk];
          var reg = { k: kk, v: { id: id, _t: t || Date.now(), _borrado: true } };
          if (!prev) return;
          c[kk] = reg; return backend.poner(reg);
        }).then(function () { avisar(col, id); });
      },
      /* fusion por ultima modificacion (para sincronizar o importar): devuelve cuantos registros cambiaron */
      mezclar: function (col, regs) {
        var n = 0;
        return regs.reduce(function (p, r) {
          return p.then(function () {
            return cargar().then(function (c) {
              var kk = PREFIJO + col + ':' + r.id, prev = c[kk];
              if (prev && prev.v._t >= r._t) return;
              c[kk] = { k: kk, v: r }; n++; return backend.poner(c[kk]);
            });
          });
        }, Promise.resolve()).then(function () { if (n) avisar(col, null); return n; });
      },
      suscribir: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
    };
    return S;
  }
  function porDefecto() {
    var b;
    try { if (typeof indexedDB !== 'undefined' && indexedDB) b = backendIDB(); } catch (e) {}
    return crear(b || backendMemoria());
  }
  A.almacen = { crear: crear, backendMemoria: backendMemoria, backendIDB: backendIDB, porDefecto: porDefecto };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.almacen;
})(typeof window !== 'undefined' ? window : globalThis);
