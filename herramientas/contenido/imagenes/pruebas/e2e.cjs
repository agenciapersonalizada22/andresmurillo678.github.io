/* Pruebas de extremo a extremo: node pruebas/e2e.cjs  (requiere servidor estatico en el puerto de URL o env URL, y Playwright)
   Variables: URL, PW (ruta de playwright), CHROME, CAP (carpeta de capturas), IMGS (carpeta con imagenes de prueba) */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const PW = process.env.PW || '/opt/node-tools/node_modules/playwright', { chromium } = require(PW);
const URL = process.env.URL || 'http://127.0.0.1:8791/herramientas/contenido/imagenes/index.html';
const CAP = process.env.CAP || path.join(__dirname, 'cap'), IMGS = process.env.IMGS || path.join(CAP, 'imgs');
fs.mkdirSync(CAP, { recursive: true });
if (!fs.existsSync(path.join(IMGS, 'rojo_sobre_blanco.png'))) cp.execSync('node ' + path.join(__dirname, 'generar_imagenes.cjs') + ' ' + IMGS);
let fallos = 0, ok = 0; const errores = [];
const t = async (n, f) => { try { await f(); ok++; console.log('  ok  ', n); } catch (e) { fallos++; console.log('  FALLA', n, '\n       ', String(e.message).split('\n')[0]); } };
const eq = (a, b, m) => { if (a !== b) throw new Error((m || '') + ' esperado ' + b + ' y fue ' + a); };
const cerca = (a, b, tol, m) => { if (Math.abs(a - b) > tol) throw new Error((m || '') + ' esperado ' + b + '±' + tol + ' y fue ' + a); };
const colorCerca = (p, e, tol, m) => { for (let i = 0; i < e.length; i++) cerca(p[i], e[i], tol, (m || '') + ' canal ' + i + ' ' + JSON.stringify(p)); };

