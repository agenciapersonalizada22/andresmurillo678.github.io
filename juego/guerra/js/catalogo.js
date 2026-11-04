// =============================================================
//  CATÁLOGO: aviones nuevos, tanques, pinturas, misiones y logros.
//  Los 6 aviones originales siguen en config.js (se les añade rol y precio abajo).
//  rango = nivel de piloto necesario · costo = créditos · rol: caza, interceptor,
//  ataque, bombardero, helice, jet, heli
// =============================================================
const av = (o) => o;

export const AVIONES_EXTRA = {
  furia: av({
    nombre: 'FURIA', clase: 'Caza de hélice WWII', rol: 'helice', modelo: 'monoplano', mp: { motores: 1, burbuja: 1 }, colores: [0x8a97a6, 0x5b6b3c],
    desc: 'Mustang clásico: rápido para ser de hélice, 6 cohetes y 2 bombas ligeras.',
    vel: { min: 44, rango: 78, tope: 150, perdida: 44, grav: 26 }, giro: { cab: 1.3, ala: 3.0, gui: 0.7, resp: 7.5 },
    vida: 95, radio: 4.3, cam: { d: 14.5, h: 3.6 }, ametra: { cd: 0.06, dano: 7, disp: 0.018, lado: 2.4 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 6, regen: 16, cd: 0.4 }, bombas: 2, bombaTipo: 'L', sigilo: 1, desbloqueo: 0, rango: 2, costo: 700,
    ficha: { vel: 0.4, agil: 0.85, vida: 0.38, fuego: 0.45 },
  }),
  fenix: av({
    nombre: 'FÉNIX', clase: 'Caza naval de hélice', rol: 'helice', modelo: 'monoplano', mp: { motores: 1, alaGaviota: 1, ancho: 1.08 }, colores: [0x2f4f7a, 0xd9d4c0],
    desc: 'Ala de gaviota, muy ágil a baja velocidad. 4 cohetes y 2 bombas.',
    vel: { min: 42, rango: 70, tope: 140, perdida: 42, grav: 24 }, giro: { cab: 1.45, ala: 3.1, gui: 0.75, resp: 8 },
    vida: 110, radio: 4.4, cam: { d: 14.5, h: 3.6 }, ametra: { cd: 0.07, dano: 9, disp: 0.018, lado: 2 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 4, regen: 14, cd: 0.4 }, bombas: 2, bombaTipo: 'L', sigilo: 1, desbloqueo: 0, rango: 4, costo: 1500,
    ficha: { vel: 0.35, agil: 0.9, vida: 0.45, fuego: 0.5 },
  }),
  tempestad: av({
    nombre: 'TEMPESTAD', clase: 'Caza pesado de hélice', rol: 'helice', modelo: 'monoplano', mp: { motores: 1, robusto: 1, ancho: 1.2 }, colores: [0x7b7f6a, 0x4a4d3a],
    desc: 'Robusto y de gran potencia: 8 ametralladoras, 10 cohetes y 3 bombas.',
    vel: { min: 48, rango: 74, tope: 160, perdida: 50, grav: 28 }, giro: { cab: 1.0, ala: 2.2, gui: 0.5, resp: 6 },
    vida: 150, radio: 4.9, cam: { d: 16, h: 4 }, ametra: { cd: 0.05, dano: 8, disp: 0.02, lado: 3 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 10, regen: 10, cd: 0.3 }, bombas: 3, bombaTipo: 'M', sigilo: 1, desbloqueo: 0, rango: 5, costo: 2200,
    ficha: { vel: 0.5, agil: 0.5, vida: 0.6, fuego: 0.8 },
  }),
  centella: av({
    nombre: 'CENTELLA', clase: 'Caza a reacción', rol: 'jet', modelo: 'jetGemelo', mp: { colas: 2 }, colores: [0x9aa6b4, 0x3b4658],
    desc: 'Dos turbinas y doble deriva. Equilibrado: 6 misiles y 4 bombas.',
    vel: { min: 60, rango: 108, tope: 220, perdida: 64, grav: 32 }, giro: { cab: 1.15, ala: 2.6, gui: 0.55, resp: 7 },
    vida: 100, radio: 4.4, cam: { d: 16, h: 3.9 }, ametra: { cd: 0.065, dano: 9, disp: 0.013, lado: 1.5 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 6, regen: 12, cd: 0.8 }, bombas: 4, bombaTipo: 'M', sigilo: 1, desbloqueo: 0, rango: 6, costo: 3400,
    ficha: { vel: 0.7, agil: 0.65, vida: 0.45, fuego: 0.65 },
  }),
  zafiro: av({
    nombre: 'ZAFIRO', clase: 'Interceptor delta', rol: 'interceptor', modelo: 'delta', mp: {}, colores: [0xc8d2dc, 0x2a6cc0],
    desc: 'Ala delta muy rápida con 8 misiles. Gira abierto pero escapa de todo.',
    vel: { min: 75, rango: 130, tope: 270, perdida: 78, grav: 36 }, giro: { cab: 0.9, ala: 2.2, gui: 0.45, resp: 6 },
    vida: 70, radio: 4.1, cam: { d: 17, h: 3.9 }, ametra: { cd: 0.05, dano: 6, disp: 0.013, lado: 0.8 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 8, regen: 8, cd: 0.5 }, bombas: 0, sigilo: 1, desbloqueo: 0, rango: 8, costo: 4800,
    ficha: { vel: 0.95, agil: 0.5, vida: 0.28, fuego: 0.7 },
  }),
  vibora: av({
    nombre: 'VÍBORA', clase: 'Jet de ataque ligero', rol: 'ataque', modelo: 'jetGemelo', mp: { colas: 1, ancho: 0.85 }, colores: [0x5c6a48, 0x353d2a],
    desc: 'Cañón rápido, 12 cohetes y 6 bombas medianas. Buen castigo a tierra.',
    vel: { min: 54, rango: 92, tope: 190, perdida: 58, grav: 28 }, giro: { cab: 1.05, ala: 2.4, gui: 0.5, resp: 6.5 },
    vida: 120, radio: 4.3, cam: { d: 15.5, h: 3.8 }, ametra: { cd: 0.09, dano: 14, disp: 0.012, lado: 1.4 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 12, regen: 8, cd: 0.22 }, bombas: 6, bombaTipo: 'M', sigilo: 1, desbloqueo: 0, rango: 7, costo: 3900,
    ficha: { vel: 0.55, agil: 0.6, vida: 0.55, fuego: 0.85 },
  }),
  dragon: av({
    nombre: 'DRAGÓN', clase: 'Ataque pesado', rol: 'ataque', modelo: 'ataquePesado', mp: {}, colores: [0x66704f, 0x3f4733],
    desc: 'Cañón gatling devastador, blindaje enorme, 16 cohetes y 6 bombas.',
    vel: { min: 44, rango: 70, tope: 135, perdida: 46, grav: 22 }, giro: { cab: 0.9, ala: 2.0, gui: 0.5, resp: 5.5 },
    vida: 280, radio: 5.4, cam: { d: 18, h: 4.4 }, ametra: { cd: 0.04, dano: 20, disp: 0.01, lado: 0 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 16, regen: 7, cd: 0.2 }, bombas: 6, bombaTipo: 'M', sigilo: 1, desbloqueo: 0, rango: 9, costo: 7000,
    ficha: { vel: 0.3, agil: 0.4, vida: 0.9, fuego: 1 },
  }),
  aguila: av({
    nombre: 'ÁGUILA', clase: 'Superioridad aérea', rol: 'caza', modelo: 'jetGemelo', mp: { colas: 2, ancho: 1.1, largo: 1.15 }, colores: [0x8e97a3, 0x2a3140],
    desc: 'El mejor caza: potente, rápido y bien armado, con 8 misiles.',
    vel: { min: 64, rango: 118, tope: 235, perdida: 68, grav: 33 }, giro: { cab: 1.1, ala: 2.5, gui: 0.55, resp: 7 },
    vida: 120, radio: 4.8, cam: { d: 17, h: 4.2 }, ametra: { cd: 0.05, dano: 11, disp: 0.012, lado: 1.6 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 8, regen: 9, cd: 0.6 }, bombas: 2, bombaTipo: 'M', sigilo: 0.8, desbloqueo: 0, rango: 12, costo: 11000,
    ficha: { vel: 0.8, agil: 0.7, vida: 0.55, fuego: 0.9 },
  }),
  relampago: av({
    nombre: 'RELÁMPAGO', clase: 'Interceptor supersónico', rol: 'interceptor', modelo: 'saeta', mp: {}, escala: 1.12, colores: [0xe6e9ee, 0xe0b020],
    desc: 'Aceleración brutal y 12 misiles. Una pasada y se va.',
    vel: { min: 80, rango: 140, tope: 290, perdida: 82, grav: 38 }, giro: { cab: 0.95, ala: 2.3, gui: 0.5, resp: 6.5 },
    vida: 65, radio: 4.2, cam: { d: 18, h: 4 }, ametra: { cd: 0.045, dano: 7, disp: 0.013, lado: 1.3 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 12, regen: 7, cd: 0.45 }, bombas: 0, sigilo: 1, desbloqueo: 0, rango: 11, costo: 8500,
    ficha: { vel: 1, agil: 0.5, vida: 0.25, fuego: 0.8 },
  }),
  martillo: av({
    nombre: 'MARTILLO', clase: 'Bombardero medio', rol: 'bombardero', modelo: 'bombardero', mp: { motores: 2 }, colores: [0x6d7660, 0x474d3d],
    desc: 'Dos motores y 10 bombas medianas. Resistente pero lento de reflejos.',
    vel: { min: 42, rango: 70, tope: 145, perdida: 46, grav: 22 }, giro: { cab: 0.7, ala: 1.5, gui: 0.35, resp: 4 },
    vida: 220, radio: 6.4, cam: { d: 21, h: 5.2 }, ametra: { cd: 0.09, dano: 8, disp: 0.02, lado: 2 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 8, regen: 9, cd: 0.3 }, bombas: 10, bombaTipo: 'M', sigilo: 1, desbloqueo: 0, rango: 6, costo: 3000,
    ficha: { vel: 0.3, agil: 0.2, vida: 0.8, fuego: 0.8 },
  }),
  fortaleza: av({
    nombre: 'FORTALEZA', clase: 'Bombardero pesado', rol: 'bombardero', modelo: 'bombardero', mp: { motores: 4 }, colores: [0x9aa0a4, 0x5d6368],
    desc: 'Cuatro motores y 12 bombas de 500 kg. Una montaña voladora.',
    vel: { min: 40, rango: 60, tope: 125, perdida: 44, grav: 20 }, giro: { cab: 0.55, ala: 1.1, gui: 0.3, resp: 3.5 },
    vida: 400, radio: 8, cam: { d: 25, h: 6.5 }, ametra: { cd: 0.08, dano: 9, disp: 0.02, lado: 3 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 0, regen: 0, cd: 1 }, bombas: 12, bombaTipo: 'P', sigilo: 1, desbloqueo: 0, rango: 10, costo: 9000,
    ficha: { vel: 0.15, agil: 0.1, vida: 1, fuego: 0.95 },
  }),
  sombra: av({
    nombre: 'SOMBRA', clase: 'Bombardero furtivo', rol: 'bombardero', modelo: 'espectro', mp: {}, escala: 1.4, colores: [0x1f2228, 0x2d3139],
    desc: 'Ala volante casi invisible al radar enemigo. 8 bombas pesadas.',
    vel: { min: 58, rango: 90, tope: 190, perdida: 60, grav: 28 }, giro: { cab: 0.8, ala: 1.7, gui: 0.4, resp: 5 },
    vida: 160, radio: 6.4, cam: { d: 20, h: 4.8 }, ametra: { cd: 0.09, dano: 8, disp: 0.015, lado: 1.4 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 2, regen: 20, cd: 1.2 }, bombas: 8, bombaTipo: 'P', sigilo: 0.5, desbloqueo: 0, rango: 14, costo: 14000,
    ficha: { vel: 0.6, agil: 0.35, vida: 0.55, fuego: 0.9 },
  }),
  gavilan: av({
    nombre: 'GAVILÁN', clase: 'Helicóptero artillado', rol: 'heli', tipo: 'heli', modelo: 'heli', mp: { rotores: 1 }, colores: [0x59634a, 0x30362a],
    desc: 'Se queda en el aire, apunta con precisión: cañón y 14 cohetes.',
    vel: { min: 0, rango: 60, tope: 66, perdida: 0, grav: 0 }, giro: { cab: 0.9, ala: 1.6, gui: 1.5, resp: 5 },
    vida: 130, radio: 4.4, cam: { d: 17, h: 4.6 }, ametra: { cd: 0.07, dano: 9, disp: 0.015, lado: 1.2 },
    sec: { tipo: 'cohete', nombre: 'COHETES', n: 14, regen: 7, cd: 0.25 }, bombas: 0, sigilo: 1, desbloqueo: 0, rango: 4, costo: 2600,
    ficha: { vel: 0.25, agil: 0.8, vida: 0.45, fuego: 0.7 },
  }),
  ciclon: av({
    nombre: 'CICLÓN', clase: 'Helicóptero de asalto', rol: 'heli', tipo: 'heli', modelo: 'heli', mp: { rotores: 2 }, colores: [0x3a4555, 0x20252e],
    desc: 'Blindado y con 8 misiles guiados antitanque. Dominio del campo de batalla.',
    vel: { min: 0, rango: 62, tope: 72, perdida: 0, grav: 0 }, giro: { cab: 0.8, ala: 1.4, gui: 1.2, resp: 4.5 },
    vida: 260, radio: 5.4, cam: { d: 19, h: 5 }, ametra: { cd: 0.05, dano: 14, disp: 0.012, lado: 1.6 },
    sec: { tipo: 'misil', nombre: 'MISILES', n: 8, regen: 10, cd: 0.7 }, bombas: 0, sigilo: 0.9, desbloqueo: 0, rango: 9, costo: 8000,
    ficha: { vel: 0.3, agil: 0.6, vida: 0.8, fuego: 0.9 },
  }),
};

