// E2E con Playwright:  PW_PATH=/ruta/playwright node e2e.cjs [escenario...]  (sirve el repo con: python3 -m http.server 8765)
const { abrir } = require('./e2e-lib.cjs');
const CAP = process.env.CAP || '/tmp/jardin1-cap/';
require('fs').mkdirSync(CAP, { recursive: true });
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };

const MANDO = `(() => { const pad = { id: 'Xbox 360 Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 }; window.__pad = pad; navigator.getGamepads = () => [pad]; window.__btn = (i, d) => { pad.buttons[i] = { pressed: !!d, value: d ? 1 : 0 }; }; })();`;
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, VISTA: 8, MENU: 9, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };
async function pulsar(page, nombre, ms = 120) { await page.evaluate((i) => window.__btn(i, true), B[nombre]); await page.waitForTimeout(ms); await page.evaluate((i) => window.__btn(i, false), B[nombre]); await page.waitForTimeout(ms); }

async function geom(page) {
  const d = await page.evaluate(() => { const c = document.getElementById('lienzo'), r = c.getBoundingClientRect(), v = document.body.textContent.includes('Duelo') || !!(__j1.juego() && __j1.juego().niv.tipo === 'versus'), L = window.__layout(r.width, r.height, v); const sl = {}, zb = {}; for (let n = 1; n <= 9; n++) { sl[n] = []; zb[n] = []; for (let i = 0; i < n; i++) { sl[n].push(L.slot(i, n)); zb[n].push(L.zb(i, n)); } } const o = { ...L, sl, zbm: zb }; delete o.slot; delete o.zb; return { L: o, x: r.left, y: r.top }; });
  const zbm = d.L.zbm, slm = d.L.sl; d.L.slot = (i, n) => slm[n][i]; d.L.zb = (i, n) => zbm[n][i];
  return d;
}
const P = (g, x, y) => [g.x + g.L.ox + x * g.L.esc, g.y + g.L.oy + y * g.L.esc];
async function toqueV(page, g, x, y, mouse) { const [px, py] = P(g, x, y); if (mouse) await page.mouse.click(px, py); else await page.touchscreen.tap(px, py); }
const celda = (g, r, c) => [g.L.bx + (c + 0.5) * g.L.cw, g.L.by + (r + 0.5) * g.L.ch];
const estado = (page) => page.evaluate(() => { const j = __j1.juego(); if (!j) return null; const s = j.s; return { sol: s.sol, t: s.t, fin: s.fin, plantas: s.plantas.map((p) => [p.id, p.r, p.c]), zombis: s.zombis.filter((z) => z.estado !== 'muere').map((z) => [z.tipo, z.r, +z.x.toFixed(2)]), soles: s.soles.map((q) => [q.x, q.y]), olaIdx: s.olaIdx, olas: s.olas.length, cola: s.cola.slice(), matados: s.stats.matados }; });

async function jugarPorUI(page, g, opts = {}) { // bot que juega 1-1 solo con toques
  const mouse = opts.mouse; let t0 = Date.now();
  while (Date.now() - t0 < (opts.max || 150000)) {
    const e = await estado(page); if (!e || e.fin) return e;
    for (const [x, y] of e.soles.slice(0, 3)) { await toqueV(page, g, g.L.bx + x * g.L.cw, g.L.by + y * g.L.ch, mouse); }
    const filas = [...new Set(e.zombis.map((z) => z[1]))];
    const tiros = e.plantas.filter((p) => p[0] === 'dispa').length;
    if (e.sol >= 100 && (filas.length || tiros < 1)) {
      const fila = filas.length ? filas.find((r) => !e.plantas.some((p) => p[1] === r && p[0] === 'dispa')) : 2;
      if (fila != null) { const sl = g.L.slot(0, 1); await toqueV(page, g, sl.x + sl.w / 2, sl.y + sl.h / 2, mouse); const [cx, cy] = celda(g, fila, 2 + (tiros % 2)); await toqueV(page, g, cx, cy, mouse); }
    }
    await page.waitForTimeout(250);
  }
  return estado(page);
}
const clic = async (page, sel) => { await page.click(sel); await page.waitForTimeout(250); };

