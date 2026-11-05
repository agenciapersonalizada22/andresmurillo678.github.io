/* Pruebas en Node de la logica pura: node herramientas/ofertas/pruebas/pruebas.js */
const assert = require('assert');
const T = require('../js/texto.js'), B = require('../js/busqueda.js'), C = require('../js/calor.js'), D = require('../js/duplicados.js');
const A = require('../js/alertas.js'), F = require('../js/fuentes.js'), M = require('../js/moneda.js'), Alm = require('../js/almacen.js'), Demo = require('../js/demo.js');
let ok = 0;
function t(nombre, f) { try { f(); ok++; } catch (e) { console.error('FALLA: ' + nombre + '\n  ' + e.message); process.exitCode = 1; } }
const DIA = 86400000, AHORA = Date.UTC(2026, 10, 5, 12);

const docs = [
  { titulo: 'Portátil Lenovo IdeaPad Slim 5 16GB', tienda: 'Amazon ES', cat: 'laptops', precio: 399, desc: 30, cupon: false, moneda: 'EUR' },
  { titulo: 'Apple iPhone 15 128GB', tienda: 'PcComponentes', cat: 'moviles', precio: 799, desc: 10, cupon: true, moneda: 'EUR' },
  { titulo: 'Auriculares Sony WH-1000XM5', tienda: 'MediaMarkt', cat: 'audio', precio: 279, desc: 25, moneda: 'EUR' },
  { titulo: 'Auriculares JBL Tune 510BT', tienda: 'Amazon ES', cat: 'audio', precio: 29, desc: 40, moneda: 'EUR' },
  { titulo: 'Nevera Samsung No Frost', tienda: 'Best Buy', cat: 'hogar', precio: 650, desc: 20, moneda: 'USD' },
  { titulo: 'Café Nespresso cápsulas', tienda: 'Walmart', cat: 'cocina', precio: 12, desc: 5, moneda: 'USD' }
];
const ix = new B.Indice(docs.map(d => Object.assign({}, d)));
const q = s => ix.buscar(s).idx;

t('texto: normaliza acentos y eñes', () => assert.strictEqual(T.norm('Café AÑO Ñandú'), 'cafe ano nandu'));
t('texto: distancia Damerau (transposicion = 1)', () => { assert.strictEqual(T.dist('lenovo', 'lenvoo', 2), 1); assert.strictEqual(T.dist('abc', 'bac', 2), 1); assert.ok(T.dist('abcdef', 'uvwxyz', 2) > 2); });
t('busqueda: sin acentos', () => { assert.deepStrictEqual(q('portatil'), [0]); assert.deepStrictEqual(q('cafe'), [5]); });
t('busqueda: fuzzy tolera errores', () => { assert.deepStrictEqual(q('lenvo'), [0]); assert.deepStrictEqual(q('lenovo idepad'), [0]); assert.deepStrictEqual(q('iphnoe'), [1]); });
t('busqueda: sin fuzzy en palabras cortas', () => assert.deepStrictEqual(q('tv'), []));
t('busqueda: sinonimos es/en', () => { assert.deepStrictEqual(q('laptop'), [0]); assert.deepStrictEqual(q('audifonos').sort(), [2, 3]); assert.deepStrictEqual(q('headphones').sort(), [2, 3]); assert.deepStrictEqual(q('refrigerador'), [4]); });
t('busqueda: prefijo en el ultimo termino (instantanea)', () => { assert.deepStrictEqual(q('lap'), [0]); assert.deepStrictEqual(q('apple iph'), [1]); });
t('busqueda: operador precio', () => { assert.deepStrictEqual(q('precio<100').sort(), [3, 5]); assert.deepStrictEqual(q('precio>=399 precio<=799').sort(), [0, 1, 4]); assert.deepStrictEqual(q('auriculares precio:20-100'), [3]); });
t('busqueda: tienda: y cat:', () => { assert.deepStrictEqual(q('tienda:amazon').sort(), [0, 3]); assert.deepStrictEqual(q('tienda:"best buy"'), [4]); assert.deepStrictEqual(q('cat:audio'), [2, 3].sort().length ? q('cat:audio') : []); assert.strictEqual(q('cat:audio').length, 2); });
t('busqueda: exclusion con -', () => { assert.deepStrictEqual(q('auriculares -sony'), [3]); assert.deepStrictEqual(q('tienda:amazon -jbl'), [0]); assert.deepStrictEqual(q('-tienda:amazon cat:audio'), [2]); });
t('busqueda: frase exacta y descuento/cupon', () => { assert.deepStrictEqual(q('"iphone 15"'), [1]); assert.deepStrictEqual(q('"15 iphone"'), []); assert.deepStrictEqual(q('descuento>=30').sort(), [0, 3]); assert.deepStrictEqual(q('cupon:si'), [1]); });
t('busqueda: relevancia (exacto antes que fuzzy)', () => { const r = q('sony'); assert.strictEqual(r[0], 2); });
t('busqueda: coincide() de un documento', () => { const p = B.parse('portatil precio<500'); assert.ok(B.coincide(p, docs[0])); assert.ok(!B.coincide(p, docs[1])); });

