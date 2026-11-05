'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { crearContexto, ejecutarTareas, leerJson } = require('../lib/runner');
const { validarArchivo } = require('../lib/contrato');
const { validarConfig } = require('../lib/config-validar');
const fx = require('../fixtures/router');
const cfgOff = require('../fixtures/config.offline.json');

const copia = (o) => JSON.parse(JSON.stringify(o));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'datos-test-'));
function ctxDe({ config = cfgOff, env = fx.ENV_OFFLINE, salida = tmp(), ahora = fx.AHORA, fetchImpl = fx.crearFetch() } = {}) {
  return crearContexto({ config, env, salida, ahora, fetchImpl, esperar: async () => {} });
}
function archivosJson(dir, rel = '') {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? archivosJson(dir, path.join(rel, d.name)) : d.name.endsWith('.json') ? [path.join(rel, d.name)] : []));
}
const estadoDe = (r, id) => r.estado.fuentes[id];

test('pipeline offline completo: todos los JSON cumplen el contrato y las fuentes quedan ok', async () => {
  const ctx = ctxDe();
  const r = await ejecutarTareas(ctx, ['rapidos', 'lentos']);
  const fallidas = r.resumen.filter((x) => !x.ok);
  assert.deepEqual(fallidas, []);
  const archivos = archivosJson(ctx.salida);
  for (const esperado of ['estado.json', 'mercados/cripto.json', 'mercados/cripto_hist/bitcoin.json', 'mercados/acciones.json', 'mercados/acciones_hist/AAPL.json', 'mercados/divisas.json', 'mercados/nft.json', 'mercados/noticias.json', 'apuestas/cuotas.json', 'ofertas/ofertas.json', 'ofertas/historial.json']) {
    assert.ok(archivos.includes(esperado), 'falta ' + esperado);
  }
  for (const a of archivos) assert.deepEqual(validarArchivo(a.split(path.sep).join('/'), leerJson(path.join(ctx.salida, a))), [], a);
  assert.ok(fs.existsSync(path.join(ctx.salida, 'LEEME.txt')));
  const est = leerJson(path.join(ctx.salida, 'estado.json'));
  for (const id of ['cripto', 'cripto_hist', 'divisas', 'acciones', 'acciones_hist', 'nft', 'cuotas', 'noticias', 'ofertas']) assert.equal(est.fuentes[id].ok, true, id);
  assert.equal(est.fuentes.noticias.detalle.fuentesFallidas, 3);
  assert.equal(ctx.http.stats.peticiones > 30, true);
});

test('pipeline: respeta robots.txt y la lista de bloqueo (nunca pide esas paginas)', async () => {
  const f = fx.crearFetch();
  const ctx = ctxDe({ fetchImpl: f });
  await ejecutarTareas(ctx, ['rapidos'], { solo: ['divisas'] });
  const r = await ejecutarTareas(ctx, ['lentos'], { solo: ['ofertas'] });
  const urls = f.registro.map((x) => x.url);
  assert.ok(!urls.some((u) => /amazon\./.test(u)), 'no debe tocar Amazon');
  assert.ok(!urls.some((u) => u.includes('/privado/')), 'no debe tocar /privado/ (robots)');
  assert.ok(urls.includes('https://tienda.example/robots.txt'));
  assert.ok(urls.includes('https://tienda.example/producto/ssd-2tb'));
  assert.deepEqual(f.noMapeadas, []);
  const det = estadoDe(r, 'ofertas').detalle;
  assert.ok(det.omitidas.robots_txt.length >= 1);
  assert.ok(det.omitidas.dominio_bloqueado.length >= 1);
  const of = leerJson(path.join(ctx.salida, 'ofertas/ofertas.json'));
  assert.ok(of.items.every((o) => o.precio > 0 && o.url.startsWith('http')));
  assert.equal(of.items.filter((o) => o.url === 'https://tienda.example/producto/ssd-2tb').length, 1, 'duplicados fusionados');
  const eur = of.items.find((o) => o.moneda === 'EUR');
  assert.equal(eur.precioUsd, Math.round((eur.precio / 0.8651) * 100) / 100, 'normalizacion a USD con la tasa del BCE');
});

