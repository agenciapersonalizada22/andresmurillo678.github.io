// Pruebas de navegador (Playwright): node herramientas/pizarra/pruebas/e2e.mjs [servidor]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://localhost:8123') + '/herramientas/pizarra/index.html';
const SH = '/tmp/claude-0/-home-user-andresmurillo678-github-io/b63b8b13-38da-562a-b68b-e4b16b772c42/scratchpad/shots/';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const errs = [];
async function nueva(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('pizarra_bienvenida', 'true'); } catch (e) {} });
  return p;
}
const abrir = async p => { await p.goto(BASE); await p.waitForSelector('body.listo'); await p.waitForTimeout(300); };
const objs = p => p.evaluate(() => { const d = window.__pizarra.doc; return d.lista(window.__pizarra.vista.pg).map(e => ({ id: e.id, tipo: e.v.tipo, fm: e.v.fm, x: Math.round(e.v.x), y: Math.round(e.v.y), w: Math.round(e.v.w), h: Math.round(e.v.h), texto: e.v.texto, color: e.v.color, rot: e.v.rot })); });
async function trazo(p, pts, opts = {}) {
  const r = await p.locator('#escena').boundingBox();
  await p.mouse.move(r.x + pts[0][0], r.y + pts[0][1]); await p.mouse.down();
  for (const [x, y] of pts.slice(1)) await p.mouse.move(r.x + x, r.y + y, { steps: opts.pasos || 2 });
  if (opts.espera) await p.waitForTimeout(opts.espera);
  await p.mouse.up();
}
const herr = (p, h) => p.click(`[data-herr=${h}]`);

