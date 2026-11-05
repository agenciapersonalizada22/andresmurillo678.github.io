/* Vista de detalle: precio, analisis (inflado / minimo historico), grafica del historial, comparador entre tiendas y acciones. */
(function () {
  var Of = window.Of, A = Of.app, S = A.S, esc = A.esc, $ = A.$;
  var obs = null;

  function stat(l, v) { return '<div><div class="muted peq">' + l + '</div><b>' + v + '</b></div>'; }

  A.abrirDetalle = function (it) {
    var enFeed = S.porId[it.id] === it, miembros = enFeed ? A.miembros(it) : [it], an = it._an, g = S.guardados[it.id] || {};
    var mon = it._mv, a = Of.moneda, cv = function (v, de) { return A.conv(v, de, mon); };
    var et = [];
    if (an.mejorHistorico) et.push('<span class="e ok">Mínimo histórico</span>'); else if (an.cercaMinimo) et.push('<span class="e ok">Cerca del mínimo histórico</span>');
    if (an.inflado) et.push('<span class="e mal">Precio inflado</span>');
    if (it._calor >= 35) et.push('<span class="e calor">🔥 Calor ' + it._calor + ' (' + Of.calor.nivel(it._calor) + ')</span>');
    if (A.esNueva(it) && enFeed) et.push('<span class="e prim">NUEVA</span>');
    if (it.demo) et.push('<span class="e aviso">DEMO</span>');
    var ahorro = it._av ? it._av - it._pv : 0;
    var analisis = '<div class="tarj" style="margin-top:10px"><b>Análisis del precio</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:6px">' +
      stat('Descuento declarado', Math.round(an.declarado * 100) + '%') + (an.sinHistorial ? stat('Descuento real', 'Sin historial suficiente') : stat('Descuento real (vs mediana 90 d)', Math.round(an.descReal * 100) + '%')) +
      (an.minimo != null ? stat('Mínimo previo', A.fmt(cv(an.minimo, it.moneda), mon)) + stat('Mediana previa', A.fmt(cv(an.mediana, it.moneda), mon)) + stat('Máximo previo', A.fmt(cv(an.maximo, it.moneda), mon)) : '') + '</div>' +
      (an.inflado ? '<p class="mal-t" style="margin:8px 0 0"><b>Posible precio inflado.</b> ' + esc(an.motivo) + '</p>' : '') +
      (an.mejorHistorico ? '<p class="ok-t" style="margin:8px 0 0"><b>Es el precio más bajo registrado</b> en ' + an.n + ' observaciones previas.</p>' : '') +
      (an.sinHistorial ? '<p class="muted peq" style="margin:8px 0 0">Aun no hay suficientes datos históricos (se necesitan 3 o más observaciones en 5 días o más) para comprobar el precio anterior.</p>' : '') + '</div>';
    var venc = it._vence ? '<p style="margin:4px 0"><b>Vencimiento:</b> <span class="cuenta ' + A.cuenta(it._vence).c + '" data-vence="' + it._vence + '">' + A.cuenta(it._vence).t + '</span> <span class="muted peq">(' + new Date(it._vence).toLocaleString('es') + ')</span></p>' : '';
    var cupon = it.cupon ? '<p style="margin:4px 0"><b>Cupón:</b> <button type="button" class="cupon" id="detCupon">' + esc(it.cupon) + ' <span class="cp">Copiar</span></button></p>' : '';
    var comp = miembros.length > 1 ? '<h3 style="margin:14px 0 4px">Comparador de precios (' + miembros.length + ' ofertas del mismo producto)</h3>' + miembros.slice().sort(function (x, y) { return x._usd - y._usd; }).map(function (m, i) {
      var dif = i ? '+' + Math.round((m._usd / miembros.slice().sort(function (x, y) { return x._usd - y._usd; })[0]._usd - 1) * 100) + '%' : '';
      return '<div class="comp"><div class="crece"><b>' + esc(m.tienda) + '</b>' + (i === 0 ? ' <span class="e ok">Mejor precio</span>' : '') + (m.id === it.id ? ' <span class="e">esta oferta</span>' : '') + '<div class="muted peq">' + esc(m.titulo) + ' &middot; Fuente: ' + esc(m.fuente) + ' &middot; ' + A.edad(Date.now() - m._ts) + '</div></div>' +
        '<div><b>' + A.fmt(m._pv, m._mv) + '</b> <span class="muted peq">' + dif + '</span></div><a class="ir" href="' + esc(A.urlSegura(m.url)) + '" target="_blank" rel="noopener nofollow sponsored">Ver ↗</a></div>';
    }).join('') : '';
    var emoji = Of.demo.CATS[it.categoria] || '🏷️';
    var html = '<div class="dh"><h2 id="detTitulo">' + esc(it.titulo) + '</h2><button class="btn-i" data-cerrar aria-label="Cerrar detalle">✕</button></div>' +
      '<div class="det-img" style="--ph:' + it._ph + '"><span aria-hidden="true">' + emoji + '</span>' + (it.imagen ? '<img referrerpolicy="no-referrer" alt="" src="' + esc(A.urlSegura(it.imagen)) + '">' : '') + (it._desc > 0 ? '<span class="dto">−' + it._desc + '%</span>' : '') + '</div>' +
      '<div class="etq" style="max-height:none;margin-top:8px">' + et.join('') + '</div>' +
      '<div class="det-precio"><b>' + A.fmt(it._pv, mon) + '</b>' + (it._av ? '<s class="muted">' + A.fmt(it._av, mon) + '</s><span class="ok-t">Ahorras ' + A.fmt(ahorro, mon) + '</span>' : '') + '</div>' +
      (mon !== it.moneda ? '<p class="muted peq" style="margin:-6px 0 6px">Precio original: ' + A.fmt(it.precio, it.moneda) + ' (convertido con tasas de ' + (S.demo ? 'ejemplo' : 'mercados/divisas.json') + ')</p>' : '') +
      '<p style="margin:4px 0"><b>Tienda:</b> ' + esc(it.tienda) + ' &middot; <b>Categoría:</b> ' + esc(it.categoria) + ' &middot; <b>Publicada:</b> ' + A.edad(Date.now() - it._ts) + '</p>' + venc + cupon +
      '<div class="fila2" style="flex-wrap:wrap;margin:10px 0"><a class="btn prim" id="detIr" href="' + esc(A.urlSegura(it.url)) + '" target="_blank" rel="noopener nofollow sponsored">Ir a la tienda ↗</a>' +
      '<button class="btn" id="detGuardar" aria-pressed="' + !!g.guardada + '">' + (g.guardada ? '♥ Guardada' : '♡ Guardar') + '</button><button class="btn" id="detCarpetas">Carpetas…</button>' +
      '<button class="btn" id="detUsada" aria-pressed="' + !!g.usada + '">' + (g.usada ? '✓ Usada (deshacer)' : 'Marcar como usada') + '</button><button class="btn" id="detAlerta">⏰ Avisarme del precio</button><button class="btn" id="detCopiar">Copiar enlace</button></div>' +
      analisis + '<h3 style="margin:14px 0 4px">Historial de precios</h3><div class="graf"><canvas id="detGraf" role="img" aria-label="Gráfica del historial de precios"></canvas><div class="tip" hidden></div></div><div class="leyenda" id="detLey"></div><p class="muted peq" id="detGrafTxt"></p>' + comp +
      '<div class="tarj" style="margin-top:14px"><b>Transparencia</b><p class="muted peq" style="margin:4px 0 0">Fuente de la oferta: <b>' + esc(it.fuente) + '</b>. El enlace lleva a un sitio de terceros y puede ser un enlace con comisión (por eso lleva rel="sponsored"). Los precios y la disponibilidad pueden cambiar en cualquier momento; verifica el precio final en la tienda antes de comprar.' + (it.demo ? ' <b>Esta es una oferta de demostración ficticia.</b>' : '') + '</p></div>';
    var d = A.dialogo('dlgDetalle', html, function () { if (obs) obs.disconnect(); });
    $('#detGuardar', d).onclick = function () { var on = A.toggleGuardar(it); this.textContent = on ? '♥ Guardada' : '♡ Guardar'; this.setAttribute('aria-pressed', on); };
    $('#detUsada', d).onclick = function () { var u = !(S.guardados[it.id] && S.guardados[it.id].usada); A.marcarUsada(it, u); this.textContent = u ? '✓ Usada (deshacer)' : 'Marcar como usada'; this.setAttribute('aria-pressed', u); };
    $('#detCopiar', d).onclick = function () { A.copiar(it.url, 'Enlace copiado'); };
    $('#detCarpetas', d).onclick = function () { A.dialogoCarpetas(it); };
    $('#detAlerta', d).onclick = function () { d.close(); A.editarAlerta(Of.alertas.nueva({ tipo: 'producto', nombre: it.titulo.slice(0, 50), itemIds: miembros.map(function (m) { return m.id; }), objetivo: Math.round(it.precio * 0.95 * 100) / 100, moneda: it.moneda })); };
    var cp = $('#detCupon', d); if (cp) cp.onclick = function () { A.copiar(it.cupon, 'Cupón ' + it.cupon + ' copiado'); };
    if (S.demo) $('#detIr', d).onclick = function (e) { e.preventDefault(); A.toast('Oferta de demostración: no tiene enlace real.'); };
    dibujar(d, it, miembros, mon);
  };

  function dibujar(d, it, miembros, mon) {
    var canvas = $('#detGraf', d), cs = getComputedStyle(document.documentElement), cols = ['--s1', '--s2', '--s3', '--s4'].map(function (v) { return cs.getPropertyValue(v).trim(); });
    var orden = [it].concat(miembros.filter(function (m) { return m.id !== it.id; }).sort(function (x, y) { return x._usd - y._usd; })).slice(0, 4);
    var series = [], ahora = Date.now();
    orden.forEach(function (m) {
      var h = A.histDe(m), pts = h ? h.filter(function (p) { return p && isFinite(p[1]); }).map(function (p) { return [p[0], A.conv(p[1], m.moneda, mon)]; }).sort(function (a, b) { return a[0] - b[0]; }) : [];
      if (pts.length && ahora - pts[pts.length - 1][0] > 3600000 && m._ts > pts[pts.length - 1][0]) pts.push([m._ts, A.conv(m.precio, m.moneda, mon)]);
      if (!pts.length && m.id === it.id) pts = [[m._ts, A.conv(m.precio, m.moneda, mon)]];
      if (pts.length) series.push({ nombre: m.tienda + (m.id === it.id ? ' (esta)' : ''), color: cols[series.length], puntos: pts, id: m.id });
    });
    var refs = []; if (it._av) refs.push({ v: it._av, texto: 'Anterior declarado', color: cs.getPropertyValue('--mal').trim() });
    var o = { series: series, refs: refs, marcas: true, fmt: function (v) { return A.fmt(v, mon).replace(/ /g, ' '); } };
    var tip = $('.tip', d); Of.grafica.enlazar(canvas, tip);
    var pintar = function () { Of.grafica.dibujar(canvas, o); }; pintar();
    if (window.ResizeObserver) { obs = new ResizeObserver(function () { if (canvas.clientWidth) pintar(); }); obs.observe(canvas); }
    $('#detLey', d).innerHTML = series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.nombre) + '</span>'; }).join('') + (series.length ? '<span><i style="background:#16a34a;height:8px;width:8px;border-radius:50%"></i>mínimo de cada serie</span>' : '');
    var s0 = series[0], t = '';
    if (s0 && s0.puntos.length > 1) { var vs = s0.puntos.map(function (p) { return p[1]; }); t = 'Resumen: ' + s0.puntos.length + ' observaciones; mínimo ' + A.fmt(Math.min.apply(null, vs), mon) + ', máximo ' + A.fmt(Math.max.apply(null, vs), mon) + ', actual ' + A.fmt(vs[vs.length - 1], mon) + '.'; }
    else t = 'Todavía no hay historial para este producto: la gráfica se llenará a medida que el proceso programado registre su precio.';
    $('#detGrafTxt', d).textContent = t; canvas.setAttribute('aria-label', 'Gráfica del historial de precios. ' + t);
  }

  A.dialogoCarpetas = function (it) {
    var r = S.guardados[it.id] || { carpetas: [] }, todas = [{ id: 'deseos', nombre: 'Lista de deseos' }].concat(S.carpetas);
    var d = A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Guardar en carpetas</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div>' +
      todas.map(function (c) { return '<label class="cb"><input type="checkbox" data-c="' + esc(c.id) + '"' + (r.carpetas.indexOf(c.id) >= 0 ? ' checked' : '') + '> ' + esc(c.nombre) + '</label>'; }).join('') +
      '<div class="fila2" style="margin-top:10px"><input class="inp" id="nuevaCarp" placeholder="Nueva carpeta" maxlength="40" aria-label="Nombre de la nueva carpeta"><button class="btn" id="btnNuevaCarp">Crear</button></div>');
    d.onchange = function (e) {
      if (!e.target.dataset.c) return;
      var ids = A.$$('[data-c]:checked', d).map(function (x) { return x.dataset.c; }); A.setCarpetas(it, ids);
    };
    $('#btnNuevaCarp', d).onclick = function () { var c = A.nuevaCarpeta($('#nuevaCarp', d).value); if (c) { A.setCarpetas(it, (S.guardados[it.id] ? S.guardados[it.id].carpetas : []).concat(c.id)); A.dialogoCarpetas(it); } };
  };
})();
