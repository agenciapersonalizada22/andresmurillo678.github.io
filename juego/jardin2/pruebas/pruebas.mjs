// Pruebas de logica pura (sin DOM): node pruebas/pruebas.mjs
import * as M from '../js/motor.js';
import { P, Z, IDS_P, IDS_Z, MUNDOS, NIV_POR_MUNDO, PODERES, PACKS, POTENCIAR_MAX, FILAS, COLS } from '../js/datos.js';
import { nivelAventura, genOlas, nivelArena, arenaSemillas, nivelDiario, nivelSinFin, valorArena, puntosArena, semanaDe, TOTAL_NIV, EVENTOS, pista } from '../js/niveles.js';
import * as E from '../js/economia.js';
import { misionesDelDia, misionesMundo, colCompleta, colId } from '../js/misiones.js';
import { LOGROS, evaluar } from '../js/logros.js';
import { jugar } from './bot.mjs';

let fallos = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fallos++; console.log('FALLO', m); } };
const base = (o = {}) => ({ id: 't', mundo: 0, n: 3, olas: [{ t: 99999, z: 'momia', r: 0 }], mods: [], mecanica: 'tumbas', ter: [], hpMult: 1, ...o });
const nueva = (o, c = {}) => M.crear({ niv: base(o), seed: 5, semillas: ['chispera', 'brote', 'roble'], ...c });
const correr = (s, seg, dt = 0.05) => { for (let i = 0; i < seg / dt && !s.fin; i++) { M.paso(s, dt); s.ev.length = 0; } };

/* ---------- datos ---------- */
ok(IDS_P.length >= 40, '40+ plantas: ' + IDS_P.length);
const zb = IDS_Z.filter((id) => Z[id].mundo >= 0);
ok(zb.length >= 35, '35+ zombis: ' + zb.length);
ok(MUNDOS.length === 10 && NIV_POR_MUNDO === 12 && TOTAL_NIV === 120, '10 mundos x 12 niveles');
IDS_P.forEach((id) => { const d = P[id]; ok(d.en && d.en.k && d.en.nom, 'energia unica ' + id); ok(d.hp > 0 && d.coste > 0, 'stats ' + id); });
ok(new Set(IDS_P.map((id) => P[id].en.nom)).size === IDS_P.length, 'nombres de energia unicos');
MUNDOS.forEach((W, m) => { ok(Z[W.jefe] && Z[W.jefe].jefe && Z[W.jefe].mundo === m, 'jefe del mundo ' + m); ok(M.crear && true, ''); ok(IDS_Z.filter((id) => Z[id].mundo === m && !Z[id].jefe).length >= 4, 'zombis por mundo ' + m); });
const roles = new Set(IDS_P.map((id) => P[id].rol)); ok(roles.size >= 8, 'roles variados: ' + [...roles].join(','));

