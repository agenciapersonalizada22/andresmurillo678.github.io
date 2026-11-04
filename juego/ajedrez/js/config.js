// =============================================================
//  ⚙  CONFIGURACIÓN
//  Niveles del motor, bots con personalidad, relojes, calidades y
//  valores generales.
//  prof = profundidad máxima · tiempo = ms por jugada ·
//  ruido = error aleatorio (centipeones) sobre las jugadas ·
//  azar = probabilidad de jugar al azar · apertura = ruido extra
//  en las primeras jugadas para que las partidas no sean iguales.
// =============================================================
export const NIVELES = [
  { id: 'principiante', nombre: 'Principiante', elo: 500, prof: 1, tiempo: 300, ruido: 220, azar: 0.2, apertura: 0 },
  { id: 'facil', nombre: 'Fácil', elo: 900, prof: 2, tiempo: 500, ruido: 100, azar: 0.06, apertura: 0 },
  { id: 'medio', nombre: 'Medio', elo: 1350, prof: 4, tiempo: 1000, ruido: 35, azar: 0, apertura: 0 },
  { id: 'dificil', nombre: 'Difícil', elo: 1900, prof: 8, tiempo: 2500, ruido: 0, azar: 0, apertura: 18 },
  { id: 'maestro', nombre: 'Maestro', elo: 2300, prof: 64, tiempo: 5000, ruido: 0, azar: 0, apertura: 10 },
];

// Error calibrado por Elo estimado: se interpola entre estas filas (elo, prof, tiempo, ruido, azar)
const TABLA_ELO = [
  [400, 1, 150, 300, 0.4], [600, 1, 200, 220, 0.2], [800, 2, 300, 150, 0.1], [1000, 2, 400, 100, 0.05],
  [1200, 3, 500, 65, 0.02], [1400, 4, 700, 42, 0], [1600, 5, 900, 26, 0], [1800, 6, 1200, 14, 0],
  [2000, 8, 1800, 6, 0], [2200, 12, 2500, 0, 0], [2400, 64, 4000, 0, 0],
];
export function parametrosPorElo(elo) {
  elo = Math.max(400, Math.min(2400, elo));
  let i = 0;
  while (i < TABLA_ELO.length - 2 && elo > TABLA_ELO[i + 1][0]) i++;
  const a = TABLA_ELO[i], b = TABLA_ELO[i + 1], k = (elo - a[0]) / (b[0] - a[0]);
  const l = (x, y) => x + (y - x) * k;
  return {
    prof: Math.round(l(a[1], b[1])), tiempo: Math.round(l(a[2], b[2])), ruido: Math.round(l(a[3], b[3])),
    azar: +l(a[4], b[4]).toFixed(3), apertura: elo >= 1800 ? 10 : 0,
  };
}

// Estilos: bonificaciones (centipeones) que se suman a las jugadas del motor
const ESTILOS = {
  agresivo: { cap: 45, jaque: 60, avance: 8, acerca: 14, pieza: 8, enr: -10 },
  defensivo: { cap: -5, jaque: -20, peon: 6, avance: -4, enr: 40, rey: -20, acerca: -6 },
  jugueton: { peon: 20, avance: 6, pieza: 30, rey: 30, jaque: 30, cap: 10 },
  posicional: { peon: 8, enr: 25, pieza: 6, rey: -10 },
  equilibrado: null,
};

