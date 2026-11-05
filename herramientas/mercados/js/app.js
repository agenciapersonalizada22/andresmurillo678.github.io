/* Nucleo de la aplicacion: ruteo, tema, estado de datos, busqueda global, atajos, mando, alertas y listas. */
window.App = (function () {
  var h = UI.h, A = {}, vistas = {}, actual = null, vistaEl = null, bannersEl, timer = null, evaluando = false;
  var ICO = { resumen: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>', mercados: '<path d="M5 20V11M11 20V4M17 20v-6M2 21h20"/>', activo: '<path d="M7 3v18M17 6v14"/><rect x="4.5" y="8" width="5" height="7"/><rect x="14.5" y="10" width="5" height="6"/>', analisis: '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="9" cy="6" r="2" fill="var(--panel)"/><circle cx="15" cy="12" r="2" fill="var(--panel)"/><circle cx="8" cy="18" r="2" fill="var(--panel)"/>', cartera: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>', noticias: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', mas: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>' };
  var SECCIONES = [['resumen', 'Resumen'], ['mercados', 'Mercados'], ['activo', 'Activo'], ['analisis', 'Analisis'], ['cartera', 'Cartera'], ['noticias', 'Noticias'], ['mas', 'Mas']];
  var DEF = { tema: 'auto', moneda: 'USD', benchmark: 'c:bitcoin', ultimoActivo: 'c:bitcoin', comisionSim: 0.1, saldoSim: 10000, indicadores: [{ uid: 'sma50', id: 'sma', params: { n: 50 } }], volumen: true };
  A.registrar = function (id, f) { vistas[id] = f; };
  A.ajustes = function () { return Object.assign({}, DEF, Almacen.get('ajustes', {})); };
  A.setAjuste = function (k, v) { var a = Almacen.get('ajustes', {}); a[k] = v; Almacen.set('ajustes', a); };
  A.enc = encodeURIComponent;
  A.ir = function (seccion, sub, extra) { var p = '#/' + seccion; if (sub) p += '/' + A.enc(sub); if (extra) p += '/' + A.enc(extra); if (location.hash === p) render(); else location.hash = p; };
  A.abrirActivo = function (key) { A.setAjuste('ultimoActivo', key); A.ir('activo', key); };
  A.parseHash = function () { var p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } }); return { seccion: p[0] || 'resumen', sub: p[1], extra: p[2] }; };
  A.tabla = null;

  /* ---- tema ---- */
  function aplicarTema() { var t = A.ajustes().tema; document.documentElement.setAttribute('data-tema', t === 'claro' ? 'claro' : t === 'oscuro' ? 'oscuro' : 'auto'); }
  A.alternarTema = function () { var o = { auto: 'oscuro', oscuro: 'claro', claro: 'auto' }; A.setAjuste('tema', o[A.ajustes().tema] || 'oscuro'); aplicarTema(); UI.toast('Tema: ' + A.ajustes().tema); };

  /* ---- listas de seguimiento ---- */
  A.listas = function () { var l = Almacen.get('listas'); if (!l || !l.length) { l = [{ id: 'fav', nombre: 'Favoritos', keys: ['c:bitcoin', 'c:ethereum', 'a:AAPL'] }]; Almacen.set('listas', l); } return l; };
  A.enAlgunaLista = function (key) { return A.listas().some(function (l) { return l.keys.indexOf(key) >= 0; }); };
  A.alternarLista = function (key, id) { var ls = A.listas(); var l = ls.filter(function (x) { return x.id === (id || ls[0].id); })[0]; var i = l.keys.indexOf(key); if (i >= 0) l.keys.splice(i, 1); else l.keys.push(key); Almacen.set('listas', ls); return i < 0; };

  /* ---- datos auxiliares ---- */
  A.precios = function () { var m = {}; Mercado.activos.forEach(function (a) { m[a.key] = a.precio; }); return m; };
  A.moneda = function (usd) { var mo = A.ajustes().moneda; return mo === 'USD' ? usd : usd * (Mercado.tasas()[mo] || 1); };
  A.tipoLegible = { cripto: 'Cripto', accion: 'Accion', indice: 'Indice', divisa: 'Divisa', nft: 'NFT' };
  A.estrella = function (key) {
    var b = h('button.estrella' + (A.enAlgunaLista(key) ? '.on' : ''), { type: 'button', 'aria-label': 'Seguir', title: 'Anadir/quitar de la lista de seguimiento', onclick: function (e) { e.stopPropagation(); var on = A.alternarLista(key); b.classList.toggle('on', on); b.textContent = on ? '★' : '☆'; } }, A.enAlgunaLista(key) ? '★' : '☆');
    return b;
  };
  A.seccionTitulo = function (titulo, secs) {
    var d = h('div.fila-flex', { style: 'margin-bottom:8px' }, h('h1', { style: 'margin:0' }, titulo));
    (secs || []).forEach(function (s) { d.appendChild(A.chipFuente(s)); }); return d;
  };
  A.chipFuente = function (sec) {
    var e = Mercado.sec[sec]; if (!e) return h('span');
    var viejo = Mercado.obsoleto(sec), demo = e.origen === 'demo', ed = Mercado.edad(sec);
    var txt = demo ? 'DEMO · datos de ejemplo' : (e.origen === 'directo' ? 'directo ' : e.origen === 'cache' ? 'cache ' : '') + window.Fmt.edad(ed);
    return h('span.chip' + (demo ? '.demo' : viejo ? '.viejo' : '.ok'), { title: 'Fuente: ' + (e.obj.fuente || '?') + (viejo ? ' · datos obsoletos' : '') }, sec + ': ' + (viejo ? 'DATOS OBSOLETOS · ' : '') + txt);
  };
  A.dialogo = function (titulo, contenido, botones) {
    var fondo = h('div.dlg', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, onclick: function (e) { if (e.target === fondo) cerrar(); } });
    function cerrar() { fondo.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') cerrar(); }
    var bs = h('div.fila-flex', { style: 'justify-content:flex-end;margin-top:12px' });
    (botones || [{ t: 'Cerrar' }]).forEach(function (b) { bs.appendChild(h('button.btn' + (b.pri ? '.pri' : ''), { type: 'button', onclick: function () { if (!b.f || b.f() !== false) cerrar(); } }, b.t)); });
    fondo.appendChild(h('div.tarjeta', h('h2', titulo), contenido, bs)); document.body.appendChild(fondo); document.addEventListener('keydown', esc);
    var f = fondo.querySelector('input,select,button'); if (f) f.focus(); return { cerrar: cerrar };
  };

  /* ---- estado de datos ---- */
  function actualizarChip() {
    var chip = document.getElementById('chip-datos'); if (!Mercado.ultimaCarga) return;
    var demo = Mercado.hayDemo(), viejos = Object.keys(Mercado.sec).filter(Mercado.obsoleto);
    var cl = 'chip' + (demo.length ? ' demo' : viejos.length ? ' viejo' : ' ok');
    chip.className = cl; var e = Mercado.edad('cripto');
    chip.textContent = demo.length === 5 ? 'DEMO' : (viejos.length ? 'Obsoletos' : 'En vivo') + ' · ' + window.Fmt.edad(Math.max.apply(null, Object.keys(Mercado.sec).filter(function (k) { return Mercado.sec[k].origen !== 'demo'; }).map(Mercado.edad).concat([0])));
    var b = bannersEl; UI.vaciar(b);
    if (demo.length) b.appendChild(h('div.banner', h('b', 'Modo demo: '), 'se muestran datos de ejemplo inventados para: ' + demo.join(', ') + '. No son precios reales. ', h('a', { href: '#', onclick: function (e) { e.preventDefault(); A.detalleDatos(); } }, 'Ver estado de los datos')));
    if (viejos.length) b.appendChild(h('div.banner.rojo', h('b', 'Datos obsoletos: '), viejos.join(', ') + ' (el proceso de datos no se ha actualizado recientemente o se muestran valores en cache). No tomes decisiones con ellos.'));
  }
  A.detalleDatos = function () {
    var t = h('table.t', h('thead', h('tr', h('th', 'Seccion'), h('th', 'Origen'), h('th', 'Edad'), h('th', 'Fuente'))));
    var tb = h('tbody'); Object.keys(Mercado.sec).forEach(function (k) { var e = Mercado.sec[k]; tb.appendChild(h('tr', h('td', k), h('td', e.origen + (Mercado.obsoleto(k) ? ' (obsoleto)' : '')), h('td', window.Fmt.edad(Mercado.edad(k))), h('td', e.obj.fuente || '-'))); if (e.intentos.length) tb.appendChild(h('tr', h('td', { colspan: 4, class: 'muted peq' }, e.intentos.join(' | ')))); });
    t.appendChild(tb);
    var chk = h('input', { type: 'checkbox', checked: Mercado.ajustes.forzarDemo }), chk2 = h('input', { type: 'checkbox', checked: !Mercado.ajustes.sinDirecto });
    A.dialogo('Estado de los datos', h('div', h('div.scroll-x', t), h('p.peq.muted', 'Origen: vivo = rama de datos del repositorio; cache = ultima copia guardada; directo = API publica sin clave consultada desde tu navegador; demo = datos de ejemplo inventados.'),
      h('label.fila-flex', chk, 'Forzar modo demo'), h('label.fila-flex', chk2, 'Permitir respaldo directo (CoinGecko / Frankfurter)')),
      [{ t: 'Aplicar y recargar', pri: true, f: function () { Mercado.ajustes.forzarDemo = chk.checked; Mercado.ajustes.sinDirecto = !chk2.checked; Mercado.hist = {}; Almacen.set('forzarDemo', chk.checked); A.recargar(true); } }, { t: 'Cerrar' }]);
  };
  A.recargar = function (forzar) {
    var b = document.getElementById('btn-recargar'); b.disabled = true;
    return Mercado.cargar(forzar).then(function () { actualizarChip(); render(true); A.evaluarAlertas(); if (forzar) UI.toast('Datos actualizados'); }).catch(function (e) { UI.toast('Error al recargar: ' + e.message, 'error'); }).then(function () { b.disabled = false; });
  };

  /* ---- alertas ---- */
  A.cierresCache = {};
  A.evaluarAlertas = function () {
    if (evaluando) return Promise.resolve([]); var al = Almacen.get('alertas', []).filter(function (a) { return a.activa; }); if (!al.length) return Promise.resolve([]);
    evaluando = true;
    var necesitan = {}; al.forEach(function (a) { if (/^rsi|^cruce/.test(a.tipo) && Mercado.porKey[a.key]) necesitan[a.key] = Mercado.porKey[a.key]; });
    return Mercado.historialLote(Object.keys(necesitan).map(function (k) { return necesitan[k]; }), 4).then(function (hs) {
      Object.keys(hs).forEach(function (k) { if (!hs[k].soloCierre) A.cierresCache[k] = hs[k].velas.map(function (v) { return v[4]; }); });
      var todas = Almacen.get('alertas', []), ctx = { precio: function (k) { var a = Mercado.porKey[k]; return a ? a.precio : null; }, cambio24h: function (k) { var a = Mercado.porKey[k]; return a ? a.cambio24h : null; }, cierres: function (k) { return A.cierresCache[k] || null; } };
      var disp = Alertas.evaluar(todas, ctx, Date.now());
      if (disp.length) {
        Almacen.set('alertas', todas); var hist = Almacen.get('alertas_historial', []);
        disp.forEach(function (d) { hist.unshift({ t: Date.now(), mensaje: d.mensaje }); UI.toast('Alerta: ' + d.mensaje, 'alerta'); notificar('Alerta de mercado', d.mensaje); });
        Almacen.set('alertas_historial', hist.slice(0, 60));
      }
      return disp;
    }).catch(function () { return []; }).then(function (r) { evaluando = false; return r; });
  };
  function notificar(t, c) { try { if ('Notification' in window && Notification.permission === 'granted') new Notification(t, { body: c, tag: 'mercados-' + c }); } catch (e) {} }
  A.pedirNotificaciones = function () { if (!('Notification' in window)) return Promise.resolve('no-soportado'); return Notification.requestPermission(); };

  /* ---- buscador global ---- */
  var buscadorAbierto = false;
  A.buscar = function () {
    if (buscadorAbierto) return; buscadorAbierto = true; var idx = 0, res = [];
    var inp = h('input', { type: 'search', placeholder: 'Simbolo o nombre (BTC, AAPL, EUR, Azuki…)', 'aria-label': 'Buscar activo', autocomplete: 'off' }), ul = h('ul', { role: 'listbox' });
    var fondo = h('div.modal-fondo', { onclick: function (e) { if (e.target === fondo) cerrar(); } }, h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Buscar' }, inp, ul));
    function cerrar() { fondo.remove(); buscadorAbierto = false; }
    function pintar() {
      res = Mercado.buscar(inp.value, 30); idx = Math.min(idx, Math.max(0, res.length - 1)); UI.vaciar(ul);
      if (!res.length) ul.appendChild(h('li.muted', 'Sin resultados'));
      res.forEach(function (a, i) { ul.appendChild(h('li' + (i === idx ? '.sel' : ''), { role: 'option', onclick: function () { abrir(a); } }, h('span', h('b', a.simbolo), ' ', h('span.muted', a.nombre)), h('span.muted.peq', A.tipoLegible[a.tipo]))); });
      var s = ul.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
    }
    function abrir(a) { cerrar(); A.abrirActivo(a.key); }
    inp.addEventListener('input', function () { idx = 0; pintar(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { idx = Math.min(res.length - 1, idx + 1); pintar(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); pintar(); e.preventDefault(); } else if (e.key === 'Enter' && res[idx]) abrir(res[idx]); else if (e.key === 'Escape') cerrar(); });
    document.body.appendChild(fondo); pintar(); inp.focus();
  };
  A.buscadorAbierto = function () { return buscadorAbierto; };

  /* ---- render ---- */
  function render(recarga) {
    var r = A.parseHash(); if (!vistas[r.seccion]) r.seccion = 'resumen';
    if (recarga && actual && actual.alActualizar && actual.seccion === r.seccion) { try { actual.alActualizar(); return; } catch (e) {} }
    if (actual && actual.destruir) { try { actual.destruir(); } catch (e) {} } A.tabla = null;
    document.querySelectorAll('#nav a').forEach(function (a) { if (a.dataset.id === r.seccion) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    UI.vaciar(vistaEl);
    if (!Mercado.ultimaCarga) { vistaEl.appendChild(h('div.cargando', h('span.gira'), 'Cargando mercados…')); return; }
    try { actual = vistas[r.seccion](vistaEl, r) || {}; actual.seccion = r.seccion; }
    catch (e) { console.error(e); actual = null; vistaEl.appendChild(h('div.banner.rojo', 'Error al mostrar la seccion: ' + e.message)); }
    if (!recarga) document.getElementById('main').scrollTop = 0;
  }

  /* ---- mando ---- */
  function bucleMando() {
    if (!window.Mando) return; setInterval(function () {
      Mando.leer(); if (!Mando.conectado || A.buscadorAbierto()) return;
      var t = A.tabla;
      if (Mando.pulsado('ABAJO') && t) t.mover(1); if (Mando.pulsado('ARRIBA') && t) t.mover(-1);
      if (Mando.ejes.izq.y > 0.7 && t && (Date.now() % 120 < 90)) t.mover(1); if (Mando.ejes.izq.y < -0.7 && t && (Date.now() % 120 < 90)) t.mover(-1);
      if (Mando.pulsado('A') && t) t.abrirSeleccion(); if (Mando.pulsado('B')) history.back();
      if (Mando.pulsado('Y')) A.buscar(); if (Mando.pulsado('X')) A.recargar(true);
      var tabs = Array.prototype.slice.call(document.querySelectorAll('#vista .subtab')), i = tabs.findIndex(function (b) { return b.classList.contains('activa'); });
      if (tabs.length && Mando.pulsado('RB') && i < tabs.length - 1) tabs[i + 1].click(); if (tabs.length && Mando.pulsado('LB') && i > 0) tabs[i - 1].click();
      if (Mando.pulsado('MENU')) A.alternarTema();
    }, 60);
  }

  /* ---- arranque ---- */
  A.iniciar = function () {
    vistaEl = document.getElementById('vista'); bannersEl = document.getElementById('banners');
    var nav = document.getElementById('nav');
    SECCIONES.forEach(function (s) { nav.appendChild(h('a', { href: '#/' + s[0], 'data-id': s[0] }, h('span.ico', { html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">' + ICO[s[0]] + '</svg>' }), h('span', s[1]))); });
    nav.appendChild(h('div.legal', window.Guia.AVISO));
    document.getElementById('btn-buscar').onclick = A.buscar; document.getElementById('btn-recargar').onclick = function () { A.recargar(true); };
    document.getElementById('btn-tema').onclick = A.alternarTema; document.getElementById('btn-atajos').onclick = atajos; document.getElementById('chip-datos').onclick = A.detalleDatos;
    window.addEventListener('hashchange', function () { render(); });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase(); var tipeando = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); A.buscar(); return; }
      if (tipeando || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg,.modal-fondo')) return;
      if (e.key === '/') { e.preventDefault(); A.buscar(); } else if (e.key === '?') atajos(); else if (e.key.toLowerCase() === 'r') A.recargar(true); else if (e.key.toLowerCase() === 't') A.alternarTema();
      else if (/^[1-7]$/.test(e.key)) A.ir(SECCIONES[+e.key - 1][0]);
    });
    Almacen.listo.then(function () {
      aplicarTema(); var aj = A.ajustes(); Mercado.ajustes.forzarDemo = Mercado.ajustes.forzarDemo || !!Almacen.get('forzarDemo', false);
      Almacen.suscribir('ajustes', aplicarTema);
      return Mercado.cargar();
    }).then(function () { actualizarChip(); render(); A.evaluarAlertas(); timer = setInterval(function () { Mercado.cargar().then(function () { actualizarChip(); render(true); A.evaluarAlertas(); }); }, 120000); })
      .catch(function (e) { console.error(e); vistaEl.textContent = 'Error al iniciar: ' + e.message; });
    bucleMando();
  };
  function atajos() { var t = h('table.t'); window.Guia.ATAJOS.forEach(function (a) { t.appendChild(h('tr', h('td', h('code.f', a[0])), h('td', a[1]))); }); A.dialogo('Atajos de teclado y mando', t); }
  return A;
})();
