/* Pestana Puente: cliente WebSocket configurable (JSON), registro, ping, guia y puente minimo descargable. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  var PLANTILLAS = [
    ['Eco', { accion: 'eco', datos: 'hola' }],
    ['Ping', { tipo: 'ping', t: 1 }],
    ['Tello: command (UDP)', { accion: 'udp', host: '192.168.10.1', puerto: 8889, datos: 'command' }],
    ['Tello: battery?', { accion: 'udp', host: '192.168.10.1', puerto: 8889, datos: 'battery?' }],
    ['Impresora de red (TCP 9100)', { accion: 'tcp', host: '192.168.1.50', puerto: 9100, datos: 'Prueba\n\n\n' }],
    ['Difundir a otros clientes', { accion: 'difundir', datos: { mensaje: 'hola' } }]
  ];
  A.iniciarPuente = function () {
    var raiz = document.getElementById('v-puente'), reg = U.registro({ nombre: 'puente', etiqueta: 'Registro del puente' });
    var url = h('input', { type: 'text', value: 'ws://localhost:8765', autocomplete: 'off', spellcheck: 'false', inputmode: 'url', 'aria-label': 'Dirección del puente' }), reco = h('input', { type: 'checkbox' });
    var msg = h('textarea', { rows: '4', spellcheck: 'false', 'aria-label': 'Mensaje JSON a enviar' }), aviso = h('div'), lat = h('span', { cls: 'tr-ayuda', txt: '' }), bEnv = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Enviar', disabled: true }), bPing = h('button', { type: 'button', cls: 'tr-btn', txt: 'Ping', disabled: true });
    msg.value = JSON.stringify(PLANTILLAS[0][1], null, 2); var json = h('input', { type: 'checkbox', checked: true });
    function validar() {
      var v = P.urlWS(url.value, { protocol: location.protocol }); aviso.textContent = '';
      if (!v.ok) aviso.appendChild(U.nota(v.error, v.bloqueada ? 'mal' : 'av')); else if (v.aviso) aviso.appendChild(U.nota(v.aviso, 'av'));
      var l = P.limpiarUrl(url.value); if (l.quitados.length) aviso.appendChild(U.nota('La dirección lleva datos sensibles (' + l.quitados.join(', ') + '). Se usarán para conectar, pero no se guardarán en perfiles ni en el historial.', 'av'));
      return v;
    }
    url.addEventListener('input', validar);
    A.params.puente = { leer: function () { return { url: P.limpiarUrl(url.value).url, reconectar: reco.checked }; }, aplicar: function (p) { url.value = p.url || url.value; reco.checked = !!p.reconectar; validar(); } };
    var ctl = U.control({
      tipo: 'puente', capId: 'websocket', etiqueta: 'Conectar',
      abrir: function () { var v = validar(); if (!v.ok) return Promise.reject(Object.assign(new Error(v.error), { name: 'PuenteError' })); return TD.conectar('puente', { url: url.value.trim(), reconectar: reco.checked }); },
      alConectar: function (c) {
        reg.add('sys', 'Conectado a ' + P.limpiarUrl(c.nombre).url); bEnv.disabled = bPing.disabled = false;
        c.escuchar(function (ev) {
          if (ev.dir === 'rx') reg.add('rx', ev.meta && ev.meta.binario ? P.aHex(ev.datos) + ' (binario)' : (ev.meta && ev.meta.texto) || String(ev.datos));
          else reg.add('tx', typeof ev.datos === 'string' ? ev.datos : JSON.stringify(ev.datos));
        }, 'datos');
        c.escuchar(function (ev) { reg.add('sys', 'Estado: ' + ev.estado + (ev.mensaje ? ' · ' + ev.mensaje : '')); bEnv.disabled = bPing.disabled = ev.estado !== 'conectado'; }, 'estado');
      },
      alCerrar: function (c, ev) { bEnv.disabled = bPing.disabled = true; reg.add('sys', 'Desconectado' + (ev.voluntario ? '' : ': ' + ev.motivo)); },
      alFallar: function (e) { reg.add('err', e.message); }
    });
    bEnv.addEventListener('click', function () {
      var c = ctl.actual(); if (!c) return; var d = msg.value;
      if (json.checked) { var r = P.parseJSON(d); if (!r.ok) return T.aviso(r.error, 'error'); d = r.valor; }
      c.enviar(d).catch(function (e) { ctl.error(e); reg.add('err', e.message); });
    });
    bPing.addEventListener('click', function () { var c = ctl.actual(); if (c) c.h.ping().then(function (ms) { lat.textContent = 'Latencia: ' + ms.toFixed(1) + ' ms'; reg.add('sys', 'Ping: ' + ms.toFixed(1) + ' ms'); }, function (e) { lat.textContent = e.message; reg.add('err', e.message); }); });
    var pl = h('div', { cls: 'tr-acciones' }, PLANTILLAS.map(function (p) { return h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: p[0], on: { click: function () { msg.value = JSON.stringify(p[1], null, 2); json.checked = true; } } }); }));
    var guia = h('div', {}, [
      h('p', { txt: 'Un navegador no puede abrir sockets UDP/TCP ni hablar con drones, impresoras de red o domótica por su protocolo. Un «puente» es un programa pequeño en tu equipo que traduce: la página habla JSON por WebSocket y el puente reenvía por UDP, TCP o serie.' }),
      h('ol', {}, [
        h('li', { txt: 'Instala Node.js (nodejs.org) y descarga el script de abajo.' }),
        h('li', { txt: 'En su carpeta ejecuta: npm i ws  y luego  node puente-minimo.js 8765' }),
        h('li', { txt: 'Aquí, pon ws://localhost:8765 y pulsa Conectar. Prueba «Eco» y «Ping».' }),
        h('li', { txt: 'Para el Tello: conecta tu equipo a la WiFi del dron y envía la plantilla «Tello: command»; las respuestas llegan como mensajes «udp».' }),
        h('li', { txt: 'Si abres esta página por HTTPS, el navegador solo permite ws://localhost (o wss://). Un puente en otro equipo de la red necesita TLS, o abrir esta herramienta desde http://localhost.' })]),
      U.nota('Seguridad: el script escucha solo en 127.0.0.1 y rechaza orígenes web no listados (variable ORIGENES). No lo expongas a internet ni a toda tu red sin autenticación: cualquier página podría ordenar a tus dispositivos. Los puentes con claves (p. ej. Home Assistant) deben usarse sin guardar la clave aquí.', 'av'),
      h('div', { cls: 'tr-acciones' }, [h('a', { cls: 'tr-btn tr-pri', href: 'puente/puente-minimo.js', download: 'puente-minimo.js', txt: 'Descargar puente-minimo.js' })])]);
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Puente WebSocket', [
        h('p', { cls: 'tr-sub', txt: 'Para drones (Tello), impresoras de red, domótica y todo lo que no sea accesible directamente desde la web.' }),
        U.campo('Dirección del puente', url), h('label', { cls: 'tr-chk' }, [reco, 'Reconectar automáticamente']), aviso, ctl.el, U.barraPerfil('puente'),
        h('h3', { txt: 'Enviar' }), h('div', { cls: 'tr-etq', txt: 'Plantillas' }), pl, U.campo('Mensaje', msg), h('label', { cls: 'tr-chk' }, [json, 'Validar y enviar como JSON']), h('div', { cls: 'tr-acciones' }, [bEnv, bPing, lat])]),
      U.panel('Registro', [reg.el]),
      U.panel('Cómo montar un puente', [guia])]));
    validar();
  };
})(window);
