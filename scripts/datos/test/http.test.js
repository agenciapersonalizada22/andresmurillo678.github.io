'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearHttp } = require('../lib/http');

function montar(respuestas, opts = {}) {
  const llamadas = [], esperas = [];
  let t = 1000;
  const fetchImpl = async (url, init) => {
    llamadas.push({ url, init });
    const r = respuestas.shift();
    if (r instanceof Error) throw r;
    if (typeof r === 'function') return r(init);
    return r;
  };
  const http = crearHttp({ fetchImpl, esperar: async (ms) => { esperas.push(ms); t += ms; }, ahora: () => t, ua: 'test-bot/1.0 (+https://x)', backoffMs: 100, msPorDominio: 500, ...opts });
  return { http, llamadas, esperas };
}
const R = (cuerpo, status = 200, headers = {}) => new Response(cuerpo, { status, headers });

test('http: envia User-Agent identificable y devuelve texto', async () => {
  const { http, llamadas } = montar([R('hola')]);
  const r = await http.pedir('https://a.example/x');
  assert.equal(r.texto, 'hola');
  assert.equal(llamadas[0].init.headers['User-Agent'], 'test-bot/1.0 (+https://x)');
});

test('http: reintenta 503/429/red con backoff exponencial y termina bien', async () => {
  const { http, llamadas, esperas } = montar([R('', 503), new TypeError('fetch failed'), R('', 429, { 'retry-after': '2' }), R('{"ok":1}')], { reintentos: 3 });
  const j = await http.json('https://a.example/x');
  assert.deepEqual(j, { ok: 1 });
  assert.equal(llamadas.length, 4);
  assert.equal(http.stats.reintentos, 3);
  assert.ok(esperas.some((e) => e >= 2000), 'respeta Retry-After');
});

test('http: agota reintentos y falla con mensaje sin secretos', async () => {
  const { http, llamadas } = montar([R('', 500), R('', 500), R('', 500)], { reintentos: 2 });
  await assert.rejects(http.pedir('https://a.example/x?apikey=SECRETO&q=1'), (e) => { assert.match(e.message, /HTTP 500/); assert.ok(!e.message.includes('SECRETO')); return true; });
  assert.equal(llamadas.length, 3);
});

test('http: 404 y 401 no se reintentan; estadosOk los acepta', async () => {
  const a = montar([R('', 404)], { reintentos: 3 });
  await assert.rejects(a.http.pedir('https://a.example/x'), /HTTP 404/);
  assert.equal(a.llamadas.length, 1);
  const b = montar([R('no', 404)]);
  assert.equal((await b.http.pedir('https://a.example/x', { estadosOk: [404] })).status, 404);
});

test('http: JSON invalido y respuesta demasiado grande', async () => {
  await assert.rejects(montar([R('<html>')]).http.json('https://a.example/x'), /JSON invalido/);
  await assert.rejects(montar([R('x'.repeat(100))]).http.pedir('https://a.example/x', { limiteBytes: 10 }), /demasiado grande/);
  await assert.rejects(montar([R('x', 200, { 'content-length': '999999' })]).http.pedir('https://a.example/x', { limiteBytes: 10 }), /demasiado grande/);
});

test('http: timeout aborta la peticion (y se reintenta)', async () => {
  const lento = (init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('abort'), { name: 'AbortError' }))));
  const { http, llamadas } = montar([lento, R('ok')], { reintentos: 1 });
  const r = await http.pedir('https://a.example/x', { timeoutMs: 20 });
  assert.equal(r.texto, 'ok');
  assert.equal(llamadas.length, 2);
  await assert.rejects(montar([lento], { reintentos: 0 }).http.pedir('https://a.example/x', { timeoutMs: 20 }), /tiempo de espera agotado/);
});

test('http: limite de tasa por dominio (no entre dominios distintos)', async () => {
  const { http, esperas } = montar([R('1'), R('2'), R('3'), R('4'), R('5')], { retrasosPorDominio: { 'lenta.example': 2000 } });
  await http.pedir('https://a.example/1');
  await http.pedir('https://a.example/2');
  assert.deepEqual(esperas, [500]);
  await http.pedir('https://b.example/1');
  assert.deepEqual(esperas, [500]);
  await http.pedir('https://lenta.example/1');
  await http.pedir('https://lenta.example/2');
  assert.deepEqual(esperas, [500, 2000]);
});

test('http: peticiones concurrentes al mismo dominio se escalonan (reloj real)', async () => {
  const f = async () => R('x');
  const http = crearHttp({ fetchImpl: f, msPorDominio: 40 });
  const t0 = Date.now();
  await Promise.all([http.pedir('https://a.example/1'), http.pedir('https://a.example/2'), http.pedir('https://a.example/3')]);
  assert.ok(Date.now() - t0 >= 75, 'tardo ' + (Date.now() - t0));
});
