const test = require('node:test'), assert = require('node:assert/strict');
const IA = require('../js/ia.js'), Cifrado = require('../js/cifrado.js'), Claves = require('../js/claves.js'), C = require('../js/contadores.js');
const P = require('../js/plantillas.js'), E = require('../js/exportar.js'), D = require('../js/diff.js'), Almacen = require('../js/almacen.js');

const enc = new TextEncoder();
function sse(partes, trozo) {
  const s = partes.join(''); const b = enc.encode(s);
  return new ReadableStream({ start(c) { for (let i = 0; i < b.length; i += trozo || 7) c.enqueue(b.slice(i, i + (trozo || 7))); c.close(); } });
}
const ev = (e, d) => (e ? 'event: ' + e + '\n' : '') + 'data: ' + (typeof d === 'string' ? d : JSON.stringify(d)) + '\n\n';
const resp = (body, st) => new Response(body, { status: st || 200, headers: { 'content-type': 'text/event-stream' } });
const base = { clave: 'k-test', modelo: 'm', mensajes: [{ rol: 'user', texto: 'hola' }], sistema: 'sis' };

test('Anthropic: cabeceras, SSE, uso', async () => {
  let visto;
  const f = async (url, init) => { visto = { url, init }; return resp(sse([
    ev('message_start', { type: 'message_start', message: { usage: { input_tokens: 11 } } }),
    ev('content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Ho' } }),
    ev('content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: 'la ñ' } }),
    ev('message_delta', { type: 'message_delta', usage: { output_tokens: 5 } }), ev('message_stop', { type: 'message_stop' })])); };
  const tok = []; const r = await IA.generar({ ...base, proveedor: 'anthropic', fetch: f, onToken: t => tok.push(t) });
  assert.equal(r.texto, 'Hola ñ'); assert.deepEqual(tok, ['Ho', 'la ñ']); assert.deepEqual([r.uso.entrada, r.uso.salida, r.uso.estimado], [11, 5, false]);
  assert.equal(visto.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(visto.init.headers['x-api-key'], 'k-test'); assert.equal(JSON.parse(visto.init.body).stream, true);
  assert.equal(JSON.parse(visto.init.body).system, 'sis');
});
test('OpenAI: SSE con [DONE] y uso', async () => {
  const f = async (u, init) => { assert.equal(init.headers.authorization, 'Bearer k-test'); return resp(sse([
    ev('', { choices: [{ delta: { content: 'A' } }] }), ev('', { choices: [{ delta: { content: 'B' } }] }), ev('', { choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } }), ev('', '[DONE]')], 5)); };
  const r = await IA.generar({ ...base, proveedor: 'openai', fetch: f });
  assert.equal(r.texto, 'AB'); assert.equal(r.uso.entrada, 3);
});
test('Gemini: SSE, URL y cabecera de clave, uso estimado si falta', async () => {
  let url;
  const f = async (u, init) => { url = u; assert.equal(init.headers['x-goog-api-key'], 'k-test'); return resp(sse([
    ev('', { candidates: [{ content: { parts: [{ text: 'Hol' }] } }] }), ev('', { candidates: [{ content: { parts: [{ text: 'a' }] } }] })])); };
  const r = await IA.generar({ ...base, proveedor: 'gemini', fetch: f });
  assert.equal(r.texto, 'Hola'); assert.ok(/models\/m:streamGenerateContent\?alt=sse$/.test(url)); assert.equal(r.uso.estimado, true);
});
test('Sin streaming (JSON completo) en los tres', async () => {
  const j = o => async () => new Response(JSON.stringify(o), { status: 200 });
  assert.equal((await IA.generar({ ...base, stream: false, proveedor: 'anthropic', fetch: j({ content: [{ text: 'X' }], usage: { input_tokens: 1, output_tokens: 2 } }) })).texto, 'X');
  assert.equal((await IA.generar({ ...base, stream: false, proveedor: 'openai', fetch: j({ choices: [{ message: { content: 'Y' } }] }) })).texto, 'Y');
  assert.equal((await IA.generar({ ...base, stream: false, proveedor: 'gemini', fetch: j({ candidates: [{ content: { parts: [{ text: 'Z' }] } }] }) })).texto, 'Z');
});
test('Errores 401, 404, 429 con reintento y Retry-After, 500 agotado, CORS', async () => {
  const e = (st, h) => async () => new Response(JSON.stringify({ error: { message: 'm' + st } }), { status: st, headers: h });
  await assert.rejects(IA.generar({ ...base, proveedor: 'openai', fetch: e(401) }), x => x.tipo === 'clave' && /401/.test(x.message));
  await assert.rejects(IA.generar({ ...base, proveedor: 'openai', fetch: e(404) }), x => x.tipo === 'modelo');
  let n = 0; const esperas = [];
  const f = async () => (++n < 3 ? new Response('{"error":{"message":"lento"}}', { status: 429, headers: { 'retry-after': '2' } }) : new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })));
  const r = await IA.generar({ ...base, stream: false, proveedor: 'openai', fetch: f, sleep: async ms => { esperas.push(ms); } });
  assert.equal(r.texto, 'ok'); assert.deepEqual(esperas, [2000, 2000]);
  n = 0; const esp2 = [];
  await assert.rejects(IA.generar({ ...base, proveedor: 'anthropic', reintentos: 2, backoff: 100, fetch: async () => { n++; return new Response('x', { status: 529 }); }, sleep: async ms => esp2.push(ms) }), x => x.tipo === 'servidor');
  assert.equal(n, 3); assert.deepEqual(esp2, [100, 200]);
  await assert.rejects(IA.generar({ ...base, proveedor: 'gemini', reintentos: 0, fetch: async () => { throw new TypeError('Failed to fetch'); } }), x => x.tipo === 'cors' && /CORS/.test(x.message));
});
test('OpenAI reintenta sin temperature si el modelo la rechaza', async () => {
  const cuerpos = [];
  const f = async (u, init) => { cuerpos.push(JSON.parse(init.body)); return cuerpos.length === 1 ? new Response('{"error":{"message":"Unsupported value: temperature"}}', { status: 400 }) : new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })); };
  const r = await IA.generar({ ...base, stream: false, temperatura: 0.5, proveedor: 'openai', fetch: f });
  assert.equal(r.texto, 'ok'); assert.equal(cuerpos[0].temperature, 0.5); assert.equal(cuerpos[1].temperature, undefined);
});
test('Cancelación durante streaming y antes de reintento', async () => {
  const ac = new AbortController();
  const f = async (u, init) => { const body = new ReadableStream({ start(c) { c.enqueue(enc.encode(ev('', { choices: [{ delta: { content: 'par' } }] }))); init.signal.addEventListener('abort', () => c.error(Object.assign(new Error('abort'), { name: 'AbortError' }))); } }); return resp(body); };
  const p = IA.generar({ ...base, proveedor: 'openai', fetch: f, signal: ac.signal, onToken: () => ac.abort() });
  await assert.rejects(p, x => x.tipo === 'cancelado' && x.parcial === 'par');
  const ac2 = new AbortController(); ac2.abort();
  await assert.rejects(IA.generar({ ...base, proveedor: 'openai', signal: ac2.signal, fetch: async () => { throw Object.assign(new Error('a'), { name: 'AbortError' }); } }), x => x.tipo === 'cancelado');
});
test('Error dentro del stream y respuesta vacía; sin clave', async () => {
  const f = async () => resp(sse([ev('error', { type: 'error', error: { message: 'sobrecarga' } })]));
  await assert.rejects(IA.generar({ ...base, proveedor: 'anthropic', fetch: f, reintentos: 0 }), x => x.tipo === 'servidor' && /sobrecarga/.test(x.message));
  await assert.rejects(IA.generar({ ...base, proveedor: 'gemini', fetch: async () => resp(sse([])), reintentos: 0 }), x => x.tipo === 'vacio');
  await assert.rejects(IA.generar({ ...base, clave: '', proveedor: 'gemini' }), x => x.tipo === 'clave');
});
test('Tokens y costo con tarifa editable', () => {
  assert.equal(IA.estimarTokens('a'.repeat(400)), 100);
  assert.equal(IA.costo({ entrada: 1e6, salida: 5e5 }, { entrada: 2, salida: 10 }), 7);
  assert.equal(IA.costo({ entrada: 5, salida: 5 }, { entrada: 0, salida: 0 }), null);
});

