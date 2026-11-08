/* Capturas, clips y buffer de pre-roll (MediaRecorder escalonados, todo en memoria). window.VCaptura */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, R = g.VReglas, C = g.VCaptura = { S: 5, prerollActivo: false, grabando: false }, pre = null, timer = 0, manual = null;
  var MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  C.puede = function () { return typeof MediaRecorder !== 'undefined'; };
  C.mime = function () { return C.puede() ? MIMES.filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0] || '' : ''; };
  function stream() { var f = V.fuente; if (!f) return null; if (f.stream) return f.stream; var v = f.video; return v.captureStream ? v.captureStream() : null; }
  function estado() { V.emitir('rec', { prerollActivo: C.prerollActivo, grabando: C.grabando }); }
  function nombre(base, ext) { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return T.nombreArchivo(base) + '_' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.' + ext; }
  C.nombre = nombre;
  function recorder() {
    var s = stream(), tr = [], rec = new MediaRecorder(s, C.mime() ? { mimeType: C.mime() } : undefined);
    rec.ondataavailable = function (e) { if (e.data && e.data.size) tr.push(e.data); };
    return {
      start: function () { rec.start(1000); },
      stop: function () { return new Promise(function (ok) { rec.onstop = function () { ok(new Blob(tr, { type: rec.mimeType || 'video/webm' })); }; if (rec.state !== 'inactive') rec.stop(); else ok(new Blob(tr, { type: 'video/webm' })); }); },
      descartar: function () { tr = []; rec.ondataavailable = null; try { if (rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } } catch (e) {} }
    };
  }
  function guardarClip(blob, d) {
    if (!blob || !blob.size) return; var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm', m = d && d.meta || {};
    var c = { id: T.uid(), blob: blob, url: URL.createObjectURL(blob), nombre: nombre('clip_' + (m.regla || 'manual'), ext), t: Date.now(), dur: d && d.duracion || 0, preroll: d && d.preroll || 0, motivo: m.motivo || 'manual' };
    V.clips.push(c); V.ordenarCapturas(); V.emitir('clips', c); T.aviso('Clip guardado en memoria: ' + c.nombre);
  }
  C.activarPreroll = function (seg) {
    if (!C.puede()) throw new Error('MediaRecorder no existe en este navegador.'); if (!stream()) throw new Error('Abre una fuente de video primero.');
    C.pararPreroll(); C.S = seg || C.S; pre = new R.Preroll({ segmento: C.S, fabrica: recorder, alClip: guardarClip }); pre.iniciar(performance.now() / 1000);
    timer = setInterval(function () { pre.tick(performance.now() / 1000); }, 250); C.prerollActivo = true; estado();
  };
  C.pararPreroll = function () { clearInterval(timer); if (pre) pre.parar(); pre = null; C.prerollActivo = false; estado(); };
  /* clip: con buffer, incluye N..2N s de pasado; sin buffer, graba solo el futuro */
  C.clip = function (post, meta) {
    post = post || 8; if (pre) { var r = pre.disparar(performance.now() / 1000, post, meta); return r; }
    if (!C.puede() || !stream()) return null; var rec = recorder(), t0 = performance.now(); rec.start();
    setTimeout(function () { rec.stop().then(function (b) { guardarClip(b, { duracion: (performance.now() - t0) / 1000, preroll: 0, meta: meta }); }); }, post * 1000); return { extendido: false, preroll: 0 };
  };
  C.iniciarManual = function () { if (manual || !C.puede() || !stream()) return false; manual = { r: recorder(), t0: performance.now() }; manual.r.start(); C.grabando = true; estado(); return true; };
  C.pararManual = function () { if (!manual) return; var m = manual; manual = null; C.grabando = false; estado(); m.r.stop().then(function (b) { guardarClip(b, { duracion: (performance.now() - m.t0) / 1000, preroll: 0, meta: { motivo: 'manual' } }); }); };
  C.pararTodo = function () { C.pararPreroll(); if (manual) C.pararManual(); };
  C.foto = function (calidad) {
    var f = V.fuente; if (!f || !f.video.videoWidth) return Promise.reject(new Error('No hay imagen todavía.'));
    var v = f.video, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
    return new Promise(function (ok, ko) { c.toBlob(function (b) { b ? ok(b) : ko(new Error('No se pudo codificar la imagen.')); }, 'image/jpeg', calidad || 0.9); });
  };
  C.guardarFoto = async function (motivo, t) {
    var b = await C.foto(), c = { id: T.uid(), blob: b, url: URL.createObjectURL(b), nombre: nombre('captura_' + (motivo || 'manual'), 'jpg'), t: Date.now(), tv: t, motivo: motivo || 'manual' };
    V.capturas.push(c); V.ordenarCapturas(); V.emitir('capturas', c); return c;
  };
})(window);
