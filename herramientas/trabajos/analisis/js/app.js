/* Estado compartido de Analisis: lee los modulos, calcula y avisa a las vistas. window.Ana */
(function (g) {
  'use strict';
  var T = g.Tr, Agg = g.AnaAgg, C = g.AnaCruces, I = g.AnaInteg, D = g.AnaDatos, A = g.Ana = { est: { datos: null, an: null, metas: [], integridad: null, cargando: false, error: '' } }, oy = {};
  A.on = function (ev, f) { (oy[ev] = oy[ev] || []).push(f); };
  A.emit = function (ev, x) { (oy[ev] || []).forEach(function (f) { try { f(x); } catch (e) { console.error(e); } }); };
  A.logro = function (id) { if (g.CuentaTrabajos) g.CuentaTrabajos.logro(id); };
  A.cargar = async function () {
    var e = A.est; if (e.cargando) return; e.cargando = true; e.error = ''; A.emit('cargando');
    try {
      e.datos = await g.AnaLector.leerTodo(); e.metas = await D.metas(); e.integridad = I.verificar(e.datos);
      A.recalcular();
    } catch (x) { console.error(x); e.error = 'No se pudieron leer los datos locales: ' + (x && x.message || x); }
    e.cargando = false; A.emit('listo');
  };
  A.recalcular = function () {
    var e = A.est, u = g.Cuenta && g.Cuenta.usuario;
    e.an = C.analizar(e.datos, { ahora: e.datos.ahora, metas: e.metas, integridad: e.integridad, respaldoUlt: D.ultimoRespaldo(), sesion: !!u });
    e.modelos = {}; // se recalculan bajo demanda
  };
  A.modelo = function (tipo) { var e = A.est; e.modelos = e.modelos || {}; return e.modelos[tipo] || (e.modelos[tipo] = g.AnaInforme.modelo(e.an, e.datos, tipo)); };
  /* formatos */
  var U = A.u = {};
  U.n = function (v, d) { return v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es', { maximumFractionDigits: d == null ? 2 : d }); };
  U.din = function (v, mon) { return v == null ? '—' : (+v).toLocaleString('es', { maximumFractionDigits: 2 }) + (mon ? ' ' + mon : ''); };
  U.pct = function (v) { return v == null || !isFinite(v) ? '—' : Math.round(v * 100) + ' %'; };
  U.bytes = function (b) { b = +b || 0; return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : b < 1073741824 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1073741824).toFixed(2) + ' GB'; };
  U.fecha = function (t) { return t ? new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };
  U.hace = function (t) { if (!t) return 'nunca'; var s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 90 ? 'hace unos segundos' : s < 5400 ? 'hace ' + Math.round(s / 60) + ' min' : s < 129600 ? 'hace ' + Math.round(s / 3600) + ' h' : 'hace ' + Math.round(s / 86400) + ' d'; };
  U.tile = function (valor, etq, sub, nivel) { return T.h('div', { cls: 'an-tile' + (nivel ? ' an-' + nivel : '') }, [T.h('b', { txt: String(valor) }), T.h('span', { txt: etq }), sub ? T.h('small', { txt: sub }) : null]); };
  U.tiles = function (l) { return T.h('div', { cls: 'an-tiles' }, l); };
  U.panel = function (titulo, hijos, o) { o = o || {}; return T.h('section', { cls: 'tr-panel an-panel' + (o.cls ? ' ' + o.cls : ''), 'aria-label': titulo }, [titulo ? T.h('h2', { txt: titulo }) : null].concat(hijos)); };
  U.nota = function (txt, tipo) { return T.h('p', { cls: 'tr-nota' + (tipo ? ' ' + tipo : ''), txt: txt }); };
  U.btn = function (txt, fn, cls, id) { var b = T.h('button', { type: 'button', cls: 'tr-btn' + (cls ? ' ' + cls : ''), txt: txt }); if (id) b.id = id; b.addEventListener('click', fn); return b; };
  U.sinDatos = function (msg) { return T.h('p', { cls: 'tr-vacio an-sd', txt: msg || 'Sin datos todavía. Cuando uses este módulo aparecerán aquí.' }); };
  U.chipEstado = function (txt, nivel) { return T.h('span', { cls: 'an-chip an-' + nivel, txt: txt }); };
  U.tabla = function (cab, filas, cls) {
    return T.h('div', { cls: 'an-scroll' }, [T.h('table', { cls: 'an-tbl ' + (cls || '') }, [T.h('thead', {}, [T.h('tr', {}, cab.map(function (c) { return T.h('th', { scope: 'col', txt: c }); }))]), T.h('tbody', {}, filas.map(function (f) { return T.h('tr', {}, f.map(function (c, i) { return T.h(i ? 'td' : 'th', i ? { 'data-et': cab[i] } : { scope: 'row' }, [c instanceof Node ? c : document.createTextNode(String(c))]); })); }))])]);
  };
})(window);
