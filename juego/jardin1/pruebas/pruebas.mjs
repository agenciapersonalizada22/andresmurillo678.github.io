// Pruebas Node de la logica pura:  node juego/jardin1/pruebas/pruebas.mjs [rapido]
import * as M from '../js/motor.js';
import { P, Z, DESBLOQUEO, IDS_P, IDS_Z, TIENDA, MUNDOS, plantasDe, FILAS, COLS } from '../js/datos.js';
import { nivelAventura, nivelPuzzle, nivelJarrones, nivelSupervivencia, nivelVersus, nivelPorId, zombisDe, N_PUZZLES } from '../js/niveles.js';
import * as ZN from '../js/zen.js';
import { LOGROS, evaluar } from '../js/logros.js';
import { jugarBot } from './bot.mjs';

let fallos = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');
const vacio = (extra) => ({ id: 't', i: 5, tipo: 'normal', cielo: 0, noche: 0, agua: [], niebla: 0, tejado: 0, tumbas: [], jarros: [], solIni: 500, olas: [], mundo: 1, ...extra });
const mk = (extra, semillas = ['dispa'], dif = 'normal') => M.crear({ nivel: vacio(extra), semillas, dif, seed: 3 });
const avanza = (s, seg, dt = 0.05) => { for (let t = 0; t < seg; t += dt) M.paso(s, dt); };

/* ---------- datos ---------- */
ok(IDS_P.length >= 28, 'al menos 28 plantas (' + IDS_P.length + ')');
ok(IDS_Z.length >= 24, 'al menos 24 zombis (' + IDS_Z.length + ')');
ok(new Set(IDS_P.map((k) => P[k].rol)).size >= 8, 'roles de plantas variados');
ok(Object.values(DESBLOQUEO).every((id) => P[id]), 'desbloqueos apuntan a plantas validas');
ok(IDS_P.every((id) => id === 'dispa' || Object.values(DESBLOQUEO).includes(id)), 'toda planta se desbloquea en la aventura');
ok(TIENDA.every((t) => t.p > 0), 'tienda con precios');

/* ---------- dano, armadura y estados ---------- */
{
  const s = mk({}); const z = M.crearZombi(s, 'baliza', 2, 5);
  const hp0 = z.hp, a0 = z.arm.hp; M.danar(s, z, 100, { proyectil: true });
  ok(z.arm.hp === a0 - 100 && z.hp === hp0, 'el dano va primero a la armadura');
  M.danar(s, z, 400, {}); ok(!z.arm && Math.abs(hp0 - z.hp - 130) < 1e-6, 'el dano sobrante pasa al cuerpo');
  const r = M.crearZombi(s, 'reja', 1, 5); const hr = r.hp; M.danar(s, r, 50, { proyectil: true }); ok(r.hp === hr && r.arm.hp < 600, 'la reja absorbe disparos rectos');
  M.danar(s, r, 50, { arco: true }); ok(r.hp < hr, 'los tiros en arco pasan por encima de la reja');
  const c = M.crearZombi(s, 'paseante', 3, 5); M.danar(s, c, 1000, {}); ok(c.estado === 'muere', 'zombi muere al agotar vida');
  const g = M.crearZombi(s, 'gargola', 0, 5); const hg = g.hp; M.danar(s, g, 100, { proyectil: true }); ok(Math.abs(hg - g.hp - 50) < 1e-6, 'la gargola reduce a la mitad los proyectiles');
}
{
  const s = mk({}); const z = M.crearZombi(s, 'paseante', 2, 8); M.aplicarHielo(s, z, 'hielo');
  ok(z.lento > 0 && z.cong === 0, 'el hielo ralentiza');
  const x0 = z.x; avanza(s, 1); const d1 = x0 - z.x;
  const w = M.crearZombi(s, 'paseante', 4, 8); const w0 = w.x; avanza(s, 1); ok(d1 < (w0 - w.x) * 0.6, 'ralentizado avanza menos de la mitad+');
  M.aplicarHielo(s, z, 'hielo'); M.aplicarHielo(s, z, 'hielo'); ok(z.cong > 0, 'tres impactos congelan');
  const xf = z.x; avanza(s, 1); ok(Math.abs(z.x - xf) < 1e-9, 'congelado no se mueve');
  const y = M.crearZombi(s, 'yeti', 1, 8); M.aplicarHielo(s, y, 'hielo'); ok(y.lento === 0, 'el yeti es inmune al hielo');
  M.aplicarHielo(s, z, 'fuego'); ok(z.lento === 0 && z.cong === 0, 'el fuego quita el frio');
  const m = M.crearZombi(s, 'paseante', 3, 8); M.aplicarHielo(s, m, 'mante'); ok(m.atur > 0, 'la mantequilla aturde');
}

