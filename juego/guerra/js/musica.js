// =============================================================
//  MÚSICA: banda sonora militar inventada con código (La menor).
//  Bajo, batería, cuerdas y una melodía suelta que sube de
//  intensidad cuando hay combate.
// =============================================================
import { CONFIG } from './config.js';
import { Sonido } from './sonido.js';
import { cargarOpciones, guardarOpciones } from './guardado.js';

const ACORDES = [[45, [57, 60, 64]], [41, [53, 57, 60]], [43, [55, 59, 62]], [40, [52, 55, 59]]];
const ESCALA = [69, 72, 74, 76, 79, 81, 84];
const PASOS = 16;
const ADELANTO = 0.3;

let activa = cargarOpciones().musica !== false;
let ctx = null;
let salida = null;
let reloj = null;
let intensidad = 0.3;
let paso = 0;
let compas = 0;
let proxima = 0;
let nota = 2;
let buffer = null;

const frec = (m) => 440 * Math.pow(2, (m - 69) / 12);

function preparar() {
  ctx = Sonido.contexto();
  if (!ctx) return false;
  if (salida) return true;
  salida = ctx.createGain();
  salida.gain.value = activa ? CONFIG.audio.volumenMusica : 0;
  salida.connect(Sonido.salidaMusica());
  buffer = ctx.createBuffer(1, ctx.sampleRate >> 1, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

function nota1(t, midi, dur, onda, vol, corte, ataque = 0.01) {
  const o = ctx.createOscillator();
  o.type = onda;
  o.frequency.value = frec(midi);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = corte;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(salida);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function golpe(t, tipo, vol) {
  if (tipo === 'bombo') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(salida);
    o.start(t);
    o.stop(t + 0.25);
    return;
  }
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = tipo === 'caja' ? 'bandpass' : 'highpass';
  f.frequency.value = tipo === 'caja' ? 1800 : 7000;
  const g = ctx.createGain();
  const dur = tipo === 'caja' ? 0.13 : 0.04;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(salida);
  s.start(t);
  s.stop(t + dur + 0.02);
}

function programar(t) {
  const [bajo, acorde] = ACORDES[compas % ACORDES.length];
  const tiempo = 60 / (96 + intensidad * 24) / 2; // un paso = una corchea
  if (paso === 0) {
    for (const m of acorde) nota1(t, m + 12, tiempo * PASOS * 0.95, 'sawtooth', 0.025, 700, 0.6);
  }
  if (paso % 2 === 0) nota1(t, bajo - (paso % 4 === 2 ? 0 : 12) + 12, tiempo * 1.6, 'sawtooth', 0.09, 420);
  if (paso % 4 === 0) golpe(t, 'bombo', 0.5 + intensidad * 0.3);
  if (paso % 8 === 4 && intensidad > 0.2) golpe(t, 'caja', 0.14 + intensidad * 0.12);
  if (intensidad > 0.5 && paso % 2 === 1) golpe(t, 'hat', 0.05);
  if (paso % 2 === 0 && Math.random() < 0.2 + intensidad * 0.35) {
    nota += Math.floor(Math.random() * 3) - 1;
    nota = Math.max(0, Math.min(ESCALA.length - 1, nota));
    nota1(t, ESCALA[nota], tiempo * 2.5, 'square', 0.035, 1800, 0.02);
  }
  paso++;
  if (paso >= PASOS) { paso = 0; compas++; }
  return tiempo;
}

function ciclo() {
  if (!ctx || ctx.state !== 'running' || !activa || document.hidden) {
    if (ctx) proxima = Math.max(proxima, ctx.currentTime + 0.05);
    return;
  }
  if (proxima < ctx.currentTime - 0.5) proxima = ctx.currentTime + 0.05;
  while (proxima < ctx.currentTime + ADELANTO) proxima += programar(proxima);
}

export const Musica = {
  iniciar() {
    if (!preparar() || reloj) return;
    proxima = ctx.currentTime + 0.1;
    reloj = setInterval(ciclo, 100);
  },
  activa: () => activa,
  alternar() {
    activa = !activa;
    if (salida) salida.gain.value = activa ? CONFIG.audio.volumenMusica : 0;
    const o = cargarOpciones();
    o.musica = activa;
    guardarOpciones(o);
    return activa;
  },
  intensidad(v) { intensidad = Math.max(0, Math.min(1, v)); },
};