test('pipeline: busqueda sin clave se omite con aviso; con clave se usa Brave', async () => {
  const sinClave = ctxDe({ env: {} });
  const r1 = await ejecutarTareas(sinClave, ['lentos'], { solo: ['ofertas'] });
  assert.match(estadoDe(r1, 'ofertas').detalle.fallos.busqueda, /sin_clave/);
  const f = fx.crearFetch();
  await ejecutarTareas(ctxDe({ fetchImpl: f }), ['lentos'], { solo: ['ofertas'] });
  const brave = f.registro.find((x) => x.url.includes('api.search.brave.com'));
  assert.ok(brave);
  assert.equal(brave.headers['X-Subscription-Token'], 'test-brave');
});

test('pipeline: CoinGecko caido -> usa Binance de respaldo y lo refleja en la fuente', async () => {
  const f = fx.crearFetch();
  f.agregar(/api\.coingecko\.com\/api\/v3\/coins\/markets/, () => ({ status: 500, cuerpo: 'boom' }));
  const ctx = ctxDe({ fetchImpl: f });
  const r = await ejecutarTareas(ctx, ['rapidos'], { solo: ['cripto'] });
  assert.equal(estadoDe(r, 'cripto').ok, true);
  assert.match(estadoDe(r, 'cripto').detalle.fallosProveedor[0], /coingecko: HTTP 500/);
  assert.equal(leerJson(path.join(ctx.salida, 'mercados/cripto.json')).fuente, 'Binance (respaldo)');
});

test('pipeline: si todo falla se conservan los ultimos datos buenos y estado.json marca el error', async () => {
  const salida = tmp();
  await ejecutarTareas(ctxDe({ salida }), ['rapidos', 'lentos']);
  const antes = fs.readFileSync(path.join(salida, 'mercados/cripto.json'), 'utf8');
  const ultimoAntes = leerJson(path.join(salida, 'estado.json')).fuentes.cripto.ultimo;
  const f = fx.crearFetch();
  for (const re of [/coingecko/, /binance/, /coincap/, /frankfurter/, /er-api/, /feeds\.example/]) f.agregar(re, () => ({ status: 503, cuerpo: 'x' }));
  const ahora2 = new Date(fx.AHORA.getTime() + 600000);
  const r = await ejecutarTareas(ctxDe({ salida, fetchImpl: f, ahora: ahora2 }), ['rapidos', 'lentos']);
  assert.equal(fs.readFileSync(path.join(salida, 'mercados/cripto.json'), 'utf8'), antes);
  for (const id of ['cripto', 'divisas', 'noticias']) {
    const e = estadoDe(r, id);
    assert.equal(e.ok, false, id);
    assert.ok(e.error.length > 5);
  }
  assert.equal(estadoDe(r, 'cripto').ultimo, ultimoAntes);
  assert.equal(estadoDe(r, 'cripto').items, 8);
  assert.equal(estadoDe(r, 'acciones').ok, true, 'las demas fuentes siguen funcionando');
  assert.equal(estadoDe(r, 'cuotas').ok, true);
  assert.deepEqual(validarArchivo('estado.json', leerJson(path.join(salida, 'estado.json'))), []);
});

test('runner: salida que viola el contrato no se publica; error y timeout quedan aislados', async () => {
  const salida = tmp();
  const cfg = { ...copia(cfgOff), tiempoMaximoPorFuenteMs: 60 };
  const ctx = ctxDe({ salida, config: cfg });
  const malo = { id: 'malo', grupo: 'rapidos', activo: () => true, ejecutar: async () => ({ items: 1, archivos: { 'mercados/divisas.json': { generado: 'x', fuente: 'f', base: 'USD', tasas: { EUR: 'no' }, hist: {} } } }) };
  const lento = { id: 'lento', grupo: 'rapidos', activo: () => true, ejecutar: () => new Promise(() => {}) };
  const roto = { id: 'roto', grupo: 'rapidos', activo: () => true, ejecutar: async () => { throw new Error('boom ?apikey=SECRETO'); } };
  const bueno = { id: 'bueno', grupo: 'rapidos', activo: () => true, ejecutar: async () => ({ items: 2, archivos: {} }) };
  const inactivo = { id: 'inactivo', grupo: 'rapidos', activo: () => false, ejecutar: async () => { throw new Error('no deberia ejecutarse'); } };
  const lentos = { id: 'otro_grupo', grupo: 'lentos', activo: () => true, ejecutar: async () => { throw new Error('no deberia ejecutarse'); } };
  const r = await ejecutarTareas(ctx, ['rapidos'], { tareas: [malo, lento, roto, bueno, inactivo, lentos] });
  assert.equal(estadoDe(r, 'malo').ok, false);
  assert.match(estadoDe(r, 'malo').error, /no cumple el contrato/);
  assert.ok(!fs.existsSync(path.join(salida, 'mercados/divisas.json')));
  assert.match(estadoDe(r, 'lento').error, /tiempo maximo/);
  assert.equal(estadoDe(r, 'roto').error.includes('SECRETO'), false);
  assert.equal(estadoDe(r, 'bueno').ok, true);
  assert.equal(r.estado.fuentes.inactivo, undefined);
  assert.equal(r.estado.fuentes.otro_grupo, undefined);
});

