/* Vista Estudio: lienzo, barra de herramientas, opciones por herramienta, entrada de imagenes (archivo, camara, portapapeles, arrastrar) y guardado. window.StApp */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, D = g.StDoc, H = g.StHerr, V = g.StVista, R = g.StRender, Dt = g.StDatos, N = g.StNucleo;
  const A = g.StApp = { aviso: (m, t) => T.aviso(m, t), logro: (id) => { try { g.CuentaTrabajos.logro(id); } catch (e) {} }, xp: (n) => { try { g.CuentaTrabajos.xp(n); } catch (e) {} }, paneles: {}, refs: {} };
  const ICON = {
    mover: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    mano: '<path d="M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v8a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 14"/>',
    borrar: '<path d="M4 16l9-9a2 2 0 013 0l3 3a2 2 0 010 3l-6 6H8zM9 20h11M8 12l5 5"/>', restaurar: '<path d="M4 12a8 8 0 108-8M4 4v5h5"/>',
    varita: '<path d="M5 19L17 7M15 3v4M13 5h4M19 11v4M17 13h4M8 3v2M7 4h2"/>', color: '<path d="M14 4l6 6M4 20l1-4 9-9 3 3-9 9zM11 7l6 6"/>', lazo: '<path d="M12 4c-5 0-8 2-8 5s3 5 8 5 8-2 8-5-3-5-8-5zM10 14c0 3 1 5 3 6"/>',
    poligono: '<path d="M5 18L4 8l8-4 8 6-3 9z"/>', inteligente: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 3v4M17 5h4"/>', pintar: '<path d="M4 20c3 0 4-2 4-3 0-2 2-3 3-3l7-7a2 2 0 00-3-3l-7 7c0 1-2 2-3 2-1 0-3 1-1 7z"/>'
  };
  const PISTAS = {
    mover: 'Arrastra para mover la capa. Con dos dedos: escala, gira y mueve. Rueda: escala (Mayús: gira).', mano: 'Arrastra para desplazar la vista. Pellizca o usa la rueda para acercar.',
    borrar: 'Pasa el dedo por lo que sobra. Con dos dedos mueves y acercas la vista.', restaurar: 'Pinta para recuperar lo que borraste (desde la imagen original).',
    varita: 'Toca un color: se selecciona lo parecido. Luego bórralo o conserva solo eso.', color: 'Toca el color de fondo que quieres quitar y ajusta la tolerancia.',
    lazo: 'Dibuja a mano alzada alrededor de la zona y suelta para cerrar.', poligono: 'Toca para poner vértices; toca el primero (verde) o pulsa Intro para cerrar.',
    inteligente: 'Pinta en verde lo que quieres conservar y en rojo el fondo; luego pulsa «Recortar».', pintar: 'Dibuja a mano sobre una capa de dibujo.'
  };
  A.herramientas = [['mover', 'Mover'], ['mano', 'Mano'], ['borrar', 'Borrador'], ['restaurar', 'Restaurar'], ['varita', 'Varita'], ['color', 'Color'], ['lazo', 'Lazo'], ['poligono', 'Polígono'], ['inteligente', 'Inteligente'], ['pintar', 'Pincel']];

  A.elegirHerramienta = function (t) {
    if (H.activa === 'color' && t !== 'color') H.cancelarPrevia(); H.cancelar(); H.activa = t;
    if (t === 'pintar' && !(D.capaSel() && D.capaSel().tipo === 'raster')) { /* se crea al pintar */ }
    document.querySelectorAll('.st-herr button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.h === t)));
    A.pintarOpciones(); const pista = document.getElementById('st-pista'); if (pista) { pista.textContent = PISTAS[t] || ''; pista.style.opacity = '1'; clearTimeout(A.tPista); A.tPista = setTimeout(() => { pista.style.opacity = '0'; }, 4500); }
    A.refs.cv && (A.refs.cv.style.cursor = t === 'mano' ? 'grab' : (['borrar', 'restaurar', 'pintar'].indexOf(t) >= 0 ? 'none' : 'crosshair')); V.repintar();
  };

  /* ---- entrada de imagenes ---- */
  A.importarArchivo = function (file) {
    return new Promise((ok) => {
      if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || '')) { A.aviso('«' + (file.name || 'archivo') + '» no es una imagen que el navegador pueda abrir.', 'error'); return ok(false); }
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); D.agregarImagen(i, (file.name || 'Imagen').replace(/\.[^.]+$/, '').slice(0, 30)); A.vistaAjustada(); A.logro('primera_imagen'); ok(true); };
      i.onerror = () => { URL.revokeObjectURL(u); A.aviso('No se pudo abrir «' + (file.name || 'la imagen') + '» (formato no soportado por este navegador, p. ej. HEIC en algunos equipos).', 'error'); ok(false); }; i.src = u;
    });
  };
  A.importarVarios = async function (files) { let n = 0; for (const f of Array.from(files)) if (await A.importarArchivo(f)) n++; if (n) A.aviso(n + ' imagen(es) añadidas.'); };
  A.vistaAjustada = () => { V.ajustar(); };
  A.pegar = async function () {
    try { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => /^image\//.test(x)); if (t) { const b = await it.getType(t); await A.importarArchivo(new File([b], 'Pegado.png', { type: t })); return; } } A.aviso('No hay ninguna imagen en el portapapeles.', 'error'); }
    catch (e) { A.aviso('El navegador no dejó leer el portapapeles. Usa Ctrl+V (⌘V) con el estudio abierto.', 'error'); }
  };
  A.camara = async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { A.aviso('Este navegador/conexión no permite usar la cámara (hace falta HTTPS). Usa «Subir imagen».', 'error'); return; }
    let flujo; try { flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }); } catch (e) { A.aviso('No se pudo acceder a la cámara: ' + (e.name === 'NotAllowedError' ? 'permiso denegado.' : e.message), 'error'); return; }
    const v = h('video', { autoplay: true, playsinline: true, muted: true, 'aria-label': 'Vista de la cámara' }); v.srcObject = flujo;
    const dlg = Ui.dialogo('Cámara', [v, h('p', { cls: 'tr-ayuda', txt: 'Encuadra el objeto sobre un fondo liso: se recorta mejor.' })], [['Capturar', () => {
      const c = document.createElement('canvas'); c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; c.getContext('2d').drawImage(v, 0, 0); D.agregarImagen(c, 'Foto'); A.vistaAjustada(); A.logro('primera_imagen'); }, 'tr-pri'], ['Cancelar', null]]);
    dlg.addEventListener('close', () => flujo.getTracks().forEach((t) => t.stop()));
  };
  A.lienzoBlanco = function (color, transparente) {
    D.vacio(512, 512); const id = D.nuevoPix(512, 512, null, false), p = D.pix.get(id); if (!transparente) { const x = p.c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 512, 512); }
    D.agregar(D.capaNueva('raster', { nombre: 'Dibujo', pix: id, esc: 1, dibujo: true }), 'Lienzo en blanco'); A.elegirHerramienta('pintar'); A.vistaAjustada();
  };
  A.nuevo = function () { if (D.sucio && D.capas.length && !g.confirm('Hay cambios sin guardar. ¿Empezar un proyecto nuevo?')) return; D.pix = new Map(); D.vacio(512, 512); H.quitarSel(); H.borrarMarcas(); A.vistaAjustada(); };

  /* ---- guardar ---- */
  A.miniaturaDoc = () => Dt.miniatura(R.paraExportar(D, { lado: 128, margen: 4, sobremuestreo: 1 }), 96);
  A.guardarProyecto = async function (silencioso) {
    if (!D.capas.length) { if (!silencioso) A.aviso('No hay nada que guardar.', 'error'); return; }
    try { await Dt.guardarProyecto(D, A.miniaturaDoc()); if (!silencioso) { A.aviso('Proyecto «' + D.nombre + '» guardado en este dispositivo.'); A.logro('primer_proyecto'); } A.emitir('proyectos'); }
    catch (e) { A.aviso('No se pudo guardar: ' + e.message, 'error'); }
  };
  A.abrirProyecto = async function (id) {
    const r = await Dt.cargarProyecto(id); if (!r) { A.aviso('El proyecto completo solo está en el dispositivo donde se creó (la nube guarda su ficha, no los píxeles).', 'error'); return false; }
    await D.restaurar({ estructura: r.estructura, pix: r.pix }, id, r.nombre); H.quitarSel(); H.borrarMarcas(); A.ir('estudio'); A.vistaAjustada(); A.aviso('Proyecto abierto.'); return true;
  };
  const oy = {}; A.on = (t, f) => { (oy[t] = oy[t] || []).push(f); }; A.emitir = (t, d) => (oy[t] || []).forEach((f) => { try { f(d); } catch (e) { console.error(e); } });

  /* Dialogo "Guardar sticker": nombre, pack, emojis. */
  A.dialogoGuardar = async function (opts) {
    const anim = opts && opts.anim; if (!anim && !D.capas.length) { A.aviso('Añade una imagen, texto o dibujo primero.', 'error'); return; }
    const packs = await Dt.listaPacks(), emojis = []; const nombre = Ui.texto('Nombre del sticker', D.nombre, () => {}), sel = Ui.select('Pack', [['', 'Solo guardar en mi biblioteca']].concat(packs.map((p) => [p.id, p.nombre])).concat([['__nuevo', '＋ Nuevo pack…']]), packs.length ? packs[packs.length - 1].id : '__nuevo', () => {});
    const nuevoNom = Ui.texto('Nombre del pack nuevo', 'Mi pack', () => {}), autor = Ui.texto('Autor', Dt.ajuste('autor') || '', () => {}), em = Ui.texto('Emojis asociados (1 a 3, requeridos por WhatsApp)', '😀', () => {}, { attrs: { maxlength: 24 } });
    const rap = h('div', { cls: 'st-emojis' }, Ui.EMOJIS.slice(0, 24).map((e) => h('button', { type: 'button', txt: e, 'aria-label': 'Añadir emoji ' + e, on: { click: () => { em.input.value = (Array.from(em.input.value).slice(0, 2).join('') + e); } } })));
    const prev = anim ? anim.frames[0] : R.paraExportar(D, { lado: 512, margen: 12 }); prev.style.cssText = 'width:128px;height:128px'; const caja = h('div', { cls: 'st-prev' }, [prev]);
    const dlg = Ui.dialogo(anim ? 'Guardar sticker animado' : 'Guardar sticker', [caja, nombre, sel, nuevoNom, autor, em, rap, h('p', { cls: 'tr-ayuda', txt: 'Se guarda 512×512 con transparencia y borde ya aplicado. Los stickers de hasta 150 KB se sincronizan con tu cuenta; los más pesados se quedan en este dispositivo.' })], [['Guardar', async () => {
      try {
        const em2 = Array.from(em.input.value.replace(/\s+/g, '')).filter((c) => /\p{Extended_Pictographic}/u.test(c) || /[\u{1F1E6}-\u{1F1FF}]/u.test(c)).slice(0, 3);
        const lienzo = anim ? anim.frames[0] : R.paraExportar(D, { lado: 512, margen: 12 }); let datosAnim = null; if (anim) datosAnim = { frames: await Promise.all(anim.frames.map((c) => Dt.aBlob(c, 'image/png'))), ms: anim.ms.slice() };
        const reg = await Dt.guardarSticker({ nombre: nombre.input.value || 'Sticker', canvas: lienzo, emojis: em2.length ? em2 : ['😀'], proyecto: D.id, anim: datosAnim });
        let pk = null; if (sel.sel.value) { if (sel.sel.value === '__nuevo') { pk = Dt.packNuevo(nuevoNom.input.value || 'Mi pack', autor.input.value); Dt.ajuste('autor', autor.input.value); } else pk = packs.find((p) => p.id === sel.sel.value); }
        if (pk) { if (pk.items.length >= 120) { A.aviso('El pack ya tiene 120 stickers.', 'error'); return false; } pk.items.push({ sid: reg.id, emojis: em2.length ? em2 : ['😀'] }); if (!pk.bandeja) pk.bandeja = reg.id; await Dt.guardarPack(pk); A.logro('primer_pack'); }
        A.aviso('Sticker guardado' + (pk ? ' en «' + pk.nombre + '»' : '') + (reg.local ? ' (pesa más de 150 KB: solo en este dispositivo)' : '') + '.'); A.logro('primer_sticker'); A.xp(5); A.emitir('stickers'); A.emitir('packs');
      } catch (e) { A.aviso('No se pudo guardar: ' + e.message, 'error'); return false; }
    }, 'tr-pri'], ['Descargar PNG', () => { R.aBlob(R.paraExportar(D, { lado: 512, margen: 12 })).then((b) => T.descargar(b, T.nombreArchivo(nombre.input.value || 'sticker') + '.png')); return false; }], ['Copiar imagen', () => { A.copiarImagen(); return false; }], ['Cancelar', null]]);
    return dlg;
  };
  A.copiarImagen = async function () { try { const b = await R.aBlob(R.paraExportar(D, { lado: 512, margen: 12 })); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); A.aviso('Imagen copiada.'); } catch (e) { A.aviso('El navegador no permitió copiar la imagen.', 'error'); } };

  /* ---- opciones por herramienta ---- */
  const acc = (txt, f, cls) => Ui.btn(txt, f, 'tr-chico ' + (cls || ''));
  function accionesSel() {
    const s = H.sel; const fila = Ui.filaBtn([acc('Borrar selección', () => H.selAccion('borrar'), 'tr-pri'), acc('Conservar solo selección', () => H.selAccion('conservar')), acc('Invertir', () => H.selAccion('invertir')), acc('Expandir', () => H.selAccion('expandir', 3)), acc('Contraer', () => H.selAccion('contraer', 3)), acc('A capa nueva', () => H.selAccion('capa')), acc('Quitar selección', () => H.quitarSel())]);
    return h('div', {}, [h('p', { cls: 'tr-ayuda', txt: s ? 'Selección activa: ' + s.n + ' px.' : 'Sin selección todavía.' }), fila]);
  }
  A.pintarOpciones = function () {
    const c = document.getElementById('st-opc'); if (!c) return; c.textContent = ''; const t = H.activa, o = H.o, nombre = (A.herramientas.find((x) => x[0] === t) || [])[1];
    c.appendChild(h('h3', { txt: nombre })); const mk = (e) => c.appendChild(e);
    if (t === 'mover') {
      const cp = D.capaSel(); const s = Ui.rango('Escala', 5, 400, 1, cp ? Math.round(cp.esc * 100) : 100, (v) => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { esc: v / 100 }, 'esc'); }, (v) => v + '%'); const r = Ui.rango('Giro', -180, 180, 1, cp ? Math.round(cp.rot) : 0, (v) => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { rot: v }, 'rot'); }, (v) => v + '°');
      A.refs.escRango = s; A.refs.rotRango = r; mk(s); mk(r);
      mk(Ui.filaBtn([acc('⇋ Voltear', () => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { fx: !cc.fx }); }), acc('⇅ Voltear V', () => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { fy: !cc.fy }); }), acc('↺ −15°', () => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { rot: cc.rot - 15 }); }), acc('↻ +15°', () => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { rot: cc.rot + 15 }); }), acc('Centrar', () => { const cc = D.capaSel(); if (cc) D.propiedad(cc.id, { x: D.w / 2, y: D.h / 2 }); })]));
    } else if (t === 'mano') mk(h('p', { cls: 'tr-ayuda', txt: 'Desplaza la vista. También: dos dedos, rueda del ratón, barra espaciadora + arrastrar.' }));
    else if (t === 'borrar' || t === 'restaurar' || t === 'pintar') {
      mk(Ui.rango('Tamaño', 2, 240, 1, o.tam, (v) => { o.tam = v; V.repintar(); }, (v) => v + ' px')); mk(Ui.rango('Dureza', 0, 100, 1, Math.round(o.dureza * 100), (v) => { o.dureza = v / 100; }, (v) => v + '%'));
      mk(Ui.rango('Suavizado del trazo', 0, 100, 1, Math.round(o.suav * 100), (v) => { o.suav = v / 100; }, (v) => v + '%')); mk(Ui.rango('Opacidad', 5, 100, 1, Math.round(o.opacidad * 100), (v) => { o.opacidad = v / 100; }, (v) => v + '%'));
      if (t === 'pintar') mk(Ui.color('Color del pincel', o.color, (v) => { o.color = v; }));
      if (t === 'restaurar') mk(h('p', { cls: 'tr-ayuda', txt: 'Recupera píxeles de la imagen original de esta capa.' })); mk(Ui.check('Lupa al usar el dedo (se ve lo que tapa)', o.lupa, (v) => { o.lupa = v; Dt.ajuste('lupa', v); }));
    } else if (t === 'varita') {
      mk(Ui.rango('Tolerancia', 0, 100, 1, o.tolVarita, (v) => { o.tolVarita = v; }, (v) => v + '%')); mk(Ui.check('Solo píxeles conectados (relleno por inundación)', o.contiguo, (v) => { o.contiguo = v; }));
      mk(Ui.select('Modo de selección', [['nuevo', 'Nueva'], ['sumar', 'Añadir'], ['restar', 'Restar']], o.modoSel, (v) => { o.modoSel = v; })); mk(h('div', { id: 'st-acc-sel' }, [accionesSel()]));
    } else if (t === 'color') {
      mk(Ui.color('Color a quitar (toca la imagen para elegirlo)', '#' + o.colorClave.map((v) => v.toString(16).padStart(2, '0')).join(''), (v) => { o.colorClave = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); H.previaColor(); }));
      mk(Ui.rango('Tolerancia', 0, 100, 1, o.tolColor, (v) => { o.tolColor = v; H.previaColor(); }, (v) => v + '%')); mk(Ui.rango('Suavidad del borde', 0, 60, 1, o.suavColor, (v) => { o.suavColor = v; H.previaColor(); }, (v) => v + '%'));
      mk(Ui.check('Quitar el tinte del color en los bordes', o.despill, (v) => { o.despill = v; H.previaColor(); })); mk(Ui.filaBtn([acc('Aplicar', () => { if (H.aplicarPrevia('Recorte por color')) A.logro('recorte_color'); else H.previaColor(); }, 'tr-pri'), acc('Cancelar vista previa', () => H.cancelarPrevia())]));
    } else if (t === 'lazo' || t === 'poligono') {
      mk(Ui.select('Modo de selección', [['nuevo', 'Nueva'], ['sumar', 'Añadir'], ['restar', 'Restar']], o.modoSel, (v) => { o.modoSel = v; }));
      if (t === 'poligono') mk(Ui.filaBtn([acc('Cerrar polígono', () => H.cerrarPoligono(), 'tr-pri'), acc('Deshacer vértice', () => { H.poli.pop(); V.repintar(); })])); mk(h('div', { id: 'st-acc-sel' }, [accionesSel()]));
    } else if (t === 'inteligente') {
      mk(h('p', { cls: 'tr-ayuda', txt: 'Sin IA ni modelos: usa bordes (watershed) y los colores que marcas. Funciona mejor cuando el objeto se distingue del fondo.' }));
      mk(h('div', { cls: 'st-fila-btn' }, [h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': String(o.marca === 1), txt: '🟢 Conservar', on: { click: () => { o.marca = 1; A.pintarOpciones(); } } }), h('button', { type: 'button', cls: 'tr-btn', 'aria-pressed': String(o.marca === 2), txt: '🔴 Fondo', on: { click: () => { o.marca = 2; A.pintarOpciones(); } } })]));
      mk(Ui.rango('Grosor del marcador', 4, 80, 1, o.marcaTam, (v) => { o.marcaTam = v; }, (v) => v + ' px'));
      mk(Ui.filaBtn([acc('Recortar', () => { const b = document.getElementById('st-recortar'); if (b) b.disabled = true; setTimeout(() => { const ok = H.recorteInteligente(); if (b) b.disabled = false; if (ok) { A.aviso('Recorte listo. Corrige con marcadores nuevos o con el borrador y vuelve a pulsar si quieres.'); A.logro('recorte_inteligente'); } }, 30); }, 'tr-pri'), acc('Borrar marcadores', () => H.borrarMarcas())])); c.lastChild.firstChild.id = 'st-recortar';
    }
  };

  /* ---- construccion ---- */
  A.iniciarEstudio = function () {
    const raiz = document.getElementById('v-estudio'); Object.assign(H.o, { lupa: Dt.ajuste('lupa') !== false, suav: Dt.ajuste('suavizado') != null ? Dt.ajuste('suavizado') : H.o.suav });
    const cv = h('canvas', { cls: 'st-cv', 'aria-label': 'Lienzo del sticker. Usa las herramientas de abajo.', role: 'img' }), lupa = h('canvas', { cls: 'st-lupa', width: 220, height: 220, hidden: true, 'aria-hidden': 'true' });
    const stage = h('div', { cls: 'st-stage', id: 'st-stage', tabindex: '0', 'aria-label': 'Área de trabajo' }, [cv, lupa, h('div', { cls: 'st-pista', id: 'st-pista', 'aria-live': 'polite' })]); A.refs.cv = cv; A.refs.stage = stage;
    const btnDes = Ui.btn('↶', () => { const e = D.deshacer(); if (e) A.aviso('Deshecho: ' + e); }, '', { id: 'btn-deshacer', 'aria-label': 'Deshacer (Ctrl+Z)', title: 'Deshacer (Ctrl+Z)' }), btnReh = Ui.btn('↷', () => { const e = D.rehacer(); if (e) A.aviso('Rehecho: ' + e); }, '', { id: 'btn-rehacer', 'aria-label': 'Rehacer (Ctrl+Y)', title: 'Rehacer (Ctrl+Y)' });
    const estadoHist = h('span', { cls: 'tr-ayuda', id: 'st-hist', 'aria-live': 'off' });
    const acciones = h('div', { cls: 'st-acciones' }, [btnDes, btnReh, Ui.btn('⤢ Ajustar', () => V.ajustar(), '', { id: 'btn-ajustar', 'aria-label': 'Ajustar vista' }), Ui.btn('−', () => V.zoomA(0.8), '', { 'aria-label': 'Alejar' }), Ui.btn('+', () => V.zoomA(1.25), '', { 'aria-label': 'Acercar' }), Ui.btn('Guardar sticker', () => A.dialogoGuardar(), 'tr-pri', { id: 'btn-guardar-sticker' }), Ui.btn('Guardar proyecto', () => A.guardarProyecto(), '', { id: 'btn-guardar-proyecto' }), estadoHist]);
    const barra = h('div', { cls: 'st-herr', role: 'toolbar', 'aria-label': 'Herramientas' }, A.herramientas.map(([id, n]) => { const b = h('button', { type: 'button', 'data-h': id, 'aria-pressed': 'false', title: n, on: { click: () => A.elegirHerramienta(id) } }); b.appendChild(Ui.icono(ICON[id])); b.appendChild(h('span', { txt: n })); return b; }));
    const opc = h('div', { cls: 'st-opc', id: 'st-opc' });
    const izq = h('div', { cls: 'st-izq' }, [acciones, stage, barra, opc]);
    const der = h('div', { cls: 'st-der' }); A.refs.der = der;
    const tabs = h('div', { cls: 'tr-pestanas st-sub', role: 'tablist', 'aria-label': 'Paneles del estudio', id: 'subtabs' }); const defs = [['entrada', 'Entrada'], ['recorte', 'Recorte'], ['diseno', 'Diseño'], ['efectos', 'Efectos'], ['capas', 'Capas'], ['ajustes', 'Ajustes']];
    defs.forEach(([id, n], i) => tabs.appendChild(h('button', { role: 'tab', id: 'sp-t-' + id, 'data-vista': id, 'aria-controls': 'sp-' + id, 'aria-selected': String(i === 0), tabindex: i ? '-1' : '0', txt: n })));
    der.appendChild(tabs); defs.forEach(([id], i) => { const p = h('div', { id: 'sp-' + id, role: 'tabpanel', 'aria-labelledby': 'sp-t-' + id, hidden: i !== 0, cls: 'tr-panel' }); der.appendChild(p); A.paneles[id] = p; });
    raiz.appendChild(h('div', { cls: 'st-estudio' }, [izq, der])); A.subtabs = T.tabs(tabs);
    V.iniciar(stage, cv, lupa); V.alMando = (t, v) => { if (t === 'herramienta') A.elegirHerramienta(v); else if (t === 'tam' || t === 'marca') A.pintarOpciones(); else if (t === 'exportar') A.dialogoGuardar(); };
    H.aviso = (m, t) => A.aviso(m, t); H.alCambiarSel = (t) => { if (t === 'sel' || t === 'marcas') { const s = document.getElementById('st-acc-sel'); if (s) { s.textContent = ''; s.appendChild(accionesSel()); } } if (t === 'color') A.pintarOpciones(); };
    const act = () => { btnDes.disabled = !D.puedeDeshacer(); btnReh.disabled = !D.puedeRehacer(); estadoHist.textContent = D.pila.length + ' pasos · ' + (D.memoria() / 1048576).toFixed(1) + ' MB'; }; D.on((t) => { act(); if (t === 'seleccion' || t === 'estructura') { const cp = D.capaSel(); if (cp && A.refs.escRango && H.activa === 'mover' && document.activeElement && !document.activeElement.closest('.st-opc')) { A.refs.escRango.poner(Math.round(cp.esc * 100)); A.refs.rotRango.poner(Math.round(cp.rot)); } } }); act();
    // arrastrar y soltar, pegar
    ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) { e.preventDefault(); stage.classList.add('arrastrando'); A.ir('estudio'); } }));
    ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { if (ev === 'dragleave' && e.relatedTarget) return; stage.classList.remove('arrastrando'); }));
    document.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); A.importarVarios(e.dataTransfer.files); } });
    document.addEventListener('paste', (e) => { if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !(document.activeElement.type === 'file')) return; const f = Array.from((e.clipboardData && e.clipboardData.files) || []).filter((x) => /^image\//.test(x.type)); if (f.length) { e.preventDefault(); A.ir('estudio'); A.importarVarios(f); } });
    A.elegirHerramienta('mover');
  };
})(window);
