/* Acciones del navegador y seguridad. window.AutoAcciones.crear(corrida) -> {tipo: fn(cfg, ctx, nodo)}.
   corrida = {flujo, interactivo}. Seguridad: lista de dominios, confirmacion la primera vez por flujo y accion, JS solo en Worker aislado. */
(function (g) {
  'use strict';
  var A = g.AutoApp, D = g.AutoDatos, M = g.AutoMotor, TD = g.TrabajosDispositivos;
  var AC = g.AutoAcciones = { CONFIRMAR: { http: 'envía datos a un servidor', dispositivo: 'escribe en un dispositivo o puente', enlace: 'abre una página web', ia: 'envía texto a un servicio de IA con tu clave', portapapeles: 'cambia tu portapapeles', qr: 'descarga un archivo' } };

  /* ---------- seguridad ---------- */
  async function dominio(c, url) {
    var host = M.hostDe(url); if (!host) throw new Error('URL no válida o con protocolo no permitido (solo http, https, ws y wss): ' + url);
    var aj = D.ajustes(); if (M.hostPermitido(url, aj.dominios)) return;
    if (!c.interactivo) throw new Error('El dominio «' + host + '» no está en la lista permitida. Ejecuta el flujo a mano para aprobarlo o añádelo en Seguridad.');
    var ok = await A.confirmar('¿Permitir el dominio «' + host + '»?', 'El flujo «' + c.flujo.nombre + '» quiere conectarse a ' + host + '. Si lo permites, se añade a la lista de dominios permitidos de este dispositivo.', 'Permitir dominio', 'Bloquear');
    if (!ok) throw new Error('Dominio «' + host + '» bloqueado por ti.');
    aj.dominios.push(host); D.guardarAjustes(aj); A.emitir('ajustes');
  }
  async function confirmar(c, tipo, detalle) {
    if (!AC.CONFIRMAR[tipo]) return;
    var aj = D.ajustes(), k = c.flujo.id + '|' + tipo; if (aj.confirmadas[k]) return;
    if (!c.interactivo) throw new Error('La acción «' + tipo + '» necesita tu aprobación la primera vez: ejecuta este flujo a mano una vez.');
    var ok = await A.confirmar('Primera acción externa de este flujo', '«' + c.flujo.nombre + '» ' + AC.CONFIRMAR[tipo] + '.' + (detalle ? '\n\n' + detalle : '') + '\n\n¿Permitirlo en este flujo de ahora en adelante?', 'Permitir', 'Bloquear');
    if (!ok) throw new Error('Acción «' + tipo + '» bloqueada por ti.');
    aj.confirmadas[k] = Date.now(); D.guardarAjustes(aj); A.emitir('ajustes');
  }
  AC.dominio = dominio; AC.confirmar = confirmar;

  /* ---------- JS en Worker aislado ---------- */
  var CODIGO_WORKER = "var B=['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','indexedDB','caches','BroadcastChannel','SharedWorker','Worker','WebTransport','localStorage','sessionStorage'];" +
    "B.forEach(function(k){var o=self;while(o){try{Object.defineProperty(o,k,{value:undefined,configurable:false,writable:false})}catch(e){}o=Object.getPrototypeOf(o)}});" +
    "var PM=self.postMessage.bind(self);" +
    "self.onmessage=function(e){var d=e.data;Promise.resolve().then(function(){var f=new Function('entrada','vars','ultimo','\"use strict\";'+d.codigo);return f(d.entrada,d.vars,d.ultimo)}).then(function(r){var s;try{s=JSON.stringify(r===undefined?null:r)}catch(x){throw new Error('El resultado no se puede convertir a JSON')}if(s.length>200000)throw new Error('Resultado demasiado grande (>200 KB)');PM({ok:true,r:s})}).catch(function(x){PM({ok:false,e:String(x&&x.message||x)})})};";
  AC.correrJS = function (codigo, datos, limite) {
    limite = Math.max(50, Math.min(5000, Number(limite) || 1000));
    return new Promise(function (ok, ko) {
      var url, w, t;
      try { url = URL.createObjectURL(new Blob([CODIGO_WORKER], { type: 'text/javascript' })); w = new Worker(url); } catch (e) { return ko(new Error('Este navegador no permite Web Workers aquí: ' + e.message)); }
      function fin() { clearTimeout(t); try { w.terminate(); } catch (e) {} URL.revokeObjectURL(url); }
      t = setTimeout(function () { fin(); ko(new Error('Tiempo agotado: el código tardó más de ' + limite + ' ms y se detuvo.')); }, limite);
      w.onmessage = function (e) { fin(); if (e.data.ok) { var v = JSON.parse(e.data.r); ok(v); } else ko(new Error('JavaScript: ' + e.data.e)); };
      w.onerror = function (e) { fin(); ko(new Error('JavaScript: ' + (e.message || 'error en el código'))); };
      try { w.postMessage({ codigo: codigo, entrada: datos.entrada, vars: datos.vars, ultimo: datos.ultimo }); } catch (e) { fin(); ko(new Error('Los datos no se pueden pasar al código: ' + e.message)); }
    });
  };

  /* ---------- sonido ---------- */
  var audio = null;
  AC.pitido = function (patron, f) {
    var C = g.AudioContext || g.webkitAudioContext; if (!C) throw new Error('Este navegador no tiene audio.');
    audio = audio || new C(); if (audio.resume) audio.resume().catch(function () {});
    var seq = { simple: [[f, 0.25]], doble: [[f, 0.15], [0, 0.08], [f, 0.15]], alarma: [[f * 1.5, 0.2], [f, 0.2], [f * 1.5, 0.2], [f, 0.2]], exito: [[f, 0.12], [f * 1.25, 0.12], [f * 1.5, 0.2]] }[patron] || [[f, 0.25]], t = audio.currentTime + 0.02;
    seq.forEach(function (s) { if (s[0]) { var o = audio.createOscillator(), gn = audio.createGain(); o.frequency.value = s[0]; o.type = 'sine'; gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.25, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + s[1]); o.connect(gn); gn.connect(audio.destination); o.start(t); o.stop(t + s[1] + 0.02); } t += s[1]; });
    return audio.state === 'running';
  };

  /* ---------- acciones ---------- */
  function jsonONada(s, que) { if (s == null || String(s).trim() === '') return null; try { return JSON.parse(s); } catch (e) { throw new Error(que + ' no es JSON válido: ' + e.message); } }
  AC.crear = function (c) {
    var acc = {};
    acc.http = async function (cfg, ctx) {
      await dominio(c, cfg.url); await confirmar(c, 'http', (cfg.metodo || 'GET') + ' ' + cfg.url);
      var hd = jsonONada(cfg.cabeceras, 'Las cabeceras') || {}, metodo = (cfg.metodo || 'GET').toUpperCase(), ac = new AbortController(), ms = Math.min(60, Number(cfg.timeout) || 15) * 1000, t = setTimeout(function () { ac.abort(); }, ms), r, texto;
      if (cfg.cuerpo && !hd['Content-Type'] && !hd['content-type'] && /^\s*[\[{]/.test(cfg.cuerpo)) hd['Content-Type'] = 'application/json';
      try { r = await fetch(cfg.url, { method: metodo, headers: hd, body: /^(GET|HEAD)$/.test(metodo) || !cfg.cuerpo ? undefined : cfg.cuerpo, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac.signal }); texto = await r.text(); }
      catch (e) { throw new Error(e.name === 'AbortError' ? 'Tiempo agotado (' + ms / 1000 + ' s).' : 'La petición falló (sin red o el servidor no permite CORS desde esta página).'); }
      finally { clearTimeout(t); }
      if (texto.length > 2000000) texto = texto.slice(0, 2000000);
      var cuerpo = texto; try { cuerpo = JSON.parse(texto); } catch (e) {}
      return { estado: r.status, ok: r.ok, cuerpo: cuerpo, texto: texto, valor: cuerpo };
    };
    acc.dispositivo = async function (cfg) {
      if (!TD) throw new Error('El panel de dispositivos no está cargado.');
      var cx = TD.listar(cfg.tipo).filter(function (x) { return x.estado === 'conectado'; })[0];
      if (cfg.tipo === 'puente' && !cx) { await dominio(c, cfg.url); }
      await confirmar(c, 'dispositivo', cfg.tipo + ': ' + String(cfg.datos).slice(0, 120));
      if (!cx) { if (cfg.tipo !== 'puente') throw new Error('No hay un dispositivo «' + cfg.tipo + '» conectado. Conéctalo en el panel de dispositivos.'); cx = await TD.conectar('puente', { url: cfg.url, reconectar: true }); cx = cx.resumen(); }
      var datos = cfg.json ? jsonONada(cfg.datos, 'Los datos') : cfg.datos;
      await TD.enviar(cx.id, datos); return { conexion: cx.id, enviado: datos, valor: datos };
    };
    acc.notificacion = async function (cfg) {
      var perm = typeof Notification === 'undefined' ? 'no-soportado' : Notification.permission;
      if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch (e) {} }
      if (perm === 'granted') {
        try { var reg = navigator.serviceWorker && navigator.serviceWorker.getRegistration && await navigator.serviceWorker.getRegistration(); if (reg && reg.showNotification) await reg.showNotification(cfg.titulo || 'Automatización', { body: cfg.texto, tag: 'auto-' + c.flujo.id }); else new Notification(cfg.titulo || 'Automatización', { body: cfg.texto }); return { mostrada: true, valor: cfg.texto }; }
        catch (e) { /* cae al aviso en pantalla */ }
      }
      A.aviso((cfg.titulo ? cfg.titulo + ': ' : '') + cfg.texto); return { mostrada: false, motivo: perm === 'granted' ? 'error' : 'permiso ' + perm + ' (se mostró un aviso en pantalla)', valor: cfg.texto };
    };
    acc.voz = async function (cfg) {
      if (!g.speechSynthesis || !g.SpeechSynthesisUtterance) throw new Error('Este navegador no tiene síntesis de voz.');
      var u = new g.SpeechSynthesisUtterance(String(cfg.texto)); u.lang = cfg.idioma || 'es-ES'; g.speechSynthesis.speak(u); return { hablado: true, valor: cfg.texto };
    };
    acc.sonido = async function (cfg) { return { sonando: AC.pitido(cfg.patron, Math.max(100, Number(cfg.frecuencia) || 660)), valor: cfg.patron }; };
    acc.portapapeles = async function (cfg) {
      await confirmar(c, 'portapapeles', String(cfg.texto).slice(0, 100));
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Este navegador no permite copiar desde aquí.');
      try { await navigator.clipboard.writeText(String(cfg.texto)); } catch (e) { throw new Error('El navegador no permitió copiar (necesita la pestaña activa y un gesto del usuario).'); }
      return { copiado: true, valor: cfg.texto };
    };
    acc.almacen = async function (cfg, ctx) {
      var raw = M.evaluar(cfg.valor, ctx), v = await D.almacenSet(String(cfg.clave).trim(), typeof raw === 'string' && /^\s*[\[{]/.test(raw) ? (function () { try { return JSON.parse(raw); } catch (e) { return raw; } })() : raw, cfg.modo);
      ctx.almacen[cfg.clave] = v; return { clave: cfg.clave, valor: v };
    };
    acc.qr = async function (cfg) {
      if (!g.QRCodificador || !g.QRRender) throw new Error('El módulo QR no está cargado.');
      if (!String(cfg.texto)) throw new Error('El contenido del QR está vacío.');
      if (cfg.descargar) await confirmar(c, 'qr', 'Descargar «' + (cfg.nombre || 'qr') + '.png»');
      var qr = g.QRCodificador.codificar(String(cfg.texto), { ecc: cfg.ecc || 'M' }), svg = g.QRRender.svg(qr, {}, null), out = { svg: svg, valor: svg, modulos: qr.n || undefined };
      if (cfg.descargar) { var b = await g.QRRender.png(qr, {}, 512); g.Tr.descargar(b, g.Tr.nombreArchivo(cfg.nombre || 'qr') + '.png'); out.descargado = true; }
      return out;
    };
    acc.enlace = async function (cfg) {
      await dominio(c, cfg.url); await confirmar(c, 'enlace', cfg.url);
      var a = document.createElement('a'); a.href = cfg.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove(); return { abierto: cfg.url, valor: cfg.url };
    };
    acc.ia = async function (cfg, ctx) {
      var an = cfg.proveedor !== 'openai', url = an ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions', nombre = an ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY', clave = ctx.secreto[nombre];
      if (!clave) throw new Error('Falta tu clave: añade el secreto ' + nombre + ' en Seguridad (se guarda solo en este dispositivo).');
      await dominio(c, url); await confirmar(c, 'ia', 'Proveedor: ' + (an ? 'Anthropic' : 'OpenAI') + ', modelo ' + cfg.modelo);
      var cab = { 'Content-Type': 'application/json' }, cuerpo, ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, 60000), r, j;
      if (an) { cab['x-api-key'] = clave; cab['anthropic-version'] = '2023-06-01'; cab['anthropic-dangerous-direct-browser-access'] = 'true'; cuerpo = { model: cfg.modelo, max_tokens: Number(cfg.maxTokens) || 400, messages: [{ role: 'user', content: String(cfg.prompt) }] }; if (cfg.sistema) cuerpo.system = cfg.sistema; }
      else { cab.Authorization = 'Bearer ' + clave; cuerpo = { model: cfg.modelo, max_tokens: Number(cfg.maxTokens) || 400, messages: (cfg.sistema ? [{ role: 'system', content: cfg.sistema }] : []).concat([{ role: 'user', content: String(cfg.prompt) }]) }; }
      try { r = await fetch(url, { method: 'POST', headers: cab, body: JSON.stringify(cuerpo), credentials: 'omit', referrerPolicy: 'no-referrer', signal: ac.signal }); j = await r.json(); }
      catch (e) { throw new Error(e.name === 'AbortError' ? 'La IA tardó más de 60 s.' : 'No se pudo contactar con la IA (red o CORS).'); } finally { clearTimeout(t); }
      if (!r.ok) throw new Error('La IA respondió ' + r.status + ': ' + ((j.error && (j.error.message || j.error)) || 'error'));
      var txt = an ? (j.content || []).map(function (x) { return x.text || ''; }).join('') : j.choices[0].message.content; return { texto: txt, valor: txt };
    };
    acc.js = async function (cfg, ctx, nodo) {
      var codigo = nodo.cfg.codigo; var r = await AC.correrJS(codigo, { entrada: ctx.entrada, vars: ctx.vars, ultimo: ctx.ultimo }, cfg.limite);
      if (r && typeof r === 'object' && !Array.isArray(r)) return r.valor === undefined ? Object.assign({ valor: r }, r) : r; return { valor: r };
    };
    return acc;
  };
})(window);
