// Progreso local: monedas virtuales, tienda (mesas y tacos), estadisticas, racha y logros. Ids estables para registrarlos en la plataforma.
import { CLAVES, leer, escribir, mezclar } from './almacen.js';

export const LOGROS = [
  { id: 'primera_victoria', nombre: 'Primera victoria', desc: 'Gana una partida.' },
  { id: 'bola8_ganada', nombre: 'Maestro de la 8', desc: 'Gana una partida de bola 8.' },
  { id: 'bola9_ganada', nombre: 'Nueve de nueve', desc: 'Gana una partida de bola 9.' },
  { id: 'carambola_ganada', nombre: 'Carambolista', desc: 'Gana una partida de carambola.' },
  { id: 'tres_bandas_ganada', nombre: 'Tres bandas', desc: 'Gana una partida de 3 bandas.' },
  { id: 'saque_embolsa', nombre: 'Saque potente', desc: 'Embolsa una bola en el saque.' },
  { id: 'tres_seguidas', nombre: 'Tres seguidas', desc: 'Embolsa 3 bolas en un mismo turno.' },
  { id: 'limpia_mesa', nombre: 'Limpia mesa', desc: 'Gana una bola 9 sin que el rival tire tras tu saque.' },
  { id: 'racha_3', nombre: 'En racha', desc: 'Gana 3 partidas seguidas.' },
  { id: 'racha_10', nombre: 'Imparable', desc: 'Gana 10 partidas seguidas.' },
  { id: 'vs_profesional', nombre: 'Domador de profesionales', desc: 'Gana a un bot Profesional.' },
  { id: 'sin_faltas', nombre: 'Partida limpia', desc: 'Gana una partida de pool sin cometer ninguna falta.' },
  { id: 'combo', nombre: 'Combinada', desc: 'Embolsa una bola tocando antes otra distinta (bola 9 a la 9).' },
  { id: 'carambola_serie_3', nombre: 'Serie de tres', desc: 'Anota 3 carambolas seguidas.' },
  { id: 'banda_cinco', nombre: 'Cinco bandas', desc: 'Anota una carambola con 5 o más bandas.' },
  { id: 'online_ganada', nombre: 'Mesa de amigos', desc: 'Gana una partida online contra otra persona.' },
  { id: 'cuatro_jugadores', nombre: 'Mesa llena', desc: 'Gana una bola 9 de 4 jugadores.' },
  { id: 'tienda_primera', nombre: 'Estrenando mesa', desc: 'Compra tu primer artículo de la tienda.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 25 partidas.' },
  { id: 'cien_bolas', nombre: 'Cien bolas', desc: 'Embolsa 100 bolas en total.' }
];
export const PUNTAJES = [
  { id: 'victorias', nombre: 'Partidas ganadas', mayorEsMejor: true, tope: 100000, unidad: 'victorias' },
  { id: 'racha', nombre: 'Mejor racha de victorias', mayorEsMejor: true, tope: 500, unidad: 'seguidas' }
];

export const MESAS = [
  { id: 'clasica', nombre: 'Clásica verde', precio: 0, tela: '#0c7a43', borde: '#5a3418', cojin: '#0a6a39' },
  { id: 'torneo', nombre: 'Torneo azul', precio: 300, tela: '#1b5fa8', borde: '#2c2c33', cojin: '#164f8f' },
  { id: 'burdeos', nombre: 'Burdeos', precio: 450, tela: '#8a1f2d', borde: '#3b2415', cojin: '#751a26' },
  { id: 'grafito', nombre: 'Grafito', precio: 600, tela: '#3c4350', borde: '#15151a', cojin: '#323844' },
  { id: 'esmeralda', nombre: 'Esmeralda y nogal', precio: 800, tela: '#0d9a62', borde: '#7a4a24', cojin: '#0b8452' },
  { id: 'neon', nombre: 'Neón violeta', precio: 1400, tela: '#4b2fa6', borde: '#0d0a1f', cojin: '#3e2689', brillo: '#7c5cff' }
];
export const TACOS = [
  { id: 'arce', nombre: 'Arce clásico', precio: 0, color: '#d9b77a', punta: '#3a6ea5' },
  { id: 'ebano', nombre: 'Ébano', precio: 250, color: '#2b2118', punta: '#c9b99a' },
  { id: 'rojo', nombre: 'Rojo carmesí', precio: 350, color: '#a8282f', punta: '#f1e7d0' },
  { id: 'carbono', nombre: 'Fibra de carbono', precio: 650, color: '#1b1d22', punta: '#2fd6ff' },
  { id: 'dorado', nombre: 'Dorado', precio: 1200, color: '#d9a62b', punta: '#fff3c0' },
  { id: 'neon', nombre: 'Neón', precio: 900, color: '#7c5cff', punta: '#3df5ff' }
];

const BASE = {
  partidas: 0, victorias: 0, derrotas: 0, racha: 0, mejorRacha: 0, victoriasRank: 0, embolsadas: 0, carambolas: 0, faltas: 0, tiros: 0,
  monedas: 150, ganadasPorModo: {}, mejorSerieCarom: 0, mpVictorias: 0, logros: {},
  poseidos: { mesas: ['clasica'], tacos: ['arce'] }, equipo: { mesa: 'clasica', taco: 'arce' }
};
let datos = mezclar(BASE, leer(CLAVES.progreso, {}));
const u = leer(CLAVES.progreso, {});
if (u.poseidos) { datos.poseidos = { mesas: Array.from(new Set(['clasica', ...(u.poseidos.mesas || [])])), tacos: Array.from(new Set(['arce', ...(u.poseidos.tacos || [])])) }; }
let observadores = [];
const nuevos = [];