test('Cifrado: ida y vuelta, contraseña mala falla, aleatoriedad', async () => {
  const a = await Cifrado.cifrar('sk-secreta-ñ', 'pw1'), b = await Cifrado.cifrar('sk-secreta-ñ', 'pw1');
  assert.equal(await Cifrado.descifrar(a, 'pw1'), 'sk-secreta-ñ'); assert.notEqual(a.c, b.c); assert.ok(!JSON.stringify(a).includes('secreta'));
  await assert.rejects(Cifrado.descifrar(a, 'otra'), /incorrecta/);
  await assert.rejects(Cifrado.cifrar('x', ''), /contraseña/i);
});
test('Claves: guardar plano, cifrada, desbloquear, borrar', async () => {
  const st = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; }, removeItem(k) { delete this.d[k]; } };
  const cl = Claves.crear(st); assert.equal(Claves.CLAVE, 'contenido_escritor_claves_dispositivo');
  await cl.guardar('openai', 'sk-1'); assert.equal(await cl.obtener('openai'), 'sk-1');
  await cl.guardar('anthropic', 'sk-ant', 'pw'); assert.ok(cl.cifrada('anthropic')); assert.ok(!st.d[Claves.CLAVE].includes('sk-ant'));
  const cl2 = Claves.crear(st); assert.equal(cl2.desbloqueada('anthropic'), false);
  await assert.rejects(cl2.obtener('anthropic'), /cifrada/); await assert.rejects(cl2.obtener('anthropic', 'mal'), /incorrecta/);
  assert.equal(await cl2.obtener('anthropic', 'pw'), 'sk-ant'); assert.equal(cl2.desbloqueada('anthropic'), true);
  cl2.borrar('openai'); assert.equal(cl2.tiene('openai'), false); cl2.borrarTodo(); assert.equal(st.getItem(Claves.CLAVE), null);
});

