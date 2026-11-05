/* Panel de ajustes con pestanas: Graficos, Audio, Controles, Accesibilidad, Datos. */
(function (G) {
  'use strict';
  var BM = G.BM, UI = BM.ui, h = UI.h, A = BM.ajustes;
  var ACCIONES = [['abrir', 'Abrir casilla'], ['bandera', 'Bandera / duda'], ['acorde', 'Acorde'], ['pista', 'Pista'], ['deshacer', 'Deshacer (Práctica)'], ['pausa', 'Pausa'], ['reiniciar', 'Reiniciar'], ['zoomMas', 'Acercar'], ['zoomMenos', 'Alejar']];

  function dispSw(etq, k, ayuda) { return UI.interruptor(etq, function () { return A.disp[k]; }, function (v) { A.poner('disp', k, v); }, ayuda); }
  function dispSl(etq, k, mn, mx, st, fmt, ayuda) { return UI.deslizador(etq, function () { return A.disp[k]; }, function (v) { A.poner('disp', k, v); }, mn, mx, st, fmt, ayuda); }
  function genSw(etq, k, ayuda) { return UI.interruptor(etq, function () { return A.gen[k]; }, function (v) { A.poner('gen', k, v); }, ayuda); }
  function genSl(etq, k, mn, mx, st, fmt) { return UI.deslizador(etq, function () { return A.gen[k]; }, function (v) { A.poner('gen', k, v); }, mn, mx, st, fmt); }
  var pct = function (v) { return Math.round(v * 100) + '%'; };

  function graficos(c) {
    var calidad = UI.selector('Calidad gráfica', [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra'], ['personalizada', 'Personalizada']], function () { return A.disp.calidad; }, function (v) { if (v !== 'personalizada') { A.preset(v); refrescar(); } else A.poner('disp', 'calidad', 'personalizada'); });
    var lista = [calidad,
      UI.selector('Tema', Object.keys(BM.temas.LISTA).map(function (k) { return [k, BM.temas.LISTA[k].nombre]; }), function () { return A.disp.tema; }, function (v) { A.poner('disp', 'tema', v); }),
      dispSl('Partículas', 'particulas', 0, 3, 1, function (v) { return ['Ninguna', 'Pocas', 'Normales', 'Muchas'][v]; }),
      dispSw('Animación de cascada', 'cascada'), dispSw('Brillos y sombras', 'brillo', 'Efectos de luz en el tema neón.'),
      dispSl('Resolución', 'resolucion', 0.5, 2, 0.25, function (v) { return Math.round(v * 100) + '%'; }, 'Menos resolución = más fluidez en móvil.'),
      UI.selector('Límite de FPS', [['30', '30'], ['60', '60'], ['sin', 'Sin límite']], function () { return A.disp.fps; }, function (v) { A.poner('disp', 'fps', v); }),
      dispSw('Mostrar FPS', 'mostrarFps'), dispSw('Bajar calidad automáticamente', 'autoBajar', 'Si el juego va lento, reduce la calidad.'),
      dispSw('Mantener pantalla encendida', 'pantallaActiva', 'Evita que el móvil se apague jugando.')];
    function refrescar() { lista.forEach(function (f) { if (f.refrescar) f.refrescar(); }); }
    A.alCambiar(function () { if (c.isConnected) refrescar(); });
    lista.forEach(function (f) { c.appendChild(f); });
  }
  function audio(c) {
    var ch = function (f) { return f; };
    [UI.deslizador('Volumen general', function () { return A.gen.volMaestro; }, function (v) { A.poner('gen', 'volMaestro', v); BM.sonido.volumenes(); }, 0, 1, 0.05, pct),
      UI.deslizador('Música', function () { return A.gen.volMusica; }, function (v) { A.poner('gen', 'volMusica', v); BM.sonido.volumenes(); BM.sonido.despertar(); BM.sonido.musica(v > 0); }, 0, 1, 0.05, pct, 'Ambiente generado en vivo.'),
      UI.deslizador('Efectos', function () { return A.gen.volEfectos; }, function (v) { A.poner('gen', 'volEfectos', v); BM.sonido.volumenes(); BM.sonido.despertar(); BM.sonido.abrir(3); }, 0, 1, 0.05, pct),
      genSw('Pausar al ocultar la pestaña', 'pausaOculta')].forEach(function (f) { c.appendChild(ch(f)); });
  }
  function teclas(c) {
    var caja = h('div', { cls: 'teclas' });
    function pintar() {
      caja.textContent = '';
      ACCIONES.forEach(function (a) {
        var b = h('button', { type: 'button', cls: 'btn sec tecla', txt: BM.entrada.nombreTecla(A.disp.teclas[a[0]]), on: { click: function () { capturar(a[0], b); } } });
        caja.appendChild(h('div', { cls: 'fila' }, [h('span', { cls: 'etq', txt: a[1] }), b]));
      });
    }
    function capturar(acc, b) {
      b.textContent = 'Pulsa una tecla…'; BM.entrada.capturando = true;
      function fin(e) {
        e.preventDefault(); e.stopPropagation(); G.removeEventListener('keydown', fin, true); setTimeout(function () { BM.entrada.capturando = false; }, 0);
        if (e.code !== 'Escape' && !/^(Arrow|Shift|Control|Alt|Meta|Enter)/.test(e.code)) {
          var t = JSON.parse(JSON.stringify(A.disp.teclas));
          for (var k in t) if (t[k] === e.code) t[k] = t[acc];
          t[acc] = e.code; A.disp.teclas = t; A.poner('disp', 'teclas', t);
        }
        pintar();
      }
      G.addEventListener('keydown', fin, true);
    }
    pintar(); c.appendChild(h('h3', { txt: 'Teclas' })); c.appendChild(caja);
    c.appendChild(UI.btn('Restablecer teclas', function () { A.reiniciarTeclas(); pintar(); }, 'sec'));
    c.appendChild(h('p', { cls: 'nota', txt: 'Flechas mueven el cursor, Enter abre siempre. Mando: cruceta/stick mueve, A abre, X bandera, Y acorde, LB/RB zoom, VISTA pista, B deshacer, MENU pausa.' }));
  }
  function controles(c) {
    [UI.deslizador('Sensibilidad del cursor (mando)', function () { return A.disp.sensCursor; }, function (v) { A.poner('disp', 'sensCursor', v); }, 0.4, 2.5, 0.1, function (v) { return v.toFixed(1) + '×'; }),
      UI.deslizador('Sensibilidad de zoom', function () { return A.disp.sensZoom; }, function (v) { A.poner('disp', 'sensZoom', v); }, 0.4, 2.5, 0.1, function (v) { return v.toFixed(1) + '×'; }),
      UI.deslizador('Zona muerta del mando', function () { return A.disp.zonaMuerta; }, function (v) { A.poner('disp', 'zonaMuerta', v); }, 0, 0.5, 0.05, pct),
      dispSw('Vibración del mando', 'vibracionMando'), dispSw('Vibración del móvil', 'vibracionMovil'),
      UI.deslizador('Pulsación larga (bandera)', function () { return A.disp.pulsacionLarga; }, function (v) { A.poner('disp', 'pulsacionLarga', v); }, 200, 800, 20, function (v) { return v + ' ms'; }),
      UI.selector('Tamaño de botones táctiles', [['s', 'Pequeño'], ['m', 'Mediano'], ['l', 'Grande']], function () { return A.disp.tactilTam; }, function (v) { A.poner('disp', 'tactilTam', v); }),
      UI.deslizador('Opacidad de botones táctiles', function () { return A.disp.tactilOpac; }, function (v) { A.poner('disp', 'tactilOpac', v); }, 0.3, 1, 0.05, pct),
      UI.selector('Posición de botones táctiles', [['derecha', 'Derecha'], ['izquierda', 'Izquierda'], ['centro', 'Centro']], function () { return A.disp.tactilPos; }, function (v) { A.poner('disp', 'tactilPos', v); }),
      dispSw('Modo zurdo', 'zurdo', 'Invierte la posición de los botones táctiles.')].forEach(function (f) { c.appendChild(f); });
    teclas(c);
  }
  function accesibilidad(c) {
    [genSw('Texto grande', 'textoGrande'),
      UI.selector('Daltonismo', [['ninguno', 'Ninguno'], ['deuteranopia', 'Deuteranopía / protanopía'], ['tritanopia', 'Tritanopía'], ['alto', 'Alto contraste']], function () { return A.gen.daltonismo; }, function (v) { A.poner('gen', 'daltonismo', v); }),
      genSw('Reducir movimiento', 'reducirMovimiento', 'Sin sacudidas, destellos ni cascadas animadas.'),
      genSw('Marcas de duda (?)', 'duda', 'La bandera pasa por «?» antes de quitarse.'),
      genSw('Acordes al tocar un número', 'acordes'),
      genSw('Resaltar casillas peligrosas', 'peligro', 'Ayuda visual: las partidas con ayuda no cuentan para récords.')].forEach(function (f) { c.appendChild(f); });
  }
  function datos(c) {
    var out = h('textarea', { cls: 'texto', readonly: true, rows: 3, 'aria-label': 'Código de guardado' }), inp = h('textarea', { cls: 'texto', rows: 3, placeholder: 'Pega aquí un código de guardado', 'aria-label': 'Importar guardado' });
    c.appendChild(h('p', { cls: 'nota', txt: 'El código incluye ajustes y progreso (estadísticas, récords y logros).' }));
    c.appendChild(UI.btn('Exportar guardado', function () { out.value = BM.almacen.exportar(); out.select(); try { navigator.clipboard.writeText(out.value); UI.toast('Código copiado'); } catch (e) {} }, 'sec'));
    c.appendChild(out); c.appendChild(inp);
    c.appendChild(UI.btn('Importar guardado', function () {
      if (BM.almacen.importar(inp.value)) { UI.toast('Guardado importado. Recargando…', 'ok'); BM.partida.guardarYa = function () {}; setTimeout(function () { location.reload(); }, 900); } else UI.toast('Código no válido', 'mal');
    }, 'sec'));
    c.appendChild(UI.btn('Borrar estadísticas y logros', function () { UI.confirmar('Se borrarán estadísticas, récords y logros. ¿Continuar?', function () { BM.progreso.reiniciar(); UI.toast('Progreso borrado'); }, 'Borrar'); }, 'peligro'));
    c.appendChild(UI.btn('Borrar todo el guardado', function () { UI.confirmar('Se borrará todo (ajustes, progreso y partida guardada).', function () { BM.almacen.borrarTodo(); BM.partida.guardarYa = function () {}; location.reload(); }, 'Borrar todo'); }, 'peligro'));
  }

  UI.abrirAjustes = function (alCerrar) {
    var cuerpo = UI.pestanas([{ id: 'gr', nombre: 'Gráficos', pintar: graficos }, { id: 'au', nombre: 'Audio', pintar: audio }, { id: 'co', nombre: 'Controles', pintar: controles },
      { id: 'ac', nombre: 'Accesibilidad', pintar: accesibilidad }, { id: 'da', nombre: 'Datos', pintar: datos }]);
    return UI.panel({ titulo: 'Ajustes', cuerpo: cuerpo, ancho: 560, cls: 'ancha', alCerrar: function () { A.guardarYa(); if (alCerrar) alCerrar(); } });
  };
})(window);
