/* Pestana Reconstruir: visual hull por siluetas (segmentacion, calibracion, tallado) y estereo por bloques. window.R3D.VRecon */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, R = g.R3D, A = R.App, I = R.Img, S = R.Seg, V = R.VRecon = {};
  var el = {}, st = { sel: 0, pincel: null, radio: 10, clave: null, corriendo: false };

  function rango(etq, min, max, val, paso, fmt, alCambiar) {
    var inp = h('input', { type: 'range', min: min, max: max, step: paso || 1, value: val }), v = h('span', { cls: 'r3d-val' }), f = function () { v.textContent = fmt ? fmt(+inp.value) : inp.value; if (alCambiar) alCambiar(+inp.value); };
    inp.addEventListener('input', f); v.textContent = fmt ? fmt(val) : val; return { el: h('div', { cls: 'r3d-rango' }, [h('label', {}, [h('span', { txt: etq }), v]), inp]), inp: inp, ver: f };
  }
  function numero(etq, val, extra) { var i = h('input', Object.assign({ type: 'number', step: 'any', value: val, inputmode: 'decimal' }, extra || {})); return { el: h('div', {}, [h('label', { txt: etq }), i]), inp: i }; }
  function barra() { var b = h('i'), t = h('div', { cls: 'tr-ayuda', 'aria-live': 'polite' }), c = h('div', { hidden: true }, [h('div', { cls: 'r3d-prog' }, [b]), t]); return { el: c, set: function (p, x) { c.hidden = false; b.style.width = Math.round(p * 100) + '%'; t.textContent = x || ''; }, ocultar: function () { c.hidden = true; } }; }

  /* =============== SILUETAS =============== */
  var H = { fotos: function () { return A.fotosUsables(); } };
  function pintarVista() {
    var fs = H.fotos(), f = fs[st.sel]; var c = el.lienzo; if (!f) { c.width = 4; c.height = 4; c.getContext('2d').clearRect(0, 0, 4, 4); el.infoFoto.textContent = 'No hay fotos en uso. Añádelas en Captura.'; return; }
    c.width = f.w; c.height = f.h; var x = c.getContext('2d'), d = new ImageData(new Uint8ClampedArray(f.data), f.w, f.h);
    if (f.mascara) for (var i = 0; i < f.mascara.length; i++) if (!f.mascara[i]) { d.data[i * 4] = d.data[i * 4] * 0.3 + 255 * 0.7 * 0.55; d.data[i * 4 + 1] = d.data[i * 4 + 1] * 0.3; d.data[i * 4 + 2] = d.data[i * 4 + 2] * 0.3 + 128 * 0.5; }
    x.putImageData(d, 0, 0);
    var b = f.mascara && S.cajaMascara(f.mascara, f.w, f.h); el.infoFoto.textContent = (f.nombre || 'Foto') + ' · ' + f.w + '×' + f.h + (f.mascara ? ' · objeto ' + (b ? Math.round(b.n / (f.w * f.h) * 100) + ' % del cuadro' : 'vacío (revisa la tolerancia)') : ' · sin segmentar');
    el.nSegm.textContent = fs.filter(function (q) { return q.mascara; }).length + ' de ' + fs.length + ' segmentadas';
  }
  function tira() {
    el.tira.textContent = ''; var fs = H.fotos(); if (st.sel >= fs.length) st.sel = 0;
    fs.forEach(function (f, i) { var b = h('button', { type: 'button', cls: 'r3d-gal' + (i === st.sel ? ' sel' : '') + (f.mascara ? '' : ' mala'), 'aria-label': 'Foto ' + (i + 1) + (f.mascara ? ' segmentada' : ' sin segmentar'), 'aria-pressed': i === st.sel }, [h('img', { src: I.miniatura({ w: f.w, h: f.h, data: f.data }, 80), alt: '' }), h('span', { txt: '' + (i + 1) })]); b.addEventListener('click', function () { st.sel = i; tira(); pintarVista(); }); el.tira.appendChild(b); });
    pintarVista(); estimar();
  }
  function segmentarUna(f) {
    var modo = el.segModo.value, tol = +el.tol.value, img = { w: f.w, h: f.h, data: f.data }, m;
    if (modo === 'alfa') { if (!S.tieneAlfa(img)) throw new Error('La foto no tiene transparencia. Usa otro modo.'); m = S.desdeAlfa(img); }
    else if (modo === 'pintar') { m = f.mascara || new Uint8Array(f.w * f.h).fill(1); return; }
    else { var clave = modo === 'elegido' && st.clave ? st.clave : S.estimarFondo(img); if (modo === 'elegido' && !st.clave) { el.clave.textContent = 'Toca el fondo de la imagen para elegir su color.'; } m = S.porColor(img, clave, tol); }
    f.mascara = S.limpiar(m, f.w, f.h, { abrir: +el.abrir.value, cerrar: +el.cerrar.value }); f.maskVer = (f.maskVer || 0) + 1;
  }
  function segmentar(todas) {
    var fs = H.fotos(); if (!fs.length) { T.aviso('No hay fotos.', 'error'); return; }
    try { (todas ? fs : [fs[st.sel]]).forEach(segmentarUna); } catch (e) { T.aviso(e.message, 'error'); return; }
    var vacias = fs.filter(function (f) { return f.mascara && !S.cajaMascara(f.mascara, f.w, f.h); }).length; if (vacias) T.aviso(vacias + ' foto(s) quedaron sin objeto: ajusta la tolerancia o elige el color del fondo.', 'error');
    tira(); A.logro('r3d_segmento');
  }
  function eventoLienzo() {
    var c = el.lienzo, abajo = false;
    function pos(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * c.width, (e.clientY - r.top) / r.height * c.height]; }
    function pintar(e) { var f = H.fotos()[st.sel]; if (!f || !st.pincel) return; if (!f.mascara) f.mascara = new Uint8Array(f.w * f.h).fill(el.segModo.value === 'pintar' ? 0 : 1); var p = pos(e); S.pintar(f.mascara, f.w, f.h, p[0], p[1], st.radio * f.w / 300, st.pincel === '+' ? 1 : 0); pintarVista(); }
    c.addEventListener('pointerdown', function (e) {
      var f = H.fotos()[st.sel]; if (!f) return;
      if (st.pincel) { abajo = true; c.setPointerCapture(e.pointerId); pintar(e); return; }
      var p = pos(e), x = Math.max(0, Math.min(f.w - 1, Math.round(p[0]))), y = Math.max(0, Math.min(f.h - 1, Math.round(p[1]))), o = (y * f.w + x) * 4; st.clave = [f.data[o], f.data[o + 1], f.data[o + 2]]; el.clave.textContent = 'Color de fondo elegido: rgb(' + st.clave.join(', ') + ')'; el.segModo.value = 'elegido'; segmentar(false);
    });
    c.addEventListener('pointermove', function (e) { if (abajo) pintar(e); }); c.addEventListener('pointerup', function () { abajo = false; }); c.addEventListener('pointercancel', function () { abajo = false; });
  }
  function camarasSilueta(fs) {
    var Hu = R.Hull, n = fs.length, F0 = +el.fov.value, dist = +el.dist.value, ty = +el.ty.value || 0, off = +el.ejeOff.value || 0, cams = [];
    if (el.camModo.value === 'dron') {
      if (!A.dron || A.dron.ids.length !== n) throw new Error('Las poses del dron no coinciden con las fotos en uso (' + (A.dron ? A.dron.ids.length : 0) + ' poses, ' + n + ' fotos). Vuelve a asignarlas en Captura.');
      return A.dron.pts.map(function (p, i) { var f = fs[i]; return Hu.camara([p.x - A.dron.centro[0], p.alt, -(p.y - A.dron.centro[1])], [0, A.dron.ty, 0], Hu.focalDesdeFov(F0, f.w), f.w, f.h, f.w / 2 + off); });
    }
    var vueltas = +el.vueltas.value, e1 = +el.elev1.value, e2 = +el.elev2.value, sentido = el.sentido.value === 'horario' ? -1 : 1, a0 = +el.ang0.value, a1 = +el.ang1.value, n1 = vueltas === 2 ? Math.ceil(n / 2) : n;
    fs.forEach(function (f, i) {
      var anillo = i < n1 ? 0 : 1, k = anillo ? i - n1 : i, nn = anillo ? n - n1 : n, full = Math.abs(a1 - a0 - 360) < 1e-6, den = full ? nn : Math.max(1, nn - 1), ang = f.angulo != null && vueltas === 1 && el.usarAngFoto.checked ? f.angulo * (a1 - a0) / 360 + a0 : a0 + (a1 - a0) * k / den, el2 = f.elev != null ? f.elev : (anillo ? e2 : e1);
      var th = sentido * ang * Math.PI / 180, ey = el2 * Math.PI / 180;
      cams.push(Hu.camara([dist * Math.cos(ey) * Math.sin(th), ty + dist * Math.sin(ey), dist * Math.cos(ey) * Math.cos(th)], [0, ty, 0], Hu.focalDesdeFov(F0, f.w), f.w, f.h, f.w / 2 + off));
    });
    return cams;
  }
  function estimar() {
    var fs = H.fotos(); if (fs.length < 3) { el.estim.textContent = 'Necesitas al menos 6 fotos en uso (ideal 24 o más).'; return; }
    try {
      var cams = camarasSilueta(fs), vistas = fs.filter(function (f) { return f.mascara; }).map(function (f, i) { return { cam: cams[fs.indexOf(f)], mascara: f.mascara }; });
      if (!vistas.length) { el.estim.textContent = 'Primero segmenta las fotos para estimar el tamaño.'; return; }
      var caja = R.Hull.cajaDesdeVistas(vistas, 0.06), nv = R.Ops.estimarVoxeles(+el.res.inp.value, caja), mb = nv * 4 / 1048576, u = A.unidad.nombre;
      var tam = caja.max.map(function (v, i) { return v - caja.min[i]; });
      el.estim.textContent = 'Caja estimada ≈ ' + tam.map(function (v) { return A.fmt(v, 1); }).join(' × ') + ' ' + (A.capas.length ? 'cm' : 'cm') + ' · ' + (nv / 1e6).toFixed(2) + ' M de voxeles (≈ ' + mb.toFixed(0) + ' MB) ' + (nv > R.Ops.MAX_VOXELES ? '· EXCEDE el límite: baja la resolución' : '');
      el.estim.className = 'tr-ayuda' + (nv > R.Ops.MAX_VOXELES ? ' r3d-apr' : ''); void u;
    } catch (e) { el.estim.textContent = e.message; }
  }
  async function generarHull() {
    if (st.corriendo) return; var fs = H.fotos(); if (fs.length < 6) { T.aviso('Necesitas al menos 6 fotos en uso.', 'error'); return; }
    if (fs.some(function (f) { return !f.mascara; })) segmentar(true); if (fs.some(function (f) { return !f.mascara || !S.cajaMascara(f.mascara, f.w, f.h); })) { T.aviso('Hay fotos sin objeto detectado. Corrígelas (tolerancia, color de fondo o pincel).', 'error'); return; }
    var cams; try { cams = camarasSilueta(fs); } catch (e) { T.aviso(e.message, 'error'); return; }
    var res = +el.res.inp.value, datos = { vistas: fs.map(function (f, i) { return { cam: cams[i], mascara: f.mascara, rgba: f.data }; }), res: res, ignorar: +el.tolera.inp.value, colorear: el.colorear.checked, nombre: 'Siluetas ' + new Date().toLocaleTimeString('es') };
    var rv = A.revisarMemoria(R.Ops.estimarVoxeles(res, R.Hull.cajaDesdeVistas(datos.vistas.map(function (v) { return { cam: v.cam, mascara: v.mascara }; }), 0.06)) * 4 * 1.5); if (!rv.ok) { T.aviso('Con esta resolución se superaría el límite de memoria. Bájala o libera capas.', 'error'); return; }
    st.corriendo = true; el.btnGen.disabled = true; el.progH.set(0.01, 'Preparando…');
    try {
      var t0 = Date.now(), m = await A.trabajar('giro', datos, function (p, t) { el.progH.set(p, t); }); var c = A.anadirCapa(m, { nombre: m.nombre, origen: 'siluetas', unidad: { nombre: 'cm', k: 1 } });
      var e = R.Malla.estadisticas(m); el.resH.textContent = 'Listo en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s: ' + e.triangulos.toLocaleString('es') + ' triángulos, volumen ≈ ' + A.fmt(e.volumen, 1) + ' cm³, caja ' + e.caja.tam.map(function (v) { return A.fmt(v, 1); }).join(' × ') + ' cm' + (e.estanca ? ' · malla estanca' : '') + '. Recuerda: es una envolvente (no ve concavidades) y la escala depende de la distancia y el FOV indicados.'; if (A.params.ejemploHull) el.resH.textContent += ' (Ejemplo sintético: verdad ' + R.Ejemplos.volumenVerdad('taza').toFixed(2) + ' u³.)';
      A.logro('r3d_primer_modelo'); A.logro('r3d_visual_hull'); if (c) { el.progH.set(1, 'Listo'); setTimeout(function () { A.irA('visor'); }, 400); }
    } catch (e) { T.aviso(e.message, 'error'); el.resH.textContent = 'No se pudo generar: ' + e.message; el.progH.ocultar(); } finally { st.corriendo = false; el.btnGen.disabled = false; }
  }
  function aplicarEjemploHull() { var e = A.params.ejemploHull; if (!e) return; el.fov.value = e.fov; el.dist.value = e.dist; el.ty.value = 0; el.camModo.value = 'mesa'; el.vueltas.value = '1'; el.usarAngFoto.checked = true; el.nota.textContent = e.escalaNota; el.segModo.value = 'auto'; st.sel = 0; tira(); segmentar(true); }

  /* =============== ESTEREO =============== */
  function selFotos(sel, def) { sel.textContent = ''; A.fotos.forEach(function (f, i) { sel.appendChild(h('option', { value: f.id, txt: (i + 1) + '. ' + (f.nombre || 'foto') })); }); if (def) sel.value = def; }
  function miniPar() { var a = A.fotos.filter(function (f) { return f.id === el.selA.value; })[0], b = A.fotos.filter(function (f) { return f.id === el.selB.value; })[0];[[a, el.cvA], [b, el.cvB]].forEach(function (p) { if (p[0]) I.aCanvas({ w: p[0].w, h: p[0].h, data: p[0].data }, p[1]); else { p[1].width = 4; p[1].height = 4; } }); }
  function refrescarPar() { selFotos(el.selA, A.params.par && A.params.par[0]); selFotos(el.selB, A.params.par && A.params.par[1]); if (!A.params.par && A.fotos.length > 1) { el.selA.value = A.fotos[0].id; el.selB.value = A.fotos[1].id; } miniPar(); }
  function baseVideo() { var lat = A.fotos.filter(function (f) { return f.meta === 'lateral'; }), a = el.selA.selectedIndex, b = el.selB.selectedIndex; if (lat.length < 2) { T.aviso('Necesitas cuadros de un video lateral (modo «Video lateral» en Captura).', 'error'); return; } var ia = lat.findIndex(function (f) { return f.id === el.selA.value; }), ib = lat.findIndex(function (f) { return f.id === el.selB.value; }); if (ia < 0 || ib < 0) { T.aviso('Elige cuadros del video lateral en ambos selectores.', 'error'); return; } void a; void b; var base = R.Estereo.baseVideo(lat.length, +el.recorrido.inp.value, ia, ib); el.base.inp.value = base.toFixed(2); el.sugerida.textContent = 'Base = recorrido × |Δ cuadro| / (n−1) = ' + base.toFixed(2) + ' cm (supone velocidad uniforme).'; }
  function sugerir() { var f = R.Estereo.focalDesdeFov(+el.fovE.inp.value, (A.fotos.filter(function (q) { return q.id === el.selA.value; })[0] || { w: 480 }).w), b = R.Estereo.baseSugerida(+el.zObj.inp.value, f, +el.dObj.inp.value); el.sugerida.textContent = 'Para ver ≈ ' + el.dObj.inp.value + ' px de disparidad a ' + el.zObj.inp.value + ' cm hace falta una base ≈ ' + b.toFixed(1) + ' cm (F ≈ ' + Math.round(f) + ' px).'; }
  async function generarEstereo() {
    if (st.corriendo) return; var a = A.fotos.filter(function (f) { return f.id === el.selA.value; })[0], b = A.fotos.filter(function (f) { return f.id === el.selB.value; })[0];
    if (!a || !b || a === b) { T.aviso('Elige dos fotos distintas (izquierda y derecha).', 'error'); return; } if (a.w !== b.w || a.h !== b.h) { T.aviso('Las dos fotos deben tener el mismo tamaño (' + a.w + '×' + a.h + ' vs ' + b.w + '×' + b.h + ').', 'error'); return; }
    var B = +el.base.inp.value; if (!(B > 0)) { T.aviso('Escribe la base (distancia entre las dos posiciones de cámara) en cm.', 'error'); return; }
    var F = R.Estereo.focalDesdeFov(+el.fovE.inp.value, a.w), dmax = Math.min(+el.dmax.inp.value, Math.floor(a.w * 0.4));
    var datos = { L: { w: a.w, h: a.h, data: a.data }, R: { w: b.w, h: b.h, data: b.data }, F: F, B: B, dmin: Math.max(0, +el.dmin.inp.value), dmax: dmax, ventana: +el.vent.value, unicidad: +el.uni.inp.value, rectificar: el.rectif.checked, paso: +el.paso.value, zMax: +el.zMax.inp.value > 0 ? +el.zMax.inp.value : undefined };
    st.corriendo = true; el.btnE.disabled = true; el.progE.set(0.01, 'Preparando…');
    try {
      var t0 = Date.now(), r = await A.trabajar('estereo', datos, function (p, t) { el.progE.set(p, t); });
      I.aCanvas({ w: r.vis.w, h: r.vis.h, data: r.vis.data }, el.cvD); el.cvD.hidden = false;
      var n = r.nube.pos.length / 3; if (n < 50) throw new Error('Casi no se encontraron correspondencias (' + Math.round(r.stats.validos * 100) + ' % válidas). Revisa que las fotos estén alineadas, con textura y que la disparidad esté entre mín y máx.');
      var zmin = Infinity, zmax = -Infinity; for (var i = 2; i < r.nube.pos.length; i += 3) { var z = -r.nube.pos[i]; if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
      var m = R.Malla.nueva(r.nube.pos, null, r.nube.col, 'Estéreo ' + new Date().toLocaleTimeString('es')); m.tipo = 'nube'; A.anadirCapa(m, { nombre: m.nombre, origen: 'estereo', unidad: { nombre: 'cm', k: 1 } });
      el.resE.textContent = 'Listo en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s · ' + Math.round(r.stats.validos * 100) + ' % de píxeles con profundidad · ' + n.toLocaleString('es') + ' puntos · profundidad ' + A.fmt(zmin, 1) + '–' + A.fmt(zmax, 1) + ' cm · ajuste de filas: ' + (r.rect.ok ? 'dy ' + r.rect.dy.toFixed(1) + ' px, giro ' + r.rect.rot + '°' : 'no estimado') + '. Es una sola cara de la escena y solo vale con cámaras paralelas.';
      A.logro('r3d_estereo'); A.logro('r3d_primer_modelo'); el.progE.set(1, 'Listo'); setTimeout(function () { A.irA('visor'); }, 500);
    } catch (e) { T.aviso(e.message, 'error'); el.resE.textContent = 'No se pudo: ' + e.message; el.progE.ocultar(); } finally { st.corriendo = false; el.btnE.disabled = false; }
  }
  function aplicarEjemploPar() { var e = A.params.ejemploPar; if (!e) return; el.fovE.inp.value = e.fov; el.fovE.ver(); el.base.inp.value = e.base; el.dmin.inp.value = e.dmin; el.dmax.inp.value = e.dmax; el.dmin.ver(); el.dmax.ver(); el.rectif.checked = false; refrescarPar(); }

  V.iniciar = function (raiz) {
    el.sub = h('div', { cls: 'r3d-seg', role: 'group', 'aria-label': 'Método' }, [['hull', 'Siluetas (objeto)'], ['est', 'Estéreo (profundidad)']].map(function (m) { return h('button', { type: 'button', 'data-m': m[0], 'aria-pressed': m[0] === 'hull', txt: m[1], on: { click: function () { cambiar(m[0]); } } }); }));
    /* --- hull --- */
    el.lienzo = h('canvas', { cls: 'r3d-lienzo', 'aria-label': 'Foto con máscara del objeto. Toca para elegir el fondo, o pinta con el pincel.' }); el.tira = h('div', { cls: 'r3d-galeria' }); el.infoFoto = h('p', { cls: 'tr-ayuda' }); el.nSegm = h('span', { cls: 'r3d-chip' }); el.clave = h('p', { cls: 'tr-ayuda' });
    el.segModo = h('select', { 'aria-label': 'Método de segmentación' }, [['auto', 'Fondo automático (color del borde)'], ['elegido', 'Color de fondo elegido (toca la imagen)'], ['alfa', 'Transparencia del PNG'], ['pintar', 'Solo a mano (pincel)']].map(function (o) { return h('option', { value: o[0], txt: o[1] }); }));
    var tol = rango('Tolerancia de color', 0, 100, 30, 1, function (v) { return v; }), abr = rango('Quitar ruido (abrir)', 0, 4, 1, 1), cer = rango('Cerrar huecos', 0, 4, 1, 1), rad = rango('Radio del pincel', 3, 40, 10, 1, null, function (v) { st.radio = v; });
    el.tol = tol.inp; el.abrir = abr.inp; el.cerrar = cer.inp;
    function pincel(p) { st.pincel = st.pincel === p ? null : p; bMas.setAttribute('aria-pressed', st.pincel === '+'); bMenos.setAttribute('aria-pressed', st.pincel === '-'); el.lienzo.style.cursor = st.pincel ? 'crosshair' : 'default'; el.lienzo.style.touchAction = st.pincel ? 'none' : 'pan-y'; }
    var bMas = h('button', { type: 'button', cls: 'tr-btn', txt: 'Pincel + (es objeto)', 'aria-pressed': 'false', on: { click: function () { pincel('+'); } } }), bMenos = h('button', { type: 'button', cls: 'tr-btn', txt: 'Pincel − (es fondo)', 'aria-pressed': 'false', on: { click: function () { pincel('-'); } } });
    el.camModo = h('select', { 'aria-label': 'Origen de las cámaras' }, [h('option', { value: 'mesa', txt: 'Mesa giratoria / recorrido (ángulos regulares)' }), h('option', { value: 'dron', txt: 'Poses de dron (de Captura)' })]);
    var fov = numero('FOV horizontal de la cámara (°)', 60, { min: 10, max: 140 }), dist = numero('Distancia cámara–eje (cm)', 40, { min: 1 }), ty = numero('Altura del objetivo sobre la mesa (cm)', 0), off = numero('Desplazar el eje en la imagen (px)', 0), a0 = numero('Ángulo inicial (°)', 0), a1 = numero('Ángulo final (°)', 360), e1 = numero('Elevación 1.ª vuelta (°)', 20), e2 = numero('Elevación 2.ª vuelta (°)', 50);
    el.fov = fov.inp; el.dist = dist.inp; el.ty = ty.inp; el.ejeOff = off.inp; el.ang0 = a0.inp; el.ang1 = a1.inp; el.elev1 = e1.inp; el.elev2 = e2.inp;
    el.sentido = h('select', { 'aria-label': 'Sentido de giro' }, [h('option', { value: 'anti', txt: 'Antihorario (visto desde arriba)' }), h('option', { value: 'horario', txt: 'Horario (visto desde arriba)' })]); el.vueltas = h('select', { 'aria-label': 'Vueltas' }, [h('option', { value: '1', txt: '1 vuelta' }), h('option', { value: '2', txt: '2 vueltas (la 2.ª más alta)' })]);
    el.usarAngFoto = h('input', { type: 'checkbox', checked: true }); el.nota = h('p', { cls: 'tr-ayuda' });
    el.res = rango('Resolución (voxeles en el lado mayor)', 32, 160, 72, 2, null, function () { estimar(); }); el.tolera = rango('Siluetas que se pueden ignorar por voxel', 0, 4, 0, 1, function (v) { return v; });
    el.colorear = h('input', { type: 'checkbox', checked: true }); el.estim = h('p', { cls: 'tr-ayuda' }); el.progH = barra(); el.resH = h('p', { cls: 'tr-nota', 'aria-live': 'polite', txt: 'Sin resultado todavía.' });
    el.btnGen = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Generar modelo por siluetas', on: { click: generarHull } });
    [el.camModo, el.sentido, el.vueltas, el.fov, el.dist, el.ty, el.ejeOff, el.ang0, el.ang1, el.elev1, el.elev2, el.usarAngFoto].forEach(function (c) { c.addEventListener('change', estimar); });
    el.pHull = h('div', { cls: 'r3d-grid' }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: '1. Siluetas' }), h('p', { cls: 'tr-ayuda', txt: 'Fondo liso y distinto del objeto da las mejores siluetas. Revisa cada foto: lo magenta es lo que se considera fondo.' }), el.lienzo, el.infoFoto, h('div', { cls: 'r3d-herr' }, [el.nSegm]), el.tira]),
        h('div', { cls: 'tr-panel' }, [h('label', { txt: 'Método' }), el.segModo, el.clave, tol.el, abr.el, cer.el, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Segmentar esta foto', on: { click: function () { segmentar(false); } } }), h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Segmentar todas', on: { click: function () { segmentar(true); } } })]), h('div', { cls: 'tr-acciones' }, [bMas, bMenos]), rad.el])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: '2. Calibración por ángulo' }), h('p', { cls: 'tr-ayuda', txt: 'Cada foto se supone tomada a un ángulo regular alrededor del eje, a la misma distancia. El tamaño real sale de la distancia y el FOV; si no los sabes, el modelo tendrá la forma correcta pero la escala será aproximada.' }), h('label', { txt: 'Cámaras' }), el.camModo,
        h('div', { cls: 'tr-fila' }, [fov.el, dist.el]), h('div', { cls: 'tr-fila' }, [ty.el, off.el]), h('div', { cls: 'tr-fila' }, [a0.el, a1.el]), h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Sentido' }), el.sentido]), h('div', {}, [h('label', { txt: 'Vueltas' }), el.vueltas])]), h('div', { cls: 'tr-fila' }, [e1.el, e2.el]),
        h('label', { cls: 'tr-chk' }, [el.usarAngFoto, 'Usar el ángulo guardado en cada foto (si lo tiene)']), el.nota]),
      h('div', { cls: 'tr-panel' }, [h('h2', { txt: '3. Tallar y generar' }), el.res.el, el.tolera.el, h('label', { cls: 'tr-chk' }, [el.colorear, 'Proyectar el color de las fotos (aproximado: no resuelve oclusiones)']), el.estim, el.progH.el, h('div', { cls: 'tr-acciones' }, [el.btnGen]), el.resH, h('p', { cls: 'tr-ayuda', txt: 'Se talla un volumen de voxeles con las siluetas (distancia firmada en cada vista), se extrae la superficie con una variante de marching cubes (tetraedros) y se pinta con el color de la foto más frontal.' })])])]);
    /* --- estereo --- */
    el.selA = h('select', { 'aria-label': 'Foto izquierda', on: { change: miniPar } }); el.selB = h('select', { 'aria-label': 'Foto derecha', on: { change: miniPar } }); el.cvA = h('canvas', { cls: 'r3d-lienzo', 'aria-label': 'Foto izquierda' }); el.cvB = h('canvas', { cls: 'r3d-lienzo', 'aria-label': 'Foto derecha' }); el.cvD = h('canvas', { cls: 'r3d-lienzo', hidden: true, 'aria-label': 'Mapa de disparidad en colores' });
    el.base = numero('Base: distancia entre las dos cámaras (cm)', 6, { min: 0.1 }); el.fovE = rango('FOV horizontal (°)', 20, 120, 65, 1); el.dmin = rango('Disparidad mínima (px)', 0, 60, 0, 1); el.dmax = rango('Disparidad máxima (px)', 8, 120, 32, 1); el.uni = rango('Exigencia de unicidad', 70, 100, 92, 1, function (v) { return v / 100; }); el.zMax = rango('Descartar más lejos de (cm, 0 = no)', 0, 1000, 0, 10);
    el.vent = h('select', { 'aria-label': 'Tamaño de ventana' }, [3, 4, 5, 6, 8].map(function (v) { return h('option', { value: v, txt: 'Ventana ' + (2 * v + 1) + '×' + (2 * v + 1), selected: v === 4 }); })); el.paso = h('select', { 'aria-label': 'Submuestreo de la nube' }, [1, 2, 3, 4].map(function (v) { return h('option', { value: v, txt: v === 1 ? 'Todos los píxeles' : '1 de cada ' + v * v }); })); el.rectif = h('input', { type: 'checkbox', checked: true });
    el.recorrido = numero('Recorrido total del video (cm)', 30); el.zObj = numero('Distancia al objeto (cm)', 100); el.dObj = numero('Disparidad deseada (px)', 20); el.sugerida = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    el.progE = barra(); el.resE = h('p', { cls: 'tr-nota', 'aria-live': 'polite', txt: 'Sin resultado todavía.' }); el.btnE = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Calcular profundidad y nube', on: { click: generarEstereo } });
    el.recorrido.inp.addEventListener('change', function () { }); el.zObj.inp.addEventListener('change', sugerir); el.dObj.inp.addEventListener('change', sugerir);
    el.pEst = h('div', { cls: 'r3d-grid', hidden: true }, [
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: '1. Par de fotos' }), h('p', { cls: 'tr-ayuda', txt: 'Dos fotos de la misma escena, con la cámara desplazada de lado (sin girar) una base conocida. También sirven dos cuadros de un video lateral.' }), h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { txt: 'Izquierda' }), el.selA, el.cvA]), h('div', {}, [h('label', { txt: 'Derecha' }), el.selB, el.cvB])]),
        h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Intercambiar', on: { click: function () { var a = el.selA.value; el.selA.value = el.selB.value; el.selB.value = a; miniPar(); } } })])]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Resultado' }), el.cvD, el.progE.el, el.resE])]),
      h('div', {}, [h('div', { cls: 'tr-panel' }, [h('h2', { txt: '2. Cámara y búsqueda' }), el.base.el, el.fovE.el, el.dmin.el, el.dmax.el, h('label', { txt: 'Ventana de comparación' }), el.vent, el.uni.el, el.zMax.el, h('label', { txt: 'Nube de puntos' }), el.paso,
        h('label', { cls: 'tr-chk' }, [el.rectif, 'Rectificación básica (corrige desplazamiento vertical y giro leve)']), h('div', { cls: 'tr-acciones' }, [el.btnE])]),
      h('div', { cls: 'tr-panel' }, [h('details', {}, [h('summary', { txt: 'Ayudas: base desde un video lateral y base recomendada' }), h('div', { cls: 'tr-fila' }, [el.recorrido.el, h('div', {}, [h('label', { txt: ' ' }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Base desde los cuadros elegidos', on: { click: baseVideo } })])]), h('div', { cls: 'tr-fila' }, [el.zObj.el, el.dObj.el]), el.sugerida])]),
      h('p', { cls: 'tr-nota tr-av', txt: 'Block matching propio (SAD + gradiente, comprobación izquierda-derecha, subpíxel). Con cámaras no paralelas, superficies lisas, brillantes o repetidas, o una base mal medida, la profundidad será incorrecta o escasa.' })])]);
    raiz.appendChild(el.sub); raiz.appendChild(el.pHull); raiz.appendChild(el.pEst); eventoLienzo();
    A.on('fotos', function () { tira(); refrescarPar(); }); A.on('ejemplo', function () { aplicarEjemploHull(); aplicarEjemploPar(); refrescarPar(); if (A.params.ejemploPar && !A.params.ejemploHull) cambiar('est'); else if (A.params.ejemploHull) cambiar('hull'); });
    A.on('dron', function () { el.camModo.value = 'dron'; estimar(); }); tira(); refrescarPar(); el.res.ver(); el.tolera.ver(); tol.ver();
  };
  function cambiar(m) { el.pHull.hidden = m !== 'hull'; el.pEst.hidden = m !== 'est'; Array.prototype.forEach.call(el.sub.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m); }); }
  V.cambiar = cambiar;
})(window);
