// Progreso local (clave mente_progreso, sincronizable): historial por juego, indices por area, racha diaria, monedas, logros, medallas y tienda.
// Los puntajes son relativos a TU historial; no hay baremos poblacionales ni se afirma medir inteligencia.
import { CLAVES, leer, escribir, hoy as hoyFn } from './almacen.js';
const hoy = (d) => hoyFn(d);
import { JUEGOS, AREAS, juegosDeArea, juegosPorArea } from './datos.js';
import * as P from './logica/puntaje.js';

export const LOGROS = [
  { id: 'primera_partida', nombre: 'Primer paso', desc: 'Termina tu primer minijuego.' },
  { id: 'tutorial_listo', nombre: 'Aprendiz', desc: 'Completa los 3 niveles del tutorial de un juego.' },
  { id: 'tutoriales_5', nombre: 'Estudioso', desc: 'Completa el tutorial de 5 juegos.' },
  { id: 'eval_inicial', nombre: 'Punto de partida', desc: 'Termina la evaluación inicial de 10 minutos.' },
  { id: 'eval_mensual', nombre: 'Un mes después', desc: 'Termina una reevaluación mensual.' },
  { id: 'mejora_eval', nombre: 'Progreso medible', desc: 'Mejora tu nivel medio en una reevaluación.' },
  { id: 'diaria_1', nombre: 'Rutina', desc: 'Completa tu primera sesión diaria de 5 juegos.' },
  { id: 'racha_3', nombre: 'Tres días', desc: 'Mantén una racha diaria de 3 días.' },
  { id: 'racha_7', nombre: 'Semana mental', desc: 'Mantén una racha diaria de 7 días.' },
  { id: 'racha_30', nombre: 'Constancia', desc: 'Mantén una racha diaria de 30 días.' },
  { id: 'juegos_5', nombre: 'Curioso', desc: 'Juega 5 minijuegos distintos.' },
  { id: 'juegos_todos', nombre: 'Explorador', desc: 'Juega todos los minijuegos al menos una vez.' },
  { id: 'areas_todas', nombre: 'Mente completa', desc: 'Consigue un índice en las 5 áreas.' },
  { id: 'bronce_1', nombre: 'Primera medalla', desc: 'Consigue una medalla de bronce.' },
  { id: 'plata_1', nombre: 'Plata', desc: 'Consigue una medalla de plata.' },
  { id: 'oro_1', nombre: 'Oro', desc: 'Consigue una medalla de oro.' },
  { id: 'oro_5', nombre: 'Cinco oros', desc: 'Consigue 5 medallas de oro.' },
  { id: 'medallas_12', nombre: 'Coleccionista', desc: 'Reúne 12 medallas de cualquier tipo.' },
  { id: 'nivel_10', nombre: 'Nivel diez', desc: 'Alcanza el nivel 10 en un juego.' },
  { id: 'nivel_15', nombre: 'Nivel quince', desc: 'Alcanza el nivel 15 en un juego.' },
  { id: 'sin_fallos', nombre: 'Sin fallos', desc: 'Haz 10 o más aciertos sin ningún error en un juego.' },
  { id: 'puntos_1000', nombre: 'Mil puntos', desc: 'Suma 1000 puntos en total.' },
  { id: 'puntos_10000', nombre: 'Diez mil', desc: 'Suma 10000 puntos en total.' },
  { id: 'puntos_50000', nombre: 'Cincuenta mil', desc: 'Suma 50000 puntos en total.' },
  { id: 'partidas_25', nombre: 'Veinticinco', desc: 'Juega 25 minijuegos.' },
  { id: 'partidas_100', nombre: 'Centenario', desc: 'Juega 100 minijuegos.' },
  { id: 'reto_1', nombre: 'Contrarreloj', desc: 'Completa un reto rápido de 60 segundos.' },
  { id: 'duelo_1', nombre: 'Cara a cara', desc: 'Juega un duelo por turnos.' },
  { id: 'duelo_gana', nombre: 'Gana el duelo', desc: 'Gana un duelo contra un amigo.' },
  { id: 'tienda_1', nombre: 'Primera compra', desc: 'Desbloquea algo en la tienda con monedas virtuales.' },
  { id: 'monedas_500', nombre: 'Ahorrador', desc: 'Reúne 500 monedas virtuales en total.' },
  { id: 'superandote', nombre: 'Superándote', desc: 'Supera el 90 % de tu propio historial en un juego (con 10 partidas o más).' }
];
export const PUNTAJES = [
  { id: 'memoria', nombre: 'Índice de memoria', mayorEsMejor: true, tope: 1000, unidad: 'pts' },
  { id: 'atencion', nombre: 'Índice de atención', mayorEsMejor: true, tope: 1000, unidad: 'pts' },
  { id: 'velocidad', nombre: 'Índice de velocidad', mayorEsMejor: true, tope: 1000, unidad: 'pts' },
  { id: 'flexibilidad', nombre: 'Índice de flexibilidad', mayorEsMejor: true, tope: 1000, unidad: 'pts' },
  { id: 'logica', nombre: 'Índice de lógica y cálculo', mayorEsMejor: true, tope: 1000, unidad: 'pts' },
  { id: 'racha', nombre: 'Racha diaria máxima', mayorEsMejor: true, tope: 1000, unidad: 'días' },
  { id: 'puntos', nombre: 'Puntos totales', mayorEsMejor: true, tope: 2000000, unidad: 'pts' }
];
export const TIENDA = [
  { id: 'tema_noche', tipo: 'tema', nombre: 'Noche', precio: 0, nota: 'Predeterminado' },
  { id: 'tema_claro', tipo: 'tema', nombre: 'Claro', precio: 0, nota: 'Fondo claro de alto contraste' },
  { id: 'tema_oceano', tipo: 'tema', nombre: 'Océano', precio: 200 }, { id: 'tema_bosque', tipo: 'tema', nombre: 'Bosque', precio: 200 },
  { id: 'tema_atardecer', tipo: 'tema', nombre: 'Atardecer', precio: 300 }, { id: 'tema_grafito', tipo: 'tema', nombre: 'Grafito (negro puro)', precio: 150 },
  { id: 'son_suave', tipo: 'sonido', nombre: 'Suave', precio: 0, nota: 'Predeterminado' },
  { id: 'son_campanas', tipo: 'sonido', nombre: 'Campanas', precio: 150 }, { id: 'son_madera', tipo: 'sonido', nombre: 'Madera', precio: 150 },
  { id: 'emb_ninguno', tipo: 'emblema', nombre: 'Sin emblema', precio: 0, glifo: '' },
  { id: 'emb_hoja', tipo: 'emblema', nombre: 'Hoja', precio: 80, glifo: '☘' }, { id: 'emb_estrella', tipo: 'emblema', nombre: 'Estrella', precio: 120, glifo: '★' },
  { id: 'emb_luna', tipo: 'emblema', nombre: 'Luna', precio: 150, glifo: '☾' }, { id: 'emb_sol', tipo: 'emblema', nombre: 'Sol', precio: 200, glifo: '☀' },
  { id: 'emb_ancla', tipo: 'emblema', nombre: 'Ancla', precio: 250, glifo: '⚓' }, { id: 'emb_flor', tipo: 'emblema', nombre: 'Flor', precio: 300, glifo: '✿' }
];
const ESTADO = () => ({
  v: 1, creado: Date.now(), juegos: {}, idx: {}, puntos: 0, monedas: 0, gastadas: 0, dias: [], mejorRacha: 0, eval: [], logros: {}, comprados: {}, equipado: { tema: 'tema_noche', sonido: 'son_suave', emblema: 'emb_ninguno' },
  duelos: { jugados: 0, ganados: 0 }, retos: {}, partidas: 0, segundos: 0, avisoVisto: false
});
function cargar() { const o = leer(CLAVES.progreso, null); return o && typeof o === 'object' && o.juegos ? { ...ESTADO(), ...o, duelos: { ...ESTADO().duelos, ...(o.duelos || {}) }, equipado: { ...ESTADO().equipado, ...(o.equipado || {}) } } : ESTADO(); }
let S = cargar(), diferido = 0;
const oyentes = [], alLogroCb = [];
export const alCambiar = (f) => oyentes.push(f);
export const alLogro = (f) => alLogroCb.push(f);
export const obtener = () => S;
export function recargar() { S = cargar(); oyentes.forEach((f) => f()); }
export function guardar() { clearTimeout(diferido); diferido = setTimeout(guardarYa, 150); oyentes.forEach((f) => f()); }
export function guardarYa() { clearTimeout(diferido); escribir(CLAVES.progreso, S); }
export function reemplazar(o) { S = { ...ESTADO(), ...o }; guardarYa(); oyentes.forEach((f) => f()); }
export function borrarTodo() { S = ESTADO(); guardarYa(); oyentes.forEach((f) => f()); }
addEventListener('pagehide', guardarYa);
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

