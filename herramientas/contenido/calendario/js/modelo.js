/* Constantes y funciones del modelo editorial. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Modelo = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var F = g.Fechas || require('./fechas.js'), R = g.Recurrencia || require('./recurrencia.js');
  var REDES = { x: { nombre: 'X / Twitter', color: '#1d9bf0', cont: 'x' }, instagram: { nombre: 'Instagram', color: '#e1306c', cont: 'instagram' }, tiktok: { nombre: 'TikTok', color: '#00a8a8', cont: 'tiktok' }, linkedin: { nombre: 'LinkedIn', color: '#0a66c2', cont: 'linkedin' }, facebook: { nombre: 'Facebook', color: '#4267b2', cont: 'facebook' }, youtube: { nombre: 'YouTube Shorts', color: '#e62117', cont: 'shorts_desc' } };
  var ESTADOS = [['idea', 'Idea', '#8a8fa8'], ['guion', 'Guion', '#b07d00'], ['grabacion', 'Grabación', '#d9622b'], ['edicion', 'Edición', '#8e44ad'], ['programado', 'Programado', '#1b7fc4'], ['publicado', 'Publicado', '#12805c']];
  var FORMATOS = ['Video corto', 'Video largo', 'Carrusel', 'Hilo', 'Publicación con imagen', 'Texto', 'Historia', 'En vivo', 'Encuesta'];
  var CHECKLIST = {
    x: ['Texto dentro de 280 caracteres', 'Enlace revisado y funcionando', 'Imagen/video con texto alternativo', '1–2 hashtags como máximo', 'Ortografía revisada'],
    instagram: ['Primera línea con gancho', 'Imagen/video en formato correcto', 'Texto alternativo agregado', 'Hashtags relevantes (≤ 30)', 'Portada/miniatura revisada', 'Ortografía revisada'],
    tiktok: ['Gancho en los primeros 3 segundos', 'Subtítulos agregados', 'Audio con derechos de uso', 'Texto y hashtags listos', 'Video vertical 9:16'],
    linkedin: ['Primera línea con gancho', 'Tono profesional', 'Datos verificados con fuente', 'Pregunta o llamada a la acción final', 'Ortografía revisada'],
    facebook: ['Texto y enlace revisados', 'Imagen/video listo', 'Pregunta para generar conversación', 'Ortografía revisada'],
    youtube: ['Título dentro de 100 caracteres', 'Descripción con llamada a la acción', 'Video vertical ≤ 60 s (verifica el límite vigente)', 'Subtítulos revisados', 'Derechos de audio/imágenes']
  };
  var TIPOS_ESCENA = ['GANCHO', 'DESARROLLO', 'LLAMADA A LA ACCIÓN'];
  var HORARIOS_DEF = { x: [[0, '09:00'], [2, '12:00'], [4, '18:00']], instagram: [[1, '12:00'], [3, '19:00'], [5, '10:00']], tiktok: [[1, '19:00'], [3, '20:00'], [5, '18:00']], linkedin: [[1, '08:30'], [2, '12:00'], [3, '08:30']], facebook: [[2, '13:00'], [4, '15:00'], [6, '11:00']], youtube: [[4, '17:00'], [5, '11:00'], [6, '12:00']] };
  var RECORDATORIOS = [[0, 'Sin recordatorio'], [10, '10 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [1440, '1 día antes']];
  function nuevaPub(o) {
    return Object.assign({ titulo: '', red: 'instagram', formato: 'Video corto', estado: 'idea', fecha: '', hora: '09:00', zona: '', campana: '', serie: '', tema: '', texto: '', escenas: [], checklist: {}, metricas: { vistas: 0, likes: 0, comentarios: 0, compartidos: 0, clics: 0 }, recordar: 0, rec: { freq: 'ninguna', cada: 1, dias: [], hasta: '', cuenta: 0 }, enlace: '', notas: '' }, o || {});
  }
  function duracionGuion(esc) { return (esc || []).reduce(function (a, e) { return a + (+e.seg || 0); }, 0); }
  function palabrasGuion(esc) { return (esc || []).reduce(function (a, e) { return a + ((e.texto || '').match(/\S+/g) || []).length; }, 0); }
  function escenasDesdeGuion(g) { return g.escenas.map(function (e, i) { return { id: 'e' + i + Date.now().toString(36), tipo: e.tipo, camara: e.camara, texto: e.texto, seg: Math.max(1, e.fin - e.ini) }; }); }
  function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + F.p2(s % 60); }
  /* Ocurrencias visibles: [{pub, fecha, hora}] ordenadas */
  function ocurrencias(pubs, desde, hasta) {
    var out = [];
    pubs.forEach(function (p) { if (!p.fecha) return; R.expandir(p.fecha, p.rec, desde, hasta).forEach(function (d) { out.push({ pub: p, fecha: d, hora: p.hora || '09:00', recurrente: !!(p.rec && p.rec.freq && p.rec.freq !== 'ninguna') }); }); });
    return out.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : (a.fecha + a.hora) > (b.fecha + b.hora) ? 1 : 0; });
  }
  return { REDES: REDES, ESTADOS: ESTADOS, FORMATOS: FORMATOS, CHECKLIST: CHECKLIST, TIPOS_ESCENA: TIPOS_ESCENA, HORARIOS_DEF: HORARIOS_DEF, RECORDATORIOS: RECORDATORIOS, nuevaPub: nuevaPub, duracionGuion: duracionGuion, palabrasGuion: palabrasGuion, escenasDesdeGuion: escenasDesdeGuion, mmss: mmss, ocurrencias: ocurrencias };
});
