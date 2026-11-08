/* Generador de flujos JSON compatibles con herramientas/trabajos/automatizaciones (nodos: [id,tipo,x,y,cfg]). Puro. CIA.flujos */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.flujos = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var F = {};
  function flujo(nombre, nodos, aristas, vars) {
    return { nombre: String(nombre).slice(0, 60), activo: false, fondo: false, vars: vars || {}, _v: 1,
      nodos: nodos.map(function (n) { return { id: n[0], tipo: n[1], x: n[2], y: n[3], cfg: n[4] || {} }; }),
      aristas: aristas.map(function (s) { var m = /^(\w+)(?:\.(\w+))?>(\w+)$/.exec(s); return { de: m[1], sal: m[2] || 'sal', a: m[3] }; }) };
  }
  function restar(hora, min) { var p = String(hora || '09:00').split(':'), t = ((+p[0] * 60 + +p[1] - (min || 0)) % 1440 + 1440) % 1440, d = Math.floor((+p[0] * 60 + +p[1] - (min || 0)) / 1440); return { hora: ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + t % 60).slice(-2), dia: d }; }
  /* dias de la semana desplazados si restar cruza la medianoche */
  function dias(lista, d) { return (lista || []).map(function (x) { return ((x + d) % 7 + 7) % 7; }).join(','); }
  F.NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  /* Aviso semanal antes de publicar en un canal (segun su cadencia) */
  F.recordatorioCanal = function (canal, nombreCanal, cad, antes, checklist) {
    var r = restar(cad.hora, antes || 30), lista = (checklist || []).slice(0, 5).map(function (c) { return '• ' + c; }).join('\n');
    return flujo('Contenido IA · Aviso ' + nombreCanal, [
      ['n1', 'hora_dia', 40, 40, { hora: r.hora, dias: dias(cad.dias, r.dia) }],
      ['n2', 'plantilla', 300, 40, { texto: 'Toca publicar en ' + nombreCanal + ' a las ' + cad.hora + '. Antes de publicar:\n' + lista }],
      ['n3', 'notificacion', 570, 10, { titulo: 'Publicar en ' + nombreCanal, texto: '{{ultimo.texto}}' }],
      ['n4', 'voz', 570, 130, { texto: 'Recuerda publicar en ' + nombreCanal + ' en ' + (antes || 30) + ' minutos y marcar la etiqueta de contenido de IA si aplica.', idioma: 'es-ES' }]
    ], ['n1>n2', 'n2>n3', 'n3>n4']);
  };
  /* Aviso de una pieza concreta (se repite cada semana ese dia hasta que se desactive el flujo) */
  F.recordatorioPieza = function (pieza, antes, nombreCanal) {
    var f = pieza.fecha, dia = new Date(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10))).getUTCDay(), r = restar(pieza.hora || '09:00', antes || 30);
    return flujo('Contenido IA · ' + String(pieza.titulo).slice(0, 36), [
      ['n1', 'hora_dia', 40, 40, { hora: r.hora, dias: dias([dia], r.dia) }],
      ['n2', 'condicion', 300, 40, { reglas: [{ izq: '{{ahora.fecha}}', op: 'eq', der: f }], modo: 'todas' }],
      ['n3', 'notificacion', 570, 10, { titulo: 'Publicar: ' + pieza.titulo, texto: (nombreCanal || pieza.canal) + ' a las ' + (pieza.hora || '09:00') + '. Revisa derechos y etiqueta de IA.' }],
      ['n4', 'voz', 570, 130, { texto: 'Publica ' + pieza.titulo + ' en ' + (nombreCanal || pieza.canal) + '.', idioma: 'es-ES' }]
    ], ['n1>n2', 'n2.si>n3', 'n3>n4']);
  };
  /* Resumen diario de la cola: la lista viaja dentro del flujo (variable «cola») */
  F.resumenDiario = function (piezas, hora) {
    var cola = piezas.filter(function (p) { return p.fecha && p.estado !== 'publicado'; }).map(function (p) { return { titulo: p.titulo, canal: p.canal, fecha: p.fecha, hora: p.hora || '09:00' }; });
    return flujo('Contenido IA · Cola de hoy', [
      ['n1', 'hora_dia', 40, 60, { hora: hora || '08:00', dias: '' }],
      ['n2', 'filtro', 270, 60, { lista: '{{cola}}', reglas: [{ izq: '{{item.fecha}}', op: 'eq', der: '{{ahora.fecha}}' }], modo: 'todas', ordenarPor: 'hora', orden: 'asc', limite: 0, guardarEn: 'hoy' }],
      ['n3', 'condicion', 500, 60, { reglas: [{ izq: '{{ultimo.cantidad}}', op: 'gt', der: '0' }], modo: 'todas' }],
      ['n4', 'notificacion', 740, 10, { titulo: 'Hoy publicas {{hoy|longitud}} pieza(s)', texto: 'Abre el estudio de contenido para ver la cola.' }],
      ['n5', 'voz', 740, 130, { texto: 'Hoy tienes {{hoy|longitud}} publicaciones programadas.', idioma: 'es-ES' }]
    ], ['n1>n2', 'n2>n3', 'n3.si>n4', 'n4>n5'], { cola: cola });
  };
  F.recordatorioMetricas = function (dia, hora, canales) {
    return flujo('Contenido IA · Anotar métricas', [
      ['n1', 'hora_dia', 40, 40, { hora: hora || '10:00', dias: String(dia == null ? 1 : dia) }],
      ['n2', 'notificacion', 300, 40, { titulo: 'Anota tus métricas', texto: 'Registra seguidores, vistas e ingresos de ' + (canales && canales.length ? canales.join(', ') : 'tus canales') + ' en la pestaña Operación.' }]
    ], ['n1>n2']);
  };
  /* Idea semanal con IA: usa los secretos de Automatizaciones (ANTHROPIC_API_KEY / OPENAI_API_KEY), nunca la clave de este estudio */
  F.ideasSemanales = function (nicho, proveedor, modelo) {
    return flujo('Contenido IA · Ideas de la semana', [
      ['n1', 'hora_dia', 40, 40, { hora: '09:00', dias: '1' }],
      ['n2', 'ia', 300, 40, { proveedor: proveedor || 'anthropic', modelo: modelo || 'claude-sonnet-4-5', sistema: 'Eres estratega de contenido. Responde en español, breve y sin inventar datos.', prompt: 'Nicho: ' + (nicho || 'mi canal') + '. Dame 5 ideas de contenido para esta semana, cada una con un gancho de una línea.', maxTokens: 500 }],
      ['n3', 'almacen', 570, 10, { clave: 'contenido_ideas', valor: '{{ultimo.texto}}', modo: 'fijar' }],
      ['n4', 'notificacion', 570, 130, { titulo: 'Ideas de la semana', texto: '{{ultimo.texto}}' }]
    ], ['n1>n2', 'n2>n3', 'n3>n4']);
  };
  F.todos = function (o) {
    var out = []; (o.canales || []).forEach(function (c) { if (c.cadencia && c.cadencia.dias && c.cadencia.dias.length) out.push(F.recordatorioCanal(c.id, c.nombre, c.cadencia, o.antes || 30, c.checklist)); });
    out.push(F.resumenDiario(o.piezas || [], o.horaResumen)); out.push(F.recordatorioMetricas(o.diaMetricas, '10:00', (o.canales || []).map(function (c) { return c.nombre; })));
    return out;
  };
  /* validacion estructural contra un catalogo (mismos criterios que AutoDatos.normalizar) */
  F.validar = function (fl, catalogo) {
    var errs = [], cat = (catalogo && catalogo.TIPOS) || catalogo || {}, ids = {};
    if (!fl || !Array.isArray(fl.nodos) || !fl.nodos.length) return ['Sin nodos'];
    fl.nodos.forEach(function (n) { if (!cat[n.tipo]) errs.push('Tipo desconocido: ' + n.tipo); if (!/^[\w-]{1,20}$/.test(n.id || '')) errs.push('Id inválido'); if (ids[n.id]) errs.push('Id repetido ' + n.id); ids[n.id] = n; });
    (fl.aristas || []).forEach(function (a) { if (!ids[a.de] || !ids[a.a]) errs.push('Arista rota ' + a.de + '>' + a.a); else if (cat[ids[a.de].tipo] && !cat[ids[a.de].tipo].salidas.some(function (s) { return s[0] === a.sal; })) errs.push('Salida inexistente ' + a.de + '.' + a.sal); });
    if (!fl.nodos.some(function (n) { return cat[n.tipo] && cat[n.tipo].categoria === 'disparador'; })) errs.push('Sin disparador');
    return errs;
  };
  return F;
});
