/* Interfaz DOM: menu, editor de skins, HUD, pausa, fin de vida/ronda, ayuda, logros, estadisticas. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, h = S.h, btn = S.btn, fmt = S.fmt, K = S.Skins, U = S.UI = {}, doc = G.document;
  var $ = function (id) { return doc.getElementById(id); };
  var menu, pila = [], hud = {}, cb = {}, skinCv, editorCv, tToast = 0;

  U.init = function (callbacks) {
    cb = callbacks;
    hud = { raiz: $('hud'), long: $('hLong'), rank: $('hRank'), modo: $('hModo'), tabla: $('hTabla'), feed: $('hFeed'), aviso: $('hAviso'), fps: $('hFps'), mini: $('mini') };
    $('btnPausa').addEventListener('click', function () { cb.pausa(); });
    S.Nav.raiz = U.raizActiva; S.Nav.atras = function () { var t = pila[pila.length - 1]; if (t && t._atras) t._atras(); else if (t && t._cerrar) t._cerrar(); };
    S.Nav.pestana = function (d) { if (pila.length && pila[pila.length - 1]._tabs) S.Ajustes.pestana(d); };
  };
  U.raizActiva = function () { if (pila.length) return pila[pila.length - 1]; return menu && menu.style.display !== 'none' ? menu : null; };
  U.hayModal = function () { return pila.length > 0; };
  U.enfocar = function (el) { setTimeout(function () { var f = el.querySelector('[data-fdef]') || el.querySelector('[data-f]'); if (f && S.Entrada.disp === 'mando' || (G.Mando && G.Mando.activo && f)) f.focus(); }, 30); };

  /* ---------- modales ---------- */
  U.modal = function (titulo, cuerpo, opts) {
    opts = opts || {};
    var cerrar = function () { U.cerrar(m); if (opts.alCerrar) opts.alCerrar(); };
    var m = h('div', { cls: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [
      h('div', { cls: 'tarjeta' + (opts.ancha ? ' ancha' : '') }, [
        h('div', { cls: 'cab' }, [h('h2', { txt: titulo }), opts.sinCerrar ? null : h('button', { type: 'button', cls: 'x', 'aria-label': 'Cerrar', 'data-f': 1, txt: '✕', on: { click: cerrar } })]),
        h('div', { cls: 'cuerpo' }, [].concat(cuerpo))
      ])
    ]);
    m._cerrar = opts.sinCerrar ? null : cerrar; m._atras = opts.atras || (opts.sinCerrar ? null : cerrar); m._tabs = !!opts.tabs;
    doc.body.appendChild(m); pila.push(m); U.enfocar(m); return m;
  };
  U.cerrar = function (m) { var i = pila.indexOf(m); if (i >= 0) pila.splice(i, 1); if (m.parentNode) m.parentNode.removeChild(m); };
  U.cerrarTodo = function () { while (pila.length) U.cerrar(pila[pila.length - 1]); };
  U.toast = function (txt, cls) {
    var t = h('div', { cls: 'toast ' + (cls || ''), txt: txt }); $('toasts').appendChild(t); setTimeout(function () { t.remove(); }, 3600);
  };
  U.logroToast = function (l) { U.toast('★ Logro: ' + l.nombre + ' — ' + l.desc, 'logro'); };

  /* ---------- menu principal ---------- */
  U.menu = function (info) {
    if (!menu) { menu = h('div', { id: 'menu', cls: 'menu' }); $('pantallas').appendChild(menu); }
    menu.style.display = ''; menu.textContent = ''; $('hud').classList.add('oculto'); S.Entrada.mostrarTactil(false);
    var pf = G.Red ? G.Red.perfil.obtener() : { nombre: 'Jugador' };
    var nombre = h('input', { cls: 'campo nombre', type: 'text', maxlength: 16, value: pf.nombre, 'aria-label': 'Tu nombre', 'data-f': 1, autocomplete: 'off' });
    nombre.addEventListener('change', function () { if (G.Red) G.Red.perfil.guardar({ nombre: nombre.value, color: G.Red.perfil.obtener().color }); });
    skinCv = h('canvas', { width: 280, height: 120, cls: 'previa', 'aria-label': 'Tu skin' });
    var modo = A.aj.modo, dif = A.aj.dif;
    var modos = h('div', { cls: 'modos', role: 'group', 'aria-label': 'Modo de juego' }), desc = h('div', { cls: 'nota', txt: S.MODOS[modo].desc });
    Object.keys(S.MODOS).forEach(function (k) {
      var b = h('button', { type: 'button', cls: 'pill' + (k === modo ? ' sel' : ''), 'aria-pressed': String(k === modo), 'data-f': 1, txt: S.MODOS[k].nombre, on: { click: function () { A.aj.modo = k; A.guardarAj(); U.menu(info); setTimeout(function () { var q = menu.querySelector('.modos .sel'); if (q && G.Mando && G.Mando.activo) q.focus(); }, 20); } } });
      modos.appendChild(b);
    });
    var difs = h('div', { cls: 'modos', role: 'group', 'aria-label': 'Dificultad de los bots' });
    Object.keys(S.DIFS).forEach(function (k) {
      difs.appendChild(h('button', { type: 'button', cls: 'pill' + (k === dif ? ' sel' : ''), 'aria-pressed': String(k === dif), 'data-f': 1, txt: S.DIFS[k].nombre, on: { click: function () { A.aj.dif = k; A.guardarAj(); U.menu(info); } } }));
    });
    var cont = info.partida ? btn('Continuar partida (' + info.partida + ')', function () { cb.continuar(); }, 'sec grande') : null;
    var salaBtn = info.sala ? btn('Multijugador: volver a abrir tu sala', function () { cb.multi(true); }, 'sec') : null;
    menu.appendChild(h('div', { cls: 'menu-in' }, [
      h('h1', { cls: 'logo', txt: 'SERPIENTES' }), h('div', { cls: 'sub', txt: 'Crece, caza y no toques los cuerpos ajenos.' }),
      h('div', { cls: 'perfil' }, [skinCv, h('div', { cls: 'perfil-d' }, [nombre, btn('Cambiar skin', function () { U.editorSkin(); }, 'sec peq'), h('div', { cls: 'record', txt: 'Récord de longitud: ' + fmt(A.prog.record) })])]),
      h('div', { cls: 'etq', txt: 'Modo' }), modos, desc, h('div', { cls: 'etq', txt: 'Dificultad de los bots' }), difs,
      btn('JUGAR', function () { cb.jugar(); }, 'prim grande'), cont,
      btn('Multijugador (hasta 4 + bots)', function () { cb.multi(false); }, 'sec'), salaBtn,
      h('div', { cls: 'fila-btns' }, [btn('Logros', U.logros, 'peq'), btn('Estadísticas', U.stats, 'peq'), btn('Ajustes', U.ajustes, 'peq'), btn('Ayuda', U.ayuda, 'peq')]),
      h('a', { cls: 'volver', href: '../', 'data-f': 1, txt: '← Volver al menú de juegos' })
    ]));
    var first = menu.querySelector('.prim'); if (first) first.setAttribute('data-fdef', 1);
  };
  U.ocultarMenu = function () { if (menu) menu.style.display = 'none'; };
  U.menuVisible = function () { return !!menu && menu.style.display !== 'none'; };
  U.animarPrevias = function (t) {
    if (U.menuVisible() && skinCv && skinCv.isConnected) S.Dibujo.previa(skinCv, A.prog.skin, t);
    if (editorCv && editorCv.isConnected) S.Dibujo.previa(editorCv, U._skinEd, t);
  };

  /* ---------- editor de skins ---------- */
  U.editorSkin = function () {
    var sk = K.limpiar(A.prog.skin); U._skinEd = sk;
    editorCv = h('canvas', { width: 320, height: 130, cls: 'previa' });
    var cuerpo = h('div', { cls: 'editor' });
    var m;
    function cambia() { U._skinEd = sk = K.limpiar(sk); }
    function grupo(titulo, lista, clave) {
      var g = h('div', { cls: 'pills', role: 'group', 'aria-label': titulo });
      lista.forEach(function (n, i) { g.appendChild(h('button', { type: 'button', cls: 'pill' + (sk[clave] === i ? ' sel' : ''), 'aria-pressed': String(sk[clave] === i), 'data-f': 1, txt: n, on: { click: function () { sk[clave] = i; cambia(); pintar(); } } })); });
      return [h('div', { cls: 'etq', txt: titulo }), g];
    }
    function rango(titulo, clave) {
      var o = h('span', { cls: 'sw' }), r = h('input', { type: 'range', min: 0, max: 359, step: 5, 'data-f': 1, 'aria-label': titulo }); r.value = sk[clave];
      var f = function () { o.style.background = 'hsl(' + r.value + ',85%,55%)'; }; f();
      r.addEventListener('input', function () { sk[clave] = +r.value; f(); cambia(); });
      return h('label', { cls: 'rng' }, [h('span', { txt: titulo }), r, o]);
    }
    function pintar() {
      cuerpo.textContent = '';
      cuerpo.appendChild(editorCv);
      cuerpo.appendChild(h('div', { cls: 'etq', txt: 'Estilos listos' }));
      cuerpo.appendChild(h('div', { cls: 'pills' }, K.PRESETS.map(function (p) { return h('button', { type: 'button', cls: 'pill', 'data-f': 1, txt: p.n, on: { click: function () { sk = K.limpiar(p.s); cambia(); pintar(); } } }); })));
      grupo('Patrón', K.PATRONES, 'p').forEach(function (e) { cuerpo.appendChild(e); });
      cuerpo.appendChild(rango('Color principal', 'h1')); cuerpo.appendChild(rango('Color secundario', 'h2'));
      grupo('Intensidad', K.INTENSIDAD, 'v').forEach(function (e) { cuerpo.appendChild(e); });
      grupo('Ojos', K.OJOS, 'o').forEach(function (e) { cuerpo.appendChild(e); });
      grupo('Accesorio', K.ACCESORIOS, 'a').forEach(function (e) { cuerpo.appendChild(e); });
      var chk = h('input', { type: 'checkbox', 'data-f': 1 }); chk.checked = !!sk.g; chk.addEventListener('change', function () { sk.g = chk.checked ? 1 : 0; cambia(); });
      cuerpo.appendChild(h('label', { cls: 'chk' }, [chk, h('span', { txt: 'Brillo (aura luminosa)' })]));
      cuerpo.appendChild(h('div', { cls: 'fila-btns' }, [
        btn('Aleatoria', function () { sk = K.aleatoria(); cambia(); pintar(); }, 'peq'),
        btn('Guardar en mis skins', function () { A.prog.skins.push({ n: 'Skin ' + (A.prog.skins.length + 1), s: K.codificar(sk) }); if (A.prog.skins.length > 12) A.prog.skins.shift(); A.guardarProg(); S.Logros.dar('estilista'); pintar(); }, 'peq')
      ]));
      if (A.prog.skins.length) {
        cuerpo.appendChild(h('div', { cls: 'etq', txt: 'Mis skins' }));
        cuerpo.appendChild(h('div', { cls: 'pills' }, A.prog.skins.map(function (q, i) {
          return h('span', { cls: 'mis' }, [h('button', { type: 'button', cls: 'pill', 'data-f': 1, txt: q.n, on: { click: function () { sk = K.decodificar(q.s); cambia(); pintar(); } } }), h('button', { type: 'button', cls: 'pill x2', 'aria-label': 'Borrar ' + q.n, 'data-f': 1, txt: '✕', on: { click: function () { A.prog.skins.splice(i, 1); A.guardarProg(); pintar(); } } })]);
        })));
      }
      cuerpo.appendChild(btn('Usar esta skin', function () { A.prog.skin = K.limpiar(sk); A.guardarProg(); U.cerrar(m); U._skinEd = null; editorCv = null; if (cb.skinCambiada) cb.skinCambiada(); }, 'prim'));
    }
    pintar();
    m = U.modal('Tu skin', [cuerpo], { ancha: true, alCerrar: function () { editorCv = null; } });
  };

  /* ---------- HUD ---------- */
  U.hudMostrar = function (si) { hud.raiz.classList.toggle('oculto', !si); };
  U.hudActualizar = function (d) {
    hud.long.innerHTML = 'Longitud <b>' + fmt(d.masa) + '</b>';
    hud.rank.textContent = d.rank ? 'Puesto ' + d.rank + ' de ' + d.n : '';
    hud.modo.innerHTML = d.modoHtml || '';
    var t = ''; for (var i = 0; i < d.top.length; i++) { var e = d.top[i]; t += '<li' + (e.yo ? ' class="yo"' : '') + '><span>' + (i + 1) + '. ' + esc(e.nombre) + '</span><b>' + fmt(e.v) + '</b></li>'; }
    hud.tabla.innerHTML = '<h3>' + (d.tituloTabla || 'Clasificación') + '</h3><ol>' + t + '</ol>';
    if (hud.fps.textContent !== d.fps) hud.fps.textContent = d.fps || '';
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  U.feed = function (txt) {
    var e = h('div', { cls: 'kf', txt: txt }); hud.feed.appendChild(e); setTimeout(function () { e.remove(); }, 5200); while (hud.feed.children.length > 5) hud.feed.removeChild(hud.feed.firstChild);
  };
  U.aviso = function (txt, ms) { hud.aviso.textContent = txt; hud.aviso.classList.toggle('on', !!txt); clearTimeout(tToast); if (txt) tToast = setTimeout(function () { hud.aviso.classList.remove('on'); }, ms || 4000); };
  U.pistas = function (disp) {
    var tactil = disp === 'tactil';
    var l = tactil ? ['Arrastra el pulgar en la pantalla para dirigir la serpiente', 'Mantén TURBO para acelerar (gasta masa)', 'Come los orbes brillantes para crecer', 'Evita el borde rojo y los cuerpos de otras serpientes'] :
      disp === 'mando' ? ['Stick izquierdo: dirige la serpiente', 'A o RT: turbo (gasta masa)', 'Come orbes para crecer; no toques cuerpos ajenos', 'MENU: pausa'] :
      ['Mueve el ratón (o A/D, flechas) para dirigir la serpiente', 'Clic o Espacio: turbo (gasta masa)', 'Come los orbes brillantes para crecer', 'Evita el borde rojo y los cuerpos de otras serpientes'];
    l.forEach(function (t, i) { setTimeout(function () { if (U.enPartida) U.aviso(t, 3600); }, i * 4200 + 600); });
  };

  /* ---------- pausa / fin ---------- */
  U.pausa = function (opts) {
    var m = U.modal('Pausa', [
      btn('Continuar', function () { U.cerrar(m); opts.continuar(); }, 'prim'), btn('Ajustes', U.ajustes, 'sec'), btn('Ayuda', U.ayuda, 'sec'),
      opts.invitar ? btn('Invitar amigos / sala', opts.invitar, 'sec') : null,
      btn(opts.red ? 'Salir de la partida' : 'Guardar y salir al menú', function () { U.cerrar(m); opts.salir(); }, 'sec pel')
    ], { atras: function () { U.cerrar(m); opts.continuar(); }, alCerrar: opts.continuar });
    m.querySelector('.prim').setAttribute('data-fdef', 1); return m;
  };
  U.muerte = function (r) {
    var cuerpo = [
      h('div', { cls: 'stats' }, [fila('Longitud final', fmt(r.masa)), fila('Eliminaciones', r.kills), fila('Tiempo vivo', S.tiempo(r.vivo)), r.puesto ? fila('Puesto al morir', '#' + r.puesto) : null, fila('Récord', fmt(A.prog.record) + (r.nuevoRecord ? ' ★ nuevo' : ''))]),
      h('div', { cls: 'nota', txt: r.causa || '' })
    ];
    var m = U.modal(r.titulo || 'Has muerto', cuerpo.concat([].concat(r.botones.map(function (b) { return btn(b[0], function () { U.cerrar(m); b[1](); }, b[2] || 'sec'); }))), { sinCerrar: true });
    var p = m.querySelector('.prim'); if (p) p.setAttribute('data-fdef', 1);
    m._cuenta = r.cuenta; return m;
  };
  function fila(a, b) { return h('div', { cls: 'sf' }, [h('span', { txt: a }), h('b', { txt: String(b) })]); }
  U.fin = function (r) {
    var m = U.modal(r.titulo, [h('div', { cls: 'fin-t', txt: r.texto }), r.lista ? h('ol', { cls: 'fin-l' }, r.lista.map(function (x) { return h('li', { txt: x }); })) : null].concat(r.botones.map(function (b) { return btn(b[0], function () { U.cerrar(m); b[1](); }, b[2] || 'sec'); })), { sinCerrar: true });
    var p = m.querySelector('.prim'); if (p) p.setAttribute('data-fdef', 1); return m;
  };
  U.info = function (titulo, texto, botones) {
    var m = U.modal(titulo, [h('p', { cls: 'fin-t', txt: texto })].concat((botones || [['Aceptar', function () {}, 'prim']]).map(function (b) { return btn(b[0], function () { U.cerrar(m); b[1](); }, b[2] || 'sec'); })), { sinCerrar: true });
    var p = m.querySelector('.prim'); if (p) p.setAttribute('data-fdef', 1); return m;
  };

  /* ---------- ajustes / ayuda / logros / estadisticas ---------- */
  U.ajustes = function () {
    var c = h('div', { cls: 'ajustes' }); S.Ajustes.montar(c);
    U.modal('Ajustes', [c], { ancha: true, tabs: true });
  };
  U.ayuda = function () {
    var d = S.Entrada.disp, tac = S.Entrada.tactil;
    function bloque(t, l, act) { return h('div', { cls: 'ay' + (act ? ' act' : '') }, [h('h3', { txt: t })].concat(l.map(function (x) { return h('div', { txt: x }); }))); }
    var tk = A.disp.controles.teclas, N = S.Entrada.nombreTecla;
    var m = U.modal('Cómo se juega', [
      h('p', { cls: 'nota', txt: 'Come orbes para crecer. Si tu cabeza toca el cuerpo de otra serpiente o el borde rojo de la arena, mueres y sueltas orbes. El turbo te acelera pero gasta masa y deja una estela de orbes.' }),
      bloque('Ratón', ['Mueve el cursor: la serpiente lo sigue.', 'Clic mantenido o ' + N(tk.turbo) + ': turbo.'], d === 'mouse'),
      bloque('Teclado', [N(tk.izq) + ' / ' + N(tk.der) + ' o flechas: girar.', N(tk.turbo) + ': turbo.  ' + N(tk.pausa) + ' o Esc: pausa.'], d === 'teclado'),
      bloque('Táctil', ['Arrastra en cualquier parte: joystick flotante.', 'Botón TURBO (esquina inferior).'], d === 'tactil' || tac),
      bloque('Mando Xbox', ['Stick izquierdo: dirigir.  A o RT: turbo.', 'MENU: pausa.  Cruceta/stick y A/B para los menús; LB/RB cambia pestañas.'], d === 'mando'),
      h('p', { cls: 'nota', txt: 'Modos: Todos contra todos, Equipos (sin daño entre aliados), Supervivencia (la arena se encoge) y Rey de la colina (permanece en la zona dorada). Multijugador: hasta 4 personas más bots.' }),
      btn('Entendido', function () { U.cerrar(m); }, 'prim')
    ]);
    m.querySelector('.prim').setAttribute('data-fdef', 1);
  };
  U.logros = function () {
    var L = S.Logros, items = L.LISTA.map(function (l) {
      var ok = A.prog.logros[l.id];
      return h('li', { cls: ok ? 'ok' : '' }, [h('b', { txt: (ok ? '★ ' : '☆ ') + l.nombre }), h('span', { txt: l.desc })]);
    });
    U.modal('Logros ' + L.totales() + '/' + L.LISTA.length, [h('ul', { cls: 'logros' }, items)], { ancha: true });
  };
  U.stats = function () {
    var s = A.prog.stats;
    U.modal('Estadísticas', [h('div', { cls: 'stats' }, [
      fila('Récord de longitud', fmt(A.prog.record)), fila('Partidas', s.partidas), fila('Eliminaciones', s.kills), fila('Muertes', s.muertes), fila('Orbes comidos', fmt(s.orbes)),
      fila('Tiempo jugado', S.tiempo(s.tiempo)), fila('Longitud máxima', fmt(s.maxMasa)), fila('Tiempo de turbo', S.tiempo(s.turbo)), fila('Victorias', s.victorias), fila('Partidas multijugador', s.mpPartidas),
      fila('Logros', S.Logros.totales() + '/' + S.Logros.LISTA.length)
    ])]);
  };
})(typeof window !== 'undefined' ? window : globalThis);
