/* Driver Web Serial. conectar('serial', {baudRate, dataBits, stopBits, parity, flowControl, dtr, rts, filtros, puerto}) */
(function (g) {
  'use strict';
  var P = g.DispPuro, TD = g.TrabajosDispositivos;
  TD.registrarDriver('serial', {
    nombre: 'Puerto serie',
    soportado: function () { return !!navigator.serial; },
    listarAutorizados: function () { return navigator.serial.getPorts(); },
    conectar: async function (o, ctx) {
      var s = navigator.serial, port = o.puerto || await s.requestPort(o.filtros ? { filters: o.filtros } : {});
      await port.open({ baudRate: +o.baudRate || 9600, dataBits: +o.dataBits || 8, stopBits: +o.stopBits || 1, parity: o.parity || 'none', flowControl: o.flowControl || 'none', bufferSize: 4096 });
      if (o.dtr != null || o.rts != null) { try { await port.setSignals({ dataTerminalReady: !!o.dtr, requestToSend: !!o.rts }); } catch (e) {} }
      var activo = true, reader = null, info = {}; try { info = port.getInfo() || {}; } catch (e) {}
      var fin = (async function () {
        while (activo && port.readable) {
          reader = port.readable.getReader();
          try { for (;;) { var r = await reader.read(); if (r.done) break; if (r.value && r.value.length) ctx.rx(r.value); } }
          catch (e) { if (activo) ctx.error(e); }
          finally { try { reader.releaseLock(); } catch (e) {} }
        }
        if (activo) { activo = false; ctx.cerrado('El puerto se desconectó'); }
      })();
      var onDes = function (ev) { if (ev.target === port && activo) { activo = false; ctx.cerrado('El dispositivo serie se desconectó'); } };
      s.addEventListener('disconnect', onDes);
      var nombre = 'Serie ' + (info.usbVendorId != null ? P.hexId(info.usbVendorId) + ':' + P.hexId(info.usbProductId) : '(sin VID/PID)') + ' @' + (+o.baudRate || 9600);
      return {
        nombre: nombre, nativo: port, extra: { info: info },
        enviar: async function (datos) { var w = port.writable.getWriter(); try { await w.write(P.aBytes(datos)); } finally { w.releaseLock(); } },
        senales: function (x) { return port.setSignals(x); },
        leerSenales: function () { return port.getSignals(); },
        cerrar: async function () {
          activo = false; s.removeEventListener('disconnect', onDes);
          try { if (reader) await reader.cancel(); } catch (e) {}
          await fin.catch(function () {}); await port.close();
        }
      };
    }
  });
})(window);
