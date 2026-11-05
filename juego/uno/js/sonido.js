// Sonido procedural con WebAudio (sin archivos). Efectos cortos y una musica ambiental generativa muy ligera.
let ctx = null, maestro = null, gEfectos = null, gMusica = null, ruidoBuf = null, musicaId = 0;
const vol = { maestro: 0.8, efectos: 0.9, musica: 0.3 };

function asegurar() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    maestro = ctx.createGain(); maestro.connect(ctx.destination);
    gEfectos = ctx.createGain(); gEfectos.connect(maestro);
    gMusica = ctx.createGain(); gMusica.connect(maestro);
    const n = ctx.sampleRate * 0.6;
    ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    aplicar();
  } catch (e) { ctx = null; }
  return ctx;
}
function aplicar() {
  if (!ctx) return;
  maestro.gain.value = vol.maestro; gEfectos.gain.value = vol.efectos; gMusica.gain.value = vol.musica * 0.5;
}
function tono(f, dur, tipo = 'sine', v = 0.3, f2 = 0, retraso = 0, destino) {
  const t0 = ctx.currentTime + retraso, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(destino || gEfectos); o.start(t0); o.stop(t0 + dur + 0.05);
}
function ruido(dur, v = 0.2, f = 2000, f2 = 0, retraso = 0, q = 0.8) {
  const t0 = ctx.currentTime + retraso, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruidoBuf; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(gEfectos); s.start(t0); s.stop(t0 + dur + 0.05);
}

const FX = {
  click: () => tono(520, 0.06, 'triangle', 0.15),
  selecciona: () => tono(660, 0.05, 'triangle', 0.12),
  jugar: () => { ruido(0.09, 0.35, 1800, 700); tono(180, 0.1, 'sine', 0.3, 90); },
  robar: () => { ruido(0.18, 0.3, 900, 3200, 0, 1.2); },
  repartir: () => { ruido(0.07, 0.22, 2400, 1200); },
  rebaraja: () => { for (let i = 0; i < 6; i++) ruido(0.06, 0.2, 1500 + i * 150, 900, i * 0.05); },
  turno: () => { tono(880, 0.12, 'sine', 0.14); tono(1320, 0.16, 'sine', 0.1, 0, 0.07); },
  salto: () => { tono(400, 0.25, 'square', 0.12, 120); },
  reversa: () => { tono(300, 0.2, 'sawtooth', 0.1, 900); tono(900, 0.2, 'sawtooth', 0.08, 300, 0.18); },
  mas2: () => { tono(200, 0.2, 'sawtooth', 0.18, 110); tono(240, 0.2, 'sawtooth', 0.1, 130, 0.1); },
  mas4: () => { for (let i = 0; i < 4; i++) tono(220 - i * 25, 0.18, 'sawtooth', 0.16, 90, i * 0.1); },
  comodin: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.14, 'triangle', 0.14, 0, i * 0.06)); },
  uno: () => { tono(700, 0.12, 'square', 0.15); tono(1050, 0.2, 'square', 0.15, 0, 0.1); },
  cazado: () => { tono(500, 0.3, 'sawtooth', 0.2, 120); ruido(0.2, 0.25, 600, 200); },
  desafio: () => { tono(330, 0.1, 'square', 0.15); tono(247, 0.25, 'square', 0.15, 0, 0.1); },
  error: () => { tono(160, 0.16, 'square', 0.14, 110); },
  tictac: () => { tono(1500, 0.03, 'square', 0.07); },
  chat: () => { tono(880, 0.07, 'sine', 0.12); tono(1175, 0.09, 'sine', 0.1, 0, 0.06); },
  gana: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.28, 'triangle', 0.2, 0, i * 0.11)); },
  pierde: () => { [392, 330, 262, 196].forEach((f, i) => tono(f, 0.3, 'triangle', 0.16, 0, i * 0.14)); }
};

export const Sonido = {
  activo: true,
  ajustar(o) {
    if (o.maestro != null) vol.maestro = o.maestro;
    if (o.efectos != null) vol.efectos = o.efectos;
    if (o.musica != null) vol.musica = o.musica;
    aplicar();
  },
  despertar() { const c = asegurar(); if (c && c.state === 'suspended') c.resume().catch(() => {}); },
  suspender(b) { if (!ctx) return; (b ? ctx.suspend() : ctx.resume()).catch(() => {}); },
  fx(n) {
    if (!Sonido.activo || !asegurar() || ctx.state !== 'running') return;
    try { if (FX[n]) FX[n](); } catch (e) { /* audio no disponible */ }
  },
  musica(on) {
    clearInterval(musicaId); musicaId = 0;
    if (!on || !asegurar()) return;
    const esc = [261.6, 311.1, 349.2, 392, 466.2, 523.3, 622.3];
    let k = 0;
    const nota = () => {
      if (!ctx || ctx.state !== 'running' || !Sonido.activo || vol.musica <= 0) return;
      const raiz = [0, 3, 5, 2][Math.floor(k / 4) % 4];
      const f = esc[(raiz + [0, 2, 4, 2][k % 4]) % esc.length] / 2;
      tono(f, 2.4, 'sine', 0.25, 0, 0, gMusica); if (k % 4 === 0) tono(f / 2, 3.2, 'triangle', 0.2, 0, 0, gMusica);
      k++;
    };
    nota(); musicaId = setInterval(nota, 1300);
  }
};
