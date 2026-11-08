/* Almacen del estudio (IndexedDB 'trabajos_contenido_ia'): proyectos, piezas, series, prompts, metricas y respuestas se sincronizan con la cuenta.
   Ajustes de IA en localStorage del dispositivo; la clave de API SOLO en trabajos_contenido_ia_claves_dispositivo (nunca se sincroniza). */
(function (g) {
  'use strict';
  var ID = 'trabajos_contenido_ia', alm = g.Almacen.crear(ID), D = g.CDatos = { ID: ID, alm: alm, COLS: ['proyectos', 'piezas', 'series', 'prompts', 'metricas', 'respuestas'] };
  var KAJ = ID + '_ajustes_dispositivo', KCL = ID + '_claves_dispositivo', KAV = ID + '_aviso_dispositivo', KLIM = ID + '_limites_dispositivo', KPR = ID + '_proyecto_dispositivo';
  function lee(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function esc(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  D.ajustes = function () { return Object.assign({}, g.VIA.DEF, { maxTokens: 1500, intervaloMin: 2, maxLlamadasHora: 40, maxLlamadasDia: 200, presupuestoDia: 1, costoLlamada: 0.01 }, lee(KAJ, {})); };
  D.guardarAjustes = function (a) { var l = Object.assign({}, a); delete l.clave; return esc(KAJ, l); };
  D.clave = function () { return lee(KCL, {}).clave || ''; };
  D.guardarClave = function (c) { return esc(KCL, c ? { clave: c } : null); };
  D.avisoAceptado = function () { return !!lee(KAV, null); };
  D.aceptarAviso = function () { esc(KAV, { t: Date.now() }); };
  D.estadoLimitador = function () { return lee(KLIM, null); };
  D.guardarLimitador = function (e) { esc(KLIM, e); };
  D.proyectoActivo = function () { return lee(KPR, ''); };
  D.fijarProyecto = function (id) { esc(KPR, id); };
  function ord(l, c) { return l.sort(function (a, b) { return (b[c] || 0) - (a[c] || 0); }); }
  D.lista = function (col, proyecto) { return alm.lista(col).then(function (l) { return proyecto ? l.filter(function (x) { return x.proyecto === proyecto; }) : l; }); };
  D.proyectos = function () { return alm.lista('proyectos').then(function (l) { return ord(l, '_t'); }); };
  D.nuevoProyecto = function (nombre) {
    return { nombre: nombre || 'Mi canal', canales: ['youtube', 'tiktok'], nicho: { tema: '', publico: '', propuesta: '', diferenciador: '', tono: '', idioma: 'español' }, personas: [], pilares: [], competencia: { texto: '', analisis: null }, marca: { nombre: '', handle: '', lema: '', color: '#3e63dd', esquema: 'analogo', tipografia: 'moderna', forma: 'circulo', paleta: null }, biblia: { personaje: '', voz: '', tono: '', estiloVisual: '', vocabulario: '', vetos: 'Promesas de ganancias garantizadas\nSuplantar a personas reales\nCopiar material con derechos', divulgacion: '', ejemplos: '' }, cadencia: {}, diaMetricas: 1, _v: 1 };
  };
  D.nuevaPieza = function (proyecto, o) {
    return Object.assign({ proyecto: proyecto, titulo: '', formato: 'corto', canal: 'youtube', estado: 'idea', serie: '', pilar: '', tema: '', versiones: [], hook: '', titulos: [], ab: [], descripcion: '', hashtags: '', prompts: {}, archivos: [], notas: '', checklist: {}, divulgacion: { ia: true, guion: true, voz: false, rostro: false, escenaRealista: false, imagenes: false, video: false, etiquetada: false, herramientas: '', nota: '' }, fecha: '', hora: '09:00', recordar: 30, recordado: false, publicadoUrl: '', origen: null, miniatura: { plantilla: 'bloque', formato: 'youtube', texto: '', subtitulo: '' } }, o || {});
  };
  D.guion = function (p) { var v = p.versiones || []; return v.length ? v[v.length - 1].texto : ''; };
  ['proyectos', 'piezas', 'series', 'prompts', 'metricas', 'respuestas'].forEach(function (c) {
    var nom = c.charAt(0).toUpperCase() + c.slice(1);
    D['guardar' + nom] = function (o) { return alm.set(c, o); }; D['borrar' + nom] = function (id) { return alm.borrar(c, id); };
  });
})(window);
