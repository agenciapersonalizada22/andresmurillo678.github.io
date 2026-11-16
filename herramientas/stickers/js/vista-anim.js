/* Vista Animacion: linea de tiempo de fotogramas (desde el estudio, capas, GIF o video corto), vista previa y exportacion GIF / APNG / WebP animado / WebM. */
(function (g) {
  'use strict';
  const T = g.Tr, h = T.h, Ui = g.Ui, D = g.StDoc, R = g.StRender, A = g.StApp, X = g.StExportar, G = g.StGif, Dt = g.StDatos;
  const S = { frames: [], sel: 0, timer: 0, jugando: false, limiteKB: 500, colores: 256 }, MAX = 80;
  A.anim = S;
  const cv512 = () => { const c = document.createElement('canvas'); c.width = c.height = 512; return c; };
  const ajustarA512 = (src) => { const c = cv512(), k = Math.min(512 / src.width, 512 / src.height), w = src.width * k, hh = src.height * k; c.getContext('2d').drawImage(src, (512 - w) / 2, (512 - hh) / 2, w, hh); return c; };
  const msGlobal = () => Math.round(1000 / (S.fps || 10));
  S.fps = 10;

  function anadir(c, ms) { if (S.frames.length >= MAX) { A.aviso('Máximo ' + MAX + ' fotogramas.', 'error'); return false; } S.frames.push({ c, ms: ms || msGlobal() }); return true; }
  function capturar() { if (!D.capas.length) { A.aviso('El estudio está vacío.', 'error'); return; } anadir(R.paraExportar(D, { lado: 512, margen: 12 })); S.sel = S.frames.length - 1; pintar(); }
  function desdeCapas(acum) {
    const vis = D.capas.filter((c) => c.vis); if (!vis.length) { A.aviso('No hay capas visibles.', 'error'); return; }
    vis.forEach((c, i) => anadir(R.paraExportar(D, { lado: 512, margen: 12, soloCapas: acum ? vis.slice(0, i + 1).map((x) => x.id) : [c.id], efectos: true }))); pintar(); A.aviso(vis.length + ' fotogramas desde capas.');
  }
  async function importarGif(file) {
    try { const b = new Uint8Array(await file.arrayBuffer()), r = G.decodificar(b); let n = 0; for (const f of r.frames) { if (S.frames.length >= MAX) break; const c = document.createElement('canvas'); c.width = r.w; c.height = r.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(f.rgba), r.w, r.h), 0, 0); anadir(ajustarA512(c), f.ms); n++; } pintar(); A.aviso(n + ' fotogramas del GIF.'); }
    catch (e) { A.aviso('No se pudo leer el GIF: ' + e.message, 'error'); }
  }
  async function importarVideo(file) {
    const v = document.createElement('video'), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.src = u;
    try {
      await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = () => ko(new Error('formato no soportado')); }); const dur = Math.min(v.duration || 3, 4), fps = S.fps, n = Math.min(MAX - S.frames.length, Math.max(1, Math.floor(dur * fps)));
      for (let i = 0; i < n; i++) { v.currentTime = i / fps; await new Promise((ok) => { v.onseeked = ok; setTimeout(ok, 800); }); const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); anadir(ajustarA512(c), 1000 / fps); }
      pintar(); A.aviso(n + ' fotogramas del video (' + dur.toFixed(1) + ' s). Quita el fondo del estudio con una captura por fotograma si lo necesitas.');
    } catch (e) { A.aviso('No se pudo leer el video: ' + e.message, 'error'); } URL.revokeObjectURL(u);
  }
  const PRESETS = {
    latido: (t) => ({ s: 1 + 0.1 * Math.sin(t * 2 * Math.PI), dx: 0, dy: 0, r: 0 }), rebote: (t) => ({ s: 1, dx: 0, dy: -Math.abs(Math.sin(t * Math.PI * 2)) * 30, r: 0 }), tambaleo: (t) => ({ s: 1, dx: 0, dy: 0, r: Math.sin(t * 2 * Math.PI) * 10 }),
    giro: (t) => ({ sx: Math.cos(t * 2 * Math.PI), s: 1, dx: 0, dy: 0, r: 0 }), flotar: (t) => ({ s: 1, dx: Math.sin(t * 2 * Math.PI) * 8, dy: Math.sin(t * 4 * Math.PI) * 10, r: Math.sin(t * 2 * Math.PI) * 3 }), parpadeo: (t) => ({ s: 1, dx: 0, dy: 0, r: 0, a: 0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI * 2)) })
  };
  function generar(tipo, n) {
    if (!D.capas.length) { A.aviso('Prepara un sticker en el Estudio primero.', 'error'); return; } const base = R.paraExportar(D, { lado: 512, margen: 44 }), k = n, ms = msGlobal();
    for (let i = 0; i < k; i++) { const p = PRESETS[tipo](i / k), c = cv512(), x = c.getContext('2d'); x.translate(256 + (p.dx || 0), 256 + (p.dy || 0)); x.rotate((p.r || 0) * Math.PI / 180); x.scale((p.sx != null ? p.sx : 1) * p.s, p.s); if (p.a != null) x.globalAlpha = p.a; x.drawImage(base, -256, -256); if (!anadir(c, ms)) break; }
    pintar(); A.aviso('Animación «' + tipo + '» generada.');
  }
  function detener() { clearTimeout(S.timer); S.jugando = false; }
  function reproducir() {
    const prev = document.getElementById('an-prev'); if (!prev || !S.frames.length) return; S.jugando = true; let i = 0;
    const paso = () => { if (!S.jugando) return; const f = S.frames[i % S.frames.length]; const x = prev.getContext('2d'); x.clearRect(0, 0, 512, 512); x.drawImage(f.c, 0, 0); i++; S.timer = setTimeout(paso, Math.max(20, f.ms)); }; paso();
  }
  function pintarEstatico() { const prev = document.getElementById('an-prev'); if (!prev) return; const f = S.frames[S.sel]; const x = prev.getContext('2d'); x.clearRect(0, 0, 512, 512); if (f) x.drawImage(f.c, 0, 0); }
  function pintar() {
    const tira = document.getElementById('an-tira'); if (!tira) return; tira.textContent = ''; S.sel = Math.min(S.sel, Math.max(0, S.frames.length - 1));
    S.frames.forEach((f, i) => { const c = document.createElement('canvas'); c.width = c.height = 68; c.getContext('2d').drawImage(f.c, 0, 0, 68, 68); const b = h('button', { type: 'button', cls: 'st-fot', 'aria-current': String(i === S.sel), 'aria-label': 'Fotograma ' + (i + 1) + ', ' + Math.round(f.ms) + ' milisegundos', on: { click: () => { detener(); S.sel = i; pintar(); } } }, [c, h('span', { txt: (i + 1) + ' · ' + Math.round(f.ms) + ' ms' })]); tira.appendChild(b); });
    if (!S.frames.length) tira.appendChild(h('p', { cls: 'tr-vacio', txt: 'Sin fotogramas. Captura desde el estudio, usa las capas, importa un GIF/video o genera un movimiento.' }));
    const ms = document.getElementById('an-ms'); if (ms && S.frames[S.sel]) ms.value = Math.round(S.frames[S.sel].ms);
    const info = document.getElementById('an-info'); if (info) { const tot = S.frames.reduce((a, f) => a + f.ms, 0); info.textContent = S.frames.length + ' fotogramas · ' + (tot / 1000).toFixed(2) + ' s'; } if (!S.jugando) pintarEstatico();
  }
  const peso = (b) => (b / 1024).toFixed(1) + ' KB';
  async function exportar(fmt, btn) {
    if (!S.frames.length) { A.aviso('Añade fotogramas primero.', 'error'); return; } const fr = S.frames.map((f) => f.c), ms = S.frames.map((f) => f.ms), nom = T.nombreArchivo(D.nombre || 'sticker'), res = document.getElementById('an-res'); btn.disabled = true; res.textContent = 'Procesando…';
    try {
      let blob, ext, txt;
      if (fmt === 'gif') { blob = X.gif(fr, ms, 0, S.colores); ext = 'gif'; txt = 'GIF propio (cuantización a ' + S.colores + ' colores, transparencia de 1 bit): ' + peso(blob.size); }
      else if (fmt === 'apng') { blob = await X.apng(fr, ms, 0); ext = 'png'; txt = 'APNG: ' + peso(blob.size) + ' (transparencia completa)'; }
      else if (fmt === 'webp') { const r = await X.webpAnimadoLimite(fr, ms, S.limiteKB * 1024); if (!r.ok) throw new Error('No se pudo llegar a ' + S.limiteKB + ' KB ni quitando fotogramas.'); blob = r.blob; ext = 'webp'; txt = 'WebP animado: ' + peso(r.bytes) + ' de ' + S.limiteKB + ' KB (calidad ' + r.q.toFixed(2) + ', ' + r.fotogramas + ' fotogramas' + (r.quitados ? ', se quitaron alternos' : '') + ')'; }
      else { const r = await X.grabarWebM(fr, ms, { limite: 256 * 1024 }); blob = r.blob; ext = 'webm'; txt = 'WebM (' + r.mime + ', ' + r.kbps + ' kbps, ' + r.seg.toFixed(1) + ' s): ' + peso(r.bytes) + (r.ok ? ' ≤ 256 KB (Telegram)' : ' — supera 256 KB') + '. La transparencia depende del navegador.'; }
      res.textContent = txt; T.descargar(blob, nom + '.' + ext); A.logro('animado'); A.xp(5);
    } catch (e) { res.textContent = ''; A.aviso(e.message, 'error'); }
    btn.disabled = false;
  }
  A.iniciarAnim = function () {
    const raiz = document.getElementById('v-anim'), f1 = h('input', { type: 'file', accept: 'image/gif', id: 'an-gif', cls: 'tr-solo-lector', 'aria-label': 'Importar GIF' }), f2 = h('input', { type: 'file', accept: 'video/*', id: 'an-video', cls: 'tr-solo-lector', 'aria-label': 'Importar video' });
    f1.addEventListener('change', () => { if (f1.files[0]) importarGif(f1.files[0]); f1.value = ''; }); f2.addEventListener('change', () => { if (f2.files[0]) importarVideo(f2.files[0]); f2.value = ''; });
    const prev = h('canvas', { id: 'an-prev', width: 512, height: 512, role: 'img', 'aria-label': 'Vista previa de la animación' }); prev.style.cssText = 'width:100%;max-width:360px;height:auto';
    const gen = Ui.select('Movimiento a partir del sticker actual', [['latido', 'Latido'], ['rebote', 'Rebote'], ['tambaleo', 'Tambaleo'], ['giro', 'Giro (como moneda)'], ['flotar', 'Flotar'], ['parpadeo', 'Parpadeo']], 'latido', () => {});
    const izq = h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Fotogramas' }), Ui.nota('Un sticker animado es una secuencia de imágenes. Crea los fotogramas aquí y exporta. WhatsApp usa WebP animado (≤ 500 KB, ≤ 10 s); Telegram usa WebM VP9 (≤ 256 KB, ≤ 3 s); Signal acepta APNG.'),
      Ui.filaBtn([Ui.btn('📸 Capturar fotograma del estudio', capturar, 'tr-pri', { id: 'an-capturar' }), Ui.btn('Capas → fotogramas', () => desdeCapas(false), '', { id: 'an-capas' }), Ui.btn('Capas acumuladas', () => desdeCapas(true))]),
      Ui.filaBtn([Ui.btn('Importar GIF', () => f1.click(), '', { id: 'an-btn-gif' }), Ui.btn('Importar video corto', () => f2.click(), '', { id: 'an-btn-video' })]), f1, f2, gen, Ui.rango('Fotogramas a generar', 4, 30, 1, 12, (v) => { S.nGen = v; }, (v) => v), Ui.btn('Generar movimiento', () => generar(gen.sel.value, S.nGen || 12), '', { id: 'an-generar' }),
      Ui.rango('Velocidad por defecto', 2, 30, 1, 10, (v) => { S.fps = v; }, (v) => v + ' fps'), h('div', { cls: 'st-tira', id: 'an-tira', role: 'list', 'aria-label': 'Línea de tiempo' }),
      h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'an-ms', txt: 'Duración del fotograma (ms)' }), h('input', { type: 'number', id: 'an-ms', min: 20, max: 5000, value: 100, on: { change: (e) => { if (S.frames[S.sel]) { S.frames[S.sel].ms = Math.max(20, +e.target.value || 100); pintar(); } } } })])]),
      Ui.filaBtn([Ui.btn('◀', () => { const i = S.sel; if (i > 0) { const t = S.frames[i]; S.frames[i] = S.frames[i - 1]; S.frames[i - 1] = t; S.sel--; pintar(); } }, 'tr-chico', { 'aria-label': 'Mover fotograma a la izquierda' }), Ui.btn('▶', () => { const i = S.sel; if (i < S.frames.length - 1) { const t = S.frames[i]; S.frames[i] = S.frames[i + 1]; S.frames[i + 1] = t; S.sel++; pintar(); } }, 'tr-chico', { 'aria-label': 'Mover fotograma a la derecha' }), Ui.btn('Duplicar', () => { const f = S.frames[S.sel]; if (f && S.frames.length < MAX) { const c = cv512(); c.getContext('2d').drawImage(f.c, 0, 0); S.frames.splice(S.sel + 1, 0, { c, ms: f.ms }); S.sel++; pintar(); } }, 'tr-chico'), Ui.btn('Borrar', () => { S.frames.splice(S.sel, 1); pintar(); }, 'tr-chico tr-peli'), Ui.btn('Aplicar duración a todos', () => { const ms = S.frames[S.sel] ? S.frames[S.sel].ms : 100; S.frames.forEach((f) => { f.ms = ms; }); pintar(); }, 'tr-chico'), Ui.btn('Invertir orden', () => { S.frames.reverse(); pintar(); }, 'tr-chico'), Ui.btn('Ida y vuelta', () => { const m = S.frames.slice(1, -1).reverse().map((f) => { const c = cv512(); c.getContext('2d').drawImage(f.c, 0, 0); return { c, ms: f.ms }; }); S.frames.push(...m); pintar(); }, 'tr-chico'), Ui.btn('Vaciar', () => { detener(); S.frames = []; pintar(); }, 'tr-chico tr-peli')])]);
    const btns = {};
    const der = h('div', { cls: 'tr-panel tr-pega' }, [h('h2', { txt: 'Vista previa y exportación' }), h('div', { cls: 'st-prev' }, [prev]), h('p', { cls: 'tr-ayuda', id: 'an-info' }),
      Ui.filaBtn([Ui.btn('▶ Reproducir', () => { if (S.jugando) detener(); else reproducir(); }, '', { id: 'an-play' }), Ui.btn('⏹ Parar', () => { detener(); pintarEstatico(); })]),
      Ui.rango('Límite de peso para WebP animado', 50, 1000, 10, S.limiteKB, (v) => { S.limiteKB = v; }, (v) => v + ' KB'), Ui.select('Colores del GIF', [['256', '256 (mejor)'], ['128', '128'], ['64', '64 (más ligero)'], ['32', '32']], '256', (v) => { S.colores = +v; }),
      Ui.filaBtn([btns.gif = Ui.btn('GIF', (e) => exportar('gif', e.target), '', { id: 'an-x-gif' }), btns.apng = Ui.btn('APNG', (e) => exportar('apng', e.target), '', { id: 'an-x-apng' }), btns.webp = Ui.btn('WebP animado', (e) => exportar('webp', e.target), 'tr-pri', { id: 'an-x-webp' }), btns.webm = Ui.btn('WebM', (e) => exportar('webm', e.target), '', { id: 'an-x-webm' })]),
      h('p', { cls: 'tr-ayuda', id: 'an-res', 'aria-live': 'polite' }), Ui.btn('Guardar como sticker animado en un pack…', () => { if (!S.frames.length) { A.aviso('Añade fotogramas.', 'error'); return; } A.dialogoGuardar({ anim: { frames: S.frames.map((f) => f.c), ms: S.frames.map((f) => f.ms) } }); }, '', { id: 'an-guardar' }),
      h('p', { cls: 'tr-ayuda', txt: 'El GIF usa un codificador propio (LZW + cuantización de color, transparencia de 1 bit). El WebP animado se arma con los fotogramas que codifica tu navegador, y WebM se graba en tiempo real con MediaRecorder: ' + (X.webmSoportado() ? 'disponible aquí.' : 'NO disponible en este navegador.') })]);
    if (!X.webmSoportado()) btns.webm.disabled = true;
    raiz.appendChild(h('div', { cls: 'tr-dos' }, [izq, der])); pintar();
  };
})(window);
