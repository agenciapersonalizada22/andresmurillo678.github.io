/* Arranque: recupera el ultimo proyecto, inicia vista, entrada e interfaz. */
(function (IM) {
  var E = IM.E;
  window.addEventListener('error', function (e) { console.error(e.error || e.message); });
  IM.Almacen.abrir().then(function () { return IM.Proy.recuperar(); }).then(function (recuperado) {
    var area = document.getElementById('area');
    IM.Vista.init(area); IM.Entrada.init(area); IM.UICapas.iniciarPaginas(); IM.UI.iniciar(); IM.MandoCursor.iniciar();
    E.emit('ajustar'); E.emit('hist'); E.emit('paginas'); E.emit('guardado', 'guardado'); E.dibujar();
    if (recuperado) IM.aviso('Proyecto recuperado: ' + E.proy.nombre);
    if ('serviceWorker' in navigator) { /* sin service worker: todo funciona sin conexion tras la primera carga del navegador */ }
    IM.listo = true;
  }).catch(function (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', '<p style="padding:2rem">No se pudo iniciar el editor: ' + String(e && e.message || e) + '</p>'); });
})(window.IM);
