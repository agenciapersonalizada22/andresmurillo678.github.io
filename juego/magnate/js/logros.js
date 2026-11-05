// Logros y estadisticas locales (ids estables). Se guardan en `magnate_progreso`.
import { leer, guardar, CLAVES } from './almacen.js';
import { POR_GRUPO, ESTACIONES, SERVICIOS } from './datos.js';
import { patrimonio } from './reglas.js';

export const LOGROS = [
  { id: 'primera_compra', nombre: 'Primer paso', desc: 'Compra tu primera propiedad.' },
  { id: 'barrio_completo', nombre: 'Barrio completo', desc: 'Reúne todas las calles de un barrio.' },
  { id: 'hotel', nombre: 'Rascacielos', desc: 'Construye un hotel.' },
  { id: 'subasta_ganada', nombre: 'Mejor postor', desc: 'Gana una subasta.' },
  { id: 'trato_cerrado', nombre: 'Buen negociante', desc: 'Cierra un intercambio con otro jugador.' },
  { id: 'dobles_carcel', nombre: 'Dobles de la fortuna', desc: 'Sal de la cárcel sacando dobles.' },
  { id: 'aeropuertos', nombre: 'Rey del aire', desc: 'Posee los 4 aeropuertos y estaciones.' },
  { id: 'servicios', nombre: 'Luz y agua', desc: 'Posee los 2 servicios.' },
  { id: 'tiburon', nombre: 'Tiburón', desc: 'Lleva a la bancarrota a otro jugador.' },
  { id: 'fortuna', nombre: 'Gran fortuna', desc: 'Alcanza 5000 de patrimonio.' },
  { id: 'victoria', nombre: 'Magnate', desc: 'Gana una partida.' },
  { id: 'victoria_bots', nombre: 'Domador de bots', desc: 'Gana contra 3 o más bots.' },
  { id: 'mesa_compartida', nombre: 'Mesa compartida', desc: 'Termina una partida con 2 o más humanos.' },
  { id: 'resiliente', nombre: 'Resiliente', desc: 'Gana habiendo hipotecado 3 propiedades o más.' },
  { id: 'veterano', nombre: 'Veterano', desc: 'Juega 10 partidas.' }
];
export const MODOS_PUNTAJE = [
  { id: 'patrimonio_final', nombre: 'Patrimonio final (victorias)', mayorEsMejor: true, unidad: 'monedas' },
  { id: 'turnos_victoria', nombre: 'Victoria más rápida', mayorEsMejor: false, unidad: 'turnos' },
  { id: 'victorias', nombre: 'Victorias totales', mayorEsMejor: true, unidad: 'victorias' }
];
const base = () => ({ v: 1, logros: {}, stats: { partidas: 0, victorias: 0, quiebras: 0, mejorPatrimonio: 0, mejorTurnos: 0, turnosTotales: 0, hipotecas: 0 }, records: {} });
export const progreso = Object.assign(base(), leer(CLAVES.progreso, null) || {});
const avisos = [];
export const alLogro = (fn) => avisos.push(fn);
const salvar = () => guardar(CLAVES.progreso, progreso);
function dar(id) {
  if (progreso.logros[id]) return;
  progreso.logros[id] = Date.now(); salvar();
  const l = LOGROS.find((x) => x.id === id); avisos.forEach((f) => f(l));
}
let hip = 0;
export function nuevaPartida() { hip = 0; }
// Evalua los eventos de un paso desde la perspectiva del asiento `yo`
export function evento(ev, e, yo) {
  if (yo < 0) return;
  for (const v of ev) {
    if (v.t === 'compra' && v.j === yo) { dar('primera_compra'); if (v.subasta) dar('subasta_ganada'); }
    if (v.t === 'construir' && v.j === yo && !v.vende && v.c === 5) dar('hotel');
    if (v.t === 'trato' && (v.de === yo || v.a === yo)) dar('trato_cerrado');
    if (v.t === 'hipoteca' && v.j === yo && v.h) { hip++; progreso.stats.hipotecas++; }
    if (v.t === 'quiebra' && v.a === yo) dar('tiburon');
  }
  const ds = ev.find((v) => v.t === 'dados' && v.j === yo);
  const p = e.jug[yo];
  if (ds && ds.d[0] === ds.d[1] && !p.carcel && ev.some((v) => v.t === 'log' && /sale de la cárcel con dobles/.test(v.x))) dar('dobles_carcel');
  const mias = e.prop.map((q, i) => (q && q.o === yo ? i : -1)).filter((i) => i >= 0);
  if (ESTACIONES.every((i) => mias.includes(i))) dar('aeropuertos');
  if (SERVICIOS.every((i) => mias.includes(i))) dar('servicios');
  if (POR_GRUPO.some((g) => g.every((i) => mias.includes(i)))) dar('barrio_completo');
  const pat = patrimonio(e, yo);
  if (pat >= 5000) dar('fortuna');
  if (pat > progreso.stats.mejorPatrimonio) { progreso.stats.mejorPatrimonio = pat; salvar(); }
}
export function finPartida(e, yo, humanos) {
  if (yo < 0) return;
  const gano = e.ganador === yo, s = progreso.stats;
  s.partidas++; s.turnosTotales += e.turnoN; if (e.jug[yo].quebrado) s.quiebras++;
  if (s.partidas >= 10) dar('veterano');
  if (humanos >= 2) dar('mesa_compartida');
  if (gano) {
    s.victorias++; dar('victoria');
    if (e.jug.filter((p) => p.tipo === 'bot').length >= 3) dar('victoria_bots');
    if (hip >= 3) dar('resiliente');
    const pat = patrimonio(e, yo);
    progreso.records.patrimonio_final = Math.max(progreso.records.patrimonio_final || 0, pat);
    progreso.records.turnos_victoria = progreso.records.turnos_victoria ? Math.min(progreso.records.turnos_victoria, e.turnoN) : e.turnoN;
    progreso.records.victorias = s.victorias;
  }
  salvar();
}
