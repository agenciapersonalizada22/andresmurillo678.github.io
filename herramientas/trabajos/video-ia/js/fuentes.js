/* Fuentes de video: camara (via TrabajosDispositivos), pantalla y archivo. Cada fuente: {tipo, nombre, video, stream, esArchivo, file, cerrar()}. window.VFuentes */
(function (g) {
  'use strict';
  var TD = g.TrabajosDispositivos, F = g.VFuentes = { actual: null };
  F.puedeCamara = function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); };
  F.puedePantalla = function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); };
  F.listarCamaras = async function () {
    try { if (TD && TD.soportado('camara')) { var d = g.TrabajosDispositivos.capacidades; } } catch (e) {}
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter(function (d) { return d.kind === 'videoinput'; });
  };
  function ponerStream(video, stream) { video.removeAttribute('src'); video.srcObject = stream; video.muted = true; video.playsInline = true; video.controls = false; return video.play().catch(function () {}); }
  F.camara = async function (video, o) {
    o = o || {}; var conexion = null, stream;
    if (TD && TD.soportado && TD.soportado('camara')) {
      conexion = await TD.conectar('camara', { deviceId: o.deviceId || undefined, facing: o.facing || undefined, ancho: o.ancho || 1280, alto: o.alto || 720, fps: o.fps || 30, audio: !!o.audio }); stream = conexion.nativo;
    } else stream = await navigator.mediaDevices.getUserMedia({ video: o.deviceId ? { deviceId: { exact: o.deviceId } } : true, audio: !!o.audio });
    await ponerStream(video, stream);
    var s = { tipo: 'camara', nombre: (conexion && conexion.nombre) || (stream.getVideoTracks()[0] && stream.getVideoTracks()[0].label) || 'Cámara', video: video, stream: stream, esArchivo: false, conexion: conexion, cerrar: function () { if (conexion) { try { TD.desconectar(conexion.id); } catch (e) {} } stream.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; } };
    stream.getVideoTracks()[0].addEventListener('ended', function () { if (F.actual === s) F.detener(); });
    return (F.actual = s);
  };
  F.pantalla = async function (video) {
    var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); await ponerStream(video, stream);
    var s = { tipo: 'pantalla', nombre: 'Pantalla o ventana compartida', video: video, stream: stream, esArchivo: false, cerrar: function () { stream.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; } };
    stream.getVideoTracks()[0].addEventListener('ended', function () { if (F.actual === s) F.detener(); });
    return (F.actual = s);
  };
  F.archivo = function (video, file) {
    return new Promise(function (ok, ko) {
      if (!file || !/^video\//.test(file.type || '') && !/\.(mp4|webm|mov|mkv|ogv|m4v)$/i.test(file.name || '')) return ko(new Error('Elige un archivo de video (MP4, WebM, MOV…).'));
      var url = URL.createObjectURL(file); video.srcObject = null; video.src = url; video.muted = true; video.controls = true; video.playsInline = true; video.loop = false;
      var s = { tipo: 'archivo', nombre: file.name, video: video, stream: null, esArchivo: true, file: file, url: url, cerrar: function () { video.pause(); video.removeAttribute('src'); video.load(); video.controls = false; URL.revokeObjectURL(url); } };
      video.onloadedmetadata = function () { video.onerror = null; ok((F.actual = s)); }; video.onerror = function () { video.onerror = null; URL.revokeObjectURL(url); ko(new Error('El navegador no puede reproducir este video (códec no soportado).')); };
    });
  };
  F.detener = function () { var s = F.actual; F.actual = null; if (s) { try { s.cerrar(); } catch (e) {} } g.VApp.fuente = null; g.VApp.emitir('fuente', null); };
})(window);
