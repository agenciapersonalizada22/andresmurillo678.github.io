// Sonido sintetizado (WebAudio) y musica generativa ligera.
import { A } from './almacen.js';

let ctx = null, master, bMus, bFx, musicaOn = false, tNext = 0, paso = 0, timer = 0;

function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); bMus = ctx.createGain(); bFx = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  bMus.connect(master); bFx.connect(master); master.connect(comp); comp.connect(ctx.destination);
  volumenes();
  return ctx;
}
export function volumenes() {
  if (!ctx) return;
  const a = A.audio, m = a.mute ? 0 : a.maestro;
  master.gain.value = m; bMus.gain.value = a.musica * 0.35; bFx.gain.value = a.efectos;
}
export function desbloquear() { iniciar(); }
export function suspender(s) { if (!ctx) return; (s ? ctx.suspend() : ctx.resume()).catch(() => {}); }

function tono(f, dur, o = {}) {
  if (!iniciar() || A.audio.mute) return;
  const t = ctx.currentTime + (o.retardo || 0), osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.tipo || 'sine'; osc.frequency.setValueAtTime(f, t);
  if (o.a) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.a), t + dur);
  const v = o.vol == null ? 0.4 : o.vol;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(o.bus || bFx); osc.start(t); osc.stop(t + dur + 0.03);
}
function ruido(dur, vol, fc) {
  if (!iniciar() || A.audio.mute) return;
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = fc; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(bFx); s.start();
}

let ultimoGolpe = 0;
export const S = {
  golpe(v) { const t = performance.now(); if (t - ultimoGolpe < 35) return; ultimoGolpe = t; const k = Math.min(1, v / 1500); tono(180 + k * 260, 0.11, { tipo: 'triangle', a: 90, vol: 0.25 + k * 0.5 }); ruido(0.05, 0.1 + k * 0.3, 2400); },
  pared(v) { const k = Math.min(1, v / 1200); tono(520 + k * 200, 0.07, { tipo: 'square', a: 300, vol: 0.06 + k * 0.16 }); },
  poste(v) { tono(1250, 0.35, { tipo: 'sine', vol: 0.35 }); tono(1880, 0.25, { tipo: 'sine', vol: 0.18 }); },
  obst(v) { tono(340, 0.14, { tipo: 'sawtooth', a: 760, vol: 0.18 }); },
  gol(propio) { [0, 1, 2, 3].forEach((i) => tono((propio ? [523, 659, 784, 1047] : [330, 262, 220, 165])[i], 0.28, { retardo: i * 0.09, tipo: propio ? 'triangle' : 'sawtooth', vol: 0.35 })); ruido(0.5, 0.25, 900); },
  item() { [660, 880, 1320].forEach((f, i) => tono(f, 0.12, { retardo: i * 0.06, tipo: 'square', vol: 0.18 })); },
  cuenta(fin) { tono(fin ? 880 : 440, fin ? 0.4 : 0.12, { tipo: 'square', vol: 0.2 }); },
  clic() { tono(700, 0.04, { tipo: 'square', vol: 0.1 }); },
  victoria() { [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.22, { retardo: i * 0.11, tipo: 'triangle', vol: 0.35 })); },
  derrota() { [392, 330, 262, 196].forEach((f, i) => tono(f, 0.3, { retardo: i * 0.16, tipo: 'sawtooth', vol: 0.22 })); },
  moneda() { tono(1500, 0.08, { tipo: 'square', vol: 0.12 }); tono(2000, 0.14, { retardo: 0.07, tipo: 'square', vol: 0.12 }); }
};

// Musica: arpegio sobre cuatro acordes, tempo suave.
const ACORDES = [[110, 165, 220, 277], [87.3, 131, 175, 220], [98, 147, 196, 247], [82.4, 123, 165, 207]];
function programar() {
  if (!ctx || !musicaOn) return;
  while (tNext < ctx.currentTime + 0.4) {
    const ac = ACORDES[Math.floor(paso / 16) % 4], i = paso % 16;
    const t = tNext - ctx.currentTime;
    if (i % 4 === 0) tono(ac[0] / 2, 0.38, { retardo: Math.max(0, t), tipo: 'sine', vol: 0.55, bus: bMus });
    if (i % 2 === 0) tono(ac[(i / 2 + (i > 7 ? 1 : 0)) % 4] * 2, 0.18, { retardo: Math.max(0, t), tipo: 'triangle', vol: 0.22, bus: bMus });
    if (i % 4 === 2) ruido(0.03, 0.02, 7000);
    tNext += 0.19; paso++;
  }
}
export function musica(on) {
  musicaOn = on && A.audio.musica > 0;
  clearInterval(timer);
  if (musicaOn && iniciar()) { tNext = ctx.currentTime + 0.1; timer = setInterval(programar, 120); }
}
document.addEventListener('visibilitychange', () => { if (A.audio.pausaOculta) suspender(document.hidden); });
['pointerdown', 'keydown'].forEach((e) => addEventListener(e, desbloquear, { once: false, passive: true }));
