// Progreso del jugador: monedas virtuales, desbloqueos, estadisticas, ligas, desafios, reto diario y logros.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';
import { BOLAS, PISTAS, LIGAS, DESAFIOS, LOGROS, fechaHoy } from './catalogo.js';

export const PUNTAJES = [
  { id: 'puntos', nombre: 'Mejor puntaje', unidad: 'puntos' },
  { id: 'strikes', nombre: 'Strikes totales', unidad: 'strikes' },
  { id: 'estrellas', nombre: 'Estrellas de desafíos', unidad: 'estrellas' },
  { id: 'diario', nombre: 'Mejor reto diario', unidad: 'puntos' }
];
const BASE = {
  v: 1, monedas: 100, bolas: ['clasica'], pistas: ['madera'], sel: { bola: 'clasica', pista: 'madera' },
  stats: { partidas: 0, terminadas: 0, victorias: 0, strikes: 0, spares: 0, pinos: 0, tiros: 0, mejor: 0, canales: 0, perfectas: 0, online: 0, ganadasOnline: 0 },
  liga: { nivel: 0, v: 0, d: 0, campeon: [] }, desafios: {}, diario: { fecha: '', mejor: 0, racha: 0, ultima: '', jugado: 0 }, logros: {},
  setup: { n: 2, tipos: ['humano', 'bot', 'bot', 'bot'], niveles: [1, 1, 1, 1], nombres: ['', 'Jugador 2', 'Jugador 3', 'Jugador 4'] }
};
export const D = mezclar(BASE, leer(CLAVES.progreso, {}));
if (!Array.isArray(D.bolas) || !D.bolas.includes('clasica')) D.bolas = ['clasica', ...(Array.isArray(D.bolas) ? D.bolas : [])];
if (!Array.isArray(D.pistas) || !D.pistas.includes('madera')) D.pistas = ['madera', ...(Array.isArray(D.pistas) ? D.pistas : [])];
for (const k of ['bolas', 'pistas']) { const u = leer(CLAVES.progreso, {})[k]; if (Array.isArray(u)) D[k] = Array.from(new Set(['clasica', 'madera', ...u].filter((x) => typeof x === 'string'))); }
const guardado = leer(CLAVES.progreso, {});
if (guardado.logros && typeof guardado.logros === 'object') D.logros = { ...guardado.logros };
if (guardado.desafios && typeof guardado.desafios === 'object') D.desafios = { ...guardado.desafios };
if (guardado.liga && Array.isArray(guardado.liga.campeon)) D.liga.campeon = guardado.liga.campeon.slice();

let obs = [], difer = 0;
export const alLogro = { fn: null };
export const suscribir = (f) => obs.push(f);
export function guardar() { clearTimeout(difer); difer = setTimeout(guardarYa, 300); obs.forEach((f) => f()); }
export function guardarYa() { clearTimeout(difer); escribir(CLAVES.progreso, D); }
export function recargar() {
  const n = mezclar(BASE, leer(CLAVES.progreso, {}));
  const g = leer(CLAVES.progreso, {});
  Object.assign(D, n);
  for (const k of ['bolas', 'pistas']) D[k] = Array.from(new Set([k === 'bolas' ? 'clasica' : 'madera', ...(Array.isArray(g[k]) ? g[k] : [])]));
  D.logros = g.logros && typeof g.logros === 'object' ? { ...g.logros } : {};
  D.desafios = g.desafios && typeof g.desafios === 'object' ? { ...g.desafios } : {};
  D.liga.campeon = g.liga && Array.isArray(g.liga.campeon) ? g.liga.campeon.slice() : [];
  obs.forEach((f) => f());
}

export function logro(id) {
  if (D.logros[id] || !LOGROS.some((l) => l.id === id)) return false;
  D.logros[id] = Date.now(); guardar();
  if (alLogro.fn) alLogro.fn(id);
  return true;
}
export function monedas(n, motivo) {
  n = Math.round(n);
  if (!n) return 0;
  D.monedas = Math.max(0, D.monedas + n); guardar();
  return n;
}
export const tiene = (tipo, id) => D[tipo === 'bola' ? 'bolas' : 'pistas'].includes(id);
export function comprar(tipo, id) {
  const lista = tipo === 'bola' ? BOLAS : PISTAS, it = lista.find((x) => x.id === id);
  if (!it || tiene(tipo, id)) return false;
  if (D.monedas < it.precio) return false;
  D.monedas -= it.precio; D[tipo === 'bola' ? 'bolas' : 'pistas'].push(id);
  logro('primera_compra');
  if (BOLAS.every((b) => D.bolas.includes(b.id))) logro('coleccionista');
  guardar();
  return true;
}
export function desbloquear(tipo, id) {
  if (tiene(tipo, id)) return;
  D[tipo === 'bola' ? 'bolas' : 'pistas'].push(id);
  if (BOLAS.every((b) => D.bolas.includes(b.id))) logro('coleccionista');
  guardar();
}
export function equipar(tipo, id) { if (tiene(tipo, id)) { D.sel[tipo] = id; guardar(); return true; } return false; }
export const bolaSel = () => BOLAS.find((b) => b.id === D.sel.bola) || BOLAS[0];
export const pistaSel = () => PISTAS.find((p) => p.id === D.sel.pista) || PISTAS[0];
export const estrellasTotal = () => Object.values(D.desafios).reduce((s, n) => s + (n | 0), 0);

export function regLanzamiento(n, split, canal) {
  D.stats.tiros++; D.stats.pinos += n; if (canal) D.stats.canales++;
  if (D.stats.pinos >= 1000) logro('mil_pinos');
  guardar();
}
export function regFinPartida(info) {
  const s = D.stats;
  s.terminadas++; s.strikes += info.strikes | 0; s.spares += info.spares | 0;
  if (info.puntos > s.mejor) s.mejor = info.puntos;
  if (info.gano) { s.victorias++; }
  if (info.puntos >= 300) s.perfectas++;
  if (s.strikes >= 100) logro('cien_strikes');
  guardar();
}

/* Desafios */
export function regDesafio(id, estrellas) {
  const previo = D.desafios[id] | 0;
  if (estrellas > previo) { D.desafios[id] = estrellas; guardar(); }
  if (estrellas > 0) logro('desafio_primero');
  if (estrellas >= 3) logro('desafio_tres_estrellas');
  if (DESAFIOS.every((d) => (D.desafios[d.id] | 0) > 0)) logro('desafios_todos');
  return Math.max(0, estrellas - previo);
}
/* Reto diario */
export const diarioHecho = (f = fechaHoy()) => D.diario.fecha === f && D.diario.jugado === 1;
export function regDiario(puntos, f = fechaHoy()) {
  const d = D.diario;
  const ayer = fechaHoy(new Date(Date.now() - 86400000));
  const primera = d.fecha !== f;
  if (primera) { d.racha = d.ultima === ayer ? d.racha + 1 : 1; d.ultima = f; d.fecha = f; d.jugado = 1; d.puntos = puntos; }
  else if (puntos > (d.puntos | 0)) d.puntos = puntos;
  if (puntos > d.mejor) d.mejor = puntos;
  logro('diario_hecho'); if (d.racha >= 7) logro('racha_diaria_7');
  guardar();
  return primera;
}
export function ligaCampeon(id) { if (!D.liga.campeon.includes(id)) D.liga.campeon.push(id); guardar(); }
export const ligaActual = () => LIGAS[Math.min(D.liga.nivel, LIGAS.length - 1)];
