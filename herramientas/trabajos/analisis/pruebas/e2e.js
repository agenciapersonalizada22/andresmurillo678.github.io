/* E2E de Analisis con Playwright: siembra los 9 modulos en IndexedDB, recorre todas las secciones en 390x780 y escritorio y comprueba cero errores de consola.
   Uso: node pruebas/e2e.js <carpeta_capturas> [url_base]  (servir el repo antes: python3 -m http.server 8765) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), assert = require('assert');
const OUT = process.argv[2] || '/tmp/an_caps', BASE = process.argv[3] || 'http://localhost:8765', URL = BASE + '/herramientas/trabajos/analisis/index.html';
fs.mkdirSync(OUT, { recursive: true });
const BASES = { drones: 'trabajos_drones', monetizacion: 'trabajos_monetizacion', automatizaciones: 'trabajos_automatizaciones', 'contenido-ia': 'trabajos_contenido_ia', 'video-ia': 'trabajos_video_ia', 'reconstruccion-3d': 'trabajos_reconstruccion_3d', 'realidad-aumentada': 'trabajos_realidad_aumentada', dispositivos: 'trabajos_dispositivos', qr: 'trabajos_qr' };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs = []; let paso = 0; const log = (...a) => console.log(...a);
  async function nuevo(w, h, tactil) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, hasTouch: !!tactil, isMobile: !!tactil, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('[' + w + '] ' + m.text()); }); page.on('pageerror', e => errs.push('[' + w + '] PAGEERR ' + e.message));
    return { ctx, page };
  }
  async function sembrar(page, fixt) {
    await page.addScriptTag({ path: path.join(__dirname, 'fixture.js') });
    return page.evaluate(async (BASES) => {
      const fx = window.AnaFixture(Date.now()), ahora = Date.now();
      fx.entradas.monetizacion.regs.push({ k: 'movimientos/xr', col: 'movimientos', id: 'xr', t: ahora, v: { id: 'xr', tipo: 'ingreso', fecha: '2026-01-01', monto: 5, moneda: 'USD', proyecto: 'fantasma' } });
      fx.entradas.qr.regs.push({ k: 'historial/q9', col: 'historial', id: 'q9', t: ahora - 1, v: { id: 'q9', tipo: 'url', texto: 'https://a.com' } });
      fx.entradas.automatizaciones.regs.push({ k: 'ejecuciones/eo', col: 'ejecuciones', id: 'eo', t: ahora, v: { id: 'eo', flujo: 'borrado', estado: 'ok', ini: ahora } });
      fx.entradas.automatizaciones.regs[0].v.aristas.push({ de: 'n1', sal: 'sal', a: 'nX' });
      for (const id of Object.keys(BASES)) {
        await new Promise((ok, ko) => { const r = indexedDB.deleteDatabase(BASES[id]); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
        const db = await new Promise((ok, ko) => { const r = indexedDB.open(BASES[id], 1); r.onupgradeneeded = () => r.result.createObjectStore('r', { keyPath: 'k' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
        await new Promise((ok, ko) => { const t = db.transaction('r', 'readwrite'); fx.entradas[id].regs.forEach(x => t.objectStore('r').put(x)); t.oncomplete = ok; t.onerror = () => ko(t.error); }); db.close();
      }
      localStorage.setItem('trabajos_contenido_ia_limites_dispositivo', JSON.stringify(fx.ls['contenido-ia'].limites)); localStorage.setItem('trabajos_video_ia_limites_dispositivo', JSON.stringify(fx.ls['video-ia'].limites));
      localStorage.setItem('trabajos_drones_nube_ultima_x', String(Date.now() - 2.5 * 864e5)); localStorage.setItem('trabajos_drones_nube_lapidas', JSON.stringify(fx.sync.drones.lapidas));
      localStorage.setItem('trabajos_contenido_ia_claves_dispositivo', JSON.stringify({ clave: 'sk-NO-DEBE-LEERSE' }));
      return Object.values(fx.entradas).reduce((a, e) => a + e.regs.length, 0);
    }, BASES);
  }
  async function entrar(page) {
    await page.goto(URL); await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(800);
    if (!new globalThis.URL(page.url()).pathname.includes('/analisis/')) {   // cuenta demo local: registrarse una vez
      await page.waitForFunction(() => window.Cuenta, null, { timeout: 8000 });
      await page.evaluate(async () => { try { await Cuenta.registrar('tester' + Date.now() % 100000, 'clave12345'); } catch (e) { console.log('registro', e.message); } });
      await page.waitForURL(u => u.pathname.includes('/analisis/'), { timeout: 8000 }).catch(() => {}); if (!new globalThis.URL(page.url()).pathname.includes('/analisis/')) await page.goto(URL); await page.waitForTimeout(800);
    }
  }
  async function shot(page, nombre, full) { await page.screenshot({ path: path.join(OUT, String(++paso).padStart(2, '0') + '_' + nombre + '.png'), fullPage: full !== false }); }
  async function sinDesborde(page, etiqueta) { const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); assert.ok(w[0] <= w[1] + 1, 'desborde horizontal en ' + etiqueta + ': ' + w.join('>')); }
  async function pestana(page, v) { await page.click('#t-' + v); await page.waitForTimeout(250); }

  /* ===== movil 390x780 ===== */
  let { ctx, page } = await nuevo(390, 780, true);
  await entrar(page); log('url', page.url());
  const n = await sembrar(page); log('registros sembrados', n);
  await page.goto(URL); await page.waitForTimeout(500);
  await shot(page, 'm_puerta'); assert.ok(await page.isVisible('#btn-permiso'), 'falta la puerta de permiso');
  await page.click('#btn-permiso'); await page.waitForSelector('#v-tablero .an-tiles', { timeout: 8000 }); await page.waitForTimeout(400);
  await shot(page, 'm_tablero'); await sinDesborde(page, 'tablero');
  const textoTab = await page.textContent('#v-tablero');
  assert.ok(/9 \/ 9/.test(textoTab), 'deberian verse 9 modulos con datos'); assert.ok(/Alertas/.test(textoTab)); assert.ok(!/sk-NO-DEBE/.test(await page.content()), 'la clave de otro modulo no debe aparecer');
  assert.ok(/Pendiente/.test(textoTab) || /Sin sincronizar/.test(textoTab), 'estado de sync');
  // descargas del tablero
  let [d1] = await Promise.all([page.waitForEvent('download'), page.click('#btn-csv')]); const csv = fs.readFileSync(await d1.path(), 'utf8'); assert.ok(csv.includes('seccion,metrica,valor')); log('csv ok', csv.split('\n').length, 'lineas');
  let [d2] = await Promise.all([page.waitForEvent('download'), page.click('#btn-json')]); const j = JSON.parse(fs.readFileSync(await d2.path(), 'utf8')); assert.strictEqual(j.formato, 'trabajos_tablero'); assert.strictEqual(j.dominios.drones.vuelos, 3);
  await page.selectOption('#sel-uso', 'automatizaciones'); await page.waitForTimeout(150); await shot(page, 'm_tablero_uso_auto', false);
  // dominios
  await pestana(page, 'dominios'); await sinDesborde(page, 'dominios');
  const doms = ['drones', 'video', 'automatizaciones', 'reconstruccion', 'ar', 'contenido', 'monetizacion', 'dispositivos', 'qr'];
  for (const d of doms) { await page.click('[data-dom="' + d + '"]'); await page.waitForTimeout(200); await sinDesborde(page, 'dominio ' + d); if (['drones', 'automatizaciones', 'contenido', 'monetizacion'].includes(d)) await shot(page, 'm_dom_' + d); const t = await page.textContent('.an-dom'); assert.ok(!/No se pudo dibujar/.test(t), 'dominio ' + d); }
  await page.click('[data-dom="monetizacion"]'); assert.ok(/2\.505/.test(await page.textContent(".an-dom")) || /2505/.test(await page.textContent('.an-dom')), 'ingresos 2500');
  // cruces
  await pestana(page, 'cruces'); await sinDesborde(page, 'cruces'); await shot(page, 'm_cruces'); const tc = await page.textContent('#v-cruces'); assert.ok(/Rentabilidad por proyecto/.test(tc) && /Tomas aereas/.test(tc) && /Horas para recuperar/.test(tc) && /Flujo B/.test(tc) && /Regla aplicada/.test(tc));
  // informes
  await pestana(page, 'informes'); await sinDesborde(page, 'informes'); await shot(page, 'm_informes');
  await page.click('#btn-previa'); await page.waitForSelector('#vista-previa .im-marco', { timeout: 5000 }); await shot(page, 'm_informe_hojas');
  const hojas = await page.$$eval('#vista-previa .im-marco', e => e.length); assert.ok(hojas >= 1); await page.click('#per-mensual'); await page.waitForTimeout(200);
  let [d3] = await Promise.all([page.waitForEvent('download'), page.click('#btn-inf-csv')]); assert.ok(fs.readFileSync(await d3.path(), 'utf8').includes('mensual'));
  // flujo sugerido
  let [d4] = await Promise.all([page.waitForEvent('download'), page.click('#btn-flujo-informe_semanal')]); const fl = JSON.parse(fs.readFileSync(await d4.path(), 'utf8')); assert.ok(fl.nodos.length >= 3 && fl.aristas.length >= 2);
  // IA: se intercepta la API; nada debe salir sin consentimiento
  let llamadas = 0, cuerpo = ''; await page.route('https://api.anthropic.com/**', r => { llamadas++; cuerpo = r.request().postData() || ''; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ content: [{ type: 'text', text: 'Resumen: va bien. Nombre-1 rinde.' }] }) }); });
  await page.fill('#ia-clave', 'sk-ant-prueba-123'); await page.click('#btn-ia-preparar'); await page.waitForSelector('#ia-mensaje'); await shot(page, 'm_ia_revision');
  const msg = await page.textContent('#ia-mensaje'); assert.ok(!/Tomas aereas|Flujo B|Mavic/.test(msg), 'anonimizado'); assert.ok(/Nombre-\d/.test(msg)); assert.ok(await page.isDisabled('#btn-ia-enviar'), 'envio bloqueado sin consentimiento'); assert.strictEqual(llamadas, 0);
  await page.check('#ia-ok'); await page.click('#btn-ia-enviar'); await page.waitForSelector('.an-narr', { timeout: 6000 }); assert.strictEqual(llamadas, 1); assert.ok(cuerpo.includes(msg.slice(0, 80).replace(/\n/g, '\\n')) || cuerpo.includes('Nombre-'), 'el cuerpo enviado coincide con lo mostrado'); assert.ok(!cuerpo.includes('Tomas aereas'));
  const claveGuardada = await page.evaluate(() => localStorage.getItem('trabajos_analisis_claves_dispositivo')); assert.ok(/sk-ant-prueba-123/.test(claveGuardada)); await shot(page, 'm_ia_resultado');
  // metas
  await pestana(page, 'metas'); await page.click('#btn-metas-sug'); await page.waitForSelector('#lista-metas li'); await page.waitForTimeout(300); await shot(page, 'm_metas'); await sinDesborde(page, 'metas');
  assert.ok(/No cumplida/.test(await page.textContent('#lista-metas')), 'meta vencido debe fallar'); await page.selectOption('#meta-kpi', 'horas_vuelo'); await page.fill('#meta-obj', '2'); await page.click('#btn-meta-add'); await page.waitForTimeout(400);
  assert.ok((await page.$$('#lista-metas li')).length >= 6);
  await pestana(page, 'tablero'); assert.ok(/Meta:/.test(await page.textContent('#v-tablero .an-alertas')));
  // salud
  await pestana(page, 'salud'); await page.waitForSelector('#lista-issues'); await sinDesborde(page, 'salud'); await shot(page, 'm_salud');
  await page.click('#btn-sel-seguros'); await page.waitForTimeout(200); await page.click('#btn-vista-limpieza'); await page.waitForSelector('#limpieza-previa .an-prev'); await shot(page, 'm_salud_previa');
  assert.ok(await page.isDisabled('#btn-aplicar-limpieza'), 'aplicar bloqueado sin respaldo previo');
  const antesC = await page.evaluate(() => Ana.est.datos.modulos.monetizacion.registros);
  let [d5] = await Promise.all([page.waitForEvent('download'), page.click('#btn-respaldo-previo')]); assert.ok(/respaldo_previo/.test(d5.suggestedFilename())); assert.ok(!(await page.isDisabled('#btn-aplicar-limpieza')));
  page.once('dialog', d => d.accept()); await page.click('#btn-aplicar-limpieza'); await page.waitForTimeout(1200);
  const despuesC = await page.evaluate(() => Ana.est.datos.modulos.monetizacion.registros); const dupCli = await page.evaluate(() => Ana.est.integridad.issues.filter(i => i.seguro).length); log('monet antes/despues', antesC, despuesC, 'seguros restantes', dupCli); assert.strictEqual(dupCli, 0);
  await shot(page, 'm_salud_tras_limpieza');
  // respaldo completo -> borrar todo -> restaurar
  await page.selectOption('#rs-fmt', 'zip'); const totalAntes = await page.evaluate(() => Object.values(Ana.est.datos.modulos).reduce((a, m) => a + m.registros, 0));
  let [d6] = await Promise.all([page.waitForEvent('download'), page.click('#btn-exportar')]); const zipPath = path.join(OUT, 'respaldo.zip'); fs.copyFileSync(await d6.path(), zipPath); log('zip', fs.statSync(zipPath).size, 'bytes');
  const claveEnZip = fs.readFileSync(zipPath).includes('sk-NO-DEBE-LEERSE'); assert.ok(!claveEnZip, 'la clave no debe ir en el respaldo');
  const snap = await page.evaluate(() => { const o = {}; Object.values(Ana.est.datos.modulos).forEach(m => { o[m.id] = m.regs.map(r => r.k + '@' + r.t).sort().join('|'); }); return o; });
  await page.evaluate(async (BASES) => { for (const id of Object.keys(BASES)) await new Promise(ok => { const r = indexedDB.deleteDatabase(BASES[id]); r.onsuccess = r.onerror = r.onblocked = () => ok(); }); }, BASES);
  await page.click('#btn-verificar'); await page.waitForTimeout(800); assert.strictEqual(await page.evaluate(() => Object.values(Ana.est.datos.modulos).reduce((a, m) => a + m.registros, 0)), 0, 'bases vacias tras borrar');
  await pestana(page, 'tablero'); await shot(page, 'm_tablero_vacio'); assert.ok(/Sin datos/.test(await page.textContent('#v-tablero')));
  await pestana(page, 'dominios'); for (const d of doms) { await page.click('[data-dom="' + d + '"]'); assert.ok(/Sin datos/.test(await page.textContent('.an-dom')), 'sin datos en ' + d); } await shot(page, 'm_dom_sin_datos');
  await pestana(page, 'cruces'); await pestana(page, 'informes'); await pestana(page, 'metas'); await pestana(page, 'salud');
  await page.setInputFiles('#rs-archivo', zipPath); await page.waitForSelector('#importar-previa table'); await shot(page, 'm_restaurar_previa');
  page.once('dialog', d => d.accept()); await page.click('#btn-restaurar'); await page.waitForTimeout(1500);
  const snap2 = await page.evaluate(() => { const o = {}; Object.values(Ana.est.datos.modulos).forEach(m => { o[m.id] = m.regs.map(r => r.k + '@' + r.t).sort().join('|'); }); return o; });
  assert.deepStrictEqual(snap2, snap, 'roundtrip de respaldo en el navegador'); log('roundtrip OK', totalAntes, 'registros');
  // JSON importado tambien
  await ctx.close();

  /* ===== escritorio 1280x900 ===== */
  ({ ctx, page } = await nuevo(1280, 900, false)); await entrar(page); await sembrar(page); await page.evaluate(() => localStorage.setItem('trabajos_analisis_permiso_dispositivo', 'si')); await page.goto(URL); await page.waitForSelector('#v-tablero .an-tiles'); await page.waitForTimeout(500);
  await shot(page, 'd_tablero'); for (const v of ['dominios', 'cruces', 'informes', 'metas', 'salud']) { await pestana(page, v); await page.waitForTimeout(300); await sinDesborde(page, 'desktop ' + v); await shot(page, 'd_' + v); }
  await pestana(page, 'dominios'); await page.click('[data-dom="monetizacion"]'); await shot(page, 'd_dom_monetizacion');
  await ctx.close();

  /* ===== tolerancia: esquema cambiado ===== */
  ({ ctx, page } = await nuevo(390, 780, true)); await entrar(page); await sembrar(page);
  await page.evaluate(async () => { const r = indexedDB.open('trabajos_drones'); const db = await new Promise(ok => { r.onsuccess = () => ok(r.result); }); await new Promise(ok => { const t = db.transaction('r', 'readwrite'); t.objectStore('r').put({ k: 'proyectos/raro', col: 'proyectos', id: 'raro', t: 1, v: { id: 'raro', nombre: 42, mision: 'texto' } }); t.objectStore('r').put({ k: 'bitacora/malo', col: 'bitacora', id: 'malo', t: 1, v: { id: 'malo', minutos: { x: 1 }, fecha: [] } }); t.oncomplete = ok; }); db.close();
    const r2 = indexedDB.open('trabajos_qr'); const db2 = await new Promise(ok => { r2.onsuccess = () => ok(r2.result); }); await new Promise(ok => { const t = db2.transaction('r', 'readwrite'); t.objectStore('r').put({ k: 'historial/z', col: 'historial', id: 'z', t: 5, v: 'cadena en vez de objeto' }); t.oncomplete = ok; }); db2.close(); localStorage.setItem('trabajos_analisis_permiso_dispositivo', 'si'); });
  await page.goto(URL); await page.waitForSelector('#v-tablero .an-tiles'); await pestana(page, 'dominios'); for (const d of doms) { await page.click('[data-dom="' + d + '"]'); await page.waitForTimeout(100); }
  await pestana(page, 'cruces'); await pestana(page, 'salud'); await shot(page, 'm_tolerancia'); assert.ok(/Falta el campo|debería ser/.test(await page.textContent('#v-salud')), 'el verificador debe señalar el esquema roto');
  await ctx.close(); await b.close();
  log('errores de consola:', JSON.stringify(errs, null, 1)); assert.strictEqual(errs.length, 0, 'hay errores de consola'); log('E2E OK');
})().catch(e => { console.error('E2E FALLO:', e.message); process.exit(1); });
