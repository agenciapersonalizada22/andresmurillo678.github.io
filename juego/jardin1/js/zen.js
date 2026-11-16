// Jardin Zen: logica pura de cultivo (tiempo real), riego, abono, monedas y venta.
export const T_CREC = 300, T_AGUA = 150, COSTE_SEMILLA = 20, MON_CADA = 45, MON_MAX = 8;
export const PARCELAS_BASE = 4;
export const parcelasTotal = (tienda) => PARCELAS_BASE + (tienda && tienda.zenSlot ? Math.min(4, tienda.zenSlot | 0) : 0);
export const nueva = (id, ahora) => ({ id, ult: ahora, crec: 0, agua: 0.6, abonoHasta: 0, mon: 0, edad: 0 });
export function avanzar(p, ahora) {
  if (!p) return p; let dt = Math.max(0, Math.min((ahora - p.ult) / 1000, 6 * 3600)); p.ult = ahora; if (dt <= 0) return p;
  p.edad += dt;
  const conAbono = p.abonoHasta > ahora - dt * 1000 ? 2 : 1;
  const tw = Math.min(dt, Math.max(0, p.agua) * T_AGUA);
  if (p.crec < 1) p.crec = Math.min(1, p.crec + tw / T_CREC * conAbono);
  p.agua = Math.max(0, p.agua - dt / T_AGUA);
  if (p.crec >= 1) p.mon = Math.min(MON_MAX, p.mon + tw / MON_CADA);
  return p;
}
export const etapa = (p) => (p.crec >= 1 ? 3 : p.crec >= 0.6 ? 2 : p.crec >= 0.2 ? 1 : 0);
export function regar(p) { p.agua = 1; return p; }
export function abonar(p, ahora) { p.abonoHasta = ahora + 120000; return p; }
export const precioVenta = (p) => 30 + Math.round(70 * p.crec) + Math.floor(p.mon) * 5;
export function cosechar(p) { const n = Math.floor(p.mon); p.mon -= n; return n * 5; }
export const necesitaAgua = (p) => p && p.agua < 0.25;
