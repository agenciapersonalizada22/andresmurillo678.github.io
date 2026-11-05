import { lanzar, pagina, escenario } from './lib.mjs';
const b = await lanzar(); const p = await pagina(b, { touch: true });
const chk = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
await p.waitForTimeout(600);
await escenario(p, "e.cfg.temporizador=30; e.cfg.limiteMin=30;");
const t = await p.evaluate(() => document.getElementById('tiempo').textContent); chk(/⏱ 30:0|⏱ 29:5/.test(t) && /⌛/.test(t), 'HUD muestra tiempo restante y temporizador: ' + t);
const s0 = await p.evaluate(() => window.Magnate.X.E.seq);
await p.waitForTimeout(33000);
const s1 = await p.evaluate(() => ({ seq: window.Magnate.X.E.seq, turnoN: window.Magnate.X.E.turnoN }));
chk(s1.seq > s0, 'al agotarse el temporizador el piloto automatico actua (seq ' + s0 + '->' + s1.seq + ')');
// limite de tiempo: fuerza tiempo agotado y deja terminar turnos
await p.evaluate(() => { window.Magnate.X.E.tiempoMs = 31 * 60000; });
await p.waitForTimeout(20000);
const f = await p.evaluate(() => ({ fase: window.Magnate.X.E.fase, motivo: window.Magnate.X.E.motivoFin, hoja: (document.querySelector('#hojas .hoja h2') || {}).textContent }));
chk(f.fase === 'fin_partida' && f.motivo === 'tiempo', 'fin por limite de tiempo: ' + JSON.stringify(f));
await p.screenshot({ path: process.argv[2] + '/s22_fin.png' });
console.log(p.errs.join('\n') || 'sin errores de consola'); await b.close();