test('Contadores por red', () => {
  assert.equal(C.contar('x', 'a'.repeat(280)).estado, 'cerca'); assert.equal(C.contar('x', 'a'.repeat(281)).estado, 'excede');
  assert.equal(C.contar('x', 'mira https://ejemplo.com/muy/largo/enlace/que/no/cabe ya').n, 5 + 23 + 3);
  assert.equal(C.longitudX('日本'), 4); assert.equal(C.longitudX('😀'), 2);
  const ig = C.contar('instagram', Array.from({ length: 31 }, (_, i) => '#t' + i).join(' ')); assert.equal(ig.hashtags, 31); assert.ok(ig.avisos[0].includes('30'));
  assert.equal(C.contar('shorts_titulo', 'x'.repeat(101)).restante, -1);
  assert.equal(C.contar('linkedin', 'hola mundo @ana #tag').palabras, 4);
  assert.equal(C.contar('x', 'a'.repeat(300), { x: 400 }).estado, 'ok');
  assert.equal(C.contar('tiktok', '😀').n, 1);
});
test('Hilo: cada parte cabe en 280 y numera', () => {
  const t = Array.from({ length: 30 }, (_, i) => 'Esta es la frase número ' + i + ' del hilo largo.').join(' ') + '\n\n' + 'palabra'.repeat(60);
  const h = C.dividirHilo(t); assert.ok(h.length > 3);
  h.forEach((p, i) => { assert.ok(C.longitudX(p) <= 280, p.length + ''); assert.ok(p.endsWith('(' + (i + 1) + '/' + h.length + ')')); });
  assert.deepEqual(C.dividirHilo('corto'), ['corto']);
  assert.deepEqual(C.dividirCarrusel('Diapositiva 1: Hola\nDiapositiva 2: Mundo\nmás'), ['Hola', 'Mundo\nmás']);
});

