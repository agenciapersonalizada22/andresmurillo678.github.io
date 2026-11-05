/* Pantalla de inicio, HUD, resultado, pausa y controles tactiles. */
(function (G) {
  'use strict';
  var BM = G.BM, UI = BM.ui, h = UI.h, P = BM.partida, C = BM.config, A = BM.ajustes, doc = G.document;
  var $ = function (id) { return doc.getElementById(id); };
  var sel = null, ultHud = '', cfgUlt = null, resTmr = 0;

  /* ---------- inicio ---------- */
  UI.mostrarInicio = function () {
    if (BM.multi.J && !BM.multi.J.fin && P.cfg && P.cfg.mp) { UI.pausar(); return; }
    var ini = $('inicio'); ini.hidden = false; doc.body.classList.add('en-inicio');
    P.pausar(true); P.guardarYa(); pintarInicio();
    if (G.Mando && G.Mando.activo) UI.enfocar(ini);
  };
  UI.ocultarInicio = function () { $('inicio').hidden = true; doc.body.classList.remove('en-inicio'); BM.vista.marcar(); };

  function pintarInicio() {
    var ini = $('inicio'); ini.textContent = '';
    sel = JSON.parse(JSON.stringify(A.gen.ultima));
    if (!C.MODOS.some(function (m) { return m.id === sel.modo; })) sel.modo = 'clasico';
    var guard = P.hayGuardada(), caja = h('div', { cls: 'inicio-caja' });
    caja.appendChild(h('h1', { cls: 'logo', html: 'BUSCA<span>MINAS</span>' }));
    caja.appendChild(h('p', { cls: 'lema', txt: 'Lógica, nervios fríos y cero azar (si quieres).' }));
    if (guard) {
      var nm = (C.MODOS.filter(function (m) { return m.id === guard.cfg.modo; })[0] || {}).nombre, dn = guard.cfg.dif === 'personalizado' ? guard.cfg.w + '×' + guard.cfg.h : (C.DIF[guard.cfg.dif] || {}).nombre;
      caja.appendChild(UI.btn('Continuar · ' + nm + ' · ' + dn + ' · ' + UI.fmtTiempo(guard.tiempoMs), function () { UI.ocultarInicio(); P.restaurar(guard); P.pausar(false); if (G.Mando) G.Mando.activo = G.Mando.activo; }, 'prim grande', { 'data-foco': 1 }));
    }
    var hoy = BM.azar.fechaClave(), hecho = BM.progreso.d.c.dias.indexOf(hoy) >= 0;
    var modos = h('div', { cls: 'chips' }), difs = h('div', { cls: 'chips' }), desc = h('p', { cls: 'desc' });
    var bloqueDif = h('div', { cls: 'bloque' }), pers = h('div', { cls: 'pers' }), info = h('p', { cls: 'nota' });
    var chM = {}, chD = {};
    C.MODOS.forEach(function (m) {
      chM[m.id] = h('button', { type: 'button', cls: 'chip', txt: m.nombre + (m.id === 'diario' && hecho ? ' ✓' : ''), 'aria-pressed': 'false', on: { click: function () { BM.sonido.click(); sel.modo = m.id; act(); } } });
      modos.appendChild(chM[m.id]);
    });
    ['principiante', 'intermedio', 'experto', 'personalizado'].forEach(function (k) {
      var d = C.DIF[k];
      chD[k] = h('button', { type: 'button', cls: 'chip', 'aria-pressed': 'false', on: { click: function () { BM.sonido.click(); sel.dif = k; act(); } } }, [d.nombre, k === 'personalizado' ? null : h('small', { txt: d.w + '×' + d.h + ' · ' + d.m })]);
      difs.appendChild(chD[k]);
    });
    var sw = h('input', { type: 'range', min: 5, max: 60, step: 1 }), sh = h('input', { type: 'range', min: 5, max: 40, step: 1 }), sm = h('input', { type: 'range', min: 1, max: 99, step: 1 });
    var ow = h('output'), oh = h('output'), om = h('output');
    function sa() { return sel.modo === 'sinadivinar'; }
    function lee() { var t = C.limitar(+sw.value, +sh.value, +sm.value, sa()); sel.w = t.w; sel.h = t.h; sel.m = t.m; sm.max = C.minasMax(t.w, t.h, sa()); sm.value = t.m; ow.textContent = t.w; oh.textContent = t.h; om.textContent = t.m + ' (' + Math.round(100 * t.m / (t.w * t.h)) + '%)'; }
    [sw, sh, sm].forEach(function (s) { s.addEventListener('input', lee); });
    pers.appendChild(h('label', { cls: 'fila' }, [h('span', { cls: 'etq', txt: 'Ancho' }), h('span', { cls: 'ctl-rango' }, [sw, ow])]));
    pers.appendChild(h('label', { cls: 'fila' }, [h('span', { cls: 'etq', txt: 'Alto' }), h('span', { cls: 'ctl-rango' }, [sh, oh])]));
    pers.appendChild(h('label', { cls: 'fila' }, [h('span', { cls: 'etq', txt: 'Minas' }), h('span', { cls: 'ctl-rango' }, [sm, om])]));
    function act() {
      var sinDif = sel.modo === 'diario' || sel.modo === 'supervivencia';
      Object.keys(chM).forEach(function (k) { chM[k].setAttribute('aria-pressed', String(k === sel.modo)); });
      Object.keys(chD).forEach(function (k) { chD[k].setAttribute('aria-pressed', String(k === sel.dif)); });
      desc.textContent = C.MODOS.filter(function (m) { return m.id === sel.modo; })[0].desc;
      bloqueDif.hidden = sinDif; pers.hidden = sel.dif !== 'personalizado' || sinDif;
      sw.value = sel.w; sh.value = sel.h; sm.value = sel.m; lee();
      if (sel.modo === 'contrarreloj') { var d = C.DIF[sel.dif], w = sel.dif === 'personalizado' ? sel.w : d.w, hh = sel.dif === 'personalizado' ? sel.h : d.h; info.textContent = 'Límite de tiempo: ' + UI.fmtTiempo(C.limiteTiempo(w, hh) * 1000); }
      else if (sel.modo === 'diario') info.textContent = hecho ? 'Hoy ya lo completaste. Puedes repetirlo para mejorar tu tiempo.' : 'Tablero de hoy: ' + hoy + ' · Intermedio 16×16 · 40 minas.';
      else if (sel.modo === 'supervivencia') info.textContent = 'Empiezas con ' + C.VIDAS_SUPERV + ' vidas en 8×8. Cada nivel crece el tablero.';
      else if (sel.modo === 'practica') info.textContent = 'Deshacer disponible (U / B del mando). Sin récords.';
      else info.textContent = '';
    }
    caja.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Modo' }), modos, desc]));
    bloqueDif.appendChild(h('h3', { txt: 'Dificultad' })); bloqueDif.appendChild(difs); bloqueDif.appendChild(pers);
    caja.appendChild(bloqueDif); caja.appendChild(info);
    caja.appendChild(UI.btn('Jugar', function () { A.poner('gen', 'ultima', JSON.parse(JSON.stringify(sel))); UI.jugar({ modo: sel.modo, dif: sel.dif, w: sel.w, h: sel.h, m: sel.m }); }, 'prim grande', guard ? {} : { 'data-foco': 1 }));
    caja.appendChild(h('div', { cls: 'rejilla' }, [
      UI.btn('👥 Multijugador', function () { BM.multi.abrirMenu(); }, 'sec'), UI.btn('📊 Estadísticas', UI.abrirEstadisticas, 'sec'), UI.btn('🏆 Récords', function () { UI.abrirRecords(); }, 'sec'),
      UI.btn('★ Logros', UI.abrirLogros, 'sec'), UI.btn('⚙ Ajustes', function () { UI.abrirAjustes(); }, 'sec'), UI.btn('? Ayuda', UI.abrirAyuda, 'sec'),
      UI.btn('⛶ Pantalla completa', UI.pantallaCompleta, 'sec'), UI.btn(BM.sonido.activo ? '🔊 Sonido' : '🔇 Sonido', function (e) { var on = BM.sonido.alternar(); e.currentTarget.textContent = on ? '🔊 Sonido' : '🔇 Sonido'; }, 'sec')
    ]));
    caja.appendChild(h('a', { cls: 'volver-menu', href: '../', txt: '← Volver al menú de juegos' }));
    ini.appendChild(caja); act();
  }

  UI.pantallaCompleta = function () {
    var el = doc.documentElement;
    if (!doc.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen || function () { return Promise.reject(); }).call(el).catch(function () { UI.toast('Pantalla completa no disponible'); }); }
    else doc.exitFullscreen && doc.exitFullscreen();
  };

  UI.jugar = function (cfg) {
    var go = function () {
      UI.ocultarInicio(); cfgUlt = JSON.parse(JSON.stringify(cfg));
      BM.sonido.despertar(); P.nueva(cfg); P.pausar(false);
      if (G.Mando && G.Mando.activo) BM.vista.cursorVisible = true;
    };
    if (!A.gen.tutorialVisto && !cfg.mp) UI.tutorial(go); else go();
  };
  UI.repetir = function () { if (cfgUlt) UI.jugar(cfgUlt); else UI.mostrarInicio(); };

  /* ---------- HUD ---------- */
  function led(n) { n = Math.max(-99, Math.min(999, Math.round(n))); var s = String(Math.abs(n)); while (s.length < 3) s = '0' + s; return (n < 0 ? '-' + s.slice(1) : s); }
  UI.actualizarHud = function () {
    var T = P.T; if (!T) return;
    var c = P.cfg, minas = BM.motor.restantes(T), ms = c.modo === 'contrarreloj' ? Math.ceil(P.restanteMs() / 1000) * 1000 : P.tiempoMs, s = Math.floor(ms / 1000);
    var tx = s > 999 ? Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) : led(s);
    var cara = P.estado === 'ganada' ? '😎' : P.estado === 'perdida' || P.estado === 'tiempo' ? '😵' : '🙂';
    var chips = [];
    var nm = (C.MODOS.filter(function (m) { return m.id === c.modo; })[0] || { nombre: c.modo }).nombre;
    if (c.mp) nm = { carrera: 'Carrera', coop: 'Cooperativo', duelo: 'Duelo' }[c.mp.modo];
    chips.push(nm);
    if (c.modo === 'supervivencia') chips.push('Nivel ' + P.nivel, P.puntos + ' pts');
    if (P.vidas > 0) chips.push(new Array(P.vidas + 1).join('♥'));
    if (P.pistas && !c.mp) chips.push('💡' + P.pistas);
    if (c.dif === 'personalizado' || c.modo === 'supervivencia') chips.push(T.w + '×' + T.h);
    var k = [minas, tx, cara, chips.join('|'), P.cfg.modo].join('~');
    if (k === ultHud) return; ultHud = k;
    $('hudMinas').textContent = led(minas); $('hudTiempo').textContent = tx; $('btnCara').textContent = cara;
    $('hudTiempo').classList.toggle('urgente', c.modo === 'contrarreloj' && P.restanteMs() < 10000 && P.estado === 'jugando');
    var hi = $('hudInfo'); hi.textContent = ''; chips.forEach(function (x) { hi.appendChild(h('span', { cls: 'chip-info', txt: x })); });
    $('btnDeshacer').hidden = c.modo !== 'practica';
    $('hudTiempoEtq').textContent = c.modo === 'contrarreloj' ? 'RESTA' : 'TIEMPO';
  };

  var timerFrame = 0;
  UI.refrescarReloj = function () { var t = P.corre && !P.pausada ? Math.floor(P.tiempoMs / 250) : -1; if (t !== timerFrame) { timerFrame = t; UI.actualizarHud(); } };

  /* ---------- resultado ---------- */
  function mostrarResultado(res, info) {
    clearTimeout(resTmr);
    if (P.cfg.mp) { BM.multi.alFinPartida(res); return; }
    var vic = res.victoria, c = P.cfg;
    resTmr = setTimeout(function () {
      if (P.estado !== 'ganada' && P.estado !== 'perdida' && P.estado !== 'tiempo') return;
      var tit = vic ? '¡Victoria!' : P.estado === 'tiempo' ? '¡Se acabó el tiempo!' : '¡BOOM!';
      var filas = [];
      if (c.modo === 'supervivencia') { filas.push(['Nivel alcanzado', res.nivel]); filas.push(['Puntos', res.puntos]); }
      else {
        filas.push(['Tiempo', UI.fmtTiempo(res.tiempoMs, true)]);
        if (c.modo === 'contrarreloj' && vic) filas.push(['Puntos', res.puntos]);
        if (!vic) filas.push(['Progreso', Math.round(BM.motor.progreso(P.T) * 100) + '%']);
        if (res.pistas) filas.push(['Pistas', res.pistas + ' (+' + (res.pistas * C.PENAL_PISTA / 1000) + ' s)']);
      }
      var cat = BM.progreso.d.cat[C.clave(c.modo, c.dif)];
      if (cat && cat.mejor != null && c.modo !== 'supervivencia' && c.modo !== 'contrarreloj') filas.push(['Mejor tiempo', UI.fmtTiempo(cat.mejor, true)]);
      var cuerpo = h('div', { cls: 'resultado ' + (vic ? 'gana' : 'pierde') }, [h('div', { cls: 'res-icono', txt: vic ? '🏆' : '💥' })]);
      var tb = h('table', { cls: 'tabla mini' }); filas.forEach(function (f) { tb.appendChild(h('tr', {}, [h('th', { txt: f[0] }), h('td', { txt: String(f[1]) })])); }); cuerpo.appendChild(tb);
      if (c.modo === 'practica') cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Modo Práctica: sin estadísticas ni récords.' }));
      else if ((res.pistas || res.peligro) && vic) cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Con pistas o ayudas visuales no se guardan récords.' }));
      if (info && info.puesto >= 0) {
        cuerpo.appendChild(h('p', { cls: 'nuevo-record', txt: '¡Nuevo récord! Puesto ' + (info.puesto + 1) }));
        var nom = h('input', { type: 'text', maxlength: 16, cls: 'campo', value: BM.progreso.nombre(), 'aria-label': 'Nombre para el récord', 'data-f': 1 });
        nom.addEventListener('change', function () { BM.progreso.renombrarUltimo(nom.value); UI.toast('Nombre guardado', 'ok'); });
        cuerpo.appendChild(h('label', { cls: 'fila' }, [h('span', { cls: 'etq', txt: 'Tu nombre' }), nom]));
      }
      if (info && info.nuevos.length) {
        var lg = h('div', { cls: 'logros-nuevos' }); info.nuevos.forEach(function (l) { lg.appendChild(h('div', { cls: 'logro ok' }, [h('span', { cls: 'ico', txt: '★' }), h('div', {}, [h('b', { txt: 'Logro: ' + l.nombre }), h('small', { txt: l.desc })])])); });
        cuerpo.appendChild(lg); BM.sonido.nivel();
      }
      var pie = [UI.btn('Jugar de nuevo', function () { p.cerrar(); UI.repetir(); }, 'prim', { 'data-foco': 1 })];
      if (P.puedeDeshacer()) pie.unshift(UI.btn('Deshacer', function () { p.cerrar(); P.deshacer(); }, 'sec'));
      pie.push(UI.btn('Menú', function () { p.cerrar(); UI.mostrarInicio(); }, 'sec'));
      if (info && info.clave) pie.push(UI.btn('Récords', function () { UI.abrirRecords(info.clave); }, 'sec'));
      var p = UI.panel({ titulo: tit, cuerpo: cuerpo, pie: pie, ancho: 420, noCerrar: false, alCerrar: function () {} });
    }, vic ? 1100 : 1700);
  }

  UI.banner = function (txt, ms) {
    var b = $('banner'); b.textContent = txt; b.classList.add('ver'); clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('ver'); }, ms || 1600);
  };

  /* ---------- pausa ---------- */
  UI.pausar = function () {
    if (UI.pila.some(function (p) { return p.opts.esPausa; })) return;
    var mp = !!P.cfg && !!P.cfg.mp, antes = P.pausada;
    if (!mp) P.pausar(true);
    var p = UI.panel({ titulo: mp ? 'Menú' : 'Pausa', esPausa: true, ancho: 380, cuerpo: h('div', { cls: 'menu-pausa' }, [
      UI.btn(mp ? 'Seguir jugando' : 'Reanudar', function () { p.cerrar(); }, 'prim', { 'data-foco': 1 }),
      mp ? null : UI.btn('Reiniciar', function () { p.cerrar(); P.nueva(JSON.parse(JSON.stringify(cfgUlt || P.cfg))); }, 'sec'),
      mp && G.Red && G.Red.esAnfitrion ? UI.btn('👥 Invitar / reconectar amigo', function () { p.cerrar(); BM.multi.abrirLobby(); }, 'sec') : null,
      UI.btn('⚙ Ajustes', function () { UI.abrirAjustes(); }, 'sec'), UI.btn('? Ayuda', UI.abrirAyuda, 'sec'),
      UI.btn('⛶ Pantalla completa', UI.pantallaCompleta, 'sec'),
      UI.btn(BM.sonido.activo ? '🔊 Sonido' : '🔇 Sonido', function (e) { var on = BM.sonido.alternar(); e.currentTarget.textContent = on ? '🔊 Sonido' : '🔇 Sonido'; }, 'sec'),
      UI.btn(mp ? 'Salir de la sala' : 'Menú principal', function () { p.cerrar(); if (mp) BM.multi.salir(); UI.mostrarInicio(); }, 'sec')]),
      alMenu: function () { p.cerrar(); }, alCerrar: function () { if (!mp && !antes && $('inicio').hidden) P.pausar(false); } });
  };

  /* ---------- tactil ---------- */
  UI.aplicarTactil = function () {
    var d = A.disp, t = $('tactil'), tam = { s: 40, m: 50, l: 62 }[d.tactilTam] || 50;
    t.style.setProperty('--tt', tam + 'px'); t.style.opacity = d.tactilOpac;
    var pos = d.tactilPos; if (d.zurdo) pos = pos === 'derecha' ? 'izquierda' : pos === 'izquierda' ? 'derecha' : pos;
    t.className = 'pos-' + pos;
  };
  UI.bindTactil = function () {
    var E = BM.entrada;
    function modo() { $('tbBandera').setAttribute('aria-pressed', String(E.modoBandera)); $('tbBandera').textContent = E.modoBandera ? '🚩' : '⛏'; $('tbBandera').title = E.modoBandera ? 'Modo bandera: tocar pone bandera' : 'Modo abrir: tocar abre'; }
    $('tbBandera').addEventListener('click', function () { E.modoBandera = !E.modoBandera; modo(); BM.sonido.click(); if (navigator.vibrate && A.disp.vibracionMovil) navigator.vibrate(10); });
    $('tbMas').addEventListener('click', function () { BM.vista.zoom(1.3); }); $('tbMenos').addEventListener('click', function () { BM.vista.zoom(0.77); });
    $('tbAjustar').addEventListener('click', function () { BM.vista.ajustar(); }); $('tbPista').addEventListener('click', function () { P.pista(); });
    modo(); UI.aplicarTactil();
  };

  UI.enlazar = function () {
    P.cb.cambio = UI.actualizarHud;
    P.cb.nueva = function () { ultHud = ''; UI.actualizarHud(); BM.vista.marcar(); };
    P.cb.fin = mostrarResultado;
    P.cb.aviso = function (t) { UI.toast(t); };
    P.cb.pista = function (p) {
      UI.toast(p.tipo === 'segura' ? 'Casilla segura resaltada' + (P.cfg.modo === 'practica' ? '' : ' (+' + C.PENAL_PISTA / 1000 + ' s)') : p.tipo === 'mina' ? 'Hay una mina aquí (puedes marcarla)' : 'Sin jugadas seguras. Menor riesgo: ' + Math.round(p.riesgo * 100) + '%', p.tipo === 'riesgo' ? 'aviso' : 'ok');
    };
    P.cb.nivel = function (n, bono) { UI.banner('Nivel ' + n + ' superado  +' + bono, 1600); };
    P.cb.pausa = function (on) { doc.body.classList.toggle('pausado', on && $('inicio').hidden); BM.vista.marcar(); };
    P.cb.reabrir = function () { UI.actualizarHud(); };
    $('btnPausa').addEventListener('click', UI.pausar); $('btnInicio').addEventListener('click', function () { UI.mostrarInicio(); });
    $('btnPista').addEventListener('click', function () { P.pista(); });
    $('btnDeshacer').addEventListener('click', function () { if (!P.deshacer()) UI.toast('Nada que deshacer'); });
    $('btnAjustes').addEventListener('click', function () { var antes = P.pausada; if (!(P.cfg && P.cfg.mp)) P.pausar(true); UI.abrirAjustes(function () { if (!antes && !(P.cfg && P.cfg.mp)) P.pausar(false); }); });
    $('btnCara').addEventListener('click', function () { if (P.cfg) UI.confirmar('¿Empezar una partida nueva?', function () { if (P.cfg.mp) return; P.nueva(JSON.parse(JSON.stringify(cfgUlt || P.cfg))); }, 'Reiniciar'); });
    BM.entrada.accionUI = function (a, t) {
      if (a === 'pausa') { if (!$('inicio').hidden) return; UI.pausar(); }
      else if (a === 'aviso') UI.toast(t);
      else if (a === 'reiniciar') { if (P.cfg && !P.cfg.mp && $('inicio').hidden) UI.confirmar('¿Empezar una partida nueva?', function () { P.nueva(JSON.parse(JSON.stringify(cfgUlt || P.cfg))); }, 'Reiniciar'); }
    };
    UI.bindTactil();
  };
  UI.fijarCfgUlt = function (c) { cfgUlt = c; };
})(window);
