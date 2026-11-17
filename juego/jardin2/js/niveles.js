// Construccion pura de niveles: aventura (10 mundos x 12), diario, arena semanal, zona sin fin, pistas de estrategia.
import { Z, P, IDS_P, MUNDOS, MUNDO_ZOMBIS, NIV_POR_MUNDO, FILAS, COLS } from './datos.js';
import { rnd, ri } from './motor.js';

export const TOTAL_NIV = MUNDOS.length * NIV_POR_MUNDO;
const gen = (seed) => { const s = { sem: seed >>> 0 }; for (let i = 0; i < 3; i++) rnd(s); return s; };
const pick = (s, a) => a[ri(s, a.length)];
const CINTAS = [
  ['brote', 'brote', 'roble', 'petardo', 'mina', 'espina', 'chispera'], ['brote', 'escarcha', 'roble', 'nenufar', 'petardo', 'arpon', 'mina'], ['brote', 'cometa', 'roble', 'brasa', 'espina', 'mina', 'pinchos'],
  ['escarcha', 'brote', 'roble', 'brasa', 'petardo', 'glacial', 'mina'], ['brote', 'erizo', 'cometa', 'petardo', 'trebol', 'espina', 'mina'], ['rayo', 'brote', 'reloj', 'roble', 'petardo', 'iman', 'mina'],
  ['brote', 'bumeran', 'roble', 'trebol', 'petardo', 'tornado', 'mina'], ['brote', 'brasa', 'magma', 'roble', 'petardo', 'cepo', 'mina'], ['prisma', 'rayo', 'faro', 'roble', 'petardo', 'farol', 'mina'], ['rayo', 'prisma', 'reloj', 'roble', 'glacial', 'iman', 'mina'],
];
const NOMBRES = ['Llegada', 'Primeros pasos', 'Calor del lugar', 'Aprieta el paso', 'Cuadro de honor', 'Cinta del tiempo', 'Aire espeso', 'Contrarreloj', 'Cuenta atrás', 'Cerco cerrado', 'Víspera', 'Jefe del mundo'];

/* ---------- oleadas ---------- */
function tierMax(n, m) { return n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4; }
export function genOlas(s, mundo, n, o = {}) {
  const pool = MUNDO_ZOMBIS(mundo).filter((id) => Z[id].tier <= (o.tierMax || tierMax(n, mundo))), olas = [];
  const presup = o.presup || (3 + n * 1.5 + mundo * 1.6), esp = Math.max(3.6, (o.esp || 16) - n * 0.55 - mundo * 0.25);
  let t = o.t0 || 14, gastado = 0, k = 0; const grande = [0.5, 0.82];
  const w = (id) => 7 - Z[id].tier;
  const elegir = () => { let tot = 0; pool.forEach((id) => { tot += w(id); }); let x = rnd(s) * tot; for (const id of pool) { x -= w(id); if (x <= 0) return id; } return pool[0]; };
  while (gastado < presup) {
    const g = grande.length && gastado / presup >= grande[0]; if (g) grande.shift();
    const cuantos = g ? 2 + Math.min(4, Math.floor(n / 3) + mundo % 2) : 1; if (g) olas.push({ t: t - 1, aviso: 1 });
    for (let i = 0; i < cuantos; i++) { const id = elegir(); gastado += Z[id].peso || 1; olas.push({ t: t + i * 0.45, z: id, r: ri(s, FILAS) }); k++; }
    t += esp * (g ? 1.8 : 0.55 + rnd(s) * 0.9);
  }
  const z = olas.filter((q) => q.z); if (n >= 1) { const nb = Math.max(n >= 2 ? 2 : 1, Math.floor(z.length / 7)); for (let i = 0; i < nb && i < z.length; i++) z[Math.min(z.length - 1, 2 + Math.floor(i * z.length / nb))].br = 1; }
  if (o.pinatas) for (let i = 0; i < o.pinatas; i++) olas.push({ t: 20 + i * 14 + rnd(s) * 6, z: 'pinata', r: ri(s, FILAS), pin: 1 });
  if (o.jefe) { olas.push({ t: t + 6, aviso: 1 }); olas.push({ t: t + 8, z: o.jefe, r: 2 }); }
  else { olas.push({ t: t + 1, aviso: 1 }); for (let i = 0; i < 2 + Math.floor(n / 3); i++) olas.push({ t: t + 2 + i * 0.4, z: elegir(), r: ri(s, FILAS) }); }
  return olas.sort((a, b) => a.t - b.t);
}