test('Plantillas: todos los tipos por reglas, deterministas, respetan límites', () => {
  const c = { tema: 'marketing para panaderías', texto: 'Hola   mundo.este es un texto.sin formato . Otra frase aquí. Y una tercera frase importante. Cuarta frase.', cantidad: 5, duracion: 30, cta: 'Visítanos' };
  P.TIPOS.filter(t => t.id !== 'traducir').forEach(t => { const s = P.generarReglas(t.id, c); assert.ok(s.length > 10, t.id); assert.equal(s, P.generarReglas(t.id, c), t.id); });
  assert.throws(() => P.generarReglas('traducir', c), /IA/);
  assert.notEqual(P.generarReglas('ideas', c, null, 0), P.generarReglas('ideas', c, null, 1));
  P.generarReglas('x', c).split('\n\n').forEach(p => assert.ok(C.longitudX(p.replace(/^\d\. /, '')) <= 280));
  P.generarReglas('hilo', c).split('\n\n').forEach(p => assert.ok(C.longitudX(p) <= 280));
  const hs = P.hashtags('Café de especialidad, Barismo en casa'); assert.ok(hs.includes('#CafeEspecialidad') && hs.includes('#BarismoCasa') && hs.every(h => /^#[a-zA-Z0-9ñ]+$/.test(h)));
  assert.match(P.aida({ tema: 'x' }), /ATENCIÓN[\s\S]*ACCIÓN/); assert.match(P.pas({ tema: 'x' }), /PROBLEMA[\s\S]*SOLUCIÓN/);
  const cal = P.calendario('yoga', 30); assert.equal(cal.length, 30); assert.equal(new Set(cal.map(x => x.pilar)).size, 7);
  assert.equal(P.limpiar('hola ,mundo.esto  va mal!!!!!'), 'Hola, mundo. Esto va mal!!!');
});
test('Guion por reglas: parseable, tiempos consecutivos y suman la duración; SRT', () => {
  [15, 30, 60, 90].forEach(d => {
    const g = E.parsearGuion(P.generarReglas('guion', { tema: 'ahorro', duracion: d }));
    assert.equal(g.duracion, d); assert.equal(g.escenas[0].tipo, 'GANCHO'); assert.match(g.escenas.at(-1).tipo, /LLAMADA/);
    g.escenas.forEach((e, i) => { assert.ok(e.texto && e.camara); if (i) assert.equal(e.ini, g.escenas[i - 1].fin); });
  });
  const srt = E.aSrt('ESCENA 1 | 0:00-0:05 | GANCHO\nCÁMARA: x\nTEXTO: ' + 'palabra '.repeat(15) + '\nESCENA 2 | 0:05-1:05 | CTA\nTEXTO: fin');
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:05,000\n/); assert.match(srt, /2\n00:00:05,000 --> 00:01:05,000\nfin/);
  assert.throws(() => E.aSrt('sin escenas'), /escenas/);
  assert.match(E.aMd({ titulo: 'T', tipo: 'x', fecha: '2026-01-01', texto: 'cuerpo' }), /^# T[\s\S]*Revisa y verifica[\s\S]*cuerpo/);
});
test('Prompts: marca incluida y reglas de seguridad', () => {
  const m = P.armarMensajes('guion', { tema: 'café', duracion: 45, publico: 'jóvenes' }, { nombre: 'Mi marca', usar: 'cercano', evitar: 'jamás' });
  assert.match(m.sistema, /Palabras a evitar: jamás/); assert.match(m.sistema, /no inventes/i); assert.match(m.mensajes[0].texto, /45 segundos/); assert.match(m.mensajes[0].texto, /ESCENA 1/);
});
test('Diff por palabras', () => {
  const d = D.diff('uno dos tres', 'uno tres cuatro');
  assert.equal(d.filter(x => x.t === '-').map(x => x.s.trim()).join(), 'dos'); assert.equal(d.filter(x => x.t === '+').map(x => x.s.trim()).join(), 'cuatro');
});
test('Almacen: marcas de tiempo, lista, borrar, suscripción', async () => {
  let t = 100; const a = Almacen.crear('x', { backend: Almacen.memoria(), reloj: () => ++t }); const ev = [];
  a.suscribir('h', (c, id, tp) => ev.push(tp));
  const o = await a.set('h', { id: 'a', v: 1 }); assert.equal(o._t, 101); const o2 = await a.set('h', { id: 'a', v: 2 });
  assert.equal(o2._creado, 101); assert.equal(o2._t, 102); assert.equal((await a.lista('h')).length, 1); assert.equal((await a.lista('otra')).length, 0);
  await a.borrar('h', 'a'); assert.equal(await a.get('h', 'a'), undefined); assert.deepEqual(ev, ['set', 'set', 'del']);
});
