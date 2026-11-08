// Sonido procedural con WebAudio (sin archivos): efectos, maullidos sintetizados y una musica ambiental generativa ligera.
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

/* maullido sintetico: diente de sierra con barrido de formante */
function miau(f0 = 520, dur = 0.5, v = 0.22, retraso = 0) {
  const t0 = ctx.currentTime + retraso, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; fl.type = 'bandpass'; fl.Q.value = 3.2;
  o.frequency.setValueAtTime(f0 * 0.8, t0); o.frequency.linearRampToValueAtTime(f0 * 1.25, t0 + dur * 0.35); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t0 + dur);
  fl.frequency.setValueAtTime(700, t0); fl.frequency.exponentialRampToValueAtTime(2300, t0 + dur * 0.4); fl.frequency.exponentialRampToValueAtTime(900, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(fl); fl.connect(g); g.connect(gEfectos); o.start(t0); o.stop(t0 + dur + 0.05);
}
const FX = {
  click: () => tono(520, 0.06, 'triangle', 0.15),
  selecciona: () => tono(700, 0.05, 'triangle', 0.12),
  carta: () => { ruido(0.09, 0.35, 1800, 700); tono(180, 0.1, 'sine', 0.3, 90); },
  robar: () => { ruido(0.16, 0.3, 900, 3200, 0, 1.2); },
  repartir: () => { ruido(0.07, 0.22, 2400, 1200); },
  baraja: () => { for (let i = 0; i < 7; i++) ruido(0.06, 0.2, 1500 + i * 150, 900, i * 0.05); miau(700, 0.3, 0.1, 0.3); },
  turno: () => { tono(660, 0.12, 'sine', 0.14); tono(990, 0.16, 'sine', 0.1, 0, 0.08); },
  mecha: () => { ruido(0.7, 0.18, 4200, 2500, 0, 0.6); tono(1900, 0.5, 'sine', 0.05, 2600); },
  boom: () => { ruido(0.9, 0.7, 500, 70, 0, 0.4); tono(110, 0.7, 'sine', 0.6, 38); tono(60, 0.9, 'triangle', 0.5, 30); ruido(0.3, 0.4, 3000, 400, 0.02, 0.5); miau(380, 0.6, 0.18, 0.12); },
  desactivar: () => { [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.35, 'sine', 0.16, 0, i * 0.09)); miau(820, 0.35, 0.1, 0.35); },
  ataque: () => { ruido(0.22, 0.45, 5000, 900, 0, 1.4); ruido(0.2, 0.4, 5000, 900, 0.1, 1.4); tono(260, 0.3, 'sawtooth', 0.14, 90); miau(420, 0.35, 0.16, 0.05); },
  siesta: () => { [392, 330, 262].forEach((f, i) => tono(f, 0.4, 'sine', 0.12, 0, i * 0.18)); },
  favor: () => { tono(784, 0.15, 'triangle', 0.14); tono(988, 0.2, 'triangle', 0.14, 0, 0.1); miau(900, 0.28, 0.1, 0.1); },
  futuro: () => { [880, 1175, 1568, 1976].forEach((f, i) => tono(f, 0.3, 'sine', 0.1, 0, i * 0.07)); },
  nope: () => { tono(300, 0.12, 'square', 0.18, 140); tono(190, 0.3, 'square', 0.16, 70, 0.08); miau(300, 0.35, 0.14, 0.02); },
  combo: () => { miau(560, 0.3, 0.14); miau(700, 0.3, 0.14, 0.22); },
  roba: () => { ruido(0.2, 0.3, 700, 2800, 0, 1.2); tono(500, 0.1, 'triangle', 0.1, 800, 0.1); },
  error: () => { tono(160, 0.16, 'square', 0.14, 110); },
  tictac: () => { tono(1500, 0.03, 'square', 0.07); },
  chat: () => { tono(880, 0.07, 'sine', 0.12); tono(1175, 0.09, 'sine', 0.1, 0, 0.06); },
  gana: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.28, 'triangle', 0.2, 0, i * 0.11)); miau(800, 0.4, 0.12, 0.6); },
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
    const esc = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    let k = 0;
    const nota = () => {
      if (!ctx || ctx.state !== 'running' || !Sonido.activo || vol.musica <= 0) return;
      const raiz = [0, 5, 3, 4][Math.floor(k / 4) % 4];
      const f = esc[(raiz + [0, 2, 4, 2][k % 4]) % esc.length] / 2;
      tono(f, 2.4, 'sine', 0.25, 0, 0, gMusica); if (k % 4 === 0) tono(f / 2, 3.2, 'triangle', 0.2, 0, 0, gMusica);
      k++;
    };
    nota(); musicaId = setInterval(nota, 1300);
  }
};
