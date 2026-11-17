// E2E con Playwright. Uso: PW_PATH=/ruta/playwright node e2e.cjs [escenario...]  (servir el repo: python3 -m http.server 8765)
const { abrir } = require('./e2e-lib.cjs');
const CAP = process.env.CAP || '/tmp/jardin2-cap/'; require('fs').mkdirSync(CAP, { recursive: true });
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const MANDO = `(() => { const pad = { id: 'Xbox 360 Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
 navigator.getGamepads = () => [pad]; window.__btn = (i, v) => { pad.buttons[i] = { pressed: v, value: v ? 1 : 0 }; }; window.__axis = (i, v) => { pad.axes[i] = v; }; })();`;
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VISTA: 8, MENU: 9, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 };
const pulsar = async (page, n, ms = 130) => { await page.evaluate((i) => window.__btn(i, true), B[n]); await page.waitForTimeout(ms); await page.evaluate((i) => window.__btn(i, false), B[n]); await page.waitForTimeout(ms); };
const pos = (page, r, c) => page.evaluate(([r, c]) => { const L = __j2.juego().vista.L; return [L.ox + (c + 0.5) * L.t, L.oy + (r + 0.5) * L.t]; }, [r, c]);
const estado = (page) => page.evaluate(() => { const j = __j2.juego(); if (!j) return null; const s = j.s; return { fin: s.fin, ch: s.ch, t: s.t, en: s.en, pl: s.plantas.map((p) => p.id + p.r + p.c), z: s.zombis.filter((z) => z.estado !== 'muere').map((z) => z.r), orbes: s.orbes.map((o) => [o.x, o.y]), listo: s.cartas.map((k, i) => __j2.M.cartaLista(s, i)), zn: s.zombis.length }; });
async function jugarNivel(page, tap, opts = {}) {
  const t0 = Date.now(); const max = opts.max || 170000;
  while (Date.now() - t0 < max) {
    const e = await estado(page); if (!e || e.fin) return e; await page.evaluate(() => { const p = document.querySelector('.popup'); if (p) p.remove(); });
    for (const o of e.orbes.slice(0, 3)) { const [x, y] = await page.evaluate((o) => { const L = __j2.juego().vista.L; return [L.ox + o[0] * L.t, L.oy + (o[1] + 0.5) * L.t]; }, o); await tap(x, y); }
    const nProd = e.pl.filter((p) => p.startsWith('chispera')).length;
    if (nProd < 3 && e.ch >= 50 && e.listo[0] <= 0) { await page.click('.carta[data-i="0"]'); const [x, y] = await pos(page, e.pl.length % 5, 0); await tap(x, y); }
    else if (e.ch >= 100 && e.listo[1] <= 0 && e.z.length) { const r = e.z[0]; if (!e.pl.some((p) => p.startsWith('brote' + r))) { await page.click('.carta[data-i="1"]'); const [x, y] = await pos(page, r, 1 + (e.pl.length % 2)); await tap(x, y); } }
    if (e.en > 0 && e.pl.some((p) => p.startsWith('brote'))) { await page.click('.hb.en'); const q = e.pl.find((p) => p.startsWith('brote')); const [x, y] = await pos(page, +q[5], +q[6]); await tap(x, y); }
    await page.waitForTimeout(200);
  }
  return estado(page);
}
const lanzar1 = (page, m, n, sem, modo) => page.evaluate(([m, n, sem, modo]) => { __j2.App.jugar(__j2.nivelAventura(m, n), sem, { modo: modo || 'aventura' }); __j2.AJ.juego.vel = 2; __j2.juego().refrescar(); }, [m, n, sem, modo]);
const clicTexto = async (page, txt) => { await page.locator('#pantalla button', { hasText: txt }).first().click(); await page.waitForTimeout(350); };

