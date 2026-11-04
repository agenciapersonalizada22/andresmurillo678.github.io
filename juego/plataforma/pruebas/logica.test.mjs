// node logica.test.mjs  (sin dependencias). Prueba la logica pura de comun/cuenta.js, el AdaptadorLocal y que firestore.rules coincida con juegos.js
import { createRequire } from 'module'; import fs from 'fs'; import assert from 'assert'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), dir = path.dirname(fileURLToPath(import.meta.url));
const { _logica: L } = require('../../comun/cuenta.js');
const Local = require('../../comun/cuenta-local.js'), Juegos = require('../juegos.js');
let ok = 0; const t = async (n, f) => { try { await f(); ok++; console.log('  ok  ' + n); } catch (e) { console.log('  MAL ' + n + ' :: ' + e.message); process.exitCode = 1; } };
class Mem { constructor() { this.d = {}; } getItem(k) { return k in this.d ? this.d[k] : null; } setItem(k, v) { this.d[k] = String(v); } removeItem(k) { delete this.d[k]; } }

await t('normalizar nombres', () => { assert.equal(L.normalizarNombre('  ÁndrÉs_9 '), 'andres_9'); });
await t('validar nombres', () => {
  assert.equal(L.validarNombre('ana_01'), ''); assert.equal(L.validarNombre('Ñandú'), '');
  for (const mal of ['', 'ab', 'a'.repeat(17), 'hola mundo', 'a-b-c', 'ana!', 'mi@mail']) assert.ok(L.validarNombre(mal), mal);
  for (const g of ['mierda', 'FUCK_you', 'sh1t', 'xX_puta_Xx', 'hitler99', 'p_u_t_o']) assert.ok(L.validarNombre(g), g);
  for (const bien of ['computadora', 'classic', 'ass1stant_x', 'escupir', 'putamadre'.slice(0, 0) + 'rapero', 'cumbre']) assert.equal(L.validarNombre(bien), '', bien);
});
await t('mapeo a email y regreso', () => { assert.equal(L.emailDe('Ana_1'), 'ana_1@users.invalid'); assert.equal(L.nombreDeEmail('ana_1@users.invalid'), 'ana_1'); });
await t('contrasenas', () => { assert.ok(L.validarContrasena('1234567')); assert.equal(L.validarContrasena('abcd1234'), ''); assert.ok(L.validarContrasena('aaaaaaaa')); assert.ok(L.validarContrasena('Ana_1234', 'ana_1234')); });
await t('nombre visible', () => { assert.equal(L.validarNombreVisible('Ana Maria'), ''); assert.ok(L.validarNombreVisible('<b>')); assert.ok(L.validarNombreVisible('ab')); });
await t('niveles y XP', () => {
  assert.equal(L.nivelDeXp(0).nivel, 1); assert.equal(L.nivelDeXp(99).nivel, 1); assert.equal(L.nivelDeXp(100).nivel, 2); assert.equal(L.nivelDeXp(299).nivel, 2); assert.equal(L.nivelDeXp(300).nivel, 3);
  assert.equal(L.nivelDeXp(600).nivel, 4); assert.equal(L.nivelDeXp(1e12).nivel, 100); assert.equal(L.nivelDeXp(-5).nivel, 1);
  const n = L.nivelDeXp(150); assert.equal(n.enNivel, 50); assert.equal(n.paraSiguiente, 200); assert.equal(n.fraccion, 0.25);
  for (let x = 0; x < 100000; x += 37) { const v = L.nivelDeXp(x); assert.ok(x >= L.xpParaNivel(v.nivel) && (v.nivel === 100 || x < L.xpParaNivel(v.nivel + 1))); }
});
await t('compresion y fragmentado', async () => {
  const obj = { a: 'x'.repeat(50000), b: [1, 2, 3], c: 'ñandú ✓ 🚀' }, txt = JSON.stringify(obj);
  const c = await L.comprimir(txt); assert.ok(c.startsWith('g1:') && c.length < txt.length / 5); assert.equal(await L.descomprimir(c), txt);
  let r = ''; for (let i = 0; i < 1.2e6; i++) r += String.fromCharCode(33 + ((i * 7919 + (i >> 3) * 31) % 90)); // poco comprimible
  const big = await L.comprimir(r); const tr = L.fragmentar(big, 700000); assert.ok(tr.length >= 1 && tr.every(x => x.length <= 700000)); assert.equal(await L.descomprimir(L.unir(tr)), r);
  const tr2 = L.fragmentar('a'.repeat(1500000), 700000); assert.equal(tr2.length, 3); assert.equal(L.unir(tr2).length, 1500000); assert.deepEqual(L.fragmentar(''), ['']);
});
await t('hash estable e independiente del orden', () => { assert.equal(L.hashClaves({ a: '1', b: '2' }), L.hashClaves({ b: '2', a: '1' })); assert.notEqual(L.hashClaves({ a: '1' }), L.hashClaves({ a: '2' })); });
await t('resolucion de conflictos de guardado', () => {
  const r = L.resolverSync, base = { hayLocal: true, hayNube: true, hashLocal: 'L', hashNube: 'N', hashMeta: 'M' };
  assert.equal(r({ ...base, hashLocal: 'M', hashNube: 'M' }), 'igual'); assert.equal(r({ ...base, hashLocal: 'X', hashNube: 'X', hashMeta: 'M' }), 'igual');
  assert.equal(r({ ...base, hashNube: 'M' }), 'subir'); assert.equal(r({ ...base, hashLocal: 'M' }), 'bajar'); assert.equal(r(base), 'conflicto');
  assert.equal(r({ ...base, hashMeta: '' }), 'conflicto'); assert.equal(r({ ...base, hayNube: false }), 'subir'); assert.equal(r({ ...base, hayLocal: false }), 'bajar'); assert.equal(r({ ...base, hayLocal: false, hayNube: false }), 'igual');
});
await t('caducidad de invitaciones', () => {
  const inv = { estado: 'pendiente', creado: 1000 };
  assert.ok(L.invitacionVigente(inv, 1000 + 299999)); assert.ok(!L.invitacionVigente(inv, 1000 + 300000)); assert.ok(!L.invitacionVigente({ ...inv, estado: 'aceptada' }, 1001));
  assert.ok(L.invitacionVigente({ estado: 'pendiente', expira: 5000 }, 4999)); assert.ok(!L.invitacionVigente({ estado: 'pendiente', expira: 5000 }, 5000));
});
await t('ranking', () => {
  const e = [{ uid: 'a', valor: 10, fecha: 3 }, { uid: 'b', valor: 30, fecha: 2 }, { uid: 'c', valor: 30, fecha: 1 }, { uid: 'd', valor: 5, fecha: 0 }];
  assert.deepEqual(L.ordenarRanking(e, true).map(x => x.uid + x.pos), ['c1', 'b2', 'a3', 'd4']);
  assert.deepEqual(L.ordenarRanking(e, false, 2).map(x => x.uid), ['d', 'a']);
  assert.ok(L.mejor(5, null, true) && L.mejor(5, 4, true) && !L.mejor(4, 4, true) && L.mejor(3, 4, false));
});
await t('presencia vigente', () => { assert.ok(L.presenciaVigente({ t: 1000 }, 1000 + 149999)); assert.ok(!L.presenciaVigente({ t: 1000 }, 1000 + 150000)); assert.ok(!L.presenciaVigente(null)); });
await t('cola offline', async () => {
  const m = new Mem(), c = new L.Cola(m, 'q'); c.agregar({ tipo: 'a', reemplaza: 'k' }); c.agregar({ tipo: 'b', reemplaza: 'k' }); c.agregar({ tipo: 'c' });
  assert.equal(c.tamano(), 2); const hechas = [];
  await c.vaciar(async op => { if (op.tipo === 'c' && hechas.length === 1 && !hechas.sin) { hechas.sin = true; throw L.error('sin_red'); } hechas.push(op.tipo); });
  assert.deepEqual(hechas.slice(), ['b']); assert.equal(c.tamano(), 1);
  await c.vaciar(async op => { hechas.push(op.tipo); }); assert.equal(c.tamano(), 0); assert.deepEqual(hechas.slice(), ['b', 'c']);
  const c2 = new L.Cola(m, 'q2'); c2.agregar({ tipo: 'x' }); await c2.vaciar(async () => { throw new Error('permiso'); }); assert.equal(c2.tamano(), 0, 'errores no recuperables se descartan');
});

