// =============================================================
//  🛠️  RECETAS Y HORNO
//  Las recetas se escriben como en el juego de verdad: un dibujo
//  con letras ("PPP / .P. / .P.") y qué es cada letra. En el menú
//  se ven como un libro de recetas: tocas la que quieras y, si
//  tienes los ingredientes, se fabrica. Las de 2x2 se pueden hacer
//  en cualquier lugar; las de 3x3 piden estar cerca de una mesa de
//  trabajo. El horno quema combustible y funde cosas.
// =============================================================
import { B } from './bloques.js';
import { POR_CLAVE_OBJ, MATERIALES, ARMADURAS, PIEZAS, resolverId, objetoPorId, esObjeto, combustible, idInventario, nombreDe } from './objetos.js';

export const GRUPOS = {
  tablas: { nombre: 'Tablas', ids: [B.TABLAS, B.TABLAS_OSCURAS, B.TABLAS_ABETO] },
  troncos: { nombre: 'Troncos', ids: [B.TRONCO, B.TRONCO_ABETO, B.TRONCO_ABEDUL] },
  lana: { nombre: 'Bloque de color', ids: [B.LANA_BLANCA, B.LANA_ROJA, B.LANA_NARANJA, B.LANA_AMARILLA, B.LANA_VERDE, B.LANA_AZUL, B.LANA_MORADA, B.LANA_ROSA, B.LANA_NEGRA, B.LANA_GRIS] },
  adoquin: { nombre: 'Adoquín', ids: [B.ADOQUIN, B.ADOQUIN_MUSGOSO] },
};

// "#tablas" = cualquiera del grupo; si no, un bloque (número) o un objeto (clave)
export function idsDe(espec) {
  if (typeof espec === 'string' && espec[0] === '#') return GRUPOS[espec.slice(1)].ids;
  return [resolverId(espec)];
}
export function nombreEspec(espec) {
  if (typeof espec === 'string' && espec[0] === '#') return GRUPOS[espec.slice(1)].nombre;
  return nombreDe(resolverId(espec));
}

export const RECETAS = [];

function R(salida, n, filas, leyenda) {
  const ing = new Map();
  for (const f of filas) for (const ch of f) if (ch !== '.') ing.set(ch, (ing.get(ch) || 0) + 1);
  const lista = [...ing].map(([ch, c]) => [leyenda[ch], c]);
  const ancho = Math.max(...filas.map((f) => f.length));
  RECETAS.push({
    salida: resolverId(salida), n, filas, leyenda, ing: lista,
    rejilla: filas.length <= 2 && ancho <= 2 ? 2 : 3,
  });
}

// ---- básicas (2x2)
R(B.TABLAS, 4, ['T'], { T: '#troncos' });
R('palo', 4, ['P', 'P'], { P: '#tablas' });
R(B.MESA_TRABAJO, 1, ['PP', 'PP'], { P: '#tablas' });
R(B.ANTORCHA, 4, ['C', 'P'], { C: 'carbon', P: 'palo' });
R(B.LADRILLO_PIEDRA, 4, ['PP', 'PP'], { P: B.PIEDRA });
R(B.PIEDRA_PULIDA, 4, ['AA', 'AA'], { A: '#adoquin' });
R(B.LANA_BLANCA, 1, ['HH', 'HH'], { H: 'hilo' });
R('flecha', 4, ['R', 'P'], { R: 'hierro_crudo', P: 'palo' });
// ---- construcción (3x3)
R(B.COFRE, 1, ['PPP', 'P.P', 'PPP'], { P: '#tablas' });
R(B.HORNO, 1, ['AAA', 'A.A', 'AAA'], { A: '#adoquin' });
R(B.PUERTA_X, 3, ['PP', 'PP', 'PP'], { P: '#tablas' });
R(B.VALLA, 3, ['PXP', 'PXP'], { P: '#tablas', X: 'palo' });
R(B.ESCALERA_TABLAS, 4, ['P..', 'PP.', 'PPP'], { P: '#tablas' });
R(B.LOSA_TABLAS, 6, ['PPP'], { P: '#tablas' });
R(B.ESCALERA_ADOQUIN, 4, ['A..', 'AA.', 'AAA'], { A: '#adoquin' });
R(B.LOSA_ADOQUIN, 6, ['AAA'], { A: '#adoquin' });
R(B.CAMA_PIE, 1, ['LLL', 'PPP'], { L: '#lana', P: '#tablas' });
R(B.RIEL_X, 16, ['H.H', 'HPH', 'H.H'], { H: 'hierro', P: 'palo' });
R('bidon', 1, ['.H.', 'H.H', '.H.'], { H: 'hierro' });
R('pan', 1, ['TTT'], { T: 'trigo' });
R(B.PAJA, 1, ['TTT', 'TTT', 'TTT'], { T: 'trigo' });
R('arco', 1, ['.PH', 'P.H', '.PH'], { P: 'palo', H: 'hilo' });
R(B.ESTANTERIA, 1, ['TTT', 'PPP', 'TTT'], { T: '#tablas', P: 'hilo' });