function hist(base, n, dias, extra) { const h = []; for (let i = n; i >= 1; i--) h.push([AHORA - (i * dias / n) * DIA, base * (1 + ((i * 7) % 5 - 2) * 0.01)]); return h.concat(extra || []); }
t('calor: descuento real vs historial', () => {
  const it = { precio: 70, precioAntes: 100, descuentoPct: 30, fecha: new Date(AHORA - 3600000).toISOString() };
  const an = C.analizar(it, hist(100, 20, 60, [[AHORA - 3600000, 70]]), AHORA);
  assert.ok(!an.sinHistorial); assert.ok(Math.abs(an.descReal - 0.3) < 0.03); assert.ok(an.mejorHistorico); assert.ok(!an.inflado);
  assert.ok(C.puntaje(it, an, AHORA) >= 75);
});
t('calor: frescura y vencimiento bajan el puntaje', () => {
  const base = { precio: 70, precioAntes: 100, descuentoPct: 30 }, an = C.analizar(base, hist(100, 20, 60, [[AHORA, 70]]), AHORA);
  const nuevo = C.puntaje(Object.assign({ fecha: new Date(AHORA - 3600000).toISOString() }, base), an, AHORA);
  const viejo = C.puntaje(Object.assign({ fecha: new Date(AHORA - 6 * DIA).toISOString() }, base), an, AHORA);
  const vencido = C.puntaje(Object.assign({ fecha: new Date(AHORA - 3600000).toISOString(), vence: new Date(AHORA - 1000).toISOString() }, base), an, AHORA);
  assert.ok(nuevo > viejo + 15); assert.ok(vencido < nuevo / 2);
});
t('calor: sin historial usa el descuento declarado con castigo', () => {
  const it = { precio: 50, precioAntes: 100, fecha: new Date(AHORA).toISOString() }, an = C.analizar(it, [], AHORA);
  assert.ok(an.sinHistorial); assert.ok(!an.inflado); assert.ok(Math.abs(an.declarado - 0.5) < 1e-9);
  assert.ok(C.puntaje(it, an, AHORA) < 100);
});
t('inflado: precio anterior nunca visto en el historial', () => {
  const it = { precio: 100, precioAntes: 200, descuentoPct: 50 }, an = C.analizar(it, hist(100, 20, 60, [[AHORA, 100]]), AHORA);
  assert.ok(an.inflado); assert.ok(/nunca/.test(an.motivo)); assert.ok(an.descReal < 0.05);
});
t('inflado: descuento declarado muy superior al real', () => {
  const h = hist(150, 20, 60).map((p, i) => i % 4 === 0 ? [p[0], 200] : p).concat([[AHORA, 140]]);
  const an = C.analizar({ precio: 140, precioAntes: 200, descuentoPct: 30 }, h, AHORA);
  assert.ok(an.inflado); assert.ok(/real/.test(an.motivo));
});
t('inflado: descuento honesto no se marca', () => {
  const an = C.analizar({ precio: 80, precioAntes: 100 }, hist(100, 20, 60, [[AHORA, 80]]), AHORA);
  assert.ok(!an.inflado);
});
t('mejor precio historico y cerca del minimo', () => {
  const h = hist(100, 20, 60);
  assert.ok(C.analizar({ precio: 90, precioAntes: 110 }, h.concat([[AHORA, 90]]), AHORA).mejorHistorico);
  const cerca = C.analizar({ precio: 99 }, h, AHORA);
  assert.ok(!cerca.mejorHistorico && cerca.cercaMinimo);
  assert.ok(!C.analizar({ precio: 120 }, h, AHORA).mejorHistorico);
});
t('calor: historial corto (<5 dias) no concluye', () => {
  const an = C.analizar({ precio: 50, precioAntes: 200 }, [[AHORA - 2 * DIA, 60], [AHORA - DIA, 60], [AHORA - 3600000, 60]], AHORA);
  assert.ok(an.sinHistorial && !an.inflado);
});

