/* Almacen de Monetizacion (IndexedDB 'trabajos_monetizacion'). Los datos financieros son locales; a la nube solo va la coleccion
   'cifrado' (una instantanea cifrada con la frase del usuario). La frase vive solo en memoria. window.MonDatos */
(function (g) {
  'use strict';
  var T = g.Tr, C = g.MonCalc, K = g.MonCripto, ID = 'trabajos_monetizacion';
  var COLS = ['config', 'movimientos', 'proyectos', 'clientes', 'recurrentes', 'facturas', 'paquetes', 'equipo', 'escenarios'];
  var alm = g.Almacen.crear(ID), D = g.MonDatos = { ID: ID, alm: alm, COLS: COLS, SYNC: ['cifrado'], m: {}, frase: null, KEY_CIF: ID + '_cifrado_dispositivo' };
  var oy = [], tCif = 0;
  D.on = function (f) { oy.push(f); };
  function emitir(col) { oy.forEach(function (f) { try { f(col); } catch (e) { console.error(e); } }); }

  var CFG0 = {
    id: 'cfg', moneda: 'USD', tasas: {}, tasasFecha: '',
    emisor: { nombre: '', idFiscal: '', direccion: '', contacto: '', logo: '', pago: '' },
    numeracion: { factura: { patron: 'FAC-{AAAA}-{NNNN}', sig: 1, reiniciar: true }, cotizacion: { patron: 'COT-{AAAA}-{NNNN}', sig: 1, reiniciar: true } },
    impuestosDoc: [{ nombre: 'Impuesto', pct: 0 }], diasVence: 15, terminos: '',
    plan: { saldo: 0, crecimiento: 3, meses: 12, reservaPct: 20, metaMes: 0, fondoMeses: 6, ahorrado: 0, aporte: 0, gastoBase: null, ingresoBase: null, estac: null, presupuesto: {}, tramos: [{ hasta: 10000, tasa: 10 }, { hasta: null, tasa: 20 }], tasaPlana: 15, usarTramos: false, deducibleGastosPct: 100, deduccionFija: 0, otroPct: 0 },
    categorias: { ingreso: [], gasto: [] }
  };
  function mezcla(a, b) { var o = JSON.parse(JSON.stringify(a)); Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) o[k] = mezcla(o[k], b[k]); else o[k] = b[k]; }); return o; }

  D.cargar = async function () {
    for (var i = 0; i < COLS.length; i++) D.m[COLS[i]] = await alm.lista(COLS[i]);
    D.cfg = mezcla(CFG0, D.m.config[0] || {});
    if (!D.m.config.length) await D.guardarCfg();
    await D.aplicarRecurrentes();
    var e = leerCif(); D.cifradoActivo = !!e.activo;
  };
  D.guardarCfg = async function () { D.cfg.id = 'cfg'; var r = await alm.set('config', D.cfg); D.m.config = [r]; emitir('config'); };
  D.lista = function (col) { return D.m[col] || []; };
  D.obtener = function (col, id) { return D.lista(col).filter(function (x) { return x.id === id; })[0]; };
  D.guardar = async function (col, o) {
    var r = await alm.set(col, o), l = D.m[col], i = l.findIndex(function (x) { return x.id === r.id; }); if (i >= 0) l[i] = r; else l.push(r);
    emitir(col); return r;
  };
  D.borrar = async function (col, id) { await alm.borrar(col, id); D.m[col] = D.m[col].filter(function (x) { return x.id !== id; }); emitir(col); };
  D.nuevoId = alm.nuevoId;

  /* ---------- moneda ---------- */
  D.monedas = function () {
    var s = {}; s[D.cfg.moneda] = 1; Object.keys(D.cfg.tasas || {}).forEach(function (k) { s[k] = 1; }); s.USD = 1;
    ['movimientos', 'facturas', 'recurrentes'].forEach(function (c) { D.lista(c).forEach(function (x) { if (x.moneda) s[x.moneda] = 1; }); });
    return Object.keys(s).sort();
  };
  D.sinTasa = {};
  D.conv = function (monto, de, a) {
    a = a || D.cfg.moneda; var v = C.convertir(monto, de || a, a, D.cfg.tasas || {});
    if (v == null) { D.sinTasa[de] = 1; return C.n(monto); } return v;
  };
  D.movsBase = function () {
    D.sinTasa = {};
    return D.lista('movimientos').map(function (x) {
      var p = D.obtener('proyectos', x.proyecto), c = D.obtener('clientes', x.cliente);
      return Object.assign({}, x, { monto: D.conv(x.monto, x.moneda), proyectoN: p ? p.nombre : '', clienteN: c ? c.nombre : '', fuenteN: x.fuente || x.categoria || '' });
    });
  };

  /* ---------- recurrentes ---------- */
  D.aplicarRecurrentes = async function () {
    var hoy = C.hoy(), n = 0;
    for (var i = 0; i < D.lista('recurrentes').length; i++) {
      var r = D.lista('recurrentes')[i]; if (r.activo === false) continue;
      var fechas = C.fechasRecurrente(r, hoy); if (!fechas.length) continue;
      for (var j = 0; j < fechas.length; j++) {
        await D.guardar('movimientos', { tipo: r.tipo, fecha: fechas[j], monto: r.monto, moneda: r.moneda, categoria: r.categoria, proyecto: r.proyecto, cliente: r.cliente, fuente: r.fuente, nota: r.descripcion || 'Recurrente', recurrente: r.id }); n++;
      }
      r.ultimaGen = fechas[fechas.length - 1]; await D.guardar('recurrentes', r);
    }
    return n;
  };

  /* ---------- documentos ---------- */
  D.numeroSiguiente = async function (tipo, fecha) {
    var est = D.cfg.numeracion[tipo], r = C.siguienteNumero(est, fecha); D.cfg.numeracion[tipo] = r.est; await D.guardarCfg(); return r.numero;
  };
  D.totales = function (f) { return C.totalesDoc(f); };
  D.estadoDoc = function (f) {
    var t = C.totalesDoc(f), hoy = C.hoy();
    if (f.estado === 'cancelada') return 'cancelada';
    if (f.tipo === 'cotizacion') return f.estado === 'aceptada' ? 'aceptada' : f.estado === 'enviada' ? (f.vence && f.vence < hoy ? 'vencida' : 'enviada') : 'borrador';
    if (t.total > 0 && t.saldo <= 0.005) return 'pagada';
    if (f.estado === 'borrador') return 'borrador';
    return f.vence && f.vence < hoy ? 'vencida' : t.pagado > 0 ? 'parcial' : 'enviada';
  };
  D.porCobrar = function () {
    return D.lista('facturas').filter(function (f) { return f.tipo === 'factura' && ['enviada', 'vencida', 'parcial'].indexOf(D.estadoDoc(f)) >= 0; }).map(function (f) {
      var t = C.totalesDoc(f), c = D.obtener('clientes', f.cliente);
      return { id: f.id, numero: f.numero, cliente: c ? c.nombre : '', contacto: c ? c.email || c.tel || '' : '', vence: f.vence, saldo: D.conv(t.saldo, f.moneda), saldoOrig: t.saldo, moneda: f.moneda, estado: D.estadoDoc(f), dias: f.vence ? C.diasEntre(f.vence, C.hoy()) : 0 };
    }).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; });
  };
  D.registrarPago = async function (f, monto, fecha, crearMov) {
    f.pagos = (f.pagos || []).concat([{ fecha: fecha, monto: C.n(monto) }]);
    await D.guardar('facturas', f);
    if (crearMov) await D.guardar('movimientos', { tipo: 'ingreso', fecha: fecha, monto: C.n(monto), moneda: f.moneda, categoria: f.categoria || 'Servicios', proyecto: f.proyecto, cliente: f.cliente, fuente: f.categoria || 'Servicios', nota: 'Pago ' + f.numero, factura: f.id });
  };

  /* ---------- equipo del modulo drones (solo lectura de su IndexedDB, si existe) ---------- */
  D.equipoDrones = function () {
    return new Promise(function (ok) {
      try {
        if (typeof indexedDB === 'undefined') return ok([]);
        var r = indexedDB.open('trabajos_drones'); // si no existe, se aborta sin crearla
        r.onupgradeneeded = function () { r.transaction.abort(); };
        r.onerror = function () { ok([]); };
        r.onsuccess = function () {
          var db = r.result; try {
            if (!db.objectStoreNames.contains('r')) { db.close(); return ok([]); }
            var q = db.transaction('r').objectStore('r').getAll();
            q.onsuccess = function () { db.close(); ok((q.result || []).filter(function (x) { return x.col === 'equipo' && x.v && !x.v.oculto; }).map(function (x) { return x.v; })); };
            q.onerror = function () { db.close(); ok([]); };
          } catch (e) { ok([]); }
        };
      } catch (e) { ok([]); }
    });
  };

  /* ---------- CSV de movimientos ---------- */
  D.COLS_CSV = [{ k: 'fecha', t: 'fecha' }, { k: 'tipo', t: 'tipo' }, { k: 'monto', t: 'monto' }, { k: 'moneda', t: 'moneda' }, { k: 'categoria', t: 'categoria' }, { k: 'fuente', t: 'fuente' }, { k: 'proyecto', t: 'proyecto' }, { k: 'cliente', t: 'cliente' }, { k: 'canal', t: 'canal' }, { k: 'nota', t: 'nota' }];
  D.exportarCSV = function () {
    var filas = D.lista('movimientos').slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).map(function (x) {
      var p = D.obtener('proyectos', x.proyecto), c = D.obtener('clientes', x.cliente); return Object.assign({}, x, { proyecto: p ? p.nombre : '', cliente: c ? c.nombre : '' });
    });
    return C.aCSV(filas, D.COLS_CSV);
  };
  async function entidad(col, nombre) {
    nombre = (nombre || '').trim(); if (!nombre) return undefined;
    var e = D.lista(col).filter(function (x) { return x.nombre.toLowerCase() === nombre.toLowerCase(); })[0];
    return (e || await D.guardar(col, { nombre: nombre })).id;
  }
  D.importarCSV = async function (texto) {
    var filas = T.csv(texto); if (filas.length < 2) throw new Error('El CSV no tiene filas.');
    var cab = filas[0].map(function (c) { return c.trim().toLowerCase(); }), idx = function (n) { return cab.indexOf(n); };
    if (idx('fecha') < 0 || idx('monto') < 0) throw new Error('Faltan las columnas «fecha» y «monto».');
    var n = 0, malas = 0;
    for (var i = 1; i < filas.length; i++) {
      var f = filas[i], v = function (c) { var j = idx(c); return j >= 0 ? (f[j] || '').trim() : ''; };
      var fecha = v('fecha'); if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(fecha)) { var p = fecha.split(/[\/-]/); fecha = p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2); }
      var monto = C.numES(v('monto')), tipo = /gasto|egreso|salida/i.test(v('tipo')) || monto < 0 && !v('tipo') ? 'gasto' : 'ingreso';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !monto) { malas++; continue; }
      await D.guardar('movimientos', { tipo: tipo, fecha: fecha, monto: Math.abs(monto), moneda: (v('moneda') || D.cfg.moneda).toUpperCase().slice(0, 4), categoria: v('categoria') || (tipo === 'gasto' ? 'Otros gastos' : 'Otros ingresos'), fuente: v('fuente'), proyecto: await entidad('proyectos', v('proyecto')), cliente: await entidad('clientes', v('cliente')), canal: v('canal'), nota: v('nota') }); n++;
    }
    return { n: n, malas: malas };
  };

  /* ---------- copia completa y cifrado ---------- */
  D.instantanea = function () { var o = { v: 1, t: Date.now(), cols: {} }; COLS.forEach(function (c) { o.cols[c] = D.lista(c); }); return o; };
  D.restaurarInstantanea = async function (snap, soloNuevos) {
    var regs = [], n = 0;
    Object.keys(snap.cols || {}).forEach(function (c) {
      if (COLS.indexOf(c) < 0) return;
      snap.cols[c].forEach(function (v) {
        if (!v || !v.id) return; var l = D.obtener(c, v.id);
        if (soloNuevos && l && (l._t || 0) >= (v._t || 0)) return;
        regs.push({ k: c + '/' + v.id, col: c, id: v.id, t: v._t || Date.now(), v: v }); n++;
      });
    });
    if (regs.length) await alm.restaurar(regs);
    await D.cargar0(); return n;
  };
  D.cargar0 = async function () { for (var i = 0; i < COLS.length; i++) D.m[COLS[i]] = await alm.lista(COLS[i]); D.cfg = mezcla(CFG0, D.m.config[0] || {}); emitir(null); };
  function leerCif() { try { return JSON.parse(T.ls(D.KEY_CIF) || '{}') || {}; } catch (e) { return {}; } }
  D.activarCifrado = async function (frase) {
    if (!K.disponible) throw new Error('Este navegador no admite cifrado WebCrypto.');
    D.frase = frase; await D.subirCifrado(); T.ls(D.KEY_CIF, JSON.stringify({ activo: true })); D.cifradoActivo = true; emitir('cifrado');
  };
  D.desactivarCifrado = async function (borrarNube) {
    D.frase = null; D.cifradoActivo = false; T.ls(D.KEY_CIF, JSON.stringify({ activo: false }));
    if (borrarNube) await alm.borrar('cifrado', 'datos'); emitir('cifrado');
  };
  D.desbloquear = function (frase) { D.frase = frase; };
  D.subirCifrado = async function () {
    if (!D.frase) throw new Error('Introduce tu frase para cifrar.');
    var paq = await K.cifrar(D.instantanea(), D.frase), r = await alm.set('cifrado', { id: 'datos', paq: paq, n: D.lista('movimientos').length });
    D.ultimoCifrado = Date.now(); emitir('cifrado'); return r;
  };
  D.tamanoCifrado = function () { return D.instantanea ? JSON.stringify(D.instantanea()).length : 0; };
  D.fusionarDesdeNube = async function (frase) {
    var r = await alm.get('cifrado', 'datos'); if (!r || !r.paq) throw new Error('No hay datos cifrados en la nube de esta cuenta todavía.');
    var snap = await K.descifrar(r.paq, frase); D.frase = frase; return D.restaurarInstantanea(snap, true);
  };
  alm.suscribir(null, function (col) {
    if (col === 'cifrado' || !D.frase || !D.cifradoActivo) return;
    clearTimeout(tCif); tCif = setTimeout(function () { D.subirCifrado().catch(function (e) { console.warn(e); }); }, 4000);
  });
})(window);
