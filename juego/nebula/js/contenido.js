// =============================================================
//  CONTENIDO: naves, mejoras, mundos, enemigos, jefes, power-ups, logros.
//  Son sólo datos: la simulación (sim.js) los lee.
// =============================================================
const Util = {
  limitar: (v, a, b) => (v < a ? a : v > b ? b : v),
  azar: (a, b) => a + Math.random() * (b - a),
  // Generador con semilla (mulberry32): mismos números para la misma semilla
  rng(semilla) {
    let s = semilla >>> 0;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.azar = (a, b) => a + f() * (b - a);
    f.ent = (a, b) => Math.floor(a + f() * (b - a + 1));
    f.elegir = (l) => l[Math.floor(f() * l.length)];
    return f;
  },
  pesos(r, lista) { // lista: [[valor, peso], ...]
    let t = 0; for (let i = 0; i < lista.length; i++) t += lista[i][1];
    let x = r() * t;
    for (let i = 0; i < lista.length; i++) { x -= lista[i][1]; if (x <= 0) return lista[i][0]; }
    return lista[0][0];
  },
  fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
};

const NAVES = [
  { id: 'centella', nombre: 'Centella', desc: 'Equilibrada y fiable.', precio: 0, vel: 380, vida: 3, cad: 0.15, dmg: 1, hab: 'dash', habNombre: 'Salto cuántico',
    habDesc: 'Impulso veloz e invulnerable.', habCd: 4.5, color: '#3df5ff' },
  { id: 'baluarte', nombre: 'Baluarte', desc: 'Lenta pero muy resistente.', precio: 600, vel: 320, vida: 4, cad: 0.17, dmg: 1.1, hab: 'escudo', habNombre: 'Burbuja',
    habDesc: 'Escudo 4 s que destruye balas.', habCd: 14, color: '#7dffb3' },
  { id: 'artillera', nombre: 'Artillera', desc: 'Daño pesado, cadencia baja.', precio: 1200, vel: 340, vida: 3, cad: 0.19, dmg: 1.35, hab: 'bomba', habNombre: 'Bomba de plasma',
    habDesc: 'Daña todo y borra las balas.', habCd: 22, color: '#ffb02e' },
  { id: 'aguja', nombre: 'Aguja', desc: 'Velocísima y frágil.', precio: 1800, vel: 450, vida: 2, cad: 0.12, dmg: 0.9, hab: 'rayo', habNombre: 'Rayo orbital',
    habDesc: 'Haz continuo hacia arriba.', habCd: 13, color: '#ff6bd5' },
  { id: 'enjambre', nombre: 'Enjambre', desc: 'Apoyo de drones.', precio: 2600, vel: 360, vida: 3, cad: 0.15, dmg: 1, hab: 'drones', habNombre: 'Drones',
    habDesc: '3 drones disparan 9 s.', habCd: 16, color: '#c4a1ff' },
];

const MEJORAS = [
  { id: 'casco', nombre: 'Casco reforzado', desc: '+1 vida inicial por nivel', max: 3, base: 150 },
  { id: 'motor', nombre: 'Motores', desc: '+4% velocidad por nivel', max: 5, base: 100 },
  { id: 'canon', nombre: 'Cañones', desc: '+8% daño por nivel', max: 5, base: 140 },
  { id: 'cadencia', nombre: 'Recarga rápida', desc: '+4% cadencia por nivel', max: 5, base: 130 },
  { id: 'reactor', nombre: 'Reactor', desc: '-6% enfriamiento de habilidad', max: 5, base: 120 },
  { id: 'iman', nombre: 'Imán', desc: '+25% radio de recogida', max: 5, base: 80 },
  { id: 'botin', nombre: 'Botín', desc: '+10% créditos ganados', max: 5, base: 160 },
  { id: 'blindaje', nombre: 'Blindaje', desc: 'Empiezas con escudos', max: 3, base: 200 },
];
const costoMejora = (m, nivel) => Math.round(m.base * (1 + nivel * 1.3));

