/* Arranque: almacen (IndexedDB), primera ejecucion, restauracion de la vista, ciclo de guardado y registro del service worker. */
(function (G) {
  'use strict';
  var doc = G.document, App = G.App, UI = G.UI, Cfg = G.Config, F = G.Fechas, Mo = G.Modelo;

  function respaldo() {
    if (!G.indexedDB) return Promise.resolve({ r: G.Almacen.respaldoMemoria(), aviso: 'Este navegador no permite IndexedDB: los datos no se conservarán al cerrar.' });
    return new Promise(function (ok) {
      try {
        var q = G.indexedDB.open('notas_probe'); q.onsuccess = function () { q.result.close(); ok({ r: G.Almacen.respaldoIDB('notas_db') }); };
        q.onerror = function () { ok({ r: G.Almacen.respaldoMemoria(), aviso: 'No se pudo abrir el almacenamiento local (¿modo privado?). Los datos se perderán al cerrar: exporta una copia.' }); };
      } catch (e) { ok({ r: G.Almacen.respaldoMemoria(), aviso: 'Almacenamiento local no disponible.' }); }
    });
  }
  function sembrar(S) {
    if (Cfg.prog.sembrado || S.contar('notas') || S.contar('tareas') || S.contar('listas')) { Cfg.setProg('sembrado', true); return; }
    S.poner('listas', Mo.lista({ id: 'ls_personal', nombre: 'Personal', color: 'var(--c6)', orden: 1 })); S.poner('listas', Mo.lista({ id: 'ls_trabajo', nombre: 'Trabajo', color: 'var(--c4)', orden: 2 }));
    S.poner('notas', Mo.nota({ titulo: 'Bienvenida', fijada: true, cuerpo: '## Notas y Tareas\n\nTodo se guarda en tu dispositivo y funciona sin conexión.\n\n- [x] Abre la app\n- [ ] Escribe una tarea arriba: «llamar a mamá mañana 6pm !alta»\n- [ ] Pulsa **Ctrl+K** para la paleta de comandos\n- [ ] Prueba el tablero, el calendario y el modo enfoque\n\nEnlaza notas con corchetes dobles, por ejemplo [[Ideas]], y usa atajos Markdown: `# ` título, `- ` lista, `[] ` casilla.', etiquetas: ['inicio'] }));
    S.poner('notas', Mo.nota({ titulo: 'Ideas', cuerpo: 'Apunta aquí lo que se te ocurra. Vuelve a la [[Bienvenida]].' }));
    G.Tareas.crear({ titulo: 'Probar la captura rápida', lista: 'ls_personal', fecha: F.hoy(), prioridad: 2 });
    Cfg.setProg('sembrado', true);
  }

  function arrancar() {
    Cfg.aplicar();
    if (G.matchMedia) { try { G.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', Cfg.aplicar); } catch (e) {} }
    var fab = doc.getElementById('fab'); fab.appendChild(UI.icono('plus')); fab.addEventListener('click', function () { G.Captura.abrir('tarea'); });
    return (G.Nube ? G.Nube.requerir() : Promise.resolve()).then(respaldo).then(function (o) {
      App.store = G.Almacen.crear({ respaldo: o.r }); G.__notas = { App: App, store: App.store };
      return App.store.listo.then(function (S) { return { S: S, aviso: o.aviso }; });
    }).then(function (o) {
      var S = o.S; S.suscribir(App.alEvento);
      sembrar(S); G.VistaNotas.purgarPapelera(); S.copiaAuto();
      if (G.Nube) G.Nube.iniciar(S);
      if (G.Lobby && G.Lobby.registrar) G.Lobby.registrar(G.Colab.opts);
      if (o.aviso) UI.aviso(o.aviso, { tipo: 'error', fijo: true });
      var h = G.location.hash.replace(/^#/, ''), v = null;
      if (h) { var i = h.indexOf(':'); v = [decodeURIComponent(i < 0 ? h : h.slice(0, i)), decodeURIComponent(i < 0 ? '' : h.slice(i + 1))]; }
      else { try { var u = JSON.parse(G.localStorage.getItem('notas_ui')); if (u) v = [u.v, u.f]; } catch (e) {} }
      if (v && App.vistas[v[0]]) { App.vista = v[0]; App.filtro = v[1] || ''; }
      if (!App.filtro) App.filtro = { tareas: 'hoy', notas: 'todas' }[App.vista] || '';
      G.Editor.recuperarBorrador();
      try { G.history.replaceState({ v: App.vista, f: App.filtro, s: null }, '', '#' + App.vista + (App.filtro ? ':' + App.filtro : '')); } catch (e) {}
      App.render();
      G.Recordatorios.iniciar(); G.NavMando.iniciar(); G.Atajos.iniciar();
      setInterval(function () { G.VistaEnfoque.vigilar(); }, 1000); G.VistaEnfoque.vigilar();
      function volcar() { G.Editor.guardarYa(); S.vaciar(); }
      G.addEventListener('pagehide', volcar); doc.addEventListener('visibilitychange', function () { if (doc.hidden) volcar(); });
      G.addEventListener('beforeunload', volcar);
      if (G.Lobby && G.Lobby.hayEnlace()) G.Lobby.abrir(G.Colab.opts);
      if (!Cfg.prog.tutorial && S.contar('notas') <= 3) { Cfg.setProg('tutorial', true); UI.aviso('Bienvenido. Escribe una tarea en lenguaje natural, o pulsa + o Ctrl+K.', { ms: 7000 }); }
      if (G.navigator.serviceWorker && /^https?:$/.test(G.location.protocol)) G.navigator.serviceWorker.register('sw.js').catch(function () {});
      doc.documentElement.dataset.listo = '1';
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window);
