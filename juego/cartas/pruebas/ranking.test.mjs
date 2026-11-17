// Proteccion del ranking: los ajustes de economia/mesa no pueden inflar los puntajes enviados con Cuenta.puntaje.
globalThis.window = {};
const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const E = await import('../js/marco/economia.js');
const Pro = await import('../js/marco/progreso.js');
const A = await import('../js/marco/almacen.js');
const { Conquian } = await import('../js/juegos/conquian/index.js');
const { Dompe } = await import('../js/juegos/dompe/index.js');
const { Pescar } = await import('../js/juegos/pescar/index.js');

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } };

// monedero: solo cuenta si empezo con las fichas por defecto (o menos)
let m = E.monederoNuevo(E.REF.inicial); m.saldo = 8000;
ok(!E.monederoInflado(m) && E.valorRanking(m) === 8000, 'monedero por defecto cuenta');
m = E.monederoNuevo(E.REF.inicial - 1000); ok(!E.monederoInflado(m), 'monedero con menos fichas cuenta');
m = E.monederoNuevo(50000); m.saldo = 60000;
ok(E.monederoInflado(m) && E.valorRanking(m) === 0, 'monedero con 50000 iniciales no cuenta');
ok(E.monederoInflado({ saldo: 100, inicial: 6000, historial: [] }), 'monedero antiguo sin campos nuevos se evalua por inicial');
// regalo diario superior al de referencia: el exceso no cuenta
m = E.monederoNuevo(E.REF.inicial); E.reclamarRegalo(m, 1e12, 5000);
ok(m.exceso === 5000 - E.REF.regalo && E.valorRanking(m) === m.saldo - m.exceso, 'regalo de 5000: solo 500 cuentan');
// fichas de bots / mesas no clasificables
ok(E.mesaLimpia({ fichasIni: 1000 }) && E.mesaLimpia({}) && E.mesaLimpia(null) && !E.mesaLimpia({ fichasIni: 100000 }), 'mesaLimpia');
m = E.monederoNuevo(E.REF.inicial); m.saldo += 9000; E.sumarExceso(m, 9000); ok(E.valorRanking(m) === E.REF.inicial, 'ganancia en mesa no clasificable no cuenta');
E.sumarExceso(m, -20000); ok(m.exceso === 0, 'el exceso no baja de 0');
// reglas estandar
for (const [J, malo] of [[Conquian, { nMano: 4 }], [Dompe, { comodin: false }], [Pescar, { libro: 3 }], [Pescar, { familiar: true }]]) {
  const def = {}; J.opciones.forEach((o) => { def[o.id] = o.def; });
  ok(E.opcionesEstandar(J.opciones, def) && E.opcionesEstandar(J.opciones, {}), J.id + ' por defecto es estandar');
  ok(E.opcionesEstandar(J.opciones, { ana: 5000 }), J.id + ': la ana no rompe el estandar');
  ok(!E.opcionesEstandar(J.opciones, Object.assign({}, def, malo)), J.id + ' con ' + Object.keys(malo)[0] + ' no es estandar');
}
const dd = {}; Dompe.opciones.forEach((o) => { dd[o.id] = o.def; }); dd.g_tresPares = !dd.g_tresPares;
ok(!E.opcionesEstandar(Dompe.opciones, dd), 'Dompe con victorias inmediatas cambiadas no es estandar');

// puntajes de progreso
const reset = () => { Object.keys(mem).forEach((k) => delete mem[k]); };
reset();
const mano = (o) => Pro.registrarMano(Object.assign({ juego: 'dompe', yo: 0, delta: 10, ganada: true, bote: 100, rank: true, estandar: true, meta: {} }, o));
mano({}); mano({}); ok(Pro.puntajes().dompe_racha === 2 && Pro.puntajes().bote === 100, 'racha y bote estandar');
mano({ estandar: false }); mano({ estandar: false }); mano({ estandar: false }); ok(Pro.puntajes().dompe_racha === 2, 'victorias con reglas no estandar no suman a la racha de ranking');
mano({}); ok(Pro.puntajes().dompe_racha === 3, 'siguiente victoria estandar suma');
mano({ ganada: false, delta: -10 }); mano({}); ok(Pro.puntajes().dompe_racha === 3 && A.stats.obtener().rachaRankDompe === 1, 'perder corta la racha');
mano({ bote: 99999, rank: false }); ok(Pro.puntajes().bote === 100, 'bote de mesa no clasificable no cuenta');
mano({ juego: 'poker', bote: 5000 }); ok(Pro.puntajes().bote === 5000, 'bote clasificable cuenta');
Pro.registrarMano({ juego: 'conquian', yo: 0, delta: 10, ganada: true, rank: true, estandar: false, meta: { turnosPropios: 2, nJug: 2 } });
ok(Pro.puntajes().conq_turnos === 0 && A.stats.obtener().mejorConqTurnos === 2, 'conquian no estandar: turnos locales pero no ranking');
Pro.registrarMano({ juego: 'conquian', yo: 0, delta: 10, ganada: true, rank: true, estandar: true, meta: { turnosPropios: 7, nJug: 2 } });
ok(Pro.puntajes().conq_turnos === 7, 'conquian estandar cuenta turnos');
const pesc = (o, libros) => Pro.registrarMano({ juego: 'pescar', yo: 0, delta: 0, ganada: true, rank: true, estandar: true, meta: Object.assign({ libros: [libros], baraja: 'fr52', libro: 4, nJug: 2 }, o) });
pesc({ baraja: 'es48', libro: 3 }, 16); ok(Pro.puntajes().pesc_libros === 0, 'libros con baraja de 48 no cuentan'); pesc({}, 9); ok(Pro.puntajes().pesc_libros === 9, 'libros con baraja de 52 cuentan');
Pro.revisarMonedero(60000, 0); ok(Pro.puntajes().monedero === 0, 'monedero inflado no genera puntaje'); Pro.revisarMonedero(7000, 7000); ok(Pro.puntajes().monedero === 7000, 'monedero limpio genera puntaje');
console.log(fallos ? 'FALLAN ' + fallos + ' de ' + total : 'OK ' + total + ' comprobaciones'); process.exit(fallos ? 1 : 0);
