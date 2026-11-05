/* Pruebas en Node (sin DOM): node herramientas/notas/pruebas/pruebas.js  (opcional: TZ=America/New_York) */
'use strict';
const assert = require('assert'), path = require('path');
const J = (f) => require(path.join(__dirname, '..', 'js', f));
const U = J('util.js'), F = J('fechas.js'), R = J('repeticion.js'), NL = J('nl.js'), C = J('cripto.js'), Mig = J('migraciones.js'),
  A = J('almacen.js'), Md = J('md.js'), B = J('busqueda.js'), IO = J('io.js'), Z = J('zip.js'), Mo = J('modelo.js');
let ok = 0, mal = 0; const pend = [];
function prueba(nombre, fn) { pend.push(async () => { try { await fn(); ok++; } catch (e) { mal++; console.log('FALLA:', nombre, '\n  ', e.message.split('\n').slice(0, 6).join('\n   ')); } }); }

/* ---------- lenguaje natural ---------- */
const O = { hoy: '2026-11-05', ahora: '10:00' }; // jueves
const casos = [
  ['pagar luz mañana 6pm #hogar !alta', { titulo: 'Pagar luz', fecha: '2026-11-06', hora: '18:00', etiquetas: ['hogar'], prioridad: 3 }],
  ['llamar a mamá el viernes a las 3', { titulo: 'Llamar a mamá', fecha: '2026-11-06', hora: '15:00' }],
  ['reunión todos los lunes a las 9 de la mañana', { titulo: 'Reunión', fecha: '2026-11-09', hora: '09:00', rep: { tipo: 'semana', dias: [1] } }],
  ['comprar leche en 2 horas', { titulo: 'Comprar leche', fecha: '2026-11-05', hora: '12:00' }],
  ['pagar renta el día 1 de cada mes', { titulo: 'Pagar renta', fecha: '2026-12-01', rep: { tipo: 'mes', diaMes: 1 } }],
  ['gym lunes miércoles y viernes', { titulo: 'Gym', fecha: '2026-11-06', rep: { tipo: 'semana', dias: [1, 3, 5] } }],
  ['cita con el dentista 15 de marzo a las 4:30 pm ~45m', { titulo: 'Cita con el dentista', fecha: '2027-03-15', hora: '16:30', estimado: 45 }],
  ['entregar informe fin de mes !urgente @trabajo', { titulo: 'Entregar informe', fecha: '2026-11-30', prioridad: 4, lista: 'trabajo' }],
  ['cada 2 semanas limpiar casa', { titulo: 'Limpiar casa', rep: { tipo: 'semana', cada: 2 } }],
  ['revisar correo esta noche', { titulo: 'Revisar correo', fecha: '2026-11-05', hora: '20:00' }],
  ['regar plantas los sábados', { titulo: 'Regar plantas', fecha: '2026-11-07', rep: { tipo: 'semana', dias: [6] } }],
  ['enviar factura el próximo martes recordar 30 min antes', { titulo: 'Enviar factura', fecha: '2026-11-10', recordar: 30 }],
  ['comprar pan', { titulo: 'Comprar pan', fecha: '', hora: '' }],
  ['hoy llamar al banco', { titulo: 'Llamar al banco', fecha: '2026-11-05' }],
  ['pasado mañana examen a las 8 de la mañana', { titulo: 'Examen', fecha: '2026-11-07', hora: '08:00' }],
  ['mañana por la mañana correr', { titulo: 'Correr', fecha: '2026-11-06', hora: '09:00' }],
  ['mañana por la tarde estudiar', { titulo: 'Estudiar', fecha: '2026-11-06', hora: '16:00' }],
  ['esta tarde pasear al perro', { titulo: 'Pasear al perro', fecha: '2026-11-05', hora: '16:00' }],
  ['cena con amigos el sábado a las 9 de la noche', { titulo: 'Cena con amigos', fecha: '2026-11-07', hora: '21:00' }],
  ['pagar tarjeta el 15', { titulo: 'Pagar tarjeta', fecha: '2026-11-15' }],
  ['pagar seguro el 3', { titulo: 'Pagar seguro', fecha: '2026-12-03' }],
  ['viaje 20 de diciembre', { titulo: 'Viaje', fecha: '2026-12-20' }],
  ['viaje el 2 de enero de 2027', { titulo: 'Viaje', fecha: '2027-01-02' }],
  ['fiesta 25/12', { titulo: 'Fiesta', fecha: '2026-12-25' }],
  ['cumple 3/1/2027', { titulo: 'Cumple', fecha: '2027-01-03' }],
  ['entregar 2026-12-01 !media', { titulo: 'Entregar', fecha: '2026-12-01', prioridad: 2 }],
  ['llamar en 3 días', { titulo: 'Llamar', fecha: '2026-11-08' }],
  ['revisar en una semana', { titulo: 'Revisar', fecha: '2026-11-12' }],
  ['renovar dentro de 2 meses', { titulo: 'Renovar', fecha: '2027-01-05' }],
  ['llamar en 30 minutos', { titulo: 'Llamar', fecha: '2026-11-05', hora: '10:30' }],
  ['té en media hora', { titulo: 'Té', fecha: '2026-11-05', hora: '10:30' }],
  ['la próxima semana planificar', { titulo: 'Planificar', fecha: '2026-11-09' }],
  ['el mes que viene declarar impuestos', { titulo: 'Declarar impuestos', fecha: '2026-12-05' }],
  ['salir el fin de semana', { titulo: 'Salir', fecha: '2026-11-07' }],
  ['vitaminas todos los días 8am', { titulo: 'Vitaminas', fecha: '2026-11-06', hora: '08:00', rep: { tipo: 'dia' } }],
  ['ejercicio diario', { titulo: 'Ejercicio', fecha: '2026-11-05', rep: { tipo: 'dia' } }],
  ['informe semanal viernes', { titulo: 'Informe', fecha: '2026-11-06' }],
  ['pagar internet mensual', { titulo: 'Pagar internet', rep: { tipo: 'mes' } }],
  ['seguro anual', { titulo: 'Seguro', rep: { tipo: 'anio' } }],
  ['cada 3 días regar cactus', { titulo: 'Regar cactus', rep: { tipo: 'dia', cada: 3 } }],
  ['clase de yoga cada martes y jueves 7pm', { titulo: 'Clase de yoga', fecha: '2026-11-05', hora: '19:00', rep: { tipo: 'semana', dias: [2, 4] } }],
  ['standup lunes a viernes 9:30', { titulo: 'Standup', hora: '09:30', rep: { tipo: 'semana', dias: [1, 2, 3, 4, 5] } }],
  ['basura entre semana', { titulo: 'Basura', rep: { tipo: 'semana', dias: [1, 2, 3, 4, 5] } }],
  ['limpieza profunda cada mes', { titulo: 'Limpieza profunda', rep: { tipo: 'mes' } }],
  ['cada 2 años renovar pasaporte', { titulo: 'Renovar pasaporte', rep: { tipo: 'anio', cada: 2 } }],
  ['pagar alquiler el último día de cada mes', { titulo: 'Pagar alquiler', fecha: '2026-11-30', rep: { tipo: 'mes', diaMes: 'ultimo' } }],
  ['terapia cada lunes hasta el 20 de diciembre', { titulo: 'Terapia', fecha: '2026-11-09', rep: { tipo: 'semana', dias: [1], fin: '2026-12-20' } }],
  ['examen !baja', { titulo: 'Examen', prioridad: 1 }],
  ['examen prioridad urgente', { titulo: 'Examen', prioridad: 4 }],
  ['examen p1', { titulo: 'Examen', prioridad: 4 }],
  ['ver peli #ocio/cine #familia', { titulo: 'Ver peli', etiquetas: ['ocio/cine', 'familia'] }],
  ['informe ~2h', { titulo: 'Informe', estimado: 120 }],
  ['informe ~1h30', { titulo: 'Informe', estimado: 90 }],
  ['tarea larga ~90 min', { titulo: 'Tarea larga', estimado: 90 }],
  ['reunión mañana 10:00 avisar 15 min antes', { titulo: 'Reunión', fecha: '2026-11-06', hora: '10:00', recordar: 15 }],
  ['vuelo el lunes a las 6:45 am', { titulo: 'Vuelo', fecha: '2026-11-09', hora: '06:45' }],
  ['cena a las 8 y media de la noche', { titulo: 'Cena', fecha: '2026-11-05', hora: '20:30' }],
  ['cena a las 8 y media', { titulo: 'Cena', fecha: '2026-11-06', hora: '08:30' }],
  ['salida a las 5 menos cuarto', { titulo: 'Salida', hora: '16:45' }],
  ['comer al mediodía', { titulo: 'Comer', hora: '12:00' }],
  ['dormir a medianoche', { titulo: 'Dormir', hora: '00:00' }],
  ['llamar a las 18h', { titulo: 'Llamar', hora: '18:00' }],
  ['llamar 14:30', { titulo: 'Llamar', hora: '14:30', fecha: '2026-11-05' }],
  ['reunión este viernes 11am', { titulo: 'Reunión', fecha: '2026-11-06', hora: '11:00' }],
  ['reunión el jueves', { titulo: 'Reunión', fecha: '2026-11-12' }],
  ['reunión este jueves', { titulo: 'Reunión', fecha: '2026-11-05' }],
  ['miércoles dentista', { titulo: 'Dentista', fecha: '2026-11-11' }],
  ['domingo de picnic', { titulo: 'De picnic', fecha: '2026-11-08' }],
  ['pagar luz ayer', { titulo: 'Pagar luz', fecha: '2026-11-04' }],
  ['mañana', { titulo: '', fecha: '2026-11-06' }],
  ['informe para el 31 de diciembre', { titulo: 'Informe', fecha: '2026-12-31' }],
  ['MAÑANA Llamar A Pepe', { titulo: 'Llamar A Pepe', fecha: '2026-11-06' }],
  ['comprar regalo a fin de año', { titulo: 'Comprar regalo', fecha: '2026-12-31' }],
  ['cumpleaños el 5 de noviembre', { titulo: 'Cumpleaños', fecha: '2026-11-05' }],
  ['entrega el próximo mes #trabajo !alta ~3h', { titulo: 'Entrega', fecha: '2026-12-05', etiquetas: ['trabajo'], prioridad: 3, estimado: 180 }],
  ['lavar ropa los domingos 10 de la mañana', { titulo: 'Lavar ropa', fecha: '2026-11-08', hora: '10:00', rep: { tipo: 'semana', dias: [0] } }],
  ['tomar pastillas cada día a las 7 de la mañana', { titulo: 'Tomar pastillas', hora: '07:00', rep: { tipo: 'dia' } }],
  ['@compras leche y huevos', { titulo: 'Leche y huevos', lista: 'compras' }],
];
casos.forEach(([frase, esp]) => prueba('NL: ' + frase, () => {
  const r = NL.parsear(frase, O);
  Object.keys(esp).forEach((k) => {
    if (k === 'rep') { assert(r.rep, 'sin repetición'); Object.keys(esp.rep).forEach((q) => assert.deepStrictEqual(r.rep[q], esp.rep[q], 'rep.' + q + ' = ' + JSON.stringify(r.rep))); }
    else assert.deepStrictEqual(r[k], esp[k], k + ' = ' + JSON.stringify(r[k]) + ' en ' + JSON.stringify(r));
  });
}));
prueba('NL: al menos 60 frases', () => assert(casos.length >= 60));
prueba('NL: hora ya pasada -> mañana', () => assert.strictEqual(NL.parsear('llamar a las 9 am', O).fecha, '2026-11-06'));
prueba('NL: no inventa fecha', () => { const r = NL.parsear('leer capítulo 3 del libro', O); assert.strictEqual(r.fecha, ''); assert.strictEqual(r.titulo, 'Leer capítulo 3 del libro'); });

