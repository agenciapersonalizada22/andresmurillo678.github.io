/* Fechas sin dependencias: dias civiles (YYYY-MM-DD) y zonas horarias via Intl. Semana empieza en lunes (0=lun). */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Fechas = m; })(typeof self !== 'undefined' ? self : this, function () {
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return { y: +m[1], m: +m[2], d: +m[3] }; }
  function fmt(o) { return o.y + '-' + p2(o.m) + '-' + p2(o.d); }
  function aUTC(s) { var o = parse(s); return Date.UTC(o.y, o.m - 1, o.d); }
  function deUTC(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function sumarDias(s, n) { return deUTC(aUTC(s) + n * 86400000); }
  function diasEntre(a, b) { return Math.round((aUTC(b) - aUTC(a)) / 86400000); }
  function dow(s) { return (new Date(aUTC(s)).getUTCDay() + 6) % 7; }
  function inicioSemana(s) { return sumarDias(s, -dow(s)); }
  function diasEnMes(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function sumarMeses(s, n) { var o = parse(s), t = o.y * 12 + (o.m - 1) + n; return { y: Math.floor(t / 12), m: t % 12 + 1 }; }
  function rejillaMes(y, m) { var ini = inicioSemana(y + '-' + p2(m) + '-01'), out = []; for (var i = 0; i < 42; i++) out.push(sumarDias(ini, i)); return out; }
  function hoy(zona) { return desdeInstante(Date.now(), zona || undefined).slice(0, 10); }

  var cacheDTF = {};
  function dtf(zona) { return cacheDTF[zona] || (cacheDTF[zona] = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })); }
  function partes(ms, zona) { var o = {}; dtf(zona).formatToParts(ms).forEach(function (p) { if (p.type !== 'literal') o[p.type] = +p.value; }); return o; }
  function offset(ms, zona) { var o = partes(ms, zona); return Date.UTC(o.year, o.month - 1, o.day, o.hour % 24, o.minute, o.second) - Math.floor(ms / 1000) * 1000; }
  function instante(fecha, hora, zona) {
    var o = parse(fecha), h = /^(\d{1,2}):(\d{2})/.exec(hora || '00:00'), loc = Date.UTC(o.y, o.m - 1, o.d, +h[1], +h[2]);
    if (!zona || zona === 'UTC') return loc;
    var t = loc - offset(loc, zona); t = loc - offset(t, zona); return t;
  }
  function desdeInstante(ms, zona) {
    if (!zona) { var d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
    var o = partes(ms, zona); return o.year + '-' + p2(o.month) + '-' + p2(o.day) + 'T' + p2(o.hour % 24) + ':' + p2(o.minute);
  }
  function convertir(fecha, hora, de, a) { return desdeInstante(instante(fecha, hora, de), a); }
  function zonaLocal() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } }
  function zonaValida(z) { try { dtf(z); return true; } catch (e) { return false; } }
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  return { p2: p2, parse: parse, fmt: fmt, sumarDias: sumarDias, diasEntre: diasEntre, dow: dow, inicioSemana: inicioSemana, diasEnMes: diasEnMes, sumarMeses: sumarMeses, rejillaMes: rejillaMes, hoy: hoy,
    instante: instante, desdeInstante: desdeInstante, convertir: convertir, zonaLocal: zonaLocal, zonaValida: zonaValida, MESES: MESES, DIAS: DIAS };
});
