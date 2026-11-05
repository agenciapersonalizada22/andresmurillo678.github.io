/* Paneles secundarios: Nuevas, Guardadas, Alertas, Ahorro, Fuentes (estado + constructor), Ajustes y avisos legales. */
(function () {
  var Of = window.Of, A = Of.app, S = A.S, St = Of.almacen, Fu = Of.fuentes, Al = Of.alertas, esc = A.esc, $ = A.$;
  function sec(id) { return $('#v-' + id); }

  /* ---------- Nuevas ---------- */
  (function () {
    var lista, montado = false;
    A.vistas.nuevas = {
      mostrar: function () {
        var v = sec('nuevas');
        if (!montado) {
          v.classList.add('vlista');
          v.innerHTML = '<div class="cab"><h2>Nuevas ofertas</h2><p class="muted peq" id="nuevasInfo" style="margin:0 0 8px"></p><button type="button" class="btn peq" id="btnLeidas">Marcar todo como visto</button></div><div id="listaNuevas" class="lista-scroll"></div>';
          lista = A.crearLista($('#listaNuevas'), { datos: function () { return S.nuevas; }, sel: function () { return lista.sel; } }); lista.virt.modo(S.aj.vista);
          A.vistas.nuevas.lista = lista; A.listaActiva = lista; montado = true;
          $('#btnLeidas').onclick = function () { A.marcarLeidas(); A.vistas.nuevas.mostrar(); A.toast('Marcadas como vistas'); };
        }
        A.listaActiva = lista; lista.sel = -1; lista.virt.datos(S.nuevas);
        $('#nuevasInfo').textContent = S.nuevas.length + ' ofertas publicadas desde tu última visita (' + new Date(S.visita.previa).toLocaleString('es') + ')' + (S.nNuevas ? ' · ' + S.nNuevas + ' sin ver' : '');
        var vac = $('#vacioNuevas'); if (vac) vac.remove();
        if (!S.nuevas.length) $('#listaNuevas').insertAdjacentHTML('beforeend', '<div id="vacioNuevas" class="vacio"><div class="grande">📭</div><p>No hay ofertas nuevas desde tu última visita.</p></div>');
        setTimeout(function () { lista.virt.refrescar(); }, 0);
      }
    };
  })();

  /* ---------- Guardadas ---------- */
  (function () {
    var lista, montado = false, carp = 'todas', datos = [];
    function calcular() {
      var out = [];
      Object.keys(S.guardados).forEach(function (k) {
        var r = S.guardados[k];
        if (carp === 'usadas' ? !r.usada : (!r.guardada || (carp !== 'todas' && r.carpetas.indexOf(carp) < 0))) return;
        var it = S.porId[k] || A.itemDeSnap(r.snap); if (it) out.push([r.t || 0, it]);
      });
      datos = out.sort(function (a, b) { return b[0] - a[0]; }).map(function (x) { return x[1]; });
    }
    function cab() {
      var cs = [['todas', 'Todas'], ['deseos', 'Lista de deseos']].concat(S.carpetas.map(function (c) { return [c.id, c.nombre]; })).concat([['usadas', 'Usadas']]);
      var bajaron = Object.keys(S.guardados).filter(function (k) { var r = S.guardados[k], it = S.porId[k]; return r.guardada && it && it.moneda === (r.snap && r.snap.moneda) && it.precio < r.precioGuardado * 0.99; }).length;
      $('#guardCab').innerHTML = '<h2>Guardadas</h2><div class="chips-w" role="group" aria-label="Carpetas">' + cs.map(function (c) { return '<button type="button" class="chip' + (carp === c[0] ? ' on' : '') + '" data-carp="' + esc(c[0]) + '" aria-pressed="' + (carp === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') +
        '<button type="button" class="chip" id="btnNC">＋ Carpeta</button></div><p class="muted peq" style="margin:6px 0">' + datos.length + ' ofertas' + (bajaron ? ' · <b class="ok-t">' + bajaron + ' bajaron de precio desde que las guardaste</b>' : '') + '</p>' +
        (S.carpetas.some(function (c) { return c.id === carp; }) ? '<button type="button" class="btn peq peligro" id="btnBC">Eliminar esta carpeta</button> <button type="button" class="btn peq" id="btnRC">Renombrar</button>' : '');
      $('#guardCab').onclick = function (e) {
        var b = e.target.closest('[data-carp]'); if (b) { carp = b.dataset.carp; A.vistas.guardadas.mostrar(); }
        if (e.target.id === 'btnNC') { var n = prompt('Nombre de la carpeta'); if (n) { var c = A.nuevaCarpeta(n); if (c) { carp = c.id; A.vistas.guardadas.mostrar(); } } }
        if (e.target.id === 'btnBC' && confirm('Eliminar la carpeta? Las ofertas no se borran.')) { A.borrarCarpeta(carp); carp = 'todas'; A.vistas.guardadas.mostrar(); }
        if (e.target.id === 'btnRC') { var c2 = S.carpetas.find(function (x) { return x.id === carp; }), nn = prompt('Nuevo nombre', c2.nombre); if (nn && nn.trim()) { c2.nombre = nn.trim().slice(0, 40); St.set('c:' + c2.id, c2); A.vistas.guardadas.mostrar(); } }
      };
    }
    A.vistas.guardadas = {
      refrescar: function () { if (montado && !sec('guardadas').hidden) A.vistas.guardadas.mostrar(true); },
      mostrar: function (conservar) {
        var v = sec('guardadas');
        if (!montado) {
          v.classList.add('vlista'); v.innerHTML = '<div class="cab" id="guardCab"></div><div id="listaGuardadas" class="lista-scroll"></div>';
          lista = A.crearLista($('#listaGuardadas'), { datos: function () { return datos; }, sel: function () { return lista.sel; } }); lista.virt.modo(S.aj.vista);
          A.vistas.guardadas.lista = lista; montado = true;
        }
        A.listaActiva = lista; calcular(); cab(); lista.virt.datos(datos, conservar === true);
        var vac = $('#vacioGuard'); if (vac) vac.remove();
        if (!datos.length) $('#listaGuardadas').insertAdjacentHTML('beforeend', '<div id="vacioGuard" class="vacio"><div class="grande">♡</div><p>' + (carp === 'usadas' ? 'Aún no has marcado ofertas como usadas.' : 'Aquí aparecerán las ofertas que guardes. Toca el corazón de una tarjeta o deslízala a la derecha.') + '</p></div>');
        setTimeout(function () { lista.virt.refrescar(); }, 0);
      }
    };
  })();

  /* ---------- Alertas ---------- */
  A.editarAlerta = function (a) {
    var nueva = !S.alertas.some(function (x) { return x.id === a.id; }), mons = Object.keys(S.tasas).sort();
    if (mons.indexOf(a.moneda) < 0) mons.push(a.moneda);
    var d = A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">' + (nueva ? 'Nueva alerta' : 'Editar alerta') + '</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div>' +
      '<div class="campo"><label for="alTipo">Tipo</label><select id="alTipo"><option value="palabra"' + (a.tipo === 'palabra' ? ' selected' : '') + '>Palabra clave (cualquier oferta que coincida)</option><option value="producto"' + (a.tipo === 'producto' ? ' selected' : '') + '>Precio de un producto concreto</option></select></div>' +
      '<div class="campo"><label for="alNom">Nombre (opcional)</label><input id="alNom" type="text" maxlength="60" value="' + esc(a.nombre) + '"></div>' +
      '<div id="alPal"><div class="campo"><label for="alQ">Palabras clave (admite operadores: tienda:, cat:, -excluir)</label><input id="alQ" type="text" placeholder="laptop, iphone 15, tienda:amazon -reacondicionado" value="' + esc(a.consulta) + '"></div>' +
      '<div class="fila2"><div class="campo" style="flex:1"><label for="alMax">Precio máximo</label><input id="alMax" type="number" min="0" inputmode="decimal" value="' + (a.precioMax || '') + '"></div><div class="campo" style="flex:1"><label for="alDto">Descuento mínimo %</label><input id="alDto" type="number" min="0" max="95" inputmode="numeric" value="' + (a.descMin || '') + '"></div></div></div>' +
      '<div id="alProd" class="campo"><label for="alObj">Avísame cuando el precio sea igual o menor a</label><input id="alObj" type="number" min="0" inputmode="decimal" value="' + (a.objetivo || '') + '"><p class="muted peq" style="margin:4px 0 0">Vigila ' + a.itemIds.length + ' oferta(s) del mismo producto en distintas tiendas.</p></div>' +
      '<div class="campo"><label for="alMon">Moneda del umbral</label><select id="alMon">' + mons.map(function (m) { return '<option' + (m === a.moneda ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<label class="cb"><input type="checkbox" id="alVig"' + (a.soloVigentes ? ' checked' : '') + '> Ignorar ofertas vencidas</label>' +
      '<p class="tarj peq" id="alPrev" aria-live="polite" style="margin:10px 0"></p><div class="fila2"><button class="btn prim" id="alOk">Guardar alerta</button><button class="btn" data-cerrar>Cancelar</button></div>');
    function leer() {
      return Object.assign({}, a, { tipo: $('#alTipo', d).value, nombre: $('#alNom', d).value.trim(), consulta: $('#alQ', d).value.trim(), precioMax: parseFloat($('#alMax', d).value) || null, descMin: parseFloat($('#alDto', d).value) || null,
        objetivo: parseFloat($('#alObj', d).value) || null, moneda: $('#alMon', d).value, soloVigentes: $('#alVig', d).checked });
    }
    function previa() {
      var x = leer(); $('#alPal', d).hidden = x.tipo !== 'palabra'; $('#alProd', d).hidden = x.tipo !== 'producto';
      var valido = x.tipo === 'producto' ? (x.objetivo && x.itemIds.length) : (x.consulta || x.precioMax || x.descMin);
      var n = valido ? Al.evaluar([Object.assign({}, x, { activa: true, vistos: {} })], S.items, { ahora: Date.now(), convertir: A.conv, descReal: function (it) { return it._an.sinHistorial ? 0 : it._an.descReal * 100; } }) : [];
      $('#alPrev', d).innerHTML = valido ? 'Avísame si aparece <b>' + esc(Al.describir(x)) + '</b>.<br>Ahora mismo coinciden <b>' + (n.length ? n[0].coincidencias.length : 0) + '</b> ofertas.' : 'Indica una palabra clave, un precio máximo o un descuento mínimo.';
      $('#alOk', d).disabled = !valido; return valido;
    }
    d.oninput = d.onchange = previa; previa();
    $('#alOk', d).onclick = function () { if (!previa()) return; var x = leer(); A.guardarAlerta(x); d.close(); A.evaluarAlertas(); A.vistas.alertas.mostrar(); A.toast('Alerta guardada'); };
  };
  A.fragmentoConfig = function () {
    var cfg = Fu.config(null, Fu.palabrasDeAlertas(S.alertas)), txt = Fu.texto(cfg), vacio = !cfg.ofertas || !cfg.ofertas.busqueda;
    var d = A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Alertas en el proceso programado</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div>' +
      '<p class="peq">Tus alertas se comprueban aquí solo mientras la página está abierta. Para que el proceso programado de GitHub busque estas palabras clave de forma continua (y las incluya aunque no estén en las fuentes habituales), pega este fragmento en <code>scripts/datos/config.json</code>.</p>' +
      (vacio ? '<p class="aviso-t"><b>No tienes alertas de palabra clave activas.</b> Crea una primero.</p>' : '<pre class="cod" id="fragTxt">' + esc(txt) + '</pre><button class="btn prim" id="fragCopiar">Copiar fragmento</button>') +
      '<ol class="peq">' + Fu.INSTRUCCIONES.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ol>');
    var b = $('#fragCopiar', d); if (b) b.onclick = function () { A.copiar(txt, 'Fragmento copiado'); };
  };
  A.vistas.alertas = {
    mostrar: function () {
      var v = sec('alertas'), perm = window.Notification ? Notification.permission : 'no';
      v.innerHTML = '<div class="panel"><h2>Alertas</h2><p class="muted peq" style="margin:0 0 10px">Define «avísame si aparece [palabra clave] bajo [precio]» o «cualquier laptop con 30% o más». Se evalúan al abrir la app y cada 5 minutos mientras siga abierta.</p>' +
        '<div class="tarj"><div class="fila"><div class="crece"><b>Notificaciones del navegador:</b> <span id="notifEst">' + (perm === 'granted' && S.aj.notif ? '<span class="ok-t">activadas</span>' : perm === 'denied' ? '<span class="mal-t">bloqueadas por el navegador</span>' : perm === 'no' ? 'no disponibles' : 'desactivadas') + '</span>' +
        '<div class="muted peq">Límite: esta app no tiene servidor ni servicio en segundo plano. Solo puede avisarte mientras la pestaña esté abierta (aunque esté en segundo plano). Con la pestaña cerrada no hay avisos; las alertas se comprueban la próxima vez que la abras.</div></div>' +
        (window.Notification && !(perm === 'granted' && S.aj.notif) && perm !== 'denied' ? '<button class="btn" id="btnNotif">Activar</button>' : perm === 'granted' && S.aj.notif ? '<button class="btn" id="btnNotifOff">Desactivar</button>' : '') + '</div></div>' +
        '<div class="fila2" style="margin:10px 0;flex-wrap:wrap"><button class="btn prim" id="btnNuevaAl">＋ Nueva alerta</button><button class="btn" id="btnFrag">Generar config para el proceso programado</button></div>' +
        '<div id="listaAl">' + (S.alertas.length ? '' : '<div class="vacio"><div class="grande">⏰</div><p>Aún no tienes alertas.</p></div>') + '</div></div>';
      var cont = $('#listaAl', v);
      S.alertas.forEach(function (a) {
        var h = S.hits.find(function (x) { return x.alerta.id === a.id; }), co = h ? h.coincidencias : [], el = document.createElement('div'); el.className = 'tarj';
        el.innerHTML = '<div class="fila"><div class="crece"><b>' + esc(a.nombre || Al.describir(a)) + '</b><div class="muted peq">' + esc(Al.describir(a)) + '</div><div class="peq">' + (a.activa ? (co.length ? '<b class="ok-t">' + co.length + ' coincidencia(s) ahora</b>' : 'Sin coincidencias ahora') : 'Pausada') + '</div></div>' +
          '<label class="cb"><input type="checkbox" data-t="' + esc(a.id) + '"' + (a.activa ? ' checked' : '') + '> Activa</label><button class="btn peq" data-e="' + esc(a.id) + '">Editar</button><button class="btn peq peligro" data-b="' + esc(a.id) + '">Eliminar</button></div>' +
          (co.length ? '<div style="margin-top:6px">' + co.slice().sort(function (x, y) { return x._usd - y._usd; }).slice(0, 4).map(function (it) { return '<div class="comp"><div class="crece"><button class="enlace" data-o="' + esc(it.id) + '">' + esc(it.titulo) + '</button><div class="muted peq">' + esc(it.tienda) + '</div></div><b>' + A.fmt(it._pv, it._mv) + '</b></div>'; }).join('') + '</div>' : '');
        cont.appendChild(el);
      });
      v.onclick = function (e) {
        var t = e.target;
        if (t.id === 'btnNuevaAl') A.editarAlerta(Al.nueva({ moneda: A.monedaAgg() }));
        else if (t.id === 'btnFrag') A.fragmentoConfig();
        else if (t.id === 'btnNotif') { Notification.requestPermission().then(function (p) { A.setAj({ notif: p === 'granted' }); A.vistas.alertas.mostrar(); if (p === 'granted') try { new Notification('Notificaciones activadas', { body: 'Te avisaré de las alertas mientras esta página esté abierta.' }); } catch (x) {} }); }
        else if (t.id === 'btnNotifOff') { A.setAj({ notif: false }); A.vistas.alertas.mostrar(); }
        else if (t.dataset.e) A.editarAlerta(S.alertas.find(function (x) { return x.id === t.dataset.e; }));
        else if (t.dataset.b) { if (confirm('Eliminar esta alerta?')) { A.borrarAlerta(t.dataset.b); A.evaluarAlertas(); A.vistas.alertas.mostrar(); } }
        else if (t.dataset.o) A.abrirDetalle(S.porId[t.dataset.o]);
      };
      v.onchange = function (e) { if (e.target.dataset.t) { var a = S.alertas.find(function (x) { return x.id === e.target.dataset.t; }); A.guardarAlerta(Object.assign({}, a, { activa: e.target.checked })); A.evaluarAlertas(); A.vistas.alertas.mostrar(); } };
    }
  };

  /* ---------- Ahorro ---------- */
  A.vistas.ahorro = {
    mostrar: function () {
      var v = sec('ahorro'), mon = A.monedaAgg(), usadas = Object.keys(S.guardados).map(function (k) { return S.guardados[k]; }).filter(function (r) { return r.usada; });
      var tot = 0, meses = {};
      usadas.forEach(function (r) { var x = A.conv(r.ahorro || 0, r.ahorroMoneda || 'USD', mon); tot += x; var f = new Date(r.tUsada || r.t), k = f.getFullYear() + '-' + ('0' + (f.getMonth() + 1)).slice(-2); meses[k] = (meses[k] || 0) + x; });
      var ks = Object.keys(meses).sort().slice(-6), mx = Math.max.apply(null, ks.map(function (k) { return meses[k]; }).concat([1]));
      v.innerHTML = '<div class="panel"><h2>Ahorro estimado</h2><div class="tarj"><div style="font-size:2rem;font-weight:800;color:var(--ok)">' + A.fmt(tot, mon) + '</div><div class="muted peq">en ' + usadas.length + ' ofertas marcadas como usadas (' + mon + ')</div></div>' +
        '<p class="muted peq">Estimación: diferencia entre el precio de referencia (mediana de 90 días si hay historial; si no, el «precio anterior» declarado) y lo pagado. No es un dato contable: los precios de referencia pueden no ser fiables.</p>' +
        (ks.length ? '<h3>Por mes</h3>' + ks.map(function (k) { return '<div class="fila2" style="margin:4px 0"><span style="width:70px">' + k + '</span><div class="barra-ahorro" style="width:' + Math.round(meses[k] / mx * 100) + '%;max-width:calc(100% - 180px)"></div><b>' + A.fmt(meses[k], mon) + '</b></div>'; }).join('') : '') +
        '<h3>Ofertas usadas</h3>' + (usadas.length ? usadas.sort(function (a, b) { return (b.tUsada || 0) - (a.tUsada || 0); }).map(function (r) { return '<div class="comp"><div class="crece"><button class="enlace" data-o="' + esc(r.id) + '">' + esc(r.snap.titulo) + '</button><div class="muted peq">' + esc(r.snap.tienda) + ' · ' + new Date(r.tUsada || r.t).toLocaleDateString('es') + '</div></div><div><b class="ok-t">' + A.fmt(A.conv(r.ahorro || 0, r.ahorroMoneda || 'USD', mon), mon) + '</b></div><button class="btn peq" data-d="' + esc(r.id) + '">Deshacer</button></div>'; }).join('') : '<div class="vacio"><div class="grande">💰</div><p>Marca ofertas como usadas desde su detalle (o con la tecla U) para llevar la cuenta de lo que ahorras.</p></div>') + '</div>';
      v.onclick = function (e) {
        var t = e.target; if (t.dataset.o) { var r = S.guardados[t.dataset.o]; A.abrirDetalle(S.porId[t.dataset.o] || A.itemDeSnap(r.snap)); }
        if (t.dataset.d) { var it = S.porId[t.dataset.d] || A.itemDeSnap(S.guardados[t.dataset.d].snap); A.marcarUsada(it, false); A.vistas.ahorro.mostrar(); }
      };
    }
  };

  /* ---------- Fuentes ---------- */
  A.vistas.fuentes = {
    mostrar: function () {
      var v = sec('fuentes'), est = S.estado && S.estado.fuentes || {}, ids = Object.keys(est), por = {};
      S.items.forEach(function (i) { por[i.fuente] = (por[i.fuente] || 0) + 1; });
      var todos = A.uniq(ids.concat(Object.keys(por))), ed = Datos.edad(S.ofertasObj);
      v.innerHTML = '<div class="panel"><h2>Fuentes y estado de los datos</h2>' +
        '<div class="tarj"><div class="fila"><div class="crece"><b>Edad de los datos de ofertas:</b> ' + (S.demo ? '<span class="aviso-t">datos de demostración</span>' : A.edad(ed) + (ed > 6 * 3600000 ? ' <b class="mal-t">(obsoletos)</b>' : '')) + '<div class="muted peq">Generado ' + (S.ofertasObj ? new Date(S.ofertasObj.generado).toLocaleString('es') : '-') + ' · ' + S.items.length + ' ofertas · historial de ' + Object.keys(S.hist).length + ' productos</div></div><button class="btn" id="btnRef">Actualizar ahora</button></div></div>' +
        '<h3>Estado de cada fuente</h3>' + (todos.length ? '<div class="tarj" style="overflow:auto"><table class="t"><thead><tr><th>Fuente</th><th>Estado</th><th>Última lectura</th><th>Items</th><th>En el feed</th></tr></thead><tbody>' + todos.map(function (k) {
          var e = est[k]; return '<tr><td>' + esc(k) + '</td><td>' + (e ? '<span class="punto ' + (e.ok ? 'ok' : 'mal') + '"></span>' + (e.ok ? 'Correcta' : 'Con error') + (e.error ? '<div class="peq mal-t">' + esc(e.error) + '</div>' : '') : '<span class="punto"></span>Sin estado') + '</td><td>' + (e && e.ultimo ? A.edad(Date.now() - Date.parse(e.ultimo)) : '-') + '</td><td>' + (e ? e.items : '-') + '</td><td>' + (por[k] || 0) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted">No hay información de estado (estado.json) disponible.</p>') +
        '<h3>Constructor de fuentes</h3><div class="tarj"><p class="peq" style="margin-top:0">Verifica una URL de feed RSS/Atom o una página con datos JSON-LD (Product/Offer) que quieras vigilar y genera el bloque de configuración para el proceso programado.</p>' +
        '<div class="campo"><label for="cbUrl">URL del feed o página</label><input id="cbUrl" type="url" inputmode="url" placeholder="https://tienda.com/feed.xml" autocomplete="off"></div>' +
        '<div class="fila2" style="flex-wrap:wrap"><div class="campo" style="flex:1;min-width:130px"><label for="cbTipo">Tipo</label><select id="cbTipo"><option value="auto">Detectar</option><option value="rss">RSS</option><option value="atom">Atom</option><option value="jsonld">Página con JSON-LD</option></select></div>' +
        '<div class="campo" style="flex:1;min-width:130px"><label for="cbTienda">Nombre de la tienda</label><input id="cbTienda" type="text"></div></div>' +
        '<div class="fila2" style="flex-wrap:wrap"><div class="campo" style="flex:1;min-width:90px"><label for="cbPais">País</label><input id="cbPais" type="text" maxlength="2" placeholder="ES"></div><div class="campo" style="flex:1;min-width:90px"><label for="cbMon">Moneda</label><input id="cbMon" type="text" maxlength="3" placeholder="EUR"></div><div class="campo" style="flex:1;min-width:130px"><label for="cbCat">Categoría</label><input id="cbCat" type="text" placeholder="general"></div></div>' +
        '<div class="fila2" style="flex-wrap:wrap"><button class="btn prim" id="cbProbar">Probar desde el navegador</button><button class="btn" id="cbGenerar">Generar bloque de config</button></div><div id="cbRes" aria-live="polite"></div></div></div>';
      $('#btnRef', v).onclick = function () { A.cargar(true).then(function () { A.vistas.fuentes.mostrar(); A.toast('Datos actualizados'); }); };
      var rep = null;
      function form() { return { url: $('#cbUrl', v).value, tipo: $('#cbTipo', v).value, tienda: $('#cbTienda', v).value.trim(), pais: $('#cbPais', v).value.trim(), moneda: $('#cbMon', v).value.trim(), categoria: $('#cbCat', v).value.trim() }; }
      $('#cbProbar', v).onclick = function () {
        var f = form(), val = Fu.validarUrl(f.url), res = $('#cbRes', v);
        if (!val.ok) { res.innerHTML = '<p class="mal-t">' + esc(val.error) + '</p>'; return; }
        res.innerHTML = '<p class="muted">Probando…</p>'; var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 12000);
        fetch(val.url, { signal: ctl.signal, headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/html, */*' } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (txt) {
          clearTimeout(to); rep = Fu.parsearFeed(txt); rep.ok = true;
          if (rep.tipo !== 'desconocido' && f.tipo === 'auto') $('#cbTipo', v).value = rep.tipo;
          if (!$('#cbTienda', v).value) $('#cbTienda', v).value = val.host;
          var cp = rep.campos;
          res.innerHTML = '<div class="tarj" style="margin-top:10px"><b>' + (rep.items.length ? '<span class="ok-t">Se pudo leer</span>' : '<span class="mal-t">Sin elementos útiles</span>') + '</b> · tipo detectado: <b>' + rep.tipo + '</b>' + (f.tipo !== 'auto' && f.tipo !== rep.tipo ? ' <span class="aviso-t">(elegiste ' + f.tipo + ')</span>' : '') + ' · ' + rep.total + ' elementos' +
            '<div class="peq muted">Con precio: ' + cp.precio + ' · con imagen: ' + cp.imagen + ' · con fecha: ' + cp.fecha + ' · con enlace: ' + cp.enlace + '</div>' +
            val.avisos.concat(rep.avisos).map(function (a) { return '<p class="aviso-t peq" style="margin:4px 0">⚠ ' + esc(a) + '</p>'; }).join('') +
            rep.items.slice(0, 5).map(function (i) { return '<div class="comp"><div class="crece">' + esc(i.titulo) + '<div class="muted peq">' + esc(i.enlace).slice(0, 80) + '</div></div><b>' + (i.precio != null && !isNaN(i.precio) ? A.fmt(i.precio, i.moneda || 'USD') : '-') + '</b></div>'; }).join('') + '</div>';
        }).catch(function (err) {
          clearTimeout(to); rep = null;
          res.innerHTML = '<div class="tarj" style="margin-top:10px"><b class="aviso-t">No se pudo leer desde el navegador</b> (' + esc(err.name === 'AbortError' ? 'tiempo agotado' : err.message) + ').<p class="peq muted" style="margin:4px 0 0">Lo más habitual es que el sitio no permita lecturas desde otras páginas (CORS). Eso <b>no</b> significa que la fuente falle: el proceso programado la descarga desde un servidor, sin esa restricción. Puedes generar el bloque igualmente; quedará sin verificar y el estado de la fuente lo confirmará aquí tras su primera ejecución.</p></div>';
        });
      };
      $('#cbGenerar', v).onclick = function () {
        var f = form(), val = Fu.validarUrl(f.url), res = $('#cbRes', v);
        if (!val.ok) { res.innerHTML = '<p class="mal-t">' + esc(val.error) + '</p>'; return; }
        if (f.tipo === 'auto') f.tipo = rep && rep.tipo !== 'desconocido' ? rep.tipo : Fu.adivinarTipo(val.url);
        var blq = Fu.bloqueFuente(f), txt = Fu.texto(Fu.config([blq], null));
        res.insertAdjacentHTML('beforeend', '<div class="tarj" id="cbSalida" style="margin-top:10px"><b>Bloque de configuración' + (rep ? '' : ' (sin verificar)') + '</b><pre class="cod">' + esc(txt) + '</pre><button class="btn prim" id="cbCopiar">Copiar bloque</button>' +
          '<ol class="peq">' + Fu.INSTRUCCIONES.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ol></div>');
        var o = $('#cbSalida', v); o.scrollIntoView({ block: 'nearest' }); $('#cbCopiar', v).onclick = function () { A.copiar(txt, 'Bloque copiado'); };
        var antes = A.$$('#cbSalida', v); if (antes.length > 1) antes[0].remove();
      };
    }
  };

  /* ---------- Ajustes ---------- */
  A.vistas.ajustes = {
    mostrar: function () {
      var v = sec('ajustes'), aj = S.aj, mons = ['original'].concat(Object.keys(S.tasas).sort()), paises = ['', 'ES', 'MX', 'CO', 'AR', 'CL', 'PE', 'DO', 'BR', 'US', 'GB'];
      function seg(nombre, ops, val) { return '<div class="seg" role="group" aria-label="' + nombre + '">' + ops.map(function (o) { return '<button type="button" data-aj="' + nombre + '" data-v="' + o[0] + '" aria-pressed="' + (val === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
      v.innerHTML = '<div class="panel"><h2>Ajustes</h2>' +
        '<div class="tarj"><div class="campo"><label>Tema</label>' + seg('tema', [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']], aj.tema) + '</div><div class="campo"><label>Vista</label>' + seg('vista', [['rejilla', 'Rejilla'], ['lista', 'Lista']], aj.vista) + '</div>' +
        '<div class="campo"><label for="ajPais">Mi país (moneda sugerida y filtro de fuentes)</label><select id="ajPais">' + paises.map(function (p) { return '<option value="' + p + '"' + (aj.pais === p ? ' selected' : '') + '>' + (p || 'Cualquiera') + '</option>'; }).join('') + '</select></div>' +
        '<div class="campo"><label for="ajMon">Moneda de visualización (conversión con mercados/divisas.json)</label><select id="ajMon">' + mons.map(function (m) { return '<option value="' + m + '"' + (aj.moneda === m ? ' selected' : '') + '>' + (m === 'original' ? 'La de cada oferta' : m) + '</option>'; }).join('') + '</select>' + (Object.keys(S.tasas).length < 3 ? '<div class="peq aviso-t">No hay tasas de cambio disponibles: no se puede convertir.</div>' : '') + '</div>' +
        '<label class="cb"><input type="checkbox" id="ajAgr"' + (aj.agrupar ? ' checked' : '') + '> Agrupar el mismo producto de varias tiendas</label><label class="cb"><input type="checkbox" id="ajVig"' + (aj.vigentes ? ' checked' : '') + '> Mostrar solo ofertas vigentes por defecto</label></div>' +
        '<div class="tarj"><div class="campo"><label>Categorías favoritas (suben en el orden por calor)</label><div class="chips-w">' + (S.categorias || []).map(function (c) { var on = aj.favoritas.indexOf(c) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-fav="' + esc(c) + '" aria-pressed="' + on + '">' + (on ? '★ ' : '') + esc(c) + '</button>'; }).join('') + '</div></div>' +
        '<div class="campo"><label>Tiendas silenciadas (no aparecen en ninguna lista ni en alertas)</label><div class="lista-cb">' + (S.tiendas || []).map(function (t) { return '<label class="cb"><input type="checkbox" data-sil="' + esc(t) + '"' + (aj.silenciadas.indexOf(t) >= 0 ? ' checked' : '') + '> ' + esc(t) + '</label>'; }).join('') + '</div></div></div>' +
        '<div class="tarj"><label class="cb"><input type="checkbox" id="ajDemo"' + (aj.demo ? ' checked' : '') + '> Usar datos de demostración (ficticios)</label><div class="muted peq">También se activan solos si aún no hay datos publicados. Añade <code>?demo=5000</code> a la URL para probar con muchas ofertas.</div></div>' +
        '<div class="tarj"><b>Tus datos</b><div class="muted peq">Guardadas, alertas y ajustes viven solo en este dispositivo (' + St.modo + ').</div><div class="fila2" style="margin-top:8px;flex-wrap:wrap"><button class="btn peq" id="ajExp">Exportar copia</button><label class="btn peq" for="ajImp">Importar copia</label><input type="file" id="ajImp" accept="application/json" class="sr"><button class="btn peq peligro" id="ajBor">Borrar todo</button></div></div>' +
        '<div class="fila2" style="flex-wrap:wrap"><button class="btn" id="ajAtajos">Atajos de teclado y mando</button><button class="btn" id="ajAvisos">Avisos y transparencia</button></div></div>';
      v.onclick = function (e) {
        var t = e.target.closest('button,label'); if (!t) return;
        if (t.dataset.aj) { var p = {}; p[t.dataset.aj] = t.dataset.v; A.setAj(p); if (t.dataset.aj === 'vista') Object.keys(A.vistas).forEach(function (k) { var l = A.vistas[k].lista; if (l) l.virt.modo(S.aj.vista); }); A.vistas.ajustes.mostrar(); }
        else if (t.dataset.fav) { var f = aj.favoritas.slice(), i = f.indexOf(t.dataset.fav); if (i >= 0) f.splice(i, 1); else f.push(t.dataset.fav); A.setAj({ favoritas: f }); A.vistas.ajustes.mostrar(); A.recalcular(); }
        else if (t.id === 'ajExp') { var b = new Blob([JSON.stringify(St.exportar(), null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ofertas-copia.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
        else if (t.id === 'ajBor') { if (confirm('Borrar guardadas, alertas, carpetas y ajustes de este dispositivo?')) { var ex = St.exportar(); Object.keys(ex).forEach(function (k) { St.borrar(k.replace(/^ofertas:/, '')); }); location.reload(); } }
        else if (t.id === 'ajAtajos') A.ayudaTeclas(); else if (t.id === 'ajAvisos') A.avisosLegales();
      };
      v.onchange = function (e) {
        var t = e.target;
        if (t.id === 'ajPais') { A.setAj({ pais: t.value }); if (t.value && S.aj.moneda === 'original') A.toast('País guardado'); S.f.pais = t.value; St.set('filtros', S.f); A.pintarFiltros(); A.recalcular(); }
        else if (t.id === 'ajMon') { A.setAj({ moneda: t.value }); A.precios(); A.indexar().then(function () { A.pintarFiltros(); A.recalcular(); }); }
        else if (t.id === 'ajAgr') { A.setAj({ agrupar: t.checked }); A.recalcular(); } else if (t.id === 'ajVig') { A.setAj({ vigentes: t.checked }); S.f.vigentes = t.checked; A.pintarFiltros(); A.recalcular(); }
        else if (t.dataset.sil) { var s = aj.silenciadas.slice(), i = s.indexOf(t.dataset.sil); if (i >= 0) s.splice(i, 1); else s.push(t.dataset.sil); A.setAj({ silenciadas: s }); A.calcNuevas(); A.pintarNav(); A.evaluarAlertas(); A.recalcular(); }
        else if (t.id === 'ajDemo') { A.setAj({ demo: t.checked }); A.cargar(true).then(function () { A.vistas.ajustes.mostrar(); }); }
        else if (t.id === 'ajImp' && t.files[0]) { t.files[0].text().then(function (tx) { try { St.importar(JSON.parse(tx)); location.reload(); } catch (x) { A.toast('Archivo no válido'); } }); }
      };
    }
  };

  A.avisosLegales = function () {
    A.dialogo('dlgGeneral', '<div class="dh"><h2 id="genTitulo">Avisos y transparencia</h2><button class="btn-i chico" data-cerrar aria-label="Cerrar">✕</button></div>' +
      '<ul class="peq" style="padding-left:18px;line-height:1.5"><li><b>Los precios y la disponibilidad pueden cambiar</b> en cualquier momento y pueden diferir de lo mostrado aquí. Comprueba siempre el precio final, los gastos de envío y las condiciones en la tienda.</li>' +
      '<li><b>Los enlaces llevan a sitios de terceros.</b> No somos la tienda ni intervenimos en la compra. Los enlaces se marcan con rel="sponsored" y "nofollow" por si incluyen comisión.</li>' +
      '<li><b>Cada oferta indica su fuente</b> (etiqueta «Fuente»). Las ofertas las recopila de fuentes públicas un proceso programado y pueden contener errores u omisiones.</li>' +
      '<li><b>«Precio inflado», «mínimo histórico» y «calor» son estimaciones</b> basadas en el historial que hemos registrado, que puede ser corto o incompleto. No son una garantía.</li>' +
      '<li><b>Conversión de moneda:</b> usa tasas de referencia con retraso; el importe real depende de tu banco o de la tienda.</li>' +
      '<li><b>Alertas:</b> funcionan solo mientras la página está abierta (no hay servidor que te avise).</li>' +
      '<li><b>Privacidad:</b> guardadas, alertas y ajustes se almacenan únicamente en tu dispositivo.</li></ul>');
  };
})();
