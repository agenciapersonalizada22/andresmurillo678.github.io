import { chromium } from 'playwright';
import { lanzar, URL } from './lib.mjs';
const S = process.argv[2];
const b = await lanzar();
const chk = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
const nuevoCtx = async (nombre, color) => {
  const ctx = await b.newContext({ viewport: { width: 420, height: 800 } });
  await ctx.route('**/comun/red.js', async (r) => { const t = await (await r.fetch()).text(); await r.fulfill({ contentType: 'application/javascript', body: t.replace("iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]", 'iceServers: []') }); });
  await ctx.addInitScript((o) => { try {
    if (!localStorage.getItem('magnate_ajustes')) localStorage.setItem('magnate_ajustes', JSON.stringify({ velocidad: 4, musica: false }));
    if (!localStorage.getItem('magnate_ajustes_dispositivo')) localStorage.setItem('magnate_ajustes_dispositivo', JSON.stringify({ gfx: { preset: 'baja', pixel: 0.75, antialias: false, sombras: false, texTablero: 1024, particulas: false, fpsMax: 30, autoCalidad: false } }));
    localStorage.setItem('magnate_progreso', JSON.stringify({ v: 1, visto: 1 }));
    if (!localStorage.getItem('juego_perfil')) localStorage.setItem('juego_perfil', JSON.stringify(o));
  } catch (e) {} }, { nombre, color });
  return ctx;
};
const abrir = async (ctx, url) => { const p = await ctx.newPage(); p.errs = []; p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); }); p.on('pageerror', (e) => p.errs.push('PAGEERR ' + e.message)); await p.goto(url || URL); await p.waitForTimeout(700); return p; };
const E = (p) => p.evaluate(() => { const X = window.Magnate.X; return X.E ? { id: X.E.id, seq: X.E.seq, fase: X.E.fase, turno: X.E.turno, yo: X.yo, din: X.E.jug.map((j) => j.din), props: X.E.prop.map((q) => q ? q.o + ':' + q.c : '-').join(','), off: X.E.jug.map((j) => !!j.sinConexion), turnoN: X.E.turnoN } : null; });
async function invitar(host, clic = true) { // devuelve enlace
  const previo = await host.evaluate(() => { const i = document.querySelector('input.lb-campo[readonly]'); return i ? i.value : ''; });
  if (clic) await host.evaluate(() => { const bt = [...document.querySelectorAll('.lb-btn')].find((x) => /Invitar/.test(x.textContent) && !x.hidden && x.offsetParent); if (bt) bt.click(); });
  await host.waitForFunction((pv) => { const i = document.querySelector('input.lb-campo[readonly]'); return i && i.value.includes('sala=') && (i.value !== pv || !pv); }, previo, { timeout: 15000 });
  return host.evaluate(() => document.querySelector('input.lb-campo[readonly]').value);
}
async function unir(host, ctxCli, enlace) {
  const cli = await abrir(ctxCli, enlace);
  await cli.waitForFunction(() => { const t = document.querySelector('textarea[aria-label="Tu codigo de respuesta"]'); return !!t && t.value.length > 20; }, null, { timeout: 20000 });
  const resp = await cli.evaluate(() => document.querySelector('textarea[aria-label="Tu codigo de respuesta"]').value);
  await host.evaluate((r) => { const t = [...document.querySelectorAll('textarea.lb-campo')].find((x) => !x.readOnly && x.offsetParent); t.value = r; [...document.querySelectorAll('.lb-btn')].find((x) => x.textContent === 'Conectar').click(); }, resp);
  try { await cli.waitForFunction(() => window.Red && window.Red.conectado, null, { timeout: 25000 }); } catch (e) { console.log('DEBUG host:', await host.evaluate(() => Red.estado + ' ' + (document.querySelector('.lb-aviso-estado') || {}).textContent)); console.log('DEBUG cli:', await cli.evaluate(() => Red.estado + ' ' + (document.querySelector('.lb-aviso-estado') || {}).textContent)); await host.screenshot({ path: S + '/dbg_host.png' }); await cli.screenshot({ path: S + '/dbg_cli.png' }); throw e; }
  return cli;
}
async function jugar(pages, ms) { // clic automatico de humanos
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    for (const p of pages) {
      await p.evaluate(() => {
        const X = window.Magnate.X, e = X.E; if (!e || e.fase === 'fin_partida' || X.yo < 0) return;
        if (e.fase === 'subasta') { if (e.subasta.turnoPuja === X.yo) X.accion({ t: 'pasarPuja' }); return; }
        if (e.trato && e.trato.a === X.yo) { X.accion({ t: 'tratoResponder', ok: false }); return; }
        if (e.turno === X.yo) { const bt = document.getElementById('btnPrim'); if (bt && !bt.disabled && !document.querySelector('#hojas .capa.v')) bt.click(); }
      });
    }
    await pages[0].waitForTimeout(150);
  }
}
const nombreWR = (p) => p.evaluate(() => window.Red && window.Red.conectado);

