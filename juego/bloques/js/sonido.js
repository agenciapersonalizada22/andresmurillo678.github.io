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
let volMaestro = 1;
let volEfectos = CONFIG.audio.volumen;
let silencio = false;
let pausarOculto = true;
let panEsp = 0, volEsp = 1;       // sonido espacial: se fijan con Sonido.en()
const oyente = { x: 0, y: 0, z: 0, yaw: 0 };
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
  efectos.gain.value = efectosActivos && !silencio ? volEfectos : 0;
  efectos.connect(maestro);
  maestro.gain.value = silencio ? 0 : volMaestro;
  busMusica = ctx.createGain();
  busMusica.gain.value = 1;
  busMusica.connect(maestro);
}

// Pausa el audio cuando cambias de pestaña (ahorra batería)
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    if (!pausarOculto) return;
    const pr = ctx.suspend();
    if (pr && pr.catch) pr.catch(() => {});
  } else {
    const pr = ctx.resume();
    if (pr && pr.catch) pr.catch(() => {});
  }
});

function maestro_ok() { return !!(ctx && maestro && efectos); }

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

// Dónde conectar un sonido: directo o con volumen y paneo según dónde esté (Sonido.en)
function salida() {
  if (volEsp >= 0.999 && panEsp === 0) return efectos;
  const g = ctx.createGain();
  g.gain.value = volEsp;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = panEsp;
    g.connect(p);
    p.connect(efectos);
  } else g.connect(efectos);
  return g;
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
  g.connect(salida());
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
  g.connect(salida());
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

// ----------------------------------------------------------- Motores
// El motor son dos "zumbidos" (ondas) cuya nota sube con las revoluciones, un filtro que
// se abre al acelerar y un poco de ruido; según el vehículo cambian las notas y el ruido.
let mot = null;

function ruidoBucle() {
  const f = ctx.createBufferSource();
  f.buffer = ruidoBuffer();
  f.loop = true;
  return f;
}

function motorIniciar(clase) {
  if (!ctx || !efectosActivos) return;
  motorParar(true);
  const m = { clase, nodos: [] };
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(efectos);
  m.salida = salida;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 500;
  filtro.Q.value = 1.1;
  filtro.connect(salida);
  m.filtro = filtro;
  const tipoA = clase === 'aire' ? 'sawtooth' : 'sawtooth';
  m.a = ctx.createOscillator(); m.a.type = tipoA; m.a.frequency.value = 50;
  m.b = ctx.createOscillator(); m.b.type = clase === 'agua' ? 'triangle' : 'square'; m.b.frequency.value = 100;
  const ga = ctx.createGain(); ga.gain.value = 0.55;
  const gb = ctx.createGain(); gb.gain.value = 0.22;
  m.a.connect(ga); ga.connect(filtro);
  m.b.connect(gb); gb.connect(filtro);
  // pulsos de los cilindros o de las aspas
  m.lfo = ctx.createOscillator(); m.lfo.frequency.value = 20;
  m.lfoG = ctx.createGain(); m.lfoG.gain.value = clase === 'riel' ? 0.0 : 0.18;
  m.lfo.connect(m.lfoG); m.lfoG.connect(salida.gain);
  // ruido: viento de la hélice, chorro del agua, traqueteo de la vía
  m.ruido = ruidoBucle();
  m.filtroRuido = ctx.createBiquadFilter();
  m.filtroRuido.type = clase === 'aire' ? 'bandpass' : clase === 'riel' ? 'bandpass' : 'lowpass';
  m.filtroRuido.frequency.value = clase === 'aire' ? 900 : clase === 'riel' ? 260 : 700;
  m.filtroRuido.Q.value = 0.8;
  m.gRuido = ctx.createGain(); m.gRuido.gain.value = 0;
  m.ruido.connect(m.filtroRuido); m.filtroRuido.connect(m.gRuido); m.gRuido.connect(efectos);
  // chirrido de llantas
  m.chirrido = ruidoBucle();
  m.filtroCh = ctx.createBiquadFilter(); m.filtroCh.type = 'bandpass'; m.filtroCh.frequency.value = 2100; m.filtroCh.Q.value = 6;
  m.gCh = ctx.createGain(); m.gCh.gain.value = 0;
  m.chirrido.connect(m.filtroCh); m.filtroCh.connect(m.gCh); m.gCh.connect(efectos);
  m.a.start(); m.b.start(); m.lfo.start(); m.ruido.start(0, Math.random()); m.chirrido.start(0, Math.random());
  mot = m;
}

