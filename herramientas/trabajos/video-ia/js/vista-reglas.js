/* Vista «Reglas»: editor evento -> accion, plantillas y documentacion del canal de Automatizaciones. window.VReglasUI */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, R = g.VReglas, D = g.VDatos, U = g.VReglasUI = {}, el = {}, edit = null;
  var FRACCION = { movimiento: 1, objeto_color: 1 };
  var PLANTILLAS = [
    ['Avisar si hay movimiento', { nombre: 'Aviso de movimiento', evento: 'movimiento', filtro: {}, enfriamiento: 30, acciones: [{ tipo: 'captura' }, { tipo: 'sonido', sonido: 'pitido' }, { tipo: 'notificacion' }] }],
    ['Grabar clip si cruzan la línea', { nombre: 'Clip al cruzar la línea', evento: 'cruce_linea', filtro: {}, enfriamiento: 15, acciones: [{ tipo: 'clip', post: 8 }] }],
    ['Captura si cambia la escena', { nombre: 'Captura en corte de escena', evento: 'escena', filtro: {}, enfriamiento: 5, acciones: [{ tipo: 'captura' }] }],
    ['Flujo de Automatizaciones con QR', { nombre: 'QR a Automatizaciones', evento: 'qr', filtro: {}, enfriamiento: 5, acciones: [{ tipo: 'automatizacion', flujo: '' }] }],
    ['Alarma si algo del color elegido aparece', { nombre: 'Objeto de color', evento: 'objeto_color', filtro: {}, enfriamiento: 20, acciones: [{ tipo: 'sonido', sonido: 'alarma' }, { tipo: 'clip', post: 6 }] }]
  ];
  function resumenAcc(r) { return R.accionesDe(r).map(function (a) { return (R.ACCIONES.filter(function (x) { return x[0] === a.tipo; })[0] || [0, a.tipo])[1]; }).join(' + '); }
  async function cargar() { V.reglas = await D.reglas(); V.reglasActivas(); pintarLista(); V.emitir('reglas'); }
  U.cargar = cargar;
  function pintarLista() {
    var l = el.lista; l.textContent = '';
    if (!V.reglas.length) l.appendChild(h('p', { cls: 'tr-vacio', txt: 'Sin reglas. Crea una o parte de una plantilla.' }));
    V.reglas.forEach(function (r) {
      var sw = h('input', { type: 'checkbox', 'aria-label': 'Regla activa: ' + r.nombre }); sw.checked = r.activo; sw.addEventListener('change', function () { r.activo = sw.checked; D.guardarRegla(r).then(cargar); });
      var f = r.filtro || {}, fs = [f.min != null && f.min !== '' ? 'valor ≥ ' + (FRACCION[r.evento] ? Math.round(f.min * 1000) / 10 + ' %' : f.min) : '', f.contiene ? 'contiene «' + f.contiene + '»' : '', f.linea ? 'línea ' + ((V.cfg.lineas.filter(function (x) { return x.id === f.linea; })[0] || {}).nombre || f.linea) : '', f.dir ? 'sentido ' + (f.dir === 'ab' ? 'A→B' : 'B→A') : ''].filter(Boolean).join(', ');
      l.appendChild(h('div', { cls: 'vi-regla' + (r.activo ? '' : ' off') }, [h('label', { cls: 'tr-chk' }, [sw, h('b', { txt: r.nombre })]), h('p', { cls: 'tr-ayuda', txt: 'Cuando: ' + R.nombreEvento(r.evento) + (fs ? ' (' + fs + ')' : '') + ' → ' + resumenAcc(r) + ' · espera ' + (r.enfriamiento == null ? 10 : r.enfriamiento) + ' s' }),
        h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Editar', on: { click: function () { abrir(r); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Probar', title: 'Dispara la regla con un evento de prueba', on: { click: function () { var ev = { t: V.reloj(), tipo: r.evento, valor: Math.max(+(f.min || 0), 0.5), texto: f.contiene || 'prueba', linea: f.linea, dir: f.dir, ts: Date.now() }; R.accionesDe(r).forEach(function (a) { g.VAcciones.ejecutar(a, ev, r); }); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar', on: { click: function () { if (confirm('¿Borrar la regla «' + r.nombre + '»?')) D.borrarRegla(r.id).then(cargar); } } })])]));
    });
  }
  function abrir(r) {
    edit = R.nuevaRegla(JSON.parse(JSON.stringify(r || {}))); if (!r) edit.id = ''; var f = el.form; f.textContent = ''; f.hidden = false;
    var nom = h('input', { type: 'text', id: 'rg-nom', value: edit.nombre, maxlength: 60, placeholder: 'Ej.: Entrada principal' }), ev = h('select', { id: 'rg-ev' }, R.EVENTOS.map(function (e) { return h('option', { value: e[0], txt: e[1] }); })); ev.value = edit.evento;
    var filtros = h('div', {}), acc = h('div', {}), cd = h('input', { type: 'number', id: 'rg-cd', min: 0, max: 3600, value: edit.enfriamiento });
    var campos = {};
    function pintarFiltros() {
      filtros.textContent = ''; var e = ev.value, fl = edit.filtro || (edit.filtro = {});
      if (FRACCION[e]) { campos.min = h('input', { type: 'number', id: 'rg-min', min: 0, max: 100, step: 0.5, value: fl.min != null && fl.min !== '' ? Math.round(fl.min * 1000) / 10 : '' }); filtros.appendChild(h('div', {}, [h('label', { for: 'rg-min', txt: 'Actividad mínima (% del cuadro, opcional)' }), campos.min])); }
      else if (e === 'ia_evento' || e === 'cruce_linea' || e === 'oscuro' || e === 'desenfoque') { campos.min = null; }
      if (['qr', 'texto', 'codigo', 'ia_evento', 'habla', 'objeto_nuevo'].indexOf(e) >= 0) { campos.contiene = h('input', { type: 'text', id: 'rg-con', value: fl.contiene || '', placeholder: 'texto que debe contener (opcional)' }); filtros.appendChild(h('div', {}, [h('label', { for: 'rg-con', txt: 'Solo si contiene' }), campos.contiene])); } else campos.contiene = null;
      if (e === 'cruce_linea') {
        campos.linea = h('select', { id: 'rg-lin' }, [h('option', { value: '', txt: 'Cualquier línea' })].concat(V.cfg.lineas.map(function (l) { return h('option', { value: l.id, txt: l.nombre }); }))); campos.linea.value = fl.linea || '';
        campos.dir = h('select', { id: 'rg-dir' }, [h('option', { value: '', txt: 'Cualquier sentido' }), h('option', { value: 'ab', txt: 'A→B (hacia donde apunta la flecha)' }), h('option', { value: 'ba', txt: 'B→A' })]); campos.dir.value = fl.dir || '';
        filtros.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'rg-lin', txt: 'Línea' }), campos.linea]), h('div', {}, [h('label', { for: 'rg-dir', txt: 'Sentido' }), campos.dir])]));
      } else { campos.linea = campos.dir = null; }
      if (e === 'ia_evento') filtros.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Los eventos de IA se definen en la pestaña IA («avísame si alguien entra por la puerta»).' }));
    }
    ev.addEventListener('change', function () { edit.filtro = {}; pintarFiltros(); }); pintarFiltros();
    var cuerpo = {};
    R.ACCIONES.forEach(function (a) {
      var ac = R.accionesDe(edit).filter(function (x) { return x.tipo === a[0]; })[0], c = h('input', { type: 'checkbox', id: 'rg-a-' + a[0] }); c.checked = !!ac; var extra = h('div', { cls: 'vi-extra' });
      if (a[0] === 'clip') { cuerpo.post = h('input', { type: 'number', min: 2, max: 120, id: 'rg-post', value: ac && ac.post || 8, 'aria-label': 'Segundos después del evento' }); extra.appendChild(h('label', { for: 'rg-post', txt: 'Segundos DESPUÉS del evento (el antes lo da el buffer de pre-roll)' })); extra.appendChild(cuerpo.post); }
      if (a[0] === 'notificacion') { cuerpo.ntx = h('input', { type: 'text', id: 'rg-ntx', value: ac && ac.texto || '', placeholder: 'Regla «{regla}»: {evento} {texto}' }); extra.appendChild(h('label', { for: 'rg-ntx', txt: 'Texto (variables {regla} {evento} {valor} {texto} {tiempo})' })); extra.appendChild(cuerpo.ntx); }
      if (a[0] === 'sonido') { cuerpo.son = h('select', { id: 'rg-son', 'aria-label': 'Sonido' }, [['pitido', 'Pitido'], ['alarma', 'Alarma'], ['campana', 'Campana']].map(function (s) { return h('option', { value: s[0], txt: s[1] }); })); cuerpo.son.value = ac && ac.sonido || 'pitido'; extra.appendChild(cuerpo.son); }
      if (a[0] === 'mensaje') {
        var TD = g.TrabajosDispositivos, lista = TD ? TD.listar().filter(function (x) { return x.estado === 'conectado' && x.tipo !== 'camara' && x.tipo !== 'microfono'; }) : [];
        cuerpo.dest = h('select', { id: 'rg-dest', 'aria-label': 'Destino' }, [h('option', { value: '*', txt: 'Primer dispositivo/puente conectado' })].concat(lista.map(function (x) { return h('option', { value: x.id, txt: x.nombre + ' (' + x.tipo + ')' }); }))); cuerpo.dest.value = ac && ac.destino || '*';
        cuerpo.mtx = h('input', { type: 'text', id: 'rg-mtx', value: ac && ac.texto || '', placeholder: '{evento}: {texto}' }); extra.appendChild(cuerpo.dest); extra.appendChild(h('label', { for: 'rg-mtx', txt: 'Mensaje' })); extra.appendChild(cuerpo.mtx); extra.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Un puente WebSocket recibe JSON {tipo:"video_evento",…}; serie/Bluetooth reciben el texto. Conéctalo en Ajustes.' }));
      }
      if (a[0] === 'automatizacion') { cuerpo.flujo = h('input', { type: 'text', id: 'rg-flujo', value: ac && ac.flujo || '', placeholder: 'nombre del flujo (opcional)' }); extra.appendChild(h('label', { for: 'rg-flujo', txt: 'Nombre del flujo (se envía en el mensaje)' })); extra.appendChild(cuerpo.flujo); }
      acc.appendChild(h('div', { cls: 'vi-acc-fila' }, [h('label', { cls: 'tr-chk', for: 'rg-a-' + a[0] }, [c, a[1]]), extra])); cuerpo['c_' + a[0]] = c;
    });
    function guardar() {
      var r = edit; r.nombre = nom.value.trim() || R.nombreEvento(ev.value); r.evento = ev.value; r.enfriamiento = Math.max(0, +cd.value || 0); var fl = {};
      if (campos.min && campos.min.value !== '') fl.min = (+campos.min.value) / 100; if (campos.contiene && campos.contiene.value.trim()) fl.contiene = campos.contiene.value.trim(); if (campos.linea && campos.linea.value) fl.linea = campos.linea.value; if (campos.dir && campos.dir.value) fl.dir = campos.dir.value; r.filtro = fl;
      r.acciones = []; R.ACCIONES.forEach(function (a) { if (!cuerpo['c_' + a[0]].checked) return; var o = { tipo: a[0] }; if (a[0] === 'clip') o.post = Math.max(2, Math.min(120, +cuerpo.post.value || 8)); if (a[0] === 'notificacion' && cuerpo.ntx.value) o.texto = cuerpo.ntx.value; if (a[0] === 'sonido') o.sonido = cuerpo.son.value; if (a[0] === 'mensaje') { o.destino = cuerpo.dest.value; if (cuerpo.mtx.value) o.texto = cuerpo.mtx.value; } if (a[0] === 'automatizacion') o.flujo = cuerpo.flujo.value.trim(); r.acciones.push(o); });
      delete r.accion; if (!r.acciones.length) { T.aviso('Elige al menos una acción.', 'error'); return; }
      D.guardarRegla(r).then(function () { f.hidden = true; T.aviso('Regla guardada.'); return cargar(); });
    }
    f.appendChild(h('h2', { txt: r ? 'Editar regla' : 'Nueva regla' }));
    f.appendChild(h('label', { for: 'rg-nom', txt: 'Nombre' })); f.appendChild(nom); f.appendChild(h('label', { for: 'rg-ev', txt: 'Cuando ocurra…' })); f.appendChild(ev); f.appendChild(filtros);
    f.appendChild(h('label', { for: 'rg-cd', txt: 'Esperar entre disparos (segundos)' })); f.appendChild(cd); f.appendChild(h('h3', { txt: 'Hacer…' })); f.appendChild(acc);
    f.appendChild(h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar regla', on: { click: guardar } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Cancelar', on: { click: function () { f.hidden = true; } } })]));
    f.scrollIntoView({ block: 'nearest' }); nom.focus();
  }
  U.iniciar = function (cont) {
    el.lista = h('div', {}); el.form = h('div', { cls: 'tr-panel', hidden: true });
    var pr = h('input', { type: 'number', id: 'rg-pre', min: 2, max: 30, value: V.cfg.preroll || 5 }); pr.addEventListener('change', function () { V.cfg.preroll = Math.max(2, Math.min(30, +pr.value || 5)); if (g.VCaptura.prerollActivo) { try { g.VCaptura.activarPreroll(V.cfg.preroll); } catch (e) {} } V.cambioCfg(); }); V.on('cfg', function () { pr.value = V.cfg.preroll || 5; });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Reglas evento → acción' }), h('p', { cls: 'tr-sub', txt: 'Cada regla escucha un evento del análisis y ejecuta acciones. Funcionan mientras esta pestaña esté abierta y analizando.' }),
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Nueva regla', on: { click: function () { abrir(null); } } })]), h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Plantillas' }), h('div', { cls: 'tr-acciones' }, PLANTILLAS.map(function (p) { return h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: p[0], on: { click: function () { abrir(Object.assign(R.nuevaRegla(), JSON.parse(JSON.stringify(p[1])), { id: '' })); } } }); }))]),
      h('label', { for: 'rg-pre', txt: 'Pre-roll de los clips (segundos de pasado garantizados)' }), pr, h('p', { cls: 'tr-ayuda', txt: 'Con reglas de clip activas el buffer se enciende solo al abrir una cámara o pantalla (con indicador visible). Entre N y 2N segundos de pasado quedan en memoria; nada se guarda hasta que una regla se dispara.' })]));
    cont.appendChild(el.form); cont.appendChild(h('div', { cls: 'tr-panel' }, [el.lista]));
    cont.appendChild(h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Conectar con Automatizaciones (BroadcastChannel)' }), h('p', { txt: 'La acción «Disparar flujo de Automatizaciones» publica en el canal «' + R.CANAL + '» (solo entre pestañas del mismo navegador y sitio). Para escucharlo en un flujo hace falta un disparador que lea ese canal; esta herramienta no modifica Automatizaciones. Los eventos de QR también se publican en «trabajos_qr_leido», que el disparador existente «QR leído» ya escucha.' }), h('pre', { cls: 'vi-cod', txt: "var bc = new BroadcastChannel('" + R.CANAL + "');\nbc.onmessage = function (e) {\n  // e.data = { tipo:'video_evento', evento:'cruce_linea', valor:1,\n  //   texto:'Línea 1 A→B', t:12.4, ts:1710000000000, regla:'…',\n  //   flujo:'nombre', proyecto:'…', datos:{linea,dir,x,y} }\n};" })]));
    cargar();
  };
})(window);
