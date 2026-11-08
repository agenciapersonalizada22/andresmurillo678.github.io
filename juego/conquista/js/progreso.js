// Progreso local: estadisticas y logros con ids estables (registrados en la plataforma). Se calcula en cada cliente a partir de los eventos publicos.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';
import { DE_CONT } from './mapa.js';

export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Primera conquista', desc: 'Gana una partida.' },
  { id: 'dominador', nombre: 'Dominador', desc: 'Gana una partida de Dominación.' },
  { id: 'agente_secreto', nombre: 'Agente secreto', desc: 'Cumple tu misión secreta y gana.' },
  { id: 'relampago', nombre: 'Guerra relámpago', desc: 'Gana una partida en modo Rápido.' },
  { id: 'trabajo_equipo', nombre: 'Trabajo en equipo', desc: 'Gana una partida por Equipos.' },
  { id: 'campeon_5', nombre: 'Campeón', desc: 'Gana 5 partidas.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 10 partidas completas.' },
  { id: 'conquistador_100', nombre: 'Conquistador', desc: 'Conquista 100 territorios en total.' },
  { id: 'avance_rapido', nombre: 'Avance imparable', desc: 'Conquista 5 territorios en un mismo turno.' },
  { id: 'eliminador', nombre: 'Eliminador', desc: 'Elimina a un rival de la partida.' },
  { id: 'exterminador', nombre: 'Exterminador', desc: 'Elimina a 5 rivales en total.' },
  { id: 'senor_continente', nombre: 'Señor del continente', desc: 'Controla un continente completo al final de tu turno.' },
  { id: 'dueno_asia', nombre: 'Dueño de Asia', desc: 'Controla todo Asia.' },
  { id: 'coleccionista', nombre: 'Coleccionista', desc: 'Canjea 5 conjuntos de cartas.' },
  { id: 'golpe_perfecto', nombre: 'Golpe perfecto', desc: 'Con 3 dados vence a 2 defensores sin perder ningún ejército.' },
  { id: 'remontada', nombre: 'Remontada', desc: 'Gana tras haber quedado con 4 territorios o menos.' },
  { id: 'rey_de_reyes', nombre: 'Rey de reyes', desc: 'Gana una partida contra 3 o más bots Maestro.' },
  { id: 'mesa_llena', nombre: 'Mundo lleno', desc: 'Gana una partida de 6 jugadores.' },
  { id: 'con_amigos', nombre: 'Guerra entre amigos', desc: 'Gana una partida multijugador con humanos.' },
  { id: 'tutorial', nombre: 'Aprendiz', desc: 'Completa la partida de entrenamiento.' }
];
export const PUNTAJES = [
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 100000, unidad: 'victorias' },
  { id: 'territorios', nombre: 'Territorios conquistados (partidas terminadas)', mayorEsMejor: true, tope: 100000, unidad: 'territorios' }
];
const BASE = { partidas: 0, victorias: 0, derrotas: 0, territoriosFin: 0, conqTotal: 0, elim: 0, canjes: 0, batallas: 0, ejercitosPerdidos: 0, ejercitosDestruidos: 0, golpes: 0, mp: 0, mpVictorias: 0, porModo: {}, logros: {} };
export const Progreso = { datos: { ...BASE, porModo: {}, logros: {} }, alLogro: null };
let act = { conqTurno: 0, minTerr: 99, contado: false };
let guardarId = 0;

Progreso.cargar = () => { const g = leer(CLAVES.progreso, {}); Progreso.datos = mezclar(BASE, g); Progreso.datos.porModo = { ...(g.porModo || {}) }; Progreso.datos.logros = { ...(g.logros || {}) }; return Progreso.datos; };
Progreso.guardar = () => { clearTimeout(guardarId); guardarId = 0; escribir(CLAVES.progreso, Progreso.datos); };
const diferir = () => { if (!guardarId) guardarId = setTimeout(Progreso.guardar, 600); };
Progreso.borrar = () => { Progreso.datos = { ...BASE, porModo: {}, logros: {} }; Progreso.guardar(); };
Progreso.nuevaPartida = () => { act = { conqTurno: 0, minTerr: 99, contado: false }; };

