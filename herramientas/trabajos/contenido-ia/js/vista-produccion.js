/* Vista «Produccion»: piezas, estudio de la pieza (guion, versiones, hook, titulos, miniatura, descripcion, prompts externos, checklist), series y biblioteca de prompts. window.CProduccion */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, U = g.CUI, A = g.CApp, D = g.CDatos, P = g.CIA.prompts, PL = g.CIA.plantillas, Mi = g.CIA.miniaturas, Ma = g.CIA.marca, S = g.CIA.similitud, E = g.CIA.editorial, X = {}, sub, selId = null, urls = {}, imagenMini = null;
  var CAN = PL.CANALES, FORM = PL.FORMATOS;
  function opcCanal() { return Object.keys(CAN).map(function (k) { return [k, CAN[k].nombre]; }); }
  function opcFormato() { return Object.keys(FORM).map(function (k) { return [k, FORM[k].nombre]; }); }
  function texto(p) { return p.texto != null ? p.texto : D.guion(p); }
  function guardar(p) { return A.guardarPieza(p); }
  var deb = {}; function guardarDeb(p) { clearTimeout(deb[p.id]); deb[p.id] = setTimeout(function () { guardar(p); }, 500); }
  function actual() { return A.pieza(selId); }
  X.abrir = function (id) { selId = id; if (sub) sub.ir('estudio'); };

  /* ---------- lista de piezas ---------- */
  function piezas(c) {
    var nueva = { titulo: '', formato: 'corto', canal: A.canales()[0] || 'youtube', pilar: '' }, filtro = { estado: '' }, cont = h('div', {});
    var pil = [['', '(sin pilar)']].concat(A.proyecto.pilares.map(function (p) { return [p.nombre, p.nombre]; }));
    c.appendChild(U.panel('Nueva pieza', [U.txt(nueva, 'titulo', 'Título de trabajo', { ph: 'Ej.: 3 recetas con huevo en 5 minutos' }), U.fila([U.sel(opcFormato(), nueva.formato, function (v) { nueva.formato = v; }, 'Formato'), U.sel(opcCanal(), nueva.canal, function (v) { nueva.canal = v; }, 'Canal')]), U.sel(pil, nueva.pilar, function (v) { nueva.pilar = v; }, 'Pilar'),
      U.acciones([U.btn('Crear y abrir', async function () { if (!nueva.titulo.trim()) { T.aviso('Escribe un título.', 'error'); return; } var p = D.nuevaPieza(A.proyecto.id, { titulo: nueva.titulo.trim(), formato: nueva.formato, canal: nueva.canal, pilar: nueva.pilar, tema: nueva.titulo.trim() }), r = await guardar(p); nueva.titulo = ''; X.abrir(r.id); if (g.CuentaTrabajos) g.CuentaTrabajos.logro('primera_pieza'); }, 'tr-pri'), U.iaBtn('Ideas con IA', async function () {
        var pl = A.proyecto.pilares, pilar = nueva.pilar || (pl[0] && pl[0].nombre) || A.proyecto.nicho.tema || 'general', r = await A.ia(P.ideas(A.proyecto, pilar, 8, A.piezas.slice(0, 20).map(function (x) { return x.titulo; }))), l = P.parsear.ideas(r.json); if (!l.length) throw new Error('La IA no devolvió ideas utilizables.');
        for (var i = 0; i < l.length; i++) await guardar(D.nuevaPieza(A.proyecto.id, { titulo: l[i].titulo, formato: l[i].formato, canal: (CAN[nueva.canal] && CAN[nueva.canal].formatos.indexOf(l[i].formato) >= 0) ? nueva.canal : A.canales()[0] || 'youtube', pilar: nueva.pilar, tema: l[i].gancho })); T.aviso(l.length + ' ideas añadidas al tablero.'); })])]));
    c.appendChild(U.panel('Mis piezas', [U.sel([['', 'Todos los estados']].concat(E.ESTADOS), filtro.estado, function (v) { filtro.estado = v; pintar(); }, 'Filtrar por estado'), cont]));
    function pintar() {
      cont.textContent = ''; var l = A.piezas.filter(function (p) { return !filtro.estado || p.estado === filtro.estado; }); if (!l.length) { cont.appendChild(U.vacio('Todavía no hay piezas aquí.')); return; }
      l.forEach(function (p) { cont.appendChild(h('div', { cls: 'cia-item' }, [h('div', {}, [h('b', { txt: p.titulo || '(sin título)' }), h('div', { cls: 'tr-ayuda', txt: (CAN[p.canal] ? CAN[p.canal].nombre : p.canal) + ' · ' + (FORM[p.formato] ? FORM[p.formato].nombre : p.formato) + (p.fecha ? ' · ' + p.fecha + ' ' + p.hora : '') })]), U.etiqueta(E.ESTADOS.filter(function (e) { return e[0] === p.estado; })[0][1]), U.btn('Abrir', function () { X.abrir(p.id); }, 'tr-chico')])); });
    }
    pintar();
  }

  /* ---------- estudio ---------- */
  function det(titulo, abierto, hijos) { return h('details', { cls: 'tr-panel cia-det', open: abierto }, [h('summary', { txt: titulo })].concat(hijos)); }
  function datosPieza(p, pc, rf) {
    var pil = [['', '(sin pilar)']].concat(A.proyecto.pilares.map(function (x) { return [x.nombre, x.nombre]; })), ser = [['', '(sin serie)']].concat(A.series.map(function (s) { return [s.id, s.nombre]; }));
    return det('Datos de la pieza', true, [U.txt(p, 'titulo', 'Título', { max: 200 }, function () { guardarDeb(p); }), U.fila([U.sel(opcFormato(), p.formato, function (v) { p.formato = v; guardar(p); rf(); }, 'Formato'), U.sel(opcCanal(), p.canal, function (v) { p.canal = v; guardar(p); rf(); }, 'Canal')]), U.fila([U.sel(pil, p.pilar, function (v) { p.pilar = v; guardar(p); }, 'Pilar'), U.sel(ser, p.serie, function (v) { p.serie = v; guardar(p); }, 'Serie'), U.sel(E.ESTADOS, p.estado, function (v) { p.estado = v; guardar(p); }, 'Estado')]),
      U.acciones([U.btn('Borrar pieza', async function () { if (!g.confirm('¿Borrar esta pieza y sus versiones?')) return; await A.borrarPieza(p.id); selId = null; sub.ir('piezas'); }, 'tr-peli')])]);
  }
  function seccionGuion(p) {
    var ta = h('textarea', { id: 'cia-guion', rows: 14, 'aria-label': 'Guion' }), nota = { v: '' }, stats = h('p', { cls: 'tr-ayuda', role: 'status' }), hist = h('div', {}), dif = h('div', {}), instr = { t: '' };
    ta.value = texto(p);
    function est() { var pal = PL.palabras(ta.value), f = FORM[p.formato] || {}; stats.textContent = pal + ' palabras' + (f.unidad === 'segundos' || f.unidad === 'minutos' ? ' · lectura ≈ ' + Math.floor(PL.duracionHablada(ta.value) / 60) + ' min ' + PL.duracionHablada(ta.value) % 60 + ' s' : '') + (f.objetivo ? ' · objetivo del formato: ' + f.objetivo + ' ' + f.unidad : ''); }
    ta.addEventListener('input', function () { p.texto = ta.value; est(); guardarDeb(p); });
    function pintarHist() {
      hist.textContent = ''; var v = p.versiones || []; if (!v.length) { hist.appendChild(U.vacio('Aún no guardaste versiones.')); return; }
      v.slice().reverse().forEach(function (x, i) { hist.appendChild(h('div', { cls: 'cia-item' }, [h('div', {}, [h('b', { txt: 'v' + x.v + (i === 0 ? ' (última)' : '') }), h('div', { cls: 'tr-ayuda', txt: U.fecha(x.t) + (x.nota ? ' · ' + x.nota : '') + ' · ' + PL.palabras(x.texto) + ' palabras' })]), U.btn('Comparar', function () { var d = S.diff(x.texto, ta.value); dif.textContent = ''; var cambios = d.filter(function (l) { return l.t !== '='; }).length; dif.appendChild(h('p', { cls: 'tr-ayuda', txt: 'v' + x.v + ' → texto actual: ' + (cambios ? cambios + ' líneas distintas' : 'sin diferencias') + '.' })); dif.appendChild(h('pre', { cls: 'cia-diff', 'aria-label': 'Diferencias' }, d.map(function (l) { return h('div', { cls: 'cia-d' + (l.t === '+' ? 'a' : l.t === '-' ? 'q' : 'i'), txt: (l.t === '=' ? '  ' : l.t + ' ') + l.l }); }))); }, 'tr-chico'), U.btn('Restaurar', function () { ta.value = x.texto; p.texto = x.texto; est(); guardar(p); T.aviso('Restaurada v' + x.v + ' como texto actual (guarda una versión para conservarla).'); }, 'tr-chico')])); });
    }
    function guardarVersion() {
      var v = p.versiones = p.versiones || [], ult = v[v.length - 1]; if (ult && ult.texto === ta.value) { T.aviso('No hay cambios desde la última versión.'); return; }
      v.push({ v: (ult ? ult.v : 0) + 1, t: Date.now(), texto: ta.value, nota: nota.v.trim() }); nota.v = ''; nInput.value = ''; p.texto = ta.value; if (p.estado === 'idea' && ta.value.trim()) p.estado = 'guion'; guardar(p).then(function () { pintarHist(); T.aviso('Versión v' + v.length + ' guardada.'); });
    }
    var nInput = h('input', { type: 'text', id: 'cia-nver', maxlength: 80, placeholder: 'Nota de la versión (opcional)' }); nInput.addEventListener('input', function () { nota.v = nInput.value; });
    est(); pintarHist();
    return det('1 · Guion y versiones', true, [h('p', { cls: 'tr-ayuda', txt: 'Plantilla local (sin IA) o escrito con IA. Los datos que la IA no pueda saber aparecen como [VERIFICAR: …]: confírmalos antes de publicar.' }),
      U.acciones([U.btn('Esqueleto del formato', function () { if (ta.value.trim() && !g.confirm('Esto reemplaza el texto actual (puedes restaurar desde versiones si lo guardaste). ¿Seguir?')) return; ta.value = PL.esqueleto(p.formato, p.titulo); p.texto = ta.value; est(); guardar(p); }), U.iaBtn('Escribir con IA', async function () { var r = await A.ia(P.guion(p, PL.esqueleto(p.formato, p.titulo), instr.t)); if (ta.value.trim() && !g.confirm('Reemplazar el texto actual por el de la IA?')) return; ta.value = r.texto.trim(); p.texto = ta.value; est(); await guardar(p); }), U.iaBtn('Mejorar texto', async function () { if (!ta.value.trim()) throw new Error('Escribe algo primero.'); var r = await A.ia(P.mejorar(ta.value, instr.t || 'más claro, directo y con ritmo')); ta.value = r.texto.trim(); p.texto = ta.value; est(); await guardar(p); })]),
      U.txt(instr, 't', 'Indicaciones extra para la IA (opcional)', { ph: 'Ej.: tono humorístico, menciona el precio' }), ta, stats,
      h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'cia-nver', txt: 'Nota de versión' }), nInput]), h('div', {}, [h('label', { txt: ' ' }), U.btn('Guardar versión', guardarVersion, 'tr-pri')])]), h('h3', { txt: 'Historial' }), hist, dif]);
  }
  function seccionTitulos(p, rf) {
    var lista = h('div', {}), hk = h('div', {}), cap = (CAN[p.canal] || {}).titulo || 100;
    function pint() {
      lista.textContent = ''; (p.titulos || []).forEach(function (t, i) { lista.appendChild(h('div', { cls: 'cia-item' }, [h('div', {}, [h('span', { txt: t }), h('div', { cls: 'tr-ayuda', txt: t.length + '/' + cap + ' caracteres' + (t.length > cap ? ' — demasiado largo' : '') })]), U.btn('Usar', function () { p.titulo = t; guardar(p); rf(); }, 'tr-chico'), U.btn('A/B', function () { p.ab = p.ab || []; if (p.ab.some(function (v) { return v.nombre === t; })) return; if (p.ab.length >= 4) { T.aviso('Máximo 4 variantes.', 'error'); return; } p.ab.push({ nombre: t, impresiones: '', clics: '' }); guardar(p); T.aviso('Añadido al test A/B (pestaña Operación › Métricas).'); }, 'tr-chico'), U.btn('Quitar', function () { p.titulos.splice(i, 1); guardar(p); pint(); }, 'tr-chico tr-peli')])); });
      if (!(p.titulos || []).length) lista.appendChild(U.vacio('Sin títulos candidatos.'));
    }
    var hook = h('textarea', { id: 'cia-hook', rows: 2, 'aria-label': 'Hook' }); hook.value = p.hook || ''; hook.addEventListener('input', function () { p.hook = hook.value; guardarDeb(p); });
    pint();
    return det('2 · Hook y títulos', false, [h('label', { for: 'cia-hook', txt: 'Hook (primera frase)' }), hook, U.acciones([U.iaBtn('8 ganchos con IA', async function () { var r = await A.ia(P.hooks(p)), l = P.parsear.hooks(r.json); hk.textContent = ''; if (!l.length) throw new Error('La IA no devolvió ganchos utilizables.'); l.forEach(function (t) { hk.appendChild(h('div', { cls: 'cia-item' }, [h('span', { txt: t }), U.btn('Usar', function () { hook.value = t; p.hook = t; guardar(p); }, 'tr-chico')])); }); })]), hk,
      h('h3', { txt: 'Títulos candidatos' }), U.acciones([U.btn('Plantillas sin IA', function () { p.titulos = (p.titulos || []).concat(PL.titulosBase(p.tema || p.titulo || 'tu tema').filter(function (t) { return (p.titulos || []).indexOf(t) < 0; })); guardar(p); pint(); }), U.iaBtn('8 títulos con IA', async function () { var r = await A.ia(P.titulos(p, (CAN[p.canal] || {}).nombre || p.canal, cap)), j = P.parsear.titulos(r.json); if (!j.titulos.length) throw new Error('La IA no devolvió títulos utilizables.'); p.titulos = (p.titulos || []).concat(j.titulos); await guardar(p); pint(); })]), lista]);
  }
  function seccionMiniatura(p) {
    var mn = p.miniatura = p.miniatura || { plantilla: 'bloque', formato: 'youtube', texto: '', subtitulo: '' }, cv = h('canvas', { id: 'cia-lienzo', role: 'img', 'aria-label': 'Vista previa de la miniatura', cls: 'cia-lienzo' }), extra = { valor: '5', izq: 'Antes', der: 'Después' }, sug = h('div', {});
    if (!mn.texto) mn.texto = p.titulo || '';
    function dibujar() {
      var f = Mi.FORMATOS[mn.formato] || Mi.FORMATOS.youtube, pr = A.proyecto.marca; if (!pr.paleta) pr.paleta = Ma.paleta(pr.color, pr.esquema);
      cv.width = f.w; cv.height = f.h; Mi.dibujar(cv.getContext('2d'), f.w, f.h, { plantilla: mn.plantilla, titulo: mn.texto, subtitulo: mn.subtitulo, marca: { nombre: pr.nombre, paleta: pr.paleta }, tipografia: Ma.tipografia(pr.tipografia), imagen: imagenMini, valor: extra.valor, izq: extra.izq, der: extra.der });
    }
    function cambio() { guardarDeb(p); dibujar(); }
    var file = h('input', { type: 'file', accept: 'image/*', id: 'cia-fondo' }); file.addEventListener('change', function () { var f = file.files[0]; if (!f) return; var im = new Image(); im.onload = function () { imagenMini = im; dibujar(); }; im.onerror = function () { T.aviso('No se pudo leer la imagen.', 'error'); }; im.src = URL.createObjectURL(f); });
    setTimeout(dibujar, 0);
    return det('3 · Miniatura (canvas)', false, [U.fila([U.sel(Mi.PLANTILLAS, mn.plantilla, function (v) { mn.plantilla = v; cambio(); }, 'Plantilla'), U.sel(Object.keys(Mi.FORMATOS).map(function (k) { return [k, Mi.FORMATOS[k].nombre]; }), mn.formato, function (v) { mn.formato = v; cambio(); }, 'Formato')]), U.txt(mn, 'texto', 'Texto principal (máx. 4-5 palabras)', { max: 80 }, cambio), U.txt(mn, 'subtitulo', 'Subtítulo / autor de la cita', { max: 80 }, cambio),
      U.fila([U.txt(extra, 'valor', 'Número (plantilla «Número»)', {}, dibujar), U.txt(extra, 'izq', 'Lado izquierdo (Versus)', {}, dibujar), U.txt(extra, 'der', 'Lado derecho (Versus)', {}, dibujar)]), U.campo('Imagen de fondo propia (opcional, no se guarda)', file, 'Usa una imagen que hayas generado tú o tengas licencia para usar.'), cv,
      U.acciones([U.btn('Descargar PNG', function () { cv.toBlob(function (b) { T.descargar(b, 'miniatura-' + T.nombreArchivo(p.titulo || 'pieza') + '.png'); }, 'image/png'); }, 'tr-pri'), U.iaBtn('Textos con IA', async function () { var r = await A.ia(P.miniatura(p)), l = P.parsear.miniaturas(r.json); sug.textContent = ''; if (!l.length) throw new Error('La IA no devolvió textos utilizables.'); l.forEach(function (x) { sug.appendChild(h('div', { cls: 'cia-item' }, [h('div', {}, [h('b', { txt: x.texto }), h('div', { cls: 'tr-ayuda', txt: x.visual })]), U.btn('Usar', function () { mn.texto = x.texto; cambio(); sub.refrescar(); }, 'tr-chico')])); }); })]), sug]);
  }
  function seccionDescripcion(p) {
    var cap = CAN[p.canal] || {}, cont = h('p', { cls: 'tr-ayuda', role: 'status' }), ds = h('textarea', { id: 'cia-desc', rows: 7, 'aria-label': 'Descripción' }), hs = h('input', { type: 'text', id: 'cia-hash', 'aria-label': 'Hashtags' }); ds.value = p.descripcion || ''; hs.value = p.hashtags || '';
    function chk() { var l = PL.limites(p.canal, p); cont.textContent = 'Descripción ' + ds.value.length + '/' + (cap.desc || '—') + ' · hashtags ' + ((hs.value.match(/#[^\s#]+/g) || []).length) + '/' + (cap.hashtags || '—') + (l.length ? ' — Fuera de límite: ' + l.map(function (x) { return x.campo; }).join(', ') : ''); cont.className = 'tr-ayuda' + (l.length ? ' cia-mal' : ''); }
    ds.addEventListener('input', function () { p.descripcion = ds.value; guardarDeb(p); chk(); }); hs.addEventListener('input', function () { p.hashtags = hs.value; guardarDeb(p); chk(); }); chk();
    return det('4 · Descripción, hashtags y SEO', false, [h('label', { for: 'cia-desc', txt: 'Descripción' }), ds, h('label', { for: 'cia-hash', txt: 'Hashtags' }), hs, cont,
      U.acciones([U.btn('Hashtags desde el tema', function () { hs.value = PL.hashtags([p.tema, p.titulo, A.proyecto.nicho.tema, p.pilar], cap.hashtags || 8).join(' '); p.hashtags = hs.value; guardar(p); chk(); }), U.btn('Añadir divulgación de IA', function () { var d = (A.proyecto.biblia.divulgacion || '').trim() || PL.divulgacionTexto(p.divulgacion || {}, p.canal); if (ds.value.indexOf(d) < 0) ds.value = (ds.value ? ds.value + '\n\n' : '') + d; p.descripcion = ds.value; guardar(p); chk(); }), U.iaBtn('Descripción con IA', async function () { var r = await A.ia(P.descripcion({ titulo: p.titulo, guion: texto(p) }, cap.nombre || p.canal, cap.desc)), j = P.parsear.descripcion(r.json); if (!j || !j.descripcion) throw new Error('La IA no devolvió una descripción utilizable.'); ds.value = j.descripcion; hs.value = j.hashtags.slice(0, cap.hashtags || 8).join(' '); p.descripcion = ds.value; p.hashtags = hs.value; await guardar(p); chk(); })])]);
  }
  function seccionPrompts(p) {
    var cont = h('div', {}), arch = h('div', {}), pr = p.prompts = p.prompts || {}, bib = A.proyecto.biblia, ma = A.proyecto.marca, biblia = { personaje: bib.personaje, voz: bib.voz, estiloVisual: bib.estiloVisual, paleta: ma.paleta ? [ma.paleta.primario, ma.paleta.secundario, ma.paleta.acento].join(', ') : '' };
    var fmtImg = p.formato === 'corto' || p.formato === 'carrusel' ? '9:16' : '16:9';
    function esc() { return PL.escenas(texto(p)); }
    function pint() {
      cont.textContent = ''; var es = esc(); if (!es.length) { cont.appendChild(U.vacio('Escribe un guion con secciones «## …» (usa el esqueleto) para generar prompts por escena.')); return; }
      es.forEach(function (e, i) {
        var o = pr[i] || {}, im = o.imagen || PL.promptExterno('imagen', e.texto, biblia, { formato: fmtImg }), vz = o.voz || PL.promptExterno('voz', e.texto, biblia, { idioma: A.proyecto.nicho.idioma }), vd = PL.promptExterno('video', e.texto, biblia, { formato: fmtImg });
        cont.appendChild(h('div', { cls: 'cia-tarjeta' }, [h('h3', { txt: (i + 1) + '. ' + e.titulo }), h('p', { cls: 'tr-ayuda', txt: e.texto.slice(0, 160) })].concat([['Imagen', im], ['Voz', vz], ['Video', vd]].map(function (x) { return h('div', {}, [h('div', { cls: 'cia-cab' }, [h('b', { txt: x[0] }), U.copiarBtn(x[1], 'Copiar'), U.btn('A la biblioteca', function () { A.guardarCol('prompts', { nombre: p.titulo.slice(0, 30) + ' · ' + e.titulo + ' · ' + x[0], tipo: x[0].toLowerCase(), texto: x[1], etiquetas: p.pilar || '' }); T.aviso('Guardado en la biblioteca de prompts.'); }, 'tr-chico')]), h('pre', { cls: 'cia-pre', txt: x[1] })]); }))));
      });
    }
    var f = h('input', { type: 'file', multiple: true, id: 'cia-arch', accept: 'image/*,audio/*,video/*,.srt,.txt' });
    f.addEventListener('change', function () { Array.prototype.forEach.call(f.files, function (fl) { urls[p.id + fl.name] = URL.createObjectURL(fl); if (!p.archivos.some(function (a) { return a.nombre === fl.name; })) p.archivos.push({ nombre: fl.name, tipo: fl.type, tam: fl.size, nota: '' }); }); guardar(p); pintArch(); f.value = ''; });
    function pintArch() {
      arch.textContent = ''; if (!p.archivos.length) { arch.appendChild(U.vacio('Aún no registraste archivos.')); return; }
      p.archivos.forEach(function (a, i) { var u = urls[p.id + a.nombre], vis = u ? (/^image/.test(a.tipo) ? h('img', { src: u, alt: a.nombre, cls: 'cia-mini' }) : /^audio/.test(a.tipo) ? h('audio', { src: u, controls: true }) : /^video/.test(a.tipo) ? h('video', { src: u, controls: true, cls: 'cia-mini' }) : null) : null;
        arch.appendChild(h('div', { cls: 'cia-item' }, [h('div', {}, [h('b', { txt: a.nombre }), h('div', { cls: 'tr-ayuda', txt: Math.round(a.tam / 1024) + ' KB · ' + (a.tipo || 'archivo') + (u ? '' : ' · vista previa solo en la sesión en que lo subiste') }), vis, U.txt(a, 'nota', 'Herramienta / licencia / enlace', { ph: 'Ej.: generado con X el 12/11, licencia propia' }, function () { guardarDeb(p); })]), U.btn('Quitar', function () { p.archivos.splice(i, 1); guardar(p); pintArch(); }, 'tr-chico tr-peli')])); });
    }
    var res = p.resultados = p.resultados || { imagen: '', voz: '', video: '' };
    pint(); pintArch();
    var d5 = det('5 · Prompts para herramientas externas y archivos', false, [h('p', { cls: 'tr-sub', txt: 'Copia cada prompt a tu generador de imagen, voz o video (con su propia licencia y reglas). Estudio no envía nada a esas herramientas: tú pegas los resultados o registras los archivos. Los archivos no se suben a la nube; solo se guardan nombre, tamaño y notas.' }),
      U.acciones([U.btn('Regenerar escenas', pint), U.iaBtn('Refinar prompts con IA', async function () { var es = esc(); if (!es.length) throw new Error('Primero escribe el guion con secciones.'); var r = await A.ia(P.promptsExternos({ titulo: p.titulo }, es, biblia)), l = P.parsear.escenas(r.json); if (!l.length) throw new Error('La IA no devolvió prompts utilizables.'); l.forEach(function (x, i) { if (i < es.length) pr[i] = { imagen: x.imagen, voz: x.voz }; }); await guardar(p); pint(); })]), cont,
      h('h3', { txt: 'Resultados y archivos' }), U.txt(res, 'imagen', 'Enlaces o notas de imágenes generadas', { area: true, filas: 2 }, function () { guardarDeb(p); }), U.txt(res, 'voz', 'Enlaces o notas de la voz / audio', { area: true, filas: 2 }, function () { guardarDeb(p); }), U.txt(res, 'video', 'Enlaces o notas del video / clips', { area: true, filas: 2 }, function () { guardarDeb(p); }), U.campo('Registrar archivos (imágenes, audio, video, subtítulos)', f), arch]);
    d5.addEventListener('toggle', function () { if (d5.open) pint(); }); return d5;
  }
  function seccionCheck(p) {
    var ck = p.checklist = p.checklist || {}, items = PL.checklist(p.canal, p.formato), cont = h('div', {}), prog = h('p', { cls: 'tr-ayuda', role: 'status' }), cap = CAN[p.canal] || {};
    function res() { var n = items.filter(function (t) { return ck[t]; }).length; prog.textContent = n + ' de ' + items.length + ' comprobaciones'; return n === items.length; }
    items.forEach(function (t) { var c = h('input', { type: 'checkbox', id: U.id('ck') }); c.checked = !!ck[t]; c.addEventListener('change', function () { ck[t] = c.checked; guardarDeb(p); res(); }); cont.appendChild(h('label', { cls: 'tr-chk', for: c.id }, [c, t])); }); res();
    var banderas = S.evaluarPieza(p).filter(function (b) { return b.severidad !== 'baja'; });
    return det('6 · Checklist de publicación', false, [h('p', { cls: 'tr-nota tr-av', txt: 'Reglas de ' + (cap.nombre || p.canal) + ' (verifica siempre la política vigente): ' + (cap.politica || '') }), banderas.length ? U.nota('Pendiente en Calidad: ' + banderas.map(function (b) { return b.id; }).join(', ') + '.', 'tr-mal') : U.nota('Sin banderas de riesgo detectadas (no es una garantía).', 'tr-ok'), cont, prog,
      U.acciones([U.btn('Marcar como listo', function () { if (!res() && !g.confirm('Faltan comprobaciones. ¿Marcar como listo igualmente?')) return; p.estado = 'listo'; guardar(p).then(function () { T.aviso('Pieza lista.'); }); }, 'tr-pri')])]);
  }
  function estudio(c) {
    var p = actual(); if (!p) { c.appendChild(U.vacio('Elige una pieza en «Piezas» para abrir su estudio.')); return; }
    function rf() { sub.refrescar(); }
    c.appendChild(h('h2', { cls: 'cia-h2', txt: p.titulo || '(sin título)' }));
    [datosPieza(p, null, rf), seccionGuion(p), seccionTitulos(p, rf), seccionMiniatura(p), seccionDescripcion(p), seccionPrompts(p), seccionCheck(p)].forEach(function (d) { c.appendChild(d); });
  }

  /* ---------- series ---------- */
  function series(c) {
    var n = { nombre: '', descripcion: '', formato: 'corto', canal: A.canales()[0] || 'youtube', formula: 'Episodio {n}: {tema}' }, cont = h('div', {});
    c.appendChild(U.panel('Nueva serie', [U.txt(n, 'nombre', 'Nombre de la serie', {}), U.txt(n, 'descripcion', 'Descripción', {}), U.fila([U.sel(opcFormato(), n.formato, function (v) { n.formato = v; }, 'Formato'), U.sel(opcCanal(), n.canal, function (v) { n.canal = v; }, 'Canal')]), U.txt(n, 'formula', 'Fórmula de título', { ayuda: '{n} = número de episodio, {tema} = el tema del episodio.' }), U.acciones([U.btn('Crear serie', async function () { if (!n.nombre.trim()) { T.aviso('Pon un nombre.', 'error'); return; } await A.guardarCol('series', Object.assign({}, n)); n.nombre = ''; sub.refrescar(); }, 'tr-pri')])]));
    c.appendChild(cont); if (!A.series.length) cont.appendChild(U.vacio('Aún no hay series. Una serie da continuidad a tus episodios.'));
    A.series.forEach(function (s) {
      var eps = A.piezas.filter(function (p) { return p.serie === s.id; }), tema = { t: '' };
      cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h3', { txt: s.nombre + ' · ' + eps.length + ' episodios' }), h('p', { cls: 'tr-ayuda', txt: s.descripcion || '' }), h('ul', {}, eps.map(function (p) { return h('li', {}, [p.titulo + ' ', U.btn('Abrir', function () { X.abrir(p.id); }, 'tr-chico')]); })), U.txt(tema, 't', 'Tema del próximo episodio', {}),
        U.acciones([U.btn('Crear episodio', async function () { var num = eps.length + 1, t = (s.formula || 'Episodio {n}: {tema}').replace('{n}', num).replace('{tema}', tema.t || 'por definir'), r = await guardar(D.nuevaPieza(A.proyecto.id, { titulo: t, formato: s.formato, canal: s.canal, serie: s.id, tema: tema.t })); X.abrir(r.id); }), U.btn('Borrar serie', async function () { if (!g.confirm('¿Borrar la serie? Las piezas se conservan.')) return; for (var i = 0; i < eps.length; i++) { eps[i].serie = ''; await guardar(eps[i]); } await A.borrarCol('series', s.id); sub.refrescar(); }, 'tr-peli')])]));
    });
  }

  /* ---------- biblioteca de prompts ---------- */
  var EJEMPLOS = [['Retrato de personaje constante', 'imagen', 'Personaje [NOMBRE]: [descripción fija: pelo, ropa, rasgos]. Ilustración plana, fondo limpio, misma paleta del canal. Pose: [pose]. Evitar: texto, logotipos, rostros de personas reales.'], ['Locución de marca', 'voz', 'Voz [cálida y cercana], español neutro, ritmo medio con pausas en los puntos, sonrisa audible. No imitar a ninguna persona real. Texto: [texto].'], ['Plano de transición', 'video', 'Clip de 5 s, plano medio, movimiento lento de cámara hacia adelante, [escena]. Sin texto incrustado ni marcas reales. Formato 9:16.'], ['Pedir ideas', 'texto', 'Actúa como estratega de contenido para [nicho]. Dame 10 ideas sobre [pilar] con gancho de una línea y el formato ideal. Sin cifras inventadas.']];
  function biblioteca(c) {
    var f = { q: '', tipo: '' }, n = { nombre: '', tipo: 'imagen', texto: '', etiquetas: '' }, cont = h('div', {});
    function pint() { cont.textContent = ''; var l = A.prompts.filter(function (x) { return (!f.tipo || x.tipo === f.tipo) && (!f.q || (x.nombre + ' ' + x.texto + ' ' + (x.etiquetas || '')).toLowerCase().indexOf(f.q.toLowerCase()) >= 0); }); if (!l.length) cont.appendChild(U.vacio('Biblioteca vacía o sin coincidencias.')); l.forEach(function (x) { cont.appendChild(h('div', { cls: 'cia-tarjeta' }, [h('div', { cls: 'cia-cab' }, [h('b', { txt: x.nombre }), U.etiqueta(x.tipo)]), h('pre', { cls: 'cia-pre', txt: x.texto }), U.acciones([U.copiarBtn(x.texto), U.btn('Borrar', async function () { await A.borrarCol('prompts', x.id); pint(); }, 'tr-chico tr-peli')])])); }); }
    var tipos = [['imagen', 'Imagen'], ['voz', 'Voz'], ['video', 'Video'], ['texto', 'Texto']];
    c.appendChild(U.panel('Nuevo prompt reutilizable', [U.txt(n, 'nombre', 'Nombre', {}), U.sel(tipos, n.tipo, function (v) { n.tipo = v; }, 'Tipo'), U.txt(n, 'texto', 'Prompt (usa [corchetes] para las partes variables)', { area: true, filas: 4 }), U.txt(n, 'etiquetas', 'Etiquetas', {}), U.acciones([U.btn('Guardar', async function () { if (!n.nombre.trim() || !n.texto.trim()) { T.aviso('Nombre y texto son obligatorios.', 'error'); return; } await A.guardarCol('prompts', Object.assign({}, n)); n.nombre = ''; n.texto = ''; sub.refrescar(); }, 'tr-pri'), U.btn('Cargar 4 ejemplos', async function () { for (var i = 0; i < EJEMPLOS.length; i++) await A.guardarCol('prompts', { nombre: EJEMPLOS[i][0], tipo: EJEMPLOS[i][1], texto: EJEMPLOS[i][2], etiquetas: 'ejemplo' }); sub.refrescar(); })])]));
    c.appendChild(U.panel('Biblioteca', [U.fila([U.txt(f, 'q', 'Buscar', {}, pint), U.sel([['', 'Todos']].concat(tipos), f.tipo, function (v) { f.tipo = v; pint(); }, 'Tipo')]), cont])); pint();
  }
  X.iniciar = function (cont) {
    sub = X.sub = U.subpestanas(cont, 'Secciones de producción', [['piezas', 'Piezas', piezas], ['estudio', 'Estudio', estudio], ['series', 'Series', series], ['biblioteca', 'Prompts', biblioteca]]);
    A.on('proyecto', function () { selId = null; sub.ir('piezas'); });
  };
  g.CProduccion = X;
})(window);
