/* Estado compartido del estudio, bus de eventos y cliente de IA (clave del usuario, limites, consentimiento). window.CApp */
(function (g) {
  'use strict';
  var T = g.Tr, D = g.CDatos, V = g.VIA, E = g.CIA.editorial, A = g.CApp = { proyecto: null, proyectos: [], piezas: [], series: [], prompts: [], metricas: [], respuestas: [] }, oy = {}, tProy = 0;
  A.on = function (ev, fn) { (oy[ev] = oy[ev] || []).push(fn); };
  A.emit = function (ev) { (oy[ev] || []).forEach(function (f) { try { f(); } catch (e) { if (g.console) console.error(e); } }); };
  A.cargar = async function () {
    A.proyectos = await D.proyectos();
    if (!A.proyectos.length) { var p = await D.guardarProyectos(D.nuevoProyecto('Mi canal')); A.proyectos = [p]; }
    var act = D.proyectoActivo(); A.proyecto = A.proyectos.filter(function (x) { return x.id === act; })[0] || A.proyectos[0]; D.fijarProyecto(A.proyecto.id);
    await A.recargarDatos(); A.emit('proyecto');
  };
  A.recargarDatos = async function () {
    var id = A.proyecto.id, r = await Promise.all(['piezas', 'series', 'prompts', 'metricas', 'respuestas'].map(function (c) { return D.lista(c, c === 'respuestas' ? null : id); }));
    A.piezas = r[0].sort(function (a, b) { return (b._t || 0) - (a._t || 0); }); A.series = r[1]; A.prompts = r[2]; A.metricas = r[3].sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); A.respuestas = r[4];
  };
  A.cambiarProyecto = async function (id) { A.proyecto = A.proyectos.filter(function (x) { return x.id === id; })[0] || A.proyecto; D.fijarProyecto(A.proyecto.id); await A.recargarDatos(); A.emit('proyecto'); };
  A.guardarProyecto = function (inmediato) {
    if (!A.proyecto) return Promise.resolve();
    clearTimeout(tProy); var f = function () { return D.guardarProyectos(A.proyecto).then(function () { A.emit('guardado'); }); };
    if (inmediato) return f(); tProy = setTimeout(f, 400); return Promise.resolve();
  };
  /* operaciones sobre colecciones (mantienen la lista en memoria) */
  function poner(lista, o) { var i = lista.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) lista[i] = o; else lista.unshift(o); }
  A.guardarPieza = async function (p) { p.proyecto = A.proyecto.id; var r = await D.guardarPiezas(p); poner(A.piezas, r); A.emit('piezas'); return r; };
  A.borrarPieza = async function (id) { await D.borrarPiezas(id); A.piezas = A.piezas.filter(function (x) { return x.id !== id; }); A.emit('piezas'); };
  A.guardarCol = async function (col, o) { if (col !== 'respuestas') o.proyecto = A.proyecto.id; var r = await D['guardar' + col.charAt(0).toUpperCase() + col.slice(1)](o); poner(A[col], r); if (col === 'metricas') A.metricas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); A.emit(col); return r; };
  A.borrarCol = async function (col, id) { await D['borrar' + col.charAt(0).toUpperCase() + col.slice(1)](id); A[col] = A[col].filter(function (x) { return x.id !== id; }); A.emit(col); };
  A.pieza = function (id) { return A.piezas.filter(function (p) { return p.id === id; })[0]; };
  A.canales = function () { return (A.proyecto.canales || []); };
  A.nombreSeries = function () { var o = {}; A.series.forEach(function (s) { o[s.id] = s.nombre; }); return o; };

  /* ---------- IA ---------- */
  var lim = null;
  function limitador() { if (!lim) lim = new V.Limitador(D.ajustes(), D.estadoLimitador()); lim.poner(D.ajustes()); return lim; }
  A.resumenIA = function () { var l = limitador(), r = l.resumen(Date.now()); return { hora: r.hora, dia: r.dia, gasto: r.gasto, presupuesto: D.ajustes().presupuestoDia, clave: !!D.clave() }; };
  A.reiniciarGasto = function () { lim = null; D.guardarLimitador(null); A.emit('ia'); };
  A.fetchIA = null; /* inyectable en pruebas */
  /* p: {texto, sistema?, max?}; devuelve {texto, json} o lanza Error en espanol */
  A.ia = async function (p) {
    var cfg = D.ajustes(), clave = D.clave();
    if (!clave) throw new Error('Añade tu clave de IA en Ajustes para usar esta función. Las plantillas locales funcionan sin clave.');
    if (!D.avisoAceptado()) {
      if (!g.confirm('Esto enviará el texto de la petición (tu nicho, tu marca y el contenido que escribas) al proveedor de IA que configuraste, con tu clave y bajo tus límites de coste. No se envían claves ni datos de otras herramientas. ¿Continuar?')) throw new Error('Envío cancelado.');
      D.aceptarAviso();
    }
    var l = limitador(), ahora = Date.now(), ok = l.permitir(ahora, 0);
    if (!ok.ok && ok.espera && ok.espera <= 10) { await new Promise(function (r) { setTimeout(r, ok.espera * 1000 + 50); }); ok = l.permitir(Date.now(), 0); }
    if (!ok.ok) throw new Error(ok.motivo);
    g.document.body.classList.add('cia-ocupado'); A.emit('ia-ocupada');
    try {
      var r = await V.consultar(cfg, clave, { texto: p.texto, sistema: p.sistema || g.CIA.prompts.sistema(A.proyecto), maxTokens: p.max || cfg.maxTokens }, A.fetchIA || undefined, 60000);
      l.registrar(Date.now(), 0); D.guardarLimitador(l.e); return r;
    } finally { g.document.body.classList.remove('cia-ocupado'); A.emit('ia'); }
  };
})(window);