// Tipos de power-up: letra, color y peso de aparición
const POWERUPS = {
  nivel:      { letra: '▲', color: '#3df5ff', peso: 4 },
  rapido:     { letra: '»', color: '#ffd23d', peso: 3 },
  escudo:     { letra: 'E', color: '#7dffb3', peso: 3 },
  vida:       { letra: '+', color: '#ff5c8a', peso: 1.2 },
  iman:       { letra: 'M', color: '#c4a1ff', peso: 2 },
  bomba:      { letra: 'H', color: '#ffb02e', peso: 2 },
  lento:      { letra: 'T', color: '#8ab4ff', peso: 1.4 },
  disp:       { letra: 'D', color: '#ff9f1c', peso: 2 },
  laser:      { letra: 'L', color: '#7df9ff', peso: 2 },
  misil:      { letra: 'N', color: '#ff6b6b', peso: 2 },
  moneda:     { letra: '$', color: '#ffd23d', peso: 0 },
};
const ARMAS = { pulso: 'Pulso', disp: 'Dispersión', laser: 'Láser', misil: 'Misiles' };

// Enemigos: vida, radio, puntos, costo para armar oleadas
const ENEMIGOS = {
  zangano:   { vida: 1,  r: 15, pts: 100, costo: 1 },
  tirador:   { vida: 3,  r: 18, pts: 250, costo: 2 },
  kamikaze:  { vida: 2,  r: 14, pts: 200, costo: 1.5 },
  franco:    { vida: 4,  r: 16, pts: 400, costo: 3 },
  mina:      { vida: 3,  r: 15, pts: 220, costo: 2 },
  blindado:  { vida: 14, r: 25, pts: 800, costo: 5 },
  tejedor:   { vida: 7,  r: 20, pts: 500, costo: 4 },
  asteroide: { vida: 5,  r: 22, pts: 60,  costo: 1 },
};

const MUNDOS = [
  { id: 'carmesi', nombre: 'Nebulosa Carmesí', fondo: '#0a0420', neb: ['#5a1c8c', '#8a1c4c'], estrella: '#ffd9ff', decor: 'planeta', transp: 0, tempo: 1,
    pool: [['zangano', 5, 0], ['tirador', 3, 1], ['kamikaze', 2, 2]], jefe: 0 },
  { id: 'cinturon', nombre: 'Cinturón de Asteroides', fondo: '#120a06', neb: ['#6a3a14', '#3a2a5a'], estrella: '#ffe2b8', decor: 'roca', transp: 2, tempo: 1.04,
    pool: [['asteroide', 5, 0], ['zangano', 3, 0], ['kamikaze', 3, 1], ['mina', 3, 2], ['tirador', 2, 2]], jefe: 1 },
  { id: 'hielo', nombre: 'Abismo Helado', fondo: '#04101a', neb: ['#0e5a7a', '#2a2a8a'], estrella: '#d8f6ff', decor: 'cristal', transp: -2, tempo: 1.0,
    pool: [['zangano', 3, 0], ['tirador', 3, 0], ['franco', 3, 1], ['blindado', 2, 3], ['kamikaze', 2, 1]], jefe: 2 },
  { id: 'selva', nombre: 'Selva Espectral', fondo: '#031208', neb: ['#0e6a3a', '#5a8a1c'], estrella: '#d8ffd0', decor: 'espora', transp: 3, tempo: 1.06,
    pool: [['mina', 4, 0], ['tejedor', 3, 1], ['zangano', 3, 0], ['kamikaze', 2, 1], ['franco', 2, 3]], jefe: 3 },
  { id: 'forja', nombre: 'Forja Solar', fondo: '#1a0603', neb: ['#8a2a0a', '#8a6a0a'], estrella: '#fff0b0', decor: 'sol', transp: -3, tempo: 1.1,
    pool: [['blindado', 3, 0], ['kamikaze', 3, 0], ['tirador', 3, 0], ['tejedor', 2, 2], ['franco', 2, 1], ['mina', 2, 1]], jefe: 4 },
  { id: 'vacio', nombre: 'El Vacío', fondo: '#030208', neb: ['#4a1a6a', '#1a1a3a'], estrella: '#ffffff', decor: 'anillo', transp: 5, tempo: 1.14,
    pool: [['zangano', 2, 0], ['tirador', 2, 0], ['kamikaze', 2, 0], ['franco', 2, 0], ['mina', 2, 0], ['blindado', 2, 1], ['tejedor', 3, 1]], jefe: 5 },
];

