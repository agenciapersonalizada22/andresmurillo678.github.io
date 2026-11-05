/* Celulas: protocolo de snapshots (anfitrion -> cliente). Binario compacto -> base64 en un mensaje JSON < 16 KB.
   Cabecera: ver(1) tiempo(u32 ms) seq(u16) flags(u8: 1=comida completa, 2=vivo)
   celdas: n(u16) {id u16, dueno u8, x u16, y u16, sqrt(m)*200 u16}
   virus:  n(u16) {id u16, x u16, y u16, sqrt(m)*200 u16}
   eyecc.: n(u16) {id u16, x u16, y u16, dueno u8}
   comidas comidas recientes: n(u16) {slot u16}
   [comida completa]: rect 4*u16, n(u16) {slot u16, gen u8}   (posicion y color salen de C.posComida(semilla, slot, gen)) */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  var P = C.Proto = { MAX: 10400, VW_MAX: 2600 };
  var buf = new Uint8Array(12000), o = 0;
  function w8(v) { buf[o++] = v; }
  function w16(v) { buf[o++] = v >> 8; buf[o++] = v & 255; }
  function w32(v) { buf[o++] = (v >>> 24) & 255; buf[o++] = (v >>> 16) & 255; buf[o++] = (v >>> 8) & 255; buf[o++] = v & 255; }
  function p16(pos, v) { buf[pos] = v >> 8; buf[pos + 1] = v & 255; }
  P.q = function (v, tam) { v = Math.round(v * 65535 / tam); return v < 0 ? 0 : v > 65535 ? 65535 : v; };
  P.sq = function (m) { var v = Math.round(Math.sqrt(m) * 200); return v > 65535 ? 65535 : v; };

  /* centro y mitades de la zona de interes de un jugador */
  P.interes = function (w, j, out) {
    var cx = w.tam / 2, cy = w.tam / 2;
    if (j.cel.length) { cx = j.cx; cy = j.cy; }
    else if (j.espectar >= 0 && w.jugs[j.espectar] && w.jugs[j.espectar].cel.length) { cx = w.jugs[j.espectar].cx; cy = w.jugs[j.espectar].cy; }
    else if (w.lb.length) { var l = w.jugs[w.lb[0]]; if (l) { cx = l.cx; cy = l.cy; } }
    out.cx = cx; out.cy = cy;
    out.hw = Math.min(P.VW_MAX, Math.max(500, j.vw)) * 1.1 + 100; out.hh = Math.min(P.VW_MAX, Math.max(400, j.vh)) * 1.1 + 100;
    return out;
  };
  var I = { cx: 0, cy: 0, hw: 0, hh: 0 };

  /* devuelve el Uint8Array compartido (valido hasta la siguiente llamada) y su longitud en P.len */
  P.codificar = function (w, j, seq, tms, completa) {
    var i, c, tam = w.tam, q = P.q, pos;
    o = 0; P.interes(w, j, I);
    var x0 = I.cx - I.hw, x1 = I.cx + I.hw, y0 = I.cy - I.hh, y1 = I.cy + I.hh;
    w8(1); w32(tms >>> 0); w16(seq & 0xffff); w8((completa ? 1 : 0) | (j.cel.length ? 2 : 0));
    pos = o; w16(0); var n = 0;
    for (i = 0; i < w.nC && o < P.MAX - 3000; i++) {
      c = w.cells[i];
      if (c.jid !== j.id && (c.x + c.r < x0 || c.x - c.r > x1 || c.y + c.r < y0 || c.y - c.r > y1)) continue;
      w16(c.id); w8(c.jid); w16(q(c.x, tam)); w16(q(c.y, tam)); w16(P.sq(c.m)); n++;
    }
    p16(pos, n);
    pos = o; w16(0); n = 0;
    for (i = 0; i < w.nV; i++) {
      c = w.virus[i];
      if (c.x < x0 - 80 || c.x > x1 + 80 || c.y < y0 - 80 || c.y > y1 + 80) continue;
      w16(c.id); w16(q(c.x, tam)); w16(q(c.y, tam)); w16(P.sq(c.m)); n++;
    }
    p16(pos, n);
    pos = o; w16(0); n = 0;
    for (i = 0; i < w.nE && o < P.MAX - 1500; i++) {
      c = w.ej[i];
      if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
      w16(c.id); w16(q(c.x, tam)); w16(q(c.y, tam)); w8(c.jid); n++;
    }
    p16(pos, n);
    pos = o; w16(0); n = 0;
    var desde = Math.max(0, w.ringN - 1024);
    for (i = desde; i < w.ringN && n < 300; i++) {
      var k = i & 1023;
      if (w.t - w.ringT[k] > 1.2) continue;
      var s = w.ringE[k];
      if (w.fx[s] < x0 || w.fx[s] > x1 || w.fy[s] < y0 || w.fy[s] > y1) continue;
      w16(s); n++;
    }
    p16(pos, n);
    if (completa) {
      var rx0 = Math.max(0, x0), ry0 = Math.max(0, y0), rx1 = Math.min(tam, x1), ry1 = Math.min(tam, y1);
      w16(q(rx0, tam)); w16(q(ry0, tam)); w16(q(rx1, tam)); w16(q(ry1, tam));
      var m = w.hComida.consultar(rx0, ry0, rx1, ry1, w.bufF);
      pos = o; w16(0); n = 0;
      for (i = 0; i < m && o < P.MAX; i++) {
        var sl = w.bufF[i]; if (!w.fvivo[sl]) continue;
        if (w.fx[sl] < rx0 || w.fx[sl] > rx1 || w.fy[sl] < ry0 || w.fy[sl] > ry1) continue;
        w16(sl); w8(w.fgen[sl]); n++;
      }
      p16(pos, n);
    }
    P.len = o;
    return buf;
  };
  P.len = 0;
  P.texto = function (w, j, seq, tms, completa) { var b = P.codificar(w, j, seq, tms, completa); return C.b64(b, P.len); };
})(typeof globalThis !== 'undefined' ? globalThis : window);
