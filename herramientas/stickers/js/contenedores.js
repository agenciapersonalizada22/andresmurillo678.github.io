/* Contenedores de imagen sin DOM: lectura de PNG/WebP y ensamblado de APNG y WebP animado a partir de fotogramas ya codificados. UMD: window.StContenedores. */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.StContenedores = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const K = {};
  let TAB = null;
  const crc32 = (...partes) => { if (!TAB) { TAB = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TAB[n] = c >>> 0; } } let c = 0xFFFFFFFF; for (const d of partes) for (let i = 0; i < d.length; i++) c = TAB[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  K.crc32 = crc32;
  const u32 = (v) => [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255], rd32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
  const txt = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
  const unir = (partes) => { let n = 0; partes.forEach((p) => { n += p.length; }); const o = new Uint8Array(n); let k = 0; partes.forEach((p) => { o.set(p, k); k += p.length; }); return o; };
  K.unir = unir;

  K.leerPNG = function (b) {
    const firma = [137, 80, 78, 71, 13, 10, 26, 10]; for (let i = 0; i < 8; i++) if (b[i] !== firma[i]) throw new Error('No es un PNG');
    const chunks = []; let o = 8;
    while (o + 8 <= b.length) { const n = rd32(b, o), tipo = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]); chunks.push({ tipo, datos: b.subarray(o + 8, o + 8 + n) }); o += 12 + n; if (tipo === 'IEND') break; }
    const ih = chunks[0].datos; return { w: rd32(ih, 0), h: rd32(ih, 4), chunks, ihdr: ih };
  };
  const chunkPNG = (tipo, datos) => { const t = txt(tipo); return unir([Uint8Array.from(u32(datos.length)), t, datos, Uint8Array.from(u32(crc32(t, datos)))]); };

  /* PNGs (Uint8Array) del mismo tamano -> APNG. retardosMs por fotograma; bucles 0 = infinito. */
  K.apng = function (pngs, retardosMs, bucles) {
    if (!pngs.length) throw new Error('Sin fotogramas');
    const L = pngs.map(K.leerPNG), w = L[0].w, h = L[0].h; L.forEach((p) => { if (p.w !== w || p.h !== h) throw new Error('Los fotogramas deben medir lo mismo'); });
    const partes = [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), chunkPNG('IHDR', L[0].ihdr), chunkPNG('acTL', Uint8Array.from([].concat(u32(L.length), u32(bucles || 0))))];
    let seq = 0;
    L.forEach((p, i) => {
      const ms = Math.max(1, Math.round(retardosMs[i] || 100));
      partes.push(chunkPNG('fcTL', Uint8Array.from([].concat(u32(seq++), u32(w), u32(h), u32(0), u32(0), [ms >> 8 & 255, ms & 255, 0x03, 0xE8], [0, 0]))));
      p.chunks.filter((c) => c.tipo === 'IDAT').forEach((c) => partes.push(i === 0 ? chunkPNG('IDAT', c.datos) : chunkPNG('fdAT', unir([Uint8Array.from(u32(seq++)), c.datos]))));
    });
    partes.push(chunkPNG('IEND', new Uint8Array(0))); return unir(partes);
  };
  /* Lee la estructura de un APNG para verificar. */
  K.infoAPNG = function (b) {
    const p = K.leerPNG(b), act = p.chunks.find((c) => c.tipo === 'acTL'); if (!act) return null;
    const fc = p.chunks.filter((c) => c.tipo === 'fcTL').map((c) => ({ seq: rd32(c.datos, 0), w: rd32(c.datos, 4), h: rd32(c.datos, 8), ms: (c.datos[20] << 8 | c.datos[21]) * 1000 / ((c.datos[22] << 8 | c.datos[23]) || 100), dispose: c.datos[24], blend: c.datos[25] }));
    return { w: p.w, h: p.h, frames: rd32(act.datos, 0), bucles: rd32(act.datos, 4), fcTL: fc, tipos: p.chunks.map((c) => c.tipo) };
  };

  /* ---- WebP ---- */
  const rl32 = (d, o) => (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0, l32 = (v) => [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255], l24 = (v) => [v & 255, v >>> 8 & 255, v >>> 16 & 255];
  const tag = (d, o) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);
  K.leerWebP = function (b) {
    if (tag(b, 0) !== 'RIFF' || tag(b, 8) !== 'WEBP') throw new Error('No es un WebP');
    const chunks = []; let o = 12; while (o + 8 <= b.length) { const n = rl32(b, o + 4); chunks.push({ tipo: tag(b, o), datos: b.subarray(o + 8, o + 8 + n) }); o += 8 + n + (n & 1); }
    let w = 0, h = 0, alfa = false, anim = false;
    const vx = chunks.find((c) => c.tipo === 'VP8X');
    if (vx) { w = (vx.datos[4] | vx.datos[5] << 8 | vx.datos[6] << 16) + 1; h = (vx.datos[7] | vx.datos[8] << 8 | vx.datos[9] << 16) + 1; alfa = !!(vx.datos[0] & 0x10); anim = !!(vx.datos[0] & 0x02); }
    else { const c = chunks[0]; if (c.tipo === 'VP8L') { const d = c.datos; w = ((d[1] | d[2] << 8) & 0x3fff) + 1; h = (((d[2] >> 6) | d[3] << 2 | d[4] << 10) & 0x3fff) + 1; alfa = !!(d[4] >> 4 & 1); } else if (c.tipo === 'VP8 ') { const d = c.datos; w = (d[6] | d[7] << 8) & 0x3fff; h = (d[8] | d[9] << 8) & 0x3fff; } }
    if (chunks.some((c) => c.tipo === 'ALPH')) alfa = true;
    return { w, h, alfa, animado: anim, chunks };
  };
  const chunkW = (tipo, datos) => unir([txt(tipo), Uint8Array.from(l32(datos.length)), datos, datos.length & 1 ? Uint8Array.of(0) : new Uint8Array(0)]);
  /* WebP estaticos -> WebP animado (sin recodificar: solo reempaqueta los datos de cada imagen). */
  K.webpAnimado = function (webps, retardosMs, bucles) {
    if (!webps.length) throw new Error('Sin fotogramas');
    const I = webps.map(K.leerWebP), w = I[0].w, h = I[0].h; I.forEach((p) => { if (p.w !== w || p.h !== h) throw new Error('Los fotogramas deben medir lo mismo'); });
    const partes = [chunkW('VP8X', Uint8Array.from([0x12, 0, 0, 0].concat(l24(w - 1), l24(h - 1)))), chunkW('ANIM', Uint8Array.from([0, 0, 0, 0].concat([(bucles || 0) & 255, (bucles || 0) >> 8 & 255])))];
    I.forEach((p, i) => {
      const datos = unir(p.chunks.filter((c) => c.tipo === 'ALPH' || c.tipo === 'VP8 ' || c.tipo === 'VP8L').map((c) => chunkW(c.tipo, c.datos)));
      const ms = Math.min(0xFFFFFF, Math.max(8, Math.round(retardosMs[i] || 100)));
      partes.push(chunkW('ANMF', unir([Uint8Array.from([0, 0, 0, 0, 0, 0].concat(l24(w - 1), l24(h - 1), l24(ms), [0x02])), datos])));
    });
    const cuerpo = unir([txt('WEBP')].concat(partes)); return unir([txt('RIFF'), Uint8Array.from(l32(cuerpo.length)), cuerpo]);
  };
  K.infoWebPAnim = function (b) {
    const p = K.leerWebP(b), an = p.chunks.filter((c) => c.tipo === 'ANMF');
    return { w: p.w, h: p.h, animado: p.animado, frames: an.length, ms: an.map((c) => c.datos[12] | c.datos[13] << 8 | c.datos[14] << 16), tipos: p.chunks.map((c) => c.tipo) };
  };
  return K;
});