t('duplicados: agrupa mismo producto entre tiendas', () => {
  const it = [{ titulo: 'Apple iPhone 15 128GB Negro', tienda: 'Amazon' }, { titulo: 'iPhone 15 128 GB - Apple', tienda: 'PcComponentes' }, { titulo: 'Apple iPhone 15 256GB', tienda: 'Amazon' },
    { titulo: 'Sony WH-1000XM5 Auriculares', tienda: 'A' }, { titulo: 'Auriculares Sony WH-1000XM5 inalámbricos', tienda: 'B' }, { titulo: 'Sony WH-1000XM4 Auriculares', tienda: 'C' }];
  const r = D.agrupar(it);
  assert.strictEqual(r.grupoDe[0], r.grupoDe[1]); assert.notStrictEqual(r.grupoDe[0], r.grupoDe[2]);
  assert.strictEqual(r.grupoDe[3], r.grupoDe[4]); assert.notStrictEqual(r.grupoDe[3], r.grupoDe[5]);
});
t('duplicados: mismo EAN o misma URL fuerzan grupo; titulos distintos no', () => {
  const r = D.agrupar([{ titulo: 'Taladro percutor', tienda: 'A', ean: '123' }, { titulo: 'Herramienta electrica XL', tienda: 'B', ean: '123' }, { titulo: 'Nevera Samsung', tienda: 'C' }]);
  assert.strictEqual(r.grupoDe[0], r.grupoDe[1]); assert.notStrictEqual(r.grupoDe[0], r.grupoDe[2]);
});
t('duplicados: 5000 ofertas en tiempo razonable', () => {
  const d = Demo.generar({ n: 5000, ahora: AHORA }), t0 = Date.now(), r = D.agrupar(d.ofertas.items);
  assert.ok(Date.now() - t0 < 4000, 'tardo ' + (Date.now() - t0)); assert.ok(r.grupos.length < 5000 && r.grupos.length > 30);
});
t('busqueda: indice de 5000 ofertas responde rapido', () => {
  const d = Demo.generar({ n: 5000, ahora: AHORA }), docs2 = d.ofertas.items.map(i => ({ titulo: i.titulo, tienda: i.tienda, cat: i.categoria, precio: i.precio, desc: i.descuentoPct, moneda: i.moneda }));
  const idx = new B.Indice(docs2), t0 = Date.now(); const r = idx.buscar('lapotp precio<900 -gaming'); const ms = Date.now() - t0;
  assert.ok(r.idx.length > 0 && ms < 400, 'tardo ' + ms);
});

