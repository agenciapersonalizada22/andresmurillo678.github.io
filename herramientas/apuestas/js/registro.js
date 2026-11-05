/* Registro de apuestas: P&L, ROI, yield, CLV, curva, drawdown, rachas, desgloses, limites y CSV. Logica pura. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var ESTADOS = ['pendiente', 'ganada', 'perdida', 'anulada', 'cashout', 'mediaganada', 'mediaperdida'];
  var NOMBRE_ESTADO = { pendiente: 'Pendiente', ganada: 'Ganada', perdida: 'Perdida', anulada: 'Anulada', cashout: 'Cash-out', mediaganada: 'Media ganada', mediaperdida: 'Media perdida' };
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hoy(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function nueva(o) {
    var t = Date.now();
    var a = { id: uid(), creado: t, actualizado: t, fecha: hoy(), evento: '', deporte: '', liga: '', mercado: '', seleccion: '', cuota: 2, importe: 0, casa: '', tipo: 'simple', patas: [], estado: 'pendiente', cashout: null, cierre: null, etiquetas: [], notas: '', liquidada: null };
    for (var k in o) a[k] = o[k];
    return a;
  }
  function cuotaTotal(a) {
    if (a.tipo === 'combinada' && a.patas && a.patas.length) return a.patas.reduce(function (x, p) { return x * p.cuota; }, 1);
    return a.cuota;
  }
  /* retorno bruto (lo que vuelve), null si pendiente */
  function retorno(a) {
    var c = a.cuota;
    switch (a.estado) {
      case 'ganada': return a.importe * c;
      case 'perdida': return 0;
      case 'anulada': return a.importe;
      case 'cashout': return a.cashout || 0;
      case 'mediaganada': return a.importe / 2 * c + a.importe / 2;
      case 'mediaperdida': return a.importe / 2;
    }
    return null;
  }
  function liquidada(a) { return a.estado !== 'pendiente'; }
  function neto(a) { var r = retorno(a); return r == null ? 0 : r - a.importe; }
  function clv(a) { return a.cierre > 1 && a.cuota > 1 ? a.cuota / a.cierre - 1 : null; }
  function fechaOrden(a) { return (a.liquidada || a.fecha || '') + '|' + String(a.creado || 0).padStart(15, '0'); }
  function ordenar(l) { return l.slice().sort(function (x, y) { return fechaOrden(x) < fechaOrden(y) ? -1 : fechaOrden(x) > fechaOrden(y) ? 1 : 0; }); }

  function curva(apuestas, bancaInicial) {
    var b = bancaInicial || 0, pts = [{ banca: b, neto: 0, id: null, fecha: null }];
    ordenar(apuestas.filter(function (a) { return liquidada(a); })).forEach(function (a) {
      var n = neto(a); b += n; pts.push({ banca: b, neto: n, id: a.id, fecha: a.liquidada || a.fecha });
    });
    return pts;
  }
  function drawdown(pts) {
    var pico = -Infinity, dd = 0, ddPct = 0;
    pts.forEach(function (p) {
      var v = p.banca !== undefined ? p.banca : p;
      if (v > pico) pico = v;
      if (pico - v > dd) dd = pico - v;
      if (pico > 0 && (pico - v) / pico > ddPct) ddPct = (pico - v) / pico;
    });
    return { absoluto: dd, pct: ddPct };
  }
  function rachas(apuestas) {
    var ls = ordenar(apuestas.filter(function (a) { return liquidada(a) && a.estado !== 'anulada'; })), act = { tipo: null, n: 0 }, mg = 0, mp = 0;
    ls.forEach(function (a) {
      var n = neto(a); if (n === 0) return;
      var t = n > 0 ? 'ganadora' : 'perdedora';
      if (act.tipo === t) act.n++; else act = { tipo: t, n: 1 };
      if (t === 'ganadora' && act.n > mg) mg = act.n;
      if (t === 'perdedora' && act.n > mp) mp = act.n;
    });
    return { actual: act, maxGanadora: mg, maxPerdedora: mp };
  }

  function resumen(apuestas, bancaInicial) {
    var liq = apuestas.filter(function (a) { return liquidada(a) && a.estado !== 'anulada'; });
    var apostado = 0, nt = 0, gan = 0, sumC = 0, clvs = [], pend = 0, enJuego = 0;
    liq.forEach(function (a) { apostado += a.importe; var n = neto(a); nt += n; if (n > 0) gan++; sumC += a.cuota; var c = clv(a); if (c != null) clvs.push(c); });
    apuestas.forEach(function (a) { if (a.estado === 'pendiente') { pend++; enJuego += a.importe; } });
    var pts = curva(apuestas, bancaInicial), dd = drawdown(pts);
    var clvMedio = clvs.length ? clvs.reduce(function (x, y) { return x + y; }, 0) / clvs.length : null;
    return {
      total: apuestas.length, liquidadas: liq.length, pendientes: pend, enJuego: enJuego, apostado: apostado, neto: nt,
      yield: apostado ? nt / apostado : 0, roi: bancaInicial ? nt / bancaInicial : null,
      aciertos: liq.length ? gan / liq.length : null, cuotaMedia: liq.length ? sumC / liq.length : null,
      clvMedio: clvMedio, clvPositivo: clvs.length ? clvs.filter(function (c) { return c > 0; }).length / clvs.length : null, clvN: clvs.length,
      banca: pts[pts.length - 1].banca, drawdown: dd, rachas: rachas(apuestas), curva: pts
    };
  }

  function diaSemana(fecha) { var p = fecha.split('-'); return DIAS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }
  /* desglose por: deporte|liga|mercado|casa|etiqueta|dia|tipo|estado */
  function desglose(apuestas, por) {
    var m = {};
    apuestas.filter(function (a) { return liquidada(a) && a.estado !== 'anulada'; }).forEach(function (a) {
      var claves;
      if (por === 'etiqueta') claves = a.etiquetas && a.etiquetas.length ? a.etiquetas : ['(sin etiqueta)'];
      else if (por === 'dia') claves = [a.fecha ? diaSemana(a.fecha) : '(sin fecha)'];
      else claves = [a[por] || '(sin dato)'];
      claves.forEach(function (k) {
        var r = m[k] || (m[k] = { clave: k, n: 0, apostado: 0, neto: 0, ganadas: 0 });
        r.n++; r.apostado += a.importe; r.neto += neto(a); if (neto(a) > 0) r.ganadas++;
      });
    });
    return Object.keys(m).map(function (k) { var r = m[k]; r.yield = r.apostado ? r.neto / r.apostado : 0; r.aciertos = r.ganadas / r.n; return r; }).sort(function (a, b) { return b.neto - a.neto; });
  }

  /* limites responsables: perdida neta del periodo (pendientes cuentan como importe en riesgo) */
  function inicioSemana(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x; }
  function perdidaPeriodo(apuestas, desde, hasta) {
    var d = hoy(desde), h = hasta ? hoy(hasta) : '9999', t = 0;
    apuestas.forEach(function (a) { if (a.fecha >= d && a.fecha <= h && a.estado !== 'anulada') t += a.importe - (retorno(a) || 0); });
    return Math.max(0, t);
  }
  function evaluarLimites(apuestas, cfg, ahora) {
    ahora = ahora || new Date(); cfg = cfg || {}; var aviso = cfg.aviso == null ? 0.8 : cfg.aviso, res = [];
    var per = [['dia', 'diario', new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())], ['semana', 'semanal', inicioSemana(ahora)], ['mes', 'mensual', new Date(ahora.getFullYear(), ahora.getMonth(), 1)]];
    per.forEach(function (p) {
      var lim = cfg['perdida' + p[0][0].toUpperCase() + p[0].slice(1)];
      if (!lim || lim <= 0) return;
      var perd = perdidaPeriodo(apuestas, p[2], ahora), r = perd / lim;
      res.push({ periodo: p[0], nombre: p[1], limite: lim, perdida: perd, ratio: r, estado: r >= 1 ? 'excedido' : r >= aviso ? 'aviso' : 'ok' });
    });
    return res;
  }

  /* ---- CSV ---- */
  var COLS = ['id', 'fecha', 'evento', 'deporte', 'liga', 'mercado', 'seleccion', 'cuota', 'importe', 'casa', 'tipo', 'estado', 'cashout', 'cierre', 'etiquetas', 'notas', 'patas', 'liquidada', 'creado', 'actualizado'];
  function celda(v) { v = v == null ? '' : String(v); return /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function aCSV(apuestas) {
    var filas = [COLS.join(',')];
    apuestas.forEach(function (a) {
      filas.push(COLS.map(function (c) {
        var v = a[c];
        if (c === 'etiquetas') v = (a.etiquetas || []).join('|');
        else if (c === 'patas') v = a.patas && a.patas.length ? JSON.stringify(a.patas) : '';
        return celda(v);
      }).join(','));
    });
    return filas.join('\r\n') + '\r\n';
  }
  function parsearFilas(txt, sep) {
    var filas = [], f = [], c = '', q = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { f.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; f.push(c); c = ''; if (f.length > 1 || f[0] !== '') filas.push(f); f = []; }
      else c += ch;
    }
    if (c !== '' || f.length) { f.push(c); filas.push(f); }
    return filas;
  }
  function sinAcentos(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
  var ALIAS = { date: 'fecha', event: 'evento', partido: 'evento', sport: 'deporte', league: 'liga', market: 'mercado', mercado: 'mercado', pick: 'seleccion', seleccion: 'seleccion', selection: 'seleccion', odds: 'cuota', cuota: 'cuota', stake: 'importe', importe: 'importe', monto: 'importe', bookmaker: 'casa', casa: 'casa', type: 'tipo', status: 'estado', result: 'estado', resultado: 'estado', closing: 'cierre', cierre: 'cierre', cuotacierre: 'cierre', tags: 'etiquetas', etiquetas: 'etiquetas', notes: 'notas', notas: 'notas', legs: 'patas', patas: 'patas', cashout: 'cashout', settled: 'liquidada', liquidada: 'liquidada', created: 'creado', creado: 'creado', updated: 'actualizado', actualizado: 'actualizado', id: 'id' };
  var ESTADO_ALIAS = { won: 'ganada', win: 'ganada', w: 'ganada', ganado: 'ganada', lost: 'perdida', loss: 'perdida', l: 'perdida', perdido: 'perdida', void: 'anulada', anulado: 'anulada', push: 'anulada', nula: 'anulada', pending: 'pendiente', open: 'pendiente', abierta: 'pendiente', halfwon: 'mediaganada', mediaganado: 'mediaganada', halflost: 'mediaperdida', mediaperdido: 'mediaperdida', cashedout: 'cashout' };
  function numero(s) {
    if (s == null || String(s).trim() === '') return null;
    s = String(s).trim().replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    var n = parseFloat(s); return isNaN(n) ? NaN : n;
  }
  function deCSV(txt) {
    txt = String(txt).replace(/^﻿/, '');
    var primera = txt.split(/\r?\n/)[0] || '', sep = (primera.split(';').length > primera.split(',').length) ? ';' : ',';
    if (primera.indexOf('\t') >= 0 && primera.split('\t').length > primera.split(sep).length) sep = '\t';
    var filas = parsearFilas(txt, sep), errores = [], out = [];
    if (!filas.length) return { apuestas: [], errores: [{ linea: 1, msg: 'Archivo vacío' }] };
    var cab = filas[0].map(function (h) { var k = sinAcentos(h); return ALIAS[k] || (COLS.indexOf(k) >= 0 ? k : null); });
    if (cab.indexOf('cuota') < 0 || cab.indexOf('importe') < 0) return { apuestas: [], errores: [{ linea: 1, msg: 'Faltan columnas obligatorias: cuota e importe' }] };
    for (var i = 1; i < filas.length; i++) {
      var f = filas[i], o = {};
      cab.forEach(function (k, j) { if (k && f[j] !== undefined) o[k] = f[j]; });
      var cuota = numero(o.cuota), imp = numero(o.importe);
      if (!(cuota > 1)) { errores.push({ linea: i + 1, msg: 'Cuota inválida (' + o.cuota + ')' }); continue; }
      if (!(imp >= 0)) { errores.push({ linea: i + 1, msg: 'Importe inválido (' + o.importe + ')' }); continue; }
      var est = sinAcentos(o.estado || 'pendiente'); est = ESTADO_ALIAS[est] || est;
      if (ESTADOS.indexOf(est) < 0) { errores.push({ linea: i + 1, msg: 'Estado desconocido (' + o.estado + ')' }); continue; }
      var a = nueva({ cuota: cuota, importe: imp, estado: est });
      ['id', 'fecha', 'evento', 'deporte', 'liga', 'mercado', 'seleccion', 'casa', 'notas', 'liquidada'].forEach(function (k) { if (o[k]) a[k] = String(o[k]).trim(); });
      a.tipo = o.tipo && /comb|parlay|acum/i.test(o.tipo) ? 'combinada' : 'simple';
      a.cashout = numero(o.cashout); a.cierre = numero(o.cierre); if (!(a.cierre > 1)) a.cierre = null;
      a.etiquetas = o.etiquetas ? o.etiquetas.split(/[|]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
      if (o.patas) { try { a.patas = JSON.parse(o.patas); } catch (e) { a.patas = []; } }
      if (a.estado === 'cashout' && a.cashout == null) { errores.push({ linea: i + 1, msg: 'Cash-out sin importe devuelto' }); continue; }
      if (o.creado && !isNaN(+o.creado)) a.creado = +o.creado;
      if (o.actualizado && !isNaN(+o.actualizado)) a.actualizado = +o.actualizado;
      out.push(a);
    }
    return { apuestas: out, errores: errores };
  }

  A.registro = { ESTADOS: ESTADOS, NOMBRE_ESTADO: NOMBRE_ESTADO, DIAS: DIAS, nueva: nueva, hoy: hoy, cuotaTotal: cuotaTotal, retorno: retorno, neto: neto, liquidada: liquidada, clv: clv, ordenar: ordenar, curva: curva, drawdown: drawdown, rachas: rachas, resumen: resumen, desglose: desglose, diaSemana: diaSemana, evaluarLimites: evaluarLimites, perdidaPeriodo: perdidaPeriodo, inicioSemana: inicioSemana, aCSV: aCSV, deCSV: deCSV, COLS: COLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.registro;
})(typeof window !== 'undefined' ? window : globalThis);
