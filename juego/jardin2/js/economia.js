// Economia virtual (monedas y gemas ganadas jugando; sin dinero real). Logica pura sobre el objeto de progreso.
import { P, PACKS, POTENCIAR_MAX, costePotenciar, SLOTS_BASE, SLOTS_MAX, costeRanura } from './datos.js';
export function comprarPlanta(PR, id) {
  const d = P[id]; if (!d || !d.g) return 'No está a la venta'; if (PR.tienda['p_' + id]) return 'Ya la tienes'; if (PR.gemas < d.g) return 'Te faltan gemas';
  PR.gemas -= d.g; PR.tienda['p_' + id] = 1; return null;
}
export function potenciar(PR, id, libre) {
  const lv = PR.potenc[id] || 1; if (lv >= POTENCIAR_MAX) return 'Nivel máximo'; if (!libre(id)) return 'Aún no tienes esa planta';
  const c = costePotenciar(id, lv); if (PR.monedas < c) return 'Te faltan monedas'; PR.monedas -= c; PR.potenc[id] = lv + 1; return null;
}
export function comprarRanura(PR) {
  const n = SLOTS_BASE + (PR.tienda.ranuras || 0); if (n >= SLOTS_MAX) return 'Ya tienes todas las ranuras'; const c = costeRanura(n + 1); if (PR.gemas < c) return 'Te faltan gemas';
  PR.gemas -= c; PR.tienda.ranuras = (PR.tienda.ranuras || 0) + 1; return null;
}
export function comprarPack(PR, id) {
  const p = PACKS.find((q) => q.id === id); if (!p) return 'No existe'; const n = PR.tienda[id] || 0;
  if (p.max && n >= p.max) return 'Ya lo tienes al máximo';
  if (p.g && PR.gemas < p.g) return 'Te faltan gemas'; if (p.m && PR.monedas < p.m) return 'Te faltan monedas';
  if (p.g) PR.gemas -= p.g; if (p.m) PR.monedas -= p.m;
  if (id === 'poder10') PR.poderes.libres = (PR.poderes.libres || 0) + 10; else PR.tienda[id] = n + 1; return null;
}
export const costeRanuraSiguiente = (PR) => { const n = SLOTS_BASE + (PR.tienda.ranuras || 0); return n >= SLOTS_MAX ? 0 : costeRanura(n + 1); };
export function recompensaNivel(niv, victoria, estrellas, primera, dif) {
  const m = niv.mundo >= 0 ? niv.mundo : 0, k = { facil: 0.8, normal: 1, dificil: 1.4 }[dif] || 1;
  if (!victoria) return { mon: 0, gem: 0 };
  const mon = Math.round((25 + m * 6 + (niv.n || 1) * 3 + estrellas * 10) * k * (primera ? 1.5 : 1)), gem = (niv.tipo === 'jefe' ? 8 : 0) + (primera && estrellas === 3 ? 1 : 0);
  return { mon, gem };
}
export const estrellasNivel = (st, pulsosUsados, tiempo) => 1 + (pulsosUsados === 0 ? 1 : 0) + (st.perdidas <= 3 ? 1 : 0);
