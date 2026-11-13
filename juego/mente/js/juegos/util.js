// Ayudas compartidas por los minijuegos.
// Cursor de teclado/mando sobre una cuadricula de botones: flechas mueven, ok/A pulsa.
export function cursor(btns, cols) {
  const e = { i: -1 };
  const mostrar = () => btns.forEach((b, k) => b.classList.toggle('cur', k === e.i));
  return {
    entrada(a) {
      const n = btns.length;
      if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') {
        if (e.i < 0) e.i = 0;
        else {
          const j = e.i + (a === 'izq' ? -1 : a === 'der' ? 1 : a === 'arriba' ? -cols : cols);
          if (j >= 0 && j < n && !(a === 'izq' && e.i % cols === 0) && !(a === 'der' && e.i % cols === cols - 1)) e.i = j;
        }
        mostrar(); return true;
      }
      if (a === 'ok' || a === 'a') { if (e.i < 0) { e.i = 0; mostrar(); } else if (btns[e.i]) btns[e.i].click(); return true; }
      return false;
    },
    reset() { e.i = -1; mostrar(); }
  };
}
export const SIMBOLOS = ['★', '☀', '☂', '♥', '♦', '♣', '♠', '♪', '✿', '☘', '⚑', '✂', '☎', '⚓', '☾', '✈'];
export const PALABRAS_COMUNES = ['casa', 'mesa', 'pato', 'gato', 'lobo', 'rosa', 'flor', 'mano', 'pelo', 'luna', 'nube', 'lago', 'isla', 'cielo', 'arbol', 'hoja', 'pera', 'uva', 'limon', 'mango', 'melon', 'arroz', 'pan', 'queso', 'leche', 'huevo', 'sopa', 'torta', 'miel', 'sal', 'cafe', 'vaso', 'plato', 'taza', 'silla', 'sofa', 'cama', 'puerta', 'pared', 'techo', 'calle', 'plaza', 'parque', 'puente', 'carro', 'tren', 'barco', 'playa', 'arena', 'roca', 'libro', 'lapiz', 'papel', 'regla', 'carta', 'letra', 'reloj', 'dia', 'noche', 'verano', 'verde', 'azul', 'rojo', 'negro', 'blanco', 'plata', 'cobre', 'vidrio', 'madera', 'tela', 'lana', 'amigo', 'padre', 'madre', 'vecino', 'pintor', 'poeta', 'piloto', 'caballo', 'vaca', 'oveja', 'cabra', 'conejo', 'raton', 'tigre', 'leon', 'oso', 'zorro', 'loro', 'aguila', 'pez', 'ballena', 'tortuga', 'rana', 'hormiga', 'abeja', 'mosca', 'grillo'];
