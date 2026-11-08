/* Driver Web Bluetooth (BLE/GATT). conectar('bluetooth', {todos, nombrePrefijo, servicios:[uuid], dispositivo}) */
(function (g) {
  'use strict';
  var P = g.DispPuro, TD = g.TrabajosDispositivos;
  TD.registrarDriver('bluetooth', {
    nombre: 'Bluetooth LE',
    soportado: function () { return !!navigator.bluetooth; },
    disponible: function () { return navigator.bluetooth && navigator.bluetooth.getAvailability ? navigator.bluetooth.getAvailability() : Promise.resolve(null); },
    conectar: async function (o, ctx) {
      var opcionales = (o.servicios && o.servicios.length ? o.servicios : P.SERVICIOS_COMUNES).map(P.uuid), dev = o.dispositivo;
      if (!dev) {
        var filtro = !o.todos && o.nombrePrefijo ? { filters: [{ namePrefix: o.nombrePrefijo }], optionalServices: opcionales } : { acceptAllDevices: true, optionalServices: opcionales };
        dev = await navigator.bluetooth.requestDevice(filtro);
      }
      var activo = true, srv = await dev.gatt.connect(), notis = {}, chars = {};
      var onDes = function () { if (activo) { activo = false; ctx.cerrado('El dispositivo Bluetooth se desconectó'); } };
      dev.addEventListener('gattserverdisconnected', onDes);
      function clave(s, c) { return P.uuid(s) + '/' + P.uuid(c); }
      async function car(s, c) {
        var k = clave(s, c); if (chars[k]) return chars[k];
        var sv = await srv.getPrimaryService(P.uuid(s)); return (chars[k] = await sv.getCharacteristic(P.uuid(c)));
      }
      function meta(s, c, origen) { return { origen: origen, servicio: P.uuidCorto(P.uuid(s)), caracteristica: P.uuidCorto(P.uuid(c)) }; }
      var h = {
        nombre: dev.name || 'Bluetooth sin nombre', nativo: dev, extra: { idDispositivo: dev.id },
        /* descubre servicios y caracteristicas (solo los declarados como opcionales son visibles) */
        servicios: async function () {
          var sal = [], ss = await srv.getPrimaryServices();
          for (var i = 0; i < ss.length; i++) {
            var cs = [], lista = []; try { lista = await ss[i].getCharacteristics(); } catch (e) {}
            lista.forEach(function (c) { chars[ss[i].uuid + '/' + c.uuid] = c; cs.push({ uuid: c.uuid, nombre: P.nombreCaracteristica(c.uuid), props: P.propsLista(c.properties), crudas: c.properties }); });
            sal.push({ uuid: ss[i].uuid, nombre: P.nombreServicio(ss[i].uuid), caracteristicas: cs });
          }
          return sal;
        },
        leer: async function (s, c) { var v = await (await car(s, c)).readValue(), u = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); ctx.rx(u, meta(s, c, 'leer')); return u; },
        escribir: async function (s, c, datos, sinRespuesta) {
          var ch = await car(s, c), b = P.aBytes(datos);
          if (sinRespuesta && ch.writeValueWithoutResponse) await ch.writeValueWithoutResponse(b); else if (ch.writeValueWithResponse) await ch.writeValueWithResponse(b); else await ch.writeValue(b);
        },
        notificar: async function (s, c, on) {
          var k = clave(s, c), ch = await car(s, c);
          if (on && !notis[k]) {
            notis[k] = function (ev) { var v = ev.target.value; ctx.rx(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), meta(s, c, 'notificación')); };
            ch.addEventListener('characteristicvaluechanged', notis[k]); await ch.startNotifications();
          } else if (!on && notis[k]) { ch.removeEventListener('characteristicvaluechanged', notis[k]); delete notis[k]; await ch.stopNotifications(); }
        },
        bateria: async function () { try { var u = await h.leer(0x180F, 0x2A19); return u[0]; } catch (e) { return null; } },
        enviar: function (d, o) {
          if (d && d.servicio && d.caracteristica) return h.escribir(d.servicio, d.caracteristica, d.valor, d.sinRespuesta);
          return Promise.reject(new Error('Indica {servicio, caracteristica, valor}.'));
        },
        cerrar: async function () {
          activo = false; dev.removeEventListener('gattserverdisconnected', onDes);
          for (var k in notis) { try { var p = k.split('/'); var ch = await car(p[0], p[1]); ch.removeEventListener('characteristicvaluechanged', notis[k]); await ch.stopNotifications(); } catch (e) {} }
          if (dev.gatt.connected) dev.gatt.disconnect();
        }
      };
      return h;
    }
  });
})(window);
