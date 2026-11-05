// Conquian: validez de combinaciones contra enumeracion exhaustiva independiente, y planificador contra fuerza bruta en manos pequenas.
import { perfil, analizar, mejorPlan, COMODIN, puedeAgregarA, sinCartas } from '../js/juegos/conquian/melds.js';
import { TIPOS, parse } from '../js/marco/barajas.js';
import { nuevoRng, ent, mezclar } from '../js/marco/rng.js';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } else if (/exhaustiv|fuerza bruta|aleator/.test(msg)) console.log('  ok', msg); };
const T = TIPOS.es40, MAZO = [].concat(...T.palos.map((p) => T.valores.map((v) => v + p)));
const clave = (cs) => cs.slice().sort().join(',');

// ---- generador independiente de todas las combinaciones validas ----
function todasValidas(cfg) {
  const out = new Set(), jmax = cfg.maxJ == null ? 1 : cfg.maxJ;
  // trios
  for (const v of T.valores) {
    const cartas = T.palos.map((p) => v + p);
    for (let m = 0; m < 16; m++) {
      const s = cartas.filter((_, i) => m & (1 << i));
      if (s.length >= 3) out.add(clave(s));
      if (jmax >= 1 && s.length >= 2 && s.length + 1 <= 4) out.add(clave(s.concat([COMODIN])));
    }
  }
  // escaleras
  const base = T.valores.slice(); let segs = cfg.puente ? [base] : [base.filter((v) => v <= 7), base.filter((v) => v >= 10)];
  if (cfg.asAlto) segs = segs.map((s, i) => (i === segs.length - 1 ? s.concat([1]) : s));
  for (const p of T.palos) for (const sg of segs) for (let a = 0; a < sg.length; a++) for (let b = a + 2; b < sg.length; b++) {
    const ventana = sg.slice(a, b + 1).map((v) => v + p);
    if (new Set(ventana).size !== ventana.length) continue;
    out.add(clave(ventana));
    if (jmax >= 1) for (let k = 0; k < ventana.length; k++) { const w = ventana.slice(); w[k] = COMODIN; out.add(clave(w)); }
  }
  return out;
}
console.log('-- combinaciones validas vs enumeracion exhaustiva');
for (const cfg of [{ puente: true, asAlto: false }, { puente: false, asAlto: false }, { puente: true, asAlto: true }, { puente: false, asAlto: true }]) {
  const P = perfil(cfg), V = todasValidas({ puente: cfg.puente, asAlto: cfg.asAlto }), rng = nuevoRng('cq' + JSON.stringify(cfg));
  // 1) todas las validas se aceptan
  let malos = 0; for (const k of V) { const cs = k.split(','); const r = analizar(cs, P); if (!r.ok || clave(r.orden) !== k) { malos++; if (malos < 4) console.log('  rechaza valida', k, r); } }
  ok(malos === 0, `puente=${cfg.puente} asAlto=${cfg.asAlto}: las ${V.size} combinaciones validas se aceptan y ordenan bien`);
  // 2) exhaustivo: todos los subconjuntos de 3, 4 y 5 cartas (con y sin comodin)
  const U = MAZO.concat([COMODIN]); let n = 0; malos = 0;
  const rec = (ini, cur, k) => {
    if (cur.length === k) { n++; const a = analizar(cur, P).ok, b = V.has(clave(cur)); if (a !== b) { malos++; if (malos < 4) console.log('  difiere', cur.join(' '), a, b); } return; }
    for (let i = ini; i < U.length; i++) { cur.push(U[i]); rec(i + 1, cur, k); cur.pop(); }
  };
  rec(0, [], 3); rec(0, [], 4);
  if (cfg.puente && !cfg.asAlto) rec(0, [], 5);
  ok(malos === 0, `puente=${cfg.puente} asAlto=${cfg.asAlto}: ${n} subconjuntos exhaustivos (3-${cfg.puente && !cfg.asAlto ? 5 : 4} cartas) coinciden`);
  // 3) aleatorios de 6 a 10 cartas
  malos = 0; n = 0;
  for (let i = 0; i < 60000; i++) {
    const k = 6 + ent(rng, 5); let cs;
    if (i % 2) { // sesgo: cartas de un solo palo con comodin
      const p = T.palos[ent(rng, 4)]; cs = mezclar(T.valores.map((v) => v + p).concat(Math.random() < 0.5 ? [COMODIN] : []), rng).slice(0, k);
    } else cs = mezclar(U.slice(), rng).slice(0, k);
    n++; const a = analizar(cs, P).ok, b = V.has(clave(cs)); if (a !== b) { malos++; if (malos < 4) console.log('  difiere', cs.join(' '), a, b); }
  }
  ok(malos === 0, `puente=${cfg.puente} asAlto=${cfg.asAlto}: ${n} manos aleatorias de 6-10 cartas coinciden`);
}
// casos a mano
console.log('-- casos a mano');
{
  const P = perfil({ puente: true });
  const c = (s) => analizar(s.split(' '), P);
  ok(c('7o 7c 7e').ok && c('7o 7c 7e').etiqueta === 'Trío de 7', 'trío de 7');
  ok(c('7o 7c 7e 7b').etiqueta === 'Cuarteto de 7', 'cuarteto');
  ok(!c('7o 7c 7e 7b 7o').ok, 'cinco iguales no');
  ok(c('1o 2o 3o').ok && c('7o 10o 11o 12o').ok && c('5o 6o 7o 10o 11o 12o').ok, 'escaleras: 1-2-3, 7-10-11-12 y 5-6-7-10-11-12 con puente');
  ok(!c('1o 2o 4o').ok && !c('1o 2c 3o').ok && !c('12o 1o 2o').ok, 'huecos, palos mezclados, As no circular');
  ok(c('1o 2o 0J').ok && c('1o 3o 0J').ok && c('7c 7o 0J').ok && !c('1o 5o 0J').ok, 'comodín completa trío o escalera');
  ok(!analizar('7c 7o 0J 0J'.split(' '), P).ok && analizar('7c 7o 0J 0J'.split(' '), perfil({ maxComodinesPorCombo: 2 })).ok, 'un comodín por combinación (configurable)');
  const Pn = perfil({ puente: false });
  ok(!analizar('7o 10o 11o'.split(' '), Pn).ok && analizar('10o 11o 12o'.split(' '), Pn).ok && !analizar('7o 0J 11o'.split(' '), Pn).ok, 'sin puente: 7 y sota no son consecutivas ni con comodín');
  ok(analizar('11o 12o 1o'.split(' '), perfil({ asAlto: true })).ok && analizar('11o 12o 0J'.split(' '), perfil({ asAlto: true })).ok, 'As alto opcional');
  ok(!analizar('1o 2o 3o 4o'.split(' '), perfil({ minEsc: 5 })).ok, 'largo mínimo configurable');
  const m = { id: 1, due: 0, c: ['4o', '5o', '6o'] };
  ok(puedeAgregarA(m, ['7o'], P, 'todas', 1) && puedeAgregarA(m, ['3o'], P, 'propias', 0) && !puedeAgregarA(m, ['3o'], P, 'propias', 1) && !puedeAgregarA(m, ['8c'], P, 'todas', 0) && !puedeAgregarA(m, ['3o'], P, 'no', 0), 'agregar a combinaciones: todas / propias / no');
}

