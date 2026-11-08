/* Drivers WebUSB y WebHID. conectar('usb', {filtros, dispositivo}) / conectar('hid', {filtros, dispositivo}) */
(function (g) {
  'use strict';
  var P = g.DispPuro, TD = g.TrabajosDispositivos;
  function describirUSB(d) {
    return {
      vendorId: d.vendorId, productId: d.productId, productName: d.productName, manufacturerName: d.manufacturerName, serialNumber: d.serialNumber,
      usbVersionMajor: d.usbVersionMajor, usbVersionMinor: d.usbVersionMinor, deviceClass: d.deviceClass,
      configurations: (d.configurations || []).map(function (c) {
        return { configurationValue: c.configurationValue, configurationName: c.configurationName, interfaces: (c.interfaces || []).map(function (i) {
          return { interfaceNumber: i.interfaceNumber, claimed: i.claimed, alternates: (i.alternates || []).map(function (a) { return { alternateSetting: a.alternateSetting, interfaceClass: a.interfaceClass, interfaceSubclass: a.interfaceSubclass, interfaceProtocol: a.interfaceProtocol, endpoints: (a.endpoints || []).map(function (e) { return { endpointNumber: e.endpointNumber, direction: e.direction, type: e.type, packetSize: e.packetSize }; }) }; }) };
        }) };
      })
    };
  }
  TD.registrarDriver('usb', {
    nombre: 'USB',
    soportado: function () { return !!navigator.usb; },
    listarAutorizados: function () { return navigator.usb.getDevices(); },
    conectar: async function (o, ctx) {
      var u = navigator.usb, d = o.dispositivo || await u.requestDevice({ filters: o.filtros || [] }), activo = true, reclamadas = {}, bucles = {};
      await d.open(); if (d.configuration == null && d.configurations && d.configurations.length) await d.selectConfiguration(d.configurations[0].configurationValue);
      var onDes = function (ev) { if (ev.device === d && activo) { activo = false; ctx.cerrado('El dispositivo USB se desconectó'); } };
      u.addEventListener('disconnect', onDes);
      var h = {
        nombre: (d.productName || 'USB') + ' ' + P.hexId(d.vendorId) + ':' + P.hexId(d.productId), nativo: d,
        describir: function () { return describirUSB(d); },
        reclamar: async function (n) { await d.claimInterface(n); reclamadas[n] = 1; },
        liberar: async function (n) { await d.releaseInterface(n); delete reclamadas[n]; },
        escribir: async function (ep, datos) { return d.transferOut(ep, P.aBytes(datos)); },
        leer: async function (ep, n) { var r = await d.transferIn(ep, n || 64); var b = r.data ? new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength) : new Uint8Array(0); ctx.rx(b, { origen: 'transferIn', endpoint: ep, estado: r.status }); return { estado: r.status, bytes: b }; },
        /* sondeo continuo de un endpoint IN */
        escuchar: function (ep, n, on) {
          if (!on) { bucles[ep] = false; return; } if (bucles[ep]) return; bucles[ep] = true;
          (async function () { while (bucles[ep] && activo) { try { await h.leer(ep, n); } catch (e) { if (activo && bucles[ep]) ctx.error(e); bucles[ep] = false; } } })();
        },
        enviar: function (x) { if (x && x.endpoint != null) return h.escribir(x.endpoint, x.datos); return Promise.reject(new Error('Indica {endpoint, datos}.')); },
        cerrar: async function () { activo = false; u.removeEventListener('disconnect', onDes); for (var k in bucles) bucles[k] = false; for (var i in reclamadas) { try { await d.releaseInterface(+i); } catch (e) {} } await d.close(); }
      };
      return h;
    }
  });
  TD.registrarDriver('hid', {
    nombre: 'HID',
    soportado: function () { return !!navigator.hid; },
    listarAutorizados: function () { return navigator.hid.getDevices(); },
    conectar: async function (o, ctx) {
      var hid = navigator.hid, d = o.dispositivo || (await hid.requestDevice({ filters: o.filtros || [] }))[0], activo = true;
      if (!d) { var e = new Error('No se eligió ningún dispositivo HID.'); e.name = 'NotFoundError'; throw e; }
      await d.open();
      var onIn = function (ev) { ctx.rx(new Uint8Array(ev.data.buffer, ev.data.byteOffset, ev.data.byteLength), { origen: 'informe', reportId: ev.reportId }); };
      d.addEventListener('inputreport', onIn);
      var onDes = function (ev) { if (ev.device === d && activo) { activo = false; ctx.cerrado('El dispositivo HID se desconectó'); } };
      hid.addEventListener('disconnect', onDes);
      return {
        nombre: (d.productName || 'HID') + ' ' + P.hexId(d.vendorId) + ':' + P.hexId(d.productId), nativo: d,
        describir: function () { return { vendorId: d.vendorId, productId: d.productId, productName: d.productName, collections: d.collections }; },
        enviar: function (x) {
          x = x || {}; var b = P.aBytes(x.datos);
          return x.tipo === 'caracteristica' ? d.sendFeatureReport(x.reportId || 0, b) : d.sendReport(x.reportId || 0, b);
        },
        recibirCaracteristica: async function (id) { var v = await d.receiveFeatureReport(id || 0); var b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); ctx.rx(b, { origen: 'característica', reportId: id }); return b; },
        cerrar: async function () { activo = false; d.removeEventListener('inputreport', onIn); hid.removeEventListener('disconnect', onDes); await d.close(); }
      };
    }
  });
})(window);
