/* Muxers propios MP4 (H.264 + AAC) y WebM (VP8/VP9/AV1 + Opus) a partir de chunks de WebCodecs. VE.muxer */
(function (g) {
  var X = {};
  function cat(arr) {
    var n = 0, i; for (i = 0; i < arr.length; i++) n += arr[i].length;
    var o = new Uint8Array(n), p = 0; for (i = 0; i < arr.length; i++) { o.set(arr[i], p); p += arr[i].length; }
    return o;
  }
  function be(n, len) { var a = new Uint8Array(len); for (var i = len - 1; i >= 0; i--) { a[i] = n % 256; n = Math.floor(n / 256); } return a; }
  function str(s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function zeros(n) { return new Uint8Array(n); }
  function f64(v) { var a = new Uint8Array(8); new DataView(a.buffer).setFloat64(0, v); return a; }
  function f32(v) { var a = new Uint8Array(4); new DataView(a.buffer).setFloat32(0, v); return a; }

  /* ---------- MP4 ---------- */
  function box(type) { var parts = [].slice.call(arguments, 1), body = cat(parts); return cat([be(body.length + 8, 4), str(type), body]); }
  function full(type, ver, flags) { var parts = [].slice.call(arguments, 3); return box.apply(null, [type, be(ver << 24 | flags, 4)].concat(parts)); }
  var MATRIZ = cat([be(0x10000, 4), zeros(12), be(0x10000, 4), zeros(12), be(0x40000000, 4)]);

  X.MP4 = function (o) { this.o = o; this.v = []; this.a = []; };
  X.MP4.prototype.addVideo = function (ts, dur, key, data) { this.v.push({ ts: ts, dur: dur, key: key, data: data }); };
  X.MP4.prototype.addAudio = function (ts, dur, data) { this.a.push({ ts: ts, dur: dur, data: data }); };
  function duraciones(ss, escala) {
    var d = [];
    for (var i = 0; i < ss.length; i++) {
      var a = Math.round(ss[i].ts * escala / 1e6), b = i + 1 < ss.length ? Math.round(ss[i + 1].ts * escala / 1e6) : a + Math.max(1, Math.round((ss[i].dur || (i ? ss[i].ts - ss[i - 1].ts : 33333)) * escala / 1e6));
      d.push(Math.max(1, b - a));
    }
    return d;
  }
  function rle(vals) {
    var r = [], i = 0; while (i < vals.length) { var j = i; while (j < vals.length && vals[j] === vals[i]) j++; r.push([j - i, vals[i]]); i = j; }
    return r;
  }
  X.MP4.prototype.finalizar = function () {
    var o = this.o, vs = this.v.slice().sort(function (a, b) { return a.ts - b.ts; }), as = this.a.slice().sort(function (a, b) { return a.ts - b.ts; });
    if (!vs.length) throw new Error('MP4 sin video');
    var items = [], i = 0, j = 0;
    while (i < vs.length || j < as.length) {
      if (j >= as.length || (i < vs.length && vs[i].ts <= as[j].ts)) items.push({ pista: 0, m: vs[i++] }); else items.push({ pista: 1, m: as[j++] });
    }
    var tot = 0; items.forEach(function (it) { tot += it.m.data.length; });
    if (tot > 4e9) throw new Error('Archivo mayor de 4 GB no soportado');
    var vEsc = 90000, aEsc = o.audio ? o.audio.sr : 1000;
    var vd = duraciones(vs, vEsc), ad = as.length ? as.map(function (a) { return Math.max(1, Math.round(a.dur * aEsc / 1e6)); }) : [];
    var vDur = vd.reduce(function (a, b) { return a + b; }, 0), aDur = ad.reduce(function (a, b) { return a + b; }, 0);
    var movDur = Math.round(Math.max(vDur / vEsc, aDur / aEsc) * 1000);
    var ftyp = box('ftyp', str('isom'), be(512, 4), str('isom'), str('iso2'), str('avc1'), str('mp41'));

    function trak(id, tipo, esc, dur, sampleDur, sizes, offsets, entry, keys) {
      var tkhd = full('tkhd', 0, 3, be(0, 4), be(0, 4), be(id, 4), be(0, 4), be(Math.round(dur / esc * 1000), 4), zeros(8), be(0, 2), be(0, 2), be(tipo === 'soun' ? 0x100 : 0, 2), be(0, 2), MATRIZ, be((tipo === 'vide' ? o.ancho : 0) * 65536, 4), be((tipo === 'vide' ? o.alto : 0) * 65536, 4));
      var mdhd = full('mdhd', 0, 0, be(0, 4), be(0, 4), be(esc, 4), be(dur, 4), be(0x55c4, 2), be(0, 2));
      var hdlr = full('hdlr', 0, 0, be(0, 4), str(tipo), zeros(12), str(tipo === 'vide' ? 'Video\0' : 'Audio\0'));
      var xmhd = tipo === 'vide' ? full('vmhd', 0, 1, zeros(8)) : full('smhd', 0, 0, zeros(4));
      var dinf = box('dinf', full('dref', 0, 0, be(1, 4), full('url ', 0, 1)));
      var stts = full.apply(null, ['stts', 0, 0, be(0, 4)]), rr = rle(sampleDur);
      stts = full('stts', 0, 0, be(rr.length, 4), cat(rr.map(function (r) { return cat([be(r[0], 4), be(r[1], 4)]); })));
      var stsd = full('stsd', 0, 0, be(1, 4), entry);
      var stss = keys ? full('stss', 0, 0, be(keys.length, 4), cat(keys.map(function (k) { return be(k, 4); }))) : new Uint8Array(0);
      var stsc = full('stsc', 0, 0, be(1, 4), be(1, 4), be(1, 4), be(1, 4));
      var stsz = full('stsz', 0, 0, be(0, 4), be(sizes.length, 4), cat(sizes.map(function (s) { return be(s, 4); })));
      var stco = full('stco', 0, 0, be(offsets.length, 4), cat(offsets.map(function (s) { return be(s, 4); })));
      return box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', xmhd, dinf, box('stbl', stsd, stts, stss, stsc, stsz, stco))));
    }
    var vSizes = vs.map(function (s) { return s.data.length; }), aSizes = as.map(function (s) { return s.data.length; });
    var keys = []; vs.forEach(function (s, k) { if (s.key) keys.push(k + 1); });
    if (!keys.length || keys[0] !== 1) keys.unshift(1);
    function moov(base) {
      var vOff = [], aOff = [], pos = base;
      items.forEach(function (it) { (it.pista ? aOff : vOff).push(pos); pos += it.m.data.length; });
      var avc1 = box('avc1', zeros(6), be(1, 2), zeros(16), be(o.ancho, 2), be(o.alto, 2), be(0x480000, 4), be(0x480000, 4), be(0, 4), be(1, 2), zeros(32), be(0x18, 2), be(0xffff, 2), box('avcC', o.video.description));
      var traks = [trak(1, 'vide', vEsc, vDur, vd, vSizes, vOff, avc1, keys)];
      if (as.length && o.audio) {
        var asc = o.audio.description, len = asc.length;
        var esds = full('esds', 0, 0, cat([new Uint8Array([3, 23 + len, 0, 0, 0, 4, 15 + len, 0x40, 0x15, 0, 0, 0]), be(o.audio.bitrate || 128000, 4), be(o.audio.bitrate || 128000, 4), new Uint8Array([5, len]), asc, new Uint8Array([6, 1, 2])]));
        var mp4a = box('mp4a', zeros(6), be(1, 2), zeros(8), be(o.audio.canales || 2, 2), be(16, 2), be(0, 2), be(0, 2), be(o.audio.sr * 65536 > 0xffffffff ? 0 : o.audio.sr * 65536, 4), esds);
        traks.push(trak(2, 'soun', aEsc, aDur, ad, aSizes, aOff, mp4a, null));
      }
      var mvhd = full('mvhd', 0, 0, be(0, 4), be(0, 4), be(1000, 4), be(movDur, 4), be(0x10000, 4), be(0x100, 2), zeros(10), MATRIZ, zeros(24), be(traks.length + 1, 4));
      return box.apply(null, ['moov', mvhd].concat(traks));
    }
    var m0 = moov(0), m1 = moov(ftyp.length + m0.length + 8);
    var partes = [ftyp, m1, be(tot + 8, 4), str('mdat')];
    items.forEach(function (it) { partes.push(it.m.data); });
    return cat(partes);
  };

  /* ---------- WebM / EBML ---------- */
  function vint(n) {
    var l = 1; while (n >= Math.pow(2, 7 * l) - 1 && l < 8) l++;
    var a = be(n, l); a[0] |= (0x80 >> (l - 1)); return a;
  }
  function idb(id) { var h = id.toString(16); if (h.length % 2) h = '0' + h; var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function el(id) { var body = cat([].slice.call(arguments, 1)); return cat([idb(id), vint(body.length), body]); }
  function uint(id, v, len) {
    if (!len) { len = 1; while (v >= Math.pow(256, len)) len++; }
    return el(id, be(v, len));
  }
  X.WebM = function (o) { this.o = o; this.v = []; this.a = []; };
  X.WebM.prototype.addVideo = function (ts, dur, key, data) { this.v.push({ ts: ts, dur: dur, key: key, data: data }); };
  X.WebM.prototype.addAudio = function (ts, dur, data) { this.a.push({ ts: ts, dur: dur, data: data }); };
  X.WebM.prototype.finalizar = function () {
    var o = this.o, items = [];
    this.v.forEach(function (m) { items.push({ t: 1, m: m }); }); this.a.forEach(function (m) { items.push({ t: 2, m: m }); });
    items.sort(function (a, b) { return a.m.ts - b.m.ts || a.t - b.t; });
    var last = 0; items.forEach(function (it) { last = Math.max(last, it.m.ts + (it.m.dur || 0)); });
    var CODEC = { vp8: 'V_VP8', vp9: 'V_VP9', av1: 'V_AV1' };
    var vt = el(0xAE, uint(0xD7, 1), uint(0x73C5, 1), uint(0x83, 1), uint(0x9C, 0), el(0x86, str(CODEC[o.video.codec] || 'V_VP9')),
      o.video.description ? el(0x63A2, o.video.description) : new Uint8Array(0),
      el(0xE0, uint(0xB0, o.ancho), uint(0xBA, o.alto)));
    var tracks = [vt];
    if (this.a.length && o.audio) {
      var head = o.audio.description;
      if (!head) { head = cat([str('OpusHead'), new Uint8Array([1, o.audio.canales || 2]), new Uint8Array([0x38, 0x01]), new Uint8Array([o.audio.sr & 255, (o.audio.sr >> 8) & 255, (o.audio.sr >> 16) & 255, (o.audio.sr >> 24) & 255]), new Uint8Array([0, 0, 0])]); }
      tracks.push(el(0xAE, uint(0xD7, 2), uint(0x73C5, 2), uint(0x83, 2), uint(0x9C, 0), el(0x86, str('A_OPUS')), el(0x63A2, head), uint(0x56AA, 6500000), uint(0x56BB, 80000000),
        el(0xE1, el(0xB5, f32(o.audio.sr)), uint(0x9F, o.audio.canales || 2))));
    }
    var info = el(0x1549A966, uint(0x2AD7B1, 1000000), el(0x4D80, str('VE')), el(0x5741, str('Editor de video')), el(0x4489, f64(last / 1000)));
    var trk = el.apply(null, [0x1654AE6B].concat(tracks));
    // clusters
    var clusters = [], cues = [], cur = null, t0 = 0;
    function cerrar() { if (cur) { clusters.push(el.apply(null, [0x1F43B675, uint(0xE7, t0)].concat(cur))); cur = null; } }
    var sizes = [];
    items.forEach(function (it) {
      var ms = Math.round(it.m.ts / 1000);
      if (cur && (ms - t0 > 30000 || (it.t === 1 && it.m.key && ms - t0 >= 2000))) cerrar();
      if (!cur) { cur = []; t0 = ms; if (it.t === 1 && it.m.key) cues.push({ t: ms, ci: clusters.length }); }
      var blk = cat([new Uint8Array([0x80 | it.t]), be((ms - t0) & 0xffff, 2), new Uint8Array([it.t === 2 || it.m.key ? 0x80 : 0]), it.m.data]);
      cur.push(el(0xA3, blk));
    });
    cerrar();
    if (!cues.length && clusters.length) cues.push({ t: 0, ci: 0 });
    var ebml = el(0x1A45DFA3, uint(0x4286, 1), uint(0x42F7, 1), uint(0x42F2, 4), uint(0x42F3, 8), el(0x4282, str('webm')), uint(0x4287, 4), uint(0x4285, 2));
    function cuesEl(base) {
      var pos = [], p = base; clusters.forEach(function (c) { pos.push(p); p += c.length; });
      return el.apply(null, [0x1C53BB6B].concat(cues.map(function (c) { return el(0xBB, uint(0xB3, c.t, 4), el(0xB7, uint(0xF7, 1), uint(0xF1, pos[c.ci], 4))); })));
    }
    var pre = info.length + trk.length, c0 = cuesEl(0), base = pre + c0.length;
    var cu = cuesEl(base);
    var segBody = cat([info, trk, cu].concat(clusters));
    var seg = cat([idb(0x18538067), vint(segBody.length), segBody]);
    return cat([ebml, seg]);
  };
  g.VE = g.VE || {}; g.VE.muxer = X;
  if (typeof module !== 'undefined') module.exports = X;
})(typeof window !== 'undefined' ? window : globalThis);
