/* Pestana Captura: camara guiada (mesa giratoria, recorrido, par estereo), fotos y video con cuadros nitidos, vuelo de dron. window.R3D.VCaptura */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, R = g.R3D, A = R.App, I = R.Img, V = R.VCaptura = {};
  var GUIAS = {
    mesa: 'Pon el objeto sobre una mesa giratoria (o gira tú alrededor) con fondo liso de un color distinto al del objeto. Toma una foto cada 360°/N, siempre a la misma distancia y altura. Una segunda vuelta más alta mejora la parte superior.',
    rodeo: 'Camina alrededor del objeto manteniéndolo centrado y a distancia constante. Es lo mismo que la mesa giratoria pero con peor calibración de ángulos: úsalo si no tienes mesa.',
    par: 'Foto 1, luego desplaza la cámara hacia la derecha SIN girarla (usa una regla) y toma la foto 2. Mide el desplazamiento: es la base del estéreo. La imagen fantasma te ayuda a alinear.',
    lateral: 'Graba o importa un video moviendo la cámara de lado a lado, en línea recta y a velocidad constante, sin girar. Después eliges dos cuadros y el recorrido total fija la base.'
  };
  var estado = { modo: 'mesa', n: 24, stream: null, rec: null, auto: null, trozos: [], primera: null, segs: 0 };
  var el = {};

  function crearCamara() {
    el.vid = h('video', { playsinline: true, muted: true, 'aria-label': 'Vista previa de la cámara' }); el.vid.muted = true; el.vid.hidden = true;
    el.ghost = h('canvas', { cls: 'r3d-ghost', 'aria-hidden': 'true' }); el.ghost.hidden = true; el.anillo = h('canvas', { cls: 'r3d-anillo', 'aria-hidden': 'true' }); el.anillo.width = 300; el.anillo.height = 300;
    el.msg = h('div', { cls: 'r3d-msg', 'aria-live': 'polite', txt: 'Cámara apagada.' }); el.vacio = h('div', { cls: 'r3d-vacio-cam', txt: 'Abre la cámara, elige fotos o importa un video.' });
    return h('div', { cls: 'r3d-cam' }, [el.vid, el.ghost, el.anillo, el.vacio, el.msg]);
  }
  function lado() { return A.ajustes().lado; }
  function dibujarAnillo() {
    var c = el.anillo, x = c.getContext('2d'), n = estado.n, hechas = A.fotos.filter(function (f) { return f.meta === 'mesa'; }).length; x.clearRect(0, 0, c.width, c.height);
    if (!el.vid || el.vid.hidden || (estado.modo !== 'mesa' && estado.modo !== 'rodeo')) return;
    var cx = c.width / 2, cy = c.height / 2, r = Math.min(cx, cy) - 14; x.lineWidth = 8; x.lineCap = 'butt';
    for (var i = 0; i < n; i++) { var a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + 0.03, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - 0.03; x.strokeStyle = i < hechas ? 'rgba(80,220,120,.9)' : i === hechas ? 'rgba(255,212,59,.95)' : 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); }
    x.fillStyle = '#fff'; x.font = 'bold 18px system-ui'; x.textAlign = 'center'; x.fillText(hechas + ' / ' + n, cx, cy + 6);
  }
  function mensaje() {
    if (!el.msg) return; var m = estado.modo, hechas = A.fotos.filter(function (f) { return f.meta === m; }).length;
    if (!estado.stream) { el.msg.textContent = 'Cámara apagada.'; return; }
    if (m === 'mesa' || m === 'rodeo') el.msg.textContent = hechas >= estado.n ? 'Listo: ' + hechas + ' fotos. Pasa a «Reconstruir».' : 'Foto ' + (hechas + 1) + ' de ' + estado.n + ' · gira ' + Math.round(360 / estado.n) + '° (ángulo ' + Math.round(hechas * 360 / estado.n) + '°)';
    else if (m === 'par') el.msg.textContent = estado.primera ? 'Desplaza la cámara a la derecha sin girar y captura la 2.ª foto' : 'Captura la 1.ª foto (izquierda)';
    else el.msg.textContent = 'Graba un video moviendo la cámara de lado, o captura cuadros sueltos.';
  }
  async function abrirCamara() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { T.aviso('Este navegador no permite abrir la cámara (necesita HTTPS). Usa «Elegir fotos».', 'error'); return; }
    try {
      estado.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      el.vid.srcObject = estado.stream; el.vid.hidden = false; el.vacio.hidden = true; await el.vid.play(); botones(); mensaje(); dibujarAnillo(); A.logro('r3d_abrio_camara');
    } catch (e) { T.aviso('No pude abrir la cámara: ' + (e.name === 'NotAllowedError' ? 'permiso denegado. Actívalo en el candado de la barra de direcciones.' : e.name === 'NotFoundError' ? 'no hay cámara.' : e.message), 'error'); }
  }
  function cerrarCamara() { if (estado.rec && estado.rec.state !== 'inactive') estado.rec.stop(); detenerAuto(); if (estado.stream) estado.stream.getTracks().forEach(function (t) { t.stop(); }); estado.stream = null; el.vid.srcObject = null; el.vid.hidden = true; el.vacio.hidden = false; el.ghost.hidden = true; botones(); mensaje(); dibujarAnillo(); }
  function capturar() {
    if (!estado.stream || !el.vid.videoWidth) { T.aviso('Abre primero la cámara.', 'error'); return; }
    var img = I.deFuente(el.vid, el.vid.videoWidth, el.vid.videoHeight, lado()), m = estado.modo, meta = { meta: m, nombre: m === 'par' ? (estado.primera ? 'Derecha' : 'Izquierda') : 'Foto ' + (A.fotos.length + 1) };
    if (m === 'mesa' || m === 'rodeo') { var k = A.fotos.filter(function (f) { return f.meta === m; }).length; meta.angulo = k * 360 / estado.n; meta.nombre = 'Giro ' + Math.round(meta.angulo) + '°'; }
    var f = A.agregarFoto(img, meta); if (!f) { detenerAuto(); return; }
    if (m === 'par') { if (!estado.primera) { estado.primera = f; pintarGhost(f); } else { A.params.par = [estado.primera.id, f.id]; estado.primera = null; el.ghost.hidden = true; T.aviso('Par listo. Ve a «Reconstruir» > Estéreo y escribe la base medida.'); A.logro('r3d_par_capturado'); } }
    if ((m === 'mesa' || m === 'rodeo') && A.fotos.filter(function (q) { return q.meta === m; }).length >= estado.n) { detenerAuto(); T.aviso('Vuelta completa: ' + estado.n + ' fotos.'); }
    A.logro('r3d_primera_captura'); mensaje(); dibujarAnillo();
  }
  function pintarGhost(f) { I.aCanvas({ w: f.w, h: f.h, data: f.data }, el.ghost); el.ghost.hidden = false; }
  function detenerAuto() { if (estado.auto) { clearInterval(estado.auto); estado.auto = null; } if (el.btnAuto) { el.btnAuto.setAttribute('aria-pressed', 'false'); el.btnAuto.textContent = 'Automático'; } }
  function alternarAuto() {
    if (estado.auto) { detenerAuto(); return; } var s = Math.max(1, +el.seg.value || 3); if (!estado.stream) { T.aviso('Abre primero la cámara.', 'error'); return; }
    el.btnAuto.setAttribute('aria-pressed', 'true'); el.btnAuto.textContent = 'Parar (cada ' + s + ' s)';
    estado.auto = setInterval(function () { capturar(); }, s * 1000);
  }
  function grabar() {
    if (!estado.stream) { T.aviso('Abre primero la cámara.', 'error'); return; }
    if (estado.rec && estado.rec.state === 'recording') { estado.rec.stop(); return; }
    if (typeof MediaRecorder === 'undefined') { T.aviso('Este navegador no puede grabar video: graba con la app de cámara e impórtalo.', 'error'); return; }
    estado.trozos = []; var mt = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(function (t) { return MediaRecorder.isTypeSupported(t); }) || '';
    try { estado.rec = new MediaRecorder(estado.stream, mt ? { mimeType: mt } : {}); } catch (e) { T.aviso('No pude grabar: ' + e.message, 'error'); return; }
    estado.rec.ondataavailable = function (e) { if (e.data.size) estado.trozos.push(e.data); };
    estado.rec.onstop = function () { el.btnRec.textContent = 'Grabar video'; el.btnRec.setAttribute('aria-pressed', 'false'); var b = new Blob(estado.trozos, { type: estado.rec.mimeType || 'video/webm' }); if (b.size) extraerDeVideo(b, 'grabacion'); };
    estado.rec.start(500); el.btnRec.textContent = 'Detener grabación'; el.btnRec.setAttribute('aria-pressed', 'true');
  }
  function botones() { var on = !!estado.stream;[el.btnCap, el.btnAuto, el.btnRec, el.btnCerrar].forEach(function (b) { if (b) b.disabled = !on; }); if (el.btnAbrir) el.btnAbrir.disabled = on; }

  /* ---------- video -> cuadros nitidos ---------- */
  function esperar(v, evento) { return new Promise(function (ok, ko) { var fin = function () { v.removeEventListener(evento, fin); v.removeEventListener('error', mal); ok(); }, mal = function () { v.removeEventListener(evento, fin); v.removeEventListener('error', mal); ko(new Error('No pude leer el video.')); }; v.addEventListener(evento, fin, { once: true }); v.addEventListener('error', mal, { once: true }); }); }
  async function duracion(v) { if (isFinite(v.duration) && v.duration > 0) return v.duration; v.currentTime = 1e7; await esperar(v, 'timeupdate').catch(function () { }); var d = v.duration; v.currentTime = 0; await esperar(v, 'seeked').catch(function () { }); return isFinite(d) ? d : 0; }
  async function extraerDeVideo(blobOFile, nombre) {
    var n = Math.max(2, Math.min(80, +el.nCuadros.value || 24)), u = URL.createObjectURL(blobOFile), v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
    el.prog.hidden = false; setProg(0, 'Leyendo video…');
    try {
      await esperar(v, 'loadedmetadata'); var dur = await duracion(v); if (!dur) throw new Error('El video no tiene duración legible.'); if (!v.videoWidth) throw new Error('El video no tiene imagen.');
      var nc = Math.min(160, Math.max(n * 3, 12)), cands = [], aj = A.ajustes();
      for (var i = 0; i < nc; i++) { var t = dur * (i + 0.5) / nc; v.currentTime = t; await esperar(v, 'seeked'); var img = I.deFuente(v, v.videoWidth, v.videoHeight, aj.lado); cands.push({ t: t, nit: R.Nitidez.medir(img), img: img }); setProg((i + 1) / nc * 0.9, 'Analizando nitidez ' + (i + 1) + '/' + nc); await new Promise(function (r) { setTimeout(r, 0); }); }
      var sel = R.Nitidez.seleccionar(cands, n, +el.umbral.value / 100), a = 0;
      sel.elegidos.forEach(function (ix, k) { var c = cands[ix]; if (A.agregarFoto(c.img, { meta: estado.modo === 'lateral' ? 'lateral' : estado.modo, t: c.t, nit: c.nit, nombre: 'Cuadro ' + (A.fotos.length + 1) + ' · ' + c.t.toFixed(1) + ' s', angulo: (estado.modo === 'mesa' || estado.modo === 'rodeo') ? k * 360 / sel.elegidos.length : undefined })) a++; });
      setProg(1, 'Listo'); T.aviso(a + ' cuadros nítidos añadidos; ' + sel.descartados.length + ' borrosos descartados (' + nc + ' analizados).'); A.logro('r3d_video_cuadros'); if (estado.modo === 'mesa' || estado.modo === 'rodeo') { estado.n = Math.max(4, a); el.nSel.value = estado.n; }
    } catch (e) { T.aviso(e.message, 'error'); } finally { URL.revokeObjectURL(u); setTimeout(function () { el.prog.hidden = true; }, 1200); mensaje(); }
  }
  function setProg(p, t) { el.progBarra.style.width = Math.round(p * 100) + '%'; el.progTxt.textContent = t || ''; }

  /* ---------- archivos ---------- */
  async function porArchivos(files) {
    var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name); }), vids = Array.prototype.filter.call(files, function (f) { return /^video\//.test(f.type) || /\.(mp4|webm|mov|m4v|mkv)$/i.test(f.name); }), ok = 0;
    imgs.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    for (var i = 0; i < imgs.length; i++) { try { var img = await I.deArchivo(imgs[i], lado()), k = A.fotos.length, m = estado.modo, meta = { meta: m, nombre: imgs[i].name }; if (m === 'mesa' || m === 'rodeo') meta.angulo = k * 360 / Math.max(estado.n, imgs.length); if (A.agregarFoto(img, meta)) ok++; else break; } catch (e) { T.aviso(e.message, 'error'); } }
    if (ok) { T.aviso(ok + ' foto(s) añadidas (reducidas a ' + lado() + ' px para ahorrar memoria).'); A.logro('r3d_importo_fotos'); if ((estado.modo === 'mesa' || estado.modo === 'rodeo') && ok > 3) { estado.n = ok; el.nSel.value = ok; } }
    if (vids.length) await extraerDeVideo(vids[0], vids[0].name); mensaje(); dibujarAnillo();
  }

  /* ---------- galeria ---------- */
  function galeria() {
    el.gal.textContent = ''; var mem = A.memoriaMB(), lim = A.ajustes().limiteMB;
    el.resumen.textContent = A.fotos.length ? A.fotos.length + ' fotos (' + A.fotosUsables().length + ' en uso) · memoria ' + mem.toFixed(0) + ' de ' + lim + ' MB' : 'Aún no hay fotos.';
    var med = A.fotos.filter(function (f) { return f.nit != null; }).map(function (f) { return f.nit; }).sort(function (a, b) { return a - b; })[0];
    A.fotos.forEach(function (f, i) {
      var b = h('button', { type: 'button', cls: 'r3d-gal' + (f.usar ? '' : ' off') + (f.id === A.seleccion ? ' sel' : ''), 'aria-pressed': f.usar, 'aria-label': (f.nombre || 'Foto ' + (i + 1)) + (f.usar ? ', en uso. Pulsa para excluir' : ', excluida. Pulsa para incluir'), title: 'Pulsa para incluir/excluir' }, [h('img', { src: I.miniatura({ w: f.w, h: f.h, data: f.data }, 110), alt: '' }), h('span', { txt: (f.angulo != null ? Math.round(f.angulo) + '° ' : '') + (f.nit != null ? 'n' + Math.round(f.nit) : f.nombre || '') })]);
      b.addEventListener('click', function () { f.usar = !f.usar; A.seleccion = f.id; A.emitir('fotos'); }); el.gal.appendChild(b);
    }); void med;
  }

  /* ---------- dron ---------- */
  var drones = { proyectos: [], pts: null, log: null };
  function cargarScript(src) { return new Promise(function (ok, ko) { if (document.querySelector('script[src="' + src + '"]')) { ok(); return; } var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error('No pude cargar ' + src)); }; document.head.appendChild(s); }); }
  async function leerDrones() {
    try { var alm = g.Almacen.crear('trabajos_drones'); await alm.listo; drones.proyectos = (await alm.lista('proyectos')).filter(function (p) { return p.mision && p.mision.wps && p.mision.wps.length; }); }
    catch (e) { drones.proyectos = []; }
    el.selDron.textContent = ''; if (!drones.proyectos.length) { el.selDron.appendChild(h('option', { value: '', txt: 'No hay planes de vuelo guardados en el módulo Drones' })); el.infoDron.textContent = 'Crea un plan en Trabajos > Drones y cámaras (pestaña Misión). También puedes usar solo el video sin plan.'; return; }
    drones.proyectos.forEach(function (p, i) { el.selDron.appendChild(h('option', { value: i, txt: p.nombre + ' · ' + p.mision.wps.length + ' puntos' })); }); infoDron();
  }
  function ptsPlan() { var p = drones.proyectos[+el.selDron.value]; return p ? p.mision.wps.map(function (w) { return { x: w.x, y: w.y, alt: w.alt }; }) : null; }
  function infoDron() { var pts = ptsPlan(); if (!pts) return; var c = Po().centro(pts), o = Po().orbita(pts, c); el.dcx.value = c[0].toFixed(1); el.dcy.value = c[1].toFixed(1); el.infoDron.textContent = o.esOrbita ? 'Parece una órbita: radio ≈ ' + o.radio.toFixed(1) + ' m, altura ≈ ' + o.alt.toFixed(1) + ' m. Buena candidata para siluetas.' : 'La ruta no parece una órbita (dispersión de radio ' + Math.round(o.dispersion * 100) + ' %). Sirve para estéreo/paralaje, no para siluetas.'; }
  function Po() { return R.Poses; }
  async function leerLog(file) {
    try { await cargarScript('../drones/js/geo.js'); await cargarScript('../drones/js/telemetria.js'); var r = g.DronTelem.parseLog(await file.text(), file.name); drones.log = r.muestras; el.logInfo.textContent = 'Log «' + file.name + '»: ' + r.muestras.length + ' muestras.'; } catch (e) { drones.log = null; el.logInfo.textContent = ''; T.aviso('No pude leer el log: ' + e.message, 'error'); }
  }
  function asignarPoses() {
    var fs = A.fotosUsables(); if (fs.length < 2) { T.aviso('Primero añade los cuadros del video del vuelo (Elegir video).', 'error'); return; }
    var c = [+el.dcx.value || 0, +el.dcy.value || 0], ty = +el.dty.value || 0, pts, fuente;
    try {
      if (drones.log && el.usarLog.checked) { var t0 = fs[0].t || 0; pts = Po().desdeLog(drones.log, fs.map(function (f) { return (f.t || 0) - t0; }), +el.dOff.value || 0); fuente = 'log'; }
      else { var plan = ptsPlan(); if (!plan) { T.aviso('Elige un plan de vuelo o carga un log.', 'error'); return; } pts = Po().muestrearRuta(plan, fs.length); fuente = 'plan'; }
    } catch (e) { T.aviso(e.message, 'error'); return; }
    var o = Po().orbita(pts, c); A.dron = { pts: pts, centro: c, ty: ty, fuente: fuente, ids: fs.map(function (f) { return f.id; }), orbita: o };
    el.dronRes.textContent = 'Poses asignadas desde el ' + fuente + ' a ' + fs.length + ' cuadros. Radio medio ' + o.radio.toFixed(1) + ' m (dispersión ' + Math.round(o.dispersion * 100) + ' %), altura ' + o.alt.toFixed(1) + ' m. ' + (o.esOrbita ? '' : 'Aviso: no es una órbita; el visual hull saldrá mal. ') + 'Estas poses son aproximadas (GPS ±2–5 m, sin cardán real).';
    A.logro('r3d_dron_poses'); A.emitir('dron');
  }

  function ejemploGiro() {
    var w = 160, h2 = 160, n = 24, F = R.Hull.focalDesdeFov(34, w), elevs = []; for (var i = 0; i < n; i++) elevs.push(i % 2 ? 40 : 5);
    var cams = R.Hull.camarasGiro({ n: n, dist: 7, elevs: elevs, F: F, w: w, h: h2 }), vs = R.Ejemplos.vistasGiro('taza', cams);
    A.fotos = A.fotos.filter(function (f) { return f.meta !== 'ejemplo'; }); vs.forEach(function (v, k) { A.agregarFoto({ w: w, h: h2, data: v.img.data }, { meta: 'ejemplo', nombre: 'Ejemplo ' + (k + 1), angulo: k * 360 / n, elev: elevs[k] }); });
    A.params.ejemploHull = { fov: 34, dist: 7, elevs: elevs, escalaNota: 'Ejemplo sintético: objeto de ~2 unidades, volumen verdadero ' + R.Ejemplos.volumenVerdad('taza').toFixed(2) + ' u³.' }; estado.modo = 'mesa'; estado.n = n; sincronizarModo(); A.emitir('ejemplo'); T.aviso('Ejemplo cargado: 24 vistas sintéticas. Ve a «Reconstruir».');
  }
  function ejemploPar() {
    var w = 192, h2 = 128, par = R.Ejemplos.parEstereo(w, h2, { d0: 10, gx: 0.03, bulto: 6 }); A.fotos = A.fotos.filter(function (f) { return f.meta !== 'ejemplo-par'; });
    var a = A.agregarFoto({ w: w, h: h2, data: par.L.data }, { meta: 'ejemplo-par', nombre: 'Izquierda (ejemplo)' }), b = A.agregarFoto({ w: w, h: h2, data: par.R.data }, { meta: 'ejemplo-par', nombre: 'Derecha (ejemplo)' });
    if (a && b) { A.params.par = [a.id, b.id]; A.params.ejemploPar = { fov: 60, base: 6, dmin: 0, dmax: 24 }; A.emitir('ejemplo'); T.aviso('Par sintético cargado (base 6 cm, FOV 60°). Ve a «Reconstruir» > Estéreo.'); }
  }
  function sincronizarModo() {
    Array.prototype.forEach.call(el.modos.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === estado.modo); }); el.guia.textContent = GUIAS[estado.modo]; el.nSel.value = estado.n;
    el.filaN.hidden = estado.modo === 'par' || estado.modo === 'lateral'; el.filaAuto.hidden = estado.modo === 'lateral'; estado.primera = null; el.ghost.hidden = true; mensaje(); dibujarAnillo();
  }

  V.iniciar = function (raiz) {
    el.modos = h('div', { cls: 'r3d-seg', role: 'group', 'aria-label': 'Tipo de captura' }, [['mesa', 'Mesa giratoria'], ['rodeo', 'Recorrido'], ['par', 'Par estéreo'], ['lateral', 'Video lateral']].map(function (m) { return h('button', { type: 'button', 'data-m': m[0], 'aria-pressed': m[0] === 'mesa', txt: m[1], on: { click: function () { estado.modo = m[0]; sincronizarModo(); } } }); }));
    el.guia = h('p', { cls: 'tr-nota', txt: GUIAS.mesa });
    el.nSel = h('input', { type: 'number', min: 4, max: 90, value: 24, inputmode: 'numeric', on: { change: function () { estado.n = Math.max(4, Math.min(90, +el.nSel.value || 24)); mensaje(); dibujarAnillo(); } } });
    el.seg = h('input', { type: 'number', min: 1, max: 30, value: 3, inputmode: 'numeric' });
    el.filaN = h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Fotos por vuelta' }), el.nSel]), h('div', {}, [h('label', { txt: 'Segundos entre fotos (automático)' }), el.seg])]);
    el.btnAbrir = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Abrir cámara', on: { click: abrirCamara } }); el.btnCap = h('button', { type: 'button', cls: 'tr-btn', txt: 'Capturar foto', on: { click: capturar } });
    el.btnAuto = h('button', { type: 'button', cls: 'tr-btn', txt: 'Automático', 'aria-pressed': 'false', on: { click: alternarAuto } }); el.btnRec = h('button', { type: 'button', cls: 'tr-btn', txt: 'Grabar video', 'aria-pressed': 'false', on: { click: grabar } }); el.btnCerrar = h('button', { type: 'button', cls: 'tr-btn', txt: 'Cerrar cámara', on: { click: cerrarCamara } });
    el.filaAuto = h('div', { cls: 'tr-acciones' }, [el.btnAuto]);
    var fFotos = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, id: 'in-fotos' }), fVid = h('input', { type: 'file', accept: 'video/*', hidden: true, id: 'in-video' });
    fFotos.addEventListener('change', function () { porArchivos(fFotos.files); fFotos.value = ''; }); fVid.addEventListener('change', function () { if (fVid.files[0]) porArchivos(fVid.files); fVid.value = ''; });
    el.nCuadros = h('input', { type: 'number', min: 2, max: 80, value: 24, inputmode: 'numeric' }); el.umbral = h('input', { type: 'range', min: 0, max: 100, value: 50 });
    el.umbralVal = h('span', { cls: 'r3d-val', txt: '50 %' }); el.umbral.addEventListener('input', function () { el.umbralVal.textContent = el.umbral.value + ' %'; });
    el.progBarra = h('i'); el.progTxt = h('div', { cls: 'tr-ayuda', 'aria-live': 'polite' }); el.prog = h('div', { hidden: true }, [h('div', { cls: 'r3d-prog' }, [el.progBarra]), el.progTxt]);
    el.gal = h('div', { cls: 'r3d-galeria' }); el.resumen = h('p', { cls: 'tr-ayuda' });
    el.selDron = h('select', { 'aria-label': 'Plan de vuelo', on: { change: infoDron } }); el.infoDron = h('p', { cls: 'tr-ayuda' }); el.dcx = h('input', { type: 'number', step: 'any', value: 0 }); el.dcy = h('input', { type: 'number', step: 'any', value: 0 }); el.dty = h('input', { type: 'number', step: 'any', value: 0 }); el.dOff = h('input', { type: 'number', step: 'any', value: 0 });
    el.usarLog = h('input', { type: 'checkbox' }); el.logInfo = h('p', { cls: 'tr-ayuda' }); el.dronRes = h('p', { cls: 'tr-nota', 'aria-live': 'polite', txt: 'Sin poses de dron asignadas.' });
    var fLog = h('input', { type: 'file', accept: '.csv,.json,.txt,.ndjson', 'aria-label': 'Log de vuelo' }); fLog.addEventListener('change', function () { if (fLog.files[0]) leerLog(fLog.files[0]); });
    var dron = h('details', { cls: 'tr-panel' }, [h('summary', { txt: 'Desde un vuelo de dron (módulo Drones)' }), h('p', { cls: 'tr-ayuda', txt: 'Importa el video del vuelo con «Elegir video»; aquí asignas a cada cuadro una posición de cámara tomada del plan guardado en Drones o de un log de vuelo. Las poses son aproximadas.' }),
      h('button', { type: 'button', cls: 'tr-btn', txt: 'Leer planes guardados en Drones', on: { click: leerDrones } }), el.selDron, el.infoDron,
      h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Centro este (m)' }), el.dcx]), h('div', {}, [h('label', { txt: 'Centro norte (m)' }), el.dcy]), h('div', {}, [h('label', { txt: 'Altura del objetivo (m)' }), el.dty])]),
      h('label', { txt: 'Log de vuelo (CSV/JSON, opcional)' }), fLog, el.logInfo, h('label', { cls: 'tr-chk' }, [el.usarLog, 'Usar el log en vez del plan (alinea por tiempo del video)']), h('label', { txt: 'Desfase video-log (s)' }), el.dOff,
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Asignar poses a los cuadros', on: { click: asignarPoses } })]), el.dronRes]);
    raiz.appendChild(h('div', { cls: 'r3d-grid' }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Cámara guiada' }), el.modos, el.guia, el.filaN, crearCamara(), h('div', { cls: 'tr-acciones' }, [el.btnAbrir, el.btnCap, el.btnRec, el.btnCerrar]), el.filaAuto, h('p', { cls: 'tr-ayuda', txt: 'La cámara solo se usa en tu dispositivo; los cuadros no salen de él.' })])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Fotos y video' }), fFotos, fVid,
        h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Elegir fotos', on: { click: function () { fFotos.click(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Elegir video', on: { click: function () { fVid.click(); } } })]),
        h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Cuadros a conservar del video' }), el.nCuadros]), h('div', { cls: 'r3d-rango' }, [h('label', {}, [h('span', { txt: 'Descartar borrosos' }), el.umbralVal]), el.umbral])]),
        h('p', { cls: 'tr-ayuda', txt: 'Del video se toman muchos cuadros, se mide la nitidez y se queda el más nítido de cada tramo; los que están por debajo de la mitad de la nitidez mediana se descartan.' }), el.prog]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Galería' }), el.resumen, el.gal, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Quitar todas', on: { click: function () { A.fotos = []; A.params.par = null; A.emitir('fotos'); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Ejemplo: mesa giratoria', on: { click: ejemploGiro } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Ejemplo: par estéreo', on: { click: ejemploPar } })]), h('p', { cls: 'tr-ayuda', txt: 'Los ejemplos son escenas sintéticas con volumen y disparidad conocidos, para probar sin cámara.' })]), dron])]));
    A.on('fotos', function () { galeria(); mensaje(); dibujarAnillo(); }); A.on('capas', galeria); botones(); galeria(); sincronizarModo();
    g.addEventListener('beforeunload', function () { try { cerrarCamara(); } catch (e) { } });
    V.estado = estado;
  };
})(window);