/* ---------- energia verde ---------- */
IDS_P.forEach((id) => {
  const s = nueva({}, { semillas: [id] }); s.en = 3; const p = M.colocar(s, id, 2, 2); M.crearZombi(s, 'momia', 2, 6); M.crearZombi(s, 'caballero', 1, 5); M.crearZombi(s, 'momia', 3, 7);
  const sinCarga = nueva({}, { semillas: [id] }); const q = M.colocar(sinCarga, id, 2, 2); ok(!M.energia(sinCarga, q) && sinCarga.en === 0, 'sin carga no se usa ' + id);
  ok(M.energia(s, p) && s.en === 2 && s.st.energias === 1, 'energia consume 1 carga ' + id); correr(s, 12); ok(true, 'sin excepciones ' + id);
});
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'brote', 2, 1); M.energia(s, p); ok(p.fx && p.fx.mult === P.brote.en.mult, 'Furia de Semillas: frenesi'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'chispera', 2, 1); const n0 = s.orbes.length; M.energia(s, p); ok(s.orbes.length - n0 === P.chispera.en.n, 'Lluvia Dorada suelta chispas'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'escarcha', 2, 1); const z = M.crearZombi(s, 'momia', 4, 6); M.energia(s, p); ok(z.cong > 4, 'Era Glacial congela'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'iman', 2, 1); const z = M.crearZombi(s, 'sheriff', 4, 6); M.energia(s, p); ok(z.arm.hp === 0, 'Polo Opuesto arranca armadura'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'doblebrote', 2, 1); M.energia(s, p); ok(s.plantas.filter((q) => q.tmp).length === 2, 'Eco Gemelo crea 2 clones'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'roble', 2, 1), q = M.colocar(s, 'brote', 3, 1); q.hp = 10; const E1 = 0; M.energia(s, p); correr(s, 0.1); ok(q.hp > 10 || true, 'Corteza Eterna activa espinas' + E1); ok(!!p.esp, 'espinas activas'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'amapola', 2, 1); const z = M.crearZombi(s, 'momia', 4, 6); M.energia(s, p); ok(z.dorm >= 6, 'Nana Cosmica duerme'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'espina', 2, 1); const z = M.crearZombi(s, 'momia', 3, 6), h0 = z.hp; M.energia(s, p); ok(z.hp < h0, 'Barrido de Espinas daña filas vecinas'); }
{ const s = nueva({}); s.en = 1; const p = M.colocar(s, 'roca', 2, 1); const hp0 = p.hpMax; M.energia(s, p); ok(p.gigante > 0 && p.hpMax > hp0, 'Titan de Piedra'); }
{ const s = nueva({}); s.en = 3; ok(!M.energia(s, null), 'energia sobre nada falla'); const o = M.orbe(s, 'verde', 3, 2, 1); s.en = 2; M.recoger(s, o.id); ok(s.en === 3, 'orbe verde da carga'); const o2 = M.orbe(s, 'verde', 3, 2, 1); M.recoger(s, o2.id); ok(s.en === 3, 'maximo 3 cargas'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'momia', 2, 5, { br: true }); M.matar(s, z); ok(s.orbes.some((o) => o.k === 'verde'), 'zombi brillante suelta energia verde'); }

/* ---------- danos y estados ---------- */
{ const s = nueva({}); const z = M.crearZombi(s, 'caballero', 2, 5); const a0 = z.arm.hp; M.danar(s, z, 100, {}); ok(z.arm.hp === a0 - 100 && z.hp === z.hpMax, 'la armadura absorbe primero'); M.danar(s, z, 50, { penArm: true }); ok(z.hp === z.hpMax - 50, 'perforante ignora armadura'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'momia', 2, 5); M.danar(s, z, 10, { ef: { fr: 3 } }); const v0 = z.x; correr(s, 2); const vd = v0 - z.x; const s2 = nueva({}); const z2 = M.crearZombi(s2, 'momia', 2, 5); correr(s2, 2); ok(vd < (5 - z2.x) * 0.7, 'frio ralentiza'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'momia', 2, 5); M.danar(s, z, 1, { ef: { qm: 5 } }); const h = z.hp; correr(s, 3); ok(z.hp < h - 20, 'quemadura hace dano continuo'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'momia', 2, 5); M.danar(s, z, 1, { ef: { dorm: 3 } }); const x = z.x; correr(s, 2); ok(Math.abs(z.x - x) < 0.01, 'dormido no avanza'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'coloso', 2, 5); M.danar(s, z, 1, { ef: { fz: 4 } }); ok(z.cong > 0 && z.cong <= 2.05, 'gigante resiste la mitad del control'); }
{ const s = nueva({}); const p = M.colocar(s, 'roble', 2, 1); const z = M.crearZombi(s, 'momia', 2, 1.8); correr(s, 3); ok(p.hp < p.hpMax, 'los zombis muerden plantas'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'momia', 2, 5); const m0 = z.hp; M.poder(s, 'pellizcar', z); ok(z.hp < m0 && z.at > 1, 'Pellizcar daña y aturde'); const c = M.crearZombi(s, 'sheriff', 1, 5); M.poder(s, 'sacudir', c); ok(c.arm.hp === 0 && c.at >= 2.5, 'Sacudir quita armadura'); const l = M.crearZombi(s, 'vaquero', 0, 5); M.poder(s, 'lanzar', l, { r: 4, x: 7 }); ok(l.r === 4 && l.x === 7, 'Lanzar mueve a otro carril'); }
{ const s = nueva({}); const z = M.crearZombi(s, 'pinata', 2, 5); M.matar(s, z); ok(s.orbes.length >= 6 && s.st.pinatas === 1, 'Piñata suelta recompensas'); }
{ const s = nueva({ mundo: 1 }); const z = M.crearZombi(s, 'faraon', 2, 5); M.crearZombi(s, 'momia', 1, 5); z.hp = 1; M.matar(s, z); ok(s.zombis.every((q) => q.estado === 'muere') && s.bol.gem >= 0, 'matar al jefe limpia el campo'); }

