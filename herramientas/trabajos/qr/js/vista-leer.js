/* Vista Leer: camara y/o imagen subida. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.QRApp, ui = {}, cam = null, ultimoRes = null;
  function parar() { if (cam) { cam.parar(); cam = null; } ui.caja.classList.remove('on'); ui.btnCam.textContent = 'Abrir cámara'; ui.btnCam.setAttribute('aria-pressed', 'false'); ui.cambiar.hidden = true; }
  function mostrar(r) {
    ultimoRes = r; var an = g.QRTipos.analizar(r.texto), res = ui.res; res.textContent = ''; res.hidden = false;
    try { if (g.BroadcastChannel && r.texto) { var bc = new BroadcastChannel('trabajos_qr_leido'); bc.postMessage({ texto: r.texto, origen: 'qr' }); setTimeout(function () { bc.close(); }, 500); } } catch (e) {}
    var dl = h('dl'); an.campos.forEach(function (c) { dl.appendChild(h('dt', { txt: c[0] })); dl.appendChild(h('dd', { txt: c[1] })); });
    res.appendChild(h('h2', { txt: 'Leído: ' + an.etiqueta })); res.appendChild(dl);
    var acc = h('div', { cls: 'tr-acciones' });
    acc.appendChild(h('button', { type: 'button', cls: 'tr-btn', id: 'le-copiar', txt: 'Copiar', on: { click: function () { (navigator.clipboard ? navigator.clipboard.writeText(r.texto) : Promise.reject()).then(function () { A.aviso('Copiado.'); }, function () { A.aviso('No se pudo copiar.', 'error'); }); } } }));
    if (an.accion && an.accion.tipo === 'abrir') acc.appendChild(h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'le-abrir', txt: 'Abrir enlace…', on: { click: function () {
      var u; try { u = new URL(r.texto); } catch (e) { return A.aviso('Enlace no válido.', 'error'); }
      if (g.confirm('Vas a abrir un sitio externo:\n\n' + u.hostname + '\n' + r.texto.slice(0, 200) + '\n\nSolo continúa si confías en el origen del código. ¿Abrir?')) g.open(u.href, '_blank', 'noopener,noreferrer'); } } }));
    else if (an.accion && an.accion.href && an.accion.tipo !== 'abrir') acc.appendChild(h('a', { cls: 'tr-btn', href: an.accion.href, rel: 'noopener noreferrer', target: an.accion.tipo === 'mapa' ? '_blank' : null, txt: an.accion.tipo === 'mapa' ? 'Ver en el mapa' : an.accion.tipo === 'llamar' ? 'Llamar' : 'Escribir correo' }));
    acc.appendChild(h('button', { type: 'button', cls: 'tr-btn', id: 'le-guardar', txt: 'Guardar en historial', on: { click: function () { A.registrar({ tipo: an.tipo === 'url' ? 'url' : 'texto', texto: r.texto, titulo: (an.campos[0] && an.campos[0][1] || r.texto).slice(0, 60), origen: 'lectura' }).then(function () { A.aviso('Guardado en el historial.'); }); } } }));
    acc.appendChild(h('button', { type: 'button', cls: 'tr-btn', id: 'le-usar', txt: 'Crear un QR igual', on: { click: function () { A.usarTexto(r.texto); } } }));
    res.appendChild(acc);
    res.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Leído con: ' + (r.motor === 'propio' ? 'decodificador propio' + (r.corregidos ? ' (corrigió ' + r.corregidos + ' palabras dañadas)' : '') : r.motor) + '. Los datos no salen de tu dispositivo.' }));
    A.logro('lectura'); if (g.CuentaTrabajos) g.CuentaTrabajos.xp(2);
    ui.estado.textContent = 'Código leído.';
  }
  function abrirCam() {
    if (cam) return parar();
    ui.estado.textContent = 'Abriendo la cámara…'; ui.caja.classList.add('on'); ui.btnCam.textContent = 'Detener cámara'; ui.btnCam.setAttribute('aria-pressed', 'true');
    cam = g.QRLector.iniciarCamara(ui.video, function (r) { mostrar(r); }, function (m) { parar(); ui.estado.textContent = m; A.aviso(m, 'error'); });
    if (cam) { ui.estado.textContent = 'Apunta al código y mantén el móvil quieto.'; ui.cambiar.hidden = false; } else parar();
  }
  function archivo(f) {
    if (!f) return; ui.estado.textContent = 'Leyendo la imagen…';
    g.QRLector.leerArchivo(f).then(function (r) { if (r) mostrar(r); else { ui.estado.textContent = 'No se encontró ningún QR legible en la imagen.'; ui.res.hidden = true; A.aviso('No se encontró un QR legible. Prueba con una foto más nítida y de frente.', 'error'); } }, function (e) { ui.estado.textContent = e.message; A.aviso(e.message, 'error'); });
  }
  A.iniciarLeer = function () {
    var raiz = document.getElementById('v-leer');
    ui.video = h('video', { id: 'le-video', playsinline: '', muted: '', 'aria-label': 'Vista de la cámara' }); ui.caja = h('div', { cls: 'qr-camara', id: 'le-caja' }, [ui.video]);
    ui.btnCam = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'le-cam', 'aria-pressed': 'false', txt: 'Abrir cámara', on: { click: abrirCam } });
    ui.cambiar = h('button', { type: 'button', cls: 'tr-btn', id: 'le-cambiar', hidden: true, txt: 'Cambiar cámara', on: { click: function () { if (cam) cam.cambiar(); } } });
    ui.file = h('input', { type: 'file', id: 'le-archivo', accept: 'image/*' }); ui.file.addEventListener('change', function () { archivo(ui.file.files[0]); ui.file.value = ''; });
    ui.estado = h('p', { id: 'le-estado', role: 'status', 'aria-live': 'polite', cls: 'tr-ayuda', txt: g.QRLector.hayCamara() ? '' : 'Este navegador no ofrece cámara en esta página (necesita HTTPS). Sube una foto.' });
    ui.res = h('div', { cls: 'tr-panel qr-res', id: 'le-res', hidden: true });
    ui.soltar = h('div', { cls: 'qr-soltar', tabindex: '-1' }, ['O suelta aquí una imagen, o pégala con Ctrl+V.']);
    ['dragenter', 'dragover'].forEach(function (e) { ui.soltar.addEventListener(e, function (ev) { ev.preventDefault(); ui.soltar.classList.add('sobre'); }); });
    ['dragleave', 'drop'].forEach(function (e) { ui.soltar.addEventListener(e, function (ev) { ev.preventDefault(); ui.soltar.classList.remove('sobre'); }); });
    ui.soltar.addEventListener('drop', function (ev) { archivo(ev.dataTransfer.files[0]); });
    g.addEventListener('paste', function (ev) { if (document.getElementById('v-leer').hidden) return; var it = Array.prototype.filter.call(ev.clipboardData ? ev.clipboardData.items : [], function (x) { return /^image\//.test(x.type); })[0]; if (it) archivo(it.getAsFile()); });
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Leer un código' }), h('div', { cls: 'tr-acciones' }, [ui.btnCam, ui.cambiar]), ui.caja, ui.estado, h('label', { for: 'le-archivo', txt: 'Leer desde una imagen o captura' }), ui.file, ui.soltar,
        h('p', { cls: 'tr-ayuda', txt: 'Motor: ' + g.QRLector.motor + '. ' + (g.QRLector.motor.indexOf('propio') >= 0 ? 'El decodificador propio es básico: lee códigos de frente y con buen contraste (admite giros), pero no corrige perspectiva fuerte ni reflejos; si falla, acércate o sube una foto más nítida.' : 'Si el detector del navegador falla, se prueba además el decodificador propio.') })]),
      ui.res]));
    document.addEventListener('visibilitychange', function () { if (document.hidden && cam) parar(); });
  };
  A.pararCamara = parar;
})(window);
