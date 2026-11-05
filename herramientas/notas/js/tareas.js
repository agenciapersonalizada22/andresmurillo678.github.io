/* Logica de dominio de tareas: completar con repeticion, aplazar, consultas por vista, tiempo y habitos. */
(function (G) {
  'use strict';
  var F = G.Fechas, R = G.Repeticion, Mo = G.Modelo, U = G.Util, T = {};
  var S = function () { return G.App.store; };

  T.crear = function (p) {
    var t = Mo.tarea(p); t.titulo = (t.titulo || '').trim(); if (t.rep) t.rep = R.anclar(t.rep, t.fecha || F.hoy());
    return S().poner('tareas', t);
  };
  T.editar = function (id, parche) { parche.modificada = Date.now(); if (parche.rep && (parche.fecha || S().get('tareas', id))) parche.rep = R.anclar(parche.rep, parche.fecha || S().get('tareas', id).fecha || F.hoy()); return S().set('tareas', id, parche); };
  T.registrarHecho = function (t) { S().poner('hechos', { id: U.id(), tarea: t.id, titulo: t.titulo, ts: Date.now(), fecha: F.hoy(), lista: t.lista || '', prioridad: t.prioridad || 0 }); };
  T.completar = function (id) {
    var t = S().get('tareas', id); if (!t || t.papelera) return null;
    T.registrarHecho(t);
    if (t.rep && t.fecha) {
      var sig = R.siguiente(t.rep, t.fecha, { hoy: F.hoy() }), cuenta = t.rep.cuenta ? t.rep.cuenta - 1 : 0;
      if (sig && !(t.rep.cuenta && cuenta <= 0)) {
        var rep = t.rep.cuenta ? Object.assign({}, t.rep, { cuenta: cuenta }) : t.rep;
        T.editar(id, { fecha: sig, rep: rep, columna: '' });
        T.hijos(id).forEach(function (h) { if (h.estado === 'hecha') T.editar(h.id, { estado: 'pendiente', hecha: 0 }); });
        return { siguiente: sig };
      }
    }
    var ult = T.ultimaColumna(t);
    T.editar(id, { estado: 'hecha', hecha: Date.now(), columna: ult });
    T.hijos(id).forEach(function (h) { if (h.estado !== 'hecha') T.editar(h.id, { estado: 'hecha', hecha: Date.now() }); });
    return { siguiente: null };
  };
  T.reabrir = function (id) { var t = S().get('tareas', id); if (t) T.editar(id, { estado: 'pendiente', hecha: 0, columna: t.columna && T.ultimaColumna(t) === t.columna ? '' : t.columna }); };
  T.alternar = function (id) { var t = S().get('tareas', id); if (!t) return; if (t.estado === 'hecha') { T.reabrir(id); return null; } return T.completar(id); };
  T.ultimaColumna = function (t) { var l = t.lista && S().get('listas', t.lista); var c = l && l.columnas; return c && c.length ? c[c.length - 1].id : ''; };
  T.columnaDe = function (t, lista) {
    var cols = (lista && lista.columnas) || Mo.columnasPorDefecto();
    if (t.estado === 'hecha') return cols[cols.length - 1].id;
    if (t.columna && cols.some(function (c) { return c.id === t.columna; }) && t.columna !== cols[cols.length - 1].id) return t.columna;
    return cols[0].id;
  };
  T.aplazar = function (id, modo) {
    var t = S().get('tareas', id); if (!t) return; var hoy = F.hoy(), base = t.fecha && t.fecha > hoy ? t.fecha : hoy, f;
    if (modo === 'manana') f = F.sumDias(hoy, 1); else if (modo === 'semana') f = F.sumDias(F.inicioSemana(hoy), 7); else if (typeof modo === 'number') f = F.sumDias(base, modo); else f = F.sumDias(base, 1);
    T.editar(id, { fecha: f }); return f;
  };
  T.aplazarMinutos = function (id, min) { var t = S().get('tareas', id); if (!t) return; var n = F.sumMin(F.hoy(), F.ahoraHM(), min); T.editar(id, { fecha: n.fecha, hora: n.hora }); };
  T.hijos = function (id) { return Mo.hijos(S(), id); };
  T.papelera = function (id) {
    var ahora = Date.now(); T.editar(id, { papelera: ahora }); T.hijos(id).forEach(function (h) { T.editar(h.id, { papelera: ahora }); });
  };
  T.restaurar = function (id) { var t = S().get('tareas', id); T.editar(id, { papelera: 0 }); S().lista('tareas', function (x) { return x.padre === id; }).forEach(function (h) { T.editar(h.id, { papelera: 0 }); }); return t; };
  T.borrarDef = function (id) { S().lista('tareas', function (x) { return x.padre === id; }).forEach(function (h) { S().borrar('tareas', h.id); }); S().borrar('tareas', id); };

  function ordenFecha(a, b) {
    if (a.fecha !== b.fecha) return !a.fecha ? 1 : !b.fecha ? -1 : a.fecha < b.fecha ? -1 : 1;
    if ((a.hora || '') !== (b.hora || '')) return !a.hora ? 1 : !b.hora ? -1 : a.hora < b.hora ? -1 : 1;
    return b.prioridad - a.prioridad || a.orden - b.orden;
  }
  var ORDENES = {
    fecha: ordenFecha, prioridad: function (a, b) { return b.prioridad - a.prioridad || ordenFecha(a, b); },
    titulo: function (a, b) { return a.titulo.localeCompare(b.titulo, 'es'); }, manual: function (a, b) { return a.orden - b.orden; },
    creada: function (a, b) { return b.creada - a.creada; }
  };
  T.ordenar = function (l, modo) { return l.sort(ORDENES[modo] || ordenFecha); };
  /* filtros: bandeja, hoy, proximos, prioridad, completadas, lista:ID, etiqueta:X */
  T.consulta = function (filtro, hoy, orden) {
    hoy = hoy || F.hoy(); var f = String(filtro || 'hoy').split(':'), k = f[0], v = f.slice(1).join(':'), pref = G.Config.pref;
    var raiz = function (t) { return !t.papelera && !t.padre; }, pend = function (t) { return raiz(t) && t.estado !== 'hecha'; };
    var l;
    switch (k) {
      case 'bandeja': l = S().lista('tareas', function (t) { return pend(t) && !t.lista; }); break;
      case 'hoy': l = S().lista('tareas', function (t) { return pend(t) && t.fecha && t.fecha <= hoy; }); break;
      case 'proximos': l = S().lista('tareas', function (t) { return pend(t) && t.fecha && t.fecha > hoy && t.fecha <= F.sumDias(hoy, 7); }); break;
      case 'prioridad': l = S().lista('tareas', function (t) { return pend(t) && t.prioridad >= 3; }); break;
      case 'completadas': l = S().lista('tareas', function (t) { return raiz(t) && t.estado === 'hecha'; }).sort(function (a, b) { return b.hecha - a.hecha; }); return l;
      case 'lista': l = S().lista('tareas', function (t) { return raiz(t) && t.lista === v && (!pref.ocultarHechas || t.estado !== 'hecha'); }); break;
      case 'etiqueta': l = S().lista('tareas', function (t) { return pend(t) && (t.etiquetas || []).some(function (e) { return e === v || e.indexOf(v + '/') === 0; }); }); break;
      case 'todas': l = S().lista('tareas', pend); break;
      default: l = [];
    }
    return T.ordenar(l, orden || (k === 'lista' ? pref.ordenTareas : k === 'hoy' || k === 'proximos' ? 'fecha' : pref.ordenTareas));
  };
  T.contar = function (filtro) { return T.consulta(filtro).length; };

  /* ---------- tiempo ---------- */
  T.tiempo = function (id) { return S().lista('sesiones', function (s) { return s.tarea === id && s.tipo !== 'descanso'; }).reduce(function (a, s) { return a + s.dur; }, 0); };
  T.registrarTiempo = function (tarea, min, tipo, ts) { if (min <= 0) return; S().poner('sesiones', { id: U.id(), tipo: tipo || 'manual', tarea: tarea || '', dur: Math.round(min * 10) / 10, ts: ts || Date.now(), fecha: F.hoy() }); };

  /* cronometro por tarea (persistente) */
  T.crono = {
    estado: function () { try { return JSON.parse(G.localStorage.getItem('notas_crono')); } catch (e) { return null; } },
    iniciar: function (id) { T.crono.parar(); try { G.localStorage.setItem('notas_crono', JSON.stringify({ tarea: id, inicio: Date.now() })); } catch (e) {} },
    parar: function () {
      var c = T.crono.estado(); if (!c) return 0; try { G.localStorage.removeItem('notas_crono'); } catch (e) {}
      var min = (Date.now() - c.inicio) / 60000; if (min >= 0.1) T.registrarTiempo(c.tarea, min, 'cronometro', c.inicio); return min;
    }
  };

  /* ---------- habitos ---------- */
  var H = T.habitos = {};
  H.marcado = function (hab, fecha) { return !!S().get('checks', hab + '_' + fecha); };
  H.alternar = function (hab, fecha) {
    var id = hab + '_' + fecha; if (S().get('checks', id)) S().borrar('checks', id); else S().poner('checks', { id: id, habito: hab, fecha: fecha });
  };
  H.programado = function (h, fecha) { return !h.dias || h.dias.indexOf(F.diaSemana(fecha)) >= 0; };
  /* racha actual y mejor, contando solo dias programados; hoy sin marcar no rompe la racha */
  H.rachas = function (h, marcas, hoy) { return Mo.rachas(h, marcas, hoy || F.hoy()); };
  H.marcasDe = function (id) { var s = new Set(); S().lista('checks', function (c) { return c.habito === id; }).forEach(function (c) { s.add(c.fecha); }); return s; };
  G.Tareas = T;
})(window);
