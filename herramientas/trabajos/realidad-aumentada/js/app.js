/* Estado compartido de RA: ajustes, logros, acceso a la escena 3D y utilidades. window.RA.App */
(function (g) {
  'use strict';
  var T = g.Tr, RA = g.RA, A = RA.App = {};
  A.aj = RA.Datos.ajustes();
  A.guardarAj = function () { RA.Datos.guardarAjustes(A.aj); };
  A.logro = function (id) { if (g.CuentaTrabajos) g.CuentaTrabajos.logro(id); };
  A.con3d = function (fn) { if (RA.E3) fn(RA.E3); else g.addEventListener('ra-3d-listo', function () { fn(RA.E3); }, { once: true }); };
  A.foto = { capas: [], base: null, nombre: 'foto' };   // base: canvas
  A.vivo = { capas: [] };
  A.irA = function (v) { if (A.pestanas) A.pestanas.ir(v); };
  A.cambios = []; A.alCambiarCapas = function (fn) { A.cambios.push(fn); }; A.emitir = function () { A.cambios.forEach(function (f) { f(); }); };
  A.canvasABlob = function (c, tipo, q) { return new Promise(function (ok, ko) { c.toBlob(function (b) { b ? ok(b) : ko(new Error('No se pudo generar la imagen.')); }, tipo || 'image/png', q); }); };
  A.archivoADataURL = function (f) { return new Promise(function (ok, ko) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { ko(new Error('No se pudo leer el archivo.')); }; r.readAsDataURL(f); }); };
  A.cargarImagen = function (url) { return new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ko(new Error('No se pudo abrir la imagen.')); }; i.src = url; }); };
  A.K = function (w, h) { return { f: RA.Geo.focalDeFov(A.aj.fov, w), cx: (w - 1) / 2, cy: (h - 1) / 2 }; };
})(window);
