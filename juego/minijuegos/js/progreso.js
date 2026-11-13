// Progreso (monedas, desbloqueos, estadisticas, logros, jugadores guardados). Clave sincronizable: minijuegos_progreso.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';
import { COLORES, FORMAS } from './marca.js';

export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana una ronda contra otro jugador o bot.' },
  { id: 'victorias_10', nombre: 'Diez victorias', desc: 'Acumula 10 rondas ganadas.' },
  { id: 'victorias_50', nombre: 'Cincuenta victorias', desc: 'Acumula 50 rondas ganadas.' },
  { id: 'rondas_100', nombre: 'Mesa fiel', desc: 'Juega 100 rondas.' },
  { id: 'campeon', nombre: 'Campeón de la mesa', desc: 'Gana un torneo o un mejor de N.' },
  { id: 'campeon_3', nombre: 'Tricampeón', desc: 'Gana 3 torneos o partidos completos.' },
  { id: 'torneo_perfecto', nombre: 'Torneo redondo', desc: 'Gana un torneo de 10 juegos con 7 o más rondas ganadas.' },
  { id: 'mesa_llena', nombre: 'Mesa llena', desc: 'Termina una ronda con 4 personas en el mismo dispositivo.' },
  { id: 'variedad_10', nombre: 'Curioso', desc: 'Juega 10 minijuegos distintos.' },
  { id: 'variedad_todos', nombre: 'Coleccionista de juegos', desc: 'Juega todos los minijuegos.' },
  { id: 'bot_dificil', nombre: 'Domador de bots', desc: 'Vence a un bot difícil.' },
  { id: 'racha_5', nombre: 'Racha de cinco', desc: 'Gana 5 rondas seguidas.' },
  { id: 'ahorrador', nombre: 'Ahorrador', desc: 'Ten 300 monedas a la vez.' },
  { id: 'coleccionista', nombre: 'Estilo propio', desc: 'Desbloquea 3 skins en la tienda.' },
  { id: 'reflejos_rapidos', nombre: 'Reflejos de gato', desc: 'Reacciona en menos de 220 ms en Saque rápido.' },
  { id: 'dedos_veloces', nombre: 'Dedos veloces', desc: 'Logra 70 toques en Carrera de toques.' },
  { id: 'multitoque', nombre: 'Todos a la vez', desc: 'Juega con 2 o más dedos a la vez en la pantalla.' },
  { id: 'con_mando', nombre: 'Mando en mano', desc: 'Juega una ronda con un mando.' },
  { id: 'practicante', nombre: 'Practicante', desc: 'Juega 5 rondas en modo práctica.' },
  { id: 'tableros', nombre: 'Estratega', desc: 'Gana Tres en raya, 4 en raya y Puntos y cajas.' }
];
const COLOR_BASE = ['#ff4d5a', '#3d8bff', '#3ddc84', '#ffd23d'];
const AV = ['🦊', '🐼', '🐸', '🐙'];
const BASE = {
  v: 1,
  jugadores: [0, 1, 2, 3].map((i) => ({ nombre: 'Jugador ' + (i + 1), color: COLOR_BASE[i], avatar: AV[i], forma: 'circulo' })),
  mesa: { humanos: 1, bots: 1, nivel: 1 },
  monedas: 0, ganadas: 0,
  compras: { colores: [], formas: [] },
  stats: { rondas: 0, victorias: 0, victoriasRank: 0, torneos: 0, campeon: 0, puntos: 0, racha: 0, mejorRacha: 0, practica: 0, mejorReaccion: 0, mejorToques: 0 },
  juegos: {},
  logros: {}
};
export const TOPE_VICTORIAS = 5000, TOPE_PUNTOS = 100000;
export const P = mezclar(BASE, leer(CLAVES.progreso, {}));
for (const k of ['juegos', 'logros']) { const o = leer(CLAVES.progreso, {})[k]; if (o && typeof o === 'object') P[k] = o; }
if (!Array.isArray(P.compras.colores)) P.compras.colores = [];
if (!Array.isArray(P.compras.formas)) P.compras.formas = [];
let dif = 0;
export const guardar = () => { clearTimeout(dif); dif = setTimeout(guardarYa, 300); };
export const guardarYa = () => { clearTimeout(dif); escribir(CLAVES.progreso, P); };
export const recargar = () => { const o = leer(CLAVES.progreso, {}); Object.assign(P, mezclar(BASE, o)); for (const k of ['juegos', 'logros']) if (o[k] && typeof o[k] === 'object') P[k] = o[k]; };

