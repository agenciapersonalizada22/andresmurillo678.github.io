// Estadisticas locales y logros (ids estables para la plataforma). Se alimenta con el resultado de cada mano desde el punto de vista del jugador local.
import * as A from './almacen.js';

export const LOGROS = [
  { id: 'primera_mano', nombre: 'Siéntate a la mesa', descripcion: 'Juega tu primera mano.' },
  { id: 'diez_ganadas', nombre: 'Buena racha', descripcion: 'Gana 10 manos.' },
  { id: 'cien_manos', nombre: 'Veterano', descripcion: 'Juega 100 manos.' },
  { id: 'poker_full', nombre: 'Casa llena', descripcion: 'Gana una mano de póker con full o mejor.' },
  { id: 'poker_escalera_color', nombre: 'Escalera de color', descripcion: 'Gana una mano de póker con escalera de color.' },
  { id: 'poker_bote_grande', nombre: 'Bote gordo', descripcion: 'Gana un bote de 1000 fichas o más.' },
  { id: 'poker_torneo', nombre: 'Campeón de torneo', descripcion: 'Gana un torneo de póker.' },
  { id: 'bj_blackjack', nombre: 'Veintiuno natural', descripcion: 'Consigue un blackjack.' },
  { id: 'bj_doblar', nombre: 'Doble o nada', descripcion: 'Gana una mano doblada.' },
  { id: 'bj_racha_5', nombre: 'Cinco seguidas', descripcion: 'Gana 5 manos seguidas de veintiuno.' },
  { id: 'sm_real', nombre: 'Siete y medio real', descripcion: 'Consigue un siete y medio real.' },
  { id: 'sesion_positiva', nombre: 'Cerrar en positivo', descripcion: 'Termina una sesión con ganancias.' },
  { id: 'monedero_10k', nombre: 'Banca llena', descripcion: 'Llega a 10 000 fichas en tu monedero.' },
];
export const MODOS_PUNTAJE = [
  { id: 'monedero', nombre: 'Monedero máximo', mayorEsMejor: true, tope: 1000000000, unidad: 'fichas' },
  { id: 'bote', nombre: 'Mayor bote ganado', mayorEsMejor: true, tope: 1000000000, unidad: 'fichas' },
];
const avisos = [];
export function desbloquear(id) {
  const l = A.logros.obtener(); if (l[id]) return false;
  l[id] = Date.now(); A.logros.guardar(l); const d = LOGROS.find((x) => x.id === id); if (d) avisos.push(d); return true;
}
export function tomarAvisos() { return avisos.splice(0); }
export function stat(f) { const s = A.stats.obtener(); f(s); A.stats.guardar(s); return s; }
const CAT_FULL = ['Full', 'Poker', 'Escalera de color'];

// info: {juego, yo, delta (fichas netas de la mano), ganada, mano (nombre), bote, natural, doblada, variante}
export function registrarMano(info) {
  const s = stat((s) => {
    s.manos = (s.manos || 0) + 1; if (info.ganada) s.ganadas = (s.ganadas || 0) + 1;
    s.neto = (s.neto || 0) + info.delta; s.mayorBote = Math.max(s.mayorBote || 0, info.ganada ? info.bote || 0 : 0);
    s['racha_' + info.juego] = info.ganada ? (s['racha_' + info.juego] || 0) + 1 : 0;
    s['manos_' + info.juego] = (s['manos_' + info.juego] || 0) + 1;
  });
  desbloquear('primera_mano');
  if (s.ganadas >= 10) desbloquear('diez_ganadas');
  if (s.manos >= 100) desbloquear('cien_manos');
  if (info.juego === 'poker' && info.ganada) {
    if (CAT_FULL.includes(info.mano)) desbloquear('poker_full');
    if (info.mano === 'Escalera de color') desbloquear('poker_escalera_color');
    if (info.bote >= 1000) desbloquear('poker_bote_grande');
  }
  if (info.juego === 'veintiuno') {
    if (info.natural && info.ganada) { if (info.variante === 'sm') desbloquear('sm_real'); else desbloquear('bj_blackjack'); }
    if (info.doblada && info.ganada) desbloquear('bj_doblar');
    if (s['racha_veintiuno'] >= 5) desbloquear('bj_racha_5');
  }
  return s;
}
export function sesionTerminada(neto, torneoGanado) {
  stat((s) => { s.sesiones = (s.sesiones || 0) + 1; });
  if (neto > 0) desbloquear('sesion_positiva');
  if (torneoGanado) desbloquear('poker_torneo');
}
export function revisarMonedero(saldo) {
  stat((s) => { s.maxMonedero = Math.max(s.maxMonedero || 0, saldo); });
  if (saldo >= 10000) desbloquear('monedero_10k');
}
