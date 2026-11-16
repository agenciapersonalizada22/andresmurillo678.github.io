// Construccion de niveles: aventura (5 mundos x 10), minijuegos, rompecabezas, jarrones, supervivencia y versus.
import { Z, MUNDOS, FILAS, COLS } from './datos.js';
import { rnd } from './motor.js';

export const INTRO = { paseante: 1, baliza: 3, corredor: 5, pertiguista: 6, perrillo: 7, cubero: 8, lector: 9, reja: 12, espectro: 13, rumbero: 15, topo: 17, tambor: 19, nadador: 21, flotador: 22, vallista: 24, globero: 26, pulidora: 28, pocero: 27, escalero: 32, armadura: 33, yeti: 35, honda: 36, paracaidas: 38, coloso: 39, gargola: 41 };
const MINI = { '1-5': 'cinta', '2-5': 'tumbas', '2-10': 'bolera', '3-8': 'carrera', '3-10': 'jefe3', '4-5': 'cinta', '4-10': 'bolera', '5-5': 'jarros', '5-10': 'jefe' };
const CINTAS = { '1-5': ['dispa', 'dispa', 'nogal', 'cereza', 'mina', 'pincho', 'hielo'], '4-5': ['dispa', 'hielo', 'nogal', 'mina', 'chile', 'nieblon', 'cacto', 'mordelon'] };
export const NOMBRE_MINI = { cinta: 'Cinta transportadora', tumbas: 'Rompe-tumbas', bolera: 'Bolera de muros', carrera: 'Carrera de energía', jefe3: 'Jefe de mundo', jefe: 'Jefe final', jarros: 'Rompe-jarrones' };

function lcg(seed) { const s = { sem: seed >>> 0 }; return () => rnd(s); }
const pick = (R, a) => a[Math.floor(R() * a.length)];

function permitidos(i, mundo, extra) {
  return Object.keys(INTRO).filter((k) => INTRO[k] <= i && (extra || k !== 'coloso' || i >= 39)).filter((k) => {
    if ((k === 'nadador' || k === 'flotador') && !mundo.agua.length) return false;
    if (k === 'espectro' && !mundo.noche) return false;
    return true;
  });
}
function armarOla(R, pool, presupuesto, filas, agua, nada) {
  const lista = []; let b = presupuesto, g = 0, colosos = 0;
  while (b > 0.5 && g++ < 60) {
    const cand = pool.filter((k) => Z[k].vl <= b + 1.2 && !(k === 'coloso' && colosos));
    if (!cand.length) break;
    const pesos = cand.map((k) => 1 / Math.sqrt(Z[k].vl)); let t = pesos.reduce((a, c) => a + c, 0) * R(), k = cand[0];
    for (let i = 0; i < cand.length; i++) { t -= pesos[i]; if (t <= 0) { k = cand[i]; break; } }
    if (k === 'coloso') colosos++;
    R(); let r = Math.floor(R() * FILAS);
    if ((k === 'nadador' || k === 'flotador') && agua.length) r = pick(R, agua);
    lista.push({ z: k, r }); b -= Z[k].vl;
  }
  if (!lista.length) lista.push({ z: pool.includes('paseante') ? 'paseante' : pool[0], r: Math.floor(R() * FILAS) });
  return lista;
}

export function crearNivelBase(extra) {
  return Object.assign({ id: '', i: 0, tipo: 'normal', titulo: '', cielo: 1, noche: 0, agua: [], niebla: 0, tejado: 0, tumbas: [], jarros: [], solIni: 50, olas: [], mundo: 1, fondo: 'dia' }, extra);
}