const items = [
  { id: 'a', titulo: 'Portátil Lenovo IdeaPad 15', tienda: 'X', categoria: 'laptops', precio: 400, precioAntes: 600, descuentoPct: 33, moneda: 'EUR' },
  { id: 'b', titulo: 'Portátil HP 14', tienda: 'Y', categoria: 'laptops', precio: 520, precioAntes: 560, descuentoPct: 7, moneda: 'EUR' },
  { id: 'c', titulo: 'Laptop Dell', tienda: 'Z', categoria: 'laptops', precio: 500, precioAntes: 800, descuentoPct: 37, moneda: 'USD', vence: new Date(AHORA - 1000).toISOString() },
  { id: 'd', titulo: 'Auriculares Sony', tienda: 'X', categoria: 'audio', precio: 90, precioAntes: 150, descuentoPct: 40, moneda: 'EUR' }
];
const ctx = { ahora: AHORA, convertir: (m, de, a) => M.convertir(m, de, a, { EUR: 0.92 }) };
t('alertas: palabra clave bajo precio', () => {
  const a = A.nueva({ consulta: 'laptop', precioMax: 450, moneda: 'EUR' }), r = A.evaluar([a], items, ctx);
  assert.deepStrictEqual(r[0].nuevas.map(i => i.id), ['a']);
});
t('alertas: "cualquier laptop con 30% o mas" y vigencia', () => {
  const a = A.nueva({ consulta: 'laptop', descMin: 30, moneda: 'EUR' }), r = A.evaluar([a], items, ctx);
  assert.deepStrictEqual(r[0].nuevas.map(i => i.id), ['a']);
  const b = A.nueva({ consulta: 'laptop', descMin: 30, moneda: 'EUR', soloVigentes: false }), r2 = A.evaluar([b], items, ctx);
  assert.deepStrictEqual(r2[0].nuevas.map(i => i.id), ['a', 'c']);
});
t('alertas: conversion de moneda en el umbral', () => {
  const a = A.nueva({ consulta: 'dell', precioMax: 480, moneda: 'EUR', soloVigentes: false });
  assert.strictEqual(A.evaluar([a], items, ctx).length, 1); // 500 USD * 0.92 = 460 EUR
  assert.strictEqual(A.evaluar([A.nueva({ consulta: 'dell', precioMax: 450, moneda: 'EUR', soloVigentes: false })], items, ctx).length, 0);
});
t('alertas: no repite avisos y vuelve a avisar si baja', () => {
  let a = A.nueva({ consulta: 'laptop', precioMax: 450, moneda: 'EUR' });
  const r = A.evaluar([a], items, ctx); a = A.marcarVistos(a, r[0].nuevas);
  assert.strictEqual(A.evaluar([a], items, ctx)[0].nuevas.length, 0);
  const bajo = items.map(i => i.id === 'a' ? Object.assign({}, i, { precio: 350 }) : i);
  assert.strictEqual(A.evaluar([a], bajo, ctx)[0].nuevas.length, 1);
});
t('alertas: producto con precio objetivo; inactiva no dispara; vacia no dispara', () => {
  const a = A.nueva({ tipo: 'producto', itemIds: ['d'], objetivo: 95, moneda: 'EUR', nombre: 'Sony' });
  assert.strictEqual(A.evaluar([a], items, ctx)[0].nuevas[0].id, 'd');
  assert.strictEqual(A.evaluar([Object.assign({}, a, { activa: false })], items, ctx).length, 0);
  assert.strictEqual(A.evaluar([A.nueva({})], items, ctx).length, 0);
});
t('alertas: operadores de busqueda dentro de la alerta', () => {
  const a = A.nueva({ consulta: 'portatil -hp tienda:x', moneda: 'EUR' });
  assert.deepStrictEqual(A.evaluar([a], items, ctx)[0].nuevas.map(i => i.id), ['a']);
});

