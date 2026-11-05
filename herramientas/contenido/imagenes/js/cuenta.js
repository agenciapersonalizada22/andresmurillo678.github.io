/* Cuenta del Editor de imagenes: nombre de la cuenta, XP moderada al exportar y aviso claro de que los proyectos (imagenes pesadas)
   se guardan solo en este dispositivo. No hay sincronizacion a la nube. */
(function () {
  var IM = window.IM, CC = window.CuentaContenido; if (!IM || !CC) return;
  CC.integrar({ id: 'contenido_imagenes', sync: false, nombreLocal: 'proyectos e imágenes', avisoLocal: 'Las imágenes son pesadas y no se suben a la nube.' });
  CC.chip(null, document.getElementById('bExportar'));
  var desc = IM.descargar;
  if (desc) IM.descargar = function () { CC.xp(5); return desc.apply(this, arguments); };
})();
