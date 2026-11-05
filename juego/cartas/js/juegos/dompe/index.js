import * as reglas from './reglas.js';
import { bot } from './bot.js';
import * as ui from './ui.js';
import { CATS, NOMBRES, GANA_DEF, ORDEN_DEF } from './combos.js';

const ganan = CATS.filter((c) => c !== 'alta').map((c) => ({ id: 'g_' + c, etiqueta: NOMBRES[c], tipo: 'bool', def: GANA_DEF.includes(c), grupo: 'Victoria inmediata' }));
export const Dompe = Object.assign({}, reglas, {
  bot, ui, id: 'dompe', nombre: 'Dompe', min: 2, max: 6, torneo: false, retardoPaso: 800,
  barajas: [['es40', 'Española 40 (comodín: 2 de oros)'], ['es48', 'Española 48 (comodín: 2 de oros)'], ['fr52', 'Americana 52 + 2 jokers']],
  normalizar(op) {
    const o = Object.assign({}, op);
    o.gana = op.gana || Object.keys(op).filter((k) => k.startsWith('g_') && op[k]).map((k) => k.slice(2));
    o.orden = op.orden || ORDEN_DEF;
    return o;
  },
  opciones: [
    { id: 'ana', etiqueta: 'Ana por ronda (fichas, 0 = sin apuesta)', tipo: 'num', def: 0, min: 0, max: 100000, grupo: 'Apuestas' },
    { id: 'penal', etiqueta: 'Penalización por dompear sin ganar (0 = ninguna)', tipo: 'num', def: 0, min: 0, max: 100000, grupo: 'Apuestas' },
    { id: 'comodin', etiqueta: 'Usar comodines (2 de oros / 2 jokers)', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'dompeDesde', etiqueta: 'Se puede dompear desde la vuelta', tipo: 'sel', def: 2, opciones: [[2, '2 (regla de la casa)'], [3, '3'], [4, '4']], grupo: 'Reglas' },
    { id: 'asAlto', etiqueta: 'El As en escaleras', tipo: 'sel', def: 'ambos', opciones: [['ambos', 'Bajo o alto'], ['bajo', 'Solo bajo (As-2-3…)'], ['alto', 'Solo alto (…R-As)']], grupo: 'Reglas' },
    { id: 'puente', etiqueta: 'Baraja española: el 7 va seguido de la sota (10)', tipo: 'bool', def: true, grupo: 'Reglas' },
    { id: 'empate', etiqueta: 'Empate de mejor mano con quien dompeó', tipo: 'sel', def: 'reparte', opciones: [['reparte', 'Se reparte el bote'], ['otros', 'Gana el otro jugador']], grupo: 'Reglas' },
    { id: 'noDevolver', etiqueta: 'No se puede devolver la carta tomada del descarte', tipo: 'bool', def: true, grupo: 'Reglas' },
    ...ganan,
    { id: 'orden', etiqueta: 'Orden de fuerza de las manos (de mayor a menor)', tipo: 'orden', def: ORDEN_DEF, items: CATS.map((c) => [c, NOMBRES[c]]), grupo: 'Orden de fuerza' },
  ],
});
