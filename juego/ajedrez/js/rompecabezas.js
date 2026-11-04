// =============================================================
//  🧩  ROMPECABEZAS
//  Selección progresiva por Elo, rachas, puzle del día y sesión de
//  resolución. Los datos están en datos/puzzles.js:
//  [fen, solución uci (jugador, respuesta, jugador...), tipo, dificultad, alternativas a la 1ª jugada]
// =============================================================
import { PUZZLES } from './datos/puzzles.js';
import * as Guardado from './guardado.js';

export const TIPOS = { m1: 'Mate en 1', m2: 'Mate en 2', m3: 'Mate en 3', x: 'Táctica' };
export const MODOS = [
  { id: 'progresivo', nombre: 'Progresivo', desc: 'Se adapta a tu nivel y sube poco a poco.' },
  { id: 'm1', nombre: 'Mate en 1', desc: 'Encuentra el jaque mate.' },
  { id: 'm2', nombre: 'Mate en 2', desc: 'Mate forzado en dos jugadas.' },
  { id: 'm3', nombre: 'Mate en 3', desc: 'Mate forzado en tres jugadas.' },
  { id: 'x', nombre: 'Tácticas', desc: 'Gana material con una combinación.' },
  { id: 'racha', nombre: 'Racha', desc: 'Sigue hasta fallar 3 veces; cada vez más difícil.' },
  { id: 'diario', nombre: 'Del día', desc: 'Un puzzle nuevo cada día.' },
];

export const todos = () => PUZZLES.map((p, i) => ({ id: i, fen: p[0], sol: p[1].split(' '), tipo: p[2], r: p[3], alt: p[4] ? p[4].split(' ') : [] }));
let cache = null;
export const lista = () => cache || (cache = todos());

export function elegir(modo, rompe, excluir = -1) {
  const L = lista();
  let c = L;
  if (['m1', 'm2', 'm3', 'x'].includes(modo)) c = L.filter((p) => p.tipo === modo);
  let objetivo = rompe.elo;
  if (modo === 'racha') objetivo = 600 + 90 * (rompe.rachaActual || 0);
  if (modo === 'diario') {
    const d = new Date(); const k = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    return L[(k * 2654435761 >>> 0) % L.length];
  }
  const sin = c.filter((p) => !rompe.resueltos[p.id] && p.id !== excluir);
  const base = sin.length >= 5 ? sin : c.filter((p) => p.id !== excluir);
  base.sort((a, b) => Math.abs(a.r - objetivo) - Math.abs(b.r - objetivo));
  const top = base.slice(0, 6);
  return top[Math.floor(Math.random() * top.length)];
}

// Cambio de Elo del jugador al resolver (ok) o fallar un puzzle de dificultad r
export function nuevoElo(elo, r, ok) {
  const esperado = 1 / (1 + Math.pow(10, (r - elo) / 400));
  return Math.round(elo + 28 * ((ok ? 1 : 0) - esperado));
}

export function registrar(rompe, p, ok, modo) {
  const e0 = rompe.elo;
  rompe.total++;
  if (ok) { rompe.aciertos++; rompe.resueltos[p.id] = 1; rompe.racha++; rompe.mejorRacha = Math.max(rompe.mejorRacha, rompe.racha); } else { rompe.fallados[p.id] = 1; rompe.racha = 0; }
  if (modo !== 'diario') rompe.elo = Math.max(300, nuevoElo(rompe.elo, p.r, ok));
  Guardado.guardarRompe(rompe);
  return rompe.elo - e0;
}

// ¿La jugada del usuario (uci) es válida en el paso `paso` (índice en sol)?
// mateInmediato: la jugada da mate (sirve en el último paso de cualquier puzzle de mate)
export function jugadaValida(p, paso, uci, mateInmediato) {
  if (p.sol[paso] === uci) return true;
  if (paso === 0 && p.alt.includes(uci)) return true;
  if (p.tipo !== 'x' && paso === p.sol.length - 1 && mateInmediato) return true;
  return false;
}
