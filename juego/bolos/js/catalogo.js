// Datos del juego: bolas, pistas, ligas, desafios de pinos especiales y logros. Todo original y procedural.
export const BOLAS = [
  { id: 'clasica', nombre: 'Clásica', precio: 0, hook: 0.65, m: 6.2, c1: '#2d6cdf', c2: '#12306e', brillo: 0.5, desc: 'Equilibrada. Para empezar.' },
  { id: 'esmeralda', nombre: 'Esmeralda', precio: 250, hook: 0.8, m: 6.4, c1: '#2ecc71', c2: '#0b5a30', brillo: 0.55, desc: 'Buen efecto y control.' },
  { id: 'rayo', nombre: 'Rayo', precio: 400, hook: 0.95, m: 6.0, c1: '#ffe14d', c2: '#7a5b00', brillo: 0.7, emi: '#554400', desc: 'Más rápida y con mucho efecto.' },
  { id: 'fuego', nombre: 'Fuego', precio: 600, hook: 1.0, m: 6.5, c1: '#ff7a1a', c2: '#a01808', brillo: 0.6, emi: '#401000', desc: 'Curva fuerte y buen empuje.' },
  { id: 'hielo', nombre: 'Hielo', precio: 750, hook: 0.55, m: 6.9, c1: '#bff3ff', c2: '#3a8fb5', brillo: 0.9, desc: 'Pesada y recta: derriba mucho.' },
  { id: 'neon', nombre: 'Neón', precio: 1000, hook: 0.9, m: 6.6, c1: '#ff2bd6', c2: '#2b0a5a', brillo: 0.8, emi: '#3a0838', desc: 'Brilla en la oscuridad.' },
  { id: 'oro', nombre: 'Oro', precio: 1600, hook: 0.7, m: 7.3, c1: '#ffd34d', c2: '#9a6a00', brillo: 1, metal: 1, desc: 'La más pesada: barre los pinos.' },
  { id: 'galaxia', nombre: 'Galaxia', precio: 2200, hook: 1.1, m: 7.0, c1: '#7a4dff', c2: '#0a0524', brillo: 0.9, estrellas: 1, emi: '#1a0a4a', desc: 'Efecto enorme y gran potencia.' },
  { id: 'corona', nombre: 'Corona real', precio: 3500, hook: 1.2, m: 7.4, c1: '#ff3d5a', c2: '#ffd34d', brillo: 1, metal: 1, emi: '#401018', desc: 'Para el verdadero rey de los bolos.' }
];

export const PISTAS = [
  { id: 'madera', nombre: 'Madera clásica', precio: 0, tabla1: '#e0aa66', tabla2: '#c98f4a', flechas: '#5a3410', pared: '#2a1d14', neon: '#ffb347', fondo: '#120a05', luz: 1 },
  { id: 'neon', nombre: 'Neón nocturno', precio: 700, tabla1: '#2a2f5c', tabla2: '#1e2248', flechas: '#3df5ff', pared: '#0b0b24', neon: '#3df5ff', neon2: '#ff2bd6', fondo: '#05051a', luz: 0.8 },
  { id: 'playa', nombre: 'Playa', precio: 900, tabla1: '#f3dca0', tabla2: '#e3c883', flechas: '#1c7aa8', pared: '#1b6f8f', neon: '#ffffff', fondo: '#7fd1ee', luz: 1.15 },
  { id: 'retro', nombre: 'Retro 80', precio: 1200, tabla1: '#8a3fd6', tabla2: '#6a2bb0', flechas: '#ffe14d', pared: '#240a3d', neon: '#ff3d9a', neon2: '#3df5ff', fondo: '#10051e', luz: 0.9 },
  { id: 'hielo', nombre: 'Glaciar', precio: 1500, tabla1: '#c8ecf7', tabla2: '#a6d9ea', flechas: '#2d6c8f', pared: '#2a566e', neon: '#9fe8ff', fondo: '#0e2331', luz: 1.1, brillante: 1 },
  { id: 'espacio', nombre: 'Estación espacial', precio: 2400, tabla1: '#3a3f4a', tabla2: '#2c313b', flechas: '#ffd23d', pared: '#12151c', neon: '#6dff6d', neon2: '#7a4dff', fondo: '#020309', luz: 0.85, brillante: 1, estrellas: 1 }
];

export const PINOS = {
  normal: { nombre: 'Normal', color: '#ffffff', franja: '#d8262e' },
  pesado: { nombre: 'Pesado', color: '#ffd34d', franja: '#7a5200' },
  ligero: { nombre: 'Ligero', color: '#bdf3ff', franja: '#1e7fa8' },
  explosivo: { nombre: 'Explosivo', color: '#ff6a4a', franja: '#1a1a1a' }
};

