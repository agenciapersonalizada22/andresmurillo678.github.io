// Ajustes por dispositivo (graficos, audio, controles, accesibilidad, recordatorio): clave mente_ajustes_dispositivo, nunca se sincroniza.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const TECLAS_BASE = { izq: 'arrowleft', der: 'arrowright', arriba: 'arrowup', abajo: 'arrowdown', ok: 'enter', pausa: 'escape' };
const BASE = {
  calidad: 'alta', particulas: true, sombras: true, animaciones: true, resolucion: 1, fpsMax: 60, mostrarFps: false, autoBajada: true,
  sonido: { maestro: 0.7, efectos: 0.9, musica: 0, pausaOculta: true },
  vibracion: true, vibIntensidad: 0.6, zonaMuerta: 0.5, zurdo: false, tamBotones: 100, teclas: { ...TECLAS_BASE },
  acc: { textoGrande: false, daltonismo: false, reducirMov: false, altoContraste: false, tiempoExtra: 1 },
  recordatorio: { on: false, hora: '19:00', ultimo: '' }
};
export const PRESETS = {
  baja: { particulas: false, sombras: false, animaciones: false, resolucion: 0.75 },
  media: { particulas: false, sombras: true, animaciones: true, resolucion: 1 },
  alta: { particulas: true, sombras: true, animaciones: true, resolucion: 1 },
  ultra: { particulas: true, sombras: true, animaciones: true, resolucion: 1.5 }
};
export const D = mezclar(BASE, leer(CLAVES.dispositivo, {}));
if (!leer(CLAVES.dispositivo)) {
  try {
    if (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600) { D.calidad = 'media'; Object.assign(D, PRESETS.media); }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) D.acc.reducirMov = true;
  } catch (e) { /* sin matchMedia */ }
}
const oyentes = [];
export const suscribir = (f) => oyentes.push(f);
let diferido = 0;
export function guardar() {
  clearTimeout(diferido);
  diferido = setTimeout(guardarYa, 250);
  aplicar(); oyentes.forEach((f) => f());
}
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.dispositivo, D); }
export function ponerCalidad(c) { D.calidad = c; Object.assign(D, PRESETS[c]); guardar(); }
export function bajarCalidad() {
  const o = ['ultra', 'alta', 'media', 'baja'], i = o.indexOf(D.calidad);
  if (i >= 0 && i < 3) { ponerCalidad(o[i + 1]); return true; }
  return false;
}
export function restablecer() { Object.assign(D, mezclar(BASE, {})); D.teclas = { ...TECLAS_BASE }; guardar(); }
export function aplicar() {
  const b = document.body; if (!b) return;
  const a = D.acc;
  b.classList.toggle('texto-grande', a.textoGrande);
  b.classList.toggle('contraste', a.altoContraste);
  b.classList.toggle('sin-mov', a.reducirMov);
  b.classList.toggle('dalt', a.daltonismo);
  b.classList.toggle('sin-sombras', !D.sombras);
  b.classList.toggle('sin-anim', !D.animaciones || a.reducirMov);
  b.classList.toggle('zurdo', D.zurdo);
  b.style.setProperty('--tam-btn', String(D.tamBotones / 100));
  const f = document.getElementById('fps'); if (f && !D.mostrarFps) f.hidden = true;
}
export const tiempoExtra = () => Math.max(1, D.acc.tiempoExtra || 1);
export function exportarDispositivo() { return JSON.stringify(D); }
