/* Cuenta y nube del Escritor: sincroniza historial, marcas y plantillas (instantanea con marcas de tiempo, fusion por el mas reciente).
   NO se sincronizan: los ajustes (tema, proveedor, modelos, tarifas) ni la clave de IA (contenido_escritor_claves_dispositivo). */
(function () {
  var A = window.App, CC = window.CuentaContenido; if (!A || !CC) return;
  function dialogoAbierto() { return !!document.querySelector('dialog[open]:not(.cc-dlg)'); }
  function refrescar(n) {
    if (dialogoAbierto()) return setTimeout(function () { refrescar(n); }, 5000);
    A.cargar().then(function () {
      ['marcas', 'plantillas', 'historial'].forEach(function (c) { A.avisar(c); });
      if (['marcas', 'plantillas', 'historial'].indexOf(A.cur) >= 0 && A.vistas[A.cur]) A.vistas[A.cur]();
      if (window.U && U.toast) U.toast('Se actualizaron ' + n + ' elemento(s) desde tu cuenta');
    });
  }
  CC.integrar({ id: 'contenido_escritor', alm: A.alm, cols: ['marcas', 'plantillas', 'historial'], sync: true, etiqueta: 'historial, marcas y plantillas', alAplicar: refrescar });
  CC.chip(null, document.getElementById('btn-tema'));
  var guardar = A.guardar;
  A.guardar = function (col, obj) { return guardar.apply(A, arguments).then(function (r) { if (col === 'historial') CC.xp(5); return r; }); };
  var vista = A.vistas.ajustes, v = document.getElementById('v-ajustes'), poner = function () {
    if (!v.children.length || v.querySelector('.cc-bloque')) return;
    var d = document.createElement('div'); d.className = 'cc-hueco'; d.style.marginTop = '1rem'; v.appendChild(d); CC.bloque(d);
  };
  /* la vista se vuelve a pintar entera tras cada cambio: se re-inserta el bloque */
  new MutationObserver(poner).observe(v, { childList: true });
  A.vistas.ajustes = function () { vista(); poner(); };
})();
