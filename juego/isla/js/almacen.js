// Almacenamiento de Isla Final: ajustes de dispositivo (nunca van a la nube), progreso (sincronizable) y partida en curso (solo un jugador).
export const CLAVES = { ajustes: 'isla_ajustes_dispositivo', progreso: 'isla_progreso', partida: 'isla_partida' };
export const CLAVES_NUBE = [CLAVES.progreso];
export function leer(k, def) { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : def; } catch (e) { return def; } }
export function escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
export function borrar(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }

export const TECLAS = {
  adelante: 'KeyW', atras: 'KeyS', izq: 'KeyA', der: 'KeyD', saltar: 'Space', correr: 'ShiftLeft', recargar: 'KeyR', interactuar: 'KeyE',
  pared: 'KeyQ', piso: 'KeyF', rampa: 'KeyC', techo: 'KeyV', editar: 'KeyG', material: 'KeyB', emote: 'KeyT', mapa: 'KeyM', curar: 'KeyH'
};
export const AJ_DEF = {
  calidad: 'auto', sombras: 0, dist: 300, aa: 0, pr: 0.8, fps: 60, verFps: false, autoBajar: true, vegetacion: 0.6,
  maestro: 0.8, musica: 0.35, efectos: 0.9, silencio: false,
  sens: 1, invY: false, zona: 0.18, vibrar: true, vibInt: 0.7, teclas: { ...TECLAS }, tactilTam: 1, tactilOp: 0.75, tactilPos: 0, zurdo: false,
  textoGrande: false, daltonico: 'no', reducirMov: false
};
export const PRESETS = {
  baja: { sombras: 0, dist: 260, aa: 0, pr: 0.7, vegetacion: 0.45 },
  media: { sombras: 1, dist: 380, aa: 0, pr: 1, vegetacion: 0.75 },
  alta: { sombras: 2, dist: 520, aa: 1, pr: 1.25, vegetacion: 1 },
  ultra: { sombras: 3, dist: 700, aa: 1, pr: 2, vegetacion: 1 }
};
export const esMovil = () => matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
export function cargarAjustes() {
  const a = Object.assign({}, AJ_DEF, leer(CLAVES.ajustes, {}));
  a.teclas = Object.assign({}, TECLAS, a.teclas || {});
  if (a.calidad === 'auto') Object.assign(a, PRESETS[esMovil() ? 'baja' : 'alta']);
  else if (PRESETS[a.calidad]) Object.assign(a, PRESETS[a.calidad]);
  return a;
}
export const guardarAjustes = (a) => escribir(CLAVES.ajustes, a);

export const SKINS = [
  { id: 'base', nombre: 'Explorador', precio: 0, c1: null, c2: '#2b3a55', c3: '#f1c9a0' },
  { id: 'rojo', nombre: 'Comando rojo', precio: 150, c1: '#c9302c', c2: '#3a1a1a', c3: '#f1c9a0' },
  { id: 'sombra', nombre: 'Sombra', precio: 250, c1: '#22242b', c2: '#111', c3: '#bbb', acc: 'gorro' },
  { id: 'duende', nombre: 'Duende', precio: 300, c1: '#2f9e44', c2: '#4a3a1a', c3: '#e8d29a', acc: 'gorro' },
  { id: 'robot', nombre: 'Robot', precio: 500, c1: '#9aa7b5', c2: '#566271', c3: '#c8d2dc', acc: 'antena', robot: true },
  { id: 'diablo', nombre: 'Diablillo', precio: 450, c1: '#a31d1d', c2: '#3b0d0d', c3: '#d84a3a', acc: 'cuernos' },
  { id: 'astro', nombre: 'Astronauta', precio: 600, c1: '#f2f2f2', c2: '#cfd4da', c3: '#e8eef5', acc: 'mochila' },
  { id: 'oro', nombre: 'Oro', precio: 800, c1: '#e0b030', c2: '#8a6a10', c3: '#f4d56a', acc: 'corona' }
];
export const ESTAD_DEF = { partidas: 0, victorias: 0, elims: 0, muertes: 0, top5: 0, mejorElim: 0, dano: 0, mats: 0, piezas: 0, tiempo: 0, mejorPuesto: 99 };
export function cargarProgreso() {
  const p = leer(CLAVES.progreso, null) || {};
  return { v: 1, monedas: p.monedas | 0, skins: Array.isArray(p.skins) && p.skins.length ? p.skins : ['base'], skin: p.skin || 'base', logros: p.logros || {}, pref: Object.assign({ dif: 'normal', total: 20 }, p.pref || {}), stats: Object.assign({}, ESTAD_DEF, p.stats || {}) };
}
export const guardarProgreso = (p) => escribir(CLAVES.progreso, p);
