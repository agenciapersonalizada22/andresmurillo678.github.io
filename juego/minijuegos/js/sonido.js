// Sonido sintetizado con WebAudio (sin archivos): efectos y una musica ambiental sencilla.
let ctx = null, maestro = null, bfx = null, bmus = null;
const S = { maestro: 0.8, musica: 0.25, efectos: 0.9, musicaOn: false, pausaOculta: true };
let musOn = false, tempo = 0, paso = 0, siguiente = 0, suspendido = false;

function asegurar() {
  if (ctx || typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maestro = ctx.createGain(); bfx = ctx.createGain(); bmus = ctx.createGain();
    bfx.connect(maestro); bmus.connect(maestro); maestro.connect(ctx.destination);
    vol();
  } catch (e) { ctx = null; }
  return ctx;
}
function vol() { if (!ctx) return; maestro.gain.value = S.maestro; bfx.gain.value = S.efectos; bmus.gain.value = S.musica * 0.5; }
function nota(f, dur, tipo = 'square', v = 0.2, t0 = 0, dest = bfx, f2 = null) {
  if (!ctx || suspendido) return;
  const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function ruido(dur, v = 0.2, t0 = 0) {
  if (!ctx || suspendido) return;
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = v; s.connect(g); g.connect(bfx); s.start(ctx.currentTime + t0);
}
const FX = {
  click: () => nota(660, 0.06, 'triangle', 0.18),
  ok: () => { nota(660, 0.09, 'triangle', 0.22); nota(990, 0.14, 'triangle', 0.22, 0.08); },
  mal: () => nota(220, 0.22, 'sawtooth', 0.18, 0, bfx, 110),
  tick: () => nota(880, 0.05, 'square', 0.12),
  ya: () => { nota(660, 0.12, 'square', 0.2); nota(1320, 0.3, 'square', 0.2, 0.1); },
  gana: () => [523, 659, 784, 1046, 1318].forEach((f, i) => nota(f, 0.2, 'triangle', 0.22, i * 0.09)),
  pierde: () => [392, 330, 262].forEach((f, i) => nota(f, 0.22, 'sawtooth', 0.14, i * 0.14)),
  golpe: () => { nota(160, 0.12, 'square', 0.25, 0, bfx, 60); ruido(0.08, 0.12); },
  pop: () => { ruido(0.1, 0.25); nota(900, 0.08, 'sine', 0.2, 0, bfx, 200); },
  salto: () => nota(300, 0.14, 'square', 0.14, 0, bfx, 700),
  disparo: () => { nota(900, 0.12, 'sawtooth', 0.14, 0, bfx, 200); ruido(0.05, 0.08); },
  explosion: () => { ruido(0.45, 0.4); nota(110, 0.4, 'sawtooth', 0.25, 0, bfx, 40); },
  coin: () => { nota(1200, 0.07, 'square', 0.14); nota(1600, 0.16, 'square', 0.14, 0.06); },
  toque: () => nota(500 + Math.random() * 200, 0.04, 'triangle', 0.12),
  nota0: () => nota(392, 0.3, 'sine', 0.3), nota1: () => nota(523, 0.3, 'sine', 0.3), nota2: () => nota(659, 0.3, 'sine', 0.3), nota3: () => nota(784, 0.3, 'sine', 0.3)
};
const ESC = [0, 3, 5, 7, 10, 12, 15, 17];
function planificar() {
  if (!ctx || !musOn || suspendido) return;
  while (siguiente < ctx.currentTime + 0.25) {
    const t = siguiente - ctx.currentTime;
    if (paso % 2 === 0) nota(110 * Math.pow(2, ESC[(paso / 2 * 3) % 5] / 12), 0.22, 'triangle', 0.5, t, bmus);
    if (paso % 4 !== 3 && Math.random() < 0.8) nota(330 * Math.pow(2, ESC[Math.floor(Math.random() * 8)] / 12), 0.16, 'sine', 0.35, t, bmus);
    paso++; siguiente += 0.2;
  }
}
export const Sonido = {
  ajustar(o) { Object.assign(S, o); vol(); this.musica(S.musicaOn && musOn !== false); },
  despertar() { asegurar(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
  fx(n) { if (S.efectos <= 0 || S.maestro <= 0) return; if (!asegurar()) return; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); const f = FX[n]; if (f) f(); },
  musica(on) {
    musOn = !!on && S.musicaOn;
    clearInterval(tempo);
    if (musOn && asegurar()) { siguiente = ctx.currentTime + 0.1; tempo = setInterval(planificar, 80); }
  },
  suspender(si) { suspendido = si; if (ctx) { if (si) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); } },
  get S() { return S; }
};
document.addEventListener('visibilitychange', () => { if (S.pausaOculta) Sonido.suspender(document.visibilityState === 'hidden'); });
