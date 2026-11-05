import { chromium } from 'playwright';
export const URL = 'http://localhost:8765/magnate/index.html';
export async function lanzar() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
}
export async function pagina(b, opts = {}) {
  const ctx = opts.ctx || await b.newContext({ viewport: opts.vp || { width: 390, height: 780 }, hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.errs = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.on('pageerror', (e) => p.errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,9).join(' | ')));
  await p.addInitScript((o) => {
    try {
      if (!localStorage.getItem('magnate_ajustes')) localStorage.setItem('magnate_ajustes', JSON.stringify({ velocidad: 4, musica: false }));
      if (!localStorage.getItem('magnate_ajustes_dispositivo')) localStorage.setItem('magnate_ajustes_dispositivo', JSON.stringify({ gfx: { preset: 'baja', pixel: 0.75, antialias: false, sombras: false, texTablero: 1024, particulas: false, fpsMax: 30, autoCalidad: false, mostrarFps: false } }));
      if (!localStorage.getItem('magnate_progreso')) localStorage.setItem('magnate_progreso', JSON.stringify({ v: 1, visto: 1 }));
      if (o.nombre && !localStorage.getItem('juego_perfil')) localStorage.setItem('juego_perfil', JSON.stringify({ nombre: o.nombre, color: o.color || '#3df5ff' }));
    } catch (e) {}
  }, { nombre: opts.nombre, color: opts.color });
  await p.goto(URL + (opts.query || ''));
  return p;
}
export const estado = (p) => p.evaluate(() => { const E = window.Magnate.X.E; return E && { fase: E.fase, turno: E.turno, turnoN: E.turnoN, jug: E.jug.map((j) => ({ din: j.din, pos: j.pos, q: j.quebrado, n: j.nombre })), seq: E.seq, id: E.id, props: E.prop.filter((q) => q && q.o >= 0).length, ganador: E.ganador }; });
// juega como humano: pulsa el boton principal / decide compra
export async function humano(p, pasos, cb) {
  for (let k = 0; k < pasos; k++) {
    const r = await p.evaluate(() => {
      const X = window.Magnate.X, E = X.E; if (!E || E.fase === 'fin_partida') return 'fin';
      if (document.querySelector('#hojas .capa.v')) { const c = document.querySelector('#hojas .capa.v'); return 'hoja'; }
      return E.turno === X.yo || (E.fase === 'subasta' && E.subasta.turnoPuja === X.yo) ? 'mio' : 'otro';
    });
    if (r === 'fin') return 'fin';
    if (r === 'hoja') { await p.keyboard.press('Escape'); await p.waitForTimeout(100); continue; }
    if (r === 'mio') { await p.evaluate(() => { const b = document.getElementById('btnPrim'); if (b && !b.disabled) b.click(); }); }
    if (cb) await cb(k);
    await p.waitForTimeout(r === 'mio' ? 120 : 200);
  }
}
// Crea una partida guardada con escenario y la restaura con "Continuar"
export async function escenario(p, fn, opc = {}) {
  await p.evaluate(() => { if (window.Magnate) window.Magnate.X.E = null; });
  await p.evaluate(async ({ cuerpo }) => {
    const R = await import('/magnate/js/reglas.js'); const D = await import('/magnate/js/datos.js');
    const e = R.crearPartida({}, [{ nombre: 'Yo', color: '#3df5ff', tipo: 'humano' }, { nombre: 'Aurora', color: '#ff4fd8', tipo: 'bot', nivel: 1 }, { nombre: 'Bruno', color: '#ffd23d', tipo: 'bot', nivel: 2 }], 7);
    e.turno = 0; e.fase = 'tirar';
    new Function('e', 'R', 'D', cuerpo)(e, R, D);
    const meta = { asientos: e.jug.map((j) => ({ tipo: j.tipo, token: 't' + j.id, redId: j.id ? null : 0, conectado: true })) };
    localStorage.setItem('magnate_partida', JSON.stringify({ E: e, meta, modo: 'solo', yo: 0, setup: null }));
  }, { cuerpo: fn });
  await p.reload(); await p.waitForTimeout(600);
  await p.click('text=Continuar partida'); await p.waitForTimeout(900);
}