test('acciones: proveedor por clave disponible (Twelve Data en lote, Alpha Vantage con rotacion) y sin clave', async () => {
  const td = ctxDe({ env: { TWELVEDATA_KEY: 'k' } });
  const r1 = await ejecutarTareas(td, ['rapidos'], { solo: ['acciones'] });
  assert.equal(estadoDe(r1, 'acciones').detalle.proveedor, 'twelvedata');
  const ac = leerJson(path.join(td.salida, 'mercados/acciones.json'));
  assert.equal(ac.fuente, 'Twelve Data');
  assert.deepEqual(ac.items.map((i) => i.simbolo), ['AAPL', 'MSFT']);
  assert.match(estadoDe(r1, 'acciones').detalle.errores[0], /ZZZZ/);

  const salida = tmp();
  const f = fx.crearFetch();
  const r2 = await ejecutarTareas(ctxDe({ salida, env: { ALPHAVANTAGE_KEY: 'k' }, fetchImpl: f }), ['rapidos'], { solo: ['acciones'] });
  assert.equal(estadoDe(r2, 'acciones').detalle.proveedor, 'alphavantage');
  assert.equal(f.registro.filter((x) => x.url.includes('GLOBAL_QUOTE')).length, 2, 'porEjecucion=2 simbolos');
  const r3 = await ejecutarTareas(ctxDe({ salida, env: { ALPHAVANTAGE_KEY: 'k' }, fetchImpl: f, ahora: new Date(fx.AHORA.getTime() + 60000) }), ['rapidos'], { solo: ['acciones'] });
  const ac2 = leerJson(path.join(salida, 'mercados/acciones.json'));
  assert.equal(ac2.items.length + ac2.indices.length >= 3, true, 'la rotacion cubre otros simbolos y conserva los anteriores');
  assert.equal(estadoDe(r3, 'acciones').ok, true);

  const r4 = await ejecutarTareas(ctxDe({ env: {} }), ['rapidos'], { solo: ['acciones'] });
  assert.equal(estadoDe(r4, 'acciones').ok, false);
  assert.match(estadoDe(r4, 'acciones').error, /sin_clave/);
});

test('acciones: Alpha Vantage con limite de tasa falla con mensaje claro', async () => {
  const f = fx.crearFetch();
  f.agregar(/alphavantage\.co\/query\?function=GLOBAL_QUOTE/, () => ({ cuerpo: fs.readFileSync(path.join(__dirname, '../fixtures/api/alphavantage_limite.json'), 'utf8'), tipo: 'application/json' }));
  const r = await ejecutarTareas(ctxDe({ env: { ALPHAVANTAGE_KEY: 'k' }, fetchImpl: f }), ['rapidos'], { solo: ['acciones'] });
  assert.equal(estadoDe(r, 'acciones').ok, false);
  assert.match(estadoDe(r, 'acciones').error, /limite de tasa/);
  assert.equal(f.registro.filter((x) => x.url.includes('GLOBAL_QUOTE')).length, 1, 'se detiene tras el limite');
});

