/* Estudio > Metronomo (look-ahead sobre reloj de Web Audio), Afinador cromatico (YIN propio) y Grabadora (medidor, WAV/WebM). */
(function (g) {
  'use strict';
  const Mu = g.Mu, D = g.MuDatos, E = g.MuEst, SS = g.MuSintes, PL = g.MuPlan, SG = g.MuSenal, T = g.Tr, B = g.MuBib, h = Mu.h, esc = Mu.esc;
  const nom = (pc) => (D.ajuste('notacion') === 'anglo' ? SG.NOTAS_ANG : SG.NOTAS_LAT)[pc];
  /* ============ Metronomo ============ */
  const Me = E.metro = { reja: null, cola: [], activo: false, taps: [], ult: -1, cmp: 0 };
  E.subs.metro = function (p) {
    p.textContent = ''; const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Metrónomo preciso' })); const A = D.ajustes();
    const cfg = Object.assign({ bpm: 100, num: 4, den: 4, sub: 1, vol: 0.8, acel: 0, cada: 4 }, JSON.parse(Mu.ls('musica_metro_dispositivo') || '{}')); const guardar = () => Mu.ls('musica_metro_dispositivo', JSON.stringify(cfg));
    const vis = h('div', { cls: 'mu-latidos', id: 'mu-latidos', 'aria-hidden': 'true' }), num = h('div', { cls: 'mu-bpm-grande', id: 'mu-metro-bpm', role: 'status', 'aria-live': 'off' });
    const pintarNum = () => { num.innerHTML = '<b>' + cfg.bpm + '</b><small>BPM</small>'; }; pintarNum();
    function dots() { vis.textContent = ''; for (let i = 0; i < cfg.num; i++) vis.appendChild(h('span', { cls: 'mu-lat' + (i === 0 ? ' f' : '') })); }
    const setBpm = (v) => { cfg.bpm = Mu.clamp(Math.round(v), 30, 300); pintarNum(); rg.value = cfg.bpm; if (Me.reja) Me.reja.bpm = cfg.bpm; guardar(); };
    const rg = h('input', { type: 'range', min: 30, max: 300, value: cfg.bpm, id: 'mu-metro-rg', 'aria-label': 'Tempo', on: { input: () => setBpm(+rg.value) } });
    const play = h('button', { type: 'button', cls: 'tr-btn tr-pri mu-gordo', id: 'mu-metro-play', 'aria-pressed': 'false', on: () => (Me.activo ? parar() : iniciar()) });
    const pintarPlay = () => { play.innerHTML = Mu.ico(Me.activo ? 'stop' : 'play') + '<span>' + (Me.activo ? 'Detener' : 'Iniciar') + '</span>'; play.setAttribute('aria-pressed', Me.activo); }; pintarPlay();
    function iniciar() {
      Mu.reanudar(); const n = E.nodos(); Me.cmp = 0; Me.cola = []; dots();
      Me.reja = PL.crearReja({ reloj: () => n.ctx.currentTime, adelante: 0.1, intervalo: 25, alTick: (k, t) => { const inf = PL.infoPulso(k, [cfg.num, cfg.den], cfg.sub); SS.clic(n.ctx, n.master, t, inf.tipo, cfg.vol); Me.cola.push({ t, inf }); if (cfg.acel && inf.pulso === 0 && inf.sub === 0 && inf.compas > 0 && inf.compas !== Me.cmp) { Me.cmp = inf.compas; if (inf.compas % cfg.cada === 0 && cfg.bpm < 300) { cfg.bpm = Math.min(300, cfg.bpm + cfg.acel); Me.reja.bpm = cfg.bpm; setTimeout(pintarNum, 0); } } } });
      Me.reja.bpm = cfg.bpm; Me.reja.div = cfg.sub; Me.reja.iniciar(); Me.activo = true; pintarPlay(); anim(); Mu.logro('metronomo');
    }
    function parar() { if (Me.reja) Me.reja.detener(); Me.activo = false; pintarPlay(); vis.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); }
    let raf = 0; function anim() { cancelAnimationFrame(raf); const f = () => { if (!Me.activo) return; raf = requestAnimationFrame(f); const now = E.nodos().ctx.currentTime; let u = null; while (Me.cola.length && Me.cola[0].t <= now) u = Me.cola.shift(); if (u && u.inf.sub === 0) { vis.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); const el = vis.children[u.inf.pulso]; if (el) el.classList.add('on'); pintarNum(); } }; raf = requestAnimationFrame(f); }
    dots(); const mas = (n) => h('button', { type: 'button', cls: 'tr-btn', 'aria-label': (n > 0 ? 'Subir ' : 'Bajar ') + Math.abs(n) + ' BPM', txt: (n > 0 ? '+' : '−') + Math.abs(n), on: () => setBpm(cfg.bpm + n) });
    d.append(vis, num, h('div', { cls: 'mu-bpm-fila' }, [mas(-5), mas(-1), rg, mas(1), mas(5)]));
    const comp = h('select', { id: 'mu-metro-comp', 'aria-label': 'Compás', on: { change: () => { const [a, b] = comp.value.split('/').map(Number); cfg.num = a; cfg.den = b; guardar(); dots(); if (Me.activo) { parar(); iniciar(); } } } }); ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].forEach((c) => comp.appendChild(h('option', { value: c, txt: c, selected: c === cfg.num + '/' + cfg.den })));
    const sub = h('select', { id: 'mu-metro-sub', 'aria-label': 'Subdivisión', on: { change: () => { cfg.sub = +sub.value; if (Me.reja) { Me.reja.div = cfg.sub; } guardar(); if (Me.activo) { parar(); iniciar(); } } } }); [[1, 'Pulsos'], [2, 'Corcheas (×2)'], [3, 'Tresillos (×3)'], [4, 'Semicorcheas (×4)']].forEach(([v, t]) => sub.appendChild(h('option', { value: v, txt: t, selected: v === cfg.sub })));
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-metro-comp', txt: 'Compás' }), comp]), h('div', {}, [h('label', { for: 'mu-metro-sub', txt: 'Subdivisión' }), sub])]));
    d.appendChild(h('div', { cls: 'mu-rango' }, [h('label', { for: 'mu-metro-vol', txt: 'Volumen' }), h('input', { type: 'range', id: 'mu-metro-vol', min: 0, max: 100, value: cfg.vol * 100, on: { input: function () { cfg.vol = this.value / 100; guardar(); } } }), h('span')]));
    const ac = h('select', { id: 'mu-metro-acel', 'aria-label': 'Entrenador de velocidad', on: { change: () => { cfg.acel = +ac.value; guardar(); } } }); [[0, 'Entrenador de velocidad: no'], [2, 'Subir 2 BPM'], [5, 'Subir 5 BPM'], [10, 'Subir 10 BPM']].forEach(([v, t]) => ac.appendChild(h('option', { value: v, txt: t, selected: v === cfg.acel })));
    d.appendChild(h('div', { cls: 'tr-fila' }, [ac, h('select', { 'aria-label': 'Cada cuántos compases', on: { change: function () { cfg.cada = +this.value; guardar(); } } }, [2, 4, 8, 16].map((n) => h('option', { value: n, txt: 'cada ' + n + ' compases', selected: n === cfg.cada })))]));
    d.appendChild(h('div', { cls: 'tr-acciones' }, [play, h('button', { type: 'button', cls: 'tr-btn', id: 'mu-metro-tap', txt: 'Tap tempo', on: () => { const n = performance.now(); Me.taps = Me.taps.filter((t) => n - t < 2500); Me.taps.push(n); if (Me.taps.length > 2) setBpm(60000 / ((Me.taps[Me.taps.length - 1] - Me.taps[0]) / (Me.taps.length - 1))); } })]));
    d.appendChild(h('p', { cls: 'tr-ayuda', txt: 'Los clics se programan en el reloj de audio con anticipación, por lo que no pierden el ritmo aunque la pantalla vaya lenta. En compases de 6/8, 9/8 y 12/8 se acentúa cada grupo de tres corcheas.' })); p.appendChild(d); E.subs.metro_vis = (v) => { if (!v) parar(); };
    addEventListener('keydown', (e) => { if (!E.visible() || E.actual !== 'metro' || e.code !== 'Space') return; const el = document.activeElement; if (el && /INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName) && el.type !== 'range') return; e.preventDefault(); Me.activo ? parar() : iniciar(); });
  };
  /* ============ Afinador ============ */
  const INSTR = { 'Cromático': { min: 30, max: 1500, cuerdas: [] }, 'Guitarra': { min: 70, max: 1100, cuerdas: [40, 45, 50, 55, 59, 64] }, 'Bajo (4 cuerdas)': { min: 30, max: 400, cuerdas: [28, 33, 38, 43] }, 'Ukelele': { min: 200, max: 700, cuerdas: [67, 60, 64, 69] }, 'Violín': { min: 180, max: 1500, cuerdas: [55, 62, 69, 76] }, 'Voz': { min: 70, max: 1100, cuerdas: [] } };
  const Af = E.afin = { stream: null, ctx: null, an: null, id: 0, hist: [] };
  E.subs.afin = function (p) {
    p.textContent = ''; const d = h('div', { cls: 'tr-panel' }); p.appendChild(d); d.appendChild(h('h2', { txt: 'Afinador cromático' }));
    const ins = h('select', { id: 'mu-af-inst', 'aria-label': 'Instrumento', on: { change: () => { pintarCuerdas(); } } }); Object.keys(INSTR).forEach((k) => ins.appendChild(h('option', { value: k, txt: k }))); const a4 = h('input', { type: 'number', id: 'mu-af-a4', min: 410, max: 470, value: D.ajuste('a4'), 'aria-label': 'Frecuencia de La4', on: { change: () => { D.ajuste('a4', Mu.clamp(+a4.value || 440, 410, 470)); } } });
    d.appendChild(h('div', { cls: 'tr-fila' }, [h('div', {}, [h('label', { for: 'mu-af-inst', txt: 'Instrumento' }), ins]), h('div', {}, [h('label', { for: 'mu-af-a4', txt: 'La4 =' }), a4])]));
    const nota = h('div', { cls: 'mu-af-nota', id: 'mu-af-nota', role: 'status', 'aria-live': 'polite', txt: '—' }), cents = h('div', { cls: 'mu-af-cents', id: 'mu-af-cents', txt: 'Toca una nota' }), hz = h('div', { cls: 'mu-af-hz', id: 'mu-af-hz' });
    const cv = h('canvas', { cls: 'mu-aguja', id: 'mu-aguja', width: 600, height: 170, role: 'img', 'aria-label': 'Aguja del afinador' });
    d.append(cv, nota, cents, hz); const cu = h('div', { cls: 'mu-cuerdas', id: 'mu-cuerdas', role: 'group', 'aria-label': 'Cuerdas' }); d.appendChild(cu);
    const est = h('p', { cls: 'tr-ayuda', id: 'mu-af-est', role: 'status', txt: 'El micrófono solo se usa mientras el afinador está activo; el audio no se graba ni se envía a ningún sitio.' });
    const btn = h('button', { type: 'button', cls: 'tr-btn tr-pri mu-gordo', id: 'mu-af-btn', on: () => (Af.stream ? parar() : iniciar()) }); btn.innerHTML = Mu.ico('mic') + '<span>Activar micrófono</span>'; d.append(h('div', { cls: 'tr-acciones' }, [btn]), est);
    function pintarCuerdas() { cu.textContent = ''; Af.objetivo = null; const c = INSTR[ins.value].cuerdas; c.forEach((m) => { const f = SG.freqMidi(m, D.ajuste('a4')); const b = h('button', { type: 'button', cls: 'mu-cuerda', 'data-m': m, 'aria-label': 'Sonar ' + nom(m % 12) + Math.floor(m / 12 - 1), on: () => sonar(f) }); b.innerHTML = '<b>' + nom(m % 12) + '</b><small>' + (Math.floor(m / 12) - 1) + '</small>'; cu.appendChild(b); }); }
    function sonar(f) { Mu.reanudar(); const n = E.nodos(), o = n.ctx.createOscillator(), gg = n.ctx.createGain(), t = n.ctx.currentTime; o.type = 'triangle'; o.frequency.value = f; gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.3, t + 0.03); gg.gain.exponentialRampToValueAtTime(0.0005, t + 1.6); o.connect(gg); gg.connect(n.ctx.destination); o.start(t); o.stop(t + 1.7); }
    pintarCuerdas();
    function dibujar(c) { // c: cents (-50..50) o null
      const x = cv.getContext('2d'), w = cv.width, hh = cv.height, cs = getComputedStyle(cv), ac = cs.getPropertyValue('--acento').trim(), ok = c != null && Math.abs(c) <= 5; x.clearRect(0, 0, w, hh); const cx = w / 2, cy = hh - 10, r = hh - 30;
      x.lineWidth = 3; x.strokeStyle = 'rgba(128,128,160,.5)'; x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); x.strokeStyle = '#2fa56b'; x.lineWidth = 8; x.beginPath(); x.arc(cx, cy, r, Math.PI * 1.5 - 0.06, Math.PI * 1.5 + 0.06); x.stroke();
      for (let k = -50; k <= 50; k += 10) { const a = Math.PI * 1.5 + (k / 50) * Math.PI * 0.35; x.lineWidth = k % 50 === 0 ? 3 : 1.5; x.strokeStyle = 'rgba(128,128,160,.7)'; x.beginPath(); x.moveTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12)); x.lineTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4)); x.stroke(); }
      if (c != null) { const a = Math.PI * 1.5 + Mu.clamp(c, -50, 50) / 50 * Math.PI * 0.35; x.strokeStyle = ok ? '#2fa56b' : ac; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); x.stroke(); }
    }
    dibujar(null);
    async function iniciar() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { est.textContent = 'Este navegador no permite usar el micrófono (hace falta HTTPS).'; return; }
      try { Af.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
      catch (e) { est.textContent = 'No se pudo abrir el micrófono: ' + (e.name === 'NotAllowedError' ? 'permiso denegado.' : e.message); return; }
      await Mu.reanudar(); const n = E.nodos(); Af.src = n.ctx.createMediaStreamSource(Af.stream); Af.an = n.ctx.createAnalyser(); Af.an.fftSize = 4096; Af.src.connect(Af.an); Af.buf = new Float32Array(4096); Af.hist = []; Af.ultOk = 0;
      btn.querySelector('span').textContent = 'Detener'; est.textContent = 'Escuchando… toca una nota sostenida.'; Mu.logro('afinador');
      Af.id = setInterval(() => {
        if (document.hidden || !Mu.soloVisible(cv)) return; Af.an.getFloatTimeDomainData(Af.buf); const I = INSTR[ins.value], r = SG.yin(Af.buf, E.nodos().ctx.sampleRate, { min: I.min, max: I.max, umbral: 0.15, silencio: 0.006 }), now = performance.now();
        if (r && r.prob > 0.8) { Af.hist.push(r.freq); if (Af.hist.length > 5) Af.hist.shift(); const s = Af.hist.slice().sort((a, b) => a - b), f = s[Math.floor(s.length / 2)]; Af.ultOk = now; mostrar(f); }
        else if (now - Af.ultOk > 700) { Af.hist = []; nota.textContent = '—'; cents.textContent = 'Toca una nota'; hz.textContent = ''; dibujar(null); cu.querySelectorAll('.on').forEach((b) => b.classList.remove('on', 'ok')); }
      }, 50);
    }
    function mostrar(f) {
      const A4 = D.ajuste('a4'); let n = SG.nota(f, A4); const I = INSTR[ins.value]; if (I.cuerdas.length) { let mj = null, md = 1e9; I.cuerdas.forEach((m) => { const dd = Math.abs(1200 * Math.log2(f / SG.freqMidi(m, A4))); if (dd < md) { md = dd; mj = m; } }); if (md < 600) { const fo = SG.freqMidi(mj, A4); n = { midi: mj, pc: mj % 12, octava: Math.floor(mj / 12) - 1, cents: Math.round(1200 * Math.log2(f / fo) * 10) / 10 }; } }
      nota.textContent = nom(n.pc) + n.octava; const c = Math.round(n.cents); cents.textContent = Math.abs(c) <= 5 ? '✓ Afinado' : (c > 0 ? '+' + c + ' ¢ (sube de más: afloja)' : c + ' ¢ (muy grave: aprieta)'); cents.classList.toggle('ok', Math.abs(c) <= 5); hz.textContent = f.toFixed(1) + ' Hz'; dibujar(n.cents);
      cu.querySelectorAll('.mu-cuerda').forEach((b) => { b.classList.toggle('on', +b.dataset.m === n.midi); b.classList.toggle('ok', +b.dataset.m === n.midi && Math.abs(c) <= 5); });
      Af.ultima = { nota: nom(n.pc) + n.octava, cents: n.cents, freq: f };
    }
    function parar() { clearInterval(Af.id); Af.id = 0; if (Af.stream) Af.stream.getTracks().forEach((t) => t.stop()); Af.stream = null; if (Af.src) Af.src.disconnect(); btn.querySelector('span').textContent = 'Activar micrófono'; est.textContent = 'Afinador detenido.'; dibujar(null); }
    E.subs.afin_vis = (v) => { if (!v && Af.stream) parar(); }; document.addEventListener('visibilitychange', () => { if (document.hidden && Af.stream) parar(); });
  };
  /* ============ Grabadora ============ */
  const Gr = E.graba = { rec: null, trozos: [], lista: [] };
  E.subs.graba = function (p) {
    p.textContent = ''; const d = h('div', { cls: 'tr-panel' }); d.appendChild(h('h2', { txt: 'Grabadora de audio' }));
    const fuente = h('select', { id: 'mu-gr-fuente', 'aria-label': 'Fuente de audio' }); [['mic', 'Micrófono'], ['estudio', 'Salida del estudio (sintetizador y ritmos)']].forEach(([v, t]) => fuente.appendChild(h('option', { value: v, txt: t })));
    const med = h('canvas', { cls: 'mu-vu mu-vu-gr', id: 'mu-gr-vu', width: 400, height: 16, role: 'img', 'aria-label': 'Medidor de nivel' }), tiempo = h('div', { cls: 'mu-gr-t', id: 'mu-gr-t', role: 'timer', txt: '0:00' }), est = h('p', { cls: 'tr-ayuda', role: 'status', id: 'mu-gr-est', txt: 'Las grabaciones se guardan en este dispositivo (no se suben).' });
    const bRec = h('button', { type: 'button', cls: 'tr-btn tr-pri', id: 'mu-gr-rec', on: () => (Gr.rec && Gr.rec.state !== 'inactive' ? detener() : grabar()) }); const bPausa = h('button', { type: 'button', cls: 'tr-btn', id: 'mu-gr-pausa', txt: 'Pausar', disabled: true, on: () => { if (Gr.rec.state === 'recording') { Gr.rec.pause(); bPausa.textContent = 'Reanudar'; } else { Gr.rec.resume(); bPausa.textContent = 'Pausar'; } } });
    const pr = () => { const act = Gr.rec && Gr.rec.state !== 'inactive'; bRec.innerHTML = Mu.ico(act ? 'stop' : 'rec') + '<span>' + (act ? 'Detener' : 'Grabar') + '</span>'; bPausa.disabled = !act; }; pr();
    d.append(h('label', { for: 'mu-gr-fuente', txt: 'Fuente' }), fuente, med, tiempo, h('div', { cls: 'tr-acciones' }, [bRec, bPausa]), est); const lista = h('div', { id: 'mu-gr-lista' }); d.appendChild(lista); p.appendChild(d);
    let an = null, buf = null, t0 = 0, acum = 0, tmr = 0, raf = 0, flujo = null, mic = null, destEst = null;
    function vu() { cancelAnimationFrame(raf); const x = med.getContext('2d'); let pico = 0; const f = () => { raf = requestAnimationFrame(f); if (!an) { x.clearRect(0, 0, med.width, med.height); return; } an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); pico = Math.max(m, pico * 0.9); const v = Math.min(1, Math.sqrt(pico)); x.clearRect(0, 0, med.width, med.height); x.fillStyle = 'rgba(128,128,160,.2)'; x.fillRect(0, 0, med.width, med.height); x.fillStyle = v > 0.92 ? '#e5484d' : getComputedStyle(med).getPropertyValue('--acento'); x.fillRect(0, 0, med.width * v, med.height); }; raf = requestAnimationFrame(f); }
    async function grabar() {
      if (!g.MediaRecorder) { est.textContent = 'Este navegador no incluye MediaRecorder.'; return; } await Mu.reanudar(); const n = E.nodos();
      try { if (fuente.value === 'mic') { flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); mic = n.ctx.createMediaStreamSource(flujo); an = n.ctx.createAnalyser(); mic.connect(an); } else { destEst = n.ctx.createMediaStreamDestination(); n.master.connect(destEst); flujo = destEst.stream; an = n.ctx.createAnalyser(); n.master.connect(an); } }
      catch (e) { est.textContent = 'No se pudo abrir la fuente: ' + (e.name === 'NotAllowedError' ? 'permiso de micrófono denegado.' : e.message); return; }
      an.fftSize = 1024; buf = new Float32Array(1024); vu(); const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']; const mime = tipos.find((t) => MediaRecorder.isTypeSupported(t)) || ''; Gr.trozos = [];
      Gr.rec = new MediaRecorder(flujo, mime ? { mimeType: mime } : undefined); Gr.rec.ondataavailable = (e) => { if (e.data.size) Gr.trozos.push(e.data); }; Gr.rec.onstop = fin; Gr.rec.start(250); t0 = performance.now(); acum = 0; clearInterval(tmr); tmr = setInterval(() => { if (Gr.rec.state === 'recording') tiempo.textContent = Mu.tiempo((performance.now() - t0 + acum) / 1000); }, 200); pr(); est.textContent = 'Grabando…'; Mu.logro('grabadora');
    }
    function detener() { if (Gr.rec && Gr.rec.state !== 'inactive') Gr.rec.stop(); }
    async function fin() {
      clearInterval(tmr); cancelAnimationFrame(raf); if (fuente.value === 'mic' && flujo) flujo.getTracks().forEach((t) => t.stop()); if (mic) mic.disconnect(); if (destEst) { try { E.nodos().master.disconnect(destEst); } catch (e) {} } an = null; mic = null; destEst = null; flujo = null;
      const blob = new Blob(Gr.trozos, { type: Gr.rec.mimeType || 'audio/webm' }); const r = { id: 'g' + Date.now().toString(36), nombre: 'Grabación ' + new Date().toLocaleString('es'), blob, dur: (performance.now() - t0) / 1000 }; Gr.lista.unshift(r); try { await D.loc.set('grabaciones', { id: r.id, nombre: r.nombre, blob }); } catch (e) {} pr(); est.textContent = 'Grabación terminada.'; pintarLista();
    }
    const ext = (b) => (/mp4/.test(b.type) ? 'm4a' : /ogg/.test(b.type) ? 'ogg' : 'webm');
    async function aWav(blob) { const buf2 = await E.nodos().ctx.decodeAudioData(await blob.arrayBuffer()); return new Blob([g.MuFmt.wavEscribir(Array.from({ length: buf2.numberOfChannels }, (_, i) => buf2.getChannelData(i)), buf2.sampleRate)], { type: 'audio/wav' }); }
    function pintarLista() {
      lista.textContent = ''; if (!Gr.lista.length) return; lista.appendChild(h('h3', { txt: 'Grabaciones' }));
      Gr.lista.forEach((r) => { const c = h('div', { cls: 'mu-grab' }); const au = h('audio', { controls: true, src: URL.createObjectURL(r.blob), preload: 'metadata', 'aria-label': r.nombre }); c.append(h('b', { txt: r.nombre }), au, h('div', { cls: 'tr-acciones' }, [h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'WebM/original', on: () => Mu.descarga(r.blob, T.nombreArchivo(r.nombre) + '.' + ext(r.blob)) }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'Exportar WAV', on: async () => { try { Mu.descarga(await aWav(r.blob), T.nombreArchivo(r.nombre) + '.wav'); Mu.logro('exportar_wav'); } catch (e) { Mu.aviso('No se pudo convertir: ' + e.message, 'error'); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico', txt: 'A la biblioteca', on: async () => { try { const w = await aWav(r.blob); await B.importar([new File([w], T.nombreArchivo(r.nombre) + '.wav', { type: 'audio/wav', lastModified: Date.now() })]); Mu.aviso('Añadida a la biblioteca.'); } catch (e) { Mu.aviso('No se pudo añadir: ' + e.message, 'error'); } } }), h('button', { type: 'button', cls: 'tr-btn tr-chico tr-peli', txt: 'Borrar', on: async () => { Gr.lista = Gr.lista.filter((x) => x !== r); await D.loc.borrar('grabaciones', r.id); pintarLista(); } })])); lista.appendChild(c); });
    }
    D.loc.lista('grabaciones').then((rs) => { rs.forEach((r) => { if (!Gr.lista.find((x) => x.id === r.id)) Gr.lista.push({ id: r.id, nombre: r.nombre, blob: r.blob, dur: 0 }); }); pintarLista(); });
    E.subs.graba_vis = (v) => { if (!v && Gr.rec && Gr.rec.state !== 'inactive') detener(); };
  };
})(window);
