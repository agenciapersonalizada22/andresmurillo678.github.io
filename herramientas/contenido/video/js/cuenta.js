/* Cuenta del Editor de video: nombre de la cuenta, XP moderada al exportar y aviso claro de que proyectos y medios
   (videos pesados) se guardan solo en este dispositivo. No hay sincronizacion a la nube. */
(function () {
  var VE = window.VE, CC = window.CuentaContenido; if (!VE || !CC) return;
  CC.integrar({ id: 'contenido_video', sync: false, nombreLocal: 'proyectos y medios', avisoLocal: 'Los videos son pesados y no se suben a la nube.' });
  CC.chip(null, document.getElementById('btnTema'));
  var desc = VE.descargar;
  if (desc) VE.descargar = function (blob, nombre) { if (/\.(mp4|webm|mov)$/i.test(nombre || '')) CC.xp(8); return desc.apply(this, arguments); };
  var D = VE.dlg, aj = D && D.ajustes;
  if (aj) D.ajustes = function () {
    var r = aj.apply(this, arguments), ds = document.querySelectorAll('#dialogos dialog'), c = ds.length && ds[ds.length - 1].querySelector('.cuerpo');
    if (c) { var d = document.createElement('div'); d.style.marginTop = '1rem'; c.appendChild(d); CC.bloque(d); }
    return r;
  };
})();