/* ---------- terreno por mundo ---------- */
function terreno(s, m, n) {
  const ter = [], usa = new Set(), libre = (r, c) => !usa.has(r * COLS + c), marca = (r, c, t, ex) => { usa.add(r * COLS + c); ter.push({ r, c, t, ...(ex || {}) }); };
  const out = {};
  const mec = MUNDOS[m].mec;
  if (mec === 'tumbas') { const k = Math.min(6, 1 + Math.floor(n / 3) + (n > 8 ? 1 : 0)); for (let i = 0, g = 0; i < k && g < 50; g++) { const r = ri(s, FILAS), c = 3 + ri(s, 5); if (libre(r, c)) { marca(r, c, 'tumba'); i++; } } }
  else if (mec === 'agua') { const filas = n <= 3 ? [2] : n <= 7 ? [1, 3] : [1, 2, 3]; filas.forEach((r) => { for (let c = 0; c < COLS; c++) marca(r, c, 'agua'); }); out.agua = filas; }
  else if (mec === 'rieles') { const f = n <= 3 ? [2] : n <= 8 ? [1, 3] : [0, 2, 4]; f.forEach((r) => { for (let c = 0; c < COLS; c++) marca(r, c, 'riel'); }); out.rieles = f; out.cartaInt = Math.max(24, 44 - n * 1.2); }
  else if (mec === 'hielo') { const k = 6 + n * 2; for (let i = 0, g = 0; i < k && g < 120; g++) { const r = ri(s, FILAS), c = 2 + ri(s, 7); if (libre(r, c)) { marca(r, c, 'hielo'); i++; } } }
  else if (mec === 'almenas') { for (let r = 0; r < FILAS; r++) if (r % 2 === (n % 2) || n > 6) marca(r, 1 + (r % 2), 'almena'); }
  else if (mec === 'portales') { const k = 1 + Math.floor(n / 4); for (let i = 0, g = 0; i < k && g < 40; g++) { const r1 = ri(s, FILAS), c1 = 4 + ri(s, 4), r2 = (r1 + 2 + ri(s, 2)) % FILAS, c2 = 3 + ri(s, 4); if (libre(r1, c1) && libre(r2, c2)) { marca(r1, c1, 'portal', { par: [r2, c2] }); marca(r2, c2, 'portal', { par: [r1, c1] }); i++; } } }
  else if (mec === 'lava') { const k = 3 + Math.floor(n / 2); for (let i = 0, g = 0; i < k && g < 60; g++) { const r = ri(s, FILAS), c = 3 + ri(s, 6); if (libre(r, c)) { marca(r, c, 'lava', { ph: rnd(s) * 9 }); i++; } } }
  else if (mec === 'pistas') { const f = n <= 4 ? [2] : n <= 9 ? [1, 3] : [0, 2, 4]; f.forEach((r) => { for (let c = 3; c < COLS; c++) marca(r, c, 'pista'); }); out.pistas = f; out.naveInt = Math.max(14, 24 - n); }
  return { ter, ...out };
}

/* ---------- niveles ---------- */
const MODS = { 5: ['lluviaChispas'], 8: ['veloz'], 10: ['recarga'] };
export function nivelAventura(m, n, ex = {}) {
  const W = MUNDOS[m], seed = ex.seed != null ? ex.seed : m * 1000 + n * 17 + 5, s = gen(seed), T = terreno(s, m, n);
  const esJefe = n === NIV_POR_MUNDO, esCinta = n === 6, noche = !!W.noche;
  const niv = {
    id: `${m + 1}-${n}`, mundo: m, n, tipo: esJefe ? 'jefe' : esCinta ? 'cinta' : 'normal', nombre: `${W.n} ${n}: ${NOMBRES[n - 1]}`, mecanica: W.mec, ter: T.ter, rieles: T.rieles, pistas: T.pistas, cartaInt: T.cartaInt, naveInt: T.naveInt,
    mods: [...(MODS[n] || []), ...(ex.mods || [])], cielo: !noche, cieloInt: 9, chIni: noche ? 125 : 50, hpMult: (m === 0 ? 0.8 : 1 + m * 0.06) * (1 + n * 0.02) * (esJefe ? 0.62 : 1) * (ex.hpMult || 1), enIni: n >= 4 ? 1 : 0,
    cintaPool: esCinta ? CINTAS[m] : null, noche,
    olas: genOlas(s, m, n, { jefe: esJefe ? W.jefe : null, pinatas: ex.pinatas || (n % 4 === 0 && !esJefe ? 1 : 0), presup: ex.presup && ex.presup * (1), tierMax: esJefe ? 4 : undefined, esp: ex.esp }),
  };
  if (n === 1 && m === 0) { niv.chIni = 100; niv.olas = niv.olas.slice(0, 8).concat([{ t: niv.olas[7].t + 8, z: 'momia', r: 2 }]); niv.semillasFijas = ['chispera', 'brote']; niv.tutorial = true; }
  if (ex.arena) niv.arena = true;
  return niv;
}
export const nivelPorId = (id) => { const mm = /^(\d+)-(\d+)$/.exec(id || ''); if (!mm) return null; const m = +mm[1] - 1, n = +mm[2]; return m >= 0 && m < MUNDOS.length && n >= 1 && n <= NIV_POR_MUNDO ? nivelAventura(m, n) : null; };
export const idPorIndice = (i) => `${Math.floor(i / NIV_POR_MUNDO) + 1}-${(i % NIV_POR_MUNDO) + 1}`;
export const indicePorId = (id) => { const mm = /^(\d+)-(\d+)$/.exec(id); return mm ? (+mm[1] - 1) * NIV_POR_MUNDO + +mm[2] - 1 : -1; };

