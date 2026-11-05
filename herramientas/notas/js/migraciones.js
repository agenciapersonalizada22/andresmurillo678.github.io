/* Migraciones del esquema. Un volcado es {esquema:n, cols:{coleccion:[registros]}}. ESQUEMA = version actual. */
(function (G) {
  'use strict';
  var M = { ESQUEMA: 3 };
  var PR = { ninguna: 0, baja: 1, media: 2, alta: 3, urgente: 4 };
  /* v1 -> v2: notas.texto -> cuerpo; tareas.prio (texto) -> prioridad (0-4); tareas.vence 'AAAA-MM-DDTHH:MM' -> fecha/hora */
  function v1a2(d) {
    (d.cols.notas || []).forEach(function (n) {
      if (n.texto != null && n.cuerpo == null) { n.cuerpo = n.texto; delete n.texto; }
      if (n.titulo == null) n.titulo = '';
    });
    (d.cols.tareas || []).forEach(function (t) {
      if (t.prio != null) { t.prioridad = typeof t.prio === 'number' ? t.prio : (PR[t.prio] || 0); delete t.prio; }
      if (t.vence) { var p = String(t.vence).split('T'); t.fecha = p[0]; t.hora = p[1] ? p[1].slice(0, 5) : ''; delete t.vence; }
      if (t.hecha === true) t.estado = 'hecha';
    });
  }
  /* v2 -> v3: listas con columnas de tablero; etiquetas en minusculas sin '#'; campos nuevos con valores por defecto */
  function v2a3(d) {
    (d.cols.listas || []).forEach(function (l) {
      if (!l.columnas) l.columnas = [{ id: 'c1', nombre: 'Por hacer' }, { id: 'c2', nombre: 'En curso' }, { id: 'c3', nombre: 'Hecho' }];
    });
    function tags(r) { if (Array.isArray(r.etiquetas)) r.etiquetas = r.etiquetas.map(function (e) { return String(e).replace(/^#/, '').toLowerCase(); }); else r.etiquetas = []; }
    (d.cols.notas || []).forEach(function (n) { tags(n); n.fijada = !!n.fijada; n.archivada = !!n.archivada; n.color = n.color || ''; n.libreta = n.libreta || ''; });
    (d.cols.tareas || []).forEach(function (t) {
      tags(t); t.estado = t.estado || 'pendiente'; t.prioridad = t.prioridad || 0; t.fecha = t.fecha || ''; t.hora = t.hora || '';
      t.lista = t.lista || ''; t.padre = t.padre || ''; t.rep = t.rep || null; t.estimado = t.estimado || 0;
    });
  }
  M.pasos = [{ de: 1, fn: v1a2 }, { de: 2, fn: v2a3 }];
  /* migra in situ y devuelve el volcado; lanza error si viene de una version futura */
  M.migrar = function (d) {
    d.esquema = d.esquema || 1; d.cols = d.cols || {};
    if (d.esquema > M.ESQUEMA) throw new Error('Datos de una versión más nueva (esquema ' + d.esquema + ')');
    M.pasos.forEach(function (p) { if (d.esquema === p.de) { p.fn(d); d.esquema = p.de + 1; } });
    return d;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = M; else G.Migraciones = M;
})(typeof window !== 'undefined' ? window : globalThis);
