// Utilidades Playwright para las pruebas e2e de Jardin Zombi 2 (node; Playwright via PW_PATH; servir el repo con python3 -m http.server 8765).
const path = process.env.PW_PATH || '/opt/node-tools/node_modules/playwright';
const { chromium } = require(path);
const BASE = process.env.BASE || 'http://localhost:8765';
async function abrir(vp, opts = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: vp, hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  if (opts.mando) await page.addInitScript(opts.mando);
  if (opts.antes) await page.addInitScript(opts.antes);
  await page.goto(BASE + '/juego/index.html'); await page.waitForTimeout(500);
  await page.evaluate(async () => { try { await window.Cuenta.registrar('tester' + Math.floor(Math.random() * 1e6), 'clave12345', { recordar: true }); } catch (e) { /* ya existe */ } });
  await page.goto(BASE + '/juego/jardin2/index.html'); await page.waitForSelector('#pantalla.on', { timeout: 20000 });
  return { browser, ctx, page, errores };
}
module.exports = { abrir, BASE };