/* ---------- economia ---------- */
{
  const s = mk({ solIni: 150 }, ['dispa', 'giras']);
  ok(s.sol === 150, 'energia inicial');
  const r = M.plantar(s, 0, 2, 2); ok(r.ok && s.sol === 50, 'plantar cuesta energia');
  ok(!M.plantar(s, 0, 1, 1).ok && s.stats.plantadas === 1, 'recarga impide repetir al instante');
  s.sol = 10; ok(M.plantar(s, 1, 0, 0).motivo === 'sol', 'sin energia no se planta');
  s.sol = 500; avanza(s, 8); ok(M.cartaListaEn(s, 0) === 0, 'la semilla se recarga');
  const p = M.plantar(s, 1, 0, 0); ok(p.ok, 'plantar girasolito');
  avanza(s, 10); ok(s.soles.length > 0, 'el girasol produce sol'); const n0 = s.sol; M.recogerTodo(s); ok(s.sol > n0, 'recoger sol suma energia');
  const s2 = mk({ cielo: 1 }); avanza(s2, 20); ok(s2.soles.length >= 1, 'cae sol del cielo en niveles de dia');
  const s3 = mk({ cielo: 0 }); avanza(s3, 30); ok(s3.soles.length === 0, 'sin cielo no cae sol');
  const s4 = M.crear({ nivel: vacio({ solIni: 0 }), semillas: ['giras'], tienda: { solini: 1, solgrande: 1, rec1: 1, palaoro: 1 } }); ok(s4.sol === 50 && s4.solVal === 30 && s4.recMult < 1, 'tienda: energia inicial, soles brillantes y recarga');
  M.plantar(s4, 0, 0, 0); const sol0 = s4.sol; M.pala(s4, 0, 0); ok(s4.sol === sol0 + 25, 'pala de oro devuelve la mitad');
}
{
  const s = mk({ agua: [2], solIni: 999 }, ['dispa', 'lirio', 'alga']);
  ok(!M.puedePlantarEn(s, 'dispa', 2, 3), 'no se planta en agua sin lirio'); ok(M.plantar(s, 1, 2, 3).ok && M.puedePlantarEn(s, 'dispa', 2, 3), 'lirio permite plantar en agua');
  ok(!M.puedePlantarEn(s, 'lirio', 1, 3), 'el lirio solo flota en agua'); ok(M.puedePlantarEn(s, 'alga', 2, 5), 'alga va directa al agua');
  const t = mk({ tejado: 1 }, ['dispa', 'maceta']); ok(!M.puedePlantarEn(t, 'dispa', 1, 1) && M.puedePlantarEn(t, 'maceta', 1, 1), 'tejado exige maceta');
  const g = mk({ tumbas: [[1, 6]] }, ['dispa', 'escarba']); ok(!M.puedePlantarEn(g, 'dispa', 1, 6) && M.puedePlantarEn(g, 'escarba', 1, 6), 'las tumbas bloquean salvo escarbatumbas');
  const q = mk({}, ['giras', 'dosol', 'nogal', 'nogal2', 'calaba']); M.colocar(q, 'giras', 0, 0, true); ok(M.puedePlantarEn(q, 'dosol', 0, 0) && !M.puedePlantarEn(q, 'nogal2', 0, 0), 'las mejoras solo sobre su base');
  M.colocar(q, 'nogal', 1, 1, true); ok(M.puedePlantarEn(q, 'calaba', 1, 1), 'calabazon sobre planta');
}

