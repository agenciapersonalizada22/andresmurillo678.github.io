/* Drivers de camara y microfono (MediaDevices). conectar('camara', {deviceId, ancho, alto, fps, facing, audio}) / conectar('microfono', {deviceId}) */
(function (g) {
  'use strict';
  var TD = g.TrabajosDispositivos;
  async function listar(clase) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === clase; });
  }
  var MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  TD.registrarDriver('camara', {
    nombre: 'Cámara',
    soportado: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
    listar: function () { return listar('videoinput'); },
    conectar: async function (o, ctx) {
      var v = {}; if (o.deviceId) v.deviceId = { exact: o.deviceId }; if (o.ancho) v.width = { ideal: +o.ancho }; if (o.alto) v.height = { ideal: +o.alto }; if (o.fps) v.frameRate = { ideal: +o.fps }; if (o.facing) v.facingMode = o.facing;
      var stream = await navigator.mediaDevices.getUserMedia({ video: Object.keys(v).length ? v : true, audio: !!o.audio });
      var pista = stream.getVideoTracks()[0], video = document.createElement('video'), rec = null, trozos = [], activo = true;
      video.muted = true; video.playsInline = true; video.autoplay = true; video.srcObject = stream; try { video.play(); } catch (e) {}
      pista.addEventListener('ended', function () { if (activo) { activo = false; ctx.cerrado('La cámara se desconectó'); } });
      var h = {
        nombre: pista.label || 'Cámara', nativo: stream, extra: { video: video, pista: pista },
        ajustes: function () { return { settings: pista.getSettings ? pista.getSettings() : {}, capacidades: pista.getCapabilities ? pista.getCapabilities() : {} }; },
        aplicar: function (c) { return pista.applyConstraints(c); },
        linterna: function (on) { return pista.applyConstraints({ advanced: [{ torch: !!on }] }); },
        zoom: function (z) { return pista.applyConstraints({ advanced: [{ zoom: +z }] }); },
        /* mide los FPS reales durante ms milisegundos */
        medirFps: function (ms) {
          return new Promise(function (ok) {
            var n = 0, t0 = performance.now(), fin = false;
            function cuenta() { if (fin) return; n++; sig(); }
            function sig() { if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(cuenta); else requestAnimationFrame(cuenta); }
            sig(); setTimeout(function () { fin = true; ok(Math.round(n * 1000 / (performance.now() - t0) * 10) / 10); }, ms || 1200);
          });
        },
        capturar: function (tipo, calidad) {
          var w = video.videoWidth || pista.getSettings().width, hh = video.videoHeight || pista.getSettings().height;
          if (!w || !hh) return Promise.reject(new Error('Todavía no hay imagen de la cámara.'));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = hh; cv.getContext('2d').drawImage(video, 0, 0, w, hh);
          return new Promise(function (ok, ko) { cv.toBlob(function (b) { b ? ok(b) : ko(new Error('No se pudo codificar la imagen.')); }, tipo || 'image/png', calidad || 0.92); });
        },
        grabando: function () { return !!rec; },
        grabar: function () {
          if (typeof MediaRecorder === 'undefined') { var e = new Error('MediaRecorder no existe en este navegador.'); e.name = 'NotSupportedError'; throw e; }
          var mime = MIMES.filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0] || '';
          trozos = []; rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); }; rec.start(500);
        },
        parar: function () {
          return new Promise(function (ok, ko) {
            if (!rec) return ko(new Error('No hay grabación en curso.'));
            var r = rec; rec = null; r.onstop = function () { ok(new Blob(trozos, { type: r.mimeType || 'video/webm' })); }; r.onerror = function (e) { ko(e.error || new Error('Error de grabación')); }; if (r.state !== 'inactive') r.stop(); else r.onstop();
          });
        },
        enviar: function (x) { if (x && x.linterna != null) return h.linterna(x.linterna); if (x && x.zoom != null) return h.zoom(x.zoom); return Promise.reject(new Error('Usa {linterna:true} o {zoom:n}.')); },
        cerrar: async function () { activo = false; if (rec) { try { rec.stop(); } catch (e) {} rec = null; } stream.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; }
      };
      return h;
    }
  });
  TD.registrarDriver('microfono', {
    nombre: 'Micrófono',
    soportado: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
    listar: function () { return listar('audioinput'); },
    conectar: async function (o, ctx) {
      var a = {}; if (o.deviceId) a.deviceId = { exact: o.deviceId };
      var stream = await navigator.mediaDevices.getUserMedia({ audio: Object.keys(a).length ? a : true }), pista = stream.getAudioTracks()[0], AC = g.AudioContext || g.webkitAudioContext, ac = null, an = null, buf = null, rec = null, trozos = [], activo = true;
      if (AC) { ac = new AC(); an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an); buf = new Float32Array(an.fftSize); }
      pista.addEventListener('ended', function () { if (activo) { activo = false; ctx.cerrado('El micrófono se desconectó'); } });
      var h = {
        nombre: pista.label || 'Micrófono', nativo: stream, extra: { pista: pista },
        nivel: function () { if (!an) return 0; an.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.min(1, Math.sqrt(s / buf.length) * 3); },
        ajustes: function () { return { settings: pista.getSettings ? pista.getSettings() : {}, capacidades: pista.getCapabilities ? pista.getCapabilities() : {} }; },
        grabar: function () {
          if (typeof MediaRecorder === 'undefined') { var e = new Error('MediaRecorder no existe en este navegador.'); e.name = 'NotSupportedError'; throw e; }
          trozos = []; rec = new MediaRecorder(stream); rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) trozos.push(ev.data); }; rec.start(500);
        },
        parar: function () { return new Promise(function (ok, ko) { if (!rec) return ko(new Error('No hay grabación en curso.')); var r = rec; rec = null; r.onstop = function () { ok(new Blob(trozos, { type: r.mimeType || 'audio/webm' })); }; r.stop(); }); },
        grabando: function () { return !!rec; },
        enviar: function () { return Promise.reject(new Error('El micrófono es de solo lectura.')); },
        cerrar: async function () { activo = false; if (rec) { try { rec.stop(); } catch (e) {} rec = null; } stream.getTracks().forEach(function (t) { t.stop(); }); if (ac) try { await ac.close(); } catch (e) {} }
      };
      return h;
    }
  });
})(window);
