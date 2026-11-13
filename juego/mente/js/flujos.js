// Flujos de juego: sesion diaria, evaluacion, entrenar juego/area, reto de 60 s, duelo por turnos y tutoriales. La partida en curso
// (mente_partida, efimera, no se sincroniza) se guarda entre juegos para ofrecer «Continuar» tras recargar.
import { CLAVES, leer, escribir, borrar, hoy } from './almacen.js';
import { AREAS, JUEGOS, juegoPorId, juegosDeArea, juegosPorArea, areaPorId } from './datos.js';
import * as Progreso from './progreso.js';
import * as Motor from './motor.js';
import { elegir } from './logica/sesiondiaria.js';
import { diaNum } from './logica/puntaje.js';
import { crearRng, semillaDeTexto } from './azar.js';
import { ir, pantallaP, confirmar, toast, confeti } from './ui.js';
import * as CM from './cuenta-mente.js';
import { Sonido } from './sonido.js';
import { D } from './ajustes.js';

const CADUCA = 12 * 3600 * 1000;
export function partidaGuardada() {
  const p = leer(CLAVES.partida, null);
  if (!p || !Array.isArray(p.cola) || p.i >= p.cola.length || Date.now() - p.t > CADUCA) return null;
  return p;
}
const guardarPartida = (p) => { p.t = Date.now(); escribir(CLAVES.partida, p); };
export const descartarPartida = () => borrar(CLAVES.partida);
export const NOMBRE_MODO = { diaria: 'Sesión diaria', evaluacion: 'Evaluación', area: 'Entrenar un área', juego: 'Entrenar un juego', reto: 'Reto rápido de 60 s', duelo: 'Duelo por turnos' };

export function sesionDelDia() {
  const est = Progreso.estadoSesion();
  return elegir({ areas: AREAS, juegosPorArea, estado: est, hoyNum: diaNum(hoy()), semilla: 'mente-' + hoy() });
}
function nivelInicial(p, e) {
  if (p.modo === 'evaluacion' || p.modo === 'duelo') return 6;
  const r = Progreso.ratingJuego(e.id);
  if (p.modo === 'reto') return Math.min(20, Math.round((r || 4) + 3));
  return r ? Math.max(1, Math.round(r)) : 3;
}
function enviarCuenta(info, res) {
  const idx = Progreso.indices(), S = Progreso.obtener();
  const v = { puntos: S.puntos, racha: Progreso.rachaInfo().mejor };
  AREAS.forEach((a) => { const n = juegosDeArea(a.id).filter((j) => (S.juegos[j.id] || {}).n > 0).length; if (idx[a.id] != null && n >= 2) v[a.id] = idx[a.id]; });
  CM.enviarPuntajes(v);
  CM.xp(5 + Math.round(res.puntos / 60));
}
export async function iniciar(modo, o = {}) {
  let cola = [];
  const extra = { ...(o.extra || {}) };
  if (modo === 'diaria') cola = sesionDelDia().juegos.map((id) => ({ id }));
  else if (modo === 'evaluacion') cola = AREAS.flatMap((a) => a.evaluar).map((id) => ({ id }));
  else if (modo === 'area') cola = Progreso.estadoSesion() && elegirArea(o.area).map((id) => ({ id }));
  else if (modo === 'juego') cola = [{ id: o.juego }];
  else if (modo === 'reto') cola = [{ id: o.juego || crearRng(Date.now()).pick(JUEGOS).id }];
  else if (modo === 'duelo') {
    const rng = crearRng(Date.now()), n = o.rondas || 1;
    const ids = o.juego && o.juego !== 'azar' ? Array(n).fill(o.juego) : rng.muestra(JUEGOS, n).map((j) => j.id);
    extra.semilla = String(Date.now()); extra.nombres = o.nombres; extra.puntos = [0, 0];
    cola = ids.flatMap((id) => [{ id, jug: 0 }, { id, jug: 1 }]);
  }
  const p = { modo, cola, i: 0, res: [], extra, t: Date.now() };
  await corrida(p);
}
function elegirArea(id) {
  const lista = juegosDeArea(id).map((j) => j.id), S = Progreso.obtener();
  return crearRng(Date.now()).barajar(lista).sort((a, b) => ((S.juegos[a] || {}).ultima || 0) - ((S.juegos[b] || {}).ultima || 0)).slice(0, 3);
}
export function reanudar() { const p = partidaGuardada(); if (p) return corrida(p); return Promise.resolve(); }

