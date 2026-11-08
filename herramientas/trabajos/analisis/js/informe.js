/* Informes: modelo semanal/mensual, CSV/JSON del tablero y hojas imprimibles (SVG en mm para comun/impresion.js). Puro. window.AnaInforme */
(function (g, f) { var m = f(typeof require === 'function' && typeof module === 'object' ? require('./agregar.js') : g.AnaAgg); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaInforme = m; })(typeof self !== 'undefined' ? self : this, function (Agg) {
  'use strict';
  var F = {}, U = Agg.u, n = U.n, r2 = U.r2, col = Agg.col, dia = U.dia;

  /* semanal = ultimos 7 dias (incluye hoy); mensual = ultimos 30; "previo" = el periodo anterior de igual largo */
  F.periodo = function (ahora, tipo) {
    var d = tipo === 'mensual' ? 30 : 7, hasta = dia(ahora), desde = dia(ahora - (d - 1) * 864e5), ph = dia(ahora - d * 864e5), pd = dia(ahora - (2 * d - 1) * 864e5);
    return { tipo: tipo === 'mensual' ? 'mensual' : 'semanal', dias: d, desde: desde, hasta: hasta, previoDesde: pd, previoHasta: ph, etiqueta: (tipo === 'mensual' ? 'Informe mensual (últimos 30 días)' : 'Informe semanal (últimos 7 días)') + ': ' + desde + ' a ' + hasta };
  };
  function enRango(f, a, b) { f = String(f || '').slice(0, 10); return !!f && f >= a && f <= b; }
  function tsEn(ts, a, b) { ts = n(ts); return ts > 0 && enRango(dia(ts), a, b); }
  function metricas(datos, dom, a, b) {
    var mon = dom.monetizacion, o = {}, bit = col(datos.modulos.drones, 'bitacora').filter(function (v) { return enRango(v.fecha, a, b); });
    o.horas = r2(U.suma(bit, function (v) { return n(v.minutos); }) / 60); o.vuelos = bit.length;
    var ing = 0, gas = 0; if (mon && !mon.sinDatos) col(datos.modulos.monetizacion, 'movimientos').forEach(function (x) { if (!enRango(x.fecha, a, b)) return; var v = mon.cv(x.monto, x.moneda); if (x.tipo === 'gasto') gas += v; else ing += v; });
    o.ingresos = r2(ing); o.gastos = r2(gas); o.margen = r2(ing - gas);
    var ej = col(datos.modulos.automatizaciones, 'ejecuciones').filter(function (e) { return !e.simulacion && tsEn(e.ini, a, b); });
    o.ejecuciones = ej.length; o.fallos = ej.filter(function (e) { return e.estado === 'error'; }).length;
    o.piezasPublicadas = col(datos.modulos['contenido-ia'], 'piezas').filter(function (p) { return p.estado === 'publicado' && (enRango(p.fecha, a, b) || (!p.fecha && tsEn(p._t, a, b))); }).length;
    o.sesiones = col(datos.modulos.dispositivos, 'sesiones').filter(function (s) { return tsEn(s.inicio, a, b); }).length;
    o.qr = col(datos.modulos.qr, 'historial').filter(function (h) { return tsEn(h._creado || h._t, a, b); }).length;
    o.facturas = col(datos.modulos.monetizacion, 'facturas').filter(function (f) { return f.tipo === 'factura' && f.estado !== 'borrador' && f.estado !== 'cancelada' && enRango(f.fecha, a, b); }).length;
    var act = 0; Agg.MODULOS.forEach(function (d) { datos.modulos[d.id].regs.forEach(function (r) { var tm = n(r.t) || n(r.v._t), tc = n(r.v._creado); if (tsEn(tm, a, b)) act++; else if (tsEn(tc, a, b)) act++; }); }); o.actividad = act;
    return o;
  }
  F.metricas = metricas;
  var DEFS = [['actividad', 'Registros creados o editados', 'n', 1], ['horas', 'Horas de vuelo', 'h', 1], ['vuelos', 'Vuelos', 'n', 1], ['ingresos', 'Ingresos', 'moneda', 1], ['gastos', 'Gastos', 'moneda', -1], ['margen', 'Margen', 'moneda', 1],
    ['facturas', 'Facturas emitidas', 'n', 1], ['ejecuciones', 'Ejecuciones de flujos', 'n', 1], ['fallos', 'Ejecuciones con fallo', 'n', -1], ['piezasPublicadas', 'Piezas publicadas', 'n', 1], ['sesiones', 'Sesiones de dispositivos', 'n', 1], ['qr', 'QR guardados', 'n', 1]];
  F.modelo = function (an, datos, tipo, o) {
    o = o || {}; var ahora = an.ahora, p = F.periodo(ahora, tipo), act = metricas(datos, an.dom, p.desde, p.hasta), prev = metricas(datos, an.dom, p.previoDesde, p.previoHasta), mon = an.dom.monetizacion, moneda = mon && !mon.sinDatos ? mon.moneda : '';
    var kpis = DEFS.map(function (d) { var v = act[d[0]], q = prev[d[0]]; return { id: d[0], etq: d[1], valor: v, previo: q, delta: r2(v - q), unidad: d[2] === 'moneda' ? moneda : d[2] === 'n' ? '' : d[2], bueno: d[3] }; });
    var sec = [];
    sec.push({ titulo: 'Resumen del periodo', filas: kpis.map(function (k) { return [k.etq, k.valor + (k.unidad ? ' ' + k.unidad : ''), (k.delta > 0 ? '+' : '') + k.delta + ' vs. periodo anterior']; }) });
    sec.push({ titulo: 'Estado del sistema', filas: an.resumen.map(function (m) { return [m.nombre, m.sinDatos ? 'sin datos' : m.registros + ' registros', m.ultima ? 'última modificación ' + dia(m.ultima) : '']; }).concat([['Almacenamiento', an.cuota.pct != null ? Math.round(an.cuota.pct * 100) + ' % de la cuota' : 'cuota desconocida', '']]) });
    if (mon && !mon.sinDatos) sec.push({ titulo: 'Finanzas (acumulado)', filas: [['Ingresos', mon.ingresos + ' ' + moneda, ''], ['Gastos', mon.gastos + ' ' + moneda, ''], ['Margen', mon.margen + ' ' + moneda, mon.margenPct != null ? Math.round(mon.margenPct * 100) + ' %' : ''], ['Por cobrar', mon.porCobrar + ' ' + moneda, 'vencido ' + mon.vencido]] });
    if (an.rent && !an.rent.sinDatos) sec.push({ titulo: 'Rentabilidad por proyecto', filas: an.rent.proyectos.filter(function (x) { return x.id; }).slice(0, 6).map(function (x) { return [(o.anonimo ? anon('P', x.nombre, o) : x.nombre), 'margen ' + x.margen + ' ' + an.rent.moneda, x.horasVuelo ? x.horasVuelo + ' h de vuelo' : '']; }) });
    var m = an.metas.filter(function (e) { return e.estado !== 'sinDatos'; });
    if (m.length) sec.push({ titulo: 'Metas', filas: m.map(function (e) { return [e.kpi.nombre, e.valor + ' (meta ' + (e.meta.comparador === '<=' ? '≤ ' : '≥ ') + e.objetivo + ')', e.estado === 'ok' ? 'cumplida' : e.estado === 'cerca' ? 'cerca' : 'no cumplida']; }) });
    return { titulo: 'Análisis de Trabajos', periodo: p, generado: ahora, kpis: kpis, secciones: sec, recomendaciones: an.recomendaciones, alertas: an.alertas, moneda: moneda, uso: an.uso };
  };
  function anon(pref, nombre, o) { var m = (o.mapa = o.mapa || {}); if (!m[nombre]) { var k = Object.keys(m).filter(function (x) { return m[x].charAt(0) === pref; }).length; m[nombre] = pref + String.fromCharCode(65 + k % 26) + (k >= 26 ? Math.floor(k / 26) : ''); } return 'Proyecto ' + m[nombre].slice(1); }

  /* ---------- exportaciones ---------- */
  function csvCel(v) { v = v == null ? '' : String(v); return /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  F.aCSV = function (an, modelo) {
    var f = [['seccion', 'metrica', 'valor', 'unidad', 'detalle']];
    modelo.kpis.forEach(function (k) { f.push([modelo.periodo.tipo, k.etq, k.valor, k.unidad, 'anterior ' + k.previo]); });
    an.resumen.forEach(function (m) { f.push(['modulos', m.nombre, m.registros, 'registros', (m.ultima ? dia(m.ultima) : '') + ' · ' + m.bytes + ' bytes']); });
    Object.keys(an.valores).forEach(function (k) { var kp = (an.kpiDefs.filter(function (d) { return d.id === k; })[0] || { nombre: k }).nombre; f.push(['kpis', kp, an.valores[k] == null ? '' : an.valores[k], '', '']); });
    if (an.rent && !an.rent.sinDatos) an.rent.proyectos.forEach(function (p) { f.push(['rentabilidad_proyecto', p.nombre, p.margen, an.rent.moneda, 'ingresos ' + p.ingresos + '; gastos ' + p.gastos + '; horas ' + p.horasVuelo]); });
    an.recomendaciones.forEach(function (r) { f.push(['recomendaciones', r.titulo, r.nivel, '', r.evidencia.map(function (e) { return e.etq + ': ' + e.valor; }).join('; ')]); });
    return '﻿' + f.map(function (r) { return r.map(csvCel).join(','); }).join('\r\n') + '\r\n';
  };
  F.aJSON = function (an, modelo) {
    return JSON.stringify({ formato: 'trabajos_tablero', version: 1, generado: an.ahora, informe: modelo ? { periodo: modelo.periodo, kpis: modelo.kpis } : undefined, resumen: an.resumen, almacenamiento: { uso: an.cuota.uso, cuota: an.cuota.cuota, pct: an.cuota.pct, nivel: an.cuota.nivel, avisos: an.cuota.avisos },
      sincronizacion: an.sincro, dominios: an.dom, rentabilidad: an.rent, roiEquipo: an.roi, costoIA: an.ia, productividad: an.prod, recomendaciones: an.recomendaciones, valores: an.valores, metas: an.metas.map(function (e) { return { id: e.meta.id, kpi: e.meta.kpi, objetivo: e.meta.objetivo, comparador: e.meta.comparador, valor: e.valor, estado: e.estado }; }) }, function (k, v) { return typeof v === 'function' ? undefined : v; }, 1);
  };

  /* ---------- hojas imprimibles (mm) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function envolver(texto, max) { var pal = String(texto).split(/\s+/), l = [], cur = ''; pal.forEach(function (w) { if ((cur + ' ' + w).trim().length > max) { if (cur) l.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) l.push(cur); return l.length ? l : ['']; }
  /* devuelve {paginas:[ [ {t:'titulo'|'sub'|'fila'|'txt'|'barras', ...} ] ]} con alto por pagina */
  F.paginar = function (modelo, ancho, alto) {
    var pag = [[]], y = 0, LH = 5.2;
    function add(it, h) { if (y + h > alto && pag[pag.length - 1].length) { pag.push([]); y = 0; } it.y = y; pag[pag.length - 1].push(it); y += h; }
    add({ t: 'titulo', txt: modelo.titulo }, 11); add({ t: 'sub', txt: modelo.periodo.etiqueta + ' · generado ' + new Date(modelo.generado).toLocaleString('es') }, 8);
    if (modelo.alertas.length) { add({ t: 'h', txt: 'Alertas de metas' }, 8); modelo.alertas.forEach(function (a) { envolver('• ' + a.texto, 95).forEach(function (l) { add({ t: 'txt', txt: l }, LH); }); }); }
    if (modelo.uso && modelo.uso.suma) { add({ t: 'h', txt: 'Actividad de los últimos 30 días' }, 8); add({ t: 'barras', datos: modelo.uso.total, etq: modelo.uso.dias }, 30); }
    modelo.secciones.forEach(function (s) { add({ t: 'h', txt: s.titulo }, 9); s.filas.forEach(function (f) { add({ t: 'fila', a: f[0], b: f[1], c: f[2] || '' }, LH); }); });
    if (modelo.recomendaciones.length) {
      add({ t: 'h', txt: 'Recomendaciones (reglas explícitas)' }, 9);
      modelo.recomendaciones.forEach(function (r) {
        add({ t: 'rec', txt: r.titulo + ' [' + r.nivel + ']' }, LH + 1); envolver(r.texto, 100).forEach(function (l) { add({ t: 'txt', txt: l }, LH); });
        envolver('Datos: ' + r.evidencia.map(function (e) { return e.etq + ' = ' + e.valor; }).join('; '), 105).forEach(function (l) { add({ t: 'peq', txt: l }, 4.4); }); add({ t: 'esp' }, 2);
      });
    }
    return pag;
  };
  F.dibujarPagina = function (paginas, idx, celda, modelo) {
    var p = paginas[idx] || [], s = [];
    p.forEach(function (it) {
      var y = it.y;
      if (it.t === 'titulo') s.push('<text x="0" y="' + (y + 8) + '" font-size="7" font-weight="700" fill="#161a2b">' + esc(it.txt) + '</text>');
      else if (it.t === 'sub') s.push('<text x="0" y="' + (y + 4.5) + '" font-size="3.3" fill="#555d75">' + esc(it.txt) + '</text>');
      else if (it.t === 'h') { s.push('<text x="0" y="' + (y + 6) + '" font-size="4.4" font-weight="700" fill="#3e63dd">' + esc(it.txt) + '</text><line x1="0" x2="' + celda.w + '" y1="' + (y + 7.2) + '" y2="' + (y + 7.2) + '" stroke="#d3d8e8" stroke-width=".3"/>'); }
      else if (it.t === 'fila') s.push('<text x="0" y="' + (y + 3.8) + '" font-size="3.2" fill="#161a2b">' + esc(String(it.a).slice(0, 48)) + '</text><text x="' + celda.w * 0.46 + '" y="' + (y + 3.8) + '" font-size="3.2" font-weight="700" fill="#161a2b">' + esc(String(it.b).slice(0, 36)) + '</text><text x="' + celda.w * 0.74 + '" y="' + (y + 3.8) + '" font-size="2.8" fill="#555d75">' + esc(String(it.c).slice(0, 34)) + '</text>');
      else if (it.t === 'rec') s.push('<text x="0" y="' + (y + 4) + '" font-size="3.5" font-weight="700" fill="#161a2b">' + esc(it.txt) + '</text>');
      else if (it.t === 'txt') s.push('<text x="2" y="' + (y + 3.8) + '" font-size="3.2" fill="#161a2b">' + esc(it.txt) + '</text>');
      else if (it.t === 'peq') s.push('<text x="2" y="' + (y + 3.2) + '" font-size="2.7" fill="#555d75">' + esc(it.txt) + '</text>');
      else if (it.t === 'barras') {
        var d = it.datos, mx = Math.max.apply(null, d.concat([1])), w = celda.w / d.length;
        d.forEach(function (v, i) { var h = 22 * v / mx; s.push('<rect x="' + (i * w + 0.2).toFixed(2) + '" y="' + (y + 24 - h).toFixed(2) + '" width="' + (w - 0.4).toFixed(2) + '" height="' + h.toFixed(2) + '" fill="#3e63dd"/>'); });
        s.push('<line x1="0" x2="' + celda.w + '" y1="' + (y + 24) + '" y2="' + (y + 24) + '" stroke="#888" stroke-width=".25"/><text x="0" y="' + (y + 28) + '" font-size="2.6" fill="#555d75">' + esc(it.etq[0]) + '</text><text x="' + celda.w + '" y="' + (y + 28) + '" font-size="2.6" text-anchor="end" fill="#555d75">' + esc(it.etq[it.etq.length - 1]) + ' · máx. ' + mx + '/día</text>');
      }
    });
    s.push('<text x="' + celda.w + '" y="' + (celda.h + 4) + '" font-size="2.6" text-anchor="end" fill="#888">Página ' + (idx + 1) + ' de ' + paginas.length + ' · datos locales, generado en tu dispositivo</text>');
    return s.join('');
  };
  return F;
});
