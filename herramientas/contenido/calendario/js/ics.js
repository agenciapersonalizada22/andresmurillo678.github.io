/* Exportar .ics (RFC 5545): una VEVENT por ocurrencia, en UTC (sin VTIMEZONE), con alarmas opcionales. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.ICS = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var F = g.Fechas || require('./fechas.js'), R = g.Recurrencia || require('./recurrencia.js');
  function esc(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,'); }
  function utc(ms) { var d = new Date(ms); return d.getUTCFullYear() + F.p2(d.getUTCMonth() + 1) + F.p2(d.getUTCDate()) + 'T' + F.p2(d.getUTCHours()) + F.p2(d.getUTCMinutes()) + F.p2(d.getUTCSeconds()) + 'Z'; }
  function plegar(l) {
    var b = new TextEncoder().encode(l); if (b.length <= 75) return l;
    var out = [], cur = '', n = 0, lim = 75;
    for (var c of l) { var bl = new TextEncoder().encode(c).length; if (n + bl > lim) { out.push(cur); cur = ' '; n = 1; lim = 75; } cur += c; n += bl; }
    out.push(cur); return out.join('\r\n');
  }
  function generar(pubs, o) {
    o = o || {}; var ahora = o.ahora || Date.now(), desde = o.desde || '1970-01-01', hasta = o.hasta || F.sumarDias(F.hoy('UTC'), 365), nombre = o.nombre || 'Calendario de contenido', durMin = o.duracionMin || 30;
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Herramientas de contenido//Calendario//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + esc(nombre)];
    pubs.forEach(function (p) {
      if (!p.fecha) return;
      R.expandir(p.fecha, p.rec, desde, hasta).forEach(function (d) {
        var ini = F.instante(d, p.hora || '09:00', p.zona), fin = ini + durMin * 60000, redes = o.redes || {};
        L.push('BEGIN:VEVENT', 'UID:' + p.id + '-' + d.replace(/-/g, '') + '@contenido.herramientas', 'DTSTAMP:' + utc(ahora), 'DTSTART:' + utc(ini), 'DTEND:' + utc(fin),
          'SUMMARY:' + esc('[' + ((redes[p.red] && redes[p.red].nombre) || p.red || '') + '] ' + (p.titulo || 'Sin título')),
          'DESCRIPTION:' + esc('Estado: ' + (p.estado || '') + (p.formato ? '\nFormato: ' + p.formato : '') + (p.texto ? '\n\n' + p.texto : '')), 'CATEGORIES:' + esc(p.red || 'contenido'), 'STATUS:' + (p.estado === 'publicado' ? 'CONFIRMED' : 'TENTATIVE'));
        if (p.recordar > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(p.titulo || 'Publicación'), 'TRIGGER:-PT' + p.recordar + 'M', 'END:VALARM');
        L.push('END:VEVENT');
      });
    });
    L.push('END:VCALENDAR'); return L.map(plegar).join('\r\n') + '\r\n';
  }
  function validar(s) {
    var err = [], pila = [];
    if (!/\r\n$/.test(s)) err.push('Debe terminar en CRLF');
    s.split('\r\n').forEach(function (l, i) {
      if (new TextEncoder().encode(l).length > 75) err.push('Línea ' + (i + 1) + ' mayor de 75 octetos');
      var b = /^BEGIN:(\w+)$/.exec(l), e = /^END:(\w+)$/.exec(l);
      if (b) pila.push(b[1]); if (e && pila.pop() !== e[1]) err.push('END desbalanceado: ' + e[1]);
    });
    if (pila.length) err.push('BEGIN sin END');
    if (!/^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/.test(s)) err.push('Cabecera inválida');
    var ev = s.split('BEGIN:VEVENT').slice(1);
    ev.forEach(function (e, i) { ['UID:', 'DTSTAMP:', 'DTSTART:', 'SUMMARY:'].forEach(function (k) { if (e.indexOf('\r\n' + k) < 0) err.push('Evento ' + (i + 1) + ' sin ' + k); }); if (!/DTSTART:\d{8}T\d{6}Z/.test(e)) err.push('Evento ' + (i + 1) + ' con DTSTART inválido'); });
    return err;
  }
  return { generar: generar, validar: validar, esc: esc };
});
