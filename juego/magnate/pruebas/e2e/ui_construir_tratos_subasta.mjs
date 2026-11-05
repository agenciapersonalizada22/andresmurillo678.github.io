import { lanzar, pagina, estado, escenario } from './lib.mjs';
const S = process.argv[2];
const b = await lanzar();
const p = await pagina(b, { touch: true });
await p.waitForTimeout(700);
const chk = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
const X = (f) => p.evaluate(f);
// escenario 1: construir
await escenario(p, "D.POR_GRUPO[0].forEach(i=>e.prop[i].o=0); D.POR_GRUPO[1].forEach(i=>e.prop[i].o=0); e.fase='fin'; e.jug[0].pos=10;");
await p.click('#btnProps'); await p.waitForTimeout(400); await p.screenshot({ path: S + '/s8_props.png' });
await p.click('text=/\\+ Casa/ >> nth=0'); await p.waitForTimeout(400);
let st = await X(() => { const E = window.Magnate.X.E; return [E.prop[1].c, E.prop[3].c, E.jug[0].din]; });
chk(st[0] === 1 && st[2] === 1450, 'construir desde la hoja ' + JSON.stringify(st));
await p.click('button:has-text("+ Casa"):not([disabled]) >> nth=0'); await p.waitForTimeout(300);
st = await X(() => window.Magnate.X.E.prop.slice(1, 4).map((q) => q && q.c)); chk(st[0] === 1 && st[2] === 1, 'construccion pareja respetada ' + JSON.stringify(st));
await p.screenshot({ path: S + '/s9_props2.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// tocar casilla en el tablero
const pos = await X(() => window.Magnate.X.tablero.proyectar(1)); await p.touchscreen.tap(pos.x, pos.y); await p.waitForTimeout(500);
chk(await X(() => !!document.querySelector('.hoja h2') && /Muelle/.test(document.querySelector('.hoja h2').textContent)), 'tocar casilla abre detalles');
await p.screenshot({ path: S + '/s10_casilla.png' }); await p.keyboard.press('Escape');
// escenario 2: tratos con un bot (ofrecer dinero por propiedad)
await escenario(p, "e.prop[8].o=1; e.prop[9].o=1; e.prop[6].o=0; e.fase='fin';");
await p.click('#btnTratos'); await p.waitForTimeout(400);
await p.click('.chips button:has-text("Aurora")'); await p.waitForTimeout(300);
await p.screenshot({ path: S + '/s11_trato.png' });
await p.click('.lado:nth-child(2) .chip:has-text("Calle del Pan")'); await p.waitForTimeout(200);
await p.click('.lado:nth-child(1) button:has-text("+100") >> nth=0'); await p.click('.lado:nth-child(1) button:has-text("+100") >> nth=0'); await p.click('.lado:nth-child(1) button:has-text("+100") >> nth=0'); await p.waitForTimeout(200);
await p.click('text=Enviar propuesta'); await p.waitForTimeout(3500);
st = await X(() => { const E = window.Magnate.X.E; return { trato: E.trato, o8: E.prop[8].o, din: E.jug[0].din }; });
chk(st.trato === null, 'el bot respondio al trato ' + JSON.stringify(st));
await p.screenshot({ path: S + '/s12_trato2.png' });
// escenario 3: subasta
await escenario(p, "e.fase='compra'; e.jug[0].pos=11;");
await p.waitForTimeout(300); await p.click('text=Subastar'); await p.waitForTimeout(1800);
await p.screenshot({ path: S + '/s13_subasta.png' });
await p.waitForTimeout(500); await p.click('.hoja button:has-text("Pasar")'); await p.waitForTimeout(14000);
st = await X(() => { const E = window.Magnate.X.E; return { fase: E.fase, o: E.prop[11].o, sub: !!E.subasta }; });
chk(st.fase !== 'subasta' && st.o !== undefined, 'subasta resuelta ' + JSON.stringify(st));
console.log(p.errs.join('\n') || 'sin errores de consola');
await b.close();
