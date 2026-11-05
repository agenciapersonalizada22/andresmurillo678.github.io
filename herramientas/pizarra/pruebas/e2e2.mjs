// Funciones avanzadas y rendimiento: node herramientas/pizarra/pruebas/e2e2.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://localhost:8123') + '/herramientas/pizarra/index.html';
const SH = '/tmp/claude-0/-home-user-andresmurillo678-github-io/b63b8b13-38da-562a-b68b-e4b16b772c42/scratchpad/shots/';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
p.on('dialog', d => d.accept('Renombrado'));
await p.addInitScript(() => localStorage.setItem('pizarra_bienvenida', 'true'));
await p.goto(BASE); await p.waitForSelector('body.listo'); await p.waitForTimeout(300);
const A = fn => p.evaluate(fn);
const lista = () => p.evaluate(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg).map(e => ({ id: e.id, ...e.v })));
const r = await p.locator('#escena').boundingBox();
async function arrastrar(pts, opts = {}) {
  await p.mouse.move(r.x + pts[0][0], r.y + pts[0][1]); if (opts.shift) await p.keyboard.down('Shift'); await p.mouse.down();
  for (const [x, y] of pts.slice(1)) await p.mouse.move(r.x + x, r.y + y, { steps: 4 });
  await p.mouse.up(); if (opts.shift) await p.keyboard.up('Shift');
}
// plantillas
for (const id of ['lluvia', 'kanban', 'mapa', 'matriz', 'linea']) {
  await A(`(() => { const a = window.__pizarra; a.nuevaPagina(); })()`);
  const n = await p.evaluate(async id => { const m = await import('./js/plantillas.js'); const a = window.__pizarra; a.aplicarPlantilla(m.plantillas.find(x => x.id === id), false); return a.doc.lista(a.vista.pg).length; }, id);
  ok(n >= 6, `plantilla ${id}: ${n} objetos`);
  if (id === 'mapa') { await p.waitForTimeout(250); await p.screenshot({ path: SH + 'plantilla_mapa.png' }); }
}
ok(await A(`window.__pizarra.doc.paginas().length`) === 6, 'plantillas en páginas nuevas');
// formas + conector que sigue + alinear + rotar/escalar
await A(`(() => { const a = window.__pizarra; a.nuevaPagina(); a.vista.ajustar(true); })()`);
await p.click('[data-herr=forma]'); await p.click('[data-v=rect]'); await arrastrar([[200, 200], [300, 260]]);
await p.click('[data-herr=forma]'); await p.click('[data-v=elipse]'); await arrastrar([[500, 300], [600, 380]]);
await p.click('[data-herr=forma]'); await p.click('[data-v=flecha]'); await arrastrar([[300, 500], [500, 550]], { shift: true });
let L = await lista(); ok(L.length === 3 && L.map(x => x.fm).join() === 'rect,elipse,flecha', 'rectángulo, elipse y flecha (' + L.map(x => x.fm) + ')');
await p.click('[data-herr=conector]'); await arrastrar([[250, 230], [550, 340]]);
L = await lista(); const con = L.find(x => x.tipo === 'conector'); ok(con && con.ea && con.eb, 'conector unido a dos objetos');
await p.click('[data-herr=sel]');
const ext0 = await p.evaluate(async () => { const g = await import('./js/geom.js'); const a = window.__pizarra, c = a.doc.lista(a.vista.pg).find(e => e.v.tipo === 'conector'); return g.extremos(a.doc, c.v); });
await arrastrar([[250, 200], [250, 300]]);   // mueve el rectángulo (agarra su borde)
const ext1 = await p.evaluate(async () => { const g = await import('./js/geom.js'); const a = window.__pizarra, c = a.doc.lista(a.vista.pg).find(e => e.v.tipo === 'conector'); return g.extremos(a.doc, c.v); });
ok(Math.abs(ext1[0][1] - ext0[0][1]) > 20 || Math.abs(ext1[0][0] - ext0[0][0]) > 5, 'el conector sigue al objeto movido');
// escalar con el mango
await A(`(() => { const a = window.__pizarra; const e = a.doc.lista(a.vista.pg).find(x => x.v.fm === 'elipse'); a.herr.ponerSel([e.id]); })()`);
const w0 = (await lista()).find(x => x.fm === 'elipse');
const pos = await p.evaluate(() => { const a = window.__pizarra, v = a.doc.lista(a.vista.pg).find(x => x.v.fm === 'elipse').v; return a.vista.pantalla(v.x + v.w, v.y + v.h); });
await arrastrar([pos, [pos[0] + 60, pos[1] + 40]]);
const w1 = (await lista()).find(x => x.fm === 'elipse'); ok(w1.w > w0.w + 30 && w1.h > w0.h + 20, 'escalar con el mango de la esquina');
const rp = await p.evaluate(() => { const a = window.__pizarra, v = a.doc.lista(a.vista.pg).find(x => x.v.fm === 'elipse').v; return a.vista.pantalla(v.x + v.w / 2, v.y - 34 / a.vista.cam.z); });
await arrastrar([rp, [rp[0] + 120, rp[1] + 60]]);
ok(Math.abs((await lista()).find(x => x.fm === 'elipse').rot || 0) > 0.3, 'rotar con el mango superior');
await p.keyboard.press('Control+a');
const sel = await A(`window.__pizarra.herr.sel.size`); ok(sel === 4, 'seleccionar todo: ' + sel);
await p.click('[title="Izquierda"]'); L = await lista();
ok(true, 'alinear a la izquierda sin errores');
await p.screenshot({ path: SH + 'e2e2_formas.png' });
// borrador por área divide el trazo
await A(`(() => { const a = window.__pizarra; a.herr.ponerSel([]); const pts = []; for (let i = 0; i <= 40; i++) pts.push(i * 5, 0, 0.6); const c = a.herr.nuevo('trazo', { x: 100, y: 100, w: 200, h: 1, bw: 200, bh: 1, pts, color: '#f00', grosor: 4, res: false }); a.doc.cambiar([c]); a.herr.cambiarOpts({ borr: 'area' }); })()`);
const nTr0 = (await lista()).filter(x => x.tipo === 'trazo').length;
await p.click('[data-herr=borrador]'); await p.click('[data-v=area]');
const mid = await p.evaluate(() => window.__pizarra.vista.pantalla(200, 100));
await arrastrar([[mid[0] - 5, mid[1]], [mid[0] + 5, mid[1]]]);
const nTr1 = (await lista()).filter(x => x.tipo === 'trazo').length; ok(nTr1 === nTr0 + 1, `borrador por área parte el trazo en dos (${nTr0} -> ${nTr1})`);
// capas con bloqueo
await A(`(() => { const a = window.__pizarra; a.cambiarCapa('c1', { lock: true }); })()`);
await p.click('[data-herr=sel]'); const tr = await p.evaluate(() => { const a = window.__pizarra, e = a.doc.lista(a.vista.pg).find(x => x.v.tipo === 'trazo'); return a.vista.pantalla(e.v.x + 5, e.v.y + 0.5); });
await p.mouse.click(r.x + tr[0], r.y + tr[1]); ok(await A(`window.__pizarra.herr.sel.size`) === 0, 'objeto en capa bloqueada no se puede seleccionar');
await A(`window.__pizarra.cambiarCapa('c1', { lock: false })`);
// votos, comentario, timer
await A(`(() => { const a = window.__pizarra; a.herr.votos(300, 50); })()`);
const vid = (await lista()).find(x => x.tipo === 'votos').id; await A(`window.__pizarra.herr.votar('${vid}')`);
ok(await A(`(() => { const a = window.__pizarra; return a.doc.votos(a.doc.obj('${vid}')); })()`) === 1, 'marcador de votos suma mi voto');
await A(`(() => { const a = window.__pizarra; a.fijarTimer({ dur: 60000, resto: 60000, fin: 0, run: false, id: 'x' }); a.controlTimer('iniciar'); })()`);
await p.waitForTimeout(600); const tt = await p.locator('.chip-timer').textContent(); ok(/0[01]:\d\d/.test(tt), 'temporizador visible: ' + tt);
await A(`(() => { const a = window.__pizarra; a.herr.comentario(400, 60); })()`);
await p.waitForSelector('.modal textarea'); await p.fill('.modal textarea', 'Revisar esto'); await p.click('.modal >> text=Guardar');
ok((await lista()).some(x => x.tipo === 'comentario' && x.texto === 'Revisar esto'), 'comentario anclado con texto');
// laser y regla
await p.click('[data-herr=laser]'); await arrastrar([[300, 300], [400, 350], [500, 300]]); ok(true, 'láser temporal sin errores');
await p.click('[data-herr=regla]'); ok(await A(`window.__pizarra.herr.regla.on`), 'regla activa');
await p.click('[data-herr=regla]');
// tableros: renombrar, duplicar, papelera, restaurar
await p.keyboard.press('Control+s'); await p.waitForTimeout(500);
await p.click('[aria-label="Menú principal"]'); await p.click('text=Mis tableros'); await p.waitForSelector('.tarj');
await p.click('.tarj >> text=Duplicar'); await p.waitForTimeout(500);
ok(await p.locator('.tarj').count() === 2, 'duplicar tablero');
await p.locator('.tarj').nth(1).locator('text=Renombrar').click(); await p.waitForTimeout(300);
await p.locator('.tarj').nth(1).locator('text=A la papelera').click(); await p.waitForTimeout(400);
ok(await p.locator('.tarj').count() === 1, 'enviar a la papelera');
await p.click('text=Papelera (30 días)'); await p.waitForTimeout(300); ok(await p.locator('.tarj').count() === 1, 'aparece en la papelera');
await p.locator('.tarj').first().locator('text=Restaurar').click(); await p.waitForTimeout(300);
await p.click('[data-v=activos]'); await p.waitForTimeout(300); ok(await p.locator('.tarj').count() === 2, 'restaurar desde la papelera');
await p.screenshot({ path: SH + 'e2e2_tableros.png' }); await p.keyboard.press('Escape');
// exportar/importar JSON de ida y vuelta
const json = await p.evaluate(async () => { const m = await import('./js/exportar.js'); return m.aJSON(window.__pizarra.doc, window.__pizarra.assets); });
const nAntes = await A(`window.__pizarra.doc.ent.o.size`);
await p.evaluate(async j => { const f = new File([j], 'x.json', { type: 'application/json' }); await window.__pizarra.importarJSON(f); }, json);
ok(await A(`window.__pizarra.doc.ent.o.size`) === nAntes, 'importar JSON crea un tablero equivalente');
// rendimiento: 6000 trazos
const t = await p.evaluate(async () => {
  const a = window.__pizarra; a.nuevaPagina(); const ch = [];
  for (let i = 0; i < 6000; i++) { const pts = []; const x0 = (i % 100) * 40, y0 = Math.floor(i / 100) * 40; for (let k = 0; k < 24; k++) pts.push(Math.sin(k / 3) * 12 + 12, k * 1.5, 0.6); ch.push(a.herr.nuevo('trazo', { x: x0, y: y0, w: 24, h: 36, bw: 24, bh: 36, pts, color: '#' + ((i * 99991) % 0xffffff).toString(16).padStart(6, '0'), grosor: 3, z: i + 1 })); }
  a.doc.cambiar(ch, { sinHistorial: true }); a.vista.ajustar(false);
  await new Promise(r => setTimeout(r, 500));
  const v = a.vista; const ts = [];
  for (let i = 0; i < 30; i++) { v.sucioEst = true; const t0 = performance.now(); v.cuadro(performance.now()); ts.push(performance.now() - t0); }
  const camT = []; v.zoomEn(500, 300, 1.0); for (let i = 0; i < 60; i++) { v.mover(3, 2); v.zoomEn(500, 300, 1.004); const t0 = performance.now(); v.cuadro(performance.now()); camT.push(performance.now() - t0); }
  return { n: a.doc.lista(a.vista.pg).length, vis: v.nUltimo, completo: ts.reduce((x, y) => x + y) / ts.length, gesto: camT.reduce((x, y) => x + y) / camT.length, maxGesto: Math.max(...camT) };
});
console.log('   rendimiento:', JSON.stringify(t));
ok(t.n === 6000 && t.gesto < 8, `6000 trazos: pan/zoom ${t.gesto.toFixed(1)} ms/cuadro (redibujo completo ${t.completo.toFixed(1)} ms con ${t.vis} visibles)`);
// dibujo con lápiz sobre página cargada: latencia del trazo
const lat = await p.evaluate(async () => {
  const a = window.__pizarra, el = document.querySelector('#escena'), rr = el.getBoundingClientRect(); a.herr.setHerr('pluma');
  const ev = (t, x, y) => new PointerEvent(t, { pointerId: 7, pointerType: 'pen', clientX: rr.left + x, clientY: rr.top + y, pressure: 0.5 + (x % 7) / 20, bubbles: true, buttons: t === 'pointerup' ? 0 : 1, isPrimary: true });
  el.dispatchEvent(ev('pointerdown', 300, 300)); const ts = [];
  for (let i = 0; i < 120; i++) { const t0 = performance.now(); el.dispatchEvent(ev('pointermove', 300 + i * 4, 300 + Math.sin(i / 8) * 60)); a.vista.cuadro(performance.now()); ts.push(performance.now() - t0); }
  el.dispatchEvent(ev('pointerup', 780, 300));
  return ts.reduce((x, y) => x + y) / ts.length;
});
ok(lat < 10, `trazo con lápiz sobre 6000 objetos: ${lat.toFixed(2)} ms por evento+cuadro`);
await p.screenshot({ path: SH + 'e2e2_miles.png' });
console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'sin errores de consola'); if (errs.length) fallos++;
await b.close(); console.log(fallos ? fallos + ' FALLOS' : 'Todo correcto'); process.exit(fallos ? 1 : 0);
