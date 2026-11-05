/* Grabacion (camara/microfono/pantalla con MediaRecorder) y dictado (Web Speech API, solo si existe). VE.grabar / VE.voz */
(function (g) {
  var G = {};
  G.tipoMime = function (conVideo) {
    var lst = conVideo ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (var i = 0; i < lst.length; i++) { try { if (MediaRecorder.isTypeSupported(lst[i])) return lst[i]; } catch (e) {} }
    return '';
  };
  /* tipo: 'camara' | 'pantalla' | 'audio'. Devuelve sesion {stream, empezar(), detener()->Blob, cerrar()} */
  G.abrir = async function (tipo, o) {
    o = o || {}; var stream, md = navigator.mediaDevices;
    if (!md) throw new Error('Este navegador no permite acceder a cámara o micrófono (¿página sin HTTPS?).');
    if (tipo === 'camara') stream = await md.getUserMedia({ video: { facingMode: o.frontal === false ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: o.audio !== false });
    else if (tipo === 'audio') stream = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    else {
      if (!md.getDisplayMedia) throw new Error('La grabación de pantalla no está disponible en este dispositivo.');
      stream = await md.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      if (o.microfono) { try { var mic = await md.getUserMedia({ audio: true }); mic.getAudioTracks().forEach(function (t) { stream.addTrack(t); }); } catch (e) {} }
    }
    var mime = G.tipoMime(tipo !== 'audio'), rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined), trozos = [], ses = { stream: stream, mime: rec.mimeType || mime, rec: rec };
    rec.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); };
    ses.empezar = function () { rec.start(500); ses.t0 = Date.now(); };
    ses.detener = function () { return new Promise(function (res) { rec.onstop = function () { res(new Blob(trozos, { type: (ses.mime || 'video/webm').split(';')[0] })); }; if (rec.state !== 'inactive') rec.stop(); else rec.onstop(); }); };
    ses.cerrar = function () { stream.getTracks().forEach(function (t) { t.stop(); }); };
    stream.getVideoTracks().forEach(function (t) { t.addEventListener('ended', function () { if (ses.alTerminar) ses.alTerminar(); }); });
    return ses;
  };

  var SR = g.SpeechRecognition || g.webkitSpeechRecognition;
  g.VE.voz = {
    disponible: !!SR,
    /* alCue({ini,fin,texto}) con tiempos relativos al instante 0 = start(); getT() devuelve el tiempo actual de la linea de tiempo */
    iniciar: function (lang, getT, alCue, alEstado) {
      if (!SR) return null; var r = new SR(), ini = null, activo = true;
      r.lang = lang || 'es-ES'; r.continuous = true; r.interimResults = true;
      r.onresult = function (ev) {
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var res = ev.results[i], t = getT();
          if (ini === null) ini = t;
          if (res.isFinal) { var tx = res[0].transcript.trim(); if (tx) alCue({ ini: ini, fin: Math.max(ini + 0.6, t), texto: tx }); ini = null; }
          else if (alEstado) alEstado(res[0].transcript);
        }
      };
      r.onerror = function (e) { if (alEstado) alEstado('Error: ' + e.error); };
      r.onend = function () { if (activo) { try { r.start(); } catch (e) {} } };
      r.start();
      return { detener: function () { activo = false; try { r.stop(); } catch (e) {} } };
    }
  };
  g.VE.grabar = G;
})(window);
