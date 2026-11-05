// Iconos SVG en linea (trazo de 2 px, 24x24).
const D = {
  pluma: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  resaltador: 'M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4',
  borrador: 'M20 20H8L3.5 15.5a1.5 1.5 0 010-2.1l9.9-9.9a1.5 1.5 0 012.1 0l5 5a1.5 1.5 0 010 2.1L12 20M7 11l6 6',
  sel: 'M5 3l14 8-6 2-2 6z',
  mano: 'M18 11V6a2 2 0 00-4 0M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8M18 8a2 2 0 014 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 013-2.8L8 15',
  texto: 'M5 7V4h14v3M9 20h6M12 4v16',
  nota: 'M4 4h16v11l-5 5H4zM15 20v-5h5',
  forma: 'M3 12a6 6 0 1012 0 6 6 0 00-12 0M13 13h8v8h-8z',
  conector: 'M5 19a2 2 0 100-4 2 2 0 000 4zM19 9a2 2 0 100-4 2 2 0 000 4zM6.5 15.5l11-5',
  laser: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2M12 9a3 3 0 100 6 3 3 0 000-6z',
  comentario: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  votos: 'M7 22V11M2 13v7a2 2 0 002 2h13.4a2 2 0 002-1.7l1.4-9a2 2 0 00-2-2.3H14V6a3 3 0 00-3-3l-4 8',
  imagen: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01',
  regla: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  undo: 'M3 7v6h6M3 13a9 9 0 109-9 9 9 0 00-6.7 3',
  redo: 'M21 7v6h-6M21 13a9 9 0 11-9-9 9 9 0 016.7 3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  mas: 'M12 5v14M5 12h14', menos: 'M5 12h14',
  pag: 'M6 2h9l5 5v15H6zM14 2v6h6',
  izq: 'M15 18l-6-6 6-6', der: 'M9 18l6-6-6-6', arriba: 'M18 15l-6-6-6 6', abajo: 'M6 9l6 6 6-6',
  timer: 'M12 22a9 9 0 100-18 9 9 0 000 18zM12 8v5l3 2M9 2h6',
  usuarios: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  bajar: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  ajustes: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  papelera: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  presentar: 'M5 3l14 9-14 9z',
  capas: 'M12 2l10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5',
  fondo: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  plantilla: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  historial: 'M3 12a9 9 0 109-9 9 9 0 00-6.7 3L3 8M3 3v5h5M12 7v5l4 2',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 118 0v4',
  ayuda: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01',
  ojo: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  frente: 'M8 8h12v12H8zM4 16V4h12',
  atras: 'M4 4h12v12H4zM8 20h12V8',
  pantalla: 'M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3',
  recortar: 'M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14',
  cerrar: 'M18 6L6 18M6 6l12 12',
  tablero: 'M3 4h18v13H3zM8 21h8M12 17v4',
  carpeta: 'M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  alIzq: 'M4 3v18M8 7h12M8 14h8', alCx: 'M12 3v18M5 7h14M8 14h8', alDer: 'M20 3v18M4 7h12M8 14h8',
  alArr: 'M3 4h18M7 8v12M14 8v8', alCy: 'M3 12h18M7 5v14M14 8v8', alAba: 'M3 20h18M7 4v12M14 8v8',
  disH: 'M4 4v16M20 4v16M10 8v8M14 8v8', disV: 'M4 4h16M4 20h16M8 10h8M8 14h8'
};
export function ic(n, tam = 22) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', D[n] || D.mas); s.appendChild(p);
  return s;
}
