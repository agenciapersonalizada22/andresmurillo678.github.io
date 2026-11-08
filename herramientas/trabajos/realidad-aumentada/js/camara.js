/* Camara con indicador de privacidad, sensores de orientacion, FaceDetector nativo (si existe) y grabadora de clips. Todo local. window.RA.Cam / Sens / Cara / Grab */
(function (g) {
  'use strict';
  var RA = g.RA = g.RA || {}, G = RA.Geo, Cam = RA.Cam = {}, Sens = RA.Sens = {}, Cara = RA.Cara = {}, Grab = RA.Grab = {};
  var stream = null, oyentes = [];
  Cam.alCambiar = function (fn) { oyentes.push(fn); };
  function avisar() { oyentes.forEach(function (f) { try { f(Cam.activa()); } catch (e) {} }); }
  Cam.activa = function () { return !!(stream && stream.active); };
  Cam.soportada = function () { return !!(g.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); };
  Cam.abrir = async function (video, o) {
    o = o || {}; Cam.detener();
    if (!Cam.soportada()) throw new Error('Este navegador no permite abrir la cámara (necesita HTTPS o localhost).');
    var v = { width: { ideal: o.ancho || 1280 }, height: { ideal: o.alto || 720 } };
    if (o.deviceId) v.deviceId = { exact: o.deviceId }; else v.facingMode = { ideal: o.frente ? 'user' : 'environment' };
    try { stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); }
    catch (e) { stream = null; throw new Error(e.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo en el candado de la barra de direcciones.' : e.name === 'NotFoundError' ? 'No hay cámara en este dispositivo.' : 'No se pudo abrir la cámara: ' + e.message); }
    video.srcObject = stream; video.muted = true; video.setAttribute('playsinline', ''); await video.play().catch(function () {});
    stream.getVideoTracks().forEach(function (t) { t.addEventListener('ended', function () { avisar(); }); });
    avisar(); return stream;
  };
  Cam.detener = function () { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; avisar(); } };
  Cam.camaras = async function () { try { return (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'videoinput'; }); } catch (e) { return []; } };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && !Grab.activa()) Cam.detener(); });

  /* ---------- sensores ---------- */
  var ultimo = null, escuchando = false, cuat = null, offYaw = 0;
  Sens.activo = false;
  function pantalla() { return (g.screen && screen.orientation && screen.orientation.angle) || g.orientation || 0; }
  function alEvento(e) {
    if (e.alpha == null && e.beta == null) return; ultimo = { a: e.alpha || 0, b: e.beta || 0, g: e.gamma || 0 };
    var q = G.cuatDispositivo(ultimo.a, ultimo.b, ultimo.g, pantalla()); cuat = cuat ? G.Q.slerp(cuat, q, 0.6) : q; Sens.activo = true;
  }
  Sens.disponible = function () { return 'DeviceOrientationEvent' in g; };
  Sens.activar = async function () { // llamar desde un gesto del usuario (iOS pide permiso)
    if (!Sens.disponible()) return false;
    try { if (typeof DeviceOrientationEvent.requestPermission === 'function') { var r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; } } catch (e) { return false; }
    if (!escuchando) { g.addEventListener('deviceorientation', alEvento, true); escuchando = true; }
    return true;
  };
  Sens.desactivar = function () { if (escuchando) { g.removeEventListener('deviceorientation', alEvento, true); escuchando = false; } Sens.activo = false; cuat = null; };
  Sens.cuat = function () { return cuat; };
  Sens.angulos = function () { return ultimo; };
  Sens.recentrar = function () { offYaw = cuat ? G.yawDe(cuat) : 0; return offYaw; };
  Sens.cuatRelativo = function () { if (!cuat) return null; var c = Math.cos(-offYaw / 2), s = Math.sin(-offYaw / 2); return G.Q.mul([0, s, 0, c], cuat); };

  /* ---------- rostros ---------- */
  var det = null;
  Cara.disponible = function () { return 'FaceDetector' in g; };
  Cara.detectar = async function (fuente) {
    if (!Cara.disponible()) return null;
    try {
      det = det || new g.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      var caras = await det.detect(fuente);
      return caras.map(function (c) {
        var b = c.boundingBox, ang = 0, ojos = (c.landmarks || []).filter(function (l) { return l.type === 'eye' && l.locations && l.locations.length; }).map(function (l) { return l.locations[0]; });
        if (ojos.length >= 2) { var a = ojos[0].x < ojos[1].x ? [ojos[0], ojos[1]] : [ojos[1], ojos[0]]; ang = Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x); }
        return { x: b.x, y: b.y, w: b.width, h: b.height, ang: ang };
      });
    } catch (e) { det = null; return null; }
  };

  /* ---------- grabadora de clips (MediaRecorder sobre un canvas) ---------- */
  var rec = null, trozos = [], t0 = 0;
  Grab.activa = function () { return !!rec && rec.state === 'recording'; };
  Grab.soportada = function () { return typeof g.MediaRecorder === 'function' && !!HTMLCanvasElement.prototype.captureStream; };
  Grab.iniciar = function (canvas, fps) {
    if (!Grab.soportada()) throw new Error('Este navegador no puede grabar el lienzo (MediaRecorder).');
    var tipos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'], mime = tipos.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
    trozos = []; rec = new MediaRecorder(canvas.captureStream(fps || 30), mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : {});
    rec.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); }; rec.start(500); t0 = Date.now(); return mime;
  };
  Grab.segundos = function () { return Grab.activa() ? (Date.now() - t0) / 1000 : 0; };
  Grab.parar = function () {
    return new Promise(function (ok) { if (!rec || rec.state === 'inactive') { ok(null); return; } var r = rec; r.onstop = function () { ok(new Blob(trozos, { type: r.mimeType || 'video/webm' })); rec = null; }; r.stop(); });
  };
})(window);
