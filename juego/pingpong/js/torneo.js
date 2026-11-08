// Torneo por rondas contra bots (puro y serializable).
import { crearRng } from './bots.js';
export const RIVALES = [
  { id: 'lalo', nombre: 'Lalo', estilo: 'defensor', color: '#7ad7ff' }, { id: 'mei', nombre: 'Mei', estilo: 'equilibrado', color: '#ff9ad5' },
  { id: 'kenji', nombre: 'Kenji', estilo: 'atacante', color: '#ff6b4a' }, { id: 'sofia', nombre: 'Sofía', estilo: 'efectos', color: '#b69cff' },
  { id: 'bruno', nombre: 'Bruno', estilo: 'bloqueador', color: '#6dff9a' }, { id: 'ana', nombre: 'Ana', estilo: 'equilibrado', color: '#ffd23d' },
  { id: 'tomas', nombre: 'Tomás', estilo: 'atacante', color: '#ff8a3d' }, { id: 'yuri', nombre: 'Yuri', estilo: 'efectos', color: '#3df5ff' },
  { id: 'rocco', nombre: 'Rocco', estilo: 'defensor', color: '#c0c0d0' }, { id: 'nadia', nombre: 'Nadia', estilo: 'bloqueador', color: '#ff5fa0' },
  { id: 'dante', nombre: 'Dante', estilo: 'atacante', color: '#ff3d5a' }, { id: 'luna', nombre: 'Luna', estilo: 'efectos', color: '#8cf5d0' }
];
const ESCALERA = { facil: ['facil', 'facil', 'normal'], normal: ['facil', 'normal', 'dificil'], dificil: ['normal', 'dificil', 'experto'], experto: ['dificil', 'experto', 'experto'] };
export const NOMBRE_RONDA = { 8: ['Cuartos de final', 'Semifinal', 'Final'], 4: ['Semifinal', 'Final'] };

export function crearTorneo(tam = 8, nivel = 'normal', semilla = Date.now()) {
  const rng = crearRng(semilla), pool = RIVALES.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const n = tam === 4 ? 2 : 3, esc = ESCALERA[nivel] || ESCALERA.normal, dif = esc.slice(3 - n);
  const rondas = Array.from({ length: n }, (_, i) => ({ nombre: NOMBRE_RONDA[tam][i], rival: pool[i].id, dif: dif[i], mejorDe: i === n - 1 ? 5 : 3, resultado: null }));
  return { v: 1, tam, nivel, semilla, rondas, idx: 0, estado: 'en_curso' };
}
export const rivalDe = (id) => RIVALES.find((r) => r.id === id) || RIVALES[0];
export const rondaActual = (t) => (t && t.estado === 'en_curso' ? t.rondas[t.idx] : null);
export function registrar(t, gano, marcador) {
  if (!t || t.estado !== 'en_curso') return t;
  t.rondas[t.idx].resultado = { gano: !!gano, marcador: marcador || '' };
  if (!gano) t.estado = 'eliminado';
  else if (t.idx >= t.rondas.length - 1) t.estado = 'campeon';
  else t.idx++;
  return t;
}
export const premioTorneo = (t) => (t.estado === 'campeon' ? { monedas: 120 + (t.tam === 8 ? 80 : 0) + ({ facil: 0, normal: 30, dificil: 70, experto: 120 }[t.nivel] || 0) } : { monedas: 0 });
