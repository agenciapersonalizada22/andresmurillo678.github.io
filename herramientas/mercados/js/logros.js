/* Logros de Mercados (ids declarados en juego/plataforma/juegos.js). Se otorgan una sola vez via CuentaNube.logro;
   sin sesion no hacen nada. Los de datos se detectan observando el Almacen; el resto lo llama cada vista. */
(function () {
  function dar(id) { if (window.CuentaNube && CuentaNube.logro) CuentaNube.logro(id); }
  window.Logros = { dar: dar };
  if (typeof Almacen === 'undefined') return;
  function n(v) { return Array.isArray(v) ? v.length : 0; }
  Almacen.suscribir('alertas', function (k, v) { if (n(v)) dar('primera_alerta'); });
  Almacen.suscribir('alertas_historial', function (k, v) { if (n(v)) dar('alerta_disparada'); });
  Almacen.suscribir('listas', function (k, v) { if (n(v) > 1) dar('lista_propia'); });
  Almacen.suscribir('sim', function (k, v) { if (v && n(v.ordenes)) dar('orden_simulada'); });
  Almacen.suscribir('real', function (k, v) { if (n(v) && v.some(function (c) { return n(c.transacciones); })) dar('cartera_real'); });
  Almacen.suscribir('screeners', function (k, v) { if (n(v)) dar('screener_guardado'); });
  Almacen.suscribir('cmp_sel', function (k, v) { if (n(v) >= 2) dar('comparador'); });
  Almacen.suscribir('dibujos_', function (k, v) { if (n(v)) dar('primer_dibujo'); }, true);
  window.Logros.ruta = function (r) {
    if (r.seccion === 'activo' && r.sub) dar('primer_activo');
  };
})();
