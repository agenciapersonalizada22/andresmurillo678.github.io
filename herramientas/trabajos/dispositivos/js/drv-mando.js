/* Driver de mandos (Gamepad API). conectar('mando', {indice}) emite estado ~30 Hz; enviar({vibrar:{fuerte,suave,ms}}) */
(function (g) {
  'use strict';
  var TD = g.TrabajosDispositivos;
  function pads() { var l = navigator.getGamepads ? navigator.getGamepads() : []; return Array.prototype.filter.call(l, function (p) { return p && p.connected; }); }
  function foto(p) {
    return { indice: p.index, id: p.id, mapeo: p.mapping, botones: Array.prototype.map.call(p.buttons, function (b) { return Math.round(b.value * 100) / 100; }), ejes: Array.prototype.map.call(p.axes, function (a) { return Math.round(a * 100) / 100; }) };
  }
  TD.registrarDriver('mando', {
    nombre: 'Mando',
    soportado: function () { return typeof navigator.getGamepads === 'function'; },
    listar: function () { return pads().map(function (p) { return { indice: p.index, id: p.id, mapeo: p.mapping, botones: p.buttons.length, ejes: p.axes.length }; }); },
    conectar: async function (o, ctx) {
      var l = pads(), p = o.indice != null ? l.filter(function (x) { return x.index === +o.indice; })[0] : l[0];
      if (!p) { var e = new Error('No se detecta ningún mando. Conéctalo y pulsa un botón para que el navegador lo muestre.'); e.name = 'NotFoundError'; throw e; }
      var idx = p.index, activo = true, ultimo = '', t = setInterval(function () {
        var q = navigator.getGamepads()[idx];
        if (!q || !q.connected) { if (activo) { activo = false; clearInterval(t); ctx.cerrado('El mando se desconectó'); } return; }
        var f = foto(q), s = JSON.stringify([f.botones, f.ejes]); if (s !== ultimo) { ultimo = s; ctx.rx(f); }
      }, 33);
      return {
        nombre: p.id, nativo: p, extra: { indice: idx },
        enviar: async function (x) {
          var q = navigator.getGamepads()[idx], v = x && x.vibrar; if (!q || !v) throw new Error('Usa {vibrar:{fuerte,suave,ms}}.');
          var a = q.vibrationActuator; if (!a || !a.playEffect) throw Object.assign(new Error('Este mando o navegador no admite vibración.'), { name: 'NotSupportedError' });
          await a.playEffect('dual-rumble', { duration: v.ms || 200, strongMagnitude: v.fuerte == null ? 1 : v.fuerte, weakMagnitude: v.suave == null ? 0.5 : v.suave });
        },
        cerrar: async function () { activo = false; clearInterval(t); }
      };
    }
  });
})(window);
