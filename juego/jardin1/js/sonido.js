// Sonido sintetizado (Web Audio) y musica generativa por mundo. Sin archivos de audio.
export const Son = { ctx: null, vol: { maestro: 0.8, musica: 0.5, efectos: 0.8, mudo: false }, tema: null };
let gM = null, gX = null, gMaster = null, comp = null, noiseBuf = null, ultimo = {}, timer = null, paso = 0, prox = 0, tema = null, pausado = false;

export function iniciar() {
  if (Son.ctx) { if (Son.ctx.state === 'suspended') Son.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    const c = Son.ctx = new AC();
    comp = c.createDynamicsCompressor(); gMaster = c.createGain(); gM = c.createGain(); gX = c.createGain();
    gM.connect(gMaster); gX.connect(gMaster); gMaster.connect(comp); comp.connect(c.destination);
    const n = c.sampleRate; noiseBuf = c.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    aplicar();
  } catch (e) { Son.ctx = null; }
}
export function aplicar() {
  if (!Son.ctx) return; const v = Son.vol, m = v.mudo ? 0 : v.maestro;
  gMaster.gain.value = m; gM.gain.value = v.musica * 0.6; gX.gain.value = v.efectos;
}
export function pausarAudio(p) { pausado = p; if (!Son.ctx) return; if (p) Son.ctx.suspend(); else Son.ctx.resume(); }

function osc(tipo, f0, f1, dur, vol, t0, dest, filt) {
  const c = Son.ctx, o = c.createOscillator(), g = c.createGain(); o.type = tipo; const t = t0 == null ? c.currentTime : t0;
  o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = o; if (filt) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); n = f; }
  n.connect(g); g.connect(dest || gX); o.start(t); o.stop(t + dur + 0.05);
}
function ruido(dur, vol, f0, f1, tipo, t0, dest) {
  const c = Son.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); s.buffer = noiseBuf; f.type = tipo || 'lowpass'; const t = t0 == null ? c.currentTime : t0;
  f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(dest || gX); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const SFX = {
  sol() { osc('sine', 880, 1320, 0.16, 0.25); osc('triangle', 1320, 1760, 0.14, 0.15, Son.ctx.currentTime + 0.05); },
  moneda() { osc('square', 1180, 1180, 0.07, 0.1); osc('square', 1570, 1570, 0.16, 0.1, Son.ctx.currentTime + 0.07); },
  plantar() { osc('sine', 300, 90, 0.18, 0.4); ruido(0.1, 0.15, 1200, 300); },
  dispara() { osc('square', 700, 280, 0.09, 0.08, null, null, 2200); },
  arco() { osc('sine', 260, 520, 0.2, 0.2); },
  impacto() { ruido(0.07, 0.2, 1800, 500, 'bandpass'); },
  golpeMetal() { osc('square', 1400, 900, 0.08, 0.1); ruido(0.05, 0.1, 5000, 3000, 'highpass'); },
  muerde() { ruido(0.09, 0.22, 700, 250, 'bandpass'); osc('sawtooth', 120, 70, 0.1, 0.1, null, null, 500); },
  muere() { osc('sawtooth', 190, 55, 0.5, 0.18, null, null, 700); ruido(0.2, 0.1, 500, 120); },
  explosion() { ruido(0.7, 0.8, 1400, 60); osc('sine', 110, 28, 0.6, 0.7); },
  cortadora() { for (let i = 0; i < 8; i++) osc('sawtooth', 90 + (i % 2) * 20, 100, 0.12, 0.12, Son.ctx.currentTime + i * 0.1, null, 800); ruido(0.9, 0.25, 900, 500, 'bandpass'); },
  ola() { osc('sawtooth', 130, 130, 0.9, 0.22, null, null, 600); osc('sawtooth', 195, 195, 0.9, 0.18, null, null, 600); },
  final() { const t = Son.ctx.currentTime; [0, 0.35, 0.7].forEach((d, i) => { osc('sawtooth', 98 + i * 20, 98 + i * 20, 0.55, 0.28, t + d, null, 500); osc('sawtooth', 147 + i * 30, 147 + i * 30, 0.55, 0.2, t + d, null, 500); }); },
  victoria() { const t = Son.ctx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => osc('triangle', f, f, 0.5, 0.25, t + i * 0.13)); },
  derrota() { const t = Son.ctx.currentTime; [392, 349, 330, 262, 196].forEach((f, i) => osc('sawtooth', f, f * 0.95, 0.5, 0.2, t + i * 0.22, null, 900)); },
  clic() { osc('triangle', 660, 520, 0.06, 0.14); },
  error() { osc('square', 160, 110, 0.18, 0.14, null, null, 700); },
  congela() { osc('sine', 2200, 3300, 0.3, 0.1); osc('sine', 1700, 2600, 0.3, 0.08, Son.ctx.currentTime + 0.05); },
  pala() { ruido(0.1, 0.25, 600, 200); osc('square', 220, 120, 0.1, 0.12); },
  recarga() { osc('sine', 900, 1200, 0.08, 0.1); },
  aviso() { const t = Son.ctx.currentTime; [0, 0.25, 0.5].forEach((d) => osc('square', 440, 440, 0.18, 0.12, t + d, null, 1200)); },
  traga() { osc('sawtooth', 80, 200, 0.2, 0.25, null, null, 400); ruido(0.3, 0.3, 500, 150); },
  baila() { const t = Son.ctx.currentTime; [262, 330, 392, 330].forEach((f, i) => osc('square', f, f, 0.12, 0.08, t + i * 0.12, null, 1500)); },
  jarro() { ruido(0.15, 0.35, 3500, 800, 'highpass'); osc('sine', 400, 200, 0.1, 0.1); },
  hipno() { osc('sine', 300, 600, 0.5, 0.2); osc('sine', 305, 610, 0.5, 0.2); },
};
export function sfx(n, vol) {
  if (!Son.ctx || pausado || Son.vol.mudo || Son.ctx.state !== 'running') return;
  const now = performance.now(); if (ultimo[n] && now - ultimo[n] < (n === 'dispara' || n === 'impacto' || n === 'muerde' ? 70 : 30)) return; ultimo[n] = now;
  try { SFX[n] && SFX[n](vol); } catch (e) { /* sin audio */ }
}