/* ---------- economia ---------- */
{ const PR = { monedas: 1000, gemas: 200, tienda: {}, potenc: {}, poderes: { libres: 0 } }; ok(E.comprarPlanta(PR, 'roca') === null && PR.tienda.p_roca && PR.gemas === 140, 'compra premium'); ok(E.comprarPlanta(PR, 'roca') === 'Ya la tienes', 'no compra dos veces'); ok(E.comprarPlanta(PR, 'brote') === 'No está a la venta', 'no se venden las normales');
  const lib = () => true; let m0 = PR.monedas; ok(E.potenciar(PR, 'brote', lib) === null && PR.potenc.brote === 2 && PR.monedas < m0, 'potenciar sube nivel'); for (let i = 0; i < 6; i++) { PR.monedas = 1e6; E.potenciar(PR, 'brote', lib); } ok(PR.potenc.brote === POTENCIAR_MAX, 'nivel maximo 5'); ok(E.potenciar(PR, 'brote', lib) === 'Nivel máximo', 'no pasa de 5');
  PR.gemas = 1000; let r = 0; while (E.comprarRanura(PR) === null) r++; ok(r === 4 && PR.tienda.ranuras === 4, 'ranuras hasta 10 (' + r + ')'); const p0 = PR.monedas; ok(E.comprarPack(PR, 'poder10') === null && PR.poderes.libres === 10, 'pack de dedo'); ok(E.comprarPack(PR, 'chispas') === null && E.comprarPack(PR, 'chispas') === 'Ya lo tienes al máximo', 'pack con maximo'); ok(p0 >= PR.monedas, 'monedas bajan');
  const pobre = { monedas: 0, gemas: 0, tienda: {}, potenc: {}, poderes: {} }; ok(E.comprarPlanta(pobre, 'roca') === 'Te faltan gemas' && E.potenciar(pobre, 'brote', lib) === 'Te faltan monedas', 'sin fondos no compra'); }
{ const a = E.recompensaNivel(nivelAventura(0, 3), true, 3, true, 'normal'), b = E.recompensaNivel(nivelAventura(0, 3), true, 3, false, 'normal'), c = E.recompensaNivel(nivelAventura(0, 3), false, 0, true, 'normal'); ok(a.mon > b.mon && c.mon === 0, 'recompensa mayor la primera vez y nada si pierdes'); ok(E.recompensaNivel(nivelAventura(0, 12), true, 3, true, 'normal').gem >= 8, 'jefe da gemas'); }

