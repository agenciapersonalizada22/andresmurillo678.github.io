/* Lector de etiquetas propio: ID3v1/v2 (mp3), MP4/M4A, FLAC, Ogg Vorbis/Opus y RIFF WAV. Sin librerias.
   lector = { tam, leer(off, len) -> Promise<Uint8Array> }.  MuEtiq.leer(lector) -> {formato,titulo,artista,album,...,portada:{mime,datos}|null} */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuEtiq = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GEN = ['Blues','Classic Rock','Country','Dance','Disco','Funk','Grunge','Hip-Hop','Jazz','Metal','New Age','Oldies','Other','Pop','R&B','Rap','Reggae','Rock','Techno','Industrial','Alternative','Ska','Death Metal','Pranks','Soundtrack','Euro-Techno','Ambient','Trip-Hop','Vocal','Jazz+Funk','Fusion','Trance','Classical','Instrumental','Acid','House','Game','Sound Clip','Gospel','Noise','AlternRock','Bass','Soul','Punk','Space','Meditative','Instrumental Pop','Instrumental Rock','Ethnic','Gothic','Darkwave','Techno-Industrial','Electronic','Pop-Folk','Eurodance','Dream','Southern Rock','Comedy','Cult','Gangsta','Top 40','Christian Rap','Pop/Funk','Jungle','Native American','Cabaret','New Wave','Psychedelic','Rave','Showtunes','Trailer','Lo-Fi','Tribal','Acid Punk','Acid Jazz','Polka','Retro','Musical','Rock & Roll','Hard Rock'];
  function dec(enc, b) {
    try { var t = enc === 1 ? (b.length > 1 && b[0] === 0xFE && b[1] === 0xFF ? new TextDecoder('utf-16be').decode(b.subarray(2)) : new TextDecoder('utf-16le').decode(b.length > 1 && b[0] === 0xFF && b[1] === 0xFE ? b.subarray(2) : b)) : enc === 2 ? new TextDecoder('utf-16be').decode(b) : enc === 3 ? new TextDecoder('utf-8').decode(b) : new TextDecoder('windows-1252').decode(b); }
    catch (e) { t = ''; }
    return t.replace(/\u0000+$/, '');
  }
  function utf8(b) { return new TextDecoder('utf-8').decode(b); }
  function u32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
  function u32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function ss(b, o) { return ((b[o] & 127) << 21) | ((b[o + 1] & 127) << 14) | ((b[o + 2] & 127) << 7) | (b[o + 3] & 127); }
  function ascii(b, o, n) { var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(b[o + i]); return s; }
  function termino(b, o, enc) { // posicion del terminador de texto
    if (enc === 1 || enc === 2) { for (var i = o; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i; return b.length; }
    for (var j = o; j < b.length; j++) if (b[j] === 0) return j; return b.length;
  }
  function genero(s) {
    if (!s) return '';
    var m = /^\((\d+)\)(.*)$/.exec(s); if (m) return m[2] || GEN[+m[1]] || '';
    if (/^\d+$/.test(s)) return GEN[+s] || s; return s;
  }
  function numero(s) { var m = /^(\d+)(?:\/(\d+))?/.exec(String(s || '').trim()); return m ? +m[1] : 0; }
  function db(s) { var m = /(-?\d+(?:\.\d+)?)/.exec(String(s || '')); return m ? parseFloat(m[1]) : null; }
  function vacio(fmt) { return { formato: fmt, titulo: '', artista: '', album: '', albumArtista: '', genero: '', anio: 0, pista: 0, disco: 0, dur: 0, letra: '', rgTag: null, portada: null }; }

  /* ---------- ID3v2 ---------- */
  var F22 = { TT2: 'TIT2', TP1: 'TPE1', TAL: 'TALB', TP2: 'TPE2', TCO: 'TCON', TYE: 'TYER', TRK: 'TRCK', TPA: 'TPOS', PIC: 'APIC', ULT: 'USLT', TXX: 'TXXX' };
  function id3v2(b, r) {
    var ver = b[3], flags = b[5], tam = ss(b, 6), d = b.subarray(10, 10 + tam), o = 0;
    if (flags & 0x80 && ver < 4) { var l = [], i; for (i = 0; i < d.length; i++) { l.push(d[i]); if (d[i] === 0xFF && d[i + 1] === 0) i++; } d = Uint8Array.from(l); }
    if (flags & 0x40) { o = ver === 4 ? ss(d, 0) : u32(d, 0) + 4; }
    var hl = ver === 2 ? 6 : 10;
    while (o + hl <= d.length && d[o] !== 0) {
      var id = ascii(d, o, ver === 2 ? 3 : 4), n = ver === 2 ? (d[o + 3] << 16 | d[o + 4] << 8 | d[o + 5]) : ver === 4 ? ss(d, o + 4) : u32(d, o + 4), fl = ver === 2 ? 0 : d[o + 9];
      if (n <= 0 || o + hl + n > d.length) break;
      var c = d.subarray(o + hl, o + hl + n); o += hl + n;
      if (ver === 4 && fl & 0x01) c = c.subarray(4);
      if (ver === 4 && fl & 0x02) { var l2 = [], k; for (k = 0; k < c.length; k++) { l2.push(c[k]); if (c[k] === 0xFF && c[k + 1] === 0) k++; } c = Uint8Array.from(l2); }
      if (ver === 2) id = F22[id] || id;
      if (id[0] === 'T' && id !== 'TXXX') {
        var t = dec(c[0], c.subarray(1)).split('\u0000')[0];
        if (id === 'TIT2') r.titulo = t; else if (id === 'TPE1') r.artista = t; else if (id === 'TALB') r.album = t; else if (id === 'TPE2') r.albumArtista = t;
        else if (id === 'TCON') r.genero = genero(t); else if (id === 'TYER' || id === 'TDRC' || id === 'TDRL') r.anio = r.anio || numero(t); else if (id === 'TRCK') r.pista = numero(t); else if (id === 'TPOS') r.disco = numero(t);
        else if (id === 'TLEN') r.dur = (+t || 0) / 1000;
      } else if (id === 'TXXX') {
        var e0 = c[0], p = termino(c, 1, e0), desc = dec(e0, c.subarray(1, p)).toLowerCase(), val = dec(e0, c.subarray(p + (e0 === 1 || e0 === 2 ? 2 : 1)));
        if (desc === 'replaygain_track_gain') r.rgTag = db(val);
      } else if (id === 'APIC') {
        var en = c[0], mime, pos;
        if (ver === 2) { mime = 'image/' + ascii(c, 1, 3).toLowerCase().replace('jpg', 'jpeg'); pos = 4; } else { var pm = termino(c, 1, 0); mime = ascii(c, 1, pm - 1); pos = pm + 1; }
        var ptipo = c[pos]; pos += 1; var pd = termino(c, pos, en); pos = pd + (en === 1 || en === 2 ? 2 : 1);
        if (mime === 'image/jpg') mime = 'image/jpeg';
        if ((!r.portada || ptipo === 3) && /^image\//.test(mime)) r.portada = { mime: mime, datos: c.subarray(pos) };
      } else if (id === 'USLT' && !r.letra) {
        var eu = c[0], pu = termino(c, 4, eu); r.letra = dec(eu, c.subarray(pu + (eu === 1 || eu === 2 ? 2 : 1)));
      }
    }
    return 10 + tam;
  }
  function id3v1(b, r) {
    if (b.length < 128 || ascii(b, b.length - 128, 3) !== 'TAG') return;
    var o = b.length - 128, s = function (a, n) { return dec(0, b.subarray(o + a, o + a + n)).replace(/\u0000.*$/, '').trim(); };
    r.titulo = r.titulo || s(3, 30); r.artista = r.artista || s(33, 30); r.album = r.album || s(63, 30); r.anio = r.anio || numero(s(93, 4));
    if (b[o + 125] === 0 && b[o + 126]) r.pista = r.pista || b[o + 126];
    r.genero = r.genero || GEN[b[o + 127]] || '';
  }
  var BR1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], BR2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256];
  var BR13 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], BR23 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], SRS = [44100, 48000, 32000];
  function duracionMp3(b, ini, total) {
    for (var i = ini; i < b.length - 4; i++) {
      if (b[i] !== 0xFF || (b[i + 1] & 0xE0) !== 0xE0) continue;
      var vb = (b[i + 1] >> 3) & 3, ly = (b[i + 1] >> 1) & 3, bi = b[i + 2] >> 4, si = (b[i + 2] >> 2) & 3;
      if (vb === 1 || ly === 0 || bi === 0 || bi === 15 || si === 3) continue;
      var mpeg1 = vb === 3, sr = SRS[si] / (vb === 3 ? 1 : vb === 2 ? 2 : 4), lay = 4 - ly;
      var kbps = mpeg1 ? (lay === 1 ? BR1[bi] : lay === 2 ? BR2[bi] : BR13[bi]) : (lay === 1 ? BR23[bi] : BR23[bi]);
      var spf = lay === 1 ? 384 : (lay === 3 && !mpeg1 ? 576 : 1152), mono = (b[i + 3] >> 6) === 3;
      var xo = i + 4 + (mpeg1 ? (mono ? 17 : 32) : (mono ? 9 : 17)), tag = ascii(b, xo, 4);
      if ((tag === 'Xing' || tag === 'Info') && (b[xo + 7] & 1)) return u32(b, xo + 8) * spf / sr;
      return kbps ? (total - ini) * 8 / (kbps * 1000) : 0;
    }
    return 0;
  }

  /* ---------- Vorbis comment / FLAC picture ---------- */
  function vorbisComentarios(b, r) {
    var o = 0, vl = u32le(b, o); o += 4 + vl; var n = u32le(b, o); o += 4;
    for (var i = 0; i < n && o + 4 <= b.length; i++) {
      var l = u32le(b, o); o += 4; var s = utf8(b.subarray(o, o + l)); o += l; var q = s.indexOf('='); if (q < 0) continue;
      var k = s.slice(0, q).toUpperCase(), v = s.slice(q + 1);
      if (k === 'TITLE') r.titulo = v; else if (k === 'ARTIST') r.artista = r.artista || v; else if (k === 'ALBUM') r.album = v; else if (k === 'ALBUMARTIST') r.albumArtista = v;
      else if (k === 'GENRE') r.genero = r.genero || v; else if (k === 'DATE' || k === 'YEAR') r.anio = r.anio || numero(v); else if (k === 'TRACKNUMBER') r.pista = numero(v); else if (k === 'DISCNUMBER') r.disco = numero(v);
      else if (k === 'LYRICS' || k === 'UNSYNCEDLYRICS') r.letra = r.letra || v; else if (k === 'REPLAYGAIN_TRACK_GAIN') r.rgTag = db(v);
      else if (k === 'METADATA_BLOCK_PICTURE' && !r.portada) { try { var bin = atob(v), a = new Uint8Array(bin.length); for (var j = 0; j < bin.length; j++) a[j] = bin.charCodeAt(j); imagenFlac(a, r); } catch (e) {} }
    }
  }
  function imagenFlac(c, r) {
    var o = 4, ml = u32(c, o); o += 4; var mime = ascii(c, o, ml); o += ml; var dl = u32(c, o); o += 4 + dl + 16; var n = u32(c, o); o += 4;
    if (!r.portada && n > 0) r.portada = { mime: mime || 'image/jpeg', datos: c.subarray(o, o + n) };
  }

  /* ---------- formatos ---------- */
  async function flac(L, r) {
    var o = 4;
    for (;;) {
      var h = await L.leer(o, 4); if (h.length < 4) break;
      var ult = h[0] & 0x80, tipo = h[0] & 0x7F, n = (h[1] << 16) | (h[2] << 8) | h[3];
      if (tipo === 0 || tipo === 4 || tipo === 6) {
        var c = await L.leer(o + 4, n);
        if (tipo === 0) { var sr = (c[10] << 12) | (c[11] << 4) | (c[12] >> 4), ts = ((c[13] & 15) * 4294967296) + u32(c, 14); if (sr) r.dur = ts / sr; }
        else if (tipo === 4) vorbisComentarios(c, r); else imagenFlac(c, r);
      }
      o += 4 + n; if (ult || o >= L.tam) break;
    }
  }
  async function ogg(L, r) {
    var b = await L.leer(0, Math.min(L.tam, 1 << 20)), o = 0, pkts = [], cur = [], tot = 0;
    while (o + 27 <= b.length && ascii(b, o, 4) === 'OggS' && pkts.length < 2) {
      var ns = b[o + 26], p = o + 27 + ns;
      for (var i = 0; i < ns; i++) { var l = b[o + 27 + i]; cur.push(b.subarray(p, p + l)); p += l; tot += l; if (l < 255) { var u = new Uint8Array(tot), q = 0; cur.forEach(function (x) { u.set(x, q); q += x.length; }); pkts.push(u); cur = []; tot = 0; if (pkts.length >= 2) break; } }
      o = p;
    }
    var hd = pkts[0], cm = pkts[1]; if (!hd || !cm) return;
    var sr = 0;
    if (ascii(hd, 1, 6) === 'vorbis') { sr = u32le(hd, 12); if (ascii(cm, 1, 6) === 'vorbis') vorbisComentarios(cm.subarray(7), r); }
    else if (ascii(hd, 0, 8) === 'OpusHead') { sr = 48000; if (ascii(cm, 0, 8) === 'OpusTags') vorbisComentarios(cm.subarray(8), r); r.formato = 'opus'; }
    var fin = await L.leer(Math.max(0, L.tam - 65536), 65536);
    for (var k = fin.length - 14; k >= 0; k--) if (fin[k] === 0x4F && ascii(fin, k, 4) === 'OggS') { var gp = u32le(fin, k + 6) + u32le(fin, k + 10) * 4294967296; if (sr && gp > 0) r.dur = gp / sr; break; }
  }
  function caja(b, o, fin) { // -> {t, ini, fin}
    if (o + 8 > fin) return null; var n = u32(b, o), t = ascii(b, o + 4, 4), h = 8;
    if (n === 1) { n = u32(b, o + 8) * 4294967296 + u32(b, o + 12); h = 16; } else if (n === 0) n = fin - o;
    if (n < h) return null; return { t: t, ini: o + h, fin: Math.min(o + n, fin), sig: o + n };
  }
  function hijos(b, ini, fin, f) { for (var o = ini; o < fin;) { var c = caja(b, o, fin); if (!c) break; if (f(c) === false) return; o = c.sig; } }
  async function mp4(L, r) {
    var o = 0, moov = null;
    while (o + 8 <= L.tam) {
      var h = await L.leer(o, 16), n = u32(h, 0), t = ascii(h, 4, 4), hl = 8;
      if (n === 1) { n = u32(h, 8) * 4294967296 + u32(h, 12); hl = 16; } else if (n === 0) n = L.tam - o;
      if (n < hl) break;
      if (t === 'moov') { if (n > 24 << 20) break; moov = await L.leer(o, n); break; }
      o += n;
    }
    if (!moov) return;
    var top = caja(moov, 0, moov.length); if (!top) return;
    hijos(moov, top.ini, top.fin, function (c) {
      if (c.t === 'mvhd') { var v = moov[c.ini], ts = v === 1 ? u32(moov, c.ini + 20) : u32(moov, c.ini + 12), du = v === 1 ? u32(moov, c.ini + 24) * 4294967296 + u32(moov, c.ini + 28) : u32(moov, c.ini + 16); if (ts) r.dur = du / ts; }
      else if (c.t === 'udta') hijos(moov, c.ini, c.fin, function (m) { if (m.t === 'meta') hijos(moov, m.ini + 4, m.fin, function (il) { if (il.t === 'ilst') hijos(moov, il.ini, il.fin, function (it) { item(moov, it, r); }); }); });
    });
  }
  function item(b, it, r) {
    var datos = null;
    hijos(b, it.ini, it.fin, function (d) { if (d.t === 'data') { datos = { tipo: u32(b, d.ini) & 0xFFFFFF, p: b.subarray(d.ini + 8, d.fin) }; return false; } });
    if (!datos) return;
    var k = it.t.replace(/©/g, '©'), txt = function () { return utf8(datos.p); };
    if (k === '©nam') r.titulo = txt(); else if (k === '©ART') r.artista = txt(); else if (k === '©alb') r.album = txt(); else if (k === 'aART') r.albumArtista = txt();
    else if (k === '©gen') r.genero = txt(); else if (k === '©day') r.anio = numero(txt()); else if (k === '©lyr') r.letra = txt();
    else if (k === 'gnre' && datos.p.length >= 2) r.genero = r.genero || GEN[((datos.p[0] << 8) | datos.p[1]) - 1] || '';
    else if (k === 'trkn' && datos.p.length >= 4) r.pista = (datos.p[2] << 8) | datos.p[3]; else if (k === 'disk' && datos.p.length >= 4) r.disco = (datos.p[2] << 8) | datos.p[3];
    else if (k === 'covr') r.portada = { mime: datos.tipo === 14 ? 'image/png' : 'image/jpeg', datos: datos.p };
  }
  async function wav(L, r) {
    var o = 12;
    while (o + 8 <= L.tam) {
      var h = await L.leer(o, 8), t = ascii(h, 0, 4), n = u32le(h, 4);
      if (t === 'fmt ') { var f = await L.leer(o + 8, 16); r._br = u32le(f, 8); }
      else if (t === 'data') { if (r._br) r.dur = n / r._br; }
      else if (t === 'LIST' && n < 65536) {
        var l = await L.leer(o + 8, n);
        if (ascii(l, 0, 4) === 'INFO') for (var p = 4; p + 8 <= l.length;) { var id = ascii(l, p, 4), ln = u32le(l, p + 4), v = utf8(l.subarray(p + 8, p + 8 + ln)).replace(/\u0000+$/, ''); if (id === 'INAM') r.titulo = v; else if (id === 'IART') r.artista = v; else if (id === 'IPRD') r.album = v; else if (id === 'IGNR') r.genero = v; else if (id === 'ICRD') r.anio = numero(v); p += 8 + ln + (ln & 1); }
      }
      o += 8 + n + (n & 1);
    }
    delete r._br;
  }

  async function leer(L) {
    var ini = await L.leer(0, 16), r;
    if (ascii(ini, 0, 3) === 'ID3' && ini.length >= 10) {
      r = vacio('mp3'); var tam = ss(ini, 6), b = await L.leer(0, Math.min(L.tam, 10 + tam));
      try { id3v2(b, r); } catch (e) {}
      var fin = await L.leer(Math.max(0, L.tam - 128), 128); id3v1(fin, r);
      if (!r.dur) { var tr = await L.leer(10 + tam, 4096); r.dur = duracionMp3(tr, 0, L.tam - 10 - tam); }
    } else if (ascii(ini, 0, 4) === 'fLaC') { r = vacio('flac'); await flac(L, r); }
    else if (ascii(ini, 0, 4) === 'OggS') { r = vacio('ogg'); await ogg(L, r); }
    else if (ascii(ini, 4, 4) === 'ftyp') { r = vacio('m4a'); await mp4(L, r); }
    else if (ascii(ini, 0, 4) === 'RIFF' && ascii(ini, 8, 4) === 'WAVE') { r = vacio('wav'); await wav(L, r); }
    else { r = vacio('desconocido'); var f2 = await L.leer(Math.max(0, L.tam - 128), 128); id3v1(f2, r); if (r.titulo) r.formato = 'mp3'; var t0 = await L.leer(0, 4096); if (t0[0] === 0x1A && t0[1] === 0x45) r.formato = 'webm'; else if (t0[0] === 0xFF && (t0[1] & 0xE0) === 0xE0) { r.formato = 'mp3'; r.dur = duracionMp3(t0, 0, L.tam); } }
    return r;
  }
  function deBuffer(buf) { var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); return { tam: u.length, leer: function (o, n) { return Promise.resolve(u.subarray(o, Math.min(u.length, o + n))); } }; }
  function deArchivo(f) { return { tam: f.size, leer: function (o, n) { return f.slice(o, Math.min(f.size, o + n)).arrayBuffer().then(function (a) { return new Uint8Array(a); }); } }; }
  return { leer: leer, deBuffer: deBuffer, deArchivo: deArchivo, GENEROS: GEN };
});
