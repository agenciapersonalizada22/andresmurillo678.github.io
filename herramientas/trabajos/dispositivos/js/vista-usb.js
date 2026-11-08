/* Pestana USB y HID: listar autorizados, abrir, ver descriptores, enviar/recibir informes y transferencias. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  function hexNum(v) { v = String(v || '').trim(); if (!v) return null; var n = /^0x/i.test(v) ? parseInt(v, 16) : /^[0-9a-f]+$/i.test(v) && /[a-f]/i.test(v) ? parseInt(v, 16) : parseInt(v, 10); if (isNaN(n)) throw new Error('VID/PID no válido: ' + v); return n; }
  function filtros(vid, pid) { var v = hexNum(vid.value), p = hexNum(pid.value); if (v == null) return []; var f = { vendorId: v }; if (p != null) f.productId = p; return [f]; }
  A.iniciarUSB = function () {
    var raiz = document.getElementById('v-usb'), reg = U.registro({ nombre: 'usb-hid', etiqueta: 'Registro USB/HID' });
    var tipo = U.select([['usb', 'WebUSB (interfaz propia)'], ['hid', 'WebHID (mandos, paneles)']], 'usb');
    var vid = h('input', { type: 'text', placeholder: 'VID opcional (ej. 0x2341)', autocomplete: 'off', spellcheck: 'false' }), pid = h('input', { type: 'text', placeholder: 'PID opcional', autocomplete: 'off', spellcheck: 'false' });
    var desc = h('pre', { cls: 'dp-pre', tabindex: '0', 'aria-label': 'Descriptores', txt: 'Conecta un dispositivo para ver sus descriptores.' }), auto = h('ul', { cls: 'dp-autoriz' });
    var acc = h('div', { cls: 'dp-acciones-dev' }), elegido = null;
    A.params.usb = { leer: function () { return { tipo: tipo.value, vendorId: vid.value, productId: pid.value }; }, aplicar: function (p) { tipo.value = p.tipo || 'usb'; vid.value = p.vendorId || ''; pid.value = p.productId || ''; } };
    A.params.hid = A.params.usb;
    var ctl = U.control({
      tipo: 'usb', capId: 'usb', etiqueta: 'Elegir dispositivo y abrir',
      abrir: function () {
        if (!TD.soportado(tipo.value)) return Promise.reject(Object.assign(new Error('Este navegador no ofrece ' + (tipo.value === 'usb' ? 'WebUSB' : 'WebHID') + '.'), { name: 'NotSupportedError' }));
        var d = elegido; elegido = null; return TD.conectar(tipo.value, d ? { dispositivo: d } : { filtros: filtros(vid, pid) });
      },
      alConectar: function (c) {
        var t = c.tipo; reg.add('sys', 'Abierto: ' + c.nombre);
        desc.textContent = (t === 'usb' ? P.formatearUSB(c.h.describir()) : P.formatearHID(c.h.describir())).join('\n');
        c.escuchar(function (ev) { var b = P.aBytes(ev.dir === 'tx' && ev.datos && ev.datos.datos != null ? ev.datos.datos : ev.datos), m = ev.meta || {}; reg.add(ev.dir, (m.reportId != null ? 'informe ' + m.reportId + ' · ' : m.endpoint != null ? 'ep ' + m.endpoint + ' · ' : '') + P.aHex(b) + (b.length ? '  |' + P.aAscii(b) + '|' : '')); }, 'datos');
        acc.textContent = ''; acc.appendChild(t === 'usb' ? accionesUSB(c) : accionesHID(c));
      },
      alCerrar: function (c, ev) { acc.textContent = ''; reg.add('sys', 'Cerrado' + (ev.voluntario ? '' : ': ' + ev.motivo)); },
      alFallar: function (e) { reg.add('err', e.name + ': ' + e.message); }
    });
    function falla(e) { ctl.error(e); reg.add('err', e.name + ': ' + e.message); }
    function accionesUSB(c) {
      var inter = h('input', { type: 'number', min: '0', value: '0', 'aria-label': 'Número de interfaz' }), ep = h('input', { type: 'number', min: '1', max: '15', value: '1', 'aria-label': 'Número de endpoint' }), lon = h('input', { type: 'number', min: '1', value: '64', 'aria-label': 'Bytes a leer' }), hex = h('input', { type: 'text', placeholder: 'bytes hex a enviar', autocomplete: 'off', 'aria-label': 'Bytes hex' });
      var sond = h('input', { type: 'checkbox' }); sond.addEventListener('change', function () { c.h.escuchar(+ep.value, +lon.value, sond.checked); });
      return h('div', {}, [h('h3', { txt: 'Transferencias' }), h('div', { cls: 'tr-fila' }, [U.campo('Interfaz', inter), U.campo('Endpoint', ep), U.campo('Bytes a leer', lon)]),
        h('div', { cls: 'tr-acciones' }, [
          h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Reclamar interfaz', on: { click: function () { c.h.reclamar(+inter.value).then(function () { reg.add('sys', 'Interfaz ' + inter.value + ' reclamada'); }, falla); } } }),
          h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Leer (IN)', on: { click: function () { c.h.leer(+ep.value, +lon.value).catch(falla); } } }),
          h('label', { cls: 'tr-chk dp-chk' }, [sond, 'Leer en bucle'])]),
        U.campo('Enviar (OUT)', hex), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Enviar al endpoint', on: { click: function () { try { c.enviar({ endpoint: +ep.value, datos: { hex: hex.value } }, {}).catch(falla); } catch (e) { falla(e); } } } }),
        h('p', { cls: 'tr-ayuda', txt: 'Antes de leer o escribir hay que reclamar la interfaz que contiene el endpoint (mira «Interfaz» y «Endpoint» arriba en los descriptores).' })]);
    }
    function accionesHID(c) {
      var id = h('input', { type: 'number', min: '0', max: '255', value: '0', 'aria-label': 'ID de informe' }), hex = h('input', { type: 'text', placeholder: 'datos hex', autocomplete: 'off', 'aria-label': 'Datos hex' }), car = h('input', { type: 'checkbox' });
      return h('div', {}, [h('h3', { txt: 'Informes' }), h('p', { cls: 'tr-ayuda', txt: 'Los informes de entrada llegan solos al registro.' }), U.campo('ID de informe', id), U.campo('Datos hex', hex), h('label', { cls: 'tr-chk' }, [car, 'Informe de característica (feature)']),
        h('div', { cls: 'tr-acciones' }, [
          h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Enviar informe', on: { click: function () { try { c.enviar({ reportId: +id.value, datos: { hex: hex.value }, tipo: car.checked ? 'caracteristica' : 'salida' }, {}).catch(falla); } catch (e) { falla(e); } } } }),
          h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Leer característica', on: { click: function () { c.h.recibirCaracteristica(+id.value).catch(falla); } } })])]);
    }
    function listar() {
      auto.textContent = ''; var k = 0;
      ['usb', 'hid'].forEach(function (t) {
        if (!TD.soportado(t)) return;
        TD.driver(t).listarAutorizados().then(function (l) {
          l.forEach(function (d) { k++; auto.appendChild(h('li', {}, [h('b', { txt: t.toUpperCase() + ' · ' + (d.productName || 'sin nombre') }), ' ' + P.hexId(d.vendorId) + ':' + P.hexId(d.productId) + ' ', h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Abrir', on: { click: function () { tipo.value = t; elegido = d; ctl.conectar(); } } })])); });
          if (!k) auto.appendChild(h('li', { cls: 'tr-ayuda', txt: 'Aún no has autorizado ningún dispositivo en este sitio.' }));
        }).catch(function () {});
      });
    }
    var bLis = h('button', { type: 'button', cls: 'tr-btn', txt: 'Ver dispositivos ya autorizados', on: { click: listar } });
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('USB y HID', [
        h('p', { cls: 'tr-sub', txt: 'WebUSB para placas y dispositivos con interfaz propia; WebHID para mandos y paneles. Los teclados, ratones y almacenamiento USB están protegidos y no se pueden abrir.' }),
        U.campo('Tipo', tipo), h('div', { cls: 'tr-fila' }, [U.campo('VID', vid), U.campo('PID', pid)]), ctl.el, bLis, auto, U.barraPerfil('usb')]),
      U.panel('Descriptores', [desc, acc, reg.el])]));
  };
})(window);
