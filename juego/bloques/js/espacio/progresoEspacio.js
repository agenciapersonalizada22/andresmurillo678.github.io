// =============================================================
//  🌌  PROGRESO DEL ESPACIO (global, para todos los mundos)
//  Se guarda en localStorage con la clave 'bloques_espacio_v1' y
//  viaja a la nube con la cuenta (nube.js). Recuerda a dónde has
//  llegado y cuántas veces. Si el texto está dañado se ignora.
// =============================================================
export const CLAVE_ESPACIO = 'bloques_espacio_v1';
// v2 añade (sin romper v1): minerales catalogados, viajes en nave, hitos del sistema solar y planetas vistos
const base = () => ({ v: 2, dims: {}, lanzamientos: 0, orbitas: 0, eclipses: 0, portales: 0, minerales: {}, viajes: 0, hitos: {}, aterrizajes: {} });
const clave = (k) => typeof k === 'string' && /^[a-z0-9_]{1,32}$/.test(k);

export function leerProgreso() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_ESPACIO) || 'null');
    if (!o || typeof o !== 'object') return base();
    const r = base();
    if (o.dims && typeof o.dims === 'object') for (const k of Object.keys(o.dims)) if (/^[a-z0-9_]{1,24}$/.test(k) && Number.isFinite(o.dims[k])) r.dims[k] = o.dims[k];
    for (const campo of ['minerales', 'hitos', 'aterrizajes']) if (o[campo] && typeof o[campo] === 'object') for (const k of Object.keys(o[campo]).slice(0, 80)) if (clave(k) && Number.isFinite(o[campo][k])) r[campo][k] = o[campo][k];
    if (Number.isFinite(o.viajes) && o.viajes >= 0) r.viajes = Math.floor(o.viajes);
    for (const k of ['lanzamientos', 'orbitas', 'eclipses', 'portales']) if (Number.isFinite(o[k]) && o[k] >= 0) r[k] = Math.floor(o[k]);
    return r;
  } catch (e) { return base(); }
}

export function guardarProgreso(p) {
  try { localStorage.setItem(CLAVE_ESPACIO, JSON.stringify(p)); } catch (e) { /* sin espacio: no pasa nada */ }
}
