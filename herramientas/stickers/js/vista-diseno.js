/* Paneles del estudio: Entrada, Recorte (refinar, IA), Diseno (texto, emoji, formas, pegatinas, plantillas), Efectos (contorno, sombra, holo, filtros), Capas y Ajustes. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, D = g.StDoc, H = g.StHerr, V = g.StVista, R = g.StRender, Dt = g.StDatos, A = g.StApp, P = g.StPlantillas, IA = g.StIA, N = g.StNucleo;
  const acc = (txt, f, cls, o) => Ui.btn(txt, f, 'tr-chico ' + (cls || ''), o);
  const vacia = (el) => { el.textContent = ''; return el; };

  /* ---------- Entrada ---------- */
  function panelEntrada() {
    const p = vacia(A.paneles.entrada), arch = h('input', { type: 'file', accept: 'image/*', multiple: true, id: 'in-archivo', 'aria-label': 'Subir imágenes', cls: 'tr-solo-lector' });
    arch.addEventListener('change', () => { if (arch.files.length) A.importarVarios(arch.files); arch.value = ''; });
    const color = Ui.color('Color del lienzo en blanco', '#ffffff', () => {}), transp = Ui.check('Lienzo transparente', true, () => {});
    const nombre = Ui.texto('Nombre del proyecto', D.nombre, (v) => { D.nombre = v || 'Sin título'; });
    p.append(h('h2', { txt: 'Empieza con…' }), Ui.filaBtn([Ui.btn('📁 Subir imagen', () => arch.click(), 'tr-pri', { id: 'btn-subir' }), Ui.btn('📷 Cámara', () => A.camara(), '', { id: 'btn-camara' }), Ui.btn('📋 Pegar', () => A.pegar(), '', { id: 'btn-pegar' })]), arch,
      Ui.nota('También puedes arrastrar imágenes encima del lienzo o pegarlas con Ctrl+V (⌘V). Tus fotos no salen del dispositivo.'),
      Ui.det('Lienzo en blanco para dibujar', [color, transp, Ui.btn('Crear lienzo 512×512', () => A.lienzoBlanco(color.input.value, transp.input.checked), '', { id: 'btn-lienzo' })]),
      Ui.det('Plantillas (memes, etiquetas, insignias)', [h('div', { cls: 'st-fila-btn' }, P.lista.map((t) => Ui.btn(t.nombre, () => { P.aplicar(t.id); A.logro('plantilla'); }, 'tr-chico', { title: t.desc })))]),
      h('h3', { txt: 'Proyecto' }), nombre, Ui.filaBtn([Ui.btn('Guardar proyecto', () => A.guardarProyecto(), ''), Ui.btn('Nuevo proyecto', () => A.nuevo(), 'tr-peli'), Ui.btn('Recientes…', () => A.ir('historial'), '')]));
    A.refs.nombreProyecto = nombre;
  }

  /* ---------- Recorte ---------- */
  function panelRecorte() {
    const p = vacia(A.paneles.recorte), r = { suavizar: 0, pluma: 0, delta: 0, descontaminar: 0 }; let t = 0;
    const prev = () => { clearTimeout(t); t = setTimeout(() => H.previaRefinar(Object.assign({}, r)), 60); };
    const iaCfg = IA.config();
    p.append(h('h2', { txt: 'Recorte' }), Ui.nota('No hay IA de fondo incluida: un modelo de segmentación habría que descargarlo y esta página no lo hace. Las herramientas de abajo son algoritmos clásicos que funcionan en tu dispositivo.', 'tr-av'),
      h('p', { cls: 'tr-ayuda', txt: 'Elige la herramienta en la barra de debajo del lienzo: Varita, Color, Lazo, Polígono o Inteligente (con marcadores de primer plano y fondo).' }),
      Ui.det('Quitar fondo liso (automático)', [Ui.rango('Tolerancia', 0, 100, 1, H.o.tolFondo, (v) => { H.o.tolFondo = v; }, (v) => v + '%'), Ui.btn('Quitar fondo de las esquinas', () => H.quitarFondoCapa(), 'tr-pri', { id: 'btn-fondo-liso' }), h('p', { cls: 'tr-ayuda', txt: 'Rellena desde las cuatro esquinas: va bien con fondos de un solo color (pared, papel, pantalla verde).' })], true),
      Ui.det('Refinar bordes', [Ui.rango('Suavizar', 0, 8, 1, 0, (v) => { r.suavizar = v; prev(); }), Ui.rango('Pluma', 0, 20, 1, 0, (v) => { r.pluma = v; prev(); }, (v) => v + ' px'), Ui.rango('Contraer / expandir', -20, 20, 1, 0, (v) => { r.delta = v; prev(); }, (v) => (v > 0 ? '+' : '') + v + ' px'), Ui.rango('Descontaminar halos', 0, 8, 1, 0, (v) => { r.descontaminar = v; prev(); }, (v) => v + ' px'),
        h('p', { cls: 'tr-ayuda', txt: 'Descontaminar sustituye el color de los píxeles semitransparentes del borde por el del interior (adiós al halo blanco o verde).' }), Ui.filaBtn([Ui.btn('Aplicar refinado', () => { if (H.aplicarPrevia('Refinar bordes')) { A.logro('refinar'); A.pintarRefinadoReset && A.pintarRefinadoReset(); panelRecorte(); } else A.aviso('Mueve algún control antes.', 'error'); }, 'tr-pri', { id: 'btn-aplicar-refinado' }), Ui.btn('Cancelar', () => { H.cancelarPrevia(); panelRecorte(); })])], true),
      Ui.filaBtn([Ui.btn('Restaurar imagen original', () => H.restaurarOriginal(), 'tr-peli'), Ui.btn('Convertir capa a imagen', () => A.rasterizarSel(), '', { title: 'Convierte texto, formas o emojis en píxeles para poder recortarlos' })]),
      Ui.det('IA con tu propia clave (experimental)', [Ui.nota('Experimental y opcional: envía la imagen de la capa al proveedor que elijas (un tercero) con TU clave. La clave se guarda solo en este dispositivo (stickers_claves_dispositivo) y nunca se sincroniza con tu cuenta. Puede fallar por CORS o saldo.', 'tr-av'),
        Ui.select('Proveedor', IA.PROVEEDORES.map((x) => [x.id, x.nombre]), iaCfg.proveedor, (v) => { iaCfg.proveedor = v; IA.guardar(iaCfg); panelRecorte(); }),
        iaCfg.proveedor === 'personalizado' ? Ui.texto('URL del endpoint (POST multipart)', iaCfg.url, (v) => { iaCfg.url = v; IA.guardar(iaCfg); }) : null, iaCfg.proveedor === 'personalizado' ? Ui.texto('Cabecera de autenticación', iaCfg.cabecera || 'Authorization', (v) => { iaCfg.cabecera = v; IA.guardar(iaCfg); }) : null,
        h('div', {}, [h('label', { for: 'ia-clave', txt: 'Clave de API' }), h('input', { type: 'password', id: 'ia-clave', autocomplete: 'off', value: iaCfg.clave, on: { change: (e) => { iaCfg.clave = e.target.value; IA.guardar(iaCfg); } } })]),
        Ui.filaBtn([Ui.btn('Quitar fondo con IA', async (e) => { const c = H.capaRaster(); if (!c) return; if (!IA.listo()) { A.aviso('Pon tu clave primero.', 'error'); return; } const b = e.target; b.disabled = true; try { const px = D.pix.get(c.pix), res = await IA.quitarFondo(px.c); D.pixel(c.pix, 'Quitar fondo (IA)', (x, cv) => { x.clearRect(0, 0, cv.width, cv.height); x.drawImage(res, 0, 0, cv.width, cv.height); }); A.aviso('Hecho.'); } catch (er) { A.aviso(er.message, 'error'); } b.disabled = false; }, '', { id: 'btn-ia' }), Ui.btn('Borrar clave', () => { IA.borrar(); panelRecorte(); }, 'tr-peli')])]));
  }
  A.rasterizarSel = function () {
    const c = D.capaSel(); if (!c) return; if (c.tipo === 'raster') { A.aviso('Esa capa ya es una imagen.'); return; }
    const cv = D.crearCanvas(D.w * 2, D.h * 2), x = cv.getContext('2d'); R.dibujarCapa(x, Object.assign({}, c, { op: 1, mezcla: 'source-over' }), 2, 0, 0); const id = D.nuevoPix(cv.width, cv.height, cv, true);
    D.cambio('Convertir a imagen', () => { const i = D.capas.findIndex((q) => q.id === c.id); const n = D.capaNueva('raster', { nombre: c.nombre || c.tipo, pix: id, esc: 0.5, op: c.op, mezcla: c.mezcla, filtros: c.filtros }); D.capas.splice(i, 1, n); D.sel = n.id; });
  };

  /* ---------- Diseno ---------- */
  function editorCapa(cont) {
    vacia(cont); const c = D.capaSel(); if (!c) { cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Selecciona o añade una capa para editarla.' })); return; }
    const set = (props, k) => D.propiedad(c.id, props, k || ('e' + c.id + Object.keys(props)[0]));
    cont.appendChild(h('h3', { txt: 'Capa: ' + (c.nombre || c.tipo) }));
    if (c.tipo === 'texto') cont.append(Ui.texto('Texto', c.texto, (v) => set({ texto: v }, 'tx' + c.id), { multi: true, attrs: { rows: 2 } }), Ui.select('Fuente', R.FUENTES, c.fuente, (v) => set({ fuente: v })), Ui.rango('Tamaño', 16, 220, 1, c.tam, (v) => set({ tam: v }), (v) => v + ' px'), Ui.color('Color', c.color, (v) => set({ color: v })),
      Ui.check('Degradado', c.degradado, (v) => set({ degradado: v })), Ui.color('Segundo color del degradado', c.color2, (v) => set({ color2: v })), Ui.rango('Contorno', 0, 30, 1, c.contorno, (v) => set({ contorno: v }), (v) => v + ' px'), Ui.color('Color del contorno', c.cContorno, (v) => set({ cContorno: v })),
      Ui.rango('Curvatura (texto sobre trayectoria)', -100, 100, 1, c.curva || 0, (v) => set({ curva: v }), (v) => v + '%'), Ui.check('Negrita', c.negrita, (v) => set({ negrita: v })), Ui.check('Cursiva', c.cursiva, (v) => set({ cursiva: v })));
    else if (c.tipo === 'emoji') cont.append(Ui.texto('Emoji', c.texto, (v) => set({ texto: v }, 'em' + c.id)), Ui.rango('Tamaño', 30, 400, 1, c.tam, (v) => set({ tam: v }), (v) => v + ' px'), h('div', { cls: 'st-emojis' }, Ui.EMOJIS.map((e) => h('button', { type: 'button', txt: e, 'aria-label': 'Emoji ' + e, on: { click: () => D.propiedad(c.id, { texto: e }) } }))));
    else if (c.tipo === 'forma') cont.append(Ui.select('Forma', R.FORMAS, c.forma, (v) => set({ forma: v })), Ui.color('Relleno', c.relleno === 'ninguno' ? '#ffffff' : c.relleno, (v) => set({ relleno: v })), Ui.color('Trazo', c.trazo, (v) => set({ trazo: v })), Ui.rango('Grosor del trazo', 0, 40, 1, c.grosor, (v) => set({ grosor: v }), (v) => v + ' px'), Ui.rango('Tamaño', 40, 600, 1, c.tam, (v) => set({ tam: v }), (v) => v + ' px'), Ui.rango('Proporción ancho/alto', 0.3, 4, 0.05, c.asp || 1, (v) => set({ asp: v })));
    else if (c.tipo === 'pegatina') cont.append(Ui.select('Pegatina', R.PEGATINAS, c.forma, (v) => set({ forma: v })), Ui.color('Color', c.relleno, (v) => set({ relleno: v })), Ui.rango('Tamaño', 60, 700, 1, c.tam, (v) => set({ tam: v }), (v) => v + ' px'), acc('🎲 Otra distribución', () => set({ semilla: Math.floor(Math.random() * 1e6) }, 'sem')));
    else if (c.tipo === 'raster') cont.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Capa de imagen (' + (D.pix.get(c.pix) ? D.pix.get(c.pix).c.width + '×' + D.pix.get(c.pix).c.height : '') + '). Recórtala con las herramientas de la barra.' }));
    cont.append(h('h3', { txt: 'Transformar y mezcla' }), Ui.rango('Escala', 5, 600, 1, Math.round(c.esc * 100), (v) => set({ esc: v / 100 }, 'esc'), (v) => v + '%'), Ui.rango('Giro', -180, 180, 1, Math.round(c.rot), (v) => set({ rot: v }, 'rot'), (v) => v + '°'), Ui.rango('Opacidad', 0, 100, 1, Math.round(c.op * 100), (v) => set({ op: v / 100 }, 'op'), (v) => v + '%'), Ui.select('Modo de mezcla', R.MEZCLAS, c.mezcla, (v) => set({ mezcla: v })),
      Ui.filaBtn([acc('⇋ Voltear', () => set({ fx: !c.fx })), acc('⇅ Voltear V', () => set({ fy: !c.fy })), acc('Centrar', () => set({ x: D.w / 2, y: D.h / 2 }))]));
  }
  function panelDiseno() {
    const p = vacia(A.paneles.diseno), ed = h('div', { id: 'st-editor' }); A.refs.editor = ed;
    const forma = Ui.select('Forma', R.FORMAS, 'estrella', () => {}), peg = Ui.select('Pegatina decorativa', R.PEGATINAS, 'brillos', () => {}), emo = Ui.texto('Emoji (teclea o pega uno)', '😀', () => {});
    p.append(h('h2', { txt: 'Añadir' }), Ui.filaBtn([Ui.btn('🔤 Texto', () => { D.agregar(D.capaNueva('texto', { nombre: 'Texto', texto: 'Tu texto', fuente: R.FUENTES[0][0], tam: 72, color: '#ffffff', cContorno: '#000000', contorno: 6, degradado: false, color2: '#ff3b6b', negrita: false, cursiva: false, curva: 0 }), 'Añadir texto'); A.logro('primer_texto'); }, 'tr-pri', { id: 'btn-add-texto' }), Ui.btn('✏️ Dibujo', () => { D.agregarVacia('Dibujo'); A.elegirHerramienta('pintar'); }, '', { id: 'btn-add-dibujo' })]),
      Ui.filaBtn([emo.firstChild && emo, Ui.btn('Añadir emoji', () => { D.agregar(D.capaNueva('emoji', { nombre: 'Emoji', texto: Array.from(emo.input.value)[0] || '😀', tam: 160 }), 'Añadir emoji'); }, '', { id: 'btn-add-emoji' })].filter(Boolean)),
      h('div', { cls: 'st-emojis' }, Ui.EMOJIS.slice(0, 16).map((e) => h('button', { type: 'button', txt: e, 'aria-label': 'Añadir emoji ' + e, on: { click: () => D.agregar(D.capaNueva('emoji', { nombre: 'Emoji', texto: e, tam: 160 }), 'Añadir emoji') } }))),
      forma, Ui.btn('Añadir forma', () => D.agregar(D.capaNueva('forma', { nombre: 'Forma', forma: forma.sel.value, tam: 260, asp: 1, relleno: '#ff5c8a', trazo: '#ffffff', grosor: 8 }), 'Añadir forma'), '', { id: 'btn-add-forma' }),
      peg, Ui.btn('Añadir pegatina', () => D.agregar(D.capaNueva('pegatina', { nombre: 'Pegatina', forma: peg.sel.value, tam: 400, relleno: '#ffd43b', semilla: Math.floor(Math.random() * 1e6) }), 'Añadir pegatina'), '', { id: 'btn-add-peg' }), ed);
    editorCapa(ed);
  }

  /* ---------- Efectos ---------- */
  function panelEfectos() {
    const p = vacia(A.paneles.efectos), s = D.sticker, set = (grupo, k, v) => D.sticker_((st) => { st[grupo][k] = v; }, 'ef' + grupo + k);
    const c = s.contorno, sh = s.sombra, ho = s.holo;
    p.append(h('h2', { txt: 'Efectos del sticker' }),
      Ui.det('Contorno troquelado', [Ui.check('Activar contorno', c.on, (v) => set('contorno', 'on', v)), Ui.rango('Grosor', 0, 60, 1, c.grosor, (v) => set('contorno', 'grosor', v), (v) => v + ' px'), Ui.color('Color', c.color, (v) => set('contorno', 'color', v)), Ui.rango('Suavidad del borde', 1, 8, 0.5, c.suavidad, (v) => set('contorno', 'suavidad', v)), Ui.rango('Redondeo (cierra entrantes)', 0, 40, 1, c.cierre, (v) => set('contorno', 'cierre', v), (v) => v + ' px'), Ui.check('Rellenar huecos interiores', c.huecos, (v) => set('contorno', 'huecos', v)),
        Ui.check('Doble borde', c.doble, (v) => set('contorno', 'doble', v)), Ui.rango('Grosor del segundo borde', 1, 30, 1, c.grosor2, (v) => set('contorno', 'grosor2', v), (v) => v + ' px'), Ui.color('Color del segundo borde', c.color2, (v) => set('contorno', 'color2', v))], true),
      Ui.det('Sombra', [Ui.check('Activar sombra', sh.on, (v) => set('sombra', 'on', v)), Ui.rango('Desplazamiento X', -30, 30, 1, sh.dx, (v) => set('sombra', 'dx', v)), Ui.rango('Desplazamiento Y', -30, 30, 1, sh.dy, (v) => set('sombra', 'dy', v)), Ui.rango('Desenfoque', 0, 40, 1, sh.blur, (v) => set('sombra', 'blur', v)), Ui.color('Color', sh.color, (v) => set('sombra', 'color', v)), Ui.rango('Opacidad', 5, 100, 1, Math.round(sh.op * 100), (v) => set('sombra', 'op', v / 100), (v) => v + '%')]),
      Ui.det('Brillo holográfico (simulado)', [Ui.check('Activar holográfico', ho.on, (v) => set('holo', 'on', v)), Ui.rango('Intensidad', 5, 100, 1, Math.round(ho.intensidad * 100), (v) => set('holo', 'intensidad', v / 100), (v) => v + '%'), Ui.rango('Ángulo', 0, 180, 1, ho.angulo, (v) => set('holo', 'angulo', v), (v) => v + '°'), Ui.rango('Destellos', 0, 40, 1, ho.brillos, (v) => set('holo', 'brillos', v)), h('p', { cls: 'tr-ayuda', txt: 'Es un degradado iridiscente con destellos sobre el sticker: sirve para imágenes y packs digitales; en papel no cambia con el ángulo de la luz.' })]));
    const cp = D.capaSel(), f = (cp && cp.filtros) || {}, setF = (k, v) => { const q = D.capaSel(); if (q) D.propiedad(q.id, { filtros: Object.assign({}, q.filtros, { [k]: v }) }, 'fil' + q.id + k); };
    p.append(h('h2', { txt: 'Filtros y ajustes de la capa' }), cp ? h('p', { cls: 'tr-ayuda', txt: 'Capa: ' + (cp.nombre || cp.tipo) + (cp.tipo !== 'raster' ? ' — los filtros solo afectan a capas de imagen (usa «Convertir capa a imagen»).' : '') }) : h('p', { cls: 'tr-ayuda', txt: 'Selecciona una capa de imagen.' }),
      Ui.rango('Brillo', -100, 100, 1, f.brillo || 0, (v) => setF('brillo', v)), Ui.rango('Contraste', -100, 100, 1, f.contraste || 0, (v) => setF('contraste', v)), Ui.rango('Saturación', -100, 100, 1, f.saturacion || 0, (v) => setF('saturacion', v)), Ui.check('Blanco y negro', f.bn, (v) => setF('bn', v)), Ui.check('Invertir colores', f.invertir, (v) => setF('invertir', v)),
      Ui.rango('Pixelado', 0, 40, 1, f.pixelado || 0, (v) => setF('pixelado', v), (v) => v ? v + ' px' : 'no'), Ui.rango('Posterizado (cómic)', 0, 8, 1, f.poster || 0, (v) => setF('poster', v), (v) => v >= 2 ? v + ' niveles' : 'no'), Ui.rango('Tinta de cómic (bordes)', 0, 100, 1, f.comic === true ? 50 : f.comic || 0, (v) => setF('comic', v), (v) => v ? v + '%' : 'no'), Ui.rango('Viñeta', 0, 100, 1, f.vineta || 0, (v) => setF('vineta', v), (v) => v + '%'),
      Ui.filaBtn([acc('Comic rápido', () => { const q = D.capaSel(); if (q) D.propiedad(q.id, { filtros: { poster: 4, comic: 55, saturacion: 25, contraste: 10 } }); }), acc('Quitar filtros', () => { const q = D.capaSel(); if (q) D.propiedad(q.id, { filtros: {} }); }), acc('Copiar a todas las imágenes', () => { const q = D.capaSel(); if (!q) return; D.cambio('Filtros en todas', () => { D.capas.forEach((x) => { if (x.tipo === 'raster') x.filtros = Object.assign({}, q.filtros); }); }); })]));
  }

  /* ---------- Capas ---------- */
  function miniatura(c) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 44; const x = cv.getContext('2d'), d = R.dimensiones(c), k = Math.min(40 / (d.w * c.esc), 40 / (d.h * c.esc), 40 / 200 * 4); x.translate(22, 22);
    const tmp = Object.assign({}, c, { x: 0, y: 0, rot: 0, op: 1, mezcla: 'source-over' }); try { R.dibujarCapa(x, tmp, Math.min(40 / Math.max(d.w * c.esc, d.h * c.esc), 1), 22, 22); } catch (e) {} return cv;
  }
  function panelCapas() {
    const p = vacia(A.paneles.capas), ul = h('ul', { cls: 'st-capas', 'aria-label': 'Capas (la de arriba es la más alta)' }); A.refs.capas = ul;
    p.append(h('h2', { txt: 'Capas' }), ul, Ui.filaBtn([acc('Duplicar', () => { const c = D.capaSel(); if (c) D.duplicar(c.id); }), acc('Convertir a imagen', () => A.rasterizarSel()), acc('Aplanar visibles', () => { if (D.capas.length > 1) D.aplanar(() => R.componer(D, 1, { efectos: false }).canvas); }), acc('Borrar capa', () => { const c = D.capaSel(); if (c) D.borrar(c.id); }, 'tr-peli')]));
    listaCapas();
  }
  function listaCapas() {
    const ul = A.refs.capas; if (!ul) return; vacia(ul); if (!D.capas.length) { ul.appendChild(h('li', { cls: 'tr-vacio', txt: 'Aún no hay capas. Sube una imagen o añade texto.' })); return; }
    D.capas.slice().reverse().forEach((c) => {
      const li = h('li', { cls: 'st-capa', 'aria-current': String(c.id === D.sel) }), mini = h('div', { cls: 'mini' }, [miniatura(c)]);
      li.append(mini, h('button', { type: 'button', cls: 'nom', txt: (c.vis ? '' : '(oculta) ') + (c.nombre || c.tipo), on: { click: () => { D.sel = c.id; D.emitir('seleccion'); } } }),
        h('div', { cls: 'acc' }, [h('button', { type: 'button', txt: c.vis ? '👁' : '🚫', 'aria-label': (c.vis ? 'Ocultar ' : 'Mostrar ') + (c.nombre || c.tipo), on: { click: () => D.propiedad(c.id, { vis: !c.vis }) } }), h('button', { type: 'button', txt: '▲', 'aria-label': 'Subir capa', on: { click: () => D.mover(c.id, 1) } }), h('button', { type: 'button', txt: '▼', 'aria-label': 'Bajar capa', on: { click: () => D.mover(c.id, -1) } })]));
      ul.appendChild(li);
    });
  }

  /* ---------- Ajustes (dispositivo) ---------- */
  const ATAJOS = [['Ctrl+Z / Ctrl+Y', 'Deshacer / rehacer'], ['V E R W K L P S B H', 'Mover, borrador, restaurar, varita, color, lazo, polígono, inteligente, pincel, mano'], ['[ ]', 'Tamaño del pincel'], ['+ − 0', 'Zoom / ajustar vista'], ['Supr', 'Borrar selección o capa'], ['Ctrl+D', 'Duplicar capa'], ['Ctrl+S', 'Guardar proyecto'], ['Intro / Esc', 'Cerrar polígono / cancelar'], ['Flechas', 'Mover capa (Mayús: 10 px)'], ['Espacio + arrastrar', 'Desplazar la vista']];
  function panelAjustes() {
    const p = vacia(A.paneles.ajustes);
    p.append(h('h2', { txt: 'Ajustes de este dispositivo' }), h('p', { cls: 'tr-ayuda', txt: 'Se guardan en stickers_ajustes_dispositivo y no se sincronizan con tu cuenta.' }),
      Ui.check('Lupa al tocar con el dedo', H.o.lupa, (v) => { H.o.lupa = v; Dt.ajuste('lupa', v); }), Ui.rango('Suavizado de trazo por defecto', 0, 100, 1, Math.round(H.o.suav * 100), (v) => { H.o.suav = v / 100; Dt.ajuste('suavizado', v / 100); }, (v) => v + '%'),
      Ui.check('Autoguardar el proyecto (si ya se guardó una vez)', Dt.ajuste('autoguardar') !== false, (v) => Dt.ajuste('autoguardar', v)), Ui.texto('Autor por defecto (para packs)', Dt.ajuste('autor') || '', (v) => Dt.ajuste('autor', v)),
      h('p', { cls: 'tr-ayuda', id: 'st-mando-estado', txt: g.Mando ? 'Mando Xbox: conecta uno y pulsa un botón. Stick izq. = cursor, A = pulsar, stick der. = mover vista, gatillos = zoom, LB/RB = herramienta, B = deshacer, Y = rehacer, cruceta = tamaño, X = verde/rojo, Vista = ajustar, Menú = guardar sticker.' : 'Mando no disponible.' }),
      h('h3', { txt: 'Atajos de teclado' }), h('table', { cls: 'tr-ayuda', 'aria-label': 'Atajos' }, ATAJOS.map((a) => h('tr', {}, [h('td', {}, [h('span', { cls: 'st-kbd', txt: a[0] })]), h('td', { txt: ' ' + a[1] })]))),
      Ui.nota('Deshacer/rehacer es ilimitado: cada paso guarda solo los píxeles que cambiaron. El límite real es la memoria de tu dispositivo (arriba del lienzo ves cuánta usa).'));
  }

  A.iniciarPaneles = function () {
    panelEntrada(); panelRecorte(); panelDiseno(); panelEfectos(); panelCapas(); panelAjustes();
    let ult = null, ultTipo = null, t = 0;
    D.on((tipo) => {
      if (tipo === 'pixeles') { listaCapas(); return; }
      const c = D.capaSel(), foco = document.activeElement, editando = foco && foco !== document.body && A.paneles.diseno.contains(foco) && /INPUT|TEXTAREA|SELECT/.test(foco.tagName);
      listaCapas();
      if ((c && c.id) !== ult || (c && c.tipo) !== ultTipo || (!editando && tipo === 'estructura')) { ult = c && c.id; ultTipo = c && c.tipo; if (!editando) editorCapa(A.refs.editor); }
      clearTimeout(t); t = setTimeout(() => { const f = document.activeElement; if (!(f && A.paneles.efectos.contains(f) && /INPUT|SELECT/.test(f.tagName))) panelEfectos(); if (A.refs.nombreProyecto && document.activeElement !== A.refs.nombreProyecto.input) A.refs.nombreProyecto.input.value = D.nombre; }, 120);
    });
  };
})(window);