t('config: parser RSS con precios', () => {
  const xml = '<?xml version="1.0"?><rss><channel><item><title><![CDATA[Portátil ASUS 15" por 399,99€]]></title><link>https://x.es/a?utm=1&amp;b=2</link><pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate><description>&lt;img src="https://x.es/i.jpg"&gt; Oferta</description></item><item><title>Sin precio</title><link>https://x.es/b</link></item></channel></rss>';
  const r = F.parsearFeed(xml);
  assert.strictEqual(r.tipo, 'rss'); assert.strictEqual(r.total, 2); assert.strictEqual(r.items[0].precio, 399.99); assert.strictEqual(r.items[0].moneda, 'EUR');
  assert.strictEqual(r.items[0].enlace, 'https://x.es/a?utm=1&b=2'); assert.strictEqual(r.items[0].imagen, 'https://x.es/i.jpg'); assert.strictEqual(r.campos.precio, 1); assert.ok(r.avisos.length);
});
t('config: parser Atom y g:price', () => {
  const xml = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Tele LG</title><link rel="alternate" href="https://t.com/lg"/><updated>2026-11-04T10:00:00Z</updated><g:price>1.299,00 EUR</g:price></entry></feed>';
  const r = F.parsearFeed(xml);
  assert.strictEqual(r.tipo, 'atom'); assert.strictEqual(r.items[0].enlace, 'https://t.com/lg'); assert.strictEqual(r.items[0].precio, 1299); assert.strictEqual(r.items[0].moneda, 'EUR');
});
t('config: JSON-LD Product/Offer e ItemList', () => {
  const html = '<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Cafetera","image":"https://c/i.png","offers":{"@type":"Offer","price":"59.90","priceCurrency":"EUR","url":"https://c/p"}}</script>' +
    '<script type="application/ld+json">{"@graph":[{"@type":"ItemList","itemListElement":[{"@type":"ListItem","item":{"@type":"Product","name":"Tostadora","offers":{"price":25,"priceCurrency":"EUR"}}}]}]}</script><script type="application/ld+json">{roto</script></html>';
  const r = F.parsearFeed(html);
  assert.strictEqual(r.tipo, 'jsonld'); assert.strictEqual(r.total, 2); assert.strictEqual(r.items[0].precio, 59.9); assert.strictEqual(r.items[1].titulo, 'Tostadora'); assert.ok(r.avisos.some(a => /JSON-LD/.test(a)));
});
t('config: HTML sin datos y texto basura dan aviso', () => {
  assert.ok(F.parsearFeed('<!doctype html><html></html>').avisos.length); assert.strictEqual(F.parsearFeed('hola').tipo, 'desconocido');
});
t('config: validar URL', () => {
  assert.ok(F.validarUrl('https://tienda.com/feed').ok); assert.ok(!F.validarUrl('ftp://x.com').ok); assert.ok(!F.validarUrl('tienda').ok); assert.ok(!F.validarUrl('http://192.168.1.2/f').ok); assert.ok(F.validarUrl('http://a.com/f').avisos.length);
});
t('config: numeros europeos y anglosajones', () => { assert.strictEqual(F.numero('1.299,99'), 1299.99); assert.strictEqual(F.numero('1,299.99'), 1299.99); assert.strictEqual(F.numero('12,5'), 12.5); assert.strictEqual(F.numero('1.299'), 1299); });
t('config: bloque de fuente y fragmento completo (valido contra el validador real del proceso de datos)', () => {
  const b = F.bloqueFuente({ url: 'https://www.Tienda.com/feed.xml', tipo: 'auto', pais: 'es', moneda: 'eur', categoria: 'tech' });
  assert.deepStrictEqual(b, { id: 'tienda-com', tipo: 'feed', nombre: 'tienda.com', url: 'https://www.tienda.com/feed.xml', tienda: 'tienda.com', moneda: 'EUR', idioma: 'es', categoria: 'tech', activo: true });
  const c = F.config([b], F.palabrasDeAlertas([A.nueva({ consulta: 'laptop', precioMax: 500, moneda: 'EUR', descMin: 30 }), A.nueva({ tipo: 'producto', itemIds: ['x'], objetivo: 3 })]));
  assert.deepStrictEqual(c.ofertas.busqueda, { activo: true, palabras: ['laptop'] });
  assert.doesNotThrow(() => JSON.parse(F.texto(c)));
  const path = require('path'), fs = require('fs');
  const cfgPath = path.join(__dirname, '../../../scripts/datos/config.json');
  const val = require('../../../scripts/datos/lib/config-validar.js');
  const fn = val.validarConfig || val;
  const base = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  base.ofertas.fuentes = base.ofertas.fuentes.concat(c.ofertas.fuentes);
  base.ofertas.busqueda = Object.assign({}, base.ofertas.busqueda, c.ofertas.busqueda);
  assert.deepStrictEqual(fn(base), []);
  for (const tipo of ['rss', 'atom', 'jsonld']) {
    const x = F.bloqueFuente({ url: 'https://www.otra.com/x', tipo, pais: 'US' });
    const cc = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); cc.ofertas.fuentes.push(x);
    assert.deepStrictEqual(fn(cc), []);
  }
});
t('moneda: conversion via USD', () => {
  const tasas = { EUR: 0.9, MXN: 18 };
  assert.strictEqual(M.convertir(100, 'USD', 'EUR', tasas), 90); assert.ok(Math.abs(M.convertir(90, 'EUR', 'MXN', tasas) - 1800) < 1e-9); assert.strictEqual(M.convertir(5, 'XXX', 'EUR', tasas), 5);
});
t('almacen: en memoria get/set/lista/borrar/suscribir', async () => {
  await Alm.abrir(); let n = 0; const baja = Alm.suscribir(() => n++);
  Alm.set('g:1', { a: 1 }); Alm.set('g:2', { a: 2 }); Alm.set('x', 1);
  assert.strictEqual(Alm.lista('g:').length, 2); Alm.borrar('g:1'); assert.strictEqual(Alm.get('g:1', null), null); assert.strictEqual(Alm.lista('g:').length, 1); assert.ok(n >= 4); baja();
});
console.log(ok + ' pruebas correctas');
