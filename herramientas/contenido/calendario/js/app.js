(function () {
  var $ = U.$, A = App, F = Fechas, M = Modelo;
  var VISTAS = [['calendario', 'Calendario', '📅'], ['tablero', 'Tablero', '🗂️'], ['ideas', 'Ideas', '💡'], ['metricas', 'Métricas', '📊'], ['campanas', 'Campañas', '🎯'], ['plan', 'Plan 30 días', '🗓️'], ['horarios', 'Horarios', '⏰'], ['datos', 'Datos', '⚙️'], ['mas', 'Más', '☰']];
  var MOVIL = ['calendario', 'tablero', 'ideas', 'metricas', 'mas'];
  A.aplicarTema = function () { var t = A.est.ajustes.tema, r = document.documentElement; if (t === 'claro' || t === 'oscuro') r.setAttribute('data-tema', t); else r.removeAttribute('data-tema'); };
  A.vista = function (id, sinHash) {
    if (!VISTAS.some(function (v) { return v[0] === id; })) id = 'calendario';
    VISTAS.forEach(function (v) { $('#v-' + v[0]).classList.toggle('oculto', v[0] !== id); });
    var act = MOVIL.indexOf(id) < 0 ? 'mas' : id;
    U.$$('#tabs [data-ir]').forEach(function (b) { if (b.dataset.ir === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    U.$$('#nav-inf [data-ir]').forEach(function (b) { if (b.dataset.ir === act) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    A.cur = id; if (A.vistas[id]) A.vistas[id](); if (!sinHash) history.replaceState(null, '', '#' + id);
  };
  function ciclar(d) { var l = VISTAS.filter(function (v) { return v[0] !== 'mas'; }), i = l.findIndex(function (v) { return v[0] === A.cur; }); A.vista(l[(i + d + l.length) % l.length][0]); }
  function refrescar(q) {
    if (!A.cur || !A.vistas[A.cur]) return;
    if (['calendario', 'tablero', 'ideas', 'metricas'].indexOf(A.cur) >= 0 || (A.cur === 'campanas' && q === 'pubs')) A.vistas[A.cur]();
  }

  /* Recordatorios: solo funcionan con la pagina abierta */
  function revisar() {
    var s = A.est.ajustes, ahora = Date.now(), hoy = F.hoy('UTC'), ds = F.sumarDias(hoy, -1), hs = F.sumarDias(hoy, 2), cambio = false;
    M.ocurrencias(A.est.pubs.filter(function (p) { return p.recordar > 0 && p.estado !== 'publicado'; }), ds, hs).forEach(function (o) {
      var t = F.instante(o.fecha, o.hora, A.zona(o.pub)), k = o.pub.id + '@' + o.fecha;
      if (ahora >= t - o.pub.recordar * 60000 && ahora < t + 3600000 && !s.avisados[k]) {
        s.avisados[k] = ahora; cambio = true;
        var msg = (ahora < t ? 'En ' + Math.max(1, Math.round((t - ahora) / 60000)) + ' min: ' : 'Ahora: ') + o.pub.titulo;
        U.toast('⏰ ' + msg + ' (' + M.REDES[o.pub.red].nombre + ')', 8000);
        var c = $('#chip-aviso'); c.textContent = '⏰ ' + msg; c.classList.remove('oculto');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification('Hora de publicar', { body: msg + ' · ' + M.REDES[o.pub.red].nombre, tag: k }); } catch (e) {} }
      }
    });
    Object.keys(s.avisados).forEach(function (k) { if (ahora - s.avisados[k] > 7 * 86400000) { delete s.avisados[k]; cambio = true; } });
    if (cambio) A.guardarAjustes();
  }
  A.revisarRecordatorios = revisar;
  function importarPuente() {
    if (!/importar=1/.test(location.search)) return;
    var raw = A.storage.getItem('contenido_puente'); if (!raw) return;
    try {
      var p = JSON.parse(raw), g = Exportar.parsearGuion(p.texto), red = M.REDES[p.red] ? p.red : 'instagram';
      var base = { titulo: p.titulo || 'Desde el Escritor', texto: p.texto, red: red, formato: { guion: 'Video corto', hilo: 'Hilo', carrusel: 'Carrusel' }[p.formato] || 'Publicación con imagen', estado: g.escenas.length ? 'guion' : 'idea', escenas: g.escenas.length ? M.escenasDesdeGuion(g) : [], fecha: '' };
      if (g.escenas.length) base.texto = '';
      A.storage.setItem('contenido_puente', ''); history.replaceState(null, '', location.pathname + '#calendario');
      setTimeout(function () { Editor.abrir(base, true); U.toast('Contenido del Escritor listo: elige fecha y guarda'); }, 200);
    } catch (e) {}
  }
  async function iniciar() {
    $('#tabs').innerHTML = VISTAS.filter(function (v) { return v[0] !== 'mas'; }).map(function (v) { return '<button data-ir="' + v[0] + '">' + v[1] + '</button>'; }).join('');
    $('#nav-inf').innerHTML = VISTAS.filter(function (v) { return MOVIL.indexOf(v[0]) >= 0; }).map(function (v) { return '<button data-ir="' + v[0] + '"><span aria-hidden="true">' + v[2] + '</span>' + v[1] + '</button>'; }).join('');
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) A.vista(b.dataset.ir); });
    await A.cargar(); A.aplicarTema(); Editor.iniciar(); A.calendario.iniciar(); A.tablero.iniciar(); A.metricasVista.iniciar(); A.on(refrescar);
    A.vista((location.hash || '#calendario').slice(1), true);
    $('#btn-tema').onclick = function () { var s = A.est.ajustes, os = matchMedia('(prefers-color-scheme: dark)').matches, act = s.tema === 'auto' ? (os ? 'oscuro' : 'claro') : s.tema; s.tema = act === 'oscuro' ? 'claro' : 'oscuro'; A.aplicarTema(); A.guardarAjustes(); };
    $('#btn-ayuda').onclick = function () { U.abrirDialogo($('#dlg-ayuda')); };
    $('#c-ayuda').onclick = function () { U.cerrarDialogo($('#dlg-ayuda')); };
    $('#chip-aviso').onclick = function () { this.classList.add('oculto'); };
    document.addEventListener('keydown', function (e) {
      if (Tele.tecla(e)) return;
      var en = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName), dlg = document.querySelector('dialog[open]');
      if (e.altKey && /^[1-5]$/.test(e.key) && !dlg) { e.preventDefault(); A.vista(MOVIL[+e.key - 1]); return; }
      if (en || dlg || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '?') U.abrirDialogo($('#dlg-ayuda'));
      else if (A.cur === 'calendario') {
        if (e.key === 'n') { e.preventDefault(); A.calendario.nueva(); } else if (e.key === 't') A.calendario.hoy();
        else if (e.key === 'ArrowLeft') A.calendario.mover(-1); else if (e.key === 'ArrowRight') A.calendario.mover(1);
        else if (/^[1-4]$/.test(e.key)) A.calendario.modo(['mes', 'semana', 'dia', 'lista'][+e.key - 1]);
      } else if (e.key === 'n') { e.preventDefault(); Editor.abrir({}, true); }
    });
    window.MandoUI = { vista: ciclar, atras: function () { if (Tele.abierto()) Tele.cerrar(); }, accion: function () { if (Tele.abierto()) Tele.alternar(); else A.calendario.nueva(); } };
    importarPuente(); revisar(); setInterval(revisar, 30000);
  }
  iniciar().catch(function (e) { console.error(e); document.body.insertAdjacentHTML('afterbegin', '<div class="aviso mal">Error al iniciar: ' + U.esc(e.message) + '</div>'); });
})();
