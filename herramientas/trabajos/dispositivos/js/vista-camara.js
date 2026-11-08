/* Pestana Camaras: enumeracion, vista previa, resolucion/FPS, linterna y zoom, captura, grabacion de prueba y microfono con nivel. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, U = g.DispUI, P = g.DispPuro, TD = g.TrabajosDispositivos, h = T.h;
  var RES = [['', 'Cualquiera'], ['640x480', '640 × 480'], ['1280x720', '1280 × 720 (HD)'], ['1920x1080', '1920 × 1080 (Full HD)'], ['3840x2160', '3840 × 2160 (4K)']];
  async function llenar(sel, tipo, previo) {
    var l = []; try { l = await TD.driver(tipo).listar(); } catch (e) {}
    sel.textContent = ''; sel.appendChild(h('option', { value: '', txt: l.length ? 'Predeterminado' : '(ninguno detectado)' }));
    l.forEach(function (d, i) { sel.appendChild(h('option', { value: d.deviceId, txt: d.label || ((tipo === 'camara' ? 'Cámara ' : 'Micrófono ') + (i + 1)) })); }); if (previo) sel.value = previo; return l.length;
  }
  function salida(blob, nombre, tipo, caja) {
    var url = URL.createObjectURL(blob), el;
    if (tipo === 'img') el = h('img', { src: url, alt: 'Captura de prueba', cls: 'dp-thumb' }); else if (tipo === 'vid') el = h('video', { src: url, controls: true, playsinline: true, cls: 'dp-thumb' }); else el = h('audio', { src: url, controls: true });
    caja.insertBefore(h('figure', { cls: 'dp-fig' }, [el, h('figcaption', {}, [nombre + ' · ' + P.formatoBytes(blob.size) + ' ', h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Descargar', on: { click: function () { T.descargar(blob, nombre); } } })])]), caja.firstChild);
    while (caja.children.length > 6) { var u = caja.lastChild.querySelector('[src]'); if (u) URL.revokeObjectURL(u.src); caja.removeChild(caja.lastChild); }
  }
  A.iniciarCamaras = function () {
    var raiz = document.getElementById('v-camaras');
    /* ---- camara ---- */
    var dev = h('select'), res = U.select(RES, ''), fps = U.select([['', 'Cualquiera'], ['15', '15'], ['30', '30'], ['60', '60']], ''), cara = U.select([['', 'Cualquiera'], ['user', 'Frontal'], ['environment', 'Trasera']], ''), aud = h('input', { type: 'checkbox' });
    var vista = h('div', { cls: 'dp-video', 'aria-label': 'Vista previa de la cámara' }), info = h('dl', { cls: 'dp-info' }), extras = h('div', {}), salidas = h('div', { cls: 'dp-salidas' });
    var bCap = h('button', { type: 'button', cls: 'tr-btn', txt: 'Capturar foto', disabled: true }), bRec = h('button', { type: 'button', cls: 'tr-btn', txt: 'Grabar prueba', disabled: true, 'aria-pressed': 'false' }), nrec = 0, tRec = 0;
    A.params.camara = {
      leer: function () { var r = res.value.split('x'); return { ancho: +r[0] || null, alto: +r[1] || null, fps: +fps.value || null, facing: cara.value, audio: aud.checked }; },
      aplicar: function (p) { res.value = p.ancho ? p.ancho + 'x' + p.alto : ''; fps.value = p.fps ? String(p.fps) : ''; cara.value = p.facing || ''; aud.checked = !!p.audio; }
    };
    function fila(k, v) { return [h('dt', { txt: k }), h('dd', { txt: v })]; }
    async function pintarInfo(c) {
      var a = c.h.ajustes(), s = a.settings || {}, cap = a.capacidades || {}, ex = [];
      info.textContent = ''; var f = c.h.medirFps(1000), filas = fila('Dispositivo', c.nombre).concat(fila('Resolución', (s.width || '?') + ' × ' + (s.height || '?')), fila('FPS pedidos', s.frameRate ? Math.round(s.frameRate) + '' : '—'));
      filas.forEach(function (e) { info.appendChild(e); });
      var dd = h('dd', { txt: 'midiendo…' }); info.appendChild(h('dt', { txt: 'FPS reales' })); info.appendChild(dd); f.then(function (v) { dd.textContent = v + ' fps'; });
      if (cap.width && cap.width.max) { info.appendChild(h('dt', { txt: 'Máximo' })); info.appendChild(h('dd', { txt: cap.width.max + ' × ' + (cap.height && cap.height.max) })); }
      extras.textContent = '';
      if (cap.torch) { var t = h('input', { type: 'checkbox' }); t.addEventListener('change', function () { c.h.linterna(t.checked).catch(function (e) { T.aviso(e.message, 'error'); t.checked = false; }); }); extras.appendChild(h('label', { cls: 'tr-chk' }, [t, 'Linterna'])); }
      if (cap.zoom) { var z = h('input', { type: 'range', min: cap.zoom.min, max: cap.zoom.max, step: cap.zoom.step || 0.1, value: s.zoom || cap.zoom.min, 'aria-label': 'Zoom' }); z.addEventListener('input', function () { c.h.zoom(z.value).catch(function () {}); }); extras.appendChild(U.campo('Zoom ×' + cap.zoom.min + ' – ' + cap.zoom.max, z)); }
      if (!cap.torch && !cap.zoom) extras.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Esta cámara no expone linterna ni zoom por el navegador (normal en webcams de PC; en móviles Android con Chrome suelen estar en la cámara trasera).' }));
    }
    var ctl = U.control({
      tipo: 'camara', etiqueta: 'Abrir cámara',
      abrir: function () { var p = A.params.camara.leer(); p.deviceId = dev.value; return TD.conectar('camara', p); },
      alConectar: function (c) {
        vista.textContent = ''; vista.appendChild(c.video); bCap.disabled = bRec.disabled = false; pintarInfo(c); llenar(dev, 'camara', c.pista.getSettings().deviceId);
        c.escuchar(function () {}, 'datos');
      },
      alCerrar: function () { vista.textContent = ''; info.textContent = ''; extras.textContent = ''; bCap.disabled = bRec.disabled = true; clearInterval(tRec); bRec.textContent = 'Grabar prueba'; bRec.setAttribute('aria-pressed', 'false'); }
    });
    bCap.addEventListener('click', function () { var c = ctl.actual(); if (c) c.h.capturar('image/png').then(function (b) { salida(b, U.fechado('captura', 'png'), 'img', salidas); }, function (e) { T.aviso(e.message, 'error'); }); });
    bRec.addEventListener('click', function () {
      var c = ctl.actual(); if (!c) return;
      if (!c.h.grabando()) {
        try { c.h.grabar(); } catch (e) { return ctl.error(e); } nrec = Date.now(); bRec.textContent = 'Detener (0 s)'; bRec.setAttribute('aria-pressed', 'true');
        tRec = setInterval(function () { bRec.textContent = 'Detener (' + Math.round((Date.now() - nrec) / 1000) + ' s)'; }, 500);
      } else { clearInterval(tRec); bRec.textContent = 'Grabar prueba'; bRec.setAttribute('aria-pressed', 'false'); c.h.parar().then(function (b) { salida(b, U.fechado('grabacion', /mp4/.test(b.type) ? 'mp4' : 'webm'), 'vid', salidas); }, function (e) { T.aviso(e.message, 'error'); }); }
    });
    var bRef = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Actualizar lista', on: { click: function () { Promise.all([llenar(dev, 'camara', dev.value), llenar(mic, 'microfono', mic.value)]).then(function (n) { T.aviso(n[0] + ' cámara(s) y ' + n[1] + ' micrófono(s).'); }); } } });
    /* ---- microfono ---- */
    var mic = h('select'), nivel = h('div', { cls: 'dp-nivel', role: 'meter', 'aria-label': 'Nivel del micrófono', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, [h('i')]), salMic = h('div', { cls: 'dp-salidas' }), bRecM = h('button', { type: 'button', cls: 'tr-btn', txt: 'Grabar audio', disabled: true }), raf = 0;
    var ctlM = U.control({
      tipo: 'microfono', etiqueta: 'Abrir micrófono',
      abrir: function () { return TD.conectar('microfono', { deviceId: mic.value }); },
      alConectar: function (c) {
        bRecM.disabled = false; llenar(mic, 'microfono', c.pista.getSettings().deviceId);
        (function lazo() { var a = ctlM.actual(); if (!a) return; var n = a.h.nivel(); nivel.firstChild.style.width = Math.round(n * 100) + '%'; nivel.setAttribute('aria-valuenow', Math.round(n * 100)); raf = requestAnimationFrame(lazo); })();
      },
      alCerrar: function () { cancelAnimationFrame(raf); nivel.firstChild.style.width = '0'; bRecM.disabled = true; bRecM.textContent = 'Grabar audio'; }
    });
    bRecM.addEventListener('click', function () {
      var c = ctlM.actual(); if (!c) return;
      if (!c.h.grabando()) { try { c.h.grabar(); bRecM.textContent = 'Detener'; } catch (e) { ctlM.error(e); } }
      else { bRecM.textContent = 'Grabar audio'; c.h.parar().then(function (b) { salida(b, U.fechado('audio', 'webm'), 'aud', salMic); }, function (e) { T.aviso(e.message, 'error'); }); }
    });
    llenar(dev, 'camara'); llenar(mic, 'microfono');
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      U.panel('Cámara', [
        h('div', { cls: 'tr-fila' }, [U.campo('Cámara', dev), U.campo('Resolución', res), U.campo('FPS', fps), U.campo('Orientación', cara)]),
        h('label', { cls: 'tr-chk' }, [aud, 'Incluir audio al grabar']), h('div', { cls: 'tr-acciones' }, [bRef]), ctl.el, vista, h('div', { cls: 'tr-acciones' }, [bCap, bRec]), info, extras, salidas, U.barraPerfil('camara')]),
      U.panel('Micrófono', [U.campo('Micrófono', mic), ctlM.el, nivel, h('div', { cls: 'tr-acciones' }, [bRecM]), salMic,
        h('p', { cls: 'tr-ayuda', txt: 'Las capturas y grabaciones se quedan en tu dispositivo: no se suben a ningún sitio. Si no ves los nombres de los dispositivos, abre uno primero: el navegador los oculta hasta que das permiso.' })])]));
  };
})(window);
