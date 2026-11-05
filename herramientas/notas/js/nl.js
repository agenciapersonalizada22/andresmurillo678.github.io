/* Entrada en lenguaje natural (espanol) para tareas: "pagar luz mañana 6pm #hogar !alta".
   parsear(texto, {hoy:'YYYY-MM-DD', ahora:'HH:MM'}) -> {titulo, fecha, hora, prioridad(0-4), etiquetas, lista, rep, recordar, estimado, usados[]} */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js'), F = G.Fechas || require('./fechas.js'), R = G.Repeticion || require('./repeticion.js');
  var NL = {};
  var DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
  var DIAS_RE = '(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)';
  var MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  var MES_RE = '(' + Object.keys(MESES).join('|') + ')';
  var NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30 };
  var NUM_RE = '(\\d+|' + Object.keys(NUM).join('|') + ')';
  var PRIO = { baja: 1, media: 2, alta: 3, urgente: 4 };
  var COLA = /\s+(?:el|la|los|las|un|una|a|al|para|de|del|en|por|que|y|e|o|con|cada|hasta|desde|antes|este|esta|proximo|proxima|todos|todas|dia|durante)$/i;

  function num(s) { return /^\d+$/.test(s) ? +s : NUM[s]; }
  function diaDesde(hoy, dow, estrictoMismo) {
    var d = (dow - F.diaSemana(hoy) + 7) % 7;
    if (d === 0 && estrictoMismo) d = 7;
    return F.sumDias(hoy, d);
  }
  function proxDiaMes(hoy, dia) {
    var p = F.partes(hoy), y = p[0], m = p[1], k = 0, f;
    for (k = 0; k < 14; k++) {
      var t = y * 12 + (m - 1) + k, yy = Math.floor(t / 12), mm = t % 12 + 1;
      if (dia > F.diasEnMes(yy, mm)) continue;
      f = F.fmt(yy, mm, dia); if (f >= hoy) return f;
    }
    return null;
  }
  function fechaAnio(hoy, d, m, y) {
    var p = F.partes(hoy);
    if (y == null) { y = p[0]; if (F.fmt(y, m, d) < hoy) y++; }
    else if (y < 100) y += 2000;
    return F.valida(F.fmt(y, m, d)) ? F.fmt(y, m, d) : null;
  }

  NL.parsear = function (texto, opts) {
    opts = opts || {};
    var orig = String(texto == null ? '' : texto), w = U.norm(orig), n = orig.length;
    var hoy = opts.hoy || F.hoy(), ahora = opts.ahora || F.ahoraHM();
    var quitar = new Array(n).fill(false), usados = [];
    var r = { titulo: '', fecha: '', hora: '', prioridad: 0, etiquetas: [], lista: '', rep: null, recordar: null, estimado: 0, usados: usados };
    function buscar(re) { return re.exec(w); }
    function consumir(m, tipo) {
      var s = m.index, e = s + m[0].length, i, bl = '';
      for (i = s; i < e; i++) { quitar[i] = true; bl += ' '; }
      w = w.slice(0, s) + bl + w.slice(e);
      usados.push({ tipo: tipo, texto: orig.slice(s, e).trim() });
    }
    function tomar(re, tipo, fn) { var m = buscar(re); if (!m) return false; var ok = fn(m); if (ok === false) return false; consumir(m, tipo); return true; }

    /* etiquetas, lista, prioridad */
    var m, reTag = /(^|\s)#([a-z0-9_\-\/]+)/g;
    while ((m = reTag.exec(w))) {
      var ini = m.index + m[1].length;
      r.etiquetas.push(orig.slice(ini + 1, ini + m[0].length - m[1].length).toLowerCase());
      var mm = { index: ini, 0: m[0].slice(m[1].length) }; consumir(mm, 'etiqueta');
      w = w.slice(0, ini) + ' '.repeat(mm[0].length) + w.slice(ini + mm[0].length);
    }
    tomar(/(^|\s)@([a-z0-9_\-]+)/, 'lista', function (x) {
      r.lista = orig.slice(x.index + x[1].length + 1, x.index + x[0].length); x.index += x[1].length; x[0] = x[0].slice(x[1].length);
    });
    tomar(/(^|\s)!(baja|media|alta|urgente)\b/, 'prioridad', function (x) { r.prioridad = PRIO[x[2]]; x.index += x[1].length; x[0] = x[0].slice(x[1].length); });
    tomar(/\bprioridad\s+(baja|media|alta|urgente)\b/, 'prioridad', function (x) { r.prioridad = PRIO[x[1]]; });
    tomar(/(^|\s)p([1-4])(?=\s|$)/, 'prioridad', function (x) { r.prioridad = 5 - +x[2]; x.index += x[1].length; x[0] = x[0].slice(x[1].length); });

    /* estimacion y recordatorio */
    tomar(/(?:~|\bdura(?:cion)?\s+|\best(?:imado)?[:=]\s*)\s*(\d+)\s*(?:h|hr|hrs|horas?)\s*(?:y\s+)?(?:(\d+)\s*(?:m|min|mins|minutos?)?)?(?![a-z])/, 'estimado', function (x) { r.estimado = +x[1] * 60 + (x[2] ? +x[2] : 0); });
    if (!r.estimado) tomar(/(?:~|\bdura(?:cion)?\s+|\best(?:imado)?[:=]\s*)\s*(\d+)\s*(?:m|min|mins|minutos?)(?![a-z])/, 'estimado', function (x) { r.estimado = +x[1]; });
    tomar(/\b(?:(?:recordar(?:me)?|avisar(?:me)?|avisame|recuerdame|recordatorio|aviso)\s+)?(\d+|media)\s*(h|hr|hrs|horas?|m|min|mins|minutos?|d|dias?)\s+antes\b/, 'recordar', function (x) {
      var v = x[1] === 'media' ? 0.5 : +x[1], u = x[2][0];
      r.recordar = Math.round(u === 'h' ? v * 60 : u === 'd' ? v * 1440 : v);
    });

    /* repeticion */
    var rep = null, diasRep = null;
    function lista(txt) { var o = []; txt.replace(new RegExp(DIAS_RE, 'g'), function (d) { o.push(DIAS[d]); }); return o; }
    tomar(/\b(?:el\s+)?dia\s+(\d{1,2})\s+de\s+cada\s+mes\b/, 'repeticion', function (x) { rep = { tipo: 'mes', diaMes: +x[1] }; });
    if (!rep) tomar(/\b(?:el\s+)?ultimo\s+dia\s+de\s+cada\s+mes\b/, 'repeticion', function () { rep = { tipo: 'mes', diaMes: 'ultimo' }; });
    if (!rep) tomar(/\b(?:todos\s+los|todas\s+las|cada)\s+(\d+)\s+(dias|semanas|meses|anos)\b/, 'repeticion', function (x) { rep = { tipo: { dias: 'dia', semanas: 'semana', meses: 'mes', anos: 'anio' }[x[2]], cada: +x[1] }; });
    if (!rep) tomar(new RegExp('\\b(?:todos\\s+los|cada)\\s+(' + DIAS_RE + '(?:\\s*(?:,|y|e)\\s*' + DIAS_RE + ')*)\\b'), 'repeticion', function (x) { diasRep = lista(x[1]); rep = { tipo: 'semana', dias: diasRep }; });
    if (!rep) tomar(new RegExp('\\blos\\s+(' + DIAS_RE.replace(/\)$/, ')') + '(?:\\s*(?:,|y|e)\\s*' + DIAS_RE + ')*)(?=\\b)'), 'repeticion', function (x) { diasRep = lista(x[1]); rep = { tipo: 'semana', dias: diasRep }; });
    if (!rep) tomar(new RegExp('\\blos\\s+((?:lunes|martes|miercoles|jueves|viernes|sabados|domingos)(?:\\s*(?:,|y|e)\\s*(?:lunes|martes|miercoles|jueves|viernes|sabados|domingos))*)\\b'), 'repeticion', function (x) {
      diasRep = []; x[1].replace(/lunes|martes|miercoles|jueves|viernes|sabado|domingo/g, function (d) { diasRep.push(DIAS[d]); }); rep = { tipo: 'semana', dias: diasRep };
    });
    if (!rep) tomar(new RegExp('\\b' + DIAS_RE + '(?:\\s*,\\s*|\\s+y\\s+|\\s+e\\s+|\\s+)' + DIAS_RE + '(?:(?:\\s*,\\s*|\\s+y\\s+|\\s+e\\s+|\\s+)' + DIAS_RE + ')*\\b'), 'repeticion', function (x) { diasRep = lista(x[0]); rep = { tipo: 'semana', dias: diasRep }; });
    if (!rep) tomar(/\b(?:(?:de\s+)?lunes\s+a\s+viernes|entre\s+semana|dias\s+(?:laborables|laborales|habiles))\b/, 'repeticion', function () { diasRep = [1, 2, 3, 4, 5]; rep = { tipo: 'semana', dias: diasRep }; });
    if (!rep) tomar(/\b(?:todos\s+los|cada|los)\s+(?:fines?\s+de\s+semana|findes?)\b/, 'repeticion', function () { diasRep = [6, 0]; rep = { tipo: 'semana', dias: [0, 6] }; });
    if (!rep) tomar(/\b(?:todos\s+los\s+dias|cada\s+dia|a\s+diario|diari[oa](?:mente)?)\b/, 'repeticion', function () { rep = { tipo: 'dia' }; });
    if (!rep) tomar(/\b(?:todas\s+las\s+semanas|cada\s+semana|semanal(?:mente)?)\b/, 'repeticion', function () { rep = { tipo: 'semana' }; });
    if (!rep) tomar(/\b(?:todos\s+los\s+meses|cada\s+mes|mensual(?:mente)?)\b/, 'repeticion', function () { rep = { tipo: 'mes' }; });
    if (!rep) tomar(/\b(?:todos\s+los\s+anos|cada\s+ano|anual(?:mente)?)\b/, 'repeticion', function () { rep = { tipo: 'anio' }; });
    if (rep) {
      tomar(/\b(\d+)\s+veces\b/, 'repeticion', function (x) { rep.cuenta = +x[1]; });
      var mf = buscar(new RegExp('\\bhasta\\s+(?:el\\s+)?(?:(\\d{4})-(\\d{1,2})-(\\d{1,2})|(\\d{1,2})\\s+de\\s+' + MES_RE + '(?:\\s+(?:de|del)\\s+(\\d{4}))?)\\b'));
      if (mf) {
        var ff = mf[1] ? fechaAnio(hoy, +mf[3], +mf[2], +mf[1]) : fechaAnio(hoy, +mf[4], MESES[mf[5]], mf[6] ? +mf[6] : null);
        if (ff) { rep.fin = ff; consumir(mf, 'repeticion'); }
      }
    }

    /* hora con marcador explicito */
    var hora = null, parte = '';
    function hhmm(h, mi) { return F.p2(h) + ':' + F.p2(mi || 0); }
    function aplicarMarca(h, marca) {
      if (marca === 'pm' || marca === 'tarde') return h < 12 ? h + 12 : h;
      if (marca === 'noche') return h === 12 ? 0 : (h >= 6 && h < 12 ? h + 12 : h);
      if (marca === 'am' || marca === 'manana' || marca === 'madrugada') return h === 12 ? 0 : h;
      return h;
    }
    var MARCA = '(am|pm|a\\.?m\\.?|p\\.?m\\.?|de\\s+la\\s+(?:manana|tarde|noche|madrugada)|del\\s+mediodia)';
    function marca(s) {
      if (!s) return ''; s = s.replace(/\./g, '');
      if (/^a ?m$/.test(s)) return 'am'; if (/^p ?m$/.test(s)) return 'pm';
      if (/mediodia/.test(s)) return 'tarde'; var k = /(manana|tarde|noche|madrugada)/.exec(s); return k ? k[1] : '';
    }
    tomar(/\ba\s+las?\s+(\d{1,2})\s+(?:y\s+(media|cuarto)|menos\s+(cuarto|veinte|diez|cinco))(?:\s+(?:de\s+la\s+)?(manana|tarde|noche|madrugada))?\b/, 'hora', function (x) {
      var h = +x[1], mi = x[2] ? (x[2] === 'media' ? 30 : 15) : -({ cuarto: 15, veinte: 20, diez: 10, cinco: 5 }[x[3]]);
      var mk = x[4] || '';
      h = mk ? aplicarMarca(h, mk) : (h >= 1 && h <= 6 ? h + 12 : h);
      var t = h * 60 + mi; hora = hhmm(Math.floor(((t % 1440) + 1440) % 1440 / 60), ((t % 60) + 60) % 60);
    });
    if (!hora) tomar(new RegExp('\\b(?:a\\s+las?\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(?:h|hs|hrs|horas)?\\s*' + MARCA + '(?![a-z])'), 'hora', function (x) {
      var h = +x[1]; if (h > 24 || (x[2] && +x[2] > 59)) return false;
      hora = hhmm(aplicarMarca(h, marca(x[3])) % 24, x[2] ? +x[2] : 0);
    });
    if (!hora) tomar(/\ba\s+la\s+una(?:\s+y\s+(media|cuarto))?(?:\s+(?:de\s+la\s+)?(manana|tarde|noche|madrugada))?\b/, 'hora', function (x) {
      var h = x[2] ? aplicarMarca(1, x[2]) : 13; hora = hhmm(h, x[1] === 'media' ? 30 : x[1] === 'cuarto' ? 15 : 0);
    });
    if (!hora) tomar(/\b(?:a\s+)?(?:el\s+)?mediodia\b/, 'hora', function () { hora = '12:00'; });
    if (!hora) tomar(/\b(?:a\s+)?(?:la\s+)?medianoche\b/, 'hora', function () { hora = '00:00'; });

    /* partes del dia */
    tomar(/\b(?:por|en|de|a)\s+la\s+(manana|tarde|noche|madrugada)\b/, 'hora', function (x) { parte = x[1]; });
    var esta = null;
    if (!parte) tomar(/\besta\s+(manana|tarde|noche|madrugada)\b/, 'fecha', function (x) { parte = x[1]; esta = true; });
    var PARTE_HORA = { manana: '09:00', tarde: '16:00', noche: '20:00', madrugada: '06:00' };

    /* fechas */
    var fecha = '', relHora = null;
    tomar(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, 'fecha', function (x) { var f = fechaAnio(hoy, +x[3], +x[2], +x[1]); if (!f) return false; fecha = f; });
    if (!fecha) tomar(/\b(?:el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, 'fecha', function (x) { var f = fechaAnio(hoy, +x[1], +x[2], x[3] ? +x[3] : null); if (!f) return false; fecha = f; });
    if (!fecha) tomar(new RegExp('\\b(?:(?:para\\s+)?el\\s+)?(\\d{1,2})\\s+(?:de\\s+)?' + MES_RE + '(?:\\s+(?:de|del)\\s+(\\d{4})|\\s+(\\d{4}))?\\b'), 'fecha', function (x) {
      var f = fechaAnio(hoy, +x[1], MESES[x[2]], x[3] || x[4] ? +(x[3] || x[4]) : null); if (!f) return false; fecha = f;
    });
    if (!fecha) tomar(new RegExp('\\b' + MES_RE + '\\s+(\\d{1,2})\\b'), 'fecha', function (x) { var f = fechaAnio(hoy, +x[2], MESES[x[1]], null); if (!f) return false; fecha = f; });
    if (!fecha) tomar(/\bpasado\s+manana\b/, 'fecha', function () { fecha = F.sumDias(hoy, 2); });
    if (!fecha) tomar(/\bmanana\b/, 'fecha', function () { fecha = F.sumDias(hoy, 1); });
    if (!fecha) tomar(/\banteayer\b/, 'fecha', function () { fecha = F.sumDias(hoy, -2); });
    if (!fecha) tomar(/\bayer\b/, 'fecha', function () { fecha = F.sumDias(hoy, -1); });
    if (!fecha) tomar(/\b(?:hoy|esta\s+noche)\b/, 'fecha', function (x) { fecha = hoy; if (/noche/.test(x[0]) && !parte) parte = 'noche'; });
    if (!fecha) tomar(new RegExp('\\b(?:en|dentro\\s+de)\\s+' + NUM_RE + '\\s+(dias?|semanas?|meses|mes|anos?|horas?|minutos?)\\b'), 'fecha', function (x) {
      var v = num(x[1]), u = x[2];
      if (/^dia/.test(u)) fecha = F.sumDias(hoy, v); else if (/^sem/.test(u)) fecha = F.sumDias(hoy, 7 * v);
      else if (/^mes/.test(u)) fecha = F.sumMeses(hoy, v); else if (/^an/.test(u)) fecha = F.sumAnios(hoy, v);
      else { relHora = F.sumMin(hoy, ahora, /^h/.test(u) ? v * 60 : v); }
    });
    if (!fecha && !relHora) tomar(/\b(?:en|dentro\s+de)\s+media\s+hora\b/, 'fecha', function () { relHora = F.sumMin(hoy, ahora, 30); });
    if (!fecha && !relHora) tomar(/\b(?:en|dentro\s+de)\s+(?:un\s+)?cuarto\s+de\s+hora\b/, 'fecha', function () { relHora = F.sumMin(hoy, ahora, 15); });
    if (!fecha && !relHora) {
      tomar(/\b(?:(?:para\s+)?la\s+)?(?:proxima\s+semana|semana\s+(?:que\s+viene|proxima|siguiente))\b/, 'fecha', function () { fecha = F.sumDias(F.inicioSemana(hoy), 7); });
    }
    if (!fecha && !relHora) tomar(/\b(?:(?:para\s+)?el\s+)?(?:proximo\s+mes|mes\s+(?:que\s+viene|proximo|siguiente))\b/, 'fecha', function () { fecha = F.sumMeses(hoy, 1); });
    if (!fecha && !relHora) tomar(/\b(?:(?:para\s+)?el\s+)?(?:proximo\s+ano|ano\s+(?:que\s+viene|proximo|siguiente))\b/, 'fecha', function () { fecha = F.sumAnios(hoy, 1); });
    if (!fecha && !relHora) tomar(/\b(?:a\s+)?(?:fin(?:al)?\s+de(?:l)?\s+mes)\b/, 'fecha', function () { fecha = F.finDeMes(hoy); });
    if (!fecha && !relHora) tomar(/\b(?:a\s+)?(?:fin(?:al)?\s+de(?:l)?\s+ano)\b/, 'fecha', function () { fecha = F.fmt(F.partes(hoy)[0], 12, 31); });
    if (!fecha && !relHora) tomar(/\b(?:(?:para\s+)?el\s+)?(?:proximo\s+)?(?:fin(?:es)?\s+de\s+semana|finde)\b/, 'fecha', function () { fecha = diaDesde(hoy, 6, false); });
    if (!fecha && !relHora) tomar(new RegExp('\\b(?:(?:para\\s+)?(?:el|este|esta)\\s+)?(?:(proximo|pasado)\\s+)?(' + DIAS_RE + ')(?:\\s+(que\\s+viene|proximo|pasado))?\\b'), 'fecha', function (x) {
      var est = /^(este|esta)/.test(x[0].replace(/^\s*(?:para\s+)?/, '')) || /\beste\b/.test(x[0]);
      var dow = DIAS[x[2]], pas = x[1] === 'pasado' || x[3] === 'pasado';
      if (pas) { var d = (F.diaSemana(hoy) - dow + 7) % 7 || 7; fecha = F.sumDias(hoy, -d); }
      else fecha = diaDesde(hoy, dow, !est);
    });
    if (!fecha && !relHora) tomar(/\b(?:para\s+)?(?:el\s+)?dia\s+(\d{1,2})\b/, 'fecha', function (x) { var f = +x[1] <= 31 && proxDiaMes(hoy, +x[1]); if (!f) return false; fecha = f; });
    if (!fecha && !relHora) tomar(/\b(?:para\s+)?el\s+(\d{1,2})(?![\d:h]|\s*(?:am|pm|%|de\s+la))\b/, 'fecha', function (x) { var f = +x[1] >= 1 && +x[1] <= 31 && proxDiaMes(hoy, +x[1]); if (!f) return false; fecha = f; });

    /* hora sin marcador */
    if (!hora && !relHora) {
      tomar(/\ba\s+las?\s+(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|hrs|horas)?(?![a-z\d:])/, 'hora', function (x) {
        var h = +x[1]; if (h > 24 || (x[2] && +x[2] > 59)) return false;
        h = parte ? aplicarMarca(h, parte) : (h >= 1 && h <= 6 ? h + 12 : h); hora = hhmm(h % 24, x[2] ? +x[2] : 0);
      });
      if (!hora) tomar(/\b([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/, 'hora', function (x) {
        var h = +x[1]; if (parte) h = aplicarMarca(h, parte); hora = hhmm(h, +x[2]);
      });
      if (!hora) tomar(/\b(\d{1,2})\s*(?:h|hs|hrs)(?![a-z])/, 'hora', function (x) { if (+x[1] > 24) return false; hora = hhmm(+x[1] % 24, 0); });
    }
    if (relHora) { fecha = relHora.fecha; hora = relHora.hora; }
    else if (!hora && parte) hora = PARTE_HORA[parte];
    if (esta && !fecha) fecha = hoy;

    /* derivados de repeticion */
    if (rep) {
      if (!fecha) {
        if (rep.tipo === 'semana' && rep.dias && rep.dias.length) {
          var mejor = null; rep.dias.forEach(function (dw) { var c = diaDesde(hoy, dw, false); if (!mejor || c < mejor) mejor = c; });
          fecha = mejor;
          if (fecha === hoy && hora && hora <= ahora) { var m2 = null; rep.dias.forEach(function (dw) { var c = diaDesde(hoy, dw, true); if (!m2 || c < m2) m2 = c; }); fecha = m2; }
        } else if (rep.tipo === 'mes' && rep.diaMes) fecha = rep.diaMes === 'ultimo' ? F.finDeMes(hoy) : proxDiaMes(hoy, rep.diaMes);
        else fecha = (hora && hora <= ahora) ? F.sumDias(hoy, 1) : hoy;
      }
      r.rep = R.anclar(rep, fecha) || R.normalizar(rep);
    }
    if (!fecha && hora) fecha = hora > ahora ? hoy : F.sumDias(hoy, 1);
    r.fecha = fecha; r.hora = hora || '';

    /* titulo */
    var t = '';
    for (var i = 0; i < n; i++) if (!quitar[i]) t += orig[i];
    t = t.replace(/\s+/g, ' ').trim();
    var prev;
    if (usados.length) do { prev = t; t = t.replace(COLA, '').replace(/[\s,;:\-–]+$/, ''); } while (t !== prev);
    t = t.replace(/^[\s,;:\-–]+/, '');
    if (t) t = t[0].toUpperCase() + t.slice(1);
    r.titulo = t;
    return r;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NL; else G.NL = NL;
})(typeof window !== 'undefined' ? window : globalThis);
