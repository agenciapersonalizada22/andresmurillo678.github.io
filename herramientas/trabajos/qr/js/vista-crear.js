/* Vista Crear: tipo de contenido, personalizacion, vista previa y exportacion. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.QRApp, R = g.QRRender, Tp = g.QRTipos, raiz = null, ui = {}, ultimo = null, tDeb = 0, token = 0;

  function reducirLogo(archivo) {   // -> Promise<dataURL PNG <= 256px>
    return new Promise(function (ok, ko) {
      if (!archivo || !/^image\//.test(archivo.type)) return ko(new Error('El logo debe ser una imagen (PNG, JPG, SVG, WebP).'));
      if (archivo.size > 6e6) return ko(new Error('El logo pesa demasiado (máx. 6 MB).'));
      var u = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(u); var w = img.naturalWidth || 256, hh = img.naturalHeight || 256, e = Math.min(1, 256 / Math.max(w, hh)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * e)); c.height = Math.max(1, Math.round(hh * e));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/png'));
      };
      img.onerror = function () { URL.revokeObjectURL(u); ko(new Error('No se pudo leer el logo.')); }; img.src = u;
    });
  }
  function selectOpc(id, etq, ops, val, fn) {
    var s = h('select', { id: id }); ops.forEach(function (o) { s.appendChild(h('option', { value: o[0], txt: o[1] })); }); s.value = val; s.addEventListener('change', function () { fn(s.value); });
    return h('div', {}, [h('label', { for: id, txt: etq }), s]);
  }
  function formulario() {
    var E = A.est, t = Tp.tipo(E.tipo), cont = ui.campos; cont.textContent = '';
    t.campos.forEach(function (c) {
      var f = A.cuadroCampo(c, E.valores[c.id], function (id, v) { E.valores[id] = v; refrescar(); }, 'cr');
      cont.appendChild(f.raiz);
    });
  }
  function ponerEstilo(k, v) { A.est.estilo[k] = v; A.guardarAjustes(); refrescar(); }

  function construir() {
    var E = A.est, S = E.estilo;
    ui.tipo = selectOpc('cr-tipo', 'Tipo de contenido', Tp.TIPOS.map(function (t) { return [t.id, t.nombre]; }), E.tipo, function (v) { E.tipo = v; E.valores = {}; formulario(); refrescar(); });
    ui.campos = h('div', { id: 'cr-campos' });
    ui.ecc = selectOpc('cr-ecc', 'Corrección de errores', [['L', 'L · ~7 % (más pequeño)'], ['M', 'M · ~15 % (recomendado)'], ['Q', 'Q · ~25 %'], ['H', 'H · ~30 % (admite logo)']], E.ecc, function (v) { E.ecc = v; A.guardarAjustes(); refrescar(); });
    ui.modo = selectOpc('cr-modo', 'Modo de codificación', [['auto', 'Automático (el más compacto)'], ['numerico', 'Numérico'], ['alfanumerico', 'Alfanumérico (A-Z 0-9 espacio $%*+-./:)'], ['byte', 'Byte (UTF-8)']], E.modo, function (v) { E.modo = v; refrescar(); });
    // personalizacion
    var fg = h('input', { type: 'color', id: 'cr-fg', value: S.fg, 'aria-label': 'Color del código' }), bg = h('input', { type: 'color', id: 'cr-bg', value: S.bg, 'aria-label': 'Color de fondo' });
    fg.addEventListener('input', function () { ponerEstilo('fg', fg.value); }); bg.addEventListener('input', function () { ponerEstilo('bg', bg.value); });
    var tr = h('input', { type: 'checkbox', id: 'cr-transp' }); tr.checked = !!S.transparente; tr.addEventListener('change', function () { ponerEstilo('transparente', tr.checked); });
    var mg = h('input', { type: 'number', id: 'cr-margen', min: 0, max: 12, step: 1, value: S.margen, inputmode: 'numeric' }); mg.addEventListener('input', function () { ponerEstilo('margen', Math.max(0, Math.min(12, parseInt(mg.value, 10) || 0))); });
    var est = selectOpc('cr-estilo', 'Forma de los módulos', [['cuadrado', 'Cuadrados (máxima compatibilidad)'], ['redondeado', 'Redondeados'], ['puntos', 'Puntos']], S.estilo, function (v) { ponerEstilo('estilo', v); });
    var red = h('input', { type: 'range', id: 'cr-redondeo', min: 0.1, max: 0.5, step: 0.05, value: S.redondeo, 'aria-label': 'Redondeo de los módulos' }); red.addEventListener('input', function () { ponerEstilo('redondeo', +red.value); });
    var logoIn = h('input', { type: 'file', id: 'cr-logo', accept: 'image/*' });
    logoIn.addEventListener('change', function () {
      if (!logoIn.files[0]) return;
      reducirLogo(logoIn.files[0]).then(function (u) { S.logo = u; if (E.ecc !== 'H') { E.ecc = 'H'; ui.ecc.querySelector('select').value = 'H'; A.aviso('Se subió la corrección a H para admitir el logo.'); } refrescar(); }, function (e) { A.aviso(e.message, 'error'); logoIn.value = ''; });
    });
    var logoTam = h('input', { type: 'range', id: 'cr-logotam', min: 0.08, max: 0.4, step: 0.01, value: S.logoTam, 'aria-label': 'Tamaño del logo' }); logoTam.addEventListener('input', function () { S.logoTam = +logoTam.value; refrescar(); });
    var quitar = h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'cr-logo-quitar', txt: 'Quitar logo', on: { click: function () { S.logo = null; logoIn.value = ''; refrescar(); } } });
    ui.logoTam = logoTam; ui.quitar = quitar;
    var selEst = h('select', { id: 'cr-estilos', 'aria-label': 'Estilos guardados' }); ui.selEst = selEst;
    var estilosBloque = h('div', { cls: 'tr-fila' }, [selEst,
      h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'cr-est-aplicar', txt: 'Aplicar', on: { click: aplicarEstilo } }),
      h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'cr-est-guardar', txt: 'Guardar estilo actual', on: { click: guardarEstilo } })]);
    var personal = h('details', { cls: 'qr-det', id: 'cr-personal' }, [h('summary', { txt: 'Personalizar (colores, forma, logo)' }),
      h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'cr-fg', txt: 'Color del código' }), fg]), h('div', {}, [h('label', { for: 'cr-bg', txt: 'Fondo' }), bg]), h('div', {}, [h('label', { for: 'cr-margen', txt: 'Margen (módulos)' }), mg])]),
      h('label', { cls: 'tr-chk', for: 'cr-transp' }, [tr, 'Fondo transparente (PNG/SVG)']),
      est, h('div', {}, [h('label', { for: 'cr-redondeo', txt: 'Redondeo' }), red]),
      h('div', {}, [h('label', { for: 'cr-logo', txt: 'Logo central (opcional)' }), logoIn, h('label', { for: 'cr-logotam', txt: 'Tamaño del logo' }), logoTam, quitar, h('p', { cls: 'tr-ayuda', id: 'cr-logo-ayuda' })]),
      h('div', { cls: 'tr-etq', txt: 'Estilos guardados (se sincronizan con tu cuenta)' }), estilosBloque]);
    ui.fg = fg; ui.bg = bg; ui.tr = tr; ui.mg = mg; ui.est = est.querySelector('select'); ui.red = red;
    var avanzado = h('details', { cls: 'qr-det' }, [h('summary', { txt: 'Avanzado: corrección y modo' }), ui.ecc, ui.modo, h('p', { cls: 'tr-ayuda', txt: 'Más corrección = más módulos. Si el contenido cabe, se sube automáticamente al nivel siguiente sin aumentar el tamaño.' })]);
    var izq = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Contenido' }), ui.tipo, ui.campos, avanzado, personal]);
    // derecha
    ui.vista = h('div', { cls: 'qr-vista', id: 'cr-vista' });
    ui.info = h('div', { cls: 'qr-info', id: 'cr-info' }); ui.notas = h('div', { id: 'cr-notas', role: 'status', 'aria-live': 'polite' });
    var tam = selectOpc('cr-px', 'Tamaño del PNG', [['512', '512 px'], ['1024', '1024 px'], ['2048', '2048 px'], ['4096', '4096 px']], '1024', function () {}); ui.px = tam.querySelector('select');
    ui.btns = {
      png: h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'cr-png', txt: 'Descargar PNG', on: { click: descargarPNG } }),
      svg: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-svg', txt: 'Descargar SVG', on: { click: descargarSVG } }),
      copiar: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-copiar', txt: 'Copiar contenido', on: { click: copiarTexto } }),
      copiarImg: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-copiar-img', txt: 'Copiar imagen', on: { click: copiarImagen } }),
      fav: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-fav', 'aria-pressed': 'false', txt: '☆ Guardar en favoritos', on: { click: favorito } }),
      hist: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-guardar', txt: 'Guardar en historial', on: { click: function () { A.registrar().then(function () { A.aviso('Guardado en el historial.'); A.logro('primer_qr'); }); } } }),
      imp: h('button', { type: 'button', cls: 'tr-btn', id: 'cr-imprimir', txt: 'Hoja de etiquetas…', on: { click: function () { if (!ultimo) return; A.est.fuenteImpresion = 'actual'; A.ir('imprimir'); } } })
    };
    var der = h('div', { cls: 'tr-panel tr-pega' }, [h('h2', { txt: 'Vista previa' }), ui.vista, ui.info, ui.notas, tam, h('div', { cls: 'tr-acciones' }, [ui.btns.png, ui.btns.svg, ui.btns.copiar, ui.btns.copiarImg, ui.btns.fav, ui.btns.hist, ui.btns.imp])]);
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [izq, der]));
    formulario(); refrescarEstilos();
  }
  function refrescarEstilos() {
    g.QRDatos.estilos().then(function (l) { ui.selEst.textContent = ''; ui.selEst.appendChild(h('option', { value: '', txt: l.length ? 'Elige un estilo…' : 'Sin estilos guardados' })); l.forEach(function (e) { ui.selEst.appendChild(h('option', { value: e.id, txt: e.nombre })); }); });
  }
  function guardarEstilo() {
    var n = (g.prompt && g.prompt('Nombre del estilo (sin el logo, que no se sincroniza):', 'Mi estilo')) || ''; n = n.trim().slice(0, 40); if (!n) return;
    var s = Object.assign({}, A.est.estilo, { logo: null }); g.QRDatos.guardarEstilo(n, s).then(function () { A.aviso('Estilo guardado.'); refrescarEstilos(); });
  }
  function aplicarEstilo() {
    var id = ui.selEst.value; if (!id) return;
    g.QRDatos.estilos().then(function (l) { var e = l.filter(function (x) { return x.id === id; })[0]; if (!e) return; var logo = A.est.estilo.logo; A.est.estilo = Object.assign({}, A.ESTILO_DEF, e.estilo, { logo: logo }); sincronizarControles(); A.guardarAjustes(); refrescar(); });
  }
  function sincronizarControles() {
    var S = A.est.estilo; ui.fg.value = S.fg; ui.bg.value = S.bg; ui.tr.checked = !!S.transparente; ui.mg.value = S.margen; ui.est.value = S.estilo; ui.red.value = S.redondeo; ui.logoTam.value = S.logoTam;
    ui.ecc.querySelector('select').value = A.est.ecc; ui.modo.querySelector('select').value = A.est.modo; ui.tipo.querySelector('select').value = A.est.tipo;
  }

  function nota(txt, cls) { return h('div', { cls: 'tr-nota ' + (cls || '') , txt: txt }); }
  function refrescar() { clearTimeout(tDeb); tDeb = setTimeout(pintar, 90); }
  function pintar() {
    var E = A.est, S = E.estilo, act = A.actual(), notas = ui.notas; notas.textContent = ''; ui.info.textContent = '';
    ui.quitar.hidden = !S.logo; ui.logoTam.disabled = !S.logo; ui.red.disabled = S.estilo === 'cuadrado';
    var n = ++token;
    if (act.error) { ultimo = null; ui.vista.innerHTML = '<div class="qr-vacio">' + T.esc(act.error) + '</div>'; ['png', 'svg', 'copiar', 'copiarImg', 'fav', 'hist', 'imp'].forEach(function (k) { ui.btns[k].disabled = true; }); return; }
    var r = A.codificar(act.texto, E.ecc, E.modo);
    if (!r.qr) { ultimo = null; ui.vista.innerHTML = ''; notas.appendChild(nota(r.error, 'tr-mal')); ['png', 'svg', 'copiar', 'copiarImg', 'fav', 'hist', 'imp'].forEach(function (k) { ui.btns[k].disabled = true; }); return; }
    var qr = r.qr, est = A.estiloPara(qr, S); ultimo = { act: act, qr: qr, estilo: est };
    ['png', 'svg', 'copiar', 'copiarImg', 'fav', 'hist', 'imp'].forEach(function (k) { ui.btns[k].disabled = false; });
    ui.vista.innerHTML = R.svg(qr, est, null); var sv = ui.vista.firstChild; sv.setAttribute('aria-label', 'Código QR de tipo ' + Tp.tipo(act.tipo).nombre + ': ' + act.titulo);
    [['Versión ' + qr.version + ' (' + qr.tam + '×' + qr.tam + ')'], ['Corrección ' + qr.ecc + (qr.ecc !== E.ecc ? ' (subida desde ' + E.ecc + ')' : '')], ['Modo ' + A.descripcionModo(qr.modo)], ['Máscara ' + qr.mascara], [g.QRCodificador.utf8(act.texto).length + ' bytes']].forEach(function (x) { ui.info.appendChild(h('span', { cls: 'tr-etiq', txt: x[0] })); });
    if (S.margen < 4) notas.appendChild(nota('Margen de ' + S.margen + ' módulos: el estándar pide 4. Algunos lectores fallan con menos.', 'tr-av'));
    var c = R.contraste(S.fg, S.bg); if (!S.transparente) { if (c < 3) notas.appendChild(nota('Contraste bajo (' + c.toFixed(1) + ':1). Usa un color de código bastante más oscuro que el fondo.', 'tr-mal')); if (!R.oscuro(S.fg) || R.oscuro(S.bg)) notas.appendChild(nota('Código claro sobre fondo oscuro (invertido): muchos lectores de móvil no lo leen. Prefiere código oscuro sobre fondo claro.', 'tr-av')); }
    else notas.appendChild(nota('Fondo transparente: asegúrate de ponerlo sobre un color claro y liso.', 'tr-av'));
    if (S.estilo !== 'cuadrado') notas.appendChild(nota('Las formas no cuadradas se leen peor en algunas cámaras; verifica con tu móvil.', 'tr-av'));
    if (act.texto.length > 600) notas.appendChild(nota('Mucho contenido (' + act.texto.length + ' caracteres): el código es denso. Impreso pequeño no se leerá; usa enlaces cortos si puedes.', 'tr-av'));
    var ay = document.getElementById('cr-logo-ayuda'); ay.textContent = S.logo ? 'Máximo con corrección ' + qr.ecc + ': ' + Math.round(R.maxLogo(qr.ecc) * 100) + ' % del lado' + (S.logoTam > R.maxLogo(qr.ecc) ? ' (se limitó al máximo)' : '') + '.' : 'Se recomienda corrección H; el logo tapa módulos y el código se recupera con la corrección.';
    if (S.logo) {
      var v = R.verificarLogo(qr, est, g.QRDecodificador.decodificarMatriz, act.texto);
      ultimo.logoOk = v.ok;
      notas.appendChild(v.ok ? nota('Prueba automática superada: con la zona del logo tapada el código se sigue decodificando. Aun así, prueba con tu móvil.', 'tr-ok') : nota('Con este logo/tamaño el código podría no leerse (falló la prueba automática). Reduce el logo, sube la corrección o acorta el contenido.', 'tr-mal'));
    }
    g.QRDatos.listaHistorial().then(function (l) { if (n !== token) return; var id = g.Tr.hash(act.tipo + '\u0001' + act.texto), r2 = l.filter(function (x) { return x.id === id; })[0]; marcarFav(!!(r2 && r2.fav)); });
  }
  function marcarFav(on) { var b = ui.btns.fav; b.setAttribute('aria-pressed', on); b.textContent = on ? '★ En favoritos' : '☆ Guardar en favoritos'; }
  function exito() {
    A.registrar(); A.logro('primer_qr'); if (ultimo.act.tipo === 'wifi') A.logro('wifi'); if (A.est.estilo.logo && ultimo.logoOk) A.logro('logo_verificado');
    if (g.CuentaTrabajos) g.CuentaTrabajos.xp(3);
  }
  function nombre() { return 'qr_' + T.nombreArchivo(ultimo.act.tipo + '_' + ultimo.act.titulo, 30); }
  function descargarPNG() { if (!ultimo) return; R.png(ultimo.qr, ultimo.estilo, +ui.px.value).then(function (b) { T.descargar(b, nombre() + '.png'); exito(); A.aviso('PNG descargado.'); }, function (e) { A.aviso(e.message, 'error'); }); }
  function descargarSVG() { if (!ultimo) return; T.descargar(new Blob([R.svg(ultimo.qr, ultimo.estilo, 1024)], { type: 'image/svg+xml' }), nombre() + '.svg'); exito(); A.aviso('SVG descargado.'); }
  function copiarTexto() { if (!ultimo) return; (navigator.clipboard ? navigator.clipboard.writeText(ultimo.act.texto) : Promise.reject()).then(function () { A.aviso('Contenido copiado.'); exito(); }, function () { A.aviso('No se pudo copiar (permiso del navegador).', 'error'); }); }
  function copiarImagen() {
    if (!ultimo) return;
    if (!(navigator.clipboard && g.ClipboardItem)) return A.aviso('Este navegador no permite copiar imágenes; descarga el PNG.', 'error');
    R.png(ultimo.qr, ultimo.estilo, 1024).then(function (b) { return navigator.clipboard.write([new g.ClipboardItem({ 'image/png': b })]); }).then(function () { A.aviso('Imagen copiada.'); exito(); }, function () { A.aviso('No se pudo copiar la imagen.', 'error'); });
  }
  function favorito() {
    if (!ultimo) return; var on = ui.btns.fav.getAttribute('aria-pressed') !== 'true';
    A.registrar(null, on).then(function () { marcarFav(on); A.aviso(on ? 'Añadido a favoritos.' : 'Quitado de favoritos.'); if (on) { A.logro('favorito'); A.logro('primer_qr'); } });
  }
  A.vistas.crear = { ultimo: function () { return ultimo; } };
  A.iniciarCrear = function () {
    raiz = document.getElementById('v-crear'); construir(); pintar();
    A.on('cargar', function () { sincronizarControles(); formulario(); pintar(); });
    A.on('estilo', function () { sincronizarControles(); pintar(); });
    g.QRDatos.alm.suscribir('estilos', refrescarEstilos);
  };
})(window);
