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



TEMAS.esmeralda = {
  nombre: 'Verde torneo',
  tablero: { tipo: 'liso', claro: 0xeeeed2, oscuro: 0x769656, veta: [0xeeeed2, 0x769656] },
  marco: { tipo: 'liso', base: 0x2f3b27, veta: 0x4c5d3f, letras: '#dfe8c8', brillo: 0.3, mesa: 0x232a1d, mesaVeta: 0x39452f },
  piezas: {
    blancas: { tipo: 'liso', base: 0xfaf6e8, veta: 0xffffff, rugosidad: 0.3, clearcoat: 0.5, metal: 0, emisivo: 0x000000, acento: 0xc8b58a, oscuro: 0x3a3a3a },
    negras: { tipo: 'liso', base: 0x3b3a38, veta: 0x222222, rugosidad: 0.3, clearcoat: 0.5, metal: 0, emisivo: 0x000000, acento: 0xa89a74, oscuro: 0xbfbfbf },
  },
  cielo: { arriba: '#0c120a', horizonte: '#26331c', abajo: '#070a05', luces: 18, paleta: ['#d8f0a8', '#ffffff', '#b5d77a'], paneles: [[0.12, 0.2, 0.2, 0.1, 0.9], [0.6, 0.2, 0.2, 0.1, 0.8]] },
  luz: { color: 0xfff6e0, intensidad: 2.6, relleno: 0xa8d080, entorno: 1.2, exposicion: 1.0 },
  suelo: ['#222b1a', '#0c1008'],
  resalte: { seleccion: '#f6f669', destino: '#2f7bd9', captura: '#e8473b', ultima: '#f6f669', jaque: '#ff2a2a' },
};
TEMAS.hielo = {
  nombre: 'Cristal de hielo',
  tablero: { tipo: 'marmol', claro: 0xe4eef7, oscuro: 0x6f93b5, veta: [0xb6cde0, 0x3f6286] },
  marco: { tipo: 'marmol', base: 0x23384d, veta: 0x8fb4d6, letras: '#dcecf8', brillo: 1, mesa: 0x182838, mesaVeta: 0x5a84aa },
  piezas: {
    blancas: { tipo: 'liso', base: 0xeaf6ff, veta: 0xffffff, rugosidad: 0.05, clearcoat: 1, metal: 0.1, emisivo: 0x1c3a52, acento: 0x9fd2ff, oscuro: 0x2b4560 },
    negras: { tipo: 'liso', base: 0x1b2f45, veta: 0x3d6a95, rugosidad: 0.05, clearcoat: 1, metal: 0.2, emisivo: 0x0a1a2a, acento: 0x9fd2ff, oscuro: 0xa8c8e4 },
  },
  cielo: { arriba: '#050b14', horizonte: '#16314a', abajo: '#03070d', luces: 30, paleta: ['#bfe6ff', '#ffffff', '#7fb8e8'], paneles: [[0.1, 0.2, 0.18, 0.1, 1], [0.6, 0.22, 0.2, 0.1, 0.9], [0.86, 0.3, 0.1, 0.1, 0.6]] },
  luz: { color: 0xe6f4ff, intensidad: 2.8, relleno: 0x79b8f0, entorno: 1.4, exposicion: 1.0 },
  suelo: ['#16314a', '#050b14'],
  resalte: { seleccion: '#ffe066', destino: '#58f0b0', captura: '#ff6a5a', ultima: '#ffe27a', jaque: '#ff2a2a' },
};
TEMAS.oro = {
  nombre: 'Oro y ébano',
  tablero: { tipo: 'marmol', claro: 0xd9c08a, oscuro: 0x2a2118, veta: [0xa88a4a, 0x6a5538] },
  marco: { tipo: 'marmol', base: 0x120d08, veta: 0xc9a050, letras: '#e8cf8a', brillo: 1, mesa: 0x1a130b, mesaVeta: 0x7a5d2a },
  piezas: {
    blancas: { tipo: 'liso', base: 0xf0cf6a, veta: 0xffe9a0, rugosidad: 0.2, clearcoat: 0.8, metal: 0.9, emisivo: 0x000000, acento: 0xffffff, oscuro: 0x4a3a10 },
    negras: { tipo: 'liso', base: 0x2a2623, veta: 0x4a443e, rugosidad: 0.22, clearcoat: 0.8, metal: 0.8, emisivo: 0x000000, acento: 0xd9b45a, oscuro: 0xe0c070 },
  },
  cielo: { arriba: '#0a0704', horizonte: '#2e2010', abajo: '#050302', luces: 24, paleta: ['#ffd27a', '#fff0c8', '#e0a040'], paneles: [[0.12, 0.2, 0.18, 0.12, 0.95], [0.62, 0.22, 0.2, 0.1, 0.85]] },
  luz: { color: 0xffe9b8, intensidad: 3, relleno: 0xd89040, entorno: 1.5, exposicion: 1.0 },
  suelo: ['#2a1d0e', '#0a0704'],
  resalte: { seleccion: '#4ee0ff', destino: '#7dffa8', captura: '#ff5a4a', ultima: '#ffe27a', jaque: '#ff2a2a' },
};
TEMAS.contraste = {
  nombre: 'Alto contraste',
  tablero: { tipo: 'liso', claro: 0xffffff, oscuro: 0x1a1a1a, veta: [0xffffff, 0x1a1a1a] },
  marco: { tipo: 'liso', base: 0x000000, veta: 0x222222, letras: '#ffff00', brillo: 0.1, mesa: 0x000000, mesaVeta: 0x111111 },
  piezas: {
    blancas: { tipo: 'liso', base: 0xffe83a, veta: 0xffffff, rugosidad: 0.5, clearcoat: 0, metal: 0, emisivo: 0x3a3200, acento: 0x000000, oscuro: 0x000000 },
    negras: { tipo: 'liso', base: 0x1ab0ff, veta: 0x0a6fa8, rugosidad: 0.5, clearcoat: 0, metal: 0, emisivo: 0x00203a, acento: 0x000000, oscuro: 0x000000 },
  },
  cielo: { arriba: '#000000', horizonte: '#101010', abajo: '#000000', luces: 0, paleta: ['#ffffff'], paneles: [] },
  luz: { color: 0xffffff, intensidad: 3, relleno: 0xffffff, entorno: 1.6, exposicion: 1.1 },
  suelo: ['#101010', '#000000'],
  resalte: { seleccion: '#ff8a00', destino: '#00e676', captura: '#ff1744', ultima: '#ffd600', jaque: '#ff1744' },
};
export const ORDEN_TEMAS = ['clasico', 'marmol', 'neon', 'esmeralda', 'hielo', 'oro', 'contraste'];

