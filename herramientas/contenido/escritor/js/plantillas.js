/* Catalogo de tipos, prompts para IA y generadores por reglas ("modo plantillas", sin IA). */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Plantillas = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var TIPOS = [
    { id: 'guion', nombre: 'Guion de video', grupo: 'Video', red: null, campos: ['tema', 'duracion', 'publico', 'cta'] },
    { id: 'shorts', nombre: 'YouTube Shorts: título y descripción', grupo: 'Video', red: 'shorts_titulo', campos: ['tema', 'publico', 'cta'] },
    { id: 'tiktok', nombre: 'TikTok: texto de la publicación', grupo: 'Redes', red: 'tiktok', campos: ['tema', 'publico', 'cta'] },
    { id: 'x', nombre: 'X / Twitter: publicación', grupo: 'Redes', red: 'x', campos: ['tema', 'publico', 'cta'] },
    { id: 'hilo', nombre: 'X / Twitter: hilo', grupo: 'Redes', red: 'x', campos: ['tema', 'cantidad', 'publico', 'cta'] },
    { id: 'instagram', nombre: 'Instagram: pie de foto', grupo: 'Redes', red: 'instagram', campos: ['tema', 'publico', 'cta'] },
    { id: 'carrusel', nombre: 'Carrusel (texto por diapositiva)', grupo: 'Redes', red: 'instagram', campos: ['tema', 'cantidad', 'publico', 'cta'] },
    { id: 'linkedin', nombre: 'LinkedIn: publicación', grupo: 'Redes', red: 'linkedin', campos: ['tema', 'publico', 'cta'] },
    { id: 'facebook', nombre: 'Facebook: publicación', grupo: 'Redes', red: 'facebook', campos: ['tema', 'publico', 'cta'] },
    { id: 'titulos', nombre: 'Títulos y descripciones optimizados', grupo: 'Texto', red: null, campos: ['tema', 'cantidad', 'publico'] },
    { id: 'hashtags', nombre: 'Hashtags', grupo: 'Texto', red: null, campos: ['tema', 'cantidad'] },
    { id: 'ideas', nombre: 'Ideas de contenido por nicho', grupo: 'Texto', red: null, campos: ['tema', 'cantidad', 'publico'] },
    { id: 'correo', nombre: 'Correo (email)', grupo: 'Texto', red: null, campos: ['tema', 'publico', 'cta'] },
    { id: 'anuncio', nombre: 'Textos de anuncios', grupo: 'Texto', red: null, campos: ['tema', 'publico', 'cta'] },
    { id: 'reescribir', nombre: 'Reescribir', grupo: 'Transformar', red: null, campos: ['texto'] },
    { id: 'mejorar', nombre: 'Mejorar', grupo: 'Transformar', red: null, campos: ['texto'] },
    { id: 'resumir', nombre: 'Resumir', grupo: 'Transformar', red: null, campos: ['texto', 'cantidad'] },
    { id: 'traducir', nombre: 'Traducir', grupo: 'Transformar', red: null, campos: ['texto', 'idioma'] }
  ];
  function tipo(id) { return TIPOS.filter(function (t) { return t.id === id; })[0]; }

  /* ---------- Prompts para IA ---------- */
  var FORMATO_GUION = 'Formato EXACTO, una escena tras otra:\nTÍTULO: <título>\nESCENA 1 | 0:00-0:05 | GANCHO\nCÁMARA: <indicación de plano, movimiento y lugar>\nTEXTO: <lo que se dice o se muestra en pantalla>\n\nUsa los tipos GANCHO, DESARROLLO y LLAMADA A LA ACCIÓN. Los tiempos deben ser consecutivos y sumar la duración total pedida.';
  var INSTR = {
    guion: function (c) { return 'Escribe un guion de video de ' + (c.duracion || 30) + ' segundos sobre: ' + c.tema + '.\n' + FORMATO_GUION; },
    shorts: function (c) { return 'Escribe para YouTube Shorts sobre: ' + c.tema + '.\nDevuelve:\nTÍTULO: (máximo 100 caracteres)\nDESCRIPCIÓN: (breve, con llamada a la acción y 3-5 hashtags)'; },
    tiktok: function (c) { return 'Escribe el texto de una publicación de TikTok sobre: ' + c.tema + '. Breve, con gancho en la primera línea y 3-5 hashtags.'; },
    x: function (c) { return 'Escribe una publicación para X (Twitter) sobre: ' + c.tema + '. Máximo 280 caracteres. Da 3 variantes numeradas.'; },
    hilo: function (c) { return 'Escribe un hilo de X (Twitter) de ' + (c.cantidad || 6) + ' publicaciones sobre: ' + c.tema + '. Cada publicación de máximo 270 caracteres, numeradas (1/n), con gancho al inicio y cierre con llamada a la acción. Separa cada publicación con una línea en blanco.'; },
    instagram: function (c) { return 'Escribe un pie de foto de Instagram sobre: ' + c.tema + '. Gancho en la primera línea, cuerpo breve, llamada a la acción y un bloque final de hasta 10 hashtags relevantes.'; },
    carrusel: function (c) { return 'Escribe un carrusel de ' + (c.cantidad || 7) + ' diapositivas sobre: ' + c.tema + '.\nFormato: "Diapositiva N: <texto corto, máximo 25 palabras>". La 1 es portada con gancho y la última es llamada a la acción. Después añade "Pie de foto:" con un texto breve.'; },
    linkedin: function (c) { return 'Escribe una publicación profesional de LinkedIn sobre: ' + c.tema + '. Primera línea con gancho, párrafos cortos, una lista breve y una pregunta final. Sin exageraciones.'; },
    facebook: function (c) { return 'Escribe una publicación de Facebook sobre: ' + c.tema + ', cercana y conversacional, que invite a comentar.'; },
    titulos: function (c) { return 'Propón ' + (c.cantidad || 8) + ' títulos optimizados (máximo 60 caracteres) y 3 descripciones (máximo 155 caracteres) para: ' + c.tema + '. Usa palabras clave naturales.'; },
    hashtags: function (c) { return 'Sugiere ' + (c.cantidad || 15) + ' hashtags para: ' + c.tema + '. Agrúpalos en nicho, medios y generales. Una línea con todos al final lista para copiar.'; },
    ideas: function (c) { return 'Da ' + (c.cantidad || 10) + ' ideas de contenido para el nicho: ' + c.tema + '. Para cada una indica formato (video corto, carrusel, hilo, etc.), gancho y objetivo.'; },
    correo: function (c) { return 'Escribe un correo sobre: ' + c.tema + '.\nDevuelve ASUNTO, PREHEADER y CUERPO con saludo, mensaje claro, una llamada a la acción y despedida. Deja [Tu nombre] como firma.'; },
    anuncio: function (c) { return 'Escribe 3 variantes de texto de anuncio para: ' + c.tema + '. Cada una con TITULAR (máximo 30 caracteres), DESCRIPCIÓN (máximo 90 caracteres) y llamada a la acción.'; },
    reescribir: function (c) { return 'Reescribe el siguiente texto con otras palabras, conservando el significado y respetando la voz de marca. Devuelve solo el texto.\n\n' + c.texto; },
    mejorar: function (c) { return 'Mejora el siguiente texto: claridad, ritmo, gramática y fuerza del mensaje, sin cambiar los hechos. Devuelve solo el texto mejorado.\n\n' + c.texto; },
    resumir: function (c) { return 'Resume el siguiente texto en ' + (c.cantidad || 3) + ' puntos o frases, sin añadir información nueva.\n\n' + c.texto; },
    traducir: function (c) { return 'Traduce el siguiente texto al idioma: ' + (c.idioma || 'inglés') + '. Conserva tono y formato. Devuelve solo la traducción.\n\n' + c.texto; }
  };
  var SEGURIDAD = 'Reglas: no inventes datos, estadísticas, citas, testimonios ni personas reales; si falta información deja un marcador [DATO]. Evita afirmaciones médicas, financieras o legales presentadas como hechos o como garantía de resultados. Responde en el idioma de la marca (español por defecto).';
  function bloqueMarca(m) {
    if (!m) return '';
    var l = ['Voz de marca' + (m.nombre ? ' "' + m.nombre + '"' : '') + ':'];
    if (m.publico) l.push('- Público: ' + m.publico);
    if (m.estilo) l.push('- Estilo: ' + m.estilo);
    if (m.tono) l.push('- Tono: ' + m.tono);
    if (m.usar) l.push('- Palabras a usar: ' + m.usar);
    if (m.evitar) l.push('- Palabras a evitar: ' + m.evitar);
    if (m.extra) l.push('- Notas: ' + m.extra);
    return l.length > 1 ? l.join('\n') : '';
  }
  function armarMensajes(id, c, marca) {
    var t = tipo(id); if (!t) throw new Error('Tipo desconocido');
    var user = INSTR[id](c);
    if (c.publico) user += '\nPúblico objetivo: ' + c.publico + '.';
    if (c.cta && t.campos.indexOf('cta') >= 0) user += '\nLlamada a la acción deseada: ' + c.cta + '.';
    if (c.extra) user += '\nIndicaciones adicionales: ' + c.extra;
    var sistema = ['Eres un redactor creativo experto en contenido para redes sociales y marketing.', bloqueMarca(marca), SEGURIDAD].filter(Boolean).join('\n\n');
    return { sistema: sistema, mensajes: [{ rol: 'user', texto: user }] };
  }

  /* ---------- Reglas (sin IA) ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(semilla) { var a = hash(String(semilla)); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function baraja(arr, r, n) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a.slice(0, n || a.length); }
  function mayus(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function sinAcentos(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function mmss(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  var GANCHOS = [
    'Lo que casi nadie te explica sobre {t}', '3 errores comunes con {t} (y cómo evitarlos)', 'Si te interesa {t}, esto te va a servir',
    'Prueba esto antes de seguir con {t}', '¿Por qué {t} parece tan difícil? Te lo explico fácil', 'Esto haría si empezara de cero con {t}',
    'Deja de complicarte con {t}: hazlo así', 'Un pequeño cambio en {t} que marca la diferencia', '¿Y si lo que sabes de {t} está incompleto?',
    'Guía rápida de {t} para principiantes', 'Mito vs. realidad sobre {t}', '{T} en 3 pasos simples', 'Pregunta rápida: ¿cómo manejas {t}?',
    'Lo que aprendí al probar {t} [adapta con tu experiencia real]'
  ];
  function ganchos(tema, n, r) { r = r || rng(tema); return baraja(GANCHOS, r, n || 5).map(function (x) { return x.replace(/\{t\}/g, tema).replace(/\{T\}/g, mayus(tema)); }); }
  function aida(c) {
    var t = c.tema, p = c.publico || 'tu público', cta = c.cta || 'Escríbenos y cuéntanos qué necesitas';
    return ['ATENCIÓN: ¿Te pasa que ' + t + ' se siente más difícil de lo que debería?', 'INTERÉS: Hay una forma ordenada de abordarlo pensada para ' + p + ': ' + (c.beneficio || '[explica tu enfoque en una frase]') + '.',
      'DESEO: Imagina avanzar con ' + t + ' con claridad y sin perder tiempo. ' + (c.beneficio ? '' : '[agrega un beneficio concreto y real]'), 'ACCIÓN: ' + cta + '.'].join('\n');
  }
  function pas(c) {
    var t = c.tema, p = c.publico || 'tu público', cta = c.cta || 'Empieza hoy con un primer paso pequeño';
    return ['PROBLEMA: ' + mayus(p) + ' suele encontrarse con obstáculos al trabajar con ' + t + '.', 'AGITACIÓN: Si se deja pasar, el tiempo y el esfuerzo se van en intentos sueltos sin dirección. [añade una consecuencia real y verificable]',
      'SOLUCIÓN: ' + (c.beneficio || '[describe tu propuesta]') + '. ' + cta + '.'].join('\n');
  }
  function palabras(tema) { return (sinAcentos(tema).toLowerCase().match(/[a-z0-9ñ]+/g) || []).filter(function (w) { return w.length > 2 && ['para', 'con', 'los', 'las', 'del', 'una', 'que', 'por', 'sus', 'como'].indexOf(w) < 0; }); }
  function hashtags(tema, n) {
    n = n || 15;
    var ps = palabras(tema), out = [];
    function add(h) { if (h.length > 2 && out.indexOf(h) < 0) out.push(h); }
    var partes = tema.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    partes.forEach(function (fr) { var w = palabras(fr); if (w.length) add('#' + w.map(mayus).join('')); });
    ps.forEach(function (w) { add('#' + w); });
    for (var i = 0; i + 1 < ps.length; i++) add('#' + mayus(ps[i]) + mayus(ps[i + 1]));
    ps.slice(0, 3).forEach(function (w) { add('#' + w + 'tips'); add('#aprende' + w); });
    ['#consejos', '#tips', '#aprende', '#ideas', '#contenido', '#guia'].forEach(add);
    return out.slice(0, n);
  }
  var PILARES = ['Educativo', 'Entretenimiento', 'Inspiración', 'Detrás de cámaras', 'Promoción suave', 'Comunidad', 'Opinión o debate'];
  var FORMATOS = ['Video corto', 'Carrusel', 'Hilo', 'Publicación con imagen', 'Historia', 'Video corto', 'Encuesta'];
  var IDEAS = {
    'Educativo': ['Los 3 errores más comunes en {t}', 'Guía paso a paso de {t}', 'Mito vs. realidad: {t}', 'Glosario rápido de {t}', 'Herramientas útiles para {t}'],
    'Entretenimiento': ['Reto divertido relacionado con {t}', 'Cosas que solo entiende quien trabaja en {t}', 'Antes y después en {t}'],
    'Inspiración': ['Historia de un primer paso en {t} [usa un caso real]', 'Frase y reflexión sobre {t}'],
    'Detrás de cámaras': ['Así preparo mi día trabajando en {t}', 'Mi espacio y herramientas para {t}'],
    'Promoción suave': ['Qué incluye mi servicio de {t} y para quién es', 'Pregunta frecuente sobre {t} y su respuesta'],
    'Comunidad': ['Responde las preguntas de la comunidad sobre {t}', 'Comparte tu experiencia con {t} en comentarios'],
    'Opinión o debate': ['Mi opinión sobre una tendencia en {t}', '¿Qué opinas: A o B en {t}?']
  };
  function calendario(nicho, dias, semilla) {
    dias = dias || 30; var r = rng(nicho + '|' + (semilla || 0)), out = [];
    for (var d = 1; d <= dias; d++) {
      var pil = PILARES[(d - 1) % PILARES.length], fmt = FORMATOS[(d * 3 + Math.floor(r() * 3)) % FORMATOS.length], opc = IDEAS[pil];
      out.push({ dia: d, pilar: pil, formato: fmt, tema: opc[Math.floor(r() * opc.length)].replace(/\{t\}/g, nicho) });
    }
    return out;
  }
  var CAMARAS = ['Plano medio frontal, a la altura de los ojos', 'Primer plano, luz natural de frente', 'Plano detalle de manos o pantalla', 'Plano medio con ligero movimiento lateral', 'Plano general mostrando el entorno', 'Primer plano mirando a cámara'];
  var PUNTOS = ['Qué es {t} y por qué importa', 'El error más común y cómo evitarlo', 'Un paso práctico que se puede aplicar hoy', 'Ejemplo real [agrega tu caso]', 'Lo que conviene revisar antes de empezar', 'Resumen en una sola frase'];
  function escenasGuion(c, r) {
    var dur = Math.max(10, Math.min(600, +c.duracion || 30)), t = c.tema, gan = dur <= 20 ? 3 : 5, cta = dur <= 20 ? 3 : 5;
    var k = Math.max(1, Math.min(6, Math.round((dur - gan - cta) / 12))), tramo = (dur - gan - cta) / k, esc = [], t0 = 0, cam = baraja(CAMARAS, r);
    esc.push({ tipo: 'GANCHO', ini: 0, fin: gan, camara: cam[0], texto: ganchos(t, 1, r)[0] }); t0 = gan;
    for (var i = 0; i < k; i++) {
      var fin = i === k - 1 ? dur - cta : Math.round(gan + tramo * (i + 1));
      esc.push({ tipo: 'DESARROLLO', ini: t0, fin: fin, camara: cam[(i + 1) % cam.length], texto: PUNTOS[i % PUNTOS.length].replace(/\{t\}/g, t) + '.' }); t0 = fin;
    }
    esc.push({ tipo: 'LLAMADA A LA ACCIÓN', ini: t0, fin: dur, camara: 'Primer plano mirando a cámara', texto: (c.cta || 'Sígueme para más contenido como este') + '.' });
    return esc;
  }
  function guion(c, r) {
    var esc = escenasGuion(c, r), l = ['TÍTULO: ' + mayus(c.tema) + ' en ' + (c.duracion || 30) + ' segundos'];
    esc.forEach(function (e, i) { l.push('', 'ESCENA ' + (i + 1) + ' | ' + mmss(e.ini) + '-' + mmss(e.fin) + ' | ' + e.tipo, 'CÁMARA: ' + e.camara, 'TEXTO: ' + e.texto); });
    return l.join('\n');
  }
  function recorta(s, max) { return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'; }
  function frases(t) { return (t.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(function (s) { return s.trim(); }).filter(Boolean); }
  function limpiar(t) {
    return t.replace(/[ \t]+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/([,.;:!?])(?=[^\s\d"')\]!?.,;:])/g, '$1 ').replace(/([!?.])\1{3,}/g, '$1$1$1')
      .replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\n{3,}/g, '\n\n').trim();
  }
  function resumir(t, n) {
    var fs = frases(t); if (fs.length <= n) return fs.join('\n');
    var freq = {}; palabras(t).forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
    var pt = fs.map(function (s, i) { var p = palabras(s); return { i: i, s: s, p: p.reduce(function (a, w) { return a + freq[w]; }, 0) / Math.max(p.length, 4) + (i === 0 ? 1 : 0) }; });
    return pt.sort(function (a, b) { return b.p - a.p; }).slice(0, n).sort(function (a, b) { return a.i - b.i; }).map(function (x) { return '- ' + x.s; }).join('\n');
  }
  var ETIQUETA_REGLAS = 'MODO PLANTILLAS (sin IA): estructura generada por reglas. Completa los [corchetes] y adáptala con tu voz.';
  var SOLO_IA = { traducir: 'Traducir requiere IA: configura una clave en Ajustes.' };
  function generarReglas(id, c, marca, variante) {
    if (SOLO_IA[id]) throw new Error(SOLO_IA[id]);
    var tema = (c.tema || '').trim(), r = rng(id + '|' + tema + '|' + (variante || 0)), hs = hashtags(tema, 5), l;
    if (['reescribir', 'mejorar', 'resumir'].indexOf(id) < 0 && !tema) throw new Error('Escribe un tema o idea.');
    var cta = c.cta || 'Cuéntame en comentarios qué opinas';
    switch (id) {
      case 'guion': return guion(c, r);
      case 'shorts': return 'TÍTULO: ' + recorta(mayus(ganchos(tema, 1, r)[0]), 100) + '\nDESCRIPCIÓN: ' + mayus(tema) + ' explicado de forma simple. ' + cta + '.\n' + hs.slice(0, 4).join(' ') + ' #Shorts';
      case 'tiktok': return ganchos(tema, 1, r)[0] + '\n' + cta + '.\n' + hs.slice(0, 5).join(' ');
      case 'x': return ganchos(tema, 3, r).map(function (h, i) { return (i + 1) + '. ' + recorta(h + '. ' + cta + '. ' + hs.slice(0, 2).join(' '), 280); }).join('\n\n');
      case 'hilo':
        var n = Math.max(3, Math.min(12, +c.cantidad || 6)), pts = baraja(PUNTOS, r, n - 2), ps = [ganchos(tema, 1, r)[0] + ' 🧵'];
        pts.forEach(function (p) { ps.push(p.replace(/\{t\}/g, tema) + '. [desarrolla en una o dos frases]'); });
        ps.push('En resumen: [tu conclusión]. ' + cta + '.');
        return ps.map(function (p, i) { return recorta(p, 262) + ' (' + (i + 1) + '/' + ps.length + ')'; }).join('\n\n');
      case 'instagram': return ganchos(tema, 1, r)[0] + '\n\n' + aida({ tema: tema, publico: c.publico, cta: cta }).replace(/^(ATENCIÓN|INTERÉS|DESEO|ACCIÓN): /gm, '') + '\n\n' + hashtags(tema, 10).join(' ');
      case 'carrusel':
        var m = Math.max(3, Math.min(12, +c.cantidad || 7)), ss = ['Diapositiva 1: ' + ganchos(tema, 1, r)[0]];
        baraja(PUNTOS, r, m - 2).forEach(function (p, i) { ss.push('Diapositiva ' + (i + 2) + ': ' + p.replace(/\{t\}/g, tema) + ' [máx. 25 palabras]'); });
        ss.push('Diapositiva ' + m + ': ' + cta + '. Guarda y comparte.');
        return ss.join('\n') + '\n\nPie de foto: ' + ganchos(tema, 1, r)[0] + '\n' + hashtags(tema, 8).join(' ');
      case 'linkedin': return ganchos(tema, 1, r)[0] + '\n\n' + mayus(tema) + ' suele abordarse sin un orden claro. Estos puntos ayudan:\n\n- ' + baraja(PUNTOS, r, 3).map(function (p) { return p.replace(/\{t\}/g, tema); }).join('\n- ') + '\n\n¿Cómo lo abordas tú? ' + cta + '.';
      case 'facebook': return ganchos(tema, 1, r)[0] + '\n\n' + pas({ tema: tema, publico: c.publico, cta: cta }).replace(/^(PROBLEMA|AGITACIÓN|SOLUCIÓN): /gm, '') + '\n\n¿Te ha pasado? Cuéntanos abajo.';
      case 'titulos': return ganchos(tema, +c.cantidad || 8, r).map(function (h, i) { return (i + 1) + '. ' + recorta(h, 60) + ' (' + Math.min(h.length, 60) + ' car.)'; }).join('\n') + '\n\nDescripción: ' + recorta(mayus(tema) + ': guía práctica con pasos claros para ' + (c.publico || 'empezar') + '.', 155);
      case 'hashtags': return hashtags(tema, +c.cantidad || 15).join(' ');
      case 'ideas':
        return calendario(tema, +c.cantidad || 10, variante).map(function (x, i) { return (i + 1) + '. [' + x.formato + '] ' + x.tema + ' (' + x.pilar + ')'; }).join('\n');
      case 'correo': return 'ASUNTO: ' + recorta(ganchos(tema, 1, r)[0], 60) + '\nPREHEADER: ' + recorta(mayus(tema) + ', en pocas líneas.', 90) + '\n\nHola [nombre]:\n\n' + aida({ tema: tema, publico: c.publico, cta: cta }).replace(/^(ATENCIÓN|INTERÉS|DESEO|ACCIÓN): /gm, '') + '\n\nUn saludo,\n[Tu nombre]';
      case 'anuncio':
        return [0, 1, 2].map(function (i) {
          var h = recorta(ganchos(tema, 3, r)[i], 30);
          return 'Variante ' + (i + 1) + '\nTITULAR: ' + h + '\nDESCRIPCIÓN: ' + recorta((i === 1 ? 'Evita los problemas habituales con ' : 'Descubre cómo avanzar con ') + tema + '. ' + cta + '.', 90);
        }).join('\n\n');
      case 'reescribir': case 'mejorar': if (!c.texto) throw new Error('Pega el texto.'); return limpiar(c.texto);
      case 'resumir': if (!c.texto) throw new Error('Pega el texto.'); return resumir(c.texto, +c.cantidad || 3);
    }
    throw new Error('Tipo no soportado en modo plantillas');
  }
  var LIMITES_REGLAS = { reescribir: 'En modo plantillas solo se limpia ortografía de espaciado y mayúsculas; no reescribe con otras palabras.', mejorar: 'En modo plantillas solo se limpia ortografía de espaciado y mayúsculas.', resumir: 'Resumen extractivo: elige las frases más representativas.' };
  return { TIPOS: TIPOS, tipo: tipo, armarMensajes: armarMensajes, generarReglas: generarReglas, ganchos: ganchos, aida: aida, pas: pas, hashtags: hashtags, calendario: calendario, PILARES: PILARES, FORMATOS: FORMATOS, rng: rng, mmss: mmss, ETIQUETA_REGLAS: ETIQUETA_REGLAS, LIMITES_REGLAS: LIMITES_REGLAS, SOLO_IA: SOLO_IA, limpiar: limpiar, resumir: resumir };
});