function dar(id) {
  const d = Progreso.datos;
  if (d.logros[id]) return;
  d.logros[id] = Date.now();
  const l = LOGROS.find((x) => x.id === id);
  if (l && Progreso.alLogro) Progreso.alLogro(l);
}
const controla = (v, yo, ci) => DE_CONT[ci].every((t) => v.o[t] === yo);

// ctx: { yo, v (vista actual), multi (hay humanos remotos), tutorial }
Progreso.evento = (e, ctx) => {
  const d = Progreso.datos, yo = ctx.yo, v = ctx.v;
  if (yo == null || yo < 0 || !v) return;
  let mias = 0; for (let i = 0; i < v.o.length; i++) if (v.o[i] === yo) mias++;
  if (v.fase !== 'colocar' && mias) act.minTerr = Math.min(act.minTerr, mias);
  switch (e.t) {
    case 'turno': act.conqTurno = 0; if (e.j === yo) { /* al terminar se evalua el continente */ } break;
    case 'bat':
      if (e.ja === yo) { d.batallas++; d.ejercitosPerdidos += e.pa; d.ejercitosDestruidos += e.pd; if (e.ad.length === 3 && e.dd.length === 2 && e.pd === 2 && e.pa === 0) { d.golpes++; dar('golpe_perfecto'); } }
      break;
    case 'conq':
      if (e.j === yo) { d.conqTotal++; act.conqTurno++; if (act.conqTurno >= 5) dar('avance_rapido'); if (d.conqTotal >= 100) dar('conquistador_100'); if (v.o.length) { for (let ci = 0; ci < DE_CONT.length; ci++) if (controla(v, yo, ci)) { dar('senor_continente'); if (ci === 4) dar('dueno_asia'); } } }
      break;
    case 'elim': if (e.por === yo) { d.elim++; dar('eliminador'); if (d.elim >= 5) dar('exterminador'); } break;
    case 'canje': if (e.j === yo) { d.canjes++; if (d.canjes >= 5) dar('coleccionista'); } break;
    case 'fin': {
      if (act.contado) break; act.contado = true;
      const g = v.ganador || { j: e.j, equipo: e.equipo, motivo: e.motivo };
      const gane = v.cfg.modo === 'equipos' ? v.jug[yo].equipo === g.equipo : g.j === yo;
      d.partidas++; d.territoriosFin += (v.jug[yo].st && v.jug[yo].st.conq) || 0;
      const pm = d.porModo[v.cfg.modo] = d.porModo[v.cfg.modo] || { j: 0, g: 0 }; pm.j++;
      if (ctx.multi) d.mp++;
      if (gane) {
        d.victorias++; pm.g++; if (ctx.multi) d.mpVictorias++;
        dar('primera_victoria'); if (d.victorias >= 5) dar('campeon_5');
        if (v.cfg.modo === 'dominacion') dar('dominador');
        if (v.cfg.modo === 'rapido') dar('relampago');
        if (v.cfg.modo === 'equipos') dar('trabajo_equipo');
        if (g.motivo === 'mision') dar('agente_secreto');
        if (act.minTerr <= 4) dar('remontada');
        if (v.n >= 6) dar('mesa_llena');
        if (ctx.multi) dar('con_amigos');
        const maestros = v.jug.filter((p, i) => i !== yo && p.tipo === 'bot' && p.nivel === 2).length;
        if (maestros >= 3) dar('rey_de_reyes');
      } else d.derrotas++;
      if (ctx.tutorial) dar('tutorial');
      if (d.partidas >= 10) dar('veterano');
      Progreso.guardar(); return;
    }
    default:
  }
  diferir();
};
