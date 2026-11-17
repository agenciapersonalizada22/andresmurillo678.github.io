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
  A.guardar = function (col, obj) {
    return guardar.apply(A, arguments).then(function (r) {
      if (col === 'historial') {
        CC.xp(5);
        if (obj && obj.texto && String(obj.texto).trim()) {
          CC.logro('primer_texto'); if (obj.modo === 'ia' && !obj.parcial) CC.logro('primer_texto_ia'); if (obj.modo === 'manual') CC.logro('texto_manual'); if (obj.marca) CC.logro('con_marca');
          if (A.est.historial.length >= 10) CC.logro('historial_10');
        }
      } else if (col === 'marcas') CC.logro('primera_marca'); else if (col === 'plantillas') CC.logro('plantilla_propia');
      return r;
    });
  };
  if (A.usarPlantilla) { var up = A.usarPlantilla; A.usarPlantilla = function () { CC.logro('usar_plantilla'); return up.apply(this, arguments); }; }
  if (A.mostrarDiff) { var md = A.mostrarDiff; A.mostrarDiff = function () { CC.logro('comparar_versiones'); return md.apply(this, arguments); }; }
  var X = window.Exportar;
  if (X && X.descargar) { var xd = X.descargar; X.descargar = function (nombre) { CC.logro(/\.srt$/i.test(nombre || '') ? 'exportar_srt' : 'primera_exportacion'); return xd.apply(this, arguments); }; }
  function revisarIA() { try { if (A.iaLista && A.iaLista()) CC.logro('ia_configurada'); } catch (e) {} }
  if (A.guardarAjustes) { var ga = A.guardarAjustes; A.guardarAjustes = function () { var r = ga.apply(this, arguments); revisarIA(); return r; }; }
  if (A.claves && A.claves.guardar) { var cg = A.claves.guardar; A.claves.guardar = function () { return Promise.resolve(cg.apply(this, arguments)).then(function (r) { revisarIA(); return r; }); }; }
  if (CC.listo) CC.listo.then(revisarIA);
  var vista = A.vistas.ajustes, v = document.getElementById('v-ajustes'), poner = function () {
    if (!v.children.length || v.querySelector('.cc-bloque')) return;
    var d = document.createElement('div'); d.className = 'cc-hueco'; d.style.marginTop = '1rem'; v.appendChild(d); CC.bloque(d);
  };
  /* la vista se vuelve a pintar entera tras cada cambio: se re-inserta el bloque */
  new MutationObserver(poner).observe(v, { childList: true });
  A.vistas.ajustes = function () { vista(); poner(); };
})();
