/* Vista «Ajustes»: proyectos (zonas, lineas, ajustes), puente de mensajes, notificaciones, privacidad y cuenta. window.VAjustes */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, D = g.VDatos, CC = g.CuentaTrabajos, U = g.VAjustes = {}, el = {};
  async function lista() {
    var ps = await D.proyectos(); el.sel.textContent = ''; el.sel.appendChild(h('option', { value: '', txt: ps.length ? '— elige un proyecto —' : '(sin proyectos guardados)' }));
    ps.forEach(function (p) { el.sel.appendChild(h('option', { value: p.id, txt: p.nombre })); }); if (V.proyecto && V.proyecto.id) el.sel.value = V.proyecto.id; el.nombre.value = V.proyecto && V.proyecto.nombre || '';
  }
  U.recargar = lista;
  async function guardar(comoNuevo) {
    var n = el.nombre.value.trim() || 'Proyecto ' + new Date().toLocaleDateString('es'), p = V.proyectoActual(); p.nombre = n; if (comoNuevo) delete p.id; if (!p.id) delete p.id;
    var r = await D.guardarProyecto(p); V.proyecto = r; await lista(); el.sel.value = r.id; T.aviso('Proyecto guardado (zonas, líneas y ajustes; sin videos).'); if (CC) CC.logro && CC.logro('primer_proyecto_video');
  }
  U.iniciar = function (cont) {
    el.nombre = h('input', { type: 'text', id: 'aj-nom', maxlength: 60, placeholder: 'Ej.: Pasillo de entrada' }); el.sel = h('select', { id: 'aj-sel' });
    el.sel.addEventListener('change', async function () { if (!el.sel.value) return; var p = await D.alm.get('proyectos', el.sel.value); if (p) { V.aplicarProyecto(p); el.nombre.value = p.nombre; T.aviso('Proyecto cargado: ' + p.nombre); if (g.VMotor.activo()) g.VMotor.reiniciar(); } });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Proyectos' }), h('p', { cls: 'tr-sub', txt: 'Un proyecto guarda tus zonas, máscaras, líneas virtuales, sensibilidad, color objetivo y eventos de IA. Las reglas se guardan aparte. Ni los videos, ni las capturas, ni tu clave de IA se guardan en la nube.' }), h('label', { for: 'aj-sel', txt: 'Proyecto' }), el.sel, h('label', { for: 'aj-nom', txt: 'Nombre' }), el.nombre,
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar', on: { click: function () { guardar(false); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Guardar como nuevo', on: { click: function () { guardar(true); } } }), h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar', on: { click: async function () { if (!el.sel.value || !confirm('¿Borrar este proyecto?')) return; await D.borrarProyecto(el.sel.value); if (V.proyecto && V.proyecto.id === el.sel.value) V.proyecto = null; await lista(); } } })])]));
    var url = h('input', { type: 'text', id: 'aj-pu', value: 'ws://localhost:8787', 'aria-label': 'URL del puente' }), est = h('p', { cls: 'tr-ayuda', role: 'status' });
    var TD = g.TrabajosDispositivos;
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Puente de mensajes' }), h('p', { cls: 'tr-sub', txt: 'La acción «Mensaje a dispositivo / puente» envía por un puente WebSocket local (ver módulo Dispositivos). Desde una página HTTPS solo se permite ws://localhost o wss://.' }), h('label', { for: 'aj-pu', txt: 'URL del puente' }), url,
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Conectar puente', disabled: !(TD && TD.soportado && TD.soportado('puente')), on: { click: async function () { try { var c = await TD.conectar('puente', { url: url.value.trim(), reconectar: true }); est.textContent = 'Conectado: ' + c.nombre; } catch (e) { est.textContent = e.message || String(e); } } } }), h('a', { cls: 'tr-btn', href: '../dispositivos/', txt: 'Abrir Dispositivos' })]), est]));
    var nt = h('p', { cls: 'tr-ayuda', role: 'status', txt: g.Notification ? 'Permiso de notificaciones: ' + Notification.permission : 'Este navegador no tiene notificaciones; se usan avisos en pantalla.' });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Notificaciones' }), nt, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Permitir notificaciones', disabled: !g.Notification, on: { click: function () { Notification.requestPermission().then(function (p) { nt.textContent = 'Permiso de notificaciones: ' + p; }); } } })])]));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Privacidad y límites' }), h('ul', { cls: 'vi-lista' }, [
      h('li', { txt: 'Todo el análisis (movimiento, blobs, líneas, escenas, calidad, color, QR) corre en tu dispositivo y no usa modelos descargados ni servicios externos.' }), h('li', { txt: 'Solo se envían fotogramas a una IA si guardas tu clave, marcas el consentimiento y lo confirmas; cada envío respeta tus límites.' }), h('li', { txt: 'Los clips y capturas viven en la memoria de la pestaña hasta que los descargues. El buffer de pre-roll nunca se guarda por sí solo.' }), h('li', { txt: 'El indicador de grabación siempre es visible cuando la cámara, pantalla o el buffer están activos.' }),
      h('li', { txt: 'Grabar a personas o vigilar espacios puede estar regulado: avisa, respeta la ley local y no uses esto para espiar.' }), h('li', { txt: 'Limitaciones honestas: la detección de movimiento no distingue personas de objetos, los cambios de escena graduales (fundidos) no se detectan, y la IA puede equivocarse.' })])]));
    cont.appendChild(h('div', { cls: 'tr-panel', id: 'aj-cuenta' }, []));
    lista();
  };
})(window);
