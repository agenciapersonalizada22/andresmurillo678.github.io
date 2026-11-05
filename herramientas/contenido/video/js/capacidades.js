/* Deteccion de capacidades del navegador. VE.cap.detectar() -> informe; VE.cap.opcionesExport(informe) */
(function (g) {
  var C = {};
  var VC = { h264: ['avc1.640033', 'avc1.4d0033', 'avc1.42003e', 'avc1.640028', 'avc1.42001f'], vp9: ['vp09.00.10.08', 'vp09.00.40.08'], av1: ['av01.0.08M.08', 'av01.0.04M.08'], vp8: ['vp8'] };
  C.codecsVideo = VC;
  C.soportaVideo = async function (codec, w, h, fps, br) {
    if (typeof VideoEncoder === 'undefined') return null;
    var lista = VC[codec] || [codec];
    for (var i = 0; i < lista.length; i++) {
      var cfg = { codec: lista[i], width: w, height: h, bitrate: br || 4e6, framerate: fps || 30 };
      if (codec === 'h264') cfg.avc = { format: 'avc' };
      try { var r = await VideoEncoder.isConfigSupported(cfg); if (r && r.supported) return lista[i]; } catch (e) {}
    }
    return null;
  };
  C.soportaAudio = async function (codec) {
    if (typeof AudioEncoder === 'undefined') return false;
    var cfg = codec === 'aac' ? { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000, aac: { format: 'aac' } } : { codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 };
    try { var r = await AudioEncoder.isConfigSupported(cfg); return !!(r && r.supported); } catch (e) { return false; }
  };
  C.detectar = async function () {
    var ua = navigator.userAgent || '', r = {
      ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      webcodecs: typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined', audioEnc: typeof AudioEncoder !== 'undefined',
      mediaRecorder: typeof MediaRecorder !== 'undefined', camara: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      pantalla: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia), voz: !!(g.SpeechRecognition || g.webkitSpeechRecognition),
      offscreen: typeof OffscreenCanvas !== 'undefined', memoria: navigator.deviceMemory || 0, nucleos: navigator.hardwareConcurrency || 0, codecs: {}, mrTipos: [], webgl: false
    };
    try { var c = document.createElement('canvas'); r.webgl = !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) {}
    r.filtro2d = 'filter' in CanvasRenderingContext2D.prototype;
    if (r.webcodecs) {
      r.codecs.h264 = !!(await C.soportaVideo('h264', 1280, 720, 30)); r.codecs.vp9 = !!(await C.soportaVideo('vp9', 1280, 720, 30));
      r.codecs.av1 = !!(await C.soportaVideo('av1', 1280, 720, 30)); r.codecs.vp8 = !!(await C.soportaVideo('vp8', 1280, 720, 30));
      r.codecs.aac = await C.soportaAudio('aac'); r.codecs.opus = await C.soportaAudio('opus');
    }
    if (r.mediaRecorder) ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].forEach(function (t) { try { if (MediaRecorder.isTypeSupported(t)) r.mrTipos.push(t); } catch (e) {} });
    return r;
  };
  /* Formatos de exportacion disponibles segun el informe */
  C.opcionesExport = function (r) {
    var o = [];
    if (r.webcodecs) {
      if (r.codecs.h264 && r.codecs.aac) o.push({ id: 'mp4-h264', nombre: 'MP4 (H.264 + AAC) — el más compatible', cont: 'mp4', codec: 'h264', audio: 'aac' });
      if (r.codecs.vp9 && r.codecs.opus) o.push({ id: 'webm-vp9', nombre: 'WebM (VP9 + Opus)', cont: 'webm', codec: 'vp9', audio: 'opus' });
      if (r.codecs.av1 && r.codecs.opus) o.push({ id: 'webm-av1', nombre: 'WebM (AV1 + Opus) — archivos más pequeños', cont: 'webm', codec: 'av1', audio: 'opus' });
      if (r.codecs.vp8 && r.codecs.opus) o.push({ id: 'webm-vp8', nombre: 'WebM (VP8 + Opus)', cont: 'webm', codec: 'vp8', audio: 'opus' });
    }
    if (r.mediaRecorder && r.mrTipos.length) o.push({ id: 'rt', nombre: 'Compatibilidad (grabación en tiempo real, ' + (r.mrTipos[0].indexOf('mp4') >= 0 ? 'MP4' : 'WebM') + ')', cont: 'rt', tipo: r.mrTipos[0] });
    return o;
  };
  g.VE = g.VE || {}; g.VE.cap = C;
})(typeof window !== 'undefined' ? window : globalThis);
