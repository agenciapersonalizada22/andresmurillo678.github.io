/* Motor de reproduccion: dos "decks" (HTMLAudioElement) para crossfade y reproduccion sin pausas, cadena Web Audio
   (cambio de tono, preamplificador, EQ 10 bandas, compresor, limitador, volumen) y analizadores para visualizadores. window.MuMotor */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, C = g.MuCalc, E = {};
  g.MuMotor = E;
  let N = null, decks = [], act = 0, tickId = 0, temp = null;
  const est = E.estado = { item: null, reproduciendo: false, dur: 0, vel: 1, vol: 0.8, bucle: { a: null, b: null }, sinProcesar: false, error: '' };
  const cb = {}; E.on = (ev, f) => { (cb[ev] = cb[ev] || []).push(f); }; const emit = (ev, ...a) => (cb[ev] || []).forEach((f) => { try { f(...a); } catch (e) { console.error(e); } });

  /* ---- cambio de tono: dos tomas de retardo moduladas con diente de sierra y ventana de Hann (granular) ---- */
  function crearTono(ctx, entrada, salida) {
    const P = 0.1, n = Math.round(P * ctx.sampleRate), bUp = ctx.createBuffer(1, n, ctx.sampleRate), bDn = ctx.createBuffer(1, n, ctx.sampleRate), bW = ctx.createBuffer(1, n, ctx.sampleRate);
    const u = bUp.getChannelData(0), d = bDn.getChannelData(0), w = bW.getChannelData(0);
    for (let i = 0; i < n; i++) { const f = i / n; u[i] = f; d[i] = 1 - f; w[i] = Math.pow(Math.sin(Math.PI * f), 2); }
    const T = { dir: ctx.createGain(), sh: ctx.createGain(), taps: [], ratio: 1, activo: false };
    entrada.connect(T.dir); T.dir.connect(salida); T.sh.gain.value = 0; T.sh.connect(salida);
    const t0 = ctx.currentTime + 0.05;
    [0, 0.5].forEach((fase) => {
      const del = ctx.createDelay(1), mod = ctx.createGain(), mG = ctx.createGain(), win = ctx.createGain(), sU = ctx.createBufferSource(), sD = ctx.createBufferSource(), sW = ctx.createBufferSource(), gU = ctx.createGain(), gD = ctx.createGain();
      del.delayTime.value = 0; win.gain.value = 0; mod.gain.value = 0; sU.buffer = bUp; sD.buffer = bDn; sW.buffer = bW; [sU, sD, sW].forEach((s) => { s.loop = true; s.start(t0, fase * P); });
      sU.connect(gU); sD.connect(gD); gU.connect(mod); gD.connect(mod); mod.connect(del.delayTime); sW.connect(win.gain);
      entrada.connect(del); del.connect(win); win.connect(T.sh); T.taps.push({ mod, gU, gD });
    });
    T.fijar = (semi) => {
      const r = Math.pow(2, semi / 12), t = ctx.currentTime; T.ratio = r; T.activo = Math.abs(semi) > 0.01;
      T.dir.gain.setTargetAtTime(T.activo ? 0 : 1, t, 0.02); T.sh.gain.setTargetAtTime(T.activo ? 1 : 0, t, 0.02);
      T.taps.forEach((x) => { x.gU.gain.value = r < 1 ? 1 : 0; x.gD.gain.value = r > 1 ? 1 : 0; x.mod.gain.value = P * Math.abs(r - 1); });
    };
    return T;
  }

  E.iniciar = function () {
    if (N) return N; const ctx = Mu.ctx(), a = D.ajustes();
    N = { ctx };
    N.mix = ctx.createGain(); N.pre = ctx.createGain(); N.eq = C.BANDAS.map((f, i) => { const b = ctx.createBiquadFilter(); b.type = C.tipoBanda(i); b.frequency.value = f; b.Q.value = C.QEQ; b.gain.value = 0; return b; });
    N.comp = ctx.createDynamicsCompressor(); N.lim = ctx.createDynamicsCompressor(); N.vol = ctx.createGain(); N.mono = ctx.createAnalyser(); N.spl = ctx.createChannelSplitter(2); N.anL = ctx.createAnalyser(); N.anR = ctx.createAnalyser();
    N.tono = crearTono(ctx, N.mix, N.pre);
    let prev = N.pre; N.eq.forEach((b) => { prev.connect(b); prev = b; }); prev.connect(N.comp); N.comp.connect(N.lim); N.lim.connect(N.vol); N.vol.connect(ctx.destination);
    N.lim.connect(N.mono); N.lim.connect(N.spl); N.spl.connect(N.anL, 0); N.spl.connect(N.anR, 1);
    N.mono.fftSize = 2048; N.mono.smoothingTimeConstant = 0.78; N.anL.fftSize = N.anR.fftSize = 1024;
    decks = [0, 1].map((i) => {
      const el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous'; const src = ctx.createMediaElementSource(el), fade = ctx.createGain(), rg = ctx.createGain();
      src.connect(fade); fade.connect(rg); rg.connect(N.mix); const d = { i, el, fade, rg, item: null, url: null, listo: false, disparado: false, contado: false };
      el.addEventListener('ended', () => { if (d.i === act) { emit('fin'); } });
      el.addEventListener('error', () => { if (d.item && d.i === act) { if (d.item.remoto && !est.sinProcesar && !d.fallo) { d.fallo = true; E.reproducirSinProceso(d.item); return; } est.error = 'No se pudo reproducir «' + (d.item.titulo || d.item.nombre || '') + '».'; emit('error', d.item); } });
      return d;
    });
    E.aplicarSonido(); est.vol = a.vol; N.vol.gain.value = a.vol * a.vol;
    tickId = setInterval(tick, 80);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    return N;
  };
  E.nodos = () => N;
  E.aplicarSonido = function () {
    if (!N) return; const a = D.ajustes(), t = N.ctx.currentTime;
    N.pre.gain.setTargetAtTime(C.dbALin(a.preamp), t, 0.03);
    N.eq.forEach((b, i) => b.gain.setTargetAtTime(a.eqOn ? (a.eq[i] || 0) : 0, t, 0.03));
    const c = N.comp; if (a.comp) { c.threshold.value = a.compUmbral; c.ratio.value = a.compRatio; c.knee.value = 12; c.attack.value = 0.01; c.release.value = 0.25; } else { c.threshold.value = 0; c.ratio.value = 1; c.knee.value = 0; }
    const l = N.lim; if (a.limitador) { l.threshold.value = -1; l.ratio.value = 20; l.knee.value = 0; l.attack.value = 0.003; l.release.value = 0.1; } else { l.threshold.value = 0; l.ratio.value = 1; l.knee.value = 0; }
    N.tono.fijar(a.tono); decks.forEach((d) => { d.el.preservesPitch = true; d.el.playbackRate = a.vel; }); est.vel = a.vel;
  };
  const act_ = () => decks[act], ina = () => decks[1 - act];
  E.deckActivo = act_; E.tiempo = () => (N && act_().item ? act_().el.currentTime : 0); E.duracion = () => (N && act_().el.duration > 0 && isFinite(act_().el.duration) ? act_().el.duration : (est.item && est.item.dur) || 0);

  function ganRG(item) {
    const a = D.ajustes(); if (!a.normalizar || !item || item.remoto) return 0;
    if (item.rgDb != null) return item.rgDb; if (item.rgTag != null) return Mu.clamp(item.rgTag, -15, 12);
    return 0;
  }
  async function poner(d, item) { // carga la fuente del deck
    if (d.item && item && d.item.id === item.id && d.url) return true;
    d.item = item; d.fallo = false; d.disparado = false; d.contado = false; d.listo = false;
    if (item.remoto) { d.url = item.url; d.el.crossOrigin = 'anonymous'; } else { d.url = await g.MuBib.urlDe(item.id); if (!d.url) { d.item = null; return false; } d.el.crossOrigin = null; }
    d.el.src = d.url; d.el.load(); d.rg.gain.value = C.dbALin(ganRG(item)); return true;
  }
  /* reproduce item en el deck libre (con crossfade si fade>0). Devuelve false si no hay archivo */
  const hostSinCors = (u) => { try { return JSON.parse(Mu.ls('musica_sincors_dispositivo') || '[]').includes(new URL(u).host); } catch (e) { return false; } };
  const recordarSinCors = (u) => { try { const l = JSON.parse(Mu.ls('musica_sincors_dispositivo') || '[]'), h = new URL(u).host; if (!l.includes(h)) { l.push(h); Mu.ls('musica_sincors_dispositivo', JSON.stringify(l.slice(-40))); } } catch (e) {} };
  E.reproducir = async function (item, o) {
    o = o || {}; E.iniciar(); await Mu.reanudar(); if (item.remoto && hostSinCors(item.url)) return E.reproducirSinProceso(item); const t = N.ctx.currentTime, a = D.ajustes();
    const nuevo = ina(), viejo = act_(); const ok = await poner(nuevo, item); if (!ok) { est.error = 'Falta el archivo: vuelve a elegirlo en Importar.'; emit('sinArchivo', item); return false; }
    est.error = ''; est.sinProcesar = false;
    nuevo.el.currentTime = o.desde || 0; nuevo.el.playbackRate = a.vel; nuevo.el.preservesPitch = true;
    const fade = o.fade && viejo.item && !viejo.el.paused ? o.fade : 0;
    nuevo.fade.gain.cancelScheduledValues(t); viejo.fade.gain.cancelScheduledValues(t);
    if (fade) { nuevo.fade.gain.setValueAtTime(0, t); nuevo.fade.gain.linearRampToValueAtTime(1, t + 0.0001); const n = 24; const cu = new Float32Array(n), cs = new Float32Array(n); for (let i = 0; i < n; i++) { const c = C.cruce(i / (n - 1)); cu[i] = c.entra; cs[i] = c.sale; } nuevo.fade.gain.setValueAtTime(0, t); nuevo.fade.gain.setValueCurveAtTime(cu, t + 0.001, fade); viejo.fade.gain.setValueCurveAtTime(cs, t + 0.001, fade); const v = viejo; setTimeout(() => { if (v !== decks[act]) { v.el.pause(); } }, fade * 1000 + 100); }
    else { nuevo.fade.gain.setValueAtTime(1, t); viejo.el.pause(); }
    act = nuevo.i; est.item = item; est.bucle = { a: null, b: null };
    try { await nuevo.el.play(); }
    catch (e) {
      if (item.remoto) { if (!nuevo.fallo) { nuevo.fallo = true; return E.reproducirSinProceso(item); } return true; }
      est.error = 'El navegador no pudo reproducir este archivo.'; emit('error', item); return false;
    }
    est.reproduciendo = true; emit('pista', item); emit('estado'); return true;
  };
  /* Radio/podcast sin CORS: se reproduce sin pasar por la cadena (sin EQ ni visualizador) */
  let crudo = null;
  E.reproducirSinProceso = async function (item) {
    recordarSinCors(item.url);
    if (!crudo) { crudo = new Audio(); crudo.addEventListener('ended', () => emit('fin')); crudo.addEventListener('error', () => { est.error = 'No se pudo abrir el flujo (¿http en página https, o servidor caído?).'; emit('error', item); }); }
    decks.forEach((d) => d.el.pause()); crudo.src = item.url; est.sinProcesar = true; est.item = item; est.error = '';
    try { await crudo.play(); est.reproduciendo = true; emit('pista', item); emit('estado'); return true; } catch (e) { est.error = 'No se pudo abrir el flujo.'; emit('error', item); return false; }
  };
  const el = () => (est.sinProcesar && crudo ? crudo : (N ? act_().el : null));
  E.pausar = function () { const e = el(); if (e) { e.pause(); est.reproduciendo = false; emit('estado'); } };
  E.reanudar = async function () { await Mu.reanudar(); const e = el(); if (e && est.item) { try { await e.play(); est.reproduciendo = true; emit('estado'); } catch (x) {} } };
  E.alternar = () => (est.reproduciendo ? E.pausar() : E.reanudar());
  E.detener = function () { decks.forEach((d) => { d.el.pause(); }); if (crudo) crudo.pause(); est.reproduciendo = false; emit('estado'); };
  E.buscar = function (s) { const e = el(); if (e) { e.currentTime = Mu.clamp(s, 0, E.duracion() || s); emit('tiempo'); } };
  E.salto = (d) => E.buscar(E.tiempo() + d);
  E.volumen = function (v) { est.vol = Mu.clamp(v, 0, 1); D.ajuste('vol', est.vol); if (N) N.vol.gain.setTargetAtTime(est.vol * est.vol, N.ctx.currentTime, 0.02); if (crudo) crudo.volume = est.vol; emit('vol'); };
  E.velocidad = (v) => { D.ajuste('vel', v); E.aplicarSonido(); emit('estado'); };
  E.tono = (s) => { D.ajuste('tono', s); E.aplicarSonido(); emit('estado'); };
  E.bucle = (a, b) => { est.bucle = { a, b }; emit('bucle'); };
  E.precargar = function (item) { if (!N || !item || item.remoto) return; const d = ina(); if (d.item && d.item.id === item.id) return; poner(d, item).catch(() => {}); };
  E.ajustarRG = function () { if (N && est.item) act_().rg.gain.setTargetAtTime(C.dbALin(ganRG(est.item)), N.ctx.currentTime, 0.1); };
  /* analiza (RMS/ReplayGain, BPM, tonalidad) decodificando el archivo localmente; no sube nada */
  E.analizar = async function (item, completo) {
    const f = await g.MuBib.archivo(item.id); if (!f) throw new Error('Archivo no disponible'); const ctx = Mu.ctx();
    const buf = await ctx.decodeAudioData(await f.arrayBuffer()); const m = g.MuSenal.mono(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)));
    const r = completo === false ? Object.assign({}, g.MuSenal.nivel(m, buf.sampleRate)) : g.MuSenal.analizar(m, buf.sampleRate);
    const p = D.pistas.get(item.id); if (p) { p.rgDb = Math.round(C.ganRG(r.p95Db, r.picoDb, -16, true).db * 10) / 10; p.p95Db = Math.round(r.p95Db * 10) / 10; p.picoDb = Math.round(r.picoDb * 10) / 10; if (completo !== false) { p.bpm = r.bpm; p.tono = r.tono; p.camelot = r.camelot; } if (!p.dur) p.dur = buf.duration; await D.guardarPista(p); if (est.item && est.item.id === p.id) { est.item = p; E.ajustarRG(); } }
    return r;
  };
  /* ---- temporizador de apagado ---- */
  E.temporizador = function (min) { clearTimeout(temp); est.temp = null; if (!min) { emit('temp'); return; } if (min === 'pista') { est.temp = { fin: 'pista' }; emit('temp'); return; } est.temp = { fin: Date.now() + min * 60000 }; temp = setTimeout(apagar, min * 60000); emit('temp'); };
  function apagar() {
    est.temp = null; emit('temp'); if (!N) return; const t = N.ctx.currentTime; N.vol.gain.cancelScheduledValues(t); N.vol.gain.setValueAtTime(N.vol.gain.value, t); N.vol.gain.linearRampToValueAtTime(0.0001, t + 6);
    setTimeout(() => { E.pausar(); N.vol.gain.setValueAtTime(est.vol * est.vol, N.ctx.currentTime); }, 6200); Mu.aviso('Temporizador: música pausada.');
  }
  E.apagarAlFinDePista = () => { if (est.temp && est.temp.fin === 'pista') { est.temp = null; emit('temp'); E.pausar(); Mu.aviso('Temporizador: pausa al final de la pista.'); return true; } return false; };
  /* ---- tick: progreso, bucle A-B, crossfade/sin pausas, estadisticas ---- */
  function tick() {
    if (!N || !est.item || !est.reproduciendo) return; const e = el(); if (!e) return; const d = act_(), t = e.currentTime, dur = E.duracion();
    if (est.bucle.a != null && est.bucle.b != null && t >= est.bucle.b) { e.currentTime = est.bucle.a; }
    emit('tiempo', t, dur);
    if (est.sinProcesar || !est.reproduciendo) return;
    if (!d.contado && dur && (t > 30 || t > dur * 0.5)) { d.contado = true; emit('contada', est.item); }
    const a = D.ajustes(), rest = dur - t;
    if (dur && !d.disparado && est.bucle.b == null) {
      if (rest < 20 && rest > 0) emit('precargar');
      const fade = a.crossfade || 0;
      if (fade > 0 && rest <= fade + 0.05 && rest > 0) { d.disparado = true; emit('casiFin', fade); }
      else if (fade === 0 && a.sinPausas && rest <= 0.09 && rest > 0) { d.disparado = true; emit('casiFin', 0); }
    }
  }
  E.analisadores = () => (N ? { mono: N.mono, izq: N.anL, der: N.anR, ctx: N.ctx } : null);
})(window);