// ===== escritorio 1024x768 =====
{
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await nueva(ctx); await abrir(p);
  await p.evaluate(() => { indexedDB.deleteDatabase; });
  const circ = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; circ.push([500 + 90 * Math.cos(a), 300 + 90 * Math.sin(a)]); }
  await herr(p, 'pluma');
  await trazo(p, circ, { espera: 900 });
  let o = await objs(p);
  ok(o.length === 1 && o[0].tipo === 'forma' && o[0].fm === 'elipse', 'lápiz + mantener: el círculo se reconoce como elipse (' + JSON.stringify(o.map(x => x.fm)) + ')');
  await trazo(p, [[300, 450], [330, 480], [380, 500], [450, 470], [520, 520], [600, 500]]);
  o = await objs(p); ok(o.length === 2 && o[1].tipo === 'trazo', 'trazo libre creado');
  await p.keyboard.press('Control+z'); o = await objs(p); ok(o.length === 1, 'Ctrl+Z deshace el trazo');
  await p.keyboard.press('Control+y'); o = await objs(p); ok(o.length === 2, 'Ctrl+Y lo rehace');
  // nota
  await p.keyboard.press('n');
  const r = await p.locator('#escena').boundingBox();
  await p.mouse.click(r.x + 200, r.y + 200);
  await p.waitForSelector('.editor-texto');
  await p.keyboard.type('Hola equipo'); await p.keyboard.press('Escape');
  o = await objs(p); ok(o.some(x => x.tipo === 'nota' && x.texto === 'Hola equipo'), 'nota adhesiva con texto');
  // texto
  await p.keyboard.press('t'); await p.mouse.click(r.x + 700, r.y + 150); await p.waitForSelector('.editor-texto');
  await p.keyboard.type('Titulo'); await p.keyboard.press('Control+Enter');
  o = await objs(p); ok(o.some(x => x.tipo === 'texto' && x.texto === 'Titulo'), 'cuadro de texto');
  // forma rect con el selector de formas
  await herr(p, 'forma'); await p.click('[data-v=rect]'); await trazo(p, [[600, 350], [760, 450]]);
  o = await objs(p); ok(o.some(x => x.fm === 'rect'), 'rectángulo arrastrando');
  // seleccionar y mover
  await herr(p, 'sel'); await p.mouse.click(r.x + 600, r.y + 350);
  const antes = (await objs(p)).find(x => x.fm === 'rect');
  await trazo(p, [[600, 350], [640, 380], [700, 420]]);
  const desp = (await objs(p)).find(x => x.fm === 'rect');
  ok(desp.x - antes.x > 60 && desp.y - antes.y > 50, 'seleccionar y mover objeto');
  await p.keyboard.press('Control+d'); o = await objs(p); ok(o.filter(x => x.fm === 'rect').length === 2, 'duplicar (Ctrl+D)');
  await p.keyboard.press('Delete'); o = await objs(p); ok(o.filter(x => x.fm === 'rect').length === 1, 'borrar selección');
  // borrador por trazo
  await herr(p, 'borrador'); await trazo(p, [[300, 450], [600, 500]]);
  o = await objs(p); ok(!o.some(x => x.tipo === 'trazo'), 'borrador por trazo elimina el trazo');
  // zoom con rueda
  const z0 = await p.evaluate(() => window.__pizarra.vista.cam.z);
  await p.mouse.move(r.x + 400, r.y + 300); await p.mouse.wheel(0, -300);
  const z1 = await p.evaluate(() => window.__pizarra.vista.cam.z); ok(z1 > z0 * 1.2, 'rueda hace zoom');
  // paginas
  await p.keyboard.press('0');
  await p.click('.pagInfo'); await p.click('text=Añadir página');
  const np = await p.evaluate(() => window.__pizarra.doc.paginas().length); ok(np === 2, 'añadir página');
  await p.click('[aria-label="Página anterior"]'); o = await objs(p); ok(o.length >= 4, 'navegar a la página 1 conserva su contenido');
  // fondo oscuro + plantilla
  await p.evaluate(() => window.__pizarra.cambiarPagina({ fondo: 'oscuro' }));
  await p.waitForTimeout(200);
  await p.screenshot({ path: SH + 'e2e_escritorio.png' });
  await p.evaluate(() => window.__pizarra.cambiarPagina({ fondo: 'cuadriculado' }));
  // recarga sin pérdida
  const antesRec = await objs(p); await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('body.listo'); await p.waitForTimeout(500);
  const trasRec = await objs(p);
  ok(trasRec.length === antesRec.length && JSON.stringify(trasRec.map(x => x.id).sort()) === JSON.stringify(antesRec.map(x => x.id).sort()), `recarga sin pérdida (${trasRec.length} objetos)`);
  ok(await p.evaluate(() => window.__pizarra.doc.paginas().length) === 2, 'páginas conservadas tras recargar');
  // exportar
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => window.__pizarra.exportarPNG())]);
  ok(/\.png$/.test(dl.suggestedFilename()), 'descarga PNG ' + dl.suggestedFilename());
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => window.__pizarra.exportarPDF())]);
  const pdfPath = await dl2.path(); const fs = await import('fs'); const pdf = fs.readFileSync(pdfPath, 'latin1');
  ok(pdf.startsWith('%PDF') && /\/Count 2/.test(pdf) && pdf.includes('/DCTDecode'), 'PDF de 2 páginas generado');
  const [dl3] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => window.__pizarra.exportarSVG())]);
  const svg = fs.readFileSync(await dl3.path(), 'utf8'); ok(svg.includes('<svg') && svg.includes('Hola equipo'), 'SVG con contenido');
  // plantilla
  await p.evaluate(() => window.__pizarra.aplicarPlantilla(window.__pizarra.constructor === Object ? null : null, false)).catch(() => {});
  // historial de versiones
  await p.evaluate(() => window.__pizarra.guardarVersion('prueba'));
  const antesV = (await objs(p)).length;
  await p.evaluate(() => { const a = window.__pizarra; a.herr.ponerSel(a.doc.lista(a.vista.pg).map(e => e.id)); a.herr.borrarSel(); });
  ok((await objs(p)).length === 0, 'borrar todo');
  const vs = await p.evaluate(async () => { const m = await import('./js/almacen.js'); return m.versiones(window.__pizarra.tableroId); });
  await p.evaluate(k => window.__pizarra.restaurarVersion(k), vs[0].k);
  ok((await objs(p)).length === antesV, 'restaurar versión devuelve el contenido (' + antesV + ')');
  await ctx.close();
}