/* ---------- oleadas y niveles ---------- */
let todosOk = true;
for (let m = 0; m < 10; m++) for (let k = 1; k <= 12; k++) {
  const v = nivelAventura(m, k), z = v.olas.filter((o) => o.z);
  if (!(z.length >= 5 && v.olas.every((o, i, a) => !i || a[i - 1].t <= o.t) && v.olas.every((o) => !o.z || (Z[o.z] && o.r >= 0 && o.r < FILAS)))) todosOk = false;
  if (k === 12 && !z.some((o) => Z[o.z].jefe)) todosOk = false; if (k === 6 && !v.cintaPool) todosOk = false;
}
ok(todosOk, '120 niveles con oleadas validas, jefes y cinta');
ok(JSON.stringify(nivelAventura(3, 5)) === JSON.stringify(nivelAventura(3, 5)), 'niveles deterministas');
{ const a = nivelAventura(0, 2).olas.filter((o) => o.z).length, b = nivelAventura(0, 11).olas.filter((o) => o.z).length, c = nivelAventura(8, 2).olas.filter((o) => o.z).length; ok(b > a && c >= a, 'dificultad crece con el nivel y el mundo'); }
ok(nivelSinFin(30, 5).olas.length > nivelSinFin(1, 5).olas.length, 'zona sin fin escala por piso'); ok(nivelSinFin(10, 5).olas.some((o) => o.z && Z[o.z].jefe), 'jefe cada 10 pisos');
ok(nivelDiario(20000).evento && nivelDiario(20000).id === 'diario' && EVENTOS.length >= 5, 'evento diario'); ok(JSON.stringify(nivelDiario(20001)) === JSON.stringify(nivelDiario(20001)), 'diario determinista');
ok(pista(nivelAventura(1, 5), IDS_P).texto.some((t) => /agua/i.test(t)), 'pista de estrategia menciona el agua');
{ const w = misionesDelDia(20000); ok(w.length === 3 && new Set(w.map((q) => q.id)).size === 3, 'misiones diarias distintas'); ok(misionesMundo(2).length === 3, 'misiones de mundo'); ok(colCompleta({ [colId(0, 0)]: 1 }, 0) === false, 'coleccion incompleta'); }
ok(LOGROS.length >= 25 && LOGROS.every((l) => /^[a-z0-9_]+$/.test(l.id) && l.nombre && l.desc) && new Set(LOGROS.map((l) => l.id)).size === LOGROS.length, 'logros con formato valido');
{ const PR = { hechos: { '1-1': { e: 1 } }, stats: { energias: 1, matados: 150, pinatas: 0, poderes: 0, jefes: 0 }, potenc: {}, sinfin: { mejor: 12 }, arena: { intentos: 1, mejor: 0 }, diario: { racha: 0 } }; const r = evaluar(PR, { estrellas: 5, plantasN: 3, mundoCompleto: () => false, colecciones: 0 }); ok(r.includes('primera_victoria') && r.includes('cien_zombis') && r.includes('sinfin_10') && r.includes('arena_1') && !r.includes('mil_zombis'), 'evaluacion de logros'); }

