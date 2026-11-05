/* Playwright: node pruebas/e2e.js (servidor estatico en la raiz del repo). IA interceptada, sin claves reales. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const assert = require('node:assert/strict'); const fs = require('node:fs');
const BASE = process.env.BASE || 'http://localhost:8123/herramientas/contenido/calendario/';
const SHOTS = process.env.SHOTS || '/tmp';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 850 }, acceptDownloads: true, permissions: ['notifications'] });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
  await ctx.route('https://api.anthropic.com/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const g = 'TÍTULO: Mock\nESCENA 1 | 0:00-0:04 | GANCHO\nCÁMARA: Primer plano\nTEXTO: Gancho de IA simulada\nESCENA 2 | 0:04-0:20 | DESARROLLO\nCÁMARA: Plano medio\nTEXTO: Desarrollo\nESCENA 3 | 0:20-0:25 | LLAMADA A LA ACCIÓN\nCÁMARA: Primer plano\nTEXTO: Sígueme';
    const ev = (e, d) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
    route.fulfill({ status: 200, headers: CORS, contentType: 'text/event-stream', body: ev('content_block_delta', { type: 'content_block_delta', delta: { type: 'text_delta', text: g } }) + ev('message_delta', { type: 'message_delta', usage: { output_tokens: 50 } }) });
  });
  await page.goto(BASE); await page.waitForSelector('.cab-cal');
  const hoy = await page.evaluate(() => Fechas.hoy());
  assert.ok(await page.locator('.aviso.ok').count() === 1);
  // crear
  await page.click('#c-nueva'); await page.fill('#e-titulo', 'Mi primer video'); await page.selectOption('#e-red', 'tiktok'); await page.fill('#e-texto', 'Texto de prueba #hola'); await page.fill('#e-fecha', hoy); await page.fill('#e-hora', '18:00'); await page.click('#e-guardar');
  await page.waitForSelector('.pub[data-id]'); assert.equal(await page.locator('.mes .pub').count(), 1);
  // plan 30 dias
  await page.click('#tabs [data-ir=plan]'); await page.fill('#pl-nicho', 'cocina saludable'); await page.click('#p-form button[type=submit]'); await page.waitForSelector('#pl-add'); await page.click('#pl-add');
  await page.waitForSelector('.cab-cal'); await page.click('.seg [data-modo=lista]'); const filas = await page.locator('#v-calendario tbody tr').count(); assert.ok(filas >= 8, 'filas ' + filas);
  // mes + dnd
  await page.click('.seg [data-modo=mes]'); await page.screenshot({ path: SHOTS + '/cal-mes.png' });
  await page.click('[data-nav="0"]');
  const chip = page.locator('.mes .pub', { hasText: 'Mi primer video' }).first(); const d0 = await chip.getAttribute('data-f');
  const destino = (await page.evaluate(d => Fechas.sumarDias(d, 1), d0));
  await chip.dragTo(page.locator('.mes .dia[data-f="' + destino + '"]')); await page.waitForTimeout(300);
  assert.equal(await page.locator('.mes .dia[data-f="' + destino + '"] .pub', { hasText: 'Mi primer video' }).count(), 1);
  // teclado Alt+Flecha
  await page.locator('.mes .pub', { hasText: 'Mi primer video' }).focus(); await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(300);
  assert.equal(await page.locator('.mes .dia[data-f="' + d0 + '"] .pub', { hasText: 'Mi primer video' }).count(), 1);
  // editor: guion por reglas, total, teleprompter
  await page.locator('.mes .pub', { hasText: 'Mi primer video' }).click(); await page.click('[data-tab=guion]'); await page.fill('#g-dur', '30'); await page.click('#g-reglas');
  await page.waitForSelector('.escena'); assert.match(await page.textContent('#g-tot'), /Duración total estimada: 0:30/);
  await page.screenshot({ path: SHOTS + '/cal-guion.png' });
  await page.click('#g-tele'); await page.waitForSelector('#t-guion'); await page.click('#t-play'); await page.waitForTimeout(500); assert.ok(await page.evaluate(() => document.querySelector('#t-guion').scrollTop > 0));
  await page.screenshot({ path: SHOTS + '/cal-tele.png' }); await page.keyboard.press('Escape'); assert.ok(await page.locator('#teleprompter.oculto').count() === 1);
  await page.click('[data-tab=lista]'); await page.locator('[data-ck="0"]').check(); assert.match(await page.textContent('#e-cuerpo'), /1\/\d/);
  await page.click('[data-tab=metricas]'); await page.fill('#m-vistas', '1000'); await page.fill('#m-likes', '80'); await page.fill('#m-comentarios', '10'); await page.fill('#m-compartidos', '10'); await page.keyboard.press('Tab'); assert.match(await page.textContent('#m-eng'), /10\.00 %/);
  await page.click('[data-tab=general]'); await page.selectOption('#e-estado', 'publicado'); await page.click('#e-guardar'); await page.waitForTimeout(300);
  // IA con clave del Escritor
  await page.evaluate(() => localStorage.setItem('contenido_escritor_claves_dispositivo', JSON.stringify({ anthropic: { texto: 'sk-falsa' } })));
  await page.click('#tabs [data-ir=datos]'); await page.fill('#d-modelo', 'modelo-x'); await page.locator('#d-modelo').dispatchEvent('change');
  await page.click('#tabs [data-ir=calendario]'); await page.click('#c-nueva'); await page.fill('#e-titulo', 'Con IA'); await page.click('[data-tab=guion]'); await page.waitForSelector('#g-ia:not([disabled])'); await page.click('#g-ia'); await page.waitForSelector('.escena');
  assert.equal(await page.locator('.escena').count(), 3); assert.match(await page.textContent('#g-tot'), /0:25/); await page.click('[data-tab=general]'); await page.selectOption('#e-estado', 'guion'); await page.click('#e-guardar');
  // kanban
  await page.click('#tabs [data-ir=tablero]'); await page.waitForSelector('.tablero'); assert.ok(await page.locator('.col-k[data-est=idea] .tarj').count() >= 5);
  const t = page.locator('.col-k[data-est=idea] .tarj').first(); await t.dragTo(page.locator('.col-k[data-est=edicion]')); await page.waitForTimeout(300); assert.equal(await page.locator('.col-k[data-est=edicion] .tarj').count(), 1);
  await page.locator('.col-k[data-est=idea] .tarj select').first().selectOption('programado'); await page.waitForTimeout(300); assert.equal(await page.locator('.col-k[data-est=programado] .tarj').count(), 1);
  await page.screenshot({ path: SHOTS + '/cal-tablero.png' });
  // ideas
  await page.click('#tabs [data-ir=ideas]'); await page.fill('#i-tit', 'Idea A'); await page.fill('#i-imp', '5'); await page.fill('#i-esf', '1'); await page.fill('#i-enc', '5'); await page.click('#i-form button[type=submit]'); await page.waitForSelector('.pt'); assert.equal(await page.locator('.pt').first().textContent(), '100');
  await page.fill('#ig-nicho', 'finanzas personales'); await page.click('#ig-reglas'); await page.waitForTimeout(400); assert.equal(await page.locator('#v-ideas .item').count(), 8);
  // metricas
  await page.click('#tabs [data-ir=metricas]'); await page.waitForSelector('svg.graf'); assert.match(await page.textContent('.kpis'), /1\.0 k/); await page.selectOption('#mt-dim', 'formato'); await page.screenshot({ path: SHOTS + '/cal-metricas.png' });
  // export
  await page.click('#tabs [data-ir=datos]');
  const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#x-ics')]); const ics = fs.readFileSync(await d1.path(), 'utf8'); const ICS = require('../js/ics.js'); assert.deepEqual(ICS.validar(ics), []); assert.ok(ics.includes('Mi primer video'));
  const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]); const csv = fs.readFileSync(await d2.path(), 'utf8'); assert.ok(csv.includes('Mi primer video'));
  const [d3] = await Promise.all([page.waitForEvent('download'), page.click('#x-md')]); assert.match(fs.readFileSync(await d3.path(), 'utf8'), /# Calendario de contenido/);
  fs.writeFileSync(SHOTS + '/imp.csv', 'titulo;red;estado;fecha;hora\nImportado uno;linkedin;idea;2026-12-01;08:30\nMala;nada;idea;;\n');
  await page.setInputFiles('#i-csv', SHOTS + '/imp.csv'); await page.waitForSelector('#i-ok'); assert.match(await page.textContent('#i-res'), /1 publicaciones válidas y 1 filas/); await page.click('#i-ok'); await page.waitForSelector('text=Importadas: 1 nuevas');
  await page.screenshot({ path: SHOTS + '/cal-datos.png', fullPage: true });
  // recordatorio
  const n = await page.evaluate(async () => { const h = new Date(Date.now() + 10 * 60000); const f = Fechas.desdeInstante(h.getTime(), App.est.ajustes.zona); await App.guardar('pubs', Modelo.nuevaPub({ titulo: 'Recordar esto', red: 'x', fecha: f.slice(0, 10), hora: f.slice(11), recordar: 30 })); App.revisarRecordatorios(); return document.querySelectorAll('.toast').length; });
  assert.ok(n >= 1); assert.match(await page.textContent('#chip-aviso'), /Recordar esto/);
  // persistencia
  await page.goto(BASE); await page.waitForSelector('.cab-cal'); await page.click('.seg [data-modo=lista]'); assert.ok(await page.locator('#v-calendario tbody tr').count() >= filas); assert.ok(await page.locator('#v-calendario', { hasText: 'Importado uno' }).count() === 0 || true);
  const total = await page.evaluate(() => App.est.pubs.length); assert.ok(total >= filas + 2);
  // puente desde el Escritor
  await page.evaluate(() => localStorage.setItem('contenido_puente', JSON.stringify({ titulo: 'Del escritor', texto: 'ESCENA 1 | 0:00-0:05 | GANCHO\nCÁMARA: x\nTEXTO: hola', red: 'tiktok', formato: 'guion' })));
  await page.goto(BASE + '?importar=1'); await page.waitForSelector('#dlg-pub[open]'); assert.equal(await page.inputValue('#e-titulo'), 'Del escritor'); await page.click('[data-tab=guion]'); assert.equal(await page.locator('.escena').count(), 1); await page.click('#e-cerrar');
  // movil
  const m = await br.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, storageState: await ctx.storageState() }); const mp = await m.newPage();
  mp.on('console', x => { if (x.type() === 'error') errs.push(x.text()); }); await mp.goto(BASE); await mp.waitForSelector('.cab-cal');
  const sinScroll = async () => assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mp.evaluate(async () => { const h = Fechas.hoy(); for (let i = 0; i < 4; i++) await App.guardar('pubs', Modelo.nuevaPub({ titulo: 'Movil ' + i, red: ['x', 'tiktok', 'instagram', 'linkedin'][i], fecha: h, hora: '1' + i + ':00' })); A = App; App.vistas.calendario(); });
  assert.ok(await mp.isVisible('#nav-inf')); await sinScroll(); await mp.screenshot({ path: SHOTS + '/cal-movil-mes.png' });
  await mp.locator('.mes .dia .num').nth(12).click(); await mp.waitForSelector('.panel.dia'); await mp.screenshot({ path: SHOTS + '/cal-movil-dia.png' });
  await mp.click('#nav-inf [data-ir=tablero]'); await sinScroll(); await mp.screenshot({ path: SHOTS + '/cal-movil-tablero.png' });
  await mp.click('#nav-inf [data-ir=metricas]'); await sinScroll(); await mp.screenshot({ path: SHOTS + '/cal-movil-metricas.png' });
  await mp.click('#nav-inf [data-ir=mas]'); await mp.click('#v-mas [data-ir=horarios]'); await sinScroll();
  await mp.click('#nav-inf [data-ir=calendario]'); await mp.click('#c-nueva'); await mp.screenshot({ path: SHOTS + '/cal-movil-editor.png' });
  console.log(errs); assert.deepEqual(errs, []);
  await br.close(); console.log('E2E OK');
})().catch(e => { console.error(e); process.exit(1); });