// Jefes: fases según la vida restante; cada fase repite sus ataques en orden
const JEFES = [
  { id: 'centinela', nombre: 'Centinela Carmesí', vida: 170, r: 46, color: '#ff3d81', pts: 5000,
    fases: [
      { hp: 1, cd: 2.0, mov: 0.8, at: [{ id: 'abanico', n: 5, spread: 0.9, v: 230 }, { id: 'anillo', n: 14, v: 170 }] },
      { hp: 0.6, cd: 1.7, mov: 1.1, at: [{ id: 'rafaga', dur: 1.4, rate: 0.16, v: 420 }, { id: 'abanico', n: 7, spread: 1.2, v: 240 }, { id: 'anillo', n: 20, v: 180 }] },
      { hp: 0.3, cd: 1.4, mov: 1.4, at: [{ id: 'espiral', dur: 3, rate: 0.08, brazos: 2, giro: 2.4, v: 200 }, { id: 'minions', tipo: 'kamikaze', n: 3 }, { id: 'anillo', n: 24, v: 190 }] },
    ] },
  { id: 'reina', nombre: 'Reina del Cinturón', vida: 230, r: 50, color: '#ff9f1c', pts: 7000,
    fases: [
      { hp: 1, cd: 2.0, mov: 0.7, at: [{ id: 'lluvia', dur: 3, rate: 0.16, v: 270 }, { id: 'abanico', n: 6, spread: 1.0, v: 240 }] },
      { hp: 0.62, cd: 1.7, mov: 1, at: [{ id: 'minions', tipo: 'asteroide', n: 4 }, { id: 'abanico', n: 9, spread: 1.5, v: 250 }, { id: 'carga' }] },
      { hp: 0.3, cd: 1.4, mov: 1.3, at: [{ id: 'carga' }, { id: 'lluvia', dur: 3.2, rate: 0.1, v: 320 }, { id: 'anillo', n: 22, v: 190 }] },
    ] },
  { id: 'leviatan', nombre: 'Leviatán Glacial', vida: 300, r: 52, color: '#7dd3ff', pts: 9000,
    fases: [
      { hp: 1, cd: 2.3, mov: 0.6, at: [{ id: 'pilares', n: 3 }, { id: 'anillo', n: 22, v: 130 }] },
      { hp: 0.62, cd: 1.9, mov: 0.9, at: [{ id: 'pilares', n: 5 }, { id: 'espiral', dur: 3, rate: 0.09, brazos: 3, giro: 1.6, v: 175 }, { id: 'abanico', n: 7, spread: 1.4, v: 230 }] },
      { hp: 0.3, cd: 1.5, mov: 1.1, at: [{ id: 'franjas', n: 3 }, { id: 'pilares', n: 6 }, { id: 'espiral', dur: 3.4, rate: 0.07, brazos: 4, giro: 2.0, v: 190 }] },
    ] },
  { id: 'espora', nombre: 'Madre Espora', vida: 350, r: 50, color: '#7dff6b', pts: 11000,
    fases: [
      { hp: 1, cd: 2.0, mov: 0.8, at: [{ id: 'minas', n: 3 }, { id: 'espiral', dur: 2.6, rate: 0.1, brazos: 2, giro: 2.2, v: 170 }] },
      { hp: 0.6, cd: 1.7, mov: 1.0, at: [{ id: 'minions', tipo: 'tejedor', n: 2 }, { id: 'anillo', n: 18, v: 150 }, { id: 'minas', n: 4 }] },
      { hp: 0.3, cd: 1.4, mov: 1.2, at: [{ id: 'espiral', dur: 3.4, rate: 0.065, brazos: 3, giro: -2.4, v: 200 }, { id: 'minas', n: 5 }, { id: 'anillo', n: 26, v: 160 }] },
    ] },
  { id: 'coloso', nombre: 'Coloso Solar', vida: 430, r: 56, color: '#ffb02e', pts: 14000,
    fases: [
      { hp: 1, cd: 1.8, mov: 1.0, at: [{ id: 'franjas', n: 2 }, { id: 'abanico', n: 9, spread: 1.6, v: 260 }, { id: 'carga' }] },
      { hp: 0.6, cd: 1.5, mov: 1.3, at: [{ id: 'rafaga', dur: 1.8, rate: 0.12, v: 460 }, { id: 'franjas', n: 3 }, { id: 'carga' }, { id: 'anillo', n: 26, v: 200 }] },
      { hp: 0.3, cd: 1.2, mov: 1.6, at: [{ id: 'espiral', dur: 3, rate: 0.06, brazos: 4, giro: 2.6, v: 220 }, { id: 'carga' }, { id: 'franjas', n: 4 }, { id: 'minions', tipo: 'kamikaze', n: 4 }] },
    ] },
  { id: 'ojo', nombre: 'Ojo del Vacío', vida: 620, r: 54, color: '#d96bff', pts: 25000,
    fases: [
      { hp: 1, cd: 1.7, mov: 1.0, at: [{ id: 'abanico', n: 7, spread: 1.3, v: 260 }, { id: 'pilares', n: 4 }, { id: 'anillo', n: 24, v: 180 }] },
      { hp: 0.72, cd: 1.5, mov: 1.2, at: [{ id: 'espiral', dur: 3, rate: 0.07, brazos: 3, giro: 2.2, v: 200 }, { id: 'minas', n: 3 }, { id: 'rafaga', dur: 1.5, rate: 0.13, v: 450 }] },
      { hp: 0.45, cd: 1.3, mov: 1.4, at: [{ id: 'franjas', n: 3 }, { id: 'minions', tipo: 'franco', n: 2 }, { id: 'anillo', n: 30, v: 200 }, { id: 'carga' }] },
      { hp: 0.2, cd: 1.0, mov: 1.7, at: [{ id: 'espiral', dur: 3.6, rate: 0.055, brazos: 5, giro: 2.8, v: 220 }, { id: 'pilares', n: 6 }, { id: 'abanico', n: 11, spread: 1.8, v: 280 }] },
    ] },
];

