/* Exportacion: WebCodecs + muxer propio (MP4/WebM) o MediaRecorder en tiempo real como respaldo. VE.exportador */
(function (g) {
  var M = g.VE.modelo, F = g.VE.fuentes, X = g.VE.muxer, C = g.VE.cap;
  var E = {};
  var esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var par = function (n) { return Math.max(2, Math.round(n / 2) * 2); };

  /* Dimensiones segun la proporcion y el lado corto elegido (480, 720, 1080...) */
  E.dimensiones = function (p, lado) {
    var d = M.dims(p), w = d[0], h = d[1], k = lado / Math.min(w, h);
    return [par(w * k), par(h * k)];
  };
  E.bitrate = function (w, h, fps, calidad, codec) {
    var bpp = { baja: 0.05, media: 0.09, alta: 0.15, maxima: 0.25 }[calidad] || 0.09;
    if (codec === 'av1') bpp *= 0.7; else if (codec === 'vp8') bpp *= 1.3;
    return Math.round(w * h * fps * bpp);
  };
  E.estimarMB = function (w, h, fps, calidad, codec, dur) { return (E.bitrate(w, h, fps, calidad, codec) + 128000) * dur / 8 / 1048576; };

  async function exportarWC(p, o, cb) {
    var dur = Math.max(0.1, M.duracion(p)), w = o.ancho, h = o.alto, fps = o.fps, total = Math.max(1, Math.round(dur * fps));
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var comp = new g.VE.Compositor(cv, o.sinGL ? { sinGL: true } : {}); comp.tamano(w, h);
    cb.progreso(0, 'Mezclando audio…');
    var tieneAudio = M.todos(p).some(function (c) { return (c.tipo === 'audio' || (c.tipo === 'video' && !c.mute)) && c.vol > 0; });
    var mez = tieneAudio ? await g.VE.mezclaProyecto(p, 48000, function (f) { cb.progreso(f * 0.1, 'Mezclando audio…'); }, cb.cancelado) : null;
    if (cb.cancelado()) throw new Error('cancelado');
    if (mez) { var pk = 0; for (var i = 0; i < mez.L.length; i += 31) pk = Math.max(pk, Math.abs(mez.L[i]), Math.abs(mez.R[i])); if (pk < 1e-5) mez = null; }
    var bitrate = o.bitrate || E.bitrate(w, h, fps, o.calidad, o.codec);
    var vcodec = await C.soportaVideo(o.codec, w, h, fps, bitrate);
    if (!vcodec) throw new Error('Este dispositivo no puede codificar ' + o.codec.toUpperCase() + ' a ' + w + '×' + h + '. Prueba una resolución menor u otro formato.');
    var vch = [], ach = [], vdesc = null, adesc = null, err = null;
    var venc = new VideoEncoder({
      output: function (ch, meta) {
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !vdesc) vdesc = new Uint8Array(meta.decoderConfig.description.slice ? meta.decoderConfig.description.slice(0) : meta.decoderConfig.description);
        var d = new Uint8Array(ch.byteLength); ch.copyTo(d); vch.push({ ts: ch.timestamp, dur: ch.duration || Math.round(1e6 / fps), key: ch.type === 'key', data: d });
      }, error: function (e) { err = e; }
    });
    var cfg = { codec: vcodec, width: w, height: h, bitrate: bitrate, framerate: fps, latencyMode: 'quality' };
    if (o.codec === 'h264') cfg.avc = { format: 'avc' };
    venc.configure(cfg);
    var ids = {};
    for (var f = 0; f < total; f++) {
      if (cb.cancelado()) { try { venc.close(); } catch (e) {} throw new Error('cancelado'); }
      if (err) throw err;
      var t = Math.min(f / fps, dur - 0.0001), act = M.activos(p, t);
      await F.preparar(act, t); comp.dibujar(p, t, F);
      var fr = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(fr, { keyFrame: f % (fps * 2) === 0 }); fr.close();
      while (venc.encodeQueueSize > 6) await esperar(2);
      if (f % 30 === 0) { ids = {}; M.activos(p, Math.min(dur, t + 1)).forEach(function (c) { ids[c.id] = 1; }); act.forEach(function (c) { ids[c.id] = 1; }); F.liberar(ids); }
      if (f % 3 === 0) { cb.progreso(0.1 + 0.8 * f / total, 'Renderizando fotograma ' + f + ' de ' + total); await esperar(0); }
    }
    await venc.flush(); venc.close(); if (err) throw err;
    if (mez) {
      cb.progreso(0.92, 'Codificando audio…');
      var acfg = o.audio === 'aac' ? { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000, aac: { format: 'aac' } } : { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 };
      var aenc = new AudioEncoder({
        output: function (ch, meta) {
          if (meta && meta.decoderConfig && meta.decoderConfig.description && !adesc) adesc = new Uint8Array(meta.decoderConfig.description.slice ? meta.decoderConfig.description.slice(0) : meta.decoderConfig.description);
          var d = new Uint8Array(ch.byteLength); ch.copyTo(d); ach.push({ ts: ch.timestamp, dur: ch.duration || 20000, data: d });
        }, error: function (e) { err = e; }
      });
      aenc.configure(acfg);
      var B = 4800;
      for (var s = 0; s < mez.L.length; s += B) {
        var n = Math.min(B, mez.L.length - s), buf = new Float32Array(n * 2); buf.set(mez.L.subarray(s, s + n), 0); buf.set(mez.R.subarray(s, s + n), n);
        var ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s * 1e6 / 48000), data: buf });
        aenc.encode(ad); ad.close(); while (aenc.encodeQueueSize > 20) await esperar(2);
        if (cb.cancelado()) { try { aenc.close(); } catch (e) {} throw new Error('cancelado'); }
      }
      await aenc.flush(); aenc.close(); if (err) throw err;
    }
    cb.progreso(0.97, 'Empaquetando archivo…');
    var mux, mime, ext, usarAudio = mez && ach.length;
    if (o.cont === 'mp4') {
      if (!vdesc) throw new Error('El codificador no entregó la configuración H.264');
      mux = new X.MP4({ ancho: w, alto: h, video: { description: vdesc }, audio: usarAudio ? { sr: 48000, canales: 2, description: adesc, bitrate: 128000 } : null }); mime = 'video/mp4'; ext = 'mp4';
    } else {
      mux = new X.WebM({ ancho: w, alto: h, video: { codec: o.codec, description: o.codec === 'av1' ? vdesc : null }, audio: usarAudio ? { sr: 48000, canales: 2, description: adesc } : null }); mime = 'video/webm'; ext = 'webm';
    }
    vch.forEach(function (c) { mux.addVideo(c.ts, c.dur, c.key, c.data); });
    if (usarAudio) ach.forEach(function (c) { mux.addAudio(c.ts, c.dur, c.data); });
    var bytes = mux.finalizar(); vch = ach = null;
    F.liberar({});
    return { blob: new Blob([bytes], { type: mime }), mime: mime, ext: ext, ancho: w, alto: h, fps: fps, dur: dur, metodo: 'WebCodecs ' + vcodec + (usarAudio ? ' + ' + (o.audio === 'aac' ? 'AAC' : 'Opus') : '') };
  }

  async function exportarRT(p, o, cb) {
    var dur = Math.max(0.1, M.duracion(p)), w = o.ancho, h = o.alto, fps = o.fps;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var comp = new g.VE.Compositor(cv, {}); comp.tamano(w, h);
    cb.progreso(0, 'Mezclando audio…');
    var mez = await g.VE.mezclaProyecto(p, 48000, function (f) { cb.progreso(f * 0.1); }, cb.cancelado);
    if (cb.cancelado()) throw new Error('cancelado');
    var A = g.AudioContext || g.webkitAudioContext, ac = new A({ sampleRate: 48000 }), dest = ac.createMediaStreamDestination(), stream = cv.captureStream(fps);
    var hay = mez && mez.L.length; if (hay) { var b = ac.createBuffer(2, mez.L.length, 48000); b.copyToChannel(mez.L, 0); b.copyToChannel(mez.R, 1); var src = ac.createBufferSource(); src.buffer = b; src.connect(dest); stream.addTrack(dest.stream.getAudioTracks()[0]); var ini = src; }
    var bitrate = o.bitrate || E.bitrate(w, h, fps, o.calidad, 'vp8'), chunks = [];
    var rec = new MediaRecorder(stream, { mimeType: o.tipo, videoBitsPerSecond: bitrate, audioBitsPerSecond: 128000 });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    var fin = new Promise(function (r) { rec.onstop = r; });
    F.pausarTodos(); await F.preparar(M.activos(p, 0), 0); comp.dibujar(p, 0, F);
    rec.start(500); if (ac.state === 'suspended') await ac.resume(); if (hay) ini.start(); var t0 = ac.currentTime, cancel = false;
    await new Promise(function (res) {
      (function paso() {
        var t = ac.currentTime - t0;
        if (cb.cancelado()) { cancel = true; return res(); }
        if (t >= dur) return res();
        F.sincronizar(M.activos(p, t), t, M.activos(p, t + 0.8)); comp.dibujar(p, t, F); cb.progreso(0.1 + 0.88 * t / dur, 'Grabando en tiempo real… ' + M.fmt(t) + ' / ' + M.fmt(dur));
        requestAnimationFrame(paso);
      })();
    });
    F.pausarTodos(); rec.stop(); await fin; try { ac.close(); } catch (e) {}
    if (cancel) throw new Error('cancelado');
    var mime = o.tipo.split(';')[0]; F.liberar({});
    return { blob: new Blob(chunks, { type: mime }), mime: mime, ext: mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', ancho: w, alto: h, fps: fps, dur: dur, metodo: 'MediaRecorder (tiempo real)' };
  }

  E.exportar = function (p, o, cb) { return o.cont === 'rt' ? exportarRT(p, o, cb) : exportarWC(p, o, cb); };
  /* Verifica el archivo generado reproduciendolo */
  E.verificar = function (blob) {
    return new Promise(function (res) {
      var v = document.createElement('video'), url = URL.createObjectURL(blob); v.muted = true; v.preload = 'metadata';
      v.onloadedmetadata = function () { var r = { ok: true, dur: v.duration, w: v.videoWidth, h: v.videoHeight }; URL.revokeObjectURL(url); res(r); };
      v.onerror = function () { URL.revokeObjectURL(url); res({ ok: false }); }; v.src = url; setTimeout(function () { res({ ok: false, tiempo: true }); }, 15000);
    });
  };
  g.VE.exportador = E;
})(window);
