// Pruebas de logica (Node, sin DOM): node juego/gatos/pruebas/pruebas.mjs
import * as R from '../js/reglas.js';
import { Mesa, relojVirtual } from '../js/mesa.js';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA:', m); } };
const total = R.MAZO.length;
function cuentaCartas(est) { return (est.fase === 'bomba' ? 1 : 0) + est.mazo.length + est.desc.length + est.mano.reduce((a, m) => a + m.length, 0); }
function bombasEnMazo(est) { return est.mazo.filter((c) => R.MAZO[c] === R.T.BOMBA).length + (est.fase === 'bomba' ? 1 : 0); }

// 1) reparto
for (const n of [2, 3, 4, 5]) {
  const e = R.nuevaPartida({}, n, 123 + n);
  ok(e.mano.every((m) => m.length === 5 && m.filter((c) => R.MAZO[c] === R.T.DESACTIVAR).length === 1), 'mano inicial n=' + n);
  ok(bombasEnMazo(e) === n - 1, 'bombas n=' + n);
  ok(!e.mano.flat().some((c) => R.MAZO[c] === R.T.BOMBA), 'sin bombas en mano');
  ok(cuentaCartas(e) === { 2: 51, 3: 53, 4: 54, 5: 56 }[n], 'conservacion inicial n=' + n + ' ' + cuentaCartas(e));
}
const eq = R.nuevaPartida({ modo: 'equipos' }, 2, 5); ok(eq.n === 4 && eq.equipo.join() === '0,1,0,1', 'equipos fuerza 4');
const rp = R.nuevaPartida({ modo: 'rapido' }, 3, 9); ok(rp.mano.every((m) => m.length === 4) && rp.mazo.length < 25, 'rapido mazo reducido ' + rp.mazo.length);

// 2) reglas basicas deterministas
{
  const e = R.nuevaPartida({}, 3, 77);
  const j = e.turno; const c = e.mano[j].find((x) => R.MAZO[x] === R.T.DESACTIVAR);
  ok(!R.aplicar(e, j, { t: 'jugar', carta: c }, 0).ok, 'no se juega desactivar');
  ok(!R.aplicar(e, (j + 1) % 3, { t: 'robar' }, 0).ok, 'solo el turno roba');
  e.mazo.push(R.IDS[R.T.ATAQUE][0]); e.mano[j].push(R.IDS[R.T.ATAQUE][0]);
  ok(R.aplicar(e, j, { t: 'jugar', carta: R.IDS[R.T.ATAQUE][0] }, 0).ok && e.fase === 'nope', 'jugar ataque abre ventana');
  ok(!R.cerrarNope(e, 10), 'no cierra antes de tiempo');
  const nopeId = R.IDS[R.T.NOPE][0]; e.mano[(j + 1) % 3].push(nopeId);
  ok(R.aplicar(e, (j + 1) % 3, { t: 'nope' }, 100).ok, 'nope');
  ok(R.cerrarNope(e, 100 + 5000) && e.fase === 'turno' && e.turno === j && e.rest === 1, 'ataque anulado por nope');
  // ataque que resuelve
  const a2 = R.IDS[R.T.ATAQUE][1]; e.mano[j].push(a2);
  R.aplicar(e, j, { t: 'jugar', carta: a2 }, 0); R.cerrarNope(e, 9999);
  ok(e.turno === (j + 1) % 3 && e.rest === 2, 'ataque da 2 turnos');
  // doble nope resuelve
  const k = e.turno; const s = R.IDS[R.T.SALTAR][0]; e.mano[k].push(s);
  R.aplicar(e, k, { t: 'jugar', carta: s }, 0);
  e.mano[j].push(R.IDS[R.T.NOPE][1], R.IDS[R.T.NOPE][2]);
  R.aplicar(e, j, { t: 'nope' }, 10); R.aplicar(e, k, { t: 'nope' }, 20) ;
}
{ // bomba: sin desactivar explota, con desactivar reinserta
  const e = R.nuevaPartida({}, 2, 5); const j = e.turno;
  e.mazo.push(R.IDS[R.T.BOMBA][0]);
  const d = e.mano[j].find((x) => R.MAZO[x] === R.T.DESACTIVAR);
  R.aplicar(e, j, { t: 'robar' }, 0);
  ok(e.fase === 'bomba' && !e.mano[j].includes(d), 'desactiva automaticamente');
  ok(R.aplicar(e, j, { t: 'reinsertar', pos: 0 }, 0).ok && e.mazo[e.mazo.length - 1] === R.IDS[R.T.BOMBA][0], 'reinsertar cima');
  const o = e.turno; ok(o !== j, 'turno pasa tras reinsertar');
  R.aplicar(e, o, { t: 'robar' }, 0); // roba bomba, tiene desactivar
  R.aplicar(e, o, { t: 'reinsertar', pos: 5 }, 0);
  const j2 = e.turno; e.mano[j2] = e.mano[j2].filter((x) => R.MAZO[x] !== R.T.DESACTIVAR);
  e.mazo.push(R.IDS[R.T.BOMBA][1]); R.aplicar(e, j2, { t: 'robar' }, 0);
  ok(e.fase === 'fin' && e.fin.ganador !== j2 && !e.vivo[j2], 'explota y termina');
}
{ // combos
  const e = R.nuevaPartida({}, 3, 31); const j = e.turno, o = (j + 1) % 3;
  const g = R.IDS[R.T.GATO]; e.mano[j].push(g[0], g[1], g[2]);
  ok(R.clasificar([g[0], g[1]]) === 'par' && R.clasificar([g[0], g[1], g[2]]) === 'trio', 'clasificar');
  const antes = e.mano[o].length;
  ok(R.aplicar(e, j, { t: 'combo', cartas: [g[0], g[1]], obj: o }, 0).ok, 'par');
  R.cerrarNope(e, 99999); ok(e.mano[o].length === antes - 1, 'par roba una');
  const ped = e.mano[o].find((x) => R.MAZO[x] === R.T.DESACTIVAR); void ped;
  ok(!R.aplicar(e, j, { t: 'combo', cartas: [g[2], R.IDS[R.T.GATO + 1][0]], obj: o }, 0).ok, 'par desigual invalido');
  ok(!R.aplicar(e, j, { t: 'combo', cartas: [g[2]], obj: o }, 0).ok, 'gato suelto no se juega');
}
{ // equipos: no se puede apuntar a companero
  const e = R.nuevaPartida({ modo: 'equipos' }, 4, 3); ok(!R.objetivoValido(e, 0, 2) && R.objetivoValido(e, 0, 1), 'companero no es objetivo');
}

