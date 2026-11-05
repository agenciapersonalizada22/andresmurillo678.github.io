// Pequeno envoltorio sobre Red para aceptar respuestas y unirse con un enlace.
export function aceptarRespuesta(codigo) {
  return window.Red.aceptarRespuesta(String(codigo).trim());
}
export function extraerCodigo(texto) {
  const m = /[?&]sala=([A-Za-z0-9_-]+)/.exec(texto || ''); if (m) return m[1];
  const t = String(texto || '').trim(); return /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : '';
}
export function extraerMesa(texto) { const m = /[?&]m=([A-Za-z0-9_-]+)/.exec(texto || ''); return m ? m[1] : ''; }
