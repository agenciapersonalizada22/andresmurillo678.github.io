/* Cruces entre modulos, recomendaciones por reglas explicitas, KPIs y metas. Puro (sin DOM). window.AnaCruces
   Toda cifra sale de datos locales ya leidos; cada recomendacion lista la evidencia (los datos que la disparan) y la regla con su umbral. */
(function (g, f) { var m = f(typeof require === 'function' && typeof module === 'object' ? require('./agregar.js') : g.AnaAgg); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaCruces = m; })(typeof self !== 'undefined' ? self : this, function (Agg) {
  'use strict';
  var C = {}, U = Agg.u, n = U.n, arr = U.arr, r2 = U.r2, col = Agg.col, norm = U.norm;
  var UMBRALES = C.UMBRALES = { margenMin: 0.2, fallaFlujo: 0.3, fallaGlobal: 0.2, piezasAtascadas: 3, diasAtasco: 14, costoIAIngresos: 0.05, incidencias: 0.2, cuotaAviso: 0.75, cuotaCritico: 0.9, diasSinRespaldo: 30, flujoMinEjecuciones: 3 };

  /* tarifa horaria del equipo registrado en Monetizacion: (costo - residual) / (vida en meses * horas de uso al mes) por cada equipo */
  C.equipoCostoHora = function (datos) {
    var eq = col(datos.modulos.monetizacion, 'equipo'), filas = eq.map(function (e) {
      var vida = n(e.vidaMeses), uso = n(e.usoHorasMes), dep = Math.max(0, n(e.costo) - n(e.residual));
      return { id: e.id, nombre: e.nombre || e.id, tipo: e.tipo || '', costo: n(e.costo), costoHora: vida > 0 && uso > 0 ? dep / (vida * uso) : 0 };
    });
    return { equipos: filas, inversion: r2(U.suma(filas, function (x) { return x.costo; })), costoHora: Math.round(U.suma(filas, function (x) { return x.costoHora; }) * 1e4) / 1e4 };
  };

  /* rentabilidad por proyecto (nombre normalizado Monetizacion = nombre del proyecto de Drones) y por cliente */
  C.rentabilidad = function (datos, dom) {
    var mon = dom.monetizacion;
    if (!mon || mon.sinDatos) return { sinDatos: true, motivo: 'Monetización no tiene movimientos.' };
    var mm = datos.modulos.monetizacion, pro = col(mm, 'proyectos'), cli = col(mm, 'clientes'), nomP = {}, nomC = {}, tarifa = C.equipoCostoHora(datos);
    pro.forEach(function (p) { nomP[p.id] = p.nombre || p.id; }); cli.forEach(function (c) { nomC[c.id] = c.nombre || c.id; });
    var horasPor = {}; var dr = dom.drones;
    if (dr && !dr.sinDatos) arr(dr.porProyecto).forEach(function (p) { horasPor[norm(p.nombre)] = (horasPor[norm(p.nombre)] || 0) + p.horas; });
    var P = {}, Cl = {}, facturas = {};
    col(mm, 'facturas').forEach(function (f) { if (f.tipo === 'factura' && f.estado !== 'borrador' && f.estado !== 'cancelada' && f.proyecto) facturas[f.proyecto] = (facturas[f.proyecto] || 0) + 1; });
    col(mm, 'movimientos').forEach(function (x) {
      var v = mon.cv(x.monto, x.moneda), ing = x.tipo !== 'gasto', pid = x.proyecto || '', cid = x.cliente || '';
      var p = P[pid] = P[pid] || { id: pid, nombre: pid ? (nomP[pid] || '(proyecto borrado)') : '(sin proyecto)', ingresos: 0, gastos: 0, porCliente: {} };
      if (ing) { p.ingresos += v; p.porCliente[cid] = (p.porCliente[cid] || 0) + v; } else p.gastos += v;
      var c = Cl[cid] = Cl[cid] || { id: cid, nombre: cid ? (nomC[cid] || '(cliente borrado)') : '(sin cliente)', ingresos: 0, gastos: 0, horas: 0 };
      if (ing) c.ingresos += v; else c.gastos += v;
    });
    var proyectos = Object.keys(P).map(function (k) {
      var p = P[k], horas = horasPor[norm(p.nombre)] || 0, costoEq = horas * tarifa.costoHora, margen = p.ingresos - p.gastos;
      Object.keys(p.porCliente).forEach(function (cid) { if (p.ingresos > 0 && horas) Cl[cid].horas += horas * p.porCliente[cid] / p.ingresos; });
      return { id: p.id, nombre: p.nombre, ingresos: r2(p.ingresos), gastos: r2(p.gastos), margen: r2(margen), margenPct: p.ingresos > 0 ? margen / p.ingresos : null, horasVuelo: r2(horas), margenPorHora: horas > 0 ? r2(margen / horas) : null,
        costoEquipo: r2(costoEq), margenNeto: r2(margen - costoEq), facturas: facturas[p.id] || 0, vinculado: horas > 0 };
    }).sort(function (a, b) { return b.margen - a.margen; });
    var clientes = Object.keys(Cl).map(function (k) { var c = Cl[k]; return { id: c.id, nombre: c.nombre, ingresos: r2(c.ingresos), gastos: r2(c.gastos), margen: r2(c.ingresos - c.gastos), horas: r2(c.horas), margenPorHora: c.horas > 0 ? r2((c.ingresos - c.gastos) / c.horas) : null }; }).sort(function (a, b) { return b.margen - a.margen; });
    return { sinDatos: false, moneda: mon.moneda, proyectos: proyectos, clientes: clientes, costoHoraEquipo: tarifa.costoHora, metodo: 'Margen = ingresos − gastos del proyecto (Monetización). Horas = bitácora de Drones del proyecto con el mismo nombre. Costo de equipo = horas × depreciación por hora de todo el equipo de Monetización (se asume que se usa completo). Las horas de un cliente son las de cada proyecto repartidas según lo que ese cliente pagó.' };
  };

  C.roiEquipo = function (datos, dom, rent) {
    var tarifa = C.equipoCostoHora(datos);
    if (!tarifa.equipos.length) return { sinDatos: true, motivo: 'No hay equipo registrado en Monetización (pestaña de tarifas).' };
    if (!rent || rent.sinDatos) return { sinDatos: true, motivo: 'Faltan movimientos en Monetización.' };
    var vinc = rent.proyectos.filter(function (p) { return p.vinculado; });
    if (!vinc.length) return { sinDatos: true, motivo: 'Ningún proyecto de Monetización coincide por nombre con proyectos de Drones que tengan vuelos en la bitácora.', inversion: tarifa.inversion };
    var margen = U.suma(vinc, function (p) { return p.margen; }), horas = U.suma(vinc, function (p) { return p.horasVuelo; }), mph = horas > 0 ? margen / horas : 0;
    return { sinDatos: false, inversion: tarifa.inversion, margenVinculado: r2(margen), horas: r2(horas), margenPorHora: r2(mph), roi: tarifa.inversion > 0 ? margen / tarifa.inversion : null,
      horasParaRecuperar: mph > 0 ? Math.max(0, Math.ceil((tarifa.inversion - margen) / mph)) : null,
      equipos: tarifa.equipos.map(function (e) { return { nombre: e.nombre, costo: e.costo, costoHora: r2(e.costoHora), horasParaRecuperar: mph > 0 ? Math.ceil(e.costo / mph) : null }; }),
      metodo: 'ROI = margen de los proyectos con vuelos ÷ inversión en equipo. Horas para recuperar = (inversión − margen ya obtenido) ÷ margen por hora de vuelo.' };
  };

  /* gasto de IA (contadores de los limitadores de Contenido y Video, ventana de ~7 dias) / piezas terminadas en esa ventana */
  C.costoIA = function (datos, dom) {
    var dias = {}, total = 0, llamadas = 0, fuentes = [];
    ['contenido-ia', 'video-ia'].forEach(function (id) {
      var l = datos.ls && datos.ls[id] && datos.ls[id].limites; if (!l) return; var g = l.gasto || {}, t = 0;
      Object.keys(g).forEach(function (d) { dias[d] = 1; t += n(g[d]); }); total += t; llamadas += arr(l.llamadas).length; if (t || arr(l.llamadas).length) fuentes.push({ modulo: id, gasto: r2(t * 10000) / 10000, llamadas: arr(l.llamadas).length });
    });
    var ks = Object.keys(dias);
    if (!ks.length && !llamadas) return { sinDatos: true, motivo: 'Aún no hay llamadas a la IA registradas en este dispositivo.' };
    var piezas = col(datos.modulos['contenido-ia'], 'piezas').filter(function (p) { return ['listo', 'programado', 'publicado'].indexOf(p.estado) >= 0 && (!n(p._t) || dias[U.dia(n(p._t))]); });
    return { sinDatos: false, gasto: Math.round(total * 10000) / 10000, llamadas: llamadas, ventanaDias: ks.length, piezas: piezas.length, costoPorPieza: piezas.length ? Math.round(total / piezas.length * 10000) / 10000 : null, costoPorLlamada: llamadas ? Math.round(total / llamadas * 10000) / 10000 : null, fuentes: fuentes,
      metodo: 'Gasto = contadores de coste de los limitadores de Contenido y Video (solo guardan ~7 días). Piezas = listas, programadas o publicadas modificadas en esos días.' };
  };

  C.productividad = function (datos, dom) {
    var dr = dom.drones, horas = dr && !dr.sinDatos ? dr.horas : 0, ct = dom.contenido, mon = dom.monetizacion, r3 = dom.reconstruccion;
    var piezas = ct && !ct.sinDatos ? ct.publicadas : 0, facts = col(datos.modulos.monetizacion, 'facturas').filter(function (f) { return f.tipo === 'factura' && f.estado !== 'borrador' && f.estado !== 'cancelada'; }).length;
    var modelos = r3 && !r3.sinDatos ? r3.capas : 0, ent = piezas + facts + modelos;
    if (!horas) return { sinDatos: true, motivo: 'No hay horas de vuelo en la bitácora de Drones; es la única fuente de horas registradas.', entregables: ent };
    return { sinDatos: false, horas: horas, entregables: ent, desglose: { piezasPublicadas: piezas, facturasEmitidas: facts, modelos3D: modelos }, horasPorEntregable: ent ? r2(horas / ent) : null,
      metodo: 'Entregable = pieza publicada + factura emitida + modelo 3D. Horas = bitácora de vuelo.' };
  };

  /* ---------- cuellos de botella y recomendaciones (reglas explicitas) ---------- */
  function ev(etq, valor) { return { etq: etq, valor: valor }; }
  function pct(x) { return Math.round(x * 100) + ' %'; }
  C.REGLAS = [
    { id: 'cuota', nombre: 'Cuota de almacenamiento', regla: 'Avisa si el uso del sitio ≥ 75 % de la cuota (crítico ≥ 90 %).', eval: function (x) {
      var c = x.cuota; if (!c || c.pct == null || c.pct < UMBRALES.cuotaAviso) return null;
      return { nivel: c.pct >= UMBRALES.cuotaCritico ? 'alta' : 'media', texto: 'Libera espacio o exporta un respaldo: el navegador puede borrar datos al llenarse la cuota.', evidencia: [ev('Uso del sitio', pct(c.pct)), ev('Cuota', Math.round(c.cuota / 1048576) + ' MB')] }; } },
    { id: 'facturas_vencidas', nombre: 'Cuentas por cobrar vencidas', regla: 'Avisa si hay facturas con fecha de vencimiento pasada y saldo pendiente.', eval: function (x) {
      var m = x.dom.monetizacion; if (!m || m.sinDatos || !m.vencido) return null; var v = m.cuentasPorCobrar.filter(function (c) { return c.vencida; });
      return { nivel: 'alta', texto: 'Reclama los pagos vencidos empezando por el más antiguo.', evidencia: [ev('Facturas vencidas', v.length), ev('Monto vencido', m.vencido + ' ' + m.moneda), ev('Mayor atraso', v[0].diasVencida + ' días (' + v[0].numero + ')')] }; } },
    { id: 'margen_bajo', nombre: 'Margen bajo', regla: 'Avisa si el margen total < 20 % de los ingresos (o es negativo).', eval: function (x) {
      var m = x.dom.monetizacion; if (!m || m.sinDatos || m.margenPct == null || m.margenPct >= UMBRALES.margenMin) return null;
      return { nivel: m.margen < 0 ? 'alta' : 'media', texto: 'Revisa tarifas y gastos por categoría; el margen no cubre el mínimo del 20 %.', evidencia: [ev('Ingresos', m.ingresos + ' ' + m.moneda), ev('Gastos', m.gastos + ' ' + m.moneda), ev('Margen', pct(m.margenPct))] }; } },
    { id: 'proyecto_perdida', nombre: 'Proyecto con pérdidas', regla: 'Avisa por cada proyecto con gastos mayores que ingresos.', eval: function (x) {
      var r = x.rent; if (!r || r.sinDatos) return null; var l = r.proyectos.filter(function (p) { return p.margen < 0 && p.id; }); if (!l.length) return null;
      return { nivel: 'media', texto: 'Revisa el alcance o el precio de estos proyectos.', evidencia: l.slice(0, 3).map(function (p) { return ev(p.nombre, 'margen ' + p.margen + ' ' + r.moneda); }) }; } },
    { id: 'flujo_falla', nombre: 'Flujo que falla', regla: 'Avisa si un flujo con ≥ 3 ejecuciones reales tiene más de 30 % de fallos.', eval: function (x) {
      var a = x.dom.automatizaciones; if (!a || a.sinDatos) return null; var l = a.porFlujo.filter(function (f) { return f.total >= UMBRALES.flujoMinEjecuciones && f.error / f.total > UMBRALES.fallaFlujo; }); if (!l.length) return null;
      return { nivel: 'alta', texto: 'Abre el registro de ejecuciones de Automatizaciones y revisa el paso que falla.', evidencia: l.slice(0, 3).map(function (f) { return ev(f.nombre, f.error + ' fallos de ' + f.total + ' (' + pct(f.error / f.total) + ')'); }) }; } },
    { id: 'fallo_global', nombre: 'Muchos fallos en automatizaciones', regla: 'Avisa si más del 20 % de todas las ejecuciones reales falla.', eval: function (x) {
      var a = x.dom.automatizaciones; if (!a || a.sinDatos || a.tasaFallo == null || a.tasaFallo <= UMBRALES.fallaGlobal || a.ejecuciones < 5) return null;
      return { nivel: 'media', texto: 'Hay un problema general (permisos, dominios o claves); empieza por los flujos con más ejecuciones.', evidencia: [ev('Ejecuciones', a.ejecuciones), ev('Fallos', a.error), ev('Tasa de fallo', pct(a.tasaFallo))] }; } },
    { id: 'piezas_atascadas', nombre: 'Piezas atascadas', regla: 'Avisa si hay ≥ 3 piezas en idea, guion o producción sin cambios desde hace más de 14 días.', eval: function (x) {
      var l = col(x.datos.modulos['contenido-ia'], 'piezas').filter(function (p) { return ['idea', 'guion', 'produccion'].indexOf(p.estado || 'idea') >= 0 && n(p._t) && (x.ahora - n(p._t)) / 864e5 > UMBRALES.diasAtasco; });
      if (l.length < UMBRALES.piezasAtascadas) return null; var por = U.topObj(U.cuenta(l, function (p) { return p.estado || 'idea'; }), 3);
      return { nivel: 'media', texto: 'Cuello de botella en ' + por[0].etq + ': termina o descarta esas piezas antes de crear más.', evidencia: [ev('Piezas estancadas', l.length)].concat(por.map(function (p) { return ev('En ' + p.etq, p.valor); })) }; } },
    { id: 'calendario_vacio', nombre: 'Calendario sin publicaciones', regla: 'Avisa si hay piezas listas pero ninguna programada en los próximos 7 días.', eval: function (x) {
      var c = x.dom.contenido; if (!c || c.sinDatos) return null; var hoy = U.dia(x.ahora), lim = U.dia(x.ahora + 7 * 864e5), prox = c.calendario.filter(function (d) { return d.fecha >= hoy && d.fecha <= lim; });
      if (prox.length || !c.listas) return null; return { nivel: 'baja', texto: 'Programa las piezas listas para mantener la frecuencia de publicación.', evidencia: [ev('Piezas listas o programadas', c.listas), ev('Publicaciones en 7 días', 0)] }; } },
    { id: 'piezas_vencidas', nombre: 'Publicaciones vencidas', regla: 'Avisa si hay piezas con fecha pasada que no se publicaron.', eval: function (x) {
      var c = x.dom.contenido; if (!c || c.sinDatos || !c.vencidas) return null; return { nivel: 'media', texto: 'Reprograma o publica las piezas con fecha pasada.', evidencia: [ev('Piezas vencidas', c.vencidas)] }; } },
    { id: 'costo_ia', nombre: 'Costo de IA alto', regla: 'Avisa si el gasto de IA supera el 5 % de los ingresos registrados.', eval: function (x) {
      var i = x.ia, m = x.dom.monetizacion; if (!i || i.sinDatos || !m || m.sinDatos || m.ingresos <= 0 || i.gasto / m.ingresos <= UMBRALES.costoIAIngresos) return null;
      return { nivel: 'media', texto: 'Baja la frecuencia o el presupuesto diario de IA, o sube el precio de lo que produces con ella.', evidencia: [ev('Gasto de IA (ventana ~7 d)', i.gasto), ev('Ingresos totales', m.ingresos + ' ' + m.moneda), ev('Proporción', pct(i.gasto / m.ingresos))] }; } },
    { id: 'equipo_sin_retorno', nombre: 'Equipo sin retorno', regla: 'Avisa si el margen de los proyectos con vuelos es menor que la inversión en equipo y el ROI es negativo.', eval: function (x) {
      var r = x.roi; if (!r || r.sinDatos || r.roi == null || r.roi >= 0) return null; return { nivel: 'media', texto: 'El equipo aún no se paga con los proyectos vinculados.', evidencia: [ev('Inversión en equipo', r.inversion), ev('Margen vinculado', r.margenVinculado), ev('ROI', pct(r.roi))] }; } },
    { id: 'incidencias', nombre: 'Incidencias de vuelo', regla: 'Avisa si ≥ 20 % de los vuelos de la bitácora tiene incidencias anotadas.', eval: function (x) {
      var d = x.dom.drones; if (!d || d.sinDatos || d.vuelos < 3 || d.incidencias / d.vuelos < UMBRALES.incidencias) return null; return { nivel: 'media', texto: 'Revisa el checklist previo al vuelo y las condiciones de viento.', evidencia: [ev('Vuelos', d.vuelos), ev('Con incidencias', d.incidencias), ev('Viento medio', d.vientoProm)] }; } },
    { id: 'misiones_sin_vuelo', nombre: 'Misiones sin vuelos', regla: 'Avisa si hay misiones planificadas pero la bitácora no tiene ningún vuelo.', eval: function (x) {
      var d = x.dom.drones; if (!d || d.sinDatos || !d.misiones || d.vuelos) return null; return { nivel: 'baja', texto: 'Anota los vuelos reales en la bitácora para medir horas y rentabilidad.', evidencia: [ev('Misiones planificadas', d.misiones), ev('Vuelos anotados', 0)] }; } },
    { id: 'sin_respaldo', nombre: 'Respaldo atrasado', regla: 'Avisa si hay datos y el último respaldo completo tiene más de 30 días (o no existe).', eval: function (x) {
      var tot = U.suma(Agg.MODULOS, function (d) { return x.datos.modulos[d.id].registros; }); if (!tot) return null; var u = n(x.respaldoUlt);
      if (u && (x.ahora - u) / 864e5 <= UMBRALES.diasSinRespaldo) return null; return { nivel: 'baja', texto: 'Exporta un respaldo completo desde la pestaña Salud.', evidencia: [ev('Registros locales', tot), ev('Último respaldo', u ? Math.round((x.ahora - u) / 864e5) + ' días' : 'nunca')] }; } },
    { id: 'sync_pendiente', nombre: 'Cambios sin sincronizar', regla: 'Avisa si hay sesión y registros modificados después de la última sincronización.', eval: function (x) {
      var l = (x.sincro || []).filter(function (s) { return s.estado === 'pendiente'; }); if (!l.length) return null; return { nivel: 'baja', texto: 'Abre esos módulos con conexión para que suban sus cambios.', evidencia: l.slice(0, 4).map(function (s) { return ev(s.nombre, s.pendientes + ' pendientes' + (s.conflictos.length ? ', ' + s.conflictos.length + ' con borrado' : '')); }) }; } },
    { id: 'integridad', nombre: 'Problemas de integridad', regla: 'Avisa si el verificador encontró problemas de gravedad alta.', eval: function (x) {
      var i = x.integridad; if (!i || !i.altas) return null; return { nivel: 'media', texto: 'Revisa la pestaña Salud: hay datos con esquema roto o referencias perdidas.', evidencia: [ev('Problemas graves', i.altas), ev('Total', i.total)] }; } }
  ];
  /* ctx: {datos, dom, rent, roi, ia, cuota, sincro, integridad, respaldoUlt, ahora} */
  C.recomendaciones = function (ctx) {
    var out = []; C.REGLAS.forEach(function (r) {
      var x; try { x = r.eval(ctx); } catch (e) { x = null; }
      if (x) out.push({ id: r.id, titulo: r.nombre, regla: r.regla, nivel: x.nivel, texto: x.texto, evidencia: x.evidencia });
    });
    var o = { alta: 0, media: 1, baja: 2 }; return out.sort(function (a, b) { return o[a.nivel] - o[b.nivel]; });
  };
  C.cuellos = function (ctx) {
    var ids = ['piezas_atascadas', 'facturas_vencidas', 'flujo_falla', 'fallo_global', 'cuota', 'misiones_sin_vuelo', 'piezas_vencidas', 'calendario_vacio'];
    return C.recomendaciones(ctx).filter(function (r) { return ids.indexOf(r.id) >= 0; });
  };

  /* ---------- KPIs y metas ---------- */
  function enMes(f, ahora) { return U.mes(f) === U.mes(U.dia(ahora)); }
  C.KPIS = [
    { id: 'ingresos_mes', nombre: 'Ingresos del mes', unidad: 'moneda', mejor: 'mayor', val: function (x) { var m = x.dom.monetizacion; if (!m || m.sinDatos) return null; var q = m.porMes[U.mes(U.dia(x.ahora))]; return q ? q.ingresos : 0; } },
    { id: 'margen_mes', nombre: 'Margen del mes', unidad: 'moneda', mejor: 'mayor', val: function (x) { var m = x.dom.monetizacion; if (!m || m.sinDatos) return null; var q = m.porMes[U.mes(U.dia(x.ahora))]; return q ? q.margen : 0; } },
    { id: 'margen_pct', nombre: 'Margen total', unidad: '%', mejor: 'mayor', val: function (x) { var m = x.dom.monetizacion; return m && !m.sinDatos && m.margenPct != null ? r2(m.margenPct * 100) : null; } },
    { id: 'por_cobrar', nombre: 'Por cobrar', unidad: 'moneda', mejor: 'menor', val: function (x) { var m = x.dom.monetizacion; return m && !m.sinDatos ? m.porCobrar : null; } },
    { id: 'vencido', nombre: 'Vencido por cobrar', unidad: 'moneda', mejor: 'menor', val: function (x) { var m = x.dom.monetizacion; return m && !m.sinDatos ? m.vencido : null; } },
    { id: 'horas_vuelo', nombre: 'Horas de vuelo (total)', unidad: 'h', mejor: 'mayor', val: function (x) { var d = x.dom.drones; return d && !d.sinDatos ? d.horas : null; } },
    { id: 'horas_vuelo_mes', nombre: 'Horas de vuelo del mes', unidad: 'h', mejor: 'mayor', val: function (x) { var d = x.dom.drones; return d && !d.sinDatos ? (d.porMes[U.mes(U.dia(x.ahora))] || 0) : null; } },
    { id: 'tasa_exito_flujos', nombre: 'Éxito de automatizaciones', unidad: '%', mejor: 'mayor', val: function (x) { var a = x.dom.automatizaciones; return a && !a.sinDatos && a.tasaExito != null ? r2(a.tasaExito * 100) : null; } },
    { id: 'fallos_flujos', nombre: 'Ejecuciones con fallo', unidad: 'n', mejor: 'menor', val: function (x) { var a = x.dom.automatizaciones; return a && !a.sinDatos ? a.error : null; } },
    { id: 'piezas_publicadas', nombre: 'Piezas publicadas', unidad: 'n', mejor: 'mayor', val: function (x) { var c = x.dom.contenido; return c && !c.sinDatos ? c.publicadas : null; } },
    { id: 'cuota_pct', nombre: 'Uso de la cuota', unidad: '%', mejor: 'menor', val: function (x) { return x.cuota && x.cuota.pct != null ? r2(x.cuota.pct * 100) : null; } },
    { id: 'costo_ia_pieza', nombre: 'Costo de IA por pieza', unidad: 'n', mejor: 'menor', val: function (x) { return x.ia && !x.ia.sinDatos && x.ia.costoPorPieza != null ? x.ia.costoPorPieza : null; } },
    { id: 'problemas_integridad', nombre: 'Problemas de integridad', unidad: 'n', mejor: 'menor', val: function (x) { return x.integridad ? x.integridad.total : null; } }
  ];
  C.kpi = function (id) { return C.KPIS.filter(function (k) { return k.id === id; })[0]; };
  C.valoresKPI = function (ctx) { var o = {}; C.KPIS.forEach(function (k) { var v; try { v = k.val(ctx); } catch (e) { v = null; } o[k.id] = v == null || !isFinite(v) ? null : v; }); return o; };
  /* meta: {id, kpi, comparador:'>='|'<=', objetivo, alerta}; estado: ok | cerca (a menos de 10 % del objetivo) | falla | sinDatos */
  C.evaluarMeta = function (meta, valores) {
    var k = C.kpi(meta.kpi), v = valores[meta.kpi], obj = n(meta.objetivo); if (!k) return { meta: meta, estado: 'sinDatos', motivo: 'KPI desconocido (' + meta.kpi + ')', valor: null };
    if (v == null) return { meta: meta, kpi: k, estado: 'sinDatos', valor: null, motivo: 'sin datos' };
    var cumple = meta.comparador === '<=' ? v <= obj : v >= obj, tol = Math.abs(obj) * 0.1, cerca = !cumple && (meta.comparador === '<=' ? v <= obj + tol : v >= obj - tol);
    return { meta: meta, kpi: k, valor: v, objetivo: obj, estado: cumple ? 'ok' : cerca ? 'cerca' : 'falla', avance: obj ? v / obj : null };
  };
  C.evaluarMetas = function (metas, valores) { return arr(metas).map(function (m) { return C.evaluarMeta(m, valores); }); };
  C.alertas = function (evals) { return evals.filter(function (e) { return e.meta.alerta !== false && (e.estado === 'falla' || e.estado === 'cerca'); }).map(function (e) { return { id: e.meta.id, nivel: e.estado === 'falla' ? 'alta' : 'media', texto: e.kpi.nombre + ': ' + e.valor + ' (meta ' + (e.meta.comparador === '<=' ? '≤ ' : '≥ ') + e.objetivo + ')' }; }); };
  C.METAS_SUGERIDAS = [
    { kpi: 'margen_pct', comparador: '>=', objetivo: 20, alerta: true }, { kpi: 'vencido', comparador: '<=', objetivo: 0, alerta: true }, { kpi: 'tasa_exito_flujos', comparador: '>=', objetivo: 90, alerta: true },
    { kpi: 'cuota_pct', comparador: '<=', objetivo: 75, alerta: true }, { kpi: 'problemas_integridad', comparador: '<=', objetivo: 0, alerta: true }
  ];

  /* todo junto para la interfaz y los informes */
  C.analizar = function (datos, o) {
    o = o || {}; var ahora = o.ahora || datos.ahora, dom = Agg.dominiosSeguro(datos, ahora), rent, roi, ia, prod, cuota = Agg.cuota(datos.estimate, datos), sincro = Agg.sincronizacion(datos, o.sesion !== false);
    function s(f) { try { return f(); } catch (e) { return { sinDatos: true, error: String(e && e.message || e) }; } }
    rent = s(function () { return C.rentabilidad(datos, dom); }); roi = s(function () { return C.roiEquipo(datos, dom, rent); }); ia = s(function () { return C.costoIA(datos, dom); }); prod = s(function () { return C.productividad(datos, dom); });
    var ctx = { datos: datos, dom: dom, rent: rent, roi: roi, ia: ia, cuota: cuota, sincro: sincro, integridad: o.integridad || null, respaldoUlt: o.respaldoUlt || 0, ahora: ahora };
    var valores = C.valoresKPI(ctx), metas = C.evaluarMetas(o.metas || [], valores);
    return { ahora: ahora, dom: dom, rent: rent, roi: roi, ia: ia, prod: prod, cuota: cuota, sincro: sincro, resumen: Agg.resumenModulos(datos), uso: Agg.usoDiario(datos, 30, ahora), recomendaciones: C.recomendaciones(ctx), cuellos: C.cuellos(ctx), valores: valores, kpiDefs: C.KPIS.map(function (k) { return { id: k.id, nombre: k.nombre, unidad: k.unidad, mejor: k.mejor }; }), metas: metas, alertas: C.alertas(metas), ctx: ctx };
  };
  return C;
});
