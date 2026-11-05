// Evaluador del Dompe: casos escritos a mano de cada categoria y desempates + comparacion con una implementacion de fuerza bruta (miles de manos al azar).
import { perfil, evaluar, distancia, salidas, cmpClave, BIT, CATS, GANA_DEF, mascara, ORDEN_DEF } from '../js/juegos/dompe/combos.js';
import { crearBaraja, parse } from '../js/marco/barajas.js';
import { nuevoRng, mezclar } from '../js/marco/rng.js';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } else if (/manos|comprobaciones|evaluaciones/.test(msg)) console.log('  ok', msg); };
const P40 = perfil({ baraja: 'es40' }), P48 = perfil({ baraja: 'es48', asAlto: 'bajo' }), P52 = perfil({ baraja: 'fr52', comodin: true }), P40np = perfil({ baraja: 'es40', puente: false }), P40sin = perfil({ baraja: 'es40', comodin: false });
const cat = (s, P) => evaluar(s.split(' '), P).cat;

// ---------- casos a mano ----------
console.log('-- casos a mano');
const casos = [
  // [mano, perfil, categoria esperada]
  ['3o 4o 5o 6o 7o 10o', P40, 'escCol'], // 7 -> sota continua
  ['1o 2o 3o 4o 5o 6c', P40sin, 'escalera'], ['10e 11e 12e 1e 7e 6e', P40sin, 'escCol'], // 6-7-10-11-12-As: as alto
  ['5o 5c 5e 5b 9o 9c', P48, 'cuartetoPar'], ['5o 5c 5e 5b 9o 1c', P48, 'cuarteto'], ['5o 5c 5e 6o 6c 6e', P48, 'dosTercias'],
  ['5o 5c 5e 6o 6c 1e', P48, 'terciaPar'], ['5o 5c 5e 6o 7c 1e', P48, 'tercia'], ['5o 5c 6e 6o 7c 7e', P48, 'tresPares'], ['5o 5c 6e 6o 7c 1e', P48, 'dosPares'],
  ['5o 5c 6e 8o 7c 1e', P48, 'par'], ['5o 4c 6e 8o 7c 1e', P48, 'alta'], ['1o 3o 5o 7o 9o 11o', P48, 'color'], ['1o 2c 3o 4e 5b 6o', P48, 'escalera'],
  ['AS 2S 3S 4S 5S 6S'.replace(/A/, '1'), P52, 'escCol'], ['9S 10S 11S 12S 13S 1S', P52, 'escCol'], ['9S 10S 11S 12S 13S 1H', P52, 'escalera'],
  ['1S 2H 3S 4S 5S 6S', P52, 'escalera'], ['11S 12S 13S 1S 2S 3S', P52, 'color'], // sin vuelta
  // comodines
  ['0J 0J 5S 5H 9D 9C', P52, 'cuartetoPar'], ['0J 5S 5H 9D 9C 2C', P52, 'tresPares'], ['0J 0J 5S 6H 7D 8C', P52, 'escalera'], ['0J 3S 4S 6S 7S 8S', P52, 'escCol'],
  ['0J 5S 5H 5D 9C 2C', P52, 'cuarteto'], ['0J 0J 5S 5H 5D 2C', P52, 'cuartetoPar'], ['0J 5S 5H 6D 6C 2C', P52, 'tresPares'],
  ['2o 3o 5o 7o 10o 12o', P40, 'color'], ['2o 5o 5c 5e 6o 6c', P40, 'cuartetoPar'], // 2 de oros es comodin: 5+comodin = cuarteto
  ['2o 1e 3c 4b 7o 12c', P40, 'par'],
].filter(Boolean);
casos.forEach(([m, P, esp]) => ok(cat(m, P) === esp, `${m} -> ${cat(m, P)} (esperaba ${esp})`));
// comodin en espanola: 2o deja de ser carta real
ok(evaluar('2o 5o 5c 6e 6o 7c'.split(' '), P40).cat === 'tresPares', '2o comodin forma tres pares');
ok(evaluar('2o 5o 5c 6e 6o 7c'.split(' '), P40sin).cat === 'dosPares', 'sin comodin el 2o es un 2');
ok(cat('10o 11o 12o 1o 2c 3b', P40) === 'alta', 'sin as circular: R-As-2 no es escalera');
ok(cat('7o 10c 11e 12b 1o 3c', P40np) === 'alta' && cat('7o 10c 11e 12b 6o 5c', P40np) === 'alta', 'sin puente 7-10 no es escalera');
ok(cat('7o 10c 11e 12b 6o 5c', P40) === 'escalera', 'con puente 5-6-7-10-11-12 es escalera');
ok(cat('1o 2c 3o 4e 5b 6o', perfil({ baraja: 'es48', asAlto: 'alto' })) === 'alta', 'as solo alto: As-6 no es escalera');
ok(cat('8o 9c 10o 11e 12b 1o', perfil({ baraja: 'es48', asAlto: 'alto' })) === 'escalera', 'as solo alto: 8-As');
// no mas de 4 iguales
ok(evaluar('0J 0J 5S 5H 5D 5C'.split(' '), P52).cat === 'cuartetoPar', '4 reales + 2 comodines = cuarteto + par (nunca seis iguales)');

