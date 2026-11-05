/* Contadores de caracteres por red. Los limites son REFERENCIALES y editables: confirmalos en cada plataforma. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Contadores = m; })(typeof self !== 'undefined' ? self : this, function () {
  var REDES = {
    x: { nombre: 'X / Twitter', max: 280, color: '#1d9bf0' },
    instagram: { nombre: 'Instagram', max: 2200, hashtagsMax: 30, color: '#e1306c' },
    tiktok: { nombre: 'TikTok', max: 2200, color: '#25f4ee' },
    linkedin: { nombre: 'LinkedIn', max: 3000, color: '#0a66c2' },
    facebook: { nombre: 'Facebook', max: 63206, color: '#1877f2' },
    shorts_titulo: { nombre: 'YouTube Shorts (título)', max: 100, color: '#ff0033' },
    shorts_desc: { nombre: 'YouTube Shorts (descripción)', max: 5000, color: '#ff0033' }
  };
  var URL_RE = /https?:\/\/[^\s]+/g;
  function pesoX(cp) { return (cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247)) ? 1 : 2; }
  function longitudX(t) {
    var n = 0, urls = 0;
    t = t.replace(URL_RE, function () { urls++; return ''; });
    for (var c of t) n += pesoX(c.codePointAt(0));
    return n + urls * 23;
  }
  function longitud(red, t) { return red === 'x' ? longitudX(t) : Array.from(t).length; }
  function contar(red, texto, lim) {
    texto = texto || '';
    var cfg = REDES[red] || { nombre: red, max: 0 }, max = (lim && lim[red]) || cfg.max, n = longitud(red, texto);
    var hs = texto.match(/#[\p{L}\p{N}_]+/gu) || [], avisos = [];
    var estado = !max ? 'ok' : n > max ? 'excede' : n > max * 0.9 ? 'cerca' : 'ok';
    if (cfg.hashtagsMax && hs.length > cfg.hashtagsMax) avisos.push('Más de ' + cfg.hashtagsMax + ' hashtags');
    if (estado === 'excede') avisos.push('Excede por ' + (n - max) + ' caracteres');
    return { red: red, n: n, max: max, restante: max - n, estado: estado, palabras: (texto.trim().match(/\S+/g) || []).length, hashtags: hs.length, menciones: (texto.match(/@\w+/g) || []).length, urls: (texto.match(URL_RE) || []).length, avisos: avisos };
  }
  function trocear(t, max, red) {
    var out = [], resto = t.trim();
    while (longitud(red, resto) > max) {
      var corte = max, i;
      while (corte > 1 && longitud(red, resto.slice(0, corte)) > max) corte--;
      i = Math.max(resto.lastIndexOf(' ', corte), 0);
      if (i < corte * 0.4) i = corte;
      out.push(resto.slice(0, i).trim()); resto = resto.slice(i).trim();
    }
    if (resto) out.push(resto);
    return out;
  }
  function dividirHilo(texto, max, numerar) {
    max = max || 280; numerar = numerar !== false;
    var res = max - (numerar ? 8 : 0), partes = [], act = '';
    var bloques = texto.split(/\n{2,}/).map(function (b) { return b.trim(); }).filter(Boolean);
    var frases = [];
    bloques.forEach(function (b) { (b.match(/[^.!?¿¡]+[.!?]*\s*|[.!?]+/g) || [b]).forEach(function (s) { s = s.trim(); if (s) frases.push(s); }); });
    frases.forEach(function (s) {
      if (longitudX(s) > res) { if (act) { partes.push(act); act = ''; } trocear(s, res, 'x').forEach(function (p) { partes.push(p); }); return; }
      var cand = act ? act + ' ' + s : s;
      if (longitudX(cand) <= res) act = cand; else { partes.push(act); act = s; }
    });
    if (act) partes.push(act);
    if (!numerar || partes.length < 2) return partes;
    return partes.map(function (p, i) { return p + ' (' + (i + 1) + '/' + partes.length + ')'; });
  }
  function dividirCarrusel(texto) {
    var bloques = texto.split(/\n(?=(?:Diapositiva|Slide|Lámina)\s*\d+)/i).map(function (b) { return b.trim(); }).filter(Boolean);
    return bloques.map(function (b) { return b.replace(/^(?:Diapositiva|Slide|Lámina)\s*\d+\s*[:.\-–]?\s*/i, '').trim(); });
  }
  return { REDES: REDES, contar: contar, longitudX: longitudX, longitud: longitud, dividirHilo: dividirHilo, dividirCarrusel: dividirCarrusel };
});
