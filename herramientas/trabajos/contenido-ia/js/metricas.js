/* Calculos de metricas manuales: crecimiento, regresion, media movil, A/B de titulos. Puro. CIA.metricas */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.metricas = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var M = {};
  function dias(a, b) { var x = /^(\d{4})-(\d{2})-(\d{2})/.exec(a), y = /^(\d{4})-(\d{2})-(\d{2})/.exec(b); return Math.round((Date.UTC(+y[1], +y[2] - 1, +y[3]) - Date.UTC(+x[1], +x[2] - 1, +x[3])) / 864e5); }
  M.dias = dias;
  M.regresion = function (pts) {
    var n = pts.length; if (n < 2) return { pendiente: 0, interseccion: n ? pts[0][1] : 0, r2: 0 };
    var sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0; pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxy += p[0] * p[1]; sxx += p[0] * p[0]; syy += p[1] * p[1]; });
    var den = n * sxx - sx * sx; if (den === 0) return { pendiente: 0, interseccion: sy / n, r2: 0 };
    var b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n, dy = n * syy - sy * sy, r = dy === 0 ? 1 : Math.pow(n * sxy - sx * sy, 2) / (den * dy);
    return { pendiente: b, interseccion: a, r2: r };
  };
  M.mediaMovil = function (v, k) { k = k || 3; return v.map(function (_, i) { var s = v.slice(Math.max(0, i - k + 1), i + 1); return s.reduce(function (a, b) { return a + b; }, 0) / s.length; }); };
  /* serie ordenada por fecha de un campo; una fila por fecha (la ultima gana) */
  M.serie = function (regs, campo, canal) {
    var m = {}; regs.filter(function (r) { return (!canal || r.canal === canal) && r.fecha && isFinite(+r[campo]) && r[campo] !== '' && r[campo] != null; }).forEach(function (r) { m[r.fecha] = (m[r.fecha] || 0) + (+r[campo]); });
    return Object.keys(m).sort().map(function (f) { return { fecha: f, valor: m[f] }; });
  };
  /* seguidores: no se suman entre filas de la misma fecha por canal -> se toma la suma de ultimos valores por canal */
  M.serieSeguidores = function (regs, canal) {
    var canales = canal ? [canal] : Object.keys(regs.reduce(function (o, r) { o[r.canal] = 1; return o; }, {})), fechas = {};
    regs.forEach(function (r) { if (r.fecha && r.seguidores !== '' && r.seguidores != null && isFinite(+r.seguidores) && (!canal || r.canal === canal)) fechas[r.fecha] = 1; });
    var ult = {}; return Object.keys(fechas).sort().map(function (f) {
      regs.filter(function (r) { return r.fecha === f && r.seguidores !== '' && r.seguidores != null && isFinite(+r.seguidores) && canales.indexOf(r.canal) >= 0; }).forEach(function (r) { ult[r.canal] = +r.seguidores; });
      return { fecha: f, valor: Object.keys(ult).reduce(function (a, c) { return a + ult[c]; }, 0) };
    });
  };
  M.crecimiento = function (serie, horizonte) {
    if (serie.length < 2) return { ok: false, motivo: 'Necesitas al menos 2 registros con fechas distintas.' };
    var f0 = serie[0].fecha, pts = serie.map(function (s) { return [dias(f0, s.fecha), s.valor]; }), ult = serie[serie.length - 1], pri = serie[0], span = pts[pts.length - 1][0] || 1, reg = M.regresion(pts);
    var delta = ult.valor - pri.valor, h = horizonte || 30;
    return { ok: true, inicio: pri.valor, fin: ult.valor, delta: delta, pct: pri.valor ? Math.round(delta / pri.valor * 1000) / 10 : null, porDia: Math.round(delta / span * 100) / 100, porSemana: Math.round(delta / span * 7 * 100) / 100, tendenciaDia: Math.round(reg.pendiente * 100) / 100, r2: Math.round(reg.r2 * 100) / 100, proyeccion: Math.max(0, Math.round(reg.interseccion + reg.pendiente * (span + h))), horizonte: h, dias: span };
  };
  /* A/B: variantes [{nombre, impresiones, clics}] */
  function cdfN(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
  M.cdfNormal = cdfN;
  M.wilson = function (x, n) { if (!n) return [0, 0]; var z = 1.96, p = x / n, d = 1 + z * z / n, c = p + z * z / (2 * n), a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - a) / d), Math.min(1, (c + a) / d)]; };
  M.zDosProporciones = function (x1, n1, x2, n2) { if (!n1 || !n2) return { z: 0, p: 1 }; var p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2), se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2)); if (se === 0) return { z: 0, p: 1 }; var z = (p1 - p2) / se; return { z: z, p: 2 * (1 - cdfN(Math.abs(z))) }; };
  M.muestraNecesaria = function (ctr, mejora) { var p1 = ctr, p2 = ctr * (1 + mejora), d = p2 - p1; if (d <= 0 || p1 <= 0 || p2 >= 1) return null; return Math.ceil((Math.pow(1.96 + 0.8416, 2) * (p1 * (1 - p1) + p2 * (1 - p2))) / (d * d)); };
  M.ab = function (vars) {
    var v = vars.filter(function (x) { return +x.impresiones > 0; }).map(function (x) { var c = Math.min(+x.clics || 0, +x.impresiones), ci = M.wilson(c, +x.impresiones); return { nombre: x.nombre, impresiones: +x.impresiones, clics: c, ctr: c / x.impresiones, ic: ci }; });
    if (v.length < 2) return { ok: false, motivo: 'Cada variante necesita impresiones; mínimo 2 variantes.', variantes: v };
    var ord = v.slice().sort(function (a, b) { return b.ctr - a.ctr; }), a = ord[0], b = ord[1], t = M.zDosProporciones(a.clics, a.impresiones, b.clics, b.impresiones);
    return { ok: true, variantes: v, ganador: a.nombre, segundo: b.nombre, mejoraRelativa: b.ctr ? Math.round((a.ctr / b.ctr - 1) * 1000) / 10 : null, z: Math.round(t.z * 1000) / 1000, p: Math.round(t.p * 10000) / 10000, significativo: t.p < 0.05, necesarias: M.muestraNecesaria(b.ctr, 0.2) };
  };
  M.engagement = function (r) { var v = +r.vistas || 0; return v ? Math.round(((+r.likes || 0) + (+r.comentarios || 0) + (+r.compartidos || 0)) / v * 1000) / 10 : 0; };
  M.rpm = function (ingresos, vistas) { return vistas ? Math.round(ingresos / vistas * 1000 * 100) / 100 : 0; };
  M.resumenPorCanal = function (regs) {
    var o = {}; regs.forEach(function (r) { var c = o[r.canal] = o[r.canal] || { canal: r.canal, vistas: 0, ingresos: 0, registros: 0, seguidores: null, fechaSeg: '' }; c.vistas += +r.vistas || 0; c.ingresos += +r.ingresos || 0; c.registros++; if (r.seguidores !== '' && r.seguidores != null && isFinite(+r.seguidores) && r.fecha >= c.fechaSeg) { c.seguidores = +r.seguidores; c.fechaSeg = r.fecha; } });
    return Object.keys(o).map(function (k) { var c = o[k]; c.rpm = M.rpm(c.ingresos, c.vistas); c.ingresos = Math.round(c.ingresos * 100) / 100; return c; });
  };
  /* escala "bonita" para ejes */
  M.escala = function (min, max, n) { n = n || 4; if (min === max) { max = min + 1; } var r = max - min, p = Math.pow(10, Math.floor(Math.log10(r / n))), s = [1, 2, 2.5, 5, 10].map(function (x) { return x * p; }).filter(function (x) { return r / x <= n + 1; })[0] || p * 10, a = Math.floor(min / s) * s, b = Math.ceil(max / s) * s, t = []; for (var x = a; x <= b + s / 2; x += s) t.push(Math.round(x * 1e6) / 1e6); return { min: a, max: b, marcas: t }; };
  /* analisis de competencia con datos pegados: filas [{nombre, seguidores, vistas, frecuencia}] */
  function mediana(v) { v = v.filter(isFinite).sort(function (a, b) { return a - b; }); var n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; }
  M.mediana = mediana;
  M.competencia = function (filas, mio) {
    var f = filas.map(function (r) { var s = +r.seguidores || 0, v = +r.vistas || 0; return { nombre: r.nombre, seguidores: s, vistas: v, frecuencia: +r.frecuencia || 0, alcance: s ? Math.round(v / s * 1000) / 1000 : 0 }; }).filter(function (r) { return r.nombre; });
    if (!f.length) return { ok: false, motivo: 'Sin filas válidas (columnas: nombre, seguidores, vistas, frecuencia).' };
    var porAlcance = f.slice().sort(function (a, b) { return b.alcance - a.alcance; }), res = { ok: true, filas: f, medianaSeguidores: mediana(f.map(function (r) { return r.seguidores; })), medianaVistas: mediana(f.map(function (r) { return r.vistas; })), medianaFrecuencia: mediana(f.map(function (r) { return r.frecuencia; })), medianaAlcance: mediana(f.map(function (r) { return r.alcance; })), mejorAlcance: porAlcance[0].nombre, masGrande: f.slice().sort(function (a, b) { return b.seguidores - a.seguidores; })[0].nombre };
    if (mio && mio.seguidores) { res.tuPosicion = f.filter(function (r) { return r.seguidores > mio.seguidores; }).length + 1; res.deTotal = f.length + 1; }
    res.hueco = res.medianaFrecuencia ? 'La mediana publica ' + res.medianaFrecuencia + ' vez/veces por semana; destaca por calidad o nicho, no solo por volumen.' : '';
    return res;
  };
  return M;
});