// Rol, rango y precio de los 6 aviones originales (se mezclan en config.js)
export const EXTRAS_ORIGINALES = {
  halcon: { rol: 'caza', rango: 1, costo: 0 },
  biplano: { rol: 'helice', rango: 1, costo: 0 },
  tormenta: { rol: 'ataque', rango: 1, costo: 0 },
  saeta: { rol: 'interceptor', rango: 3, costo: 1800 },
  mastodonte: { rol: 'bombardero', rango: 5, costo: 3600 },
  espectro: { rol: 'caza', rango: 7, costo: 5200 },
};

export const ROLES = { caza: 'CAZA', interceptor: 'INTERCEPTOR', ataque: 'ATAQUE', bombardero: 'BOMBARDERO', helice: 'HÉLICE', jet: 'JET', heli: 'HELICÓPTERO' };

// =============================================================
//  TANQUES. vel m/s, giro rad/s, rot = giro de torreta, recarga s, dano por obús.
//  blind = fracción de daño que pasa por el frente · elevMax: antiaéreos apuntan alto
//  auto: cañón automático en lugar de obús (cd, dano)
//  Los valores de ligero, medio y pesado son los que ya usaban los enemigos.
// =============================================================
export const TANQUES = {
  jugador: { nombre: 'CENTINELA', clase: 'Tanque medio', rol: 'medio', variante: 'medio', vida: 170, vel: 14, giro: 1.1, recarga: 2.2, dano: 46, escala: 1, color: 0x4d6b3c, rot: 3.5, puntos: 0, pref: 0, blind: 0.55, desc: 'Equilibrado y fiable. Buen cañón y blindaje frontal.', rango: 1, costo: 0, ficha: { vel: 0.5, agil: 0.5, vida: 0.5, fuego: 0.55 } },
  ligero: { nombre: 'GACELA', clase: 'Tanque ligero', rol: 'ligero', variante: 'ligero', vida: 55, vel: 16, giro: 1.5, recarga: 2.9, dano: 16, escala: 0.9, color: 0xa8905a, rot: 1.0, puntos: 100, pref: 170, blind: 0.8, desc: 'Rápido y ágil, poco blindaje. Recarga media.', rango: 1, costo: 0, ficha: { vel: 0.8, agil: 0.8, vida: 0.2, fuego: 0.25 }, jug: { vida: 100, vel: 17, giro: 1.6, recarga: 1.8, dano: 26, rot: 4 } },
  avispa: { nombre: 'AVISPA', clase: 'Ligero con cañón automático', rol: 'ligero', variante: 'ligero', vida: 90, vel: 17, giro: 1.7, recarga: 0.35, dano: 9, escala: 0.9, color: 0xb5a46a, rot: 4, puntos: 120, pref: 150, blind: 0.8, auto: { cd: 0.2, dano: 9 }, desc: 'Ráfagas de cañón automático. Rápido y mortífero a corta distancia.', rango: 3, costo: 1100, ficha: { vel: 0.85, agil: 0.9, vida: 0.3, fuego: 0.45 } },
  medio: { nombre: 'LINCE', clase: 'Tanque medio', rol: 'medio', variante: 'medio', vida: 100, vel: 12, giro: 1.1, recarga: 3.6, dano: 24, escala: 1, color: 0x8a5a45, rot: 0.8, puntos: 150, pref: 230, blind: 0.55, desc: 'Cañón de buen alcance y casco mejorado.', rango: 3, costo: 1500, ficha: { vel: 0.5, agil: 0.5, vida: 0.55, fuego: 0.6 }, jug: { vida: 190, vel: 13, giro: 1.15, recarga: 2.0, dano: 52, rot: 3.5 } },
  escorpion: { nombre: 'ESCORPIÓN', clase: 'Tanque medio de asalto', rol: 'medio', variante: 'medio', vida: 220, vel: 13, giro: 1.2, recarga: 1.9, dano: 50, escala: 1.05, color: 0x5d6a74, rot: 3.5, puntos: 200, pref: 240, blind: 0.5, desc: 'Más vida, más cañón y orugas rápidas. Un medio de élite.', rango: 6, costo: 3400, ficha: { vel: 0.6, agil: 0.6, vida: 0.7, fuego: 0.75 } },
  pesado: { nombre: 'TITÁN', clase: 'Tanque pesado', rol: 'pesado', variante: 'pesado', vida: 190, vel: 8, giro: 0.8, recarga: 4.8, dano: 38, escala: 1.25, color: 0x5a4a60, rot: 0.6, puntos: 250, pref: 300, blind: 0.4, desc: 'Armadura frontal casi impenetrable. Lento.', rango: 5, costo: 2800, ficha: { vel: 0.25, agil: 0.25, vida: 0.9, fuego: 0.8 }, jug: { vida: 300, vel: 9, giro: 0.85, recarga: 2.9, dano: 66, rot: 2.2 } },
  coloso: { nombre: 'COLOSO', clase: 'Pesado de ruptura', rol: 'pesado', variante: 'pesado', vida: 400, vel: 8.5, giro: 0.8, recarga: 3.2, dano: 85, escala: 1.35, color: 0x3f4a56, rot: 2.0, puntos: 350, pref: 330, blind: 0.35, desc: 'Cañón gigante y 400 de vida. Abre cualquier blindaje.', rango: 10, costo: 8200, ficha: { vel: 0.25, agil: 0.2, vida: 1, fuego: 1 } },
  cazacarros: { nombre: 'VÍBORA', clase: 'Cazacarros', rol: 'cazacarros', variante: 'cazacarros', vida: 120, vel: 12, giro: 1.0, recarga: 3.4, dano: 78, escala: 1, color: 0x6b6a44, rot: 1.2, puntos: 200, pref: 340, blind: 0.5, desc: 'Silueta baja y cañón largo: un disparo letal desde lejos.', rango: 4, costo: 2100, ficha: { vel: 0.5, agil: 0.45, vida: 0.4, fuego: 0.95 } },
  antiaereo: { nombre: 'CENTELLA AA', clase: 'Antiaéreo', rol: 'antiaereo', variante: 'antiaereo', vida: 110, vel: 13, giro: 1.2, recarga: 0.14, dano: 7, escala: 1, color: 0x58664d, rot: 3.5, puntos: 180, pref: 200, blind: 0.65, elevMax: 1.3, auto: { cd: 0.07, dano: 7 }, aa: true, desc: 'Dos cañones automáticos que apuntan hacia arriba: pesadilla de los aviones.', rango: 4, costo: 2300, ficha: { vel: 0.55, agil: 0.55, vida: 0.4, fuego: 0.7 } },
};
export const ORDEN_TANQUES = ['jugador', 'ligero', 'avispa', 'medio', 'cazacarros', 'antiaereo', 'pesado', 'escorpion', 'coloso'];
// Tanques que usan los bots enemigos según el nivel de dificultad (1 recluta .. 3 as)
export const TANQUES_BOT = [['ligero', 'ligero', 'medio'], ['ligero', 'medio', 'medio', 'cazacarros', 'pesado', 'antiaereo'], ['medio', 'pesado', 'cazacarros', 'escorpion', 'avispa', 'antiaereo', 'coloso']];

