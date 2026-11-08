// Audio sintetizado con WebAudio (sin archivos): efectos con paneo/distancia y una musica ambiental suave.
let ctx = null, master, gMus, gSfx, ruidoBuf, timer = 0, nota = 0;
const A = { maestro: 0.8, musica: 0.35, efectos: 0.9, silencio: false };
export function configurar(a) {
  Object.assign(A, { maestro: a.maestro, musica: a.musica, efectos: a.efectos, silencio: a.silencio });
  if (!ctx) return;
  master.gain.value = A.silencio ? 0 : A.maestro; gMus.gain.value = A.musica * 0.5; gSfx.gain.value = A.efectos;
}
export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); gMus = ctx.createGain(); gSfx = ctx.createGain();
  gMus.connect(master); gSfx.connect(master); master.connect(ctx.destination);
  ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  configurar(A);
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}
const sal = (pan) => { if (!pan || !ctx.createStereoPanner) return gSfx; const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(gSfx); return p; };
function tono(f0, f1, dur, tipo, vol, pan, ret = 0) {
  const t = ctx.currentTime + ret, o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(sal(pan)); o.start(t); o.stop(t + dur + 0.02);
}
function rafaga(dur, vol, fc, pan, tipo = 'lowpass', ret = 0) {
  const t = ctx.currentTime + ret, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = ruidoBuf; f.type = tipo; f.frequency.value = fc;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g); g.connect(sal(pan)); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const S = {
  pistola: (v, p) => { rafaga(0.12, 0.5 * v, 2500, p); tono(380, 90, 0.1, 'square', 0.18 * v, p); },
  smg: (v, p) => { rafaga(0.08, 0.4 * v, 3200, p); tono(520, 130, 0.07, 'square', 0.14 * v, p); },
  escopeta: (v, p) => { rafaga(0.32, 0.9 * v, 1400, p); tono(160, 40, 0.25, 'sawtooth', 0.3 * v, p); },
  rifle: (v, p) => { rafaga(0.14, 0.55 * v, 2000, p); tono(300, 60, 0.13, 'sawtooth', 0.22 * v, p); },
  francotirador: (v, p) => { rafaga(0.5, 1 * v, 900, p); tono(140, 30, 0.45, 'sawtooth', 0.4 * v, p); },
  cohete: (v, p) => { rafaga(0.6, 0.7 * v, 600, p); tono(200, 50, 0.5, 'sawtooth', 0.25 * v, p); },
  explosion: (v, p) => { rafaga(1.1, 1.1 * v, 500, p); tono(90, 25, 0.9, 'sine', 0.6 * v, p); },
  recarga: (v) => { tono(900, 700, 0.05, 'square', 0.12 * v); tono(500, 800, 0.06, 'square', 0.12 * v, 0, 0.35); },
  recoger: (v) => { tono(600, 1100, 0.1, 'triangle', 0.25 * v); },
  golpe: (v, p) => { rafaga(0.08, 0.5 * v, 700, p); tono(180, 90, 0.08, 'square', 0.2 * v, p); },
  cosecha: (v, p) => { rafaga(0.1, 0.6 * v, 1200, p); tono(240, 120, 0.1, 'triangle', 0.3 * v, p); },
  hit: (v) => { tono(1400, 900, 0.05, 'square', 0.2 * v); },
  headshot: (v) => { tono(1900, 1200, 0.09, 'square', 0.25 * v); },
  dano: (v) => { tono(160, 70, 0.2, 'sawtooth', 0.3 * v); },
  construir: (v, p) => { tono(300, 520, 0.08, 'triangle', 0.25 * v, p); rafaga(0.06, 0.3 * v, 1500, p); },
  romper: (v, p) => { rafaga(0.35, 0.8 * v, 900, p); tono(140, 50, 0.3, 'square', 0.25 * v, p); },
  curar: (v) => { tono(500, 900, 0.25, 'sine', 0.25 * v); tono(700, 1200, 0.25, 'sine', 0.2 * v, 0, 0.12); },
  salto: (v) => { tono(250, 420, 0.1, 'sine', 0.12 * v); },
  ui: (v) => { tono(700, 900, 0.05, 'triangle', 0.15 * v); },
  emote: (v) => { tono(500, 800, 0.1, 'triangle', 0.2 * v); tono(800, 1000, 0.1, 'triangle', 0.2 * v, 0, 0.1); },
  bus: (v) => { tono(110, 105, 0.6, 'sawtooth', 0.12 * v); },
  tormenta: (v) => { rafaga(1.2, 0.35 * v, 300, 0); tono(60, 50, 1.2, 'sine', 0.3 * v); },
  victoria: (v) => { [523, 659, 784, 1047].forEach((f, i) => tono(f, f, 0.4, 'triangle', 0.3 * v, 0, i * 0.16)); },
  derrota: (v) => { [392, 330, 262].forEach((f, i) => tono(f, f * 0.98, 0.5, 'triangle', 0.3 * v, 0, i * 0.22)); }
};
export function sfx(n, vol = 1, pan = 0) { if (!ctx || A.silencio || !S[n] || vol <= 0.02 || ctx.state !== 'running') return; try { S[n](Math.min(1, vol), pan); } catch (e) { /* audio no disponible */ } }
export function musica(on) {
  clearInterval(timer); timer = 0; if (!on || !ctx) return;
  const NOTAS = [220, 261.6, 329.6, 293.7, 246.9, 196], paso = () => {
    if (!ctx || ctx.state !== 'running' || A.silencio) return;
    const f = NOTAS[nota++ % NOTAS.length], t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), o2 = ctx.createOscillator();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 1.5; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 3.8);
    o.connect(g); o2.connect(g); g.connect(gMus); o.start(t); o2.start(t); o.stop(t + 4); o2.stop(t + 4);
  };
  paso(); timer = setInterval(paso, 3000);
}
