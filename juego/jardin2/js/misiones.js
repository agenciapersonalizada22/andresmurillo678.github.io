// Misiones diarias y de mundo, colecciones y recompensas. Logica pura.
import { MUNDOS, NIV_POR_MUNDO } from './datos.js';
export const POOL_DIA = [
  { id: 'd_matar', n: 'Derrota 40 zombis', stat: 'matados', meta: 40, r: { m: 60 } },
  { id: 'd_plantar', n: 'Planta 30 plantas', stat: 'plantadas', meta: 30, r: { m: 50 } },
  { id: 'd_energia', n: 'Usa 2 Energías Verdes', stat: 'energias', meta: 2, r: { g: 2 } },
  { id: 'd_ganar', n: 'Gana 2 niveles', stat: 'victorias', meta: 2, r: { m: 80 } },
  { id: 'd_soles', n: 'Recoge 40 chispas', stat: 'soles', meta: 40, r: { m: 40 } },
  { id: 'd_poder', n: 'Usa 3 poderes de dedo', stat: 'poderes', meta: 3, r: { m: 50 } },
  { id: 'd_pinata', n: 'Revienta 1 piñata', stat: 'pinatas', meta: 1, r: { g: 3 } },
  { id: 'd_brill', n: 'Derrota 3 zombis brillantes', stat: 'brill', meta: 3, r: { g: 2 } },
  { id: 'd_mejora', n: 'Mejora 5 plantas en nivel', stat: 'mejoras', meta: 5, r: { m: 60 } },
  { id: 'd_tumba', n: 'Rompe 3 tumbas', stat: 'tumbas', meta: 3, r: { m: 50 } },
];
export function misionesDelDia(dia) { const a = POOL_DIA.slice(), out = []; let s = dia * 2654435761 >>> 0; for (let i = 0; i < 3; i++) { s = (s * 1664525 + 1013904223) >>> 0; out.push(a.splice(s % a.length, 1)[0]); } return out; }
export function misionesMundo(m) {
  const W = MUNDOS[m];
  return [
    { id: `w${m}_a`, n: `${W.n}: completa 6 niveles`, r: { m: 120 }, ok: (c) => c.hechosMundo(m) >= 6, val: (c) => Math.min(6, c.hechosMundo(m)), meta: 6 },
    { id: `w${m}_b`, n: `${W.n}: reúne 24 estrellas`, r: { g: 4 }, ok: (c) => c.estrellasMundo(m) >= 24, val: (c) => Math.min(24, c.estrellasMundo(m)), meta: 24 },
    { id: `w${m}_c`, n: `${W.n}: derrota al jefe`, r: { g: 6 }, ok: (c) => !!c.llave(m), val: (c) => (c.llave(m) ? 1 : 0), meta: 1 },
  ];
}
export const COL_NOMBRES = [
  ['Escarabajo dorado', 'Máscara de arena', 'Ankh de jade', 'Papiro del reloj', 'Jarrón canopo', 'Collar solar', 'Gato de basalto', 'Reloj de arena'],
  ['Brújula torcida', 'Moneda de abordaje', 'Concha parlante', 'Mapa del cangrejo', 'Ancla chica', 'Perla azul', 'Catalejo roto', 'Botella con carta'],
  ['Placa de sheriff', 'Espuela de plata', 'Cartel de búsqueda', 'Pepita de oro', 'Revólver de juguete', 'Sombrero viejo', 'Farol de mina', 'Billete de tren'],
  ['Colmillo glacial', 'Fósil de helecho', 'Copo eterno', 'Piel de mamut', 'Amuleto de nieve', 'Lanza de hueso', 'Carámbano azul', 'Huella de yeti'],
  ['Yelmo abollado', 'Sello real', 'Pergamino de bruma', 'Espuela de plata hueca', 'Escudo de roble', 'Vitral roto', 'Cáliz hueco', 'Anillo del rey'],
  ['Chip de cobre', 'Cristal de datos', 'Engranaje ligero', 'Tarjeta de portal', 'Visor roto', 'Batería eterna', 'Núcleo de plasma', 'Pieza de tiempo'],
  ['Idolo de musgo', 'Pluma de quetzal', 'Máscara de liana', 'Semilla gigante', 'Orquídea azul', 'Tambor tribal', 'Cerbatana', 'Mapa del templo'],
  ['Huevo moteado', 'Diente de rex', 'Ámbar con mosca', 'Garra de raptor', 'Hoja de cícada', 'Hueso tallado', 'Piedra de fuego', 'Pluma de ptero'],
  ['Gafas de láser', 'Disco de vinilo', 'Barra luminosa', 'Casete brillante', 'Altavoz mini', 'Guante de neón', 'Pixel dorado', 'Corona de luz'],
  ['Roca lunar', 'Bandera de cráter', 'Casco rayado', 'Muestra de polvo', 'Antena torcida', 'Huella de bota', 'Cápsula del tiempo', 'Sello del Emperador'],
];
export const colId = (m, k) => `f${m}_${k}`;
export const colNombre = (id) => { const mm = /^f(\d+)_(\d+)$/.exec(id); return mm ? COL_NOMBRES[+mm[1]][+mm[2]] : id; };
export const colCompleta = (col, m) => { for (let k = 0; k < 8; k++) if (!col[colId(m, k)]) return false; return true; };
export const colTotal = (col) => Object.keys(col).length;
void NIV_POR_MUNDO;
