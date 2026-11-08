/* Vista «IA»: clave propia (solo en el dispositivo), consentimiento, descripcion de escena, vigilancia por lenguaje natural,
   resumen/capitulos/hashtags de un video y voz en vivo (SpeechRecognition si existe). window.VIAUI */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, h = T.h, IA = g.VIA, D = g.VDatos, A = g.VAnalisis, U = g.VIAUI = {}, el = {}, cfg, lim, ocupado = false, mon = null, rr = 0, ultMov = 0, rec = null, resumen = null;
  function guardarCfg() { D.guardarAjustes(cfg); lim.poner(cfg); }
  function limGuardar() { D.guardarLimitador(lim.e); pintarUso(); }
  U.enviando = function () { return !!mon || ocupado; };
  function pintarUso() { if (!el.uso) return; var r = lim.resumen(Date.now()); el.uso.textContent = 'Uso (ventana móvil): ' + r.hora + ' llamadas en la última hora, ' + r.dia + ' en 24 h · gasto estimado hoy ' + r.gasto.toFixed(3) + ' de ' + cfg.presupuestoDia + ' USD (estimación propia, no la factura real).'; }
  function estado(t, tipo) { el.est.textContent = t; el.est.className = 'tr-nota' + (tipo ? ' tr-' + tipo : ''); el.est.hidden = !t; }
  function destino() { try { return new URL(cfg.base).host; } catch (e) { return cfg.base; } }

  function fotograma(ancho, calidad, t) {
    var v = V.fuente && V.fuente.video; if (!v || !v.videoWidth) throw new Error('No hay imagen: abre una fuente en «En vivo».');
    var w = Math.min(ancho || cfg.anchoEnvio, v.videoWidth), hh = Math.round(w * v.videoHeight / v.videoWidth), c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(v, 0, 0, w, hh);
    var url = c.toDataURL('image/jpeg', calidad || cfg.calidadJpeg); return { b64: url.split(',')[1], mime: 'image/jpeg', url: url, t: t == null ? V.reloj() : t, kb: Math.round(url.length * 0.75 / 1024) };
  }
  function irA(t) { var v = V.fuente.video; return new Promise(function (ok) { var f = function () { v.removeEventListener('seeked', f); setTimeout(ok, 60); }; v.addEventListener('seeked', f); v.currentTime = Math.max(0, Math.min(v.duration || t, t)); setTimeout(function () { v.removeEventListener('seeked', f); ok(); }, 4000); });
  }
  /* Ventana de confirmacion: muestra EXACTAMENTE lo que saldra del dispositivo */
  function confirmarEnvio(imgs, resumenTxt) {
    return new Promise(function (ok) {
      var d = h('dialog', { cls: 'cc-dlg vi-dlg', 'aria-label': 'Confirmar envío a la IA' }); var fin = function (r) { d.close(); d.remove(); ok(r); };
      d.appendChild(h('div', { cls: 'vi-dlg-c' }, [h('h2', { txt: 'Se enviará a ' + destino() }), h('p', { txt: resumenTxt }), h('div', { cls: 'vi-galeria' }, imgs.map(function (i) { return h('figure', {}, [h('img', { src: i.url, alt: 'Fotograma a enviar' }), h('figcaption', { txt: V.fmt(i.t) + ' · ' + i.kb + ' KB' })]); })), h('p', { cls: 'tr-ayuda', txt: 'Tu clave se usa solo desde este navegador. El proveedor recibirá estas imágenes y su política de datos aplica.' }),
        h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Enviar', on: { click: function () { fin(true); } } }), h('button', { type: 'button', cls: 'tr-btn', txt: 'Cancelar', on: { click: function () { fin(false); } } })])]));
      d.addEventListener('cancel', function (e) { e.preventDefault(); fin(false); }); document.body.appendChild(d); d.showModal();
    });
  }
  async function llamar(p, nImg) {
    if (!V.consentimiento) throw new Error('Marca primero el consentimiento de envío.');
    var perm = lim.permitir(Date.now(), nImg); if (!perm.ok) throw new Error(perm.motivo);
    ocupado = true; if (g.VVivo) g.VVivo.insignias(); lim.registrar(Date.now(), nImg); limGuardar();
    try { return await IA.consultar(cfg, D.clave(), Object.assign({ sistema: IA.sistema }, p)); } finally { ocupado = false; if (g.VVivo) g.VVivo.insignias(); }
  }

  /* ---------- descripcion ahora ---------- */
  function sinConsentimiento() { if (V.consentimiento) return false; estado('Marca primero el consentimiento de envío.', 'mal'); return true; }
  async function describirAhora() {
    if (sinConsentimiento()) return;
    try {
      var im = fotograma(); if (!(await confirmarEnvio([im], 'Descripción de la escena actual (1 fotograma).'))) return; estado('Consultando…');
      var r = await llamar({ texto: IA.promptEscena(), imagenes: [im], maxTokens: 500 }, 1), j = r.json || {};
      el.res.textContent = ''; el.res.appendChild(h('div', { cls: 'tr-nota tr-ok' }, [h('b', { txt: 'Descripción: ' }), j.descripcion || r.texto || '(sin respuesta)', j.objetos && j.objetos.length ? h('p', { txt: 'Objetos: ' + j.objetos.join(', ') + (j.personas != null ? ' · personas: ' + j.personas : '') }) : null])); estado('');
      V.evento({ t: V.reloj(), tipo: 'ia_evento', valor: 1, texto: 'Escena: ' + (j.descripcion || r.texto || '').slice(0, 140) });
    } catch (e) { estado(e.message, 'mal'); }
  }

  /* ---------- vigilancia en lenguaje natural ---------- */
  function movReciente() { return Date.now() - ultMov < 6000; }
  V.on('evento', function (e) { if (e.tipo === 'movimiento' || e.tipo === 'objeto_nuevo' || e.tipo === 'cruce_linea') ultMov = Date.now(); });
  V.on('resultado', function (r) { if (r.mov && r.mov.estado) ultMov = Date.now(); });
  async function tick() {
    if (ocupado || !V.fuente || !V.consentimiento) return; var act = (V.cfg.vigilancias || []).filter(function (w) { return w.activo; }); if (!act.length) return;
    if (cfg.soloConMovimiento && !movReciente()) { el.monEst.textContent = 'En espera: no hay movimiento reciente (así no se gasta en escenas quietas).'; return; }
    if (!lim.permitir(Date.now(), 1).ok) { el.monEst.textContent = 'En pausa: ' + lim.permitir(Date.now(), 1).motivo; return; }
    var w = act[rr++ % act.length];
    try {
      var im = fotograma(); el.monEst.textContent = 'Consultando: «' + w.texto + '»…';
      var r = await llamar({ texto: IA.promptEvento(w.texto), imagenes: [im], maxTokens: 250 }, 1), j = IA.parsearEvento(r.json);
      if (!j) { el.monEst.textContent = 'La IA no devolvió un JSON válido.'; return; }
      el.monEst.textContent = 'Última: «' + w.texto + '» → ' + (j.ocurre ? 'SÍ' : 'no') + (j.confianza != null ? ' (' + Math.round(j.confianza * 100) + ' %)' : '') + ' · ' + j.descripcion;
      if (j.ocurre && (j.confianza == null || j.confianza >= 0.5)) V.evento({ t: V.reloj(), tipo: 'ia_evento', valor: j.confianza == null ? 1 : j.confianza, texto: w.texto + ' — ' + j.descripcion, watch: w.id });
    } catch (e) { el.monEst.textContent = 'Error: ' + e.message; if (/clave|límite|Presupuesto/.test(e.message)) detener(); }
  }
  function iniciarVig() {
    if (!V.consentimiento) { estado('Marca el consentimiento antes de iniciar la vigilancia.', 'mal'); return; } if (!D.clave()) { estado('Guarda tu clave de API primero.', 'mal'); return; } if (!V.fuente) { estado('Abre una fuente en «En vivo».', 'mal'); return; }
    if (mon) return; mon = setInterval(tick, 1000); el.btnMon.textContent = 'Detener vigilancia por IA'; el.btnMon.classList.add('tr-peli'); el.monEst.textContent = 'Vigilancia activa.'; if (g.VVivo) g.VVivo.insignias();
  }
  function detener() { if (mon) clearInterval(mon); mon = null; if (el.btnMon) { el.btnMon.textContent = 'Iniciar vigilancia por IA'; el.btnMon.classList.remove('tr-peli'); el.monEst.textContent = 'Vigilancia detenida.'; } if (g.VVivo) g.VVivo.insignias(); }
  U.detener = detener;

  /* ---------- resumen de video ---------- */
  async function resumirVideo() {
    if (sinConsentimiento()) return; var f = V.fuente; if (!f || !f.video.duration || !isFinite(f.video.duration)) { estado('Abre un archivo de video en «En vivo» para resumirlo.', 'mal'); return; }
    var v = f.video, dur = v.duration, n = +el.nFr.value, t0 = v.currentTime, pausado = v.paused; v.pause();
    try {
      var tiempos = []; var cortes = (V.analisisArchivo && V.analisisArchivo.muestras ? V.analisisArchivo.muestras.filter(function (m) { return m.corte; }).map(function (m) { return m.t; }) : []);
      for (var i = 0; i < n; i++) tiempos.push((i + 0.5) * dur / n); if (el.estr.value === 'cortes' && cortes.length) { cortes.slice(0, Math.floor(n / 2)).forEach(function (c, k) { tiempos[k * 2 + 1 < n ? k * 2 + 1 : n - 1] = Math.min(dur - 0.1, c + 0.3); }); tiempos.sort(function (a, b) { return a - b; }); }
      estado('Extrayendo ' + n + ' fotogramas…'); var imgs = []; for (var k = 0; k < tiempos.length; k++) { await irA(tiempos[k]); imgs.push(fotograma(cfg.anchoEnvio, cfg.calidadJpeg, v.currentTime)); }
      var okc = await confirmarEnvio(imgs, 'Resumen de «' + f.nombre + '» con ' + imgs.length + ' fotogramas (coste estimado ' + IA.costo(cfg, imgs.length).toFixed(3) + ' USD).'); if (!okc) { estado(''); return; }
      estado('Consultando…'); var r = await llamar({ texto: IA.promptResumen(imgs, dur), imagenes: imgs.map(function (i) { return { b64: i.b64, mime: i.mime, etiqueta: 't = ' + Math.round(i.t) + ' s' }; }), maxTokens: 1200 }, imgs.length);
      var s = IA.parsearResumen(r.json, dur); if (!s) throw new Error('La IA no devolvió un resumen en el formato esperado.'); resumen = s; V.resumenIA = s; pintarResumen(); estado(''); V.emitir('resumen', s);
    } catch (e) { estado(e.message, 'mal'); } finally { await irA(t0); if (!pausado) v.play().catch(function () {}); }
  }
  function pintarResumen() {
    var s = resumen, c = el.resumen; c.textContent = ''; if (!s) return;
    var txt = s.titulo + '\n\n' + s.resumen + '\n\nCapítulos:\n' + IA.capitulosTexto(s.capitulos) + '\n\n' + s.hashtags.join(' ');
    c.appendChild(h('div', { cls: 'tr-nota tr-ok' }, [h('h3', { txt: s.titulo || 'Sin título' }), h('p', { txt: s.resumen }),
      s.capitulos.length ? h('ol', { cls: 'vi-cap' }, s.capitulos.map(function (k) { return h('li', {}, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: V.fmt(k.t), on: { click: function () { if (V.fuente) V.fuente.video.currentTime = k.t; } } }), ' ' + k.titulo]); })) : null, h('p', { cls: 'vi-tags', txt: s.hashtags.join(' ') }),
      h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Copiar texto', on: { click: function () { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { T.aviso('Copiado.'); }, function () { T.aviso('No se pudo copiar.', 'error'); }); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Descargar .txt', on: { click: function () { T.descargar(new Blob([txt], { type: 'text/plain' }), 'resumen.txt'); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Capítulos como cortes', on: { click: function () { V.emitir('capitulos', s.capitulos); T.aviso('Capítulos enviados a la pestaña Edición.'); } } })])]));
  }

  /* ---------- voz ---------- */
  function iniciarVoz() {
    var SR = g.SpeechRecognition || g.webkitSpeechRecognition; if (!SR) { estado('Este navegador no ofrece reconocimiento de voz (no se transcribe nada).', 'mal'); return; }
    if (rec) { rec.parar = true; rec.r.stop(); rec = null; el.btnVoz.textContent = 'Transcribir voz en vivo'; el.btnVoz.classList.remove('tr-peli'); pintarVoz(); return; }
    var r = new SR(); r.lang = el.idioma.value; r.continuous = true; r.interimResults = false; rec = { r: r, parar: false };
    r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { var tx = e.results[i][0].transcript.trim(); if (!tx) continue; var t = V.reloj(); V.transcripcion.push({ ini: Math.max(0, t - 2.5), fin: t + 0.5, texto: tx }); V.evento({ t: t, tipo: 'habla', valor: 1, texto: tx }); pintarVoz(); } };
    r.onend = function () { if (rec && !rec.parar) { try { r.start(); } catch (e) {} } }; r.onerror = function (e) { if (e.error === 'not-allowed') { estado('Permiso de micrófono denegado.', 'mal'); rec = null; el.btnVoz.textContent = 'Transcribir voz en vivo'; } };
    try { r.start(); el.btnVoz.textContent = 'Detener transcripción'; el.btnVoz.classList.add('tr-peli'); } catch (e) { rec = null; estado(e.message, 'mal'); }
  }
  function pintarVoz() { el.voz.textContent = ''; V.transcripcion.slice(-8).forEach(function (t) { el.voz.appendChild(h('li', {}, [h('time', { txt: V.fmt(t.ini) }), t.texto])); }); el.btnSrt.disabled = !V.transcripcion.length; }

  U.iniciar = function (cont) {
    cfg = V.ajustes = D.ajustes(); lim = new IA.Limitador(cfg, D.estadoLimitador());
    el.est = h('div', { cls: 'tr-nota', hidden: true, role: 'status' }); el.uso = h('p', { cls: 'tr-ayuda' }); el.res = h('div', {}); el.monEst = h('p', { cls: 'tr-ayuda', role: 'status', txt: 'Vigilancia detenida.' }); el.resumen = h('div', {});
    function campo(id, etq, tipo, k, extra) { var i = h('input', Object.assign({ type: tipo, id: 'ia-' + id }, extra || {})); i.value = cfg[k]; i.addEventListener('change', function () { cfg[k] = tipo === 'number' ? +i.value : i.value; guardarCfg(); pintarUso(); }); return h('div', {}, [h('label', { for: 'ia-' + id, txt: etq }), i]); }
    var prov = h('select', { id: 'ia-prov' }, Object.keys(IA.PROVEEDORES).map(function (k) { return h('option', { value: k, txt: IA.PROVEEDORES[k].nombre }); })); prov.value = cfg.proveedor;
    var base = campo('base', 'URL base de la API', 'url', 'base'), modelo = campo('modelo', 'Modelo (con visión)', 'text', 'modelo');
    prov.addEventListener('change', function () { cfg.proveedor = prov.value; cfg.base = IA.PROVEEDORES[prov.value].base; cfg.modelo = IA.PROVEEDORES[prov.value].modelo; base.querySelector('input').value = cfg.base; modelo.querySelector('input').value = cfg.modelo; guardarCfg(); });
    var clave = h('input', { type: 'password', id: 'ia-clave', autocomplete: 'off', placeholder: D.clave() ? '•••••••• (guardada en este dispositivo)' : 'pega tu clave de API', spellcheck: 'false' });
    var bg = h('button', { type: 'button', cls: 'tr-btn', txt: 'Guardar clave', on: { click: function () { if (!clave.value.trim()) return; D.guardarClave(clave.value.trim()); clave.value = ''; clave.placeholder = '•••••••• (guardada en este dispositivo)'; T.aviso('Clave guardada solo en este dispositivo.'); } } });
    var bb = h('button', { type: 'button', cls: 'tr-btn tr-peli', txt: 'Borrar clave', on: { click: function () { D.guardarClave(null); clave.placeholder = 'pega tu clave de API'; T.aviso('Clave borrada.'); } } });
    var bp = h('button', { type: 'button', cls: 'tr-btn', txt: 'Probar conexión (solo texto)', on: { click: async function () { try { estado('Probando…'); var r = await llamar({ texto: 'Responde solo con la palabra OK.', maxTokens: 20 }, 0); estado('Conexión correcta: «' + r.texto.trim().slice(0, 40) + '»', 'ok'); } catch (e) { estado(e.message, 'mal'); } } } });
    var cons = h('input', { type: 'checkbox', id: 'ia-cons' }); cons.addEventListener('change', function () { V.consentimiento = cons.checked; if (!cons.checked) detener(); });
    var soloMov = h('input', { type: 'checkbox', id: 'ia-mov' }); soloMov.checked = cfg.soloConMovimiento; soloMov.addEventListener('change', function () { cfg.soloConMovimiento = soloMov.checked; guardarCfg(); });
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Clave y proveedor' }), h('p', { cls: 'tr-sub', txt: 'Tu propia clave de API. Se guarda solo en este dispositivo (nunca se sincroniza con tu cuenta) y se envía únicamente al proveedor que configures. Sin clave, todo el análisis clásico funciona igual.' }), h('label', { for: 'ia-prov', txt: 'Proveedor' }), prov, base, modelo, h('label', { for: 'ia-clave', txt: 'Clave de API' }), clave, h('div', { cls: 'tr-acciones' }, [bg, bb, bp]),
      h('p', { cls: 'tr-ayuda', txt: 'Anthropic: la API admite llamadas desde el navegador con la cabecera especial que este módulo envía. Compatible OpenAI: el servidor debe permitir CORS (por ejemplo un proxy propio).' }), el.est]));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Límites de coste y frecuencia' }), h('div', { cls: 'tr-fila' }, [campo('int', 'Intervalo mínimo entre envíos (s)', 'number', 'intervaloMin', { min: 1, max: 3600 }), campo('hora', 'Máx. llamadas por hora', 'number', 'maxLlamadasHora', { min: 1, max: 1000 }), campo('dia', 'Máx. llamadas por día', 'number', 'maxLlamadasDia', { min: 1, max: 5000 })]), h('div', { cls: 'tr-fila' }, [campo('pres', 'Presupuesto diario (USD)', 'number', 'presupuestoDia', { min: 0, step: 0.05 }), campo('cll', 'Coste estimado por llamada', 'number', 'costoLlamada', { min: 0, step: 0.001 }), campo('cim', 'Coste estimado por imagen', 'number', 'costoImagen', { min: 0, step: 0.001 })]), h('div', { cls: 'tr-fila' }, [campo('ancho', 'Ancho del fotograma enviado (px)', 'number', 'anchoEnvio', { min: 256, max: 1280, step: 32 }), campo('jpeg', 'Calidad JPEG (0.3–0.9)', 'number', 'calidadJpeg', { min: 0.3, max: 0.9, step: 0.05 })]), h('label', { cls: 'tr-chk', for: 'ia-mov' }, [soloMov, 'Solo enviar si hay movimiento reciente']), el.uso,
      h('p', { cls: 'tr-ayuda', txt: 'Los costes son estimaciones que tú ajustas según la tarifa de tu proveedor; el límite se aplica antes de cada envío.' })]));
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Consentimiento' }), h('label', { cls: 'tr-chk', for: 'ia-cons' }, [cons, 'Autorizo enviar fotogramas del video al proveedor configurado, sabiendo que el contenido sale de este dispositivo y puede incluir personas.']), h('p', { cls: 'tr-ayuda', txt: 'Debes volver a marcarlo cada vez que abras la página. Antes de cada envío puntual se muestra el fotograma exacto. Obtén el consentimiento de las personas que aparezcan si la ley lo exige.' })]));
    el.btnMon = h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Iniciar vigilancia por IA', on: { click: function () { if (mon) detener(); else iniciarVig(); } } });
    var wt = h('input', { type: 'text', id: 'ia-wt', placeholder: 'Ej.: avísame si alguien entra por la puerta', maxlength: 200 }), lw = h('ul', { cls: 'vi-vig' });
    function pintarVig() { lw.textContent = ''; (V.cfg.vigilancias || []).forEach(function (w) { var c = h('input', { type: 'checkbox', 'aria-label': 'Activo: ' + w.texto }); c.checked = w.activo; c.addEventListener('change', function () { w.activo = c.checked; V.cambioCfg(); }); lw.appendChild(h('li', {}, [h('label', { cls: 'tr-chk' }, [c, w.texto]), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Quitar', on: { click: function () { V.cfg.vigilancias = V.cfg.vigilancias.filter(function (x) { return x !== w; }); pintarVig(); V.cambioCfg(); } } })])); }); }
    V.on('proyecto', pintarVig);
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Describir y vigilar' }), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Describir la escena ahora', on: { click: describirAhora } })]), el.res,
      h('h3', { txt: 'Eventos en lenguaje natural' }), h('label', { for: 'ia-wt', txt: 'Describe qué debe avisar' }), wt, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn', txt: 'Añadir evento', on: { click: function () { var s = wt.value.trim(); if (!s) return; (V.cfg.vigilancias = V.cfg.vigilancias || []).push({ id: T.uid(), texto: s, activo: true }); wt.value = ''; pintarVig(); V.cambioCfg(); } } }), el.btnMon]), lw, el.monEst,
      h('p', { cls: 'tr-ayuda', txt: 'Cada ciclo envía un fotograma a la IA y le pregunta si el evento ocurre; respeta tus límites. Si ocurre, se genera el evento «Evento descrito a la IA» que puedes usar en Reglas (por ejemplo para grabar un clip). No es una alarma de seguridad fiable: la IA puede equivocarse.' })]));
    el.nFr = h('select', { id: 'ia-nfr' }, [6, 8, 12, 16].map(function (n) { return h('option', { value: n, txt: n + ' fotogramas' }); })); el.nFr.value = 8; el.estr = h('select', { id: 'ia-estr' }, [h('option', { value: 'uniforme', txt: 'Repartidos por igual' }), h('option', { value: 'cortes', txt: 'Priorizar cambios de escena (si analizaste el archivo)' })]);
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Resumen del video' }), h('p', { cls: 'tr-sub', txt: 'Para archivos de video: elige fotogramas clave y la IA propone título, resumen, capítulos y hashtags.' }), h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'ia-nfr', txt: 'Cantidad' }), el.nFr]), h('div', {}, [h('label', { for: 'ia-estr', txt: 'Selección' }), el.estr])]), h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-pri', txt: 'Resumir video', on: { click: resumirVideo } })]), el.resumen]));
    el.idioma = h('select', { id: 'ia-idioma' }, [['es-ES', 'Español (España)'], ['es-MX', 'Español (México)'], ['es-CO', 'Español (Colombia)'], ['en-US', 'English (US)']].map(function (l) { return h('option', { value: l[0], txt: l[1] }); })); el.voz = h('ul', { cls: 'vi-voz' });
    el.btnVoz = h('button', { type: 'button', cls: 'tr-btn', txt: 'Transcribir voz en vivo', on: { click: iniciarVoz } }); el.btnSrt = h('button', { type: 'button', cls: 'tr-btn', txt: 'Descargar SRT', disabled: true, on: { click: function () { T.descargar(new Blob([A.srt(V.transcripcion)], { type: 'text/plain' }), 'transcripcion.srt'); } } });
    var SR = g.SpeechRecognition || g.webkitSpeechRecognition;
    cont.appendChild(h('div', { cls: 'tr-panel' }, [h('h2', { txt: 'Voz (opcional)' }), h('p', { cls: 'tr-sub', txt: SR ? 'Tu navegador ofrece reconocimiento de voz. Escucha el micrófono, no el audio del archivo, y en algunos navegadores el audio se envía al servicio de voz del navegador.' : 'Este navegador no ofrece SpeechRecognition: no hay transcripción. (Este módulo no transcribe archivos.)' }), h('label', { for: 'ia-idioma', txt: 'Idioma' }), el.idioma, h('div', { cls: 'tr-acciones' }, [el.btnVoz, el.btnSrt]), el.voz]));
    el.btnVoz.disabled = !SR; pintarUso(); pintarVig(); V.on('fuente', function (f) { if (!f) detener(); });
  };
})(window);
