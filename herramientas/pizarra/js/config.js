// Constantes compartidas (sin DOM: se usan tambien en las pruebas de Node).
export const MARCO = { w: 1600, h: 900 };
export const COLORES = ['tinta', '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e', '#ffffff'];
export const NOMBRES_COLOR = { tinta: 'Tinta (negro o blanco)', '#6b7280': 'Gris', '#ef4444': 'Rojo', '#f97316': 'Naranja', '#eab308': 'Amarillo', '#22c55e': 'Verde', '#14b8a6': 'Turquesa', '#3b82f6': 'Azul', '#8b5cf6': 'Violeta', '#ec4899': 'Rosa', '#92400e': 'Marrón', '#ffffff': 'Blanco' };
export const COLORES_NOTA = ['#fff176', '#f8bbd0', '#c5e1a5', '#90caf9', '#ffcc80', '#ce93d8', '#80deea', '#ffffff'];
export const GROSORES = [2, 4, 8, 14, 24];
export const FONDOS = [['blanco', 'Blanco'], ['cuadriculado', 'Cuadriculado'], ['lineas', 'Líneas'], ['puntos', 'Puntos'], ['oscuro', 'Oscuro']];
export const CAPAS_BASE = [['c0', 'Fondo', 0], ['c1', 'Contenido', 1], ['c2', 'Anotaciones', 2]];
export const FORMAS = [['rect', 'Rectángulo'], ['elipse', 'Elipse'], ['linea', 'Línea'], ['flecha', 'Flecha'], ['tri', 'Triángulo'], ['rombo', 'Rombo'], ['pent', 'Pentágono'], ['hexa', 'Hexágono'], ['estrella', 'Estrella']];
export const FUENTE = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const MAX_MSG = 11000;   // bytes por mensaje de red (el limite de Red es 16 KB)
export const PAPELERA_DIAS = 30;
export const VOTOS_MAX = 5;
export const REL_TINTA = { claro: '#111827', oscuro: '#f9fafb' };
export const esFondoOscuro = f => f === 'oscuro';
