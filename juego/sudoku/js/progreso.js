// Progreso (sudoku_progreso): estadisticas por dificultad, rachas, diario, semanal, logros y puntajes de la plataforma.
import { CLAVES, leer, escribir } from './almacen.js';
import { fechaLocal, diasEntre } from './formato.js';
import { VARIANTES, NIVELES } from './variantes.js';

export const TIEMPO_MIN = 15; // un tiempo menor se considera imposible y no entra al ranking
export const PUNTAJES = [
  ...NIVELES.map((n) => ({ id: 'tiempo_' + n.id, nombre: n.nombre + ' (tiempo)', mayorEsMejor: false, tope: 36000, min: TIEMPO_MIN, unidad: 's' })),
  { id: 'diario', nombre: 'Reto diario (tiempo)', mayorEsMejor: false, tope: 36000, min: TIEMPO_MIN, unidad: 's' },
  { id: 'racha_diaria', nombre: 'Racha diaria', mayorEsMejor: true, tope: 3650, unidad: 'días' },
  { id: 'victorias', nombre: 'Victorias', mayorEsMejor: true, tope: 100000, unidad: '' },
  { id: 'contrarreloj', nombre: 'Contrarreloj (puntos)', mayorEsMejor: true, tope: 100000, unidad: 'pts' },
  { id: 'maraton', nombre: 'Maratón (puntos)', mayorEsMejor: true, tope: 100000, unidad: 'pts' }
];
export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Resuelve tu primer Sudoku.' },
  { id: 'victorias_10', nombre: 'Aficionado', desc: 'Gana 10 partidas.' },
  { id: 'victorias_50', nombre: 'Veterano', desc: 'Gana 50 partidas.' },
  { id: 'victorias_200', nombre: 'Maestro del Sudoku', desc: 'Gana 200 partidas.' },
  { id: 'sin_ayudas', nombre: 'Por mi cuenta', desc: 'Gana sin pistas, sin autocomprobación y sin resolver.' },
  { id: 'sin_errores', nombre: 'Impecable', desc: 'Gana Medio o más difícil sin errores ni ayudas.' },
  { id: 'relampago', nombre: 'Relámpago', desc: 'Gana Principiante (clásico) en menos de 2:00 sin ayudas.' },
  { id: 'veloz', nombre: 'Veloz', desc: 'Gana Fácil (clásico) en menos de 4:00 sin ayudas.' },
  { id: 'buen_ritmo', nombre: 'A buen ritmo', desc: 'Gana Medio (clásico) en menos de 8:00 sin ayudas.' },
  { id: 'dificil_ok', nombre: 'Duro de pelar', desc: 'Gana un Sudoku Difícil.' },
  { id: 'experto_ok', nombre: 'Experto', desc: 'Gana un Sudoku Experto.' },
  { id: 'demonio_ok', nombre: 'Domador de demonios', desc: 'Gana un Sudoku Demonio.' },
  { id: 'demonio_limpio', nombre: 'Demonio sin trampa', desc: 'Gana un Demonio sin errores ni ayudas.' },
  { id: 'var_cuatro', nombre: 'Peque genio', desc: 'Gana un 4×4.' },
  { id: 'var_seis', nombre: 'Seis y listo', desc: 'Gana un 6×6.' },
  { id: 'var_diagonal', nombre: 'En diagonal', desc: 'Gana un Sudoku Diagonal.' },
  { id: 'var_killer', nombre: 'Cazador de jaulas', desc: 'Gana un Sudoku Killer.' },
  { id: 'var_irregular', nombre: 'Piezas irregulares', desc: 'Gana un Sudoku Irregular.' },
  { id: 'var_hipercubo', nombre: 'Hipercubo', desc: 'Gana un Sudoku Hipercubo.' },
  { id: 'todas_variantes', nombre: 'Políglota', desc: 'Gana al menos una vez en cada variante.' },
  { id: 'diario_ok', nombre: 'Reto cumplido', desc: 'Completa un Reto diario.' },
  { id: 'diario_7', nombre: 'Constancia', desc: 'Racha de 7 días en el Reto diario.' },
  { id: 'diario_30', nombre: 'Hábito', desc: 'Racha de 30 días en el Reto diario.' },
  { id: 'semanal_1', nombre: 'Desafío superado', desc: 'Completa un desafío semanal.' },
  { id: 'semanal_3', nombre: 'Semana perfecta', desc: 'Completa los 3 desafíos de una semana.' },
  { id: 'contrarreloj_ok', nombre: 'Contra el reloj', desc: 'Resuelve un Sudoku en modo Contrarreloj.' },
  { id: 'sin_vidas_perdidas', nombre: 'Sin fallar', desc: 'Gana en modo Sin errores sin perder ninguna vida.' },
  { id: 'maraton_5', nombre: 'Corredor', desc: 'Resuelve 5 puzzles en una Maratón.' },
  { id: 'maraton_12', nombre: 'Maratonista', desc: 'Completa los 12 puzzles de la Maratón.' },
  { id: 'racha_5', nombre: 'En racha', desc: 'Encadena 5 victorias seguidas.' },
  { id: 'racha_15', nombre: 'Imparable', desc: 'Encadena 15 victorias seguidas.' },
  { id: 'pegado_ok', nombre: 'Del papel a la pantalla', desc: 'Resuelve un puzzle pegado desde texto.' },
  { id: 'aprendiz', nombre: 'Alumno aplicado', desc: 'Mira un puzzle resuelto paso a paso.' }
];