export function nivelAventura(w, n) {
  const i = (w - 1) * 10 + n, M = MUNDOS[w - 1], clave = w + '-' + n, mini = MINI[clave] || 'normal';
  const R = lcg(1000 + i * 77);
  const niv = crearNivelBase({ id: clave, i, mundo: w, num: n, titulo: M.n + ' ' + clave, cielo: M.cielo, noche: M.noche, agua: M.agua.slice(), niebla: M.niebla, tejado: M.tejado, fondo: M.musica, tipo: mini === 'jefe3' || mini === 'jefe' ? 'jefe' : mini, mini, solIni: 150 });
  const pool = permitidos(i, M);
  const nOlas = mini === 'jefe' ? 8 : Math.min(14, 3 + Math.floor(i / 3.5));
  const t0 = i === 1 ? 22 : 38, esp = Math.max(15, 25 - i / 5);
  const bud = (k) => (0.6 + i * 0.12) * (0.2 + 0.85 * Math.pow(k / Math.max(1, nOlas - 1), 1.3)) * (i === 1 ? 0.8 : 1);
  const filasPerm = i === 1 ? [2] : i === 2 ? [1, 2, 3] : null;
  if (mini === 'cinta') { niv.cielo = 0; niv.solIni = 0; niv.cinta = { lista: CINTAS[clave], cada: 4.2, max: 7 }; niv.tipo = 'cinta'; }
  if (mini === 'bolera') { niv.cielo = 0; niv.solIni = 0; niv.cinta = { lista: ['bola', 'bola', 'bola', 'bolagr', 'bomba'], cada: 3.4, max: 8 }; niv.tipo = 'bolera'; niv.agua = []; niv.niebla = 0; niv.tejado = 0; }
  if (mini === 'tumbas') { niv.tipo = 'tumbas'; niv.solIni = 200; niv.cielo = 0; }
  if (mini === 'carrera') { niv.tipo = 'carrera'; niv.solIni = 200; niv.objetivo = { tipo: 'soles', n: 1200 }; }
  if (mini === 'jarros') { niv.tipo = 'jarros'; niv.tejado = 0; niv.cielo = 0; niv.fondo = 'dia'; niv.solIni = 0; }
  if ((M.tumbas && mini !== 'bolera') || mini === 'tumbas') {
    const nT = mini === 'tumbas' ? 9 : 2 + Math.floor(n / 2), us = new Set();
    while (us.size < nT) us.add(Math.floor(R() * FILAS) * COLS + 4 + Math.floor(R() * 5));
    niv.tumbas = [...us].map((q) => [Math.floor(q / COLS), q % COLS]);
  }
  if (mini === 'jarros') niv.jarros = jarrosAleatorios(R, 16, false);
  const dur = [];
  for (let k = 0; k < nOlas; k++) {
    const ult = k === nOlas - 1, mitad = nOlas >= 6 && k === Math.floor(nOlas / 2);
    let b = bud(k) * (ult ? 1.7 : mitad ? 1.3 : 1);
    if (mini === 'bolera' || mini === 'cinta') b *= 0.8;
    const lista = armarOla(R, k < 2 ? pool.filter((q) => Z[q].v < 0.35 && !Z[q].vuelo) : pool, b, FILAS, niv.agua, 0);
    if (filasPerm) lista.forEach((e) => { e.r = filasPerm[Math.floor(R() * filasPerm.length)]; });
    if (mini === 'jefe' && k === 0) lista.unshift({ z: 'moho', r: 2 });
    if (niv.id === '3-10' && ult) lista.push({ z: 'capataz', r: 2 });
    if (niv.mundo === 5 && mini === 'jefe') { /* boss + oleadas pequenas */ }
    dur.push({ t: t0 + k * esp + (ult ? 12 : 0), z: lista, grande: mitad || ult, ultima: ult });
  }
  if (mini === 'jefe') { niv.poolJefe = pool.filter((k) => Z[k].vl <= 6); dur.forEach((o, k) => { o.t = 3 + k * 20; if (k) o.z = o.z.slice(0, 4); }); }
  niv.olas = dur; if (!niv.olas.length) niv.olas = [];
  if (i === 1) niv.tutorial = true;
  return niv;
}

export function zombisDe(niv) {
  const s = new Set(); (niv.olas || []).forEach((o) => o.z.forEach((e) => s.add(e.z)));
  if (niv.puzzle) niv.puzzle.zombis.forEach((e) => s.add(e.z));
  (niv.jarros || []).forEach((j) => { if (j.k.startsWith('z:')) s.add(j.k.slice(2)); });
  if (niv.infinito) ['paseante', 'baliza', 'cubero'].forEach((k) => s.add(k));
  return [...s];
}

