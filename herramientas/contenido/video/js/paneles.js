/* Paneles laterales: medios, texto, pegatinas, audio, efectos, plantillas, subtitulos. VE.paneles */
(function (g) {
  var M = g.VE.modelo, F = g.VE.fuentes, h = g.VE.h, $ = g.VE.$, SN = g.VE.sonidos, S = g.VE.subtitulos, FL = g.VE.filtros, U = g.VE;
  var P = { tab: 'medios' }, A = null;
  var TABS = [['medios', 'Medios'], ['texto', 'Texto'], ['pegatinas', 'Pegatinas'], ['audio', 'Audio'], ['efectos', 'Efectos'], ['plantillas', 'Plantillas'], ['subtitulos', 'Subtítulos']];
  var TEXTOS = [
    { n: 'Título', estilo: 'impacto', tam: 0.1, y: -0.2, anim: { in: 'rebote', out: 'fundido', dur: 0.6 } },
    { n: 'Subtítulo', estilo: 'subtitulo', tam: 0.05, y: 0.3, anim: { in: 'fundido', out: 'fundido', dur: 0.3 } },
    { n: 'Rótulo', estilo: 'caja', tam: 0.06, y: 0, anim: { in: 'subir', out: 'fundido', dur: 0.5 } },
    { n: 'Neón', estilo: 'neon', color: '#39ff14', tam: 0.09, anim: { in: 'zoom', out: 'fundido', dur: 0.5 } },
    { n: 'Retro', estilo: 'retro', tam: 0.1, anim: { in: 'izq', out: 'der', dur: 0.5 } },
    { n: 'Contorno', estilo: 'contorno', tam: 0.09, anim: { in: 'fundido', out: 'fundido', dur: 0.4 } },
    { n: 'Degradado', estilo: 'gradiente', tam: 0.1, color: '#ffd400', color2: '#ff2d95', anim: { in: 'subir', out: 'bajar', dur: 0.5 } },
    { n: 'Resaltado', estilo: 'resaltado', tam: 0.06, anim: { in: 'zoom', out: 'fundido', dur: 0.4 } },
    { n: 'Máquina de escribir', estilo: 'basico', tam: 0.07, fuente: 'mono', anim: { in: 'maquina', out: 'fundido', dur: 1.8 }, dur: 4 },
    { n: 'Desplazamiento', estilo: 'caja', tam: 0.06, anim: { in: 'desplazar' }, dur: 6, ancho: 4 },
    { n: 'Rebote', estilo: 'contorno', tam: 0.11, anim: { in: 'rebote', cont: 'pulso', out: 'fundido', dur: 0.8 } },
    { n: 'Giro', estilo: 'impacto', tam: 0.1, anim: { in: 'giro', out: 'zoom', dur: 0.7 } }
  ];
  var EMOJIS = '😀 😂 🥰 😎 🤩 😭 😡 🤔 🙌 👍 👏 🔥 ✨ ⭐ 💥 ❤️ 💯 🎉 🎬 🎵 📸 🌈 ☀️ 🌙 ⚡ 💡 🚀 🎯 🏆 🍕 ☕ 🐶 🐱 🌸 🌍 ✈️ 🚗 ⚽ 🎮 👑 💎 🔔 📍 ➡️ ⬆️ ✅ ❌ ❓ ❗'.split(' ');
  var FORMAS = [['circulo', 'Círculo'], ['rect', 'Rectángulo'], ['redondeado', 'Redondeado'], ['triangulo', 'Triángulo'], ['estrella', 'Estrella'], ['corazon', 'Corazón'], ['flecha', 'Flecha'], ['linea', 'Línea']];
  var TRANS = [['ninguna', 'Ninguna'], ['fundido', 'Fundido'], ['deslizar', 'Deslizar'], ['zoom', 'Zoom'], ['difuminado', 'Difuminado'], ['destello', 'Corte con destello']];
  P.TRANS = TRANS;

  P.iniciar = function (app) {
    A = app; var tb = $('pestanas');
    TABS.forEach(function (t, i) {
      tb.appendChild(h('button', { role: 'tab', id: 'tab-' + t[0], 'aria-selected': String(t[0] === P.tab), 'aria-controls': 'contenidoIzq', 'data-t': t[0], onclick: function () { P.ir(t[0]); } }, t[1]));
    });
    tb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var i = TABS.findIndex(function (t) { return t[0] === P.tab; }); i = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length; P.ir(TABS[i][0]); $('tab-' + TABS[i][0]).focus(); } });
    P.render();
  };
  P.ir = function (t) { P.tab = t; document.querySelectorAll('#pestanas button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === t)); }); P.render(); };
  P.render = function () {
    var c = $('contenidoIzq'); c.textContent = ''; c.setAttribute('role', 'tabpanel'); c.setAttribute('aria-labelledby', 'tab-' + P.tab);
    c.appendChild(P['p_' + P.tab]());
  };
  var tituloP = function (t) { return h('div', { class: 'panelTit', texto: t }); };

  P.p_medios = function () {
    var r = h('div'), cap = A.cap || {};
    r.appendChild(h('div', { class: 'fila' },
      h('button', { class: 'btn prim', onclick: function () { A.pedirArchivos(); } }, '＋ Importar'),
      h('button', { class: 'btn', disabled: !cap.camara, onclick: function () { A.dlg.grabar('camara'); } }, '📷 Cámara'),
      h('button', { class: 'btn', disabled: !cap.pantalla, title: cap.pantalla ? '' : 'No disponible en este navegador', onclick: function () { A.dlg.grabar('pantalla'); } }, '🖥 Pantalla'),
      h('button', { class: 'btn', disabled: !cap.camara, onclick: function () { A.dlg.grabar('audio'); } }, '🎙 Voz'),
      h('button', { class: 'btn', onclick: function () { A.dlg.prompter(); } }, '📜 Teleprompter')));
    r.appendChild(h('p', { class: 'ayuda', texto: 'Arrastra archivos a la ventana o elige. Haz clic en una tarjeta para añadirla en el cursor, o arrástrala a la línea de tiempo.' }));
    var ms = Object.keys(A.p.medios).map(function (k) { return A.p.medios[k]; }).filter(function (m) { return !m.gen; });
    if (!ms.length) r.appendChild(h('div', { class: 'vacio', texto: 'Aún no hay medios. Importa o graba para empezar.' }));
    var gr = h('div', { class: 'cuadricula' });
    ms.forEach(function (m) {
      var e = F.medios[m.id], mini = h('div', { class: 'mini', texto: m.tipo === 'audio' ? '♪' : '' });
      if (m.tipo !== 'audio' && e) {
        if (e.miniUrl) mini.style.backgroundImage = 'url(' + e.miniUrl + ')'; else F.fotograma(m.id, Math.min(1, m.dur / 3), 160).then(function (u) { if (u) { e.miniUrl = u; mini.style.backgroundImage = 'url(' + u + ')'; } });
      }
      var tj = h('div', { class: 'tarjeta', draggable: 'true', tabindex: '0', role: 'button', 'aria-label': 'Añadir ' + m.nombre + ' a la línea de tiempo', ondragstart: function (ev) { ev.dataTransfer.setData('text/medio', m.id); },
        onclick: function () { A.agregarClipDeMedio(m.id); }, onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); A.agregarClipDeMedio(m.id); } } },
        mini, h('span', { class: 'dur', texto: m.tipo === 'imagen' ? 'foto' : U.dur(m.dur) }), h('span', { class: 'mas', 'aria-hidden': 'true', texto: '+' }), h('span', { class: 'nom', texto: m.nombre }));
      var uso = M.todos(A.p).some(function (c) { return c.medio === m.id; });
      gr.appendChild(h('div', { estilo: 'position:relative' }, tj, h('button', { class: 'btn chico peligro', estilo: 'width:100%;margin-top:3px', title: uso ? 'En uso en la línea de tiempo' : 'Quitar de la biblioteca', disabled: uso, onclick: function () { A.quitarMedio(m.id); }, 'aria-label': 'Quitar ' + m.nombre }, '🗑')));
    });
    r.appendChild(gr);
    r.appendChild(h('p', { class: 'ayuda', texto: 'Memoria de medios: ' + F.memoriaMB().toFixed(0) + ' MB de ' + F.limiteMB + ' MB (configurable en Ajustes).' }));
    return r;
  };

  P.p_texto = function () {
    var r = h('div'); r.appendChild(tituloP('Estilos de texto (clic para añadir en el cursor)'));
    var gr = h('div', { class: 'cuadricula' });
    TEXTOS.forEach(function (t) {
      var b = h('button', { class: 'estiloTxt', estilo: t.estilo === 'neon' ? 'color:' + t.color + ';text-shadow:0 0 8px ' + t.color : t.estilo === 'retro' ? 'text-shadow:2px 2px #ff2d95,-1px -1px #00e5ff' : t.estilo === 'caja' || t.estilo === 'subtitulo' ? 'background:#000' : t.estilo === 'resaltado' ? 'background:#ffd400;color:#111' : t.estilo === 'gradiente' ? 'background:#2a2d40;color:#ffd400' : '', onclick: function () { A.agregarTexto(t); } }, t.n);
      gr.appendChild(b);
    });
    r.appendChild(gr); r.appendChild(h('p', { class: 'ayuda', texto: 'Después edita el contenido, la fuente, el color y las animaciones en el panel de Ajustes.' }));
    return r;
  };

  P.p_pegatinas = function () {
    var r = h('div'); r.appendChild(tituloP('Emoji'));
    var gr = h('div', { class: 'cuadricula', estilo: 'grid-template-columns:repeat(auto-fill,minmax(46px,1fr))' });
    EMOJIS.forEach(function (e) { gr.appendChild(h('button', { class: 'emoji', 'aria-label': 'Añadir ' + e, onclick: function () { A.agregarPegatina({ tipo: 'emoji', texto: e }); } }, e)); });
    r.appendChild(gr); r.appendChild(tituloP('Formas animadas'));
    var col = h('input', { type: 'color', valor: '#ffd400', 'aria-label': 'Color de la forma' });
    r.appendChild(h('div', { class: 'fila' }, h('label', null, 'Color '), col));
    var gf = h('div', { class: 'cuadricula' });
    FORMAS.forEach(function (f) { gf.appendChild(h('button', { class: 'btn', onclick: function () { A.agregarPegatina({ tipo: 'forma', forma: f[0], color: col.value, anim: { in: 'rebote', cont: 'pulso', dur: 0.6 } }); } }, f[1])); });
    r.appendChild(gf); return r;
  };

  var vistaPrevia = null;
  P.parar = function () { if (vistaPrevia) { try { vistaPrevia.stop(); } catch (e) {} vistaPrevia = null; } };
  function sonar(tipo, id, btn) {
    var parado = vistaPrevia && vistaPrevia.id === tipo + id; P.parar(); document.querySelectorAll('.btnSon').forEach(function (b) { b.textContent = '▶'; });
    if (parado) return;
    var ch = tipo === 'musica' ? SN.musica(id, 12, 32000) : SN.efecto(id, 44100), ac = F.ctxAudio(); if (ac.state === 'suspended') ac.resume();
    var b = ac.createBuffer(2, ch[0].length, tipo === 'musica' ? 32000 : 44100); b.copyToChannel(ch[0], 0); b.copyToChannel(ch[1], 1);
    var s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(); s.id = tipo + id; s.onended = function () { if (vistaPrevia === s) { vistaPrevia = null; btn.textContent = '▶'; } };
    vistaPrevia = s; btn.textContent = '■';
  }
  P.p_audio = function () {
    var r = h('div'); r.appendChild(tituloP('Música de fondo (generada por código, libre de derechos)'));
    var l = h('div', { class: 'lista' });
    SN.MUSICAS.forEach(function (m) {
      var bp = h('button', { class: 'btn chico btnSon', 'aria-label': 'Escuchar ' + m.nombre, onclick: function () { sonar('musica', m.id, bp); } }, '▶');
      l.appendChild(h('div', { class: 'item' }, bp, h('div', { class: 't' }, m.nombre, h('small', { texto: m.bpm + ' BPM' })), h('button', { class: 'btn chico prim', onclick: function () { A.agregarAudioGenerado('musica', m.id, m.nombre); } }, '＋ Añadir')));
    });
    r.appendChild(l); r.appendChild(tituloP('Efectos de sonido'));
    var e = h('div', { class: 'lista' });
    SN.EFECTOS.forEach(function (f) {
      var bp = h('button', { class: 'btn chico btnSon', 'aria-label': 'Escuchar ' + f.nombre, onclick: function () { sonar('sfx', f.id, bp); } }, '▶');
      e.appendChild(h('div', { class: 'item' }, bp, h('div', { class: 't' }, f.nombre, h('small', { texto: f.dur.toFixed(1) + ' s' })), h('button', { class: 'btn chico prim', onclick: function () { A.agregarAudioGenerado('sfx', f.id, f.nombre); } }, '＋ Añadir')));
    });
    r.appendChild(e); return r;
  };

  P.p_efectos = function () {
    var r = h('div'), sel = A.clipSel(); r.appendChild(tituloP('Filtros y looks'));
    if (!sel || (sel.tipo !== 'video' && sel.tipo !== 'imagen')) r.appendChild(h('p', { class: 'aviso', texto: 'Selecciona un clip de video o foto en la línea de tiempo para aplicar filtros y transiciones.' }));
    var gr = h('div', { class: 'cuadricula' });
    Object.keys(FL.LISTA).forEach(function (k) {
      gr.appendChild(h('button', { class: 'tarjeta filtroT', 'aria-pressed': String(!!sel && sel.filtro === k), onclick: function () { A.aplicarFiltro(k); } }, h('div', { class: 'mini', estilo: 'font-size:14px;font-weight:700;background:linear-gradient(135deg,' + ({ ninguno: '#888,#ccc', vivido: '#ff3d71,#ffd400', calido: '#ff8a00,#ffe29a', frio: '#2b6cff,#9fe3ff', bn: '#111,#eee', sepia: '#704214,#e6c79c', vintage: '#8d6e4a,#d9c9a3', cine: '#0b3c49,#c97b2d', drama: '#000,#7a7a7a', vhs: '#ff00a8,#00e5ff', neon: '#7c00ff,#00ffd0', lavado: '#b8c0cc,#f3f3f3', noche: '#050a30,#35477d' }[k] || '#888,#ccc') + ')', texto: FL.LISTA[k].nombre }), h('span', { class: 'nom', texto: FL.LISTA[k].nombre })));
    });
    r.appendChild(gr); r.appendChild(tituloP('Transiciones (entre este clip y el anterior)'));
    var l = h('div', { class: 'lista' });
    TRANS.forEach(function (t) { l.appendChild(h('div', { class: 'item' }, h('div', { class: 't', texto: t[1] }), h('button', { class: 'btn chico' + (sel && sel.trans && sel.trans.tipo === t[0] ? ' activo' : ''), disabled: !sel || (sel.tipo !== 'video' && sel.tipo !== 'imagen' && sel.tipo !== 'forma'), onclick: function () { A.aplicarTransicion(t[0]); } }, 'Aplicar'))); });
    r.appendChild(l); r.appendChild(h('p', { class: 'ayuda', texto: 'La transición actúa durante los primeros segundos del clip seleccionado y necesita un clip anterior pegado en la misma pista.' }));
    return r;
  };

  P.p_plantillas = function () {
    var r = h('div'); r.appendChild(h('p', { class: 'aviso', texto: 'Aplicar una plantilla reemplaza la línea de tiempo actual (puedes deshacer). Usa los medios de tu biblioteca.' }));
    var lp = h('div', { class: 'lista' }); r.appendChild(lp);
    g.VE.plantillas.LISTA.forEach(function (t) {
      lp.appendChild(h('div', { class: 'item' }, h('div', { class: 't' }, t.nombre, h('small', { texto: t.desc })), h('button', { class: 'btn prim chico', onclick: function () { A.aplicarPlantilla(t.id); } }, 'Usar')));
    });
    return r;
  };

  P.p_subtitulos = function () {
    var r = h('div'), cues = A.cuesActuales(), cap = A.cap || {};
    var ta = h('textarea', { rows: 5, placeholder: 'Pega aquí tu guion (una frase por línea) o el contenido de un archivo SRT/VTT…', 'aria-label': 'Guion o SRT/VTT' });
    r.appendChild(tituloP('Crear subtítulos')); r.appendChild(ta);
    var ini = h('input', { type: 'number', step: '0.1', min: '0', valor: (+A.motor.t.toFixed(1)), 'aria-label': 'Inicio en segundos', estilo: 'width:80px' }), du = h('input', { type: 'number', step: '0.5', min: '0.5', valor: Math.max(3, +(M.duracion(A.p) - A.motor.t).toFixed(1)), 'aria-label': 'Duración en segundos', estilo: 'width:80px' });
    r.appendChild(h('div', { class: 'fila' }, h('label', null, 'Desde (s) '), ini, h('label', null, 'Durante (s) '), du));
    r.appendChild(h('div', { class: 'fila' },
      h('button', { class: 'btn prim', onclick: function () { var tx = ta.value.trim(); if (!tx) return A.toast('Pega primero un guion o SRT/VTT.'); var cs = S.detectar(tx) ? S.parsear(tx) : S.desdeGuion(tx, +ini.value, +du.value); if (!cs.length) return A.toast('No se encontraron subtítulos en el texto.'); if (S.detectar(tx)) cs = S.desplazar(cs, +ini.value > 0 && cs[0].ini < 0.01 ? +ini.value : 0); A.crearSubtitulos(cs); ta.value = ''; } }, 'Crear desde texto'),
      h('button', { class: 'btn', onclick: function () { A.importarSubtitulosArchivo(); } }, 'Importar SRT/VTT'),
      h('button', { class: 'btn', disabled: !cues.length, onclick: function () { U.descargar(new Blob([S.aSRT(cues.map(cueDe))], { type: 'text/plain' }), U.nombreSeguro(A.p.nombre) + '.srt'); } }, 'Exportar SRT'),
      h('button', { class: 'btn', disabled: !cues.length, onclick: function () { U.descargar(new Blob([S.aVTT(cues.map(cueDe))], { type: 'text/vtt' }), U.nombreSeguro(A.p.nombre) + '.vtt'); } }, 'Exportar VTT')));
    r.appendChild(tituloP('Subtítulos automáticos (dictado)'));
    if (g.VE.voz.disponible) {
      var idioma = h('select', { 'aria-label': 'Idioma del dictado' }, ['es-ES', 'es-MX', 'es-AR', 'es-CO', 'en-US', 'en-GB', 'pt-BR', 'fr-FR', 'de-DE', 'it-IT'].map(function (l) { return h('option', { value: l, texto: l }); }));
      var est = h('div', { class: 'ayuda', 'aria-live': 'polite' });
      r.appendChild(h('p', { class: 'aviso', texto: 'Usa el reconocimiento de voz del navegador (puede enviar el audio al servicio de voz de tu navegador). Escucha el micrófono, no el archivo: habla o reproduce el video con volumen y la calidad varía. Revisa y corrige el resultado.' }));
      var btn = h('button', { class: 'btn', onclick: function () { A.alternarDictado(idioma.value, est, btn); } }, '🎙 Dictar y reproducir');
      r.appendChild(h('div', { class: 'fila' }, idioma, btn)); r.appendChild(est);
    } else r.appendChild(h('p', { class: 'aviso', texto: 'Este navegador no incluye reconocimiento de voz (Web Speech API). Usa la edición manual: pega tu guion, impórtalo o escribe cada línea y alinéala con el cursor.' }));
    r.appendChild(tituloP('Estilo de todos los subtítulos'));
    var es = A.estiloSub, selE = h('select', { 'aria-label': 'Estilo' }, ['subtitulo', 'caja', 'contorno', 'basico', 'resaltado', 'neon', 'impacto'].map(function (k) { return h('option', { value: k, texto: k, selected: es.estilo === k }); }));
    var col = h('input', { type: 'color', valor: es.color, 'aria-label': 'Color del texto' }), tam = h('input', { type: 'range', min: '0.025', max: '0.09', step: '0.005', valor: es.tam, 'aria-label': 'Tamaño' }), py = h('input', { type: 'range', min: '-0.45', max: '0.45', step: '0.01', valor: es.y, 'aria-label': 'Posición vertical' });
    var ap = function () { A.estiloSub = { estilo: selE.value, color: col.value, tam: +tam.value, y: +py.value }; A.aplicarEstiloSub(); };
    [selE, col, tam, py].forEach(function (e) { e.addEventListener('change', ap); });
    r.appendChild(h('div', { class: 'fila' }, selE, col, h('label', null, 'Tamaño'), tam, h('label', null, 'Posición'), py));
    r.appendChild(tituloP('Subtítulos (' + cues.length + ')'));
    if (cues.length) r.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn chico', onclick: function () { A.desplazarSubs(-0.1); } }, '← 0,1 s'), h('button', { class: 'btn chico', onclick: function () { A.desplazarSubs(0.1); } }, '0,1 s →'), h('span', { class: 'ayuda', texto: 'Desplaza todos' })));
    var lst = h('div', { class: 'lista' });
    cues.forEach(function (c) {
      var ti = h('input', { type: 'number', step: '0.1', min: '0', valor: +c.ini.toFixed(2), 'aria-label': 'Inicio', estilo: 'width:70px', onchange: function () { A.moverSub(c.id, +this.value, null); } }),
        tf = h('input', { type: 'number', step: '0.1', min: '0', valor: +M.fin(c).toFixed(2), 'aria-label': 'Fin', estilo: 'width:70px', onchange: function () { A.moverSub(c.id, null, +this.value); } }),
        tx = h('input', { type: 'text', valor: c.texto, 'aria-label': 'Texto', estilo: 'flex:1;min-width:120px', oninput: function () { A.textoSub(c.id, this.value); } });
      lst.appendChild(h('div', { class: 'item', estilo: 'flex-wrap:wrap' }, ti, tf, tx,
        h('button', { class: 'btn chico', title: 'Ir a este subtítulo', onclick: function () { A.motor.ir(c.ini + 0.01); } }, '▶'),
        h('button', { class: 'btn chico', title: 'Alinear inicio al cursor', onclick: function () { A.moverSub(c.id, A.motor.t, null); P.render(); } }, '⇤'),
        h('button', { class: 'btn chico', title: 'Alinear fin al cursor', onclick: function () { A.moverSub(c.id, null, A.motor.t); P.render(); } }, '⇥'),
        h('button', { class: 'btn chico peligro', 'aria-label': 'Eliminar subtítulo', onclick: function () { A.eliminarClip(c.id, false); } }, '🗑')));
    });
    r.appendChild(lst); return r;
  };
  function cueDe(c) { return { ini: c.ini, fin: M.fin(c), texto: c.texto }; }
  g.VE.paneles = P;
})(window);
