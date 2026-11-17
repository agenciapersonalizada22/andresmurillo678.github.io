/* Logros de Ofertas (ids declarados en juego/plataforma/juegos.js). Una sola vez via CuentaNube.logro; sin sesion no hacen nada. */
(function (g) {
  if (!g.Of) return;
  var Of = g.Of;
  Of.logro = function (id) { if (g.CuentaNube && g.CuentaNube.logro) g.CuentaNube.logro(id); };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a.ir, #detIr')) Of.logro('visita_tienda'); }, true);
})(window);