const MODOS = [
  { id: 'campana', nombre: 'Campaña', desc: '6 mundos, 5 oleadas y un jefe cada uno.' },
  { id: 'infinito', nombre: 'Infinito', desc: 'Sobrevive todo lo que puedas.' },
  { id: 'jefes', nombre: 'Duelo de jefes', desc: 'Enfrenta a los jefes que ya conoces.' },
  { id: 'diario', nombre: 'Desafío diario', desc: 'Misma partida para todos hoy.' },
];

const MODIFICADORES = [
  { id: 'balas', nombre: 'Balas veloces', desc: 'Los disparos enemigos van 30% más rápido.', velBala: 1.3, pts: 1.25 },
  { id: 'cristal', nombre: 'Cañón de cristal', desc: 'Una sola vida, puntos x2.', vidas: 1, pts: 2 },
  { id: 'blindaje', nombre: 'Casco duro', desc: 'Enemigos con 60% más vida, puntos x1.3.', hpE: 1.6, pts: 1.3 },
  { id: 'lluvia', nombre: 'Lluvia de mejoras', desc: 'El doble de power-ups.', puMul: 2, pts: 1 },
  { id: 'sinCura', nombre: 'Sin reparaciones', desc: 'No caen vidas ni escudos, puntos x1.4.', sinCura: true, pts: 1.4 },
  { id: 'enjambre', nombre: 'Marea enemiga', desc: 'Oleadas 40% más grandes.', masE: 1.4, pts: 1.2 },
];

