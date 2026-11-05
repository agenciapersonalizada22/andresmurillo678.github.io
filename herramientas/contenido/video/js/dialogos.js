/* Dialogos: proyectos, exportacion, grabacion, teleprompter, ayuda, ajustes. VE.dlg */
(function (g) {
  var M = g.VE.modelo, F = g.VE.fuentes, h = g.VE.h, $ = g.VE.$, U = g.VE, AL = g.VE.almacen, C = g.VE.cap, E = g.VE.exportador, D = {}, A = null;
  D.iniciar = function (app) { A = app; A.dlg = D; };

  function abrir(titulo, cuerpo, ancho) {
    var d = h('dialog', { 'aria-labelledby': 'dlgT' }, h('div', { class: 'cab' }, h('h2', { id: 'dlgT', texto: titulo }), h('button', { class: 'btn icono', 'aria-label': 'Cerrar', onclick: function () { d.close(); } }, '✕')), h('div', { class: 'cuerpo' }, cuerpo));
    if (ancho) d.style.width = 'min(94vw,' + ancho + 'px)';
    d.addEventListener('close', function () { if (d.alCerrar) d.alCerrar(); d.remove(); });
    $('dialogos').appendChild(d); d.showModal(); return d;
  }
  D.abrir = abrir;

  /* ---------- Proyectos ---------- */
  D.proyectos = async function (verPapelera) {
    var cuerpo = h('div'), d = abrir(verPapelera ? 'Papelera' : 'Proyectos', cuerpo, 720);
    async function pintar() {
      cuerpo.textContent = ''; var lista = (await AL.lista()).filter(function (x) { return !!x.papelera === !!verPapelera; });
      var asp = h('select', { 'aria-label': 'Proporción del proyecto nuevo' }, ['9:16', '1:1', '4:5', '16:9'].map(function (a) { return h('option', { value: a, texto: a }); }));
      if (!verPapelera) cuerpo.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn prim', onclick: async function () { await A.nuevoProyecto(asp.value); d.close(); } }, '＋ Nuevo proyecto'), asp,
        h('button', { class: 'btn', onclick: function () { A.importarProyectoArchivo(); d.close(); } }, 'Importar archivo .cvp'), h('button', { class: 'btn', onclick: function () { A.exportarProyectoArchivo(); } }, 'Exportar proyecto actual'),
        h('button', { class: 'btn', onclick: function () { d.close(); D.proyectos(true); } }, '🗑 Papelera')));
      else cuerpo.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn', onclick: function () { d.close(); D.proyectos(false); } }, '← Proyectos'),
        h('button', { class: 'btn peligro', disabled: !lista.length, onclick: async function () { if (confirm('¿Vaciar la papelera? No se puede deshacer.')) { for (var i = 0; i < lista.length; i++) await A.borrarProyectoDefinitivo(lista[i].id); pintar(); } } }, 'Vaciar papelera')));
      if (!lista.length) cuerpo.appendChild(h('p', { class: 'vacio', texto: verPapelera ? 'La papelera está vacía.' : 'No hay proyectos todavía.' }));
      lista.forEach(function (x) {
        var actual = x.id === A.p.id;
        cuerpo.appendChild(h('div', { class: 'item', estilo: 'flex-wrap:wrap' },
          h('div', { estilo: 'width:48px;height:64px;border-radius:6px;background:#000 center/cover;flex:none;background-image:' + (x.mini ? 'url(' + x.mini + ')' : 'none') }),
          h('div', { class: 't' }, x.nombre + (actual ? ' (abierto)' : ''), h('small', { texto: x.aspecto + ' · ' + new Date(x.mod).toLocaleString() })),
          verPapelera ? [h('button', { class: 'btn chico', onclick: async function () { await A.papelera(x.id, false); pintar(); } }, 'Restaurar'), h('button', { class: 'btn chico peligro', onclick: async function () { if (confirm('¿Eliminar para siempre "' + x.nombre + '"?')) { await A.borrarProyectoDefinitivo(x.id); pintar(); } } }, 'Eliminar')]
            : [h('button', { class: 'btn chico prim', disabled: actual, onclick: async function () { await A.abrirProyecto(x.id); d.close(); } }, 'Abrir'),
              h('button', { class: 'btn chico', onclick: async function () { await A.duplicarProyecto(x.id); pintar(); } }, 'Duplicar'),
              h('button', { class: 'btn chico', onclick: async function () { var n = prompt('Nuevo nombre', x.nombre); if (n) { await A.renombrarProyecto(x.id, n); pintar(); } } }, 'Renombrar'),
              h('button', { class: 'btn chico peligro', 'aria-label': 'Mover a la papelera', onclick: async function () { await A.papelera(x.id, true); pintar(); } }, '🗑')]));
      });
    }
    pintar();
  };

  /* ---------- Exportar ---------- */
  D.exportar = async function () {
    if (M.duracion(A.p) <= 0) return A.toast('La línea de tiempo está vacía: añade algún clip antes de exportar.');
    A.motor.pausar(); var cuerpo = h('div'), d = abrir('Exportar video', cuerpo, 680), cap = A.cap, opciones = C.opcionesExport(cap);
    var cancelado = false, trabajando = false;
    d.addEventListener('cancel', function (e) { if (trabajando) e.preventDefault(); });
    if (!opciones.length) { cuerpo.appendChild(h('p', { class: 'aviso mal', texto: 'Este navegador no puede codificar video (sin WebCodecs ni MediaRecorder). Prueba con Chrome, Edge o Firefox actualizados en un equipo o Android.' })); return; }
    var selF = h('select', { id: 'exFormato', 'aria-label': 'Formato' }, opciones.map(function (o) { return h('option', { value: o.id, texto: o.nombre }); }));
    var selR = h('select', { id: 'exRes', 'aria-label': 'Resolución' }), selFps = h('select', { id: 'exFps', 'aria-label': 'Fotogramas por segundo' }, [24, 30, 60].map(function (f) { return h('option', { value: f, selected: f === (A.p.fps || 30), texto: f + ' fps' }); }));
    var selQ = h('select', { id: 'exCal', 'aria-label': 'Calidad' }, [['baja', 'Baja (archivo pequeño)'], ['media', 'Media'], ['alta', 'Alta'], ['maxima', 'Máxima']].map(function (q) { return h('option', { value: q[0], selected: q[0] === 'alta', texto: q[1] }); }));
    var mb = h('input', { type: 'number', id: 'exMbps', min: '0.3', max: '200', step: '0.1', placeholder: 'auto', 'aria-label': 'Bitrate en megabits por segundo (opcional)', estilo: 'width:90px' });
    var info = h('div', { class: 'ayuda', 'aria-live': 'polite' }), prog = h('div', { class: 'barraProg', estilo: 'display:none' }, h('i')), msg = h('div', { class: 'ayuda', 'aria-live': 'polite' }), res = h('div');
    var RES = [[480, '480p'], [720, '720p (HD)'], [1080, '1080p (Full HD)'], [1440, '1440p (2K)'], [2160, '2160p (4K)']];
    var btn = h('button', { class: 'btn prim', id: 'exIniciar' }, '▶ Exportar'), btnC = h('button', { class: 'btn peligro', estilo: 'display:none', onclick: function () { cancelado = true; msg.textContent = 'Cancelando…'; } }, 'Cancelar');
    function actual() { return opciones.filter(function (o) { return o.id === selF.value; })[0]; }
    async function refrescarRes() {
      var o = actual(), previa = selR.value || '720'; selR.textContent = '';
      for (var i = 0; i < RES.length; i++) {
        var dm = E.dimensiones(A.p, RES[i][0]), ok = true;
        if (o.cont !== 'rt') ok = !!(await C.soportaVideo(o.codec, dm[0], dm[1], +selFps.value, 8e6));
        else ok = RES[i][0] <= 1080;
        selR.appendChild(h('option', { value: RES[i][0], disabled: !ok, selected: String(RES[i][0]) === previa && ok, texto: RES[i][1] + ' (' + dm[0] + '×' + dm[1] + ')' + (ok ? '' : ' — no disponible') }));
      }
      if (!selR.value || selR.selectedOptions[0].disabled) { var primero = [].filter.call(selR.options, function (x) { return !x.disabled; }).pop(); if (primero) selR.value = primero.value; }
      est();
    }
    function est() {
      var o = actual(), lado = +selR.value || 720, dm = E.dimensiones(A.p, lado), fps = +selFps.value, dur = M.duracion(A.p);
      var br = mb.value ? mb.value * 1e6 : E.bitrate(dm[0], dm[1], fps, selQ.value, o.codec);
      info.textContent = dm[0] + '×' + dm[1] + ' · ' + fps + ' fps · ' + M.fmt(dur) + ' · ≈ ' + ((br + 128000) * dur / 8 / 1048576).toFixed(1) + ' MB' + (o.cont === 'rt' ? ' · se graba en tiempo real: dura lo mismo que el video' : '');
    }
    [selR, selFps, selQ, mb].forEach(function (e) { e.addEventListener('change', est); }); selFps.addEventListener('change', refrescarRes); selF.addEventListener('change', refrescarRes);
    cuerpo.appendChild(h('div', { class: 'rejilla2' }, h('label', null, 'Formato', h('br'), selF), h('label', null, 'Resolución', h('br'), selR), h('label', null, 'Fotogramas por segundo', h('br'), selFps), h('label', null, 'Calidad', h('br'), selQ),
      h('label', null, 'Bitrate (Mbps, opcional)', h('br'), mb)));
    cuerpo.appendChild(info);
    var notas = [];
    if (!cap.codecs.h264 || !cap.codecs.aac) notas.push('Este navegador no ofrece H.264/AAC para codificar, por eso MP4 no aparece. WebM se reproduce en Chrome, Edge, Firefox y Android; para compartirlo en redes que exijan MP4 conviértelo con una herramienta externa o usa un navegador con soporte H.264 (Chrome/Edge de escritorio, Safari reciente).');
    if (cap.ios) notas.push('iOS/Safari: soporte limitado de WebCodecs y MediaRecorder; si no aparece MP4 se usa la grabación en tiempo real (mantén la pantalla encendida y la pestaña visible mientras exporta).');
    if (!cap.webcodecs) notas.push('Sin WebCodecs: la exportación usa el modo de compatibilidad (MediaRecorder), que se graba en tiempo real y puede perder fotogramas en equipos lentos.');
    notas.forEach(function (n) { cuerpo.appendChild(h('p', { class: 'aviso', texto: n })); });
    cuerpo.appendChild(h('div', { class: 'fila' }, btn, btnC)); cuerpo.appendChild(prog); cuerpo.appendChild(msg); cuerpo.appendChild(res);
    await refrescarRes();
    btn.onclick = async function () {
      var o = actual(), dm = E.dimensiones(A.p, +selR.value), fps = +selFps.value; cancelado = false; trabajando = true; btn.disabled = true; btnC.style.display = ''; prog.style.display = ''; res.textContent = '';
      [selF, selR, selFps, selQ, mb].forEach(function (e) { e.disabled = true; }); F.modoExport = true;
      var t0 = performance.now();
      try {
        var r = await E.exportar(A.p, { cont: o.cont, codec: o.codec, audio: o.audio, tipo: o.tipo, ancho: dm[0], alto: dm[1], fps: fps, calidad: selQ.value, bitrate: mb.value ? Math.round(mb.value * 1e6) : 0, sinGL: !A.cfg.webgl },
          { progreso: function (f, t) { prog.firstChild.style.width = Math.round(f * 100) + '%'; prog.setAttribute('role', 'progressbar'); prog.setAttribute('aria-valuenow', Math.round(f * 100)); if (t) msg.textContent = t + ' (' + Math.round(f * 100) + '%)'; }, cancelado: function () { return cancelado; } });
        prog.firstChild.style.width = '100%'; msg.textContent = 'Verificando el archivo…';
        var v = await E.verificar(r.blob), url = URL.createObjectURL(r.blob), nombre = U.nombreSeguro(A.p.nombre) + '_' + dm[0] + 'x' + dm[1] + '.' + r.ext;
        msg.textContent = '✔ Listo en ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s · ' + r.metodo;
        res.appendChild(h('div', { class: 'aviso', id: 'exResultado' }, 'Archivo ' + r.ext.toUpperCase() + ' de ' + U.tam(r.blob.size) + (v.ok ? ' · verificado: ' + v.w + '×' + v.h + ', ' + (isFinite(v.dur) ? v.dur.toFixed(2) + ' s' : 'duración no indicada') : ' · no se pudo verificar la reproducción en este navegador')));
        res.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn prim', id: 'exDescargar', onclick: function () { U.descargar(r.blob, nombre); } }, '⬇ Descargar ' + nombre)));
        var vid = h('video', { src: url, controls: true, playsinline: true, estilo: 'width:100%;max-height:40vh;background:#000;border-radius:8px', 'aria-label': 'Vista previa del resultado' }); res.appendChild(vid);
        d.alCerrar = function () { URL.revokeObjectURL(url); }; window.__ultimaExportacion = { blob: r.blob, ext: r.ext, verif: v, metodo: r.metodo, ancho: dm[0], alto: dm[1], dur: r.dur };
      } catch (e) { msg.textContent = e.message === 'cancelado' ? 'Exportación cancelada.' : '✖ Error: ' + e.message; if (e.message !== 'cancelado') res.appendChild(h('p', { class: 'aviso mal', texto: 'No se pudo exportar. Prueba con una resolución menor, otro formato o el modo de compatibilidad.' })); }
      finally { trabajando = false; F.modoExport = false; btn.disabled = false; btnC.style.display = 'none'; [selF, selR, selFps, selQ, mb].forEach(function (e) { e.disabled = false; }); A.buscarYDibujar(); }
    };
  };

  /* ---------- Grabar ---------- */
  D.grabar = async function (tipo) {
    var cuerpo = h('div'), d = abrir({ camara: 'Grabar con la cámara', pantalla: 'Grabar la pantalla', audio: 'Grabar voz' }[tipo], cuerpo, 560), ses = null, lista = null;
    var vid = h('video', { muted: true, playsinline: true, autoplay: true, estilo: 'width:100%;max-height:46vh;background:#000;border-radius:10px;' + (tipo === 'audio' ? 'display:none' : ''), 'aria-label': 'Vista previa en directo' });
    var msg = h('div', { class: 'ayuda', 'aria-live': 'polite' }), cron = h('div', { estilo: 'font-size:22px;font-weight:700;font-variant-numeric:tabular-nums', texto: '00:00' }), tmr = null;
    var mic = h('input', { type: 'checkbox' }), res = h('div');
    var bIni = h('button', { class: 'btn prim', disabled: true }, '● Grabar'), bStop = h('button', { class: 'btn peligro', disabled: true }, '■ Detener');
    cuerpo.appendChild(vid); cuerpo.appendChild(h('div', { class: 'fila' }, bIni, bStop, cron, tipo === 'pantalla' ? h('label', { class: 'chk' }, mic, ' Incluir micrófono') : null, tipo === 'camara' ? h('button', { class: 'btn chico', onclick: function () { D.prompter(); d.close(); } }, '📜 Teleprompter') : null)); cuerpo.appendChild(msg); cuerpo.appendChild(res);
    d.alCerrar = function () { clearInterval(tmr); if (ses) { ses.cerrar(); } };
    async function conectar() {
      try { ses = await g.VE.grabar.abrir(tipo, { microfono: mic.checked }); vid.srcObject = ses.stream; bIni.disabled = false; msg.textContent = tipo === 'audio' ? 'Micrófono listo.' : 'Vista previa lista.'; ses.alTerminar = function () { if (!bStop.disabled) bStop.click(); }; }
      catch (e) { msg.textContent = '✖ ' + (e.name === 'NotAllowedError' ? 'Permiso denegado. Permite el acceso en la barra del navegador.' : e.message); msg.className = 'aviso mal'; }
    }
    bIni.onclick = function () { ses.empezar(); bIni.disabled = true; bStop.disabled = false; msg.textContent = 'Grabando…'; var t0 = Date.now(); tmr = setInterval(function () { cron.textContent = M.fmt((Date.now() - t0) / 1000).slice(0, 5); }, 250); };
    bStop.onclick = async function () {
      clearInterval(tmr); bStop.disabled = true; var blob = await ses.detener(); ses.cerrar(); vid.srcObject = null;
      var url = URL.createObjectURL(blob), pv = h('video', { src: url, controls: true, playsinline: true, estilo: 'width:100%;max-height:40vh;background:#000;border-radius:10px' }); if (tipo === 'audio') pv = h('audio', { src: url, controls: true, estilo: 'width:100%' });
      res.textContent = ''; res.appendChild(pv);
      var nombre = { camara: 'Cámara', pantalla: 'Pantalla', audio: 'Voz' }[tipo] + ' ' + new Date().toLocaleTimeString();
      res.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn prim', onclick: async function () { await A.agregarMedios([new File([blob], nombre + (blob.type.indexOf('mp4') >= 0 ? '.mp4' : blob.type.indexOf('audio') === 0 ? '.webm' : '.webm'), { type: blob.type })], true); d.close(); } }, 'Añadir a la línea de tiempo'),
        h('button', { class: 'btn', onclick: function () { U.descargar(blob, nombre + '.webm'); } }, 'Descargar copia'), h('button', { class: 'btn peligro', onclick: function () { res.textContent = ''; d.close(); } }, 'Descartar')));
      msg.textContent = 'Grabación terminada (' + U.tam(blob.size) + ').';
    };
    conectar();
  };

  /* ---------- Teleprompter ---------- */
  D.prompter = function () {
    var ov = $('prompter'); if (ov) ov.remove();
    ov = h('div', { id: 'prompter', class: 'on', role: 'dialog', 'aria-label': 'Teleprompter' });
    var ta = h('textarea', { rows: 8, estilo: 'flex:1;margin:8px;background:#111;color:#fff;font-size:20px', 'aria-label': 'Guion', placeholder: 'Escribe o pega tu guion aquí…' }); ta.value = (A.almacenGuion || '');
    var vel = h('input', { type: 'range', min: '15', max: '200', value: '60', 'aria-label': 'Velocidad' }), tam = h('input', { type: 'range', min: '24', max: '110', value: '52', 'aria-label': 'Tamaño de letra' }), esp = h('input', { type: 'checkbox' }), grab = h('input', { type: 'checkbox' });
    var area = h('div', { class: 'texto', estilo: 'display:none' }, h('div', { class: 'linea' })), cont = h('div'); area.appendChild(cont);
    var pv = h('video', { muted: true, playsinline: true, autoplay: true, estilo: 'position:absolute;right:8px;top:8px;width:120px;border-radius:8px;z-index:3;display:none' }); area.appendChild(pv);
    var go = h('button', { class: 'btn prim' }, '▶ Empezar'), stop = h('button', { class: 'btn peligro', estilo: 'display:none' }, '■ Detener'), cer = h('button', { class: 'btn' }, 'Cerrar'), cd = h('span', { estilo: 'font-size:22px;font-weight:700' });
    ov.appendChild(ta); ov.appendChild(area);
    ov.appendChild(h('div', { class: 'ctrl' }, go, stop, cer, h('label', null, 'Velocidad ', vel), h('label', null, 'Tamaño ', tam), h('label', { class: 'chk' }, esp, ' Espejo'), h('label', { class: 'chk', title: 'Graba tu cámara mientras lees' }, grab, ' Grabar con cámara'), cd));
    document.body.appendChild(ov);
    var raf = 0, ses = null, y = 0, ult = 0, corriendo = false;
    function fin() { corriendo = false; cancelAnimationFrame(raf); area.style.display = 'none'; ta.style.display = ''; go.style.display = ''; stop.style.display = 'none'; pv.style.display = 'none'; }
    async function parar() {
      if (ses) { var s = ses; ses = null; var blob = await s.detener(); s.cerrar(); pv.srcObject = null; await A.agregarMedios([new File([blob], 'Teleprompter ' + new Date().toLocaleTimeString() + '.webm', { type: blob.type })], true); A.toast('Grabación añadida a la línea de tiempo.'); }
      fin();
    }
    go.onclick = async function () {
      A.almacenGuion = ta.value; if (!ta.value.trim()) { ta.focus(); return; }
      if (grab.checked) { try { ses = await g.VE.grabar.abrir('camara', {}); pv.srcObject = ses.stream; pv.style.display = ''; } catch (e) { A.toast('No se pudo abrir la cámara: ' + e.message); grab.checked = false; } }
      cont.textContent = ta.value; cont.style.fontSize = tam.value + 'px'; cont.style.transform = esp.checked ? 'scaleX(-1)' : ''; ta.style.display = 'none'; area.style.display = ''; go.style.display = 'none'; stop.style.display = '';
      for (var n = 3; n > 0; n--) { cd.textContent = n; await new Promise(function (r) { setTimeout(r, 1000); }); } cd.textContent = '';
      if (ses) ses.empezar(); y = area.clientHeight / 2; ult = performance.now(); corriendo = true;
      (function paso(t) { if (!corriendo) return; y -= vel.value * (t - ult) / 1000; ult = t; cont.style.top = y + 'px'; cont.style.fontSize = tam.value + 'px'; if (y < -cont.offsetHeight) { parar(); return; } raf = requestAnimationFrame(paso); })(ult);
    };
    stop.onclick = parar; cer.onclick = async function () { if (corriendo || ses) await parar(); ov.remove(); };
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') cer.click(); });
    ta.focus();
  };

  /* ---------- Ayuda ---------- */
  D.ayuda = function () {
    var c = A.cap, f = function (b) { return b ? '✔ Sí' : '✖ No'; };
    var at = [['Espacio / K', 'Reproducir o pausar'], ['J / L', 'Retroceder 1 s / reproducir'], ['← / →', 'Un fotograma (Mayús: 1 s)'], ['↑ / ↓', 'Corte anterior / siguiente'], ['S', 'Dividir el clip en el cursor'], ['Supr / Retroceso', 'Eliminar clip (Mayús: cerrando el hueco)'], ['Ctrl+D', 'Duplicar'], ['Ctrl+Z / Ctrl+Mayús+Z / Ctrl+Y', 'Deshacer / rehacer'], ['M', 'Añadir marcador'], ['N', 'Activar o desactivar el imán'], ['+ / −', 'Acercar / alejar la línea de tiempo'], ['Inicio / Fin', 'Ir al principio / al final'], ['Ctrl+S', 'Guardar ahora'], ['?', 'Esta ayuda']];
    var mando = [['A', 'Reproducir / pausa'], ['LB / RB', 'Corte anterior / siguiente'], ['X', 'Dividir'], ['Y', 'Marcador'], ['B', 'Deshacer'], ['Cruceta ← →', 'Un fotograma'], ['Palanca izq.', 'Recorrer la línea de tiempo']];
    var cuerpo = h('div', null,
      h('div', { class: 'panelTit', texto: 'Atajos de teclado' }), h('table', { class: 'atajos' }, at.map(function (r) { return h('tr', null, h('td', null, h('kbd', { texto: r[0] })), h('td', { texto: r[1] })); })),
      h('div', { class: 'panelTit', texto: 'Mando Xbox (opcional)' }), h('table', { class: 'atajos' }, mando.map(function (r) { return h('tr', null, h('td', null, h('kbd', { texto: r[0] })), h('td', { texto: r[1] })); })),
      h('div', { class: 'panelTit', texto: 'Este navegador' }),
      h('table', { class: 'atajos' }, [['WebCodecs (exportar rápido)', f(c.webcodecs)], ['MP4 H.264 + AAC', f(c.codecs.h264 && c.codecs.aac)], ['WebM VP9 + Opus', f(c.codecs.vp9 && c.codecs.opus)], ['WebM AV1 + Opus', f(c.codecs.av1 && c.codecs.opus)], ['Grabación en tiempo real (MediaRecorder)', f(c.mediaRecorder)], ['WebGL (efectos acelerados)', f(c.webgl)], ['Cámara / micrófono', f(c.camara)], ['Grabar pantalla', f(c.pantalla)], ['Reconocimiento de voz', f(c.voz)], ['Memoria aprox.', c.memoria ? c.memoria + ' GB' : 'no informada']].map(function (r) { return h('tr', null, h('td', { texto: r[0] }), h('td', { texto: r[1] })); })),
      h('div', { class: 'panelTit', texto: 'Compatibilidad y límites' }),
      h('p', { class: 'ayuda', html: '<b>MP4 (H.264 + AAC)</b> requiere que el navegador pueda codificar H.264/AAC (Chrome/Edge de escritorio y Android, Safari reciente). Si no, se ofrece <b>WebM (VP9/AV1 + Opus)</b>, que reproducen Chrome, Edge, Firefox y la mayoría de editores. En <b>iOS Safari</b> el soporte de WebCodecs/MediaRecorder es limitado: se usa la grabación en tiempo real. La exportación y la reproducción dependen del equipo: en móviles evita 4K y proyectos de muchos minutos. La estabilización, el reencuadre y los subtítulos automáticos son ayudas simples: revisa el resultado.' }),
      h('p', { class: 'ayuda', html: 'Todo se procesa en tu dispositivo; los proyectos se guardan en el navegador (IndexedDB). Usa <i>Exportar proyecto</i> para llevarte una copia. La música y los efectos se generan por código y están libres de derechos.' }));
    abrir('Ayuda', cuerpo, 640);
  };

  /* ---------- Ajustes ---------- */
  D.ajustes = function () {
    var cfg = A.cfg, cuerpo = h('div');
    var sel = function (rot, k, ops) { return h('label', null, rot, h('br'), h('select', { onchange: function () { var v = this.value; cfg[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; A.guardarCfg(); } }, ops.map(function (o) { return h('option', { value: o[0], selected: String(cfg[k]) === String(o[0]), texto: o[1] }); }))); };
    cuerpo.appendChild(h('div', { class: 'rejilla2' },
      sel('Tema', 'tema', [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']]),
      sel('Calidad de la vista previa (lado largo)', 'previaLado', [[480, '480 px (ligera)'], [720, '720 px'], [960, '960 px'], [1280, '1280 px']]),
      sel('Límite de memoria de medios', 'limiteMB', [[500, '500 MB'], [1000, '1 GB'], [1500, '1,5 GB'], [3000, '3 GB'], [6000, '6 GB']]),
      sel('Efectos de imagen', 'webgl', [[true, 'WebGL si existe'], [false, 'Solo 2D (compatibilidad)']].map(function (x) { return [String(x[0]), x[1]]; }))));
    cuerpo.appendChild(h('p', { class: 'ayuda', texto: 'La vista previa usa fotogramas reducidos (proxy) y fotos a menor resolución mientras editas; al exportar se usa la calidad completa. Los videos se decodifican solo cuando están cerca del cursor.' }));
    cuerpo.appendChild(h('div', { class: 'fila' }, h('button', { class: 'btn', onclick: function () { A.guardarAhora(); A.toast('Proyecto guardado.'); } }, 'Guardar ahora'),
      h('button', { class: 'btn peligro', onclick: async function () { if (confirm('¿Borrar TODOS los proyectos y medios guardados en este navegador?')) { var l = await AL.lista(); for (var i = 0; i < l.length; i++) await A.borrarProyectoDefinitivo(l[i].id); location.reload(); } } }, 'Borrar todos los datos')));
    abrir('Ajustes', cuerpo, 560);
  };
  g.VE.dlg = D;
})(window);
