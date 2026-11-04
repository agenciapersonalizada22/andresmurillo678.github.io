// Sonido procedural (WebAudio): efectos y música ambiental generativa. Se activa con el primer gesto.
let ctx = null, maestro = null, bSfx = null, bMus = null, ruidoBuf = null, eco = null;
let sfxOn = true, musOn = true;
let timer = null, proxNota = 0, proxAcorde = 0, acorde = 0, noche = 0;
const ultima = {};

let V = { maestro: 0.8, musica: 0.7, sfx: 0.8, ambiente: 0.6, silencio: false };
let bAmb = null, capas = null, pajaroT = 0;
export function configurar(sfx, mus) { sfxOn = sfx; musOn = mus; aplicarVol(); }
export function volumenes(o) { Object.assign(V, o); aplicarVol(); }
function aplicarVol() {
  if (!ctx) return;
  const t = ctx.currentTime;
  maestro.gain.setTargetAtTime(V.silencio ? 0 : V.maestro * 0.9, t, 0.05);
  bSfx.gain.setTargetAtTime(sfxOn ? V.sfx : 0, t, 0.05);
  bMus.gain.setTargetAtTime(musOn ? V.musica * 0.7 : 0, t, 0.4);
  if (bAmb) bAmb.gain.setTargetAtTime(sfxOn ? V.ambiente : 0, t, 0.3);
}
// Pausa el audio al ocultar la pestaña
export function pausar(si) {
  if (!ctx) return;
  if (si) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); } else if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}
function crearAmbiente() {
  bAmb = ctx.createGain(); bAmb.connect(maestro);
  capas = {};
  const def = { trafico: ['lowpass', 260, 0.9], industria: ['lowpass', 110, 1.2], agua: ['bandpass', 700, 0.6], lluvia: ['highpass', 2600, 0.5], gente: ['bandpass', 520, 1.4], viento: ['bandpass', 380, 0.4] };
  for (const k in def) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruidoBuf; s.loop = true; f.type = def[k][0]; f.frequency.value = def[k][1]; f.Q.value = def[k][2]; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(bAmb); s.start(0, Math.random());
    capas[k] = g;
  }
}
// o: intensidades 0..1 por tipo de zona cercana a la cámara
export function ambiente(o) {
  if (!ctx || !capas) return;
  const t = ctx.currentTime, a = (k, v) => capas[k].gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.16, t, 0.6);
  a('trafico', o.trafico); a('industria', o.industria); a('agua', o.agua); a('lluvia', o.lluvia * 1.4); a('gente', o.gente); a('viento', o.viento);
  if (o.parque > 0.15 && o.dia && sfxOn && ctx.state === 'running' && t > pajaroT) {
    pajaroT = t + 1.2 + Math.random() * 3 / (0.3 + o.parque);
    const f = 2400 + Math.random() * 1400;
    tono(f, 0.07, 'sine', 0.05 * o.parque, f * 1.25, 0, bAmb); tono(f * 1.1, 0.06, 'sine', 0.04 * o.parque, f * 1.4, 0.1, bAmb);
  }
}

export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { ctx = new AC(); } catch (e) { ctx = null; return; }
  maestro = ctx.createGain(); maestro.gain.value = 0.7; maestro.connect(ctx.destination);
  bSfx = ctx.createGain(); bSfx.connect(maestro);
  bMus = ctx.createGain(); bMus.connect(maestro);
  const len = ctx.sampleRate * 1;
  ruidoBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = ruidoBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  eco = ctx.createDelay(1.5); eco.delayTime.value = 0.42;
  const fb = ctx.createGain(); fb.gain.value = 0.38; eco.connect(fb); fb.connect(eco);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; eco.connect(lp); lp.connect(bMus);
  crearAmbiente();
  aplicarVol();
  arrancarMusica();
}

export const activo = () => !!ctx;

