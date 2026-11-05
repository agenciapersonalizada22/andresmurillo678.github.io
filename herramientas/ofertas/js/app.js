/* Nucleo de la aplicacion: estado, carga de datos, pipeline (busqueda -> filtros -> agrupar -> orden), persistencia, alertas, utilidades. */
(function () {
  var Of = window.Of, T = Of.texto, Mo = Of.moneda, Al = Of.alertas, C = Of.calor, St = Of.almacen;
  var DIA = 86400000;
  var AJ0 = { tema: 'auto', vista: 'rejilla', pais: '', moneda: 'original', silenciadas: [], favoritas: [], agrupar: true, vigentes: true, notif: false, demo: false, orden: 'calor' };
  var F0 = function () { return { cats: [], tiendas: [], pMin: '', pMax: '', dMin: 0, cupon: false, vigentes: true, moneda: '', pais: '', sinInflados: false, soloMin: false }; };
  var A = Of.app = {
    S: { items: [], porId: {}, hist: {}, tasas: { USD: 1 }, estado: null, ofertasObj: null, demo: false, motivoDemo: '', aj: Object.assign({}, AJ0), f: F0(), orden: 'calor', ordenManual: false, q: '',
      vista: 'ofertas', guardados: {}, carpetas: [], alertas: [], visita: { previa: 0, leida: 0 }, vis: [], nuevas: [], grupos: [], grupoDe: null, cargando: true, error: null, hits: [], sel: -1, parsed: null },
    vistas: {}, F0: F0, DIA: DIA
  };
  var S = A.S;

  /* ---------- utilidades ---------- */
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.fmt = function (v, mon) { return Mo.formato(v, mon, 'es'); };
  A.edad = function (ms) {
    if (ms == null || isNaN(ms)) return 'desconocida';
    var m = Math.round(ms / 60000);
    return m < 1 ? 'ahora mismo' : m < 60 ? 'hace ' + m + ' min' : m < 2880 ? 'hace ' + Math.round(m / 60) + ' h' : 'hace ' + Math.round(m / 1440) + ' d';
  };
  A.cuenta = function (ts, ahora, corto) {
    ahora = ahora || Date.now();
    var r = A.cuenta0(ts, ahora);
    if (corto) r.t = r.t.replace('Vence en ', '\u23F1 ').replace('Quedan ', '\u23F1 ');
    return r;
  };
  A.cuenta0 = function (ts, ahora) {
    var d = ts - ahora, s = Math.floor(d / 1000), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    if (d <= 0) return { t: 'Vencida', c: 'vencida' };
    if (d > 2 * DIA) return { t: 'Vence en ' + Math.floor(d / DIA) + ' d', c: '' };
    if (s >= 3600) return { t: 'Vence en ' + Math.floor(s / 3600) + ' h ' + p2(Math.floor(s % 3600 / 60)) + ' min', c: s < 6 * 3600 ? 'pronto' : '' };
    return { t: 'Quedan ' + p2(Math.floor(s / 60)) + ':' + p2(s % 60), c: 'pronto' };
  };
  A.urlSegura = function (u) { return /^https?:\/\//i.test(u || '') ? u : '#'; };
  A.toast = function (msg, o) {
    o = o || {};
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    if (o.accion) { var b = document.createElement('button'); b.type = 'button'; b.textContent = o.accion.texto; b.onclick = function () { o.accion.fn(); t.remove(); }; t.appendChild(b); }
    var cont = A.$('#toasts'); while (cont.children.length >= 2) cont.firstChild.remove();
    cont.appendChild(t); setTimeout(function () { t.remove(); }, o.ms || 3500);
  };
  A.copiar = function (txt, msg) {
    var ok = function () { A.toast(msg || 'Copiado'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { viejoCopiar(txt); ok(); });
    else { viejoCopiar(txt); ok(); }
  };
  function viejoCopiar(t) { var x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = 0; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) {} x.remove(); }
  A.dialogo = function (id, html, alCerrar) {
    var d = A.$('#' + id); d.innerHTML = '<div class="dc">' + html + '</div>';
    d.onclose = function () { if (alCerrar) alCerrar(); if (d._opener && d._opener.focus) try { d._opener.focus(); } catch (e) {} };
    d._opener = document.activeElement;
    if (!d.open) d.showModal();
    d.onclick = function (e) { if (e.target === d) d.close(); };
    A.$$('[data-cerrar]', d).forEach(function (b) { b.onclick = function () { d.close(); }; });
    return d;
  };
  var hue = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 360; };

  /* ---------- ajustes ---------- */
  A.setAj = function (p) { Object.assign(S.aj, p); St.set('aj', S.aj); A.aplicarTema(); };
  A.aplicarTema = function () {
    var r = document.documentElement, t = S.aj.tema;
    if (t === 'claro' || t === 'oscuro') r.dataset.tema = t; else delete r.dataset.tema;
    var oscuro = t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
    var m = A.$('meta[name=theme-color]'); if (m) m.content = oscuro ? '#0e1117' : '#f5f6f8';
    var b = A.$('#btnTema'); if (b) b.textContent = oscuro ? '☾' : '☀';
  };
  A.monedaAgg = function () { return S.aj.moneda !== 'original' ? S.aj.moneda : (Mo.PAIS_MONEDA[S.aj.pais] || 'USD'); };
  A.conv = function (v, de, a) { return Mo.convertir(v, de, a, S.tasas); };

  /* ---------- carga y preparacion ---------- */
  function paisDe(it) { return (it.pais || it.idioma || '').toString().toUpperCase() || Mo.MONEDA_PAIS[it.moneda] || ''; }
  A.clavesHist = function (it) { return [it.clave, it.id, T.tokens(it.tienda + ' ' + it.titulo).join('-')]; };
  function histDe(it) { var k = A.clavesHist(it); for (var i = 0; i < k.length; i++) if (k[i] && S.hist[k[i]]) return S.hist[k[i]]; return null; }
  A.histDe = histDe;
  function prep(raw) {
    var ahora = Date.now(), vistos = {}, out = [];
    raw.forEach(function (o) {
      if (!o || o.id == null || !isFinite(o.precio) || !o.titulo) return;
      var it = Object.assign({}, o); it.id = String(it.id); it.precio = +it.precio; it.moneda = it.moneda || 'USD'; it.tienda = it.tienda || 'Tienda'; it.categoria = it.categoria || 'general';
      it.fuente = it.fuente || 'desconocida'; it.precioAntes = isFinite(it.precioAntes) && +it.precioAntes > it.precio ? +it.precioAntes : null;
      it._ts = Date.parse(it.fecha) || ahora; it._vence = it.vence ? Date.parse(it.vence) || 0 : 0; it._pais = paisDe(it);
      it._desc = it.descuentoPct != null && isFinite(it.descuentoPct) ? Math.round(it.descuentoPct) : it.precioAntes ? Math.round((1 - it.precio / it.precioAntes) * 100) : 0;
      it._ph = 'hsl(' + hue(it.categoria) + ' 45% ' + (50 + hue(it.id) % 12) + '%)';
      it._an = C.analizar(it, histDe(it), ahora); it._calor = C.puntaje(it, it._an, ahora);
      if (vistos[it.id] != null) out[vistos[it.id]] = it; else { vistos[it.id] = out.length; out.push(it); }
    });
    return out;
  }
  A.precios = function () {
    var m = S.aj.moneda;
    S.items.forEach(function (it) {
      var dest = m !== 'original' && Mo.puede(it.moneda, m, S.tasas) ? m : it.moneda;
      it._mv = dest; it._pv = A.conv(it.precio, it.moneda, dest); it._av = it.precioAntes ? A.conv(it.precioAntes, it.moneda, dest) : null;
      it._usd = A.conv(it.precio, it.moneda, 'USD');
    });
  };
  A.itemDeSnap = function (snap) { var it = prep([snap])[0]; if (it) { var m = S.aj.moneda; it._mv = it.moneda; it._pv = it.precio; it._av = it.precioAntes; it._usd = A.conv(it.precio, it.moneda, 'USD'); it._snap = true; } return it; };

  function tomarDatos(d) {
    S.ofertasObj = d.ofertas; S.hist = d.historial || {}; S.tasas = Object.assign({ USD: 1 }, d.divisas && d.divisas.tasas || {}); S.estado = d.estado || null;
    S.items = prep(d.ofertas.items || []); S.porId = {}; S.items.forEach(function (it, i) { S.porId[it.id] = it; it._i = i; });
    A.precios(); S.categorias = uniq(S.items.map(function (i) { return i.categoria; })); S.tiendas = uniq(S.items.map(function (i) { return i.tienda; }));
    S.monedas = uniq(S.items.map(function (i) { return i.moneda; })); S.paises = uniq(S.items.map(function (i) { return i._pais; }).filter(Boolean));
  }
  function uniq(a) { var o = {}; a.forEach(function (x) { o[x] = (o[x] || 0) + 1; }); return Object.keys(o).sort(function (x, y) { return o[y] - o[x] || (x < y ? -1 : 1); }); }
  A.uniq = uniq;
  function datosDemo(motivo) {
    var p = new URLSearchParams(location.search).get('demo'), n = Math.max(20, Math.min(8000, parseInt(p, 10) || 160));
    var d = Of.demo.generar({ n: n, ahora: Date.now(), etiquetar: true, edadMin: 8 });
    S.demo = true; S.motivoDemo = motivo || ''; tomarDatos(d);
  }
  A.cargar = async function (forzar) {
    S.cargando = true; S.error = null;
    var forzarDemo = new URLSearchParams(location.search).has('demo') || S.aj.demo;
    try {
      if (forzarDemo) throw new Error('demo-manual');
      var r = await Promise.all([Datos.cargar('ofertas/ofertas.json', { forzar: forzar }), Datos.cargar('ofertas/historial.json', { forzar: forzar }).catch(function () { return {}; }),
        Datos.cargar('mercados/divisas.json').catch(function () { return null; }), Datos.estado().catch(function () { return null; })]);
      if (!r[0] || !r[0].items || !r[0].items.length) throw new Error('El archivo de ofertas esta vacio.');
      S.demo = false; S.motivoDemo = ''; tomarDatos({ ofertas: r[0], historial: r[1], divisas: r[2], estado: r[3] });
    } catch (e) {
      datosDemo(e.message === 'demo-manual' ? 'manual' : 'No se pudieron cargar las ofertas reales (' + e.message + ').');
    }
    S.cargando = false;
    await A.indexar();
    if (A.pintarFiltros) A.pintarFiltros();
    A.evaluarAlertas(); A.calcNuevas(); A.pintarAvisos(); A.pintarNav();
    A.recalcular();
  };

  /* ---------- worker de busqueda ---------- */
  var worker = null, pend = {}, rid = 0, indiceLocal = null;
  function docs() {
    return S.items.map(function (it) { return { titulo: it.titulo, tienda: it.tienda, cat: it.categoria, precio: it._pv, desc: it._desc, cupon: !!it.cupon, moneda: it.moneda, pais: it._pais, extra: it.cupon ? 'cupon' : '' }; });
  }
  function llamar(msg, trans) {
    return new Promise(function (res) { var id = ++rid; msg.id = id; pend[id] = res; worker.postMessage(msg, trans || []); });
  }
  A.indexar = function () {
    var d = docs();
    if (!worker && !A.sinWorker) { try { worker = new Worker('js/worker.js'); worker.onmessage = function (e) { var f = pend[e.data.id]; if (f) { delete pend[e.data.id]; f(e.data); } }; worker.onerror = function () { worker = null; A.sinWorker = true; }; } catch (e) { worker = null; A.sinWorker = true; } }
    if (worker) return llamar({ op: 'indexar', docs: d }).then(function (r) { if (r.op === 'error') throw new Error(r.error); S.grupos = r.grupos; setGrupoDe(); }).catch(function () { A.sinWorker = true; worker = null; return A.indexar(); });
    indiceLocal = new Of.busqueda.Indice(d); var gr = Of.duplicados.agrupar(S.items); S.grupos = gr.grupos; setGrupoDe(); return Promise.resolve();
  };
  function setGrupoDe() { S.grupoDe = new Int32Array(S.items.length); S.grupos.forEach(function (g, k) { g.forEach(function (i) { S.grupoDe[i] = k; }); }); }
  A.miembros = function (it) { return (S.grupos[S.grupoDe[it._i]] || [it._i]).map(function (i) { return S.items[i]; }); };
  function buscar(q) {
    if (!q.trim()) return Promise.resolve({ idx: null, puntaje: null, parsed: null });
    if (worker) return llamar({ op: 'buscar', q: q }).then(function (r) { return { idx: r.idx, puntaje: r.puntaje, parsed: Of.busqueda.parse(q) }; });
    var r = indiceLocal.buscar(q); return Promise.resolve({ idx: r.idx, puntaje: r.puntaje, parsed: r.parsed });
  }

  /* ---------- pipeline ---------- */
  A.pasa = function (it, ahora) {
    var f = S.f;
    if (S.aj.silenciadas.indexOf(it.tienda) >= 0) return false;
    if (f.cats.length && f.cats.indexOf(it.categoria) < 0) return false;
    if (f.tiendas.length && f.tiendas.indexOf(it.tienda) < 0) return false;
    if (f.pMin !== '' && it._pv < +f.pMin) return false;
    if (f.pMax !== '' && it._pv > +f.pMax) return false;
    if (f.dMin && it._desc < f.dMin) return false;
    if (f.cupon && !it.cupon) return false;
    if (f.vigentes && it._vence && it._vence < ahora) return false;
    if (f.moneda && it.moneda !== f.moneda) return false;
    if (f.pais && it._pais !== f.pais) return false;
    if (f.sinInflados && it._an.inflado) return false;
    if (f.soloMin && !it._an.mejorHistorico) return false;
    return true;
  };
  A.filtrosActivos = function () {
    var f = S.f, n = 0; if (f.cats.length) n++; if (f.tiendas.length) n++; if (f.pMin !== '' || f.pMax !== '') n++; if (f.dMin) n++; if (f.cupon) n++; if (!f.vigentes) n++; if (f.moneda) n++; if (f.pais) n++; if (f.sinInflados) n++; if (f.soloMin) n++;
    return n;
  };
  var seq = 0;
  A.recalcular = async function () {
    var mi = ++seq, r = await buscar(S.q);
    if (mi !== seq) return;
    S.parsed = r.parsed; var ahora = Date.now(), lista = [], punt = {}, i, it;
    if (r.idx) for (i = 0; i < r.idx.length; i++) { it = S.items[r.idx[i]]; if (A.pasa(it, ahora)) { lista.push(it); punt[it.id] = r.puntaje[i]; } }
    else for (i = 0; i < S.items.length; i++) { it = S.items[i]; if (A.pasa(it, ahora)) lista.push(it); }
    S.totalFiltrado = lista.length;
    if (S.aj.agrupar && S.grupoDe) {
      var mejor = {};
      lista.forEach(function (x) { var g = S.grupoDe[x._i]; if (!mejor[g] || x._usd < mejor[g]._usd) mejor[g] = x; });
      lista = lista.filter(function (x) { return mejor[S.grupoDe[x._i]] === x; });
    }
    var orden = S.orden === 'relevancia' && !r.idx ? 'calor' : S.orden, fav = S.aj.favoritas;
    var clave = { relevancia: function (x) { return (punt[x.id] || 0) * 1000 + x._calor; }, calor: function (x) { return x._calor + (fav.indexOf(x.categoria) >= 0 ? 8 : 0); }, reciente: function (x) { return x._ts; }, descuento: function (x) { return x._desc; }, precio: function (x) { return -x._usd; } }[orden];
    lista = lista.map(function (x, k) { return [clave(x), k, x]; }).sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; }).map(function (p) { return p[2]; });
    S.vis = lista; S.sel = -1;
    if (A.alRecalcular) A.alRecalcular();
  };
  A.setQ = function (q) { S.q = q; if (!S.ordenManual) S.orden = q.trim() && /[a-z0-9]/i.test(q.replace(/\b\w+[:<>=]\S*/g, '')) ? 'relevancia' : S.aj.orden || 'calor'; A.recalcular(); };

  /* ---------- nuevas ---------- */
  A.calcNuevas = function () {
    S.nuevas = S.items.filter(function (it) { return it._ts > S.visita.previa && S.aj.silenciadas.indexOf(it.tienda) < 0 && (!it._vence || it._vence > Date.now()); }).sort(function (a, b) { return b._ts - a._ts; });
    S.nNuevas = S.nuevas.filter(function (it) { return it._ts > S.visita.leida; }).length;
  };
  A.esNueva = function (it) { return it._ts > S.visita.previa; };
  A.marcarLeidas = function () { S.visita.leida = Date.now(); St.set('visita', S.visita); A.calcNuevas(); A.pintarNav(); };

  /* ---------- guardados / carpetas / usadas ---------- */
  function snap(it) { var o = {}; ['id', 'titulo', 'tienda', 'precio', 'precioAntes', 'descuentoPct', 'moneda', 'url', 'imagen', 'categoria', 'fecha', 'fuente', 'cupon', 'vence', 'pais'].forEach(function (k) { if (it[k] != null) o[k] = it[k]; }); return o; }
  A.regGuardado = function (id) { return S.guardados[id]; };
  A.guardarReg = function (r) {
    if (!r.guardada && !r.usada) { delete S.guardados[r.id]; St.borrar('g:' + r.id); } else { S.guardados[r.id] = r; St.set('g:' + r.id, r); }
    A.pintarNav(); if (A.alGuardar) A.alGuardar(r.id);
  };
  A.toggleGuardar = function (it, forzar) {
    var r = S.guardados[it.id] || { id: it.id, carpetas: [], t: Date.now() }, on = forzar != null ? forzar : !r.guardada;
    r = Object.assign({}, r, { guardada: on, snap: snap(it), precioGuardado: r.precioGuardado || it.precio });
    if (on && !r.carpetas.length) r.carpetas = ['deseos'];
    A.guardarReg(r); return on;
  };
  A.setCarpetas = function (it, ids) { var r = Object.assign({ id: it.id, t: Date.now(), snap: snap(it), precioGuardado: it.precio }, S.guardados[it.id], { carpetas: ids, guardada: ids.length > 0 }); A.guardarReg(r); };
  A.marcarUsada = function (it, usada) {
    var r = S.guardados[it.id] || { id: it.id, carpetas: [], t: Date.now() };
    var ref = !it._an.sinHistorial ? it._an.ref : it.precioAntes, ah = usada && ref && ref > it.precio ? ref - it.precio : 0;
    r = Object.assign({}, r, { snap: snap(it), usada: usada, tUsada: usada ? Date.now() : null, ahorro: ah, ahorroMoneda: it.moneda });
    A.guardarReg(r);
    A.toast(usada ? (ah ? 'Marcada como usada. Ahorro estimado: ' + A.fmt(ah, it.moneda) : 'Marcada como usada') : 'Desmarcada');
  };
  A.nuevaCarpeta = function (nombre) {
    var c = { id: 'c' + Date.now().toString(36), nombre: nombre.trim().slice(0, 40) }; if (!c.nombre) return null;
    S.carpetas.push(c); St.set('c:' + c.id, c); return c;
  };
  A.borrarCarpeta = function (id) {
    S.carpetas = S.carpetas.filter(function (c) { return c.id !== id; }); St.borrar('c:' + id);
    Object.keys(S.guardados).forEach(function (k) { var r = S.guardados[k]; if (r.carpetas.indexOf(id) >= 0) A.guardarReg(Object.assign({}, r, { carpetas: r.carpetas.filter(function (x) { return x !== id; }) })); });
  };

  /* ---------- alertas ---------- */
  A.guardarAlerta = function (a) { var i = S.alertas.findIndex(function (x) { return x.id === a.id; }); if (i >= 0) S.alertas[i] = a; else S.alertas.push(a); St.set('al:' + a.id, a); };
  A.borrarAlerta = function (id) { S.alertas = S.alertas.filter(function (a) { return a.id !== id; }); St.borrar('al:' + id); };
  A.evaluarAlertas = function () {
    var ctx = { ahora: Date.now(), convertir: A.conv, descReal: function (it) { return it._an.sinHistorial ? 0 : it._an.descReal * 100; } };
    var items = S.items.filter(function (i) { return S.aj.silenciadas.indexOf(i.tienda) < 0; });
    S.hits = Al.evaluar(S.alertas, items, ctx);
    var nuevos = 0, primera = null;
    S.hits.forEach(function (h) { if (h.nuevas.length) { nuevos += h.nuevas.length; primera = primera || h; } });
    if (nuevos && !S.demo) {
      var msg = nuevos + (nuevos === 1 ? ' oferta coincide' : ' ofertas coinciden') + ' con tus alertas';
      A.toast(msg, { accion: { texto: 'Ver', fn: function () { A.ir('alertas'); } }, ms: 7000 });
      if (S.aj.notif && window.Notification && Notification.permission === 'granted') {
        try { var it = primera.nuevas[0]; new Notification('Alerta: ' + Al.describir(primera.alerta), { body: it.titulo + ' - ' + A.fmt(it.precio, it.moneda) + ' en ' + it.tienda, tag: 'ofertas-' + primera.alerta.id }); } catch (e) {}
      }
      S.hits.forEach(function (h) { if (h.nuevas.length) A.guardarAlerta(Al.marcarVistos(h.alerta, h.nuevas)); });
      S.hits = Al.evaluar(S.alertas, items, ctx).map(function (h, k) { return h; });
    }
    A.pintarNav();
  };

  /* ---------- avisos / navegacion ---------- */
  A.pintarAvisos = function () {
    var el = A.$('#avisos'), h = '', o = S.ofertasObj, ed = Datos.edad(o);
    if (S.demo) h += '<div class="aviso demo"><strong>MODO DEMO</strong> Datos ficticios, no son ofertas reales.' + (S.motivoDemo && S.motivoDemo !== 'manual' ? ' Aun no hay datos publicados.' : '') + ' <button type="button" class="enlace" id="btnSalirDemo">' + (S.motivoDemo === 'manual' ? 'Usar datos reales' : 'Reintentar') + '</button></div>';
    else {
      var cls = ed == null ? 'info' : ed > 6 * 3600000 ? 'mal' : ed > 2 * 3600000 ? 'demo' : 'info', ob = o && o._obsoleto;
      var fu = S.estado && S.estado.fuentes ? Object.keys(S.estado.fuentes) : [], bien = fu.filter(function (k) { return S.estado.fuentes[k].ok; }).length;
      h += '<div class="aviso ' + (ob ? 'mal' : cls) + '">Datos de ' + A.edad(ed) + ' &middot; ' + S.items.length + ' ofertas' + (fu.length ? ' &middot; fuentes ' + bien + '/' + fu.length + ' ok' : '') +
        (ob ? ' &middot; <strong>sin conexion: datos guardados</strong>' : ed > 6 * 3600000 ? ' &middot; <strong>datos obsoletos</strong>' : '') + '</div>';
    }
    el.innerHTML = h;
    var b = A.$('#btnSalirDemo'); if (b) b.onclick = function () { if (S.aj.demo) A.setAj({ demo: false }); if (new URLSearchParams(location.search).has('demo')) { var u = new URL(location.href); u.searchParams.delete('demo'); location.href = u.href; } else A.cargar(true); };
  };
  var NAV = [['ofertas', '🏷️', 'Ofertas'], ['nuevas', '🔔', 'Nuevas'], ['guardadas', '❤️', 'Guardadas'], ['alertas', '⏰', 'Alertas'], ['ahorro', '💰', 'Ahorro', 1], ['fuentes', '📡', 'Fuentes', 1], ['ajustes', '⚙️', 'Ajustes', 1]];
  A.pintarNav = function () {
    var cuenta = { nuevas: S.nNuevas || 0, alertas: S.hits.filter(function (h) { return h.nuevas.length || h.coincidencias.length; }).length };
    var h = NAV.map(function (n) {
      var c = cuenta[n[0]];
      return '<button type="button" data-vista="' + n[0] + '" class="' + (n[3] ? 'desk' : '') + '"' + (S.vista === n[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + n[1] + '</span><span>' + n[2] + '</span>' +
        (c ? '<span class="insignia" aria-label="' + c + ' pendientes">' + (c > 99 ? '99+' : c) + '</span>' : '') + '</button>';
    }).join('') + '<button type="button" class="movil-mas" data-vista="mas"' + (['ahorro', 'fuentes', 'ajustes'].indexOf(S.vista) >= 0 ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">⋯</span><span>Más</span></button>';
    A.$('#nav').innerHTML = h;
  };
  A.ir = function (v) {
    if (v === 'mas') return A.menuMas();
    S.vista = v; A.$$('.vista').forEach(function (s) { s.hidden = s.id !== 'v-' + v; });
    if (A.vistas[v] && A.vistas[v].mostrar) A.vistas[v].mostrar();
    A.pintarNav(); try { history.replaceState(null, '', location.pathname + location.search + '#' + v); } catch (e) {}
    A.listaActiva = A.vistas[v] && A.vistas[v].lista ? A.vistas[v].lista : null;
  };
  A.menuMas = function () {
    var d = A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Más</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div><div style="display:grid;gap:8px">' +
      ['ahorro:💰 Ahorro estimado', 'fuentes:📡 Fuentes y constructor', 'ajustes:⚙️ Ajustes'].map(function (x) { var p = x.split(':'); return '<button class="btn" data-ir="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>');
    A.$$('[data-ir]', d).forEach(function (b) { b.onclick = function () { d.close(); A.ir(b.dataset.ir); }; });
  };

  /* ---------- arranque ---------- */
  var refresco = null;
  A.iniciar = async function () {
    await St.abrir();
    S.aj = Object.assign({}, AJ0, St.get('aj', {}));
    S.f = Object.assign(F0(), St.get('filtros', {}), { vigentes: S.aj.vigentes });
    if (S.aj.pais && !St.get('filtros')) S.f.pais = '';
    S.orden = S.aj.orden || 'calor';
    S.carpetas = St.lista('c:').map(function (x) { return x.v; });
    St.lista('g:').forEach(function (x) { S.guardados[x.v.id] = x.v; });
    S.alertas = St.lista('al:').map(function (x) { return x.v; });
    var v = St.get('visita', null), ahora = Date.now();
    S.visita = v ? { previa: v.ultima || v.previa || ahora - DIA, leida: Math.max(v.leida || 0, v.ultima || 0), ultima: ahora } : { previa: ahora - DIA, leida: ahora - DIA, ultima: ahora };
    if (v && v.ultima && ahora - v.ultima < 10 * 60000) { S.visita.previa = v.previa || S.visita.previa; S.visita.leida = v.leida || S.visita.leida; }
    St.set('visita', S.visita);
    A.aplicarTema(); A.pintarNav();
    A.$('#nav').addEventListener('click', function (e) { var b = e.target.closest('[data-vista]'); if (b) A.ir(b.dataset.vista); });
    A.$('#btnTema').onclick = function () { var o = ['auto', 'claro', 'oscuro']; A.setAj({ tema: o[(o.indexOf(S.aj.tema) + 1) % 3] }); A.toast('Tema: ' + S.aj.tema); };
    if (matchMedia('(min-width:900px)').matches) A.$('#filtros').classList.add('abierto');
    A.$('#btnAvisos').onclick = function () { A.avisosLegales(); };
    if (A.montarFeed) A.montarFeed();
    var hv = (location.hash || '').replace('#', ''); if (NAV.some(function (n) { return n[0] === hv; })) A.ir(hv); else A.ir('ofertas');
    await A.cargar(false);
    setInterval(function () { A.$$('[data-vence]').forEach(function (e) { var c = A.cuenta(+e.dataset.vence, 0, e.dataset.corto); e.textContent = c.t; e.className = 'cuenta ' + c.c; }); }, 1000);
    refresco = setInterval(function () { if (navigator.onLine === false) return; var antes = S.ofertasObj && S.ofertasObj.generado; if (S.demo) return; A.cargar(true).then(function () { if (S.ofertasObj && S.ofertasObj.generado !== antes) A.toast('Ofertas actualizadas'); }); }, 5 * 60000);
    setInterval(A.pintarAvisos, 60000);
    if (A.alIniciado) A.alIniciado();
  };
})();