console.log('AdaptadorLocal (almacen compartido, dos "dispositivos")');
const alm = new Mem(), mk = () => Local.crear({ almacen: alm, sesion: new Mem() });
const ana = mk(), beto = mk(), uids = {}, esp = async ms => { await new Promise(r => setTimeout(r, ms)); ana._notificar(); beto._notificar(); await new Promise(r => setTimeout(r, 5)); };
await t('registro, duplicado y login', async () => {
  uids.ana = await ana.registrar('ana_1', 'secreta123', true, { color: '#3df5ff', avatar: 'a1' });
  await assert.rejects(() => beto.registrar('ana_1', 'otraclave1', true, { color: '#fff', avatar: 'a2' }), e => e.codigo === 'nombre_usado');
  uids.beto = await beto.registrar('beto_2', 'secreta456', false, { color: '#ff4fd8', avatar: 'a2' });
  await ana.salir(); assert.equal(ana.uid, null);
  await assert.rejects(() => ana.entrar('ana_1', 'mala', true), e => e.codigo === 'credenciales');
  assert.equal(await ana.entrar('ana_1', 'secreta123', true), uids.ana);
});
await t('limite de intentos', async () => {
  const x = mk(); for (let i = 0; i < 5; i++) await assert.rejects(() => x.entrar('ana_1', 'mal' + i, true), e => e.codigo === 'credenciales');
  await assert.rejects(() => x.entrar('ana_1', 'secreta123', true), e => e.codigo === 'muchos_intentos');
});
await t('cambiar contrasena', async () => {
  await assert.rejects(() => ana.cambiarContrasena('mal', 'nueva12345'), e => e.codigo === 'credenciales'); await ana.cambiarContrasena('secreta123', 'nueva12345');
  await ana.salir(); await assert.rejects(() => mk().entrar('ana_1', 'secreta123', true)); await ana.entrar('ana_1', 'nueva12345', true);
});
await t('amistad con doble confirmacion', async () => {
  await ana.amigoEnviar(uids.beto);
  let a = null, b = null; const u1 = ana.escucharAmigos(x => a = x), u2 = beto.escucharAmigos(x => b = x); await esp(20);
  assert.equal(a[0].estado, 'enviada'); assert.equal(b[0].estado, 'recibida');
  await assert.rejects(() => ana.amigoAceptar(uids.beto)); await beto.amigoAceptar(uids.ana); await esp(20);
  assert.equal(a[0].estado, 'amigos'); assert.equal(b[0].estado, 'amigos'); u1(); u2();
});
await t('invitacion directa: crear, responder una vez, caducar', async () => {
  await assert.rejects(() => ana.invitacionCrear('u_noamigo', { de: uids.ana }), e => e.codigo === 'no_amigo');
  const id = await ana.invitacionCrear(uids.beto, { de: uids.ana, nombre: 'ana_1', juego: 'nebula', oferta: 'COD' });
  let est = null, recibidas = []; const u = ana.escucharInvitacion(uids.beto, id, x => est = x), u2 = beto.escucharInvitaciones(x => recibidas = x); await esp(20);
  assert.equal(est.estado, 'pendiente'); assert.equal(recibidas.length, 1);
  await beto.invitacionResponder(id, 'aceptada', 'RESP'); await esp(20); assert.deepEqual([est.estado, est.respuesta], ['aceptada', 'RESP']);
  await assert.rejects(() => beto.invitacionResponder(id, 'rechazada', ''), 'un solo uso'); u(); u2();
  const db = JSON.parse(alm.getItem('cuenta_local_v1')); const i2 = await ana.invitacionCrear(uids.beto, { de: uids.ana, juego: 'nebula', oferta: 'X' });
  const db2 = JSON.parse(alm.getItem('cuenta_local_v1')); db2.invitaciones[uids.beto][i2].creado = Date.now() - 301000; db2.invitaciones[uids.beto][i2].expira = Date.now() - 1000; alm.setItem('cuenta_local_v1', JSON.stringify(db2));
  await assert.rejects(() => beto.invitacionResponder(i2, 'aceptada', 'R'), 'caducada');
});
await t('puntajes: solo mejora, ranking y posicion', async () => {
  const p = { nombre: 'ana_1', color: '#fff' };
  assert.equal((await ana.puntajeSet('nebula__puntos', 100, true, p)).mejoro, true); assert.equal((await ana.puntajeSet('nebula__puntos', 50, true, p)).mejoro, false);
  await beto.puntajeSet('nebula__puntos', 300, true, { nombre: 'beto_2', color: '#000' });
  const top = await ana.puntajeTop('nebula__puntos', 10, true); assert.deepEqual(top.map(x => x.uid), [uids.beto, uids.ana]);
  assert.equal(await ana.puntajeContarMejores('nebula__puntos', 100, true), 1); assert.equal(await ana.puntajeTotal('nebula__puntos'), 2);
});
await t('guardados con trozos y exportar', async () => {
  const tr = L.fragmentar(await L.comprimir(JSON.stringify({ k: 'v' })), 10); await ana.guardadoSet('nebula', 'principal', { version: 1, hash: 'h', trozos: tr });
  const g = await ana.guardadoGet('nebula', 'principal'); assert.equal(JSON.parse(await L.descomprimir(L.unir(g.trozos))).k, 'v');
  assert.equal((await ana.ranuras('nebula')).length, 1); const ex = await ana.exportar([]); assert.equal(ex.guardados.nebula.datos.k, 'v');
});
await t('borrar cuenta limpia todo', async () => {
  await assert.rejects(() => beto.borrarCuenta('mal'), e => e.codigo === 'credenciales'); await beto.borrarCuenta('secreta456');
  const db = JSON.parse(alm.getItem('cuenta_local_v1')); assert.ok(!db.nombres.beto_2 && !db.usuarios[uids.beto] && !(db.amigos[uids.ana] || {})[uids.beto] && !(db.puntajes['nebula__puntos'] || {})[uids.beto]);
  assert.equal(await ana.nombreLibre('beto_2'), true);
});

