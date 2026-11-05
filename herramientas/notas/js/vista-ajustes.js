/* Ajustes: apariencia, tareas y avisos, mando/teclado, datos (exportar, importar, copias) y acerca de. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, IO = G.IO, Cfg = G.Config, U = G.Util;
  var V = G.VistaAjustes = {}, S = function () { return G.App.store; }, cont = null, tab = 'general';
  V.titulo = function () { return 'Ajustes'; };

  function fila(titulo, desc, control) { return h('div', { cls: 'ajuste' }, [h('div', {}, [h('b', { txt: titulo }), desc ? h('small', { txt: desc }) : null]), control]); }
  function check(valor, fn, aria) { var c = h('input', { type: 'checkbox', 'aria-label': aria, 'data-f': 1 }); c.checked = !!valor; c.addEventListener('change', function () { fn(c.checked); }); return c; }
  function selector(valor, ops, fn, aria) { var s = h('select', { 'aria-label': aria, 'data-f': 1 }, ops.map(function (o) { return h('option', { value: o[0], txt: o[1] }); })); s.value = String(valor); s.addEventListener('change', function () { fn(s.value); }); return s; }
  function numero(valor, min, max, fn, aria) { var n = h('input', { type: 'number', min: min, max: max, value: valor, 'aria-label': aria, style: 'width:80px', 'data-f': 1 }); n.addEventListener('change', function () { var v = Math.max(min, Math.min(max, +n.value || min)); n.value = v; fn(v); }); return n; }

  function general() {
    var d = Cfg.disp;
    return [
      fila('Tema', 'Claro, oscuro o el del sistema.', selector(d.tema, [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']], function (v) { Cfg.setDisp('tema', v); }, 'Tema')),
      fila('Texto grande', 'Aumenta el tamaño de la letra un 18 %.', check(d.textoGrande, function (v) { Cfg.setDisp('textoGrande', v); }, 'Texto grande')),
      fila('Escala del texto', d.escala + ' %', (function () { var r = h('input', { type: 'range', min: 80, max: 150, step: 5, value: d.escala, 'aria-label': 'Escala del texto', 'data-f': 1 }); r.addEventListener('input', function () { Cfg.setDisp('escala', +r.value); r.parentNode.previousSibling.querySelector('small').textContent = r.value + ' %'; }); return r; })()),
      fila('Reducir movimiento', 'Desactiva animaciones y transiciones.', selector(d.reducir, [['auto', 'Según el sistema'], ['si', 'Sí'], ['no', 'No']], function (v) { Cfg.setDisp('reducir', v); }, 'Reducir movimiento')),
      fila('Alto contraste', 'Bordes y texto más marcados.', check(d.contraste, function (v) { Cfg.setDisp('contraste', v); }, 'Alto contraste')),
      fila('Paleta apta para daltonismo', 'Usa colores distinguibles (azul/naranja).', check(d.daltonismo, function (v) { Cfg.setDisp('daltonismo', v); }, 'Paleta para daltonismo')),
      fila('Densidad', null, selector(d.densidad, [['normal', 'Normal'], ['compacta', 'Compacta']], function (v) { Cfg.setDisp('densidad', v); }, 'Densidad')),
      fila('Modo zurdo', 'Mueve el botón + al lado izquierdo.', check(d.zurdo, function (v) { Cfg.setDisp('zurdo', v); }, 'Modo zurdo')),
      fila('Gestos de deslizamiento', 'Desliza una tarea a la derecha para completarla, a la izquierda para aplazarla.', check(d.gestos, function (v) { Cfg.setDisp('gestos', v); G.App.render(true); }, 'Gestos')),
      fila('Vibración', 'En móviles que la soporten.', check(d.vibracion, function (v) { Cfg.setDisp('vibracion', v); }, 'Vibración')),
      fila('Sonidos', 'Aviso sonoro al terminar un pomodoro.', check(d.sonido, function (v) { Cfg.setDisp('sonido', v); }, 'Sonidos')),
      h('p', { cls: 'ayuda', style: 'padding:0 14px', txt: 'Estos ajustes se guardan solo en este dispositivo.' })
    ];
  }
  function tareasAv() {
    var p = Cfg.pref, pm = p.pomo, perm = G.Notification ? G.Notification.permission : 'no-soportado';
    var nb = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: perm === 'granted' ? 'Notificaciones activadas' : perm === 'denied' ? 'Bloqueadas en el navegador' : perm === 'no-soportado' ? 'No disponible' : 'Activar notificaciones', disabled: perm !== 'default', on: { click: function () { G.Recordatorios.pedirPermiso().then(function () { V.pintar(); }); } } });
    return [
      fila('Notificaciones del navegador', 'Se muestran cuando la app está abierta (o en segundo plano en el navegador). Ver limitaciones abajo.', nb),
      fila('Recordatorio por defecto', 'Para tareas con hora.', selector(p.aviso == null ? '' : p.aviso, [['', 'Ninguno'], ['0', 'A la hora'], ['5', '5 min antes'], ['10', '10 min antes'], ['30', '30 min antes'], ['60', '1 hora antes']], function (v) { Cfg.setPref('aviso', v === '' ? null : +v); }, 'Recordatorio por defecto')),
      fila('Resumen diario', 'Al abrir la app cada día, avisa de tareas de hoy y vencidas.', check(p.resumen, function (v) { Cfg.setPref('resumen', v); }, 'Resumen diario')),
      fila('La semana empieza en', null, selector(p.inicioSemana, [['1', 'Lunes'], ['0', 'Domingo']], function (v) { Cfg.setPref('inicioSemana', +v); }, 'Inicio de semana')),
      fila('Pomodoro: concentración (min)', null, numero(pm.trabajo, 1, 120, function (v) { pm.trabajo = v; Cfg.guardarPref(); }, 'Minutos de concentración')),
      fila('Pomodoro: descanso corto (min)', null, numero(pm.corto, 1, 60, function (v) { pm.corto = v; Cfg.guardarPref(); }, 'Minutos de descanso corto')),
      fila('Pomodoro: descanso largo (min)', null, numero(pm.largo, 1, 90, function (v) { pm.largo = v; Cfg.guardarPref(); }, 'Minutos de descanso largo')),
      fila('Pomodoros hasta el descanso largo', null, numero(pm.cada, 2, 10, function (v) { pm.cada = v; Cfg.guardarPref(); }, 'Ciclos')),
      fila('Pasar solo a la siguiente fase', 'Inicia descansos y pomodoros automáticamente.', check(pm.auto, function (v) { pm.auto = v; Cfg.guardarPref(); }, 'Automático')),
      fila('Días en la papelera', 'Después se eliminan definitivamente.', numero(p.papeleraDias, 1, 365, function (v) { Cfg.setPref('papeleraDias', v); }, 'Días en la papelera')),
      h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Limitaciones de los recordatorios' }), h('p', { cls: 'ayuda', txt: 'Esta es una app web sin servidor: no puede despertar al navegador cuando está cerrado. Los avisos se comprueban cada 15 segundos mientras la pestaña esté abierta (también en segundo plano, aunque el navegador puede pausar pestañas inactivas en móviles) y al abrir la app, donde se muestran los recordatorios perdidos. Las notificaciones del sistema requieren tu permiso. Para avisos fiables con la app cerrada, exporta las tareas a .ics e impórtalas en tu calendario (con alarmas).' })])
    ];
  }
  function mando() {
    var d = Cfg.disp;
    var atajos = [['Ctrl + K', 'Paleta de comandos / captura rápida'], ['N', 'Nueva nota'], ['T', 'Nueva tarea'], ['/', 'Buscar'], ['G luego H / I / P / N', 'Ir a Hoy / Bandeja / Próximos / Notas'], ['G luego C / K / L / E / S', 'Calendario / Tablero / Línea / Enfoque / Estadísticas'], ['J / K', 'Bajar / subir en la lista'], ['X', 'Completar la tarea seleccionada'], ['Intro', 'Abrir elemento'], ['Esc', 'Cerrar / volver'], ['Ctrl + S', 'Guardar nota (también se guarda sola)'], ['Ctrl + B / I', 'Negrita / cursiva'], ['Ctrl + Mayús + H', 'Resaltar'], ['[', 'Mostrar u ocultar menú lateral'], ['?', 'Esta ayuda']];
    var pad = [['Cruceta / stick izquierdo', 'Mover el foco'], ['A', 'Abrir o marcar'], ['B', 'Atrás / cerrar'], ['X', 'Nueva tarea'], ['Y', 'Nueva nota'], ['LB / RB', 'Vista anterior / siguiente'], ['MENÚ', 'Paleta de comandos'], ['VISTA', 'Abrir menú lateral'], ['Stick derecho', 'Desplazar']];
    return [
      fila('Vibración del mando', 'Al completar tareas.', check(d.mandoVibra, function (v) { Cfg.setDisp('mandoVibra', v); }, 'Vibración del mando')),
      fila('Velocidad de repetición del mando (ms)', 'Menos es más rápido.', numero(d.mandoRepeticion, 80, 600, function (v) { Cfg.setDisp('mandoRepeticion', v); }, 'Repetición')),
      h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Teclado y ratón' }), h('table', { cls: 'atajos-t' }, atajos.map(function (a) { return h('tr', {}, [h('td', {}, [h('kbd', { txt: a[0] })]), h('td', { txt: a[1] })]); }))]),
      h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Mando Xbox' }), h('table', { cls: 'atajos-t' }, pad.map(function (a) { return h('tr', {}, [h('td', {}, [h('kbd', { txt: a[0] })]), h('td', { txt: a[1] })]); }))]),
      h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Táctil' }), h('p', { cls: 'ayuda', txt: 'Desliza una tarea a la derecha para completarla o a la izquierda para aplazarla a mañana. En el tablero y el calendario, mantén pulsado un elemento y arrástralo. Usa el botón + para la captura rápida.' })])
    ];
  }
  function descargarZip() { var z = IO.exportarZip(S()); UI.descargar('notas-' + F.hoy() + '.zip', new Blob([z], { type: 'application/zip' })); }
  function importarArchivo() {
    UI.leerArchivo('.json,.zip,.md,.markdown,.txt,.ics', function (data, f) {
      var nombre = f.name.toLowerCase();
      function fin(r) { UI.aviso('Importado: ' + r, { tipo: 'ok' }); G.App.titulos = null; G.App.render(true); }
      function err(e) { UI.aviso('No se pudo importar: ' + e.message, { tipo: 'error', ms: 6000 }); }
      try {
        if (/\.json$/.test(nombre)) {
          UI.dialogo({ titulo: 'Importar copia JSON', ancho: 440, cuerpo: h('p', { txt: '«Fusionar» añade lo nuevo y conserva lo más reciente de cada campo. «Reemplazar» deja tus datos exactamente como la copia (se guarda antes una copia de seguridad).' }), acciones: [{ txt: 'Cancelar' }, { txt: 'Fusionar', cls: 'prim', fn: function () { try { var r = IO.importarJSON(S(), data, 'fusionar'); fin(r.nuevos + ' nuevos, ' + r.actualizados + ' actualizados'); } catch (e) { err(e); } } }, { txt: 'Reemplazar', cls: 'peligro', fn: function () { S().guardarCopiaAhora('antes de importar').then(function () { try { var r = IO.importarJSON(S(), data, 'reemplazar'); fin(r.total + ' registros'); } catch (e) { err(e); } }); } }] });
        } else if (/\.zip$/.test(nombre)) { IO.importarZip(S(), new Uint8Array(data)).then(function (r) { fin(r.notas + ' notas, ' + r.tareas + ' tareas'); }, err); }
        else if (/\.ics$/.test(nombre)) { var ts = IO.importarICS(data), n = 0; ts.forEach(function (t) { var dup = S().lista('tareas', function (x) { return x.titulo === t.titulo && x.fecha === t.fecha && x.hora === t.hora && !x.papelera; }).length; if (!dup) { G.Tareas.crear(t); n++; } }); fin(n + ' tareas del calendario'); }
        else { var r2 = IO.importarMd(S(), [{ ruta: f.name, datos: data }]); fin(r2.notas + ' nota(s)'); }
      } catch (e) { err(e); }
    }, /\.zip$/.test('') ? true : false);
  }
  function importarZipBin() { UI.leerArchivo('.zip', function (data) { IO.importarZip(S(), new Uint8Array(data)).then(function (r) { UI.aviso('Importado: ' + r.notas + ' notas, ' + r.tareas + ' tareas', { tipo: 'ok' }); G.App.titulos = null; G.App.render(true); }, function (e) { UI.aviso(e.message, { tipo: 'error' }); }); }, true); }
  function datos() {
    var cop = h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Copias de seguridad automáticas' }), h('p', { cls: 'ayuda', txt: 'Se guarda una copia local al abrir la app (máximo una al día, se conservan 7). Viven en este navegador: descarga una exportación para tener una copia fuera del dispositivo.' })]);
    var lista = h('div'); cop.appendChild(lista);
    S().copias().then(function (l) {
      lista.textContent = ''; if (!l.length) lista.appendChild(h('p', { cls: 'ayuda', txt: 'Aún no hay copias.' }));
      l.forEach(function (c) { lista.appendChild(h('div', { cls: 'fila', style: 'padding:4px 0' }, [h('span', { style: 'flex:1', txt: new Date(c.ts).toLocaleString('es') + ' · ' + c.motivo + ' · ' + Math.round(c.bytes / 1024) + ' KB' }), h('button', { type: 'button', cls: 'btn pq', txt: 'Restaurar', 'data-f': 1, on: { click: function () { UI.confirmar('Restaurar copia', 'Tus datos actuales se sustituirán por los de esta copia (antes se guarda una copia nueva).', function () { S().guardarCopiaAhora('antes de restaurar').then(function () { return S().restaurarCopia(c.id); }).then(function () { UI.aviso('Copia restaurada', { tipo: 'ok' }); G.App.titulos = null; G.App.render(true); }); }, { txt: 'Restaurar', peligro: 1 }); } } })])); });
    });
    var almac = h('small', { txt: '' });
    if (G.navigator.storage && G.navigator.storage.estimate) G.navigator.storage.estimate().then(function (e) { almac.textContent = 'Uso: ' + (e.usage / 1048576).toFixed(1) + ' MB de ' + Math.round(e.quota / 1048576) + ' MB' + (S().persistente ? '' : ' · ATENCIÓN: sin almacenamiento persistente (modo privado)'); });
    var pers = h('button', { type: 'button', cls: 'btn', txt: 'Pedir almacenamiento persistente', 'data-f': 1, on: { click: function () { (G.navigator.storage && G.navigator.storage.persist ? G.navigator.storage.persist() : Promise.resolve(false)).then(function (ok) { UI.aviso(ok ? 'El navegador no borrará tus datos automáticamente' : 'El navegador no lo concedió (puede deberse a que la página no se usa lo suficiente)', { tipo: ok ? 'ok' : '' }); }); } } });
    return [
      fila('Exportar todo (JSON)', 'Copia completa y fiel; úsala para migrar o respaldar.', h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { UI.descargar('notas-' + F.hoy() + '.json', IO.exportarJSON(S()), 'application/json'); } } }, [UI.icono('download'), h('span', { txt: 'JSON' })])),
      fila('Exportar notas y tareas (Markdown)', 'ZIP con un .md por nota (libretas como carpetas), Tareas/ y adjuntos/.', h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: descargarZip } }, [UI.icono('download'), h('span', { txt: 'ZIP .md' })])),
      fila('Exportar tareas a calendario (.ics)', 'Tareas con fecha, con repetición y alarma.', h('div', { cls: 'fila' }, [h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { UI.descargar('tareas-' + F.hoy() + '.ics', IO.exportarICS(S().lista('tareas', function (t) { return t.estado !== 'hecha'; })), 'text/calendar'); } } }, [UI.icono('download'), h('span', { txt: 'Eventos' })]), h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { UI.descargar('tareas-' + F.hoy() + '.ics', IO.exportarICS(S().lista('tareas', function (t) { return t.estado !== 'hecha'; }), { formato: 'todo' }), 'text/calendar'); } } }, [h('span', { txt: 'Tareas (VTODO)' })])])),
      fila('Importar', 'JSON, ZIP de Markdown, un .md o un calendario .ics.', h('div', { cls: 'fila' }, [h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: importarArchivo } }, [UI.icono('upload'), h('span', { txt: 'Archivo…' })]), h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: importarZipBin } }, [h('span', { txt: 'ZIP…' })])])),
      cop,
      fila('Datos de ejemplo', 'Añade 500 notas y 300 tareas (útil para probar el rendimiento).', h('button', { type: 'button', cls: 'btn', 'data-f': 1, on: { click: function () { UI.confirmar('Cargar ejemplos', 'Se añadirán 500 notas y 300 tareas de ejemplo a tus datos.', function () { var t0 = performance.now(); G.Ejemplos.cargar(S()); S().vaciar(); G.App.titulos = null; UI.aviso('Ejemplos cargados en ' + Math.round(performance.now() - t0) + ' ms', { tipo: 'ok' }); G.App.render(true); }); } } }, [h('span', { txt: 'Cargar ejemplos' })])),
      fila('Almacenamiento', null, h('div', {}, [pers, almac])),
      fila('Borrar todos los datos', 'Elimina notas, tareas y hábitos de este dispositivo (se guarda una copia antes).', h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Borrar todo…', on: { click: function () { UI.confirmar('Borrar todo', 'Se eliminarán todas tus notas, tareas, hábitos y adjuntos. Se conservará una copia de seguridad local.', function () { S().guardarCopiaAhora('antes de borrar todo').then(function () { S().borrarTodo(); G.App.titulos = null; UI.aviso('Datos borrados'); G.App.ir('tareas', 'hoy'); }); }, { txt: 'Borrar todo', peligro: 1 }); } } }))
    ];
  }
  function acerca() {
    return [h('div', { cls: 'bloque', style: 'margin:14px' }, [h('b', { txt: 'Notas y Tareas' }), h('p', { cls: 'ayuda', txt: 'Funciona sin conexión. Todo se guarda en tu dispositivo (IndexedDB) de forma continua; al recargar no se pierde nada. No hay cuenta ni servidor.' }),
      h('b', { txt: 'Bloqueo de notas' }), h('p', { cls: 'ayuda', txt: 'Las notas bloqueadas se cifran con AES-GCM de 256 bits; la clave se deriva de tu contraseña con PBKDF2-SHA256 (210 000 iteraciones). La contraseña no se guarda en ningún sitio y NO existe recuperación: si la olvidas, el contenido es irrecuperable. El título y las etiquetas no se cifran y las notas bloqueadas no guardan historial.' }),
      h('b', { txt: 'Colaboración en tiempo real' }), h('p', { cls: 'ayuda', txt: 'Conexión directa entre navegadores (WebRTC). Los cambios se fusionan campo a campo: gana la última escritura según un reloj lógico. Las imágenes adjuntas no se envían. Al recargar hay que volver a conectarse con un enlace nuevo; lo ya compartido permanece en tu copia local.' }),
      h('b', { txt: 'Sincronización en la nube' }), h('p', { cls: 'ayuda', txt: 'Aún no disponible. Los datos usan un almacén con registro de cambios y marcas por campo, listo para sincronizarse en una fase posterior.' })])];
  }
  var TABS = [['general', 'Apariencia', general], ['tareas', 'Tareas y avisos', tareasAv], ['mando', 'Teclado y mando', mando], ['datos', 'Datos', datos], ['acerca', 'Acerca de', acerca]];
  V.pintar = function () {
    if (!cont) return; var y = cont.scrollTop; cont.textContent = '';
    cont.appendChild(h('div', { cls: 'tabs', role: 'tablist' }, TABS.map(function (t) { return h('button', { type: 'button', cls: 'btn', role: 'tab', 'aria-selected': String(tab === t[0]), txt: t[1], 'data-f': 1, on: { click: function () { tab = t[0]; V.pintar(); } } }); })));
    var panel = h('div', { role: 'tabpanel' }, TABS.filter(function (t) { return t[0] === tab; })[0][2]()); cont.appendChild(panel); cont.scrollTop = y;
  };
  V.montar = function (c) {
    var barra = h('div', { cls: 'barra-v' }, [h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Abrir menú', 'data-f': 1, on: { click: function () { G.App.alternarMenu(true); } } }, [UI.icono('menu')]), h('h1', { txt: 'Ajustes y datos' })]);
    cont = h('div', { cls: 'cuerpo-scroll', style: 'padding-bottom:90px' }); c.appendChild(h('div', { cls: 'ancho' }, [barra, cont])); V.pintar();
  };
  G.App.vistas.ajustes = V;
})(window);
