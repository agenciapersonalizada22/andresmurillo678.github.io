/* Logros de Apuestas (ids declarados en juego/plataforma/juegos.js). Una sola vez via CuentaNube.logro; sin sesion no hacen nada.
   Solo premian el uso de las herramientas de analisis, el orden del registro y el juego responsable; nunca resultados ni importes. */
(function (g) {
  if (!g.Apuestas) return;
  function dar(id) { if (g.CuentaNube && g.CuentaNube.logro) g.CuentaNube.logro(id); }
  g.Apuestas.logro = dar;
  g.Apuestas.logrosApuesta = function (a, esNueva) {
    if (esNueva) dar('primera_apuesta');
    if (a && a.notas && String(a.notas).trim()) dar('apuesta_con_nota');
    if (a && a.estado && a.estado !== 'pendiente') dar('apuesta_cerrada');
  };
  g.Apuestas.logrosCfg = function (p) {
    if (p.reglas && p.reglas.length) dar('primera_alerta');
    if (p.bancaInicial > 0) dar('banca_definida');
    var L = p.limites; if (L && (L.perdidaDia > 0 || L.perdidaSemana > 0 || L.perdidaMes > 0 || L.tiempoMin > 0)) dar('limite_responsable');
  };
  g.Apuestas.logrosRuta = function (ruta, S) {
    if (ruta === 'analisis' && S.datos) dar('primer_analisis');
    else if (ruta === 'modelos') dar('primer_modelo');
    else if (ruta === 'panel' && S.apuestas.length) dar('panel_visto');
  };
  g.Apuestas.logrosDatos = function (S) { if (!S.cfg.demo && S.estadoDatos === 'ok' && !S.obsoleto) dar('cuotas_en_vivo'); };
})(window);
