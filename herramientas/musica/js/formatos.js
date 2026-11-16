/* Escritores/lectores de WAV y MIDI estandar (puros, sin DOM). */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuFmt = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var W = {};
  /* ---- WAV PCM 16 bits o float32 ---- */
  W.wavEscribir = function (canales, sr, o) {
    o = o || {}; var flt = o.bits === 32, nc = canales.length, n = canales[0].length, ba = flt ? 4 : 2, datos = n * nc * ba, b = new Uint8Array(44 + datos), v = new DataView(b.buffer), i, c, p = 44;
    function s(off, t) { for (var k = 0; k < t.length; k++) b[off + k] = t.charCodeAt(k); }
    s(0, 'RIFF'); v.setUint32(4, 36 + datos, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, flt ? 3 : 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nc * ba, true); v.setUint16(32, nc * ba, true); v.setUint16(34, ba * 8, true); s(36, 'data'); v.setUint32(40, datos, true);
    for (i = 0; i < n; i++) for (c = 0; c < nc; c++) {
      var x = canales[c][i]; if (flt) { v.setFloat32(p, x, true); p += 4; } else { x = Math.max(-1, Math.min(1, x)); v.setInt16(p, x < 0 ? x * 32768 : x * 32767, true); p += 2; }
    }
    return b;
  };
  W.wavLeer = function (b) {
    var v = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 12, fmt = null, i, c;
    function s(off, n) { var t = ''; for (var k = 0; k < n; k++) t += String.fromCharCode(b[off + k]); return t; }
    if (s(0, 4) !== 'RIFF' || s(8, 4) !== 'WAVE') throw new Error('No es WAV');
    while (o + 8 <= b.length) {
      var id = s(o, 4), n = v.getUint32(o + 4, true);
      if (id === 'fmt ') fmt = { tipo: v.getUint16(o + 8, true), nc: v.getUint16(o + 10, true), sr: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true) };
      else if (id === 'data' && fmt) {
        var ba = fmt.bits / 8, N = Math.floor(Math.min(n, b.length - o - 8) / (ba * fmt.nc)), ch = []; for (c = 0; c < fmt.nc; c++) ch.push(new Float32Array(N));
        var p = o + 8; for (i = 0; i < N; i++) for (c = 0; c < fmt.nc; c++) { var x = fmt.tipo === 3 ? v.getFloat32(p, true) : fmt.bits === 16 ? v.getInt16(p, true) / 32768 : fmt.bits === 8 ? (b[p] - 128) / 128 : fmt.bits === 24 ? ((v.getInt8(p + 2) << 16) | (v.getUint8(p + 1) << 8) | v.getUint8(p)) / 8388608 : v.getInt32(p, true) / 2147483648; ch[c][i] = x; p += ba; }
        return { sr: fmt.sr, canales: ch, bits: fmt.bits, flotante: fmt.tipo === 3 };
      }
      o += 8 + n + (n & 1);
    }
    throw new Error('WAV sin datos');
  };

  /* ---- MIDI estandar (SMF formato 1) ---- */
  function vlq(n) { var r = [n & 127]; while ((n >>= 7)) r.unshift((n & 127) | 128); return r; }
  function u16(n) { return [n >> 8 & 255, n & 255]; } function u32(n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]; }
  function txt(s) { return Array.prototype.slice.call(new TextEncoder().encode(s)); }
  function pista(ev) { // ev: [{t, bytes}] -> bytes del chunk MTrk
    ev.sort(function (a, b) { return a.t - b.t || (a.o || 0) - (b.o || 0); });
    var d = [], t0 = 0; ev.forEach(function (e) { d = d.concat(vlq(Math.max(0, Math.round(e.t) - t0)), e.bytes); t0 = Math.max(t0, Math.round(e.t)); });
    d = d.concat([0, 0xFF, 0x2F, 0]); return [0x4D, 0x54, 0x72, 0x6B].concat(u32(d.length), d);
  }
  /* proyecto: {ppq, bpm, compas:[n,d], pistas:[{nombre, canal, programa, notas:[{nota, ini, dur, vel}]}]} (ini/dur en ticks) */
  W.midiEscribir = function (p) {
    var ppq = p.ppq || 480, us = Math.round(60000000 / (p.bpm || 120)), cp = p.compas || [4, 4], tp = [];
    tp.push({ t: 0, bytes: [0xFF, 0x03].concat(vlq(7), txt('Tempo  ').slice(0, 7)) }); tp.push({ t: 0, bytes: [0xFF, 0x51, 3, us >> 16 & 255, us >> 8 & 255, us & 255] });
    tp.push({ t: 0, bytes: [0xFF, 0x58, 4, cp[0], Math.round(Math.log2(cp[1])), 24, 8] });
    var partes = pista(tp);
    (p.pistas || []).forEach(function (t) {
      var ev = [], ch = (t.canal || 0) & 15, nm = txt(t.nombre || 'Pista');
      ev.push({ t: 0, o: -2, bytes: [0xFF, 0x03].concat(vlq(nm.length), nm) });
      if (ch !== 9 && t.programa != null) ev.push({ t: 0, o: -1, bytes: [0xC0 | ch, t.programa & 127] });
      (t.notas || []).forEach(function (n) { ev.push({ t: n.ini, o: 1, bytes: [0x90 | ch, n.nota & 127, Math.max(1, Math.min(127, n.vel || 100))] }); ev.push({ t: n.ini + Math.max(1, n.dur), o: 0, bytes: [0x80 | ch, n.nota & 127, 0] }); });
      partes = partes.concat(pista(ev));
    });
    return Uint8Array.from([0x4D, 0x54, 0x68, 0x64].concat(u32(6), u16(1), u16((p.pistas || []).length + 1), u16(ppq), partes));
  };
  W.midiLeer = function (b) {
    var v = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 0;
    function s(off, n) { var t = ''; for (var k = 0; k < n; k++) t += String.fromCharCode(b[off + k]); return t; }
    if (s(0, 4) !== 'MThd') throw new Error('No es MIDI');
    var fmt = v.getUint16(8), nt = v.getUint16(10), ppq = v.getUint16(12), res = { formato: fmt, ppq: ppq, bpm: 120, compas: [4, 4], pistas: [] }; o = 8 + v.getUint32(4);
    for (var t = 0; t < nt && o + 8 <= b.length; t++) {
      var n = v.getUint32(o + 4), p = o + 8, fin = p + n, tick = 0, est = 0, tr = { nombre: '', canal: 0, programa: null, notas: [] }, abiertas = {};
      while (p < fin) {
        var d = 0, x; do { x = b[p++]; d = (d << 7) | (x & 127); } while (x & 128); tick += d;
        var st = b[p]; if (st < 128) st = est; else p++;
        if (st === 0xFF) { var ty = b[p++], l = 0; do { x = b[p++]; l = (l << 7) | (x & 127); } while (x & 128); var dat = b.subarray(p, p + l); p += l;
          if (ty === 3) tr.nombre = new TextDecoder().decode(dat); else if (ty === 0x51 && l === 3) res.bpm = Math.round(6e7 / ((dat[0] << 16) | (dat[1] << 8) | dat[2]) * 100) / 100; else if (ty === 0x58) res.compas = [dat[0], Math.pow(2, dat[1])]; }
        else if (st === 0xF0 || st === 0xF7) { var l2 = 0; do { x = b[p++]; l2 = (l2 << 7) | (x & 127); } while (x & 128); p += l2; }
        else { est = st; var tipo = st & 0xF0, ch = st & 15, a = b[p++], c = (tipo === 0xC0 || tipo === 0xD0) ? 0 : b[p++];
          if (tipo === 0x90 && c > 0) { tr.canal = ch; abiertas[ch * 128 + a] = { ini: tick, vel: c }; }
          else if (tipo === 0x80 || tipo === 0x90) { var k = ch * 128 + a, ab = abiertas[k]; if (ab) { tr.notas.push({ nota: a, ini: ab.ini, dur: tick - ab.ini, vel: ab.vel }); delete abiertas[k]; } }
          else if (tipo === 0xC0) tr.programa = a; }
      }
      o = fin; if (tr.notas.length) res.pistas.push(tr);
    }
    res.pistas.forEach(function (t) { t.notas.sort(function (a, b) { return a.ini - b.ini || a.nota - b.nota; }); });
    return res;
  };
  return W;
});
