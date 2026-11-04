/* Lobby: modal multijugador sobre Red. Script clasico: window.Lobby. Requiere comun/red.js y comun/lobby.css (opcional comun/mando.js).
   Lobby.abrir({juego:'Nombre', maxJugadores:4, minJugadores:1, modos:[{id,nombre}], url?, alIniciar(config, jugadores), alCerrar?})
     config = {modo, semilla (igual para todos), juego, maxJugadores}; jugadores = [{id,nombre,color,ping,listo}] (id 0 = anfitrion). Se llama en TODOS los equipos.
     Si la URL trae ?sala=..., abre directamente en modo "unirse" y genera la respuesta. Hazlo al cargar: if (Lobby.hayEnlace()) Lobby.abrir(opts);
   Lobby.cerrar() ; Lobby.abierto (bool: pausa tu juego/entrada mientras este abierto; no llames Mando.leer() a la vez que el lobby).
   Lobby.editorPerfil(contenedor) pinta el editor de nombre/color (guarda en localStorage 'juego_perfil').
   Lobby.aviso(texto, color?) toast ; Lobby.avisos=false lo desactiva (por defecto avisa de conexion/desconexion de jugadores).
   Navegacion: teclado (Tab, Enter, Esc), tactil y mando (cruceta/stick mueven, A acepta, B atras/cierra). */