const BOT_BASE = ['Marta', 'Bruno', 'Lucía', 'Tomás', 'Valentina', 'Hugo', 'Sofía', 'Mateo', 'Camila', 'Dante', 'Irene', 'Rafa'];
const BOT_COLOR = ['#ff6b4a', '#ffd23d', '#6dff6d', '#c77dff', '#3df5ff', '#ff8fd0', '#9aa8ff', '#ffa94d'];
export const nombreBot = (i) => BOT_BASE[((i % BOT_BASE.length) + BOT_BASE.length) % BOT_BASE.length];
export const colorBot = (i) => BOT_COLOR[((i % BOT_COLOR.length) + BOT_COLOR.length) % BOT_COLOR.length];
export const NIVELES_BOT = [{ id: 0, nombre: 'Fácil', hab: 0.25 }, { id: 1, nombre: 'Medio', hab: 0.55 }, { id: 2, nombre: 'Experto', hab: 0.85 }];

export const LIGAS = [
  { id: 'bronce', nombre: 'Liga Bronce', color: '#c9803a', premio: 150, pista: 'madera', rivales: [{ n: 'Marta', hab: 0.2, bola: 'clasica' }, { n: 'Bruno', hab: 0.28, bola: 'clasica' }, { n: 'Lucía', hab: 0.34, bola: 'esmeralda' }] },
  { id: 'plata', nombre: 'Liga Plata', color: '#c0c8d4', premio: 300, pista: 'madera', rivales: [{ n: 'Tomás', hab: 0.42, bola: 'esmeralda' }, { n: 'Valentina', hab: 0.48, bola: 'rayo' }, { n: 'Hugo', hab: 0.54, bola: 'fuego' }] },
  { id: 'oro', nombre: 'Liga Oro', color: '#ffd34d', premio: 500, pista: 'neon', rivales: [{ n: 'Sofía', hab: 0.6, bola: 'hielo' }, { n: 'Mateo', hab: 0.66, bola: 'neon' }, { n: 'Camila', hab: 0.72, bola: 'oro' }] },
  { id: 'platino', nombre: 'Liga Platino', color: '#8fe8ff', premio: 800, pista: 'retro', rivales: [{ n: 'Dante', hab: 0.78, bola: 'galaxia' }, { n: 'Irene', hab: 0.83, bola: 'galaxia' }, { n: 'Rafa', hab: 0.88, bola: 'oro' }] },
  { id: 'leyenda', nombre: 'Liga Leyenda', color: '#ff3d5a', premio: 1500, pista: 'espacio', rivales: [{ n: 'Cometa', hab: 0.92, bola: 'galaxia' }, { n: 'Titán', hab: 0.96, bola: 'corona' }, { n: 'El Rey', hab: 1.0, bola: 'corona' }] }
];

const L = (i, tipo) => ({ i: i - 1, tipo: tipo || 'normal' });
const todos = (tipos) => Array.from({ length: 10 }, (_, k) => L(k + 1, tipos && tipos[k]));
export const DESAFIOS = [
  { id: 'd01', nombre: 'Rack entero', desc: 'Diez pinos normales. Calentamiento.', pinos: todos() },
  { id: 'd02', nombre: 'Split 7-10', desc: 'Las «orejas»: los dos pinos de las esquinas.', pinos: [L(7), L(10)] },
  { id: 'd03', nombre: 'Pino pesado', desc: 'El pino de la cabeza es de acero.', pinos: todos(['pesado']) },
  { id: 'd04', nombre: 'Pinos ligeros', desc: 'Caen con un soplido... y salen volando.', pinos: todos(Array(10).fill('ligero')) },
  { id: 'd05', nombre: 'Tres en fila', desc: 'Pinos 1, 5 y 8 en línea recta.', pinos: [L(1), L(5), L(8)] },
  { id: 'd06', nombre: 'Detonador', desc: 'Un pino explosivo en el centro del rack.', pinos: todos([, , , , 'explosivo']) },
  { id: 'd07', nombre: 'Valla', desc: 'Pinos 1, 2, 3, 5, 8 y 9... una línea difícil.', pinos: [L(1), L(2), L(3), L(5), L(8), L(9)] },
  { id: 'd08', nombre: 'Tres explosivos', desc: 'Reacción en cadena controlada.', pinos: todos([, 'explosivo', 'explosivo', , , , 'explosivo']) },
  { id: 'd09', nombre: 'Muralla de acero', desc: 'Fila trasera de pinos pesados.', pinos: todos([, , , , , , 'pesado', 'pesado', 'pesado', 'pesado']) },
  { id: 'd10', nombre: 'Split 4-6-7-10', desc: 'La gran esquina vacía: pocas esperanzas.', pinos: [L(4), L(6), L(7), L(10)] },
  { id: 'd11', nombre: 'Cabeza fantasma', desc: 'Sin pino 1: el bolsillo está vacío.', pinos: [L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9), L(10)] },
  { id: 'd12', nombre: 'Arcoíris', desc: 'Pesados, ligeros y explosivos mezclados.', pinos: todos(['pesado', 'ligero', 'ligero', 'explosivo', 'normal', 'explosivo', 'ligero', 'pesado', 'pesado', 'ligero']) }
];
DESAFIOS.forEach((d, k) => { d.tiros = 3; d.n = k; });

