/* Motores de sintesis Web Audio: sintetizador polifonico (2 osciladores, filtro, ADSR, LFO, distorsion, chorus, delay, reverb), caja de ritmos sintetizada
   con kits y muestras propias, clic de metronomo y renderizado a AudioBuffer con OfflineAudioContext. Funcionan con AudioContext y OfflineAudioContext. window.MuSintes */
(function (g) {
  'use strict';
  const S = g.MuSintes = {};
  const f2 = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const env = (a, d, s, r) => ({ a, d, s, r });
  S.PRESETS = {
    'Piano eléctrico': { o1: { t: 'triangle', oct: 0, det: 0, vol: 0.7 }, o2: { t: 'sine', oct: 1, det: 4, vol: 0.35 }, filtro: { t: 'lowpass', fc: 2600, q: 0.8, env: 1.2 }, ea: env(0.005, 0.9, 0.25, 0.35), ef: env(0.005, 0.5, 0.3, 0.3), lfo: { t: 'sine', hz: 4.5, prof: 0, dest: 'pitch' }, fx: { dist: 0, coro: 0.35, delay: 0, rev: 0.18 }, vol: 0.9 },
    'Lead brillante': { o1: { t: 'sawtooth', oct: 0, det: -7, vol: 0.5 }, o2: { t: 'square', oct: 0, det: 8, vol: 0.28 }, filtro: { t: 'lowpass', fc: 1800, q: 4, env: 2.4 }, ea: env(0.01, 0.2, 0.7, 0.25), ef: env(0.01, 0.35, 0.4, 0.3), lfo: { t: 'sine', hz: 5.5, prof: 0.06, dest: 'pitch' }, fx: { dist: 0.1, coro: 0.2, delay: 0.25, rev: 0.2 }, vol: 0.8 },
    'Bajo profundo': { o1: { t: 'sawtooth', oct: -1, det: 0, vol: 0.55 }, o2: { t: 'square', oct: -2, det: 0, vol: 0.5 }, filtro: { t: 'lowpass', fc: 500, q: 3, env: 2.2 }, ea: env(0.005, 0.25, 0.65, 0.12), ef: env(0.005, 0.18, 0.2, 0.15), lfo: { t: 'sine', hz: 3, prof: 0, dest: 'filtro' }, fx: { dist: 0.15, coro: 0, delay: 0, rev: 0.04 }, vol: 0.95 },
    'Pad cálido': { o1: { t: 'sawtooth', oct: 0, det: -9, vol: 0.4 }, o2: { t: 'sawtooth', oct: 0, det: 9, vol: 0.4 }, filtro: { t: 'lowpass', fc: 900, q: 1, env: 1.5 }, ea: env(0.9, 1.2, 0.8, 1.6), ef: env(1.2, 1.5, 0.6, 1.5), lfo: { t: 'sine', hz: 0.25, prof: 0.2, dest: 'filtro' }, fx: { dist: 0, coro: 0.6, delay: 0.15, rev: 0.45 }, vol: 0.7 },
    'Pluck': { o1: { t: 'square', oct: 0, det: 0, vol: 0.5 }, o2: { t: 'sawtooth', oct: 1, det: 6, vol: 0.25 }, filtro: { t: 'lowpass', fc: 700, q: 6, env: 3.5 }, ea: env(0.002, 0.35, 0, 0.2), ef: env(0.002, 0.22, 0, 0.2), lfo: { t: 'sine', hz: 5, prof: 0, dest: 'pitch' }, fx: { dist: 0, coro: 0.15, delay: 0.3, rev: 0.25 }, vol: 0.85 },
    'Órgano': { o1: { t: 'sine', oct: 0, det: 0, vol: 0.5 }, o2: { t: 'sine', oct: 1, det: 0, vol: 0.4 }, filtro: { t: 'lowpass', fc: 5000, q: 0.5, env: 0 }, ea: env(0.01, 0.05, 0.95, 0.08), ef: env(0.01, 0.1, 1, 0.1), lfo: { t: 'sine', hz: 6, prof: 0.25, dest: 'amp' }, fx: { dist: 0.05, coro: 0.3, delay: 0, rev: 0.25 }, vol: 0.8 },
    'Campanas': { o1: { t: 'sine', oct: 1, det: 0, vol: 0.55 }, o2: { t: 'triangle', oct: 2, det: 0, vol: 0.25 }, filtro: { t: 'highpass', fc: 200, q: 0.7, env: 0 }, ea: env(0.002, 1.8, 0, 1.4), ef: env(0.01, 0.1, 1, 0.1), lfo: { t: 'sine', hz: 5, prof: 0, dest: 'pitch' }, fx: { dist: 0, coro: 0.1, delay: 0.2, rev: 0.5 }, vol: 0.8 }
  };
  S.patchBase = () => JSON.parse(JSON.stringify(S.PRESETS['Lead brillante']));
  const impulsos = new WeakMap();
  function impulso(ctx, seg) { // reverb sintetica: ruido estereo con decaimiento exponencial
    let m = impulsos.get(ctx); if (!m) { m = {}; impulsos.set(ctx, m); } const k = seg.toFixed(1); if (m[k]) return m[k];
    const n = Math.max(100, Math.round(ctx.sampleRate * seg)), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); } return (m[k] = b);
  }
  function curva(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = k < 0.01 ? x : Math.tanh(x * (1 + k * 18)) / Math.tanh(1 + k * 18); } return c; }
  function mezcla(ctx, ent, proc, ini) { const dry = ctx.createGain(), wet = ctx.createGain(), sal = ctx.createGain(); dry.gain.value = 1 - ini; wet.gain.value = ini; ent.connect(dry); dry.connect(sal); ent.connect(proc.entrada); proc.salida.connect(wet); wet.connect(sal); return { sal, set: (m) => { const t = ctx.currentTime; dry.gain.setTargetAtTime(1 - m * 0.5, t, 0.02); wet.gain.setTargetAtTime(m, t, 0.02); } }; }
  const nivelEnv = (e, dt) => (dt < e.a ? dt / Math.max(e.a, 1e-4) : e.s + (1 - e.s) * Math.exp(-(dt - e.a) / (e.d / 3 + 1e-4)));

  /* ---------- sintetizador ---------- */
  S.crear = function (ctx, destino, patch) {
    const Y = { patch: JSON.parse(JSON.stringify(patch || S.patchBase())), vivas: new Map(), activas: [], bend: 0, max: 14 };
    Y.entrada = ctx.createGain(); Y.trem = ctx.createGain(); Y.entrada.connect(Y.trem);
    const dist = ctx.createWaveShaper(); dist.oversample = '2x'; const dEnt = ctx.createGain(), dSal = ctx.createGain(); dEnt.connect(dist); dist.connect(dSal);
    const mD = mezcla(ctx, Y.trem, { entrada: dEnt, salida: dSal }, 0);
    const c1 = ctx.createDelay(0.1), c2 = ctx.createDelay(0.1), cE = ctx.createGain(), cS = ctx.createGain(), l1 = ctx.createOscillator(), l2 = ctx.createOscillator(), lg1 = ctx.createGain(), lg2 = ctx.createGain();
    c1.delayTime.value = 0.022; c2.delayTime.value = 0.031; l1.frequency.value = 0.7; l2.frequency.value = 0.93; lg1.gain.value = 0.004; lg2.gain.value = 0.005; l1.connect(lg1); lg1.connect(c1.delayTime); l2.connect(lg2); lg2.connect(c2.delayTime); cE.connect(c1); cE.connect(c2); c1.connect(cS); c2.connect(cS); l1.start(); l2.start();
    const mC = mezcla(ctx, mD.sal, { entrada: cE, salida: cS }, 0);
    const dl = ctx.createDelay(2), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(), dE = ctx.createGain(), dS = ctx.createGain(); dlp.type = 'lowpass'; dlp.frequency.value = 3500; dE.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(dS); fb.gain.value = 0.38;
    const mDl = mezcla(ctx, mC.sal, { entrada: dE, salida: dS }, 0);
    const cv = ctx.createConvolver(), rE = ctx.createGain(), rS = ctx.createGain(); rE.connect(cv); cv.connect(rS); const mR = mezcla(ctx, mDl.sal, { entrada: rE, salida: rS }, 0);
    Y.master = ctx.createGain(); mR.sal.connect(Y.master); Y.master.connect(destino);
    Y.lfo = ctx.createOscillator(); Y.lP = ctx.createGain(); Y.lF = ctx.createGain(); Y.lA = ctx.createGain(); Y.lfo.connect(Y.lP); Y.lfo.connect(Y.lF); Y.lfo.connect(Y.lA); Y.lA.connect(Y.trem.gain); Y.lfo.start();
    let revT = -1;
    Y.aplicar = function (p) {
      if (p) Y.patch = JSON.parse(JSON.stringify(p)); const P = Y.patch, t = ctx.currentTime; P.fx = Object.assign({ dist: 0, coro: 0, delay: 0, rev: 0 }, P.fx);
      dist.curve = curva(P.fx.dist); mD.set(P.fx.dist > 0.01 ? 1 : 0); mC.set(P.fx.coro); mDl.set(P.fx.delay); dl.delayTime.setTargetAtTime(Math.min(1.9, P.fx.tiempo || 0.32), t, 0.02); fb.gain.setTargetAtTime(Math.min(0.9, P.fx.fb == null ? 0.38 : P.fx.fb), t, 0.02);
      const rt = P.fx.revT || 2.2; if (rt !== revT) { cv.buffer = impulso(ctx, rt); revT = rt; } mR.set(P.fx.rev);
      Y.lfo.type = P.lfo.t || 'sine'; Y.lfo.frequency.setTargetAtTime(P.lfo.hz || 5, t, 0.02); const pr = P.lfo.prof || 0;
      Y.lP.gain.setTargetAtTime(P.lfo.dest === 'pitch' ? pr * 100 : 0, t, 0.02); Y.lF.gain.setTargetAtTime(P.lfo.dest === 'filtro' ? pr * 2400 : 0, t, 0.02); Y.lA.gain.setTargetAtTime(P.lfo.dest === 'amp' ? pr * 0.5 : 0, t, 0.02); Y.trem.gain.setTargetAtTime(P.lfo.dest === 'amp' ? 1 - pr * 0.5 : 1, t, 0.02);
      Y.master.gain.setTargetAtTime((P.vol == null ? 0.8 : P.vol) * 0.8, t, 0.02);
    };
    function crearVoz(midi, t, vel) {
      const P = Y.patch, v = { midi, t0: t, vel, osc: [], nodos: [] }, gA = ctx.createGain(), fl = ctx.createBiquadFilter(), peak = Math.pow(vel, 1.4) * 0.32;
      fl.type = P.filtro.t || 'lowpass'; fl.Q.value = P.filtro.q || 1; const fc = P.filtro.fc, fpk = Math.min(18000, fc * Math.pow(2, P.filtro.env || 0) * (0.7 + 0.5 * vel)), ef = P.ef, ea = P.ea;
      fl.frequency.setValueAtTime(fc, t); if ((P.filtro.env || 0) > 0) { fl.frequency.exponentialRampToValueAtTime(Math.max(fpk, fc + 1), t + Math.max(ef.a, 0.002)); fl.frequency.setTargetAtTime(fc * Math.pow(fpk / fc, ef.s), t + ef.a, ef.d / 3 + 0.001); }
      gA.gain.setValueAtTime(0.0001, t); gA.gain.linearRampToValueAtTime(peak, t + Math.max(ea.a, 0.002)); gA.gain.setTargetAtTime(peak * ea.s, t + ea.a, ea.d / 3 + 0.001);
      [P.o1, P.o2].forEach((o) => { if (!o || !o.vol) return; const os = ctx.createOscillator(), og = ctx.createGain(); os.type = o.t; os.frequency.value = f2(midi + 12 * (o.oct || 0)); os.detune.value = (o.det || 0) + Y.bend; og.gain.value = o.vol; os.connect(og); og.connect(fl); Y.lP.connect(os.detune); os.start(t); v.osc.push({ os, og }); });
      Y.lF.connect(fl.detune); fl.connect(gA); gA.connect(Y.entrada); v.gA = gA; v.fl = fl; v.peak = peak; v.fc = fc; v.fpk = fpk; return v;
    }
    function fin(v, t, rel) { // programa la liberacion en t (desde el nivel actual de la envolvente)
      const P = Y.patch, r = Math.max(0.01, P.ea.r), dt = t - v.t0; const lv = nivelEnv(P.ea, dt) * v.peak; v.gA.gain.cancelScheduledValues(t); v.gA.gain.setValueAtTime(Math.max(lv, 0.0001), t); v.gA.gain.setTargetAtTime(0, t, r / 3);
      if ((P.filtro.env || 0) > 0) { const fl = nivelEnv(P.ef, dt), cur = v.fc * Math.pow(v.fpk / v.fc, fl); v.fl.frequency.cancelScheduledValues(t); v.fl.frequency.setValueAtTime(cur, t); v.fl.frequency.setTargetAtTime(v.fc, t, Math.max(0.01, P.ef.r) / 3); }
      const stop = t + r * 1.8 + 0.1; v.osc.forEach((o) => { o.os.stop(stop); }); v.fin = stop; v.osc[0] && (v.osc[0].os.onended = () => { v.osc.forEach((o) => { try { Y.lP.disconnect(o.os.detune); } catch (e) {} o.os.disconnect(); }); try { Y.lF.disconnect(v.fl.detune); } catch (e) {} v.gA.disconnect(); v.fl.disconnect(); Y.activas = Y.activas.filter((x) => x !== v); });
    }
    /* nota programada con duracion conocida */
    Y.nota = function (midi, t, dur, vel) { const v = crearVoz(midi, t, vel == null ? 0.8 : vel); const a = Math.min(Y.patch.ea.a, dur * 0.9); if (a < Y.patch.ea.a) { v.gA.gain.cancelScheduledValues(t); v.gA.gain.setValueAtTime(0.0001, t); v.gA.gain.linearRampToValueAtTime(v.peak, t + Math.max(a, 0.002)); } Y.activas.push(v); fin(v, t + Math.max(dur, 0.02), true); return v; };
    /* notas en vivo */
    Y.on = function (midi, vel) {
      if (Y.vivas.has(midi)) Y.off(midi); if (Y.activas.length >= Y.max) { const viejo = Y.activas.find((x) => !x.fin); if (viejo) { fin(viejo, ctx.currentTime + 0.0, true); } }
      const v = crearVoz(midi, ctx.currentTime, vel == null ? 0.8 : vel); Y.vivas.set(midi, v); Y.activas.push(v); return v;
    };
    Y.off = function (midi) { const v = Y.vivas.get(midi); if (!v) return; Y.vivas.delete(midi); fin(v, ctx.currentTime, true); };
    Y.todoOff = () => { Array.from(Y.vivas.keys()).forEach((m) => Y.off(m)); };
    Y.pitchBend = (cents) => { Y.bend = cents; Y.activas.forEach((v) => v.osc.forEach((o, i) => { const base = (i ? Y.patch.o2 : Y.patch.o1).det || 0; o.os.detune.setTargetAtTime(base + cents, ctx.currentTime, 0.01); })); };
    Y.aplicar(); return Y;
  };

  /* ---------- caja de ritmos ---------- */
  S.KITS = {
    '808': { bombo: { f0: 150, f1: 42, dec: 0.55, click: 0.3 }, caja: { tono: 185, dec: 0.2, nz: 0.7, hp: 1800 }, hatc: { hp: 7500, dec: 0.045 }, hata: { hp: 7000, dec: 0.28 }, palmas: { bp: 1400, dec: 0.18 }, tom: { f: 110, dec: 0.38 }, rim: { f: 1700, dec: 0.04 }, cencerro: { f1: 560, f2: 835, dec: 0.3 }, lp: 20000 },
    'Electro': { bombo: { f0: 210, f1: 55, dec: 0.3, click: 0.6 }, caja: { tono: 220, dec: 0.13, nz: 1, hp: 2500 }, hatc: { hp: 9500, dec: 0.03 }, hata: { hp: 9000, dec: 0.2 }, palmas: { bp: 1800, dec: 0.12 }, tom: { f: 150, dec: 0.25 }, rim: { f: 2100, dec: 0.03 }, cencerro: { f1: 700, f2: 1040, dec: 0.2 }, lp: 20000 },
    'Seco': { bombo: { f0: 120, f1: 55, dec: 0.22, click: 0.15 }, caja: { tono: 170, dec: 0.12, nz: 0.5, hp: 1500 }, hatc: { hp: 6500, dec: 0.025 }, hata: { hp: 6000, dec: 0.12 }, palmas: { bp: 1200, dec: 0.1 }, tom: { f: 95, dec: 0.2 }, rim: { f: 1500, dec: 0.03 }, cencerro: { f1: 520, f2: 780, dec: 0.15 }, lp: 20000 },
    'Lo-fi': { bombo: { f0: 130, f1: 48, dec: 0.4, click: 0.1 }, caja: { tono: 175, dec: 0.22, nz: 0.8, hp: 1000 }, hatc: { hp: 5000, dec: 0.05 }, hata: { hp: 4500, dec: 0.25 }, palmas: { bp: 1000, dec: 0.2 }, tom: { f: 100, dec: 0.35 }, rim: { f: 1300, dec: 0.05 }, cencerro: { f1: 500, f2: 750, dec: 0.3 }, lp: 4200 }
  };
  const ruido = new WeakMap();
  function bufRuido(ctx) { let b = ruido.get(ctx); if (!b) { b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; ruido.set(ctx, b); } return b; }
  S.bateria = function (ctx, destino, kit) {
    const Bt = { kit: kit || '808', muestras: {}, vol: 1 }, bus = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; bus.connect(lp); lp.connect(destino); bus.gain.value = 0.9;
    const nz = (t, dur, hp, bp, vol, tipo) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g2 = ctx.createGain(); s.buffer = bufRuido(ctx); f.type = tipo || (bp ? 'bandpass' : 'highpass'); f.frequency.value = bp || hp; f.Q.value = bp ? 1.2 : 0.7; g2.gain.setValueAtTime(vol, t); g2.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g2); g2.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); };
    const to = (t, f0, f1, dec, vol, tipo) => { const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = tipo || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dec * 0.55); g2.gain.setValueAtTime(vol, t); g2.gain.exponentialRampToValueAtTime(0.0008, t + dec); o.connect(g2); g2.connect(bus); o.start(t); o.stop(t + dec + 0.02); };
    Bt.golpe = function (nombre, t, vel) {
      vel = (vel == null ? 0.8 : vel) * Bt.vol; const k = S.KITS[Bt.kit] || S.KITS['808']; lp.frequency.value = k.lp;
      if (Bt.muestras[nombre]) { const s = ctx.createBufferSource(), g2 = ctx.createGain(); s.buffer = Bt.muestras[nombre]; g2.gain.value = vel; s.connect(g2); g2.connect(bus); s.start(t); return; }
      const c = k[nombre]; if (!c) return;
      if (nombre === 'bombo') { to(t, c.f0, c.f1, c.dec, vel * 1.1); if (c.click) nz(t, 0.012, 3000, 0, vel * c.click * 0.5); }
      else if (nombre === 'caja') { to(t, c.tono, c.tono * 0.7, c.dec * 0.6, vel * 0.55, 'triangle'); nz(t, c.dec, c.hp, 0, vel * c.nz * 0.8); }
      else if (nombre === 'hatc' || nombre === 'hata') nz(t, c.dec, c.hp, 0, vel * 0.45);
      else if (nombre === 'palmas') { nz(t, c.dec, 0, c.bp, vel * 0.9); nz(t + 0.012, c.dec, 0, c.bp, vel * 0.7); nz(t + 0.026, c.dec * 1.4, 0, c.bp, vel * 0.6); }
      else if (nombre === 'tom') to(t, c.f * 1.6, c.f, c.dec, vel);
      else if (nombre === 'rim') { to(t, c.f, c.f * 0.8, c.dec, vel * 0.6, 'square'); nz(t, c.dec, 3500, 0, vel * 0.3); }
      else if (nombre === 'cencerro') { to(t, c.f1, c.f1, c.dec, vel * 0.35, 'square'); to(t, c.f2, c.f2, c.dec, vel * 0.35, 'square'); }
    };
    return Bt;
  };
  /* clic del metronomo */
  S.clic = function (ctx, destino, t, tipo, vol) {
    const o = ctx.createOscillator(), g2 = ctx.createGain(), f = { fuerte: 1700, medio: 1300, debil: 1000, sub: 720 }[tipo] || 1000, v = (vol == null ? 0.8 : vol) * ({ fuerte: 1, medio: 0.8, debil: 0.65, sub: 0.35 }[tipo] || 0.6);
    o.type = tipo === 'fuerte' ? 'square' : 'sine'; o.frequency.value = f; g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(v * 0.6, t + 0.002); g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.055); o.connect(g2); g2.connect(destino); o.start(t); o.stop(t + 0.08);
  };
  /* render offline de un proyecto (vueltas del rollo) -> AudioBuffer estereo */
  S.renderizar = async function (proy, vueltas, sr, muestras) {
    const ev = g.MuProy.eventos(proy, vueltas), cola = 2.5, n = Math.ceil((ev.duracion + cola) * sr), ctx = new g.OfflineAudioContext(2, n, sr), master = ctx.createGain(), lim = ctx.createDynamicsCompressor(); master.gain.value = 0.7; lim.threshold.value = -4; lim.ratio.value = 20; lim.knee.value = 0; master.connect(lim); lim.connect(ctx.destination);
    const bat = S.bateria(ctx, master, proy.kit), sints = proy.rollo.pistas.map((t) => S.crear(ctx, master, t.preset === 'Mi sintetizador' && proy.patch ? proy.patch : S.PRESETS[t.preset] || S.PRESETS['Lead brillante']));
    if (muestras) Object.keys(muestras).forEach((k) => { bat.muestras[k] = muestras[k]; });
    ev.golpes.forEach((e) => bat.golpe(g.MuProy.CLAVES_RITMO[e.pista], e.t + 0.02, e.vel)); ev.notas.forEach((e) => sints[e.pista].nota(e.nota, e.t + 0.02, e.dur, e.vel));
    const buf = await ctx.startRendering(); let pico = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pico) pico = a; } }
    if (pico > 0.97) { const k = 0.95 / pico; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; } }
    return buf;
  };
  S.aWav = (buf) => g.MuFmt.wavEscribir(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), buf.sampleRate);
})(window);
