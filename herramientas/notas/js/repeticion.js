/* Repeticion de tareas. Regla: {tipo:'dia'|'semana'|'mes'|'anio', cada:1, dias:[0..6] (semana), diaMes:n|'ultimo' (mes),
   fin:'YYYY-MM-DD'|null, cuenta:n|null, base:'fecha'|'completar'}. Todo en fechas de pared: el DST no desplaza la hora. */
(function (G) {
  'use strict';
  var F = G.Fechas || (typeof require !== 'undefined' ? require('./fechas.js') : null);
  var R = {};
  R.normalizar = function (r) {
    if (!r || !r.tipo) return null;
    var o = { tipo: r.tipo, cada: Math.max(1, Math.min(999, Math.floor(+r.cada) || 1)), base: r.base === 'completar' ? 'completar' : 'fecha' };
    if (['dia', 'semana', 'mes', 'anio'].indexOf(o.tipo) < 0) return null;
    if (o.tipo === 'semana' && r.dias && r.dias.length) o.dias = r.dias.map(Number).filter(function (d, i, a) { return d >= 0 && d <= 6 && a.indexOf(d) === i; }).sort(function (a, b) { return a - b; });
    if ((o.tipo === 'mes' || o.tipo === 'anio') && r.diaMes) o.diaMes = r.diaMes === 'ultimo' ? 'ultimo' : Math.max(1, Math.min(31, +r.diaMes));
    if (r.fin && F.valida(r.fin)) o.fin = r.fin;
    if (r.cuenta > 0) o.cuenta = Math.floor(r.cuenta);
    return o;
  };
  function calc(r, desde, ancla) {
    var n = r.cada || 1;
    if (r.tipo === 'dia') return F.sumDias(desde, n);
    if (r.tipo === 'semana') {
      var dias = r.dias && r.dias.length ? r.dias : [F.diaSemana(desde)];
      var lun = F.inicioSemana(desde), w = (F.diaSemana(desde) + 6) % 7;
      var ks = dias.map(function (d) { return (d + 6) % 7; }).sort(function (x, y) { return x - y; }), i;
      for (i = 0; i < ks.length; i++) if (ks[i] > w) return F.sumDias(lun, ks[i]);
      return F.sumDias(lun, 7 * n + ks[0]);
    }
    if (r.tipo === 'mes') return F.sumMeses(desde, n, r.diaMes || ancla);
    var p = F.partes(desde), y = p[0] + n;
    return F.fmt(y, p[1], Math.min(r.diaMes || ancla, F.diasEnMes(y, p[1])));
  }
  /* siguiente fecha tras `fecha`. opts.hoy para base 'completar'. null si termina */
  R.siguiente = function (r, fecha, opts) {
    r = R.normalizar(r); if (!r || !F.valida(fecha)) return null;
    var hoy = (opts && opts.hoy) || F.hoy(), desde = fecha, ancla = F.partes(fecha)[2];
    if (r.base === 'completar') { desde = hoy > fecha ? hoy : fecha; if (r.tipo === 'mes' && !r.diaMes) ancla = F.partes(desde)[2]; }
    var s = calc(r, desde, ancla);
    if (r.fin && s > r.fin) return null;
    return s;
  };
  /* ocurrencias en [desde,hasta] a partir de `inicio` (incluida). Tope de seguridad */
  R.enRango = function (r, inicio, desde, hasta, tope) {
    r = R.normalizar(r); var out = [], f = inicio, n = 0, max = tope || 400;
    if (!r) return inicio >= desde && inicio <= hasta ? [inicio] : [];
    while (f && f <= hasta && n++ < 5000 && out.length < max) {
      if (f >= desde) out.push(f);
      if (r.cuenta && n >= r.cuenta) break;
      f = R.siguiente(Object.assign({}, r, { base: 'fecha' }), f);
    }
    return out;
  };
  /* fija el dia ancla (29-31) para que los meses cortos no desplacen la serie */
  R.anclar = function (r, fecha) {
    r = R.normalizar(r); if (!r || !F.valida(fecha)) return r;
    var d = F.partes(fecha)[2];
    if ((r.tipo === 'mes' || r.tipo === 'anio') && !r.diaMes && d > 28) r.diaMes = d;
    return r;
  };
  var DN = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  R.describir = function (r) {
    r = R.normalizar(r); if (!r) return 'No se repite';
    var n = r.cada, t;
    if (r.tipo === 'dia') t = n === 1 ? 'Cada día' : 'Cada ' + n + ' días';
    else if (r.tipo === 'semana') {
      t = n === 1 ? 'Cada semana' : 'Cada ' + n + ' semanas';
      if (r.dias && r.dias.length) t += ' (' + r.dias.map(function (d) { return DN[d]; }).join(', ') + ')';
    } else if (r.tipo === 'mes') t = (n === 1 ? 'Cada mes' : 'Cada ' + n + ' meses') + (r.diaMes ? (r.diaMes === 'ultimo' ? ', último día' : ', día ' + r.diaMes) : '');
    else t = n === 1 ? 'Cada año' : 'Cada ' + n + ' años';
    if (r.base === 'completar') t += ' tras completar';
    if (r.fin) t += ' hasta ' + r.fin;
    return t;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = R; else G.Repeticion = R;
})(typeof window !== 'undefined' ? window : globalThis);

