// =============================================================
//  💰  BOTÍN Y MOCHILA
//  Los cofres de las estructuras tienen tesoros. Lo que hay dentro
//  sale de una "suerte" que depende de la semilla del mundo y del
//  lugar del cofre: siempre es lo mismo para ese cofre. Una vez que
//  lo abres, queda vacío (se anota y se guarda).
//  Los tesoros van a la mochila: esmeraldas, diamantes, lingotes,
//  comida y bidones de combustible para los vehículos.
// =============================================================
import { hash3 } from './ruido.js';

export const OBJETOS = {
  bidon: { nombre: 'Bidón de combustible', color: '#d23b2a', forma: 'bidon' },
  esmeralda: { nombre: 'Esmeralda', color: '#2fd070', forma: 'gema' },
  diamante: { nombre: 'Diamante', color: '#52d8e6', forma: 'gema' },
  oro: { nombre: 'Lingote de oro', color: '#f0c030', forma: 'lingote' },
  hierro: { nombre: 'Lingote de hierro', color: '#c8ccd2', forma: 'lingote' },
  carbon: { nombre: 'Carbón', color: '#2a2a2e', forma: 'gema' },
  pan: { nombre: 'Pan', color: '#c88a3c', forma: 'pan' },
  manzana: { nombre: 'Manzana', color: '#d83a2e', forma: 'manzana' },
};
export const LISTA_OBJETOS = Object.keys(OBJETOS);

// tablas: [objeto, probabilidad, mínimo, máximo]
const TABLAS = {
  superficie: [['bidon', 0.5, 1, 2], ['pan', 0.6, 1, 4], ['manzana', 0.4, 1, 3], ['hierro', 0.4, 1, 3], ['oro', 0.2, 1, 2], ['esmeralda', 0.25, 1, 2], ['carbon', 0.3, 1, 4]],
  subterraneo: [['bidon', 0.4, 1, 2], ['hierro', 0.7, 2, 5], ['oro', 0.5, 1, 3], ['diamante', 0.22, 1, 2], ['carbon', 0.5, 2, 6], ['pan', 0.3, 1, 3], ['esmeralda', 0.15, 1, 1]],
  tesoro: [['diamante', 0.8, 1, 3], ['esmeralda', 0.8, 1, 4], ['oro', 0.8, 2, 5], ['bidon', 0.5, 1, 2], ['hierro', 0.6, 2, 4]],
};

// Qué hay en el cofre de (x, y, z)
export function botinDe(x, y, z, semilla, nivelMar, tipo = null) {
  const tabla = TABLAS[tipo || (y < nivelMar - 6 ? 'subterraneo' : 'superficie')];
  const res = [];
  tabla.forEach(([obj, p, a, b], i) => {
    if (hash3(x, y, z, (semilla | 0) + 900 + i * 17) < p) {
      res.push([obj, a + Math.floor(hash3(x, y, z, (semilla | 0) + 1300 + i * 31) * (b - a + 1))]);
    }
  });
  if (!res.length) res.push(['pan', 1]);
  return res;
}

export class Mochila {
  constructor() { this.items = {}; }
  agregar(obj, n = 1) { this.items[obj] = (this.items[obj] || 0) + n; }
  cuenta(obj) { return this.items[obj] || 0; }
  quitar(obj, n = 1) {
    if (this.cuenta(obj) < n) return false;
    this.items[obj] -= n;
    if (this.items[obj] <= 0) delete this.items[obj];
    return true;
  }
  exportar() { return { ...this.items }; }
  importar(o) {
    this.items = {};
    if (!o || typeof o !== 'object') return;
    for (const k of LISTA_OBJETOS) if (Number.isFinite(o[k]) && o[k] > 0) this.items[k] = Math.min(9999, o[k] | 0);
  }
  vacia() { return Object.keys(this.items).length === 0; }
}
