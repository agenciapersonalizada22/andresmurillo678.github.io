// Progreso local: estadisticas, logros y puntajes de ranking. Ids estables para registrarlos en la plataforma.
// Para el ranking solo cuentan partidas "validas" (3+ jugadores y meta >= 8) para que no se infle con partidas triviales.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Fundador', desc: 'Gana tu primera partida.' },
  { id: 'gana_dificil', nombre: 'Domador de bots', desc: 'Gana con al menos 2 bots Difíciles en la mesa.' },
  { id: 'gana_amigos', nombre: 'Mesa de amigos', desc: 'Gana una partida con 2 o más personas.' },
  { id: 'ruta_larga', nombre: 'Gran ruta', desc: 'Consigue el Camino más largo.' },
  { id: 'gran_ejercito', nombre: 'Gran ejército', desc: 'Consigue el Ejército mayor.' },
  { id: 'primera_ciudad', nombre: 'Urbanista', desc: 'Mejora un poblado a ciudad.' },
  { id: 'cuatro_ciudades', nombre: 'Metrópolis', desc: 'Ten las 4 ciudades construidas a la vez.' },
  { id: 'comerciante', nombre: 'Comerciante', desc: 'Cierra 10 tratos con otros jugadores.' },
  { id: 'navegante', nombre: 'Navegante', desc: 'Cambia con un puerto 2:1.' },
  { id: 'bandido', nombre: 'Mano ladrona', desc: 'Mueve al bandido 10 veces en total.' },
  { id: 'extremos', nombre: 'Al límite', desc: 'Saca un 2 o un 12 con los dados.' },
  { id: 'reliquias', nombre: 'Reliquia secreta', desc: 'Gana usando una Reliquia oculta.' },
  { id: 'rapida', nombre: 'Relámpago', desc: 'Gana jugando 14 turnos propios o menos.' },
  { id: 'isla_grande', nombre: 'Isla grande', desc: 'Gana en el tablero grande.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 25 partidas.' },
  { id: 'racha_3', nombre: 'En racha', desc: 'Gana 3 partidas seguidas.' }
];
export const PUNTAJES = [
  { id: 'puntos', nombre: 'Puntos acumulados', mayorEsMejor: true, tope: 100000, unidad: 'pts' },
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 5000, unidad: 'victorias' },
  { id: 'racha', nombre: 'Mejor racha de victorias', mayorEsMejor: true, tope: 100, unidad: 'victorias' }
];
const BASE = {
  partidas: 0, victorias: 0, mpVictorias: 0, racha: 0, mejorRacha: 0, puntos: 0, mejorPV: 0,
  rVictorias: 0, rRacha: 0, rMejorRacha: 0, rPuntos: 0,
  tratos: 0, ciudades: 0, ladrones: 0, caminosLargos: 0, guardias: 0, logros: {}
};
export const Progreso = { datos: { ...BASE, logros: {} }, alLogro: null };
let guardarId = 0;
Progreso.cargar = () => { const g = leer(CLAVES.progreso, {}); Progreso.datos = mezclar(BASE, g); Progreso.datos.logros = { ...(g.logros || {}) }; return Progreso.datos; };
Progreso.guardar = () => { clearTimeout(guardarId); guardarId = 0; escribir(CLAVES.progreso, Progreso.datos); };
const diferir = () => { if (!guardarId) guardarId = setTimeout(Progreso.guardar, 600); };
Progreso.borrar = () => { Progreso.datos = { ...BASE, logros: {} }; Progreso.guardar(); };
function dar(id) {
  const d = Progreso.datos;
  if (d.logros[id]) return;
  d.logros[id] = Date.now();
  const l = LOGROS.find((x) => x.id === id);
  if (l && Progreso.alLogro) Progreso.alLogro(l);
}
export const partidaValida = (n, cfg) => n >= 3 && cfg.meta >= 8;
export const puntosDePartida = (pv, gano, tipos) => Math.min(40, pv + (gano ? 10 + (tipos.includes('bot2') ? 5 : tipos.includes('bot1') ? 2 : 0) : 0));

// ctx: { yo, v (vista actual), tipos (tipos de asiento), multi (hay humanos remotos) }
Progreso.evento = (ev, ctx) => {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  switch (ev.t) {
    case 'ciudad':
      if (ev.j !== yo) break;
      d.ciudades++; dar('primera_ciudad');
      if (v && v.piezas[yo].ciu === 0) dar('cuatro_ciudades');
      break;
    case 'tratoHecho': if (ev.j === yo || ev.con === yo) { d.tratos++; if (d.tratos >= 10) dar('comerciante'); } break;
    case 'banco': if (ev.j === yo && ev.n === 2) dar('navegante'); break;
    case 'ladron': if (ev.j === yo) { d.ladrones++; if (d.ladrones >= 10) dar('bandido'); } break;
    case 'tirada': if (ev.d[0] + ev.d[1] === 2 || ev.d[0] + ev.d[1] === 12) dar('extremos'); break;
    case 'largo': if (ev.j === yo) { d.caminosLargos++; dar('ruta_larga'); } break;
    case 'ejercito': if (ev.j === yo) dar('gran_ejercito'); break;
    case 'jugarCarta': if (ev.j === yo && ev.carta === 'guardia') d.guardias++; break;
    case 'fin': finPartida(ev, ctx); break;
    default: break;
  }
  diferir();
};
function finPartida(ev, ctx) {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  if (!v || !v.fin) return;
  const gano = ev.ganador === yo, valida = partidaValida(v.n, v.cfg), tipos = ctx.tipos || [];
  d.partidas++;
  const pv = v.fin.pts[yo];
  d.mejorPV = Math.max(d.mejorPV, pv);
  if (d.partidas >= 25) dar('veterano');
  if (gano) {
    d.victorias++; d.racha++; d.mejorRacha = Math.max(d.mejorRacha, d.racha);
    dar('primera_victoria');
    if (d.racha >= 3) dar('racha_3');
    if (tipos.filter((t) => t === 'bot2').length >= 2) dar('gana_dificil');
    if (ctx.multi) { d.mpVictorias++; dar('gana_amigos'); }
    if (v.cm.includes('pv')) dar('reliquias');
    if (Math.ceil(v.fin.turnos / v.n) <= 14) dar('rapida');
    if (v.cfg.radio === 3) dar('isla_grande');
  } else d.racha = 0;
  if (valida) {
    d.rPuntos += puntosDePartida(pv, gano, tipos);
    if (gano) { d.rVictorias++; d.rRacha++; d.rMejorRacha = Math.max(d.rMejorRacha, d.rRacha); } else d.rRacha = 0;
    d.puntos = d.rPuntos;
  }
  Progreso.guardar();
}
