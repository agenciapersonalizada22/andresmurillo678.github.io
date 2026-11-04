// =============================================================
//  🎵  MÚSICA DE FONDO (tranquila, para relajarse)
//  Se toca sola con código: no hay archivos. Hay dos "ánimos":
//    dia   → acordes alegres (Do mayor) y notitas de piano suaves
//    noche → más lenta y misteriosa (La menor), con menos notas
//  Cada compás cambia el acorde. La melodía se inventa sola: va
//  subiendo o bajando de nota en nota dentro de una escala
//  "pentatónica" (5 notas que siempre suenan bonito juntas).
//  Las notas usan números MIDI: 60 = Do, 62 = Re, 64 = Mi,
//  67 = Sol, 69 = La, 72 = Do de arriba...
// =============================================================
import { CONFIG } from './config.js';
import { Sonido } from './sonido.js';

const ANIMOS = {
  dia: {
    tempo: () => CONFIG.audio.tempoDia,
    escala: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81],
    // cada acorde: [nota del bajo, notas del colchón]
    acordes: [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [57, 60, 64, 65]], [43, [55, 59, 62, 67]]],
    densidad: 0.42,
  },
  noche: {
    tempo: () => CONFIG.audio.tempoNoche,
    escala: [57, 60, 62, 64, 67, 69, 72, 74, 76],
    acordes: [[45, [57, 60, 64, 69]], [41, [53, 57, 60, 64]], [48, [55, 60, 64, 67]], [40, [55, 59, 62, 64]]],
    densidad: 0.26,
  },
  // bajo tierra: casi sin melodía, grave y con mucho eco
  cueva: {
    tempo: () => 44,
    escala: [45, 48, 50, 52, 55, 57],
    acordes: [[33, [45, 48, 52]], [36, [48, 52, 55]], [31, [43, 47, 50]], [33, [45, 50, 52]]],
    densidad: 0.1,
  },
  // cuando hay monstruos cerca: más rápida y tensa (menor con segunda menor)
  peligro: {
    tempo: () => 96,
    escala: [57, 58, 60, 63, 64, 69, 70],
    acordes: [[45, [57, 60, 64, 69]], [46, [58, 61, 65, 70]], [45, [57, 60, 63, 69]], [44, [56, 59, 63, 68]]],
    densidad: 0.34,
  },
};

const PASOS = 16;      // medios pulsos por compás
const ADELANTO = 0.25; // segundos que se programan por adelantado

let activa = CONFIG.audio.musica !== false;
try {
  const g = localStorage.getItem('bloques_musica');
  if (g !== null) activa = g === '1';
} catch (e) { /* sin almacenamiento */ }

let volumen = CONFIG.audio.volumenMusica;
let ctx = null;
let salida = null;    // volumen de la música
let eco = null;       // entrada del eco
let reloj = null;
let animo = 'dia';
let siguienteAnimo = 'dia';
let paso = 0;
let compas = 0;
let proxima = 0;
let notaMelodia = 4;  // posición dentro de la escala
let notasTocadas = 0; // contador (para las pruebas)

const frec = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function preparar() {
  ctx = Sonido.contexto();
  if (!ctx) return false;
  if (salida) return true;
  salida = ctx.createGain();
  salida.gain.value = activa ? volumen : 0;
  salida.connect(Sonido.salidaMusica());
  // eco suave (como en una cueva grande)
  eco = ctx.createGain();
  eco.gain.value = 0.45;
  const retraso = ctx.createDelay(2);
  retraso.delayTime.value = 0.43;
  const vuelta = ctx.createGain();
  vuelta.gain.value = 0.38;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 1800;
  eco.connect(retraso);
  retraso.connect(filtro);
  filtro.connect(vuelta);
  vuelta.connect(retraso);
  filtro.connect(salida);
  return true;
}

// ----------------------------------------------------------- Instrumentos
function colchon(t, midi, dur) {
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.045, t + Math.min(1.6, dur * 0.4));
  g.gain.setValueAtTime(0.045, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
  f.connect(g);
  g.connect(salida);
  for (const [onda, desafina] of [['triangle', 0], ['sine', 6]]) {
    const o = ctx.createOscillator();
    o.type = onda;
    o.frequency.value = frec(midi);
    o.detune.value = desafina;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 1.3);
  }
}