test('cuotas: sin clave falla; llama solo a deportes en temporada; rota segun antiguedad; protege la cuota', async () => {
  const sin = await ejecutarTareas(ctxDe({ env: {} }), ['rapidos'], { solo: ['cuotas'] });
  assert.match(estadoDe(sin, 'cuotas').error, /ODDS_API_KEY/);

  const salida = tmp();
  const f = fx.crearFetch();
  const llamadas = () => f.registro.filter((x) => /\/odds\/\?/.test(x.url)).map((x) => /sports\/([a-z_]+)\/odds/.exec(x.url)[1]);
  const t0 = fx.AHORA.getTime();
  await ejecutarTareas(ctxDe({ salida, fetchImpl: f }), ['rapidos'], { solo: ['cuotas'] });
  assert.deepEqual(llamadas(), ['soccer_epl', 'soccer_spain_la_liga']);
  await ejecutarTareas(ctxDe({ salida, fetchImpl: f, ahora: new Date(t0 + 3600000) }), ['rapidos'], { solo: ['cuotas'] });
  assert.deepEqual(llamadas().slice(2), ['basketball_nba'], 'una hora despues solo consulta el que nunca se habia consultado');
  await ejecutarTareas(ctxDe({ salida, fetchImpl: f, ahora: new Date(t0 + 5 * 3600000) }), ['rapidos'], { solo: ['cuotas'] });
  assert.deepEqual(llamadas().slice(3), ['soccer_epl', 'soccer_spain_la_liga'], 'los mas antiguos primero; NFL fuera de temporada nunca');
  assert.ok(!llamadas().includes('americanfootball_nfl'));
  const cu = leerJson(path.join(salida, 'apuestas/cuotas.json'));
  assert.deepEqual(cu.deportes.map((d) => d.clave), ['soccer_epl', 'soccer_spain_la_liga', 'basketball_nba']);

  const f2 = fx.crearFetch();
  f2.agregar(/\/odds\//, () => ({ cuerpo: fs.readFileSync(path.join(__dirname, '../fixtures/api/odds_events.json'), 'utf8'), tipo: 'application/json', headers: { 'x-requests-remaining': '10', 'x-requests-used': '490' } }));
  const r = await ejecutarTareas(ctxDe({ fetchImpl: f2 }), ['rapidos'], { solo: ['cuotas'] });
  assert.equal(f2.registro.filter((x) => /\/odds\//.test(x.url)).length, 1, 'reservaCreditos detiene las llamadas');
  assert.match(estadoDe(r, 'cuotas').detalle.errores[0], /reservaCreditos/);
});

test('nft: con RESERVOIR_KEY usa Reservoir; sin clave usa CoinGecko NFT y conserva anteriores', async () => {
  const a = ctxDe({ env: { RESERVOIR_KEY: 'k' } });
  await ejecutarTareas(a, ['lentos'], { solo: ['nft'] });
  assert.equal(leerJson(path.join(a.salida, 'mercados/nft.json')).fuente, 'Reservoir');
  const salida = tmp();
  await ejecutarTareas(ctxDe({ salida, env: {} }), ['lentos'], { solo: ['nft'] });
  assert.equal(leerJson(path.join(salida, 'mercados/nft.json')).colecciones.length, 3);
  const f = fx.crearFetch();
  f.agregar(/coingecko\.com\/api\/v3\/nfts\/azuki/, () => ({ status: 404, cuerpo: 'no' }));
  const r = await ejecutarTareas(ctxDe({ salida, env: {}, fetchImpl: f, ahora: new Date(fx.AHORA.getTime() + 3600000) }), ['lentos'], { solo: ['nft'] });
  assert.equal(estadoDe(r, 'nft').ok, true);
  assert.equal(leerJson(path.join(salida, 'mercados/nft.json')).colecciones.length, 3, 'azuki conserva su ultimo dato bueno');
  // Reservoir caido -> respaldo
  const f3 = fx.crearFetch();
  f3.agregar(/reservoir/, () => ({ status: 500, cuerpo: 'x' }));
  const r3 = await ejecutarTareas(ctxDe({ env: { RESERVOIR_KEY: 'k' }, fetchImpl: f3 }), ['lentos'], { solo: ['nft'] });
  assert.equal(estadoDe(r3, 'nft').ok, true);
  assert.match(estadoDe(r3, 'nft').detalle.fallos[0], /reservoir/);
});

test('historicos: respetan maxPorEjecucion y cadaHoras; cripto fuera de Binance usa CoinGecko', async () => {
  const cfg = copia(cfgOff);
  cfg.cripto.hist.maxPorEjecucion = 3;
  const salida = tmp();
  const f = fx.crearFetch();
  const run = (ms) => ejecutarTareas(ctxDe({ salida, config: cfg, fetchImpl: f, ahora: new Date(fx.AHORA.getTime() + ms) }), ['rapidos', 'lentos'], { solo: ['cripto', 'cripto_hist'] });
  const n = () => fs.readdirSync(path.join(salida, 'mercados/cripto_hist')).length;
  await run(0); assert.equal(n(), 3);
  await run(60000); assert.equal(n(), 6);
  await run(120000); assert.equal(n(), 8);
  const antes = f.registro.length;
  await run(180000);
  assert.equal(f.registro.filter((x, i) => i >= antes && /klines|ohlc/.test(x.url)).length, 0, 'todo reciente: no pide nada');
  const xyz = leerJson(path.join(salida, 'mercados/cripto_hist/xyz-token.json'));
  assert.equal(xyz.fuente, 'CoinGecko');
  assert.equal(leerJson(path.join(salida, 'mercados/cripto_hist/bitcoin.json')).fuente, 'Binance');
});

test('divisas: monedas fuera del BCE se completan con open.er-api y acumulan historico diario', async () => {
  const salida = tmp();
  await ejecutarTareas(ctxDe({ salida }), ['rapidos'], { solo: ['divisas'] });
  const d1 = leerJson(path.join(salida, 'mercados/divisas.json'));
  assert.equal(d1.tasas.COP, 3890.5);
  assert.deepEqual(d1.hist.COP, [['2026-11-05', 3890.5]]);
  assert.equal(d1.hist.EUR.length, 4);
  await ejecutarTareas(ctxDe({ salida, ahora: new Date(fx.AHORA.getTime() + 86400000) }), ['rapidos'], { solo: ['divisas'] });
  assert.equal(leerJson(path.join(salida, 'mercados/divisas.json')).hist.COP.length, 2);
  // Frankfurter caido: todo desde er-api
  const f = fx.crearFetch();
  f.agregar(/frankfurter/, () => ({ status: 500, cuerpo: 'x' }));
  const r = await ejecutarTareas(ctxDe({ fetchImpl: f }), ['rapidos'], { solo: ['divisas'] });
  assert.equal(estadoDe(r, 'divisas').ok, true);
  assert.ok(estadoDe(r, 'divisas').detalle.frankfurter);
});

test('noticias: dedupe entre ejecuciones, caducidad y conservacion si todos los feeds fallan', async () => {
  const salida = tmp();
  await ejecutarTareas(ctxDe({ salida }), ['lentos'], { solo: ['noticias'] });
  const n1 = leerJson(path.join(salida, 'mercados/noticias.json')).items;
  await ejecutarTareas(ctxDe({ salida, ahora: new Date(fx.AHORA.getTime() + 1800000) }), ['lentos'], { solo: ['noticias'] });
  assert.equal(leerJson(path.join(salida, 'mercados/noticias.json')).items.length, n1.length);
  const f = fx.crearFetch();
  f.agregar(/feeds\.example/, () => ({ status: 500, cuerpo: 'x' }));
  const r = await ejecutarTareas(ctxDe({ salida, fetchImpl: f, ahora: new Date(fx.AHORA.getTime() + 3600000) }), ['lentos'], { solo: ['noticias'] });
  assert.equal(estadoDe(r, 'noticias').ok, false);
  assert.equal(leerJson(path.join(salida, 'mercados/noticias.json')).items.length, n1.length);
  assert.deepEqual(n1.map((n) => n.categoria).filter((c, i, a) => a.indexOf(c) === i).sort(), ['bolsa', 'cripto', 'deportes', 'general']);
});

test('CLI --offline: ejecuta todo el pipeline y sale con codigo 0', () => {
  const salida = tmp();
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'ejecutar.js'), 'todos', '--offline', '--salida', salida], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK\s+cripto\s/);
  assert.doesNotMatch(r.stdout, /ERROR/);
  assert.ok(fs.existsSync(path.join(salida, 'estado.json')));
  const mal = spawnSync(process.execPath, [path.join(__dirname, '..', 'ejecutar.js'), 'nada', '--offline'], { encoding: 'utf8' });
  assert.equal(mal.status, 2);
});

test('config offline sigue siendo valida', () => assert.deepEqual(validarConfig(cfgOff), []));
