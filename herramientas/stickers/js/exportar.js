/* Exportacion: WebP con ajuste de peso, WhatsApp (.wastickers), Telegram, Signal, iMessage, PNG/SVG, y animados (GIF, APNG, WebP animado, WebM). window.StExportar */
(function (g) {
  'use strict';
  const Dt = g.StDatos, E = g.StEmpaque, K = g.StContenedores, F = g.StFormatos, G = g.StGif, R = g.StRender, Tr = g.Tr, X = g.StExportar = {};
  const nuevoCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const aBlob = (c, t, q) => new Promise((ok) => c.toBlob((b) => ok(b), t, q));
  const bytes = async (b) => new Uint8Array(await b.arrayBuffer());
  X.bytes = bytes; X.nuevoCanvas = nuevoCanvas;

  let webpOk = null;
  X.soportaWebP = async function () { if (webpOk == null) { const b = await aBlob(nuevoCanvas(4, 4), 'image/webp', 0.8); webpOk = !!b && b.type === 'image/webp'; } return webpOk; };
  X.canvasDe = async function (blob) { const i = await Dt.blobAImagen(blob), c = nuevoCanvas(i.naturalWidth, i.naturalHeight); c.getContext('2d').drawImage(i, 0, 0); return c; };
  /* Contenido recortado y centrado en lado x lado con margen. */
  X.ajustar = function (cv, lado, margen, alto) {
    const out = nuevoCanvas(lado, alto || lado), x = out.getContext('2d'), cj = R.caja(cv) || { x: 0, y: 0, w: cv.width, h: cv.height };
    const k = Math.min((out.width - 2 * margen) / cj.w, (out.height - 2 * margen) / cj.h), w = cj.w * k, h = cj.h * k; x.imageSmoothingQuality = 'high';
    x.drawImage(cv, cj.x, cj.y, cj.w, cj.h, (out.width - w) / 2, (out.height - h) / 2, w, h); return out;
  };
  X.escalar = function (cv, lado) { const o = nuevoCanvas(lado, lado), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, lado, lado); return o; };

  /* WebP con el mayor q que quepa en `limite` bytes (busqueda binaria). */
  X.webpLimite = async function (cv, limite) {
    if (!(await X.soportaWebP())) throw new Error('Este navegador no sabe codificar WebP. Usa Chrome, Edge o Firefox.');
    const cache = new Map(), r = await E.ajustarPeso(async (q) => { q = Math.round(q * 1000) / 1000; const b = await aBlob(cv, 'image/webp', q); cache.set(q, b); return b.size; }, limite);
    const q = Math.round(r.q * 1000) / 1000, b = cache.get(q); return { blob: b, q, bytes: b.size, ok: r.ok, intentos: r.intentos };
  };
  /* WebP animado (reempaquetado de fotogramas WebP) con peso <= limite. frames: [canvas], ms: [n]. Si no cabe, quita fotogramas alternos. */
  X.webpAnimadoLimite = async function (frames, ms, limite, bucles) {
    if (!(await X.soportaWebP())) throw new Error('Este navegador no sabe codificar WebP.');
    let fr = frames.slice(), t = ms.slice(), quitados = 0;
    for (let ronda = 0; ronda < 4; ronda++) {
      const cache = new Map(), r = await E.ajustarPeso(async (q) => { q = Math.round(q * 1000) / 1000; const partes = []; for (const c of fr) partes.push(await bytes(await aBlob(c, 'image/webp', q))); const w = K.webpAnimado(partes, t, bucles || 0); cache.set(q, w); return w.length; }, limite, { max: 9, paso: 0.02 });
      if (r.ok) { const q = Math.round(r.q * 1000) / 1000, w = cache.get(q); return { blob: new Blob([w], { type: 'image/webp' }), q, bytes: w.length, ok: true, fotogramas: fr.length, quitados }; }
      if (fr.length < 4) break; const nf = [], nt = []; for (let i = 0; i < fr.length; i += 2) { nf.push(fr[i]); nt.push((t[i] || 100) + (t[i + 1] || 0)); } fr = nf; t = nt; quitados++;
    }
    return { ok: false, bytes: Infinity, fotogramas: fr.length };
  };
  X.pngBlob = (cv) => aBlob(cv, 'image/png');
  X.apng = async function (frames, ms, bucles) { const pn = []; for (const c of frames) pn.push(await bytes(await aBlob(c, 'image/png'))); return new Blob([K.apng(pn, ms, bucles || 0)], { type: 'image/png' }); };
  X.gif = function (frames, ms, bucles, colores) {
    const w = frames[0].width, h = frames[0].height, fr = frames.map((c, i) => ({ rgba: c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data, ms: ms[i] }));
    return new Blob([G.codificar(fr, w, h, { bucles: bucles || 0, colores: colores || 256 })], { type: 'image/gif' });
  };
  /* WebM con MediaRecorder (tiempo real). Ajusta la tasa de bits hasta cumplir limite. */
  X.webmSoportado = () => typeof MediaRecorder !== 'undefined' && ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].some((t) => MediaRecorder.isTypeSupported(t));
  X.grabarWebM = async function (frames, ms, opt) {
    opt = Object.assign({ limite: 256 * 1024, maxSeg: 3, intentos: 4, kbps: null }, opt || {});
    if (!X.webmSoportado()) throw new Error('Este navegador no puede grabar WebM (MediaRecorder).');
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    let total = ms.reduce((a, b) => a + b, 0), esc = total > opt.maxSeg * 1000 ? opt.maxSeg * 1000 / total : 1, dur = total * esc / 1000, bps = opt.kbps ? opt.kbps * 1000 : Math.max(30000, opt.limite * 8 / Math.max(0.5, dur) * 0.7);
    let ultimo = null;
    for (let n = 0; n < opt.intentos; n++) {
      const lienzo = nuevoCanvas(frames[0].width, frames[0].height), x = lienzo.getContext('2d'), stream = lienzo.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(bps) }), partes = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
      const fin = new Promise((ok) => { rec.onstop = ok; }); x.clearRect(0, 0, lienzo.width, lienzo.height); x.drawImage(frames[0], 0, 0); rec.start();
      for (let i = 0; i < frames.length; i++) { x.clearRect(0, 0, lienzo.width, lienzo.height); x.drawImage(frames[i], 0, 0); const track = stream.getVideoTracks()[0]; if (track && track.requestFrame) track.requestFrame(); await new Promise((r) => setTimeout(r, Math.max(16, ms[i] * esc))); }
      rec.stop(); await fin; stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(partes, { type: 'video/webm' }); ultimo = { blob, bytes: blob.size, kbps: Math.round(bps / 1000), seg: dur, mime, ok: blob.size <= opt.limite };
      if (ultimo.ok) break; bps *= Math.max(0.35, opt.limite / blob.size * 0.85);
    }
    return ultimo;
  };

  /* ---- packs ---- */
  /* Reune para cada elemento del pack: registro, imagen 512 (canvas) y animacion (fotogramas canvas) si la hay. */
  X.cargarItems = async function (pack) {
    const todos = await Dt.listaStickers(), mapa = new Map(todos.map((s) => [s.id, s])), r = [];
    for (const it of pack.items) {
      const s = mapa.get(it.sid); if (!s) { r.push(null); continue; }
      const blob = await Dt.imagenSticker(s); if (!blob) { r.push(null); continue; }
      const o = { reg: s, emojis: it.emojis || [], canvas: await X.canvasDe(blob), anim: null };
      if (s.animado) { const a = await Dt.animSticker(s); if (a) { o.anim = { frames: [], ms: a.ms.slice() }; for (const f of a.frames) o.anim.frames.push(await X.canvasDe(f)); } }
      r.push(o);
    }
    return r;
  };
  const marco = (cv, lado, margen) => X.ajustar(cv, lado, margen);
  /* plat: wa|tg|signal|imessage|suelto. opt: {margen, formatoTg:'png'|'webp'}. Devuelve {archivos:{nombre:Blob}, infos, tray, validacion, contents?, notas[]} */
  X.prepararPack = async function (plat, pack, opt, progreso) {
    opt = Object.assign({ margen: 16, ladoIM: 618, formatoTg: 'png' }, opt || {}); const items = await X.cargarItems(pack), out = { archivos: {}, infos: [], tray: null, notas: [], plat }, lista = [];
    const infoPack = { nombre: pack.nombre, autor: pack.autor, stickers: pack.items.map((i) => ({ emojis: i.emojis || [] })) };
    for (let i = 0; i < items.length; i++) {
      const it = items[i]; if (progreso) progreso(i, items.length); if (!it) { out.infos.push(null); continue; }
      const animado = !!it.anim; let nombre, blob, info;
      if (plat === 'wa') {
        if (animado) {
          const fr = it.anim.frames.map((c) => marco(c, 512, opt.margen)), r = await X.webpAnimadoLimite(fr, it.anim.ms, F.LIM.wa.anim);
          if (!r.ok) { out.notas.push('Sticker ' + (i + 1) + ': no se logró bajar de 500 KB.'); info = { w: 512, h: 512, bytes: 0, animado: true, formato: 'webp', ms: 0 }; blob = new Blob([]); }
          else { blob = r.blob; info = { w: 512, h: 512, bytes: r.bytes, animado: true, formato: 'webp', ms: it.anim.ms.reduce((a, b) => a + b, 0), frameMs: Math.min.apply(null, it.anim.ms), q: r.q }; if (r.quitados) out.notas.push('Sticker ' + (i + 1) + ': se quitaron fotogramas para cumplir 500 KB.'); }
        } else { const c = marco(it.canvas, 512, opt.margen), r = await X.webpLimite(c, F.LIM.wa.est); blob = r.blob; info = { w: 512, h: 512, bytes: r.bytes, animado: false, formato: blob.type === 'image/webp' ? 'webp' : 'png', q: r.q }; if (!r.ok) info.bytes = r.bytes; }
        nombre = F.nombreArchivo(i, 'webp');
      } else if (plat === 'tg') {
        if (animado && X.webmSoportado() && opt.webm) { const fr = it.anim.frames.map((c) => marco(c, 512, opt.margen)), r = await X.grabarWebM(fr, it.anim.ms, { limite: F.LIM.tg.webm }); blob = r.blob; info = { w: 512, h: 512, bytes: r.bytes, formato: 'webm', ms: Math.round(r.seg * 1000), animado: true }; nombre = F.nombreArchivo(i, 'webm'); out.notas.push('WebM grabado en tiempo real con MediaRecorder: su transparencia depende del navegador; revisa el resultado.'); }
        else {
          const c = marco(animado ? it.anim.frames[0] : it.canvas, 512, opt.margen); if (animado) out.notas.push('Sticker ' + (i + 1) + ' animado: se exporta solo el primer fotograma estático (activa WebM en las opciones).');
          let b = await X.pngBlob(c), fmt = 'png'; if (opt.formatoTg === 'webp' || b.size > F.LIM.tg.max) { const r = await X.webpLimite(c, F.LIM.tg.max); b = r.blob; fmt = 'webp'; }
          blob = b; nombre = F.nombreArchivo(i, fmt); info = { w: 512, h: 512, bytes: b.size, formato: fmt, animado: false };
        }
      } else if (plat === 'signal') {
        const c = marco(animado ? it.anim.frames[0] : it.canvas, 512, 8); if (animado) { let fr = it.anim.frames.map((f) => marco(f, 512, 8)), t = it.anim.ms.slice(), a = await X.apng(fr, t, 0), q = 0; while (a.size > F.LIM.signal.max && fr.length > 3 && q < 4) { const nf = [], nt = []; for (let k = 0; k < fr.length; k += 2) { nf.push(fr[k]); nt.push((t[k] || 100) + (t[k + 1] || 0)); } fr = nf; t = nt; a = await X.apng(fr, t, 0); q++; } if (q) out.notas.push('Sticker ' + (i + 1) + ': APNG sin pérdida; se quitaron fotogramas alternos ' + q + ' vez/veces para acercarse a 300 KB.'); blob = a; nombre = F.nombreArchivo(i, 'png'); info = { w: 512, h: 512, bytes: a.size, formato: 'apng', animado: true }; }
        else { let b = await X.pngBlob(c), fmt = 'png'; if (b.size > F.LIM.signal.max) { const r = await X.webpLimite(c, F.LIM.signal.max); b = r.blob; fmt = 'webp'; } blob = b; nombre = F.nombreArchivo(i, fmt); info = { w: 512, h: 512, bytes: b.size, formato: fmt, animado: false }; }
      } else if (plat === 'imessage') {
        let lado = opt.ladoIM; const base = X.ajustar(animado ? it.anim.frames[0] : it.canvas, 512, 12); let b;
        for (const l of [lado, 408, 300]) { const c = nuevoCanvas(l, l); c.getContext('2d').imageSmoothingQuality = 'high'; c.getContext('2d').drawImage(base, 0, 0, l, l); b = await X.pngBlob(c); lado = l; if (b.size <= F.LIM.imessage.max) break; }
        blob = b; nombre = F.nombreArchivo(i, 'png'); info = { w: lado, h: lado, bytes: b.size, formato: 'png', animado: false };
      } else { const c = X.escalar(marco(it.canvas, 512, 0), opt.ladoIM || 512); blob = await X.pngBlob(c); nombre = F.nombreArchivo(i, 'png'); info = { w: c.width, h: c.height, bytes: blob.size, formato: 'png', animado: false }; }
      out.archivos[nombre] = blob; out.infos.push(info); lista.push(nombre);
    }
    out.nombres = lista;
    if (plat === 'wa') {   // icono de bandeja 96x96 PNG <= 50 KB
      const bi = Math.max(0, pack.items.findIndex((i) => i.sid === pack.bandeja)), it = items[bi] || items.find(Boolean);
      if (it) { const c = X.ajustar(it.anim ? it.anim.frames[0] : it.canvas, 96, 4); const b = await X.pngBlob(c); out.archivos['tray.png'] = b; out.tray = { w: 96, h: 96, bytes: b.size, formato: 'png' }; }
      out.contents = F.contentsWA(Object.assign({}, pack, { stickers: pack.items.filter((_, i) => items[i]) }), lista, 'tray.png', out.infos.some((x) => x && x.animado));
    }
    const infosValidos = out.infos.filter(Boolean); out.validacion = plat === 'suelto' ? [] : F.validar(plat, infoPack, out.infos.length === pack.items.length ? out.infos : infosValidos, out.tray);
    return out;
  };
  X.zipPack = function (prep, pack) {
    return (async () => {
      const files = {}; for (const n in prep.archivos) files[n] = await bytes(prep.archivos[n]);
      if (prep.plat === 'wa') return F.zip(prep.contents, files);
      return F.zipPlano(files);
    })();
  };
  X.extension = { wa: 'wastickers', tg: 'zip', signal: 'zip', imessage: 'zip', suelto: 'zip' };

  /* SVG con la imagen incrustada (y el contorno de corte si se da un path en px del lienzo). */
  X.svgIncrustado = async function (cv, contornoPath) {
    const url = cv.toDataURL('image/png'), w = cv.width, h = cv.height;
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><image width="' + w + '" height="' + h + '" xlink:href="' + url + '" href="' + url + '"/>' + (contornoPath ? '<path d="' + contornoPath + '" fill="none" stroke="#ff00ff" stroke-width="0.5" id="CutContour"/>' : '') + '</svg>';
  };
})(window);