/* ---------- jarrones ---------- */
const JARROS_P = ['p:dispa', 'p:hielo', 'p:nogal', 'p:cereza', 'p:col', 'p:arco', 'p:pincho', 'p:chile'];
const JARROS_Z = ['z:paseante', 'z:baliza', 'z:reja', 'z:corredor', 'z:cubero'];
function jarrosAleatorios(R, n, dificil) {
  const us = new Set(), res = [];
  while (us.size < n) us.add(Math.floor(R() * FILAS) * COLS + 3 + Math.floor(R() * 6));
  [...us].forEach((q, k) => {
    const t = R(); const kk = t < 0.5 ? pick(R, JARROS_P) : t < 0.72 ? 's' : pick(R, JARROS_Z);
    res.push({ r: Math.floor(q / COLS), c: q % COLS, k: kk });
  });
  return res;
}
export function nivelJarrones(n) { // n 1..8
  const R = lcg(5000 + n * 31);
  const niv = crearNivelBase({ id: 'j' + n, i: 20 + n, tipo: 'jarros', titulo: 'Rompe-jarrones ' + n, cielo: 0, solIni: 0, fondo: 'dia', jarros: jarrosAleatorios(R, 10 + n * 2, true) });
  niv.olas = [{ t: 25, z: [{ z: 'paseante', r: 1 }], grande: false }, { t: 50, z: [{ z: 'baliza', r: 3 }, { z: 'paseante', r: 0 }], ultima: true }];
  return niv;
}

/* ---------- rompecabezas ---------- */
const PZ = [
  { n: 'Línea de fuego', mano: ['dispa', 'dispa', 'dispa', 'dispa', 'dispa'], zombis: [0, 1, 2, 3, 4].map((r) => ({ z: 'paseante', r, x: 8.5 })), plantas: [] },
  { n: 'Cabezas duras', mano: ['dispa', 'dispa', 'hielo', 'cereza'], zombis: [{ z: 'baliza', r: 1, x: 8.5 }, { z: 'baliza', r: 2, x: 8.8 }, { z: 'cubero', r: 3, x: 8.5 }], plantas: [] },
  { n: 'Salto de fe', mano: ['dispa', 'dispa', 'pincho', 'pincho'], zombis: [{ z: 'pertiguista', r: 1, x: 8.5 }, { z: 'pertiguista', r: 3, x: 8.5 }], plantas: [{ id: 'nogal', r: 1, c: 4 }, { id: 'nogal', r: 3, c: 4 }] },
  { n: 'Cielo cubierto', mano: ['cacto', 'cacto', 'cacto', 'nogal'], zombis: [{ z: 'globero', r: 0, x: 8.5 }, { z: 'globero', r: 2, x: 8.5 }, { z: 'globero', r: 4, x: 8.5 }], plantas: [] },
  { n: 'Reja de hierro', mano: ['arco', 'arco', 'arco', 'dispa'], zombis: [{ z: 'reja', r: 1, x: 8.5 }, { z: 'reja', r: 2, x: 8.5 }, { z: 'reja', r: 3, x: 8.5 }], plantas: [] },
  { n: 'Estampida', mano: ['nogal', 'nogal', 'mina', 'mina', 'dispa'], zombis: [{ z: 'corredor', r: 0, x: 8.5 }, { z: 'corredor', r: 2, x: 8.5 }, { z: 'corredor', r: 4, x: 8.5 }, { z: 'perrillo', r: 1, x: 8.5 }, { z: 'perrillo', r: 3, x: 8.5 }], plantas: [] },
  { n: 'Trampa mortal', mano: ['mordelon', 'enred', 'pincho', 'dispa', 'dispa'], zombis: [{ z: 'coloso', r: 2, x: 8.5 }, { z: 'paseante', r: 1, x: 8.5 }, { z: 'paseante', r: 3, x: 8.5 }], plantas: [] },
  { n: 'Hipnosis total', mano: ['hipno', 'hipno', 'nogal', 'dispa'], zombis: [{ z: 'cubero', r: 1, x: 8.5 }, { z: 'armadura', r: 3, x: 8.5 }, { z: 'baliza', r: 2, x: 8.5 }], plantas: [] },
];
export function nivelPuzzle(n) { // n 1..8
  const p = PZ[n - 1];
  return crearNivelBase({ id: 'r' + n, i: 30 + n, tipo: 'puzzle', titulo: 'Rompecabezas ' + n + ': ' + p.n, cielo: 0, solIni: 0, fondo: 'dia', noche: 0, mano: p.mano.slice(), puzzle: { plantas: p.plantas, zombis: p.zombis }, sinCort: true });
}
export const N_PUZZLES = PZ.length, N_JARROS = 8;

