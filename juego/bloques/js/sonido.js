// =============================================================
//  🔊  SONIDO
//  Todos los sonidos se inventan con código (WebAudio): no hay
//  archivos de audio. Un "golpe" es un ruidito ("shhh") pasado por
//  un filtro, más un tono cortito. Cambiando el filtro suena a
//  piedra, a tierra, a madera, a vidrio...
//  El navegador solo deja sonar audio después de que tocas algo,
//  por eso iniciar() se llama con tu primer clic o tecla.
// =============================================================
import { CONFIG } from './config.js';

// Recetas: filtro, frecuencia del filtro, duración, volumen y tono (Hz)
const RECETAS = {
  tierra: { filtro: 'lowpass', frec: 750, q: 0.9, dur: 0.16, vol: 0.55, tono: 95, onda: 'sine' },
  piedra: { filtro: 'bandpass', frec: 1700, q: 1.3, dur: 0.12, vol: 0.6, tono: 190, onda: 'square' },
  madera: { filtro: 'bandpass', frec: 850, q: 2.2, dur: 0.13, vol: 0.5, tono: 230, onda: 'triangle' },
  arena: { filtro: 'highpass', frec: 1600, q: 0.7, dur: 0.2, vol: 0.32, tono: 0 },
  hojas: { filtro: 'bandpass', frec: 3200, q: 0.8, dur: 0.15, vol: 0.3, tono: 0 },
  vidrio: { filtro: 'highpass', frec: 3200, q: 1, dur: 0.22, vol: 0.32, tono: 0, campanitas: true },
  lana: { filtro: 'lowpass', frec: 480, q: 0.7, dur: 0.12, vol: 0.45, tono: 0 },
  agua: { filtro: 'lowpass', frec: 900, q: 3, dur: 0.28, vol: 0.4, tono: 0, burbuja: true },
};

let ctx = null;
let maestro = null;     // todo pasa por aquí
let efectos = null;     // volumen de los efectos
let busMusica = null;   // por aquí sale la música
let bufferRuido = null;
let efectosActivos = true;
const ultimaVez = {};

try {
  efectosActivos = localStorage.getItem('bloques_efectos') !== '0';
} catch (e) { /* sin almacenamiento */ }

function iniciar() {
  if (ctx) {
    if (ctx.state !== 'running' && ctx.state !== 'closed' && !document.hidden) {
      const pr = ctx.resume();
      if (pr && pr.catch) pr.catch(() => {});
    }
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch (e) {
    ctx = null;
    return;
  }
  maestro = ctx.createGain();
  maestro.gain.value = 1;
  maestro.connect(ctx.destination);
  efectos = ctx.createGain();
  efectos.gain.value = efectosActivos ? CONFIG.audio.volumen : 0;
  efectos.connect(maestro);
  busMusica = ctx.createGain();
  busMusica.gain.value = 1;
  busMusica.connect(maestro);
}

// Pausa el audio cuando cambias de pestaña (ahorra batería)
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    const pr = ctx.suspend();
    if (pr && pr.catch) pr.catch(() => {});
  } else {
    const pr = ctx.resume();
    if (pr && pr.catch) pr.catch(() => {});
  }
});

function listo(nombre, espera) {
  if (!ctx || !efectosActivos || ctx.state !== 'running') return false;
  const t = ctx.currentTime;
  if (ultimaVez[nombre] !== undefined && t - ultimaVez[nombre] < espera) return false;
  ultimaVez[nombre] = t;
  return true;
}

