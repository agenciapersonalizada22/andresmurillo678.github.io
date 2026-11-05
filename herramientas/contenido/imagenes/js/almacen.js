/* Almacenamiento unico (IndexedDB con respaldo en memoria): get/set/borrar/lista/suscribir, cada registro con 'modificado'.
   Prefijo contenido_imagenes. Preparado para sincronizar (registros con marca de tiempo). */
(function (IM) {
  var NOMBRE = 'contenido_imagenes', ALMACENES = ['proyectos', 'pix'], db = null, mem = { proyectos: {}, pix: {} }, subs = [], listo = null;
  function abrir() {
    if (listo) return listo;
    listo = new Promise(function (ok) {
      try {
        var rq = indexedDB.open(NOMBRE, 1);
        rq.onupgradeneeded = function () { ALMACENES.forEach(function (s) { if (!rq.result.objectStoreNames.contains(s)) rq.result.createObjectStore(s); }); };
        rq.onsuccess = function () { db = rq.result; ok(db); };
        rq.onerror = rq.onblocked = function () { ok(null); };
      } catch (e) { ok(null); }
    });
    return listo;
  }
  function tx(s, modo, f) {
    return abrir().then(function (d) {
      if (!d) return f(null);
      return new Promise(function (ok, no) {
        var t = d.transaction(s, modo), st = t.objectStore(s), r = f(st);
        t.oncomplete = function () { ok(r && r.result !== undefined ? r.result : r); }; t.onerror = t.onabort = function () { no(t.error); };
      });
    });
  }
  var A = {
    abrir: abrir,
    get: function (s, k) { return tx(s, 'readonly', function (st) { return st ? st.get(k) : mem[s][k]; }); },
    set: function (s, k, v) {
      if (v && typeof v === 'object' && !(v instanceof Blob)) v.modificado = Date.now();
      return tx(s, 'readwrite', function (st) { if (st) return st.put(v, k); mem[s][k] = v; }).then(function () { subs.forEach(function (f) { f(s, k); }); });
    },
    borrar: function (s, k) { return tx(s, 'readwrite', function (st) { if (st) return st.delete(k); delete mem[s][k]; }).then(function () { subs.forEach(function (f) { f(s, k); }); }); },
    claves: function (s) { return tx(s, 'readonly', function (st) { return st ? st.getAllKeys() : Object.keys(mem[s]); }); },
    lista: function (s) {
      return A.claves(s).then(function (ks) { return Promise.all(ks.map(function (k) { return A.get(s, k).then(function (v) { return { clave: k, valor: v }; }); })); });
    },
    suscribir: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    lsGet: function (k, def) { try { var v = localStorage.getItem('contenido_imagenes_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    lsSet: function (k, v) { try { localStorage.setItem('contenido_imagenes_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  IM.Almacen = A;
})(window.IM);
