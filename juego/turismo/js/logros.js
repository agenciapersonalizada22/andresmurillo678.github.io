// Logros y estadisticas locales (ids estables). Se guardan en `turismo_progreso`.
import { leer, guardar, CLAVES } from './almacen.js';
import { POR_CONT, DESTINOS, TRANSPORTES } from './datos.js';
import { patrimonio } from './reglas.js';
import * as Nube from './nube.js';

export const LOGROS = [
  { id: 'primer_destino', nombre: 'Primer destino', desc: 'Compra tu primer destino.' },
  { id: 'continente_completo', nombre: 'Dueño del continente', desc: 'Reúne los 4 destinos de un continente.' },
  { id: 'hotel_resort', nombre: 'Resort de lujo', desc: 'Construye un hotel resort.' },
  { id: 'subasta_ganada', nombre: 'Mejor postor', desc: 'Gana una subasta.' },
  { id: 'visa_continental', nombre: 'Visa continental', desc: 'Reúne los 4 sellos de un continente.' },
  { id: 'sellos_10', nombre: 'Trotamundos', desc: 'Reúne 10 sellos en una partida.' },
  { id: 'vuelta_al_mundo', nombre: 'Vuelta al mundo', desc: 'Reúne los 24 sellos del pasaporte.' },
  { id: 'primer_vuelo', nombre: 'Primer vuelo', desc: 'Toma una ruta aérea.' },
  { id: 'maquinista', nombre: 'Maquinista', desc: 'Viaja en tren.' },
  { id: 'capitan', nombre: 'Capitán', desc: 'Viaja en crucero.' },
  { id: 'rutas_todas', nombre: 'Ruta completa', desc: 'Usa vuelo, tren y crucero en una misma partida.' },
  { id: 'temporada_alta', nombre: 'Buen momento', desc: 'Cobra una renta durante una temporada alta.' },
  { id: 'dobles_retencion', nombre: 'Dobles de la fortuna', desc: 'Sal de la retención sacando dobles.' },
  { id: 'redes_transporte', nombre: 'Magnate del transporte', desc: 'Posee los 6 aeropuertos, trenes y puertos.' },
  { id: 'tiburon', nombre: 'Tiburón', desc: 'Lleva a la bancarrota a otro jugador.' },
  { id: 'fortuna', nombre: 'Gran fortuna', desc: 'Alcanza 5000 de patrimonio.' },
  { id: 'victoria', nombre: 'Gran viajero', desc: 'Gana una partida.' },
  { id: 'victoria_rapida', nombre: 'Pasaporte exprés', desc: 'Gana una partida en modo rápido.' },
  { id: 'victoria_bots', nombre: 'Domador de bots', desc: 'Gana contra 3 o más bots.' },
  { id: 'mesa_compartida', nombre: 'Mesa compartida', desc: 'Termina una partida con 2 o más humanos.' },
  { id: 'resiliente', nombre: 'Resiliente', desc: 'Gana habiendo hipotecado 3 destinos o más.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 10 partidas.' }
];
export const MODOS_PUNTAJE = [
  { id: 'patrimonio_final', nombre: 'Patrimonio final (victorias)', mayorEsMejor: true, unidad: 'monedas' },
  { id: 'sellos_partida', nombre: 'Sellos en una victoria', mayorEsMejor: true, unidad: 'sellos' },
  { id: 'victorias', nombre: 'Victorias totales', mayorEsMejor: true, unidad: 'victorias' }
];
const base = () => ({ v: 1, logros: {}, stats: { partidas: 0, victorias: 0, quiebras: 0, mejorPatrimonio: 0, turnosTotales: 0, hipotecas: 0, sellosTotales: 0, vuelos: 0, trenes: 0, cruceros: 0 }, records: {} });
export const progreso = Object.assign(base(), leer(CLAVES.progreso, null) || {});
progreso.stats = Object.assign(base().stats, progreso.stats || {}); progreso.logros = progreso.logros || {}; progreso.records = progreso.records || {};
const avisos = [];
export const alLogro = (fn) => avisos.push(fn);
const salvar = () => guardar(CLAVES.progreso, progreso);
function dar(id) {
  if (progreso.logros[id]) return;
  progreso.logros[id] = Date.now(); salvar();
  Nube.logro(id);
  const l = LOGROS.find((x) => x.id === id); avisos.forEach((f) => f(l));
}
let hip = 0, usadas = {};
export function nuevaPartida() { hip = 0; usadas = {}; }
// Evalua los eventos de un paso desde la perspectiva del asiento `yo`
export function evento(ev, e, yo) {
  if (yo < 0) return;
  for (const v of ev) {
    if (v.t === 'compra' && v.j === yo) { dar('primer_destino'); if (v.subasta) dar('subasta_ganada'); }
    if (v.t === 'construir' && v.j === yo && !v.vende && v.c === 4) dar('hotel_resort');
    if (v.t === 'hipoteca' && v.j === yo && v.h) { hip++; progreso.stats.hipotecas++; }
    if (v.t === 'quiebra' && v.a === yo) dar('tiburon');
    if (v.t === 'visa' && v.j === yo) dar('visa_continental');
    if (v.t === 'sello' && v.j === yo) { progreso.stats.sellosTotales++; }
    if (v.t === 'renta' && v.a === yo && e.eventos.some((x) => x.tipo === 'alta' && x.cont >= 0 && POR_CONT[x.cont].includes(v.i))) dar('temporada_alta');
    if (v.t === 'ruta' && v.j === yo) {
      usadas[v.modo] = 1;
      if (v.modo === 'aire') { dar('primer_vuelo'); progreso.stats.vuelos++; } else if (v.modo === 'tren') { dar('maquinista'); progreso.stats.trenes++; } else { dar('capitan'); progreso.stats.cruceros++; }
      if (usadas.aire && usadas.tren && usadas.mar) dar('rutas_todas');
    }
    if (v.t === 'libre' && v.j === yo && ev.some((x) => x.t === 'log' && /sale de la retención con dobles/.test(x.x))) dar('dobles_retencion');
  }
  const p = e.jug[yo];
  if (p.sellos.length >= 10) dar('sellos_10');
  if (p.sellos.length >= DESTINOS.length) dar('vuelta_al_mundo');
  const mias = e.prop.map((q, i) => (q && q.o === yo ? i : -1)).filter((i) => i >= 0);
  if (TRANSPORTES.every((i) => mias.includes(i))) dar('redes_transporte');
  if (POR_CONT.some((g) => g.every((i) => mias.includes(i)))) dar('continente_completo');
  const pat = patrimonio(e, yo);
  if (pat >= 5000) dar('fortuna');
  if (pat > progreso.stats.mejorPatrimonio) { progreso.stats.mejorPatrimonio = pat; salvar(); }
}
let finRep = null;
export function finPartida(e, yo, humanos) {
  if (yo < 0 || finRep === e.id) return;
  finRep = e.id;
  const gano = e.ganador === yo, s = progreso.stats;
  s.partidas++; s.turnosTotales += e.turnoN; if (e.jug[yo].quebrado) s.quiebras++;
  if (s.partidas >= 10) dar('veterano');
  if (humanos >= 2) dar('mesa_compartida');
  if (gano) {
    s.victorias++; dar('victoria');
    if (e.cfg.modo === 'rapido') dar('victoria_rapida');
    if (e.jug.filter((p) => p.tipo === 'bot').length >= 3) dar('victoria_bots');
    if (hip >= 3) dar('resiliente');
    const pat = patrimonio(e, yo), sel = e.jug[yo].sellos.length;
    progreso.records.patrimonio_final = Math.max(progreso.records.patrimonio_final || 0, pat);
    progreso.records.sellos_partida = Math.max(progreso.records.sellos_partida || 0, sel);
    progreso.records.victorias = s.victorias;
  }
  salvar();
  Nube.finPartida(gano, gano ? patrimonio(e, yo) : 0, gano ? e.jug[yo].sellos.length : 0, s.victorias, e);
}
