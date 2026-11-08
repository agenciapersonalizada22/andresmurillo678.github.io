/* Vista Historial: entradas guardadas (se sincronizan con la cuenta) y favoritos. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.QRApp, ui = {}, filtro = 'todos';
  function fecha(t) { try { return new Date(t).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function nombreTipo(id) { return id === 'lote' ? 'Lote' : g.QRTipos.tipo(id).nombre; }
  function pintar() {
    g.QRDatos.listaHistorial().then(function (l) {
      var q = ui.buscar.value.trim().toLowerCase(); ui.lista.textContent = '';
      var v = l.filter(function (r) { return (filtro === 'todos' || r.fav) && (!q || (r.titulo + ' ' + r.texto).toLowerCase().indexOf(q) >= 0); });
      ui.cuenta.textContent = v.length + ' de ' + l.length + ' elemento' + (l.length === 1 ? '' : 's');
      ui.limpiar.disabled = !l.some(function (r) { return !r.fav; });
      if (!v.length) { ui.lista.appendChild(h('li', { cls: 'tr-vacio', txt: l.length ? 'Nada coincide con el filtro.' : 'Aún no hay nada. Lo que exportes, imprimas o guardes en favoritos aparecerá aquí y en tus otros dispositivos.' })); return; }
      v.forEach(function (r) {
        var mini = h('div', { cls: 'qr-mini' }); var sv = r.tipo === 'lote' ? null : A.miniSVG(r.texto, r.ecc, r.estilo); if (sv) mini.innerHTML = sv; else mini.textContent = '▦';
        var li = h('li', { cls: 'qr-item' }, [mini, h('div', {}, [h('b', { txt: r.titulo || r.texto.slice(0, 40) }), h('span', { cls: 'qr-sub', txt: nombreTipo(r.tipo) + ' · ' + fecha(r._t) + (r.origen === 'lectura' ? ' · leído' : '') })]),
          h('div', { cls: 'tr-acciones' }, [
            h('button', { type: 'button', cls: 'tr-btn tr-chico', 'data-acc': 'usar', txt: 'Usar', 'aria-label': 'Usar ' + (r.titulo || ''), on: { click: function () { usar(r); } } }),
            h('button', { type: 'button', cls: 'tr-btn tr-chico', 'data-acc': 'fav', 'aria-pressed': !!r.fav, 'aria-label': (r.fav ? 'Quitar de favoritos ' : 'Marcar favorito ') + (r.titulo || ''), txt: r.fav ? '★ Favorito' : '☆ Favorito', on: { click: function () { g.QRDatos.alternarFav(r.id).then(function () { if (!r.fav) A.logro('favorito'); pintar(); }); } } }),
            h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', 'data-acc': 'borrar', txt: 'Borrar', 'aria-label': 'Borrar ' + (r.titulo || ''), on: { click: function () { g.QRDatos.borrar(r.id).then(function () { pintar(); A.aviso('Eliminado.'); }); } } })])]);
        ui.lista.appendChild(li);
      });
    });
  }
  function usar(r) {
    if (r.tipo === 'lote') { A.est.loteTexto = r.texto; var t = document.getElementById('lo-txt'); if (t) { t.value = r.texto; t.dispatchEvent(new Event('input')); } A.ir('lote'); return; }
    A.est.tipo = 'texto'; A.est.valores = { texto: r.texto };
    var tipo = g.QRTipos.tipo(r.tipo); if (r.tipo === 'url') { A.est.tipo = 'url'; A.est.valores = { url: r.texto }; }
    if (r.ecc) A.est.ecc = r.ecc; if (r.estilo) A.est.estilo = Object.assign({}, A.ESTILO_DEF, r.estilo, { logo: A.est.estilo.logo });
    A.emitir('cargar'); A.ir('crear'); if (tipo.id !== 'texto' && tipo.id !== 'url') A.aviso('Se cargó como texto: edita el contenido directamente.');
  }
  A.iniciarHistorial = function () {
    var raiz = document.getElementById('v-historial');
    ui.buscar = h('input', { type: 'text', id: 'hi-buscar', placeholder: 'Buscar…', 'aria-label': 'Buscar en el historial', autocomplete: 'off' }); ui.buscar.addEventListener('input', pintar);
    ui.cuenta = h('p', { cls: 'tr-ayuda', id: 'hi-cuenta', role: 'status', 'aria-live': 'polite' });
    ui.lista = h('ul', { cls: 'qr-lista', id: 'hi-lista' });
    var fb = ['todos', 'favoritos'].map(function (f) { var b = h('button', { type: 'button', cls: 'tr-btn tr-chico', id: 'hi-f-' + f, 'aria-pressed': f === filtro, txt: f === 'todos' ? 'Todos' : '★ Favoritos', on: { click: function () { filtro = f; fb.forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); pintar(); } } }); return b; });
    ui.limpiar = h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', id: 'hi-limpiar', txt: 'Borrar los no favoritos', on: { click: function () { if (g.confirm('¿Borrar todo el historial salvo los favoritos?')) g.QRDatos.limpiarNoFavoritos().then(function () { pintar(); A.aviso('Historial limpiado.'); }); } } });
    raiz.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Historial y favoritos' }), h('p', { cls: 'tr-sub', txt: 'Se guarda en este dispositivo y, con tu cuenta, se sincroniza con los demás (hasta 200 elementos sin contar favoritos).' }), h('div', { cls: 'tr-acciones' }, fb.concat([ui.limpiar])), h('label', { for: 'hi-buscar', txt: 'Buscar' }), ui.buscar, ui.cuenta, ui.lista]));
    g.QRDatos.alm.suscribir('historial', function () { if (!raiz.hidden) pintar(); }); A.on('historial', function () { if (!raiz.hidden) pintar(); });
    pintar();
  };
  A.alMostrarHistorial = pintar;
})(window);
