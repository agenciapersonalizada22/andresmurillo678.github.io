(function () {
  var $ = U.$, esc = U.esc, A = App, E = {}, ctl = null, corriendo = false;
  var TRANS = ['reescribir', 'mejorar', 'resumir', 'traducir'], CANT = { hilo: 6, carrusel: 7, titulos: 8, hashtags: 15, ideas: 10, resumir: 3 };
  var PREV = { x: 'x', instagram: 'instagram', tiktok: 'tiktok', linkedin: 'linkedin', facebook: 'facebook', shorts_titulo: 'shorts_titulo' };

  function tipoActual() { return Plantillas.tipo($('#f-tipo').value); }
  function campos() {
    var id = $('#f-tipo').value, v = $('#f-tema').value.trim(), c = { publico: $('#f-publico').value.trim(), cta: $('#f-cta').value.trim(), extra: $('#f-extra').value.trim(),
      duracion: +$('#f-dur').value, cantidad: +$('#f-cant').value || undefined, idioma: $('#f-idioma').value.trim() };
    if (TRANS.indexOf(id) >= 0) c.texto = v; else c.tema = v;
    return c;
  }
  function marcaSel() { var id = $('#f-marca').value; return A.est.marcas.filter(function (m) { return m.id === id; })[0] || null; }
  function ajustarForm() {
    var t = tipoActual(), tr = TRANS.indexOf(t.id) >= 0;
    $('#l-tema').textContent = tr ? 'Texto a transformar' : 'Tema o idea';
    $('#g-dur').classList.toggle('oculto', t.id !== 'guion');
    $('#g-cant').classList.toggle('oculto', !(t.id in CANT));
    $('#g-idioma').classList.toggle('oculto', t.id !== 'traducir');
    $('#l-cant').textContent = t.id === 'carrusel' ? 'Diapositivas' : t.id === 'resumir' ? 'Puntos' : 'Cantidad';
    if (t.id in CANT) $('#f-cant').value = CANT[t.id];
    if (t.red && PREV[t.red]) $('#p-red').value = t.red; else if (t.id === 'guion') $('#p-red').value = 'guion';
    estimar(); previa();
  }
  function estimar() {
    var el = $('#estimacion'), id = $('#f-tipo').value, c = campos();
    if (!document.querySelector('#m-ia').checked) { el.textContent = 'Modo plantillas: sin llamadas a la red ni costo.'; return; }
    var m; try { m = Plantillas.armarMensajes(id, c, marcaSel()); } catch (e) { return; }
    var ent = IA.estimarTokens(m.sistema + m.mensajes[0].texto), s = A.est.ajustes, tf = A.tarifa();
    var costo = IA.costo({ entrada: ent, salida: s.maxTokens }, tf);
    el.textContent = 'Entrada ≈ ' + ent + ' tokens (estimación) · salida hasta ' + s.maxTokens + ' · ' + (costo == null ? 'escribe tu tarifa en Ajustes para ver el costo aproximado.' : 'costo máximo aprox. ' + U.usd(costo) + ' según tu tarifa.');
  }
  function modoActual() { return $('#m-ia').checked ? 'ia' : 'reglas'; }
  function refrescarModo() {
    var ok = A.iaLista(); $('#m-ia').disabled = !ok;
    if (!ok && $('#m-ia').checked) $('#m-reglas').checked = true;
    else if (ok && A.est.ajustes.modoPreferido !== 'reglas' && !E.tocoModo) $('#m-ia').checked = true;
    $('#chip-modo').textContent = ok ? 'IA: ' + IA.PROVEEDORES[A.proveedor()].nombre.split(' ')[0] + ' · ' + A.modelo() : 'Modo plantillas';
    estimar();
  }
  function error(txt, tipo) { var e = $('#estado'); e.innerHTML = txt ? '<div class="aviso ' + (tipo || 'mal') + '">' + esc(txt) + '</div>' : ''; }

  function fijarOrigen(h) {
    $('#chip-origen').textContent = h ? (h.modo === 'ia' ? h.proveedor + ' · ' + h.modelo : 'Plantillas (sin IA)') : 'Sin generar';
    var n = $('#nota-modo'), reglas = h && h.modo !== 'ia';
    n.classList.toggle('oculto', !reglas);
    if (reglas) n.textContent = Plantillas.ETIQUETA_REGLAS + (Plantillas.LIMITES_REGLAS[h.tipo] ? ' ' + Plantillas.LIMITES_REGLAS[h.tipo] : '');
  }
  async function generar() {
    if (corriendo) return;
    var id = $('#f-tipo').value, c = campos(), marca = marcaSel(), modo = modoActual(), prev = $('#editor').value;
    error('');
    var h = { id: A.alm.nuevoId(), tipo: id, campos: c, marca: marca ? marca.nombre : '', modo: modo, fecha: Date.now() };
    if (modo === 'reglas') {
      try { h.texto = Plantillas.generarReglas(id, c, marca, E.variante = (E.variante || 0) + 1); } catch (e) { return error(e.message); }
      h.original = h.texto; h.proveedor = ''; h.modelo = '';
      fin(h, prev); return;
    }
    var m, clave, s = A.est.ajustes, prov = A.proveedor();
    if (!c.tema && !c.texto) return error('Escribe un tema o texto primero.');
    try { clave = await A.obtenerClave(prov); } catch (e) { return error(e.message); }
    m = Plantillas.armarMensajes(id, c, marca); ctl = new AbortController(); corriendo = true;
    $('#b-generar').disabled = true; $('#b-cancelar').classList.remove('oculto'); $('#editor').value = ''; var raf = 0;
    try {
      var r = await IA.generar({ proveedor: prov, clave: clave, modelo: A.modelo(), sistema: m.sistema, mensajes: m.mensajes, stream: s.stream, maxTokens: s.maxTokens, temperatura: s.temperatura, reintentos: s.reintentos, signal: ctl.signal,
        onToken: function (t, acc) { $('#editor').value = acc; if (!raf) raf = requestAnimationFrame(function () { raf = 0; contadores(); previa(); }); },
        onReintento: function (n, ms, e) { error('Reintentando (' + n + ') en ' + Math.round(ms / 1000) + ' s: ' + e.message, 'aviso'); } });
      error(''); h.texto = r.texto; h.original = r.texto; h.proveedor = prov; h.modelo = r.modelo; h.uso = r.uso; h.costo = IA.costo(r.uso, A.tarifa());
      fin(h, prev);
      if (r.uso.estimado) U.toast('El proveedor no informó el uso: tokens estimados.');
    } catch (e) {
      if (e.tipo === 'cancelado') { error('Generación cancelada. Se conserva el texto parcial.', 'aviso'); if (e.parcial) { h.texto = e.parcial; h.original = e.parcial; h.proveedor = prov; h.modelo = A.modelo(); h.parcial = true; h.uso = { entrada: 0, salida: IA.estimarTokens(e.parcial), estimado: true }; fin(h, prev, true); } }
      else { var pista = { cors: ' Consejo: desactiva extensiones que bloqueen solicitudes y revisa tu conexión.', clave: ' Ve a Ajustes para revisar tu clave.' }[e.tipo] || ''; error(e.message + pista); if (e.parcial) $('#editor').value = e.parcial; else $('#editor').value = prev; }
    } finally { corriendo = false; ctl = null; $('#b-generar').disabled = false; $('#b-cancelar').classList.add('oculto'); }
  }
  function fin(h, prev, silencio) {
    A.previa = prev || (A.actual ? A.actual.texto : ''); A.actual = h; $('#editor').value = h.texto; fijarOrigen(h);
    A.guardar('historial', h).catch(function () { U.toast('No se pudo guardar en el historial'); });
    contadores(); previa(); if (!silencio) U.toast('Listo. Revisa el resultado antes de publicar.');
    if (matchMedia('(max-width:899px)').matches) $('#resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function contadores() {
    var t = $('#editor').value, sel = $('#p-red').value, lim = A.est.ajustes.limites, h = '';
    Object.keys(Contadores.REDES).forEach(function (r) {
      var c = Contadores.contar(r, t, lim), p = c.max ? Math.min(100, Math.round(c.n / c.max * 100)) : 0;
      h += '<div class="cont ' + c.estado + (r === sel ? ' sel' : '') + '" role="listitem"><b>' + esc(Contadores.REDES[r].nombre) + '</b><span class="num">' + c.n + ' / ' + c.max + '</span> <span class="suave">' + (c.restante >= 0 ? 'quedan ' + c.restante : 'sobran ' + (-c.restante)) + '</span><div class="barra-p"><i style="width:' + p + '%"></i></div>' + (c.avisos.length && r === sel ? '<div class="suave">' + esc(c.avisos.join('. ')) + '</div>' : '') + '</div>';
    });
    $('#contadores').innerHTML = h;
  }
  function hashtagsHtml(t) { return esc(t).replace(/(#[\p{L}\p{N}_]+|@\w+)/gu, '<span class="ht">$1</span>'); }
  function post(red, texto, extra) {
    var r = Contadores.REDES[red], c = Contadores.contar(red, texto, A.est.ajustes.limites);
    return '<div class="post ' + red + '"><div class="cab"><div class="av">M</div><div><b>Tu marca</b><div class="suave">' + esc(r.nombre) + ' · ahora</div></div></div><div class="cuerpo">' + hashtagsHtml(texto) + '</div><div class="pie">' + c.n + '/' + c.max + ' caracteres' + (extra || '') + '</div></div>';
  }
  function previa() {
    var t = $('#editor').value, red = $('#p-red').value, id = $('#f-tipo').value, el = $('#previa');
    if (!t.trim()) { el.innerHTML = '<p class="suave">La vista previa aparecerá aquí.</p>'; return; }
    if (red === 'guion') {
      var g = Exportar.parsearGuion(t);
      if (!g.escenas.length) { el.innerHTML = '<p class="suave">No se detectaron escenas. El guion debe usar «ESCENA 1 | 0:00-0:05 | GANCHO», «CÁMARA:» y «TEXTO:».</p>'; return; }
      var pal = g.escenas.reduce(function (a, e) { return a + (e.texto.match(/\S+/g) || []).length; }, 0);
      el.innerHTML = '<p><b>' + esc(g.titulo) + '</b> · duración ' + Plantillas.mmss(g.duracion) + ' · ~' + pal + ' palabras (' + (g.duracion ? (pal / g.duracion).toFixed(1) : 0) + ' pal/s; hablar suele rondar 2-3 pal/s)</p><table class="escenas"><thead><tr><th>Tiempo</th><th>Parte</th><th>Cámara</th><th>Texto</th></tr></thead><tbody>' +
        g.escenas.map(function (e) { return '<tr><td>' + Plantillas.mmss(e.ini) + '–' + Plantillas.mmss(e.fin) + '</td><td>' + esc(e.tipo) + '</td><td>' + esc(e.camara) + '</td><td>' + esc(e.texto) + '</td></tr>'; }).join('') + '</tbody></table>';
      return;
    }
    if (id === 'carrusel' || /^\s*(Diapositiva|Slide)\s*\d/im.test(t)) {
      var ds = Contadores.dividirCarrusel(t.replace(/\n\n?Pie de foto:[\s\S]*$/i, ''));
      el.innerHTML = '<div class="slides">' + ds.map(function (d, i) { return '<div class="slide" aria-label="Diapositiva ' + (i + 1) + '">' + hashtagsHtml(d) + '</div>'; }).join('') + '</div><p class="suave">' + ds.length + ' diapositivas.</p>'; return;
    }
    if (id === 'hilo' || (red === 'x' && /\(\d+\/\d+\)/.test(t))) {
      var ps = t.split(/\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (ps.length < 2) ps = Contadores.dividirHilo(t);
      el.innerHTML = ps.map(function (p) { return post('x', p); }).join('') + '<p class="suave">' + ps.length + ' publicaciones.</p>'; return;
    }
    if (red === 'x' && id === 'x' && /^\s*1\.\s/.test(t)) { el.innerHTML = t.split(/\n{2,}/).map(function (p) { return post('x', p.replace(/^\d+\.\s*/, '')); }).join(''); return; }
    el.innerHTML = post(red, t);
  }
  function exportar(fmt) {
    var t = $('#editor').value; if (!t.trim()) return U.toast('No hay texto para exportar');
    var id = $('#f-tipo').value, nom = id + '-' + new Date().toISOString().slice(0, 10), h = A.actual || {};
    try {
      if (fmt === 'srt') Exportar.descargar(nom + '.srt', Exportar.aSrt(t), 'application/x-subrip');
      else if (fmt === 'md') Exportar.descargar(nom + '.md', Exportar.aMd({ titulo: (Exportar.parsearGuion(t).titulo || Plantillas.tipo(id).nombre), tipo: Plantillas.tipo(id).nombre, fecha: new Date().toLocaleString('es'), marca: h.marca, modelo: h.modo === 'ia' ? h.proveedor + ' ' + h.modelo : '', texto: t }), 'text/markdown');
      else Exportar.descargar(nom + '.txt', Exportar.aTxt({ texto: t }), 'text/plain');
    } catch (e) { U.toast(e.message, 5000); }
  }
  function alCalendario() {
    var t = $('#editor').value; if (!t.trim()) return U.toast('Primero genera o escribe algo');
    var id = $('#f-tipo').value, red = { x: 'x', hilo: 'x', instagram: 'instagram', carrusel: 'instagram', tiktok: 'tiktok', linkedin: 'linkedin', facebook: 'facebook', shorts: 'youtube', guion: 'tiktok' }[id] || 'x';
    var g = Exportar.parsearGuion(t);
    var p = { titulo: g.titulo || t.split('\n')[0].slice(0, 80), texto: t, red: red, formato: id, ts: Date.now() };
    A.storage.setItem('contenido_puente', JSON.stringify(p)); location.href = '../calendario/?importar=1';
  }
  function comparar() {
    var cur = $('#editor').value, prev = A.previa;
    if (!prev || prev === cur) return U.toast('No hay una versión anterior distinta para comparar');
    A.mostrarDiff(prev, cur, 'Versión anterior → versión actual');
  }
  A.mostrarDiff = function (a, b, titulo) {
    $('#t-diff').textContent = titulo || 'Comparar versiones';
    $('#diff-cont').innerHTML = Diff.diff(a, b).map(function (x) { return x.t === '=' ? esc(x.s) : x.t === '+' ? '<ins>' + esc(x.s) + '</ins>' : '<del>' + esc(x.s) + '</del>'; }).join('');
    U.abrirDialogo($('#dlg-diff'));
  };
  A.abrirEntrada = function (h) {
    A.actual = h; $('#f-tipo').value = h.tipo; ajustarForm(); var c = h.campos || {};
    $('#f-tema').value = c.tema || c.texto || ''; $('#f-publico').value = c.publico || ''; $('#f-cta').value = c.cta || ''; $('#f-extra').value = c.extra || '';
    $('#editor').value = h.texto; if (c.cantidad) $('#f-cant').value = c.cantidad; fijarOrigen(h); contadores(); previa(); A.vista('escribir');
  };
  A.usarPlantilla = function (p) {
    $('#f-tipo').value = p.tipo; ajustarForm(); $('#f-publico').value = p.publico || ''; $('#f-cta').value = p.cta || ''; $('#f-extra').value = p.extra || ''; $('#f-marca').value = p.marca || '';
    if (p.tema) $('#f-tema').value = p.tema; A.vista('escribir'); $('#f-tema').focus();
  };
  E.cancelar = function () { if (ctl) ctl.abort(); };
  E.generar = generar; E.guardar = function () {
    if (!A.actual) { A.actual = { id: A.alm.nuevoId(), tipo: $('#f-tipo').value, campos: campos(), modo: 'manual', fecha: Date.now(), proveedor: '', modelo: '', marca: '' }; }
    A.actual.texto = $('#editor').value; A.guardar('historial', A.actual).then(function () { U.toast('Guardado en el historial'); });
  };
  E.iniciar = function () {
    var sel = $('#f-tipo'), grupos = {};
    Plantillas.TIPOS.forEach(function (t) { (grupos[t.grupo] = grupos[t.grupo] || []).push(t); });
    sel.innerHTML = Object.keys(grupos).map(function (g) { return '<optgroup label="' + g + '">' + grupos[g].map(function (t) { return '<option value="' + t.id + '">' + esc(t.nombre) + '</option>'; }).join('') + '</optgroup>'; }).join('');
    $('#p-red').innerHTML = '<option value="guion">Guion de video (escenas)</option>' + Object.keys(Contadores.REDES).map(function (r) { return '<option value="' + r + '">' + esc(Contadores.REDES[r].nombre) + '</option>'; }).join('');
    $('#form').addEventListener('submit', function (e) { e.preventDefault(); generar(); });
    sel.addEventListener('change', ajustarForm);
    $('#b-cancelar').onclick = E.cancelar;
    ['#editor'].forEach(function (s) { $(s).addEventListener('input', function () { contadores(); previa(); }); });
    $('#p-red').addEventListener('change', function () { contadores(); previa(); });
    ['#f-tema', '#f-cant', '#f-marca', '#f-publico', '#f-cta', '#f-extra'].forEach(function (s) { $(s).addEventListener('input', estimar); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name=modo]'), function (r) { r.addEventListener('change', function () { E.tocoModo = true; estimar(); }); });
    $('#b-copiar').onclick = function () { U.copiar($('#editor').value).then(function () { U.toast('Copiado'); }); };
    $('#b-guardar').onclick = E.guardar; $('#b-comparar').onclick = comparar; $('#b-cal').onclick = alCalendario;
    $('#b-md').onclick = function () { exportar('md'); }; $('#b-txt').onclick = function () { exportar('txt'); }; $('#b-srt').onclick = function () { exportar('srt'); };
    $('#c-diff').onclick = function () { U.cerrarDialogo($('#dlg-diff')); };
    A.on(function (q) { if (q === 'marcas') llenarMarcas(); if (q === 'ajustes') refrescarModo(); });
    llenarMarcas(); ajustarForm(); refrescarModo(); contadores(); previa();
  };
  function llenarMarcas() {
    var s = $('#f-marca'), v = s.value;
    s.innerHTML = '<option value="">Sin perfil de marca</option>' + A.est.marcas.map(function (m) { return '<option value="' + m.id + '">' + esc(m.nombre) + '</option>'; }).join(''); s.value = v;
  }
  E.refrescarModo = refrescarModo; E.corriendo = function () { return corriendo; };
  A.escribir = E;
})();
