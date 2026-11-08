// Audio procedural WebAudio (sin archivos): bote, golpe, red, puntos y musica suave.
let ctx = null, maestro, bus = {}, vol = { maestro: 0.8, musica: 0.3, efectos: 0.9, mudo: false }, musicaOn = false, tNota = 0, pasoM = 0, tmr = 0;
const ac = () => { if (ctx) return ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  maestro = ctx.createGain(); maestro.connect(ctx.destination);
  bus.fx = ctx.createGain(); bus.mu = ctx.createGain(); bus.fx.connect(maestro); bus.mu.connect(maestro); aplicar(); return ctx; };
function aplicar() { if (!ctx) return; const m = vol.mudo ? 0 : vol.maestro; maestro.gain.value = m; bus.fx.gain.value = vol.efectos; bus.mu.gain.value = vol.musica * 0.5; }
export function ajustar(v) { Object.assign(vol, v); aplicar(); if (!vol.mudo && vol.musica > 0 && musicaOn) iniciarMusica(); }
export function activar() { const c = ac(); if (c && c.state === 'suspended') c.resume(); }
export function suspender(s) { if (!ctx) return; if (s) ctx.suspend(); else if (!vol.mudo) ctx.resume(); }
function tono(f, d, tipo = 'sine', g = 0.3, f2, bus_ = 'fx', t0 = 0) {
  const c = ac(); if (!c || vol.mudo) return;
  const t = c.currentTime + t0, o = c.createOscillator(), a = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(a); a.connect(bus[bus_]); o.start(t); o.stop(t + d + 0.02);
}
function ruido(d, g, fc, t0 = 0) {
  const c = ac(); if (!c || vol.mudo) return;
  const n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), x = buf.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = 1.2;
  a.gain.value = g; s.connect(f); f.connect(a); a.connect(bus.fx); s.start(c.currentTime + t0);
}
export const bote = (v = 3) => { const k = Math.min(1, v / 5); tono(1400 + Math.random() * 200, 0.05, 'triangle', 0.1 + 0.25 * k, 900); ruido(0.03, 0.06 * k, 3000); };
export const golpe = (f = 0.5) => { tono(520 + 300 * f, 0.07, 'square', 0.12 + 0.12 * f, 260); ruido(0.05, 0.12 + 0.18 * f, 1800); };
export const red = () => tono(220, 0.08, 'sine', 0.2, 140);
export const suelo = () => tono(900, 0.05, 'triangle', 0.08, 500);
export const punto = (gano) => { const n = gano ? [523, 659, 784] : [392, 330, 262]; n.forEach((f, i) => tono(f, 0.18, 'triangle', 0.2, null, 'fx', i * 0.09)); };
export const juegoGanado = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.25, 'triangle', 0.22, null, 'fx', i * 0.1));
export const clic = () => tono(660, 0.04, 'triangle', 0.1);
export const moneda = () => { tono(988, 0.07, 'square', 0.1); tono(1319, 0.14, 'square', 0.1, null, 'fx', 0.07); };
const ESC = [0, 3, 7, 10, 12, 10, 7, 3], BASE = 196;
function ciclo() {
  const c = ac(); if (!c || !musicaOn || vol.mudo || vol.musica <= 0) return;
  while (tNota < c.currentTime + 0.4) {
    const n = BASE * Math.pow(2, ((ESC[pasoM % 8] + (Math.floor(pasoM / 8) % 2) * 5) % 24) / 12);
    const o = c.createOscillator(), a = c.createGain(), t = Math.max(tNota, c.currentTime);
    o.type = 'sine'; o.frequency.value = n; a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.2, t + 0.03); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(a); a.connect(bus.mu); o.start(t); o.stop(t + 0.55);
    tNota = t + 0.28; pasoM++;
  }
}
export function iniciarMusica() { const c = ac(); if (!c) return; musicaOn = true; clearInterval(tmr); tNota = c.currentTime; tmr = setInterval(ciclo, 150); }
export function pararMusica() { musicaOn = false; clearInterval(tmr); }
