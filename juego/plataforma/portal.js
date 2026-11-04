/* Portal de juegos: acceso, panel, amigos, rankings, logros y ajustes de cuenta. Usa window.Cuenta, window.PlataformaJuegos, window.Amigos. */
(function () {
  'use strict';
  var Cu = window.Cuenta, UI = Cu.ui, h = UI.h, T = window.PlataformaJuegos, L = Cu.logica;
  var $ = function (id) { return document.getElementById(id); };
  var TABS = ['juegos', 'amigos', 'ranking', 'logros', 'cuenta'];
  var tab = 'juegos', modoAcceso = 'entrar', mejores = {}, rk = { juego: T.lista[0].id, modo: T.lista[0].modos[0].id, alcance: 'global' }, rkSeq = 0, quitarMando = null, yaPanel = false;
  UI.mandoPropio = true;

  function fmt(n) { return Number(n).toLocaleString('es'); }
  function colorJuego(id) { var j = T.juego(id); return j ? j.color : '#9a8cff'; }
  function vaciar(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function btn(txt, fn, cls, extra) { var b = h('button', { type: 'button', cls: 'p-btn ' + (cls || ''), 'data-f': 1, txt: txt }); if (extra) for (var k in extra) b.setAttribute(k, extra[k]); b.addEventListener('click', fn); return b; }
  function vacio(txt, icono) { return h('div', { cls: 'p-vacio' }, [(function () { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = icono || '<circle cx="12" cy="12" r="9"/><path d="M8 15c1-1.500 2.500-2 4-2s3 .5 4 2M9 9h.01M15 9h.01"/>'; return s; })(), h('div', { txt: txt })]); }
  function esqueleto(n) { var f = document.createDocumentFragment(); for (var i = 0; i < n; i++) f.appendChild(h('li', { cls: 'p-esq', style: 'height:58px', 'aria-hidden': 'true' })); return f; }
  function ocupado(b, v) { b.disabled = v; b.classList.toggle('p-cargando', v); }

  /* ---------- vistas ---------- */
  function vista(v) {
    $('vistaCarga').hidden = v !== 'carga'; $('vistaAcceso').hidden = v !== 'acceso'; $('vistaPanel').hidden = v !== 'panel';
    $('vistaCarga').setAttribute('aria-busy', String(v === 'carga'));
    document.title = v === 'panel' && Cu.usuario ? 'Mis juegos · ' + Cu.usuario.nombre : 'Mis juegos';
  }

  /* ---------- teclado en pantalla para mando ---------- */
  var FILAS = ['1234567890', 'qwertyuiop', 'asdfghjkl_', 'zxcvbnm.@-'];
  function teclado(input) {
    var valor = input.value, mayus = false, secreto = input.type === 'password';
    var vista_ = h('div', { cls: 'p-tec-v', 'aria-live': 'polite' }), grid = h('div', { cls: 'p-tec' }), m;
    function pinta() { vista_.textContent = secreto ? new Array(valor.length + 1).join('•') : valor; if (!valor) vista_.textContent = ' '; }
    function tecla(c) { return h('button', { type: 'button', 'data-f': 1, 'aria-label': c, txt: mayus ? c.toUpperCase() : c, on: { click: function () { valor += mayus ? c.toUpperCase() : c; pinta(); } } }); }
    FILAS.forEach(function (f) { f.split('').forEach(function (c) { grid.appendChild(tecla(c)); }); });
    var bm = h('button', { type: 'button', cls: 'p-ancho2', 'data-f': 1, txt: 'ABC', 'aria-pressed': 'false', on: { click: function () { mayus = !mayus; bm.setAttribute('aria-pressed', mayus); Array.prototype.forEach.call(grid.querySelectorAll('button'), function (b) { if (b.getAttribute('aria-label') && b.getAttribute('aria-label').length === 1) b.textContent = mayus ? b.getAttribute('aria-label').toUpperCase() : b.getAttribute('aria-label'); }); } } });
    grid.appendChild(bm);
    grid.appendChild(h('button', { type: 'button', cls: 'p-ancho', 'data-f': 1, txt: 'ESPACIO', on: { click: function () { valor += ' '; pinta(); } } }));
    grid.appendChild(h('button', { type: 'button', cls: 'p-ancho2', 'data-f': 1, txt: '⌫', 'aria-label': 'Borrar', on: { click: function () { valor = valor.slice(0, -1); pinta(); } } }));
    ['!', '#', '$'].forEach(function (c) { grid.appendChild(tecla(c)); });
    pinta();
    m = UI.modal({ titulo: 'Escribir', contenido: h('div', {}, [vista_, grid]), valorAtras: null, botones: [{ txt: 'Aceptar', valor: true, cls: 'cu-prim' }, { txt: 'Cancelar', valor: null, cls: 'cu-sec' }] });
    m.promesa.then(function (ok) { if (ok === true) { input.value = valor; input.dispatchEvent(new Event('input', { bubbles: true })); } input.focus({ preventScroll: true }); });
  }
  function conTeclado(input) {
    input.addEventListener('click', function () { if (document.body.classList.contains('navMando') && !input.readOnly) { input.blur(); teclado(input); } });
  }

  /* ---------- acceso ---------- */
  function ponerModoAcceso(m) {
    modoAcceso = m; var crear = m === 'crear';
    $('tabEntrar').setAttribute('aria-selected', String(!crear)); $('tabCrear').setAttribute('aria-selected', String(crear));
    $('campoClave2').hidden = !crear; $('btnOlvide').hidden = crear;
    $('btnAcceso').textContent = crear ? 'CREAR CUENTA' : 'ENTRAR';
    $('etqUsuario').textContent = crear ? 'Nombre de usuario' : 'Usuario o correo';
    $('inClave').autocomplete = crear ? 'new-password' : 'current-password';
    $('formAcceso').setAttribute('aria-labelledby', crear ? 'tabCrear' : 'tabEntrar');
    $('errAcceso').hidden = true;
    ayuda('ayUsuario', crear ? '3 a 16 caracteres: letras, números y _' : '', ''); ayuda('ayClave', crear ? 'Mínimo 8 caracteres' : '', ''); ayuda('ayClave2', '', '');
    ['inUsuario', 'inClave', 'inClave2'].forEach(function (i) { $(i).removeAttribute('aria-invalid'); });
    if (crear && $('inUsuario').value) validarVivo();
  }
  function ayuda(id, txt, tipo) { var e = $(id); e.textContent = txt; e.className = 'p-ayuda' + (tipo ? ' p-' + tipo : ''); }
  var tDisp = 0, secDisp = 0;
  function validarVivo(ev) {
    if (modoAcceso !== 'crear') return;
    var u = $('inUsuario').value, c = $('inClave').value, c2 = $('inClave2').value, id = ev && ev.target && ev.target.id;
    if (!id || id === 'inUsuario') {
      var e = u ? L.validarNombre(u) : '';
      $('inUsuario').setAttribute('aria-invalid', String(!!e));
      if (e) ayuda('ayUsuario', e, 'mal');
      else if (u) {
        ayuda('ayUsuario', 'Comprobando…', ''); clearTimeout(tDisp); var s = ++secDisp;
        tDisp = setTimeout(function () { Cu.nombreDisponible(u).then(function (libre) { if (s !== secDisp) return; if (libre === true) ayuda('ayUsuario', '«' + L.normalizarNombre(u) + '» está disponible', 'ok'); else if (libre === false) { ayuda('ayUsuario', 'Ese nombre ya existe. Elige otro.', 'mal'); $('inUsuario').setAttribute('aria-invalid', 'true'); } else ayuda('ayUsuario', '', ''); }); }, 450);
      } else ayuda('ayUsuario', '3 a 16 caracteres: letras, números y _', '');
    }
    if (!id || id === 'inClave') { var ec = c ? L.validarContrasena(c, u) : ''; $('inClave').setAttribute('aria-invalid', String(!!ec)); ayuda('ayClave', ec || (c ? 'Contraseña válida' : 'Mínimo 8 caracteres'), ec ? 'mal' : (c ? 'ok' : '')); }
    if (!id || id !== 'inUsuario') { var d = c2 && c2 !== c; $('inClave2').setAttribute('aria-invalid', String(!!d)); ayuda('ayClave2', d ? 'Las contraseñas no coinciden' : (c2 ? 'Coinciden' : ''), d ? 'mal' : (c2 ? 'ok' : '')); }
  }
  function errorAcceso(msg) { var e = $('errAcceso'); e.textContent = msg; e.hidden = !msg; }
  function enviarAcceso(ev) {
    ev.preventDefault(); errorAcceso('');
    var u = $('inUsuario').value.trim(), c = $('inClave').value, crear = modoAcceso === 'crear', rec = $('inRecordar').checked, b = $('btnAcceso');
    if (!u || !c) { errorAcceso('Escribe tu usuario y tu contraseña.'); (u ? $('inClave') : $('inUsuario')).focus(); return; }
    if (crear) {
      var e = L.validarNombre(u) || L.validarContrasena(c, u) || (c !== $('inClave2').value ? 'Las contraseñas no coinciden.' : '');
      if (e) { errorAcceso(e); return; }
    }
    ocupado(b, true);
    (crear ? Cu.registrar(u, c, { recordar: rec }) : Cu.entrar(u, c, { recordar: rec })).then(function () {
      $('inClave').value = ''; $('inClave2').value = '';
    }).catch(function (er) {
      errorAcceso(Cu.mensajeError(er)); $('inClave').select && $('inClave').focus();
    }).then(function () { ocupado(b, false); });
  }
  function olvide() {
    var correo = h('input', { cls: 'p-in', type: 'email', autocomplete: 'email', placeholder: 'tu@correo.com', 'aria-label': 'Correo vinculado', 'data-f': 1, 'data-inicial': 1 }), msg = h('div', { cls: 'p-ayuda', 'aria-live': 'polite' });
    conTeclado(correo);
    var m = UI.modal({ titulo: 'Restablecer contraseña', valorAtras: null, contenido: h('div', {}, [
      h('p', { txt: 'Solo funciona si vinculaste un correo real a tu cuenta (Cuenta > Correo de recuperación). Te enviaremos un enlace para elegir una contraseña nueva.' }),
      h('p', { cls: 'cu-peq', txt: 'Si nunca vinculaste un correo no hay forma de recuperar la contraseña: tendrás que crear otra cuenta.' }), correo, msg]),
      botones: [{ txt: 'Enviar enlace', valor: 'ok', cls: 'cu-prim' }, { txt: 'Cerrar', valor: null, cls: 'cu-sec' }] });
    // evita cerrar el modal al enviar: se intercepta el boton
    var enviar = m.tarjeta.querySelector('.cu-prim');
    enviar.addEventListener('click', function (e) {
      e.stopImmediatePropagation(); msg.className = 'p-ayuda'; msg.textContent = 'Enviando…';
      Cu.restablecerContrasena(correo.value).then(function () { msg.className = 'p-ayuda p-ok'; msg.textContent = 'Si ese correo está vinculado a una cuenta, recibirás un enlace en unos minutos.'; }).catch(function (er) { msg.className = 'p-ayuda p-mal'; msg.textContent = Cu.mensajeError(er); });
    }, true);
  }

  /* ---------- cabecera ---------- */
  function pintarCabecera() {
    var u = Cu.usuario; if (!u) return; var c = $('cabecera'), n = u.nivelInfo;
    vaciar(c); c.style.setProperty('--c', u.color);
    c.appendChild(UI.avatarEl(u.avatar, u.color, 64));
    c.appendChild(h('div', { cls: 'p-cab-d' }, [
      h('div', { cls: 'p-cab-n', txt: u.nombre, style: '--c:' + u.color }),
      h('div', { cls: 'p-cab-s' }, [h('span', { txt: 'NIVEL ' + u.nivel }), h('span', { txt: n.nivel >= 100 ? 'MÁXIMO' : fmt(n.enNivel) + ' / ' + fmt(n.paraSiguiente) + ' XP' })]),
      (function () { var b = h('div', { cls: 'p-barra', role: 'progressbar', 'aria-label': 'Experiencia del nivel ' + u.nivel, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(n.fraccion * 100) }, [h('i')]); setTimeout(function () { b.firstChild.style.width = Math.round(n.fraccion * 100) + '%'; }, 30); return b; })()]));
  }

  /* ---------- juegos ---------- */
  function ultimo() {
    var u = Cu.ultimoJuego(), id = u && u.juego; if (!id) { try { id = localStorage.getItem('juego_ultimo'); } catch (e) {} }
    return T.juego(id);
  }
  function pintarJuegos() {
    var cont = vaciar($('continuar')), j = ultimo();
    if (j) {
      var a = h('a', { cls: 'p-continuar', 'data-f': 1, href: j.ruta, style: '--color:' + j.color }, [h('div', {}, [h('b', { txt: 'CONTINUAR JUGANDO' }), h('strong', { txt: j.nombre })]), h('span', { cls: 'jugar', txt: 'SEGUIR' })]);
      cont.appendChild(a);
    } else cont.appendChild(h('div', { cls: 'p-info', txt: 'Elige un juego para empezar. Aquí aparecerá el último al que juegues.' }));
    Array.prototype.forEach.call(document.querySelectorAll('#listaJuegos .juego'), function (a) {
      var id = a.getAttribute('data-juego'), j2 = T.juego(id), st = a.querySelector('[data-stats]'); if (!j2 || !st) return;
      vaciar(st);
      var n = Cu.logros(id).length, xp = Cu.xpJuego(id);
      st.appendChild(h('span', { txt: '★ ' + n + '/' + j2.logros.length + ' logros' }));
      if (xp) st.appendChild(h('span', { txt: fmt(xp) + ' XP' }));
      j2.modos.forEach(function (m) { var e = mejores[id + '__' + m.id]; if (e) st.appendChild(h('span', { txt: m.nombre + ': ' + fmt(e.valor) + (m.unidad ? ' ' + m.unidad : '') })); });
    });
  }
  function cargarMejores() {
    T.lista.forEach(function (j) { j.modos.forEach(function (m) { Cu.miMejor(j.id, m.id).then(function (e) { mejores[j.id + '__' + m.id] = e; pintarJuegos(); }).catch(function () {}); }); });
  }

  /* ---------- amigos ---------- */
  var textoEstado = { en_linea: 'En línea', jugando: 'Jugando', ausente: 'Ausente', desconectado: 'Desconectado' };
  function estadoTxt(a) {
    if (a.estado === 'jugando' && a.juego) { var j = T.juego(a.juego); return 'Jugando ' + (j ? j.nombre : a.juego); }
    return textoEstado[a.estado] || '';
  }
  function filaAmigo(a, acciones) {
    return h('li', { cls: 'p-fila p-fade', style: '--c:' + a.color }, [UI.avatarEl(a.avatar, a.color, 42),
      h('div', { cls: 'p-d' }, [h('div', { cls: 'p-n', txt: a.nombre }), h('div', { cls: 'p-s' }, [a.estado ? h('span', { cls: 'p-punto ' + a.estado, 'aria-hidden': 'true' }) : null, a.estado ? estadoTxt(a) + ' · ' : '', 'Nivel ' + a.nivel])]),
      h('div', { cls: 'p-acc' }, acciones)]);
  }
  function elegirJuegoParaInvitar(a) {
    var cont = h('div', { cls: 'p-lista' });
    var m = UI.modal({ titulo: 'Invitar a ' + a.nombre, valorAtras: null, contenido: h('div', {}, [h('p', { txt: 'Elige el juego. Se abrirá una sala y ' + a.nombre + ' recibirá la invitación al instante.' }), cont]), botones: [{ txt: 'Cancelar', valor: null, cls: 'cu-sec' }] });
    T.lista.forEach(function (j) {
      cont.appendChild(h('button', { type: 'button', cls: 'p-btn', 'data-f': 1, style: 'border-color:' + j.color + ';color:' + j.color, txt: j.nombre.toUpperCase(), on: { click: function () { location.href = j.ruta + '?invitar=' + encodeURIComponent(a.uid); } } }));
    });
  }
  function confirmar(titulo, texto, ok) {
    return UI.modal({ titulo: titulo, contenido: h('p', { txt: texto }), valorAtras: false, botones: [{ txt: ok || 'Confirmar', valor: true, cls: 'cu-mal' }, { txt: 'Cancelar', valor: false, cls: 'cu-sec' }] }).promesa;
  }
  function pintarAmigos() {
    var lista = vaciar($('listaAmigos')), sol = vaciar($('boxSolicitudes')), A = Cu.amigos;
    if (!A.lista.length) lista.appendChild(h('li', {}, [vacio('Aún no tienes amigos. Escribe arriba el nombre de usuario exacto de alguien para enviarle una solicitud.', '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c0-3.500 3-6 6.500-6s6.500 2.500 6.500 6"/><path d="M19 8v6M16 11h6"/>')]));
    A.lista.forEach(function (a) {
      var on = a.estado !== 'desconectado';
      lista.appendChild(filaAmigo(a, [
        btn('INVITAR', function () { elegirJuegoParaInvitar(a); }, 'p-peq p-prim', on ? {} : { disabled: '', title: 'Solo puedes invitar a amigos conectados' }),
        btn('QUITAR', function () { confirmar('Quitar amigo', '¿Quitar a ' + a.nombre + ' de tus amigos?', 'Quitar').then(function (ok) { if (ok) Cu.amigos.quitar(a.uid).catch(function (e) { UI.aviso(Cu.mensajeError(e), { color: '#ff6b6b' }); }); }); }, 'p-peq p-mal')]));
    });
    if (A.solicitudes.length || A.enviadas.length) {
      sol.appendChild(h('h2', { cls: 'p-sec-t', txt: 'Solicitudes' }));
      var ul = h('ul', { cls: 'p-lista' });
      A.solicitudes.forEach(function (a) { ul.appendChild(filaAmigo(a, [btn('ACEPTAR', function () { Cu.amigos.aceptar(a.uid).catch(function (e) { UI.aviso(Cu.mensajeError(e), { color: '#ff6b6b' }); }); }, 'p-peq p-prim'), btn('RECHAZAR', function () { Cu.amigos.rechazar(a.uid); }, 'p-peq p-mal')])); });
      A.enviadas.forEach(function (a) { ul.appendChild(filaAmigo(a, [h('span', { cls: 'p-s', txt: 'Enviada, esperando respuesta' }), btn('CANCELAR', function () { Cu.amigos.rechazar(a.uid); }, 'p-peq p-sec')])); });
      sol.appendChild(ul);
    }
    badges();
  }
  function pintarInvitaciones() {
    var box = vaciar($('boxInvitaciones')), inv = Cu.invitaciones;
    if (inv.length) {
      box.appendChild(h('h2', { cls: 'p-sec-t', txt: 'Invitaciones a jugar' }));
      var ul = h('ul', { cls: 'p-lista' });
      inv.forEach(function (i) {
        var j = T.juego(i.juego);
        ul.appendChild(filaAmigo({ nombre: i.nombre, color: i.color, avatar: i.avatar, nivel: '' }, [btn('ACEPTAR', function () { Amigos.aceptar(i); }, 'p-peq p-prim'), btn('AHORA NO', function () { Amigos.rechazar(i); }, 'p-peq p-sec')]));
        ul.lastChild.querySelector('.p-s').textContent = 'te invita a ' + (j ? j.nombre : i.juego);
      });
      box.appendChild(ul);
    }
    badges();
  }
  function badges() {
    var n = Cu.amigos.solicitudes.length + Cu.invitaciones.length, b = document.querySelector('[data-ins="amigos"]');
    b.hidden = !n; b.textContent = n; b.setAttribute('aria-label', n + ' pendientes');
  }
  function formAmigo(ev) {
    ev.preventDefault(); var n = $('inAmigo').value.trim(), b = $('btnAmigo'); if (!n) return;
    ocupado(b, true); ayuda('ayAmigo', 'Buscando…', '');
    Cu.amigos.enviar(n).then(function (r) { ayuda('ayAmigo', r.aceptada ? '¡Ahora eres amigo de ' + r.perfil.nombre + '!' : 'Solicitud enviada a ' + r.perfil.nombre, 'ok'); $('inAmigo').value = ''; })
      .catch(function (e) { ayuda('ayAmigo', Cu.mensajeError(e), 'mal'); }).then(function () { ocupado(b, false); });
  }

  /* ---------- ranking ---------- */
  function chips(cont, items, sel, fn, colorFn) {
    vaciar(cont);
    items.forEach(function (it) { var b = h('button', { type: 'button', cls: 'p-chip', 'data-f': 1, 'aria-pressed': String(it.id === sel), txt: it.nombre, style: colorFn ? '--c:' + colorFn(it) : '' }); b.addEventListener('click', function () { fn(it.id); }); cont.appendChild(b); });
  }
  function pintarRanking() {
    var j = T.juego(rk.juego), modo = T.modo(rk.juego, rk.modo);
    chips($('chipsJuego'), T.lista, rk.juego, function (id) { rk.juego = id; rk.modo = T.juego(id).modos[0].id; pintarRanking(); }, function (it) { return it.color; });
    chips($('chipsModo'), j.modos, rk.modo, function (id) { rk.modo = id; pintarRanking(); }, function () { return j.color; });
    chips($('chipsAlcance'), [{ id: 'global', nombre: 'GLOBAL' }, { id: 'amigos', nombre: 'SOLO AMIGOS' }], rk.alcance, function (id) { rk.alcance = id; pintarRanking(); });
    var ul = vaciar($('listaRanking')), seq = ++rkSeq; ul.appendChild(esqueleto(5));
    var amigos = rk.alcance === 'amigos';
    Promise.all([Cu.top(rk.juego, rk.modo, 20, { soloAmigos: amigos }), amigos ? null : Cu.miPosicion(rk.juego, rk.modo)]).then(function (r) {
      if (seq !== rkSeq) return; vaciar(ul);
      var top = r[0], mi = r[1];
      if (!top.length) { ul.appendChild(h('li', {}, [vacio(amigos ? 'Ni tú ni tus amigos tienen puntaje en este modo todavía.' : 'Aún no hay puntajes en este modo. ¡Sé el primero!', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/>')])); return; }
      top.forEach(function (e) {
        ul.appendChild(h('li', { cls: 'p-fila p-fade' + (e.yo ? ' p-yo' : ''), style: '--c:' + e.color }, [
          h('div', { cls: 'p-pos' + (e.pos <= 3 ? ' p' + e.pos : ''), txt: '#' + e.pos }),
          h('div', { cls: 'p-d' }, [h('div', { cls: 'p-n', txt: e.nombre + (e.yo ? ' (tú)' : '') })]),
          h('div', { cls: 'p-valor', txt: fmt(e.valor) + (modo.unidad ? ' ' + modo.unidad : '') })]));
      });
      if (mi && mi.posicion && mi.posicion > top.length) ul.appendChild(h('li', { cls: 'p-fila p-yo', style: '--c:' + Cu.usuario.color }, [h('div', { cls: 'p-pos', txt: '#' + mi.posicion }), h('div', { cls: 'p-d' }, [h('div', { cls: 'p-n', txt: 'Tu posición' }), h('div', { cls: 'p-s', txt: 'de ' + fmt(mi.total) + ' jugadores' })]), h('div', { cls: 'p-valor', txt: fmt(mi.valor) })]));
      else if (mi && !mi.posicion) ul.appendChild(h('li', { cls: 'p-info', txt: 'Todavía no tienes puntaje en este modo.' }));
    }).catch(function (e) { if (seq !== rkSeq) return; vaciar(ul); ul.appendChild(h('li', { cls: 'p-error', txt: Cu.mensajeError(e) })); });
  }

  /* ---------- logros ---------- */
  function pintarLogros() {
    var c = vaciar($('tab-logros'));
    T.lista.forEach(function (j) {
      var ganados = Cu.logros(j.id), conocidos = j.logros.map(function (l) { return l.id; }), extra = ganados.filter(function (id) { return conocidos.indexOf(id) < 0; });
      c.appendChild(h('h2', { cls: 'p-sec-t', style: 'color:' + j.color, txt: j.nombre + ' · ' + ganados.length + ' / ' + (j.logros.length + extra.length) }));
      var ul = h('ul', { cls: 'p-lista' });
      j.logros.concat(extra.map(function (id) { return { id: id, nombre: id.replace(/_/g, ' '), desc: 'Logro especial' }; })).forEach(function (l) {
        var g = ganados.indexOf(l.id) >= 0;
        ul.appendChild(h('li', { cls: 'p-fila p-logro' + (g ? ' p-ganado' : ''), style: '--c:' + j.color }, [h('div', { cls: 'p-medalla', 'aria-hidden': 'true', txt: g ? '★' : '☆' }), h('div', { cls: 'p-d' }, [h('div', { cls: 'p-n', txt: l.nombre }), h('div', { cls: 'p-s', txt: l.desc + (g ? ' · conseguido' : ' · bloqueado') })])]));
      });
      c.appendChild(ul);
    });
  }

  /* ---------- cuenta / ajustes ---------- */
  function pintarCuenta() {
    var u = Cu.usuario, c = vaciar($('tab-cuenta')); if (!u) return;
    var nombre = h('input', { cls: 'p-in', 'data-f': 1, value: u.nombre, maxlength: 16, 'aria-label': 'Nombre visible', autocomplete: 'off' }), color = u.color, avatar = u.avatar, msg = h('div', { cls: 'p-ayuda', 'aria-live': 'polite' });
    conTeclado(nombre);
    var cols = h('div', { cls: 'p-colores', role: 'group', 'aria-label': 'Color' }), libre = h('input', { type: 'color', cls: 'p-color', 'data-f': 1, 'aria-label': 'Color personalizado', value: color, style: '--c:' + color });
    function marcarColor() { Array.prototype.forEach.call(cols.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === color)); }); libre.value = color; }
    L.COLORES.forEach(function (k) { cols.appendChild(h('button', { type: 'button', cls: 'p-color', 'data-f': 1, 'data-c': k, 'aria-label': 'Color ' + k, 'aria-pressed': 'false', style: '--c:' + k, on: { click: function () { color = k; marcarColor(); } } })); });
    libre.addEventListener('input', function () { color = libre.value; marcarColor(); }); cols.appendChild(libre);
    var avs = h('div', { cls: 'p-avatares', role: 'group', 'aria-label': 'Avatar' });
    function marcarAv() { Array.prototype.forEach.call(avs.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.a === avatar)); var cu = b.querySelector('.cu-avatar'); cu.innerHTML = UI.avatarSvg(b.dataset.a, color, 60); }); }
    L.AVATARES.forEach(function (a, i) { avs.appendChild(h('button', { type: 'button', cls: 'p-av', 'data-f': 1, 'data-a': a, 'aria-label': 'Avatar ' + (i + 1), 'aria-pressed': 'false', on: { click: function () { avatar = a; marcarAv(); } } }, [h('span', { cls: 'cu-avatar' })])); });
    cols.addEventListener('click', marcarAv); libre.addEventListener('input', marcarAv);
    marcarColor(); marcarAv();
    var guardar = btn('GUARDAR PERFIL', function () {
      ocupado(guardar, true);
      Cu.actualizarPerfil({ nombre: nombre.value, color: color, avatar: avatar }).then(function () { msg.className = 'p-ayuda p-ok'; msg.textContent = 'Perfil guardado'; }).catch(function (e) { msg.className = 'p-ayuda p-mal'; msg.textContent = Cu.mensajeError(e); }).then(function () { ocupado(guardar, false); });
    }, 'p-prim');
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'PERFIL' }), h('p', { cls: 'p-sys', txt: 'Tu usuario es «' + u.usuario + '» y no se puede cambiar. El nombre visible lo ven tus amigos y los rankings.' }),
      h('div', { cls: 'p-campo' }, [h('label', { txt: 'Nombre visible' }), nombre]), h('div', { cls: 'p-etq', txt: 'Color' }), cols, h('div', { cls: 'p-etq', style: 'margin-top:14px', txt: 'Avatar' }), avs, h('div', { style: 'margin-top:14px' }, [guardar]), msg]));

    // contrasena
    var pa = h('input', { cls: 'p-in', type: 'password', 'data-f': 1, autocomplete: 'current-password', 'aria-label': 'Contraseña actual' }), pn = h('input', { cls: 'p-in', type: 'password', 'data-f': 1, autocomplete: 'new-password', 'aria-label': 'Contraseña nueva' }), pm = h('div', { cls: 'p-ayuda', 'aria-live': 'polite' });
    conTeclado(pa); conTeclado(pn);
    var cp = btn('CAMBIAR CONTRASEÑA', function () {
      ocupado(cp, true);
      Cu.cambiarContrasena(pa.value, pn.value).then(function () { pm.className = 'p-ayuda p-ok'; pm.textContent = 'Contraseña actualizada'; pa.value = pn.value = ''; }).catch(function (e) { pm.className = 'p-ayuda p-mal'; pm.textContent = Cu.mensajeError(e); }).then(function () { ocupado(cp, false); });
    }, 'p-sec');
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'CONTRASEÑA' }), h('div', { cls: 'p-campo' }, [h('label', { txt: 'Actual' }), pa]), h('div', { cls: 'p-campo' }, [h('label', { txt: 'Nueva (mínimo 8)' }), pn]), cp, pm]));

    // correo
    var co = h('input', { cls: 'p-in', type: 'email', 'data-f': 1, autocomplete: 'email', placeholder: 'tu@correo.com', 'aria-label': 'Correo de recuperación' }), cpw = h('input', { cls: 'p-in', type: 'password', 'data-f': 1, autocomplete: 'current-password', 'aria-label': 'Tu contraseña' }), cm = h('div', { cls: 'p-ayuda', 'aria-live': 'polite' });
    conTeclado(co); conTeclado(cpw);
    var vc = btn('VINCULAR CORREO', function () {
      ocupado(vc, true);
      Cu.vincularCorreo(co.value, cpw.value).then(function () { cm.className = 'p-ayuda p-ok'; cm.textContent = Cu.demo ? 'Correo vinculado (modo demo).' : 'Te enviamos un mensaje: abre el enlace para confirmar el correo.'; cpw.value = ''; }).catch(function (e) { cm.className = 'p-ayuda p-mal'; cm.textContent = Cu.mensajeError(e); }).then(function () { ocupado(vc, false); });
    }, 'p-sec');
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'CORREO DE RECUPERACIÓN (OPCIONAL)' }),
      h('p', { txt: u.correo ? 'Correo vinculado: ' + u.correo : 'Tu cuenta no tiene correo. Si olvidas la contraseña no podrás recuperarla.' }),
      h('p', { cls: 'p-sys', style: 'font-size:12.5px;color:#bdb4ff', txt: 'Al confirmar un correo, para entrar escribirás ese correo en lugar del usuario (tu nombre público no cambia). Es el único modo de poder restablecer la contraseña.' }),
      h('div', { cls: 'p-campo' }, [h('label', { txt: 'Correo' }), co]), h('div', { cls: 'p-campo' }, [h('label', { txt: 'Tu contraseña (para confirmar)' }), cpw]), vc, cm]));

    // sonidos
    var son = h('input', { type: 'checkbox', 'data-f': 1 }), vib = h('input', { type: 'checkbox', 'data-f': 1 });
    son.checked = Amigos.sonido; vib.checked = Amigos.vibracion;
    son.addEventListener('change', function () { Amigos.sonido = son.checked; guardarPref(); }); vib.addEventListener('change', function () { Amigos.vibracion = vib.checked; guardarPref(); });
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'NOTIFICACIONES' }), h('label', { cls: 'p-check' }, [son, 'Sonido al recibir una invitación']), h('label', { cls: 'p-check' }, [vib, 'Vibración (móvil)'])]));

    // datos
    var pend = h('p', { cls: 'p-sys', txt: '' });
    function estadoNube() { var n = Cu.pendientes(); pend.textContent = (Cu.demo ? 'Modo demo: los datos están solo en este dispositivo. ' : 'Tus datos se guardan en la nube. ') + (n ? n + ' cambio(s) pendientes de enviar (sin conexión); se reintentan solos.' : 'Todo sincronizado.'); }
    estadoNube(); Cu.on('cola', estadoNube);
    var exp = btn('EXPORTAR MIS DATOS', function () {
      ocupado(exp, true);
      Cu.exportarDatos().then(function (d) {
        var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), download: 'mis-datos-' + u.usuario + '.json' }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }).catch(function (e) { UI.aviso(Cu.mensajeError(e), { color: '#ff6b6b' }); }).then(function () { ocupado(exp, false); });
    }, 'p-sec');
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'MIS DATOS' }), pend, exp]));

    // sesion y borrado
    var salir = btn('CERRAR SESIÓN', function () { Cu.salir(); }, 'p-sec');
    var borrar = btn('BORRAR MI CUENTA', borrarCuenta, 'p-mal');
    c.appendChild(h('div', { cls: 'p-bloque' }, [h('h3', { txt: 'SESIÓN' }), h('p', { txt: 'Sesión iniciada como «' + u.usuario + '».' }), h('div', { cls: 'p-form-fila' }, [salir, borrar])]));
  }
  function borrarCuenta() {
    var pw = h('input', { cls: 'p-in', type: 'password', 'data-f': 1, 'data-inicial': 1, autocomplete: 'current-password', 'aria-label': 'Tu contraseña' }), msg = h('div', { cls: 'p-ayuda p-mal', 'aria-live': 'polite' });
    conTeclado(pw);
    var m = UI.modal({ titulo: 'Borrar cuenta', valorAtras: null, contenido: h('div', {}, [h('p', { txt: 'Se borrarán tu perfil, guardados en la nube, logros, puntajes y amistades. No se puede deshacer.' }), h('p', { cls: 'cu-peq', txt: 'Para confirmar escribe tu contraseña.' }), pw, msg]), botones: [{ txt: 'Borrar para siempre', valor: 'ok', cls: 'cu-mal' }, { txt: 'Cancelar', valor: null, cls: 'cu-sec' }] });
    var b = m.tarjeta.querySelector('.cu-mal');
    b.addEventListener('click', function (e) {
      e.stopImmediatePropagation(); ocupado(b, true); msg.textContent = '';
      Cu.borrarCuenta(pw.value).then(function () { m.cerrar(null); UI.aviso('Cuenta borrada. ¡Hasta pronto!'); }).catch(function (er) { msg.textContent = Cu.mensajeError(er); ocupado(b, false); });
    }, true);
  }
  function guardarPref() { try { localStorage.setItem('cuenta_pref_avisos', JSON.stringify({ s: Amigos.sonido, v: Amigos.vibracion })); } catch (e) {} }
  function cargarPref() { try { var p = JSON.parse(localStorage.getItem('cuenta_pref_avisos')); if (p) { Amigos.sonido = p.s !== false; Amigos.vibracion = p.v !== false; } } catch (e) {} }

  /* ---------- navegacion ---------- */
  function irTab(t, sinFoco) {
    if (TABS.indexOf(t) < 0) t = 'juegos'; tab = t;
    TABS.forEach(function (x) { $('tab-' + x).hidden = x !== t; });
    Array.prototype.forEach.call(document.querySelectorAll('#navPanel button'), function (b) { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (t === 'ranking') pintarRanking(); if (t === 'logros') pintarLogros(); if (t === 'cuenta') pintarCuenta(); if (t === 'amigos') { pintarAmigos(); pintarInvitaciones(); }
    try { history.replaceState(null, '', '#' + t); } catch (e) {}
    window.scrollTo(0, 0);
  }

  /* ---------- sesion ---------- */
  function entrarPanel() {
    var v = Cu.volver();
    if (v) { vista('carga'); $('vistaCarga').insertAdjacentHTML('beforeend', '<p class="p-sub" style="margin-top:16px">Volviendo a tu juego…</p>'); location.replace(v); return; }
    vista('panel');
    pintarCabecera(); pintarJuegos(); pintarAmigos(); pintarInvitaciones();
    if (!yaPanel) { yaPanel = true; cargarMejores(); }
    var t = (location.hash || '').slice(1); irTab(TABS.indexOf(t) >= 0 ? t : 'juegos');
  }
  function arrancar() {
    cargarPref();
    $('avisoDemo').hidden = !Cu.demo;
    if (Cu.errorInicio) {
      vista('acceso'); errorAcceso(Cu.mensajeError(Cu.errorInicio) + ' (' + (Cu.errorInicio.message || '') + ')'); $('btnAcceso').disabled = true; return;
    }
    Cu.on('sesion', function (u) { if (u) { yaPanel = false; entrarPanel(); } else { mejores = {}; yaPanel = false; vista('acceso'); ponerModoAcceso('entrar'); setTimeout(function () { $('inUsuario').focus({ preventScroll: true }); }, 50); } });
    Cu.on('perfil', function () { pintarCabecera(); if (tab === 'logros') pintarLogros(); });
    Cu.on('amigos', function () { if (Cu.usuario) { pintarAmigos(); if (tab === 'amigos') pintarInvitaciones(); } });
    Cu.on('invitaciones', function () { if (Cu.usuario) pintarInvitaciones(); });
    Cu.on('logros', function () { pintarJuegos(); if (tab === 'logros') pintarLogros(); });
    Cu.on('logro', function (j, id, def) { UI.aviso(def ? def.nombre + ' · ' + def.desc : id, { titulo: 'LOGRO DESBLOQUEADO', color: colorJuego(j) }); });
    Cu.on('nivel', function (n) { UI.aviso('Has llegado al nivel ' + n, { titulo: 'SUBES DE NIVEL', color: '#ff4fd8' }); });
    if (Cu.usuario) entrarPanel(); else { vista('acceso'); ponerModoAcceso('entrar'); }
  }

  /* ---------- eventos y mando ---------- */
  $('tabEntrar').addEventListener('click', function () { ponerModoAcceso('entrar'); });
  $('tabCrear').addEventListener('click', function () { ponerModoAcceso('crear'); });
  $('formAcceso').addEventListener('submit', enviarAcceso);
  $('formAmigo').addEventListener('submit', formAmigo);
  ['inUsuario', 'inClave', 'inClave2'].forEach(function (i) { $(i).addEventListener('input', validarVivo); conTeclado($(i)); });
  conTeclado($('inAmigo'));
  $('btnVer').addEventListener('click', function () {
    var ver = $('btnVer').getAttribute('aria-pressed') !== 'true'; $('btnVer').setAttribute('aria-pressed', String(ver)); $('btnVer').textContent = ver ? 'OCULTAR' : 'VER'; $('btnVer').setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    $('inClave').type = ver ? 'text' : 'password'; $('inClave2').type = ver ? 'text' : 'password';
  });
  $('btnOlvide').addEventListener('click', olvide);
  Array.prototype.forEach.call(document.querySelectorAll('#navPanel button'), function (b) { b.addEventListener('click', function () { irTab(b.dataset.tab); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#listaJuegos .juego'), function (a) { a.addEventListener('click', function () { try { localStorage.setItem('juego_ultimo', a.getAttribute('data-juego')); } catch (e) {} }); });
  function usarOtro() { if (window.Mando) Mando.activo = false; document.body.classList.remove('navMando'); document.body.classList.toggle('conMando', false); }
  addEventListener('mousemove', function (e) { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) usarOtro(); });
  addEventListener('pointerdown', usarOtro, true); addEventListener('keydown', usarOtro, true);
  addEventListener('hashchange', function () { var t = (location.hash || '').slice(1); if (Cu.usuario && TABS.indexOf(t) >= 0 && t !== tab) irTab(t); });

  function enfocables() {
    var base = Array.prototype.slice.call(document.querySelectorAll('[data-f]'));
    return base.filter(function (e) { return !e.disabled && e.offsetParent !== null && !e.closest('.cu-fondo'); });
  }
  UI.mando.empujar({
    enfocables: enfocables,
    atras: function () { if (Cu.usuario && tab !== 'juegos') irTab('juegos'); else if (!Cu.usuario && modoAcceso === 'crear') ponerModoAcceso('entrar'); else location.href = '../'; },
    boton: function (n) { if (!Cu.usuario) return; var i = TABS.indexOf(tab); if (n === 'LB') irTab(TABS[(i + 4) % 5]); if (n === 'RB') irTab(TABS[(i + 1) % 5]); }
  });
  Cu.iniciar().then(arrancar);
})();