/* ---------- diario / arena / zona sin fin ---------- */
export const diaDe = (t) => Math.floor((t == null ? Date.now() : t) / 86400000);
export const semanaDe = (t) => Math.floor(((t == null ? Date.now() : t) / 86400000 + 3) / 7); // semanas que empiezan en lunes (epoch fue jueves)
export const EVENTOS = [
  { id: 'pinatas', n: 'Fiesta de piñatas', d: 'Muchas piñatas sueltan recompensas.', mods: [], pinatas: 5 },
  { id: 'chispas', n: 'Lluvia de chispas', d: 'Caen chispas sin parar.', mods: ['lluviaChispas'] },
  { id: 'veloz', n: 'Zombis veloces', d: 'Todo va más rápido; el botín es mayor.', mods: ['veloz'], hpMult: 0.9 },
  { id: 'sinpulso', n: 'Sin red de seguridad', d: 'No hay pulso temporal.', mods: ['sinPulso'], hpMult: 0.9 },
  { id: 'recarga', n: 'Semillas relámpago', d: 'Las semillas recargan muy rápido.', mods: ['recarga'], hpMult: 1.15 },
  { id: 'duro', n: 'Piel dura', d: 'Zombis con más vida y más botín.', mods: [], hpMult: 1.35 },
];
export function nivelDiario(dia) {
  const R = gen(dia * 7919 + 13), m = dia % MUNDOS.length, e = EVENTOS[dia % EVENTOS.length], n = 6 + (dia % 6) + (dia % 5 === 0 ? 0 : 0);
  const niv = nivelAventura(m, n === 6 ? 7 : n, { seed: dia * 31 + 7, mods: e.mods, hpMult: e.hpMult, pinatas: e.pinatas });
  niv.id = 'diario'; niv.diario = dia; niv.evento = e.id; niv.nombre = 'Evento diario: ' + e.n; niv.tipo = 'normal'; niv.cintaPool = null; void R; return niv;
}
export function arenaSemillas(seed) {
  const s = gen(seed * 13 + 5), base = IDS_P.filter((id) => !P[id].g && P[id].u <= 90 && P[id].k !== 'base'), sel = ['chispera'], prod = ['luciernaga', 'ambar'];
  sel.push(pick(s, prod)); while (sel.length < 8) { const id = pick(s, base); if (!sel.includes(id)) sel.push(id); } return sel;
}
export function nivelArena(semana) {
  const s = gen(semana * 977 + 3), m = ri(s, MUNDOS.length), n = 8 + ri(s, 4);
  const niv = nivelAventura(m, n, { seed: semana * 101 + 9, arena: true, hpMult: 1.35, mods: ['sinPulso'] });
  niv.id = 'arena'; niv.arena = semana; niv.nombre = 'Arena de la semana ' + semana; niv.tipo = 'normal'; niv.cintaPool = null; niv.chIni = 150; niv.enIni = 1;
  niv.olas = genOlas(gen(semana * 31), m, 11, { presup: 52, esp: 6, pinatas: 2, tierMax: 4, t0: 8 }); niv.semillasFijas = arenaSemillas(semana); return niv;
}
export const puntosArena = (st, tiempo, vivas, victoria) => Math.min(99999, Math.round(st.pesoMat * 25 + vivas * 12 + (victoria ? 800 + Math.max(0, 240 - tiempo) * 4 : 0)));
export const CODIGO_ARENA = 100000; // valor enviado = semana*100000 + puntos (se decodifica al mostrar)
export const valorArena = (semana, pts) => (semana % 500) * CODIGO_ARENA + Math.min(99999, pts);
export function nivelSinFin(piso, seed) {
  const s0 = gen((seed || 1) * 101 + piso * 7), m = Math.floor((piso - 1) / 3 + ((seed || 0) % 10)) % MUNDOS.length, n = Math.min(12, 2 + Math.floor(piso * 0.75));
  const niv = nivelAventura(m, n >= 12 ? 11 : n, { seed: (seed || 1) * 977 + piso * 13, hpMult: 1 + piso * 0.04, presup: 5 + piso * 1.7 + 2, esp: 6 });
  niv.id = 'sinfin'; niv.piso = piso; niv.nombre = `Zona sin fin · Piso ${piso}`; niv.tipo = 'normal'; niv.cintaPool = null; niv.sinFinNivel = true; niv.chIni = 100 + Math.min(100, piso * 5); niv.enIni = piso >= 3 ? 1 : 0; niv.cielo = true; niv.mods = (niv.mods || []).filter((x) => x !== 'veloz');
  if (piso % 10 === 0) niv.olas = niv.olas.concat([{ t: 60, aviso: 1 }, { t: 62, z: MUNDOS[m].jefe, r: 2 }]).sort((a, b) => a.t - b.t); void s0; return niv;
}
export const MEJORAS_PISO = [
  { id: 'dano', n: 'Colmillos verdes', d: '+12% de daño de plantas.', f: (cfg) => { cfg.bonusDm = (cfg.bonusDm || 0) + 0.12; } },
  { id: 'chispas', n: 'Semillero', d: '+60 chispas al empezar cada piso.', f: (cfg) => { cfg.bonusCh = (cfg.bonusCh || 0) + 60; } },
  { id: 'energia', n: 'Savia reservada', d: '+1 carga de Energía Verde al empezar cada piso.', f: (cfg) => { cfg.bonusEn = (cfg.bonusEn || 0) + 1; } },
  { id: 'hp', n: 'Piel de roble', d: '+15% de vida de plantas.', f: (cfg) => { cfg.hpPlantas = (cfg.hpPlantas || 1) * 1.15; } },
  { id: 'rec', n: 'Semillas ágiles', d: 'Recarga un 12% más rápida.', f: (cfg) => { cfg.recM = (cfg.recM || 1) * 0.88; } },
  { id: 'pulso', n: 'Pulso extra', d: '+1 uso de pulso temporal en cada carril.', f: (cfg) => { cfg.bonusPulso = (cfg.bonusPulso || 0) + 1; } },
];

