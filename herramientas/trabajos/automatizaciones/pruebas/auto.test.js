/* Pruebas del motor: node pruebas/auto.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process'), http = require('http');
const M = require('../js/motor.js'), Cat = require('../js/catalogo.js'), Nube = require('../js/githubaction.js');
let n = 0; const T = [];
function t(nombre, fn) { T.push([nombre, fn]); }
const flujo = (nodos, aristas, vars) => ({ id: 'f', nombre: 'Prueba', vars: vars || {}, nodos: nodos.map(([id, tipo, cfg]) => ({ id, tipo, cfg: cfg || {} })), aristas: aristas.map(s => { const m = /^(\w+)(?:\.(\w+))?>(\w+)$/.exec(s); return { de: m[1], sal: m[2] || 'sal', a: m[3] }; }) });
const run = (f, o) => M.ejecutar(f, Object.assign({ catalogo: Cat }, o));

/* plantillas */
t('plantillas basicas y filtros', () => {
  const d = { vars: { precio: 12.3456, nombre: 'ana', lista: [1, 2, 3] }, entrada: { x: { y: [10, 20] } }, secreto: { K: 'zz' } };
  assert.strictEqual(M.renderizar('Hola {{nombre|mayus}}', d), 'Hola ANA');
  assert.strictEqual(M.renderizar('{{precio|redondear:2}}', d), '12.35');
  assert.strictEqual(M.renderizar('{{entrada.x.y[1]}}', d), '20');
  assert.strictEqual(M.renderizar('{{nada|def:vacio}}', d), 'vacio');
  assert.strictEqual(M.renderizar('{{lista|unir:-}}', d), '1-2-3');
  assert.strictEqual(M.renderizar('{{lista|longitud}}', d), '3');
  assert.strictEqual(M.renderizar('{{secreto.K}}', d), 'zz');
  assert.strictEqual(M.renderizar('{{ nombre | recortar:2 }}', d), 'an…');
  assert.strictEqual(M.renderizar('{{faltante}}', d), '');
  assert.strictEqual(M.renderizar('{{__proto__.x}}', d), '');
  assert.deepStrictEqual(M.evaluar('{{lista}}', d), [1, 2, 3]);
  assert.strictEqual(M.evaluar('a {{nombre}}', d), 'a ana');
});
t('condiciones', () => {
  const C = (a, op, b) => M.comparar(a, op, b);
  assert(C('10', 'gt', '9')); assert(!C('10', 'lt', '9')); assert(C('abc', 'contiene', 'B')); assert(C(5, 'eq', '5.0'));
  assert(C('', 'vacio')); assert(C([], 'vacio')); assert(C('x', 'novacio')); assert(C('hola', 'empieza', 'HO')); assert(C('hola', 'termina', 'la'));
  assert(C('abc123', 'regex', '\\d+')); assert(C('b', 'gt', 'a')); assert(C([1, 2], 'contiene', 2)); assert(!C('a', 'eq', 'b'));
  assert.throws(() => C('a', 'regex', '('));
  assert(M.condicion({ reglas: [{ izq: '{{a}}', op: 'gt', der: '1' }, { izq: '{{a}}', op: 'lt', der: '5' }] }, { vars: { a: 3 } }));
  assert(!M.condicion({ reglas: [{ izq: '{{a}}', op: 'gt', der: '9' }, { izq: '{{a}}', op: 'lt', der: '5' }], modo: 'todas' }, { vars: { a: 3 } }));
  assert(M.condicion({ reglas: [{ izq: '{{a}}', op: 'gt', der: '9' }, { izq: '{{a}}', op: 'lt', der: '5' }], modo: 'alguna' }, { vars: { a: 3 } }));
});
/* cron: casos de referencia (UTC) */
const U = (s) => new Date(s + 'Z'), P = (e, d) => M.proxima(e, U(d), { utc: true }).toISOString().slice(0, 16);
t('cron proxima', () => {
  assert.strictEqual(P('*/15 * * * *', '2024-01-01T10:07:00'), '2024-01-01T10:15');
  assert.strictEqual(P('*/15 * * * *', '2024-01-01T10:45:00'), '2024-01-01T11:00');
  assert.strictEqual(P('0 9 * * 1-5', '2024-01-05T09:00:00'), '2024-01-08T09:00');
  assert.strictEqual(P('30 2 29 2 *', '2023-03-01T00:00:00'), '2024-02-29T02:30');
  assert.strictEqual(P('0 0 1 1 *', '2024-06-15T12:00:00'), '2025-01-01T00:00');
  assert.strictEqual(P('0 0 13 * 5', '2024-09-01T00:00:00'), '2024-09-06T00:00');   // dia-mes OR dia-semana
  assert.strictEqual(P('0 0 13 * 5', '2024-09-07T00:00:00'), '2024-09-13T00:00');
  assert.strictEqual(P('@daily', '2024-01-01T10:00:00'), '2024-01-02T00:00');
  assert.strictEqual(P('@hourly', '2024-01-01T10:00:00'), '2024-01-01T11:00');
  assert.strictEqual(P('5,35 8-10 * jan,mar mon', '2024-01-01T08:06:00'), '2024-01-01T08:35');
  assert.strictEqual(P('0 12 * * 7', '2024-01-01T00:00:00'), '2024-01-07T12:00');   // 7 = domingo
  assert.strictEqual(P('10-20/5 * * * *', '2024-01-01T00:12:00'), '2024-01-01T00:15');
  assert.strictEqual(P('0 0 31 * *', '2024-04-01T00:00:00'), '2024-05-31T00:00');
  assert(M.coincide('0 9 * * 1-5', U('2024-01-08T09:00:00'), { utc: true })); assert(!M.coincide('0 9 * * 1-5', U('2024-01-07T09:00:00'), { utc: true }));
});
t('cron invalido', () => {
  ['61 * * * *', '* * * *', '* * * * * *', '*/0 * * * *', '* 24 * * *', 'a * * * *', '5-1 * * * *', '* * 0 * *', '* * * 13 *', '1//2 * * * *'].forEach(e => assert(M.validarCron(e), e));
  assert.strictEqual(M.validarCron('*/5 * * * *'), null);
  assert.throws(() => M.proxima('0 0 30 2 *', U('2024-01-01T00:00:00'), { utc: true }));
});
t('planificador', () => {
  let ahora = Date.UTC(2024, 0, 1, 10, 0, 0); const pl = M.planificador(() => ahora);
  pl.poner('a', { cada: 60000 }); pl.poner('b', { cron: '*/5 * * * *', utc: true });
  assert.deepStrictEqual(pl.tick(ahora + 30000), []);
  assert.deepStrictEqual(pl.tick(ahora + 60000), ['a']);
  assert.deepStrictEqual(pl.tick(ahora + 5 * 60000).sort(), ['a', 'b']);
  assert.deepStrictEqual(pl.tick(ahora + 5 * 60000 + 100), []);
  assert.deepStrictEqual(pl.tick(ahora + 3600000).sort(), ['a', 'b']);   // sin recuperar perdidos: una sola vez
  pl.quitar('a'); assert.deepStrictEqual(pl.ids(), ['b']);
});
/* motor */
t('flujo lineal, condicion y variables', async () => {
  const f = flujo([['d', 'manual'], ['v', 'variable', { nombre: 'p', valor: '{{entrada.precio}}' }], ['c', 'condicion', { reglas: [{ izq: '{{p}}', op: 'gt', der: '100' }] }], ['s', 'plantilla', { texto: 'ALTO {{p}}' }], ['n', 'plantilla', { texto: 'bajo {{p}}' }]], ['d>v', 'v>c', 'c.si>s', 'c.no>n']);
  let r = await run(f, { disparo: { datos: { precio: 150 } } });
  assert.strictEqual(r.estado, 'ok'); assert.strictEqual(r.pasos.map(p => p.nodo).join(), 'd,v,c,s'); assert.strictEqual(r.pasos[3].salida.texto, 'ALTO 150');
  r = await run(f, { disparo: { datos: { precio: 50 } } }); assert.strictEqual(r.pasos[3].salida.texto, 'bajo 50');
});
t('bucle con limite y fin', async () => {
  const f = flujo([['d', 'manual'], ['b', 'bucle', { modo: 'lista', lista: '{{l}}', var: 'x', max: 3 }], ['s', 'variable', { nombre: 'suma', valor: '{{x}}', op: 'sumar' }], ['z', 'plantilla', { texto: 'fin {{suma}}' }]], ['d>b', 'b.cuerpo>s', 'b.fin>z'], { l: [1, 2, 3, 4, 5], suma: 0 });
  const r = await run(f); assert.strictEqual(r.estado, 'ok'); assert.strictEqual(r.pasos[r.pasos.length - 1].salida.texto, 'fin 6');
  assert.strictEqual(r.pasos[1].salida.recortado, true);
  const f2 = flujo([['d', 'manual'], ['b', 'bucle', { modo: 'veces', veces: '4', max: 100 }], ['s', 'variable', { nombre: 'k', valor: '1', op: 'sumar' }]], ['d>b', 'b.cuerpo>s']);
  assert.strictEqual((await run(f2)).vars.k, 4);
  const f3 = flujo([['d', 'manual'], ['b', 'bucle', { modo: 'veces', veces: '999999', max: 999999 }], ['s', 'variable', { nombre: 'k', valor: '1', op: 'sumar' }]], ['d>b', 'b.cuerpo>s']);
  const r3 = await run(f3, { limiteBucle: 50, limitePasos: 10000 }); assert.strictEqual(r3.vars.k, 50);
});
t('ciclo infinito se corta por limite de pasos', async () => {
  const f = flujo([['d', 'manual'], ['a', 'variable', { nombre: 'k', valor: '1', op: 'sumar' }]], ['d>a', 'a>a']);
  const r = await run(f, { limitePasos: 40 }); assert.strictEqual(r.estado, 'error'); assert(/Límite de 40 pasos/.test(r.error));
});
t('filtro, json y plantillas con item', async () => {
  const f = flujo([['d', 'manual'], ['j', 'json', { modo: 'analizar', fuente: '{{entrada.txt}}', guardarEn: 'ofertas' }], ['f', 'filtro', { lista: '{{ofertas}}', reglas: [{ izq: '{{item.d}}', op: 'ge', der: '30' }], ordenarPor: 'd', orden: 'desc', limite: 2, guardarEn: 'top' }], ['u', 'json', { modo: 'elegir', fuente: '{{top}}', campos: 'n' }], ['t', 'json', { modo: 'unir', fuente: '{{ultimo.valor}}', separador: ' | ' }]], ['d>j', 'j>f', 'f>u', 'u>t']);
  const r = await run(f, { disparo: { datos: { txt: JSON.stringify([{ n: 'a', d: 10 }, { n: 'b', d: 50 }, { n: 'c', d: 30 }, { n: 'd', d: 40 }]) } } });
  assert.strictEqual(r.estado, 'ok', r.error); assert.deepStrictEqual(r.vars.top.map(x => x.n), ['b', 'd']); assert(/\{"n":"b"\} \| \{"n":"d"\}/.test(r.pasos[4].salida.valor));
});
t('json extraer y error de ruta', async () => {
  let r = await run(flujo([['d', 'manual'], ['j', 'json', { modo: 'extraer', fuente: '{{entrada}}', ruta: 'a.b[1]' }]], ['d>j']), { disparo: { datos: { a: { b: [1, 7] } } } });
  assert.strictEqual(r.pasos[1].salida.valor, 7);
  r = await run(flujo([['d', 'manual'], ['j', 'json', { modo: 'extraer', fuente: '{{entrada}}', ruta: 'z' }]], ['d>j']), { disparo: { datos: { a: 1 } } });
  assert.strictEqual(r.estado, 'error'); assert.strictEqual(r.nodoError, 'j');
});
t('puerto de error, acciones y simulacion', async () => {
  const llamadas = [];
  const acciones = { http: async (c) => { llamadas.push(c.url); if (/mal/.test(c.url)) throw new Error('HTTP 500'); return { valor: 'ok' }; }, notificacion: async (c) => { llamadas.push('N:' + c.texto); return {}; } };
  const f = flujo([['d', 'manual'], ['h', 'http', { url: '{{entrada.u}}' }], ['n', 'notificacion', { texto: 'listo' }], ['e', 'notificacion', { texto: 'fallo: {{ultimo.error}}' }]], ['d>h', 'h>n', 'h.error>e']);
  let r = await run(f, { acciones, disparo: { datos: { u: 'https://bien' } } }); assert.strictEqual(r.estado, 'ok'); assert.deepStrictEqual(llamadas, ['https://bien', 'N:listo']);
  llamadas.length = 0; r = await run(f, { acciones, disparo: { datos: { u: 'https://mal' } } }); assert.strictEqual(r.estado, 'ok'); assert.deepStrictEqual(llamadas, ['https://mal', 'N:fallo: HTTP 500']);
  llamadas.length = 0; r = await run(f, { acciones, simulacion: true, disparo: { datos: { u: 'https://bien' } } });
  assert.deepStrictEqual(llamadas, []); assert.strictEqual(r.pasos[1].estado, 'simulado'); assert.strictEqual(r.pasos[1].salida.simulado, true);
  const sinE = flujo([['d', 'manual'], ['h', 'http', { url: 'https://mal' }]], ['d>h']); r = await run(sinE, { acciones }); assert.strictEqual(r.estado, 'error'); assert(/HTTP 500/.test(r.error));
  r = await run(sinE, {}); assert(/no está disponible/.test(r.error)); r = await run(sinE, { faltante: 'omitir' }); assert.strictEqual(r.estado, 'ok');
});
t('simulacion tolera datos ausentes de acciones externas', async () => {
  const f = flujo([['d', 'manual'], ['h', 'http', { url: 'https://x' }], ['j', 'json', { modo: 'extraer', fuente: '{{ultimo.cuerpo}}', ruta: 'a.b' }], ['p', 'plantilla', { texto: 'ok' }]], ['d>h', 'h>j', 'j>p']);
  let r = await run(f, { simulacion: true }); assert.strictEqual(r.estado, 'ok'); assert.strictEqual(r.pasos[2].estado, 'simulado');
  r = await run(f, { acciones: { http: async () => ({ cuerpo: {} }) } }); assert.strictEqual(r.estado, 'error');
});
t('almacen conserva tipos con evaluar', () => { assert.strictEqual(M.evaluar('{{entrada.v}}', { entrada: { v: 200 } }), 200); });
t('esperas, abortar y depuracion paso a paso', async () => {
  const esperas = []; const f = flujo([['d', 'manual'], ['w', 'espera', { valor: 2, unidad: 's' }], ['p', 'plantilla', { texto: 'x' }]], ['d>w', 'w>p']);
  let r = await run(f, { esperar: async (ms) => esperas.push(ms) }); assert.deepStrictEqual(esperas, [2000]); assert.strictEqual(r.estado, 'ok');
  r = await run(f, { simulacion: true, esperar: async () => { throw new Error('no debe esperar'); } }); assert.strictEqual(r.pasos[1].estado, 'simulado');
  const vistos = []; await run(f, { esperar: async () => 0, puerta: async (p, ctx) => { vistos.push(p.nodo + ':' + Object.keys(ctx.vars).length); } }); assert.deepStrictEqual(vistos, ['d:0', 'w:0', 'p:0']);
  const senal = { abortado: false }; r = await run(f, { senal, esperar: async () => { senal.abortado = true; } }); assert.strictEqual(r.estado, 'detenida');
});
t('secretos se redactan en el registro', async () => {
  const f = flujo([['d', 'manual'], ['h', 'http', { url: 'https://x', cabeceras: 'Bearer {{secreto.TOK}}' }]], ['d>h']);
  const r = await run(f, { secretos: { TOK: 'supersecreto123' }, acciones: { http: async (c) => ({ eco: c.cabeceras }) } });
  assert(!JSON.stringify(r).includes('supersecreto123')); assert(JSON.stringify(r).includes('Bearer ***'));
});
t('dominios permitidos', () => {
  assert(M.hostPermitido('https://api.ejemplo.com/x', ['ejemplo.com'])); assert(M.hostPermitido('https://ejemplo.com', ['*.ejemplo.com']));
  assert(!M.hostPermitido('https://malejemplo.com', ['ejemplo.com'])); assert(!M.hostPermitido('javascript:alert(1)', ['ejemplo.com'])); assert(!M.hostPermitido('file:///etc/passwd', ['etc']));
  assert(!M.hostPermitido('https://x.com', []));
});
t('catalogo coherente', () => {
  Object.keys(Cat.TIPOS).forEach(k => { const d = Cat.TIPOS[k]; assert(d.nombre && d.icono && d.salidas.length && ['disparador', 'accion', 'logica'].includes(d.categoria), k); d.campos.forEach(c => assert(c.id && c.etq && c.tipo, k)); });
  assert(Object.keys(Cat.TIPOS).length >= 25);
});
/* nube */
t('yaml y cron de nube', () => {
  const f = flujo([['d', 'hora_dia', { hora: '09:30', dias: '1,5' }], ['i', 'ia', { proveedor: 'openai', prompt: '{{secreto.OTRA}}' }]], ['d>i']);
  const y = Nube.yaml(f, { offsetMin: 300 });   // UTC-5: 09:30 local = 14:30 UTC
  assert(y.includes("cron: '30 14 * * 1,5'"), y); assert(y.includes('OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}')); assert(y.includes('OTRA: ${{ secrets.OTRA }}')); assert(y.includes('workflow_dispatch'));
  assert.deepStrictEqual(Nube.horaUTC('23:00', 300), { min: 0, hor: 4, corte: 1 });
  assert.strictEqual(Nube.cronNube(flujo([['d', 'temporizador', { modo: 'cada', valor: 1, unidad: 'min' }]], []), {}).crons[0], '*/5 * * * *');
  assert.strictEqual(Nube.cronNube(flujo([['d', 'temporizador', { modo: 'cada', valor: 2, unidad: 'h' }]], []), {}).crons[0], '0 */2 * * *');
  assert.strictEqual(Nube.cronNube(flujo([['d', 'temporizador', { modo: 'cron', cron: '0 9 * * 1-5' }]], []), {}).crons[0], '0 9 * * 1-5');
});
t('ejecutor de nube corre de verdad (Node)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-')); let recibido = null;
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { recibido = { url: req.url, auth: req.headers.authorization, b }; res.setHeader('content-type', 'application/json'); res.end('{"precio":42}'); }); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
  const f = flujo([['d', 'temporizador', { modo: 'cada', valor: 5, unidad: 'min' }], ['h', 'http', { url: 'http://127.0.0.1:' + port + '/p', cabeceras: '{"Authorization":"Bearer {{secreto.TOK}}"}' }], ['j', 'json', { modo: 'extraer', fuente: '{{ultimo.cuerpo}}', ruta: 'precio', guardarEn: 'pr' }], ['c', 'condicion', { reglas: [{ izq: '{{pr}}', op: 'gt', der: '40' }] }], ['n', 'notificacion', { titulo: 'T', texto: 'precio {{pr}}' }], ['v', 'voz', { texto: 'hola' }]], ['d>h', 'h>j', 'j>c', 'c.si>n', 'n>v']);
  f.nombre = 'Prueba nube';
  const paq = Nube.paquete(f, { dominios: ['127.0.0.1'], motorTexto: fs.readFileSync(path.join(__dirname, '../js/motor.js'), 'utf8'), catalogoTexto: fs.readFileSync(path.join(__dirname, '../js/catalogo.js'), 'utf8') });
  paq.forEach(p => { const fp = path.join(dir, p.nombre); fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, p.texto); });
  assert(!paq[1].texto.includes('TOKSECRETO')); assert.deepStrictEqual(JSON.parse(paq[1].texto)._secretos, ['TOK']);
  const ej = path.join(dir, '.github/automatizaciones/prueba-nube/ejecutar.cjs');
  const out = await new Promise(ok => cp.execFile('node', [ej], { env: Object.assign({}, process.env, { TOK: 'TOKSECRETO' }) }, (e, so, se) => ok({ code: e ? e.code : 0, so, se })));
  srv.close(); assert.strictEqual(out.code, 0, out.se + out.so);
  assert.strictEqual(recibido.auth, 'Bearer TOKSECRETO'); assert(/NOTIFICACION: T - precio 42/.test(out.so), out.so); assert(/Voz|voz/.test(out.so) && /omitido/.test(out.so)); assert(!out.so.includes('TOKSECRETO'));
  /* dominio no permitido */
  const fl = JSON.parse(paq[1].texto); fl._dominios = ['otro.com']; fs.writeFileSync(path.join(dir, '.github/automatizaciones/prueba-nube/flujo.json'), JSON.stringify(fl));
  const out2 = await new Promise(ok => cp.execFile('node', [ej], (e, so, se) => ok({ code: e ? e.code : 0, so, se }))); assert.strictEqual(out2.code, 1); assert(/Dominio no permitido/.test(out2.so));
});
(async () => {
  for (const [nombre, fn] of T) { try { await fn(); n++; console.log('ok  ' + nombre); } catch (e) { console.error('FALLA ' + nombre + '\n  ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } }
  console.log(n + '/' + T.length + ' pruebas');
})();
