import * as reglas from './reglas.js';
import { bot } from './bot.js';
import * as ui from './ui.js';

export const Poker = Object.assign({}, reglas, {
  bot, ui, id: 'poker', nombre: "Póker Texas Hold'em", min: 2, max: 6, torneo: true, retardoPaso: 1100,
  barajas: [['fr52', 'Francesa 52 (clásico)'], ['es40', 'Española 40 (póquer español)'], ['es48', 'Española 48']],
  normalizar(op) { return Object.assign({}, op, { rake: op.rake || { pct: +op.rakePct || 0, cap: +op.rakeCap || 0 }, escala: op.escala || { tipo: op.escTipo || '', cada: +op.escCada || 0 } }); },
  opciones: [
    { id: 'sb', etiqueta: 'Ciega pequeña', tipo: 'num', def: 10, min: 1, max: 100000, grupo: 'Apuestas' },
    { id: 'bb', etiqueta: 'Ciega grande', tipo: 'num', def: 20, min: 2, max: 200000, grupo: 'Apuestas' },
    { id: 'ante', etiqueta: 'Ana (ante)', tipo: 'num', def: 0, min: 0, max: 10000, grupo: 'Apuestas' },
    { id: 'limite', etiqueta: 'Límite de puja', tipo: 'sel', def: 'nl', opciones: [['nl', 'Sin límite'], ['pl', 'Pot-limit'], ['fl', 'Límite fijo']], grupo: 'Apuestas' },
    { id: 'escTipo', etiqueta: 'Subir ciegas', tipo: 'sel', def: 'manos', opciones: [['', 'Nunca'], ['manos', 'Cada N manos'], ['min', 'Cada N minutos']], grupo: 'Ciegas' },
    { id: 'escCada', etiqueta: 'Cada cuánto (N)', tipo: 'num', def: 10, min: 1, max: 100, grupo: 'Ciegas' },
    { id: 'rakePct', etiqueta: 'Comisión de la casa (%)', tipo: 'num', def: 0, min: 0, max: 10, grupo: 'Casa' },
    { id: 'rakeCap', etiqueta: 'Tope de comisión por mano', tipo: 'num', def: 0, min: 0, max: 10000, grupo: 'Casa' },
  ],
});