export const BOTS = [
  { id: 'mili', nombre: 'Mili', elo: 400, estilo: 'juguetón', icono: '🐣', frase: 'Mueve casi al azar y se divierte.', estiloId: 'jugueton' },
  { id: 'tobi', nombre: 'Tobi', elo: 650, estilo: 'agresivo', icono: '🐯', frase: 'Ataca sin pensar en las consecuencias.', estiloId: 'agresivo' },
  { id: 'dona', nombre: 'Doña Paz', elo: 850, estilo: 'defensivo', icono: '🐢', frase: 'Se encierra y espera tus errores.', estiloId: 'defensivo' },
  { id: 'pip', nombre: 'Pip', elo: 1050, estilo: 'juguetón', icono: '🦜', frase: 'Prefiere jugadas raras y gambitos.', estiloId: 'jugueton' },
  { id: 'nico', nombre: 'Nico', elo: 1200, estilo: 'equilibrado', icono: '🙂', frase: 'Un rival normal de club.', estiloId: 'equilibrado' },
  { id: 'rosa', nombre: 'Rosa', elo: 1400, estilo: 'posicional', icono: '🌹', frase: 'Juega con calma y busca ventajas pequeñas.', estiloId: 'posicional' },
  { id: 'gael', nombre: 'Gael', elo: 1600, estilo: 'agresivo', icono: '🔥', frase: 'Siempre va a por tu rey.', estiloId: 'agresivo' },
  { id: 'clara', nombre: 'Clara', elo: 1800, estilo: 'defensivo', icono: '🛡', frase: 'Una muralla: casi no regala nada.', estiloId: 'defensivo' },
  { id: 'ivo', nombre: 'Maestro Ivo', elo: 2000, estilo: 'equilibrado', icono: '🎓', frase: 'Sólido y preciso.', estiloId: 'equilibrado' },
  { id: 'vega', nombre: 'Vega', elo: 2200, estilo: 'agresivo', icono: '⚡', frase: 'Calcula ataques muy profundos.', estiloId: 'agresivo' },
  { id: 'titan', nombre: 'Titán', elo: 2400, estilo: 'máximo', icono: '🤖', frase: 'Todo el poder del motor.', estiloId: 'equilibrado' },
];

// Parámetros del motor para un rival: id de nivel ('medio'...) o 'bot:<id>'
export function rivalPorId(id) {
  if (typeof id === 'string' && id.startsWith('bot:')) {
    const b = BOTS.find((x) => x.id === id.slice(4)) || BOTS[4];
    const p = parametrosPorElo(b.elo);
    return { id, nombre: b.nombre, elo: b.elo, bot: b, motor: { ...p, sesgo: ESTILOS[b.estiloId] || null, libro: b.elo >= 800 } };
  }
  const n = NIVELES.find((x) => x.id === id) || NIVELES[2];
  return { id: n.id, nombre: n.nombre, elo: n.elo, bot: null, motor: { prof: n.prof, tiempo: n.tiempo, ruido: n.ruido, azar: n.azar, apertura: n.apertura, sesgo: null, libro: n.elo >= 1200 } };
}

// Reloj: minutos y segundos de incremento por jugada (Fischer)
export const RELOJES = [
  { id: 'sin', nombre: 'Sin reloj', min: 0, inc: 0, cat: '' },
  { id: '1+0', nombre: '1 min', min: 1, inc: 0, cat: 'Bullet' },
  { id: '1+1', nombre: '1 min + 1 s', min: 1, inc: 1, cat: 'Bullet' },
  { id: '2+1', nombre: '2 min + 1 s', min: 2, inc: 1, cat: 'Bullet' },
  { id: '3+0', nombre: '3 min', min: 3, inc: 0, cat: 'Blitz' },
  { id: '3+2', nombre: '3 min + 2 s', min: 3, inc: 2, cat: 'Blitz' },
  { id: '5+0', nombre: '5 min', min: 5, inc: 0, cat: 'Blitz' },
  { id: '5+3', nombre: '5 min + 3 s', min: 5, inc: 3, cat: 'Blitz' },
  { id: '10+0', nombre: '10 min', min: 10, inc: 0, cat: 'Rápidas' },
  { id: '10+5', nombre: '10 min + 5 s', min: 10, inc: 5, cat: 'Rápidas' },
  { id: '15+10', nombre: '15 min + 10 s', min: 15, inc: 10, cat: 'Rápidas' },
  { id: '30+0', nombre: '30 min', min: 30, inc: 0, cat: 'Clásicas' },
  { id: '30+20', nombre: '30 min + 20 s', min: 30, inc: 20, cat: 'Clásicas' },
];
// "c15+5" = personalizado (15 minutos, 5 s)
export function relojPorId(id) {
  const f = RELOJES.find((r) => r.id === id);
  if (f) return f;
  const m = /^c(\d+(?:\.\d+)?)\+(\d+)$/.exec(id || '');
  if (m) return { id, nombre: `${m[1]} min + ${m[2]} s`, min: +m[1], inc: +m[2], cat: 'Personalizado' };
  return RELOJES[0];
}