console.log('Tablas');
await t('firestore.rules coincide con juegos.js', () => {
  const r = fs.readFileSync(path.join(dir, '..', 'firestore.rules'), 'utf8'), mapa = {};
  const bloque = /function topes\(\) \{\s*return \{([\s\S]*?)\};/.exec(r)[1]; for (const m of bloque.matchAll(/'([a-z]+__[a-z0-9_]+)':\s*(\d+)/g)) mapa[m[1]] = +m[2];
  const esperado = {}; for (const j of Juegos.lista) for (const m of j.modos) { assert.ok(m.mayorEsMejor, 'las reglas asumen mayorEsMejor salvo menorEsMejor()'); esperado[Juegos.clave(j.id, m.id)] = m.tope; }
  assert.deepEqual(mapa, esperado);
  const ids = Juegos.lista.map(j => j.id).sort(); const re = /\(([a-z|]+)\)\(~/.exec(r)[1].split('|').sort(); assert.deepEqual(re, ids);
  assert.ok(r.includes("in ['" + Juegos.lista.map(j => j.id).join("', '") + "']"));
  for (const j of Juegos.lista) assert.ok(r.includes("'" + j.id + "'"), j.id);
});
console.log(`\n${ok} pruebas correctas`);
setTimeout(() => process.exit(process.exitCode || 0), 50);
