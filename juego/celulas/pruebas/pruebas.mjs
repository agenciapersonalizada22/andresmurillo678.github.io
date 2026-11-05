// Pruebas en Node de fisica, IA y protocolo: node juego/celulas/pruebas/pruebas.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const req = createRequire(import.meta.url);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
for (const f of ['util', 'config', 'hash', 'mundo', 'ia', 'protocolo', 'replica']) req(path.join(dir, f + '.js'));
const C = globalThis.CEL;
let ok = 0, mal = 0;
function t(nombre, cond, extra) { if (cond) { ok++; } else { mal++; console.log('FALLA:', nombre, extra === undefined ? '' : extra); } }
const vacio = (o) => new C.Mundo(Object.assign({ modo: 'ffa', semilla: 1, bots: 0, comida: 0, virus: 0, decay: 0 }, o || {}));
function jug(w, x, y, m, extra) {
  const j = w.agregarJugador(Object.assign({ nombre: 'J', humano: true }, extra || {}));
  j.cel[0].x = x; j.cel[0].y = y; w.fijar(j.cel[0], m); j.cel[0].prot = 0; w.actualizarCOM(j); return j;
}
const masaTotal = (w) => { let s = 0; for (let i = 0; i < w.nC; i++) s += w.cells[i].m; for (let i = 0; i < w.nE; i++) s += w.ej[i].m; return s; };

