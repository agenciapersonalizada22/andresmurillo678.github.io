/* Agregadores puros del modulo Analisis (sin DOM ni IndexedDB): reciben los datos ya leidos de los otros modulos y devuelven numeros.
   Cada dominio tolera datos ausentes o con otro esquema: devuelve {sinDatos:true, ...} en vez de fallar. window.AnaAgg */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaAgg = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var A = {};

  /* ---------- registro de modulos ---------- */
  A.MODULOS = [
    { id: 'qr', base: 'trabajos_qr', nombre: 'QR y etiquetas', color: '#5f3dc4', principal: 'historial', sync: ['historial', 'estilos'], ruta: '../qr/' },
    { id: 'dispositivos', base: 'trabajos_dispositivos', nombre: 'Dispositivos', color: '#0b7285', principal: 'perfiles', sync: ['perfiles', 'sesiones'], ruta: '../dispositivos/' },
    { id: 'drones', base: 'trabajos_drones', nombre: 'Drones y cámaras', color: '#2b8a3e', principal: 'proyectos', sync: ['proyectos', 'equipo', 'normas', 'bitacora'], ruta: '../drones/' },
    { id: 'automatizaciones', base: 'trabajos_automatizaciones', nombre: 'Automatizaciones', color: '#e8590c', principal: 'flujos', sync: ['flujos', 'almacen'], ruta: '../automatizaciones/' },
    { id: 'video-ia', base: 'trabajos_video_ia', nombre: 'Video con IA', color: '#c2255c', principal: 'proyectos', sync: ['proyectos', 'reglas'], ruta: '../video-ia/' },
    { id: 'reconstruccion-3d', base: 'trabajos_reconstruccion_3d', nombre: 'Reconstrucción 3D', color: '#364fc7', principal: 'proyectos', sync: ['proyectos'], ruta: '../reconstruccion-3d/' },
    { id: 'realidad-aumentada', base: 'trabajos_realidad_aumentada', nombre: 'Realidad aumentada', color: '#1098ad', principal: 'proyectos', sync: ['proyectos'], ruta: '../realidad-aumentada/' },
    { id: 'contenido-ia', base: 'trabajos_contenido_ia', nombre: 'Contenido con IA', color: '#ae3ec9', principal: 'proyectos', sync: ['proyectos', 'piezas', 'series', 'prompts', 'metricas', 'respuestas'], ruta: '../contenido-ia/' },
    { id: 'monetizacion', base: 'trabajos_monetizacion', nombre: 'Monetización', color: '#f08c00', principal: 'movimientos', sync: ['cifrado'], ruta: '../monetizacion/' }
  ];
  A.porId = function (id) { return A.MODULOS.filter(function (m) { return m.id === id; })[0]; };

  /* ---------- utilidades ---------- */
  function n(x, d) { var v = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x); return isFinite(v) ? v : (d || 0); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function dia(ts) { var d = new Date(ts); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function mes(f) { return String(f || '').slice(0, 7); }
  function fechaStr(v) { return /^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : ''; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function suma(l, f) { var t = 0; l.forEach(function (x) { t += f(x); }); return t; }
  function cuenta(l, f) { var o = {}; l.forEach(function (x) { var k = f(x); if (k == null || k === '') k = '(sin dato)'; o[k] = (o[k] || 0) + 1; }); return o; }
  function topObj(o, max) { return Object.keys(o).map(function (k) { return { etq: k, valor: o[k] }; }).sort(function (a, b) { return b.valor - a.valor || (a.etq < b.etq ? -1 : 1); }).slice(0, max || 8); }
  A.u = { n: n, arr: arr, r2: r2, dia: dia, mes: mes, norm: norm, fechaStr: fechaStr, cuenta: cuenta, topObj: topObj, suma: suma };
  function col(m, c) { return m && m.cols && Array.isArray(m.cols[c]) ? m.cols[c].filter(function (x) { return x && typeof x === 'object'; }) : []; }
  A.col = col;
  function bytesDe(v) { try { return JSON.stringify(v).length; } catch (e) { return 0; } }
  /* ultimos N dias (incluye hoy) como cadenas YYYY-MM-DD */
  A.ultimosDias = function (ahora, dias) { var o = [], i; for (i = dias - 1; i >= 0; i--) o.push(dia(ahora - i * 864e5)); return o; };
  A.ultimosMeses = function (ahora, k) { var d = new Date(ahora), o = [], i, x; for (i = k - 1; i >= 0; i--) { x = new Date(d.getFullYear(), d.getMonth() - i, 15); o.push(x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2)); } return o; };

  /* ---------- armado de datos leidos ----------
     entradas: {id: {existe, regs:[{k,col,id,t,v}], error?}} -> modulos con cols, bytes, ultima. */
  A.armarModulo = function (def, ent) {
    ent = ent || {}; var regs = arr(ent.regs).filter(function (r) { return r && typeof r === 'object' && r.v && typeof r.v === 'object'; }), cols = {}, porCol = {}, bytes = 0, ultima = 0;
    regs.forEach(function (r) {
      var c = String(r.col || String(r.k || '').split('/')[0] || '?'); (cols[c] = cols[c] || []).push(r.v);
      var b = bytesDe(r.v); bytes += b; porCol[c] = porCol[c] || { n: 0, bytes: 0 }; porCol[c].n++; porCol[c].bytes += b;
      var t = n(r.t, 0) || n(r.v._t, 0); if (t > ultima) ultima = t;
    });
    return { id: def.id, def: def, existe: !!ent.existe, error: ent.error || '', regs: regs, cols: cols, porCol: porCol, bytes: bytes, ultima: ultima, registros: regs.length };
  };
  A.armar = function (entradas, extra) {
    var o = { modulos: {}, ahora: (extra && extra.ahora) || Date.now(), ls: (extra && extra.ls) || {}, sync: (extra && extra.sync) || {}, estimate: (extra && extra.estimate) || null };
    A.MODULOS.forEach(function (d) { o.modulos[d.id] = A.armarModulo(d, entradas && entradas[d.id]); });
    return o;
  };

  /* ---------- 1. tablero ejecutivo ---------- */
  A.resumenModulos = function (datos) {
    return A.MODULOS.map(function (d) {
      var m = datos.modulos[d.id], pr = col(m, d.principal).length;
      return { id: d.id, nombre: d.nombre, color: d.color, existe: m.existe, sinDatos: !m.registros, proyectos: pr, principal: d.principal, registros: m.registros, ultima: m.ultima, bytes: m.bytes, error: m.error };
    });
  };
  /* actividad por dia = creaciones + ediciones (ultima modificacion distinta del dia de creacion) */
  A.usoDiario = function (datos, dias, ahora) {
    ahora = ahora || datos.ahora; var lista = A.ultimosDias(ahora, dias || 30), idx = {}, porModulo = {}, total = lista.map(function () { return 0; });
    lista.forEach(function (d, i) { idx[d] = i; });
    A.MODULOS.forEach(function (d) {
      var s = lista.map(function () { return 0; });
      datos.modulos[d.id].regs.forEach(function (r) {
        var v = r.v, tc = n(v._creado, 0), tm = n(r.t, 0) || n(v._t, 0), dc = tc ? dia(tc) : '', dm = tm ? dia(tm) : '';
        if (dc && idx[dc] != null) s[idx[dc]]++;
        if (dm && dm !== dc && idx[dm] != null) s[idx[dm]]++;
      });
      porModulo[d.id] = s; s.forEach(function (x, i) { total[i] += x; });
    });
    return { dias: lista, total: total, porModulo: porModulo, suma: suma(total, function (x) { return x; }) };
  };
  A.cuota = function (est, datos) {
    var medido = suma(A.MODULOS, function (d) { return datos.modulos[d.id].bytes; }), porModulo = A.MODULOS.map(function (d) { var b = datos.modulos[d.id].bytes; return { id: d.id, nombre: d.nombre, color: d.color, bytes: b, pct: medido ? b / medido : 0 }; });
    var o = { medido: medido, porModulo: porModulo, avisos: [], nivel: 'desconocido', uso: null, cuota: null, pct: null };
    if (est && n(est.quota) > 0) {
      o.uso = n(est.usage); o.cuota = n(est.quota); o.pct = o.uso / o.cuota; o.nivel = o.pct >= 0.9 ? 'critico' : o.pct >= 0.75 ? 'aviso' : 'ok';
      if (o.nivel === 'critico') o.avisos.push('El almacenamiento del sitio está al ' + Math.round(o.pct * 100) + ' % de la cuota: libera espacio o exporta un respaldo.');
      else if (o.nivel === 'aviso') o.avisos.push('El almacenamiento del sitio ya usa el ' + Math.round(o.pct * 100) + ' % de la cuota.');
      porModulo.forEach(function (p) { if (p.bytes / o.cuota >= 0.25) o.avisos.push(p.nombre + ' ocupa por sí solo el ' + Math.round(p.bytes / o.cuota * 100) + ' % de la cuota.'); });
    } else o.avisos.push('Este navegador no informa la cuota de almacenamiento (navigator.storage.estimate).');
    return o;
  };
  /* sync[id] = {ultima, lapidas:{col/id:ts}} (leido de localStorage por el lector) */
  A.sincronizacion = function (datos, sesion) {
    return A.MODULOS.map(function (d) {
      var m = datos.modulos[d.id], s = datos.sync[d.id] || {}, lap = s.lapidas || {}, ult = n(s.ultima, 0), pend = 0, conf = [];
      var colsSync = d.sync;
      m.regs.forEach(function (r) {
        var c = String(r.col); if (colsSync.indexOf(c) < 0) return;
        var tm = n(r.t, 0) || n(r.v._t, 0); if (tm > ult) pend++;
        var k = c + '/' + (r.id || r.v.id), lt = n(lap[k], 0);
        if (lt) conf.push({ k: k, editado: tm, borrado: lt, gana: lt >= tm ? 'borrado' : 'edición' });
      });
      var estado = !m.existe || !m.registros ? 'sinDatos' : !sesion ? 'sinSesion' : !ult ? 'nunca' : pend || conf.length ? 'pendiente' : 'alDia';
      if (d.id === 'monetizacion' && estado !== 'sinDatos') estado = !sesion ? 'sinSesion' : (colsSync.length && col(m, 'cifrado').length ? (pend ? 'pendiente' : 'alDia') : 'local');
      return { id: d.id, nombre: d.nombre, ultima: ult, pendientes: pend, lapidas: Object.keys(lap).length, conflictos: conf, estado: estado };
    });
  };

  /* ---------- 2. dominios ---------- */
  function dist(wps, retorno) {
    var x = 0, y = 0, t = 0; wps.forEach(function (w) { var a = n(w.x), b = n(w.y); t += Math.hypot(a - x, b - y); x = a; y = b; }); if (retorno && wps.length) t += Math.hypot(x, y); return t;
  }
  A.drones = function (datos) {
    var m = datos.modulos.drones, ps = col(m, 'proyectos'), bit = col(m, 'bitacora');
    if (!ps.length && !bit.length) return { sinDatos: true };
    var misiones = ps.filter(function (p) { return p.mision && arr(p.mision.wps).length; }), wp = suma(misiones, function (p) { return p.mision.wps.length; }), km = suma(misiones, function (p) { return dist(p.mision.wps, p.mision.retorno); }) / 1000;
    var min = suma(bit, function (v) { return n(v.minutos); }), porMes = {}, porDron = {}, porProy = {}, nomProy = {};
    ps.forEach(function (p) { nomProy[p.id] = p.nombre || p.id; });
    bit.forEach(function (v) {
      var mm = mes(v.fecha) || '(sin fecha)'; porMes[mm] = (porMes[mm] || 0) + n(v.minutos) / 60;
      var dn = v.dron || '(sin dato)'; porDron[dn] = (porDron[dn] || 0) + n(v.minutos) / 60;
      if (v.proyecto) { var q = porProy[v.proyecto] = porProy[v.proyecto] || { id: v.proyecto, nombre: nomProy[v.proyecto] || '(proyecto borrado)', horas: 0, vuelos: 0 }; q.horas += n(v.minutos) / 60; q.vuelos++; }
    });
    Object.keys(porMes).forEach(function (k) { porMes[k] = r2(porMes[k]); }); Object.keys(porDron).forEach(function (k) { porDron[k] = r2(porDron[k]); });
    return {
      sinDatos: false, proyectos: ps.length, misiones: misiones.length, waypoints: wp, distanciaKm: r2(km), vuelos: bit.length, horas: r2(min / 60), baterias: suma(bit, function (v) { return n(v.baterias); }),
      incidencias: bit.filter(function (v) { return String(v.incidencias || '').trim(); }).length, vientoProm: bit.length ? r2(suma(bit, function (v) { return n(v.viento); }) / bit.length) : 0,
      porMes: porMes, porDron: topObj(porDron, 8), porProyecto: Object.keys(porProy).map(function (k) { porProy[k].horas = r2(porProy[k].horas); return porProy[k]; }).sort(function (a, b) { return b.horas - a.horas; }), equipoPropio: col(m, 'equipo').filter(function (e) { return !e.oculto; }).length
    };
  };
  A.video = function (datos) {
    var m = datos.modulos['video-ia'], ps = col(m, 'proyectos'), rg = col(m, 'reglas');
    if (!ps.length && !rg.length) return { sinDatos: true };
    var zonas = suma(ps, function (p) { return arr(p.cfg && p.cfg.zonas).length; }), lineas = suma(ps, function (p) { return arr(p.cfg && p.cfg.lineas).length; });
    var ev = [], cap = 0, clips = 0;
    ps.forEach(function (p) { arr(p.eventos).forEach(function (e) { ev.push(e); }); cap += Array.isArray(p.capturas) ? p.capturas.length : n(p.capturas); clips += Array.isArray(p.clips) ? p.clips.length : n(p.clips); });
    col(datos.modulos.automatizaciones, 'ejecuciones').forEach(function (e) { if (e.disparo && /video/i.test(String(e.disparo.tipo))) ev.push({ ts: n(e.ini), tipo: (e.disparo.datos && e.disparo.datos.evento) || 'evento' }); });
    var horas = new Array(24).fill(0), porDia = {}; ev.forEach(function (e) { var t = n(e.ts || e.t); if (!t) return; horas[new Date(t).getHours()]++; var d = dia(t); porDia[d] = (porDia[d] || 0) + 1; });
    var pico = Math.max.apply(null, horas.concat([0])), pdia = topObj(porDia, 1)[0];
    var lim = datos.ls && datos.ls['video-ia'] && datos.ls['video-ia'].limites;
    return { sinDatos: false, proyectos: ps.length, reglas: rg.length, reglasActivas: rg.filter(function (r) { return r.activo !== false; }).length, zonas: zonas, lineas: lineas, eventos: ev.length, capturas: cap, clips: clips,
      porTipo: topObj(cuenta(ev, function (e) { return e.tipo; }), 6), porHora: horas, picoHora: pico ? horas.indexOf(pico) : null, picoValor: pico, picoDia: pdia || null, llamadasIA: lim ? arr(lim.llamadas).length : 0,
      eventosGuardados: ev.length > 0 };
  };
  A.automatizaciones = function (datos) {
    var m = datos.modulos.automatizaciones, fl = col(m, 'flujos'), ej = col(m, 'ejecuciones');
    if (!fl.length && !ej.length) return { sinDatos: true };
    var reales = ej.filter(function (e) { return !e.simulacion; }), ok = reales.filter(function (e) { return e.estado === 'ok'; }).length, mal = reales.filter(function (e) { return e.estado === 'error'; }).length, otros = reales.length - ok - mal;
    var porFlujo = {}, nom = {}; fl.forEach(function (f) { nom[f.id] = f.nombre || f.id; });
    reales.forEach(function (e) { var k = e.flujo || '?', q = porFlujo[k] = porFlujo[k] || { id: k, nombre: nom[k] || e.nombre || '(flujo borrado)', ok: 0, error: 0, otros: 0, total: 0, durMs: 0 }; q.total++; if (e.estado === 'ok') q.ok++; else if (e.estado === 'error') q.error++; else q.otros++; q.durMs += Math.max(0, n(e.fin) - n(e.ini)); });
    var lista = Object.keys(porFlujo).map(function (k) { var q = porFlujo[k]; q.tasaExito = q.total ? q.ok / q.total : null; q.durProm = q.total ? Math.round(q.durMs / q.total) : 0; return q; }).sort(function (a, b) { return b.total - a.total; });
    var porDia = {}; reales.forEach(function (e) { var d = dia(n(e.ini)); porDia[d] = porDia[d] || { ok: 0, error: 0 }; if (e.estado === 'error') porDia[d].error++; else if (e.estado === 'ok') porDia[d].ok++; });
    return { sinDatos: false, flujos: fl.length, activos: fl.filter(function (f) { return f.activo; }).length, nodos: suma(fl, function (f) { return arr(f.nodos).length; }), ejecuciones: reales.length, simulaciones: ej.length - reales.length,
      ok: ok, error: mal, otros: otros, tasaExito: reales.length ? ok / reales.length : null, tasaFallo: reales.length ? mal / reales.length : null, porFlujo: lista, porDia: porDia, sinEjecuciones: fl.filter(function (f) { return !porFlujo[f.id]; }).length };
  };
  A.reconstruccion = function (datos) {
    var m = datos.modulos['reconstruccion-3d'], ps = col(m, 'proyectos');
    if (!ps.length) return { sinDatos: true };
    var capas = [], hist = { pequeno: 0, medio: 0, grande: 0 }, cal = [];
    ps.forEach(function (p) { arr(p.capas).forEach(function (c) { capas.push(c); var t = n(c.tri || (c.malla && c.malla.idx ? c.malla.idx.length / 3 : 0)); if (t < 10000) hist.pequeno++; else if (t < 100000) hist.medio++; else hist.grande++; var q = c.calidad != null ? c.calidad : c.nitidez; if (q != null && isFinite(Number(q))) cal.push(Number(q)); }); });
    var puntaje = ps.map(function (p) { var s = 0, cs = arr(p.capas); if (cs.length) s += 40; if (cs.some(function (c) { return c.malla || n(c.tri) > 0; })) s += 30; if (arr(p.medidas).length) s += 15; if (String(p.notas || '').trim()) s += 5; if (p.plano) s += 10; return { id: p.id, nombre: p.nombre || p.id, puntaje: s }; });
    return { sinDatos: false, proyectos: ps.length, capas: capas.length, triangulos: suma(capas, function (c) { return n(c.tri); }), medidas: suma(ps, function (p) { return arr(p.medidas).length; }), tamanos: hist,
      calidadProm: cal.length ? r2(cal.reduce(function (a, b) { return a + b; }, 0) / cal.length) : null, calidadMuestras: cal.length, completitud: puntaje, completitudProm: r2(suma(puntaje, function (x) { return x.puntaje; }) / puntaje.length),
      mallasLocales: col(m, 'mallas').length };
  };
  A.ar = function (datos) {
    var m = datos.modulos['realidad-aumentada'], ps = col(m, 'proyectos');
    if (!ps.length) return { sinDatos: true };
    var uso = A.usoDiario(datos, 30); uso = { total: uso.porModulo['realidad-aumentada'] };
    var porM = {}; ps.forEach(function (p) { var k = mes(dia(n(p._creado || p._t))); porM[k] = (porM[k] || 0) + 1; });
    return { sinDatos: false, proyectos: ps.length, capas: suma(ps, function (p) { return arr(p.capas).length; }), anclas: suma(ps, function (p) { return arr(p.anclas).length; }), objetos: suma(ps, function (p) { return arr(p.objetos).length; }),
      pngs: col(m, 'png').length, modelos: col(m, 'modelos').length, envios: col(m, 'envios').length, creadosPorMes: porM, ultimos30: uso.total };
  };
  A.contenido = function (datos, ahora) {
    ahora = ahora || datos.ahora; var m = datos.modulos['contenido-ia'], pz = col(m, 'piezas'), me = col(m, 'metricas'), ps = col(m, 'proyectos');
    if (!pz.length && !me.length && !ps.length) return { sinDatos: true };
    var hoy = dia(ahora), estados = cuenta(pz, function (p) { return p.estado || 'idea'; }), prog = pz.filter(function (p) { return fechaStr(p.fecha) && p.estado !== 'publicado' && p.estado !== 'idea'; });
    var cal = {}; pz.forEach(function (p) { var f = fechaStr(p.fecha); if (f) cal[f] = (cal[f] || 0) + 1; });
    var prox = Object.keys(cal).filter(function (f) { return f >= hoy; }).sort().slice(0, 14).map(function (f) { return { fecha: f, n: cal[f] }; });
    var porCanal = {}; me.slice().sort(function (a, b) { return String(a.fecha) < String(b.fecha) ? -1 : 1; }).forEach(function (r) {
      var c = r.canal || '(sin canal)', q = porCanal[c] = porCanal[c] || { canal: c, registros: 0, seguidores: null, primero: null, vistas: 0, ingresos: 0, serie: [] };
      q.registros++; if (r.seguidores !== '' && r.seguidores != null && isFinite(Number(r.seguidores))) { var s = Number(r.seguidores); if (q.primero == null) q.primero = s; q.seguidores = s; q.serie.push([String(r.fecha), s]); }
      q.vistas += n(r.vistas); q.ingresos += n(r.ingresos);
    });
    var canales = Object.keys(porCanal).map(function (k) { var q = porCanal[k]; q.crecimiento = q.primero != null && q.seguidores != null ? q.seguidores - q.primero : null; q.ingresos = r2(q.ingresos); return q; });
    var porMes = {}; pz.forEach(function (p) { if (p.estado === 'publicado') { var k = mes(fechaStr(p.fecha) || dia(n(p._t))); porMes[k] = (porMes[k] || 0) + 1; } });
    return { sinDatos: false, proyectos: ps.length, piezas: pz.length, porEstado: estados, porCanal: topObj(cuenta(pz, function (p) { return p.canal; }), 8), porFormato: topObj(cuenta(pz, function (p) { return p.formato; }), 6),
      publicadas: estados.publicado || 0, listas: (estados.listo || 0) + (estados.programado || 0), vencidas: prog.filter(function (p) { return fechaStr(p.fecha) < hoy; }).length, calendario: prox, canales: canales, metricasRegistros: me.length,
      publicadasPorMes: porMes, series: col(m, 'series').length, prompts: col(m, 'prompts').length };
  };
  /* convierte a la moneda base con las tasas del modulo (tasas[X] = unidades de X por 1 USD, igual que MonCalc.convertir) */
  A.convertir = function (monto, de, a, tasas) {
    monto = n(monto); if (!de || !a || de === a) return monto; tasas = tasas || {};
    var td = de === 'USD' && tasas[de] == null ? 1 : tasas[de], ta = a === 'USD' && tasas[a] == null ? 1 : tasas[a];
    if (!(td > 0) || !(ta > 0)) return null; return monto / td * ta;
  };
  A.monetizacion = function (datos, ahora) {
    ahora = ahora || datos.ahora; var m = datos.modulos.monetizacion, mv = col(m, 'movimientos'), fa = col(m, 'facturas');
    if (!mv.length && !fa.length) return { sinDatos: true };
    var cfg = col(m, 'config')[0] || {}, base = cfg.moneda || 'USD', tasas = cfg.tasas || {}, sinTasa = {};
    function cv(x, mon) { var v = A.convertir(x, mon || base, base, tasas); if (v == null) { sinTasa[mon] = 1; return n(x); } return v; }
    var ing = 0, gas = 0, porMes = {}, porCat = {}, clientes = {}, proyectos = {};
    mv.forEach(function (x) {
      var v = cv(x.monto, x.moneda), esI = x.tipo !== 'gasto', mm = mes(x.fecha) || '(sin fecha)'; porMes[mm] = porMes[mm] || { ingresos: 0, gastos: 0 };
      if (esI) { ing += v; porMes[mm].ingresos += v; } else { gas += v; porMes[mm].gastos += v; var c = x.categoria || 'Otros'; porCat[c] = (porCat[c] || 0) + v; }
    });
    Object.keys(porMes).forEach(function (k) { porMes[k].ingresos = r2(porMes[k].ingresos); porMes[k].gastos = r2(porMes[k].gastos); porMes[k].margen = r2(porMes[k].ingresos - porMes[k].gastos); });
    var hoy = dia(ahora), cobrar = [], tot = 0, venc = 0;
    fa.filter(function (f) { return f.tipo === 'factura' && f.estado !== 'cancelada' && f.estado !== 'borrador'; }).forEach(function (f) {
      var t = totalesDoc(f); if (t.saldo > 0.005) { var s = cv(t.saldo, f.moneda), vencida = !!(f.vence && f.vence < hoy); cobrar.push({ id: f.id, numero: f.numero || f.id, cliente: f.cliente, vence: f.vence || '', saldo: r2(s), vencida: vencida, diasVencida: vencida ? Math.round((new Date(hoy) - new Date(f.vence)) / 864e5) : 0 }); tot += s; if (vencida) venc += s; }
    });
    return { sinDatos: false, moneda: base, ingresos: r2(ing), gastos: r2(gas), margen: r2(ing - gas), margenPct: ing > 0 ? (ing - gas) / ing : null, porMes: porMes, gastosPorCategoria: topObj(Object.keys(porCat).reduce(function (o, k) { o[k] = r2(porCat[k]); return o; }, {}), 8),
      porCobrar: r2(tot), vencido: r2(venc), cuentasPorCobrar: cobrar.sort(function (a, b) { return b.diasVencida - a.diasVencida; }), movimientos: mv.length, facturas: fa.length, sinTasa: Object.keys(sinTasa), cv: cv };
  };
  function totalesDoc(d) {
    var sub = 0; arr(d.lineas).forEach(function (l) { sub += n(l.cant, 1) * n(l.precio) * (1 - n(l.desc) / 100); });
    var base = sub - sub * n(d.descuentoPct) / 100, imp = arr(d.impuestos).reduce(function (a, i) { return a + base * n(i.pct) / 100 * (i.retencion ? -1 : 1); }, 0), tot = base + imp, pag = arr(d.pagos).reduce(function (a, p) { return a + n(p.monto); }, 0);
    return { total: r2(tot), pagado: r2(pag), saldo: r2(tot - pag) };
  }
  A.totalesDoc = totalesDoc;
  A.dispositivos = function (datos) {
    var m = datos.modulos.dispositivos, pf = col(m, 'perfiles'), se = col(m, 'sesiones');
    if (!pf.length && !se.length) return { sinDatos: true };
    var porDia = {}; se.forEach(function (s) { var d = dia(n(s.inicio)); porDia[d] = (porDia[d] || 0) + 1; });
    return { sinDatos: false, perfiles: pf.length, porTipoPerfil: topObj(cuenta(pf, function (p) { return p.tipo; }), 9), sesiones: se.length, minutos: r2(suma(se, function (s) { return n(s.duracion); }) / 60000), porTipoSesion: topObj(cuenta(se, function (s) { return s.tipo; }), 9),
      bytesRx: suma(se, function (s) { return n(s.bytesRx); }), bytesTx: suma(se, function (s) { return n(s.bytesTx); }), conError: se.filter(function (s) { return String(s.error || '').trim(); }).length, porDia: porDia };
  };
  A.qr = function (datos) {
    var m = datos.modulos.qr, h = col(m, 'historial');
    if (!h.length && !col(m, 'estilos').length) return { sinDatos: true };
    var leidos = h.filter(function (x) { return x.origen === 'lectura'; }).length, lote = h.filter(function (x) { return x.origen === 'lote'; }).length;
    return { sinDatos: false, total: h.length, creados: h.length - leidos, leidos: leidos, lote: lote, favoritos: h.filter(function (x) { return x.fav; }).length, porTipo: topObj(cuenta(h, function (x) { return x.tipo; }), 8), estilos: col(m, 'estilos').length,
      nota: 'Solo cuentan los códigos guardados en el historial; las lecturas que no se guardan no dejan rastro.' };
  };
  A.dominios = function (datos, ahora) {
    return { drones: A.drones(datos), video: A.video(datos), automatizaciones: A.automatizaciones(datos), reconstruccion: A.reconstruccion(datos), ar: A.ar(datos), contenido: A.contenido(datos, ahora), monetizacion: A.monetizacion(datos, ahora), dispositivos: A.dispositivos(datos), qr: A.qr(datos) };
  };
  /* envoltura tolerante: si un agregador falla por un esquema inesperado devuelve sinDatos con el error */
  A.seguro = function (f, datos, ahora) { try { return f(datos, ahora); } catch (e) { return { sinDatos: true, error: String(e && e.message || e) }; } };
  A.dominiosSeguro = function (datos, ahora) {
    var o = {}; [['drones', A.drones], ['video', A.video], ['automatizaciones', A.automatizaciones], ['reconstruccion', A.reconstruccion], ['ar', A.ar], ['contenido', A.contenido], ['monetizacion', A.monetizacion], ['dispositivos', A.dispositivos], ['qr', A.qr]].forEach(function (p) { o[p[0]] = A.seguro(p[1], datos, ahora); });
    return o;
  };
  return A;
});