/* Reto diario: rondas generadas a partir de la fecha (igual para todos). */
export function semilla(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const fechaHoy = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export function rondasDiarias(fecha) {
  const r = rng(semilla('bolos' + fecha)), rondas = [], tipos = ['normal', 'normal', 'normal', 'pesado', 'ligero', 'explosivo'];
  for (let k = 0; k < 5; k++) {
    const cant = 4 + Math.floor(r() * 7), idx = Array.from({ length: 10 }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    rondas.push({ pinos: idx.slice(0, cant).sort((a, b) => a - b).map((i) => ({ i, tipo: tipos[Math.floor(r() * tipos.length)] })), tiros: 2 });
  }
  return rondas;
}

export const LOGROS = [
  { id: 'primer_strike', nombre: 'Primer strike', desc: 'Derriba los 10 pinos con la primera bola.' },
  { id: 'primer_spare', nombre: 'Primer spare', desc: 'Completa un spare.' },
  { id: 'doble', nombre: 'Doble', desc: 'Dos strikes seguidos.' },
  { id: 'pavo', nombre: 'Pavo', desc: 'Tres strikes seguidos.' },
  { id: 'cuatro_seguidos', nombre: 'Cuatro de oro', desc: 'Cuatro strikes seguidos.' },
  { id: 'perfecta', nombre: 'Partida perfecta', desc: 'Consigue 300 puntos.' },
  { id: 'cien', nombre: 'Siglo', desc: 'Supera los 100 puntos en una partida.' },
  { id: 'ciento_cincuenta', nombre: 'Buen promedio', desc: 'Supera los 150 puntos.' },
  { id: 'doscientos', nombre: 'Doscientos', desc: 'Supera los 200 puntos.' },
  { id: 'canalero', nombre: 'Canalero', desc: 'Manda una bola al canal.' },
  { id: 'split', nombre: 'Split salvado', desc: 'Convierte un spare tras un split.' },
  { id: 'cien_strikes', nombre: 'Cien strikes', desc: 'Acumula 100 strikes.' },
  { id: 'mil_pinos', nombre: 'Mil pinos', desc: 'Derriba 1000 pinos.' },
  { id: 'liga_bronce', nombre: 'Campeón de bronce', desc: 'Gana la Liga Bronce.' },
  { id: 'liga_plata', nombre: 'Campeón de plata', desc: 'Gana la Liga Plata.' },
  { id: 'liga_oro', nombre: 'Campeón de oro', desc: 'Gana la Liga Oro.' },
  { id: 'liga_platino', nombre: 'Campeón de platino', desc: 'Gana la Liga Platino.' },
  { id: 'rey_de_los_bolos', nombre: 'Rey de los Bolos', desc: 'Gana la Liga Leyenda.' },
  { id: 'desafio_primero', nombre: 'Primer desafío', desc: 'Supera un desafío de pinos.' },
  { id: 'desafio_tres_estrellas', nombre: 'Tres estrellas', desc: 'Consigue 3 estrellas en un desafío.' },
  { id: 'desafios_todos', nombre: 'Maestro de pinos', desc: 'Supera todos los desafíos.' },
  { id: 'diario_hecho', nombre: 'Reto del día', desc: 'Completa un reto diario.' },
  { id: 'racha_diaria_7', nombre: 'Siete días', desc: 'Juega el reto diario 7 días seguidos.' },
  { id: 'primera_compra', nombre: 'De compras', desc: 'Compra una bola o una pista.' },
  { id: 'coleccionista', nombre: 'Coleccionista', desc: 'Desbloquea todas las bolas.' },
  { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana una partida contra otros jugadores o bots.' },
  { id: 'ganar_online', nombre: 'Rey de la sala', desc: 'Gana una partida online con amigos.' },
  { id: 'explosivo', nombre: '¡Bum!', desc: 'Haz estallar un pino explosivo.' }
];
