// Reglas (sin DOM): bola 8, bola 9 (hasta 4 jugadores por turnos) y carambola (libre / 3 bandas). Estado serializable.
import { nuevaBola, nuevoEstado, TIPOS } from './fisica.js';

export const MODOS = {
  bola8: { id: 'bola8', nombre: 'Bola 8', tipo: 'pool', max: 2, desc: 'Lisas (1-7) contra rayadas (9-15). Embolsa tu grupo y luego la 8.' },
  bola9: { id: 'bola9', nombre: 'Bola 9', tipo: 'pool', max: 4, desc: 'Toca siempre la bola más baja. Gana quien embolsa la 9 legalmente.' },
  tres_bandas: { id: 'tres_bandas', nombre: 'Carambola 3 bandas', tipo: 'carambola', max: 2, desc: 'Tu blanca debe tocar las otras dos bolas y 3 bandas antes de la segunda.' },
  libre: { id: 'libre', nombre: 'Carambola libre', tipo: 'carambola', max: 2, desc: 'Tu blanca debe tocar las otras dos bolas. Sin bandas obligatorias.' }
};
export const esCarom = (modo) => MODOS[modo].tipo === 'carambola';
export const grupoDe = (id) => (id >= 1 && id <= 7 ? 'lisas' : id >= 9 && id <= 15 ? 'rayadas' : null);