const ESC = {
  async movil_h() { // 780x390 tactil: nivel completo 1-1
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await page.screenshot({ path: CAP + 'h_menu.png' });
    await clic(page, '[data-test=aventura]'); await page.screenshot({ path: CAP + 'h_mapa.png' });
    await clic(page, '[data-test=nivel-1-1]'); await page.screenshot({ path: CAP + 'h_previo.png' });
    await clic(page, '[data-test=empezar]'); await page.waitForTimeout(800);
    await page.evaluate(() => __j1.juego().setVel(2));
    const g = await geom(page); await page.screenshot({ path: CAP + 'h_juego0.png' });
    let capt = false; const t0 = Date.now(); let e;
    while (Date.now() - t0 < 200000) { e = await jugarPorUI(page, g, { max: 12000 }); if (e && e.fin) break; if (!capt) { await page.screenshot({ path: CAP + 'h_juego1.png' }); capt = true; } }
    ok(e && e.fin === 'victoria', 'nivel 1-1 completo con toques (780x390), t=' + (e && e.t.toFixed(0)));
    await page.waitForSelector('[data-test=siguiente]', { timeout: 15000 }); await page.screenshot({ path: CAP + 'h_victoria.png' });
    const pr = await page.evaluate(() => __j1.PR().hechos['1-1']); ok(pr && pr.e >= 1, 'progreso guardado con estrellas ' + JSON.stringify(pr));
    ok(await page.evaluate(() => !!__j1.PR().logros.primera_victoria), 'logro primera_victoria');
    ok(await page.evaluate(() => __j1.PR().monedas > 0), 'monedas ganadas');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async derrota_continuar() { // 780x390: derrota y recarga con Continuar
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await clic(page, '[data-test=aventura]'); await clic(page, '[data-test=nivel-1-1]'); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(600);
    const g = await geom(page); await page.evaluate(() => { __j1.juego().s.sol = 500; });
    const sl = g.L.slot(0, 1); await toqueV(page, g, sl.x + 30, sl.y + 30); const [cx, cy] = celda(g, 2, 2); await toqueV(page, g, cx, cy); await page.waitForTimeout(300);
    ok((await estado(page)).plantas.length === 1, 'planta con toque seleccionar+casilla');
    await page.waitForTimeout(4600); // autoguardado
    await page.reload(); await page.waitForSelector('[data-test=continuar]', { timeout: 15000 }); await page.screenshot({ path: CAP + 'h_continuar.png' });
    await clic(page, '[data-test=continuar]'); await page.waitForTimeout(800);
    const e = await estado(page); ok(e && e.plantas.length === 1 && e.t > 3, 'Continuar restaura la partida (plantas=' + (e && e.plantas.length) + ', t=' + (e && e.t.toFixed(1)) + ')');
    await page.evaluate(async () => { const M = await import('/juego/jardin1/js/motor.js'); const s = __j1.juego().s; s.cort.forEach((c) => { c.estado = 'no'; }); M.crearZombi(s, 'paseante', 4, 0.1); });
    await page.waitForSelector('[data-test=reintentar]', { timeout: 20000 }); await page.screenshot({ path: CAP + 'h_derrota.png' });
    ok(await page.evaluate(() => !localStorage.getItem('jardin1_partida')), 'la partida efimera se borra al perder');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async vertical() { // 390x780
    const { browser, page, errores } = await abrir({ width: 390, height: 780 }, { touch: true });
    await page.screenshot({ path: CAP + 'v_menu.png' });
    await clic(page, '[data-test=aventura]'); await clic(page, '[data-test=nivel-1-1]'); await page.screenshot({ path: CAP + 'v_previo.png' }); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(700);
    const g = await geom(page); await page.evaluate(() => { __j1.juego().s.sol = 400; });
    const sl = g.L.slot(0, 1); await toqueV(page, g, sl.x + sl.w / 2, sl.y + sl.h / 2); const [cx, cy] = celda(g, 2, 3); await toqueV(page, g, cx, cy); await page.waitForTimeout(500);
    ok((await estado(page)).plantas.length === 1, 'vertical: planta con toques');
    await page.evaluate(async () => { const M = await import('/juego/jardin1/js/motor.js'); const s = __j1.juego().s; s.t = 38; M.crearZombi(s, 'baliza', 2, 6.5); M.crearZombi(s, 'paseante', 1, 7); });
    await page.waitForTimeout(2500); await page.screenshot({ path: CAP + 'v_juego.png' });
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('avisoGiro')).display) !== 'none', 'aviso de girar en vertical');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async escritorio() { // 1280x720 raton + teclado
    const { browser, page, errores } = await abrir({ width: 1280, height: 720 });
    await clic(page, '[data-test=aventura]'); await clic(page, '[data-test=nivel-1-1]'); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(700);
    const g = await geom(page); await page.evaluate(() => { __j1.juego().s.sol = 600; });
    const sl = g.L.slot(0, 1), [sx, sy] = P(g, sl.x + sl.w / 2, sl.y + sl.h / 2), [cx, cy] = P(g, ...celda(g, 1, 2));
    await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move((sx + cx) / 2, (sy + cy) / 2, { steps: 5 }); await page.mouse.move(cx, cy, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(300);
    ok((await estado(page)).plantas.some((p) => p[1] === 1 && p[2] === 2), 'arrastrar semilla al tablero con raton');
    await page.waitForTimeout(8000);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('1'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    ok((await estado(page)).plantas.length === 2, 'teclado: cursor, semilla 1 y Enter plantan');
    await page.evaluate(async () => { const M = await import('/juego/jardin1/js/motor.js'); const s = __j1.juego().s; M.crearZombi(s, 'cubero', 1, 7); M.crearZombi(s, 'baliza', 2, 8); s.sol = 900; });
    await page.keyboard.press('x'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    ok((await estado(page)).plantas.length === 1, 'teclado: pala quita planta'); await page.waitForTimeout(6000);
    await page.screenshot({ path: CAP + 'd_juego.png' });
    await page.keyboard.press('Escape'); await page.waitForSelector('[data-test=reanudar]'); await page.screenshot({ path: CAP + 'd_pausa.png' });
    await clic(page, '[data-test=reanudar]'); ok(!(await page.evaluate(() => __j1.juego().pausada)), 'reanudar tras la pausa');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async mando() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { mando: MANDO });
    await page.waitForTimeout(500); await pulsar(page, 'ABAJO'); await pulsar(page, 'A'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !!document.querySelector('.mapa')), 'mando: menu navegable con cruceta y A (abre mapa)');
    await pulsar(page, 'DER'); await pulsar(page, 'IZQ'); await page.screenshot({ path: CAP + 'm_mapa.png' });
    await pulsar(page, 'B'); await page.waitForTimeout(300); ok(await page.evaluate(() => !!document.querySelector('.menu')), 'mando: B vuelve atras');
    await pulsar(page, 'A'); await page.waitForTimeout(400); await pulsar(page, 'ABAJO'); await pulsar(page, 'A'); await page.waitForTimeout(500);
    for (let i = 0; i < 12 && !(await page.evaluate(() => __j1.juego())); i++) { const d = await page.evaluate(() => document.activeElement && document.activeElement.dataset.test); if (d === 'empezar') await pulsar(page, 'A'); else await pulsar(page, 'ABAJO'); await page.waitForTimeout(300); }
    await page.waitForTimeout(800);
    ok(await page.evaluate(() => !!__j1.juego()), 'mando: se llega al juego sin tocar la pantalla');
    await page.evaluate(() => { __j1.juego().s.sol = 500; }); await pulsar(page, 'ABAJO'); await pulsar(page, 'DER'); await pulsar(page, 'RB'); await pulsar(page, 'A'); await page.waitForTimeout(400);
    let e = await estado(page); ok(e.plantas.length === 1, 'mando: cursor + RB + A plantan');
    await pulsar(page, 'X'); await pulsar(page, 'A'); await page.waitForTimeout(300); e = await estado(page); ok(e.plantas.length === 0, 'mando: X activa la pala');
    await page.evaluate(() => { const s = __j1.juego().s; s.soles.push({ id: 9999, x: 3.5, y: 2.5, y0: 2.5, val: 25, vida: 9, tipo: 'cielo', cae: 0, t: 0 }); }); const s0 = (await estado(page)).sol; await pulsar(page, 'Y'); ok((await estado(page)).sol >= s0 + 25, 'mando: Y recoge soles');
    await pulsar(page, 'MENU'); await page.waitForSelector('[data-test=reanudar]'); await page.screenshot({ path: CAP + 'm_pausa.png' });
    await pulsar(page, 'A'); await page.waitForTimeout(300); ok(!(await page.evaluate(() => __j1.juego().pausada)), 'mando: Menu pausa y A reanuda');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async modos() { // survival, zen, tienda, almanaque, ajustes, versus, minijuegos
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    // tienda
    await page.evaluate(() => { __j1.PR().monedas = 2000; });
    await clic(page, '[data-test=tienda]'); await page.screenshot({ path: CAP + 'x_tienda.png' }); await clic(page, '[data-test=compra-ranura7]');
    ok(await page.evaluate(() => __j1.PR().tienda.ranura7 === 1 && __j1.PR().monedas === 1600), 'tienda: comprar ranura de semilla extra');
    await clic(page, '[data-atras]');
    // almanaque
    await clic(page, '[data-test=almanaque]'); await page.screenshot({ path: CAP + 'x_alm_p.png' }); await clic(page, '[data-test=alm-z]'); await page.screenshot({ path: CAP + 'x_alm_z.png' });
    ok(await page.evaluate(() => document.querySelectorAll('.alm-i').length >= 24), 'almanaque: fichas de zombis'); await clic(page, '[data-atras]');
    // zen
    await clic(page, '[data-test=zen]'); await clic(page, '[data-test=zen-plantar-0]'); await clic(page, '[data-test=zen-regar-0]'); await page.waitForTimeout(1200); await page.screenshot({ path: CAP + 'x_zen.png' });
    ok(await page.evaluate(() => __j1.PR().zen.parcelas[0] && __j1.PR().zen.parcelas[0].agua > 0.9), 'zen: plantar y regar');
    await page.evaluate(() => { const p = __j1.PR().zen.parcelas[0]; p.crec = 1; p.mon = 3; }); await clic(page, '[data-atras]'); await clic(page, '[data-test=zen]'); await clic(page, '[data-test=zen-vender-0]');
    ok(await page.evaluate(() => __j1.PR().stats.zenVentas === 1 && __j1.PR().logros.zen_venta === 1), 'zen: vender planta con monedas y logro'); await clic(page, '[data-atras]');
    // ajustes
    await clic(page, '[data-test=ajustes]'); for (const k of ['graficos', 'audio', 'controles', 'acc', 'juego', 'datos']) { await clic(page, '[data-test=aj-' + k + ']'); await page.screenshot({ path: CAP + 'x_aj_' + k + '.png' }); }
    await clic(page, '[data-test=aj-acc]'); await page.click('.aj-cuerpo .tog >> nth=0').catch(() => {}); await clic(page, '[data-test=aj-graficos]'); await page.click('.tabs.peq .tab >> nth=0'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('jardin1_ajustes_dispositivo')).graficos.calidad === 'baja'), 'ajustes: calidad Baja se guarda en jardin1_ajustes_dispositivo');
    await clic(page, '[data-test=aj-datos]'); const mon0 = await page.evaluate(() => __j1.PR().monedas); await clic(page, '[data-test=exportar]'); const txt = await page.inputValue('textarea'); ok(txt.length > 20, 'datos: exportar progreso');
    await page.evaluate(() => { __j1.PR().monedas = 5; }); await clic(page, '[data-test=importar]'); await page.fill('textarea', txt); await clic(page, '[data-test=importar]'); ok(await page.evaluate((m) => __j1.PR().monedas === m, mon0), 'datos: importar restaura'); await clic(page, '[data-atras]');
    // versus
    await clic(page, '.grid-menu .btn >> text=Jardín contra Jardín'); await clic(page, '[data-test=versus-go]'); await page.waitForTimeout(800);
    const g = await geom(page); await page.evaluate(() => { __j1.juego().s.sol = 500; __j1.juego().s.versus.cerebros = 300; });
    await page.screenshot({ path: CAP + 'x_versus0.png' });
    const L = g.L, z1 = L.zb(1, 7), s0 = L.slot(1, 8); await toqueV(page, g, s0.x + 30, s0.y + 20); await toqueV(page, g, ...celda(g, 2, 2));
    await toqueV(page, g, z1.x + z1.w / 2, z1.y + z1.h / 2); await toqueV(page, g, ...celda(g, 2, 8)); await page.waitForTimeout(500);
    const ev = await page.evaluate(() => ({ p: __j1.juego().s.plantas.length, z: __j1.juego().s.zombis.length }));
    ok(ev.p === 1 && ev.z === 1, 'versus: uno planta y otro lanza zombis en el mismo telefono'); await page.waitForTimeout(3000); await page.screenshot({ path: CAP + 'x_versus1.png' });
    await page.evaluate(() => { const s = __j1.juego().s; s.t = s.niv.duracion - 0.1; }); await page.waitForSelector('[data-test=revancha]', { timeout: 15000 }); await page.screenshot({ path: CAP + 'x_versus_fin.png' });
    await clic(page, '[data-test=menu]');
    // supervivencia
    await clic(page, '[data-test=surv]'); await clic(page, '[data-test=surv-go]'); await page.waitForTimeout(300); await page.screenshot({ path: CAP + 'x_surv_previo.png' }); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(800);
    await page.evaluate(() => { __j1.juego().setVel(2); __j1.juego().s.sol = 900; });
    await page.waitForTimeout(500);
    await page.evaluate(async () => { const M = await import('/juego/jardin1/js/motor.js'); const s = __j1.juego().s; for (let k = 0; k < 4000 && s.olaNum < 4; k++) { M.paso(s, 0.1); s.zombis.forEach((z) => M.matar(s, z)); s.cort.forEach((c) => { c.estado = 'lista'; }); } });
    await page.screenshot({ path: CAP + 'x_surv_juego.png' });
    await page.keyboard.press('Escape'); await clic(page, '[data-test=terminar]'); await page.waitForSelector('[data-test=otra]', { timeout: 15000 }); await page.screenshot({ path: CAP + 'x_surv_fin.png' });
    ok(await page.evaluate(() => __j1.PR().surv.sv_dia >= 3), 'supervivencia: oleadas registradas (' + await page.evaluate(() => __j1.PR().surv.sv_dia) + ')'); await clic(page, '[data-test=menu]');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async accesibilidad() { // daltonismo, zurdo, texto grande, reducir movimiento, 0.5x
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await page.evaluate(() => { const A = __j1.AJ; A.accesibilidad.dalt = true; A.accesibilidad.texto = 1.25; A.accesibilidad.reducir = true; A.controles.zurdo = true; A.controles.tam = 1.3; A.juego.vel = 0.5; A.graficos.calidad = 'ultra'; });
    await page.evaluate(() => __j1.PR().hechos['1-1'] = { e: 1 }); await page.evaluate(() => __j1.PR().hechos['1-2'] = { e: 1 }); await page.evaluate(() => __j1.PR().hechos['1-3'] = { e: 1 });
    await page.evaluate(async () => { const N = await import('/juego/jardin1/js/niveles.js'); __j1.U.previo(N.nivelAventura(2, 1)); }); await page.waitForTimeout(300); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(1200);
    await page.evaluate(async () => { const M = await import('/juego/jardin1/js/motor.js'); const s = __j1.juego().s; s.sol = 800; M.colocar(s, 'nogal', 1, 3, true); M.colocar(s, 'dispa', 2, 2, true); M.colocar(s, 'hielo', 3, 2, true); M.colocar(s, 'giras', 4, 1, true); M.crearZombi(s, 'cubero', 2, 6); M.crearZombi(s, 'reja', 3, 7); M.soles && 0; s.soles.push({ id: 777, x: 4.5, y: 0.5, y0: 0.5, val: 25, vida: 9, tipo: 'cielo', cae: 0, t: 0 }); });
    await page.waitForTimeout(3000); await page.screenshot({ path: CAP + 'a_dalt_h.png' });
    ok(await page.evaluate(() => __j1.juego().vel === 0.5), 'velocidad 0.5x aplicada');
    await page.setViewportSize({ width: 390, height: 780 }); await page.waitForTimeout(1200); await page.screenshot({ path: CAP + 'a_dalt_v.png' });
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
  async minijuegos() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await page.evaluate(() => { const PR = __j1.PR(); for (let i = 1; i <= 24; i++) PR.hechos[((i - 1) / 10 | 0) + 1 + '-' + (((i - 1) % 10) + 1)] = { e: 3 }; PR.ganadas = 100; });
    const casos = [['1-5', 'cinta'], ['2-5', 'tumbas'], ['2-10', 'bolera'], ['3-8', 'carrera'], ['5-5', 'jarros']];
    for (const [id, nombre] of casos) {
      await page.evaluate((id) => { const PR = __j1.PR(); const [w, n] = id.split('-').map(Number); for (let i = 1; i < (w - 1) * 10 + n; i++) PR.hechos[((i - 1) / 10 | 0) + 1 + '-' + (((i - 1) % 10) + 1)] = { e: 3 }; }, id);
      await page.evaluate(async (id) => { const N = await import('/juego/jardin1/js/niveles.js'); const A = await import('/juego/jardin1/js/almacen.js'); const [w, n] = id.split('-').map(Number); __j1.U.previo(N.nivelAventura(w, n)); }, id);
      await page.waitForTimeout(300);
      if (nombre === 'tumbas' || nombre === 'carrera') { const b = page.locator('[data-test=sem-giras]'); if (await b.count()) await b.click(); }
      await clic(page, '[data-test=empezar]'); await page.waitForTimeout(1500);
      await page.evaluate(() => __j1.juego().setVel(2)); await page.waitForTimeout(6000);
      await page.screenshot({ path: CAP + 'mj_' + nombre + '.png' });
      const e = await estado(page); ok(!!e && e.fin !== 'derrota', 'minijuego ' + nombre + ' arranca y corre (cola=' + e.cola.length + ')');
      await page.evaluate(() => __j1.App.menu()); await page.waitForTimeout(300);
    }
    // rompecabezas
    await page.evaluate(async () => { const N = await import('/juego/jardin1/js/niveles.js'); __j1.U.previo(N.nivelPuzzle(1)); }); await clic(page, '[data-test=empezar]'); await page.waitForTimeout(800);
    const g = await geom(page); for (let r = 0; r < 5; r++) { const sl = g.L.slot(0, 5); await toqueV(page, g, sl.x + 30, sl.y + 30); await toqueV(page, g, ...celda(g, r, 2)); await page.waitForTimeout(150); }
    await page.evaluate(() => __j1.juego().setVel(2)); await page.waitForSelector('[data-test=repetir]', { timeout: 120000 }); await page.screenshot({ path: CAP + 'mj_puzzle_fin.png' });
    ok(await page.evaluate(() => __j1.PR().puzzle.r1 === 1), 'rompecabezas 1 resuelto con toques');
    ok(errores.length === 0, 'sin errores de consola: ' + errores.join(' | ')); await browser.close();
  },
};
(async () => {
  const quienes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ESC);
  for (const k of quienes) { console.log('== ' + k); try { await ESC[k](); } catch (e) { fallos++; console.log('FALLO excepcion en', k, e.message.split('\n')[0]); } }
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
})();