async function px(page, pts, esc) {
  return page.evaluate(async ([pts, esc]) => {
    const b = await IM.Exportar.pagina(IM.E.pagina(), { formato: 'png', escala: esc || 1 }), bm = await createImageBitmap(b), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
    const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return pts.map((p) => Array.from(x.getImageData(p[0], p[1], 1, 1).data));
  }, [pts, esc]);
}
const aPantalla = (page, x, y) => page.evaluate(([x, y]) => { const r = IM.Vista.area.getBoundingClientRect(), v = IM.E.vista; return { x: r.left + v.x + x * v.k, y: r.top + v.y + y * v.k }; }, [x, y]);
async function nuevo(page, w, h, nombre) { await page.evaluate(([w, h, n]) => IM.Proy.nuevo(w, h, n || 'Prueba'), [w, h, nombre]); await page.waitForTimeout(150); }
async function trazo(page, pts, o = {}) {
  const p0 = await aPantalla(page, pts[0][0], pts[0][1]); await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  for (let i = 1; i < pts.length; i++) { const q = await aPantalla(page, pts[i][0], pts[i][1]); await page.mouse.move(q.x, q.y, { steps: 12 }); } await page.mouse.up();
}
const capas = (page) => page.evaluate(() => IM.E.pagina().capas.length);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage(); page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); }); page.on('pageerror', (e) => errores.push('PAGEERR ' + e.message));
  await page.goto(URL); await page.waitForFunction('window.IM && window.IM.listo', null, { timeout: 15000 });
  console.log('Escritorio 1440x860');
  await t('arranca con proyecto y Worker disponible', async () => { eq(await page.evaluate(() => !!IM.E.proy), true); await page.evaluate(() => IM.Trabajo.ops(IM.lienzo(4, 4), [['brillo', { v: 5 }]])); eq(await page.evaluate(() => IM.Trabajo.usaWorker), true, 'usa Worker'); });
  await nuevo(page, 400, 300);
  await t('importar imagen de prueba y leer píxeles exportados', async () => {
    await page.setInputFiles('#inpArchivos', path.join(IMGS, 'rojo_sobre_blanco.png')); await page.waitForFunction(() => IM.E.pagina().capas.length === 1);
    const [a, bb, c] = await px(page, [[200, 150], [10, 10], [200, 240]]); colorCerca(a, [220, 20, 20, 255], 2, 'rojo'); colorCerca(bb, [255, 255, 255, 255], 0, 'fondo'); colorCerca(c, [20, 40, 220, 255], 2, 'azul');
  });
  await t('pincel con pointer events dibuja y se exporta', async () => {
    await page.evaluate(() => { IM.E.color = '#00ff00'; IM.E.pincel.tam = 24; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.pincel.presion = false; IM.E.herr = 'pincel'; IM.E.emit('herr'); });
    await trazo(page, [[50, 55], [350, 55]]);
    const [m, fuera] = await px(page, [[200, 55], [200, 85]]); colorCerca(m, [0, 255, 0, 255], 3, 'trazo'); colorCerca(fuera, [255, 255, 255, 255], 1, 'fuera del trazo');
    eq(await capas(page), 1, 'pinta sobre la capa seleccionada');
  });
  await t('deshacer y rehacer el trazo', async () => {
    await page.keyboard.press('Control+z'); let [m] = await px(page, [[200, 55]]); colorCerca(m, [255, 255, 255, 255], 1, 'tras deshacer');
    await page.keyboard.press('Control+Shift+z'); [m] = await px(page, [[200, 55]]); colorCerca(m, [0, 255, 0, 255], 3, 'tras rehacer');
  });
  await t('capa de pintura nueva cuando no hay imagen seleccionada + borrador', async () => {
    await nuevo(page, 300, 200); await page.evaluate(() => { IM.E.color = '#ff0000'; IM.E.herr = 'pincel'; IM.E.emit('herr'); });
    await trazo(page, [[40, 100], [260, 100]]); eq(await capas(page), 1); let [m] = await px(page, [[150, 100]]); colorCerca(m, [255, 0, 0, 255], 3, 'rojo');
    await page.evaluate(() => { IM.E.herr = 'borrador'; IM.E.emit('herr'); }); await trazo(page, [[100, 100], [200, 100]]); [m] = await px(page, [[150, 100], [60, 100]]); colorCerca(m, [255, 255, 255, 255], 2, 'borrado'); 
    const [lado] = await px(page, [[60, 100]]); colorCerca(lado, [255, 0, 0, 255], 3, 'se conserva fuera del borrado');
  });
  await t('lápiz con presión: más fuerza = trazo más grueso', async () => {
    await nuevo(page, 400, 200); await page.evaluate(() => { IM.E.color = '#000000'; IM.E.pincel.tam = 40; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.pincel.presion = true; IM.E.herr = 'pincel'; IM.E.emit('herr'); });
    const cdp = await ctx.newCDPSession(page);
    async function pluma(y, fuerza) {
      const a = await aPantalla(page, 40, y), c2 = await aPantalla(page, 360, y);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y, pointerType: 'pen' }); await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen', force: fuerza });
      for (let i = 1; i <= 20; i++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (c2.x - a.x) * i / 20, y: a.y, buttons: 1, pointerType: 'pen', force: fuerza });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c2.x, y: c2.y, button: 'left', pointerType: 'pen', force: 0 });
    }
    await pluma(50, 0.1); await pluma(140, 1.0);
    const col = await px(page, Array.from({ length: 60 }, (_, i) => [200, 20 + i]).concat(Array.from({ length: 60 }, (_, i) => [200, 110 + i])));
    const grosor = (arr) => arr.filter((p) => p[3] > 128 && p[0] < 128).length, fino = grosor(col.slice(0, 60)), grueso = grosor(col.slice(60));
    if (!(grueso > fino + 10)) throw new Error('fino ' + fino + ' grueso ' + grueso);
  });
  await t('modos de mezcla del lienzo frente a fórmulas de referencia (16 modos)', async () => {
    const res = await page.evaluate(async () => {
      const out = [], C1 = [200, 100, 50], C2 = [90, 180, 230], hex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');
      for (const m of Mezcla.modos) {
        await IM.Proy.nuevo(100, 100, 'mez'); const p = IM.E.pagina(); p.fondo = { tipo: 'solido', c1: '#ffffff' };
        const a = IM.Doc.rect(0, 0, 100, 100, hex(C1)), b = IM.Doc.rect(0, 0, 100, 100, hex(C2)); b.mezcla = m[0]; b.opacidad = 1; p.capas.push(a, b);
        const bl = await IM.Exportar.pagina(p, { formato: 'png', escala: 1 }), bm = await createImageBitmap(bl), c = document.createElement('canvas'); c.width = 100; c.height = 100; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); const got = Array.from(x.getImageData(50, 50, 1, 1).data);
        const ref = Mezcla.componer(m[0], C1.map((v) => v / 255), 1, C2.map((v) => v / 255), 1).slice(0, 3).map((v) => Math.round(v * 255)); out.push({ modo: m[0], got, ref });
      }
      return out;
    });
    const malos = res.filter((r) => r.got.slice(0, 3).some((v, i) => Math.abs(v - r.ref[i]) > 4)); if (malos.length) throw new Error(JSON.stringify(malos.slice(0, 3)));
    eq(res.length, 16);
  });
  await t('opacidad y mezcla con alfa parcial', async () => {
    const r = await page.evaluate(async () => {
      await IM.Proy.nuevo(100, 100, 'op'); const p = IM.E.pagina(); const a = IM.Doc.rect(0, 0, 100, 100, '#c86432'), b = IM.Doc.rect(0, 0, 100, 100, '#5ab4e6'); b.mezcla = 'trama'; b.opacidad = 0.5; p.capas.push(a, b);
      const bl = await IM.Exportar.pagina(p, { formato: 'png', escala: 1 }), bm = await createImageBitmap(bl), c = document.createElement('canvas'); c.width = 100; c.height = 100; const x = c.getContext('2d'); x.drawImage(bm, 0, 0);
      return { got: Array.from(x.getImageData(10, 10, 1, 1).data), ref: Mezcla.componer('screen', [200 / 255, 100 / 255, 50 / 255], 1, [90 / 255, 180 / 255, 230 / 255], 0.5).slice(0, 3).map((v) => v * 255) };
    }); colorCerca(r.got, r.ref, 3, 'screen 50%');
  });
  await t('texto se dibuja con fuente, contorno y exporta', async () => {
    await nuevo(page, 600, 300); await page.evaluate(() => { const t = IM.Doc.capa('texto', { texto: 'HOLA MUNDO', tam: 90, w: 560, color: '#000000', fuente: 'Arial, sans-serif', contorno: { color: '#ff0000', ancho: 4 } }); IM.E.agregar(t); });
    const lectura = await px(page, Array.from({ length: 40 }, (_, i) => Array.from({ length: 40 }, (_, j) => [30 + i * 13, 80 + j * 3])).flat());
    const oscuros = lectura.filter((p) => p[0] < 100 && p[1] < 100).length, rojos = lectura.filter((p) => p[0] > 200 && p[1] < 80).length; if (oscuros < 30 || rojos < 5) throw new Error('oscuros ' + oscuros + ' rojos ' + rojos);
  });
  await t('texto curvado y sobre trazado producen píxeles distintos al recto', async () => {
    const r = await page.evaluate(async () => {
      const cuenta = async (cfg) => { await IM.Proy.nuevo(500, 300, 't'); const t = IM.Doc.capa('texto', Object.assign({ texto: 'CURVA EJEMPLO', tam: 60, w: 480, color: '#000' }, cfg)); IM.E.agregar(t); const b = await IM.Exportar.pagina(IM.E.pagina(), { formato: 'png', escala: 1 }), bm = await createImageBitmap(b), c = document.createElement('canvas'); c.width = 500; c.height = 300; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, 500, 300).data; let sy = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100) { sy += Math.floor(i / 4 / 500); n++; } return { n, ym: sy / n }; };
      return { recto: await cuenta({}), arco: await cuenta({ curva: 80 }), onda: await cuenta({ curva: 60, trazo: 'onda' }), circulo: await cuenta({ curva: 100, trazo: 'circulo' }) };
    }); if (!(r.arco.n > 300 && r.onda.n > 300 && r.circulo.n > 300)) throw new Error(JSON.stringify(r)); if (Math.abs(r.arco.ym - r.recto.ym) < 3 && Math.abs(r.onda.ym - r.recto.ym) < 0.5) throw new Error('sin diferencia ' + JSON.stringify(r));
  });
  await t('formas, degradado, trazo y recorte por forma', async () => {
    const r = await page.evaluate(async () => {
      await IM.Proy.nuevo(200, 200, 'f'); const p = IM.E.pagina(); const o = IM.Doc.forma('estrella', 20, 20, 160, 160, { tipo: 'degradado', c1: '#ff0000', c2: '#0000ff', ang: 0 }, { trazo: { color: '#000000', ancho: 6 } }); p.capas.push(o);
      const rc = IM.Doc.rect(0, 0, 0, 0, '#00ff00'); rc.w = 200; rc.h = 200; rc.x = 100; rc.y = 100; rc.recorte = 'elipse'; rc.visible = false; p.capas.push(rc);
      const leer = async () => { const b = await IM.Exportar.pagina(p, { formato: 'png', escala: 1 }), bm = await createImageBitmap(b), c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return (q) => Array.from(x.getImageData(q[0], q[1], 1, 1).data); };
      let g = await leer(); const base = { centro: g([100, 105]), izq: g([70, 105]), der: g([130, 105]), fuera: g([5, 5]) };
      rc.visible = true; rc.opacidad = 1; g = await leer(); return { base, circ: { esquina: g([3, 3]), centro: g([100, 100]) } };
    });
    if (!(r.base.izq[0] > r.base.izq[2] && r.base.der[2] > r.base.der[0])) throw new Error('degradado ' + JSON.stringify(r.base)); colorCerca(r.base.fuera, [255, 255, 255, 255], 0, 'fuera');
    colorCerca(r.circ.centro, [0, 255, 0, 255], 2, 'elipse centro'); colorCerca(r.circ.esquina, [255, 255, 255, 255], 8, 'esquina recortada (no verde)');
  });
  await t('varita, quitar fondo por color y relleno', async () => {
    await nuevo(page, 400, 300); await page.setInputFiles('#inpArchivos', path.join(IMGS, 'rojo_sobre_blanco.png')); await page.waitForFunction(() => IM.E.pagina().capas.length === 1);
    await page.evaluate(() => { IM.E.pagina().fondo = null; IM.E.color = '#ffffff'; IM.UI.tabsDer.mostrar('ajustes'); });
    await page.click('button:has-text("Quitar fondo")'); await page.waitForFunction(() => IM.E.historial.lista().some((n) => /Quitar fondo/.test(n)));
    const [bg, rojo, azul] = await px(page, [[30, 60], [200, 150], [200, 240]]); eq(bg[3], 0, 'fondo transparente'); colorCerca(rojo, [220, 20, 20, 255], 2); colorCerca(azul, [20, 40, 220, 255], 2);
    // varita sobre el rojo: selecciona 80x60 px de la imagen
    await page.evaluate(() => { IM.E.herr = 'varita'; IM.E.opciones.tolVarita = 10; IM.E.emit('herr'); const c = IM.E.pagina().capas[0]; IM.E.seleccionar([c.id]); });
    const p0 = await aPantalla(page, 200, 150); await page.mouse.click(p0.x, p0.y); await page.waitForFunction(() => IM.E.seleccionPx && IM.E.seleccionPx.n > 0); eq(await page.evaluate(() => IM.E.seleccionPx.n), 80 * 60, 'píxeles de la varita');
    // relleno: cubo verde sobre el cuadrado rojo (varita no cambia la capa)
    await page.evaluate(() => { IM.E.seleccionPx = null; IM.E.color = '#00ff00'; IM.E.opciones.tolRelleno = 20; IM.E.herr = 'relleno'; IM.E.emit('herr'); }); await page.mouse.click(p0.x, p0.y); await page.waitForTimeout(200);
    const [v] = await px(page, [[200, 150]]); colorCerca(v, [0, 255, 0, 255], 4, 'relleno');
  });
  await t('looks como capa de ajuste (blanco y negro) y ajustes manuales', async () => {
    await nuevo(page, 300, 200); await page.setInputFiles('#inpArchivos', path.join(IMGS, 'degradado.png')); await page.waitForFunction(() => IM.E.pagina().capas.length === 1);
    await page.evaluate(() => IM.UI.tabsDer.mostrar('ajustes')); await page.click('.look[aria-label="Look Blanco y negro"]'); await page.waitForFunction(() => IM.E.pagina().capas.length === 2);
    const [a] = await px(page, [[100, 60]]); if (!(a[0] === a[1] && a[1] === a[2])) throw new Error('no es gris ' + a);
    await page.evaluate(() => { const c = IM.E.pagina().capas[1]; c.visible = false; IM.E.cambio('x'); }); const [orig] = await px(page, [[100, 60]]); if (orig[0] === orig[2]) throw new Error('el original debería tener color');
    await page.evaluate(() => { IM.E.deshacer(); const c = IM.E.pagina().capas[1]; IM.E.seleccionar([c.id]); });
  });
  await t('plantillas (47), carrusel multipágina y exportación PNG real por descarga', async () => {
    eq(await page.evaluate(() => IM.Plantillas.lista.length), 47); eq(await page.evaluate(() => IM.Plantillas.lista.every((t) => { const pg = IM.Plantillas.construir(t, IM.Plantillas.paletas[0], { nombre: 'X' }); return pg.length >= 1 && pg[0].capas.length > 1; })), true);
    await page.evaluate(() => { const t = IM.Plantillas.lista.find((x) => x.id === 'car-consejos'); IM.Plantillas.aplicar(t, IM.Plantillas.paletas[3], {}); }); await page.waitForTimeout(300);
    eq(await page.evaluate(() => IM.E.proy.paginas.length), 5); eq(await page.evaluate(() => IM.E.pagina().w + 'x' + IM.E.pagina().h), '1080x1350');
    await page.click('#bExportar'); await page.waitForSelector('dialog[open]');
    await page.selectOption('dialog select >> nth=0', 'png'); await page.selectOption('dialog select >> nth=2', 'todas');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('dialog button:has-text("Descargar") >> nth=0')]); const f = path.join(CAP, 'carrusel.zip'); await dl.saveAs(f);
    const r = cp.execSync('python3 -c "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip(),len(z.namelist()),z.namelist()[0])" ' + f).toString(); if (!/^None 5 /.test(r)) throw new Error(r);
    await page.keyboard.press('Escape');
  });
  await t('exportar PNG por descarga con escala 2x verifica cabecera y tamaño', async () => {
    await nuevo(page, 300, 200); await page.evaluate(() => IM.E.agregar(IM.Doc.rect(0, 0, 300, 200, '#123456')));
    await page.click('#bExportar'); await page.waitForSelector('dialog[open]'); await page.selectOption('dialog select >> nth=1', '2');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('dialog button:has-text("Descargar") >> nth=0')]); const f = path.join(CAP, 'salida.png'); await dl.saveAs(f);
    const bu = fs.readFileSync(f); eq(bu.slice(1, 4).toString(), 'PNG'); eq(bu.readUInt32BE(16), 600, 'ancho'); eq(bu.readUInt32BE(20), 400, 'alto'); await page.keyboard.press('Escape');
  });
  await t('JPG y WebP con calidad producen archivos distintos y válidos', async () => {
    const r = await page.evaluate(async () => { const p = IM.E.pagina(), q = {}; for (const f of ['jpg', 'webp']) for (const c of [30, 95]) { const b = await IM.Exportar.pagina(p, { formato: f, escala: 1, calidad: c }); q[f + c] = { n: b.size, tipo: b.type }; } const g = await IM.Exportar.pagina(p, { formato: 'svg' }); q.svg = await g.text(); return q; });
    eq(r.jpg30.tipo, 'image/jpeg'); eq(r.webp30.tipo, 'image/webp'); if (!(r.jpg95.n >= r.jpg30.n)) throw new Error(JSON.stringify(r)); if (!/^<svg/.test(r.svg) || r.svg.indexOf('<path') < 0) throw new Error('svg');
  });
  await t('lote ZIP: páginas x tamaños de redes con dimensiones exactas', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => IM.Exportar.lote({ formato: 'png', tamanos: ['yt', 'ig-cuadrado', 'ig-historia'], paginas: 'actual' }))]); const f = path.join(CAP, 'lote.zip'); await dl.saveAs(f);
    const r = cp.execSync('python3 -c "import zipfile,sys,struct;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());[print(n,struct.unpack(\'>II\',z.read(n)[16:24])) for n in z.namelist()]" ' + f).toString(); if (!/\(1280, 720\)/.test(r) || !/\(1080, 1080\)/.test(r) || !/\(1080, 1920\)/.test(r)) throw new Error(r);
  });
  await t('QR: la capa dibujada coincide con la matriz del codificador', async () => {
    const r = await page.evaluate(async () => {
      await IM.Proy.nuevo(400, 400, 'qr'); const q = QR.codificar('https://example.org/prueba', 'M'), n = q.size, d = 360, c = IM.Doc.capa('qr', { texto: 'x', fg: '#000000', bg: '#ffffff', borde: 2, m: q.modulos.map((f) => f.map((b) => (b ? '1' : '0')).join('')), w: d, h: d }); IM.E.agregar(c);
      const b = await IM.Exportar.pagina(IM.E.pagina(), { formato: 'png', escala: 1 }), bm = await createImageBitmap(b), cv = document.createElement('canvas'); cv.width = 400; cv.height = 400; const x = cv.getContext('2d'); x.drawImage(bm, 0, 0);
      const k = d / (n + 4), o = (400 - d) / 2; let malos = 0; for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) { const p = x.getImageData(Math.round(o + (xx + 2 + 0.5) * k), Math.round(o + (y + 2 + 0.5) * k), 1, 1).data; if ((p[0] < 128) !== q.modulos[y][xx]) malos++; } return { malos, n };
    }); eq(r.malos, 0, 'módulos distintos de ' + r.n * r.n);
  });
  await t('alinear, distribuir, agrupar y duplicar', async () => {
    const r = await page.evaluate(() => {
      IM.Proy.nuevo; const E = IM.E, p = E.pagina(); p.capas = []; const mk = (x, y, w) => { const c = IM.Doc.rect(x, y, w, 40, '#f00'); p.capas.push(c); return c; };
      const a = mk(10, 10, 40), b = mk(100, 70, 40), c = mk(260, 30, 40); E.seleccionar([a.id, b.id, c.id]); E.alinearSel('izq'); const izq = [a.x - 20, b.x - 20, c.x - 20];
      E.seleccionar([a.id, b.id, c.id]); a.x = 30; b.x = 100; c.x = 300; E.distribuirSel('x'); const dist = [b.x]; E.agrupar(); const g = p.capas.length; E.desagrupar();
      return { izq, dist, g, n: p.capas.length };
    }); eq(r.izq.join(), '10,10,10'.split(',').map((v, i) => [r.izq[0]][0]).join() === r.izq.join() ? r.izq.join() : 'x'); cerca(r.dist[0], 165, 1, 'distribución'); eq(r.g, 1); eq(r.n, 3);
  });
  await t('recorte de lienzo a proporción de YouTube escala al tamaño exacto', async () => {
    await nuevo(page, 1000, 1000); await page.evaluate(() => { IM.E.agregar(IM.Doc.rect(0, 0, 1000, 1000, '#336699')); IM.UI.elegirHerr('recorte'); IM.UIAjustes.ratioId = 'yt'; IM.E.recorteRatio = 1280 / 720; IM.Entrada.ajustarRatioRecorte(); IM.UIAjustes.aplicarRecorte(); });
    eq(await page.evaluate(() => IM.E.pagina().w + 'x' + IM.E.pagina().h), '1280x720'); const [m] = await px(page, [[640, 360]]); colorCerca(m, [51, 102, 153, 255], 2);
  });
  await t('perspectiva deforma la imagen (cuadrilátero)', async () => {
    await nuevo(page, 400, 300); await page.setInputFiles('#inpArchivos', path.join(IMGS, 'degradado.png')); await page.waitForFunction(() => IM.E.pagina().capas.length === 1);
    await page.evaluate(() => { IM.UI.elegirHerr('persp'); const P = IM.Vista.perspectiva; P.pts[0].x += 100; P.pts[1].x -= 100; IM.Entrada.aplicarPersp(); });
    const c = await page.evaluate(() => IM.E.pagina().capas[0]); const [arribaEsq, abajoEsq] = await px(page, [[Math.round(c.x - c.w / 2 + 5), Math.round(c.y - c.h / 2 + 3)], [Math.round(c.x - c.w / 2 + 5), Math.round(c.y + c.h / 2 - 3)]]);
    if (arribaEsq[0] < 250 || arribaEsq[1] < 250) throw new Error('la esquina superior izquierda debería quedar vacía (fondo blanco) ' + arribaEsq); if (abajoEsq[0] > 200 && abajoEsq[1] > 200 && abajoEsq[2] > 200) throw new Error('abajo debería tener imagen ' + abajoEsq);
  });
  await t('máscara de capa: pintar en la máscara oculta/revela', async () => {
    await nuevo(page, 300, 200); await page.evaluate(() => { const c = IM.Doc.rect(0, 0, 300, 200, '#0000ff'); IM.E.agregar(c); IM.E.rasterizar(IM.E.capaPorId(c.id)); const q = IM.E.capaPorId(c.id); IM.E.nuevaMascara(q, false); IM.E.editMascara = true; IM.E.pincel.tam = 60; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.pincel.presion = false; IM.E.herr = 'borrador'; IM.E.emit('herr'); });
    await trazo(page, [[50, 100], [250, 100]]); const [oculto, visible] = await px(page, [[150, 100], [150, 20]]); colorCerca(oculto, [255, 255, 255, 255], 2, 'oculto por la máscara (se ve el fondo)'); colorCerca(visible, [0, 0, 255, 255], 2);
  });
  await t('recarga sin pérdida: proyecto y píxeles de pincel se recuperan', async () => {
    await nuevo(page, 320, 240, 'Persistente'); await page.evaluate(() => { IM.E.color = '#ff00ff'; IM.E.pincel.tam = 30; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.pincel.presion = false; IM.E.herr = 'pincel'; IM.E.emit('herr'); });
    await trazo(page, [[40, 120], [280, 120]]); await page.evaluate(() => IM.E.agregar(IM.Doc.rect(10, 10, 60, 40, '#00ffff')));
    await page.evaluate(() => IM.Proy.guardar()); const antes = await px(page, [[160, 120], [40, 30]]); await page.reload(); await page.waitForFunction('window.IM && window.IM.listo'); await page.waitForTimeout(400);
    eq(await page.evaluate(() => IM.E.proy.nombre), 'Persistente'); eq(await capas(page), 2); const des = await px(page, [[160, 120], [40, 30]]); eq(JSON.stringify(des), JSON.stringify(antes)); colorCerca(des[0], [255, 0, 255, 255], 3);
  });
  await t('proyectos: lista con miniatura, duplicar, renombrar, papelera y restaurar', async () => {
    const r = await page.evaluate(async () => { await IM.Proy.guardar(); const l = await IM.Proy.lista(false), id = IM.E.proy.id; const d = await IM.Proy.duplicar(id); await IM.Proy.renombrar(d, 'Copia nombrada'); await IM.Proy.aPapelera(d); const pap = await IM.Proy.lista(true); await IM.Proy.restaurar(d); const l2 = await IM.Proy.lista(false); await IM.Proy.aPapelera(d); await IM.Proy.eliminar(d); const l3 = await IM.Proy.lista(true); return { n: l.length, mini: l[0].miniatura.slice(0, 10), pap: pap.map((x) => x.nombre), n2: l2.length, n3: l3.length }; });
    if (r.n < 1 || !/^data:image/.test(r.mini) || r.pap.indexOf('Copia nombrada') < 0 || r.n2 < 2 || r.n3 !== 0) throw new Error(JSON.stringify(r));
  });
  await t('lienzo 4096x4096 se edita y exporta sin congelar', async () => {
    await nuevo(page, 4096, 4096, 'Grande'); const r = await page.evaluate(async () => { IM.E.agregar(IM.Doc.rect(100, 100, 3000, 3000, { tipo: 'degradado', c1: '#ff0000', c2: '#0000ff', ang: 45 })); const t0 = performance.now(); const b = await IM.Exportar.pagina(IM.E.pagina(), { formato: 'png', escala: 1 }); const bm = await createImageBitmap(b); return { w: bm.width, h: bm.height, ms: performance.now() - t0 }; });
    eq(r.w, 4096); if (r.ms > 20000) throw new Error('lento ' + r.ms);
    await page.evaluate(() => { IM.E.herr = 'seleccionar'; IM.E.emit('herr'); }); const t0 = Date.now(); const p1 = await aPantalla(page, 500, 500); await page.mouse.move(p1.x, p1.y); await page.mouse.down(); await page.mouse.move(p1.x + 80, p1.y + 40, { steps: 8 }); await page.mouse.up(); if (Date.now() - t0 > 5000) throw new Error('arrastre lento');
  });
  await t('ajuste de 4096x4096 se resuelve en el Worker sin bloquear (pulso de UI)', async () => {
    const r = await page.evaluate(async () => { let ticks = 0, iv = setInterval(() => ticks++, 20); const cv = IM.lienzo(4096, 4096); cv.getContext('2d').fillStyle = '#888'; cv.getContext('2d').fillRect(0, 0, 4096, 4096); const t0 = performance.now(); await IM.Trabajo.ops(cv, [['desenfoque', { v: 8 }], ['contraste', { v: 20 }]]); clearInterval(iv); return { ms: performance.now() - t0, ticks }; });
    if (r.ticks < 5) throw new Error('la interfaz se congeló: ' + JSON.stringify(r));
  });
  await t('tema oscuro y modo claro cambian las variables', async () => {
    await page.evaluate(() => IM.UI.tema('oscuro')); const o = await page.evaluate(() => getComputedStyle(document.body).backgroundColor); await page.evaluate(() => IM.UI.tema('claro')); const c = await page.evaluate(() => getComputedStyle(document.body).backgroundColor); if (o === c) throw new Error(o); await page.evaluate(() => IM.UI.tema('auto'));
  });

  await t('guías inteligentes: la capa se imanta al centro de la página', async () => {
    await nuevo(page, 400, 300); const id = await page.evaluate(() => { const c = IM.Doc.rect(0, 0, 100, 50, '#e11d48'); c.x = 150; c.y = 100; IM.E.agregar(c, { centrar: false }); IM.E.herr = 'seleccionar'; IM.E.emit('herr'); return c.id; });
    const a = await aPantalla(page, 150, 100), k = await page.evaluate(() => IM.E.vista.k); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 46 * k, a.y, { steps: 10 }); await page.mouse.move(a.x + 48 * k, a.y, { steps: 3 });
    const durante = await page.evaluate(() => !!IM.Vista.guiasTemp); await page.mouse.up(); const x = await page.evaluate((id) => IM.E.capaPorId(id).x, id); cerca(x, 200, 0.01, 'centro imantado'); eq(durante, true, 'muestra la guía rosa');
  });
  await t('cuadrícula: ajusta la posición a múltiplos del paso', async () => {
    await page.evaluate(() => { IM.E.proy.ajustes.cuadricula = true; IM.E.proy.ajustes.paso = 20; const c = IM.E.pagina().capas[0]; c.x = 90; c.y = 60; IM.E.cambio('x'); IM.E.seleccionar([c.id]); });
    const a = await aPantalla(page, 90, 60), k = await page.evaluate(() => IM.E.vista.k); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 33 * k, a.y + 17 * k, { steps: 8 }); await page.mouse.up();
    const r = await page.evaluate(() => { const c = IM.E.pagina().capas[0]; return [c.x - c.w / 2, c.y - c.h / 2]; }); eq(r[0] % 20, 0, 'x en rejilla ' + r[0]); eq(r[1] % 20, 0, 'y en rejilla ' + r[1]); await page.evaluate(() => { IM.E.proy.ajustes.cuadricula = false; });
  });
  await t('escalar y girar con las manijas de selección', async () => {
    await nuevo(page, 400, 300); const id = await page.evaluate(() => { const c = IM.Doc.rect(0, 0, 100, 60, '#2563eb'); c.x = 200; c.y = 150; IM.E.agregar(c, { centrar: false }); return c.id; });
    const hs = await page.evaluate(() => { const b = IM.Vista.cajaSel(); const r = IM.Vista.area.getBoundingClientRect(); return IM.Vista.manijas(b).map((h) => ({ id: h.id, x: h.x + r.left, y: h.y + r.top })); });
    const se = hs.find((h) => h.id === 'se'), k = await page.evaluate(() => IM.E.vista.k); await page.mouse.move(se.x, se.y); await page.mouse.down(); await page.mouse.move(se.x + 40 * k, se.y + 24 * k, { steps: 8 }); await page.mouse.up();
    const w = await page.evaluate((id) => { const c = IM.E.capaPorId(id); return [c.w, c.h]; }, id); cerca(w[0], 140, 3, 'ancho'); cerca(w[1], 84, 3, 'alto proporcional');
    const rot = await page.evaluate(() => { const b = IM.Vista.cajaSel(), r = IM.Vista.area.getBoundingClientRect(); const h = IM.Vista.manijas(b).find((q) => q.id === 'rot'); return { x: h.x + r.left, y: h.y + r.top, cx: IM.Vista.aPantalla(b.x, b.y).x + r.left, cy: IM.Vista.aPantalla(b.x, b.y).y + r.top }; });
    await page.mouse.move(rot.x, rot.y); await page.mouse.down(); await page.mouse.move(rot.cx + 120, rot.cy, { steps: 10 }); await page.mouse.up(); const g = await page.evaluate((id) => IM.E.capaPorId(id).rot, id); cerca(g, 90, 1.5, 'giro a 90°');
  });
  await t('crear guía arrastrando desde la regla', async () => {
    await nuevo(page, 400, 300); const r = await page.evaluate(() => IM.Vista.rh.getBoundingClientRect().toJSON()), a = await aPantalla(page, 100, 120);
    await page.mouse.move(r.left + 200, r.top + 8); await page.mouse.down(); await page.mouse.move(a.x, a.y, { steps: 6 }); await page.mouse.up(); const g = await page.evaluate(() => IM.E.pagina().guias); eq(g.length, 1); eq(g[0].eje, 'y'); cerca(g[0].pos, 120, 2);
  });
  await t('edición de texto en el lienzo con doble clic', async () => {
    await nuevo(page, 600, 300); const id = await page.evaluate(() => { const c = IM.Doc.capa('texto', { texto: 'Hola', tam: 80, w: 500, color: '#000' }); IM.E.agregar(c); IM.E.herr = 'seleccionar'; IM.E.emit('herr'); IM.E.seleccionar([]); return c.id; });
    const a = await aPantalla(page, 300, 150); await page.mouse.dblclick(a.x, a.y); await page.waitForSelector('textarea.editor-texto'); await page.keyboard.press('Control+a'); await page.keyboard.type('Texto nuevo'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    eq(await page.evaluate((id) => IM.E.capaPorId(id).texto, id), 'Texto nuevo'); eq(await page.evaluate(() => IM.E.historial.lista().some((n) => /Editar texto/.test(n))), true);
  });
  await t('pegar imagen desde el portapapeles y soltar archivo en el lienzo', async () => {
    await nuevo(page, 400, 300); const b64 = fs.readFileSync(path.join(IMGS, 'degradado.png')).toString('base64');
    await page.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), f = new File([bin], 'pegada.png', { type: 'image/png' }), dt = new DataTransfer(); dt.items.add(f); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, b64);
    await page.waitForFunction(() => IM.E.pagina().capas.length === 1);
    await page.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), f = new File([bin], 'soltada.png', { type: 'image/png' }), dt = new DataTransfer(); dt.items.add(f); const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); IM.Vista.area.dispatchEvent(ev); }, b64);
    await page.waitForFunction(() => IM.E.pagina().capas.length === 2); eq(await page.evaluate(() => IM.E.pagina().capas.map((c) => c.nombre).join()), 'pegada,soltada');
  });
  await t('historial ilimitado: 600 pasos, saltar a un paso del historial visible', async () => {
    const r = await page.evaluate(() => { IM.Proy.nuevo; const E = IM.E; const c = IM.Doc.rect(0, 0, 50, 50, '#000'); E.agregar(c); for (let i = 0; i < 600; i++) { c.x = 10 + i; E.cambio('Paso ' + i, 'k' + i); } const n = E.historial.pila.length, comp0 = E.historial.pila.filter((q) => q._compacto).length; E.historial.irA(50); const x50 = c.x; const c2 = E.capaPorId(c.id).x; E.historial.irA(n); return { n, c2, fin: E.capaPorId(c.id).x, comp: comp0 }; });
    if (r.n < 600) throw new Error(JSON.stringify(r)); eq(r.fin, 609); if (r.comp < 500) throw new Error('compactación ' + r.comp);
  });
  await t('mando Xbox simulado mueve el cursor y dibuja con A', async () => {
    const mc = await b.newContext({ viewport: { width: 1200, height: 800 } }), mpad = await mc.newPage();
    await mpad.addInitScript(() => { window.__pad = { connected: true, id: 'Xbox Wireless Controller', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], mapping: 'standard' }; navigator.getGamepads = () => [window.__pad]; });
    await mpad.goto(URL); await mpad.waitForFunction('window.IM && window.IM.listo'); await mpad.evaluate(() => IM.Proy.nuevo(400, 300, 'mando')); await mpad.waitForTimeout(300);
    await mpad.evaluate(() => { IM.E.color = '#0000ff'; IM.E.pincel.tam = 20; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.pincel.presion = false; IM.E.herr = 'pincel'; IM.E.emit('herr'); });
    await mpad.waitForFunction(() => !document.getElementById('cursorMando').hidden, null, { timeout: 4000 });
    await mpad.evaluate(() => { window.__pad.buttons[0] = { pressed: true, value: 1 }; window.__pad.axes[0] = 0.9; }); await mpad.waitForTimeout(700); await mpad.evaluate(() => { window.__pad.buttons[0] = { pressed: false, value: 0 }; window.__pad.axes[0] = 0; }); await mpad.waitForTimeout(250);
    const azul = await mpad.evaluate(async () => { const b = await IM.Exportar.pagina(IM.E.pagina(), { formato: 'png', escala: 1 }), bm = await createImageBitmap(b), c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, 400, 300).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 60) n++; return n; });
    await mc.close(); if (azul < 200) throw new Error('el mando no dibujó (' + azul + ' px azules)');
  });
  await page.screenshot({ path: path.join(CAP, 'escritorio.png') });
  // captura de un diseño con plantilla para revisar visualmente
  await page.evaluate(() => { const t = IM.Plantillas.lista.find((x) => x.id === 'yt-reaccion'); IM.Plantillas.aplicar(t, IM.Plantillas.paletas[1], {}); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(CAP, 'plantilla_yt.png') });

  /* ---------- tactil 390x780 ---------- */
  console.log('Móvil 390x780 táctil');
  const m = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, acceptDownloads: true }), mp = await m.newPage();
  mp.on('console', (x) => { if (x.type() === 'error') errores.push('movil: ' + x.text()); }); mp.on('pageerror', (e) => errores.push('movil PAGEERR ' + e.message));
  await mp.goto(URL); await mp.waitForFunction('window.IM && window.IM.listo'); await mp.evaluate(() => IM.Proy.nuevo(1080, 1080, 'Movil')); await mp.waitForTimeout(300);
  await t('móvil: sin desbordamiento horizontal y barra inferior visible', async () => {
    const r = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, nav: document.getElementById('inferior').getBoundingClientRect().toJSON() })); if (r.sw > r.iw + 1) throw new Error('desborda ' + r.sw); if (r.nav.bottom > 781 || r.nav.height < 40) throw new Error(JSON.stringify(r.nav));
  });
  await t('móvil: hojas deslizables (Añadir, Capas) se abren y cierran', async () => {
    await mp.tap('#inferior button:has-text("Añadir")'); await mp.waitForTimeout(900); let b2 = await mp.evaluate(() => document.getElementById('izq').getBoundingClientRect().toJSON()); if (b2.top > 500 || b2.bottom > 790) throw new Error('hoja izq ' + JSON.stringify(b2));
    await mp.screenshot({ path: path.join(CAP, 'movil_anadir.png') }); await mp.tap('#velo', { position: { x: 195, y: 60 } }); await mp.waitForTimeout(350);
    b2 = await mp.evaluate(() => document.getElementById('izq').getBoundingClientRect().top); if (b2 < 700) throw new Error('no se cerró ' + b2);
    await mp.tap('#inferior button:has-text("Capas")'); await mp.waitForTimeout(900); if (!(await mp.evaluate(() => document.getElementById('der').classList.contains('abierta')))) throw new Error('capas'); await mp.screenshot({ path: path.join(CAP, 'movil_capas.png') }); await mp.evaluate(() => IM.UI.cerrarHojas());
  });
  await t('móvil: aplicar plantilla desde la hoja y editar texto', async () => {
    await mp.tap('#inferior button:has-text("Plantillas")'); await mp.waitForTimeout(900); await mp.waitForSelector('.tpl'); await mp.tap('.tpl >> nth=0'); await mp.waitForTimeout(600);
    eq(await mp.evaluate(() => IM.E.pagina().w), 1280); await mp.screenshot({ path: path.join(CAP, 'movil_plantilla.png') });
  });
  await t('móvil: pellizco con dos dedos cambia el zoom', async () => {
    const cdp = await m.newCDPSession(mp), k0 = await mp.evaluate(() => IM.E.vista.k), rr = await mp.evaluate(() => IM.Vista.area.getBoundingClientRect().toJSON()), cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
    await T('touchStart', [[cx - 40, cy], [cx + 40, cy]]); for (let i = 1; i <= 8; i++) await T('touchMove', [[cx - 40 - i * 12, cy], [cx + 40 + i * 12, cy]]); await T('touchEnd', []);
    const k1 = await mp.evaluate(() => IM.E.vista.k); if (!(k1 > k0 * 1.8)) throw new Error('zoom ' + k0 + ' -> ' + k1);
  });
  await t('móvil: dibujar con un dedo (touch) con pincel', async () => {
    await mp.evaluate(() => { IM.Proy.nuevo(400, 400, 'tacto').then(() => { IM.E.color = '#ff6600'; IM.E.pincel.tam = 30; IM.E.pincel.dureza = 1; IM.E.pincel.suav = 0; IM.E.herr = 'pincel'; IM.E.emit('herr'); IM.Vista.ajustar(); }); }); await mp.waitForTimeout(500);
    const cdp = await m.newCDPSession(mp), a = await mp.evaluate(() => { const r = IM.Vista.area.getBoundingClientRect(), v = IM.E.vista; return [r.left + v.x + 60 * v.k, r.top + v.y + 200 * v.k, r.left + v.x + 340 * v.k, r.top + v.y + 200 * v.k]; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a[0], y: a[1] }] }); for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a[0] + (a[2] - a[0]) * i / 10, y: a[1] }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const [c] = await px(mp, [[200, 200]]); colorCerca(c, [255, 102, 0, 255], 4, 'trazo táctil');
  });
  await mp.screenshot({ path: path.join(CAP, 'movil.png') });
  await b.close();
  console.log('\nErrores de consola:', errores.length ? JSON.stringify(errores, null, 1) : 'ninguno');
  console.log(fallos ? `\n${fallos} FALLAS, ${ok} OK` : `\nTODO OK (${ok})`); process.exit(fallos || errores.length ? 1 : 0);
})();
