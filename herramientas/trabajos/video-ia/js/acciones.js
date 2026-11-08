/* Ejecuta las acciones de las reglas: clip, captura, notificacion, sonido, mensaje a dispositivo/puente, flujo de Automatizaciones, descarga. window.VAcciones */
(function (g) {
  'use strict';
  var V = g.VApp, T = g.Tr, R = g.VReglas, C = g.VCaptura, X = g.VAcciones = {}, canal = null, ctxA = null;
  function plantilla(s, ev, regla) { return String(s || '').replace(/\{(evento|valor|texto|regla|tiempo)\}/g, function (_, k) { return k === 'evento' ? ev.tipo : k === 'valor' ? (ev.valor == null ? '' : Math.round(ev.valor * 1000) / 1000) : k === 'texto' ? (ev.texto || '') : k === 'regla' ? (regla.nombre || '') : V.fmt(ev.t || 0); }); }
  X.plantilla = plantilla;
  X.pitido = function (tipo) {
    try {
      var AC = g.AudioContext || g.webkitAudioContext; if (!AC) return; ctxA = ctxA || new AC(); if (ctxA.state === 'suspended') ctxA.resume();
      var seq = tipo === 'alarma' ? [880, 660, 880, 660] : tipo === 'campana' ? [1320, 990] : [800], t = ctxA.currentTime;
      seq.forEach(function (f, i) { var o = ctxA.createOscillator(), gn = ctxA.createGain(); o.frequency.value = f; o.type = tipo === 'campana' ? 'sine' : 'square'; gn.gain.setValueAtTime(0.0001, t + i * 0.22); gn.gain.exponentialRampToValueAtTime(0.18, t + i * 0.22 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2); o.connect(gn); gn.connect(ctxA.destination); o.start(t + i * 0.22); o.stop(t + i * 0.22 + 0.22); });
    } catch (e) {}
  };
  /* Difunde el evento por BroadcastChannel 'trabajos_video_evento' (ver LEEME.md). Para QR tambien por 'trabajos_qr_leido', que ya escucha el disparador «QR leído». */
  X.difundir = function (ev, regla, flujo) {
    if (!g.BroadcastChannel) return false; canal = canal || new BroadcastChannel(R.CANAL);
    canal.postMessage({ tipo: 'video_evento', evento: ev.tipo, valor: ev.valor == null ? null : ev.valor, texto: ev.texto || '', t: ev.t, ts: ev.ts, regla: regla.nombre || '', flujo: flujo || '', proyecto: V.proyecto && V.proyecto.nombre || '', datos: { linea: ev.linea || null, dir: ev.dir || null, x: ev.x == null ? null : ev.x, y: ev.y == null ? null : ev.y } });
    if (ev.tipo === 'qr' && ev.texto) { try { var q = new BroadcastChannel('trabajos_qr_leido'); q.postMessage({ texto: ev.texto, origen: 'video_ia' }); setTimeout(function () { q.close(); }, 500); } catch (e) {} }
    return true;
  };
  function mensaje(a, ev, regla) {
    var TD = g.TrabajosDispositivos; if (!TD) return 'sin módulo de dispositivos';
    var lista = TD.listar().filter(function (c) { return c.estado === 'conectado' && c.tipo !== 'camara' && c.tipo !== 'microfono'; }), c = a.destino && a.destino !== '*' ? lista.filter(function (x) { return x.id === a.destino; })[0] : lista[0];
    if (!c) return 'no hay dispositivo/puente conectado (Ajustes → Puente)';
    var txt = plantilla(a.texto || '{evento}: {texto}', ev, regla); var d = c.tipo === 'puente' ? { tipo: 'video_evento', evento: ev.tipo, valor: ev.valor, texto: txt } : txt + (a.fin === false ? '' : '\n');
    TD.enviar(c.id, d).catch(function (e) { T.aviso('No se pudo enviar al dispositivo: ' + e.message, 'error'); }); return 'enviado a ' + c.nombre;
  }
  X.ejecutar = async function (a, ev, regla) {
    var res = '';
    try {
      switch (a.tipo) {
        case 'clip': { if (!C.puede() || !V.fuente) { res = 'sin fuente o sin MediaRecorder'; break; } var r = C.clip(+a.post || 8, { regla: regla.nombre, motivo: R.nombreEvento(ev.tipo) }); res = r ? (r.extendido ? 'clip extendido' : 'clip con ' + Math.round(r.preroll) + ' s de pre-roll') : 'sin buffer'; break; }
        case 'captura': { await C.guardarFoto(regla.nombre || ev.tipo, ev.t); res = 'captura guardada'; break; }
        case 'descargar': { var c = await C.guardarFoto(regla.nombre || ev.tipo, ev.t); T.descargar(c.blob, c.nombre); res = 'descargada ' + c.nombre; break; }
        case 'sonido': X.pitido(a.sonido || 'pitido'); res = 'sonido'; break;
        case 'notificacion': {
          var tx = plantilla(a.texto || 'Regla «{regla}»: {evento} {texto}', ev, regla); T.aviso(tx);
          if (g.Notification && Notification.permission === 'granted') { try { new Notification('Video IA', { body: tx, silent: false }); } catch (e) {} } res = 'notificado'; break;
        }
        case 'mensaje': res = mensaje(a, ev, regla); break;
        case 'automatizacion': res = X.difundir(ev, regla, a.flujo) ? 'difundido en ' + R.CANAL : 'BroadcastChannel no disponible'; break;
      }
    } catch (e) { res = 'error: ' + e.message; }
    V.emitir('accion', { regla: regla.nombre, tipo: a.tipo, evento: ev.tipo, resultado: res, ts: Date.now() });
  };
})(window);