/* ---------- colisiones por carril ---------- */
{
  const s = mk({}); M.colocar(s, 'dispa', 2, 1, true); const za = M.crearZombi(s, 'paseante', 3, 7), zb = M.crearZombi(s, 'paseante', 2, 7);
  avanza(s, 6); ok(za.hp === za.hpMax, 'el disparo no afecta a otro carril'); ok(zb.hp < zb.hpMax, 'el disparo alcanza a su carril');
  const s2 = mk({}); M.colocar(s2, 'dispa', 2, 1, true); const al = M.crearZombi(s2, 'globero', 2, 7); avanza(s2, 5); ok(al.hp === al.hpMax, 'las semillas rectas no tocan globos');
  const s3 = mk({}); M.colocar(s3, 'cacto', 2, 1, true); const al3 = M.crearZombi(s3, 'globero', 2, 7); avanza(s3, 5); ok(al3.hp < al3.hpMax, 'la espina alta alcanza globos');
  const s4 = mk({}); M.colocar(s4, 'nogal', 2, 3, true); const z = M.crearZombi(s4, 'paseante', 2, 6); avanza(s4, 25); const nog = s4.celdas[2 * 9 + 3].p; ok(nog && nog.hp < nog.hpMax && z.x > 3.8 && z.x < 4.2, 'el zombi se detiene y muerde el muro');
  const s5 = mk({}); M.colocar(s5, 'pincho', 2, 3, true); const z5 = M.crearZombi(s5, 'paseante', 2, 6); avanza(s5, 20); ok(z5.hp < z5.hpMax || z5.estado === 'muere', 'los pinchos hieren al pasar y no bloquean'); 
  const s6 = mk({}); const zz = M.crearZombi(s6, 'paseante', 2, 0.3); avanza(s6, 0.3); ok(s6.cort[2].estado === 'activa', 'la cortadora se activa en su carril'); avanza(s6, 3); ok(zz.estado === 'muere' && s6.cort[2].estado === 'gastada' && !s6.fin, 'la cortadora siega y se gasta');
  const s7 = mk({}); M.crearZombi(s7, 'paseante', 2, 0.1); avanza(s7, 4); const z7 = M.crearZombi(s7, 'paseante', 2, 0.1); avanza(s7, 3); ok(s7.fin === 'derrota', 'sin cortadora el zombi llega a casa: derrota');
  const s8 = mk({}, ['dispa']); M.colocar(s8, 'cereza', 2, 4, true); const a = M.crearZombi(s8, 'paseante', 1, 4.5), b = M.crearZombi(s8, 'paseante', 4, 4.5); avanza(s8, 3); ok(a.estado === 'muere' && b.estado !== 'muere', 'la cerecilla explota en 3x3');
  const s9 = mk({}); M.colocar(s9, 'chile', 2, 0, true); const f1 = M.crearZombi(s9, 'cubero', 2, 8), f2 = M.crearZombi(s9, 'paseante', 3, 8); avanza(s9, 3); ok(f1.estado === 'muere' && f2.estado !== 'muere', 'el aji quema todo su carril');
  const sa = mk({}); M.colocar(sa, 'mina', 2, 4, true); const m1 = M.crearZombi(sa, 'paseante', 2, 4.5); avanza(sa, 0.5); ok(m1.estado !== 'muere' && sa.plantas[0].arma > 0, 'la papamina sin armar no explota'); const sa2 = mk({}); M.colocar(sa2, 'mina', 2, 4, true); avanza(sa2, 13); const m2 = M.crearZombi(sa2, 'paseante', 2, 5.5); avanza(sa2, 4); ok(m2.estado === 'muere', 'la papamina armada explota');
  const sb = mk({}); M.colocar(sb, 'mordelon', 2, 3, true); const t1 = M.crearZombi(sb, 'paseante', 2, 4.2); avanza(sb, 1); ok(t1.estado === 'muere' && t1.tragado, 'el mordelon se traga a un zombi'); const t2 = M.crearZombi(sb, 'paseante', 2, 4.2); avanza(sb, 1); ok(t2.estado !== 'muere', 'y mastica antes de repetir');
}
{
  const s = mk({}); M.colocar(s, 'nogal', 2, 3, true); const z = M.crearZombi(s, 'pertiguista', 2, 6); avanza(s, 20); ok(z.x < 3, 'el pertiguista salta el muro');
  const s2 = mk({}); M.colocar(s2, 'hipno', 2, 3, true); const h = M.crearZombi(s2, 'paseante', 2, 4.0); avanza(s2, 2); ok(h.hip, 'la hipnoseta pasa al zombi a tu bando'); const e = M.crearZombi(s2, 'cubero', 2, 7); avanza(s2, 12); ok(e.hp < e.hpMax || e.arm.hp < e.arm.hpMax, 'el hipnotizado pelea contra sus antiguos aliados');
  const s3 = mk({}); M.colocar(s3, 'nogal', 2, 3, true); const c = M.crearZombi(s3, 'coloso', 2, 4.2); avanza(s3, 3); ok(!s3.celdas[2 * 9 + 3].p, 'el coloso aplasta de un golpe');
  const s4 = mk({ agua: [2] }, ['dispa']); const nd = M.crearZombi(s4, 'nadador', 2, 6); M.colocar(s4, 'dispa', 2, 1, true); s4.celdas[2 * 9 + 1].base = 'lirio'; avanza(s4, 1); ok(nd.sumergido || nd.x < 6, 'el nadador va sumergido en agua');
  const s5 = mk({}); const t = M.crearZombi(s5, 'topo', 2, 7); ok(t.bajo, 'el topo empieza bajo tierra'); avanza(s5, 20); ok(!t.bajo && t.dir === 1, 'el topo sale por detras y se da la vuelta');
  const s6 = mk({}); M.colocar(s6, 'iman', 2, 0, true); const bz = M.crearZombi(s6, 'cubero', 2, 3); avanza(s6, 9); ok(!bz.arm, 'el iman arranca armaduras metalicas');
  const s7 = mk({ niebla: 1 }); ok(!M.visibleEn(s7, 2, 7), 'la niebla oculta zombis lejanos'); M.colocar(s7, 'faro', 2, 6, true); ok(M.visibleEn(s7, 2, 7), 'el farolillo disipa la niebla');
  const s8 = mk({ noche: 0 }); M.colocar(s8, 'esporin', 2, 1, true); const hz = M.crearZombi(s8, 'paseante', 2, 3); avanza(s8, 5); ok(hz.hp === hz.hpMax, 'los hongos duermen de dia'); M.colocar(s8, 'despierta', 0, 0, true); avanza(s8, 4); ok(hz.hp < hz.hpMax, 'el grano despertador los activa');
}