// =============================================================
//  PINTURA: camuflajes (colores del casco/alas) e insignias
// =============================================================
export const CAMUFLAJES = {
  base: { nombre: 'ORIGINAL', costo: 0, c: null },
  desierto: { nombre: 'DESIERTO', costo: 250, c: [0xc9a96a, 0x9a7a44] },
  selva: { nombre: 'SELVA', costo: 250, c: [0x4f6b3a, 0x2f4526] },
  nieve: { nombre: 'ÁRTICO', costo: 300, c: [0xe8eef2, 0xa9b8c4] },
  noche: { nombre: 'NOCTURNO', costo: 400, c: [0x2b2f3a, 0x171a22] },
  urbano: { nombre: 'URBANO', costo: 300, c: [0x8b9096, 0x5a5f66] },
  carmesi: { nombre: 'CARMESÍ', costo: 500, c: [0xb83a3a, 0x6b1f1f] },
  cobalto: { nombre: 'COBALTO', costo: 500, c: [0x3a6fd0, 0x1f3f7a] },
  oro: { nombre: 'ORO', costo: 1500, c: [0xe0b83a, 0x9a7a1a] },
};
export const ORDEN_CAMUFLAJES = Object.keys(CAMUFLAJES);
export const MARCAS = {
  ninguna: { nombre: 'SIN MARCA', costo: 0 },
  circulo: { nombre: 'ESCARAPELA', costo: 100 },
  estrella: { nombre: 'ESTRELLA', costo: 150 },
  franjas: { nombre: 'FRANJAS', costo: 150 },
  as: { nombre: 'COLA DE AS', costo: 400 },
};
export const ORDEN_MARCAS = Object.keys(MARCAS);

