// Sonidos suaves sintetizados con Web Audio (sin archivos).
import { A } from './ajustes.js';

let ctx = null, maestro = null;
function iniciar() {
  if (ctx) return ctx;
  try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); maestro = ctx.createGain(); maestro.connect(ctx.destination); } catch (e) { ctx = null; }
  return ctx;
}
export const desbloquear = () => { const c = iniciar(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
function nota(f, t0, dur, tipo = 'sine', vol = 0.18, f2) {
  const c = iniciar(); if (!c || A.audio.silencio || !A.audio.efectos) return;
  const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol * A.audio.maestro, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(maestro); o.start(t); o.stop(t + dur + 0.02);
}
const SONIDOS = {
  poner: () => nota(620, 0, 0.09, 'sine', 0.2, 540),
  nota: () => nota(900, 0, 0.05, 'triangle', 0.1),
  borrar: () => nota(300, 0, 0.08, 'sine', 0.12, 220),
  error: () => { nota(190, 0, 0.22, 'triangle', 0.22, 140); nota(150, 0.07, 0.22, 'triangle', 0.16, 110); },
  pista: () => { nota(660, 0, 0.14, 'sine', 0.14); nota(880, 0.1, 0.2, 'sine', 0.14); },
  seleccion: () => nota(1000, 0, 0.03, 'sine', 0.05),
  unidad: () => [523, 659, 784].forEach((f, i) => nota(f, i * 0.07, 0.2, 'sine', 0.12)),
  victoria: () => [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.11, 0.5, 'sine', 0.16)),
  derrota: () => [392, 330, 262].forEach((f, i) => nota(f, i * 0.18, 0.4, 'triangle', 0.16))
};
export const sonar = (n) => { try { if (SONIDOS[n]) SONIDOS[n](); } catch (e) { /* sin audio */ } };
export const vibrar = (ms) => {
  try {
    if (!A.controles.vibracion) return;
    if (navigator.vibrate) navigator.vibrate(Math.max(5, Math.round(ms * A.controles.vibIntensidad)));
    if (window.Mando && window.Mando.conectado) window.Mando.vibrar(0.5 * A.controles.vibIntensidad, 0.4 * A.controles.vibIntensidad, ms);
  } catch (e) { /* sin vibracion */ }
};
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); });
