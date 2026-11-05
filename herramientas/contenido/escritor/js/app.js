(function () {
  var $ = U.$, A = App, VISTAS = [['escribir', 'Escribir', '✍️'], ['marcas', 'Marcas', '🎨'], ['plantillas', 'Plantillas', '🧩'], ['historial', 'Historial', '🕘'], ['ajustes', 'Ajustes', '⚙️']];
  A.aplicarTema = function () {
    var t = A.est.ajustes.tema, r = document.documentElement;
    if (t === 'claro' || t === 'oscuro') r.setAttribute('data-tema', t); else r.removeAttribute('data-tema');
  };
  A.vista = function (id, sinHash) {
    if (!VISTAS.some(function (v) { return v[0] === id; })) id = 'escribir';
    VISTAS.forEach(function (v) { $('#v-' + v[0]).classList.toggle('oculto', v[0] !== id); });
    U.$$('[data-ir]').forEach(function (b) { if (b.dataset.ir === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (A.vistas[id]) A.vistas[id]();
    A.cur = id; if (!sinHash) history.replaceState(null, '', '#' + id);
  };
  function ciclar(d) { var i = VISTAS.findIndex(function (v) { return v[0] === A.cur; }); A.vista(VISTAS[(i + d + VISTAS.length) % VISTAS.length][0]); }
  async function iniciar() {
    var tabs = VISTAS.map(function (v) { return '<button data-ir="' + v[0] + '">' + v[1] + '</button>'; }).join('');
    $('#tabs').innerHTML = tabs; $('#nav-inf').innerHTML = VISTAS.map(function (v) { return '<button data-ir="' + v[0] + '"><span aria-hidden="true">' + v[2] + '</span>' + v[1] + '</button>'; }).join('');
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) A.vista(b.dataset.ir); });
    await A.cargar(); A.aplicarTema(); A.escribir.iniciar(); A.vista((location.hash || '#escribir').slice(1), true);
    $('#btn-tema').onclick = function () { var s = A.est.ajustes, osOscuro = matchMedia('(prefers-color-scheme: dark)').matches, act = s.tema === 'auto' ? (osOscuro ? 'oscuro' : 'claro') : s.tema; s.tema = act === 'oscuro' ? 'claro' : 'oscuro'; A.aplicarTema(); A.guardarAjustes(); };
    $('#btn-ayuda').onclick = function () { U.abrirDialogo($('#dlg-ayuda')); }; $('#c-ayuda').onclick = function () { U.cerrarDialogo($('#dlg-ayuda')); };
    document.addEventListener('keydown', function (e) {
      var en = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); A.vista('escribir'); A.escribir.generar(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); A.escribir.guardar(); }
      else if (e.key === 'Escape' && A.escribir.corriendo()) A.escribir.cancelar();
      else if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); A.vista(VISTAS[+e.key - 1][0]); }
      else if (e.key === '?' && !en) U.abrirDialogo($('#dlg-ayuda'));
    });
    window.MandoUI = { vista: ciclar, atras: function () { A.vista('escribir'); }, accion: function () { A.escribir.generar(); } };
    window.addEventListener('beforeunload', function () { A.claves.bloquear(); });
  }
  iniciar().catch(function (e) { console.error(e); document.body.insertAdjacentHTML('afterbegin', '<div class="aviso mal">Error al iniciar: ' + U.esc(e.message) + '</div>'); });
})();