// ---- planificador contra fuerza bruta ----
console.log('-- planificador vs fuerza bruta');
function brutaCobertura(mano, mesa, P, modo, yo) {
  const memo = new Map();
  const rec = (resto, mm) => { // resto: cartas de la mano aun sin decidir
    if (!resto.length) return 0;
    const key = resto.join() + '#' + mm.map((x) => x.c.join('')).join('|');
    if (memo.has(key)) return memo.get(key);
    const [x, ...r] = resto;
    let mejor = rec(r, mm); // dejar x sin colocar
    for (const m of mm) if (puedeAgregarA(m, [x], P, modo, yo)) mejor = Math.max(mejor, 1 + rec(r, mm.map((y) => (y === m ? { ...y, c: y.c.concat([x]) } : y))));
    // x en una combinacion nueva con un subconjunto de r
    for (let mask = 1; mask < (1 << r.length); mask++) {
      const sub = r.filter((_, i) => mask & (1 << i)), cs = [x].concat(sub);
      if (cs.length < 3 || !analizar(cs, P).ok) continue;
      const rest = r.filter((_, i) => !(mask & (1 << i)));
      mejor = Math.max(mejor, cs.length + rec(rest, mm));
    }
    memo.set(key, mejor); return mejor;
  };
  return rec(mano, mesa);
}
{
  const rng = nuevoRng('plan'); let malos = 0, n = 0, conMesa = 0;
  for (const cfg of [{ puente: true }, { puente: false, asAlto: true }]) {
    const P = perfil(cfg), U = MAZO.concat([COMODIN]);
    for (let i = 0; i < 700; i++) {
      const bar = mezclar(U.slice(), rng), k = 5 + ent(rng, 4), mano = bar.slice(0, k);
      // mesa: 0-3 combinaciones validas ya bajadas (tomadas de las siguientes cartas)
      const mesa = []; let q = k;
      const nm = i % 3; for (let a = 0; a < nm; a++) { const cs = bar.slice(q, q + 3 + ent(rng, 2)); q += cs.length; if (analizar(cs, P).ok) mesa.push({ id: a + 1, due: a % 2, c: cs }); }
      // forzar mesas validas con sesgo: construir un trio/escalera a mano
      if (i % 4 === 0) { const v = T.valores[ent(rng, 10)], p = T.palos; const cs = p.slice(0, 3).map((x) => v + x); if (!mano.some((c) => cs.includes(c))) mesa.push({ id: 9, due: 1, c: cs }); }
      if (mesa.length) conMesa++;
      const modo = i % 5 === 0 ? 'propias' : 'todas', yo = 0;
      const plan = mejorPlan(mano, mesa, P, { modoAgregar: modo, yo }), esperado = brutaCobertura(mano, mesa, P, modo, yo); n++;
      // ejecutar el plan y comprobar que es valido y cubre lo que dice
      let m2 = mesa.map((x) => ({ ...x, c: x.c.slice() })), h = mano.slice(), cubre = 0, validoPlan = true;
      for (const s of plan.pasos) {
        const quedan = sinCartas(h, s.cartas); if (!quedan) { validoPlan = false; break; }
        if (s.t === 'bajar') { if (!analizar(s.cartas, P).ok) { validoPlan = false; break; } m2.push({ id: 100 + m2.length, due: yo, c: s.cartas }); }
        else { const m = m2.find((x) => x.id === s.m); if (!m || !puedeAgregarA(m, s.cartas, P, modo, yo)) { validoPlan = false; break; } m.c = m.c.concat(s.cartas); }
        h = quedan; cubre += s.cartas.length;
      }
      if (!validoPlan || cubre !== plan.cubre || plan.cubre !== esperado || h.length !== mano.length - cubre) { malos++; if (malos < 4) console.log('  plan', mano.join(' '), JSON.stringify(mesa.map((x) => x.c.join(' '))), 'plan', plan.cubre, 'cubre', cubre, 'bruta', esperado, validoPlan); }
    }
  }
  ok(malos === 0, `planificador == fuerza bruta en ${n} manos aleatorias (${conMesa} con combinaciones en mesa)`);
}
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
