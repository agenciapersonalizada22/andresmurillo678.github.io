/* Celulas: constantes del juego */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  C.K = 6;                 // radio = K * sqrt(masa)
  C.MASA_INI = 20; C.MASA_MIN = 10; C.MASA_DIV = 36; C.MASA_EXP = 32; C.MASA_EYEC = 12; C.MASA_VIRUS = 100;
  C.MAX_CEL = 16; C.MAX_JUG = 48; C.DECAY = 0.0015; C.DECAY_MIN = 60; C.DT = 1 / 60;
  C.FEED_VIRUS = 7; C.R_COMIDA = 7; C.R_EYEC = 14;
  C.MODOS = {
    ffa: { nombre: 'Todos contra todos', corto: 'FFA', tam: 5000, reaparece: true, desc: 'Crece, come y sobrevive. Sin fin.' },
    equipos: { nombre: 'Equipos', corto: 'EQUIPOS', tam: 5000, reaparece: true, tiempo: 420, desc: 'Rojo contra Azul: los aliados no se comen. Gana el equipo con mas masa en 7 min.' },
    superv: { nombre: 'Supervivencia', corto: 'SUPERV.', tam: 4000, reaparece: false, tiempo: 600, desc: 'Una sola vida. Gana el ultimo en pie (o el mayor a los 10 min).' },
    batalla: { nombre: 'Batalla de masa', corto: 'BATALLA', tam: 4500, reaparece: false, gracia: 60, tiempo: 420, desc: 'Una zona que se encoge te quema fuera de ella. Gana el ultimo o el mayor.' }
  };
  C.EQUIPOS = [{ nombre: 'Rojo', color: '#ff4a5e' }, { nombre: 'Azul', color: '#3d8bff' }];
  C.DIF = {
    facil: { nombre: 'Facil', reac: 0.36, vision: 0.7, ruido: 0.55, dividir: 0.05, margen: 1.0, predice: 0 },
    normal: { nombre: 'Normal', reac: 0.22, vision: 1.0, ruido: 0.25, dividir: 0.3, margen: 1.15, predice: 0.5 },
    dificil: { nombre: 'Dificil', reac: 0.12, vision: 1.4, ruido: 0.08, dividir: 0.7, margen: 1.3, predice: 1 }
  };
  C.COLORES_COMIDA = ['#ff5d73', '#ffb347', '#ffe66d', '#7bed9f', '#48dbfb', '#7d8bff', '#d980fa', '#ffffff'];
  C.COLORES_COMIDA_CVD = ['#e69f00', '#56b4e9', '#f0e442', '#ffffff', '#0072b2', '#d55e00', '#cc79a7', '#999999'];
  C.COLORES_SKIN = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff', '#2fbf71', '#e84393', '#0984e3', '#a29bfe'];
  C.PATRONES = ['Liso', 'Anillos', 'Manchas', 'Rayas', 'Solar', 'Puntos', 'Dama', 'Degradado'];
  C.EMOJIS = ['', '🙂', '😎', '😈', '👾', '🐸', '🦊', '🐙', '🦠', '🔥', '⚡', '⭐', '💀', '🍕', '🌈', '🐱', '🐼', '🦁', '🤖', '👑', '🍄', '🌙', '❄️', '🎯'];
  C.NOMBRES_BOT = ['Amiba', 'Plasma', 'Nucleo', 'Gelatina', 'Esporas', 'Mitosis', 'Bacilo', 'Glóbulo', 'Zigoto', 'Citoplasma', 'Vacuola', 'Cilios', 'Flagelo', 'Lisosoma', 'Ribosoma', 'Membrana', 'Plancton', 'Kraken', 'Burbuja', 'Slime', 'Pixel', 'Turbo', 'Nova', 'Cometa', 'Zorro', 'Lince', 'Orion', 'Delta', 'Sombra', 'Rayo', 'Coloso', 'Pulga', 'Mancha', 'Gotita', 'Neblina', 'Volt', 'Ameba X', 'Bola', 'Tomi', 'Luna'];
  C.CALIDAD = {
    baja: { dpr: 1, sprite: 64, circulos: false, brillo: false, ondas: false, cuadricula: true, particulas: false },
    media: { dpr: 1, sprite: 96, circulos: true, brillo: false, ondas: false, cuadricula: true, particulas: true },
    alta: { dpr: 1.5, sprite: 128, circulos: true, brillo: true, ondas: true, cuadricula: true, particulas: true },
    ultra: { dpr: 2, sprite: 192, circulos: true, brillo: true, ondas: true, cuadricula: true, particulas: true }
  };
  /* posicion y color deterministas de una comida: la comida (ranura, generacion) es igual en anfitrion y clientes */
  C.posComida = function (semilla, slot, gen, tam, out) {
    var h = C.hash2((semilla ^ Math.imul(slot, 0x9E3779B1)) | 0, gen);
    var h2 = C.hash2(h, slot + 17);
    out.x = 40 + (h / 4294967296) * (tam - 80);
    out.y = 40 + (h2 / 4294967296) * (tam - 80);
    out.c = (h2 >>> 3) & 7;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
