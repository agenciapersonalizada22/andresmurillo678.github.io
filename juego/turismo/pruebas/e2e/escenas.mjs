import { lanzar, pagina, escenario } from './lib.mjs';
const S = process.argv[2];
const b = await lanzar();
const p = await pagina(b, { vp: { width: 1280, height: 760 }, nombre: 'Tester' });
await p.addInitScript(() => localStorage.setItem('turismo_ajustes_dispositivo', JSON.stringify({ gfx: { preset: 'alta', pixel: 1, antialias: true, sombras: false, texTablero: 2048, particulas: true, fpsMax: 30, autoCalidad: false, mostrarFps: false } })));
await p.waitForTimeout(1500);
await escenario(p, `e.turno=0; e.fase='tirar'; D.POR_CONT[3].forEach(i=>e.prop[i].o=0); e.prop[26].c=2; e.prop[27].c=1; e.prop[24].c=2; e.prop[23].c=1; e.prop[5].o=0; e.prop[9].o=1; e.prop[11].o=1; e.prop[13].o=1; e.prop[14].o=1; e.prop[14].c=4; e.prop[9].c=3; e.prop[11].c=3; e.prop[13].c=3; e.prop[36].o=2; e.jug[0].sellos=[23,24,26,1,3]; e.eventos=[{tipo:'alta',cont:3,hasta:4},{tipo:'huelga',cont:-1,hasta:3}]; e.jug[0].pos=3;`);
await p.waitForTimeout(1500);
await p.screenshot({ path: S + '/e1_desktop.png' });
await p.keyboard.press('t'); await p.waitForTimeout(500); await p.screenshot({ path: S + '/e2_pasaporte.png' }); await p.keyboard.press('Escape');
await p.keyboard.press('p'); await p.waitForTimeout(500); await p.screenshot({ path: S + '/e3_destinos.png' }); await p.keyboard.press('Escape');
// llevar al jugador a un aeropuerto para probar rutas
await p.evaluate(() => { const X = window.Turismo.X; X.E.jug[0].pos = 5; X.E.fase = 'viaje'; X.E.turno = 0; X.tablero.poner(X.E); import('/turismo/js/hud.js').then((m) => m.pintarHud()); });
await p.waitForTimeout(800); await p.screenshot({ path: S + '/e4_rutas.png' });
console.log('errs', p.errs.slice(0, 3).map((x) => x.slice(0, 300)));
await b.close();
