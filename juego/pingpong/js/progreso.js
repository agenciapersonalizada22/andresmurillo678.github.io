// Logros, estadisticas y recompensas (puro). Los ids de logro cumplen [a-z0-9_]{1,40}.
import { recompensa } from './economia.js';
export const LOGROS = [
  { id: 'primer_punto', nombre: 'Primer punto', desc: 'Gana tu primer punto.' },
  { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana un partido.' },
  { id: 'diez_victorias', nombre: 'Jugador de club', desc: 'Gana 10 partidos.' },
  { id: 'cincuenta_victorias', nombre: 'Veterano', desc: 'Gana 50 partidos.' },
  { id: 'rally_10', nombre: 'Intercambio', desc: 'Llega a un rally de 10 golpes.' },
  { id: 'rally_25', nombre: 'Maratón', desc: 'Llega a un rally de 25 golpes.' },
  { id: 'rally_50', nombre: 'Sin fin', desc: 'Llega a un rally de 50 golpes.' },
  { id: 'victoria_dificil', nombre: 'Rival duro', desc: 'Gana en dificultad Difícil.' },
  { id: 'victoria_experto', nombre: 'Maestro', desc: 'Gana en dificultad Experto.' },
  { id: 'torneo_campeon', nombre: 'Campeón', desc: 'Gana un torneo.' },
  { id: 'torneos_5', nombre: 'Leyenda del torneo', desc: 'Gana 5 torneos.' },
  { id: 'entrenador', nombre: 'Constancia', desc: 'Devuelve 100 pelotas en el entrenamiento.' },
  { id: 'racha_5', nombre: 'En racha', desc: 'Encadena 5 victorias seguidas.' },
  { id: 'ace', nombre: 'Ace', desc: 'Gana un punto directo con tu saque.' },
  { id: 'aces_25', nombre: 'Saque letal', desc: 'Consigue 25 aces.' },
  { id: 'paliza', nombre: 'Paliza', desc: 'Gana un juego 11-0.' },
  { id: 'remontada', nombre: 'Remontada', desc: 'Gana un partido tras perder el primer juego.' },
  { id: 'dobles_ganado', nombre: 'Buen compañero', desc: 'Gana un partido de dobles.' },
  { id: 'online_victoria', nombre: 'Campeón online', desc: 'Gana una partida online.' },
  { id: 'comprador', nombre: 'Primera compra', desc: 'Desbloquea un objeto en la tienda.' },
  { id: 'coleccionista', nombre: 'Coleccionista', desc: 'Desbloquea 5 objetos.' },
  { id: 'ahorrador', nombre: 'Ahorrador', desc: 'Gana 1.000 monedas en total.' }
];
export const PUNTAJES = [
  { id: 'victorias', nombre: 'Victorias', unidad: 'vict.' }, { id: 'rally', nombre: 'Rally máximo', unidad: 'golpes' },
  { id: 'torneos', nombre: 'Torneos ganados', unidad: 'torneos' }, { id: 'online', nombre: 'Victorias online', unidad: 'vict.' }
];
export const TOPES = { victorias: 100000, rally: 1000, torneos: 10000, online: 100000 };

/* Aplica el resultado de una partida/sesion al progreso. Devuelve {monedas, logros:[ids nuevos]}. Modifica p. */
export function registrar(p, r) {
  const s = p.stats; let monedas = 0;
  if (r.modo === 'libre' || r.modo === 'torneo' || r.modo === 'online') {
    s.partidos++; s.puntosGanados += r.puntosGanados || 0; s.puntosPerdidos += r.puntosPerdidos || 0; s.aces += r.aces || 0;
    if (r.modo === 'online') s.onlinePartidos++;
    if (r.gano) {
      s.victorias++; s.racha++; s.mejorRacha = Math.max(s.mejorRacha, s.racha);
      if (r.modo === 'online') s.onlineVictorias++;
      if (r.dobles) s.dobles++;
      if (r.dif === 'normal' || r.dif === 'dificil' || r.dif === 'experto' || r.modo === 'online') s.victoriasDif++;
    } else { s.derrotas++; s.racha = 0; }
    s.rallyMax = Math.max(s.rallyMax, r.rally || 0);
  } else if (r.modo === 'reto') s.retoMax = Math.max(s.retoMax, r.rally || 0);
  else if (r.modo === 'entreno') { s.aciertosEntreno += r.aciertos || 0; s.rachaEntreno = Math.max(s.rachaEntreno, r.mejorRacha || 0); }
  s.golpes += r.golpes || 0;
  if (r.torneoCampeon) s.torneos++;
  monedas = recompensa(r) + (r.torneoCampeon ? r.premioTorneo || 0 : 0);
  p.monedas += monedas; p.totalMonedas += monedas;
  return { monedas, logros: nuevosLogros(p, r) };
}
export function nuevosLogros(p, r = {}) {
  const s = p.stats, ok = {
    primer_punto: s.puntosGanados >= 1, primera_victoria: s.victorias >= 1, diez_victorias: s.victorias >= 10, cincuenta_victorias: s.victorias >= 50,
    rally_10: Math.max(s.rallyMax, s.retoMax) >= 10, rally_25: Math.max(s.rallyMax, s.retoMax) >= 25, rally_50: Math.max(s.rallyMax, s.retoMax) >= 50,
    victoria_dificil: !!(r.gano && r.dif === 'dificil'), victoria_experto: !!(r.gano && r.dif === 'experto'),
    torneo_campeon: s.torneos >= 1, torneos_5: s.torneos >= 5, entrenador: s.aciertosEntreno >= 100, racha_5: s.mejorRacha >= 5,
    ace: s.aces >= 1, aces_25: s.aces >= 25, paliza: !!r.paliza, remontada: !!(r.gano && r.remontada), dobles_ganado: s.dobles >= 1,
    online_victoria: s.onlineVictorias >= 1, comprador: s.compras >= 1, coleccionista: s.compras >= 5, ahorrador: p.totalMonedas >= 1000
  };
  const nuevos = LOGROS.filter((l) => ok[l.id] && !p.logros[l.id]).map((l) => l.id);
  nuevos.forEach((id) => { p.logros[id] = Date.now(); });
  return nuevos;
}
/* Valores para el ranking (con tope; las victorias solo cuentan dificultad Normal o mas, o online). */
export function valoresRanking(p) {
  const s = p.stats, t = TOPES;
  return { victorias: Math.min(s.victoriasDif | 0, t.victorias), rally: Math.min(Math.max(s.rallyMax, s.retoMax) | 0, t.rally), torneos: Math.min(s.torneos | 0, t.torneos), online: Math.min(s.onlineVictorias | 0, t.online) };
}
