/* Menu de ajustes con pestanas (raton, tactil y mando). Graficos/controles en la clave por dispositivo. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, h = S.h, btn = S.btn, J = S.Ajustes = {};
  var TABS = [
    { id: 'graficos', n: 'Gráficos' }, { id: 'audio', n: 'Audio' }, { id: 'controles', n: 'Controles' }, { id: 'acc', n: 'Accesibilidad' }, { id: 'datos', n: 'Datos' }
  ];
  var ITEMS = {
    graficos: [
      { t: 'sel', ruta: ['disp', 'graficos', 'calidad'], n: 'Calidad gráfica', op: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], nota: 'Baja: resolución reducida, sin brillos ni sprites; ideal para móviles.' },
      { t: 'chk', ruta: ['disp', 'graficos', 'auto'], n: 'Bajar la calidad automáticamente si hay pocos FPS' },
      { t: 'chk', ruta: ['disp', 'graficos', 'fps'], n: 'Mostrar FPS' },
      { t: 'chk', ruta: ['disp', 'graficos', 'nombres'], n: 'Mostrar nombres de las serpientes' },
      { t: 'chk', ruta: ['disp', 'graficos', 'particulas'], n: 'Partículas y chispas' }
    ],
    audio: [
      { t: 'rng', ruta: ['aj', 'audio', 'maestro'], n: 'Volumen general', min: 0, max: 1, paso: 0.05 },
      { t: 'rng', ruta: ['aj', 'audio', 'musica'], n: 'Música', min: 0, max: 1, paso: 0.05 },
      { t: 'rng', ruta: ['aj', 'audio', 'efectos'], n: 'Efectos', min: 0, max: 1, paso: 0.05 },
      { t: 'chk', ruta: ['aj', 'audio', 'pausaOculta'], n: 'Pausar el sonido al ocultar la pestaña' }
    ],
    controles: [
      { t: 'rng', ruta: ['disp', 'controles', 'sens'], n: 'Sensibilidad de giro (teclado y cruceta)', min: 0.4, max: 1.6, paso: 0.1 },
      { t: 'rng', ruta: ['disp', 'controles', 'zona'], n: 'Zona muerta del mando', min: 0.05, max: 0.4, paso: 0.01 },
      { t: 'chk', ruta: ['disp', 'controles', 'vibracion'], n: 'Vibración del mando' },
      { t: 'rng', ruta: ['disp', 'controles', 'tactilTam'], n: 'Tamaño de los controles táctiles', min: 0.7, max: 1.5, paso: 0.1 },
      { t: 'rng', ruta: ['disp', 'controles', 'tactilOp'], n: 'Opacidad de los controles táctiles', min: 0.2, max: 1, paso: 0.05 },
      { t: 'rng', ruta: ['disp', 'controles', 'tactilPos'], n: 'Altura de los controles táctiles', min: 0, max: 140, paso: 10 },
      { t: 'chk', ruta: ['disp', 'controles', 'zurdo'], n: 'Modo zurdo (joystick a la derecha, TURBO a la izquierda)' },
      { t: 'tecla', ruta: ['disp', 'controles', 'teclas', 'izq'], n: 'Tecla: girar a la izquierda' },
      { t: 'tecla', ruta: ['disp', 'controles', 'teclas', 'der'], n: 'Tecla: girar a la derecha' },
      { t: 'tecla', ruta: ['disp', 'controles', 'teclas', 'turbo'], n: 'Tecla: turbo' },
      { t: 'tecla', ruta: ['disp', 'controles', 'teclas', 'pausa'], n: 'Tecla: pausa' },
      { t: 'acc', n: 'Restablecer controles', fn: function () { var c = A.disp.controles; A.restablecerDisp(); A.disp.graficos.calidad = J.calidadPrev || A.disp.graficos.calidad; J.cambio(); J.pintar(); } }
    ],
    acc: [
      { t: 'chk', ruta: ['aj', 'acc', 'textoGrande'], n: 'Texto grande' },
      { t: 'sel', ruta: ['aj', 'acc', 'dalton'], n: 'Modo daltonismo (equipos con colores y símbolos distintos)', op: [['ninguno', 'Ninguno'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia']] },
      { t: 'chk', ruta: ['aj', 'acc', 'reducir'], n: 'Reducir movimiento (sin temblor ni pulsos)' }
    ]
  };
  function leer(ruta) { var o = A; for (var i = 0; i < ruta.length; i++) o = o[ruta[i]]; return o; }
  function escribir(ruta, v) { var o = A; for (var i = 0; i < ruta.length - 1; i++) o = o[ruta[i]]; o[ruta[ruta.length - 1]] = v; }
  var cont, tab = 'graficos', capturando = null;
  J.cambio = function () { A.guardarDisp(); A.guardarAj(); if (J.alCambiar) J.alCambiar(); };
  J.pestana = function (d) { var i = TABS.map(function (t) { return t.id; }).indexOf(tab); tab = TABS[(i + d + TABS.length) % TABS.length].id; J.pintar(); };
  J.montar = function (c) { cont = c; J.pintar(); };
  J.pintar = function () {
    if (!cont) return; cont.textContent = '';
    var bar = h('div', { cls: 'tabs', role: 'tablist' }, TABS.map(function (t) {
      return h('button', { type: 'button', cls: 'tab' + (t.id === tab ? ' sel' : ''), role: 'tab', 'aria-selected': String(t.id === tab), 'data-f': 1, txt: t.n, on: { click: function () { tab = t.id; J.pintar(); } } });
    }));
    cont.appendChild(bar); cont.appendChild(h('div', { cls: 'hint', txt: 'LB / RB cambia de pestaña con el mando' }));
    var cuerpo = h('div', { cls: 'ajcuerpo' });
    if (tab === 'datos') datos(cuerpo); else (ITEMS[tab] || []).forEach(function (it) { cuerpo.appendChild(fila(it)); });
    cont.appendChild(cuerpo);
  };
  function fila(it) {
    var d = h('div', { cls: 'fila' });
    if (it.t === 'chk') {
      var c = h('input', { type: 'checkbox', 'data-f': 1, id: 'aj' + it.ruta.join('_') }); c.checked = !!leer(it.ruta);
      c.addEventListener('change', function () { escribir(it.ruta, c.checked); J.cambio(); });
      d.appendChild(h('label', { cls: 'chk', 'for': c.id }, [c, h('span', { txt: it.n })]));
    } else if (it.t === 'rng') {
      var out = h('output'), r = h('input', { type: 'range', min: it.min, max: it.max, step: it.paso, 'data-f': 1, 'aria-label': it.n }); r.value = leer(it.ruta);
      var f = function () { out.textContent = (+r.value).toFixed(it.paso < 0.1 ? 2 : it.paso < 1 ? 1 : 0); }; f();
      r.addEventListener('input', function () { f(); escribir(it.ruta, +r.value); J.cambio(); });
      d.appendChild(h('label', {}, [h('span', { txt: it.n }), r, out]));
    } else if (it.t === 'sel') {
      var cur = leer(it.ruta), g = h('div', { cls: 'pills', role: 'group', 'aria-label': it.n });
      it.op.forEach(function (o) { g.appendChild(h('button', { type: 'button', cls: 'pill' + (o[0] === cur ? ' sel' : ''), 'aria-pressed': String(o[0] === cur), 'data-f': 1, txt: o[1], on: { click: function () { escribir(it.ruta, o[0]); J.cambio(); J.pintar(); } } })); });
      d.appendChild(h('div', { cls: 'etq', txt: it.n })); d.appendChild(g); if (it.nota) d.appendChild(h('div', { cls: 'nota', txt: it.nota }));
    } else if (it.t === 'tecla') {
      var b = h('button', { type: 'button', cls: 'b peq', 'data-f': 1, txt: S.Entrada.nombreTecla(leer(it.ruta)) });
      b.addEventListener('click', function () {
        b.textContent = 'Pulsa una tecla…'; S.Entrada.capturando = true;
        function k(e) { e.preventDefault(); e.stopPropagation(); G.removeEventListener('keydown', k, true); S.Entrada.capturando = false; if (e.code !== 'Escape') { escribir(it.ruta, e.code); J.cambio(); } J.pintar(); }
        G.addEventListener('keydown', k, true);
      });
      d.appendChild(h('div', { cls: 'etq', txt: it.n })); d.appendChild(b);
    } else if (it.t === 'acc') d.appendChild(btn(it.n, it.fn, 'peq'));
    return d;
  }
  function datos(c) {
    var ta = h('textarea', { cls: 'campo', rows: 3, 'data-f': 1, 'aria-label': 'Texto de guardado', placeholder: 'Pega aquí un guardado para importarlo' });
    var msg = h('div', { cls: 'nota' });
    c.appendChild(h('div', { cls: 'etq', txt: 'Guardado (récord, skins, estadísticas, logros y ajustes de audio/accesibilidad)' }));
    c.appendChild(ta);
    c.appendChild(h('div', { cls: 'fila fila-btns' }, [
      btn('Exportar', function () { ta.value = A.exportar(); ta.select(); try { document.execCommand('copy'); msg.textContent = 'Texto generado y copiado.'; } catch (e) { msg.textContent = 'Texto generado: cópialo.'; } }, 'peq'),
      btn('Importar', function () { if (A.importar(ta.value)) { msg.textContent = 'Guardado importado.'; J.cambio(); if (J.alImportar) J.alImportar(); } else msg.textContent = 'El texto no es un guardado válido.'; }, 'peq'),
      btn('Borrar progreso', function () { if (confirm('¿Borrar récord, skins, estadísticas, logros y partidas guardadas?')) { A.borrarTodo(false); msg.textContent = 'Progreso borrado.'; if (J.alImportar) J.alImportar(); } }, 'peq pel'),
      btn('Restablecer este dispositivo', function () { if (confirm('¿Restablecer gráficos y controles?')) { A.restablecerDisp(); J.cambio(); J.pintar(); } }, 'peq')
    ]));
    c.appendChild(msg);
  }
})(typeof window !== 'undefined' ? window : globalThis);