// 3) partidas completas con bots y reloj virtual
function simular(cfg, n, semilla, niveles) {
  const reloj = relojVirtual();
  const as = Array.from({ length: n }, (_, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: niveles[i % niveles.length] }));
  let fin = null;
  const mesa = new Mesa({ cfg, asientos: as, semilla, reloj, alFin: (m, e) => { if (e.partida) fin = e; } });
  mesa.iniciar();
  let pasos = 0;
  while (!fin && pasos < 5000) {
    reloj.avanzar(1000); pasos++;
    const e = mesa.est;
    const nCart = cuentaCartas(e); const esperado = { 2: 51, 3: 53, 4: 54, 5: 56 }[e.n];
    if (!e.cfg.mitad && nCart !== esperado) { ok(false, 'conservacion ' + nCart); break; }
    if (e.fase !== 'fin' && bombasEnMazo(e) !== e.vivo.filter(Boolean).length - 1) { ok(false, 'invariante bombas ' + bombasEnMazo(e)); break; }
  }
  ok(!!fin, `partida termina (n=${n}, modo=${cfg.modo}, semilla=${semilla}, pasos=${pasos})`);
  return { fin, mesa };
}
let g = { 0: 0, 1: 0, 2: 0 }; const rondas = [];
for (const modo of ['clasico', 'rapido', 'equipos', 'torneo']) {
  for (let n = 2; n <= 5; n++) for (let s = 1; s <= 25; s++) {
    if (modo === 'equipos' && n !== 4) continue;
    const niv = [0, 1, 2, 2, 1];
    const r = simular({ modo }, n, s * 7919 + n, niv);
    if (r.fin && modo === 'clasico' && n === 3) g[niv[r.fin.ganador]]++;
    if (r.fin && modo === 'torneo') rondas.push(r.mesa.est.ronda);
  }
}
console.log('victorias en clasico n=3 (niveles 0,1,2):', JSON.stringify(g), 'rondas torneo media', (rondas.reduce((a, b) => a + b, 0) / rondas.length).toFixed(1));

