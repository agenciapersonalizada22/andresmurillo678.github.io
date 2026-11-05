/* Adjuntos de imagen: se reducen (max 1600 px) y se guardan como data URL en la coleccion 'adjuntos'. */
(function (G) {
  'use strict';
  var U = G.Util, A = G.Adjuntos = {};
  A.MAX = 1600;
  A.agregar = function (file) {
    return new Promise(function (ok, mal) {
      if (!file || !/^image\//.test(file.type)) return mal(new Error('Solo se admiten imágenes'));
      var lector = new FileReader();
      lector.onerror = function () { mal(new Error('No se pudo leer la imagen')); };
      lector.onload = function () {
        var url = lector.result;
        if (file.type === 'image/svg+xml' || file.type === 'image/gif' || file.size < 150000) return fin(url, file.type);
        var img = new Image();
        img.onerror = function () { fin(url, file.type); };
        img.onload = function () {
          var k = Math.min(1, A.MAX / Math.max(img.width, img.height)), c = G.document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var tipo = file.type === 'image/png' && file.size < 600000 ? 'image/png' : 'image/jpeg';
          fin(c.toDataURL(tipo, 0.85), tipo);
        };
        img.src = url;
      };
      lector.readAsDataURL(file);
      function fin(url, tipo) {
        var a = G.App.store.poner('adjuntos', { id: U.id(), nombre: file.name || 'imagen', tipo: tipo, url: url, bytes: Math.round(url.length * 0.75), creada: Date.now() });
        ok(a);
      }
    });
  };
  A.elegir = function (cb) {
    var i = G.UI.h('input', { type: 'file', accept: 'image/*', multiple: true, style: 'position:fixed;left:-999px' });
    i.addEventListener('change', function () { Array.prototype.forEach.call(i.files, function (f) { A.agregar(f).then(cb, function (e) { G.UI.aviso(e.message, { tipo: 'error' }); }); }); i.remove(); });
    G.document.body.appendChild(i); i.click();
  };
})(window);