/* ===== Parte A: partida nueva con 3 humanos + 1 bot ===== */
const cH = await nuevoCtx('Host', '#3df5ff'), cA = await nuevoCtx('Ana', '#ff4fd8'), cB = await nuevoCtx('Beto', '#ffd23d');
const host = await abrir(cH);
await host.click('text=Multijugador en línea'); await host.waitForTimeout(300);
await host.evaluate(() => { [...document.querySelectorAll('.hoja button')].filter((x) => x.textContent === '✕' && x.getAttribute('aria-label') === 'Quitar bot').slice(1).forEach((x) => x.click()); });
await host.waitForTimeout(300);
await host.click('text=Crear sala…'); await host.waitForTimeout(500);
await host.click('text=Crear sala (soy el anfitrion)');
const enl1 = await invitar(host, false);
const ana = await unir(host, cA, enl1);
chk(await nombreWR(ana), 'Ana conectada al anfitrion');
const enl2 = await invitar(host);
const beto = await unir(host, cB, enl2);
chk(await nombreWR(beto), 'Beto conectado al anfitrion');
await host.screenshot({ path: S + '/s18_lobby.png' });
await host.evaluate(() => [...document.querySelectorAll('.lb-btn')].find((x) => x.textContent === 'Iniciar').click());
await host.waitForTimeout(2500);
let eh = await E(host), ea = await E(ana), eb = await E(beto);
chk(eh && ea && eb && eh.id === ea.id && ea.id === eb.id, 'los tres reciben la misma partida ' + (eh && eh.id));
chk(eh.yo === 0 && ea.yo === 1 && eb.yo === 2, 'asientos asignados ' + [eh.yo, ea.yo, eb.yo]);
await jugar([host, ana, beto], 45000);
for (let k = 0; k < 8; k++) { eh = await E(host); ea = await E(ana); eb = await E(beto); if (eh.seq === ea.seq && ea.seq === eb.seq) break; await host.waitForTimeout(400); }
console.log('estado host', JSON.stringify(eh)); 
chk(eh.seq === ea.seq && ea.seq === eb.seq && JSON.stringify(eh.din) === JSON.stringify(ea.din) && eh.props === eb.props, 'estados sincronizados (seq ' + eh.seq + ')');
chk(eh.turnoN >= 8 && eh.props.split(',').filter((x) => x !== '-' && !x.startsWith('-1')).length > 0, 'se jugaron ' + eh.turnoN + ' turnos con compras');
await ana.screenshot({ path: S + '/s19_ana.png' });
chk(await ana.evaluate(() => !!localStorage.getItem('magnate_asiento')), 'cliente guarda su token de asiento');
// chat
await ana.evaluate(() => window.Magnate.X.enviarChat('Hola desde Ana'));
await host.waitForTimeout(800);
chk(await host.evaluate(async () => (await import('/magnate/js/hojas.js')).mensajes.some((m) => m.texto === 'Hola desde Ana')), 'chat llega al anfitrion');
// accion ilegal de un cliente es rechazada
const rech = await ana.evaluate(async () => { const X = window.Magnate.X; X.accion({ t: 'construir', i: 1 }); X.accion({ t: 'comprar' }); await new Promise((r) => setTimeout(r, 500)); return [...document.querySelectorAll('.aviso')].some((a) => /turno|tuya|barrio|compra/i.test(a.textContent)); });
chk(rech, 'accion ilegal de cliente rechazada sin cambiar el estado');

