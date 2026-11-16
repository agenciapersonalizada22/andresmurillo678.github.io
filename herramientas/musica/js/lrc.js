/* Parser, serializador y sincronizador de letras LRC (con palabras estilo "enhanced" para karaoke). Puro. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuLrc = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var L = {};
  function seg(m, s, c) { return (+m) * 60 + (+s) + (c ? +('0.' + c) : 0); }
  L.fmt = function (t, dec) { t = Math.max(0, t); var c = Math.round(t * 100), m = Math.floor(c / 6000), s = Math.floor((c % 6000) / 100), cs = c % 100; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (cs < 10 ? '0' : '') + cs; };
  /* -> {meta:{ti,ar,al,by,offset}, lineas:[{t, texto, palabras?:[{t,texto}]}], sincronizada} */
  L.parse = function (txt) {
    var meta = {}, lin = [], off = 0, sinT = [];
    String(txt || '').replace(/^﻿/, '').split(/\r?\n/).forEach(function (raw) {
      var m, ts = [], r = raw.trim(); if (!r) return;
      if ((m = /^\[([a-z]{2,8}):([^\]]*)\]$/i.exec(r)) && !/^\d+$/.test(m[1])) { meta[m[1].toLowerCase()] = m[2].trim(); if (m[1].toLowerCase() === 'offset') off = (parseFloat(m[2]) || 0) / 1000; return; }
      var rx = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/;
      while ((m = rx.exec(r))) { ts.push(seg(m[1], m[2], m[3])); r = r.slice(m[0].length); }
      if (!ts.length) { sinT.push(raw.trim()); return; }
      var palabras = null, texto = r.trim();
      if (/<\d{1,3}:\d{2}/.test(r)) {
        palabras = []; var rw = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>([^<]*)/g, w; while ((w = rw.exec(r))) { var tx = w[4]; if (tx.trim() || tx) palabras.push({ t: seg(w[1], w[2], w[3]), texto: tx }); }
        texto = palabras.map(function (p) { return p.texto; }).join('').replace(/\s+/g, ' ').trim();
      }
      ts.forEach(function (t) { var o = { t: t, texto: texto }; if (palabras) o.palabras = palabras.map(function (p) { return { t: p.t + (t - ts[0]) * 0, texto: p.texto }; }); lin.push(o); });
    });
    lin.sort(function (a, b) { return a.t - b.t; });
    if (off) lin.forEach(function (l) { l.t = Math.max(0, l.t - off); if (l.palabras) l.palabras.forEach(function (p) { p.t = Math.max(0, p.t - off); }); });
    if (!lin.length && sinT.length) return { meta: meta, lineas: sinT.map(function (t) { return { t: null, texto: t }; }), sincronizada: false };
    return { meta: meta, lineas: lin, sincronizada: lin.length > 0 };
  };
  L.serializar = function (o, enhanced) {
    var s = []; ['ti', 'ar', 'al', 'by'].forEach(function (k) { if (o.meta && o.meta[k]) s.push('[' + k + ':' + o.meta[k] + ']'); });
    o.lineas.forEach(function (l) {
      if (l.t == null) { s.push(l.texto); return; }
      var t = '[' + L.fmt(l.t) + ']';
      if (enhanced && l.palabras && l.palabras.length) t += l.palabras.map(function (p) { return '<' + L.fmt(p.t) + '>' + p.texto; }).join('');
      else t += l.texto; s.push(t);
    });
    return s.join('\n');
  };
  /* indice de la linea activa en t (busqueda binaria); -1 antes de la primera */
  L.indice = function (lineas, t) {
    var a = 0, b = lineas.length - 1, r = -1; while (a <= b) { var m = (a + b) >> 1; if (lineas[m].t != null && lineas[m].t <= t) { r = m; a = m + 1; } else b = m - 1; } return r;
  };
  /* progreso 0..1 de la linea i en t; con palabras: [{texto, estado:'hecha'|'activa'|'futura', p}] */
  L.karaoke = function (lineas, i, t) {
    var l = lineas[i]; if (!l) return null;
    var fin = i + 1 < lineas.length && lineas[i + 1].t != null ? lineas[i + 1].t : l.t + 4;
    var pr = Math.max(0, Math.min(1, (t - l.t) / Math.max(0.05, fin - l.t)));
    if (!l.palabras) return { progreso: pr, palabras: null };
    var ps = l.palabras.map(function (w, k) {
      var f = k + 1 < l.palabras.length ? l.palabras[k + 1].t : fin, e = t >= f ? 'hecha' : t >= w.t ? 'activa' : 'futura';
      return { texto: w.texto, estado: e, p: e === 'activa' ? (t - w.t) / Math.max(0.03, f - w.t) : e === 'hecha' ? 1 : 0 };
    });
    return { progreso: pr, palabras: ps };
  };
  /* sincronizar tocando: marca la linea i en el instante t */
  L.marcar = function (lineas, i, t) { if (lineas[i]) lineas[i].t = Math.max(0, Math.round(t * 100) / 100); return lineas; };
  L.desdeTexto = function (txt) { return String(txt).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; }).map(function (s) { return { t: null, texto: s }; }); };
  L.desplazar = function (lineas, d) { lineas.forEach(function (l) { if (l.t != null) l.t = Math.max(0, l.t + d); if (l.palabras) l.palabras.forEach(function (p) { p.t = Math.max(0, p.t + d); }); }); return lineas; };
  return L;
});