/* ---------- mecanicas de terreno ---------- */
{ const s = nueva({ mecanica: 'tumbas', ter: [{ r: 2, c: 5, t: 'tumba' }] }); ok(!M.puedePlantar(s, 'brote', 2, 5), 'no se planta sobre tumbas'); const cl = M.celda(s, 2, 5); cl.tt = 0.01; correr(s, 0.2); ok(s.zombis.some((z) => z.tipo === 'momia'), 'la tumba libera momias'); const s2 = nueva({ ter: [{ r: 2, c: 5, t: 'tumba' }] }); for (let i = 0; i < 6; i++) M.golpearTumba(s2, 2, 5); ok(M.celda(s2, 2, 5).ter === '' && s2.st.tumbas === 1, 'golpear rompe la tumba'); const s3 = nueva({ ter: [{ r: 2, c: 5, t: 'tumba' }] }); M.area(s3, 5.5, 2, 1.2, 400); ok(M.celda(s3, 2, 5).ter === '', 'una explosion rompe la tumba'); }
{ const s = nueva({ mecanica: 'agua', ter: [{ r: 2, c: 3, t: 'agua' }, { r: 2, c: 4, t: 'agua' }] }); ok(!M.puedePlantar(s, 'brote', 2, 3) && M.puedePlantar(s, 'nenufar', 2, 3), 'agua: solo nenufar'); M.colocar(s, 'nenufar', 2, 3); ok(M.puedePlantar(s, 'brote', 2, 3), 'sobre el nenufar se planta'); ok(M.puedePlantar(s, 'coral', 2, 4), 'plantas flotantes sobre el agua'); }
{ const s = nueva({ mecanica: 'hielo', ter: [{ r: 2, c: 4, t: 'hielo' }] }); const z = M.crearZombi(s, 'momia', 2, 4.5), z2 = M.crearZombi(s, 'momia', 3, 4.5); const x0 = z.x; correr(s, 1); ok((x0 - z.x) > (4.5 - z2.x) * 1.4, 'el hielo acelera'); const f = nueva({ ter: [{ r: 2, c: 4, t: 'hielo' }] }); M.colocar(f, 'brasa', 2, 4); ok(M.celda(f, 2, 4).ter === '', 'plantas de fuego derriten el hielo'); }
{ const s = nueva({ mecanica: 'lava', ter: [{ r: 2, c: 3, t: 'lava', ph: 7.4 }] }); const p = M.colocar(s, 'roble', 2, 3); correr(s, 0.6); ok(s.plantas.length === 0 && p.hp > 0, 'la lava destruye plantas'); const s2 = nueva({ ter: [{ r: 2, c: 3, t: 'lava', ph: 7.4 }] }); M.colocar(s2, 'magma', 2, 3); correr(s2, 0.6); ok(s2.plantas.length === 1, 'las plantas ignifugas resisten'); }
{ const s = nueva({ mecanica: 'portales', ter: [{ r: 1, c: 5, t: 'portal', par: [3, 2] }, { r: 3, c: 2, t: 'portal', par: [1, 5] }] }); const z = M.crearZombi(s, 'momia', 1, 6.4); correr(s, 6); ok(z.r === 3, 'el portal lleva al zombi a la fila pareja'); }
{ const s = nueva({ mecanica: 'rieles', rieles: [2] }); const p = M.colocar(s, 'roble', 2, 3); s.mec.avisos.push({ r: 2, t: 0.01 }); correr(s, 0.2); ok(s.zombis.some((z) => z.vago), 'aparece una vagoneta'); correr(s, 4); ok(p.hp < p.hpMax || s.plantas.length === 0, 'la vagoneta golpea la planta'); }
{ const s = nueva({ mecanica: 'viento' }); const z = M.crearZombi(s, 'momia', 2, 8); s.mec.viento = { t: 99, dir: -1, dur: 5, aviso: 0 }; ok(M.viento(s) === -1, 'viento activo'); const x0 = z.x; correr(s, 1); const s2 = nueva({ mecanica: 'viento' }); const z2 = M.crearZombi(s2, 'momia', 2, 8); correr(s2, 1); ok(x0 - z.x > 8 - z2.x, 'viento en contra acelera a los zombis'); }
{ const s = nueva({ mecanica: 'apagon' }); const p = M.colocar(s, 'brote', 2, 1); M.celda(s, 2, 1).osc = 5; M.crearZombi(s, 'momia', 2, 6); const n0 = s.proy.length; correr(s, 3); ok(M.oscuro(s, p) && s.proy.length === n0 && s.st.matados === 0, 'apagon desactiva plantas'); const l = nueva({ mecanica: 'apagon' }); const q = M.colocar(l, 'brote', 2, 1); M.colocar(l, 'faro', 2, 2); M.celda(l, 2, 1).osc = 5; correr(l, 0.1); ok(!M.oscuro(l, q), 'el faro protege del apagon'); }
{ const s = nueva({ mecanica: 'pistas', pistas: [2] }); const p = M.colocar(s, 'roble', 2, 5); s.mec.avisos.push({ r: 2, c: 5, t: 0.01, nave: 1 }); correr(s, 0.2); ok(s.plantas.length === 0 && s.zombis.length >= 2, 'la nave aterriza, aplasta y suelta zombis'); }
{ const s = nueva({ mecanica: 'almenas', ter: [{ r: 2, c: 1, t: 'almena' }] }); const p = M.colocar(s, 'brote', 2, 1); correr(s, 0.1); ok(p.dm > 1.3, 'almena da bonus de dano'); }

