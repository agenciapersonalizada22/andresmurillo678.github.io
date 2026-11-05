/* Campanas y series, plan de 30 dias, horarios, datos/ajustes, exportar e importar. */
(function () {
  var $ = U.$, esc = U.esc, A = App, M = Modelo, F = Fechas, sel = { camp: null }, prev = [], impCsv = null;
  function campo(id, et, v, tipo) { return '<label for="' + id + '">' + et + '</label><input type="' + (tipo || 'text') + '" id="' + id + '" value="' + esc(v || '') + '">'; }

  function campanas() {
    var v = $('#v-campanas'), c = A.est.campanas.filter(function (x) { return x.id === sel.camp; })[0] || { color: '#0b8f84', tipo: 'campana' };
    v.innerHTML = '<div class="cols dos"><div class="panel"><h2>Campañas y series</h2><ul class="lista">' + (A.est.campanas.map(function (x) {
      var l = A.est.pubs.filter(function (p) { return p.campana === x.id || p.serie === x.id; }), pb = l.filter(function (p) { return p.estado === 'publicado'; }).length;
      return '<li class="item" style="border-left:6px solid ' + esc(x.color) + '"><div class="grow"><b>' + esc(x.nombre) + '</b><span class="suave">' + (x.tipo === 'serie' ? 'Serie' : 'Campaña') + (x.inicio ? ' · ' + x.inicio : '') + (x.fin ? ' → ' + x.fin : '') + ' · ' + pb + '/' + l.length + ' publicadas</span><div class="barra-p"><i style="width:' + (l.length ? pb / l.length * 100 : 0) + '%"></i></div></div><button class="btn peq" data-e="' + x.id + '">Editar</button></li>';
    }).join('') || '<li class="suave">Crea una campaña (acción con fechas) o una serie (formato que se repite) y asígnala a tus publicaciones.</li>') + '</ul><button class="btn pri" id="c-nueva" style="margin-top:.7rem">+ Nueva</button></div>' +
      '<form class="panel" id="c-form"><h2>' + (c.id ? 'Editar' : 'Nueva') + '</h2>' + campo('cf-nombre', 'Nombre', c.nombre) + '<label for="cf-tipo">Tipo</label><select id="cf-tipo"><option value="campana"' + (c.tipo !== 'serie' ? ' selected' : '') + '>Campaña</option><option value="serie"' + (c.tipo === 'serie' ? ' selected' : '') + '>Serie</option></select><label for="cf-color">Color</label><input type="color" id="cf-color" value="' + esc(c.color) + '" style="min-height:44px;padding:2px">' +
      '<div class="fila"><div class="grow">' + campo('cf-ini', 'Inicio', c.inicio, 'date') + '</div><div class="grow">' + campo('cf-fin', 'Fin', c.fin, 'date') + '</div></div><label for="cf-desc">Descripción / objetivo</label><textarea id="cf-desc" rows="3">' + esc(c.descripcion || '') + '</textarea><div class="fila" style="margin-top:1rem"><button class="btn pri" type="submit">Guardar</button>' + (c.id ? '<button type="button" class="btn mal" id="c-del">Eliminar</button><button type="button" class="btn" id="c-ver">Ver en calendario</button>' : '') + '</div></form></div>';
    v.onclick = function (e) {
      var ed = e.target.closest('[data-e]'); if (ed) { sel.camp = ed.dataset.e; campanas(); }
      if (e.target.id === 'c-nueva') { sel.camp = null; campanas(); $('#cf-nombre').focus(); }
      if (e.target.id === 'c-del' && confirm('¿Eliminar? Las publicaciones se conservan sin campaña.')) { var id = sel.camp; Promise.all(A.est.pubs.filter(function (p) { return p.campana === id || p.serie === id; }).map(function (p) { if (p.campana === id) p.campana = ''; if (p.serie === id) p.serie = ''; return A.guardar('pubs', p); })).then(function () { return A.borrar('campanas', id); }).then(function () { sel.camp = null; campanas(); }); }
      if (e.target.id === 'c-ver') { A.filtros.campana = sel.camp; A.vista('calendario'); }
    };
    $('#c-form').onsubmit = function (e) {
      e.preventDefault(); var o = Object.assign({}, c, { nombre: $('#cf-nombre').value.trim(), tipo: $('#cf-tipo').value, color: $('#cf-color').value, inicio: $('#cf-ini').value, fin: $('#cf-fin').value, descripcion: $('#cf-desc').value });
      if (!o.nombre) return U.toast('Escribe un nombre'); A.guardar('campanas', o).then(function () { sel.camp = o.id; campanas(); U.toast('Guardado'); });
    };
  }

  function plan() {
    var v = $('#v-plan'), lunes = F.sumarDias(F.hoy(), 7 - F.dow(F.hoy()));
    v.innerHTML = '<div class="cols dos"><form class="panel" id="p-form"><h2>Plan de 30 días</h2><p class="suave">Genera una plantilla de contenido por reglas (pilares: educativo, entretenimiento, inspiración, detrás de cámaras, promoción suave, comunidad, opinión). Todo queda en estado «Idea» para que lo adaptes.</p>' + campo('pl-nicho', 'Nicho o tema', '') + '<label>Redes</label><div class="fila">' + Object.keys(M.REDES).map(function (k) { return '<label class="chk"><input type="checkbox" name="pl-red" value="' + k + '"' + (k === 'instagram' || k === 'tiktok' ? ' checked' : '') + '>' + M.REDES[k].nombre + '</label>'; }).join('') + '</div>' + campo('pl-ini', 'Primer día', lunes, 'date') + '<label for="pl-cada">Frecuencia</label><select id="pl-cada"><option value="1">Todos los días</option><option value="2" selected>Cada 2 días</option><option value="3">Cada 3 días</option><option value="7">Una vez por semana</option></select><div class="fila" style="margin-top:1rem"><button class="btn pri" type="submit">Vista previa</button></div></form><div class="panel" id="pl-prev"><p class="suave">La vista previa aparecerá aquí.</p></div></div>';
    $('#p-form').onsubmit = function (e) {
      e.preventDefault(); var n = $('#pl-nicho').value.trim(); if (!n) return U.toast('Escribe un nicho');
      var redes = U.$$('input[name=pl-red]:checked').map(function (i) { return i.value; }); if (!redes.length) return U.toast('Elige al menos una red');
      prev = Plan.plan30({ nicho: n, redes: redes, inicio: $('#pl-ini').value || lunes, cadaDias: +$('#pl-cada').value, horarios: A.est.ajustes.horarios, zona: '' }); mostrarPrev();
    };
  }
  function mostrarPrev() {
    $('#pl-prev').innerHTML = '<h3>' + prev.length + ' publicaciones propuestas</h3><div class="scroll-x" style="max-height:55vh;overflow:auto"><table><thead><tr><th></th><th>Fecha</th><th>Red</th><th>Idea</th></tr></thead><tbody>' + prev.map(function (p, i) { return '<tr><td><input type="checkbox" data-i="' + i + '" checked aria-label="Incluir"></td><td>' + A.fechaLegible(p.fecha) + ' ' + p.hora + '</td><td>' + M.REDES[p.red].nombre + '</td><td>' + esc(p.titulo) + '</td></tr>'; }).join('') + '</tbody></table></div><button class="btn pri" id="pl-add" style="margin-top:.8rem">Añadir al calendario</button>';
    $('#pl-add').onclick = function () {
      var l = U.$$('#pl-prev input[data-i]:checked').map(function (c) { return prev[+c.dataset.i]; }); Promise.all(l.map(function (p) { return A.guardar('pubs', p); })).then(function () { prev = []; U.toast(l.length + ' publicaciones añadidas'); A.cal.ref = l[0] ? l[0].fecha : A.cal.ref; A.vista('calendario'); });
    };
  }

  function horarios() {
    var v = $('#v-horarios'), pubs = A.est.pubs;
    v.innerHTML = '<div class="panel"><h2>Mejores horarios</h2><div class="aviso">Son puntos de partida editables y genéricos, no datos oficiales de ninguna plataforma. Lo que mejor funciona depende de tu audiencia: compáralo con tus propias métricas.</div></div><div class="cols iguales" style="margin-top:1rem">' + Object.keys(M.REDES).map(function (r) {
      var l = A.horarios(r), top = Metricas.mejoresHoras(pubs, r, 'vistas', 1);
      return '<div class="panel" data-r="' + r + '" style="border-top:4px solid ' + M.REDES[r].color + '"><h3>' + M.REDES[r].nombre + '</h3>' + l.map(function (h, i) { return '<div class="fila" style="margin:.3rem 0"><select data-i="' + i + '" data-c="d" aria-label="Día" style="width:auto">' + F.DIAS.map(function (d, k) { return '<option value="' + k + '"' + (k === h[0] ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select><input type="time" data-i="' + i + '" data-c="h" value="' + h[1] + '" style="width:auto" aria-label="Hora"><button class="btn peq mal" data-x="' + i + '" aria-label="Quitar">✕</button></div>'; }).join('') +
        '<div class="fila"><button class="btn peq" data-add>+ Horario</button><button class="btn peq" data-def>Restaurar</button></div>' + (top.length ? '<p class="suave" style="margin-top:.6rem">Según tus datos (más vistas promedio): ' + top.map(function (t) { return t.clave + ' (' + t.n + ')'; }).join(', ') + '</p>' : '<p class="suave" style="margin-top:.6rem">Cuando registres métricas verás aquí tus horas con más vistas.</p>') + '</div>';
    }).join('') + '</div>';
    function guardar(r, l) { A.est.ajustes.horarios[r] = l; A.guardarAjustes().then(horarios); }
    v.onclick = function (e) { var p = e.target.closest('[data-r]'); if (!p) return; var r = p.dataset.r, l = A.horarios(r).map(function (x) { return x.slice(); });
      if (e.target.dataset.x != null) { l.splice(+e.target.dataset.x, 1); guardar(r, l); } if (e.target.dataset.add != null) { l.push([0, '09:00']); guardar(r, l); } if (e.target.dataset.def != null) { delete A.est.ajustes.horarios[r]; A.guardarAjustes().then(horarios); } };
    v.onchange = function (e) { var p = e.target.closest('[data-r]'), t = e.target; if (!p || t.dataset.i == null) return; var r = p.dataset.r, l = A.horarios(r).map(function (x) { return x.slice(); }); if (t.dataset.c === 'd') l[+t.dataset.i][0] = +t.value; else l[+t.dataset.i][1] = t.value || '09:00'; guardar(r, l); };
  }

  function descargar(n, c, t) { Exportar.descargar(n, c, t); }
  function datos() {
    var v = $('#v-datos'), s = A.est.ajustes, perm = typeof Notification !== 'undefined' ? Notification.permission : 'no disponible', prov = s.proveedor;
    v.innerHTML = '<div class="cols iguales"><div class="panel"><h2>Ajustes</h2><label for="d-zona">Zona horaria por defecto</label><input type="text" id="d-zona" list="dl-z2" value="' + esc(s.zona) + '"><datalist id="dl-z2">' + ['America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'UTC'].map(function (z) { return '<option value="' + z + '">'; }).join('') + '</datalist>' +
      '<label for="d-tema">Tema</label><select id="d-tema">' + [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(function (t) { return '<option value="' + t[0] + '"' + (s.tema === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
      '<h3 style="margin-top:1rem">Recordatorios</h3><p class="suave">Las notificaciones del navegador solo funcionan <b>mientras esta página esté abierta</b> (pestaña abierta o en segundo plano). No hay servidor que las envíe con la página cerrada; para eso usa el archivo .ics en tu calendario del móvil, que sí incluye alarmas.</p><div class="fila"><button class="btn" id="d-notif"' + (perm === 'granted' || perm === 'no disponible' ? ' disabled' : '') + '>' + (perm === 'granted' ? 'Notificaciones permitidas' : perm === 'denied' ? 'Bloqueadas en el navegador' : 'Permitir notificaciones') + '</button></div><label for="d-rec">Recordatorio por defecto en nuevas publicaciones</label><select id="d-rec">' + M.RECORDATORIOS.map(function (r) { return '<option value="' + r[0] + '"' + (s.recordarMin === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select>' +
      '<h3 style="margin-top:1rem">IA para guiones e ideas (opcional)</h3><p class="suave">Usa la misma clave que guardaste en el <a href="../escritor/#ajustes">Escritor</a> (se queda en este dispositivo). Sin clave, todo funciona con reglas. Estado: ' + (A.claves.tiene(prov) ? (A.claves.cifrada(prov) ? 'clave cifrada (se pedirá la contraseña)' : 'clave disponible') : 'sin clave para este proveedor') + '.</p><label for="d-prov">Proveedor</label><select id="d-prov">' + Object.keys(IA.PROVEEDORES).map(function (p) { return '<option value="' + p + '"' + (p === prov ? ' selected' : '') + '>' + IA.PROVEEDORES[p].nombre + '</option>'; }).join('') + '</select><label for="d-modelo">Modelo (nombre exacto)</label><input type="text" id="d-modelo" value="' + esc(s.modelos[prov] || '') + '" placeholder="Ej.: ' + IA.PROVEEDORES[prov].ejemplo + '"></div>' +
      '<div class="panel"><h2>Exportar</h2><div class="fila"><button class="btn" id="x-ics">Calendario .ics</button><button class="btn" id="x-csv">Tabla .csv</button><button class="btn" id="x-md">Resumen .md</button></div><p class="suave">El .ics genera un evento por ocurrencia (desde 30 días atrás hasta 1 año adelante), en hora UTC, con alarma si definiste recordatorio.</p>' +
      '<h2 style="margin-top:1.2rem">Importar CSV</h2><p class="suave">Columnas: titulo (obligatoria), red, formato, estado, fecha (AAAA-MM-DD), hora, zona, campana, serie, tema, texto, enlace, vistas, likes, comentarios, compartidos, clics. Acepta , o ; como separador.</p><input type="file" id="i-csv" accept=".csv,text/csv"><div id="i-res" role="status"></div>' +
      '<h2 style="margin-top:1.2rem">Respaldo completo</h2><div class="fila"><button class="btn" id="x-json">Exportar respaldo (.json)</button><label class="btn" for="i-json">Importar respaldo</label><input type="file" id="i-json" accept=".json" class="solo-lectores"></div><p class="suave">' + (A.alm.persistente ? 'Datos guardados en IndexedDB de este navegador.' : 'IndexedDB no está disponible: los datos se perderán al cerrar la página.') + '</p></div></div>';
    v.onclick = async function (e) {
      var id = e.target.id, hoy = F.hoy();
      if (id === 'd-notif') { try { await Notification.requestPermission(); } catch (x) {} datos(); }
      if (id === 'x-ics') { var ics = ICS.generar(A.est.pubs.map(function (p) { return Object.assign({}, p, { zona: A.zona(p) }); }), { desde: F.sumarDias(hoy, -30), hasta: F.sumarDias(hoy, 365), redes: M.REDES }); descargar('calendario-contenido.ics', ics, 'text/calendar'); }
      if (id === 'x-csv') { var nom = {}; A.est.campanas.forEach(function (c) { nom[c.id] = c.nombre; }); descargar('publicaciones.csv', '﻿' + CSV.generar(CSV.filasPub(A.est.pubs, nom)), 'text/csv'); }
      if (id === 'x-md') descargar('calendario-contenido.md', aMd(), 'text/markdown');
      if (id === 'x-json') descargar('calendario-respaldo.json', JSON.stringify({ app: 'contenido_calendario', v: 1, registros: (await A.alm.volcar()).filter(function (r) { return r.col !== 'ajustes'; }) }), 'application/json');
      if (id === 'i-ok' && impCsv) await aplicarImport();
    };
    v.onchange = async function (e) {
      var t = e.target, i = t.id;
      if (i === 'd-zona') { if (!F.zonaValida(t.value.trim())) return U.toast('Zona horaria no válida'); s.zona = t.value.trim(); }
      else if (i === 'd-tema') { s.tema = t.value; A.aplicarTema(); } else if (i === 'd-rec') s.recordarMin = +t.value;
      else if (i === 'd-prov') { s.proveedor = t.value; await A.guardarAjustes(); return datos(); } else if (i === 'd-modelo') s.modelos[s.proveedor] = t.value.trim();
      else if (i === 'i-csv') { var f = t.files[0]; if (!f) return; var r = CSV.importar(await f.text()); impCsv = r; $('#i-res').innerHTML = '<div class="aviso ' + (r.errores.length ? '' : 'ok') + '">' + r.pubs.length + ' publicaciones válidas' + (r.errores.length ? ' y ' + r.errores.length + ' filas con problemas:<ul>' + r.errores.slice(0, 8).map(function (x) { return '<li>Fila ' + x.fila + ': ' + esc(x.msg) + '</li>'; }).join('') + '</ul>' : '.') + '</div>' + (r.pubs.length ? '<button class="btn pri" id="i-ok" style="margin-top:.5rem">Importar ' + r.pubs.length + '</button>' : ''); return; }
      else if (i === 'i-json') { try { var j = JSON.parse(await t.files[0].text()); if (j.app !== 'contenido_calendario') throw new Error('Archivo no válido'); await A.alm.restaurar(j.registros.filter(function (r) { return r.col !== 'ajustes'; })); await A.cargar(); U.toast('Respaldo importado'); A.avisar('pubs'); } catch (x) { U.toast('No se pudo importar: ' + x.message, 5000); } return; }
      else return;
      A.guardarAjustes();
    };
  }
  async function aplicarImport() {
    var r = impCsv, porNombre = {}; A.est.campanas.forEach(function (c) { porNombre[c.nombre.toLowerCase()] = c; });
    async function resolver(n, tipo) { if (!n) return ''; var k = n.toLowerCase(); if (!porNombre[k]) porNombre[k] = await A.guardar('campanas', { nombre: n, tipo: tipo, color: '#0b8f84' }); return porNombre[k].id; }
    var nuevas = 0, act = 0;
    for (var i = 0; i < r.pubs.length; i++) {
      var o = r.pubs[i], ex = o.id && A.pub(o.id); var base = ex ? JSON.parse(JSON.stringify(ex)) : M.nuevaPub(); delete o.id;
      var camp = await resolver(o.campanaNombre, 'campana'), serie = await resolver(o.serieNombre, 'serie'); delete o.campanaNombre; delete o.serieNombre;
      var p = Object.assign(base, o, { campana: camp, serie: serie }); if (ex) act++; else nuevas++; await A.guardar('pubs', p);
    }
    impCsv = null; $('#i-res').innerHTML = '<div class="aviso ok">Importadas: ' + nuevas + ' nuevas, ' + act + ' actualizadas.</div>';
  }
  function aMd() {
    var l = ['# Calendario de contenido', '', 'Generado el ' + F.hoy(), ''], mesAct = '';
    A.est.pubs.filter(function (p) { return p.fecha; }).sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; }).forEach(function (p) {
      var o = F.parse(p.fecha), m = F.MESES[o.m - 1] + ' ' + o.y; if (m !== mesAct) { l.push('', '## ' + m, ''); mesAct = m; }
      var c = A.camp(p.campana), r = p.rec && p.rec.freq !== 'ninguna' ? ' ↻ ' + p.rec.freq : '';
      l.push('- [' + (p.estado === 'publicado' ? 'x' : ' ') + '] ' + p.fecha + ' ' + p.hora + ' · ' + M.REDES[p.red].nombre + ' · **' + p.titulo + '** (' + M.ESTADOS.filter(function (e) { return e[0] === p.estado; })[0][1] + ')' + (c ? ' · ' + c.nombre : '') + r);
    });
    var sin = A.est.pubs.filter(function (p) { return !p.fecha; }); if (sin.length) { l.push('', '## Sin fecha', ''); sin.forEach(function (p) { l.push('- [ ] ' + p.titulo + ' (' + p.estado + ')'); }); }
    return l.join('\n') + '\n';
  }
  function mas() {
    $('#v-mas').innerHTML = '<div class="panel"><h2>Más herramientas</h2><div class="menu-mas">' + [['campanas', '🎯 Campañas y series'], ['plan', '🗓️ Plan de 30 días'], ['horarios', '⏰ Mejores horarios'], ['datos', '⚙️ Datos y ajustes']].map(function (x) { return '<button class="btn" data-ir="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
  }
  A.vistas.campanas = campanas; A.vistas.plan = plan; A.vistas.horarios = horarios; A.vistas.datos = datos; A.vistas.mas = mas; A.exportarMd = aMd;
})();
