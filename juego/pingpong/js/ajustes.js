// Ajustes por dispositivo (clave pingpong_ajustes_dispositivo): graficos, audio, controles, accesibilidad.
import { K, leer, escribir } from './almacen.js';

export const PRESETS = {
  baja: { sombras: 0, antialias: false, res: 0.7, fps: 30, detalle: 0, estela: false },
  media: { sombras: 1, antialias: false, res: 1, fps: 60, detalle: 1, estela: true },
  alta: { sombras: 2, antialias: true, res: 1.25, fps: 60, detalle: 2, estela: true },
  ultra: { sombras: 3, antialias: true, res: 2, fps: 0, detalle: 3, estela: true }
};
export const TECLAS_DEF = { izq: ['ArrowLeft', 'KeyA'], der: ['ArrowRight', 'KeyD'], golpe: ['Space'], top: ['KeyE', 'ArrowUp'], corte: ['KeyQ', 'ArrowDown'], fuerte: ['ShiftLeft', 'ShiftRight'], pausa: ['Escape', 'KeyP'] };
export const NOMBRES_TECLA = { izq: 'Apuntar izquierda', der: 'Apuntar derecha', golpe: 'Golpe plano / saque', top: 'Golpe con topspin', corte: 'Corte (backspin)', fuerte: 'Más fuerza (mantener)', pausa: 'Pausa' };

const esTactil = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
export function presetAuto() {
  const n = navigator.hardwareConcurrency || 4, m = navigator.deviceMemory || 4;
  if (esTactil()) return n >= 6 && m >= 4 ? 'media' : 'baja';
  return 'alta';
}
export function porDefecto() {
  const pre = presetAuto();
  return {
    v: 1,
    gr: Object.assign({ preset: pre, mostrarFps: false, auto: true, guia: true }, PRESETS[pre]),
    au: { maestro: 0.8, musica: 0.3, efectos: 0.9, mudo: false },
    ct: { sens: 1, invertirY: false, zona: 0.18, vibracion: true, vibInt: 0.8, teclas: JSON.parse(JSON.stringify(TECLAS_DEF)), tam: 1, opacidad: 0.9, zurdo: false, ayuda: 1, efecto: 'auto' },
    ac: { textoGrande: false, daltonismo: 'no', reducir: false, velocidad: 1 }
  };
}
export function normalizar(o) {
  const d = porDefecto(); if (!o || typeof o !== 'object') return d;
  for (const g of ['gr', 'au', 'ct', 'ac']) if (o[g] && typeof o[g] === 'object') Object.assign(d[g], o[g]);
  d.ct.teclas = Object.assign(JSON.parse(JSON.stringify(TECLAS_DEF)), (o.ct && o.ct.teclas) || {});
  const c = (x, a, b, def) => (Number.isFinite(+x) ? Math.max(a, Math.min(b, +x)) : def);
  d.au.maestro = c(d.au.maestro, 0, 1, 0.8); d.au.musica = c(d.au.musica, 0, 1, 0.3); d.au.efectos = c(d.au.efectos, 0, 1, 0.9);
  d.gr.res = c(d.gr.res, 0.5, 2, 1); d.ct.ayuda = c(d.ct.ayuda, 0.8, 1.5, 1); d.ac.velocidad = c(d.ac.velocidad, 0.6, 1.2, 1);
  d.ct.sens = c(d.ct.sens, 0.5, 2, 1); d.ct.zona = c(d.ct.zona, 0, 0.5, 0.18); d.ct.tam = c(d.ct.tam, 0.7, 1.5, 1); d.ct.opacidad = c(d.ct.opacidad, 0.3, 1, 0.9); d.ct.vibInt = c(d.ct.vibInt, 0, 1, 0.8);
  return d;
}
export const cargar = () => normalizar(leer(K.ajustes));
export const guardar = (a) => escribir(K.ajustes, a);
export const aplicarPreset = (a, nombre) => { if (PRESETS[nombre]) { Object.assign(a.gr, PRESETS[nombre]); a.gr.preset = nombre; } return a; };
export const exportar = (a, p) => JSON.stringify({ pingpong: 1, ajustes: a, progreso: p });
