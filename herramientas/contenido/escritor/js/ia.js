/* Capa comun de IA llamada directo desde el navegador con la clave del usuario: Anthropic, OpenAI, Gemini.
   generar({proveedor, clave, modelo, sistema, mensajes:[{rol,texto}], onToken, signal, stream, reintentos, maxTokens, temperatura}) */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.IA = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var PROVEEDORES = {
    anthropic: { nombre: 'Anthropic (Claude)', ejemplo: 'claude-sonnet-4-5', url: 'https://api.anthropic.com/v1/messages', consola: 'console.anthropic.com' },
    openai: { nombre: 'OpenAI', ejemplo: 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions', consola: 'platform.openai.com' },
    gemini: { nombre: 'Google Gemini', ejemplo: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta/models/', consola: 'aistudio.google.com' }
  };
  function ErrorIA(tipo, mensaje, extra) {
    var e = new Error(mensaje); e.name = 'ErrorIA'; e.tipo = tipo; e.reintentable = false;
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function estimarTokens(t) { return Math.ceil((t || '').length / 4); }
  function costo(uso, tarifa) {
    if (!tarifa || (!(tarifa.entrada > 0) && !(tarifa.salida > 0))) return null;
    return ((uso.entrada || 0) * (tarifa.entrada || 0) + (uso.salida || 0) * (tarifa.salida || 0)) / 1e6;
  }

  function preparar(p, o) {
    var msgs = o.mensajes || [], cfg = PROVEEDORES[p], stream = o.stream !== false;
    var base = o.base || cfg.url, h = { 'content-type': 'application/json' }, cuerpo, url = base;
    if (p === 'anthropic') {
      h['x-api-key'] = o.clave; h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true';
      cuerpo = { model: o.modelo, max_tokens: o.maxTokens || 2048, stream: stream,
        messages: msgs.map(function (m) { return { role: m.rol, content: m.texto }; }) };
      if (o.sistema) cuerpo.system = o.sistema;
      if (o.temperatura != null) cuerpo.temperature = o.temperatura;
    } else if (p === 'openai') {
      h.authorization = 'Bearer ' + o.clave;
      var ms = (o.sistema ? [{ role: 'system', content: o.sistema }] : []).concat(msgs.map(function (m) { return { role: m.rol, content: m.texto }; }));
      cuerpo = { model: o.modelo, messages: ms, stream: stream };
      cuerpo[o.usarMaxTokens ? 'max_tokens' : 'max_completion_tokens'] = o.maxTokens || 2048;
      if (stream) cuerpo.stream_options = { include_usage: true };
      if (o.temperatura != null) cuerpo.temperature = o.temperatura;
    } else if (p === 'gemini') {
      h['x-goog-api-key'] = o.clave;
      url = o.base || (cfg.url + encodeURIComponent(o.modelo) + (stream ? ':streamGenerateContent?alt=sse' : ':generateContent'));
      cuerpo = { contents: msgs.map(function (m) { return { role: m.rol === 'assistant' ? 'model' : 'user', parts: [{ text: m.texto }] }; }),
        generationConfig: { maxOutputTokens: o.maxTokens || 2048 } };
      if (o.sistema) cuerpo.systemInstruction = { parts: [{ text: o.sistema }] };
      if (o.temperatura != null) cuerpo.generationConfig.temperature = o.temperatura;
    } else throw ErrorIA('solicitud', 'Proveedor desconocido: ' + p);
    return { url: url, init: { method: 'POST', headers: h, body: JSON.stringify(cuerpo) } };
  }

  function textoGemini(d) {
    var c = d.candidates && d.candidates[0], ps = (c && c.content && c.content.parts) || [];
    return ps.map(function (x) { return x.text || ''; }).join('');
  }
  /* Interpreta un evento/objeto de proveedor -> {texto, entrada, salida, error} */
  function interpretar(p, d) {
    var r = {};
    if (p === 'anthropic') {
      if (d.type === 'message_start' && d.message && d.message.usage) r.entrada = d.message.usage.input_tokens;
      else if (d.type === 'content_block_delta' && d.delta && d.delta.text) r.texto = d.delta.text;
      else if (d.type === 'message_delta' && d.usage) r.salida = d.usage.output_tokens;
      else if (d.type === 'error') r.error = (d.error && d.error.message) || 'Error del proveedor';
    } else if (p === 'openai') {
      var ch = d.choices && d.choices[0];
      if (ch && ch.delta && ch.delta.content) r.texto = ch.delta.content;
      if (d.usage) { r.entrada = d.usage.prompt_tokens; r.salida = d.usage.completion_tokens; }
      if (d.error) r.error = d.error.message || 'Error del proveedor';
    } else {
      var t = textoGemini(d); if (t) r.texto = t;
      if (d.usageMetadata) { r.entrada = d.usageMetadata.promptTokenCount; r.salida = d.usageMetadata.candidatesTokenCount; }
      if (d.promptFeedback && d.promptFeedback.blockReason) r.error = 'Contenido bloqueado por el proveedor: ' + d.promptFeedback.blockReason;
      if (d.error) r.error = d.error.message || 'Error del proveedor';
    }
    return r;
  }
  function completo(p, d) {
    var r = interpretar(p, d);
    if (p === 'anthropic') { r.texto = (d.content || []).map(function (c) { return c.text || ''; }).join(''); if (d.usage) { r.entrada = d.usage.input_tokens; r.salida = d.usage.output_tokens; } }
    if (p === 'openai') { var c = d.choices && d.choices[0]; r.texto = (c && c.message && c.message.content) || ''; }
    return r;
  }

  async function leerSSE(body, alEvento, signal) {
    var rd = body.getReader(), dec = new TextDecoder(), buf = '';
    function proc(bloque) {
      var ev = '', datos = [];
      bloque.split(/\r?\n/).forEach(function (l) {
        if (l.indexOf('event:') === 0) ev = l.slice(6).trim();
        else if (l.indexOf('data:') === 0) datos.push(l.slice(5).replace(/^ /, ''));
      });
      if (datos.length) alEvento(ev, datos.join('\n'));
    }
    for (;;) {
      if (signal && signal.aborted) { try { rd.cancel().catch(function () {}); } catch (e) {} throw ErrorIA('cancelado', 'Generación cancelada'); }
      var r = await rd.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var partes = buf.split(/\r?\n\r?\n/); buf = partes.pop();
      partes.forEach(proc);
    }
    buf += dec.decode(); if (buf.trim()) proc(buf);
  }

  function errorHttp(status, texto, resp) {
    var msg = texto;
    try { var j = JSON.parse(texto); msg = (j.error && (j.error.message || j.error)) || j.message || texto; if (typeof msg !== 'string') msg = JSON.stringify(msg); } catch (e) {}
    msg = String(msg || '').slice(0, 300);
    var ra = resp && resp.headers && resp.headers.get && parseFloat(resp.headers.get('retry-after'));
    if (status === 401 || status === 403) return ErrorIA('clave', 'Clave rechazada (' + status + '). Revisa que sea válida, tenga permisos y saldo. ' + msg, { status: status });
    if (status === 429) return ErrorIA('limite', 'Límite de uso o de velocidad alcanzado (429). Espera un momento o revisa tu cuota. ' + msg, { status: status, reintentable: true, retryAfter: ra > 0 ? ra : 0 });
    if (status === 404) return ErrorIA('modelo', 'Modelo o dirección no encontrados (404). Revisa el nombre exacto del modelo. ' + msg, { status: status });
    if (status >= 500 || status === 529) return ErrorIA('servidor', 'El proveedor tiene un problema temporal (' + status + '). ' + msg, { status: status, reintentable: true, retryAfter: ra > 0 ? ra : 0 });
    return ErrorIA('solicitud', 'Solicitud rechazada (' + status + '). ' + msg, { status: status });
  }

  async function una(p, o, estado) {
    var f = o.fetch || g.fetch.bind(g), pr = preparar(p, o), resp;
    pr.init.signal = o.signal;
    try { resp = await f(pr.url, pr.init); }
    catch (e) {
      if (e && e.name === 'AbortError' || (o.signal && o.signal.aborted)) throw ErrorIA('cancelado', 'Generación cancelada');
      throw ErrorIA('cors', 'No se pudo conectar con el proveedor: sin conexión, bloqueo CORS/extensión del navegador o dirección incorrecta.', { reintentable: true });
    }
    if (!resp.ok) throw errorHttp(resp.status, await resp.text().catch(function () { return ''; }), resp);
    var texto = '', uso = {};
    function aplicar(r) {
      if (r.error) throw ErrorIA('servidor', r.error);
      if (r.entrada != null) uso.entrada = r.entrada;
      if (r.salida != null) uso.salida = r.salida;
      if (r.texto) { texto += r.texto; estado.emitido += r.texto.length; if (o.onToken) o.onToken(r.texto, texto); }
    }
    try {
      if (o.stream !== false && resp.body && resp.body.getReader) {
        await leerSSE(resp.body, function (ev, data) {
          if (data === '[DONE]') return;
          var d; try { d = JSON.parse(data); } catch (e) { return; }
          aplicar(interpretar(p, d));
        }, o.signal);
      } else {
        aplicar(completo(p, await resp.json()));
      }
    } catch (e) {
      if (e.name !== 'ErrorIA') {
        if (e.name === 'AbortError' || (o.signal && o.signal.aborted)) e = ErrorIA('cancelado', 'Generación cancelada');
        else e = ErrorIA('red', 'Se interrumpió la conexión durante la respuesta.');
      }
      e.parcial = texto; throw e;
    }
    if (!texto.trim()) throw ErrorIA('vacio', 'El proveedor devolvió una respuesta vacía.');
    var est = uso.entrada == null || uso.salida == null;
    var ent = uso.entrada != null ? uso.entrada : estimarTokens((o.sistema || '') + (o.mensajes || []).map(function (m) { return m.texto; }).join('\n'));
    return { texto: texto, uso: { entrada: ent, salida: uso.salida != null ? uso.salida : estimarTokens(texto), estimado: est }, proveedor: p, modelo: o.modelo };
  }

  function dormir(ms, signal) {
    return new Promise(function (ok, ko) {
      var t = setTimeout(ok, ms);
      if (signal) signal.addEventListener('abort', function () { clearTimeout(t); ko(ErrorIA('cancelado', 'Generación cancelada')); }, { once: true });
    });
  }
  async function generar(o) {
    o = Object.assign({}, o);
    if (!o.clave) throw ErrorIA('clave', 'Falta la clave de API.');
    if (!o.modelo) throw ErrorIA('modelo', 'Escribe el nombre del modelo.');
    var max = o.reintentos == null ? 2 : o.reintentos, sl = o.sleep || dormir, estado = { emitido: 0 }, extra = 0;
    for (var i = 0; ; i++) {
      try { return await una(o.proveedor, o, estado); }
      catch (e) {
        if (e.tipo === 'solicitud' && extra < 2) {
          if (/temperature/i.test(e.message) && o.temperatura != null) { o.temperatura = null; extra++; i--; continue; }
          if (/max_completion_tokens|max_tokens/i.test(e.message) && o.proveedor === 'openai') { o.usarMaxTokens = !o.usarMaxTokens; extra++; i--; continue; }
        }
        if (!e.reintentable || i >= max || estado.emitido > 0 || (o.signal && o.signal.aborted)) throw e;
        var espera = e.retryAfter ? e.retryAfter * 1000 : Math.min((o.backoff || 800) * Math.pow(2, i), 8000);
        if (o.onReintento) o.onReintento(i + 1, espera, e);
        await sl(espera, o.signal);
      }
    }
  }
  return { PROVEEDORES: PROVEEDORES, generar: generar, preparar: preparar, estimarTokens: estimarTokens, costo: costo, leerSSE: leerSSE, ErrorIA: ErrorIA };
});
