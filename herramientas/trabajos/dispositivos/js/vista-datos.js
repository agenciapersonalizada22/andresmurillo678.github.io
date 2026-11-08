/* Pestanas Perfiles e Historial. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, D = g.DispDatos, h = T.h;
  var NOM = { serial: 'Serie', bluetooth: 'Bluetooth', usb: 'USB/HID', hid: 'HID', camara: 'Cámara', microfono: 'Micrófono', mando: 'Mando', sensores: 'Sensores', puente: 'Puente' };
  var PEST = { serial: 'serial', bluetooth: 'bluetooth', usb: 'usb', hid: 'usb', camara: 'camaras', microfono: 'camaras', mando: 'mandos', sensores: 'sensores', puente: 'puente' };
  A.iniciarPerfiles = function () {
    var raiz = document.getElementById('v-perfiles'), lista = h('ul', { cls: 'dp-lista' }), nom = h('input', { type: 'text', maxlength: '60', autocomplete: 'off' }), tipo = U.select(D.TIPOS.map(function (t) { return [t, NOM[t]]; }), 'serial'), notas = h('textarea', { rows: '2', maxlength: '600' }), par = h('textarea', { rows: '5', spellcheck: 'false' }), idEd = null;
    par.value = '{}'; var msg = h('div'), titulo = h('h2', { txt: 'Nuevo perfil' });
    function limpiar() { idEd = null; nom.value = ''; notas.value = ''; par.value = '{}'; titulo.textContent = 'Nuevo perfil'; msg.textContent = ''; }
    function pintar() {
      D.perfiles().then(function (l) {
        lista.textContent = ''; if (!l.length) return lista.appendChild(h('li', { cls: 'tr-vacio', txt: 'Todavía no hay perfiles. Guarda uno desde cualquier pestaña o créalo aquí.' }));
        l.forEach(function (p) {
          lista.appendChild(h('li', { cls: 'dp-item' }, [h('div', {}, [h('b', { txt: p.nombre }), ' ', h('span', { cls: 'tr-etiq', txt: NOM[p.tipo] }), p.notas ? h('div', { cls: 'tr-ayuda', txt: p.notas }) : null, h('code', { cls: 'dp-code', txt: JSON.stringify(p.parametros) })]),
            h('div', { cls: 'tr-acciones' }, [
              h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Usar', on: { click: function () { var v = A.params[p.tipo]; if (v) v.aplicar(p.parametros || {}); A.ir(PEST[p.tipo]); T.aviso('Perfil aplicado: ' + p.nombre); } } }),
              h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Editar', on: { click: function () { idEd = p.id; nom.value = p.nombre; tipo.value = p.tipo; notas.value = p.notas || ''; par.value = JSON.stringify(p.parametros || {}, null, 2); titulo.textContent = 'Editar perfil'; nom.focus(); } } }),
              h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar', on: { click: function () { if (confirm('¿Borrar el perfil «' + p.nombre + '»?')) D.borrarPerfil(p.id); } } })])]));
        });
      });
    }
    var bGu = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Guardar perfil', on: { click: function () {
      var r = P.parseJSON(par.value); if (!r.ok) return T.aviso(r.error, 'error');
      D.guardarPerfil({ id: idEd, nombre: nom.value, tipo: tipo.value, parametros: r.valor, notas: notas.value }).then(function (x) { T.aviso('Perfil guardado' + (x.quitados.length ? '. Se omitieron datos sensibles: ' + x.quitados.join(', ') : '') + '.'); limpiar(); }, function (e) { T.aviso(e.message, 'error'); });
    } } });
    D.alm.suscribir('perfiles', pintar); pintar();
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel(null, [titulo, U.campo('Nombre', nom), U.campo('Tipo', tipo), U.campo('Parámetros (JSON)', par, 'Ej. serie: {"baudRate":115200}. Cualquier campo llamado clave, token, contraseña o similar se descarta al guardar: las claves nunca se guardan ni se sincronizan.'), U.campo('Notas', notas, 'Las notas se guardan tal cual (y se sincronizan): no escribas claves ni contraseñas aquí.'), h('div', { cls: 'tr-acciones' }, [bGu, h('button', { type: 'button', cls: 'tr-btn', txt: 'Nuevo', on: { click: limpiar } })]), msg]),
      U.panel('Perfiles guardados', [lista])]));
  };
  A.iniciarHistorial = function () {
    var raiz = document.getElementById('v-historial'), lista = h('ul', { cls: 'dp-lista' }), tot = h('p', { cls: 'tr-ayuda' });
    function pintar() {
      D.sesiones().then(function (l) {
        lista.textContent = ''; tot.textContent = l.length + ' sesión(es) guardadas (máx. 300). Solo se guardan contadores, nunca el contenido de los datos.';
        if (!l.length) return lista.appendChild(h('li', { cls: 'tr-vacio', txt: 'Aún no hay sesiones. Cada conexión que cierres quedará aquí.' }));
        l.forEach(function (s) {
          lista.appendChild(h('li', { cls: 'dp-item' }, [h('div', {}, [h('b', { txt: s.nombre || NOM[s.tipo] }), ' ', h('span', { cls: 'tr-etiq', txt: NOM[s.tipo] || s.tipo }),
            h('div', { cls: 'tr-ayuda', txt: new Date(s.inicio).toLocaleString('es') + ' · ' + P.duracion(s.duracion) + ' · ↓ ' + s.rx + ' msg (' + P.formatoBytes(s.bytesRx || 0) + ') · ↑ ' + s.tx + ' msg (' + P.formatoBytes(s.bytesTx || 0) + ')' + (s.error ? ' · error: ' + s.error : '') })]),
            h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar', 'aria-label': 'Borrar sesión', on: { click: function () { D.borrarSesion(s.id); } } })]));
        });
      });
    }
    D.alm.suscribir('sesiones', pintar); pintar();
    raiz.appendChild(U.panel('Historial de sesiones', [tot, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar historial', on: { click: function () { if (confirm('¿Borrar todo el historial de sesiones?')) D.borrarSesiones().then(function () { T.aviso('Historial borrado.'); }); } } })]), lista]));
  };
})(window);
