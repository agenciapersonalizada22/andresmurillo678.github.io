/* Paneles informativos: estadisticas, records, logros y ayuda. */
(function (G) {
  'use strict';
  var BM = G.BM, UI = BM.ui, h = UI.h;
  var NOM_DIF = { principiante: 'Principiante', intermedio: 'Intermedio', experto: 'Experto', personalizado: 'Personalizado' };
  var NOM_MODO = { clasico: 'Clásico', sinadivinar: 'Sin adivinar', contrarreloj: 'Contrarreloj' };

  function tabla(cab, filas) {
    var t = h('table', { cls: 'tabla' }), tr = h('tr');
    cab.forEach(function (c) { tr.appendChild(h('th', { txt: c })); }); t.appendChild(h('thead', {}, [tr]));
    var tb = h('tbody'); filas.forEach(function (f) { var r = h('tr'); f.forEach(function (c) { r.appendChild(h('td', { txt: String(c) })); }); tb.appendChild(r); });
    t.appendChild(tb); return h('div', { cls: 'tabla-caja' }, [t]);
  }

  UI.abrirEstadisticas = function () {
    var d = BM.progreso.d, filas = [];
    function fila(k, nombre, pts) {
      var c = d.cat[k]; if (!c && !/^(clasico|sinadivinar):(principiante|intermedio|experto)$/.test(k)) return;
      c = c || { jugadas: 0, ganadas: 0, mejor: null, racha: 0, mejorRacha: 0, mejorPts: 0 };
      filas.push([nombre, c.jugadas, c.jugadas ? Math.round(100 * c.ganadas / c.jugadas) + '%' : '–', pts ? (c.mejorPts || '–') : (c.mejor != null ? UI.fmtTiempo(c.mejor, true) : '–'), c.racha, c.mejorRacha]);
    }
    ['principiante', 'intermedio', 'experto'].forEach(function (x) { fila('clasico:' + x, 'Clásico · ' + NOM_DIF[x]); });
    ['principiante', 'intermedio', 'experto', 'personalizado'].forEach(function (x) { if (x === 'personalizado') fila('clasico:personalizado', 'Clásico · Personalizado'); fila('sinadivinar:' + x, 'Sin adivinar · ' + NOM_DIF[x]); });
    Object.keys(d.cat).forEach(function (k) {
      var p = k.split(':');
      if (p[0] === 'contrarreloj') fila(k, 'Contrarreloj · ' + NOM_DIF[p[1]], true);
    });
    fila('diario', 'Reto diario'); fila('supervivencia', 'Supervivencia', true);
    var tot = d.c, cuerpo = h('div', {}, [
      h('div', { cls: 'resumen' }, [h('div', {}, [h('b', { txt: tot.jugadas }), h('small', { txt: 'partidas' })]), h('div', {}, [h('b', { txt: tot.victorias }), h('small', { txt: 'victorias' })]),
        h('div', {}, [h('b', { txt: Math.round(tot.ms / 60000) + ' min' }), h('small', { txt: 'jugados' })]), h('div', {}, [h('b', { txt: tot.acordes }), h('small', { txt: 'acordes' })])]),
      tabla(['Modo', 'Jugadas', 'Victorias', 'Mejor', 'Racha', 'Máx.'], filas),
      h('p', { cls: 'nota', txt: 'Los mejores tiempos solo cuentan partidas sin pistas ni ayudas visuales y fuera del modo Práctica.' })]);
    UI.panel({ titulo: 'Estadísticas', cuerpo: cuerpo, ancho: 560 });
  };

  UI.abrirRecords = function (inicial) {
    var cats = BM.registro.modos;
    var cuerpo = UI.pestanas(cats.map(function (m) {
      return { id: m.id, nombre: m.nombre.replace(/ \(.*\)/, ''), pintar: function (c) {
        var l = BM.progreso.d.records[m.id] || [];
        if (!l.length) { c.appendChild(h('p', { cls: 'vacio', txt: 'Aún no hay récords. ¡Sé el primero!' })); return; }
        c.appendChild(tabla(['#', 'Nombre', m.mayorEsMejor ? 'Puntos' : 'Tiempo', 'Fecha'], l.map(function (r, i) { return [i + 1, r.nombre, m.mayorEsMejor ? r.v + (r.nivel ? ' (niv. ' + r.nivel + ')' : '') : UI.fmtTiempo(r.v, true), UI.fmtFecha(r.fecha)]; })));
      } };
    }), inicial || 'tiempo_principiante');
    UI.panel({ titulo: 'Récords', cuerpo: cuerpo, ancho: 560 });
  };

  UI.abrirLogros = function () {
    var d = BM.progreso.d, n = Object.keys(d.logros).length, lista = h('div', { cls: 'logros' });
    BM.logros.LISTA.forEach(function (l) {
      var ok = d.logros[l.id];
      lista.appendChild(h('div', { cls: 'logro' + (ok ? ' ok' : '') }, [h('span', { cls: 'ico', txt: ok ? '★' : '☆' }), h('div', {}, [h('b', { txt: l.nombre }), h('small', { txt: l.desc + (ok ? ' · ' + UI.fmtFecha(ok) : '') })])]));
    });
    UI.panel({ titulo: 'Logros ' + n + '/' + BM.logros.LISTA.length, cuerpo: lista, ancho: 520 });
  };

  UI.abrirAyuda = function () {
    var tact = document.body.classList.contains('tactil');
    var sec = function (t, items) { return h('section', { cls: 'ayuda-sec' }, [h('h3', { txt: t }), h('ul', {}, items.map(function (i) { return h('li', { html: i }); }))]); };
    var K = BM.ajustes.disp.teclas, N = BM.entrada.nombreTecla;
    var cuerpo = h('div', {}, [
      sec('Objetivo', ['Abre todas las casillas sin mina. Cada número indica cuántas minas hay en las 8 casillas vecinas.', 'El primer clic siempre es seguro y abre una zona.']),
      sec(tact ? 'Controles táctiles (tu dispositivo)' : 'Controles táctiles', ['<b>Tocar</b> una casilla la abre. Tocar un número con las banderas justas abre sus vecinas (acorde).', '<b>Mantener pulsado</b> pone o quita bandera. El botón <b>🚩</b> cambia el modo: tocar = bandera.', '<b>Arrastrar</b> mueve el tablero; <b>pellizcar</b> hace zoom.']),
      sec(!tact ? 'Ratón y teclado (tu dispositivo)' : 'Ratón y teclado', ['<b>Clic izquierdo</b> abre (o acorde en un número). <b>Clic derecho</b> bandera. <b>Clic central</b> o <b>ambos botones</b>: acorde.', 'Rueda: zoom. Arrastra con el botón izquierdo para mover tableros grandes.',
        'Flechas mueven el cursor, <b>' + N(K.abrir) + '</b>/<b>Enter</b> abre, <b>' + N(K.bandera) + '</b> bandera, <b>' + N(K.acorde) + '</b> acorde, <b>' + N(K.pista) + '</b> pista, <b>' + N(K.deshacer) + '</b> deshacer (Práctica), <b>' + N(K.pausa) + '</b> pausa.']),
      sec('Mando Xbox', ['Cruceta o stick izquierdo: mover cursor. <b>A</b> abrir, <b>X</b> bandera, <b>Y</b> acorde, <b>B</b> deshacer (Práctica).', '<b>LB/RB</b> o gatillos: zoom. Stick derecho: desplazar. <b>VISTA</b> pista, <b>MENU</b> pausa.']),
      sec('Modos', BM.config.MODOS.map(function (m) { return '<b>' + m.nombre + '.</b> ' + m.desc; })),
      sec('Multijugador', ['<b>Carrera:</b> mismo tablero para todos, gana quien lo resuelve primero (si explotas, quedas fuera).', '<b>Cooperativo:</b> un tablero compartido con vidas compartidas.', '<b>Duelo:</b> por turnos; abrir casillas suma puntos y reventar resta.']),
      sec('Pistas', ['Una pista señala una casilla segura o una mina deducible. Cuesta ' + (BM.config.PENAL_PISTA / 1000) + ' s de penalización y deja la partida fuera de récords.'])
    ]);
    UI.panel({ titulo: 'Ayuda', cuerpo: cuerpo, ancho: 560 });
  };

  UI.tutorial = function (alFin) {
    var tact = document.body.classList.contains('tactil'), paso = 0;
    var pasos = [
      ['Bienvenido', 'Abre todas las casillas que no tengan mina. Los números te dicen cuántas minas rodean esa casilla.'],
      [tact ? 'Toca y mantén' : 'Abrir y marcar', tact ? 'Toca para abrir. Mantén pulsado para poner una bandera donde creas que hay una mina. Pellizca para hacer zoom.' : 'Clic izquierdo abre; clic derecho pone bandera. Con el mando: A abre y X pone bandera.'],
      ['Acordes', 'Cuando un número ya tiene tantas banderas como indica, tócalo (o clic central) para abrir de golpe todas sus vecinas.'],
      ['Sin azar', 'Prueba el modo «Sin adivinar»: todos los tableros se pueden resolver con lógica pura. ¡Suerte!']];
    var tit = h('h3'), txt = h('p'), p;
    function pinta() { tit.textContent = pasos[paso][0]; txt.textContent = pasos[paso][1]; sig.textContent = paso === pasos.length - 1 ? 'Empezar' : 'Siguiente'; }
    var sig = UI.btn('Siguiente', function () { if (paso < pasos.length - 1) { paso++; pinta(); } else { p.cerrar(); } }, 'prim', { 'data-foco': 1 });
    p = UI.panel({ titulo: 'Cómo se juega', cuerpo: h('div', { cls: 'tuto' }, [tit, txt]), ancho: 400, pie: [sig], alCerrar: function () { BM.ajustes.poner('gen', 'tutorialVisto', true); if (alFin) alFin(); } });
    pinta();
  };
})(window);