async function corrida(p) {
  while (p.i < p.cola.length) {
    const e = p.cola[p.i], juego = juegoPorId(e.id);
    guardarPartida(p);
    if (p.modo === 'duelo') { const r = await pantallaP('pase', { p, e }); if (r === 'salir') { descartarPartida(); ir('inicio', {}, { raiz: true }); return; } }
    else if (p.modo !== 'evaluacion' && (Progreso.obtener().juegos[e.id] || { tut: 0, n: 0 }).tut < 1 && !((Progreso.obtener().juegos[e.id] || {}).n) && !p.ofrecido?.[e.id]) {
      p.ofrecido = { ...(p.ofrecido || {}), [e.id]: 1 };
      if (await confirmar(`«${juego.nombre}» es nuevo para ti. ¿Quieres hacer su tutorial interactivo (3 pasos cortos)?`, { titulo: 'Tutorial', si: 'Hacer tutorial', no: 'Saltar' })) await tutorial(e.id, 1, true);
    }
    const idx = p.cola.slice(0, p.i + 1).filter((x) => x.id === e.id && (x.jug || 0) === (e.jug || 0)).length;
    const res = await Motor.jugar(juego, {
      nivel: nivelInicial(p, e), dur: 60,
      semilla: p.modo === 'duelo' ? semillaDeTexto(p.extra.semilla + e.id + Math.floor(p.i / 2)) : undefined,
      etiqueta: p.modo === 'duelo' ? (p.extra.nombres[e.jug] + ': ' + juego.nombre) : null
    });
    if (!res) { descartarPartida(); ir('inicio', {}, { raiz: true }); return; }
    res.jug = e.jug;
    p.res.push(res);
    let info = null;
    if (p.modo === 'duelo') p.extra.puntos[e.jug] += res.puntos;
    else { info = Progreso.registrarPartida(res, { modo: p.modo }); enviarCuenta(info, res); celebrar(info); p.ultimaInfo = info; }
    p.i++; guardarPartida(p);
    if (p.i < p.cola.length) {
      const r = await pantallaP('resultado', { res, info, p, siguiente: true });
      if (r === 'salir') { descartarPartida(); ir('inicio', {}, { raiz: true }); return; }
    }
  }
  await fin(p);
}
function celebrar(info) {
  if (!info) return;
  if (info.medallaNueva || info.logros.length) { Sonido.logro(); if (D.particulas) confeti(24); }
}
async function fin(p) {
  descartarPartida();
  const r = p.res;
  if (p.modo === 'diaria') {
    const d = Progreso.registrarDiaria(); CM.xp(20 + d.bono / 2); enviarCuenta(null, { puntos: 0 }); celebrar(d);
    ir('resumen', { titulo: 'Sesión diaria completada', res: r, extra: d, modo: p.modo }, { raiz: true });
  } else if (p.modo === 'evaluacion') {
    const e = Progreso.registrarEval(r); CM.xp(60); enviarCuenta(null, { puntos: 0 }); celebrar(e);
    ir('resumenEval', { ...e, res: r }, { raiz: true });
  } else if (p.modo === 'duelo') {
    const [a, b] = p.extra.puntos, gano = a !== b;
    const ln = Progreso.registrarDuelo(gano && a > b); celebrar({ logros: ln });
    ir('resumenDuelo', { p }, { raiz: true });
  } else if (p.modo === 'area') {
    ir('resumen', { titulo: 'Entrenamiento de ' + areaPorId(p.cola.length ? juegoPorId(p.cola[0].id).area : '').nombre, res: r, extra: { racha: Progreso.rachaInfo().actual, bono: 0, logros: [] }, modo: 'area' }, { raiz: true });
  } else {
    const res = r[r.length - 1];
    ir('resultado', { res, info: p.ultimaInfo || null, p, final: true }, { raiz: true });
  }
}
// Tutorial de un juego: niveles 1..3, cada uno interactivo y sin puntaje.
export async function tutorial(id, desde = 1, soloUno = false) {
  const juego = juegoPorId(id);
  let nivel = desde;
  while (nivel >= 1 && nivel <= 3) {
    const res = await Motor.jugar(juego, { tut: nivel, etiqueta: 'Tutorial ' + nivel + ' de 3' });
    if (!res) return;
    const r = Progreso.registrarTutorial(id, nivel, res.aprobado);
    celebrar(r);
    const sig = await pantallaP('tutResultado', { juego, nivel, res, r });
    if (sig === 'repetir') continue;
    if (sig === 'salir') break;
    nivel++;
    if (nivel > 3) break;
  }
  if (!soloUno) ir('juego', { id }, { reemplazar: true });
}
export async function recordatorioTick() {
  const R = D.recordatorio; if (!R.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const d = new Date(), h = hoy(d), ahora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (R.ultimo === h || ahora < R.hora || Progreso.diariaHecha()) return;
  R.ultimo = h;
  try { new Notification('Gimnasio Mental', { body: 'Tu sesión diaria de 5 juegos te espera. Es entretenimiento y práctica, a tu ritmo.', tag: 'mente-diaria' }); } catch (e) { /* sin permiso */ }
}