const J = (id) => S.juegos[id] || (S.juegos[id] = { n: 0, mejor: 0, rating: null, mejorEst: 0, hist: [], ultima: 0, tut: 0 });
export const ratingJuego = (id) => (S.juegos[id] && S.juegos[id].rating) || null;
export const medallaJuego = (id) => P.medalla((S.juegos[id] || {}).mejorEst || 0);
export function indices() { const o = {}; AREAS.forEach((a) => { o[a.id] = areaIdx(a.id); }); return o; }
function areaIdx(a) { return P.indiceArea(juegosDeArea(a).map((j) => ratingJuego(j.id))); }
export const indiceActual = (a) => areaIdx(a);
export const historialArea = (a) => (S.idx[a] || []);
export const historialJuego = (id) => ((S.juegos[id] || {}).hist || []);
export function conteoMedallas() { const c = { oro: 0, plata: 0, bronce: 0 }; JUEGOS.forEach((j) => { const m = medallaJuego(j.id); if (m) c[m]++; }); return c; }
const gana = (n) => { S.monedas += n; };

function otorgar(id) {
  if (S.logros[id]) return false;
  S.logros[id] = Date.now(); gana(20); alLogroCb.forEach((f) => { try { f(id); } catch (e) { /* hook externo */ } });
  return true;
}
function revisarLogros(ctx = {}) {
  const nuevos = [], t = (id, ok) => { if (ok && otorgar(id)) nuevos.push(id); };
  const jugados = Object.values(S.juegos).filter((j) => j.n > 0), med = conteoMedallas(), rach = P.rachaActual(S.dias, hoy());
  t('primera_partida', S.partidas >= 1);
  t('tutorial_listo', Object.values(S.juegos).some((j) => j.tut >= 3));
  t('tutoriales_5', Object.values(S.juegos).filter((j) => j.tut >= 3).length >= 5);
  t('eval_inicial', S.eval.length >= 1);
  t('eval_mensual', S.eval.length >= 2);
  t('mejora_eval', !!ctx.mejoraEval);
  t('diaria_1', S.dias.length >= 1);
  t('racha_3', rach >= 3 || S.mejorRacha >= 3); t('racha_7', S.mejorRacha >= 7); t('racha_30', S.mejorRacha >= 30);
  t('juegos_5', jugados.length >= 5); t('juegos_todos', jugados.length >= JUEGOS.length);
  t('areas_todas', AREAS.every((a) => areaIdx(a.id) != null));
  t('bronce_1', med.oro + med.plata + med.bronce >= 1); t('plata_1', med.oro + med.plata >= 1); t('oro_1', med.oro >= 1); t('oro_5', med.oro >= 5);
  t('medallas_12', med.oro + med.plata + med.bronce >= 12);
  t('nivel_10', jugados.some((j) => j.mejorEst >= 10)); t('nivel_15', jugados.some((j) => j.mejorEst >= 15));
  t('sin_fallos', !!ctx.sinFallos);
  t('puntos_1000', S.puntos >= 1000); t('puntos_10000', S.puntos >= 10000); t('puntos_50000', S.puntos >= 50000);
  t('partidas_25', S.partidas >= 25); t('partidas_100', S.partidas >= 100);
  t('reto_1', Object.keys(S.retos).length >= 1);
  t('duelo_1', S.duelos.jugados >= 1); t('duelo_gana', S.duelos.ganados >= 1);
  t('tienda_1', S.gastadas > 0);
  t('monedas_500', S.monedas + S.gastadas >= 500);
  t('superandote', !!ctx.superandote);
  return nuevos;
}
// Registra una partida terminada (no tutorial, no duelo). Devuelve datos para la pantalla de resultados.
export function registrarPartida(res, op = {}) {
  const j = J(res.id), antesMed = P.medalla(j.mejorEst), pctJuego = P.percentil(res.puntos, j.hist.map((x) => x.p));
  j.n++; j.mejor = Math.max(j.mejor, res.puntos); j.ultima = Date.now();
  if (!res.pocos || j.rating == null) j.rating = P.suavizar(j.rating, res.nivelEst);
  j.mejorEst = Math.max(j.mejorEst, res.nivelEst);
  j.hist.push({ t: Date.now(), p: res.puntos, nv: res.nivelEst, pr: Math.round(res.precision * 100), m: op.modo || '' }); if (j.hist.length > 80) j.hist.shift();
  const area = res.area, ah = (S.idx[area] = S.idx[area] || []);
  const nuevoIdx = areaIdx(area), pctArea = P.percentil(nuevoIdx == null ? 0 : nuevoIdx, ah.map((x) => x.v));
  if (nuevoIdx != null) { ah.push({ t: Date.now(), v: nuevoIdx }); if (ah.length > 120) ah.shift(); }
  S.puntos += res.puntos; S.partidas++; S.segundos += Math.round(res.dur || 0);
  const coins = P.monedasPartida(res.puntos); gana(coins);
  if (op.modo === 'reto') S.retos[res.id] = Math.max(S.retos[res.id] || 0, res.puntos);
  const ahora = P.medalla(j.mejorEst), orden = { bronce: 1, plata: 2, oro: 3 };
  const medallaNueva = ahora && (!antesMed || orden[ahora] > orden[antesMed]) ? ahora : null;
  const nuevos = revisarLogros({ sinFallos: res.aciertos >= 10 && res.errores === 0, superandote: !pctJuego.calibrando && pctJuego.n >= 10 && pctJuego.pct >= 90 });
  guardar();
  return { pctJuego, pctArea, idxArea: nuevoIdx, monedas: coins, medallaNueva, logros: nuevos, rating: j.rating };
}
export function registrarTutorial(id, nivel, aprobado) {
  const j = J(id); let coins = 0;
  if (aprobado && nivel > j.tut) { j.tut = nivel; coins = 5; gana(coins); }
  const nuevos = revisarLogros(); guardar(); return { monedas: coins, logros: nuevos };
}
export function registrarDiaria() {
  const h = hoy(); let bono = 0;
  if (!S.dias.includes(h)) { S.dias.push(h); if (S.dias.length > 400) S.dias.shift(); bono = 25 + Math.min(P.rachaActual(S.dias, h), 10) * 2; gana(bono); }
  S.mejorRacha = Math.max(S.mejorRacha, P.mejorRacha(S.dias));
  const nuevos = revisarLogros(); guardar(); return { bono, racha: P.rachaActual(S.dias, h), logros: nuevos };
}
export const diariaHecha = () => S.dias.includes(hoy());
export const rachaInfo = () => ({ actual: P.rachaActual(S.dias, hoy()), mejor: Math.max(S.mejorRacha, P.mejorRacha(S.dias)), hoy: diariaHecha() });
// Evaluacion (inicial o mensual): promedia el nivel estimado de las partidas evaluadas por area.
export function registrarEval(res) {
  const porArea = {};
  res.forEach((r) => { (porArea[r.area] = porArea[r.area] || []).push(r.nivelEst); });
  const idx = {}; let suma = 0, n = 0;
  AREAS.forEach((a) => { const v = porArea[a.id]; if (v && v.length) { idx[a.id] = P.indiceArea(v); suma += idx[a.id]; n++; } });
  const prom = n ? Math.round(suma / n) : 0, previa = S.eval[S.eval.length - 1] || null;
  const reg = { t: Date.now(), tipo: S.eval.length ? 'mensual' : 'inicial', idx, prom };
  S.eval.push(reg); gana(50);
  const nuevos = revisarLogros({ mejoraEval: !!previa && prom > previa.prom }); guardar();
  return { reg, previa, logros: nuevos };
}
export function evaluacionPendiente() {
  if (!S.eval.length) return 'inicial';
  return (Date.now() - S.eval[S.eval.length - 1].t) / 86400000 >= 30 ? 'mensual' : null;
}
export const diasParaReeval = () => (S.eval.length ? Math.max(0, Math.ceil(30 - (Date.now() - S.eval[S.eval.length - 1].t) / 86400000)) : 0);
export function registrarDuelo(gano) { S.duelos.jugados++; if (gano) S.duelos.ganados++; const n = revisarLogros(); guardar(); return n; }
export function estadoSesion() {
  const areas = {}, juegos = {};
  AREAS.forEach((a) => {
    const ult = juegosDeArea(a.id).map((j) => (S.juegos[j.id] || {}).ultima || 0).reduce((x, y) => Math.max(x, y), 0);
    areas[a.id] = { idx: areaIdx(a.id), ultimoDia: ult ? P.diaNum(hoy(new Date(ult))) : null };
  });
  JUEGOS.forEach((j) => { juegos[j.id] = { ultima: (S.juegos[j.id] || {}).ultima || 0 }; });
  return { areas, juegos };
}
export const posee = (id) => { const it = TIENDA.find((x) => x.id === id); return !!it && (it.precio === 0 || !!S.comprados[id]); };
export function comprar(id) {
  const it = TIENDA.find((x) => x.id === id);
  if (!it || posee(id) || S.monedas < it.precio) return false;
  S.monedas -= it.precio; S.gastadas += it.precio; S.comprados[id] = 1; const n = revisarLogros(); guardar(); return { ok: true, logros: n };
}
export function equipar(id) { const it = TIENDA.find((x) => x.id === id); if (!it || !posee(id)) return false; S.equipado[it.tipo] = id; guardar(); return true; }
