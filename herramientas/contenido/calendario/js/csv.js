/* CSV (RFC 4180) para publicaciones: exportar e importar con validacion. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.CSV = m; })(typeof self !== 'undefined' ? self : this, function () {
  var COLS = ['id', 'titulo', 'red', 'formato', 'estado', 'fecha', 'hora', 'zona', 'campana', 'serie', 'tema', 'texto', 'enlace', 'vistas', 'likes', 'comentarios', 'compartidos', 'clics'];
  var REDES = ['x', 'instagram', 'tiktok', 'linkedin', 'facebook', 'youtube'], ESTADOS = ['idea', 'guion', 'grabacion', 'edicion', 'programado', 'publicado'];
  function parse(t) {
    t = t.replace(/^\uFEFF/, ''); var primera = t.split(/\r?\n/)[0] || '', sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
    var filas = [], fila = [], c = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { fila.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; fila.push(c); c = ''; if (fila.length > 1 || fila[0] !== '') filas.push(fila); fila = []; }
      else c += ch;
    }
    fila.push(c); if (fila.length > 1 || fila[0] !== '') filas.push(fila);
    return filas;
  }
  function celda(v) { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v) && v.length > 1 && isNaN(+v)) v = "'" + v; return /[",;\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function generar(filas, cols) { cols = cols || COLS; return [cols.join(',')].concat(filas.map(function (f) { return cols.map(function (c) { return celda(f[c]); }).join(','); })).join('\r\n') + '\r\n'; }
  function norm(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function filasPub(pubs, nombres) {
    nombres = nombres || {};
    return pubs.map(function (p) { var m = p.metricas || {}; return { id: p.id, titulo: p.titulo, red: p.red, formato: p.formato, estado: p.estado, fecha: p.fecha, hora: p.hora, zona: p.zona, campana: nombres[p.campana] || '', serie: nombres[p.serie] || '', tema: p.tema, texto: p.texto, enlace: p.enlace, vistas: m.vistas, likes: m.likes, comentarios: m.comentarios, compartidos: m.compartidos, clics: m.clics }; });
  }
  function importar(texto) {
    var filas = parse(texto), res = { pubs: [], errores: [] };
    if (filas.length < 2) { res.errores.push({ fila: 1, msg: 'El archivo no tiene datos' }); return res; }
    var enc = filas[0].map(norm).map(function (h) { return h === 'titulo' || h === 'title' ? 'titulo' : h === 'campana' || h === 'campaña' ? 'campana' : h === 'comentarios' || h === 'comments' ? 'comentarios' : h; });
    if (enc.indexOf('titulo') < 0) { res.errores.push({ fila: 1, msg: 'Falta la columna "titulo"' }); return res; }
    filas.slice(1).forEach(function (f, k) {
      var o = {}, n = k + 2; enc.forEach(function (h, i) { o[h] = (f[i] || '').trim(); });
      if (!o.titulo) return res.errores.push({ fila: n, msg: 'Título vacío' });
      var red = norm(o.red || 'x').replace('twitter', 'x').replace('youtube shorts', 'youtube').replace('shorts', 'youtube'); if (REDES.indexOf(red) < 0) return res.errores.push({ fila: n, msg: 'Red desconocida: ' + o.red });
      var est = norm(o.estado || 'idea').replace('grabación', 'grabacion').replace('edición', 'edicion'); if (ESTADOS.indexOf(est) < 0) return res.errores.push({ fila: n, msg: 'Estado desconocido: ' + o.estado });
      if (o.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(o.fecha)) return res.errores.push({ fila: n, msg: 'Fecha inválida (usa AAAA-MM-DD): ' + o.fecha });
      if (o.hora && !/^\d{1,2}:\d{2}$/.test(o.hora)) return res.errores.push({ fila: n, msg: 'Hora inválida (usa HH:MM): ' + o.hora });
      var num = function (v) { return v === '' || v == null || isNaN(+v) ? 0 : Math.max(0, +v); };
      res.pubs.push({ id: o.id || '', titulo: o.titulo, red: red, formato: o.formato || '', estado: est, fecha: o.fecha || '', hora: o.hora ? ('0' + o.hora).slice(-5) : '09:00', zona: o.zona || '', campanaNombre: o.campana || '', serieNombre: o.serie || '', tema: o.tema || '', texto: o.texto || '', enlace: o.enlace || '',
        metricas: { vistas: num(o.vistas), likes: num(o.likes), comentarios: num(o.comentarios), compartidos: num(o.compartidos), clics: num(o.clics) } });
    });
    return res;
  }
  return { COLS: COLS, parse: parse, generar: generar, importar: importar, filasPub: filasPub };
});
