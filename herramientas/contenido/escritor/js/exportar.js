/* Parseo de guiones y exportacion a .md / .txt / .srt. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Exportar = m; })(typeof self !== 'undefined' ? self : this, function () {
  function seg(s) { var m = /(\d+):(\d{2})/.exec(s); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
  function parsearGuion(texto) {
    var esc = [], act = null, campo = null, titulo = '';
    String(texto).split(/\r?\n/).forEach(function (ln) {
      var m = /^\s*(?:#+\s*)?\**ESCENA\s+(\d+)\s*\**\s*[|·]\s*(\d+:\d{2})\s*[-–—a]\s*(\d+:\d{2})\s*[|·]\s*(.+?)\**\s*$/i.exec(ln);
      if (m) { act = { n: +m[1], ini: seg(m[2]), fin: seg(m[3]), tipo: m[4].trim(), camara: '', texto: '' }; esc.push(act); campo = null; return; }
      var t = /^\s*T[ÍI]TULO\s*:\s*(.+)$/i.exec(ln); if (t && !act) { titulo = t[1].trim(); return; }
      if (!act) return;
      var c = /^\s*\**C[ÁA]MARA\**\s*:\s*(.*)$/i.exec(ln), x = /^\s*\**TEXTO\**\s*:\s*(.*)$/i.exec(ln);
      if (c) { campo = 'camara'; act.camara = c[1]; } else if (x) { campo = 'texto'; act.texto = x[1]; }
      else if (campo && ln.trim()) act[campo] += (act[campo] ? '\n' : '') + ln.trim();
    });
    return { titulo: titulo, escenas: esc, duracion: esc.length ? esc[esc.length - 1].fin : 0 };
  }
  function t2(n) { return ('0' + n).slice(-2); }
  function tiempoSrt(s) { var ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), x = Math.floor(ms % 60000 / 1000); return t2(h) + ':' + t2(m) + ':' + t2(x) + ',' + ('00' + (ms % 1000)).slice(-3); }
  function envolver(t, max) {
    var out = [], l = '';
    t.replace(/\s+/g, ' ').trim().split(' ').forEach(function (w) { if (l && (l + ' ' + w).length > max) { out.push(l); l = w; } else l = l ? l + ' ' + w : w; });
    if (l) out.push(l); return out.join('\n');
  }
  function aSrt(texto) {
    var gu = parsearGuion(texto).escenas.filter(function (e) { return e.texto.trim(); });
    if (!gu.length) throw new Error('No se encontraron escenas con el formato ESCENA n | m:ss-m:ss | TIPO');
    return gu.map(function (e, i) { return (i + 1) + '\n' + tiempoSrt(e.ini) + ' --> ' + tiempoSrt(e.fin) + '\n' + envolver(e.texto, 42) + '\n'; }).join('\n');
  }
  function aMd(doc) {
    var h = ['# ' + (doc.titulo || 'Contenido'), '', '- Tipo: ' + (doc.tipo || ''), '- Fecha: ' + (doc.fecha || ''), doc.marca ? '- Marca: ' + doc.marca : null, doc.modelo ? '- Generado con: ' + doc.modelo : '- Generado en modo plantillas', '', '> Revisa y verifica el contenido antes de publicarlo.', ''].filter(function (x) { return x !== null; });
    return h.join('\n') + '\n' + doc.texto + '\n';
  }
  function aTxt(doc) { return doc.texto.replace(/\r?\n/g, '\n') + '\n'; }
  function descargar(nombre, contenido, tipo) {
    var b = new Blob([contenido], { type: (tipo || 'text/plain') + ';charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  return { parsearGuion: parsearGuion, aSrt: aSrt, aMd: aMd, aTxt: aTxt, descargar: descargar, tiempoSrt: tiempoSrt };
});