/* ---------- pista de estrategia ---------- */
export function infoNivel(niv) {
  const tipos = {}; (niv.olas || []).forEach((o) => { if (o.z) tipos[o.z] = (tipos[o.z] || 0) + 1; });
  const ids = Object.keys(tipos), has = (f) => ids.filter((id) => f(Z[id]));
  return { tipos, aereos: has((z) => (z.h || []).includes('vuelo')), metal: has((z) => z.arm && z.arm.metal), gigantes: has((z) => (z.h || []).includes('gigante')), lanzadores: has((z) => (z.h || []).includes('lanza')), jefe: has((z) => z.jefe) };
}
export function pista(niv, tengo) {
  const I = infoNivel(niv), t = [], rec = [], quiere = (id, txt) => { if (!tengo || tengo.includes(id)) { rec.push(id); } t.push(txt); };
  t.push('Empieza con 2-3 productoras (Chispera, Luciérnaga) en la columna izquierda.');
  if (niv.mecanica === 'agua') quiere('nenufar', 'Hay agua: planta un Nenúfar primero y luego tu planta encima.');
  if (niv.mecanica === 'tumbas') quiere('petardo', 'Las tumbas liberan momias: una explosión las rompe de golpe, o tócalas varias veces.');
  if (niv.mecanica === 'rieles') quiere('roble', 'Las vagonetas avisan: un muro delante de la fila las detiene.');
  if (niv.mecanica === 'hielo') quiere('brasa', 'El hielo acelera a los zombis: las plantas de fuego lo derriten.');
  if (niv.mecanica === 'lava') quiere('magma', 'La lava quema todo: evita esas casillas o usa plantas ignífugas.');
  if (niv.mecanica === 'apagon') quiere('farol', 'Los apagones desactivan plantas: protégelas con Farolillos o Faros.');
  if (niv.mecanica === 'portales') t.push('Los portales conectan filas: vigila la fila pareja.');
  if (niv.mecanica === 'pistas') t.push('Una nave aterrizará donde se marca la pista: no dejes plantas valiosas ahí.');
  if (I.aereos.length) quiere('espina', 'Hay zombis voladores: el Cactus Púa y el Arpón los alcanzan.');
  if (I.metal.length) quiere('iman', 'Armaduras de metal: usa Flor Imán o disparos perforantes.');
  if (I.gigantes.length) quiere('cepo', 'Gigantes al final: guarda Cepos y Energía Verde.');
  if (I.lanzadores.length) t.push('Hay lanzadores: un Espejo devuelve los proyectiles.');
  if (I.jefe.length) t.push('Jefe: ahorra Energía Verde para su fase final.');
  t.push('Zombis brillantes sueltan Energía Verde: toca la planta que quieras potenciar.');
  return { texto: t, rec: [...new Set(rec)] };
}
export function zombisDe(niv) { return Object.keys(infoNivel(niv).tipos); }
