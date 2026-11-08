/* Vista Dominios: graficas propias por modulo (drones, video, automatizaciones, 3D, AR, contenido, monetizacion, dispositivos, QR). window.AnaV.dominios */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, Agg = g.AnaAgg, GR = g.AnaGraf, V = g.AnaV = g.AnaV || {}, PAL = GR.PAL, actual = 'drones';
  var DOMS = [['drones', 'Drones', 'drones'], ['video', 'Video IA', 'video-ia'], ['automatizaciones', 'Automatizaciones', 'automatizaciones'], ['reconstruccion', '3D', 'reconstruccion-3d'], ['ar', 'AR', 'realidad-aumentada'], ['contenido', 'Contenido', 'contenido-ia'], ['monetizacion', 'Finanzas', 'monetizacion'], ['dispositivos', 'Dispositivos', 'dispositivos'], ['qr', 'QR', 'qr']];
  function ult(obj, k) { return Object.keys(obj).sort().slice(-k); }
  function ultDias(an, k) { return an.uso.dias.slice(-k); }
  function hb(items, titulo, fmt) { return GR.hbarras({ titulo: titulo, items: items.map(function (x, i) { return { etq: x.etq, valor: x.valor, color: PAL[i % PAL.length], texto: fmt ? fmt(x.valor) : U.n(x.valor) }; }), vacio: 'Sin datos' }); }
  var R = {};
  R.drones = function (d) {
    var meses = ult(d.porMes, 12);
    return [U.tiles([U.tile(d.proyectos, 'Proyectos'), U.tile(d.misiones, 'Misiones planificadas', d.waypoints + ' waypoints · ' + U.n(d.distanciaKm, 2) + ' km'), U.tile(d.vuelos, 'Vuelos anotados'), U.tile(U.n(d.horas, 1) + ' h', 'Horas de vuelo', d.baterias + ' baterías'), U.tile(d.incidencias, 'Con incidencias', 'viento medio ' + U.n(d.vientoProm, 1), d.vuelos >= 3 && d.incidencias / d.vuelos >= 0.2 ? 'aviso' : '')]),
      GR.barras({ titulo: 'Horas de vuelo por mes', datos: meses.map(function (m) { return { etq: m, valor: d.porMes[m] }; }), unidad: 'h', color: PAL[2], vacio: 'La bitácora de vuelos está vacía.' }),
      hb(d.porDron, 'Horas por dron', function (v) { return U.n(v, 1) + ' h'; }), hb(d.porProyecto.slice(0, 6).map(function (p) { return { etq: p.nombre, valor: p.horas }; }), 'Horas por proyecto', function (v) { return U.n(v, 1) + ' h'; })];
  };
  R.video = function (d, an) {
    var out = [U.tiles([U.tile(d.proyectos, 'Proyectos', d.zonas + ' zonas · ' + d.lineas + ' líneas'), U.tile(d.reglasActivas + ' / ' + d.reglas, 'Reglas activas'), U.tile(d.eventos, 'Eventos'), U.tile(d.capturas, 'Capturas'), U.tile(d.clips, 'Clips'), U.tile(d.llamadasIA, 'Llamadas de IA', 'últimos ~7 días')])];
    if (!d.eventosGuardados) out.push(U.nota('Video con IA no guarda los eventos, capturas ni clips entre sesiones (solo proyectos y reglas). Cuando una regla dispara un flujo de Automatizaciones con origen «video», esas ejecuciones se cuentan aquí como eventos.'));
    else { out.push(GR.barras({ titulo: 'Eventos por hora del día (picos)', datos: d.porHora.map(function (v, i) { return { etq: ('0' + i).slice(-2) + 'h', valor: v }; }), color: PAL[5] })); out.push(U.nota('Pico: ' + (d.picoHora != null ? d.picoValor + ' eventos a las ' + d.picoHora + ' h' : '—') + (d.picoDia ? ' · día más activo: ' + d.picoDia.etq + ' (' + d.picoDia.valor + ')' : ''))); out.push(hb(d.porTipo, 'Eventos por tipo')); }
    return out;
  };
  R.automatizaciones = function (d, an) {
    var dias = ultDias(an, 14), s1 = dias.map(function (x) { return (d.porDia[x] || { ok: 0 }).ok; }), s2 = dias.map(function (x) { return (d.porDia[x] || { error: 0 }).error; });
    return [U.tiles([U.tile(d.flujos, 'Flujos', d.activos + ' activos'), U.tile(d.ejecuciones, 'Ejecuciones reales', d.simulaciones + ' simulaciones aparte'), U.tile(d.tasaExito == null ? '—' : U.pct(d.tasaExito), 'Tasa de éxito', null, d.tasaFallo > 0.2 ? 'aviso' : ''), U.tile(d.error, 'Con fallo', null, d.error ? 'aviso' : ''), U.tile(d.sinEjecuciones, 'Flujos sin ejecutar')]),
      GR.dona({ titulo: 'Resultado de las ejecuciones', partes: [{ etq: 'Éxito', valor: d.ok, color: 'var(--g3)' }, { etq: 'Fallo', valor: d.error, color: 'var(--g6)' }, { etq: 'Otro', valor: d.otros, color: 'var(--g5)' }], centro: d.tasaExito == null ? '—' : U.pct(d.tasaExito), centroEtq: 'éxito', vacio: 'Aún no hay ejecuciones reales (el registro es solo de este dispositivo).' }),
      GR.agrupadas({ titulo: 'Ejecuciones por día (14 días)', etqs: dias.map(function (x) { return x.slice(5); }), series: [{ nombre: 'Éxito', color: 'var(--g3)', datos: s1 }, { nombre: 'Fallo', color: 'var(--g6)', datos: s2 }], vacio: 'Sin ejecuciones en los últimos 14 días.' }),
      d.porFlujo.length ? U.tabla(['Flujo', 'Ejec.', 'Éxito', 'Fallos', 'Duración media'], d.porFlujo.map(function (f) { return [f.nombre, f.total, U.pct(f.tasaExito), f.error, (f.durProm / 1000).toFixed(1) + ' s']; })) : null];
  };
  R.reconstruccion = function (d) {
    return [U.tiles([U.tile(d.proyectos, 'Proyectos'), U.tile(d.capas, 'Modelos / capas'), U.tile(U.n(d.triangulos, 0), 'Triángulos'), U.tile(d.medidas, 'Medidas'), U.tile(d.calidadProm == null ? 'sin dato' : U.n(d.calidadProm, 0), 'Calidad media', d.calidadProm == null ? 'los modelos no guardan nitidez' : d.calidadMuestras + ' capas con dato'), U.tile(U.n(d.completitudProm, 0) + ' / 100', 'Completitud media')]),
      GR.dona({ titulo: 'Modelos por tamaño', partes: [{ etq: '< 10 mil triáng.', valor: d.tamanos.pequeno, color: 'var(--g3)' }, { etq: '10–100 mil', valor: d.tamanos.medio, color: 'var(--g1)' }, { etq: '> 100 mil', valor: d.tamanos.grande, color: 'var(--g2)' }], centro: d.capas, centroEtq: 'modelos' }),
      GR.hbarras({ titulo: 'Completitud por proyecto (regla: capas 40 + malla 30 + medidas 15 + plano 10 + notas 5)', items: d.completitud.slice(0, 8).map(function (p, i) { return { etq: p.nombre, valor: p.puntaje, color: PAL[2], texto: p.puntaje + ' / 100' }; }), max: 100 })];
  };
  R.ar = function (d, an) {
    var meses = ult(d.creadosPorMes, 12);
    return [U.tiles([U.tile(d.proyectos, 'Proyectos'), U.tile(d.capas, 'Capas'), U.tile(d.anclas, 'Anclas'), U.tile(d.objetos, 'Objetos 3D'), U.tile(d.pngs + d.modelos, 'PNG y modelos propios', 'solo en este dispositivo')]),
      GR.barras({ titulo: 'Proyectos de RA creados por mes', datos: meses.map(function (m) { return { etq: m, valor: d.creadosPorMes[m] }; }), color: PAL[4] }), GR.barras({ titulo: 'Cambios en proyectos de RA (30 días)', datos: an.uso.dias.map(function (x, i) { return { etq: x.slice(5), valor: d.ultimos30[i] }; }), color: PAL[4], vacio: 'Sin cambios recientes.' })];
  };
  R.contenido = function (d) {
    var out = [U.tiles([U.tile(d.proyectos, 'Canales / proyectos'), U.tile(d.piezas, 'Piezas', d.series + ' series · ' + d.prompts + ' prompts'), U.tile(d.publicadas, 'Publicadas'), U.tile(d.listas, 'Listas o programadas'), U.tile(d.vencidas, 'Vencidas', null, d.vencidas ? 'aviso' : '')]),
      GR.dona({ titulo: 'Producción por estado', partes: ['idea', 'guion', 'produccion', 'listo', 'programado', 'publicado'].map(function (k, i) { return { etq: k, valor: d.porEstado[k] || 0, color: PAL[i % PAL.length] }; }), centro: d.piezas, centroEtq: 'piezas' }),
      hb(d.porCanal, 'Piezas por canal'),
      GR.barras({ titulo: 'Calendario: publicaciones en los próximos días', datos: d.calendario.map(function (x) { return { etq: x.fecha.slice(5), valor: x.n }; }), color: PAL[3], vacio: 'No hay publicaciones con fecha futura.' })];
    d.canales.forEach(function (c, i) {
      var f = c.serie; out.push(f.length >= 2 ? GR.linea({ titulo: 'Seguidores · ' + c.canal, etqs: f.map(function (x) { return x[0]; }), series: [{ nombre: 'Seguidores', color: PAL[i % PAL.length], datos: f.map(function (x) { return x[1]; }) }] }) : U.nota('Canal «' + c.canal + '»: ' + (f.length ? 'un solo registro de seguidores (' + U.n(c.seguidores, 0) + ')' : 'sin registros de seguidores') + '; con dos o más se dibuja la evolución.'));
    });
    if (d.canales.length) out.push(U.tabla(['Canal', 'Registros', 'Seguidores', 'Crecimiento', 'Vistas', 'Ingresos'], d.canales.map(function (c) { return [c.canal, c.registros, U.n(c.seguidores, 0), c.crecimiento == null ? '—' : (c.crecimiento > 0 ? '+' : '') + U.n(c.crecimiento, 0), U.n(c.vistas, 0), U.n(c.ingresos)]; })));
    return out;
  };
  R.monetizacion = function (d) {
    var meses = ult(d.porMes, 6), mon = d.moneda;
    return [U.tiles([U.tile(U.din(d.ingresos, mon), 'Ingresos'), U.tile(U.din(d.gastos, mon), 'Gastos'), U.tile(U.din(d.margen, mon), 'Margen', d.margenPct == null ? null : U.pct(d.margenPct) + ' de los ingresos', d.margenPct != null && d.margenPct < 0.2 ? 'aviso' : ''), U.tile(U.din(d.porCobrar, mon), 'Por cobrar'), U.tile(U.din(d.vencido, mon), 'Vencido', null, d.vencido ? 'critico' : '')]),
      d.sinTasa.length ? U.nota('Faltan tasas de cambio para ' + d.sinTasa.join(', ') + '; esos montos se suman sin convertir.', 'tr-av') : null,
      GR.agrupadas({ titulo: 'Ingresos y gastos por mes (' + mon + ')', etqs: meses, series: [{ nombre: 'Ingresos', color: 'var(--g3)', datos: meses.map(function (m) { return d.porMes[m].ingresos; }) }, { nombre: 'Gastos', color: 'var(--g2)', datos: meses.map(function (m) { return d.porMes[m].gastos; }) }], vacio: 'Sin movimientos.' }),
      GR.barras({ titulo: 'Margen por mes (' + mon + ')', datos: meses.map(function (m) { return { etq: m, valor: Math.max(0, d.porMes[m].margen), color: d.porMes[m].margen < 0 ? 'var(--g6)' : 'var(--g3)' }; }), unidad: mon, vacio: 'Sin margen positivo en estos meses.' }),
      hb(d.gastosPorCategoria, 'Gastos por categoría', function (v) { return U.din(v, mon); }),
      d.cuentasPorCobrar.length ? U.tabla(['Factura', 'Vence', 'Saldo', 'Estado'], d.cuentasPorCobrar.map(function (c) { return [c.numero, c.vence || '—', U.din(c.saldo, mon), c.vencida ? U.chipEstado(c.diasVencida + ' días vencida', 'critico') : U.chipEstado('al corriente', 'ok')]; })) : U.nota('No hay facturas con saldo pendiente.', 'tr-ok')];
  };
  R.dispositivos = function (d, an) {
    var dias = ultDias(an, 14);
    return [U.tiles([U.tile(d.perfiles, 'Perfiles'), U.tile(d.sesiones, 'Sesiones'), U.tile(U.n(d.minutos, 1) + ' min', 'Tiempo conectado'), U.tile(U.bytes(d.bytesRx), 'Recibido'), U.tile(U.bytes(d.bytesTx), 'Enviado'), U.tile(d.conError, 'Con error', null, d.conError ? 'aviso' : '')]),
      hb(d.porTipoPerfil, 'Perfiles por tipo'), hb(d.porTipoSesion, 'Sesiones por tipo'), GR.barras({ titulo: 'Sesiones por día (14 días)', datos: dias.map(function (x) { return { etq: x.slice(5), valor: d.porDia[x] || 0 }; }), color: PAL[4], vacio: 'Sin sesiones en los últimos 14 días.' })];
  };
  R.qr = function (d) {
    return [U.tiles([U.tile(d.total, 'Códigos en el historial'), U.tile(d.creados, 'Creados'), U.tile(d.leidos, 'Leídos y guardados'), U.tile(d.lote, 'De lotes'), U.tile(d.favoritos, 'Favoritos'), U.tile(d.estilos, 'Estilos guardados')]),
      GR.dona({ titulo: 'Creados y leídos', partes: [{ etq: 'Creados', valor: d.creados, color: 'var(--g1)' }, { etq: 'Leídos', valor: d.leidos, color: 'var(--g2)' }], centro: d.total, centroEtq: 'códigos' }), hb(d.porTipo, 'Códigos por tipo'), U.nota(d.nota)];
  };
  V.dominios = function (c, sub) {
    var an = A.est.an; c.textContent = ''; if (sub) actual = sub; if (!an) { c.appendChild(U.sinDatos('Leyendo datos…')); return; }
    var lista = h('div', { cls: 'an-sub-tabs', role: 'tablist', 'aria-label': 'Dominio' }, DOMS.map(function (d) {
      var b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(d[0] === actual), tabindex: d[0] === actual ? 0 : -1, txt: d[1], 'data-dom': d[0] }); b.addEventListener('click', function () { V.dominios(c, d[0]); }); return b;
    }));
    lista.addEventListener('keydown', function (e) { var i = DOMS.map(function (d) { return d[0]; }).indexOf(actual), n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1; if (n < 0) return; e.preventDefault(); V.dominios(c, DOMS[(n + DOMS.length) % DOMS.length][0]); var b = c.querySelector('[data-dom="' + actual + '"]'); if (b) b.focus(); });
    c.appendChild(lista);
    var d = an.dom[actual], def = DOMS.filter(function (x) { return x[0] === actual; })[0], panel = h('section', { cls: 'an-dom', role: 'tabpanel' });
    if (!d || d.sinDatos) panel.appendChild(U.panel(def[1], [U.sinDatos(d && d.error ? 'No se pudo analizar (el esquema de este módulo cambió): ' + d.error : 'Sin datos: este módulo todavía no tiene registros en este dispositivo.'), h('a', { cls: 'tr-btn', href: Agg.porId(def[2]).ruta, txt: 'Abrir el módulo' })]));
    else { var piezas = [];
      try { piezas = R[actual](d, an).filter(Boolean); } catch (e) { console.warn(e); piezas = [U.nota('No se pudo dibujar este dominio (' + e.message + ').', 'tr-av')]; }
      panel.appendChild(U.panel(def[1], piezas)); }
    c.appendChild(panel);
  };
  V.dominiosSet = function (x) { if (DOMS.some(function (d) { return d[0] === x; })) actual = x; };
})(window);