/* ---------- oleadas e IA de spawn ---------- */
{
  const niv = nivelAventura(2, 3); const s = M.crear({ nivel: niv, semillas: ['dispa'], seed: 9 }); let avisos = 0, finales = 0, olas = 0; let hist = [];
  for (let t = 0; t < 400 && olas < niv.olas.length; t += 0.1) { M.paso(s, 0.1); for (const e of s.ev) { if (e.k === 'avisoOla') { avisos++; if (e.final) finales++; } if (e.k === 'ola') olas++; } s.ev.length = 0; s.zombis.forEach((z) => { z.hp = z.hpMax; }); }
  ok(olas === niv.olas.length, 'se lanzan todas las oleadas'); ok(finales === 1, 'hay exactamente un aviso de oleada final'); ok(avisos >= 2, 'hay aviso de gran oleada');
  ok(niv.olas[niv.olas.length - 1].ultima, 'la ultima oleada esta marcada');
}
{
  let bien = true, vistos = new Set(), n50 = 0;
  for (let w = 1; w <= 5; w++) for (let k = 1; k <= 10; k++) {
    const niv = nivelAventura(w, k); n50++; const M0 = MUNDOS[w - 1];
    niv.olas.forEach((o) => o.z.forEach((e) => { vistos.add(e.z); if (!Z[e.z] || e.r < 0 || e.r >= FILAS) bien = false; if ((e.z === 'nadador' || e.z === 'flotador') && !(M0.agua.length && M0.agua.includes(e.r))) bien = false; if (e.z === 'espectro' && !M0.noche) bien = false; }));
  }
  ok(n50 === 50 && bien, '50 niveles generados, zombis y carriles validos');
  ok(IDS_Z.filter((z) => !vistos.has(z)).length <= 4, 'casi todos los zombis aparecen en la aventura (faltan: ' + IDS_Z.filter((z) => !vistos.has(z)).join(',') + ')');
  const a = JSON.stringify(nivelAventura(3, 5).olas), b = JSON.stringify(nivelAventura(3, 5).olas); ok(a === b, 'la generacion de niveles es determinista');
  ok(nivelAventura(5, 10).olas[0].z.some((e) => e.z === 'moho'), 'el nivel 5-10 tiene jefe final'); ok(nivelAventura(3, 10).olas.some((o) => o.z.some((e) => e.z === 'capataz')), 'el 3-10 tiene jefe de mundo');
  ok(nivelAventura(1, 5).tipo === 'cinta' && nivelAventura(2, 5).tipo === 'tumbas' && nivelAventura(2, 10).tipo === 'bolera' && nivelAventura(3, 8).tipo === 'carrera' && nivelAventura(5, 5).tipo === 'jarros', 'minijuegos en su sitio');
  const dens = (w, k) => nivelAventura(w, k).olas.reduce((c, o) => c + o.z.length, 0); ok(dens(5, 9) > dens(1, 2) * 3, 'la dificultad crece con el nivel');
}
{
  const niv = nivelSupervivencia('piscina', true); const s = M.crear({ nivel: niv, semillas: ['dispa'], seed: 5 }); let olas = 0;
  for (let t = 0; t < 300; t += 0.1) { M.paso(s, 0.1); s.zombis.forEach((z) => { if (z.x < 3) M.matar(s, z); }); for (const e of s.ev) if (e.k === 'ola') olas++; s.ev.length = 0; s.cort.forEach((c) => { c.estado = 'lista'; }); }
  ok(olas >= 8, 'la supervivencia genera oleadas sin fin (' + olas + ')'); ok(s.olaNum === olas, 'contador de oleadas');
  const n2 = nivelSupervivencia('dia', false), n3 = nivelSupervivencia('dia', true); const ss = M.crear({ nivel: n2, seed: 1 }), sd = M.crear({ nivel: n3, seed: 1 }); const a = n2.generar(10, ss), d = n3.generar(10, sd); ok(d.z.length >= a.z.length, 'el modo duro es mas denso');
}

