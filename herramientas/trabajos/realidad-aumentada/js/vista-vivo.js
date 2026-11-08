/* Pestana En vivo: camara (o demo) + deteccion de marcador / giroscopio / WebXR, objetos 3D anclados, capas 2D, mediciones, captura guiada, foto y clip. window.RA.VVivo */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, RA = g.RA, A = RA.App, O = RA.Ov, G = RA.Geo, M = RA.Marcadores, P = RA.Panel, V = RA.VVivo = {};
  var el = {}, L, E = null, insp, lista, S = { fuente: null, modo: 'marcador', corriendo: false, raf: 0, pose: null, Hm: null, K: null, perdido: 999, qUlt: null, esq: null, fps: 0, n: 0, t0: 0, rostro: null, tool: '2d', sub: 'mover', mostrar: true, frente: false, grab: false, det: null, dw: 0, dh: 0, gris: null, tPrev: 0 };
  var video = h('video', { playsinline: true, muted: true, hidden: true, 'aria-hidden': 'true' }), demoCv = document.createElement('canvas'), detCv = document.createElement('canvas'), detX = detCv.getContext('2d', { willReadFrequently: true }), bmpMarcador = {};
  video.muted = true;

  /* ---------- fuente demo: marcador sintetico en movimiento ---------- */
  function Rz(a) { return [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]; } function Rx(a) { return [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)]; } function Ry(a) { return [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)]; }
  function marcadorBmp(id) { if (bmpMarcador[id]) return bmpMarcador[id]; var c = document.createElement('canvas'); c.width = c.height = 240; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 240, 240); M.dibujarCanvas(x, id, 40, 40, 160); bmpMarcador[id] = c; return c; }
  V.demoPose = function (t, w, h2) {
    var K = A.K(w, h2), base = [1, 0, 0, 0, -1, 0, 0, 0, -1], R = G.mul3(base, G.mul3(Rz(t / 2600), G.mul3(Rx(Math.sin(t / 2100) * 0.7), Ry(Math.cos(t / 3100) * 0.5)))), z = K.f / (w * 0.30), x = Math.sin(t / 4000) * 0.35, y = Math.cos(t / 3300) * 0.2;
    return { pose: { R: R, t: [x, y, z * (1 + 0.12 * Math.sin(t / 1700))] }, K: K };
  };
  V.dibujarDemo = function (cv, t, id) {
    var w = cv.width, hh = cv.height, x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#8d7a62'); gr.addColorStop(1, '#6f5f4c'); x.fillStyle = gr; x.fillRect(0, 0, w, hh);
    x.strokeStyle = '#0002'; x.lineWidth = 2; for (var i = 0; i < 14; i++) { x.beginPath(); x.moveTo(0, i * hh / 12 + 6); x.lineTo(w, i * hh / 12 - 10); x.stroke(); }
    x.fillStyle = '#3b6ea8'; x.fillRect(w * 0.06, hh * 0.64, w * 0.2, hh * 0.22); x.fillStyle = '#c9c1b2'; x.beginPath(); x.arc(w * 0.88, hh * 0.2, hh * 0.1, 0, 7); x.fill();
    var d = V.demoPose(t, w, hh), q = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(function (p) { var m = 0.5 * 240 / 160; return G.proyectar(d.pose, d.K, [p[0] * m, p[1] * m, 0]); });
    O.deformar(x, marcadorBmp(id == null ? 3 : id), q, null, false);
  };
  V.crearFuenteDemo = function (w, hh) { demoCv.width = w || 640; demoCv.height = hh || 480; return demoCv; };

  /* ---------- tamano y entrada ---------- */
  function ajustarTam(w, hh) {
    var k = Math.min(1, 1280 / Math.max(w, hh)); w = Math.round(w * k); hh = Math.round(hh * k);
    if (el.cv.width !== w || el.cv.height !== hh) { el.cv.width = w; el.cv.height = hh; if (E) E.tam(w, hh); }
    S.K = A.K(w, hh);
    var dw = Math.min(w, A.aj.calidad || 480); if (S.dw !== dw) { S.dw = dw; S.dh = Math.round(dw * hh / w); detCv.width = S.dw; detCv.height = S.dh; }
  }
  function info() { return { W: el.cv.width, H: el.cv.height, Hm: S.Hm, rostro: S.rostro }; }

  /* ---------- seguimiento del marcador ---------- */
  function seguir(ahora) {
    detX.drawImage(S.src, 0, 0, S.dw, S.dh); var d = detX.getImageData(0, 0, S.dw, S.dh); S.gris = M.aGris(d.data, S.dw, S.dh);
    var r = M.detectar(S.gris, S.dw, S.dh, { maxLado: S.dw }), id = +A.aj.marcador, s = el.cv.width / S.dw;
    var m = r.filter(function (x) { return id < 0 || x.id === id; }).sort(function (a, b) { return b.lado - a.lado; })[0];
    S.visibles = r.map(function (x) { return x.id; });
    if (m) {
      var esq = m.esquinas.map(function (p) { return [(p[0] + 0.5) * s - 0.5, (p[1] + 0.5) * s - 0.5]; }), H = G.homMarcador(esq), pose = H && G.poseDeHom(H, S.K);
      if (pose) {
        if (S.pose && S.perdido < 20) { var k = 1 - Math.min(0.9, A.aj.suave), qa = G.Q.deMat3(S.pose.R), qb = G.Q.deMat3(pose.R), mov = Math.hypot(pose.t[0] - S.pose.t[0], pose.t[1] - S.pose.t[1], pose.t[2] - S.pose.t[2]) / pose.t[2]; if (mov > 0.12) k = 1; var q = G.Q.slerp(qa, qb, k); pose = { R: G.Q.aMat3(q), t: G.suavizar(S.pose.t, pose.t, k) }; }
        S.pose = pose; S.perdido = 0; S.id = m.id; S.lado = m.lado * s; S.esq = esq; var qc = RA.Sens.cuat(); S.qUlt = qc ? qc.slice() : null; S.pose0 = pose;
      }
    } else S.perdido++;
    var usable = S.pose0 && (S.perdido === 0 || (S.perdido < 8) || (S.qUlt && RA.Sens.activo && S.perdido < 120));
    if (!usable) { S.pose = null; S.Hm = null; return; }
    var p = S.pose0;
    if (S.perdido >= 1 && S.qUlt && RA.Sens.activo) { // mantiene el ancla girando con el telefono (solo rotacion)
      var qn = RA.Sens.cuat(), rel = G.Q.aMat3(G.Q.mul(G.Q.conj(qn), S.qUlt)), F = [1, 0, 0, 0, -1, 0, 0, 0, -1], Rcv = G.mul3(F, G.mul3(rel, F));
      p = { R: G.mul3(Rcv, S.pose0.R), t: [Rcv[0] * S.pose0.t[0] + Rcv[1] * S.pose0.t[1] + Rcv[2] * S.pose0.t[2], Rcv[3] * S.pose0.t[0] + Rcv[4] * S.pose0.t[1] + Rcv[5] * S.pose0.t[2], Rcv[6] * S.pose0.t[0] + Rcv[7] * S.pose0.t[1] + Rcv[8] * S.pose0.t[2]] };
    }
    S.pose = p; S.Hm = G.homDePose(p, S.K);
  }

  function actualizar3D() {
    if (!E || !E.listo) return;
    if (S.modo === 'marcador' && S.pose) E.arMarcador(S.K, el.cv.width, el.cv.height, S.pose);
    else if (S.modo === 'giro' && RA.Sens.activo) E.arGiro(RA.Sens.cuatRelativo(), A.aj.fov, el.cv.width, el.cv.height, 0, 0.5);
    else { E.suelo.visible = false; }
  }
  function etiquetas(ctx, inf) {
    var k = inf.escala || 1, e = E && E.listo && E.suelo.visible && E.objs.size ? E.objs.get(E.sel) : null;
    if (S.mostrar && S.esq && S.perdido === 0 && S.modo === 'marcador') { ctx.save(); ctx.strokeStyle = '#51cf66'; ctx.lineWidth = 3 * k; ctx.beginPath(); S.esq.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.stroke(); ctx.fillStyle = '#51cf66'; ctx.font = 'bold ' + 15 * k + 'px system-ui'; ctx.fillText('#' + S.id, S.esq[0][0] + 6 * k, S.esq[0][1] - 6 * k); ctx.restore(); }
    if (e) { var d = E.dimensiones(e.def.id), s = E.aPantalla([e.def.pos[0], d[1] + e.def.pos[1], e.def.pos[2]], inf.W, inf.H); if (s) { var mm = A.aj.ladoMm, txt = (d[0] * mm / 10).toFixed(1) + ' × ' + (d[2] * mm / 10).toFixed(1) + ' × ' + (d[1] * mm / 10).toFixed(1) + ' cm'; ctx.save(); ctx.font = 'bold ' + 13 * k + 'px system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000c'; ctx.strokeText(txt, s[0], s[1] - 8 * k); ctx.fillStyle = '#ffd43b'; ctx.fillText(txt, s[0], s[1] - 8 * k); ctx.restore(); } }
  }

  function tick(t) {
    if (!S.corriendo) return; S.raf = requestAnimationFrame(tick);
    var dt = S.tPrev ? t - S.tPrev : 16; S.tPrev = t;
    var src = S.fuente === 'demo' ? demoCv : video; if (S.fuente !== 'demo' && (video.readyState < 2 || !video.videoWidth)) return;
    if (S.fuente === 'demo') { V.dibujarDemo(demoCv, t, A.aj.marcador >= 0 ? A.aj.marcador : 3); }
    var w = src.videoWidth || src.width, hh = src.videoHeight || src.height; ajustarTam(w, hh); S.src = src;
    if (S.modo === 'marcador' || RA.CG.estado.activo) seguir(t); else { S.pose = null; S.Hm = null; }
    if (RA.CG.estado.activo) RA.CG.actualizar({ pose: S.perdido === 0 ? S.pose : null, dt: dt, gris: S.gris, gw: S.dw, gh: S.dh, fuente: src, w: el.cv.width, h: el.cv.height, ladoMm: A.aj.ladoMm });
    mandoCada(dt / 1000); actualizar3D(); L.dibujar(S.grab);
    if (RA.CG.estado.activo && el.anillo) RA.CG.dibujarAnillo(el.anillo);
    S.n++; if (t - S.t0 > 700) { S.fps = S.n * 1000 / (t - S.t0); S.n = 0; S.t0 = t; estado(); }
  }
  V.pedir = function () { if (L && !S.corriendo) L.dibujar(); };
  function estado() {
    var m = S.modo, tx;
    if (!S.corriendo) tx = 'Detenido. Abre la cámara o usa el demo.';
    else if (m === 'marcador') tx = S.pose && S.perdido === 0 ? 'Marcador #' + S.id + ' · ' + Math.round(S.lado) + ' px · a ' + (Math.hypot.apply(0, S.pose.t) * A.aj.ladoMm / 10).toFixed(0) + ' cm' : S.pose ? 'Marcador perdido; el objeto sigue girando con el sensor' : 'Buscando marcador… (imprímelo en Proyectos > Marcadores)';
    else if (m === 'giro') tx = RA.Sens.activo ? 'Giroscopio activo (solo rotación: el objeto no se acerca si caminas)' : 'Sin datos del giroscopio';
    else tx = 'WebXR';
    el.estado.textContent = tx + (S.corriendo ? ' · ' + S.fps.toFixed(0) + ' fps' : '');
  }

  /* ---------- fuentes ---------- */
  async function iniciar3D() { if (E && E.listo) return true; if (!RA.E3) { await new Promise(function (r) { A.con3d(r); }); } E = RA.E3; if (!E.init()) { T.aviso('Este navegador no ofrece WebGL: no habrá objetos 3D, sí las capas 2D.', 'error'); E = null; return false; } E.tam(el.cv.width, el.cv.height); E.sombras(true); return true; }
  async function abrirCamara() {
    try { await iniciar3D(); S.fuente = 'camara'; await RA.Cam.abrir(video, { frente: S.frente }); S.corriendo = true; S.tPrev = 0; cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(tick); el.vacio.hidden = true; el.cv.scrollIntoView({ block: 'start' }); A.logro('ra_abrio_camara'); if (S.modo === 'giro') activarSensor(); }
    catch (e) { T.aviso(e.message, 'error'); }
  }
  async function abrirDemo() { await iniciar3D(); RA.Cam.detener(); video.srcObject = null; S.fuente = 'demo'; V.crearFuenteDemo(640, 480); S.corriendo = true; S.tPrev = 0; cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(tick); el.vacio.hidden = true; el.cv.scrollIntoView({ block: 'start' }); }
  V.detener = function () { S.corriendo = false; cancelAnimationFrame(S.raf); RA.Cam.detener(); video.srcObject = null; if (RA.Grab.activa()) detenerGrab(); S.pose = null; S.Hm = null; if (el.estado) { estado(); L.dibujar(); el.vacio.hidden = false; } };
  V.pausar = function () { if (S.corriendo) V.detener(); };
  async function activarSensor() { var ok = await RA.Sens.activar(); if (!ok) T.aviso('No se pudo activar el sensor de orientación (permiso denegado o no disponible).', 'error'); else RA.Sens.recentrar(); return ok; }

  /* ---------- grabacion y foto ---------- */
  function detenerGrab() {
    return RA.Grab.parar().then(function (b) { S.grab = false; el.btnRec.textContent = '● Grabar clip'; el.btnRec.setAttribute('aria-pressed', 'false'); clearInterval(S.tRec); if (b && b.size) { T.descargar(b, 'clip_ra_' + Date.now() + (/mp4/.test(b.type) ? '.mp4' : '.webm')); T.aviso('Clip guardado (' + (b.size / 1048576).toFixed(1) + ' MB).'); A.logro('ra_grabo_clip'); } });
  }
  function alternarGrab() {
    if (RA.Grab.activa()) { detenerGrab(); return; }
    if (!S.corriendo) { T.aviso('Abre la cámara o el demo primero.', 'error'); return; }
    try { RA.Grab.iniciar(el.cv, 30); S.grab = true; el.btnRec.setAttribute('aria-pressed', 'true'); S.tRec = setInterval(function () { el.btnRec.textContent = '■ Detener (' + RA.Grab.segundos().toFixed(0) + ' s)'; }, 500); } catch (e) { T.aviso(e.message, 'error'); }
  }
  async function fotoDescargar() { if (!S.corriendo) { T.aviso('Abre la cámara o el demo primero.', 'error'); return; } var b = await A.canvasABlob(L.exportar(), 'image/png'); T.descargar(b, 'captura_ra_' + Date.now() + '.png'); A.logro('ra_captura_en_vivo'); }
  function fotoEditor() { if (!S.corriendo) { T.aviso('Abre la cámara o el demo primero.', 'error'); return; } RA.VFoto.abrirCanvas(L.exportar(), 'captura_en_vivo'); A.irA('foto'); }

  /* ---------- objetos 3D con el puntero ---------- */
  function ndc(e) { var r = el.cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; }
  function ptrAbajo(e) {
    if (S.tool !== '3d' || !E || !E.listo) return; var n = ndc(e), hit = E.hit(n[0], n[1]); el.cv.setPointerCapture(e.pointerId);
    if (!hit) { E.seleccionar(null); S.d3 = null; refrescarObjetos(); return; }
    E.seleccionar(hit.id); var d = E.def(hit.id), pf = E.piso(n[0], n[1], 0); S.d3 = { id: hit.id, y0: e.clientY, x0: e.clientX, off: pf ? [pf[0] - d.pos[0], pf[2] - d.pos[2]] : [0, 0], rot0: d.rotY, esc0: d.escala }; refrescarObjetos();
  }
  function ptrMueve(e) {
    var d = S.d3; if (!d || S.tool !== '3d') return;
    if (S.sub === 'mover') { var n = ndc(e), pf = E.piso(n[0], n[1], 0); if (pf) E.mover(d.id, pf[0] - d.off[0], pf[2] - d.off[1]); }
    else if (S.sub === 'rotar') E.girar(d.id, d.rot0 + (e.clientX - d.x0) * 0.6, true);
    else E.escalar(d.id, d.esc0 * Math.exp(-(e.clientY - d.y0) * 0.006), true);
    if (!S.corriendo) L.dibujar(); refrescarObjetos(true);
  }
  function ptrFin() { if (S.d3) { S.d3 = null; A.logro('ra_movio_objeto'); } }
  function teclas(e) {
    if (S.tool !== '3d' || !E || !E.sel) return; var d = E.def(E.sel), p = E.snap.paso, m = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[e.key];
    if (m) { E.mover(E.sel, d.pos[0] + m[0], d.pos[2] + m[1]); } else if (e.key === 'q' || e.key === 'Q') E.girar(E.sel, -E.snap.pasoAng); else if (e.key === 'e' || e.key === 'E') E.girar(E.sel, E.snap.pasoAng);
    else if (e.key === '+') E.escalar(E.sel, 1.1); else if (e.key === '-') E.escalar(E.sel, 1 / 1.1); else if (e.key === 'Delete') { E.quitar(E.sel); } else return;
    e.preventDefault(); refrescarObjetos(); if (!S.corriendo) L.dibujar();
  }
  function mandoCada(dt) {
    var Md = g.Mando; if (!Md || !E || !E.listo) return; try { Md.leer(); } catch (e) { return; } if (!Md.conectado) return;
    if (Md.pulsado('A')) { var ids = [...E.objs.keys()], i = ids.indexOf(E.sel); E.seleccionar(ids.length ? ids[(i + 1) % ids.length] : null); refrescarObjetos(); }
    if (Md.pulsado('B')) { E.seleccionar(null); refrescarObjetos(); }
    if (!E.sel) return; var d = E.def(E.sel), Lx = Md.ejes.izq, Rx2 = Md.ejes.der;
    if (Lx.x || Lx.y) E.mover(E.sel, d.pos[0] + Lx.x * dt * 0.5, d.pos[2] + Lx.y * dt * 0.5, true);
    if (Rx2.x) E.girar(E.sel, Rx2.x * dt * 90, false, true); if (Md.gatillo.der || Md.gatillo.izq) E.escalar(E.sel, Math.exp((Md.gatillo.der - Md.gatillo.izq) * dt), false, true);
  }
  V.mandoActivo = function () { return !!(g.Mando && g.Mando.conectado); };

  /* ---------- interfaz ---------- */
  function refrescarObjetos(suave) { if (el.listaObj) { pintarObjetos(); } if (RA.VObjetos && RA.VObjetos.refrescar && !suave) RA.VObjetos.refrescar(); }
  function pintarObjetos() {
    if (!el.listaObj) return; el.listaObj.innerHTML = ''; if (!E || !E.listo || !E.objs.size) { el.listaObj.appendChild(h('li', { cls: 'tr-vacio', txt: 'Sin objetos 3D. Añade uno arriba o importa uno en la pestaña Objetos.' })); return; }
    E.objs.forEach(function (e, id) { el.listaObj.appendChild(h('li', {}, [h('button', { type: 'button', cls: 'ra-capa', 'aria-pressed': E.sel === id, on: { click: function () { E.seleccionar(id); S.tool = '3d'; marcarTool(); pintarObjetos(); } } }, [h('span', { cls: 'ra-pto', txt: '▣' }), h('span', { txt: e.def.nombre })])])); });
  }
  function marcarTool() { Array.prototype.forEach.call(el.tools.children, function (b) { b.setAttribute('aria-pressed', b.dataset.t === S.tool); }); el.sub.hidden = S.tool !== '3d'; L.herr = S.tool === 'medir' ? 'medir' : 'editar'; el.cv.style.touchAction = S.tool === '2d' && !L.capa() ? 'pan-y' : 'none'; }
  async function anadirObjeto(clave) { if (!(await iniciar3D())) return; var d = E.agregar({ tipo: 'prim', clave: clave, nombre: (E.PRIM.filter(function (p) { return p[0] === clave; })[0] || [0, clave])[1], color: el.color.value }); if (d) { S.tool = '3d'; marcarTool(); refrescarObjetos(); A.logro('ra_primer_objeto'); if (clave === 'ajedrez' || clave === 'dado') A.logro('ra_objeto_de_juego'); if (!S.corriendo) L.dibujar(); } }
  V.anadirObjeto = anadirObjeto;
  function anadir2D(f) {
    var asp = el.cv.width / el.cv.height, ov; if (f.tipo === 'lib') ov = O.desdeLib(f.clave, null, asp); else ov = O.desdePNG(f.ref, f.w, f.h, asp);
    if (S.Hm && S.perdido === 0) { O.aMarcador(ov, info()); }
    L.guardarHist(); A.vivo.capas.push(ov); S.tool = '2d'; marcarTool(); L.seleccionar(ov.id); lista.pintar(); insp.pintar(); A.logro('ra_primera_capa'); var c = RA.Biblio.porClave(f.clave || ''); if (c) A.logro('ra_capa_' + c.cat); L.guardarHist(); if (!S.corriendo) L.dibujar();
  }
  function anclar(ov, a) {
    var inf = info();
    if (a === 'marcador') { if (!S.Hm) { T.aviso('Necesito ver el marcador para pegar la capa a él.', 'error'); return; } O.aMarcador(ov, inf); }
    else if (a === 'rostro') { if (!S.rostro) { T.aviso(RA.Cara.disponible() ? 'Aún no detecto un rostro.' : 'Este navegador no tiene FaceDetector (detección nativa de rostros).', 'error'); return; } var q = O.cuadPx(Object.assign({}, ov, { ancla: 'imagen', malla: null }), inf), f = S.rostro; ov.r = { x: (q[0][0] - f.x) / f.w, y: (q[0][1] - f.y) / f.h, w: (q[1][0] - q[0][0]) / f.w, h: (q[3][1] - q[0][1]) / f.h }; ov.ancla = 'rostro'; }
    else { var pts = O.cuadPx(ov, inf); if (pts) ov.q = pts.map(function (p) { return [p[0] / inf.W, p[1] / inf.H]; }); ov.ancla = 'imagen'; }
    lista.pintar(); if (!S.corriendo) L.dibujar();
  }
  function cic() { // deteccion de rostro cada ~150 ms si hay FaceDetector
    if (!S.corriendo || !el.rostroOn.checked || !RA.Cara.disponible()) { S.rostro = null; setTimeout(cic, 400); return; }
    RA.Cara.detectar(S.src).then(function (r) { if (r && r[0]) { var c = r[0], p = S.rostro; S.rostro = p ? { x: p.x + (c.x - p.x) * 0.6, y: p.y + (c.y - p.y) * 0.6, w: p.w + (c.w - p.w) * 0.6, h: p.h + (c.h - p.h) * 0.6, ang: c.ang } : c; } else S.rostro = null; setTimeout(cic, 120); });
  }

  V.iniciar = function (raiz) {
    el.cv = h('canvas', { cls: 'ra-lienzo', tabindex: 0, width: 640, height: 480, 'aria-label': 'Vista en vivo con realidad aumentada' });
    L = RA.Lienzo(el.cv, { capas: function () { return A.vivo.capas; }, info: info, activo: function () { return S.tool === '2d' || S.tool === 'medir'; },
      dibujarBase: function (x, inf) { if (S.src && S.corriendo) x.drawImage(S.src, 0, 0, inf.W, inf.H); else { x.fillStyle = '#20242c'; x.fillRect(0, 0, inf.W, inf.H); } },
      dibujarDespues: function (x, inf) { if (E && E.listo && E.suelo.visible && E.modoVista !== 'visor') { E.renderAR(); x.drawImage(E.canvas, 0, 0, inf.W, inf.H); } etiquetas(x, inf); },
      alSeleccionar: function () { if (insp) insp.pintar(); if (lista) lista.pintar(); marcarTool(); }, alCambiar: function (suave) { if (!suave && lista) lista.pintar(); if (!S.corriendo) L.dibujar(); }, aviso: function (m) { T.aviso(m, 'error'); }, alMedir: function () { A.logro('ra_midio_marcador'); } });
    el.cv.addEventListener('pointerdown', ptrAbajo); el.cv.addEventListener('pointermove', ptrMueve); el.cv.addEventListener('pointerup', ptrFin); el.cv.addEventListener('pointercancel', ptrFin); el.cv.addEventListener('keydown', teclas);
    lista = P.listaCapas({ capas: function () { return A.vivo.capas; }, sel: function () { return L.sel; }, elegir: function (id) { S.tool = '2d'; marcarTool(); L.seleccionar(id); } });
    insp = P.inspector({ capa: function () { return L.capa(); }, marcador: true, rostro: RA.Cara.disponible(), anclar: anclar, cambio: function (est) { lista.pintar(); if (est) insp.pintar(); if (!S.corriendo) L.dibujar(); },
      borrar: function () { var ov = L.capa(); if (!ov) return; L.guardarHist(); A.vivo.capas.splice(A.vivo.capas.indexOf(ov), 1); L.sel = null; lista.pintar(); insp.pintar(); L.guardarHist(); if (!S.corriendo) L.dibujar(); },
      dup: function () { var ov = L.capa(); if (!ov) return; var c = JSON.parse(JSON.stringify(ov)); c.id = O.nuevo().id; c.nombre += ' copia'; if (c.ancla === 'imagen') c.q = c.q.map(function (p) { return [p[0] + 0.03, p[1] + 0.03]; }); else if (c.ancla === 'marcador') { c.m.x += 0.1; c.m.y -= 0.1; } A.vivo.capas.push(c); L.seleccionar(c.id); lista.pintar(); L.guardarHist(); },
      orden: function (d) { var l = A.vivo.capas, ov = L.capa(), i = l.indexOf(ov), j = i + d; if (!ov || j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, ov); lista.pintar(); L.guardarHist(); } });
    el.estado = h('p', { cls: 'ra-estado', 'aria-live': 'polite', txt: 'Detenido. Abre la cámara o usa el demo.' });
    el.vacio = h('div', { cls: 'ra-vacio-lienzo' }, [h('p', { txt: 'Imprime un marcador (pestaña Marcadores), ábrelo en la cámara y pon objetos 3D o capas sobre él. Sin cámara, prueba el demo.' })]);
    el.btnRec = h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': 'false', txt: '● Grabar clip', on: { click: alternarGrab } });
    var camBtn = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Abrir cámara', on: { click: abrirCamara } }), lado = h('button', { type: 'button', cls: 'tr-btn', txt: 'Cámara: trasera', on: { click: function () { S.frente = !S.frente; lado.textContent = 'Cámara: ' + (S.frente ? 'frontal' : 'trasera'); if (S.fuente === 'camara' && S.corriendo) abrirCamara(); } } });
    var modos = h('select', { 'aria-label': 'Modo de anclaje' }, [['marcador', 'Marcador impreso (estable)'], ['giro', 'Giroscopio (sin marcador, solo rotación)'], ['xr', 'WebXR AR (hit-test y anclas)']].map(function (m) { return h('option', { value: m[0], txt: m[1] }); }));
    modos.addEventListener('change', async function () { S.modo = modos.value; if (S.modo === 'giro') { await activarSensor(); } el.xrCaja.hidden = S.modo !== 'xr'; estado(); });
    el.xrCaja = h('div', { cls: 'tr-nota', hidden: true }); xrUI(el.xrCaja);
    var selId = h('select', { 'aria-label': 'Marcador a seguir' }, [h('option', { value: -1, txt: 'Cualquier marcador' })].concat(Array.apply(0, Array(M.MAX_ID)).map(function (_, i) { return h('option', { value: i, txt: 'Marcador #' + i }); })));
    selId.value = A.aj.marcador; selId.addEventListener('change', function () { A.aj.marcador = +selId.value; A.guardarAj(); S.pose0 = null; });
    var most = h('input', { type: 'checkbox', checked: true }); most.addEventListener('change', function () { S.mostrar = most.checked; });
    el.rostroOn = h('input', { type: 'checkbox', disabled: !RA.Cara.disponible() }); setTimeout(cic, 500);
    el.tools = h('div', { cls: 'ra-herr', role: 'group', 'aria-label': 'Herramienta' }, [['2d', 'Capas 2D'], ['3d', 'Objetos 3D'], ['medir', 'Medir (marcador)']].map(function (a) { var b = h('button', { type: 'button', cls: 'tr-btn', 'data-t': a[0], 'aria-pressed': a[0] === '2d', txt: a[1], on: { click: function () { S.tool = a[0]; marcarTool(); } } }); return b; }));
    el.sub = h('div', { cls: 'ra-herr', role: 'group', 'aria-label': 'Acción 3D', hidden: true }, [['mover', 'Mover'], ['rotar', 'Rotar'], ['escalar', 'Escalar']].map(function (a) { return h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': a[0] === 'mover', txt: a[1], on: { click: function (e) { S.sub = a[0]; Array.prototype.forEach.call(el.sub.children, function (x) { x.setAttribute('aria-pressed', x === e.currentTarget); }); } } }); }));
    function chk(txt, ini, fn) { var c = h('input', { type: 'checkbox', checked: ini }); c.addEventListener('change', function () { fn(c.checked); }); return h('label', { cls: 'tr-chk' }, [c, txt]); }
    el.snapUI = h('div', { cls: 'ra-fila' }, [chk('Imán a cuadrícula (0,1)', true, function (v) { if (iniciar3DSync()) E.snap.rej = v; }), chk('Giro de 15°', true, function (v) { if (iniciar3DSync()) E.snap.ang = v; }), chk('Escala de 0,1', true, function (v) { if (iniciar3DSync()) E.snap.esc = v; }), chk('Mostrar cuadrícula', true, function (v) { if (iniciar3DSync()) { E.rejilla(v); if (!S.corriendo) L.dibujar(); } }), chk('Sombras', true, function (v) { if (iniciar3DSync()) E.sombras(v); })]);
    function iniciar3DSync() { if (E && E.listo) return true; if (RA.E3 && RA.E3.init()) { E = RA.E3; E.tam(el.cv.width, el.cv.height); return true; } return false; }
    el.color = h('input', { type: 'color', value: '#e03131', 'aria-label': 'Color del objeto' });
    var selPrim = h('select', { 'aria-label': 'Objeto 3D a añadir' }, [['cubo', 'Cubo'], ['esfera', 'Esfera'], ['cilindro', 'Cilindro'], ['piramide', 'Pirámide'], ['flecha', 'Flecha'], ['ejes', 'Ejes XYZ'], ['ajedrez', 'Ajedrez 3D'], ['dado', 'Dado'], ['carro', 'Carro'], ['robot', 'Robot']].map(function (p) { return h('option', { value: p[0], txt: p[1] }); }));
    el.listaObj = h('ul', { cls: 'ra-capas', 'aria-label': 'Objetos 3D' }); pintarObjetos();
    el.anillo = h('canvas', { cls: 'ra-anillo', width: 220, height: 220, 'aria-label': 'Sectores fotografiados' });
    var cgLista = h('div', { cls: 'ra-miniaturas' }), cgEstado = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' });
    function cgPintar() {
      var s = RA.CG.estado; cgLista.innerHTML = ''; s.fotos.forEach(function (f, i) { cgLista.appendChild(h('button', { type: 'button', cls: 'ra-mini-foto', title: 'Quitar foto ' + (i + 1) + ' (azimut ' + Math.round(f.az) + '°)', 'aria-label': 'Quitar foto ' + (i + 1), on: { click: function () { RA.CG.quitar(i); } } }, [h('img', { src: f.url, alt: '' }), h('span', { txt: Math.round(f.az) + '°' })])); });
      var fl = RA.CG.faltan(); cgEstado.textContent = !s.activo ? 'Pulsa «Empezar»: pon el objeto junto al marcador y da una vuelta lenta alrededor (o gira la mesa con el marcador).' : s.actual ? 'Ahora: azimut ' + Math.round(s.actual.az) + '°, elevación ' + Math.round(s.actual.el) + '°, a ' + (s.actual.dist * A.aj.ladoMm / 10).toFixed(0) + ' cm. ' + (fl.length ? 'Faltan ' + fl.length + ' sectores.' : 'Cobertura completa.') + (s.actual.el < 8 ? ' Sube un poco la cámara.' : '') : 'No veo el marcador.';
    }
    RA.CG.alCambiar = cgPintar; setInterval(function () { if (RA.CG.estado.activo) cgPintar(); }, 400);
    var cgBtn = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Empezar captura', on: { click: function () { var s = RA.CG.estado; if (!S.corriendo) { T.aviso('Abre la cámara o el demo primero.', 'error'); return; } s.activo = !s.activo; cgBtn.textContent = s.activo ? 'Detener captura' : 'Empezar captura'; if (s.activo) S.modo = 'marcador', modos.value = 'marcador'; cgPintar(); } } });
    var cgSec = h('select', { 'aria-label': 'Fotos por vuelta' }, [8, 12, 16, 24].map(function (n) { return h('option', { value: n, txt: n + ' fotos por vuelta', selected: n === 16 }); })); cgSec.addEventListener('change', function () { RA.CG.estado.n = +cgSec.value; RA.CG.reiniciar(); });
    var cgAuto = chk('Disparo automático (estable y nítido)', true, function (v) { RA.CG.estado.auto = v; });
    var cgFoto = h('button', { type: 'button', cls: 'tr-btn', txt: 'Foto ahora', on: { click: function () { RA.CG.capturar({ fuente: S.src, w: el.cv.width, h: el.cv.height, gris: S.gris, gw: S.dw, gh: S.dh }); } } });
    var cgEnv = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Enviar a Reconstrucción 3D', on: { click: enviarRecon } });
    async function enviarRecon() {
      var s = RA.CG.estado; if (s.fotos.length < 6) { T.aviso('Toma al menos 6 fotos (mejor 12 o más).', 'error'); return; }
      var ctx = { ladoMm: A.aj.ladoMm, fov: A.aj.fov, w: el.cv.width, h: el.cv.height }, z = await RA.CG.zip(ctx); T.descargar(z, 'captura_guiada_' + Date.now() + '.zip');
      try { await RA.Datos.guardarEnvio({ id: T.uid(), fecha: new Date().toISOString(), fotos: s.fotos.length, sectores: s.n, poses: JSON.parse(RA.CG.posesJSON(ctx)), zip: z }); } catch (e) { /* almacenamiento lleno: el ZIP ya se descargo */ }
      A.logro('ra_envio_reconstruccion'); T.aviso('ZIP descargado. En Reconstrucción 3D: Captura > Elegir fotos y selecciona los .jpg.'); setTimeout(function () { g.open('../reconstruccion-3d/', '_blank', 'noopener'); }, 600);
    }
    raiz.appendChild(h('div', { cls: 'ra-barra' }, [camBtn, lado, h('button', { type: 'button', cls: 'tr-btn', txt: 'Demo sin cámara', on: { click: abrirDemo } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Detener', on: { click: V.detener } }), video]));
    raiz.appendChild(h('div', { cls: 'ra-escena' }, [h('div', { cls: 'ra-marco' }, [h('div', { cls: 'ra-pantalla' }, [el.cv, el.vacio]), el.estado]),
      h('div', { cls: 'ra-lado' }, [
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Capturar' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Foto al editor', on: { click: fotoEditor } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Descargar PNG', on: { click: fotoDescargar } }), el.btnRec])]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Anclaje' }), h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Modo' }), modos]), el.xrCaja, h('label', { cls: 'ra-campo' }, [h('span', { txt: 'Marcador a seguir' }), selId]), h('div', { cls: 'ra-fila' }, [h('label', { cls: 'tr-chk' }, [most, 'Mostrar detección']), h('label', { cls: 'tr-chk' }, [el.rostroOn, 'Rostro (nativo)'])]), h('p', { cls: 'tr-ayuda', id: 'ra-rostro-ayuda', txt: RA.Cara.disponible() ? 'FaceDetector disponible en este navegador.' : 'Este navegador no tiene FaceDetector: usa las anclas manuales de cada capa.' })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Herramienta' }), el.tools, el.sub, el.snapUI, h('p', { cls: 'tr-ayuda', txt: '3D: arrastra un objeto para moverlo (Q/E giran, +/− escalan, flechas mueven). Mando: palanca izquierda mueve, derecha gira, gatillos escalan, A cambia de objeto.' })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Objetos 3D' }), h('div', { cls: 'ra-fila' }, [selPrim, el.color, h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Añadir', on: { click: function () { anadirObjeto(selPrim.value); } } })]), el.listaObj, h('p', { cls: 'tr-ayuda', txt: 'Para tus modelos de Reconstrucción 3D o archivos OBJ/GLB abre la pestaña Objetos.' })]),
        h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Capas 2D' }), P.biblioteca(anadir2D), lista.raiz, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Deshacer', on: { click: function () { L.deshacer(); lista.pintar(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Borrar medidas', on: { click: function () { L.limpiarMedidas(); } } })]), insp.raiz]),
        h('details', { cls: 'tr-panel' }, [h('summary', { txt: 'Recrear un objeto físico (captura guiada)' }), h('p', { cls: 'tr-ayuda', txt: 'Pon el marcador impreso junto al objeto, sobre una superficie plana. La app mide desde dónde miras y te dice qué ángulos faltan. Después las fotos van al módulo de Reconstrucción 3D (siluetas o estéreo). No es fotogrametría: el resultado depende de ese módulo.' }), h('div', { cls: 'ra-fila' }, [cgBtn, cgSec]), cgAuto, el.anillo, cgEstado, cgLista, h('div', { cls: 'tr-acciones' }, [cgFoto, cgEnv, h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Vaciar', on: { click: function () { RA.CG.reiniciar(); } } })])])
      ])]));
    L.dibujar(); marcarTool();
  };
  function xrUI(caja) {
    var msg = h('p', { cls: 'tr-ayuda', 'aria-live': 'polite' }), bAR = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Iniciar AR del navegador' }), ui = h('div', { id: 'ra-xr-ui', cls: 'ra-xr-ui' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Salir de AR', on: { click: function () { E.salirXR(); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Reubicar', on: { click: function () { E.suelo.visible = false; } } }), h('span', { id: 'ra-xr-info', cls: 'tr-etiq', txt: 'Apunta al suelo y toca para colocar' })]);
    document.body.appendChild(ui);
    function pintar() { var x = RA.E3 && RA.E3.xr; msg.textContent = !x ? 'Comprobando WebXR…' : x.activa ? 'Sesión AR activa. Planos detectados: ' + x.planos + (x.ancla ? ' · ancla creada' : '') : x.ar ? 'Tu navegador soporta WebXR AR. Se pedirá permiso de cámara y movimiento.' : 'WebXR AR no disponible aquí (hace falta Chrome en Android con ARCore). Usa el modo marcador o giroscopio.'; bAR.disabled = !(x && x.ar && !x.activa); }
    bAR.addEventListener('click', async function () {
      try { await iniciar3D(); RA.Cam.detener(); S.corriendo = false; cancelAnimationFrame(S.raf); ui.classList.add('ra-xr-ver'); await E.entrarAR(ui, function () { A.logro('ra_xr_coloco'); document.getElementById('ra-xr-info').textContent = 'Colocado. Toca para recolocar'; }); A.logro('ra_xr_ar'); }
      catch (e) { ui.classList.remove('ra-xr-ver'); T.aviso(e.message || 'No se pudo iniciar WebXR AR.', 'error'); } pintar();
    });
    g.addEventListener('ra-xr', function () { if (E && !E.xr.activa) ui.classList.remove('ra-xr-ver'); pintar(); }); setInterval(function () { if (RA.E3 && RA.E3.xr.activa) pintar(); }, 1000);
    caja.appendChild(msg); caja.appendChild(bAR); A.con3d(function () { pintar(); }); pintar();
  }
  V.estado = function () { var e = RA.E3 && RA.E3.listo ? RA.E3 : null; return { capas: A.vivo.capas, objetos: e ? e.defs() : [], medidas: [] }; };
  V.cargar = async function (p) { A.vivo.capas.length = 0; (p.capas || []).forEach(function (c) { A.vivo.capas.push(c); }); if (L) { L.sel = null; lista.pintar(); insp.pintar(); L.guardarHist(); L.dibujar(); } if ((p.objetos || []).length) { if (!(await iniciar3D())) return; E.limpiar(); p.objetos.forEach(function (d) { if (d.tipo === 'malla' && !RA.E3.tieneMalla(d.modeloId)) return; E.agregar(d); }); E.seleccionar(null); refrescarObjetos(); } };
  V.sensor = activarSensor; V.S = S; V.lienzo = function () { return L; };
})(window);