export const colorLibre = (id) => { const c = COLORES.find((x) => x.id === id); return !!c && (c.p === 0 || P.compras.colores.includes(id)); };
export const formaLibre = (id) => { const f = FORMAS.find((x) => x.id === id); return !!f && (f.p === 0 || P.compras.formas.includes(id)); };
export function comprar(tipo, id) {
  const lista = tipo === 'color' ? COLORES : FORMAS, it = lista.find((x) => x.id === id);
  const ya = tipo === 'color' ? colorLibre(id) : formaLibre(id);
  if (!it || ya || P.monedas < it.p) return false;
  P.monedas -= it.p; P.compras[tipo === 'color' ? 'colores' : 'formas'].push(id); guardar(); return true;
}
export const compradas = () => P.compras.colores.length + P.compras.formas.length;

/* Monedas virtuales por ronda: jugar 2, ganar +6, segundo puesto +2 (solo humanos; nunca dinero real). */
export const monedasRonda = (puesto, n) => (n < 2 ? 1 : 2 + (puesto === 1 ? 6 : puesto === 2 ? 2 : 0));

/* Registra una ronda completa. parts: [{slot,bot,nivel}], places por participante. Devuelve {monedas:[por participante], logros:[ids nuevos]}. */
export function registrarRonda({ juego, parts, places, practica, extra = {} }) {
  const nuevos = [], S = P.stats, n = parts.length;
  const dar = (id) => { if (!P.logros[id]) { P.logros[id] = Date.now(); nuevos.push(id); } };
  const monedas = parts.map(() => 0);
  if (practica) {
    S.practica++; if (S.practica >= 5) dar('practicante');
    guardar(); return { monedas, logros: nuevos };
  }
  const jr = P.juegos[juego] = P.juegos[juego] || { j: 0, v: 0 };
  jr.j++; S.rondas++;
  parts.forEach((p, i) => { if (!p.bot) { monedas[i] = monedasRonda(places[i], n); P.monedas += monedas[i]; P.ganadas += monedas[i]; } });
  const yo = parts.findIndex((p) => p.slot === 0 && !p.bot);
  if (yo >= 0 && n > 1) {
    const gano = places[yo] === 1 && places.some((q) => q > 1);
    if (gano) {
      jr.v++; S.victorias++; S.racha++; S.mejorRacha = Math.max(S.mejorRacha, S.racha);
      const rivales = parts.filter((_, i) => i !== yo);
      if (rivales.some((r) => !r.bot) || rivales.reduce((a, r) => a + (r.nivel || 0), 0) / rivales.length >= 1) S.victoriasRank++;
      dar('primera_victoria'); if (S.victorias >= 10) dar('victorias_10'); if (S.victorias >= 50) dar('victorias_50'); if (S.racha >= 5) dar('racha_5');
      if (rivales.some((r) => r.bot && r.nivel === 2)) dar('bot_dificil');
      if (['tres', 'cuatro', 'cajas'].every((k) => (P.juegos[k] || {}).v > 0)) dar('tableros');
    } else S.racha = 0;
  }
  if (S.rondas >= 100) dar('rondas_100');
  if (n >= 4 && parts.filter((p) => !p.bot).length >= 4) dar('mesa_llena');
  const distintos = Object.keys(P.juegos).filter((k) => P.juegos[k].j > 0).length;
  if (distintos >= 10) dar('variedad_10'); if (extra.totalJuegos && distintos >= extra.totalJuegos) dar('variedad_todos');
  if (extra.reaccionMs && extra.reaccionMs < 220) dar('reflejos_rapidos');
  if (extra.toques && extra.toques >= 70) dar('dedos_veloces');
  if (extra.multitoque) dar('multitoque');
  if (extra.mando) dar('con_mando');
  if (P.monedas >= 300) dar('ahorrador');
  guardar(); return { monedas, logros: nuevos };
}
export function registrarTorneo(T, parts) {
  const nuevos = [], S = P.stats, dar = (id) => { if (!P.logros[id]) { P.logros[id] = Date.now(); nuevos.push(id); } };
  if (T.parts.length < 2) return { monedas: 0, logros: nuevos };
  S.torneos++;
  const yo = parts.findIndex((p) => p.slot === 0 && !p.bot);
  if (yo >= 0) S.puntos = Math.min(TOPE_PUNTOS, S.puntos + T.pts[yo]);
  let monedas = 0;
  T.campeones.forEach((i) => {
    if (parts[i].bot) return;
    monedas += 20; P.monedas += 20; P.ganadas += 20;
    S.campeon++; dar('campeon'); if (S.campeon >= 3) dar('campeon_3');
    if (T.modo === 'torneo' && T.vic[i] >= 7) dar('torneo_perfecto');
  });
  if (P.monedas >= 300) dar('ahorrador');
  guardar(); return { monedas, logros: nuevos };
}
export function marcarColeccion() { if (compradas() >= 3 && !P.logros.coleccionista) { P.logros.coleccionista = Date.now(); guardar(); return ['coleccionista']; } return []; }
