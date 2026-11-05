import * as reglas from './reglas.js';
import { bot } from './bot.js';
import * as ui from './ui.js';

export const Pescar = Object.assign({}, reglas, {
  bot, ui, id: 'pescar', nombre: 'Ve a pescar', min: 2, max: 6, torneo: false, retardoPaso: 700, nDef: 3, pausaMs: 4000, turnoSeg: 45,
  barajas: [['fr52', 'Americana 52 (libros de 4)'], ['es40', 'Española 40'], ['es48', 'Española 48']],
  opciones: [
    { id: 'familiar', etiqueta: 'Versión familiar (niños: pistas, animaciones y mensajes grandes)', tipo: 'bool', def: false, grupo: 'Versión' },
    { id: 'nCartas', etiqueta: 'Cartas iniciales', tipo: 'sel', def: 0, opciones: [[0, 'Automático (7 con 2-3 jugadores, 5 con más)'], [5, '5 cartas'], [7, '7 cartas']], grupo: 'Reglas' },
    { id: 'libro', etiqueta: 'Cartas por libro', tipo: 'sel', def: 4, opciones: [[4, '4 (clásico)'], [3, '3 (baraja de 40; la 4ª carta queda muerta)']], grupo: 'Reglas' },
    { id: 'repetirAlPescar', etiqueta: 'Si pescas la carta que pedías, juegas otra vez', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'vacia', etiqueta: 'Si te quedas sin cartas', tipo: 'sel', def: 'robar', opciones: [['robar', 'Robas cartas en tu turno'], ['fuera', 'Quedas fuera de la ronda']], grupo: 'Reglas' },
    { id: 'ana', etiqueta: 'Ana por ronda (fichas, 0 = sin apuesta)', tipo: 'num', def: 0, min: 0, max: 100000, grupo: 'Apuestas' },
  ],
});
