// Sonidos suaves sintetizados con WebAudio (sin archivos). Conjuntos desbloqueables: suave, campanas, madera.
import { D } from './ajustes.js';
let ctx = null, maestro = null, timerMusica = 0, paso = 0;
export const Sonido = { conjunto: 'suave' };
const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25];
function asegurar() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); maestro = ctx.createGain(); maestro.connect(ctx.destination); } catch (e) { ctx = null; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function nota(f, dur, vol, tipo, retardo = 0) {
  const c = asegurar(); if (!c) return;
  const t = c.currentTime + retardo, o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(maestro); o.start(t); o.stop(t + dur + 0.05);
}
export function tono(f, dur = 0.2, vol = 0.16) {
  const v = D.sonido.maestro * D.sonido.efectos * vol; if (v <= 0.001) return;
  const c = Sonido.conjunto;
  if (c === 'campanas') { nota(f, dur * 2, v, 'sine'); nota(f * 2, dur * 1.3, v * 0.35, 'sine'); nota(f * 3, dur * 0.8, v * 0.15, 'sine'); }
  else if (c === 'madera') { nota(f * 0.8, Math.min(dur, 0.12), v * 1.1, 'triangle'); }
  else nota(f, dur, v, 'sine');
}
const melodia = (fs, paso = 0.09, d = 0.2) => fs.forEach((f, i) => { const v = D.sonido.maestro * D.sonido.efectos * 0.14; if (v > 0.001) { const c = Sonido.conjunto; nota(f, d * (c === 'campanas' ? 2 : 1), v, c === 'madera' ? 'triangle' : 'sine', i * paso); } });
Sonido.tono = tono;
Sonido.clic = () => tono(520, 0.06, 0.08);
Sonido.ok = () => melodia([523.25, 659.25], 0.07, 0.16);
Sonido.mal = () => tono(196, 0.22, 0.12);
Sonido.nivel = () => melodia([392, 523.25, 659.25], 0.08, 0.22);
Sonido.fin = () => melodia([523.25, 392, 523.25, 783.99], 0.12, 0.3);
Sonido.logro = () => melodia([659.25, 783.99, 987.77, 1318.5], 0.1, 0.3);
Sonido.musica = (on) => {
  clearInterval(timerMusica); timerMusica = 0;
  if (!on || D.sonido.musica <= 0.01) return;
  const toca = () => {
    const v = D.sonido.maestro * D.sonido.musica * 0.12; if (v <= 0.001) return;
    const base = PENTA[paso++ % PENTA.length];
    nota(base / 2, 3.2, v, 'sine'); nota(base, 2.6, v * 0.6, 'sine', 0.25); nota(PENTA[(paso + 2) % PENTA.length], 2.2, v * 0.4, 'sine', 0.6);
  };
  asegurar(); toca(); timerMusica = setInterval(toca, 3000);
};
Sonido.suspender = (s) => { if (!ctx) return; if (s) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); };
document.addEventListener('visibilitychange', () => { if (D.sonido.pausaOculta) Sonido.suspender(document.hidden); });
['pointerdown', 'keydown'].forEach((e) => addEventListener(e, () => { asegurar(); }, { once: true, passive: true }));
