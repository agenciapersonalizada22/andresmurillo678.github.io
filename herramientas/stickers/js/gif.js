/* GIF propio: cuantizacion de color (corte mediano), codificador LZW con transparencia y decodificador (para importar GIF). Sin DOM. UMD: window.StGif. */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.StGif = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const G = {};

  /* Paleta por corte mediano sobre histograma RGB555. rgba (Uint8ClampedArray); solo pixeles con alfa >= 128. Devuelve [[r,g,b]..] (<= n). */
  G.paleta = function (rgbaLista, n) {
    const cuenta = new Map();
    for (const d of rgbaLista) { const paso = Math.max(1, Math.floor(d.length / 4 / 40000)); for (let p = 0; p < d.length / 4; p += paso) { const i = p * 4; if (d[i + 3] < 128) continue; const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); let e = cuenta.get(k); if (!e) cuenta.set(k, e = [0, 0, 0, 0]); e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2]; } }
    let cajas = [{ c: Array.from(cuenta, ([k, v]) => [k >> 10 & 31, k >> 5 & 31, k & 31, v[0], v[1], v[2], v[3]]) }]; if (!cajas[0].c.length) return [[0, 0, 0]];
    const rango = (b) => { const mn = [31, 31, 31], mx = [0, 0, 0]; for (const c of b.c) for (let j = 0; j < 3; j++) { if (c[j] < mn[j]) mn[j] = c[j]; if (c[j] > mx[j]) mx[j] = c[j]; } b.r = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]; b.tot = b.c.reduce((s, c) => s + c[3], 0); b.mx = Math.max(...b.r); return b; };
    cajas = cajas.map(rango);
    while (cajas.length < n) {
      let bi = -1, bv = 0; cajas.forEach((b, i) => { const v = b.mx * Math.log2(1 + b.tot); if (b.c.length > 1 && b.mx > 0 && v > bv) { bv = v; bi = i; } });
      if (bi < 0) break; const b = cajas[bi], eje = b.r.indexOf(b.mx); b.c.sort((p, q) => p[eje] - q[eje]);
      let acc = 0, corte = 0; const mitad = b.tot / 2; for (let i = 0; i < b.c.length - 1; i++) { acc += b.c[i][3]; corte = i + 1; if (acc >= mitad) break; }
      cajas.splice(bi, 1, rango({ c: b.c.slice(0, corte) }), rango({ c: b.c.slice(corte) }));
    }
    return cajas.map((b) => { let r = 0, gg = 0, bb = 0, t = 0; for (const c of b.c) { t += c[3]; r += c[4]; gg += c[5]; bb += c[6]; } return [Math.round(r / t), Math.round(gg / t), Math.round(bb / t)]; });
  };
  G.indexar = function (d, pal, tr) {   // -> Uint8Array de indices; transparente -> tr
    const n = d.length / 4, out = new Uint8Array(n), cache = new Int16Array(32768).fill(-1);
    for (let p = 0; p < n; p++) {
      const i = p * 4; if (tr >= 0 && d[i + 3] < 128) { out[p] = tr; continue; }
      const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3); let c = cache[k];
      if (c < 0) { let best = 1e9; const r = (k >> 10 & 31) * 8 + 4, gg = (k >> 5 & 31) * 8 + 4, b = (k & 31) * 8 + 4; for (let j = 0; j < pal.length; j++) { const e = (pal[j][0] - r) ** 2 + (pal[j][1] - gg) ** 2 + (pal[j][2] - b) ** 2; if (e < best) { best = e; c = j; } } cache[k] = c; }
      out[p] = c;
    }
    return out;
  };

  function lzw(idx, minBits) {
    const clear = 1 << minBits, eoi = clear + 1, tabla = new Int32Array(1 << 20).fill(-1), out = []; let cod = minBits + 1, sig = eoi + 1, buf = 0, nb = 0;
    const emit = (c) => { buf |= c << nb; nb += cod; while (nb >= 8) { out.push(buf & 255); buf >>>= 8; nb -= 8; } };
    emit(clear); let pre = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = pre << 8 | k, c = tabla[key];
      if (c >= 0) { pre = c; continue; }
      emit(pre);
      if (sig > (1 << cod) - 1 && cod < 12) cod++;
      if (sig < 4096) tabla[key] = sig++;
      else { emit(clear); tabla.fill(-1); cod = minBits + 1; sig = eoi + 1; }
      pre = k;
    }
    emit(pre); if (sig > (1 << cod) - 1 && cod < 12) cod++; emit(eoi); if (nb > 0) out.push(buf & 255);
    return out;
  }

  /* frames [{rgba, ms}] (todos w x h). opciones {bucles (0 = infinito), colores (2..256)}. Devuelve Uint8Array del .gif */
  G.codificar = function (frames, w, h, o) {
    o = Object.assign({ bucles: 0, colores: 256 }, o || {}); const out = [], u16 = (v) => [v & 255, v >> 8 & 255];
    out.push(...[71, 73, 70, 56, 57, 97], ...u16(w), ...u16(h), 0x00, 0, 0);
    if (frames.length > 1) out.push(0x21, 0xFF, 11, ...Array.from('NETSCAPE2.0', (c) => c.charCodeAt(0)), 3, 1, ...u16(o.bucles), 0);
    for (const fr of frames) {
      const d = fr.rgba; let hayTr = false; for (let i = 3; i < d.length; i += 4) if (d[i] < 128) { hayTr = true; break; }
      const maxc = Math.min(o.colores, hayTr ? 255 : 256), pal = G.paleta([d], maxc); let bits = 1; while ((1 << bits) < pal.length + (hayTr ? 1 : 0)) bits++;
      const real = pal.slice(), tr = hayTr ? pal.length : -1, tam = 1 << bits; while (pal.length < tam) pal.push([0, 0, 0]);
      const idx = G.indexar(d, real, tr);
      const cs = Math.max(1, Math.round((fr.ms || 100) / 10));
      out.push(0x21, 0xF9, 4, (hayTr ? 0x09 : 0x04) | 0, ...u16(cs), hayTr ? tr : 0, 0);   // eliminacion: restaurar fondo si hay transparencia
      out.push(0x2C, 0, 0, 0, 0, ...u16(w), ...u16(h), 0x80 | (bits - 1));
      for (const c of pal) out.push(c[0], c[1], c[2]);
      const mb = Math.max(2, bits), datos = lzw(idx, mb); out.push(mb);
      for (let i = 0; i < datos.length; i += 255) { const t = Math.min(255, datos.length - i); out.push(t); for (let j = 0; j < t; j++) out.push(datos[i + j]); }
      out.push(0);
    }
    out.push(0x3B); return Uint8Array.from(out);
  };

  /* Decodificador: -> {w, h, frames:[{rgba, ms}]} con cada fotograma ya compuesto sobre el lienzo (respeta transparencia y eliminacion). */
  G.decodificar = function (b) {
    if (String.fromCharCode(...b.subarray(0, 3)) !== 'GIF') throw new Error('No es un GIF');
    let o = 6; const w = b[o] | b[o + 1] << 8, h = b[o + 2] | b[o + 3] << 8, fl = b[o + 4]; o += 7;
    let gct = null; if (fl & 0x80) { const n = 2 << (fl & 7); gct = []; for (let i = 0; i < n; i++) gct.push([b[o + i * 3], b[o + i * 3 + 1], b[o + i * 3 + 2]]); o += n * 3; }
    const lienzo = new Uint8ClampedArray(w * h * 4), frames = []; let gce = { ms: 100, tr: -1, disp: 0 };
    while (o < b.length) {
      const t = b[o++];
      if (t === 0x3B) break;
      if (t === 0x21) { const et = b[o++]; if (et === 0xF9) { const fl2 = b[o + 1]; gce = { ms: (b[o + 2] | b[o + 3] << 8) * 10 || 100, tr: fl2 & 1 ? b[o + 4] : -1, disp: fl2 >> 2 & 7 }; } while (b[o]) o += b[o] + 1; o++; continue; }
      if (t !== 0x2C) throw new Error('GIF corrupto');
      const x0 = b[o] | b[o + 1] << 8, y0 = b[o + 2] | b[o + 3] << 8, iw = b[o + 4] | b[o + 5] << 8, ih = b[o + 6] | b[o + 7] << 8, f2 = b[o + 8]; o += 9;
      let pal = gct; if (f2 & 0x80) { const n = 2 << (f2 & 7); pal = []; for (let i = 0; i < n; i++) pal.push([b[o + i * 3], b[o + i * 3 + 1], b[o + i * 3 + 2]]); o += n * 3; }
      const mb = b[o++], datos = []; while (b[o]) { for (let i = 1; i <= b[o]; i++) datos.push(b[o + i]); o += b[o] + 1; } o++;
      const px = lzwDec(datos, mb, iw * ih), prev = gce.disp === 3 ? lienzo.slice() : null;
      const fila = (f2 & 0x40) ? filasEntrelazadas(ih) : null;
      for (let j = 0; j < iw * ih; j++) {
        const x = j % iw, y = fila ? fila[(j - x) / iw] : (j - x) / iw, c = px[j]; if (c === gce.tr || !pal[c]) continue;
        const k = ((y0 + y) * w + x0 + x) * 4; lienzo[k] = pal[c][0]; lienzo[k + 1] = pal[c][1]; lienzo[k + 2] = pal[c][2]; lienzo[k + 3] = 255;
      }
      frames.push({ rgba: lienzo.slice(), ms: gce.ms });
      if (gce.disp === 2) for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) lienzo.fill(0, ((y0 + y) * w + x0 + x) * 4, ((y0 + y) * w + x0 + x) * 4 + 4);
      else if (gce.disp === 3 && prev) lienzo.set(prev);
      gce = { ms: 100, tr: -1, disp: 0 };
    }
    return { w, h, frames };
  };
  function filasEntrelazadas(ih) { const r = []; for (const [ini, paso] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = ini; y < ih; y += paso) r.push(y); return r; }
  function lzwDec(datos, mb, total) {
    const clear = 1 << mb, eoi = clear + 1, out = new Uint8Array(total), pref = new Int32Array(4096), suf = new Uint8Array(4096), pila = new Uint8Array(4097);
    let cod = mb + 1, sig = eoi + 1, buf = 0, nb = 0, pos = 0, ant = -1, p = 0;
    for (let i = 0; i < clear; i++) { suf[i] = i; pref[i] = -1; }
    while (pos < total) {
      while (nb < cod && p < datos.length) { buf |= datos[p++] << nb; nb += 8; }
      if (nb < cod) break; const c = buf & ((1 << cod) - 1); buf >>>= cod; nb -= cod;
      if (c === clear) { cod = mb + 1; sig = eoi + 1; ant = -1; continue; } if (c === eoi) break;
      let t = c, sp = 0;
      if (ant >= 0 && c >= sig) { pila[sp++] = 0; t = ant; }   // caso KwKwK, el primer byte se rellena luego
      let kw = -1;
      while (t >= clear) { pila[sp++] = suf[t]; t = pref[t]; } pila[sp++] = t; const primero = t;
      if (ant >= 0 && c >= sig) pila[0] = primero;
      if (ant >= 0 && sig < 4096) { pref[sig] = ant; suf[sig] = primero; sig++; if (sig === (1 << cod) && cod < 12) cod++; }
      while (sp > 0 && pos < total) out[pos++] = pila[--sp];
      ant = c; void kw;
    }
    return out;
  }
  return G;
});
