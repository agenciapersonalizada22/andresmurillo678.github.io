// Sonido y musica procedurales (WebAudio), sin archivos. El audio arranca con el primer gesto.
let ctx = null, maestro, fx, mus, ruido, musOn = false, tMus = 0, paso = 0;
const vol = { maestro: 0.8, musica: 0.45, efectos: 0.9 };

export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    ctx = new AC(); maestro = ctx.createGain();
    const comp = ctx.createDynamicsCompressor(); maestro.connect(comp); comp.connect(ctx.destination);
    fx = ctx.createGain(); fx.connect(maestro); mus = ctx.createGain(); mus.connect(maestro);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    volumenes(vol);
    if (musOn) arrancarMusica();
  } catch (e) { ctx = null; }
}
export function volumenes(v) {
  Object.assign(vol, v);
  if (!ctx) return;
  maestro.gain.setTargetAtTime(vol.maestro, ctx.currentTime, 0.03);
  fx.gain.setTargetAtTime(vol.efectos, ctx.currentTime, 0.03);
  mus.gain.setTargetAtTime(vol.musica * 0.5, ctx.currentTime, 0.1);
}
export const pausar = () => { if (ctx && ctx.state === 'running') ctx.suspend(); };
export const reanudar = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };

function tono(f, dur, tipo, v, t0, f2, dest) {
  if (!ctx) return;
  const t = ctx.currentTime + (t0 || 0), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || fx); o.start(t); o.stop(t + dur + 0.05);
}
function golpe(dur, v, freq, t0, q) {
  if (!ctx) return;
  const t = ctx.currentTime + (t0 || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido; f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = q || 1;
  g.gain.setValueAtTime(v || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(fx); s.start(t, Math.random() * 0.5, dur + 0.02);
}
export const sfx = {
  click: () => tono(880, 0.05, 'triangle', 0.08),
  error: () => { tono(180, 0.18, 'square', 0.08); tono(140, 0.2, 'square', 0.08, 0.1); },
  dado: () => { for (let i = 0; i < 7; i++) golpe(0.05, 0.25, 900 + Math.random() * 1400, i * 0.09 + Math.random() * 0.03, 3); },
  paso: () => tono(520 + Math.random() * 40, 0.07, 'triangle', 0.1),
  compra: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.22, 'triangle', 0.14, i * 0.07)); golpe(0.08, 0.1, 5000, 0.28); },
  ganar: () => { tono(1319, 0.12, 'sine', 0.12); tono(1760, 0.25, 'sine', 0.12, 0.08); },
  perder: () => tono(330, 0.3, 'sawtooth', 0.07, 0, 150),
  renta: () => { tono(260, 0.25, 'sawtooth', 0.08, 0, 120); golpe(0.1, 0.15, 400); },
  construir: () => { golpe(0.06, 0.4, 700, 0, 5); golpe(0.06, 0.4, 700, 0.14, 5); tono(150, 0.1, 'square', 0.08, 0.24, 90); },
  carta: () => golpe(0.2, 0.18, 3200, 0, 0.6),
  carcel: () => { tono(90, 0.5, 'square', 0.2, 0, 45); golpe(0.3, 0.3, 300); },
  turno: () => { tono(784, 0.3, 'sine', 0.1); tono(988, 0.4, 'sine', 0.1, 0.12); },
  subasta: () => { golpe(0.06, 0.5, 500, 0, 6); golpe(0.06, 0.5, 500, 0.18, 6); },
  puja: () => tono(660, 0.1, 'square', 0.07, 0, 880),
  trato: () => { [392, 494, 587].forEach((f, i) => tono(f, 0.25, 'sine', 0.13, i * 0.1)); },
  quiebra: () => { tono(220, 0.8, 'sawtooth', 0.12, 0, 55); golpe(0.5, 0.2, 200); },
  fin: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.3, 'triangle', 0.15, i * 0.14)); }
};
const ACORDES = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]];
function compas() {
  if (!ctx || !musOn) return;
  const c = ACORDES[paso % 4], t0 = Math.max(0, tMus - ctx.currentTime);
  c.forEach((f) => { tono(f / 2, 3.6, 'sine', 0.09, t0, null, mus); tono(f, 3.6, 'triangle', 0.025, t0, null, mus); });
  const arp = [0, 1, 2, 1, 2, 1, 0, 2];
  arp.forEach((k, i) => { if (Math.random() < 0.7) tono(c[k] * 2, 0.45, 'sine', 0.05, t0 + i * 0.5, null, mus); });
  paso++; tMus += 4;
}
let timer = 0;
function arrancarMusica() {
  if (!ctx || timer) return;
  tMus = ctx.currentTime + 0.1; compas();
  timer = setInterval(() => { if (ctx && ctx.state === 'running' && tMus - ctx.currentTime < 2.5) compas(); }, 600);
}
export function musica(on) {
  musOn = !!on;
  if (!musOn) { clearInterval(timer); timer = 0; return; }
  arrancarMusica();
}