/* ---------- musica generativa ---------- */
const ESC = {
  dia: { notas: [0, 2, 4, 7, 9, 12, 14, 16], raiz: 57, bpm: 104, bajo: [0, 0, 7, 5], ritmo: 'saltarin' },
  noche: { notas: [0, 3, 5, 7, 10, 12, 15], raiz: 52, bpm: 76, bajo: [0, 0, -2, -4], ritmo: 'lento' },
  piscina: { notas: [0, 2, 4, 6, 7, 9, 11, 12], raiz: 55, bpm: 112, bajo: [0, 4, 7, 4], ritmo: 'swing' },
  niebla: { notas: [0, 2, 4, 6, 8, 10, 12], raiz: 50, bpm: 66, bajo: [0, 1, 0, -1], ritmo: 'lento' },
  tejado: { notas: [0, 2, 4, 5, 7, 9, 10, 12], raiz: 53, bpm: 124, bajo: [0, 0, 5, 7], ritmo: 'marcha' },
  jefe: { notas: [0, 1, 4, 5, 7, 8, 11], raiz: 45, bpm: 132, bajo: [0, 0, 1, 0], ritmo: 'marcha' },
  menu: { notas: [0, 2, 4, 7, 9, 12], raiz: 60, bpm: 84, bajo: [0, 5, 7, 0], ritmo: 'lento' },
};
const mid = (n) => 440 * Math.pow(2, (n - 69) / 12);
let semilla = 1; const rn = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; };
export function musica(nombre) {
  if (!Son.ctx) { tema = nombre; return; }
  if (tema === nombre && timer) return; tema = nombre; paso = 0; prox = Son.ctx.currentTime + 0.1; semilla = 7 + nombre.length * 13;
  if (!timer) timer = setInterval(sec, 90);
}
export function parar() { tema = null; if (timer) { clearInterval(timer); timer = null; } }
function sec() {
  if (!Son.ctx || !tema || pausado || Son.ctx.state !== 'running') return;
  const E = ESC[tema] || ESC.dia, c = Son.ctx, dur = 60 / E.bpm / 2;
  while (prox < c.currentTime + 0.4) {
    const t = prox, p = paso, compas = Math.floor(p / 16) % 4, b = E.bajo[compas] + E.raiz - 12;
    const sw = E.ritmo === 'swing' && p % 2 ? dur * 0.3 : 0;
    if (p % 4 === 0) osc('triangle', mid(b), mid(b), dur * 3.6, 0.22, t, gM, 500);
    if (E.ritmo === 'marcha' && p % 4 === 2) osc('triangle', mid(b + 7), mid(b + 7), dur * 1.6, 0.12, t, gM, 600);
    if (p % 16 === 0) [0, 4, 7].forEach((i) => osc('sine', mid(E.raiz + E.bajo[compas] + i), mid(E.raiz + E.bajo[compas] + i), dur * 15, 0.05, t, gM));
    const dens = E.ritmo === 'lento' ? 0.35 : 0.6;
    if (rn() < dens) { const n = E.raiz + 12 + E.notas[Math.floor(rn() * E.notas.length)] + E.bajo[compas]; osc(E.ritmo === 'lento' ? 'sine' : 'square', mid(n), mid(n), dur * (1 + Math.floor(rn() * 2)), E.ritmo === 'lento' ? 0.12 : 0.06, t + sw, gM, 1800); }
    if (E.ritmo !== 'lento' && p % 2 === 0) ruido(0.04, p % 4 === 0 ? 0.08 : 0.04, 6000, 4000, 'highpass', t, gM);
    prox += dur; paso++;
  }
}
