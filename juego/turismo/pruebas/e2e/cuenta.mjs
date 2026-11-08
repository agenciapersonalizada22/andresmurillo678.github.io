// Integracion con Cuenta (modo demo local): registro, nombre de cuenta, logros, puntajes y ranking. Registra el juego en memoria (el orquestador lo hace en plataforma/juegos.js).
import { lanzar, pagina } from './lib.mjs';
const S = process.argv[2];
const b = await lanzar();
const p = await pagina(b, { conSesion: true, vp: { width: 390, height: 780 }, touch: true });
await p.addInitScript(() => {
  let g; Object.defineProperty(window, 'PlataformaJuegos', { configurable: true, get() { return g; }, set(v) {
    g = v; const J = { id: 'turismo', nombre: 'Turismo Mundial', ruta: 'turismo/', color: '#42d4f4', categoria: 'Mesa y cartas', descripcion: 'x',
      modos: [{ id: 'patrimonio_final', nombre: 'P', mayorEsMejor: true, tope: 30000, unidad: 'm' }, { id: 'sellos_partida', nombre: 'S', mayorEsMejor: true, tope: 24, unidad: 's' }, { id: 'victorias', nombre: 'V', mayorEsMejor: true, tope: 2000, unidad: 'v' }], logros: [] };
    if (!v.juego('turismo')) { v.lista.push(J); v.todos.push(J); } } });
});
const chk = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
await p.waitForTimeout(2500);
chk(!/\/turismo\//.test(p.url()), 'sin sesion redirige al portal: ' + p.url().slice(0, 60));
await p.evaluate(() => window.Cuenta.registrar('turista1', 'Clave12345', {}));
await p.goto('http://localhost:8765/turismo/index.html'); await p.waitForTimeout(3000);
chk(/\/turismo\//.test(p.url()), 'con sesion carga el juego');
await p.click('text=Jugar contra bots'); await p.waitForTimeout(500);
await p.click('text=▶ Empezar'); await p.waitForTimeout(1500);
const nombre = await p.evaluate(() => window.Turismo.X.E.jug[0].nombre); chk(nombre === 'turista1', 'el nombre de la cuenta manda: ' + nombre);
const r = await p.evaluate(async () => {
  const N = await import('/turismo/js/nube.js'); const L = await import('/turismo/js/logros.js');
  L.nuevaPartida(); const E = window.Turismo.X.E; E.ganador = 0; E.cfg.modo = 'rapido'; E.fase = 'fin_partida';
  E.jug[0].sellos = [1, 3, 6, 8, 9, 11, 13, 14, 16, 18];
  L.finPartida(E, 0, 1);
  await new Promise((r) => setTimeout(r, 800));
  const top = await window.Cuenta.top('turismo', 'sellos_partida', 5, {});
  return { logros: window.Cuenta.logros('turismo'), top: top.map((x) => [x.nombre, x.valor]) };
});
console.log(JSON.stringify(r));
chk(r.logros.includes('victoria') && r.logros.includes('victoria_rapida'), 'logros enviados a la cuenta');
chk(r.top.length === 1 && r.top[0][1] === 10, 'puntaje en el ranking');
await p.reload(); await p.waitForTimeout(2500);
await p.click('text=Ranking'); await p.waitForTimeout(800); await p.screenshot({ path: S + '/c1_ranking.png' });
await p.keyboard.press('Escape');
await p.click('text=Ajustes'); await p.waitForTimeout(500); await p.click('text=Datos'); await p.waitForTimeout(500); await p.screenshot({ path: S + '/c2_datos.png' });
console.log('errs', p.errs.slice(0, 3).map((x) => x.slice(0, 250)));
chk(p.errs.length === 0, 'cero errores de consola');
await b.close();
