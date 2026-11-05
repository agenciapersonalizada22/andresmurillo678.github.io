// Estadisticas locales y logros (ids estables para la plataforma). Se alimenta con el resultado de cada mano desde el punto de vista del jugador local.
import * as A from './almacen.js';
import * as Cta from './cuenta.js';

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
  // Dompe
  { id: 'dompe_primera', nombre: 'Primer dompe', descripcion: 'Gana tu primera mano de Dompe.' },
  { id: 'dompe_tres_pares', nombre: 'Tres pares', descripcion: 'Gana al instante con tres pares.' },
  { id: 'dompe_escalera', nombre: 'Escalera de seis', descripcion: 'Gana con una escalera de 6 cartas.' },
  { id: 'dompe_dos_tercias', nombre: 'Dos tercias', descripcion: 'Gana con dos tercias.' },
  { id: 'dompe_cuarteto_par', nombre: 'Cuarteto y par', descripcion: 'Gana con un cuarteto más un par.' },
  { id: 'dompe_escalera_color', nombre: 'Escalera de color', descripcion: 'Gana con seis cartas seguidas del mismo palo.' },
  { id: 'dompe_ultima_vuelta', nombre: 'Remontada', descripcion: 'Gana en la última vuelta que abrió el dompe de otro jugador.' },
  { id: 'dompe_dompeo_gana', nombre: 'Dompe certero', descripcion: 'Di dompe y gana la mano con la mejor mano.' },
  { id: 'dompe_comodin', nombre: 'Comodín salvador', descripcion: 'Gana con una mano que usa un comodín.' },
  { id: 'dompe_racha_3', nombre: 'Tres seguidas', descripcion: 'Gana 3 manos de Dompe seguidas.' },
  { id: 'dompe_diez', nombre: 'Maestro del dompe', descripcion: 'Gana 10 manos de Dompe.' },
  { id: 'dompe_bote', nombre: 'Bote de dompe', descripcion: 'Gana un bote de 200 fichas o más en Dompe.' },
  // Conquián
  { id: 'conq_primera', nombre: 'Primer conquián', descripcion: 'Gana tu primera ronda de Conquián.' },
  { id: 'conq_sin_descarte', nombre: 'Conquián limpio', descripcion: 'Gana bajando todas tus cartas, sin descartar la última.' },
  { id: 'conq_descarte', nombre: 'Cierre con descarte', descripcion: 'Gana descartando tu última carta.' },
  { id: 'conq_diez', nombre: 'Veterano del conquián', descripcion: 'Gana 10 rondas de Conquián.' },
  { id: 'conq_rapida', nombre: 'Ronda relámpago', descripcion: 'Gana una ronda en 8 turnos propios o menos.' },
  { id: 'conq_cuatro_combos', nombre: 'Mesa llena', descripcion: 'Gana habiendo bajado 4 o más combinaciones.' },
  { id: 'conq_comodin', nombre: 'Con comodín', descripcion: 'Gana una ronda en una mesa con comodines.' },
  { id: 'conq_por_los_pelos', nombre: 'Por los pelos', descripcion: 'Gana cuando un rival se quedó con una sola carta.' },
  { id: 'conq_puntos_50', nombre: 'Cincuenta puntos', descripcion: 'Suma 50 puntos de rondas en una partida de Conquián.' },
  { id: 'conq_campeon', nombre: 'Campeón de conquián', descripcion: 'Gana una partida a puntos (meta alcanzada).' },
  { id: 'conq_racha_3', nombre: 'Racha de conquián', descripcion: 'Gana 3 rondas de Conquián seguidas.' },
  { id: 'conq_cuatro_jugadores', nombre: 'Mesa de cuatro', descripcion: 'Gana una ronda con 4 jugadores en la mesa.' },
  // Ve a pescar
  { id: 'pesc_primera', nombre: 'Primera pesca', descripcion: 'Gana tu primera partida de Ve a pescar.' },
  { id: 'pesc_libro', nombre: 'Primer libro', descripcion: 'Completa un libro de cartas.' },
  { id: 'pesc_5_libros', nombre: 'Cinco libros', descripcion: 'Junta 5 o más libros en una partida.' },
  { id: 'pesc_8_libros', nombre: 'Biblioteca', descripcion: 'Junta 8 o más libros en una partida.' },
  { id: 'pesc_diez', nombre: 'Gran pescador', descripcion: 'Gana 10 partidas de Ve a pescar.' },
  { id: 'pesc_suerte', nombre: 'Pesca milagrosa', descripcion: 'Pesca justo la carta que pedías.' },
  { id: 'pesc_familiar', nombre: 'Juego en familia', descripcion: 'Gana una partida en versión familiar.' },
  { id: 'pesc_cuarenta', nombre: 'Baraja española', descripcion: 'Gana una partida con baraja española.' },
  { id: 'pesc_libros_3', nombre: 'Libros de tres', descripcion: 'Gana una partida con libros de 3 cartas.' },
  { id: 'pesc_seis', nombre: 'Seis a la mesa', descripcion: 'Gana una partida con 6 jugadores.' },
  { id: 'pesc_racha_3', nombre: 'Tres pescas seguidas', descripcion: 'Gana 3 partidas de Ve a pescar seguidas.' },
];
export const MODOS_PUNTAJE = [
  { id: 'monedero', nombre: 'Monedero máximo', mayorEsMejor: true, tope: 1000000000, unidad: 'fichas' },
  { id: 'bote', nombre: 'Mayor bote ganado', mayorEsMejor: true, tope: 1000000000, unidad: 'fichas' },
  { id: 'dompe_racha', nombre: 'Racha de victorias en Dompe', mayorEsMejor: true, tope: 1000, unidad: 'victorias' },
  { id: 'conq_turnos', nombre: 'Conquián más rápido', mayorEsMejor: false, tope: 200, unidad: 'turnos' },
  { id: 'pesc_libros', nombre: 'Más libros en una partida de Ve a pescar', mayorEsMejor: true, tope: 26, unidad: 'libros' },
];
// valores de cada modo de puntaje segun las estadisticas locales (la plataforma los lee de aqui)
export function puntajes() {
  const s = A.stats.obtener();
  return { monedero: s.maxMonedero || 0, bote: s.mayorBote || 0, dompe_racha: s.mejorRachaDompe || 0, conq_turnos: s.mejorConqTurnos || 0, pesc_libros: s.mejorLibros || 0 };
}
export const grupoDe = (id) => (/^poker_/.test(id) ? 'Póker' : /^(bj_|sm_)/.test(id) ? 'Veintiuno y siete y medio' : /^dompe_/.test(id) ? 'Dompe' : /^conq_/.test(id) ? 'Conquián' : /^pesc_/.test(id) ? 'Ve a pescar' : 'General');
const avisos = [];
export function desbloquear(id) {
  const l = A.logros.obtener(); if (l[id]) return false;
  l[id] = Date.now(); A.logros.guardar(l); Cta.logro(id); const d = LOGROS.find((x) => x.id === id); if (d) avisos.push(d); return true;
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
  if (['dompe', 'conquian', 'pescar'].includes(info.juego)) nuevosJuegos(info, s);
  // XP moderado por mano terminada (nunca por tiempo jugado) y puntajes de la plataforma
  Cta.xp(info.ganada ? (['dompe', 'conquian', 'pescar'].includes(info.juego) ? 10 : 6) : 2);
  Cta.programarPuntajes(puntajes);
  return s;
}
// logros y puntajes de Dompe, Conquian y Ve a pescar. info.meta viene de res.meta de cada juego.
function nuevosJuegos(info, s) {
  const m = info.meta || {}, g = info.ganada, racha = s['racha_' + info.juego] || 0;
  if (info.juego === 'dompe') {
    stat((x) => { if (racha > (x.mejorRachaDompe || 0)) x.mejorRachaDompe = racha; });
    if (!g) return;
    desbloquear('dompe_primera');
    const c = { tresPares: 'dompe_tres_pares', escalera: 'dompe_escalera', dosTercias: 'dompe_dos_tercias', cuartetoPar: 'dompe_cuarteto_par', escCol: 'dompe_escalera_color' }[m.combo]; if (c) desbloquear(c);
    if (m.tipo === 'instantanea' && m.dompeador >= 0 && m.dompeador !== info.yo) desbloquear('dompe_ultima_vuelta');
    if (m.dompeador === info.yo && m.tipo !== 'instantanea') desbloquear('dompe_dompeo_gana');
    if (m.comodin) desbloquear('dompe_comodin');
    if (racha >= 3) desbloquear('dompe_racha_3');
    const v = stat((x) => { x.victorias_dompe = (x.victorias_dompe || 0) + 1; }); if (v.victorias_dompe >= 10) desbloquear('dompe_diez');
    if ((info.bote || 0) >= 200) desbloquear('dompe_bote');
  } else if (info.juego === 'conquian') {
    if (m.puntos != null && m.pts && m.pts[info.yo] >= 50) desbloquear('conq_puntos_50');
    if (!g) return;
    desbloquear('conq_primera'); desbloquear(m.tipo === 'conquian' ? 'conq_sin_descarte' : 'conq_descarte');
    if (m.turnosPropios > 0 && m.turnosPropios <= 8) desbloquear('conq_rapida');
    if (m.melds >= 4) desbloquear('conq_cuatro_combos');
    if (m.comodines > 0) desbloquear('conq_comodin');
    if ((m.perdedores || []).some((n) => n === 1)) desbloquear('conq_por_los_pelos');
    if (m.campeon === info.yo) desbloquear('conq_campeon');
    if (racha >= 3) desbloquear('conq_racha_3');
    if (m.nJug >= 4) desbloquear('conq_cuatro_jugadores');
    stat((x) => { if (m.turnosPropios > 0 && (!x.mejorConqTurnos || m.turnosPropios < x.mejorConqTurnos)) x.mejorConqTurnos = m.turnosPropios; x.victorias_conquian = (x.victorias_conquian || 0) + 1; if (x.victorias_conquian >= 10) desbloquear('conq_diez'); });
  } else {
    const mios = (m.libros || [])[info.yo] || 0;
    if (mios >= 1) desbloquear('pesc_libro');
    if (mios >= 5) desbloquear('pesc_5_libros');
    if (mios >= 8) desbloquear('pesc_8_libros');
    if ((m.suertes || [])[info.yo] > 0) desbloquear('pesc_suerte');
    stat((x) => { if (mios > (x.mejorLibros || 0)) x.mejorLibros = mios; });
    if (!g) return;
    desbloquear('pesc_primera');
    if (m.familiar) desbloquear('pesc_familiar');
    if (m.baraja !== 'fr52') desbloquear('pesc_cuarenta');
    if (m.libro === 3) desbloquear('pesc_libros_3');
    if (m.nJug >= 6) desbloquear('pesc_seis');
    if (racha >= 3) desbloquear('pesc_racha_3');
    stat((x) => { x.victorias_pescar = (x.victorias_pescar || 0) + 1; if (x.victorias_pescar >= 10) desbloquear('pesc_diez'); });
  }
}
export function sesionTerminada(neto, torneoGanado) {
  stat((s) => { s.sesiones = (s.sesiones || 0) + 1; });
  if (neto > 0) desbloquear('sesion_positiva');
  if (torneoGanado) { desbloquear('poker_torneo'); Cta.xp(50); }
  Cta.programarPuntajes(puntajes);
}
export function revisarMonedero(saldo) {
  stat((s) => { s.maxMonedero = Math.max(s.maxMonedero || 0, saldo); });
  if (saldo >= 10000) desbloquear('monedero_10k');
  Cta.programarPuntajes(puntajes);
}