// Juegos de piezas: cambian solo el material de las piezas (el tablero sigue siendo del tema)
export const SETS_3D = {
  tema: { nombre: 'Del tema' },
  madera: { nombre: 'Madera', b: { tipo: 'madera', base: 0xf2dfb4, veta: 0xc79f62, rugosidad: 0.32, clearcoat: 0.7, metal: 0, emisivo: 0, acento: 0xa9783a, oscuro: 0x2a1a0e }, n: { tipo: 'madera', base: 0x3a2112, veta: 0x120803, rugosidad: 0.28, clearcoat: 0.8, metal: 0, emisivo: 0, acento: 0xc29a52, oscuro: 0x8a7556 } },
  marmol: { nombre: 'Mármol', b: { tipo: 'marmol', base: 0xf4f2ee, veta: 0x9a9ca5, rugosidad: 0.16, clearcoat: 1, metal: 0, emisivo: 0, acento: 0xd2b25e, oscuro: 0x3a3a40 }, n: { tipo: 'marmol', base: 0x1b1f22, veta: 0x66737a, rugosidad: 0.14, clearcoat: 1, metal: 0, emisivo: 0, acento: 0xd2b25e, oscuro: 0x9aa0a8 } },
  metal: { nombre: 'Metal', b: { tipo: 'liso', base: 0xdfe3e8, veta: 0xffffff, rugosidad: 0.22, clearcoat: 0.6, metal: 1, emisivo: 0, acento: 0xffffff, oscuro: 0x30343a }, n: { tipo: 'liso', base: 0x2c3036, veta: 0x4a4f57, rugosidad: 0.25, clearcoat: 0.6, metal: 1, emisivo: 0, acento: 0xc0c6ce, oscuro: 0xc8ccd2 } },
  cristal: { nombre: 'Cristal', b: { tipo: 'liso', base: 0xeaf6ff, veta: 0xffffff, rugosidad: 0.04, clearcoat: 1, metal: 0.1, emisivo: 0x1c3a52, acento: 0x9fd2ff, oscuro: 0x2b4560 }, n: { tipo: 'liso', base: 0x1b2f45, veta: 0x3d6a95, rugosidad: 0.04, clearcoat: 1, metal: 0.2, emisivo: 0x0a1a2a, acento: 0x9fd2ff, oscuro: 0xa8c8e4 } },
  neon: { nombre: 'Neón', b: { tipo: 'liso', base: 0x9ef4ff, veta: 0xffffff, rugosidad: 0.12, clearcoat: 1, metal: 0.25, emisivo: 0x12a4c0, acento: 0xffffff, oscuro: 0x003040 }, n: { tipo: 'liso', base: 0xff5ad9, veta: 0xffffff, rugosidad: 0.12, clearcoat: 1, metal: 0.25, emisivo: 0xa8137f, acento: 0xffffff, oscuro: 0x40002c } },
};

// Colores de resalte para daltonismo (azul / naranja se distinguen en todos los tipos)
export const RESALTE_DALTONICO = {
  deuteranopia: { seleccion: '#ffd400', destino: '#1e88ff', captura: '#ff7a00', ultima: '#ffd400', jaque: '#ff7a00' },
  protanopia: { seleccion: '#ffe14d', destino: '#2aa8ff', captura: '#ffa000', ultima: '#ffe14d', jaque: '#ffa000' },
  tritanopia: { seleccion: '#ff4d6d', destino: '#00c2a0', captura: '#ff1744', ultima: '#ff9aa8', jaque: '#ff1744' },
};

// Tema efectivo según juego de piezas y modo daltónico
export function temaEfectivo(id, set3d, daltonico) {
  const base = TEMAS[id] || TEMAS.clasico;
  const t = { ...base };
  const s = SETS_3D[set3d];
  if (s && s.b) t.piezas = { blancas: s.b, negras: s.n };
  if (daltonico && RESALTE_DALTONICO[daltonico]) t.resalte = RESALTE_DALTONICO[daltonico];
  return t;
}