/* ---------- supervivencia ---------- */
export const ESCENARIOS = [{ id: 'dia', n: 'Día', w: 1 }, { id: 'noche', n: 'Noche', w: 2 }, { id: 'piscina', n: 'Piscina', w: 3 }, { id: 'tejado', n: 'Tejado', w: 5 }];
export function nivelSupervivencia(esc, duro) {
  const w = ESCENARIOS.find((e) => e.id === esc).w, M = MUNDOS[w - 1];
  const niv = crearNivelBase({ id: 'sv_' + esc + (duro ? '_duro' : ''), i: 50, tipo: 'surv', titulo: 'Supervivencia ' + ESCENARIOS.find((e) => e.id === esc).n + (duro ? ' (duro)' : ''), cielo: M.cielo, noche: M.noche, agua: M.agua.slice(), niebla: 0, tejado: M.tejado, fondo: M.musica, mundo: w, solIni: 150, infinito: true, duro: !!duro, hpMult: duro ? 1.25 : 1 });
  if (M.noche) { const R = lcg(99); const us = new Set(); while (us.size < 3) us.add(Math.floor(R() * FILAS) * COLS + 5 + Math.floor(R() * 4)); niv.tumbas = [...us].map((q) => [Math.floor(q / COLS), q % COLS]); }
  niv.generar = (n, s) => generarSurv(niv, n, s);
  niv.olas = [];
  return niv;
}
const ORDEN_SURV = Object.keys(INTRO).sort((a, b) => INTRO[a] - INTRO[b]);
export function generarSurv(niv, n, s) {
  const R = () => rnd(s), M = MUNDOS[niv.mundo - 1];
  const lim = 5 + n * 1.7;
  const pool = ORDEN_SURV.filter((k) => INTRO[k] <= lim).filter((k) => !((k === 'nadador' || k === 'flotador') && !niv.agua.length) && !(k === 'espectro' && !M.noche));
  const grande = n > 0 && (n + 1) % 10 === 0;
  const b = (niv.duro ? 3 + n * 1.25 : 2 + n * 0.85) * (grande ? 1.8 : 1);
  const lista = armarOla(R, pool, b, FILAS, niv.agua, 0);
  const esp = Math.max(13, 22 - Math.min(9, n * 0.3));
  return { t: s.t + esp, espera: esp, z: lista, grande, ultima: false };
}

export function nivelVersus() { return crearNivelBase({ id: 'versus', i: 0, tipo: 'versus', titulo: 'Jardín contra Jardín', cielo: 0, solIni: 150, duracion: 150, fondo: 'dia', sinCort: true, olas: [] }); }
export function nivelPorId(id) {
  if (/^\d-\d+$/.test(id)) { const [w, n] = id.split('-').map(Number); return nivelAventura(w, n); }
  if (id[0] === 'j') return nivelJarrones(+id.slice(1));
  if (id[0] === 'r') return nivelPuzzle(+id.slice(1));
  if (id === 'versus') return nivelVersus();
  if (id.startsWith('sv_')) { const d = id.endsWith('_duro'); return nivelSupervivencia(id.slice(3).replace('_duro', ''), d); }
  return null;
}
