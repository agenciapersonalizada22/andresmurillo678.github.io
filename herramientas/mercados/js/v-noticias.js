/* Noticias financieras con filtros y resumen por activo. */
(function () {
  var h = UI.h, F = window.Fmt;
  var CATS = ['todas', 'cripto', 'bolsa', 'divisas', 'nft', 'economia', 'general'];
  function activoDeTicker(t) {
    var T = String(t).toUpperCase(), M = Mercado;
    var a = M.activos.filter(function (x) { return x.simbolo.toUpperCase() === T || String(x.id).toUpperCase() === T; })[0];
    if (!a && /^USD[A-Z]{3}$/.test(T)) a = M.porKey['f:' + T.slice(3)];
    return a || null;
  }
  function sentClase(s) { return s > 0.15 ? 'pos' : s < -0.15 ? 'neg' : ''; }
  App.registrar('noticias', function (cont, r) {
    var obj = Mercado.sec.noticias.obj, todas = (obj.items || []).filter(function (n) { return n.categoria !== 'deportes'; }), est = { cat: 'todas', tk: r.sub || '', sent: 'todas', q: '' };
    var raiz = h('div'), lista = h('div'), resumen = h('div'); cont.appendChild(raiz);
    raiz.appendChild(App.seccionTitulo('Noticias financieras', ['noticias']));
    var cats = h('div.toolbar'), tk = h('input.in', { type: 'search', placeholder: 'Ticker (BTC, AAPL…)', value: est.tk, style: 'max-width:160px', 'aria-label': 'Filtrar por ticker', oninput: function () { est.tk = this.value.trim().toUpperCase(); pintar(); } }),
      q = h('input.in', { type: 'search', placeholder: 'Buscar en titulares', style: 'max-width:220px', 'aria-label': 'Buscar', oninput: function () { est.q = this.value.trim().toLowerCase(); pintar(); } }),
      se = UI.selector([{ id: 'todas', titulo: 'Todo sentimiento' }, { id: 'pos', titulo: 'Positivas' }, { id: 'neu', titulo: 'Neutrales' }, { id: 'neg', titulo: 'Negativas' }], 'todas', { class: 'in', style: 'width:auto', 'aria-label': 'Sentimiento', onchange: function () { est.sent = this.value; pintar(); } });
    CATS.forEach(function (c) { cats.appendChild(h('button.btn.peq', { type: 'button', 'data-c': c, 'aria-pressed': c === est.cat ? 'true' : 'false', onclick: function () { est.cat = c; Array.prototype.forEach.call(cats.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.c === c ? 'true' : 'false'); }); pintar(); } }, c)); });
    raiz.appendChild(cats); raiz.appendChild(h('div.toolbar', tk, q, se)); raiz.appendChild(resumen); raiz.appendChild(lista);
    function filtrar() {
      return todas.filter(function (n) { return (est.cat === 'todas' || n.categoria === est.cat) && (!est.tk || (n.tickers || []).some(function (t) { return String(t).toUpperCase().indexOf(est.tk) >= 0; })) && (est.sent === 'todas' || (est.sent === 'pos' && n.sentimiento > 0.15) || (est.sent === 'neg' && n.sentimiento < -0.15) || (est.sent === 'neu' && Math.abs(n.sentimiento) <= 0.15)) && (!est.q || (n.titulo + ' ' + (n.resumen || '')).toLowerCase().indexOf(est.q) >= 0); })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    }
    function pintar() {
      var fs = filtrar(); UI.vaciar(lista); UI.vaciar(resumen);
      // resumen por activo
      var por = {}; fs.forEach(function (n) { (n.tickers || []).forEach(function (t) { var p = por[t] = por[t] || { t: t, n: 0, s: 0 }; p.n++; p.s += n.sentimiento || 0; }); });
      var top = Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
      if (top.length) { var tarjeta = h('div.tarjeta', { style: 'margin-bottom:10px' }, h('h3', 'Resumen por activo (sobre las noticias filtradas)')); var g = h('div.fila-flex'); top.forEach(function (p) { var avg = p.s / p.n, a = activoDeTicker(p.t); g.appendChild(h('button.btn.peq', { type: 'button', title: 'Filtrar por ' + p.t, onclick: function () { tk.value = p.t; est.tk = p.t; pintar(); } }, h('span.sent' + (sentClase(avg) ? '.' + sentClase(avg) : '')), p.t + ' · ' + p.n + ' · ' + (avg >= 0 ? '+' : '') + avg.toFixed(2))); }); tarjeta.appendChild(g); tarjeta.appendChild(h('p.peq.muted', 'Numero de noticias y sentimiento medio (-1 muy negativo, +1 muy positivo). El sentimiento lo calcula el proceso de datos y es solo orientativo.')); resumen.appendChild(tarjeta); }
      if (!fs.length) { lista.appendChild(h('div.cargando', 'Ninguna noticia coincide con los filtros.')); return; }
      fs.slice(0, 80).forEach(function (n) {
        var meta = h('div.meta', n.fuente, ' · ', F.edad(Date.now() - Date.parse(n.fecha)), ' · ', h('span.etq', n.categoria), h('span', h('span.sent' + (sentClase(n.sentimiento) ? '.' + sentClase(n.sentimiento) : '')), (n.sentimiento >= 0 ? '+' : '') + (n.sentimiento || 0).toFixed(2)));
        (n.tickers || []).forEach(function (t) { var a = activoDeTicker(t); meta.appendChild(h('button.tk', { type: 'button', title: a ? 'Abrir ' + a.nombre : 'Filtrar', onclick: function () { if (a) App.abrirActivo(a.key); else { tk.value = t; est.tk = String(t).toUpperCase(); pintar(); } } }, t)); });
        lista.appendChild(h('article.noticia', h('h4', h('a', { href: F.urlSegura(n.enlace), target: '_blank', rel: 'noopener noreferrer' }, n.titulo)), n.resumen ? h('div.peq.muted', n.resumen) : null, meta));
      });
      if (fs.length > 80) lista.appendChild(h('p.muted.peq', 'Mostrando 80 de ' + fs.length + '.'));
    }
    pintar(); raiz.appendChild(h('p.legal-pie', window.Guia.AVISO + ' Los enlaces llevan a sitios de terceros.')); return {};
  });
})();
