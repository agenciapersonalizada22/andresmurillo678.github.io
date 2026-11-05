/* Almacen unico de datos: colecciones de registros con marcas por campo (reloj de Lamport) y registro de cambios.
   Interfaz: listo, get, lista, set, borrar, suscribir, cambios, aplicarRemoto, volcado, cargarVolcado, vaciar, copias.
   Cada registro: {id, ...campos, _m:{campo:[lamport, ms, sitio]}, _del?}. Una fase posterior puede sincronizar con la nube
   leyendo cambios(desde) y aplicando aplicarRemoto() (ultimo-escribe-gana por campo). Los datos viven en memoria y se
   persisten en segundo plano (IndexedDB) con escritura diferida + vaciar() al ocultar la pagina. */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), Mig = G.Migraciones || require('./migraciones.js');
  var MAX_CAMBIOS = 4000, MAX_COPIAS = 7;

  /* ---------- respaldos ---------- */
  function respaldoMemoria() {
    var datos = new Map(), meta = new Map(), cambios = [], copias = new Map();
    return {
      nombre: 'memoria', persistente: false,
      cargar: function () { return Promise.resolve({ datos: Array.from(datos.values()), meta: Object.fromEntries(meta), cambios: cambios.slice() }); },
      escribir: function (lote) {
        lote.recs.forEach(function (r) { r[2] ? datos.set(r[0] + '/' + r[1], { k: r[0] + '/' + r[1], col: r[0], rec: r[2] }) : datos.delete(r[0] + '/' + r[1]); });
        Object.keys(lote.meta).forEach(function (k) { meta.set(k, lote.meta[k]); });
        lote.cambios.forEach(function (c) { cambios.push(c); });
        if (lote.podar != null) cambios = cambios.filter(function (c) { return c.seq > lote.podar; });
        return Promise.resolve();
      },
      guardarCopia: function (c) { copias.set(c.id, c); return Promise.resolve(); },
      listarCopias: function () { return Promise.resolve(Array.from(copias.values()).map(function (c) { return { id: c.id, ts: c.ts, motivo: c.motivo, bytes: c.texto.length }; }).sort(function (a, b) { return b.ts - a.ts; })); },
      leerCopia: function (id) { return Promise.resolve(copias.get(id)); },
      borrarCopia: function (id) { copias.delete(id); return Promise.resolve(); }
    };
  }

  function respaldoIDB(nombreBD) {
    var dbp = null;
    function abrir() {
      if (dbp) return dbp;
      dbp = new Promise(function (ok, mal) {
        var q = G.indexedDB.open(nombreBD, 1);
        q.onupgradeneeded = function () {
          var db = q.result;
          db.createObjectStore('datos', { keyPath: 'k' }); db.createObjectStore('meta', { keyPath: 'k' });
          db.createObjectStore('cambios', { keyPath: 'seq' }); db.createObjectStore('copias', { keyPath: 'id' });
        };
        q.onsuccess = function () { ok(q.result); }; q.onerror = function () { mal(q.error); }; q.onblocked = function () { mal(new Error('bloqueada')); };
      });
      return dbp;
    }
    function todo(tx, nombre) { return new Promise(function (ok, mal) { var r = tx.objectStore(nombre).getAll(); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { mal(r.error); }; }); }
    function fin(tx) { return new Promise(function (ok, mal) { tx.oncomplete = ok; tx.onerror = function () { mal(tx.error); }; tx.onabort = function () { mal(tx.error || new Error('abortada')); }; }); }
    return {
      nombre: 'indexeddb', persistente: true,
      cargar: function () {
        return abrir().then(function (db) {
          var tx = db.transaction(['datos', 'meta', 'cambios'], 'readonly');
          return Promise.all([todo(tx, 'datos'), todo(tx, 'meta'), todo(tx, 'cambios')]).then(function (r) {
            var meta = {}; r[1].forEach(function (m) { meta[m.k] = m.v; });
            return { datos: r[0], meta: meta, cambios: r[2] };
          });
        });
      },
      escribir: function (lote) {
        return abrir().then(function (db) {
          var tx = db.transaction(['datos', 'meta', 'cambios'], 'readwrite'), d = tx.objectStore('datos'), m = tx.objectStore('meta'), c = tx.objectStore('cambios');
          lote.recs.forEach(function (r) { var k = r[0] + '/' + r[1]; if (r[2]) d.put({ k: k, col: r[0], rec: r[2] }); else d.delete(k); });
          Object.keys(lote.meta).forEach(function (k) { m.put({ k: k, v: lote.meta[k] }); });
          lote.cambios.forEach(function (x) { c.put(x); });
          if (lote.podar != null) c.delete(G.IDBKeyRange.upperBound(lote.podar));
          return fin(tx);
        });
      },
      guardarCopia: function (c) { return abrir().then(function (db) { var tx = db.transaction('copias', 'readwrite'); tx.objectStore('copias').put(c); return fin(tx); }); },
      listarCopias: function () {
        return abrir().then(function (db) { return todo(db.transaction('copias', 'readonly'), 'copias'); }).then(function (l) {
          return l.map(function (c) { return { id: c.id, ts: c.ts, motivo: c.motivo, bytes: c.texto.length }; }).sort(function (a, b) { return b.ts - a.ts; });
        });
      },
      leerCopia: function (id) { return abrir().then(function (db) { return new Promise(function (ok, mal) { var r = db.transaction('copias', 'readonly').objectStore('copias').get(id); r.onsuccess = function () { ok(r.result); }; r.onerror = function () { mal(r.error); }; }); }); },
      borrarCopia: function (id) { return abrir().then(function (db) { var tx = db.transaction('copias', 'readwrite'); tx.objectStore('copias').delete(id); return fin(tx); }); }
    };
  }

  /* ---------- almacen ---------- */
  function crear(op) {
    op = op || {};
    var resp = op.respaldo || respaldoMemoria();
    var S = { respaldo: resp, persistente: resp.persistente, error: null, sitio: op.sitio || '', lam: 0, seq: 0, esquema: Mig.ESQUEMA };
    var cols = {}, subs = [], log = [], pend = new Map(), metaPend = {}, logPend = [], timer = 0, escribiendo = Promise.resolve(), podarHasta = null;

    function mapa(c) { return cols[c] || (cols[c] = new Map()); }
    function programar() { if (!timer) timer = setTimeout(function () { timer = 0; S.vaciar(); }, op.retardo == null ? 120 : op.retardo); }
    function emitir(ev) { subs.slice().forEach(function (f) { try { f(ev); } catch (e) { console.error(e); } }); }
    function marcarSucio(col, id, rec) { pend.set(col + '/' + id, [col, id, rec]); programar(); }
    function aMeta(k, v) { metaPend[k] = v; }

    S.listo = resp.cargar().then(function (est) {
      est.datos.forEach(function (d) { mapa(d.col).set(d.rec.id, d.rec); });
      log = est.cambios.sort(function (a, b) { return a.seq - b.seq; });
      var m = est.meta || {};
      S.lam = m.lam || 0; S.seq = log.length ? log[log.length - 1].seq : (m.seq || 0);
      S.sitio = op.sitio || m.sitio || U.id();
      aMeta('sitio', S.sitio);
      var dump = null;
      if ((m.esquema || Mig.ESQUEMA) < Mig.ESQUEMA) {
        S.guardarCopiaAhora('antes de migrar v' + m.esquema);
        dump = S.volcado(); dump.esquema = m.esquema; Mig.migrar(dump); S.cargarVolcado(dump, 'reemplazar', true);
      }
      aMeta('esquema', Mig.ESQUEMA); S.meta = m; programar();
      return S;
    });
    S.meta = {};

    S.get = function (col, id) { var r = mapa(col).get(id); return r && !r._del ? r : undefined; };
    S.lista = function (col, pred) {
      var o = []; mapa(col).forEach(function (r) { if (!r._del && (!pred || pred(r))) o.push(r); }); return o;
    };
    S.contar = function (col) { var n = 0; mapa(col).forEach(function (r) { if (!r._del) n++; }); return n; };
    S.crudos = function (col) { return Array.from(mapa(col).values()); };
    S.suscribir = function (f) { subs.push(f); return function () { var i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; };

    function anotar(col, id, campos, op2, origen) {
      var e = { seq: ++S.seq, col: col, id: id, campos: campos, ts: Date.now(), lam: S.lam, sitio: S.sitio, op: op2, origen: origen === 'remoto' ? 'r' : 'l' };
      log.push(e); logPend.push(e);
      if (log.length > MAX_CAMBIOS + 500) { var corte = log[log.length - MAX_CAMBIOS].seq - 1; log = log.filter(function (x) { return x.seq > corte; }); podarHasta = corte; }
      aMeta('lam', S.lam); aMeta('seq', S.seq);
    }

    /* crea o actualiza campos. Devuelve el registro (vivo: no lo mutes) */
    S.set = function (col, id, parche, opts) {
      var m = mapa(col), rec = m.get(id), nuevo = !rec, revive = rec && rec._del, campos = [], k;
      if (nuevo) rec = { id: id, _m: {} };
      for (k in parche) {
        if (k === 'id' || k[0] === '_') continue;
        if (nuevo || revive || !U.igual(rec[k], parche[k])) campos.push(k);
      }
      if (!campos.length && !revive) return rec;
      var ts = Date.now(), lam = ++S.lam;
      campos.forEach(function (c) { rec[c] = U.clon(parche[c]); rec._m[c] = [lam, ts, S.sitio]; });
      if (revive) { delete rec._del; rec._m._del = [lam, ts, S.sitio]; campos.push('_del'); }
      m.set(id, rec);
      marcarSucio(col, id, rec);
      anotar(col, id, campos, nuevo ? 'crear' : 'cambio', opts && opts.origen);
      emitir({ col: col, id: id, rec: rec, tipo: nuevo ? 'crear' : 'cambio', campos: campos, origen: (opts && opts.origen) || 'local' });
      return rec;
    };
    S.poner = function (col, rec, opts) { return S.set(col, rec.id, rec, opts); };
    S.borrar = function (col, id, opts) {
      var m = mapa(col), rec = m.get(id);
      if (!rec || rec._del) return false;
      var lam = ++S.lam;
      Object.keys(rec).forEach(function (k) { if (k !== 'id' && k[0] !== '_') delete rec[k]; });
      rec._m = { _del: [lam, Date.now(), S.sitio] }; rec._del = true;
      marcarSucio(col, id, rec); anotar(col, id, ['_del'], 'borrar', opts && opts.origen);
      emitir({ col: col, id: id, rec: rec, tipo: 'borrar', campos: ['_del'], origen: (opts && opts.origen) || 'local' });
      return true;
    };

    function gana(a, b) { /* a (remoto) vence a b (local)? */
      if (!b) return true;
      if (a[0] !== b[0]) return a[0] > b[0];
      if (a[1] !== b[1]) return a[1] > b[1];
      return a[2] > b[2];
    }
    /* fusiona un registro remoto campo a campo. Devuelve la lista de campos cambiados */
    S.aplicarRemoto = function (col, id, rem, opts) {
      var m = mapa(col), rec = m.get(id), nuevo = !rec, cambiados = [], remM = rem._m;
      if (!remM) { /* sin marcas (importacion externa): solo rellena si no existe */
        if (rec && !rec._del) return [];
        var ts0 = Date.now(), lam0 = ++S.lam, nm = {}; remM = {};
        Object.keys(rem).forEach(function (k) { if (k !== 'id' && k[0] !== '_') remM[k] = [lam0, ts0, S.sitio]; });
      }
      if (nuevo) rec = { id: id, _m: {} };
      Object.keys(remM).forEach(function (k) {
        var c = remM[k]; if (!c) return;
        if (c[0] > S.lam) S.lam = c[0];
        if (!gana(c, rec._m[k])) return;
        if (k === '_del') { if (rem._del) { Object.keys(rec).forEach(function (q) { if (q !== 'id' && q[0] !== '_') delete rec[q]; }); rec._del = true; } else delete rec._del; }
        else rec[k] = U.clon(rem[k]);
        rec._m[k] = [c[0], c[1], c[2]]; cambiados.push(k);
      });
      if (!cambiados.length) return [];
      m.set(id, rec); marcarSucio(col, id, rec);
      anotar(col, id, cambiados, nuevo ? 'crear' : 'cambio', 'remoto');
      emitir({ col: col, id: id, rec: rec, tipo: rec._del ? 'borrar' : nuevo ? 'crear' : 'cambio', campos: cambiados, origen: (opts && opts.origen) || 'remoto' });
      return cambiados;
    };

    S.cambios = function (desde) { return log.filter(function (c) { return c.seq > (desde || 0); }); };

    S.volcado = function () {
      var o = { app: 'notas', esquema: Mig.ESQUEMA, exportado: new Date().toISOString(), sitio: S.sitio, cols: {} };
      Object.keys(cols).forEach(function (c) { var l = Array.from(cols[c].values()); if (l.length) o.cols[c] = U.clon(l); });
      return o;
    };
    /* modo 'fusionar' (LWW por campo) o 'reemplazar' (borra lo local). Migra si hace falta. Devuelve conteos */
    S.cargarVolcado = function (d, modo, silencioso) {
      Mig.migrar(d);
      var res = { nuevos: 0, actualizados: 0, total: 0 };
      if (modo === 'reemplazar') {
        Object.keys(cols).forEach(function (c) {
          var enDump = {}; (d.cols[c] || []).forEach(function (x) { if (!x._del) enDump[x.id] = 1; });
          cols[c].forEach(function (r, id) { if (!r._del && !enDump[id]) S.borrar(c, id, { origen: 'importacion' }); });
        });
        Object.keys(d.cols).forEach(function (c) {
          d.cols[c].forEach(function (r) {
            if (!r || !r.id) return; res.total++;
            var viejo = mapa(c).get(r.id);
            if (r._del) { if (viejo && !viejo._del) S.borrar(c, r.id, { origen: 'importacion' }); return; }
            if (viejo && !viejo._del) { Object.keys(viejo).forEach(function (k) { if (k !== 'id' && k[0] !== '_' && !(k in r)) { delete viejo[k]; delete viejo._m[k]; } }); }
            var campos = {}; Object.keys(r).forEach(function (k) { if (k !== 'id' && k[0] !== '_') campos[k] = r[k]; });
            viejo && !viejo._del ? res.actualizados++ : res.nuevos++;
            S.set(c, r.id, campos, { origen: silencioso ? 'migracion' : 'importacion' });
          });
        });
        return res;
      }
      Object.keys(d.cols).forEach(function (c) {
        d.cols[c].forEach(function (r) {
          if (!r || !r.id) return; res.total++;
          var viejo2 = mapa(c).get(r.id), existe = !!viejo2 && !viejo2._del, cam;
          if (viejo2 && viejo2._del && !r._del) { var cp = {}; Object.keys(r).forEach(function (k) { if (k !== 'id' && k[0] !== '_') cp[k] = r[k]; }); S.set(c, r.id, cp, { origen: 'importacion' }); cam = ['_del']; }
          else cam = S.aplicarRemoto(c, r.id, r, { origen: 'importacion' });
          if (cam.length) existe ? res.actualizados++ : res.nuevos++;
        });
      });
      return res;
    };

    /* ---------- persistencia ---------- */
    S.vaciar = function () {
      if (timer) { clearTimeout(timer); timer = 0; }
      if (!pend.size && !logPend.length && !Object.keys(metaPend).length) return escribiendo;
      var lote = { recs: Array.from(pend.values()), meta: metaPend, cambios: logPend, podar: podarHasta };
      pend = new Map(); metaPend = {}; logPend = []; podarHasta = null;
      escribiendo = escribiendo.then(function () { return resp.escribir(lote); }).catch(function (e) {
        S.error = e; console.error('Error al guardar', e);
        lote.recs.forEach(function (r) { if (!pend.has(r[0] + '/' + r[1])) pend.set(r[0] + '/' + r[1], r); }); programar();
      });
      return escribiendo;
    };
    S.pendiente = function () { return pend.size; };

    S.guardarCopiaAhora = function (motivo) {
      var texto = JSON.stringify(S.volcado()), c = { id: 'c' + Date.now().toString(36), ts: Date.now(), motivo: motivo || 'auto', texto: texto };
      return resp.guardarCopia(c).then(function () { return resp.listarCopias(); }).then(function (l) {
        return Promise.all(l.slice(MAX_COPIAS).map(function (x) { return resp.borrarCopia(x.id); }));
      }).then(function () { aMeta('copiaTs', c.ts); S.meta.copiaTs = c.ts; programar(); return c; });
    };
    S.copiaAuto = function (cadaMs) {
      var ult = S.meta.copiaTs || 0;
      if (Date.now() - ult < (cadaMs || 20 * 3600 * 1000) || !Object.keys(cols).length) return Promise.resolve(null);
      return S.guardarCopiaAhora('automática');
    };
    S.copias = function () { return resp.listarCopias(); };
    S.restaurarCopia = function (id) {
      return resp.leerCopia(id).then(function (c) { if (!c) throw new Error('Copia no encontrada'); return S.cargarVolcado(JSON.parse(c.texto), 'reemplazar'); });
    };
    S.borrarTodo = function () { Object.keys(cols).forEach(function (c) { Array.from(cols[c].keys()).forEach(function (id) { S.borrar(c, id); }); }); };
    return S;
  }

  var A = { crear: crear, respaldoMemoria: respaldoMemoria, respaldoIDB: respaldoIDB };
  if (typeof module !== 'undefined' && module.exports) module.exports = A; else G.Almacen = A;
})(typeof window !== 'undefined' ? window : globalThis);