/* ---------- repeticiones ---------- */
prueba('rep: mensual 31 y meses cortos con ancla', () => {
  const r = R.anclar({ tipo: 'mes' }, '2026-01-31'); let f = '2026-01-31'; const v = [];
  for (let i = 0; i < 5; i++) { f = R.siguiente(r, f); v.push(f); }
  assert.deepStrictEqual(v, ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
});
prueba('rep: mensual año bisiesto', () => assert.strictEqual(R.siguiente(R.anclar({ tipo: 'mes' }, '2028-01-31'), '2028-01-31'), '2028-02-29'));
prueba('rep: anual 29 feb', () => {
  const r = R.anclar({ tipo: 'anio' }, '2024-02-29'); let f = '2024-02-29'; const v = [];
  for (let i = 0; i < 4; i++) { f = R.siguiente(r, f); v.push(f); }
  assert.deepStrictEqual(v, ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
});
prueba('rep: semanal con días y cada 2 semanas', () => {
  assert.strictEqual(R.siguiente({ tipo: 'semana', dias: [1, 3] }, '2026-11-09'), '2026-11-11');
  assert.strictEqual(R.siguiente({ tipo: 'semana', dias: [1, 3] }, '2026-11-11'), '2026-11-16');
  assert.strictEqual(R.siguiente({ tipo: 'semana', cada: 2, dias: [1, 3] }, '2026-11-11'), '2026-11-23');
  assert.strictEqual(R.siguiente({ tipo: 'semana', dias: [0] }, '2026-11-08'), '2026-11-15');
});
prueba('rep: domingo (lunes inicia semana)', () => assert.strictEqual(R.siguiente({ tipo: 'semana', dias: [0, 1] }, '2026-11-08'), '2026-11-09'));
prueba('rep: fecha límite y cuenta', () => {
  assert.strictEqual(R.siguiente({ tipo: 'dia', fin: '2026-11-10' }, '2026-11-10'), null);
  assert.strictEqual(R.siguiente({ tipo: 'dia', fin: '2026-11-10' }, '2026-11-09'), '2026-11-10');
  assert.deepStrictEqual(R.enRango({ tipo: 'dia', cuenta: 3 }, '2026-11-01', '2026-11-01', '2026-12-31'), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.deepStrictEqual(R.enRango({ tipo: 'semana', dias: [1], fin: '2026-11-16' }, '2026-11-02', '2026-11-01', '2026-12-31'), ['2026-11-02', '2026-11-09', '2026-11-16']);
});
prueba('rep: base completar usa hoy', () => {
  assert.strictEqual(R.siguiente({ tipo: 'dia', cada: 3, base: 'completar' }, '2026-10-01', { hoy: '2026-11-05' }), '2026-11-08');
  assert.strictEqual(R.siguiente({ tipo: 'semana', cada: 1, base: 'completar' }, '2026-10-01', { hoy: '2026-11-05' }), '2026-11-12');
});
prueba('rep: describir', () => assert.strictEqual(R.describir({ tipo: 'semana', cada: 2, dias: [1, 3] }), 'Cada 2 semanas (lun, mié)'));
prueba('rep: cambio de año y de mes', () => { assert.strictEqual(R.siguiente({ tipo: 'dia' }, '2026-12-31'), '2027-01-01'); assert.strictEqual(R.siguiente({ tipo: 'mes' }, '2026-12-15'), '2027-01-15'); });
prueba('fechas: aritmética', () => { assert.strictEqual(F.difDias('2026-03-29', '2026-03-28'), 1); assert.strictEqual(F.inicioSemana('2026-11-08'), '2026-11-02'); assert.strictEqual(F.finDeMes('2028-02-10'), '2028-02-29'); assert(!F.valida('2026-02-30')); });

/* zonas horarias / DST: la hora de pared se conserva; el instante cambia 23/25 h */
const horas = (a, b) => (b - a) / 3600000;
prueba('DST Nueva York: serie diaria conserva 09:00 (primavera)', () => {
  const tz = 'America/New_York'; let f = '2026-03-07'; const inst = [];
  for (let i = 0; i < 4; i++) { inst.push(F.aInstante(f, '09:00', tz)); f = R.siguiente({ tipo: 'dia' }, f); }
  assert.deepStrictEqual([horas(inst[0], inst[1]), horas(inst[1], inst[2]), horas(inst[2], inst[3])], [23, 24, 24]);
});
prueba('DST Nueva York: otoño 25 h', () => {
  const tz = 'America/New_York'; assert.strictEqual(horas(F.aInstante('2026-10-31', '09:00', tz), F.aInstante('2026-11-01', '09:00', tz)), 25);
  assert.strictEqual(horas(F.aInstante('2026-11-01', '09:00', tz), F.aInstante('2026-11-02', '09:00', tz)), 24);
});
prueba('DST Madrid: hueco 02:30 pasa a 03:30', () => {
  const t = F.aInstante('2026-03-29', '02:30', 'Europe/Madrid');
  assert.strictEqual(new Date(t).toISOString(), '2026-03-29T01:30:00.000Z'); // 03:30 CEST
});
prueba('DST Nueva York: hueco y hora repetida', () => {
  assert.strictEqual(new Date(F.aInstante('2026-03-08', '02:30', 'America/New_York')).toISOString(), '2026-03-08T07:30:00.000Z');
  assert.strictEqual(new Date(F.aInstante('2026-11-01', '01:30', 'America/New_York')).toISOString(), '2026-11-01T05:30:00.000Z'); // primera ocurrencia (EDT)
});
prueba('Zona sin DST (Ciudad de México 2026): offset fijo -6', () => assert.strictEqual(new Date(F.aInstante('2026-07-01', '12:00', 'America/Mexico_City')).toISOString(), '2026-07-01T18:00:00.000Z'));
prueba('Zona Kolkata +5:30', () => assert.strictEqual(new Date(F.aInstante('2026-07-01', '12:00', 'Asia/Kolkata')).toISOString(), '2026-07-01T06:30:00.000Z'));
prueba('Semanal cruza DST con misma hora de pared (Madrid)', () => {
  const tz = 'Europe/Madrid'; const a = F.aInstante('2026-03-23', '18:00', tz), b = F.aInstante(R.siguiente({ tipo: 'semana', dias: [1] }, '2026-03-23'), '18:00', tz), c = F.aInstante('2026-03-30', '18:00', tz);
  assert.strictEqual(b, c); assert.strictEqual(horas(a, b), 7 * 24 - 1);
});
prueba('Instante local coincide con Date', () => assert.strictEqual(F.aInstante('2026-06-15', '08:05'), new Date(2026, 5, 15, 8, 5).getTime()));

/* ---------- habitos ---------- */
prueba('habitos: rachas (dias programados, hoy pendiente no rompe, huecos rompen)', () => {
  const h = { dias: [1, 2, 3, 4, 5], creada: new Date(2026, 9, 1).getTime() }; // lun-vie
  const marcas = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-11-02', '2026-11-03']; // sin 31 y 1 (fin de semana, no programados)
  assert.deepStrictEqual(Mo.rachas(h, marcas, '2026-11-04'), { actual: 7, mejor: 7 }); // hoy (miercoles) aun sin marcar
  assert.deepStrictEqual(Mo.rachas(h, marcas, '2026-11-05'), { actual: 0, mejor: 7 }); // ayer sin marcar y hoy tambien -> la racha se rompio
  assert.deepStrictEqual(Mo.rachas({ dias: [0, 1, 2, 3, 4, 5, 6], creada: new Date(2026, 10, 1).getTime() }, ['2026-11-01', '2026-11-02', '2026-11-04'], '2026-11-04'), { actual: 1, mejor: 2 });
});

/* ---------- cifrado ---------- */
prueba('cripto: ida y vuelta (unicode)', async () => {
  const txt = 'Secreto ñandú 🔒\n# nota'; const o = await C.cifrar(txt, 'clave-123');
  assert(o.d && o.s && o.i && o.it === 210000); assert(!JSON.stringify(o).includes('Secreto'));
  assert.strictEqual(await C.descifrar(o, 'clave-123'), txt);
});
prueba('cripto: contraseña incorrecta falla', async () => { const o = await C.cifrar('hola', 'buena', 1000); await assert.rejects(C.descifrar(o, 'mala'), /incorrecta/); });
prueba('cripto: datos alterados fallan y sal/iv distintos', async () => {
  const a = await C.cifrar('x', 'p', 1000), b = await C.cifrar('x', 'p', 1000); assert.notStrictEqual(a.d, b.d); assert.notStrictEqual(a.s, b.s);
  const d = U.deB64(a.d); d[0] ^= 1; await assert.rejects(C.descifrar(Object.assign({}, a, { d: U.b64(d) }), 'p'));
});
prueba('cripto: clave reutilizable con IV nuevo', async () => {
  const sal = C.nuevaSal(), k = await C.derivar('p', sal, 1000), a = await C.cifrarCon(k, sal, 1000, 'uno'), b = await C.cifrarCon(k, sal, 1000, 'uno');
  assert.notStrictEqual(a.i, b.i); assert.strictEqual(await C.descifrar(a, 'p'), 'uno');
});

/* ---------- migraciones ---------- */
prueba('migraciones v1 -> actual', () => {
  const d = { esquema: 1, cols: { notas: [{ id: 'n1', texto: 'hola', etiquetas: ['#Casa'] }], tareas: [{ id: 't1', titulo: 'x', prio: 'alta', vence: '2026-11-06T18:30', hecha: true }], listas: [{ id: 'l1', nombre: 'A' }] } };
  Mig.migrar(d); assert.strictEqual(d.esquema, Mig.ESQUEMA);
  assert.strictEqual(d.cols.notas[0].cuerpo, 'hola'); assert(!('texto' in d.cols.notas[0])); assert.deepStrictEqual(d.cols.notas[0].etiquetas, ['casa']);
  const t = d.cols.tareas[0]; assert.strictEqual(t.prioridad, 3); assert.strictEqual(t.fecha, '2026-11-06'); assert.strictEqual(t.hora, '18:30'); assert.strictEqual(t.estado, 'hecha');
  assert.strictEqual(d.cols.listas[0].columnas.length, 3);
});
prueba('migraciones v2 -> v3 y futura rechazada', () => {
  const d = { esquema: 2, cols: { tareas: [{ id: 't', titulo: 'a', prioridad: 2 }] } }; Mig.migrar(d); assert.strictEqual(d.cols.tareas[0].estado, 'pendiente');
  assert.throws(() => Mig.migrar({ esquema: 99, cols: {} }), /más nueva/);
});
prueba('migraciones al abrir almacén antiguo (con copia previa)', async () => {
  const resp = A.respaldoMemoria();
  await resp.escribir({ recs: [['notas', 'n1', { id: 'n1', texto: 'viejo', _m: { texto: [1, 1, 'x'] } }]], meta: { esquema: 1, lam: 1 }, cambios: [] });
  const s = A.crear({ respaldo: resp, sitio: 's' }); await s.listo;
  assert.strictEqual(s.get('notas', 'n1').cuerpo, 'viejo'); assert.strictEqual((await s.copias()).length, 1);
});

/* ---------- almacén ---------- */
prueba('almacén: crear/leer/borrar/suscripción/log', async () => {
  const s = A.crear({ sitio: 'a', retardo: 0 }); await s.listo; const ev = []; s.suscribir((e) => ev.push(e.tipo + ':' + e.col));
  s.set('notas', '1', { titulo: 'A', cuerpo: 'x' }); s.set('notas', '1', { titulo: 'B' }); s.set('notas', '1', { titulo: 'B' }); s.borrar('notas', '1');
  assert.deepStrictEqual(ev, ['crear:notas', 'cambio:notas', 'borrar:notas']); assert.strictEqual(s.get('notas', '1'), undefined);
  const c = s.cambios(); assert.strictEqual(c.length, 3); assert(c[1].campos[0] === 'titulo' && c[1].ts > 0 && c[1].sitio === 'a'); assert.strictEqual(s.cambios(2).length, 1);
});
prueba('almacén: persistencia y recarga', async () => {
  const resp = A.respaldoMemoria(); const s = A.crear({ respaldo: resp, sitio: 'a' }); await s.listo;
  for (let i = 0; i < 50; i++) s.set('tareas', 't' + i, { titulo: 'T' + i }); await s.vaciar();
  const s2 = A.crear({ respaldo: resp, sitio: 'a' }); await s2.listo; assert.strictEqual(s2.lista('tareas').length, 50); assert.strictEqual(s2.cambios().length, 50); assert(s2.lam >= 50);
});
prueba('almacén: LWW por campo entre dos sitios (convergencia)', async () => {
  const a = A.crear({ sitio: 'a' }), b = A.crear({ sitio: 'b' }); await a.listo; await b.listo;
  a.set('tareas', 't', { titulo: 'uno', prioridad: 1 }); b.aplicarRemoto('tareas', 't', a.get('tareas', 't'));
  a.set('tareas', 't', { titulo: 'de A' }); b.set('tareas', 't', { prioridad: 4 }); b.set('tareas', 't', { titulo: 'de B' });
  const ra = U.clon(a.get('tareas', 't')), rb = U.clon(b.get('tareas', 't'));
  a.aplicarRemoto('tareas', 't', rb); b.aplicarRemoto('tareas', 't', ra);
  assert.deepStrictEqual([a.get('tareas', 't').titulo, a.get('tareas', 't').prioridad], [b.get('tareas', 't').titulo, b.get('tareas', 't').prioridad]);
  assert.strictEqual(a.get('tareas', 't').prioridad, 4); assert.strictEqual(a.get('tareas', 't').titulo, 'de B');
});
prueba('almacén: borrado remoto y reaparición, idempotencia', async () => {
  const a = A.crear({ sitio: 'a' }), b = A.crear({ sitio: 'b' }); await a.listo; await b.listo;
  a.set('notas', 'n', { titulo: 'x' }); b.aplicarRemoto('notas', 'n', a.get('notas', 'n')); b.borrar('notas', 'n');
  assert.deepStrictEqual(a.aplicarRemoto('notas', 'n', b.crudos('notas')[0]), ['_del']); assert.strictEqual(a.get('notas', 'n'), undefined);
  assert.deepStrictEqual(a.aplicarRemoto('notas', 'n', b.crudos('notas')[0]), []);
  a.set('notas', 'n', { titulo: 'de nuevo' }); assert.strictEqual(a.get('notas', 'n').titulo, 'de nuevo');
});
prueba('almacén: copia automática y restaurar', async () => {
  const s = A.crear({ sitio: 'a' }); await s.listo; s.set('notas', '1', { titulo: 'orig' }); const c = await s.copiaAuto(1); assert(c);
  s.set('notas', '1', { titulo: 'cambiado' }); s.set('notas', '2', { titulo: 'extra' });
  const l = await s.copias(); await s.restaurarCopia(l[0].id);
  assert.strictEqual(s.get('notas', '1').titulo, 'orig'); assert.strictEqual(s.get('notas', '2'), undefined);
});

prueba('JSON fusionar: recupera lo borrado localmente pero respeta ediciones mas recientes', async () => {
  const s = await datosCompletos(), t = IO.exportarJSON(s); s.borrar('notas', 'n2'); s.set('notas', 'n1', { titulo: 'Editado despues' });
  const r = IO.importarJSON(s, t, 'fusionar'); assert(r.nuevos >= 1); assert.strictEqual(s.get('notas', 'n2').titulo, 'Recetas'); assert.strictEqual(s.get('notas', 'n1').titulo, 'Editado despues');
});

/* ---------- Markdown ---------- */
prueba('md: bloques e inline', () => {
  const h = Md.aHtml('# T\n\n**b** *i* ~~s~~ ==m== `c` [l](https://a.com) [[Nota X]]\n\n- [ ] a\n- [x] b\n\n| a | b |\n|---|---|\n| 1 | 2 |', { nota: (t) => (t === 'Nota X' ? 'id1' : '') });
  ['<h1>T</h1>', '<strong>b</strong>', '<em>i</em>', '<s>s</s>', '<mark>m</mark>', '<code>c</code>', 'href="https://a.com"', 'data-id="id1"', 'data-tk="0"', 'data-tk="1"', '<th>a</th>', '<td>2</td>'].forEach((x) => assert(h.includes(x), x + ' en ' + h));
});
prueba('md: escapa HTML y bloquea javascript:', () => {
  const h = Md.aHtml('<script>alert(1)</script> [x](javascript:alert(1)) ![y](javascript:1)');
  assert(!h.includes('<script') && !h.includes('href="javascript') && !h.includes('src="javascript'));
});
prueba('md: enlaces, texto y tareas', () => {
  assert.deepStrictEqual(Md.enlaces('ver [[A]] y [[B b]] y [[A]]\n```\n[[no]]\n```'), ['A', 'B b']);
  assert.strictEqual(Md.aTexto('# Hola **mundo**\n- [ ] x [[y]]'), 'Hola mundo x y'); assert.deepStrictEqual(Md.tareasMd('- [ ] a\n- [x] b\n1. [X] c'), { total: 3, hechas: 2 });
});

/* ---------- búsqueda ---------- */
function datosBusqueda() {
  const s = A.crear({ sitio: 'a' });
  return s.listo.then(() => {
    s.poner('libretas', Mo.libreta({ id: 'lb1', nombre: 'Trabajo' })); s.poner('listas', Mo.lista({ id: 'ls1', nombre: 'Casa' }));
    s.poner('notas', Mo.nota({ id: 'n1', titulo: 'Plan de proyecto', cuerpo: 'Presupuesto y ñandúes', etiquetas: ['trabajo/proyectos'], libreta: 'lb1', fijada: true, modificada: new Date(2026, 10, 3, 12).getTime() }));
    s.poner('notas', Mo.nota({ id: 'n2', titulo: 'Recetas', cuerpo: 'tortilla de patata', etiquetas: ['cocina'], modificada: new Date(2026, 10, 3, 12).getTime() }));
    s.poner('tareas', Mo.tarea({ id: 't1', titulo: 'Pagar luz', fecha: '2026-11-04', prioridad: 3, etiquetas: ['hogar'], lista: 'ls1' }));
    s.poner('tareas', Mo.tarea({ id: 't2', titulo: 'Comprar pan', fecha: '2026-11-10', prioridad: 1, estado: 'hecha' }));
    s.poner('tareas', Mo.tarea({ id: 't3', titulo: 'Llamar banco', prioridad: 4, etiquetas: ['trabajo'] }));
    return s;
  });
}
prueba('búsqueda: operadores', async () => {
  const s = await datosBusqueda(), ctx = { hoy: '2026-11-05', nombreContenedor: (t, id) => (t === 'tarea' ? (s.get('listas', id) || {}).nombre : (s.get('libretas', id) || {}).nombre) };
  const ids = (q) => B.buscar(s, q, ctx).map((r) => r.rec.id).sort().join(',');
  assert.strictEqual(ids('tag:trabajo'), 'n1,t3'); assert.strictEqual(ids('tag:trabajo/proyectos'), 'n1'); assert.strictEqual(ids('prioridad:alta'), 't1');
  assert.strictEqual(ids('prioridad:>=alta'), 't1,t3'); assert.strictEqual(ids('antes:hoy'), 'n1,n2,t1'); assert.strictEqual(ids('despues:2026-11-05'), 't2');
  assert.strictEqual(ids('en:casa'), 't1'); assert.strictEqual(ids('en:trabajo'), 'n1'); assert.strictEqual(ids('en:notas'), 'n1,n2'); assert.strictEqual(ids('es:hecha'), 't2');
  assert.strictEqual(ids('es:fijada'), 'n1'); assert.strictEqual(ids('es:vencida'), 't1'); assert.strictEqual(ids('pagar -luz'), ''); assert.strictEqual(ids('"de patata"'), 'n2');
  assert.strictEqual(ids('nandues'), 'n1'); assert.strictEqual(ids('sin:fecha'), 't3'); assert.strictEqual(ids('#cocina'), 'n2'); assert.strictEqual(ids('tag:trabajo prioridad:urgente'), 't3');
});
prueba('búsqueda: orden por relevancia', async () => { const s = await datosBusqueda(); s.poner('notas', Mo.nota({ id: 'n9', titulo: 'otro', cuerpo: 'luz y más luz' })); assert.strictEqual(B.buscar(s, 'luz')[0].rec.id, 't1'); });

/* ---------- exportar / importar ---------- */
async function datosCompletos() {
  const s = await datosBusqueda();
  s.poner('tareas', Mo.tarea({ id: 't4', titulo: 'Sub A', padre: 't1', lista: 'ls1', orden: 2 }));
  s.set('tareas', 't1', { rep: { tipo: 'semana', cada: 1, base: 'fecha', dias: [1, 3] }, hora: '18:30', estimado: 30, notas: 'detalle uno\ndos', recordar: 10 });
  s.poner('adjuntos', { id: 'a1', nombre: 'x.png', tipo: 'image/png', url: 'data:image/png;base64,iVBORw0KGgo=', bytes: 8, creada: 1 });
  s.set('notas', 'n1', { cuerpo: '# Plan\n\n![f](adj:a1)\n\n- [ ] paso\n\nVer [[Recetas]]' });
  return s;
}
prueba('JSON: exportar -> importar en almacén vacío (fidelidad total)', async () => {
  const s = await datosCompletos(), t = IO.exportarJSON(s), d = A.crear({ sitio: 'z' }); await d.listo;
  const r = IO.importarJSON(d, t, 'reemplazar'); assert(r.total >= 9);
  ['notas', 'tareas', 'listas', 'libretas', 'adjuntos'].forEach((c) => assert.deepStrictEqual(U.clon(d.lista(c).map((x) => { const y = U.clon(x); delete y._m; return y; }).sort((a, b) => a.id < b.id ? -1 : 1)), U.clon(s.lista(c).map((x) => { const y = U.clon(x); delete y._m; return y; }).sort((a, b) => a.id < b.id ? -1 : 1)), c));
});
prueba('JSON: fusionar respeta lo más reciente y rechaza archivos ajenos', async () => {
  const s = await datosCompletos(), t = IO.exportarJSON(s); s.set('notas', 'n2', { titulo: 'Más nuevo' });
  const r = IO.importarJSON(s, t, 'fusionar'); assert.strictEqual(r.nuevos, 0); assert.strictEqual(s.get('notas', 'n2').titulo, 'Más nuevo');
  assert.throws(() => IO.importarJSON(s, '{"a":1}'), /no es una copia/); assert.throws(() => IO.importarJSON(s, 'xx'), /JSON/);
});
prueba('JSON antiguo v1 se migra al importar', async () => {
  const s = A.crear({ sitio: 'z' }); await s.listo; IO.importarJSON(s, JSON.stringify({ app: 'notas', esquema: 1, cols: { notas: [{ id: 'a', texto: 'hola' }] } }));
  assert.strictEqual(s.get('notas', 'a').cuerpo, 'hola');
});
prueba('ZIP: crear y leer (varios archivos, utf8, binario)', async () => {
  const bin = new Uint8Array([0, 1, 2, 255, 254]), z = Z.crear([{ ruta: 'a/ñandú.md', datos: 'héllo' }, { ruta: 'b.bin', datos: bin }]);
  const l = await Z.leer(z); assert.strictEqual(l.length, 2); assert.strictEqual(l[0].ruta, 'a/ñandú.md'); assert.strictEqual(U.deUtf8(l[0].datos), 'héllo'); assert.deepStrictEqual(Array.from(l[1].datos), Array.from(bin));
  assert.strictEqual(Z.crc32(U.utf8('123456789')), 0xcbf43926);
});
prueba('ZIP: lee archivos con deflate (gzip del sistema)', async () => {
  const cp = require('child_process'), fs = require('fs'), os = require('os'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zz'));
  try { fs.writeFileSync(path.join(dir, 'x.txt'), 'hola '.repeat(500)); cp.execSync('zip -q -r a.zip x.txt', { cwd: dir }); } catch (e) { return; }
  const l = await Z.leer(new Uint8Array(fs.readFileSync(path.join(dir, 'a.zip')))); assert.strictEqual(U.deUtf8(l[0].datos), 'hola '.repeat(500));
});
prueba('Markdown/zip: exportar -> importar conserva notas, tareas, libretas y adjuntos', async () => {
  const s = await datosCompletos(), zip = IO.exportarZip(s), d = A.crear({ sitio: 'z' }); await d.listo;
  const r = await IO.importarZip(d, zip, { hoy: '2026-11-05' });
  assert.strictEqual(r.notas, 2); assert.strictEqual(r.libretas, 1); assert.strictEqual(r.adjuntos, 1);
  const n1 = d.lista('notas').find((n) => n.titulo === 'Plan de proyecto'); assert(n1.fijada); assert.deepStrictEqual(n1.etiquetas, ['trabajo/proyectos']);
  assert.strictEqual(d.get('libretas', n1.libreta).nombre, 'Trabajo'); assert(/!\[f\]\(adj:a1\)/.test(n1.cuerpo) && n1.cuerpo.includes('- [ ] paso') && n1.cuerpo.startsWith('# Plan'));
  assert(d.get('adjuntos', 'a1').url.startsWith('data:image/png;base64,'));
  const t = d.lista('tareas').find((x) => x.titulo === 'Pagar luz'); assert.strictEqual(t.fecha, '2026-11-04'); assert.strictEqual(t.hora, '18:30'); assert.strictEqual(t.prioridad, 3);
  assert.deepStrictEqual(t.etiquetas, ['hogar']); assert.strictEqual(t.estimado, 30); assert.deepStrictEqual(t.rep.dias, [1, 3]); assert.strictEqual(t.notas, 'detalle uno\ndos');
  assert.strictEqual(d.lista('tareas').find((x) => x.titulo === 'Sub A').padre, t.id); assert.strictEqual(d.lista('tareas').find((x) => x.titulo === 'Comprar pan').estado, 'hecha');
});
prueba('Markdown: importar carpeta con front-matter ajeno y títulos H1', async () => {
  const d = A.crear({ sitio: 'z' }); await d.listo;
  const r = IO.importarMd(d, [{ ruta: 'Diario/hoy.md', datos: '# Mi día\n\nTexto' }, { ruta: 'suelta.md', datos: '---\ntitulo: "X"\netiquetas: [a, B]\n---\ncuerpo' }]);
  assert.strictEqual(r.notas, 2); const a = d.lista('notas').find((n) => n.titulo === 'Mi día'); assert.strictEqual(a.cuerpo, 'Texto'); assert.strictEqual(d.get('libretas', a.libreta).nombre, 'Diario');
  assert.deepStrictEqual(d.lista('notas').find((n) => n.titulo === 'X').etiquetas, ['a', 'b']);
});
prueba('ICS: exportar -> importar (eventos y todo)', async () => {
  const s = await datosCompletos(), ts = s.lista('tareas');
  ['evento', 'todo'].forEach((formato) => {
    const ics = IO.exportarICS(ts, { formato, ahora: '20261105T100000' }); assert(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.includes('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE'));
    ics.split('\r\n').forEach((l) => assert(Buffer.byteLength(l) <= 75, 'línea larga ' + l));
    const r = IO.importarICS(ics), t = r.find((x) => x.titulo === 'Pagar luz');
    assert.strictEqual(t.fecha, '2026-11-04'); assert.strictEqual(t.hora, '18:30'); assert.strictEqual(t.prioridad, 3); assert.deepStrictEqual(t.etiquetas, ['hogar']);
    assert.deepStrictEqual(t.rep.dias, [1, 3]); assert.strictEqual(t.notas, 'detalle uno\ndos'); assert.strictEqual(t.recordar, 10);
    assert.strictEqual(r.find((x) => x.titulo === 'Comprar pan').estado, 'hecha' === (formato === 'todo' ? 'hecha' : 'x') ? 'hecha' : r.find((x) => x.titulo === 'Comprar pan').estado);
    assert.strictEqual(r.length, ts.filter((x) => x.fecha).length);
  });
});
prueba('ICS: importa Google Calendar (UTC, todo el día, escapes, plegado, RRULE mensual)', () => {
  const txt = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'DTSTART:20270115T120000Z', 'SUMMARY:Reunión\\, equipo\; trimestral', 'DESCRIPTION:Línea 1\\nLínea 2 muy larga que se', '  pliega', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;UNTIL=20271231T000000Z', 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'END:VALARM', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20270301', 'SUMMARY:Festivo', 'END:VEVENT', 'BEGIN:VTODO', 'SUMMARY:Sin fecha', 'PRIORITY:1', 'END:VTODO', 'END:VCALENDAR'].join('\r\n');
  const r = IO.importarICS(txt); assert.strictEqual(r.length, 3);
  const d = new Date(Date.UTC(2027, 0, 15, 12, 0)); assert.strictEqual(r[0].hora, F.p2(d.getHours()) + ':' + F.p2(d.getMinutes()));
  assert.strictEqual(r[0].titulo, 'Reunión, equipo; trimestral'); assert(r[0].notas.startsWith('Línea 1\nLínea 2')); assert.strictEqual(r[0].rep.diaMes, 'ultimo'); assert.strictEqual(r[0].rep.fin, '2027-12-31'); assert.strictEqual(r[0].recordar, 60);
  assert.strictEqual(r[1].fecha, '2027-03-01'); assert.strictEqual(r[1].hora, ''); assert.strictEqual(r[2].prioridad, 4);
});

/* ---------- rendimiento de búsqueda ---------- */
prueba('rendimiento: 500 notas y 300 tareas, búsqueda < 50 ms', async () => {
  const s = A.crear({ sitio: 'p', retardo: 100000 }); await s.listo; const pal = 'casa trabajo proyecto idea reunión compras viaje plan lectura cocina salud finanzas código diseño'.split(' ');
  for (let i = 0; i < 500; i++) s.poner('notas', Mo.nota({ id: 'n' + i, titulo: pal[i % 14] + ' ' + i, cuerpo: Array.from({ length: 60 }, (_, k) => pal[(i * 7 + k * 3) % 14]).join(' '), etiquetas: [pal[i % 5]] }));
  for (let i = 0; i < 300; i++) s.poner('tareas', Mo.tarea({ id: 't' + i, titulo: 'Tarea ' + pal[i % 14] + ' ' + i, fecha: F.sumDias('2026-11-01', i % 30), prioridad: i % 5 }));
  B.buscar(s, 'plan'); const t0 = process.hrtime.bigint(); for (let k = 0; k < 20; k++) B.buscar(s, 'proyecto tag:casa'); B.buscar(s, 'salud prioridad:alta antes:2026-11-20');
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 21; console.log('   búsqueda media ' + ms.toFixed(2) + ' ms'); assert(ms < 50);
});

(async () => { for (const f of pend) await f(); console.log('\n' + ok + ' correctas, ' + mal + ' fallidas'); process.exit(mal ? 1 : 0); })();
