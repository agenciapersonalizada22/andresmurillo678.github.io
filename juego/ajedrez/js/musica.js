// =============================================================
//  🎵  MÚSICA AMBIENTAL
//  Una pieza suave que nunca se repite igual: acordes largos con
//  osciladores filtrados, un poco de eco (reverb generada) y notas
//  sueltas tipo campana de una escala pentatónica.
// =============================================================
import { obtenerCtx, salidaMusica } from './sonido.js';

const ACORDES = [
  [57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 66],
  [57, 60, 64, 69], [50, 57, 62, 65], [52, 56, 59, 64], [57, 60, 64, 67],
];
const PENTA = [69, 72, 74, 76, 79, 81, 84];
const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);

let activa = false;
let reverb = null, bus = null;
let timer = 0;
let proximo = 0;
let paso = 0;

function crearReverb(ctx) {
  const dur = 3.2, rate = ctx.sampleRate;
  const buf = ctx.createBuffer(2, rate * dur, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function preparar(ctx) {
  if (bus) return;
  bus = ctx.createGain();
  bus.gain.value = 0;
  reverb = crearReverb(ctx);
  const seco = ctx.createGain(); seco.gain.value = 0.55;
  const humedo = ctx.createGain(); humedo.gain.value = 0.7;
  bus.connect(seco); bus.connect(reverb); reverb.connect(humedo);
  seco.connect(salidaMusica()); humedo.connect(salidaMusica());
}

function acorde(ctx, t, notas, dur) {
  for (const n of notas) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = nota(n - 12);
      o.detune.value = det;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(f); f.connect(g); g.connect(bus);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }
}

function campana(ctx, t, n) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator();
  o.type = 'sine'; o2.type = 'sine';
  o.frequency.value = nota(n); o2.frequency.value = nota(n) * 2.01;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 2.4);
  const g2 = ctx.createGain(); g2.gain.value = 0.25;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus);
  o.start(t); o2.start(t); o.stop(t + 2.6); o2.stop(t + 2.6);
}

function programar() {
  const ctx = obtenerCtx();
  if (!ctx || !activa) return;
  if (ctx.state !== 'running') return; // en pausa: se reprograma al volver
  while (proximo < ctx.currentTime + 1.5) {
    if (proximo < ctx.currentTime) proximo = ctx.currentTime + 0.05;
    const dur = 7;
    acorde(ctx, proximo, ACORDES[paso % ACORDES.length], dur + 1.5);
    const cuantas = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < cuantas; i++) {
      campana(ctx, proximo + 0.8 + Math.random() * (dur - 1.5), PENTA[Math.floor(Math.random() * PENTA.length)]);
    }
    paso++;
    proximo += dur;
  }
}

export function iniciarMusica() {
  const ctx = obtenerCtx();
  if (!ctx) return false;
  preparar(ctx);
  if (activa) return true;
  activa = true;
  proximo = ctx.currentTime + 0.1;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
  programar();
  timer = setInterval(programar, 500);
  return true;
}

export function detenerMusica() {
  const ctx = obtenerCtx();
  if (!activa) return;
  activa = false;
  clearInterval(timer);
  if (ctx && bus) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
}
