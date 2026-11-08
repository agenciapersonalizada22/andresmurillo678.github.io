// Sonido sintetizado con WebAudio (sin archivos): rodar de la bola, choques, fanfarrias y musica ambiental opcional.
let ctx = null, maestro, bus = {}, rodar = null, mus = null, cfg = { maestro: 0.8, musica: 0.3, efectos: 0.9, musicaOn: false, pausaOculta: true }, ultimoChoque = 0, ruidoBuf = null;

function iniciar() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC(); } catch (e) { return false; }
  maestro = ctx.createGain(); maestro.connect(ctx.destination);
  bus.fx = ctx.createGain(); bus.fx.connect(maestro);
  bus.mus = ctx.createGain(); bus.mus.connect(maestro);
  ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  aplicar();
  return true;
}
function aplicar() {
  if (!ctx) return;
  maestro.gain.value = cfg.maestro; bus.fx.gain.value = cfg.efectos; bus.mus.gain.value = cfg.musica * 0.5;
}
function tono(f, dur, tipo, vol, t0, f2) {
  const t = ctx.currentTime + (t0 || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus.fx); o.start(t); o.stop(t + dur + 0.05);
}
function ruido(dur, vol, fi, tipo, t0, q) {
  const t = ctx.currentTime + (t0 || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruidoBuf; f.type = tipo || 'bandpass'; f.frequency.value = fi; f.Q.value = q || 1;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus.fx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const FX = {
  click: () => tono(660, 0.06, 'triangle', 0.15),
  ok: () => { tono(520, 0.1, 'triangle', 0.2); tono(780, 0.14, 'triangle', 0.2, 0.08); },
  mal: () => tono(220, 0.25, 'sawtooth', 0.15, 0, 120),
  moneda: () => { tono(988, 0.08, 'square', 0.1); tono(1319, 0.2, 'square', 0.1, 0.07); },
  lanzar: (f) => { ruido(0.25, 0.25, 500, 'lowpass'); tono(120, 0.2, 'sine', 0.2 + 0.2 * (f || 0), 0, 60); },
  golpeBola: (f) => { ruido(0.22, Math.min(0.9, 0.3 + f * 0.05), 1800, 'bandpass', 0, 0.8); tono(180 + Math.random() * 60, 0.2, 'triangle', 0.3, 0, 90); },
  golpePino: (f) => {
    const n = performance.now(); if (n - ultimoChoque < 28) return; ultimoChoque = n;
    const v = Math.min(0.5, 0.08 + f * 0.04);
    tono(900 + Math.random() * 900, 0.09, 'square', v * 0.35, 0, 500); ruido(0.08, v, 2600 + Math.random() * 2000, 'bandpass', 0, 2);
  },
  caida: () => ruido(0.35, 0.18, 700, 'lowpass'),
  strike: () => { [523, 659, 784, 1046].forEach((f, k) => tono(f, 0.35, 'triangle', 0.22, k * 0.09)); ruido(0.7, 0.35, 3000, 'highpass', 0, 0.5); },
  spare: () => { tono(587, 0.2, 'triangle', 0.2); tono(880, 0.3, 'triangle', 0.2, 0.12); },
  canal: () => { tono(150, 0.5, 'sine', 0.3, 0, 60); ruido(0.6, 0.15, 300, 'lowpass'); },
  logro: () => { [659, 880, 1175].forEach((f, k) => tono(f, 0.3, 'square', 0.12, k * 0.12)); },
  explosion: () => { ruido(0.6, 0.6, 400, 'lowpass'); tono(90, 0.5, 'sawtooth', 0.35, 0, 30); },
  fin: () => { [392, 523, 659, 784, 1046].forEach((f, k) => tono(f, 0.4, 'triangle', 0.2, k * 0.12)); }
};

function bucleMusica() {
  if (!ctx || !cfg.musicaOn || mus) return;
  const escala = [0, 3, 7, 10, 12, 10, 7, 3], base = 110;
  let k = 0, prox = ctx.currentTime + 0.1;
  const gen = () => {
    if (!mus) return;
    while (prox < ctx.currentTime + 0.6) {
      const f = base * Math.pow(2, escala[k % 8] / 12), t = prox - ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = k % 4 === 0 ? f / 2 : f * 2;
      g.gain.setValueAtTime(0.0001, prox); g.gain.exponentialRampToValueAtTime(0.22, prox + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, prox + 0.4);
      o.connect(g); g.connect(bus.mus); o.start(prox); o.stop(prox + 0.45);
      void t; prox += 0.3; k++;
    }
  };
  mus = setInterval(gen, 200); gen();
}

export const Sonido = {
  ajustar(c) { Object.assign(cfg, c || {}); aplicar(); if (!cfg.musicaOn) Sonido.musica(false); else if (ctx) bucleMusica(); },
  despertar() { if (iniciar() && ctx.state === 'suspended') ctx.resume(); if (cfg.musicaOn) bucleMusica(); },
  fx(n, p) { if (!ctx || ctx.state !== 'running') return; try { (FX[n] || FX.click)(p); } catch (e) { /* audio no disponible */ } },
  musica(on) { if (on) { cfg.musicaOn = true; if (iniciar()) bucleMusica(); } else if (mus) { clearInterval(mus); mus = null; } },
  rodar(v) {
    if (!ctx || ctx.state !== 'running') return;
    if (v <= 0) { if (rodar) { rodar.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); const r = rodar; rodar = null; setTimeout(() => { try { r.s.stop(); } catch (e) { /* ya parado */ } }, 300); } return; }
    if (!rodar) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = ruidoBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(bus.fx); s.start();
      rodar = { s, f, g };
    }
    rodar.g.gain.setTargetAtTime(Math.min(0.5, 0.08 + v * 0.3), ctx.currentTime, 0.05);
    rodar.f.frequency.setTargetAtTime(200 + v * 500, ctx.currentTime, 0.05);
  },
  pausar() { if (ctx && ctx.state === 'running') ctx.suspend(); },
  reanudar() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
};
document.addEventListener('visibilitychange', () => { if (!cfg.pausaOculta) return; if (document.hidden) Sonido.pausar(); else Sonido.reanudar(); });
