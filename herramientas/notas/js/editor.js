/* Editor de notas: visual (contenteditable) + Markdown + vista previa, atajos Markdown, [[enlaces]], imagenes, bloqueo AES-GCM, historial. */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, Md = G.Md, U = G.Util, F = G.Fechas, Mo = G.Modelo, Cfg = G.Config, C = G.Cripto;
  var E = G.Editor = {}, st = null, claves = {}, popup = null;
  var S = function () { return G.App.store; };

  /* ---------- sesion ---------- */
  E.abrir = function (id, cont, o) {
    if (st) E.cerrar();
    var n = S().get('notas', id); if (!n) return;
    st = { id: id, cont: cont, o: o || {}, modo: Cfg.pref.modoEditor || 'visual', md: n.cuerpo || '', sucio: false, ultimo: n.cuerpo || '', snapTs: 0, snapMd: null, temporizador: 0, bTimer: 0 };
    if (n.cif && claves[id]) st.md = claves[id].texto;
    var v = S().lista('versiones', function (x) { return x.nota === id; }).sort(function (a, b) { return b.ts - a.ts; })[0];
    if (v) { st.snapTs = v.ts; st.snapMd = v.cuerpo; }
    pintar();
  };
  E.vaciar = function () { st = null; };
  E.cerrar = function () {
    if (!st) return;
    cerrarPopup(); E.guardarYa(true);
    var n = S().get('notas', st.id);
    if (n && !n.cif && n.cuerpo && n.cuerpo !== st.snapMd) snapshot(true);
    delete claves[st.id]; st = null;
  };
  E.activa = function () { return st ? st.id : null; };
  E.alExterno = function (ev) {
    if (!st || ev.id !== st.id) return; var n = S().get('notas', st.id); if (!n) return;
    var dentro = st.cont.contains(doc.activeElement);
    if (!n.cif && n.cuerpo !== st.ultimo && !st.sucio) { st.md = n.cuerpo; st.ultimo = n.cuerpo; if (st.area) pintarArea(true); }
    if (!(dentro && doc.activeElement.closest('.ed-cab') && /INPUT/.test(doc.activeElement.tagName))) { if (st.cab) { var nueva = construirCab(); st.cab.replaceWith(nueva); st.cab = nueva; } }
    if (st.ti && doc.activeElement !== st.ti && st.ti.value !== (n.titulo || '')) st.ti.value = n.titulo || '';
    pintarBack();
  };

  /* ---------- guardado ---------- */
  function onCambio() {
    if (!st) return; st.sucio = true; stEstado('Escribiendo…');
    clearTimeout(st.temporizador); st.temporizador = setTimeout(function () { E.guardarYa(); }, S().get('notas', st.id).cif ? 200 : 350);
    clearTimeout(st.bTimer); st.bTimer = setTimeout(borrador, 120);
  }
  function obtenerMd() {
    if (!st) return ''; if (st.modo === 'visual' && st.vis) return Md.deDom(st.vis); if (st.modo === 'md' && st.ta) return st.ta.value; return st.md;
  }
  function borrador() {
    if (!st) return; var n = S().get('notas', st.id); if (!n || n.cif) return;
    try { G.localStorage.setItem('notas_borrador', JSON.stringify({ id: st.id, titulo: st.ti ? st.ti.value : n.titulo, cuerpo: obtenerMd(), ts: Date.now() })); } catch (e) {}
  }
  E.guardarYa = function (cerrando) {
    if (!st || (!st.sucio && !cerrando)) return Promise.resolve();
    clearTimeout(st.temporizador); var id = st.id, n = S().get('notas', id); if (!n) return Promise.resolve();
    if (!st.sucio) return Promise.resolve();
    var md = obtenerMd(), titulo = st.ti ? st.ti.value : n.titulo; st.md = md; st.sucio = false;
    if (st.pal) st.pal.textContent = (md.trim() ? md.trim().split(/\s+/).length : 0) + ' palabras';
    if (n.cif) {
      var k = claves[id]; if (!k) return Promise.resolve(); k.texto = md;
      return C.cifrarCon(k.k, k.sal, k.it, md).then(function (cif) { S().set('notas', id, { cif: cif, titulo: titulo, modificada: Date.now() }); stEstado('Guardado y cifrado'); });
    }
    if (md !== n.cuerpo || titulo !== n.titulo) {
      if (!st.snapMd && n.cuerpo) { S().poner('versiones', { id: U.id(), nota: id, ts: n.modificada || Date.now(), titulo: n.titulo, cuerpo: n.cuerpo }); st.snapMd = n.cuerpo; st.snapTs = n.modificada; }
      S().set('notas', id, { cuerpo: md, titulo: titulo, modificada: Date.now() }); st.ultimo = md; G.App.titulos = null;
      if (Date.now() - st.snapTs > 300000) snapshot();
    }
    stEstado('Guardado'); try { G.localStorage.removeItem('notas_borrador'); } catch (e) {}
    return Promise.resolve();
  };
  function snapshot(forzar) {
    var n = S().get('notas', st.id); if (!n || n.cif || !n.cuerpo || (!forzar && n.cuerpo === st.snapMd)) return; if (n.cuerpo === st.snapMd) return;
    S().poner('versiones', { id: U.id(), nota: st.id, ts: Date.now(), titulo: n.titulo, cuerpo: n.cuerpo }); st.snapTs = Date.now(); st.snapMd = n.cuerpo;
    var vs = S().lista('versiones', function (x) { return x.nota === st.id; }).sort(function (a, b) { return b.ts - a.ts; });
    vs.slice(30).forEach(function (x) { S().borrar('versiones', x.id); });
  }
  function stEstado(t) { if (st && st.est) { st.est.textContent = t; } }
  E.recuperarBorrador = function () {
    var b; try { b = JSON.parse(G.localStorage.getItem('notas_borrador')); } catch (e) {} if (!b) return;
    var n = S().get('notas', b.id); try { G.localStorage.removeItem('notas_borrador'); } catch (e) {}
    if (!n || n.cif || (b.cuerpo === n.cuerpo && b.titulo === n.titulo) || b.ts < n.modificada) return;
    S().set('notas', b.id, { cuerpo: b.cuerpo, titulo: b.titulo, modificada: b.ts }); UI.aviso('Se recuperó el último texto no guardado de «' + (b.titulo || 'nota') + '»', { tipo: 'ok', ms: 5000 });
  };

  /* ---------- construccion ---------- */
  function pintar() {
    var n = S().get('notas', st.id), cont = st.cont; cont.textContent = '';
    var cab = h('div', { cls: 'cab' }, [
      h('button', { type: 'button', cls: 'btn ic-b solo-m', 'aria-label': 'Volver a la lista', 'data-f': 1, on: { click: function () { st.o.atras && st.o.atras(); } } }, [UI.icono('back')]),
      h('span', { cls: 'guarda', style: 'flex:1', 'aria-live': 'polite' }), 
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': n.fijada ? 'Desfijar' : 'Fijar nota', 'aria-pressed': String(!!n.fijada), 'data-f': 1, on: { click: function () { S().set('notas', st.id, { fijada: !S().get('notas', st.id).fijada }); } } }, [UI.icono('pin')]),
      h('button', { type: 'button', cls: 'btn ic-b', 'aria-label': 'Más acciones de la nota', 'data-f': 1, on: { click: function (e) { menuMas(e.currentTarget); } } }, [UI.icono('more')])]);
    st.est = cab.querySelector('.guarda'); st.barraSup = cab;
    st.ed = h('div', { cls: 'ed' }); st.cabecera = construirCab(); st.cab = st.cabecera;
    st.ti = h('input', { type: 'text', cls: 'ed-titulo', placeholder: 'Título', value: n.titulo || '', 'aria-label': 'Título de la nota', 'data-f': 1 });
    st.ti.addEventListener('input', onCambio); st.ti.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (st.vis) st.vis.focus(); else if (st.ta) st.ta.focus(); } });
    st.ti.addEventListener('blur', function () { E.guardarYa(); });
    st.zona = h('div', { style: 'display:flex;flex-direction:column;min-height:0;flex:1' });
    st.pie = h('div', { cls: 'ed-pie' });
    st.ed.appendChild(h('div', { style: 'padding:6px 14px 0' }, [st.ti])); st.ed.appendChild(st.cab); st.ed.appendChild(st.zona); st.ed.appendChild(st.pie);
    cont.appendChild(cab); cont.appendChild(st.ed);
    if (n.cif && !claves[st.id]) pintarBloqueada(); else pintarArea(); 
    if (!n.titulo && !n.cuerpo && !n.cif) setTimeout(function () { if (st && st.ti) st.ti.focus(); }, 60);
  }
  function construirCab() {
    var n = S().get('notas', st.id), lb = n.libreta && S().get('libretas', n.libreta);
    var tags = h('div', { cls: 'ed-tags' }), tin = h('input', { type: 'text', placeholder: '#etiqueta', 'aria-label': 'Añadir etiqueta', 'data-f': 1 });
    (n.etiquetas || []).forEach(function (e) { tags.appendChild(h('span', { cls: 'chip' }, ['#' + e, h('button', { type: 'button', 'aria-label': 'Quitar etiqueta ' + e, style: 'border:0;background:none;color:inherit;padding:0 0 0 2px', on: { click: function () { S().set('notas', st.id, { etiquetas: (S().get('notas', st.id).etiquetas || []).filter(function (x) { return x !== e; }) }); } } }, ['×'])])); });
    tin.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ',') && tin.value.trim()) { e.preventDefault(); var v = tin.value.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-'), cur = S().get('notas', st.id).etiquetas || []; if (cur.indexOf(v) < 0) S().set('notas', st.id, { etiquetas: cur.concat(v) }); setTimeout(function () { var x = st && st.cab && st.cab.querySelector('.ed-tags input'); if (x) x.focus(); }, 30); } });
    tags.appendChild(tin);
    return h('div', { cls: 'ed-cab' }, [h('div', { cls: 'ed-meta' }, [
      h('button', { type: 'button', cls: 'btn pq', 'data-f': 1, 'aria-label': 'Libreta: ' + (lb ? lb.nombre : 'ninguna'), on: { click: function () { G.VistaNotas.elegirLibreta(S().get('notas', st.id).libreta, function (l) { S().set('notas', st.id, { libreta: l }); }); } } }, [UI.icono('folder'), h('span', { txt: lb ? lb.nombre : 'Sin libreta' })]),
      n.color ? h('span', { cls: 'chip', style: 'background:' + n.color + ';color:#fff', txt: 'color' }) : null, n.cif ? h('span', { cls: 'chip g' }, [UI.icono('lock'), ' bloqueada']) : null,
      h('span', { txt: 'Editada ' + UI.fmtRel(n.modificada) }), tags])]);
  }
  function pintarBack() { if (!st || !st.back) return; }

  function pintarBloqueada() {
    st.zona.textContent = ''; st.pie.textContent = '';
    var inp = h('input', { type: 'password', cls: 'campo', placeholder: 'Contraseña', 'aria-label': 'Contraseña de la nota', autocomplete: 'off', 'data-f': 1 }), err = h('p', { cls: 'err', role: 'alert' });
    function abrir() {
      var n = S().get('notas', st.id); err.textContent = 'Descifrando…';
      C.derivar(inp.value, U.deB64(n.cif.s), n.cif.it).then(function (k) { return C.descifrarCon(k, n.cif).then(function (t) { claves[st.id] = { k: k, sal: U.deB64(n.cif.s), it: n.cif.it, texto: t }; st.md = t; st.ultimo = ''; pintarArea(); }); }).catch(function () { err.textContent = 'Contraseña incorrecta'; inp.select(); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') abrir(); });
    st.zona.appendChild(h('div', { cls: 'bloqueada' }, [h('div', { style: 'font-size:2.5rem' }, [UI.icono('lock')]), h('h2', { txt: 'Nota bloqueada' }), h('p', { cls: 'ayuda', txt: 'Su contenido está cifrado (AES-GCM). Introduce la contraseña para verlo.' }), inp, err, h('div', { cls: 'fila', style: 'justify-content:center;margin-top:8px' }, [h('button', { type: 'button', cls: 'btn prim', txt: 'Desbloquear', 'data-f': 1, on: { click: abrir } })])]));
    setTimeout(function () { inp.focus(); }, 50);
  }

  function pintarArea(conservar) {
    var n = S().get('notas', st.id); if (!n) return;
    var y = st.area ? st.area.scrollTop : 0;
    st.zona.textContent = ''; st.vis = st.ta = st.prev = null;
    if (st.modo === 'visual') st.zona.appendChild(barra());
    var ancho = G.matchMedia('(min-width: 1100px)').matches;
    st.area = h('div', { cls: 'ed-area' + (st.modo === 'md' && ancho ? ' dividida' : '') });
    if (st.modo === 'visual') {
      st.vis = h('div', { cls: 'ed-vis md', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Contenido de la nota', spellcheck: 'true', 'data-lang': 'es' });
      st.vis.innerHTML = Md.aHtml(st.md, G.App.mdCtx) || '<p><br></p>';
      ligarVisual(st.vis); st.area.appendChild(st.vis);
    } else if (st.modo === 'md') {
      st.ta = h('textarea', { cls: 'ed-md', 'aria-label': 'Markdown de la nota', spellcheck: 'false', 'data-f': 1 }); st.ta.value = st.md;
      ligarMd(st.ta); st.area.appendChild(st.ta);
      if (ancho) { st.prev = h('div', { cls: 'ed-prev md' }); st.prev.innerHTML = Md.aHtml(st.md, G.App.mdCtx); ligarPrev(st.prev, true); st.area.appendChild(st.prev); }
    } else {
      st.prev = h('div', { cls: 'ed-prev md' }); st.prev.innerHTML = Md.aHtml(st.md, G.App.mdCtx) || '<p class="ayuda">Nota vacía</p>'; ligarPrev(st.prev, false); st.area.appendChild(st.prev);
    }
    var bl = backlinks(n); if (bl) st.area.appendChild(bl);
    st.zona.appendChild(st.area); pintarPie(); if (conservar) st.area.scrollTop = y;
  }
  function pintarPie() {
    st.pie.textContent = '';
    var tabs = h('div', { cls: 'seg', role: 'tablist', 'aria-label': 'Modo de edición' }, [['visual', 'Editar'], ['md', 'Markdown'], ['vista', 'Vista']].map(function (x) {
      return h('button', { type: 'button', cls: 'btn pq', role: 'tab', 'aria-selected': String(st.modo === x[0]), 'aria-pressed': String(st.modo === x[0]), 'data-f': 1, txt: x[1], on: { click: function () { cambiarModo(x[0]); } } });
    }));
    var palabras = (st.md || '').trim() ? st.md.trim().split(/\s+/).length : 0;
    st.pal = h('span', { txt: palabras + ' palabras' }); st.pie.appendChild(tabs); st.pie.appendChild(st.pal);
    st.pie.appendChild(h('button', { type: 'button', cls: 'btn pq plano', 'data-f': 1, on: { click: historial } }, [UI.icono('history'), h('span', { txt: 'Historial' })]));
  }
  function cambiarModo(m) {
    if (m === st.modo) return; st.md = obtenerMd(); st.modo = m; Cfg.setPref('modoEditor', m); pintarArea();
    if (m === 'visual' && st.vis) st.vis.focus(); else if (m === 'md' && st.ta) st.ta.focus();
  }

  /* ---------- barra de formato ---------- */
  function barra() {
    var b = h('div', { cls: 'ed-barra', role: 'toolbar', 'aria-label': 'Formato' });
    function add(txt, aria, fn, ic) {
      var x = h('button', { type: 'button', cls: 'btn', 'aria-label': aria, title: aria, 'data-f': 1 }, ic ? [UI.icono(ic)] : [h('span', { txt: txt })]);
      x.addEventListener('mousedown', function (e) { e.preventDefault(); }); x.addEventListener('click', function () { if (st.vis) { if (doc.activeElement !== st.vis) st.vis.focus(); fn(); onCambio(); } }); b.appendChild(x);
    }
    function sep() { b.appendChild(h('span', { cls: 'sep' })); }
    add('', 'Deshacer', function () { doc.execCommand('undo'); }, 'undo'); sep();
    add('B', 'Negrita (Ctrl+B)', function () { doc.execCommand('bold'); }); add('I', 'Cursiva (Ctrl+I)', function () { doc.execCommand('italic'); }); add('S', 'Tachado', function () { doc.execCommand('strikeThrough'); });
    add('▮', 'Resaltar (Ctrl+Mayús+H)', function () { marca('mark'); }); add('</>', 'Código en línea', function () { marca('code'); }); sep();
    add('H1', 'Título 1', function () { titulo('h1'); }); add('H2', 'Título 2', function () { titulo('h2'); }); add('H3', 'Título 3', function () { titulo('h3'); }); sep();
    add('•', 'Lista con viñetas', function () { lista('ul'); }); add('1.', 'Lista numerada', function () { lista('ol'); }); add('☑', 'Lista de casillas', casillas);
    add('❝', 'Cita', cita); add('{ }', 'Bloque de código', bloqueCodigo); add('▦', 'Tabla', tabla); add('—', 'Separador', function () { doc.execCommand('insertHorizontalRule'); }); sep();
    add('', 'Enlace (Ctrl+Mayús+K)', enlace, 'link'); add('', 'Insertar imagen', function () { G.Adjuntos.elegir(insertarImg); }, 'image'); add('[[ ]]', 'Enlace a otra nota', function () { doc.execCommand('insertText', false, '[['); actualizarPopup(); });
    return b;
  }
  function bloqueActual() {
    var sel = G.getSelection(); if (!sel.rangeCount) return null; var n = sel.anchorNode;
    while (n && n !== st.vis) { if (n.nodeType === 1 && /^(P|DIV|H[1-6]|LI|PRE|BLOCKQUOTE|TD|TH)$/.test(n.tagName)) return n; n = n.parentNode; }
    return null;
  }
  function dentroDe(sel) { var n = G.getSelection().anchorNode; while (n && n !== st.vis) { if (n.nodeType === 1 && n.matches && n.matches(sel)) return n; n = n.parentNode; } return null; }
  /* conversion manual de bloques (mas fiable que execCommand): tag = h1-h6 | p | blockquote | ul | ol | tk */
  function convertir(bl, tag, marca) {
    var sel = G.getSelection(), an = sel.anchorNode, ao = sel.anchorOffset, nuevo, interior;
    if (/^h[1-6]$|^p$/.test(tag)) { nuevo = doc.createElement(tag); interior = nuevo; }
    else if (tag === 'blockquote') { nuevo = doc.createElement('blockquote'); interior = doc.createElement('p'); nuevo.appendChild(interior); }
    else { nuevo = doc.createElement(tag === 'ol' ? 'ol' : 'ul'); interior = doc.createElement('li'); nuevo.appendChild(interior); if (tag === 'tk') { interior.setAttribute('data-tk', marca ? '1' : '0'); nuevo.className = 'tareas'; } }
    while (bl.firstChild) interior.appendChild(bl.firstChild);
    if (!interior.textContent && !interior.querySelector('br,img')) interior.appendChild(doc.createElement('br'));
    bl.replaceWith(nuevo);
    var r = doc.createRange();
    if (an && nuevo.contains(an)) { try { r.setStart(an, Math.min(ao, an.nodeType === 3 ? an.length : an.childNodes.length)); } catch (e) { r.selectNodeContents(interior); r.collapse(false); } } else { r.selectNodeContents(interior); r.collapse(false); }
    r.collapse(true); sel.removeAllRanges(); sel.addRange(r); return nuevo;
  }
  function bloqueSuelto() { var b = bloqueActual(); return b && b.parentNode === st.vis && /^(P|DIV|H[1-6])$/.test(b.tagName) ? b : null; }
  function titulo(t) { var b = bloqueSuelto(); if (!b) return; convertir(b, b.tagName.toLowerCase() === t ? 'p' : t); }
  function cita() {
    var bq = dentroDe('blockquote');
    if (bq) { var f = doc.createDocumentFragment(); while (bq.firstChild) f.appendChild(bq.firstChild); bq.replaceWith(f); return; }
    var b = bloqueSuelto(); if (b) convertir(b, 'blockquote');
  }
  function lista(tipo) { var b = bloqueSuelto(); if (b && !dentroDe('li')) convertir(b, tipo); else doc.execCommand(tipo === 'ol' ? 'insertOrderedList' : 'insertUnorderedList'); }
  function casillas() {
    var li = dentroDe('li');
    if (li && li.hasAttribute('data-tk')) { li.removeAttribute('data-tk'); var ul = li.parentNode; if (!ul.querySelector('li[data-tk]')) ul.classList.remove('tareas'); return; }
    if (!li) { var b = bloqueSuelto(); if (b) convertir(b, 'tk'); else { doc.execCommand('insertUnorderedList'); li = dentroDe('li'); if (li) { li.setAttribute('data-tk', '0'); li.parentNode.classList.add('tareas'); } } return; }
    li.setAttribute('data-tk', '0'); li.parentNode.classList.add('tareas');
  }
  function marca(tag) {
    var sel = G.getSelection(); if (!sel.rangeCount) return; var ex = dentroDe(tag);
    if (ex) { var p = ex.parentNode; while (ex.firstChild) p.insertBefore(ex.firstChild, ex); ex.remove(); return; }
    if (sel.isCollapsed) return; var r = sel.getRangeAt(0), el = doc.createElement(tag);
    try { r.surroundContents(el); } catch (e) { el.appendChild(r.extractContents()); r.insertNode(el); }
    sel.removeAllRanges(); var nr = doc.createRange(); nr.selectNodeContents(el); sel.addRange(nr);
  }
  function bloqueCodigo() {
    var pre = dentroDe('pre'), sel = G.getSelection();
    if (pre) { var p = doc.createElement('p'); p.textContent = pre.textContent; pre.replaceWith(p); return; }
    var bl = bloqueActual(), txt = !sel.isCollapsed ? sel.toString() : (bl ? bl.textContent : ''), np = doc.createElement('pre'), c = doc.createElement('code'); c.textContent = txt; np.appendChild(c);
    if (bl && bl.parentNode === st.vis && (sel.isCollapsed || bl.textContent === txt)) bl.replaceWith(np); else doc.execCommand('insertHTML', false, '<pre><code>' + U.esc(txt) + '</code></pre>');
    if (!np.nextSibling && np.parentNode === st.vis) st.vis.appendChild(doc.createElement('p')).innerHTML = '<br>';
    var r = doc.createRange(); r.selectNodeContents(c); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
  }
  function tabla() {
    var f = function (t) { return '<tr>' + [1, 2, 3].map(function () { return '<' + t + '><br></' + t + '>'; }).join('') + '</tr>'; };
    doc.execCommand('insertHTML', false, '<table><thead>' + f('th') + '</thead><tbody>' + f('td') + f('td') + '</tbody></table><p><br></p>');
  }
  function enlace() {
    var sel = G.getSelection(), r = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null, txt = sel.toString();
    UI.preguntar('Insertar enlace', 'Dirección (https://…)', 'https://', function (url) {
      url = url.trim(); if (!/^(https?:|mailto:|tel:)/i.test(url)) url = 'https://' + url;
      st.vis.focus(); if (r) { var s2 = G.getSelection(); s2.removeAllRanges(); s2.addRange(r); }
      if (txt) doc.execCommand('createLink', false, url); else doc.execCommand('insertHTML', false, '<a href="' + U.esc(url) + '">' + U.esc(url) + '</a>&nbsp;');
      onCambio();
    }, { txt: 'Insertar' });
  }
  function insertarImg(a) {
    if (!st) return;
    if (st.modo === 'md' && st.ta) { insertarEn(st.ta, '![' + (a.nombre || '') + '](adj:' + a.id + ')\n'); return; }
    if (!st.vis) return; st.vis.focus();
    doc.execCommand('insertHTML', false, '<img data-adj="' + a.id + '" src="' + U.esc(a.url) + '" alt="' + U.esc((a.nombre || '').replace(/\.\w+$/, '')) + '"><p><br></p>'); onCambio();
  }
  function insertarEn(ta, t) { var s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + t + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + t.length; ta.dispatchEvent(new Event('input')); }

  /* ---------- eventos del editor visual ---------- */
  function ligarVisual(vis) {
    vis.addEventListener('focus', function () { try { doc.execCommand('defaultParagraphSeparator', false, 'p'); doc.execCommand('styleWithCSS', false, false); } catch (e) {} });
    vis.addEventListener('input', function (e) { inline(e); actualizarPopup(); onCambio(); });
    vis.addEventListener('blur', function () { setTimeout(function () { if (!popup) E.guardarYa(); }, 150); });
    vis.addEventListener('keydown', teclasVisual);
    vis.addEventListener('click', clicVisual);
    vis.addEventListener('paste', function (e) {
      var cd = e.clipboardData; if (!cd) return;
      var imgs = Array.prototype.filter.call(cd.files || [], function (f) { return /^image\//.test(f.type); });
      if (imgs.length) { e.preventDefault(); imgs.forEach(function (f) { G.Adjuntos.agregar(f).then(insertarImg, function (er) { UI.aviso(er.message, { tipo: 'error' }); }); }); return; }
      var t = cd.getData('text/plain'); if (!t) return; e.preventDefault();
      if (/\n/.test(t) || /(^|\n)(#{1,6} |[-*+] |\d+\. |> |```)|\*\*|\[\[|\]\(/.test(t)) doc.execCommand('insertHTML', false, Md.aHtml(t, G.App.mdCtx)); else doc.execCommand('insertText', false, t);
    });
    vis.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.types, function (t) { return t === 'Files'; })) e.preventDefault(); });
    vis.addEventListener('drop', function (e) {
      var fs = Array.prototype.filter.call(e.dataTransfer.files || [], function (f) { return /^image\//.test(f.type); }); if (!fs.length) return; e.preventDefault();
      fs.forEach(function (f) { G.Adjuntos.agregar(f).then(insertarImg); });
    });
  }
  function clicVisual(e) {
    var a = e.target.closest('a');
    if (a && st.vis.contains(a)) {
      e.preventDefault();
      if (a.classList.contains('wl')) { abrirEnlace(a.getAttribute('data-wl')); return; }
      var u = a.getAttribute('href'); if (u && /^(https?:|mailto:|tel:)/i.test(u)) G.open(u, '_blank', 'noopener'); return;
    }
    var li = e.target.closest('li[data-tk]');
    if (li && st.vis.contains(li) && e.clientX - li.getBoundingClientRect().left < 26 && e.target === li) {
      li.setAttribute('data-tk', li.getAttribute('data-tk') === '1' ? '0' : '1'); onCambio(); e.preventDefault();
    }
  }
  function abrirEnlace(titulo) {
    var id = G.App.mdCtx.nota(titulo);
    if (id) { E.guardarYa(); G.App.abrir('nota', id); return; }
    UI.confirmar('Nota inexistente', 'No existe una nota llamada «' + titulo + '». ¿Crearla?', function () { var n = S().poner('notas', Mo.nota({ titulo: titulo })); G.App.titulos = null; G.App.abrir('nota', n.id); }, { txt: 'Crear nota' });
  }
  function textoAntes() {
    var sel = G.getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return null; var n = sel.anchorNode; if (!n || n.nodeType !== 3) return null;
    return { nodo: n, pos: sel.anchorOffset, txt: n.data.slice(0, sel.anchorOffset) };
  }
  function inline(e) {
    if (e.inputType !== 'insertText' || !/[*`~=]/.test(e.data || '')) return;
    var t = textoAntes(); if (!t || dentroDe('pre,code')) return; var m, tag;
    var reglas = [[/\*\*([^*\s][^*]*?)\*\*$/, 'strong'], [/(^|[^*])\*([^*\s][^*]*?)\*$/, 'em'], [/~~([^~]+)~~$/, 's'], [/==([^=]+)==$/, 'mark'], [/`([^`]+)`$/, 'code']];
    for (var i = 0; i < reglas.length; i++) {
      m = reglas[i][0].exec(t.txt); if (!m) continue; tag = reglas[i][1];
      var cuerpo = m[m.length - 1], ini = t.pos - (m[0].length - (m[1] !== undefined && m.length > 2 ? m[1].length : 0));
      var r = doc.createRange(); r.setStart(t.nodo, ini); r.setEnd(t.nodo, t.pos); r.deleteContents();
      var el = doc.createElement(tag); el.textContent = cuerpo; r.insertNode(el);
      var z = doc.createTextNode('​'); el.after(z); var sel = G.getSelection(), nr = doc.createRange(); nr.setStart(z, 1); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); return;
    }
  }
  function teclasVisual(e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (popup && popupTecla(e)) return;
    if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); E.guardarYa(); UI.aviso('Nota guardada', { ms: 1200 }); return; }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); marca('mark'); onCambio(); return; }
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); enlace(); return; }
    if (e.key === ' ' && !ctrl) { if (atajoEspacio(e)) return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      var t = textoAntes(), bl = bloqueActual();
      if (t && bl && bl.parentNode === st.vis) {
        var tx = bl.textContent.trim();
        if (tx === '```' || /^```\w+$/.test(tx)) { e.preventDefault(); var np = doc.createElement('pre'), c = doc.createElement('code'); c.innerHTML = '<br>'; np.appendChild(c); bl.replaceWith(np); var r = doc.createRange(); r.selectNodeContents(c); r.collapse(true); var sel = G.getSelection(); sel.removeAllRanges(); sel.addRange(r); onCambio(); return; }
        if (/^(---|\*\*\*|___)$/.test(tx)) { e.preventDefault(); var hr = doc.createElement('hr'); bl.replaceWith(hr); var p = doc.createElement('p'); p.innerHTML = '<br>'; hr.after(p); var r2 = doc.createRange(); r2.setStart(p, 0); r2.collapse(true); var s2 = G.getSelection(); s2.removeAllRanges(); s2.addRange(r2); onCambio(); return; }
      }
      var bq = dentroDe('blockquote');
      if (bq && bl && bl.parentNode === bq && !bl.textContent.trim()) { e.preventDefault(); var pn = doc.createElement('p'); pn.innerHTML = '<br>'; bq.after(pn); bl.remove(); if (!bq.textContent.trim() && !bq.querySelector('img')) bq.remove(); var rq = doc.createRange(); rq.setStart(pn, 0); rq.collapse(true); var sq = G.getSelection(); sq.removeAllRanges(); sq.addRange(rq); onCambio(); return; }
      var pre = dentroDe('pre');
      if (pre) {
        e.preventDefault(); var sl = G.getSelection(), cod = pre.querySelector('code') || pre, rb = doc.createRange(), ra = doc.createRange();
        rb.selectNodeContents(cod); rb.setEnd(sl.anchorNode, sl.anchorOffset); ra.selectNodeContents(cod); ra.setStart(sl.anchorNode, sl.anchorOffset);
        var antes = rb.toString(), despues = ra.toString();
        if (/\n$/.test(antes) && (despues === '' || despues === '\n')) {
          cod.textContent = cod.textContent.replace(/\n+$/, ''); var np2 = doc.createElement('p'); np2.innerHTML = '<br>'; pre.after(np2);
          var r3 = doc.createRange(); r3.setStart(np2, 0); r3.collapse(true); sl.removeAllRanges(); sl.addRange(r3);
        } else {
          var rr = sl.getRangeAt(0); rr.deleteContents(); var nl2 = doc.createTextNode('\n'); rr.insertNode(nl2);
          if (despues === '') nl2.after(doc.createTextNode('\n'));
          var r5 = doc.createRange(); r5.setStartAfter(nl2); r5.collapse(true); sl.removeAllRanges(); sl.addRange(r5);
        }
        onCambio(); return;
      }
      var li = dentroDe('li');
      if (li && li.hasAttribute('data-tk') && li.textContent.trim()) {
        e.preventDefault(); var nl = doc.createElement('li'); nl.setAttribute('data-tk', '0'); nl.innerHTML = '<br>'; li.after(nl); var r4 = doc.createRange(); r4.setStart(nl, 0); r4.collapse(true); var s4 = G.getSelection(); s4.removeAllRanges(); s4.addRange(r4); onCambio(); return;
      }
    }
    if (e.key === 'Tab') {
      var celda = dentroDe('td,th');
      if (celda) { e.preventDefault(); var cs = Array.prototype.slice.call(celda.closest('table').querySelectorAll('th,td')), i = cs.indexOf(celda) + (e.shiftKey ? -1 : 1);
        if (i >= cs.length) { var tr = celda.parentNode, nueva = doc.createElement('tr'); for (var k = 0; k < tr.children.length; k++) nueva.innerHTML += '<td><br></td>'; (celda.closest('table').tBodies[0] || celda.closest('table')).appendChild(nueva); cs = Array.prototype.slice.call(celda.closest('table').querySelectorAll('th,td')); }
        if (cs[i]) { var rc = doc.createRange(); rc.selectNodeContents(cs[i]); rc.collapse(false); var sc = G.getSelection(); sc.removeAllRanges(); sc.addRange(rc); } onCambio(); return; }
      if (dentroDe('li')) { e.preventDefault(); doc.execCommand(e.shiftKey ? 'outdent' : 'indent'); onCambio(); return; }
      if (dentroDe('pre')) { e.preventDefault(); doc.execCommand('insertText', false, '  '); return; }
    }
  }
  function atajoEspacio(e) {
    var t = textoAntes(), bl = bloqueActual(); if (!t || !bl || bl.tagName === 'PRE' || bl.tagName === 'TD' || bl.tagName === 'TH') return false;
    var pref = bl.textContent.slice(0, bl.textContent.indexOf(t.txt) >= 0 ? t.txt.length : 0); var r0 = doc.createRange(); r0.setStart(bl, 0); r0.setEnd(t.nodo, t.pos); var antes = r0.toString();
    if (antes !== bl.textContent.slice(0, antes.length) || antes.length > 6) return false;
    var m, cmd = null;
    if ((m = /^(#{1,3})$/.exec(antes))) cmd = function () { convertir(bl, 'h' + m[1].length); };
    else if (/^[-*+]$/.test(antes)) cmd = function () { convertir(bl, 'ul'); };
    else if (/^\d+[.)]$/.test(antes)) cmd = function () { convertir(bl, 'ol'); };
    else if (antes === '>') cmd = function () { convertir(bl, 'blockquote'); };
    else if (/^\[\s?\]$/.test(antes)) cmd = function () { convertir(bl, 'tk', false); };
    else if (/^\[[xX]\]$/.test(antes)) cmd = function () { convertir(bl, 'tk', true); };
    if (!cmd) return false;
    if (bl.parentNode !== st.vis) return false;
    e.preventDefault(); var r = doc.createRange(); r.setStart(bl, 0); r.setEnd(t.nodo, t.pos); r.deleteContents(); cmd(); onCambio(); return true;
  }

  /* ---------- modo Markdown / vista ---------- */
  function ligarMd(ta) {
    ta.addEventListener('input', function () { onCambio(); if (st.prev) st.prev.innerHTML = Md.aHtml(ta.value, G.App.mdCtx); actualizarPopup(); });
    ta.addEventListener('blur', function () { setTimeout(function () { if (!popup) E.guardarYa(); }, 150); });
    ta.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey; if (popup && popupTecla(e)) return;
      if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); E.guardarYa(); UI.aviso('Nota guardada', { ms: 1200 }); }
      else if (ctrl && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i')) { e.preventDefault(); var m = e.key.toLowerCase() === 'b' ? '**' : '*', s = ta.selectionStart, f = ta.selectionEnd; ta.value = ta.value.slice(0, s) + m + ta.value.slice(s, f) + m + ta.value.slice(f); ta.selectionStart = s + m.length; ta.selectionEnd = f + m.length; ta.dispatchEvent(new Event('input')); }
      else if (e.key === 'Tab') { e.preventDefault(); insertarEn(ta, '  '); }
    });
    ta.addEventListener('paste', function (e) {
      var fs = Array.prototype.filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
      if (fs.length) { e.preventDefault(); fs.forEach(function (f) { G.Adjuntos.agregar(f).then(insertarImg); }); }
    });
  }
  function ligarPrev(p, soloLeer) {
    p.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (a) { e.preventDefault(); if (a.classList.contains('wl')) abrirEnlace(a.getAttribute('data-wl')); else if (a.href) G.open(a.href, '_blank', 'noopener'); return; }
      var li = e.target.closest('li[data-tk]');
      if (li && !soloLeer && e.clientX - li.getBoundingClientRect().left < 26) {
        var todos = Array.prototype.slice.call(p.querySelectorAll('li[data-tk]')), idx = todos.indexOf(li), n = -1, md = st.ta ? st.ta.value : st.md, enCodigo = false;
        md = md.split('\n').map(function (l) { if (/^\s*(```|~~~)/.test(l)) enCodigo = !enCodigo; if (enCodigo) return l; return l.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/, function (mm, a1, c) { n++; return n === idx ? a1 + '[' + (c === ' ' ? 'x' : ' ') + ']' : mm; }); }).join('\n');
        if (st.ta) { st.ta.value = md; st.ta.dispatchEvent(new Event('input')); } else { st.md = md; st.sucio = true; onCambio(); p.innerHTML = Md.aHtml(md, G.App.mdCtx); ligarPrevDentro(p); }
      } else if (li && soloLeer === false) { /* nada */ }
    });
  }
  function ligarPrevDentro() {}
  function insertarMdEn(ta, t) { insertarEn(ta, t); }

  /* ---------- enlaces [[ ]] con autocompletado ---------- */
  function contextoPopup() {
    if (st.modo === 'visual') { var t = textoAntes(); if (!t) return null; var m = /\[\[([^\[\]\n]{0,60})$/.exec(t.txt); if (!m) return null; return { q: m[1], inicio: m.index, t: t, rect: G.getSelection().getRangeAt(0).getBoundingClientRect() }; }
    if (st.modo === 'md' && st.ta) { var ta = st.ta, pos = ta.selectionStart, antes = ta.value.slice(0, pos), m2 = /\[\[([^\[\]\n]{0,60})$/.exec(antes); if (!m2) return null; var r = ta.getBoundingClientRect(); return { q: m2[1], inicio: m2.index, pos: pos, rect: { left: r.left + 20, bottom: r.top + 60 } }; }
    return null;
  }
  function actualizarPopup() {
    var c = st && contextoPopup(); if (!c) { cerrarPopup(); return; }
    var q = U.norm(c.q), notas = S().lista('notas', function (n) { return !n.papelera && n.id !== st.id && n.titulo && (!q || U.norm(n.titulo).indexOf(q) >= 0); }).sort(function (a, b) { return b.modificada - a.modificada; }).slice(0, 7);
    var items = notas.map(function (n) { return { titulo: n.titulo, id: n.id }; });
    if (c.q.trim() && !notas.some(function (n) { return U.norm(n.titulo) === q; })) items.push({ titulo: c.q.trim(), crear: true });
    if (!items.length) { cerrarPopup(); return; }
    if (!popup) { popup = { el: h('div', { cls: 'pop', role: 'listbox', 'aria-label': 'Enlazar nota' }), sel: 0 }; doc.body.appendChild(popup.el); }
    popup.items = items; popup.c = c; popup.sel = Math.min(popup.sel, items.length - 1); popup.el.textContent = '';
    items.forEach(function (it, i) {
      var b = h('button', { type: 'button', role: 'option', cls: i === popup.sel ? 'sel' : '', txt: it.crear ? 'Crear «' + it.titulo + '»' : it.titulo });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); aceptarPopup(it); }); popup.el.appendChild(b);
    });
    popup.el.style.left = Math.min(c.rect.left, G.innerWidth - 250) + 'px'; popup.el.style.top = Math.min((c.rect.bottom || 0) + 6, G.innerHeight - 200) + 'px';
  }
  function cerrarPopup() { if (popup) { popup.el.remove(); popup = null; } }
  function popupTecla(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); popup.sel = (popup.sel + (e.key === 'ArrowDown' ? 1 : -1) + popup.items.length) % popup.items.length; actualizarPopup(); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); aceptarPopup(popup.items[popup.sel]); return true; }
    if (e.key === 'Escape') { e.preventDefault(); cerrarPopup(); return true; }
    return false;
  }
  function aceptarPopup(it) {
    var c = popup.c; cerrarPopup(); var titulo = it.titulo;
    if (it.crear) { S().poner('notas', Mo.nota({ titulo: titulo })); G.App.titulos = null; }
    if (st.modo === 'visual') {
      st.vis.focus(); var r = doc.createRange(); r.setStart(c.t.nodo, c.inicio); r.setEnd(c.t.nodo, c.t.pos); r.deleteContents();
      var a = doc.createElement('a'); a.className = 'wl'; a.href = '#'; a.setAttribute('data-wl', titulo); a.textContent = '[[' + titulo + ']]'; var id = G.App.mdCtx.nota(titulo); if (id) a.setAttribute('data-id', id);
      r.insertNode(a); var z = doc.createTextNode(' '); a.after(z); var sel = G.getSelection(), nr = doc.createRange(); nr.setStart(z, 1); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr);
    } else if (st.ta) {
      var ta = st.ta; ta.value = ta.value.slice(0, c.inicio) + '[[' + titulo + ']] ' + ta.value.slice(c.pos); ta.selectionStart = ta.selectionEnd = c.inicio + titulo.length + 5; ta.focus(); ta.dispatchEvent(new Event('input'));
    }
    onCambio();
  }

  /* ---------- backlinks ---------- */
  function backlinks(n) {
    if (!n.titulo || !n.titulo.trim() || n.cif) return null;
    var k = U.norm(n.titulo).trim(), lista = S().lista('notas', function (x) { return x.id !== n.id && !x.papelera && !x.cif && x.cuerpo && x.cuerpo.indexOf('[[') >= 0 && Md.enlaces(x.cuerpo).some(function (t) { return U.norm(t).trim() === k; }); });
    var salientes = Md.enlaces(n.cuerpo || '');
    if (!lista.length && !salientes.length) return null;
    var cont = h('aside', { cls: 'backlinks', 'aria-label': 'Enlaces entre notas' });
    if (lista.length) { cont.appendChild(h('b', { txt: 'Enlazada desde (' + lista.length + ')' })); lista.forEach(function (x) { cont.appendChild(h('div', {}, [h('button', { type: 'button', cls: 'btn pq plano', 'data-f': 1, on: { click: function () { E.guardarYa(); G.App.abrir('nota', x.id); } } }, [UI.icono('link'), h('span', { txt: G.VistaNotas.tituloDe(x) })])])); }); }
    return cont;
  }

  /* ---------- menu, bloqueo, historial ---------- */
  function menuMas(ancla) {
    var n = S().get('notas', st.id);
    UI.menu(ancla, [
      { txt: 'Color…', icono: 'sun', fn: function () { G.VistaTareas.elegirColor(n.color, function (c) { S().set('notas', st.id, { color: c }); }); } },
      { txt: n.archivada ? 'Sacar del archivo' : 'Archivar', icono: 'archive', fn: function () { var id = st.id; E.guardarYa(); S().set('notas', id, { archivada: !n.archivada }); G.App.cerrarDetalle(); } },
      { txt: n.cif ? 'Quitar bloqueo…' : 'Bloquear con contraseña…', icono: 'lock', fn: function () { n.cif ? quitarBloqueo() : bloquear(); } },
      { txt: 'Historial de versiones', icono: 'history', fn: historial },
      { txt: 'Compartir en tiempo real…', icono: 'share', fn: function () { E.guardarYa(); G.Colab.compartir('nota', st.id); } },
      { txt: 'Copiar como texto', icono: 'copy', fn: function () { UI.copiar((n.titulo ? n.titulo + '\n\n' : '') + obtenerMd()).then(function () { UI.aviso('Copiada como texto', { tipo: 'ok' }); }); } },
      { txt: 'Descargar .md', icono: 'download', fn: function () { UI.descargar((n.titulo || 'nota').replace(/[\\/:*?"<>|]/g, '-') + '.md', (n.titulo ? '# ' + n.titulo + '\n\n' : '') + obtenerMd(), 'text/markdown'); } },
      { txt: 'Imprimir / PDF', icono: 'download', fn: function () { G.print(); } },
      { sep: 1 }, { txt: 'A la papelera', icono: 'trash', peligro: 1, fn: function () { G.VistaNotas.eliminar(st.id); } }
    ], { derecha: true });
  }
  function bloquear() {
    UI.dialogo({ titulo: 'Bloquear nota', ancho: 440, cuerpo: h('div', {}, [h('p', { txt: 'El contenido se cifrará con AES-GCM (clave derivada con PBKDF2, 210 000 iteraciones). El título y las etiquetas siguen siendo visibles.' }), h('p', { cls: 'err', txt: 'No existe recuperación: si olvidas la contraseña, el contenido se pierde para siempre. El historial de versiones se desactiva para esta nota.' })]), acciones: [{ txt: 'Cancelar' }, { txt: 'Continuar', cls: 'prim', fn: function () { setTimeout(pedirClave, 20); } }] });
    function pedirClave() {
      UI.preguntar('Contraseña de la nota', 'Contraseña (mín. 6 caracteres)', '', function (pw) {
        var sal = C.nuevaSal(), id = st.id; E.guardarYa(); var md = obtenerMd();
        C.derivar(pw, sal, C.ITER).then(function (k) { return C.cifrarCon(k, sal, C.ITER, md).then(function (cif) {
          claves[id] = { k: k, sal: sal, it: C.ITER, texto: md }; S().lista('versiones', function (v) { return v.nota === id; }).forEach(function (v) { S().borrar('versiones', v.id); });
          S().set('notas', id, { cif: cif, cuerpo: '', modificada: Date.now() }); st.ultimo = ''; UI.aviso('Nota bloqueada', { tipo: 'ok' });
        }); });
      }, { tipo: 'password', repetir: true, min: 6, txt: 'Bloquear' });
    }
  }
  function quitarBloqueo() {
    if (!claves[st.id]) return;
    UI.confirmar('Quitar bloqueo', 'La nota volverá a guardarse sin cifrar.', function () { var id = st.id, md = claves[id].texto; S().set('notas', id, { cif: null, cuerpo: md, modificada: Date.now() }); st.ultimo = md; UI.aviso('Bloqueo quitado'); });
  }
  function historial() {
    var n = S().get('notas', st.id); if (n.cif) { UI.aviso('Las notas bloqueadas no guardan historial', { tipo: 'error' }); return; }
    E.guardarYa(); snapshot();
    var vs = S().lista('versiones', function (x) { return x.nota === st.id; }).sort(function (a, b) { return b.ts - a.ts; });
    var prev = h('div', { cls: 'md', style: 'border:1px solid var(--linea);border-radius:8px;padding:8px 12px;margin-top:10px;max-height:40vh;overflow:auto' }), btnR = h('button', { type: 'button', cls: 'btn prim', txt: 'Restaurar esta versión', hidden: true, 'data-f': 1 }), sel = null;
    var lista = h('div', {}, vs.length ? vs.map(function (v) {
      return h('button', { type: 'button', cls: 'menu-i', 'data-f': 1, on: { click: function () { sel = v; prev.innerHTML = Md.aHtml(v.cuerpo, G.App.mdCtx) || '<p class="ayuda">(vacía)</p>'; btnR.hidden = false; } } }, [UI.icono('history'), h('span', { txt: new Date(v.ts).toLocaleString('es') }), h('span', { cls: 'marca', txt: Math.round((v.cuerpo || '').length / 100) / 10 + ' k' })]);
    }) : [h('p', { cls: 'ayuda', txt: 'Aún no hay versiones. Se guarda una copia cada 5 minutos de edición y al cerrar la nota.' })]);
    var d = UI.dialogo({ titulo: 'Historial de versiones', ancho: 560, cuerpo: h('div', {}, [lista, prev, h('div', { cls: 'fila', style: 'margin-top:10px' }, [btnR])]) });
    btnR.addEventListener('click', function () {
      if (!sel) return; snapshot(true); var cur = S().get('notas', st.id); S().poner('versiones', { id: U.id(), nota: st.id, ts: Date.now(), titulo: cur.titulo, cuerpo: cur.cuerpo });
      S().set('notas', st.id, { cuerpo: sel.cuerpo, titulo: sel.titulo || cur.titulo, modificada: Date.now() }); st.md = sel.cuerpo; st.ultimo = sel.cuerpo; if (st.ti) st.ti.value = sel.titulo || cur.titulo; pintarArea(); d.cerrar(); UI.aviso('Versión restaurada', { tipo: 'ok' });
    });
  }
  E.insertarImagen = insertarImg;
})(window);
