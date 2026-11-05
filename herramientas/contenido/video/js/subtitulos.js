/* Parser/serializador SRT y VTT y utilidades de guion (logica pura). VE.subtitulos */
(function (g) {
  var S = {};
  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  S.tiempo = function (s, coma) {
    s = Math.max(0, s); var ms = Math.round(s * 1000), h = Math.floor(ms / 3600000); ms -= h * 3600000;
    var m = Math.floor(ms / 60000); ms -= m * 60000; var sec = Math.floor(ms / 1000); ms -= sec * 1000;
    return pad(h, 2) + ':' + pad(m, 2) + ':' + pad(sec, 2) + (coma ? ',' : '.') + pad(ms, 3);
  };
  S.leerTiempo = function (t) {
    var m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?\s*$/.exec(t);
    if (!m) return NaN;
    return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] ? +('0.' + m[4]) : 0);
  };
  S.parsear = function (txt) {
    txt = String(txt).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var bloques = txt.split(/\n{2,}/), out = [];
    bloques.forEach(function (b) {
      var ls = b.split('\n').filter(function (l) { return l.trim() !== ''; });
      if (!ls.length || /^WEBVTT/.test(ls[0]) || /^(NOTE|STYLE|REGION)/.test(ls[0])) return;
      var k = -1;
      for (var i = 0; i < ls.length; i++) if (ls[i].indexOf('-->') >= 0) { k = i; break; }
      if (k < 0) return;
      var pr = ls[k].split('-->'), a = S.leerTiempo(pr[0]), b2 = S.leerTiempo(pr[1].trim().split(/\s+/)[0]);
      if (isNaN(a) || isNaN(b2)) return;
      var texto = ls.slice(k + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\an?\d\}/g, '');
      out.push({ ini: a, fin: b2, texto: texto });
    });
    return out;
  };
  S.aSRT = function (cues) { return cues.map(function (c, i) { return (i + 1) + '\n' + S.tiempo(c.ini, true) + ' --> ' + S.tiempo(c.fin, true) + '\n' + c.texto + '\n'; }).join('\n'); };
  S.aVTT = function (cues) { return 'WEBVTT\n\n' + cues.map(function (c) { return S.tiempo(c.ini) + ' --> ' + S.tiempo(c.fin) + '\n' + c.texto + '\n'; }).join('\n'); };
  S.detectar = function (txt) { return /-->/.test(txt); };
  /* Guion en lineas/frases -> segmentos con duracion proporcional a los caracteres */
  S.desdeGuion = function (txt, ini, total, max) {
    max = max || 42;
    var frases = [];
    String(txt).replace(/\r/g, '').split(/\n+/).forEach(function (l) {
      l = l.trim(); if (!l) return;
      var partes = l.match(/[^.!?¡¿]+[.!?]*|[.!?]+/g) || [l];
      partes.forEach(function (p) {
        p = p.trim(); if (!p) return;
        while (p.length > max) {
          var cut = p.lastIndexOf(' ', max); if (cut < max * 0.4) cut = max;
          frases.push(p.slice(0, cut).trim()); p = p.slice(cut).trim();
        }
        if (p) frases.push(p);
      });
    });
    var peso = frases.map(function (f) { return Math.max(8, f.length); }), suma = peso.reduce(function (a, b) { return a + b; }, 0), t = ini, out = [];
    frases.forEach(function (f, i) { var d = total * peso[i] / suma; out.push({ ini: t, fin: t + d, texto: f }); t += d; });
    return out;
  };
  S.desplazar = function (cues, dt) { return cues.map(function (c) { return { ini: Math.max(0, c.ini + dt), fin: Math.max(0.1, c.fin + dt), texto: c.texto }; }); };
  g.VE = g.VE || {}; g.VE.subtitulos = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
