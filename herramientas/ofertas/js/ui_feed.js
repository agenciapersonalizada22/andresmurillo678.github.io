/* Feed de ofertas: tarjetas, lista virtual, filtros, busqueda, ordenacion, deslizar para guardar y atajos de teclado. */
(function () {
  var Of = window.Of, A = Of.app, S = A.S, St = Of.almacen, esc = A.esc, $ = A.$;
  var TEXTO_H = 208;

  A.htmlCard = function (it, modo, sel) {
    var g = S.guardados[it.id], on = !!(g && g.guardada), an = it._an, fila = modo === 'lista', et = [], emoji = Of.demo.CATS[it.categoria] || '🏷️';
    if (A.esNueva(it) && !it._snap) et.push('<span class="e prim">NUEVA</span>');
    if (an.mejorHistorico) et.push('<span class="e ok" title="Precio mas bajo registrado en el historial">Mínimo histórico</span>');
    else if (an.cercaMinimo) et.push('<span class="e ok" title="A menos de un 3% del minimo historico">Cerca del mínimo</span>');
    if (an.inflado) et.push('<span class="e mal" title="' + esc(an.motivo) + '">Precio inflado</span>');
    if (it._calor >= 55) et.push('<span class="e calor" title="Puntaje de calor ' + it._calor + '/100">🔥 ' + it._calor + '</span>');
    var otros = S.aj.agrupar && !it._snap ? A.miembros(it).length - 1 : 0;
    if (otros > 0) et.push('<span class="e" title="Mismo producto en otras tiendas">+' + otros + (otros === 1 ? ' tienda' : ' tiendas') + '</span>');
    var cu = '';
    if (it.cupon) cu += '<button type="button" class="cupon" data-acc="copiar" data-cod="' + esc(it.cupon) + '" aria-label="Copiar cupón ' + esc(it.cupon) + '">' + esc(it.cupon) + ' <span class="cp">Copiar</span></button> ';
    if (it._vence) { var c = A.cuenta(it._vence, 0, true); cu += '<span class="cuenta ' + c.c + '" data-corto="1" data-vence="' + it._vence + '">' + c.t + '</span>'; }
    var img = it.imagen ? '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" src="' + esc(A.urlSegura(it.imagen)) + '">' : '';
    var dto = it._desc > 0 ? '<span class="dto" aria-label="' + it._desc + '% de descuento">−' + it._desc + '%</span>' : '';
    var edad = A.edad(Date.now() - it._ts);
    return '<article class="card' + (fila ? ' fila' : '') + (sel ? ' sel' : '') + '" role="listitem" data-id="' + esc(it.id) + '">' +
      '<div class="img" style="--ph:' + it._ph + '"><span aria-hidden="true">' + emoji + '</span>' + img + dto +
      '<button type="button" class="corazon' + (on ? ' on' : '') + '" data-acc="guardar" aria-pressed="' + on + '" aria-label="' + (on ? 'Quitar de guardadas' : 'Guardar oferta') + '">' + (on ? '♥' : '♡') + '</button>' +
      (it.demo ? '<span class="ribbon">DEMO</span>' : '') + (it._snap ? '<span class="ribbon">Guardada</span>' : '') + '</div>' +
      '<div class="cuerpo"><h3><button type="button" data-acc="abrir">' + esc(it.titulo) + '</button></h3>' +
      '<div class="precio"><b>' + A.fmt(it._pv, it._mv) + '</b>' + (it._av ? '<s>' + A.fmt(it._av, it._mv) + '</s>' : '') + '</div>' +
      '<div class="meta">' + esc(it.tienda) + ' · ' + esc(it.categoria) + ' · ' + edad + '</div>' +
      '<div class="etq">' + et.join('') + '</div><div class="etq" style="align-items:center">' + cu + '</div>' +
      '<div class="pie-c"><span class="fte" title="Fuente de la oferta">Fuente: ' + esc(it.fuente) + '</span><a class="ir" href="' + esc(A.urlSegura(it.url)) + '" target="_blank" rel="noopener nofollow sponsored" aria-label="Ver en ' + esc(it.tienda) + ' (abre sitio externo)">Ver ↗</a></div></div></article>';
  };

  /* lista de tarjetas reutilizable (feed, nuevas, guardadas) */
  A.crearLista = function (cont, o) {
    var v = new Of.Virtual(cont, { minCol: 168, gap: 10, alto: function (w) { return Math.round(w / 1.5 + TEXTO_H); }, altoLista: 166, pie: 24,
      render: function (el, it, i) { el.innerHTML = A.htmlCard(it, S.aj.vista, o.sel && o.sel() === i); } });
    var lista = { virt: v, datos: function () { return o.datos(); }, sel: -1 };
    v.setModo = function () { v.modo(S.aj.vista); };
    cont.addEventListener('error', function (e) { if (e.target.tagName === 'IMG') e.target.remove(); }, true);
    var movido = false;
    cont.addEventListener('click', function (e) {
      if (movido) { movido = false; return; }
      var card = e.target.closest('.card'); if (!card) return;
      var cel = card.parentNode, it = v.dato(+cel.dataset.i); if (!it) return;
      if (e.target.closest('a.ir')) { if (S.demo) { e.preventDefault(); A.toast('Oferta de demostración: no tiene enlace real.'); } return; }
      var acc = e.target.closest('[data-acc]');
      if (acc && acc.dataset.acc === 'guardar') { e.stopPropagation(); var on = A.toggleGuardar(it); A.toast(on ? 'Guardada en tu lista de deseos' : 'Quitada de guardadas', { accion: { texto: 'Deshacer', fn: function () { A.toggleGuardar(it, !on); } } }); return; }
      if (acc && acc.dataset.acc === 'copiar') { A.copiar(acc.dataset.cod, 'Cupón ' + acc.dataset.cod + ' copiado'); return; }
      lista.sel = +cel.dataset.i; A.abrirDetalle(it);
    });
    /* deslizar a la derecha para guardar (tactil) */
    var ini = null;
    cont.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return; var c = e.target.closest('.card'); if (!c || e.target.closest('a,.corazon,.cupon')) return;
      ini = { x: e.clientX, y: e.clientY, c: c, dx: 0, id: e.pointerId };
    });
    cont.addEventListener('pointermove', function (e) {
      if (!ini || e.pointerId !== ini.id) return; var dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { ini = null; return; }
      if (dx > 12) { ini.dx = dx; ini.c.style.transform = 'translateX(' + Math.min(dx, 110) + 'px)'; ini.c.style.transition = 'none'; }
    });
    function fin() {
      if (!ini) return; var c = ini.c, dx = ini.dx; ini = null;
      c.style.transition = 'transform .2s'; c.style.transform = '';
      if (dx > 80) { movido = true; setTimeout(function () { movido = false; }, 350); var it = v.dato(+c.parentNode.dataset.i); if (it) { var on = A.toggleGuardar(it); A.toast(on ? 'Guardada ♥' : 'Quitada de guardadas'); } }
    }
    cont.addEventListener('pointerup', fin); cont.addEventListener('pointercancel', fin);
    return lista;
  };
  A.refrescarCorazones = function (id) {
    var g = S.guardados[id], on = !!(g && g.guardada);
    A.$$('.card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] .corazon').forEach(function (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-label', on ? 'Quitar de guardadas' : 'Guardar oferta'); });
  };
  A.alGuardar = function (id) { A.refrescarCorazones(id); if (A.vistas.guardadas && A.vistas.guardadas.refrescar) A.vistas.guardadas.refrescar(); };

  /* ---------- seleccion por teclado / mando ---------- */
  A.mover = function (d) {
    var L = A.listaActiva; if (!L) return; var n = L.datos().length; if (!n) return;
    L.sel = Math.max(0, Math.min(n - 1, (L.sel < 0 ? (d > 0 ? -1 : 0) : L.sel) + d));
    L.virt.irA(L.sel); L.virt.refrescar();
    var nodo = L.virt.nodo(L.sel); if (nodo) { var b = $('[data-acc=abrir]', nodo); if (b) b.focus({ preventScroll: true }); }
  };
  A.selItem = function () { var L = A.listaActiva; return L && L.sel >= 0 ? L.datos()[L.sel] : null; };

  /* ---------- montaje ---------- */
  var feed, lista;
  var ORD = [['calor', '\uD83D\uDD25 Calor'], ['reciente', 'Reciente'], ['descuento', 'Descuento'], ['precio', 'Precio \u2191'], ['relevancia', 'Relevancia']];
  A.montarFeed = function () {
    feed = $('#feed');
    lista = A.crearLista(feed, { datos: function () { return S.vis; }, sel: function () { return lista.sel; } });
    lista.virt.modo(S.aj.vista);
    feed.insertAdjacentHTML('beforeend', '<div id="vacioFeed" class="vacio"><div class="grande">\u23F3</div><p>Cargando ofertas\u2026</p></div>');
    A.vistas.ofertas = { lista: lista, mostrar: function () { setTimeout(function () { lista.virt.refrescar(); }, 0); } };
    A.alRecalcular = function () {
      lista.sel = -1; lista.virt.datos(S.vis); pintarResumen(); pintarChips(); pintarBotones();
      var v = $('#vacioFeed'); if (v) v.remove();
      if (!S.vis.length) feed.insertAdjacentHTML('beforeend', '<div id="vacioFeed" class="vacio"><div class="grande">🔍</div><p>' + (S.q || A.filtrosActivos() ? 'Ninguna oferta coincide con tu búsqueda o filtros.' : 'No hay ofertas disponibles.') + '</p>' +
        (S.q || A.filtrosActivos() ? '<button class="btn prim" id="btnLimpiarTodo">Limpiar búsqueda y filtros</button>' : '') + '</div>');
      var b = $('#btnLimpiarTodo'); if (b) b.onclick = function () { $('#q').value = ''; S.q = ''; S.f = A.F0(); persistirF(); A.pintarFiltros(); A.recalcular(); };
      if (A.alVista) A.alVista();
    };
    var qEl = $('#q'), t = 0;
    qEl.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { A.setQ(qEl.value); }, 90); });
    $('#busqueda').addEventListener('submit', function (e) { e.preventDefault(); A.setQ(qEl.value); qEl.blur(); });
    qEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') { qEl.value = ''; A.setQ(''); } if (e.key === 'ArrowDown') { e.preventDefault(); qEl.blur(); A.mover(1); } });
    $('#btnAyudaBusq').onclick = A.ayudaBusqueda;
    $('#btnVista').onclick = A.alternarVista; pintarBotones();
    $('#btnFiltros').onclick = function () { A.abrirFiltros(); };
    $('#fondoFiltros').onclick = function () { A.cerrarFiltros(); };
    A.pintarFiltros();
    document.addEventListener('keydown', teclas);
    matchMedia('(min-width:900px)').addEventListener('change', function () { $('#filtros').classList.remove('abierto'); $('#fondoFiltros').hidden = true; });
    $('#resumen').addEventListener('change', function (e) {
      if (e.target.id === 'selOrden') { S.orden = e.target.value; S.ordenManual = true; A.recalcular(); }
      if (e.target.id === 'cbAgrupar') { A.setAj({ agrupar: e.target.checked }); A.recalcular(); }
    });
    $('#chips').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; toggleArr(S.f.cats, b.dataset.cat); persistirF(); A.pintarFiltros(); A.recalcular(); });
  };
  function toggleArr(a, v) { var i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); }
  function persistirF() { St.set('filtros', S.f); }
  A.alternarVista = function () { A.setAj({ vista: S.aj.vista === 'rejilla' ? 'lista' : 'rejilla' }); pintarBotones(); Object.keys(A.vistas).forEach(function (k) { var l = A.vistas[k].lista; if (l) l.virt.modo(S.aj.vista); }); };
  function pintarBotones() {
    var b = $('#btnVista'); b.textContent = S.aj.vista === 'rejilla' ? '☰' : '▦'; b.setAttribute('aria-label', S.aj.vista === 'rejilla' ? 'Cambiar a vista de lista' : 'Cambiar a vista de rejilla');
    var n = A.filtrosActivos(), i = $('#nFiltros'); i.hidden = !n; i.textContent = n;
  }
  function pintarResumen() {
    var n = S.vis.length, extra = S.totalFiltrado > n ? ' (' + S.totalFiltrado + ' sin agrupar)' : '';
    var ocultas = S.aj.silenciadas.length ? ' &middot; ' + S.aj.silenciadas.length + ' tienda(s) silenciada(s)' : '';
    $('#resumen').innerHTML = '<span class="cuenta-r" aria-live="polite"><b>' + n + '</b> ofertas' + extra + ocultas + '</span>' +
      '<label class="cb" style="min-height:38px" title="Agrupa el mismo producto de varias tiendas"><input type="checkbox" id="cbAgrupar"' + (S.aj.agrupar ? ' checked' : '') + '> Agrupar</label>' +
      '<label class="sr" for="selOrden">Ordenar por</label><select id="selOrden">' + ORD.map(function (o) { return '<option value="' + o[0] + '"' + (S.orden === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  function pintarChips() {
    var cats = (S.categorias || []).slice().sort(function (a, b) { return (S.aj.favoritas.indexOf(b) >= 0) - (S.aj.favoritas.indexOf(a) >= 0); }).slice(0, 12);
    $('#chips').innerHTML = cats.map(function (c) { var on = S.f.cats.indexOf(c) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' + (Of.demo.CATS[c] || '') + ' ' + esc(c) + (S.aj.favoritas.indexOf(c) >= 0 ? ' ★' : '') + '</button>'; }).join('');
  }

  /* ---------- panel de filtros ---------- */
  A.abrirFiltros = function () {
    var p = $('#filtros');
    if (matchMedia('(min-width:900px)').matches) { p.classList.toggle('abierto'); return; }
    p.classList.add('abierto'); $('#fondoFiltros').hidden = false; p.setAttribute('aria-modal', 'true'); var f = $('button,input,select', p); if (f) f.focus();
  };
  A.cerrarFiltros = function () { $('#filtros').classList.remove('abierto'); $('#fondoFiltros').hidden = true; $('#btnFiltros').focus(); };
  A.pintarFiltros = function () {
    var f = S.f, p = $('#filtros'), mon = A.monedaAgg(), tiendas = S.tiendas || [], monedas = S.monedas || [], paises = S.paises || [];
    p.innerHTML = '<h2>Filtros <span><button type="button" class="btn peq" id="fLimpiar">Limpiar</button> <button type="button" class="btn-i chico oculto-d" id="fCerrar" aria-label="Cerrar filtros">✕</button></span></h2>' +
      '<fieldset class="campo"><legend>Categoría</legend><div class="chips-w">' + (S.categorias || []).map(function (c) { var on = f.cats.indexOf(c) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-fc="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="campo"><legend>Tienda</legend><div class="lista-cb">' + tiendas.map(function (t, i) { return '<label class="cb"><input type="checkbox" data-ft="' + esc(t) + '"' + (f.tiendas.indexOf(t) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="campo"><legend>Precio (' + esc(S.aj.moneda === 'original' ? 'moneda de cada oferta' : mon) + ')</legend><div class="fila2"><input type="number" inputmode="decimal" min="0" id="fpMin" placeholder="Mín" value="' + esc(f.pMin) + '" aria-label="Precio mínimo"><span>–</span><input type="number" inputmode="decimal" min="0" id="fpMax" placeholder="Máx" value="' + esc(f.pMax) + '" aria-label="Precio máximo"></div></fieldset>' +
      '<div class="campo"><label for="fDto">Descuento mínimo: <output id="fDtoO">' + f.dMin + '%</output></label><input type="range" id="fDto" min="0" max="90" step="5" value="' + f.dMin + '" style="width:100%"></div>' +
      '<div class="campo"><label class="cb"><input type="checkbox" id="fCupon"' + (f.cupon ? ' checked' : '') + '> Solo con cupón</label><label class="cb"><input type="checkbox" id="fVig"' + (f.vigentes ? ' checked' : '') + '> Solo vigentes</label>' +
      '<label class="cb"><input type="checkbox" id="fInf"' + (f.sinInflados ? ' checked' : '') + '> Ocultar precios inflados</label><label class="cb"><input type="checkbox" id="fMin"' + (f.soloMin ? ' checked' : '') + '> Solo mínimos históricos</label></div>' +
      '<div class="campo"><label for="fMon">Moneda de la oferta</label><select id="fMon"><option value="">Todas</option>' + monedas.map(function (m) { return '<option' + (f.moneda === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="fPais">País / idioma de la fuente</label><select id="fPais"><option value="">Todos</option>' + paises.map(function (m) { return '<option' + (f.pais === m ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn prim oculto-d" id="fVer" style="width:100%">Ver resultados</button>';
    if (matchMedia('(min-width:900px)').matches) $('.oculto-d', p) && A.$$('.oculto-d', p).forEach(function (x) { x.style.display = 'none'; });
    pintarBotones();
    var deb = 0, aplicar = function () { clearTimeout(deb); deb = setTimeout(function () { persistirF(); pintarBotones(); A.recalcular(); }, 120); };
    p.onclick = function (e) {
      var c = e.target.closest('[data-fc]'); if (c) { toggleArr(f.cats, c.dataset.fc); c.classList.toggle('on'); c.setAttribute('aria-pressed', c.classList.contains('on')); aplicar(); pintarChipsLuego(); }
      if (e.target.id === 'fLimpiar') { var vig = f.vigentes; S.f = A.F0(); S.f.vigentes = vig; persistirF(); A.pintarFiltros(); A.recalcular(); }
      if (e.target.id === 'fCerrar' || e.target.id === 'fVer') A.cerrarFiltros();
    };
    p.onchange = p.oninput = function (e) {
      var t = e.target;
      if (t.dataset.ft) { toggleArr(f.tiendas, t.dataset.ft); aplicar(); }
      else if (t.id === 'fpMin') { f.pMin = t.value; aplicar(); } else if (t.id === 'fpMax') { f.pMax = t.value; aplicar(); }
      else if (t.id === 'fDto') { f.dMin = +t.value; $('#fDtoO').textContent = t.value + '%'; aplicar(); }
      else if (t.id === 'fCupon') { f.cupon = t.checked; aplicar(); } else if (t.id === 'fVig') { f.vigentes = t.checked; aplicar(); }
      else if (t.id === 'fInf') { f.sinInflados = t.checked; aplicar(); } else if (t.id === 'fMin') { f.soloMin = t.checked; aplicar(); }
      else if (t.id === 'fMon') { f.moneda = t.value; aplicar(); } else if (t.id === 'fPais') { f.pais = t.value; aplicar(); }
    };
    p.onkeydown = function (e) { if (e.key === 'Escape' && p.classList.contains('abierto') && !matchMedia('(min-width:900px)').matches) { e.stopPropagation(); A.cerrarFiltros(); } };
  };
  function pintarChipsLuego() { setTimeout(pintarChips, 130); }

  /* ---------- ayuda de busqueda ---------- */
  A.ayudaBusqueda = function () {
    A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Operadores de búsqueda</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div>' +
      '<p class="muted peq">La búsqueda ignora acentos, tolera errores de escritura y entiende sinónimos (laptop = portátil, tv = televisor, headphones = auriculares).</p>' +
      '<table class="t"><tbody>' + [['laptop precio&lt;500', 'Laptops por menos de 500 (en tu moneda de visualización)'], ['precio:100-300', 'Rango de precio'], ['tienda:amazon', 'Solo una tienda (usa comillas si tiene espacios)'], ['cat:audio', 'Solo una categoría'],
        ['-usado', 'Excluir una palabra (también -tienda:ebay)'], ['"iphone 15"', 'Frase exacta'], ['descuento&gt;30', 'Descuento mínimo en %'], ['cupon:si', 'Solo con cupón']].map(function (r) { return '<tr><td><code>' + r[0] + '</code></td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>');
  };

  /* ---------- atajos ---------- */
  var VISTAS = ['ofertas', 'nuevas', 'guardadas', 'alertas', 'ahorro', 'fuentes', 'ajustes'];
  function escribiendo(e) { var t = e.target; return t && ((t.tagName === 'INPUT' && !/^(checkbox|radio|range|button|file)$/.test(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function teclas(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) { return; }
    if (e.key === 'Escape') { if ($('#filtros').classList.contains('abierto') && !matchMedia('(min-width:900px)').matches) A.cerrarFiltros(); return; }
    if (escribiendo(e)) return;
    var k = e.key, it;
    if (k === '/') { e.preventDefault(); A.ir('ofertas'); $('#q').focus(); }
    else if (k === '?') A.ayudaTeclas();
    else if (k === 'g') A.alternarVista();
    else if (k === 'f') A.abrirFiltros();
    else if (k === 't') $('#btnTema').click();
    else if (/^[1-7]$/.test(k)) A.ir(VISTAS[+k - 1]);
    else if (k === 'j' || k === 'ArrowRight') { if (A.listaActiva) { e.preventDefault(); A.mover(1); } }
    else if (k === 'k' || k === 'ArrowLeft') { if (A.listaActiva) { e.preventDefault(); A.mover(-1); } }
    else if (k === 'ArrowDown') { if (A.listaActiva) { e.preventDefault(); A.mover(A.listaActiva.virt.columnas()); } }
    else if (k === 'ArrowUp') { if (A.listaActiva) { e.preventDefault(); A.mover(-A.listaActiva.virt.columnas()); } }
    else if ((k === 'Enter' || k === 'o') && (it = A.selItem()) && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') A.abrirDetalle(it);
    else if (k === 's' && (it = A.selItem())) { var on = A.toggleGuardar(it); A.toast(on ? 'Guardada' : 'Quitada de guardadas'); }
    else if (k === 'c' && (it = A.selItem()) && it.cupon) A.copiar(it.cupon, 'Cupón ' + it.cupon + ' copiado');
    else if (k === 'u' && (it = A.selItem())) A.marcarUsada(it, !(S.guardados[it.id] && S.guardados[it.id].usada));
  }
  A.ayudaTeclas = function () {
    A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Atajos de teclado y mando</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div><table class="t"><tbody>' +
      [['/', 'Buscar'], ['J / K o flechas', 'Mover la selección'], ['Intro', 'Abrir detalle'], ['S', 'Guardar / quitar'], ['C', 'Copiar cupón'], ['U', 'Marcar como usada'], ['F', 'Filtros'], ['G', 'Rejilla / lista'], ['T', 'Cambiar tema'], ['1 a 7', 'Cambiar de sección'], ['Esc', 'Cerrar'], ['Mando Xbox', 'Cruceta/stick: mover · A: abrir · X: guardar · Y: filtros · B: cerrar · LB/RB: sección · LT/RT: página']].map(function (r) { return '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>');
  };
})();