function tono(f, dur, tipo = 'sine', vol = 0.2, hasta = 0, retraso = 0, destino = null) {
  if (!ctx) return;
  const t = ctx.currentTime + retraso, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(destino || bSfx); o.start(t); o.stop(t + dur + 0.05);
}
function ruido(dur, frec, vol = 0.2, tipo = 'lowpass', retraso = 0, q = 0.8) {
  if (!ctx) return;
  const t = ctx.currentTime + retraso, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruidoBuf; f.type = tipo; f.frequency.value = frec; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bSfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const SONIDOS = {
  click: () => tono(1300, 0.05, 'sine', 0.12),
  tecla: () => tono(900, 0.04, 'triangle', 0.08),
  construir: () => { ruido(0.14, 700, 0.35); tono(140, 0.16, 'square', 0.14, 60); tono(320, 0.07, 'square', 0.1, 160, 0.12); ruido(0.1, 1600, 0.2, 'bandpass', 0.12); },
  via: () => { ruido(0.08, 2200, 0.16, 'highpass'); tono(520, 0.05, 'triangle', 0.1); },
  zona: () => { tono(660, 0.07, 'triangle', 0.12); tono(880, 0.07, 'triangle', 0.1, 0, 0.06); },
  derribo: () => { ruido(0.4, 500, 0.5); tono(90, 0.35, 'sawtooth', 0.15, 40); ruido(0.2, 1800, 0.25, 'bandpass', 0.05); },
  moneda: () => { tono(988, 0.09, 'triangle', 0.16); tono(1319, 0.2, 'triangle', 0.16, 0, 0.08); },
  nivel: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.22, 'triangle', 0.18, 0, i * 0.09)); },
  logro: () => { [659, 784, 988, 1319, 1568].forEach((f, i) => tono(f, 0.3, 'sine', 0.16, 0, i * 0.08)); tono(2093, 0.5, 'sine', 0.06, 0, 0.4); },
  error: () => { tono(170, 0.18, 'sawtooth', 0.14, 100); tono(120, 0.2, 'square', 0.08, 80, 0.07); },
  alerta: () => { tono(620, 0.12, 'square', 0.1); tono(460, 0.16, 'square', 0.1, 0, 0.14); },
  ok: () => { tono(784, 0.1, 'triangle', 0.14); tono(1047, 0.18, 'triangle', 0.14, 0, 0.09); },
  monumento: () => { ruido(0.2, 600, 0.4); [392, 523, 659, 784, 1047].forEach((f, i) => tono(f, 0.5, 'triangle', 0.12, 0, 0.1 + i * 0.1)); },
  parcela: () => { [392, 494, 587].forEach((f) => tono(f, 0.35, 'triangle', 0.12)); tono(784, 0.4, 'sine', 0.1, 0, 0.1); },
  deshacer: () => { tono(600, 0.1, 'triangle', 0.12, 320); },
  fuegos: () => { tono(900, 0.4, 'sine', 0.07, 200); ruido(0.3, 3000, 0.15, 'highpass', 0.3); },
};
export function tocar(n) {
  if (!ctx || !sfxOn || !SONIDOS[n]) return;
  const ahora = ctx.currentTime;
  if (ultima[n] && ahora - ultima[n] < 0.045) return;
  ultima[n] = ahora;
  SONIDOS[n]();
}

// ---------------------------------------------------------------- música generativa
const ACORDES = [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [9, 12, 16, 19]];
const PENTA = [0, 2, 4, 7, 9];
const mid = (n) => 261.63 * Math.pow(2, (n - 0) / 12);

function pad(notas, t0, dur) {
  for (const n of notas) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = mid(n - 12 + (noche > 0.5 ? -5 : 0));
    f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f); f.connect(g); g.connect(bMus); o.start(t0); o.stop(t0 + dur + 0.1);
  }
}
function campana(n, t0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = mid(n + 12);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  o.connect(g); g.connect(bMus); g.connect(eco); o.start(t0); o.stop(t0 + 2);
}
function arrancarMusica() {
  proxNota = ctx.currentTime + 1; proxAcorde = ctx.currentTime + 0.5;
  timer = setInterval(() => {
    if (!ctx || ctx.state !== 'running' || !musOn) { if (ctx) { proxNota = Math.max(proxNota, ctx.currentTime); proxAcorde = Math.max(proxAcorde, ctx.currentTime); } return; }
    const ahora = ctx.currentTime;
    while (proxAcorde < ahora + 2) {
      acorde = (acorde + 1) % ACORDES.length;
      pad(ACORDES[acorde], proxAcorde, 8);
      proxAcorde += 7;
    }
    while (proxNota < ahora + 2) {
      if (Math.random() < (noche > 0.5 ? 0.5 : 0.75)) {
        const base = ACORDES[acorde][0];
        campana(base + PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0), proxNota);
      }
      proxNota += 1.1 + Math.random() * 1.6;
    }
  }, 400);
}
export function fijarNoche(v) { noche = v; }
