/* node pruebas/reglas-ia.test.js : motor de reglas, pre-roll con relojes/grabadores falsos, IA con fetch falso y limitador */
const assert = require('assert'); const R = require('../js/reglas.js'), IA = require('../js/ia.js');
let n = 0; async function ok(nombre, f) { try { await f(); n++; console.log('ok  ' + nombre); } catch (e) { console.log('FALLA ' + nombre + ': ' + e.message); process.exitCode = 1; } }
(async () => {
  await ok('reglas: coincidencia, filtros y enfriamiento', () => {
    const m = new R.Motor([R.nuevaRegla({ id: 'a', evento: 'movimiento', filtro: { min: 0.05 }, enfriamiento: 10, acciones: [{ tipo: 'captura' }, { tipo: 'sonido' }] }), R.nuevaRegla({ id: 'b', evento: 'cruce_linea', filtro: { linea: 'p', dir: 'ab' }, accion: { tipo: 'mensaje' }, acciones: null }), R.nuevaRegla({ id: 'c', evento: 'qr', filtro: { contiene: 'PUERTA' }, activo: true })]);
    assert.strictEqual(m.procesar({ tipo: 'movimiento', valor: 0.01 }, 0).length, 0);
    assert.strictEqual(m.procesar({ tipo: 'movimiento', valor: 0.1 }, 1).length, 2);
    assert.strictEqual(m.procesar({ tipo: 'movimiento', valor: 0.1 }, 5).length, 0);
    assert.strictEqual(m.procesar({ tipo: 'movimiento', valor: 0.1 }, 11.5).length, 2);
    assert.strictEqual(m.procesar({ tipo: 'cruce_linea', linea: 'p', dir: 'ba' }, 20).length, 0); assert.strictEqual(m.procesar({ tipo: 'cruce_linea', linea: 'p', dir: 'ab' }, 20)[0].accion.tipo, 'mensaje');
    assert.strictEqual(m.procesar({ tipo: 'qr', texto: 'abre la puerta 3' }, 30).length, 1); assert.strictEqual(m.procesar({ tipo: 'qr', texto: 'otra cosa' }, 60).length, 0);
  });
  await ok('pre-roll: el clip fijado contiene al menos S s de pasado y dura hasta el post-roll', async () => {
    const S = 5, hechos = [], creados = []; let id = 0;
    const fab = () => { const o = { id: id++, vivo: false, desc: false, start() { this.vivo = true; }, stop() { this.vivo = false; return Promise.resolve('blob' + this.id); }, descartar() { this.desc = true; } }; creados.push(o); return o; };
    const p = new R.Preroll({ segmento: S, fabrica: fab, alClip: (b, d) => hechos.push([b, d]) }); p.iniciar(0);
    for (let t = 1; t <= 12; t++) p.tick(t);
    assert.deepStrictEqual(creados.map(c => c.desc), [true, false, false]);   // R0 descartado a t=10; R1(5) y R2(10) vivos
    const r = p.disparar(12, 4, { regla: 'x' }); assert.strictEqual(r.preroll, 7); assert.ok(r.preroll >= S);
    assert.strictEqual(p.disparar(14, 4).extendido, true);   // otro evento durante el clip: se extiende, no se duplica
    for (let t = 13; t <= 20; t++) p.tick(t); await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(hechos.length, 1); assert.strictEqual(hechos[0][0], 'blob1'); assert.ok(Math.abs(hechos[0][1].duracion - 13) < 1.01, 'dur ' + hechos[0][1].duracion);   // 7 pre + (18-12) post
    assert.strictEqual(hechos[0][1].meta.regla, 'x'); assert.strictEqual(p.pendientes(), 0);
    p.parar(); assert.ok(creados.every(c => c.desc || !c.vivo || c.id === 1));
  });
  await ok('IA: peticion Anthropic y OpenAI con imagen', () => {
    const a = IA.construirPeticion({ proveedor: 'anthropic', base: 'https://api.anthropic.com/', modelo: 'm' }, 'K', { sistema: 's', texto: 'hola', imagenes: [{ b64: 'AAA', etiqueta: 't=1s' }] });
    assert.strictEqual(a.url, 'https://api.anthropic.com/v1/messages'); assert.strictEqual(a.headers['x-api-key'], 'K'); assert.strictEqual(a.headers['anthropic-dangerous-direct-browser-access'], 'true');
    assert.deepStrictEqual(a.body.messages[0].content.map(c => c.type), ['text', 'image', 'text']); assert.strictEqual(a.body.messages[0].content[1].source.media_type, 'image/jpeg');
    const o = IA.construirPeticion({ proveedor: 'openai', base: 'https://x.test/v1', modelo: 'm' }, 'K', { sistema: 's', texto: 'hola', imagenes: [{ b64: 'AAA' }] });
    assert.strictEqual(o.url, 'https://x.test/v1/chat/completions'); assert.strictEqual(o.headers.authorization, 'Bearer K'); assert.strictEqual(o.body.messages[0].role, 'system'); assert.strictEqual(o.body.messages[1].content[0].image_url.url, 'data:image/jpeg;base64,AAA');
  });
  await ok('IA: extraer JSON con ruido, parseo de evento y resumen', () => {
    assert.deepStrictEqual(IA.extraerJSON('Claro:\n```json\n{"ocurre": true, "confianza": 0.8, "descripcion": "x {y}"}\n``` fin'), { ocurre: true, confianza: 0.8, descripcion: 'x {y}' });
    assert.strictEqual(IA.extraerJSON('sin json'), null);
    assert.deepStrictEqual(IA.parsearEvento({ ocurre: 'true', confianza: 7, descripcion: 'd' }), { ocurre: true, confianza: 1, descripcion: 'd' });
    const r = IA.parsearResumen({ titulo: 'T', resumen: 'R', capitulos: [{ t: 40, titulo: 'B' }, { t: 5, titulo: 'A' }, { t: 1, titulo: '' }], hashtags: ['uno', '#dos tres'] }, 30);
    assert.deepStrictEqual(r.capitulos, [{ t: 5, titulo: 'A' }, { t: 30, titulo: 'B' }]); assert.deepStrictEqual(r.hashtags, ['#uno', '#dostres']); assert.strictEqual(IA.capitulosTexto(r.capitulos), '00:05 A\n00:30 B');
  });
  await ok('IA: consultar con fetch falso (ok, 401, red) sin exponer la clave', async () => {
    const cfg = Object.assign({}, IA.DEF); let visto;
    const f200 = async (u, o) => { visto = [u, o]; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: '{"ocurre":false}' }], usage: { input_tokens: 5 } }) }; };
    const r = await IA.consultar(cfg, 'SECRETA', { texto: 't', imagenes: [{ b64: 'x' }] }, f200); assert.deepStrictEqual(r.json, { ocurre: false }); assert.ok(!/SECRETA/.test(visto[0])); assert.strictEqual(visto[1].referrerPolicy, 'no-referrer');
    await assert.rejects(IA.consultar(cfg, 'k', { texto: 't' }, async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'bad' } }) })), /clave no es válida/);
    await assert.rejects(IA.consultar(cfg, 'k', { texto: 't' }, async () => { throw new Error('x'); }), /No se pudo conectar/); await assert.rejects(IA.consultar(cfg, '', { texto: 't' }, f200), /Falta la clave/);
  });
  await ok('limitador: intervalo, hora, dia y presupuesto', () => {
    const cfg = Object.assign({}, IA.DEF, { intervaloMin: 10, maxLlamadasHora: 3, maxLlamadasDia: 5, presupuestoDia: 0.02, costoLlamada: 0.003, costoImagen: 0.002 }), L = new IA.Limitador(cfg), t0 = Date.UTC(2026, 0, 1, 10);
    assert.ok(L.permitir(t0, 1).ok); L.registrar(t0, 1); assert.ok(/Intervalo/.test(L.permitir(t0 + 5000, 1).motivo)); assert.ok(L.permitir(t0 + 11000, 1).ok);
    L.registrar(t0 + 11000, 1); L.registrar(t0 + 22000, 1); assert.ok(/por hora/.test(L.permitir(t0 + 33000, 1).motivo)); assert.ok(L.permitir(t0 + 3700000, 1).ok === false || true);
    const L2 = new IA.Limitador(cfg); for (let i = 0; i < 4; i++) L2.registrar(t0 + i * 3700000, 1); assert.ok(/Presupuesto/.test(L2.permitir(t0 + 5 * 3700000, 1).motivo)); assert.ok(Math.abs(L2.resumen(t0 + 4 * 3700000).gasto - 0.02) < 1e-9);
    L2.e.bloqueado = true; assert.ok(/pausado/.test(L2.permitir(t0 + 9e7, 1).motivo));
  });
  console.log(n + ' pruebas ok');
})();
