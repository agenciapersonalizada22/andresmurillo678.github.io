/* Vista «Operacion»: calendario editorial, cola y recordatorios, tablero kanban, reutilizacion cruzada, respuestas, metricas con graficas y A/B, flujos de Automatizaciones. window.COperacion */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, U = g.CUI, A = g.CApp, D = g.CDatos, PL = g.CIA.plantillas, P = g.CIA.prompts, E = g.CIA.editorial, Me = g.CIA.metricas, F = g.CIA.flujos, O = {}, sub;
  var CAN = PL.CANALES, DIAS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']], NOMDIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  function hoy() { return E.hoy(); }
  function nomCanal(id) { return CAN[id] ? CAN[id].nombre : id; }
  function chipCanal(id) { return h('span', { cls: 'tr-etiq', style: 'background:' + (CAN[id] ? CAN[id].color : '#555') + ';color:#fff', txt: nomCanal(id) }); }
  function guardar(p) { return A.guardarPieza(p); }

  /* ---------- calendario ---------- */
  function calendario(c) {
    var pr = A.proyecto, cad = pr.cadencia = pr.cadencia || {}, o = { desde: hoy(), semanas: 4 }, prev = h('div', {}), agenda = h('div', {}), canales = A.canales();
    var cfg = canales.map(function (id) {
      var k = cad[id] = cad[id] || { dias: [], hora: '18:00' };
      var chips = DIAS.map(function (d) { var ch = h('input', { type: 'checkbox', id: 'cd-' + id + d[0], 'aria-label': NOMDIA[d[0]] + ' ' + nomCanal(id) }); ch.checked = k.dias.indexOf(d[0]) >= 0; ch.addEventListener('change', function () { k.dias = DIAS.map(function (x) { return x[0]; }).filter(function (x) { return x === d[0] ? ch.checked : k.dias.indexOf(x) >= 0; }); A.guardarProyecto(); pintarAgenda(); }); return h('label', { cls: 'cia-dia', for: ch.id }, [ch, h('span', { txt: d[1], title: NOMDIA[d[0]] })]); });
      return h('div', { cls: 'cia-cad' }, [h('div', {}, [chipCanal(id)]), h('div', { cls: 'cia-dias' }, chips), U.txt(k, 'hora', 'Hora', { tipo: 'time' }, function () { A.guardarProyecto(); pintarAgenda(); })]);
    });
    c.appendChild(U.panel('Cadencia por canal', [h('p', { cls: 'tr-sub', txt: 'Elige los días y la hora en que publicas en cada canal. El planificador reparte las piezas sin fecha en esos huecos, primero las más avanzadas.' })].concat(cfg.length ? cfg : [U.vacio('Activa canales en Estrategia › Nicho.')])));
    c.appendChild(U.panel('Auto-programar', [U.fila([U.txt(o, 'desde', 'Desde', { tipo: 'date' }), U.sel([[2, '2 semanas'], [4, '4 semanas'], [8, '8 semanas'], [12, '12 semanas']], o.semanas, function (v) { o.semanas = +v; pintarAgenda(); }, 'Horizonte')]),
      U.acciones([U.btn('Previsualizar', function () { var r = plan(); prev.textContent = ''; if (!r.asignaciones.length) prev.appendChild(U.nota('No hay piezas sin fecha que asignar' + (r.sinHueco.length ? ' (' + r.sinHueco.length + ' sin hueco: define días de cadencia).' : '.'), 'tr-av')); else { prev.appendChild(h('ul', {}, r.asignaciones.map(function (a) { var p = A.pieza(a.id); return h('li', { txt: a.fecha + ' ' + a.hora + ' · ' + nomCanal(a.canal) + ' · ' + p.titulo }); }))); prev.appendChild(U.acciones([U.btn('Aplicar fechas', async function () { for (var i = 0; i < r.asignaciones.length; i++) { var a = r.asignaciones[i], p = A.pieza(a.id); p.fecha = a.fecha; p.hora = a.hora; if (p.estado === 'listo') p.estado = 'programado'; await guardar(p); } prev.textContent = ''; pintarAgenda(); T.aviso(r.asignaciones.length + ' piezas programadas.'); if (g.CuentaTrabajos) g.CuentaTrabajos.logro('calendario_planificado'); }, 'tr-pri')])); } if (r.sinHueco.length) prev.appendChild(U.nota(r.sinHueco.length + ' pieza(s) sin hueco libre en su canal.', 'tr-av')); })]), prev]));
    function plan() { return E.planificar({ piezas: A.piezas, desde: o.desde, semanas: o.semanas, cadencia: usable() }); }
    function usable() { var u = {}; canales.forEach(function (id) { if (cad[id] && cad[id].dias.length) u[id] = cad[id]; }); return u; }
    function pintarAgenda() {
      agenda.textContent = ''; var hasta = E.sumarDias(o.desde, o.semanas * 7 - 1), hu = E.huecos(usable(), o.desde, hasta), porDia = {};
      A.piezas.filter(function (p) { return p.fecha && p.fecha >= o.desde && p.fecha <= hasta; }).forEach(function (p) { (porDia[p.fecha] = porDia[p.fecha] || []).push({ p: p }); });
      hu.forEach(function (x) { var l = porDia[x.fecha] = porDia[x.fecha] || []; if (!l.some(function (y) { return y.p && y.p.canal === x.canal && y.p.hora === x.hora; })) l.push({ hueco: x }); });
      var dias = Object.keys(porDia).sort(); if (!dias.length) { agenda.appendChild(U.vacio('Nada en este periodo. Define cadencia y piezas.')); return; }
      dias.forEach(function (d) { agenda.appendChild(h('div', { cls: 'cia-dia-fila' }, [h('b', { cls: 'cia-fecha', txt: NOMDIA[E.diaSemana(d)] + ' ' + d.slice(5) }), h('div', { cls: 'cia-celdas' }, porDia[d].map(function (x) { return x.p ? h('button', { type: 'button', cls: 'cia-evt', style: 'border-left:4px solid ' + (CAN[x.p.canal] ? CAN[x.p.canal].color : '#555'), title: 'Abrir pieza', on: { click: function () { g.CProduccion.abrir(x.p.id); g.CApp.pestana('produccion'); } } }, [h('b', { txt: x.p.hora }), ' ' + x.p.titulo]) : h('span', { cls: 'cia-hueco', txt: x.hueco.hora + ' hueco libre · ' + nomCanal(x.hueco.canal) }); }))])); });
    }
    var tit = h('h3', { txt: 'Agenda' }); c.appendChild(U.panel('Agenda', [agenda]));
    c.appendChild(U.panel('Integración con el Calendario', [h('p', { cls: 'tr-sub', txt: 'Exporta las piezas con fecha en el CSV del módulo Calendario (contenido/calendario) e impórtalo allí. Canales que el Calendario no tiene (Twitch, podcast, blog, newsletter) se asignan a la red más cercana y la nota «Canal original» queda en el campo tema.' }),
      U.acciones([U.btn('Descargar CSV para el Calendario', function () { var l = A.piezas.filter(function (p) { return p.fecha; }); if (!l.length) { T.aviso('No hay piezas con fecha.', 'error'); return; } U.bajar('piezas-calendario.csv', '﻿' + g.CSV.generar(E.filasCalendario(l, A.nombreSeries())), 'text/csv'); }, 'tr-pri'), h('a', { cls: 'tr-btn', href: '../../contenido/calendario/', txt: 'Abrir Calendario' })])]));
    pintarAgenda();
  }

  /* ---------- cola y recordatorios ---------- */
  var timerRec = 0;
  O.vigilar = function () {
    clearInterval(timerRec); timerRec = setInterval(revisarRec, 30000); setTimeout(revisarRec, 1500);
  };
  async function revisarRec() {
    var l = E.recordatoriosDebidos(A.piezas, Date.now()); for (var i = 0; i < l.length; i++) { var p = l[i]; p.recordado = true; await guardar(p); aviso('Publicar pronto: ' + p.titulo, nomCanal(p.canal) + ' a las ' + p.hora); }
  }
  function aviso(t, cuerpo) { T.aviso('⏰ ' + t + ' · ' + cuerpo); try { if (g.Notification && Notification.permission === 'granted') new Notification(t, { body: cuerpo }); } catch (e) {} }
  function cola(c) {
    var cont = h('div', {}), perm = h('p', { cls: 'tr-ayuda', role: 'status', txt: g.Notification ? 'Avisos del navegador: ' + Notification.permission : 'Este navegador no admite notificaciones; se usan avisos en pantalla.' });
    c.appendChild(U.panel('Recordatorios', [h('p', { cls: 'tr-sub', txt: 'Los avisos funcionan mientras esta pestaña esté abierta. Para avisos con la pestaña cerrada o por voz, genera flujos en la pestaña «Flujos» y actívalos en Automatizaciones.' }), U.acciones([U.btn('Permitir notificaciones', function () { if (g.Notification) Notification.requestPermission().then(function (r) { perm.textContent = 'Avisos del navegador: ' + r; }); }), U.btn('Revisar ahora', function () { revisarRec().then(pint); })]), perm]));
    c.appendChild(U.panel('Cola de publicación', [cont]));
    function pint() {
      cont.textContent = ''; var l = E.cola(A.piezas, Date.now()); if (!l.length) { cont.appendChild(U.vacio('La cola está vacía: asigna fecha a una pieza (Calendario › Auto-programar) para verla aquí.')); return; }
      l.forEach(function (x) { var p = x.pieza, url = { v: p.publicadoUrl || '' };
        cont.appendChild(h('div', { cls: 'cia-tarjeta' + (x.vencida ? ' cia-venc' : '') }, [h('div', { cls: 'cia-cab' }, [h('b', { txt: p.titulo }), chipCanal(p.canal)]), h('p', { cls: 'tr-ayuda', txt: p.fecha + ' ' + p.hora + ' · ' + (x.vencida ? 'vencida hace ' + Math.abs(Math.round(x.enHoras)) + ' h' : 'en ' + (x.enHoras < 48 ? x.enHoras + ' h' : Math.round(x.enHoras / 24) + ' días')) + ' · ' + E.ESTADOS.filter(function (e) { return e[0] === p.estado; })[0][1] }),
          U.fila([U.sel(g.CIA_REC, p.recordar, function (v) { p.recordar = +v; p.recordado = false; guardar(p); }, 'Recordar'), U.txt(url, 'v', 'URL publicada (opcional)', { tipo: 'url' })]),
          U.acciones([U.btn('Marcar publicada', async function () { p.estado = 'publicado'; p.publicadoUrl = url.v; await guardar(p); pint(); T.aviso('Publicada.'); }, 'tr-pri'), U.btn('Abrir', function () { g.CProduccion.abrir(p.id); g.CApp.pestana('produccion'); })])])); });
    }
    pint();
  }
  g.CIA_REC = [[0, 'Sin recordatorio'], [10, '10 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [1440, '1 día antes']];

  /* ---------- tablero kanban ---------- */
  function tablero(c) {
    var q = { t: '' }, cols = h('div', { cls: 'cia-kanban' });
    c.appendChild(U.panel('Tablero de ideas', [h('p', { cls: 'tr-sub', txt: 'Mueve cada pieza por el proceso con las flechas (o arrastrando en escritorio).' }), h('div', { cls: 'tr-fila' }, [U.txt(q, 't', 'Nueva idea', { ph: 'Escribe una idea y pulsa Añadir' }), h('div', {}, [h('label', { txt: ' ' }), U.btn('Añadir idea', async function () { if (!q.t.trim()) return; await guardar(D.nuevaPieza(A.proyecto.id, { titulo: q.t.trim(), tema: q.t.trim(), canal: A.canales()[0] || 'youtube' })); q.t = ''; sub.refrescar(); }, 'tr-pri')])])]));
    c.appendChild(cols);
    E.ESTADOS.forEach(function (e, ci) {
      var l = A.piezas.filter(function (p) { return p.estado === e[0]; }), col = h('section', { cls: 'cia-col', 'aria-label': e[1] + ', ' + l.length + ' piezas', 'data-estado': e[0] }, [h('h3', { txt: e[1] + ' (' + l.length + ')' })]);
      col.addEventListener('dragover', function (ev) { ev.preventDefault(); }); col.addEventListener('drop', async function (ev) { ev.preventDefault(); var p = A.pieza(ev.dataTransfer.getData('text/plain')); if (p && p.estado !== e[0]) { p.estado = e[0]; await guardar(p); sub.refrescar(); } });
      if (!l.length) col.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Vacío' }));
      l.forEach(function (p) {
        var k = h('div', { cls: 'cia-card', draggable: 'true' }, [h('b', { txt: p.titulo || '(sin título)' }), h('div', { cls: 'tr-ayuda', txt: nomCanal(p.canal) + (p.fecha ? ' · ' + p.fecha : '') }), h('div', { cls: 'cia-mov' }, [ci > 0 ? U.btn('◀', async function () { p.estado = E.ESTADOS[ci - 1][0]; await guardar(p); sub.refrescar(); }, 'tr-chico') : null, U.btn('Abrir', function () { g.CProduccion.abrir(p.id); g.CApp.pestana('produccion'); }, 'tr-chico'), ci < E.ESTADOS.length - 1 ? U.btn('▶', async function () { p.estado = E.ESTADOS[ci + 1][0]; await guardar(p); sub.refrescar(); }, 'tr-chico') : null])]);
        k.querySelectorAll('button')[0] && (k.querySelectorAll('button').forEach(function (b) { var t = b.textContent; if (t === '◀') b.setAttribute('aria-label', 'Mover a ' + E.ESTADOS[ci - 1][1]); if (t === '▶') b.setAttribute('aria-label', 'Mover a ' + E.ESTADOS[ci + 1][1]); }));
        k.addEventListener('dragstart', function (ev) { ev.dataTransfer.setData('text/plain', p.id); }); col.appendChild(k);
      });
      cols.appendChild(col);
    });
  }

  /* ---------- reutilizacion cruzada ---------- */
  function reutilizar(c) {
    var o = { id: A.piezas[0] ? A.piezas[0].id : '' }, cont = h('div', {}), marcas = {};
    c.appendChild(U.panel('Un video → 10 piezas', [h('p', { cls: 'tr-sub', txt: 'Elige una pieza fuente y crea borradores derivados para otros canales. Cada borrador lleva su instrucción y queda enlazado al origen. Revisa que no se repita texto idéntico (Calidad › Originalidad).' }), A.piezas.length ? U.sel(A.piezas.map(function (p) { return [p.id, p.titulo || '(sin título)']; }), o.id, function (v) { o.id = v; pint(); }, 'Pieza fuente') : U.vacio('Crea una pieza primero.'), cont]));
    function pint() {
      cont.textContent = ''; var p = A.pieza(o.id); if (!p) return; var l = PL.reutilizar(p); marcas = {};
      l.forEach(function (d, i) { var ch = h('input', { type: 'checkbox', id: 'ru' + i }); ch.checked = A.canales().indexOf(d.canal) >= 0; marcas[i] = ch; cont.appendChild(h('label', { cls: 'tr-chk', for: ch.id }, [ch, d.titulo.split(' · ')[0] + ' — ' + nomCanal(d.canal) + (A.canales().indexOf(d.canal) < 0 ? ' (canal no activo)' : '')])); });
      cont.appendChild(U.acciones([U.btn('Crear borradores marcados', async function () { var n = 0; for (var i = 0; i < l.length; i++) if (marcas[i].checked) { await guardar(D.nuevaPieza(A.proyecto.id, l[i])); n++; } T.aviso(n + ' borradores creados en el tablero.'); sub.ir('tablero'); }, 'tr-pri'), U.iaBtn('Proponer derivados con IA', async function () { var r = await A.ia(P.reutilizar({ guion: p.texto != null ? p.texto : D.guion(p), titulo: p.titulo }, 10)), li = P.parsear.piezas(r.json); if (!li.length) throw new Error('La IA no devolvió piezas utilizables.'); for (var i = 0; i < li.length; i++) await guardar(D.nuevaPieza(A.proyecto.id, { titulo: li[i].titulo, formato: li[i].formato, canal: CAN[li[i].canal] ? li[i].canal : A.canales()[0] || 'youtube', origen: p.id, tema: li[i].enfoque })); T.aviso(li.length + ' derivados añadidos.'); sub.ir('tablero'); })]));
    }
    pint();
  }

  /* ---------- respuestas ---------- */
  function respuestas(c) {
    var v = { nombre: '', respuesta: '', enlace: '', punto: '', contacto: '', tema: '', dia: '', partes: 'el guion y las imágenes', cat: '', coment: '', tono: 'cercano' }, cont = h('div', {}), ia = h('div', {}), n = { nombre: '', cat: 'Personalizada', texto: '' };
    function todas() { return PL.RESPUESTAS.concat(A.respuestas.map(function (r) { return { cat: r.cat, nombre: r.nombre, texto: r.texto, id: r.id }; })); }
    function pint() {
      cont.textContent = ''; todas().filter(function (r) { return !v.cat || r.cat === v.cat; }).forEach(function (r) { var t = PL.rellenar(r.texto, v); cont.appendChild(h('div', { cls: 'cia-tarjeta' }, [h('div', { cls: 'cia-cab' }, [h('b', { txt: r.nombre }), U.etiqueta(r.cat)]), h('p', { txt: t }), U.acciones([U.copiarBtn(t), r.id ? U.btn('Borrar', async function () { await A.borrarCol('respuestas', r.id); pint(); }, 'tr-chico tr-peli') : null])])); });
    }
    var cats = [['', 'Todas']].concat(Object.keys(todas().reduce(function (a, r) { a[r.cat] = 1; return a; }, {})).map(function (k) { return [k, k]; }));
    c.appendChild(U.panel('Plantillas de respuesta', [U.sel(cats, v.cat, function (x) { v.cat = x; pint(); }, 'Categoría'), U.fila([U.txt(v, 'nombre', 'Nombre del seguidor', {}, pint), U.txt(v, 'punto', 'Punto a tratar', {}, pint), U.txt(v, 'respuesta', 'Respuesta breve', {}, pint)]), U.fila([U.txt(v, 'enlace', 'Enlace', {}, pint), U.txt(v, 'contacto', 'Contacto', {}, pint), U.txt(v, 'tema', 'Próximo tema', {}, pint)]), cont]));
    c.appendChild(U.panel('Redactar con IA', [U.txt(v, 'coment', 'Comentario recibido', { area: true, filas: 3 }), U.txt(v, 'tono', 'Tono', {}), U.acciones([U.iaBtn('Proponer respuesta', async function () { if (!v.coment.trim()) throw new Error('Pega el comentario.'); var r = await A.ia(P.respuesta(v.coment, v.tono)); ia.textContent = ''; ia.appendChild(h('pre', { cls: 'cia-pre', txt: r.texto.trim() })); ia.appendChild(U.copiarBtn(r.texto.trim())); })]), ia, h('p', { cls: 'tr-ayuda', txt: 'Revisa cada respuesta antes de publicarla: responder en automático a muchos usuarios puede infringir las normas de la plataforma.' })]));
    c.appendChild(U.panel('Tu propia plantilla', [U.txt(n, 'nombre', 'Nombre', {}), U.txt(n, 'cat', 'Categoría', {}), U.txt(n, 'texto', 'Texto (usa {nombre}, {respuesta}, {enlace}, {punto}, {contacto}, {tema})', { area: true, filas: 3 }), U.acciones([U.btn('Guardar plantilla', async function () { if (!n.nombre.trim() || !n.texto.trim()) { T.aviso('Nombre y texto son obligatorios.', 'error'); return; } await A.guardarCol('respuestas', Object.assign({}, n)); n.nombre = ''; n.texto = ''; sub.refrescar(); })])]));
    pint();
  }

  /* ---------- metricas ---------- */
  var COL = { seg: '#3e63dd', vis: '#2b8a3e', ing: '#e8590c' };
  function metricas(c) {
    var canales = A.canales().length ? A.canales() : Object.keys(CAN), r = { fecha: hoy(), canal: canales[0], seguidores: '', vistas: '', ingresos: '', nota: '' }, vista = { canal: '' }, graf = h('div', {});
    c.appendChild(U.panel('Anotar métricas', [h('p', { cls: 'tr-sub', txt: 'Introduce a mano los datos que ves en el panel de cada plataforma (seguidores totales, vistas del periodo, ingresos). Nada se descarga solo.' }), U.fila([U.txt(r, 'fecha', 'Fecha', { tipo: 'date' }), U.sel(canales.map(function (k) { return [k, nomCanal(k)]; }), r.canal, function (x) { r.canal = x; }, 'Canal')]), U.fila([U.txt(r, 'seguidores', 'Seguidores (total)', { tipo: 'number', min: 0 }), U.txt(r, 'vistas', 'Vistas del periodo', { tipo: 'number', min: 0 }), U.txt(r, 'ingresos', 'Ingresos (moneda propia)', { tipo: 'number', min: 0, paso: '0.01' })]), U.txt(r, 'nota', 'Nota', {}),
      U.acciones([U.btn('Guardar registro', async function () { if (!r.fecha) { T.aviso('Falta la fecha.', 'error'); return; } if (r.seguidores === '' && r.vistas === '' && r.ingresos === '') { T.aviso('Escribe al menos un valor.', 'error'); return; } await A.guardarCol('metricas', Object.assign({}, r)); r.seguidores = r.vistas = r.ingresos = ''; r.nota = ''; sub.refrescar(); if (g.CuentaTrabajos) g.CuentaTrabajos.logro('metricas_registradas'); }, 'tr-pri')])]));
    var todos = A.metricas, crec = h('div', {});
    c.appendChild(U.panel('Crecimiento', [U.sel([['', 'Todos los canales']].concat(canales.map(function (k) { return [k, nomCanal(k)]; })), vista.canal, function (x) { vista.canal = x; pintar(); }, 'Ver'), crec, graf]));
    function pintar() {
      crec.textContent = ''; graf.textContent = ''; var cn = vista.canal || null, sSeg = Me.serieSeguidores(todos, cn), cr = Me.crecimiento(sSeg, 30);
      if (!cr.ok) crec.appendChild(U.nota(cr.motivo + ' Añade registros de seguidores en fechas distintas.', 'tr-av'));
      else crec.appendChild(h('div', { cls: 'vi-stats' }, [['Inicio → ahora', cr.inicio + ' → ' + cr.fin], ['Cambio', (cr.delta >= 0 ? '+' : '') + cr.delta + (cr.pct != null ? ' (' + cr.pct + ' %)' : '')], ['Por semana', cr.porSemana], ['Tendencia/día', cr.tendenciaDia], ['Ajuste lineal R²', cr.r2], ['En ' + cr.horizonte + ' días (estimado)', cr.proyeccion]].map(function (x) { return h('div', { cls: 'vi-stat' }, [h('span', { txt: x[0] }), h('b', { txt: String(x[1]) })]); })));
      if (cr.ok && cr.r2 < 0.5) crec.appendChild(U.nota('El ajuste lineal es débil (R² bajo): la estimación a 30 días es orientativa, no una promesa.', 'tr-av'));
      var cv1 = h('canvas', { role: 'img', 'aria-label': 'Gráfica de seguidores' }), s1 = [{ nombre: 'Seguidores', color: COL.seg, puntos: sSeg }];
      if (cr.ok) { var u = sSeg[sSeg.length - 1]; s1[0].proy = [{ fecha: E.sumarDias(u.fecha, 30), valor: cr.proyeccion }]; }
      graf.appendChild(h('h3', { txt: 'Seguidores' + (cr.ok ? ' (línea de puntos: estimación a 30 días)' : '') })); graf.appendChild(h('div', { cls: 'cia-graf' }, [cv1]));
      var sV = Me.serie(todos, 'vistas', cn), cv2 = h('canvas', { role: 'img', 'aria-label': 'Gráfica de vistas' }); graf.appendChild(h('h3', { txt: 'Vistas por registro' })); graf.appendChild(h('div', { cls: 'cia-graf' }, [cv2]));
      var sI = Me.serie(todos, 'ingresos', cn).slice(-12), cv3 = h('canvas', { role: 'img', 'aria-label': 'Gráfica de ingresos' }); graf.appendChild(h('h3', { txt: 'Ingresos por registro' })); graf.appendChild(h('div', { cls: 'cia-graf' }, [cv3]));
      setTimeout(function () { g.CGraf.linea(cv1, s1, { alto: 220 }); g.CGraf.linea(cv2, [{ nombre: 'Vistas', color: COL.vis, puntos: sV }], { alto: 200, cero: true }); g.CGraf.barras(cv3, sI.map(function (x) { return { etq: x.fecha.slice(5), valor: x.valor, color: COL.ing }; }), { alto: 190 }); }, 0);
      graf.appendChild(h('details', {}, [h('summary', { txt: 'Ver datos como tabla' }), g.CGraf.tabla(['Fecha', 'Canal', 'Seguidores', 'Vistas', 'Ingresos', 'Nota'], todos.filter(function (x) { return !cn || x.canal === cn; }).map(function (x) { return [x.fecha, nomCanal(x.canal), x.seguidores, x.vistas, x.ingresos, x.nota || '']; }))]));
    }
    pintar();
    var res = Me.resumenPorCanal(todos);
    c.appendChild(U.panel('Resumen por canal', [res.length ? g.CGraf.tabla(['Canal', 'Seguidores', 'Vistas', 'Ingresos', 'RPM'], res.map(function (x) { return [nomCanal(x.canal), x.seguidores == null ? '—' : x.seguidores, x.vistas, x.ingresos, x.rpm]; })) : U.vacio('Sin registros.'), U.acciones([U.btn('Descargar registros (CSV)', function () { U.bajar('metricas.csv', '\ufeff' + g.CSV.generar(todos, ['fecha', 'canal', 'seguidores', 'vistas', 'ingresos', 'nota']), 'text/csv'); }), todos.length ? U.btn('Borrar último registro', async function () { await A.borrarCol('metricas', todos[todos.length - 1].id); sub.refrescar(); }, 'tr-peli') : null])]));
    ab(c);
  }
  function ab(c) {
    var o = { id: '' }, libre = [{ nombre: 'Título A', impresiones: '', clics: '' }, { nombre: 'Título B', impresiones: '', clics: '' }], cont = h('div', {}), res = h('div', { role: 'status' });
    var conAb = A.piezas.filter(function (p) { return p.ab && p.ab.length; });
    function vars() { var p = A.pieza(o.id); return p ? p.ab : libre; }
    function pint() {
      cont.textContent = ''; var v = vars(); v.forEach(function (x, i) { cont.appendChild(h('div', { cls: 'cia-item' }, [U.fila([U.txt(x, 'nombre', 'Variante ' + (i + 1), {}, guardaAb), U.txt(x, 'impresiones', 'Impresiones', { tipo: 'number', min: 0 }, guardaAb), U.txt(x, 'clics', 'Clics', { tipo: 'number', min: 0 }, guardaAb)]), U.btn('Quitar', function () { v.splice(i, 1); guardaAb(); pint(); }, 'tr-chico tr-peli')])); });
      if (v.length < 4) cont.appendChild(U.btn('Añadir variante', function () { v.push({ nombre: 'Variante ' + (v.length + 1), impresiones: '', clics: '' }); pint(); }, 'tr-chico')); calc();
    }
    function guardaAb() { var p = A.pieza(o.id); if (p) guardar(p); calc(); }
    function calc() {
      res.textContent = ''; var r = Me.ab(vars()); if (!r.ok) { res.appendChild(U.nota(r.motivo, 'tr-av')); return; }
      res.appendChild(g.CGraf.tabla(['Variante', 'Impresiones', 'Clics', 'CTR', 'IC 95 %'], r.variantes.map(function (x) { return [x.nombre, x.impresiones, x.clics, (x.ctr * 100).toFixed(2) + ' %', (x.ic[0] * 100).toFixed(1) + '–' + (x.ic[1] * 100).toFixed(1) + ' %']; })));
      res.appendChild(U.nota(r.significativo ? 'Ganador: «' + r.ganador + '» (+' + r.mejoraRelativa + ' % frente a «' + r.segundo + '», p = ' + r.p + '). Diferencia estadísticamente significativa al 95 %.' : 'Aún no hay ganador claro: «' + r.ganador + '» va por delante pero p = ' + r.p + ' (≥ 0,05). ' + (r.necesarias ? 'Para detectar una mejora del 20 % harían falta ≈ ' + r.necesarias + ' impresiones por variante.' : ''), r.significativo ? 'tr-ok' : 'tr-av'));
    }
    c.appendChild(U.panel('Test A/B de títulos y miniaturas', [h('p', { cls: 'tr-sub', txt: 'Copia las impresiones y los clics de cada variante desde el panel de la plataforma (p. ej. «Probar y comparar» de YouTube). Se usa un contraste de dos proporciones; no pares la prueba en cuanto veas un ganador provisional.' }), U.sel([['', '(prueba libre)']].concat(conAb.map(function (p) { return [p.id, p.titulo]; })), o.id, function (v) { o.id = v; pint(); }, 'Pieza con variantes (desde Producción › Títulos › A/B)'), cont, res])); pint();
  }

  /* ---------- flujos para Automatizaciones ---------- */
  function flujos(c) {
    var pr = A.proyecto, cont = h('div', {}), o = { antes: 30, hora: '08:00', dia: 1 }, nota = h('p', { cls: 'tr-ayuda', role: 'status' });
    function construir() {
      var canales = A.canales().filter(function (id) { return pr.cadencia && pr.cadencia[id] && pr.cadencia[id].dias.length; }).map(function (id) { return { id: id, nombre: nomCanal(id), cadencia: pr.cadencia[id], checklist: PL.checklist(id).slice(0, 5) }; });
      var l = F.todos({ canales: canales, piezas: A.piezas.filter(function (p) { return p.fecha; }), antes: +o.antes, horaResumen: o.hora, diaMetricas: +o.dia });
      l.push(F.ideasSemanales(pr.nicho.tema, D.ajustes().proveedor, D.ajustes().modelo)); A.piezas.filter(function (p) { return p.fecha && p.estado !== 'publicado' && p.fecha >= hoy(); }).slice(0, 5).forEach(function (p) { l.push(F.recordatorioPieza(p, +o.antes, nomCanal(p.canal))); });
      return l;
    }
    function pint() {
      cont.textContent = ''; var l = construir(); var cat = g.AutoCatalogo;
      l.forEach(function (f) {
        var errs = F.validar(f, cat), json = JSON.stringify(f, null, 2), res = h('div', { role: 'status' });
        cont.appendChild(h('div', { cls: 'cia-tarjeta' }, [h('div', { cls: 'cia-cab' }, [h('b', { txt: f.nombre }), U.etiqueta(f.nodos.length + ' nodos', null)]), errs.length ? U.nota('Flujo inválido: ' + errs.join('; '), 'tr-mal') : h('p', { cls: 'tr-ayuda', txt: f.nodos.map(function (n) { return n.tipo; }).join(' → ') }),
          U.acciones([U.btn('Añadir a Automatizaciones', async function () { var n = g.AutoDatos.normalizar(f, f.nombre); await g.AutoDatos.guardarFlujo(n); T.aviso('Añadido (desactivado). Ábrelo en Automatizaciones para activarlo.'); if (g.CuentaTrabajos) g.CuentaTrabajos.logro('flujo_exportado'); }, 'tr-pri'), U.btn('Simular', async function () { var r = await g.AutoMotor.ejecutar(g.AutoDatos.normalizar(f), { catalogo: cat, simulacion: true }); res.textContent = ''; res.appendChild(U.nota('Simulación: ' + r.estado + ' · ' + r.pasos.length + ' pasos (' + r.pasos.map(function (p) { return p.tipo; }).join(', ') + ')', r.estado === 'error' ? 'tr-mal' : 'tr-ok')); }), U.btn('Descargar JSON', function () { U.bajar(T.nombreArchivo(f.nombre) + '.json', json, 'application/json'); })]), res,
          h('details', {}, [h('summary', { txt: 'Ver JSON' }), h('pre', { cls: 'cia-pre', txt: json })])]));
      });
      nota.textContent = l.length + ' flujos generados. Los de aviso por canal usan la cadencia de la pestaña Calendario.';
    }
    c.appendChild(U.panel('Generar flujos', [h('p', { cls: 'tr-sub', txt: 'Crea flujos compatibles con el módulo Automatizaciones: avisos por canal, resumen diario de la cola, recordatorio de métricas, ideas semanales y avisos por pieza. Se guardan desactivados; los activas tú. Las claves de IA de Automatizaciones son suyas (secretos propios): este estudio nunca las comparte.' }), U.fila([U.txt(o, 'antes', 'Avisar minutos antes', { tipo: 'number', min: 0 }), U.txt(o, 'hora', 'Hora del resumen diario', { tipo: 'time' }), U.sel(DIAS.map(function (d) { return [d[0], NOMDIA[d[0]]]; }), o.dia, function (v) { o.dia = v; }, 'Día de recordatorio de métricas')]),
      U.acciones([U.btn('Regenerar', pint), U.btn('Descargar todos (ZIP)', function () { var l = construir(); T.descargar(T.zip(l.map(function (f, i) { return { nombre: (i + 1) + '-' + T.nombreArchivo(f.nombre) + '.json', datos: T.bytes(JSON.stringify(f, null, 2)) }; })), 'flujos-contenido-ia.zip'); }), h('a', { cls: 'tr-btn', href: '../automatizaciones/', txt: 'Abrir Automatizaciones' })]), nota]));
    c.appendChild(cont); pint();
  }
  O.iniciar = function (cont) {
    sub = O.sub = U.subpestanas(cont, 'Secciones de operación', [['calendario', 'Calendario', calendario], ['cola', 'Cola', cola], ['tablero', 'Tablero', tablero], ['reutilizar', 'Reutilizar', reutilizar], ['respuestas', 'Respuestas', respuestas], ['metricas', 'Métricas', metricas], ['flujos', 'Flujos', flujos]]);
    A.on('proyecto', function () { sub.refrescar(); }); O.vigilar();
  };
  g.COperacion = O;
})(window);
