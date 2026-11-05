// Colaboración real: 3 páginas (anfitrión + 2 invitados) con WebRTC entre contextos distintos.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://localhost:8123') + '/herramientas/pizarra/index.html';
const SH = '/tmp/claude-0/-home-user-andresmurillo678-github-io/b63b8b13-38da-562a-b68b-e4b16b772c42/scratchpad/shots/';
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO', m); } else console.log('ok  ', m); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const errs = [];
async function nueva(nombre, color) {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await ctx.newPage(); p.ctx = ctx;
  p.on('pageerror', e => errs.push(nombre + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(nombre + ' CONSOLE ' + m.text()); });
  await p.addInitScript(([n, c]) => { try { localStorage.setItem('pizarra_bienvenida', 'true'); localStorage.setItem('juego_perfil', JSON.stringify({ nombre: n, color: c })); } catch (e) {} }, [nombre, color]);
  return p;
}
const abrir = async (p, url = BASE) => { await p.goto(url); await p.waitForSelector('body.listo'); await p.evaluate(() => { if (window.Red) Red.config.iceServers = []; }); await p.waitForTimeout(300); };
const objs = p => p.evaluate(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg).length);
const huella = p => p.evaluate(() => { const d = window.__pizarra.doc; let n = 0; for (const e of d.ent.o.values()) if (e.v.del === false) n++; return n + ':' + d.version; });
const contenido = p => p.evaluate(() => { const d = window.__pizarra.doc; return [...d.ent.o.values()].filter(e => e.v.del === false).map(e => e.id + JSON.stringify(e.v.pts || e.v.texto || [e.v.x, e.v.y])).sort().join('|'); });
async function trazo(p, pts, espera = 0, soltar = true) {
  const r = await p.locator('#escena').boundingBox();
  await p.mouse.move(r.x + pts[0][0], r.y + pts[0][1]); await p.mouse.down();
  for (const [x, y] of pts.slice(1)) await p.mouse.move(r.x + x, r.y + y, { steps: 3 });
  if (espera) await p.waitForTimeout(espera);
  if (soltar) await p.mouse.up();
}
async function invitar(host, guest, sala) {
  const enlace = await host.evaluate(async () => { const i = await Red.invitar(); return i.enlace; });
  await abrir(guest, enlace.startsWith('http') ? enlace.replace(/^https?:\/\/[^/]+/, 'http://localhost:8123') : enlace);
  const resp = await guest.evaluate(async () => { const c = Red.codigoDeUrl(); return await Red.unirse(c); }).catch(async () => null);
  return resp;
}
const host = await nueva('Ana', '#ef4444'), g1 = await nueva('Beto', '#22c55e'), g2 = await nueva('Cami', '#3b82f6');
await abrir(host);
await host.click('[data-herr=pluma]');
await trazo(host, [[300, 300], [380, 330], [460, 300], [520, 380]]);
await host.evaluate(() => { Red.config.iceServers = []; Red.crearSala({ max: 4 }); });
// --- g1 se une (enlace real con ?sala=)
async function codigoLobby(guest) {
  await guest.waitForFunction(() => { const t = document.querySelector('textarea[aria-label="Tu codigo de respuesta"]'); return t && t.value.length > 40; }, null, { timeout: 15000 });
  return guest.evaluate(() => document.querySelector('textarea[aria-label="Tu codigo de respuesta"]').value);
}
async function unir(guest) {
  const enlace = await host.evaluate(async () => (await Red.invitar()).enlace);
  const url = new URL(enlace, BASE); const sala = url.searchParams.get('sala');
  await guest.goto(BASE + '?sala=' + encodeURIComponent(sala)); await guest.waitForSelector('body.listo');
  await guest.evaluate(() => { Red.config.iceServers = []; });
  const resp = await codigoLobby(guest);
  const idp = host.evaluate(c => Red.aceptarRespuesta(c), resp);
  await guest.waitForFunction(() => Red.conectado, null, { timeout: 25000 });
  await idp;
  return resp;
}
await unir(g1);
await host.waitForTimeout(300);
await host.evaluate(() => { Red.iniciar({ modo: 'col', juego: 'Pizarra' }); });
await g1.waitForFunction(() => window.__pizarra.colab.activo && window.__pizarra.doc.ent.o.size > 0, null, { timeout: 15000 });
ok(await objs(g1) === 1, 'invitado nuevo recibe el estado completo del anfitrión');
ok(await g1.evaluate(() => window.__pizarra.doc.meta('titulo')) === await host.evaluate(() => window.__pizarra.doc.meta('titulo')), 'el invitado abre el mismo tablero');
// --- g1 dibuja; host lo ve
await g1.click('[data-herr=pluma]');
await trazo(g1, [[300, 450], [400, 480], [500, 450]]);
await host.waitForFunction(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg).length === 2, null, { timeout: 8000 });
ok(true, 'el trazo del invitado aparece en el anfitrión');
// --- g2 entra tarde, con 2 objetos ya
await unir(g2);
await g2.waitForFunction(() => window.__pizarra.doc.ent.o.size === 2, null, { timeout: 15000 });
ok(await objs(g2) === 2, 'segundo invitado (tarde) recibe los 2 objetos existentes');
// --- trazos en vivo + cursores
await g2.click('[data-herr=pluma]');
const r = await g2.locator('#escena').boundingBox();
await g2.mouse.move(r.x + 600, r.y + 500); await g2.mouse.down();
for (let i = 0; i < 12; i++) await g2.mouse.move(r.x + 600 + i * 15, r.y + 500 + Math.sin(i) * 25, { steps: 2 });
await host.waitForTimeout(400);
const vivos = await host.evaluate(() => { let n = 0; for (const r of window.__pizarra.colab.remotos.values()) n += r.vivo.size; return n; });
ok(vivos >= 1, 'trazo en vivo visible en el anfitrión antes de soltar (vivos=' + vivos + ')');
await host.screenshot({ path: SH + 'colab_vivo.png' });
await g2.mouse.up(); await host.waitForTimeout(500);
const vivos2 = await host.evaluate(() => { let n = 0; for (const r of window.__pizarra.colab.remotos.values()) n += r.vivo.size; return n; });
ok(vivos2 === 0 && await objs(host) === 3, 'el trazo en vivo se sustituye por el objeto final');
const curs = await host.evaluate(() => [...window.__pizarra.colab.remotos.values()].filter(r => r.cur).length);
ok(curs >= 1, 'cursores remotos recibidos (' + curs + ')');
// --- convergencia
await host.waitForTimeout(500);
const [c0, c1, c2] = [await contenido(host), await contenido(g1), await contenido(g2)];
ok(c0 === c1 && c1 === c2, 'los 3 tableros tienen el mismo contenido');
// --- ediciones concurrentes: los tres mueven/crean a la vez
await Promise.all([host, g1, g2].map(async (p, i) => { await p.evaluate(i => { const a = window.__pizarra; for (let k = 0; k < 20; k++) { const c = a.herr.nuevo('nota', { x: i * 300 + k * 5, y: 500 + k, w: 100, h: 80, texto: 'n' + i + '-' + k, color: '#fff176' }); a.doc.cambiar([c]); } const e = a.doc.lista(a.vista.pg)[0]; a.doc.cambiar([{ k: 'o', id: e.id, p: { x: 10 + i, color: ['#f00', '#0f0', '#00f'][i] } }]); }, i); }));
await host.waitForTimeout(1200);
const [d0, d1, d2] = [await contenido(host), await contenido(g1), await contenido(g2)];
ok(d0 === d1 && d1 === d2 && await objs(host) === 63, `ediciones simultáneas convergen (${await objs(host)} objetos)`);
const hh = await Promise.all([host, g1, g2].map(p => p.evaluate(() => window.__pizarra.doc.huella().length + ':' + window.__pizarra.doc.huella().split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))));
ok(hh[0] === hh[1] && hh[1] === hh[2], 'huella CRDT idéntica en las 3 réplicas');
// --- solo lectura
await host.evaluate(() => { const ids = Red.lista().map(j => j.id).filter(i => i !== 0); window.__pizarra.colab.fijarSoloLectura(ids[1], true); });
await g2.waitForFunction(() => window.__pizarra.colab.soloLectura(), null, { timeout: 5000 });
const antes = await objs(host);
await g2.click('[data-herr=pluma]'); await trazo(g2, [[200, 600], [300, 640], [400, 600]]);
await g2.waitForTimeout(600);
ok(await objs(g2) === antes && await objs(host) === antes, 'invitado en solo lectura no puede dibujar ni propagar');
await g2.evaluate(() => { const a = window.__pizarra; a.doc.cambiar([{ k: 'o', id: a.doc.lista(a.vista.pg)[0].id, p: { x: 999 } }]); });
await host.waitForTimeout(500);
ok(await host.evaluate(() => window.__pizarra.doc.lista(window.__pizarra.vista.pg)[0].v.x) !== 999, 'el anfitrión descarta operaciones de quien es solo lectura');
await g2.screenshot({ path: SH + 'colab_invitado_ro.png' });
// --- presentación
await host.evaluate(() => { window.__pizarra.colab.presentar(true); });
await host.evaluate(() => { const a = window.__pizarra; a.nuevaPagina(); a.vista.cam.z = 1.5; a.vista.camCambio(); });
await g1.waitForFunction(() => window.__pizarra.doc.paginas().length === 2 && window.__pizarra.vista.pg === window.__pizarra.doc.paginas()[1].id, null, { timeout: 8000 });
ok(true, 'el invitado sigue al presentador a otra página');
const zs = [await host.evaluate(() => window.__pizarra.vista.cam.z), await g1.evaluate(() => window.__pizarra.vista.cam.z)];
ok(Math.abs(zs[0] - zs[1]) < 0.35, 'y adopta un zoom similar (' + zs.map(z => z.toFixed(2)) + ')');
// --- imagen sincronizada por trozos
await host.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 7 % 360},70%,50%)`; x.fillRect((i * 37) % 600, (i * 53) % 400, 40, 40); } const data = c.toDataURL('image/png'); window.__imgLen = data.length; window.__pizarra.herr.insertarImagen(data, 600, 400); });
await g1.waitForFunction(() => Object.keys(window.__pizarra.assets).length === 1, null, { timeout: 15000 });
ok(await g1.evaluate(() => Object.values(window.__pizarra.assets)[0].length) === await host.evaluate(() => window.__imgLen), 'imagen grande sincronizada completa por trozos (' + await host.evaluate(() => window.__imgLen) + ' bytes)');
// --- recarga del invitado y reconexión con enlace nuevo
await g1.waitForTimeout(800);
const antesG1 = await contenido(g1);
await g1.reload(); await g1.waitForSelector('body.listo'); await g1.waitForTimeout(500);
ok(await contenido(g1) === antesG1, 'el invitado recarga y conserva su copia local');
await g1.evaluate(() => { Red.config.iceServers = []; });
const enlace2 = await host.evaluate(async () => (await Red.invitar()).enlace);
await g1.goto(BASE + '?sala=' + encodeURIComponent(new URL(enlace2, BASE).searchParams.get('sala'))); await g1.waitForSelector('body.listo');
await g1.evaluate(() => { Red.config.iceServers = []; });
const resp2 = await codigoLobby(g1);
await host.evaluate(c => Red.aceptarRespuesta(c), resp2);
await g1.waitForFunction(() => Red.conectado && window.__pizarra.colab.activo, null, { timeout: 25000 });
await host.evaluate(() => { const a = window.__pizarra; a.doc.cambiar([a.herr.nuevo('nota', { x: 50, y: 50, w: 100, h: 80, texto: 'despues', color: '#fff176' })]); });
await g1.waitForFunction(() => [...window.__pizarra.doc.ent.o.values()].some(e => e.v.texto === 'despues'), null, { timeout: 8000 });
ok(true, 'reconexión con enlace nuevo: vuelve a recibir cambios');
await host.waitForTimeout(500);
ok(await contenido(host) === await contenido(g1) && await contenido(host) === await contenido(g2), 'tras reconectar los 3 siguen idénticos');
await host.screenshot({ path: SH + 'colab_host.png' });
console.log(errs.length ? 'ERRORES:\n' + errs.join('\n') : 'sin errores de consola');
if (errs.length) fallos++;
await b.close(); console.log(fallos ? fallos + ' FALLOS' : 'Todo correcto'); process.exit(fallos ? 1 : 0);
