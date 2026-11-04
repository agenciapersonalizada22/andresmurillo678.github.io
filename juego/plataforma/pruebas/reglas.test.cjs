/* Pruebas de firestore.rules con el emulador. Requiere: Java, `npm i firebase-tools @firebase/rules-unit-testing firebase@10` y el emulador en marcha:
     firebase emulators:start --only firestore --project demo-juegos     (Firestore en 127.0.0.1:8181, o ajusta PUERTO)
     NODE_PATH=<carpeta con node_modules> node reglas.test.cjs */
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const firebase = require('firebase/compat/app'); require('firebase/compat/firestore');
const PUERTO = +process.env.PUERTO || 8181;
let ok = 0, mal = 0;
async function t(nombre, p, esperaFallo) {
  try { await (esperaFallo ? assertFails(p()) : assertSucceeds(p())); ok++; console.log('  ok  ' + nombre); }
  catch (e) { mal++; console.log('  MAL ' + nombre + ' :: ' + (e.message || e).toString().slice(0, 140)); }
}
const OK = (n, p) => t(n, p, false), NO = (n, p) => t(n, p, true);
(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-reglas', firestore: { host: '127.0.0.1', port: PUERTO, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  await env.clearFirestore();
  const TS = () => firebase.firestore.FieldValue.serverTimestamp();
  const ctx = (u) => env.authenticatedContext(u).firestore(), anon = env.unauthenticatedContext().firestore();
  const A = ctx('ana'), B = ctx('beto'), C = ctx('carla');
  async function registrar(db, uid, nombre) {
    const b = db.batch();
    b.set(db.doc('nombres/' + nombre), { uid });
    b.set(db.doc('usuarios/' + uid), { nombre, nombreLower: nombre, color: '#3df5ff', avatar: 'a3', xp: 0, nivel: 1, creado: TS(), ultimaConexion: TS() });
    return b.commit();
  }
  console.log('Perfiles y nombres');
  await OK('ana se registra (nombre + perfil en lote)', () => registrar(A, 'ana', 'ana_1'));
  await OK('beto se registra', () => registrar(B, 'beto', 'beto_2'));
  await OK('carla se registra', () => registrar(C, 'carla', 'carla_3'));
  await NO('nombre ya usado no se puede recrear', () => registrar(C, 'carla', 'ana_1'));
  await NO('perfil sin documento de nombre', () => ctx('dani').doc('usuarios/dani').set({ nombre: 'dani', nombreLower: 'dani', color: '#3df5ff', avatar: 'a1', xp: 0, nivel: 1, creado: TS(), ultimaConexion: TS() }));
  await NO('nombre con mayusculas/espacios', () => ctx('eva').doc('nombres/Eva X').set({ uid: 'eva' }));
  await NO('nombre a nombre de otro uid', () => ctx('eva').doc('nombres/eva_9').set({ uid: 'ana' }));
  await OK('perfil ajeno legible con sesion', () => B.doc('usuarios/ana').get());
  await NO('perfil no legible sin sesion', () => anon.doc('usuarios/ana').get());
  await NO('no se puede listar usuarios', () => B.collection('usuarios').get());
  await OK('nombre consultable sin sesion (disponibilidad)', () => anon.doc('nombres/libre_1').get());
  await NO('no se puede listar nombres', () => anon.collection('nombres').get());
  await NO('escribir perfil ajeno', () => B.doc('usuarios/ana').update({ color: '#ff0000' }));
  await OK('cambiar mi color', () => A.doc('usuarios/ana').update({ color: '#ff4fd8' }));
  await NO('color invalido', () => A.doc('usuarios/ana').update({ color: 'rojo' }));
  await NO('cambiar nombreLower', () => A.doc('usuarios/ana').update({ nombreLower: 'otro_x' }));
  await OK('subir xp +500', () => A.doc('usuarios/ana').update({ xp: 500, nivel: 3 }));
  await NO('subir xp +5000 de golpe', () => A.doc('usuarios/ana').update({ xp: 5500 }));
  await NO('bajar xp', () => A.doc('usuarios/ana').update({ xp: 10 }));
  await NO('nivel fuera de rango', () => A.doc('usuarios/ana').update({ nivel: 101 }));
  await NO('campo extra en perfil', () => A.doc('usuarios/ana').update({ admin: true }));
  await NO('borrar perfil ajeno', () => B.doc('usuarios/ana').delete());

  console.log('Puntajes');
  const P = (db, clave, uid, v, extra) => db.doc(`puntajes/${clave}/entradas/${uid}`).set(Object.assign({ nombre: 'ana_1', color: '#3df5ff', valor: v, fecha: TS() }, extra || {}));
  await OK('puntaje valido', () => P(A, 'nebula__puntos', 'ana', 1000));
  await NO('puntaje sobre el tope', () => P(A, 'nebula__oleada', 'ana', 10001));
  await NO('puntaje negativo', () => P(A, 'nebula__puntos', 'ana', -5));
  await NO('modo inexistente', () => P(A, 'nebula__trampa', 'ana', 5));
  await NO('puntaje de otro uid', () => P(B, 'nebula__puntos', 'ana', 99999));
  await NO('menor no reemplaza', () => P(A, 'nebula__puntos', 'ana', 500));
  await OK('mayor reemplaza', () => P(A, 'nebula__puntos', 'ana', 2000));
  await NO('valor no numerico', () => P(A, 'nebula__puntos', 'ana', '9999'));
  await NO('fecha falsa', () => P(A, 'ciudad__dinero', 'ana', 5, { fecha: new Date('2020-01-01') }));
  await NO('campo extra', () => P(A, 'ciudad__dinero', 'ana', 5, { vip: true }));
  await OK('leer ranking con sesion', () => B.collection('puntajes/nebula__puntos/entradas').orderBy('valor', 'desc').limit(10).get());
  await NO('leer ranking sin sesion', () => anon.collection('puntajes/nebula__puntos/entradas').get());

  console.log('Amigos');
  const solicitar = (db, yo, otro) => { const b = db.batch(); b.set(db.doc(`amigos/${yo}/lista/${otro}`), { estado: 'enviada', desde: yo }); b.set(db.doc(`amigos/${otro}/lista/${yo}`), { estado: 'recibida', desde: yo }); return b.commit(); };
  await NO('solicitud a medias (solo mi lado)', () => A.doc('amigos/ana/lista/beto').set({ estado: 'enviada', desde: 'ana' }));
  await NO('forzar "amigos" al crear', () => { const b = A.batch(); b.set(A.doc('amigos/ana/lista/beto'), { estado: 'amigos', desde: 'ana' }); b.set(A.doc('amigos/beto/lista/ana'), { estado: 'amigos', desde: 'ana' }); return b.commit(); });
  await NO('solicitarse a si mismo', () => solicitar(A, 'ana', 'ana'));
  await OK('ana envia solicitud a beto', () => solicitar(A, 'ana', 'beto'));
  await NO('ana no puede aceptar su propia solicitud', () => { const b = A.batch(); b.update(A.doc('amigos/ana/lista/beto'), { estado: 'amigos' }); b.update(A.doc('amigos/beto/lista/ana'), { estado: 'amigos' }); return b.commit(); });
  await NO('carla no puede leer la lista de beto', () => C.collection('amigos/beto/lista').get());
  await OK('beto lee su lista', () => B.collection('amigos/beto/lista').get());
  await NO('beto acepta solo su lado', () => B.doc('amigos/beto/lista/ana').update({ estado: 'amigos' }));
  await NO('carla se mete a aceptar', () => { const b = C.batch(); b.update(C.doc('amigos/beto/lista/ana'), { estado: 'amigos' }); b.update(C.doc('amigos/ana/lista/beto'), { estado: 'amigos' }); return b.commit(); });
  await OK('beto acepta (ambos lados en lote)', () => { const b = B.batch(); b.update(B.doc('amigos/beto/lista/ana'), { estado: 'amigos' }); b.update(B.doc('amigos/ana/lista/beto'), { estado: 'amigos' }); return b.commit(); });
  await OK('ana ve a beto como amigo', async () => { const s = await A.doc('amigos/ana/lista/beto').get(); if (s.data().estado !== 'amigos') throw new Error('no'); });
  await OK('ana pide a carla y carla rechaza (borra ambos)', async () => { await solicitar(A, 'ana', 'carla'); const b = C.batch(); b.delete(C.doc('amigos/carla/lista/ana')); b.delete(C.doc('amigos/ana/lista/carla')); await b.commit(); });
  await NO('borrar solo el lado del otro', async () => { await solicitar(A, 'ana', 'carla'); await C.doc('amigos/ana/lista/carla').delete(); });
  await OK('carla acepta tras el intento', () => { const b = C.batch(); b.update(C.doc('amigos/carla/lista/ana'), { estado: 'amigos' }); b.update(C.doc('amigos/ana/lista/carla'), { estado: 'amigos' }); return b.commit(); });

  console.log('Presencia');
  const pres = (db, uid, extra) => db.doc('presencia/' + uid).set(Object.assign({ estado: 'en_linea', juego: '', t: TS() }, extra || {}));
  await OK('mi presencia', () => pres(A, 'ana'));
  await NO('presencia ajena', () => pres(B, 'ana'));
  await NO('estado invalido', () => pres(A, 'ana', { estado: 'dios' }));
  await NO('t falso', () => pres(A, 'ana', { t: 1 }));
  await OK('amigo lee mi presencia', () => B.doc('presencia/ana').get());
  const D = ctx('dani'); await registrar(D, 'dani', 'dani_4');
  await NO('no amigo no lee presencia', () => D.doc('presencia/ana').get());
  await NO('listar presencia', () => A.collection('presencia').get());

  console.log('Invitaciones');
  const inv = (db, dest, extra) => db.collection(`invitaciones/${dest}/lista`).doc('i1').set(Object.assign({ de: 'ana', nombre: 'ana_1', color: '#3df5ff', avatar: 'a3', juego: 'nebula', oferta: 'CODIGO', estado: 'pendiente', respuesta: '', creado: TS(), expira: Date.now() + 300000 }, extra || {}));
  await NO('invitar a quien no es amigo', () => inv(A, 'dani'));
  await NO('invitar suplantando "de"', () => inv(A, 'beto', { de: 'carla' }));
  await NO('oferta enorme', () => inv(A, 'beto', { oferta: 'x'.repeat(4001) }));
  await NO('juego desconocido', () => inv(A, 'beto', { juego: 'hack' }));
  await NO('invitacion ya respondida', () => inv(A, 'beto', { estado: 'aceptada' }));
  await OK('invitar a un amigo', () => inv(A, 'beto'));
  await OK('destinatario lista sus invitaciones', () => B.collection('invitaciones/beto/lista').get());
  await NO('tercero no lista', () => C.collection('invitaciones/beto/lista').get());
  await NO('tercero no lee', () => C.doc('invitaciones/beto/lista/i1').get());
  await OK('remitente lee su invitacion', () => A.doc('invitaciones/beto/lista/i1').get());
  await NO('remitente no puede aceptar por el otro', () => A.doc('invitaciones/beto/lista/i1').update({ estado: 'aceptada', respuesta: 'R' }));
  await NO('destinatario no cambia la oferta', () => B.doc('invitaciones/beto/lista/i1').update({ estado: 'aceptada', oferta: 'otra' }));
  await OK('destinatario acepta con respuesta', () => B.doc('invitaciones/beto/lista/i1').update({ estado: 'aceptada', respuesta: 'RESPUESTA' }));
  await NO('segunda respuesta (un solo uso)', () => B.doc('invitaciones/beto/lista/i1').update({ estado: 'rechazada', respuesta: '' }));
  await NO('tercero no borra', () => C.doc('invitaciones/beto/lista/i1').delete());
  await OK('remitente borra', () => A.doc('invitaciones/beto/lista/i1').delete());
  await OK('cancelar por el remitente', async () => { await inv(A, 'beto'); await A.doc('invitaciones/beto/lista/i1').update({ estado: 'cancelada' }); });

  console.log('Guardados y logros');
  const G = (db, uid, id, extra) => db.doc(`guardados/${uid}/juegos/${id}`).set(Object.assign({ version: 1, hash: 'abc', partes: 1, datos: 'g1:xxxx', actualizado: TS(), ranura: 'principal' }, extra || {}));
  await OK('guardado propio', () => G(A, 'ana', 'nebula'));
  await OK('ranura propia', () => G(A, 'ana', 'nebula~respaldo', { ranura: 'respaldo' }));
  await OK('trozo 1', () => A.doc('guardados/ana/juegos/nebula_p1').set({ datos: 'resto', actualizado: TS() }));
  await NO('guardado ajeno', () => G(B, 'ana', 'nebula'));
  await NO('leer guardado ajeno', () => B.doc('guardados/ana/juegos/nebula').get());
  await NO('id raro', () => G(A, 'ana', 'hack'));
  await NO('trozo fuera de rango', () => A.doc('guardados/ana/juegos/nebula_p9').set({ datos: 'x', actualizado: TS() }));
  await NO('documento demasiado grande', () => G(A, 'ana', 'ciudad', { datos: 'x'.repeat(800001) }));
  await NO('partes invalidas', () => G(A, 'ana', 'ciudad', { partes: 20 }));
  await OK('guardado de 790 KB', () => G(A, 'ana', 'bloques', { datos: 'x'.repeat(790000) }));
  await OK('logros propios', () => A.doc('logros/ana').set({ nebula: ['primera_partida'], xpJuego: { nebula: 40 }, ultimo: { juego: 'nebula', t: 1 } }));
  await NO('logros ajenos', () => B.doc('logros/ana').set({ nebula: ['x'] }));
  await NO('logros con juego inventado', () => A.doc('logros/ana').set({ trampa: ['x'] }));
  await NO('demasiados logros', () => A.doc('logros/ana').set({ nebula: Array.from({ length: 101 }, (_, i) => 'l' + i) }));
  await OK('amigo lee mis logros', () => B.doc('logros/ana').get());
  await NO('no amigo no lee logros', () => D.doc('logros/ana').get());

  console.log('Borrado');
  await NO('no se borra lo ajeno', () => B.doc('puntajes/nebula__puntos/entradas/ana').delete());
  await OK('borro lo mio', () => A.doc('puntajes/nebula__puntos/entradas/ana').delete());
  await NO('coleccion desconocida', () => A.doc('admin/x').set({ a: 1 }));
  await env.cleanup(); await env.cleanup;
  console.log(`\n${ok} correctas, ${mal} fallidas`); process.exit(mal ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
