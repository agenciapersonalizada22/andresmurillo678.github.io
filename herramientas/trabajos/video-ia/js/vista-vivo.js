/* Vista «En vivo»: fuentes, escena con superposicion (zonas, lineas, blobs, calor), controles de analitica y registro de eventos. window.VVivo */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, A = g.VAnalisis, R = g.VReglas, F = g.VFuentes, M = g.VMotor, C = g.VCaptura, D = g.VDatos;
  var Vv = g.VVivo = {}, el = {}, herr = null, p0 = null, p1 = null, calorImg = null, calorT = 0, verCalor = false, verRastro = true, pidiendoFrame = false;
  var video = Vv.video = h('video', { playsinline: true, muted: true, 'aria-label': 'Video analizado' }); video.muted = true;
  var ov = h('canvas', { cls: 'vi-ov', 'aria-hidden': 'true' });

  function rango(etq, min, max, paso, get, set, fmt) {
    var id = 'vi-r-' + Math.random().toString(36).slice(2, 7), out = h('output', { for: id, cls: 'vi-val' }), inp = h('input', { type: 'range', id: id, min: min, max: max, step: paso, value: get() });
    function pinta() { out.textContent = fmt ? fmt(+inp.value) : inp.value; } pinta();
    inp.addEventListener('input', function () { set(+inp.value); pinta(); V.cambioCfg(); });
    V.on('cfg', function () { if (+inp.value !== get()) { inp.value = get(); pinta(); } });
    return h('div', { cls: 'vi-rango' }, [h('label', { for: id }, [etq, ' ', out]), inp]);
  }
  function interruptor(etq, get, set, ayuda) {
    var id = 'vi-c-' + Math.random().toString(36).slice(2, 7), c = h('input', { type: 'checkbox', id: id }); c.checked = !!get();
    c.addEventListener('change', function () { set(c.checked); V.cambioCfg(); }); V.on('cfg', function () { c.checked = !!get(); });
    return h('div', {}, [h('label', { cls: 'tr-chk', for: id }, [c, etq]), ayuda ? h('p', { cls: 'tr-ayuda', txt: ayuda }) : null]);
  }

  /* ---------- fuentes ---------- */
  async function abrir(fn) {
    if (!D.avisoAceptado()) { T.aviso('Primero acepta el aviso legal.', 'error'); return; }
    try { Vv.cerrar(true); var f = await fn(); V.fuente = f; V.meta.fuente = f.nombre; V.limpiarDatos(); M.iniciar(); if (f.esArchivo) { try { await video.play(); } catch (e) {} } ajustarAspecto(); V.emitir('fuente', f); T.aviso('Fuente abierta: ' + f.nombre); }
    catch (e) { var m = e && e.name === 'NotAllowedError' ? 'Permiso denegado: el navegador bloqueó la cámara o pantalla.' : e && e.name === 'NotFoundError' ? 'No se encontró ninguna cámara.' : (e && e.message) || 'No se pudo abrir la fuente.'; T.aviso(m, 'error'); el.estado.textContent = m; }
  }
  Vv.cerrar = function (silencioso) { M.parar(); C.pararTodo(); if (g.VIAUI) g.VIAUI.detener(); F.detener(); if (!silencioso) V.emitir('fuente', null); pintar(); };
  Vv.abrirArchivo = function (file) { return abrir(function () { return F.archivo(video, file); }); };
  function ajustarAspecto() {
    var w = video.videoWidth, hh = video.videoHeight; if (!w) return; var ar = w / hh; el.escena.style.aspectRatio = w + ' / ' + hh; el.escena.style.width = 'min(100%, ' + Math.round(62 * ar) + 'vh)'; el.escena.classList.add('on'); redimensionar();
  }
  function redimensionar() { var r = ov.getBoundingClientRect(), d = g.devicePixelRatio || 1; ov.width = Math.max(2, Math.round(r.width * d)); ov.height = Math.max(2, Math.round(r.height * d)); pintar(); }
  video.addEventListener('loadedmetadata', ajustarAspecto); video.addEventListener('resize', ajustarAspecto); g.addEventListener('resize', function () { if (el.escena && el.escena.offsetParent) redimensionar(); });

  /* ---------- superposicion ---------- */
  var colSig = { inc: '#12b886', exc: '#fa5252', lin: '#22b8cf', blob: '#fcc419', obj: '#f06595' };
  function poli(x, pts, w, hh) { x.beginPath(); pts.forEach(function (p, i) { if (i) x.lineTo(p[0] * w, p[1] * hh); else x.moveTo(p[0] * w, p[1] * hh); }); x.closePath(); }
  function flecha(x, l, w, hh, col) {
    var mx = (l.x1 + l.x2) / 2 * w, my = (l.y1 + l.y2) / 2 * hh, nx = (l.y2 - l.y1), ny = -(l.x2 - l.x1), n = Math.hypot(nx, ny) || 1, s = 18 * (g.devicePixelRatio || 1);
    nx /= n; ny /= n; x.beginPath(); x.moveTo(mx, my); x.lineTo(mx + nx * s, my + ny * s); x.lineTo(mx + nx * s - ny * 5 - nx * 5, my + ny * s + nx * 5 - ny * 5); x.moveTo(mx + nx * s, my + ny * s); x.lineTo(mx + nx * s + ny * 5 - nx * 5, my + ny * s - nx * 5 - ny * 5); x.strokeStyle = col; x.stroke();
  }
  function pintar() {
    var x = ov.getContext('2d'), w = ov.width, hh = ov.height, d = g.devicePixelRatio || 1; x.clearRect(0, 0, w, hh); if (!w) return; x.lineWidth = 2 * d; x.font = (11 * d) + 'px system-ui,sans-serif';
    if (verCalor && calorImg) x.drawImage(calorImg, 0, 0, w, hh);
    V.cfg.zonas.forEach(function (z) { poli(x, z.puntos, w, hh); x.fillStyle = z.tipo === 'exc' || z.tipo === 'excluir' ? 'rgba(250,82,82,.30)' : 'rgba(18,184,134,.18)'; x.fill(); x.strokeStyle = z.tipo === 'exc' || z.tipo === 'excluir' ? colSig.exc : colSig.inc; x.setLineDash(z.tipo === 'exc' || z.tipo === 'excluir' ? [6 * d, 4 * d] : []); x.stroke(); x.setLineDash([]); });
    var tot = V.ult && V.ult.cruces || {};
    V.cfg.lineas.forEach(function (l, i) { x.beginPath(); x.moveTo(l.x1 * w, l.y1 * hh); x.lineTo(l.x2 * w, l.y2 * hh); x.strokeStyle = colSig.lin; x.lineWidth = 3 * d; x.stroke(); x.lineWidth = 2 * d; flecha(x, l, w, hh, colSig.lin); var t = tot[l.id] || { ab: 0, ba: 0 }; var tx = (l.x1 + l.x2) / 2 * w + 6 * d, ty = (l.y1 + l.y2) / 2 * hh - 6 * d; var s = (l.nombre || 'L' + (i + 1)) + '  A→B ' + t.ab + ' · B→A ' + t.ba; x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(tx - 3 * d, ty - 11 * d, x.measureText(s).width + 6 * d, 15 * d); x.fillStyle = '#fff'; x.fillText(s, tx, ty); });
    var r = V.ult;
    if (r && F.actual) {
      (r.pistas || []).forEach(function (p) {
        x.strokeStyle = colSig.blob; x.strokeRect(p.x0 * w, p.y0 * hh, (p.x1 - p.x0) * w, (p.y1 - p.y0) * hh);
        if (verRastro && p.tr && p.tr.length > 1) { x.beginPath(); p.tr.forEach(function (q, i) { if (i) x.lineTo(q[0] * w, q[1] * hh); else x.moveTo(q[0] * w, q[1] * hh); }); x.strokeStyle = 'rgba(252,196,25,.8)'; x.stroke(); }
        var s = '#' + p.id; x.fillStyle = colSig.blob; x.fillRect(p.x0 * w, p.y0 * hh - 14 * d, x.measureText(s).width + 6 * d, 14 * d); x.fillStyle = '#000'; x.fillText(s, p.x0 * w + 3 * d, p.y0 * hh - 3 * d);
      });
      if (r.objetoColor) r.objetoColor.blobs.forEach(function (b) { x.strokeStyle = colSig.obj; x.lineWidth = 3 * d; x.strokeRect(b.x0 * w, b.y0 * hh, (b.x1 - b.x0) * w, (b.y1 - b.y0) * hh); x.lineWidth = 2 * d; });
    }
    var L = V.lectura; if (L && F.actual) [['rostros', '#4dabf7'], ['textos', '#be4bdb'], ['codigos', '#ff922b']].forEach(function (k) { (L[k[0]] || []).forEach(function (b) { x.strokeStyle = k[1]; x.strokeRect(b.x * w, b.y * hh, b.w * w, b.h * hh); }); });
    if (p0 && p1) {
      x.strokeStyle = herr === 'exc' ? colSig.exc : colSig.inc; x.setLineDash([5 * d, 4 * d]);
      if (herr === 'lin') { x.beginPath(); x.moveTo(p0[0] * w, p0[1] * hh); x.lineTo(p1[0] * w, p1[1] * hh); x.strokeStyle = colSig.lin; x.stroke(); } else x.strokeRect(p0[0] * w, p0[1] * hh, (p1[0] - p0[0]) * w, (p1[1] - p0[1]) * hh); x.setLineDash([]);
    }
  }
  var rafP = 0; function pedirPintar() { if (!rafP) rafP = requestAnimationFrame(function () { rafP = 0; pintar(); }); }
  async function actualizarCalor() {
    if (!verCalor || !M.activo() || pidiendoFrame || Date.now() - calorT < 1500) return; pidiendoFrame = true; calorT = Date.now();
    var m = await M.calor(); pidiendoFrame = false; if (!m || !m.calor) return; var c = m.calor, cv = document.createElement('canvas'); cv.width = c.w; cv.height = c.h;
    var id = cv.getContext('2d').createImageData(c.w, c.h); for (var i = 0; i < c.datos.length; i++) { var q = A.rampaCalor(c.datos[i]); id.data[i * 4] = q[0]; id.data[i * 4 + 1] = q[1]; id.data[i * 4 + 2] = q[2]; id.data[i * 4 + 3] = q[3]; } cv.getContext('2d').putImageData(id, 0, 0); calorImg = cv; pedirPintar();
  }

  /* ---------- dibujo de zonas y lineas ---------- */
  function norm(e) { var r = ov.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; }
  function ponerHerr(t) {
    herr = herr === t ? null : t; ov.classList.toggle('dibujando', !!herr); p0 = p1 = null;
    Object.keys(el.herr).forEach(function (k) { el.herr[k].setAttribute('aria-pressed', herr === k); });
    el.ayudaHerr.textContent = herr === 'inc' ? 'Arrastra sobre la imagen para marcar una zona donde SÍ se analiza.' : herr === 'exc' ? 'Arrastra para marcar una máscara: ahí NO se analiza.' : herr === 'lin' ? 'Arrastra para trazar una línea virtual. La flecha indica el sentido A→B.' : herr === 'gota' ? 'Toca un color de la imagen para usarlo como objetivo.' : 'Elige una herramienta para dibujar sobre la imagen.';
  }
  ov.addEventListener('pointerdown', function (e) { if (!herr) return; e.preventDefault(); ov.setPointerCapture(e.pointerId); p0 = p1 = norm(e); if (herr === 'gota') muestrear(p0); });
  ov.addEventListener('pointermove', function (e) { if (!herr || !p0 || herr === 'gota') return; p1 = norm(e); pedirPintar(); });
  ov.addEventListener('pointerup', function (e) {
    if (!herr || !p0 || herr === 'gota') { p0 = p1 = null; return; } p1 = norm(e); var a = p0, b = p1; p0 = p1 = null;
    if (herr === 'lin') { if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.04) { V.cfg.lineas.push({ id: 'l' + T.uid().slice(-5), nombre: 'Línea ' + (V.cfg.lineas.length + 1), x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); V.cambioCfg(); } }
    else if (Math.abs(a[0] - b[0]) > 0.03 && Math.abs(a[1] - b[1]) > 0.03) { V.cfg.zonas.push({ id: 'z' + T.uid().slice(-5), tipo: herr, puntos: A.rectAPuntos(a[0], a[1], b[0], b[1]) }); V.cambioCfg(); }
    pintar();
  });
  function muestrear(p) {
    if (!video.videoWidth) return; var c = document.createElement('canvas'); c.width = 4; c.height = 4; var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(video, p[0] * video.videoWidth - 8, p[1] * video.videoHeight - 8, 16, 16, 0, 0, 4, 4);
    var d = x.getImageData(0, 0, 4, 4).data, r = 0, gg = 0, b = 0; for (var i = 0; i < 16; i++) { r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; }
    var rgb = [Math.round(r / 16), Math.round(gg / 16), Math.round(b / 16)]; V.cfg.objetoColor = Object.assign({ tol: 40, minPct: 0.004 }, V.cfg.objetoColor, { activo: true, rgb: rgb, hex: A.hex(rgb[0], rgb[1], rgb[2]) }); V.cambioCfg(); ponerHerr('gota'); T.aviso('Color elegido: ' + A.nombreColor(rgb[0], rgb[1], rgb[2]));
  }

  /* ---------- estadisticas y registro ---------- */
  function pintarStats() {
    var r = V.ult, f = !!F.actual; el.fps.textContent = f ? (M.fps || 0) + ' análisis/s · ' + (M.modo || '') : '';
    var q = r && r.calidad, ln = V.cfg.lineas.map(function (l) { var t = (r && r.cruces && r.cruces[l.id]) || { ab: 0, ba: 0 }; return (l.nombre || l.id) + ': A→B ' + t.ab + ', B→A ' + t.ba; }).join(' · ');
    var items = [['Movimiento', r && r.mov ? (r.mov.pct * 100).toFixed(1) + ' %' + (r.mov.estado ? ' ●' : '') : '—'], ['Objetos', r ? String(r.ocupacion || 0) : '—'], ['Brillo', q ? Math.round(q.brillo) + '/255' : '—'], ['Nitidez', q ? q.nitidez.toFixed(0) + (q.estado && q.estado.desenfocado ? ' (baja)' : '') : '—'], ['Ruido', q ? q.ruido.toFixed(1) : '—'], ['Exposición', q ? (q.estado.oscuro ? 'oscura' : q.estado.sobreexpuesto ? 'quemada' : 'correcta') : '—'], ['Escena Δ', r && r.escena ? r.escena.d.toFixed(2) : '—']];
    el.stats.textContent = ''; items.forEach(function (i) { el.stats.appendChild(h('div', { cls: 'vi-stat' }, [h('span', { txt: i[0] }), h('b', { txt: i[1] })])); });
    var col = r && r.color; el.color.textContent = ''; if (col) col.paleta.slice(0, 4).forEach(function (c) { el.color.appendChild(h('span', { cls: 'vi-sw', title: c.nombre + ' ' + Math.round(c.pct * 100) + ' %' }, [h('i', { style: 'background:' + c.hex }), c.nombre + ' ' + Math.round(c.pct * 100) + '%'])); });
    el.lineas.textContent = ln || ''; el.lineas.hidden = !ln;
  }
  var ultStats = 0; V.on('resultado', function () { pedirPintar(); var n = performance.now(); if (n - ultStats > 250) { ultStats = n; pintarStats(); } actualizarCalor(); });
  var ICON = { movimiento: '🏃', sin_movimiento: '⏸', objeto_nuevo: '🆕', cruce_linea: '↔', escena: '🎬', desenfoque: '🌫', oscuro: '🌑', sobreexpuesto: '☀', objeto_color: '🎯', qr: '▦', codigo: '▮▮', rostro: '🙂', texto: 'Aa', ia_evento: '✨', habla: '🗣' };
  function linea(t, n, extra) { return h('li', {}, [h('time', { txt: V.fmt(t) }), h('span', { txt: n }), extra ? h('em', { txt: extra }) : null]); }
  function agregarLog(ev) { var l = el.log; l.insertBefore(linea(ev.t || 0, (ICON[ev.tipo] || '•') + ' ' + R.nombreEvento(ev.tipo), ev.texto || (ev.valor != null && ev.tipo === 'movimiento' ? (ev.valor * 100).toFixed(1) + ' %' : '')), l.firstChild); while (l.children.length > 40) l.removeChild(l.lastChild); el.vacioLog.hidden = true; }
  V.on('evento', agregarLog);
  V.on('accion', function (a) { el.log.insertBefore(h('li', { cls: 'vi-acc' }, [h('time', { txt: '→' }), h('span', { txt: 'Regla «' + a.regla + '»: ' + a.tipo }), h('em', { txt: a.resultado })]), el.log.firstChild); });
  V.on('limpio', function () { el.log.textContent = ''; el.vacioLog.hidden = false; });

  function insignias() {
    var f = F.actual, rec = C.grabando, pre = C.prerollActivo; el.bRec.hidden = !(rec || pre); el.bRec.className = 'vi-ins vi-rec' + (rec ? ' on' : ''); el.bRec.textContent = rec ? '● GRABANDO' : pre ? '◉ Buffer de pre-roll (en memoria)' : '';
    el.bFuente.hidden = !f || f.esArchivo; el.bFuente.textContent = f ? (f.tipo === 'pantalla' ? '▣ Pantalla compartida' : '● Cámara activa') : ''; el.bIA.hidden = !(g.VIAUI && g.VIAUI.enviando && g.VIAUI.enviando());
    el.btnGrabar.textContent = rec ? 'Detener grabación' : 'Grabar'; el.btnGrabar.classList.toggle('tr-peli', rec);
    el.btnCerrar.disabled = !f; el.btnFoto.disabled = !f; el.btnGrabar.disabled = !f || !C.puede(); el.btnBuffer.disabled = !f || !C.puede(); el.btnBuffer.textContent = pre ? 'Parar buffer de pre-roll' : 'Activar buffer de pre-roll';
  }
  Vv.insignias = insignias; V.on('rec', insignias); V.on('fuente', function () { insignias(); pintarStats(); pintar(); if (!F.actual) { el.escena.classList.remove('on'); el.estado.textContent = 'Sin fuente. Elige cámara, pantalla o un archivo.'; } else el.estado.textContent = F.actual.nombre + ' (' + F.actual.tipo + ')'; });

  /* ---------- construccion ---------- */
  Vv.iniciar = function (cont) {
    el.estado = h('p', { cls: 'tr-ayuda', role: 'status', txt: 'Sin fuente. Elige cámara, pantalla o un archivo.' });
    var aviso = h('details', { cls: 'qr-det', open: !D.avisoAceptado() }, [h('summary', { txt: 'Aviso legal y privacidad' }), h('p', { txt: 'Grabar o analizar a personas puede estar regulado por la ley (consentimiento, carteles de videovigilancia, protección de datos, espacios privados, trabajo y menores). Avisa a quienes aparezcan, no apuntes a espacios ajenos y cumple las normas de tu país. Todo se procesa y se guarda en este dispositivo; solo se envían fotogramas a una IA si lo autorizas de forma explícita en la pestaña IA. Los videos, capturas y clips no se suben a tu cuenta.' })]);
    var acepta = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Entiendo y acepto', on: { click: function () { D.aceptarAviso(); acepta.hidden = true; aviso.open = false; habilitar(); } } }); aviso.appendChild(acepta); acepta.hidden = D.avisoAceptado();
    var selCam = h('select', { id: 'vi-cam', 'aria-label': 'Cámara' }, [h('option', { value: '', txt: 'Cámara predeterminada' })]);
    var selFace = h('select', { id: 'vi-face', 'aria-label': 'Orientación' }, [h('option', { value: '', txt: 'Cualquiera' }), h('option', { value: 'user', txt: 'Frontal' }), h('option', { value: 'environment', txt: 'Trasera' })]);
    var bCam = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Cámara en vivo', on: { click: function () { abrir(function () { return F.camara(video, { deviceId: selCam.value, facing: selFace.value }); }).then(llenarCams); } } });
    var bPan = h('button', { type: 'button', cls: 'tr-btn', txt: 'Pantalla', on: { click: function () { abrir(function () { return F.pantalla(video); }); } } });
    var arch = h('input', { type: 'file', accept: 'video/*', hidden: true, id: 'vi-arch' }); arch.addEventListener('change', function () { if (arch.files[0]) Vv.abrirArchivo(arch.files[0]); arch.value = ''; });
    var bArch = h('button', { type: 'button', cls: 'tr-btn', txt: 'Archivo de video', on: { click: function () { arch.click(); } } });
    el.btnCerrar = h('button', { type: 'button', cls: 'tr-btn', txt: 'Cerrar fuente', on: { click: function () { Vv.cerrar(); } } });
    function habilitar() { var ok = D.avisoAceptado(); [bCam, bPan, bArch].forEach(function (b) { b.disabled = !ok; }); bCam.disabled = !ok || !F.puedeCamara(); bPan.disabled = !ok || !F.puedePantalla(); } habilitar();
    async function llenarCams() { var l = await F.listarCamaras(), prev = selCam.value; selCam.textContent = ''; selCam.appendChild(h('option', { value: '', txt: 'Cámara predeterminada' })); l.forEach(function (d, i) { selCam.appendChild(h('option', { value: d.deviceId, txt: d.label || 'Cámara ' + (i + 1) })); }); selCam.value = prev; }
    llenarCams();
    var fuentes = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Fuente de video' }), h('div', { cls: 'tr-acciones' }, [bCam, bPan, bArch, el.btnCerrar, arch]), h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'vi-cam', txt: 'Cámara (vía Dispositivos)' }), selCam]), h('div', {}, [h('label', { for: 'vi-face', txt: 'Orientación (móvil)' }), selFace])]), el.estado,
      (!F.puedeCamara() ? h('p', { cls: 'tr-nota tr-av', txt: 'Este navegador o contexto no permite cámara (hace falta HTTPS o localhost). Puedes analizar archivos de video.' }) : null)]);

    el.escena = h('div', { cls: 'vi-escena' }, [video, ov]); el.bRec = h('span', { cls: 'vi-ins vi-rec', hidden: true, role: 'status' }); el.bFuente = h('span', { cls: 'vi-ins', hidden: true }); el.bIA = h('span', { cls: 'vi-ins vi-ia', hidden: true, txt: '✨ IA enviando fotogramas' }); el.fps = h('span', { cls: 'vi-fps' });
    el.escena.appendChild(h('div', { cls: 'vi-ins-fila' }, [el.bRec, el.bFuente, el.bIA]));
    el.vacioEsc = h('div', { cls: 'vi-vacio-esc', txt: 'La imagen aparecerá aquí.' });
    function hb(txt, t, ayuda) { var b = h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-pressed': 'false', txt: txt, title: ayuda || '', on: { click: function () { ponerHerr(t); } } }); return b; }
    el.herr = { inc: hb('Zona ✓ analizar', 'inc'), exc: hb('Máscara ✗ ignorar', 'exc'), lin: hb('Línea virtual', 'lin'), gota: hb('Cuentagotas', 'gota') };
    el.ayudaHerr = h('p', { cls: 'tr-ayuda', txt: 'Elige una herramienta para dibujar sobre la imagen.' });
    var bBor = h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Deshacer', on: { click: function () { if (V.cfg.lineas.length && (!V.cfg.zonas.length || herr === 'lin')) V.cfg.lineas.pop(); else V.cfg.zonas.pop(); V.cambioCfg(); } } });
    var bTodo = h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar zonas y líneas', on: { click: function () { V.cfg.zonas = []; V.cfg.lineas = []; if (M.activo()) M.reiniciar(); V.cambioCfg(); } } });
    el.btnGrabar = h('button', { type: 'button', cls: 'tr-btn', txt: 'Grabar', on: { click: function () { if (C.grabando) C.pararManual(); else if (!C.iniciarManual()) T.aviso('No se pudo iniciar la grabación.', 'error'); } } });
    el.btnFoto = h('button', { type: 'button', cls: 'tr-btn', txt: 'Foto', on: { click: function () { C.guardarFoto('manual', V.reloj()).then(function () { T.aviso('Captura guardada en la lista inferior.'); }, function (e) { T.aviso(e.message, 'error'); }); } } });
    el.btnBuffer = h('button', { type: 'button', cls: 'tr-btn', txt: 'Activar buffer de pre-roll', on: { click: function () { try { if (C.prerollActivo) C.pararPreroll(); else C.activarPreroll(V.cfg.preroll || 5); } catch (e) { T.aviso(e.message, 'error'); } insignias(); } } });
    el.stats = h('div', { cls: 'vi-stats' }); el.color = h('div', { cls: 'vi-colores', 'aria-label': 'Colores dominantes' }); el.lineas = h('p', { cls: 'tr-ayuda', hidden: true });
    var panelEscena = h('div', { cls: 'tr-panel' }, [h('div', { cls: 'vi-escena-caja' }, [el.escena, el.vacioEsc]), el.fps,
      h('div', { cls: 'tr-acciones' }, [el.herr.inc, el.herr.exc, el.herr.lin, el.herr.gota, bBor, bTodo]), el.ayudaHerr,
      h('div', { cls: 'tr-acciones' }, [el.btnFoto, el.btnGrabar, el.btnBuffer]), h('p', { cls: 'tr-ayuda', txt: 'El buffer mantiene en memoria unos segundos de video para que los clips de las reglas incluyan lo ocurrido ANTES del evento (entre N y 2N segundos). Se muestra siempre el indicador de grabación.' }), el.stats, el.color, el.lineas]);
    V.on('fuente', function () { el.vacioEsc.hidden = !!F.actual; });

    var det = function (tit, hijos, abierto) { return h('details', { cls: 'qr-det', open: abierto }, [h('summary', { txt: tit })].concat(hijos)); };
    var oc = function () { return V.cfg.objetoColor || (V.cfg.objetoColor = { activo: false, rgb: [220, 40, 40], hex: '#dc2828', tol: 40, minPct: 0.004 }); };
    var colorIn = h('input', { type: 'color', id: 'vi-color', 'aria-label': 'Color objetivo' }); colorIn.value = oc().hex || '#dc2828'; colorIn.addEventListener('input', function () { var rgb = A.hexARgb(colorIn.value); Object.assign(oc(), { rgb: rgb, hex: colorIn.value }); V.cambioCfg(); }); V.on('cfg', function () { if (oc().hex) colorIn.value = oc().hex; });
    var analitica = det('Movimiento y seguimiento', [
      rango('Sensibilidad', 0, 100, 1, function () { return V.cfg.sensibilidad; }, function (v) { V.cfg.sensibilidad = v; }, function (v) { return v + ' %'; }),
      rango('Tamaño mínimo del objeto', 0.1, 6, 0.1, function () { return V.cfg.minArea * 100; }, function (v) { V.cfg.minArea = v / 100; }, function (v) { return v.toFixed(1) + ' % del cuadro'; }),
      interruptor('Detección de movimiento', function () { return V.cfg.movimiento; }, function (v) { V.cfg.movimiento = v; }), interruptor('Seguimiento de objetos con identificador y líneas virtuales', function () { return V.cfg.seguimiento; }, function (v) { V.cfg.seguimiento = v; }, 'Cuenta objetos que se mueven (no distingue personas de cosas; dos objetos muy juntos pueden contarse como uno).'),
      interruptor('Mapa de calor de actividad', function () { return V.cfg.calor; }, function (v) { V.cfg.calor = v; }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-pressed': 'false', txt: 'Ver calor sobre la imagen', on: { click: function (e) { verCalor = !verCalor; e.currentTarget.setAttribute('aria-pressed', verCalor); calorT = 0; if (verCalor) actualizarCalor(); pintar(); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', 'aria-pressed': 'true', txt: 'Ver rastros', on: { click: function (e) { verRastro = !verRastro; e.currentTarget.setAttribute('aria-pressed', verRastro); pintar(); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Reiniciar conteos y calor', on: { click: function () { M.reiniciar(); V.limpiarDatos(); calorImg = null; pintar(); } } })])], true);
    var calidad = det('Escena, calidad y color', [
      interruptor('Cambios de escena / cortes', function () { return V.cfg.escena; }, function (v) { V.cfg.escena = v; }), rango('Umbral de corte', 0.1, 0.8, 0.05, function () { return V.cfg.umbralEscena; }, function (v) { V.cfg.umbralEscena = v; }, function (v) { return v.toFixed(2); }),
      interruptor('Brillo, desenfoque, exposición y ruido', function () { return V.cfg.calidad; }, function (v) { V.cfg.calidad = v; }), rango('Umbral de nitidez (aviso de desenfoque)', 1, 80, 1, function () { return V.cfg.umbralNitidez; }, function (v) { V.cfg.umbralNitidez = v; }, function (v) { return 'por debajo de ' + v; }),
      interruptor('Color dominante', function () { return V.cfg.color; }, function (v) { V.cfg.color = v; }),
      h('div', { cls: 'tr-nota' }, [h('b', { txt: 'Objeto por color' }), h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'vi-color', txt: 'Color' }), colorIn]), h('div', {}, [interruptor('Buscar este color', function () { return oc().activo; }, function (v) { oc().activo = v; })])]), rango('Tolerancia', 5, 100, 5, function () { return oc().tol; }, function (v) { oc().tol = v; }, function (v) { return v + ' %'; })])]);
    var lect = det('Lectores', [
      interruptor('Leer códigos QR en el video', function () { return V.cfg.lector; }, function (v) { V.cfg.lector = v; }, 'Usa el lector de QR del módulo QR (BarcodeDetector si existe, decodificador propio si no).'),
      interruptor('Detectores nativos (rostros, texto, códigos de barras)', function () { return V.cfg.nativos; }, function (v) { V.cfg.nativos = v; }, 'Disponible: ' + ['FaceDetector', 'TextDetector', 'BarcodeDetector'].map(function (n) { return n + (M.nativos[n] ? ' sí' : ' no'); }).join(', ') + '. Detectan, no reconocen quién es.')]);
    var rend = det('Rendimiento', [rango('Fotogramas analizados por segundo', 2, 15, 1, function () { return V.cfg.fps; }, function (v) { V.cfg.fps = v; }, function (v) { return v + ' /s'; }), h('div', {}, [h('label', { for: 'vi-res', txt: 'Resolución de análisis' }), (function () { var s = h('select', { id: 'vi-res' }, [128, 160, 224, 320].map(function (n) { return h('option', { value: n, txt: n + ' px de ancho' }); })); s.value = V.cfg.ancho; s.addEventListener('change', function () { V.cfg.ancho = +s.value; V.cambioCfg(); }); V.on('cfg', function () { s.value = V.cfg.ancho; }); return s; })()])]);
    el.log = h('ol', { cls: 'vi-log', role: 'log', 'aria-label': 'Eventos recientes' }); el.vacioLog = h('p', { cls: 'tr-vacio', txt: 'Aún no hay eventos.' });
    var capsBox = h('div', {}, []); var clipsBox = h('div', {}, []);
    function pintarCaps() {
      capsBox.textContent = ''; clipsBox.textContent = '';
      if (V.capturas.length) { capsBox.appendChild(h('h3', { txt: 'Capturas (' + V.capturas.length + ')' })); capsBox.appendChild(h('div', { cls: 'vi-galeria' }, V.capturas.slice().reverse().map(function (c) { return h('figure', {}, [h('img', { src: c.url, alt: 'Captura ' + c.nombre }), h('figcaption', { txt: c.motivo }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Descargar', on: { click: function () { T.descargar(c.blob, c.nombre); } } })]); }))); }
      if (V.clips.length) { clipsBox.appendChild(h('h3', { txt: 'Clips (' + V.clips.length + ', en memoria)' })); V.clips.slice().reverse().forEach(function (c) { clipsBox.appendChild(h('div', { cls: 'vi-clip' }, [h('video', { src: c.url, controls: true, preload: 'metadata', 'aria-label': c.nombre }), h('div', {}, [h('b', { txt: c.nombre }), h('span', { cls: 'tr-ayuda', txt: Math.round(c.dur) + ' s (pre-roll ' + Math.round(c.preroll) + ' s) · ' + (c.blob.size / 1048576).toFixed(1) + ' MB · ' + c.motivo }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Descargar', on: { click: function () { T.descargar(c.blob, c.nombre); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Quitar', on: { click: function () { V.clips = V.clips.filter(function (x) { return x !== c; }); URL.revokeObjectURL(c.url); pintarCaps(); } } })])])])); }); }
    }
    V.on('capturas', pintarCaps); V.on('clips', pintarCaps);
    cont.appendChild(aviso); cont.appendChild(fuentes);
    cont.appendChild(h('div', { cls: 'vi-dos' }, [h('div', {}, [panelEscena]), h('div', {}, [analitica, calidad, lect, rend, h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Eventos' }), el.vacioLog, el.log])])]));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Capturas y clips' }), h('p', { cls: 'tr-ayuda', txt: 'Viven en la memoria de esta pestaña (máximo 30 capturas y 20 clips): descárgalos antes de cerrar.' }), capsBox, clipsBox]));
    V.on('cfg', function () { M.config(); pintar(); }); insignias(); pintarStats();
  };
})(window);
