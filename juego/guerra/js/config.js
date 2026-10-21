// =============================================================
//  AJUSTES GENERALES (cámbialos aquí)
// =============================================================
export const CONFIG = {
  mundo: { tam: 2600, seg: 170, limite: 1150 },
  vista: { fov: 70, lejos: 4200, niebla: 0.0005, pixelRatioMax: 1.75 },
  oleadas: 5,
  audio: { volumen: 0.8, volumenMusica: 0.3 },
  guardado: { clave: 'guerra_partida', opciones: 'guerra_opciones' },
  predeterminado: { avion: 'halcon', mapa: 'costa' },
};

// =============================================================
//  AVIONES DEL JUGADOR
//  vel: objetivo = min + empuje*rango (m/s), tope, pérdida = por debajo de esa velocidad
//  giro: cabeceo, alabeo y guiñada (rad/s) · resp = rapidez de respuesta de los mandos
//  ametra: cd (s entre disparos), dano, disp (dispersión), lado (separación de los cañones)
//  sec: arma secundaria (misil guiado o cohete libre), n = cargas, regen = s por recarga
//  sigilo: <1 = los enemigos te ven de más cerca · desbloqueo: puntaje récord en modo avión
//  ficha: barras del menú (0 a 1)
// =============================================================
export const AVIONES = {
  halcon: {
    nombre: 'HALCÓN', clase: 'Caza ligero', modelo: 'halcon', colores: [0x7a9cc0, 0x56789e],
    desc: 'Ágil y equilibrado. Ametralladoras, 6 misiles y 4 bombas.',
    vel: { min: 52, rango: 100, tope: 200, perdida: 60, grav: 30 },
    giro: { cab: 1.2, ala: 2.7, gui: 0.6, resp: 7 },
    vida: 100, radio: 4.2, cam: { d: 15.5, h: 3.8 },
    ametra: { cd: 0.065, dano: 8, disp: 0.014, lado: 1.7 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 6, regen: 14, cd: 0.9 },
    bombas: 4, sigilo: 1, desbloqueo: 0,
    ficha: { vel: 0.6, agil: 0.7, vida: 0.4, fuego: 0.55 },
  },
  biplano: {
    nombre: 'CÓNDOR', clase: 'Biplano clásico', modelo: 'biplano', colores: [0xd9b24a, 0xc0392b],
    desc: 'Lento pero muy maniobrable. Dos ametralladoras y bombas ligeras.',
    vel: { min: 38, rango: 62, tope: 130, perdida: 38, grav: 22 },
    giro: { cab: 1.55, ala: 3.3, gui: 0.8, resp: 8.5 },
    vida: 90, radio: 4.4, cam: { d: 14, h: 3.4 },
    ametra: { cd: 0.08, dano: 7, disp: 0.02, lado: 1.1 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 0, regen: 0, cd: 1 },
    bombas: 5, sigilo: 1, desbloqueo: 0,
    ficha: { vel: 0.2, agil: 1, vida: 0.35, fuego: 0.35 },
  },
  tormenta: {
    nombre: 'TORMENTA', clase: 'Ataque a tierra', modelo: 'tormenta', colores: [0x6b7a52, 0x4f5c3d],
    desc: 'Cañón potente y 14 cohetes. Resistente, ideal contra blancos en tierra.',
    vel: { min: 44, rango: 82, tope: 160, perdida: 50, grav: 26 },
    giro: { cab: 0.95, ala: 2.1, gui: 0.5, resp: 6 },
    vida: 160, radio: 4.8, cam: { d: 16.5, h: 4 },
    ametra: { cd: 0.11, dano: 17, disp: 0.011, lado: 0 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 14, regen: 9, cd: 0.28 },
    bombas: 4, sigilo: 1, desbloqueo: 0,
    ficha: { vel: 0.35, agil: 0.45, vida: 0.7, fuego: 0.85 },
  },
  saeta: {
    nombre: 'SAETA', clase: 'Interceptor', modelo: 'saeta', colores: [0xcfd6de, 0xb23a48],
    desc: 'Muy veloz, 10 misiles y cañones rápidos. Gira abierto y es frágil.',
    vel: { min: 70, rango: 125, tope: 250, perdida: 74, grav: 34 },
    giro: { cab: 0.95, ala: 2.3, gui: 0.5, resp: 6.5 },
    vida: 75, radio: 4, cam: { d: 17, h: 3.9 },
    ametra: { cd: 0.05, dano: 6, disp: 0.013, lado: 1.2 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 10, regen: 9, cd: 0.55 },
    bombas: 0, sigilo: 1, desbloqueo: 1000,
    ficha: { vel: 1, agil: 0.5, vida: 0.3, fuego: 0.7 },
  },
  mastodonte: {
    nombre: 'MASTODONTE', clase: 'Caza pesado', modelo: 'mastodonte', colores: [0x8a8f98, 0x62666e],
    desc: 'Enorme y duro: 14 bombas, mucha vida. Lento de reflejos.',
    vel: { min: 42, rango: 78, tope: 150, perdida: 50, grav: 24 },
    giro: { cab: 0.8, ala: 1.7, gui: 0.4, resp: 5 },
    vida: 240, radio: 6.2, cam: { d: 20, h: 5 },
    ametra: { cd: 0.09, dano: 9, disp: 0.018, lado: 2.6 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 3, regen: 18, cd: 1.1 },
    bombas: 14, sigilo: 1, desbloqueo: 2000,
    ficha: { vel: 0.3, agil: 0.25, vida: 1, fuego: 0.8 },
  },
  espectro: {
    nombre: 'ESPECTRO', clase: 'Caza furtivo', modelo: 'espectro', colores: [0x2b2f38, 0x1d2027],
    desc: 'Casi invisible: los enemigos te detectan de más cerca. 5 misiles.',
    vel: { min: 56, rango: 104, tope: 210, perdida: 62, grav: 30 },
    giro: { cab: 1.1, ala: 2.5, gui: 0.55, resp: 7 },
    vida: 90, radio: 4.2, cam: { d: 15.5, h: 3.8 },
    ametra: { cd: 0.07, dano: 8, disp: 0.012, lado: 1.4 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 5, regen: 12, cd: 0.9 },
    bombas: 3, sigilo: 0.55, desbloqueo: 3500,
    ficha: { vel: 0.7, agil: 0.65, vida: 0.38, fuego: 0.55 },
  },
};
export const ORDEN_AVIONES = ['halcon', 'biplano', 'tormenta', 'saeta', 'mastodonte', 'espectro'];