/* ---------- minijuegos ---------- */
{
  const niv = nivelAventura(2, 10); const s = M.crear({ nivel: niv, seed: 4 }); avanza(s, 20); ok(s.cola.length > 0 && s.cola.every((id) => ['bola', 'bolagr', 'bomba'].includes(id)), 'la cinta de la bolera trae bolas');
  M.crearZombi(s, 'paseante', 2, 6); const z = s.zombis[s.zombis.length - 1]; const i = s.cola.findIndex((x) => x === 'bola'); if (i >= 0) { M.lanzarBola(s, i, 2); avanza(s, 3); ok(z.estado === 'muere', 'la bola derriba zombis de su carril'); } else ok(true, 'bola (sin bola en cinta)');
  const sc = M.crear({ nivel: nivelAventura(1, 5), seed: 2 }); avanza(sc, 15); ok(sc.cola.length >= 2 && sc.cola.every((id) => P[id]), 'la cinta entrega plantas'); const q = sc.cola.length; M.plantar(sc, 0, 2, 2); ok(sc.cola.length === q - 1 && sc.plantas.length === 1, 'plantar de la cinta es gratis y consume la carta');
  const st = nivelAventura(2, 5); const s2 = M.crear({ nivel: st, seed: 1, semillas: [] }); ok(s2.celdas.filter((c) => c.tumba).length === 9, 'rompe-tumbas coloca 9 tumbas'); const t = st.tumbas[0]; for (let k = 0; k < 3; k++) M.pala(s2, t[0], t[1]); ok(!s2.celdas[t[0] * 9 + t[1]].tumba, 'tres golpes de pala rompen una tumba');
  const sj = M.crear({ nivel: nivelJarrones(1), seed: 1 }); const j = sj.celdas.findIndex((c) => c.jarro); ok(j >= 0, 'hay jarrones'); const kk = M.romperJarro(sj, Math.floor(j / 9), j % 9); ok(kk && !sj.celdas[j].jarro && sj.stats.jarrones === 1, 'romper un jarron');
  const sp = M.crear({ nivel: nivelPuzzle(1), seed: 1 }); ok(sp.cola.length === 5 && sp.zombis.length === 5 && sp.cort.every((c) => c.estado === 'no'), 'rompecabezas: plantas dadas y zombis colocados, sin cortadoras');
  const sc2 = M.crear({ nivel: nivelAventura(3, 8), seed: 1, semillas: ['giras'] }); sc2.stats.soles = 1300; M.paso(sc2, 0.1); ok(sc2.fin === 'victoria', 'carrera de energia: se gana al reunir la energia objetivo');
  const sv = M.crear({ nivel: nivelVersus(), seed: 1 }); ok(M.lanzarZombi(sv, 'paseante', 2, 25) && sv.versus.cerebros === 125 && sv.zombis.length === 1, 'versus: lanzar zombi gasta cerebros'); ok(!M.lanzarZombi(sv, 'coloso', 2, 250), 'versus: sin cerebros no se lanza'); avanza(sv, 151); ok(sv.fin === 'plantas' || sv.fin === 'zombis', 'versus termina por tiempo o llegada');
}

