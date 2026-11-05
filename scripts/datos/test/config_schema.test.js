'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const { S, validar } = require('../lib/schema');
const { validarConfig } = require('../lib/config-validar');
const { validarArchivo } = require('../lib/contrato');

const copia = (o) => JSON.parse(JSON.stringify(o));
const cfg = require('../config.json');
const cfgOff = require('../fixtures/config.offline.json');

test('config.json y config.offline.json son validas', () => {
  assert.deepEqual(validarConfig(cfg), []);
  assert.deepEqual(validarConfig(cfgOff), []);
  assert.ok(cfg.noticias.fuentes.length >= 30);
});

test('config: mensajes claros con ruta, tipo y valores validos', () => {
  const c = copia(cfg);
  c.cripto.top = 999;
  c.cripto.topp = 1;
  c.noticias.fuentes[0].categoria = 'musica';
  c.noticias.fuentes[1].id = c.noticias.fuentes[2].id;
  c.divisas.monedas = ['eur'];
  c.ofertas.fuentes[0].url = 'no-es-url';
  c.http.timeoutMs = 'rapido';
  const e = validarConfig(c).join('\n');
  assert.match(e, /config\.cripto\.top: debe ser <= 250 \(es 999\)/);
  assert.match(e, /config\.cripto: campo desconocido "topp" \(campos validos: activo, top/);
  assert.match(e, /config\.noticias\.fuentes\[0\]\.categoria: debe ser uno de: cripto, bolsa/);
  assert.match(e, /repite id/);
  assert.match(e, /config\.divisas\.monedas\[0\]: formato invalido "eur" \(codigo de 3 letras mayusculas/);
  assert.match(e, /config\.ofertas\.fuentes\[0\]\.url: no es una URL valida/);
  assert.match(e, /config\.http\.timeoutMs: debe ser un numero finito/);
});

test('config: reglas semanticas (tipo sin url, regex invalida, hist.top, simbolos desconocidos)', () => {
  const c = copia(cfg);
  c.ofertas.fuentes.push({ id: 'x1', tipo: 'jsonld', nombre: 'X' });
  c.ofertas.fuentes.push({ id: 'x2', tipo: 'sitemap', nombre: 'Y', url: 'https://a.example/s.xml', incluye: '([' });
  c.cripto.top = 10;
  c.cripto.hist.top = 20;
  c.acciones.hist.simbolos = ['NOEXISTE'];
  const e = validarConfig(c).join('\n');
  assert.match(e, /requiere "urls"/);
  assert.match(e, /expresion regular invalida/);
  assert.match(e, /hist\.top no puede ser mayor/);
  assert.match(e, /"NOEXISTE" no esta en acciones/);
});

test('config: la validacion del CLI sale con codigo 2 y explica el error', () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-')), 'c.json');
  const c = copia(cfg); c.cripto.top = 0;
  fs.writeFileSync(tmp, JSON.stringify(c));
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'ejecutar.js'), 'rapidos', '--config', tmp, '--validar-config'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Configuracion invalida/);
  assert.match(r.stderr, /config\.cripto\.top/);
  const ok = spawnSync(process.execPath, [path.join(__dirname, '..', 'ejecutar.js'), '--validar-config'], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
});

test('schema: tipos basicos, nulos, tupla, mapa, unico, extras', () => {
  const e = S.obj({ a: S.num({ min: 1 }), b: S.cad({ enum: ['x', 'y'] }) }, { c: S.nulo(S.num()), d: S.arr(S.tupla([S.num(), S.cad()])) }, { extra: false });
  assert.deepEqual(validar({ a: 2, b: 'x', c: null, d: [[1, 'a']] }, e), []);
  const errs = validar({ a: 0, b: 'z', c: 'no', d: [[1]], extra: 1 }, e);
  assert.equal(errs.length, 6);
  assert.deepEqual(validar({ b: 'x' }, e), ['$: falta el campo obligatorio "a"']);
  assert.match(validar({ a: NaN, b: 'x' }, e)[0], /numero finito/);
  assert.deepEqual(validar([{ id: 1 }, { id: 1 }], S.arr(S.cualquiera(), { unico: 'id' })).length, 1);
  assert.equal(validar({ A1: 1 }, S.mapa(S.num(), { clave: /^[A-Z]{3}$/ })).length, 1);
  assert.equal(validar('2026-11-05T12:00:00Z', S.iso()).length, 0);
  assert.equal(validar('ayer', S.iso()).length, 1);
});

test('contrato: rechaza JSON que no cumple (tipos, rangos, campos, rutas sin esquema)', () => {
  const ok = { generado: '2026-11-05T12:00:00.000Z', fuente: 'x', items: [{ id: 'bitcoin', simbolo: 'BTC', nombre: 'Bitcoin', precio: 1, cambio1h: null, cambio24h: 1, cambio7d: 2, capitalizacion: 3, volumen24h: 4, sparkline7d: [1, 2] }] };
  assert.deepEqual(validarArchivo('mercados/cripto.json', ok), []);
  const mal = copia(ok); mal.items[0].precio = '1'; delete mal.items[0].sparkline7d; mal.generado = 'ayer';
  const e = validarArchivo('mercados/cripto.json', mal).join('\n');
  assert.match(e, /precio: debe ser un numero/);
  assert.match(e, /falta el campo obligatorio "sparkline7d"/);
  assert.match(e, /generado: debe ser fecha ISO/);
  assert.match(validarArchivo('otra/cosa.json', {})[0], /no existe un esquema/);
  assert.match(validarArchivo('mercados/noticias.json', { generado: '2026-11-05T12:00:00.000Z', items: [{ id: '1', titulo: 't', resumen: '', enlace: 'x', fuente: 'f', fecha: '2026-11-05T12:00:00.000Z', categoria: 'otra', tickers: [], sentimiento: 2 }] }).join('\n'), /categoria: debe ser uno de[\s\S]*sentimiento: debe ser <= 1/);
  assert.deepEqual(validarArchivo('mercados/cripto_hist/bitcoin.json', { id: 'bitcoin', generado: '2026-11-05T12:00:00.000Z', velas: [[1, 2, 3, 4, 5, null]] }), []);
  assert.ok(validarArchivo('mercados/cripto_hist/bitcoin.json', { id: 'bitcoin', generado: '2026-11-05T12:00:00.000Z', velas: [[1, 2, 3]] }).length);
});
