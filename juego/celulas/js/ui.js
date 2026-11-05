/* Celulas: interfaz (menu, HUD, pantallas). Solo DOM; la logica del juego esta en principal.js */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document, Al = C.Almacen;
  var U = C.UI = { cache: {} };
  function h(tag, cls, txt, attrs) {
    var e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt;
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  }
  function $(id) { return doc.getElementById(id); }
  U.$ = $; U.h = h;
  function perfil() { var p = Al.leer('perfil', null) || {}, Cu = C.Cu; return { nombre: String(p.nombre || ''), c: p.c || (Cu && Cu.color()) || C.COLORES_SKIN[0], p: p.p | 0, e: p.e || '' }; }
  U.perfil = function () {
    var p = perfil(), R = G.Red, Cu = C.Cu;
    if (!p.nombre) { p.nombre = (Cu && Cu.nombre()) || (R && R.perfil ? R.perfil.obtener().nombre : 'Célula'); }
    return { nombre: p.nombre.slice(0, 16), skin: C.Skins.texto({ c: p.c, p: p.p, e: p.e }), c: p.c, pat: p.p, e: p.e };
  };

  /* ---------- pantallas ---------- */
  U.pantallas = ['menu', 'pausa', 'muerte', 'ajustes', 'logros', 'ranking', 'ayuda', 'sala'];
  U.visible = function (id) { return !$(id).classList.contains('oculto'); };
  U.hayOverlay = function () { for (var i = 0; i < U.pantallas.length; i++) if (U.visible(U.pantallas[i])) return true; return false; };
  U.mostrar = function (id, vidrio) {
    var e = $(id); e.classList.remove('oculto'); e.classList.toggle('vidrio', !!vidrio); U.nav();
    var el = e.querySelector('.principal'); if (el && C.Nav.raiz === e) setTimeout(function () { C.Nav.enfocar(el); }, 40);
  };
  U.ocultar = function (id) { $(id).classList.add('oculto'); U.nav(); };
  U.nav = function () {
    var top = null;
    ['sala', 'ayuda', 'ranking', 'logros', 'ajustes', 'muerte', 'pausa', 'menu'].forEach(function (id) { if (!top && U.visible(id)) top = $(id); });
    C.Nav.fijar(top);
  };
  U.toast = function (txt, color, ms) {
    var cont = $('avisos'), e = h('div', 'aviso', txt); if (color) e.style.setProperty('--c', color);
    cont.appendChild(e); while (cont.children.length > 4) cont.removeChild(cont.firstChild);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, ms || 3200);
  };

  /* ---------- menu ---------- */
  U.menu = function (acc) {
    var m = $('menu'), P = perfil(), prog = C.progreso(), gen = C.Aj.gen;
    m.textContent = '';
    var cab = h('div', 'm-cab'), vol = h('a', '', '← Menú'); vol.href = '../'; cab.appendChild(vol);
    cab.appendChild(h('h1', 'm-titulo', 'CÉLULAS')); cab.appendChild(C.Cu.chipCuenta(C.Cu.panelCuenta)); m.appendChild(cab);
    var grid = h('div', 'm-grid'), t1 = h('div', 'tarjeta'), t2 = h('div', 'tarjeta');
    t1.appendChild(h('h3', '', 'TU CÉLULA'));
    var nom = h('input', 'campo', null, { type: 'text', maxlength: 16, placeholder: 'Tu nombre', 'aria-label': 'Tu nombre', autocomplete: 'off' });
    nom.value = U.perfil().nombre; nom.oninput = function () { P.nombre = nom.value.replace(/[<>]/g, ''); guardarPerfil(); };
    t1.appendChild(nom);
    var fila = h('div', 'skin-fila'), prev = h('canvas', '', null, { id: 'skinPrev', width: 96, height: 96, 'aria-label': 'Vista previa de tu skin' });
    fila.style.marginTop = '10px'; fila.appendChild(prev);
    var pats = h('div', 'chips'); pats.style.marginTop = 0;
    C.PATRONES.forEach(function (n, i) { var b = h('button', 'chip', n, { type: 'button', 'aria-pressed': String(P.p === i) }); b.onclick = function () { P.p = i; guardarPerfil(); pintar(); }; pats.appendChild(b); });
    fila.appendChild(pats); t1.appendChild(fila);
    var cols = h('div', 'chips'), ems = h('div', 'chips');
    C.COLORES_SKIN.forEach(function (c) { var b = h('button', 'chip color', '', { type: 'button', 'aria-label': 'Color ' + c, 'aria-pressed': String(P.c === c) }); b.style.background = c; b.onclick = function () { P.c = c; guardarPerfil(); pintar(); }; cols.appendChild(b); });
    C.EMOJIS.forEach(function (e) { var b = h('button', 'chip', e || '∅', { type: 'button', 'aria-label': e ? 'Emoji ' + e : 'Sin emoji', 'aria-pressed': String(P.e === e) }); b.onclick = function () { P.e = e; guardarPerfil(); pintar(); }; ems.appendChild(b); });
    t1.appendChild(cols); t1.appendChild(ems);
    function guardarPerfil() { Al.escribir('perfil', { nombre: P.nombre, c: P.c, p: P.p, e: P.e }); if (G.Red && G.Red.perfil) G.Red.perfil.guardar({ nombre: P.nombre || 'Jugador', color: P.c }); }
    function pintar() {
      C.Skins.dibujar(prev.getContext('2d'), C.Skins.texto({ c: P.c, p: P.p, e: P.e }), 96);
      [].forEach.call(pats.children, function (b, i) { b.setAttribute('aria-pressed', String(P.p === i)); });
      [].forEach.call(cols.children, function (b, i) { b.setAttribute('aria-pressed', String(P.c === C.COLORES_SKIN[i])); });
      [].forEach.call(ems.children, function (b, i) { b.setAttribute('aria-pressed', String(P.e === C.EMOJIS[i])); });
    }
    t2.appendChild(h('h3', '', 'MODO DE JUEGO'));
    var modos = [];
    Object.keys(C.MODOS).forEach(function (k) {
      var md = C.MODOS[k], b = h('button', 'modo', null, { type: 'button', 'aria-pressed': String(gen.modo === k) });
      b.appendChild(h('b', '', md.nombre)); b.appendChild(h('small', '', md.desc));
      b.onclick = function () { gen.modo = k; C.Aj.guardar(); modos.forEach(function (x, i) { x.setAttribute('aria-pressed', String(Object.keys(C.MODOS)[i] === k)); }); };
      modos.push(b); t2.appendChild(b);
    });
    t2.appendChild(h('h3', '', 'DIFICULTAD DE LOS BOTS')); var dif = h('div', 'chips'); dif.style.marginTop = 0;
    Object.keys(C.DIF).forEach(function (k) { var b = h('button', 'chip', C.DIF[k].nombre, { type: 'button', 'aria-pressed': String(gen.dif === k) }); b.onclick = function () { gen.dif = k; C.Aj.guardar(); [].forEach.call(dif.children, function (x, i) { x.setAttribute('aria-pressed', String(Object.keys(C.DIF)[i] === k)); }); }; dif.appendChild(b); });
    t2.appendChild(dif);
    t2.appendChild(h('h3', '', 'JUGADORES EN EL MAPA (CON BOTS)')); t2.lastChild.style.marginTop = '12px'; var nb = h('div', 'chips'); nb.style.marginTop = 0;
    [10, 20, 30].forEach(function (n) { var b = h('button', 'chip', String(n), { type: 'button', 'aria-pressed': String(gen.bots === n) }); b.onclick = function () { gen.bots = n; C.Aj.guardar(); [].forEach.call(nb.children, function (x, i) { x.setAttribute('aria-pressed', String([10, 20, 30][i] === n)); }); }; nb.appendChild(b); });
    t2.appendChild(nb);
    grid.appendChild(t1); grid.appendChild(t2); m.appendChild(grid);
    var bt = h('div', 'm-botones'), hayP = !!Al.leer('partida', null), hayS = !!Al.leer('sala', null);
    function btn(txt, fn, cls) { var b = h('button', 'btn ' + (cls || ''), txt, { type: 'button' }); b.onclick = function () { C.Audio.iniciar(); C.Audio.sfx('clic'); fn(); }; bt.appendChild(b); return b; }
    if (hayP) btn('CONTINUAR PARTIDA', acc.continuar, 'principal');
    btn('JUGAR', acc.jugar, hayP ? '' : 'principal');
    btn('MULTIJUGADOR', acc.multi);
    if (hayS) btn('RESTAURAR SALA', acc.restaurarSala);
    btn('LOGROS Y ESTADÍSTICAS', acc.logros); if (C.Cu.activa()) btn('RANKING', acc.ranking); btn('AJUSTES', acc.ajustes); btn('AYUDA', acc.ayuda);
    m.appendChild(bt);
    var r = prog.records;
    m.appendChild(h('div', 'aviso-pequeno', 'Récord de masa · Todos: ' + Math.round(r.ffa) + ' · Equipos: ' + Math.round(r.equipos) + ' · Superv.: ' + Math.round(r.superv) + ' · Batalla: ' + Math.round(r.batalla)));
    pintar();
  };

  /* ---------- HUD ---------- */
  var lbEls = [], hudIni = false;
  function setTxt(id, v) { if (U.cache[id] !== v) { U.cache[id] = v; $(id).textContent = v; } }
  U.formatoTiempo = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  U.hud = function (v, yo, d) {
    var ol = $('lbLista');
    if (!hudIni) { for (var i = 0; i < 10; i++) { var li = h('li'); li.appendChild(h('span')); li.appendChild(h('i')); ol.appendChild(li); lbEls.push(li); } hudIni = true; }
    var lb = v.lb, n = 0, estaYo = false, i2;
    for (i2 = 0; i2 < 10; i2++) {
      var li2 = lbEls[i2], j = i2 < lb.length ? v.jugs[lb[i2]] : null;
      if (!j) { li2.style.display = 'none'; continue; }
      li2.style.display = ''; var nm = (v.modo === 'equipos' ? '● ' : '') + j.nombre;
      if (li2.firstChild.textContent !== nm) li2.firstChild.textContent = nm;
      li2.lastChild.textContent = Math.round(j.masa); li2.className = j.id === yo.id ? 'yo' : '';
      if (v.modo === 'equipos' && j.equipo >= 0) li2.firstChild.style.color = C.EQUIPOS[j.equipo].color; else li2.firstChild.style.color = '';
      if (j.id === yo.id) estaYo = true;
    }
    var eq = $('eqBarra');
    if (v.modo === 'equipos') {
      eq.classList.remove('oculto'); var a = v.eqMasa[0], b = v.eqMasa[1], tot = a + b || 1;
      if (!eq.firstChild) { eq.appendChild(h('div')); eq.appendChild(h('div')); eq.children[0].style.background = C.EQUIPOS[0].color; eq.children[1].style.background = C.EQUIPOS[1].color; }
      eq.children[0].style.width = (a / tot * 100).toFixed(0) + '%'; eq.children[1].style.width = (b / tot * 100).toFixed(0) + '%';
    } else eq.classList.add('oculto');
    setTxt('hMasa', String(Math.round(d.masa))); setTxt('hPuesto', d.puesto > 0 ? '#' + d.puesto : '-'); setTxt('hTiempo', U.formatoTiempo(d.tiempo)); setTxt('hBajas', String(d.bajas));
    setTxt('hudModo', d.modoTxt);
  };
  U.fps = function (txt) { var e = $('fps'); if (txt == null) e.classList.add('oculto'); else { e.classList.remove('oculto'); e.textContent = txt; } };

  /* ---------- pantallas de fin de vida / partida ---------- */
  U.panelFin = function (o) {
    var e = $('muerte'); e.textContent = ''; var caja = h('div', 'caja');
    caja.appendChild(h('h2', '', o.titulo)); if (o.sub) caja.appendChild(h('p', 'suave', o.sub));
    var g = h('div', 'stats-grid');
    o.datos.forEach(function (d) { var s = h('div', 'stat'); s.appendChild(h('small', '', d[0])); s.appendChild(h('b', '', d[1])); g.appendChild(s); });
    caja.appendChild(g);
    if (o.modo && C.Cu.activa()) { var pos = h('p', 'suave fin-pos', ''); caja.appendChild(pos); C.Cu.lineaPosicion(o.modo, pos); }
    var bs = h('div', 'btns');
    o.botones.forEach(function (b) { var x = h('button', 'btn ' + (b.cls || ''), b.txt, { type: 'button' }); if (b.atras) x.setAttribute('data-atras', 1); x.onclick = b.fn; bs.appendChild(x); });
    caja.appendChild(bs); e.appendChild(caja); U.mostrar('muerte', true);
  };
  U.panel = function (id, titulo, lineas, botones) {
    var e = $(id); e.textContent = ''; var caja = h('div', 'caja'); caja.appendChild(h('h2', '', titulo));
    (lineas || []).forEach(function (l) { caja.appendChild(h('p', 'suave', l)); });
    var bs = h('div', 'btns');
    botones.forEach(function (b) { var x = h('button', 'btn ' + (b.cls || ''), b.txt, { type: 'button' }); if (b.atras) x.setAttribute('data-atras', 1); x.onclick = b.fn; bs.appendChild(x); });
    caja.appendChild(bs); e.appendChild(caja); U.mostrar(id, true);
  };

  U.logros = function (cerrar) {
    var e = $('logros'), prog = C.progreso(), s = prog.stats; e.textContent = ''; var caja = h('div', 'caja'); caja.style.width = 'min(640px,100%)';
    var cab = h('div', 'aj-cab'); cab.appendChild(h('h2', '', 'Logros')); var x = h('button', 'btn', 'Volver', { type: 'button', 'data-atras': 1 }); x.onclick = cerrar; cab.appendChild(x); caja.appendChild(cab);
    var g = h('div', 'stats-grid');
    [['Partidas', s.partidas], ['Victorias', s.victorias], ['Bajas', s.kills], ['Muertes', s.muertes], ['Comida', s.comida], ['Masa máxima', Math.round(s.maxMasa)], ['Tiempo jugado', Math.round(s.tiempo / 60) + ' min'], ['Divisiones', s.divisiones], ['Virus', s.virus]]
      .forEach(function (d) { var st = h('div', 'stat'); st.appendChild(h('small', '', d[0])); st.appendChild(h('b', '', String(d[1]))); g.appendChild(st); });
    caja.appendChild(g);
    var n = 0; C.Logros.lista.forEach(function (l) {
      var ok = !!prog.logros[l.id]; if (ok) n++;
      var f = h('div', 'logro' + (ok ? ' ok' : '')); f.appendChild(h('span', 'ico', ok ? '🏆' : '🔒'));
      var t = h('div'); t.appendChild(h('b', '', l.nombre)); t.appendChild(h('small', '', l.desc)); f.appendChild(t); caja.appendChild(f);
    });
    caja.insertBefore(h('p', 'suave', n + ' de ' + C.Logros.lista.length + ' logros'), g);
    e.appendChild(caja); U.mostrar('logros');
  };
  U.ayuda = function (tactil, cerrar) {
    var e = $('ayuda'); e.textContent = ''; var caja = h('div', 'caja'), t = h('div', 'ayuda-t');
    caja.appendChild(h('h2', '', 'Cómo se juega'));
    t.innerHTML = '<p><b>Objetivo:</b> crece comiendo puntos de colores y células más pequeñas. Puedes comer a una célula si tienes al menos un <b>25% más de masa</b> y la cubres con tu centro. Si hay una mayor cerca, ¡huye!</p>' +
      '<p><b>Virus verdes:</b> revientan a las células grandes en pedazos; las pequeñas pueden esconderse detrás. Alimenta uno con masa expulsada (7 veces) para lanzar otro.</p>' +
      '<p><b>Velocidad:</b> cuanto más masa, más lento. Tu masa decae despacio, así que mantente activo. Tras dividirte, las partes se vuelven a fusionar con el tiempo.</p>' +
      (tactil ? '<p><b>Táctil:</b> arrastra en cualquier parte de la pantalla (joystick flotante). Botones <b>DIVIDIR</b> y <b>EXPULSAR</b> (mantén para repetir).</p>'
        : '<p><b>Ratón y teclado:</b> la célula sigue el cursor · <kbd>Espacio</kbd> divide · <kbd>W</kbd> expulsa masa · <kbd>Q</kbd> pausa el movimiento · <kbd>+</kbd>/<kbd>-</kbd> o rueda: zoom · <kbd>F</kbd> pantalla completa · <kbd>Esc</kbd> pausa.</p>') +
      '<p><b>Mando Xbox:</b> stick izquierdo mueve · <kbd>A</kbd> divide · <kbd>X</kbd> o <kbd>RT</kbd> expulsa · <kbd>Y</kbd> pausa el movimiento · <kbd>LB</kbd>/<kbd>RB</kbd> o cruceta arriba/abajo: zoom · <kbd>MENU</kbd> pausa. En los menús: cruceta/stick, <kbd>A</kbd> acepta, <kbd>B</kbd> vuelve.</p>' +
      '<p><b>Modos:</b> Todos contra todos (sin fin) · Equipos (Rojo vs Azul, los aliados no se comen) · Supervivencia (una vida) · Batalla de masa (una zona que se encoge te quema).</p>' +
      '<p><b>Multijugador:</b> hasta 4 personas por enlace de invitación, más bots. El anfitrión simula la partida: si se cae, la sala termina.</p>';
    caja.appendChild(t); var bs = h('div', 'btns'), x = h('button', 'btn principal', 'Entendido', { type: 'button', 'data-atras': 1 }); x.onclick = cerrar; bs.appendChild(x); caja.appendChild(bs);
    e.appendChild(caja); U.mostrar('ayuda', true);
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