// desempates
console.log('-- desempates');
const cmp = (a, b, P) => cmpClave(evaluar(a.split(' '), P).clave, evaluar(b.split(' '), P).clave);
ok(cmp('9S 9H 4D 4C 2S 3H', '8S 8H 4D 4C 2S 3H', P52) > 0, 'par mas alto gana');
ok(cmp('9S 9H 4D 4C 2S 3H', '9D 9C 4S 4H 2D 5H', P52) < 0, 'mismo par: gana el kicker (5 > 3)');
ok(cmp('9S 9H 4D 4C 2S 3H', '9D 9C 4S 4H 2D 3C', P52) === 0, 'empate exacto');
ok(cmp('1S 1H 4D 4C 2S 3H', '13S 13H 12D 12C 2D 3C', P52) > 0, 'dos pares: As alto gana');
ok(cmp('1S 1H 4D 4C 2S 3H', '13S 13H 12D 12C 2D 3C', perfil({ baraja: 'fr52', asAlto: 'bajo' })) < 0, 'As bajo pierde');
ok(cmp('2S 3S 4S 5S 6S 7S', '1S 2S 3S 4S 5S 6S', P52) > 0, 'escalera de 7 alta gana a la de As bajo');
ok(cmp('9S 10S 11S 12S 13S 1S', '8S 9S 10S 11S 12S 13S', P52) > 0, 'escalera hasta As alto gana');
ok(cmp('5S 5H 5D 5C 2D 2C', '4S 4H 4D 4C 13D 13C', P52) > 0, 'cuarteto+par: cuarteto mas alto');
ok(cmp('2S 4S 6S 8S 10S 12S', '2H 4H 6H 8H 10H 11H', P52) > 0, 'color: carta alta decide');
ok(cmp('2S 4S 6S 8S 10S 12S', '5H 5S 6D 6H 3S 4D', P52) < 0 === false, 'color gana a dos pares (orden propuesto)');
// orden configurable
const Pcustom = perfil({ baraja: 'fr52', orden: ['par', ...ORDEN_DEF.filter((c) => c !== 'par')] });
ok(cmp('5S 5H 2D 3C 8S 9H', '9S 9H 9D 4C 8S 2H', Pcustom) > 0, 'orden configurable: par por encima de tercia');
ok(perfil({ baraja: 'fr52', orden: ['alta'] }).orden.length === CATS.length, 'orden incompleto se completa');

