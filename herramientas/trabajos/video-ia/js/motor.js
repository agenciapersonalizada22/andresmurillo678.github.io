/* Bucle de frames: reduce cada fotograma (requestVideoFrameCallback), lo manda al Worker (OffscreenCanvas) y publica resultados;
   ademas lector lento de QR y detectores nativos (FaceDetector/TextDetector/BarcodeDetector) si existen. window.VMotor */
(function (g) {
  'use strict';
  var V = g.VApp, M = g.VMotor = { modo: '', fps: 0 }, worker = null, local = null, pend = false, seq = 0, corre = false, ultEnv = -1e9, cv = document.createElement('canvas'), cx = null, rvfc = 0, timerL = 0, ocupLector = false, vistos = {}, dets = null, nfps = 0, tfps = 0, calorCb = {};
  M.nativos = { FaceDetector: 'FaceDetector' in g, TextDetector: 'TextDetector' in g, BarcodeDetector: 'BarcodeDetector' in g };
  function cfgT() { var c = V.cfg; return { sensibilidad: c.sensibilidad, minArea: c.minArea, zonas: c.zonas, lineas: c.lineas, movimiento: c.movimiento, seguimiento: c.seguimiento, calor: c.calor, escena: c.escena, umbralEscena: c.umbralEscena, calidad: c.calidad, umbralNitidez: c.umbralNitidez, color: c.color, objetoColor: c.objetoColor && c.objetoColor.activo ? c.objetoColor : null }; }
  function crearWorker() {
    if (worker || local) return;
    try {
      worker = new Worker('js/trabajador.js'); M.modo = ('OffscreenCanvas' in g && g.createImageBitmap) ? 'Worker + OffscreenCanvas' : 'Worker';
      worker.onmessage = function (e) { var m = e.data; if (m.tipo === 'resultado') { pend = false; resultado(m); } else if (m.tipo === 'calor') { var f = calorCb[m.id]; delete calorCb[m.id]; if (f) f(m); } else if (m.tipo === 'error') { pend = false; console.warn('worker', m.msg); } };
      worker.onerror = function () { worker = null; pend = false; aLocal(); };
      worker.postMessage({ tipo: 'config', cfg: cfgT() });
    } catch (e) { worker = null; aLocal(); }
  }
  function aLocal() { local = new g.VTuberia.Tuberia(cfgT()); M.modo = 'hilo principal'; V.emitir('motor'); }
  M.config = function () { if (worker) worker.postMessage({ tipo: 'config', cfg: cfgT() }); else if (local) local.configurar(cfgT()); };
  M.reiniciar = function () { if (worker) worker.postMessage({ tipo: 'reiniciar' }); else if (local) local.reiniciar(); };
  M.calor = function () { return new Promise(function (ok) { if (worker) { var id = ++seq; calorCb[id] = ok; worker.postMessage({ tipo: 'calor', id: id }); setTimeout(function () { if (calorCb[id]) { delete calorCb[id]; ok(null); } }, 2000); } else if (local) ok({ calor: local.mapaCalor(), celdas: local.celdasCalor(8, 6) }); else ok(null); }); };
  function resultado(r) {
    if (r.calidad) V.ultCalidad = r.calidad; else r.calidad = V.ultCalidad || null; if (r.color) { V.colorUlt = r.color; r.color.paleta.forEach(function (c) { V.colores[c.nombre] = (V.colores[c.nombre] || 0) + c.pct; }); } else r.color = V.colorUlt || null; V.ult = r;
    nfps++; var ahora = performance.now(); if (ahora - tfps > 1000) { M.fps = Math.round(nfps * 1000 / (ahora - tfps)); nfps = 0; tfps = ahora; }
    V.muestra(r); r.eventos.forEach(function (e) { V.evento(e); }); V.emitir('resultado', r);
  }
  function tiempo(meta) { var f = V.fuente; return f && f.esArchivo ? (meta && meta.mediaTime != null ? meta.mediaTime : f.video.currentTime) : (performance.now() - (V.t0 || 0)) / 1000; }
  function frame(meta) {
    var f = V.fuente; if (!f || !f.video.videoWidth) return; var v = f.video, c = V.cfg, w = c.ancho, h = Math.max(16, Math.round(w * v.videoHeight / v.videoWidth)), t = tiempo(meta);
    if (pend && worker) return; var id = ++seq;
    if (worker) {
      if (M.modo === 'Worker + OffscreenCanvas') { pend = true; g.createImageBitmap(v, { resizeWidth: w, resizeHeight: h, resizeQuality: 'low' }).then(function (b) { worker.postMessage({ tipo: 'bitmap', bmp: b, w: w, h: h, t: t, seq: id }, [b]); }, function () { M.modo = 'Worker'; pend = false; }); return; }
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cx = null; } cx = cx || cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, h);
      var im = cx.getImageData(0, 0, w, h); pend = true; worker.postMessage({ tipo: 'frame', buf: im.data.buffer, w: w, h: h, t: t, seq: id }, [im.data.buffer]);
    } else if (local) {
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cx = null; } cx = cx || cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, h);
      var r = local.procesar(cx.getImageData(0, 0, w, h).data, w, h, t); resultado(r);
    }
  }
  function armar() {
    if (!corre) return; var v = V.fuente && V.fuente.video; if (!v) return;
    var cb = function (now, meta) { rvfc = 0; if (!corre) return; if (now - ultEnv >= 1000 / Math.max(1, V.cfg.fps) - 2) { ultEnv = now; frame(meta); } armar(); };
    if (v.requestVideoFrameCallback) rvfc = v.requestVideoFrameCallback(cb); else rvfc = setTimeout(function () { cb(performance.now(), null); }, 1000 / Math.max(1, V.cfg.fps));
  }
  M.iniciar = function () {
    if (corre) M.parar(); crearWorker(); corre = true; ultEnv = -1e9; pend = false; vistos = {}; M.reiniciar(); armar();
    var v = V.fuente.video; v.onseeked = function () { if (corre && V.fuente && V.fuente.esArchivo) { pend = false; frame(null); } }; v.onplaying = function () { if (corre && !rvfc) armar(); };
    clearInterval(timerL); timerL = setInterval(lector, 700);
  };
  M.parar = function () { corre = false; clearInterval(timerL); var v = V.fuente && V.fuente.video; if (v) { if (v.cancelVideoFrameCallback && rvfc) v.cancelVideoFrameCallback(rvfc); else clearTimeout(rvfc); v.onseeked = v.onplaying = null; } rvfc = 0; };
  M.activo = function () { return corre; };
  M.fotograma = function () { frame(null); };

  /* ---- lector lento: QR y detectores nativos ---- */
  function nuevo(k, ms) { var n = Date.now(); if (vistos[k] && n - vistos[k] < ms) return false; vistos[k] = n; return true; }
  async function lector() {
    var f = V.fuente; if (!corre || ocupLector || !f || !f.video.videoWidth || (f.esArchivo && f.video.paused)) return; var c = V.cfg; if (!c.lector && !c.nativos) return; ocupLector = true;
    try {
      var v = f.video, t = tiempo(null), L = V.lectura = V.lectura || { rostros: [], textos: [], codigos: [] };
      if (c.lector && g.QRLector) { var r = await g.QRLector.leer(v, v.videoWidth, v.videoHeight); if (r && r.texto && nuevo('qr|' + r.texto, 5000)) V.evento({ t: t, tipo: 'qr', valor: 1, texto: r.texto }); }
      if (c.nativos) {
        if (!dets) { dets = {}; try { if (M.nativos.FaceDetector) dets.f = new g.FaceDetector({ fastMode: true, maxDetectedFaces: 8 }); } catch (e) {} try { if (M.nativos.TextDetector) dets.t = new g.TextDetector(); } catch (e) {} try { if (M.nativos.BarcodeDetector) dets.b = new g.BarcodeDetector(); } catch (e) {} }
        var W = v.videoWidth, H = v.videoHeight;
        if (dets.f) { var fs = await dets.f.detect(v); L.rostros = fs.map(function (x) { var b = x.boundingBox; return { x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H }; }); if (fs.length > (L.nr || 0) && nuevo('rostro', 3000)) V.evento({ t: t, tipo: 'rostro', valor: fs.length, texto: fs.length + ' rostro(s)' }); L.nr = fs.length; }
        if (dets.t) { var ts = await dets.t.detect(v); L.textos = ts.map(function (x) { var b = x.boundingBox; return { x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H, s: x.rawValue }; }); ts.forEach(function (x) { if (x.rawValue && x.rawValue.trim().length > 2 && nuevo('txt|' + x.rawValue, 10000)) V.evento({ t: t, tipo: 'texto', valor: 1, texto: x.rawValue.trim().slice(0, 120) }); }); }
        if (dets.b) { var bs = await dets.b.detect(v); L.codigos = bs.map(function (x) { var b = x.boundingBox; return { x: b.x / W, y: b.y / H, w: b.width / W, h: b.height / H, s: x.rawValue }; }); bs.forEach(function (x) { if (x.rawValue && x.format !== 'qr_code' && nuevo('cod|' + x.rawValue, 5000)) V.evento({ t: t, tipo: 'codigo', valor: 1, texto: x.format + ': ' + x.rawValue }); }); }
      }
    } catch (e) { /* un detector que falla no detiene el analisis */ } finally { ocupLector = false; }
  }
})(window);
