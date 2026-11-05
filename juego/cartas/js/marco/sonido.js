// Sonidos procedurales (Web Audio): fichas, cartas, volteo, victoria, derrota, aviso de turno.
let ctx = null, maestro = null;
export const vol = { maestro: 0.8, efectos: 0.9, mute: false };
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); maestro = ctx.createGain(); maestro.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  maestro.gain.value = vol.mute ? 0 : vol.maestro * vol.efectos;
  return ctx;
}
export function desbloquear() { audio(); }
function ruido(dur, f0, f1, g, t0) {
  const c = audio(); if (!c) return; t0 = t0 || c.currentTime;
  const n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = 1.2;
  const a = c.createGain(); a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f); f.connect(a); a.connect(maestro); s.start(t0);
}
function tono(freq, dur, tipo, g, t0, f2) {
  const c = audio(); if (!c) return; t0 = t0 || c.currentTime;
  const o = c.createOscillator(), a = c.createGain(); o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(a); a.connect(maestro); o.start(t0); o.stop(t0 + dur + 0.02);
}
export const Sonido = {
  carta() { ruido(0.09, 3200, 1400, 0.35); },
  voltear() { ruido(0.12, 2200, 5200, 0.3); },
  barajar() { const c = audio(); if (!c) return; for (let i = 0; i < 6; i++) ruido(0.07, 3000, 1800, 0.22, c.currentTime + i * 0.06); },
  fichas(n) { const c = audio(); if (!c) return; n = Math.min(5, n || 2); for (let i = 0; i < n; i++) { const t = c.currentTime + i * 0.055; tono(1900 + Math.random() * 500, 0.07, 'triangle', 0.22, t, 1200); tono(2900, 0.04, 'square', 0.05, t); } },
  turno() { tono(660, 0.12, 'sine', 0.25); tono(880, 0.16, 'sine', 0.25, audio() && ctx.currentTime + 0.1); },
  tick() { tono(1200, 0.04, 'square', 0.08); },
  ganar() { const c = audio(); if (!c) return; [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.22, 'triangle', 0.22, c.currentTime + i * 0.09)); },
  perder() { tono(300, 0.4, 'sawtooth', 0.12, null, 120); },
  clic() { tono(900, 0.04, 'square', 0.07); },
};