// =============================================================
//  ENEMIGOS AÉREOS (variantes). Factores sobre el caza base de la oleada.
// =============================================================
export const ENEMIGOS_AIRE = {
  caza: { modelo: 'halcon', colores: [0xc0604c, 0x8c3a2e], vida: 1, vel: 1, giro: 1, puntos: 1, radio: 4.2, desde: 1, misil: 3, disp: 1, dano: 1 },
  helice: { modelo: 'biplano', colores: [0xb98a3a, 0x8a3a2a], vida: 0.7, vel: 0.7, giro: 1.35, puntos: 0.8, radio: 4.2, desde: 1, misil: 99, disp: 1.5, dano: 0.9 },
  veloz: { modelo: 'saeta', colores: [0x9a4a66, 0x5e2a44], vida: 0.8, vel: 1.25, giro: 0.85, puntos: 1.3, radio: 4, desde: 2, misil: 2, disp: 1, dano: 1 },
  pesado: { modelo: 'mastodonte', colores: [0x6c5c5c, 0x4a3a3a], vida: 2.5, vel: 0.72, giro: 0.62, puntos: 2, radio: 6.2, desde: 3, misil: 4, disp: 1.3, dano: 1.4 },
};

// =============================================================
//  MAPAS. Todo sale de aquí y del generador de mapas.js (semilla fija por mapa).
//  relieve: tipo de terreno · agua: null = sin mar · estruc: qué se construye
//  aire / tanques: pesos de enemigos · objetivos: blancos en tierra
//  inicio: dónde arranca el avión · luz: hemisferio y sol
// =============================================================
export const MAPAS = {
  costa: {
    nombre: 'COSTA E ISLAS', desc: 'Colinas verdes, playas y pueblos junto al mar.',
    semilla: 20240611, relieve: 'colinas', rel: { escala: 0.0009, base: 0.46, amp: 190, borde: 'mar' },
    agua: { color: '#2f8cc0', op: 0.88 },
    paleta: { arena: 0xd9c88f, pasto1: 0x3d7a38, pasto2: 0x76a64a, roca: 0x857d70, nieve: 0xf0f4f7, fondo: 0x2f6670, asfalto: 0x7d8082, rocaDesde: 40, nieveDesde: 78 },
    cielo: { horizonte: 0xc7dbed, cenit: 0x2961c7, sol: [0.55, 0.5, -0.65], colorSol: 0xffdb8c, estrellas: 0, nubes: { n: 38, alt: 320, var: 220, op: 0.85, color: 0xffffff } },
    niebla: 0.0005,
    luz: { cielo: 0xdcebff, suelo: 0x7a8a60, hemi: 2.1, sol: 0xfff0d2, solInt: 2.4 },
    estruc: { zonas: { ciudad: 3, base: 3 }, arboles: 'pino', nArb: 1700, rocas: 'granito', luces: false, casas: { alto: 46, min: 9, tono: 0.08 } },
    aire: { caza: 3, helice: 1, veloz: 1, pesado: 1 }, tanques: { ligero: 0.45, medio: 0.35, pesado: 0.2 },
    objetivos: ['deposito', 'camion', 'radar'], inicio: { x: 0, y: 170, z: 260 },
  },
  desierto: {
    nombre: 'DESIERTO', desc: 'Dunas, mesas rojas y cañones estrechos. Sin agua.',
    semilla: 7731, relieve: 'desierto', rel: {}, agua: null,
    paleta: { arena: 0xe0b878, pasto1: 0xd6a55c, pasto2: 0xeac98a, roca: 0xa4553a, nieve: 0xe8c58e, fondo: 0xb88850, asfalto: 0x6f6a64, rocaDesde: 34, nieveDesde: 999 },
    cielo: { horizonte: 0xf0dcb4, cenit: 0x3f86c4, sol: [0.35, 0.62, -0.55], colorSol: 0xfff0b0, estrellas: 0, nubes: { n: 12, alt: 420, var: 200, op: 0.55, color: 0xfff4e0 } },
    niebla: 0.00055,
    luz: { cielo: 0xffeed0, suelo: 0xb08a58, hemi: 2.2, sol: 0xfff0cc, solInt: 2.7 },
    estruc: { zonas: { ciudad: 3, base: 3 }, arboles: 'cactus', nArb: 520, rocas: 'arenisca', luces: false, casas: { alto: 16, min: 5, tono: 0.095 } },
    aire: { helice: 3, caza: 2, veloz: 1, pesado: 1 }, tanques: { ligero: 0.55, medio: 0.35, pesado: 0.1 },
    objetivos: ['deposito', 'camion', 'deposito', 'radar'], inicio: { x: 0, y: 170, z: 260 },
  },
  nieve: {
    nombre: 'MONTAÑAS NEVADAS', desc: 'Picos altos, valles helados y nubes bajas.',
    semilla: 90417, relieve: 'picos', rel: {}, agua: { color: '#a8cbe0', op: 0.96 },
    paleta: { arena: 0xdde6ea, pasto1: 0xc9d6d4, pasto2: 0xe4ecee, roca: 0x7d8288, nieve: 0xffffff, fondo: 0x8fb4c8, asfalto: 0x80858a, rocaDesde: 110, nieveDesde: 30 },
    cielo: { horizonte: 0xd6e2ee, cenit: 0x587fb4, sol: [0.45, 0.4, -0.7], colorSol: 0xfff4e0, estrellas: 0, nubes: { n: 46, alt: 190, var: 150, op: 0.7, color: 0xf2f7ff } },
    niebla: 0.00085,
    luz: { cielo: 0xe4efff, suelo: 0x8f9aa8, hemi: 2.1, sol: 0xfff6e6, solInt: 2.2 },
    estruc: { zonas: { ciudad: 2, base: 3 }, arboles: 'pinoNieve', nArb: 1500, rocas: 'granito', luces: false, casas: { alto: 14, min: 6, tono: 0.58 } },
    aire: { caza: 3, veloz: 2, helice: 0, pesado: 1 }, tanques: { ligero: 0.3, medio: 0.4, pesado: 0.3 },
    objetivos: ['radar', 'deposito', 'camion', 'radar'], inicio: { x: 0, y: 270, z: 240 },
  },
  ciudad: {
    nombre: 'METRÓPOLI', desc: 'Rascacielos, avenidas y plazas militares junto a la bahía.',
    semilla: 5150, relieve: 'ciudad', rel: {}, agua: { color: '#3a7fa8', op: 0.9 },
    paleta: { arena: 0xb9b3a0, pasto1: 0x6e7a62, pasto2: 0x8a9478, roca: 0x77777a, nieve: 0xf0f4f7, fondo: 0x2a566a, asfalto: 0x6a6d70, rocaDesde: 60, nieveDesde: 999 },
    cielo: { horizonte: 0xcfdbe6, cenit: 0x3b6cae, sol: [0.5, 0.55, -0.6], colorSol: 0xffe2a0, estrellas: 0, nubes: { n: 26, alt: 360, var: 200, op: 0.7, color: 0xffffff } },
    niebla: 0.0006,
    luz: { cielo: 0xe2ecfa, suelo: 0x6a6c70, hemi: 2.1, sol: 0xfff0d8, solInt: 2.3 },
    estruc: { zonas: { ciudad: 0, base: 4 }, arboles: 'ninguno', nArb: 0, rocas: 'ninguno', luces: false, casas: { alto: 40, min: 20, tono: 0.06 } },
    aire: { caza: 2, veloz: 2, pesado: 1, helice: 0 }, tanques: { ligero: 0.35, medio: 0.45, pesado: 0.2 },
    objetivos: ['camion', 'deposito', 'radar', 'camion'], inicio: { x: 0, y: 260, z: 330 },
  },
  archipielago: {
    nombre: 'ARCHIPIÉLAGO', desc: 'Islas tropicales, patrulleras y portaaviones en alta mar.',
    semilla: 31415, relieve: 'archipielago', rel: {}, agua: { color: '#1f9bc4', op: 0.86 },
    paleta: { arena: 0xeadca0, pasto1: 0x2f8a46, pasto2: 0x6cb050, roca: 0x7c7468, nieve: 0xf0f4f7, fondo: 0x1c7f96, asfalto: 0x777a7c, rocaDesde: 46, nieveDesde: 999 },
    cielo: { horizonte: 0xbfe6f2, cenit: 0x1f78c8, sol: [0.4, 0.55, -0.7], colorSol: 0xffe9a8, estrellas: 0, nubes: { n: 34, alt: 330, var: 200, op: 0.8, color: 0xffffff } },
    niebla: 0.00048,
    luz: { cielo: 0xd8f0ff, suelo: 0x6f9a6a, hemi: 2.2, sol: 0xfff3d4, solInt: 2.4 },
    estruc: { zonas: { ciudad: 2, base: 3 }, arboles: 'palma', nArb: 1100, rocas: 'granito', luces: false, casas: { alto: 30, min: 8, tono: 0.1 }, portaaviones: 2 },
    aire: { caza: 2, helice: 1, pesado: 2, veloz: 1 }, tanques: { ligero: 0.45, medio: 0.4, pesado: 0.15 },
    objetivos: ['barco', 'deposito', 'camion', 'barco', 'radar'], inicio: { x: 0, y: 190, z: 280 },
  },
  ocaso: {
    nombre: 'VALLE AL OCASO', desc: 'Atardecer púrpura con estrellas, luces de pistas y ventanas.',
    semilla: 60221, relieve: 'colinas', rel: { escala: 0.0008, base: 0.42, amp: 150, borde: 'montanas' },
    agua: { color: '#2a3f62', op: 0.9 },
    paleta: { arena: 0x6d6254, pasto1: 0x2a4a3a, pasto2: 0x4b6a48, roca: 0x4c4753, nieve: 0xb8bfd8, fondo: 0x18283e, asfalto: 0x45484e, rocaDesde: 36, nieveDesde: 85 },
    cielo: { horizonte: 0xe0845c, cenit: 0x1d1a4a, sol: [0.85, 0.07, -0.5], colorSol: 0xffa060, estrellas: 380, nubes: { n: 30, alt: 300, var: 200, op: 0.6, color: 0xff9a7a } },
    niebla: 0.00062,
    luz: { cielo: 0x8a78c8, suelo: 0x3a2f44, hemi: 1.5, sol: 0xff9a5a, solInt: 2.3 },
    estruc: { zonas: { ciudad: 3, base: 3 }, arboles: 'pino', nArb: 1500, rocas: 'granito', luces: true, casas: { alto: 40, min: 9, tono: 0.07 } },
    aire: { caza: 3, veloz: 2, helice: 1, pesado: 1 }, tanques: { ligero: 0.4, medio: 0.4, pesado: 0.2 },
    objetivos: ['deposito', 'camion', 'radar', 'deposito'], inicio: { x: 0, y: 190, z: 260 },
  },
};
export const ORDEN_MAPAS = ['costa', 'desierto', 'nieve', 'ciudad', 'archipielago', 'ocaso'];
for (const k in MAPAS) MAPAS[k].id = k;
