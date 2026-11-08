/* Estado compartido y componentes de interfaz del panel: registro (log), control de conexion, barra de perfiles. window.DispApp / DispUI */
(function (g) {
  'use strict';
  var T = g.Tr, P = g.DispPuro, TD = g.TrabajosDispositivos, D = g.DispDatos, h = T.h;
  var A = g.DispApp = { escuchas: {}, vistas: {}, params: {} };
  A.on = function (ev, fn) { (A.escuchas[ev] = A.escuchas[ev] || []).push(fn); };
  A.emitir = function (ev, d) { (A.escuchas[ev] || []).forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); };
  A.ir = function (v) { if (A.tabs) A.tabs.ir(v); };
  /* cada vista registra como leer/aplicar sus parametros para los perfiles */
  A.params = {};
  var U = g.DispUI = {};

  U.hora = function (t) { var d = new Date(t || Date.now()); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2) + '.' + ('00' + d.getMilliseconds()).slice(-3); };
  U.campo = function (etq, el, ayuda, id) {
    id = id || 'c-' + Math.random().toString(36).slice(2, 7); el.id = id;
    return h('div', {}, [h('label', { for: id, txt: etq }), el, ayuda ? h('p', { cls: 'tr-ayuda', txt: ayuda }) : null]);
  };
  U.select = function (ops, valor) {
    var s = h('select'); ops.forEach(function (o) { var a = Array.isArray(o) ? o : [o, o]; s.appendChild(h('option', { value: a[0], txt: a[1] })); });
    if (valor != null) s.value = String(valor); return s;
  };
  U.nota = function (txt, tipo) { return h('div', { cls: 'tr-nota' + (tipo ? ' tr-' + tipo : ''), role: tipo === 'mal' ? 'alert' : null, txt: txt }); };
  U.bytes = P.formatoBytes;

  /* ---------- registro ---------- */
  /* registro({max}) -> {el, add(dir,txt), limpiar(), entradas(), n()}; dir: rx|tx|sys|err */
  U.registro = function (opts) {
    opts = opts || {}; var MAX = opts.max || 2000, VIS = 400, ent = [], auto = true, filtro = 'todo';
    var caja = h('div', { cls: 'dp-reg', role: 'log', 'aria-label': opts.etiqueta || 'Registro', tabindex: '0' }), cnt = h('span', { cls: 'tr-ayuda', txt: '0 líneas' });
    var sel = U.select([['todo', 'Todo'], ['rx', 'Solo recibido'], ['tx', 'Solo enviado']], 'todo'); sel.setAttribute('aria-label', 'Filtrar registro');
    var chk = h('input', { type: 'checkbox', checked: true });
    function fila(e) {
      var f = h('div', { cls: 'dp-lin dp-l-' + e.dir }, [h('span', { cls: 'dp-t', txt: U.hora(e.t) }), h('span', { cls: 'dp-d', 'aria-hidden': 'true', txt: { rx: '◀', tx: '▶', sys: '•', err: '!' }[e.dir] }), h('span', { cls: 'dp-x', txt: e.txt })]);
      f.setAttribute('aria-label', ({ rx: 'Recibido', tx: 'Enviado', sys: 'Sistema', err: 'Error' })[e.dir]); return f;
    }
    function pintarTodo() { caja.textContent = ''; ent.filter(visible).slice(-VIS).forEach(function (e) { caja.appendChild(fila(e)); }); bajar(); }
    function visible(e) { return filtro === 'todo' || e.dir === filtro || e.dir === 'err' || (e.dir === 'sys' && filtro === 'todo'); }
    function bajar() { if (auto) caja.scrollTop = caja.scrollHeight; }
    var R = {
      el: null,
      add: function (dir, txt) {
        var e = { t: Date.now(), dir: dir, txt: String(txt) }; ent.push(e); if (ent.length > MAX) ent.shift();
        cnt.textContent = ent.length + ' líneas';
        if (!visible(e)) return; caja.appendChild(fila(e)); while (caja.childNodes.length > VIS) caja.removeChild(caja.firstChild); bajar();
      },
      limpiar: function () { ent = []; caja.textContent = ''; cnt.textContent = '0 líneas'; },
      entradas: function () { return ent.slice(); },
      n: function () { return ent.length; }
    };
    function exportar(fmt) {
      if (!ent.length) return T.aviso('No hay nada que exportar todavía.');
      T.descargar(new Blob(['﻿' + P.exportarLog(ent, fmt)], { type: fmt === 'csv' ? 'text/csv' : 'text/plain' }), T.nombreArchivo(opts.nombre || 'registro') + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + (fmt === 'csv' ? 'csv' : 'txt'));
    }
    sel.addEventListener('change', function () { filtro = sel.value; pintarTodo(); });
    chk.addEventListener('change', function () { auto = chk.checked; bajar(); });
    R.el = h('div', { cls: 'dp-regcaja' }, [
      h('div', { cls: 'dp-regbarra' }, [
        h('label', { cls: 'tr-chk dp-chk' }, [chk, 'Autodesplazar']), sel,
        h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Limpiar', on: { click: R.limpiar } }),
        h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Exportar TXT', on: { click: function () { exportar('txt'); } } }),
        h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Exportar CSV', on: { click: function () { exportar('csv'); } } }), cnt
      ]), caja]);
    return R;
  };

  /* formatea bytes recibidos segun modo: texto | hex | mixto */
  U.mostrarBytes = function (u, modo) { return modo === 'hex' ? P.aHex(u) : modo === 'mixto' ? P.aHex(u) + '  |' + P.aAscii(u) + '|' : null; };

  /* ---------- control de conexion ---------- */
  /* control({tipo, abrir():Promise<Conexion>, alConectar(c), alCerrar(c,ev), etiqueta}) -> {el, actual(), conectar(), cerrar(), error(e)} */
  U.control = function (o) {
    var c = null, ocupado = false, soportado = TD.soportado(o.tipo);
    var estado = h('span', { cls: 'dp-estado dp-e-cerrado', role: 'status', txt: 'Desconectado' }), caja = h('div', { cls: 'dp-err', hidden: true });
    var bCon = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: o.etiqueta || 'Conectar' }), bDes = h('button', { type: 'button', cls: 'tr-btn', txt: 'Desconectar', disabled: true });
    var raiz = h('div', { cls: 'dp-ctl' }, [h('div', { cls: 'tr-acciones dp-acc' }, [bCon, bDes, estado]), caja]);
    function ver(txt, cls) { estado.className = 'dp-estado dp-e-' + cls; estado.textContent = txt; }
    function error(e) {
      var x = P.explicarError(e, o.tipo); caja.hidden = false; caja.textContent = '';
      if (e && (e.name === 'NotFoundError' && /no device selected|no port selected|user cancelled|cancelled|No se eligió/i.test(e.message || '')) || (e && e.name === 'NotFoundError' && /selected/i.test(e.message || ''))) x.titulo = 'No se eligió ningún dispositivo';
      caja.appendChild(h('b', { txt: x.titulo })); caja.appendChild(h('p', { txt: x.texto })); if (x.sugerencias.length) caja.appendChild(h('ul', {}, x.sugerencias.map(function (s) { return h('li', { txt: s }); })));
    }
    function limpiarErr() { caja.hidden = true; caja.textContent = ''; }
    function refrescar() { bCon.disabled = ocupado || !!c || !soportado; bDes.disabled = !c; }
    var R = {
      el: raiz, actual: function () { return c; }, error: error,
      conectar: function () {
        if (c || ocupado) return Promise.resolve(c); ocupado = true; limpiarErr(); ver('Conectando…', 'conectando'); refrescar();
        return Promise.resolve().then(function () { return o.abrir(); }).then(function (n) {
          c = n; ocupado = false; ver('Conectado: ' + (n.nombre || o.tipo), 'conectado'); refrescar();
          n.escuchar(function (ev) {
            if (ev.estado === 'reconectando') ver(ev.mensaje || 'Reconectando…', 'conectando');
            else if (ev.estado === 'conectado' && c === n) ver('Conectado: ' + (n.nombre || o.tipo), 'conectado');
          }, 'estado');
          n.escuchar(function (ev) { if (ev.explicacion && c === n) error(ev.error); }, 'error');
          n.escuchar(function (ev) { if (c === n) { c = null; ver('Desconectado' + (ev.voluntario ? '' : ': ' + ev.motivo), 'cerrado'); refrescar(); } if (o.alCerrar) o.alCerrar(n, ev); }, 'desconectado');
          if (o.alConectar) o.alConectar(n); return n;
        }, function (e) { ocupado = false; ver('Desconectado', 'cerrado'); error(e); refrescar(); if (o.alFallar) o.alFallar(e); return null; });
      },
      cerrar: function () { return c ? c.cerrar() : Promise.resolve(); }
    };
    bCon.addEventListener('click', R.conectar); bDes.addEventListener('click', R.cerrar);
    if (!soportado) {
      var m = (TD.capacidades().filter(function (x) { return x.id === (o.capId || o.tipo); })[0]) || {};
      ver(m.estado === 'https' ? 'Requiere HTTPS' : 'No disponible aquí', 'cerrado');
      raiz.appendChild(U.nota((m.nota || 'El navegador no ofrece esta función.') + (m.estado === 'https' ? ' Esta página no está en un contexto seguro.' : ''), 'av'));
    }
    refrescar(); return R;
  };

  /* ---------- perfiles ---------- */
  /* barraPerfil(tipo, {leer(), aplicar(p), claves}) -> elemento */
  U.barraPerfil = function (tipo) {
    var sel = h('select', { 'aria-label': 'Perfiles guardados' }), nom = h('input', { type: 'text', placeholder: 'Nombre del perfil', maxlength: '60', 'aria-label': 'Nombre del perfil nuevo', autocomplete: 'off' });
    var bAp = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Aplicar' }), bGu = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Guardar perfil' }), bBo = h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar' });
    var lista = [];
    function cargar() {
      return D.perfiles(tipo).then(function (l) {
        lista = l; var v = sel.value; sel.textContent = ''; sel.appendChild(h('option', { value: '', txt: l.length ? '— elegir perfil —' : '(sin perfiles guardados)' }));
        l.forEach(function (p) { sel.appendChild(h('option', { value: p.id, txt: p.nombre })); }); if (v) sel.value = v; bAp.disabled = bBo.disabled = !l.length;
      });
    }
    bAp.addEventListener('click', function () { var p = lista.filter(function (x) { return x.id === sel.value; })[0]; if (!p) return T.aviso('Elige un perfil.'); var v = A.params[tipo]; if (v) { v.aplicar(p.parametros || {}); T.aviso('Perfil «' + p.nombre + '» aplicado.'); } });
    bBo.addEventListener('click', function () { var p = lista.filter(function (x) { return x.id === sel.value; })[0]; if (p && confirm('¿Borrar el perfil «' + p.nombre + '»?')) D.borrarPerfil(p.id).then(function () { T.aviso('Perfil borrado.'); }); });
    bGu.addEventListener('click', function () {
      var v = A.params[tipo]; if (!v) return;
      D.guardarPerfil({ nombre: nom.value, tipo: tipo, parametros: v.leer() }).then(function (r) {
        nom.value = ''; T.aviso('Perfil «' + r.perfil.nombre + '» guardado' + (r.quitados.length ? ' (se omitieron datos sensibles: ' + r.quitados.join(', ') + ')' : '') + '.');
      }, function (e) { T.aviso(e.message, 'error'); });
    });
    D.alm.suscribir('perfiles', cargar); cargar();
    return h('div', { cls: 'dp-perfil' }, [h('div', { cls: 'tr-etq', txt: 'Perfiles' }), h('div', { cls: 'dp-perfil-f' }, [sel, bAp, bBo]), h('div', { cls: 'dp-perfil-f' }, [nom, bGu]), h('p', { cls: 'tr-ayuda', txt: 'Los perfiles guardan solo parámetros (no claves ni contraseñas) y se sincronizan con tu cuenta.' })]);
  };

  /* panel de vista: titulo + contenido en tarjeta */
  U.panel = function (titulo, kids) { return h('div', { cls: 'tr-panel' }, [titulo ? h('h2', { txt: titulo }) : null].concat(kids)); };
  /* descarga de blob con nombre fechado */
  U.fechado = function (base, ext) { return T.nombreArchivo(base) + '_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.' + ext; };
})(window);
