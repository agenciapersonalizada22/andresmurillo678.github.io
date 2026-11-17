// Almacenamiento: ajustes por dispositivo, progreso (sincronizable) y partida efimera. Un solo modulo.
import { P, IDS_P, SLOTS_BASE, SLOTS_MAX, desbloqueada, MUNDOS, NIV_POR_MUNDO } from './datos.js';
export const K_AJ = 'jardin2_ajustes_dispositivo', K_PR = 'jardin2_progreso', K_PA = 'jardin2_partida';
const ls = {
  g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  s(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  d(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
};
export const AJ_DEF = {
  graficos: { calidad: 'media', particulas: true, luces: true, sombras: true, fps: 60, mostrarFps: false, auto: true, res: 1 },
  audio: { maestro: 0.8, musica: 0.5, efectos: 0.8, mudo: false },
  controles: { zona: 0.2, vib: true, vibInt: 0.6, zurdo: false, tam: 1, op: 1, sensCursor: 1, tactil: 'toque', teclas: { arriba: 'ArrowUp', abajo: 'ArrowDown', izq: 'ArrowLeft', der: 'ArrowRight', plantar: 'Enter', pala: 'x', energia: 'e', sol: 's', sig: 'w', ant: 'q', pausa: 'Escape' } },
  accesibilidad: { texto: 1, dalt: 'no', reducir: false, autoSol: false, contraste: false },
  juego: { dif: 'normal', vel: 1, tutorial: true, adaptativa: false, pistas: true },
};
const mezcla = (b, a) => { const o = Array.isArray(b) ? [] : {}; for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? mezcla(b[k], a && typeof a[k] === 'object' ? a[k] : {}) : (a && a[k] !== undefined && typeof a[k] === typeof b[k] ? a[k] : b[k]); return o; };
export let AJ = mezcla(AJ_DEF, {});
export function cargarAjustes() { try { AJ = mezcla(AJ_DEF, JSON.parse(ls.g(K_AJ) || '{}')); } catch (e) { AJ = mezcla(AJ_DEF, {}); } return AJ; }
export function guardarAjustes() { ls.s(K_AJ, JSON.stringify(AJ)); }
export function restablecerAjustes() { AJ = mezcla(AJ_DEF, {}); guardarAjustes(); return AJ; }

export const PR_DEF = () => ({
  v: 1, hechos: {}, llaves: {}, monedas: 100, gemas: 5, ganadas: 0, tienda: {}, potenc: {}, poderes: { libres: 3 }, loadout: [], vistosZ: {}, vistosP: {}, col: {}, colRec: {}, misiones: { dia: 0, prog: {}, hechas: {}, mundo: {} },
  diario: { dia: 0, hecho: false, racha: 0, ultimo: 0 }, arena: { semana: 0, mejor: 0, intentos: 0 }, sinfin: { mejor: 0, runs: 0 }, logros: {}, tut: {}, derrotas: {}, victorias: 0, stats: { plantadas: 0, matados: 0, soles: 0, victorias: 0, derrotas: 0, energias: 0, poderes: 0, pinatas: 0, tumbas: 0, jefes: 0, tiempo: 0, mejoras: 0, brill: 0, vagonetas: 0 },
});
export let PR = PR_DEF();
let tG = 0;
function mezclarProg(b, a) {
  if (!a || typeof a !== 'object') return b;
  const o = { ...b, ...a };
  ['stats', 'diario', 'arena', 'sinfin', 'poderes', 'misiones'].forEach((k) => { o[k] = { ...b[k], ...(a[k] && typeof a[k] === 'object' ? a[k] : {}) }; });
  ['hechos', 'llaves', 'tienda', 'potenc', 'vistosZ', 'vistosP', 'col', 'colRec', 'logros', 'tut', 'derrotas'].forEach((k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; });
  ['prog', 'hechas', 'mundo'].forEach((k) => { if (!o.misiones[k] || typeof o.misiones[k] !== 'object') o.misiones[k] = {}; });
  if (!Array.isArray(o.loadout)) o.loadout = [];
  ['monedas', 'gemas', 'ganadas'].forEach((k) => { o[k] = Math.max(0, +o[k] || 0); });
  return o;
}
export function cargarProgreso() { let o = null; try { o = JSON.parse(ls.g(K_PR) || 'null'); } catch (e) { o = null; } PR = mezclarProg(PR_DEF(), o); return PR; }
export function guardarProgreso(ya) { const f = () => { tG = 0; ls.s(K_PR, JSON.stringify(PR)); }; if (ya) { clearTimeout(tG); f(); return; } if (!tG) tG = setTimeout(f, 500); }
export function borrarTodo() { ls.d(K_PR); ls.d(K_PA); ls.d(K_AJ); PR = PR_DEF(); AJ = mezcla(AJ_DEF, {}); }
export function exportar() { return btoa(unescape(encodeURIComponent(JSON.stringify({ jardin2: 1, progreso: PR })))); }
export function importar(txt) {
  try { const o = JSON.parse(decodeURIComponent(escape(atob(String(txt).trim())))); if (!o || !o.jardin2 || !o.progreso) return false; PR = mezclarProg(PR_DEF(), o.progreso); guardarProgreso(true); return true; } catch (e) { return false; }
}

/* derivados */
export const nHechos = () => Object.keys(PR.hechos).length;
export const estrellasTotal = () => { let n = 0; for (const k in PR.hechos) n += PR.hechos[k].e || 0; return n; };
export const estrellasMundo = (m) => { let n = 0; for (let i = 1; i <= NIV_POR_MUNDO; i++) { const h = PR.hechos[`${m + 1}-${i}`]; if (h) n += h.e || 0; } return n; };
export const hechosMundo = (m) => { let n = 0; for (let i = 1; i <= NIV_POR_MUNDO; i++) if (PR.hechos[`${m + 1}-${i}`]) n++; return n; };
export const mundoAbierto = (m) => m === 0 || (estrellasTotal() >= MUNDOS[m].estrellas && !!PR.llaves[m - 1]);
export const nivelAbierto = (m, n) => mundoAbierto(m) && (n === 1 || !!PR.hechos[`${m + 1}-${n - 1}`] || !!PR.hechos[`${m + 1}-${n}`]);
export const slots = () => Math.min(SLOTS_MAX, SLOTS_BASE + (PR.tienda.ranuras || 0));
export const plantaLibre = (id) => desbloqueada(id, nHechos(), PR.tienda);
export const plantasLibres = () => IDS_P.filter(plantaLibre);
export const nivelPlanta = (id) => Math.min(5, Math.max(1, PR.potenc[id] || 1));
export const dar = (k, n) => { PR[k] = Math.max(0, (PR[k] || 0) + n); if (k === 'monedas' && n > 0) PR.ganadas += n; };

/* partida efimera (Continuar) */
export function guardarPartida(o) { return ls.s(K_PA, JSON.stringify(o)); }
export function leerPartida() { try { return JSON.parse(ls.g(K_PA) || 'null'); } catch (e) { return null; } }
export function borrarPartida() { ls.d(K_PA); }
export function perfilLocal() { try { const p = JSON.parse(ls.g('juego_perfil') || '{}'); return { nombre: p.nombre || 'Jugador', color: p.color || '#6fdc4a' }; } catch (e) { return { nombre: 'Jugador', color: '#6fdc4a' }; } }
void P;