// --- comer: umbral 125% y solapamiento
{
  let w = vacio(), a = jug(w, 1000, 1000, 100), b = jug(w, 1000 + 20, 1000, 80);
  w.paso(1 / 60); t('come a 80% de masa con solapamiento', !b.cel.length && a.cel[0].m >= 179.9, a.cel[0].m);
  w = vacio(); a = jug(w, 1000, 1000, 100); b = jug(w, 1040, 1000, 85);
  for (let i = 0; i < 30; i++) w.paso(1 / 60); t('no come si la presa pesa mas del 80%', b.cel.length === 1);
  w = vacio(); a = jug(w, 1000, 1000, 100); b = jug(w, 1000 + a.cel[0].r + 5, 1000, 50);
  w.paso(1 / 60); t('no come sin solapamiento suficiente', b.cel.length === 1);
  w = vacio({ modo: 'equipos' }); a = jug(w, 1000, 1000, 400, { equipo: 0 }); b = jug(w, 1000, 1000, 20, { equipo: 0 });
  w.paso(1 / 60); t('companeros de equipo no se comen', b.cel.length === 1);
  w = vacio(); a = jug(w, 1000, 1000, 400); b = jug(w, 1000, 1000, 20); b.cel[0].prot = 2;
  w.paso(1 / 60); t('proteccion de aparicion', b.cel.length === 1);
}
// --- comida
{
  const w = vacio({ comida: 400 }); const j = jug(w, 2500, 2500, 50);
  let antes = w.nFood; let comidos = 0;
  const m0 = j.cel[0].m;
  for (let i = 0; i < 600; i++) { j.ax = 0; j.ay = 0; w.paso(1 / 60); }
  t('comida reaparece y masa sube o igual', j.cel[0].m >= m0);
  // celula colocada sobre comida la come
  let s = 0; while (!w.fvivo[s]) s++;
  j.cel[0].x = w.fx[s]; j.cel[0].y = w.fy[s]; const m1 = j.cel[0].m; w.paso(1 / 60);
  t('come comida bajo su centro', j.cel[0].m > m1 && (w.fgen[s] > 0 || !w.fvivo[s]));
}
// --- velocidad inversa a la masa
{
  t('velocidad decrece con la masa', C.velocidad(20) > C.velocidad(100) && C.velocidad(100) > C.velocidad(1000) && C.velocidad(1000) > C.velocidad(10000));
  const w = vacio(); const a = jug(w, 500, 2500, 20), b = jug(w, 500, 3500, 2000);
  a.ax = 400; b.ax = 400; for (let i = 0; i < 60; i++) w.paso(1 / 60);
  t('la pequena avanza mas rapido', a.cel[0].x - 500 > (b.cel[0].x - 500) * 2, [a.cel[0].x, b.cel[0].x]);
}
// --- division y fusion
{
  const w = vacio(); const j = jug(w, 2000, 2000, 400); j.ax = 300; j.ay = 0;
  const m0 = masaTotal(w);
  t('dividir', w.dividir(j) && j.cel.length === 2, j.cel.length);
  t('division conserva masa', Math.abs(masaTotal(w) - m0) < 1e-6);
  t('mitades iguales', Math.abs(j.cel[0].m - j.cel[1].m) < 1e-6 && j.cel[1].vx > 100);
  for (let i = 0; i < 60 * 5; i++) w.paso(1 / 60);
  t('no se fusionan antes de tiempo (separadas)', j.cel.length === 2);
  for (let i = 0; i < 60 * 20; i++) { j.ax = 0; j.ay = 0; w.paso(1 / 60); }
  t('se fusionan pasado el tiempo', j.cel.length === 1 && Math.abs(j.cel[0].m - 400) < 1e-6, j.cel.map(c => c.m));
  const peq = jug(w, 100, 100, 30); t('no divide por debajo del minimo', !w.dividir(peq) && peq.cel.length === 1);
  let n = 0; const g = jug(w, 3000, 3000, 20000); for (let i = 0; i < 10; i++) { w.dividir(g); n++; }
  t('maximo 16 celulas', g.cel.length === 16, g.cel.length);
}
// --- expulsar
{
  const w = vacio(); const j = jug(w, 2000, 2000, 200); j.ax = 100; const m0 = masaTotal(w);
  t('expulsar crea eyeccion', w.expulsar(j) && w.nE === 1 && Math.abs(j.cel[0].m - 188) < 1e-9);
  t('expulsar conserva masa', Math.abs(masaTotal(w) - m0) < 1e-9);
  t('expulsar con enfriamiento', !w.expulsar(j));
  const peq = jug(w, 300, 300, 20); t('no expulsa con poca masa', !w.expulsar(peq));
}
// --- virus
{
  const w = vacio(); const j = jug(w, 2000, 2000, 400); w.crearVirus(2000, 2000, 0, 0); const m0 = 400 + 100;
  w.paso(1 / 60); w.limpiar();
  t('virus revienta celula grande', j.cel.length > 1 && w.nV === 0, j.cel.length);
  t('masa del virus absorbida', Math.abs(masaTotal(w) - m0) < 1e-6, masaTotal(w));
  const w2 = vacio(); const p = jug(w2, 2000, 2000, 100); w2.crearVirus(2000, 2000, 0, 0); w2.paso(1 / 60);
  t('celula pequena ignora el virus', p.cel.length === 1 && w2.nV === 1);
  const w3 = vacio(); const q = jug(w3, 2000, 2000, 50); const v = w3.crearVirus(2300, 2000, 0, 0);
  for (let i = 0; i < 7; i++) { w3.crearEyec(q, 2250, 2000, 400, 0); w3.paso(1 / 60); }
  for (let i = 0; i < 20; i++) w3.paso(1 / 60); t('7 eyecciones generan otro virus', w3.nV === 2, w3.nV);
}
// --- decaimiento
{
  const w = vacio({ decay: C.DECAY }); const j = jug(w, 2000, 2000, 1000); for (let i = 0; i < 60 * 60; i++) w.paso(1 / 60);
  t('decaimiento lento', j.cel[0].m < 1000 && j.cel[0].m > 880, j.cel[0].m);
  const p = jug(w, 500, 500, 30); const m = p.cel[0].m; for (let i = 0; i < 600; i++) w.paso(1 / 60); t('sin decaimiento bajo el minimo', p.cel[0].m === m);
}
// --- hash espacial
{
  const R = new C.Rng(5), arr = []; for (let i = 0; i < 800; i++) arr.push({ x: R.next() * 5000, y: R.next() * 5000 });
  const h = new C.HashDin(5000, 256, 1000); h.reconstruir(arr, arr.length); const out = new Int32Array(1000); let bien = true;
  for (let q = 0; q < 200; q++) {
    const x = R.next() * 5000, y = R.next() * 5000, r = 20 + R.next() * 500, n = h.consultar(x, y, r, out), set = new Set(out.subarray(0, n));
    for (let i = 0; i < arr.length; i++) if (Math.hypot(arr[i].x - x, arr[i].y - y) <= r && !set.has(i)) bien = false;
  }
  t('hash dinamico no pierde vecinos', bien);
  const g = new C.Rejilla(5000, 200, 3000, 48); const pts = []; for (let i = 0; i < 3000; i++) { pts.push([R.next() * 5000, R.next() * 5000]); g.insertar(i, pts[i][0], pts[i][1]); }
  for (let i = 0; i < 3000; i += 2) g.quitar(i);
  const o2 = new Uint16Array(4096); let n2 = g.consultar(1000, 1000, 2000, 2000, o2), s2 = new Set(o2.subarray(0, n2)), b2 = true;
  for (let i = 1; i < 3000; i += 2) if (pts[i][0] >= 1000 && pts[i][0] <= 2000 && pts[i][1] >= 1000 && pts[i][1] <= 2000 && !s2.has(i)) b2 = false;
  for (let i = 0; i < 3000; i += 2) if (s2.has(i)) b2 = false;
  t('rejilla de comida: consulta y bajas', b2);
}
// --- conservacion con bots, divisiones y eyecciones (sin decaimiento)
{
  const w = new C.Mundo({ modo: 'ffa', semilla: 9, bots: 14, comida: 500, virus: 5, decay: 0, dificultad: 'dificil' });
  const R = new C.Rng(3);
  for (let i = 0; i < 60 * 180; i++) {
    if (i % 25 === 0) { const j = w.jugs[R.entero(14)]; if (j) { if (R.next() < 0.5) w.dividir(j); else w.expulsar(j); } }
    w.paso(1 / 60);
  }
  const esperado = w.masaNueva + w.comidaCons + w.virusAbs - w.perdida, real = masaTotal(w);
  t('masa total conservada (sin decaimiento)', Math.abs(esperado - real) < 1e-3 * Math.max(1, real), [esperado, real]);
}
// --- IA: 30 bots, 5 minutos simulados, sin NaN, y con vida
for (const dif of ['facil', 'normal', 'dificil']) {
  const w = new C.Mundo({ modo: 'ffa', semilla: 77, bots: 30, dificultad: dif }); let nan = false, maxM = 0, muertes = 0;
  w.alEvento = (tipo) => { if (tipo === 'muerte') muertes++; };
  for (let i = 0; i < 60 * 300; i++) {
    w.paso(1 / 60);
    if (i % 30 === 0) for (let k = 0; k < w.nC; k++) { const c = w.cells[k]; if (!(c.x === c.x && c.y === c.y && c.m === c.m && c.r === c.r) || c.x < -1 || c.x > w.tam + 1) nan = true; if (c.m > maxM) maxM = c.m; }
  }
  for (const j of w.jugs) if (j && !(j.ax === j.ax && j.ay === j.ay && j.masa === j.masa)) nan = true;
  t('IA sin NaN ' + dif, !nan);
  t('IA ' + dif + ' crece y hay combate', maxM > 150 && muertes > 3, { maxM, muertes });
  t('nunca mas de 16 celulas por jugador', w.jugs.every(j => !j || j.cel.length <= 16));
}
// --- modos
{
  let w = new C.Mundo({ modo: 'superv', semilla: 3, bots: 20 }); for (let i = 0; i < 60 * 700 && w.estado === 'jugando'; i++) w.paso(1 / 60);
  t('supervivencia termina con un ganador', w.estado === 'terminado' && w.ganador >= 0, [w.estado, w.t]);
  w = new C.Mundo({ modo: 'batalla', semilla: 3, bots: 20 }); const z0 = w.zona; for (let i = 0; i < 60 * 150; i++) w.paso(1 / 60);
  t('la zona se encoge', w.zona < z0 * 0.7, [z0, w.zona]);
  for (let i = 0; i < 60 * 300 && w.estado === 'jugando'; i++) w.paso(1 / 60); t('batalla termina', w.estado === 'terminado');
  w = new C.Mundo({ modo: 'equipos', semilla: 3, bots: 20 }); const e = [0, 0]; w.jugs.forEach(j => j && e[j.equipo]++); t('equipos equilibrados', Math.abs(e[0] - e[1]) <= 1, e);
}
// --- guardado compacto
{
  const w = new C.Mundo({ modo: 'ffa', semilla: 11, bots: 20 }); const h = w.agregarJugador({ nombre: 'Yo', token: 'abc' });
  for (let i = 0; i < 60 * 40; i++) w.paso(1 / 60);
  const d = JSON.parse(JSON.stringify(w.serializar())), txt = JSON.stringify(d);
  const r = C.Mundo.restaurar(d);
  t('restaurar conserva jugadores y masa', Math.abs(masaTotal(r) - masaTotal(w)) < 1 && r.jugs.filter(Boolean).length === w.jugs.filter(Boolean).length, [masaTotal(r), masaTotal(w)]);
  t('restaurar conserva comida', r.fvivo.reduce((a, b) => a + b, 0) === w.fvivo.reduce((a, b) => a + b, 0));
  t('restaurar conserva asiento por token', r.jugs.find(j => j && j.token === 'abc'));
  for (let i = 0; i < 60 * 20; i++) r.paso(1 / 60);
  t('el mundo restaurado sigue corriendo', r.nC > 0 && r.cells.every(c => c.x === c.x));
  console.log('  guardado: ' + (txt.length / 1024).toFixed(1) + ' KB (' + w.nC + ' celdas, ' + w.nFood + ' comidas)');
}
// --- protocolo: ida y vuelta y tamano
{
  const w = new C.Mundo({ modo: 'ffa', semilla: 21, bots: 30 }); const h = w.agregarJugador({ nombre: 'Yo' });
  for (let i = 0; i < 60 * 90; i++) w.paso(1 / 60);
  const rep = new C.Replica({ tam: w.tam, modo: w.modo, semilla: w.semilla, yo: h.id, nFood: w.nFood });
  const txt = C.Proto.texto(w, h, 1, 123456, true), bytes = C.deb64(txt);
  t('base64 ida y vuelta', C.b64(bytes) === txt);
  t('aplica snapshot', rep.aplicar(bytes, bytes.length));
  let mal2 = 0, n = 0;
  const I = C.Proto.interes(w, h, {});
  for (let i = 0; i < rep.nC; i++) {
    const e = rep.cells[i], c = w.cells.find(q => q.id === e.id && q.jid === e.jid);
    if (!c || Math.abs(c.x - e.x1) > 0.2 || Math.abs(c.y - e.y1) > 0.2 || Math.abs(c.m - e.m1) / c.m > 0.01) mal2++; n++;
  }
  t('celdas replicadas con precision', mal2 === 0 && n > 0, [mal2, n]);
  const visibles = w.cells.filter(c => c.jid === h.id || (Math.abs(c.x - I.cx) < I.hw && Math.abs(c.y - I.cy) < I.hh)).length;
  t('interes por vision filtra', rep.nC <= w.nC && rep.nC >= visibles - 1, [rep.nC, visibles, w.nC]);
  let fv = 0, fmal = 0;
  for (let s = 0; s < w.nFood; s++) if (rep.fvivo[s]) { fv++; if (!w.fvivo[s] || rep.fx[s] !== w.fx[s]) fmal++; }
  t('comida replicada coincide', fv > 100 && fmal === 0, [fv, fmal]);
  console.log('  snapshot completo: ' + bytes.length + ' B binarios, ' + txt.length + ' B de texto, ' + w.nC + ' celdas totales, ' + rep.nC + ' enviadas, ' + fv + ' comidas');
  const sizes = []; for (let k = 0; k < 40; k++) { for (let i = 0; i < 6; i++) w.paso(1 / 60); const s = C.Proto.texto(w, h, 2 + k, 123500 + k * 100, k % 20 === 0); sizes.push(s.length); }
  console.log('  snapshots incrementales: media ' + Math.round(sizes.reduce((a, b) => a + b) / sizes.length) + ' B, max ' + Math.max(...sizes) + ' B');
  t('snapshots bajo el limite de 16 KB', Math.max(...sizes) + 64 < 16384);
  t('descarta snapshots viejos', rep.aplicar(C.deb64(C.Proto.texto(w, h, 1, 1, false)), 0) === false);
  // peor caso: mundo zoom maximo con muchas celdas
  h.vw = 5000; h.vh = 5000; const peor = C.Proto.texto(w, h, 99, 5, true).length; t('peor caso < 16 KB', peor + 64 < 16384, peor); console.log('  peor caso: ' + peor + ' B');
  // eventos de comida
  const rep2 = new C.Replica({ tam: w.tam, modo: w.modo, semilla: w.semilla, yo: h.id, nFood: w.nFood });
  rep2.aplicar(C.deb64(C.Proto.texto(w, h, 5, 1000, true)), 0);
  let s = 0; while (!rep2.fvivo[s]) s++; w.comerComida(s);
  rep2.aplicar(C.deb64(C.Proto.texto(w, h, 6, 1050, false)), 0);
  t('evento de comida comida', rep2.fvivo[s] === 0);
  // interpolacion
  rep2.prepararRender(0.016, 1100); t('interpolacion finita', rep2.cells.every(e => e.rx === e.rx && e.rr === e.rr));
  // JSON de info
  const info = JSON.stringify({ t: 1, pl: w.jugs.filter(Boolean).map(j => [j.id, Math.round(j.cx / 10), Math.round(j.cy / 10), Math.round(j.masa), 1, j.cel.length, 0]) }); t('info < 2 KB', info.length < 2000, info.length);
}
console.log(mal ? `\n${mal} FALLAS, ${ok} correctas` : `\nTodas las pruebas pasaron (${ok})`);
process.exit(mal ? 1 : 0);