// ---------- referencia de fuerza bruta ----------
console.log('-- fuerza bruta');
function mazoCompleto(P) { return crearBaraja(P.baraja, {}); }
function clasifica(mano, P) { // mano de 6 cartas concretas, sin comodines
  const por = new Map(); const suits = new Set();
  mano.forEach((c) => { const q = parse(c); por.set(q.v, (por.get(q.v) || 0) + 1); suits.add(q.p); });
  const grupos = [...por.entries()].map(([v, n]) => ({ n, val: v === 1 ? (P.asAlto === 'bajo' ? 0 : P.len) : P.pos[v], v })).sort((a, b) => b.n - a.n || b.val - a.val);
  const ns = grupos.map((g) => g.n).join('');
  const pares = grupos.reduce((a, g) => a + Math.floor(g.n / 2), 0), tercias = grupos.reduce((a, g) => a + Math.floor(g.n / 3), 0);
  const distintas = grupos.length === 6, color = suits.size === 1;
  let top = -1;
  if (distintas) {
    const vs = [...por.keys()], tieneAs = vs.includes(1);
    const variantes = [];
    const base = vs.filter((v) => v !== 1).map((v) => P.pos[v]);
    if (tieneAs) { if (P.asAlto !== 'alto') variantes.push(base.concat([0])); if (P.asAlto !== 'bajo') variantes.push(base.concat([P.len])); } else variantes.push(base);
    variantes.forEach((ps) => { ps.sort((a, b) => a - b); if (ps.every((p, i) => i === 0 || p === ps[i - 1] + 1)) top = Math.max(top, ps[5]); });
  }
  let c;
  if (ns === '42') c = 'cuartetoPar'; else if (ns === '411') c = 'cuarteto'; else if (ns === '33') c = 'dosTercias'; else if (ns === '321') c = 'terciaPar'; else if (ns === '3111') c = 'tercia';
  else if (ns === '222') c = 'tresPares'; else if (ns === '2211') c = 'dosPares'; else if (ns === '21111') c = 'par';
  else c = top >= 0 ? (color ? 'escCol' : 'escalera') : color ? 'color' : 'alta';
  const clave = [P.score[c]];
  if (c === 'escCol' || c === 'escalera') clave.push(top); else grupos.forEach((g) => clave.push(g.val));
  const maxN = grupos[0].n, segN = grupos[1] ? grupos[1].n : 0;
  let props = BIT[c] | BIT.alta;
  if (top >= 0) props |= BIT.escalera; if (top >= 0 && color) props |= BIT.escCol; if (distintas && color) props |= BIT.color;
  if (maxN >= 4 && segN >= 2) props |= BIT.cuartetoPar; if (tercias >= 2) props |= BIT.dosTercias; if (pares >= 3) props |= BIT.tresPares; if (maxN >= 4) props |= BIT.cuarteto;
  if (maxN >= 3 && segN >= 2) props |= BIT.terciaPar; if (maxN >= 3) props |= BIT.tercia; if (pares >= 2) props |= BIT.dosPares; if (maxN >= 2) props |= BIT.par;
  return { cat: c, clave, props };
}
function refEval(cartas, P) {
  const reales = cartas.filter((c) => !P.wild.has(c)), k = cartas.length - reales.length, mazo = mazoCompleto(P);
  let mejor = null, props = 0;
  const probar = (extra) => {
    const m = reales.concat(extra); if (new Set(m).size !== m.length) return;
    const r = clasifica(m, P); props |= r.props;
    if (!mejor || cmpClave(r.clave, mejor.clave) > 0) mejor = r;
  };
  if (k === 0) probar([]); else if (k === 1) mazo.forEach((a) => probar([a]));
  else for (let i = 0; i < mazo.length; i++) for (let j = i + 1; j < mazo.length; j++) probar([mazo[i], mazo[j]]);
  return { cat: mejor.cat, clave: mejor.clave, props };
}
const rng = nuevoRng('dompe-bruta');
function aleatoria(P, nW) { // mano de 6: del mazo mas los comodines disponibles
  const baraja = crearBaraja(P.baraja, { comodines: P.baraja === 'fr52' ? 2 : 0 });
  return mezclar(baraja, rng).slice(0, 6);
}
const configs = [['es40', P40], ['es40 sin comodin', P40sin], ['es40 sin puente', P40np], ['es48 as bajo', P48], ['fr52 + jokers', P52], ['fr52 as alto', perfil({ baraja: 'fr52', asAlto: 'alto' })], ['fr52 orden raro', Pcustom]];
for (const [nombre, P] of configs) {
  let n = 0, malos = 0, conW = 0; const t0 = Date.now(), vistas = new Set();
  const iter = P.wild.size ? 6000 : 4000;
  for (let i = 0; i < iter; i++) {
    let m = aleatoria(P);
    if (P.wild.size && i % 3 === 0) { // forzar comodines: 1 o 2
      const w = [...P.wild][0], extra = P.baraja === 'fr52' ? 2 : 1, base = m.filter((c) => !P.wild.has(c));
      m = base.slice(0, 6 - extra); for (let q = 0; q < extra; q++) m.push(w);
      if (new Set(m).size !== m.length && P.baraja !== 'fr52') continue;
    }
    if (m.some((c) => P.wild.has(c))) conW++;
    const a = evaluar(m, P), b = refEval(m, P); n++;
    if (a.cat !== b.cat || cmpClave(a.clave, b.clave) !== 0 || a.props !== b.props) { malos++; if (malos < 4) console.log('  difiere', m.join(' '), a.cat, b.cat, a.clave, b.clave, a.props, b.props); }
    vistas.add(b.cat);
  }
  ok(malos === 0, `${nombre}: ${n} manos (${conW} con comodin) identicas a la fuerza bruta [${vistas.size} categorias vistas, ${Date.now() - t0} ms]`);
}
// manos forzadas por categoria (sin comodin, mazo rico): cubrir todas las categorias con generacion dirigida
{
  const P = P52; let malos = 0, n = 0; const vistas = new Set();
  const baraja = crearBaraja('fr52', {});
  for (let i = 0; i < 20000; i++) {
    // sesgo: muestrea de un subconjunto pequeno de valores/palos para generar muchas parejas, escaleras y colores
    const sub = baraja.filter((c) => { const q = parse(c); return q.v <= 5 + (i % 4) * 2 && (i % 3 === 0 ? q.p === 'S' || q.p === 'H' : true); });
    if (sub.length < 6) continue;
    const m = mezclar(sub.slice(), rng).slice(0, 6), a = evaluar(m, P), b = refEval(m, P); n++; vistas.add(b.cat);
    if (a.cat !== b.cat || cmpClave(a.clave, b.clave) !== 0 || a.props !== b.props) { malos++; if (malos < 4) console.log('  difiere', m.join(' ')); }
  }
  ok(malos === 0 && vistas.size >= 9, `muestreo dirigido: ${n} manos, ${vistas.size} categorias distintas, sin diferencias`);
}