function motorActualizar(rpm, carga, encendido, enAgua, deslizamiento) {
  if (!mot || !ctx) return;
  const t = ctx.currentTime;
  const m = mot;
  const k = 0.06;
  let fa, vol, filt, pulso, ruido = 0;
  if (m.clase === 'aire') {
    fa = 42 + rpm * 70; filt = 500 + rpm * 1100; vol = 0.07 + carga * 0.09; pulso = 2 * (6 + rpm * 28) / 2; ruido = 0.05 + rpm * 0.17;
  } else if (m.clase === 'agua') {
    fa = 36 + rpm * 62; filt = 380 + rpm * 700; vol = (enAgua ? 0.07 : 0.025) + carga * 0.08; pulso = 6 + rpm * 20; ruido = (enAgua ? 0.03 : 0) + rpm * 0.1;
  } else if (m.clase === 'riel') {
    fa = 28 + rpm * 60; filt = 220 + rpm * 400; vol = 0.02 + rpm * 0.035; pulso = 2 + rpm * 24; ruido = rpm * 0.18;
  } else {
    fa = 34 + rpm * 112; filt = 330 + rpm * 800 + carga * 450; vol = 0.055 + carga * 0.09 + rpm * 0.03; pulso = 14 + rpm * 62; ruido = 0.01 + rpm * 0.03;
  }
  if (!encendido && m.clase !== 'riel') { vol = 0; ruido *= 0.2; }
  m.a.frequency.setTargetAtTime(fa, t, k);
  m.b.frequency.setTargetAtTime(fa * 2.003, t, k);
  m.filtro.frequency.setTargetAtTime(filt, t, k);
  m.lfo.frequency.setTargetAtTime(pulso, t, k);
  m.salida.gain.setTargetAtTime(vol, t, 0.08);
  m.lfoG.gain.setTargetAtTime(m.clase === 'riel' ? 0 : vol * 0.35, t, 0.08);
  m.gRuido.gain.setTargetAtTime(ruido, t, 0.1);
  m.gCh.gain.setTargetAtTime(Math.min(0.1, Math.max(0, deslizamiento - 3) * 0.02) * (m.clase === 'tierra' ? 1 : 0), t, 0.05);
}

function motorParar(rapido = false) {
  if (!mot) return;
  const m = mot;
  mot = null;
  const t = ctx.currentTime;
  try {
    m.salida.gain.cancelScheduledValues(t);
    m.salida.gain.setTargetAtTime(0, t, rapido ? 0.01 : 0.12);
    m.gRuido.gain.setTargetAtTime(0, t, 0.05);
    m.gCh.gain.setTargetAtTime(0, t, 0.05);
    for (const n of [m.a, m.b, m.lfo, m.ruido, m.chirrido]) n.stop(t + 0.5);
  } catch (e) { /* ya parado */ }
}

