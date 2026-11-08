// Progreso local: estadisticas, racha, puntaje acumulado y logros. Los puntajes/logros tienen ids estables para la plataforma.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';
import { T } from './reglas.js';

export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Último gato en pie', desc: 'Gana una partida.' },
  { id: 'boom', nombre: '¡BOOM!', desc: 'Explota por primera vez. Le pasa a los mejores.' },
  { id: 'desactivador', nombre: 'Desactivador', desc: 'Desactiva un Gato Bomba con un Ovillo.' },
  { id: 'desactivar_3', nombre: 'Artificiero', desc: 'Desactiva 3 Gatos Bomba en total.' },
  { id: 'primer_nope', nombre: 'Ni hablar', desc: 'Juega un ¡Miau No!.' },
  { id: 'nope_cadena', nombre: 'Cadena de noes', desc: 'Participa en una cadena de 3 ¡Miau No!.' },
  { id: 'combo_par', nombre: 'Par de pillos', desc: 'Juega un par de gatos iguales.' },
  { id: 'combo_trio', nombre: 'Trío pedigüeño', desc: 'Juega un trío de gatos iguales.' },
  { id: 'robo_maestro', nombre: 'Golpe maestro', desc: 'Acierta la carta que pedías con un trío.' },
  { id: 'combo_cinco', nombre: 'Rescate felino', desc: 'Juega cinco gatos distintos y rescata una carta del descarte.' },
  { id: 'zarpazo', nombre: 'Garras fuera', desc: 'Resuelve un Zarpazo.' },
  { id: 'vidente_5', nombre: 'Siete vidas, cinco visiones', desc: 'Usa Vidente 5 veces.' },
  { id: 'racha_3', nombre: 'En racha', desc: 'Gana 3 partidas seguidas.' },
  { id: 'racha_5', nombre: 'Imparable', desc: 'Gana 5 partidas seguidas.' },
  { id: 'vs_maestro', nombre: 'Domador de Maestros', desc: 'Gana con un bot Maestro en la mesa.' },
  { id: 'mesa_llena', nombre: 'Mesa llena', desc: 'Gana una partida de 5 jugadores.' },
  { id: 'sin_ovillo', nombre: 'Sangre fría', desc: 'Gana una partida sin usar ningún Ovillo.' },
  { id: 'rapido', nombre: 'Reflejos de gato', desc: 'Gana una partida en modo rápido.' },
  { id: 'equipo_ganador', nombre: 'Dúo dinámico', desc: 'Gana en el modo Equipos 2 contra 2.' },
  { id: 'campeon_torneo', nombre: 'Campeón del torneo', desc: 'Gana un torneo a rondas.' },
  { id: 'mesa_amigos', nombre: 'Mesa de amigos', desc: 'Gana una partida multijugador con humanos.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 25 partidas.' },
  { id: 'mil_puntos', nombre: 'Coleccionista', desc: 'Acumula 1000 puntos en total.' }
];
export const PUNTAJES = [
  { id: 'puntos', nombre: 'Puntos acumulados', mayorEsMejor: true, tope: 50000, unidad: 'pts' },
  { id: 'racha', nombre: 'Mejor racha de victorias', mayorEsMejor: true, tope: 200, unidad: 'victorias' },
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 5000, unidad: 'victorias' }
];

const BASE = {
  partidas: 0, victorias: 0, rondas: 0, rondasGanadas: 0, racha: 0, mejorRacha: 0, puntos: 0, mejorPartida: 0,
  explosiones: 0, desactivadas: 0, nopes: 0, pares: 0, trios: 0, cincos: 0, futuros: 0, ataques: 0, mpVictorias: 0, logros: {}
};
export const Progreso = { datos: { ...BASE, logros: {} }, alLogro: null };
let ronda = { ovillos: 0 }, guardarId = 0;
const BASE_PTS = { clasico: 10, rapido: 8, equipos: 12, torneo: 30 };

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

// ctx: { yo, v (vista actual), tipos, multi, cfg }
Progreso.evento = (ev, ctx) => {
  const d = Progreso.datos, yo = ctx.yo;
  switch (ev.t) {
    case 'reparto': if (ev.ronda === 1) ronda = { ovillos: 0 }; break;
    case 'desactiva': if (ev.j === yo) { d.desactivadas++; ronda.ovillos++; dar('desactivador'); if (d.desactivadas >= 3) dar('desactivar_3'); } break;
    case 'explota': if (ev.j === yo) { d.explosiones++; dar('boom'); } break;
    case 'nope': if (ev.j === yo) { d.nopes++; dar('primer_nope'); if (ev.n >= 3) dar('nope_cadena'); } break;
    case 'jugar':
      if (ev.j !== yo) break;
      if (ev.kind === 'par') { d.pares++; dar('combo_par'); }
      else if (ev.kind === 'trio') { d.trios++; dar('combo_trio'); }
      else if (ev.kind === 'cinco') { d.cincos++; dar('combo_cinco'); }
      break;
    case 'resuelve': if (ev.j === yo && ev.kind === 'carta' && ev.tp === T.ATAQUE) { d.ataques++; dar('zarpazo'); } break;
    case 'futuro': if (ev.j === yo) { d.futuros++; if (d.futuros >= 5) dar('vidente_5'); } break;
    case 'roba': if (ev.j === yo && ev.ok && ev.tp != null) dar('robo_maestro'); break;
    case 'fin': finRonda(ev, ctx); break;
    default: break;
  }
  diferir();
};

export function puntosPartida(modo, n, gano) { return gano ? (BASE_PTS[modo] || 10) + 3 * (n - 1) : 1; }

function finRonda(ev, ctx) {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  const gano = ev.ganadores.includes(yo);
  d.rondas++; if (gano) d.rondasGanadas++;
  if (!ev.partida) { Progreso.guardar(); return; }
  d.partidas++;
  const modo = (v && v.cfg.modo) || 'clasico', n = v ? v.n : 2;
  const pts = puntosPartida(modo, n, gano);
  d.puntos += pts;
  if (d.partidas >= 25) dar('veterano');
  if (gano) {
    d.victorias++; d.racha++;
    if (d.racha > d.mejorRacha) d.mejorRacha = d.racha;
    d.mejorPartida = Math.max(d.mejorPartida, pts);
    dar('primera_victoria');
    if (d.racha >= 3) dar('racha_3');
    if (d.racha >= 5) dar('racha_5');
    if ((ctx.tipos || []).includes('bot2')) dar('vs_maestro');
    if (n === 5) dar('mesa_llena');
    if (ronda.ovillos === 0) dar('sin_ovillo');
    if (modo === 'rapido') dar('rapido');
    if (modo === 'equipos') dar('equipo_ganador');
    if (modo === 'torneo') dar('campeon_torneo');
    if (ctx.multi) { d.mpVictorias++; dar('mesa_amigos'); }
  } else d.racha = 0;
  if (d.puntos >= 1000) dar('mil_puntos');
  Progreso.guardar();
}
