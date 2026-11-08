/* Similitud entre piezas propias, repeticion interna y banderas de riesgo. Puro. CIA.similitud */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.similitud = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var S = {};
  var VACIAS = 'a al algo ante con como cual cuando de del desde donde e el ella ellos en entre es esa ese eso esta este esto la las le les lo los me mi mis mas muy no nos o para pero por que se si sin sobre su sus te tu tus un una uno unos unas y ya the and of to in is it that for on with'.split(' ');
  S.normalizar = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim(); };
  S.palabras = function (t, sinVacias) { var w = S.normalizar(t).split(' ').filter(Boolean); return sinVacias ? w.filter(function (x) { return VACIAS.indexOf(x) < 0; }) : w; };
  S.shingles = function (t, k) { var w = S.palabras(t), s = {}; k = k || 3; if (w.length < k) { if (w.length) s[w.join(' ')] = 1; return s; } for (var i = 0; i + k <= w.length; i++) s[w.slice(i, i + k).join(' ')] = 1; return s; };
  S.jaccard = function (a, b) { var ka = Object.keys(a), kb = Object.keys(b); if (!ka.length || !kb.length) return 0; var inter = 0; ka.forEach(function (k) { if (b[k]) inter++; }); return inter / (ka.length + kb.length - inter); };
  S.similitud = function (a, b) { return S.jaccard(S.shingles(a, 3), S.shingles(b, 3)); };
  /* tramo comun mas largo de palabras (DP, tope 1500 palabras por texto) */
  S.tramoComun = function (a, b) {
    var x = S.palabras(a).slice(0, 1500), y = S.palabras(b).slice(0, 1500), mejor = 0, fin = 0, prev = new Array(y.length + 1).fill(0);
    for (var i = 1; i <= x.length; i++) { var cur = new Array(y.length + 1).fill(0); for (var j = 1; j <= y.length; j++) if (x[i - 1] === y[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > mejor) { mejor = cur[j]; fin = i; } } prev = cur; }
    return { palabras: mejor, texto: x.slice(fin - mejor, fin).join(' ') };
  };
  /* parejas de piezas (con .texto) por encima del umbral */
  S.parejas = function (piezas, umbral) {
    var sh = piezas.map(function (p) { return S.shingles(p.texto, 3); }), out = []; umbral = umbral == null ? 0.25 : umbral;
    for (var i = 0; i < piezas.length; i++) for (var j = i + 1; j < piezas.length; j++) { var s = S.jaccard(sh[i], sh[j]); if (s >= umbral) out.push({ a: piezas[i].id, b: piezas[j].id, nombreA: piezas[i].nombre, nombreB: piezas[j].nombre, similitud: Math.round(s * 1000) / 1000 }); }
    return out.sort(function (a, b) { return b.similitud - a.similitud; });
  };
  S.nivel = function (s) { return s >= 0.6 ? 'muy alta' : s >= 0.35 ? 'alta' : s >= 0.2 ? 'media' : 'baja'; };
  /* diversidad lexica y frases repetidas dentro de una pieza */
  S.diversidad = function (t) { var w = S.palabras(t, true); return w.length ? Math.round(new Set(w).size / w.length * 100) / 100 : 0; };
  S.repetidas = function (t, k) {
    var w = S.palabras(t), c = {}, out = []; k = k || 4;
    for (var i = 0; i + k <= w.length; i++) { var s = w.slice(i, i + k).join(' '); c[s] = (c[s] || 0) + 1; }
    Object.keys(c).forEach(function (s) { if (c[s] > 1) out.push({ frase: s, veces: c[s] }); });
    return out.sort(function (a, b) { return b.veces - a.veces; }).slice(0, 10);
  };
  /* comparacion con una fuente pegada (riesgo de copia): % de shingles de 5 palabras compartidos y tramo comun */
  S.contraFuente = function (texto, fuente) {
    var a = S.shingles(texto, 5), b = S.shingles(fuente, 5), ka = Object.keys(a), comp = ka.filter(function (k) { return b[k]; }).length, tr = S.tramoComun(texto, fuente);
    return { porcentajeCopiado: ka.length ? Math.round(comp / ka.length * 100) : 0, tramo: tr, riesgo: tr.palabras >= 12 || (ka.length && comp / ka.length > 0.25) ? 'alto' : tr.palabras >= 7 ? 'medio' : 'bajo' };
  };

  /* ---- banderas de riesgo (heuristicas; no sustituyen revision humana ni legal) ---- */
  var R = [
    ['financiero', 'alta', /(gana(r|s)?\s+(dinero|\$|€|usd)[^.]{0,30}(rapido|facil|sin esfuerzo|garantizado)|dinero\s+facil|hazte\s+rico|rentabilidad\s+(garantizada|asegurada)|sin\s+riesgo|inversion\s+(segura|garantizada)|duplica\s+tu\s+dinero|ingresos\s+pasivos\s+garantizados|\d{2,}\s*%\s*(mensual|semanal|diario)|guaranteed\s+returns?|get\s+rich)/, 'Promesa financiera: evita garantizar ganancias; añade que no es asesoría y que hay riesgo de pérdida.'],
    ['medico', 'alta', /(cura(r|s)?\s+(el\s+)?(cancer|diabetes|ansiedad|depresion|covid)|elimina\s+(el\s+)?(cancer|dolor)|sin\s+efectos\s+secundarios|reemplaza\s+(a\s+)?(tu|el)\s+medic|pierde\s+\d+\s*(kilos|kg)\s+en|milagro|detox\s+total|cures?\s+cancer)/, 'Afirmación de salud: no prometas curas ni resultados; remite a profesionales y cita fuentes.'],
    ['absoluta', 'media', /(100\s*%\s*(seguro|efectivo|garantizado|real)|garantizado|cientificamente\s+probado|los\s+medicos\s+(no|odian)|el\s+mejor\s+del\s+mundo|nunca\s+falla|sin\s+excepcion)/, 'Afirmación absoluta o sin prueba: acótala o enlaza evidencia.'],
    ['fuente', 'media', /(estudios?\s+(demuestran|prueban|dicen)|segun\s+expertos|los\s+cientificos\s+(dicen|afirman)|se\s+ha\s+demostrado)(?![^.]*(http|fuente|segun el))/, 'Cita sin fuente: nombra el estudio o el autor, o quita la cita.'],
    ['copyright', 'alta', /(letra\s+(completa\s+)?de|cancion\s+completa|pelicula\s+completa|serie\s+completa|capitulo\s+completo|usando\s+musica\s+de|musica\s+de\s+[a-z]+|sin\s+derechos\s+de\s+autor\s+pero|descarga\s+gratis\s+(la\s+)?(pelicula|serie|libro)|full\s+movie|lyrics\s+of)/, 'Posible uso de material con derechos: usa solo contenido propio, licenciado o libre y guarda las licencias.'],
    ['marca_ajena', 'media', /(disney|marvel|pokemon|nintendo|harry\s+potter|star\s+wars|coca[\s-]?cola|nike|apple|netflix)/, 'Menciona marcas o franquicias ajenas: evita sugerir patrocinio o afiliación y no uses sus personajes sin licencia.'],
    ['suplantacion', 'alta', /(deepfake|clon(ar|ado)?\s+(de\s+)?(la\s+)?voz|voz\s+de\s+(un|una)?\s*[a-z]+\s+famos|como\s+si\s+fuera\s+[a-z]+\s+[a-z]+\s+hablando|fingir\s+ser|haciendose\s+pasar)/, 'Suplantación o voz/rostro de personas reales: necesitas consentimiento y debe divulgarse.'],
    ['personas_reales', 'media', /(dijo\s+textualmente|declaro\s+que|entrevista\s+(exclusiva\s+)?con\s+[A-Z]|confeso)/i, 'Citas atribuidas a personas reales: si el texto es inventado por IA, no lo presentes como real.'],
    ['menores', 'alta', /(ninos?\s+(desnud|sexual)|menor(es)?\s+de\s+edad\s+(en|con)\s+(contenido|escenas))/, 'Contenido que involucra menores: no lo produzcas.'],
    ['politica', 'media', /(vota(r|d)?\s+(por|a)\s+[a-z]+|fraude\s+electoral\s+(es|fue)\s+real|no\s+votes)/, 'Contenido electoral o político: revisa políticas de cada plataforma sobre desinformación y publicidad política.'],
    ['odio', 'alta', /(muerte\s+a\s+los|odio\s+a\s+los|subhumano)/, 'Posible discurso de odio.']
  ];
  S.banderas = function (texto) {
    var t = S.normalizar(texto), orig = String(texto || ''), out = [];
    R.forEach(function (r) { var base = r[0] === 'personas_reales' ? orig : t, m = r[2].exec(base); if (m) out.push({ id: r[0], severidad: r[1], coincide: m[0].slice(0, 60), consejo: r[3] }); });
    return out;
  };
  /* evaluacion de una pieza completa: texto + divulgacion de IA + canal */
  S.evaluarPieza = function (p) {
    var txt = [p.titulo, p.hook, p.descripcion, (p.texto != null ? p.texto : (p.versiones && p.versiones.length ? p.versiones[p.versiones.length - 1].texto : ''))].filter(Boolean).join('\n'), out = S.banderas(txt), d = p.divulgacion || {};
    var sintetico = d.ia !== false && (d.voz || d.rostro || d.escenaRealista || d.imagenes || d.video);
    if (sintetico && (d.voz || d.rostro || d.escenaRealista) && !d.etiquetada) out.push({ id: 'divulgacion', severidad: 'alta', coincide: '', consejo: 'La pieza incluye voz, rostro o escenas realistas generadas con IA y no está marcada como etiquetada en la plataforma: activa la etiqueta de contenido sintético/IA antes de publicar.' });
    if (d.ia === undefined || d.ia === null) out.push({ id: 'sin_registro', severidad: 'baja', coincide: '', consejo: 'Falta el registro de divulgación de IA de esta pieza.' });
    if (/\b(patrocinad|afiliad|codigo\s+de\s+descuento|enlace\s+de\s+afiliado)/.test(S.normalizar(txt)) && !/#(ad|publi|patrocinado)\b|publicidad|colaboracion\s+pagada/i.test(txt)) out.push({ id: 'publicidad', severidad: 'media', coincide: '', consejo: 'Hay menciones comerciales: indica claramente que es publicidad o afiliación (#publi / #ad).' });
    var rank = { alta: 0, media: 1, baja: 2 }; return out.sort(function (a, b) { return rank[a.severidad] - rank[b.severidad]; });
  };
  /* diff por lineas (LCS): [{t:'=', l}, {t:'+', l}, {t:'-', l}] */
  S.diff = function (a, b) {
    var x = String(a || '').split('\n'), y = String(b || '').split('\n'), n = x.length, m = y.length, d = [], i, j;
    for (i = 0; i <= n; i++) d.push(new Array(m + 1).fill(0));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) d[i][j] = x[i] === y[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) { if (x[i] === y[j]) { out.push({ t: '=', l: x[i] }); i++; j++; } else if (d[i + 1][j] >= d[i][j + 1]) out.push({ t: '-', l: x[i++] }); else out.push({ t: '+', l: y[j++] }); }
    while (i < n) out.push({ t: '-', l: x[i++] }); while (j < m) out.push({ t: '+', l: y[j++] });
    return out;
  };
  return S;
});
