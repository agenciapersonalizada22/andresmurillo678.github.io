// Ranuras de guardado y ajustes en localStorage (todo con try/catch).
const K = 'metropolis.v1.';
export const RANURAS = 3;

function leer(k) { try { return localStorage.getItem(K + k); } catch (e) { return null; } }
function escribir(k, v) { try { localStorage.setItem(K + k, v); return true; } catch (e) { return false; } }

export function ajustes() {
  const d = { calidad: '', sfx: true, musica: true, vibracion: true, ultima: 0 };
  try { Object.assign(d, JSON.parse(leer('ajustes') || '{}')); } catch (e) { /* por defecto */ }
  return d;
}
export function guardarAjustes(a) { escribir('ajustes', JSON.stringify(a)); }

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
