/* Cuenta del Editor de video: nombre de la cuenta, XP moderada al exportar y aviso claro de que proyectos y medios
   (videos pesados) se guardan solo en este dispositivo. No hay sincronizacion a la nube. */
(function () {
  var VE = window.VE, CC = window.CuentaContenido; if (!VE || !CC) return;
  CC.integrar({ id: 'contenido_video', sync: false, nombreLocal: 'proyectos y medios', avisoLocal: 'Los videos son pesados y no se suben a la nube.' });
  CC.chip(null, document.getElementById('btnTema'));
  var desc = VE.descargar;
  if (desc) VE.descargar = function (blob, nombre) {
    var n = nombre || '';
    if (/\.(mp4|webm|mov)$/i.test(n)) CC.xp(8);
    if (/\.(srt|vtt)$/i.test(n)) CC.logro('subtitulos_exportados'); else if (/\.cvp$/i.test(n)) CC.logro('proyecto_exportado');
    return desc.apply(this, arguments);
  };
  /* el video exportado cuenta cuando el render termina bien, no al pulsar Descargar */
  var EX = VE.exportador;
  if (EX && EX.exportar) { var ex = EX.exportar; EX.exportar = function () { return ex.apply(this, arguments).then(function (r) { CC.logro('primer_video_exportado'); return r; }); }; }
  /* logros por contenido del proyecto, revisados tras cada cambio (CC.logro es idempotente) */
  var A = VE.app, M = VE.modelo;
  if (A && A.commit && M) {
    var com = A.commit;
    A.commit = function (clave) {
      var r = com.apply(this, arguments);
      try {
        var cl = M.todos(A.p), t = {};
        cl.forEach(function (c) {
          t[c.tipo] = 1;
          if (c.sub) t.sub = 1; if (c.filtro && c.filtro !== 'ninguno') t.filtro = 1; if (c.trans) t.trans = 1; if (c.croma) t.croma = 1;
          if (c.kf && Object.keys(c.kf).some(function (k) { return c.kf[k] && c.kf[k].length; })) t.kf = 1;
        });
        if (t.video || t.imagen) CC.logro('primer_clip'); if (t.texto && cl.some(function (c) { return c.tipo === 'texto' && !c.sub; })) CC.logro('primer_texto');
        if (t.emoji || t.forma) CC.logro('primera_pegatina'); if (t.audio) CC.logro('primer_audio'); if (t.sub) CC.logro('primeros_subtitulos');
        if (t.filtro) CC.logro('primer_filtro'); if (t.trans) CC.logro('primera_transicion'); if (t.kf) CC.logro('primer_keyframe'); if (t.croma) CC.logro('fondo_croma');
        if (clave === 'dividir') CC.logro('primer_corte'); if (clave === 'plantilla') CC.logro('primera_plantilla');
      } catch (e) {}
      return r;
    };
  }
  var D = VE.dlg, aj = D && D.ajustes;
  if (aj) D.ajustes = function () {
    var r = aj.apply(this, arguments), ds = document.querySelectorAll('#dialogos dialog'), c = ds.length && ds[ds.length - 1].querySelector('.cuerpo');
    if (c) { var d = document.createElement('div'); d.style.marginTop = '1rem'; c.appendChild(d); CC.bloque(d); }
    return r;
  };
})();