export const vacio = () => ({ v: 1, stats: {}, jugadas: 0, victorias: 0, racha: { actual: 0, mejor: 0 }, diario: {}, rachaDiaria: { actual: 0, mejor: 0, ultima: '' }, semanal: {}, logros: {}, variantes: {}, maraton: { mejor: 0, puzzles: 0 }, contrarreloj: { mejor: 0, victorias: 0 }, xp: 0 });
export const P = Object.assign(vacio(), leer(CLAVES.progreso, {}));
export const guardar = () => escribir(CLAVES.progreso, P);
export function recargar() { Object.assign(P, vacio(), leer(CLAVES.progreso, {})); }
export const claveStat = (v, n) => v + ':' + n;
export const stat = (v, n) => P.stats[claveStat(v, n)] || { jugadas: 0, victorias: 0, mejor: 0, suma: 0, racha: 0, mejorRacha: 0 };

/* r = {variante, nivel, modo, tiempo (s), errores, pistas, ayudado, gano, semanal?, fecha?, puntos?, puzzlesMaraton?, sinPerderVidas?, pegado?} */
export function registrar(r) {
  const nuevos = [], pun = [];
  const dar = (id) => { if (!P.logros[id]) { P.logros[id] = Date.now(); nuevos.push(id); } };
  const k = claveStat(r.variante, r.nivel), s = P.stats[k] = Object.assign({ jugadas: 0, victorias: 0, mejor: 0, suma: 0, racha: 0, mejorRacha: 0 }, P.stats[k]);
  let mejoro = false;
  if (!r.pegado) P.jugadas++;
  s.jugadas++;
  if (!r.gano) { s.racha = 0; P.racha.actual = 0; guardar(); return { nuevos, pun, mejoro, xp: 0 }; }
  const t = Math.round(r.tiempo), limpio = !r.ayudado;
  P.victorias++; s.victorias++; s.suma += t;
  s.racha++; s.mejorRacha = Math.max(s.mejorRacha, s.racha);
  P.racha.actual++; P.racha.mejor = Math.max(P.racha.mejor, P.racha.actual);
  if (limpio && (!s.mejor || t < s.mejor)) { s.mejor = t; mejoro = true; }
  P.variantes[r.variante] = (P.variantes[r.variante] || 0) + 1;
  const clasico = r.variante === 'clasico';
  if (limpio && clasico && t >= TIEMPO_MIN && !r.pegado && (r.modo === 'libre' || r.modo === 'sinerrores')) pun.push({ modo: 'tiempo_' + NIVELES[r.nivel].id, valor: t });
  if (r.modo === 'diario') {
    const f = r.fecha || fechaLocal();
    if (limpio && (!P.diario[f] || t < P.diario[f])) P.diario[f] = t; else if (!P.diario[f]) P.diario[f] = 0;
    const rd = P.rachaDiaria;
    if (rd.ultima !== f) { rd.actual = rd.ultima && diasEntre(rd.ultima, f) === 1 ? rd.actual + 1 : 1; rd.ultima = f; rd.mejor = Math.max(rd.mejor, rd.actual); }
    dar('diario_ok'); if (rd.actual >= 7) dar('diario_7'); if (rd.actual >= 30) dar('diario_30');
    if (limpio && t >= TIEMPO_MIN) pun.push({ modo: 'diario', valor: P.diario[f] || t });
    pun.push({ modo: 'racha_diaria', valor: rd.actual });
  }
  if (r.modo === 'semanal' && r.semanal) {
    const w = P.semanal[r.semanal.semana] = P.semanal[r.semanal.semana] || {};
    if (!w[r.semanal.id] || t < w[r.semanal.id]) w[r.semanal.id] = t;
    dar('semanal_1'); if ([0, 1, 2].every((i) => w[i] != null)) dar('semanal_3');
  }
  if (r.modo === 'contrarreloj') { dar('contrarreloj_ok'); P.contrarreloj.victorias++; if (r.puntos > P.contrarreloj.mejor) P.contrarreloj.mejor = r.puntos; if (clasico) pun.push({ modo: 'contrarreloj', valor: r.puntos }); }
  if (r.modo === 'sinerrores' && r.sinPerderVidas) dar('sin_vidas_perdidas');
  if (r.pegado) dar('pegado_ok');
  pun.push({ modo: 'victorias', valor: P.victorias });
  dar('primera_victoria');
  if (P.victorias >= 10) dar('victorias_10'); if (P.victorias >= 50) dar('victorias_50'); if (P.victorias >= 200) dar('victorias_200');
  if (limpio) dar('sin_ayudas');
  if (limpio && r.errores === 0 && r.nivel >= 2) dar('sin_errores');
  if (limpio && clasico) { if (r.nivel === 0 && t < 120) dar('relampago'); if (r.nivel === 1 && t < 240) dar('veloz'); if (r.nivel === 2 && t < 480) dar('buen_ritmo'); }
  if (r.nivel >= 3) dar('dificil_ok'); if (r.nivel >= 4) dar('experto_ok'); if (r.nivel >= 5) { dar('demonio_ok'); if (limpio && r.errores === 0) dar('demonio_limpio'); }
  const mapaVar = { cuatro: 'var_cuatro', seis: 'var_seis', diagonal: 'var_diagonal', killer: 'var_killer', irregular: 'var_irregular', hipercubo: 'var_hipercubo' };
  if (mapaVar[r.variante]) dar(mapaVar[r.variante]);
  if (VARIANTES.every((x) => P.variantes[x.id])) dar('todas_variantes');
  if (P.racha.actual >= 5) dar('racha_5'); if (P.racha.actual >= 15) dar('racha_15');
  const xp = Math.min(200, (10 + r.nivel * 10) * (limpio ? 1.5 : 1) * (r.modo === 'diario' ? 2 : 1)) | 0;
  P.xp += xp;
  guardar();
  return { nuevos, pun, mejoro, xp };
}
export function registrarMaraton(puzzles, puntos) {
  const nuevos = [], pun = [];
  P.maraton.puzzles = Math.max(P.maraton.puzzles, puzzles);
  if (puntos > P.maraton.mejor) P.maraton.mejor = puntos;
  const dar = (id) => { if (!P.logros[id]) { P.logros[id] = Date.now(); nuevos.push(id); } };
  if (puzzles >= 5) dar('maraton_5'); if (puzzles >= 12) dar('maraton_12');
  if (puntos > 0) pun.push({ modo: 'maraton', valor: puntos });
  guardar();
  return { nuevos, pun };
}
export function logroManual(id) { if (P.logros[id]) return false; P.logros[id] = Date.now(); guardar(); return true; }
