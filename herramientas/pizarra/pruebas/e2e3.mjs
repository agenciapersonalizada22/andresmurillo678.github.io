// Recorte de imagen, rechazo de palma con lápiz, navegación con mando en menús, ajustes y tema oscuro.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://localhost:8123') + '/herramientas/pizarra/index.html';
const SH = '/tmp/claude-0/-home-user-andresmurillo678-github-io/b63b8b13-38da-562a-b68b-e4b16b772c42/scratchpad/shots/';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errs = [];
async function pagina(vp, extra = {}, init) {
  const ctx = await b.newContext({ viewport: vp, ...extra }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => localStorage.setItem('pizarra_bienvenida', 'true')); if (init) await p.addInitScript(init);
  await p.goto(BASE); await p.waitForSelector('body.listo'); await p.waitForTimeout(300); return p;
}
{
  const p = await pagina({ width: 1024, height: 768 });
  // recorte
  const id = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#f90'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#06c'; x.fillRect(200, 0, 200, 300); const a = window.__pizarra; a.herr.insertarImagen(c.toDataURL('image/png'), 400, 300); return [...a.herr.sel][0]; });
  const w0 = await p.evaluate(id => window.__pizarra.doc.obj(id).v.w, id);
  await p.click('[title="Recortar"], [aria-label="Recortar"]');
  await p.locator('.modal input[type=range]').first().fill('40');
  const v = await p.evaluate(id => { const e = window.__pizarra.doc.obj(id).v; return { w: e.w, rec: e.rec }; }, id);
  ok(v.w < w0 * 0.7 && v.rec[0] > 0.35, `recorte simple: ancho ${Math.round(w0)} -> ${Math.round(v.w)}`);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+z'); ok(await p.evaluate(id => Math.abs(window.__pizarra.doc.obj(id).v.w - 0) > 0, id), 'deshacer tras recortar no rompe');
  // ajustes y pestañas
  await p.click('[aria-label="Ajustes"]'); await p.click('.tab:has-text("Accesibilidad")');
  await p.selectOption('.modal select >> nth=0', 'oscuro'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.dataset.tema) === 'oscuro', 'tema oscuro desde Accesibilidad');
  await p.screenshot({ path: SH + 'ajustes_oscuro.png' });
  await p.click('.tab:has-text("Controles")'); await p.screenshot({ path: SH + 'ajustes_controles.png' });
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pizarra_ajustes_dispositivo')).calidad !== undefined && JSON.parse(localStorage.getItem('pizarra_ajustes')).tema === 'oscuro'), 'ajustes en claves separadas (general y de dispositivo)');
  await p.close();
}
{ // palma + lápiz
  const p = await pagina({ width: 1024, height: 768 });
  const r = await p.locator('#escena').boundingBox();
  const n0 = await p.evaluate(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg).length);
  await p.evaluate(() => {
    const el = document.querySelector('#escena'), rr = el.getBoundingClientRect();
    const ev = (t, id, tipo, x, y, extra = {}) => el.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: tipo, clientX: rr.left + x, clientY: rr.top + y, pressure: 0.6, bubbles: true, isPrimary: true, width: 2, height: 2, ...extra }));
    ev('pointerdown', 1, 'pen', 300, 300); for (let i = 1; i < 12; i++) ev('pointermove', 1, 'pen', 300 + i * 10, 300 + i * 3); ev('pointerup', 1, 'pen', 410, 333);
    ev('pointerdown', 2, 'touch', 500, 400); for (let i = 1; i < 12; i++) ev('pointermove', 2, 'touch', 500 + i * 10, 400); ev('pointerup', 2, 'touch', 610, 400);
    ev('pointerdown', 3, 'touch', 600, 500, { width: 80, height: 80 }); for (let i = 1; i < 12; i++) ev('pointermove', 3, 'touch', 600 + i * 10, 500, { width: 80, height: 80 }); ev('pointerup', 3, 'touch', 710, 500, { width: 80, height: 80 });
  });
  const n1 = await p.evaluate(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg).length);
  ok(n1 === n0 + 1, 'rechazo de palma: el lápiz dibuja, el dedo no (' + n0 + ' -> ' + n1 + ')');
  await p.close();
}
{ // mando en menús: cruceta mueve el foco, A acepta
  const p = await pagina({ width: 1024, height: 768 }, {}, () => {
    window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [{ connected: true, id: 'Xbox Wireless Controller', axes: window.__pad.axes, buttons: window.__pad.buttons, mapping: 'standard' }];
  });
  const tap = async i => { await p.evaluate(i => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(90); await p.evaluate(i => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(90); };
  await tap(9); ok(await p.locator('.menu-mando').count() === 1, 'MENU abre el menú del mando');
  await p.screenshot({ path: SH + 'mando_menu.png' });
  await tap(13); await tap(15); await tap(0);   // abajo, derecha, A
  await p.waitForTimeout(200);
  ok(await p.locator('.menu-mando').count() === 0, 'cruceta + A activan un botón del menú');
  const h = await p.evaluate(() => window.__pizarra.herr.herr);
  console.log('   herramienta tras navegar:', h);
  await tap(5); await tap(4);   // RB / LB
  await p.evaluate(() => window.__pizarra.nuevaPagina()); await tap(4); ok(await p.evaluate(() => window.__pizarra.doc.paginas().findIndex(x => x.id === window.__pizarra.vista.pg)) === 0, 'LB vuelve a la página anterior');
  await tap(5); ok(await p.evaluate(() => window.__pizarra.doc.paginas().findIndex(x => x.id === window.__pizarra.vista.pg)) === 1, 'RB avanza de página');
  await p.close();
}
{ // móvil oscuro
  const p = await pagina({ width: 390, height: 780 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2, colorScheme: 'dark' });
  await p.screenshot({ path: SH + 'movil_oscuro.png' });
  await p.click('[aria-label="Menú principal"]'); await p.screenshot({ path: SH + 'movil_menu.png' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'móvil: sin desbordamiento');
  await p.close();
}
console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'sin errores de consola'); if (errs.length) fallos++;
await b.close(); console.log(fallos ? fallos + ' FALLOS' : 'Todo correcto'); process.exit(fallos ? 1 : 0);
