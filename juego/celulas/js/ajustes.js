/* Celulas: ajustes (datos + pantalla con pestanas). Graficos y controles viven en celulas_ajustes_dispositivo; el resto en celulas_ajustes. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document, Al = C.Almacen;
  var tactil = G.matchMedia && G.matchMedia('(pointer: coarse)').matches;
  var DEV = {
    calidad: tactil ? 'baja' : 'media', resolucion: 1, fps: false, autobaja: true, cuadricula: true, nombres: true, masa: false, ondas: false, circulos: false,
    sens: 1, clicDivide: false, teclas: { dividir: 'Space', expulsar: 'KeyW', pausaMov: 'KeyQ', pausa: 'Escape', zoomMas: 'Equal', zoomMenos: 'Minus' },
    zonaMuerta: 0.18, vibracion: true, tamTactil: 1, opTactil: 0.8, zurdo: false, joyFijo: false
  };
  var GEN = { maestro: 0.8, musica: 0.35, efectos: 0.8, pausaOculto: true, textoGrande: false, daltonismo: 'ninguno', reducirMov: false, modo: 'ffa', dif: 'normal', bots: 30 };
  var A = C.Aj = { dev: Al.mezclar(DEV, Al.leer('ajustes_dispositivo', null)), gen: Al.mezclar(GEN, Al.leer('ajustes', null)), onCambio: null };
  A.preset = function (n) {
    var p = C.CALIDAD[n] || C.CALIDAD.media; A.dev.calidad = n; A.dev.circulos = p.circulos; A.dev.ondas = p.ondas;
  };
  if (!Al.leer('ajustes_dispositivo', null)) A.preset(A.dev.calidad);
  A.cal = function () {
    var p = C.CALIDAD[A.dev.calidad] || C.CALIDAD.media;
    return { dpr: Math.max(0.4, p.dpr * A.dev.resolucion), sprite: p.sprite, circulos: A.dev.circulos, ondas: A.dev.ondas && !A.gen.reducirMov };
  };
  A.guardar = function () { Al.escribir('ajustes_dispositivo', A.dev); Al.escribir('ajustes', A.gen); };
  A.aplicar = function () {
    var E = C.Entrada; E.ajustes = A.dev; E.teclas = A.dev.teclas;
    C.Audio.volumenes({ maestro: A.gen.maestro, musica: A.gen.musica, efectos: A.gen.efectos });
    var b = doc.body.classList;
    b.toggle('texto-grande', !!A.gen.textoGrande); b.toggle('reducir-mov', !!A.gen.reducirMov); b.toggle('zurdo', !!A.dev.zurdo);
    ['protanopia', 'deuteranopia', 'tritanopia'].forEach(function (d) { b.toggle('cvd-' + d, A.gen.daltonismo === d); });
    doc.documentElement.style.setProperty('--tactil-op', A.dev.opTactil); doc.documentElement.style.setProperty('--tactil-k', A.dev.tamTactil);
    if (A.onCambio) A.onCambio();
  };
  A.bajarCalidad = function () {
    var o = ['ultra', 'alta', 'media', 'baja'], i = o.indexOf(A.dev.calidad);
    if (i < 0 || i >= o.length - 1) return null;
    A.preset(o[i + 1]); A.guardar(); A.aplicar(); return o[i + 1];
  };

  var TABS = [
    { id: 'graf', nombre: 'Gráficos', campos: [
      { k: 'calidad', dev: 1, t: 'sel', etq: 'Calidad', ops: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['ultra', 'Ultra']], preset: 1 },
      { k: 'resolucion', dev: 1, t: 'rango', etq: 'Resolución de render', min: 0.5, max: 1, step: 0.1, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'fps', dev: 1, t: 'chk', etq: 'Mostrar FPS' },
      { k: 'autobaja', dev: 1, t: 'chk', etq: 'Bajar la calidad automáticamente si va lento' },
      { k: 'cuadricula', dev: 1, t: 'chk', etq: 'Cuadrícula' },
      { k: 'nombres', dev: 1, t: 'chk', etq: 'Nombres sobre las células' },
      { k: 'masa', dev: 1, t: 'chk', etq: 'Mostrar masa en las células' },
      { k: 'ondas', dev: 1, t: 'chk', etq: 'Latido de las células' },
      { k: 'circulos', dev: 1, t: 'chk', etq: 'Comida redonda (más costoso)' }] },
    { id: 'audio', nombre: 'Audio', campos: [
      { k: 'maestro', t: 'rango', etq: 'Volumen general', min: 0, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'musica', t: 'rango', etq: 'Música', min: 0, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'efectos', t: 'rango', etq: 'Efectos', min: 0, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'pausaOculto', t: 'chk', etq: 'Pausar al ocultar la pestaña (solo en solitario)' }] },
    { id: 'ctrl', nombre: 'Controles', campos: [
      { k: 'sens', dev: 1, t: 'rango', etq: 'Sensibilidad del puntero', min: 0.5, max: 2, step: 0.1, fmt: function (v) { return v.toFixed(1) + '×'; } },
      { k: 'clicDivide', dev: 1, t: 'chk', etq: 'Clic izquierdo también divide' },
      { k: 'dividir', tecla: 1, t: 'tecla', etq: 'Dividir' }, { k: 'expulsar', tecla: 1, t: 'tecla', etq: 'Expulsar masa' }, { k: 'pausaMov', tecla: 1, t: 'tecla', etq: 'Pausar movimiento' },
      { k: 'pausa', tecla: 1, t: 'tecla', etq: 'Pausa' }, { k: 'zoomMas', tecla: 1, t: 'tecla', etq: 'Acercar' }, { k: 'zoomMenos', tecla: 1, t: 'tecla', etq: 'Alejar' },
      { k: 'zonaMuerta', dev: 1, t: 'rango', etq: 'Zona muerta del mando', min: 0.05, max: 0.5, step: 0.01, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'vibracion', dev: 1, t: 'chk', etq: 'Vibración (mando y móvil)' },
      { k: 'tamTactil', dev: 1, t: 'rango', etq: 'Tamaño de controles táctiles', min: 0.7, max: 1.5, step: 0.1, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'opTactil', dev: 1, t: 'rango', etq: 'Opacidad de controles táctiles', min: 0.3, max: 1, step: 0.05, fmt: function (v) { return Math.round(v * 100) + '%'; } },
      { k: 'zurdo', dev: 1, t: 'chk', etq: 'Modo zurdo (botones a la izquierda)' },
      { k: 'joyFijo', dev: 1, t: 'chk', etq: 'Joystick fijo (en vez de flotante)' },
      { t: 'btn', etq: 'Restablecer teclas', fn: function () { A.dev.teclas = JSON.parse(JSON.stringify(DEV.teclas)); } }] },
    { id: 'acc', nombre: 'Accesibilidad', campos: [
      { k: 'textoGrande', t: 'chk', etq: 'Texto grande' },
      { k: 'daltonismo', t: 'sel', etq: 'Daltonismo', ops: [['ninguno', 'Ninguno'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia']] },
      { k: 'reducirMov', t: 'chk', etq: 'Reducir movimiento (sin latido, cámara más rápida)' }] },
    { id: 'datos', nombre: 'Datos', datos: 1 }
  ];
  function nombreTecla(c) { return ({ Space: 'Espacio', Escape: 'Esc', Equal: '+', Minus: '-' })[c] || c.replace(/^Key|^Digit/, ''); }
  function h(tag, cls, txt) { var e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  A.abrir = function (cont, alCerrar) {
    var actual = 0;
    function pintar() {
      cont.textContent = '';
      var cab = h('div', 'aj-cab'); cab.appendChild(h('h2', '', 'Ajustes'));
      var x = h('button', 'btn', 'Volver'); x.setAttribute('data-atras', 1); x.onclick = function () { A.guardar(); alCerrar(); }; cab.appendChild(x); cont.appendChild(cab);
      var tabs = h('div', 'aj-tabs'); tabs.setAttribute('role', 'tablist');
      TABS.forEach(function (t, i) {
        var b = h('button', 'aj-tab', t.nombre); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === actual));
        b.onclick = function () { actual = i; pintar(); setTimeout(function () { var el = cont.querySelector('[role=tab][aria-selected=true]'); if (el) C.Nav.enfocar(el); }, 0); }; tabs.appendChild(b);
      });
      cont.appendChild(tabs);
      var p = h('div', 'aj-panel'), t = TABS[actual];
      if (t.datos) datos(p); else t.campos.forEach(function (c) { p.appendChild(fila(c)); });
      cont.appendChild(p);
    }
    function fila(c) {
      var f = h('div', 'aj-fila'), l = h('label', '', c.etq); f.appendChild(l);
      if (c.t === 'btn') { var b = h('button', 'btn', c.etq); f.textContent = ''; b.onclick = function () { c.fn(); A.guardar(); A.aplicar(); pintar(); }; f.appendChild(b); return f; }
      var almacen = c.dev ? A.dev : A.gen, el;
      if (c.t === 'chk') { el = h('input'); el.type = 'checkbox'; el.checked = !!almacen[c.k]; el.onchange = function () { almacen[c.k] = el.checked; A.guardar(); A.aplicar(); }; l.prepend(el); f.className += ' chk'; l.textContent = ''; l.appendChild(el); l.appendChild(doc.createTextNode(' ' + c.etq)); }
      else if (c.t === 'rango') {
        el = h('input'); el.type = 'range'; el.min = c.min; el.max = c.max; el.step = c.step; el.value = almacen[c.k];
        var v = h('span', 'aj-val', c.fmt(+almacen[c.k]));
        el.oninput = function () { almacen[c.k] = +el.value; v.textContent = c.fmt(+el.value); A.guardar(); A.aplicar(); };
        f.appendChild(el); f.appendChild(v);
      } else if (c.t === 'sel') {
        el = h('select'); c.ops.forEach(function (o) { var op = h('option', '', o[1]); op.value = o[0]; if (o[0] === almacen[c.k]) op.selected = true; el.appendChild(op); });
        el.onchange = function () { if (c.preset) { A.preset(el.value); pintar(); } else almacen[c.k] = el.value; A.guardar(); A.aplicar(); if (c.k === 'calidad') C.Skins.vaciar(); }; f.appendChild(el);
      } else if (c.t === 'tecla') {
        el = h('button', 'btn tecla', nombreTecla(A.dev.teclas[c.k]));
        el.onclick = function () { el.textContent = 'Pulsa una tecla…'; C.Entrada.captura = function (code) { if (code !== 'Escape') A.dev.teclas[c.k] = code; A.guardar(); A.aplicar(); el.textContent = nombreTecla(A.dev.teclas[c.k]); }; };
        f.appendChild(el);
      }
      return f;
    }
    function datos(p) {
      var ta = h('textarea'); ta.rows = 5; ta.placeholder = 'Aquí aparece el texto de tu guardado'; ta.setAttribute('aria-label', 'Texto del guardado'); p.appendChild(ta);
      var msg = h('div', 'aj-msg'), fila1 = h('div', 'aj-fila botones');
      var ex = h('button', 'btn', 'Exportar'); ex.onclick = function () { ta.value = Al.exportar(); ta.select(); try { G.navigator.clipboard.writeText(ta.value); } catch (e) {} msg.textContent = 'Guardado exportado (copia el texto).'; };
      var im = h('button', 'btn', 'Importar'); im.onclick = function () { if (Al.importar(ta.value)) { A.dev = Al.mezclar(DEV, Al.leer('ajustes_dispositivo', null)); A.gen = Al.mezclar(GEN, Al.leer('ajustes', null)); A.aplicar(); msg.textContent = 'Importado correctamente.'; } else msg.textContent = 'El texto no es un guardado válido.'; };
      var bo = h('button', 'btn peligro', 'Borrar progreso'); bo.onclick = function () { if (bo.dataset.ok) { Al.borrarTodo(); A.gen = Al.mezclar(GEN, null); A.aplicar(); delete bo.dataset.ok; bo.textContent = 'Borrar progreso'; msg.textContent = 'Progreso borrado.'; } else { bo.dataset.ok = 1; bo.textContent = '¿Seguro? Pulsa otra vez'; } };
      fila1.appendChild(ex); fila1.appendChild(im); fila1.appendChild(bo); p.appendChild(fila1); p.appendChild(msg);
      p.appendChild(h('p', 'suave', 'Incluye nombre, skin, logros, estadísticas y preferencias. La partida en curso no se exporta.'));
    }
    pintar();
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
