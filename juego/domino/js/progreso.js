// Progreso local: estadisticas, fichas virtuales (solo juego, sin dinero real) y logros con ids estables para la plataforma.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const LOGROS = [
  { id: 'primera_mano', nombre: 'Primera mano', desc: 'Gana una mano.' },
  { id: 'primera_partida', nombre: 'Campeón', desc: 'Gana una partida completa.' },
  { id: 'capicua', nombre: '¡Capicúa!', desc: 'Cierra una mano con una ficha que encaja en los dos extremos.' },
  { id: 'capicua_5', nombre: 'Rey del capicúa', desc: 'Consigue 5 capicúas.' },
  { id: 'tranque_ganado', nombre: 'Maestro del tranque', desc: 'Gana una mano trancada con la menor suma.' },
  { id: 'cierra_doble', nombre: 'Doble final', desc: 'Gana una mano saliéndote con un doble.' },
  { id: 'pase_justo', nombre: 'Toc, toc', desc: 'Pasa sin remedio 5 veces en una misma partida.' },
  { id: 'victoria_parejas', nombre: 'Pareja de ases', desc: 'Gana una partida en parejas.' },
  { id: 'victoria_todos', nombre: 'Cada quien por su lado', desc: 'Gana una partida de todos contra todos.' },
  { id: 'victoria_duelo', nombre: 'Duelista', desc: 'Gana un duelo con pozo.' },
  { id: 'vs_experto', nombre: 'Domador de expertos', desc: 'Gana una partida con un bot Experto en la mesa.' },
  { id: 'doble_nueve', nombre: 'Nueve de nueve', desc: 'Gana una partida de doble nueve.' },
  { id: 'doble_doce', nombre: 'Doce docenas', desc: 'Gana una partida de doble doce.' },
  { id: 'zapatero', nombre: 'Zapatero', desc: 'Gana una partida sin que el rival anote ningún punto.' },
  { id: 'racha_3', nombre: 'En racha', desc: 'Gana 3 manos seguidas.' },
  { id: 'mesa_amigos', nombre: 'Mesa de amigos', desc: 'Gana una partida multijugador con humanos.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 25 partidas.' },
  { id: 'cien_manos', nombre: 'Cien manos', desc: 'Juega 100 manos.' },
  { id: 'mil_puntos', nombre: 'Coleccionista', desc: 'Acumula 1000 puntos en total.' },
  { id: 'apostador', nombre: 'Buen apostador', desc: 'Gana una partida apostando 50 fichas virtuales o más.' },
  { id: 'banca', nombre: 'Banca virtual', desc: 'Llega a 3000 fichas virtuales.' },
  { id: 'tutorial', nombre: 'Aprendiz', desc: 'Completa el tutorial.' },
  { id: 'sin_robar', nombre: 'Mano limpia', desc: 'Gana un duelo sin robar del pozo.' }
];
// Modos de puntaje para la plataforma (las fichas virtuales NO entran al ranking).
export const PUNTAJES = [
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 100000, unidad: 'victorias' },
  { id: 'puntos', nombre: 'Puntos anotados', mayorEsMejor: true, tope: 1000000, unidad: 'pts' },
  { id: 'capicuas', nombre: 'Capicúas', mayorEsMejor: true, tope: 100000, unidad: 'capicúas' }
];
export const FICHAS_INICIO = 1000;

const BASE = {
  partidas: 0, victorias: 0, manos: 0, manosGanadas: 0, racha: 0, mejorRacha: 0, puntos: 0, mejorPartida: 0,
  capicuas: 0, tranques: 0, pases: 0, robos: 0, jugadas: 0, mpVictorias: 0, fichas: FICHAS_INICIO, mejorFichas: FICHAS_INICIO, ganadoApuestas: 0,
  v6: 0, v9: 0, v12: 0, logros: {}
};
export const Progreso = { datos: { ...BASE, logros: {} }, alLogro: null };
let mano = { pases: 0, robos: 0 }, partida = { pases: 0, robos: 0 };
let guardarId = 0;

