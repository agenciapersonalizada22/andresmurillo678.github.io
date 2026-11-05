/* Capa de datos: contrato (Datos.cargar) -> respaldo directo desde el navegador (CoinGecko / Frankfurter) -> modo demo.
   Cada seccion conserva su origen: 'vivo' | 'cache' | 'directo' | 'demo'. */
(function () {
  var UMBRAL = { cripto: 3600000, acciones: 93600000, divisas: 111600000, nft: 21600000, noticias: 21600000 };
  var RUTAS = { cripto: 'mercados/cripto.json', acciones: 'mercados/acciones.json', divisas: 'mercados/divisas.json', nft: 'mercados/nft.json', noticias: 'mercados/noticias.json' };
  var M = { sec: {}, activos: [], porKey: {}, hist: {}, modo: 'auto', ajustes: { forzarDemo: false, sinDirecto: false }, errores: [] };
  var MONEDAS_FX = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'MXN', 'DOP', 'COP', 'ARS', 'BRL', 'CLP', 'PEN'];
  try { if (/[?&]demo=1/.test(location.search)) M.ajustes.forzarDemo = true; } catch (e) {}

  function timeout(p, ms) { return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error('Tiempo agotado')); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); }); }
  function getJSON(url) { return timeout(fetch(url, { cache: 'no-cache' }).then(function (r) { if (r.status === 429) throw new Error('Limite de peticiones de la API publica (429). Espera un minuto.'); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }), 15000); }
  function demo(ruta) { var F = window.Fixtures, n = Date.now(); return { 'mercados/cripto.json': F.cripto, 'mercados/acciones.json': F.acciones, 'mercados/divisas.json': F.divisas, 'mercados/nft.json': F.nft, 'mercados/noticias.json': F.noticias }[ruta](n); }

  /* ---- respaldos directos ---- */
  function cripDirecto() {
    return getJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h,24h,7d').then(function (a) {
      return { generado: new Date().toISOString(), fuente: 'CoinGecko (directo desde el navegador)', items: a.map(function (x) {
        return { id: x.id, simbolo: String(x.symbol).toUpperCase(), nombre: x.name, precio: x.current_price, cambio1h: x.price_change_percentage_1h_in_currency, cambio24h: x.price_change_percentage_24h_in_currency != null ? x.price_change_percentage_24h_in_currency : x.price_change_percentage_24h,
          cambio7d: x.price_change_percentage_7d_in_currency, capitalizacion: x.market_cap, volumen24h: x.total_volume, sparkline7d: (x.sparkline_in_7d && x.sparkline_in_7d.price) || [] };
      }) };
    });
  }
  function fxDirecto() {
    var fin = new Date(), ini = new Date(Date.now() - 100 * 86400000), d = function (x) { return x.toISOString().slice(0, 10); };
    return getJSON('https://api.frankfurter.app/' + d(ini) + '..' + d(fin) + '?from=USD&to=' + MONEDAS_FX.join(',')).then(function (r) {
      var hist = {}, tasas = {};
      Object.keys(r.rates).sort().forEach(function (f) { Object.keys(r.rates[f]).forEach(function (m) { (hist[m] = hist[m] || []).push([f, r.rates[f][m]]); }); });
      Object.keys(hist).forEach(function (m) { tasas[m] = hist[m][hist[m].length - 1][1]; });
      return { generado: new Date().toISOString(), fuente: 'Frankfurter / BCE (directo desde el navegador; no incluye DOP, COP, ARS, CLP, PEN)', base: 'USD', tasas: tasas, hist: hist };
    });
  }
  var DIRECTO = { cripto: cripDirecto, divisas: fxDirecto };

  function cargarSeccion(sec, forzar) {
    var ruta = RUTAS[sec], estado = { sec: sec, origen: '', obj: null, error: null, intentos: [] };
    function fin(origen, obj) { estado.origen = origen; estado.obj = obj; return estado; }
    if (M.ajustes.forzarDemo) return Promise.resolve(fin('demo', demo(ruta)));
    return window.Datos.cargar(ruta, { forzar: forzar }).then(function (o) { return fin(o._obsoleto ? 'cache' : 'vivo', o); }).catch(function (e) {
      estado.intentos.push('Contrato: ' + e.message);
      if (DIRECTO[sec] && !M.ajustes.sinDirecto) return DIRECTO[sec]().then(function (o) { return fin('directo', o); }).catch(function (e2) { estado.intentos.push('Directo: ' + e2.message); return fin('demo', demo(ruta)); });
      return fin('demo', demo(ruta));
    });
  }

  function nuevoActivo(o) { return Object.assign({ cambio24h: null, capitalizacion: null, volumen: null, spark: null }, o); }
  function normalizar() {
    var L = [], s = M.sec, i;
    if (s.cripto) s.cripto.obj.items.slice().sort(function (a, b) { return (b.capitalizacion || 0) - (a.capitalizacion || 0); }).forEach(function (x, i) { L.push(nuevoActivo({ key: 'c:' + x.id, tipo: 'cripto', id: x.id, simbolo: x.simbolo, nombre: x.nombre, precio: x.precio, cambio24h: x.cambio24h, cambio7d: x.cambio7d, cambio1h: x.cambio1h, capitalizacion: x.capitalizacion, volumen: x.volumen24h, spark: x.sparkline7d, moneda: 'USD', rango: i + 1, raw: x })); });
    if (s.acciones) {
      s.acciones.obj.items.forEach(function (x) { L.push(nuevoActivo({ key: 'a:' + x.simbolo, tipo: 'accion', id: x.simbolo, simbolo: x.simbolo, nombre: x.nombre, bolsa: x.bolsa, precio: x.precio, cambio24h: x.cambioPct, capitalizacion: x.capitalizacion, volumen: x.volumen, moneda: s.acciones.obj.moneda || 'USD', raw: x })); });
      (s.acciones.obj.indices || []).forEach(function (x) { L.push(nuevoActivo({ key: 'i:' + x.simbolo, tipo: 'indice', id: x.simbolo, simbolo: x.simbolo, nombre: x.nombre, bolsa: 'Indice', precio: x.precio, cambio24h: x.cambioPct, volumen: x.volumen, moneda: 'pts', raw: x })); });
    }
    if (s.divisas) {
      var d = s.divisas.obj;
      Object.keys(d.tasas).forEach(function (m) {
        var h = (d.hist && d.hist[m]) || [], u = h.length > 1 ? h[h.length - 2][1] : null;
        L.push(nuevoActivo({ key: 'f:' + m, tipo: 'divisa', id: m, simbolo: 'USD/' + m, nombre: 'Dolar / ' + m, precio: d.tasas[m], cambio24h: u ? (d.tasas[m] / u - 1) * 100 : null, spark: h.slice(-30).map(function (q) { return q[1]; }), moneda: m, raw: { hist: h } }));
      });
    }
    if (s.nft) s.nft.obj.colecciones.forEach(function (x) { L.push(nuevoActivo({ key: 'n:' + x.id, tipo: 'nft', id: x.id, simbolo: x.id, nombre: x.nombre, precio: x.piso, cambio24h: x.cambio24h, volumen: x.volumen24h, moneda: x.moneda, raw: x })); });
    M.activos = L; M.porKey = {}; L.forEach(function (a) { M.porKey[a.key] = a; });
  }
  M.cargar = function (forzar) {
    var nombres = Object.keys(RUTAS);
    return Promise.all(nombres.map(function (n) { return cargarSeccion(n, forzar); })).then(function (r) {
      nombres.forEach(function (n, i) { M.sec[n] = r[i]; }); normalizar(); M.ultimaCarga = Date.now(); return M;
    });
  };
  M.edad = function (sec) { var e = M.sec[sec]; if (!e) return null; return Date.now() - Date.parse(e.obj.generado); };
  M.obsoleto = function (sec) { var e = M.sec[sec]; return !!e && e.origen !== 'demo' && (e.origen === 'cache' || M.edad(sec) > UMBRAL[sec]); };
  M.hayDemo = function () { return Object.keys(M.sec).filter(function (k) { return M.sec[k].origen === 'demo'; }); };
  M.secOf = function (a) { return { cripto: 'cripto', accion: 'acciones', indice: 'acciones', divisa: 'divisas', nft: 'nft' }[a.tipo]; };
  M.buscar = function (q, lim) {
    q = String(q || '').trim().toLowerCase(); if (!q) return M.activos.slice(0, lim || 12);
    var pts = [];
    M.activos.forEach(function (a) {
      var s = a.simbolo.toLowerCase(), n = a.nombre.toLowerCase(), p = -1;
      if (s === q) p = 100; else if (s.indexOf(q) === 0) p = 80; else if (n.indexOf(q) === 0) p = 60; else if (n.indexOf(q) > 0 || s.indexOf(q) > 0) p = 30;
      if (p > 0) pts.push([p + (a.capitalizacion ? Math.log10(a.capitalizacion) / 20 : 0), a]);
    });
    return pts.sort(function (x, y) { return y[0] - x[0]; }).slice(0, lim || 12).map(function (x) { return x[1]; });
  };
  function limpiar(v) { return (v || []).filter(function (b) { return b && b.length >= 5 && isFinite(b[1]) && isFinite(b[2]) && isFinite(b[3]) && isFinite(b[4]); }).map(function (b) { return [b[0], b[1], b[2], b[3], b[4], b[5] || 0]; }); }
  function soloCierres(vals, fin, paso) { return vals.map(function (p, i) { return [fin - (vals.length - 1 - i) * paso, p, p, p, p, 0]; }); }
  /* Devuelve {velas, soloCierre, nota, origen} */
  function directoCripto(a) {
    return getJSON('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(a.id) + '/market_chart?vs_currency=usd&days=365&interval=daily').then(function (r) {
      var vols = {}; (r.total_volumes || []).forEach(function (q) { vols[q[0]] = q[1]; });
      var v = [], prev = null; r.prices.forEach(function (q) { var o = prev == null ? q[1] : prev; v.push([q[0], o, Math.max(o, q[1]), Math.min(o, q[1]), q[1], vols[q[0]] || 0]); prev = q[1]; });
      return { velas: v, origen: 'directo', nota: 'Velas aproximadas a partir de cierres diarios de CoinGecko (maximo y minimo estimados).' };
    });
  }
  M.historial = function (a, opts) {
    opts = opts || {}; if (M.hist[a.key]) return M.hist[a.key];
    var sec = M.sec[M.secOf(a)], p, nota = '';
    function sp() { return a.spark && a.spark.length > 5 ? { velas: soloCierres(a.spark, a.tipo === 'cripto' ? Date.parse(sec.obj.generado) : Date.now(), a.tipo === 'cripto' ? 3600000 : 86400000), soloCierre: true, nota: 'Sin historial diario disponible: se muestra solo el cierre de los datos recientes.', origen: sec.origen } : null; }
    if (a.tipo === 'divisa') p = Promise.resolve({ velas: soloCierres([], 0, 0).concat((a.raw.hist || []).map(function (q) { return [Date.parse(q[0]), q[1], q[1], q[1], q[1], 0]; })), soloCierre: true, nota: 'Las divisas solo traen la tasa diaria (sin maximos/minimos).', origen: sec.origen });
    else if (a.tipo === 'nft') p = Promise.resolve({ velas: [], soloCierre: true, nota: 'Las colecciones NFT no tienen historial en el contrato de datos.', origen: sec.origen });
    else {
      var ruta = a.tipo === 'cripto' ? 'mercados/cripto_hist/' + a.id + '.json' : 'mercados/acciones_hist/' + encodeURIComponent(a.id) + '.json';
      if (sec.origen === 'demo' || M.ajustes.forzarDemo) {
        var d = a.tipo === 'cripto' ? window.Fixtures.histCripto(a.id, Date.now()) : window.Fixtures.histAccion(a.id, Date.now());
        p = Promise.resolve(d ? { velas: d.velas, origen: 'demo' } : (sp() || { velas: [], nota: 'Sin historial' }));
      } else if (a.tipo === 'cripto' && a.rango > 50 && !M.ajustes.sinDirecto && opts.directo) p = directoCripto(a).catch(function () { return sp() || { velas: [], nota: 'Sin historial' }; });
      else if (a.tipo === 'cripto' && a.rango > 50) p = Promise.resolve(sp() || { velas: [], nota: 'Sin historial' });
      else p = window.Datos.cargar(ruta).then(function (o) { return { velas: limpiar(o.velas), origen: sec.origen }; }).catch(function (e) {
        if (a.tipo === 'cripto' && !M.ajustes.sinDirecto) return directoCripto(a).catch(function () { return sp() || { velas: [], nota: 'No se pudo cargar el historial: ' + e.message }; });
        return sp() || { velas: [], nota: 'No se pudo cargar el historial: ' + e.message };
      });
    }
    M.hist[a.key] = p.then(function (r) { r.velas = limpiar(r.velas); return r; });
    M.hist[a.key].catch(function () { delete M.hist[a.key]; });
    return M.hist[a.key];
  };
  /* carga varios historiales con concurrencia limitada */
  M.historialLote = function (activos, conc, progreso) {
    var i = 0, hechos = 0, out = {};
    return new Promise(function (res) {
      function sig() {
        if (i >= activos.length) { if (hechos >= activos.length) res(out); return; }
        var a = activos[i++];
        M.historial(a).then(function (h) { out[a.key] = h; }, function () {}).then(function () { hechos++; if (progreso) progreso(hechos, activos.length); sig(); });
      }
      if (!activos.length) return res(out);
      for (var k = 0; k < Math.min(conc || 6, activos.length); k++) sig();
    });
  };
  M.tasas = function () { return (M.sec.divisas && M.sec.divisas.obj.tasas) || {}; };
  M.UMBRAL = UMBRAL;
  window.Mercado = M;
})();
