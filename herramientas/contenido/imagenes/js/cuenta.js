/* Cuenta del Editor de imagenes: nombre de la cuenta, XP moderada al exportar y aviso claro de que los proyectos (imagenes pesadas)
   se guardan solo en este dispositivo. No hay sincronizacion a la nube. */
(function () {
  var IM = window.IM, CC = window.CuentaContenido; if (!IM || !CC) return;
  CC.integrar({ id: 'contenido_imagenes', sync: false, nombreLocal: 'proyectos e imágenes', avisoLocal: 'Las imágenes son pesadas y no se suben a la nube.' });
  CC.chip(null, document.getElementById('bExportar'));
  var desc = IM.descargar;
  if (desc) IM.descargar = function (blob, nombre) {
    CC.xp(5);
    var ext = (String(nombre || '').match(/\.(\w+)$/) || [])[1];
    CC.logro(ext === 'zip' ? 'exportar_lote' : ext === 'svg' ? 'exportar_svg' : 'primera_exportacion');
    return desc.apply(this, arguments);
  };
  /* logros por contenido del proyecto (se revisan tras cada cambio; CC.logro es idempotente) */
  var E = IM.E;
  function recorrer(capas, f) { (capas || []).forEach(function (c) { f(c); if (c.hijos) recorrer(c.hijos, f); }); }
  function revisar() {
    try {
      var tipos = {}, total = 0, efecto = false;
      E.proy.paginas.forEach(function (p) { recorrer(p.capas, function (c) { tipos[c.tipo] = 1; total++; if (c.sombra || c.mascara) efecto = true; }); });
      if (tipos.texto) CC.logro('primer_texto'); if (tipos.forma) CC.logro('primera_forma'); if (tipos.imagen) CC.logro('primera_imagen');
      if (tipos.qr) CC.logro('primer_qr'); if (tipos.ajuste) CC.logro('primer_ajuste'); if (efecto) CC.logro('sombra_o_mascara');
      if (total >= 10) CC.logro('diseno_10_capas'); if (E.proy.paginas.length >= 2) CC.logro('varias_paginas');
    } catch (e) {}
  }
  if (E && E.on) E.on('doc', revisar);
  if (E && E.cambioDoc) { var cd = E.cambioDoc; E.cambioDoc = function (nombre) { if (/^Plantilla /.test(nombre || '')) CC.logro('primera_plantilla'); return cd.apply(this, arguments); }; }
  var X = IM.Exportar; if (X && X.copiar) { var cp = X.copiar; X.copiar = function () { return cp.apply(this, arguments).then(function (r) { CC.logro('copiar_imagen'); return r; }); }; }
  var P = IM.Proy; if (P && P.guardar) { var pg = P.guardar; P.guardar = function () { return pg.apply(this, arguments).then(function (r) { try { if (E.proy && E.proy.paginas.some(function (p) { return p.capas.length; })) CC.logro('proyecto_guardado'); } catch (e) {} return r; }); }; }
})();