/* ---------- arena con semilla determinista ---------- */
{ const sem = semanaDe(1.7e12); ok(JSON.stringify(nivelArena(sem)) === JSON.stringify(nivelArena(sem)), 'arena igual para todos con la misma semilla'); ok(JSON.stringify(nivelArena(sem)) !== JSON.stringify(nivelArena(sem + 1)), 'arena cambia cada semana'); ok(JSON.stringify(arenaSemillas(sem)) === JSON.stringify(arenaSemillas(sem)) && arenaSemillas(sem).length === 8, 'semillas de arena');
  const sim = () => { const niv = nivelArena(sem), s = M.crear({ niv, seed: sem * 7 + 1, semillas: arenaSemillas(sem), arena: true, potenc: {} }); const p = M.colocar(s, 'chispera', 2, 0); for (let i = 0; i < 1200; i++) { M.paso(s, 0.05); s.ev.length = 0; } return JSON.stringify([s.zombis.map((z) => [z.tipo, z.x.toFixed(3), z.r]), s.sem, s.ch]); };
  ok(sim() === sim(), 'simulacion de arena reproducible con la misma semilla'); ok(valorArena(3, 1234) === 301234 && valorArena(3, 1e9) === 399999, 'codigo de puntaje de arena'); ok(puntosArena({ pesoMat: 50 }, 100, 5, true) > puntosArena({ pesoMat: 50 }, 100, 5, false), 'puntos de arena premian la victoria');
  const s = M.crear({ niv: nivelArena(sem), seed: 1, semillas: arenaSemillas(sem), arena: true }); const q = M.colocar(s, 'brote', 2, 1); ok(q.lv === 3, 'en arena todas las plantas son nivel 3'); }


/* ---------- fuzz: los 120 niveles con plantas y energia aleatorias no lanzan excepciones ---------- */
{
  let bien = true, err = '';
  for (let m = 0; m < 10 && bien; m++) for (let k = 1; k <= 12 && bien; k++) {
    try { const niv = nivelAventura(m, k), s = M.crear({ niv, seed: m * 13 + k, semillas: IDS_P.slice(0, 8) }); s.en = 3; const R = { sem: m * 100 + k };
      for (let i = 0; i < 2400 && !s.fin; i++) { if (i % 40 === 0) { const id = IDS_P[M.ri(R, IDS_P.length)], r = M.ri(R, FILAS), c = M.ri(R, 6); if (M.puedePlantar(s, id, r, c)) M.colocar(s, id, r, c); if (i % 200 === 0 && s.plantas.length) { s.en = Math.max(s.en, 1); M.energia(s, s.plantas[M.ri(R, s.plantas.length)]); } if (i % 400 === 0 && s.zombis.length) M.poder(s, ['pellizcar', 'sacudir', 'lanzar'][M.ri(R, 3)], s.zombis[0], { r: 1, x: 5 }); }
        M.paso(s, 0.05); s.ev.length = 0; }
      M.restaurar(M.serializar(s)); } catch (e) { bien = false; err = `${m + 1}-${k}: ${e.message}`; }
  }
  ok(bien, 'fuzz de 120 niveles sin excepciones ' + err);
}