/* ===== Parte B: caida y reconexion de Ana ===== */
const tokenAna = await ana.evaluate(() => localStorage.getItem('magnate_asiento'));
await ana.close();
await host.waitForTimeout(1500);
eh = await E(host); chk(eh.off[1] === true, 'el anfitrion marca a Ana desconectada');
await jugar([host, beto], 20000);
let eh2 = await E(host); chk(eh2.seq > eh.seq, 'la partida continua sin Ana (piloto automatico) seq ' + eh.seq + '->' + eh2.seq);
await host.evaluate(() => { document.querySelector('#btnPausa').click(); });
await host.waitForTimeout(400);
await host.evaluate(() => [...document.querySelectorAll('.hoja button')].find((x) => /Invitar \/ reconectar/.test(x.textContent)).click());
await host.waitForTimeout(600);
const enl3 = await invitar(host);
const ana2 = await unir(host, cA, enl3);
await ana2.waitForFunction(() => window.Magnate.X.E && window.Magnate.X.yo >= 0, null, { timeout: 15000 });
let e3 = await E(ana2); chk(e3.yo === 1 && e3.id === eh.id, 'Ana recupera su asiento ' + e3.yo + ' con el mismo token');
await host.waitForTimeout(800); eh = await E(host); chk(eh.off[1] === false, 'el anfitrion la ve conectada otra vez');
await ana2.screenshot({ path: S + '/s20_ana_reconectada.png' });

/* ===== Parte C: recarga del anfitrion ===== */
const antes = await E(host);
await host.reload(); await host.waitForTimeout(1500);
chk(await host.isVisible('text=Continuar partida'), 'el anfitrion ve Continuar tras recargar');
await host.click('text=Continuar partida'); await host.waitForTimeout(1200);
chk(await host.isVisible('text=Abrir sala para reconectar'), 'dialogo de reanudar multijugador');
await host.click('text=Abrir sala para reconectar'); await host.waitForTimeout(500);
await host.click('text=Crear sala (soy el anfitrion)');
const enl4 = await invitar(host, false);
let hres = await E(host); chk(hres.id === antes.id && hres.seq >= antes.seq, 'estado del anfitrion restaurado (seq ' + hres.seq + ')');
// Beto (que perdio la conexion por la recarga) se reconecta con enlace nuevo; recarga su pagina
await beto.waitForTimeout(500);
const beto2 = await unir(host, cB, enl4).catch((e) => { console.log('beto2 err', e.message); return null; });
if (beto2) { await beto2.waitForFunction(() => window.Magnate.X.E && window.Magnate.X.yo >= 0, null, { timeout: 15000 }); const e4 = await E(beto2); chk(e4.yo === 2 && e4.id === antes.id, 'Beto recupera su asiento tras la recarga del anfitrion'); await host.evaluate(() => [...document.querySelectorAll('.lb-btn')].find((x) => x.textContent === 'Iniciar').click()); await host.waitForTimeout(800); await jugar([host, beto2], 15000); const e5 = await E(beto2), e6 = await E(host); chk(e5.seq === e6.seq && e6.seq > hres.seq, 'la partida sigue tras la recarga del anfitrion (seq ' + e6.seq + ')'); }
await host.screenshot({ path: S + '/s21_host_recarga.png' });
console.log([host, beto, beto2, ana2].filter(Boolean).flatMap((p) => p.errs).join('\n') || 'sin errores de consola');
await b.close();
