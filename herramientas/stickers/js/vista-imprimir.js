/* Vista Imprimir y cortar: hojas de stickers (A4/Carta) con empaquetado automatico, marcas de registro y linea de corte, vinilo imprimible,
   y SVG de contorno de corte (Douglas-Peucker + offset) para plotters. Usa herramientas/trabajos/comun/impresion.js. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, A = g.StApp, Dt = g.StDatos, X = g.StExportar, I = g.Impresion, C = g.StContorno, E = g.StEmpaque, N = g.StNucleo, R = g.StRender, D = g.StDoc;
  const S = { items: [], cfg: { papel: 'A4', orient: 'vertical', m: 10, tam: 45, sep: 3, rotar: true, linea: true, registro: false, vinilo: false, offset: -0.3, eps: 1.2, huecos: false }, paginas: [], L: null, cache: new Map(), fuente: [] };
  const pre = {};

  async function prepararItem(src) {   // src: {id, canvas?, reg?} -> {id, nombre, w, h (px recortados), dataUrl, loops (px), mw, mh}
    const clave = src.id + '|' + (src.reg && src.reg._t || src.version || 0); if (S.cache.has(clave)) return S.cache.get(clave);
    let cv = src.canvas; if (!cv) { const b = await Dt.imagenSticker(src.reg); if (!b) return null; cv = await X.canvasDe(b); }
    const cj = R.caja(cv, 8) || { x: 0, y: 0, w: cv.width, h: cv.height }, rec = X.nuevoCanvas(cj.w, cj.h); rec.getContext('2d').drawImage(cv, cj.x, cj.y, cj.w, cj.h, 0, 0, cj.w, cj.h);
    const it = { id: src.id, nombre: src.nombre, w: cj.w, h: cj.h, canvas: rec, dataUrl: rec.toDataURL('image/png') };
    S.cache.set(clave, it); return it;
  }
  function contorno(it, o) {   // lazos en px del recorte, con offset en px y simplificacion
    const k = Math.min(1, 300 / Math.max(it.w, it.h)), w = Math.max(4, Math.round(it.w * k)), hh = Math.max(4, Math.round(it.h * k)), pad = 6, c = X.nuevoCanvas(w + pad * 2, hh + pad * 2), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(it.canvas, pad, pad, w, hh);
    const m = N.alfaMascara(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height, 40), mmPx = o.mmPorPx, offPx = o.offsetMm / mmPx * 1; // mmPorPx: mm por px del recorte original
    const lazos = C.contornoDe(m, c.width, c.height, { offset: Math.round(offPx * k), eps: o.eps, huecos: o.huecos });
    return { lazos, ancho: c.width, alto: c.height, pad, k };
  }
  function pathMm(it, tamMm, cfg) {
    const esc = tamMm / Math.max(it.w, it.h), wMm = it.w * esc, hMm = it.h * esc, co = contorno(it, { mmPorPx: esc, offsetMm: cfg.offset, eps: cfg.eps, huecos: cfg.huecos });
    // convertir de px del mini-lienzo (con pad) a mm del recorte
    const sx = wMm / (co.ancho - co.pad * 2), sy = hMm / (co.alto - co.pad * 2), r = (v) => Math.round(v * 100) / 100;
    const d = co.lazos.map((l) => 'M' + l.pts.map((p) => r((p[0] - co.pad) * sx) + ' ' + r((p[1] - co.pad) * sy)).join('L') + 'Z').join('');
    return { d, wMm, hMm };
  }
  /* Calcula las hojas: devuelve {paginas:[[{id,x,y,w,h,rot,item}]], noCabe} */
  async function organizar() {
    const cfg = S.cfg, filas = S.fuente.filter((f) => f.copias > 0), items = [];
    for (const f of filas) { const it = await prepararItem(f.src); if (!it) continue; const esc = cfg.tam / Math.max(it.w, it.h); for (let i = 0; i < f.copias; i++) items.push({ id: f.src.id + '#' + i, w: it.w * esc, h: it.h * esc, it, esc }); }
    const L = I.calcular({ papel: cfg.papel, orient: cfg.orient, mt: cfg.m, md: cfg.m, mb: cfg.m, mi: cfg.m, modo: 'cuadricula', cols: 1, filas: 1, total: 1, registro: cfg.registro || cfg.vinilo, regla: true, cortes: 'ninguno' });
    const area = L.area, emp = E.empaquetar(items, area.w, area.h, cfg.sep, cfg.rotar), mapa = new Map(items.map((i) => [i.id, i]));
    const paginas = emp.paginas.map((pg) => pg.map((p) => Object.assign({}, p, { item: mapa.get(p.id) })));
    const L2 = I.calcular({ papel: cfg.papel, orient: cfg.orient, mt: cfg.m, md: cfg.m, mb: cfg.m, mi: cfg.m, modo: 'cuadricula', cols: 1, filas: 1, total: Math.max(1, paginas.length), registro: cfg.registro || cfg.vinilo, regla: true, cortes: 'ninguno' });
    S.paginas = paginas; S.L = L2; S.noCabe = emp.noCabe; S.total = items.length; return S;
  }
  function svgPagina(idx, soloCorte) {
    const pg = S.paginas[idx] || [], cfg = S.cfg, partes = [];
    pg.forEach((p) => {
      const it = p.item.it, esc = p.item.esc, tf = p.rot ? 'translate(' + (p.x + p.w) + ' ' + p.y + ') rotate(90)' : 'translate(' + p.x + ' ' + p.y + ')', cm = pathMm(it, cfg.tam, cfg);
      if (!soloCorte) partes.push('<g transform="' + tf + '"><image width="' + (it.w * esc).toFixed(2) + '" height="' + (it.h * esc).toFixed(2) + '" href="' + it.dataUrl + '" xlink:href="' + it.dataUrl + '" preserveAspectRatio="none"/>' + (cfg.linea && !cfg.vinilo ? '<path d="' + cm.d + '" fill="none" stroke="#ff00ff" stroke-width=".18" stroke-dasharray="1.2 .8" fill-rule="evenodd"/>' : '') + '</g>');
      else partes.push('<g transform="' + tf + '"><path d="' + cm.d + '" fill="none" stroke="#ff0000" stroke-width=".1" fill-rule="evenodd"/></g>');
    });
    return partes.join('');
  }
  const dibujar = (idx) => svgPagina(idx, false);
  async function pintar() {
    const prev = document.getElementById('im-prev'), inf = document.getElementById('im-info'); if (!prev) return; inf.textContent = 'Calculando…';
    try { await organizar(); } catch (e) { inf.textContent = ''; A.aviso(e.message, 'error'); return; }
    if (!S.total) { prev.textContent = ''; prev.appendChild(h('p', { cls: 'tr-vacio', txt: 'Elige stickers y cuántas copias quieres de cada uno.' })); inf.textContent = ''; return; }
    I.vistaPrevia(prev, S.L, dibujar, { zoom: 'ajustar', registro: true }); inf.textContent = S.total + ' stickers en ' + S.paginas.length + ' hoja(s) ' + S.cfg.papel + (S.noCabe.length ? ' · ' + S.noCabe.length + ' no caben con este tamaño' : '') + '.';
  }
  const debounce = (f) => { clearTimeout(pre.t); pre.t = setTimeout(f, 150); };

  async function llenarFuente() {
    const lib = await Dt.listaStickers(), previos = new Map(S.fuente.map((f) => [f.src.id, f.copias]));
    S.fuente = lib.filter((s) => !s.animado || true).map((s) => ({ src: { id: s.id, nombre: s.nombre, reg: s }, copias: previos.has(s.id) ? previos.get(s.id) : 1 }));
    S.fuente.unshift({ src: { id: 'actual', nombre: 'Estudio (actual)', canvas: null, version: 0 }, copias: previos.has('actual') ? previos.get('actual') : 0, actual: true });
    pintarFuente();
  }
  function pintarFuente() {
    const ul = document.getElementById('im-fuente'); if (!ul) return; ul.textContent = '';
    S.fuente.forEach((f) => {
      const s = f.src.reg, mini = s ? h('img', { src: s.img || s.mini, alt: '' }) : h('span', { txt: '🎨' });
      const inp = h('input', { type: 'number', min: 0, max: 99, value: f.copias, 'aria-label': 'Copias de ' + f.src.nombre, on: { change: (e) => { f.copias = Math.max(0, Math.min(99, parseInt(e.target.value) || 0)); debounce(pintar); } } });
      ul.appendChild(h('li', { cls: 'st-card' }, [h('div', { cls: 'im' }, [mini]), h('b', { txt: f.src.nombre }), inp]));
    });
  }
  async function stickerActual() { if (!D.capas.length) return null; const cv = R.paraExportar(D, { lado: 512, margen: 8 }); return { id: 'actual', nombre: 'Estudio (actual)', canvas: cv, version: Date.now() }; }

  A.iniciarImprimir = function () {
    const raiz = document.getElementById('v-imprimir'), c = S.cfg;
    const set = (k, v) => { c[k] = v; debounce(pintar); };
    const ctl = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Hoja de stickers' }),
      h('p', { cls: 'tr-ayuda', txt: 'Elige copias de cada sticker; se empaquetan automáticamente en la hoja (sin solapes).' }), h('ul', { cls: 'st-rejilla', id: 'im-fuente', 'aria-label': 'Stickers a imprimir' }),
      h('div', { cls: 'tr-fila' }, [Ui.select('Papel', [['A4', 'A4'], ['Carta', 'Carta']], c.papel, (v) => set('papel', v)), Ui.select('Orientación', [['vertical', 'Vertical'], ['horizontal', 'Horizontal']], c.orient, (v) => set('orient', v))]),
      Ui.rango('Tamaño del sticker (lado mayor)', 15, 150, 1, c.tam, (v) => set('tam', v), (v) => v + ' mm'), Ui.rango('Margen de la hoja', 3, 25, 1, c.m, (v) => set('m', v), (v) => v + ' mm'), Ui.rango('Separación entre stickers', 0, 12, 0.5, c.sep, (v) => set('sep', v), (v) => v + ' mm'),
      Ui.check('Permitir girar 90° para ahorrar espacio', c.rotar, (v) => set('rotar', v)), Ui.check('Mostrar línea de corte en la hoja (guía magenta)', c.linea, (v) => set('linea', v)), Ui.check('Marcas de registro en las esquinas', c.registro, (v) => set('registro', v)),
      Ui.check('Modo vinilo imprimible (imprimir y cortar): marcas de registro, sin línea visible', c.vinilo, (v) => { c.vinilo = v; debounce(pintar); }),
      Ui.det('Línea de corte', [Ui.rango('Desplazamiento (− hacia dentro)', -3, 3, 0.1, c.offset, (v) => set('offset', v), (v) => v + ' mm'), Ui.rango('Simplificación (Douglas-Peucker)', 0.3, 4, 0.1, c.eps, (v) => set('eps', v), (v) => v + ' px'), Ui.check('Cortar también los huecos interiores', c.huecos, (v) => set('huecos', v))]),
      Ui.nota('Vinilo imprimible: imprime la hoja con las marcas de registro, cárgala en tu plotter (Cricut «Imprimir y cortar», Silhouette, etc.) y usa el SVG de corte de la hoja: tiene las mismas coordenadas en mm. Desactiva «ajustar a la página» al imprimir y verifica con la regla de 50 mm.', 'tr-av'),
      Ui.filaBtn([Ui.btn('Imprimir…', async () => { await refrescarActual(); await organizar(); if (!S.total) { A.aviso('No hay stickers para imprimir.', 'error'); return; } I.imprimir(S.L, dibujar, { registro: true }); A.logro('imprimir_hoja'); }, 'tr-pri', { id: 'im-imprimir' }), Ui.btn('PNG de la hoja 1 (300 dpi)', async () => { await refrescarActual(); await organizar(); if (!S.total) return; const b = await I.aPNG(S.L, 0, dibujar, { dpi: 300 }); T.descargar(b, 'hoja_stickers.png'); }, '', { id: 'im-png' }), Ui.btn('SVG de corte de la hoja', async () => { await refrescarActual(); await organizar(); if (!S.total) return; descargarCorteHoja(); }, '', { id: 'im-svg-hoja' })])]);
    const sol = h('div', { cls: 'tr-panel tr-pega' }, [h('h2', { txt: 'Vista previa' }), h('p', { cls: 'tr-ayuda', id: 'im-info', 'aria-live': 'polite' }), h('div', { id: 'im-prev' })]);
    // contorno de un solo sticker
    const co = { tam: 60, offset: 0, eps: 1.2, huecos: false }, res = h('div', { cls: 'st-prev', id: 'co-prev' });
    const unico = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'SVG de contorno de corte (un sticker)' }), h('p', { cls: 'tr-ayuda', txt: 'Traza el borde del sticker actual del Estudio, lo simplifica (Douglas-Peucker) y lo exporta en milímetros para plotters de corte.' }),
      Ui.rango('Tamaño (lado mayor)', 10, 300, 1, co.tam, (v) => { co.tam = v; }, (v) => v + ' mm'), Ui.rango('Offset', -5, 8, 0.1, co.offset, (v) => { co.offset = v; }, (v) => v + ' mm'), Ui.rango('Simplificación', 0.3, 4, 0.1, co.eps, (v) => { co.eps = v; }, (v) => v + ' px'), Ui.check('Incluir huecos interiores', co.huecos, (v) => { co.huecos = v; }), res, h('p', { cls: 'tr-ayuda', id: 'co-info' }),
      Ui.filaBtn([Ui.btn('Calcular contorno', () => calcularUnico(co, res), '', { id: 'co-calcular' }), Ui.btn('Descargar SVG de corte', () => descargarUnico(co), 'tr-pri', { id: 'co-descargar' }), Ui.btn('SVG con imagen + corte', () => descargarUnico(co, true), '', { id: 'co-svg-img' })])]);
    raiz.append(h('div', { cls: 'tr-dos' }, [ctl, sol]), unico);
    A.on('stickers', llenarFuente); Dt.alm.suscribir('stickers', () => debounce(llenarFuente)); Dt.listo.then(llenarFuente);
    pre.mostrar = async () => { await refrescarActual(); await llenarFuente(); pintar(); };
  };
  async function refrescarActual() { const a = S.fuente.find((f) => f.actual); if (a) { const s = await stickerActual(); a.src = s || a.src; if (!s) a.copias = 0; } }
  A.alMostrarImprimir = () => { if (pre.mostrar) pre.mostrar(); };

  function descargarCorteHoja() {
    const L = S.L, W = L.hoja.w, H = L.hoja.h, ar = L.area, svgs = [];
    S.paginas.forEach((_, i) => { const m = Math.max(2.5, Math.min(5, S.cfg.m / 2)), marcas = [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].map((p) => '<g stroke="#000" stroke-width=".25" fill="none"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (m * 0.6) + '"/><path d="M' + (p[0] - m) + ' ' + p[1] + 'H' + (p[0] + m) + 'M' + p[0] + ' ' + (p[1] - m) + 'V' + (p[1] + m) + '"/></g>').join('');
      svgs.push({ nombre: 'corte_hoja_' + (i + 1) + '.svg', datos: T.bytes('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '"><g id="Registro">' + marcas + '</g><g id="CutContour" transform="translate(' + ar.x + ' ' + ar.y + ')">' + svgPagina(i, true) + '</g></svg>') }); });
    if (svgs.length === 1) T.descargar(new Blob([svgs[0].datos], { type: 'image/svg+xml' }), svgs[0].nombre); else T.descargar(T.zip(svgs), 'corte_hojas.zip'); A.logro('svg_corte');
  }
  async function datosUnico(co) {
    const s = await stickerActual(); if (!s) { A.aviso('El Estudio está vacío.', 'error'); return null; } const it = await prepararItem(s), cfg = { offset: co.offset, eps: co.eps, huecos: co.huecos }, r = pathMm(it, co.tam, cfg);
    return { it, r, svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + r.wMm.toFixed(2) + 'mm" height="' + r.hMm.toFixed(2) + 'mm" viewBox="0 0 ' + r.wMm.toFixed(2) + ' ' + r.hMm.toFixed(2) + '"><path id="CutContour" d="' + r.d + '" fill="none" stroke="#ff0000" stroke-width=".1" fill-rule="evenodd"/></svg>' };
  }
  async function calcularUnico(co, res) { const d = await datosUnico(co); if (!d) return; res.innerHTML = d.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%"').replace('stroke-width=".1"', 'stroke-width="' + (0.6 * Math.max(d.r.wMm, d.r.hMm) / 100) + '"'); const n = (d.r.d.match(/L/g) || []).length; document.getElementById('co-info').textContent = d.r.wMm.toFixed(1) + ' × ' + d.r.hMm.toFixed(1) + ' mm · ' + n + ' segmentos tras simplificar.'; }
  async function descargarUnico(co, conImagen) {
    const d = await datosUnico(co); if (!d) return; let svg = d.svg;
    if (conImagen) svg = svg.replace('<path', '<image width="' + d.r.wMm.toFixed(2) + '" height="' + d.r.hMm.toFixed(2) + '" href="' + d.it.dataUrl + '" xlink:href="' + d.it.dataUrl + '" preserveAspectRatio="none"/><path').replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
    T.descargar(new Blob([svg], { type: 'image/svg+xml' }), 'corte_sticker.svg'); A.logro('svg_corte');
  }
  A.imprimirEstado = () => S;
})(window);
