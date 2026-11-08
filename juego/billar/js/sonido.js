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
  error: () => { tono(160, 0.18, 'square', 0.14, 110); },
  turno: () => { tono(880, 0.12, 'sine', 0.14); tono(1320, 0.16, 'sine', 0.1, 0, 0.07); },
  moneda: () => { tono(1320, 0.08, 'square', 0.1); tono(1760, 0.18, 'square', 0.1, 0, 0.07); },
  gana: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.28, 'triangle', 0.2, 0, i * 0.11)); },
  pierde: () => { [392, 330, 262, 196].forEach((f, i) => tono(f, 0.3, 'triangle', 0.16, 0, i * 0.14)); },
  taco: (v) => { ruido(0.07, 0.18 + 0.4 * v, 1600, 500, 0, 1.2); tono(150, 0.09, 'sine', 0.25 + 0.3 * v, 70); },
  bola: (v) => { const k = Math.min(1, v / 5); ruido(0.05, 0.08 + 0.45 * k, 4200, 2600, 0, 3); tono(1900 + 600 * k, 0.07, 'triangle', 0.05 + 0.18 * k, 1300); },
  banda: (v) => { const k = Math.min(1, v / 4); tono(150, 0.14, 'sine', 0.1 + 0.3 * k, 70); ruido(0.08, 0.06 + 0.2 * k, 900, 300, 0, 0.9); },
  tronera: () => { tono(420, 0.22, 'sine', 0.2, 120); ruido(0.28, 0.16, 700, 200, 0.05, 1); tono(190, 0.12, 'triangle', 0.2, 110, 0.22); }
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
  fx(n, v = 0.5) {
    if (!Sonido.activo || !asegurar() || ctx.state !== 'running') return;
    try { if (FX[n]) FX[n](v); } catch (e) { /* audio no disponible */ }
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
