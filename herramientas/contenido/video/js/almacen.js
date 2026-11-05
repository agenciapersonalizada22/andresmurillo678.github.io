/* Almacenamiento unico (IndexedDB con respaldo en memoria). Claves prefijadas con el id de la herramienta.
   API: abrir, lista, get, set, borrar, suscribir; medios: guardarMedio, cargarMedio. Cada registro lleva `mod` (ms) para sincronizar luego. */
(function (g) {
  var A = { ID: 'contenido_video', _db: null, _mem: { proyectos: {}, medios: {}, kv: {} }, _subs: [], enMemoria: false };
  A.abrir = function () {
    if (A._p) return A._p;
    A._p = new Promise(function (res) {
      if (!g.indexedDB) { A.enMemoria = true; return res(); }
      var rq;
      try { rq = indexedDB.open(A.ID, 1); } catch (e) { A.enMemoria = true; return res(); }
      rq.onupgradeneeded = function () { var d = rq.result; d.createObjectStore('proyectos', { keyPath: 'id' }); d.createObjectStore('medios'); d.createObjectStore('kv'); };
      rq.onsuccess = function () { A._db = rq.result; res(); };
      rq.onerror = rq.onblocked = function () { A.enMemoria = true; res(); };
    });
    return A._p;
  };
  function tx(store, modo, f) {
    return A.abrir().then(function () {
      if (A.enMemoria) { var m = f(null, true); return m && m.result; }
      return new Promise(function (res, rej) {
        var t = A._db.transaction(store, modo), s = t.objectStore(store), r = f(s, false);
        t.oncomplete = function () { res(r ? r.result : undefined); }; t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  function avisar(tipo, id) { A._subs.forEach(function (f) { try { f(tipo, id); } catch (e) {} }); }
  A.suscribir = function (f) { A._subs.push(f); return function () { A._subs = A._subs.filter(function (x) { return x !== f; }); }; };
  A.set = function (store, clave, val) {
    val.mod = val.mod || Date.now();
    return tx(store, 'readwrite', function (s, mem) { if (mem) { A._mem[store][clave] = val; return; } return store === 'proyectos' ? s.put(val) : s.put(val, clave); }).then(function () { avisar(store, clave); });
  };
  A.get = function (store, clave) {
    return tx(store, 'readonly', function (s, mem) { return mem ? { result: A._mem[store][clave] } : s.get(clave); });
  };
  A.lista = function () {
    return tx('proyectos', 'readonly', function (s, mem) {
      if (mem) return { result: Object.keys(A._mem.proyectos).map(function (k) { return A._mem.proyectos[k]; }) };
      return s.getAll();
    }).then(function (r) { r = r || []; return r.sort(function (a, b) { return b.mod - a.mod; }); });
  };
  A.borrar = function (store, clave) {
    return tx(store, 'readwrite', function (s, mem) { if (mem) { delete A._mem[store][clave]; return; } return s.delete(clave); }).then(function () { avisar(store, clave); });
  };
  A.guardarProyecto = function (p, mini) {
    return A.set('proyectos', p.id, { id: p.id, nombre: p.nombre, mod: Date.now(), creado: p.creado, aspecto: p.aspecto, papelera: p.papelera || 0, mini: mini || '', data: JSON.stringify(p) });
  };
  A.cargarProyecto = function (id) {
    return tx('proyectos', 'readonly', function (s, mem) { return mem ? { result: A._mem.proyectos[id] } : s.get(id); }).then(function (x) { return x ? JSON.parse(x.data) : null; });
  };
  A.guardarMedio = function (pid, mid, blob) { return A.set('medios', pid + '/' + mid, { blob: blob, mod: Date.now() }); };
  A.cargarMedio = function (pid, mid) {
    return tx('medios', 'readonly', function (s, mem) { return mem ? { result: A._mem.medios[pid + '/' + mid] } : s.get(pid + '/' + mid); }).then(function (x) { return x ? x.blob : null; });
  };
  A.borrarMedios = function (pid) {
    return tx('medios', 'readwrite', function (s, mem) {
      if (mem) { Object.keys(A._mem.medios).forEach(function (k) { if (k.indexOf(pid + '/') === 0) delete A._mem.medios[k]; }); return; }
      var rg = IDBKeyRange.bound(pid + '/', pid + '/￿'); return s.delete(rg);
    });
  };
  A.clave = function (k, v) {
    var kk = A.ID + '_' + k;
    if (v === undefined) { try { var x = localStorage.getItem(kk); return x === null ? null : JSON.parse(x); } catch (e) { return null; } }
    try { localStorage.setItem(kk, JSON.stringify(v)); } catch (e) {}
  };
  g.VE = g.VE || {}; g.VE.almacen = A;
})(typeof window !== 'undefined' ? window : globalThis);