(function (G) {
  'use strict';
  var L = G.Lobby = { abierto: false, avisos: true };
  var Red = G.Red, doc = G.document;
  var opts = {}, invId = '', invitarUid = '', amigosAbierto = false, raiz, tarjeta, E = {}, vista = '', pend = {}, chat = [], rolPrevio = '', editores = [], suscrito = false, toasts, raf = 0;

  function h(tag, props, kids) {
    var e = doc.createElement(tag);
    for (var k in props || {}) {
      if (k === 'cls') e.className = props[k]; else if (k === 'txt') e.textContent = props[k];
      else if (k === 'on') for (var ev in props.on) e.addEventListener(ev, props.on[ev]);
      else if (k === 'style') e.style.cssText = props[k]; else e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  function btn(txt, fn, cls) { return h('button', { type: 'button', cls: 'lb-btn ' + (cls || ''), txt: txt, 'data-f': 1, on: { click: fn } }); }
  function campo(ph, multi, ro) { var e = h(multi ? 'textarea' : 'input', { cls: 'lb-campo', placeholder: ph, 'data-f': 1, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }); if (ro) e.readOnly = true; if (!multi) e.type = 'text'; return e; }
  function colorTxt(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#3df5ff'; }

  /* ---------- utilidades UI ---------- */
  function copiar(texto, boton) {
    var ok = function () { if (boton) { var t = boton.textContent; boton.textContent = 'Copiado'; setTimeout(function () { boton.textContent = t; }, 1400); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, function () { viejoCopiar(texto); ok(); });
    else { viejoCopiar(texto); ok(); }
  }
  function viejoCopiar(t) { var a = h('textarea', { style: 'position:fixed;opacity:0' }); a.value = t; doc.body.appendChild(a); a.select(); try { doc.execCommand('copy'); } catch (e) {} a.remove(); }
  function pegar(destino, cb) {
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { destino.value = t.trim(); if (cb) cb(); }, function () { L.aviso('No se pudo leer el portapapeles: pega con Ctrl+V / mantener pulsado', '#ffd23d'); destino.focus(); });
    else { L.aviso('Pega el texto con Ctrl+V / mantener pulsado', '#ffd23d'); destino.focus(); }
  }
  function compartir(texto, url) { if (navigator.share) navigator.share(url ? { title: opts.juego || 'Juego', text: texto, url: url } : { title: opts.juego || 'Juego', text: texto }).catch(function () {}); }
  function estado(txt, tipo) { E.estado.className = 'lb-aviso-estado' + (tipo ? ' lb-' + tipo : ''); E.estado.textContent = txt || ''; E.estado.hidden = !txt; }
  function pingClase(p) { return p < 80 ? 'b' : p < 160 ? 'm' : 'a'; }
  function nombreDe(id) { var j = Red.jugadores[id]; return j ? j.nombre : 'Jugador'; }

  /* ---------- aviso (toast) ---------- */
  L.aviso = function (texto, color) {
    if (!toasts) { toasts = h('div', { cls: 'lb-toasts', 'aria-live': 'polite' }); doc.body.appendChild(toasts); }
    var t = h('div', { cls: 'lb-aviso', txt: texto, style: '--c:' + colorTxt(color || '#3df5ff') }); toasts.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  };

  /* ---------- editor de perfil ---------- */
  L.editorPerfil = function (cont) {
    var pf = Red.perfil.obtener(), sw = [];
    var nombre = h('input', { cls: 'lb-campo lb-nombre', type: 'text', maxlength: 16, 'aria-label': 'Tu nombre', 'data-f': 1, autocomplete: 'off', value: pf.nombre });
    var cs = h('div', { cls: 'lb-colores', role: 'group', 'aria-label': 'Tu color' });
    var libre = h('input', { type: 'color', cls: 'lb-color', 'aria-label': 'Color personalizado', 'data-f': 1, value: pf.color, style: '--c:' + pf.color + ';padding:0;background:none' });
    function guardar() { var p = Red.perfil.guardar({ nombre: nombre.value, color: libre.value }); editores.forEach(function (ed) { if (ed !== api) ed.poner(p); }); pintar(p); }
    function pintar(p) { sw.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === p.color)); }); libre.value = p.color; }
    Red.perfil.paleta.forEach(function (c) {
      var b = h('button', { type: 'button', cls: 'lb-color', 'data-f': 1, 'data-c': c, 'aria-label': 'Color ' + c, 'aria-pressed': 'false', style: '--c:' + c, on: { click: function () { libre.value = c; guardar(); } } });
      sw.push(b); cs.appendChild(b);
    });
    cs.appendChild(libre);
    nombre.addEventListener('input', guardar); libre.addEventListener('input', guardar);
    var azar = btn('Azar', function () { nombre.value = Red.perfil.nombreAleatorio(); guardar(); }, 'lb-sec lb-peq');
    var el = h('div', { cls: 'lb-perfil' }, [h('div', { cls: 'lb-h', txt: 'Tu perfil', style: 'margin-top:0' }), h('div', { cls: 'lb-fila' }, [nombre, azar]), cs]);
    var api = { poner: function (p) { nombre.value = p.nombre; pintar(p); } };
    editores.push(api); pintar(pf); cont.appendChild(el); return el;
  };

  /* ---------- construccion ---------- */
  function construir() {
    if (raiz) return;
    if (!doc.querySelector('link[href*="family=Orbitron"]') && !G.__lbFuente) {
      G.__lbFuente = 1; doc.head.appendChild(h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;800&display=swap' }));
    }
    E.titulo = h('h2', { cls: 'lb-titulo', id: 'lb-titulo' });
    E.x = btn('X', function () { L.cerrar(); }, 'lb-cerrar'); E.x.setAttribute('aria-label', 'Cerrar');
    E.estado = h('div', { cls: 'lb-aviso-estado', role: 'status', hidden: '' });

    // inicio
    E.vInicio = h('div', { cls: 'lb-vista' }, [
      h('p', { txt: 'Juega con hasta 3 amigos en linea. No hace falta cuenta ni servidor: uno crea la sala y los demas entran con un enlace.' })]);
    L.editorPerfil(E.vInicio);
    E.btnCrear = btn('Crear sala (soy el anfitrion)', function () { crearSala(); }, 'lb-prim lb-grande');
    E.btnUnirse = btn('Unirme a una sala', function () { irUnirse(''); }, 'lb-sec lb-grande');
    E.vInicio.appendChild(h('div', { cls: 'lb-fila' }, [E.btnCrear, E.btnUnirse]));
    E.vInicio.appendChild(h('p', { txt: 'Si tu amigo ya te envio un enlace, basta con abrirlo: entrara solo en modo "unirse".' }));

    // unirse
    E.inCodigo = campo('Pega aqui el enlace (o codigo) de invitacion', true);
    E.btnPegarU = btn('Pegar', function () { pegar(E.inCodigo); }, 'lb-sec lb-peq');
    E.btnGenerar = btn('Generar mi respuesta', function () { generarRespuesta(); }, 'lb-prim lb-grande');
    E.outResp = campo('', true, true); E.outResp.setAttribute('aria-label', 'Tu codigo de respuesta');
    E.btnCopiarR = btn('Copiar codigo', function () { copiar(E.outResp.value, E.btnCopiarR); }, 'lb-grande');
    E.btnCompR = btn('Compartir', function () { compartir(E.outResp.value); }, 'lb-sec');
    E.bloqueResp = h('div', { hidden: '' }, [h('div', { cls: 'lb-h', txt: 'Paso 2: envia este codigo al anfitrion' }), E.outResp,
      h('div', { cls: 'lb-fila' }, [E.btnCopiarR, navigator.share ? E.btnCompR : null]),
      h('p', { txt: 'Cuando el anfitrion lo pegue en su pantalla, tu conexion se abrira sola. No cierres esta ventana.' })]);
    E.btnAtrasU = btn('Atras', function () { Red.salir(); irInicio(); }, 'lb-sec');
    E.vUnirse = h('div', { cls: 'lb-vista', hidden: '' }, [h('div', { cls: 'lb-h', txt: 'Paso 1: enlace de invitacion' }), E.inCodigo,
      h('div', { cls: 'lb-fila' }, [E.btnGenerar, E.btnPegarU]), E.bloqueResp, h('div', { cls: 'lb-fila' }, [E.btnAtrasU])]);

    // sala
    E.lista = h('ul', { cls: 'lb-lista' });
    E.modos = h('div', { cls: 'lb-modos', role: 'group', 'aria-label': 'Modo de juego' });
    E.bloqueModos = h('div', { hidden: '' }, [h('div', { cls: 'lb-h', txt: 'Modo' }), E.modos]);
    E.btnInvitar = btn('Invitar amigo', invitar, 'lb-prim');
    E.outEnlace = campo('', false, true); E.outEnlace.setAttribute('aria-label', 'Enlace de invitacion');
    E.btnCopiarE = btn('Copiar enlace', function () { copiar(E.outEnlace.value, E.btnCopiarE); }, 'lb-grande');
    E.btnCompE = btn('Compartir', function () { compartir('Unete a mi sala de ' + (opts.juego || 'juego'), E.outEnlace.value); }, 'lb-sec');
    E.inResp = campo('Codigo de respuesta de tu amigo', true);
    E.btnPegarR = btn('Pegar', function () { pegar(E.inResp); }, 'lb-sec lb-peq');
    E.btnConectar = btn('Conectar', conectarAmigo, 'lb-prim lb-grande');
    E.bloqueInv = h('div', { hidden: '' }, [h('p', { txt: 'Paso 1: envia este enlace a tu amigo (el abre el enlace y te devuelve un codigo).' }), E.outEnlace,
      h('div', { cls: 'lb-fila' }, [E.btnCopiarE, navigator.share ? E.btnCompE : null]),
      h('p', { txt: 'Paso 2: pega aqui el codigo de respuesta que te mande.' }), E.inResp, h('div', { cls: 'lb-fila' }, [E.btnConectar, E.btnPegarR])]);
    E.btnOnline = btn('Invitar amigo en linea', function () { amigosAbierto = !amigosAbierto; pintarAmigosOnline(); }, 'lb-sec'); E.btnOnline.hidden = true;
    E.listaOnline = h('ul', { cls: 'lb-lista', hidden: '' });
    E.bloqueAnf = h('div', { hidden: '' }, [h('div', { cls: 'lb-fila' }, [E.btnInvitar, E.btnOnline]), E.listaOnline, E.bloqueInv]);
    E.chatLog = h('div', { cls: 'lb-chat', role: 'log', 'aria-label': 'Chat' });
    E.inChat = campo('Escribe un mensaje'); E.inChat.maxLength = 200;
    E.inChat.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') enviarChat(E.inChat.value, true); });
    E.btnChat = btn('Enviar', function () { enviarChat(E.inChat.value, true); }, 'lb-sec lb-peq');
    var rapidos = ['Listo!', 'Esperen', 'GG'].map(function (t) { return btn(t, function () { enviarChat(t); }, 'lb-sec lb-peq'); });
    E.btnListo = btn('Estoy listo', function () { var j = Red.jugadores[Red.miId]; Red.listo(!(j && j.listo)); }, 'lb-grande');
    E.btnIniciar = btn('Iniciar', iniciar, 'lb-prim lb-grande');
    E.esperaAnf = h('p', { txt: 'Esperando a que el anfitrion inicie la partida...', hidden: '' });
    E.btnSalir = btn('Salir de la sala', function () { Red.salir(); irInicio(); }, 'lb-sec');
    E.perfilSala = h('details', { cls: 'lb-ayuda' }, [h('summary', { txt: 'Mi perfil' })]);
    L.editorPerfil(E.perfilSala);
    E.vSala = h('div', { cls: 'lb-vista', hidden: '' }, [h('div', { cls: 'lb-h', txt: 'Jugadores', id: 'lb-hjug' }), E.lista, E.bloqueModos, E.bloqueAnf,
      h('div', { cls: 'lb-h', txt: 'Chat' }), E.chatLog, h('div', { cls: 'lb-fila' }, [h('div', { style: 'flex:1 1 140px' }, [E.inChat]), E.btnChat]), h('div', { cls: 'lb-fila' }, rapidos),
      h('div', { cls: 'lb-fila' }, [E.btnListo, E.btnIniciar]), E.esperaAnf, h('div', { cls: 'lb-fila' }, [E.btnSalir]), E.perfilSala]);

    E.ayuda = h('details', { cls: 'lb-ayuda' }, [h('summary', { txt: 'No conecta? Consejos' }), h('ul', {}, Red.consejos.map(function (c) { return h('li', { txt: c }); }))]);
    E.pista = h('div', { cls: 'lb-pista', 'aria-hidden': 'true' }, [h('span', {}, [h('b', { txt: '+' }), 'mover']), h('span', {}, [h('b', { txt: 'A' }), 'aceptar']), h('span', {}, [h('b', { txt: 'B' }), 'atras / cerrar'])]);

    tarjeta = h('div', { cls: 'lb-tarjeta', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lb-titulo' }, [h('div', { cls: 'lb-cab' }, [E.titulo, E.x]), E.estado, E.vInicio, E.vUnirse, E.vSala, E.ayuda, E.pista]);
    raiz = h('div', { cls: 'lb-fondo' }, [tarjeta]);
    ['keydown', 'keyup', 'keypress'].forEach(function (ev) { raiz.addEventListener(ev, teclado); });
    raiz.addEventListener('mousedown', function (e) { raiz.classList.remove('lb-mando'); if (e.target === raiz) { /* clic fuera: no cierra */ } });
    doc.body.appendChild(raiz);
  }

  /* ---------- acciones ---------- */
  function irVista(v) {
    vista = v; E.vInicio.hidden = v !== 'inicio'; E.vUnirse.hidden = v !== 'unirse'; E.vSala.hidden = v !== 'sala';
    E.titulo.textContent = (v === 'sala' ? 'SALA' : v === 'unirse' ? 'UNIRSE' : 'MULTIJUGADOR') + (opts.juego ? ' · ' + String(opts.juego).toUpperCase() : '');
    if (v === 'sala') pintarSala();
    setTimeout(enfocarPrimero, 0);
  }
  function irInicio(msg, tipo) { pend = {}; irVista('inicio'); estado(msg || '', tipo); }
  function irUnirse(codigo, auto) {
    irVista('unirse'); estado(''); E.inCodigo.value = codigo || ''; E.bloqueResp.hidden = true; E.btnGenerar.disabled = false; E.inCodigo.readOnly = false;
    if (codigo && auto) generarRespuesta();
  }
  function crearSala(sinInvitar) {
    rolPrevio = 'anfitrion';
    Red.crearSala({ max: opts.maxJugadores, url: opts.url }); estado(''); chat = []; irVista('sala'); if (sinInvitar !== true) invitar();
  }
  function invitar() {
    E.btnInvitar.disabled = true; estado('');
    Red.invitar().then(function (r) {
      pend[r.id] = true; E.outEnlace.value = r.enlace; E.bloqueInv.hidden = false; E.inResp.value = ''; pintarSala();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(r.enlace).then(function () { L.aviso('Enlace copiado'); }, function () {});
      setTimeout(enfocarPrimero, 0);
    }).catch(function (e) { estado('No se pudo crear la invitacion: ' + e.message, 'mal'); }).then(function () { E.btnInvitar.disabled = false; pintarSala(); });
  }
  function conectarAmigo() {
    var v = E.inResp.value.trim(); if (!v) { estado('Pega primero el codigo de respuesta de tu amigo', 'mal'); return; }
    E.btnConectar.disabled = true; estado('Conectando con tu amigo...');
    Red.aceptarRespuesta(v).then(function () { estado(''); E.bloqueInv.hidden = true; E.inResp.value = ''; }).catch(function (e) { estado(e.message, 'mal'); }).then(function () { E.btnConectar.disabled = false; });
  }
  function generarRespuesta() {
    var v = E.inCodigo.value.trim(); if (!v) { estado('Pega primero el enlace de invitacion', 'mal'); return; }
    rolPrevio = 'amigo'; E.btnGenerar.disabled = true; estado('Preparando la conexion (puede tardar unos segundos)...');
    Red.unirse(v).then(function (c) {
      E.outResp.value = c; E.bloqueResp.hidden = false; E.inCodigo.readOnly = true; estado('Listo. Envia el codigo al anfitrion.', 'ok'); setTimeout(function () { E.btnCopiarR.focus(); }, 0);
      if (invId && G.Cuenta && G.Cuenta.usuario) {
        var id = invId; invId = '';
        G.Cuenta.responderInvitacion(id, true, c).then(function () { estado('Respuesta enviada al anfitrion: conectando...', 'ok'); }, function (e) { estado('No se pudo responder la invitacion (' + e.message + '). Usa el codigo manualmente.', 'mal'); });
      }
    }).catch(function (e) { E.btnGenerar.disabled = false; estado(e.message, 'mal'); });
  }
  function enviarChat(t, desdeCampo) { t = String(t || '').trim(); if (!t) return; Red.chat(t); if (desdeCampo) { E.inChat.value = ''; E.inChat.focus(); } }
  function iniciar() { Red.iniciar({ modo: Red.sala.modo || (opts.modos && opts.modos[0] && opts.modos[0].id) || null, juego: opts.juego || '', maxJugadores: Red.max }); }

  /* ---------- pintado ---------- */
  function pintarSala() {
    if (vista !== 'sala' || !raiz) return;
    var host = Red.esAnfitrion, max = Red.max || opts.maxJugadores || 4, n = 0;
    E.lista.textContent = '';
    for (var i = 0; i < max; i++) {
      var j = Red.jugadores[i], li;
      if (j) {
        n++;
        li = h('li', { cls: 'lb-jug', style: '--c:' + colorTxt(j.color) }, [h('span', { cls: 'lb-punto' }), h('span', { cls: 'lb-nom' }, [j.nombre, h('small', { txt: (i === 0 ? 'anfitrion' : '') + (i === Red.miId ? (i === 0 ? ' · tu' : 'tu') : '') })]),
          i === 0 ? null : h('span', { cls: 'lb-ping ' + pingClase(j.ping), txt: Math.round(j.ping) + ' ms' }), h('span', { cls: 'lb-listo' + (j.listo ? ' lb-si' : ''), txt: j.listo ? 'Listo' : 'Espera' })]);
      } else li = h('li', { cls: 'lb-jug lb-vacio', txt: pend[i] ? 'Invitacion pendiente (esperando respuesta)' : 'Lugar libre' });
      E.lista.appendChild(li);
    }
    E.bloqueAnf.hidden = !host;
    E.btnInvitar.textContent = E.bloqueInv.hidden ? 'Invitar amigo' : 'Invitar a otro amigo';
    E.btnInvitar.hidden = !host || (n >= max);
    E.btnOnline.hidden = !host || n >= max || !(G.Cuenta && G.Cuenta.usuario); if (E.btnOnline.hidden) amigosAbierto = false;
    pintarAmigosOnline();
    E.btnIniciar.hidden = !host; E.esperaAnf.hidden = host; E.btnIniciar.disabled = n < (opts.minJugadores || 1);
    var yo = Red.jugadores[Red.miId]; E.btnListo.textContent = yo && yo.listo ? 'Ya estoy listo' : 'Estoy listo'; E.btnListo.classList.toggle('lb-on', !!(yo && yo.listo));
    var modos = opts.modos || []; E.bloqueModos.hidden = modos.length < 2; E.modos.textContent = '';
    var sel = Red.sala.modo || (modos[0] && modos[0].id);
    modos.forEach(function (m) {
      var b = btn(m.nombre, function () { if (host) Red.fijarSala({ modo: m.id }); }, 'lb-sec lb-peq'); b.setAttribute('aria-pressed', String(m.id === sel)); if (!host) { b.disabled = true; b.removeAttribute('data-f'); } E.modos.appendChild(b);
    });
    if (E.estado.hidden && n === 1 && host) estado('');
  }
  function pintarChat() {
    E.chatLog.textContent = '';
    chat.slice(-40).forEach(function (m) { E.chatLog.appendChild(h('div', {}, [h('b', { txt: m.nombre + ': ', style: 'color:' + colorTxt(m.color) }), m.texto])); });
    E.chatLog.scrollTop = E.chatLog.scrollHeight;
  }

  /* ---------- invitacion directa a amigos en linea (requiere comun/cuenta.js con sesion) ---------- */
  var ESTADOS = { en_linea: 'en linea', jugando: 'jugando', ausente: 'ausente', desconectado: 'desconectado' };
  function juegoId() { return (G.Cuenta && G.Cuenta.juegoActual()) || opts.juegoId || ''; }
  function pintarAmigosOnline() {
    if (!E.listaOnline) return;
    E.listaOnline.hidden = !amigosAbierto; E.btnOnline.setAttribute('aria-expanded', String(amigosAbierto)); E.listaOnline.textContent = '';
    if (!amigosAbierto || !(G.Cuenta && G.Cuenta.usuario)) return;
    var am = G.Cuenta.amigos.lista.filter(function (a) { return a.estado !== 'desconectado'; });
    if (!am.length) { E.listaOnline.appendChild(h('li', { cls: 'lb-jug lb-vacio', txt: G.Cuenta.amigos.lista.length ? 'Ningun amigo esta conectado ahora' : 'Aun no tienes amigos: agregalos en el portal' })); return; }
    am.forEach(function (a) {
      E.listaOnline.appendChild(h('li', { cls: 'lb-jug', style: '--c:' + colorTxt(a.color) }, [h('span', { cls: 'lb-punto' }), h('span', { cls: 'lb-nom' }, [a.nombre, h('small', { txt: ESTADOS[a.estado] || '' })]), btn('Invitar', function () { invitarAmigo(a); }, 'lb-prim lb-peq')]));
    });
  }
  function invitarAmigo(a) {
    if (!Red.esAnfitrion || !G.Cuenta || !G.Cuenta.usuario) return;
    estado('Invitando a ' + a.nombre + '...'); amigosAbierto = false; pintarAmigosOnline();
    Red.invitar().then(function (r) {
      pend[r.id] = true; pintarSala();
      return G.Cuenta.invitar(a.uid, juegoId(), r.codigo).then(function (inv) {
        estado('Invitacion enviada a ' + a.nombre + '. Esperando su respuesta (caduca en 5 minutos)...', 'ok');
        var fin = false, un = function () {}, cierra = setTimeout(function () { if (fin) return; fin = true; un(); G.Cuenta.cancelarInvitacion(a.uid, inv.id); estado('La invitacion a ' + a.nombre + ' caduco.', 'mal'); }, 300000);
        un = G.Cuenta.escucharRespuesta(a.uid, inv.id, function (d) {
          if (fin || d.estado === 'pendiente') return;
          fin = true; clearTimeout(cierra); un();
          if (d.estado === 'aceptada' && d.respuesta) {
            estado(a.nombre + ' acepto: conectando...');
            Red.aceptarRespuesta(d.respuesta).then(function () { estado(''); }).catch(function (e) { estado('No se pudo conectar con ' + a.nombre + ': ' + e.message, 'mal'); }).then(function () { G.Cuenta.borrarInvitacion(a.uid, inv.id); });
          } else { estado(a.nombre + (d.estado === 'rechazada' ? ' rechazo la invitacion.' : ' no esta disponible.'), 'mal'); G.Cuenta.borrarInvitacion(a.uid, inv.id); }
        });
      });
    }).catch(function (e) { estado('No se pudo invitar: ' + (e && e.message), 'mal'); });
  }
  /* Un amigo en linea te invito y aceptaste estando ya en este juego: abre el lobby en "unirse" y responde solo. */
  L.unirseInvitacion = function (inv) {
    if (!opts || !opts.juego) { if (G.Cuenta) G.Cuenta.ui.aviso('Abre el multijugador del juego para unirte.', { color: '#ffd23d' }); return false; }
    if (Red.estado !== 'inactivo') Red.salir();
    L.abrir(opts); invId = inv.id; irUnirse(inv.oferta, true); return true;
  };
  L.registrar = function (o) { opts = o || opts; return L; };
  function parametro(n) { var m = new RegExp('[?&]' + n + '=([A-Za-z0-9_-]+)').exec(G.location.search); return m ? m[1] : ''; }
  function limpiarUrl(nombres) {
    try { var u = new URL(G.location.href); nombres.forEach(function (n) { u.searchParams.delete(n); }); G.history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  }

  /* ---------- eventos de Red ---------- */
  function suscribir() {
    if (suscrito) return; suscrito = true;
    Red.on('jugadores', function () { if (raiz && L.abierto) pintarSala(); });
    Red.on('sala', function () { if (raiz && L.abierto) pintarSala(); });
    Red.on('jugadorUnido', function (id, j) {
      delete pend[id]; if (L.avisos && j) L.aviso(j.nombre + ' se unio', j.color);
      if (raiz && L.abierto) { if (Red.esAnfitrion) { E.bloqueInv.hidden = true; } pintarSala(); }
    });
    Red.on('jugadorSalio', function (id, j, motivo) { if (L.avisos && j) L.aviso(j.nombre + ' se desconecto', '#ff6b6b'); if (raiz && L.abierto) pintarSala(); });
    Red.on('invitacion', function (id, ev) { if (ev === 'expirada') { delete pend[id]; if (raiz && L.abierto) pintarSala(); } });
    Red.on('conectado', function () { if (raiz && L.abierto) { chat = []; pintarChat(); estado(''); irVista('sala'); } });
    Red.on('chat', function (de, texto, j) { chat.push({ nombre: j ? j.nombre : 'Jugador', color: j ? j.color : '#fff', texto: texto }); if (raiz && L.abierto) pintarChat(); });
    Red.on('cerrado', function (motivo) {
      if (motivo === 'salir') return;
      if (L.avisos) L.aviso('Conexion cerrada: ' + motivo, '#ff6b6b');
      if (raiz && L.abierto) {
        irInicio('Conexion perdida (' + motivo + '). Puedes volver a intentarlo.', 'mal');
        if (rolPrevio) { if (!E.btnReconectar) { E.btnReconectar = btn('Reconectar', reconectar, 'lb-prim lb-grande'); E.btnCrear.parentNode.insertBefore(E.btnReconectar, E.btnCrear); } E.btnReconectar.hidden = false; }
      }
    });
    Red.on('iniciar', function (config, jugadores) { var o = opts; L.cerrar(true); if (o && o.alIniciar) { try { o.alIniciar(config, jugadores); } catch (e) { console.error(e); } } });
  }
  function reconectar() { if (E.btnReconectar) E.btnReconectar.hidden = true; if (rolPrevio === 'anfitrion') crearSala(); else irUnirse(''); }

  /* ---------- abrir / cerrar ---------- */
  L.hayEnlace = function () { return !!Red.codigoDeUrl() || (!!parametro('invitar') && Red.estado === 'inactivo'); };
  L.abrir = function (o) {
    opts = o || opts || {}; construir(); suscribir();
    var codigo = Red.codigoDeUrl(), pInv = parametro('inv'), pInvitar = parametro('invitar');
    if (pInv) { invId = pInv; } if (pInvitar && Red.estado === 'inactivo') invitarUid = pInvitar;
    if (pInv || pInvitar) limpiarUrl(['inv', 'invitar']);
    L.abierto = true; raiz.classList.add('lb-abierto'); doc.documentElement.style.overscrollBehavior = 'contain';
    if (E.btnReconectar) E.btnReconectar.hidden = true;
    pintarChat();
    if (codigo && Red.estado === 'inactivo') {
      try { G.history.replaceState(null, '', G.location.pathname + G.location.search.replace(/([?&])sala=[^&]*&?/, '$1').replace(/[?&]$/, '') + G.location.hash.replace(/sala=[^&]*/, '')); } catch (e) {}
      irUnirse(codigo, true);
    } else if (invitarUid && !codigo) {
      var uidAmigo = invitarUid; invitarUid = ''; crearSala(true); amigosAbierto = false;
      if (G.Cuenta) G.Cuenta.iniciar().then(function () {
        var intentos = 0, espera = setInterval(function () {
          var a = G.Cuenta.amigos.lista.filter(function (x) { return x.uid === uidAmigo; })[0];
          if (a) { clearInterval(espera); invitarAmigo(a); } else if (++intentos > 20) { clearInterval(espera); estado('No se encontro a ese amigo en tu lista.', 'mal'); }
        }, 250);
      });
    } else if (Red.conectado) irVista('sala'); else if (Red.estado === 'uniendo') irVista('unirse'); else irInicio();
    bloqueo = true; ultimaDir = '';
    if (!raf) raf = requestAnimationFrame(bucleMando);
    return L;
  };
  L.cerrar = function (porInicio) {
    if (!raiz || !L.abierto) return;
    L.abierto = false; raiz.classList.remove('lb-abierto', 'lb-mando'); doc.documentElement.style.overscrollBehavior = '';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!porInicio && opts.alCerrar) { try { opts.alCerrar(); } catch (e) {} }
  };

  /* ---------- teclado y mando ---------- */
  function teclado(e) {
    e.stopPropagation();
    if (e.type !== 'keydown') return;
    if (e.key === 'Escape') { e.preventDefault(); atras(); }
    else if (e.key === 'Tab') {
      var l = enfocables(); if (!l.length) return; var i = l.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); l[l.length - 1].focus(); } else if (!e.shiftKey && (i === l.length - 1)) { e.preventDefault(); l[0].focus(); }
    } else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target === E.inCodigo) { e.preventDefault(); generarRespuesta(); }
  }
  function atras() {
    if (vista === 'unirse') { Red.salir(); irInicio(); } else L.cerrar();
  }
  function enfocables() {
    return Array.prototype.slice.call(tarjeta.querySelectorAll('[data-f]')).filter(function (e) { return !e.disabled && e.offsetParent !== null; });
  }
  function enfocarPrimero() {
    if (!L.abierto) return;
    var l = enfocables(), pref = vista === 'inicio' ? E.btnCrear : vista === 'unirse' ? (E.bloqueResp.hidden ? E.inCodigo : E.btnCopiarR) : (Red.esAnfitrion && !E.bloqueInv.hidden ? E.btnCopiarE : E.btnListo);
    var f = l.indexOf(pref) >= 0 ? pref : l[0]; if (f && l.indexOf(doc.activeElement) < 0) f.focus({ preventScroll: true });
  }
  function centro(e) { var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function mover(dir) {
    var l = enfocables(), act = l.indexOf(doc.activeElement) >= 0 ? doc.activeElement : null;
    if (!act) { if (l[0]) l[0].focus(); return; }
    var c0 = centro(act), r0 = act.getBoundingClientRect(), vx = dir === 'D' ? 1 : dir === 'I' ? -1 : 0, vy = dir === 'B' ? 1 : dir === 'A' ? -1 : 0, mejor = null, mp = Infinity;
    l.forEach(function (e) {
      if (e === act) return;
      var r = e.getBoundingClientRect(), c = centro(e), dx = c.x - c0.x, dy = c.y - c0.y, a = dx * vx + dy * vy;
      if (a <= 2) return;
      var cruz = Math.abs(dx * vy) + Math.abs(dy * vx), solapa = vx ? (r.top < r0.bottom - 4 && r.bottom > r0.top + 4) : (r.left < r0.right - 4 && r.right > r0.left + 4);
      if (vx && !solapa) return;
      var p = a + cruz * (solapa ? 0.5 : 2); if (p < mp) { mp = p; mejor = e; }
    });
    if (mejor) { mejor.focus({ preventScroll: true }); mejor.scrollIntoView({ block: 'nearest' }); }
  }
  var ultimaDir = '', tRepite = 0, bloqueo = true;
  function bucleMando() {
    if (!L.abierto) { raf = 0; return; }
    raf = requestAnimationFrame(bucleMando);
    var M = G.Mando; if (!M) return;
    M.leer(); if (!M.conectado) { ultimaDir = ''; return; }
    var t = performance.now(), activo = M.activo && t - M._ultimoUso < 150;
    if (activo) raiz.classList.add('lb-mando');
    var d = '';
    if (M.sostenido('ARRIBA')) d = 'A'; else if (M.sostenido('ABAJO')) d = 'B'; else if (M.sostenido('IZQ')) d = 'I'; else if (M.sostenido('DER')) d = 'D';
    else { var x = M.ejes.izq.x, y = M.ejes.izq.y; if (Math.hypot(x, y) > 0.45) d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'D' : 'I') : (y > 0 ? 'B' : 'A'); }
    if (!d) ultimaDir = ''; else if (d !== ultimaDir) { ultimaDir = d; tRepite = t + 380; mover(d); } else if (t >= tRepite) { tRepite = t + 140; mover(d); }
    if (bloqueo) { if (!['A', 'B', 'X', 'Y', 'MENU'].some(function (n) { return M.sostenido(n); })) bloqueo = false; return; }
    if (M.pulsado('A')) { var a = doc.activeElement; if (a && tarjeta.contains(a)) { a.click(); if (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') a.focus(); } else enfocarPrimero(); }
    if (M.pulsado('B')) atras();
  }
})(window);
