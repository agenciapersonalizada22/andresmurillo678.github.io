/* Canales, formatos, esqueletos de guion, checklists, reutilizacion cruzada, respuestas y prompts externos. Puro. CIA.plantillas */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.plantillas = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var P = {};
  /* Reglas resumidas; las plataformas cambian a menudo: siempre se avisa de verificar la politica vigente. */
  P.CANALES = {
    youtube: { nombre: 'YouTube', color: '#e03131', formatos: ['corto', 'largo', 'directo'], titulo: 100, desc: 5000, hashtags: 15, politica: 'Exige indicar en YouTube Studio cuando el contenido realista está alterado o generado de forma sintética. El contenido masivo, repetitivo o sin aporte propio puede perder la monetización («contenido inauténtico»). Respeta derechos de música e imágenes.' },
    tiktok: { nombre: 'TikTok', color: '#0c8a8a', formatos: ['corto', 'carrusel'], titulo: 90, desc: 2200, hashtags: 5, politica: 'Pide etiquetar el contenido generado con IA que sea realista (interruptor «contenido generado por IA»). Prohíbe suplantar a personas reales y desinformar. El audio comercial tiene licencias propias.' },
    instagram: { nombre: 'Instagram', color: '#c2255c', formatos: ['corto', 'carrusel', 'publicacion'], titulo: 125, desc: 2200, hashtags: 30, politica: 'Meta etiqueta («Info de IA») y pide divulgar imágenes, video o audio fotorrealistas creados con IA. Evita parecer una cuenta de otra persona.' },
    x: { nombre: 'X', color: '#343a40', formatos: ['hilo', 'publicacion'], titulo: 280, desc: 280, hashtags: 2, politica: 'Su política de medios sintéticos y manipulados prohíbe engañar con medios alterados que puedan causar daño. Automatizar respuestas masivas o cuentas de spam puede suspender la cuenta.' },
    facebook: { nombre: 'Facebook', color: '#1c7ed6', formatos: ['corto', 'publicacion', 'carrusel', 'directo'], titulo: 100, desc: 5000, hashtags: 5, politica: 'Meta pide divulgar el contenido realista creado con IA y penaliza el contenido repetitivo o no original para monetizar.' },
    twitch: { nombre: 'Twitch', color: '#7048e8', formatos: ['directo'], titulo: 140, desc: 300, hashtags: 5, politica: 'Etiqueta de contenido para público maduro cuando aplique; avatares o voces de IA no deben suplantar a personas reales. Cuida la música con derechos en directos y VOD.' },
    podcast: { nombre: 'Podcast', color: '#e8590c', formatos: ['podcast'], titulo: 120, desc: 4000, hashtags: 0, politica: 'Las plataformas de podcast piden indicar voces sintéticas si aplica y prohíben clonar la voz de personas reales sin su consentimiento. Música y samples requieren licencia.' },
    blog: { nombre: 'Blog', color: '#2b8a3e', formatos: ['blog'], titulo: 65, desc: 160, hashtags: 0, politica: 'Los buscadores penalizan el contenido masivo sin valor original («scaled content abuse»). Revisa los hechos, cita fuentes y añade experiencia propia; informa del uso de IA si tu audiencia lo espera.' },
    newsletter: { nombre: 'Newsletter', color: '#9c36b5', formatos: ['newsletter'], titulo: 60, desc: 140, hashtags: 0, politica: 'El correo comercial exige consentimiento, enlace de baja y datos del remitente (RGPD, CAN-SPAM y leyes locales). No compres listas.' }
  };
  P.FORMATOS = {
    corto: { nombre: 'Video corto (Shorts/Reels/TikTok)', unidad: 'segundos', objetivo: 45, ritmo: 2.5, secciones: [['GANCHO', 'Primeros 3 s: promesa o pregunta que obligue a quedarse.', 0.07], ['CONTEXTO', 'Una frase: por qué importa.', 0.13], ['DESARROLLO', '2 o 3 ideas rápidas, una imagen por idea.', 0.55], ['CIERRE', 'Remate o giro final que invite a ver otra vez.', 0.12], ['LLAMADA A LA ACCIÓN', 'Una sola acción: seguir, comentar o guardar.', 0.13]] },
    largo: { nombre: 'Video largo (YouTube)', unidad: 'minutos', objetivo: 8, ritmo: 150, secciones: [['GANCHO', 'Resultado final o promesa en 15 s.', 0.05], ['INTRO', 'Quién eres y qué se aprende; sin rodeos.', 0.07], ['BLOQUE 1', 'Primera idea con ejemplo.', 0.22], ['BLOQUE 2', 'Segunda idea con ejemplo.', 0.22], ['BLOQUE 3', 'Tercera idea con ejemplo o demostración.', 0.22], ['RESUMEN', 'Tres líneas con lo aprendido.', 0.1], ['LLAMADA A LA ACCIÓN', 'Siguiente video recomendado y suscripción.', 0.12]] },
    hilo: { nombre: 'Hilo de texto (X)', unidad: 'posts', objetivo: 8, secciones: [['POST 1 (gancho)', 'Promesa concreta en menos de 240 caracteres.'], ['POST 2', 'Contexto o problema.'], ['POSTS 3-6', 'Un punto por post, con un dato o ejemplo.'], ['POST 7', 'Resumen en una frase.'], ['POST 8', 'Llamada a la acción y pedir difusión.']] },
    carrusel: { nombre: 'Carrusel', unidad: 'diapositivas', objetivo: 8, secciones: [['PORTADA', 'Título corto con promesa (máx. 8 palabras).'], ['DIAPOSITIVA 2', 'El problema.'], ['DIAPOSITIVAS 3-6', 'Un punto por diapositiva: título + 1 línea.'], ['DIAPOSITIVA 7', 'Resumen / checklist.'], ['DIAPOSITIVA 8', 'Llamada a la acción: guardar y compartir.']] },
    podcast: { nombre: 'Episodio de podcast', unidad: 'minutos', objetivo: 20, ritmo: 140, secciones: [['TEASER', '30 s con lo mejor del episodio.'], ['INTRO', 'Saludo, tema y por qué hoy.'], ['SEGMENTO 1', 'Historia o contexto.'], ['SEGMENTO 2', 'Análisis o entrevista.'], ['SEGMENTO 3', 'Consejos prácticos.'], ['CIERRE', 'Resumen y próximos pasos.'], ['LLAMADA A LA ACCIÓN', 'Reseña, suscripción y dónde seguirte.']] },
    newsletter: { nombre: 'Newsletter', unidad: 'palabras', objetivo: 450, secciones: [['ASUNTO', 'Menos de 50 caracteres, beneficio claro.'], ['PREVISUALIZACIÓN', 'Una línea que complete el asunto.'], ['APERTURA', 'Anécdota o dato que enganche (2-3 frases).'], ['CUERPO', 'Tres bloques con subtítulo.'], ['ENLACE DESTACADO', 'Un recurso o producto, indicando si es afiliado.'], ['DESPEDIDA', 'Pregunta para que respondan.'], ['PIE', 'Enlace de baja y datos del remitente.']] },
    blog: { nombre: 'Artículo de blog', unidad: 'palabras', objetivo: 900, secciones: [['TÍTULO SEO', 'Palabra clave al inicio, menos de 65 caracteres.'], ['INTRODUCCIÓN', 'Problema y promesa en 100 palabras.'], ['H2 1', 'Primera sección con ejemplo.'], ['H2 2', 'Segunda sección con datos citados.'], ['H2 3', 'Tercera sección práctica.'], ['PREGUNTAS FRECUENTES', 'Tres preguntas reales.'], ['CONCLUSIÓN', 'Resumen y siguiente paso.']] },
    directo: { nombre: 'Directo (Twitch/YouTube Live)', unidad: 'minutos', objetivo: 90, secciones: [['PRE-DIRECTO', 'Revisar audio, escena, chat y alertas; avisar en redes.'], ['APERTURA', 'Saludo y agenda de la sesión.'], ['BLOQUE PRINCIPAL', 'Actividad central con pausas para el chat.'], ['INTERACCIÓN', 'Preguntas, encuestas y menciones.'], ['CIERRE', 'Resumen, próxima fecha y raid o despedida.']] },
    publicacion: { nombre: 'Publicación con imagen', unidad: 'palabras', objetivo: 60, secciones: [['IMAGEN', 'Qué muestra y texto alternativo.'], ['PRIMERA LÍNEA', 'Gancho antes del «ver más».'], ['CUERPO', 'Una idea, un ejemplo.'], ['LLAMADA A LA ACCIÓN', 'Pregunta o invitación a guardar.']] }
  };
  P.esqueleto = function (formato, tema) {
    var f = P.FORMATOS[formato]; if (!f) throw new Error('Formato desconocido: ' + formato);
    return 'TEMA: ' + (tema || '(escribe el tema)') + '\nFORMATO: ' + f.nombre + ' · objetivo ≈ ' + f.objetivo + ' ' + f.unidad + '\n\n' + f.secciones.map(function (s) {
      var extra = f.ritmo && s[2] ? ' (≈ ' + (f.unidad === 'segundos' ? Math.round(f.objetivo * s[2]) + ' s' : Math.round(f.objetivo * s[2] * 10) / 10 + ' min') + ')' : '';
      return '## ' + s[0] + extra + '\n// ' + s[1] + '\n';
    }).join('\n');
  };
  P.palabras = function (t) { return (String(t || '').match(/\S+/g) || []).length; };
  /* duracion estimada hablada: 150 palabras/min (podcast 140) */
  P.duracionHablada = function (texto, ppm) { return Math.round(P.palabras(texto) / (ppm || 150) * 60); };
  P.limites = function (canal, pieza) {
    var c = P.CANALES[canal]; if (!c) return [];
    var out = [];
    function lim(campo, txt, max) { if (max && txt && txt.length > max) out.push({ campo: campo, largo: txt.length, max: max }); }
    lim('título', pieza.titulo, c.titulo); lim('descripción', pieza.descripcion, c.desc);
    var tags = String(pieza.hashtags || '').match(/#[^\s#]+/g) || []; if (c.hashtags && tags.length > c.hashtags) out.push({ campo: 'hashtags', largo: tags.length, max: c.hashtags });
    return out;
  };
  /* checklist de publicacion (incluye divulgacion y derechos) */
  P.checklist = function (canal, formato) {
    var base = ['Revisé hechos, nombres, cifras y enlaces (la IA puede inventar datos)', 'Registré qué partes se generaron con IA (pestaña Calidad)', 'Todo material (música, imagen, fuentes) es propio, licenciado o libre', 'Sin promesas financieras ni médicas, ni suplantación de personas reales', 'Ortografía, subtítulos y texto alternativo revisados'];
    var extra = { youtube: ['Marqué «contenido alterado o sintético» en YouTube Studio si es realista', 'Título ≤ 100 caracteres, miniatura legible en móvil', 'Descripción con capítulos y enlaces'], tiktok: ['Activé la etiqueta «generado por IA» si es realista', 'Subtítulos en pantalla y audio con licencia'], instagram: ['Etiqueta de IA / «Info de IA» activada si es fotorrealista', 'Portada en cuadrícula revisada', 'Texto alternativo agregado'], x: ['Cada post ≤ 280 caracteres', 'Medios sintéticos indicados si pueden confundir'], facebook: ['Etiqueta de IA si es realista', 'Pregunta para generar conversación'], twitch: ['Etiqueta de contenido adecuada y reglas del chat listas', 'Música sin derechos en directo'], podcast: ['Voces sintéticas indicadas en las notas del episodio', 'Capítulos y notas del episodio listos'], blog: ['Palabra clave y meta descripción ≤ 160', 'Fuentes citadas con enlace', 'Aporte propio claro (experiencia, datos, ejemplos)'], newsletter: ['Enlace de baja y datos del remitente', 'Asunto ≤ 50 caracteres y prueba enviada a mí mismo', 'Enlaces de afiliado indicados'] };
    return base.concat(extra[canal] || []);
  };
  /* Reutilizacion cruzada: un video/pieza -> 10 piezas derivadas (borradores sin fecha) */
  P.DERIVADOS = [
    { formato: 'corto', canal: 'tiktok', titulo: 'Corto 1: el mejor momento', instr: 'Extrae el momento más sorprendente (≤ 45 s) con gancho nuevo.' },
    { formato: 'corto', canal: 'instagram', titulo: 'Corto 2: un consejo rápido', instr: 'Convierte un consejo en un reel de 30 s con subtítulos.' },
    { formato: 'corto', canal: 'youtube', titulo: 'Corto 3: pregunta y respuesta', instr: 'Plantea la duda más común y respóndela en 40 s.' },
    { formato: 'hilo', canal: 'x', titulo: 'Hilo con los puntos clave', instr: 'Resume en 7-8 posts; el primero es el gancho.' },
    { formato: 'carrusel', canal: 'instagram', titulo: 'Carrusel de los pasos', instr: 'Una diapositiva por paso, con título corto.' },
    { formato: 'carrusel', canal: 'tiktok', titulo: 'Carrusel de errores comunes', instr: '5 errores y su corrección.' },
    { formato: 'newsletter', canal: 'newsletter', titulo: 'Edición de la semana', instr: 'Resume el contenido con anécdota y un enlace al original.' },
    { formato: 'blog', canal: 'blog', titulo: 'Artículo SEO', instr: 'Reescribe como artículo con subtítulos, FAQ y palabra clave.' },
    { formato: 'publicacion', canal: 'facebook', titulo: 'Cita gráfica + pregunta', instr: 'Una frase potente en imagen y una pregunta a la comunidad.' },
    { formato: 'podcast', canal: 'podcast', titulo: 'Episodio comentado', instr: 'Versión conversada de 10 minutos con ejemplos nuevos.' }
  ];
  P.reutilizar = function (pieza, canalesActivos) {
    var ok = canalesActivos && canalesActivos.length ? canalesActivos : null;
    return P.DERIVADOS.filter(function (d) { return !ok || ok.indexOf(d.canal) >= 0; }).map(function (d, i) { return { titulo: d.titulo + ' · ' + (pieza.titulo || 'pieza'), formato: d.formato, canal: d.canal, estado: 'idea', origen: pieza.id || null, tema: pieza.tema || pieza.titulo || '', pilar: pieza.pilar || '', serie: '', versiones: [{ v: 1, t: 0, texto: '// Instrucción: ' + d.instr + '\n// Fuente: ' + (pieza.titulo || '') + '\n', nota: 'Derivado automático' }], divulgacion: { ia: true, voz: false, rostro: false, escenaRealista: false, imagenes: false, video: false, etiquetada: false, herramientas: '', nota: 'Derivado de «' + (pieza.titulo || '') + '»' } }; });
  };
  /* Respuestas a comentarios (editables por el usuario) */
  P.RESPUESTAS = [
    { cat: 'Agradecimiento', nombre: 'Gracias por el apoyo', texto: '¡Gracias, {nombre}! Me alegra mucho que te haya servido. Si hay algún tema que quieras ver, cuéntamelo.' },
    { cat: 'Pregunta', nombre: 'Responder una duda', texto: 'Buena pregunta, {nombre}. En resumen: {respuesta}. Si quieres más detalle, lo explico en {enlace}.' },
    { cat: 'Pregunta', nombre: '¿Es IA?', texto: 'Sí, {nombre}: este canal usa herramientas de IA para {partes}, y yo reviso y edito cada pieza. Prefiero ser transparente.' },
    { cat: 'Crítica', nombre: 'Crítica constructiva', texto: 'Gracias por decírmelo, {nombre}. Tienes razón en {punto}; lo tendré en cuenta en el próximo.' },
    { cat: 'Crítica', nombre: 'Corrección de un error', texto: 'Tienes razón, {nombre}, me equivoqué en {punto}. Lo corrijo en la descripción y lo fijo aquí. ¡Gracias!' },
    { cat: 'Colaboración', nombre: 'Propuesta comercial', texto: 'Hola {nombre}, gracias por escribir. Para propuestas, envíame los detalles (alcance, fechas y presupuesto) a {contacto}. Siempre indico cuando algo es publicidad.' },
    { cat: 'Moderación', nombre: 'Aviso por spam', texto: 'Este comentario no cumple las normas del canal (enlaces o mensajes repetidos). Lo oculto; si fue un error, escríbeme.' },
    { cat: 'Comunidad', nombre: 'Invitar a seguir', texto: '¿Te gustó, {nombre}? El próximo {dia} publico sobre {tema}. Activa el aviso para no perdértelo.' }
  ];
  P.rellenar = function (texto, vars) { return String(texto).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] ? vars[k] : m; }); };
  /* Prompts para herramientas externas (imagen, voz, video) coherentes con la biblia de estilo */
  P.promptExterno = function (tipo, escena, biblia, extra) {
    biblia = biblia || {}; extra = extra || {};
    var coher = [biblia.personaje && 'Personaje constante: ' + biblia.personaje, biblia.estiloVisual && 'Estilo visual: ' + biblia.estiloVisual, biblia.paleta && 'Paleta: ' + biblia.paleta].filter(Boolean).join('. ');
    if (tipo === 'imagen') return 'Ilustración para: ' + escena + '. ' + coher + '. Formato ' + (extra.formato || '16:9') + ', composición clara con espacio libre para texto, iluminación suave, alta nitidez. Evitar: texto ilegible, logotipos de marcas reales, rostros de personas reales, manos deformes.';
    if (tipo === 'voz') return 'Locución en ' + (extra.idioma || 'español neutro') + '. Voz: ' + (biblia.voz || 'cálida y cercana') + '. Ritmo: ' + (extra.ritmo || 'medio, con pausas en los puntos') + '. Énfasis en las palabras clave. Texto:\n' + escena + '\nNo imitar la voz de ninguna persona real.';
    if (tipo === 'video') return 'Clip de ' + (extra.segundos || 5) + ' s: ' + escena + '. ' + coher + '. Cámara: ' + (extra.camara || 'plano medio con movimiento lento') + '. Formato ' + (extra.formato || '9:16') + '. Sin texto incrustado, sin marcas reales, sin personas reales identificables.';
    throw new Error('Tipo de prompt desconocido');
  };
  /* Divide un guion (## secciones) en escenas para generar prompts por escena */
  P.escenas = function (texto) {
    var partes = String(texto || '').split(/^##\s*/m).map(function (s) { return s.trim(); }).filter(Boolean), out = [];
    partes.forEach(function (p) { var l = p.split('\n'), titulo = l[0].replace(/\s*\(.*\)\s*$/, ''), cuerpo = l.slice(1).filter(function (x) { return !/^\/\//.test(x.trim()); }).join(' ').trim(); if (cuerpo && !/^TEMA:|^FORMATO:/.test(titulo)) out.push({ titulo: titulo, texto: cuerpo }); });
    return out;
  };
  /* Hashtags simples a partir de tema/pilar/nicho */
  P.hashtags = function (palabras, max) {
    var vistos = {}, out = [];
    palabras.join(' ').split(/[\s,;]+/).forEach(function (w) { var t = w.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, ''); if (t.length >= 4 && !vistos[t.toLowerCase()]) { vistos[t.toLowerCase()] = 1; out.push('#' + t.toLowerCase()); } });
    return out.slice(0, max || 8);
  };
  /* Titulos plantilla sin IA */
  P.titulosBase = function (tema) {
    return ['Cómo ' + tema + ' (paso a paso)', '5 errores al ' + tema + ' que debes evitar', 'Lo que nadie te cuenta sobre ' + tema, tema + ': guía para empezar hoy', '¿Vale la pena? ' + tema + ' en 60 segundos', 'Probé ' + tema + ' durante 30 días: resultados reales'];
  };
  P.divulgacionTexto = function (d, canal) {
    var partes = []; if (d.voz) partes.push('voz'); if (d.rostro) partes.push('imagen o rostro'); if (d.escenaRealista) partes.push('escenas realistas'); if (d.imagenes) partes.push('imágenes'); if (d.video) partes.push('video'); if (d.guion) partes.push('guion');
    return 'Este contenido se creó con ayuda de IA' + (partes.length ? ' (' + partes.join(', ') + ')' : '') + (d.herramientas ? ' usando ' + d.herramientas : '') + ' y fue revisado por una persona.';
  };
  return P;
});
