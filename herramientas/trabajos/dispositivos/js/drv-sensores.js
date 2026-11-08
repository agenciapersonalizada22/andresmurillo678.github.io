/* Driver de sensores del equipo. conectar('sensores', {movimiento, orientacion, gps, bateria}) (todos true por defecto menos gps).
   Emite {sensor:'movimiento'|'orientacion'|'gps'|'bateria', ...} */
(function (g) {
  'use strict';
  var TD = g.TrabajosDispositivos;
  function r(n, d) { return n == null ? null : Math.round(n * Math.pow(10, d || 2)) / Math.pow(10, d || 2); }
  TD.registrarDriver('sensores', {
    nombre: 'Sensores',
    soportado: function () { return !!(g.DeviceMotionEvent || g.DeviceOrientationEvent || navigator.geolocation || navigator.getBattery); },
    conectar: async function (o, ctx) {
      var q = { movimiento: o.movimiento !== false, orientacion: o.orientacion !== false, gps: !!o.gps, bateria: o.bateria !== false }, quita = [], contadores = { movimiento: 0, orientacion: 0, gps: 0, bateria: 0 };
      var pedir = [g.DeviceMotionEvent, g.DeviceOrientationEvent].filter(function (E) { return E && typeof E.requestPermission === 'function'; });
      for (var i = 0; i < pedir.length; i++) { var res = await pedir[i].requestPermission(); if (res !== 'granted') { var e = new Error('Permiso de sensores denegado.'); e.name = 'NotAllowedError'; throw e; } }
      if (q.movimiento && g.DeviceMotionEvent) {
        var m = function (ev) { var a = ev.accelerationIncludingGravity || {}, l = ev.acceleration || {}, w = ev.rotationRate || {}; contadores.movimiento++; ctx.rx({ sensor: 'movimiento', acel: { x: r(a.x), y: r(a.y), z: r(a.z) }, lineal: { x: r(l.x), y: r(l.y), z: r(l.z) }, giro: { alfa: r(w.alpha), beta: r(w.beta), gamma: r(w.gamma) }, intervalo: ev.interval }); };
        g.addEventListener('devicemotion', m); quita.push(function () { g.removeEventListener('devicemotion', m); });
      }
      if (q.orientacion && g.DeviceOrientationEvent) {
        var oo = function (ev) { contadores.orientacion++; ctx.rx({ sensor: 'orientacion', alfa: r(ev.alpha), beta: r(ev.beta), gamma: r(ev.gamma), absoluto: !!ev.absolute }); };
        g.addEventListener('deviceorientation', oo); quita.push(function () { g.removeEventListener('deviceorientation', oo); });
      }
      if (q.gps && navigator.geolocation) {
        var wid = navigator.geolocation.watchPosition(function (p) { var c = p.coords; contadores.gps++; ctx.rx({ sensor: 'gps', lat: r(c.latitude, 6), lon: r(c.longitude, 6), precision: r(c.accuracy, 1), alt: r(c.altitude, 1), vel: r(c.speed, 2), rumbo: r(c.heading, 0) }); }, function (er) { ctx.error(Object.assign(new Error(er.message), { name: er.code === 1 ? 'NotAllowedError' : 'Error' })); }, { enableHighAccuracy: true, maximumAge: 1000 });
        quita.push(function () { navigator.geolocation.clearWatch(wid); });
      }
      if (q.bateria && navigator.getBattery) {
        try {
          var b = await navigator.getBattery(), bf = function () { contadores.bateria++; ctx.rx({ sensor: 'bateria', nivel: r(b.level * 100, 0), cargando: b.charging, restante: isFinite(b.dischargingTime) ? b.dischargingTime : null }); };
          ['levelchange', 'chargingchange'].forEach(function (n) { b.addEventListener(n, bf); quita.push(function () { b.removeEventListener(n, bf); }); }); bf();
        } catch (er) {}
      }
      return {
        nombre: 'Sensores del equipo', extra: { contadores: contadores, pedidos: q },
        enviar: function () { return Promise.reject(new Error('Los sensores son de solo lectura.')); },
        cerrar: async function () { quita.forEach(function (f) { f(); }); }
      };
    }
  });
})(window);
