/* Identidad de marca por codigo: paleta, tipografia, nombres, avatar/banner SVG y manual imprimible. Puro. CIA.marca */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.marca = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var M = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  M.esc = esc;
  M.hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  M.azar = function (semilla) { var a = M.hash(semilla) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  /* color */
  M.hexARgb = function (h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  M.rgbAHex = function (r) { return '#' + r.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(''); };
  M.hslARgb = function (h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  M.hex = function (h, s, l) { return M.rgbAHex(M.hslARgb(h, s, l)); };
  M.hexAHsl = function (hex) { var c = M.hexARgb(hex).map(function (v) { return v / 255; }), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; h *= 60; if (h < 0) h += 360; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; };
  M.luminancia = function (hex) { var c = M.hexARgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  M.contraste = function (a, b) { var x = M.luminancia(a), y = M.luminancia(b); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; };
  M.textoSobre = function (fondo) { return M.contraste(fondo, '#ffffff') >= M.contraste(fondo, '#111111') ? '#ffffff' : '#111111'; };
  M.ESQUEMAS = [['analogo', 'Análogo (armonioso)'], ['complementario', 'Complementario (contraste)'], ['triada', 'Tríada (vivo)'], ['mono', 'Monocromo (sobrio)']];
  M.paleta = function (base, esquema) {
    var hsl = M.hexAHsl(base), h = hsl[0], s = Math.max(45, hsl[1]), l = Math.min(55, Math.max(38, hsl[2]));
    var off = { analogo: [30, -30], complementario: [180, 150], triada: [120, 240], mono: [0, 0] }[esquema] || [30, -30];
    var primario = M.hex(h, s, l), secundario = M.hex(h + off[0], esquema === 'mono' ? s - 15 : s, esquema === 'mono' ? l + 18 : l), acento = M.hex(h + off[1], Math.min(95, s + 15), esquema === 'mono' ? l - 15 : Math.min(60, l + 8));
    var fondo = M.hex(h, 25, 96), oscuro = M.hex(h, 30, 10), texto = M.hex(h, 20, 12);
    return { primario: primario, secundario: secundario, acento: acento, fondo: fondo, oscuro: oscuro, texto: texto, textoSobrePrimario: M.textoSobre(primario), contrasteTexto: M.contraste(fondo, texto), contrastePrimario: M.contraste(primario, M.textoSobre(primario)) };
  };
  M.TIPOGRAFIAS = [
    { id: 'editorial', nombre: 'Editorial', titulo: 'Georgia, "Times New Roman", serif', cuerpo: 'system-ui, -apple-system, "Segoe UI", sans-serif', peso: 700 },
    { id: 'moderna', nombre: 'Moderna', titulo: '"Trebuchet MS", "Segoe UI", sans-serif', cuerpo: 'system-ui, sans-serif', peso: 800 },
    { id: 'tecnica', nombre: 'Técnica', titulo: '"Courier New", ui-monospace, monospace', cuerpo: 'system-ui, sans-serif', peso: 700 },
    { id: 'impacto', nombre: 'Impacto', titulo: 'Impact, "Arial Narrow Bold", sans-serif', cuerpo: 'Arial, Helvetica, sans-serif', peso: 400 },
    { id: 'elegante', nombre: 'Elegante', titulo: '"Palatino Linotype", Palatino, Georgia, serif', cuerpo: 'Georgia, serif', peso: 600 },
    { id: 'amigable', nombre: 'Amigable', titulo: '"Comic Sans MS", "Chalkboard SE", system-ui, sans-serif', cuerpo: 'system-ui, sans-serif', peso: 700 }
  ];
  M.tipografia = function (id) { return M.TIPOGRAFIAS.filter(function (t) { return t.id === id; })[0] || M.TIPOGRAFIAS[1]; };
  /* nombres: combina palabras del nicho con raices; determinista por semilla */
  var PRE = ['Nova', 'Zen', 'Pixel', 'Mente', 'Ruta', 'Faro', 'Brújula', 'Chispa', 'Sendero', 'Núcleo', 'Alba', 'Eco', 'Vértice', 'Umbral', 'Atlas', 'Lumen', 'Ápice', 'Bruma'];
  var SUF = ['Lab', 'Studio', 'Club', 'Hub', 'Play', 'Taller', 'Diario', 'Mapa', 'Radar', 'Zona', 'Plus', 'Vía', 'Ágora', 'Fábrica'];
  M.nombres = function (palabras, estilo, n, semilla) {
    var r = M.azar((semilla || '') + '|' + palabras.join(',') + '|' + estilo), cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }, base = palabras.map(function (w) { return w.replace(/[^\p{L}\p{N}]/gu, ''); }).filter(function (w) { return w.length > 2; }), out = [], vistos = {};
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    for (var i = 0; i < 80 && out.length < n; i++) {
      var w = base.length ? cap(pick(base)) : cap(pick(PRE)), nom;
      if (estilo === 'corto') nom = w.slice(0, Math.max(3, 3 + Math.floor(r() * 3))) + pick(['ly', 'io', 'ia', 'ex', 'um', 'ora']);
      else if (estilo === 'compuesto') nom = w + (base.length > 1 ? cap(pick(base)) : pick(SUF));
      else if (estilo === 'descriptivo') nom = pick(['Todo sobre', 'Guía de', 'El mundo de', 'Diario de']) + ' ' + w;
      else nom = r() < 0.5 ? pick(PRE) + ' ' + w : w + ' ' + pick(SUF);
      if (!vistos[nom.toLowerCase()]) { vistos[nom.toLowerCase()] = 1; out.push({ nombre: nom, handle: '@' + M.slug(nom), largo: nom.length }); }
    }
    return out;
  };
  M.slug = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30); };
  M.iniciales = function (nombre) { var p = String(nombre || '?').trim().split(/\s+/).filter(Boolean); return (p.length > 1 ? p[0][0] + p[1][0] : (p[0] || '?').slice(0, 2)).toUpperCase(); };
  /* avatar y banner SVG (formas generadas por la semilla del nombre) */
  M.FORMAS = [['circulo', 'Círculo'], ['cuadrado', 'Cuadrado redondeado'], ['hexagono', 'Hexágono']];
  function fondoForma(forma, t) {
    if (forma === 'cuadrado') return '<rect width="' + t + '" height="' + t + '" rx="' + t * 0.22 + '"/>';
    if (forma === 'hexagono') { var c = t / 2, pts = []; for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i - Math.PI / 2; pts.push((c + c * 0.98 * Math.cos(a)).toFixed(1) + ',' + (c + c * 0.98 * Math.sin(a)).toFixed(1)); } return '<polygon points="' + pts.join(' ') + '"/>'; }
    return '<circle cx="' + t / 2 + '" cy="' + t / 2 + '" r="' + t / 2 + '"/>';
  }
  M.decor = function (marca, w, h, r) {
    var p = marca.paleta, out = '';
    for (var i = 0; i < 6; i++) { var cx = r() * w, cy = r() * h, rad = Math.min(w, h) * (0.12 + r() * 0.3), col = [p.secundario, p.acento, p.oscuro][i % 3]; out += '<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + rad.toFixed(0) + '" fill="' + col + '" opacity="' + (0.18 + r() * 0.25).toFixed(2) + '"/>'; }
    return out;
  };
  M.avatarSVG = function (marca, tam) {
    tam = tam || 400; var p = marca.paleta, r = M.azar(marca.nombre + 'av'), tip = M.tipografia(marca.tipografia), ini = M.iniciales(marca.nombre), id = 'cl' + M.hash(marca.nombre).toString(36);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tam + ' ' + tam + '" width="' + tam + '" height="' + tam + '" role="img" aria-label="Avatar de ' + esc(marca.nombre) + '"><defs><clipPath id="' + id + '">' + fondoForma(marca.forma, tam) + '</clipPath><linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p.primario + '"/><stop offset="1" stop-color="' + p.oscuro + '"/></linearGradient></defs><g clip-path="url(#' + id + ')"><rect width="' + tam + '" height="' + tam + '" fill="url(#g' + id + ')"/>' + M.decor(marca, tam, tam, r) + '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="' + esc(tip.titulo) + '" font-weight="' + tip.peso + '" font-size="' + tam * 0.42 + '" fill="' + p.textoSobrePrimario + '">' + esc(ini) + '</text></g></svg>';
  };
  M.bannerSVG = function (marca, w, h) {
    w = w || 1500; h = h || 500; var p = marca.paleta, r = M.azar(marca.nombre + 'bn'), tip = M.tipografia(marca.tipografia), tx = M.textoSobre(p.oscuro);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="Banner de ' + esc(marca.nombre) + '"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p.oscuro + '"/><stop offset="1" stop-color="' + p.primario + '"/></linearGradient></defs><rect width="' + w + '" height="' + h + '" fill="url(#bg)"/>' + M.decor(marca, w, h, r) + '<text x="' + w / 2 + '" y="' + h * 0.5 + '" text-anchor="middle" font-family="' + esc(tip.titulo) + '" font-weight="' + tip.peso + '" font-size="' + h * 0.2 + '" fill="' + tx + '">' + esc(marca.nombre) + '</text>' + (marca.lema ? '<text x="' + w / 2 + '" y="' + h * 0.68 + '" text-anchor="middle" font-family="' + esc(tip.cuerpo) + '" font-size="' + h * 0.085 + '" fill="' + tx + '" opacity=".9">' + esc(marca.lema) + '</text>' : '') + '</svg>';
  };
  /* consistencia de un texto con la biblia: vetos presentes y vocabulario usado */
  M.consistencia = function (texto, biblia) {
    var t = ' ' + String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ', lista = function (s) { return String(s || '').split(/[,;\n]+/).map(function (x) { return x.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }).filter(function (x) { return x.length > 1; }); };
    var vetos = lista(biblia && biblia.vetos).filter(function (v) { return t.indexOf(v) >= 0; }), voc = lista(biblia && biblia.vocabulario), usados = voc.filter(function (v) { return t.indexOf(v) >= 0; });
    return { vetos: vetos, vocabularioUsado: usados, vocabularioFalta: voc.filter(function (v) { return usados.indexOf(v) < 0; }), puntaje: Math.max(0, Math.round(100 - vetos.length * 30 + (voc.length ? usados.length / voc.length * 0 : 0))) };
  };
  /* manual de marca (HTML autonomo para imprimir / guardar como PDF) */
  M.manualHTML = function (marca, biblia, nicho) {
    biblia = biblia || {}; nicho = nicho || {}; var p = marca.paleta, tip = M.tipografia(marca.tipografia);
    var sw = [['Primario', p.primario], ['Secundario', p.secundario], ['Acento', p.acento], ['Fondo', p.fondo], ['Oscuro', p.oscuro], ['Texto', p.texto]].map(function (c) { return '<div class="sw" style="background:' + c[1] + ';color:' + M.textoSobre(c[1]) + '"><b>' + c[0] + '</b><br>' + c[1].toUpperCase() + '</div>'; }).join('');
    var fila = function (k, v) { return v ? '<tr><th>' + esc(k) + '</th><td>' + esc(v).replace(/\n/g, '<br>') + '</td></tr>' : ''; };
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de marca · ' + esc(marca.nombre) + '</title><style>body{font:15px/1.5 ' + tip.cuerpo + ';color:' + p.texto + ';margin:0;padding:28px;max-width:820px;margin-inline:auto}h1,h2{font-family:' + tip.titulo + ';font-weight:' + tip.peso + ';color:' + p.primario + '}h1{font-size:34px;margin:0}h2{border-bottom:3px solid ' + p.acento + ';padding-bottom:4px;margin-top:28px}.sw{display:inline-block;width:30%;min-width:120px;padding:14px;margin:0 1% 8px 0;border-radius:8px;font-size:13px;box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}table{border-collapse:collapse;width:100%}th{text-align:left;width:28%;vertical-align:top;padding:6px 10px 6px 0;color:' + p.primario + '}td{padding:6px 0;border-bottom:1px solid #ddd}.fig{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.fig svg{max-width:100%;height:auto}.av svg{width:160px;height:160px}.nota{font-size:12px;color:#555;margin-top:24px}@media print{body{padding:0}h2{break-after:avoid}table,.fig{break-inside:avoid}}</style></head><body><h1>' + esc(marca.nombre) + '</h1><p>' + esc(marca.lema || '') + ' ' + esc(marca.handle || '') + '</p>' +
      '<h2>Identidad visual</h2><div class="fig"><span class="av">' + M.avatarSVG(marca, 400) + '</span><span style="flex:1;min-width:240px">' + M.bannerSVG(marca, 1500, 500) + '</span></div><h2>Paleta</h2>' + sw + '<p>Contraste texto/fondo: ' + p.contrasteTexto + ':1 · texto sobre primario: ' + p.contrastePrimario + ':1 (WCAG AA ≥ 4.5).</p>' +
      '<h2>Tipografía</h2><p style="font-family:' + tip.titulo + ';font-weight:' + tip.peso + ';font-size:24px;margin:4px 0">Títulos: ' + esc(tip.nombre) + '</p><p style="font-family:' + tip.cuerpo + '">Cuerpo: texto de lectura con una fuente del sistema, sin descargas externas.</p>' +
      '<h2>Propuesta de valor</h2><table>' + fila('Nicho', nicho.tema) + fila('Público', nicho.publico) + fila('Propuesta', nicho.propuesta) + fila('Diferenciador', nicho.diferenciador) + '</table>' +
      '<h2>Biblia de estilo</h2><table>' + fila('Personaje / presentador', biblia.personaje) + fila('Voz de marca', biblia.voz) + fila('Tono', biblia.tono) + fila('Estilo visual', biblia.estiloVisual) + fila('Vocabulario preferido', biblia.vocabulario) + fila('Lo que nunca hacemos', biblia.vetos) + fila('Frase de divulgación de IA', biblia.divulgacion) + '</table>' +
      '<p class="nota">Generado con el estudio «Contenido de pura IA y canales». Verifica que el nombre y el logotipo no infrinjan marcas registradas ni estén en uso en cada plataforma.</p></body></html>';
  };
  return M;
});