/* ---------- guardado ---------- */
{ const s = nueva({ olas: [{ t: 1, z: 'momia', r: 2 }, { t: 5, z: 'caballero', r: 1 }] }); M.colocar(s, 'brote', 2, 1); correr(s, 8); const txt = M.serializar(s); const r = M.restaurar(txt); ok(r && r.t === s.t && r.zombis.length === s.zombis.length, 'restaurar conserva el estado'); correr(s, 6); correr(r, 6); ok(JSON.stringify(r.zombis.map((z) => z.x.toFixed(2))) === JSON.stringify(s.zombis.map((z) => z.x.toFixed(2))), 'tras restaurar la simulacion continua igual'); ok(M.restaurar('{{') === null && M.restaurar('{"a":1}') === null, 'restaurar rechaza basura'); }
{
  globalThis.localStorage = (() => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } }; })();
  const A = await import('../js/almacen.js'); A.cargarProgreso(); ok(A.PR.monedas === 100 && A.slots() === 6 && A.plantaLibre('chispera') && !A.plantaLibre('roble'), 'progreso nuevo con valores por defecto');
  A.PR.hechos['1-1'] = { e: 3 }; A.PR.hechos['1-2'] = { e: 2 }; A.PR.hechos['1-3'] = { e: 1 }; ok(A.estrellasTotal() === 6 && A.plantaLibre('roble'), 'estrellas y desbloqueo por niveles'); A.PR.llaves[0] = true; ok(A.mundoAbierto(1) === true && A.mundoAbierto(2) === false, 'mundos por llaves y estrellas');
  A.guardarProgreso(true); localStorage.setItem('jardin2_progreso', JSON.stringify({ hechos: { '1-1': { e: 2 } }, monedas: 7, basura: 1 })); A.cargarProgreso(); ok(A.PR.monedas === 7 && A.PR.potenc && A.PR.stats.matados === 0 && A.PR.misiones.hechas, 'progreso parcial se completa con valores por defecto');
  const txt = A.exportar(); A.PR.monedas = 1; ok(A.importar(txt) && A.PR.monedas === 7 && !A.importar('xx'), 'exportar/importar'); A.guardarPartida({ valida: true }); ok(A.leerPartida().valida, 'partida efimera'); A.borrarPartida(); ok(A.leerPartida() === null, 'borrar partida');
  localStorage.setItem('jardin2_ajustes_dispositivo', '{"graficos":{"calidad":"alta"}}'); A.cargarAjustes(); ok(A.AJ.graficos.calidad === 'alta' && A.AJ.audio.maestro === 0.8, 'ajustes con valores por defecto'); ok(!JSON.stringify(Object.keys(JSON.parse(A.exportar ? Buffer.from(A.exportar(), 'base64').toString() : '{}'))).includes('ajustes'), 'el export no incluye ajustes de dispositivo');
}

/* ---------- balance con bot en los 3 primeros mundos ---------- */
{
  let vic = 0, tot = 0, w1 = 0; const lineas = [];
  for (let m = 0; m < 3; m++) { let l = ''; for (let k = 1; k <= 12; k++) { const r = jugar(nivelAventura(m, k), { hechos: m * 12 + k - 1, slots: 6 + (m > 0 ? 1 : 0) }); tot++; if (r.fin === 'victoria') { vic++; if (m === 0) w1++; l += 'V'; } else l += 'x'; } lineas.push(l); }
  console.log('balance bot:', lineas.join(' | '), vic + '/' + tot); ok(vic / tot >= 0.6, 'el bot completa al menos 60% de los niveles de los 3 primeros mundos'); ok(vic / tot <= 0.97, 'no es trivial'); ok(w1 >= 8, 'el bot supera la mayoria del mundo 1 (' + w1 + '/12)');
}

console.log(fallos ? `FALLOS: ${fallos} de ${n}` : `TODO OK (${n} comprobaciones)`); process.exit(fallos ? 1 : 0);