export const Sonido = {
  motorIniciar,
  motorActualizar,
  motorParar,
  puerta() {
    if (!listo('puerta', 0.1)) return;
    golpe('madera', 0.9);
    tono(ctx.currentTime, 90, 0.16, 0.14, 'triangle', 60);
  },
  golpeVehiculo(fuerza = 0.5) {
    if (!listo('golpeveh', 0.25)) return;
    const t = ctx.currentTime;
    ruido(t, 0.3, 0.5 * fuerza + 0.1, 'lowpass', 900, 1, 0.8);
    tono(t, 120, 0.25, 0.2 * fuerza + 0.05, 'sawtooth', 50);
  },
  cofre() {
    if (!listo('cofre', 0.2)) return;
    const t = ctx.currentTime;
    tono(t, 180, 0.28, 0.1, 'sawtooth', 340);
    ruido(t, 0.12, 0.2, 'bandpass', 1400, 2, 1);
    tono(t + 0.18, 880, 0.2, 0.05, 'sine', 1320);
  },
  tesoro() {
    if (!listo('tesoro', 0.3)) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) tono(t + i * 0.07, 660 * Math.pow(1.26, i), 0.2, 0.06, 'triangle');
  },
  iniciar,
  contexto: () => ctx,
  salidaMusica: () => busMusica,
  get efectosActivos() { return efectosActivos; },

  // Volúmenes de 0 a 1 (los pone el menú de ajustes)
  ponerVolumenes({ maestro, efectos: ef, silenciar, pausarAlOcultar }) {
    if (Number.isFinite(maestro)) volMaestro = maestro;
    if (Number.isFinite(ef)) volEfectos = ef;
    if (typeof silenciar === 'boolean') silencio = silenciar;
    if (typeof pausarAlOcultar === 'boolean') pausarOculto = pausarAlOcultar;
    if (maestro_ok()) {
      maestro.gain.value = silencio ? 0 : volMaestro;
      efectos.gain.value = efectosActivos && !silencio ? volEfectos : 0;
    }
  },
  // Dónde está el que escucha (la cámara) para el sonido espacial
  ponerOyente(x, y, z, yaw) { oyente.x = x; oyente.y = y; oyente.z = z; oyente.yaw = yaw; },
  // Ejecuta fn() con el sonido saliendo desde (x, y, z): más bajito si está lejos y de lado a lado
  en(x, y, z, fn) {
    const dx = x - oyente.x, dz = z - oyente.z, dy = y - oyente.y;
    const d = Math.hypot(dx, dy, dz);
    if (d > 40) return;
    volEsp = Math.max(0.05, 1 - d / 40);
    volEsp *= volEsp;
    // el eje derecho de la cámara con yaw: (cos, -sin)
    const der = (dx * Math.cos(oyente.yaw) - dz * Math.sin(oyente.yaw)) / Math.max(0.001, d);
    panEsp = Math.max(-1, Math.min(1, der * 0.9));
    try { fn(); } finally { volEsp = 1; panEsp = 0; }
  },

  alternarEfectos() {
    efectosActivos = !efectosActivos;
    try { localStorage.setItem('bloques_efectos', efectosActivos ? '1' : '0'); } catch (e) { /* nada */ }
    if (efectos) efectos.gain.value = efectosActivos && !silencio ? volEfectos : 0;
    return efectosActivos;
  },

  // ---- supervivencia
  dano() {
    if (!listo('dano', 0.15)) return;
    const t = ctx.currentTime;
    tono(t, 200, 0.16, 0.2, 'sawtooth', 90);
    ruido(t, 0.1, 0.25, 'lowpass', 700, 1, 1);
  },
  muerte() {
    if (!listo('muerte', 0.5)) return;
    const t = ctx.currentTime;
    tono(t, 260, 0.8, 0.2, 'sawtooth', 50);
    ruido(t, 0.5, 0.3, 'lowpass', 500, 1, 0.7);
  },
  comer() {
    if (!listo('comer', 0.15)) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) ruido(t + i * 0.09, 0.07, 0.35, 'bandpass', 1400 + i * 200, 2, 1);
  },
  explosion() {
    if (!listo('explosion', 0.1)) return;
    const t = ctx.currentTime;
    ruido(t, 0.9, 0.9, 'lowpass', 600, 0.7, 0.5);
    tono(t, 110, 0.6, 0.35, 'sawtooth', 28);
  },
  silbido() {
    if (!listo('silbido', 0.5)) return;
    ruido(ctx.currentTime, 1.4, 0.35, 'highpass', 4200, 1, 1);
  },
  arco() {
    if (!listo('arco', 0.2)) return;
    const t = ctx.currentTime;
    tono(t, 180, 0.14, 0.18, 'triangle', 420);
    ruido(t + 0.04, 0.12, 0.25, 'highpass', 2600, 1, 1);
  },
  flechaImpacto() {
    if (!listo('flechaImpacto', 0.1)) return;
    golpe('madera', 0.5);
  },
  golpeCuerpo() {
    if (!listo('golpeCuerpo', 0.08)) return;
    const t = ctx.currentTime;
    ruido(t, 0.09, 0.45, 'lowpass', 900, 1, 1);
    tono(t, 140, 0.08, 0.15, 'square', 80);
  },
  // voces de bichos: 'zombi', 'esqueleto', 'arana', 'aldeano'
  bicho(tipo, fuerza = 1) {
    if (!listo('bicho' + tipo, 0.5)) return;
    const t = ctx.currentTime + 0.01, v = 0.05 + 0.15 * fuerza, k = 0.9 + Math.random() * 0.2;
    if (tipo === 'zombi') {
      tono(t, 120 * k, 0.5, v, 'sawtooth', 70 * k);
      tono(t + 0.05, 95 * k, 0.5, v * 0.7, 'square', 60 * k);
    } else if (tipo === 'esqueleto') {
      for (let i = 0; i < 4; i++) tono(t + i * 0.06, 900 * k + i * 90, 0.04, v * 0.6, 'square');
    } else if (tipo === 'arana') {
      ruido(t, 0.35, v * 1.6, 'highpass', 3500 * k, 1.2, 1.3);
    } else {
      tono(t, 190 * k, 0.12, v, 'triangle', 150 * k);
      tono(t + 0.16, 170 * k, 0.16, v, 'triangle', 130 * k);
    }
  },
  craft() {
    if (!listo('craft', 0.1)) return;
    const t = ctx.currentTime;
    golpe('madera', 0.6);
    tono(t + 0.05, 740, 0.1, 0.05, 'triangle', 980);
  },
  horno() {
    if (!listo('horno', 0.3)) return;
    ruido(ctx.currentTime, 0.4, 0.25, 'lowpass', 520, 1, 0.9);
  },
  logro() {
    if (!listo('logro', 0.5)) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tono(t + i * 0.1, f, 0.26, 0.09, 'triangle'));
  },
  moneda() {
    if (!listo('moneda', 0.1)) return;
    const t = ctx.currentTime;
    tono(t, 1320, 0.1, 0.07, 'square'); tono(t + 0.08, 1760, 0.2, 0.07, 'square');
  },
  recoger() {
    if (!listo('recoger', 0.05)) return;
    tono(ctx.currentTime, 620 + Math.random() * 200, 0.08, 0.07, 'sine', 1100);
  },
  gota() {
    if (!listo('gota', 0.2)) return;
    tono(ctx.currentTime, 1500, 0.09, 0.05, 'sine', 700);
  },
  camara() {
    if (!listo('camara', 0.3)) return;
    const t = ctx.currentTime;
    ruido(t, 0.05, 0.4, 'highpass', 3000, 1, 1); ruido(t + 0.08, 0.06, 0.4, 'highpass', 2200, 1, 1);
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
