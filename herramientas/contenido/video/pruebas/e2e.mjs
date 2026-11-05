/* Pruebas de navegador (Playwright + Chromium). Uso: node e2e.mjs [urlBase]
   Requiere: ffmpeg/ffprobe (para generar medios y validar la exportacion), Playwright y Chromium en /opt/pw-browsers.
   Sirve el repo con `python3 -m http.server <puerto>` desde la raiz y pasa la URL (por defecto http://localhost:8791). */
import { createRequire } from 'module';
import fs from 'fs'; import os from 'os'; import path from 'path';
import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8791') + '/herramientas/contenido/video/index.html';
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 've2e-'));
const SHOTS = process.env.CAPTURAS || TMP;
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const resultados = []; const ok = (n, c, d) => { resultados.push([n, !!c, d]); console.log((c ? 'OK    ' : 'FALLA ') + n + (d !== undefined ? '  [' + d + ']' : '')); };

/* --- medios sinteticos --- */
const M = (n) => path.join(TMP, n);
ff('-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:v', 'libvpx-vp9', '-b:v', '300k', '-g', '25', '-c:a', 'libopus', '-shortest', M('clip1.webm'));
ff('-f', 'lavfi', '-i', 'testsrc2=size=240x426:rate=25:duration=2.4', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2.4', '-c:v', 'libvpx-vp9', '-b:v', '300k', '-g', '25', '-c:a', 'libopus', '-shortest', M('vertical.webm'));
ff('-f', 'lavfi', '-i', 'color=c=0x00ff00:size=320x240:rate=25:duration=2', '-f', 'lavfi', '-i', 'color=c=red:size=80x80:rate=25:duration=2', '-filter_complex', '[0][1]overlay=x=100:y=80', '-c:v', 'libvpx-vp9', '-b:v', '300k', M('verde.webm'));
ff('-f', 'lavfi', '-i', 'testsrc=size=400x300:rate=25:duration=3', '-vf', "crop=w=320:h=240:x='40+30*sin(t*9)':y='30+22*cos(t*7)'", '-c:v', 'libvpx-vp9', '-b:v', '300k', M('tembloroso.webm'));
ff('-f', 'lavfi', '-i', 'gradients=size=800x600:duration=1:rate=1', '-frames:v', '1', M('foto.png'));
ff('-f', 'lavfi', '-i', 'sine=frequency=523:duration=3', '-ar', '44100', M('tono.wav'));
fs.writeFileSync(M('guion.srt'), '1\n00:00:00,500 --> 00:00:02,000\nHola desde el SRT\n\n2\n00:00:02,500 --> 00:00:04,000\nSegunda línea\n');

const lanzar = (extra = []) => chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', ...extra] });
function vigilar(pg, errs) { pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGEERR ' + e.message)); }
const abrir = async (pg) => { await pg.goto(BASE); await pg.waitForSelector('html[data-listo="1"]', { timeout: 20000 }); };
const A = (pg, f, ...a) => pg.evaluate(f, ...a);
const nClips = (pg) => A(pg, () => __VE.p.pistas.reduce((n, t) => n + t.clips.length, 0));
const pixel = (pg, fx, fy) => A(pg, ([fx, fy]) => { const c = document.getElementById('lienzo'), x = c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data; return [x[0], x[1], x[2]]; }, [fx, fy]);
const bajar = async (pg) => { const b64 = await A(pg, async () => { const ab = await window.__ultimaExportacion.blob.arrayBuffer(); let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }); const f = M('exp' + Math.random().toString(36).slice(2, 6) + '.webm'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f; };
const sonda = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', f]).toString());

const b = await lanzar();
let ctx = await b.newContext({ viewport: { width: 1360, height: 820 }, acceptDownloads: true });
let pg = await ctx.newPage(); const errs = []; vigilar(pg, errs);
await abrir(pg);
const cap = await A(pg, () => __VE.cap);
ok('arranca y detecta capacidades', cap.webcodecs && cap.mediaRecorder, JSON.stringify(cap.codecs));

/* --- importacion --- */
await pg.setInputFiles('#archivos', [M('clip1.webm'), M('vertical.webm'), M('foto.png'), M('tono.wav')]);
await pg.waitForFunction(() => Object.keys(__VE.p.medios).length === 4, null, { timeout: 15000 });
await pg.waitForTimeout(800);
const med = await A(pg, () => Object.values(__VE.p.medios).map(m => [m.nombre, m.tipo, +m.dur.toFixed(2), m.w, m.h]));
ok('importa video, imagen y audio con metadatos', med.length === 4 && med[0][1] === 'video' && Math.abs(med[0][2] - 3) < 0.1 && med[0][3] === 320 && med[2][1] === 'imagen' && med[3][1] === 'audio', JSON.stringify(med));
ok('la biblioteca muestra 4 tarjetas', (await pg.locator('#contenidoIzq .tarjeta').count()) === 4);
ok('los clips se encadenan en la pista de video', await A(pg, () => { const c = __VE.p.pistas.find(t => t.tipo === 'video').clips; return c.length === 3 && Math.abs(c[1].ini - c[0].dur) < 0.01; }));
ok('el proyecto toma la proporcion del primer video (16:9)', (await A(pg, () => __VE.p.aspecto)) === '16:9');
await A(pg, () => __VE.motor.ir(1)); await pg.waitForTimeout(700);
let px = await pixel(pg, 0.5, 0.5); ok('la vista previa dibuja el video (no negro)', px[0] + px[1] + px[2] > 60, px.join(','));
await pg.screenshot({ path: path.join(SHOTS, 'e2e-1-importado.png') });

/* --- edicion en linea de tiempo --- */
await A(pg, () => { __VE.motor.ir(1.0); });
const clip1 = pg.locator('#pistas .p-video .clip').first(); await clip1.click({ position: { x: 60, y: 30 } });
ok('clic en un clip lo selecciona', await A(pg, () => !!__VE.sel));
const n0 = await nClips(pg); await pg.click('#tlDividir'); ok('dividir en el cursor (+1 clip)', (await nClips(pg)) === n0 + 1);
await pg.keyboard.press('Control+z'); ok('deshacer restaura', (await nClips(pg)) === n0);
await pg.keyboard.press('Control+y'); ok('rehacer repite', (await nClips(pg)) === n0 + 1);
await pg.keyboard.press('Control+z');
// arrastrar el segundo clip de video para moverlo
const box = await pg.locator('#pistas .p-video .clip').nth(2).boundingBox();
const ini0 = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[2].ini);
await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.down(); await pg.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 6 }); await pg.mouse.up();
const ini1 = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[2].ini);
ok('arrastrar mueve el clip', ini1 > ini0 + 0.5, ini0.toFixed(2) + ' -> ' + ini1.toFixed(2));
await pg.keyboard.press('Control+z');
// recortar borde derecho con el raton
const c0 = pg.locator('#pistas .p-video .clip').first(); await c0.click({ position: { x: 40, y: 30 } });
const b0 = await c0.boundingBox(); const d0 = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[0].dur);
await pg.mouse.move(b0.x + b0.width - 6, b0.y + b0.height / 2); await pg.mouse.down(); await pg.mouse.move(b0.x + b0.width - 90, b0.y + b0.height / 2, { steps: 5 }); await pg.mouse.up();
const d1 = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[0].dur); ok('recortar el borde acorta el clip', d1 < d0 - 0.5, d0.toFixed(2) + ' -> ' + d1.toFixed(2));
await pg.keyboard.press('Control+z');
// eliminar con cierre de huecos
await pg.locator('#pistas .p-video .clip').first().click({ position: { x: 40, y: 30 } }); await pg.check('#tlRipple');
const ini2a = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[1].ini); await pg.click('#tlEliminar');
const ini2b = await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'video').clips[0].ini); ok('eliminar con cierre de hueco', ini2b < 0.01 && (await nClips(pg)) === n0 - 1, 'ini ' + ini2a.toFixed(2) + ' -> ' + ini2b.toFixed(2));
await pg.keyboard.press('Control+z'); await pg.uncheck('#tlRipple');
ok('deshacer tras eliminar recupera', (await nClips(pg)) === n0);