// Módulos de mejora (hasta 3 niveles): costo base × nivel siguiente
export const MEJORAS = {
  motor: { nombre: 'MOTOR', desc: '+5 % de velocidad y empuje por nivel', costo: 400 },
  armas: { nombre: 'ARMAMENTO', desc: '+8 % de daño por nivel', costo: 500 },
  blindaje: { nombre: 'BLINDAJE', desc: '+8 % de vida por nivel', costo: 450 },
};
export const ORDEN_MEJORAS = ['motor', 'armas', 'blindaje'];

// =============================================================
//  MISIONES Y CAMPAÑAS
//  tipo: bombardeo, escolta, defensa, captura, supervivencia
// =============================================================
export const CAMPANAS = [
  {
    id: 'alba', nombre: 'OPERACIÓN ALBA', desc: 'Primeros golpes contra el enemigo en la costa y el desierto.',
    misiones: [
      { id: 'a1', nombre: 'Primer vuelo', tipo: 'bombardeo', unidad: 'avion', mapa: 'costa', n: 6, tiempo: 420, nivel: 1, cr: 500, xp: 250, desc: 'Destruye 6 blancos terrestres: depósitos, camiones y antiaéreas.' },
      { id: 'a2', nombre: 'Escolta del convoy', tipo: 'escolta', unidad: 'avion', mapa: 'desierto', n: 3, nivel: 1, cr: 700, xp: 350, desc: 'Protege a los bombarderos hasta su destino. Al menos 2 deben llegar.' },
      { id: 'a3', nombre: 'Zona caliente', tipo: 'captura', unidad: 'tanque', mapa: 'ciudad', tiempo: 480, nivel: 1, cr: 800, xp: 400, desc: 'Captura y mantén las tres zonas el tiempo suficiente.' },
      { id: 'a4', nombre: 'Defiende la base', tipo: 'defensa', unidad: 'avion', mapa: 'nieve', tiempo: 240, nivel: 2, cr: 1100, xp: 500, desc: 'Resiste 4 minutos: no dejes caer la base aliada.' },
    ],
  },
  {
    id: 'tormenta', nombre: 'TORMENTA DEL PACÍFICO', desc: 'Islas, portaaviones y combates a muerte en el archipiélago y al ocaso.',
    misiones: [
      { id: 't1', nombre: 'Golpe a la flota', tipo: 'bombardeo', unidad: 'avion', mapa: 'archipielago', n: 8, tiempo: 480, nivel: 2, cr: 1200, xp: 600, desc: 'Hunde barcos y destruye depósitos costeros.' },
      { id: 't2', nombre: 'Cielos rojos', tipo: 'supervivencia', unidad: 'avion', mapa: 'ocaso', tiempo: 300, nivel: 2, cr: 1500, xp: 700, desc: 'Sobrevive 5 minutos a oleadas de cazas cada vez más duros.' },
      { id: 't3', nombre: 'Tormenta de acero', tipo: 'supervivencia', unidad: 'tanque', mapa: 'desierto', tiempo: 300, nivel: 2, cr: 1500, xp: 700, desc: 'Aguanta en tu tanque contra oleadas de blindados.' },
      { id: 't4', nombre: 'Escolta nocturna', tipo: 'escolta', unidad: 'avion', mapa: 'ocaso', n: 4, nivel: 3, cr: 2200, xp: 1000, desc: 'Cuatro bombarderos con escolta de ases enemigos.' },
      { id: 't5', nombre: 'Último bastión', tipo: 'defensa', unidad: 'tanque', mapa: 'costa', tiempo: 300, nivel: 3, cr: 2600, xp: 1200, desc: 'Defiende la base de un asalto combinado.' },
    ],
  },
];

