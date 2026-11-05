/* Recurrencias: rec = {freq:'ninguna'|'diaria'|'semanal'|'mensual', cada, dias:[0..6 lun=0], hasta:'YYYY-MM-DD', cuenta, excepciones:[ymd]}.
   Mensual: mismo dia del mes; si el mes es mas corto se usa su ultimo dia. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Recurrencia = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var F = g.Fechas || require('./fechas.js'), MAX = 3000;
  function expandir(inicio, rec, desde, hasta) {
    var out = [];
    if (!rec || !rec.freq || rec.freq === 'ninguna') { if (inicio >= desde && inicio <= hasta) out.push(inicio); return out; }
    var cada = Math.max(1, rec.cada | 0 || 1), lim = rec.hasta && rec.hasta < hasta ? rec.hasta : hasta, n = 0, ex = rec.excepciones || [];
    function emitir(d) {
      if (d < inicio) return true; if (rec.hasta && d > rec.hasta) return false; if (rec.cuenta && n >= rec.cuenta) return false; n++;
      if (d > lim) return false; if (d >= desde && ex.indexOf(d) < 0) out.push(d); return true;
    }
    var i;
    if (rec.freq === 'diaria') { for (i = 0; i < MAX; i++) if (!emitir(F.sumarDias(inicio, i * cada))) break; }
    else if (rec.freq === 'semanal') {
      var dias = (rec.dias && rec.dias.length ? rec.dias.slice() : [F.dow(inicio)]).sort(), sem0 = F.inicioSemana(inicio), seguir = true;
      for (i = 0; i < MAX && seguir; i++) for (var j = 0; j < dias.length; j++) { var d = F.sumarDias(sem0, i * 7 * cada + dias[j]); if (d < inicio) continue; if (!emitir(d)) { seguir = false; break; } }
    } else if (rec.freq === 'mensual') {
      var o = F.parse(inicio);
      for (i = 0; i < 1200; i++) { var ym = F.sumarMeses(inicio, i * cada), dd = Math.min(o.d, F.diasEnMes(ym.y, ym.m)); if (!emitir(F.fmt({ y: ym.y, m: ym.m, d: dd }))) break; }
    }
    return out;
  }
  return { expandir: expandir };
});