export function rng(semilla) {
  let a = (semilla >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const barajar = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

/* ---------- colocacion inicial ---------- */
export function armar(modo, semilla = 1) {
  const m = MODOS[modo], T = TIPOS[m.tipo], R = T.R, r = rng(semilla);
  if (m.tipo === 'carambola') {
    const x = T.L / 4;
    return nuevoEstado('carambola', [nuevaBola(0, -x, -0.2), nuevaBola(1, -x, 0.2), nuevaBola(2, x, 0)]);
  }
  const bolas = [nuevaBola(0, -T.L / 4, 0)];
  const dx = Math.sqrt(3) * R * 1.0006, dy = R * 1.0006 * 2, x0 = T.L / 4;
  let filas;
  if (modo === 'bola8') {
    const resto = barajar([2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14], r);
    const [e1, e2] = r() < 0.5 ? [6, 15] : [15, 6]; // esquinas: una lisa y una rayada
    filas = [[1], [resto[0], resto[1]], [resto[2], 8, resto[3]], [resto[4], resto[5], resto[6], resto[7]], [e1, resto[8], resto[9], resto[10], e2]];
  } else {
    const resto = barajar([2, 3, 4, 5, 6, 7, 8], r);
    filas = [[1], [resto[0], resto[1]], [resto[2], 9, resto[3]], [resto[4], resto[5]], [resto[6]]];
  }
  filas.forEach((f, i) => f.forEach((id, j) => bolas.push(nuevaBola(id, x0 + i * dx, (j - (f.length - 1) / 2) * dy))));
  return nuevoEstado('pool', bolas);
}

/* ---------- partida ---------- */
export function nuevaPartida({ modo, n = 2, objetivo = 15 }) {
  const m = MODOS[modo];
  n = Math.max(2, Math.min(m.max, n));
  const carom = m.tipo === 'carambola';
  return {
    modo, n, turno: 0, fase: carom ? 'juego' : 'saque', mano: carom ? null : 'cabecera',
    grupos: [null, null], mesa: carom ? [] : (modo === 'bola8' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] : [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    puntos: new Array(n).fill(0), faltas: new Array(n).fill(0), objetivo: carom ? objetivo : 0, ganador: -1, motivo: '', tiros: 0, entradas: 1
  };
}
export const idBlanca = (E) => (esCarom(E.modo) ? E.turno % 2 : 0);

export function grupoLimpio(E, p) {
  const g = E.grupos[p];
  return !!g && !E.mesa.some((id) => grupoDe(id) === g);
}
/* Bolas que el jugador en turno puede tocar primero sin falta. */
export function objetivos(E) {
  if (esCarom(E.modo)) return [0, 1, 2].filter((i) => i !== idBlanca(E));
  if (E.modo === 'bola9') return [Math.min(...E.mesa)];
  const p = E.turno, g = E.grupos[p];
  if (E.fase === 'saque') return E.mesa.slice();
  if (!g) return E.mesa.filter((id) => id !== 8);
  if (grupoLimpio(E, p)) return [8];
  return E.mesa.filter((id) => grupoDe(id) === g);
}

/* Resume el registro de eventos de fisica para las reglas. */
export function analizar(eventos, blanca) {
  const r = { primero: -1, contactos: [], embolsadas: [], blancaEmb: false, bandaTrasContacto: false, bolasABanda: [], bandasBlanca: 0, bandasAntes2: -1 };
  for (const e of eventos) {
    if (e.k === 'bola') {
      if (e.a !== blanca && e.b !== blanca) continue;
      const o = e.a === blanca ? e.b : e.a;
      if (!r.contactos.includes(o)) {
        r.contactos.push(o);
        if (r.contactos.length === 1) r.primero = o;
        if (r.contactos.length === 2) r.bandasAntes2 = r.bandasBlanca;
      }
    } else if (e.k === 'banda') {
      if (r.primero !== -1) r.bandaTrasContacto = true;
      if (e.a === blanca) r.bandasBlanca++; else if (!r.bolasABanda.includes(e.a)) r.bolasABanda.push(e.a);
    } else if (e.k === 'tronera') {
      if (e.a === blanca) r.blancaEmb = true; else r.embolsadas.push(e.a);
    }
  }
  return r;
}

const copia = (E) => JSON.parse(JSON.stringify(E));
function fin(E, ganador, motivo) { E.ganador = ganador; E.motivo = motivo; E.fase = 'fin'; }

export function resolver(E0, ev) {
  const E = copia(E0), info = { falta: null, msg: '', respot: [], continua: false, punto: false, aviso: '' };
  E.tiros++;
  if (esCarom(E.modo)) resolverCarom(E, ev, info);
  else {
    const p = E.turno;
    E.mesa = E.mesa.filter((id) => !ev.embolsadas.includes(id));
    if (E.modo === 'bola8') resolver8(E, E0, ev, info); else resolver9(E, E0, ev, info);
    if (E.fase !== 'fin') {
      E.mano = info.falta ? 'libre' : null;
      if (!info.continua) { E.turno = (p + 1) % E.n; E.entradas++; }
    } else E.mano = null;
    if (E.fase === 'saque' && E.fase !== 'fin') E.fase = 'juego';
  }
  return { E, info };
}

function resolver8(E, E0, ev, info) {
  const p = E0.turno, rival = 1 - p, saque = E0.fase === 'saque';
  const obj = ev.embolsadas.filter((id) => id !== 8);
  const limpio = grupoLimpio(E0, p), g0 = E0.grupos[p];
  let falta = null;
  if (ev.blancaEmb) falta = 'Blanca embolsada';
  else if (ev.primero === -1) falta = 'No tocaste ninguna bola';
  else if (!saque) {
    if (!g0 && ev.primero === 8) falta = 'Tocaste primero la 8 con la mesa abierta';
    else if (g0 && limpio && ev.primero !== 8) falta = 'Debías tocar primero la bola 8';
    else if (g0 && !limpio && grupoDe(ev.primero) !== g0) falta = 'Tocaste primero una bola que no es de tu grupo';
  }
  if (!falta) {
    if (saque) { if (!obj.length && !ev.embolsadas.includes(8) && ev.bolasABanda.length < 4) falta = 'Saque ilegal: menos de 4 bolas a banda'; }
    else if (!ev.embolsadas.length && !ev.bandaTrasContacto) falta = 'Ninguna bola tocó banda tras el contacto';
  }
  if (ev.embolsadas.includes(8)) {
    if (saque) { E.mesa.push(8); info.respot.push(8); }
    else if (g0 && limpio && !falta) { fin(E, p, 'Embolsó la bola 8'); info.msg = 'Embolsó la 8'; }
    else { fin(E, rival, falta ? 'Embolsó la 8 con falta' : 'Embolsó la 8 antes de tiempo'); }
    if (E.fase === 'fin') { info.falta = falta; return; }
  }
  if (!falta && !saque && !E0.grupos[p] && obj.length) {
    const g = grupoDe(obj[0]);
    E.grupos[p] = g; E.grupos[rival] = g === 'lisas' ? 'rayadas' : 'lisas';
    info.msg = `Grupo asignado: ${g}`;
  }
  const mi = E.grupos[p];
  info.continua = !falta && (saque ? obj.length > 0 : obj.some((id) => grupoDe(id) === mi));
  info.falta = falta;
}

function resolver9(E, E0, ev, info) {
  const p = E0.turno, saque = E0.fase === 'saque', bajo = Math.min(...E0.mesa);
  const obj = ev.embolsadas;
  let falta = null;
  if (ev.blancaEmb) falta = 'Blanca embolsada';
  else if (ev.primero === -1) falta = 'No tocaste ninguna bola';
  else if (ev.primero !== bajo) falta = `Debías tocar primero la bola ${bajo}`;
  if (!falta) {
    if (saque) { if (!obj.length && ev.bolasABanda.length < 4) falta = 'Saque ilegal: menos de 4 bolas a banda'; }
    else if (!obj.length && !ev.bandaTrasContacto) falta = 'Ninguna bola tocó banda tras el contacto';
  }
  if (falta) {
    E.faltas[p]++;
    if (E.faltas[p] >= 3) { fin(E, (p + 1) % E.n, 'Tres faltas seguidas'); info.falta = falta; return; }
    if (E.faltas[p] === 2) info.aviso = 'Segunda falta seguida: la tercera pierde la partida';
  } else E.faltas[p] = 0;
  if (ev.embolsadas.includes(9)) {
    if (!falta) { fin(E, p, 'Embolsó la bola 9'); info.falta = null; return; }
    E.mesa.push(9); info.respot.push(9);
  }
  info.continua = !falta && obj.length > 0;
  info.falta = falta;
}

function resolverCarom(E, ev, info) {
  const p = E.turno;
  const dos = ev.contactos.length >= 2;
  const ok = dos && (E.modo === 'libre' || ev.bandasAntes2 >= 3);
  info.punto = ok; info.continua = ok;
  if (ok) {
    E.puntos[p]++;
    if (E.puntos[p] >= E.objetivo) { fin(E, p, `Alcanzó ${E.objetivo} carambolas`); return; }
  } else {
    info.msg = dos ? `Solo ${Math.max(0, ev.bandasAntes2)} banda(s) antes de la segunda bola` : (ev.contactos.length ? 'Faltó tocar la segunda bola' : 'No tocaste ninguna bola');
    E.turno = (p + 1) % 2; E.entradas++;
  }
}

/* Aplica al estado fisico los respots y la blanca en mano tras resolver. */
export function reponer(S, E, info) {
  const g = S.geo;
  const libre = (x, y) => !S.bolas.some((o) => o.activa && Math.hypot(o.x - x, o.y - y) < 2 * S.R + 0.0005);
  for (const id of info.respot || []) {
    const b = S.bolas.find((o) => o.id === id);
    let x = g.L / 4;
    while (!libre(x, 0) && x < g.hx - S.R) x += S.R * 0.5;
    if (!libre(x, 0)) { x = g.L / 4; while (!libre(x, 0) && x > -g.hx + S.R) x -= S.R * 0.5; }
    b.x = x; b.y = 0; b.activa = true; b.emb = -1; b.vx = b.vy = b.wx = b.wy = b.wz = 0; b.mov = false;
  }
  const c = S.bolas.find((o) => o.id === 0);
  if (!esCarom(E.modo) && !c.activa) {
    c.activa = true; c.emb = -1; c.vx = c.vy = c.wx = c.wy = c.wz = 0; c.mov = false;
    let x = -g.L / 4, y = 0;
    for (let i = 0; i < 60 && !libre(x, y); i++) { x = -g.L / 4 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * S.R; }
    c.x = x; c.y = y;
  }
}

export function textoGrupo(g) { return g === 'lisas' ? 'Lisas' : g === 'rayadas' ? 'Rayadas' : 'Mesa abierta'; }