/* ---------- serializacion ---------- */
{
  const niv = nivelAventura(1, 3); const s = M.crear({ nivel: niv, semillas: ['giras', 'dispa', 'nogal'], seed: 11 });
  s.sol = 800; M.plantar(s, 1, 2, 2); M.plantar(s, 0, 0, 0); avanza(s, 40);
  const txt = M.serializar(s); const r = M.restaurar(txt, nivelAventura(1, 3), 'normal');
  ok(r.plantas.length === s.plantas.length && r.celdas[2 * 9 + 2].p === r.plantas.find((p) => p.r === 2 && p.c === 2), 'el guardado restaura plantas y celdas enlazadas');
  avanza(s, 20); avanza(r, 20); ok(JSON.stringify([s.sol, s.zombis.length, s.t.toFixed(2)]) === JSON.stringify([r.sol, r.zombis.length, r.t.toFixed(2)]), 'la partida restaurada sigue igual (determinista)');
  const sv = nivelSupervivencia('dia', false); const a = M.crear({ nivel: sv, semillas: ['dispa'], seed: 2 }); avanza(a, 70); const b = M.restaurar(M.serializar(a), nivelSupervivencia('dia', false), 'normal'); for (let k = 0; k < 800; k++) { M.paso(b, 0.05); b.zombis.forEach((z) => { if (z.x < 2) M.matar(b, z); }); } ok(b.olaNum > a.olaNum, 'la supervivencia restaurada continua generando oleadas (' + a.olaNum + ' -> ' + b.olaNum + ')');
  ok(JSON.parse(txt).niv === undefined, 'el guardado no incluye el nivel');
}

