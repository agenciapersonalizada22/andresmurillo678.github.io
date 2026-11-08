/* Pestana Bluetooth LE: elegir dispositivo, explorar GATT, leer/escribir/notificar, bateria. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  A.iniciarBluetooth = function () {
    var raiz = document.getElementById('v-bluetooth'), reg = U.registro({ nombre: 'bluetooth', etiqueta: 'Registro Bluetooth' });
    var prefijo = h('input', { type: 'text', placeholder: 'Opcional: nombre empieza por…', autocomplete: 'off' }), servs = h('input', { type: 'text', placeholder: 'UUID extra separados por coma (ej. 180d, 6e400001-…)', autocomplete: 'off', spellcheck: 'false' });
    var arbol = h('div', { cls: 'dp-arbol' }), bat = h('div', { cls: 'dp-bat', hidden: true }), modo = U.select([['hex', 'Hex'], ['auto', 'Interpretar si se conoce']], 'auto');
    function lista() { return servs.value.split(/[,\s]+/).filter(Boolean); }
    A.params.bluetooth = { leer: function () { return { nombrePrefijo: prefijo.value, servicios: lista() }; }, aplicar: function (p) { prefijo.value = p.nombrePrefijo || ''; servs.value = (p.servicios || []).join(', '); } };
    var actual = null, avisoLeido = function (u, m) { return modo.value === 'auto' && m.caracteristica ? P.interpretar(P.uuid(m.caracteristica), u) : P.aHex(u); };
    var ctl = U.control({
      tipo: 'bluetooth', etiqueta: 'Buscar y conectar',
      abrir: function () {
        var sv; try { sv = lista().map(P.uuid); } catch (e) { return Promise.reject(Object.assign(e, { name: 'TypeError' })); }
        return TD.conectar('bluetooth', { nombrePrefijo: prefijo.value.trim(), todos: !prefijo.value.trim(), servicios: sv.length ? P.SERVICIOS_COMUNES.map(P.uuid).concat(sv) : null });
      },
      alConectar: function (c) {
        actual = c; reg.add('sys', 'Conectado a ' + c.nombre); arbol.textContent = '';
        c.escuchar(function (ev) {
          var m = ev.meta || {}, txt = ev.dir === 'rx' ? (m.origen || 'dato') + ' ' + (m.caracteristica || '') + ': ' + avisoLeido(ev.datos, m) : 'escribir ' + P.uuidCorto(P.uuid(ev.datos.caracteristica)) + ' ← ' + P.aHex(P.aBytes(ev.datos.valor));
          reg.add(ev.dir, txt);
        }, 'datos');
        c.h.servicios().then(function (ss) { pintar(c, ss); }, function (e) { ctl.error(e); });
        c.h.bateria().then(function (n) { bat.hidden = n == null; bat.textContent = n == null ? '' : 'Batería: ' + n + ' %'; });
      },
      alCerrar: function (c, ev) { actual = null; bat.hidden = true; reg.add('sys', 'Desconectado' + (ev.voluntario ? '' : ': ' + ev.motivo)); },
      alFallar: function (e) { reg.add('err', e.name + ': ' + e.message); }
    });
    function pintar(c, ss) {
      arbol.textContent = '';
      if (!ss.length) return arbol.appendChild(U.nota('No se vieron servicios. Web Bluetooth solo muestra los que declaras: añade sus UUID en «Servicios extra» y vuelve a conectar.', 'av'));
      ss.forEach(function (s) {
        var d = h('details', { cls: 'dp-det', open: true }, [h('summary', { txt: (s.nombre || 'Servicio') + ' · ' + P.uuidCorto(s.uuid) })]);
        s.caracteristicas.forEach(function (k) {
          var fila = h('div', { cls: 'dp-car' }, [h('div', {}, [h('b', { txt: k.nombre || 'Característica' }), h('span', { cls: 'tr-etiq', txt: P.uuidCorto(k.uuid) })]), h('div', { cls: 'tr-ayuda', txt: k.props.join(' · ') || 'sin propiedades' })]);
          var ac = h('div', { cls: 'tr-acciones' });
          if (k.crudas.read) ac.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Leer', on: { click: function () { c.h.leer(s.uuid, k.uuid).catch(function (e) { ctl.error(e); reg.add('err', e.message); }); } } }));
          if (k.crudas.notify || k.crudas.indicate) {
            var on = false, b = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Suscribir', 'aria-pressed': 'false' });
            b.addEventListener('click', function () { c.h.notificar(s.uuid, k.uuid, !on).then(function () { on = !on; b.textContent = on ? 'Dejar de suscribir' : 'Suscribir'; b.setAttribute('aria-pressed', on); reg.add('sys', (on ? 'Suscrito a ' : 'Fin de suscripción a ') + P.uuidCorto(k.uuid)); }, function (e) { ctl.error(e); reg.add('err', e.message); }); });
            ac.appendChild(b);
          }
          if (k.crudas.write || k.crudas.writeWithoutResponse) {
            var ent = h('input', { type: 'text', placeholder: 'hex o texto', 'aria-label': 'Valor a escribir en ' + (k.nombre || k.uuid), autocomplete: 'off' }), esH = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Es hex' });
            ac.appendChild(ent); ac.appendChild(h('label', { cls: 'tr-chk dp-chk' }, [esH, 'hex']));
            ac.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Escribir', on: { click: function () {
              try { var v = esH.checked ? { hex: ent.value } : P.escapes(ent.value); c.enviar({ servicio: s.uuid, caracteristica: k.uuid, valor: P.aBytes(v), sinRespuesta: !k.crudas.write }, { meta: {} }).catch(function (e) { ctl.error(e); reg.add('err', e.message); }); } catch (e) { T.aviso(e.message, 'error'); }
            } } }));
          }
          fila.appendChild(ac); d.appendChild(fila);
        });
        arbol.appendChild(d);
      });
    }
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Bluetooth de baja energía (BLE)', [
        h('p', { cls: 'tr-sub', txt: 'Chrome no permite escanear en segundo plano: al pulsar el botón abre su propio selector con los dispositivos cercanos. Solo BLE (no audio ni Bluetooth clásico).' }),
        U.campo('Filtrar por nombre', prefijo), U.campo('Servicios extra a explorar', servs, 'El navegador solo deja ver servicios declarados de antemano; ya se incluyen los más comunes (batería, información, frecuencia cardíaca, UART Nordic).'),
        U.campo('Mostrar valores', modo), ctl.el, bat, U.barraPerfil('bluetooth')]),
      U.panel('Servicios y características', [arbol, reg.el])]));
  };
})(window);
