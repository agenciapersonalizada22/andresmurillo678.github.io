// Persistencia: ajustes por dispositivo (hockey_ajustes_dispositivo) y progreso sincronizable (hockey_progreso).
const KA = 'hockey_ajustes_dispositivo', KP = 'hockey_progreso', KS = 'hockey_sala', KJ = 'hockey_partida';
export const CLAVES_NUBE = [KP];
const D = window.HkDatos;

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const mezcla = (base, o) => {
  if (!o || typeof o !== 'object') return base;
  for (const k in base) {
    if (k in o && typeof base[k] === typeof o[k]) base[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? mezcla(base[k], o[k]) : o[k];
  }
  return base;
};

export const TECLAS_DEF = { arriba: 'KeyW', abajo: 'KeyS', izq: 'KeyA', der: 'KeyD', arriba2: 'ArrowUp', abajo2: 'ArrowDown', izq2: 'ArrowLeft', der2: 'ArrowRight', pausa: 'KeyP' };
const movil = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);

export function ajustesDef() {
  return {
    graf: Object.assign({ preset: movil ? 'baja' : 'alta', fps: 60, mostrarFps: false, auto: true }, D.PRESETS[movil ? 'baja' : 'alta']),
    audio: { maestro: 0.8, musica: 0.45, efectos: 0.9, mute: false, pausaOculta: true },
    ctrl: { sens: 1, zona: 0.12, vibracion: true, vibInt: 0.7, offset: movil ? 46 : 0, teclas: Object.assign({}, TECLAS_DEF) },
    acc: { texto: false, dalto: false, reducir: false, ayuda: true }
  };
}
export const A = mezcla(ajustesDef(), leer(KA));
export const guardarAjustes = () => escribir(KA, A);
export function aplicarPreset(id) {
  const p = D.PRESETS[id]; if (!p) return;
  Object.assign(A.graf, p, { preset: id }); guardarAjustes();
}

export function progresoDef() {
  return {
    v: 1, monedas: 0, mesas: ['clasica'], discos: ['clasico'], sel: { mesa: 'clasica', disco: 'clasico', meta: 7, dif: 1 },
    stats: { partidas: 0, victorias: 0, derrotas: 0, goles: 0, contra: 0, mejorRacha: 0, onlineVic: 0, onlinePart: 0, poderes: 0, torneos: 0, segundos: 0 },
    vic: [0, 0, 0, 0], reto: { max: 0 }, torneo: null, logros: {}, tuto: false
  };
}
export const P = mezcla(progresoDef(), leer(KP));
if (P.torneo === null) { const o = leer(KP); if (o && o.torneo) P.torneo = o.torneo; }
export const guardarProgreso = () => escribir(KP, P);
export function recargarProgreso() { const n = mezcla(progresoDef(), leer(KP)); const o = leer(KP); n.torneo = o && o.torneo ? o.torneo : null; Object.assign(P, n); }

export const salaGuardada = { leer: () => leer(KS), guardar: (v) => escribir(KS, v), borrar: () => { try { localStorage.removeItem(KS); } catch (e) { /* sin almacenamiento */ } } };
export const partidaGuardada = { leer: () => leer(KJ), guardar: (v) => escribir(KJ, v), borrar: () => { try { localStorage.removeItem(KJ); } catch (e) { /* sin almacenamiento */ } } };

export function exportar() { return btoa(unescape(encodeURIComponent(JSON.stringify({ juego: 'hockey', progreso: P, ajustes: A })))); }
export function importar(txt) {
  let o; try { o = JSON.parse(decodeURIComponent(escape(atob(String(txt).trim())))); } catch (e) { return false; }
  if (!o || o.juego !== 'hockey' || !o.progreso) return false;
  escribir(KP, o.progreso); recargarProgreso();
  if (o.ajustes) { Object.assign(A, mezcla(ajustesDef(), o.ajustes)); guardarAjustes(); }
  return true;
}
export function borrarTodo() { [KA, KP, KS, KJ].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* ok */ } }); }
export const esMovil = movil;
