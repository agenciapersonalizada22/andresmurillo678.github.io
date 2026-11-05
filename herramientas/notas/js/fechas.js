/* Fechas como texto 'YYYY-MM-DD' y horas 'HH:MM' (hora local flotante, sin zona). Aritmetica en UTC: inmune a DST. */
(function (G) {
  'use strict';
  var F = {};
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  F.DIAS = DIAS; F.MESES = MESES;
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  F.p2 = p2;
  F.fmt = function (y, m, d) { return y + '-' + p2(m) + '-' + p2(d); };
  F.partes = function (s) { var a = String(s).split('-'); return [+a[0], +a[1], +a[2]]; };
  F.valida = function (s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    var p = F.partes(s), t = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return t.getUTCFullYear() === p[0] && t.getUTCMonth() === p[1] - 1 && t.getUTCDate() === p[2];
  };
  F.validaHora = function (h) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(h || ''); };
  function ms(s) { var p = F.partes(s); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function deMs(t) { var d = new Date(t); return F.fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
  F.hoy = function () { var d = new Date(); return F.fmt(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
  F.ahoraHM = function () { var d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  F.sumDias = function (s, n) { return deMs(ms(s) + n * 86400000); };
  F.difDias = function (a, b) { return Math.round((ms(a) - ms(b)) / 86400000); };
  F.diaSemana = function (s) { return new Date(ms(s)).getUTCDay(); };
  F.diasEnMes = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  F.finDeMes = function (s) { var p = F.partes(s); return F.fmt(p[0], p[1], F.diasEnMes(p[0], p[1])); };
  F.inicioSemana = function (s) { var w = F.diaSemana(s); return F.sumDias(s, -((w + 6) % 7)); };
  /* suma meses conservando el dia ancla; si el mes es mas corto usa su ultimo dia */
  F.sumMeses = function (s, n, ancla) {
    var p = F.partes(s), t = p[0] * 12 + (p[1] - 1) + n, y = Math.floor(t / 12), m = t % 12 + 1;
    var d = ancla === 'ultimo' ? 99 : (ancla || p[2]);
    return F.fmt(y, m, Math.min(d, F.diasEnMes(y, m)));
  };
  F.sumAnios = function (s, n) { var p = F.partes(s); return F.fmt(p[0] + n, p[1], Math.min(p[2], F.diasEnMes(p[0] + n, p[1]))); };
  F.cmp = function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
  F.sumMin = function (fecha, hora, min) {
    var t = ms(fecha) + (hora ? +hora.slice(0, 2) * 60 + +hora.slice(3) : 0) * 60000 + min * 60000, d = new Date(t);
    return { fecha: deMs(t), hora: p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) };
  };
  F.nombreDia = function (i, corto) { var n = DIAS[i]; return corto ? n.slice(0, 3) : n; };
  F.nombreMes = function (i, corto) { var n = MESES[i - 1]; return corto ? n.slice(0, 3) : n; };
  F.etiqueta = function (s, hoy) {
    if (!s) return '';
    hoy = hoy || F.hoy();
    var d = F.difDias(s, hoy), p = F.partes(s);
    if (d === 0) return 'Hoy'; if (d === 1) return 'Mañana'; if (d === -1) return 'Ayer';
    var base = F.nombreDia(F.diaSemana(s), true) + ' ' + p[2] + ' ' + F.nombreMes(p[1], true);
    if (d > 1 && d < 7) return F.nombreDia(F.diaSemana(s));
    return p[0] !== +hoy.slice(0, 4) ? base + ' ' + p[0] : base;
  };
  /* instante (ms UTC) de una fecha+hora de pared. Sin tz: zona del dispositivo. Huecos de DST -> avanza; horas repetidas -> la primera */
  F.aInstante = function (fecha, hora, tz) {
    var p = F.partes(fecha), hh = hora ? +hora.slice(0, 2) : 0, mm = hora ? +hora.slice(3, 5) : 0;
    if (!tz) return new Date(p[0], p[1] - 1, p[2], hh, mm).getTime();
    var pared = Date.UTC(p[0], p[1] - 1, p[2], hh, mm);
    var fm = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    function vista(t) {
      var o = {}; fm.formatToParts(new Date(t)).forEach(function (x) { o[x.type] = +x.value; });
      return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute);
    }
    function off(t) { return vista(t) - Math.floor(t / 60000) * 60000; }
    var o1 = off(pared - 86400000), o2 = off(pared + 86400000), c = [];
    [pared - o1, pared - o2].forEach(function (t) { if (vista(t) === pared && c.indexOf(t) < 0) c.push(t); });
    if (c.length) return Math.min.apply(null, c);
    return pared - o1;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = F; else G.Fechas = F;
})(typeof window !== 'undefined' ? window : globalThis);