const DIFICULTADES = {
  facil:   { nombre: 'Fácil', hp: 0.8, vel: 0.88, vidas: 1, pts: 0.75, drop: 1.3 },
  normal:  { nombre: 'Normal', hp: 1, vel: 1, vidas: 0, pts: 1, drop: 1 },
  dificil: { nombre: 'Difícil', hp: 1.3, vel: 1.12, vidas: 0, pts: 1.3, drop: 0.8 },
};

// Logros: 'acum' compara una estadística acumulada; 'ev' se otorga desde el juego
const LOGROS = [
  { id: 'vuelo', nom: 'Primer vuelo', desc: 'Termina tu primera partida.', st: 'partidas', meta: 1 },
  { id: 'veterano', nom: 'Veterano', desc: 'Juega 25 partidas.', st: 'partidas', meta: 25 },
  { id: 'cazador', nom: 'Cazador', desc: 'Destruye 200 enemigos.', st: 'kills', meta: 200 },
  { id: 'exterminador', nom: 'Exterminador', desc: 'Destruye 2.000 enemigos.', st: 'kills', meta: 2000 },
  { id: 'leyenda', nom: 'Leyenda', desc: 'Destruye 15.000 enemigos.', st: 'kills', meta: 15000 },
  { id: 'jefe1', nom: 'Matajefes', desc: 'Derrota a un jefe.', st: 'jefes', meta: 1 },
  { id: 'jefes10', nom: 'Azote de titanes', desc: 'Derrota 15 jefes.', st: 'jefes', meta: 15 },
  { id: 'combo8', nom: 'Multiplicador máximo', desc: 'Llega a x8.', st: 'maxMult', meta: 8 },
  { id: 'rozes', nom: 'Equilibrista', desc: 'Roza 150 balas enemigas.', st: 'rozes', meta: 150 },
  { id: 'rico', nom: 'Magnate', desc: 'Gana 3.000 créditos en total.', st: 'creditosTotal', meta: 3000 },
  { id: 'hab', nom: 'Especialista', desc: 'Usa 50 habilidades.', st: 'habilidades', meta: 50 },
  { id: 'p25', nom: '25 mil', desc: 'Suma 25.000 puntos en una partida.', st: 'mejorPuntos', meta: 25000 },
  { id: 'p100', nom: 'Cien mil', desc: 'Suma 100.000 puntos en una partida.', st: 'mejorPuntos', meta: 100000 },
  { id: 'oleada15', nom: 'Resistencia', desc: 'Llega a la oleada 15.', st: 'mejorOleada', meta: 15 },
  { id: 'sindano', nom: 'Intocable', desc: 'Pasa 3 oleadas seguidas sin daño.', st: 'sinDano', meta: 3 },
  { id: 'armamax', nom: 'Arsenal completo', desc: 'Llega al nivel 5 de arma.', st: 'armasMax', meta: 1 },
  { id: 'diario', nom: 'Constante', desc: 'Completa un desafío diario.', st: 'diarios', meta: 1 },
  { id: 'campeon', nom: 'Campeón de Nebula', desc: 'Completa la campaña.', ev: true },
  { id: 'comprador', nom: 'Primera compra', desc: 'Compra una nave o mejora.', ev: true },
  { id: 'maxmej', nom: 'Perfeccionista', desc: 'Lleva una mejora al máximo.', ev: true },
  { id: 'flota', nom: 'Flota completa', desc: 'Desbloquea todas las naves.', ev: true },
];
