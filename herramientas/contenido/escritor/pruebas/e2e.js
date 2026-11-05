/* Playwright: node pruebas/e2e.js  (requiere servidor estatico en la raiz del repo: python3 -m http.server 8123). Las APIs de IA se interceptan; no se usan claves reales. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE || 'http://localhost:8123/herramientas/contenido/escritor/';
const SHOTS = process.env.SHOTS || '/tmp';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
const sse = (arr) => arr.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  let modo = 'ok', visto = null;
  await ctx.route('https://api.anthropic.com/**', async (route) => {
    const r = route.request();
    if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    visto = { h: r.headers(), b: JSON.parse(r.postData()) };
    if (modo === '401') return route.fulfill({ status: 401, headers: CORS, contentType: 'application/json', body: '{"error":{"message":"invalid x-api-key"}}' });
    const guion = 'TÍTULO: Café en casa\nESCENA 1 | 0:00-0:05 | GANCHO\nCÁMARA: Primer plano\nTEXTO: ¿Sabes preparar buen café?\nESCENA 2 | 0:05-0:30 | DESARROLLO\nCÁMARA: Plano medio\nTEXTO: Muele fresco y mide el agua.';
    route.fulfill({ status: 200, headers: CORS, contentType: 'text/event-stream', body: sse([['message_start', { type: 'message_start', message: { usage: { input_tokens: 120 } } }], ['content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: guion.slice(0, 60) } }], ['content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: guion.slice(60) } }], ['message_delta', { type: 'message_delta', usage: { output_tokens: 90 } }], ['message_stop', { type: 'message_stop' }]]) });
  });
  await page.goto(BASE); await page.waitForSelector('#f-tipo');
  // 1 modo plantillas
  assert.match(await page.textContent('#chip-modo'), /plantillas/i);
  await page.selectOption('#f-tipo', 'guion'); await page.fill('#f-tema', 'preparar café en casa'); await page.click('#b-generar');
  await page.waitForFunction(() => document.querySelector('#editor').value.includes('ESCENA 1'));
  assert.match(await page.textContent('#nota-modo'), /MODO PLANTILLAS/); assert.ok(await page.locator('.escenas tbody tr').count() >= 3);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#b-srt')]); assert.match(dl.suggestedFilename(), /\.srt$/);
  await page.screenshot({ path: SHOTS + '/esc-escritorio.png' });
  await page.selectOption('#f-tipo', 'x'); await page.fill('#f-tema', 'productividad'); await page.click('#b-generar');
  await page.waitForFunction(() => document.querySelector('#editor').value.startsWith('1.'));
  assert.ok(await page.locator('.post.x').count() >= 3);
  // 2 ajustes: clave cifrada
  await page.click('#tabs [data-ir=ajustes]'); await page.fill('#k-anthropic', 'sk-ant-FALSA'); await page.fill('#pw-anthropic', 'miPass'); await page.fill('#mo-anthropic', 'modelo-prueba');
  await page.click('[data-g=anthropic]'); await page.waitForSelector('text=clave cifrada');
  const alm = await page.evaluate(() => localStorage.getItem('contenido_escritor_claves_dispositivo')); assert.ok(alm && !alm.includes('FALSA'));
  await page.screenshot({ path: SHOTS + '/esc-ajustes.png', fullPage: true });
  // 3 recarga: IA con contraseña
  await page.goto(BASE); await page.waitForSelector('#f-tipo');
  assert.match(await page.textContent('#chip-modo'), /modelo-prueba/); assert.ok(await page.isChecked('#m-ia'));
  await page.selectOption('#f-tipo', 'guion'); await page.fill('#f-tema', 'café'); await page.click('#b-generar');
  await page.fill('#pw-in', 'mala'); await page.click('#pw-ok'); await page.waitForSelector('#pw-msg:has-text("incorrecta")');
  await page.fill('#pw-in', 'miPass'); await page.click('#pw-ok');
  await page.waitForFunction(() => document.querySelector('#editor').value.includes('Muele fresco'));
  assert.equal(visto.h['x-api-key'], 'sk-ant-FALSA'); assert.equal(visto.h['anthropic-dangerous-direct-browser-access'], 'true'); assert.equal(visto.b.model, 'modelo-prueba'); assert.match(visto.b.system, /no inventes/i);
  assert.match(await page.textContent('#chip-origen'), /anthropic · modelo-prueba/); assert.equal(await page.locator('.escenas tbody tr').count(), 2);
  // 4 error 401
  modo = '401'; await page.click('#b-generar'); await page.waitForSelector('#estado .aviso.mal'); assert.match(await page.textContent('#estado'), /Clave rechazada/);
  // 5 historial persiste
  await page.reload(); await page.waitForSelector('#f-tipo',{state:'attached'}); await page.click('#tabs [data-ir=historial]');
  assert.ok(await page.locator('#v-historial .item').count() >= 3);
  await page.screenshot({ path: SHOTS + '/esc-historial.png' });
  // marca
  await page.click('#tabs [data-ir=marcas]'); await page.fill('#mf-nombre', 'Mi Café'); await page.fill('#mf-evitar', 'barato'); await page.click('#m-form button[type=submit]'); await page.waitForSelector('[data-m]');
  await page.click('#tabs [data-ir=escribir]'); assert.equal(await page.locator('#f-marca option').count(), 2);
  // 6 móvil
  const m = await br.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }); const mp = await m.newPage();
  mp.on('console', x => { if (x.type() === 'error') errs.push(x.text()); });
  await mp.goto(BASE); await mp.waitForSelector('#f-tipo'); assert.ok(await mp.isVisible('#nav-inf'));
  assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mp.fill('#f-tema', 'ahorro'); await mp.click('#b-generar'); await mp.waitForFunction(() => document.querySelector('#editor').value.length > 10);
  await mp.screenshot({ path: SHOTS + '/esc-movil.png' }); await mp.click('#nav-inf [data-ir=ajustes]'); await mp.screenshot({ path: SHOTS + '/esc-movil-ajustes.png' });
  assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log(errs); assert.deepEqual(errs.filter(e => !/401/.test(e)), []);
  await br.close(); console.log('E2E OK');
})().catch(e => { console.error(e); process.exit(1); });
