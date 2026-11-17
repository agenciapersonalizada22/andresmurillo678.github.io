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
  var vinoDelEscritor = false; try { vinoDelEscritor = /importar=1/.test(location.search) && !!A.storage.getItem('contenido_puente'); } catch (e) {}
  A.guardar = function (col, obj) {
    return guardar.apply(A, arguments).then(function (r) {
      if (col === 'pubs') {
        CC.xp(3); CC.logro('primer_evento');
        if (obj) {
          if (obj.estado === 'programado' && obj.fecha) CC.logro('evento_programado'); if (obj.estado === 'publicado') CC.logro('publicacion_publicada');
          var m = obj.metricas; if (m && (m.vistas > 0 || m.likes > 0 || m.comentarios > 0 || m.compartidos > 0 || m.clics > 0)) CC.logro('primeras_metricas');
        }
        if (A.est.pubs.length >= 10) CC.logro('serie_10');
        if (vinoDelEscritor) CC.logro('desde_escritor');
      } else if (col === 'ideas') CC.logro('primera_idea'); else if (col === 'campanas') CC.logro('primera_campana');
      return r;
    });
  };
  var X = window.Exportar;
  if (X && X.descargar) { var xd = X.descargar; X.descargar = function (nombre) { var n = nombre || ''; CC.logro(/\.ics$/i.test(n) ? 'exportar_ics' : /\.csv$/i.test(n) ? 'exportar_csv' : 'respaldo_exportado'); return xd.apply(this, arguments); }; }
  if (A.guardarAjustes) { var ga = A.guardarAjustes; A.guardarAjustes = function () { var r = ga.apply(this, arguments); try { if (A.est.ajustes.notif) CC.logro('recordatorios_activados'); } catch (e) {} return r; }; }
  var vista = A.vistas.datos, v = document.getElementById('v-datos'), poner = function () {
    if (!v.children.length || v.querySelector('.cc-bloque')) return;
    var d = document.createElement('div'); d.className = 'cc-hueco'; d.style.marginTop = '1rem'; v.appendChild(d); CC.bloque(d);
  };
  /* la vista se vuelve a pintar entera tras cada cambio: se re-inserta el bloque */
  new MutationObserver(poner).observe(v, { childList: true });
  A.vistas.datos = function () { vista(); poner(); };
})();
