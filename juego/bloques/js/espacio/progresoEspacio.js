// =============================================================
//  🌌  PROGRESO DEL ESPACIO (global, para todos los mundos)
//  Se guarda en localStorage con la clave 'bloques_espacio_v1' y
//  viaja a la nube con la cuenta (nube.js). Recuerda a dónde has
//  llegado y cuántas veces. Si el texto está dañado se ignora.
// =============================================================
export const CLAVE_ESPACIO = 'bloques_espacio_v1';
const base = () => ({ v: 1, dims: {}, lanzamientos: 0, orbitas: 0, eclipses: 0, portales: 0 });

export function leerProgreso() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_ESPACIO) || 'null');
    if (!o || typeof o !== 'object') return base();
    const r = base();
    if (o.dims && typeof o.dims === 'object') for (const k of Object.keys(o.dims)) if (/^[a-z0-9_]{1,24}$/.test(k) && Number.isFinite(o.dims[k])) r.dims[k] = o.dims[k];
    for (const k of ['lanzamientos', 'orbitas', 'eclipses', 'portales']) if (Number.isFinite(o[k]) && o[k] >= 0) r[k] = Math.floor(o[k]);
    return r;
  } catch (e) { return base(); }
}

export function guardarProgreso(p) {
  try { localStorage.setItem(CLAVE_ESPACIO, JSON.stringify(p)); } catch (e) { /* sin espacio: no pasa nada */ }
}
