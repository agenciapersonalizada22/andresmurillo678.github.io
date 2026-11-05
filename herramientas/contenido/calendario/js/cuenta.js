/* Cuenta y nube del Calendario: sincroniza publicaciones, ideas y campanas (instantanea con marcas de tiempo, fusion por el mas reciente).
   NO se sincronizan: los ajustes (zona, horarios, proveedor, modelos, avisos) ni la clave de IA (contenido_escritor_claves_dispositivo). */
(function () {
  var A = window.App, CC = window.CuentaContenido; if (!A || !CC) return;
  function dialogoAbierto() { return !!document.querySelector('dialog[open]:not(.cc-dlg)'); }
  function refrescar(n) {
    if (dialogoAbierto()) return setTimeout(function () { refrescar(n); }, 5000);
    A.cargar().then(function () {
      ['pubs', 'ideas', 'campanas'].forEach(function (c) { A.avisar(c); });
      if (['campanas', 'plan', 'horarios'].indexOf(A.cur) >= 0 && A.vistas[A.cur]) A.vistas[A.cur]();
      if (window.U && U.toast) U.toast('Se actualizaron ' + n + ' elemento(s) desde tu cuenta');
    });
  }
  CC.integrar({ id: 'contenido_calendario', alm: A.alm, cols: ['pubs', 'ideas', 'campanas'], sync: true, etiqueta: 'publicaciones, guiones, ideas y campañas', alAplicar: refrescar });
  CC.chip(null, document.getElementById('btn-tema'));
  var guardar = A.guardar;
  A.guardar = function (col, obj) { return guardar.apply(A, arguments).then(function (r) { if (col === 'pubs') CC.xp(3); return r; }); };
  var vista = A.vistas.datos, v = document.getElementById('v-datos'), poner = function () {
    if (!v.children.length || v.querySelector('.cc-bloque')) return;
    var d = document.createElement('div'); d.className = 'cc-hueco'; d.style.marginTop = '1rem'; v.appendChild(d); CC.bloque(d);
  };
  /* la vista se vuelve a pintar entera tras cada cambio: se re-inserta el bloque */
  new MutationObserver(poner).observe(v, { childList: true });
  A.vistas.datos = function () { vista(); poner(); };
})();
