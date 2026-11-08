/* Almacen unico: IndexedDB con marcas de tiempo por registro. Registro: {k, col, id, t, v}. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Almacen = m; })(typeof self !== 'undefined' ? self : this, function () {
  function memoria() {
    var d = new Map();
    return { get: async function (k) { return d.get(k); }, put: async function (k, v) { d.set(k, v); }, del: async function (k) { d.delete(k); }, all: async function () { return Array.from(d.values()); } };
  }
  function idb(nombre) {
    var p = null;
    function db() {
      return p || (p = new Promise(function (ok, ko) {
        var r = indexedDB.open(nombre, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('r', { keyPath: 'k' }); };
        r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); }; r.onblocked = function () { ko(new Error('bloqueado')); };
      }));
    }
    function tx(modo, fn) {
      return db().then(function (d) {
        return new Promise(function (ok, ko) {
          var t = d.transaction('r', modo), rq = fn(t.objectStore('r'));
          t.oncomplete = function () { ok(rq && rq.result); }; t.onerror = t.onabort = function () { ko(t.error); };
        });
      });
    }
    return {
      get: function (k) { return tx('readonly', function (s) { return s.get(k); }); },
      put: function (k, v) { return tx('readwrite', function (s) { return s.put(v); }); },
      del: function (k) { return tx('readwrite', function (s) { return s.delete(k); }); },
      all: function () { return tx('readonly', function (s) { return s.getAll(); }); }
    };
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function crear(prefijo, opts) {
    opts = opts || {};
    var be = opts.backend || (typeof indexedDB !== 'undefined' ? idb(prefijo) : memoria());
    var subs = [], api = { persistente: !!(opts.backend ? false : typeof indexedDB !== 'undefined'), prefijo: prefijo };
    api.listo = be.all().catch(function () { be = memoria(); api.persistente = false; });
    function avisar(col, id, tipo) { subs.forEach(function (s) { if (!s.col || s.col === col) try { s.fn(col, id, tipo); } catch (e) {} }); }
    api.nuevoId = uid;
    api.get = async function (col, id) { await api.listo; var r = await be.get(col + '/' + id); return r ? r.v : undefined; };
    api.set = async function (col, obj) {
      await api.listo; obj.id = obj.id || uid();
      var antes = await be.get(col + '/' + obj.id), ahora = opts.reloj ? opts.reloj() : Date.now();
      obj._creado = obj._creado || (antes && antes.v._creado) || ahora; obj._t = ahora;
      await be.put(col + '/' + obj.id, { k: col + '/' + obj.id, col: col, id: obj.id, t: ahora, v: obj });
      avisar(col, obj.id, 'set'); return obj;
    };
    api.lista = async function (col) { await api.listo; return (await be.all()).filter(function (r) { return r.col === col; }).map(function (r) { return r.v; }); };
    api.borrar = async function (col, id) { await api.listo; await be.del(col + '/' + id); avisar(col, id, 'del'); };
    api.suscribir = function (col, fn) { var s = { col: col, fn: fn }; subs.push(s); return function () { subs = subs.filter(function (x) { return x !== s; }); }; };
    api.volcar = async function () { await api.listo; return be.all(); };
    api.restaurar = async function (regs) { await api.listo; for (var i = 0; i < regs.length; i++) await be.put(regs[i].k, regs[i]); avisar(null, null, 'restaurar'); };
    return api;
  }
  return { crear: crear, memoria: memoria };
});