// Calidades: sombras 0 = no, 1 = duras, 2 = suaves; mapa = tamaño del mapa de sombras
export const CALIDADES = [
  { id: 'baja', nombre: 'Baja', sombras: 0, antialias: false, pixelRatio: 1, mapa: 1024, textura: 512, particulas: false },
  { id: 'media', nombre: 'Media', sombras: 1, antialias: true, pixelRatio: 1.5, mapa: 1024, textura: 1024, particulas: true },
  { id: 'alta', nombre: 'Alta', sombras: 2, antialias: true, pixelRatio: 2, mapa: 2048, textura: 2048, particulas: true },
  { id: 'ultra', nombre: 'Ultra', sombras: 2, antialias: true, pixelRatio: 2.5, mapa: 4096, textura: 2048, particulas: true },
];
// Preset + ajustes sueltos del usuario (sombras: 'auto'|0|1|2, antialias: 'auto'|bool, resolucion: 0.5-1.5, particulas: 'auto'|bool)
export function calidadEfectiva(o) {
  const base = CALIDADES.find((c) => c.id === o.calidad) || CALIDADES[1];
  const c = { ...base };
  if (o.sombras !== undefined && o.sombras !== 'auto') c.sombras = +o.sombras;
  if (o.antialias !== undefined && o.antialias !== 'auto') c.antialias = !!o.antialias;
  if (o.particulas !== undefined && o.particulas !== 'auto') c.particulas = !!o.particulas;
  c.pixelRatio = Math.max(0.5, base.pixelRatio * (o.resolucion || 1));
  return c;
}

// Ventajas de pieza (handicap): se le quita al bando indicado
export const VENTAJAS = [
  { id: 'dama', nombre: 'Sin dama', quitar: ['q'] },
  { id: 'torre', nombre: 'Sin torre de dama', quitar: ['a'] },
  { id: 'caballo', nombre: 'Sin caballo', quitar: ['b'] },
  { id: 'alfil', nombre: 'Sin alfil', quitar: ['c'] },
  { id: 'peon', nombre: 'Sin peón de f', quitar: ['pf'] },
  { id: 'dospeones', nombre: 'Sin peones de f y g', quitar: ['pf', 'pg'] },
];

// Posiciones de práctica: [nombre, FEN, quién la juega, sugerencia]
export const PRACTICA = [
  ['Rey y dama contra rey', '8/8/8/4k3/8/8/3Q4/4K3 w - - 0 1', 'w', 'Da mate sin ahogar al rival.'],
  ['Rey y torre contra rey', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 'w', 'Empuja al rey al borde con la torre.'],
  ['Dos alfiles y rey contra rey', '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', 'w', 'Los alfiles y el rey trabajan juntos.'],
  ['Alfil y caballo contra rey', '8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1', 'w', 'El mate más difícil de los finales básicos.'],
  ['Rey y peón contra rey', '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1', 'w', 'Busca la oposición para coronar.'],
  ['Final de torres: posición de Lucena', '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', 'w', 'Construye el puente con la torre.'],
  ['Final de torres: defensa de Philidor', '4k3/8/r7/4P3/4K3/8/8/1R6 b - - 0 1', 'b', 'Defiende con la torre en la sexta fila: es tablas con buen juego.'],
  ['Dama contra torre', '8/8/8/8/2k5/8/5r2/3QK3 w - - 0 1', 'w', 'La dama gana, pero es larga.'],
  ['Mate del pasillo', '6k1/5ppp/8/8/8/8/5PPP/R3K3 w - - 0 1', 'w', 'Aprovecha el rey encerrado.'],
  ['Ventaja de peón pasado', '8/5pk1/6p1/3P4/6P1/5K2/8/8 w - - 0 1', 'w', 'Un peón pasado decide los finales.'],
  ['Caballo contra peones', '8/8/2k5/8/1p6/8/3NK3/8 w - - 0 1', 'w', 'Detén el peón y gana.'],
  ['Rey activo en el final', '8/p4kp1/1p3p2/8/5P2/6P1/PP4K1/8 w - - 0 1', 'w', 'Centraliza el rey.'],
];

export const CONFIG = {
  guardado: {
    partida: 'ajedrez_partida_v1',
    opciones: 'ajedrez_opciones_v1',
    stats: 'ajedrez_stats_v1',
    perfil: 'ajedrez_perfil_v1',
    biblioteca: 'ajedrez_biblioteca_v1',
    rompe: 'ajedrez_rompe_v1',
    lecciones: 'ajedrez_lecciones_v1',
  },
  tiempoMinimoIA: 450, // la IA nunca responde más rápido que esto (ms), para que se note la jugada
  animacion: { mover: 0.38, capturar: 0.35, enroque: 0.45 },
};
