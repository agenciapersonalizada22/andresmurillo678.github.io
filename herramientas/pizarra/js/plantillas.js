// Plantillas: generan objetos en la pagina indicada (marco de 1600x900).
import { nuevoId } from './modelo.js';
import { COLORES_NOTA } from './config.js';

function ctor(doc, pg) {
  const base = doc.reloj + 1; let n = 0; const lista = [];
  const mk = (tipo, p, cap = 'c1') => { const id = nuevoId(10); lista.push({ k: 'o', id, p: { tipo, pg, del: false, x: 0, y: 0, w: 100, h: 100, rot: 0, z: base + n++, cap, ...p } }); return id; };
  return {
    lista,
    nota: (x, y, texto, color, w = 200, h = 150, extra = {}) => mk('nota', { x, y, w, h, texto, color, fs: 26, ...extra }),
    texto: (x, y, texto, fs = 28, w = 400, extra = {}) => mk('texto', { x, y, w, h: fs * 1.25 + 10, texto, fs, color: 'tinta', ...extra }),
    caja: (x, y, w, h, relleno, extra = {}) => mk('forma', { fm: 'rect', x, y, w, h, relleno, color: '#9ca3af', grosor: 2, rad: 12, ...extra }, 'c0'),
    linea: (x1, y1, x2, y2, fm = 'linea', grosor = 3, color = '#6b7280') => mk('forma', { fm, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(1, Math.abs(x2 - x1)), h: Math.max(1, Math.abs(y2 - y1)), p1: [x1 <= x2 ? 0 : 1, y1 <= y2 ? 0 : 1], p2: [x1 <= x2 ? 1 : 0, y1 <= y2 ? 1 : 0], grosor, color }, 'c0'),
    forma: (fm, x, y, w, h, extra = {}) => mk('forma', { fm, x, y, w, h, color: '#3b82f6', grosor: 3, ...extra }),
    conector: (ea, eb, extra = {}) => mk('conector', { ea, eb, pa: [0, 0], pb: [0, 0], flecha: false, color: '#6b7280', grosor: 3, ...extra })
  };
}
const aplicar = (doc, b) => { doc.agrupar(() => doc.cambiar(b.lista)); return b.lista.map(c => c.id); };

export const plantillas = [
  { id: 'lluvia', nombre: 'Lluvia de ideas', crear(doc, pg) {
    const b = ctor(doc, pg);
    b.texto(40, 30, 'Lluvia de ideas', 44, 700, { neg: true });
    b.nota(620, 330, '¿Cuál es la pregunta?', '#ffffff', 360, 200, { fs: 34 });
    const pos = [[160, 170], [420, 120], [1040, 170], [1240, 330], [1180, 620], [330, 650], [660, 660], [100, 420]];
    pos.forEach(([x, y], i) => b.nota(x, y, '', COLORES_NOTA[i % 6]));
    return aplicar(doc, b);
  } },
  { id: 'kanban', nombre: 'Kanban', crear(doc, pg) {
    const b = ctor(doc, pg), cols = [['Por hacer', '#fee2e2'], ['En curso', '#fef3c7'], ['Hecho', '#dcfce7']];
    cols.forEach(([t, c], i) => { const x = 60 + i * 510; b.caja(x, 60, 480, 780, c); b.texto(x + 20, 76, t, 34, 440, { neg: true }); });
    b.nota(90, 160, 'Tarea 1', '#fff176'); b.nota(90, 330, 'Tarea 2', '#90caf9'); b.nota(600, 160, 'Tarea 3', '#f8bbd0');
    return aplicar(doc, b);
  } },
  { id: 'mapa', nombre: 'Mapa mental', crear(doc, pg) {
    const b = ctor(doc, pg), c = b.nota(660, 360, 'Tema central', '#fff176', 280, 180, { fs: 34 });
    const hijos = [[160, 100], [660, 40], [1160, 100], [1200, 640], [660, 720], [120, 640]], ids = [];
    hijos.forEach(([x, y], i) => ids.push(b.nota(x, y, 'Idea ' + (i + 1), COLORES_NOTA[(i + 1) % 7], 240, 130, { fs: 28 })));
    ids.forEach(id => b.conector(c, id));
    return aplicar(doc, b);
  } },
  { id: 'matriz', nombre: 'Matriz 2x2', crear(doc, pg) {
    const b = ctor(doc, pg);
    b.linea(800, 70, 800, 850, 'linea', 4, '#374151'); b.linea(120, 460, 1480, 460, 'linea', 4, '#374151');
    b.texto(640, 14, 'Importancia alta', 26, 320, { al: 'center', neg: true }); b.texto(640, 862, 'Importancia baja', 26, 320, { al: 'center', neg: true });
    b.texto(8, 440, 'Esfuerzo bajo', 24, 150, { neg: true }); b.texto(1470, 440, 'Esfuerzo alto', 24, 130, { neg: true });
    [['Hacer ya', 200, 110, '#dcfce7'], ['Planificar', 900, 110, '#dbeafe'], ['Delegar', 200, 520, '#fef3c7'], ['Descartar', 900, 520, '#fee2e2']].forEach(([t, x, y, c]) => { b.caja(x - 60, y - 30, 560, 330, c, { grosor: 1 }); b.texto(x - 40, y - 14, t, 30, 400, { neg: true }); });
    return aplicar(doc, b);
  } },
  { id: 'linea', nombre: 'Línea de tiempo', crear(doc, pg) {
    const b = ctor(doc, pg);
    b.texto(40, 30, 'Línea de tiempo', 44, 700, { neg: true });
    b.linea(80, 450, 1520, 450, 'flecha', 6, '#374151');
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 290, arriba = i % 2 === 0;
      b.forma('elipse', x - 14, 436, 28, 28, { relleno: '#3b82f6', color: '#1d4ed8', grosor: 3 });
      b.texto(x - 80, arriba ? 480 : 380, 'Fecha ' + (i + 1), 24, 160, { al: 'center', neg: true });
      b.nota(x - 110, arriba ? 540 : 170, 'Hito ' + (i + 1), COLORES_NOTA[i], 220, 150, { fs: 26 });
    }
    return aplicar(doc, b);
  } }
];
