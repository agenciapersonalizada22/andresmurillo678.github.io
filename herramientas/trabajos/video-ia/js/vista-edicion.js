/* Vista «Edicion»: analisis del archivo, cortes automaticos, lista de cortes (EDL/JSON/CSV/SRT) y clips. window.VEdicionUI */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, A = g.VAnalisis, E = g.VEdicion, U = g.VEdicionUI = {}, el = {}, cortes = V.cortes = [], previo = null;
  function f() { return V.fuente && V.fuente.esArchivo ? V.fuente : null; }
  function pintarEstado() {
    var fu = f(); el.estado.textContent = fu ? 'Archivo: ' + fu.nombre + ' · ' + V.fmt(fu.video.duration || 0) + (V.analisisArchivo && V.analisisArchivo.nombre === fu.nombre ? ' · analizado (' + V.analisisArchivo.muestras.length + ' muestras' + (V.analisisArchivo.audio ? ', con audio' : ', sin audio analizable') + ')' : ' · sin analizar') : 'No hay un archivo de video abierto. Ábrelo aquí o en «En vivo».';
    [el.btnAn, el.btnGen, el.btnAdd, el.btnExp, el.btnExpC].forEach(function (b) { if (b) b.disabled = !fu; }); el.btnGen.disabled = !fu || !V.analisisArchivo; el.btnExp.disabled = el.btnExpC.disabled = !fu || !cortes.length; [el.btnEdl, el.btnJson, el.btnCsv, el.btnSrt].forEach(function (b) { b.disabled = !cortes.length; });
  }
  function activos() { return cortes.filter(function (c) { return c.keep !== false && c.fin > c.ini; }).sort(function (a, b) { return a.ini - b.ini; }); }
  function pintarCortes() {
    var l = el.lista; l.textContent = ''; var tot = activos().reduce(function (s, c) { return s + c.fin - c.ini; }, 0);
    el.total.textContent = cortes.length ? activos().length + ' de ' + cortes.length + ' cortes · duración total ' + V.fmt(tot) + (V.fuente ? ' (original ' + V.fmt(V.fuente.video.duration || 0) + ')' : '') : 'Sin cortes. Analiza el archivo y pulsa «Generar cortes».';
    cortes.forEach(function (c, i) {
      var k = h('input', { type: 'checkbox', 'aria-label': 'Conservar corte ' + (i + 1) }); k.checked = c.keep !== false; k.addEventListener('change', function () { c.keep = k.checked; pintarEstado(); pintarCortes(); });
      function num(campo) { var n = h('input', { type: 'number', step: 0.1, min: 0, value: c[campo].toFixed(1), 'aria-label': (campo === 'ini' ? 'Inicio' : 'Fin') + ' del corte ' + (i + 1) }); n.addEventListener('change', function () { c[campo] = Math.max(0, +n.value || 0); pintarCortes(); }); return n; }
      l.appendChild(h('li', { cls: 'vi-corte' + (c.keep === false ? ' off' : '') }, [k, h('span', { cls: 'vi-c-n', txt: String(i + 1) }), num('ini'), h('span', { txt: '→' }), num('fin'), h('span', { cls: 'vi-c-m', txt: (c.motivo || '') + (c.puntaje != null ? ' · ' + c.puntaje : '') }),
        h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: '▶', 'aria-label': 'Ver corte ' + (i + 1), on: { click: function () { var v = V.fuente.video; v.currentTime = c.ini; v.play(); var s = function () { if (v.currentTime >= c.fin) { v.pause(); v.removeEventListener('timeupdate', s); } }; v.addEventListener('timeupdate', s); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: '✕', 'aria-label': 'Quitar corte ' + (i + 1), on: { click: function () { cortes.splice(i, 1); pintarCortes(); pintarEstado(); } } })]));
    });
  }
  function generar() {
    var an = V.analisisArchivo; if (!an) return; var modo = el.modo.value, o = { modo: modo, umbral: +el.umbral.value / 100, minDur: +el.minDur.value, pad: +el.pad.value, fusion: +el.fusion.value, largo: +el.largo.value, total: +el.totalObj.value, silencios: an.silencios };
    if (modo === 'silencio' && !an.audio) { T.aviso('El video no tiene audio analizable: no se pueden buscar silencios.', 'error'); return; }
    var r = A.autoCortes(an.muestras, an.dur, o); cortes.length = 0; r.forEach(function (c) { cortes.push(c); }); pintarCortes(); pintarEstado(); T.aviso(r.length + ' cortes generados.');
  }
  function paramsVisibles() { var m = el.modo.value; el.pMov.hidden = m !== 'movimiento'; el.pMej.hidden = m !== 'mejores'; }
  function descargarTxt(txt, nombre, tipo) { T.descargar(new Blob([txt], { type: tipo || 'text/plain' }), nombre); }
  function base() { return T.nombreArchivo((V.fuente && V.fuente.nombre || 'video').replace(/\.[^.]+$/, '')); }
  async function exportar(montaje) {
    var cs = activos(); if (!cs.length) { T.aviso('No hay cortes marcados.', 'error'); return; } el.prog.hidden = false; el.btnCancel.hidden = false; el.btnExp.disabled = el.btnExpC.disabled = true; el.preview.hidden = false;
    var tot = cs.reduce(function (s, c) { return s + c.fin - c.ini; }, 0); el.progTxt.textContent = 'Exportando en tiempo real (~' + V.fmt(tot) + ')…';
    try {
      var r = await E.exportar(cs, { vertical: el.formato.value === 'vertical', estabilizar: el.estab.checked, salidaAncho: +el.res.value, montaje: montaje }, el.preview, function (p, t) { el.barra.style.width = Math.round(p * 100) + '%'; el.progTxt.textContent = t; });
      if (!r.length) { el.progTxt.textContent = 'Exportación cancelada.'; }
      else { el.progTxt.textContent = 'Listo: ' + r.length + ' archivo(s).'; r.forEach(function (x) { var ext = /mp4/.test(x.blob.type) ? 'mp4' : 'webm', nombre = base() + '_' + x.nombre + (el.formato.value === 'vertical' ? '_9x16' : '') + '.' + ext, c = { id: T.uid(), blob: x.blob, url: URL.createObjectURL(x.blob), nombre: nombre, t: Date.now(), dur: x.dur, preroll: 0, motivo: 'edición' }; V.clips.push(c); V.ordenarCapturas(); V.emitir('clips', c); salida(c); }); }
    } catch (e) { el.progTxt.textContent = e.message; T.aviso(e.message, 'error'); }
    el.btnCancel.hidden = true; pintarEstado();
  }
  function salida(c) { el.salidas.appendChild(h('div', { cls: 'vi-clip' }, [h('video', { src: c.url, controls: true, preload: 'metadata', 'aria-label': c.nombre }), h('div', {}, [h('b', { txt: c.nombre }), h('span', { cls: 'tr-ayuda', txt: Math.round(c.dur) + ' s · ' + (c.blob.size / 1048576).toFixed(1) + ' MB' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico tr-pri', txt: 'Descargar', on: { click: function () { T.descargar(c.blob, c.nombre); } } })])])])); }

  U.iniciar = function (cont) {
    el.estado = h('p', { cls: 'tr-ayuda', role: 'status' });
    var arch = h('input', { type: 'file', accept: 'video/*', hidden: true }); arch.addEventListener('change', function () { if (arch.files[0]) g.VVivo.abrirArchivo(arch.files[0]); arch.value = ''; });
    el.barraA = h('div', { cls: 'qr-barra-prog', hidden: true }, [h('i', {})]); el.txtA = h('p', { cls: 'tr-ayuda', role: 'status' });
    el.btnAn = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Analizar video completo', on: { click: async function () { el.btnAn.disabled = true; el.barraA.hidden = false; el.cancelA.hidden = false; try { var r = await E.analizar(function (p, t) { el.barraA.firstChild.style.width = Math.round(p * 100) + '%'; el.txtA.textContent = t; }); el.txtA.textContent = r ? 'Análisis listo: ' + r.muestras.length + ' muestras, ' + V.cuenta('escena') + ' cortes de escena detectados.' : 'Análisis cancelado.'; } catch (e) { el.txtA.textContent = e.message; T.aviso(e.message, 'error'); } el.barraA.hidden = true; el.cancelA.hidden = true; pintarEstado(); } } });
    el.cancelA = h('button', { type: 'button', cls: 'tr-btn', txt: 'Cancelar', hidden: true, on: { click: function () { E.cancelar = true; } } });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Material' }), el.estado, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Abrir archivo de video', on: { click: function () { arch.click(); } } }), el.btnAn, el.cancelA, arch]), el.barraA, el.txtA,
      h('p', { cls: 'tr-ayuda', txt: 'El análisis recorre el video por saltos (más de 0,25 s entre muestras; hasta unas 900 muestras) y calcula movimiento, cambios de escena, nitidez, brillo y volumen del audio. Todo ocurre en tu navegador.' })]));
    el.modo = h('select', { id: 'ed-modo' }, [['movimiento', 'Solo donde hay movimiento'], ['silencio', 'Quitar silencios'], ['escena', 'Dividir por cambios de escena'], ['mejores', 'Mejores momentos']].map(function (m) { return h('option', { value: m[0], txt: m[1] }); })); el.modo.addEventListener('change', paramsVisibles);
    function n(id, etq, v, min, max, st) { var i = h('input', { type: 'number', id: 'ed-' + id, value: v, min: min, max: max, step: st }); el['_' + id] = i; return h('div', {}, [h('label', { for: 'ed-' + id, txt: etq }), i]); }
    var u = n('um', 'Movimiento mínimo (% del cuadro entre muestras)', 1, 0.1, 50, 0.1), md = n('md', 'Duración mínima del corte (s)', 1, 0.2, 60, 0.1), pd = n('pd', 'Margen alrededor (s)', 0.5, 0, 5, 0.1), fu = n('fu', 'Unir huecos menores de (s)', 1.5, 0, 10, 0.1), lg = n('lg', 'Largo de cada momento (s)', 4, 1, 30, 0.5), to = n('to', 'Duración total objetivo (s)', 20, 2, 300, 1);
    el.umbral = el._um; el.minDur = el._md; el.pad = el._pd; el.fusion = el._fu; el.largo = el._lg; el.totalObj = el._to; el.pMov = h('div', { cls: 'tr-fila' }, [u, pd, fu]); el.pMej = h('div', { cls: 'tr-fila' }, [lg, to]);
    el.btnGen = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Generar cortes', on: { click: generar } }); el.btnAdd = h('button', { type: 'button', cls: 'tr-btn', txt: 'Añadir corte en la posición actual', on: { click: function () { var v = V.fuente.video, t = v.currentTime; cortes.push({ ini: t, fin: Math.min(v.duration, t + 5), motivo: 'manual' }); pintarCortes(); pintarEstado(); } } });
    el.total = h('p', { cls: 'tr-ayuda', role: 'status' }); el.lista = h('ol', { cls: 'vi-cortes' });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Cortes automáticos' }), h('label', { for: 'ed-modo', txt: 'Criterio' }), el.modo, el.pMov, el.pMej, h('div', { cls: 'tr-fila' }, [md]), h('div', { cls: 'tr-acciones' }, [el.btnGen, el.btnAdd, h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Vaciar lista', on: { click: function () { cortes.length = 0; pintarCortes(); pintarEstado(); } } })]), el.total, el.lista]));
    el.btnEdl = h('button', { type: 'button', cls: 'tr-btn', txt: 'EDL', on: { click: function () { descargarTxt(A.edl(activos(), { titulo: base(), clip: V.fuente && V.fuente.nombre, fps: 25 }), base() + '.edl'); } } });
    el.btnJson = h('button', { type: 'button', cls: 'tr-btn', txt: 'JSON', on: { click: function () { descargarTxt(JSON.stringify({ video: V.fuente && V.fuente.nombre, duracion: V.fuente && V.fuente.video.duration, generado: new Date().toISOString(), cortes: activos().map(function (c) { return { ini: c.ini, fin: c.fin, motivo: c.motivo, puntaje: c.puntaje }; }) }, null, 2), base() + '_cortes.json', 'application/json'); } } });
    el.btnCsv = h('button', { type: 'button', cls: 'tr-btn', txt: 'CSV', on: { click: function () { descargarTxt(A.csv(activos()), base() + '_cortes.csv', 'text/csv'); } } });
    el.btnSrt = h('button', { type: 'button', cls: 'tr-btn', txt: 'SRT', on: { click: function () { var rec = 0, it = activos().map(function (c, i) { var o = { ini: c.ini, fin: c.fin, texto: (i + 1) + '. ' + (c.motivo || 'corte') }; return o; }); descargarTxt(A.srt(it), base() + '_cortes.srt'); } } });
    el.formato = h('select', { id: 'ed-fmt' }, [h('option', { value: 'original', txt: 'Formato original' }), h('option', { value: 'vertical', txt: 'Vertical 9:16 siguiendo el movimiento' })]); el.res = h('select', { id: 'ed-res' }, [h('option', { value: 540, txt: 'Normal (540×960 / 960 de ancho)' }), h('option', { value: 720, txt: 'Alta (720×1280 / 1280 de ancho)' })]); el.estab = h('input', { type: 'checkbox', id: 'ed-est' });
    el.btnExp = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Exportar montaje (un video)', on: { click: function () { exportar(true); } } }); el.btnExpC = h('button', { type: 'button', cls: 'tr-btn', txt: 'Exportar cada corte', on: { click: function () { exportar(false); } } });
    el.btnCancel = h('button', { type: 'button', cls: 'tr-btn', txt: 'Cancelar', hidden: true, on: { click: function () { E.cancelar = true; } } }); el.barra = h('i', {}); el.progTxt = h('p', { cls: 'tr-ayuda', role: 'status' }); el.prog = h('div', { hidden: true }, [h('div', { cls: 'qr-barra-prog' }, [el.barra]), el.progTxt]);
    el.preview = h('canvas', { cls: 'vi-previo', hidden: true, 'aria-label': 'Vista previa de la exportación' }); el.salidas = h('div', {});
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Exportar' }), h('p', { cls: 'tr-ayuda', txt: 'Listas de cortes (solo los marcados):' }), h('div', { cls: 'tr-acciones' }, [el.btnEdl, el.btnJson, el.btnCsv, el.btnSrt]),
      h('h3', { txt: 'Clips de video' }), h('label', { for: 'ed-fmt', txt: 'Formato' }), el.formato, h('label', { for: 'ed-res', txt: 'Calidad' }), el.res, h('label', { cls: 'tr-chk', for: 'ed-est' }, [el.estab, 'Estabilizar (compensa temblores y recorta ~8 %)']),
      h('div', { cls: 'tr-acciones' }, [el.btnExp, el.btnExpC, el.btnCancel]), el.prog, el.preview, el.salidas,
      h('p', { cls: 'tr-ayuda', txt: 'Límites: la exportación se hace reproduciendo el video en tiempo real (un clip de 1 min tarda 1 min) y mantiene la pestaña visible; el formato lo decide el navegador (WebM o MP4); la estabilización compensa traslaciones, no rotación ni perspectiva; el encuadre 9:16 sigue el movimiento global, no distingue personas.' })]));
    V.on('fuente', function () { pintarEstado(); }); V.on('analizado', pintarEstado); V.on('capitulos', function (caps) { var dur = V.fuente && V.fuente.video.duration || 0; caps.forEach(function (c, i) { cortes.push({ ini: c.t, fin: caps[i + 1] ? caps[i + 1].t : dur || c.t + 5, motivo: c.titulo }); }); pintarCortes(); pintarEstado(); });
    paramsVisibles(); pintarEstado(); pintarCortes();
  };
})(window);
