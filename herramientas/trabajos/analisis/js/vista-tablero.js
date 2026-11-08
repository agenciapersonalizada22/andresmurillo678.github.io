/* Vista Tablero ejecutivo: actividad por modulo, uso en el tiempo, almacenamiento y sincronizacion. window.AnaV.tablero */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, Agg = g.AnaAgg, GR = g.AnaGraf, V = g.AnaV = g.AnaV || {};
  var NIV = { ok: 'ok', aviso: 'aviso', critico: 'critico', desconocido: 'ok' };
  var ESTADO_SYNC = { alDia: ['Al día', 'ok'], pendiente: ['Pendiente', 'aviso'], nunca: ['Sin sincronizar', 'aviso'], sinSesion: ['Sin sesión', 'aviso'], local: ['Solo local', 'ok'], sinDatos: ['Sin datos', 'ok'] };
  var filtroMod = '';
  V.alertasLista = function (an, ei) {
    var l = [];
    an.alertas.forEach(function (a) { l.push({ nivel: a.nivel, txt: 'Meta: ' + a.texto }); });
    an.recomendaciones.filter(function (r) { return r.nivel === 'alta'; }).slice(0, 4).forEach(function (r) { l.push({ nivel: 'alta', txt: r.titulo + ': ' + r.evidencia.map(function (e) { return e.etq + ' ' + e.valor; }).join(', ') }); });
    an.cuota.avisos.forEach(function (a) { if (an.cuota.nivel !== 'desconocido') l.push({ nivel: an.cuota.nivel === 'critico' ? 'alta' : 'media', txt: a }); });
    if (ei && ei.altas) l.push({ nivel: 'media', txt: 'Integridad: ' + ei.altas + ' problema(s) grave(s) en los datos (pestaña Salud).' });
    return l;
  };
  V.tablero = function (c) {
    var e = A.est, an = e.an; c.textContent = '';
    if (!an) { c.appendChild(U.sinDatos(e.error || 'Leyendo datos…')); return; }
    var conDatos = an.resumen.filter(function (m) { return !m.sinDatos; }).length, tot = an.resumen.reduce(function (a, m) { return a + m.registros; }, 0);
    c.appendChild(h('div', { cls: 'tr-acciones an-barra' }, [
      h('span', { cls: 'an-hora', txt: 'Leído ' + U.hace(e.datos.ahora) + ' · solo lectura, en este dispositivo' }),
      U.btn('Actualizar', function () { A.cargar(); }, 'tr-chico', 'btn-actualizar'),
      U.btn('CSV del tablero', function () { T.descargar(new Blob([g.AnaInforme.aCSV(an, A.modelo(g.AnaDatos.ajustes().periodo))], { type: 'text/csv;charset=utf-8' }), 'tablero_trabajos.csv'); A.logro('analisis_exporto_tablero'); }, 'tr-chico', 'btn-csv'),
      U.btn('JSON del tablero', function () { T.descargar(new Blob([g.AnaInforme.aJSON(an, A.modelo(g.AnaDatos.ajustes().periodo))], { type: 'application/json' }), 'tablero_trabajos.json'); A.logro('analisis_exporto_tablero'); }, 'tr-chico', 'btn-json')]));
    var al = V.alertasLista(an, e.integridad);
    c.appendChild(U.panel('Alertas', al.length ? al.map(function (a) { return U.nota(a.txt, a.nivel === 'alta' ? 'tr-mal' : 'tr-av'); }) : [U.nota('Sin alertas: tus metas se cumplen y no hay avisos de cuota ni de datos.', 'tr-ok')], { cls: 'an-alertas' }));
    c.appendChild(U.tiles([U.tile(conDatos + ' / ' + an.resumen.length, 'Módulos con datos'), U.tile(U.n(tot, 0), 'Registros locales'), U.tile(an.cuota.pct == null ? '—' : U.pct(an.cuota.pct), 'Cuota usada', U.bytes(an.cuota.uso || an.cuota.medido), NIV[an.cuota.nivel] === 'ok' ? '' : NIV[an.cuota.nivel]), U.tile(U.n(an.uso.suma, 0), 'Cambios en 30 días')]));
    /* actividad por modulo */
    var maxB = Math.max.apply(null, an.resumen.map(function (m) { return m.bytes; }).concat([1]));
    c.appendChild(U.panel('Actividad por módulo', [h('ul', { cls: 'an-mods' }, an.resumen.map(function (m) {
      var d = Agg.porId(m.id), nom = { historial: 'códigos', perfiles: 'perfiles', proyectos: 'proyectos', flujos: 'flujos', movimientos: 'movimientos' }[m.principal] || m.principal;
      return h('li', { cls: 'an-mod', style: '--c:' + m.color }, [
        h('div', { cls: 'an-mod-t' }, [h('i', { 'aria-hidden': 'true' }), h('b', { txt: m.nombre }), m.sinDatos ? U.chipEstado('Sin datos', 'ok') : null, h('a', { cls: 'an-abrir', href: d.ruta, txt: 'Abrir', 'aria-label': 'Abrir ' + m.nombre })]),
        m.sinDatos ? h('p', { cls: 'an-sub', txt: m.error ? 'No se pudo leer: ' + m.error : m.existe ? 'Base creada, sin registros.' : 'Aún no se usa en este dispositivo.' })
          : h('p', { cls: 'an-sub', txt: U.n(m.proyectos, 0) + ' ' + nom + ' · ' + U.n(m.registros, 0) + ' registros · última modificación ' + U.hace(m.ultima) + ' · ' + U.bytes(m.bytes) }),
        m.sinDatos ? null : h('div', { cls: 'an-minib', 'aria-hidden': 'true' }, [h('i', { style: 'width:' + Math.max(2, 100 * m.bytes / maxB).toFixed(1) + '%' })])]);
    }))]));
    /* uso en el tiempo */
    var sel = h('select', { id: 'sel-uso', 'aria-label': 'Módulo para la gráfica de uso' }, [h('option', { value: '', txt: 'Todos los módulos' })].concat(Agg.MODULOS.map(function (d) { return h('option', { value: d.id, txt: d.nombre }); })));
    sel.value = filtroMod; var graf = h('div', {});
    function pintarUso() { filtroMod = sel.value; var s = filtroMod ? an.uso.porModulo[filtroMod] : an.uso.total, col = filtroMod ? Agg.porId(filtroMod).color : null; graf.textContent = ''; graf.appendChild(GR.barras({ titulo: 'Registros creados o editados por día (últimos 30 días)', datos: an.uso.dias.map(function (d, i) { return { etq: d.slice(5), valor: s[i] }; }), color: col, alto: 150, vacio: 'Sin cambios en los últimos 30 días.' })); }
    sel.addEventListener('change', pintarUso); pintarUso();
    c.appendChild(U.panel('Uso en el tiempo', [h('label', { for: 'sel-uso', txt: 'Mostrar' }), sel, graf]));
    /* almacenamiento */
    var q = an.cuota, mid = [];
    if (q.pct != null) mid.push(h('p', { cls: 'an-sub', txt: U.bytes(q.uso) + ' de ' + U.bytes(q.cuota) + ' (' + U.pct(q.pct) + ') usados por este sitio en tu navegador.' }), GR.medidor(q.pct, NIV[q.nivel], 'Uso de la cuota del navegador'));
    else mid.push(U.nota(q.avisos[0], 'tr-av'));
    if (e.datos.persistente === false) mid.push(U.nota('El almacenamiento no es persistente: el navegador podría borrarlo si falta espacio. Instala la página o concede «almacenamiento persistente» y exporta respaldos.', 'tr-av'));
    q.avisos.forEach(function (a) { if (q.pct != null) mid.push(U.nota(a, q.nivel === 'critico' ? 'tr-mal' : 'tr-av')); });
    mid.push(GR.hbarras({ titulo: 'Datos medidos por módulo (≈ tamaño de los registros)', items: q.porModulo.filter(function (p) { return p.bytes > 0; }).sort(function (a, b) { return b.bytes - a.bytes; }).map(function (p) { return { etq: p.nombre, valor: p.bytes, color: p.color, texto: U.bytes(p.bytes) + ' · ' + U.pct(p.pct) }; }), vacio: 'Aún no hay datos medidos.' }));
    c.appendChild(U.panel('Almacenamiento', mid));
    /* sincronizacion */
    var u = g.Cuenta && g.Cuenta.usuario, hay = an.sincro.filter(function (s) { return s.estado !== 'sinDatos'; });
    c.appendChild(U.panel('Sincronización con la cuenta', [u ? U.nota('Sesión: ' + (u.nombre || u.usuario) + (g.Cuenta.demo ? ' (modo demo, solo este dispositivo)' : '') + '.', 'tr-ok') : U.nota('Sin sesión iniciada: nada se sincroniza.', 'tr-av')].concat(hay.length ? [U.tabla(['Módulo', 'Estado', 'Última', 'Pendientes', 'Borrados'], hay.map(function (s) { var es = ESTADO_SYNC[s.estado] || ['—', 'ok']; return [s.nombre, U.chipEstado(es[0], es[1]), s.ultima ? U.hace(s.ultima) : 'nunca', s.pendientes, s.conflictos.length ? s.conflictos.length + ' (' + s.conflictos.map(function (x) { return x.gana; }).join(', ') + ')' : '0']; }))] : [U.sinDatos('Ningún módulo tiene datos que sincronizar.')]).concat([h('p', { cls: 'tr-ayuda', txt: 'Pendientes = registros modificados después de la última sincronización de ese módulo. «Borrados» = registros con una marca de borrado pendiente; gana siempre el cambio más reciente.' })])));
  };
})(window);
