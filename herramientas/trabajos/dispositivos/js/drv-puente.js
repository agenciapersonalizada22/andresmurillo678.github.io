/* Driver de puente WebSocket. conectar('puente', {url, protocolos, reconectar}). Envia/recibe JSON o texto; binario como Uint8Array.
   Protocolo opcional: {"tipo":"ping","t":ms} -> el puente responde {"tipo":"pong","t":ms}. */
(function (g) {
  'use strict';
  var P = g.DispPuro, TD = g.TrabajosDispositivos;
  TD.registrarDriver('puente', {
    nombre: 'Puente WebSocket',
    soportado: function () { return typeof WebSocket === 'function'; },
    conectar: function (o, ctx) {
      var v = P.urlWS(o.url, { protocol: location.protocol });
      if (!v.ok) { var e = new Error(v.error); e.name = 'PuenteError'; return Promise.reject(e); }
      var ws = null, activo = true, intentos = 0, abierto = false, esperas = {}, reco = null;
      function recibir(ev) {
        if (typeof ev.data === 'string') {
          var j = null; try { j = JSON.parse(ev.data); } catch (x) {}
          if (j && j.tipo === 'pong' && esperas[j.t]) { esperas[j.t](performance.now() - j.t); delete esperas[j.t]; }
          ctx.rx(j != null ? j : ev.data, { texto: ev.data });
        } else if (ev.data instanceof ArrayBuffer) ctx.rx(new Uint8Array(ev.data), { binario: true });
        else if (ev.data instanceof Blob) ev.data.arrayBuffer().then(function (b) { ctx.rx(new Uint8Array(b), { binario: true }); });
      }
      function abrir() {
        return new Promise(function (ok, ko) {
          var s; try { s = new WebSocket(v.url, o.protocolos && o.protocolos.length ? o.protocolos : undefined); } catch (x) { x.name = 'PuenteError'; return ko(x); }
          s.binaryType = 'arraybuffer'; ws = s; var visto = false;
          s.onopen = function () { visto = true; abierto = true; intentos = 0; ok(); };
          s.onmessage = recibir;
          s.onerror = function () { if (!visto) { var x = new Error('No se pudo conectar con ' + v.url); x.name = 'PuenteError'; ko(x); } };
          s.onclose = function (ev) {
            abierto = false; if (!visto) { var x = new Error('No se pudo conectar con ' + v.url + ' (código ' + ev.code + ').'); x.name = 'PuenteError'; return ko(x); }
            if (!activo) return;
            if (o.reconectar && intentos < 8) { var esp = Math.min(15000, 1000 * Math.pow(2, intentos++)); ctx.estado('reconectando', 'Reintento ' + intentos + ' en ' + Math.round(esp / 1000) + ' s'); reco = setTimeout(function () { abrir().then(function () { ctx.estado('conectado', 'Reconectado'); }, function () { s.onclose({ code: 1006 }); }); }, esp); }
            else { activo = false; ctx.cerrado('El puente cerró la conexión (código ' + ev.code + ')'); }
          };
        });
      }
      return abrir().then(function () {
        return {
          nombre: v.url, nativo: null, extra: { url: v.url, aviso: v.aviso },
          enviar: function (d) {
            if (!ws || ws.readyState !== 1) return Promise.reject(Object.assign(new Error('El puente no está conectado en este momento.'), { name: 'InvalidStateError' }));
            ws.send(typeof d === 'string' ? d : d instanceof Uint8Array || d instanceof ArrayBuffer ? d : JSON.stringify(d)); return Promise.resolve();
          },
          ping: function () {
            return new Promise(function (ok, ko) {
              if (!ws || ws.readyState !== 1) return ko(new Error('Sin conexión'));
              var t = Math.round(performance.now() * 1000) / 1000; esperas[t] = ok; ws.send(JSON.stringify({ tipo: 'ping', t: t }));
              setTimeout(function () { if (esperas[t]) { delete esperas[t]; ko(new Error('El puente no respondió al ping (¿no implementa pong?)')); } }, 3000);
            });
          },
          cerrar: async function () { activo = false; clearTimeout(reco); if (ws && ws.readyState < 2) ws.close(1000); }
        };
      });
    }
  });
})(window);