// ---------- distancia y salidas frente a fuerza bruta ----------
console.log('-- distancia / salidas');
{
  let malos = 0, n = 0;
  for (const [nombre, P] of [['es40', P40], ['fr52', P52], ['es48', P48]]) {
    const baraja = crearBaraja(P.baraja, { comodines: P.baraja === 'fr52' ? 2 : 0 }), todo = baraja.filter((c) => true);
    for (let i = 0; i < 400; i++) {
      const mano = mezclar(baraja.slice(), rng).slice(0, 6), e = evaluar(mano, P);
      for (const id of CATS.filter((c) => c !== 'alta')) {
        const d = distancia(mano, id, P), tiene = !!(e.props & BIT[id]);
        n++;
        if ((d === 0) !== tiene) { malos++; if (malos < 6) console.log('  d0', nombre, id, mano.join(' '), d, tiene); continue; }
        const sal = salidas(mano, P, [id], todo.filter((c) => !mano.includes(c) || P.wild.has(c)));
        const unCambio = !tiene && (sal[id] && sal[id].size > 0);
        if (!tiene && (d === 1) !== !!unCambio) { malos++; if (malos < 6) console.log('  d1', nombre, id, mano.join(' '), d, !!unCambio); }
      }
    }
  }
  ok(malos === 0, `distancia analitica == fuerza bruta (0 y 1 cambio) en ${n} comprobaciones`);
}

// ---------- rendimiento ----------
{
  const t0 = Date.now(); let x = 0;
  for (let i = 0; i < 4000; i++) x += evaluar(aleatoria(P52), P52).clave[0];
  const dt = Date.now() - t0; ok(dt < 2500, `4000 evaluaciones fr52+jokers en ${dt} ms`);
}
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