Progreso.cargar = () => { const g = leer(CLAVES.progreso, {}); Progreso.datos = mezclar(BASE, g); Progreso.datos.logros = { ...(g.logros || {}) }; return Progreso.datos; };
Progreso.guardar = () => { clearTimeout(guardarId); guardarId = 0; escribir(CLAVES.progreso, Progreso.datos); };
const diferir = () => { if (!guardarId) guardarId = setTimeout(Progreso.guardar, 600); };
Progreso.borrar = () => { Progreso.datos = { ...BASE, logros: {} }; Progreso.guardar(); };
export function dar(id) {
  const d = Progreso.datos;
  if (d.logros[id]) return;
  d.logros[id] = Date.now();
  const l = LOGROS.find((x) => x.id === id);
  if (l && Progreso.alLogro) Progreso.alLogro(l);
}
Progreso.dar = dar;

/* Fichas virtuales: apuesta por partida (cada humano la paga al empezar). Si te quedas sin fichas se te prestan 200. */
Progreso.pagarApuesta = (n) => {
  const d = Progreso.datos;
  if (!n) return true;
  if (d.fichas < n) return false;
  d.fichas -= n; Progreso.guardar(); return true;
};
Progreso.recargaSiVacio = () => { const d = Progreso.datos; if (d.fichas < 10) { d.fichas = 200; Progreso.guardar(); return true; } return false; };
Progreso.cobrarApuesta = (premio) => {
  const d = Progreso.datos; d.fichas += premio; d.ganadoApuestas += premio;
  if (d.fichas > d.mejorFichas) d.mejorFichas = d.fichas;
  if (d.fichas >= 3000) dar('banca');
  Progreso.guardar();
};

// ctx: { yo, unidad (mi unidad), v (vista actual), tipos (['bot0','humano'...]), multi, cfg, apostado }
Progreso.evento = (ev, ctx) => {
  const d = Progreso.datos, yo = ctx.yo;
  switch (ev.t) {
    case 'reparto': mano = { pases: 0, robos: 0 }; if (ev.ronda === 1) partida = { pases: 0, robos: 0 }; break;
    case 'jugar': if (ev.j === yo) d.jugadas++; break;
    case 'pase': if (ev.j === yo) { d.pases++; mano.pases++; partida.pases++; if (partida.pases >= 5) dar('pase_justo'); } break;
    case 'robo': if (ev.j === yo) { d.robos++; mano.robos++; partida.robos++; } break;
    case 'fin': finMano(ev, ctx); break;
    default: break;
  }
  diferir();
};

function finMano(ev, ctx) {
  const d = Progreso.datos, yo = ctx.yo, u = ctx.unidad, cfg = ctx.cfg || {};
  d.manos++;
  if (d.manos >= 100) dar('cien_manos');
  const gano = ev.unidad === u;
  if (gano) {
    d.manosGanadas++; d.racha++; d.puntos += ev.pts;
    if (d.racha > d.mejorRacha) d.mejorRacha = d.racha;
    dar('primera_mano');
    if (d.racha >= 3) dar('racha_3');
    if (d.puntos >= 1000) dar('mil_puntos');
    if (ev.tipo === 'tranque') { d.tranques++; dar('tranque_ganado'); }
    if (ev.ganador === yo && ev.tipo === 'domino' && ev.ultima != null && ctx.esDoble && ctx.esDoble(ev.ultima)) dar('cierra_doble');
    if (ev.ganador === yo && ev.capicua) { d.capicuas++; dar('capicua'); if (d.capicuas >= 5) dar('capicua_5'); }
  } else d.racha = 0;
  if (ev.partida) {
    d.partidas++;
    if (d.partidas >= 25) dar('veterano');
    if (ev.campeon === u) {
      d.victorias++; d['v' + cfg.variante] = (d['v' + cfg.variante] || 0) + 1;
      d.mejorPartida = Math.max(d.mejorPartida, ev.puntos[u]);
      dar('primera_partida');
      if (cfg.modo === 'parejas') dar('victoria_parejas'); else if (cfg.modo === 'todos') dar('victoria_todos'); else dar('victoria_duelo');
      if (cfg.variante === 9) dar('doble_nueve'); if (cfg.variante === 12) dar('doble_doce');
      if ((ctx.tipos || []).includes('bot2')) dar('vs_experto');
      if (ev.puntos.every((p, i) => i === u || p === 0)) dar('zapatero');
      if (cfg.modo === 'duelo' && partida.robos === 0) dar('sin_robar');
      if (ctx.multi) { d.mpVictorias++; dar('mesa_amigos'); }
      if ((ctx.apostado | 0) >= 50) dar('apostador');
    }
  }
  Progreso.guardar();
}
