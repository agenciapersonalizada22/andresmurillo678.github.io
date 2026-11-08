// Monedas virtuales y catalogo desbloqueable (puro). NUNCA dinero real.
export const CATALOGO = {
  mesas: [
    { id: 'azul', nombre: 'Clásica azul', precio: 0, color: '#1a4fa8', borde: '#ffffff' },
    { id: 'verde', nombre: 'Verde torneo', precio: 150, color: '#17794a', borde: '#ffffff' },
    { id: 'negra', nombre: 'Negra pro', precio: 300, color: '#15161c', borde: '#d9d9e6' },
    { id: 'roja', nombre: 'Roja club', precio: 450, color: '#a3243a', borde: '#ffe3e8' },
    { id: 'neon', nombre: 'Neón', precio: 800, color: '#0b0a2a', borde: '#3df5ff', brillo: true }
  ],
  paletas: [
    { id: 'clasica', nombre: 'Clásica', precio: 0, caras: ['#c3202b', '#16161a'], mango: '#c89a5b', control: 1, efecto: 1, potencia: 1, desc: 'Equilibrada.' },
    { id: 'control', nombre: 'Control pro', precio: 250, caras: ['#2a6cd6', '#16161a'], mango: '#b98a4d', control: 1.25, efecto: 1, potencia: 0.96, desc: 'Más precisión.' },
    { id: 'efecto', nombre: 'Efecto', precio: 350, caras: ['#7b3df0', '#e8e8f0'], mango: '#b98a4d', control: 1, efecto: 1.3, potencia: 0.98, desc: 'Más efecto.' },
    { id: 'potencia', nombre: 'Potencia', precio: 350, caras: ['#e8651a', '#16161a'], mango: '#8a5a2d', control: 0.95, efecto: 1, potencia: 1.1, desc: 'Más velocidad.' },
    { id: 'carbono', nombre: 'Carbono', precio: 800, caras: ['#1c1c22', '#c3202b'], mango: '#303038', control: 1.1, efecto: 1.1, potencia: 1.05, desc: 'Todo un poco mejor.' },
    { id: 'dorada', nombre: 'Dorada', precio: 1500, caras: ['#f2c14e', '#16161a'], mango: '#f2c14e', control: 1.12, efecto: 1.12, potencia: 1.06, desc: 'Edición de lujo.' }
  ],
  salas: [
    { id: 'gimnasio', nombre: 'Gimnasio', precio: 0 }, { id: 'club', nombre: 'Club nocturno', precio: 200 },
    { id: 'azotea', nombre: 'Azotea', precio: 400 }, { id: 'espacio', nombre: 'Estación espacial', precio: 800 }, { id: 'estadio', nombre: 'Estadio', precio: 1200 }
  ]
};
export const TIPOS = ['mesas', 'paletas', 'salas'];
const UNO = { mesas: 'mesa', paletas: 'paleta', salas: 'sala' };
export const item = (tipo, id) => (CATALOGO[tipo] || []).find((x) => x.id === id) || CATALOGO[tipo][0];
export const gratis = () => ({ mesas: ['azul'], paletas: ['clasica'], salas: ['gimnasio'] });
export const equipoInicial = () => ({ mesa: 'azul', paleta: 'clasica', sala: 'gimnasio' });
export const tiene = (p, tipo, id) => (p.poseidos[tipo] || []).includes(id);
export function comprar(p, tipo, id) {
  const it = (CATALOGO[tipo] || []).find((x) => x.id === id);
  if (!it) return { ok: false, motivo: 'No existe' };
  if (tiene(p, tipo, id)) return { ok: false, motivo: 'Ya lo tienes' };
  if (p.monedas < it.precio) return { ok: false, motivo: `Te faltan ${it.precio - p.monedas} monedas` };
  p.monedas -= it.precio; p.poseidos[tipo].push(id); p.stats.compras = (p.stats.compras || 0) + 1;
  return { ok: true, item: it };
}
export function equipar(p, tipo, id) {
  if (!tiene(p, tipo, id)) return false;
  p.equipo[UNO[tipo]] = id; return true;
}
export const statsPaleta = (p) => item('paletas', p.equipo.paleta);
const BONO_DIF = { facil: 8, normal: 22, dificil: 40, experto: 65 };
/* Monedas por resultado. Con tope por partida para que no se infle. */
export function recompensa(r) {
  let m = 0;
  if (r.modo === 'libre' || r.modo === 'torneo' || r.modo === 'online') {
    m += Math.min(20, r.puntosGanados || 0);
    if (r.gano) m += r.modo === 'online' ? 30 : (BONO_DIF[r.dif] || 20) * (r.dobles ? 1 : 1) * ((r.mejorDe || 1) >= 3 ? 1.4 : 1);
  } else if (r.modo === 'reto') m = Math.min(100, (r.rally || 0) * 2);
  else if (r.modo === 'entreno') m = Math.min(30, Math.floor((r.aciertos || 0) / 4));
  return Math.round(m);
}
