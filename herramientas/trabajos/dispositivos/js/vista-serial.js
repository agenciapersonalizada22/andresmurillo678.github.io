/* Pestana Serial: terminal con baudios, enviar/recibir texto o hex, registro y exportacion. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, h = T.h;
  A.iniciarSerial = function () {
    var raiz = document.getElementById('v-serial'), reg = U.registro({ nombre: 'serie', etiqueta: 'Terminal serie' });
    var baud = U.select(P.BAUDIOS.concat(['otro']).map(function (b) { return [String(b), b === 'otro' ? 'Otro…' : String(b)]; }), '115200'), baudO = h('input', { type: 'number', min: '50', max: '4000000', placeholder: 'Baudios', hidden: true });
    var bits = U.select(['8', '7', '6', '5'], '8'), stop = U.select(['1', '2'], '1'), par = U.select([['none', 'Ninguna'], ['even', 'Par'], ['odd', 'Impar']], 'none'), flujo = U.select([['none', 'Ninguno'], ['hardware', 'RTS/CTS']], 'none');
    var modoRx = U.select([['texto', 'Texto'], ['hex', 'Hex'], ['mixto', 'Hex + ASCII']], 'texto'), fin = U.select([['lf', 'LF (\\n)'], ['crlf', 'CR+LF'], ['cr', 'CR (\\r)'], ['ninguno', 'Ninguno']], 'lf');
    var envHex = h('input', { type: 'checkbox' }), dtr = h('input', { type: 'checkbox' }), rts = h('input', { type: 'checkbox' });
    var txt = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Escribe y pulsa Enviar (admite \\n \\r \\t \\xNN)', 'aria-label': 'Texto a enviar' });
    var bEnv = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Enviar', disabled: true }), cont = h('span', { cls: 'tr-ayuda', txt: '' });
    var dec = null, lineas = new P.LineaBuf(), rx = 0, tx = 0;
    baud.addEventListener('change', function () { baudO.hidden = baud.value !== 'otro'; });
    function baudios() { return baud.value === 'otro' ? (+baudO.value || 9600) : +baud.value; }
    function params() { return { baudRate: baudios(), dataBits: +bits.value, stopBits: +stop.value, parity: par.value, flowControl: flujo.value, finLinea: fin.value, modoRx: modoRx.value, dtr: dtr.checked, rts: rts.checked }; }
    A.params.serial = {
      leer: params,
      aplicar: function (p) {
        if (p.baudRate) { if (P.BAUDIOS.indexOf(+p.baudRate) >= 0) baud.value = String(p.baudRate); else { baud.value = 'otro'; baudO.value = p.baudRate; } baudO.hidden = baud.value !== 'otro'; }
        if (p.dataBits) bits.value = String(p.dataBits); if (p.stopBits) stop.value = String(p.stopBits); if (p.parity) par.value = p.parity; if (p.flowControl) flujo.value = p.flowControl;
        if (p.finLinea) fin.value = p.finLinea; if (p.modoRx) modoRx.value = p.modoRx; dtr.checked = !!p.dtr; rts.checked = !!p.rts;
      }
    };
    var ctl = U.control({
      tipo: 'serial', etiqueta: 'Elegir puerto y conectar',
      abrir: function () { var p = params(); return g.TrabajosDispositivos.conectar('serial', p); },
      alConectar: function (c) {
        dec = P.decodificador(); lineas = new P.LineaBuf(); rx = tx = 0; bEnv.disabled = false; reg.add('sys', 'Conectado a ' + c.nombre + ' (' + baudios() + ' baudios, ' + bits.value + (par.value === 'none' ? 'N' : par.value === 'even' ? 'E' : 'O') + stop.value + ')');
        c.escuchar(function (ev) {
          var u = ev.datos;
          if (ev.dir === 'rx') {
            rx += u.length;
            if (modoRx.value === 'texto') { lineas.push(dec.push(u)).forEach(function (l) { reg.add('rx', l); }); }
            else reg.add('rx', U.mostrarBytes(u, modoRx.value));
          } else { tx += P.aBytes(u).length; reg.add('tx', ev.meta && ev.meta.vista ? ev.meta.vista : (typeof u === 'string' ? u.replace(/\r/g, '\\r').replace(/\n/g, '\\n') : P.aHex(P.aBytes(u)))); }
          cont.textContent = 'Recibido ' + P.formatoBytes(rx) + ' · enviado ' + P.formatoBytes(tx);
        }, 'datos');
      },
      alCerrar: function (c, ev) { bEnv.disabled = true; var r = lineas.resto(); if (r) reg.add('rx', r); reg.add('sys', 'Desconectado' + (ev.voluntario ? '' : ': ' + ev.motivo)); },
      alFallar: function (e) { reg.add('err', e.name + ': ' + e.message); }
    });
    function enviar() {
      var c = ctl.actual(); if (!c) return;
      try {
        var b, vista;
        if (envHex.checked) { b = P.parseHex(txt.value); vista = P.aHex(b); }
        else { var s = P.escapes(txt.value) + P.FINES[fin.value]; b = P.aBytes(s); vista = txt.value + ' ' + (fin.value === 'ninguno' ? '' : '⏎'); }
        if (!b.length) return;
        c.enviar(b, { meta: { vista: vista } }).then(function () { txt.value = ''; txt.focus(); }, function (e) { ctl.error(e); reg.add('err', e.message); });
      } catch (e) { T.aviso(e.message, 'error'); }
    }
    bEnv.addEventListener('click', enviar); txt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
    dtr.addEventListener('change', function () { var c = ctl.actual(); if (c && c.h.senales) c.h.senales({ dataTerminalReady: dtr.checked, requestToSend: rts.checked }).catch(function (e) { ctl.error(e); }); });
    rts.addEventListener('change', function () { dtr.dispatchEvent(new Event('change')); });
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Puerto serie', [
        h('p', { cls: 'tr-sub', txt: 'Arduino, ESP32, GPS, lectores… cualquier dispositivo que se vea como puerto serie. Solo Chrome/Edge de escritorio.' }),
        h('div', { cls: 'tr-fila' }, [U.campo('Baudios', baud), baudO, U.campo('Bits de datos', bits), U.campo('Paridad', par), U.campo('Bits de parada', stop), U.campo('Control de flujo', flujo)]),
        h('div', { cls: 'tr-fila' }, [h('label', { cls: 'tr-chk' }, [dtr, 'DTR']), h('label', { cls: 'tr-chk' }, [rts, 'RTS'])]),
        ctl.el, U.barraPerfil('serial')]),
      U.panel('Terminal', [
        h('div', { cls: 'tr-fila' }, [U.campo('Mostrar recibido como', modoRx), U.campo('Terminar envío con', fin)]),
        reg.el,
        h('div', { cls: 'dp-envio' }, [txt, bEnv]), h('label', { cls: 'tr-chk' }, [envHex, 'Enviar como bytes hex (ej. 48 65 6C 6C 6F)']), cont])]));
  };
})(window);
