// =============================================================
//  🎭  TEMAS
//  Colores y materiales del tablero, el marco, las piezas y el cielo.
//  Para crear un tema nuevo copia uno y cambia los colores.
//  Los colores son números 0xRRGGBB; el cielo usa texto "#rrggbb".
// =============================================================
export const TEMAS = {
  clasico: {
    nombre: 'Madera clásica',
    tablero: { tipo: 'madera', claro: 0xe6c88e, oscuro: 0x8d5a30, veta: [0xb98a55, 0x4a2a14] },
    marco: { tipo: 'madera', base: 0x5a3219, veta: 0x2a1408, letras: '#e8cfa0', brillo: 0.35, mesa: 0x3b2212, mesaVeta: 0x1c0e05 },
    piezas: {
      blancas: { tipo: 'madera', base: 0xf2dfb4, veta: 0xc79f62, rugosidad: 0.32, clearcoat: 0.7, metal: 0, emisivo: 0x000000, acento: 0xa9783a, oscuro: 0x2a1a0e },
      negras: { tipo: 'madera', base: 0x3a2112, veta: 0x120803, rugosidad: 0.28, clearcoat: 0.8, metal: 0, emisivo: 0x000000, acento: 0xc29a52, oscuro: 0x8a7556 },
    },
    cielo: {
      arriba: '#0b0705', horizonte: '#2a1a10', abajo: '#070403', luces: 26, paleta: ['#ffb35c', '#ff8a3d', '#ffd9a0', '#c46a2a'],
      paneles: [[0.12, 0.2, 0.18, 0.12, 0.95], [0.62, 0.22, 0.2, 0.1, 0.85], [0.87, 0.3, 0.1, 0.1, 0.6]],
    },
    luz: { color: 0xffe2b8, intensidad: 2.6, relleno: 0xff9c52, entorno: 1.1, exposicion: 1.0 },
    suelo: ['#2b1a0e', '#120a05'],
    resalte: { seleccion: '#ffd45c', destino: '#7dffa8', captura: '#ff5a4a', ultima: '#ffe27a', jaque: '#ff2a2a' },
  },
  marmol: {
    nombre: 'Mármol',
    tablero: { tipo: 'marmol', claro: 0xeceae6, oscuro: 0x37453f, veta: [0x9a9aa0, 0x6f827a] },
    marco: { tipo: 'marmol', base: 0x1b1d22, veta: 0x6e6f78, letras: '#d9d4c6', brillo: 0.9, mesa: 0x24262c, mesaVeta: 0x6a6c75 },
    piezas: {
      blancas: { tipo: 'marmol', base: 0xf4f2ee, veta: 0x9a9ca5, rugosidad: 0.16, clearcoat: 1, metal: 0, emisivo: 0x000000, acento: 0xd2b25e, oscuro: 0x3a3a40 },
      negras: { tipo: 'marmol', base: 0x1b1f22, veta: 0x66737a, rugosidad: 0.14, clearcoat: 1, metal: 0, emisivo: 0x000000, acento: 0xd2b25e, oscuro: 0x9aa0a8 },
    },
    cielo: {
      arriba: '#06080d', horizonte: '#1a212b', abajo: '#04060a', luces: 22, paleta: ['#9cc4ff', '#d0e4ff', '#ffffff', '#7ea4d8'],
      paneles: [[0.1, 0.18, 0.2, 0.12, 1], [0.58, 0.2, 0.22, 0.1, 0.95], [0.85, 0.28, 0.12, 0.12, 0.7]],
    },
    luz: { color: 0xf0f4ff, intensidad: 2.8, relleno: 0x8aa8ff, entorno: 1.25, exposicion: 1.0 },
    suelo: ['#1a1f27', '#0a0d12'],
    resalte: { seleccion: '#4ee0ff', destino: '#6bffb0', captura: '#ff5a5a', ultima: '#ffe066', jaque: '#ff2a2a' },
  },
  neon: {
    nombre: 'Neón',
    tablero: { tipo: 'neon', claro: 0x1b1a52, oscuro: 0x0a0b2a, veta: [0, 0] },
    marco: { tipo: 'madera', base: 0x10112e, veta: 0x2a2a6a, letras: '#3df5ff', brillo: 0.95, mesa: 0x0b0c22, mesaVeta: 0x2b2a78 },
    piezas: {
      blancas: { tipo: 'liso', base: 0x9ef4ff, veta: 0xffffff, rugosidad: 0.12, clearcoat: 1, metal: 0.25, emisivo: 0x12a4c0, acento: 0xffffff, oscuro: 0x003040 },
      negras: { tipo: 'liso', base: 0xff5ad9, veta: 0xffffff, rugosidad: 0.12, clearcoat: 1, metal: 0.25, emisivo: 0xa8137f, acento: 0xffffff, oscuro: 0x40002c },
    },
    cielo: {
      arriba: '#05030f', horizonte: '#1a0f40', abajo: '#03020a', luces: 40, paleta: ['#3df5ff', '#ff4fd8', '#9a8cff', '#7dd957'],
      paneles: [[0.15, 0.2, 0.16, 0.08, 0.7], [0.6, 0.22, 0.2, 0.08, 0.9], [0.88, 0.3, 0.1, 0.1, 0.5]],
    },
    luz: { color: 0xc8b8ff, intensidad: 2.0, relleno: 0xff4fd8, entorno: 1.4, exposicion: 1.05 },
    suelo: ['#1a0f40', '#05030f'],
    resalte: { seleccion: '#3df5ff', destino: '#7dd957', captura: '#ff4fd8', ultima: '#ffe14d', jaque: '#ff2a2a' },
  },
};

export const ORDEN_TEMAS = ['clasico', 'marmol', 'neon'];
