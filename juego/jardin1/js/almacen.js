// Almacenamiento: ajustes por dispositivo, progreso (sincronizable) y partida efimera. Todo en un solo modulo.
export const K_AJ = 'jardin1_ajustes_dispositivo', K_PR = 'jardin1_progreso', K_PA = 'jardin1_partida';
const ls = {
  g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  s(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  d(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } },
};

export const AJ_DEF = {
  graficos: { calidad: 'media', sombras: true, particulas: true, fps: 60, mostrarFps: false, auto: true, res: 1 },
  audio: { maestro: 0.8, musica: 0.5, efectos: 0.8, mudo: false },
  controles: { zona: 0.2, vib: true, vibInt: 0.6, zurdo: false, tam: 1, op: 1, sensCursor: 1, teclas: { arriba: 'ArrowUp', abajo: 'ArrowDown', izq: 'ArrowLeft', der: 'ArrowRight', plantar: 'Enter', pala: 'x', sol: 's', sig: 'e', ant: 'q', pausa: 'Escape' } },
  accesibilidad: { texto: 1, dalt: false, reducir: false, autoSol: false },
  juego: { dif: 'normal', vel: 1, tutorial: true },
};
const mezcla = (b, a) => { const o = Array.isArray(b) ? [] : {}; for (const k in b) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? mezcla(b[k], a && typeof a[k] === 'object' ? a[k] : {}) : (a && a[k] !== undefined && typeof a[k] === typeof b[k] ? a[k] : b[k]); return o; };
export let AJ = mezcla(AJ_DEF, {});
export function cargarAjustes() { try { AJ = mezcla(AJ_DEF, JSON.parse(ls.g(K_AJ) || '{}')); } catch (e) { AJ = mezcla(AJ_DEF, {}); } return AJ; }
export function guardarAjustes() { ls.s(K_AJ, JSON.stringify(AJ)); }
export function restablecerAjustes() { AJ = mezcla(AJ_DEF, {}); guardarAjustes(); return AJ; }

export const PR_DEF = () => ({
  v: 1, hechos: {}, monedas: 0, ganadas: 0, tienda: {}, vistosZ: {}, vistosP: {}, surv: {}, puzzle: {}, jarros: {}, mini: {}, misiones: {}, logros: {}, abonos: 0, versus: [0, 0], tut: {},
  stats: { plantadas: 0, matados: 0, soles: 0, victorias: 0, derrotas: 0, sinCort: 0, minis: 0, jarrones: 0, zenVentas: 0, versus: 0, mejorSurv: 0, tiempo: 0 },
  zen: { parcelas: [], abono: 0, tiempo: 0 },
});
export let PR = PR_DEF();
let tG = 0;
export function cargarProgreso() {
  let o = null; try { o = JSON.parse(ls.g(K_PR) || 'null'); } catch (e) { o = null; }
  PR = mezclarProg(PR_DEF(), o); return PR;
}
function mezclarProg(b, a) {
  if (!a || typeof a !== 'object') return b;
  const o = { ...b, ...a };
  o.stats = { ...b.stats, ...(a.stats || {}) }; o.zen = { ...b.zen, ...(a.zen || {}) };
  ['hechos', 'tienda', 'vistosZ', 'vistosP', 'surv', 'puzzle', 'jarros', 'mini', 'misiones', 'logros', 'tut'].forEach((k) => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; });
  if (!Array.isArray(o.versus)) o.versus = [0, 0]; if (!Array.isArray(o.zen.parcelas)) o.zen.parcelas = [];
  ['monedas', 'ganadas', 'abonos'].forEach((k) => { o[k] = Math.max(0, +o[k] || 0); });
  return o;
}
export function guardarProgreso(ya) {
  const f = () => { tG = 0; ls.s(K_PR, JSON.stringify(PR)); };
  if (ya) { clearTimeout(tG); f(); return; } if (!tG) tG = setTimeout(f, 600);
}
export function recargarProgreso() { return cargarProgreso(); }
export function borrarTodo() { ls.d(K_PR); ls.d(K_PA); ls.d(K_AJ); PR = PR_DEF(); AJ = mezcla(AJ_DEF, {}); }
export function exportar() { const o = { jardin1: 1, progreso: PR }; return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
export function importar(txt) {
  try { const o = JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); if (!o || !o.jardin1 || !o.progreso) return false; PR = mezclarProg(PR_DEF(), o.progreso); guardarProgreso(true); return true; } catch (e) { return false; }
}

export const completados = () => { const s = new Set(); for (const k in PR.hechos) { const m = /^(\d)-(\d+)$/.exec(k); if (m) s.add((+m[1] - 1) * 10 + +m[2]); } return s; };
export const estrellasTotal = () => { let n = 0; for (const k in PR.hechos) n += PR.hechos[k].e || 0; for (const k in PR.puzzle) n += PR.puzzle[k] ? 1 : 0; for (const k in PR.jarros) n += PR.jarros[k] ? 1 : 0; return n; };
export const slots = () => 6 + (PR.tienda.ranura7 ? 1 : 0) + (PR.tienda.ranura8 ? 1 : 0) + (PR.tienda.ranura9 ? 1 : 0);

/* partida efimera para Continuar */
export function guardarPartida(o) { return ls.s(K_PA, JSON.stringify(o)); }
export function leerPartida() { try { return JSON.parse(ls.g(K_PA) || 'null'); } catch (e) { return null; } }
export function borrarPartida() { ls.d(K_PA); }
export function perfilLocal() { try { const p = JSON.parse(ls.g('juego_perfil') || '{}'); return { nombre: p.nombre || 'Jugador', color: p.color || '#4ec3e8' }; } catch (e) { return { nombre: 'Jugador', color: '#4ec3e8' }; } }
