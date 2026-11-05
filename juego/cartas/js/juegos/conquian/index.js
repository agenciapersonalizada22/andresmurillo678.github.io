import * as reglas from './reglas.js';
import { bot } from './bot.js';
import * as ui from './ui.js';

export const Conquian = Object.assign({}, reglas, {
  bot, ui, id: 'conquian', nombre: 'Conquián', min: 2, max: 4, torneo: false, retardoPaso: 800, nDef: 2, pausaMs: 4500, turnoSeg: 60,
  barajas: [['es40', 'Española 40']],
  opciones: [
    { id: 'ana', etiqueta: 'Ana por ronda (fichas, 0 = sin apuesta)', tipo: 'num', def: 0, min: 0, max: 100000, grupo: 'Apuestas' },
    { id: 'porCarta', etiqueta: 'Fichas que paga cada rival por carta que le queda', tipo: 'num', def: 0, min: 0, max: 10000, grupo: 'Apuestas' },
    { id: 'nMano', etiqueta: 'Cartas por jugador (el repartidor recibe una más)', tipo: 'num', def: 9, min: 4, max: 9, grupo: 'Reglas' },
    { id: 'ganarDescarte', etiqueta: 'Se gana también al descartar la última carta', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'tomarDescarte', etiqueta: 'Permitir tomar el descarte (si se usa al instante)', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'agregar', etiqueta: 'Añadir cartas a combinaciones de la mesa', tipo: 'sel', def: 'todas', opciones: [['todas', 'Propias y ajenas'], ['propias', 'Solo propias'], ['no', 'No se permite']], grupo: 'Reglas' },
    { id: 'puente', etiqueta: 'En las escaleras el 7 va seguido de la sota (10)', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'asAlto', etiqueta: 'El As también puede ir tras el Rey (R-As)', tipo: 'bool', def: false, grupo: 'Reglas' },
    { id: 'comodines', etiqueta: 'Comodines en el mazo (sustituyen cualquier carta, 1 por combinación)', tipo: 'sel', def: 0, opciones: [[0, 'Sin comodín'], [1, '1 comodín'], [2, '2 comodines']], grupo: 'Reglas' },
    { id: 'puntos', etiqueta: 'Llevar puntuación por rondas (puntos de las cartas que le quedan a los rivales)', tipo: 'bool', def: true, grupo: 'Puntuación' },
    { id: 'meta', etiqueta: 'Puntos para ganar la partida (0 = sin meta)', tipo: 'num', def: 0, min: 0, max: 100000, grupo: 'Puntuación' },
  ],
});