// ---- herramientas y armaduras por material
const BASE_MAT = { madera: '#tablas', piedra: '#adoquin', hierro: 'hierro', oro: 'oro', diamante: 'diamante' };
for (const m of Object.keys(MATERIALES)) {
  const L = { M: BASE_MAT[m], P: 'palo' };
  R('pico_' + m, 1, ['MMM', '.P.', '.P.'], L);
  R('hacha_' + m, 1, ['MM', 'MP', '.P'], L);
  R('pala_' + m, 1, ['M', 'P', 'P'], L);
  R('espada_' + m, 1, ['M', 'M', 'P'], L);
}
const FORMA_ARM = { casco: ['MMM', 'M.M'], peto: ['M.M', 'MMM', 'MMM'], pantalones: ['MMM', 'M.M', 'M.M'], botas: ['M.M', 'M.M'] };
const BASE_ARM = { cuero: 'cuero', hierro: 'hierro', diamante: 'diamante' };
for (const m of Object.keys(ARMADURAS)) for (const [p] of PIEZAS) R(p + '_' + m, 1, FORMA_ARM[p], { M: BASE_ARM[m] });

// ---- fabricar
export function cantidadFalta(rec, inv) {
  const faltan = [];
  for (const [espec, c] of rec.ing) {
    const tiene = inv.cuentaDe(idsDe(espec));
    if (tiene < c) faltan.push([espec, c - tiene]);
  }
  return faltan;
}

export function puedeFabricar(rec, inv, hayMesa) {
  if (rec.rejilla === 3 && !hayMesa) return false;
  return cantidadFalta(rec, inv).length === 0;
}

// Fabrica una vez. Devuelve null si no se pudo, o el id fabricado
export function fabricar(rec, inv, hayMesa) {
  if (!puedeFabricar(rec, inv, hayMesa)) return null;
  const sal = esObjeto(rec.salida) ? rec.salida : idInventario(rec.salida);
  if (!inv.cabe(sal, rec.n)) return null;
  for (const [espec, c] of rec.ing) inv.quitarDe(idsDe(espec), c);
  const ob = objetoPorId(sal);
  inv.agregar(sal, rec.n, 0);
  return ob ? ob.id : sal;
}

// ---- horno
const FUNDE = [
  [B.ARENA, B.VIDRIO, 1], ['hierro_crudo', 'hierro', 1], ['oro_crudo', 'oro', 1], [B.ADOQUIN, B.PIEDRA, 1],
  [B.TRONCO, 'carbon', 1], [B.TRONCO_ABETO, 'carbon', 1], [B.TRONCO_ABEDUL, 'carbon', 1],
  ['cerdo_crudo', 'cerdo_asado', 1], ['res_cruda', 'bistec', 1], ['cordero_crudo', 'cordero_asado', 1],
  [B.CACTUS, B.LANA_VERDE, 1], [B.ARENISCA, B.ARENISCA_CINCELADA, 1],
];
const TABLA_FUNDE = new Map(FUNDE.map(([e, s, n]) => [resolverId(e), [resolverId(s), n]]));
export const TIEMPO_FUNDIR = 8;

export const resultadoDeFundir = (id) => TABLA_FUNDE.get(id) || null;
export const esFundible = (id) => TABLA_FUNDE.has(id);
export const esCombustible = (id) => combustible(id) > 0;

export function hornoNuevo() { return { ent: null, comb: null, sal: null, quema: 0, quemaMax: 0, prog: 0 }; }

// Avanza el horno dt segundos. Devuelve true si algo cambió (para repintar el menú)
export function actualizarHorno(h, dt) {
  let cambio = false;
  const f = h.ent ? TABLA_FUNDE.get(h.ent.id) : null;
  const cabeSalida = f && (!h.sal || (h.sal.id === f[0] && h.sal.n + f[1] <= 64));
  const puede = !!(f && cabeSalida);
  if (h.quema <= 0 && puede && h.comb) {
    const t = combustible(h.comb.id);
    h.quemaMax = h.quema = t;
    h.comb.n--;
    if (h.comb.n <= 0) h.comb = null;
    cambio = true;
  }
  if (h.quema > 0) {
    h.quema = Math.max(0, h.quema - dt);
    if (puede) {
      h.prog += dt;
      if (h.prog >= TIEMPO_FUNDIR) {
        h.prog = 0;
        h.ent.n--;
        if (h.ent.n <= 0) h.ent = null;
        if (h.sal) h.sal.n += f[1]; else h.sal = { id: f[0], n: f[1], d: 0 };
        cambio = true;
      }
    } else h.prog = Math.max(0, h.prog - dt * 2);
  } else if (h.prog > 0) h.prog = Math.max(0, h.prog - dt * 2);
  return cambio;
}

export const estaEncendido = (h) => h.quema > 0;
export { POR_CLAVE_OBJ };