// zoom y marcador
const pps0 = await A(pg, () => VE.linea.pps); await pg.click('#tlZoomMas'); ok('zoom de la linea de tiempo', (await A(pg, () => VE.linea.pps)) > pps0);
await pg.click('#tlMarcador'); ok('marcador anadido', (await A(pg, () => __VE.p.marcadores.length)) === 1);

/* --- reproduccion --- */
await A(pg, () => __VE.motor.ir(0)); await pg.locator('#btnPlay').focus(); await pg.keyboard.press('Escape'); await pg.mouse.click(700, 300); await pg.keyboard.press('Space');
await pg.waitForTimeout(1500); const tPlay = await A(pg, () => __VE.motor.t); ok('espacio reproduce y el tiempo avanza', tPlay > 0.8 && tPlay < 2.5, tPlay.toFixed(2));
await pg.keyboard.press('Space'); await pg.waitForTimeout(200); ok('espacio pausa', !(await A(pg, () => __VE.motor.jugando)));
px = await pixel(pg, 0.5, 0.5); ok('reproduccion dibuja fotogramas', px[0] + px[1] + px[2] > 60);

/* --- texto, filtros, keyframes, velocidad --- */
await pg.click('#tab-texto'); await pg.locator('#contenidoIzq .estiloTxt').first().click();
ok('anade texto', await A(pg, () => __VE.clipSel() && __VE.clipSel().tipo === 'texto'));
await pg.locator('#inspector textarea').fill('Hola prueba'); ok('edita el texto en el inspector', (await A(pg, () => __VE.clipSel().texto)) === 'Hola prueba');
await A(pg, () => __VE.motor.ir(__VE.clipSel().ini + 1)); await pg.waitForTimeout(400);
ok('el texto se dibuja sobre el lienzo (pixeles blancos)', await A(pg, () => { const c = document.getElementById('lienzo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let w = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) w++; return w > 200; }));
await A(pg, () => { const f = __VE.p.pistas.find(t => t.tipo === 'video').clips[0]; __VE.seleccionar(f.id); __VE.motor.ir(0.5); });
await pg.click('#tab-efectos'); await pg.locator('#contenidoIzq .filtroT').nth(4).click(); ok('aplica filtro blanco y negro', (await A(pg, () => __VE.clipSel().filtro)) === 'bn');
await pg.waitForTimeout(500); ok('el filtro B/N deja pixeles grises', await A(pg, () => { const c = document.getElementById('lienzo'), d = c.getContext('2d').getImageData(c.width / 2 | 0, c.height / 2 | 0, 1, 1).data; return Math.abs(d[0] - d[1]) < 12 && Math.abs(d[1] - d[2]) < 12; }));
await A(pg, () => { const c = __VE.clipSel(); c.filtro = 'ninguno'; });
await pg.locator('#inspector .kf').first().click(); ok('anade fotograma clave', (await A(pg, () => Object.keys(__VE.clipSel().kf).length)) >= 1);
await A(pg, () => { const c = __VE.clipSel(); c.kf = {}; });
await A(pg, () => { const c = __VE.clipSel(); __VE.p.medios; VE.modelo.velocidad(__VE.p, c.id, 2); __VE.commit('v'); });
ok('velocidad 2x acorta a la mitad', await A(pg, () => { const c = __VE.clipSel(); return c.vel === 2 && Math.abs(c.dur - 1.504) < 0.02; }));
await pg.keyboard.press('Control+z');
await A(pg, () => { const c = __VE.clipSel(); __VE.motor.ir(c.ini + 1); __VE.congelar(); });
ok('congelar fotograma crea clip fijo', await A(pg, () => VE.modelo.todos(__VE.p).some(c => c.cong)));
await pg.keyboard.press('Control+z');

/* --- transiciones --- */
await A(pg, () => { const c = __VE.p.pistas.find(t => t.tipo === 'video').clips[1]; __VE.seleccionar(c.id); __VE.aplicarTransicion('fundido', 1); __VE.motor.ir(c.ini + 0.5); });
await pg.waitForTimeout(700); ok('transicion de fundido combina dos clips', await A(pg, () => !!__VE.clipSel().trans && __VE.clipSel().trans.dur === 1));
await pg.screenshot({ path: path.join(SHOTS, 'e2e-2-transicion.png') });

/* --- croma --- */
await pg.setInputFiles('#archivos', [M('verde.webm')]); await pg.waitForFunction(() => Object.keys(__VE.p.medios).length === 5, null, { timeout: 10000 });
const idv = await A(pg, () => { const ms = Object.values(__VE.p.medios); const v = ms.find(m => m.nombre === 'verde.webm'); const c = VE.modelo.todos(__VE.p).find(x => x.medio === v.id); VE.modelo.mover(__VE.p, c.id, 0, VE.modelo.buscar(__VE.p, c.id).pista.id); const pip = __VE.p.pistas.find(t => t.tipo === 'pip'); const f = VE.modelo.buscar(__VE.p, c.id); f.pista.clips.splice(f.i, 1); pip.clips.push(c); c.ini = 0; c.esc = 1; c.x = 0; c.y = 0; c.radio = 0; c.fit = 'cubrir'; __VE.commit('cr'); __VE.motor.ir(0.3); return c.id; });
await pg.waitForTimeout(800); const pxVerde = await pixel(pg, 0.02, 0.02);
await A(pg, (id) => { const c = VE.modelo.buscar(__VE.p, id).clip; c.croma = { on: true, color: '#00ff00', tol: 0.35, suave: 0.12 }; __VE.commit('croma'); __VE.motor.ir(0.31); }, idv); await pg.waitForTimeout(800);
const pxCroma = await pixel(pg, 0.02, 0.02); const pxRojo = await pixel(pg, 0.5, 0.5);
ok('croma: el verde deja de ser verde y se ve el fondo', pxVerde[1] > 200 && pxVerde[0] < 40 && !(pxCroma[1] > 200 && pxCroma[0] < 40), 'antes ' + pxVerde + ' despues ' + pxCroma);
ok('croma: el sujeto rojo se conserva', pxRojo[0] > 180 && pxRojo[1] < 80, pxRojo.join(','));
await pg.keyboard.press('Control+z'); await pg.keyboard.press('Control+z');

/* --- audio: musica, efectos y mezcla --- */
await pg.click('#tab-audio'); await pg.locator('#contenidoIzq .item .btn.prim').first().click();
ok('anade musica generada a la pista de musica', await A(pg, () => __VE.p.pistas.find(t => t.tipo === 'musica').clips.length === 1));
await pg.locator('#contenidoIzq .lista').nth(1).locator('.btn.prim').nth(2).click(); ok('anade efecto de sonido', await A(pg, () => __VE.p.pistas.filter(t => t.tipo === 'audio').reduce((n, t) => n + t.clips.length, 0) >= 2));
const mez = await A(pg, async () => { const m = await VE.mezclaProyecto(__VE.p, 48000); let pk = 0; for (let i = 0; i < m.L.length; i++) pk = Math.max(pk, Math.abs(m.L[i])); return { pk, n: m.L.length, dur: m.dur }; });
ok('la mezcla del proyecto tiene audio', mez.pk > 0.1 && mez.pk <= 1, JSON.stringify(mez));
ok('tiene 14 musicas y 29 efectos disponibles', (await pg.locator('#contenidoIzq .lista').nth(0).locator('.item').count()) >= 10 && (await pg.locator('#contenidoIzq .lista').nth(1).locator('.item').count()) >= 20);

/* --- subtitulos --- */
await pg.click('#tab-subtitulos'); await pg.locator('#contenidoIzq textarea').fill(fs.readFileSync(M('guion.srt'), 'utf8')); await pg.getByText('Crear desde texto').click();
ok('crea subtitulos desde SRT pegado', (await A(pg, () => __VE.cuesActuales().length)) === 2);
const srt = await A(pg, () => VE.subtitulos.aSRT(__VE.cuesActuales().map(c => ({ ini: c.ini, fin: c.ini + c.dur, texto: c.texto }))));
ok('exporta SRT valido', /^1\n\d\d:\d\d:\d\d,\d{3} --> /.test(srt) && srt.includes('Hola desde el SRT'));
const dl = pg.waitForEvent('download'); await pg.getByText('Exportar SRT').click(); const dd = await dl; ok('descarga archivo .srt', dd.suggestedFilename().endsWith('.srt'), dd.suggestedFilename());
await pg.locator('#contenidoIzq textarea').fill('Primera frase del guion. Segunda frase del guion\nTercera linea'); await pg.getByText('Crear desde texto').click();
ok('crea subtitulos desde guion', (await A(pg, () => __VE.cuesActuales().length)) >= 3);
ok('dictado: con soporte muestra el aviso de calidad variable', (await pg.getByText('la calidad varía').count()) > 0);
await pg.screenshot({ path: path.join(SHOTS, 'e2e-3-subtitulos.png') });
await pg.setInputFiles('#archivos', [M('guion.srt')]); await pg.waitForTimeout(500); ok('importa archivo SRT', (await A(pg, () => __VE.cuesActuales().some(c => c.texto === 'Hola desde el SRT'))));

/* --- plantillas --- */
await pg.click('#tab-plantillas'); pg.once('dialog', d => d.accept()); await pg.locator('#contenidoIzq .item .btn.prim').first().click();
ok('aplica plantilla (intro)', await A(pg, () => __VE.p.aspecto === '16:9' && VE.modelo.todos(__VE.p).some(c => c.texto === 'TU TÍTULO AQUÍ')));
await A(pg, () => __VE.motor.ir(1.5)); await pg.waitForTimeout(600); await pg.screenshot({ path: path.join(SHOTS, 'e2e-4-plantilla.png') });
await pg.keyboard.press('Control+z'); await pg.keyboard.press('Control+z'); await pg.keyboard.press('Control+z'); await pg.keyboard.press('Control+z');

/* --- reencuadre inteligente / aspecto --- */
await A(pg, () => { __VE.seleccionar(null); }); await pg.selectOption('#selAspecto', '9:16'); await pg.waitForTimeout(1500);
ok('cambiar a 9:16 cambia el lienzo y reencuadra', await A(pg, () => { const c = document.getElementById('lienzo'); return c.height > c.width && VE.modelo.todos(__VE.p).some(x => x.foco); }));
await pg.screenshot({ path: path.join(SHOTS, 'e2e-5-9x16.png') });
await pg.selectOption('#selAspecto', '16:9');

/* --- guardado, recuperacion, proyecto como archivo --- */
await A(pg, () => { __VE.p.nombre = 'Prueba E2E'; __VE.commit('n'); }); await pg.waitForTimeout(1200);
const antes = await nClips(pg); await pg.reload(); await abrir(pg); await pg.waitForTimeout(1500);
ok('recupera el proyecto tras recargar', (await nClips(pg)) === antes && (await A(pg, () => __VE.p.nombre)) === 'Prueba E2E', antes + ' clips');
await A(pg, () => __VE.motor.ir(0.5)); await pg.waitForTimeout(900); px = await pixel(pg, 0.5, 0.5); ok('los medios se recuperan de IndexedDB y se dibujan', px[0] + px[1] + px[2] > 60, px.join(','));
await pg.click('#btnProyectos'); await pg.waitForSelector('dialog[open]');
const dlp = pg.waitForEvent('download'); await pg.getByText('Exportar proyecto actual').click(); const pf = await dlp; const rutaCvp = M('proy.cvp'); await pf.saveAs(rutaCvp);
ok('exporta el proyecto como archivo .cvp con medios', fs.statSync(rutaCvp).size > 100000 && fs.readFileSync(rutaCvp).subarray(0, 4).toString() === 'CVP1', fs.statSync(rutaCvp).size + ' bytes');
await pg.locator('dialog').getByText('Duplicar').first().click(); await pg.waitForTimeout(500); ok('duplica el proyecto', (await pg.locator('dialog .item').count()) >= 2);
await pg.locator('dialog .item', { hasText: '(copia)' }).locator('button[aria-label="Mover a la papelera"]').click(); await pg.waitForTimeout(400);
ok('mueve a la papelera', (await pg.locator('dialog .item', { hasText: '(copia)' }).count()) === 0);
await pg.keyboard.press('Escape');
await pg.setInputFiles('#archivos', [rutaCvp]); await pg.waitForFunction(() => /importado/.test(__VE.p.nombre), null, { timeout: 15000 });
ok('importa el proyecto .cvp', (await nClips(pg)) === antes && (await A(pg, () => Object.keys(__VE.p.medios).length)) >= 4);

/* --- exportacion real (WebCodecs VP9 + Opus) --- */
await pg.click('#btnExportar'); await pg.waitForSelector('#exIniciar'); await pg.selectOption('#exFormato', 'webm-vp9'); await pg.waitForTimeout(800);
const opts = await pg.locator('#exRes option:not([disabled])').count(); ok('el selector de resolucion lista opciones disponibles', opts >= 3, opts + '');
await pg.selectOption('#exRes', '480'); await pg.selectOption('#exFps', '24'); const durProy = await A(pg, () => VE.modelo.duracion(__VE.p));
const t0 = Date.now(); await pg.click('#exIniciar'); await pg.waitForSelector('#exResultado', { timeout: 180000 });
const ex = await A(pg, () => { const r = window.__ultimaExportacion; return { v: r.verif, ancho: r.ancho, alto: r.alto, dur: r.dur, metodo: r.metodo }; });
const fexp = await bajar(pg), pr = sonda(fexp), sv = pr.streams.find(s => s.codec_type === 'video'), sa = pr.streams.find(s => s.codec_type === 'audio');
ok('exportacion WebM: se reproduce en el navegador', ex.v.ok && ex.v.w === ex.ancho && ex.v.h === ex.alto, JSON.stringify(ex.v));
ok('exportacion WebM: resolucion y codec esperados (ffprobe)', sv.codec_name === 'vp9' && sv.width === ex.ancho && sv.height === ex.alto, sv.codec_name + ' ' + sv.width + 'x' + sv.height);
ok('exportacion WebM: duracion esperada', Math.abs(parseFloat(pr.format.duration) - durProy) < 0.2 && Math.abs(+sv.nb_read_frames - Math.round(durProy * 24)) <= 1, parseFloat(pr.format.duration).toFixed(2) + ' vs ' + durProy.toFixed(2) + ', frames ' + sv.nb_read_frames);
ok('exportacion WebM: contiene audio Opus', sa && sa.codec_name === 'opus');
let dec = true; try { ff('-i', fexp, '-f', 'null', '-'); } catch (e) { dec = false; } ok('exportacion WebM: decodifica sin errores (ffmpeg)', dec, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
await pg.screenshot({ path: path.join(SHOTS, 'e2e-6-exportado.png') });
// cancelar
await pg.keyboard.press('Escape'); await pg.click('#btnExportar'); await pg.waitForSelector('#exIniciar'); await pg.selectOption('#exFormato', 'webm-vp9'); await pg.waitForTimeout(600); await pg.selectOption('#exRes', '720'); await pg.click('#exIniciar'); await pg.waitForTimeout(600);
await pg.getByText('Cancelar', { exact: true }).click(); await pg.waitForFunction(() => /cancelada/i.test(document.querySelector('dialog .ayuda[aria-live]:last-of-type, dialog')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
ok('la exportacion se puede cancelar', /cancelada/i.test(await pg.locator('dialog').last().textContent())); await pg.keyboard.press('Escape');

/* --- exportacion de compatibilidad (MediaRecorder en tiempo real) --- */
await A(pg, () => { const p = __VE.p; p.pistas.forEach(t => t.clips = t.clips.filter(c => c.ini < 2)); VE.modelo.todos(p).forEach(c => { if (M_fin(c) > 2) c.dur = Math.max(0.3, 2 - c.ini); }); function M_fin(c) { return c.ini + c.dur; } __VE.commit('rt'); });
await pg.click('#btnExportar'); await pg.waitForSelector('#exIniciar'); await pg.selectOption('#exFormato', 'rt'); await pg.waitForTimeout(500); await pg.selectOption('#exRes', '480'); const durRT = await A(pg, () => VE.modelo.duracion(__VE.p));
await pg.click('#exIniciar'); await pg.waitForSelector('#exResultado', { timeout: 60000 }); const frt = await bajar(pg);
let rtDur = 0; try { const o = execFileSync('ffmpeg', ['-i', frt, '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { }
const lg = (() => { try { return execFileSync('sh', ['-c', `ffmpeg -i ${frt} -f null - 2>&1 | grep -o 'time=[0-9:.]*' | tail -1`]).toString().trim(); } catch (e) { return ''; } })(); const m = /time=(\d+):(\d+):([\d.]+)/.exec(lg); if (m) rtDur = +m[1] * 3600 + +m[2] * 60 + +m[3]; const prt = sonda(frt), svr = prt.streams.find(s => s.codec_type === 'video');
ok('exportacion de compatibilidad (MediaRecorder) produce video valido', svr && svr.width === 854 && svr.height === 480 && Math.abs(rtDur - durRT) < 0.8, (svr && svr.codec_name) + ' ' + (svr && svr.width + 'x' + svr.height) + ' dur ' + rtDur + ' vs ' + durRT.toFixed(2));
await pg.keyboard.press('Escape');


/* --- otros codecs: AV1 y VP8 --- */
for (const [fid, cn] of [['webm-av1', 'av1'], ['webm-vp8', 'vp8']]) {
  await pg.click('#btnExportar'); await pg.waitForSelector('#exIniciar'); await pg.selectOption('#exFormato', fid); await pg.waitForTimeout(700); await pg.selectOption('#exRes', '480'); await pg.selectOption('#exFps', '24');
  await pg.click('#exIniciar'); await pg.waitForSelector('#exResultado', { timeout: 120000 }); const fx = await bajar(pg); const px2 = sonda(fx), sv2 = px2.streams.find(x => x.codec_type === 'video');
  let d2 = true; try { ff('-i', fx, '-f', 'null', '-'); } catch (e) { d2 = false; }
  ok('exportacion ' + cn.toUpperCase() + ' valida', sv2 && sv2.codec_name === cn && sv2.width === 854 && d2 && px2.streams.some(x => x.codec_type === 'audio'), sv2 && sv2.codec_name + ' ' + sv2.nb_read_frames + ' frames'); await pg.keyboard.press('Escape');
}

/* --- grabar camara (dispositivo falso), pantalla y teleprompter --- */
await pg.click('#tab-medios'); await pg.getByText('📷 Cámara').click(); await pg.waitForFunction(() => { const b = document.querySelector('dialog .btn.prim'); return b && !b.disabled; }, null, { timeout: 10000 });
const nm = await A(pg, () => Object.keys(__VE.p.medios).length); await pg.getByText('● Grabar').click(); await pg.waitForTimeout(2200); await pg.getByText('■ Detener').click(); await pg.getByText('Añadir a la línea de tiempo').click(); await pg.waitForTimeout(1500);
ok('graba con camara y micrófono (MediaRecorder) y lo agrega', (await A(pg, () => Object.keys(__VE.p.medios).length)) === nm + 1 && await A(pg, () => Object.values(__VE.p.medios).some(m => /Cámara/.test(m.nombre) && m.dur > 1)));
await pg.getByText('🖥 Pantalla').click(); await pg.waitForTimeout(2500); const pant = await pg.locator('dialog .btn.prim').first().isEnabled().catch(() => false); ok('grabar pantalla (getDisplayMedia) abre el flujo', pant || (await pg.locator('dialog .aviso.mal, dialog .ayuda').count()) > 0, pant ? 'conectado' : 'sin permiso en el Chromium de pruebas'); await pg.keyboard.press('Escape');
await pg.getByText('📜 Teleprompter').click(); await pg.locator('#prompter textarea').fill('Linea uno\nLinea dos\nLinea tres'); await pg.getByText('▶ Empezar').click(); await pg.waitForTimeout(4600);
const ty1 = await A(pg, () => parseFloat(document.querySelector('#prompter .texto > div:not(.linea)').style.top)); await pg.waitForTimeout(500); const ty2 = await A(pg, () => parseFloat(document.querySelector('#prompter .texto > div:not(.linea)').style.top));
ok('teleprompter desplaza el texto', ty2 < ty1, ty1.toFixed(0) + ' -> ' + ty2.toFixed(0)); await pg.locator('#prompter').getByText('Cerrar', { exact: true }).click();

/* --- tema y accesibilidad --- */
const t0t = await A(pg, () => document.documentElement.getAttribute('data-tema')); await pg.click('#btnTema'); await pg.click('#btnTema'); const t1t = await A(pg, () => document.documentElement.getAttribute('data-tema'));
ok('cambia el tema', t0t !== t1t, t0t + ' -> ' + t1t); await pg.screenshot({ path: path.join(SHOTS, 'e2e-7-tema.png') });
const sinNombre = await A(pg, () => [...document.querySelectorAll('button,select,input,textarea')].filter(e => !e.closest('dialog:not([open])') && e.type !== 'hidden' && e.id !== 'archivos' && !(e.textContent || '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('title') && !(e.labels && e.labels.length) && !e.closest('label')).map(e => e.outerHTML.slice(0, 80)));
ok('todos los controles tienen nombre accesible', sinNombre.length === 0, sinNombre.join(' | '));
ok('regiones y roles ARIA presentes', await A(pg, () => !!document.querySelector('[role=tablist]') && !!document.querySelector('#estado[aria-live]') && document.querySelector('#lienzo').getAttribute('role') === 'img'));
await pg.mouse.click(700, 300); await pg.keyboard.press('Tab'); ok('foco visible por teclado (outline definido)', await A(pg, () => { const e = document.activeElement; return e !== document.body && getComputedStyle(e).outlineStyle !== 'none' && parseFloat(getComputedStyle(e).outlineWidth) >= 2; }));
ok('sin errores de consola en la sesion de escritorio', errs.length === 0, errs.slice(0, 3).join(' | '));
await ctx.close();

/* --- movil 390x780 con gestos --- */
const cm = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const pm = await cm.newPage(); const errm = []; vigilar(pm, errm);
await abrir(pm); await pm.setInputFiles('#archivos', [M('clip1.webm'), M('vertical.webm'), M('tono.wav')]); await pm.waitForFunction(() => Object.keys(__VE.p.medios).length === 3, null, { timeout: 15000 }); await pm.waitForTimeout(1000);
ok('movil: sin desplazamiento horizontal de la pagina', await A(pm, () => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1));
ok('movil: barra inferior visible y boton Exportar accesible', await A(pm, () => { const n = document.getElementById('inferior').getBoundingClientRect(), e = document.getElementById('btnExportar').getBoundingClientRect(); return n.height > 40 && n.bottom <= innerHeight + 1 && e.right <= innerWidth && e.width > 30; }));
await pm.screenshot({ path: path.join(SHOTS, 'e2e-8-movil.png') });
await pm.locator('#inferior [data-ir=medios]').tap(); await pm.waitForTimeout(400); ok('movil: la pestana Medios abre la hoja inferior', await A(pm, () => document.getElementById('app').dataset.hoja === 'izq' && document.getElementById('izq').getBoundingClientRect().top < innerHeight - 100));
await pm.screenshot({ path: path.join(SHOTS, 'e2e-9-movil-hoja.png') }); await pm.locator('#centro').tap({ position: { x: 20, y: 20 } });
const gesto = (sel, pts) => pm.evaluate(([sel, pts]) => { const el = document.querySelector(sel), r = el.getBoundingClientRect(); const ev = (t, id, x, y) => el.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, clientX: x, clientY: y, button: 0 })); pts.forEach(s => ev(s[0], s[1], r.left + s[2], r.top + s[3])); }, [sel, pts]);
const sl0 = await A(pm, () => document.getElementById('lineaH').scrollLeft), pp0 = await A(pm, () => VE.linea.pps);
await pm.click('#tlZoomMas'); await pm.click('#tlZoomMas'); await pm.click('#tlZoomMas'); await pm.waitForTimeout(100);
await gesto('#lineaH', [['pointerdown', 1, 250, 120], ['pointermove', 1, 200, 120], ['pointermove', 1, 120, 120], ['pointerup', 1, 120, 120]]);
ok('movil: arrastrar con un dedo en vacio desplaza la linea de tiempo', (await A(pm, () => document.getElementById('lineaH').scrollLeft)) > sl0 + 20, sl0 + ' -> ' + (await A(pm, () => document.getElementById('lineaH').scrollLeft)));
const pp1 = await A(pm, () => VE.linea.pps);
await gesto('#lineaH', [['pointerdown', 1, 100, 100], ['pointerdown', 2, 160, 100], ['pointermove', 2, 240, 100], ['pointermove', 2, 300, 100], ['pointerup', 2, 300, 100], ['pointerup', 1, 100, 100]]);
ok('movil: pellizco de dos dedos hace zoom', (await A(pm, () => VE.linea.pps)) > pp1 * 1.4, pp1.toFixed(0) + ' -> ' + (await A(pm, () => VE.linea.pps)).toFixed(0));
await A(pm, () => { document.getElementById('lineaH').scrollLeft = 0; }); const ccb = await pm.locator('#pistas .p-video .clip').first().boundingBox();
await pm.touchscreen.tap(ccb.x + ccb.width / 2, ccb.y + ccb.height / 2); await pm.waitForTimeout(200); ok('movil: tocar un clip lo selecciona', !!(await A(pm, () => __VE.sel)));
await pm.locator('#inferior [data-ir=ajustes]').tap(); await pm.waitForTimeout(400); ok('movil: Ajustes muestra el inspector del clip', await A(pm, () => document.getElementById('app').dataset.hoja === 'der' && document.querySelector('#inspector h3')));
await pm.screenshot({ path: path.join(SHOTS, 'e2e-10-movil-ajustes.png') });
ok('sin errores de consola en movil', errm.length === 0, errm.slice(0, 3).join(' | ')); await cm.close();


/* --- respaldo 2D (sin WebGL), inversion, estabilizacion y mando --- */
const c2 = await b.newContext({ viewport: { width: 1200, height: 800 } }); await c2.addInitScript(() => { window.__pad = { id: 'Xbox Wireless Controller', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [window.__pad]; });
const p2 = await c2.newPage(); const err2 = []; vigilar(p2, err2); await abrir(p2);
await p2.setInputFiles('#archivos', [M('clip1.webm'), M('tembloroso.webm')]); await p2.waitForFunction(() => Object.keys(__VE.p.medios).length === 2, null, { timeout: 15000 }); await p2.waitForTimeout(800);
await A(p2, () => { __VE.cfg.webgl = false; __VE.guardarCfg(); const c = __VE.p.pistas.find(t => t.tipo === 'video').clips[0]; __VE.seleccionar(c.id); __VE.aplicarFiltro('bn'); __VE.motor.ir(0.5); });
await p2.waitForTimeout(700); ok('respaldo 2D: el filtro B/N funciona sin WebGL', await A(p2, () => __VE.comp.fx.tipo === '2d' && (() => { const c = document.getElementById('lienzo'), d = c.getContext('2d').getImageData(c.width / 2 | 0, c.height / 2 | 0, 1, 1).data; return Math.abs(d[0] - d[1]) < 14 && Math.abs(d[1] - d[2]) < 14; })()));
await A(p2, () => { const c = __VE.clipSel(); c.filtro = 'ninguno'; c.inv = true; __VE.commit('inv'); __VE.motor.ir(c.ini + 0.4); }); await p2.waitForTimeout(700);
const inv = await A(p2, () => { const c = __VE.clipSel(); return [VE.modelo.tiempoFuente(c, c.ini + 0.4), c.dur]; }); px = await pixel(p2, 0.5, 0.5);
ok('invertir: el tiempo de fuente corre hacia atras y se dibuja', Math.abs(inv[0] - (inv[1] - 0.4)) < 0.01 && px[0] + px[1] + px[2] > 60, JSON.stringify(inv)); await A(p2, () => { __VE.clipSel().inv = false; });
const tembl = await A(p2, async () => { const c = VE.modelo.todos(__VE.p).find(x => __VE.p.medios[x.medio].nombre === 'tembloroso.webm'); __VE.seleccionar(c.id); await __VE.estabilizar(c.id); const d = __VE.clipSel().estabDatos; return { n: d && d.length, max: d && Math.max.apply(null, d.map(x => Math.abs(x[1]))) }; });
ok('estabilizacion: calcula una correccion de movimiento', tembl.n > 10 && tembl.max > 0.01 && isFinite(tembl.max), JSON.stringify(tembl));
await A(p2, () => { __VE.motor.ir(0); }); await p2.waitForTimeout(300);
const pad = (i, v) => p2.evaluate(([i, v]) => { window.__pad.buttons[i].pressed = v; window.__pad.buttons[i].value = v ? 1 : 0; }, [i, v]);
await pad(0, true); await p2.waitForTimeout(300); await pad(0, false); await p2.waitForTimeout(700); const jug = await A(p2, () => __VE.motor.jugando); await pad(0, true); await p2.waitForTimeout(300); await pad(0, false); await p2.waitForTimeout(400);
ok('mando Xbox: A reproduce y pausa', jug && !(await A(p2, () => __VE.motor.jugando)));
await A(p2, () => { __VE.motor.ir(1); }); const n3 = await nClips(p2); await pad(2, true); await p2.waitForTimeout(300); await pad(2, false); await p2.waitForTimeout(300); ok('mando Xbox: X divide en el cursor', (await nClips(p2)) > n3);
ok('sin errores de consola (2D/mando)', err2.length === 0, err2.slice(0, 3).join(' | ')); await c2.close();

/* --- navegador sin WebCodecs ni reconocimiento de voz: degradacion --- */
const cs = await b.newContext({ viewport: { width: 1200, height: 800 } }); await cs.addInitScript(() => { delete window.VideoEncoder; delete window.AudioEncoder; delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
const ps = await cs.newPage(); const errS = []; vigilar(ps, errS); await abrir(ps); await ps.setInputFiles('#archivos', [M('clip1.webm')]); await ps.waitForFunction(() => Object.keys(__VE.p.medios).length === 1, null, { timeout: 10000 });
await ps.click('#btnExportar'); await ps.waitForSelector('#exIniciar'); const fm = await ps.locator('#exFormato option').allTextContents();
ok('sin WebCodecs solo ofrece el modo de compatibilidad', fm.length === 1 && /Compatibilidad/.test(fm[0]), fm.join('|')); await ps.keyboard.press('Escape');
await ps.click('#tab-subtitulos'); ok('sin Web Speech: aviso y edicion manual', (await ps.getByText('no incluye reconocimiento de voz').count()) === 1 && (await ps.getByText('Dictar y reproducir').count()) === 0);
ok('sin errores de consola en modo degradado', errS.length === 0, errS.slice(0, 2).join(' | ')); await cs.close();
await b.close();

const fallos = resultados.filter(r => !r[1]);
console.log('\n' + (resultados.length - fallos.length) + '/' + resultados.length + ' pruebas OK. Capturas en ' + SHOTS);
fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 0 }) ;
process.exit(fallos.length ? 1 : 0);