function ruidoBuffer() {
  if (!bufferRuido && ctx) {
    bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return bufferRuido;
}

function ruido(t, dur, vol, tipo, frec, q, velocidad) {
  const fuente = ctx.createBufferSource();
  fuente.buffer = ruidoBuffer();
  fuente.playbackRate.value = velocidad || 1;
  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frec;
  filtro.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  fuente.connect(filtro);
  filtro.connect(g);
  g.connect(efectos);
  fuente.start(t, Math.random() * 0.5, dur + 0.05);
}

function tono(t, frec, dur, vol, onda, frecFin) {
  const o = ctx.createOscillator();
  o.type = onda || 'sine';
  o.frequency.setValueAtTime(frec, t);
  if (frecFin) o.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(efectos);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function golpe(material, fuerza) {
  const r = RECETAS[material] || RECETAS.piedra;
  const t = ctx.currentTime + 0.005;
  const varia = 0.85 + Math.random() * 0.3;
  ruido(t, r.dur * fuerza, r.vol * fuerza, r.filtro, r.frec * varia, r.q, varia);
  if (r.tono) tono(t, r.tono * varia, r.dur * 0.8, 0.12 * fuerza, r.onda, r.tono * 0.6);
  if (r.campanitas && fuerza > 0.6) {
    for (let i = 0; i < 4; i++) tono(t + i * 0.025, 2200 + Math.random() * 1800, 0.18, 0.05, 'sine');
  }
  if (r.burbuja) tono(t, 300 * varia, 0.18, 0.12 * fuerza, 'sine', 700);
}

export const Sonido = {
  iniciar,
  contexto: () => ctx,
  salidaMusica: () => busMusica,
  get efectosActivos() { return efectosActivos; },

  alternarEfectos() {
    efectosActivos = !efectosActivos;
    try { localStorage.setItem('bloques_efectos', efectosActivos ? '1' : '0'); } catch (e) { /* nada */ }
    if (efectos) efectos.gain.value = efectosActivos ? CONFIG.audio.volumen : 0;
    return efectosActivos;
  },

  romper(material) {
    if (listo('romper', 0.04)) golpe(material, 1);
  },
  poner(material) {
    if (listo('poner', 0.04)) golpe(material, 0.7);
  },
  paso(material) {
    if (listo('paso', 0.12)) golpe(material, 0.32);
  },
  salto() {
    if (listo('salto', 0.1)) golpe('tierra', 0.25);
  },
  aterrizaje(material) {
    if (listo('aterrizaje', 0.15)) golpe(material, 0.6);
  },
  chapuzon() {
    if (!listo('chapuzon', 0.3)) return;
    const t = ctx.currentTime;
    ruido(t, 0.45, 0.5, 'lowpass', 1200, 1, 1);
    for (let i = 0; i < 5; i++) tono(t + i * 0.05, 250 + Math.random() * 300, 0.12, 0.05, 'sine', 700);
  },
  // Ruidito de animal: tipo 'oink', 'be' o 'muu'; fuerza de 0 (lejos) a 1 (cerca)
  animal(tipo, fuerza = 1) {
    if (!listo('animal', 0.4)) return;
    const t = ctx.currentTime + 0.01;
    const v = 0.04 + 0.16 * fuerza * fuerza;
    const varia = 0.9 + Math.random() * 0.2;
    if (tipo === 'oink') {
      tono(t, 210 * varia, 0.1, v, 'sawtooth', 130);
      tono(t + 0.13, 190 * varia, 0.14, v, 'sawtooth', 110);
    } else if (tipo === 'be') {
      for (let i = 0; i < 4; i++) tono(t + i * 0.07, (340 + (i % 2) * 30) * varia, 0.09, v * 0.8, 'sawtooth', 300 * varia);
    } else {
      tono(t, 120 * varia, 0.7, v * 1.1, 'triangle', 90 * varia);
      tono(t, 240 * varia, 0.7, v * 0.3, 'sine', 180 * varia);
    }
  },
  clic() {
    if (listo('clic', 0.03)) tono(ctx.currentTime, 880, 0.05, 0.08, 'square', 660);
  },
  volar(activado) {
    if (!listo('volar', 0.1)) return;
    const t = ctx.currentTime;
    tono(t, activado ? 440 : 660, 0.12, 0.07, 'triangle', activado ? 880 : 330);
  },
};
