/* Verificadores independientes (solo pruebas): lector de MP4 y de WebM */
const u32 = (b, o) => (b[o] * 16777216) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
function cajas(b, ini, fin, out) {
  out = out || [];
  while (ini + 8 <= fin) {
    let tam = u32(b, ini), tipo = String.fromCharCode(b[ini + 4], b[ini + 5], b[ini + 6], b[ini + 7]), cab = 8;
    if (tam === 1) { tam = u32(b, ini + 12); cab = 16; } else if (tam === 0) tam = fin - ini;
    out.push({ tipo, ini: ini + cab, fin: ini + tam, tam });
    ini += tam;
  }
  return out;
}
const hijo = (b, c, t) => cajas(b, c.ini, c.fin).filter(x => x.tipo === t);
exports.mp4 = function (b) {
  const top = cajas(b, 0, b.length), moov = top.find(c => c.tipo === 'moov'), res = { pistas: [], tipos: top.map(c => c.tipo) };
  hijo(b, moov, 'trak').forEach(tr => {
    const mdia = hijo(b, tr, 'mdia')[0], mdhd = hijo(b, mdia, 'mdhd')[0], hdlr = hijo(b, mdia, 'hdlr')[0];
    const stbl = hijo(b, hijo(b, mdia, 'minf')[0], 'stbl')[0], g = t => hijo(b, stbl, t)[0];
    const p = { tipo: String.fromCharCode(...b.slice(hdlr.ini + 8, hdlr.ini + 12)), escala: u32(b, mdhd.ini + 12), dur: u32(b, mdhd.ini + 16) };
    const stsz = g('stsz'), n = u32(b, stsz.ini + 8); p.tam = []; for (let i = 0; i < n; i++) p.tam.push(u32(b, stsz.ini + 12 + 4 * i));
    const stco = g('stco'); p.off = []; for (let i = 0; i < u32(b, stco.ini + 4); i++) p.off.push(u32(b, stco.ini + 8 + 4 * i));
    const stsc = g('stsc'), ne = u32(b, stsc.ini + 4), ent0 = []; for (let k = 0; k < ne; k++) ent0.push([u32(b, stsc.ini + 8 + 12 * k), u32(b, stsc.ini + 12 + 12 * k)]);
    { const offs = []; let si = 0; for (let ch = 0; ch < p.off.length; ch++) { let per = 1; ent0.forEach(e => { if (ch + 1 >= e[0]) per = e[1]; }); let o = p.off[ch]; for (let k = 0; k < per && si < p.tam.length; k++, si++) { offs.push(o); o += p.tam[si]; } } p.off = offs; }
    const stts = g('stts'); p.durs = []; for (let i = 0; i < u32(b, stts.ini + 4); i++) { const c = u32(b, stts.ini + 8 + 8 * i), d = u32(b, stts.ini + 12 + 8 * i); for (let k = 0; k < c; k++) p.durs.push(d); }
    const stss = g('stss'); p.keys = null; if (stss) { p.keys = []; for (let i = 0; i < u32(b, stss.ini + 4); i++) p.keys.push(u32(b, stss.ini + 8 + 4 * i)); }
    const stsd = g('stsd'), ent = cajas(b, stsd.ini + 8, stsd.fin)[0]; p.entrada = ent.tipo;
    if (p.tipo === 'vide') { const av = cajas(b, ent.ini + 78, ent.fin).find(c => c.tipo === 'avcC'); p.desc = b.slice(av.ini, av.fin); p.w = (b[ent.ini + 24] << 8) | b[ent.ini + 25]; p.h = (b[ent.ini + 26] << 8) | b[ent.ini + 27]; }
    else { const es = cajas(b, ent.ini + 28, ent.fin).find(c => c.tipo === 'esds'); const e = b.slice(es.ini + 4, es.fin); let i = 0;
      const len = () => { let v = 0, x; do { x = e[i++]; v = (v << 7) | (x & 127); } while (x & 128); return v; };
      i++; len(); i += 3; i++; len(); i += 13; i++; const l = len(); p.desc = e.slice(i, i + l); }
    res.pistas.push(p);
  });
  res.muestras = (p) => p.off.map((o, i) => b.slice(o, o + p.tam[i]));
  return res;
};
exports.webm = function (b) {
  let i = 0;
  function id() { let l = 1, m = 0x80; while (!(b[i] & m)) { l++; m >>= 1; } let v = 0; for (let k = 0; k < l; k++) v = v * 256 + b[i + k]; i += l; return v; }
  function sz() { let l = 1, m = 0x80; while (!(b[i] & m)) { l++; m >>= 1; } let v = b[i] & (m - 1); for (let k = 1; k < l; k++) v = v * 256 + b[i + k]; i += l; return v; }
  const res = { bloques: [], pistas: {}, dur: 0, cues: 0 };
  function recorre(fin, nivel, ctx) {
    while (i < fin) {
      const e = id(), s = sz(), f = i + s;
      if ([0x18538067, 0x1F43B675, 0x1654AE6B, 0xAE, 0x1549A966, 0x1C53BB6B, 0xE0, 0xE1].includes(e)) {
        if (e === 0xAE) { const t = {}; res._t = t; recorre(f, nivel + 1, 'te'); res.pistas[t.num] = t; } else recorre(f, nivel + 1, e === 0x1F43B675 ? 'cl' : ctx);
      } else {
        if (e === 0xD7) res._t.num = b[i]; else if (e === 0x86) res._t.codec = String.fromCharCode(...b.slice(i, f));
        else if (e === 0x63A2) res._t.priv = b.slice(i, f); else if (e === 0xB0) res._t.w = (b[i] << 8) | b[i + 1]; else if (e === 0xBA) res._t.h = (b[i] << 8) | b[i + 1];
        else if (e === 0xE7) res.tc = b.slice(i, f).reduce((a, x) => a * 256 + x, 0);
        else if (e === 0x4489) res.dur = new DataView(b.buffer, b.byteOffset + i, s).getFloat64(0);
        else if (e === 0xBB) res.cues++;
        else if (e === 0xA3) { res.bloques.push({ pista: b[i] & 0x7f, ts: res.tc + new DataView(b.buffer, b.byteOffset + i + 1, 2).getInt16(0), key: !!(b[i + 3] & 0x80), data: b.slice(i + 4, f) }); }
        i = f;
      }
    }
  }
  const eb = id(); const es = sz(); i += es; // EBML header
  const seg = id(); const ss = sz(); recorre(i + ss, 0, null);
  return res;
};