function piano(t, midi, fuerza) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.13 * fuerza, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  g.connect(salida);
  g.connect(eco);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = frec(midi);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = frec(midi) * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  o1.start(t); o2.start(t);
  o1.stop(t + 1.9); o2.stop(t + 1.9);
  notasTocadas++;
}

function bajo(t, midi, dur) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = frec(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(salida);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// ----------------------------------------------------------- Programador
function programar(p, t, medio) {
  const a = ANIMOS[animo];
  const [raiz, notas] = a.acordes[compas % a.acordes.length];
  const duracionCompas = medio * PASOS;

  if (p === 0) {
    for (const n of notas) colchon(t, n, duracionCompas);
    bajo(t, raiz, duracionCompas * 0.9);
  }
  if (p === 8 && Math.random() < 0.5) bajo(t, raiz + 7, duracionCompas * 0.45);

  // melodía: en los pulsos fuertes es más probable que suene
  const prob = a.densidad * (p % 4 === 0 ? 1.4 : p % 2 === 0 ? 0.9 : 0.35);
  if (Math.random() < prob) {
    const salto = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
    notaMelodia = Math.max(0, Math.min(a.escala.length - 1, notaMelodia + salto));
    piano(t, a.escala[notaMelodia], 0.6 + Math.random() * 0.4);
    // a veces una segunda nota que acompaña
    if (p % 8 === 0 && Math.random() < 0.3) piano(t + 0.02, a.escala[Math.max(0, notaMelodia - 2)], 0.4);
  }
}

function revisar() {
  if (!ctx || ctx.state !== 'running') return;
  while (proxima < ctx.currentTime + ADELANTO) {
    const medio = 30 / ANIMOS[animo].tempo();
    if (proxima < ctx.currentTime - 0.5) proxima = ctx.currentTime + 0.05; // nos atrasamos: brincamos
    programar(paso, proxima, medio);
    proxima += medio;
    paso++;
    if (paso >= PASOS) {
      paso = 0;
      compas++;
      if (siguienteAnimo !== animo) {
        animo = siguienteAnimo;
        compas = 0;
        notaMelodia = Math.floor(ANIMOS[animo].escala.length / 2);
      }
    }
  }
}

function arrancar() {
  if (reloj || !activa) return;
  if (!preparar()) return;
  proxima = ctx.currentTime + 0.1;
  paso = 0;
  reloj = setInterval(revisar, 60);
}

function detener() {
  if (reloj) clearInterval(reloj);
  reloj = null;
}

export const Musica = {
  get activa() { return activa; },
  get notasTocadas() { return notasTocadas; },

  // Se llama después del primer toque/clic (cuando ya hay audio)
  iniciar() {
    if (activa) arrancar();
  },

  // Volumen de 0 a 1; con 0 la música se detiene sola
  ponerVolumen(v) {
    volumen = Math.max(0, Math.min(1, v));
    if (salida && ctx && activa) salida.gain.setTargetAtTime(volumen, ctx.currentTime, 0.1);
  },

  get animo() { return animo; },

  ponerAnimo(nombre) {
    if (ANIMOS[nombre]) siguienteAnimo = nombre;
    if (!reloj) animo = siguienteAnimo;
  },

  alternar() {
    activa = !activa;
    try { localStorage.setItem('bloques_musica', activa ? '1' : '0'); } catch (e) { /* nada */ }
    if (activa) {
      arrancar();
      if (salida) {
        const t = ctx.currentTime;
        salida.gain.cancelScheduledValues(t);
        salida.gain.setValueAtTime(0.0001, t);
        salida.gain.linearRampToValueAtTime(volumen, t + 1);
      }
    } else {
      if (salida && ctx) {
        const t = ctx.currentTime;
        salida.gain.cancelScheduledValues(t);
        salida.gain.setValueAtTime(salida.gain.value, t);
        salida.gain.linearRampToValueAtTime(0, t + 0.3);
      }
      detener();
    }
    return activa;
  },
};