const ESC = {
  async vertical() {
    const { browser, page, errores } = await abrir({ width: 390, height: 780 }, { touch: true });
    await page.screenshot({ path: CAP + 'v_menu.png' }); await clicTexto(page, 'Aventura'); await page.screenshot({ path: CAP + 'v_mapa.png' });
    await clicTexto(page, 'Arenas Antiguas'); await page.screenshot({ path: CAP + 'v_niveles.png' }); await clicTexto(page, '1'); await page.screenshot({ path: CAP + 'v_prep.png' });
    await clicTexto(page, '¡A jugar!'); await page.waitForTimeout(1500); await page.screenshot({ path: CAP + 'v_juego0.png' });
    await page.evaluate(() => { __j2.AJ.juego.vel = 2; __j2.juego().refrescar(); });
    const e = await jugarNivel(page, (x, y) => page.touchscreen.tap(x, y)); await page.screenshot({ path: CAP + 'v_fin.png' });
    ok(e && e.fin === 'victoria', 'nivel 1-1 completo en vertical con toques'); await page.waitForSelector('.fin', { timeout: 10000 }); await page.screenshot({ path: CAP + 'v_resultado.png' });
    ok(await page.evaluate(() => __j2.PR().hechos['1-1'] && __j2.PR().hechos['1-1'].e >= 1), 'progreso 1-1 guardado'); ok(errores.length === 0, 'sin errores de consola v: ' + errores.join('|'));
    await browser.close();
  },
  async escritorio() {
    const { browser, page, errores } = await abrir({ width: 1280, height: 720 }, {});
    await lanzar1(page, 0, 1, ['chispera', 'brote']); await page.waitForTimeout(1200); await page.screenshot({ path: CAP + 'd_juego0.png' });
    const e = await jugarNivel(page, (x, y) => page.mouse.click(x, y)); ok(e && e.fin === 'victoria', 'nivel 1-1 con ratón 1280x720'); await page.screenshot({ path: CAP + 'd_fin.png' });
    await page.waitForSelector('.fin'); await page.screenshot({ path: CAP + 'd_resultado.png' }); ok(errores.length === 0, 'sin errores d: ' + errores.join('|')); await browser.close();
  },
  async derrota_continuar() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await lanzar1(page, 0, 2, ['chispera', 'brote']); await page.waitForTimeout(800);
    await page.evaluate(() => { const s = __j2.juego().s; s.t += 0; });
    await page.waitForTimeout(5000); await page.reload(); await page.waitForSelector('#pantalla.on', { timeout: 20000 });
    const hay = await page.evaluate(() => JSON.parse(localStorage.getItem('jardin2_partida') || 'null')); ok(hay && hay.valida, 'partida efímera guardada al recargar');
    await page.screenshot({ path: CAP + 'h_continuar.png' }); await clicTexto(page, 'Continuar'); await page.waitForTimeout(1200);
    ok(await page.evaluate(() => !!__j2.juego()), 'Continuar restaura la partida'); const t1 = (await estado(page)).t; ok(t1 > 1, 'estado restaurado t=' + t1.toFixed(1));
    await page.evaluate(() => { const s = __j2.juego().s; s.pulso.fill(0); __j2.M.crearZombi(s, 'momia', 2, 0.2); __j2.M.crearZombi(s, 'momia', 3, 0.2); __j2.M.crearZombi(s, 'momia', 1, 0.2); __j2.M.crearZombi(s, 'momia', 0, 0.2); __j2.M.crearZombi(s, 'momia', 4, 0.2); __j2.AJ.juego.vel = 2; });
    await page.waitForSelector('.fin.der', { timeout: 40000 }); await page.screenshot({ path: CAP + 'h_derrota.png' }); ok(true, 'derrota muestra resultado'); ok(errores.length === 0, 'sin errores derrota: ' + errores.join('|')); await browser.close();
  },
  async mando() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { mando: MANDO });
    await page.waitForTimeout(300); await pulsar(page, 'A'); await pulsar(page, 'ABAJO'); await page.screenshot({ path: CAP + 'm_menu.png' });
    await lanzar1(page, 0, 1, ['chispera', 'brote']); await page.waitForTimeout(1000);
    await pulsar(page, 'RB'); await pulsar(page, 'LB'); await pulsar(page, 'A'); // elige carta 1 y planta en cursor
    await pulsar(page, 'DER'); await pulsar(page, 'A'); await pulsar(page, 'ABAJO'); await pulsar(page, 'RB'); await pulsar(page, 'A');
    await page.screenshot({ path: CAP + 'm_juego.png' }); const e = await estado(page); ok(e.pl.length >= 1, 'mando planta con A (plantas=' + e.pl.join(',') + ')');
    await pulsar(page, 'X'); ok(await page.evaluate(() => document.querySelector('#juego').dataset.mod === 'pala'), 'X activa la pala'); await pulsar(page, 'B');
    await pulsar(page, 'MENU'); await page.waitForSelector('.pausa'); await page.screenshot({ path: CAP + 'm_pausa.png' }); ok(true, 'MENU abre la pausa');
    await pulsar(page, 'A'); await page.waitForTimeout(300); ok(await page.evaluate(() => !document.querySelector('.pausa') && !__j2.juego().pausado), 'A reanuda');
    ok(errores.length === 0, 'sin errores mando: ' + errores.join('|')); await browser.close();
  },
  async pantallas() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: true });
    await page.evaluate(() => { __j2.PR().monedas = 5000; __j2.PR().gemas = 500; });
    const ir = async (txt, nombre, extra) => { await clicTexto(page, txt); await page.waitForTimeout(400); if (extra) await extra(); await page.screenshot({ path: CAP + 'p_' + nombre + '.png' }); await page.locator('[data-atras]').first().click(); await page.waitForTimeout(300); };
    await ir('Tienda', 'tienda'); await ir('Almanaque', 'almanaque', async () => { await clicTexto(page, 'Zombis'); });
    await ir('Misiones', 'misiones'); await ir('Colecciones', 'colecciones'); await ir('Logros y ranking', 'ranking', async () => { await clicTexto(page, 'Logros'); });
    await ir('Evento diario', 'diario'); await ir('Arena semanal', 'arena'); await ir('Zona sin fin', 'sinfin'); await ir('Ajustes', 'ajustes', async () => { await clicTexto(page, 'Accesibilidad'); }); await ir('Cómo jugar', 'ayuda');
    // tienda: comprar una planta premium y mejorar
    await clicTexto(page, 'Tienda'); await clicTexto(page, '60 💎'); ok(await page.evaluate(() => !!__j2.PR().tienda.p_roca), 'compra planta premium (Roca Musgo)');
    await clicTexto(page, 'Mejoras'); await page.locator('#pantalla .item button').first().click(); await page.waitForTimeout(300); ok(await page.evaluate(() => (__j2.PR().potenc.chispera || 1) === 2 || (__j2.PR().potenc.brote || 1) === 2), 'mejora de nivel de planta');
    await clicTexto(page, 'Ranuras'); await page.locator('#pantalla .item button').first().click(); await page.waitForTimeout(300); ok(await page.evaluate(() => __j2.PR().tienda.ranuras === 1), 'compra de ranura');
    ok(errores.length === 0, 'sin errores pantallas: ' + errores.join('|')); await browser.close();
  },
  async sinfin_arena_diario() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: false });
    // zona sin fin: piso 1 por la UI
    await clicTexto(page, 'Zona sin fin'); await clicTexto(page, 'Empezar carrera'); await page.screenshot({ path: CAP + 's_prep.png' }); await clicTexto(page, '¡A jugar!'); await page.waitForTimeout(1000);
    await page.evaluate(() => { const s = __j2.juego().s; s.olas.length = 0; s.zombis.length = 0; __j2.AJ.juego.vel = 2; });
    await page.waitForSelector('.fin.vic', { timeout: 20000 }); await page.screenshot({ path: CAP + 's_piso1.png' }); ok(await page.evaluate(() => __j2.PR().sinfin.mejor >= 1), 'piso 1 superado');
    await clicTexto(page, 'Siguiente piso'); await page.waitForSelector('.mejoras'); await page.screenshot({ path: CAP + 's_mejora.png' }); await page.locator('#pantalla .btn').first().click(); await page.waitForTimeout(1200);
    ok(await page.evaluate(() => __j2.juego() && __j2.juego().s.niv.piso === 2), 'sigue al piso 2 con mejora'); await page.screenshot({ path: CAP + 's_piso2.png' });
    // arena
    await page.evaluate(() => { __j2.U.cerrarTodo(); __j2.App.salirAlMenu(); }); await page.waitForTimeout(600);
    await clicTexto(page, 'Arena semanal'); await clicTexto(page, 'Jugar Arena'); await page.waitForTimeout(1500); await page.screenshot({ path: CAP + 'a_juego.png' });
    ok(await page.evaluate(() => __j2.juego() && __j2.juego().s.arena && __j2.juego().s.cartas.length === 8), 'arena con 8 semillas fijas nivel 3');
    await page.evaluate(() => { const s = __j2.juego().s; s.olas.length = 0; s.zombis.length = 0; __j2.AJ.juego.vel = 2; }); await page.waitForSelector('.fin', { timeout: 20000 }); await page.screenshot({ path: CAP + 'a_fin.png' }); ok(await page.evaluate(() => __j2.PR().arena.intentos >= 1 && __j2.PR().arena.mejor > 0), 'arena registra puntaje');
    // diario
    await page.evaluate(() => { __j2.App.salirAlMenu(); }); await page.waitForTimeout(500); await clicTexto(page, 'Evento diario'); await clicTexto(page, 'Jugar evento'); await clicTexto(page, '¡A jugar!'); await page.waitForTimeout(1000);
    await page.evaluate(() => { const s = __j2.juego().s; s.olas.length = 0; s.zombis.length = 0; __j2.AJ.juego.vel = 2; }); await page.waitForSelector('.fin.vic', { timeout: 20000 }); ok(await page.evaluate(() => __j2.PR().diario.hecho && __j2.PR().diario.racha >= 1), 'evento diario completado con racha');
    ok(errores.length === 0, 'sin errores modos: ' + errores.join('|')); await browser.close();
  },
  async ajustes() {
    const { browser, page, errores } = await abrir({ width: 390, height: 780 }, { touch: true });
    await clicTexto(page, 'Ajustes'); await clicTexto(page, 'Baja'); await clicTexto(page, 'Accesibilidad'); await clicTexto(page, 'Deuteranopia'); await page.locator('#pantalla .ajf', { hasText: 'Reducir movimiento' }).locator('button').click(); await clicTexto(page, 'Grande');
    await page.locator('#pantalla .ajf', { hasText: 'Alto contraste' }).locator('button').click(); await clicTexto(page, 'Juego'); await page.locator('#pantalla .ajf', { hasText: 'adaptativa' }).locator('button').click(); await clicTexto(page, 'Datos'); await page.screenshot({ path: CAP + 'aj_datos.png' });
    const g = await page.evaluate(() => JSON.parse(localStorage.getItem('jardin2_ajustes_dispositivo'))); ok(g.graficos.calidad === 'baja' && g.accesibilidad.dalt === 'deut' && g.accesibilidad.reducir === true && g.accesibilidad.texto === 1.25 && g.juego.adaptativa === true, 'ajustes guardados en jardin2_ajustes_dispositivo');
    await clicTexto(page, 'Exportar progreso'); const txt = await page.locator('#pantalla textarea').inputValue(); ok(txt.length > 20, 'exportar progreso');
    await page.reload(); await page.waitForSelector('#pantalla.on'); ok(await page.evaluate(() => __j2.AJ.graficos.calidad === 'baja' && document.body.dataset.dalt === 'deut'), 'ajustes persisten al recargar');
    await lanzar1(page, 4, 4, ['chispera', 'brote']); await page.waitForTimeout(1500); await page.screenshot({ path: CAP + 'aj_juego_baja.png' }); ok(await page.evaluate(() => !!__j2.juego()), 'juego arranca con calidad baja y texto grande');
    ok(errores.length === 0, 'sin errores ajustes: ' + errores.join('|')); await browser.close();
  },
  async mecanicas_poderes() {
    const { browser, page, errores } = await abrir({ width: 780, height: 390 }, { touch: false });
    await lanzar1(page, 0, 3, ['chispera', 'brote']); await page.waitForTimeout(800);
    await page.evaluate(() => { const s = __j2.juego().s; s.olas.length = 0; __j2.M.crearZombi(s, 'sheriff', 2, 6); __j2.M.crearZombi(s, 'momia', 1, 6); s.en = 2; });
    const [zx, zy] = await page.evaluate(() => { const j = __j2.juego(), z = j.s.zombis[0], v = j.vista; return [v.xc(z.x), v.yb(z.r, 0.55)]; });
    await page.click('.pod[data-id=sacudir]'); await page.mouse.click(zx, zy); await page.waitForTimeout(200);
    ok(await page.evaluate(() => __j2.juego().s.zombis[0].arm.hp === 0), 'Sacudir quita la armadura'); const libres = await page.evaluate(() => __j2.PR().poderes.libres); ok(libres === 2, 'poder consume uso gratis');
    await page.evaluate(() => { const s = __j2.juego().s; __j2.M.colocar(s, 'brote', 3, 2); s.ch = 500; }); const [px, py] = await pos(page, 3, 2);
    await page.click('.hb.en'); await page.mouse.click(px, py); await page.waitForTimeout(300); ok(await page.evaluate(() => __j2.juego().s.st.energias === 1), 'Energía Verde aplicada tocando la planta');
    await page.screenshot({ path: CAP + 'e_energia.png' });
    // arrastrar energia sobre otra planta
    await page.evaluate(() => { const s = __j2.juego().s; __j2.M.colocar(s, 'chispera', 4, 2); }); const [qx, qy] = await pos(page, 4, 2); const bb = await page.locator('.hb.en').boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(qx, qy, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
    ok(await page.evaluate(() => __j2.juego().s.st.energias === 2), 'Energía Verde arrastrada sobre la planta');
    // terrenos: mundo 2 agua, 3 rieles
    for (const [m, nombre] of [[1, 'agua'], [2, 'rieles'], [5, 'portales'], [9, 'pistas']]) { await lanzar1(page, m, 7, ['chispera', 'brote']); await page.waitForTimeout(700); await page.evaluate(() => { const s = __j2.juego().s; for (let i = 0; i < 1400; i++) { __j2.M.paso(s, 0.05); s.ev.length = 0; } s.fin = null; }); await page.waitForTimeout(400); await page.screenshot({ path: CAP + 't_' + nombre + '.png' }); }
    ok(errores.length === 0, 'sin errores mecánicas: ' + errores.join('|')); await browser.close();
  },
};
(async () => {
  const lista = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ESC);
  for (const k of lista) { console.log('--', k); try { await ESC[k](); } catch (e) { fallos++; console.log('EXCEPCION', k, e.message.split('\n')[0]); } }
  console.log(fallos ? 'FALLOS: ' + fallos : 'TODO OK'); process.exit(fallos ? 1 : 0);
})();