export const Progreso = {
  get datos() { return datos; },
  recargar() { datos = mezclar(BASE, leer(CLAVES.progreso, {})); const q = leer(CLAVES.progreso, {}); if (q.poseidos) datos.poseidos = { mesas: Array.from(new Set(['clasica', ...(q.poseidos.mesas || [])])), tacos: Array.from(new Set(['arce', ...(q.poseidos.tacos || [])])) }; avisar(); },
  guardar() { escribir(CLAVES.progreso, datos); },
  suscribir(fn) { observadores.push(fn); },
  logro(id) {
    if (datos.logros[id]) return false;
    datos.logros[id] = Date.now(); nuevos.push(id); Progreso.guardar(); avisar(); return true;
  },
  tomarNuevos() { return nuevos.splice(0); },
  comprar(tipo, id) {
    const lista = tipo === 'mesas' ? MESAS : TACOS, it = lista.find((x) => x.id === id);
    if (!it || datos.poseidos[tipo].includes(id)) return { ok: false, msg: 'Ya lo tienes.' };
    if (datos.monedas < it.precio) return { ok: false, msg: 'Te faltan ' + (it.precio - datos.monedas) + ' monedas.' };
    datos.monedas -= it.precio; datos.poseidos[tipo].push(id);
    Progreso.logro('tienda_primera'); Progreso.guardar(); avisar();
    return { ok: true, msg: 'Comprado: ' + it.nombre };
  },
  equipar(tipo, id) {
    if (!datos.poseidos[tipo].includes(id)) return false;
    datos.equipo[tipo === 'mesas' ? 'mesa' : 'taco'] = id; Progreso.guardar(); avisar(); return true;
  },
  mesa() { return MESAS.find((m) => m.id === datos.equipo.mesa) || MESAS[0]; },
  taco() { return TACOS.find((t) => t.id === datos.equipo.taco) || TACOS[0]; }
};
function avisar() { observadores.forEach((f) => f()); }

/* Cierra una partida: res = {modo, ganador, yo (asiento), n, nivelMax, online, humanos, tiros, embolsadas, faltasYo, carambolas, serieMax, bolasSaque, tresSeguidas, bandasMax, apertura, combo}. */
export function registrarPartida(res) {
  const d = datos, gana = res.ganador === res.yo;
  d.partidas++;
  d.tiros += res.tiros | 0; d.embolsadas += res.embolsadas | 0; d.carambolas += res.carambolas | 0; d.faltas += res.faltasYo | 0;
  d.mejorSerieCarom = Math.max(d.mejorSerieCarom, res.serieMax | 0);
  let monedas = 15 + Math.min(40, (res.embolsadas | 0) * 3 + (res.carambolas | 0) * 3);
  const cuenta = res.online || res.nivelMax >= 2; // contra bots Principiante no cuenta para el ranking ni para la racha
  if (gana) {
    d.victorias++; if (cuenta) { d.victoriasRank++; d.racha++; d.mejorRacha = Math.max(d.mejorRacha, d.racha); }
    d.ganadasPorModo[res.modo] = (d.ganadasPorModo[res.modo] || 0) + 1;
    monedas += 45 + (res.online ? 40 : (res.nivelMax - 1) * 20);
    if (res.online) d.mpVictorias++;
  } else { d.derrotas++; if (cuenta) d.racha = 0; }
  d.monedas += Math.round(monedas);
  const L = Progreso.logro;
  if (gana) {
    L('primera_victoria');
    ({ bola8: 'bola8_ganada', bola9: 'bola9_ganada', libre: 'carambola_ganada', tres_bandas: 'tres_bandas_ganada' })[res.modo] && L(({ bola8: 'bola8_ganada', bola9: 'bola9_ganada', libre: 'carambola_ganada', tres_bandas: 'tres_bandas_ganada' })[res.modo]);
    if (res.nivelMax >= 3 && !res.online) L('vs_profesional');
    if (res.online && res.humanos > 1) L('online_ganada');
    if (res.modo === 'bola9' && res.n === 4) L('cuatro_jugadores');
    if ((res.modo === 'bola8' || res.modo === 'bola9') && !res.faltasYo) L('sin_faltas');
    if (res.modo === 'bola9' && res.apertura9) L('limpia_mesa');
  }
  if (res.bolasSaque) L('saque_embolsa');
  if (res.tresSeguidas) L('tres_seguidas');
  if (res.combo) L('combo');
  if ((res.serieMax | 0) >= 3) L('carambola_serie_3');
  if ((res.bandasMax | 0) >= 5) L('banda_cinco');
  if (d.racha >= 3) L('racha_3');
  if (d.racha >= 10) L('racha_10');
  if (d.partidas >= 25) L('veterano');
  if (d.embolsadas >= 100) L('cien_bolas');
  Progreso.guardar(); avisar();
  return Math.round(monedas);
}
