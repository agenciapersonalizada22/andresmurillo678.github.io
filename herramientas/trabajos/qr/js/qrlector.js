/* Lector de QR: camara (getUserMedia) + BarcodeDetector si existe; si no, decodificador propio sobre fotogramas / imagen subida.
   Todo ocurre en el dispositivo: ninguna imagen se envia a ningun servidor. */
(function (g) {
  'use strict';
  var L = g.QRLector = { motor: null }, det = null, MAXLADO = 900;
  try { if ('BarcodeDetector' in g) { det = new g.BarcodeDetector({ formats: ['qr_code'] }); L.motor = 'BarcodeDetector del navegador'; } } catch (e) { det = null; }
  if (!det) L.motor = 'decodificador propio (básico)';
  L.hayCamara = function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); };

  function aImageData(fuente, w, h) {
    var esc = Math.min(1, MAXLADO / Math.max(w, h)), W = Math.max(1, Math.round(w * esc)), H = Math.max(1, Math.round(h * esc));
    var c = L._c || (L._c = document.createElement('canvas')); c.width = W; c.height = H;
    var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(fuente, 0, 0, W, H); return x.getImageData(0, 0, W, H);
  }
  /* fuente: video, img, canvas, ImageBitmap. Devuelve Promise<{texto, motor}|null> */
  L.leer = function (fuente, w, h) {
    var propio = function () { try { var r = g.QRDecodificador.decodificarImagen(aImageData(fuente, w, h)); return r ? { texto: r.texto, motor: 'propio', corregidos: r.corregidos } : null; } catch (e) { return null; } };
    if (det) return det.detect(fuente).then(function (r) { if (r && r.length && r[0].rawValue) return { texto: r[0].rawValue, motor: 'BarcodeDetector' }; return propio(); }, function () { return propio(); });
    return Promise.resolve(propio());
  };
  L.leerArchivo = function (archivo) {
    if (!archivo || !/^image\//.test(archivo.type)) return Promise.reject(new Error('Elige un archivo de imagen (PNG, JPG, WebP...).'));
    var url = URL.createObjectURL(archivo);
    return new Promise(function (ok, ko) {
      var img = new Image(); img.onload = function () { URL.revokeObjectURL(url); L.leer(img, img.naturalWidth, img.naturalHeight).then(ok, ko); };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('No se pudo abrir la imagen.')); }; img.src = url;
    });
  };
  /* Camara: devuelve {parar(), cambiar()}; alLeer(res) una vez por lectura distinta (y pausa breve), alError(msg) */
  L.iniciarCamara = function (video, alLeer, alError, opts) {
    opts = opts || {}; var flujo = null, activo = true, ultimo = '', ts = 0, camaras = [], idx = 0, facing = 'environment';
    if (!L.hayCamara()) { alError('Este navegador no permite usar la cámara aquí (hace falta HTTPS o localhost). Puedes subir una foto del código.'); return null; }
    function abrir() {
      if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); });
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (f) {
        if (!activo) { f.getTracks().forEach(function (t) { t.stop(); }); return; }
        flujo = f; video.srcObject = f; video.setAttribute('playsinline', ''); video.muted = true; return video.play().then(bucle);
      });
    }
    function bucle() {
      if (!activo) return;
      var ahora = Date.now();
      if (video.readyState >= 2 && video.videoWidth && ahora - ts > (det ? 120 : 280)) {
        ts = ahora;
        L.leer(video, video.videoWidth, video.videoHeight).then(function (r) {
          if (r && activo && (r.texto !== ultimo || Date.now() - (L._t || 0) > 4000)) { ultimo = r.texto; L._t = Date.now(); alLeer(r); }
        }).then(function () { if (activo) requestAnimationFrame(bucle); });
      } else requestAnimationFrame(bucle);
    }
    abrir().catch(function (e) {
      var n = e && e.name;
      alError(n === 'NotAllowedError' || n === 'SecurityError' ? 'Permiso de cámara denegado. Actívalo en los ajustes del navegador o sube una foto del código.' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No se encontró ninguna cámara. Puedes subir una foto del código.' : 'No se pudo abrir la cámara' + (e && e.message ? ' (' + e.message + ')' : '') + '.');
    });
    return {
      parar: function () { activo = false; if (flujo) flujo.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; },
      cambiar: function () { facing = facing === 'environment' ? 'user' : 'environment'; return abrir().catch(function () {}); }
    };
  };
})(window);