/* ---------- zen ---------- */
{
  const t0 = 1e12, p = ZN.nueva('giras', t0); ZN.regar(p); ZN.avanzar(p, t0 + 60000); ok(p.crec > 0.15 && p.agua < 1, 'zen: crece con agua');
  const q = ZN.nueva('giras', t0); q.agua = 0; ZN.avanzar(q, t0 + 600000); ok(q.crec === 0, 'zen: sin agua no crece');
  const r = ZN.nueva('giras', t0); for (let i = 0; i < 30; i++) { ZN.regar(r); ZN.avanzar(r, t0 + (i + 1) * 60000); } ok(r.crec === 1 && r.mon > 0 && ZN.etapa(r) === 3, 'zen: adulta guarda monedas'); const pv = ZN.precioVenta(r); ok(pv > 30 + 70, 'zen: la venta incluye las monedas guardadas'); ok(ZN.cosechar(r) >= 5, 'zen: se pueden cobrar monedas');
  const a = ZN.nueva('giras', t0); ZN.regar(a); ZN.abonar(a, t0); ZN.avanzar(a, t0 + 60000); const b = ZN.nueva('giras', t0); ZN.regar(b); ZN.avanzar(b, t0 + 60000); ok(a.crec > b.crec * 1.8, 'zen: el abono duplica el crecimiento');
}

/* ---------- logros ---------- */
{
  ok(LOGROS.length >= 30 && new Set(LOGROS.map((l) => l.id)).size === LOGROS.length && LOGROS.every((l) => /^[a-z0-9_]{1,40}$/.test(l.id)), 'logros con ids validos y unicos (' + LOGROS.length + ')');
  const PR = { hechos: { '1-1': { e: 3 } }, stats: { matados: 120, sinCort: 1, mejorSurv: 0, zenVentas: 0, versus: 0 }, tienda: {}, logros: {}, zen: { parcelas: [] }, puzzle: {}, jarros: {}, surv: {}, ganadas: 0, tut: {} };
  const l = evaluar(PR, { estrellas: 3, plantasN: 3, plantasTotal: 39, dalt: false }); ok(l.includes('primera_victoria') && l.includes('cien_zombis') && l.includes('sin_cortadoras') && !l.includes('mundo_1'), 'evaluar logros');
}

/* ---------- balance con bot ---------- */
{
  const lista = (id) => { const [w, k] = id.split('-').map(Number), i = (w - 1) * 10 + k, done = new Set(); for (let q = 1; q < i; q++) done.add(q); const pl = plantasDe(done); const pref = ['giras', 'dispa', 'hielo', 'nogal', 'cereza', 'lirio', 'melon', 'mina', 'pincho', 'maceta']; const sem = pref.filter((p) => pl.includes(p)).slice(0, 8); if (i === 1) return ['dispa']; return sem; };
  for (const id of ['1-1', '3-5']) { const [w, k] = id.split('-').map(Number); const r = jugarBot(nivelAventura(w, k), lista(id), { dif: 'normal' }); ok(r.fin === 'victoria', `el bot completa el nivel ${id} en normal (t=${r.t.toFixed(0)}s, cortadoras=${r.cort})`); }
  if (!rapido) { const r = jugarBot(nivelAventura(1, 1), ['dispa'], { dif: 'facil' }); ok(r.fin === 'victoria', 'el bot completa 1-1 en facil'); }
  const r0 = jugarBot(nivelAventura(1, 1), ['dispa'], { dif: 'normal', max: 20 }); ok(!r0.fin, 'sin intervencion extra el nivel 1-1 no termina en 20 s');
  const bad = M.crear({ nivel: nivelAventura(1, 2), semillas: ['dispa'], seed: 1 }); avanza(bad, 300); ok(bad.fin === 'derrota', 'sin defensas se pierde (el juego no regala la victoria)');
}
console.log(`\n${n - fallos}/${n} pruebas correctas`);
process.exit(fallos ? 1 : 0);
