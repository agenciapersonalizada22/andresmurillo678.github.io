/* Cliente de IA con la clave del propio usuario (Anthropic o compatible OpenAI), limitador de coste/frecuencia y analizadores de respuesta.
   Puro salvo consultar() (usa fetch inyectable). Nada se envia sin consentimiento: lo exige la interfaz antes de llamar. window.VIA */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.VIA = m; })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var IA = {};
  IA.PROVEEDORES = {
    anthropic: { nombre: 'Anthropic (Claude)', base: 'https://api.anthropic.com', modelo: 'claude-sonnet-4-5' },
    openai: { nombre: 'Compatible OpenAI', base: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini' }
  };
  IA.DEF = { proveedor: 'anthropic', base: IA.PROVEEDORES.anthropic.base, modelo: IA.PROVEEDORES.anthropic.modelo, maxLlamadasHora: 30, maxLlamadasDia: 200, intervaloMin: 10, presupuestoDia: 0.5, costoLlamada: 0.003, costoImagen: 0.002, soloConMovimiento: true, calidadJpeg: 0.6, anchoEnvio: 640 };

  IA.construirPeticion = function (cfg, clave, p) {
    var imgs = p.imagenes || [], base = String(cfg.base || '').replace(/\/+$/, '');
    if (cfg.proveedor === 'anthropic') {
      var cont = []; imgs.forEach(function (im) { if (im.etiqueta) cont.push({ type: 'text', text: im.etiqueta }); cont.push({ type: 'image', source: { type: 'base64', media_type: im.mime || 'image/jpeg', data: im.b64 } }); }); cont.push({ type: 'text', text: p.texto });
      return { url: base + '/v1/messages', headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: { model: cfg.modelo, max_tokens: p.maxTokens || 800, system: p.sistema || undefined, messages: [{ role: 'user', content: cont }] } };
    }
    var c2 = []; imgs.forEach(function (im) { if (im.etiqueta) c2.push({ type: 'text', text: im.etiqueta }); c2.push({ type: 'image_url', image_url: { url: 'data:' + (im.mime || 'image/jpeg') + ';base64,' + im.b64 } }); }); c2.push({ type: 'text', text: p.texto });
    var msgs = []; if (p.sistema) msgs.push({ role: 'system', content: p.sistema }); msgs.push({ role: 'user', content: c2 });
    return { url: base + '/chat/completions', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + clave }, body: { model: cfg.modelo, max_tokens: p.maxTokens || 800, messages: msgs } };
  };
  IA.extraerTexto = function (prov, r) {
    if (!r) return ''; if (prov === 'anthropic') return (r.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n');
    var c = r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content; return typeof c === 'string' ? c : Array.isArray(c) ? c.map(function (x) { return x.text || ''; }).join('') : '';
  };
  IA.extraerJSON = function (txt) {
    txt = String(txt || '').replace(/```(?:json)?/gi, ''); var i = txt.indexOf('{'); if (i < 0) return null;
    for (var fin = txt.lastIndexOf('}'); fin > i; fin = txt.lastIndexOf('}', fin - 1)) { try { return JSON.parse(txt.slice(i, fin + 1)); } catch (e) {} }
    return null;
  };
  IA.explicarError = function (status, cuerpo) {
    var m = (cuerpo && (cuerpo.error && (cuerpo.error.message || cuerpo.error) || cuerpo.message)) || '';
    if (status === 401 || status === 403) return 'La clave no es válida o no tiene permiso (' + status + ').'; if (status === 429) return 'El proveedor limita las peticiones (429). Espera o sube el intervalo mínimo.';
    if (status === 400) return 'Petición rechazada (400): ' + String(m).slice(0, 160) + ' Revisa el modelo y que admita imágenes.'; if (status === 404) return 'Modelo o dirección no encontrados (404). Revisa la URL base y el nombre del modelo.';
    if (status >= 500) return 'El servicio de IA falló (' + status + '). Reintenta más tarde.'; return 'Error ' + status + (m ? ': ' + String(m).slice(0, 160) : '');
  };
  /* fetchFn inyectable para pruebas. Devuelve {texto, json, uso} o lanza Error con mensaje en espanol. */
  IA.consultar = async function (cfg, clave, p, fetchFn, ms) {
    if (!clave) throw new Error('Falta la clave de API (Ajustes de IA).');
    var q = IA.construirPeticion(cfg, clave, p), ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 45000) : null, r;
    try { r = await (fetchFn || g.fetch.bind(g))(q.url, { method: 'POST', headers: q.headers, body: JSON.stringify(q.body), signal: ctl && ctl.signal, referrerPolicy: 'no-referrer' }); }
    catch (e) { throw new Error(e && e.name === 'AbortError' ? 'La IA tardó demasiado en responder.' : 'No se pudo conectar (sin red, bloqueo CORS o URL incorrecta).'); }
    finally { if (t) clearTimeout(t); }
    var cuerpo = null; try { cuerpo = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(IA.explicarError(r.status, cuerpo));
    var texto = IA.extraerTexto(cfg.proveedor, cuerpo); return { texto: texto, json: IA.extraerJSON(texto), uso: cuerpo && cuerpo.usage || null };
  };

  /* Limitador de frecuencia y coste. Estado serializable (solo contadores, nunca imagenes). */
  function Limitador(cfg, estado) { this.cfg = cfg; this.e = estado || { llamadas: [], gasto: {}, bloqueado: false }; }
  Limitador.prototype.poner = function (cfg) { this.cfg = cfg; };
  function dia(ms) { return new Date(ms).toISOString().slice(0, 10); }
  IA.costo = function (cfg, nImg) { return (cfg.costoLlamada || 0) + (cfg.costoImagen || 0) * nImg; };
  Limitador.prototype.permitir = function (ahora, nImg) {
    var c = this.cfg, l = this.e.llamadas = this.e.llamadas.filter(function (t) { return ahora - t < 86400000; });
    if (this.e.bloqueado) return { ok: false, motivo: 'Envío pausado por el usuario.' };
    var ult = l[l.length - 1]; if (ult != null && ahora - ult < c.intervaloMin * 1000) return { ok: false, motivo: 'Intervalo mínimo (' + c.intervaloMin + ' s) aún no cumplido.', espera: Math.ceil((c.intervaloMin * 1000 - (ahora - ult)) / 1000) };
    if (l.filter(function (t) { return ahora - t < 3600000; }).length >= c.maxLlamadasHora) return { ok: false, motivo: 'Límite por hora alcanzado (' + c.maxLlamadasHora + ').' };
    if (l.length >= c.maxLlamadasDia) return { ok: false, motivo: 'Límite diario alcanzado (' + c.maxLlamadasDia + ').' };
    var gasto = this.e.gasto[dia(ahora)] || 0; if (gasto + IA.costo(c, nImg || 0) > c.presupuestoDia + 1e-9) return { ok: false, motivo: 'Presupuesto diario estimado agotado (' + gasto.toFixed(3) + ' de ' + c.presupuestoDia + ' USD).' };
    return { ok: true };
  };
  Limitador.prototype.registrar = function (ahora, nImg) { this.e.llamadas.push(ahora); var d = dia(ahora); this.e.gasto[d] = (this.e.gasto[d] || 0) + IA.costo(this.cfg, nImg || 0); var k = Object.keys(this.e.gasto).sort(); while (k.length > 7) delete this.e.gasto[k.shift()]; };
  Limitador.prototype.resumen = function (ahora) { var l = this.e.llamadas.filter(function (t) { return ahora - t < 86400000; }); return { hora: l.filter(function (t) { return ahora - t < 3600000; }).length, dia: l.length, gasto: this.e.gasto[dia(ahora)] || 0 }; };
  IA.Limitador = Limitador;

  /* ---------- prompts y parseo ---------- */
  var SIS = 'Eres un analista de video. Responde siempre en español, de forma breve y factual. Describe solo lo que se ve; si no estás seguro, dilo. No identifiques a personas por su aspecto.';
  IA.sistema = SIS;
  IA.promptEscena = function () { return 'Describe la escena en 2 o 3 frases. Después, en una línea aparte, lista entre corchetes los objetos y personas principales (cantidad aproximada). Responde SOLO con JSON: {"descripcion":"...","objetos":["..."],"personas":0,"ambiente":"..."}'; };
  IA.promptEvento = function (descripcion) { return 'Vigilas la escena para este evento descrito por el usuario: "' + String(descripcion).slice(0, 300) + '". Mira la imagen y decide si el evento está ocurriendo AHORA. Responde SOLO con JSON: {"ocurre":true|false,"confianza":0..1,"descripcion":"qué ves, una frase"}'; };
  IA.promptResumen = function (items, duracion) {
    return 'Estas imágenes son fotogramas clave de un video de ' + Math.round(duracion) + ' s, en orden cronológico; cada una va precedida por su marca de tiempo. Genera un título corto, un resumen de 3 a 5 frases, capítulos con su tiempo en segundos de inicio y entre 5 y 8 hashtags. Responde SOLO con JSON: {"titulo":"...","resumen":"...","capitulos":[{"t":0,"titulo":"..."}],"hashtags":["#..."]}';
  };
  IA.parsearEvento = function (j) { if (!j || typeof j !== 'object') return null; var c = Number(j.confianza); return { ocurre: j.ocurre === true || j.ocurre === 'true' || j.ocurre === 'sí' || j.ocurre === 'si', confianza: isFinite(c) ? Math.max(0, Math.min(1, c)) : null, descripcion: String(j.descripcion || '').slice(0, 300) }; };
  IA.parsearResumen = function (j, dur) {
    if (!j || typeof j !== 'object') return null; var cap = (Array.isArray(j.capitulos) ? j.capitulos : []).map(function (c) { return { t: Math.max(0, Math.min(dur || 1e9, Number(c && c.t) || 0)), titulo: String(c && c.titulo || '').slice(0, 80) }; }).filter(function (c) { return c.titulo; }).sort(function (a, b) { return a.t - b.t; });
    var ht = (Array.isArray(j.hashtags) ? j.hashtags : []).map(function (h) { h = String(h).trim().replace(/\s+/g, ''); return h ? (h[0] === '#' ? h : '#' + h) : ''; }).filter(Boolean).slice(0, 12);
    return { titulo: String(j.titulo || '').slice(0, 120), resumen: String(j.resumen || '').slice(0, 1200), capitulos: cap, hashtags: ht };
  };
  /* capitulos -> texto estilo YouTube (00:00 Titulo) y a items SRT de 3 s */
  IA.capitulosTexto = function (cap) { return cap.map(function (c) { var s = Math.round(c.t); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2) + ' ' + c.titulo; }).join('\n'); };
  return IA;
});
