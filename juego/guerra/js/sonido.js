// =============================================================
//  SONIDO: todo se inventa con WebAudio (sin archivos).
//  El audio arranca con el primer toque o tecla (iOS lo exige).
// =============================================================
import { CONFIG } from './config.js';
import { cargarOpciones, guardarOpciones } from './guardado.js';

let ctx = null;
let maestro = null;
let efectos = null;
let busMusica = null;
let bufferRuido = null;
let activos = cargarOpciones().efectos !== false;
const ultima = {};

function iniciar() {
  if (ctx) {
    if (ctx.state !== 'running' && ctx.state !== 'closed' && !document.hidden) {
      const pr = ctx.resume();
      if (pr && pr.catch) pr.catch(() => {});
    }
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { ctx = null; return null; }
  maestro = ctx.createGain();
  maestro.connect(ctx.destination);
  efectos = ctx.createGain();
  efectos.gain.value = activos ? CONFIG.audio.volumen : 0;
  efectos.connect(maestro);
  busMusica = ctx.createGain();
  busMusica.connect(maestro);
  // 1 segundo de ruido blanco que se reutiliza en todo
  bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = bufferRuido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // truco iOS: un sonido mudo dentro del gesto del usuario
  const s = ctx.createBufferSource();
  s.buffer = ctx.createBuffer(1, 1, 22050);
  s.connect(ctx.destination);
  s.start(0);
  return ctx;
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  const pr = document.hidden ? ctx.suspend() : ctx.resume();
  if (pr && pr.catch) pr.catch(() => {});
});

function listo(nombre, espera) {
  if (!ctx || !activos || ctx.state !== 'running') return false;
  const t = ctx.currentTime;
  if (ultima[nombre] !== undefined && t - ultima[nombre] < espera) return false;
  ultima[nombre] = t;
  return true;
}

function ruido(t, dur, tipo, f0, f1, vol, q = 1) {
  const s = ctx.createBufferSource();
  s.buffer = bufferRuido;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = tipo;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(efectos);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

function tono(t, dur, onda, f0, f1, vol) {
  const o = ctx.createOscillator();
  o.type = onda;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(efectos);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const porDistancia = (d) => Math.max(0, 1 - d / 900);

// Motor continuo (avión: silbido agudo · tanque: rumor grave)
const motor = {
  nodos: null,
  iniciar(tipo) {
    if (!ctx || this.nodos) return;
    const avion = tipo === 'avion';
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = avion ? 700 : 240;
    const g = ctx.createGain();
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(efectos);
    const s = ctx.createBufferSource();
    s.buffer = bufferRuido;
    s.loop = true;
    const fr = ctx.createBiquadFilter();
    fr.type = avion ? 'highpass' : 'lowpass';
    fr.frequency.value = avion ? 2500 : 300;
    const gr = ctx.createGain();
    gr.gain.value = 0;
    s.connect(fr); fr.connect(gr); gr.connect(efectos);
    o1.start(); o2.start(); s.start();
    this.nodos = { avion, o1, o2, f, g, s, gr };
  },
  ajustar(nivel) {
    const n = this.nodos;
    if (!n || !ctx) return;
    const t = ctx.currentTime;
    const base = n.avion ? 55 + nivel * 90 : 30 + nivel * 26;
    n.o1.frequency.setTargetAtTime(base, t, 0.12);
    n.o2.frequency.setTargetAtTime(base * 1.51, t, 0.12);
    n.g.gain.setTargetAtTime(activos ? (n.avion ? 0.07 : 0.11) : 0, t, 0.2);
    n.gr.gain.setTargetAtTime(activos ? (n.avion ? 0.015 + nivel * 0.06 : 0.02 + nivel * 0.05) : 0, t, 0.2);
  },
  parar() {
    const n = this.nodos;
    if (!n) return;
    this.nodos = null;
    try { n.o1.stop(); n.o2.stop(); n.s.stop(); } catch (e) { /* ya parado */ }
  },
};

export const Sonido = {
  iniciar,
  contexto: () => ctx,
  salidaMusica: () => busMusica,
  porDistancia,
  motor,
  efectosActivos: () => activos,
  alternarEfectos() {
    activos = !activos;
    if (efectos) efectos.gain.value = activos ? CONFIG.audio.volumen : 0;
    const o = cargarOpciones();
    o.efectos = activos;
    guardarOpciones(o);
    return activos;
  },
  disparo(tipo, vol = 1) {
    if (vol <= 0.03 || !listo('d' + tipo, tipo === 'ametralladora' ? 0.05 : 0.1)) return;
    const t = ctx.currentTime;
    if (tipo === 'ametralladora') {
      ruido(t, 0.06, 'bandpass', 2200, 900, 0.3 * vol, 0.8);
      tono(t, 0.04, 'square', 170, 90, 0.08 * vol);
    } else if (tipo === 'canon') {
      ruido(t, 0.45, 'lowpass', 1400, 120, 1.0 * vol, 0.7);
      tono(t, 0.5, 'sine', 130, 32, 0.9 * vol);
    } else if (tipo === 'misil') {
      ruido(t, 0.8, 'bandpass', 500, 3200, 0.38 * vol, 1.2);
    } else {
      ruido(t, 0.14, 'bandpass', 600, 250, 0.4 * vol, 1);
      tono(t, 0.12, 'triangle', 220, 80, 0.2 * vol);
    }
  },
  explosion(tam = 1, vol = 1) {
    if (vol <= 0.03 || !listo('exp', 0.05)) return;
    const t = ctx.currentTime;
    const dur = 0.5 + Math.min(1.4, tam * 0.5);
    ruido(t, dur, 'lowpass', 2600, 90, Math.min(1.2, 0.7 * vol * (0.6 + tam * 0.3)), 0.8);
    tono(t, dur, 'sine', 90, 28, 0.9 * vol);
  },
  impacto(vol = 1) {
    if (vol <= 0.03 || !listo('imp', 0.06)) return;
    const t = ctx.currentTime;
    ruido(t, 0.1, 'bandpass', 1500, 500, 0.35 * vol, 1.5);
    tono(t, 0.08, 'square', 300, 120, 0.1 * vol);
  },
  alarma() {
    if (!listo('alarma', 0.5)) return;
    const t = ctx.currentTime;
    tono(t, 0.12, 'square', 880, 860, 0.12);
    tono(t + 0.18, 0.12, 'square', 880, 860, 0.12);
  },
  bip() {
    if (!listo('bip', 0.2)) return;
    tono(ctx.currentTime, 0.08, 'sine', 1400, 1400, 0.12);
  },
};
