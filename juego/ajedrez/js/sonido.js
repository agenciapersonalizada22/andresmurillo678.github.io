// =============================================================
//  🔊  SONIDO
//  Todos los sonidos se inventan con código (WebAudio), sin archivos.
//  El navegador solo deja sonar audio después de un gesto del usuario,
//  por eso iniciar() se llama con el primer clic o toque.
//  Una pieza que se mueve es un "toc" de madera: un ruidito corto
//  filtrado más un tono grave que se apaga rápido.
// =============================================================
let ctx = null;
let maestro = null;
let efectos = null;
let musicaOut = null;
let silencio = false;
let volumen = 0.7;
let musicaOn = false;
let ruidoBuf = null;

export const obtenerCtx = () => ctx;
export const salidaMusica = () => musicaOut;

export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    ctx = new AC();
    maestro = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    maestro.connect(comp); comp.connect(ctx.destination);
    efectos = ctx.createGain(); efectos.gain.value = 0.9; efectos.connect(maestro);
    musicaOut = ctx.createGain(); musicaOut.gain.value = 0.5; musicaOut.connect(maestro);
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    aplicarVolumen();
    return true;
  } catch (e) {
    ctx = null;
    return false;
  }
}

function aplicarVolumen() {
  if (!maestro) return;
  maestro.gain.setTargetAtTime(silencio ? 0 : volumen, ctx.currentTime, 0.03);
}

export function fijarSilencio(s) { silencio = !!s; aplicarVolumen(); }
export function fijarVolumen(v) { volumen = Math.max(0, Math.min(1, v)); aplicarVolumen(); }
export const estaSilenciado = () => silencio;

// Pausa o reanuda todo el audio (al ocultar la pestaña)
export function pausar() { if (ctx && ctx.state === 'running') ctx.suspend(); }
export function reanudar() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

// ---- bloques de construcción
function ruido(t, dur, tipo, frec, q, vol, destino = efectos) {
  const f = ctx.createBiquadFilter();
  f.type = tipo; f.frequency.value = frec; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  const s = ctx.createBufferSource();
  s.buffer = ruidoBuf;
  s.connect(f); f.connect(g); g.connect(destino);
  s.start(t, Math.random() * 0.2, dur + 0.05);
}

function tono(t, frec, dur, vol, onda = 'sine', frecFin = 0, destino = efectos) {
  const o = ctx.createOscillator();
  o.type = onda;
  o.frequency.setValueAtTime(frec, t);
  if (frecFin) o.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(destino);
  o.start(t); o.stop(t + dur + 0.05);
}

const nota = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SONIDOS = {
  mover(t) { ruido(t, 0.09, 'bandpass', 950, 1.6, 0.7); tono(t, 150, 0.1, 0.5, 'sine', 90); },
  capturar(t) { ruido(t, 0.16, 'bandpass', 700, 1.2, 1); ruido(t, 0.05, 'highpass', 3000, 0.7, 0.4); tono(t, 120, 0.18, 0.7, 'triangle', 60); },
  enroque(t) { SONIDOS.mover(t); SONIDOS.mover(t + 0.13); },
  jaque(t) { tono(t, nota(76), 0.16, 0.35, 'triangle'); tono(t + 0.11, nota(81), 0.3, 0.35, 'triangle'); },
  mate(t) { [57, 53, 50, 45].forEach((n, i) => { tono(t + i * 0.16, nota(n), 1.1, 0.3, 'sawtooth'); tono(t + i * 0.16, nota(n + 12), 0.8, 0.12, 'sine'); }); },
  coronar(t) { [72, 76, 79, 84].forEach((n, i) => tono(t + i * 0.07, nota(n), 0.3, 0.25, 'triangle')); },
  victoria(t) { [67, 72, 76, 79, 84].forEach((n, i) => tono(t + i * 0.12, nota(n), 0.5, 0.28, 'triangle')); },
  derrota(t) { [67, 63, 60, 55].forEach((n, i) => tono(t + i * 0.2, nota(n), 0.6, 0.28, 'triangle')); },
  tablas(t) { tono(t, nota(67), 0.5, 0.28, 'sine'); tono(t + 0.2, nota(64), 0.7, 0.28, 'sine'); },
  clic(t) { tono(t, 900, 0.04, 0.12, 'square', 600); },
  error(t) { tono(t, 120, 0.16, 0.3, 'sawtooth', 80); },
  reloj(t) { tono(t, 1400, 0.05, 0.12, 'square'); },
};

export function reproducir(nombre) {
  if (!ctx || silencio || ctx.state !== 'running') return;
  const f = SONIDOS[nombre];
  if (f) f(ctx.currentTime + 0.01);
}

export const musicaActiva = () => musicaOn;
export const fijarMusicaActiva = (v) => { musicaOn = v; };
