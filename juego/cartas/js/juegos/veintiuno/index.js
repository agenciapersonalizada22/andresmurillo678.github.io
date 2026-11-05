import * as reglas from './reglas.js';
import { bot } from './bot.js';
import * as ui from './ui.js';

const comun = [
  { id: 'minApuesta', etiqueta: 'Apuesta mínima', tipo: 'num', def: 10, min: 1, max: 100000, grupo: 'Apuestas' },
  { id: 'maxApuesta', etiqueta: 'Apuesta máxima', tipo: 'num', def: 500, min: 1, max: 1000000, grupo: 'Apuestas' },
  { id: 'doblar', etiqueta: 'Permitir doblar', tipo: 'bool', def: true, grupo: 'Reglas' },
  { id: 'banca', etiqueta: 'Quién es la banca', tipo: 'sel', def: 0, opciones: [[0, 'La casa (automática)'], [1, 'Asiento 1 (anfitrión)'], [2, 'Asiento 2'], [3, 'Asiento 3'], [4, 'Asiento 4']], grupo: 'Reglas' },
];
export const Veintiuno = Object.assign({}, reglas, {
  bot, ui, id: 'veintiuno', nombre: 'Veintiuno (Blackjack)', min: 1, max: 7, torneo: false, retardoPaso: 900,
  barajas: [['fr52', 'Francesa 52']],
  opciones: comun.slice(0, 2).concat([
    { id: 'mazos', etiqueta: 'Mazos en el zapato', tipo: 'num', def: 6, min: 1, max: 8, grupo: 'Zapato' },
    { id: 'pagoBJ', etiqueta: 'Blackjack paga', tipo: 'sel', def: '3:2', opciones: [['3:2', '3 a 2'], ['6:5', '6 a 5']], grupo: 'Reglas' },
    { id: 'blando17', etiqueta: 'Banca en 17 blando', tipo: 'sel', def: 'planta', opciones: [['planta', 'Se planta'], ['pide', 'Pide']], grupo: 'Reglas' },
    { id: 'seguro', etiqueta: 'Seguro', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'rendicion', etiqueta: 'Rendición', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'maxManos', etiqueta: 'Manos máximas al dividir', tipo: 'num', def: 4, min: 2, max: 4, grupo: 'Reglas' },
    { id: 'conteo', etiqueta: 'Mostrar conteo Hi-Lo (práctica)', tipo: 'bool', def: false, grupo: 'Práctica' },
  ]).concat(comun.slice(2)),
});
export const SieteYMedio = Object.assign({}, Veintiuno, {
  id: 'sietemedio', nombre: 'Siete y medio', barajas: [['es40', 'Española 40']], preset: { variante: 'sm' },
  opciones: comun.slice(0, 2).concat([
    { id: 'mazos', etiqueta: 'Mazos en el zapato', tipo: 'num', def: 2, min: 1, max: 4, grupo: 'Zapato' },
    { id: 'plantaSM', etiqueta: 'La banca se planta con', tipo: 'sel', def: 11, opciones: [[10, '5'], [11, '5 y medio'], [12, '6']], grupo: 'Reglas' },
    { id: 'pagoBJ', etiqueta: 'Siete y medio real paga', tipo: 'sel', def: '3:2', opciones: [['3:2', '3 a 2'], ['6:5', '6 a 5']], grupo: 'Reglas' },
    { id: 'conteo', etiqueta: 'Mostrar conteo (práctica)', tipo: 'bool', def: false, grupo: 'Práctica' },
  ]).concat(comun.slice(2)),
});
