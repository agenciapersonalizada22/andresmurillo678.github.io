// Progreso local: estadisticas, racha, puntaje acumulado y logros. Los puntajes/logros tienen ids estables para registrarlos en la plataforma.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const LOGROS = [
  { id: 'primera_ronda', nombre: 'Primera ronda', desc: 'Gana una ronda.' },
  { id: 'primera_partida', nombre: 'Campeón', desc: 'Gana una partida completa.' },
  { id: 'racha_3', nombre: 'En racha', desc: 'Gana 3 rondas seguidas.' },
  { id: 'racha_5', nombre: 'Imparable', desc: 'Gana 5 rondas seguidas.' },
  { id: 'uno_10', nombre: '¡UNO!', desc: 'Grita UNO 10 veces.' },
  { id: 'cazador', nombre: 'Cazador', desc: 'Atrapa a un rival que olvidó gritar UNO.' },
  { id: 'cazador_5', nombre: 'Ojo de halcón', desc: 'Atrapa 5 UNO olvidados.' },
  { id: 'desafio_ok', nombre: 'Farol descubierto', desc: 'Gana un desafío del comodín +4.' },
  { id: 'desafio_mal', nombre: 'Fe ciega', desc: 'Pierde un desafío del comodín +4.' },
  { id: 'vs_estratega', nombre: 'Domador de estrategas', desc: 'Gana una partida con un bot Estratega en la mesa.' },
  { id: 'mesa_llena', nombre: 'Mesa llena', desc: 'Gana una partida de 6 jugadores.' },
  { id: 'meta_500', nombre: 'Medio millar', desc: 'Llega a la meta de puntos en una partida por rondas.' },
  { id: 'mano_limpia', nombre: 'Mano limpia', desc: 'Gana una ronda sin robar por decisión propia.' },
  { id: 'relampago', nombre: 'Relámpago', desc: 'Gana una ronda en menos de 90 segundos.' },
  { id: 'final_comodin', nombre: 'Final de comodín', desc: 'Gana una ronda jugando un comodín como última carta.' },
  { id: 'torre_castigo', nombre: 'Torre de castigo', desc: 'Presencia un castigo acumulado de 8 o más cartas.' },
  { id: 'triple', nombre: 'Triple', desc: 'Juega 3 cartas iguales de una vez.' },
  { id: 'trueque', nombre: 'Trueque', desc: 'Intercambia tu mano con un 7.' },
  { id: 'tiovivo', nombre: 'Tiovivo', desc: 'Juega un 0 que rota las manos.' },
  { id: 'reflejos', nombre: 'Reflejos', desc: 'Gana una ronda en modo rápido (10 s).' },
  { id: 'mesa_amigos', nombre: 'Mesa de amigos', desc: 'Gana una partida multijugador con humanos.' },
  { id: 'remontada', nombre: 'Remontada', desc: 'Gana una ronda tras llegar a tener 12 cartas o más.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 25 partidas.' },
  { id: 'mil_puntos', nombre: 'Coleccionista', desc: 'Acumula 1000 puntos en total.' }
];
// Modos de puntaje para la plataforma
export const PUNTAJES = [
  { id: 'puntos', nombre: 'Puntos acumulados', mayorEsMejor: true, tope: 1000000, unidad: 'pts' },
  { id: 'racha', nombre: 'Mejor racha de rondas ganadas', mayorEsMejor: true, tope: 500, unidad: 'rondas' },
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 100000, unidad: 'victorias' }
];

const BASE = {
  partidas: 0, victorias: 0, rondas: 0, rondasGanadas: 0, racha: 0, mejorRacha: 0, puntos: 0, mejorPartida: 0,
  uno: 0, cazados: 0, desafiosOk: 0, desafiosMal: 0, jugadas: 0, robos: 0, mpVictorias: 0, logros: {}
};
export const Progreso = { datos: { ...BASE, logros: {} }, alLogro: null };
let ronda = { t0: 0, robos: 0, maxMano: 0 };
let guardarId = 0;

Progreso.cargar = () => { Progreso.datos = mezclar(BASE, leer(CLAVES.progreso, {})); Progreso.datos.logros = { ...(leer(CLAVES.progreso, {}).logros || {}) }; return Progreso.datos; };
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

// ctx: { yo, v (vista actual), tipos, multi (hay humanos remotos), cfg }
Progreso.evento = (ev, ctx) => {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  switch (ev.t) {
    case 'reparto': ronda = { t0: Date.now(), robos: 0, maxMano: 7 }; break;
    case 'jugar':
      if (ev.j !== yo) break;
      d.jugadas += ev.cartas.length;
      if (ev.cartas.length >= 3) dar('triple');
      break;
    case 'cambio': if (ev.j === yo) dar('trueque'); break;
    case 'rota': if (v && v.cfg.cero7) dar('tiovivo'); break;
    case 'robo':
      if (ev.j === yo) { d.robos += ev.n; if (ev.motivo === 'voluntario') ronda.robos++; ronda.maxMano = Math.max(ronda.maxMano, v ? v.mano.length : 0); }
      break;
    case 'uno': if (ev.j === yo) { d.uno++; if (d.uno >= 10) dar('uno_10'); } break;
    case 'cazado': if (ev.por === yo) { d.cazados++; dar('cazador'); if (d.cazados >= 5) dar('cazador_5'); } break;
    case 'desafio':
      if (ev.j === yo) { if (ev.ok) { d.desafiosOk++; dar('desafio_ok'); } else { d.desafiosMal++; dar('desafio_mal'); } }
      break;
    case 'fin': finRonda(ev, ctx); break;
    default: break;
  }
  if (v && v.pend >= 8) dar('torre_castigo');
  diferir();
};

function finRonda(ev, ctx) {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  d.rondas++;
  if (ev.ganador === yo) {
    d.rondasGanadas++; d.racha++; d.puntos += ev.pts;
    if (d.racha > d.mejorRacha) d.mejorRacha = d.racha;
    dar('primera_ronda');
    if (d.racha >= 3) dar('racha_3');
    if (d.racha >= 5) dar('racha_5');
    if (ronda.robos === 0) dar('mano_limpia');
    if (Date.now() - ronda.t0 < 90000) dar('relampago');
    if (v && v.fin && (v.fin.ultima === 13 || v.fin.ultima === 14)) dar('final_comodin');
    if (v && v.cfg.tiempo === 10000) dar('reflejos');
    if (ronda.maxMano >= 12) dar('remontada');
    if (d.puntos >= 1000) dar('mil_puntos');
  } else d.racha = 0;
  if (ev.partida) {
    d.partidas++;
    if (d.partidas >= 25) dar('veterano');
    if (ev.ganador === yo) {
      d.victorias++;
      dar('primera_partida');
      if (v) {
        d.mejorPartida = Math.max(d.mejorPartida, v.puntos[yo]);
        if (v.n === 6) dar('mesa_llena');
        if (v.cfg.puntuacion === 'ronda') dar('meta_500');
        if ((ctx.tipos || []).includes('bot2')) dar('vs_estratega');
      }
      if (ctx.multi) { d.mpVictorias++; dar('mesa_amigos'); }
    }
  }
  Progreso.guardar();
}