export const NIVELES_BOT = [
  { id: 1, nombre: 'RECLUTA' },
  { id: 2, nombre: 'PILOTO' },
  { id: 3, nombre: 'AS' },
];

// =============================================================
//  LOGROS: cada uno mira las estadísticas guardadas
// =============================================================
export const LOGROS = [
  { id: 'primera_sangre', nombre: 'Primera sangre', desc: 'Destruye tu primer enemigo.', ok: (s) => s.bajas >= 1 },
  { id: 'cazador', nombre: 'Cazador', desc: 'Derriba 25 aviones.', ok: (s) => s.bajasAire >= 25 },
  { id: 'as', nombre: 'As del aire', desc: 'Derriba 100 aviones.', ok: (s) => s.bajasAire >= 100 },
  { id: 'blindado', nombre: 'Rompe blindados', desc: 'Destruye 30 tanques.', ok: (s) => s.bajasTanque >= 30 },
  { id: 'demolicion', nombre: 'Demolición', desc: 'Destruye 40 blancos terrestres.', ok: (s) => s.bajasTierra >= 40 },
  { id: 'racha5', nombre: 'Racha de cinco', desc: 'Logra 5 bajas sin morir.', ok: (s) => s.mejorRacha >= 5 },
  { id: 'racha10', nombre: 'Imparable', desc: 'Logra 10 bajas sin morir.', ok: (s) => s.mejorRacha >= 10 },
  { id: 'victoria', nombre: 'Victoria', desc: 'Gana una batalla.', ok: (s) => s.victorias >= 1 },
  { id: 'veterano', nombre: 'Veterano', desc: 'Gana 10 batallas.', ok: (s) => s.victorias >= 10 },
  { id: 'capturas', nombre: 'Conquistador', desc: 'Captura 10 zonas.', ok: (s) => s.capturas >= 10 },
  { id: 'misiones', nombre: 'Soldado de campaña', desc: 'Completa 5 misiones.', ok: (s) => s.misiones >= 5 },
  { id: 'bombardero', nombre: 'Bombardero', desc: 'Lanza 50 bombas.', ok: (s) => s.bombas >= 50 },
  { id: 'misilero', nombre: 'Misilero', desc: 'Dispara 40 misiles o cohetes.', ok: (s) => s.misiles >= 40 },
  { id: 'horas', nombre: 'Horas de vuelo', desc: 'Juega una hora en total.', ok: (s) => s.tiempo >= 3600 },
  { id: 'rico', nombre: 'Coleccionista', desc: 'Posee 8 vehículos.', ok: (s, p) => p && p.nPoseidos >= 8 },
  { id: 'nivel10', nombre: 'Oficial', desc: 'Alcanza el nivel 10.', ok: (s, p) => p && p.nivel >= 10 },
  { id: 'bengalas', nombre: 'Engañado', desc: 'Esquiva un misil con bengalas.', ok: (s) => s.misilesEngañados >= 1 },
];
