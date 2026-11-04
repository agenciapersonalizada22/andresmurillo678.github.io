// Ranuras de guardado y ajustes en localStorage (todo con try/catch).
const K = 'metropolis.v1.';
export const RANURAS = 3;

function leer(k) { try { return localStorage.getItem(K + k); } catch (e) { return null; } }
function escribir(k, v) { try { localStorage.setItem(K + k, v); return true; } catch (e) { return false; } }

export const TECLAS_DEF = {
  construir: 'b', demoler: 'x', objetivos: 'o', mejoras: 'm', ciudad: 'c', capas: 'l', girarIzq: 'q', girarDer: 'e',
  arriba: 'w', abajo: 's', izq: 'a', der: 'd', foto: 'p', pausa: ' ',
};
export const AJUSTES_DEF = {
  calidad: '', sfx: true, musica: true, vibracion: true, ultima: 0,
  // gráficos (null = lo decide el preset)
  sombras: null, antialias: null, resolucion: null, detalle: null, limiteFps: 0, verFps: false, autoCalidad: true,
  // audio
  volMaestro: 0.8, volMusica: 0.7, volSfx: 0.8, volAmbiente: 0.6, silencio: false,
  // controles
  sensibilidad: 1, invertirY: false, zonaMuerta: 0.18, vibracionInt: 1, teclas: {}, tamTactil: 1, opacTactil: 1, zurdo: false,
  // accesibilidad
  textoGrande: false, daltonismo: 'ninguno', reducirMov: false,
  // ayuda
  ayudaVista: false,
};

export function ajustes() {
  const d = Object.assign({}, AJUSTES_DEF, { teclas: {} });
  try { const o = JSON.parse(leer('ajustes') || '{}'); Object.assign(d, o); d.teclas = Object.assign({}, o.teclas); } catch (e) { /* por defecto */ }
  if (d.calidad === 'ultra' && false) d.calidad = 'alta';
  return d;
}
export function guardarAjustes(a) { escribir('ajustes', JSON.stringify(a)); }
export const tecla = (a, accion) => (a.teclas && a.teclas[accion]) || TECLAS_DEF[accion];

export function meta(n) {
  try { return JSON.parse(leer('meta' + n) || 'null'); } catch (e) { return null; }
}
export function leerRanura(n) { return leer('ranura' + n); }
export function guardarRanura(n, texto, m) {
  const ok = escribir('ranura' + n, texto);
  if (ok) escribir('meta' + n, JSON.stringify(m));
  return ok;
}
export function borrarRanura(n) { try { localStorage.removeItem(K + 'ranura' + n); localStorage.removeItem(K + 'meta' + n); } catch (e) { /* nada */ } }
export function borrarTodo() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(K)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ }
}
// Claves de localStorage que representan el progreso (para la nube): ajustes, ranuras y la ciudad compartida.
export function clavesNube() {
  const r = [K + 'ajustes'];
  for (const n of [1, 2, 3, 'm']) r.push(K + 'ranura' + n, K + 'meta' + n);
  return r;
}
export function perfil() {
  try { const p = JSON.parse(localStorage.getItem('juego_perfil') || 'null'); if (p && p.nombre) return p; } catch (e) { /* nada */ }
  return { nombre: 'Jugador', color: '#3df5ff' };
}
