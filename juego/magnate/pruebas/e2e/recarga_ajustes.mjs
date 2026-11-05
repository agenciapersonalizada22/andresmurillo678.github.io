import { lanzar, pagina, estado, humano } from './lib.mjs';
const S = process.argv[2];
const b = await lanzar();
const p = await pagina(b, { touch: true });
const chk = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
await p.waitForTimeout(600);
await p.click('text=Jugar contra bots'); await p.click('text=▶ Empezar'); await p.waitForTimeout(1500);
await humano(p, 70);
const a = await p.evaluate(() => JSON.stringify(window.Magnate.X.E));
await p.reload(); await p.waitForTimeout(900);
chk(await p.isVisible('text=Continuar partida'), 'tras recargar aparece Continuar');
await p.screenshot({ path: S + '/s16_menu_continuar.png' });
await p.click('text=Continuar partida'); await p.waitForTimeout(1200);
const c = await p.evaluate(() => JSON.stringify(window.Magnate.X.E));
const A = JSON.parse(a), C = JSON.parse(c);
chk(A.id === C.id && C.seq >= A.seq && C.jug.every((j, i) => j.nombre === A.jug[i].nombre), 'partida restaurada: id ' + C.id + ' seq ' + A.seq + '->' + C.seq);
await humano(p, 40);
chk((await estado(p)).seq > C.seq, 'la partida sigue avanzando tras restaurar');
// ajustes persisten
await p.click('#btnAjustes'); await p.waitForTimeout(300); await p.click('.tab:has-text("Accesibilidad")'); await p.click('button[data-k="csimbolos"]'); await p.waitForTimeout(300);
await p.screenshot({ path: S + '/s17_ajustes.png' });
await p.keyboard.press('Escape'); await p.reload(); await p.waitForTimeout(800);
chk(await p.evaluate(() => JSON.parse(localStorage.getItem('magnate_ajustes')).simbolos === true), 'ajuste de accesibilidad persiste en magnate_ajustes');
chk(await p.evaluate(() => !!localStorage.getItem('magnate_ajustes_dispositivo') && !localStorage.getItem('magnate_ajustes').includes('texTablero')), 'graficos separados en _ajustes_dispositivo');
// exportar / importar
const txt = await p.evaluate(async () => (await import('/magnate/js/almacen.js')).exportarTodo());
chk(txt.startsWith('MAGNATE1:'), 'exportar produce texto');
console.log(p.errs.join('\n') || 'sin errores de consola');
await b.close();