// 4) guardar/restaurar
{
  const reloj = relojVirtual();
  const m = new Mesa({ cfg: {}, asientos: [{ nombre: 'a', tipo: 'humano' }, { nombre: 'b', tipo: 'bot', nivel: 1 }], semilla: 4, reloj }); m.iniciar();
  const d = JSON.parse(JSON.stringify(m.guardar()));
  const r = Mesa.restaurar(d, { reloj: relojVirtual(), salida() {} });
  ok(r && r.est.mazo.length === m.est.mazo.length && r.as[0].ausente, 'restaurar mesa');
}
// 5) filtrado de informacion
{
  const reloj = relojVirtual(); const paq = {};
  const m = new Mesa({ cfg: {}, asientos: [{ nombre: 'a', tipo: 'humano' }, { nombre: 'b', tipo: 'humano' }, { nombre: 'c', tipo: 'humano' }], semilla: 8, reloj, salida: (i, p) => { paq[i] = p; } });
  const e = m.est; e.mazo.push(R.IDS[R.T.FUTURO][0]); e.mano[e.turno].push(R.IDS[R.T.FUTURO][0]); m.iniciar();
  m.comando(e.turno, { t: 'jugar', carta: R.IDS[R.T.FUTURO][0] }); reloj.avanzar(5000);
  const j = e.turno;
  ok(paq[j].v.futuro && paq[j].v.futuro.length === 3, 'futuro visible para quien lo uso');
  ok(paq[(j + 1) % 3].v.futuro === null, 'futuro oculto a otros');
  ok(!JSON.stringify(paq[(j + 1) % 3].v).includes('"mazo"'), 'no se filtra el mazo');
  ok(paq[j].v.mano.length === e.mano[j].length && paq[(j + 1) % 3].v.mano.length === e.mano[(j + 1) % 3].length, 'manos propias');
}
// 6) humanos que juegan, se caen y vuelven: la partida nunca se atasca
{
  const { decidir, decidirNope, nuevaMemoria } = await import('../js/bots.js');
  let atascos = 0, terminadas = 0;
  for (let semilla = 1; semilla <= 40; semilla++) {
    for (const modo of ['clasico', 'equipos']) {
      const reloj = relojVirtual(); let fin = null;
      const as = [0, 1, 2, 3].map((i) => ({ nombre: 'H' + i, color: '#fff', tipo: i < 3 ? 'humano' : 'bot', nivel: 1 }));
      const mesa = new Mesa({ cfg: { modo }, asientos: as, semilla: semilla * 977, reloj, alFin: (m, e) => { if (e.partida) fin = e; } });
      const mem = [0, 1, 2].map(() => nuevaMemoria()); mesa.iniciar();
      let firma = '', desde = 0;
      for (let t = 0; t < 4000 && !fin; t++) {
        reloj.avanzar(350);
        if (t % 40 === 20) { const k = t % 3; mesa.ponerAusente(k, !mesa.as[k].ausente); }
        for (let k = 0; k < 3; k++) {
          if (mesa.as[k].ausente || !mesa.est.vivo[k]) continue;
          const v = mesa.vista(k);
          if (v.fase === 'nope') { if (v.pend.j !== k && decidirNope(v, mem[k], 1, Math.random)) mesa.comando(k, { t: 'nope' }); continue; }
          const act = v.fase === 'turno' ? v.turno : v.fase === 'favor' ? v.pend.a : v.fase === 'bomba' ? v.pend.j : -1;
          if (act === k) { const c = decidir(v, mem[k], 1, Math.random); if (c) mesa.comando(k, c); }
        }
        const e = mesa.est, f = [e.fase, e.turno, e.rest, e.mazo.length, e.desc.length, e.ronda].join();
        if (f !== firma) { firma = f; desde = reloj.ahora(); } else if (reloj.ahora() - desde > 60000 && e.fase !== 'fin') { atascos++; console.log('ATASCO', modo, semilla, f); break; }
      }
      if (fin) terminadas++;
    }
  }
  ok(atascos === 0, 'sin atascos con caidas/reconexiones (' + atascos + ')'); ok(terminadas > 60, 'partidas terminadas con humanos: ' + terminadas);
}
console.log(fallos ? 'FALLOS: ' + fallos : 'TODO OK');
process.exit(fallos ? 1 : 0);
