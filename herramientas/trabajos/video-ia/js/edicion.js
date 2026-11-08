/* Edicion inteligente: analisis completo de un archivo (por saltos), audio, cortes automaticos y exporte de clips con MediaRecorder
   (reencuadre vertical 9:16 siguiendo el movimiento y estabilizacion). Tiempo real: exportar dura lo que dura el material. window.VEdicion */
(function (g) {
  'use strict';
  var V = g.VApp, A = g.VAnalisis, C = g.VCaptura, E = g.VEdicion = { cancelar: false };
  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function buscar(v, t) {
    return new Promise(function (ok) {
      var fin = function () { v.removeEventListener('seeked', fin); clearTimeout(to); var l = v.requestVideoFrameCallback ? new Promise(function (r) { var d = false; var f = function () { if (!d) { d = true; r(); } }; v.requestVideoFrameCallback(f); setTimeout(f, 120); }) : esperar(40); l.then(ok); };
      var to = setTimeout(fin, 3500); v.addEventListener('seeked', fin); v.currentTime = Math.max(0, Math.min(v.duration - 0.05, t));
    });
  }
  E.buscar = buscar;
  /* RMS por ventana de 0.1 s; null si no se puede decodificar */
  E.audio = async function (file, alProg) {
    try {
      if (!file || file.size > 250 * 1048576) return null; var AC = g.OfflineAudioContext || g.webkitOfflineAudioContext; if (!AC) return null;
      var buf = await new AC(1, 44100, 44100).decodeAudioData(await file.arrayBuffer()), d = buf.getChannelData(0), n = Math.floor(buf.sampleRate * 0.1), rms = [];
      for (var i = 0; i + n <= d.length; i += n) { var s = 0; for (var k = 0; k < n; k += 4) s += d[i + k] * d[i + k]; rms.push(Math.sqrt(s / (n / 4))); }
      return { rms: rms, dt: 0.1, dur: buf.duration };
    } catch (e) { return null; }
  };
  E.analizar = async function (alProg) {
    var f = V.fuente; if (!f || !f.esArchivo) throw new Error('Abre un archivo de video en «En vivo».'); var v = f.video, dur = v.duration; if (!dur || !isFinite(dur)) throw new Error('No se conoce la duración del video.');
    var motor = g.VMotor.activo(); g.VMotor.parar(); var t0 = v.currentTime, pausado = v.paused; v.pause(); E.cancelar = false;
    var paso = Math.max(0.25, dur / 900), w = V.cfg.ancho, hh = Math.max(16, Math.round(w * v.videoHeight / v.videoWidth)), cv = document.createElement('canvas'); cv.width = w; cv.height = hh; var cx = cv.getContext('2d', { willReadFrequently: true });
    var c = V.cfg, tub = new g.VTuberia.Tuberia({ sensibilidad: c.sensibilidad, zonas: c.zonas, lineas: [], seguimiento: false, calor: false, color: false, escena: true, umbralEscena: c.umbralEscena, calidad: true, calidadCada: 1, umbralNitidez: c.umbralNitidez, minArea: c.minArea });
    var muestras = [], eventos = [], aud = null;
    if (alProg) alProg(0, 'Leyendo el audio…'); aud = await E.audio(f.file);
    for (var t = 0, i = 0; t < dur && !E.cancelar; t += paso, i++) {
      await buscar(v, t); cx.drawImage(v, 0, 0, w, hh); var r = tub.procesar(cx.getImageData(0, 0, w, hh).data, w, hh, t), q = r.calidad;
      var a = 0; if (aud) { var a0 = Math.floor(t / aud.dt), a1 = Math.max(a0 + 1, Math.floor((t + paso) / aud.dt)), s = 0; for (var k = a0; k < a1 && k < aud.rms.length; k++) s += aud.rms[k]; a = s / Math.max(1, Math.min(a1, aud.rms.length) - a0); }
      muestras.push({ t: t, mov: r.mov ? r.mov.pct : 0, nit: q ? q.nitidez : 0, brillo: q ? q.brillo : null, ruido: q ? q.ruido : 0, corte: !!(r.escena && r.escena.corte), audio: a });
      r.eventos.forEach(function (e) { eventos.push(e); }); if (alProg && i % 3 === 0) alProg(Math.min(1, t / dur), 'Analizando ' + V.fmt(t) + ' de ' + V.fmt(dur));
    }
    await buscar(v, t0); if (!pausado) v.play().catch(function () {}); if (motor) g.VMotor.iniciar();
    if (E.cancelar) return null;
    var res = { nombre: f.nombre, dur: dur, paso: paso, muestras: muestras, audio: aud, silencios: aud ? A.silencios(aud.rms, aud.dt, -45, 1) : [] }; V.analisisArchivo = res;
    V.limpiarDatos(); V.serie = { t: muestras.map(function (m) { return m.t; }), mov: muestras.map(function (m) { return m.mov; }), ocup: muestras.map(function () { return 0; }), bri: muestras.map(function (m) { return m.brillo; }), nit: muestras.map(function (m) { return m.nit; }), rui: muestras.map(function (m) { return m.ruido; }) };
    eventos.forEach(function (e) { e.ts = Date.now(); V.eventos.push(e); V.conteoTipos[e.tipo] = (V.conteoTipos[e.tipo] || 0) + 1; }); V.meta.dur = dur; V.meta.fuente = f.nombre; V.emitir('analizado', res); V.emitir('resultado', { t: dur, eventos: [], pistas: [], cruces: {} }); return res;
  };

  /* ---------- exporte de clips ---------- */
  var audioCache = new WeakMap();
  function audioDe(v) { try { if (audioCache.has(v)) return audioCache.get(v); var AC = g.AudioContext || g.webkitAudioContext, ac = new AC(), src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); src.connect(dst); var o = { ac: ac, dst: dst }; audioCache.set(v, o); return o; } catch (e) { return null; } }
  /* opts: {vertical, estabilizar, salidaAncho, montaje}. cortes: [{ini,fin,motivo}] -> Promise<[{blob,nombre,dur}]> */
  E.exportar = async function (cortes, opts, canvasVista, alProg) {
    var f = V.fuente; if (!f || !f.esArchivo) throw new Error('Abre el archivo de video original.'); if (!C.puede()) throw new Error('Este navegador no tiene MediaRecorder.'); if (!cortes.length) throw new Error('No hay cortes marcados.');
    E.cancelar = false; var v = document.createElement('video'); v.muted = false; v.volume = 1; v.playsInline = true; v.preload = 'auto'; v.src = f.url; await new Promise(function (ok, ko) { v.onloadedmetadata = ok; v.onerror = function () { ko(new Error('No se pudo reabrir el video.')); }; });
    var sw = v.videoWidth, sh = v.videoHeight, W, H;
    if (opts.vertical) { H = opts.salidaAncho === 720 ? 1280 : 960; W = H * 9 / 16; } else { W = Math.min(sw, opts.salidaAncho === 720 ? 1280 : 960); W = Math.round(W / 2) * 2; H = Math.round(W * sh / sw / 2) * 2; }
    var cv = canvasVista || document.createElement('canvas'); cv.width = W; cv.height = H; var cx = cv.getContext('2d'), sm = document.createElement('canvas'), aw = 128, ah = Math.max(16, Math.round(aw * sh / sw)); sm.width = aw; sm.height = ah; var scx = sm.getContext('2d', { willReadFrequently: true });
    var tub = new g.VTuberia.Tuberia({ sensibilidad: 60, seguimiento: false, calor: false, color: false, escena: false, calidad: false, estabilizar: !!opts.estabilizar }), rf = new A.Reencuadre({ aspecto: 9 / 16 }), est = new A.Estabilizador({ alfa: 0.92, max: 0.06 });
    var au = audioDe(v), salidas = [], total = cortes.reduce(function (s, c) { return s + (c.fin - c.ini); }, 0), hecho = 0, rec = null, trozos = [], mime = C.mime();
    function nuevoRec() { var st = cv.captureStream(30); if (au) au.dst.stream.getAudioTracks().forEach(function (t) { st.addTrack(t); }); trozos = []; rec = new MediaRecorder(st, Object.assign(mime ? { mimeType: mime } : {}, { videoBitsPerSecond: opts.vertical ? 3500000 : 4000000 })); rec.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); }; rec.start(500); }
    function cerrarRec(nombre, dur) { return new Promise(function (ok) { var r = rec; rec = null; r.onstop = function () { var b = new Blob(trozos, { type: r.mimeType || 'video/webm' }); salidas.push({ blob: b, nombre: nombre, dur: dur }); ok(); }; r.stop(); }); }
    function pintarFrame() {
      if (opts.vertical || opts.estabilizar) { scx.drawImage(v, 0, 0, aw, ah); var r = tub.procesar(scx.getImageData(0, 0, aw, ah).data, aw, ah, v.currentTime); } else r = null;
      var rc = opts.vertical ? rf.paso(r && r.centro ? r.centro.x : null, sw, sh) : { x: 0, y: 0, w: sw, h: sh }, dx = 0, dy = 0, z = 1;
      if (opts.estabilizar && r && r.desp) { var cr = est.paso(r.desp, aw, ah); dx = cr.x * W; dy = cr.y * H; z = 1.08; }
      cx.setTransform(z, 0, 0, z, W * (1 - z) / 2 + dx, H * (1 - z) / 2 + dy); cx.drawImage(v, rc.x, rc.y, rc.w, rc.h, 0, 0, W, H); cx.setTransform(1, 0, 0, 1, 0, 0);
    }
    try {
      if (au && au.ac.state === 'suspended') await au.ac.resume();
      for (var i = 0; i < cortes.length && !E.cancelar; i++) {
        var c = cortes[i]; await buscar(v, c.ini); tub.reiniciar(); est.reiniciar(); pintarFrame();
        if (!rec) nuevoRec(); else if (rec.state === 'paused') rec.resume();
        await v.play(); var ini = performance.now();
        await new Promise(function (ok) {
          function paso() { if (E.cancelar || v.ended || v.currentTime >= c.fin - 0.02) { v.pause(); ok(); return; } pintarFrame(); if (alProg) alProg(Math.min(1, (hecho + (v.currentTime - c.ini)) / total), 'Exportando ' + (i + 1) + '/' + cortes.length + ' · ' + V.fmt(v.currentTime)); if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso); else requestAnimationFrame(paso); }
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso); else requestAnimationFrame(paso);
        });
        hecho += c.fin - c.ini; if (!opts.montaje) await cerrarRec('corte_' + (i + 1), c.fin - c.ini); else if (i < cortes.length - 1 && rec) rec.pause();
      }
      if (rec) await cerrarRec('montaje', hecho);
    } finally { try { v.pause(); } catch (e) {} if (rec) { try { rec.stop(); } catch (e) {} } v.removeAttribute('src'); v.load(); }
    return E.cancelar ? [] : salidas;
  };
})(window);
