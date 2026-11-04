// =============================================================
//  🏅  PERFIL
//  Elo local (partidas contra el motor y online), historial,
//  estadísticas por apertura y logros.
// =============================================================
import * as Guardado from './guardado.js';

export const LOGROS = [
  { id: 'primera', nombre: 'Primera victoria', desc: 'Gana una partida contra el motor.' },
  { id: 'mate', nombre: 'Jaque mate', desc: 'Da jaque mate a cualquier rival.' },
  { id: 'rapido', nombre: 'Mate rápido', desc: 'Gana en 20 jugadas o menos.' },
  { id: 'sinDeshacer', nombre: 'Sin red', desc: 'Gana una partida puntuable (sin deshacer ni pistas) al nivel Difícil o más.' },
  { id: 'bot2000', nombre: 'Gran rival', desc: 'Vence a un bot de 1800 Elo o más.' },
  { id: 'enroque', nombre: 'Rey a salvo', desc: 'Enroca en una partida.' },
  { id: 'corona', nombre: 'Nueva dama', desc: 'Corona un peón.' },
  { id: 'p10', nombre: 'Estudiante', desc: 'Resuelve 10 rompecabezas.' },
  { id: 'p50', nombre: 'Táctico', desc: 'Resuelve 50 rompecabezas.' },
  { id: 'racha5', nombre: 'En racha', desc: 'Resuelve 5 rompecabezas seguidos.' },
  { id: 'lecciones', nombre: 'Aprendiz', desc: 'Completa 3 lecciones.' },
  { id: 'revision', nombre: 'Analista', desc: 'Revisa una partida completa con el motor.' },
  { id: 'online', nombre: 'Jugador online', desc: 'Termina una partida online.' },
  { id: 'elo1500', nombre: 'Nivel de club', desc: 'Llega a 1500 de Elo.' },
];

export function calcularElo(elo, eloRival, res, partidas) {
  const k = partidas < 20 ? 40 : 24;
  const esperado = 1 / (1 + Math.pow(10, (eloRival - elo) / 400));
  const real = res === 'v' ? 1 : res === 't' ? 0.5 : 0;
  return Math.round(k * (real - esperado));
}

// info: { res: 'v'|'t'|'d', rival, eloRival, eco, apertura, puntua, modo }
export function registrarPartida(info) {
  const p = Guardado.cargarPerfil();
  let delta = 0;
  let eloAhora = p.elo;
  if (info.puntua && info.online) {
    const e = p.extra.eloOnline || 1200, n = p.extra.partidasOnline || 0;
    delta = calcularElo(e, info.eloRival, info.res, n); eloAhora = Math.max(100, e + delta);
    p.extra.eloOnline = eloAhora; p.extra.partidasOnline = n + 1;
  } else if (info.puntua) { delta = calcularElo(p.elo, info.eloRival, info.res, p.partidas); p.elo = Math.max(100, p.elo + delta); p.partidas++; eloAhora = p.elo; }
  p.historial.push({ f: Date.now(), r: info.res, rival: info.rival, er: info.eloRival, d: delta, eco: info.eco || '', ap: info.apertura || '', m: info.modo || 'ia', p: info.puntua ? 1 : 0 });
  if (p.historial.length > 200) p.historial.splice(0, p.historial.length - 200);
  if (info.eco) {
    const a = p.aperturas[info.eco] || { n: info.apertura, v: 0, t: 0, d: 0 };
    a[info.res]++; a.n = info.apertura; p.aperturas[info.eco] = a;
  }
  Guardado.guardarPerfil(p);
  return { delta, elo: eloAhora };
}

// Concede un logro la primera vez; devuelve su definición o null
export function otorgar(id) {
  const p = Guardado.cargarPerfil();
  if (p.logros[id]) return null;
  const d = LOGROS.find((l) => l.id === id);
  if (!d) return null;
  p.logros[id] = Date.now();
  Guardado.guardarPerfil(p);
  return d;
}

export function sumarExtra(clave, n = 1) {
  const p = Guardado.cargarPerfil();
  p.extra[clave] = (p.extra[clave] || 0) + n;
  Guardado.guardarPerfil(p);
  return p.extra[clave];
}