// ===== móvil 390x780 táctil =====
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await nueva(ctx); await abrir(p);
  await p.screenshot({ path: SH + 'e2e_movil.png' });
  const cdp = await ctx.newCDPSession(p);
  const toque = async (tipo, pts) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  // un dedo dibuja
  const base = await p.locator('#escena').boundingBox();
  await toque('touchStart', [[120, 250]]);
  for (let i = 1; i <= 12; i++) await toque('touchMove', [[120 + i * 15, 250 + Math.sin(i / 2) * 30]]);
  await toque('touchEnd', []);
  let o = await objs(p); ok(o.length === 1 && o[0].tipo === 'trazo', 'un dedo dibuja un trazo en 390x780');
  // pellizco
  const z0 = await p.evaluate(() => window.__pizarra.vista.cam.z);
  await toque('touchStart', [[150, 400], [250, 400]]);
  for (let i = 1; i <= 8; i++) await toque('touchMove', [[150 - i * 12, 400], [250 + i * 12, 400]]);
  await toque('touchEnd', []);
  const z1 = await p.evaluate(() => window.__pizarra.vista.cam.z); ok(z1 > z0 * 1.4, 'pellizco de dos dedos hace zoom');
  o = await objs(p); ok(o.length === 1, 'el pellizco no dibuja');
  await p.click('[data-herr=pluma]'); await p.waitForTimeout(200);
  await p.screenshot({ path: SH + 'e2e_movil_props.png' });
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth); ok(ancho <= 390, 'sin desbordamiento horizontal en móvil');
  await ctx.close();
}

// ===== mando =====
{
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await nueva(ctx);
  await p.addInitScript(() => {
    window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [{ connected: true, id: 'Xbox Wireless Controller', axes: window.__pad.axes, buttons: window.__pad.buttons, mapping: 'standard' }];
  });
  await abrir(p);
  const set = (btn, v) => p.evaluate(([i, v]) => { window.__pad.buttons[i] = { pressed: v, value: v ? 1 : 0 }; }, [btn, v]);
  await p.evaluate(() => { window.__pad.axes = [0.9, 0.2, 0, 0]; }); await p.waitForTimeout(250);
  await set(0, true);
  await p.evaluate(() => { window.__pad.axes = [0.5, 0.9, 0, 0]; }); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await set(0, false); await p.waitForTimeout(200);
  let o = await objs(p); ok(o.length >= 1, 'A dibuja con el cursor del stick (' + o.length + ' objeto)');
  await set(5, true); await p.waitForTimeout(100); await set(5, false); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__pizarra.doc.paginas().length) === 1, 'RB sin siguiente página no rompe');
  await set(9, true); await p.waitForTimeout(100); await set(9, false); await p.waitForTimeout(200);
  ok(await p.locator('.modal').count() === 1, 'MENU abre el menú');
  await set(1, true); await p.waitForTimeout(100); await set(1, false); await p.waitForTimeout(200);
  ok(await p.locator('.modal').count() === 0, 'B cierra el menú');
  await set(1, true); await p.waitForTimeout(100); await set(1, false); await p.waitForTimeout(200);
  o = await objs(p); ok(o.length === 0, 'B deshace');
  await ctx.close();
}
console.log(errs.length ? 'ERRORES DE CONSOLA:\n' + errs.join('\n') : 'sin errores de consola');
if (errs.length) fallos++;
await b.close();
console.log(fallos ? fallos + ' FALLOS' : 'Todo correcto'); process.exit(fallos ? 1 : 0);
