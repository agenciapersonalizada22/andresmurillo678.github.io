/* Aplicacion: estado, proyectos, edicion, reproduccion, atajos y mando. VE.app (window.__VE para pruebas) */
(function (g) {
  var VE = g.VE, M = VE.modelo, K = VE.keyframes, F = VE.fuentes, AL = VE.almacen, C = VE.cap, S = VE.subtitulos, SN = VE.sonidos, h = VE.h, $ = VE.$;
  var A = { p: null, sel: null, cfg: {}, easeKf: 'suave', estiloSub: { estilo: 'subtitulo', color: '#ffffff', tam: 0.05, y: 0.32 }, cap: {} };
  VE.app = A; g.__VE = A; A.linea = VE.linea;
  var guardarT = 0, sucio = false, tokenDib = 0, ultLiberar = 0;

  /* ---- avisos ---- */
  A.estado = function (t) { $('estado').textContent = t || ''; };
  A.toast = function (msg, o) {
    o = o || {}; var t = h('div', { class: 'toast', role: 'status' }, h('span', { texto: msg }), o.accion ? h('button', { onclick: function () { o.accion(); t.remove(); } }, o.texto || 'Deshacer') : null);
    $('avisos').appendChild(t); setTimeout(function () { t.remove(); }, o.ms || 3200); while ($('avisos').children.length > 3) $('avisos').firstChild.remove();
  };
  A.clipSel = function () { var f = A.sel && M.buscar(A.p, A.sel); return f ? f.clip : null; };

  /* ---- configuracion ---- */
  A.cfg = Object.assign({ tema: 'auto', previaLado: 720, limiteMB: 1500, webgl: true }, AL.clave('cfg') || {});
  A.aplicarTema = function () { var r = document.documentElement; if (A.cfg.tema === 'auto') r.removeAttribute('data-tema'); else r.setAttribute('data-tema', A.cfg.tema); };
  A.guardarCfg = function () { AL.clave('cfg', A.cfg); A.aplicarTema(); F.limiteMB = A.cfg.limiteMB; if (A.comp) { A.crearCompositor(); A.ajustarLienzo(); A.buscarYDibujar(); } };
  A.crearCompositor = function () { A.comp = new VE.Compositor($('lienzo'), A.cfg.webgl ? {} : { sinGL: true }); };

  /* ---- lienzo y dibujo ---- */
  A.ajustarLienzo = function () {
    var d = M.dims(A.p), k = A.cfg.previaLado / Math.max(d[0], d[1]), w = Math.round(d[0] * k / 2) * 2, hh = Math.round(d[1] * k / 2) * 2;
    if ($('lienzo').width !== w || $('lienzo').height !== hh) A.comp.tamano(w, hh);
    var c = $('lienzo'); c.style.aspectRatio = w + '/' + hh; $('selAspecto').value = A.p.aspecto;
  };
  A.dibujar = function () {
    if (!A.p) return; A.comp.dibujar(A.p, A.motor.t, F); $('avisoVacio').style.display = M.todos(A.p).length ? 'none' : '';
  };
  A.buscarYDibujar = async function () {
    var tk = ++tokenDib, t = A.motor.t, act = M.activos(A.p, t);
    if (!A.motor.jugando) {
      await F.preparar(act, t); if (tk !== tokenDib) return;
      var ids = {}; M.activos(A.p, t + 1.5).concat(act).forEach(function (c) { ids[c.id] = 1; }); F.liberar(ids);
    }
    A.dibujar();
  };
  A.sincronizarVideo = function (t) {
    var act = M.activos(A.p, t), prox = M.activos(A.p, t + 0.8).filter(function (c) { return act.indexOf(c) < 0; });
    F.sincronizar(act, t, prox);
    if (performance.now() - ultLiberar > 1500) { ultLiberar = performance.now(); var ids = {}; act.concat(prox).forEach(function (c) { ids[c.id] = 1; }); F.liberar(ids); }
  };
  A.alTiempo = function (t) { $('tiempo').textContent = M.fmt(t) + ' / ' + M.fmt(M.duracion(A.p)); VE.linea.cabezal(t); };
  A.alCambiarReproduccion = function (j) { var b = $('btnPlay'); b.textContent = j ? '⏸' : '▶'; b.setAttribute('aria-label', j ? 'Pausar' : 'Reproducir'); };

  /* ---- cambios y deshacer ---- */
  A.commit = function (clave, ligero) {
    A.p.mod = Date.now(); A.hist.commit(A.p, clave); programarGuardado(); botonesHist();
    VE.linea.render(); A.alTiempo(A.motor.t);
    if (!ligero) { A.ajustarLienzo(); A.buscarYDibujar(); VE.insp.render(); if (['medios', 'subtitulos', 'efectos'].indexOf(VE.paneles.tab) >= 0) VE.paneles.render(); }
  };
  A.refrescar = function () {
    A.ajustarLienzo(); VE.linea.render(); VE.insp.render(); VE.paneles.render(); botonesHist(); A.alTiempo(A.motor.t); A.buscarYDibujar();
  };
  A.refrescarInspector = function () { VE.insp.render(); if (VE.paneles.tab === 'efectos') VE.paneles.render(); };
  function botonesHist() { $('btnDeshacer').disabled = !A.hist.puedeDeshacer(); $('btnRehacer').disabled = !A.hist.puedeRehacer(); $('nombreProy').textContent = A.p.nombre; }
  function reemplazar(p) { A.p = p; if (A.sel && !M.buscar(p, A.sel)) A.sel = null; A.motor.t = Math.min(A.motor.t, Math.max(0, M.duracion(p))); programarGuardado(); A.refrescar(); }
  A.deshacer = function () { var p = A.hist.deshacer(); if (p) reemplazar(p); };
  A.rehacer = function () { var p = A.hist.rehacer(); if (p) reemplazar(p); };
  A.seleccionar = function (id, soloMarcar) {
    A.sel = id; document.querySelectorAll('.clip').forEach(function (e) { var s = e.dataset.id === id; e.classList.toggle('sel', s); e.setAttribute('aria-pressed', String(s)); });
    if (!soloMarcar) VE.linea.render(); VE.insp.render(); if (VE.paneles.tab === 'efectos') VE.paneles.render();
  };

  /* ---- guardado ---- */
  function programarGuardado() { sucio = true; clearTimeout(guardarT); guardarT = setTimeout(A.guardarAhora, 700); }
  function miniatura() {
    try { var c = $('lienzo'), k = 96 / Math.max(c.width, c.height), t = document.createElement('canvas'); t.width = Math.max(1, Math.round(c.width * k)); t.height = Math.max(1, Math.round(c.height * k)); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', 0.6); } catch (e) { return ''; }
  }
  A.guardarAhora = async function () {
    clearTimeout(guardarT); if (!sucio || !A.p) return; sucio = false;
    try { await AL.guardarProyecto(A.p, miniatura()); AL.clave('ultimo', A.p.id); A.estado('Guardado'); setTimeout(function () { if ($('estado').textContent === 'Guardado') A.estado(''); }, 1500); } catch (e) { sucio = true; A.estado('No se pudo guardar'); A.toast('No se pudo guardar el proyecto (¿almacenamiento lleno?). Exporta una copia del proyecto.'); }
  };

  /* ---- proyectos ---- */
  A.cargarEnMemoria = function (p) {
    A.p = p; A.hist = new M.Historia(p); A.sel = null; A.motor.pausar(); A.motor.t = 0; A.motor.invalidar();
    Object.keys(F.medios).forEach(function (id) { if (!p.medios[id]) F.liberarMedio(id); }); F.liberar({});
    Object.keys(p.medios).forEach(function (id) { if (p.medios[id].gen && !F.medios[id]) F.registrarGenerado(p.medios[id]); });
    AL.clave('ultimo', p.id); A.refrescar(); VE.linea.ajustar();
  };
  A.nuevoProyecto = async function (aspecto) { await A.guardarAhora(); var p = M.nuevo({ aspecto: aspecto || '9:16' }); sucio = true; A.cargarEnMemoria(p); await A.guardarAhora(); };
  A.abrirProyecto = async function (id) {
    await A.guardarAhora(); var p = await AL.cargarProyecto(id); if (!p) throw new Error('Proyecto no encontrado');
    var perdidos = 0; A.estado('Abriendo proyecto…');
    for (var id2 in p.medios) {
      var m = p.medios[id2]; if (m.gen) continue;
      if (!F.medios[id2]) { var b = await AL.cargarMedio(p.id, id2); if (b) { try { var dur = m.dur; await F.registrar(m, b); if (m.tipo !== 'imagen' && dur) m.dur = dur; } catch (e) { perdidos++; m.perdido = true; } } else { perdidos++; m.perdido = true; } }
    }
    A.estado(''); A.cargarEnMemoria(p); if (perdidos) A.toast(perdidos + ' medio(s) no se pudieron recuperar.');
  };
  A.papelera = async function (id, on) {
    var r = await AL.get('proyectos', id); if (!r) return; r.papelera = on ? Date.now() : 0; r.mod = Date.now(); await AL.set('proyectos', id, r);
    if (on && id === A.p.id) { var l = (await AL.lista()).filter(function (x) { return !x.papelera; }); if (l.length) await A.abrirProyecto(l[0].id); else await A.nuevoProyecto(A.p.aspecto); }
  };
  A.borrarProyectoDefinitivo = async function (id) { await AL.borrar('proyectos', id); await AL.borrarMedios(id); };
  A.duplicarProyecto = async function (id) {
    await A.guardarAhora(); var p = await AL.cargarProyecto(id), nid = M.uid('p'), ant = p.id; p.id = nid; p.nombre += ' (copia)'; p.creado = Date.now();
    for (var mid in p.medios) { if (p.medios[mid].gen) continue; var b = await AL.cargarMedio(ant, mid); if (b) await AL.guardarMedio(nid, mid, b); }
    await AL.guardarProyecto(p, (await AL.get('proyectos', ant)).mini);
  };
  A.renombrarProyecto = async function (id, n) { if (id === A.p.id) { A.p.nombre = n; A.commit('nombre'); await A.guardarAhora(); } else { var p = await AL.cargarProyecto(id), r = await AL.get('proyectos', id); p.nombre = n; await AL.guardarProyecto(p, r.mini); } };
  A.exportarProyectoArchivo = async function () {
    await A.guardarAhora(); var blobs = {}; Object.keys(A.p.medios).forEach(function (id) { var e = F.medios[id]; if (e && e.blob) blobs[id] = e.blob; });
    VE.descargar(VE.paquete.empaquetar(A.p, blobs), VE.nombreSeguro(A.p.nombre) + '.cvp'); A.toast('Proyecto exportado con sus medios.');
  };
  A.importarProyectoBlob = async function (blob) {
    var r = await VE.paquete.leer(blob), p = r.proyecto; p.id = M.uid('p'); p.nombre += ' (importado)';
    for (var id in r.medios) await AL.guardarMedio(p.id, id, r.medios[id]);
    await AL.guardarProyecto(p, ''); await A.abrirProyecto(p.id);
  };
  A.importarProyectoArchivo = function () { A.pedirArchivos('.cvp'); };

  /* ---- importacion ---- */
  A.pedirArchivos = function (accept) { var i = $('archivos'); i.accept = accept || 'video/*,image/*,audio/*,.srt,.vtt,.cvp'; i.value = ''; i.click(); };
  A.revisarMemoria = function () {
    var mb = F.memoriaMB(), pm = performance && performance.memory;
    if (mb > A.cfg.limiteMB * 0.8) A.toast('Memoria de medios alta (' + mb.toFixed(0) + ' MB de ' + A.cfg.limiteMB + ' MB). Quita medios que no uses o sube el límite en Ajustes.', { ms: 7000 });
    else if (pm && pm.usedJSHeapSize > pm.jsHeapSizeLimit * 0.8) A.toast('El navegador se está quedando sin memoria. Guarda y reduce el proyecto.', { ms: 7000 });
  };
  A.agregarMedios = async function (files, colocar) {
    for (var i = 0; i < files.length; i++) {
      var f = files[i], n = f.name || 'medio';
      try {
        if (/\.cvp$/i.test(n)) { await A.importarProyectoBlob(f); continue; }
        if (/\.(srt|vtt)$/i.test(n)) { var cs = S.parsear(await f.text()); if (cs.length) { A.crearSubtitulos(cs); A.toast(cs.length + ' subtítulos importados.'); } else A.toast('El archivo no contiene subtítulos válidos.'); continue; }
        if (!F.tipoDe(f, n)) { A.toast('Formato no admitido: ' + n); continue; }
        if (F.memoriaMB() + f.size / 1048576 > A.cfg.limiteMB) { A.toast('No se añadió ' + n + ': superaría el límite de memoria (' + A.cfg.limiteMB + ' MB). Cámbialo en Ajustes.', { ms: 7000 }); continue; }
        A.estado('Importando ' + n + '…'); var m = await F.agregar(f, n); A.p.medios[m.id] = m; await AL.guardarMedio(A.p.id, m.id, f);
        if (colocar !== false) A.agregarClipDeMedio(m.id, { sinCommit: true });
        A.commit('importar');
      } catch (e) { A.toast('No se pudo importar ' + n + ': ' + e.message); }
    }
    A.estado(''); A.revisarMemoria(); VE.paneles.render();
  };
  A.quitarMedio = function (id) { delete A.p.medios[id]; A.commit('quitarMedio'); };

  /* ---- insercion de clips ---- */
  function auto_aspecto(m) {
    if (M.todos(A.p).length || !m.w) return; var r = m.w / m.h, a = r > 1.2 ? '16:9' : r < 0.85 ? '9:16' : '1:1'; if (A.p.aspecto !== a) { A.p.aspecto = a; A.ajustarLienzo(); }
  }
  function finVideo() { var t = 0; A.p.pistas.forEach(function (pt) { if (pt.tipo === 'video') pt.clips.forEach(function (c) { t = Math.max(t, M.fin(c)); }); }); return t; }
  A.agregarClipDeMedio = function (id, o) {
    o = o || {}; var m = A.p.medios[id]; if (!m) return null; auto_aspecto(m);
    var vis = m.tipo === 'video' || m.tipo === 'imagen', ini = o.ini != null ? o.ini : (vis ? finVideo() : A.motor.t), c = M.clip(m.tipo, { medio: id, ini: ini, dur: m.tipo === 'imagen' ? 4 : m.dur, off: 0 });
    if (m.tipo === 'audio') c.nombre = m.nombre;
    var pi = o.pistaId ? A.p.pistas.filter(function (t) { return t.id === o.pistaId; })[0] : null;
    if (pi && !M.compatible(pi, c)) o.pistaId = null;
    if (pi && pi.tipo === 'video' && !M.libre(pi, c.ini, c.dur)) { var u = M.ubicar(pi, c, c.ini); if (u !== null) c.ini = u; }
    M.agregar(A.p, c, o.pistaId); var f = M.buscar(A.p, c.id);
    if (f.pista.tipo === 'pip' && (m.tipo === 'video' || m.tipo === 'imagen')) { c.esc = 0.45; c.x = 0.24; c.y = -0.26; c.radio = 0.08; }
    A.sel = c.id; if (!o.sinCommit) A.commit('add'); return c;
  };
  A.agregarTexto = function (pr) {
    var c = M.clip('texto', { texto: pr.n === 'Subtítulo' ? 'Tu subtítulo' : 'Tu texto aquí', ini: A.motor.t, dur: pr.dur || 3, estilo: pr.estilo, tam: pr.tam, y: pr.y || 0, color: pr.color || '#ffffff', color2: pr.color2, fuente: pr.fuente || 'sans', ancho: pr.ancho, anim: Object.assign({ in: 'ninguna', out: 'ninguna', dur: 0.5, cont: 'ninguna' }, pr.anim) });
    M.agregar(A.p, c); A.sel = c.id; A.commit('add'); A.buscarYDibujar();
  };
  A.agregarPegatina = function (o) {
    var c = M.clip(o.tipo, { texto: o.texto, forma: o.forma, color: o.color, ini: A.motor.t, dur: 3, tam: o.tipo === 'emoji' ? 0.2 : 0.25, anim: Object.assign({ in: 'zoom', out: 'fundido', dur: 0.4, cont: 'ninguna' }, o.anim) });
    M.agregar(A.p, c); A.sel = c.id; A.commit('add'); A.buscarYDibujar();
  };
  A.medioGenerado = function (tipo, id, nombre, dur) {
    var existente = Object.keys(A.p.medios).map(function (k) { return A.p.medios[k]; }).filter(function (m) { return m.gen && m.gen.tipo === tipo && m.gen.id === id && Math.abs(m.gen.dur - dur) < 0.01; })[0];
    if (existente) return existente;
    var m = { id: M.uid('m'), tipo: 'audio', nombre: nombre, dur: dur, gen: { tipo: tipo, id: id, dur: dur }, w: 0, h: 0 }; A.p.medios[m.id] = m; F.registrarGenerado(m); return m;
  };
  A.agregarAudioGenerado = function (tipo, id, nombre) {
    var dur = tipo === 'musica' ? Math.max(10, Math.min(120, Math.ceil(M.duracion(A.p) - A.motor.t) || 30)) : (SN.EFECTOS.filter(function (e) { return e.id === id; })[0] || { dur: 1 }).dur;
    var m = A.medioGenerado(tipo, id, nombre, dur), c = M.clip('audio', { medio: m.id, ini: A.motor.t, dur: dur, nombre: nombre, vol: tipo === 'musica' ? 0.6 : 1, fo: tipo === 'musica' ? 1.5 : 0 });
    M.agregar(A.p, c, tipo === 'musica' ? 't_musica' : 't_audio'); A.sel = c.id; A.commit('add'); A.toast(nombre + ' añadido.');
  };

  /* ---- ediciones ---- */
  A.dividir = function () {
    var t = A.motor.t, c = A.clipSel(), n = 0;
    var cl = c && t > c.ini && t < M.fin(c) ? [c] : M.activos(A.p, t);
    cl.forEach(function (x) { if (M.dividir(A.p, x.id, t)) n++; });
    if (n) { A.commit('dividir'); A.refrescar(); } else A.toast('Coloca el cursor dentro del clip para dividirlo.');
  };
  A.duplicar = function () { var c = A.clipSel(); if (!c) return; var r = M.duplicar(A.p, c.id); if (r) { A.sel = r.id; A.commit('duplicar'); A.refrescar(); } };
  A.eliminarClip = function (id, ripple) { var ant = JSON.stringify(A.p); if (M.eliminar(A.p, id, ripple)) { if (A.sel === id) A.sel = null; A.commit('eliminar'); A.refrescar(); } };
  A.eliminarSel = function (ripple) { if (A.sel) A.eliminarClip(A.sel, ripple === undefined ? $('tlRipple').checked : ripple); else A.toast('Selecciona un clip para eliminarlo.'); };
  A.congelar = function () { var c = A.clipSel(); if (!c) return; var f = M.congelar(A.p, c.id, Math.min(Math.max(A.motor.t, c.ini + 0.05), M.fin(c) - 0.05), 2); if (f) { A.sel = f.id; A.commit('congelar'); A.refrescar(); } };
  A.extraerAudio = function () { var c = A.clipSel(); if (!c) return; var a = M.extraerAudio(A.p, c.id); if (a) { A.sel = a.id; A.commit('extraer'); A.refrescar(); A.toast('Audio extraído a su propia pista.'); } };
  A.aplicarFiltro = function (k) { var c = A.clipSel(); if (!c || (c.tipo !== 'video' && c.tipo !== 'imagen')) return A.toast('Selecciona un clip de video o foto.'); c.filtro = k; A.commit('filtro'); A.buscarYDibujar(); };
  A.aplicarTransicion = function (tipo, dur) {
    var c = A.clipSel(); if (!c) return A.toast('Selecciona un clip.');
    if (tipo === 'ninguna') c.trans = null; else { c.trans = { tipo: tipo, dur: dur || (c.trans && c.trans.dur) || 0.6 }; c.trans.dur = Math.min(c.trans.dur, c.dur); var f = M.buscar(A.p, c.id); if (!f.pista.clips.some(function (o) { return o !== c && Math.abs(M.fin(o) - c.ini) < 0.06; })) A.toast('Para ver la transición, pega este clip justo después de otro en la misma pista.'); }
    A.commit('trans'); A.buscarYDibujar();
  };
  A.reencuadre = async function (id) {
    var c = M.buscar(A.p, id).clip; A.estado('Analizando encuadre…');
    try { c.foco = await F.analizarFoco(c); c.fit = 'cubrir'; A.commit('foco'); A.buscarYDibujar(); A.toast('Encuadre ajustado al área con más detalle. Puedes afinar el foco.'); } catch (e) { A.toast('No se pudo analizar: ' + e.message); }
    A.estado('');
  };
  A.estabilizar = async function (id) {
    var c = M.buscar(A.p, id).clip; A.estado('Estabilizando… 0%');
    try { c.estabDatos = await F.estabilizar(c, function (f) { A.estado('Estabilizando… ' + Math.round(f * 100) + '%'); }); A.commit('estab'); A.buscarYDibujar(); A.toast('Estabilización aplicada (con un 10% de zoom para ocultar bordes).'); } catch (e) { A.toast('No se pudo estabilizar: ' + e.message); }
    A.estado('');
  };
  A.aplicarPlantilla = function (id) {
    var t = VE.plantillas.LISTA.filter(function (x) { return x.id === id; })[0], vis = Object.keys(A.p.medios).map(function (k) { return A.p.medios[k]; }).filter(function (m) { return m.tipo === 'video' || m.tipo === 'imagen'; });
    if (M.todos(A.p).length && !confirm('Se reemplazará la línea de tiempo actual. Podrás deshacer. ¿Continuar?')) return;
    t.aplicar(A.p, { visuales: vis, musica: function (mid, dur) { return A.medioGenerado('musica', mid, (SN.MUSICAS.filter(function (x) { return x.id === mid; })[0] || {}).nombre || mid, dur).id; } });
    A.sel = null; A.motor.t = 0; A.commit('plantilla'); A.refrescar(); VE.linea.ajustar(); A.toast('Plantilla "' + t.nombre + '" aplicada. Edita los textos tocándolos en la línea de tiempo.');
  };

  /* ---- subtitulos ---- */
  function pistaSub() {
    var p = A.p.pistas.filter(function (t) { return t.nombre === 'Subtítulos'; })[0];
    if (!p) { p = M.addPista(A.p, 'texto', 0); p.nombre = 'Subtítulos'; } return p;
  }
  A.cuesActuales = function () { return M.todos(A.p).filter(function (c) { return c.sub; }).sort(function (a, b) { return a.ini - b.ini; }); };
  A.crearSubtitulos = function (cues, silencioso) {
    var pt = pistaSub(), es = A.estiloSub;
    cues.forEach(function (q) {
      var c = M.clip('texto', { texto: q.texto, ini: q.ini, dur: Math.max(0.3, q.fin - q.ini), estilo: es.estilo, color: es.color, tam: es.tam, y: es.y, sub: true, anim: { in: 'fundido', out: 'fundido', dur: 0.15, cont: 'ninguna' } });
      pt.clips = pt.clips.filter(function (o) { return !(o.ini < M.fin(c) - 1e-6 && M.fin(o) > c.ini + 1e-6); }); pt.clips.push(c);
    });
    M.ordenar(pt); A.commit('subs', silencioso); if (!silencioso) { A.refrescar(); } else VE.linea.render();
  };
  A.aplicarEstiloSub = function () { var es = A.estiloSub; A.cuesActuales().forEach(function (c) { c.estilo = es.estilo; c.color = es.color; c.tam = es.tam; c.y = es.y; }); A.commit('estiloSub', true); A.dibujar(); };
  A.desplazarSubs = function (dt) { A.cuesActuales().forEach(function (c) { c.ini = Math.max(0, c.ini + dt); }); A.commit('subDesp'); A.dibujar(); };
  A.moverSub = function (id, ini, fin) {
    var c = M.buscar(A.p, id).clip; if (ini !== null) { var f = M.fin(c); c.ini = Math.max(0, ini); c.dur = Math.max(0.1, f - c.ini); } if (fin !== null) c.dur = Math.max(0.1, fin - c.ini);
    A.commit('subMov', true); A.dibujar();
  };
  A.textoSub = function (id, t) { M.buscar(A.p, id).clip.texto = t; A.commit('subTxt', true); A.dibujar(); };
  A.importarSubtitulosArchivo = function () { A.pedirArchivos('.srt,.vtt,text/vtt,application/x-subrip'); };
  var dictado = null;
  A.alternarDictado = function (lang, est, btn) {
    if (dictado) { dictado.detener(); dictado = null; A.motor.pausar(); btn.textContent = '🎙 Dictar y reproducir'; est.textContent = 'Dictado detenido.'; VE.paneles.render(); return; }
    dictado = VE.voz.iniciar(lang, function () { return A.motor.t; }, function (c) { A.crearSubtitulos([c], true); est.textContent = 'Añadido: ' + c.texto; }, function (t) { est.textContent = t; });
    if (!dictado) return A.toast('Reconocimiento de voz no disponible.');
    btn.textContent = '■ Detener dictado'; est.textContent = 'Escuchando… (se reproduce la línea de tiempo)'; A.motor.reproducir();
  };

  /* ---- transporte ---- */
  function cableado() {
    $('btnPlay').onclick = function () { A.motor.alternar(); };
    $('btnInicio').onclick = function () { A.motor.ir(0); };
    $('btnAtras').onclick = function () { A.motor.ir(M.siguienteCorte(A.p, A.motor.t, -1)); };
    $('btnAdelante').onclick = function () { A.motor.ir(M.siguienteCorte(A.p, A.motor.t, 1)); };
    $('btnBucle').onclick = function () { A.motor.bucle = !A.motor.bucle; this.setAttribute('aria-pressed', String(A.motor.bucle)); };
    $('volMaster').oninput = function () { A.motor.vol = +this.value; if (A.motor.gan) A.motor.gan.gain.value = A.motor.vol; };
    $('btnDeshacer').onclick = A.deshacer; $('btnRehacer').onclick = A.rehacer;
    $('btnProyectos').onclick = function () { A.dlg.proyectos(); }; $('btnExportar').onclick = function () { A.dlg.exportar(); }; $('btnAyuda').onclick = function () { A.dlg.ayuda(); }; $('btnAjustes').onclick = function () { A.dlg.ajustes(); };
    $('btnTema').onclick = function () { var o = ['auto', 'claro', 'oscuro'], i = (o.indexOf(A.cfg.tema) + 1) % 3; A.cfg.tema = o[i]; A.guardarCfg(); A.toast('Tema: ' + o[i]); };
    $('tlDividir').onclick = A.dividir; $('tlDuplicar').onclick = A.duplicar; $('tlEliminar').onclick = function () { A.eliminarSel(); };
    $('tlMarcador').onclick = function () { M.addMarcador(A.p, A.motor.t, ''); A.commit('marcador'); };
    $('tlPista').onclick = function () {
      var d = VE.dlg.abrir('Añadir pista', h('div', { class: 'lista' }, [['video', 'Video / fotos'], ['pip', 'Superposición (PiP, croma)'], ['texto', 'Texto y pegatinas'], ['audio', 'Audio'], ['musica', 'Música']].map(function (t) { return h('div', { class: 'item' }, h('div', { class: 't', texto: t[1] }), h('button', { class: 'btn chico prim', onclick: function () { M.addPista(A.p, t[0]); A.commit('pista'); d.close(); } }, 'Añadir')); })), 420);
    };
    $('selAspecto').onchange = async function () {
      A.p.aspecto = this.value; A.ajustarLienzo(); A.commit('aspecto'); A.buscarYDibujar();
      var vis = M.todos(A.p).filter(function (c) { return (c.tipo === 'video' || c.tipo === 'imagen') && c.fit === 'cubrir' && !c.foco; }).slice(0, 12);
      if (vis.length) { A.estado('Reencuadre inteligente…'); for (var i = 0; i < vis.length; i++) { try { vis[i].foco = await F.analizarFoco(vis[i]); } catch (e) {} } A.commit('reencuadre'); A.estado(''); A.buscarYDibujar(); A.toast('Formato cambiado: se reencuadraron ' + vis.length + ' clip(s).', { accion: A.deshacer, texto: 'Deshacer' }); }
    };
    $('archivos').onchange = function () { A.agregarMedios([].slice.call(this.files)); };
    document.querySelectorAll('#inferior button').forEach(function (b) {
      b.onclick = function () {
        var ir = b.dataset.ir, app = $('app'), tabs = { medios: 'medios', texto: 'texto', audio: 'audio', efectos: 'efectos' };
        if (ir === 'mas') { var d = VE.dlg.abrir('Más herramientas', h('div', { class: 'lista' }, [['Proyectos', function () { A.dlg.proyectos(); }], ['Cambiar tema (claro/oscuro/auto)', function () { $('btnTema').click(); }], ['Pegatinas y formas', function () { hoja('izq', 'pegatinas'); }], ['Plantillas', function () { hoja('izq', 'plantillas'); }], ['Subtítulos', function () { hoja('izq', 'subtitulos'); }], ['Ayuda y atajos', function () { A.dlg.ayuda(); }], ['Ajustes', function () { A.dlg.ajustes(); }]].map(function (x) { return h('div', { class: 'item' }, h('button', { class: 'btn', estilo: 'flex:1', onclick: function () { d.close(); x[1](); } }, x[0])); })), 380); return; }
        if (ir === 'ajustes') return hoja('der'); hoja('izq', tabs[ir]);
      };
    });
    $('centro').addEventListener('click', function () { $('app').removeAttribute('data-hoja'); marcarNav(null); });
  }
  var hojaActual = null;
  function hoja(cual, tab) {
    var app = $('app'), clave = cual + (tab || ''); if (hojaActual === clave) { app.removeAttribute('data-hoja'); hojaActual = null; marcarNav(null); return; }
    hojaActual = clave; app.dataset.hoja = cual; if (tab) VE.paneles.ir(tab); else VE.insp.render();
    marcarNav(cual === 'der' ? 'ajustes' : ({ medios: 'medios', texto: 'texto', audio: 'audio', efectos: 'efectos' }[tab] || 'mas'));
  }
  function marcarNav(ir) { document.querySelectorAll('#inferior button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ir === ir)); }); if (!ir) hojaActual = null; }

  /* ---- teclado y mando ---- */
  function teclado() {
    document.addEventListener('keydown', function (e) {
      var tg = e.target, edit = tg && (tg.tagName === 'INPUT' && tg.type !== 'range' && tg.type !== 'checkbox' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
      if (document.querySelector('dialog[open]') || document.getElementById('prompter')) return;
      var ctrl = e.ctrlKey || e.metaKey, k = e.key;
      if (ctrl && k.toLowerCase() === 'z') { if (edit) return; e.preventDefault(); e.shiftKey ? A.rehacer() : A.deshacer(); return; }
      if (ctrl && k.toLowerCase() === 'y') { if (edit) return; e.preventDefault(); A.rehacer(); return; }
      if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); sucio = true; A.guardarAhora().then(function () { A.toast('Proyecto guardado.'); }); return; }
      if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); A.duplicar(); return; }
      if (edit || ctrl || e.altKey) return;
      var fps = A.p.fps || 30, hecho = true;
      if (k === ' ' || k === 'k' || k === 'K') { if (tg.tagName === 'BUTTON' && k === ' ') return; A.motor.alternar(); }
      else if (k === 'l' || k === 'L') { if (!A.motor.jugando) A.motor.reproducir(); }
      else if (k === 'j' || k === 'J') A.motor.ir(A.motor.t - 1);
      else if (k === 'ArrowLeft') A.motor.ir(A.motor.t - (e.shiftKey ? 1 : 1 / fps));
      else if (k === 'ArrowRight') A.motor.ir(A.motor.t + (e.shiftKey ? 1 : 1 / fps));
      else if (k === 'ArrowUp') A.motor.ir(M.siguienteCorte(A.p, A.motor.t, -1));
      else if (k === 'ArrowDown') A.motor.ir(M.siguienteCorte(A.p, A.motor.t, 1));
      else if (k === 's' || k === 'S') A.dividir();
      else if (k === 'Delete' || k === 'Backspace') { if (tg.classList && tg.classList.contains('clip') || tg === document.body || tg.closest && tg.closest('#linea')) A.eliminarSel(e.shiftKey ? true : $('tlRipple').checked); else hecho = false; }
      else if (k === 'm' || k === 'M') { M.addMarcador(A.p, A.motor.t, ''); A.commit('marcador'); }
      else if (k === 'n' || k === 'N') { $('tlIman').checked = !$('tlIman').checked; A.toast('Imán ' + ($('tlIman').checked ? 'activado' : 'desactivado')); }
      else if (k === '+' || k === '=') VE.linea.zoomEn(1.3); else if (k === '-') VE.linea.zoomEn(1 / 1.3);
      else if (k === 'Home') A.motor.ir(0); else if (k === 'End') A.motor.ir(M.duracion(A.p));
      else if (k === '?') A.dlg.ayuda();
      else if (k === 'Escape') { A.seleccionar(null); }
      else hecho = false;
      if (hecho) e.preventDefault();
    });
  }
  function mando() {
    if (!g.Mando) return; var ult = performance.now();
    (function bucle(t) {
      var dt = Math.min(0.1, (t - ult) / 1000); ult = t; g.Mando.leer();
      if (g.Mando.conectado && !document.querySelector('dialog[open]')) {
        var m = g.Mando, fps = A.p.fps || 30;
        if (m.pulsado('A')) A.motor.alternar(); if (m.pulsado('LB')) A.motor.ir(M.siguienteCorte(A.p, A.motor.t, -1)); if (m.pulsado('RB')) A.motor.ir(M.siguienteCorte(A.p, A.motor.t, 1));
        if (m.pulsado('X')) A.dividir(); if (m.pulsado('Y')) { M.addMarcador(A.p, A.motor.t, ''); A.commit('marcador'); } if (m.pulsado('B')) A.deshacer();
        if (m.pulsado('IZQ')) A.motor.ir(A.motor.t - 1 / fps); if (m.pulsado('DER')) A.motor.ir(A.motor.t + 1 / fps);
        if (!A.motor.jugando && Math.abs(m.ejes.izq.x) > 0.2) A.motor.ir(A.motor.t + m.ejes.izq.x * Math.abs(m.ejes.izq.x) * 6 * dt);
      }
      requestAnimationFrame(bucle);
    })(ult);
  }
  function arrastrarSoltar() {
    var zona = $('dropZona'), n = 0;
    document.addEventListener('dragenter', function (e) { if (e.dataTransfer && e.dataTransfer.types.indexOf('Files') >= 0) { n++; zona.hidden = false; } });
    document.addEventListener('dragleave', function () { n = Math.max(0, n - 1); if (!n) zona.hidden = true; });
    document.addEventListener('dragover', function (e) { if (e.dataTransfer && e.dataTransfer.types.indexOf('Files') >= 0) e.preventDefault(); });
    document.addEventListener('drop', function (e) { n = 0; zona.hidden = true; if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); A.agregarMedios([].slice.call(e.dataTransfer.files)); } });
    document.addEventListener('paste', function (e) { var fs = [].slice.call(e.clipboardData && e.clipboardData.files || []); if (fs.length && !/INPUT|TEXTAREA/.test(e.target.tagName)) A.agregarMedios(fs); });
  }

  /* ---- arranque ---- */
  async function iniciar() {
    A.aplicarTema(); F.limiteMB = A.cfg.limiteMB; A.motor = new VE.Motor(A); A.crearCompositor();
    A.cap = await C.detectar(); await AL.abrir();
    var ultimo = AL.clave('ultimo'), rec = false;
    try { (await AL.lista()).forEach(function (x) { if (x.papelera && Date.now() - x.papelera > 30 * 864e5) A.borrarProyectoDefinitivo(x.id); }); } catch (e) {}
    A.p = M.nuevo(); A.hist = new M.Historia(A.p);
    VE.linea.iniciar(A); VE.paneles.iniciar(A); VE.insp.iniciar(A); VE.dlg.iniciar(A); cableado(); teclado(); mando(); arrastrarSoltar();
    if (ultimo) { try { var l = await AL.lista(); if (l.some(function (x) { return x.id === ultimo && !x.papelera; })) { await A.abrirProyecto(ultimo); rec = M.todos(A.p).length > 0; } else await A.nuevoProyecto('9:16'); } catch (e) { await A.nuevoProyecto('9:16'); } } else await A.nuevoProyecto('9:16');
    if (rec) A.toast('Proyecto recuperado: "' + A.p.nombre + '"');
    window.addEventListener('resize', function () { VE.linea.render(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { sucio = true; A.guardarAhora(); } });
    window.addEventListener('pagehide', function () { sucio = true; A.guardarAhora(); });
    A.listo = true; document.documentElement.dataset.listo = '1';
  }
  iniciar().catch(function (e) { console.error(e); A.toast('Error al iniciar: ' + e.message); });
})(window);
